const express = require('express');
const router = express.Router();
const { protect, adminOnly, facultyOrAdmin } = require('../middleware/auth');
const User = require('../models/User');
const {
  Course, Subject, Classroom, Timetable,
  Attendance, FaceScanLog, WifiSession,
  Result, Fee, Announcement, Department, Section
} = require('../models/index');

// ── TIMETABLE ALGORITHM V2 (Section-Aware) ───────────────────────────────────

const generateSlots = (start, end, tea, lunch) => {
  let current = new Date(`1970-01-01T${start}:00`);
  const limit = new Date(`1970-01-01T${end}:00`);
  const teaS = new Date(`1970-01-01T${tea.start}:00`);
  const teaE = new Date(`1970-01-01T${tea.end}:00`);
  const lunchS = new Date(`1970-01-01T${lunch.start}:00`);
  const lunchE = new Date(`1970-01-01T${lunch.end}:00`);
  
  let slots = [];
  while (current < limit) {
    if (current >= teaS && current < teaE) { current = new Date(teaE); continue; }
    if (current >= lunchS && current < lunchE) { current = new Date(lunchE); continue; }
    
    let str = current.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
    slots.push(str);
    current = new Date(current.getTime() + 60*60*1000);
  }
  return slots;
};

// Global Lock Maps to prevent cross-section conflicts
let facultyLock = {}, roomLock = {}, sectionLock = {};
const dailySpread = {}; // section_sub_day -> count

function resetLocks() {
  facultyLock = {}; roomLock = {}; sectionLock = {};
}

function findAvailableRoom(day_time, studentCount, type, classrooms) {
  // Filter rooms that fit and are free
  const pool = classrooms.filter(r => {
    const isFree = !roomLock[r._id]?.[day_time];
    const fitsCap = r.capacity >= studentCount;
    const matchesType = type === 'lab' ? r.type === 'lab' : (r.type === 'lecture' || r.type === 'seminar');
    return isFree && fitsCap && matchesType;
  });

  if (pool.length === 0) return null;

  // BEST-FIT: Pick the room with smallest capacity that still fits
  return pool.sort((a, b) => a.capacity - b.capacity)[0];
}

async function generateTimetableAlgo(options) {
  resetLocks();
  const { departmentId, semester, days, startTime, endTime, teaBreak, lunchBreak } = options;

  let sectionQuery = {};
  if (departmentId && departmentId !== 'All') sectionQuery.departmentId = departmentId;
  if (semester && semester !== 'All') sectionQuery.semester = semester;

  const sections = await Section.find(sectionQuery).populate('courseId');
  const classrooms = await Classroom.find();
  const timeSlots = generateSlots(startTime, endTime, teaBreak, lunchBreak);
  
  const allSlots = [];
  const diagnostic = { unplaced: [] };

  // 1. Sort sections by total weekly load (Hardest first)
  const sectionsData = [];
  for (const section of sections) {
    const subjects = await Subject.find({ courseId: section.courseId._id, semester: section.semester }).populate('facultyId');
    const totalHours = subjects.reduce((sum, s) => sum + (s.hoursPerWeek || 2), 0);
    sectionsData.push({ section, subjects, totalHours });
  }
  sectionsData.sort((a, b) => b.totalHours - a.totalHours);

  // 2. Main Scheduling Loop
  for (const entry of sectionsData) {
    const { section, subjects } = entry;
    const remaining = {};
    subjects.forEach(s => remaining[s._id] = s.hoursPerWeek || 2);

    let passes = 0;
    let allocatedAny = true;

    while (allocatedAny && passes < 15) { // Multiple passes to fill all hours
      allocatedAny = false;
      passes++;

      for (const day of days) {
        for (const time of timeSlots) {
          const key = `${day}_${time}`;
          if (sectionLock[section._id]?.[key]) continue; // Already has a class

          // Shuffle subjects for fairness in each slot
          const shuffledSubs = [...subjects].sort(() => Math.random() - 0.5);

          for (const sub of shuffledSubs) {
            if (remaining[sub._id] <= 0) continue;
            
            const facultyId = sub.facultyId?._id || sub.facultyId;
            if (!facultyId) continue;

            // CHECK: Faculty Busy?
            if (facultyLock[facultyId]?.[key]) continue;

            // CHECK: Daily Spread (Heuristic: Max 2 hours of same subject per day)
            const spreadKey = `${section._id}_${sub._id}_${day}`;
            if ((dailySpread[spreadKey] || 0) >= 2) continue;

            // CHECK: Room Available? (Best Fit)
            const room = findAvailableRoom(key, section.studentCount, sub.type, classrooms);
            if (!room) continue;

            // ALL CHECKS PASSED: PLACE SLOT
            allSlots.push({
              subjectId: sub._id,
              facultyId: facultyId,
              roomId: room._id,
              sectionId: section._id,
              courseId: section.courseId._id,
              departmentId: section.departmentId || sub.departmentId,
              day,
              time,
              duration: 1
            });

            // Update Locks
            facultyLock[facultyId] = facultyLock[facultyId] || {};
            facultyLock[facultyId][key] = true;
            
            roomLock[room._id] = roomLock[room._id] || {};
            roomLock[room._id][key] = true;

            sectionLock[section._id] = sectionLock[section._id] || {};
            sectionLock[section._id][key] = true;

            dailySpread[spreadKey] = (dailySpread[spreadKey] || 0) + 1;
            remaining[sub._id]--;
            allocatedAny = true;
            break; // Move to next time slot for this section to ensure day spread
          }
        }
      }
    }

    // Capture unplaced hours for this section
    for (const sub of subjects) {
      if (remaining[sub._id] > 0) {
        diagnostic.unplaced.push({ section: section.name, subject: sub.name, hours: remaining[sub._id] });
      }
    }
  }

  return { slots: allSlots, diagnostic };
}

// ── USERS ────────────────────────────────────────────────────────────────────
router.get('/users', protect, adminOnly, async (req, res) => {
  const users = await User.find().select('-password')
    .populate('courseId', 'name code')
    .populate('sectionId', 'name');
  res.json(users);
});

router.post('/users', protect, adminOnly, async (req, res) => {
  try {
    const { email, password, role, courseId, ...rest } = req.body;
    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ message: 'Email already registered' });
    
    const userData = { ...rest, email, password, role };
    ['courseId', 'sectionId', 'departmentId'].forEach(field => {
      if (req.body[field] && req.body[field].trim() !== '') {
        userData[field] = req.body[field];
      }
    });

    const user = await User.create(userData);
    const userObj = user.toObject();
    delete userObj.password;
    res.status(201).json(userObj);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.get('/users/:id', protect, async (req, res) => {
  const user = await User.findById(req.params.id).select('-password');
  if (!user) return res.status(404).json({ message: 'User not found' });
  res.json(user);
});

router.put('/users/:id', protect, async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user._id.toString() !== req.params.id) {
      return res.status(403).json({ message: 'Forbidden: Cannot edit another user' });
    }
    const updates = { ...req.body };
    delete updates.password;
    
    if (req.user.role !== 'admin') {
      delete updates.role;
      const targetUser = await User.findById(req.params.id);
      if (targetUser && targetUser.faceRegistered) {
        delete updates.faceRegistered;
        delete updates.faceDescriptor;
      }
    }

    // Sanitize ObjectId fields
    ['courseId', 'sectionId', 'departmentId'].forEach(field => {
      if (updates[field] === '') delete updates[field];
    });
    const user = await User.findByIdAndUpdate(req.params.id, updates, { new: true }).select('-password');
    res.json(user);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.delete('/users/:id', protect, adminOnly, async (req, res) => {
  await User.findByIdAndDelete(req.params.id);
  res.json({ message: 'User deleted' });
});

// ── DEPARTMENTS ──────────────────────────────────────────────────────────────
router.get('/departments', protect, async (req, res) => {
  res.json(await Department.find());
});
router.post('/departments', protect, adminOnly, async (req, res) => {
  try { res.status(201).json(await Department.create(req.body)); }
  catch (err) { res.status(400).json({ message: err.message }); }
});

// ── SECTIONS ─────────────────────────────────────────────────────────────────
router.get('/sections', protect, async (req, res) => {
  res.json(await Section.find().populate('courseId', 'name code').populate('departmentId', 'name'));
});
router.post('/sections', protect, adminOnly, async (req, res) => {
  try { res.status(201).json(await Section.create(req.body)); }
  catch (err) { res.status(400).json({ message: err.message }); }
});

// ── COURSES ───────────────────────────────────────────────────────────────────
router.get('/courses', protect, async (req, res) => {
  res.json(await Course.find().populate('departmentId', 'name'));
});
router.post('/courses', protect, adminOnly, async (req, res) => {
  try { res.status(201).json(await Course.create(req.body)); }
  catch (err) { res.status(400).json({ message: err.message }); }
});
router.put('/courses/:id', protect, adminOnly, async (req, res) => {
  const updates = { ...req.body };
  if (updates.departmentId === '') delete updates.departmentId;
  res.json(await Course.findByIdAndUpdate(req.params.id, updates, { new: true }));
});
router.delete('/courses/:id', protect, adminOnly, async (req, res) => {
  await Course.findByIdAndDelete(req.params.id);
  res.json({ message: 'Deleted' });
});

// ── SUBJECTS ──────────────────────────────────────────────────────────────────
router.get('/subjects', protect, async (req, res) => {
  res.json(await Subject.find().populate('courseId', 'name code').populate('facultyId', 'name avatar'));
});
router.post('/subjects', protect, adminOnly, async (req, res) => {
  try { 
    const data = { ...req.body };
    ['courseId', 'facultyId'].forEach(f => { if (data[f] === '') delete data[f]; });
    res.status(201).json(await Subject.create(data)); 
  }
  catch (err) { res.status(400).json({ message: err.message }); }
});
router.put('/subjects/:id', protect, adminOnly, async (req, res) => {
  const updates = { ...req.body };
  ['courseId', 'facultyId'].forEach(f => { if (updates[f] === '') delete updates[f]; });
  res.json(await Subject.findByIdAndUpdate(req.params.id, updates, { new: true }));
});
router.delete('/subjects/:id', protect, adminOnly, async (req, res) => {
  await Subject.findByIdAndDelete(req.params.id);
  res.json({ message: 'Deleted' });
});

// ── CLASSROOMS ────────────────────────────────────────────────────────────────
router.get('/classrooms', protect, async (req, res) => {
  res.json(await Classroom.find().populate('departmentId', 'name'));
});
router.post('/classrooms', protect, adminOnly, async (req, res) => {
  try { 
    const data = { ...req.body };
    if (data.departmentId === '') delete data.departmentId;
    res.status(201).json(await Classroom.create(data)); 
  }
  catch (err) { res.status(400).json({ message: err.message }); }
});
router.put('/classrooms/:id', protect, adminOnly, async (req, res) => {
  const updates = { ...req.body };
  if (updates.departmentId === '') delete updates.departmentId;
  res.json(await Classroom.findByIdAndUpdate(req.params.id, updates, { new: true }));
});
router.delete('/classrooms/:id', protect, adminOnly, async (req, res) => {
  await Classroom.findByIdAndDelete(req.params.id);
  res.json({ message: 'Deleted' });
});

// ── TIMETABLE ─────────────────────────────────────────────────────────────────
router.get('/timetable', protect, async (req, res) => {
  const tt = await Timetable.find()
    .populate('subjectId', 'name code')
    .populate('facultyId', 'name avatar')
    .populate('roomId', 'name building')
    .populate('sectionId', 'name');
  res.json(tt);
});

router.post('/timetable/generate', protect, adminOnly, async (req, res) => {
  try {
    const options = {
      days: req.body.days || ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'],
      startTime: req.body.startTime || '09:00',
      endTime: req.body.endTime || '15:00',
      teaBreak: req.body.teaBreak || { start: '11:00', end: '11:15' },
      lunchBreak: req.body.lunchBreak || { start: '13:15', end: '14:00' },
      departmentId: req.body.departmentId || 'All',
      semester: req.body.semester || 'All'
    };

    // Delete existing entries for subset or all
    let delQuery = {};
    if (options.departmentId && options.departmentId !== 'All') delQuery.departmentId = options.departmentId;
    if (options.semester && options.semester !== 'All') delQuery.semester = options.semester;
    await Timetable.deleteMany(delQuery);

    const { slots, diagnostic } = await generateTimetableAlgo(options);
    const inserted = await Timetable.insertMany(slots);
    
    res.json({ 
      message: `Generated ${inserted.length} slots`, 
      count: inserted.length,
      unplaced: diagnostic.unplaced
    });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.delete('/timetable', protect, adminOnly, async (req, res) => {
  await Timetable.deleteMany({});
  res.json({ message: 'Timetable cleared' });
});

// ── ATTENDANCE ────────────────────────────────────────────────────────────────
router.post('/attendance/session', protect, async (req, res) => {
  try {
    if (req.user.role === 'student') return res.status(403).json({ message: 'Forbidden' });
    
    const { subjectId } = req.body;
    if (!subjectId) return res.status(400).json({ message: 'Subject required' });
    
    const subject = await Subject.findById(subjectId).populate('courseId');
    if (!subject) return res.status(404).json({ message: 'Subject not found' });
    
    // Faculty ownership check
    if (req.user.role === 'faculty' && subject.facultyId?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Forbidden: You are not assigned to this subject' });
    }
    
    let students = [];
    if (subject.courseId) {
       // Target students in the same course, semester AND section assigned to the faculty's timetable entry for this session
       // For now, if no sectionId is provided in body, we take all students in that semester
       const { sectionId } = req.body; 
       const query = { role: 'student', courseId: subject.courseId._id, semester: subject.semester };
       if (sectionId && sectionId.trim() !== '') query.sectionId = sectionId;
       students = await User.find(query);
    } else {
       students = await User.find({ role: 'student', semester: subject.semester });
    }
    
    let updatedCount = 0;
    for (const student of students) {
        let att = await Attendance.findOne({ studentId: student._id, subjectId });
        if (att) {
           att.total += 1;
           await att.save();
        } else {
           await Attendance.create({ studentId: student._id, subjectId, present: 0, total: 1 });
        }
        updatedCount++;
    }
    
    res.json({ message: `Session logged! Incremented denominator for ${updatedCount} students.`, count: updatedCount });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/attendance', protect, async (req, res) => {
  const query = req.user.role === 'student' ? { studentId: req.user._id } : {};
  const att = await Attendance.find(query)
    .populate('studentId', 'name rollNo avatar')
    .populate('subjectId', 'name code');
  res.json(att);
});

router.post('/attendance', protect, async (req, res) => {
  try {
    const { studentId, subjectId } = req.body;
    let att = await Attendance.findOne({ studentId, subjectId });
    if (att) {
      att.present += 1; att.total += 1;
      await att.save();
    } else {
      att = await Attendance.create({ studentId, subjectId, present: 1, total: 1 });
    }
    res.json(att);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.delete('/attendance/:id', protect, adminOnly, async (req, res) => {
  await Attendance.findByIdAndDelete(req.params.id);
  res.json({ message: 'Deleted' });
});

// ── FACE SCAN LOGS ────────────────────────────────────────────────────────────
router.get('/facescanlogs', protect, async (req, res) => {
  const query = req.user.role === 'student' ? { studentId: req.user._id } : {};
  const logs = await FaceScanLog.find(query)
    .populate('studentId', 'name rollNo avatar')
    .populate('subjectId', 'name code');
  res.json(logs);
});

const euclideanDistance = (desc1, desc2) => {
  if (!desc1 || !desc2 || desc1.length !== desc2.length) return Infinity;
  let sum = 0;
  for (let i = 0; i < desc1.length; i++) {
    sum += Math.pow(desc1[i] - desc2[i], 2);
  }
  return Math.sqrt(sum);
};

router.post('/facescanlogs', protect, async (req, res) => {
  try {
    const { studentId, subjectId, date, descriptor, ...rest } = req.body;
    
    const user = await User.findById(studentId);
    if (!user || !user.faceRegistered || !user.faceDescriptor) {
      return res.status(400).json({ message: 'User face not registered' });
    }
    if (!descriptor) return res.status(400).json({ message: 'Face descriptor required for verification' });
    
    const distance = euclideanDistance(user.faceDescriptor, descriptor);
    if (distance > 0.5) {
      return res.status(400).json({ message: 'Face matching failed', distance });
    }
    
    const existingLog = await FaceScanLog.findOne({ studentId, subjectId, date });
    if (existingLog) {
      return res.status(400).json({ message: 'Attendance already recorded for today' });
    }

    const logData = { ...rest, studentId, subjectId, date, status: 'verified', confidence: 1 - distance };
    const log = await FaceScanLog.create(logData);
    
    // Also update attendance: Only increment PRESENT since total is logged by faculty separately
    let att = await Attendance.findOne({ studentId, subjectId });
    if (att) { att.present += 1; await att.save(); }
    else await Attendance.create({ studentId, subjectId, present: 1, total: 1 }); // Fallback if no session was logged
    
    res.status(201).json(log);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.delete('/facescanlogs/:id', protect, adminOnly, async (req, res) => {
  await FaceScanLog.findByIdAndDelete(req.params.id);
  res.json({ message: 'Deleted' });
});


// ── RESULTS ───────────────────────────────────────────────────────────────────
router.get('/results', protect, async (req, res) => {
  const query = req.user.role === 'student' ? { studentId: req.user._id } : {};
  const results = await Result.find(query)
    .populate('studentId', 'name rollNo')
    .populate('subjectId', 'name code');
  res.json(results);
});

router.post('/results', protect, facultyOrAdmin, async (req, res) => {
  try {
    const { studentId, subjectId, internal, external, semester } = req.body;
    if (internal < 0 || internal > 50) return res.status(400).json({ message: 'Internal marks must be 0-50' });
    if (external < 0 || external > 100) return res.status(400).json({ message: 'External marks must be 0-100' });
    const total = (internal || 0) + (external || 0);
    const pct = (total / 150) * 100;
    const grade = pct >= 90 ? 'A+' : pct >= 80 ? 'A' : pct >= 70 ? 'B+' : pct >= 60 ? 'B' : pct >= 50 ? 'C' : 'F';
    let result = await Result.findOne({ studentId, subjectId, semester });
    if (result) {
      result.internal = internal; result.external = external;
      result.total = total; result.grade = grade;
      await result.save();
    } else {
      result = await Result.create({ studentId, subjectId, internal, external, total, max: 150, grade, semester });
    }
    res.json(result);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.delete('/results/:id', protect, adminOnly, async (req, res) => {
  await Result.findByIdAndDelete(req.params.id);
  res.json({ message: 'Deleted' });
});

// ── FEES ──────────────────────────────────────────────────────────────────────
router.get('/fees', protect, async (req, res) => {
  const query = req.user.role === 'student' ? { studentId: req.user._id } : {};
  const fees = await Fee.find(query).populate('studentId', 'name rollNo');
  res.json(fees);
});

router.post('/fees', protect, adminOnly, async (req, res) => {
  try { res.status(201).json(await Fee.create(req.body)); }
  catch (err) { res.status(400).json({ message: err.message }); }
});

router.put('/fees/:id', protect, adminOnly, async (req, res) => {
  const fee = await Fee.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json(fee);
});

router.delete('/fees/:id', protect, adminOnly, async (req, res) => {
  await Fee.findByIdAndDelete(req.params.id);
  res.json({ message: 'Deleted' });
});

// ── ANNOUNCEMENTS ─────────────────────────────────────────────────────────────
router.get('/announcements', protect, async (req, res) => {
  const announcements = await Announcement.find()
    .populate('facultyId', 'name avatar')
    .sort('-createdAt');
  res.json(announcements);
});

router.post('/announcements', protect, facultyOrAdmin, async (req, res) => {
  try {
    const { title, message, sectionId } = req.body;
    const annData = { 
      title, 
      message, 
      facultyId: req.user._id, 
      date: new Date().toISOString().split('T')[0] 
    };
    if (sectionId && sectionId.trim() !== '') annData.sectionId = sectionId;
    
    const ann = await Announcement.create(annData);
    res.status(201).json(ann);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.put('/announcements/:id/read', protect, async (req, res) => {
  const ann = await Announcement.findById(req.params.id);
  if (!ann.readBy.includes(req.user._id)) {
    ann.readBy.push(req.user._id);
    await ann.save();
  }
  res.json(ann);
});

router.delete('/announcements/:id', protect, adminOnly, async (req, res) => {
  await Announcement.findByIdAndDelete(req.params.id);
  res.json({ message: 'Deleted' });
});

module.exports = router;

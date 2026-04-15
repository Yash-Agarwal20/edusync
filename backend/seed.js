require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const { Course, Subject, Classroom, Attendance, Result, Fee, Announcement, FaceScanLog, WifiSession } = require('./models/index');

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('🔌 Connected to MongoDB');

  // Clear all
  await Promise.all([
    User.deleteMany(), Course.deleteMany(), Subject.deleteMany(),
    Classroom.deleteMany(), Attendance.deleteMany(), Result.deleteMany(),
    Fee.deleteMany(), Announcement.deleteMany(), FaceScanLog.deleteMany(), WifiSession.deleteMany()
  ]);
  console.log('🗑  Cleared existing data');

  // Users
  const hash = async (p) => await bcrypt.hash(p, 10);
  const users = await User.insertMany([
    { name: 'Dr. Admin Singh',   email: 'admin@school.edu',   password: await hash('admin123'),   role: 'admin',   avatar: 'AS' },
    { name: 'Prof. Riya Sharma', email: 'riya@school.edu',    password: await hash('faculty123'), role: 'faculty', avatar: 'RS', department: 'CS' },
    { name: 'Prof. Arjun Mehta', email: 'arjun@school.edu',   password: await hash('faculty123'), role: 'faculty', avatar: 'AM', department: 'MATH' },
    { name: 'Prof. Priya Nair',  email: 'priya@school.edu',   password: await hash('faculty123'), role: 'faculty', avatar: 'PN', department: 'CS' },
    { name: 'Rahul Kumar',       email: 'rahul@school.edu',   password: await hash('student123'), role: 'student', avatar: 'RK', batch: 'CS-A', semester: 3, rollNo: 'CS21001', faceRegistered: true },
    { name: 'Ananya Patel',      email: 'ananya@school.edu',  password: await hash('student123'), role: 'student', avatar: 'AP', batch: 'CS-A', semester: 3, rollNo: 'CS21002', faceRegistered: true },
  ]);
  console.log(`👥 Created ${users.length} users`);

  const [admin, riya, arjun, priya, rahul, ananya] = users;

  // Courses
  const courses = await Course.insertMany([
    { name: 'B.Tech Computer Science', code: 'BTCS', duration: 4, batches: ['CS-A', 'CS-B'] },
    { name: 'B.Tech Mathematics',      code: 'BTMATH', duration: 4, batches: ['MATH-A'] },
  ]);
  console.log(`📚 Created ${courses.length} courses`);

  const [cs, math] = courses;
  await User.updateMany({ _id: { $in: [rahul._id, ananya._id] } }, { courseId: cs._id });

  // Subjects
  const subjects = await Subject.insertMany([
    { name: 'Data Structures',    code: 'CS301',   credits: 4, hoursPerWeek: 4, courseId: cs._id,   semester: 3, facultyId: riya._id },
    { name: 'Database Systems',   code: 'CS302',   credits: 3, hoursPerWeek: 3, courseId: cs._id,   semester: 3, facultyId: riya._id },
    { name: 'Discrete Mathematics', code: 'MATH301', credits: 4, hoursPerWeek: 4, courseId: cs._id, semester: 3, facultyId: arjun._id },
    { name: 'Linear Algebra',     code: 'MATH302', credits: 3, hoursPerWeek: 3, courseId: cs._id,   semester: 3, facultyId: arjun._id },
    { name: 'Operating Systems',  code: 'CS303',   credits: 4, hoursPerWeek: 4, courseId: cs._id,   semester: 3, facultyId: priya._id },
  ]);
  console.log(`📖 Created ${subjects.length} subjects`);

  const [ds, db, dm, la, os] = subjects;

  // Classrooms
  const classrooms = await Classroom.insertMany([
    { name: 'Room 101', capacity: 60, type: 'lecture', building: 'Block A' },
    { name: 'Room 102', capacity: 60, type: 'lecture', building: 'Block A' },
    { name: 'Lab 201',  capacity: 30, type: 'lab',     building: 'Block B' },
    { name: 'Room 203', capacity: 80, type: 'lecture', building: 'Block A' },
  ]);
  console.log(`🏫 Created ${classrooms.length} classrooms`);

  // Attendance
  await Attendance.insertMany([
    { studentId: rahul._id,  subjectId: ds._id, present: 18, total: 22 },
    { studentId: rahul._id,  subjectId: dm._id, present: 20, total: 22 },
    { studentId: ananya._id, subjectId: ds._id, present: 21, total: 22 },
  ]);

  // Results
  await Result.insertMany([
    { studentId: rahul._id,  subjectId: ds._id, internal: 42, external: 68, total: 110, max: 150, grade: 'B+', semester: 2 },
    { studentId: rahul._id,  subjectId: dm._id, internal: 38, external: 71, total: 109, max: 150, grade: 'B+', semester: 2 },
    { studentId: ananya._id, subjectId: ds._id, internal: 45, external: 72, total: 117, max: 150, grade: 'A',  semester: 2 },
  ]);

  // Fees
  await Fee.insertMany([
    { studentId: rahul._id,  semester: 3, amount: 45000, paid: 45000, dueDate: '2025-03-01', status: 'paid' },
    { studentId: rahul._id,  semester: 4, amount: 45000, paid: 0,     dueDate: '2025-08-01', status: 'unpaid' },
    { studentId: ananya._id, semester: 3, amount: 45000, paid: 22500, dueDate: '2025-03-01', status: 'partial' },
  ]);

  // Announcements
  await Announcement.insertMany([
    { facultyId: riya._id,  title: 'Assignment 1 Due', message: 'Submit Data Structures assignment by Friday.', batch: 'CS-A', date: '2025-03-10' },
    { facultyId: arjun._id, title: 'Quiz Next Week',   message: 'Discrete Maths quiz on Chapter 3 & 4.',       batch: 'CS-A', date: '2025-03-12' },
  ]);

  // Face Scan Logs
  await FaceScanLog.insertMany([
    { studentId: rahul._id,  subjectId: ds._id, date: '2025-03-14', time: '09:03', method: 'face', status: 'verified', confidence: 97.2 },
    { studentId: ananya._id, subjectId: ds._id, date: '2025-03-14', time: '09:05', method: 'face', status: 'verified', confidence: 96.8 },
  ]);

  // WiFi Sessions
  await WifiSession.insertMany([
    { studentId: rahul._id,  date: '2025-03-14', checkIn: '08:47', checkOut: '16:30', ip: '192.168.1.42', ssid: 'CollegeNet_Secure', onCampus: true },
    { studentId: ananya._id, date: '2025-03-14', checkIn: '08:52', checkOut: '15:45', ip: '192.168.1.67', ssid: 'CollegeNet_Secure', onCampus: true },
  ]);

  console.log('✅ Database seeded successfully!');
  console.log('\n📋 Demo Login Credentials:');
  console.log('  Admin:   admin@school.edu  / admin123');
  console.log('  Faculty: riya@school.edu   / faculty123');
  console.log('  Student: rahul@school.edu  / student123');
  await mongoose.disconnect();
}

seed().catch(err => { console.error(err); process.exit(1); });

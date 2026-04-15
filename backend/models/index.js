const mongoose = require('mongoose');

// ─── DEPARTMENT ──────────────────────────────────────────────────────────────
const departmentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  code: { type: String, required: true, unique: true },
}, { timestamps: true });

// ─── COURSE ───────────────────────────────────────────────────────────────────
const courseSchema = new mongoose.Schema({
  name: { type: String, required: true },
  code: { type: String, required: true, unique: true },
  departmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
  duration: { type: Number, default: 4 },
  sectionNames: [{ type: String }],
}, { timestamps: true });

// ─── SECTION ──────────────────────────────────────────────────────────────────
const sectionSchema = new mongoose.Schema({
  name: { type: String, required: true }, // e.g. "CA-A"
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  semester: { type: Number, required: true },
  departmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
  studentCount: { type: Number, default: 60 },
}, { timestamps: true });

// ─── SUBJECT ──────────────────────────────────────────────────────────────────
const subjectSchema = new mongoose.Schema({
  name: { type: String, required: true },
  code: { type: String, required: true, unique: true },
  credits: { type: Number, default: 3 },
  hoursPerWeek: { type: Number, default: 3 },
  type: { type: String, enum: ['theory', 'lab', 'tutorial'], default: 'theory' },
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
  semester: { type: Number, required: true },
  facultyId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

// ─── CLASSROOM ────────────────────────────────────────────────────────────────
const classroomSchema = new mongoose.Schema({
  name: { type: String, required: true },
  capacity: { type: Number, required: true },
  type: { type: String, enum: ['lecture', 'lab', 'seminar'], default: 'lecture' },
  building: { type: String },
  departmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' } // null = shared
}, { timestamps: true });

// ─── TIMETABLE SLOT ───────────────────────────────────────────────────────────
const timetableSchema = new mongoose.Schema({
  subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
  facultyId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  roomId: { type: mongoose.Schema.Types.ObjectId, ref: 'Classroom', required: true },
  sectionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Section', required: true },
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
  departmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
  day: { type: String, enum: ['Monday','Tuesday','Wednesday','Thursday','Friday', 'Saturday'], required: true },
  time: { type: String, required: true },
  duration: { type: Number, default: 1 },
  academicYear: { type: String, default: '2025-26' }
}, { timestamps: true });

// ─── ATTENDANCE ───────────────────────────────────────────────────────────────
const attendanceSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
  present: { type: Number, default: 0 },
  total: { type: Number, default: 0 },
}, { timestamps: true });

// ─── FACE SCAN LOG ────────────────────────────────────────────────────────────
const faceScanLogSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
  date: { type: String, required: true },
  time: { type: String },
  method: { type: String, default: 'face' },
  status: { type: String, enum: ['verified', 'failed'], default: 'verified' },
  confidence: { type: Number },
}, { timestamps: true });

// ─── RESULT ───────────────────────────────────────────────────────────────────
const resultSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
  internal: { type: Number, default: 0 },
  external: { type: Number, default: 0 },
  total: { type: Number, default: 0 },
  max: { type: Number, default: 150 },
  grade: { type: String },
  semester: { type: Number },
}, { timestamps: true });

// ─── FEE ──────────────────────────────────────────────────────────────────────
const feeSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  semester: { type: Number, required: true },
  amount: { type: Number, required: true },
  paid: { type: Number, default: 0 },
  dueDate: { type: String },
  status: { type: String, enum: ['paid', 'partial', 'unpaid'], default: 'unpaid' },
}, { timestamps: true });

// ─── ANNOUNCEMENT ─────────────────────────────────────────────────────────────
const announcementSchema = new mongoose.Schema({
  facultyId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  sectionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Section' },
  date: { type: String },
  readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
}, { timestamps: true });

// ─── WIFI SESSION ────────────────────────────────────────────────────────────
const wifiSessionSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: String, required: true },
  checkIn: { type: String },
  checkOut: { type: String },
  ip: { type: String },
  ssid: { type: String },
  onCampus: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = {
  Department: mongoose.model('Department', departmentSchema),
  Course: mongoose.model('Course', courseSchema),
  Section: mongoose.model('Section', sectionSchema),
  Subject: mongoose.model('Subject', subjectSchema),
  Classroom: mongoose.model('Classroom', classroomSchema),
  Timetable: mongoose.model('Timetable', timetableSchema),
  Attendance: mongoose.model('Attendance', attendanceSchema),
  FaceScanLog: mongoose.model('FaceScanLog', faceScanLogSchema),
  Result: mongoose.model('Result', resultSchema),
  Fee: mongoose.model('Fee', feeSchema),
  Announcement: mongoose.model('Announcement', announcementSchema),
  WifiSession: mongoose.model('WifiSession', wifiSessionSchema),
};

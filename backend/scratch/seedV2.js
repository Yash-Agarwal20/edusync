require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { Department, Course, Section, Subject, Classroom, Attendance, Result, Fee, Announcement, FaceScanLog, WifiSession } = require('../models/index');

async function seedV2() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('🔌 Connected to MongoDB');

  // Clear all
  await Promise.all([
    User.deleteMany(), Department.deleteMany(), Course.deleteMany(), 
    Section.deleteMany(), Subject.deleteMany(), Classroom.deleteMany(), 
    Attendance.deleteMany(), Result.deleteMany(), Fee.deleteMany(), 
    Announcement.deleteMany(), FaceScanLog.deleteMany(), WifiSession.deleteMany()
  ]);
  console.log('🗑  Cleared existing data');

  // 1. Departments
  const depts = await Department.insertMany([
    { name: 'Computer Applications', code: 'FOCA' },
    { name: 'Engineering & Technology', code: 'FOET' },
    { name: 'Management', code: 'FOM' }
  ]);
  const [foca, foet, fom] = depts;
  console.log('🏢 Departments created');

  // 2. Courses
  const courses = await Course.insertMany([
    { name: 'BCA (Hons)', code: 'BCA', departmentId: foca._id, duration: 3 },
    { name: 'MCA', code: 'MCA', departmentId: foca._id, duration: 2 },
  ]);
  const [bca, mca] = courses;
  console.log('📚 Courses created');

  // 3. Sections
  const sections = await Section.insertMany([
    { name: 'CA-A', courseId: bca._id, semester: 4, departmentId: foca._id, studentCount: 60 },
    { name: 'CA-B', courseId: bca._id, semester: 4, departmentId: foca._id, studentCount: 55 },
    { name: 'MCA-1', courseId: mca._id, semester: 2, departmentId: foca._id, studentCount: 40 },
  ]);
  const [caa, cab, mca1] = sections;
  console.log('👥 Sections created');

  // 4. Users (Faculty & Students)
  const hash = async (p) => await bcrypt.hash(p, 10);
  const users = await User.insertMany([
    { name: 'Dr. Admin', email: 'admin@school.edu', password: await hash('admin123'), role: 'admin' },
    { name: 'Atul Misra', email: 'atul@school.edu', password: await hash('faculty123'), role: 'faculty', department: 'FOCA', workingHoursPerWeek: 35 },
    { name: 'Deepali Rastogi', email: 'deepali@school.edu', password: await hash('faculty123'), role: 'faculty', department: 'FOCA', workingHoursPerWeek: 35 },
    { name: 'Deepak Sharma', email: 'deepak@school.edu', password: await hash('faculty123'), role: 'faculty', department: 'FOCA', workingHoursPerWeek: 35 },
    { name: 'Student A1', email: 'a1@school.edu', password: await hash('student123'), role: 'student', sectionId: caa._id, courseId: bca._id, semester: 4, rollNo: 'BCA22001' },
    { name: 'Student B1', email: 'b1@school.edu', password: await hash('student123'), role: 'student', sectionId: cab._id, courseId: bca._id, semester: 4, rollNo: 'BCA22101' },
  ]);
  const [admin, atul, deepali, deepak, stA1, stB1] = users;
  console.log('👤 Users created');

  // 5. Subjects
  const subjects = await Subject.insertMany([
    { name: 'OOPs with Java', code: 'BCA401', hoursPerWeek: 4, courseId: bca._id, semester: 4, facultyId: atul._id, type: 'theory' },
    { name: 'Operating Systems', code: 'BCA402', hoursPerWeek: 4, courseId: bca._id, semester: 4, facultyId: deepali._id, type: 'theory' },
    { name: 'DBMS', code: 'BCA403', hoursPerWeek: 4, courseId: bca._id, semester: 4, facultyId: deepak._id, type: 'theory' },
    { name: 'Java Lab', code: 'BCA401P', hoursPerWeek: 4, courseId: bca._id, semester: 4, facultyId: atul._id, type: 'lab' },
    { name: 'Software Engineering', code: 'BCA404', hoursPerWeek: 4, courseId: bca._id, semester: 4, facultyId: deepali._id, type: 'theory' },
  ]);
  console.log('📖 Subjects created');

  // 6. Classrooms
  const classrooms = await Classroom.insertMany([
    { name: 'FOCA-101', capacity: 65, type: 'lecture', building: 'FOCA Block', departmentId: foca._id },
    { name: 'FOCA-102', capacity: 70, type: 'lecture', building: 'FOCA Block', departmentId: foca._id },
    { name: 'FOCA-Lab1', capacity: 35, type: 'lab', building: 'FOCA Block', departmentId: foca._id },
    { name: 'Seminar Hall 1', capacity: 120, type: 'seminar', building: 'Main Block' },
  ]);
  console.log('🏫 Classrooms created');

  console.log('✅ Hierarchical Database seeded successfully!');
  await mongoose.disconnect();
}

seedV2().catch(err => { console.error(err); process.exit(1); });

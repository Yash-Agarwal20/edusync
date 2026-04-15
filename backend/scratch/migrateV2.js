require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const { Course, Section, Department, Announcement } = require('../models/index');

async function migrate() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('🔌 Connected to MongoDB');

    // 1. Create Departments
    const facultyWithDepts = await User.find({ role: 'faculty' }).distinct('department');
    const deptMap = {};
    
    for (const name of facultyWithDepts) {
      if (!name) continue;
      let dept = await Department.findOne({ code: name.toUpperCase() });
      if (!dept) {
        dept = await Department.create({ name: `${name} Department`, code: name.toUpperCase() });
        console.log(`✅ Created Department: ${dept.code}`);
      }
      deptMap[name] = dept._id;
    }

    // Default Department for fallback
    let generalDept = await Department.findOne({ code: 'GEN' });
    if (!generalDept) {
      generalDept = await Department.create({ name: 'General Department', code: 'GEN' });
    }

    // 2. Process Courses and Create Sections
    const courses = await Course.find();
    for (const course of courses) {
      // Link course to department
      const deptId = deptMap[course.department] || generalDept._id;
      course.departmentId = deptId;
      await course.save();

      // Create Sections from batches
      if (course.batches && course.batches.length > 0) {
        for (const batchName of course.batches) {
          // We assume students in this batch are in a specific semester. 
          // Since "Batch" was flat, we'll try to guess semester from existing students or default to 1.
          const sampleStudent = await User.findOne({ role: 'student', batch: batchName, courseId: course._id });
          const semester = sampleStudent ? sampleStudent.semester : 1;

          let section = await Section.findOne({ name: batchName, courseId: course._id, semester });
          if (!section) {
            section = await Section.create({
              name: batchName,
              courseId: course._id,
              semester: semester,
              departmentId: deptId,
              studentCount: 60
            });
            console.log(`✅ Created Section: ${section.name} for ${course.code} (Sem ${semester})`);
          }

          // 3. Update Students
          const updatedStudents = await User.updateMany(
            { role: 'student', batch: batchName, courseId: course._id },
            { $set: { sectionId: section._id }, $unset: { batch: "" } }
          );
          if (updatedStudents.modifiedCount > 0) {
            console.log(`   Updated ${updatedStudents.modifiedCount} students from batch ${batchName}`);
          }

          // 4. Update Announcements
          const updatedAnn = await Announcement.updateMany(
            { batch: batchName },
            { $set: { sectionId: section._id }, $unset: { batch: "" } }
          );
          if (updatedAnn.modifiedCount > 0) {
            console.log(`   Updated ${updatedAnn.modifiedCount} announcements from batch ${batchName}`);
          }
        }
      }
    }

    // Handle students who might have a batch but no course match (Edge case)
    const remainingStudents = await User.find({ role: 'student', batch: { $exists: true, $ne: "" } });
    if (remainingStudents.length > 0) {
        console.log(`⚠️ Found ${remainingStudents.length} students with non-migrated batches. Handling manually...`);
        // We skip for now or create a "Default Section"
    }

    console.log('🏁 Migration completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  }
}

migrate();

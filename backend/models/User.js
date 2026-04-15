const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true, minlength: 6 },
  role: { type: String, enum: ['admin', 'faculty', 'student'], required: true },
  avatar: { type: String },
  // Faculty fields
  department: { type: String },
  workingHoursPerWeek: { type: Number, default: 40 },
  // Student fields
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
  sectionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Section' },
  semester: { type: Number },
  rollNo: { type: String },
  faceRegistered: { type: Boolean, default: false },
  faceDescriptor: { type: [Number], default: [] },
}, { timestamps: true });

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  // Auto-generate avatar initials
  if (!this.avatar) {
    this.avatar = this.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  }
  next();
});

userSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);

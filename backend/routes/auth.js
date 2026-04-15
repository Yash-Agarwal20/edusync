const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const router = express.Router();
const rateLimit = require('express-rate-limit');

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 10 : 200,
  message: { message: 'Too many requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Only apply rate limit to login and signup specifically

const generateToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });

// POST /api/auth/login
router.post('/login', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    const userObj = user.toObject();
    delete userObj.password;
    res.json({ user: userObj, token: generateToken(user._id) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/auth/signup - Restricted to Admin creation only.
router.post('/signup', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    
    // Security: Only allow creating Admin accounts through the public signup route
    if (role !== 'admin') {
      return res.status(403).json({ message: 'Only Admin registration is allowed here.' });
    }

    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ message: 'Email already registered' });
    
    const user = await User.create({ name, email, password, role: 'admin' });
    const userObj = user.toObject();
    delete userObj.password;
    res.status(201).json({ user: userObj, token: generateToken(user._id) });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.get('/me', protect, async (req, res) => {
  const user = await User.findById(req.user._id).populate('courseId', 'name code');
  res.json(user);
});

/*
const { Course } = require('../models');

// ── GET PUBLIC COURSES (For Signup Form) - DISABLED ──────────────────────────
router.get('/public/courses', async (req, res) => {
  try {
    const courses = await Course.find().select('name code batches duration');
    res.json(courses);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch courses' });
  }
});
*/

module.exports = router;

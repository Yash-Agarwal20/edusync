require('dotenv').config();
const mongoose = require('mongoose');

const URI = process.env.MONGODB_URI;

mongoose.connect(URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));
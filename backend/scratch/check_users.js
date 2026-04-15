require('dotenv').config();
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    const User = require('../models/User');
    const users = await User.find({ email: { $in: ['y@inv', 'yash@inv'] } });
    console.log('Target Users:');
    users.forEach(u => {
      console.log(`Email: ${u.email}, Hash starts with: ${u.password.substring(0, 10)}... (Length: ${u.password.length})`);
    });
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });

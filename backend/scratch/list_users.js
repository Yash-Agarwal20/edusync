require('dotenv').config();
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    // Correct relative path since script is in scratch/
    const User = require('../models/User');
    const users = await User.find({}, 'email role name');
    console.log('Users in DB:');
    console.table(users.map(u => ({ name: u.name, email: u.email, role: u.role })));
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });

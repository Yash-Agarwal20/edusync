require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    const User = require('../models/User');
    
    const email = 'y@inv';
    const password = '123456';
    
    const user = await User.findOne({ email });
    if (!user) {
      console.log('❌ User not found in DB!');
      process.exit(1);
    }
    
    console.log(`✅ Found user: ${user.name} (${user.email})`);
    console.log(`   Password hash: ${user.password}`);
    
    const match = await bcrypt.compare(password, user.password);
    console.log(`   Password '${password}' matches: ${match}`);
    
    // Also test via model method
    const match2 = await user.matchPassword(password);
    console.log(`   matchPassword() result: ${match2}`);
    
    process.exit(0);
  })
  .catch(err => { console.error(err); process.exit(1); });

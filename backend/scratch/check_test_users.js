require('dotenv').config();
const mongoose = require('mongoose');

const testUri = process.env.MONGODB_URI.split('.net/')[0] + '.net/test';

mongoose.connect(testUri)
  .then(async () => {
    const users = await mongoose.connection.db.collection('users').find({ email: { $in: ['y@inv', 'yash@inv'] } }).toArray();
    console.log('Users in TEST DB:');
    users.forEach(u => {
      console.log(`Email: ${u.email}, Password length: ${u.password.length}, Content: ${u.password}`);
    });
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });

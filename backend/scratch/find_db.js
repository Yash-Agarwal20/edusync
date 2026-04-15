require('dotenv').config();
const mongoose = require('mongoose');

// Use the base URI without the DB name to list all DBs
const rawUri = process.env.MONGODB_URI.split('.net/')[0] + '.net/';

mongoose.connect(rawUri)
  .then(async () => {
    const admin = mongoose.connection.db.admin();
    const dbs = await admin.listDatabases();
    console.log('Available Databases:');
    for (const dbInfo of dbs.databases) {
       const db = mongoose.connection.client.db(dbInfo.name);
       const collections = await db.listCollections().toArray();
       console.log(`- ${dbInfo.name} (Collections: ${collections.map(c => c.name).join(', ')})`);
       if (collections.some(c => c.name === 'users')) {
          const users = await db.collection('users').find({ email: { $in: ['y@inv', 'yash@inv'] } }).toArray();
          if (users.length > 0) {
             console.log(`  Found target users in ${dbInfo.name}!`);
          }
       }
    }
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });

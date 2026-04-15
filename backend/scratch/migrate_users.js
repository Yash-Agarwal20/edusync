require('dotenv').config();
const mongoose = require('mongoose');

const baseUri = process.env.MONGODB_URI.split('.net/')[0] + '.net/';
const testUri = baseUri + 'test';
const targetUri = baseUri + 'edusync';

async function migrate() {
    console.log('Connecting to TEST DB...');
    const testConn = await mongoose.createConnection(testUri).asPromise();
    console.log('Connecting to EDUSYNC DB...');
    const targetConn = await mongoose.createConnection(targetUri).asPromise();

    const emails = ['y@inv', 'yash@inv'];
    const users = await testConn.db.collection('users').find({ email: { $in: emails } }).toArray();

    if (users.length === 0) {
        console.log('No users found in TEST DB to migrate.');
        process.exit(0);
    }

    console.log(`Found ${users.length} users in TEST. Migrating to EDUSYNC...`);
    
    for (const user of users) {
        const exists = await targetConn.db.collection('users').findOne({ email: user.email });
        if (exists) {
            console.log(`User ${user.email} already exists in EDUSYNC. Skipping...`);
        } else {
            // Remove _id to let it be regenerated or keep it? Keep it for consistency.
            await targetConn.db.collection('users').insertOne(user);
            console.log(`✅ Migrated ${user.email}`);
        }
    }

    await testConn.close();
    await targetConn.close();
    console.log('Done!');
    process.exit(0);
}

migrate().catch(err => {
    console.error(err);
    process.exit(1);
});

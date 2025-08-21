// One-off maintenance script to drop obsolete unique index { user: 1 } on the admins collection
// Run with: node scripts/dropObsoleteAdminUserIndex.js

import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables from backend/.env by default
dotenv.config();

async function run() {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI || process.env.DATABASE_URL;
  if (!uri) {
    console.error('MONGO_URI not set in environment.');
    process.exit(1);
  }
  console.log('Connecting to MongoDB...');
  await mongoose.connect(uri);

  const db = mongoose.connection.db;
  const collectionName = 'admins';

  try {
    const indexes = await db.collection(collectionName).indexes();
    const hasUserIndex = indexes.find((idx) => idx.name === 'user_1');

    if (!hasUserIndex) {
      console.log('No user_1 index found on admins collection. Nothing to drop.');
      process.exit(0);
    }

    console.log('Dropping obsolete index "user_1" on admins collection...');
    await db.collection(collectionName).dropIndex('user_1');
    console.log('✅ Dropped index user_1');
  } catch (err) {
    if (err.codeName === 'IndexNotFound') {
      console.log('Index user_1 not found; nothing to drop.');
    } else {
      console.error('Error while dropping index:', err);
      process.exit(1);
    }
  } finally {
    await mongoose.disconnect();
  }
}

run();

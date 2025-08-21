// Cleanup script to remove legacy `user` field from admins documents
// Run with: node scripts/cleanupAdminsUnsetUserField.js

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
    const result = await db.collection(collectionName).updateMany(
      { user: { $exists: true } },
      { $unset: { user: '' } }
    );
    console.log(`✅ Unset legacy user field in ${result.modifiedCount} admin document(s).`);
  } catch (err) {
    console.error('Error while unsetting user field:', err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

run();

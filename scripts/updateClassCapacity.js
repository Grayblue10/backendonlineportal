#!/usr/bin/env node
/*
  One-time migration: set class capacity/maxStudents to 60 where they are <= 30 or missing.
  - Reads MONGODB_URI from env. Attempts to load from common .env locations.
  - Uses existing db connector at backend/config/db.js
*/

import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import connectDB from '../config/db.js';
import Class from '../models/Class.model.js';

// Attempt to load .env from multiple locations
const possibleEnvPaths = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), 'backend/.env'),
  path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../.env'),
  path.resolve(path.dirname(new URL(import.meta.url).pathname), '../.env')
];

for (const p of possibleEnvPaths) {
  try {
    if (fs.existsSync(p)) {
      dotenv.config({ path: p });
      if (process.env.MONGODB_URI) break;
    }
  } catch {}
}

if (!process.env.MONGODB_URI) {
  console.error('❌ MONGODB_URI is not set. Please set it in .env or environment variables.');
  process.exit(1);
}

(async () => {
  try {
    console.log('🔧 Starting class capacity migration...');
    await connectDB();

    // Build filters
    const filterCapacity = { $or: [
      { capacity: { $exists: false } },
      { capacity: null },
      { capacity: { $lte: 30 } }
    ]};
    const filterMaxStudents = { $or: [
      { maxStudents: { $exists: false } },
      { maxStudents: null },
      { maxStudents: { $lte: 30 } }
    ]};

    const preCounts = await Promise.all([
      Class.countDocuments(filterCapacity),
      Class.countDocuments(filterMaxStudents),
    ]);
    console.log(`📊 Will update: capacity -> ${preCounts[0]} docs, maxStudents -> ${preCounts[1]} docs`);

    const res1 = await Class.updateMany(filterCapacity, { $set: { capacity: 60 } });
    const res2 = await Class.updateMany(filterMaxStudents, { $set: { maxStudents: 60 } });

    console.log('✅ Update results:');
    console.log(`   - capacity modified: ${res1.modifiedCount}`);
    console.log(`   - maxStudents modified: ${res2.modifiedCount}`);

    // Verify a sample
    const sample = await Class.findOne({}).select('name capacity maxStudents').lean();
    console.log('🔎 Sample class after update:', sample);

    await mongoose.connection.close();
    console.log('🏁 Migration complete. Connection closed.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err);
    try { await mongoose.connection.close(); } catch {}
    process.exit(1);
  }
})();

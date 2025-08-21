import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Student from '../models/Student.model.js';
import Teacher from '../models/Teacher.model.js';
import Admin from '../models/Admin.model.js';
import User from '../models/User.model.js';

// Load environment variables
dotenv.config();

const cleanupDuplicateUsers = async () => {
  try {
    console.log('🧹 Starting cleanup of duplicate users...');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('📦 Connected to MongoDB');

    // Find and remove ALL test entries (not just specific email)
    console.log('🔍 Looking for all test entries...');
    
    // Check and clean Student model
    const students = await Student.find({});
    console.log(`Found ${students.length} student entries`);
    if (students.length > 0) {
      await Student.deleteMany({});
      console.log('✅ Removed all student entries');
    }
    
    // Check and clean Teacher model
    const teachers = await Teacher.find({});
    console.log(`Found ${teachers.length} teacher entries`);
    if (teachers.length > 0) {
      await Teacher.deleteMany({});
      console.log('✅ Removed all teacher entries');
    }
    
    // Check and clean Admin model
    const admins = await Admin.find({});
    console.log(`Found ${admins.length} admin entries`);
    if (admins.length > 0) {
      await Admin.deleteMany({});
      console.log('✅ Removed all admin entries');
    }
    
    // Check and clean User model
    const users = await User.find({});
    console.log(`Found ${users.length} user entries`);
    if (users.length > 0) {
      await User.deleteMany({});
      console.log('✅ Removed all user entries');
    }
    
    console.log('🎉 Complete cleanup finished! Database is now clean for fresh testing.');
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
  } finally {
    await mongoose.disconnect();
    console.log('📦 Disconnected from MongoDB');
    process.exit(0);
  }
};

cleanupDuplicateUsers();

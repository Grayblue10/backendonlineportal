import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.model.js';
import Admin from '../models/Admin.model.js';
import Teacher from '../models/Teacher.model.js';
import Student from '../models/Student.model.js';

dotenv.config();

async function listUsers() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // List all users in User model
    console.log('\n=== Users in User Model ===');
    const users = await User.find({}).select('email role firstName lastName');
    console.log(users);

    // List all admins with their user data
    console.log('\n=== Admins with User Data ===');
    const admins = await Admin.find({}).populate('userData', 'email role firstName lastName');
    console.log(admins.map(a => ({
      adminId: a._id,
      user: a.userData,
      department: a.department,
      position: a.position
    })));

    // List all teachers
    console.log('\n=== Teachers ===');
    const teachers = await Teacher.find({}).select('email role firstName lastName');
    console.log(teachers);

    // List all students
    console.log('\n=== Students ===');
    const students = await Student.find({}).select('email role firstName lastName studentId');
    console.log(students);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\nDisconnected from MongoDB');
  }
}

listUsers();

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import Student from '../models/Student.model.js';
import Teacher from '../models/Teacher.model.js';
import Admin from '../models/Admin.model.js';

dotenv.config();

async function createTestUsers() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Create test student
    const studentExists = await Student.findOne({ email: 'cay@gmail.com' });
    if (!studentExists) {
      const hashedPassword = await bcrypt.hash('password123', 12);
      const student = new Student({
        email: 'cay@gmail.com',
        password: hashedPassword,
        firstName: 'Cay',
        lastName: 'Student',
        role: 'student',
        studentId: 'STU001',
        dateOfBirth: new Date('2000-01-01'),
        phoneNumber: '+1234567890',
        address: {
          street: '123 Main St',
          city: 'Test City',
          state: 'Test State',
          zipCode: '12345',
          country: 'Test Country'
        }
      });
      await student.save();
      console.log('Created test student: cay@gmail.com');
    } else {
      console.log('Test student already exists: cay@gmail.com');
    }

    // Create test teacher
    const teacherExists = await Teacher.findOne({ email: 'teacher@gmail.com' });
    if (!teacherExists) {
      const hashedPassword = await bcrypt.hash('password123', 12);
      const teacher = new Teacher({
        email: 'teacher@gmail.com',
        password: hashedPassword,
        firstName: 'Test',
        lastName: 'Teacher',
        role: 'teacher',
        employeeId: 'TCH001',
        department: 'Computer Science',
        phoneNumber: '+1234567891',
        address: {
          street: '456 Oak St',
          city: 'Test City',
          state: 'Test State',
          zipCode: '12345',
          country: 'Test Country'
        }
      });
      await teacher.save();
      console.log('Created test teacher: teacher@gmail.com');
    } else {
      console.log('Test teacher already exists: teacher@gmail.com');
    }

    // Create test admin
    const adminExists = await Admin.findOne({ email: 'admin@gmail.com' });
    if (!adminExists) {
      const hashedPassword = await bcrypt.hash('password123', 12);
      const admin = new Admin({
        email: 'admin@gmail.com',
        password: hashedPassword,
        firstName: 'Test',
        lastName: 'Admin',
        role: 'admin',
        employeeId: 'ADM001',
        department: 'Administration',
        position: 'System Administrator',
        phoneNumber: '+1234567892',
        address: {
          street: '789 Pine St',
          city: 'Test City',
          state: 'Test State',
          zipCode: '12345',
          country: 'Test Country'
        }
      });
      await admin.save();
      console.log('Created test admin: admin@gmail.com');
    } else {
      console.log('Test admin already exists: admin@gmail.com');
    }

    console.log('\nTest users created successfully!');
    console.log('Login credentials:');
    console.log('Student: cay@gmail.com / password123');
    console.log('Teacher: teacher@gmail.com / password123');
    console.log('Admin: admin@gmail.com / password123');

  } catch (error) {
    console.error('Error creating test users:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Disconnected from MongoDB');
  }
}

createTestUsers();

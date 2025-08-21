import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import Student from './models/Student.model.js';
import Teacher from './models/Teacher.model.js';
import Admin from './models/Admin.model.js';

dotenv.config();

async function createUsers() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Create test student
    const studentExists = await Student.findOne({ email: 'cay@gmail.com' });
    if (!studentExists) {
      const student = new Student({
        email: 'cay@gmail.com',
        password: 'password123',
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
      console.log('✅ Created student: cay@gmail.com');
    } else {
      console.log('✅ Student already exists: cay@gmail.com');
    }

    // Create test teacher
    const teacherExists = await Teacher.findOne({ email: 'teacher@gmail.com' });
    if (!teacherExists) {
      const teacher = new Teacher({
        email: 'teacher@gmail.com',
        password: 'password123',
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
      console.log('✅ Created teacher: teacher@gmail.com');
    } else {
      console.log('✅ Teacher already exists: teacher@gmail.com');
    }

    // Create test admin
    const adminExists = await Admin.findOne({ email: 'admin@gmail.com' });
    if (!adminExists) {
      const admin = new Admin({
        email: 'admin@gmail.com',
        password: 'password123',
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
      console.log('✅ Created admin: admin@gmail.com');
    } else {
      console.log('✅ Admin already exists: admin@gmail.com');
    }

    console.log('\n🎉 Test users setup complete!');
    console.log('Login credentials:');
    console.log('Student: cay@gmail.com / password123');
    console.log('Teacher: teacher@gmail.com / password123');
    console.log('Admin: admin@gmail.com / password123');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Disconnected from MongoDB');
  }
}

createUsers();

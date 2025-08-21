import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import Student from './models/Student.model.js';
import Teacher from './models/Teacher.model.js';
import Admin from './models/Admin.model.js';

dotenv.config();

async function testAuth() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Create test student if doesn't exist
    let student = await Student.findOne({ email: 'cay@gmail.com' });
    if (!student) {
      console.log('Creating test student...');
      const hashedPassword = await bcrypt.hash('password123', 12);
      student = new Student({
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
      console.log('✅ Created test student: cay@gmail.com');
    } else {
      console.log('✅ Test student already exists: cay@gmail.com');
    }

    // Test password verification
    const isValidPassword = await student.matchPassword('password123');
    console.log('✅ Password verification test:', isValidPassword ? 'PASSED' : 'FAILED');

    // List all users
    console.log('\n=== All Users in Database ===');
    const students = await Student.find({}).select('email firstName lastName role');
    const teachers = await Teacher.find({}).select('email firstName lastName role');
    const admins = await Admin.find({}).select('email firstName lastName role');
    
    console.log('Students:', students.length);
    students.forEach(s => console.log(`  - ${s.email} (${s.firstName} ${s.lastName})`));
    
    console.log('Teachers:', teachers.length);
    teachers.forEach(t => console.log(`  - ${t.email} (${t.firstName} ${t.lastName})`));
    
    console.log('Admins:', admins.length);
    admins.forEach(a => console.log(`  - ${a.email} (${a.firstName} ${a.lastName})`));

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Disconnected from MongoDB');
  }
}

testAuth();

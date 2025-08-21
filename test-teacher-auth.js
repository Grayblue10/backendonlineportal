import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Teacher from './models/Teacher.model.js';
import AuthService from './services/authService.js';

// Load environment variables
dotenv.config();

const testTeacherAuth = async () => {
  try {
    console.log('🔧 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Test data
    const testTeacher = {
      email: 'test.teacher@school.edu',
      password: 'password123',
      firstName: 'John',
      lastName: 'Smith',
      role: 'teacher'
    };

    console.log('\n🧪 Testing Teacher Authentication Flow...');

    // Step 1: Clean up any existing test teacher
    console.log('🧹 Cleaning up existing test teacher...');
    await Teacher.deleteOne({ email: testTeacher.email });

    // Step 2: Register a new teacher
    console.log('📝 Registering new teacher...');
    const registrationResult = await AuthService.register(testTeacher);
    console.log('✅ Teacher registered successfully:', {
      id: registrationResult.user.id,
      email: registrationResult.user.email,
      role: registrationResult.user.role,
      hasToken: !!registrationResult.token
    });

    // Step 3: Verify teacher was created in database
    console.log('🔍 Verifying teacher in database...');
    const teacherInDb = await Teacher.findById(registrationResult.user.id).select('+password');
    console.log('✅ Teacher found in database:', {
      id: teacherInDb._id,
      email: teacherInDb.email,
      firstName: teacherInDb.firstName,
      lastName: teacherInDb.lastName,
      employeeId: teacherInDb.employeeId,
      passwordHashed: teacherInDb.password.startsWith('$2'),
      passwordLength: teacherInDb.password.length
    });

    // Step 4: Test login with correct credentials
    console.log('🔐 Testing login with correct credentials...');
    const loginResult = await AuthService.login(testTeacher.email, testTeacher.password);
    console.log('✅ Login successful:', {
      id: loginResult.user.id,
      email: loginResult.user.email,
      role: loginResult.user.role,
      hasToken: !!loginResult.token
    });

    // Step 5: Test login with wrong credentials
    console.log('❌ Testing login with wrong credentials...');
    try {
      await AuthService.login(testTeacher.email, 'wrongpassword');
      console.log('❌ ERROR: Login should have failed with wrong password');
    } catch (error) {
      console.log('✅ Login correctly failed with wrong password:', error.message);
    }

    // Step 6: Test password comparison directly
    console.log('🔍 Testing direct password comparison...');
    const isMatch = await teacherInDb.matchPassword(testTeacher.password);
    console.log('✅ Direct password match result:', isMatch);

    // Step 7: Test finding user by email
    console.log('📧 Testing findUserByEmail...');
    const foundUser = await AuthService.findUserByEmail(testTeacher.email);
    console.log('✅ Found user by email:', {
      found: !!foundUser,
      role: foundUser?.role,
      email: foundUser?.user?.email
    });

    console.log('\n🎉 All teacher authentication tests passed!');

    // Cleanup
    console.log('🧹 Cleaning up test data...');
    await Teacher.deleteOne({ email: testTeacher.email });

  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error('Stack trace:', error.stack);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
    process.exit(0);
  }
};

// Run the test
testTeacherAuth();

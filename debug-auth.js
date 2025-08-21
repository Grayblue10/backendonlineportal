import dotenv from 'dotenv';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import Admin from './models/Admin.model.js';
import Teacher from './models/Teacher.model.js';
import Student from './models/Student.model.js';
import AuthService from './services/authService.js';

// Load environment variables
dotenv.config();

const debugAuth = async () => {
  try {
    console.log('🔧 [DEBUG] Starting authentication debugging...');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ [DEBUG] Connected to MongoDB');

    // Check if we have any users in the database
    const adminCount = await Admin.countDocuments();
    const teacherCount = await Teacher.countDocuments();
    const studentCount = await Student.countDocuments();
    
    console.log(`📊 [DEBUG] Database counts:`, {
      admins: adminCount,
      teachers: teacherCount,
      students: studentCount
    });

    // If no users exist, create test users
    if (adminCount === 0 && teacherCount === 0 && studentCount === 0) {
      console.log('🔧 [DEBUG] No users found, creating test users...');
      
      // Create test admin
      const testAdmin = new Admin({
        email: 'admin@test.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'Admin',
        roleType: 'super_admin'
      });
      await testAdmin.save();
      console.log('✅ [DEBUG] Created test admin');

      // Create test teacher
      const testTeacher = new Teacher({
        email: 'teacher@test.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'Teacher'
      });
      await testTeacher.save();
      console.log('✅ [DEBUG] Created test teacher');

      // Create test student
      const testStudent = new Student({
        email: 'student@test.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'Student'
      });
      await testStudent.save();
      console.log('✅ [DEBUG] Created test student');
    }

    // Test finding users by email
    console.log('\n🔍 [DEBUG] Testing user lookup...');
    
    const testEmails = ['admin@test.com', 'teacher@test.com', 'student@test.com'];
    
    for (const email of testEmails) {
      console.log(`\n🔍 [DEBUG] Looking up: ${email}`);
      
      // Test direct model queries
      const adminUser = await Admin.findOne({ email }).select('+password');
      const teacherUser = await Teacher.findOne({ email }).select('+password');
      const studentUser = await Student.findOne({ email }).select('+password');
      
      console.log(`   Admin model: ${adminUser ? 'Found' : 'Not found'}`);
      console.log(`   Teacher model: ${teacherUser ? 'Found' : 'Not found'}`);
      console.log(`   Student model: ${studentUser ? 'Found' : 'Not found'}`);
      
      // Test AuthService findUserByEmail
      const authResult = await AuthService.findUserByEmail(email);
      console.log(`   AuthService: ${authResult ? `Found in ${authResult.role}` : 'Not found'}`);
      
      if (authResult) {
        const { user, role } = authResult;
        console.log(`   User details:`, {
          id: user._id,
          email: user.email,
          hasPassword: !!user.password,
          passwordLength: user.password ? user.password.length : 0,
          isHashedPassword: user.password ? user.password.startsWith('$2') : false
        });
        
        // Test password comparison
        console.log(`\n🔐 [DEBUG] Testing password for ${email}...`);
        try {
          const isMatch = await bcrypt.compare('password123', user.password);
          console.log(`   Password match: ${isMatch}`);
          
          // Test AuthService login
          console.log(`\n🔐 [DEBUG] Testing AuthService.login for ${email}...`);
          try {
            const loginResult = await AuthService.login(email, 'password123');
            console.log(`   ✅ Login successful:`, {
              userId: loginResult.user.id,
              role: loginResult.user.role,
              hasToken: !!loginResult.token
            });
          } catch (loginError) {
            console.log(`   ❌ Login failed:`, loginError.message);
          }
        } catch (bcryptError) {
          console.log(`   ❌ Password comparison failed:`, bcryptError.message);
        }
      }
    }

    console.log('\n🔧 [DEBUG] Authentication debugging completed');
    
  } catch (error) {
    console.error('❌ [DEBUG] Error during debugging:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 [DEBUG] Disconnected from MongoDB');
    process.exit(0);
  }
};

debugAuth();

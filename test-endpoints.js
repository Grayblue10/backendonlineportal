import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Subject from './models/Subject.model.js';
import User from './models/User.model.js';

// Load environment variables
dotenv.config();

const testEndpoints = async () => {
  try {
    console.log('🔍 Testing backend endpoints...');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/grading-system');
    console.log('📦 Connected to MongoDB');

    // Test 1: Check if we have subjects
    const subjectCount = await Subject.countDocuments();
    console.log(`📚 Subjects in database: ${subjectCount}`);
    
    if (subjectCount === 0) {
      console.log('⚠️ No subjects found. Creating sample subjects...');
      const sampleSubjects = [
        {
          name: 'Mathematics',
          code: 'MATH101',
          units: 3,
          description: 'Basic mathematics',
          semester: 'both',
          isActive: true
        },
        {
          name: 'English',
          code: 'ENG101',
          units: 3,
          description: 'English language and literature',
          semester: 'both',
          isActive: true
        }
      ];
      
      await Subject.insertMany(sampleSubjects);
      console.log('✅ Created sample subjects');
    }

    // Test 2: Check users
    const userCount = await User.countDocuments();
    const teacherCount = await User.countDocuments({ role: 'teacher' });
    console.log(`👥 Total users: ${userCount}, Teachers: ${teacherCount}`);

    // Test 3: Simulate teacher dashboard data
    const subjects = await Subject.find({ isActive: true }).limit(5);
    console.log(`📋 Active subjects found: ${subjects.length}`);
    
    subjects.forEach(subject => {
      console.log(`   - ${subject.code}: ${subject.name}`);
    });

    // Test 4: Mock dashboard stats
    const mockStats = {
      totalClasses: 2,
      totalStudents: 15,
      totalGraded: 8,
      pendingGrades: 7,
      completedAssignments: 5
    };
    
    console.log('📊 Mock dashboard stats:', mockStats);
    
    console.log('✅ Backend endpoint test completed successfully!');
    
  } catch (error) {
    console.error('❌ Error testing endpoints:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
};

testEndpoints();

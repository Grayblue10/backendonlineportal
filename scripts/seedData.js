import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Subject from '../models/Subject.model.js';
import User from '../models/User.model.js';
import Class from '../models/Class.model.js';

// Load environment variables
dotenv.config();

const seedData = async () => {
  try {
    console.log('🌱 Starting database seeding...');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/grading-system');
    console.log('📦 Connected to MongoDB');

    // Clear existing data (optional - comment out if you want to keep existing data)
    // await Subject.deleteMany({});
    // await Class.deleteMany({});
    // console.log('🗑️ Cleared existing data');

    // Check if subjects already exist
    const existingSubjects = await Subject.countDocuments();
    if (existingSubjects > 0) {
      console.log(`📚 Found ${existingSubjects} existing subjects, skipping subject creation`);
    } else {
      // Create sample subjects
      const subjects = [
        {
          name: 'Mathematics',
          code: 'MATH101',
          units: 3,
          description: 'Basic mathematics covering algebra, geometry, and calculus',
          semester: 'both',
          department: 'Mathematics',
          isActive: true
        },
        {
          name: 'English Literature',
          code: 'ENG201',
          units: 3,
          description: 'Study of classic and modern English literature',
          semester: 'first',
          department: 'English',
          isActive: true
        },
        {
          name: 'Computer Science',
          code: 'CS301',
          units: 4,
          description: 'Introduction to programming and computer systems',
          semester: 'both',
          department: 'Computer Science',
          isActive: true
        },
        {
          name: 'Physics',
          code: 'PHY101',
          units: 3,
          description: 'Fundamental principles of physics',
          semester: 'first',
          department: 'Science',
          isActive: true
        },
        {
          name: 'Chemistry',
          code: 'CHEM101',
          units: 3,
          description: 'Basic chemistry principles and laboratory work',
          semester: 'second',
          department: 'Science',
          isActive: true
        },
        {
          name: 'History',
          code: 'HIST201',
          units: 2,
          description: 'World history and historical analysis',
          semester: 'both',
          department: 'Social Studies',
          isActive: true
        }
      ];

      const createdSubjects = await Subject.insertMany(subjects);
      console.log(`✅ Created ${createdSubjects.length} subjects`);
    }

    // Check if we have any teacher users
    const teacherUsers = await User.find({ role: 'teacher' });
    console.log(`👨‍🏫 Found ${teacherUsers.length} teacher users`);

    if (teacherUsers.length === 0) {
      console.log('⚠️ No teacher users found. Please create a teacher user first.');
      console.log('You can register as a teacher through the frontend or create one manually.');
    }

    console.log('🎉 Database seeding completed successfully!');
    
    // Display summary
    const totalSubjects = await Subject.countDocuments();
    const totalUsers = await User.countDocuments();
    const totalClasses = await Class.countDocuments();
    
    console.log('\n📊 Database Summary:');
    console.log(`   Subjects: ${totalSubjects}`);
    console.log(`   Users: ${totalUsers}`);
    console.log(`   Classes: ${totalClasses}`);
    
  } catch (error) {
    console.error('❌ Error seeding database:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
    process.exit(0);
  }
};

// Run the seeding script
seedData();

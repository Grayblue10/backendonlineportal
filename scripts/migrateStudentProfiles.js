import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Student from '../models/Student.model.js';
import User from '../models/User.model.js';

// Load environment variables
dotenv.config();

const migrateStudentProfiles = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('Connected to MongoDB');

    // Find all students without a linked user
    const students = await Student.find({ user: { $exists: false } });
    console.log(`Found ${students.length} students without user profiles`);

    let createdCount = 0;
    let updatedCount = 0;

    // Process each student
    for (const student of students) {
      try {
        // Check if user already exists by email
        let user = await User.findOne({ email: student.email });

        if (!user) {
          // Create new user if doesn't exist
          user = new User({
            email: student.email,
            firstName: student.firstName || '',
            lastName: student.lastName || '',
            role: 'student',
            isActive: true,
            lastLogin: new Date()
          });
          await user.save();
          createdCount++;
        }

        // Link student to user
        student.user = user._id;
        await student.save();
        updatedCount++;

        console.log(`Processed student: ${student.email} -> User: ${user._id}`);
      } catch (error) {
        console.error(`Error processing student ${student.email}:`, error.message);
      }
    }

    console.log('Migration completed successfully!');
    console.log(`Created ${createdCount} new user accounts`);
    console.log(`Updated ${updatedCount} student profiles`);

    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
};

// Run the migration
migrateStudentProfiles();

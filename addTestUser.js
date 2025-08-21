const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function addTestUser() {
  const client = new MongoClient(process.env.MONGODB_URI);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db();
    
    // Check if student exists
    const existingStudent = await db.collection('students').findOne({ email: 'cay@gmail.com' });
    
    if (!existingStudent) {
      // Hash password
      const hashedPassword = await bcrypt.hash('password123', 12);
      
      // Create student
      const student = {
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
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      await db.collection('students').insertOne(student);
      console.log('✅ Created test student: cay@gmail.com');
    } else {
      console.log('✅ Test student already exists');
    }
    
    // List all students
    const students = await db.collection('students').find({}).toArray();
    console.log(`Found ${students.length} students in database`);
    students.forEach(s => console.log(`- ${s.email} (${s.firstName} ${s.lastName})`));
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

addTestUser();

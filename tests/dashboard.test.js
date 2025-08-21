import request from 'supertest';
import app from '../app.js';
import { connectDB, disconnectDB } from '../config/db.js';
import User from '../models/User.model.js';
import Student from '../models/Student.model.js';
import Teacher from '../models/Teacher.model.js';
import Class from '../models/Class.model.js';
import Subject from '../models/Subject.model.js';
import Grade from '../models/Grade.model.js';
import Attendance from '../models/Attendance.model.js';
import Announcement from '../models/Announcement.model.js';

// Test data
let adminToken, teacherToken, studentToken;
let adminUser, teacherUser, studentUser;
let testSubject, testClass, testGrade, testAttendance, testAnnouncement;

describe('Dashboard API Endpoints', () => {
  beforeAll(async () => {
    await connectDB();
    
    // Create test data
    // 1. Create admin user
    adminUser = await User.create({
      firstName: 'Admin',
      lastName: 'User',
      email: 'admin@test.com',
      password: 'password123',
      role: 'admin'
    });
    
    // 2. Create teacher user
    teacherUser = await User.create({
      firstName: 'Teacher',
      lastName: 'User',
      email: 'teacher@test.com',
      password: 'password123',
      role: 'teacher'
    });
    
    const teacherProfile = await Teacher.create({
      user: teacherUser._id,
      employeeId: 'T12345',
      department: 'Mathematics'
    });
    
    // 3. Create student user
    studentUser = await User.create({
      firstName: 'Student',
      lastName: 'User',
      email: 'student@test.com',
      password: 'password123',
      role: 'student'
    });
    
    const studentProfile = await Student.create({
      user: studentUser._id,
      studentId: 'S12345',
      grade: '10',
      section: 'A',
      rollNumber: '1',
      academicYear: '2024-25'
    });
    
    // 4. Create test subject
    testSubject = await Subject.create({
      name: 'Mathematics',
      code: 'MATH101',
      description: 'Introduction to Mathematics',
      credits: 3,
      department: 'Mathematics'
    });
    
    // 5. Create test class
    testClass = await Class.create({
      name: 'Mathematics 101',
      subject: testSubject._id,
      teacher: teacherUser._id,
      students: [studentUser._id],
      schedule: 'Mon, Wed, Fri 10:00 AM - 11:00 AM',
      academicYear: '2024-25',
      isActive: true
    });
    
    // 6. Create test grade
    testGrade = await Grade.create({
      student: studentUser._id,
      subject: testSubject._id,
      class: testClass._id,
      grade: 85,
      maxGrade: 100,
      assignment: 'Midterm Exam',
      type: 'exam',
      gradedBy: teacherUser._id,
      comments: 'Good work!',
      date: new Date()
    });
    
    // 7. Create test attendance
    testAttendance = await Attendance.create({
      student: studentUser._id,
      class: testClass._id,
      date: new Date(),
      status: 'present',
      markedBy: teacherUser._id
    });
    
    // 8. Create test announcement
    testAnnouncement = await Announcement.create({
      title: 'Welcome to the new academic year!',
      content: 'We are excited to have you all back for another great year of learning.',
      target: 'all',
      createdBy: adminUser._id,
      startDate: new Date(),
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
    });
    
    // 9. Login users to get tokens
    const adminRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin@test.com',
        password: 'password123'
      });
    adminToken = adminRes.body.token;
    
    const teacherRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'teacher@test.com',
        password: 'password123'
      });
    teacherToken = teacherRes.body.token;
    
    const studentRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'student@test.com',
        password: 'password123'
      });
    studentToken = studentRes.body.token;
  });
  
  afterAll(async () => {
    // Clean up test data
    await User.deleteMany({});
    await Student.deleteMany({});
    await Teacher.deleteMany({});
    await Subject.deleteMany({});
    await Class.deleteMany({});
    await Grade.deleteMany({});
    await Attendance.deleteMany({});
    await Announcement.deleteMany({});
    
    await disconnectDB();
  });
  
  describe('Admin Dashboard', () => {
    it('should return admin dashboard data', async () => {
      const res = await request(app)
        .get('/api/admin/dashboard')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body.data).toHaveProperty('stats');
      expect(res.body.data.stats).toHaveProperty('users');
      expect(res.body.data.stats).toHaveProperty('academic');
      expect(res.body.data.stats).toHaveProperty('system');
      expect(res.body.data).toHaveProperty('recentActivity');
      expect(res.body.data).toHaveProperty('userActivity');
      expect(res.body.data).toHaveProperty('systemHealth');
    });
    
    it('should deny access to non-admin users', async () => {
      const res = await request(app)
        .get('/api/admin/dashboard')
        .set('Authorization', `Bearer ${studentToken}`);
      
      expect(res.statusCode).toEqual(403);
    });
  });
  
  describe('Teacher Dashboard', () => {
    it('should return teacher dashboard data', async () => {
      const res = await request(app)
        .get('/api/teachers/dashboard')
        .set('Authorization', `Bearer ${teacherToken}`);
      
      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body.data).toHaveProperty('classes');
      expect(res.body.data).toHaveProperty('recentAssignments');
      expect(res.body.data).toHaveProperty('recentGrades');
      expect(res.body.data).toHaveProperty('attendanceSummary');
      expect(res.body.data).toHaveProperty('announcements');
      expect(res.body.data).toHaveProperty('stats');
    });
    
    it('should deny access to non-teacher users', async () => {
      const res = await request(app)
        .get('/api/teachers/dashboard')
        .set('Authorization', `Bearer ${studentToken}`);
      
      expect(res.statusCode).toEqual(403);
    });
  });
  
  describe('Student Dashboard', () => {
    it('should return student dashboard data', async () => {
      const res = await request(app)
        .get('/api/students/dashboard')
        .set('Authorization', `Bearer ${studentToken}`);
      
      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body.data).toHaveProperty('profile');
      expect(res.body.data).toHaveProperty('recentGrades');
      expect(res.body.data).toHaveProperty('upcomingAssignments');
      expect(res.body.data).toHaveProperty('attendanceSummary');
      expect(res.body.data).toHaveProperty('announcements');
      expect(res.body.data).toHaveProperty('stats');
    });
    
    it('should deny access to non-student users', async () => {
      const res = await request(app)
        .get('/api/students/dashboard')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(res.statusCode).toEqual(403);
    });
  });
});

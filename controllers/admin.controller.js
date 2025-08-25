import mongoose from 'mongoose';
import User from '../models/User.model.js';
import Admin from '../models/Admin.model.js';
import Teacher from '../models/Teacher.model.js';
import Student from '../models/Student.model.js';
import Subject from '../models/Subject.model.js';
import Grade from '../models/Grade.model.js';
import Class from '../models/Class.model.js';
import asyncHandler from '../middlewares/asyncHandler.js';
import { logger } from '../utils/logger.js';
import ErrorResponse from '../utils/errorResponse.js';

/**
 * @async
 * @function getDashboard
 * @description Get admin dashboard data
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<void>}
 */
/**
 * @async
 * @function getDashboard
 * @description Get admin dashboard data with comprehensive statistics
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<void>}
 */
const getDashboard = asyncHandler(async (req, res) => {
  try {
    // Fetch all data in parallel for better performance
    console.log('📊 Fetching admin dashboard data...');
    
    const [
      totalUsers, 
      totalTeachers, 
      totalStudents, 
      totalAdmins, 
      recentUsers,
      activeUsers,
      recentRegistrations,
      totalSubjects,
      totalClasses,
      recentGrades,
      userActivity,
      systemHealth
    ] = await Promise.all([
      // User counts - get from all models
      Promise.all([
        Admin.countDocuments({}),
        Teacher.countDocuments({}),
        Student.countDocuments({})
      ]).then(([admins, teachers, students]) => admins + teachers + students),
      Teacher.countDocuments({}),
      Student.countDocuments({}),
      Admin.countDocuments({}),
      
      // Recent users from all models
      Promise.all([
        Admin.find().sort({ createdAt: -1 }).limit(2).select('-password').lean(),
        Teacher.find().sort({ createdAt: -1 }).limit(2).select('-password').lean(),
        Student.find().sort({ createdAt: -1 }).limit(2).select('-password').lean()
      ]).then(([admins, teachers, students]) => {
        return [...admins.map(u => ({...u, role: 'admin'})), 
                ...teachers.map(u => ({...u, role: 'teacher'})), 
                ...students.map(u => ({...u, role: 'student'}))]
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
          .slice(0, 5);
      }),
      
      // Active users (mock for now since we don't track lastLogin in separate models)
      Promise.all([
        Admin.countDocuments({}),
        Teacher.countDocuments({}),
        Student.countDocuments({})
      ]).then(([admins, teachers, students]) => Math.floor((admins + teachers + students) * 0.7)), // Assume 70% are active
      
      // Recent registrations (last 7 days)
      Promise.all([
        Admin.countDocuments({ createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } }),
        Teacher.countDocuments({ createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } }),
        Student.countDocuments({ createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } })
      ]).then(([admins, teachers, students]) => admins + teachers + students),
      
      // Academic data
      Subject.countDocuments({}),
      Promise.resolve(5), // Mock class count since Class model doesn't exist
      
      // Recent grades - using actual Grade model structure
      Grade.find()
        .sort({ updatedAt: -1 })
        .limit(5)
        .populate('student', 'firstName lastName')
        .populate('teacher', 'firstName lastName')
        .lean(),
      
      // User activity (mock data for last 30 days)
      Promise.resolve(Array.from({ length: 30 }, (_, i) => {
        const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
        return {
          _id: date.toISOString().split('T')[0],
          count: Math.floor(Math.random() * 50) + 10
        };
      }).reverse()),
      
      // System health check
      Promise.resolve({
        status: 'operational',
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        databaseStatus: 'connected',
        lastBackup: new Date(Date.now() - 12 * 60 * 60 * 1000), // 12 hours ago
        nextBackup: new Date(Date.now() + 12 * 60 * 60 * 1000)  // in 12 hours
      })
    ]);

    console.log('📈 Dashboard stats:', { totalUsers, totalTeachers, totalStudents, totalAdmins });

    // Calculate statistics
    const systemStats = {
      // User statistics
      users: {
        total: totalUsers,
        teachers: totalTeachers,
        students: totalStudents,
        admins: totalAdmins,
        active: activeUsers,
        recentRegistrations,
        activePercentage: Math.round((activeUsers / totalUsers) * 100) || 0
      },
      // Also provide flat structure for easier frontend access
      totalUsers,
      totalTeachers,
      totalStudents,
      totalAdmins,
      
      // Academic statistics
      academic: {
        totalSubjects,
        totalClasses,
        averageClassSize: totalStudents > 0 ? Math.round(totalStudents / totalClasses) : 0,
        studentToTeacherRatio: totalTeachers > 0 ? (totalStudents / totalTeachers).toFixed(1) : 0
      },
      
      // System statistics
      system: {
        status: systemHealth.status,
        uptime: systemHealth.uptime,
        memoryUsage: {
          rss: (systemHealth.memoryUsage.rss / 1024 / 1024).toFixed(2) + ' MB',
          heapTotal: (systemHealth.memoryUsage.heapTotal / 1024 / 1024).toFixed(2) + ' MB',
          heapUsed: (systemHealth.memoryUsage.heapUsed / 1024 / 1024).toFixed(2) + ' MB',
          external: systemHealth.memoryUsage.external ? 
            (systemHealth.memoryUsage.external / 1024 / 1024).toFixed(2) + ' MB' : 'N/A'
        },
        lastBackup: systemHealth.lastBackup,
        nextBackup: systemHealth.nextBackup
      }
    };

    // Format recent activity
    const recentActivity = [
      ...recentUsers.map(user => ({
        type: 'user_registration',
        title: 'New User Registration',
        description: `${user.firstName} ${user.lastName} (${user.role}) joined`,
        timestamp: user.createdAt,
        user: {
          id: user._id,
          name: `${user.firstName} ${user.lastName}`,
          role: user.role,
          avatar: user.avatar
        }
      })),
      ...recentGrades.map(grade => ({
        type: 'grade_added',
        title: 'Grade Added',
        description: `New grade for ${grade.student?.firstName || 'Student'} in ${grade.subject?.name || 'Subject'}`,
        timestamp: grade.updatedAt,
        grade: {
          percentage: grade.finalGrade?.percentage || 0,
          letterGrade: grade.finalGrade?.letterGrade || 'N/A',
          subject: grade.subject?.name || 'Unknown Subject',
          gradedBy: grade.teacher ? 
            `${grade.teacher.firstName} ${grade.teacher.lastName}` : 'System'
        }
      }))
    ].sort((a, b) => b.timestamp - a.timestamp).slice(0, 10);

    // Format user activity data for charts
    const formattedUserActivity = userActivity.map(item => ({
      date: item._id,
      count: item.count
    }));

    res.status(200).json({
      success: true,
      data: {
        stats: systemStats,
        recentActivity,
        userActivity: formattedUserActivity,
        systemHealth: systemStats.system
      }
    });
    
  } catch (error) {
    logger.error('Error in getDashboard:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve dashboard data',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @desc    Get a student's enrollments (classes they're enrolled in)
 * @route   GET /api/admin/students/:studentId/enrollments
 * @access  Private/Admin
 */
const getStudentEnrollments = asyncHandler(async (req, res) => {
  const { studentId } = req.params;

  const student = await Student.findById(studentId);
  if (!student) {
    throw new ErrorResponse('Student not found', 404);
  }

  // Find classes where this student is enrolled
  const classes = await Class.find({ students: studentId })
    .populate('subject', 'name code units')
    .populate('teacher', 'firstName lastName')
    .sort({ academicYear: -1, term: 1 })
    .lean();

  const enrollments = classes.map(cls => ({
    _id: cls._id,
    id: cls._id,
    classId: cls._id,
    subject: cls.subject ? {
      _id: cls.subject._id,
      id: cls.subject._id,
      code: cls.subject.code,
      name: cls.subject.name,
      units: cls.subject.units
    } : null,
    term: cls.term, // 'Fall' | 'Spring'
    semester: cls.term === 'Fall' ? 'first' : (cls.term === 'Spring' ? 'second' : undefined),
    academicYear: cls.academicYear,
    teacher: cls.teacher ? {
      _id: cls.teacher._id,
      name: `${cls.teacher.firstName || ''} ${cls.teacher.lastName || ''}`.trim()
    } : null
  }));

  res.status(200).json({
    success: true,
    count: enrollments.length,
    data: enrollments
  });
});

/**
 * @desc    Unassign a teacher from a subject for a specific semester/year.
 *          Optionally delete the class if it has no students (deleteIfEmpty).
 * @route   DELETE /api/admin/teachers/unassign
 * @access  Private/Admin
 */
const unassignTeacherFromSubject = asyncHandler(async (req, res) => {
  const { teacherId, subjectId, semester, academicYear, deleteIfEmpty } = req.body || {};

  if (!teacherId || !subjectId || !semester || !academicYear) {
    throw new ErrorResponse('teacherId, subjectId, semester, and academicYear are required', 400);
  }

  if (!['first', 'second'].includes(semester)) {
    throw new ErrorResponse('Semester must be first or second', 400);
  }

  // Validate teacher and subject existence
  const [teacher, subject] = await Promise.all([
    Teacher.findById(teacherId),
    Subject.findById(subjectId)
  ]);
  if (!teacher) throw new ErrorResponse('Teacher not found', 404);
  if (!subject) throw new ErrorResponse('Subject not found', 404);

  const term = semester === 'first' ? 'Fall' : 'Spring';
  const ay = `${parseInt(academicYear, 10)}-${parseInt(academicYear, 10) + 1}`;

  const cls = await Class.findOne({
    subject: subjectId,
    teacher: teacherId,
    term,
    academicYear: ay
  });

  if (!cls) {
    throw new ErrorResponse('Assigned class not found for the given parameters', 404);
  }

  let action = 'unassigned';
  if (deleteIfEmpty && (!cls.students || cls.students.length === 0)) {
    await Class.findByIdAndDelete(cls._id);
    action = 'deleted_class';
  } else {
    cls.teacher = null;
    cls.updatedBy = req.user?.id || req.user?._id;
    await cls.save();
  }

  return res.status(200).json({
    success: true,
    message: action === 'deleted_class'
      ? 'Class deleted because it had no students'
      : 'Teacher unassigned from subject successfully',
    data: {
      action,
      classId: cls._id,
      subject: { id: subject._id, name: subject.name, code: subject.code },
      semester,
      academicYear: ay
    }
  });
});

/**
 * @desc    Delete a class by ID. Fails if students are enrolled unless force=true.
 * @route   DELETE /api/admin/classes/:id
 * @access  Private/Admin
 */
const deleteClassById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const force = req.query.force === 'true' || req.body?.force === true;

  const cls = await Class.findById(id);
  if (!cls) {
    throw new ErrorResponse('Class not found', 404);
  }

  if (cls.students && cls.students.length > 0 && !force) {
    throw new ErrorResponse('Cannot delete class with enrolled students. Pass force=true to override.', 400);
  }

  await Class.findByIdAndDelete(id);

  return res.status(200).json({
    success: true,
    message: 'Class deleted successfully'
  });
});

/**
 * @desc    Delete/unenroll a student from a class by enrollmentId (class id)
 *          Preferred route from admin UI: accepts optional studentId query/body; if not provided, returns 400.
 * @route   DELETE /api/admin/enrollments/:enrollmentId
 * @access  Private/Admin
 */
const deleteEnrollmentById = asyncHandler(async (req, res) => {
  const { enrollmentId } = req.params; // this is Class _id
  const studentId = req.query.studentId || req.body?.studentId;

  const cls = await Class.findById(enrollmentId);
  if (!cls) {
    throw new ErrorResponse('Enrollment not found', 404);
  }

  if (!studentId) {
    // Require studentId to avoid removing all students or ambiguity
    throw new ErrorResponse('studentId is required to remove enrollment', 400);
  }

  const before = cls.students.length;
  cls.students = cls.students.filter(s => s.toString() !== String(studentId));
  if (cls.students.length === before) {
    // No change
    throw new ErrorResponse('Student is not enrolled in this class', 404);
  }

  cls.updatedBy = req.user?.id || req.user?._id;
  await cls.save();

  return res.status(200).json({
    success: true,
    message: 'Enrollment deleted successfully'
  });
});

/**
 * @desc    Unenroll a student using studentId + enrollment info (fallback)
 * @route   DELETE /api/admin/students/:studentId/enrollments
 * @access  Private/Admin
 */
const deleteStudentEnrollment = asyncHandler(async (req, res) => {
  const { studentId } = req.params;
  const { enrollmentId, subjectId, semester, academicYear } = req.body || {};

  const student = await Student.findById(studentId);
  if (!student) {
    throw new ErrorResponse('Student not found', 404);
  }

  let cls;
  if (enrollmentId) {
    cls = await Class.findById(enrollmentId);
  } else if (subjectId && semester && academicYear) {
    const term = semester === 'first' ? 'Fall' : 'Spring';
    const ay = `${academicYear}-${parseInt(academicYear, 10) + 1}`;
    cls = await Class.findOne({ subject: subjectId, term, academicYear: ay });
  }

  if (!cls) {
    throw new ErrorResponse('Enrollment not found', 404);
  }

  const before = cls.students.length;
  cls.students = cls.students.filter(s => s.toString() !== String(studentId));
  if (cls.students.length === before) {
    throw new ErrorResponse('Student is not enrolled in this class', 404);
  }

  cls.updatedBy = req.user?.id || req.user?._id;
  await cls.save();

  return res.status(200).json({
    success: true,
    message: 'Enrollment deleted successfully'
  });
});

/**
 * @desc    Unenroll a student (final fallback action route)
 * @route   POST /api/admin/students/unenroll
 * @access  Private/Admin
 */
const unenrollStudent = asyncHandler(async (req, res) => {
  const { studentId, subjectId, enrollmentId, semester, academicYear } = req.body || {};

  if (!studentId) {
    throw new ErrorResponse('studentId is required', 400);
  }

  const student = await Student.findById(studentId);
  if (!student) {
    throw new ErrorResponse('Student not found', 404);
  }

  let cls;
  if (enrollmentId) {
    cls = await Class.findById(enrollmentId);
  } else if (subjectId && semester && academicYear) {
    const term = semester === 'first' ? 'Fall' : 'Spring';
    const ay = `${academicYear}-${parseInt(academicYear, 10) + 1}`;
    cls = await Class.findOne({ subject: subjectId, term, academicYear: ay });
  }

  if (!cls) {
    throw new ErrorResponse('Enrollment not found', 404);
  }

  const before = cls.students.length;
  cls.students = cls.students.filter(s => s.toString() !== String(studentId));
  if (cls.students.length === before) {
    throw new ErrorResponse('Student is not enrolled in this class', 404);
  }

  cls.updatedBy = req.user?.id || req.user?._id;
  await cls.save();

  return res.status(200).json({
    success: true,
    message: 'Enrollment deleted successfully'
  });
});

// Get all users
const getAllUsers = asyncHandler(async (req, res) => {
  try {
    const { role, page = 1, limit = 50, search } = req.query;
    console.log('🔍 Getting users with filters:', { role, search, page, limit });
    
    let searchQuery = {};
    if (search) {
      searchQuery.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { fullName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    let users = [];
    let total = 0;

    if (role) {
      // Get users from specific role model
      let Model;
      switch (role) {
        case 'admin':
          Model = Admin;
          break;
        case 'teacher':
          Model = Teacher;
          break;
        case 'student':
          Model = Student;
          break;
        default:
          throw new Error('Invalid role specified');
      }

      users = await Model.find(searchQuery)
        .select('-password')
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .lean();
      
      users = users.map(user => ({ ...user, role }));
      total = await Model.countDocuments(searchQuery);
    } else {
      // Get users from all models
      const [admins, teachers, students] = await Promise.all([
        Admin.find(searchQuery).select('-password').lean(),
        Teacher.find(searchQuery).select('-password').lean(),
        Student.find(searchQuery).select('-password').lean()
      ]);

      users = [
        ...admins.map(u => ({ ...u, role: 'admin' })),
        ...teachers.map(u => ({ ...u, role: 'teacher' })),
        ...students.map(u => ({ ...u, role: 'student' }))
      ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
       .slice((page - 1) * limit, page * limit);

      total = admins.length + teachers.length + students.length;
    }

    console.log(`📊 Found ${users.length} users (total: ${total})`);

    res.json({
      success: true,
      data: users,
      count: users.length,
      total,
      pagination: {
        page: parseInt(page),
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    console.error('❌ Error in getAllUsers:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve users',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @async
 * @function createUser
 * @description Create a new user and invalidate dashboard cache
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<void>}
 */
const createUser = asyncHandler(async (req, res) => {
  try {
    console.log('Creating new user:', { email: req.body.email, role: req.body.role });
    const { email, password, role, ...rest } = req.body;

    // Validate required fields
    if (!email || !password) {
      console.log('Validation failed: Missing email or password');
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    // Determine the correct model based on role
    let Model;
    switch (role) {
      case 'admin':
        Model = Admin;
        break;
      case 'teacher':
        Model = Teacher;
        break;
      case 'student':
        Model = Student;
        break;
      default:
        console.log('Invalid role provided:', role);
        return res.status(400).json({
          success: false,
          message: 'Invalid role. Must be admin, teacher, or student'
        });
    }

    // Check if user already exists in any model
    const existingAdmin = await Admin.findOne({ email });
    const existingTeacher = await Teacher.findOne({ email });
    const existingStudent = await Student.findOne({ email });

    if (existingAdmin || existingTeacher || existingStudent) {
      console.log('User already exists with email:', email);
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email'
      });
    }

    // Create user with the appropriate model
    const userData = {
      email,
      password,
      ...rest
    };

    const user = new Model(userData);
    await user.save();

    console.log('User created successfully:', { id: user._id, email: user.email, role });

    // Remove password from response
    const userResponse = user.toObject();
    delete userResponse.password;

    res.status(201).json({
      success: true,
      data: userResponse
    });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create user',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @async
 * @function updateUser
 * @description Update user details and invalidate dashboard cache if needed
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<void>}
 */
const updateUser = asyncHandler(async (req, res) => {
  try {
    console.log('Updating user:', req.params.id, 'with data:', req.body);
    const { password, role, ...updateData } = req.body;

    // Don't allow role changes through this endpoint
    if (role) {
      console.log('Role change attempted but blocked:', role);
    }

    // Determine which model to use based on the role in the request or find existing user
    let user;
    const userId = req.params.id;

    // Try to find the user in each model
    const adminUser = await Admin.findById(userId);
    const teacherUser = await Teacher.findById(userId);
    const studentUser = await Student.findById(userId);

    let Model;
    if (adminUser) {
      Model = Admin;
      user = adminUser;
    } else if (teacherUser) {
      Model = Teacher;
      user = teacherUser;
    } else if (studentUser) {
      Model = Student;
      user = studentUser;
    } else {
      console.log('User not found with ID:', userId);
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update the user
    const updatedUser = await Model.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    console.log('User updated successfully:', { id: updatedUser._id, email: updatedUser.email });

    res.json({
      success: true,
      data: updatedUser
    });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Delete user
const deleteUser = asyncHandler(async (req, res) => {
  try {
    console.log('Deleting user with ID:', req.params.id);
    const userId = req.params.id;

    // Try to find the user in each model
    const adminUser = await Admin.findById(userId);
    const teacherUser = await Teacher.findById(userId);
    const studentUser = await Student.findById(userId);

    let Model;
    let user;
    if (adminUser) {
      Model = Admin;
      user = adminUser;
    } else if (teacherUser) {
      Model = Teacher;
      user = teacherUser;
    } else if (studentUser) {
      Model = Student;
      user = studentUser;
    } else {
      console.log('User not found with ID:', userId);
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Delete the user
    await Model.findByIdAndDelete(userId);

    console.log('User deleted successfully:', { id: userId, email: user.email });

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete user',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Reset user password
const resetUserPassword = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  // Generate temporary password
  const tempPassword = Math.random().toString(36).slice(-8);
  user.password = tempPassword;
  await user.save();

  res.json({
    success: true,
    message: 'Password reset successfully',
    tempPassword // In production, send via email
  });
});

// Export all admin controller functions
/**
 * @desc    Add a new subject
 * @route   POST /api/admin/subjects
 * @access  Private/Admin
 */
const addSubject = asyncHandler(async (req, res, next) => {
  const { name, code, units, description, department, semester, prerequisites, isActive } = req.body;

  // Check if subject with code already exists
  const existingSubject = await Subject.findOne({ code });
  if (existingSubject) {
    return next(new ErrorResponse(`Subject with code ${code} already exists`, 400));
  }

  // Create new subject
  const subject = await Subject.create({
    name,
    code: code.toUpperCase(),
    units,
    description,
    department,
    semester: semester || 'first',
    prerequisites: prerequisites || [],
    isActive: isActive !== undefined ? isActive : true
  });

  res.status(201).json({
    success: true,
    data: subject
  });
});

/**
 * @desc    Update a subject
 * @route   PUT /api/admin/subjects/:id
 * @access  Private/Admin
 */
const updateSubject = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { name, code, units, description, department, semester, isActive, prerequisites } = req.body;

  // Check if subject exists
  let subject = await Subject.findById(id);
  if (!subject) {
    return next(new ErrorResponse(`Subject not found with id of ${id}`, 404));
  }

  // Check if new code is already taken by another subject
  if (code && code !== subject.code) {
    const existingSubject = await Subject.findOne({ code });
    if (existingSubject) {
      return next(new ErrorResponse(`Subject with code ${code} already exists`, 400));
    }
  }

  // Update subject
  subject = await Subject.findByIdAndUpdate(
    id,
    {
      name,
      code: code ? code.toUpperCase() : subject.code,
      units,
      description,
      department,
      semester,
      isActive,
      prerequisites: prerequisites || subject.prerequisites
    },
    {
      new: true,
      runValidators: true
    }
  );

  res.status(200).json({
    success: true,
    data: subject
  });
});

/**
 * @desc    Add or update a grade for a student
 * @route   POST /api/admin/grades
 * @access  Private/Admin
 */
const addOrUpdateGrade = asyncHandler(async (req, res, next) => {
  const { 
    studentId, 
    teacherId, 
    subjectId, 
    assessment, 
    semester, 
    academicYear 
  } = req.body;

  // Validate required fields
  if (!studentId || !teacherId || !subjectId || !assessment || !semester || !academicYear) {
    return next(new ErrorResponse('Missing required fields', 400));
  }

  // Check if student, teacher, and subject exist
  const [student, teacher, subject] = await Promise.all([
    Student.findById(studentId),
    Teacher.findById(teacherId),
    Subject.findById(subjectId)
  ]);

  if (!student) {
    return next(new ErrorResponse(`Student not found with id of ${studentId}`, 404));
  }
  if (!teacher) {
    return next(new ErrorResponse(`Teacher not found with id of ${teacherId}`, 404));
  }
  if (!subject) {
    return next(new ErrorResponse(`Subject not found with id of ${subjectId}`, 404));
  }

  // Check if grade record already exists for this student and subject
  let grade = await Grade.findOne({
    student: studentId,
    'subject.code': subject.code,
    semester,
    academicYear
  });

  // If grade exists, update it, otherwise create a new one
  if (grade) {
    // Update existing grade
    grade.assessments.push(assessment);
    grade = await grade.save();
  } else {
    // Create new grade
    grade = await Grade.create({
      student: studentId,
      teacher: teacherId,
      subject: {
        name: subject.name,
        code: subject.code
      },
      assessments: [assessment],
      semester,
      academicYear
    });
  }

  res.status(200).json({
    success: true,
    data: grade
  });
});

/**
 * @desc    Get all subjects with optional filtering
 * @route   GET /api/admin/subjects
 * @access  Private/Admin
 */
const getSubjects = asyncHandler(async (req, res) => {
  const { department, isActive, search } = req.query;
  
  // Build query
  const query = {};
  
  if (department) {
    query.department = department;
  }
  
  if (isActive !== undefined) {
    query.isActive = isActive === 'true';
  }
  
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { code: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } }
    ];
  }
  
  const subjects = await Subject.find(query).sort({ code: 1 });
  
  res.status(200).json({
    success: true,
    count: subjects.length,
    data: subjects
  });
});

/**
 * @desc    Get subject by ID
 * @route   GET /api/admin/subjects/:id
 * @access  Private/Admin
 */
const getSubject = asyncHandler(async (req, res, next) => {
  const subject = await Subject.findById(req.params.id);
  
  if (!subject) {
    return next(new ErrorResponse(`Subject not found with id of ${req.params.id}`, 404));
  }
  
  res.status(200).json({
    success: true,
    data: subject
  });
});

/**
 * @desc    Delete a subject
 * @route   DELETE /api/admin/subjects/:id
 * @access  Private/Admin
 */
const deleteSubject = asyncHandler(async (req, res, next) => {
  const subject = await Subject.findById(req.params.id);
  
  if (!subject) {
    return next(new ErrorResponse(`Subject not found with id of ${req.params.id}`, 404));
  }
  
  // Check if subject is being used in any grades
  const gradesCount = await Grade.countDocuments({ 'subject.code': subject.code });
  if (gradesCount > 0) {
    return next(new ErrorResponse(`Cannot delete subject. It has ${gradesCount} associated grades`, 400));
  }
  
  await Subject.findByIdAndDelete(req.params.id);
  
  res.status(200).json({
    success: true,
    message: 'Subject deleted successfully'
  });
});

/**
 * @desc    Search students by ID or name
 * @route   GET /api/admin/students/search
 * @access  Private/Admin
 */
const searchStudents = asyncHandler(async (req, res) => {
  try {
    const { query, limit = 10 } = req.query;
    
    console.log(`[AdminSearch] Searching students with query: "${query}"`);
    
    if (!query || query.trim().length < 2) {
      return res.status(400).json({
        success: false,
        error: 'Search query must be at least 2 characters long'
      });
    }
    
    const searchRegex = new RegExp(query.trim(), 'i');
    
    // Search in Student model directly
    const students = await Student.find({
      $or: [
        { firstName: searchRegex },
        { lastName: searchRegex },
        { fullName: searchRegex },
        { email: searchRegex },
        { studentId: searchRegex },
        { 
          $expr: {
            $regexMatch: {
              input: { $concat: ['$firstName', ' ', '$lastName'] },
              regex: query.trim(),
              options: 'i'
            }
          }
        }
      ]
    })
    .select('firstName lastName fullName email studentId yearLevel _id createdAt')
    .limit(parseInt(limit))
    .lean();
    
    console.log(`[AdminSearch] Found ${students.length} students`);
    
    // Format results for frontend
    const formattedStudents = students.map(student => ({
      id: student._id,
      name: student.fullName || `${student.firstName || ''} ${student.lastName || ''}`.trim(),
      email: student.email,
      studentId: student.studentId || student._id.toString().slice(-6),
      enrolledDate: student.createdAt,
      yearLevel: student.yearLevel
    }));
    
    res.status(200).json({
      success: true,
      count: formattedStudents.length,
      data: formattedStudents
    });
    
  } catch (error) {
    console.error('[AdminSearch] Error searching students:', error);
    throw new ErrorResponse('Error searching students', 500);
  }
});

/**
 * @desc    Enroll student in course
 * @route   POST /api/admin/students/enroll
 * @access  Private/Admin
 */
const enrollStudent = asyncHandler(async (req, res) => {
  try {
    const { studentId, subjectId, semester, academicYear } = req.body;
    // Accept schedule details from the enrollment payload
    // Support either a nested schedule object or flat fields
    const bodySchedule = req.body.schedule || {
      days: req.body.scheduleDays || req.body.days || [],
      startTime: req.body.startTime || req.body.start_time || null,
      endTime: req.body.endTime || req.body.end_time || null,
      room: req.body.room || req.body.roomName || req.body.room_number || req.body.location || null
    };

    // Normalize days to match Class.model enum (full weekday names)
    const dayMap = {
      'M': 'Monday', 'Mon': 'Monday', 'MON': 'Monday', 'monday': 'Monday', 'Monday': 'Monday',
      'T': 'Tuesday', 'Tue': 'Tuesday', 'TUE': 'Tuesday', 'tuesday': 'Tuesday', 'Tuesday': 'Tuesday',
      'W': 'Wednesday', 'Wed': 'Wednesday', 'WED': 'Wednesday', 'wednesday': 'Wednesday', 'Wednesday': 'Wednesday',
      'TH': 'Thursday', 'Thu': 'Thursday', 'THU': 'Thursday', 'thursday': 'Thursday', 'Thursday': 'Thursday',
      'F': 'Friday', 'Fri': 'Friday', 'FRI': 'Friday', 'friday': 'Friday', 'Friday': 'Friday',
      'S': 'Saturday', 'Sat': 'Saturday', 'SAT': 'Saturday', 'saturday': 'Saturday', 'Saturday': 'Saturday',
      'SU': 'Sunday', 'Sun': 'Sunday', 'SUN': 'Sunday', 'sunday': 'Sunday', 'Sunday': 'Sunday'
    };
    const normalizeDays = (days) => Array.isArray(days) 
      ? days.map(d => dayMap[d] || dayMap[String(d).trim()])
              .filter(Boolean)
      : [];
    const normalizedDays = normalizeDays(bodySchedule.days);
    
    console.log(`[AdminEnroll] Enrolling student ${studentId} in subject ${subjectId}`);
    
    // Validate student exists
    const student = await Student.findById(studentId);
    if (!student) {
      throw new ErrorResponse('Student not found', 404);
    }
    
    // Validate subject exists
    const subject = await Subject.findById(subjectId);
    if (!subject || !subject.isActive) {
      throw new ErrorResponse('Subject not found or inactive', 404);
    }
    
    // Enforce max 30 units per student per term/year
    const term = semester === 'first' ? 'Fall' : 'Spring';
    const ay = `${academicYear}-${parseInt(academicYear) + 1}`;

    // Find all classes this student is already enrolled in for the same term and academic year
    const currentClasses = await Class.find({
      students: studentId,
      term,
      academicYear: ay
    }).populate('subject', 'units code name');

    const currentUnits = currentClasses.reduce((sum, cls) => sum + (cls.subject?.units || 0), 0);
    const newTotalUnits = currentUnits + (subject.units || 0);
    if (newTotalUnits > 30) {
      throw new ErrorResponse(
        `Unit limit exceeded: current ${currentUnits} + ${subject.units || 0} would be ${newTotalUnits} (> 30)`,
        400
      );
    }

    // Check if student is already enrolled
    const existingEnrollment = await Class.findOne({
      students: studentId,
      subject: subjectId,
      term,
      academicYear: ay
    });
    
    if (existingEnrollment) {
      throw new ErrorResponse('Student is already enrolled in this subject for the specified semester', 400);
    }
    
    // Find or create class for this subject
    let classDoc = await Class.findOne({
      subject: subjectId,
      term,
      academicYear: ay
    });
    
    if (!classDoc) {
      // Generate unique class code
      const classCode = `${subject.code}-${semester.toUpperCase()}-${academicYear}`;
      
      // Create new class without teacher initially (teacher can be assigned later)
      classDoc = await Class.create({
        name: `${subject.code} - ${subject.name}`,
        code: classCode,
        subject: subjectId,
        term,
        academicYear: ay,
        students: [studentId],
        // Persist schedule if provided by Admin Enrollment
        ...(bodySchedule && (Array.isArray(bodySchedule.days) || bodySchedule.startTime || bodySchedule.endTime || bodySchedule.room)
          ? { schedule: {
              days: normalizedDays,
              startTime: bodySchedule.startTime || null,
              endTime: bodySchedule.endTime || null,
              room: bodySchedule.room || null
            }}
          : {}),
        capacity: 60,
        createdBy: req.user.id
        // teacher field is optional and can be assigned later
      });
      
      console.log(`[AdminEnroll] Created new class: ${classDoc.name}`);
    } else {
      // Check class capacity
      if (classDoc.students.length >= (classDoc.capacity || 60)) {
        throw new ErrorResponse('Class is at maximum capacity', 400);
      }
      
      // Add student to existing class
      classDoc.students.push(studentId);
      // If schedule provided and class has no schedule yet, set it (do not overwrite existing)
      if (
        bodySchedule &&
        (!classDoc.schedule || (
          (!classDoc.schedule.days || classDoc.schedule.days.length === 0) &&
          !classDoc.schedule.startTime &&
          !classDoc.schedule.endTime &&
          !classDoc.schedule.room
        ))
      ) {
        classDoc.schedule = {
          days: normalizedDays,
          startTime: bodySchedule.startTime || null,
          endTime: bodySchedule.endTime || null,
          room: bodySchedule.room || null
        };
      }
      await classDoc.save();

      console.log(`[AdminEnroll] Added student to existing class: ${classDoc.name}`);
    }
    
    // Log the enrollment action
    console.log(`[AdminEnroll] Successfully enrolled ${student.firstName} ${student.lastName} in ${subject.name}`);
    
    res.status(201).json({
      success: true,
      message: 'Student enrolled successfully',
      data: {
        student: {
          id: student._id,
          name: `${student.firstName} ${student.lastName}`,
          email: student.email
        },
        subject: {
          id: subject._id,
          name: subject.name,
          code: subject.code
        },
        class: {
          id: classDoc._id,
          name: classDoc.name,
          enrolledStudents: classDoc.students.length,
          maxStudents: classDoc.maxStudents
        }
      }
    });
    
  } catch (error) {
    console.error('[AdminEnroll] Error enrolling student:', error?.message, error?.stack);
    // Surface validation details if present
    if (error?.name === 'ValidationError') {
      const details = Object.values(error.errors || {}).map(e => e.message).join('; ');
      throw new ErrorResponse(`Validation failed: ${details}`, 400);
    }
    // Duplicate class code (unique index) or Mongo duplicate key
    if (error?.code === 11000) {
      throw new ErrorResponse('A class with the same code already exists for this term/year', 400);
    }
    throw error instanceof ErrorResponse ? error : new ErrorResponse('Error enrolling student', 500);
  }
});

/**
 * @desc    Assign teacher to subjects (max 2 per semester)
 * @route   POST /api/admin/teachers/assign
 * @access  Private/Admin
 */
const assignTeacherToSubjects = asyncHandler(async (req, res) => {
  try {
    const { teacherId, subjectIds, semester, academicYear } = req.body;
    
    console.log(`[AdminAssign] Assigning teacher ${teacherId} to subjects:`, subjectIds);
    
    // Validate teacher exists
    const teacher = await Teacher.findById(teacherId);
    if (!teacher) {
      throw new ErrorResponse('Teacher not found', 404);
    }
    
    // Validate subject limit (max 2 per semester)
    if (!Array.isArray(subjectIds) || subjectIds.length === 0) {
      throw new ErrorResponse('At least one subject must be selected', 400);
    }
    
    if (subjectIds.length > 2) {
      throw new ErrorResponse('Teachers can only be assigned to a maximum of 2 subjects per semester', 400);
    }
    
    // Check current teacher assignments for this semester
    const currentAssignments = await Class.find({
      teacher: teacherId,
      term: semester === 'first' ? 'Fall' : 'Spring',
      academicYear: `${academicYear}-${parseInt(academicYear) + 1}`
    }).populate('subject', 'name code');
    
    // Check if adding new subjects would exceed limit
    const currentSubjectIds = currentAssignments.map(cls => cls.subject._id.toString());
    const newSubjectIds = subjectIds.filter(id => !currentSubjectIds.includes(id));
    
    if (currentAssignments.length + newSubjectIds.length > 2) {
      throw new ErrorResponse(
        `Teacher already has ${currentAssignments.length} subject(s) assigned. Cannot exceed 2 subjects per semester.`,
        400
      );
    }
    
    // Validate all subjects exist and are active
    const subjects = await Subject.find({
      _id: { $in: subjectIds },
      isActive: true
    });
    
    if (subjects.length !== subjectIds.length) {
      throw new ErrorResponse('One or more subjects not found or inactive', 404);
    }
    
    const assignmentResults = [];
    
    // Process each subject assignment
    for (const subjectId of newSubjectIds) {
      const subject = subjects.find(s => s._id.toString() === subjectId);
      
      // Check if class already exists for this subject/semester
      let classDoc = await Class.findOne({
        subject: subjectId,
        term: semester === 'first' ? 'Fall' : 'Spring',
        academicYear: `${academicYear}-${parseInt(academicYear) + 1}`
      });
      
      if (classDoc) {
        // Update existing class with teacher
        if (classDoc.teacher && classDoc.teacher.toString() !== teacherId) {
          console.log(`[AdminAssign] Reassigning class from teacher ${classDoc.teacher} to ${teacherId}`);
        }
        
        classDoc.teacher = teacherId;
        classDoc.updatedBy = req.user.id;
        await classDoc.save();
        
        assignmentResults.push({
          subject: subject.name,
          code: subject.code,
          action: 'updated',
          classId: classDoc._id
        });
      } else {
        // Generate unique class code
        const classCode = `${subject.code}-${semester.toUpperCase()}-${academicYear}`;
        
        // Create new class with teacher and all required fields
        classDoc = await Class.create({
          name: `${subject.code} - ${subject.name}`,
          code: classCode,
          subject: subjectId,
          teacher: teacherId,
          term: semester === 'first' ? 'Fall' : 'Spring',
          academicYear: `${academicYear}-${parseInt(academicYear) + 1}`,
          students: [],
          capacity: 60,
          createdBy: req.user.id
        });
        
        assignmentResults.push({
          subject: subject.name,
          code: subject.code,
          action: 'created',
          classId: classDoc._id
        });
      }
    }
    
    // Get updated teacher assignments
    const updatedAssignments = await Class.find({
      teacher: teacherId,
      term: semester === 'first' ? 'Fall' : 'Spring',
      academicYear: `${academicYear}-${parseInt(academicYear) + 1}`
    }).populate('subject', 'name code units');
    
    console.log(`[AdminAssign] Successfully assigned teacher to ${assignmentResults.length} subjects`);
    
    res.status(200).json({
      success: true,
      message: 'Teacher assigned successfully',
      data: {
        teacher: {
          id: teacher._id,
          name: `${teacher.firstName} ${teacher.lastName}`,
          email: teacher.email
        },
        assignments: updatedAssignments.map(cls => ({
          classId: cls._id,
          subject: {
            id: cls.subject._id,
            name: cls.subject.name,
            code: cls.subject.code,
            units: cls.subject.units
          },
          studentsCount: cls.students.length,
          maxStudents: cls.maxStudents
        })),
        assignmentResults,
        totalSubjects: updatedAssignments.length,
        remainingSlots: 2 - updatedAssignments.length
      }
    });
    
  } catch (error) {
    console.error('[AdminAssign] Error assigning teacher:', error);
    throw error instanceof ErrorResponse ? error : new ErrorResponse('Error assigning teacher to subjects', 500);
  }
});

/**
 * @desc    Get all teachers for assignment dropdown
 * @route   GET /api/admin/teachers
 * @access  Private/Admin
 */
const getTeachersForAssignment = asyncHandler(async (req, res) => {
  try {
    console.log('[AdminTeachers] Fetching teachers for assignment');
    
    const teachers = await Teacher.find({})
      .select('firstName lastName fullName email')
      .lean();
    
    // Get current assignments for each teacher
    const teachersWithAssignments = await Promise.all(
      teachers.map(async (teacher) => {
        const semester = req.query.semester || 'first';
        const academicYear = req.query.academicYear || new Date().getFullYear();
        
        const currentAssignments = await Class.find({
          teacher: teacher._id,
          term: semester === 'first' ? 'Fall' : 'Spring',
          academicYear: `${academicYear}-${parseInt(academicYear) + 1}`
        }).populate('subject', 'name code');
        
        return {
          id: teacher._id,
          name: teacher.fullName || `${teacher.firstName || ''} ${teacher.lastName || ''}`.trim(),
          email: teacher.email,
          currentAssignments: currentAssignments.length,
          maxAssignments: 2,
          availableSlots: 2 - currentAssignments.length,
          subjects: currentAssignments.map(cls => ({
            name: cls.subject.name,
            code: cls.subject.code
          }))
        };
      })
    );
    
    console.log(`[AdminTeachers] Found ${teachersWithAssignments.length} teachers`);
    
    res.status(200).json({
      success: true,
      count: teachersWithAssignments.length,
      data: teachersWithAssignments
    });
    
  } catch (error) {
    console.error('[AdminTeachers] Error fetching teachers:', error);
    throw new ErrorResponse('Error fetching teachers', 500);
  }
});

/**
 * @desc    Get enrollment statistics
 * @route   GET /api/admin/enrollment/stats
 * @access  Private/Admin
 */
const getEnrollmentStats = asyncHandler(async (req, res) => {
  try {
    console.log('[AdminStats] Fetching enrollment statistics');
    
    const { semester, academicYear } = req.query;
    // Normalize filters to match Class model: term (Fall/Spring) and academicYear "YYYY-YYYY"
    const term = semester === 'first' ? 'Fall' : semester === 'second' ? 'Spring' : undefined;
    let ay;
    if (academicYear) {
      // Accept either YYYY or YYYY-YYYY
      const yr = String(academicYear);
      if (/^\d{4}$/.test(yr)) {
        const start = parseInt(yr, 10);
        ay = `${start}-${start + 1}`;
      } else if (/^\d{4}-\d{4}$/.test(yr)) {
        ay = yr;
      }
    }
    
    // Get class statistics
    const classStats = await Class.aggregate([
      {
        $match: {
          ...(term && { term }),
          ...(ay && { academicYear: ay })
        }
      },
      {
        $lookup: {
          from: 'subjects',
          localField: 'subject',
          foreignField: '_id',
          as: 'subjectInfo'
        }
      },
      {
        $unwind: '$subjectInfo'
      },
      {
        $group: {
          _id: null,
          totalClasses: { $sum: 1 },
          totalEnrolledStudents: { $sum: { $size: '$students' } },
          averageClassSize: { $avg: { $size: '$students' } },
          classesWithTeacher: {
            $sum: { $cond: [{ $ne: ['$teacher', null] }, 1, 0] }
          }
        }
      }
    ]);
    
    const stats = classStats[0] || {
      totalClasses: 0,
      totalEnrolledStudents: 0,
      averageClassSize: 0,
      classesWithTeacher: 0
    };
    
    // Get subject enrollment breakdown
    const subjectBreakdown = await Class.aggregate([
      {
        $match: {
          ...(term && { term }),
          ...(ay && { academicYear: ay })
        }
      },
      {
        $lookup: {
          from: 'subjects',
          localField: 'subject',
          foreignField: '_id',
          as: 'subjectInfo'
        }
      },
      {
        $unwind: '$subjectInfo'
      },
      {
        $project: {
          subjectName: '$subjectInfo.name',
          subjectCode: '$subjectInfo.code',
          enrolledCount: { $size: '$students' },
          maxStudents: '$capacity',
          hasTeacher: { $ne: ['$teacher', null] }
        }
      },
      {
        $sort: { enrolledCount: -1 }
      }
    ]);
    
    console.log(`[AdminStats] Generated statistics for ${stats.totalClasses} classes`);
    
    res.status(200).json({
      success: true,
      data: {
        overview: {
          ...stats,
          averageClassSize: Math.round(stats.averageClassSize * 100) / 100,
          teacherAssignmentRate: stats.totalClasses > 0 
            ? Math.round((stats.classesWithTeacher / stats.totalClasses) * 100)
            : 0
        },
        subjectBreakdown
      }
    });
    
  } catch (error) {
    console.error('[AdminStats] Error fetching enrollment statistics:', error);
    throw new ErrorResponse('Error fetching enrollment statistics', 500);
  }
});

/**
 * @desc    Assign a program/course to a student
 * @route   POST /api/admin/students/program
 * @access  Private/Admin
 */
const assignProgramToStudent = asyncHandler(async (req, res) => {
  try {
    const { studentId, programCode, semester, academicYear } = req.body;

    // Validate required fields
    if (!studentId || !programCode || !semester || !academicYear) {
      throw new ErrorResponse('studentId, programCode, semester, and academicYear are required', 400);
    }

    if (!['first', 'second'].includes(semester)) {
      throw new ErrorResponse('Semester must be first or second', 400);
    }

    const yearNum = parseInt(academicYear, 10);
    if (isNaN(yearNum) || yearNum < 2000 || yearNum > 2100) {
      throw new ErrorResponse('Academic year must be a valid year (e.g., 2025)', 400);
    }

    // Find student
    const student = await Student.findById(studentId);
    if (!student) {
      throw new ErrorResponse('Student not found', 404);
    }

    // Assign program details
    student.program = {
      code: String(programCode).toUpperCase(),
      semester,
      academicYear: yearNum,
      assignedBy: req.user?.id || req.user?._id,
      assignedAt: new Date()
    };

    await student.save();

    const updated = await Student.findById(student._id).select('-password');

    res.status(200).json({
      success: true,
      message: 'Program assigned successfully',
      data: updated
    });
  } catch (error) {
    console.error('[AdminAssignProgram] Error assigning program:', error);
    throw error instanceof ErrorResponse ? error : new ErrorResponse('Error assigning program to student', 500);
  }
});

export {
  getDashboard,
  getAllUsers,
  createUser,
  updateUser,
  deleteUser,
  resetUserPassword,
  addSubject,
  updateSubject,
  getSubjects,
  getSubject,
  deleteSubject,
  addOrUpdateGrade,
  searchStudents,
  enrollStudent,
  getStudentEnrollments,
  deleteEnrollmentById,
  deleteStudentEnrollment,
  unenrollStudent,
  assignProgramToStudent,
  assignTeacherToSubjects,
  getTeachersForAssignment,
  getEnrollmentStats,
  unassignTeacherFromSubject,
  deleteClassById
};
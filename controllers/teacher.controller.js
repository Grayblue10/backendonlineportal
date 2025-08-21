import asyncHandler from '../middlewares/asyncHandler.js';
import ErrorResponse from '../utils/errorResponse.js';
import User from '../models/User.model.js';
import Teacher from '../models/Teacher.model.js';
import Subject from '../models/Subject.model.js';
import Class from '../models/Class.model.js';
import Grade from '../models/Grade.model.js';
import Student from '../models/Student.model.js';
import Announcement from '../models/Announcement.model.js';

/**
 * @desc    Get all teachers with optional filtering
 * @route   GET /api/teachers
 * @access  Private/Admin
 */
export const getTeachers = asyncHandler(async (req, res, next) => {
  // Only admins can list all teachers
  if (req.user.role !== 'admin') {
    return next(new ErrorResponse('Not authorized to access this route', 403));
  }
  
  // Build query
  const query = {};
  
  // Search by name, email, or employee ID
  if (req.query.search) {
    query.$or = [
      { fullName: { $regex: req.query.search, $options: 'i' } },
      { email: { $regex: req.query.search, $options: 'i' } },
      { employeeId: { $regex: '^' + req.query.search, $options: 'i' } }
    ];
  }
  
  // Filter by active status if provided
  if (req.query.isActive) {
    query.isActive = req.query.isActive === 'true';
  }
  
  // Execute query
  const teachers = await Teacher.find(query)
    .select('-password')
    .sort({ fullName: 1 });
  
  res.status(200).json({ 
    success: true, 
    count: teachers.length, 
    data: teachers 
  });
});

/**
 * @desc    Get single teacher by ID
 * @route   GET /api/teachers/:id
 * @access  Private/Admin
 */
export const getTeacher = asyncHandler(async (req, res, next) => {
  const teacher = await Teacher.findById(req.params.id).select('-password');
  
  if (!teacher) {
    return next(
      new ErrorResponse(`Teacher not found with id of ${req.params.id}`, 404)
    );
  }
  
  // Make sure user is the teacher or admin
  if (teacher._id.toString() !== req.user.id && req.user.role !== 'admin') {
    return next(
      new ErrorResponse(`Not authorized to access this teacher`, 403)
    );
  }
  
  res.status(200).json({ success: true, data: teacher });
});

/**
 * @desc    Create new teacher
 * @route   POST /api/teachers
 * @access  Private/Admin
 */
export const createTeacher = asyncHandler(async (req, res, next) => {
  // Only admins can create teachers
  if (req.user.role !== 'admin') {
    return next(new ErrorResponse('Not authorized to create teachers', 403));
  }

  // Check if email or employee ID already exists
  const existingTeacher = await Teacher.findOne({ email: req.body.email });
  
  if (existingTeacher) {
    return next(new ErrorResponse('Email is already in use', 400));
  }

  // Create teacher with allowed fields
  const teacherData = {
    email: req.body.email,
    password: req.body.password,
    firstName: req.body.firstName,
    lastName: req.body.lastName,
    isActive: req.body.isActive !== false // Default to true if not provided
  };
  
  const teacher = await Teacher.create(teacherData);
  
  // Remove password from response
  const teacherResponse = teacher.toObject();
  delete teacherResponse.password;
  
  res.status(201).json({ 
    success: true, 
    message: 'Teacher created successfully',
    data: teacherResponse 
  });
});

/**
 * @desc    Update teacher
 * @route   PUT /api/teachers/:id
 * @access  Private/Admin
 */
export const updateTeacher = asyncHandler(async (req, res, next) => {
  let teacher = await Teacher.findById(req.params.id);

  if (!teacher) {
    return next(
      new ErrorResponse(`Teacher not found with id of ${req.params.id}`, 404)
    );
  }

  // Make sure user is the teacher or admin
  if (teacher._id.toString() !== req.user.id && req.user.role !== 'admin') {
    return next(
      new ErrorResponse(`Not authorized to update this teacher`, 403)
    );
  }

  // Fields that can be updated
  const updatableFields = [
    'firstName', 'lastName', 'contactNumber', 'address', 'isActive'
  ];
  
  // For admins, allow updating employeeId with validation
  if (req.user.role === 'admin' && req.body.employeeId) {
    if (req.body.employeeId !== teacher.employeeId) {
      const existingTeacher = await Teacher.findOne({ employeeId: req.body.employeeId });
      if (existingTeacher) {
        return next(new ErrorResponse('Employee ID is already in use', 400));
      }
      teacher.employeeId = req.body.employeeId;
    }
  }
  
  // Check for email update
  if (req.body.email && req.body.email !== teacher.email) {
    const existingTeacher = await Teacher.findOne({ email: req.body.email });
    if (existingTeacher) {
      return next(new ErrorResponse('Email is already in use', 400));
    }
    teacher.email = req.body.email;
  }
  
  // Update only the fields that are provided in the request
  updatableFields.forEach(field => {
    if (req.body[field] !== undefined) {
      teacher[field] = req.body[field];
    }
  });

  // Handle password update if provided
  if (req.body.password) {
    teacher.password = req.body.password;
  }

  await teacher.save();
  
  // Remove password from response
  const teacherResponse = teacher.toObject();
  delete teacherResponse.password;
  
  res.status(200).json({ 
    success: true, 
    message: 'Teacher updated successfully',
    data: teacherResponse 
  });
});

/**
 * @desc    Get teacher dashboard data
 * @route   GET /api/teachers/dashboard
 * @access  Private/Teacher
 */
export const getTeacherDashboard = asyncHandler(async (req, res, next) => {
  console.log(`[getTeacherDashboard] Starting request for user: ${req.user.id}`);
  
  try {
    // Find teacher in Teacher model using the user ID
    const teacher = await Teacher.findById(req.user.id);
    console.log(`[getTeacherDashboard] Teacher found:`, teacher ? teacher._id : 'null');
    
    if (!teacher || !teacher.isActive) {
      console.log(`[getTeacherDashboard] Teacher profile not found or inactive for user: ${req.user.id}`);
      return res.status(200).json({
        success: true,
        data: {
          stats: {
            totalClasses: 0,
            totalStudents: 0,
            totalGraded: 0,
            pendingGrades: 0,
            completedAssignments: 0
          },
          classes: [],
          assignments: [],
          recentGrades: [],
          announcements: []
        }
      });
    }

    console.log('✅ Teacher found:', teacher.firstName, teacher.lastName);

    // Get classes assigned to this teacher
    const classes = await Class.find({ teacher: teacher._id })
      .populate('subject', 'name code')
      .populate('students', 'firstName lastName studentId')
      .lean()
      .catch((err) => {
        console.log('⚠️ Error fetching classes:', err.message);
        return [];
      });

    // Get recent grades created by this teacher
    const recentGrades = await Grade.find({ teacher: teacher._id })
      .sort({ updatedAt: -1 })
      .limit(10)
      .populate('student', 'firstName lastName studentId')
      .populate('subject', 'name code')
      .lean()
      .catch((err) => {
        console.log('⚠️ Error fetching grades:', err.message);
        return [];
      });

    // Calculate statistics from actual class data
    const totalStudents = new Set();
    classes.forEach(cls => {
      if (cls.students && Array.isArray(cls.students)) {
        cls.students.forEach(student => {
          if (student && student._id) {
            totalStudents.add(student._id.toString());
          }
        });
      }
    });

    const stats = {
      totalClasses: classes.length,
      totalStudents: totalStudents.size,
      totalGraded: recentGrades.length,
      pendingGrades: Math.max(0, totalStudents.size * 2 - recentGrades.length),
      completedAssignments: recentGrades.filter(g => g.updatedAt > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).length
    };

    console.log('📈 Teacher dashboard stats:', stats);

    res.status(200).json({
      success: true,
      data: {
        stats,
        classes: classes.map(cls => ({
          _id: cls._id,
          name: cls.name,
          code: cls.code,
          subject: cls.subject,
          studentsCount: cls.students ? cls.students.length : 0,
          term: cls.term,
          academicYear: cls.academicYear
        })),
        assignments: [], // Will be populated when Assignment model is properly implemented
        recentGrades: recentGrades.slice(0, 5), // Limit to 5 most recent
        announcements: [] // Will be populated when Announcement model is properly implemented
      }
    });
  } catch (error) {
    console.error('❌ Error in getTeacherDashboard:', error);
    res.status(200).json({
      success: true,
      data: {
        stats: {
          totalClasses: 0,
          totalStudents: 0,
          totalGraded: 0,
          pendingGrades: 0,
          completedAssignments: 0
        },
        classes: [],
        assignments: [],
        recentGrades: [],
        announcements: []
      }
    });
  }
});

/**
 * @desc    Get teaching materials
 * @route   GET /api/teachers/materials
 * @access  Private/Teacher
 */
export const getMaterials = asyncHandler(async (req, res, next) => {
  const teacher = await Teacher.findById(req.user.id);
  
  if (!teacher) {
    // Profile feature disabled: return empty list instead of 404
    return res.status(200).json({
      success: true,
      count: 0,
      data: []
    });
  }

 

  // Add search filter if provided
  if (req.query.search) {
    query.title = { $regex: req.query.search, $options: 'i' };
  }

  // Filter by class if provided
  if (req.query.classId) {
    query.class = req.query.classId;
  }

  // Execute query
  const materials = await Material.find(query)
    .populate('class', 'name')
    .populate('subject', 'name code')
    .populate('uploadedBy', 'fullName')
    .sort('-uploadedAt');

  res.status(200).json({
    success: true,
    count: materials.length,
    data: materials
  });
});

/**
 * @desc    Get teacher profile
 * @route   GET /api/teachers/profile
 * @access  Private/Teacher
 */
export const getTeacherProfile = asyncHandler(async (req, res, next) => {
  // Profile feature disabled: return minimal info to avoid 404s
  return res.status(200).json({
    success: true,
    message: 'Teacher profile feature disabled',
    data: null
  });
});

// @desc    Update teacher profile
// @route   PUT /api/teacher/profile
// @access  Private/Teacher
export const updateTeacherProfile = asyncHandler(async (req, res, next) => {
  // Profile feature disabled
  return next(new ErrorResponse('Teacher profile feature is disabled', 400));
});

// @desc    Update student grade
// @route   PUT /api/teacher/grades/:studentId
// @access  Private/Teacher
export const updateStudentGrade = asyncHandler(async (req, res, next) => {
  const { subject, grade, semester, comments } = req.body;
  const teacher = await Teacher.findOne({ user: req.user.id });
  
  if (!teacher) {
    return next(new ErrorResponse('Teacher context is required', 400));
  }

  // Update or create grade
  const updatedGrade = await Grade.findOneAndUpdate(
    { 
      student: req.params.studentId, 
      subject,
      semester
    },
    { 
      grade,
      teacher: teacher._id,
      comments: comments || '',
      updatedAt: Date.now()
    },
    { new: true, upsert: true, runValidators: true }
  );

  res.status(200).json({
    success: true,
    message: 'Grade updated successfully',
    data: updatedGrade
  });
});

// @desc    Get student grades
// @route   GET /api/teacher/grades/student/:studentId
// @access  Private/Teacher
export const getStudentGrades = asyncHandler(async (req, res, next) => {
  const teacher = await Teacher.findById(req.user.id);
  
  if (!teacher) {
    // Profile feature disabled: return empty list instead of 404
    return res.status(200).json({
      success: true,
      count: 0,
      data: []
    });
  }

  // Get all classes where this teacher teaches the student
  const classes = await Class.find({
    teacher: teacher._id,
    students: req.params.studentId
  }).select('subject');

  const subjectIds = classes.map(cls => cls.subject);

  const grades = await Grade.find({
    student: req.params.studentId,
    // subject is embedded; filter by subjectIds is not valid. If needed, match by code/name.
  });

  res.status(200).json({
    success: true,
    count: grades.length,
    data: grades
  });
});

// Duplicate functions removed - using the export const versions above

/**
 * @desc    Get students in a specific class
 * @route   GET /api/teachers/classes/:classId/students
 * @access  Private/Teacher
 */
export const getClassStudents = asyncHandler(async (req, res, next) => {
  try {
    // The app uses teacher._id equal to req.user.id (Teacher model id)
    const teacher = await Teacher.findById(req.user.id);
    if (!teacher || !teacher.isActive) {
      return res.status(200).json({
        success: true,
        count: 0,
        data: []
      });
    }

    const { classId } = req.params;
    if (!classId) {
      return next(new ErrorResponse('Class ID is required', 400));
    }

    // Ensure the class exists and belongs to this teacher
    const cls = await Class.findById(classId)
      .populate('students', 'firstName lastName studentId email');
    if (!cls) {
      return next(new ErrorResponse('Class not found', 404));
    }
    if (cls.teacher?.toString() !== teacher._id.toString()) {
      return next(new ErrorResponse('Not authorized to view students in this class', 403));
    }

    const students = Array.isArray(cls.students) ? cls.students.map(st => ({
      _id: st._id,
      firstName: st.firstName || '',
      lastName: st.lastName || '',
      studentId: st.studentId || '',
      email: st.email || ''
    })) : [];

    return res.status(200).json({
      success: true,
      count: students.length,
      data: students
    });
  } catch (err) {
    console.error('[getClassStudents] Error:', err);
    return next(new ErrorResponse('Error fetching class students', 500));
  }
});

/**
 * @desc    Delete teacher
 * @route   DELETE /api/teachers/:id
 * @access  Private/Admin
 */
export const deleteTeacher = asyncHandler(async (req, res, next) => {
  const teacher = await Teacher.findById(req.params.id);

  if (!teacher) {
    return next(
      new ErrorResponse(`Teacher not found with id of ${req.params.id}`, 404)
    );
  }

  await teacher.remove();

  res.status(200).json({ success: true, data: teacher });
});

// Duplicate function removed - using the export const version above

/**
 * @desc    Get students taught by the teacher
 * @route   GET /api/teachers/students
 * @access  Private/Teacher
 */
export const getTeacherStudents = asyncHandler(async (req, res, next) => {
  const teacher = await Teacher.findById(req.user.id);
  
  if (!teacher) {
    // Profile feature disabled: return empty list instead of 404
    return res.status(200).json({
      success: true,
      count: 0,
      data: []
    });
  }

  // Get all classes taught by this teacher and populate students
  const classes = await Class.find({ teacher: teacher._id })
    .populate({
      path: 'students',
      select: 'fullName email studentId grade section',
      populate: {
        path: 'user',
        select: 'email isActive'
      }
    })
    .select('name subject students')
    .lean();

  // Extract unique students (in case a student is in multiple classes)
  const studentMap = new Map();
  
  classes.forEach(cls => {
    if (cls.students && cls.students.length > 0) {
      cls.students.forEach(student => {
        if (!studentMap.has(student._id.toString())) {
          studentMap.set(student._id.toString(), {
            ...student,
            classes: [{
              classId: cls._id,
              className: cls.name,
              subject: cls.subject
            }]
          });
        } else {
          // If student is in multiple classes, add the class info
          const existingStudent = studentMap.get(student._id.toString());
          existingStudent.classes.push({
            classId: cls._id,
            className: cls.name,
            subject: cls.subject
          });
        }
      });
    }
  });

  const students = Array.from(studentMap.values());

  res.status(200).json({
    success: true,
    count: students.length,
    data: students
  });
});

/**
 * @desc    Get courses taught by the teacher
 * @route   GET /api/teachers/courses
 * @access  Private/Teacher
 */
export const getTeacherCourses = asyncHandler(async (req, res, next) => {
  const teacher = await Teacher.findById(req.user.id);
  
  if (!teacher) {
    // Profile feature disabled: return empty list instead of 404
    return res.status(200).json({
      success: true,
      count: 0,
      data: []
    });
  }

  // Get all classes taught by this teacher
  const courses = await Class.find({ teacher: teacher._id })
    .populate('subject', 'name code')
    .populate('students', 'fullName studentId')
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: courses.length,
    data: courses
  });
});

/**
 * @desc    Get teacher's classes
 * @route   GET /api/teacher/classes
 * @access  Private/Teacher
 */
export const getTeacherClasses = asyncHandler(async (req, res, next) => {
  console.log(`[getTeacherClasses] Starting request for user: ${req.user.id}`);
  
  try {
    // Find teacher in Teacher model using the user ID
    const teacher = await Teacher.findById(req.user.id);
    console.log(`[getTeacherClasses] Teacher found:`, teacher ? teacher._id : 'null');
    
    if (!teacher || !teacher.isActive) {
      console.log(`[getTeacherClasses] Teacher profile not found or inactive for user: ${req.user.id}`);
      return res.status(200).json({
        success: true,
        count: 0,
        data: []
      });
    }

    // Get all classes taught by this teacher with error handling
    let classes = [];
    try {
      classes = await Class.find({ teacher: teacher._id })
        .populate('subject', 'name code')
        .populate('students', 'firstName lastName studentId')
        .sort({ createdAt: -1 });
      console.log(`[getTeacherClasses] Found ${classes.length} classes for teacher ${teacher._id}`);
    } catch (classError) {
      console.error(`[getTeacherClasses] Error fetching classes:`, classError);
      // Return empty array if Class model has issues
      classes = [];
    }

    // Transform data to match frontend expectations with safe property access
    const transformedClasses = classes.map(cls => {
      console.log(`[getTeacherClasses] Transforming class:`, cls._id);
      return {
        _id: cls._id,
        id: cls._id, // Keep both for compatibility
        name: cls.name || 'Unnamed Class',
        subject: cls.subject?.name || 'Unknown Subject',
        code: cls.subject?.code || cls.code || 'N/A',
        semester: cls.term || cls.semester || 'First Semester',
        students: cls.students?.length || 0,
        schedule: cls.schedule?.days?.join(', ') || cls.schedule || 'TBD',
        room: cls.schedule?.room || cls.room || 'TBD',
        status: cls.status || 'active',
        nextClass: cls.nextClass || new Date(),
        description: cls.description || 'No description available',
        academicYear: cls.academicYear || '2024-2025',
        credits: cls.credits || 3
      };
    });

    console.log(`[getTeacherClasses] Successfully transformed ${transformedClasses.length} classes`);

    res.status(200).json({
      success: true,
      count: transformedClasses.length,
      data: transformedClasses
    });
  } catch (error) {
    console.error(`[getTeacherClasses] Unexpected error:`, error);
    return next(new ErrorResponse('Error fetching teacher classes', 500));
  }
});

/**
 * @desc    Get teacher's subjects
 * @route   GET /api/teacher/subjects
 * @access  Private/Teacher
 */
export const getTeacherSubjects = asyncHandler(async (req, res, next) => {
  console.log(`[getTeacherSubjects] Starting request for user: ${req.user.id}`);
  
  try {
    const teacher = await Teacher.findById(req.user.id);
    console.log(`[getTeacherSubjects] Teacher found:`, teacher ? teacher._id : 'null');
    
    if (!teacher || !teacher.isActive) {
      console.log(`[getTeacherSubjects] Teacher profile not found or inactive for user: ${req.user.id}`);
      return res.status(200).json({
        success: true,
        count: 0,
        data: []
      });
    }

    // Get all classes taught by this teacher to find subjects with error handling
    let classes = [];
    try {
      classes = await Class.find({ teacher: teacher._id })
        .populate('subject', 'name code description units semester department prerequisites isActive')
        .populate('students', 'firstName lastName studentId');
      console.log(`[getTeacherSubjects] Found ${classes.length} classes for teacher ${teacher._id}`);
    } catch (classError) {
      console.error(`[getTeacherSubjects] Error fetching classes:`, classError);
      // Return empty array if Class model has issues
      classes = [];
    }

    // Group classes by subject with safe property access
    const subjectMap = new Map();
    
    classes.forEach(cls => {
      if (cls.subject) {
        const subjectId = cls.subject._id.toString();
        if (!subjectMap.has(subjectId)) {
          subjectMap.set(subjectId, {
            _id: cls.subject._id,
            id: cls.subject._id, // Keep both for compatibility
            name: cls.subject.name || 'Unknown Subject',
            code: cls.subject.code || 'N/A',
            description: cls.subject.description || 'No description available',
            units: cls.subject.units || 3,
            semester: cls.subject.semester || 'first',
            department: cls.subject.department || 'General',
            prerequisites: cls.subject.prerequisites || [],
            classes: [],
            totalStudents: 0,
            isActive: cls.subject.isActive !== false,
            createdAt: cls.subject.createdAt || new Date()
          });
        }
        
        const subject = subjectMap.get(subjectId);
        subject.classes.push({
          _id: cls._id,
          id: cls._id,
          name: cls.name || 'Unnamed Class',
          students: cls.students?.length || 0
        });
        subject.totalStudents += cls.students?.length || 0;
      }
    });

    const subjects = Array.from(subjectMap.values());
    console.log(`[getTeacherSubjects] Successfully processed ${subjects.length} subjects`);

    res.status(200).json({
      success: true,
      count: subjects.length,
      data: subjects
    });
  } catch (error) {
    console.error(`[getTeacherSubjects] Unexpected error:`, error);
    return next(new ErrorResponse('Error fetching teacher subjects', 500));
  }
});

/**
 * @desc    Get teacher's grades
 * @route   GET /api/teacher/grades
 * @access  Private/Teacher
 */
export const getTeacherGrades = asyncHandler(async (req, res, next) => {
  console.log(`[getTeacherGrades] Starting request for user: ${req.user.id}`);
  
  try {
    // Find teacher in Teacher model using the user ID
    const teacher = await Teacher.findById(req.user.id);
    console.log(`[getTeacherGrades] Teacher found:`, teacher ? teacher._id : 'null');
    
    if (!teacher || !teacher.isActive) {
      console.log(`[getTeacherGrades] Teacher profile not found or inactive for user: ${req.user.id}`);
      return res.status(200).json({
        success: true,
        count: 0,
        data: []
      });
    }

    // Build query with optional filters (supports subject code/name and class)
    const { classId, subject, subjectCode, subjectName, semester, studentId } = req.query;
    const query = { teacher: teacher._id };
    if (classId) query.class = classId;
    if (studentId) query.student = studentId;
    if (semester) query.semester = semester;
    const code = subjectCode || subject; // allow 'subject' to mean code for convenience
    if (code) query['subject.code'] = code;
    if (subjectName) query['subject.name'] = { $regex: subjectName, $options: 'i' };

    // Get grades created by this teacher with error handling
    let grades = [];
    try {
      grades = await Grade.find(query)
        .populate('student', 'firstName lastName studentId')
        .sort({ updatedAt: -1 });
      console.log(`[getTeacherGrades] Found ${grades.length} grades for teacher ${teacher._id} with query:`, query);
    } catch (gradeError) {
      console.error(`[getTeacherGrades] Error fetching grades:`, gradeError);
      // Return empty array if Grade model has issues
      grades = [];
    }

    // Transform data to match frontend expectations with safe property access
    const transformedGrades = grades.map(grade => {
      console.log(`[getTeacherGrades] Transforming grade:`, grade._id);
      return {
        _id: grade._id,
        id: grade._id, // Keep both for compatibility
        student: {
          _id: grade.student?._id,
          id: grade.student?._id,
          firstName: grade.student?.firstName || 'Unknown',
          lastName: grade.student?.lastName || 'Student',
          studentId: grade.student?.studentId || 'N/A'
        },
        class: {
          _id: grade.class || null,
          id: grade.class || null,
          name: grade.className || 'Unknown Class'
        },
        subject: {
          name: grade.subject?.name || 'Unknown Subject',
          code: grade.subject?.code || 'N/A'
        },
        assessmentType: grade.assessmentType || 'quiz',
        title: grade.title || 'Untitled Assessment',
        score: grade.score || 0,
        maxScore: grade.maxScore || 100,
        percentage: grade.maxScore ? Math.round((grade.score / grade.maxScore) * 100) : 0,
        semester: grade.semester || 'first',
        academicYear: grade.academicYear || '2024-25',
        gradedAt: grade.updatedAt || grade.createdAt,
        notes: grade.notes || ''
      };
    });

    console.log(`[getTeacherGrades] Successfully transformed ${transformedGrades.length} grades`);

    res.status(200).json({
      success: true,
      count: transformedGrades.length,
      data: transformedGrades
    });
  } catch (error) {
    console.error(`[getTeacherGrades] Unexpected error:`, error);
    return next(new ErrorResponse('Error fetching teacher grades', 500));
  }
});

/**
 * @desc    Get available subjects for teacher to choose from
 * @route   GET /api/teacher/available-subjects
 * @access  Private/Teacher
 */
export const getAvailableSubjects = asyncHandler(async (req, res, next) => {
  console.log(`[getAvailableSubjects] Starting request for user: ${req.user.id}`);
  
  try {
    const teacher = await Teacher.findById(req.user.id);
    
    if (!teacher || !teacher.isActive) {
      console.log(`[getAvailableSubjects] Teacher not found or inactive`);
      return res.status(200).json({
        success: true,
        data: [],
        meta: { canSelfAssign: false, reason: 'Teacher profile not found or inactive' }
      });
    }

    // Get all subjects
    const allSubjects = await Subject.find({ isActive: true })
      .select('name code description')
      .sort({ name: 1 });

    // Get subjects already assigned to this teacher
    const assignedClasses = await Class.find({ teacher: teacher._id })
      .populate('subject', '_id')
      .select('subject createdBy students');
    
    const assignedSubjectIds = assignedClasses.map(cls => cls.subject?._id?.toString()).filter(Boolean);
    
    // Determine if any current assignments were created by an admin
    const creatorIds = Array.from(new Set(assignedClasses
      .map(cls => cls.createdBy?.toString())
      .filter(Boolean)));
    let adminAssigned = false;
    if (creatorIds.length > 0) {
      try {
        const creators = await User.find({ _id: { $in: creatorIds } }).select('role');
        adminAssigned = creators.some(u => u.role === 'admin');
      } catch (e) {
        console.warn('[getAvailableSubjects] Failed to resolve creators for admin check:', e?.message);
      }
    }

    // Mark subjects as assigned or available
    // Compute student counts per subject based on teacher's classes
    const subjectStudentCounts = new Map();
    assignedClasses.forEach(cls => {
      const sid = cls.subject?._id?.toString() || cls.subject?.toString();
      if (!sid) return;
      const current = subjectStudentCounts.get(sid) || 0;
      subjectStudentCounts.set(sid, current + (Array.isArray(cls.students) ? cls.students.length : 0));
    });

    const subjectsWithStatus = allSubjects.map(subject => ({
      _id: subject._id,
      name: subject.name,
      code: subject.code,
      description: subject.description,
      isAssigned: assignedSubjectIds.includes(subject._id.toString()),
      studentCount: subjectStudentCounts.get(subject._id.toString()) || 0
    }));

    console.log(`[getAvailableSubjects] Found ${subjectsWithStatus.length} subjects`);

    res.status(200).json({
      success: true,
      data: subjectsWithStatus,
      meta: {
        canSelfAssign: !adminAssigned,
        reason: adminAssigned ? 'Subjects already assigned by admin. Contact admin for changes.' : undefined
      }
    });
  } catch (error) {
    console.error(`[getAvailableSubjects] Error:`, error);
    return next(new ErrorResponse('Error fetching available subjects', 500));
  }
});

/**
 * @desc    Assign subjects to teacher (max 2)
 * @route   POST /api/teacher/assign-subjects
 * @access  Private/Teacher
 */
export const assignSubjectsToTeacher = asyncHandler(async (req, res, next) => {
  console.log(`[assignSubjectsToTeacher] Starting request for user: ${req.user.id}`);
  
  try {
    const teacher = await Teacher.findById(req.user.id);
    
    if (!teacher || !teacher.isActive) {
      console.log(`[assignSubjectsToTeacher] Teacher not found or inactive`);
      return next(new ErrorResponse('Teacher profile not found', 404));
    }

    const { subjectIds } = req.body;
    
    if (!Array.isArray(subjectIds) || subjectIds.length === 0 || subjectIds.length > 2) {
      return next(new ErrorResponse('Please select 1 or 2 subjects', 400));
    }

    // Verify subjects exist
    const subjects = await Subject.find({ _id: { $in: subjectIds }, isActive: true });
    
    if (subjects.length !== subjectIds.length) {
      return next(new ErrorResponse('One or more subjects not found', 404));
    }

    // Fetch existing classes for this teacher (to compute limits and admin assignment)
    const existingForTeacher = await Class.find({ teacher: teacher._id }).select('createdBy subject');
    const creatorIds = Array.from(new Set(existingForTeacher.map(c => c.createdBy?.toString()).filter(Boolean)));
    if (creatorIds.length > 0) {
      try {
        const creators = await User.find({ _id: { $in: creatorIds } }).select('role');
        const adminAssigned = creators.some(u => u.role === 'admin');
        if (adminAssigned) {
          return next(new ErrorResponse('Subjects already assigned by admin. Please contact admin for changes.', 403));
        }
      } catch (e) {
        console.warn('[assignSubjectsToTeacher] Failed admin-assignment check, proceeding cautiously:', e?.message);
      }
    }

    // Enforce: no replacement; only allow adding if assigned count is 0 or 1 (max 2 total)
    const assignedCount = existingForTeacher.length;
    const maxTotal = 2;
    const remainingSlots = Math.max(0, maxTotal - assignedCount);

    if (remainingSlots <= 0) {
      return next(new ErrorResponse('You already have the maximum number of assigned classes.', 403));
    }

    // Exclude subjects already assigned to this teacher
    const alreadyAssignedSubjectIds = new Set(
      existingForTeacher
        .map(c => c.subject?.toString())
        .filter(Boolean)
    );
    const newSubjects = subjects.filter(s => !alreadyAssignedSubjectIds.has(s._id.toString()));

    if (newSubjects.length === 0) {
      return next(new ErrorResponse('Selected subjects are already assigned.', 400));
    }

    if (newSubjects.length > remainingSlots) {
      return next(new ErrorResponse(`You can only add ${remainingSlots} more subject${remainingSlots > 1 ? 's' : ''}.`, 400));
    }

    // Create only the additional class assignments
    const classPromises = newSubjects.map((subject, index) => {
      const currentYear = new Date().getFullYear();
      const nextYear = currentYear + 1;
      
      return Class.create({
        name: `${subject.name} - ${teacher.firstName} ${teacher.lastName}`,
        code: `${subject.code}-${teacher._id.toString().slice(-4)}-${index + 1}`,
        subject: subject._id,
        teacher: teacher._id,
        createdBy: teacher._id,
        students: [],
        capacity: 30,
        academicYear: `${currentYear}-${nextYear}`,
        term: 'Fall',
        schedule: {
          days: ['Monday', 'Wednesday'],
          startTime: '09:00',
          endTime: '10:00',
          room: 'TBD'
        },
        status: 'active',
        createdBy: teacher._id,
        description: `${subject.name} class taught by ${teacher.firstName} ${teacher.lastName}`
      });
    });

    const createdClasses = await Promise.all(classPromises);

    console.log(`[assignSubjectsToTeacher] Created ${createdClasses.length} classes for teacher ${teacher._id}`);

    res.status(201).json({
      success: true,
      message: 'Subjects assigned successfully',
      data: createdClasses.map(cls => ({
        _id: cls._id,
        name: cls.name,
        subject: cls.subject,
        maxStudents: cls.maxStudents,
        currentStudents: cls.students.length
      }))
    });
  } catch (error) {
    console.error(`[assignSubjectsToTeacher] Error:`, error);
    return next(new ErrorResponse('Error assigning subjects', 500));
  }
});

/**
 * @desc    Get students enrolled in teacher's subjects
 * @route   GET /api/teachers/enrolled-students
 * @access  Private/Teacher
 */
export const getEnrolledStudents = asyncHandler(async (req, res, next) => {
  console.log(`[getEnrolledStudents] Starting request for user: ${req.user.id}`);
  
  try {
    const teacher = await Teacher.findById(req.user.id);
    
    if (!teacher || !teacher.isActive) {
      return res.status(200).json({
        success: true,
        data: []
      });
    }

    // Get teacher's classes with enrolled students
    const classes = await Class.find({ teacher: teacher._id })
      .populate('subject', 'name code')
      .populate('students', 'firstName lastName email')
      .sort({ 'subject.name': 1 });

    const enrollmentData = classes.map(cls => ({
      _id: cls._id,
      className: cls.name,
      subject: {
        _id: cls.subject._id,
        name: cls.subject.name,
        code: cls.subject.code
      },
      maxStudents: cls.maxStudents || 30,
      currentStudents: cls.students.length,
      availableSlots: (cls.maxStudents || 30) - cls.students.length,
      students: cls.students.map(student => ({
        _id: student._id,
        name: `${student.firstName} ${student.lastName}`,
        email: student.email
      }))
    }));

    console.log(`[getEnrolledStudents] Found ${enrollmentData.length} classes with students`);

    res.status(200).json({
      success: true,
      data: enrollmentData
    });
  } catch (error) {
    console.error(`[getEnrolledStudents] Error:`, error);
    return next(new ErrorResponse('Error fetching enrolled students', 500));
  }
});

/**
 * @desc    Create new grade
 * @route   POST /api/teacher/grades
 * @access  Private/Teacher
 */
export const createGrade = asyncHandler(async (req, res, next) => {
  // Profile feature disabled: do not hard-require a Teacher document
  const teacher = await Teacher.findById(req.user.id).catch(() => null);

  const {
    studentId,
    classId,
    assessmentType,
    title,
    maxScore,
    score,
    semester,
    academicYear
  } = req.body;

  // Verify student exists
  const student = await Student.findById(studentId);
  if (!student) {
    return next(new ErrorResponse('Student not found', 404));
  }

  // Derive subject and class name from Class
  const cls = await Class.findById(classId).populate('subject', 'name code');
  if (!cls) {
    return next(new ErrorResponse('Class not found', 404));
  }

  // Upsert grade (one grade per student per class per teacher/term/year)
  const filter = {
    student: studentId,
    class: classId,
    teacher: teacher?._id || req.user.id,
    semester,
    academicYear
  };

  const update = {
    $set: {
      subject: {
        name: cls.subject?.name || 'Unknown Subject',
        code: cls.subject?.code || 'N/A'
      },
      assessmentType,
      title,
      maxScore,
      score,
      className: cls.name || `Class ${classId}`,
      gradedBy: req.user.id,
      updatedAt: Date.now()
    },
    $setOnInsert: {
      createdAt: Date.now()
    }
  };

  const grade = await Grade.findOneAndUpdate(filter, update, {
    new: true,
    upsert: true,
    runValidators: true
  });

  // Populate the resulting grade (only student is a ref; subject is embedded)
  await grade.populate([
    { path: 'student', select: 'firstName lastName studentId' }
  ]);

  res.status(201).json({
    success: true,
    message: 'Grade saved successfully',
    data: grade
  });
});

/**
 * @desc    Update grade
 * @route   PUT /api/teacher/grades/:id
 * @access  Private/Teacher
 */
export const updateGrade = asyncHandler(async (req, res, next) => {
  // Do not hard-require a Teacher document for updates
  await Teacher.findById(req.user.id).catch(() => null);

  let grade = await Grade.findById(req.params.id);
  
  if (!grade) {
    return next(new ErrorResponse('Grade not found', 404));
  }

  // Make sure the teacher owns this grade
  if (grade.gradedBy.toString() !== req.user.id) {
    return next(new ErrorResponse('Not authorized to update this grade', 403));
  }

  // Update grade
  grade = await Grade.findByIdAndUpdate(
    req.params.id,
    { ...req.body, updatedAt: Date.now() },
    { new: true, runValidators: true }
  ).populate([
    { path: 'student', select: 'firstName lastName studentId' }
  ]);

  res.status(200).json({
    success: true,
    message: 'Grade updated successfully',
    data: grade
  });
});

/**
 * @desc    Delete grade
 * @route   DELETE /api/teacher/grades/:id
 * @access  Private/Teacher
 */
export const deleteGrade = asyncHandler(async (req, res, next) => {
  // Do not hard-require a Teacher document for deletions
  await Teacher.findById(req.user.id).catch(() => null);

  const grade = await Grade.findById(req.params.id);
  
  if (!grade) {
    return next(new ErrorResponse('Grade not found', 404));
  }

  // Make sure the teacher owns this grade
  if (grade.gradedBy.toString() !== req.user.id) {
    return next(new ErrorResponse('Not authorized to delete this grade', 403));
  }

  await Grade.findByIdAndDelete(req.params.id);

  res.status(200).json({
    success: true,
    message: 'Grade deleted successfully'
  });
});

// All functions are now exported individually using ES module syntax above

import express from 'express';
import { body, param } from 'express-validator';
import { protect, authorize } from '../middlewares/auth.middleware.js';
import {
  getTeacherDashboard,
  updateStudentGrade,
  getStudentGrades,
  getTeacherStudents,
  getTeacherCourses,
  getTeacherClasses,
  getTeacherSubjects,
  createGrade,
  updateGrade,
  deleteGrade,
  getTeacherGrades,
  getAvailableSubjects,
  assignSubjectsToTeacher,
  getEnrolledStudents,
  getClassStudents
} from '../controllers/teacher.controller.js';

const router = express.Router();

// Apply authentication to all routes
router.use(protect);
router.use(authorize('teacher', 'admin'));

/**
 * @swagger
 * tags:
 *   - name: Teacher Dashboard
 *     description: Endpoints for teacher dashboard
 */

/**
 * @swagger
 * /teachers/dashboard:
 *   get:
 *     summary: Get teacher dashboard data
 *     tags: [Teacher Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Returns teacher dashboard data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     classes:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Class'
 *                     recentAssignments:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Assignment'
 *                     recentGrades:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Grade'
 *                     attendanceSummary:
 *                       $ref: '#/components/schemas/AttendanceSummary'
 *                     announcements:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Announcement'
 *                     stats:
 *                       $ref: '#/components/schemas/TeacherStats'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         description: Forbidden - Teacher access required
 *       500:
 *         description: Internal server error
 */
router.get('/dashboard', getTeacherDashboard);

// Student management
router.get('/students', getTeacherStudents);

// Course management
router.get('/courses', getTeacherCourses);

// Classes management
router.get('/classes', getTeacherClasses);
router.get('/classes/:classId/students', getClassStudents);

// Subjects management
router.get('/subjects', getTeacherSubjects);

// Grade management
router.route('/grades')
  .get(getTeacherGrades)
  .post([
    body('studentId').isMongoId(),
    body('classId').isMongoId(),
    body('assessmentType').isIn(['final']).withMessage('Only final assessments are allowed'),
    body('title').notEmpty().trim(),
    body('maxScore').isNumeric().isFloat({ min: 1 }),
    body('score').isNumeric().isFloat({ min: 0 }),
    body('semester').isIn(['first', 'second']),
    body('academicYear').notEmpty().trim()
  ], createGrade);

router.route('/grades/:id')
  .put([
    param('id').isMongoId(),
    body('studentId').optional().isMongoId(),
    body('classId').optional().isMongoId(),
    body('assessmentType').optional().isIn(['final']).withMessage('Only final assessments are allowed'),
    body('title').optional().notEmpty().trim(),
    body('maxScore').optional().isNumeric().isFloat({ min: 1 }),
    body('score').optional().isNumeric().isFloat({ min: 0 }),
    body('semester').optional().isIn(['first', 'second']),
    body('academicYear').optional().notEmpty().trim()
  ], updateGrade)
  .delete([
    param('id').isMongoId()
  ], deleteGrade);

router.route('/grades/student/:studentId')
  .get([
    param('studentId').isMongoId()
  ], getStudentGrades)
  .put([
    param('studentId').isMongoId(),
    body('subject').notEmpty().isMongoId(),
    body('grade').isNumeric().isFloat({ min: 0, max: 100 }),
    body('semester').notEmpty(),
    body('comments').optional().trim(),
    body('isFinal').optional().isBoolean()
  ], updateStudentGrade);

// Subject assignment routes
router.route('/available-subjects')
  .get(getAvailableSubjects);

router.route('/assign-subjects')
  .post([
    body('subjectIds').isArray({ min: 1, max: 2 }).withMessage('Please select 1 or 2 subjects'),
    body('subjectIds.*').isMongoId().withMessage('Invalid subject ID')
  ], assignSubjectsToTeacher);

// Student enrollment routes
router.route('/enrolled-students')
  .get(getEnrolledStudents);

export default router;
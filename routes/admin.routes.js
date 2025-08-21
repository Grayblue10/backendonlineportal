import express from 'express';
import {
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
  assignProgramToStudent,
  assignTeacherToSubjects,
  getTeachersForAssignment,
  getEnrollmentStats
} from '../controllers/admin.controller.js';
import { protect, authorize } from '../middlewares/auth.middleware.js';
import { body, param } from 'express-validator';

const router = express.Router();

// Apply authentication and admin role to all routes
router.use(protect);
router.use(authorize('admin'));

/**
 * @swagger
 * tags:
 *   name: Dashboard
 *   description: Admin dashboard endpoints
 */

/**
 * @swagger
 * /admin/dashboard:
 *   get:
 *     summary: Get admin dashboard data
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Returns admin dashboard data
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
 *                     stats:
 *                       type: object
 *                       properties:
 *                         users:
 *                           $ref: '#/components/schemas/UserStats'
 *                         academic:
 *                           $ref: '#/components/schemas/AcademicStats'
 *                         system:
 *                           $ref: '#/components/schemas/SystemStats'
 *                     recentActivity:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Activity'
 *                     userActivity:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/DailyUserActivity'
 *                     systemHealth:
 *                       $ref: '#/components/schemas/SystemHealth'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         description: Forbidden - Admin access required
 *       500:
 *         description: Internal server error
 */
router.get('/dashboard', getDashboard);

// User Management
router.get('/users', getAllUsers);
router.post('/users', createUser);
router.put('/users/:id', updateUser);
router.delete('/users/:id', deleteUser);
router.post('/users/:id/reset-password', resetUserPassword);

// Subject Management
router.get('/subjects', getSubjects);
router.get('/subjects/:id', getSubject);
router.post('/subjects', [
  body('name').trim().notEmpty().withMessage('Subject name is required'),
  body('code').trim().notEmpty().withMessage('Subject code is required'),
  body('units').isNumeric().withMessage('Units must be a number'),
  body('department').optional().trim(),
  body('description').optional().trim(),
  body('prerequisites').optional().isArray()
], addSubject);

router.put('/subjects/:id', [
  param('id').isMongoId().withMessage('Invalid subject ID'),
  body('name').optional().trim().notEmpty(),
  body('code').optional().trim().notEmpty(),
  body('units').optional().isNumeric(),
  body('department').optional().trim(),
  body('description').optional().trim(),
  body('semester').optional().isIn(['first', 'second', 'both']),
  body('isActive').optional().isBoolean(),
  body('prerequisites').optional().isArray()
], updateSubject);

router.delete('/subjects/:id', [
  param('id').isMongoId().withMessage('Invalid subject ID')
], deleteSubject);

// Grade management
router.post('/grades', [
  body('studentId').isMongoId().withMessage('Valid student ID is required'),
  body('subjectId').isMongoId().withMessage('Valid subject ID is required'),
  body('score').isNumeric().withMessage('Score must be a number'),
  body('maxScore').isNumeric().withMessage('Max score must be a number'),
  body('semester').isIn(['first', 'second']).withMessage('Semester must be first or second'),
  body('academicYear').isNumeric().withMessage('Academic year must be a number')
], addOrUpdateGrade);

// Student search and enrollment routes
router.get('/students/search', searchStudents);
router.post('/students/enroll', [
  body('studentId').isMongoId().withMessage('Valid student ID is required'),
  body('subjectId').isMongoId().withMessage('Valid subject ID is required'),
  body('semester').isIn(['first', 'second']).withMessage('Semester must be first or second'),
  body('academicYear').isNumeric().withMessage('Academic year must be a number')
], enrollStudent);

// Program assignment (course assignment) route
router.post('/students/program', [
  body('studentId').isMongoId().withMessage('Valid student ID is required'),
  body('programCode').trim().notEmpty().withMessage('Program code is required'),
  body('semester').isIn(['first', 'second']).withMessage('Semester must be first or second'),
  body('academicYear').isNumeric().withMessage('Academic year must be a number')
], assignProgramToStudent);

// Teacher assignment routes
router.get('/teachers', getTeachersForAssignment);
router.post('/teachers/assign', [
  body('teacherId').isMongoId().withMessage('Valid teacher ID is required'),
  body('subjectIds').isArray({ min: 1, max: 2 }).withMessage('Must select 1-2 subjects'),
  body('subjectIds.*').isMongoId().withMessage('All subject IDs must be valid'),
  body('semester').isIn(['first', 'second']).withMessage('Semester must be first or second'),
  body('academicYear').isNumeric().withMessage('Academic year must be a number')
], assignTeacherToSubjects);

// Enrollment statistics
router.get('/enrollment/stats', getEnrollmentStats);

export default router;
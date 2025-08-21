import express from 'express';
import { body } from 'express-validator';
import { protect, authorize } from '../middlewares/auth.middleware.js';
import {
  getStudentDashboard,
  getStudentProfile,
  updateStudentProfile,
  getStudentGrades,
  getStudentSubjects,
  getRecentGrades,
  getAcademicProgress,
  changePassword
} from '../controllers/student.controller.js';

const router = express.Router();

// Apply authentication and student role to all routes
router.use(protect);
router.use(authorize('student'));

/**
 * @swagger
 * tags:
 *   - name: Student Dashboard
 *     description: Endpoints for student dashboard
 */

/**
 * @swagger
 * /dashboard:
 *   get:
 *     summary: Get student dashboard data
 *     tags: [Student Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Returns student dashboard data
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
 *                     profile:
 *                       $ref: '#/components/schemas/StudentProfile'
 *                     recentGrades:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Grade'
 *                     upcomingAssignments:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Assignment'
 *                     attendanceSummary:
 *                       $ref: '#/components/schemas/AttendanceSummary'
 *                     announcements:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Announcement'
 *                     stats:
 *                       $ref: '#/components/schemas/StudentStats'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         description: Forbidden - Student access required
 *       500:
 *         description: Internal server error
 */
router.get('/dashboard', getStudentDashboard);

// Profile
router.route('/profile')
  .get(getStudentProfile)
  .put([
    body('firstName').optional().trim().notEmpty(),
    body('lastName').optional().trim().notEmpty(),
    body('email').optional().isEmail().normalizeEmail(),
    body('phone').optional().trim(),
    body('address').optional().trim(),
  ], updateStudentProfile);

// Subjects
router.get('/subjects', getStudentSubjects);

// Grades
router.get('/grades', getStudentGrades);
router.get('/grades/recent', getRecentGrades);

// Progress
router.get('/progress', getAcademicProgress);

// Password change
router.put('/change-password', [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters long')
], changePassword);

export default router;
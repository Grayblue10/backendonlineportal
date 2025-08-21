import express from 'express';
import { body, param } from 'express-validator';
import { register, login, getMe, changePassword, forgotPassword, resetPassword, verifyResetToken, updateUser, refreshToken } from '../controllers/auth.controller.js';
import { getAllUsers, deleteUser } from '../controllers/admin.controller.js';
import { protect, authorize } from '../middlewares/auth.middleware.js';
import { sanitizeInput, validateLoginInput, validateRegisterInput } from '../middlewares/sanitize.js';
import { ADMIN_PERMISSIONS } from '../models/Admin.model.js';

const router = express.Router();

// Input validation with sanitization
const loginValidation = [
  validateLoginInput,
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty().trim()
];

const registerValidation = [
  validateRegisterInput,
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }).trim(),
  body('firstName').trim().notEmpty().escape(),
  body('lastName').trim().notEmpty().escape(),
  body('role').optional().isIn(['admin', 'teacher', 'student']).trim().escape()
];

const updatePasswordValidation = [
  body('currentPassword').notEmpty().trim(),
  body('newPassword').isLength({ min: 6 }).trim()
];

const resetPasswordValidation = [
  param('token').notEmpty().trim(),
  body('password').isLength({ min: 6 }).trim()
];

// Public routes
router.post('/register', registerValidation, register);
router.post('/login', loginValidation, login);
router.post('/refresh', refreshToken);
router.post('/forgot-password', [
  body('email').isEmail().normalizeEmail()
], forgotPassword);
router.get('/reset-password/:token', [
  param('token').notEmpty().trim()
], verifyResetToken);
router.post('/reset-password/:token', resetPasswordValidation, resetPassword);

// Logout route (should be accessible without authentication)
router.post('/logout', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Logged out successfully'
  });
});

// User profile routes (accessible by all authenticated users)
router.get('/me', protect, getMe);
router.put('/password', protect, updatePasswordValidation, changePassword);

// Admin-only routes
router.use(protect);
router.use(authorize('admin'));

// User management routes (admin only)
router.get('/users', 
  authorize('admin'),
  getAllUsers
);

router.route('/users/:id')
  .put(
    authorize('admin'),
    [
      body('email').optional().isEmail().normalizeEmail(),
      body('firstName').optional().trim().escape(),
      body('lastName').optional().trim().escape(),
      body('role').optional().isIn(['admin', 'teacher', 'student']).trim().escape(),
      body('isActive').optional().isBoolean()
    ],
    updateUser
  )
  .delete(
    authorize('admin'),
    deleteUser
  );

export default router;
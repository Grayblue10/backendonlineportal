import express from 'express';
import { protect, authorize } from '../middlewares/auth.middleware.js';

const router = express.Router();

// Test endpoint to verify auth works
router.get('/test-auth', protect, (req, res) => {
  res.json({ 
    success: true, 
    message: 'Grade authentication working',
    user: { id: req.user.id, role: req.user.role }
  });
});

// Apply auth to all routes
router.use(protect);

router.get('/my-grades', (req, res) => {
  res.json({ 
    success: true, 
    message: 'User grades',
    user: { id: req.user.id, role: req.user.role }
  });
});

export default router;
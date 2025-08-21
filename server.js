import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import helmet from 'helmet';
import mongoSanitize from 'express-mongo-sanitize';
import xssClean from 'xss-clean';
import rateLimit from 'express-rate-limit';

console.log('🚀 Starting server...');

// ES modules fix for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
// 1) Load from process environment (Render provides env vars)
dotenv.config();
// 2) Also attempt to load a local .env file next to server.js for local dev
dotenv.config({ path: path.resolve(__dirname, '.env') });
console.log('📄 Environment variables loaded');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 5000;
console.log('⚡ Express app initialized');

// Basic middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
// CORS: allow origins from env (comma-separated), default to local dev
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow server-to-server or same-origin requests with no Origin header
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error(`Not allowed by CORS: ${origin}`));
    },
    credentials: true,
    optionsSuccessStatus: 204,
  })
);
// Trust proxy for rate limiting and correct client IP on Render
app.set('trust proxy', 1);

// Security middleware
app.use(helmet());
app.use(mongoSanitize());
app.use(xssClean());

// Rate limiting (per IP)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // max requests per window per IP
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', limiter);
console.log('🔧 Middleware configured');

// Test route
app.get('/api/test', (req, res) => {
  res.json({ message: 'API is working!' });
});


console.log('🛣️ Test route configured');

// Import and use routes
try {
  console.log('📦 Loading routes...');
  const authRoutes = await import('./routes/auth.routes.js');
  const studentRoutes = await import('./routes/student.routes.js');
  const teacherRoutes = await import('./routes/teacher.routes.js');
  const adminRoutes = await import('./routes/admin.routes.js');
  const gradeRoutes = await import('./routes/grade.routes.js');
  
  app.use('/api/auth', authRoutes.default);
  app.use('/api/student', studentRoutes.default);
  app.use('/api/teacher', teacherRoutes.default);
  app.use('/api/admin', adminRoutes.default);
  app.use('/api/grades', gradeRoutes.default);
  
  console.log('✅ All routes loaded successfully');
  console.log('📍 Registered routes:');
  console.log('   - /api/auth/*');
  console.log('   - /api/student/*');
  console.log('   - /api/teacher/*');
  console.log('   - /api/admin/*');
  console.log('   - /api/grades/*');
} catch (error) {
  console.error('❌ Error loading routes:', error);
  process.exit(1);
}

// MongoDB connection
async function connectToDB() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB connected successfully!');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    console.log('⚠️ Continuing without MongoDB connection');
  }
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  
  res.status(statusCode).json({
    success: false,
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Start server
async function startServer() {
  try {
    console.log('🔗 Connecting to database...');
    await connectToDB();
    
    console.log('🚀 Starting HTTP server...');
    const server = app.listen(PORT, () => {
      console.log(`\n✅ Server running on port ${PORT}`);
      console.log(`🌐 Backend URL: http://localhost:${PORT}`);
      console.log(`🎯 Test URL: http://localhost:${PORT}/api/test\n`);
    });

    server.on('error', (error) => {
      console.error('❌ Server error:', error);
      process.exit(1);
    });

    return server;
  } catch (error) {
    console.error('❌ Server startup failed:', error);
    process.exit(1);
  }
}

// Error handlers
process.on('uncaughtException', (error) => {
  console.error('⚠️ Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('⚠️ Unhandled Rejection:', reason);
  process.exit(1);
});

console.log('🎬 Initializing server startup...');
startServer().catch(err => {
  console.error('💥 Fatal startup error:', err);
  process.exit(1);
});

console.log('📋 Server initialization script completed');
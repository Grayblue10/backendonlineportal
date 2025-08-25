import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const studentSchema = new mongoose.Schema({
  // Basic Information
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Please use a valid email address']
  },
  password: {
    type: String,
    required: true,
    minlength: [6, 'Password must be at least 6 characters long'],
    select: false
  },
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true
  },
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true
  },
  
  // Academic Information
  studentId: {
    type: String,
    unique: true,
    index: true
  },
  yearLevel: {
    type: Number,
    enum: [1, 2, 3, 4],
    default: 1
  },
  // Assigned Program/Course Information
  program: {
    code: { type: String, trim: true, uppercase: true },
    semester: { type: String, enum: ['first', 'second'] },
    academicYear: { type: Number }, // e.g., 2025
    assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
    assignedAt: { type: Date }
  },
  
  // Role and Status
  role: {
    type: String,
    default: 'student',
    enum: ['student'],
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  
  // System Fields
  lastLogin: {
    type: Date
  },
  enrolledDate: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: function(doc, ret) {
      delete ret.password;
      delete ret.__v;
      return ret;
    }
  },
  toObject: { virtuals: true }
});

// Virtual for fullName
studentSchema.virtual('fullName').get(function() {
  const fn = (this.firstName || '').trim();
  const ln = (this.lastName || '').trim();
  return `${fn} ${ln}`.trim();
});

// Generate student ID before saving
studentSchema.pre('save', async function(next) {
  // Generate student ID if it doesn't exist
  if (!this.studentId) {
    try {
      this.studentId = await generateStudentId();
    } catch (error) {
      return next(error);
    }
  }
  next();
});

// Hash password before saving (only if not already hashed)
studentSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  // Check if password is already hashed (bcrypt hashes start with $2a$, $2b$, or $2y$)
  if (this.password && this.password.match(/^\$2[aby]\$/)) {
    return next();
  }
  
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Function to generate student ID with format YY-XXXXXX
async function generateStudentId() {
  const currentYear = new Date().getFullYear();
  const yearSuffix = currentYear.toString().slice(-2); // Get last 2 digits of year
  
  // Find the highest student ID for the current year
  const lastStudent = await mongoose.model('Student').findOne({
    studentId: new RegExp(`^${yearSuffix}-`)
  }).sort({ studentId: -1 });
  
  let nextNumber = 100001; // Start from 100001 to ensure 6 digits
  
  if (lastStudent && lastStudent.studentId) {
    const lastNumber = parseInt(lastStudent.studentId.split('-')[1]);
    if (!isNaN(lastNumber)) {
      nextNumber = lastNumber + 1;
    }
  }
  
  // Format: YY-XXXXXX (e.g., 25-100001, 25-100002, etc.)
  return `${yearSuffix}-${nextNumber.toString().padStart(6, '0')}`;
}

// Method to compare password
studentSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const Student = mongoose.model('Student', studentSchema);

export default Student;
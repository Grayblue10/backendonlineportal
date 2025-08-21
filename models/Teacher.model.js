import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const teacherSchema = new mongoose.Schema({
  // Authentication
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
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters long'],
    select: false
  },
  
  // Personal Information
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
  
  // Professional Information
  employeeId: {
    type: String,
    unique: true,
    index: true
  },
  
  // Role and Status
  role: {
    type: String,
    default: 'teacher',
    enum: ['teacher'],
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      delete ret.password;
      delete ret.__v;
      return ret;
    },
    virtuals: true
  },
  toObject: { virtuals: true }
});

// Virtual for fullName
teacherSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`.trim();
});

// Generate employee ID before saving
teacherSchema.pre('save', async function(next) {
  // Generate employee ID if it doesn't exist
  if (!this.employeeId) {
    try {
      this.employeeId = await generateEmployeeId();
    } catch (error) {
      return next(error);
    }
  }
  next();
});

// Hash password before saving (only if not already hashed)
teacherSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  // Check if password is already hashed (bcrypt hashes start with $2a$, $2b$, or $2y$)
  if (this.password && this.password.match(/^\$2[aby]\$/)) {
    return next();
  }
  
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Function to generate employee ID with format EMP-YY-XXXXX
async function generateEmployeeId() {
  const currentYear = new Date().getFullYear();
  const yearSuffix = currentYear.toString().slice(-2); // Get last 2 digits of year
  
  // Find the highest employee ID for the current year
  const lastTeacher = await mongoose.model('Teacher').findOne({
    employeeId: new RegExp(`^EMP-${yearSuffix}-`)
  }).sort({ employeeId: -1 });
  
  let nextNumber = 10001; // Start from 10001 to ensure 5 digits
  
  if (lastTeacher && lastTeacher.employeeId) {
    const lastNumber = parseInt(lastTeacher.employeeId.split('-')[2]);
    if (!isNaN(lastNumber)) {
      nextNumber = lastNumber + 1;
    }
  }
  
  // Format: EMP-YY-XXXXX (e.g., EMP-25-10001, EMP-25-10002, etc.)
  return `EMP-${yearSuffix}-${nextNumber.toString().padStart(5, '0')}`;
}

// Method to compare password
teacherSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const Teacher = mongoose.model('Teacher', teacherSchema);

export default Teacher;
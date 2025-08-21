import mongoose from 'mongoose';
import { ROLES } from '../constants/roles.js';

const classSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please add a class name'],
      trim: true,
      maxlength: [100, 'Name cannot be more than 100 characters']
    },
    code: {
      type: String,
      required: [true, 'Please add a class code'],
      unique: true,
      trim: true,
      maxlength: [20, 'Code cannot be more than 20 characters']
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot be more than 500 characters']
    },
    subject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subject',
      required: [true, 'Please add a subject']
    },
    teacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Teacher',
      required: false
    },
    students: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student'
    }],
    academicYear: {
      type: String,
      required: [true, 'Please specify academic year'],
      match: [/^\d{4}-\d{4}$/, 'Please use format YYYY-YYYY for academic year']
    },
    term: {
      type: String,
      required: [true, 'Please specify term'],
      enum: {
        values: ['Fall', 'Spring', 'Summer', 'Winter'],
        message: 'Term must be Fall, Spring, Summer, or Winter'
      }
    },
    schedule: {
      days: [{
        type: String,
        enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
      }],
      startTime: String,
      endTime: String,
      room: String
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'completed', 'cancelled'],
      default: 'active'
    },
    capacity: {
      type: Number,
      min: [1, 'Capacity must be at least 1'],
      max: [100, 'Capacity cannot exceed 100']
    },
    credits: {
      type: Number,
      min: 0.5,
      max: 12,
      default: 3
    },
    gradeScale: {
      type: Map,
      of: Number,
      default: {
        A: 90,
        'B+': 85,
        B: 80,
        'C+': 75,
        C: 70,
        'D+': 65,
        D: 60,
        F: 0
      }
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes for frequently queried fields
classSchema.index({ code: 1, academicYear: 1 }, { unique: true });
classSchema.index({ teacher: 1, status: 1 });
classSchema.index({ subject: 1, academicYear: 1 });

// Virtual for student count
classSchema.virtual('studentCount').get(function() {
  return this.students ? this.students.length : 0;
});

// Check if class is full
classSchema.virtual('isFull').get(function() {
  return this.students && this.capacity 
    ? this.students.length >= this.capacity 
    : false;
});

// Validate teacher exists and is active
classSchema.pre('save', async function(next) {
  try {
    // Skip validation if teacher is not set (for classes created without teacher initially)
    if (!this.teacher) {
      return next();
    }
    
    const Teacher = mongoose.model('Teacher');
    const teacher = await Teacher.findOne({ 
      _id: this.teacher, 
      isActive: true  // Use isActive instead of status
    });
    
    if (!teacher) {
      throw new Error('Teacher not found or inactive');
    }
    next();
  } catch (error) {
    next(error);
  }
});

// Prevent removing class if it has students enrolled
classSchema.pre('remove', async function(next) {
  if (this.students && this.students.length > 0) {
    next(new Error('Cannot delete class with enrolled students'));
  } else {
    next();
  }
});

// Static method to get classes by student
classSchema.statics.findByStudent = async function(studentId) {
  return this.find({ students: studentId })
    .populate('subject', 'name code')
    .populate('teacher', 'firstName lastName')
    .sort({ academicYear: -1, term: 1 });
};

// Static method to get classes by teacher
classSchema.statics.findByTeacher = async function(teacherId, status = 'active') {
  const query = { teacher: teacherId };
  if (status) {
    query.status = status;
  }
  return this.find(query)
    .populate('subject', 'name code')
    .populate('students', 'firstName lastName')
    .sort({ academicYear: -1, term: 1 });
};

const Class = mongoose.model('Class', classSchema);

export default Class;

import mongoose from 'mongoose';
import { ATTENDANCE_STATUS } from '../constants/attendance.constants.js';

const attendanceSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: [true, 'Student is required'],
    index: true
  },
  class: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class',
    required: [true, 'Class is required'],
    index: true
  },
  date: {
    type: Date,
    required: [true, 'Date is required'],
    default: Date.now,
    index: true
  },
  status: {
    type: String,
    enum: Object.values(ATTENDANCE_STATUS),
    default: ATTENDANCE_STATUS.PRESENT,
    required: [true, 'Status is required']
  },
  markedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Marked by user is required']
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [500, 'Notes cannot be more than 500 characters']
  },
  isExcused: {
    type: Boolean,
    default: false
  },
  excuseNotes: {
    type: String,
    trim: true,
    maxlength: [500, 'Excuse notes cannot be more than 500 characters']
  },
  session: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Session',
    index: true
  },
  subject: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subject',
    index: true
  },
  period: {
    type: String,
    trim: true
  },
  lateMinutes: {
    type: Number,
    min: 0,
    default: 0
  },
  deviceInfo: {
    ipAddress: String,
    userAgent: String,
    location: {
      type: {
        type: String,
        default: 'Point',
        enum: ['Point']
      },
      coordinates: [Number],
      address: String
    }
  },
  syncStatus: {
    type: String,
    enum: ['pending', 'synced', 'failed'],
    default: 'synced'
  },
  lastSyncedAt: Date,
  syncError: String
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Compound index to prevent duplicate attendance records
attendanceSchema.index(
  { student: 1, class: 1, date: 1 },
  { unique: true, name: 'unique_attendance' }
);

// Index for date range queries
attendanceSchema.index({ date: 1, class: 1 });

// Virtual for formatted date (YYYY-MM-DD)
attendanceSchema.virtual('dateFormatted').get(function() {
  return this.date.toISOString().split('T')[0];
});

// Method to check if attendance can be edited
attendanceSchema.methods.canEdit = function(user) {
  // Admin can always edit
  if (user.role === 'admin') return true;
  
  // Teacher can edit if they marked the attendance or it's from their class
  if (user.role === 'teacher') {
    return (
      this.markedBy.equals(user._id) || 
      this.class.teacher.equals(user._id)
    );
  }
  
  return false;
};

// Static method to get attendance summary for a student
attendanceSchema.statics.getStudentSummary = async function(studentId, classId) {
  const result = await this.aggregate([
    {
      $match: {
        student: mongoose.Types.ObjectId(studentId),
        class: mongoose.Types.ObjectId(classId)
      }
    },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);

  return result.reduce((acc, { _id, count }) => ({
    ...acc,
    [_id]: count
  }), {});
};

// Pre-save hook to update lastSyncedAt
attendanceSchema.pre('save', function(next) {
  this.lastSyncedAt = new Date();
  next();
});

// Pre-remove hook to handle related data
attendanceSchema.pre('remove', async function(next) {
  // Add any related data cleanup here
  next();
});

const Attendance = mongoose.model('Attendance', attendanceSchema);

export default Attendance;

import mongoose from 'mongoose';

const assignmentSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Please add a title'],
      trim: true,
      maxlength: [100, 'Title cannot be more than 100 characters']
    },
    description: {
      type: String,
      required: [true, 'Please add a description'],
      trim: true
    },
    class: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Class',
      required: [true, 'Please specify a class']
    },
    subject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subject',
      required: [true, 'Please specify a subject']
    },
    teacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Teacher',
      required: [true, 'Please specify a teacher']
    },
    dueDate: {
      type: Date,
      required: [true, 'Please add a due date']
    },
    totalPoints: {
      type: Number,
      required: [true, 'Please add total points'],
      min: [1, 'Points must be at least 1'],
      default: 100
    },
    assignmentType: {
      type: String,
      required: [true, 'Please specify assignment type'],
      enum: {
        values: ['homework', 'quiz', 'test', 'project', 'essay', 'presentation', 'other'],
        message: 'Please select a valid assignment type'
      }
    },
    attachments: [
      {
        fileName: String,
        filePath: String,
        fileType: String,
        fileSize: String
      }
    ],
    instructions: {
      type: String,
      trim: true
    },
    resources: [
      {
        title: String,
        url: String,
        type: {
          type: String,
          enum: ['link', 'document', 'video', 'other']
        }
      }
    ],
    status: {
      type: String,
      enum: ['draft', 'published', 'graded', 'archived'],
      default: 'draft'
    },
    allowLateSubmissions: {
      type: Boolean,
      default: false
    },
    latePenalty: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    submissionType: {
      type: String,
      enum: ['online', 'offline', 'both'],
      default: 'online'
    },
    submissions: [
      {
        student: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Student'
        },
        submittedAt: {
          type: Date,
          default: Date.now
        },
        file: {
          fileName: String,
          filePath: String,
          fileType: String,
          fileSize: String
        },
        textSubmission: String,
        grade: {
          score: Number,
          feedback: String,
          gradedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
          },
          gradedAt: Date
        },
        isLate: {
          type: Boolean,
          default: false
        }
      }
    ],
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
assignmentSchema.index({ class: 1, dueDate: 1 });
assignmentSchema.index({ teacher: 1, status: 1 });
assignmentSchema.index({ subject: 1, status: 1 });

// Virtual for submission count
assignmentSchema.virtual('submissionCount').get(function() {
  return this.submissions ? this.submissions.length : 0;
});

// Virtual for average score
assignmentSchema.virtual('averageScore').get(function() {
  if (!this.submissions || this.submissions.length === 0) return 0;
  
  const gradedSubmissions = this.submissions.filter(
    sub => sub.grade && typeof sub.grade.score === 'number'
  );
  
  if (gradedSubmissions.length === 0) return 0;
  
  const total = gradedSubmissions.reduce(
    (sum, sub) => sum + sub.grade.score, 0
  );
  
  return (total / gradedSubmissions.length).toFixed(2);
});

// Check if assignment is past due
assignmentSchema.virtual('isPastDue').get(function() {
  return this.dueDate && this.dueDate < new Date();
});

// Pre-save hook to validate dates
assignmentSchema.pre('save', function(next) {
  if (this.dueDate && this.dueDate < new Date()) {
    this.status = 'graded';
  }
  next();
});

// Static method to get assignments by student
assignmentSchema.statics.findByStudent = async function(studentId, options = {}) {
  const { class: classId, status, submitted } = options;
  
  const query = {};
  
  if (classId) {
    query.class = classId;
  }
  
  if (status) {
    query.status = status;
  }
  
  if (typeof submitted === 'boolean') {
    if (submitted) {
      query['submissions.student'] = studentId;
    } else {
      query['submissions.student'] = { $ne: studentId };
    }
  }
  
  return this.find(query)
    .populate('class', 'name')
    .populate('subject', 'name code')
    .populate('teacher', 'firstName lastName')
    .sort({ dueDate: 1 });
};

// Static method to get assignments by teacher
assignmentSchema.statics.findByTeacher = async function(teacherId, options = {}) {
  const { class: classId, status } = options;
  
  const query = { teacher: teacherId };
  
  if (classId) {
    query.class = classId;
  }
  
  if (status) {
    query.status = status;
  }
  
  return this.find(query)
    .populate('class', 'name')
    .populate('subject', 'name code')
    .sort({ dueDate: -1 });
};

const Assignment = mongoose.model('Assignment', assignmentSchema);

export default Assignment;

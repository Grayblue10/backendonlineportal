import mongoose from 'mongoose';

const gradeSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  teacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Teacher',
    required: true
  },
  // Class reference for which this grade entry belongs
  class: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class'
  },
  subject: {
    name: {
      type: String,
      required: true
    },
    code: {
      type: String,
      required: true
    }
  },
  // Simple assessment fields used by create/update grade endpoints
  assessmentType: {
    type: String,
    enum: ['quiz', 'assignment', 'midterm', 'final', 'project'],
    default: 'quiz'
  },
  title: String,
  maxScore: Number,
  score: Number,
  className: String,
  gradedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  notes: String,
  assessments: [{
    type: {
      type: String,
      enum: ['quiz', 'assignment', 'midterm', 'final', 'project'],
      required: true
    },
    title: {
      type: String,
      required: true
    },
    maxScore: {
      type: Number,
      required: true
    },
    score: {
      type: Number,
      required: true
    },
    date: {
      type: Date,
      default: Date.now
    },
    comments: String
  }],
  finalGrade: {
    percentage: Number,
    letterGrade: {
      type: String,
      enum: ['A+', 'A', 'B+', 'B', 'C+', 'C', 'D+', 'D', 'F']
    },
    gpa: Number
  },
  semester: {
    type: String,
    required: true
  },
  academicYear: {
    type: String,
    required: true
  },
  isFinalized: {
    type: Boolean,
    default: false
  },
  finalizedAt: Date,
  finalizedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Calculate final grade before saving
gradeSchema.pre('save', function(next) {
  if (this.assessments && this.assessments.length > 0) {
    let totalScore = 0;
    let totalMax = 0;
    
    this.assessments.forEach(assessment => {
      totalScore += assessment.score;
      totalMax += assessment.maxScore;
    });
    
    const percentage = Math.round((totalScore / totalMax) * 100);
    this.finalGrade.percentage = percentage;
    
    // Calculate letter grade
    if (percentage >= 97) this.finalGrade.letterGrade = 'A+';
    else if (percentage >= 93) this.finalGrade.letterGrade = 'A';
    else if (percentage >= 90) this.finalGrade.letterGrade = 'B+';
    else if (percentage >= 87) this.finalGrade.letterGrade = 'B';
    else if (percentage >= 83) this.finalGrade.letterGrade = 'C+';
    else if (percentage >= 80) this.finalGrade.letterGrade = 'C';
    else if (percentage >= 77) this.finalGrade.letterGrade = 'D+';
    else if (percentage >= 70) this.finalGrade.letterGrade = 'D';
    else this.finalGrade.letterGrade = 'F';
    
    // Calculate GPA
    const gradePoints = {
      'A+': 4.0, 'A': 4.0, 'B+': 3.3, 'B': 3.0,
      'C+': 2.3, 'C': 2.0, 'D+': 1.3, 'D': 1.0, 'F': 0.0
    };
    this.finalGrade.gpa = gradePoints[this.finalGrade.letterGrade];
  }
  next();
});

const Grade = mongoose.model('Grade', gradeSchema);

export default Grade;
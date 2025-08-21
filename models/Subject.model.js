import mongoose from 'mongoose';

const subjectSchema = new mongoose.Schema({
  // Subject name (e.g., "Mathematics", "Science")
  name: {
    type: String,
    required: [true, 'Subject name is required'],
    trim: true,
    maxlength: [100, 'Subject name cannot exceed 100 characters']
  },
  
  // Subject code (e.g., "MATH101")
  code: {
    type: String,
    required: [true, 'Subject code is required'],
    trim: true,
    uppercase: true,
    unique: true,
    maxlength: [20, 'Subject code cannot exceed 20 characters']
  },
  
  // Number of units for the subject
  units: {
    type: Number,
    required: [true, 'Number of units is required'],
    min: [0.5, 'Minimum 0.5 units'],
    max: [10, 'Maximum 10 units']
  },
  
  // Subject description
  description: {
    type: String,
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  
  // Semester availability
  semester: {
    type: String,
    enum: ['first', 'second', 'both'],
    default: 'first',
    required: [true, 'Semester is required']
  },
  
  // Optional: Department the subject belongs to
  department: {
    type: String,
    trim: true
  },
  
  // Status to indicate if the subject is active
  isActive: {
    type: Boolean,
    default: true
  },
  
  // Prerequisites (array of subject IDs)
  prerequisites: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subject'
  }],
  
  // Optional: Reference to the teacher(s) who can teach this subject
  teachers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Teacher'
  }]
}, {
  timestamps: true,
  toJSON: { 
    virtuals: true,
    transform: function(doc, ret) {
      delete ret.__v;
      return ret;
    }
  },
  toObject: { virtuals: true }
});

// Create a compound index for better query performance
subjectSchema.index({ name: 1, code: 1 }, { unique: true });

// Virtual for getting the full subject name with code
subjectSchema.virtual('fullName').get(function() {
  return `${this.code} - ${this.name}`;
});

const Subject = mongoose.model('Subject', subjectSchema);

export default Subject;

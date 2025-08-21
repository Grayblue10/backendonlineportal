import mongoose from 'mongoose';
import { ANNOUNCEMENT_TYPES, ANNOUNCEMENT_TARGETS } from '../constants/announcement.constants.js';

const announcementSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    maxlength: [200, 'Title cannot be more than 200 characters']
  },
  content: {
    type: String,
    required: [true, 'Content is required'],
    trim: true
  },
  type: {
    type: String,
    enum: Object.values(ANNOUNCEMENT_TYPES),
    default: ANNOUNCEMENT_TYPES.GENERAL,
    required: true
  },
  target: {
    type: String,
    enum: Object.values(ANNOUNCEMENT_TARGETS),
    default: ANNOUNCEMENT_TARGETS.ALL,
    required: true
  },
  targetIds: [{
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'targetModel'
  }],
  targetModel: {
    type: String,
    enum: ['Class', 'Student', 'Teacher'],
    required: function() {
      return this.target === ANNOUNCEMENT_TARGETS.SPECIFIC;
    }
  },
  isPinned: {
    type: Boolean,
    default: false
  },
  startDate: {
    type: Date,
    default: Date.now
  },
  endDate: {
    type: Date,
    validate: {
      validator: function(value) {
        return !this.startDate || value > this.startDate;
      },
      message: 'End date must be after start date'
    }
  },
  attachments: [{
    name: String,
    url: String,
    size: Number,
    mimeType: String
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  status: {
    type: String,
    enum: ['draft', 'published', 'archived'],
    default: 'published'
  },
  priority: {
    type: Number,
    min: 1,
    max: 5,
    default: 3
  },
  metadata: {
    views: {
      type: Number,
      default: 0
    },
    lastViewedAt: Date,
    lastViewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
announcementSchema.index({ createdAt: -1 });
announcementSchema.index({ isPinned: 1, createdAt: -1 });
announcementSchema.index({ target: 1, targetIds: 1 });
announcementSchema.index({ status: 1, endDate: 1 });

// Virtual for checking if announcement is active
announcementSchema.virtual('isActive').get(function() {
  const now = new Date();
  return (
    this.status === 'published' &&
    (!this.startDate || this.startDate <= now) &&
    (!this.endDate || this.endDate >= now)
  );
});

// Pre-save hook to handle targetIds
announcementSchema.pre('save', function(next) {
  // If target is not specific, clear targetIds and targetModel
  if (this.target !== ANNOUNCEMENT_TARGETS.SPECIFIC) {
    this.targetIds = undefined;
    this.targetModel = undefined;
  }
  next();
});

// Static method to get active announcements for a user
announcementSchema.statics.getActiveAnnouncements = async function(userId, userRole, classIds = []) {
  const now = new Date();
  
  const query = {
    status: 'published',
    $or: [
      { target: 'all' },
      { target: userRole + 's' },
      {
        target: 'specific',
        targetIds: { $in: classIds },
        targetModel: 'Class'
      },
      {
        target: 'specific',
        targetIds: userId,
        targetModel: userRole === 'student' ? 'Student' : 'Teacher'
      }
    ],
    $and: [
      { $or: [{ startDate: { $exists: false } }, { startDate: { $lte: now } }] },
      { $or: [{ endDate: { $exists: false } }, { endDate: { $gte: now } }] }
    ]
  };

  return this.find(query)
    .sort({ isPinned: -1, createdAt: -1 })
    .populate('createdBy', 'firstName lastName avatar')
    .lean();
};

// Method to log a view
announcementSchema.methods.logView = async function(userId) {
  this.metadata.views += 1;
  this.metadata.lastViewedAt = new Date();
  this.metadata.lastViewedBy = userId;
  return this.save();
};

const Announcement = mongoose.model('Announcement', announcementSchema);

export default Announcement;

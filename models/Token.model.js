import mongoose from 'mongoose';
import crypto from 'crypto';

const tokenSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'userModel',
    required: [true, 'User ID is required']
  },
  userModel: {
    type: String,
    required: [true, 'User model type is required'],
    enum: ['Admin', 'Teacher', 'Student']
  },
  token: {
    type: String,
    required: [true, 'Token is required'],
    unique: true,
    index: true
  },
  type: {
    type: String,
    enum: ['password-reset', 'email-verification'],
    required: [true, 'Token type is required']
  },
  expiresAt: {
    type: Date,
    required: [true, 'Expiration date is required']
  },
  used: {
    type: Boolean,
    default: false
  },
  ipAddress: {
    type: String,
    required: [true, 'IP address is required']
  },
  userAgent: String
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Generate secure token
tokenSchema.methods.generateToken = function() {
  this.token = crypto.randomBytes(32).toString('hex');
  this.expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes
  return this.token;
};

// Check if token is valid
// Check if token is valid
tokenSchema.methods.isValid = function() {
  return !this.used && this.expiresAt > new Date();
};

// Mark token as used
tokenSchema.methods.markAsUsed = function() {
  this.used = true;
  return this.save();
};

// Static method to find valid token
tokenSchema.statics.findValidToken = async function(token, userId, type) {
  return this.findOne({
    token,
    user: userId,
    type,
    used: false,
    expiresAt: { $gt: new Date() }
  });
};

// Pre-save hook to hash token
tokenSchema.pre('save', function(next) {
  if (this.isModified('token')) {
    this.token = crypto.createHash('sha256').update(this.token).digest('hex');
  }
  next();
});

// Indexes
tokenSchema.index({ user: 1, type: 1 });
tokenSchema.index({ token: 1, type: 1 });

// Auto-delete expired tokens
tokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const Token = mongoose.model('Token', tokenSchema);

export default Token;
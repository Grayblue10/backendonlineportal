import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

// Define admin permission scopes
export const ADMIN_PERMISSIONS = {
  // User management
  MANAGE_USERS: 'manage_users',
  MANAGE_ROLES: 'manage_roles',
  
  // Academic management
  MANAGE_COURSES: 'manage_courses',
  MANAGE_SUBJECTS: 'manage_subjects',
  MANAGE_GRADES: 'manage_grades',
  
  // System settings
  MANAGE_SETTINGS: 'manage_settings',
  VIEW_AUDIT_LOGS: 'view_audit_logs',
  
  // Content management
  MANAGE_ANNOUNCEMENTS: 'manage_announcements',
  MANAGE_RESOURCES: 'manage_resources'
};

// Map legacy/alias permission keys to the canonical enum values
const PERMISSION_ALIASES = {
  // legacy or shorthand keys
  system_settings: ADMIN_PERMISSIONS.MANAGE_SETTINGS,
  settings: ADMIN_PERMISSIONS.MANAGE_SETTINGS,
  audit_logs: ADMIN_PERMISSIONS.VIEW_AUDIT_LOGS,
  users: ADMIN_PERMISSIONS.MANAGE_USERS,
  roles: ADMIN_PERMISSIONS.MANAGE_ROLES,
  courses: ADMIN_PERMISSIONS.MANAGE_COURSES,
  subjects: ADMIN_PERMISSIONS.MANAGE_SUBJECTS,
  grades: ADMIN_PERMISSIONS.MANAGE_GRADES,
  announcements: ADMIN_PERMISSIONS.MANAGE_ANNOUNCEMENTS,
  resources: ADMIN_PERMISSIONS.MANAGE_RESOURCES,
};

function normalizePermission(value) {
  if (!value) return value;
  const key = String(value).toLowerCase();
  // If already a valid enum, keep it
  if (Object.values(ADMIN_PERMISSIONS).includes(key)) return key;
  // Map alias -> canonical
  return PERMISSION_ALIASES[key] || value;
}

// Default admin permissions
const DEFAULT_ADMIN_PERMISSIONS = [
  ADMIN_PERMISSIONS.MANAGE_USERS,
  ADMIN_PERMISSIONS.MANAGE_COURSES,
  ADMIN_PERMISSIONS.MANAGE_GRADES,
  ADMIN_PERMISSIONS.MANAGE_SETTINGS
];

const adminSchema = new mongoose.Schema({
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
    minlength: [8, 'Password must be at least 8 characters long'],
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
  

  // Admin role type (super_admin, academic_admin, support_admin, etc.)
  roleType: {
    type: String,
    enum: ['super_admin', 'academic_admin', 'support_admin', 'custom'],
    default: 'academic_admin'
  },
  
  // Granular permissions
  permissions: [{
    type: String,
    enum: Object.values(ADMIN_PERMISSIONS),
    default: function() {
      // Set default permissions based on role type
      if (this.roleType === 'super_admin') {
        return Object.values(ADMIN_PERMISSIONS);
      }
      return DEFAULT_ADMIN_PERMISSIONS;
    }
  }],
  
  // Last login information
  lastLogin: {
    type: Date,
    default: null
  },
  
  // Account security
  passwordChangedAt: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  
  // Status
  isActive: {
    type: Boolean,
    default: true
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
adminSchema.virtual('fullName').get(function() {
  const fn = (this.firstName || '').trim();
  const ln = (this.lastName || '').trim();
  return `${fn} ${ln}`.trim();
});

// Hash password before saving (only if not already hashed)
adminSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  // Check if password is already hashed (bcrypt hashes start with $2a$, $2b$, or $2y$)
  if (this.password && this.password.match(/^\$2[aby]\$/)) {
    return next();
  }
  
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Normalize permissions before Mongoose runs enum validation
adminSchema.pre('validate', function(next) {
  try {
    if (Array.isArray(this.permissions)) {
      this.permissions = this.permissions
        .map(normalizePermission)
        .filter(Boolean);
    }
    next();
  } catch (err) {
    next(err);
  }
});

// Normalize permissions for update operations where validators run on updates
adminSchema.pre('findOneAndUpdate', function(next) {
  try {
    const update = this.getUpdate() || {};
    // Work with either $set.permissions or top-level permissions
    const target = update.$set || update;
    if (target && target.permissions) {
      const normalized = Array.isArray(target.permissions)
        ? target.permissions.map(normalizePermission).filter(Boolean)
        : target.permissions;
      if (update.$set) {
        update.$set.permissions = normalized;
      } else {
        update.permissions = normalized;
      }
      this.setUpdate(update);
    }
    next();
  } catch (err) {
    next(err);
  }
});

// Method to compare password
adminSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const Admin = mongoose.model('Admin', adminSchema);

export default Admin;
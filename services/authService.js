import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { ROLES } from '../constants/roles.js';
import Admin from '../models/Admin.model.js';
import Teacher from '../models/Teacher.model.js';
import Student from '../models/Student.model.js';
import Token from '../models/Token.model.js';
import ErrorResponse from '../utils/errorResponse.js';
import { sendPasswordResetEmail } from '../utils/emailService.js';

class AuthService {
  // User models mapping
  static userModels = {
    [ROLES.ADMIN]: Admin,
    [ROLES.TEACHER]: Teacher,
    [ROLES.STUDENT]: Student
  };

  // Generate JWT token
  static generateToken(userId, role) {
    return jwt.sign(
      { id: userId, role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );
  }

  // Find user by email across all models
  static async findUserByEmail(email) {
    console.log(`🔍 [AuthService] Searching for user with email: ${email}`);
    
    for (const [role, Model] of Object.entries(this.userModels)) {
      try {
        console.log(`🔍 [AuthService] Checking ${role} model for email: ${email}`);
        const user = await Model.findOne({ email }).select('+password');
        if (user) {
          console.log(`✅ [AuthService] Found user in ${role} model:`, {
            id: user._id,
            email: user.email,
            hasPassword: !!user.password,
            passwordLength: user.password ? user.password.length : 0,
            passwordStartsWith: user.password ? user.password.substring(0, 4) : 'none'
          });
          return { user, role };
        }
      } catch (error) {
        console.error(`❌ [AuthService] Error checking ${role} model:`, error);
      }
    }
    
    console.log(`❌ [AuthService] No user found with email: ${email}`);
    return null;
  }

  // Find user by ID and role
  static async findUserById(id, role) {
    const Model = this.userModels[role];
    if (!Model) return null;
    return await Model.findById(id);
  }

  // Register new user
  static async register({ email, password, firstName, lastName, role, ...additionalData }) {
    // Check if user already exists
    const existingUser = await this.findUserByEmail(email);
    if (existingUser) {
      throw new ErrorResponse('User already exists with this email', 400);
    }

    const Model = this.userModels[role];
    if (!Model) {
      throw new ErrorResponse('Invalid role specified', 400);
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user data
    const userData = {
      email,
      password: hashedPassword,
      firstName,
      lastName,
      ...additionalData
    };

    // Some schemas require fullName (Admin, Student). Derive if missing.
    if ((role === ROLES.ADMIN || role === ROLES.STUDENT) && !userData.fullName) {
      const fn = (firstName || '').trim();
      const ln = (lastName || '').trim();
      userData.fullName = `${fn} ${ln}`.trim();
    }

    // Create user
    const user = await Model.create(userData);
    
    // Generate token
    const token = this.generateToken(user._id, role);

    return {
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role
      },
      token
    };
  }

  // Login user
  static async login(email, password) {
    console.log(`🔐 [AuthService] Login attempt for email: ${email}`);
    console.log(`🔐 [AuthService] Password provided: ${password ? 'Yes' : 'No'}, Length: ${password ? password.length : 0}`);
    
    const result = await this.findUserByEmail(email);
    if (!result) {
      console.log(`❌ [AuthService] User not found for email: ${email}`);
      // Use 404 to indicate email does not exist
      throw new ErrorResponse('Account not found', 404);
    }

    const { user, role } = result;
    console.log(`✅ [AuthService] User found in ${role} model, comparing passwords...`);

    // Check password
    console.log(`🔐 [AuthService] Comparing password for user ${user.email}`);
    console.log(`🔐 [AuthService] Stored password hash: ${user.password ? user.password.substring(0, 10) + '...' : 'none'}`);
    console.log(`🔐 [AuthService] Input password: ${password}`);
    
    const isMatch = await bcrypt.compare(password, user.password);
    console.log(`🔐 [AuthService] Password match result: ${isMatch}`);
    
    if (!isMatch) {
      console.log(`❌ [AuthService] Password mismatch for user: ${email}`);
      // Use 401 to indicate incorrect password for existing account
      throw new ErrorResponse('Incorrect password', 401);
    }

    console.log(`✅ [AuthService] Password verified, generating token...`);
    // Generate token
    const token = this.generateToken(user._id, role);

    return {
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role
      },
      token
    };
  }

  // Verify JWT token
  static verifyToken(token) {
    try {
      return jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      throw new ErrorResponse('Invalid token', 401);
    }
  }

  // Change password
  static async changePassword(userId, role, currentPassword, newPassword) {
    const user = await this.findUserById(userId, role);
    if (!user) {
      throw new ErrorResponse('User not found', 404);
    }

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      throw new ErrorResponse('Current password is incorrect', 400);
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update password
    user.password = hashedPassword;
    await user.save();

    return { message: 'Password updated successfully' };
  }

  // Forgot password
  static async forgotPassword(email, ipAddress = 'unknown', userAgent = 'unknown') {
    const result = await this.findUserByEmail(email);
    if (!result) {
      throw new ErrorResponse('No user found with this email', 404);
    }

    const { user, role } = result;
    const modelName = user?.constructor?.modelName || (role ? role.charAt(0).toUpperCase() + role.slice(1) : 'User');

    // Generate reset token
    const resetToken = crypto.randomBytes(20).toString('hex');

    // Save token to database
    const tokenDoc = new Token({
      user: user._id,
      userModel: modelName, // 'Admin' | 'Teacher' | 'Student'
      token: resetToken, // raw; pre-save hook will hash it
      type: 'password-reset',
      expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 60 minutes
      ipAddress,
      userAgent
    });
    await tokenDoc.save();

    // Send email using emailService (builds URL internally)
    await sendPasswordResetEmail(user.email, resetToken, user._id.toString(), role);

    return { message: 'Password reset email sent' };
  }

  // Reset password
  static async resetPassword(token, newPassword) {
    const resetTokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // Find valid token
    const tokenDoc = await Token.findOne({
      token: resetTokenHash,
      type: 'password-reset',
      expiresAt: { $gt: Date.now() }
    });

    if (!tokenDoc) {
      throw new ErrorResponse('Invalid or expired reset token', 400);
    }

    // Find user
    const roleFromModel = (tokenDoc.userModel || '').toLowerCase(); // 'admin' | 'teacher' | 'student'
    const user = await this.findUserById(tokenDoc.user, roleFromModel);
    if (!user) {
      throw new ErrorResponse('User not found', 404);
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update password
    user.password = hashedPassword;
    await user.save();

    // Delete used token
    await Token.deleteOne({ _id: tokenDoc._id });

    return { message: 'Password reset successful' };
  }

  // Refresh token
  static async refreshToken(token) {
    const decoded = this.verifyToken(token);
    const user = await this.findUserById(decoded.id, decoded.role);
    
    if (!user) {
      throw new ErrorResponse('User not found', 404);
    }

    // Generate new token
    const newToken = this.generateToken(user._id, decoded.role);

    return {
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: decoded.role
      },
      token: newToken
    };
  }
}

export default AuthService;

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import AuthService from './services/authService.js';

// Load environment variables
dotenv.config();

async function testAuth() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Test user data
    const testUser = {
      email: 'test@example.com',
      password: 'password123',
      firstName: 'Test',
      lastName: 'User',
      role: 'student'
    };

    console.log('\n🔧 Testing Authentication System...\n');

    // Test 1: Register a new user
    try {
      console.log('1. Testing user registration...');
      const registerResult = await AuthService.register(testUser);
      console.log('✅ Registration successful:', {
        id: registerResult.user.id,
        email: registerResult.user.email,
        role: registerResult.user.role
      });
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('ℹ️  User already exists, skipping registration');
      } else {
        console.log('❌ Registration failed:', error.message);
        return;
      }
    }

    // Test 2: Login with correct credentials
    try {
      console.log('\n2. Testing login with correct credentials...');
      const loginResult = await AuthService.login(testUser.email, testUser.password);
      console.log('✅ Login successful:', {
        id: loginResult.user.id,
        email: loginResult.user.email,
        role: loginResult.user.role,
        tokenLength: loginResult.token.length
      });

      // Test 3: Verify token
      console.log('\n3. Testing token verification...');
      const decoded = AuthService.verifyToken(loginResult.token);
      console.log('✅ Token verification successful:', {
        id: decoded.id,
        role: decoded.role
      });

      // Test 4: Find user by ID
      console.log('\n4. Testing find user by ID...');
      const foundUser = await AuthService.findUserById(decoded.id, decoded.role);
      console.log('✅ User found by ID:', {
        id: foundUser._id,
        email: foundUser.email,
        firstName: foundUser.firstName,
        lastName: foundUser.lastName
      });

    } catch (error) {
      console.log('❌ Login failed:', error.message);
    }

    // Test 5: Login with wrong password
    try {
      console.log('\n5. Testing login with wrong password...');
      await AuthService.login(testUser.email, 'wrongpassword');
      console.log('❌ This should have failed!');
    } catch (error) {
      console.log('✅ Correctly rejected wrong password:', error.message);
    }

    console.log('\n🎉 Authentication tests completed!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('📤 Disconnected from MongoDB');
  }
}

testAuth();

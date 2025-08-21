import axios from 'axios';

const BASE_URL = 'http://localhost:5000/api';

async function testAuthentication() {
  console.log('🧪 Testing Authentication System...\n');

  try {
    // Test 1: Register a new user
    console.log('1. Testing Registration...');
    try {
      const registerResponse = await axios.post(`${BASE_URL}/auth/register`, {
        email: 'testuser@gmail.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
        role: 'student'
      });
      console.log('✅ Registration successful:', registerResponse.data.success);
    } catch (error) {
      if (error.response?.data?.message?.includes('already exists')) {
        console.log('✅ User already exists (expected)');
      } else {
        console.log('❌ Registration failed:', error.response?.data?.message || error.message);
      }
    }

    // Test 2: Login with correct credentials
    console.log('\n2. Testing Login with correct credentials...');
    try {
      const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
        email: 'cay@gmail.com',
        password: 'password123'
      });
      console.log('✅ Login successful:', loginResponse.data.success);
      console.log('Token received:', loginResponse.data.data?.token ? 'Yes' : 'No');
      
      const token = loginResponse.data.data?.token;
      
      // Test 3: Access protected route with token
      if (token) {
        console.log('\n3. Testing protected route access...');
        try {
          const meResponse = await axios.get(`${BASE_URL}/auth/me`, {
            headers: {
              Authorization: `Bearer ${token}`
            }
          });
          console.log('✅ Protected route access successful');
          console.log('User data:', meResponse.data.data);
        } catch (error) {
          console.log('❌ Protected route access failed:', error.response?.data?.message || error.message);
        }
      }
      
    } catch (error) {
      console.log('❌ Login failed:', error.response?.data?.message || error.message);
    }

    // Test 4: Login with incorrect credentials
    console.log('\n4. Testing Login with incorrect credentials...');
    try {
      await axios.post(`${BASE_URL}/auth/login`, {
        email: 'cay@gmail.com',
        password: 'wrongpassword'
      });
      console.log('❌ Should have failed but didn\'t');
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('✅ Correctly rejected invalid credentials');
      } else {
        console.log('❌ Unexpected error:', error.response?.data?.message || error.message);
      }
    }

  } catch (error) {
    console.log('❌ Test suite failed:', error.message);
  }
}

// Wait a bit for server to start, then run tests
setTimeout(testAuthentication, 2000);

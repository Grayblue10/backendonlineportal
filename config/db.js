import mongoose from 'mongoose';

// Enable Mongoose debug mode in development
if (process.env.NODE_ENV !== 'production') {
  mongoose.set('debug', (collectionName, method, query, doc) => {
    console.log(`Mongoose: ${collectionName}.${method}`, JSON.stringify(query));
  });
}

// Keep track of connection retries
let retryCount = 0;
const MAX_RETRIES = 5;
const RETRY_DELAY = 5000; // 5 seconds

// Handle connection events
mongoose.connection.on('connected', () => {
  console.log('✅ MongoDB connected successfully!');  
});

mongoose.connection.on('error', (err) => {
  console.error('❌ MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('ℹ️  MongoDB disconnected');
});

const connectDB = async () => {
  console.log('\n🔍 [DB] Starting database connection...');
  
  if (!process.env.MONGODB_URI) {
    const error = new Error('❌ MONGODB_URI is not defined in environment variables');
    console.error(error.message);
    throw error;
  }

  try {
    // Close any existing connections first
    if (mongoose.connection.readyState === 1) {
      console.log('ℹ️  Using existing database connection');
      return mongoose.connection;
    }
    
    console.log('🔌 Connecting to MongoDB with URI:', 
      process.env.MONGODB_URI.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@') // Hide password in logs
    );

    // Connection options
    const options = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 10000, // 10 seconds
      socketTimeoutMS: 45000, // 45 seconds
      connectTimeoutMS: 10000, // 10 seconds
      retryWrites: true,
      w: 'majority',
      maxPoolSize: 10,
      minPoolSize: 1,
      serverSelectionTimeoutMS: 10000,
      heartbeatFrequencyMS: 10000,
      socketTimeoutMS: 45000
    };

    console.log('🔄 Connecting to MongoDB...');
    console.log(`🔗 Connection string: ${process.env.MONGODB_URI.split('@')[1] || 'hidden'}`);
    
    // Connect to MongoDB with retry logic
    const connectWithRetry = async () => {
      try {
        const startTime = Date.now();
        await mongoose.connect(process.env.MONGODB_URI, options);
        const endTime = Date.now();
        
        console.log(`✅ MongoDB Connected in ${endTime - startTime}ms`);
        console.log(`   - Host: ${mongoose.connection.host}`);
        console.log(`   - Database: ${mongoose.connection.name}`);
        console.log(`   - Port: ${mongoose.connection.port}`);
        
        retryCount = 0; // Reset retry counter on successful connection
        return mongoose.connection;
      } catch (error) {
        retryCount++;
        console.error(`❌ MongoDB Connection Error (Attempt ${retryCount}/${MAX_RETRIES}):`, error.message);
        
        if (retryCount < MAX_RETRIES) {
          console.log(`⏳ Retrying connection in ${RETRY_DELAY/1000} seconds...`);
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
          return connectWithRetry();
        } else {
          throw new Error(`Failed to connect to MongoDB after ${MAX_RETRIES} attempts`);
        }
      }
    };
    
    const connection = await connectWithRetry();
    
    // Set up event listeners
    mongoose.connection.on('connected', () => {
      console.log('✅ MongoDB Connection: Connected');
    });

    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB Connection Error:', err.message);
      if (err.stack) console.error(err.stack);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('ℹ️  MongoDB Connection: Disconnected');
    });

    // Test the connection
    await mongoose.connection.db.admin().ping();
    console.log('🏓 MongoDB Ping: Success! Database is responsive.');
    
    return mongoose.connection;
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    
    // More detailed error handling
    if (error.name === 'MongooseServerSelectionError') {
      console.error('This is usually due to one of the following:');
      console.error('1. Incorrect MongoDB URI format');
      console.error('2. Network issues preventing connection to MongoDB');
      console.error('3. MongoDB server not running');
      console.error('4. Invalid MongoDB credentials');
    }
    
    // Exit with error
    process.exit(1);
  }
};

export default connectDB;

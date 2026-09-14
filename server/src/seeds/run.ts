import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { seedCategories } from './categories.seed.js';
import { seedDemo } from './demo.seed.js';

const run = async () => {
  try {
    console.log('[Seed Runner] Connecting to MongoDB at:', env.MONGODB_URI);
    await mongoose.connect(env.MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
    console.log('[Seed Runner] Connected successfully! Running seeds...');
    
    await seedCategories();
    await seedDemo();
    
    console.log('[Seed Runner] All seeds completed successfully!');
    await mongoose.disconnect();
    process.exit(0);
  } catch (err: any) {
    console.error('\n======================================================');
    console.error('⚠️  MONGODB CONNECTION NOTICE');
    console.error('======================================================');
    console.error('Could not connect to MongoDB at:', env.MONGODB_URI);
    console.error('\nTo fix this:');
    console.error('1. Open clearflow/server/.env file');
    console.error('2. Paste your MongoDB Atlas URI into MONGODB_URI=...');
    console.error('   (e.g., MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/clearflow)');
    console.error('3. Or start your local MongoDB service (mongod)');
    console.error('======================================================\n');
    process.exit(1);
  }
};

run();

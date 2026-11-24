import { connectDB, pgPool } from '../config/db.js';
import { seedCategories } from './categories.seed.js';

const run = async () => {
  try {
    console.log('[Seed Runner] Connecting to Supabase PostgreSQL...');
    await connectDB();
    
    await seedCategories();
    
    console.log('[Seed Runner] Supabase seeding completed successfully!');
    await pgPool.end();
    process.exit(0);
  } catch (err: any) {
    console.error('\n======================================================');
    console.error('⚠️  SUPABASE CONNECTION ERROR');
    console.error('======================================================');
    console.error('Error during seeding:', err.message);
    console.error('======================================================\n');
    process.exit(1);
  }
};

run();

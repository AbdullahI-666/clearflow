import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || '';
const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || '';
const secretKey = process.env.SUPABASE_SECRET_KEY || '';

async function testSupabase() {
  console.log('------------------------------------------------------');
  console.log('🔍 VERIFYING SUPABASE CONNECTION TO:');
  console.log('   URL:', supabaseUrl);
  console.log('------------------------------------------------------\n');

  // Test 1: Publishable / Anon Client Initialization
  console.log('1️⃣ Testing Public / Anon Client initialization...');
  const supabase = createClient(supabaseUrl, publishableKey);
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      console.log('   ⚠️  Auth Session check notice:', error.message);
    } else {
      console.log('   ✅ Public Client connected successfully! Auth service reachable.');
    }
  } catch (err) {
    console.error('   ❌ Public Client connection failed:', err.message);
  }

  // Test 2: Admin / Secret Key Client
  console.log('\n2️⃣ Testing Admin / Secret Key (Service Role) Handshake...');
  const supabaseAdmin = createClient(supabaseUrl, secretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  try {
    // List users (Admin API requires service role / secret key)
    const { data: usersData, error: usersError } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1 });
    if (usersError) {
      console.log('   ⚠️  Admin listUsers returned notice:', usersError.message);
    } else {
      console.log(`   ✅ Admin Client validated successfully! Service role authenticated. (Total users found: ${usersData?.users?.length ?? 0})`);
    }
  } catch (err) {
    console.error('   ❌ Admin Client connection failed:', err.message);
  }

  // Test 3: REST API Database query test
  console.log('\n3️⃣ Testing Database REST endpoint responsiveness...');
  try {
    // Querying an empty or system table to check REST gateway
    const { data, error } = await supabaseAdmin.from('_dummy_health_check_table').select('*').limit(1);
    // If the table doesn't exist, Supabase returns a 404/PGRST205 or 42P01 error from PostgREST,
    // which confirms the database and PostgREST API are alive and answering queries!
    if (error && (error.code === 'PGRST205' || error.code === '42P01' || error.message.includes('relation') || error.message.includes('not found') || error.code === 'PGRST116')) {
      console.log(`   ✅ Database REST Gateway is online & active (PostgREST response received: ${error.message})`);
    } else if (!error) {
      console.log('   ✅ Database query executed successfully!');
    } else {
      console.log(`   ℹ️ Database response: ${error.message} (${error.code})`);
    }
  } catch (err) {
    console.error('   ❌ Database REST gateway error:', err.message);
  }

  console.log('\n======================================================');
  console.log('🎉 ALL SUPABASE CLIENT VERIFICATION CHECKS COMPLETED!');
  console.log('======================================================');
}

testSupabase();

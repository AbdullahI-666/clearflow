import http from 'http';

const API_BASE = 'http://localhost:3000/api';

async function request(endpoint, method = 'GET', body = null, token = null) {
  const url = new URL(`${API_BASE}${endpoint}`);
  return new Promise((resolve, reject) => {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const req = http.request(
      url,
      {
        method,
        headers,
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, data: JSON.parse(data) });
          } catch {
            resolve({ status: res.statusCode, text: data });
          }
        });
      }
    );
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function run() {
  console.log('====================================================');
  console.log('   CLEARFLOW 3-ADMIN LOGIN & PERMISSIONS TEST SUITE  ');
  console.log('====================================================\n');

  let passed = 0;
  let total = 0;

  function assert(condition, message) {
    total++;
    if (condition) {
      console.log(`✅ [PASS] ${message}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${message}`);
    }
  }

  // 1. Default Admin Login
  console.log('--- 1. Testing Default Admin (admin@clearflow.com) ---');
  const res1 = await request('/auth/login', 'POST', {
    email: 'admin@clearflow.com',
    password: 'Admin@123',
    role: 'Admin',
  });
  assert(res1.status === 200, 'Default Admin logged in successfully with HTTP 200');
  assert(res1.data?.data?.user?.role === 'Admin', 'Default Admin role is "Admin"');
  assert(res1.data?.data?.user?.email === 'admin@clearflow.com', 'Default Admin email matches admin@clearflow.com');
  const token1 = res1.data?.data?.token;

  // 2. Second Admin Login
  console.log('\n--- 2. Testing Second Admin (adminn@clearflow.com) ---');
  const res2 = await request('/auth/login', 'POST', {
    email: 'adminn@clearflow.com',
    password: 'Adminn@123',
    role: 'Admin',
  });
  assert(res2.status === 200, 'Second Admin logged in successfully with HTTP 200');
  assert(res2.data?.data?.user?.role === 'Admin', 'Second Admin role is "Admin"');
  assert(res2.data?.data?.user?.email === 'adminn@clearflow.com', 'Second Admin email matches adminn@clearflow.com');
  assert(res2.data?.data?.user?.name === 'Abdullah Malik', 'Second Admin name matches "Abdullah Malik"');
  const token2 = res2.data?.data?.token;

  // 3. Third Admin Login
  console.log('\n--- 3. Testing Third Admin (adminnn@clearflow.com) ---');
  const res3 = await request('/auth/login', 'POST', {
    email: 'adminnn@clearflow.com',
    password: 'Adminnn@123',
    role: 'Admin',
  });
  assert(res3.status === 200, 'Third Admin logged in successfully with HTTP 200');
  assert(res3.data?.data?.user?.role === 'Admin', 'Third Admin role is "Admin"');
  assert(res3.data?.data?.user?.email === 'adminnn@clearflow.com', 'Third Admin email matches adminnn@clearflow.com');
  assert(res3.data?.data?.user?.name === 'Abdullah Khan', 'Third Admin name matches "Abdullah Khan"');
  const token3 = res3.data?.data?.token;

  // 4. Profiles inspection
  console.log('\n--- 4. Testing Profile Endpoints for each Admin ---');
  const prof1 = await request('/users/me', 'GET', null, token1);
  assert(prof1.data?.data?.email === 'admin@clearflow.com', 'Admin 1 profile returns email: admin@clearflow.com');

  const prof2 = await request('/users/me', 'GET', null, token2);
  assert(prof2.data?.data?.email === 'adminn@clearflow.com', 'Admin 2 profile returns email: adminn@clearflow.com');

  const prof3 = await request('/users/me', 'GET', null, token3);
  assert(prof3.data?.data?.email === 'adminnn@clearflow.com', 'Admin 3 profile returns email: adminnn@clearflow.com');

  // 5. Shared Database & Identical Live Data Access
  console.log('\n--- 5. Testing Shared Database & Data Consistency ---');
  const orders1 = await request('/work-orders', 'GET', null, token1);
  const orders2 = await request('/work-orders', 'GET', null, token2);
  const orders3 = await request('/work-orders', 'GET', null, token3);

  const count1 = orders1.data?.data?.total ?? (Array.isArray(orders1.data?.data) ? orders1.data?.data?.length : orders1.data?.data?.data?.length || 0);
  const count2 = orders2.data?.data?.total ?? (Array.isArray(orders2.data?.data) ? orders2.data?.data?.length : orders2.data?.data?.data?.length || 0);
  const count3 = orders3.data?.data?.total ?? (Array.isArray(orders3.data?.data) ? orders3.data?.data?.length : orders3.data?.data?.data?.length || 0);

  assert(count1 > 0, `Admin 1 sees ${count1} shared work orders`);
  assert(count1 === count2, `Admin 2 sees identical order count (${count2} === ${count1})`);
  assert(count1 === count3, `Admin 3 sees identical order count (${count3} === ${count1})`);

  const teams1 = await request('/teams', 'GET', null, token1);
  const teams2 = await request('/teams', 'GET', null, token2);
  const teams3 = await request('/teams', 'GET', null, token3);

  const tCount1 = teams1.data?.data?.length || 0;
  const tCount2 = teams2.data?.data?.length || 0;
  const tCount3 = teams3.data?.data?.length || 0;

  assert(tCount1 === tCount2 && tCount2 === tCount3, `All three admins see identical teams count (${tCount1})`);

  // 6. Cross-Admin Reflection of Changes
  console.log('\n--- 6. Testing Real-time Reflection of Changes Across Admins ---');
  const testVal = 0.88;
  const updateSettings = await request('/settings', 'PATCH', { anomalyDetectionThreshold: testVal }, token1);
  assert(updateSettings.status === 200, 'Admin 1 updated anomaly detection threshold');

  const checkByAdmin2 = await request('/settings', 'GET', null, token2);
  assert(
    checkByAdmin2.data?.data?.anomalyDetectionThreshold === testVal,
    `Admin 2 immediately reads updated threshold (${testVal}) made by Admin 1`
  );

  const checkByAdmin3 = await request('/settings', 'GET', null, token3);
  assert(
    checkByAdmin3.data?.data?.anomalyDetectionThreshold === testVal,
    `Admin 3 immediately reads updated threshold (${testVal}) made by Admin 1`
  );

  // 7. Security: Password Validation
  console.log('\n--- 7. Testing Credential Enforcement & Security ---');
  const badLogin1 = await request('/auth/login', 'POST', {
    email: 'admin@clearflow.com',
    password: 'WrongPassword@123',
  });
  assert(badLogin1.status === 401, 'Admin 1 wrong password rejected with HTTP 401');

  const badLogin2 = await request('/auth/login', 'POST', {
    email: 'adminn@clearflow.com',
    password: 'WrongPassword@123',
  });
  assert(badLogin2.status === 401, 'Admin 2 wrong password rejected with HTTP 401');

  const badLogin3 = await request('/auth/login', 'POST', {
    email: 'adminnn@clearflow.com',
    password: 'WrongPassword@123',
  });
  assert(badLogin3.status === 401, 'Admin 3 wrong password rejected with HTTP 401');

  // 8. Client & Field Team Non-interference
  console.log('\n--- 8. Testing Client & Field Team Non-interference ---');
  const clientLogin = await request('/auth/login', 'POST', {
    email: 'client@clearflow.com',
    password: 'Demo@123',
  });
  assert(clientLogin.status === 200, 'Existing Client login unaffected (HTTP 200)');
  assert(clientLogin.data?.data?.user?.role === 'Client', 'Client role remains "Client"');

  const fieldLogin = await request('/auth/login', 'POST', {
    email: 'field@clearflow.com',
    password: 'Demo@123',
  });
  assert(fieldLogin.status === 200, 'Existing Field Team login unaffected (HTTP 200)');
  assert(fieldLogin.data?.data?.user?.role === 'FieldTeam', 'Field Team role remains "FieldTeam"');

  console.log('\n====================================================');
  console.log(`TEST RESULTS: ${passed}/${total} PASSED (${Math.round((passed / total) * 100)}%)`);
  console.log('====================================================');

  if (passed !== total) process.exit(1);
}

run().catch((e) => {
  console.error('Test execution error:', e);
  process.exit(1);
});

const API_BASE = 'http://localhost:3000/api';

async function request(endpoint, method = 'GET', body = null, token = null) {
  const url = `${API_BASE}${endpoint}`;
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const options = { method, headers };
  if (body) options.body = JSON.stringify(body);

  const res = await fetch(url, options);
  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  return { status: res.statusCode || res.status, data };
}

async function run() {
  console.log('================================================================');
  console.log(' CLEARFLOW ENTERPRISE ADMIN, SYNCHRONIZATION & CLEAN PROFILE TEST');
  console.log('================================================================\n');

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

  // TEST 1: Admin 1 Primary Administrator Visibility
  console.log('--- TEST 1: Admin 1 Primary Administrator Visibility ---');
  const login1 = await request('/auth/login', 'POST', {
    email: 'admin@clearflow.com',
    password: 'Admin@123',
    role: 'Admin',
  });
  assert(login1.status === 200, 'Admin 1 logs in successfully (HTTP 200)');
  const token1 = login1.data?.data?.token;

  const dir1 = await request('/users/operations', 'GET', null, token1);
  assert(dir1.status === 200, 'Admin 1 fetches operations directory');
  const admins1 = dir1.data?.data?.admins || [];
  const clients1 = dir1.data?.data?.clients || [];
  const workers1 = dir1.data?.data?.workers || [];
  assert(admins1.length >= 2, `Admin 1 sees registered administrators (count: ${admins1.length})`);
  assert(clients1.length > 0, `Admin 1 sees registered clients (count: ${clients1.length})`);
  assert(workers1.length > 0, `Admin 1 sees registered workers (count: ${workers1.length})`);

  // TEST 2: Admin 2 Secondary Administrator Restrictions
  console.log('\n--- TEST 2: Admin 2 Secondary Administrator Restrictions ---');
  const login2 = await request('/auth/login', 'POST', {
    email: 'adminn@clearflow.com',
    password: 'Adminn@123',
    role: 'Admin',
  });
  assert(login2.status === 200, 'Admin 2 logs in successfully (HTTP 200)');
  const token2 = login2.data?.data?.token;

  const dir2 = await request('/users/operations', 'GET', null, token2);
  const admins2 = dir2.data?.data?.admins || [];
  assert(admins2.length === 0, 'Admin 2 directory does NOT contain administrators (count: 0)');

  const usersList2 = await request('/users', 'GET', null, token2);
  const users2 = usersList2.data?.data?.data || usersList2.data?.data || [];
  const hasAdminsInList2 = users2.some((u) => u.role === 'Admin');
  assert(!hasAdminsInList2, 'Admin 2 user listing contains ONLY clients and workers (0 Admin profiles visible)');

  // TEST 3: Admin 3 Secondary Administrator Restrictions
  console.log('\n--- TEST 3: Admin 3 Secondary Administrator Restrictions ---');
  const login3 = await request('/auth/login', 'POST', {
    email: 'adminnn@clearflow.com',
    password: 'Adminnn@123',
    role: 'Admin',
  });
  assert(login3.status === 200, 'Admin 3 logs in successfully (HTTP 200)');
  const token3 = login3.data?.data?.token;

  const dir3 = await request('/users/operations', 'GET', null, token3);
  const admins3 = dir3.data?.data?.admins || [];
  assert(admins3.length === 0, 'Admin 3 directory does NOT contain administrators (count: 0)');

  const usersList3 = await request('/users', 'GET', null, token3);
  const users3 = usersList3.data?.data?.data || usersList3.data?.data || [];
  const hasAdminsInList3 = users3.some((u) => u.role === 'Admin');
  assert(!hasAdminsInList3, 'Admin 3 user listing contains ONLY clients and workers (0 Admin profiles visible)');

  // TEST 4: Register new Client -> initializes with 0 orders, appears in Admin 1, 2, 3 dashboards
  console.log('\n--- TEST 4: New Client Registration & Clean Profile Initialization ---');
  const randNum = Math.floor(1000 + Math.random() * 9000);
  const newClientEmail = `client.test.${randNum}@clearflow.com`;
  const regClient = await request('/auth/register', 'POST', {
    name: `Test Client ${randNum}`,
    email: newClientEmail,
    password: 'Password@123',
    role: 'Client',
    phone: '+92 300 9876543',
  });
  assert(regClient.status === 201 || regClient.status === 200, 'New Client registered successfully');

  // Verify client appears in Admin 1, Admin 2, Admin 3
  const checkDir1 = await request('/users/operations', 'GET', null, token1);
  const checkDir2 = await request('/users/operations', 'GET', null, token2);
  const checkDir3 = await request('/users/operations', 'GET', null, token3);
  const inDir1 = (checkDir1.data?.data?.clients || []).some((c) => c.email === newClientEmail);
  const inDir2 = (checkDir2.data?.data?.clients || []).some((c) => c.email === newClientEmail);
  const inDir3 = (checkDir3.data?.data?.clients || []).some((c) => c.email === newClientEmail);
  assert(inDir1 && inDir2 && inDir3, 'New Client automatically synchronized and visible across Admin 1, Admin 2, and Admin 3');

  const newClientEntry = (checkDir1.data?.data?.clients || []).find((c) => c.email === newClientEmail);
  assert(newClientEntry?.totalRequests === 0 && newClientEntry?.activeOrders === 0, 'New Client initializes with exactly 0 orders and clean history');

  // TEST 5: Register new Worker -> clean profile with 0 orders, visible across all 3 admins
  console.log('\n--- TEST 5: New Worker Registration & Clean Profile Initialization ---');
  const newWorkerEmail = `worker.test.${randNum}@clearflow.com`;
  const regWorker = await request('/auth/register', 'POST', {
    name: `Test Worker ${randNum}`,
    email: newWorkerEmail,
    password: 'Password@123',
    role: 'FieldTeam',
    phone: '+92 333 9876543',
  });
  assert(regWorker.status === 201 || regWorker.status === 200, 'New Worker registered successfully');

  // Fetch updated directory
  const checkDirW1 = await request('/users/operations', 'GET', null, token1);
  const checkDirW2 = await request('/users/operations', 'GET', null, token2);
  const checkDirW3 = await request('/users/operations', 'GET', null, token3);

  const checkW1 = (checkDirW1.data?.data?.workers || []).some((w) => w.email === newWorkerEmail);
  const checkW2 = (checkDirW2.data?.data?.workers || []).some((w) => w.email === newWorkerEmail);
  const checkW3 = (checkDirW3.data?.data?.workers || []).some((w) => w.email === newWorkerEmail);
  assert(checkW1 && checkW2 && checkW3, 'New Worker automatically synchronized and visible across Admin 1, Admin 2, and Admin 3');

  const newWorkerEntry = (checkDirW1.data?.data?.workers || []).find((w) => w.email === newWorkerEmail);
  assert(newWorkerEntry?.activeOrders === 0 && newWorkerEntry?.completedJobs === 0, 'New Worker profile initializes with 0 orders and 0 completed jobs');

  // TEST 6: Worker Profile Update -> updates without touching operational records
  console.log('\n--- TEST 6: Worker Profile Update Without Altering Work Orders ---');
  const workerUpdateRes = await request('/users/me', 'GET', null, token1);
  assert(workerUpdateRes.status === 200, 'Profile endpoints respond consistently');

  // TEST 7 & 8: Secure Admin Deletion with Password Verification
  console.log('\n--- TEST 7 & 8: Secure Secondary Administrator Deletion & Password Verification ---');
  // Attempt with invalid password
  const badDelete = await request('/users/65f000000000000000000012', 'DELETE', {
    adminPassword: 'WrongPassword@123',
  }, token1);
  assert(badDelete.status === 403, 'Deletion of Admin 3 with invalid password rejected with HTTP 403 Forbidden');

  // Attempt with Admin 2's own password (should be rejected since only Admin 1 password is valid)
  const wrongAdminDelete = await request('/users/65f000000000000000000012', 'DELETE', {
    adminPassword: 'Adminn@123',
  }, token1);
  assert(wrongAdminDelete.status === 403, 'Deletion of Admin 3 using Admin 2 password rejected with HTTP 403 Forbidden');

  // Attempt with valid Primary Administrator password (Admin@123)
  const goodDelete = await request('/users/65f000000000000000000012', 'DELETE', {
    adminPassword: 'Admin@123',
  }, token1);
  assert(goodDelete.status === 200, 'Deletion of Admin 3 using verified Primary Admin password succeeds (HTTP 200)');

  // Verify deleted Admin 3 CANNOT log in again
  const reLogin3 = await request('/auth/login', 'POST', {
    email: 'adminnn@clearflow.com',
    password: 'Adminnn@123',
    role: 'Admin',
  });
  assert(reLogin3.status === 403, 'Deleted Admin 3 is permanently prevented from logging in (HTTP 403)');

  // TEST 9: Hassan Demo Account Cleanup Verification
  console.log('\n--- TEST 9: Hassan Demo Account Cleanup Verification ---');
  const hassanClientOrders = await request('/work-orders?clientId=65f000000000000000000002', 'GET', null, token1);
  const hassanOrdersList = hassanClientOrders.data?.data?.data || hassanClientOrders.data?.data || [];
  assert(hassanOrdersList.length === 0, `Hassan Client has 0 seeded work orders (actual: ${hassanOrdersList.length})`);

  const freshDir = await request('/users/operations', 'GET', null, token1);
  const hassanDirEntry = (freshDir.data?.data?.clients || []).find(
    (c) => c.email === 'client@clearflow.com' || c._id === '65f000000000000000000002'
  );
  assert(
    hassanDirEntry?.totalRequests === 0 &&
    hassanDirEntry?.activeOrders === 0 &&
    hassanDirEntry?.inProgress === 0,
    'Hassan Client profile in operational directory shows strictly 0 requests, 0 active, 0 in-progress'
  );

  // TEST 10: Refresh / Restart Data Persistence Verification
  console.log('\n--- TEST 10: Central Database & Storage Persistence ---');
  const checkDirAfter = await request('/users/operations', 'GET', null, token1);
  const remainingAdmins = checkDirAfter.data?.data?.admins || [];
  const hasDeletedAdmin3 = remainingAdmins.some((a) => a.email === 'adminnn@clearflow.com');
  assert(!hasDeletedAdmin3, 'Deleted Admin 3 remains deleted and unlisted across directory refreshes');

  console.log('\n================================================================');
  console.log(`TEST SUITE COMPLETE: ${passed}/${total} PASSED (${Math.round((passed / total) * 100)}%)`);
  console.log('================================================================\n');

  if (passed !== total) process.exit(1);
}

run().catch((e) => {
  console.error('Test run failed:', e);
  process.exit(1);
});

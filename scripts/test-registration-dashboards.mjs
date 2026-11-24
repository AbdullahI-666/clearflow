import http from 'http';

const BASE_URL = 'http://localhost:3000';

function postJson(path, data, token) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const bodyStr = JSON.stringify(data);
    const headers = {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(bodyStr),
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const req = http.request(
      url,
      { method: 'POST', headers },
      (res) => {
        let raw = '';
        res.on('data', (chunk) => (raw += chunk));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, data: JSON.parse(raw) });
          } catch {
            resolve({ status: res.statusCode, raw });
          }
        });
      }
    );
    req.on('error', reject);
    req.write(bodyStr);
    req.end();
  });
}

function getJson(path, token) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const req = http.request(url, { method: 'GET', headers }, (res) => {
      let raw = '';
      res.on('data', (chunk) => (raw += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(raw) });
        } catch {
          resolve({ status: res.statusCode, raw });
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

function patchJson(path, data, token) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const bodyStr = JSON.stringify(data);
    const headers = {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(bodyStr),
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const req = http.request(
      url,
      { method: 'PATCH', headers },
      (res) => {
        let raw = '';
        res.on('data', (chunk) => (raw += chunk));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, data: JSON.parse(raw) });
          } catch {
            resolve({ status: res.statusCode, raw });
          }
        });
      }
    );
    req.on('error', reject);
    req.write(bodyStr);
    req.end();
  });
}

async function runTests() {
  console.log('====================================================');
  console.log('CLEARFLOW DYNAMIC REGISTRATION & DASHBOARD TEST SUITE');
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

  // -------------------------------------------------------------
  // TEST A: New Client Registration & Initial Dashboard Data
  // -------------------------------------------------------------
  console.log('\n--- TEST A: New Client Registration & Initialization ---');
  const clientEmail = `client_${Date.now()}@testflow.com`;
  const regClientRes = await postJson('/api/auth/register', {
    name: 'Tariq Mehmood',
    email: clientEmail,
    password: 'Password@123',
    role: 'Client',
  });
  assert(regClientRes.status === 201, `New client registered successfully (${clientEmail})`);
  const clientOtp = regClientRes.data?.data?.verificationCode;
  assert(!!clientOtp, `Received 4-digit verification code: ${clientOtp}`);

  const verifyClientRes = await postJson('/api/auth/verify-code', {
    email: clientEmail,
    code: clientOtp,
  });
  assert(verifyClientRes.status === 200, 'New client email verified with 4-digit code');

  const loginClientRes = await postJson('/api/auth/login', {
    email: clientEmail,
    password: 'Password@123',
  });
  assert(loginClientRes.status === 200, 'New client logged in successfully');
  const clientToken = loginClientRes.data?.data?.token;

  const clientOrdersRes = await getJson('/api/work-orders', clientToken);
  const clientOrders = clientOrdersRes.data?.data?.data || clientOrdersRes.data?.data || [];
  assert(clientOrders.length === 0, `New client starts with 0 work orders (actual: ${clientOrders.length})`);

  const clientInvoicesRes = await getJson('/api/invoices', clientToken);
  const clientInvoices = clientInvoicesRes.data?.data?.data || clientInvoicesRes.data?.data || [];
  assert(clientInvoices.length === 0, `New client starts with 0 invoices (actual: ${clientInvoices.length})`);

  const clientNotifsRes = await getJson('/api/notifications', clientToken);
  const clientNotifs = clientNotifsRes.data?.data || [];
  const clientWelcome = clientNotifs.find((n) => n.title?.includes('Welcome'));
  assert(
    !!clientWelcome && clientWelcome.message.includes('facility management services'),
    `New client has official welcome notification: "${clientWelcome?.title}"`
  );

  // -------------------------------------------------------------
  // TEST B: Existing Client Historical Data
  // -------------------------------------------------------------
  console.log('\n--- TEST B: Existing Client Historical Data ---');
  const loginHassanRes = await postJson('/api/auth/login', {
    email: 'client@clearflow.com',
    password: 'Demo@123',
  });
  assert(loginHassanRes.status === 200, 'Existing client Hassan logged in');
  const hassanToken = loginHassanRes.data?.data?.token;

  const hassanOrdersRes = await getJson('/api/work-orders', hassanToken);
  const hassanOrders = hassanOrdersRes.data?.data?.data || hassanOrdersRes.data?.data || [];
  assert(hassanOrders.length >= 1, `Hassan retrieves actual historical orders (count: ${hassanOrders.length})`);

  const hassanInvoicesRes = await getJson('/api/invoices', hassanToken);
  const hassanInvoices = hassanInvoicesRes.data?.data?.data || hassanInvoicesRes.data?.data || [];
  assert(hassanInvoices.length >= 1, `Hassan retrieves actual invoices (count: ${hassanInvoices.length})`);

  // -------------------------------------------------------------
  // TEST C: New Field Team Registration & Initialization
  // -------------------------------------------------------------
  console.log('\n--- TEST C: New Field Team Registration & Initialization ---');
  const workerEmail = `worker_${Date.now()}@testflow.com`;
  const regWorkerRes = await postJson('/api/auth/register', {
    name: 'Zubair Shah',
    email: workerEmail,
    password: 'Password@123',
    role: 'FieldTeam',
  });
  assert(regWorkerRes.status === 201, `New field worker registered (${workerEmail})`);
  const workerOtp = regWorkerRes.data?.data?.verificationCode;

  const verifyWorkerRes = await postJson('/api/auth/verify-code', {
    email: workerEmail,
    code: workerOtp,
  });
  assert(verifyWorkerRes.status === 200, 'New worker email verified with code');

  const loginWorkerRes = await postJson('/api/auth/login', {
    email: workerEmail,
    password: 'Password@123',
  });
  assert(loginWorkerRes.status === 200, 'New worker logged in successfully');
  const workerToken = loginWorkerRes.data?.data?.token;

  const workerOrdersRes = await getJson('/api/work-orders', workerToken);
  const workerOrders = workerOrdersRes.data?.data?.data || workerOrdersRes.data?.data || [];
  assert(workerOrders.length === 0, `New worker starts with 0 assigned tasks (actual: ${workerOrders.length})`);

  const workerWalletRes = await getJson('/api/marketplace/wallet', workerToken);
  const walletData = workerWalletRes.data?.data;
  assert(
    walletData?.totalEarnings === 0 && walletData?.withdrawableBalance === 0,
    `New worker wallet initialized with 0 earnings & 0 withdrawable balance`
  );

  const workerNotifsRes = await getJson('/api/notifications', workerToken);
  const workerNotifs = workerNotifsRes.data?.data || [];
  const workerWelcome = workerNotifs.find((n) => n.title?.includes('Welcome'));
  assert(
    !!workerWelcome && workerWelcome.message.includes('ClearFlow') && !workerWelcome.message.includes('Field Team') && !workerWelcome.title.includes('Field Team'),
    `New worker has official welcome notification: "${workerWelcome?.title}"`
  );

  // Available jobs check when online vs offline
  const nearbyOnlineRes = await getJson('/api/marketplace/requests/nearby', workerToken);
  assert(nearbyOnlineRes.status === 200, 'Worker can query nearby opportunities');

  // Toggle offline
  await patchJson('/api/marketplace/wallet/availability', { isOnline: false }, workerToken);
  const nearbyOfflineRes = await getJson('/api/marketplace/requests/nearby', workerToken);
  assert(
    nearbyOfflineRes.data?.data?.totalAvailable === 0 && nearbyOfflineRes.data?.data?.requests?.length === 0,
    'When offline, worker receives 0 job opportunities'
  );

  // Toggle back online
  await patchJson('/api/marketplace/wallet/availability', { isOnline: true }, workerToken);

  // -------------------------------------------------------------
  // TEST D: Existing Field Team Historical Data
  // -------------------------------------------------------------
  console.log('\n--- TEST D: Existing Field Team Historical Data ---');
  const loginAhsanRes = await postJson('/api/auth/login', {
    email: 'field@clearflow.com',
    password: 'Demo@123',
  });
  assert(loginAhsanRes.status === 200, 'Existing worker Ahsan Malik logged in');
  const ahsanToken = loginAhsanRes.data?.data?.token;

  const ahsanOrdersRes = await getJson('/api/work-orders', ahsanToken);
  const ahsanOrders = ahsanOrdersRes.data?.data?.data || ahsanOrdersRes.data?.data || [];
  assert(ahsanOrders.length >= 1, `Ahsan retrieves actual historical assignments (count: ${ahsanOrders.length})`);

  const ahsanWalletRes = await getJson('/api/marketplace/wallet', ahsanToken);
  assert(ahsanWalletRes.data?.data?.totalEarnings === 1560, 'Ahsan wallet shows real PKR 1,560 earnings');

  // -------------------------------------------------------------
  // TEST E: Multiple Users & Strict Data Isolation
  // -------------------------------------------------------------
  console.log('\n--- TEST E: Multiple Users & Data Isolation ---');
  assert(
    clientOrders.every((o) => o.clientId?._id !== '65f000000000000000000002'),
    'New client cannot see Hassan Tariq private records'
  );
  assert(
    workerOrders.every((o) => o.teamId?._id !== '65f000000000000000000004'),
    'New worker cannot see Ahsan Malik private assignments'
  );

  // -------------------------------------------------------------
  // TEST F: Live Updates & Creation Flow
  // -------------------------------------------------------------
  console.log('\n--- TEST F: Live Request Creation & Synchronization ---');
  const createWoRes = await postJson(
    '/api/work-orders',
    {
      title: 'Emergency Generator Coolant Leak',
      categoryId: '65f000000000000000000101',
      locationAddress: 'Zone 4, Building B',
      urgency: 'High',
      budget: 150,
      isMarketplace: true,
      description: 'Coolant line leaking around primary generator valve.',
    },
    clientToken
  );
  assert(createWoRes.status === 201, 'New client successfully created a live service request');

  const refreshedClientOrders = await getJson('/api/work-orders', clientToken);
  const updatedList = refreshedClientOrders.data?.data?.data || refreshedClientOrders.data?.data || [];
  assert(
    updatedList.length === 1 && updatedList[0].title.includes('Generator'),
    `Client dashboard automatically populated with 1 new active request (ID: ${updatedList[0]?.workOrderCode})`
  );

  // -------------------------------------------------------------
  // TEST G: Existing Admin Portal Verification
  // -------------------------------------------------------------
  console.log('\n--- TEST G: Admin Portal Integrity ---');
  const loginAdminRes = await postJson('/api/auth/login', {
    email: 'admin@clearflow.com',
    password: 'Admin@123',
  });
  assert(loginAdminRes.status === 200, 'Admin Abdullah logged in successfully');
  const adminToken = loginAdminRes.data?.data?.token;

  const adminOrdersRes = await getJson('/api/work-orders', adminToken);
  const adminOrders = adminOrdersRes.data?.data?.data || adminOrdersRes.data?.data || [];
  assert(adminOrders.length >= 2, `Admin has system-wide access to all orders (count: ${adminOrders.length})`);

  console.log('\n====================================================');
  console.log(`TEST SUITE RESULTS: ${passed}/${total} PASSED (${Math.round((passed / total) * 100)}%)`);
  console.log('====================================================\n');

  if (passed === total) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});

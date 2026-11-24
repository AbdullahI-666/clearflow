import http from 'http';

function post(path, body, token) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body || {});
    const headers = {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(data),
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const req = http.request({
      hostname: 'localhost',
      port: 3000,
      path,
      method: 'POST',
      headers,
    }, (res) => {
      let buf = '';
      res.on('data', chunk => buf += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(buf) });
        } catch {
          resolve({ status: res.statusCode, data: buf });
        }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function get(path, token) {
  return new Promise((resolve, reject) => {
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const req = http.request({
      hostname: 'localhost',
      port: 3000,
      path,
      method: 'GET',
      headers,
    }, (res) => {
      let buf = '';
      res.on('data', chunk => buf += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(buf) });
        } catch {
          resolve({ status: res.statusCode, data: buf });
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function run() {
  console.log('--- TESTING OPERATIONS STRICT CNIC GATE ---');

  // 1. Primary Admin Login via OAuth
  const primaryAdminRes = await post('/api/auth/oauth', {
    provider: 'google',
    email: 'ahsankhalid9768@gmail.com',
    name: 'Ahsan',
    role: 'Admin',
  });
  const primaryToken = primaryAdminRes.data?.data?.token || primaryAdminRes.data?.token;
  console.log('Primary Admin (Ahsan) logged in:', Boolean(primaryToken));

  // 2. Fetch Operations as Primary Admin
  const primOps = await get('/api/users/operations', primaryToken);
  const primClients = primOps.data?.data?.clients || [];
  const primWorkers = primOps.data?.data?.workers || [];
  console.log(`Primary Admin sees: ${primClients.length} clients, ${primWorkers.length} workers.`);

  // Verify all currently returned clients & workers have 13-digit CNIC
  for (const c of primClients) {
    const digits = (c.cnic || '').replace(/\D/g, '');
    if (digits.length !== 13) {
      throw new Error(`FAIL: Client ${c.name} (${c.email}) has invalid/missing CNIC in operations: "${c.cnic}"`);
    }
  }
  for (const w of primWorkers) {
    const digits = (w.cnic || '').replace(/\D/g, '');
    if (digits.length !== 13) {
      throw new Error(`FAIL: Worker ${w.name} (${w.email}) has invalid/missing CNIC in operations: "${w.cnic}"`);
    }
  }
  console.log('✓ All existing operations clients & workers have strictly verified 13-digit CNIC.');

  // 3. Log in as Secondary Admin (abdullahikram666@gmail.com)
  const secAdminRes = await post('/api/auth/oauth', {
    provider: 'google',
    email: 'abdullahikram666@gmail.com',
    name: 'Abdullah Ikram',
    role: 'Admin',
  });
  const secToken = secAdminRes.data?.data?.token || secAdminRes.data?.token;
  console.log('Secondary Admin (Abdullah Ikram) logged in:', Boolean(secToken));

  // 4. Fetch Operations as Secondary Admin
  const secOps = await get('/api/users/operations', secToken);
  const secClients = secOps.data?.data?.clients || [];
  const secWorkers = secOps.data?.data?.workers || [];
  console.log(`Secondary Admin sees: ${secClients.length} clients, ${secWorkers.length} workers.`);

  for (const c of secClients) {
    const digits = (c.cnic || '').replace(/\D/g, '');
    if (digits.length !== 13) {
      throw new Error(`FAIL (Secondary Admin): Client ${c.name} has invalid CNIC: "${c.cnic}"`);
    }
  }
  for (const w of secWorkers) {
    const digits = (w.cnic || '').replace(/\D/g, '');
    if (digits.length !== 13) {
      throw new Error(`FAIL (Secondary Admin): Worker ${w.name} has invalid CNIC: "${w.cnic}"`);
    }
  }
  console.log('✓ Secondary Admin also strictly sees only verified 13-digit CNIC clients & workers.');

  // 5. Create new Unverified Client & Worker via Registration
  const testId = Date.now();
  const unverifiedClientEmail = `unverified.client.${testId}@clearflow.com`;
  const unverifiedWorkerEmail = `unverified.worker.${testId}@clearflow.com`;

  const regClient = await post('/api/auth/oauth', {
    provider: 'google',
    email: unverifiedClientEmail,
    name: 'Sara',
    role: 'Client',
  });
  const clientToken = regClient.data?.data?.token || regClient.data?.token;

  const regWorker = await post('/api/auth/oauth', {
    provider: 'google',
    email: unverifiedWorkerEmail,
    name: 'Hamza',
    role: 'FieldTeam',
  });
  const workerToken = regWorker.data?.data?.token || regWorker.data?.token;

  // Verify they are NOT in operations for either Admin
  const checkPrimAfterUnverified = await get('/api/users/operations', primaryToken);
  const checkSecAfterUnverified = await get('/api/users/operations', secToken);

  const foundClientPrim = checkPrimAfterUnverified.data?.data?.clients?.some(c => c.email === unverifiedClientEmail);
  const foundWorkerPrim = checkPrimAfterUnverified.data?.data?.workers?.some(w => w.email === unverifiedWorkerEmail);
  const foundClientSec = checkSecAfterUnverified.data?.data?.clients?.some(c => c.email === unverifiedClientEmail);
  const foundWorkerSec = checkSecAfterUnverified.data?.data?.workers?.some(w => w.email === unverifiedWorkerEmail);

  if (foundClientPrim || foundWorkerPrim || foundClientSec || foundWorkerSec) {
    throw new Error('FAIL: Unverified users appeared in Operations directory before verifying CNIC!');
  }
  console.log('✓ Unverified users (Sara & Hamza) are strictly HIDDEN from Operations for both Admins.');

  // 6. User verifies their CNIC
  await post('/api/users/verify-identity', {
    name: 'Sara',
    cnic: '35201-1122334-1',
    phone: '+92 300 1122334',
    address: 'Gulberg III, Lahore',
    city: 'Lahore',
  }, clientToken);

  await post('/api/users/verify-identity', {
    name: 'Hamza',
    cnic: '35201-1122334-2',
    phone: '+92 300 1122335',
    address: 'DHA Phase 5, Lahore',
    city: 'Lahore',
  }, workerToken);

  // 7. Check that they now DO appear in Operations for both Admins!
  const checkPrimAfterVerified = await get('/api/users/operations', primaryToken);
  const checkSecAfterVerified = await get('/api/users/operations', secToken);

  const foundClientPrimVerified = checkPrimAfterVerified.data?.data?.clients?.find(c => c.email === unverifiedClientEmail);
  const foundWorkerPrimVerified = checkPrimAfterVerified.data?.data?.workers?.find(w => w.email === unverifiedWorkerEmail);
  const foundClientSecVerified = checkSecAfterVerified.data?.data?.clients?.find(c => c.email === unverifiedClientEmail);
  const foundWorkerSecVerified = checkSecAfterVerified.data?.data?.workers?.find(w => w.email === unverifiedWorkerEmail);

  if (!foundClientPrimVerified || !foundWorkerPrimVerified || !foundClientSecVerified || !foundWorkerSecVerified) {
    throw new Error('FAIL: Verified users did not appear in Operations after CNIC verification!');
  }

  console.log('✓ After CNIC verification, Sara and Hamza appear in Operations for both Primary and Secondary Admins!');
  console.log('Sara in Operations:', { name: foundClientPrimVerified.name, cnic: foundClientPrimVerified.cnic });
  console.log('Hamza in Operations:', { name: foundWorkerPrimVerified.name, cnic: foundWorkerPrimVerified.cnic });

  console.log('\n======================================================');
  console.log('>>> OPERATIONS CNIC GATE PASSED 100% SUCCESSFULLY <<<');
  console.log('======================================================');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

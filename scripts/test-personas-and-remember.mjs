const BASE_URL = 'http://localhost:3000';

async function post(path, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body)
  });
  const data = await res.json().catch(() => null);
  return { status: res.status, data };
}

async function get(path, token) {
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${BASE_URL}${path}`, { headers });
  const data = await res.json().catch(() => null);
  return { status: res.status, data };
}

async function run() {
  console.log('--- STARTING VERIFICATION TEST ---');

  // Authenticate admin
  const adminOAuth = await post('/api/auth/oauth', {
    provider: 'google',
    email: 'ahsankhalid9768@gmail.com',
    name: 'Ahsan',
    role: 'Admin'
  });
  const adminToken = adminOAuth.data?.data?.token || adminOAuth.data?.token;
  console.log('Admin authenticated:', Boolean(adminToken));

  const ts = Date.now();

  // 1. Google Client Test (Sara Persona Flow)
  const sarahEmail = `sara.flow.${ts}@clearflow.com`;
  console.log(`\n[1] Registering Sara via Google OAuth (${sarahEmail})...`);
  const sarahRes = await post('/api/auth/oauth', {
    provider: 'google',
    email: sarahEmail,
    name: 'Sara',
    role: 'Client'
  });
  const sarahToken = sarahRes.data?.data?.token || sarahRes.data?.token;
  const sarahUser = sarahRes.data?.data?.user || sarahRes.data?.user;
  console.log('Sara registered:', sarahUser?.name, 'cnicVerified:', sarahUser?.cnicVerified);

  // Check Operations before CNIC verification
  let ops = await get('/api/users/operations', adminToken);
  let sarahInOps = ops.data?.data?.clients?.find(c => c.email === sarahEmail);
  console.log('Is Sara in Admin Operations before CNIC verification?', Boolean(sarahInOps));
  if (sarahInOps) throw new Error('Unverified Sara must NOT be in Operations!');

  // Sara submits 13-digit Pakistani CNIC verification
  console.log('Sara verifies 13-digit CNIC...');
  await post('/api/users/verify-identity', {
    name: 'Sara',
    cnic: '35201-9876543-1',
    phone: '+92 300 9876543',
    address: 'Gulberg III, Lahore',
    city: 'Lahore',
  }, sarahToken);

  // Check Operations after CNIC verification
  ops = await get('/api/users/operations', adminToken);
  sarahInOps = ops.data?.data?.clients?.find(c => c.email === sarahEmail);
  console.log('Is Sara in Admin Operations after CNIC verification?', Boolean(sarahInOps));
  console.log('Sara in Operations:', { name: sarahInOps?.name, cnic: sarahInOps?.cnic, city: sarahInOps?.city });
  if (!sarahInOps || sarahInOps.name !== 'Sara' || !sarahInOps.cnic.includes('35201-9876543-1')) {
    throw new Error('Sara must appear in Operations with name Sara!');
  }

  // 2. Google Worker Test (Hamza Persona Flow)
  const hamzaEmail = `hamza.flow.${ts}@clearflow.com`;
  console.log(`\n[2] Registering Hamza via Google OAuth (${hamzaEmail})...`);
  const hamzaRes = await post('/api/auth/oauth', {
    provider: 'google',
    email: hamzaEmail,
    name: 'Hamza',
    role: 'FieldTeam'
  });
  const hamzaToken = hamzaRes.data?.data?.token || hamzaRes.data?.token;

  ops = await get('/api/users/operations', adminToken);
  let hamzaInOps = ops.data?.data?.workers?.find(w => w.email === hamzaEmail);
  console.log('Is Hamza in Admin Operations before CNIC verification?', Boolean(hamzaInOps));
  if (hamzaInOps) throw new Error('Unverified Hamza must NOT be in Operations!');

  // Hamza verifies CNIC
  console.log('Hamza verifies 13-digit CNIC...');
  await post('/api/users/verify-identity', {
    name: 'Hamza',
    cnic: '35202-1234567-3',
    phone: '+92 321 7654321',
    address: 'DHA Phase 5, Lahore',
    city: 'Lahore',
  }, hamzaToken);

  ops = await get('/api/users/operations', adminToken);
  hamzaInOps = ops.data?.data?.workers?.find(w => w.email === hamzaEmail);
  console.log('Is Hamza in Admin Operations after CNIC verification?', Boolean(hamzaInOps));
  console.log('Hamza in Operations:', { name: hamzaInOps?.name, cnic: hamzaInOps?.cnic });
  if (!hamzaInOps || hamzaInOps.name !== 'Hamza') {
    throw new Error('Hamza must appear in Operations with name Hamza!');
  }

  // 3. Apple Personas Test (Hassan Client & Bilal Worker)
  const hassanEmail = `hassan.flow.${ts}@clearflow.com`;
  const bilalEmail = `bilal.flow.${ts}@clearflow.com`;
  console.log(`\n[3] Testing Apple Personas: Hassan (${hassanEmail}) & Bilal (${bilalEmail})...`);
  const hassanRes = await post('/api/auth/oauth', {
    provider: 'apple',
    email: hassanEmail,
    name: 'Hassan',
    role: 'Client'
  });
  const bilalRes = await post('/api/auth/oauth', {
    provider: 'apple',
    email: bilalEmail,
    name: 'Bilal',
    role: 'FieldTeam'
  });

  ops = await get('/api/users/operations', adminToken);
  if (ops.data?.data?.clients?.find(c => c.email === hassanEmail)) {
    throw new Error('Hassan must NOT appear in Operations before verification!');
  }
  if (ops.data?.data?.workers?.find(w => w.email === bilalEmail)) {
    throw new Error('Bilal must NOT appear in Operations before verification!');
  }
  console.log('Both Apple personas are correctly hidden prior to CNIC verification.');

  // Bilal verifies CNIC
  console.log('Bilal verifies CNIC...');
  await post('/api/users/verify-identity', {
    name: 'Bilal',
    cnic: '35201-1122334-5',
    phone: '+92 333 4455667',
  }, bilalRes.data?.data?.token || bilalRes.data?.token);

  ops = await get('/api/users/operations', adminToken);
  const bilalInOps = ops.data?.data?.workers?.find(w => w.email === bilalEmail);
  console.log('Is Bilal in Operations after CNIC verification?', Boolean(bilalInOps));
  if (!bilalInOps || bilalInOps.name !== 'Bilal') {
    throw new Error('Bilal must appear in Operations with name Bilal!');
  }

  // 4. Remember Me login cycle across devices
  console.log('\n[4] Testing Remember Me Login cycle...');
  const userEmail = `device.user.${ts}@clearflow.com`;
  await post('/api/auth/register', {
    name: 'Device Tester',
    email: userEmail,
    password: 'Password123!',
    role: 'Client',
  });
  await post('/api/auth/instant-activate', { email: userEmail });

  const deviceId = `device-${ts}`;

  // Login without Remember Me -> requires2FA = true
  const l1 = await post('/api/auth/login', {
    email: userEmail,
    password: 'Password123!',
    rememberMe: false,
    deviceId,
  });
  const p1 = l1.data?.data || l1.data;
  console.log('Login 1 (Unchecked Remember Me) requires2FA:', p1?.requires2FA);
  if (!p1?.requires2FA) throw new Error('Unchecked Remember Me must ask for code!');

  // Login with Remember Me (first time) -> requires2FA = true
  const l2 = await post('/api/auth/login', {
    email: userEmail,
    password: 'Password123!',
    rememberMe: true,
    deviceId,
  });
  const p2 = l2.data?.data || l2.data;
  console.log('Login 2 (Checked Remember Me, 1st time) requires2FA:', p2?.requires2FA);
  if (!p2?.requires2FA) throw new Error('First time Remember Me must ask for code once!');

  // Verify code with rememberMe=true
  const vRes = await post('/api/auth/verify-login-code', {
    email: userEmail,
    code: p2.codeHint || p2.twoFactorCode,
    rememberMe: true,
    deviceId,
  });
  const vp = vRes.data?.data || vRes.data;
  console.log('Code verified on device, token received:', Boolean(vp?.token));

  // Subsequent login with Remember Me on same device -> direct login!
  const l3 = await post('/api/auth/login', {
    email: userEmail,
    password: 'Password123!',
    rememberMe: true,
    deviceId,
  });
  const p3 = l3.data?.data || l3.data;
  console.log('Login 3 (Checked Remember Me, 2nd time on same device) requires2FA:', p3?.requires2FA);
  if (p3?.requires2FA) throw new Error('Remembered device with Remember Me checked must NOT ask for code!');

  // Subsequent login on same device with Remember Me UNCHECKED -> must still ask!
  const l4 = await post('/api/auth/login', {
    email: userEmail,
    password: 'Password123!',
    rememberMe: false,
    deviceId,
  });
  const p4 = l4.data?.data || l4.data;
  console.log('Login 4 (Unchecked Remember Me on remembered device) requires2FA:', p4?.requires2FA);
  if (!p4?.requires2FA) throw new Error('Unchecked Remember Me must ALWAYS ask for code!');

  console.log('\n=========================================================');
  console.log('>>> ALL VERIFICATION TESTS PASSED SUCCESSFULLY (100%) <<<');
  console.log('=========================================================');
}

run().catch(e => {
  console.error('ERROR IN TEST RUN:', e);
  process.exit(1);
});

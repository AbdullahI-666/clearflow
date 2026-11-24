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
  console.log('--- TESTING CHAT STRICT CNIC GATE & PERSONA NAMES ---');

  // 1. Primary Admin Login via OAuth
  const primaryAdminRes = await post('/api/auth/oauth', {
    provider: 'google',
    email: 'ahsankhalid9768@gmail.com',
    name: 'Ahsan',
    role: 'Admin',
  });
  const primaryToken = primaryAdminRes.data?.data?.token || primaryAdminRes.data?.token;
  if (!primaryToken) throw new Error('Primary Admin failed to log in');
  console.log('✓ Primary Admin (Ahsan) logged in.');

  // 2. Fetch Chat Contacts
  const chatContactsRes = await get('/api/chat/contacts', primaryToken);
  const contacts = chatContactsRes.data?.data || {};
  const admins = contacts.admins || [];
  const clients = contacts.clients || [];
  const workers = contacts.workers || [];

  console.log(`Chat contacts returned: ${admins.length} admins, ${clients.length} clients, ${workers.length} workers.`);

  // 3. Ensure NO legacy unverified test accounts exist in chat contacts
  const allContacts = [...admins, ...clients, ...workers];
  for (const c of allContacts) {
    const nameLower = (c.name || '').toLowerCase();
    if (nameLower.includes('malik') || nameLower.includes('(client)') || nameLower.includes('(field') || nameLower.includes('(apple')) {
      throw new Error(`FAIL: Legacy test account found in chat contacts: "${c.name}"`);
    }
    // Check no surnames for clients and workers
    if (c.role === 'Client' || c.role === 'Worker') {
      const allowedNames = ['sara', 'hamza', 'hassan', 'bilal'];
      const matchesAllowed = allowedNames.some(a => nameLower === a);
      if (!matchesAllowed) {
        throw new Error(`FAIL: Client/Worker has invalid name or surname: "${c.name}". Expected single persona name (Sara, Hamza, Hassan, Bilal).`);
      }
    }
  }
  console.log('✓ All clients and workers in chat contacts have clean single persona names (Sara, Hamza, Hassan, Bilal).');
  console.log('✓ No phantom "Ahsan Malik" or parenthetical accounts exist in chat contacts.');

  // 4. Test Unverified User Gate in Chat Contacts
  const testId = Date.now();
  const unverifiedEmail = `unverified.chat.${testId}@clearflow.com`;
  const regRes = await post('/api/auth/oauth', {
    provider: 'google',
    email: unverifiedEmail,
    name: 'Sara',
    role: 'Client',
  });
  const unverifiedToken = regRes.data?.data?.token || regRes.data?.token;

  // Verify unverified user does NOT appear in chat contacts
  const chatAfterUnverified = await get('/api/chat/contacts', primaryToken);
  const foundUnverified = (chatAfterUnverified.data?.data?.clients || []).some(c => c.email === unverifiedEmail);
  if (foundUnverified) {
    throw new Error('FAIL: Unverified user appeared in Chat contacts before verifying CNIC!');
  }
  console.log('✓ Unverified user is strictly HIDDEN from Chat contacts directory.');

  // 5. User verifies their CNIC
  await post('/api/users/verify-identity', {
    name: 'Sara',
    cnic: '35201-7788990-1',
    phone: '+92 300 7788990',
    address: 'Gulberg III, Lahore',
    city: 'Lahore',
  }, unverifiedToken);

  // Verify user now DOES appear in chat contacts!
  const chatAfterVerified = await get('/api/chat/contacts', primaryToken);
  const verifiedUser = (chatAfterVerified.data?.data?.clients || []).find(c => c.email === unverifiedEmail);
  if (!verifiedUser) {
    throw new Error('FAIL: User did not appear in Chat contacts after completing CNIC verification!');
  }
  console.log('✓ After CNIC verification, user appears in Chat contacts with clean name:', verifiedUser.name);

  console.log('\n======================================================');
  console.log('>>> CHAT CNIC GATE & PERSONA NAMES TEST PASSED 100% <<<');
  console.log('======================================================');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

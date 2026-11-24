import fs from 'fs';

const API_BASE = 'http://localhost:3000/api';

async function postJson(endpoint, data) {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok) {
    const err = new Error(json.message || `HTTP ${res.status}`);
    err.response = { status: res.status, data: json };
    throw err;
  }
  return json;
}

async function run() {
  console.log('--- Starting Login by Email or Username and Auth Verification Test ---');

  // 1. Test Admin Login by Email
  console.log('\n[1] Testing Admin Login by Email...');
  try {
    const adminEmailRes = await postJson('/auth/login', {
      email: 'ahsankhalid9768@gmail.com',
      password: 'password123',
      selectedRole: 'admin',
      rememberMe: false,
    });
    console.log('✓ Admin login by email response:', adminEmailRes.message || adminEmailRes.data?.message);
    if (!adminEmailRes.data?.requires2FA && !adminEmailRes.data?.token) {
      throw new Error('Admin login by email failed to return valid response');
    }
  } catch (err) {
    console.error('✗ Admin login by email error:', err.response?.data || err.message);
    throw err;
  }

  // 2. Test Admin Login by Username (Name: "Ahsan")
  console.log('\n[2] Testing Admin Login by Username ("Ahsan")...');
  try {
    const adminUserRes = await postJson('/auth/login', {
      email: 'Ahsan',
      password: 'password123',
      selectedRole: 'admin',
      rememberMe: false,
    });
    console.log('✓ Admin login by username response:', adminUserRes.message || adminUserRes.data?.message);
    if (!adminUserRes.data?.requires2FA && !adminUserRes.data?.token) {
      throw new Error('Admin login by username failed to return valid response');
    }
  } catch (err) {
    console.error('✗ Admin login by username error:', err.response?.data || err.message);
    throw err;
  }

  // 3. Register a Test Client with Name "SaraTest"
  console.log('\n[3] Registering Test Client with Name "SaraTest"...');
  const clientEmail = `saratest.${Date.now()}@clearflow.com`;
  const clientName = `SaraTest${Date.now().toString().slice(-4)}`;
  const clientPassword = 'password123';

  let clientRegisterRes;
  try {
    clientRegisterRes = await postJson('/auth/register', {
      name: clientName,
      email: clientEmail,
      password: clientPassword,
      role: 'Client',
    });
    console.log('✓ Client registered:', clientRegisterRes.message);
  } catch (err) {
    console.error('✗ Registration failed:', err.response?.data || err.message);
    throw err;
  }

  // 4. Test Client Login by Email
  console.log(`\n[4] Testing Client Login by Email (${clientEmail})...`);
  let codeHint;
  try {
    const clientLoginEmailRes = await postJson('/auth/login', {
      email: clientEmail,
      password: clientPassword,
      selectedRole: 'client',
      rememberMe: false,
    });
    console.log('✓ Client login by email response:', clientLoginEmailRes.message || clientLoginEmailRes.data?.message);
    codeHint = clientLoginEmailRes.data?.codeHint;
  } catch (err) {
    console.error('✗ Client login by email failed:', err.response?.data || err.message);
    throw err;
  }

  // 5. Test Client Login by Username (clientName)
  console.log(`\n[5] Testing Client Login by Username ("${clientName}")...`);
  try {
    const clientLoginUserRes = await postJson('/auth/login', {
      email: clientName,
      password: clientPassword,
      selectedRole: 'client',
      rememberMe: false,
    });
    console.log('✓ Client login by username response:', clientLoginUserRes.message || clientLoginUserRes.data?.message);
    codeHint = clientLoginUserRes.data?.codeHint;
  } catch (err) {
    console.error('✗ Client login by username failed:', err.response?.data || err.message);
    throw err;
  }

  // 6. Test Verify Code by Username
  console.log(`\n[6] Testing 2FA verification using Username ("${clientName}")...`);
  const deviceId = `test_device_${Date.now()}`;
  try {
    const verifyRes = await postJson('/auth/verify-login-code', {
      email: clientName,
      code: codeHint,
      rememberMe: true,
      deviceId: deviceId,
    });
    console.log('✓ 2FA verification by username successful! Token obtained.');
  } catch (err) {
    console.error('✗ 2FA verification by username failed:', err.response?.data || err.message);
    throw err;
  }

  // 7. Test Remember Me: Login again with Username and Remember Me -> Should NOT require 2FA
  console.log(`\n[7] Testing Remember Me with Username ("${clientName}")...`);
  try {
    const rememberedRes = await postJson('/auth/login', {
      email: clientName,
      password: clientPassword,
      selectedRole: 'client',
      rememberMe: true,
      deviceId: deviceId,
    });
    if (rememberedRes.data?.requires2FA) {
      throw new Error('Remember Me failed: Still required 2FA code!');
    }
    console.log('✓ Remember Me verified! Directly logged in without code:', rememberedRes.data?.message || rememberedRes.message);
  } catch (err) {
    console.error('✗ Remember Me login failed:', err.response?.data || err.message);
    throw err;
  }

  // 8. Clean up test user
  console.log('\n[8] Cleaning up temporary test users from data store...');
  const usersPath = 'server/data/users.json';
  if (fs.existsSync(usersPath)) {
    try {
      const users = JSON.parse(fs.readFileSync(usersPath, 'utf8'));
      const cleaned = users.filter((u) => u.email !== clientEmail && u.name !== clientName);
      fs.writeFileSync(usersPath, JSON.stringify(cleaned, null, 2), 'utf8');
      console.log('✓ users.json cleaned.');
    } catch (_) {}
  }

  const overridesPath = 'server/data/user_overrides.json';
  if (fs.existsSync(overridesPath)) {
    try {
      const overrides = JSON.parse(fs.readFileSync(overridesPath, 'utf8'));
      delete overrides[clientEmail];
      fs.writeFileSync(overridesPath, JSON.stringify(overrides, null, 2), 'utf8');
      console.log('✓ user_overrides.json cleaned.');
    } catch (_) {}
  }

  console.log('\n======================================================');
  console.log('>>> ALL LOGIN BY USERNAME & AUTH TESTS PASSED (100%) <<<');
  console.log('======================================================');
}

run().catch((err) => {
  console.error('Test Suite Failed:', err);
  process.exit(1);
});

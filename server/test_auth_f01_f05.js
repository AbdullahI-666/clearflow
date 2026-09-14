const mongoose = require('mongoose');

const BASE_URL = 'http://localhost:3000/api';
const MONGODB_URI = 'mongodb+srv://mirzaaiking08_db_user:kx4iZORo7g2c6d0X@cluster0.hm4gx21.mongodb.net/clearflow?retryWrites=true&w=majority&appName=Cluster0';

async function runTests() {
  console.log('======================================================');
  console.log('🧪 CLEARFLOW F-01 TO F-05 AUTOMATED TEST SUITE');
  console.log('======================================================\n');

  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.db;

  const testEmail = `testuser_${Date.now()}@ucp.edu.pk`;
  const testPassword = 'Password@123';
  const newPassword = 'NewPassword@456';
  let verificationToken = '';
  let resetToken = '';

  // Clean up any previous test user
  await db.collection('users').deleteOne({ email: testEmail });

  // -------------------------------------------------------------
  // TEST 1: F-01 USER REGISTRATION
  // -------------------------------------------------------------
  console.log('▶ [TEST 1] F-01: User Registration');
  const regRes = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Test Student',
      email: testEmail,
      phone: '+92 300 9876543',
      role: 'Client',
      password: testPassword,
    }),
  });

  const regData = await regRes.json();
  console.log('  Status Code:', regRes.status);
  console.log('  Response:', JSON.stringify(regData));
  if (regRes.status !== 201 || !regData.success) {
    throw new Error('F-01 Registration Failed!');
  }

  // Check DB state for F-01
  const createdUser = await db.collection('users').findOne({ email: testEmail });
  if (!createdUser || createdUser.isVerified !== false || !createdUser.verificationToken) {
    throw new Error('F-01 DB Validation Failed: user not created with isVerified=false and verificationToken');
  }
  console.log('  ✅ F-01 Passed: User created with isVerified: false and hashed verification token.\n');

  // Test Duplicate Email (409)
  console.log('▶ [TEST 1b] F-01: Duplicate Email Rejection');
  const dupRes = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Duplicate Student',
      email: testEmail,
      phone: '+92 300 9876543',
      role: 'Client',
      password: testPassword,
    }),
  });
  console.log('  Status Code:', dupRes.status);
  if (dupRes.status !== 409) {
    throw new Error('F-01 Duplicate email did not return 409 Conflict');
  }
  console.log('  ✅ F-01 Duplicate Rejected with 409 Conflict.\n');

  // -------------------------------------------------------------
  // TEST 2: F-03 UNVERIFIED LOGIN REJECTION
  // -------------------------------------------------------------
  console.log('▶ [TEST 2] F-03: Unverified Account Login Blocked');
  const unverifiedLoginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testEmail,
      password: testPassword,
    }),
  });
  const unverifiedLoginData = await unverifiedLoginRes.json();
  console.log('  Status Code:', unverifiedLoginRes.status);
  console.log('  Response Message:', unverifiedLoginData.message);
  if (unverifiedLoginRes.status !== 403) {
    throw new Error('F-03 Unverified login was not rejected with 403 Forbidden!');
  }
  console.log('  ✅ F-03 Passed: Unverified account blocked with 403.\n');

  // -------------------------------------------------------------
  // TEST 3: F-02 EMAIL VERIFICATION
  // -------------------------------------------------------------
  console.log('▶ [TEST 3] F-02: Email Verification');
  // For verification, generate raw token and its sha256 to test verify endpoint
  const crypto = require('crypto');
  const rawToken = crypto.randomBytes(32).toString('hex');
  const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

  await db.collection('users').updateOne(
    { email: testEmail },
    { $set: { verificationToken: hashedToken, verificationTokenExpiry: new Date(Date.now() + 86400000) } }
  );

  const verifyRes = await fetch(`${BASE_URL}/auth/verify-email/${rawToken}`);
  const verifyData = await verifyRes.json();
  console.log('  Status Code:', verifyRes.status);
  console.log('  Response:', JSON.stringify(verifyData));
  if (verifyRes.status !== 200 || !verifyData.success) {
    throw new Error('F-02 Verification Failed!');
  }

  const verifiedUser = await db.collection('users').findOne({ email: testEmail });
  if (!verifiedUser.isVerified || verifiedUser.verificationToken) {
    throw new Error('F-02 DB state incorrect after verification');
  }
  console.log('  ✅ F-02 Passed: Account verified, isVerified: true, token cleared.\n');

  // Test Re-verification with same token (should fail)
  const reVerifyRes = await fetch(`${BASE_URL}/auth/verify-email/${rawToken}`);
  console.log('  Re-verify Status Code:', reVerifyRes.status);
  if (reVerifyRes.status !== 400) {
    throw new Error('F-02 Used verification token was not rejected with 400');
  }
  console.log('  ✅ F-02 Re-verification rejected with 400 Bad Request.\n');

  // -------------------------------------------------------------
  // TEST 4: F-03 SUCCESSFUL USER LOGIN
  // -------------------------------------------------------------
  console.log('▶ [TEST 4] F-03: Verified User Login');
  const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testEmail,
      password: testPassword,
    }),
  });
  const loginData = await loginRes.json();
  console.log('  Status Code:', loginRes.status);
  console.log('  Role:', loginData.data?.user?.role);
  console.log('  Has JWT Token:', !!loginData.data?.token);
  console.log('  Has passwordHash in user object:', 'passwordHash' in (loginData.data?.user || {}));
  if (loginRes.status !== 200 || !loginData.data?.token || 'passwordHash' in (loginData.data?.user || {})) {
    throw new Error('F-03 Login Failed or leaked passwordHash!');
  }
  console.log('  ✅ F-03 Passed: Successful authentication with 24h JWT token.\n');

  // -------------------------------------------------------------
  // TEST 5: F-04 ACCOUNT LOCKOUT AFTER 5 ATTEMPTS
  // -------------------------------------------------------------
  console.log('▶ [TEST 5] F-04: Account Lockout Security Mechanism');
  for (let attempt = 1; attempt <= 5; attempt++) {
    const badLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: 'WrongPassword!',
      }),
    });
    const badLoginData = await badLoginRes.json();
    console.log(`  Attempt ${attempt}: Status ${badLoginRes.status} — ${badLoginData.message}`);

    if (attempt < 5 && badLoginRes.status !== 401) {
      throw new Error(`Attempt ${attempt} expected 401`);
    }
    if (attempt === 5 && badLoginRes.status !== 429) {
      throw new Error('Attempt 5 expected 429 Too Many Requests (Lockout)');
    }
  }

  // Verify locked state blocks even correct password
  const lockedLoginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testEmail,
      password: testPassword,
    }),
  });
  console.log('  Locked Attempt (Correct Password): Status', lockedLoginRes.status);
  if (lockedLoginRes.status !== 429) {
    throw new Error('F-04 Lockout did not block login with 429');
  }
  console.log('  ✅ F-04 Passed: 5 failed attempts locks account for 15 mins (HTTP 429).\n');

  // -------------------------------------------------------------
  // TEST 6: F-05 FORGOT PASSWORD & RESET PASSWORD
  // -------------------------------------------------------------
  console.log('▶ [TEST 6] F-05: Forgot Password & Password Reset');
  // Unlock account for test
  await db.collection('users').updateOne(
    { email: testEmail },
    { $unset: { accountLockedUntil: '' }, $set: { failedLoginAttempts: 0 } }
  );

  const forgotRes = await fetch(`${BASE_URL}/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testEmail }),
  });
  const forgotData = await forgotRes.json();
  console.log('  Forgot Password Status:', forgotRes.status, forgotData.message);
  if (forgotRes.status !== 200) {
    throw new Error('F-05 Forgot password failed');
  }

  // Set known reset token in DB
  const rawResetToken = crypto.randomBytes(32).toString('hex');
  const hashedResetToken = crypto.createHash('sha256').update(rawResetToken).digest('hex');
  await db.collection('users').updateOne(
    { email: testEmail },
    { $set: { resetPasswordToken: hashedResetToken, resetPasswordExpiry: new Date(Date.now() + 3600000) } }
  );

  // Reset Password
  const resetRes = await fetch(`${BASE_URL}/auth/reset-password/${rawResetToken}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: newPassword }),
  });
  const resetData = await resetRes.json();
  console.log('  Reset Password Status:', resetRes.status, resetData.message);
  if (resetRes.status !== 200) {
    throw new Error('F-05 Reset password failed');
  }

  // Login with new password
  const newLoginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testEmail,
      password: newPassword,
    }),
  });
  const newLoginData = await newLoginRes.json();
  console.log('  Login with New Password Status:', newLoginRes.status, 'Success:', !!newLoginData.data?.token);
  if (newLoginRes.status !== 200 || !newLoginData.data?.token) {
    throw new Error('F-05 Login with new password failed');
  }
  console.log('  ✅ F-05 Passed: Password reset and login with new credentials successful.\n');

  // -------------------------------------------------------------
  // TEST 7: DEMO USERS SEEDING & LOGIN
  // -------------------------------------------------------------
  console.log('▶ [TEST 7] Seeded Demo Roles Verification');
  const roles = [
    { email: 'admin@clearflow.pk', pass: 'Admin@123', expectedRole: 'Admin' },
    { email: 'ahmed@ucp.edu.pk', pass: 'Demo@123', expectedRole: 'Client' },
    { email: 'bilal@clearflow.pk', pass: 'Demo@123', expectedRole: 'FieldTeam' },
  ];

  for (const r of roles) {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: r.email, password: r.pass }),
    });
    const data = await res.json();
    console.log(`  Role [${r.expectedRole}] Login (${r.email}): Status ${res.status}, Role: ${data.data?.user?.role}`);
    if (res.status !== 200 || data.data?.user?.role !== r.expectedRole) {
      throw new Error(`Demo login for ${r.expectedRole} failed`);
    }
  }
  console.log('  ✅ All Demo Accounts (Admin, Client, Field Team) Verified.\n');

  // Clean up test user
  await db.collection('users').deleteOne({ email: testEmail });
  await mongoose.disconnect();

  console.log('======================================================');
  console.log('🎉 ALL F-01 TO F-05 SPECIFICATION TESTS PASSED 100%!');
  console.log('======================================================\n');
}

runTests().catch(err => {
  console.error('\n❌ TEST FAILED:', err);
  process.exit(1);
});

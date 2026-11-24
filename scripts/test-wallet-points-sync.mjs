const API_BASE = 'http://localhost:3000/api';

async function runPointsSyncTest() {
  console.log('======================================================');
  console.log('   CLEARFLOW WALLET & BIDDING POINTS SYNC TEST SUITE  ');
  console.log('======================================================\n');

  try {
    // 1. Worker Login
    console.log('--- 1. Worker Authentication ---');
    const workerRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'field@clearflow.com',
        password: 'Demo@123',
      }),
    });
    const workerJson = await workerRes.json();
    if (!workerJson.data?.token) throw new Error('Worker login failed: ' + JSON.stringify(workerJson));
    const workerToken = workerJson.data.token;
    const workerId = workerJson.data.user._id;
    console.log(`✅ Worker logged in: ${workerJson.data.user.name} (${workerId})`);

    const workerHeaders = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${workerToken}`,
    };

    // 2. Fetch Initial Wallet Balance
    console.log('\n--- 2. Initial Wallet Balance ---');
    const initRes = await fetch(`${API_BASE}/marketplace/wallet`, { headers: workerHeaders });
    const initJson = await initRes.json();
    const initialPoints = initJson.data.wallet.pointsBalance;
    console.log(`✅ Initial Points Balance: ${initialPoints} PTS`);

    // 3. Purchase Pro Crew Pack (+300 PTS)
    console.log('\n--- 3. Purchase Points (+300 PTS) ---');
    const buyRes = await fetch(`${API_BASE}/marketplace/wallet/purchase-points`, {
      method: 'POST',
      headers: workerHeaders,
      body: JSON.stringify({
        planName: 'Pro Crew Pack',
        points: 300,
        price: 750,
        pricePaid: 750,
        paymentMethod: 'JazzCash',
        accountInfo: 'JazzCash •••• 5678',
      }),
    });
    const buyJson = await buyRes.json();
    const afterBuyBalance = buyJson.data.newPointsBalance;
    console.log(`✅ After Purchase Balance: ${afterBuyBalance} PTS (Expected: ${initialPoints + 300})`);
    if (afterBuyBalance !== initialPoints + 300) {
      throw new Error(`Balance mismatch after purchase! Expected ${initialPoints + 300}, got ${afterBuyBalance}`);
    }

    // 4. Verify Wallet GET Endpoint confirms the new balance
    const verifyGet = await fetch(`${API_BASE}/marketplace/wallet`, { headers: workerHeaders });
    const verifyJson = await verifyGet.json();
    const verifiedPoints = verifyJson.data.wallet.pointsBalance;
    console.log(`✅ GET /marketplace/wallet confirms: ${verifiedPoints} PTS`);
    if (verifiedPoints !== afterBuyBalance) {
      throw new Error(`GET /marketplace/wallet mismatch! Expected ${afterBuyBalance}, got ${verifiedPoints}`);
    }

    // 5. Admin Login & Award Bonus Points (+50 PTS)
    console.log('\n--- 4. Admin Awards Bonus (+50 PTS) ---');
    const adminRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@clearflow.com',
        password: 'Admin@123',
      }),
    });
    const adminJson = await adminRes.json();
    const adminToken = adminJson.data.token;
    const adminHeaders = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    };

    const bonusRes = await fetch(`${API_BASE}/marketplace/admin/give-bonus`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        workOrderId: 'WO-2026-0001',
        technicianId: workerId,
        technicianName: 'Muhammad Ahsan',
        points: 50,
        reason: 'AI Inspection Excellence Bonus',
        cashBonus: 0,
      }),
    });
    const bonusJson = await bonusRes.json();
    const afterBonusBalance = bonusJson.data.newPointsBalance;
    console.log(`✅ After Admin Bonus Balance: ${afterBonusBalance} PTS (Expected: ${verifiedPoints + 50})`);
    if (afterBonusBalance !== verifiedPoints + 50) {
      throw new Error(`Balance mismatch after bonus! Expected ${verifiedPoints + 50}, got ${afterBonusBalance}`);
    }

    // 6. Worker verifies the bonus is reflected in their wallet
    const workerPostBonus = await fetch(`${API_BASE}/marketplace/wallet`, { headers: workerHeaders });
    const workerPostBonusJson = await workerPostBonus.json();
    const workerBonusPoints = workerPostBonusJson.data.wallet.pointsBalance;
    console.log(`✅ Worker GET /marketplace/wallet post-bonus confirms: ${workerBonusPoints} PTS`);
    if (workerBonusPoints !== afterBonusBalance) {
      throw new Error(`Post-bonus verification failed! Expected ${afterBonusBalance}, got ${workerBonusPoints}`);
    }

    console.log('\n======================================================');
    console.log('🎉 ALL POINTS & WALLET SYNCHRONIZATION TESTS PASSED!   ');
    console.log('======================================================');
  } catch (err) {
    console.error('❌ Test failed:', err.message);
    process.exit(1);
  }
}

runPointsSyncTest();

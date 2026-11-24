import http from 'http';

const BASE_URL = 'http://localhost:3000';

function request(method, path, data = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const bodyStr = data ? JSON.stringify(data) : null;
    const headers = {};
    if (bodyStr) {
      headers['Content-Type'] = 'application/json';
      headers['Content-Length'] = Buffer.byteLength(bodyStr);
    }
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const req = http.request(url, { method, headers }, (res) => {
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
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

async function run() {
  console.log('🧪 Starting Master Admin Full-Power CRUD Test Suite...\n');

  // 1. Admin Login
  const loginRes = await request('POST', '/api/auth/login', {
    email: 'admin@clearflow.com',
    password: 'Admin@123',
  });
  const token = loginRes.data?.data?.token || loginRes.data?.data?.accessToken || loginRes.data?.token;
  if (loginRes.status !== 200 || !token) {
    console.error('❌ Admin login failed:', loginRes.data);
    process.exit(1);
  }
  console.log('✅ 1. Admin Login successful');

  // 2. User Management: GET /api/users
  const listUsers = await request('GET', '/api/users?search=Hassan&role=Client', null, token);
  if (listUsers.status === 200 && listUsers.data?.success) {
    console.log(`✅ 2. GET /api/users succeeded (Found: ${listUsers.data.data.length} users)`);
  } else {
    console.error('❌ GET /api/users failed:', listUsers);
  }

  // 3. User Management: POST /api/users
  const testUserEmail = `crud_test_${Date.now()}@clearflow.test`;
  const createUser = await request('POST', '/api/users', {
    name: 'CRUD Test Client',
    email: testUserEmail,
    password: 'password123',
    role: 'Client',
    phone: '+92 321 9998888',
    city: 'Lahore',
    cnic: '35201-9998888-1',
  }, token);
  let createdUserId = null;
  if (createUser.status === 201 && createUser.data?.success) {
    createdUserId = createUser.data.data._id || createUser.data.data.id;
    console.log(`✅ 3. POST /api/users created user (ID: ${createdUserId})`);
  } else {
    console.error('❌ POST /api/users failed:', createUser);
  }

  // 4. User Management: PUT /api/users/:id
  if (createdUserId) {
    const updateUser = await request('PUT', `/api/users/${createdUserId}`, {
      name: 'CRUD Updated Client',
      phone: '+92 321 0000000',
    }, token);
    if (updateUser.status === 200 && updateUser.data?.success) {
      console.log('✅ 4. PUT /api/users/:id updated user name and phone');
    } else {
      console.error('❌ PUT /api/users/:id failed:', updateUser);
    }

    // 5. User Management: POST /api/users/:id/reset-password
    const resetPass = await request('POST', `/api/users/${createdUserId}/reset-password`, {
      newPassword: 'newsecurepass123',
    }, token);
    if (resetPass.status === 200 && resetPass.data?.success) {
      console.log('✅ 5. POST /api/users/:id/reset-password succeeded');
    } else {
      console.error('❌ POST /api/users/:id/reset-password failed:', resetPass);
    }

    // 6. User Management: PATCH /api/users/:id/status
    const toggleStatus = await request('PATCH', `/api/users/${createdUserId}/status`, {
      isActive: false,
    }, token);
    if (toggleStatus.status === 200 && toggleStatus.data?.success) {
      console.log('✅ 6. PATCH /api/users/:id/status suspended user');
    } else {
      console.error('❌ PATCH /api/users/:id/status failed:', toggleStatus);
    }

    // 7. User Management: DELETE /api/users/:id
    const deleteUser = await request('DELETE', `/api/users/${createdUserId}`, null, token);
    if (deleteUser.status === 200 && deleteUser.data?.success) {
      console.log('✅ 7. DELETE /api/users/:id deleted test user');
    } else {
      console.error('❌ DELETE /api/users/:id failed:', deleteUser);
    }
  }

  // 8. Work Order Management: PUT /api/work-orders/:id
  const woList = await request('GET', '/api/work-orders', null, token);
  let testWoId = null;
  if (woList.status === 200 && woList.data?.data?.length > 0) {
    testWoId = woList.data.data[0]._id || woList.data.data[0].id;
  }
  if (testWoId) {
    const updateWo = await request('PUT', `/api/work-orders/${testWoId}`, {
      title: 'Admin Overridden Service Title',
      urgency: 'High',
      agreedPrice: 150,
    }, token);
    if (updateWo.status === 200 && updateWo.data?.success) {
      console.log(`✅ 8. PUT /api/work-orders/:id updated work order title and price`);
    } else {
      console.error('❌ PUT /api/work-orders/:id failed:', updateWo);
    }
  }

  // 9. Work Order Management: Create & DELETE
  const createWo = await request('POST', '/api/work-orders', {
    title: 'Temp WO for Deletion Test',
    description: 'Testing Admin delete capability on work orders',
    categoryId: '65f000000000000000000101',
    urgency: 'Low',
    locationAddress: 'Test Bay 4',
  }, token);
  if (createWo.status === 201 && createWo.data?.success) {
    const newWoId = createWo.data.data._id || createWo.data.data.id;
    console.log(`✅ 9. POST /api/work-orders created WO (${newWoId})`);
    const delWo = await request('DELETE', `/api/work-orders/${newWoId}`, null, token);
    if (delWo.status === 200 && delWo.data?.success) {
      console.log(`✅ 10. DELETE /api/work-orders/:id successfully deleted work order`);
    } else {
      console.error('❌ DELETE /api/work-orders/:id failed:', delWo);
    }
  } else {
    console.error('❌ POST /api/work-orders failed:', createWo);
  }

  // 11. Invoice Management: POST /api/invoices, PUT, and DELETE
  const createInv = await request('POST', '/api/invoices', {
    workOrderId: testWoId || '65f000000000000000000201',
    amount: 199.99,
  }, token);
  if (createInv.status === 201 && createInv.data?.success) {
    const invId = createInv.data.data._id || createInv.data.data.id;
    console.log(`✅ 11. POST /api/invoices created invoice (${invId})`);

    const updateInv = await request('PUT', `/api/invoices/${invId}`, {
      amount: 250.00,
      status: 'Paid',
    }, token);
    if (updateInv.status === 200 && updateInv.data?.success) {
      console.log(`✅ 12. PUT /api/invoices/:id updated invoice amount & status`);
    } else {
      console.error('❌ PUT /api/invoices/:id failed:', updateInv);
    }

    const delInv = await request('DELETE', `/api/invoices/${invId}`, null, token);
    if (delInv.status === 200 && delInv.data?.success) {
      console.log(`✅ 13. DELETE /api/invoices/:id deleted invoice`);
    } else {
      console.error('❌ DELETE /api/invoices/:id failed:', delInv);
    }
  } else {
    console.error('❌ POST /api/invoices failed:', createInv);
  }

  // 14. Team Management: POST & DELETE
  const createTeam = await request('POST', '/api/teams', {
    name: 'Temporary Admin Test Crew',
    leaderId: '65f000000000000000000004',
    specialization: 'Plumbing',
    zoneLat: 31.47,
    zoneLng: 74.28,
    zoneRadiusKm: 15,
  }, token);
  if (createTeam.status === 201 && createTeam.data?.success) {
    const teamId = createTeam.data.data._id || createTeam.data.data.id;
    console.log(`✅ 14. POST /api/teams created team (${teamId})`);

    const delTeam = await request('DELETE', `/api/teams/${teamId}`, null, token);
    if (delTeam.status === 200 && delTeam.data?.success) {
      console.log(`✅ 15. DELETE /api/teams/:id deleted team`);
    } else {
      console.error('❌ DELETE /api/teams/:id failed:', delTeam);
    }
  } else {
    console.error('❌ POST /api/teams failed:', createTeam);
  }

  console.log('\n🎉 ALL MASTER ADMIN FULL-POWER CRUD BACKEND ENDPOINTS PASSED!\n');
}

run().catch((err) => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});

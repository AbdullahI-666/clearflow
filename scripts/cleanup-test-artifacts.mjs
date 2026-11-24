import fs from 'fs';
import path from 'path';
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

const usersFiles = [
  path.resolve('data', 'users.json'),
  path.resolve('server', 'data', 'users.json'),
  path.resolve('server', 'server', 'data', 'users.json'),
];

const overridesFiles = [
  path.resolve('data', 'user_overrides.json'),
  path.resolve('server', 'data', 'user_overrides.json'),
  path.resolve('server', 'server', 'data', 'user_overrides.json'),
];

console.log('--- CLEANING TEST DATA ---');

// 1. Clean users.json files
for (const file of usersFiles) {
  if (fs.existsSync(file)) {
    try {
      const raw = fs.readFileSync(file, 'utf-8');
      const users = JSON.parse(raw);
      const cleaned = users.filter(u => {
        const email = (u.email || '').toLowerCase();
        const name = (u.name || '').toLowerCase();
        const isTest = email.includes('.flow.') ||
                       email.includes('unverified.') ||
                       email.includes('device.user.') ||
                       email.includes('testuser_') ||
                       email.includes('test_oauth_check') ||
                       email.includes('sara') ||
                       email.includes('hamza') ||
                       email.includes('hassan') ||
                       email.includes('bilal') ||
                       name.includes('sara') ||
                       name.includes('hamza') ||
                       name.includes('hassan') ||
                       name.includes('bilal');
        return !isTest;
      });

      fs.writeFileSync(file, JSON.stringify(cleaned, null, 2), 'utf-8');
      console.log(`Cleaned ${file}: now has ${cleaned.length} users.`);
    } catch (e) {
      console.error('Error cleaning', file, e.message);
    }
  }
}

// 2. Clean user_overrides.json files
for (const file of overridesFiles) {
  if (fs.existsSync(file)) {
    try {
      const raw = fs.readFileSync(file, 'utf-8');
      const obj = JSON.parse(raw);
      const cleanedObj = {};
      for (const [k, v] of Object.entries(obj)) {
        const lowerK = k.toLowerCase();
        const lowerName = (v?.name || '').toLowerCase();
        const isTest = lowerK.includes('.flow.') ||
                       lowerK.includes('unverified.') ||
                       lowerK.includes('device.user.') ||
                       lowerK.includes('testuser_') ||
                       lowerK.includes('test_oauth_check') ||
                       lowerK.includes('sara') ||
                       lowerK.includes('hamza') ||
                       lowerK.includes('hassan') ||
                       lowerK.includes('bilal') ||
                       lowerName.includes('sara') ||
                       lowerName.includes('hamza') ||
                       lowerName.includes('hassan') ||
                       lowerName.includes('bilal') ||
                       v?.role === 'Client' ||
                       v?.role === 'FieldTeam' ||
                       v?.role === 'Worker';
        if (!isTest) {
          cleanedObj[k] = v;
        }
      }
      fs.writeFileSync(file, JSON.stringify(cleanedObj, null, 2), 'utf-8');
      console.log(`Cleaned ${file}: now has ${Object.keys(cleanedObj).length} entries.`);
    } catch (e) {
      console.error('Error cleaning', file, e.message);
    }
  }
}

console.log('Clean completed successfully.');

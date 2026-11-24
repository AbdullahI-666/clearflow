import { dbQuery } from '../server/src/config/db.js';

async function check() {
  try {
    const rows = await dbQuery("SELECT id, name, email, role, cnic, is_verified FROM users WHERE email LIKE '%flow%' OR email LIKE '%unverified%'");
    console.log('DB test users count:', rows.length);
    console.log(rows);
  } catch (err) {
    console.log('DB query error:', err.message);
  }
  process.exit(0);
}

check();

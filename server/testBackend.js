// Automated backend diagnostics for Stage 3
// Usage: node testBackend.js
// Make sure to `npm install axios` in the server folder before running

import axios from 'axios';

const BASE = process.env.BASE_URL || 'http://localhost:5000';

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function run() {
  console.log('Stage 3 Backend Diagnostic Script');
  console.log('Base URL:', BASE);

  try {
    console.log('\n1) Checking server root /');
    const root = await axios.get(`${BASE}/`);
    console.log('  Root status:', root.status, 'data:', root.data);
  } catch (err) {
    console.error('  Root failed:', err.message);
  }

  try {
    console.log('\n2) Checking DB connection state (GET /api/auth/test-db)');
    const db = await axios.get(`${BASE}/api/auth/test-db`);
    console.log('  DB state:', db.data);
  } catch (err) {
    console.error('  DB check failed:', err.message);
  }

  try {
    console.log('\n3) Checking User model (GET /api/auth/test-model)');
    const model = await axios.get(`${BASE}/api/auth/test-model`);
    console.log('  Model check:', model.data);
  } catch (err) {
    console.error('  Model check failed:', err.message);
  }

  // Sample users
  const userA = { name: 'Test User A', email: 'testA@example.com', password: 'passwordA', preferredLanguage: 'en' };
  const userB = { name: 'Test User B', email: 'testB@example.com', password: 'passwordB', preferredLanguage: 'es' };

  try {
    console.log('\n4) Registering sample user A');
    const regA = await axios.post(`${BASE}/api/auth/register`, userA).catch(e => e.response || e);
    if (regA.status === 201) {
      console.log('  Register A success:', regA.data.email || regA.data);
    } else {
      console.log('  Register A response:', regA.status, regA.data || regA);
    }
  } catch (err) {
    console.error('  Register A failed:', err.message);
  }

  await wait(500);

  try {
    console.log('\n5) Logging in sample user A');
    const loginA = await axios.post(`${BASE}/api/auth/login`, { email: userA.email, password: userA.password });
    console.log('  Login A success, token length:', loginA.data.token?.length || 'none');
    const token = loginA.data.token;

    console.log('\n6) Accessing protected route with token (GET /api/auth/test-protected)');
    const prot = await axios.get(`${BASE}/api/auth/test-protected`, { headers: { Authorization: `Bearer ${token}` } });
    console.log('  Protected response:', prot.status, prot.data);

    console.log('\n7) Verifying preferredLanguage saved on user A');
    console.log('  preferredLanguage from login response:', loginA.data.preferredLanguage);
  } catch (err) {
    console.error('  Login or protected request failed:', err.message);
  }

  // Password hashing demonstration via test-hash
  try {
    console.log('\n8) Testing password hashing endpoint (POST /api/auth/test-hash)');
    const hashRes = await axios.post(`${BASE}/api/auth/test-hash`, { password: 'demo' });
    console.log('  Hash example:', hashRes.data.hash?.slice(0, 30) + '...');
  } catch (err) {
    console.error('  Test-hash failed:', err.message);
  }

  console.log('\nDiagnostics complete.');
}

run().catch((err) => {
  console.error('Script error:', err);
  process.exit(1);
});

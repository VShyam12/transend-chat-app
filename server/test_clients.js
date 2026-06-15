import fetch from 'node-fetch';
import { io } from 'socket.io-client';

const API_BASE = 'http://localhost:5000';

async function ensureUser(name, email) {
  try {
    const res = await fetch(`${API_BASE}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password: 'password', preferredLanguage: 'en' }),
    });
    const data = await res.json();
    if (res.status === 201) {
      console.log(`Registered ${email} id=${data._id}`);
      return data;
    }
    if (data && data._id) return data;
    // If user exists, attempt login
  } catch (e) {
    // ignore
  }

  const loginRes = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'password' }),
  });
  const loginData = await loginRes.json();
  if (loginRes.ok) {
    console.log(`Logged in ${email} id=${loginData._id}`);
    return loginData;
  }
  throw new Error('Failed to ensure user ' + email + ' ' + JSON.stringify(loginData));
}

(async () => {
  try {
    const justin = await ensureUser('Justin', 'justin@test.local');
    const speed = await ensureUser('Speed', 'speed@test.local');

    const justinToken = `Bearer ${justin.token}`;
    const speedToken = `Bearer ${speed.token}`;

    const jsock = io(API_BASE, { auth: { token: justinToken } });
    const ssock = io(API_BASE, { auth: { token: speedToken } });

    jsock.on('connect', () => console.log('justin connected', jsock.id));
    ssock.on('connect', () => console.log('speed connected', ssock.id));

    jsock.on('connected', (p) => console.log('justin: connected payload', p));
    ssock.on('connected', (p) => console.log('speed: connected payload', p));

    jsock.on('messageStatusUpdate', (p) => console.log('justin: status update', p));
    ssock.on('messageStatusUpdate', (p) => console.log('speed: status update', p));

    jsock.on('receiveMessage', (p) => {
      console.log('justin received message (should be false):', p);
    });
    ssock.on('receiveMessage', (p) => {
      console.log('speed received message:', p);
    });

    // Wait for both to connect
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Both open each other's chat
    jsock.emit('chatOpened', { senderId: speed._id });
    ssock.emit('chatOpened', { senderId: justin._id });

    console.log('Both clients emitted chatOpened');

    // Wait a bit to let server mark reads
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Justin sends message to Speed
    jsock.emit('sendMessage', { receiverId: speed._id, message: 'Hello Speed!', clientMessageId: 'test-cid-1' });
    console.log('justin sent message to speed');

    // Wait to observe status updates
    await new Promise((resolve) => setTimeout(resolve, 5000));

    jsock.close();
    ssock.close();
    process.exit(0);
  } catch (err) {
    console.error('Test failed', err);
    process.exit(1);
  }
})();

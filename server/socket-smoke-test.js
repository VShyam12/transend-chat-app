import axios from 'axios';
import { io } from 'socket.io-client';

const API_BASE = 'http://localhost:5000/api';

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const createUser = async (nameSuffix) => {
  const email = `test+${Date.now()}_${Math.random().toString(36).slice(2,6)}@example.com`;
  const body = {
    name: `TestUser-${nameSuffix}`,
    email,
    password: 'password123',
    preferredLanguage: 'en'
  };

  const res = await axios.post(`${API_BASE}/auth/register`, body).catch(e => e.response && e.response.data ? e.response.data : Promise.reject(e));
  return res.data || res;
};

const run = async () => {
  console.log('Starting socket smoke test...');

  const userA = await createUser('A');
  const userB = await createUser('B');

  console.log('Created users:', userA._id, userB._id);

  const socketA = io('http://localhost:5000', { auth: { token: userA.token }, transports: ['websocket'] });
  const socketB = io('http://localhost:5000', { auth: { token: userB.token }, transports: ['websocket'] });

  socketA.on('connect', () => console.log('SocketA connected', socketA.id));
  socketB.on('connect', () => console.log('SocketB connected', socketB.id));

  socketA.on('connected', (p) => console.log('SocketA received connected:', p));
  socketB.on('connected', (p) => console.log('SocketB received connected:', p));

  socketA.on('userConnected', (p) => console.log('SocketA userConnected event:', p));
  socketB.on('userConnected', (p) => console.log('SocketB userConnected event:', p));

  socketA.on('typing', (p) => console.log('SocketA typing event:', p));
  socketB.on('typing', (p) => console.log('SocketB typing event:', p));

  socketA.on('receiveMessage', (m) => { console.log('SocketA receiveMessage:', m); });
  socketB.on('receiveMessage', (m) => { console.log('SocketB receiveMessage:', m); });

  socketA.on('messageSent', (m) => { console.log('SocketA messageSent:', m); });
  socketB.on('messageSent', (m) => { console.log('SocketB messageSent:', m); });

  socketA.on('reactionUpdated', (m) => console.log('SocketA reactionUpdated', m.id, m.reactions));
  socketB.on('reactionUpdated', (m) => console.log('SocketB reactionUpdated', m.id, m.reactions));

  socketA.on('reactionToggled', (p) => console.log('SocketA reactionToggled', p));
  socketB.on('reactionToggled', (p) => console.log('SocketB reactionToggled', p));

  socketA.on('socketError', (e) => console.error('SocketA error:', e));
  socketB.on('socketError', (e) => console.error('SocketB error:', e));

  // Give sockets a moment to connect and notify presence
  await sleep(1000);

  // Typing test: A -> B
  console.log('Emit typing from A to B');
  socketA.emit('typing', { receiverId: userB._id, isTyping: true });
  await sleep(500);
  socketA.emit('typing', { receiverId: userB._id, isTyping: false });
  await sleep(500);

  // Send message A -> B
  console.log('Send message from A to B');
  let sentMessage = null;
  socketB.once('receiveMessage', (m) => { console.log('B received message id=', m.id); sentMessage = m; });
  socketA.emit('sendMessage', { receiverId: userB._id, message: 'Hello from A (smoke test)', clientMessageId: 'c1' });
  await sleep(1000);

  if (!sentMessage) {
    console.error('Message not delivered to B');
  } else {
    // Reaction toggle: B toggles 👍 on the message
    console.log('B toggles reaction 👍 on message');
    socketB.emit('toggleReaction', { messageId: sentMessage.id, emoji: '👍' });
    await sleep(1000);

    console.log('B toggles reaction 👍 again to remove');
    socketB.emit('toggleReaction', { messageId: sentMessage.id, emoji: '👍' });
    await sleep(1000);
  }

  // Clean up
  socketA.disconnect();
  socketB.disconnect();
  console.log('Socket smoke test complete.');
  process.exit(0);
};

run().catch(err => {
  console.error('Smoke test failed:', err && err.response ? err.response.data : err);
  process.exit(1);
});

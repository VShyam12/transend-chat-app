import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { connectDB } from './config/db.js';
import userRoutes from './routes/userRoutes.js';
import authRoutes from './routes/authRoutes.js';
import messageRoutes from './routes/messageRoutes.js';
import groupRoutes from './routes/groupRoutes.js';
import { initializeSocket } from './socketHandler.js';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: ["http://localhost:3000", "http://localhost:3001", "http://localhost:5173"],
    methods: ["GET", "POST"]
  }
});

initializeSocket(io);

app.use(cors({
  origin: ["http://localhost:3000", "http://localhost:3001", "http://localhost:5173"],
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]
}));
app.use(express.json());

// Serve uploaded files from /uploads
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsPath = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsPath)) {
  fs.mkdirSync(uploadsPath, { recursive: true });
}
app.use('/uploads', express.static(uploadsPath));

app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

app.get('/', (req, res) => res.send('Server OK'));
app.use('/api/users', userRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/groups', groupRoutes);

app.use((err, req, res, next) => {
  console.error('Error:', err);
  // In development, return the real error message to help debugging
  const status = res.statusCode && res.statusCode !== 200 ? res.statusCode : 500;
  const isDev = process.env.NODE_ENV !== 'production';
  res.status(status).json({
    error: isDev ? (err.message || 'Internal server error') : 'Internal server error'
  });
});

const PORT = process.env.PORT || 5000;

const start = async () => {
  try {
    // Set a 5-second timeout for MongoDB connection
    const dbConnection = Promise.race([
      connectDB(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Database connection timeout')), 5000)
      )
    ]).catch(err => {
      console.warn('Warning: Database connection failed:', err.message);
      console.warn('Continuing without database...');
    });

    // Start server immediately without waiting for DB
    const maxAttempts = 5;
    const basePort = Number(process.env.PORT) || 5000;

    const attemptListen = (port) => new Promise((resolve, reject) => {
      const handleError = (err) => {
        httpServer.off('error', handleError);
        reject(err);
      };

      const handleListening = () => {
        httpServer.off('error', handleError);
        resolve(port);
      };

      httpServer.once('error', handleError);
      httpServer.listen(port, handleListening);
    });

    let started = false;
    for (let attempt = 0; attempt < maxAttempts && !started; attempt++) {
      const portToTry = basePort + attempt;
      try {
        const listeningPort = await attemptListen(portToTry);
        started = true;
        console.log(`Server listening on port ${listeningPort}`);
        console.log('Available routes:');
        console.log('- GET / (health check)');
        console.log('- GET /api/users/test (API test)');
        console.log('- POST /api/messages');
        console.log('- GET /api/messages/:userId');
      } catch (err) {
        if (err && err.code === 'EADDRINUSE') {
          console.warn(`Port ${portToTry} in use, trying port ${portToTry + 1}`);
          continue;
        }

        console.error('Server listen error:', err);
        break;
      }
    }

    // Try to connect to DB in background
    await dbConnection;

  } catch (err) {
    console.error('Server error:', err.message);
    // Don't exit on error, just log it
  }
};

// Start server and handle any uncaught errors
start().catch(err => console.error('Startup error:', err.message));

export { io };
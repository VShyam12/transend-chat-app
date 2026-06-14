import asyncHandler from 'express-async-handler';
import mongoose from 'mongoose';
import User from '../models/userModel.js';
import bcrypt from 'bcryptjs';

// @desc Check DB connection state
// @route GET /api/auth/test-db
// @access Public
const testDB = asyncHandler(async (req, res) => {
  const state = mongoose.connection.readyState; // 0 disconnected, 1 connected
  const stateMap = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' };
  console.log(`DB connection state: ${stateMap[state] || state}`);
  res.json({ state: stateMap[state] || state });
});

// @desc Check User model existence and basic schema info
// @route GET /api/auth/test-model
// @access Public
const testModel = asyncHandler(async (req, res) => {
  try {
    const paths = Object.keys(User.schema.paths);
    console.log('User model paths:', paths.join(', '));
    res.json({ exists: true, paths });
  } catch (err) {
    console.log('User model check failed:', err.message);
    res.status(500).json({ exists: false, error: err.message });
  }
});

// @desc Return hashed password for given plain password (demo only)
// @route POST /api/auth/test-hash
// @access Public
const testHash = asyncHandler(async (req, res) => {
  const { password } = req.body;
  if (!password) {
    res.status(400);
    throw new Error('Provide a password in the request body');
  }
  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash(password, salt);
  console.log('Password hashing demo for provided password');
  res.json({ hash });
});

// @desc Protected test route
// @route GET /api/auth/test-protected
// @access Protected
const testProtected = asyncHandler(async (req, res) => {
  // req.user is attached by auth middleware
  console.log('Protected route accessed by user:', req.user?._id);
  res.json({ ok: true, user: req.user });
});

export { testDB, testModel, testHash, testProtected };

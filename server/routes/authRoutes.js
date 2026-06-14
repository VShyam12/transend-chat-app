import express from 'express';
import { registerUser, loginUser } from '../controllers/authController.js';
import { testDB, testModel, testHash, testProtected } from '../controllers/authTestController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Primary auth endpoints
router.post('/signup', registerUser);
router.post('/register', registerUser); // alias
router.post('/login', loginUser);

// Test & debug endpoints (minimal, dev-only)
router.get('/test-db', testDB);
router.get('/test-model', testModel);
router.post('/test-hash', testHash);

// Protected test route
router.get('/test-protected', protect, testProtected);

export default router;

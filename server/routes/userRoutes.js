import express from 'express';
import mongoose from 'mongoose';
import { protect } from '../middleware/authMiddleware.js';
import { getOnlineUsers, getUsers, updatePreferredLanguage } from '../controllers/userController.js';

const router = express.Router();

router.get('/', protect, getUsers);
router.get('/online', protect, getOnlineUsers);
router.patch('/language', protect, updatePreferredLanguage);

// Existing test route
router.get('/test', (req, res) => {
    res.json({ success: true, message: 'users route reachable' });
});

// New database verification route
router.get('/dbtest', async (req, res) => {
    try {
        const dbStatus = {
            isConnected: mongoose.connection.readyState === 1,
            database: mongoose.connection.db.databaseName,
            host: mongoose.connection.host,
            collections: await mongoose.connection.db.listCollections().toArray()
        };
        
        res.json({
            status: 'Success',
            message: 'Database connection verified',
            details: dbStatus,
            collections: dbStatus.collections.map(col => col.name)
        });
    } catch (error) {
        res.status(500).json({
            status: 'Error',
            message: 'Database verification failed',
            error: error.message
        });
    }
});

export default router;

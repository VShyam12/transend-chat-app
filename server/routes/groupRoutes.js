import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import upload from '../middleware/upload.js';
import { createGroup, createGroupMessage, getGroupMessages, getGroups, leaveGroup, renameGroup } from '../controllers/groupController.js';

const router = express.Router();

router.get('/', protect, getGroups);
router.post('/', protect, createGroup);
router.get('/:groupId/messages', protect, getGroupMessages);
router.post('/:groupId/messages', protect, upload.single('file'), createGroupMessage);
router.patch('/:groupId', protect, renameGroup);
router.delete('/:groupId/leave', protect, leaveGroup);

export default router;
import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import upload from '../middleware/upload.js';
import { getMessages, getChats, markMessagesAsRead, sendMessage, uploadFile, uploadAudio, toggleReaction, deleteMessage, editMessage } from '../controllers/messageController.js';

const router = express.Router();

router.post('/', protect, sendMessage);
router.post('/upload', protect, upload.single('file'), uploadFile);
router.post('/upload-audio', protect, upload.single('audio'), uploadAudio);
router.get('/chats', protect, getChats);
router.patch('/read/:userId', protect, markMessagesAsRead);
router.patch('/:messageId/reactions', protect, toggleReaction);
router.patch('/:messageId', protect, editMessage);
router.delete('/:messageId', protect, deleteMessage);
router.get('/:userId', protect, getMessages);

export default router;
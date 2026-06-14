import asyncHandler from 'express-async-handler';
import User from '../models/userModel.js';
import { connectedUsers } from '../socketHandler.js';

// @desc    Get all users except logged-in user
// @route   GET /api/users
// @access  Private
const getUsers = asyncHandler(async (req, res) => {
	const users = await User.find({ _id: { $ne: req.user._id } })
		.select('_id name email preferredLanguage')
		.sort({ name: 1 });

	res.json({ users });
});

// @desc    Get online users except logged-in user
// @route   GET /api/users/online
// @access  Private
const getOnlineUsers = asyncHandler(async (req, res) => {
	const currentUserId = String(req.user._id);
	const onlineUserIds = Array.from(connectedUsers.keys()).filter(
		(userId) => userId !== currentUserId
	);

	if (onlineUserIds.length === 0) {
		res.json({ users: [] });
		return;
	}

	const users = await User.find({ _id: { $in: onlineUserIds } })
		.select('_id name email preferredLanguage')
		.sort({ name: 1 });

	res.json({ users });
});

// @desc    Update current user's preferred language
// @route   PATCH /api/users/language
// @access  Private
const updatePreferredLanguage = asyncHandler(async (req, res) => {
	const preferredLanguage = typeof req.body?.preferredLanguage === 'string'
		? req.body.preferredLanguage.trim()
		: '';

	if (!preferredLanguage) {
		res.status(400);
		throw new Error('preferredLanguage is required');
	}

	const updatedUser = await User.findByIdAndUpdate(
		req.user._id,
		{ preferredLanguage },
		{ new: true, runValidators: true }
	).select('_id name email preferredLanguage');

	if (!updatedUser) {
		res.status(404);
		throw new Error('User not found');
	}

	res.json({
		success: true,
		user: updatedUser,
	});
});

export { getUsers, getOnlineUsers, updatePreferredLanguage };

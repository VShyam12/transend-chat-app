import asyncHandler from 'express-async-handler';
import Message from '../models/Message.js';
import Group from '../models/Group.js';
import GroupMessage from '../models/GroupMessage.js';
import User from '../models/userModel.js';
import { connectedUsers, emitToUser, serializeMessage } from '../socketHandler.js';
import { io } from '../index.js';
import { translateText } from '../utils/translate.js';

const resolveImageUrl = (payload = {}) => {
  const candidate = payload.imageUrl ?? payload.fileUrl ?? payload.image ?? null;
  if (typeof candidate !== 'string') {
    return null;
  }

  const trimmed = candidate.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const toPlainMap = (value) => {
  if (!value) {
    return {};
  }

  if (value instanceof Map) {
    return Object.fromEntries(value.entries());
  }

  if (typeof value === 'object') {
    return { ...value };
  }

  return {};
};

const createMessage = async (payload) => {
  const { senderId, receiverId, message, translated, isRead = false, imageUrl = null } = payload;

  const messageDocument = await Message.create({
    senderId,
    receiverId,
    message,
    translated,
    isRead,
    imageUrl,
  });

  return messageDocument;
};

const formatDeletedMessage = (messageDocument) => {
  const serialized = serializeMessage(messageDocument);

  return {
    ...serialized,
    message: 'This message was deleted',
    text: 'This message was deleted',
    imageUrl: null,
    deleted: true,
  };
};

const sendMessage = asyncHandler(async (req, res) => {
  const senderId = req.user._id;
  const { receiverId, message, translated } = req.body;
  const imageUrl = resolveImageUrl(req.body);

  if (!receiverId || (!message && !imageUrl)) {
    res.status(400);
    throw new Error('receiverId and either message or imageUrl are required');
  }

  const receiver = await User.findById(receiverId).select('_id preferredLanguage');
  if (!receiver) {
    res.status(404);
    throw new Error('Receiver not found');
  }

  console.log('Receiver language:', receiver.preferredLanguage);

  const senderLanguage = req.user.preferredLanguage || 'en';
  const receiverLanguage = receiver.preferredLanguage || 'en';
  const translatedMap = {
    ...(translated && typeof translated === 'object' ? translated : {}),
  };

  if (message && (receiverLanguage !== senderLanguage || receiverLanguage !== 'en')) {
    try {
      const translatedText = await translateText(message, receiverLanguage);
      if (translatedText) {
        translatedMap[receiverLanguage] = translatedText;
      }
    } catch (translationError) {
      console.warn('Message translation failed:', translationError?.message || translationError);
    }
  }

  const messageDocument = await createMessage({
    senderId,
    receiverId,
    message,
    translated: translatedMap,
    isRead: false,
    imageUrl: imageUrl || null,
  });

  const populatedMessage = await Message.findById(messageDocument._id)
    .populate('senderId', 'name email preferredLanguage')
    .populate('receiverId', 'name email preferredLanguage');

  const formattedMessage = serializeMessage(populatedMessage);
  formattedMessage.clientMessageId = req.body.clientMessageId || undefined;
  formattedMessage.imageUrl = formattedMessage.imageUrl || null;

  emitToUser(String(receiverId), 'receiveMessage', {
    ...formattedMessage,
    imageUrl: formattedMessage.imageUrl,
  });

  res.status(201).json({
    success: true,
    message: formattedMessage,
  });
});

const getMessages = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const currentUserId = req.user._id;

  const messages = await Message.find({
    $or: [
      { senderId: currentUserId, receiverId: userId },
      { senderId: userId, receiverId: currentUserId },
    ],
  })
    .populate('senderId', 'name email preferredLanguage')
    .populate('receiverId', 'name email preferredLanguage')
    .sort({ createdAt: 1 });

  res.json({
    success: true,
    messages: messages.map((messageDocument) => (
      messageDocument.deleted ? formatDeletedMessage(messageDocument) : serializeMessage(messageDocument)
    )),
  });
});

const deleteMessage = asyncHandler(async (req, res) => {
  const { messageId } = req.params;
  const currentUserId = String(req.user?._id || req.user?.id || '');

  if (!messageId) {
    res.status(400);
    throw new Error('messageId is required');
  }

  const messageDocument = await Message.findById(messageId);

  if (!messageDocument) {
    res.status(404);
    throw new Error('Message not found');
  }

  if (String(messageDocument.senderId) !== currentUserId) {
    res.status(403);
    throw new Error('You can only delete your own messages');
  }

  if (!messageDocument.deleted) {
    messageDocument.deleted = true;
    messageDocument.deletedAt = new Date();
    await messageDocument.save();
  }

  const populatedMessage = await Message.findById(messageDocument._id)
    .populate('senderId', 'name email preferredLanguage')
    .populate('receiverId', 'name email preferredLanguage');

  const formattedMessage = formatDeletedMessage(populatedMessage);
  const receiverId = String(populatedMessage?.receiverId?._id ?? populatedMessage?.receiverId ?? '');

  if (receiverId) {
    emitToUser(receiverId, 'messageDeleted', {
      messageId: String(messageDocument._id),
      deletedForEveryone: true,
    });
  }

  res.json({
    success: true,
    message: formattedMessage,
  });
});

const editMessage = asyncHandler(async (req, res) => {
  const { messageId } = req.params;
  const currentUserId = String(req.user?._id || req.user?.id || '');
  const nextMessageText = typeof req.body?.message === 'string' ? req.body.message.trim() : '';

  if (!messageId) {
    res.status(400);
    throw new Error('messageId is required');
  }

  if (!nextMessageText) {
    res.status(400);
    throw new Error('message is required');
  }

  const messageDocument = await Message.findById(messageId)
    .populate('senderId', 'name email preferredLanguage')
    .populate('receiverId', 'name email preferredLanguage');

  if (!messageDocument) {
    res.status(404);
    throw new Error('Message not found');
  }

  if (String(messageDocument.senderId?._id ?? messageDocument.senderId) !== currentUserId) {
    res.status(403);
    throw new Error('You can only edit your own messages');
  }

  const createdAt = new Date(messageDocument.createdAt).getTime();
  if (Date.now() - createdAt > 15 * 60 * 1000) {
    return res.status(403).json({ error: 'Message can no longer be edited' });
  }

  if (messageDocument.deleted) {
    return res.status(403).json({ error: 'Message can no longer be edited' });
  }

  const receiverLanguage = String(messageDocument.receiverId?.preferredLanguage || 'en');
  const translatedMap = toPlainMap(messageDocument.translated);

  try {
    const translatedText = await translateText(nextMessageText, receiverLanguage);
    if (translatedText) {
      translatedMap[receiverLanguage] = translatedText;
    }
  } catch (translationError) {
    console.warn('Edited message translation failed:', translationError?.message || translationError);
  }

  messageDocument.message = nextMessageText;
  messageDocument.translated = translatedMap;
  messageDocument.edited = true;
  messageDocument.editedAt = new Date();
  await messageDocument.save();

  const populatedMessage = await Message.findById(messageDocument._id)
    .populate('senderId', 'name email preferredLanguage')
    .populate('receiverId', 'name email preferredLanguage');

  const formattedMessage = serializeMessage(populatedMessage);
  const receiverId = String(populatedMessage?.receiverId?._id ?? populatedMessage?.receiverId ?? '');

  if (receiverId) {
    emitToUser(receiverId, 'messageEdited', {
      ...formattedMessage,
      edited: true,
      editedAt: messageDocument.editedAt,
    });
  }

  res.json({
    success: true,
    message: formattedMessage,
  });
});

const getChats = asyncHandler(async (req, res) => {
  const currentUserId = String(req.user._id);

  const messages = await Message.find({
    $or: [
      { senderId: currentUserId },
      { receiverId: currentUserId },
    ],
  })
    .populate('senderId', '_id name email preferredLanguage')
    .populate('receiverId', '_id name email preferredLanguage')
    .sort({ createdAt: -1 });

  const chatsByUserId = new Map();

  for (const messageDocument of messages) {
    const sender = messageDocument.senderId;
    const receiver = messageDocument.receiverId;
    const senderId = String(sender?._id ?? sender);
    const receiverId = String(receiver?._id ?? receiver);

    const partner = senderId === currentUserId ? receiver : sender;
    const partnerId = String(partner?._id ?? '');

    if (!partnerId) {
      continue;
    }

    const existing = chatsByUserId.get(partnerId);
    const isUnreadForCurrentUser = !messageDocument.isRead && receiverId === currentUserId;

    if (!existing) {
      const lastMessage = messageDocument.deleted
        ? {
            message: 'This message was deleted',
            text: 'This message was deleted',
            translated: {},
            createdAt: messageDocument.createdAt,
            senderId,
            deleted: true,
            deletedAt: messageDocument.deletedAt,
          }
        : {
            message: messageDocument.message,
            translated: toPlainMap(messageDocument.translated),
            createdAt: messageDocument.createdAt,
            senderId,
            deleted: Boolean(messageDocument.deleted),
            deletedAt: messageDocument.deletedAt,
          };

      chatsByUserId.set(partnerId, {
        user: {
          _id: partnerId,
          name: partner?.name || 'Unknown',
          email: partner?.email || '',
          preferredLanguage: partner?.preferredLanguage || 'en',
        },
        lastMessage,
        unreadCount: isUnreadForCurrentUser ? 1 : 0,
      });
      continue;
    }

    if (isUnreadForCurrentUser) {
      existing.unreadCount += 1;
    }
  }

  const chats = Array.from(chatsByUserId.values())
    .sort((left, right) => {
      const leftTs = new Date(left.lastMessage?.createdAt || 0).getTime();
      const rightTs = new Date(right.lastMessage?.createdAt || 0).getTime();
      return rightTs - leftTs;
    });

  res.json({
    success: true,
    chats,
  });
});

const markMessagesAsRead = asyncHandler(async (req, res) => {
  const currentUserId = String(req.user._id);
  const senderUserId = String(req.params.userId || '');

  if (!senderUserId) {
    res.status(400);
    throw new Error('userId is required');
  }

  const updateResult = await Message.updateMany(
    {
      senderId: senderUserId,
      receiverId: currentUserId,
      isRead: false,
    },
    {
      $set: {
        isRead: true,
      },
    }
  );

  res.json({
    success: true,
    modifiedCount: updateResult.modifiedCount || 0,
  });
});

const uploadFile = asyncHandler(async (req, res) => {
  console.log('req.file:', req.file)

  if (!req.file) {
    res.status(400)
    throw new Error('No file uploaded')
  }

  const receiverId = String(req.body?.receiverId ?? '')
  const senderId = String(req.user?._id ?? '')
  const text = typeof req.body?.message === 'string' ? req.body.message : ''
  const imageUrl = `http://localhost:5000/uploads/${req.file.filename}`
  const fileUrl = imageUrl

  console.log('imageUrl:', imageUrl)
  const savedMessage = await Message.create({
    senderId,
    receiverId: receiverId || senderId,
    message: text || '[image]',
    translated: req.body?.translated && typeof req.body.translated === 'object' ? req.body.translated : {},
    isRead: false,
    imageUrl,
  })

  console.log('saved message:', savedMessage.imageUrl)

  const populatedMessage = await Message.findById(savedMessage._id)
    .populate('senderId', 'name email preferredLanguage')
    .populate('receiverId', 'name email preferredLanguage')

  const formattedMessage = serializeMessage(populatedMessage)
  formattedMessage.imageUrl = formattedMessage.imageUrl || imageUrl

  const receiverSocketId = connectedUsers.get(receiverId)
  if (receiverSocketId && io) {
    io.to(receiverSocketId).emit('receiveMessage', {
      _id: savedMessage._id,
      senderId: savedMessage.senderId,
      receiverId: savedMessage.receiverId,
      text: savedMessage.message,
      imageUrl: savedMessage.imageUrl,
      translated: savedMessage.translated,
      createdAt: savedMessage.createdAt,
      id: String(savedMessage._id),
      message: savedMessage.message,
      timestamp: savedMessage.createdAt,
    })
  }

  res.json({ success: true, fileUrl, imageUrl, message: formattedMessage })
})

const toggleReaction = asyncHandler(async (req, res) => {
  const currentUserId = String(req.user._id)
  const { messageId } = req.params
  const { emoji } = req.body

  if (!emoji) {
    res.status(400)
    throw new Error('emoji is required')
  }

  let messageDoc = await Message.findById(messageId)
  let isGroupMessage = false

  if (!messageDoc) {
    messageDoc = await GroupMessage.findById(messageId)
    isGroupMessage = Boolean(messageDoc)
  }

  if (!messageDoc) {
    res.status(404)
    throw new Error('Message not found')
  }

  const existingIndex = (messageDoc.reactions || []).findIndex(r => String(r.userId) === currentUserId && r.emoji === emoji)

  if (existingIndex >= 0) {
    // remove reaction
    messageDoc.reactions.splice(existingIndex, 1)
  } else {
    // add reaction
    messageDoc.reactions = messageDoc.reactions || []
    messageDoc.reactions.push({ userId: currentUserId, emoji })
  }

  await messageDoc.save()

  const populated = isGroupMessage
    ? await GroupMessage.findById(messageDoc._id).populate('senderId', 'name email preferredLanguage')
    : await Message.findById(messageDoc._id)
        .populate('senderId', 'name email preferredLanguage')
        .populate('receiverId', 'name email preferredLanguage')

  const formatted = serializeMessage(populated)

  try {
    if (isGroupMessage) {
      const group = await Group.findById(String(messageDoc.groupId)).select('memberIds')
      for (const memberId of (group?.memberIds || []).map(String)) {
        emitToUser(memberId, 'reactionUpdated', formatted)
      }
    } else {
      emitToUser(String(formatted.senderId), 'reactionUpdated', formatted)
      emitToUser(String(formatted.receiverId), 'reactionUpdated', formatted)
    }
  } catch (e) {
    // ignore emit errors
  }

  res.json({ success: true, message: formatted })
})

export { sendMessage, getMessages, getChats, markMessagesAsRead, createMessage, uploadFile, toggleReaction, deleteMessage, editMessage };
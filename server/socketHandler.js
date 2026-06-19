import jwt from 'jsonwebtoken';
import User from './models/userModel.js';
import Message from './models/Message.js';
import Group from './models/Group.js';
import { translateText } from './utils/translate.js';

const connectedUsers = new Map();
const activeChats = new Map();

let ioInstance = null;

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

const resolveImageUrl = (payload = {}) => {
  const candidate = payload.imageUrl ?? payload.fileUrl ?? payload.image ?? null;
  if (typeof candidate !== 'string') {
    return null;
  }

  const trimmed = candidate.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const serializeMessage = (messageDocument) => {
  const rawMessage = messageDocument?.toObject ? messageDocument.toObject() : messageDocument;
  const senderId = rawMessage?.senderId?._id ?? rawMessage?.senderId;
  const receiverId = rawMessage?.receiverId?._id ?? rawMessage?.receiverId;
  const groupId = rawMessage?.groupId?._id ?? rawMessage?.groupId;
  const senderLanguage = rawMessage?.senderId?.preferredLanguage || rawMessage?.language || 'en';
  const status = rawMessage?.status || (rawMessage?.isRead ? 'read' : 'sent');

  return {
    _id: String(rawMessage._id),
    id: String(rawMessage._id),
    senderId: String(senderId),
    receiverId: receiverId ? String(receiverId) : '',
    groupId: groupId ? String(groupId) : undefined,
    message: rawMessage.message,
    text: rawMessage.message,
    translated: toPlainMap(rawMessage.translated),
    isRead: Boolean(rawMessage.isRead),
    status,
    imageUrl: rawMessage.imageUrl || null,
    audioUrl: rawMessage.audioUrl || null,
    transcript: rawMessage.transcript || null,
    translatedTranscript: toPlainMap(rawMessage.translatedTranscript),
    reactions: Array.isArray(rawMessage.reactions)
      ? rawMessage.reactions.map(r => ({ userId: String(r.userId), emoji: r.emoji }))
      : [],
    deleted: Boolean(rawMessage.deleted),
    deletedAt: rawMessage.deletedAt || null,
    edited: Boolean(rawMessage.edited),
    editedAt: rawMessage.editedAt || null,
    language: senderLanguage,
    createdAt: rawMessage.createdAt,
    timestamp: rawMessage.createdAt,
  };
};

const emitToUser = (userId, eventName, payload) => {
  if (!ioInstance) {
    return false;
  }

  const socketId = connectedUsers.get(String(userId));
  if (!socketId) {
    return false;
  }

  ioInstance.to(socketId).emit(eventName, payload);
  return true;
};

const emitMessageStatusUpdates = (messageDocuments, status) => {
  if (!Array.isArray(messageDocuments) || messageDocuments.length === 0) {
    return;
  }

  for (const messageDocument of messageDocuments) {
    const senderId = String(messageDocument?.senderId?._id ?? messageDocument?.senderId ?? '');
    const senderSocketId = connectedUsers.get(senderId);

    if (!senderId) {
      continue;
    }

    console.log('Emitting status update to socket:', senderSocketId, 'messageId:', String(messageDocument._id), 'status:', status);

    emitToUser(senderId, 'messageStatusUpdate', {
      messageId: String(messageDocument._id),
      status,
    });
  }
};

const promoteMessagesToStatus = async ({ filter, status, isRead }) => {
  const messagesToUpdate = await Message.find(filter)
    .select('_id senderId receiverId status isRead createdAt');

  if (messagesToUpdate.length === 0) {
    return [];
  }

  await Message.updateMany(
    { _id: { $in: messagesToUpdate.map((message) => message._id) } },
    {
      $set: {
        status,
        isRead,
      },
    }
  );

  emitMessageStatusUpdates(messagesToUpdate, status);
  return messagesToUpdate.length;
};

const initializeSocket = (io) => {
  ioInstance = io;

  io.on('connection', async (socket) => {
    try {
      const rawToken = socket.handshake.auth?.token;
      const token = typeof rawToken === 'string' && rawToken.startsWith('Bearer ')
        ? rawToken.split(' ')[1]
        : rawToken;

      if (!token) {
        socket.emit('socketError', { message: 'Authentication token missing' });
        socket.disconnect(true);
        return;
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('_id name email preferredLanguage');

      if (!user) {
        socket.emit('socketError', { message: 'User not found' });
        socket.disconnect(true);
        return;
      }

      const userId = String(user._id);
      connectedUsers.set(userId, socket.id);
      socket.data.userId = userId;
      socket.userId = userId;
      socket.userName = user.name || '';

      // Join group rooms for fast broadcast
      try {
        const userGroups = await Group.find({ memberIds: userId }).select('_id')
        userGroups.forEach((g) => {
          try {
            socket.join(`group:${String(g._id)}`)
          } catch (joinErr) {
            // ignore
          }
        })
      } catch (joinErr) {
        // ignore group join errors
      }

      // Notify this socket that it is connected
      socket.emit('connected', { userId, socketId: socket.id });

      // Broadcast presence to other connected users
      socket.broadcast.emit('userConnected', { userId });

      console.log('Marking messages as delivered for user:', socket.userId);
      const deliveredCount = await promoteMessagesToStatus({
        filter: {
          receiverId: userId,
          status: 'sent',
        },
        status: 'delivered',
        isRead: false,
      });
      console.log('Messages updated to delivered:', deliveredCount);

      socket.on('chatOpened', async ({ senderId } = {}) => {
        try {
          const normalizedSenderId = String(senderId ?? '');

          if (!normalizedSenderId) {
            return;
          }

          console.log('--- Chat opened ---');
          console.log('User:', userId, 'opened chat with:', normalizedSenderId);
          console.log('activeChats before set:', JSON.stringify([...activeChats]));
          console.log('Chat opened by:', socket.userId, 'for sender:', normalizedSenderId);
          activeChats.set(userId, normalizedSenderId);
          console.log('activeChats after set:', JSON.stringify([...activeChats]));

          const messagesToUpdate = await Message.find({
            senderId: normalizedSenderId,
            receiverId: userId,
            status: { $ne: 'read' },
          }).select('_id');

          const readCount = await promoteMessagesToStatus({
            filter: {
              senderId: normalizedSenderId,
              receiverId: userId,
              status: { $ne: 'read' },
            },
            status: 'read',
            isRead: true,
          });
          console.log('Messages updated to read:', readCount);

          const senderSocketId = connectedUsers.get(normalizedSenderId);
          if (senderSocketId && messagesToUpdate.length > 0) {
            messagesToUpdate.forEach((msg) => {
              ioInstance.to(senderSocketId).emit('messageStatusUpdate', {
                messageId: String(msg._id),
                status: 'read',
              });
            });
            console.log('Emitted read status to sender socket:', senderSocketId, 'for', messagesToUpdate.length, 'messages');
          }
        } catch (error) {
          socket.emit('socketError', { message: error.message || 'Failed to mark chat as read' });
        }
      });

      socket.on('sendMessage', async (payload = {}) => {
        try {
          const { receiverId, message, language } = payload;
          const imageUrl = resolveImageUrl(payload);

          console.log('--- New message sent ---');
          console.log('Sender:', userId, 'Receiver:', receiverId);
          console.log('activeChats map:', JSON.stringify([...activeChats]));

          if (!receiverId || (!message && !imageUrl)) {
            socket.emit('socketError', { message: 'receiverId and either message or imageUrl are required' });
            return;
          }

          const receiver = await User.findById(receiverId).select('_id preferredLanguage');
          if (!receiver) {
            socket.emit('socketError', { message: 'Receiver not found' });
            return;
          }

          const senderLanguage = user.preferredLanguage || 'en';
          const receiverLanguage = receiver.preferredLanguage || 'en';
          const translatedMap = {
            ...(payload.translated && typeof payload.translated === 'object' ? payload.translated : {}),
          };

          if (message && (receiverLanguage !== senderLanguage || receiverLanguage !== 'en')) {
            try {
              const translatedText = await translateText(message, receiverLanguage);
              if (translatedText) {
                translatedMap[receiverLanguage] = translatedText;
              }
            } catch (translationError) {
              console.warn('Socket message translation failed:', translationError?.message || translationError);
            }
          }

          const createdMessage = await Message.create({
            senderId: userId,
            receiverId,
            message,
            translated: translatedMap,
            isRead: false,
            status: 'sent',
            imageUrl,
          });

          const populatedMessage = await Message.findById(createdMessage._id)
            .populate('senderId', 'name email preferredLanguage')
            .populate('receiverId', 'name email preferredLanguage');

          const formattedMessage = serializeMessage(populatedMessage);
          formattedMessage.language = language || user.preferredLanguage || formattedMessage.language;
          formattedMessage.clientMessageId = payload.clientMessageId || undefined;
          formattedMessage.imageUrl = formattedMessage.imageUrl || imageUrl || null;

          emitToUser(String(receiverId), 'receiveMessage', {
            ...formattedMessage,
            imageUrl: formattedMessage.imageUrl || imageUrl || null,
          });

          const receiverSocketId = connectedUsers.get(String(receiverId));
          const receiverActiveChat = activeChats.get(String(receiverId));
          console.log('receiverActiveChat:', receiverActiveChat);
          console.log('Match check:', receiverActiveChat === String(userId));
          if (receiverActiveChat === String(userId)) {
            await Message.updateOne(
              { _id: createdMessage._id },
              {
                $set: {
                  status: 'read',
                  isRead: true,
                },
              }
            );

            const senderSocketId = connectedUsers.get(String(userId));
            console.log('Emitting status update to socket:', senderSocketId, 'messageId:', String(createdMessage._id), 'status:', 'read');
            if (senderSocketId) {
              ioInstance.to(senderSocketId).emit('messageStatusUpdate', {
                messageId: String(createdMessage._id),
                status: 'read',
              });
            }
          } else if (receiverSocketId) {
            await Message.updateOne(
              { _id: createdMessage._id },
              {
                $set: {
                  status: 'delivered',
                  isRead: false,
                },
              }
            );

            const senderSocketId = connectedUsers.get(String(userId));
            console.log('Emitting status update to socket:', senderSocketId, 'messageId:', String(createdMessage._id), 'status:', 'delivered');
            if (senderSocketId) {
              ioInstance.to(senderSocketId).emit('messageStatusUpdate', {
                messageId: String(createdMessage._id),
                clientMessageId: payload.clientMessageId || undefined,
                status: 'delivered',
              });
            }
          }

          socket.emit('messageSent', {
            ...formattedMessage,
            imageUrl: formattedMessage.imageUrl || imageUrl || null,
          });
        } catch (error) {
          socket.emit('socketError', { message: error.message || 'Failed to send message' });
        }
      });

      // Typing indicator: { receiverId, isTyping }
      const handleTyping = (payload = {}) => {
        try {
          const receiverId = String(payload?.receiverId ?? '')
          const isTyping = !!payload?.isTyping

          if (!receiverId) return

          console.log('Typing event from:', socket.userId, 'to:', receiverId, 'receiver socket:', connectedUsers.get(String(receiverId)))
          emitToUser(String(receiverId), 'userTyping', { from: String(userId), isTyping })
        } catch (err) {
          socket.emit('socketError', { message: err?.message || 'Typing event failed' })
        }
      };

      socket.on('typing', handleTyping);

      const handleStopTyping = (payload = {}) => {
        try {
          const receiverId = String(payload?.receiverId ?? '')

          if (!receiverId) return

          emitToUser(String(receiverId), 'userStopTyping', { from: String(userId), receiverId: String(receiverId) })
        } catch (err) {
          socket.emit('socketError', { message: err?.message || 'Stop typing event failed' })
        }
      };

      socket.on('stopTyping', handleStopTyping);

      // Group typing events
      socket.on('groupTyping', (payload = {}) => {
        try {
          const groupId = String(payload?.groupId ?? '')
          if (!groupId) return

          socket.to(`group:${groupId}`).emit('userGroupTyping', {
            senderId: socket.userId,
            senderName: socket.userName || user.name || '',
            groupId,
          })
        } catch (err) {
          socket.emit('socketError', { message: err?.message || 'Group typing failed' })
        }
      })

      socket.on('groupStopTyping', (payload = {}) => {
        try {
          const groupId = String(payload?.groupId ?? '')
          if (!groupId) return

          socket.to(`group:${groupId}`).emit('userGroupStopTyping', {
            senderId: socket.userId,
            groupId,
          })
        } catch (err) {
          socket.emit('socketError', { message: err?.message || 'Group stop typing failed' })
        }
      })

      // Reaction via socket: toggle and broadcast
      socket.on('toggleReaction', async (payload = {}) => {
        try {
          const { messageId, emoji } = payload || {}
          if (!messageId || !emoji) {
            socket.emit('socketError', { message: 'messageId and emoji required' })
            return
          }

          const messageDoc = await Message.findById(messageId)
          if (!messageDoc) {
            socket.emit('socketError', { message: 'Message not found' })
            return
          }

          const existingIndex = (messageDoc.reactions || []).findIndex(r => String(r.userId) === userId && r.emoji === emoji)
          if (existingIndex >= 0) {
            messageDoc.reactions.splice(existingIndex, 1)
          } else {
            messageDoc.reactions = messageDoc.reactions || []
            messageDoc.reactions.push({ userId, emoji })
          }

          await messageDoc.save()

          const populated = await Message.findById(messageDoc._id)
            .populate('senderId', 'name email preferredLanguage')
            .populate('receiverId', 'name email preferredLanguage')

          const formatted = serializeMessage(populated)

          emitToUser(String(formatted.senderId), 'reactionUpdated', formatted)
          emitToUser(String(formatted.receiverId), 'reactionUpdated', formatted)
          socket.emit('reactionToggled', { message: formatted })
        } catch (err) {
          socket.emit('socketError', { message: err?.message || 'Reaction toggle failed' })
        }
      })

      socket.on('disconnect', () => {
        const currentUserId = socket.data.userId;
        if (currentUserId && connectedUsers.get(currentUserId) === socket.id) {
          connectedUsers.delete(currentUserId);
          activeChats.delete(currentUserId);
          socket.broadcast.emit('userDisconnected', { userId: currentUserId });
        }
      });
    } catch (error) {
      socket.emit('socketError', { message: error.message || 'Socket authentication failed' });
      socket.disconnect(true);
    }
  });
};

export { initializeSocket, connectedUsers, emitToUser, serializeMessage };
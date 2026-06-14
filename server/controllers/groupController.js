import asyncHandler from 'express-async-handler';
import Group from '../models/Group.js';
import GroupMessage from '../models/GroupMessage.js';
import User from '../models/userModel.js';
import { emitToUser, serializeMessage } from '../socketHandler.js';
import { translateText } from '../utils/translate.js';

const resolveImageUrl = (payload = {}) => {
  const candidate = payload.imageUrl ?? payload.fileUrl ?? payload.image ?? null;

  if (typeof candidate !== 'string') {
    return null;
  }

  const trimmed = candidate.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const toMessageResponse = (messageDocument) => {
  if (!messageDocument) {
    return undefined;
  }

  const serialized = serializeMessage(messageDocument);

  return {
    ...serialized,
    groupId: serialized.groupId || String(messageDocument.groupId?._id ?? messageDocument.groupId ?? ''),
  };
};

const toGroupResponse = (groupDocument, lastMessage) => {
  const rawGroup = groupDocument?.toObject ? groupDocument.toObject() : groupDocument;

  return {
    id: String(rawGroup._id),
    groupName: rawGroup.groupName,
    createdBy: String(rawGroup.createdBy),
    memberIds: (rawGroup.memberIds || []).map((memberId) => String(memberId)),
    members: Array.isArray(rawGroup.members)
      ? rawGroup.members.map((member) => ({
          userId: String(member.userId),
          name: member.name,
          email: member.email,
          language: member.language || 'en',
        }))
      : [],
    lastMessage: lastMessage ? toMessageResponse(lastMessage) : rawGroup.lastMessage,
    createdAt: rawGroup.createdAt,
    updatedAt: rawGroup.updatedAt,
  };
};

const getGroupMessageSummaries = async (groupIds) => {
  if (!groupIds.length) {
    return new Map();
  }

  const latestMessages = await GroupMessage.find({
    groupId: { $in: groupIds },
  })
    .populate('senderId', 'name email preferredLanguage')
    .sort({ createdAt: -1 });

  const latestByGroupId = new Map();

  for (const messageDocument of latestMessages) {
    const groupId = String(messageDocument.groupId);
    if (!latestByGroupId.has(groupId)) {
      latestByGroupId.set(groupId, messageDocument);
    }
  }

  return latestByGroupId;
};

const buildGroupTranslations = async (message, members, senderLanguage) => {
  if (!message) {
    return {};
  }

  const translationsByLanguage = new Map();
  const translatedMap = {};

  for (const member of members) {
    const memberLanguage = member.language || 'en';

    if (!translationsByLanguage.has(memberLanguage)) {
      if (memberLanguage === senderLanguage) {
        translationsByLanguage.set(memberLanguage, message);
      } else {
        try {
          const translatedText = await translateText(message, memberLanguage);
          translationsByLanguage.set(memberLanguage, translatedText || message);
        } catch (translationError) {
          console.warn('Group message translation failed:', translationError?.message || translationError);
          translationsByLanguage.set(memberLanguage, message);
        }
      }
    }

    translatedMap[member.userId] = translationsByLanguage.get(memberLanguage) || message;
  }

  return translatedMap;
};

const toGroupMember = (currentUser) => ({
  userId: String(currentUser._id),
  name: currentUser.name,
  email: currentUser.email,
  language: currentUser.preferredLanguage || 'en',
});

const getMemberIds = (groupDocument) => (groupDocument.memberIds || []).map((memberId) => String(memberId));

const ensureGroupMembership = (res, groupDocument, currentUserId) => {
  if (!getMemberIds(groupDocument).includes(currentUserId)) {
    res.status(403);
    throw new Error('Not a member of this group');
  }
};

const createGroup = asyncHandler(async (req, res) => {
  const currentUser = req.user;
  const { groupName, participants = [] } = req.body;

  if (!groupName || !Array.isArray(participants) || participants.length < 2) {
    res.status(400);
    throw new Error('groupName and at least two participants are required');
  }

  const normalizedParticipants = participants
    .map((participant) => ({
      userId: String(participant?.id || participant?.userId || ''),
      name: String(participant?.name || ''),
      email: String(participant?.email || ''),
      language: String(participant?.language || participant?.preferredLanguage || 'en'),
    }))
    .filter((participant) => participant.userId && participant.name && participant.email);

  const memberMap = new Map();
  memberMap.set(String(currentUser._id), {
    userId: String(currentUser._id),
    name: currentUser.name,
    email: currentUser.email,
    language: currentUser.preferredLanguage || 'en',
  });

  for (const participant of normalizedParticipants) {
    memberMap.set(participant.userId, participant);
  }

  const memberIds = Array.from(memberMap.keys());

  const existingGroup = await Group.findOne({
    groupName,
    memberIds: { $all: memberIds, $size: memberIds.length },
  });

  if (existingGroup) {
    res.status(200).json({ success: true, group: toGroupResponse(existingGroup) });
    return;
  }

  const memberDocs = Array.from(memberMap.values()).map((member) => ({
    userId: member.userId,
    name: member.name,
    email: member.email,
    language: member.language || 'en',
  }));

  const group = await Group.create({
    groupName,
    createdBy: currentUser._id,
    memberIds,
    members: memberDocs,
  });

  console.log('[GroupController] created group', {
    id: String(group._id),
    groupName,
    memberCount: memberDocs.length,
  });

  res.status(201).json({ success: true, group: toGroupResponse(group) });
});

const getGroups = asyncHandler(async (req, res) => {
  const currentUserId = String(req.user._id);

  const groups = await Group.find({ memberIds: currentUserId }).sort({ updatedAt: -1 });
  const latestByGroupId = await getGroupMessageSummaries(groups.map((group) => String(group._id)));

  res.json({
    success: true,
    groups: groups.map((group) => toGroupResponse(group, latestByGroupId.get(String(group._id)))),
  });
});

const getGroupMessages = asyncHandler(async (req, res) => {
  const currentUserId = String(req.user._id);
  const { groupId } = req.params;

  if (!groupId) {
    res.status(400);
    throw new Error('groupId is required');
  }

  const group = await Group.findById(groupId);
  if (!group) {
    res.status(404);
    throw new Error('Group not found');
  }

  ensureGroupMembership(res, group, currentUserId);

  const messages = await GroupMessage.find({ groupId })
    .populate('senderId', 'name email preferredLanguage')
    .sort({ createdAt: 1 });

  res.json({
    success: true,
    messages: messages.map((messageDocument) => toMessageResponse(messageDocument)),
  });
});

const createGroupMessage = asyncHandler(async (req, res) => {
  const currentUserId = String(req.user._id);
  const { groupId } = req.params;
  const messageText = typeof req.body?.message === 'string' ? req.body.message.trim() : '';
  const imageUrl = resolveImageUrl(req.body) || (req.file ? `http://localhost:5000/uploads/${req.file.filename}` : null);
  const clientMessageId = typeof req.body?.clientMessageId === 'string' ? req.body.clientMessageId : undefined;

  if (!groupId) {
    res.status(400);
    throw new Error('groupId is required');
  }

  if (!messageText && !imageUrl) {
    res.status(400);
    throw new Error('message or imageUrl is required');
  }

  const group = await Group.findById(groupId);
  if (!group) {
    res.status(404);
    throw new Error('Group not found');
  }

  ensureGroupMembership(res, group, currentUserId);

  const sender = await User.findById(currentUserId).select('_id preferredLanguage');
  const translated = messageText
    ? await buildGroupTranslations(
        messageText,
        (group.members || []).map((member) => ({
          userId: String(member.userId),
          language: member.language || 'en',
        })),
        sender?.preferredLanguage || 'en'
      )
    : {};

  const messageDocument = await GroupMessage.create({
    groupId,
    senderId: currentUserId,
    message: messageText || '[image]',
    translated,
    imageUrl,
  });

  const populatedMessage = await GroupMessage.findById(messageDocument._id)
    .populate('senderId', 'name email preferredLanguage');

  const formattedMessage = {
    ...toMessageResponse(populatedMessage),
    clientMessageId,
  };

  for (const memberId of getMemberIds(group)) {
    emitToUser(memberId, 'receiveMessage', formattedMessage);
  }

  res.status(201).json({
    success: true,
    message: formattedMessage,
  });
});

const renameGroup = asyncHandler(async (req, res) => {
  const currentUserId = String(req.user._id);
  const { groupId } = req.params;
  const { groupName } = req.body;

  if (!groupId || !groupName || !String(groupName).trim()) {
    res.status(400);
    throw new Error('groupId and groupName are required');
  }

  const group = await Group.findById(groupId);
  if (!group) {
    res.status(404);
    throw new Error('Group not found');
  }

  ensureGroupMembership(res, group, currentUserId);

  group.groupName = String(groupName).trim();
  await group.save();

  const latestMessage = await GroupMessage.findOne({ groupId })
    .sort({ createdAt: -1 })
    .populate('senderId', 'name email preferredLanguage');

  const responseGroup = toGroupResponse(group, latestMessage);

  for (const memberId of getMemberIds(group)) {
    emitToUser(memberId, 'groupUpdated', { groupId: responseGroup.id, group: responseGroup });
  }

  res.json({ success: true, group: responseGroup });
});

const leaveGroup = asyncHandler(async (req, res) => {
  const currentUserId = String(req.user._id);
  const { groupId } = req.params;

  if (!groupId) {
    res.status(400);
    throw new Error('groupId is required');
  }

  const group = await Group.findById(groupId);
  if (!group) {
    res.status(404);
    throw new Error('Group not found');
  }

  const memberIds = getMemberIds(group);
  if (!memberIds.includes(currentUserId)) {
    res.status(403);
    throw new Error('Not a member of this group');
  }

  const remainingMemberIds = memberIds.filter((memberId) => memberId !== currentUserId);

  if (remainingMemberIds.length === 0) {
    await GroupMessage.deleteMany({ groupId });
    await Group.deleteOne({ _id: groupId });
    emitToUser(currentUserId, 'groupRemoved', { groupId });
    res.json({ success: true, removed: true });
    return;
  }

  group.memberIds = remainingMemberIds;
  group.members = (group.members || []).filter((member) => String(member.userId) !== currentUserId);
  await group.save();

  const responseGroup = toGroupResponse(group);

  for (const memberId of remainingMemberIds) {
    emitToUser(memberId, 'groupUpdated', { groupId, group: responseGroup });
  }

  emitToUser(currentUserId, 'groupRemoved', { groupId });

  res.json({ success: true, removed: true });
});

export { createGroup, getGroups, getGroupMessages, createGroupMessage, renameGroup, leaveGroup };
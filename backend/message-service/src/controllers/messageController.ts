import { Response } from 'express';
import mongoose from 'mongoose';
import Conversation from '../models/Conversation';
import Message from '../models/Message';
import User from '../models/User';
import { AuthRequest } from '../middleware/auth';
import { getIO } from '../config/socket';

// GET /api/messages/conversations
export async function listConversations(req: AuthRequest, res: Response): Promise<void> {
  const me = req.user!.id;
  const convs = await Conversation.find({ participants: me })
    .sort({ updatedAt: -1 })
    .populate('lastMessage')
    .lean();

  // Collect other participant IDs
  const otherIds = convs.flatMap((c) =>
    c.participants.filter((p) => p.toString() !== me)
  );
  const users = await User.find({ _id: { $in: otherIds } }).select('username avatar').lean();
  const userMap = new Map(users.map((u) => [u._id.toString(), u]));

  const result = convs.map((c) => {
    const otherId = c.participants.find((p) => p.toString() !== me)?.toString() ?? '';
    return { ...c, otherUser: userMap.get(otherId) ?? null };
  });

  res.json({ success: true, data: result });
}

// GET /api/messages/conversations/:conversationId
export async function getMessages(req: AuthRequest, res: Response): Promise<void> {
  const me = req.user!.id;
  const { conversationId } = req.params;
  const page  = parseInt(req.query.page as string)  || 1;
  const limit = parseInt(req.query.limit as string) || 30;

  const conv = await Conversation.findById(conversationId).lean();
  if (!conv || !conv.participants.some((p) => p.toString() === me)) {
    res.status(404).json({ success: false, message: 'Conversation not found' }); return;
  }

  const messages = await Message.find({ conversation: conversationId })
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();

  res.json({ success: true, data: messages.reverse() });
}

// POST /api/messages/conversations/:userId — start or get conversation with a user
export async function getOrCreateConversation(req: AuthRequest, res: Response): Promise<void> {
  const me     = req.user!.id;
  const { userId } = req.params;

  let conv = await Conversation.findOne({
    participants: { $all: [new mongoose.Types.ObjectId(me), new mongoose.Types.ObjectId(userId)] },
  });
  if (!conv) {
    conv = await Conversation.create({ participants: [me, userId] });
  }

  const otherUser = await User.findById(userId).select('username avatar').lean();
  res.json({ success: true, data: { ...conv.toObject(), otherUser } });
}

// POST /api/messages/conversations/:conversationId/messages
export async function sendMessage(req: AuthRequest, res: Response): Promise<void> {
  const me = req.user!.id;
  const { conversationId } = req.params;
  const { text, imageUrl } = req.body;
  if (!text?.trim() && !imageUrl) {
    res.status(400).json({ success: false, message: 'Message text or image is required' }); return;
  }

  const conv = await Conversation.findById(conversationId);
  if (!conv || !conv.participants.some((p) => p.toString() === me)) {
    res.status(404).json({ success: false, message: 'Conversation not found' }); return;
  }

  const message = await Message.create({
    conversation: conversationId,
    sender: me,
    text: text?.trim() ?? '',
    imageUrl: imageUrl ?? null,
    readBy: [me],
  });

  conv.lastMessage = message._id as mongoose.Types.ObjectId;
  conv.updatedAt   = new Date();
  await conv.save();

  // Emit real-time event to every participant's personal room
  try {
    const io = getIO();
    const msgObj = message.toObject();
    conv.participants.forEach((participantId) => {
      io.to(`user:${participantId.toString()}`).emit('message:new', msgObj);
    });
  } catch { /* socket not yet ready — skip */ }

  res.status(201).json({ success: true, data: message });
}

// POST /api/messages/upload — upload one image, returns { url }
export async function uploadImage(req: AuthRequest, res: Response): Promise<void> {
  const file = req.file as (Express.Multer.File & { location?: string }) | undefined;
  if (!file) { res.status(400).json({ success: false, message: 'No file uploaded' }); return; }
  const url = file.location ?? (file as unknown as { path: string }).path;
  res.json({ success: true, url });
}

// POST /api/messages/conversations/:conversationId/read
export async function markRead(req: AuthRequest, res: Response): Promise<void> {
  const me = req.user!.id;
  const { conversationId } = req.params;
  await Message.updateMany(
    { conversation: conversationId, readBy: { $ne: new mongoose.Types.ObjectId(me) } },
    { $addToSet: { readBy: new mongoose.Types.ObjectId(me) } }
  );
  res.json({ success: true });
}

import { Response } from 'express';
import mongoose from 'mongoose';
import Conversation from '../models/Conversation';
import Message from '../models/Message';
import User from '../models/User';
import { AuthRequest } from '../middleware/auth';
import { getIO } from '../config/socket';

const isMember = (conv: { participants: mongoose.Types.ObjectId[] }, userId: string) =>
  conv.participants.some((p) => p.toString() === userId);

const isAdmin = (conv: { admins: mongoose.Types.ObjectId[] }, userId: string) =>
  conv.admins.some((a) => a.toString() === userId);

async function populateParticipants(userIds: mongoose.Types.ObjectId[]) {
  const users = await User.find({ _id: { $in: userIds } }).select('name username avatar').lean();
  return users;
}

// Notifies every current participant that the group's metadata/membership changed, so their
// conversation lists / open group-info screens can refresh without a manual pull-to-refresh.
function broadcastGroupUpdated(conv: { _id: mongoose.Types.ObjectId; participants: mongoose.Types.ObjectId[] }) {
  try {
    const io = getIO();
    conv.participants.forEach((p) => {
      io.to(`user:${p.toString()}`).emit('group:updated', { conversationId: conv._id.toString() });
    });
  } catch { /* socket not yet ready — skip */ }
}

// POST /api/messages/groups — create a group conversation
export async function createGroup(req: AuthRequest, res: Response): Promise<void> {
  const me = req.user!.id;
  const { name, participantIds } = req.body as { name?: string; participantIds?: string[] };

  if (!name?.trim()) {
    res.status(400).json({ success: false, message: 'Group name is required.' }); return;
  }
  const uniqueOthers = Array.from(new Set((participantIds ?? []).filter((id) => id && id !== me)));
  if (uniqueOthers.length === 0) {
    res.status(400).json({ success: false, message: 'Select at least one other member.' }); return;
  }

  const participants = [me, ...uniqueOthers];
  const conv = await Conversation.create({
    participants,
    isGroup: true,
    name: name.trim(),
    admins: [me],
    createdBy: me,
  });

  const participantUsers = await populateParticipants(conv.participants);
  res.status(201).json({ success: true, data: { ...conv.toObject(), participantUsers } });
}

// GET /api/messages/groups/:id — group details (participants + admins populated)
export async function getGroupDetails(req: AuthRequest, res: Response): Promise<void> {
  const me = req.user!.id;
  const conv = await Conversation.findById(req.params.id);
  if (!conv || !conv.isGroup || !isMember(conv, me)) {
    res.status(404).json({ success: false, message: 'Group not found' }); return;
  }
  const participantUsers = await populateParticipants(conv.participants);
  res.json({
    success: true,
    data: { ...conv.toObject(), participantUsers, isAdmin: isAdmin(conv, me) },
  });
}

// PATCH /api/messages/groups/:id — rename group (admin only)
export async function updateGroup(req: AuthRequest, res: Response): Promise<void> {
  const me = req.user!.id;
  const { name } = req.body as { name?: string };
  const conv = await Conversation.findById(req.params.id);
  if (!conv || !conv.isGroup || !isMember(conv, me)) {
    res.status(404).json({ success: false, message: 'Group not found' }); return;
  }
  if (!isAdmin(conv, me)) {
    res.status(403).json({ success: false, message: 'Only group admins can do this.' }); return;
  }
  if (!name?.trim()) {
    res.status(400).json({ success: false, message: 'Group name is required.' }); return;
  }
  conv.name = name.trim();
  await conv.save();
  broadcastGroupUpdated(conv);
  res.json({ success: true, data: conv.toObject() });
}

// POST /api/messages/groups/:id/icon — update group icon (admin only, multipart 'icon')
export async function updateGroupIcon(req: AuthRequest, res: Response): Promise<void> {
  const me = req.user!.id;
  const file = req.file as (Express.Multer.File & { location?: string }) | undefined;
  if (!file) { res.status(400).json({ success: false, message: 'No file uploaded' }); return; }

  const conv = await Conversation.findById(req.params.id);
  if (!conv || !conv.isGroup || !isMember(conv, me)) {
    res.status(404).json({ success: false, message: 'Group not found' }); return;
  }
  if (!isAdmin(conv, me)) {
    res.status(403).json({ success: false, message: 'Only group admins can do this.' }); return;
  }

  conv.icon = file.location ?? (file as unknown as { path: string }).path;
  await conv.save();
  broadcastGroupUpdated(conv);
  res.json({ success: true, data: conv.toObject() });
}

// POST /api/messages/groups/:id/members — add members (admin only)
export async function addGroupMembers(req: AuthRequest, res: Response): Promise<void> {
  const me = req.user!.id;
  const { userIds } = req.body as { userIds?: string[] };
  const conv = await Conversation.findById(req.params.id);
  if (!conv || !conv.isGroup || !isMember(conv, me)) {
    res.status(404).json({ success: false, message: 'Group not found' }); return;
  }
  if (!isAdmin(conv, me)) {
    res.status(403).json({ success: false, message: 'Only group admins can do this.' }); return;
  }
  const toAdd = (userIds ?? []).filter(
    (id) => id && !conv.participants.some((p) => p.toString() === id),
  );
  if (toAdd.length === 0) {
    res.status(400).json({ success: false, message: 'No new members to add.' }); return;
  }
  conv.participants.push(...toAdd.map((id) => new mongoose.Types.ObjectId(id)));
  await conv.save();
  broadcastGroupUpdated(conv);
  const participantUsers = await populateParticipants(conv.participants);
  res.json({ success: true, data: { ...conv.toObject(), participantUsers } });
}

// DELETE /api/messages/groups/:id/members/:userId — remove a member (admin only)
export async function removeGroupMember(req: AuthRequest, res: Response): Promise<void> {
  const me = req.user!.id;
  const { userId } = req.params;
  const conv = await Conversation.findById(req.params.id);
  if (!conv || !conv.isGroup || !isMember(conv, me)) {
    res.status(404).json({ success: false, message: 'Group not found' }); return;
  }
  if (!isAdmin(conv, me)) {
    res.status(403).json({ success: false, message: 'Only group admins can do this.' }); return;
  }
  if (userId === me) {
    res.status(400).json({ success: false, message: 'Use the leave endpoint to remove yourself.' }); return;
  }
  const wasMember = isMember(conv, userId);
  conv.participants = conv.participants.filter((p) => p.toString() !== userId);
  conv.admins = conv.admins.filter((a) => a.toString() !== userId);
  await conv.save();
  if (wasMember) broadcastGroupUpdated(conv);
  res.json({ success: true, data: conv.toObject() });
}

// POST /api/messages/groups/:id/leave — leave a group (self)
export async function leaveGroup(req: AuthRequest, res: Response): Promise<void> {
  const me = req.user!.id;
  const conv = await Conversation.findById(req.params.id);
  if (!conv || !conv.isGroup || !isMember(conv, me)) {
    res.status(404).json({ success: false, message: 'Group not found' }); return;
  }

  conv.participants = conv.participants.filter((p) => p.toString() !== me);
  conv.admins = conv.admins.filter((a) => a.toString() !== me);

  if (conv.participants.length === 0) {
    // Last member out — nothing left to keep, clean up.
    await Message.deleteMany({ conversation: conv._id });
    await conv.deleteOne();
    res.json({ success: true, data: { deleted: true } });
    return;
  }

  // A group left with no admins can't be managed by anyone — promote the longest-standing
  // remaining member automatically rather than leaving it in a stuck, admin-less state.
  if (conv.admins.length === 0) {
    conv.admins = [conv.participants[0]];
  }

  await conv.save();
  broadcastGroupUpdated(conv);
  res.json({ success: true, data: conv.toObject() });
}

// POST /api/messages/groups/:id/admins/:userId — promote a member to admin
export async function makeGroupAdmin(req: AuthRequest, res: Response): Promise<void> {
  const me = req.user!.id;
  const { userId } = req.params;
  const conv = await Conversation.findById(req.params.id);
  if (!conv || !conv.isGroup || !isMember(conv, me)) {
    res.status(404).json({ success: false, message: 'Group not found' }); return;
  }
  if (!isAdmin(conv, me)) {
    res.status(403).json({ success: false, message: 'Only group admins can do this.' }); return;
  }
  if (!isMember(conv, userId)) {
    res.status(400).json({ success: false, message: 'User is not a member of this group.' }); return;
  }
  if (!isAdmin(conv, userId)) {
    conv.admins.push(new mongoose.Types.ObjectId(userId));
    await conv.save();
    broadcastGroupUpdated(conv);
  }
  res.json({ success: true, data: conv.toObject() });
}

// DELETE /api/messages/groups/:id/admins/:userId — demote an admin back to a regular member
export async function removeGroupAdmin(req: AuthRequest, res: Response): Promise<void> {
  const me = req.user!.id;
  const { userId } = req.params;
  const conv = await Conversation.findById(req.params.id);
  if (!conv || !conv.isGroup || !isMember(conv, me)) {
    res.status(404).json({ success: false, message: 'Group not found' }); return;
  }
  if (!isAdmin(conv, me)) {
    res.status(403).json({ success: false, message: 'Only group admins can do this.' }); return;
  }
  if (conv.admins.length <= 1 && isAdmin(conv, userId)) {
    res.status(400).json({ success: false, message: 'A group must have at least one admin.' }); return;
  }
  conv.admins = conv.admins.filter((a) => a.toString() !== userId);
  await conv.save();
  broadcastGroupUpdated(conv);
  res.json({ success: true, data: conv.toObject() });
}

// DELETE /api/messages/groups/:id — delete the whole group (admin only)
export async function deleteGroup(req: AuthRequest, res: Response): Promise<void> {
  const me = req.user!.id;
  const conv = await Conversation.findById(req.params.id);
  if (!conv || !conv.isGroup || !isMember(conv, me)) {
    res.status(404).json({ success: false, message: 'Group not found' }); return;
  }
  if (!isAdmin(conv, me)) {
    res.status(403).json({ success: false, message: 'Only group admins can do this.' }); return;
  }
  const participants = conv.participants;
  await Message.deleteMany({ conversation: conv._id });
  await conv.deleteOne();
  broadcastGroupUpdated({ _id: conv._id as mongoose.Types.ObjectId, participants });
  res.json({ success: true });
}

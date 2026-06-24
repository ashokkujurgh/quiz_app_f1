import { Response } from 'express';
import mongoose from 'mongoose';
import FriendRequest from '../models/FriendRequest';
import User from '../models/User';
import { AuthRequest } from '../middleware/auth';
import { sendFriendRequestNotification, sendFriendAcceptedNotification } from '../services/notificationService';

// POST /api/friends/request/:userId
export async function sendRequest(req: AuthRequest, res: Response): Promise<void> {
  const me = req.user!.id;
  const { userId } = req.params;
  if (me === userId) { res.status(400).json({ success: false, message: 'Cannot add yourself' }); return; }

  const existing = await FriendRequest.findOne({
    $or: [{ sender: me, receiver: userId }, { sender: userId, receiver: me }],
  });
  if (existing) {
    if (existing.status === 'accepted') { res.status(400).json({ success: false, message: 'Already friends' }); return; }
    if (existing.status === 'pending')  { res.status(400).json({ success: false, message: 'Request already sent' }); return; }
    if (existing.status === 'blocked')  { res.status(400).json({ success: false, message: 'Blocked' }); return; }
    // declined — re-send
    existing.sender   = new mongoose.Types.ObjectId(me);
    existing.receiver = new mongoose.Types.ObjectId(userId);
    existing.status   = 'pending';
    await existing.save();
    sendFriendRequestNotification(userId, req.user!.username).catch(console.error);
    res.json({ success: true, data: existing });
    return;
  }

  const request = await FriendRequest.create({ sender: me, receiver: userId, status: 'pending' });
  sendFriendRequestNotification(userId, req.user!.username).catch(console.error);
  res.status(201).json({ success: true, data: request });
}

// POST /api/friends/accept/:requestId
export async function acceptRequest(req: AuthRequest, res: Response): Promise<void> {
  const me = req.user!.id;
  const request = await FriendRequest.findById(req.params.requestId);
  if (!request || request.receiver.toString() !== me) {
    res.status(404).json({ success: false, message: 'Request not found' }); return;
  }
  request.status = 'accepted';
  await request.save();
  // Notify the original sender that their request was accepted
  sendFriendAcceptedNotification(request.sender.toString(), req.user!.username).catch(console.error);
  res.json({ success: true, data: request });
}

// POST /api/friends/decline/:requestId
export async function declineRequest(req: AuthRequest, res: Response): Promise<void> {
  const me = req.user!.id;
  const request = await FriendRequest.findById(req.params.requestId);
  if (!request || request.receiver.toString() !== me) {
    res.status(404).json({ success: false, message: 'Request not found' }); return;
  }
  request.status = 'declined';
  await request.save();
  res.json({ success: true, data: request });
}

// DELETE /api/friends/unfriend/:userId
export async function unfriend(req: AuthRequest, res: Response): Promise<void> {
  const me = req.user!.id;
  const { userId } = req.params;
  await FriendRequest.deleteOne({
    $or: [
      { sender: me, receiver: userId, status: 'accepted' },
      { sender: userId, receiver: me, status: 'accepted' },
    ],
  });
  res.json({ success: true });
}

// DELETE /api/friends/cancel/:userId
export async function cancelRequest(req: AuthRequest, res: Response): Promise<void> {
  const me = req.user!.id;
  const { userId } = req.params;
  await FriendRequest.deleteOne({ sender: me, receiver: userId, status: 'pending' });
  res.json({ success: true });
}

// POST /api/friends/block/:userId
export async function blockUser(req: AuthRequest, res: Response): Promise<void> {
  const me = req.user!.id;
  const { userId } = req.params;
  await FriendRequest.deleteMany({
    $or: [{ sender: me, receiver: userId }, { sender: userId, receiver: me }],
  });
  await FriendRequest.create({ sender: me, receiver: userId, status: 'blocked' });
  res.json({ success: true });
}

// GET /api/friends — list accepted friends
export async function listFriends(req: AuthRequest, res: Response): Promise<void> {
  const target = (req.query.userId as string) || req.user!.id;
  const docs = await FriendRequest.find({
    $or: [{ sender: target, status: 'accepted' }, { receiver: target, status: 'accepted' }],
  }).lean();

  const friendIds = docs.map((d) =>
    d.sender.toString() === target ? d.receiver : d.sender
  );

  const users = await User.find({ _id: { $in: friendIds } }).select('name username avatar email').lean();
  res.json({ success: true, data: users });
}

// GET /api/friends/requests/incoming — pending requests sent TO me
export async function incomingRequests(req: AuthRequest, res: Response): Promise<void> {
  const me = req.user!.id;
  const docs = await FriendRequest.find({ receiver: me, status: 'pending' }).lean();
  const senderIds = docs.map((d) => d.sender);
  const users = await User.find({ _id: { $in: senderIds } }).select('name username avatar email').lean();

  const result = docs.map((d) => {
    const user = users.find((u) => u._id.toString() === d.sender.toString());
    return { requestId: d._id, user, createdAt: d.createdAt };
  });
  res.json({ success: true, data: result });
}

// GET /api/friends/requests/outgoing — pending requests sent BY me
export async function outgoingRequests(req: AuthRequest, res: Response): Promise<void> {
  const me = req.user!.id;
  const docs = await FriendRequest.find({ sender: me, status: 'pending' }).lean();
  const receiverIds = docs.map((d) => d.receiver);
  const users = await User.find({ _id: { $in: receiverIds } }).select('name username avatar email').lean();

  const result = docs.map((d) => {
    const user = users.find((u) => u._id.toString() === d.receiver.toString());
    return { requestId: d._id, user, createdAt: d.createdAt };
  });
  res.json({ success: true, data: result });
}

// GET /api/friends/suggestions — users I'm not friends with
export async function suggestions(req: AuthRequest, res: Response): Promise<void> {
  const me = req.user!.id;
  const relations = await FriendRequest.find({
    $or: [{ sender: me }, { receiver: me }],
  }).lean();

  const excluded = new Set<string>([me]);
  relations.forEach((r) => {
    excluded.add(r.sender.toString());
    excluded.add(r.receiver.toString());
  });

  const users = await User.find({ _id: { $nin: [...excluded] }, role: { $ne: 'admin' } })
    .select('name username avatar email')
    .limit(20)
    .lean();

  res.json({ success: true, data: users });
}

// GET /api/friends/status/:userId — relationship status with a specific user
export async function friendStatus(req: AuthRequest, res: Response): Promise<void> {
  const me = req.user!.id;
  const { userId } = req.params;
  const rel = await FriendRequest.findOne({
    $or: [{ sender: me, receiver: userId }, { sender: userId, receiver: me }],
  }).lean();

  if (!rel) { res.json({ success: true, status: 'none' }); return; }

  let perspective: string = rel.status;
  if (rel.status === 'pending') {
    perspective = rel.sender.toString() === me ? 'request_sent' : 'request_received';
  }
  res.json({ success: true, status: perspective, requestId: rel._id });
}

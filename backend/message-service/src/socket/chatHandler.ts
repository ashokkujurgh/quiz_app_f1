import { Server, Socket } from 'socket.io';
import mongoose from 'mongoose';
import Message from '../models/Message';
import Conversation from '../models/Conversation';
import { sendMessageNotification } from '../services/notificationService';

interface AuthSocket extends Socket {
  user?: { id: string; username: string; email: string };
}

export function registerChatHandlers(io: Server, socket: AuthSocket): void {
  const me = socket.user!.id;

  // Join personal room to receive messages
  socket.join(`user:${me}`);

  // Join a conversation room
  socket.on('conversation:join', (conversationId: string) => {
    socket.join(`conv:${conversationId}`);
  });

  socket.on('conversation:leave', (conversationId: string) => {
    socket.leave(`conv:${conversationId}`);
  });

  // Send a message in real-time
  socket.on('message:send', async (data: { conversationId: string; text: string }) => {
    const { conversationId, text } = data;
    if (!text?.trim() || !conversationId) return;

    try {
      const conv = await Conversation.findById(conversationId);
      if (!conv || !conv.participants.some((p) => p.toString() === me)) return;

      const message = await Message.create({
        conversation: conversationId,
        sender: me,
        text: text.trim(),
        readBy: [me],
      });

      conv.lastMessage = message._id as mongoose.Types.ObjectId;
      conv.updatedAt   = new Date();
      await conv.save();

      // Emit to every participant's personal room so they always receive it
      const msgObj = message.toObject();
      conv.participants.forEach((p) => {
        io.to(`user:${p.toString()}`).emit('message:new', msgObj);
      });

      // Push notification to offline recipients
      const recipientIds = conv.participants
        .map((p) => p.toString())
        .filter((id) => id !== me);
      const senderUser = socket.user!;
      sendMessageNotification(
        recipientIds,
        senderUser.username,
        text.trim(),
        conversationId,
      ).catch(console.error);
    } catch (err) {
      console.error('[ChatSocket] message:send error:', err);
    }
  });

  // Typing indicators
  socket.on('typing:start', (conversationId: string) => {
    socket.to(`conv:${conversationId}`).emit('typing:start', { userId: me, conversationId });
  });

  socket.on('typing:stop', (conversationId: string) => {
    socket.to(`conv:${conversationId}`).emit('typing:stop', { userId: me, conversationId });
  });

  // Mark messages as read
  socket.on('message:read', async (conversationId: string) => {
    try {
      await Message.updateMany(
        { conversation: conversationId, readBy: { $ne: new mongoose.Types.ObjectId(me) } },
        { $addToSet: { readBy: new mongoose.Types.ObjectId(me) } }
      );
      socket.to(`conv:${conversationId}`).emit('message:read', { userId: me, conversationId });
    } catch { /* ignore */ }
  });
}

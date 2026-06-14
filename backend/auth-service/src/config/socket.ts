import { Server as HttpServer } from 'http';
import { Server as SocketServer, Socket } from 'socket.io';
import { verifyAccessToken } from '../utils/jwt';
import User from '../models/User';

let io: SocketServer;

// socketId → { userId, role }
const socketUserMap = new Map<string, { userId: string; role: string }>();

/**
 * Broadcast a user status change to:
 *  - the `admins` room  (all connected admins receive it)
 *  - the `user:{userId}` room  (for per-user subscriptions)
 */
export const broadcastUserStatus = (userId: string, isOnline: boolean) => {
  if (!io) { console.warn('[socket] broadcastUserStatus called before io initialized'); return; }
  const payload = { userId, isOnline, timestamp: new Date() };
  io.emit('user:status', payload);
  console.log(`[socket] broadcast user:status → userId=${userId} isOnline=${isOnline}`);
};

const sendSnapshot = (socket: Socket) => {
  User.find({ isOnline: true }).select('_id').lean()
    .then((users) => {
      const onlineIds = users.map((u) => String(u._id));
      socket.emit('users:snapshot', { onlineIds });
      console.log(`[socket] snapshot sent: ${onlineIds.length} online`);
    })
    .catch(console.error);
};

export const initSocket = (httpServer: HttpServer): SocketServer => {
  io = new SocketServer(httpServer, {
    cors: {
      origin: [
        process.env.CLIENT_URL ?? 'http://localhost:5173',
        process.env.ADMIN_URL  ?? 'http://localhost:5174',
      ],
      credentials: true,
    },
  });

  io.on('connection', (socket: Socket) => {
    console.log(`[socket] new connection attempt: ${socket.id}`);
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) {
      console.warn(`[socket] rejected: no token (${socket.id})`);
      socket.disconnect();
      return;
    }

    let userId: string;
    let role: string;

    try {
      const payload = verifyAccessToken(token);
      userId = payload.id;
      role   = payload.role;
    } catch (err) {
      console.warn(`[socket] rejected: invalid token (${socket.id})`, (err as Error).message);
      socket.disconnect();
      return;
    }

    socketUserMap.set(socket.id, { userId, role });
    console.log(`[socket] ${role} connected: ${userId} (${socket.id})`);

    // Mark ANY connected user as online (admin or regular)
    User.findByIdAndUpdate(userId, { isOnline: true, lastSeen: new Date() })
      .then(() => broadcastUserStatus(userId, true))
      .catch(console.error);

    // Send snapshot to ALL connecting users so they see who's online immediately
    sendSnapshot(socket);

    if (role === 'admin') {
      socket.join('admins');

      socket.on('subscribe:users', (userIds: string[]) => {
        if (!Array.isArray(userIds)) return;
        userIds.forEach((id) => socket.join(`user:${id}`));
        console.log(`[socket] admin subscribed to ${userIds.length} users`);
      });

      socket.on('unsubscribe:users', (userIds: string[]) => {
        if (!Array.isArray(userIds)) return;
        userIds.forEach((id) => socket.leave(`user:${id}`));
      });

      // Per-user status pull
      socket.on('request:user:status', (uid: string) => {
        if (!uid) return;
        User.findById(uid).select('isOnline isActive').lean()
          .then((u) => {
            if (u) socket.emit('user:status', {
              userId: uid,
              isOnline: (u as any).isOnline ?? false,
              timestamp: new Date(),
            });
          })
          .catch(console.error);
      });

      // Full snapshot re-request (after page/search change)
      socket.on('request:snapshot', () => sendSnapshot(socket));

    } else {
      socket.join(`user:${userId}`);
    }

    socket.on('disconnect', () => {
      const entry = socketUserMap.get(socket.id);
      socketUserMap.delete(socket.id);
      if (!entry) return;

      const { userId: uid } = entry;
      // Only mark offline if no other socket is still connected for this user
      const stillConnected = [...socketUserMap.values()].some((e) => e.userId === uid);
      if (!stillConnected) {
        User.findByIdAndUpdate(uid, { isOnline: false, lastSeen: new Date() })
          .then(() => broadcastUserStatus(uid, false))
          .catch(console.error);
      }
    });
  });

  return io;
};

export const getIO = (): SocketServer => {
  if (!io) throw new Error('Socket.IO not initialized');
  return io;
};

import { Server as HttpServer } from 'http';
import { Server as SocketServer, Socket } from 'socket.io';
import { verifyAccessToken } from '../utils/jwt';
import User from '../models/User';

let io: SocketServer;

// socketId → { userId, role } for disconnect lookup
const socketUserMap = new Map<string, { userId: string; role: string }>();

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
    const token = socket.handshake.auth?.token as string | undefined;

    if (!token) { socket.disconnect(); return; }

    let userId: string;
    let role: string;

    try {
      const payload = verifyAccessToken(token);
      userId = payload.id;
      role   = payload.role;
    } catch {
      socket.disconnect();
      return;
    }

    socketUserMap.set(socket.id, { userId, role });

    if (role === 'admin') {
      socket.join('admins');

      // Admin subscribes to specific user-id topics
      socket.on('subscribe:users', (userIds: string[]) => {
        if (!Array.isArray(userIds)) return;
        userIds.forEach((id) => socket.join(`user:${id}`));
      });

      // Admin unsubscribes from user-id topics
      socket.on('unsubscribe:users', (userIds: string[]) => {
        if (!Array.isArray(userIds)) return;
        userIds.forEach((id) => socket.leave(`user:${id}`));
      });

    } else {
      // Regular user — join their personal room and mark online
      socket.join(`user:${userId}`);

      User.findByIdAndUpdate(userId, { isOnline: true, lastSeen: new Date() })
        .then(() => {
          io.to(`user:${userId}`).emit('user:status', {
            userId,
            isOnline: true,
            timestamp: new Date(),
          });
        })
        .catch(console.error);
    }

    socket.on('disconnect', () => {
      const entry = socketUserMap.get(socket.id);
      socketUserMap.delete(socket.id);

      if (!entry || entry.role === 'admin') return;

      const { userId: uid } = entry;

      // Only mark offline if no other socket for this user is active
      const stillConnected = [...socketUserMap.values()].some((e) => e.userId === uid);
      if (!stillConnected) {
        User.findByIdAndUpdate(uid, { isOnline: false, lastSeen: new Date() })
          .then(() => {
            io.to(`user:${uid}`).emit('user:status', {
              userId: uid,
              isOnline: false,
              timestamp: new Date(),
            });
          })
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

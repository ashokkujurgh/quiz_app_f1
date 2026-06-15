import { Server } from 'socket.io';

let _io: Server | null = null;

export function setIO(io: Server) { _io = io; }
export function getIO(): Server {
  if (!_io) throw new Error('Socket.IO not initialised');
  return _io;
}

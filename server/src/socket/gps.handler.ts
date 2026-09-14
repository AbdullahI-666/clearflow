import { Server } from 'socket.io';
import { AuthenticatedSocket } from './index.js';

export default (io: Server, socket: AuthenticatedSocket) => {
  if (socket.user?.role === 'Admin') {
    socket.join('admin:tracking');
  }

  socket.on('gps:update', (data: { lat: number; lng: number; accuracy?: number; teamId?: string }) => {
    const teamId = socket.user?.id || data.teamId;
    io.to('admin:tracking').emit('gps:update', { teamId, ...data });
  });
};

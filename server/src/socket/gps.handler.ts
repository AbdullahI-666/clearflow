import { Server } from 'socket.io';
import { AuthenticatedSocket } from './index.js';

export default (io: Server, socket: AuthenticatedSocket) => {
  if (socket.user?.role === 'Admin') {
    socket.join('admin:tracking');
  }

  socket.on('gps:update', (data: { lat: number; lng: number; accuracy?: number; teamId?: string }) => {
    // Only authenticated FieldTeam or Admin can broadcast GPS updates
    if (!socket.user || (socket.user.role !== 'FieldTeam' && socket.user.role !== 'Admin')) {
      return;
    }
    const teamId = data.teamId || socket.user.userId;
    io.to('admin:tracking').emit('gps:update', { ...data, teamId });
  });
};

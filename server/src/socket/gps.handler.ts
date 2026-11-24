import { Server } from 'socket.io';
import { AuthenticatedSocket } from './index.js';
import * as trackingService from '../services/gpsTracking.service.js';

export default (io: Server, socket: AuthenticatedSocket) => {
  if (socket.user?.role === 'Admin') {
    socket.join('admin:tracking');
  }

  socket.on('gps:update', (data: { lat: number; lng: number; accuracy?: number; teamId?: string; workOrderId?: string }) => {
    // Only authenticated FieldTeam or Admin can broadcast GPS updates
    if (!socket.user || (socket.user.role !== 'FieldTeam' && socket.user.role !== 'Admin')) {
      return;
    }
    const teamId = data.teamId || socket.user.userId;
    io.to('admin:tracking').emit('gps:update', { ...data, teamId });
    io.emit('client:gps_update', { ...data, teamId });
    io.emit('gps:update', { ...data, teamId });
  });

  socket.on('gps:telemetry_status', (data: { isBroadcasting: boolean; teamId?: string; workOrderId?: string }) => {
    const teamId = data.teamId || socket.user?.userId || '65f000000000000000000301';
    trackingService.setTelemetryStatus(teamId, data.isBroadcasting !== false);
    io.emit('gps:telemetry_status', {
      teamId,
      isBroadcasting: data.isBroadcasting !== false,
      workOrderId: data.workOrderId,
    });
  });
};

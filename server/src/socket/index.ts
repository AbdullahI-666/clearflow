import { Server as SocketIOServer, Socket } from 'socket.io';
import { jwtVerify } from 'jose';
import { env } from '../config/env.js';
import chatHandler from './chat.handler.js';
import gpsHandler from './gps.handler.js';

export interface AuthenticatedSocket extends Socket {
  user?: any;
}

let ioInstance: SocketIOServer | null = null;

export const initSocket = (httpServer: any) => {
  const io = new SocketIOServer(httpServer, { cors: { origin: '*' } });
  ioInstance = io;
  
  io.use(async (socket: AuthenticatedSocket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) {
        return next(new Error('Authentication required: No token provided'));
      }
      
      const secret = new TextEncoder().encode(env.JWT_SECRET);
      const { payload } = await jwtVerify(token, secret);
      socket.user = payload;
      next();
    } catch (err) {
      next(new Error('Authentication failed: Invalid or expired token'));
    }
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    const userId = socket.user?.userId || socket.user?.id || socket.user?._id;
    const role = socket.user?.role;

    if (userId) {
      socket.join(`user:${String(userId)}`);
    }
    if (role) {
      const normRole = String(role).toLowerCase().replace(/[-_]/g, '');
      socket.join(`role:${normRole}`);
      if (normRole === 'fieldteam') {
        socket.join('role:field_team');
      }
    }

    console.log(`[Socket] Connected: ${socket.id} (user: ${userId || 'anon'}, role: ${role || 'none'})`);
    
    chatHandler(io, socket);
    gpsHandler(io, socket);
    
    socket.on('disconnect', () => {
      console.log('Socket disconnected:', socket.id);
    });
  });

  return io;
};

export const getIo = (): SocketIOServer | null => ioInstance;

export const emitNotification = (
  userIds: (string | any)[] = [],
  roles: string[] = [],
  notification: any
) => {
  if (!ioInstance) return;
  const targetRooms = new Set<string>();

  for (const uid of userIds) {
    if (uid) {
      const str = typeof uid === 'object' ? (uid._id || uid.id || uid).toString() : String(uid);
      targetRooms.add(`user:${str}`);
    }
  }

  for (const r of roles) {
    if (r) {
      const norm = String(r).toLowerCase().replace(/[-_]/g, '');
      targetRooms.add(`role:${norm}`);
      if (norm === 'fieldteam') {
        targetRooms.add('role:field_team');
      }
    }
  }

  if (targetRooms.size === 0) {
    ioInstance.emit('notification:new', notification);
    return;
  }

  let emitter: any = ioInstance;
  for (const room of targetRooms) {
    emitter = emitter.to(room);
  }
  emitter.emit('notification:new', notification);
};

export const emitWorkOrderProgress = (workOrderId: string, progressData: any) => {
  if (!ioInstance) return;
  ioInstance.emit('workOrder:progress', {
    workOrderId,
    ...progressData,
  });
};

export const emitWorkOrderUpdate = (workOrderId: string, updateData: any) => {
  if (!ioInstance) return;
  ioInstance.emit('workOrder:updated', {
    workOrderId,
    ...updateData,
  });
};

export const emitCategoryUpdated = (action: 'created' | 'updated' | 'deleted', category: any) => {
  if (!ioInstance) return;
  ioInstance.emit('category:updated', { action, category });
  ioInstance.emit(`category:${action}`, category);
  ioInstance.emit('categories:changed', { action, category });
};

export const emitSettingsUpdated = (settings: any) => {
  if (!ioInstance) return;
  ioInstance.emit('settings:updated', settings);
  ioInstance.emit('company:updated', settings);
};

export const emitCompanyUpdated = (companyInfo: any) => {
  if (!ioInstance) return;
  ioInstance.emit('company:updated', companyInfo);
  ioInstance.emit('company:profile_updated', companyInfo);
};

export const emitUserRegistered = (user: any) => {
  if (!ioInstance) return;
  ioInstance.to('role:admin').emit('user:registered', user);
  ioInstance.emit('user:new', user);
};

export const emitUserUpdated = (user: any) => {
  if (!ioInstance) return;
  // Broadcast to all connected portals (Admin, Client, Worker)
  ioInstance.emit('user:updated', user);
  ioInstance.emit('profile:updated', user);
  ioInstance.to('role:admin').emit('user:updated', user);
  const uId = user.id || user._id;
  if (uId) {
    ioInstance.to(`user:${String(uId)}`).emit('user:updated', user);
  }
};

export const emitProfileUpdated = (user: any) => {
  if (!ioInstance) return;
  ioInstance.emit('profile:updated', user);
  ioInstance.emit('user:updated', user);
};

export const emitWorkOrderCreated = (workOrder: any) => {
  if (!ioInstance) return;
  ioInstance.to('role:admin').emit('workOrder:created', workOrder);
  ioInstance.emit('workOrder:new', workOrder);
};


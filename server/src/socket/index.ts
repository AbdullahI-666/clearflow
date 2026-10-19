import { Server as SocketIOServer, Socket } from 'socket.io';
import { jwtVerify } from 'jose';
import { env } from '../config/env.js';
import chatHandler from './chat.handler.js';
import gpsHandler from './gps.handler.js';

export interface AuthenticatedSocket extends Socket {
  user?: any;
}

export const initSocket = (httpServer: any) => {
  const io = new SocketIOServer(httpServer, { cors: { origin: '*' } });
  
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
    console.log('Socket connected:', socket.id);
    chatHandler(io, socket);
    gpsHandler(io, socket);
    
    socket.on('disconnect', () => {
      console.log('Socket disconnected:', socket.id);
    });
  });

  return io;
};

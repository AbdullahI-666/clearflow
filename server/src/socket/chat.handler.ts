import { Server, Socket } from 'socket.io';
import * as chatService from '../services/chat.service.js';

export default (io: Server, socket: Socket) => {
  socket.on('chat:join', (workOrderId: string) => {
    socket.join(`chat:${workOrderId}`);
    socket.join(`chat_${workOrderId}`);
    socket.join(workOrderId);
  });

  socket.on('chat:message', async (data: { workOrderId: string; message: string; channelId?: string }) => {
    const user = (socket as any).user;
    if (!user || !user.userId) return;

    // Strict identity enforcement from authenticated JWT - no client spoofing
    const senderId = user.userId;
    const senderRole = user.role || 'Client';
    const channelId = data.channelId || data.workOrderId;

    const cleanId = String(channelId || data.workOrderId).replace(/^(?:cli_|wrk_|direct_)/, '');

    const msgObj = await chatService.sendMessage(
      cleanId || channelId,
      senderId,
      senderRole as any,
      data.message
    );

    const broadcastRooms = Array.from(new Set([
      `chat:${channelId}`, `chat_${channelId}`, channelId,
      `chat:${data.workOrderId}`, `chat_${data.workOrderId}`, data.workOrderId,
      `chat:${cleanId}`, `chat_${cleanId}`, cleanId,
      `chat:cli_${cleanId}`, `cli_${cleanId}`,
      `chat:wrk_${cleanId}`, `wrk_${cleanId}`,
      `chat:direct_${cleanId}`, `direct_${cleanId}`,
    ])).filter(Boolean);

    for (const room of broadcastRooms) {
      io.to(room).emit('chat:message', { ...msgObj, channelId, workOrderId: cleanId, cleanId });
    }
    io.emit('chat:message', { ...msgObj, channelId, workOrderId: cleanId, cleanId });
  });
};

import { Server, Socket } from 'socket.io';
import * as chatService from '../services/chat.service.js';

export default (io: Server, socket: Socket) => {
  socket.on('chat:join', (workOrderId: string) => {
    socket.join(`chat:${workOrderId}`);
    socket.join(`chat_${workOrderId}`);
    socket.join(workOrderId);
  });

  socket.on('chat:message', async (data: { workOrderId: string; message: string }) => {
    const user = (socket as any).user;
    if (!user || !user.userId) return;

    // Strict identity enforcement from authenticated JWT - no client spoofing
    const senderId = user.userId;
    const senderRole = user.role || 'Client';

    const msgObj = await chatService.sendMessage(
      data.workOrderId,
      senderId,
      senderRole as any,
      data.message
    );

    io.to(`chat:${data.workOrderId}`)
      .to(`chat_${data.workOrderId}`)
      .to(data.workOrderId)
      .emit('chat:message', msgObj);
  });
};

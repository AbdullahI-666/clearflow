import { Server, Socket } from 'socket.io';
import * as chatService from '../services/chat.service.js';

export default (io: Server, socket: Socket) => {
  socket.on('chat:join', (workOrderId: string) => {
    socket.join(`chat:${workOrderId}`);
    socket.join(`chat_${workOrderId}`);
    socket.join(workOrderId);
  });

  socket.on('chat:message', async (data: { workOrderId: string; message: string; senderId?: string; senderRole?: string }) => {
    const user = (socket as any).user;
    const senderId = user?.userId || data.senderId || 'user';
    const senderRole = user?.role || data.senderRole || 'Client';

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

import { ChatMessage } from '../models/chatMessage.model.js';
import { DEMO_USERS } from './auth.service.js';

interface InMemoryMessage {
  _id: string;
  workOrderId: string;
  senderId: { _id: string; name: string; email: string; role: string } | string;
  senderRole: 'Client' | 'FieldTeam' | 'Admin';
  message: string;
  isRead: boolean;
  sentAt: string;
}

const INITIAL_MESSAGES: InMemoryMessage[] = [
  {
    _id: 'msg_001',
    workOrderId: '65f000000000000000000201',
    senderId: { _id: '65f000000000000000000002', name: 'Alex Morgan', email: 'alex@clearflow.com', role: 'Client' },
    senderRole: 'Client',
    message: 'Hello Bilal, we have unlocked lecture hall 302 for your crew.',
    isRead: true,
    sentAt: new Date(Date.now() - 3600 * 1000 * 2).toISOString(),
  },
  {
    _id: 'msg_002',
    workOrderId: '65f000000000000000000201',
    senderId: { _id: '65f000000000000000000004', name: 'James Chen', email: 'james@clearflow.com', role: 'FieldTeam' },
    senderRole: 'FieldTeam',
    message: 'Thank you Alex! Alpha crew has arrived on site with equipment.',
    isRead: true,
    sentAt: new Date(Date.now() - 3600 * 1000 * 1.5).toISOString(),
  },
  {
    _id: 'msg_003',
    workOrderId: 'WO-2026-0001',
    senderId: { _id: '65f000000000000000000002', name: 'Alex Morgan', email: 'alex@clearflow.com', role: 'Client' },
    senderRole: 'Client',
    message: 'Hello Bilal, we have unlocked lecture hall 302 for your crew.',
    isRead: true,
    sentAt: new Date(Date.now() - 3600 * 1000 * 2).toISOString(),
  },
  {
    _id: 'msg_004',
    workOrderId: 'WO-2026-0001',
    senderId: { _id: '65f000000000000000000004', name: 'James Chen', email: 'james@clearflow.com', role: 'FieldTeam' },
    senderRole: 'FieldTeam',
    message: 'Thank you Alex! Alpha crew has arrived on site with equipment.',
    isRead: true,
    sentAt: new Date(Date.now() - 3600 * 1000 * 1.5).toISOString(),
  }
];

const CHAT_STORE: InMemoryMessage[] = [...INITIAL_MESSAGES];

export const getMessages = async (workOrderId: string) => {
  try {
    const dbMessages = await Promise.race([
      ChatMessage.find({ workOrderId }).sort({ sentAt: 1 }).populate('senderId', 'name email role'),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 1500))
    ]) as any[];

    if (dbMessages && dbMessages.length > 0) {
      return dbMessages;
    }
  } catch (err) {
    // Fallback to in-memory store
  }

  const found = CHAT_STORE.filter(m => m.workOrderId === workOrderId || m.workOrderId === `WO-${workOrderId}`);
  return found;
};

export const sendMessage = async (
  workOrderId: string,
  senderId: string,
  senderRole: 'Client' | 'FieldTeam' | 'Admin',
  message: string
) => {
  const senderObj = DEMO_USERS.find(u => u._id === senderId) || {
    _id: senderId,
    name: senderRole === 'Client' ? 'Alex Morgan' : senderRole === 'FieldTeam' ? 'James Chen' : 'ClearFlow Admin',
    email: senderRole === 'Client' ? 'client@clearflow.com' : senderRole === 'FieldTeam' ? 'field@clearflow.com' : 'admin@clearflow.com',
    role: senderRole
  };

  const newMsg: InMemoryMessage = {
    _id: 'msg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
    workOrderId,
    senderId: {
      _id: senderObj._id,
      name: senderObj.name,
      email: senderObj.email,
      role: senderObj.role
    },
    senderRole,
    message: (message || '').trim(),
    isRead: false,
    sentAt: new Date().toISOString()
  };

  CHAT_STORE.push(newMsg);

  try {
    const dbDoc = await Promise.race([
      ChatMessage.create({
        workOrderId,
        senderId,
        senderRole,
        message: (message || '').trim(),
        sentAt: new Date()
      }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 1500))
    ]) as any;

    if (dbDoc) {
      return {
        _id: dbDoc._id.toString(),
        workOrderId,
        senderId: newMsg.senderId,
        senderRole,
        message: newMsg.message,
        isRead: false,
        sentAt: dbDoc.sentAt.toISOString()
      };
    }
  } catch (err) {
    // If DB is offline, return memory object
  }

  return newMsg;
};

export const markAsRead = async (workOrderId: string, userId: string) => {
  CHAT_STORE.forEach(m => {
    if (m.workOrderId === workOrderId) {
      m.isRead = true;
    }
  });

  try {
    await ChatMessage.updateMany(
      { workOrderId, senderId: { $ne: userId } },
      { $set: { isRead: true } }
    );
  } catch (err) {}

  return { success: true };
};

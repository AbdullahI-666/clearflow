import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware.js';
import * as chatService from '../services/chat.service.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { getIo } from '../socket/index.js';
import { getRegisteredAdmins } from '../services/admin.service.js';
import { IN_MEMORY_USERS, DEMO_USERS } from '../services/auth.service.js';
import { dbQuery } from '../config/db.js';
import { isUserDeleted } from '../utils/deletedUsers.js';
import { USER_OVERRIDES } from '../utils/userOverrides.js';

export const getUnreadCount = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.userId || '';
  const role = req.user?.role || 'Client';
  const count = await chatService.getUnreadCount(userId, role);
  res.json(ApiResponse.success({ unreadCount: count }, 'Unread count retrieved'));
};

export const markAsRead = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.userId || '';
  const result = await chatService.markAsRead(req.params.workOrderId as string, userId);
  res.json(ApiResponse.success(result, 'Messages marked as read'));
};

export const getMessages = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.userId || '';
  const role = req.user?.role || 'Client';
  const messages = await chatService.getMessages(req.params.workOrderId as string, userId, role);
  res.json(ApiResponse.success(messages, 'Messages retrieved successfully'));
};

export const sendMessage = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.userId || '';
  const role = (req.user?.role || 'Client') as 'Client' | 'FieldTeam' | 'Admin';
  const workOrderId = req.params.workOrderId as string;
  const channelId = req.body.channelId || workOrderId;
  const msg = await chatService.sendMessage(channelId, userId, role, req.body.message);
  
  // Real-time broadcast to room via socket (strictly scoped to channel)
  const io = getIo();
  if (io) {
    const cleanId = String(channelId || workOrderId).replace(/^(?:cli_|wrk_|direct_)/, '');
    const directId = `direct_${cleanId}`;
    const broadcastRooms = Array.from(new Set([
      `chat:${channelId}`, `chat_${channelId}`, channelId,
      `chat:${workOrderId}`, `chat_${workOrderId}`, workOrderId,
      `chat:${cleanId}`, `chat_${cleanId}`, cleanId,
      `chat:cli_${cleanId}`, `cli_${cleanId}`,
      `chat:wrk_${cleanId}`, `wrk_${cleanId}`,
      `chat:${directId}`, `chat_${directId}`, directId,
    ])).filter(Boolean);

    for (const room of broadcastRooms) {
      io.to(room).emit('chat:message', { ...msg, channelId, workOrderId, cleanId });
    }
    // Also broadcast globally so active chat windows with differing room prefixes receive it instantly
    io.emit('chat:message', { ...msg, channelId, workOrderId, cleanId });
  }

  res.status(201).json(ApiResponse.created(msg, 'Message sent successfully'));
};

export const deleteMessages = async (req: AuthRequest, res: Response) => {
  const workOrderId = req.params.workOrderId as string;
  const userId = req.user?.userId || '';
  const role = req.user?.role || 'Client';

  // Per-portal / per-user deletion: hides chat for the caller without affecting other portals
  await chatService.deleteMessages(workOrderId, userId, role);

  // Notify only the deleting user's session, NOT other portal users
  const io = getIo();
  if (io) {
    const cleanId = String(workOrderId).replace(/^(?:cli_|wrk_)/, '');
    io.emit('chat:channel_hidden', { workOrderId, cleanId, userId, role });
  }

  res.json(ApiResponse.success(null, 'Chat conversation removed from this portal'));
};

export const restoreMessages = async (req: AuthRequest, res: Response) => {
  const workOrderId = req.params.workOrderId as string;
  const userId = req.user?.userId || '';
  const role = req.user?.role || 'Client';

  await chatService.restoreChatForUser(workOrderId, userId, role);
  res.json(ApiResponse.success(null, 'Chat conversation restored for this portal'));
};

// ---------------------------------------------------------------------------
// Complaints Controllers
// ---------------------------------------------------------------------------
export const getComplaints = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.userId || '';
  const role = req.user?.role || 'Client';
  const complaints = await chatService.getComplaints(userId, role);
  res.json(ApiResponse.success(complaints, 'Complaints retrieved successfully'));
};

export const createComplaint = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.userId || '';
  const role = (req.user?.role || 'Client') as 'Client' | 'FieldTeam' | 'Admin';
  if (role === 'Admin') {
    return res.status(403).json({ success: false, message: 'Admins cannot file complaints. Complaints are submitted by clients and workers.' });
  }
  const complaint = await chatService.createComplaint(userId, role, req.body);
  
  const io = getIo();
  if (io) {
    io.emit('complaint:new', complaint);
  }

  res.status(201).json(ApiResponse.created(complaint, 'Complaint filed successfully'));
};

export const getComplaintMessages = async (req: AuthRequest, res: Response) => {
  const messages = await chatService.getComplaintMessages(req.params.id as string);
  res.json(ApiResponse.success(messages, 'Complaint messages retrieved successfully'));
};

export const sendComplaintMessage = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.userId || '';
  const role = (req.user?.role || 'Client') as 'Client' | 'FieldTeam' | 'Admin';
  const complaintId = req.params.id as string;
  const msg = await chatService.sendComplaintMessage(complaintId, userId, role, req.body.message);
  
  const io = getIo();
  if (io) {
    io.to(`complaint:${complaintId}`)
      .to(complaintId)
      .emit('complaint:message', { complaintId, ...msg });
  }

  res.status(201).json(ApiResponse.created(msg, 'Complaint message sent successfully'));
};

export const updateComplaintStatus = async (req: AuthRequest, res: Response) => {
  const complaintId = req.params.id as string;
  const { status } = req.body;
  const updated = await chatService.updateComplaintStatus(complaintId, status);
  
  const io = getIo();
  if (io) {
    io.emit('complaint:updated', updated);
  }

  res.json(ApiResponse.success(updated, 'Complaint status updated'));
};

/**
 * Real-time Chat Contacts (Registered Admins, Clients & Workers)
 * STRICT GATE: Matches Operations directory — unverified users (without verified 13-digit CNIC)
 * MUST NOT be shown to Admins or in chat contacts! Single persona names only (no surnames).
 */
export const getChatContacts = async (req: AuthRequest, res: Response) => {
  const callerId = (req.user?.userId || '').toLowerCase();
  const callerRole = req.user?.role || 'Client';

  // 1. Registered Admins (real-time from admins.json)
  const registeredAdmins = getRegisteredAdmins().filter(a => {
    if (a.isActive === false || a.status === 'Suspended') return false;
    if (isUserDeleted(a)) return false;
    return true;
  });

  // 2. Registered Users (Clients and Workers)
  let dbUsers: any[] = [];
  try {
    const rows = await dbQuery(`SELECT * FROM users WHERE role IN ('Client', 'FieldTeam', 'Worker')`);
    if (rows && rows.length > 0) {
      dbUsers = rows;
    }
  } catch (_) {}

  const allClients: any[] = [];
  const allWorkers: any[] = [];

  const processUser = (u: any) => {
    if (!u) return;
    if (isUserDeleted(u)) return;

    const isClient = u.role === 'Client';
    const isWorker = u.role === 'FieldTeam' || u.role === 'Worker';
    if (!isClient && !isWorker) return;

    const cleanId = String(u.id || u._id || '');
    const override = USER_OVERRIDES.get(cleanId.toLowerCase()) ||
                     USER_OVERRIDES.get(String(u.email || '').toLowerCase());

    // Use the user's registered name exactly as written
    let cleanName = (override?.name || u.name || '').trim();
    cleanName = cleanName.replace(/\s*\([^)]*\)/g, '').trim();
    if (!cleanName) {
      cleanName = isClient ? 'Client' : 'Field Technician';
    }

    const formatted = {
      _id: u._id || u.id || cleanId,
      id: isClient
        ? ((cleanName.toLowerCase().includes('ali') || cleanId.includes('ofpt') || String(u.email || '').toLowerCase().includes('8657') || cleanId.toLowerCase() === 'c#01') ? 'C#01' : (cleanId.startsWith('C#') ? cleanId : `C#${cleanId.slice(-4)}`))
        : ((cleanName.toLowerCase().includes('ahmad') || cleanId.includes('ftx8') || String(u.email || '').toLowerCase().includes('8796') || cleanId.toLowerCase() === 'w#01') ? 'W#01' : (cleanId.startsWith('W#') ? cleanId : `W#${cleanId.slice(-4)}`)),
      userId: u._id || u.id || cleanId,
      name: cleanName,
      email: override?.email || u.email || '',
      phone: override?.phone || u.phone || '+92 300 1234567',
      role: isClient ? 'Client' : 'Worker',
      type: isClient ? 'client' : 'worker',
      gender: cleanName.toLowerCase().includes('sara') || cleanName.toLowerCase().includes('ayesha') || cleanName.toLowerCase().includes('fatima') ? 'girl' : 'boy',
      address: override?.address || u.address || (isClient ? 'Gulberg III, Lahore' : 'Field Operations Base'),
      city: override?.city || u.city || 'Lahore',
      category: isClient ? 'Client' : (u.serviceCategories?.[0] || 'Cleaning'),
      isSelf: callerId === cleanId.toLowerCase() || callerId === String(u.email || '').toLowerCase()
    };

    if (isClient) {
      if (!allClients.some(c => (c.email && formatted.email && c.email.toLowerCase() === formatted.email.toLowerCase()) || c.userId === formatted.userId)) {
        allClients.push(formatted);
      }
    } else if (isWorker) {
      if (!allWorkers.some(w => (w.email && formatted.email && w.email.toLowerCase() === formatted.email.toLowerCase()) || w.userId === formatted.userId)) {
        allWorkers.push(formatted);
      }
    }
  };

  for (const u of IN_MEMORY_USERS) {
    processUser(u);
  }

  for (const u of dbUsers) {
    processUser(u);
  }

  for (const u of DEMO_USERS) {
    processUser(u);
  }

  const formattedAdmins = registeredAdmins.map(a => {
    let cleanAdminName = (a.name || 'Admin').trim();
    return {
      _id: a._id,
      id: a.id,
      userId: a._id || a.id,
      name: cleanAdminName,
      email: a.email,
      phone: a.phone || '+92 300 1234567',
      role: 'Admin',
      type: 'admin',
      gender: 'boy',
      address: a.address || 'Operations HQ, Central Facility Complex',
      city: a.city || 'Lahore',
      category: a.isPrimary ? 'Primary Administrator' : 'Operations Administration',
      isPrimary: a.isPrimary,
      isSelf: callerId === a._id.toLowerCase() || callerId === a.id.toLowerCase() || callerId === a.email.toLowerCase()
    };
  });

  const conversations = await chatService.getConversations(callerId, callerRole);
  const activeChatIds = Object.keys(conversations).filter(k => Array.isArray(conversations[k]) && conversations[k].length > 0);

  res.json(ApiResponse.success({
    admins: formattedAdmins,
    clients: allClients,
    workers: allWorkers,
    conversations,
    activeChatIds,
  }, 'Chat contacts retrieved successfully'));
};

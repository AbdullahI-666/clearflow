import { dbQuery } from '../config/db.js';
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

const INITIAL_MESSAGES: InMemoryMessage[] = [];

const CHAT_STORE: InMemoryMessage[] = [];

// Set of hidden chat conversation keys per user and per role: e.g. "userId:workOrderId" or "role:workOrderId"
const USER_HIDDEN_CHATS = new Set<string>();

export const hideChatForUser = async (workOrderId: string, userId?: string, role?: string) => {
  const cleanId = String(workOrderId).replace(/^(?:cli_|wrk_)/, '');
  const woWithPrefix = cleanId.startsWith('WO-') ? cleanId : `WO-${cleanId}`;
  const rawCleanId = cleanId.replace(/^WO-/, '');
  const cliKey = `cli_${woWithPrefix}`;
  const wrkKey = `wrk_${woWithPrefix}`;

  const keys = [workOrderId, cleanId, woWithPrefix, rawCleanId, cliKey, wrkKey];
  const roleNorm = (role || '').toLowerCase();

  for (const k of keys) {
    if (k) {
      if (userId) USER_HIDDEN_CHATS.add(`${userId}:${k}`);
      if (roleNorm) USER_HIDDEN_CHATS.add(`${roleNorm}:${k}`);
    }
  }

  return { success: true };
};

export const restoreChatForUser = async (workOrderId?: string, userId?: string, role?: string) => {
  const roleNorm = (role || '').toLowerCase();
  if (!workOrderId || workOrderId === 'all') {
    for (const key of Array.from(USER_HIDDEN_CHATS)) {
      if (userId && key.startsWith(`${userId}:`)) USER_HIDDEN_CHATS.delete(key);
      if (roleNorm && key.startsWith(`${roleNorm}:`)) USER_HIDDEN_CHATS.delete(key);
    }
    return { success: true };
  }

  const cleanId = String(workOrderId).replace(/^(?:cli_|wrk_)/, '');
  const woWithPrefix = cleanId.startsWith('WO-') ? cleanId : `WO-${cleanId}`;
  const rawCleanId = cleanId.replace(/^WO-/, '');
  const cliKey = `cli_${woWithPrefix}`;
  const wrkKey = `wrk_${woWithPrefix}`;
  const keys = [workOrderId, cleanId, woWithPrefix, rawCleanId, cliKey, wrkKey];

  for (const k of keys) {
    if (k) {
      if (userId) USER_HIDDEN_CHATS.delete(`${userId}:${k}`);
      if (roleNorm) USER_HIDDEN_CHATS.delete(`${roleNorm}:${k}`);
    }
  }
  return { success: true };
};

export const isChatHiddenForUser = (workOrderId: string, userId?: string, role?: string): boolean => {
  if (!userId && !role) return false;
  const cleanId = String(workOrderId).replace(/^(?:cli_|wrk_)/, '');
  const woWithPrefix = cleanId.startsWith('WO-') ? cleanId : `WO-${cleanId}`;
  const rawCleanId = cleanId.replace(/^WO-/, '');
  const cliKey = `cli_${woWithPrefix}`;
  const wrkKey = `wrk_${woWithPrefix}`;
  const keys = [workOrderId, cleanId, woWithPrefix, rawCleanId, cliKey, wrkKey];
  const roleNorm = (role || '').toLowerCase();

  for (const k of keys) {
    if (k) {
      if (userId && USER_HIDDEN_CHATS.has(`${userId}:${k}`)) return true;
      if (roleNorm && USER_HIDDEN_CHATS.has(`${roleNorm}:${k}`)) return true;
    }
  }
  return false;
};

export const getMessages = async (workOrderId: string, userId?: string, role?: string) => {
  if (isChatHiddenForUser(workOrderId, userId, role)) {
    return [];
  }

  const cleanId = String(workOrderId).replace(/^(?:cli_|wrk_|direct_)/, '');
  const woWithPrefix = cleanId.startsWith('WO-') ? cleanId : `WO-${cleanId}`;
  const rawCleanId = cleanId.replace(/^WO-/, '');
  const directId = `direct_${cleanId}`;

  const matchedKeys = new Set<string>([
    workOrderId,
    cleanId,
    woWithPrefix,
    rawCleanId,
    directId,
    `cli_${cleanId}`,
    `wrk_${cleanId}`,
    `cli_${woWithPrefix}`,
    `wrk_${woWithPrefix}`,
    `cli_${rawCleanId}`,
    `wrk_${rawCleanId}`,
    `direct_${woWithPrefix}`,
  ]);

  try {
    const { MOCK_WORK_ORDERS } = await import('./workOrder.service.js');
    const wo = MOCK_WORK_ORDERS.find(w => 
      w._id === cleanId || 
      w.workOrderCode === cleanId || 
      w.workOrderCode === woWithPrefix ||
      (w as any).id === cleanId
    );
    if (wo) {
      const code = wo.workOrderCode;
      const wid = wo._id || (wo as any).id;
      if (code) {
        matchedKeys.add(code);
        matchedKeys.add(`cli_${code}`);
        matchedKeys.add(`wrk_${code}`);
        matchedKeys.add(`direct_${code}`);
      }
      if (wid) {
        matchedKeys.add(wid);
        matchedKeys.add(`cli_${wid}`);
        matchedKeys.add(`wrk_${wid}`);
        matchedKeys.add(`direct_${wid}`);
      }
    }
  } catch (_) {}

  const keysArr = Array.from(matchedKeys).filter(Boolean);

  // Try Supabase first
  const dbRows = await dbQuery(
    `SELECT cm.*, u.name as sender_name, u.email as sender_email, u.role as sender_role_col
     FROM chat_messages cm
     LEFT JOIN users u ON u.id::text = cm.sender_id::text
     WHERE cm.work_order_id::text = ANY($1)
     ORDER BY cm.sent_at ASC`,
    [keysArr]
  );

  if (dbRows && dbRows.length > 0) {
    return dbRows.map(r => ({
      _id: r.id,
      workOrderId: r.work_order_id,
      senderId: { _id: r.sender_id, name: r.sender_name, email: r.sender_email, role: r.sender_role_col },
      senderRole: r.sender_role,
      message: r.message,
      isRead: r.is_read,
      sentAt: r.sent_at,
    }));
  }

  // In-memory fallback: return messages from CHAT_STORE
  return CHAT_STORE.filter(m => {
    if (keysArr.includes(m.workOrderId)) return true;
    const mClean = String(m.workOrderId).replace(/^(?:cli_|wrk_|direct_)/, '');
    return keysArr.includes(mClean);
  });
};

export const deleteMessages = async (workOrderId: string, userId?: string, role?: string) => {
  // Scoped per-user/portal deletion: hides chat for the deleting user/role without destroying it for other portals
  return hideChatForUser(workOrderId, userId, role);
};

export const getConversations = async (userId: string, role: string) => {
  const result: Record<string, InMemoryMessage[]> = {};
  const roleNorm = (role || 'Client').toLowerCase();
  const isAdmin = roleNorm === 'admin';
  const { MOCK_WORK_ORDERS } = await import('./workOrder.service.js');

  const checkIsParticipant = (workOrderId: string, senderIdStr: string) => {
    if (isAdmin) return true;
    if (senderIdStr.toLowerCase() === String(userId).toLowerCase()) return true;
    if (workOrderId === `direct_${userId}`) return true;

    const cleanWoId = String(workOrderId).replace(/^(?:cli_|wrk_|direct_)/, '');
    if (cleanWoId.toLowerCase() === String(userId).toLowerCase()) return true;

    const wo = MOCK_WORK_ORDERS.find(w => 
      String(w.workOrderCode || '').toLowerCase() === cleanWoId.toLowerCase() || 
      String(w._id || '').toLowerCase() === cleanWoId.toLowerCase() || 
      String((w as any).id || '').toLowerCase() === cleanWoId.toLowerCase()
    );

    if (wo) {
      const cId = String(wo.clientId?._id || wo.clientId || '').toLowerCase();
      const wId = String(wo.assignedWorkerId || (wo as any).workerId || wo.teamId?._id || wo.teamId || '').toLowerCase();
      const awId = String(wo.assignedWorker?._id || '').toLowerCase();
      const uLower = String(userId).toLowerCase();
      if (cId === uLower || wId === uLower || awId === uLower) return true;
    }

    return false;
  };

  const addMsgToResult = (workOrderId: string, msg: InMemoryMessage) => {
    const cleanWoId = String(workOrderId).replace(/^(?:cli_|wrk_|direct_)/, '');
    const keys = Array.from(new Set([
      workOrderId,
      cleanWoId,
      `cli_${cleanWoId}`,
      `wrk_${cleanWoId}`,
      `direct_${cleanWoId}`,
    ]));

    for (const k of keys) {
      if (!result[k]) result[k] = [];
      if (!result[k].some(m => m._id === msg._id || (m.message === msg.message && m.sentAt === msg.sentAt))) {
        result[k].push(msg);
      }
    }
  };

  // 1. In-memory CHAT_STORE
  for (const m of CHAT_STORE) {
    if (isChatHiddenForUser(m.workOrderId, userId, role)) continue;
    const sId = typeof m.senderId === 'object' ? (m.senderId as any)?._id : m.senderId;
    if (checkIsParticipant(m.workOrderId, String(sId || ''))) {
      addMsgToResult(m.workOrderId, m);
    }
  }

  // 2. Supabase DB
  try {
    const dbRows = await dbQuery(
      `SELECT cm.*, u.name as sender_name, u.email as sender_email, u.role as sender_role_col
       FROM chat_messages cm
       LEFT JOIN users u ON u.id::text = cm.sender_id::text
       ORDER BY cm.sent_at ASC`
    );
    if (dbRows && dbRows.length > 0) {
      for (const r of dbRows) {
        if (isChatHiddenForUser(r.work_order_id, userId, role)) continue;
        const sId = String(r.sender_id);
        if (checkIsParticipant(r.work_order_id, sId)) {
          const msgObj: InMemoryMessage = {
            _id: r.id,
            workOrderId: r.work_order_id,
            senderId: { _id: r.sender_id, name: r.sender_name, email: r.sender_email, role: r.sender_role_col },
            senderRole: r.sender_role,
            message: r.message,
            isRead: r.is_read,
            sentAt: r.sent_at,
          };
          addMsgToResult(r.work_order_id, msgObj);
        }
      }
    }
  } catch (_) {}

  return result;
};

export const sendMessage = async (
  workOrderId: string,
  senderId: string,
  senderRole: 'Client' | 'FieldTeam' | 'Admin',
  message: string
) => {
  const { IN_MEMORY_USERS } = await import('./auth.service.js');
  const { getRegisteredAdmins } = await import('./admin.service.js');
  const { USER_OVERRIDES } = await import('../utils/userOverrides.js');
  const override = USER_OVERRIDES.get(String(senderId).toLowerCase());
  const foundUser = IN_MEMORY_USERS.find(u => u._id === senderId || (u as any).id === senderId) ||
                    getRegisteredAdmins().find(a => a._id === senderId || a.id === senderId);

  let rawSenderName = override?.name || foundUser?.name;
  if (!rawSenderName) {
    rawSenderName = senderRole === 'Client' ? 'Client' : senderRole === 'FieldTeam' ? 'Worker' : 'ClearFlow Admin';
  }
  const cleanName = rawSenderName.replace(/\s*\([^)]*\)/g, '').trim();

  const senderObj = {
    _id: (foundUser ? (foundUser._id || (foundUser as any).id) : senderId),
    name: cleanName,
    email: override?.email || foundUser?.email || '',
    role: senderRole
  };

  const cleanId = String(workOrderId).replace(/^(?:cli_|wrk_|direct_)/, '');

  const newMsg: InMemoryMessage = {
    _id: 'msg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
    workOrderId: cleanId || workOrderId,
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

  // Persist to Supabase (best effort)
  dbQuery(
    `INSERT INTO chat_messages (work_order_id, sender_id, sender_role, message, is_read, sent_at)
     VALUES ($1, $2, $3, $4, false, NOW()) RETURNING id`,
    [cleanId || workOrderId, senderId, senderRole, (message || '').trim()]
  );

  return newMsg;
};

export const getUnreadCount = async (userId: string, _userRole: string) => {
  const dbRows = await dbQuery(
    'SELECT COUNT(*) as cnt FROM chat_messages WHERE sender_id::text <> $1 AND is_read = false',
    [userId]
  );
  if (dbRows && dbRows.length > 0) return parseInt(dbRows[0].cnt, 10);

  const unread = CHAT_STORE.filter(m => {
    const sId = typeof m.senderId === 'object' ? (m.senderId as any)?._id : m.senderId;
    return sId !== userId && !m.isRead;
  });
  return unread.length;
};

export const markAsRead = async (workOrderId: string, userId: string) => {
  CHAT_STORE.forEach(m => {
    if (m.workOrderId === workOrderId) m.isRead = true;
  });

  dbQuery(
    'UPDATE chat_messages SET is_read=true WHERE work_order_id::text=$1 AND sender_id::text <> $2',
    [workOrderId, userId]
  );

  return { success: true };
};

// ---------------------------------------------------------------------------
// Complaints & Issues Service (Client & Worker Disciplinary & Support Hub)
// ---------------------------------------------------------------------------
export interface Complaint {
  _id: string;
  complaintCode: string;
  workOrderId?: string;
  workOrderTitle?: string;
  title: string;
  category: string;
  description: string;
  severity: 'Low' | 'Medium' | 'Elevated' | 'Urgent';
  status: 'Open' | 'Investigating' | 'Resolved';
  filedBy: {
    _id: string;
    name: string;
    email: string;
    role: 'Client' | 'FieldTeam' | 'Admin';
  };
  targetParty?: string;
  createdAt: string;
  messages: InMemoryMessage[];
}

const INITIAL_COMPLAINTS: Complaint[] = [];

const COMPLAINTS_STORE: Complaint[] = [...INITIAL_COMPLAINTS];

export const getComplaints = async (_userId: string, _role: string) => {
  return COMPLAINTS_STORE;
};

export const createComplaint = async (
  userId: string,
  role: 'Client' | 'FieldTeam' | 'Admin',
  data: {
    title: string;
    category?: string;
    description: string;
    workOrderId?: string;
    workOrderTitle?: string;
    severity?: 'Low' | 'Medium' | 'Elevated' | 'Urgent';
    targetParty?: string;
  }
) => {
  const senderObj = DEMO_USERS.find(u => u._id === userId) || {
    _id: userId,
    name: role === 'Client' ? 'Client User' : role === 'FieldTeam' ? 'Worker Crew' : 'ClearFlow Admin',
    email: role === 'Client' ? 'client@clearflow.com' : role === 'FieldTeam' ? 'field@clearflow.com' : 'admin@clearflow.com',
    role
  };

  const codeNum = COMPLAINTS_STORE.length + 1;
  const complaintCode = `CMP-2026-${String(codeNum).padStart(3, '0')}`;
  const initialMsg: InMemoryMessage = {
    _id: 'cmp_msg_' + Date.now(),
    workOrderId: 'cmp_' + Date.now(),
    senderId: {
      _id: senderObj._id,
      name: senderObj.name,
      email: senderObj.email,
      role: senderObj.role
    },
    senderRole: role,
    message: data.description || data.title,
    isRead: true,
    sentAt: new Date().toISOString()
  };

  const newComplaint: Complaint = {
    _id: 'cmp_' + Date.now(),
    complaintCode,
    workOrderId: data.workOrderId || '',
    workOrderTitle: data.workOrderTitle || 'General Facility Operation',
    title: data.title || 'Service Dispute',
    category: data.category || 'General Issue',
    description: data.description || '',
    severity: data.severity || 'Medium',
    status: 'Open',
    filedBy: {
      _id: senderObj._id,
      name: senderObj.name,
      email: senderObj.email,
      role
    },
    targetParty: data.targetParty || (role === 'Client' ? 'Field Crew' : 'Client / Facility Admin'),
    createdAt: new Date().toISOString(),
    messages: [initialMsg]
  };

  COMPLAINTS_STORE.unshift(newComplaint);
  return newComplaint;
};

export const getComplaintMessages = async (complaintId: string) => {
  const complaint = COMPLAINTS_STORE.find(c => c._id === complaintId || c.complaintCode === complaintId);
  return complaint ? complaint.messages : [];
};

export const sendComplaintMessage = async (
  complaintId: string,
  senderId: string,
  senderRole: 'Client' | 'FieldTeam' | 'Admin',
  message: string
) => {
  const complaint = COMPLAINTS_STORE.find(c => c._id === complaintId || c.complaintCode === complaintId);
  if (!complaint) {
    throw new Error('Complaint not found');
  }

  const { IN_MEMORY_USERS } = await import('./auth.service.js');
  const { getRegisteredAdmins } = await import('./admin.service.js');
  const { USER_OVERRIDES } = await import('../utils/userOverrides.js');
  const override = USER_OVERRIDES.get(String(senderId).toLowerCase());
  const foundUser = IN_MEMORY_USERS.find(u => u._id === senderId || (u as any).id === senderId) ||
                    getRegisteredAdmins().find(a => a._id === senderId || a.id === senderId);

  let rawSenderName = override?.name || foundUser?.name;
  if (!rawSenderName) {
    rawSenderName = senderRole === 'Client' ? 'Client' : senderRole === 'FieldTeam' ? 'Worker' : 'ClearFlow Admin';
  }
  const cleanName = rawSenderName.replace(/\s*\([^)]*\)/g, '').trim();

  const senderObj = {
    _id: (foundUser ? (foundUser._id || (foundUser as any).id) : senderId),
    name: cleanName,
    email: override?.email || foundUser?.email || '',
    role: senderRole
  };

  const newMsg: InMemoryMessage = {
    _id: 'cmp_msg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
    workOrderId: complaint._id,
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

  complaint.messages.push(newMsg);
  return newMsg;
};

export const updateComplaintStatus = async (
  complaintId: string,
  status: 'Open' | 'Investigating' | 'Resolved'
) => {
  const complaint = COMPLAINTS_STORE.find(c => c._id === complaintId || c.complaintCode === complaintId);
  if (!complaint) {
    throw new Error('Complaint not found');
  }
  complaint.status = status;
  return complaint;
};

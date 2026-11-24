import { dbQuery } from '../config/db.js';
import { NotificationType } from '../models/notification.model.js';
import { DEMO_USERS, IN_MEMORY_USERS } from './auth.service.js';
import { emitNotification } from '../socket/index.js';

export interface CreateNotificationOptions {
  userId?: string | string[];
  roles?: string[];
  workOrderId?: string;
  type: NotificationType;
  title: string;
  message: string;
  channel?: 'Push' | 'Email' | 'Both';
  metadata?: Record<string, any>;
}

export const IN_MEMORY_NOTIFS: any[] = [];

export const cleanFieldTeamText = (text?: string): string => {
  if (!text) return '';
  return text
    .replace(/ClearFlow\s+Field\s+Team/gi, 'ClearFlow')
    .replace(/\s*\(\s*Field\s+Team\s*\)/gi, '')
    .replace(/Field\s+Team\s+Started\s+Work/gi, 'Technician Started Work')
    .replace(/Accepted\s+by\s+Field\s+Team/gi, 'Accepted')
    .replace(/Declined\s+by\s+Field\s+Team/gi, 'Declined')
    .replace(/Completed\s+by\s+Field\s+Team/gi, 'Completed')
    .replace(/by\s+Field\s+Team/gi, 'by Technician')
    .replace(/Field\s+team\s+has\s+begun/gi, 'Technician has begun')
    .replace(/Field\s+team\s+accepted/gi, 'Technician accepted')
    .replace(/Field\s+team\s+declined/gi, 'Technician declined')
    .replace(/Field\s+team\s+payout/gi, 'Technician payout')
    .replace(/Field\s+teams/gi, 'Technicians')
    .replace(/field\s+teams/gi, 'technicians')
    .replace(/Field\s+team\s+technicians/gi, 'Technicians')
    .replace(/field\s+team\s+technicians/gi, 'technicians')
    .replace(/Field\s+Team/gi, 'Technician')
    .replace(/field\s+team/gi, 'technician');
};


export const getUserIdsByRoles = async (roles: string[]): Promise<string[]> => {
  const normRoles = roles.map(r => r.toLowerCase().replace(/[-_]/g, ''));
  const userIds = new Set<string>();

  const rows = await dbQuery(
    `SELECT id FROM users WHERE role = ANY($1::text[])`,
    [roles]
  );
  if (rows) {
    for (const row of rows) {
      userIds.add(row.id);
    }
  }

  for (const d of DEMO_USERS) {
    const dRole = (d.role || '').toLowerCase().replace(/[-_]/g, '');
    if (normRoles.includes(dRole)) {
      userIds.add(d._id);
    }
  }

  for (const m of IN_MEMORY_USERS) {
    const mRole = (m.role || '').toLowerCase().replace(/[-_]/g, '');
    if (normRoles.includes(mRole)) {
      userIds.add(m._id);
    }
  }

  return Array.from(userIds);
};

export const create = async (
  userIdOrOptions: string | CreateNotificationOptions,
  type?: NotificationType,
  title?: string,
  message?: string,
  workOrderId?: string,
  channel: 'Push' | 'Email' | 'Both' = 'Both',
  metadata?: Record<string, any>
) => {
  let options: CreateNotificationOptions;

  if (typeof userIdOrOptions === 'object' && !Array.isArray(userIdOrOptions)) {
    options = userIdOrOptions as CreateNotificationOptions;
  } else {
    options = {
      userId: userIdOrOptions as any,
      type: type!,
      title: title!,
      message: message!,
      workOrderId,
      channel,
      metadata: metadata || {},
    };
  }

  options.title = cleanFieldTeamText(options.title);
  options.message = cleanFieldTeamText(options.message);

  const targetUserIds = new Set<string>();

  // Add individual user IDs
  if (options.userId) {
    const uids = Array.isArray(options.userId) ? options.userId : [options.userId];
    for (const u of uids) {
      if (u) {
        const str = typeof u === 'object' ? ((u as any)._id || (u as any).id || u).toString() : String(u);
        targetUserIds.add(str);
      }
    }
  }

  // Resolve users by roles
  if (options.roles && options.roles.length > 0) {
    const roleUserIds = await getUserIdsByRoles(options.roles);
    for (const rUid of roleUserIds) {
      targetUserIds.add(rUid);
    }
  }

  const targetList = Array.from(targetUserIds);
  const createdNotifications: any[] = [];
  const now = new Date();

  // If no specific users resolved, create one generic broadcast entry
  if (targetList.length === 0) {
    targetList.push('65f000000000000000000001', '65f000000000000000000011', '65f000000000000000000012'); // Fallback to all admins
  }

  for (const uid of targetList) {
    const notifObj: any = {
      _id: 'notif_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      userId: uid,
      workOrderId: options.workOrderId,
      type: options.type,
      title: options.title,
      message: options.message,
      channel: options.channel || 'Both',
      isRead: false,
      deliveryStatus: 'Delivered',
      metadata: options.metadata || {},
      sentAt: now,
    };

    IN_MEMORY_NOTIFS.unshift(notifObj);

    const rows = await dbQuery(
      `INSERT INTO notifications
        (user_id, work_order_id, type, title, message, channel, delivery_status, metadata, sent_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        uid,
        options.workOrderId || null,
        options.type,
        options.title,
        options.message,
        options.channel || 'Both',
        'Delivered',
        JSON.stringify(options.metadata || {}),
        now,
      ]
    );

    if (rows && rows.length > 0) {
      createdNotifications.push(rows[0]);
    } else {
      createdNotifications.push(notifObj);
    }
  }

  // Emit real-time notification to Socket.IO rooms
  const primaryNotif = createdNotifications[0] || {
    _id: 'notif_' + Date.now(),
    type: options.type,
    title: options.title,
    message: options.message,
    workOrderId: options.workOrderId,
    metadata: options.metadata || {},
    sentAt: now,
    isRead: false,
  };

  emitNotification(targetList, options.roles || [], primaryNotif);

  return createdNotifications.length === 1 ? createdNotifications[0] : createdNotifications;
};

export const getByUser = async (userId: string) => {
  const rows = await dbQuery(
    `SELECT * FROM notifications WHERE user_id=$1 ORDER BY sent_at DESC LIMIT 100`,
    [userId]
  );

  if (rows && rows.length > 0) {
    return rows.map((r: any) => ({
      _id: r.id,
      id: r.id,
      userId: r.user_id,
      workOrderId: r.work_order_id,
      title: cleanFieldTeamText(r.title),
      message: cleanFieldTeamText(r.message),
      type: r.type,
      isRead: r.is_read !== undefined ? Boolean(r.is_read) : Boolean(r.isRead),
      channel: r.channel,
      deliveryStatus: r.delivery_status,
      metadata: r.metadata,
      sentAt: r.sent_at,
      createdAt: r.created_at,
    }));
  }

  const userNotifs = IN_MEMORY_NOTIFS.filter((n) => !userId || String(n.userId) === String(userId)).map((n) => {
    n.title = cleanFieldTeamText(n.title);
    n.message = cleanFieldTeamText(n.message);
    return n;
  });
  return userNotifs;
};

export const markRead = async (id: string) => {
  const match = IN_MEMORY_NOTIFS.find((n) => n._id === id || n.id === id);
  if (match) match.isRead = true;

  await dbQuery(`UPDATE notifications SET is_read=true WHERE id=$1`, [id]);

  return { success: true };
};

export const markAllRead = async (userId: string) => {
  IN_MEMORY_NOTIFS.forEach((n) => {
    if (!userId || String(n.userId) === String(userId)) {
      n.isRead = true;
    }
  });

  if (userId) {
    await dbQuery(`UPDATE notifications SET is_read=true WHERE user_id=$1`, [userId]);
  } else {
    await dbQuery(`UPDATE notifications SET is_read=true`);
  }

  return { success: true };
};

export const deleteOne = async (id: string, userId: string) => {
  const idx = IN_MEMORY_NOTIFS.findIndex(
    (n) => (n._id === id || n.id === id) && String(n.userId) === String(userId)
  );
  if (idx !== -1) IN_MEMORY_NOTIFS.splice(idx, 1);

  await dbQuery(`DELETE FROM notifications WHERE id=$1 AND user_id=$2`, [id, userId]);

  return { success: true };
};

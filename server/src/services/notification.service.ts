import mongoose from 'mongoose';
import { Notification } from '../models/notification.model.js';

const IN_MEMORY_NOTIFS: any[] = [
  {
    _id: 'notif_001',
    userId: '65f000000000000000000002',
    title: 'Work Order Dispatched',
    message: 'Field Crew Alpha assigned to your request WO-2026-0001',
    type: 'NewAssignment',
    isRead: false,
    channel: 'Both',
    deliveryStatus: 'Delivered',
    sentAt: new Date(Date.now() - 3600000),
  },
  {
    _id: 'notif_002',
    userId: '65f000000000000000000002',
    title: 'AI Verification Completed',
    message: 'Deep cleaning request passed AI visual inspection (94% confidence). Please rate your service.',
    type: 'RatingPrompt',
    isRead: false,
    channel: 'Push',
    deliveryStatus: 'Delivered',
    sentAt: new Date(Date.now() - 1800000),
  },
  {
    _id: 'notif_003',
    userId: '65f000000000000000000001',
    title: 'System Health Notification',
    message: 'All 5 field teams reporting active GPS telemetry across Central Facility Complex.',
    type: 'Broadcast',
    isRead: true,
    channel: 'Push',
    deliveryStatus: 'Delivered',
    sentAt: new Date(Date.now() - 7200000),
  },
];

export const create = async (
  userId: string,
  type: 'NewAssignment' | 'StatusUpdate' | 'RatingPrompt' | 'ReInspection' | 'Broadcast',
  title: string,
  message: string,
  workOrderId?: string,
  channel: 'Push' | 'Email' | 'Both' = 'Both'
) => {
  const notifObj = {
    _id: 'notif_' + Date.now(),
    userId,
    workOrderId,
    type,
    title,
    message,
    channel,
    isRead: false,
    deliveryStatus: 'Delivered',
    sentAt: new Date(),
  };

  IN_MEMORY_NOTIFS.unshift(notifObj);

  if (mongoose.connection.readyState === 1) {
    try {
      const dbNotif = await Notification.create({
        userId,
        workOrderId,
        type,
        title,
        message,
        channel,
        deliveryStatus: 'Delivered',
        sentAt: new Date(),
      });
      return dbNotif;
    } catch (err) {}
  }

  return notifObj;
};

export const getByUser = async (userId: string) => {
  if (mongoose.connection.readyState === 1) {
    try {
      const notifs = await Notification.find({ userId }).sort({ sentAt: -1 });
      if (notifs && notifs.length > 0) return notifs;
    } catch (err) {}
  }

  const userNotifs = IN_MEMORY_NOTIFS.filter((n) => !userId || n.userId === userId || n.userId === '65f000000000000000000002');
  return userNotifs.length > 0 ? userNotifs : IN_MEMORY_NOTIFS;
};

export const markRead = async (id: string) => {
  const match = IN_MEMORY_NOTIFS.find((n) => n._id === id);
  if (match) match.isRead = true;

  if (mongoose.connection.readyState === 1) {
    try {
      await Notification.findByIdAndUpdate(id, { isRead: true }, { new: true });
    } catch (err) {}
  }

  return { success: true };
};

export const markAllRead = async (userId: string) => {
  IN_MEMORY_NOTIFS.forEach((n) => {
    if (!userId || n.userId === userId) n.isRead = true;
  });

  if (mongoose.connection.readyState === 1) {
    try {
      await Notification.updateMany({ userId }, { isRead: true });
    } catch (err) {}
  }

  return { success: true };
};

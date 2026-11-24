'use client';

import React from 'react';
import type { PopupNotificationItem } from '@/components/ui/NotificationPopupCard';

export const NOTIFY_ME_STORAGE_KEY = 'clearflow_notify_me_active';
export const POPUP_NOTIFICATION_EVENT = 'clearflow:popup_notification';
export const NOTIFY_TOGGLE_EVENT = 'clearflow:notify_toggle';

/**
 * Disabled: The custom dark card popup notification has been removed across all portals
 * per user specification. Clean Sonner toast notifications are used instead.
 */
export const triggerPopupNotification = (
  _item?: Omit<PopupNotificationItem, 'id' | 'createdAt'> & { id?: string }
) => {
  // No-op: Dark popup notification cards are disabled across all portals.
};

export const setNotifyMePreference = (_enabled: boolean) => {};

export const getNotifyMePreference = (): boolean => false;

export const RightPopupNotifications: React.FC = () => null;

export default RightPopupNotifications;

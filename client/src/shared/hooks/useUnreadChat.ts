import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { socketClient } from '@/infrastructure/socket/client';
import { apiClient } from '@/infrastructure/api/client';
import { useAuth } from '@/entities/user/hooks/useAuth';

export const useUnreadChat = () => {
  const { user } = useAuth();
  const location = useLocation();
  const isChatPage = location.pathname.startsWith('/chat');

  const [hasUnreadChat, setHasUnreadChat] = useState<boolean>(() => {
    try {
      return localStorage.getItem('clearflow_unread_chat') === 'true';
    } catch {
      return false;
    }
  });

  const [unreadCount, setUnreadCount] = useState<number>(0);

  const clearUnread = useCallback(() => {
    setHasUnreadChat(false);
    setUnreadCount(0);
    try {
      localStorage.setItem('clearflow_unread_chat', 'false');
      window.dispatchEvent(new CustomEvent('clearflow:chat_unread', { detail: { hasUnread: false, count: 0 } }));
    } catch {}
  }, []);

  // Fetch initial unread count if not on chat page
  useEffect(() => {
    if (isChatPage) {
      clearUnread();
      return;
    }

    if (!user) return;

    apiClient.get('/chat/unread-count')
      .then((res) => {
        if (res.data?.success && typeof res.data.data?.unreadCount === 'number') {
          const count = res.data.data.unreadCount;
          const hasUnread = count > 0;
          setUnreadCount(count);
          setHasUnreadChat(hasUnread);
          try {
            localStorage.setItem('clearflow_unread_chat', String(hasUnread));
          } catch {}
        }
      })
      .catch(() => {});
  }, [user, isChatPage, clearUnread]);

  // Listen to incoming real-time socket messages
  useEffect(() => {
    const socket = socketClient.getSocket();
    if (!socket) return;

    const handleIncomingMessage = (msg: any) => {
      // If user is currently looking at chat, keep marked as read
      if (window.location.pathname.startsWith('/chat')) {
        return;
      }

      // Check if message is from another user
      const currentUserId = user?.id || (user as any)?._id;
      const senderId = typeof msg.senderId === 'object' ? (msg.senderId as any)?._id : msg.senderId;
      const senderRole = msg.senderRole;
      const userRole = user?.role;

      const isFromOther = (currentUserId && senderId !== currentUserId) || (userRole && senderRole !== userRole);

      if (isFromOther) {
        setHasUnreadChat(true);
        setUnreadCount((prev) => prev + 1);
        try {
          localStorage.setItem('clearflow_unread_chat', 'true');
          window.dispatchEvent(new CustomEvent('clearflow:chat_unread', { detail: { hasUnread: true } }));
        } catch {}
      }
    };

    socket.on('chat:message', handleIncomingMessage);

    // Cross-component and multi-tab synchronization
    const handleCustomUnread = (e: any) => {
      if (e.detail) {
        setHasUnreadChat(Boolean(e.detail.hasUnread));
        if (typeof e.detail.count === 'number') {
          setUnreadCount(e.detail.count);
        }
      }
    };

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'clearflow_unread_chat') {
        setHasUnreadChat(e.newValue === 'true');
      }
    };

    window.addEventListener('clearflow:chat_unread', handleCustomUnread);
    window.addEventListener('storage', handleStorage);

    return () => {
      socket.off('chat:message', handleIncomingMessage);
      window.removeEventListener('clearflow:chat_unread', handleCustomUnread);
      window.removeEventListener('storage', handleStorage);
    };
  }, [user]);

  // Whenever user navigates to /chat, automatically clear unread
  useEffect(() => {
    if (isChatPage) {
      clearUnread();
    }
  }, [isChatPage, clearUnread]);

  return {
    hasUnreadChat,
    unreadCount,
    clearUnread,
    setHasUnreadChat,
  };
};

export default useUnreadChat;

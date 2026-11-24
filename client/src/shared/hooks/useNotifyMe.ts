import { useState, useEffect, useCallback } from 'react';
import { 
  getNotifyMePreference, 
  setNotifyMePreference, 
  NOTIFY_TOGGLE_EVENT,
  triggerPopupNotification 
} from '@/shared/components/RightPopupNotifications';

export const useNotifyMe = () => {
  const [isNotifyMeActive, setIsNotifyMeActive] = useState<boolean>(getNotifyMePreference);

  useEffect(() => {
    const handleToggle = (e: any) => {
      const enabled = e.detail?.enabled ?? getNotifyMePreference();
      setIsNotifyMeActive(enabled);
    };

    window.addEventListener(NOTIFY_TOGGLE_EVENT, handleToggle);
    window.addEventListener('storage', handleToggle);
    return () => {
      window.removeEventListener(NOTIFY_TOGGLE_EVENT, handleToggle);
      window.removeEventListener('storage', handleToggle);
    };
  }, []);

  const toggleNotifyMe = useCallback((nextState?: boolean) => {
    const updated = typeof nextState === 'boolean' ? nextState : !isNotifyMeActive;
    setNotifyMePreference(updated);
    setIsNotifyMeActive(updated);

    if (updated) {
      // Show sample preview popups as requested to demonstrate the Magic UI AnimatedList
      setTimeout(() => {
        triggerPopupNotification({
          title: 'New event',
          description: 'Live alerts enabled for all portals',
          timeAgo: 'Just now',
          type: 'event',
        });
      }, 150);

      setTimeout(() => {
        triggerPopupNotification({
          title: 'Payment received',
          description: 'PKR 4,500 deposited via JazzCash',
          timeAgo: '2m ago',
          type: 'payment',
        });
      }, 950);
    }
    return updated;
  }, [isNotifyMeActive]);

  return {
    isNotifyMeActive,
    toggleNotifyMe,
    triggerPopupNotification,
  };
};

export default useNotifyMe;

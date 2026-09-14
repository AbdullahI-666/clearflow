import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, CheckCircle2, MessageSquare, AlertCircle, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { apiClient } from "@/infrastructure/api/client";
import { ENDPOINTS } from "@/infrastructure/api/endpoints";

export const NotificationBell = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<any[]>([]);

  const fetchNotifs = async () => {
    try {
      const res = await apiClient.get(ENDPOINTS.NOTIFICATIONS.BASE);
      if (res.data?.success && res.data?.data) {
        setNotifications(res.data.data);
      }
    } catch (e) {
      // Ignore background notification error
    }
  };

  useEffect(() => {
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 30000);
    return () => clearInterval(interval);
  }, []);

  const unreadList = notifications.filter(n => !n.isRead);
  const unreadCount = unreadList.length;

  const handleMarkAllRead = async () => {
    try {
      await apiClient.patch(ENDPOINTS.NOTIFICATIONS.MARK_ALL_READ);
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (e) {
      console.error(e);
    }
  };

  const handleClickNotif = async (n: any) => {
    try {
      if (!n.isRead && n._id) {
        await apiClient.patch(ENDPOINTS.NOTIFICATIONS.MARK_READ(n._id));
        setNotifications(prev => prev.map(item => item._id === n._id ? { ...item, isRead: true } : item));
      }
      if (n.workOrderId) {
        navigate(`/work-orders/${n.workOrderId}`);
      } else {
        navigate('/notifications');
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative text-gray-600 hover:text-teal-600 hover:bg-teal-50 cursor-pointer">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 h-2.5 w-2.5 rounded-full bg-red-500 border-2 border-white ring-1 ring-red-400" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0 bg-white shadow-xl rounded-xl border border-gray-100">
        <div className="px-4 py-3 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <span className="font-bold text-xs text-gray-900 uppercase tracking-wider">
            Notifications {unreadCount > 0 && `(${unreadCount})`}
          </span>
          {unreadCount > 0 && (
            <button 
              onClick={handleMarkAllRead} 
              className="text-xs text-teal-600 font-medium hover:text-teal-700 cursor-pointer hover:underline"
            >
              Mark all read
            </button>
          )}
        </div>
        <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
          {notifications.length === 0 ? (
            <div className="p-6 text-center text-gray-400 text-xs">
              No notifications yet
            </div>
          ) : (
            notifications.slice(0, 5).map((n) => (
              <DropdownMenuItem 
                key={n._id} 
                onClick={() => handleClickNotif(n)}
                className={`p-3.5 flex flex-col items-start gap-1 cursor-pointer transition-colors ${!n.isRead ? 'bg-teal-50/30 font-medium' : ''}`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="font-semibold text-xs text-gray-900 line-clamp-1">{n.title}</span>
                  <span className="text-[10px] text-gray-400">
                    {n.sentAt ? new Date(n.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recent'}
                  </span>
                </div>
                <p className="text-xs text-gray-600 line-clamp-2">{n.message}</p>
              </DropdownMenuItem>
            ))
          )}
        </div>
        <div className="p-2 border-t border-gray-100 text-center bg-gray-50/50">
          <button 
            onClick={() => navigate('/notifications')} 
            className="text-xs font-semibold text-teal-700 hover:text-teal-800"
          >
            View all notifications &rarr;
          </button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};


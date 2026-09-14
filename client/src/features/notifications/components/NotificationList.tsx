import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Bell, CheckCircle2, MessageSquare, FileText, AlertCircle, Loader2, ArrowLeft } from 'lucide-react';
import { apiClient } from '@/infrastructure/api/client';
import { ENDPOINTS } from '@/infrastructure/api/endpoints';
import { toast } from 'sonner';

export const NotificationList = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchNotifs = async () => {
    try {
      const res = await apiClient.get(ENDPOINTS.NOTIFICATIONS.BASE);
      if (res.data?.success && res.data?.data) {
        setNotifications(res.data.data);
      }
    } catch (e) {
      console.error('Failed to load notifications:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifs();
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await apiClient.patch(ENDPOINTS.NOTIFICATIONS.MARK_ALL_READ);
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      toast.success('All notifications marked as read');
    } catch (e) {
      toast.error('Failed to mark notifications read');
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
      }
    } catch (e) {
      console.error(e);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'ReInspection':
      case 'HighPriority':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      case 'Broadcast':
        return <MessageSquare className="h-5 w-5 text-blue-500" />;
      case 'RatingPrompt':
      case 'StatusUpdate':
        return <CheckCircle2 className="h-5 w-5 text-emerald-500" />;
      default:
        return <FileText className="h-5 w-5 text-teal-600" />;
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate(-1)} 
            className="text-gray-500 hover:text-gray-900 -ml-2"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
          </Button>
          <Bell className="h-6 w-6 text-gray-800" />
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
        </div>
        <Button 
          variant="ghost" 
          onClick={handleMarkAllRead} 
          className="text-teal-600 hover:text-teal-700 hover:bg-teal-50 text-xs"
        >
          Mark all as read
        </Button>
      </div>

      <Card className="border-none shadow-md overflow-hidden bg-white">
        {isLoading ? (
          <div className="py-16 text-center text-gray-400">
            <Loader2 className="w-8 h-8 animate-spin text-teal-600 mx-auto mb-2" />
            <p className="text-sm">Loading notifications...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="py-16 text-center text-gray-500">
            <Bell className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="font-semibold text-gray-700">No notifications</p>
            <p className="text-xs text-gray-400 mt-1">You are all caught up on system updates and dispatches.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {notifications.map((notif) => {
              const formattedTime = notif.sentAt ? new Date(notif.sentAt).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' }) : 'Recent';

              return (
                <div 
                  key={notif._id} 
                  onClick={() => handleClickNotif(notif)}
                  className={`p-4 flex gap-4 hover:bg-teal-50/20 transition-colors cursor-pointer ${!notif.isRead ? 'bg-teal-50/40' : ''}`}
                >
                  <div className="mt-1 h-10 w-10 shrink-0 rounded-full flex items-center justify-center bg-teal-50">
                    {getIcon(notif.type)}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-1">
                      <h3 className={`text-sm ${!notif.isRead ? 'font-bold text-gray-900' : 'font-medium text-gray-700'}`}>
                        {notif.title}
                      </h3>
                      <span className="text-xs text-gray-400 whitespace-nowrap ml-2">{formattedTime}</span>
                    </div>
                    <p className={`text-xs leading-relaxed ${!notif.isRead ? 'text-gray-800' : 'text-gray-500'}`}>
                      {notif.message}
                    </p>
                  </div>
                  {!notif.isRead && (
                    <div className="shrink-0 flex items-center">
                      <div className="h-2 w-2 rounded-full bg-teal-500 ring-2 ring-teal-200"></div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
};


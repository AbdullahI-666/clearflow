import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Bell, CheckCircle2, MessageSquare, FileText, AlertCircle, 
  Loader2, ArrowLeft, Clock, Sparkles, ShieldCheck, Banknote, Trash2,
  User, Wrench
} from 'lucide-react';
import { apiClient } from '@/infrastructure/api/client';
import { ENDPOINTS } from '@/infrastructure/api/endpoints';
import { useRoleTheme } from '@/shared/hooks/useRoleTheme';
import { socketClient } from '@/infrastructure/socket/client';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const WO_DIRECTORY: Record<string, { client: string; worker: string }> = {};

const getNotificationDetails = (n: any) => {
  let woCode = n.workOrderCode || n.metadata?.workOrderCode || n.workOrderId || n.metadata?.workOrderId;
  const combinedText = `${n.title || ''} ${n.message || ''}`;
  const codeMatch = combinedText.match(/WO-2026-\d{4}/);
  if (codeMatch) {
    woCode = codeMatch[0];
  }

  const lookup = woCode && WO_DIRECTORY[woCode] ? WO_DIRECTORY[woCode] : null;

  let clientName = n.metadata?.clientName || n.clientName || lookup?.client;
  let workerName = n.metadata?.workerName || n.metadata?.teamName || n.workerName || n.teamName || lookup?.worker;

  const isGenericClient = !clientName || clientName.trim().toLowerCase() === 'client';
  const isGenericWorker = !workerName || ['worker', 'field team', 'fieldteam'].includes(workerName.trim().toLowerCase());

  if (isGenericClient) clientName = undefined;
  if (isGenericWorker) workerName = undefined;

  // Never attach client/worker tags to welcome, registration, or general non-work-order notifications
  if (!woCode) {
    clientName = undefined;
    workerName = undefined;
  }

  return { woCode, clientName, workerName };
};

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

const getDeletedNotifIds = (): Set<string> => {
  try {
    const raw = localStorage.getItem('clearflow_deleted_notification_ids');
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
};

export const NotificationList = () => {
  const navigate = useNavigate();
  const theme = useRoleTheme();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchNotifs = async () => {
    try {
      const res = await apiClient.get(ENDPOINTS.NOTIFICATIONS.BASE);
      if (res.data?.success && Array.isArray(res.data?.data)) {
        const isAllMarked = localStorage.getItem('clearflow_all_notifications_read') === 'true';
        const deletedSet = getDeletedNotifIds();
        let readSet = new Set<string>();
        try {
          const raw = localStorage.getItem("clearflow_read_notifications");
          readSet = new Set(raw ? JSON.parse(raw) : []);
        } catch (_) {}

        const activeList = res.data.data
          .filter((n: any) => !deletedSet.has(n._id || n.id))
          .map((n: any) => ({
            ...n,
            title: cleanFieldTeamText(n.title),
            message: cleanFieldTeamText(n.message),
            isRead: isAllMarked || readSet.has(n._id || n.id) || Boolean(n.isRead ?? n.is_read)
          }));
        setNotifications(activeList);
      }
    } catch (e) {
      console.error('Failed to load notifications:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifs();

    const socket = socketClient.getSocket();
    if (socket) {
      const handleNewNotification = (newNotif: any) => {
        if (!newNotif) return;
        localStorage.removeItem('clearflow_all_notifications_read');
        const sanitized = {
          ...newNotif,
          title: cleanFieldTeamText(newNotif.title),
          message: cleanFieldTeamText(newNotif.message),
        };
        setNotifications((prev) => {
          if (prev.some((item) => item._id === sanitized._id)) return prev;
          return [sanitized, ...prev];
        });
      };

      socket.on('notification:new', handleNewNotification);
      return () => {
        socket.off('notification:new', handleNewNotification);
      };
    }
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await apiClient.patch(ENDPOINTS.NOTIFICATIONS.MARK_ALL_READ);
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true, is_read: true })));
      localStorage.setItem('clearflow_all_notifications_read', 'true');
      window.dispatchEvent(new CustomEvent('clearflow:notifications-read-all'));
      toast.success('All notifications marked as read');
    } catch (e) {
      toast.error('Failed to mark notifications read');
    }
  };

  const handleClickNotif = async (n: any) => {
    try {
      const notifId = n._id || n.id;
      if (!n.isRead && notifId) {
        await apiClient.patch(ENDPOINTS.NOTIFICATIONS.MARK_READ(notifId));
        setNotifications(prev => prev.map(item => (item._id === notifId || item.id === notifId) ? { ...item, isRead: true, is_read: true } : item));
        try {
          const raw = localStorage.getItem("clearflow_read_notifications");
          const set = new Set(raw ? JSON.parse(raw) : []);
          set.add(notifId);
          localStorage.setItem("clearflow_read_notifications", JSON.stringify(Array.from(set)));
        } catch (_) {}
        window.dispatchEvent(new CustomEvent('clearflow:notification-read', { detail: { id: notifId } }));
      }
      const { woCode } = getNotificationDetails(n);
      const isInvoiceType = n.type === 'InvoiceIssued' || n.type === 'PaymentReceived' || n.metadata?.invoiceId;

      if (isInvoiceType && theme.role === 'admin') {
        navigate('/invoices');
      } else if (woCode) {
        navigate(`/work-orders/${woCode}`);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteNotif = async (e: React.MouseEvent, n: any) => {
    e.stopPropagation();
    const notifId = n._id || n.id;
    setNotifications(prev => prev.filter(item => (item._id || item.id) !== notifId));
    try {
      const deleted = getDeletedNotifIds();
      if (notifId) deleted.add(notifId);
      localStorage.setItem('clearflow_deleted_notification_ids', JSON.stringify(Array.from(deleted)));
      await apiClient.delete(ENDPOINTS.NOTIFICATIONS.DELETE(notifId)).catch(() => null);
    } catch (_) {}
    window.dispatchEvent(new CustomEvent('clearflow:notification-deleted', { detail: { id: notifId } }));
    toast.success('Notification deleted');
  };

  const getIcon = (type: string) => {
    const iconColor = theme.role === 'admin' ? 'text-purple-600' : theme.role === 'fieldteam' ? 'text-amber-600' : 'text-teal-600';
    const iconClass = cn("h-5 w-5 shrink-0", iconColor);

    switch (type) {
      case 'ReInspection':
      case 'HighPriority':
        return <AlertCircle className={iconClass} />;
      case 'Broadcast':
        return <MessageSquare className={iconClass} />;
      case 'ProgressUpdate':
      case 'StatusUpdate':
        return <Clock className={iconClass} />;
      case 'BeforePhotoUploaded':
        return <Sparkles className={iconClass} />;
      case 'AiInspectionCompleted':
        return <ShieldCheck className={iconClass} />;
      case 'JobCompleted':
      case 'RatingPrompt':
        return <CheckCircle2 className={iconClass} />;
      case 'InvoiceIssued':
      case 'PaymentReceived':
        return <Banknote className={iconClass} />;
      default:
        return <FileText className={iconClass} />;
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="w-full pt-1 pb-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate(-1)} 
            className="text-gray-500 hover:text-gray-900 -ml-2"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
          </Button>
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            onClick={handleMarkAllRead} 
            className={cn(theme.textAccentHover, "text-xs font-semibold cursor-pointer")}
          >
            Mark all as read
          </Button>
        </div>
      </div>

      <Card className="border-none shadow-md overflow-hidden bg-white">
        {isLoading ? (
          <div className="py-16 text-center text-gray-400">
            <Loader2 className={cn("w-8 h-8 animate-spin mx-auto mb-2", theme.spinner)} />
            <p className="text-sm">Loading notifications...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="py-16 text-center text-gray-500">
            <Bell className={cn("w-12 h-12 mx-auto mb-3 opacity-60", theme.role === 'admin' ? 'text-purple-600' : theme.role === 'fieldteam' ? 'text-amber-600' : 'text-teal-600')} />
            <p className="font-semibold text-gray-700">No notifications</p>
            <p className="text-xs text-gray-400 mt-1">You are all caught up on system updates and notifications.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {notifications.map((notif) => {
              const formattedTime = notif.sentAt ? new Date(notif.sentAt).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' }) : 'Recent';
              const { woCode, clientName, workerName } = getNotificationDetails(notif);

              const unreadBg = theme.role === 'admin' ? 'bg-purple-50/50' : theme.role === 'fieldteam' ? 'bg-amber-50/50' : 'bg-teal-50/50';
              const iconCircleBg = theme.role === 'admin' ? 'bg-purple-100/80 border border-purple-200 text-purple-600' : theme.role === 'fieldteam' ? 'bg-amber-100/80 border border-amber-200 text-amber-600' : 'bg-teal-100/80 border border-teal-200 text-teal-600';
              const dotClass = theme.role === 'admin' ? 'bg-purple-600 ring-purple-200' : theme.role === 'fieldteam' ? 'bg-amber-600 ring-amber-200' : 'bg-teal-500 ring-teal-200';

              return (
                <div 
                  key={notif._id || notif.id} 
                  onClick={() => handleClickNotif(notif)}
                  className={cn("p-4.5 flex items-start transition-colors cursor-pointer group relative", theme.rowHover, !notif.isRead && unreadBg)}
                >
                  <div className="flex-1 min-w-0 pr-2">
                    <div className="flex justify-between items-start mb-1 gap-2">
                      <h3 className={`text-sm ${!notif.isRead ? 'font-bold text-gray-900' : 'font-medium text-gray-700'}`}>
                        {cleanFieldTeamText(notif.title)}
                      </h3>
                      <span className="text-xs text-gray-400 whitespace-nowrap">{formattedTime}</span>
                    </div>
                    <p className={`text-xs leading-relaxed ${!notif.isRead ? 'text-gray-800' : 'text-gray-500'}`}>
                      {cleanFieldTeamText(notif.message)}
                    </p>

                    {/* Metadata Badges for Client, Worker, and Work Order Code */}
                    {(clientName || workerName || woCode) && (
                      <div className="flex items-center gap-2 mt-2.5 flex-wrap">
                        {clientName && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-teal-50 text-teal-800 border border-teal-200/90 shadow-2xs">
                            <User className="w-3 h-3 text-teal-600" />
                            Client: {clientName}
                          </span>
                        )}
                        {workerName && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200/90 shadow-2xs">
                            <Wrench className="w-3 h-3 text-amber-600" />
                            Worker: {workerName}
                          </span>
                        )}
                        {woCode && (
                          <span className={cn(
                            "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold font-mono shadow-2xs",
                            theme.role === 'fieldteam'
                              ? "bg-amber-50 text-amber-800 border border-amber-200"
                              : theme.role === 'admin'
                              ? "bg-purple-50 text-purple-800 border border-purple-200"
                              : "bg-teal-50 text-teal-800 border border-teal-200"
                          )}>
                            {woCode}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="shrink-0 flex items-center gap-2.5 self-center">
                    {!notif.isRead && (
                      <div className={cn("h-2.5 w-2.5 rounded-full ring-2", dotClass)} />
                    )}
                    <button
                      onClick={(e) => handleDeleteNotif(e, notif)}
                      className="px-2.5 py-1.5 rounded-xl text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 transition-all cursor-pointer shadow-2xs flex items-center gap-1.5 text-xs font-semibold"
                      title="Delete notification"
                    >
                      <Trash2 className="h-3.5 w-3.5 text-red-600" />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
};


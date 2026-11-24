import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  MapPin, Camera, CheckCircle2, UploadCloud, Loader2, 
  MessageSquare, ShieldCheck, AlertCircle, AlertTriangle, Radio, Crosshair, 
  Check, RefreshCw, Clock, ShieldAlert, XCircle, ClipboardList, Navigation,
  Layers, Timer, BadgeCheck, Sparkles, Search, Coins, Wallet, FileText,
  Star, DollarSign, ArrowRight, Eye, User, Calendar, CreditCard, ChevronRight,
  TrendingUp, Award, Bell, Wrench, Share2, MoreVertical, MoreHorizontal,
  Download, Pencil, LayoutGrid, List, Maximize2, Briefcase, ChevronDown,
  Megaphone, Phone
} from 'lucide-react';
import { StatusBadge } from '@/shared/components/StatusBadge';
import { useRoleTheme } from '@/shared/hooks/useRoleTheme';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/entities/user/hooks/useAuth';
import { apiClient } from '@/infrastructure/api/client';
import { ENDPOINTS } from '@/infrastructure/api/endpoints';
import { socketClient } from '@/infrastructure/socket/client';
import type { WorkOrder } from '@/entities/workOrder/types';
import { toast } from 'sonner';
import { downloadWorkerMonthlyReport } from '@/shared/utils/pdfDownloader';
// LocationMap removed: map is accessible via dedicated Live Tracking page
import { useUnreadChat } from '@/shared/hooks/useUnreadChat';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { cn } from '@/lib/utils';
import { CategorySquircleLogo } from '@/shared/utils/categoryIcons';
import { FieldWalletModal } from './FieldWalletModal';
import { NearbyMarketplaceBiddingCard } from './NearbyMarketplaceBiddingCard';
import { IdentityVerificationModal } from '@/shared/components/IdentityVerificationModal';

import destroyedPipeSample from '@/assets/samples/destroyed-before.jpg';
import repairedPipeSample from '@/assets/samples/repaired-after.jpg';

const SAMPLE_BEFORE_PHOTOS = [
  destroyedPipeSample,
  'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&q=80&w=800',
  'https://images.unsplash.com/photo-1504148455328-c376907d081c?auto=format&fit=crop&q=80&w=800',
];

const SAMPLE_AFTER_PHOTOS = [
  repairedPipeSample,
  'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&q=80&w=800',
  'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&q=80&w=800',
];

const FALLBACK_DESTROYED_ONLINE = 'https://images.unsplash.com/photo-1542013936693-884638332954?auto=format&fit=crop&q=80&w=800';
const FALLBACK_REPAIRED_ONLINE = 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&q=80&w=800';

const isValidImage = (url?: string | null): boolean => {
  if (!url) return false;
  const s = String(url).trim().toLowerCase();
  return s !== '' && s !== 'null' && s !== 'undefined' && !s.includes('unsplash.com');
};

interface WeeklyDayData {
  short: string;
  name: string;
  growth: string;
  fieldTasks: number;
  qualityAudits: number;
  cx: number;
  cyPrimary: number;
  cySecondary: number;
}

const WEEKLY_PROGRESS_DAYS: WeeklyDayData[] = [
  { short: 'M', name: 'Monday', growth: '+14%', fieldTasks: 3, qualityAudits: 92, cx: 20, cyPrimary: 65, cySecondary: 78 },
  { short: 'T', name: 'Tuesday', growth: '+18%', fieldTasks: 5, qualityAudits: 94, cx: 65, cyPrimary: 48, cySecondary: 60 },
  { short: 'W', name: 'Wednesday', growth: '+22%', fieldTasks: 7, qualityAudits: 95, cx: 110, cyPrimary: 36, cySecondary: 50 },
  { short: 'T', name: 'Thursday', growth: '+19%', fieldTasks: 4, qualityAudits: 93, cx: 155, cyPrimary: 54, cySecondary: 66 },
  { short: 'F', name: 'Friday', growth: '+26%', fieldTasks: 8, qualityAudits: 97, cx: 200, cyPrimary: 28, cySecondary: 42 },
  { short: 'S', name: 'Saturday', growth: '+24%', fieldTasks: 6, qualityAudits: 96, cx: 245, cyPrimary: 40, cySecondary: 52 },
  { short: 'S', name: 'Sunday', growth: '+12%', fieldTasks: 2, qualityAudits: 91, cx: 280, cyPrimary: 58, cySecondary: 70 },
];

const CLEARFLOW_DELETED_WO_KEY = 'clearflow_deleted_work_orders';

const getDeletedWorkOrders = (): Set<string> => {
  try {
    const raw = localStorage.getItem(CLEARFLOW_DELETED_WO_KEY);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) {
        return new Set(arr.map((x: string) => String(x).toLowerCase().trim()));
      }
    }
  } catch (_) {}
  return new Set<string>();
};

const isWorkOrderPermanentlyDeleted = (w: any, deletedSet?: Set<string>): boolean => {
  if (!w) return true;
  const deleted = deletedSet || getDeletedWorkOrders();
  if (deleted.size === 0) return false;
  const id = String(w._id || (w as any).id || '').toLowerCase().trim();
  const code = String(w.workOrderCode || '').toLowerCase().trim();
  return Boolean((id && deleted.has(id)) || (code && deleted.has(code)));
};

export const FieldTeamDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { hasUnreadChat, clearUnread } = useUnreadChat();
  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(5);
  const currentWeeklyDay = WEEKLY_PROGRESS_DAYS[selectedDayIndex] || WEEKLY_PROGRESS_DAYS[5];
  const [isBroadcasting, setIsBroadcasting] = useState<boolean>(() => {
    const stored = localStorage.getItem('clearflow_telemetry_active');
    return stored !== 'false';
  });
  const [liveCoords, setLiveCoords] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [activeOrder, setActiveOrder] = useState<WorkOrder | null>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showDeclineDialog, setShowDeclineDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [walletModalInitialTab, setWalletModalInitialTab] = useState<'overview' | 'targets' | 'points' | 'earnings' | 'purchase'>('overview');
  const [walletInfo, setWalletInfo] = useState<any>(null);
  const [isVerificationModalOpen, setIsVerificationModalOpen] = useState(false);
  const [pendingAcceptOrderId, setPendingAcceptOrderId] = useState<string | null>(null);
  const [isOnlineAvailability, setIsOnlineAvailability] = useState(true);
  const [nearbyCount, setNearbyCount] = useState<number>(0);

  const openWalletSidebar = (tab: 'buy' | 'history' | 'targets' = 'buy') => {
    window.dispatchEvent(new CustomEvent('clearflow:open-wallet', { detail: { tab } }));
  };
  
  // Field Team: 3 Before Photos (Client Evidence) & 3 After Photos (Field Team Uploads)
  const [beforeImages, setBeforeImages] = useState<string[]>(SAMPLE_BEFORE_PHOTOS);
  const [afterImages, setAfterImages] = useState<string[]>(SAMPLE_AFTER_PHOTOS);
  const [aiDetails, setAiDetails] = useState<any>(null);
  const watchIdRef = useRef<number | null>(null);
  
  const afterFile0Ref = useRef<HTMLInputElement>(null);
  const afterFile1Ref = useRef<HTMLInputElement>(null);
  const afterFile2Ref = useRef<HTMLInputElement>(null);
  const afterFileInputRefs = [afterFile0Ref, afterFile1Ref, afterFile2Ref];

  const theme = useRoleTheme();
  const isFieldRole = theme.role === 'fieldteam';
  const isAdminRole = theme.role === 'admin';

  const evTheme = {
    cardBorder: 'border-2 border-amber-500/40 bg-amber-950/5',
    imgBorder: 'border-amber-300',
    beforeBadge: 'bg-amber-600/95 text-white',
    beforeIcon: 'text-amber-200',
    hoverCheck: 'text-amber-400',
    afterBadge: 'bg-amber-600/95 text-white',
    afterIcon: 'text-amber-200',
    verifiedBadge: 'bg-amber-500 text-white',
    subtextPill: 'bg-amber-950/85 text-amber-200 border border-amber-500/30 backdrop-blur-md',
    btnPrimary: 'bg-amber-600 hover:bg-amber-700 text-white',
    btnOutline: 'border-amber-300 text-amber-900 hover:bg-amber-50',
    linkText: 'text-amber-700 hover:text-amber-900',
    panelBg: 'bg-amber-50/90 border-amber-200 text-amber-950',
    shieldIcon: 'text-amber-600',
    scoreBadge: 'bg-amber-600 text-white',
    progressBar: 'bg-amber-500',
    antiFraudText: 'text-amber-700',
  };

  const timeAgo = (dateStr?: string | Date) => {
    if (!dateStr) return 'Just now';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const fetchAllWorkerData = async (showToast = false) => {
    if (showToast) setIsRefreshing(true);
    const start = Date.now();
    try {
      const [woRes, wallRes, notifRes, invRes, nearRes] = await Promise.allSettled([
        apiClient.get(ENDPOINTS.WORK_ORDERS.BASE),
        apiClient.get(ENDPOINTS.MARKETPLACE.WALLET),
        apiClient.get(ENDPOINTS.NOTIFICATIONS.BASE),
        apiClient.get('/invoices'),
        apiClient.get(ENDPOINTS.MARKETPLACE.NEARBY()),
      ]);

      if (woRes.status === 'fulfilled' && woRes.value.data?.success && woRes.value.data?.data) {
        const rawList: WorkOrder[] = Array.isArray(woRes.value.data.data) ? woRes.value.data.data : woRes.value.data.data.data || [];
        const deletedSet = getDeletedWorkOrders();
        const list = rawList.filter((w) => !isWorkOrderPermanentlyDeleted(w, deletedSet));
        setWorkOrders(list);

        const activeList = list.filter((wo) =>
          wo.status === 'Assigned' || wo.status === 'InProgress' || wo.status === 'Flagged' || wo.status === 'PendingReview' || wo.status === 'PendingClientConfirmation'
        );
        const current = activeList[0] || null;

        if (current) {
          setActiveOrder(current);
          if (Array.isArray(current.beforeImages) && current.beforeImages.length > 0) {
            setBeforeImages([
              current.beforeImages[0] || SAMPLE_BEFORE_PHOTOS[0],
              current.beforeImages[1] || SAMPLE_BEFORE_PHOTOS[1],
              current.beforeImages[2] || SAMPLE_BEFORE_PHOTOS[2],
            ]);
          } else if (isValidImage(current.beforeImageUrl)) {
            setBeforeImages([current.beforeImageUrl!, SAMPLE_BEFORE_PHOTOS[1], SAMPLE_BEFORE_PHOTOS[2]]);
          } else {
            setBeforeImages(SAMPLE_BEFORE_PHOTOS);
          }

          if (Array.isArray(current.afterImages) && current.afterImages.length > 0) {
            setAfterImages([
              current.afterImages[0] || SAMPLE_AFTER_PHOTOS[0],
              current.afterImages[1] || SAMPLE_AFTER_PHOTOS[1],
              current.afterImages[2] || SAMPLE_AFTER_PHOTOS[2],
            ]);
          } else if (isValidImage(current.afterImageUrl)) {
            setAfterImages([current.afterImageUrl!, SAMPLE_AFTER_PHOTOS[1], SAMPLE_AFTER_PHOTOS[2]]);
          } else {
            setAfterImages(SAMPLE_AFTER_PHOTOS);
          }
          if (current.aiVerificationDetails) {
            setAiDetails(current.aiVerificationDetails);
          }
        } else {
          setActiveOrder(null);
        }
      }

      if (wallRes.status === 'fulfilled' && wallRes.value.data?.success && wallRes.value.data?.data) {
        setWalletInfo(wallRes.value.data.data);
        setIsOnlineAvailability(wallRes.value.data.data.isAvailableOnline ?? true);
      }

      if (notifRes.status === 'fulfilled' && notifRes.value.data?.success && notifRes.value.data?.data) {
        const notifList = Array.isArray(notifRes.value.data.data) ? notifRes.value.data.data : [];
        setNotifications(notifList);
      }

      if (invRes.status === 'fulfilled' && invRes.value.data?.success && invRes.value.data?.data) {
        const invList = Array.isArray(invRes.value.data.data) ? invRes.value.data.data : [];
        setInvoices(invList);
      }

      if (nearRes.status === 'fulfilled' && nearRes.value.data?.success && nearRes.value.data?.data) {
        setNearbyCount(nearRes.value.data.data.totalAvailable || 0);
      }

      if (showToast) {
        const elapsed = Date.now() - start;
        if (elapsed < 750) {
          await new Promise((resolve) => setTimeout(resolve, 750 - elapsed));
        }
        toast.success('Field assignments & dashboard metrics refreshed');
      }
    } catch (err) {
      console.error('Failed to load field team assignments:', err);
      if (showToast) {
        const elapsed = Date.now() - start;
        if (elapsed < 750) {
          await new Promise((resolve) => setTimeout(resolve, 750 - elapsed));
        }
        toast.error('Failed to refresh assignments');
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleToggleAvailability = async (checked: boolean) => {
    setIsOnlineAvailability(checked);
    try {
      const res = await apiClient.patch(ENDPOINTS.MARKETPLACE.AVAILABILITY, { isOnline: checked });
      if (res.data?.success) {
        toast.success(res.data.data?.message || (checked ? 'Now Online for nearby jobs' : 'Now Offline'));
        fetchAllWorkerData(false);
      }
    } catch (err: any) {
      toast.error('Failed to change availability status');
      setIsOnlineAvailability(!checked);
    }
  };

  useEffect(() => {
    fetchAllWorkerData(false);
    const handleGlobal = () => fetchAllWorkerData(false);
    const handleWalletUpdated = (e: any) => {
      if (e.detail) {
        setWalletInfo((prev: any) => ({
          ...(prev || {}),
          ...e.detail,
        }));
      }
    };
    window.addEventListener('clearflow:refresh-data', handleGlobal);
    window.addEventListener('storage', handleGlobal);
    window.addEventListener('clearflow:wallet-updated', handleWalletUpdated);
    return () => {
      window.removeEventListener('clearflow:refresh-data', handleGlobal);
      window.removeEventListener('storage', handleGlobal);
      window.removeEventListener('clearflow:wallet-updated', handleWalletUpdated);
    };
  }, []);

  // Real device GPS Tracking Watcher (F-13)
  useEffect(() => {
    if (!isBroadcasting) {
      if (watchIdRef.current !== null) {
        navigator.geolocation?.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      return;
    }

    if (navigator.geolocation) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        async (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          const accuracy = Math.round(pos.coords.accuracy);
          setLiveCoords({ lat, lng, accuracy });
          try {
            localStorage.setItem('clearflow_field_tech_coords', JSON.stringify({ lat, lng }));
          } catch {}

          try {
            await apiClient.post(ENDPOINTS.TRACKING.UPDATE, {
              lat,
              lng,
              accuracy,
              workOrderId: activeOrder?._id || activeOrder?.id,
            });

            const socket = socketClient.getSocket();
            if (socket) {
              socket.emit('gps:update', {
                teamId: user?.id || '65f000000000000000000301',
                lat,
                lng,
                accuracy,
              });
            }
          } catch (e) {}
        },
        (_err) => {
          const baseLat = activeOrder?.locationLat || 31.4697;
          const baseLng = activeOrder?.locationLng || 74.2728;
          const fallbackLat = baseLat + 0.0055 + (Math.random() - 0.5) * 0.002;
          const fallbackLng = baseLng + (baseLng < 0 ? 0.0065 : -0.0065) + (Math.random() - 0.5) * 0.002;
          setLiveCoords({ lat: fallbackLat, lng: fallbackLng, accuracy: 8 });
          try {
            localStorage.setItem('clearflow_field_tech_coords', JSON.stringify({ lat: fallbackLat, lng: fallbackLng }));
          } catch {}
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
      );
    }

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation?.clearWatch(watchIdRef.current);
      }
    };
  }, [isBroadcasting, activeOrder, user]);

  const [operationalSettings, setOperationalSettings] = useState<any>(null);

  useEffect(() => {
    const fetchSettings = () => {
      apiClient.get('/settings').then(res => {
        if (res.data?.success && res.data.data) setOperationalSettings(res.data.data);
      }).catch(() => {});
    };
    fetchSettings();
    const handleCompanyUpdate = (e: any) => {
      if (e.detail) setOperationalSettings((prev: any) => ({ ...prev, ...e.detail }));
    };
    window.addEventListener('clearflow:refresh-data', fetchSettings);
    window.addEventListener('clearflow:company-updated', handleCompanyUpdate);
    return () => {
      window.removeEventListener('clearflow:refresh-data', fetchSettings);
      window.removeEventListener('clearflow:company-updated', handleCompanyUpdate);
    };
  }, []);

  const isWorkerVerified = Boolean(
    (user?.cnicVerified === true || user?.verificationStatus === 'Verified') &&
    (user?.cnic && user.cnic.replace(/\D/g, '').length === 13)
  );

  // F-14: Start Job (Accept)
  const handleAcceptJob = async (explicitOrderId?: string) => {
    const orderId = explicitOrderId || activeOrder?._id || activeOrder?.id;
    if (!orderId) return;

    if (!isWorkerVerified) {
      setPendingAcceptOrderId(orderId);
      setIsVerificationModalOpen(true);
      return;
    }

    setIsProcessing(true);

    setActiveOrder((prev: any) => prev ? {
      ...prev,
      isAccepted: true,
      status: prev.status === 'Assigned' ? 'InProgress' : prev.status,
    } : prev);

    try {
      const res = await apiClient.post(ENDPOINTS.WORK_ORDERS.ACCEPT(orderId));
      if (res.data?.success) {
        toast.success('Service request accepted! Client notified.');
        fetchAllWorkerData(false);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to accept job');
      fetchAllWorkerData(false);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRejectJob = () => {
    setShowDeclineDialog(true);
  };

  const handleConfirmDecline = async () => {
    const orderId = activeOrder?._id || activeOrder?.id;
    if (!orderId) {
      setShowDeclineDialog(false);
      return;
    }
    setIsProcessing(true);

    setWorkOrders((prev) => {
      const remaining = prev.filter((w) => (w._id || w.id) !== orderId);
      const nextActive = remaining.find((wo) =>
        wo.status === 'Assigned' || wo.status === 'InProgress' || wo.status === 'Flagged' || wo.status === 'PendingReview' || wo.status === 'PendingClientConfirmation'
      );
      setActiveOrder(nextActive || null);
      return remaining;
    });

    try {
      const res = await apiClient.post(ENDPOINTS.WORK_ORDERS.REJECT(orderId), {
        reason: 'Technician unavailable or specialized equipment required'
      });
      if (res.data?.success) {
        toast.success('Job declined. Work order returned to queue.');
        fetchAllWorkerData(false);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to decline job');
      fetchAllWorkerData(false);
    } finally {
      setIsProcessing(false);
      setShowDeclineDialog(false);
    }
  };

  // Real-Time GPS Telemetry Switch Handler
  const handleToggleTelemetry = (val: boolean) => {
    setIsBroadcasting(val);
    localStorage.setItem('clearflow_telemetry_active', String(val));
    window.dispatchEvent(new StorageEvent('storage', { key: 'clearflow_telemetry_active', newValue: String(val) }));

    const socket = socketClient.getSocket();
    if (socket) {
      socket.emit('gps:telemetry_status', {
        isBroadcasting: val,
        teamId: user?.id || '65f000000000000000000301',
        workOrderId: activeOrder?._id || activeOrder?.id,
      });
    }

    apiClient.post('/tracking/telemetry/status', {
      isBroadcasting: val,
      teamId: user?.id || '65f000000000000000000301',
    }).catch(() => {});

    toast.info(val ? '📡 Device GPS broadcasting active' : 'GPS broadcasting paused (Location hidden from client)');
  };

  // Real Photo Upload for 3 After-Service Photos (Field Team)
  const uploadAfterPhoto = async (slotIndex: number, dataUrl: string) => {
    const updated = [...afterImages];
    updated[slotIndex] = dataUrl;
    setAfterImages(updated);

    const orderId = activeOrder?._id || activeOrder?.id;
    if (!orderId) return;

    setIsProcessing(true);
    try {
      await apiClient.post(ENDPOINTS.WORK_ORDERS.UPLOAD_AFTER(orderId), {
        imageUrl: dataUrl,
        index: slotIndex,
      });
      toast.success(`📸 Completion photo ${slotIndex + 1} of 3 uploaded! Forwarded to Admin for inspection.`);
      fetchAllWorkerData(false);
    } catch (err: any) {
      console.warn(`Failed to sync after photo with server:`, err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, slotIndex: number) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please select a valid image file (JPEG, PNG, WebP)');
      return;
    }
    const reader = new FileReader();
    reader.onload = async (event) => {
      const dataUrl = event.target?.result as string;
      await uploadAfterPhoto(slotIndex, dataUrl);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSampleAfterSlot = (slotIndex: number) => {
    const sample = SAMPLE_AFTER_PHOTOS[slotIndex] || repairedPipeSample;
    uploadAfterPhoto(slotIndex, sample);
  };

  const handleResubmitReinspection = () => {
    afterFileInputRefs[0].current?.click();
  };

  const isDemoField =
    ((user?.email || '').toLowerCase().trim() === 'field@clearflow.com' ||
    user?._id === '65f000000000000000000004') &&
    !(user?.name || '').toLowerCase().includes('hassan');

  // 1. Calculations for Statistic Cards (Section 3) - strictly 0 for new workers
  // Only tasks strictly InProgress belong in "Task In process"
  const inProgressTasks = workOrders.filter(
    (wo) => wo.status === 'InProgress'
  );
  const inProgressTasksCount = inProgressTasks.length;

  const assignedTasks = workOrders.filter(
    (wo) => wo.status === 'Assigned'
  );

  const activeAssignments = inProgressTasks;
  const activeAssignmentsCount = inProgressTasksCount;

  const completedAssignments = workOrders.filter(
    (w) => w.status === 'Closed' || (w.status as string) === 'Completed'
  );
  const completedCount = completedAssignments.length;

  const availableJobsCount = isOnlineAvailability ? (nearbyCount || (isDemoField ? 2 : 0)) : 0;

  const totalEarnings = walletInfo?.totalEarnings ?? (isDemoField ? 1560.0 : 0.0);
  const pendingEarnings = walletInfo?.pendingBalance ?? ((activeOrder as any)?.agreedPrice ? Math.round((activeOrder as any).agreedPrice * 0.88) : (isDemoField ? 74.80 : 0.0));
  
  const isRated = isDemoField || Boolean((user as any)?.rating !== undefined);
  const avgRating = (user as any)?.rating !== undefined ? Number((user as any).rating) : (isDemoField ? 4.9 : 0.0);
  const ratingReviewsCount = isDemoField ? 98 : ((user as any)?.totalReviews ?? 0);

  // Month goals state (Checklist matching UI mockup)
  const [monthGoals, setMonthGoals] = useState(() => [
    { id: 'g1', text: 'Read 2 safety guides', done: isDemoField },
    { id: 'g2', text: '100% on-time GPS arrival', done: false },
    { id: 'g3', text: 'Complete 10 high-value jobs', done: false },
    { id: 'g4', text: 'Maintain 4.9★ SLA rating', done: false },
  ]);

  const [activeTaskMenu, setActiveTaskMenu] = useState<string | null>(null);
  const [showMarketplace, setShowMarketplace] = useState(false);
  const [projectsSort, setProjectsSort] = useState<'recent' | 'price' | 'status'>('recent');
  const [projectsView, setProjectsView] = useState<'grid' | 'list'>('grid');

  const lastProjectsList = useMemo(() => {
    // Show only completed projects as requested
    const completedWorkOrders = workOrders.filter(
      (wo) => wo.status === 'Completed' || wo.status === 'Closed'
    );

    if (completedWorkOrders.length > 0) {
      return completedWorkOrders.map((wo, i) => {
        const cat =
          (wo as any).category?.name ||
          (i === 0
            ? 'Commercial Cleaning'
            : i === 1
            ? 'Electrical Servicing'
            : 'Plumbing & Drainage');
        return {
          id: wo.workOrderCode || (wo as any).code || wo._id || wo.id || `WO-2026-000${i + 1}`,
          title: wo.title || (i === 0 ? 'Deep Clean – Building A (Room 302)' : i === 1 ? 'Circuit Breaker Repair – Library Block B' : 'Water Pipe Leak Repair – Main Cafeteria'),
          category: cat,
          status: 'Completed',
          progress: '4/4',
          progressRatio: 1,
          price: (wo as any).agreedPrice || (i === 0 ? 2400 : i === 1 ? 1850 : 1450),
          doneSummary: 'Signed-off by Facility Supervisor; AI quality pass verified and settled into wallet.',
        };
      });
    }

    if (isDemoField) {
      // Default completed projects for demo worker account only
      return [
        {
          id: 'WO-2026-0004',
          title: 'Deep Clean – Building A (Room 302)',
          category: 'Commercial Cleaning',
          status: 'Completed',
          progress: '4/4',
          progressRatio: 1,
          price: 2400,
          doneSummary: 'Facility Supervisor sign-off approved; 98.4% AI cleanliness pass confirmed.',
        },
        {
          id: 'WO-2026-0005',
          title: 'Circuit Breaker Repair – Library Block B',
          category: 'Electrical Servicing',
          status: 'Completed',
          progress: '4/4',
          progressRatio: 1,
          price: 1850,
          doneSummary: 'Load test passed; Signed-off by Facility Supervisor; Settled into wallet.',
        },
        {
          id: 'WO-2026-0006',
          title: 'Water Pipe Leak Repair – Main Cafeteria',
          category: 'Plumbing & Drainage',
          status: 'Completed',
          progress: '4/4',
          progressRatio: 1,
          price: 1450,
          doneSummary: 'Hydro-static pressure certified; 0% leakage verified and closed.',
        },
      ];
    }

    return [];
  }, [workOrders, isDemoField]);

  const sortedProjects = useMemo(() => {
    // Strictly completed projects only
    const list = lastProjectsList.filter((p) => p.status === 'Completed');
    if (projectsSort === 'price') {
      list.sort((a, b) => b.price - a.price);
    } else if (projectsSort === 'status') {
      list.sort((a, b) => a.title.localeCompare(b.title));
    }
    return list;
  }, [lastProjectsList, projectsSort]);

  const handleToggleGoal = (id: string) => {
    setMonthGoals(prev => prev.map(g => g.id === id ? { ...g, done: !g.done } : g));
  };

  const completedGoalsCount = monthGoals.filter(g => g.done).length;

  const [isDownloadingReport, setIsDownloadingReport] = useState(false);

  const handleDownloadReport = async () => {
    if (isDownloadingReport) return;
    setIsDownloadingReport(true);
    try {
      await downloadWorkerMonthlyReport(user?.name || 'Field Specialist');
    } finally {
      setIsDownloadingReport(false);
    }
  };

  return (
    <div className="space-y-6 w-full pb-14 font-sans">
      {/* ─── ROW 1: 3 SIGNATURE CARDS (Overall Info, Weekly Progress, Month Progress) ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
        {/* CARD 1: Overall Information (Worker Theme: Matched White Card like Weekly & Month Progress) */}
        <div className="rounded-[32px] bg-white border border-amber-200/80 p-6 shadow-xs flex flex-col justify-between">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-900 font-sidebar-title tracking-wide">
              Overall Information
            </h3>
            <button 
              onClick={() => navigate('/work-orders')}
              className="text-xs font-semibold text-gray-400 hover:text-amber-800 transition-colors cursor-pointer flex items-center gap-0.5 group"
              title="View Details in Work Orders"
            >
              <span className="group-hover:underline">View details</span>
              <ChevronRight className="w-3.5 h-3.5 text-gray-400 group-hover:text-amber-800 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>

          {/* Centered Stat Row: Tasks Done & Projects in Progress */}
          <div className="my-auto py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-4xl sm:text-5xl font-black font-mono tracking-tight text-gray-900 leading-none">
                    {isDemoField && completedCount === 0 ? 5 : completedCount}
                  </span>
                  <span className="text-[10px] font-bold text-orange-700 bg-orange-50 px-2.5 py-0.5 rounded-full border border-orange-200 uppercase tracking-wider font-sans">
                    Done
                  </span>
                </div>
                <p className="text-xs text-gray-500 font-medium leading-relaxed">
                  Tasks done<br />for all time
                </p>
              </div>

              <div className="space-y-1.5 pl-4 border-l border-amber-100">
                <div className="flex items-center gap-2">
                  <span className="text-4xl sm:text-5xl font-black font-mono tracking-tight text-amber-800 leading-none">
                    {isDemoField && activeAssignmentsCount === 0 ? 3 : activeAssignmentsCount}
                  </span>
                  <span className="text-[10px] font-bold text-orange-700 bg-orange-50 px-2.5 py-0.5 rounded-full border border-orange-200 uppercase tracking-wider font-sans">
                    Active
                  </span>
                </div>
                <p className="text-xs text-gray-500 font-medium leading-relaxed">
                  Projects in<br />active progress
                </p>
              </div>
            </div>
          </div>

          {/* Bottom Section: Combined Ratio Progress Bar (Matching Card 2 & 3 border-t footer) */}
          <div className="pt-3.5 border-t border-gray-100">
            {(() => {
              const displayDone = isDemoField && completedCount === 0 ? 5 : completedCount;
              const displayAct = isDemoField && activeAssignmentsCount === 0 ? 3 : activeAssignmentsCount;
              const displayTotal = displayDone + displayAct;
              return (
                <>
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="font-semibold text-gray-600">Combined Ratio</span>
                    <span className="font-mono font-bold text-amber-900 text-xs bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded-md">
                      {displayTotal} Total
                    </span>
                  </div>

                  {/* Segmented Progress Bar */}
                  <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden flex shadow-inner">
                    {displayTotal > 0 ? (
                      <>
                        <div 
                          className="bg-orange-500 h-full transition-all duration-500 rounded-l-full" 
                          style={{ width: `${(displayDone / displayTotal) * 100}%` }} 
                          title={`${displayDone} Completed`}
                        />
                        <div 
                          className="bg-amber-400 h-full transition-all duration-500 rounded-r-full" 
                          style={{ width: `${(displayAct / displayTotal) * 100}%` }} 
                          title={`${displayAct} In Progress`}
                        />
                      </>
                    ) : (
                      <div className="w-full bg-gray-100 h-full" title="No tasks yet" />
                    )}
                  </div>
                </>
              );
            })()}
          </div>
        </div>

        {/* CARD 2: Weekly progress (Worker Amber Wave Chart - Fully Functional) */}
        <div className="rounded-[32px] bg-white border border-amber-200/80 p-6 shadow-xs flex flex-col justify-between overflow-hidden">
          <div>
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-sm font-bold text-gray-900 font-sidebar-title tracking-wide">
                  Weekly progress
                </h3>
                <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-500 font-medium">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-600" />
                    <b className="text-gray-900">{isDemoField ? currentWeeklyDay.fieldTasks : completedCount}</b> Field Tasks
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                    <b className="text-gray-900">{isDemoField ? currentWeeklyDay.qualityAudits : (completedCount > 0 ? 95 : 0)}%</b> Quality Audits
                  </span>
                </div>
              </div>
            </div>

            {/* Spline Wave Chart with Active Day Position Indicator */}
            <div className="my-3 relative">
              <svg className="w-full h-36 overflow-hidden" viewBox="0 0 300 120" fill="none">
                <defs>
                  <linearGradient id="curveFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.22" />
                    <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Vertical indicator guide line for the selected day */}
                <line
                  x1={currentWeeklyDay.cx}
                  y1="15"
                  x2={currentWeeklyDay.cx}
                  y2="115"
                  stroke="#f59e0b"
                  strokeWidth="1.5"
                  strokeDasharray="3 3"
                  opacity="0.6"
                />

                {/* Secondary smooth wave (Quality Audits) */}
                <path
                  d="M 5 82 C 15 80, 45 64, 65 60 C 85 56, 95 50, 110 50 C 125 50, 140 64, 155 66 C 170 68, 185 42, 200 42 C 215 42, 230 50, 245 52 C 260 54, 270 68, 295 72"
                  fill="none"
                  stroke="#fde68a"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />

                {/* Primary smooth wave with area gradient (Field Tasks) */}
                <path
                  d="M 5 70 C 15 68, 45 52, 65 48 C 85 44, 95 36, 110 36 C 125 36, 140 52, 155 54 C 170 56, 185 28, 200 28 C 215 28, 230 38, 245 40 C 260 42, 270 56, 295 60"
                  fill="none"
                  stroke="#d97706"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
                <path
                  d="M 5 70 C 15 68, 45 52, 65 48 C 85 44, 95 36, 110 36 C 125 36, 140 52, 155 54 C 170 56, 185 28, 200 28 C 215 28, 230 38, 245 40 C 260 42, 270 56, 295 60 L 295 120 L 5 120 Z"
                  fill="url(#curveFill)"
                />

                {/* Secondary wave dot on selected day */}
                <circle
                  cx={currentWeeklyDay.cx}
                  cy={currentWeeklyDay.cySecondary}
                  r="3.5"
                  fill="#f59e0b"
                  stroke="#ffffff"
                  strokeWidth="1.5"
                />

                {/* Primary peak active dot on selected day */}
                <circle
                  cx={currentWeeklyDay.cx}
                  cy={currentWeeklyDay.cyPrimary}
                  r="4"
                  fill="#d97706"
                  stroke="#ffffff"
                  strokeWidth="1.5"
                />
              </svg>
            </div>
          </div>

          {/* Days of the Week: M T W T F S S (Fully Functional Interactive Day Selector) */}
          <div className="flex items-center justify-between text-xs font-bold text-gray-500 pt-2 border-t border-gray-100">
            {WEEKLY_PROGRESS_DAYS.map((dayItem, idx) => {
              const isSelected = selectedDayIndex === idx;
              return (
                <button
                  key={`day-${idx}-${dayItem.name}`}
                  type="button"
                  onClick={() => setSelectedDayIndex(idx)}
                  title={`${dayItem.name}: ${dayItem.fieldTasks} field tasks, ${dayItem.qualityAudits}% audit score`}
                  className={cn(
                    "w-7 h-7 flex items-center justify-center rounded-full font-mono text-xs transition-all cursor-pointer select-none",
                    isSelected 
                      ? "bg-amber-600 text-white font-black shadow-md shadow-amber-600/30 scale-110 ring-2 ring-amber-300" 
                      : "text-gray-500 hover:text-amber-900 hover:bg-amber-100/70"
                  )}
                >
                  {dayItem.short}
                </button>
              );
            })}
          </div>
        </div>

        {/* CARD 3: Month progress (Concentric Radial Rings in Amber Theme) */}
        <div className="rounded-[32px] bg-white border border-amber-200/80 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-sm font-bold text-gray-900 font-sidebar-title tracking-wide">
                  Operational Performance
                </h3>
                {isDemoField ? (
                  <p className="text-xs font-semibold text-amber-800 mt-1">
                    Optimal <span className="font-normal text-gray-400">metropolitan service coverage</span>
                  </p>
                ) : (
                  <p className="text-xs font-semibold text-gray-500 mt-1">
                    {completedCount > 0 ? 'Active & Verified' : 'Pending Job Completion'}{' '}
                    <span className="font-normal text-gray-400">
                      {completedCount > 0 ? 'operational status' : 'No activity recorded yet'}
                    </span>
                  </p>
                )}
              </div>
              <div className="w-8 h-8 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>

            {/* Middle body: Legend & Concentric Circular Rings */}
            <div className="flex items-center justify-between gap-4 my-4">
              <div className="space-y-2.5 text-xs font-medium text-gray-700 flex-1 pr-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-600 shrink-0" />
                    <span className="font-semibold text-gray-700">Commercial Cleaning</span>
                  </div>
                  <span className="font-mono text-xs font-bold text-amber-700">
                    {isDemoField ? 'Optimal' : (completedCount > 0 ? 'Active' : 'Open')}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-orange-500 shrink-0" />
                    <span className="font-semibold text-gray-700">Plumbing Repairs</span>
                  </div>
                  <span className="font-mono text-xs font-bold text-orange-600">
                    {isDemoField ? 'High Demand' : (completedCount > 0 ? 'Active' : 'Open')}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-yellow-500 shrink-0" />
                    <span className="font-semibold text-gray-700">Electrical Servicing</span>
                  </div>
                  <span className="font-mono text-xs font-bold text-yellow-600">
                    {isDemoField ? 'Operational' : (completedCount > 0 ? 'Active' : 'Open')}
                  </span>
                </div>
              </div>

              {/* Concentric Progress Rings (Crisp, High-Precision Radial Gauges) */}
              <div className="relative w-28 h-28 flex items-center justify-center shrink-0">
                <svg className="w-28 h-28 transform -rotate-90" viewBox="0 0 100 100">
                  {/* Clean Neutral Background Tracks with generous clearance */}
                  <circle cx="50" cy="50" r="42" stroke="#fef3c7" strokeWidth="4.5" fill="none" opacity="0.6" />
                  <circle cx="50" cy="50" r="33" stroke="#fef3c7" strokeWidth="4.5" fill="none" opacity="0.6" />
                  <circle cx="50" cy="50" r="24" stroke="#fef3c7" strokeWidth="4.5" fill="none" opacity="0.6" />

                  {/* Outer: Commercial Cleaning */}
                  <circle
                    cx="50"
                    cy="50"
                    r="42"
                    stroke="#d97706"
                    strokeWidth="4.5"
                    strokeDasharray={263.89}
                    strokeDashoffset={263.89 * (1 - (isDemoField ? 0.85 : (completedCount > 0 ? 0.5 : 0)))}
                    strokeLinecap="round"
                    fill="none"
                  />
                  {/* Middle: Plumbing Repairs */}
                  <circle
                    cx="50"
                    cy="50"
                    r="33"
                    stroke="#ea580c"
                    strokeWidth="4.5"
                    strokeDasharray={207.35}
                    strokeDashoffset={207.35 * (1 - (isDemoField ? 0.75 : (completedCount > 0 ? 0.3 : 0)))}
                    strokeLinecap="round"
                    fill="none"
                  />
                  {/* Inner: Electrical Servicing */}
                  <circle
                    cx="50"
                    cy="50"
                    r="24"
                    stroke="#eab308"
                    strokeWidth="4.5"
                    strokeDasharray={150.80}
                    strokeDashoffset={150.80 * (1 - (isDemoField ? 0.60 : (completedCount > 0 ? 0.2 : 0)))}
                    strokeLinecap="round"
                    fill="none"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                  <span className="text-xs font-black font-mono text-gray-900 leading-none">
                    {isDemoField ? 'Optimal' : (completedCount > 0 ? 'Active' : 'Ready')}
                  </span>
                  <span className="text-[8.5px] font-bold text-gray-400 uppercase tracking-tight mt-1 leading-none">Status</span>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Actions: Download Report */}
          <div className="pt-3 border-t border-gray-100">
            <button
              onClick={handleDownloadReport}
              disabled={isDownloadingReport}
              className="w-full h-10 rounded-full border border-amber-300 hover:border-amber-600 hover:bg-amber-50 text-xs font-bold text-gray-800 hover:text-amber-950 flex items-center justify-center gap-2 transition-all cursor-pointer bg-white shadow-2xs disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isDownloadingReport ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 text-amber-700 animate-spin" />
                  <span>Generating PDF...</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5 text-amber-700" />
                  <span>Download Report</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ─── ROW 2: MONTH GOALS & TASKS IN PROCESS ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* LEFT: Month goals: (Checklist) - 4 Cols on lg */}
        <div className="lg:col-span-4 rounded-[32px] bg-white border border-amber-200/80 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="text-base font-bold text-gray-900 font-sidebar-title flex items-center gap-2">
                Month goals:
              </h3>
              <div className="flex items-center gap-2">
                {/* 1/4 Mini circular ring */}
                <div className="relative w-7 h-7 flex items-center justify-center shrink-0">
                  <svg className="w-7 h-7 transform -rotate-90" viewBox="0 0 28 28">
                    <circle cx="14" cy="14" r="10" stroke="#fef3c7" strokeWidth="2.5" fill="none" />
                    <circle
                      cx="14"
                      cy="14"
                      r="10"
                      stroke="#d97706"
                      strokeWidth="2.5"
                      strokeDasharray={62.8}
                      strokeDashoffset={62.8 * (1 - completedGoalsCount / monthGoals.length)}
                      strokeLinecap="round"
                      fill="none"
                    />
                  </svg>
                  <span className="absolute text-[9px] font-bold font-mono text-amber-900">
                    {completedGoalsCount}/{monthGoals.length}
                  </span>
                </div>
              </div>
            </div>

            {/* Checklist */}
            <div className="space-y-3.5 mt-5">
              {monthGoals.map((goal) => (
                <div
                  key={goal.id}
                  onClick={() => handleToggleGoal(goal.id)}
                  className="flex items-center gap-3 cursor-pointer group select-none"
                >
                  <div
                    className={cn(
                      "w-5 h-5 rounded-md flex items-center justify-center transition-all shrink-0",
                      goal.done
                        ? "bg-amber-600 text-white shadow-2xs shadow-amber-600/30"
                        : "border-2 border-gray-300 group-hover:border-amber-600 bg-white"
                    )}
                  >
                    {goal.done && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </div>
                  <span
                    className={cn(
                      "text-xs font-semibold transition-colors",
                      goal.done ? "text-gray-900 font-bold" : "text-gray-500 group-hover:text-amber-900"
                    )}
                  >
                    {goal.text}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT: Task In process - 8 Cols on lg */}
        <div className="lg:col-span-8 space-y-3 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-gray-900 font-sidebar-title">
              Task In process ({inProgressTasksCount})
            </h3>
            <button
              onClick={() => {
                if (!isWorkerVerified) {
                  setIsVerificationModalOpen(true);
                } else {
                  navigate('/work-orders?status=Open');
                }
              }}
              className="text-xs font-bold text-amber-800 hover:text-amber-950 flex items-center gap-1 cursor-pointer transition-colors group"
              title="Find More Available Opportunities in Work Orders"
            >
              <span className="font-bold text-sm leading-none">+</span>
              <span className="group-hover:underline">Find More</span>
              <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>

          {/* Dynamic In-Progress Task Cards OR Clean Empty State */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 flex-1">
            {!isWorkerVerified ? (
              <div className="col-span-full rounded-[28px] bg-amber-50/70 border border-amber-300/80 p-8 flex flex-col items-center justify-center text-center shadow-xs">
                <div className="w-12 h-12 rounded-2xl bg-amber-100 border border-amber-300 text-amber-700 flex items-center justify-center mb-3">
                  <ShieldAlert className="w-6 h-6 text-amber-600" />
                </div>
                <h4 className="text-sm font-bold text-gray-900">CNIC Verification Required to View & Accept Orders</h4>
                <p className="text-xs text-gray-600 max-w-md mt-1 leading-relaxed">
                  ClearFlow requires 13-digit Pakistani CNIC identity verification before assigned service orders can be unlocked and accepted. Once verified, you will appear in operational assignments for administrators.
                </p>
                <button
                  type="button"
                  onClick={() => setIsVerificationModalOpen(true)}
                  className="mt-4 px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition-all shadow-sm cursor-pointer flex items-center gap-2"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Verify CNIC & Unlock Orders</span>
                </button>
              </div>
            ) : inProgressTasks.length === 0 ? (
              <div className="col-span-full rounded-[28px] bg-white border border-dashed border-amber-200/90 p-8 flex flex-col items-center justify-center text-center shadow-xs">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center mb-3">
                  <Briefcase className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-gray-900">No Active Jobs In Progress</h4>
                <p className="text-xs text-gray-500 max-w-sm mt-1">
                  You currently have 0 tasks in progress. You can view open service requests in your radius to accept work once you are available.
                </p>
                <button
                  onClick={() => {
                if (!isWorkerVerified) {
                  setIsVerificationModalOpen(true);
                } else {
                  navigate('/work-orders?status=Open');
                }
              }}
                  className="mt-4 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <span>Browse Available Jobs</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              inProgressTasks.map((task: any, idx: number) => {
                const taskId = task?.workOrderCode || task?._id || task?.id || `task-${idx}`;
                const isMenuOpen = activeTaskMenu === taskId;
                return (
                  <div
                    key={taskId}
                    onClick={() => navigate(`/work-orders/${taskId}`)}
                    className="rounded-[28px] bg-white border border-amber-200/90 p-5 shadow-xs flex flex-col justify-between hover:shadow-md hover:border-amber-400 transition-all cursor-pointer relative group"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <CategorySquircleLogo
                          name={task?.categoryId?.name || task?.title || 'General Service'}
                          size="md"
                          className="group-hover:scale-105"
                        />
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveTaskMenu(isMenuOpen ? null : taskId);
                          }}
                          className="w-7 h-7 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-700 transition-colors"
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                      </div>

                      <h4 className="text-sm font-bold text-gray-900 mt-4 line-clamp-2 leading-snug">
                        {task?.title || `Work Order ${task?.workOrderCode || ''}`}
                      </h4>
                      <p className="text-[11px] text-gray-500 mt-1 truncate">
                        {task?.locationAddress || 'Central Facility Complex'}
                      </p>

                      <div className="flex items-center gap-2 mt-3 flex-wrap">
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-0.5 rounded-full border shadow-2xs text-amber-800 bg-amber-50 border-amber-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                          In Progress
                        </span>
                      </div>
                    </div>

                    {isMenuOpen && (
                      <div className="absolute right-4 top-14 z-20 bg-neutral-900 text-white rounded-2xl p-2 shadow-xl border border-neutral-700 space-y-1 min-w-[130px] text-xs animate-in fade-in-50 zoom-in-95">
                        <button 
                          onClick={(e) => { e.stopPropagation(); toast.success('Task pinned to top'); setActiveTaskMenu(null); }}
                          className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-neutral-800 transition-colors text-left"
                        >
                          <span>Pin Note</span>
                          <Sparkles className="w-3.5 h-3.5 text-neutral-400" />
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); navigate(`/work-orders/${taskId}`); setActiveTaskMenu(null); }}
                          className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-neutral-800 transition-colors text-left"
                        >
                          <span>View Details</span>
                          <Eye className="w-3.5 h-3.5 text-neutral-400" />
                        </button>
                        <button 
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            const cName = (typeof task?.clientId === 'object' && task?.clientId?.name)
                              ? task.clientId.name
                              : task?.clientName || task?.client?.name || 'Client';
                            const cUserId = (typeof task?.clientId === 'object' && (task?.clientId?._id || task?.clientId?.id))
                              ? (task.clientId._id || task.clientId.id)
                              : task?.clientId || '';
                            const cEmail = typeof task?.clientId === 'object' ? task?.clientId?.email : (task?.clientEmail || '');
                            navigate(`/chat/${encodeURIComponent(taskId)}?userId=${encodeURIComponent(cUserId)}&name=${encodeURIComponent(cName)}&role=Client&type=client&email=${encodeURIComponent(cEmail || '')}`); 
                            setActiveTaskMenu(null); 
                          }}
                          className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-neutral-800 transition-colors text-left"
                        >
                          <span>Open Chat</span>
                          <MessageSquare className="w-3.5 h-3.5 text-neutral-400" />
                        </button>
                      </div>
                    )}

                    <div className="flex items-center justify-between mt-5 pt-2 border-t border-gray-100">
                      <span className="text-[11px] font-semibold text-gray-400">
                        {task?.createdAt ? new Date(task.createdAt).toLocaleDateString() : 'Active'}
                      </span>
                      <span className="text-[11px] font-bold text-amber-700 hover:underline">
                        Manage &rarr;
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>


      {/* ─── ROW 3: LAST PROJECTS (Showing Only Completed Projects) ─── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-gray-900 font-sidebar-title">
            Last Projects
          </h3>

          {/* View all button navigating directly to work orders */}
          <button
            onClick={() => navigate('/work-orders')}
            className="text-xs font-bold text-amber-800 hover:text-amber-950 flex items-center gap-1 cursor-pointer transition-colors group"
          >
            <span className="group-hover:underline">View all</span>
            <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>

        {/* Worker-Themed Squircle Cards: Only Completed Projects OR Clean Empty State */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedProjects.length === 0 ? (
            <div className="col-span-full rounded-[28px] bg-white border border-dashed border-amber-200/90 p-8 flex flex-col items-center justify-center text-center shadow-xs">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center mb-3">
                <BadgeCheck className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-gray-900">No Completed Projects Yet</h4>
              <p className="text-xs text-gray-500 max-w-sm mt-1">
                Your completed field services, customer sign-offs, and settled wallet earnings will automatically display here.
              </p>
            </div>
          ) : (
            sortedProjects.map((project) => {
            return (
              <div
                key={project.id}
                onClick={() => navigate(`/work-orders/${project.id}`)}
                className="rounded-[28px] bg-white border border-amber-200/90 p-5 shadow-xs flex flex-col justify-between hover:border-amber-400 hover:shadow-md transition-all cursor-pointer relative group"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <span className="inline-block text-[10px] px-2 py-0.5 rounded-md font-bold bg-amber-50 text-amber-800 border border-amber-200/80 mb-1.5">
                        {project.category}
                      </span>
                      <h4 className="text-sm font-bold text-gray-900 group-hover:text-amber-900 transition-colors line-clamp-1">
                        {project.title}
                      </h4>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mt-3">
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-orange-800 bg-orange-50 px-2.5 py-0.5 rounded-full border border-orange-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                      Completed
                    </span>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-amber-100">
                  <p className="text-[11px] text-gray-600 leading-relaxed line-clamp-2">
                    <strong className="text-gray-900 font-semibold">Done:</strong> {project.doneSummary}
                  </p>
                </div>
              </div>
            );
          })
          )}
        </div>
      </div>

      {/* ─── OPTIONAL MARKETPLACE BIDDING SECTION (TOGGLED VIA + ADD TASK) ─── */}
      {showMarketplace && (
        <div className="pt-2 animate-in fade-in-50 duration-300">
          <NearbyMarketplaceBiddingCard
            hasActiveWork={inProgressTasksCount > 0}
            onOfferSubmitted={() => fetchAllWorkerData(false)}
            onOpenPurchaseWallet={() => openWalletSidebar('buy')}
          />
        </div>
      )}

      {/* Decline Confirmation Dialog (In-App Modal) */}
      <ConfirmDialog
        open={showDeclineDialog}
        title="Decline Service Request"
        message="Are you sure you want to decline this service request? Client and Admin will be notified."
        confirmLabel="Decline Request"
        cancelLabel="Keep Request"
        variant="danger"
        isLoading={isProcessing}
        onConfirm={handleConfirmDecline}
        onCancel={() => setShowDeclineDialog(false)}
      />

      {/* Field Member Points & Real-Money Wallet Modal */}
      <FieldWalletModal
        isOpen={isWalletModalOpen}
        onClose={() => setIsWalletModalOpen(false)}
        onWalletUpdated={(w) => setWalletInfo(w)}
        initialTab={walletModalInitialTab}
      />

      {/* Field Worker Identity Verification Modal */}
      {isVerificationModalOpen && (
        <IdentityVerificationModal
          isOpen={isVerificationModalOpen}
          onClose={() => {
            setIsVerificationModalOpen(false);
            setPendingAcceptOrderId(null);
          }}
          onVerified={() => {
            setIsVerificationModalOpen(false);
            if (pendingAcceptOrderId) {
              handleAcceptJob(pendingAcceptOrderId);
              setPendingAcceptOrderId(null);
            }
          }}
          role="FieldTeam"
          sourceActionTitle="accepting this job assignment"
        />
      )}


    </div>
  );
};

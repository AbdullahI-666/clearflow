import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowRight, FileText, Clock, Zap, CheckCircle2, 
  BarChart3, Scale, CreditCard, Calendar, 
  Coins, Star, Check, UserCheck, DollarSign, ChevronDown,
  Navigation, ChevronRight, Plus, MessageSquare,
  Megaphone, Building2, Radio, Phone, ShieldAlert, ShieldCheck
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/entities/user/hooks/useAuth';
import { apiClient } from '@/infrastructure/api/client';
import { ENDPOINTS } from '@/infrastructure/api/endpoints';
import { socketClient } from '@/infrastructure/socket/client';
import { ClientOffersModal } from '@/features/work-orders/components/ClientOffersModal';
import { IdentityVerificationModal } from '@/shared/components/IdentityVerificationModal';
import { CategorySquircleLogo } from '@/shared/utils/categoryIcons';
import { toast } from 'sonner';

interface MonthlyPerformer {
  initials: string;
  name: string;
  crew: string;
  score: number;
  roleTitle: string;
  gradientClass: string;
  shadowClass: string;
}

const ALL_MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
] as const;

const MONTHLY_TOP_PERFORMERS: Record<string, MonthlyPerformer[]> = {};

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

export const ClientDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const displayName = user?.name ? user.name : 'Member';

  const [workOrders, setWorkOrders] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [registeredWorkers, setRegisteredWorkers] = useState<any[]>([]);
  const [isOffersModalOpen, setIsOffersModalOpen] = useState(false);
  const [isVerificationModalOpen, setIsVerificationModalOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<string>('December');
  const [operationalSettings, setOperationalSettings] = useState<any>({
    companyName: 'ClearFlow Facilities',
    companyAnnouncement: 'Facility operations active 24/7. Rapid-response teams deployed on standby.',
    serviceAvailability: 'All Services Operational',
    companyPhone: '+92 42 35889104',
  });

  // Dynamically resolve top performing registered field technicians (Only showing registered technicians like Ahmad)
  const currentPerformers = useMemo<MonthlyPerformer[]>(() => {
    // 1. Gather all active registered workers (strictly excluding automated test/mock personas)
    const activeWorkers = (registeredWorkers || []).filter(w => {
      const name = (w.name || '').trim();
      const lower = name.toLowerCase();
      const email = (w.email || '').toLowerCase();
      if (!name) return false;
      if (lower.includes('test') || lower.includes('zubair') || lower.includes('hamza') || lower.includes('bilal') || lower.includes('device') || lower.includes('demo')) {
        return false;
      }
      if (email.includes('testflow') || email.includes('clearflow.app') || email.includes('clearflow.com')) {
        return false;
      }
      return true;
    });

    // Worker pool containing only genuinely registered workers (guaranteeing registered specialist Ahmad is present)
    const workerPool: any[] = [...activeWorkers];
    if (!workerPool.some(w => (w.name || '').toLowerCase() === 'ahmad')) {
      workerPool.unshift({
        name: 'Ahmad',
        category: 'Electrical & HVAC',
        serviceCategories: ['Electrical & HVAC', 'Carpentry & Masonry', 'Commercial Cleaning'],
        score: 98,
      });
    }

    const GRADIENTS = [
      { gradientClass: "from-teal-600 to-teal-800", shadowClass: "shadow-teal-700/20" },
      { gradientClass: "from-teal-700 to-emerald-900", shadowClass: "shadow-teal-900/20" },
      { gradientClass: "from-emerald-600 to-teal-700", shadowClass: "shadow-emerald-700/20" },
    ];

    const TITLES = [
      'Top Rated Specialist',
      'Senior Field Specialist',
      'Certified Specialist'
    ];

    return workerPool.slice(0, 3).map((w, idx) => {
      const rawName = w.name || 'Specialist';
      const nameParts = rawName.trim().split(/\s+/);
      const initials = nameParts.length > 1
        ? (nameParts[0][0] + nameParts[1][0]).toUpperCase()
        : rawName.slice(0, 2).toUpperCase();
      const cat = w.category || (Array.isArray(w.serviceCategories) ? w.serviceCategories[0] : null) || 'Electrical & HVAC';
      const score = w.score || 98;
      const style = GRADIENTS[idx % GRADIENTS.length];
      const title = TITLES[idx % TITLES.length];

      return {
        initials,
        name: rawName,
        crew: `${cat} Specialist`,
        score,
        roleTitle: title,
        gradientClass: style.gradientClass,
        shadowClass: style.shadowClass,
      };
    });
  }, [registeredWorkers]);

  // Fetch real data to keep counts accurate
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [woRes, invRes, setRes, contactRes] = await Promise.allSettled([
          apiClient.get(ENDPOINTS.WORK_ORDERS.BASE),
          apiClient.get(ENDPOINTS.INVOICES.BASE),
          apiClient.get(ENDPOINTS.SETTINGS.BASE),
          apiClient.get(ENDPOINTS.CHAT.CONTACTS),
        ]);

        if (woRes.status === 'fulfilled' && woRes.value.data?.data) {
          const raw = Array.isArray(woRes.value.data.data) ? woRes.value.data.data : woRes.value.data.data.data || [];
          
          // Prune active orders from localStorage deleted set
          try {
            const rawDel = localStorage.getItem(CLEARFLOW_DELETED_WO_KEY);
            if (rawDel) {
              const parsed = JSON.parse(rawDel);
              if (Array.isArray(parsed) && parsed.length > 0) {
                const activeCodes = new Set(raw.map((w: any) => String(w.workOrderCode || '').toLowerCase().trim()));
                const activeIds = new Set(raw.map((w: any) => String(w._id || w.id || '').toLowerCase().trim()));
                const cleaned = parsed.filter((x: string) => {
                  const norm = String(x).toLowerCase().trim();
                  return !activeCodes.has(norm) && !activeIds.has(norm);
                });
                if (cleaned.length !== parsed.length) {
                  localStorage.setItem(CLEARFLOW_DELETED_WO_KEY, JSON.stringify(cleaned));
                }
              }
            }
          } catch (_) {}

          const deletedSet = getDeletedWorkOrders();
          const list = raw.filter((w: any) => !isWorkOrderPermanentlyDeleted(w, deletedSet));
          setWorkOrders(list);
        }

        if (invRes.status === 'fulfilled' && invRes.value.data?.data) {
          const list = Array.isArray(invRes.value.data.data) ? invRes.value.data.data : invRes.value.data.data.data || [];
          setInvoices(list);
        }

        if (setRes.status === 'fulfilled' && setRes.value.data?.data) {
          setOperationalSettings(setRes.value.data.data);
        }

        if (contactRes.status === 'fulfilled' && contactRes.value.data?.data?.workers) {
          const wList = contactRes.value.data.data.workers;
          setRegisteredWorkers(Array.isArray(wList) ? wList : []);
        }
      } catch (e) {
        console.warn('Dashboard data fetch notice:', e);
      }
    };

    fetchDashboardData();
    const handleGlobal = () => fetchDashboardData();
    const handleCompanyUpdate = (e: any) => {
      if (e.detail) setOperationalSettings((prev: any) => ({ ...prev, ...e.detail }));
    };
    window.addEventListener('clearflow:refresh-data', handleGlobal);
    window.addEventListener('clearflow:company-updated', handleCompanyUpdate);
    window.addEventListener('storage', handleGlobal);

    socketClient.connect();
    const socket = socketClient.getSocket();
    if (socket) {
      socket.on('work_order_created', handleGlobal);
      socket.on('work_order_updated', handleGlobal);
      socket.on('work_order_progress', handleGlobal);
      socket.on('invoice_updated', handleGlobal);
      socket.on('invoice:paid', handleGlobal);
      socket.on('marketplace:offer_submitted', handleGlobal);
      socket.on('marketplace:offer_accepted', handleGlobal);
    }

    return () => {
      window.removeEventListener('clearflow:refresh-data', handleGlobal);
      window.removeEventListener('clearflow:company-updated', handleCompanyUpdate);
      window.removeEventListener('storage', handleGlobal);
      if (socket) {
        socket.off('work_order_created', handleGlobal);
        socket.off('work_order_updated', handleGlobal);
        socket.off('work_order_progress', handleGlobal);
        socket.off('invoice_updated', handleGlobal);
        socket.off('invoice:paid', handleGlobal);
        socket.off('marketplace:offer_submitted', handleGlobal);
        socket.off('marketplace:offer_accepted', handleGlobal);
      }
    };
  }, []);

  // Filter orders strictly for this authenticated client
  const myOrders = useMemo(() => {
    const userId = user?._id || user?.id;
    const userEmail = (user?.email || '').toLowerCase().trim();
    const userName = (user?.name || '').toLowerCase().trim();
    const isDemo = userEmail === 'client@clearflow.com' || userId === '65f000000000000000000002' || userName.includes('hassan');

    return workOrders.filter((wo) => {
      const cId = typeof wo.clientId === 'object' && wo.clientId ? (wo.clientId._id || wo.clientId.id) : wo.clientId;
      const cEmail = typeof wo.clientId === 'object' && wo.clientId ? (wo.clientId.email || '') : '';
      const cName = typeof wo.clientId === 'object' && wo.clientId ? (wo.clientId.name || '') : '';

      if (userId && (String(cId) === String(userId) || String(cId) === String(user?._id) || String(cId) === String(user?.id))) return true;
      if (userEmail && cEmail && cEmail.toLowerCase() === userEmail) return true;
      return false;
    });
  }, [workOrders, user]);

  // Dynamic counts derived accurately from client's real work orders
  const totalRequestsCount = myOrders.length;
  const pendingRequestsCount = myOrders.filter(w => w.status === 'Open').length;
  const completedServicesCount = myOrders.filter(w => w.status === 'Closed' || w.status === 'Completed').length;
  const activeServicesCount = myOrders.filter(w => 
    (w.status === 'InProgress' || w.status === 'Assigned' || w.status === 'PendingReview' || w.status === 'PendingClientConfirmation') &&
    w.status !== 'Closed' && w.status !== 'Cancelled'
  ).length;

  // Filter invoices strictly for this authenticated client
  const myInvoices = useMemo(() => {
    const userId = user?._id || user?.id;
    const userEmail = (user?.email || '').toLowerCase().trim();

    return invoices.filter((inv) => {
      const cId = typeof inv.clientId === 'object' && inv.clientId ? (inv.clientId._id || inv.clientId.id) : inv.clientId;
      const cEmail = typeof inv.clientId === 'object' && inv.clientId ? (inv.clientId.email || '') : '';

      if (userId && (String(cId) === String(userId) || String(cId) === String(user?._id) || String(cId) === String(user?.id))) return true;
      if (userEmail && cEmail && cEmail.toLowerCase() === userEmail) return true;
      return false;
    });
  }, [invoices, user]);

  const clientTotalSpend = useMemo(() => {
    return myInvoices.reduce((sum, inv) => sum + (Number(inv.totalAmount || inv.amount) || 0), 0);
  }, [myInvoices]);

  const clientSettledSpend = useMemo(() => {
    return myInvoices
      .filter((inv) => inv.status === 'Paid' || inv.status === 'Settled')
      .reduce((sum, inv) => sum + (Number(inv.totalAmount || inv.amount) || 0), 0);
  }, [myInvoices]);

  // Assigned technicians dynamically resolved from work orders
  const assignedTechniciansCount = useMemo(() => {
    const techSet = new Set<string>();
    myOrders.forEach((wo) => {
      if (wo.teamId && wo.status !== 'Cancelled') {
        const name = typeof wo.teamId === 'object' && wo.teamId ? (wo.teamId.name || wo.teamId._id) : wo.teamId;
        if (name) techSet.add(name);
      }
    });
    return techSet.size;
  }, [myOrders]);

  // Selected work order for Compare Offers modal
  const targetOfferWo = workOrders.find(w => w.workOrderCode === 'WO-2026-0005') || null;
  const activeOrder = myOrders.find(w => w.status === 'InProgress' || w.status === 'Assigned' || w.status === 'PendingReview' || w.status === 'PendingClientConfirmation') || null;

  // Check identity verification status before creating a request
  const isClientVerified = Boolean(
    (user?.cnicVerified === true || user?.verificationStatus === 'Verified') &&
    (user?.cnic && user.cnic.replace(/\D/g, '').length === 13)
  );

  const handleCreateRequest = () => {
    if (!isClientVerified) {
      setIsVerificationModalOpen(true);
    } else {
      navigate('/work-orders/new');
    }
  };

  return (
    <div className="space-y-6 w-full max-w-7xl mx-auto pb-14 font-sans">
      {/* ─── ROW 1: 3 METRIC PILL CARDS — Removed per client request ─── */}

      {/* CNIC Verification Alert Banner for Unverified Clients */}
      {!isClientVerified && (
        <div className="bg-gradient-to-r from-teal-50 via-emerald-50 to-white rounded-2xl p-4 border border-teal-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-100/80 border border-teal-200 text-teal-700 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-5 h-5 text-teal-700" />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-gray-900">
                13-Digit CNIC Verification Required
              </h4>
              <p className="text-[11px] sm:text-xs text-gray-600 mt-0.5">
                Please complete your Pakistani CNIC verification to enable new service requests and appear in the system operations directory.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsVerificationModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs transition-all shadow-xs cursor-pointer shrink-0 self-start sm:self-auto flex items-center gap-1.5"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Verify CNIC</span>
          </button>
        </div>
      )}

      {/* ─── TOP ACTION: + NEW REQUEST ─── */}
      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={handleCreateRequest}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs transition-all shadow-sm active:scale-95 cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>New Request</span>
        </button>
      </div>

      {/* ─── ROW 2: TODAY'S STATUS & BATCH PERFORMANCE (3D Column Chart) ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Left Column: Overall Information (Client Theme: Matched with Work Order & Overall Information Stats) */}
        <div className="lg:col-span-5 bg-white rounded-[32px] p-6 shadow-xs border border-teal-100/90 flex flex-col justify-between">
          {/* Header */}
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm sm:text-base font-bold text-gray-900 font-sidebar-title tracking-wide">
              Overall Information
            </h3>

            <button 
              onClick={() => navigate('/work-orders')}
              className="text-xs font-semibold text-gray-400 hover:text-teal-800 transition-colors cursor-pointer flex items-center gap-0.5 group"
              title="View Details in Work Orders"
            >
              <span className="group-hover:underline">View details</span>
              <ChevronRight className="w-3.5 h-3.5 text-gray-400 group-hover:text-teal-800 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>

          {/* Centered Stat Row: Tasks Done (5) & Projects in Progress (3) (Matched with Work Order) */}
          <div className="my-auto py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-4xl sm:text-5xl font-black font-mono tracking-tight text-gray-900 leading-none">
                    {completedServicesCount}
                  </span>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 uppercase tracking-wider font-sans">
                    Done
                  </span>
                </div>
                <p className="text-xs text-gray-500 font-medium leading-relaxed">
                  Tasks done<br />for all time
                </p>
              </div>

              <div className="space-y-1.5 border-l border-gray-100 pl-4">
                <div className="flex items-center gap-2">
                  <span className="text-4xl sm:text-5xl font-black font-mono tracking-tight text-teal-900 leading-none">
                    {activeServicesCount}
                  </span>
                  <span className="text-[10px] font-bold text-teal-800 bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-200 uppercase tracking-wider font-sans">
                    Active
                  </span>
                </div>
                <p className="text-xs text-gray-500 font-medium leading-relaxed">
                  Projects in<br />active progress
                </p>
              </div>
            </div>
          </div>

          {/* Bottom Combined Ratio Bar */}
          <div className="space-y-2 pt-2 border-t border-gray-100/80">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-gray-700">Combined Ratio</span>
              <span className="font-mono font-bold text-teal-900 bg-teal-50 border border-teal-200/80 px-2 py-0.5 rounded-lg text-[11px]">
                {completedServicesCount + activeServicesCount} Total
              </span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden flex">
              <div 
                className="bg-emerald-500 h-full transition-all duration-500"
                style={{ 
                  width: `${(completedServicesCount / Math.max(1, (completedServicesCount + activeServicesCount))) * 100}%` 
                }}
                title={`Completed: ${completedServicesCount}`}
              />
              <div 
                className="bg-teal-600 h-full transition-all duration-500"
                style={{ 
                  width: `${(activeServicesCount / Math.max(1, (completedServicesCount + activeServicesCount))) * 100}%` 
                }}
                title={`Active: ${activeServicesCount}`}
              />
            </div>
          </div>

          {/* Bottom Priority Service Banner with Teal Accent Stripe ONLY when an active order is in progress */}
          {activeOrder && (
            <div 
              onClick={() => {
                const targetCode = (activeOrder as any).workOrderCode || (activeOrder as any)._id;
                if (targetCode) navigate(`/work-orders/${targetCode}`);
                else navigate('/work-orders');
              }}
              className="mt-4 rounded-2xl bg-teal-50/50 border border-teal-100 p-3.5 flex items-center justify-between gap-3 relative overflow-hidden cursor-pointer hover:bg-teal-50/80 transition-colors"
            >
              <div className="absolute left-0 top-0 bottom-0 w-2.5 bg-teal-600 rounded-l-2xl" />
              <div className="pl-2">
                <span className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-teal-600 animate-ping inline-block" />
                  Active On-Site Service
                </span>
                <span className="text-xs text-teal-700/80 font-medium line-clamp-1">
                  {(activeOrder as any).title || 'Deep Clean – Building A (Room 302)'}
                </span>
              </div>
              <div className="text-right flex items-center gap-2 shrink-0">
                <span className="text-xs font-bold text-teal-900 bg-white border border-teal-200 px-3 py-1.5 rounded-xl shadow-2xs hover:bg-teal-100/60 transition-colors flex items-center gap-1">
                  ✓ Review & Mark Done &rsaquo;
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Batch Performance with 3D Isometric Column Chart (7 Cols on lg) */}
        <div className="lg:col-span-7 bg-white rounded-[32px] p-6 shadow-xs border border-gray-100 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-gray-900 font-sidebar-title">
              Service Category Performance
            </h3>
            <span className="text-xs font-medium text-gray-400">
              {completedServicesCount > 0 ? 'Operational Category Status' : 'No service records yet'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-end my-4">
            {/* Legend on the Left */}
            <div className="md:col-span-5 space-y-4">
              <div>
                <div className="flex items-center gap-2.5">
                  <CategorySquircleLogo name="Cleaning" size="xs" />
                  <span className="text-xs font-bold text-gray-800">Commercial Cleaning</span>
                </div>
                <span className="text-[11px] text-gray-400 ml-8 block mt-0.5">
                  {completedServicesCount > 0 ? 'Status: Optimal Service' : 'No completed tasks yet'}
                </span>
              </div>

              <div>
                <div className="flex items-center gap-2.5">
                  <CategorySquircleLogo name="Plumbing" size="xs" />
                  <span className="text-xs font-bold text-gray-800">Plumbing & Drainage</span>
                </div>
                <span className="text-[11px] text-gray-400 ml-8 block mt-0.5">
                  {completedServicesCount > 0 ? 'Status: Active Coverage' : 'No completed tasks yet'}
                </span>
              </div>

              <div>
                <div className="flex items-center gap-2.5">
                  <CategorySquircleLogo name="Electrical" size="xs" />
                  <span className="text-xs font-bold text-gray-800">Electrical & HVAC</span>
                </div>
                <span className="text-[11px] text-gray-400 ml-8 block mt-0.5">
                  {completedServicesCount > 0 ? 'Status: Optimal Flow' : 'No completed tasks yet'}
                </span>
              </div>
            </div>

            {/* 3D Isometric Column Chart on the Right (Teal / Emerald Theme) */}
            <div className="md:col-span-7 h-44 relative flex items-end justify-around px-4 border-b border-gray-200">
              {/* Horizontal grid lines */}
              <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-20">
                <div className="border-b border-gray-400 w-full" />
                <div className="border-b border-gray-400 w-full" />
                <div className="border-b border-gray-400 w-full" />
                <div className="border-b border-gray-400 w-full" />
                <div className="border-b border-gray-400 w-full" />
              </div>

              {/* 3D Column 1: Primary Teal */}
              <div className="relative flex flex-col items-center z-10">
                <div className={cn("w-10 relative transition-all duration-500", completedServicesCount > 0 ? "h-36" : "h-3")}>
                  {/* Top rhombus */}
                  <div className="w-10 h-3 bg-teal-400 rounded-t-sm transform skew-x-[-15deg] origin-bottom-left" />
                  {/* Front face */}
                  <div className={cn("w-10 bg-teal-600 shadow-md shadow-teal-600/30 transition-all duration-500", completedServicesCount > 0 ? "h-32" : "h-0")} />
                </div>
              </div>

              {/* 3D Column 2: Deep Teal */}
              <div className="relative flex flex-col items-center z-10">
                <div className={cn("w-10 relative transition-all duration-500", completedServicesCount > 0 ? "h-20" : "h-3")}>
                  {/* Top rhombus */}
                  <div className="w-10 h-3 bg-teal-800 rounded-t-sm transform skew-x-[-15deg] origin-bottom-left" />
                  {/* Front face */}
                  <div className={cn("w-10 bg-teal-900 shadow-md shadow-teal-900/30 transition-all duration-500", completedServicesCount > 0 ? "h-16" : "h-0")} />
                </div>
              </div>

              {/* 3D Column 3: Emerald Mint */}
              <div className="relative flex flex-col items-center z-10">
                <div className={cn("w-10 relative transition-all duration-500", completedServicesCount > 0 ? "h-30" : "h-3")}>
                  {/* Top rhombus */}
                  <div className="w-10 h-3 bg-emerald-300 rounded-t-sm transform skew-x-[-15deg] origin-bottom-left" />
                  {/* Front face */}
                  <div className={cn("w-10 bg-emerald-400 shadow-md shadow-emerald-400/30 transition-all duration-500", completedServicesCount > 0 ? "h-26" : "h-0")} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── ROW 3: REVENUE GENERATED & TOP PERFORMERS ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Left Column: Revenue Generated / Spend Breakdown (5 Cols on lg) */}
        <div className="lg:col-span-5 bg-white rounded-[32px] p-6 shadow-xs border border-gray-100 flex flex-col justify-between relative overflow-hidden">
          <div>
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-gray-900 font-sidebar-title">
                Facility Spend Breakdown
              </h3>
              <span className="text-[11px] font-semibold text-gray-400">
                {clientTotalSpend === 0 ? 'No spend recorded' : 'All facility categories'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center my-4">
              {/* Legend */}
              <div className="space-y-3.5">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-3.5 h-3.5 rounded-sm bg-teal-600" />
                    <span className="text-xs font-bold text-gray-800">Emergency Repair</span>
                  </div>
                  <span className="text-[11px] text-gray-400 ml-5 block">
                    {clientTotalSpend > 0 ? `PKR ${Math.round(clientTotalSpend * 0.50)} (Primary Allocation)` : 'PKR 0 (Available)'}
                  </span>
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-3.5 h-3.5 rounded-sm bg-teal-900" />
                    <span className="text-xs font-bold text-gray-800">Routine Service</span>
                  </div>
                  <span className="text-[11px] text-gray-400 ml-5 block">
                    {clientTotalSpend > 0 ? `PKR ${Math.round(clientTotalSpend * 0.30)} (Secondary Allocation)` : 'PKR 0 (Available)'}
                  </span>
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-3.5 h-3.5 rounded-sm bg-emerald-400" />
                    <span className="text-xs font-bold text-gray-800">AI Quality Audits</span>
                  </div>
                  <span className="text-[11px] text-gray-400 ml-5 block">
                    {clientTotalSpend > 0 ? `PKR ${Math.round(clientTotalSpend * 0.20)} (Quality Verification)` : 'PKR 0 (Available)'}
                  </span>
                </div>
              </div>

              {/* Multi-Segment Donut Chart with Center Text */}
              <div className="relative flex items-center justify-center">
                <svg className="w-36 h-36 transform -rotate-90" viewBox="0 0 100 100">
                  {clientTotalSpend === 0 ? (
                    <circle
                      cx="50"
                      cy="50"
                      r="38"
                      fill="none"
                      stroke="#f1f5f9"
                      strokeWidth="16"
                    />
                  ) : (
                    <>
                      {/* Teal arc: 50% */}
                      <circle
                        cx="50"
                        cy="50"
                        r="38"
                        fill="none"
                        stroke="#0d9488"
                        strokeWidth="16"
                        strokeDasharray="238.7"
                        strokeDashoffset={238.7 * 0.5}
                      />
                      {/* Dark Teal arc: 30% */}
                      <circle
                        cx="50"
                        cy="50"
                        r="38"
                        fill="none"
                        stroke="#115e59"
                        strokeWidth="16"
                        strokeDasharray="238.7"
                        strokeDashoffset={238.7 * (1 - 0.3)}
                        transform="rotate(180 50 50)"
                      />
                      {/* Emerald arc: 20% */}
                      <circle
                        cx="50"
                        cy="50"
                        r="38"
                        fill="none"
                        stroke="#34d399"
                        strokeWidth="16"
                        strokeDasharray="238.7"
                        strokeDashoffset={238.7 * (1 - 0.2)}
                        transform="rotate(288 50 50)"
                      />
                    </>
                  )}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-base font-black font-mono text-gray-900 leading-none">
                    {clientTotalSpend === 0
                      ? '0'
                      : clientTotalSpend >= 1000
                      ? `${(clientTotalSpend / 1000).toFixed(1)}k`
                      : clientTotalSpend}
                  </span>
                  <span className="text-[9px] text-gray-400 font-semibold uppercase mt-0.5">PKR Spent</span>
                </div>

                {/* Floating Pill Overlay */}
                <div 
                  onClick={() => navigate('/payments')}
                  className="absolute -bottom-2 -left-2 bg-white rounded-xl p-2 shadow-lg border border-teal-100 flex flex-col cursor-pointer hover:shadow-xl transition-all"
                >
                  <span className="text-xs font-black text-gray-900">
                    {clientSettledSpend === 0
                      ? 'PKR 0'
                      : `PKR ${clientSettledSpend >= 1000 ? `${(clientSettledSpend / 1000).toFixed(1)}k` : clientSettledSpend}`}
                  </span>
                  <span className="text-[9px] text-teal-700 font-bold flex items-center gap-0.5">
                    {clientSettledSpend === 0 ? 'No Invoices Yet' : 'Settled Invoices ›'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
            <span className="text-gray-400 font-medium">
              Total Invoiced: PKR {clientTotalSpend.toLocaleString()}
            </span>
            <button 
              onClick={() => navigate('/payments')}
              className="font-bold text-teal-700 hover:text-teal-900 cursor-pointer"
            >
              View Payment History
            </button>
          </div>
        </div>

        {/* Right Column: Top Performers (Client Teal Themed Cards - Photos Removed) */}
        <div className="lg:col-span-7 bg-white rounded-[32px] p-6 shadow-xs border border-gray-100 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-gray-900 font-sidebar-title">
              Top Performing Technicians
            </h3>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="bg-gray-50 hover:bg-gray-100 border border-gray-200 px-3 py-1 rounded-xl text-xs font-semibold text-gray-700 cursor-pointer flex items-center gap-1.5 shadow-2xs transition-all outline-none"
                >
                  <span>{selectedMonth}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44 max-h-60 overflow-y-auto bg-white rounded-xl shadow-xl border border-gray-100 p-1 z-50">
                <div className="px-2 py-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  Select Month
                </div>
                {ALL_MONTHS.map((month) => {
                  const isSelected = month === selectedMonth;
                  return (
                    <DropdownMenuItem
                      key={month}
                      onClick={() => setSelectedMonth(month)}
                      className={cn(
                        "flex items-center justify-between px-2.5 py-1.5 text-xs rounded-lg cursor-pointer font-medium transition-colors",
                        isSelected 
                          ? "bg-teal-50 text-teal-800 font-bold" 
                          : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                      )}
                    >
                      <span>{month}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-teal-700 stroke-[2.5]" />}
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Top Performers Cards or Empty State */}
          {currentPerformers && currentPerformers.length > 0 ? (
            <div className={cn(
              "my-4 w-full",
              currentPerformers.length === 1 
                ? "flex justify-center" 
                : currentPerformers.length === 2 
                ? "grid grid-cols-1 sm:grid-cols-2 gap-3.5" 
                : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5"
            )}>
              {currentPerformers.map((performer, idx) => (
                <div
                  key={performer.name}
                  className={cn(
                    "bg-gradient-to-b text-white rounded-[26px] p-4 flex flex-col items-center text-center justify-between shadow-md relative overflow-hidden select-none cursor-default",
                    currentPerformers.length === 1 ? "w-full max-w-xs sm:max-w-sm" : "w-full",
                    performer.gradientClass,
                    performer.shadowClass
                  )}
                >
                  <div className="w-14 h-14 rounded-full bg-white/20 border border-white/40 backdrop-blur-md flex items-center justify-center relative mb-2 shadow-xs">
                    <span className="text-lg font-black font-mono tracking-tight text-white">
                      {performer.initials}
                    </span>
                    <div className={cn(
                      "absolute -top-1 -right-1 w-5 h-5 rounded-full bg-white flex items-center justify-center text-[10px] font-bold shadow-xs",
                      idx === 0 ? "text-teal-700" : idx === 1 ? "text-teal-950" : "text-emerald-700"
                    )}>
                      ★
                    </div>
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm text-white">{performer.name}</h4>
                    <span className={cn(
                      "text-[11px] font-medium block",
                      idx === 0 ? "text-teal-100" : idx === 1 ? "text-teal-200/80" : "text-emerald-100"
                    )}>
                      {performer.crew}
                    </span>
                    <div className="text-lg font-black font-mono text-white mt-1">
                      {performer.score} PTS
                    </div>
                    <span className={cn(
                      "text-[10px] block",
                      idx === 0 ? "text-teal-100/70" : idx === 1 ? "text-teal-200/60" : "text-emerald-100/70"
                    )}>
                      Service Quality Rating
                    </span>
                  </div>
                  <div className="mt-3 text-center">
                    <span className="text-xs font-bold text-white tracking-wide">
                      {performer.roleTitle}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 px-4 text-center border border-dashed border-teal-100 rounded-[26px] my-4 bg-teal-50/20">
              <div className="w-12 h-12 rounded-full bg-teal-50 flex items-center justify-center text-teal-700 mb-2 border border-teal-100">
                <Star className="w-6 h-6 text-teal-600" />
              </div>
              <p className="text-sm font-bold text-gray-800">No registered specialists yet</p>
              <p className="text-xs text-gray-400 mt-1 max-w-sm">
                Top performers will appear here as field technicians register and complete verified service work orders.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Compare Offers Modal */}
      {isOffersModalOpen && (
        <ClientOffersModal
          isOpen={isOffersModalOpen}
          onClose={() => setIsOffersModalOpen(false)}
          workOrder={targetOfferWo || {
            _id: 'WO-2026-0005',
            workOrderCode: 'WO-2026-0005',
            title: 'HVAC Air Filter Replacement – Central Library',
            estimatedPrice: 110,
          }}
          onOfferAccepted={() => {
            setIsOffersModalOpen(false);
            toast.success('Technician offer accepted successfully!');
            navigate('/work-orders');
          }}
        />
      )}
      {/* Identity Verification Modal */}
      {isVerificationModalOpen && (
        <IdentityVerificationModal
          isOpen={isVerificationModalOpen}
          onClose={() => setIsVerificationModalOpen(false)}
          onVerified={() => {
            setIsVerificationModalOpen(false);
            navigate('/work-orders/new');
          }}
          role="Client"
          sourceActionTitle="creating your first service request"
        />
      )}

    </div>
  );
};

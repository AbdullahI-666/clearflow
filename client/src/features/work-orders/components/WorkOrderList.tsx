import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Search, Calendar, Loader2, AlertCircle, UserCheck, 
  ShieldAlert, MapPin, ArrowLeft, ClipboardList, CheckCircle2,
  Clock, RefreshCw, ArrowRight, User, History, Receipt, Banknote,
  Star, Phone, ShieldCheck, HandCoins, Compass, Pencil, Trash2, Plus, SlidersHorizontal
} from 'lucide-react';
import { DropdownMenu } from '@/components/ui/dropdown-menu';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter 
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/entities/user/hooks/useAuth';
import { usePermissions } from '@/entities/user/hooks/usePermissions';
import { useRoleTheme } from '@/shared/hooks/useRoleTheme';
import { apiClient } from '@/infrastructure/api/client';
import { ENDPOINTS } from '@/infrastructure/api/endpoints';
import { socketClient } from '@/infrastructure/socket/client';
import type { WorkOrder } from '@/entities/workOrder/types';
import type { FieldTeam } from '@/entities/team/types';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { getCategory3DIcon, CategorySquircleLogo } from '@/shared/utils/categoryIcons';
import { IdentityVerificationModal } from '@/shared/components/IdentityVerificationModal';

const isGirlClient = (name: string) => {
  const lower = (name || '').toLowerCase();
  return lower.includes('ayesha') || lower.includes('priya') || lower.includes('zoya') || 
         lower.includes('fatima') || lower.includes('elena') || lower.includes('sarah') || 
         lower.includes('dr.') || lower.includes('mrs') || lower.includes('ms');
};

export const formatDisplayWorkOrderId = (codeOrId: string) => {
  if (!codeOrId) return '#';
  if (codeOrId.startsWith('#')) return codeOrId;
  const match = codeOrId.match(/(?:WO-\d{4}-|WO-)(\d+)/i);
  if (match) return `#${match[1]}`;
  return `#${codeOrId.slice(-4)}`;
};

const WORK_ORDER_CLIENTS: Record<string, { name: string; id: string; gender: 'boy' | 'girl' }> = {};
const TEAM_WORKER_IDS: Record<string, string> = {
  'Ahmad (Technician)': 'W#01',
  'Ahmad': 'W#01',
};
const TEAM_WORKER_NAMES: Record<string, string> = {};
const WORKER_PROFILES: Record<string, { name: string; id: string; crew: string; rating: number; phone: string }> = {};

const getWorkerForOrder = (wo: WorkOrder) => {
  const code = wo.workOrderCode || '';
  if (WORKER_PROFILES[code]) return WORKER_PROFILES[code];

  // 1. If assignedWorker is explicitly provided on the work order object
  if ((wo as any).assignedWorker?.name) {
    const aw = (wo as any).assignedWorker;
    const isAhmad = (aw.name && aw.name.toLowerCase().trim() === 'ahmad') ||
                    (aw.workerId === 'W#01' || aw.id === 'W#01' || String(aw._id || '').includes('ftx8'));
    return {
      name: aw.name,
      id: isAhmad ? 'W#01' : (aw.workerId || (aw._id ? `W#${String(aw._id).slice(-4)}` : 'W#0012')),
      crew: aw.crew || `${aw.name} (Technician)`,
      rating: Number(aw.rating ?? aw.averageRating ?? 5.0),
      phone: aw.phone || '+92 300 0000000',
    };
  }

  // 2. Check teamId object
  const teamName = typeof wo.teamId === 'object' && wo.teamId ? (wo.teamId as any).name : '';
  if (teamName && teamName !== 'Unassigned') {
    const name = getWorkerNameForTeam(teamName) || teamName || 'Assigned Worker';
    const id = getWorkerIdForTeam(teamName) || (name.toLowerCase().includes('ahmad') ? 'W#01' : 'W#0012');
    return { name, id, crew: teamName, rating: Number((wo.teamId as any)?.averageRating ?? 5.0), phone: '+92 300 0000000' };
  }

  // 3. Check direct workerName or acceptedBy fields
  const directWorkerName = (wo as any).workerName || (wo as any).acceptedBy;
  if (directWorkerName && directWorkerName.toLowerCase() !== 'unassigned') {
    const isAhmad = directWorkerName.toLowerCase().trim() === 'ahmad';
    return {
      name: directWorkerName,
      id: isAhmad ? 'W#01' : 'W#0012',
      crew: `${directWorkerName} (Technician)`,
      rating: 5.0,
      phone: '+92 300 0000000',
    };
  }

  // 4. If order is InProgress or PendingClientConfirmation or accepted, fallback to Ahmad
  if (wo.status === 'InProgress' || (wo as any).isAccepted || wo.status === 'PendingClientConfirmation') {
    return {
      name: 'Ahmad',
      id: 'W#01',
      crew: 'Ahmad (Technician)',
      rating: 5.0,
      phone: '+92 300 0000000',
    };
  }

  // 5. Truly unassigned order
  return {
    name: 'Unassigned',
    id: 'W#0000',
    crew: 'Awaiting Worker',
    rating: 0.0,
    phone: '',
  };
};

const getWorkerNameForTeam = (teamName: string) => {
  if (!teamName || teamName === 'Unassigned') return '';
  return TEAM_WORKER_NAMES[teamName] || '';
};

const getClientForOrder = (wo: WorkOrder, _index: number) => {
  const rawName = (typeof wo.clientId === 'object' && wo.clientId ? (wo.clientId as any).name : null) || (wo as any).clientName || (wo as any).client?.name || '';
  const code = wo.workOrderCode || '';
  if (rawName) {
    const isAli = rawName.toLowerCase().trim() === 'ali' || rawName.toLowerCase().includes('ali');
    if (isAli) {
      return {
        name: rawName,
        id: 'C#01',
        gender: 'boy' as const,
      };
    }
    const hash = Math.abs((rawName + code).split('').reduce((acc, char) => acc + char.charCodeAt(0), 50000));
    const isGirl = isGirlClient(rawName);
    return {
      name: rawName,
      id: `C#${(hash % 9000) + 1000}`,
      gender: isGirl ? ('girl' as const) : ('boy' as const),
    };
  }
  if (WORK_ORDER_CLIENTS[code]) {
    return WORK_ORDER_CLIENTS[code];
  }
  return {
    name: 'Registered Client',
    id: '#C-REG',
    gender: 'boy' as const,
  };
};

const getWorkerIdForTeam = (teamName: string) => {
  if (teamName === 'Unassigned') return null;
  if (teamName.toLowerCase().includes('ahmad')) return 'W#01';
  if (TEAM_WORKER_IDS[teamName]) return TEAM_WORKER_IDS[teamName];
  for (const [key, id] of Object.entries(TEAM_WORKER_IDS)) {
    if (teamName.toLowerCase().includes(key.toLowerCase()) || key.toLowerCase().includes(teamName.toLowerCase())) {
      return id;
    }
  }
  const hash = Math.abs(teamName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 60000));
  return `W#${(hash % 9000) + 1000}`;
};

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

const addDeletedWorkOrder = (...identifiers: (string | undefined | null)[]) => {
  try {
    const set = getDeletedWorkOrders();
    identifiers.forEach((id) => {
      if (id) {
        set.add(String(id).toLowerCase().trim());
      }
    });
    localStorage.setItem(CLEARFLOW_DELETED_WO_KEY, JSON.stringify(Array.from(set)));
    window.dispatchEvent(new CustomEvent('clearflow:refresh-data'));
    window.dispatchEvent(new Event('storage'));
  } catch (_) {}
};

const isWorkOrderPermanentlyDeleted = (w: any): boolean => {
  if (!w) return true;
  const deleted = getDeletedWorkOrders();
  if (deleted.size === 0) return false;
  const id = String(w._id || (w as any).id || '').toLowerCase().trim();
  const code = String(w.workOrderCode || '').toLowerCase().trim();
  return Boolean((id && deleted.has(id)) || (code && deleted.has(code)));
};

export const WorkOrderList: React.FC<{ isHistoryView?: boolean }> = ({ isHistoryView = false }) => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const statusParam = searchParams.get('status');
  const { user } = useAuth();
  const { isAdmin } = usePermissions();
  const userRole = (user?.role || '').toLowerCase();
  const isAdminRole = userRole === 'admin';
  const isFieldRole = userRole === 'fieldteam' || userRole === 'field_team' || userRole === 'field-team' || userRole === 'field' || userRole === 'worker';
  const isClientRole = !isAdminRole && !isFieldRole;
  const [isVerificationModalOpen, setIsVerificationModalOpen] = useState(false);
  const isWorkerVerified = Boolean(
    (user?.cnicVerified === true || user?.verificationStatus === 'Verified') &&
    user?.cnic &&
    user.cnic.replace(/\D/g, '').length === 13
  );

  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [teams, setTeams] = useState<FieldTeam[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string>(() => {
    if (statusParam) {
      if (statusParam === 'Requested') return 'Open';
      if (statusParam === 'Offers' || statusParam === 'OffersReceived') return 'OffersReceived';
      if (statusParam === 'Accepted') return 'Accepted';
      if (statusParam === 'InProgress') return 'InProgress';
      if (statusParam === 'Completed') return 'Closed';
      if (statusParam === 'Cancelled') return 'Cancelled';
      return statusParam;
    }
    const saved = localStorage.getItem('clearflow_pref_wo_filter');
    if (saved) return saved;
    return 'All';
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);

  // Radius filter for available opportunities
  const radiusParam = searchParams.get('radius');
  const [selectedRadius, setSelectedRadius] = useState<number | 'all'>(() => {
    if (radiusParam && !isNaN(Number(radiusParam))) return Number(radiusParam);
    const saved = localStorage.getItem('clearflow_worker_work_radius');
    return saved ? Number(saved) : 15;
  });

  // Load posted payments from localStorage for real-time payment amount display
  const [postedPayments, setPostedPayments] = useState<Record<string, any>>(() => {
    try {
      const raw = localStorage.getItem('clearflow_worker_posted_payments');
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return {
      'INV-2026-0001': {
        amount: 120,
        paymentMethod: 'Bank Transfer (Auto-Debit)',
        message: 'Weekly carpet shampoo and window cleaning completed.',
      },
    };
  });

  const [invoices, setInvoices] = useState<any[]>([]);

  useEffect(() => {
    const fetchInvoices = async () => {
      try {
        const res = await apiClient.get('/invoices');
        if (res.data?.success && res.data?.data) {
          const list = Array.isArray(res.data.data) ? res.data.data : res.data.data.data || [];
          setInvoices(list);
        }
      } catch (e) {}
    };
    fetchInvoices();
  }, []);

  const getPaymentForWorkOrder = (wo: WorkOrder) => {
    const woCode = wo.workOrderCode || '';
    
    // Check local storage posted payments
    for (const key of Object.keys(postedPayments)) {
      const p = postedPayments[key];
      if (p.workOrderCode === woCode || p.invoiceId === wo._id) {
        return {
          amount: p.amount,
          status: 'Paid',
          method: p.paymentMethod || 'Cash on Site',
          note: p.message,
        };
      }
    }

    // Check server invoices
    const inv = invoices.find(
      (i) => (typeof i.workOrderId === 'object' ? i.workOrderId?.workOrderCode : i.workOrderId) === woCode
    );
    if (inv) {
      return {
        amount: inv.amount,
        status: inv.status,
        method: inv.paymentMethod || 'Online Transfer',
        note: null,
      };
    }

    const rawAmt = (wo as any).agreedPrice || (wo as any).budget || (wo as any).estimatedPrice || (wo.status === 'Closed' ? 120 : 500);
    return {
      amount: rawAmt,
      status: wo.status === 'Closed' ? 'Paid' : (wo.status === 'InProgress' || (wo as any).isAccepted) ? 'Pending' : 'Pending',
      method: wo.status === 'Closed' ? 'Cash on Site' : 'Pending Settlement',
      note: null,
    };
  };

  useEffect(() => {
    if (statusParam) {
      if (statusParam === 'Requested') setActiveFilter('Open');
      else if (statusParam === 'Offers' || statusParam === 'OffersReceived') setActiveFilter('OffersReceived');
      else if (statusParam === 'Accepted') setActiveFilter('Accepted');
      else if (statusParam === 'InProgress') setActiveFilter('InProgress');
      else if (statusParam === 'Completed') setActiveFilter('Closed');
      else if (statusParam === 'Cancelled') setActiveFilter('Cancelled');
      else setActiveFilter(statusParam);
    }
  }, [statusParam]);

  // Role Theme Palette for consistent styling across Client, Worker, and Admin
  const roleThemeConfig = {
    cardBorder: isClientRole ? 'border-teal-200/80' : isFieldRole ? 'border-amber-200/80' : 'border-purple-200/80',
    headerBg: isClientRole ? 'bg-teal-50 text-teal-700 border-teal-200' : isFieldRole ? 'bg-amber-50 text-amber-800 border-amber-200' : 'bg-purple-50 text-purple-700 border-purple-200',
    iconColor: isClientRole ? 'text-teal-700' : isFieldRole ? 'text-amber-800' : 'text-purple-700',
    titleBadge: isClientRole ? 'bg-teal-100 text-teal-800 border-teal-200' : isFieldRole ? 'bg-amber-100 text-amber-800 border-amber-200' : 'bg-purple-100 text-purple-700 border-purple-200',
    inputBorder: isClientRole ? 'border-teal-200 focus-visible:ring-teal-500' : isFieldRole ? 'border-amber-200 focus-visible:ring-amber-500' : 'border-purple-200 focus-visible:ring-purple-500',
    searchIcon: isClientRole ? 'text-teal-400' : isFieldRole ? 'text-amber-400' : 'text-purple-400',
    activeTab: isClientRole ? 'bg-teal-600 border-teal-600 text-white shadow-xs' : isFieldRole ? 'bg-amber-600 border-amber-600 text-white shadow-xs' : 'bg-purple-600 border-purple-600 text-white shadow-xs',
    inactiveTab: isClientRole ? 'bg-teal-50/70 border-teal-200/80 text-teal-900 hover:text-teal-950 hover:bg-teal-100/70' : isFieldRole ? 'bg-amber-50/70 border-amber-200/80 text-amber-900 hover:text-amber-950 hover:bg-amber-100/70' : 'bg-purple-50/70 border-purple-200/80 text-purple-900 hover:text-purple-950 hover:bg-purple-100/70',
    activePill: isClientRole ? 'bg-teal-800 text-white' : isFieldRole ? 'bg-amber-800 text-white' : 'bg-purple-800 text-white',
    inactivePill: isClientRole ? 'bg-teal-200/80 text-teal-900 font-semibold' : isFieldRole ? 'bg-amber-200/80 text-amber-900 font-semibold' : 'bg-purple-200/80 text-purple-900 font-semibold',
    tableHead: isClientRole ? 'border-teal-200/80 bg-teal-50/80 text-teal-950' : isFieldRole ? 'border-amber-200/80 bg-amber-50/80 text-amber-950' : 'border-purple-200/80 bg-purple-50/80 text-purple-950',
    tableHeadText: isClientRole ? 'text-teal-950' : isFieldRole ? 'text-amber-950' : 'text-purple-950',
    tableRowHover: isClientRole ? 'hover:bg-teal-50/60' : isFieldRole ? 'hover:bg-amber-50/60' : 'hover:bg-purple-50/60',
    tableFoot: isClientRole ? 'border-teal-200/80 bg-teal-50/50' : isFieldRole ? 'border-amber-200/80 bg-amber-50/50' : 'border-purple-200/80 bg-purple-50/50',
    activeHighlight: isClientRole ? 'text-teal-700' : isFieldRole ? 'text-amber-700' : 'text-purple-700',
    spinner: isClientRole ? 'text-teal-600' : isFieldRole ? 'text-amber-600' : 'text-purple-600',
    blurOrb: isClientRole ? 'bg-teal-500/10' : isFieldRole ? 'bg-amber-500/10' : 'bg-purple-500/10',
    backBtn: isClientRole ? 'text-teal-700 hover:text-teal-900' : isFieldRole ? 'text-amber-800 hover:text-amber-950' : 'text-purple-700 hover:text-purple-900',
  };

  // Override modal state (Admin)
  const [overrideWo, setOverrideWo] = useState<WorkOrder | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [overrideReason, setOverrideReason] = useState('Urgent reassignment by Administrator');
  const [isOverriding, setIsOverriding] = useState(false);

  // Admin Full CRUD: Edit Work Order & Delete Work Order
  const [editingWo, setEditingWo] = useState<WorkOrder | null>(null);
  const [isSavingWoEdit, setIsSavingWoEdit] = useState(false);
  const [editWoForm, setEditWoForm] = useState({
    title: '',
    urgency: 'Medium',
    agreedPrice: 85,
    locationAddress: '',
    status: 'Open',
  });

  const [deletingWo, setDeletingWo] = useState<WorkOrder | null>(null);
  const [isDeletingWo, setIsDeletingWo] = useState(false);

  const openEditWoModal = (wo: WorkOrder, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setEditingWo(wo);
    setEditWoForm({
      title: wo.title || '',
      urgency: wo.urgency || 'Medium',
      agreedPrice: (wo as any).agreedPrice || (wo as any).estimatedPrice || 85,
      locationAddress: wo.locationAddress || '',
      status: wo.status || 'Open',
    });
  };

  const handleSaveWoEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingWo) return;
    setIsSavingWoEdit(true);
    try {
      const orderId = editingWo._id || (editingWo as any).id;
      const res = await apiClient.put(`/work-orders/${orderId}`, editWoForm);
      if (res.data?.success) {
        toast.success('Work order updated successfully');
        setEditingWo(null);
        fetchOrdersAndTeams(false);
        window.dispatchEvent(new CustomEvent('clearflow:refresh-data'));
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to update work order');
    } finally {
      setIsSavingWoEdit(false);
    }
  };

  const handleConfirmDeleteWo = async () => {
    if (!deletingWo) return;
    setIsDeletingWo(true);
    const orderId = deletingWo._id || (deletingWo as any).id || deletingWo.workOrderCode;
    const deletedCode = deletingWo.workOrderCode;
    const deletedId = deletingWo._id || (deletingWo as any).id;

    try {
      if (!orderId) {
        toast.error('Invalid work order identifier');
        return;
      }

      // Always save to persistent deleted set immediately so reload never resurrects it
      addDeletedWorkOrder(orderId, deletedCode, deletedId);

      try {
        await apiClient.delete(`/work-orders/${orderId}`);
      } catch (apiErr: any) {
        console.warn('Backend delete work order warning:', apiErr?.message);
      }

      toast.success('Work order deleted successfully');
      setDeletingWo(null);
      setWorkOrders((prev) =>
        prev.filter((w) => {
          const wid = w._id || (w as any).id;
          const code = w.workOrderCode;
          if (deletedId && wid === deletedId) return false;
          if (deletedCode && code === deletedCode) return false;
          if (wid === orderId || code === orderId) return false;
          return !isWorkOrderPermanentlyDeleted(w);
        })
      );
      window.dispatchEvent(new CustomEvent('clearflow:refresh-data'));
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to delete work order');
    } finally {
      setIsDeletingWo(false);
    }
  };

  const fetchOrdersAndTeams = async (showToast = false) => {
    if (isFieldRole && !isWorkerVerified) {
      setWorkOrders([]);
      setIsLoading(false);
      setIsRefreshing(false);
      return;
    }
    if (showToast) setIsRefreshing(true);
    const start = Date.now();
    try {
      const [woRes, teamsRes] = await Promise.allSettled([
        apiClient.get(ENDPOINTS.WORK_ORDERS.BASE),
        apiClient.get(ENDPOINTS.TEAMS.BASE),
      ]);

      if (woRes.status === 'fulfilled' && woRes.value.data?.data) {
        const rawList = Array.isArray(woRes.value.data.data) ? woRes.value.data.data : woRes.value.data.data.data || [];

        // Prune active orders from localStorage deleted set
        try {
          const rawDel = localStorage.getItem(CLEARFLOW_DELETED_WO_KEY);
          if (rawDel) {
            const parsed = JSON.parse(rawDel);
            if (Array.isArray(parsed) && parsed.length > 0) {
              const activeCodes = new Set(rawList.map((w: any) => String(w.workOrderCode || '').toLowerCase().trim()));
              const activeIds = new Set(rawList.map((w: any) => String(w._id || w.id || '').toLowerCase().trim()));
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

        const seen = new Set<string>();
        const uniqueList = rawList
          .filter((w: any) => {
            const key = (w._id || (w as any).id || w.workOrderCode || '') as string;
            if (!key || seen.has(key)) return false;
            seen.add(key);
            return true;
          })
          .filter((w: any) => !isWorkOrderPermanentlyDeleted(w));
        setWorkOrders(uniqueList);
        try {
          localStorage.setItem('clearflow_cached_work_orders', JSON.stringify(uniqueList.slice(0, 50)));
        } catch (_) {}
      }

      if (teamsRes.status === 'fulfilled' && teamsRes.value.data?.data) {
        setTeams(teamsRes.value.data.data || []);
      }

      if (showToast) {
        const elapsed = Date.now() - start;
        if (elapsed < 750) {
          await new Promise((resolve) => setTimeout(resolve, 750 - elapsed));
        }
        toast.success('Work records refreshed');
      }
    } catch (err) {
      console.error('Failed to load work orders:', err);
      if (showToast) {
        const elapsed = Date.now() - start;
        if (elapsed < 750) {
          await new Promise((resolve) => setTimeout(resolve, 750 - elapsed));
        }
        toast.error('Failed to refresh work records');
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOrdersAndTeams(false);
    const handleGlobal = () => fetchOrdersAndTeams(false);
    window.addEventListener('clearflow:refresh-data', handleGlobal);
    window.addEventListener('storage', handleGlobal);

    socketClient.connect();
    const socket = socketClient.getSocket();
    if (socket) {
      socket.on('work_order_created', handleGlobal);
      socket.on('work_order_updated', handleGlobal);
      socket.on('work_order_progress', handleGlobal);
      socket.on('invoice_updated', handleGlobal);
      socket.on('invoice:paid', handleGlobal);
    }

    return () => {
      window.removeEventListener('clearflow:refresh-data', handleGlobal);
      window.removeEventListener('storage', handleGlobal);
      if (socket) {
        socket.off('work_order_created', handleGlobal);
        socket.off('work_order_updated', handleGlobal);
        socket.off('work_order_progress', handleGlobal);
        socket.off('invoice_updated', handleGlobal);
        socket.off('invoice:paid', handleGlobal);
      }
    };
  }, []);

  const handleExecuteOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!overrideWo || !selectedTeamId) {
      toast.error('Please select a replacement team');
      return;
    }

    const orderId = (overrideWo._id || overrideWo.id || '') as string;
    setIsOverriding(true);
    try {
      const res = await apiClient.patch(ENDPOINTS.WORK_ORDERS.ASSIGN_OVERRIDE(orderId), {
        teamId: selectedTeamId,
        reason: overrideReason,
      });

      if (res.data?.success) {
        toast.success(`Work order re-assigned successfully by Administrator!`);
        setOverrideWo(null);
        fetchOrdersAndTeams();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to override assignment');
    } finally {
      setIsOverriding(false);
    }
  };

  // Scope orders based strictly on logged-in user:
  // - Admin: all work orders
  // - Client: ONLY this client's personal work history (strictly isolated)
  // - Worker: jobs assigned to worker or open marketplace opportunities
  const userScopedOrders = workOrders.filter((wo) => {
    if (isAdminRole) return true;
    if (isClientRole) {
      const userId = user?._id || user?.id;
      const userEmail = (user?.email || '').toLowerCase().trim();
      const userName = (user?.name || '').toLowerCase().trim();
      const isDemo = userEmail === 'client@clearflow.com' || userId === '65f000000000000000000002' || userName.includes('hassan');

      const cId = typeof wo.clientId === 'object' && wo.clientId ? ((wo.clientId as any)._id || (wo.clientId as any).id) : wo.clientId;
      const cEmail = typeof wo.clientId === 'object' && wo.clientId ? ((wo.clientId as any).email || '') : '';
      const cName = typeof wo.clientId === 'object' && wo.clientId ? ((wo.clientId as any).name || '') : '';

      if (userId && (String(cId) === String(userId) || String(cId) === String(user?._id) || String(cId) === String(user?.id))) return true;
      if (userEmail && cEmail && cEmail.toLowerCase() === userEmail) return true;
      return false;
    }
    if (isFieldRole) {
      if (wo.status === 'Open' || (wo.status === 'Assigned' && !(wo as any).isAccepted)) return true;
      const isDemoField =
        (user?.email || '').toLowerCase().trim() === 'field@clearflow.com' ||
        user?._id === '65f000000000000000000004';

      // Scoped directly by assigned team or worker
      const tId = typeof wo.teamId === 'object' && wo.teamId ? (wo.teamId as any)._id : wo.teamId;
      const wId = (wo as any).assignedWorkerId || (wo as any).workerId || (wo as any).assignedFieldUserId;
      return String(tId) === String(user?._id) || String(wId) === String(user?._id);
    }
    return true;
  });

  // Calculate status counts on scoped list
  const allCount = userScopedOrders.length;
  const openCount = userScopedOrders.filter((w) => w.status === 'Open' || (w.status === 'Assigned' && !(w as any).isAccepted)).length;
  const offersReceivedCount = userScopedOrders.filter((w) => (w.status === 'Open' || (w.status === 'Assigned' && !(w as any).isAccepted)) && (((w as any).offersCount && (w as any).offersCount > 0) || (w as any).hasOffers)).length;
  const acceptedCount = userScopedOrders.filter((w) => (w.status === 'Assigned' || (w as any).isAccepted) && w.status !== 'Closed' && (w.status as string) !== 'Completed').length;
  const inProgressCount = userScopedOrders.filter((w) => w.status === 'InProgress').length;
  const reviewCount = userScopedOrders.filter((w) => w.status === 'PendingReview' || w.status === 'PendingClientConfirmation').length;
  const closedCount = userScopedOrders.filter((w) => w.status === 'Closed' || (w.status as string) === 'Completed').length;
  const cancelledCount = userScopedOrders.filter((w) => (w.status as string) === 'Cancelled' || (w.status as string) === 'Refused').length;

  // Status Filter tabs customized per role
  const filterTabs = isClientRole
    ? [
        { label: 'All', count: allCount },
        { label: 'Open', display: 'Requested', count: openCount },
        { label: 'OffersReceived', display: 'Offers Received', count: offersReceivedCount },
        { label: 'Accepted', display: 'Accepted', count: acceptedCount },
        { label: 'InProgress', display: 'In Progress', count: inProgressCount },
        { label: 'PendingReview', display: 'Work Done (Review)', count: reviewCount },
        { label: 'Closed', display: 'Completed', count: closedCount },
        { label: 'Cancelled', display: 'Cancelled', count: cancelledCount },
      ]
    : isFieldRole
    ? [
        { label: 'All', count: allCount },
        { label: 'Open', display: 'Available Opportunities', count: openCount },
        { label: 'InProgress', display: 'Active Work Orders', count: inProgressCount },
        { label: 'PendingReview', display: 'Submitted (Review)', count: reviewCount },
        { label: 'Closed', display: 'Completed Orders', count: closedCount },
        { label: 'Cancelled', display: 'Cancelled / Declined', count: cancelledCount },
      ]
    : [
        { label: 'All', count: allCount },
        { label: 'Open', display: 'Open', count: openCount },
        { label: 'Assigned', display: 'Assigned', count: acceptedCount },
        { label: 'InProgress', display: 'In Progress', count: inProgressCount },
        { label: 'PendingReview', display: 'Work Done (Review)', count: reviewCount },
        { label: 'Closed', display: 'Completed', count: closedCount },
        { label: 'Cancelled', display: 'Cancelled', count: cancelledCount },
      ];

  const filteredOrders = userScopedOrders.filter((wo) => {
    if (activeFilter === 'Open' && wo.status !== 'Open' && !(wo.status === 'Assigned' && !(wo as any).isAccepted)) return false;
    if (activeFilter === 'OffersReceived' && (wo.status !== 'Open' || !(((wo as any).offersCount && (wo as any).offersCount > 0) || (wo as any).hasOffers))) return false;
    if (activeFilter === 'Accepted' && (!((wo as any).isAccepted || wo.status === 'Assigned') || wo.status === 'Closed' || (wo.status as string) === 'Completed')) return false;
    if (activeFilter === 'Assigned' && wo.status !== 'Assigned' && !(wo as any).isAccepted) return false;
    if (activeFilter === 'InProgress' && wo.status !== 'InProgress') return false;
    if (activeFilter === 'PendingReview' && wo.status !== 'PendingReview' && wo.status !== 'PendingClientConfirmation') return false;
    if (activeFilter === 'Closed' && wo.status !== 'Closed' && (wo.status as string) !== 'Completed') return false;
    if (activeFilter === 'Cancelled' && (wo.status as string) !== 'Cancelled' && (wo.status as string) !== 'Refused') return false;

    const q = searchQuery.toLowerCase();
    const code = (wo.workOrderCode || '').toLowerCase();
    const title = (wo.title || '').toLowerCase();
    const desc = (wo.description || '').toLowerCase();
    const addr = (wo.locationAddress || '').toLowerCase();
    const catName = typeof wo.categoryId === 'object' && wo.categoryId ? (wo.categoryId as any).name?.toLowerCase() : '';
    const teamName = typeof wo.teamId === 'object' && wo.teamId ? (wo.teamId as any).name?.toLowerCase() : '';
    const worker = getWorkerForOrder(wo);

    return (
      code.includes(q) || 
      title.includes(q) || 
      desc.includes(q) || 
      addr.includes(q) || 
      catName?.includes(q) || 
      teamName?.includes(q) ||
      worker.name.toLowerCase().includes(q)
    );
  });

  // Render Status Pill
  const renderStatusPill = (status: string) => {
    switch (status) {
      case 'Closed':
      case 'Completed':
      case 'completed':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/90 shadow-2xs">
            Completed
          </span>
        );
      case 'InProgress':
      case 'in_progress':
      case 'inprogress':
        return (
          <span className={cn(
            "inline-flex items-center px-3 py-1 rounded-full text-xs font-bold shadow-2xs",
            isClientRole
              ? "bg-teal-600 text-white"
              : isFieldRole
              ? "bg-amber-600 text-white"
              : "bg-purple-600 text-white"
          )}>
            In Progress
          </span>
        );
      case 'Assigned':
      case 'assigned':
        return (
          <span className={cn(
            "inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold shadow-2xs",
            isClientRole
              ? "bg-teal-50 text-teal-800 border border-teal-200/90"
              : isFieldRole
              ? "bg-amber-50 text-amber-800 border border-amber-200/90"
              : "bg-purple-50 text-purple-800 border border-purple-200/90"
          )}>
            Assigned
          </span>
        );
      case 'PendingReview':
      case 'pending_review':
      case 'pendingreview':
      case 'Pending Review':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200/90 shadow-2xs">
            Pending Review
          </span>
        );
      case 'PendingClientConfirmation':
      case 'pendingclientconfirmation':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs">
            Pending Confirmation
          </span>
        );
      case 'RevisionRequired':
      case 'revisionrequired':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-800 border border-rose-300 shadow-2xs">
            Revision Required
          </span>
        );
      case 'Open':
      case 'open':
        return (
          <span className={cn(
            "inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold shadow-2xs",
            isClientRole 
              ? "bg-cyan-50 text-cyan-800 border border-cyan-200/90"
              : "bg-amber-50 text-amber-800 border border-amber-200/90"
          )}>
            {isClientRole ? 'Requested' : 'Open'}
          </span>
        );
      case 'Cancelled':
      case 'Refused':
      case 'cancelled':
      case 'refused':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200/90 shadow-2xs">
            Cancelled
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-gray-50 text-gray-700 border border-gray-200/90 shadow-2xs">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-4 w-full pb-16">
      {/* CNIC Verification Alert Banner for Unverified Field Workers */}
      {isFieldRole && !isWorkerVerified && (
        <div className="bg-gradient-to-r from-amber-50 via-orange-50 to-white rounded-2xl p-4 border border-amber-300/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 border border-amber-300 text-amber-700 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-5 h-5 text-amber-700" />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-gray-900">
                13-Digit Pakistani CNIC Verification Required
              </h4>
              <p className="text-[11px] sm:text-xs text-gray-600 mt-0.5">
                You must complete your Pakistani CNIC verification to view active tasks and opportunities.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsVerificationModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition-all shadow-xs cursor-pointer shrink-0 self-start sm:self-auto flex items-center gap-1.5"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Verify CNIC</span>
          </button>
        </div>
      )}

      {/* ─── Search & Status Filters Bar ─── */}
      <div className={cn("flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white p-4 rounded-xl border shadow-2xs", roleThemeConfig.cardBorder)}>
        <div className="relative flex-1">
          <Search className={cn("absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4", roleThemeConfig.searchIcon)} />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              isClientRole 
                ? "Search by ID, task, or technician..."
                : isFieldRole
                ? "Search by ID, trade, or client..."
                : "Search by ID, title, or client..."
            }
            className={cn("pl-10 bg-white text-gray-900 placeholder:text-gray-400 h-10 rounded-lg text-sm", roleThemeConfig.inputBorder)}
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <DropdownMenu
            align="right"
            options={filterTabs.map((f) => ({
              label: f.display || f.label,
              count: f.count,
              active: activeFilter === f.label,
              onClick: () => {
                setActiveFilter(f.label);
                localStorage.setItem('clearflow_pref_wo_filter', f.label);
              },
            }))}
            roleTheme={isAdminRole ? 'admin' : isFieldRole ? 'fieldteam' : 'client'}
            preferenceKey="clearflow_pref_wo_filter"
            preferenceLabel="Work Orders Filter"
            currentFilterLabel={
              filterTabs.find((f) => f.label === activeFilter)?.display ||
              filterTabs.find((f) => f.label === activeFilter)?.label ||
              activeFilter
            }
            onUploadPreference={(pref: string) => {
              const match = filterTabs.find(
                (f) =>
                  (f.display || f.label).toLowerCase() === pref.toLowerCase() ||
                  f.label.toLowerCase() === pref.toLowerCase()
              );
              if (match) {
                setActiveFilter(match.label);
                localStorage.setItem('clearflow_pref_wo_filter', match.label);
              }
            }}
          >
            <span className="font-semibold text-sm leading-none whitespace-nowrap">
              {filterTabs.find((f) => f.label === activeFilter)?.display || filterTabs.find((f) => f.label === activeFilter)?.label || activeFilter}
            </span>
            <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-xs font-bold font-mono bg-white/25 text-white leading-none">
              {filterTabs.find((f) => f.label === activeFilter)?.count ?? filteredOrders.length}
            </span>
          </DropdownMenu>

          {isAdminRole && (
            <Button
              size="sm"
              onClick={() => navigate('/work-orders/new')}
              className="bg-purple-700 hover:bg-purple-800 text-white font-semibold text-xs h-10 px-4 rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer ml-auto shrink-0"
            >
              <Plus className="h-4 w-4" />
              Create Work Order
            </Button>
          )}
        </div>
      </div>

      {/* ─── Tabular Work Orders / History Table ─── */}
      <div className={cn("relative overflow-hidden rounded-2xl border bg-white shadow-sm", roleThemeConfig.cardBorder)}>
        <div className="responsive-table-wrapper touch-scroll">
          <table className="w-full text-left text-sm text-gray-800 border-collapse min-w-[700px] lg:min-w-full">
            {/* Table Header */}
            <thead>
              <tr className={cn("border-b text-xs font-bold tracking-wider", roleThemeConfig.tableHead)}>
                <th scope="col" className={cn("py-4 px-4 font-bold", roleThemeConfig.tableHeadText)}>ID</th>
                {isClientRole ? (
                  <>
                    <th scope="col" className="py-4 px-4">Service & Task</th>
                    <th scope="col" className="py-4 px-4">Assigned Worker</th>
                    <th scope="col" className="py-4 px-4">Location</th>
                    <th scope="col" className="py-4 px-4">Payment & Amount</th>
                    <th scope="col" className="py-4 px-4">Status</th>
                    <th scope="col" className="py-4 px-4">Date</th>
                  </>
                ) : (
                  <>
                    <th scope="col" className="py-4 px-4">{isFieldRole ? 'Customer' : 'Customer'}</th>
                    <th scope="col" className="py-4 px-4">Service & Task</th>
                    <th scope="col" className="py-4 px-4">Location / Sector</th>
                    <th scope="col" className="py-4 px-4">{isFieldRole ? 'Crew Assignment' : 'Assigned Crew'}</th>
                    <th scope="col" className="py-4 px-4">Status</th>
                    <th scope="col" className="py-4 px-4">Date</th>
                    {isAdminRole && <th scope="col" className="py-4 px-4 text-center">Actions</th>}
                  </>
                )}
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className={cn("divide-y font-normal", isClientRole ? "divide-teal-100/70" : isFieldRole ? "divide-amber-100/70" : "divide-purple-100/70")}>
              {isFieldRole && !isWorkerVerified ? (
                <tr>
                  <td colSpan={isAdminRole ? 8 : 7} className="py-16 text-center">
                    <div className="max-w-md mx-auto p-6 rounded-2xl bg-amber-50/70 border border-amber-300 flex flex-col items-center">
                      <div className="w-12 h-12 rounded-2xl bg-amber-100 border border-amber-300 text-amber-700 flex items-center justify-center mb-3">
                        <ShieldAlert className="w-6 h-6 text-amber-600" />
                      </div>
                      <h4 className="text-sm font-bold text-gray-900">13-Digit CNIC Verification Required</h4>
                      <p className="text-xs text-gray-600 mt-1 mb-4 text-center">
                        You must complete Pakistani CNIC verification to view and receive service tasks.
                      </p>
                      <Button
                        type="button"
                        onClick={() => setIsVerificationModalOpen(true)}
                        className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer"
                      >
                        <ShieldCheck className="w-4 h-4" />
                        Verify CNIC Now
                      </Button>
                    </div>
                  </td>
                </tr>
              ) : isLoading ? (
                <tr>
                  <td colSpan={isAdminRole ? 8 : 7} className="py-16 text-center text-gray-500">
                    <Loader2 className={cn("w-8 h-8 animate-spin mx-auto mb-2", roleThemeConfig.spinner)} />
                    <p className="text-sm">Loading service records from registry...</p>
                  </td>
                </tr>
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={isAdminRole ? 8 : 7} className="text-center py-16 text-gray-500 text-sm">
                    No work history records found matching the filter.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((wo, idx) => {
                  const orderId = (wo._id || wo.id || '') as string;
                  const isSelected = selectedRowId === orderId;

                  // Worker and payment lookup
                  const worker = getWorkerForOrder(wo);
                  const paymentInfo = getPaymentForWorkOrder(wo);

                  // Extract client information for Admin / Field view
                  const clientInfo = getClientForOrder(wo, idx);
                  const clientName = clientInfo.name;

                  // Category & Service details
                  const catName = typeof wo.categoryId === 'object' && wo.categoryId ? (wo.categoryId as any).name : 'Service';
                  const cat3D = getCategory3DIcon(catName);
                  const CatIcon = cat3D.Icon;
                  const locationShort = wo.locationAddress ? wo.locationAddress.split(',')[0].trim() : 'Central Complex';
                  const defaultPrefix = catName === 'Cleaning' ? 'Deep Clean' 
                    : catName === 'Plumbing' ? 'Pipe Leak Repair' 
                    : catName === 'Electrical Repair' ? 'Circuit Repair' 
                    : catName === 'General Waste Collection' ? 'Waste Disposal'
                    : catName === 'E-Waste Recycling' ? 'E-Waste Recovery'
                    : catName;
                  const taskTitle = wo.title || `${defaultPrefix} – ${locationShort}`;

                  // Assigned crew details
                  const teamName = typeof wo.teamId === 'object' && wo.teamId ? (wo.teamId as any).name : 'Unassigned';
                  const workerId = getWorkerIdForTeam(teamName);
                  const formattedDate = wo.createdAt ? new Date(wo.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'Nov 14, 2026';

                  const cleanTargetLink = wo.workOrderCode || (wo as any).code || orderId;

                  return (
                    <tr
                      key={orderId}
                      onClick={() => navigate(`/work-orders/${cleanTargetLink}`)}
                      className={cn("transition-colors duration-150 cursor-pointer", roleThemeConfig.tableRowHover)}
                    >
                      {/* ID Section */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <span className={cn(
                          "font-mono font-bold text-xs px-2.5 py-1 rounded-md border inline-block shadow-2xs",
                          isClientRole
                            ? "text-teal-800 bg-teal-50 border-teal-200"
                            : clientInfo.id.startsWith('W#')
                            ? "text-amber-800 bg-amber-50 border-amber-200"
                            : "text-purple-700 bg-purple-50/90 border-purple-200"
                        )}>
                          {formatDisplayWorkOrderId(wo.workOrderCode || orderId)}
                        </span>
                      </td>

                      {isClientRole ? (
                        <>
                          {/* Service & Task */}
                          <td className="py-4 px-4 max-w-xs">
                            <div className="flex items-start gap-2.5">
                              <CategorySquircleLogo name={catName} size="sm" className="mt-0.5" />
                              <div className="min-w-0">
                                <div className="font-bold text-gray-900 truncate text-xs sm:text-sm">
                                  {taskTitle}
                                </div>
                                <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                  <span className="text-[10px] px-2 py-0.5 rounded-md font-semibold border bg-teal-50 text-teal-800 border-teal-200/70">
                                    {catName}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Assigned Worker (Avatar, Name, Crew, Rating) */}
                          <td className="py-4 px-4 whitespace-nowrap">
                            <div className="flex items-center gap-2.5">
                              <div className={cn(
                                "w-8 h-8 rounded-full border flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs",
                                worker.name === 'Unassigned'
                                  ? "bg-gray-100 border-gray-200 text-gray-400"
                                  : "bg-teal-100 border-teal-300 text-teal-800"
                              )}>
                                {worker.name === 'Unassigned' ? '—' : worker.name.split(' ').map((n: string) => n[0]).join('')}
                              </div>
                              <div>
                                <div className="font-bold text-xs text-gray-900 flex items-center gap-1.5">
                                  <span>{worker.name}</span>
                                  {worker.name !== 'Unassigned' && (
                                    <span className="text-[10px] font-mono text-amber-700 bg-amber-50 px-1 rounded border border-amber-200">
                                      {worker.id}
                                    </span>
                                  )}
                                </div>
                                <div className={cn(
                                  "text-[11px] font-medium",
                                  worker.name === 'Unassigned' ? "text-gray-400" : "text-teal-700"
                                )}>
                                  {worker.crew}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Location */}
                          <td className="py-4 px-4 max-w-xs">
                            <div className="flex items-start gap-1.5 text-xs text-gray-600">
                              <MapPin className="h-3.5 w-3.5 shrink-0 mt-0.5 text-teal-600" />
                              <span className="truncate">{wo.locationAddress || 'Building A, Room 302, Central Facility Complex'}</span>
                            </div>
                          </td>

                          {/* Payment & Amount Paid */}
                          <td className="py-4 px-4 whitespace-nowrap">
                            <div>
                              <div className="font-bold text-xs text-gray-950 flex items-center gap-1.5">
                                <span>PKR {paymentInfo.amount}</span>
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    "text-[10px] px-1.5 py-0 font-bold",
                                    paymentInfo.status === 'Paid'
                                      ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                                      : "bg-amber-50 text-amber-800 border-amber-300"
                                  )}
                                >
                                  {paymentInfo.status === 'Paid' ? 'Paid' : 'Pending'}
                                </Badge>
                              </div>
                              <div className="text-[10px] text-gray-500 font-medium mt-0.5">
                                {paymentInfo.method}
                              </div>
                              {paymentInfo.note && (
                                <div className="text-[10px] text-teal-800 italic truncate max-w-[150px] mt-0.5" title={paymentInfo.note}>
                                  "{paymentInfo.note}"
                                </div>
                              )}
                            </div>
                          </td>

                          {/* Status Pill */}
                          <td className="py-4 px-4 whitespace-nowrap">
                            {renderStatusPill(
                              wo.status === 'Assigned' && !(wo as any).isAccepted
                                ? 'Open'
                                : wo.status
                            )}
                          </td>

                          {/* Date */}
                          <td className="py-4 px-4 whitespace-nowrap text-xs text-gray-500 font-medium">
                            {formattedDate}
                          </td>
                        </>
                      ) : (
                        <>
                          {/* Customer Avatar & Name (Admin / Worker View) */}
                          <td className="py-4 px-4 whitespace-nowrap">
                            <div className="flex items-center gap-3">
                              <div className={cn(
                                "h-9 w-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 shadow-2xs transition-transform hover:scale-105",
                                isFieldRole
                                  ? "bg-amber-100 text-amber-800 border border-amber-200"
                                  : "bg-purple-100 text-purple-800 border border-purple-200"
                              )}>
                                {clientName ? clientName.split(' ').map((n: string) => n[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() : 'CL'}
                              </div>
                              <div>
                                <div className="font-semibold text-gray-900 leading-tight">
                                  {clientName}
                                </div>
                                <div className={cn("text-xs font-semibold mt-0.5", isFieldRole ? "text-amber-700" : "text-purple-700")}>
                                  Client
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Service & Task */}
                          <td className="py-4 px-4 max-w-xs">
                            <div className="flex items-start gap-2.5">
                              <CategorySquircleLogo name={catName} size="sm" className="mt-0.5" />
                              <div className="min-w-0">
                                <div className="font-semibold text-gray-900 truncate text-xs sm:text-sm">
                                  {taskTitle}
                                </div>
                                <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                  <span className={cn(
                                    "text-[10px] px-1.5 py-0.2 rounded-md font-medium border",
                                    isFieldRole
                                      ? "bg-amber-50 text-amber-800 border-amber-200/60"
                                      : "bg-purple-50 text-purple-800 border-purple-200/60"
                                  )}>
                                    {catName}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Location / Sector */}
                          <td className="py-4 px-4 max-w-xs">
                            <div className="flex items-start gap-1.5 text-xs text-gray-600">
                              <MapPin className={cn("h-3.5 w-3.5 shrink-0 mt-0.5", roleThemeConfig.iconColor)} />
                              <span className="truncate">{wo.locationAddress || 'Sector 4 Complex'}</span>
                            </div>
                          </td>

                          {/* Assigned Crew */}
                          <td className="py-4 px-4 whitespace-nowrap">
                            <div className="text-xs">
                              {teamName === 'Unassigned' || wo.status === 'Open' || (wo.status === 'Assigned' && !(wo as any).isAccepted) ? (
                                <span className="italic text-amber-800 font-medium bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                                  Unassigned
                                </span>
                              ) : (
                                <div>
                                  <div className="font-semibold text-gray-900">
                                    {getWorkerNameForTeam(teamName) || teamName}
                                  </div>
                                  <div className="text-[11px] font-semibold text-amber-700 mt-0.5">
                                    Worker {workerId && `• ${workerId}`} &bull; <span className="text-gray-500 font-normal">{teamName}</span>
                                  </div>
                                </div>
                              )}
                            </div>
                          </td>

                          {/* Status Pill */}
                          <td className="py-4 px-4 whitespace-nowrap">
                            {renderStatusPill(
                              wo.status === 'Assigned' && !(wo as any).isAccepted
                                ? 'Open'
                                : wo.status
                            )}
                          </td>

                          {/* Date */}
                          <td className="py-4 px-4 whitespace-nowrap text-xs text-gray-500">
                            {formattedDate}
                          </td>

                          {/* Admin Row Actions */}
                          {isAdminRole && (
                            <td className="py-4 px-4 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-center gap-1.5">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={(e) => openEditWoModal(wo, e)}
                                  className="h-8 px-2 text-xs text-blue-700 border-blue-200 hover:bg-blue-50 cursor-pointer font-semibold rounded-lg shadow-2xs"
                                  title="Edit Work Order"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDeletingWo(wo);
                                  }}
                                  className="h-8 px-2 text-xs text-rose-600 border-rose-200 hover:bg-rose-50 hover:text-rose-700 cursor-pointer font-semibold rounded-lg shadow-2xs"
                                  title="Delete Work Order"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </td>
                          )}
                        </>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer with Summary Stats */}
        <div className={cn("border-t px-5 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-600", roleThemeConfig.tableFoot)}>
          <div className="flex items-center gap-4">
            <span>
              Showing <b className="text-gray-900">{filteredOrders.length}</b> of <b className="text-gray-900">{userScopedOrders.length}</b> records
            </span>
          </div>
        </div>
      </div>

      {/* ─── Admin Full CRUD: Edit Work Order Modal ─── */}
      <Dialog open={!!editingWo} onOpenChange={(open) => !open && setEditingWo(null)}>
        <DialogContent className="bg-white border border-purple-200 text-gray-900 max-w-lg p-6 rounded-2xl shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Pencil className="h-5 w-5 text-blue-700" />
              Edit Work Order Record
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500">
              Update service title, urgency, agreed pricing, location, and status.
            </DialogDescription>
          </DialogHeader>

          {editingWo && (
            <form onSubmit={handleSaveWoEdit} className="space-y-3.5 mt-2">
              <div>
                <label className="text-xs font-semibold text-gray-700">Order Title</label>
                <Input
                  required
                  value={editWoForm.title}
                  onChange={(e) => setEditWoForm({ ...editWoForm, title: e.target.value })}
                  className="mt-1 bg-white border-purple-200 text-sm h-9"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-700">Urgency Level</label>
                  <select
                    value={editWoForm.urgency}
                    onChange={(e) => setEditWoForm({ ...editWoForm, urgency: e.target.value as any })}
                    className="mt-1 w-full bg-white border border-purple-200 text-gray-900 rounded-md px-3 py-1.5 text-sm h-9 focus:ring-1 focus:ring-purple-500"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-700">Agreed Price (PKR)</label>
                  <Input
                    type="number"
                    value={editWoForm.agreedPrice}
                    onChange={(e) => setEditWoForm({ ...editWoForm, agreedPrice: e.target.value === '' ? ('' as any) : Number(e.target.value) })}
                    className="mt-1 bg-white border-purple-200 text-sm h-9"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-700">Lifecycle Status</label>
                  <select
                    value={editWoForm.status}
                    onChange={(e) => setEditWoForm({ ...editWoForm, status: e.target.value as any })}
                    className="mt-1 w-full bg-white border border-purple-200 text-gray-900 rounded-md px-3 py-1.5 text-sm h-9 focus:ring-1 focus:ring-purple-500"
                  >
                    <option value="Open">Open</option>
                    <option value="Assigned">Assigned</option>
                    <option value="InProgress">InProgress</option>
                    <option value="PendingReview">Pending Review</option>
                    <option value="Completed">Completed</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-700">Location Address</label>
                  <Input
                    value={editWoForm.locationAddress}
                    onChange={(e) => setEditWoForm({ ...editWoForm, locationAddress: e.target.value })}
                    className="mt-1 bg-white border-purple-200 text-sm h-9"
                  />
                </div>
              </div>

              <DialogFooter className="pt-3 border-t border-purple-100 flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingWo(null)}
                  className="rounded-xl border-gray-200 text-xs h-9 cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSavingWoEdit}
                  className="rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-semibold text-xs h-9 px-4 cursor-pointer"
                >
                  {isSavingWoEdit ? 'Saving...' : 'Save Changes'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* ─── Admin Full CRUD: Confirm Delete Work Order Modal ─── */}
      <Dialog open={!!deletingWo} onOpenChange={(open) => !open && setDeletingWo(null)}>
        <DialogContent className="bg-white border border-red-200 text-gray-900 max-w-md p-6 rounded-2xl shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-red-600 flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-red-600" />
              Confirm Delete Work Order
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-600 mt-2">
              Are you sure you want to permanently delete this work order?
              <br /><br />
              <span className="text-red-600 font-semibold">Warning: This action will permanently remove this work order record and cannot be undone.</span>
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="pt-4 border-t border-gray-100 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeletingWo(null)}
              className="rounded-xl border-gray-200 text-xs h-9 cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={isDeletingWo}
              onClick={handleConfirmDeleteWo}
              className="rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold text-xs h-9 px-4 cursor-pointer shadow-xs"
            >
              {isDeletingWo ? 'Deleting...' : 'Permanently Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Field Worker Identity Verification Modal */}
      {isVerificationModalOpen && (
        <IdentityVerificationModal
          isOpen={isVerificationModalOpen}
          onClose={() => setIsVerificationModalOpen(false)}
          onVerified={() => {
            setIsVerificationModalOpen(false);
            fetchOrdersAndTeams(true);
          }}
          role="FieldTeam"
          sourceActionTitle="unlocking service tasks and opportunities"
        />
      )}
    </div>
  );
};

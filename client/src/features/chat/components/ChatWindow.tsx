import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Send, MessageSquare, Loader2, ArrowLeft, Plus, 
  AlertTriangle, ShieldAlert, CheckCircle2, Clock, Eye, Flag, 
  RefreshCw, User, Trash2,
  MapPin, Phone, Mail, Star, ShieldCheck, Lock, RotateCcw,
  Search, X, Sparkles
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter 
} from '@/components/ui/dialog';
import { useAuth } from '@/entities/user/hooks/useAuth';
import { useRoleTheme } from '@/shared/hooks/useRoleTheme';
import { useUnreadChat } from '@/shared/hooks/useUnreadChat';
import { apiClient } from '@/infrastructure/api/client';
import { ENDPOINTS } from '@/infrastructure/api/endpoints';
import { socketClient } from '@/infrastructure/socket/client';
import type { WorkOrder } from '@/entities/workOrder/types';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { CategorySquircleLogo } from '@/shared/utils/categoryIcons';

const isGirlClient = (name: string) => {
  const lower = (name || '').toLowerCase();
  return lower.includes('ayesha') || lower.includes('priya') || lower.includes('zoya') || 
         lower.includes('fatima') || lower.includes('elena') || lower.includes('sarah') || 
         lower.includes('sara') ||
         lower.includes('dr.') || lower.includes('mrs') || lower.includes('ms');
};

export const cleanChatName = (name: string, role?: string): string => {
  if (!name) return role === 'admin' ? 'Operations Admin' : role === 'worker' ? 'Field Technician' : 'Client';
  let clean = name.replace(/\s*\([^)]*\)/g, '').trim();
  
  // Never show raw database IDs (MongoDB ObjectIds, hex hashes, or internal IDs) as human contact names
  if (/^[0-9a-fA-F]{20,}$/.test(clean) || clean.startsWith('65f') || clean.startsWith('usr_') || clean.startsWith('direct_') || /^(WO|TSK|ORD|DIR|ADM|WRK|CLI)-/i.test(clean)) {
    const r = (role || '').toLowerCase();
    if (r === 'admin') return 'Operations Admin';
    if (r === 'worker') return 'Field Technician';
    return 'Client';
  }

  // Use the name exactly as written/registered by the user
  return clean;
};

const sanitizeCustomChannels = (channels: any[]): ChatContactChannel[] => {
  if (!Array.isArray(channels)) return [];
  return channels.filter(c => {
    if (!c || typeof c !== 'object') return false;
    const n = (c.name || '').toLowerCase();
    const em = (c.email || c.crewOrAddress || '').toLowerCase();
    const id = (c.id || c.orderId || c.userId || '').toLowerCase();
    if (n.includes('malik') || n.includes('ahsan khalid') || n.includes('(client)') || n.includes('(field') || n.includes('(apple')) return false;
    if (em.includes('worker.ahsan') || em.includes('client.ahsan') || em.includes('ahsankhalid@icloud') || em.includes('field@clearflow')) return false;
    if (id.includes('65f0e22b') || id.includes('65f01ea9') || id.includes('65f07316')) return false;
    return true;
  }).map(c => ({
    ...c,
    name: cleanChatName(c.name, c.role || c.type),
  }));
};

const CHAT_ORDER_CLIENTS: Record<string, { name: string; id: string; gender: 'boy' | 'girl' }> = {};

const CHAT_ORDER_WORKERS: Record<string, { name: string; id: string; crew: string; gender: 'boy' | 'girl' }> = {};

export interface ChatContactChannel {
  id: string;
  orderCode: string;
  orderId?: string;
  userId?: string;
  type: 'client' | 'worker' | 'admin';
  name: string;
  role: 'Client' | 'Worker' | 'Admin';
  gender?: 'boy' | 'girl';
  counterpartName?: string;
  counterpartRole?: 'Client' | 'Worker' | 'Admin';
  crewOrAddress?: string;
  category?: string;
  taskTitle?: string;
  status?: string;
  complaintsCount?: number;
  email?: string;
  phone?: string;
  isDirectChat?: boolean;
}

export interface DirectoryContact {
  _id: string;
  id: string;
  userId: string;
  name: string;
  email: string;
  phone: string;
  role: 'Admin' | 'Client' | 'Worker';
  type: 'admin' | 'client' | 'worker';
  gender: 'boy' | 'girl';
  address: string;
  city: string;
  category: string;
  isPrimary?: boolean;
  isSelf?: boolean;
}

export const BASE_CLIENT_CHANNELS: ChatContactChannel[] = [];
export const BASE_WORKER_CHANNELS: ChatContactChannel[] = [];
export const BASE_ADMIN_CHANNELS: ChatContactChannel[] = [];

export const ALL_CHANNELS: ChatContactChannel[] = [];

const FALLBACK_CLIENT_LIST: any[] = [];
const FALLBACK_WORKER_LIST: any[] = [];

const getClientForChat = (wo?: WorkOrder | null, _index: number = 0) => {
  if (!wo) return { name: 'Client User', id: 'C#0000', gender: 'boy' as const };
  const rawClientName = typeof wo.clientId === 'object' && wo.clientId ? (wo.clientId as any).name : (wo.clientId || 'Client User');
  const isGirl = isGirlClient(String(rawClientName));
  const isAli = String(rawClientName).toLowerCase().includes('ali') || (wo as any).clientEmail === 'ahsankhalid8657@gmail.com' || (wo as any).clientCode === 'C#01';
  return { name: String(rawClientName), id: isAli ? 'C#01' : ((wo as any).clientCode || `C#${String(wo._id || '').slice(-4)}`), gender: isGirl ? ('girl' as const) : ('boy' as const) };
};

const getWorkerForChat = (wo?: WorkOrder | null, _index: number = 0) => {
  if (!wo) return { name: 'Field Technician', id: 'W#0000', crew: 'ClearFlow Operations', gender: 'boy' as const };
  const rawTeamName = typeof wo.teamId === 'object' && wo.teamId ? (wo.teamId as any).name : (wo.teamId || 'Field Operations');
  const isAhmad = String(rawTeamName).toLowerCase().includes('ahmad') || ((wo as any).workerName && String((wo as any).workerName).toLowerCase().includes('ahmad')) || (wo as any).workerCode === 'W#01';
  return { name: String(rawTeamName), id: isAhmad ? 'W#01' : ((wo as any).workerCode || `W#${String(wo._id || '').slice(-4)}`), crew: String(rawTeamName), gender: 'boy' as const };
};

const renderOrderStatusPill = (status: string) => {
  switch (status) {
    case 'Open':
      return (
        <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-amber-50 text-amber-700 border border-amber-300 shrink-0">
          Open
        </span>
      );
    case 'InProgress':
    case 'In Progress':
      return (
        <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-purple-50 text-purple-700 border border-purple-300 shrink-0">
          In Progress
        </span>
      );
    case 'Assigned':
      return (
        <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-blue-50 text-blue-700 border border-blue-300 shrink-0">
          Assigned
        </span>
      );
    case 'PendingReview':
    case 'Pending Review':
      return (
        <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-indigo-50 text-indigo-700 border border-indigo-300 shrink-0">
          Pending Review
        </span>
      );
    case 'Closed':
    case 'Completed':
      return (
        <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/90 shrink-0">
          Completed
        </span>
      );
    case 'Cancelled':
      return (
        <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-red-50 text-red-700 border border-red-200/90 shrink-0">
          Cancelled
        </span>
      );
    default:
      return (
        <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-gray-50 text-gray-700 border border-gray-300 shrink-0">
          {status}
        </span>
      );
  }
};

interface Message {
  _id?: string;
  id?: string;
  workOrderId?: string;
  channelId?: string;
  senderId: string | { _id: string; name: string };
  senderRole?: string;
  message: string;
  sentAt?: string;
  createdAt?: string;
}

export interface ComplaintItem {
  _id: string;
  complaintCode: string;
  workOrderId?: string;
  workOrderTitle?: string;
  title: string;
  category: string;
  description: string;
  severity: 'Low' | 'Medium' | 'Elevated' | 'Urgent';
  status: 'Open' | 'Investigating' | 'Resolved';
  filedBy: {
    _id: string;
    name: string;
    email: string;
    role: 'Client' | 'FieldTeam' | 'Admin';
  };
  targetParty?: string;
  createdAt: string;
  messages: Message[];
}

const isSameChatMessage = (a: Message, b: Message) => {
  if (!a || !b) return false;
  const aId = a._id || a.id;
  const bId = b._id || b.id;
  if (aId && bId && aId === bId) return true;

  const aText = (a.message || '').trim().toLowerCase();
  const bText = (b.message || '').trim().toLowerCase();
  if (!aText || aText !== bText) return false;

  const aSender = typeof a.senderId === 'object' ? (a.senderId as any)?._id : a.senderId;
  const bSender = typeof b.senderId === 'object' ? (b.senderId as any)?._id : b.senderId;
  const sameSender = (aSender && bSender && aSender === bSender) || (a.senderRole && b.senderRole && a.senderRole === b.senderRole);

  const aTime = new Date(a.sentAt || a.createdAt || Date.now()).getTime();
  const bTime = new Date(b.sentAt || b.createdAt || Date.now()).getTime();
  const timeDiff = isNaN(aTime) || isNaN(bTime) ? 0 : Math.abs(aTime - bTime);

  return Boolean(sameSender || timeDiff < 30000);
};

export interface PersonProfile {
  id: string;
  name: string;
  role: 'Client' | 'Worker';
  gender: 'boy' | 'girl';
  email: string;
  phone: string;
  cnic: string;
  address: string;
  specialization?: string;
  crewName?: string;
  totalRequests: number;
  acceptedRequests: number;
  cancelledRequests: number;
  rating: number;
  registeredDate: string;
  status: string;
}

export const PERSON_PROFILES: Record<string, PersonProfile> = {
  Sara: {
    id: '#C-9876',
    name: 'Sara',
    role: 'Client',
    gender: 'girl',
    email: 'sara@clearflow.com',
    phone: '+92 300 9876543',
    cnic: '35201-9876543-1',
    address: 'Gulberg III, Lahore',
    totalRequests: 0,
    acceptedRequests: 0,
    cancelledRequests: 0,
    rating: 0.0,
    registeredDate: 'Active',
    status: 'Verified Active Client',
  },
  Hamza: {
    id: '#W-1234',
    name: 'Hamza',
    role: 'Worker',
    gender: 'boy',
    email: 'hamza@clearflow.com',
    phone: '+92 321 7654321',
    cnic: '35202-1234567-3',
    address: 'DHA Phase 5, Lahore',
    specialization: 'Cleaning',
    crewName: 'Alpha Crew (Cleaning)',
    totalRequests: 0,
    acceptedRequests: 0,
    cancelledRequests: 0,
    rating: 0.0,
    registeredDate: 'Active',
    status: 'Verified Active Field Specialist',
  },
  Bilal: {
    id: '#W-1122',
    name: 'Bilal',
    role: 'Worker',
    gender: 'boy',
    email: 'bilal@clearflow.com',
    phone: '+92 333 4455667',
    cnic: '35201-1122334-5',
    address: 'Central Complex, Lahore',
    specialization: 'Cleaning',
    crewName: 'Bravo Crew (Cleaning)',
    totalRequests: 0,
    acceptedRequests: 0,
    cancelledRequests: 0,
    rating: 0.0,
    registeredDate: 'Active',
    status: 'Verified Active Field Specialist',
  },
  Hassan: {
    id: '#C-1122',
    name: 'Hassan',
    role: 'Client',
    gender: 'boy',
    email: 'hassan@clearflow.com',
    phone: '+92 300 5566778',
    cnic: '35201-1122334-7',
    address: 'Model Town, Lahore',
    totalRequests: 0,
    acceptedRequests: 0,
    cancelledRequests: 0,
    rating: 0.0,
    registeredDate: 'Active',
    status: 'Verified Active Client',
  },
};

const getPersonProfile = (channel?: ChatContactChannel | null): PersonProfile => {
  if (channel && PERSON_PROFILES[channel.name]) {
    return PERSON_PROFILES[channel.name];
  }
  const match = Object.values(PERSON_PROFILES).find(p => p.name === channel?.name);
  if (match) return match;

  const roleName: 'Client' | 'Worker' = ((channel as any)?.role === 'Worker' || (channel as any)?.role === 'FieldTeam') ? 'Worker' : 'Client';
  const name = channel?.name || 'Registered User';
  const cleanEmail = name.toLowerCase().replace(/[^a-z0-9]/g, '') + '@clearflow.com';
  const email = channel?.email || cleanEmail;
  return {
    id: channel?.id ? '#' + channel.id.slice(-6).toUpperCase() : '#REG-001',
    name,
    role: roleName,
    gender: 'boy',
    email,
    phone: channel?.phone || '+92 300 0000000',
    cnic: '35201-0000000-1',
    address: 'Lahore, Pakistan',
    specialization: roleName === 'Worker' ? 'General Facility Services' : undefined,
    crewName: roleName === 'Worker' ? 'ClearFlow Operations' : undefined,
    totalRequests: 0,
    acceptedRequests: 0,
    cancelledRequests: 0,
    rating: 0.0,
    registeredDate: 'Active',
    status: 'Verified Active ' + (roleName === 'Worker' ? 'Field Specialist' : roleName),
  };
};

export const ORDER_COMPLAINT_MAP: Record<string, string> = {};

export const SEEDED_ORDER_MESSAGES: Record<string, Message[]> = {};

// Seeded Initial Complaints
export const INITIAL_COMPLAINTS: ComplaintItem[] = [];

export const ChatWindow = () => {
  const { workOrderId } = useParams<{ workOrderId?: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const theme = useRoleTheme();
  const { clearUnread } = useUnreadChat();
  const isAdmin = theme.role === 'admin';
  const currentUserId = user?._id || user?.id || '';

  const chatStyles = theme.role === 'admin' ? {
    headerBg: 'bg-purple-700',
    headerSub: 'text-purple-100',
    headerBtn: 'bg-purple-800 border-purple-600 text-white hover:bg-purple-900',
    bubbleBg: 'bg-purple-600 text-white rounded-tr-none',
    selectedOrder: 'bg-purple-50/80 border-l-4 border-purple-600',
    orderStatusBadge: 'text-purple-700 bg-purple-100/60',
    iconColor: 'text-purple-600',
    btnColor: 'bg-purple-600 hover:bg-purple-700 shadow-md shadow-purple-600/20',
    focusRing: 'focus-visible:ring-purple-500',
    hoverText: 'hover:text-purple-700',
    spinner: 'text-purple-600',
  } : theme.role === 'fieldteam' ? {
    headerBg: 'bg-amber-700',
    headerSub: 'text-amber-100',
    headerBtn: 'bg-amber-800 border-amber-600 text-white hover:bg-amber-900',
    bubbleBg: 'bg-amber-600 text-white rounded-tr-none',
    selectedOrder: 'bg-amber-50/80 border-l-4 border-amber-600',
    orderStatusBadge: 'text-amber-800 bg-amber-100/60',
    iconColor: 'text-amber-600',
    btnColor: 'bg-amber-600 hover:bg-amber-700 shadow-md shadow-amber-600/20',
    focusRing: 'focus-visible:ring-amber-500',
    hoverText: 'hover:text-amber-800',
    spinner: 'text-amber-600',
  } : {
    headerBg: 'bg-teal-700',
    headerSub: 'text-teal-100',
    headerBtn: 'bg-teal-800 border-teal-600 text-white hover:bg-teal-900',
    bubbleBg: 'bg-teal-600 text-white rounded-tr-none',
    selectedOrder: 'bg-teal-50/80 border-l-4 border-teal-600',
    orderStatusBadge: 'text-teal-700 bg-teal-100/60',
    iconColor: 'text-teal-600',
    btnColor: 'bg-teal-600 hover:bg-teal-700 shadow-md shadow-teal-600/20',
    focusRing: 'focus-visible:ring-teal-500',
    hoverText: 'hover:text-teal-700',
    spinner: 'text-teal-600',
  };
  
  const userRole = (user?.role || 'client').toLowerCase();
  const isAdminRole = userRole === 'admin';
  const isFieldRole = userRole === 'fieldteam' || userRole === 'field_team' || userRole === 'field-team' || userRole === 'worker';
  const isClientRole = !isAdminRole && !isFieldRole;

  const isDemoAccount = false;

  // Work Orders Chat state (declared early so channels can derive from them)
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [activeOrderId, setActiveOrderId] = useState<string>(workOrderId || '');
  const [currentOrder, setCurrentOrder] = useState<WorkOrder | null>(null);

  // Filter channels according to the logged-in role
  const clientWorkerChannels = React.useMemo<ChatContactChannel[]>(() => {
    if (!isDemoAccount && !isAdminRole) {
      // Real client: ONLY show channels for work orders belonging to this client
      const myOrders = workOrders.filter((wo) => {
        const cId = typeof wo.clientId === 'object' && wo.clientId ? ((wo.clientId as any)._id || (wo.clientId as any).id) : wo.clientId;
        const currentId = user?._id || user?.id;
        const clientEmail = typeof wo.clientId === 'object' && wo.clientId ? (wo.clientId as any).email : '';
        return (Boolean(currentId) && String(cId) === String(currentId)) || (Boolean(user?.email) && clientEmail.toLowerCase() === user!.email.toLowerCase());
      });
      const realChannels = myOrders.map((wo): ChatContactChannel => {
        const woCode = wo.workOrderCode || `WO-${String(wo._id || '').slice(-4)}`;
        const teamName = typeof wo.teamId === 'object' && wo.teamId ? (wo.teamId as any).name : 'ClearFlow Operations';
        const workerName = (wo as any).assignedWorker?.name || (typeof wo.teamId === 'object' && (wo.teamId as any)?.name ? `${(wo.teamId as any).name} Technician` : 'Assigned Technician');
        const catName = typeof wo.categoryId === 'object' && wo.categoryId ? (wo.categoryId as any).name : 'Service Request';
        return {
          id: `wrk_${woCode}`,
          orderCode: woCode,
          orderId: wo._id,
          name: workerName,
          type: 'worker',
          role: 'Worker',
          gender: 'boy',
          counterpartName: user?.name || 'You',
          counterpartRole: 'Client',
          crewOrAddress: teamName,
          category: catName,
          taskTitle: wo.title || 'Service Request',
          status: wo.status,
          complaintsCount: 0,
        };
      });

      const supportChannel: ChatContactChannel = {
        id: 'adm_support',
        orderCode: 'SUPPORT-HQ',
        orderId: '65f000000000000000000001',
        userId: '65f000000000000000000001',
        type: 'admin',
        name: 'ClearFlow Operations Support',
        role: 'Admin',
        gender: 'boy',
        counterpartName: user?.name || 'Client',
        counterpartRole: 'Client',
        crewOrAddress: 'Operations HQ 24/7',
        category: 'Operations Support',
        taskTitle: '24/7 Facilities & Operations Desk',
        status: 'Active',
        complaintsCount: 0,
        email: 'admin@clearflow.com',
        isDirectChat: true,
      };

      if (workOrderId) {
        const matchingBase = BASE_WORKER_CHANNELS.find(b => b.orderCode === workOrderId || b.orderId === workOrderId);
        if (matchingBase && !realChannels.some(r => r.id === matchingBase.id || r.orderCode === matchingBase.orderCode)) {
          return [matchingBase, ...realChannels];
        }
      }
      return realChannels;
    }

    return [];
  }, [user, workOrders, isDemoAccount, isAdminRole, workOrderId]);

  const workerClientChannels = React.useMemo<ChatContactChannel[]>(() => {
    const dispatchChannel: ChatContactChannel = {
      id: 'adm_dispatch',
      orderCode: 'DISPATCH-HQ',
      orderId: '65f000000000000000000001',
      userId: '65f000000000000000000001',
      type: 'admin',
      name: 'Operations Dispatch Command',
      role: 'Admin',
      gender: 'boy',
      counterpartName: user?.name || 'Technician',
      counterpartRole: 'Worker',
      crewOrAddress: 'Central Dispatch Unit',
      category: 'Field Operations',
      taskTitle: 'Field Dispatch & Safety Command',
      status: 'Active',
      complaintsCount: 0,
      email: 'admin@clearflow.com',
      isDirectChat: true,
    };

    if (!isDemoAccount && !isAdminRole) {
      // Real worker: ONLY show channels for work orders assigned to or accepted by this worker
      const myJobs = workOrders.filter((wo) => {
        const tId = typeof wo.teamId === 'object' && wo.teamId ? ((wo.teamId as any)._id || (wo.teamId as any).id) : wo.teamId;
        const wId = (wo as any).assignedWorkerId || (wo as any).workerId;
        const currentId = user?._id || user?.id;
        return (Boolean(currentId) && (String(tId) === String(currentId) || String(wId) === String(currentId)));
      });
      const realChannels = myJobs.map((wo): ChatContactChannel => {
        const woCode = wo.workOrderCode || `WO-${String(wo._id || '').slice(-4)}`;
        const clientName = typeof wo.clientId === 'object' && wo.clientId ? (wo.clientId as any).name : 'Client';
        const catName = typeof wo.categoryId === 'object' && wo.categoryId ? (wo.categoryId as any).name : 'Service Job';
        return {
          id: `cli_${woCode}`,
          orderCode: woCode,
          orderId: wo._id,
          name: clientName,
          type: 'client',
          role: 'Client',
          gender: isGirlClient(clientName) ? 'girl' : 'boy',
          counterpartName: user?.name || 'Technician',
          counterpartRole: 'Worker',
          crewOrAddress: wo.locationAddress || 'Service Site',
          category: catName,
          taskTitle: wo.title || 'Service Job',
          status: wo.status,
          complaintsCount: 0,
        };
      });

      if (workOrderId) {
        const matchingBase = BASE_CLIENT_CHANNELS.find(b => b.orderCode === workOrderId || b.orderId === workOrderId);
        if (matchingBase && !realChannels.some(r => r.id === matchingBase.id || r.orderCode === matchingBase.orderCode)) {
          return [matchingBase, ...realChannels];
        }
      }
      return realChannels;
    }

    return [];
  }, [user, workOrders, isDemoAccount, isAdminRole, workOrderId]);

  // Target filter: 'all' | 'admins' | 'clients' | 'workers'
  const [chatTargetFilter, setChatTargetFilter] = useState<'all' | 'admins' | 'clients' | 'workers'>(() => {
    try {
      const searchParams = new URLSearchParams(window.location.search);
      const targetType = (searchParams.get('type') || '').toLowerCase();
      const targetRole = (searchParams.get('role') || '').toLowerCase();
      if (targetType === 'admin' || targetRole === 'admin') return 'admins';
      if (targetType === 'worker' || targetRole === 'worker' || searchParams.get('worker')) return 'workers';
      if (targetType === 'client' || targetRole === 'client' || searchParams.get('client')) return 'clients';
    } catch {}
    return 'all';
  });

  // Dynamic custom 1-on-1 channels created on the fly (strictly sanitized)
  const [customChannels, setCustomChannels] = useState<ChatContactChannel[]>(() => {
    try {
      const stored = localStorage.getItem('clearflow_custom_chat_channels');
      if (stored) {
        const parsed = JSON.parse(stored);
        const sanitized = sanitizeCustomChannels(parsed);
        if (sanitized.length !== parsed.length) {
          localStorage.setItem('clearflow_custom_chat_channels', JSON.stringify(sanitized));
        }
        return sanitized;
      }
      return [];
    } catch {
      return [];
    }
  });

  // Real-time registered directory contacts (Admins, Clients, Workers)
  const [directoryContacts, setDirectoryContacts] = useState<{
    admins: DirectoryContact[];
    clients: DirectoryContact[];
    workers: DirectoryContact[];
  }>({ admins: [], clients: [], workers: [] });

  const [serverActiveChatIds, setServerActiveChatIds] = useState<string[]>([]);

  // Local persistent messages cache keyed by orderCode so clicking any contact loads their specific conversation immediately
  const chatStorageKey = (isDemoAccount || isAdminRole)
    ? 'clearflow_v2_user_chat_history'
    : `clearflow_chat_history_${user?._id || user?.id || 'guest'}`;

  const [orderChatHistory, setOrderChatHistory] = useState<Record<string, Message[]>>(() => {
    try {
      const stored = localStorage.getItem(chatStorageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        return parsed || {};
      }
    } catch (e) {}
    return {};
  });

  // Keep localStorage in sync whenever orderChatHistory changes
  useEffect(() => {
    try {
      localStorage.setItem(chatStorageKey, JSON.stringify(orderChatHistory));
    } catch (e) {}
  }, [orderChatHistory, chatStorageKey]);

  const hasChannelMessages = React.useCallback((channel: ChatContactChannel): boolean => {
    if (!channel) return false;
    const candidateKeys = [
      channel.id,
      channel.orderCode,
      channel.orderId,
      channel.userId,
      channel.userId ? `direct_${channel.userId}` : '',
      channel.orderCode ? `cli_${channel.orderCode}` : '',
      channel.orderCode ? `wrk_${channel.orderCode}` : '',
    ].filter(Boolean) as string[];

    // 1. Check serverActiveChatIds
    if (serverActiveChatIds.some(id => candidateKeys.includes(id))) {
      return true;
    }

    // 2. Check direct orderChatHistory keys
    for (const k of candidateKeys) {
      const msgs = orderChatHistory[k];
      if (Array.isArray(msgs) && msgs.length > 0) {
        return true;
      }
    }

    // 3. Check if any message in orderChatHistory contains matching workOrderId or senderId
    for (const [key, msgs] of Object.entries(orderChatHistory)) {
      if (Array.isArray(msgs) && msgs.length > 0) {
        if (candidateKeys.includes(key)) return true;
        if (msgs.some(m => {
          const sId = typeof m.senderId === 'object' ? (m.senderId as any)?._id : m.senderId;
          return candidateKeys.includes(m.workOrderId || '') || (channel.userId && sId === channel.userId);
        })) {
          return true;
        }
      }
    }

    return false;
  }, [serverActiveChatIds, orderChatHistory]);

  const fetchChatContacts = useCallback(async () => {
    try {
      const res = await apiClient.get(ENDPOINTS.CHAT.CONTACTS);
      if (res.data?.success && res.data?.data) {
        setDirectoryContacts({
          admins: res.data.data.admins || [],
          clients: res.data.data.clients || [],
          workers: res.data.data.workers || [],
        });
        if (Array.isArray(res.data.data.activeChatIds)) {
          setServerActiveChatIds(res.data.data.activeChatIds);
        }
        if (res.data.data.conversations && typeof res.data.data.conversations === 'object') {
          setOrderChatHistory(prev => ({
            ...res.data.data.conversations,
            ...prev,
          }));
        }
      }
    } catch (_) {}
  }, []);

  useEffect(() => {
    fetchChatContacts();
    const handleRefresh = () => fetchChatContacts();
    window.addEventListener('clearflow:refresh-data', handleRefresh);
    window.addEventListener('storage', handleRefresh);
    return () => {
      window.removeEventListener('clearflow:refresh-data', handleRefresh);
      window.removeEventListener('storage', handleRefresh);
    };
  }, [fetchChatContacts]);

  useEffect(() => {
    try {
      localStorage.setItem('clearflow_custom_chat_channels', JSON.stringify(customChannels));
    } catch {}
  }, [customChannels]);

  // Section toggle: 'orders' or 'complaints'
  const [activeTab, setActiveTab] = useState<'orders' | 'complaints'>('orders');

  // Search state across Admin, Client, and Worker portals
  const [channelSearchQuery, setChannelSearchQuery] = useState('');
  const [messageSearchQuery, setMessageSearchQuery] = useState('');
  const [isMessageSearchOpen, setIsMessageSearchOpen] = useState(false);

  // User/role-scoped storage key for deleted chat channels
  const currentPortalRole = isAdminRole ? 'admin' : isClientRole ? 'client' : 'worker';
  const portalUserScopedId = currentUserId || (user as any)?.userId || currentPortalRole;
  const deletedChannelsStorageKey = `clearflow_deleted_chat_${currentPortalRole}_${portalUserScopedId}`;

  // Clean up legacy global key and auto-recover on mount if all channels were purged
  useEffect(() => {
    try {
      localStorage.removeItem('clearflow_deleted_chat_channels');
      const userStored = localStorage.getItem(deletedChannelsStorageKey);
      if (userStored) {
        const parsed = JSON.parse(userStored);
        if (Array.isArray(parsed) && parsed.length >= 5) {
          localStorage.removeItem(deletedChannelsStorageKey);
          setDeletedChannelIds([]);
        }
      }
    } catch {}
  }, [deletedChannelsStorageKey]);

  const [deletedChannelIds, setDeletedChannelIds] = useState<string[]>(() => {
    try {
      const userStored = localStorage.getItem(deletedChannelsStorageKey);
      const parsed = userStored ? JSON.parse(userStored) : [];
      if (Array.isArray(parsed) && parsed.length >= 5) {
        localStorage.removeItem(deletedChannelsStorageKey);
        return [];
      }
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  // Synchronize deleted channels strictly to this role/user storage key
  useEffect(() => {
    try {
      localStorage.setItem(deletedChannelsStorageKey, JSON.stringify(deletedChannelIds));
    } catch {}
  }, [deletedChannelIds, deletedChannelsStorageKey]);

  // Selected channel in list: default according to role and URL
  const [selectedChannelId, setSelectedChannelId] = useState<string>(() => {
    try {
      const pathParts = window.location.pathname.split('/');
      const pathWoId = decodeURIComponent(pathParts[2] || workOrderId || '');
      const params = new URLSearchParams(window.location.search);
      const targetWorker = (params.get('worker') || '').toLowerCase();
      const targetClient = (params.get('client') || '').toLowerCase();
      const targetName = (params.get('name') || '').toLowerCase();
      const targetType = params.get('type') || '';
      const targetUserId = params.get('userId') || '';

      const pool = [...BASE_ADMIN_CHANNELS, ...BASE_CLIENT_CHANNELS, ...BASE_WORKER_CHANNELS];

      if (targetName) {
        const found = pool.find(c => 
          (c.name.toLowerCase() === targetName || c.name.toLowerCase().includes(targetName) || targetName.includes(c.name.toLowerCase())) &&
          (!targetType || c.type === targetType)
        );
        if (found) return found.id;
      }

      if (targetUserId) {
        const found = pool.find(c => c.userId === targetUserId || c.orderId === targetUserId || c.orderCode === targetUserId || c.id === targetUserId);
        if (found) return found.id;
      }

      if (pathWoId) {
        const found = pool.find(c => 
          c.orderCode === pathWoId || c.orderId === pathWoId || c.id === pathWoId || c.userId === pathWoId
        );
        if (found) return found.id;
        if (targetName) {
          return `direct_${targetUserId || pathWoId || targetName.replace(/\s+/g, '_')}`;
        }
      }

      if (targetWorker) {
        const found = BASE_WORKER_CHANNELS.find(w => 
          w.name.toLowerCase().includes(targetWorker) || targetWorker.includes(w.name.toLowerCase())
        );
        if (found) return found.id;
      }

      if (targetClient) {
        const found = BASE_CLIENT_CHANNELS.find(c => 
          c.name.toLowerCase().includes(targetClient) || targetClient.includes(c.name.toLowerCase())
        );
        if (found) return found.id;
      }
    } catch {
      // fallback
    }

    return '';
  });

  // Check if a channel or order has been deleted
  const isChannelDeleted = React.useCallback((c: ChatContactChannel) => {
    if (!c) return false;
    // CRITICAL: An actively selected channel or active order is NEVER deleted!
    if (c.id === selectedChannelId) return false;
    if (activeOrderId && (c.orderCode === activeOrderId || c.orderId === activeOrderId || c.id === activeOrderId || c.userId === activeOrderId)) return false;

    if (deletedChannelIds.includes(c.id)) return true;
    if (c.orderCode && deletedChannelIds.includes(c.orderCode)) return true;
    if (c.orderId && deletedChannelIds.includes(c.orderId)) return true;
    if (c.userId && deletedChannelIds.includes(c.userId)) return true;
    if (c.orderCode && (deletedChannelIds.includes(`cli_${c.orderCode}`) || deletedChannelIds.includes(`wrk_${c.orderCode}`))) return true;
    return false;
  }, [deletedChannelIds, selectedChannelId, activeOrderId]);

  // Registered Admin channels (excluding logged-in admin)
  const registeredAdminChannels = React.useMemo<ChatContactChannel[]>(() => {
    const userEmail = (user?.email || '').toLowerCase();
    const userId = (user?.id || (user as any)?._id || '').toLowerCase();
    return directoryContacts.admins
      .filter(a => {
        if (a.isSelf) return false;
        if (userEmail && a.email?.toLowerCase() === userEmail) return false;
        if (userId && (a.userId?.toLowerCase() === userId || a.id?.toLowerCase() === userId)) return false;
        return true;
      })
      .map(a => ({
        id: (isClientRole || isFieldRole) && userId ? `direct_${userId}` : `direct_${a.userId || a.id}`,
        orderCode: a.id,
        orderId: (isClientRole || isFieldRole) && userId ? userId : (a.userId || a.id),
        userId: a.userId || a.id,
        type: 'admin',
        name: cleanChatName(a.name, 'Admin'),
        role: 'Admin',
        gender: a.gender,
        counterpartName: user?.name || 'Operations Support',
        counterpartRole: (user?.role as any) || 'Admin',
        crewOrAddress: a.address || 'Operations HQ, Central Facility Complex',
        category: a.category || 'System Administration',
        taskTitle: a.isPrimary ? 'Primary Administrator & Ownership' : 'Operations Administration',
        status: 'Active',
        complaintsCount: 0,
        email: a.email,
        phone: a.phone,
        isDirectChat: true,
      }));
  }, [directoryContacts.admins, user, isClientRole, isFieldRole]);

  // Registered Client channels (excluding logged-in client)
  const registeredClientChannels = React.useMemo<ChatContactChannel[]>(() => {
    const userEmail = (user?.email || '').toLowerCase();
    const userId = (user?.id || (user as any)?._id || '').toLowerCase();
    return directoryContacts.clients
      .filter(c => {
        if (c.isSelf) return false;
        if (userEmail && c.email?.toLowerCase() === userEmail) return false;
        if (userId && (c.userId?.toLowerCase() === userId || c.id?.toLowerCase() === userId)) return false;
        return true;
      })
      .map(c => ({
        id: `direct_${c.userId || c.id}`,
        orderCode: c.id,
        orderId: c.userId || c.id,
        userId: c.userId || c.id,
        type: 'client',
        name: cleanChatName(c.name, 'Client'),
        role: 'Client',
        gender: c.gender,
        counterpartName: user?.name || 'Administrator',
        counterpartRole: (user?.role as any) || 'Admin',
        crewOrAddress: c.address || 'Facility Client Account',
        category: c.category || 'Facility Client',
        taskTitle: 'Client Account & Requests',
        status: 'Active',
        complaintsCount: 0,
        email: c.email,
        phone: c.phone,
        isDirectChat: true,
      }));
  }, [directoryContacts.clients, user]);

  // Registered Worker channels (excluding logged-in worker)
  const registeredWorkerChannels = React.useMemo<ChatContactChannel[]>(() => {
    const userEmail = (user?.email || '').toLowerCase();
    const userId = (user?.id || (user as any)?._id || '').toLowerCase();
    return directoryContacts.workers
      .filter(w => {
        if (w.isSelf) return false;
        if (userEmail && w.email?.toLowerCase() === userEmail) return false;
        if (userId && (w.userId?.toLowerCase() === userId || w.id?.toLowerCase() === userId)) return false;
        return true;
      })
      .map(w => ({
        id: `direct_${w.userId || w.id}`,
        orderCode: w.id,
        orderId: w.userId || w.id,
        userId: w.userId || w.id,
        type: 'worker',
        name: cleanChatName(w.name, 'Worker'),
        role: 'Worker',
        gender: w.gender,
        counterpartName: user?.name || 'Operations Dispatch',
        counterpartRole: (user?.role as any) || 'Admin',
        crewOrAddress: w.address || 'Field Operations Base',
        category: w.category || 'Field Operations',
        taskTitle: 'Field Technician Operations',
        status: 'Active',
        complaintsCount: 0,
        email: w.email,
        phone: w.phone,
        isDirectChat: true,
      }));
  }, [directoryContacts.workers, user]);

  // Admin channels alias
  const adminChannels = registeredAdminChannels;

  // Strict verification filter for custom channels: unverified users or phantom contacts are NEVER shown
  const verifiedCustomChannels = React.useMemo(() => {
    return customChannels.filter(c => {
      if (isChannelDeleted(c)) return false;
      const n = (c.name || '').toLowerCase();
      if (n.includes('malik') || n.includes('ahsan khalid') || n.includes('(client)') || n.includes('(field') || n.includes('(apple')) return false;

      // If it's a client contact, verify against directory contacts or active work orders
      if (c.type === 'client') {
        return directoryContacts.clients.some(dc => 
          dc.userId === c.userId || 
          dc.id === c.orderCode || 
          (dc.name && c.name && dc.name.toLowerCase() === c.name.toLowerCase())
        ) || workOrders.some(wo => 
          wo.workOrderCode === c.orderCode || 
          wo._id === c.orderId || 
          String(wo.clientId) === String(c.userId) || 
          (typeof wo.clientId === 'object' && String((wo.clientId as any)._id) === String(c.userId))
        );
      }
      // If it's a worker contact, they MUST be verified and present in directoryContacts.workers
      if (c.type === 'worker') {
        return directoryContacts.workers.some(dw => 
          dw.userId === c.userId || 
          dw.id === c.orderCode || 
          (dw.name && c.name && dw.name.toLowerCase() === c.name.toLowerCase())
        );
      }
      // If it's an admin contact, ensure admin exists
      if (c.type === 'admin') {
        return directoryContacts.admins.some(da => 
          da.userId === c.userId || 
          da.id === c.orderCode || 
          (da.name && c.name && da.name.toLowerCase() === c.name.toLowerCase())
        );
      }
      return false;
    });
  }, [customChannels, directoryContacts, isChannelDeleted, workOrders]);

  const displayedChannels = React.useMemo(() => {
    let raw: ChatContactChannel[] = [];
    if (isClientRole) {
      raw = [
        ...registeredAdminChannels,
        ...clientWorkerChannels,
        ...verifiedCustomChannels.filter(c => c.type === 'worker' || c.type === 'admin'),
      ];
    } else if (isFieldRole) {
      raw = [
        ...registeredAdminChannels,
        ...workerClientChannels,
        ...verifiedCustomChannels.filter(c => c.type === 'client' || c.type === 'admin'),
      ];
    } else if (chatTargetFilter === 'admins') {
      raw = [...registeredAdminChannels, ...verifiedCustomChannels.filter(c => c.type === 'admin')];
    } else if (chatTargetFilter === 'clients') {
      raw = [...registeredClientChannels, ...verifiedCustomChannels.filter(c => c.type === 'client')];
    } else if (chatTargetFilter === 'workers') {
      raw = [...registeredWorkerChannels, ...verifiedCustomChannels.filter(c => c.type === 'worker')];
    } else {
      // 'all' view: deduplicated pool of admins, clients, workers, and custom channels
      const seen = new Set<string>();
      const deduped: ChatContactChannel[] = [];
      const pool = [...registeredAdminChannels, ...registeredClientChannels, ...registeredWorkerChannels, ...verifiedCustomChannels];
      for (const c of pool) {
        const key = c.id || c.orderCode || c.orderId || c.name;
        if (!seen.has(key)) {
          seen.add(key);
          deduped.push(c);
        }
      }
      raw = deduped;
    }

    // Safety guarantee: If selectedChannelId is set, always ensure it is present in raw list
    if (selectedChannelId && !raw.some(c => c.id === selectedChannelId)) {
      const matchInCustom = verifiedCustomChannels.find(c => c.id === selectedChannelId);
      if (matchInCustom) {
        raw = [matchInCustom, ...raw];
      } else if (isAdminRole) {
        const allRegistered = [...registeredAdminChannels, ...registeredClientChannels, ...registeredWorkerChannels];
        const matchInBase = allRegistered.find(c => c.id === selectedChannelId || c.orderCode === selectedChannelId || c.orderId === selectedChannelId || c.userId === selectedChannelId);
        if (matchInBase) {
          raw = [matchInBase, ...raw];
        }
      }
    }

    // Strict deduplication: Prune redundant generic direct chat channels if an active work order channel exists for the same counterpart
    const realOrderCounterparts = new Set<string>();
    for (const c of raw) {
      if ((c.orderCode?.startsWith('WO-') || c.id?.startsWith('cli_WO-') || c.id?.startsWith('wrk_WO-')) && c.name) {
        realOrderCounterparts.add(c.name.toLowerCase().trim());
      }
    }

    const dedupedRaw: ChatContactChannel[] = [];
    const seenKeys = new Set<string>();
    for (const c of raw) {
      const cleanName = (c.name || '').toLowerCase().trim();
      const isDirectDummy = c.taskTitle === 'Direct Operational Chat' || c.id.startsWith('direct_');
      
      // If an official work order channel already exists for this counterpart, omit the duplicate dummy direct channel
      if (isDirectDummy && realOrderCounterparts.has(cleanName)) {
        continue;
      }

      const dedupeKey = c.id || c.orderCode || `${cleanName}::${c.type}`;
      if (!seenKeys.has(dedupeKey)) {
        seenKeys.add(dedupeKey);
        dedupedRaw.push(c);
      }
    }
    raw = dedupedRaw;

    const visible = raw.filter(c => !isChannelDeleted(c));
    if (!channelSearchQuery.trim()) {
      return visible.filter(c => {
        if (selectedChannelId && c.id === selectedChannelId) return true;
        if (activeOrderId && (c.orderCode === activeOrderId || c.orderId === activeOrderId || c.id === activeOrderId || c.userId === activeOrderId)) return true;
        return hasChannelMessages(c);
      });
    }

    const q = channelSearchQuery.toLowerCase().trim();
    return visible.filter(c => {
      const name = (c.name || '').toLowerCase();
      const counterpart = (c.counterpartName || '').toLowerCase();
      const code = (c.orderCode || '').toLowerCase();
      const cat = (c.category || '').toLowerCase();
      const title = (c.taskTitle || '').toLowerCase();
      const crew = (c.crewOrAddress || '').toLowerCase();
      return name.includes(q) || counterpart.includes(q) || code.includes(q) || cat.includes(q) || title.includes(q) || crew.includes(q);
    });
  }, [isClientRole, isFieldRole, isAdminRole, clientWorkerChannels, workerClientChannels, registeredAdminChannels, registeredClientChannels, registeredWorkerChannels, verifiedCustomChannels, chatTargetFilter, isChannelDeleted, channelSearchQuery, selectedChannelId, activeOrderId, hasChannelMessages]);


  const [inspectingProfile, setInspectingProfile] = useState<PersonProfile | null>(null);

  // Policy enforcement: Admin can message anytime.
  const effectiveRole = isClientRole ? 'client' : isAdminRole ? 'admin' : 'worker';

  // Input ref for quick start focus
  const inputRef = useRef<HTMLInputElement>(null);

  // Clean up legacy mock messages
  useEffect(() => {
    try {
      localStorage.removeItem('clearflow_demo_chat_history');
      localStorage.removeItem('clearflow_order_chat_history');
    } catch {}
  }, []);

  const activeChannel = React.useMemo(() => {
    if (displayedChannels.length === 0 && !selectedChannelId && !activeOrderId) {
      return null;
    }
    const pool = isAdminRole ? [
      ...customChannels,
      ...registeredAdminChannels,
      ...registeredClientChannels,
      ...registeredWorkerChannels,
    ] : [
      ...displayedChannels,
      ...customChannels,
    ];
    let ch = displayedChannels.find(c => c.id === selectedChannelId) 
      || pool.find(c => c.id === selectedChannelId)
      || displayedChannels.find(c => c.orderCode === activeOrderId || c.orderId === activeOrderId)
      || pool.find(c => c.orderCode === activeOrderId || c.orderId === activeOrderId || c.id === activeOrderId || c.userId === activeOrderId)
      || (displayedChannels.length > 0 ? displayedChannels[0] : null);

    if (ch) {
      const isIdName = /^[0-9a-fA-F]{20,}$/.test(ch.name) || ch.name.startsWith('65f') || ch.name.startsWith('usr_') || ch.name.startsWith('direct_') || /^(WO|TSK|ORD|DIR|ADM|WRK|CLI)-/i.test(ch.name);
      if (isIdName) {
        const foundContact = [
          ...directoryContacts.clients,
          ...directoryContacts.workers,
          ...directoryContacts.admins
        ].find(dc => dc.userId === ch.userId || dc.id === ch.orderCode || dc._id === ch.userId || dc.id === ch.id);

        const foundWo = workOrders.find(w => w._id === ch.orderId || w.id === ch.orderId || w.workOrderCode === ch.orderCode || (w._id && String(w._id) === activeOrderId) || (w.id && String(w.id) === activeOrderId));
        const resolvedWoClientName = foundWo ? ((typeof foundWo.clientId === 'object' && foundWo.clientId?.name) || (foundWo as any).clientName || (foundWo as any).client?.name) : null;

        const fixedName = foundContact?.name || resolvedWoClientName || (ch.type === 'client' ? 'Client' : ch.type === 'worker' ? 'Technician' : 'Operations Admin');
        return {
          ...ch,
          name: fixedName,
        };
      }
    }
    return ch;
  }, [displayedChannels, customChannels, registeredAdminChannels, registeredClientChannels, registeredWorkerChannels, selectedChannelId, activeOrderId, isAdminRole, directoryContacts, workOrders]);

  // Real-time listener for messages dispatched from Client Help & Support or external tabs
  useEffect(() => {
    const handleSupportChatMessage = (event: any) => {
      const detail = event.detail;
      if (detail && detail.channelCode && detail.message) {
        setOrderChatHistory(prev => {
          const currentList = prev[detail.channelCode] || [];
          if (currentList.some(m => isSameChatMessage(m, detail.message))) return prev;
          const updated = { ...prev, [detail.channelCode]: [...currentList, detail.message] };
          try {
            localStorage.setItem('clearflow_order_chat_history', JSON.stringify(updated));
          } catch (e) {}
          return updated;
        });

        // Only update displayed messages if this channel matches the currently active channel
        const activeKey = activeChannel?.id || '';
        if (activeKey && activeKey === detail.channelCode) {
          setMessages(prev => {
            if (prev.some(m => isSameChatMessage(m, detail.message))) return prev;
            return [...prev, detail.message];
          });
        }
      }
    };

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'clearflow_order_chat_history' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          setOrderChatHistory(prev => ({ ...prev, ...parsed }));
          // Only update messages for the current channel, not all channels
          const activeKey = activeChannel?.id || '';
          if (activeKey && parsed[activeKey]) {
            setMessages(parsed[activeKey]);
          }
        } catch (err) {}
      }
    };

    window.addEventListener('clearflow:chat-message', handleSupportChatMessage);
    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('clearflow:chat-message', handleSupportChatMessage);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [activeChannel]);

  // Global socket listener: immediately registers incoming messages to active conversations
  useEffect(() => {
    socketClient.connect();
    const socket = socketClient.getSocket();
    if (!socket) return;

    const handleGlobalSocketMsg = (newMsg: any) => {
      if (!newMsg || !newMsg.message) return;
      const chKey = newMsg.channelId || newMsg.workOrderId;
      const clean = String(chKey || newMsg.cleanId || '').replace(/^(?:cli_|wrk_|direct_)/, '');
      const keysToUpdate = Array.from(new Set([
        chKey,
        clean,
        `cli_${clean}`,
        `wrk_${clean}`,
        `direct_${clean}`,
        newMsg.cleanId ? `cli_${newMsg.cleanId}` : '',
        newMsg.cleanId ? `wrk_${newMsg.cleanId}` : '',
        newMsg.workOrderId ? String(newMsg.workOrderId) : '',
      ])).filter(Boolean) as string[];

      setServerActiveChatIds(prev => Array.from(new Set([...prev, ...keysToUpdate])));
      setOrderChatHistory(prev => {
        let changed = false;
        const next = { ...prev };
        for (const k of keysToUpdate) {
          const list = next[k] || [];
          if (!list.some(m => isSameChatMessage(m, newMsg))) {
            next[k] = [...list, newMsg];
            changed = true;
          }
        }
        return changed ? next : prev;
      });

      const activeClean = String(selectedChannelId || activeOrderId || '').replace(/^(?:cli_|wrk_|direct_)/, '').toLowerCase();
      const incomingClean = clean.toLowerCase();
      if (incomingClean && activeClean && incomingClean === activeClean) {
        setMessages(prev => {
          if (prev.some(m => isSameChatMessage(m, newMsg))) return prev;
          return [...prev, newMsg];
        });
      }
    };

    socket.on('chat:message', handleGlobalSocketMsg);
    return () => {
      socket.off('chat:message', handleGlobalSocketMsg);
    };
  }, []);

  // Delete chat confirmation modal state
  const [confirmDeleteWo, setConfirmDeleteWo] = useState<{ 
    id: string; 
    code: string; 
    channelId: string;
    clientName: string; 
    workerName: string 
  } | null>(null);
  const [isDeletingChat, setIsDeletingChat] = useState(false);

  // Messages state
  const [messages, setMessages] = useState<Message[]>([]);
  
  // Complaints state
  const [complaints, setComplaints] = useState<ComplaintItem[]>(() => {
    try {
      const stored = localStorage.getItem('clearflow_complaints');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return isDemoAccount || isAdminRole ? INITIAL_COMPLAINTS : [];
  });

  // Sync complaints to localStorage whenever updated
  useEffect(() => {
    try {
      localStorage.setItem('clearflow_complaints', JSON.stringify(complaints));
    } catch (e) {}
  }, [complaints]);

  // Real-time synchronization when complaints are filed from AI Assistant or other portals
  useEffect(() => {
    const handleSyncComplaint = (e: any) => {
      if (e.detail?.complaint) {
        setComplaints((prev) => {
          if (prev.some((c) => c._id === e.detail.complaint._id || c.complaintCode === e.detail.complaint.complaintCode)) {
            return prev;
          }
          const next = [e.detail.complaint, ...prev];
          try {
            localStorage.setItem('clearflow_complaints', JSON.stringify(next));
          } catch (err) {}
          return next;
        });
      }
    };
    window.addEventListener('clearflow:new-complaint', handleSyncComplaint);
    return () => window.removeEventListener('clearflow:new-complaint', handleSyncComplaint);
  }, []);
  const [activeComplaintId, setActiveComplaintId] = useState<string>('cmp_001');
  const [complaintStatusFilter, setComplaintStatusFilter] = useState<'All' | 'Open' | 'Investigating' | 'Resolved'>('All');
  const [complaintMessages, setComplaintMessages] = useState<Message[]>([]);

  // Dialog state for filing new complaint
  const [isNewComplaintOpen, setIsNewComplaintOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('Service Delay & Equipment');
  const [newWoId, setNewWoId] = useState('');
  const [newSeverity, setNewSeverity] = useState<'Low' | 'Medium' | 'Elevated' | 'Urgent'>('Medium');
  const [newDescription, setNewDescription] = useState('');
  const [isSubmittingComplaint, setIsSubmittingComplaint] = useState(false);

  // Common UI states
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Load Work Orders
  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const res = await apiClient.get(ENDPOINTS.WORK_ORDERS.BASE);
        if (res.data?.success && res.data?.data) {
          const list: WorkOrder[] = Array.isArray(res.data.data) ? res.data.data : res.data.data.data || [];
          setWorkOrders(list);

          let targetOrder: WorkOrder | undefined;
          if (workOrderId) {
            targetOrder = list.find(w => (w._id || w.id) === workOrderId || w.workOrderCode === workOrderId);
          }

          if (targetOrder) {
            const chosenId = (targetOrder._id || targetOrder.id || targetOrder.workOrderCode) as string;
            setActiveOrderId(chosenId);
            setCurrentOrder(targetOrder);
            setNewWoId(chosenId);
          }
        }
      } catch (err) {
        console.error('Failed to load chat work orders:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrders();
  }, [workOrderId]);

  // Synchronize with URL change
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const targetType = searchParams.get('type') || '';
    const targetRole = searchParams.get('role') || '';
    const targetName = searchParams.get('name') || '';
    const targetWorkerParam = (searchParams.get('worker') || '').toLowerCase();
    const targetClientParam = (searchParams.get('client') || '').toLowerCase();
    const targetUserId = searchParams.get('userId') || '';
    const targetEmail = searchParams.get('email') || '';
    const decodedWorkOrderId = workOrderId ? decodeURIComponent(workOrderId) : '';

    const allCandidatePool = [
      ...registeredAdminChannels,
      ...registeredClientChannels,
      ...registeredWorkerChannels,
      ...clientWorkerChannels,
      ...workerClientChannels,
      ...customChannels,
    ];

    let matchedChannel: ChatContactChannel | undefined;

    if (targetName) {
      const lowerName = targetName.toLowerCase();
      matchedChannel = allCandidatePool.find(c => 
        (c.name.toLowerCase() === lowerName || c.name.toLowerCase().includes(lowerName) || lowerName.includes(c.name.toLowerCase())) &&
        (!targetType || c.type === targetType)
      );
    }

    if (!matchedChannel && targetUserId) {
      matchedChannel = allCandidatePool.find(c => 
        c.userId === targetUserId || c.orderId === targetUserId || c.orderCode === targetUserId || c.id === targetUserId || c.id === `direct_${targetUserId}`
      );
    }

    if (!matchedChannel && decodedWorkOrderId) {
      matchedChannel = allCandidatePool.find(c => 
        c.id === decodedWorkOrderId || c.orderCode === decodedWorkOrderId || c.orderId === decodedWorkOrderId || c.userId === decodedWorkOrderId || c.id === `direct_${decodedWorkOrderId}`
      );
    }

    if (!matchedChannel && targetWorkerParam) {
      matchedChannel = allCandidatePool.find(c => 
        c.type === 'worker' && (c.name.toLowerCase().includes(targetWorkerParam) || targetWorkerParam.includes(c.name.toLowerCase()))
      );
    }

    if (!matchedChannel && targetClientParam) {
      matchedChannel = allCandidatePool.find(c => 
        c.type === 'client' && (c.name.toLowerCase().includes(targetClientParam) || targetClientParam.includes(c.name.toLowerCase()))
      );
    }

    let newDirect: ChatContactChannel | undefined;
    if (!matchedChannel && (targetName || decodedWorkOrderId || targetUserId)) {
      // Create dynamic direct channel
      const rawType = (targetType as 'admin' | 'client' | 'worker') || 
                      (targetRole.toLowerCase() === 'admin' ? 'admin' : targetRole.toLowerCase() === 'worker' ? 'worker' : 'client');
      const directId = `direct_${targetUserId || decodedWorkOrderId || targetEmail || targetName.replace(/\s+/g, '_')}`;

      let resolvedDirectName = targetName;
      const isTargetNameId = !targetName || /^[0-9a-fA-F]{20,}$/.test(targetName) || targetName.startsWith('65f') || targetName.startsWith('usr_');
      if (isTargetNameId) {
        const foundContact = [
          ...directoryContacts.clients,
          ...directoryContacts.workers,
          ...directoryContacts.admins
        ].find(dc => dc.userId === targetUserId || dc.id === decodedWorkOrderId || dc.userId === decodedWorkOrderId || dc._id === targetUserId || dc._id === decodedWorkOrderId);

        const foundWo = workOrders.find(w => w._id === decodedWorkOrderId || w.id === decodedWorkOrderId || w.workOrderCode === decodedWorkOrderId);
        const woClient = foundWo ? ((typeof foundWo.clientId === 'object' && foundWo.clientId?.name) || (foundWo as any).clientName || (foundWo as any).client?.name) : null;
        const woWorker = foundWo ? ((typeof foundWo.teamId === 'object' && foundWo.teamId?.name) || (foundWo as any).assignedWorker?.name || (foundWo as any).workerName) : null;

        resolvedDirectName = foundContact?.name || (rawType === 'client' ? (woClient || 'Client') : rawType === 'worker' ? (woWorker || 'Technician') : 'Operations Admin');
      }

      newDirect = {
        id: directId,
        orderCode: decodedWorkOrderId?.startsWith('WO-') ? decodedWorkOrderId : (rawType === 'admin' ? `A#${directId.slice(-4)}` : rawType === 'worker' ? (resolvedDirectName.toLowerCase().includes('ahmad') ? 'W#01' : `W#${directId.slice(-4)}`) : (resolvedDirectName.toLowerCase().includes('ali') ? 'C#01' : `C#${directId.slice(-4)}`)),
        orderId: targetUserId || decodedWorkOrderId || directId,
        userId: targetUserId || decodedWorkOrderId || directId,
        type: rawType,
        name: cleanChatName(resolvedDirectName || (rawType === 'client' ? 'Client' : 'Technician'), targetRole || rawType),
        role: (targetRole ? (targetRole.charAt(0).toUpperCase() + targetRole.slice(1).toLowerCase()) : rawType === 'admin' ? 'Admin' : rawType === 'worker' ? 'Worker' : 'Client') as 'Admin' | 'Client' | 'Worker',
        gender: isGirlClient(resolvedDirectName) ? 'girl' : 'boy',
        counterpartName: user?.name || (isAdminRole ? 'Administrator' : isClientRole ? 'Client' : 'Worker'),
        counterpartRole: isAdminRole ? 'Admin' : isClientRole ? 'Client' : 'Worker',
        crewOrAddress: targetEmail || (rawType === 'admin' ? 'Operations HQ' : rawType === 'worker' ? 'Field Service Base' : 'Facility Client Account'),
        category: rawType === 'admin' ? 'Operations Administration' : rawType === 'worker' ? 'Field Operations' : 'Facility Request',
        taskTitle: 'Direct Operational Chat',
        status: 'Active',
        complaintsCount: 0,
        email: targetEmail,
        isDirectChat: true,
      };

      const alreadyHasChannel = allCandidatePool.some(c => 
        (c.name && newDirect!.name && c.name.toLowerCase().trim() === newDirect!.name.toLowerCase().trim() && c.type === newDirect!.type) ||
        (decodedWorkOrderId && (c.orderCode === decodedWorkOrderId || c.orderId === decodedWorkOrderId))
      );

      if (!alreadyHasChannel) {
        setCustomChannels(prev => {
          if (prev.some(c => c.id === newDirect!.id || (c.name.toLowerCase() === newDirect!.name.toLowerCase() && c.type === newDirect!.type))) {
            return prev;
          }
          return [newDirect!, ...prev];
        });
      }
    }

    const target = matchedChannel || newDirect;
    if (target) {
      // Un-delete target channel across all variations so it is never hidden
      const unDeleteKeys = [
        target.id,
        target.orderCode,
        target.orderId,
        target.userId,
        target.orderCode ? `cli_${target.orderCode}` : '',
        target.orderCode ? `wrk_${target.orderCode}` : '',
        `cli_${target.id}`,
        `wrk_${target.id}`,
        `direct_${target.userId}`,
        `direct_${target.id}`,
      ].filter(Boolean) as string[];

      setDeletedChannelIds(prev => {
        const next = prev.filter(id => !unDeleteKeys.includes(id));
        try {
          localStorage.setItem(deletedChannelsStorageKey, JSON.stringify(next));
        } catch {}
        return next;
      });

      setSelectedChannelId(target.id);
      setActiveOrderId(target.orderId || target.orderCode || target.id);
      if (isAdminRole) {
        if (target.type === 'admin') setChatTargetFilter('admins');
        else if (target.type === 'worker') setChatTargetFilter('workers');
        else if (target.type === 'client') setChatTargetFilter('clients');
      }
      setActiveTab('orders');
    }

    if (decodedWorkOrderId && workOrders.length > 0) {
      const match = workOrders.find(w => (w._id || w.id) === decodedWorkOrderId || w.workOrderCode === decodedWorkOrderId);
      if (match) {
        const chosenId = (match._id || match.id || match.workOrderCode) as string;
        setActiveOrderId(chosenId);
        setCurrentOrder(match);
        setActiveTab('orders');
      }
    }
  }, [workOrderId, adminChannels, clientWorkerChannels, workerClientChannels, customChannels, isAdminRole, isClientRole, isFieldRole, user, workOrders, directoryContacts]);

  // Fetch Complaints from Backend
  const fetchComplaints = async () => {
    try {
      const res = await apiClient.get(ENDPOINTS.CHAT.COMPLAINTS);
      if (res.data?.success && Array.isArray(res.data.data)) {
        setComplaints(res.data.data);
      }
    } catch (e) {
      // Use fallback seeded complaints
    }
  };

  useEffect(() => {
    fetchComplaints();
  }, []);

  // Synchronize Active Work Order Chat
  useEffect(() => {
    if (activeTab !== 'orders') return;

    if (!activeChannel) {
      setMessages([]);
      return;
    }

    // Use channel.id (e.g. 'cli_WO-2026-0006' or 'wrk_WO-2026-0006' or 'adm_A-0011' or 'direct_...') as the message key
    // so all client, worker, admin, and direct conversations are strictly isolated
    const currentKey = activeChannel.id || activeChannel.orderCode || 'direct';
    const cleanK = String(currentKey || '').replace(/^(?:cli_|wrk_|direct_)/, '');
    const channelMsgs = orderChatHistory[currentKey] || 
                        orderChatHistory[cleanK] || 
                        orderChatHistory[`cli_${cleanK}`] || 
                        orderChatHistory[`wrk_${cleanK}`] || 
                        orderChatHistory[`direct_${cleanK}`] || [];
    setMessages(channelMsgs);

    const targetChatId = activeOrderId || activeChannel.orderId || activeChannel.orderCode || currentKey;
    clearUnread();
    apiClient.patch(`/chat/${encodeURIComponent(targetChatId)}/read`).catch(() => {});

    const loadChat = async () => {
      try {
        if (!activeChannel.isDirectChat && activeOrderId?.startsWith('WO-')) {
          apiClient.get(ENDPOINTS.WORK_ORDERS.BY_ID(activeOrderId)).then(woRes => {
            if (woRes.data?.data) setCurrentOrder(woRes.data.data);
          }).catch(() => {});
        }

        const msgRes = await apiClient.get(ENDPOINTS.CHAT.MESSAGES(encodeURIComponent(targetChatId)));
        if (msgRes.data?.success && Array.isArray(msgRes.data.data)) {
          setMessages(msgRes.data.data);
          setOrderChatHistory(prev => ({
            ...prev,
            [currentKey]: msgRes.data.data,
            [cleanK]: msgRes.data.data,
            [`cli_${cleanK}`]: msgRes.data.data,
            [`wrk_${cleanK}`]: msgRes.data.data,
            [`direct_${cleanK}`]: msgRes.data.data,
          }));
        }
      } catch (err) {
        // Fallback seeded messages or clean empty chat
      }
    };

    loadChat();

    // Socket.IO real-time connection with resilient channel key matching
    socketClient.connect();
    const socket = socketClient.getSocket();
    if (socket) {
      socket.emit('chat:join', currentKey);
      if (targetChatId !== currentKey) socket.emit('chat:join', targetChatId);

      if (cleanK) {
        socket.emit('chat:join', cleanK);
        socket.emit('chat:join', `chat:${cleanK}`);
        socket.emit('chat:join', `cli_${cleanK}`);
        socket.emit('chat:join', `wrk_${cleanK}`);
      }

      const handleIncomingMessage = (newMsg: Message & { channelId?: string; workOrderId?: string; cleanId?: string }) => {
        if (!newMsg || !newMsg.message) return;
        const incomingClean = String(newMsg.channelId || newMsg.workOrderId || newMsg.cleanId || '').replace(/^(?:cli_|wrk_|direct_)/, '').toLowerCase().trim();
        const currentClean = String(currentKey || '').replace(/^(?:cli_|wrk_|direct_)/, '').toLowerCase().trim();
        const targetClean = String(targetChatId || '').replace(/^(?:cli_|wrk_|direct_)/, '').toLowerCase().trim();
        const activeOrderClean = String(activeOrderId || '').replace(/^(?:cli_|wrk_|direct_)/, '').toLowerCase().trim();

        const isMatch = 
          newMsg.channelId === currentKey ||
          newMsg.channelId === targetChatId ||
          (incomingClean && (incomingClean === currentClean || incomingClean === targetClean || incomingClean === activeOrderClean));

        if (!isMatch) return;

        setMessages((prev) => {
          if (prev.some(m => isSameChatMessage(m, newMsg))) return prev;
          const updated = [...prev, newMsg];
          setOrderChatHistory(h => ({
            ...h,
            [currentKey]: updated,
            [cleanK]: updated,
            [`cli_${cleanK}`]: updated,
            [`wrk_${cleanK}`]: updated,
          }));
          return updated;
        });
      };

      socket.on('chat:message', handleIncomingMessage);

      const handleChatCleared = (data: any) => {
        if (!data || data.workOrderId === activeOrderId || data.workOrderId === targetChatId || data.workOrderId === currentKey) {
          setMessages([]);
          setOrderChatHistory(h => ({ ...h, [currentKey]: [] }));
        }
      };
      socket.on('chat:cleared', handleChatCleared);

      return () => {
        socket.off('chat:message', handleIncomingMessage);
        socket.off('chat:cleared', handleChatCleared);
      };
    }
  }, [activeOrderId, selectedChannelId, activeTab, activeChannel?.id]);

  // Synchronize Active Complaint Chat
  useEffect(() => {
    if (activeTab !== 'complaints' || !activeComplaintId) return;

    const activeCmp = complaints.find(c => c._id === activeComplaintId);
    if (activeCmp && activeCmp.messages && activeCmp.messages.length > 0) {
      setComplaintMessages(activeCmp.messages);
    }

    const loadCmpMessages = async () => {
      try {
        const res = await apiClient.get(ENDPOINTS.CHAT.COMPLAINT_MESSAGES(activeComplaintId));
        if (res.data?.success && Array.isArray(res.data.data) && res.data.data.length > 0) {
          setComplaintMessages(res.data.data);
        }
      } catch (e) {}
    };

    loadCmpMessages();

    // Socket listener for complaint messages
    const socket = socketClient.getSocket();
    if (socket) {
      const handleComplaintMsg = (data: any) => {
        if (!data || data.complaintId !== activeComplaintId) return;
        setComplaintMessages((prev) => {
          if (prev.some(m => isSameChatMessage(m, data))) return prev;
          return [...prev, data];
        });
      };

      socket.on('complaint:message', handleComplaintMsg);
      return () => {
        socket.off('complaint:message', handleComplaintMsg);
      };
    }
  }, [activeComplaintId, activeTab, complaints]);

  // Keep the window anchored at the top when entering chat across all portals
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, []);

  // Scroll ONLY the inner message container to bottom without scrolling parent window
  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [messages, complaintMessages, activeOrderId, activeComplaintId]);

  // ─── Single Clean Dispatch (Prevents sending message twice!) ───
  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || isSending) return;

    const text = inputText.trim();
    setInputText('');
    setIsSending(true);

    if (activeTab === 'orders') {
      // Use channel ID for strict 1-to-1 isolation (e.g. 'cli_WO-2026-0006' or 'wrk_WO-2026-0006')
      const currentKey = activeChannel?.id || activeChannel?.orderCode || activeOrderId || 'direct';
      const cleanKey = String(currentKey).replace(/^(?:cli_|wrk_|direct_)/, '');
      const targetId = activeOrderId || activeChannel?.orderId || activeChannel?.orderCode || cleanKey || currentKey;
      try {
        // Send via HTTP API which persists and notifies via server socket
        const res = await apiClient.post(ENDPOINTS.CHAT.MESSAGES(encodeURIComponent(targetId)), {
          message: text,
          channelId: currentKey,
        });

        if (res.data?.success && res.data?.data) {
          const newMsg = res.data.data;
          setMessages((prev) => {
            if (prev.some(m => isSameChatMessage(m, newMsg))) return prev;
            return [...prev, newMsg];
          });
          setOrderChatHistory(h => ({
            ...h,
            [currentKey]: [...(h[currentKey] || []).filter(m => !isSameChatMessage(m, newMsg)), newMsg],
            [cleanKey]: [...(h[cleanKey] || []).filter(m => !isSameChatMessage(m, newMsg)), newMsg],
            [`cli_${cleanKey}`]: [...(h[`cli_${cleanKey}`] || []).filter(m => !isSameChatMessage(m, newMsg)), newMsg],
            [`wrk_${cleanKey}`]: [...(h[`wrk_${cleanKey}`] || []).filter(m => !isSameChatMessage(m, newMsg)), newMsg],
            [`direct_${cleanKey}`]: [...(h[`direct_${cleanKey}`] || []).filter(m => !isSameChatMessage(m, newMsg)), newMsg],
          }));
        }
      } catch (err: any) {
        // Fallback local dispatch for instant responsive UI
        const senderDisplayName = user?.name 
          ? `${user.name} (${effectiveRole === 'admin' ? 'Admin' : isClientRole ? 'Client' : 'Worker'})`
          : (effectiveRole === 'admin' ? 'Administrator' : isClientRole ? 'Client' : 'Worker');
        const localMsg: Message = {
          _id: 'local_' + Date.now(),
          senderId: { _id: currentUserId || 'usr_local', name: senderDisplayName },
          senderRole: effectiveRole === 'admin' ? 'Admin' : (isClientRole ? 'Client' : 'FieldTeam'),
          message: text,
          sentAt: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, localMsg]);
        setOrderChatHistory(h => ({
          ...h,
          [currentKey]: [...(h[currentKey] || []), localMsg],
          [cleanKey]: [...(h[cleanKey] || []), localMsg],
          [`cli_${cleanKey}`]: [...(h[`cli_${cleanKey}`] || []), localMsg],
          [`wrk_${cleanKey}`]: [...(h[`wrk_${cleanKey}`] || []), localMsg],
        }));
      } finally {
        setIsSending(false);
      }
    } else {
      // Sending in Complaints Thread
      if (!activeComplaintId) {
        setIsSending(false);
        return;
      }
      try {
        const res = await apiClient.post(ENDPOINTS.CHAT.COMPLAINT_MESSAGES(activeComplaintId), {
          message: text,
        });

        if (res.data?.success && res.data?.data) {
          const newMsg = res.data.data;
          setComplaintMessages((prev) => {
            if (prev.some(m => isSameChatMessage(m, newMsg))) return prev;
            return [...prev, newMsg];
          });
          // Update local complaint store messages
          setComplaints(prev => prev.map(c => {
            if (c._id === activeComplaintId) {
              const existing = c.messages || [];
              if (existing.some(m => isSameChatMessage(m, newMsg))) return c;
              return { ...c, messages: [...existing, newMsg] };
            }
            return c;
          }));
        }
      } catch (err: any) {
        // Fallback local dispatch for complaint messages
        const senderDisplayName = effectiveRole === 'admin' ? 'Abdullah (Admin Supervisor)' : (activeComplaint?.filedBy?.name || 'Client');
        const localMsg: Message = {
          _id: 'local_cmp_' + Date.now(),
          senderId: { _id: currentUserId || 'usr_local', name: senderDisplayName },
          senderRole: effectiveRole === 'admin' ? 'Admin' : 'Client',
          message: text,
          sentAt: new Date().toISOString(),
        };
        setComplaintMessages((prev) => [...prev, localMsg]);
        setComplaints(prev => prev.map(c => {
          if (c._id === activeComplaintId) {
            const existing = c.messages || [];
            return { ...c, messages: [...existing, localMsg] };
          }
          return c;
        }));
      } finally {
        setIsSending(false);
      }
    }
  };

  // Handle Permanent Chat Deletion
  const handleDeleteChat = async () => {
    if (!confirmDeleteWo) return;
    const targetId = confirmDeleteWo.id;
    const targetCode = confirmDeleteWo.code;
    const targetChannelId = confirmDeleteWo.channelId;
    // Clear both the cli_ and wrk_ channel keys for this order
    const cliKey = `cli_${targetCode}`;
    const wrkKey = `wrk_${targetCode}`;
    setIsDeletingChat(true);

    const idsToDelete = [
      targetId,
      targetCode,
      targetChannelId,
      cliKey,
      wrkKey,
      targetId ? `cli_${targetId}` : '',
      targetId ? `wrk_${targetId}` : '',
    ].filter(Boolean) as string[];

    // 1. Immediately update deleted channels in role-scoped localStorage only
    const updatedDeleted = Array.from(new Set([...deletedChannelIds, ...idsToDelete]));
    setDeletedChannelIds(updatedDeleted);
    try {
      localStorage.setItem(deletedChannelsStorageKey, JSON.stringify(updatedDeleted));
    } catch {}

    // 2. Clear message history for this portal's view
    setOrderChatHistory(h => {
      const next = { ...h };
      delete next[targetCode];
      delete next[targetId];
      delete next[targetChannelId];
      delete next[cliKey];
      delete next[wrkKey];
      return next;
    });

    // 3. Clear active messages if the deleted channel was currently open in this portal
    const isCurrentlyActive = 
      selectedChannelId === targetChannelId ||
      selectedChannelId === cliKey ||
      selectedChannelId === wrkKey ||
      activeOrderId === targetId ||
      activeOrderId === targetCode ||
      activeChannel?.orderCode === targetCode ||
      activeChannel?.id === targetChannelId;

    const remainingChannels = displayedChannels.filter(c => 
      c.id !== targetChannelId &&
      c.id !== cliKey &&
      c.id !== wrkKey &&
      c.orderCode !== targetCode &&
      (!targetId || c.orderId !== targetId)
    );

    if (isCurrentlyActive) {
      if (remainingChannels.length > 0) {
        const nextChannel = remainingChannels[0];
        setSelectedChannelId(nextChannel.id);
        const nextWo = workOrders.find(
          w => w.workOrderCode === nextChannel.orderCode || (w._id || w.id) === (nextChannel.orderId || nextChannel.orderCode)
        );
        if (nextWo) {
          setCurrentOrder(nextWo);
          setActiveOrderId((nextWo._id || nextWo.id || nextChannel.orderCode) as string);
        } else {
          setActiveOrderId(nextChannel.orderId || nextChannel.orderCode);
        }
        const nextMsgs = orderChatHistory[nextChannel.id] || ((isDemoAccount || isAdminRole) ? SEEDED_ORDER_MESSAGES[nextChannel.id] : []) || [];
        setMessages(nextMsgs);
      } else {
        setSelectedChannelId('');
        setActiveOrderId('');
        setCurrentOrder(null);
        setMessages([]);
      }
    }

    try {
      // Inform backend that this specific user/portal has hidden this conversation
      await apiClient.delete(ENDPOINTS.CHAT.DELETE_MESSAGES(targetId)).catch(() => {});
      if (confirmDeleteWo.code && confirmDeleteWo.code !== targetId) {
        await apiClient.delete(ENDPOINTS.CHAT.DELETE_MESSAGES(confirmDeleteWo.code)).catch(() => {});
      }
      if (targetChannelId && targetChannelId !== targetId && targetChannelId !== targetCode) {
        await apiClient.delete(ENDPOINTS.CHAT.DELETE_MESSAGES(targetChannelId)).catch(() => {});
      }

      toast.success(`Conversation for ${confirmDeleteWo.code || 'order'} removed from your portal`);
    } catch (err: any) {
      toast.success(`Conversation for ${confirmDeleteWo.code || 'order'} removed from your portal`);
    } finally {
      setIsDeletingChat(false);
      setConfirmDeleteWo(null);
    }
  };

  // Handle Filing New Complaint (Clients & Workers only)
  const handleFileComplaint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isAdmin) {
      toast.error('Admins supervise disputes and cannot file complaints against facility teams.');
      return;
    }
    if (!newTitle.trim() || !newDescription.trim()) {
      toast.error('Please enter complaint title and detailed description');
      return;
    }

    setIsSubmittingComplaint(true);
    const relatedWo = workOrders.find(w => (w._id || w.id) === newWoId);

    try {
      const res = await apiClient.post(ENDPOINTS.CHAT.COMPLAINTS, {
        title: newTitle.trim(),
        category: newCategory,
        workOrderId: newWoId,
        workOrderTitle: relatedWo?.title || relatedWo?.workOrderCode || 'Facility Maintenance',
        severity: newSeverity,
        description: newDescription.trim(),
      });

      if (res.data?.success && res.data?.data) {
        const createdCmp = res.data.data;
        setComplaints(prev => [createdCmp, ...prev]);
        setActiveComplaintId(createdCmp._id);
        setActiveTab('complaints');
        setIsNewComplaintOpen(false);
        setNewTitle('');
        setNewDescription('');
        toast.success(`Complaint ${createdCmp.complaintCode} filed successfully!`);
      }
    } catch (err: any) {
      toast.error('Failed to submit complaint: ' + (err.response?.data?.message || err.message));
    } finally {
      setIsSubmittingComplaint(false);
    }
  };

  // Update Complaint Status (e.g. Resolve by Admin)
  const handleToggleComplaintStatus = async (cmpId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'Resolved' ? 'Open' : 'Resolved';
    try {
      const res = await apiClient.patch(ENDPOINTS.CHAT.COMPLAINT_STATUS(cmpId), { status: nextStatus });
      if (res.data?.success) {
        setComplaints(prev => prev.map(c => c._id === cmpId ? { ...c, status: nextStatus } : c));
        toast.success(`Complaint status changed to ${nextStatus}`);
      }
    } catch (e: any) {
      toast.error('Failed to update status');
    }
  };

  const orderTargetCode = currentOrder?.workOrderCode || activeChannel?.orderCode || activeOrderId;
  const currentOrderComplaints = complaints.filter(
    c => c.workOrderId === orderTargetCode || 
         c.workOrderId === currentOrder?._id || 
         c.workOrderId === currentOrder?.id ||
         ORDER_COMPLAINT_MAP[orderTargetCode] === c._id
  );
  const hasActiveComplaint = currentOrderComplaints.length > 0;
  const activeComplaint = complaints.find(c => c._id === activeComplaintId) || currentOrderComplaints[0];

  const filteredComplaints = complaints.filter(c => {
    if (complaintStatusFilter === 'All') return true;
    return c.status === complaintStatusFilter;
  });

  // Participant Name Formatter with standard Client and Worker roles (strictly Client & Worker)
  const formatParticipantName = (rawName: string, role?: string) => {
    if (!rawName) return 'Participant';
    if (role === 'Admin') return rawName + ' (Admin)';
    if (role === 'Worker' || role === 'FieldTeam') return rawName + ' (Worker)';
    if (role === 'Client') return rawName + ' (Client)';
    return rawName;
  };

  // Severity Badge Renderer (HIGH text completely eliminated)
  const renderSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'Urgent':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-500/20 text-rose-400 border border-rose-500/30 uppercase">Urgent</span>;
      case 'High':
      case 'Elevated':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 uppercase">Priority</span>;
      case 'Medium':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">Medium</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-zinc-800 text-zinc-400">Low</span>;
    }
  };

  // Status Badge Renderer for Complaints
  const renderComplaintStatus = (status: string) => {
    switch (status) {
      case 'Resolved':
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Resolved</span>;
      case 'Investigating':
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-1"><Clock className="w-3 h-3" /> Investigating</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Open</span>;
    }
  };

  // In-conversation message filtering for active chat
  const activeList = activeTab === 'orders' ? messages : complaintMessages;
  const displayedMessages = React.useMemo(() => {
    const q = messageSearchQuery.trim().toLowerCase();
    if (!q) return activeList;
    return activeList.filter((m: any) => {
      const text = (m.message || '').toLowerCase();
      const sender = (
        typeof m.senderId === 'object' && m.senderId 
          ? m.senderId.name 
          : (m.senderRole || '')
      ).toLowerCase();
      return text.includes(q) || sender.includes(q);
    });
  }, [activeList, messageSearchQuery]);

  return (
    <div className="w-full pb-6">
      {/* ─── Top Main Chat Layout ─── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Left Panel: Direct Channels with Clients & Workers */}
        <Card className={cn(
          "border shadow-sm bg-white text-gray-900 overflow-hidden flex flex-col h-[480px] rounded-2xl",
          isClientRole ? "border-teal-200/80" : isFieldRole ? "border-amber-200/80" : "border-purple-200/80"
        )}>
          {/* ─── Top Options: All, Clients, Workers (ADMIN ONLY) ─── */}
          {isAdminRole && (
            <div className="p-3 border-b border-purple-100 bg-purple-50/40 shrink-0 space-y-2">
              <div className="flex items-center p-1 bg-white rounded-xl border border-purple-200 shadow-2xs w-full gap-1">
                <button
                  type="button"
                  onClick={() => setChatTargetFilter('all')}
                  className={`flex-1 flex items-center justify-center py-2 px-1 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    chatTargetFilter === 'all'
                      ? 'bg-purple-600 text-white shadow-xs shadow-purple-600/30'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-purple-50'
                  }`}
                >
                  All
                </button>

                <button
                  type="button"
                  onClick={() => setChatTargetFilter('admins')}
                  className={`flex-1 flex items-center justify-center py-2 px-1 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    chatTargetFilter === 'admins'
                      ? 'bg-purple-600 text-white shadow-xs shadow-purple-600/30'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-purple-50'
                  }`}
                >
                  Admins
                </button>

                <button
                  type="button"
                  onClick={() => setChatTargetFilter('clients')}
                  className={`flex-1 flex items-center justify-center py-2 px-1 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    chatTargetFilter === 'clients'
                      ? 'bg-purple-600 text-white shadow-xs shadow-purple-600/30'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-purple-50'
                  }`}
                >
                  Clients
                </button>

                <button
                  type="button"
                  onClick={() => setChatTargetFilter('workers')}
                  className={`flex-1 flex items-center justify-center py-2 px-1 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    chatTargetFilter === 'workers'
                      ? 'bg-purple-600 text-white shadow-xs shadow-purple-600/30'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-purple-50'
                  }`}
                >
                  Workers
                </button>
              </div>

              {deletedChannelIds.length > 0 && (
                <div className="flex items-center justify-between px-1 text-[11px] text-gray-500">
                  <span>Conversations filtered ({deletedChannelIds.length})</span>
                  <button
                    type="button"
                    onClick={() => {
                      setDeletedChannelIds([]);
                      try {
                        localStorage.removeItem('clearflow_deleted_chat_channels');
                        localStorage.removeItem(deletedChannelsStorageKey);
                      } catch {}
                      toast.success("All conversations restored successfully");
                    }}
                    className="text-purple-600 hover:text-purple-800 font-bold hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Restore All
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ─── Channel Search Bar (Admin, Client, Worker) ─── */}
          <div className={cn(
            "p-2.5 border-b shrink-0",
            isClientRole 
              ? "border-teal-100 bg-teal-50/30" 
              : isFieldRole 
              ? "border-amber-100 bg-amber-50/30" 
              : "border-purple-100 bg-purple-50/30"
          )}>
            <div className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-xl border bg-white shadow-2xs transition-all",
              isClientRole
                ? "border-teal-200 focus-within:border-teal-500 focus-within:ring-2 focus-within:ring-teal-100"
                : isFieldRole
                ? "border-amber-200 focus-within:border-amber-500 focus-within:ring-2 focus-within:ring-amber-100"
                : "border-purple-200 focus-within:border-purple-500 focus-within:ring-2 focus-within:ring-purple-100"
            )}>
              <Search className={cn(
                "w-3.5 h-3.5 shrink-0",
                isClientRole ? "text-teal-600" : isFieldRole ? "text-amber-600" : "text-purple-600"
              )} />
              <input
                type="text"
                value={channelSearchQuery}
                onChange={(e) => setChannelSearchQuery(e.target.value)}
                placeholder="Search conversations, orders, or contacts..."
                className="w-full text-xs bg-transparent border-0 outline-hidden text-gray-800 placeholder-gray-400"
              />
              {channelSearchQuery && (
                <button
                  type="button"
                  onClick={() => setChannelSearchQuery('')}
                  className="text-gray-400 hover:text-gray-600 p-0.5 rounded cursor-pointer transition-colors"
                  title="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Non-admin portal restore pill if user deleted any channels */}
            {!isAdminRole && deletedChannelIds.length > 0 && (
              <div className="flex items-center justify-between px-1 pt-2 text-[11px] text-gray-500">
                <span>Hidden in this portal ({deletedChannelIds.length})</span>
                <button
                  type="button"
                  onClick={() => {
                    setDeletedChannelIds([]);
                    try {
                      localStorage.removeItem(deletedChannelsStorageKey);
                    } catch {}
                    toast.success("Conversations restored to your portal");
                  }}
                  className={cn(
                    "font-bold hover:underline cursor-pointer flex items-center gap-1",
                    isClientRole ? "text-teal-600 hover:text-teal-800" : "text-amber-700 hover:text-amber-900"
                  )}
                >
                  <RotateCcw className="w-3 h-3" />
                  Restore
                </button>
              </div>
            )}
          </div>

          {/* List Content: Channels named by Clients & Workers */}
          <div className={cn(
            "flex-1 overflow-y-auto font-normal divide-y",
            isClientRole ? "divide-teal-100/70" : isFieldRole ? "divide-amber-100/70" : "divide-purple-100/70"
          )}>
            {displayedChannels.length === 0 ? (
              channelSearchQuery.trim() ? (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-gray-500 text-xs">
                  <Search className="w-8 h-8 text-gray-300 mb-2" />
                  <p className="font-semibold text-gray-700">No Conversations Found</p>
                  <p className="text-[11px] text-gray-400 mt-1 max-w-[200px]">
                    No conversations match &ldquo;{channelSearchQuery}&rdquo;
                  </p>
                  <button
                    type="button"
                    onClick={() => setChannelSearchQuery('')}
                    className="mt-3 px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-600 hover:bg-gray-100 border border-gray-200 transition-colors cursor-pointer"
                  >
                    Clear Search
                  </button>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-gray-500 text-xs">
                  <MessageSquare className="w-8 h-8 text-gray-300 mb-2" />
                  <p className="font-semibold text-gray-700">No Conversations Yet</p>
                  <p className="text-[11px] text-gray-400 mt-1 max-w-[200px]">
                    {isClientRole
                      ? "Conversations will appear here when you or a technician exchange messages."
                      : isFieldRole
                      ? "Conversations will appear here when you or a client exchange messages."
                      : "No active conversations yet. Messages will appear once sent or received."}
                  </p>
                  {deletedChannelIds.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setDeletedChannelIds([]);
                        try {
                          localStorage.removeItem('clearflow_deleted_chat_channels');
                          localStorage.removeItem(deletedChannelsStorageKey);
                        } catch {}
                        toast.success("All conversations restored successfully");
                      }}
                      className={cn(
                        "mt-3 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer border transition-colors flex items-center gap-1.5",
                        isClientRole
                          ? "bg-teal-50 text-teal-700 hover:bg-teal-100 border-teal-200"
                          : isFieldRole
                          ? "bg-amber-50 text-amber-800 hover:bg-amber-100 border-amber-200"
                          : "bg-purple-50 text-purple-700 hover:bg-purple-100 border-purple-200"
                      )}
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Restore Conversations
                    </button>
                  )}
                </div>
              )
            ) : (
              displayedChannels.map((channel) => {
                const isSelected = (channel.id === selectedChannelId || channel.id === activeChannel?.id) && activeTab === 'orders';
                const isWorker = channel.type === 'worker';
                const isAdmin = channel.type === 'admin';
                const channelKey = channel.id;
                const cleanCode = (channel.orderCode || channel.id).replace(/^(?:cli_|wrk_|direct_)/, '');
                const channelMsgs = orderChatHistory[channelKey] ||
                                    orderChatHistory[cleanCode] ||
                                    orderChatHistory[`cli_${cleanCode}`] ||
                                    orderChatHistory[`wrk_${cleanCode}`] ||
                                    orderChatHistory[`direct_${cleanCode}`] ||
                                    ((isDemoAccount || isAdminRole) ? SEEDED_ORDER_MESSAGES[channelKey] : []) || [];
                const channelMessageCount = channelMsgs.length;
                const lastMsg = channelMessageCount > 0 ? channelMsgs[channelMessageCount - 1] : null;
                const lastMsgSnippet = lastMsg ? (lastMsg.message || '') : '';

                return (
                  <div
                    key={channel.id}
                    onClick={() => {
                      setSelectedChannelId(channel.id);
                      const targetWo = workOrders.find(
                        w => w.workOrderCode === channel.orderCode || (w._id || w.id) === (channel.orderId || channel.orderCode)
                      );
                      if (targetWo) {
                        setCurrentOrder(targetWo);
                        setActiveOrderId((targetWo._id || targetWo.id || channel.orderCode) as string);
                      } else {
                        setActiveOrderId(channel.orderId || channel.orderCode);
                      }
                      setMessages(channelMsgs);
                      setActiveTab('orders');
                    }}
                    className={cn(
                      "p-3.5 cursor-pointer transition-colors",
                      isSelected 
                        ? (isClientRole ? 'bg-teal-100/70 border-l-4 border-l-teal-600 text-gray-950 font-medium' : isFieldRole ? 'bg-amber-100/70 border-l-4 border-l-amber-600 text-gray-950 font-medium' : 'bg-purple-100/70 border-l-4 border-l-purple-600 text-gray-950 font-medium')
                        : (isClientRole ? 'hover:bg-teal-50/50 text-gray-700' : isFieldRole ? 'hover:bg-amber-50/50 text-gray-700' : 'hover:bg-purple-50/50 text-gray-700')
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      {/* Left: Avatar & Contact Details */}
                      <div className="flex items-start gap-2.5 min-w-0 flex-1">
                        <div 
                          className={cn(
                            "h-9 w-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 shadow-2xs border mt-0.5 select-none",
                            isAdmin
                              ? "bg-purple-100 text-purple-800 border-purple-300 ring-1 ring-purple-200"
                              : isWorker
                              ? "bg-amber-100 text-amber-800 border-amber-300 ring-1 ring-amber-200"
                              : "bg-teal-100 text-teal-800 border-teal-200 ring-1 ring-teal-100"
                          )}
                        >
                          {channel.name ? channel.name.split(' ').map((n: string) => n[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() : (isAdmin ? 'AD' : isWorker ? 'FT' : 'CL')}
                        </div>

                        <div className="min-w-0 flex-1">
                          {/* Primary Name & Role Badge - strictly on the same line */}
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="font-bold text-xs text-gray-900 truncate">
                              {channel.name}
                            </span>
                            <span className={cn(
                              "px-1.5 py-0.2 rounded text-[9.5px] font-semibold shrink-0 border whitespace-nowrap",
                              isAdmin
                                ? "bg-purple-100 text-purple-800 border-purple-200"
                                : isWorker
                                ? "bg-amber-100 text-amber-800 border-amber-200"
                                : "bg-teal-100 text-teal-800 border-teal-200"
                            )}>
                              {channel.role}
                            </span>
                          </div>

                          {/* Counterpart / Crew info */}
                          {isClientRole ? (
                            <div className="text-[11px] text-teal-800 font-medium mt-0.5 truncate">
                              <span>{channel.crewOrAddress}</span>
                              <span className="text-teal-400 mx-1">•</span>
                              <span className="text-gray-500 font-normal">Assigned Crew</span>
                            </div>
                          ) : (
                            <div className="text-[11px] text-gray-600 mt-0.5 truncate">
                              <b className="text-gray-900">{channel.counterpartName}</b>
                              <span className="text-gray-400 mx-1">•</span>
                              <span className="text-gray-500">{channel.crewOrAddress}</span>
                            </div>
                          )}

                          {/* Work Order Title & Category */}
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {channel.category && <CategorySquircleLogo name={channel.category} size="xs" />}
                            <p className="text-[10.5px] text-gray-500 line-clamp-1">
                              <span className={cn(
                                "font-semibold",
                                isClientRole ? "text-teal-700" : isFieldRole ? "text-amber-800" : "text-purple-700"
                              )}>
                                {channel.category}:
                              </span>{" "}
                              {lastMsgSnippet || channel.taskTitle || "Direct Conversation"}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Right side: Top (Status badge) & Bottom (Delete button) */}
                      <div className="flex flex-col items-end gap-1.5 shrink-0 pt-0.5">
                        {/* Top: Status only */}
                        <div className="flex items-center">
                          {renderOrderStatusPill(channel.status || 'Active')}
                        </div>

                        {/* Bottom: Delete button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmDeleteWo({
                              id: channel.orderId || channel.orderCode || channel.id,
                              code: channel.orderCode || channel.id,
                              channelId: channel.id,
                              clientName: (isWorker ? channel.counterpartName : channel.name) || 'Client',
                              workerName: (isWorker ? channel.name : channel.counterpartName) || 'Worker'
                            });
                          }}
                          className="p-1 rounded-md text-gray-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 cursor-pointer transition-colors"
                          title={`Delete chat history for ${channel.orderCode}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Card>

        {/* Right Panel: Chat Thread Window */}
        <Card className={cn(
          "md:col-span-2 border shadow-sm h-[480px] flex flex-col overflow-hidden bg-white rounded-2xl",
          isClientRole ? "border-teal-200/80" : isFieldRole ? "border-amber-200/80" : "border-purple-200/80"
        )}>
          {activeTab === 'orders' && !activeChannel ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-gray-50/50">
              <div className={cn(
                "w-16 h-16 rounded-2xl flex items-center justify-center shadow-xs mb-3 border",
                isClientRole ? "bg-teal-50 text-teal-600 border-teal-200" : isFieldRole ? "bg-amber-50 text-amber-600 border-amber-200" : "bg-purple-50 text-purple-600 border-purple-200"
              )}>
                <MessageSquare className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-gray-900">No Active Conversations</h3>
              <p className="text-xs text-gray-500 max-w-sm mt-1 leading-relaxed">
                {isClientRole
                  ? "Direct messaging with your assigned technician will automatically connect once you submit a service request."
                  : isFieldRole
                  ? "Direct messaging with clients will appear here once you accept a service job."
                  : "Select a channel or work order from the left to start messaging."}
              </p>
              {isClientRole && (
                <Button
                  onClick={() => navigate('/work-orders/new')}
                  className="mt-4 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
                >
                  + Create Service Request
                </Button>
              )}
              {isFieldRole && (
                <Button
                  onClick={() => navigate('/work-orders?status=Open')}
                  className="mt-4 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
                >
                  Explore Opportunities
                </Button>
              )}
            </div>
          ) : (
            <>
              {activeTab === 'orders' ? (
            /* Active Order Chat Header: Centered Emoji & Name */
            <div className={cn(
              "py-3.5 px-4 text-white flex items-center justify-between shrink-0 shadow-sm relative",
              isClientRole
                ? "bg-gradient-to-r from-teal-700 via-emerald-800 to-teal-900 border-b border-teal-900/20"
                : isFieldRole
                ? "bg-gradient-to-r from-amber-700 via-amber-800 to-amber-900 border-b border-amber-900/20"
                : "bg-gradient-to-r from-purple-700 via-purple-800 to-indigo-800 border-b border-purple-900/20"
            )}>
              {/* Left spacer so center stays aligned */}
              <div className="w-16 shrink-0 hidden sm:block" />

              {/* Center: Emoji Avatar + Plain Name (No click/detail popup, no crew text) */}
              <div className="flex flex-col items-center justify-center">
                <div
                  className={cn(
                    "h-11 w-11 rounded-full flex items-center justify-center text-sm font-bold shadow-md border mb-1 shrink-0 select-none",
                    activeChannel?.type === 'admin'
                      ? "bg-purple-100 text-purple-900 border-purple-300 ring-2 ring-purple-400/40"
                      : isFieldRole || activeChannel?.type === 'worker'
                      ? "bg-amber-100 text-amber-900 border-amber-300 ring-2 ring-amber-400/40"
                      : "bg-teal-100 text-teal-900 border-teal-200 ring-2 ring-teal-400/40"
                  )}
                >
                  <span className="font-bold text-xs select-none">
                    {activeChannel?.name ? activeChannel.name.split(' ').map((n: string) => n[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() : 'CF'}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-sm leading-tight text-white text-center select-none">
                    {activeChannel?.name || 'Chat'}
                  </span>
                  <span className={cn(
                    "px-1.5 py-0.2 rounded text-[9px] font-bold border",
                    activeChannel?.type === 'admin'
                      ? "bg-purple-900/60 text-purple-200 border-purple-400/40"
                      : activeChannel?.type === 'worker'
                      ? "bg-amber-900/60 text-amber-200 border-amber-400/40"
                      : "bg-teal-900/60 text-teal-200 border-teal-400/40"
                  )}>
                    {activeChannel?.role || 'User'}
                  </span>
                </div>
              </div>

              {/* Right spacer keeping center title aligned */}
              <div className="w-16 shrink-0 hidden sm:block" />
            </div>
          ) : (
            /* Complaint Thread Header */
            <div className="bg-gradient-to-r from-purple-800 via-indigo-900 to-purple-950 border-b border-purple-900/30 p-4 text-white shrink-0 shadow-sm">
              <div className="flex items-center justify-between gap-3 mb-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab('orders')}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-white/15 hover:bg-white/25 text-white border border-white/20 transition-all cursor-pointer shadow-2xs"
                    title="Return to standard direct work order chat"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back to Order Chat</span>
                  </button>
                  <span className="font-mono text-xs font-bold text-rose-200 px-2.5 py-0.5 rounded-md bg-rose-500/30 border border-rose-400/40">
                    {activeComplaint?.complaintCode || 'CMP-2026-001'}
                  </span>
                  {activeComplaint && renderSeverityBadge(activeComplaint.severity)}
                  {activeComplaint && renderComplaintStatus(activeComplaint.status)}
                </div>

                <div className="flex items-center gap-2">
                  {effectiveRole === 'admin' && activeComplaint && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleToggleComplaintStatus(activeComplaint._id, activeComplaint.status)}
                      className="h-7 text-xs font-bold bg-white/10 hover:bg-white/20 text-white border-white/30 cursor-pointer"
                    >
                      {activeComplaint.status === 'Resolved' ? 'Reopen Ticket' : 'Mark Resolved'}
                    </Button>
                  )}
                </div>
              </div>

              {/* Title & Prominent Complaint Type Badge */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-rose-500 text-white flex items-center gap-1 shadow-xs">
                    <AlertTriangle className="w-3 h-3" />
                    Type: {activeComplaint?.category || 'Service Dispute'}
                  </span>
                  <h2 className="font-bold text-sm text-white">
                    {activeComplaint?.title || 'Complaint Investigation'}
                  </h2>
                </div>
                <p className="text-[11.5px] text-purple-200 flex items-center gap-2 flex-wrap">
                  <span>Filed by: <b className="text-white">{formatParticipantName(activeComplaint?.filedBy?.name || 'User', activeComplaint?.filedBy?.role)}</b></span>
                  <span>&bull;</span>
                  <span>Target: <b className="text-white">{activeComplaint?.targetParty || 'Field Personnel'}</b></span>
                </p>
              </div>

              {/* If multiple complaints exist on this order, show quick switcher tabs */}
              {currentOrderComplaints.length > 1 && (
                <div className="flex items-center gap-1.5 mt-2.5 pt-2 border-t border-white/10 overflow-x-auto">
                  <span className="text-[10px] text-purple-200 font-bold uppercase tracking-wider shrink-0">
                    Complaints ({currentOrderComplaints.length}):
                  </span>
                  {currentOrderComplaints.map((c, idx) => (
                    <button
                      key={c._id}
                      type="button"
                      onClick={() => {
                        setActiveComplaintId(c._id);
                        if (c.messages) setComplaintMessages(c.messages);
                      }}
                      className={cn(
                        "text-[10.5px] px-2.5 py-1 rounded-md font-bold transition-all cursor-pointer border flex items-center gap-1 whitespace-nowrap",
                        c._id === activeComplaint?._id
                          ? "bg-rose-500 text-white border-rose-400 shadow-xs"
                          : "bg-purple-950/70 text-purple-200 border-purple-700/50 hover:bg-purple-900"
                      )}
                    >
                      <span>#{idx + 1}: {c.category}</span>
                      <span className="text-[9.5px] opacity-80">({c.status})</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* In-Conversation Message Search Sub-bar */}
          {isMessageSearchOpen && (
            <div className={cn(
              "px-3.5 py-2 border-b flex items-center gap-2 shrink-0 animate-in fade-in duration-150",
              isClientRole ? "bg-teal-50/70 border-teal-200/80" : isFieldRole ? "bg-amber-50/70 border-amber-200/80" : "bg-purple-50/70 border-purple-200/80"
            )}>
              <Search className={cn(
                "w-4 h-4 shrink-0",
                isClientRole ? "text-teal-600" : isFieldRole ? "text-amber-600" : "text-purple-600"
              )} />
              <input
                type="text"
                value={messageSearchQuery}
                onChange={(e) => setMessageSearchQuery(e.target.value)}
                placeholder="Search messages in this conversation..."
                className="flex-1 text-xs bg-white border border-gray-200 rounded-lg px-2.5 py-1 text-gray-800 placeholder-gray-400 outline-hidden focus:border-purple-500 shadow-2xs"
                autoFocus
              />
              {messageSearchQuery && (
                <span className="text-[11px] text-gray-600 font-semibold whitespace-nowrap">
                  {displayedMessages.length} {displayedMessages.length === 1 ? 'match' : 'matches'}
                </span>
              )}
              <button
                type="button"
                onClick={() => {
                  setMessageSearchQuery('');
                  setIsMessageSearchOpen(false);
                }}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-md cursor-pointer transition-colors"
                title="Close search"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Messages Body */}
          <CardContent ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 bg-[#FAF8FD] flex flex-col gap-3">
            {/* When in Complaints Mode, show prominent official ticket card with statement */}
            {activeTab === 'complaints' && activeComplaint && (
              <div className="bg-gradient-to-r from-rose-50/95 via-purple-50/80 to-amber-50/80 border border-rose-200/90 rounded-xl p-3.5 shadow-2xs mb-2 shrink-0">
                <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md text-[10.5px] font-bold bg-rose-600 text-white shadow-2xs flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      Official Complaint Ticket
                    </span>
                    <span className="text-xs font-bold text-gray-900">
                      {activeComplaint.category}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] font-bold text-purple-900 bg-purple-100/80 px-2 py-0.5 rounded border border-purple-200">
                      {activeComplaint.complaintCode}
                    </span>
                    {renderComplaintStatus(activeComplaint.status)}
                  </div>
                </div>

                <div className="bg-white/95 p-3 rounded-lg border border-purple-100/90 shadow-2xs">
                  <div className="text-[10.5px] font-bold text-gray-500 uppercase tracking-wider mb-1 flex items-center justify-between">
                    <span>Client Dispute Statement</span>
                    <span className="text-[10px] text-gray-400 font-normal">
                      {activeComplaint.createdAt ? new Date(activeComplaint.createdAt).toLocaleDateString() : 'Active'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-800 leading-relaxed font-semibold italic">
                    "{activeComplaint.description}"
                  </p>
                </div>

                <div className="flex items-center justify-between text-[11px] text-gray-600 mt-2 px-1">
                  <span>Complainant: <b className="text-gray-900">{activeComplaint.filedBy?.name || 'Client'}</b></span>
                  <span>Target Personnel: <b className="text-gray-900">{activeComplaint.targetParty || 'Field Personnel'}</b></span>
                </div>
              </div>
            )}

            {isLoading ? (
              <div className="m-auto text-center text-gray-500">
                <Loader2 className="w-6 h-6 animate-spin text-purple-600 mx-auto mb-2" />
                <p className="text-xs">Loading messages...</p>
              </div>
            ) : (activeTab === 'orders' ? messages.length === 0 : complaintMessages.length === 0) ? (
              activeTab === 'orders' ? (
                <div className="m-auto w-full max-w-md text-center p-6 sm:p-8 animate-in fade-in duration-200">
                  {/* Contact Avatar Circle with Live Status Indicator */}
                  <div className="relative inline-flex items-center justify-center mb-3">
                    <div className={cn(
                      "w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-bold shadow-md border ring-4",
                      activeChannel?.type === 'admin'
                        ? "bg-purple-100 text-purple-800 border-purple-300 ring-purple-50"
                        : activeChannel?.type === 'worker'
                        ? "bg-amber-100 text-amber-800 border-amber-300 ring-amber-50"
                        : "bg-teal-100 text-teal-800 border-teal-300 ring-teal-50"
                    )}>
                      {activeChannel?.name ? activeChannel.name.split(' ').map((n: string) => n[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() : 'CF'}
                    </div>
                    <span className="absolute -bottom-1 -right-1 flex h-4 w-4">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 border-2 border-white"></span>
                    </span>
                  </div>

                  {/* Main Heading */}
                  <h3 className="text-base sm:text-lg font-bold text-gray-900 tracking-tight">
                    Start a New Chat with {activeChannel?.name || 'Contact'}
                  </h3>

                  {/* Role pill & Status */}
                  <div className="flex items-center justify-center gap-2 mt-1.5 mb-3">
                    <span className={cn(
                      "px-2.5 py-0.5 rounded-full text-xs font-bold border",
                      activeChannel?.type === 'admin'
                        ? "bg-purple-100 text-purple-800 border-purple-200"
                        : activeChannel?.type === 'worker'
                        ? "bg-amber-100 text-amber-800 border-amber-200"
                        : "bg-teal-100 text-teal-800 border-teal-200"
                    )}>
                      {activeChannel?.role || 'User'}
                    </span>
                    <span className="text-xs text-gray-400">•</span>
                    <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                      Direct Channel Ready
                    </span>
                  </div>

                  <p className="text-xs text-gray-500 max-w-sm mx-auto leading-relaxed">
                    {activeChannel?.name 
                      ? `No prior messages exchanged with ${activeChannel.name}. Send your first message below to open this conversation.`
                      : 'Send your first message below to open this conversation.'}
                  </p>


                </div>
              ) : (
                <div className="m-auto text-center text-gray-500 p-6">
                  <MessageSquare className="w-10 h-10 text-purple-300 mx-auto mb-2" />
                  <p className="font-semibold text-gray-700 text-sm">No messages yet</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Dispute arbitration channel open for client, worker, and admin.
                  </p>
                </div>
              )
            ) : displayedMessages.length === 0 ? (
              <div className="m-auto text-center text-gray-500 p-6">
                <Search className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="font-semibold text-gray-700 text-xs">No matching messages found</p>
                <p className="text-[11px] text-gray-400 mt-1">
                  No messages match &ldquo;{messageSearchQuery}&rdquo;
                </p>
                <button
                  type="button"
                  onClick={() => setMessageSearchQuery('')}
                  className={cn(
                    "mt-2 text-xs font-semibold hover:underline cursor-pointer",
                    isClientRole ? "text-teal-600" : isFieldRole ? "text-amber-700" : "text-purple-600"
                  )}
                >
                  Clear Message Search
                </button>
              </div>
            ) : (
              displayedMessages.map((m, idx) => {
                const senderIdStr = typeof m.senderId === 'object' && m.senderId ? (m.senderId as any)._id : m.senderId;
                const isMe = senderIdStr === currentUserId || m.senderRole === (isClientRole ? 'Client' : isFieldRole ? 'FieldTeam' : 'Admin');
                const rawName = typeof m.senderId === 'object' && m.senderId 
                  ? (m.senderId as any).name 
                  : (isMe ? 'You' : m.senderRole || 'Personnel');
                const displayName = isMe 
                  ? 'You'
                  : formatParticipantName(rawName, m.senderRole);
                const timeStr = m.sentAt || m.createdAt 
                  ? new Date(m.sentAt || m.createdAt!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
                  : 'Now';
                const isMatch = Boolean(messageSearchQuery.trim()) && (m.message || '').toLowerCase().includes(messageSearchQuery.trim().toLowerCase());

                return (
                  <div 
                    key={m._id || m.id || idx} 
                    className={`flex flex-col max-w-[80%] ${isMe ? 'items-end self-end' : 'items-start self-start'}`}
                  >
                    <span className="text-[10px] text-gray-500 mb-1 px-1 font-semibold">
                      {displayName} &bull; {timeStr}
                    </span>
                    <div className={cn(
                      "px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-xs transition-all",
                      isMatch && "ring-2 ring-offset-2 ring-purple-500 shadow-md",
                      isMe 
                        ? (isClientRole 
                            ? 'bg-teal-600 text-white rounded-tr-none shadow-teal-600/20' 
                            : isFieldRole 
                            ? 'bg-amber-600 text-white rounded-tr-none shadow-amber-600/20' 
                            : 'bg-purple-600 text-white rounded-tr-none shadow-purple-600/20')
                        : (isClientRole
                            ? 'bg-white text-gray-900 border border-teal-100 rounded-tl-none shadow-2xs'
                            : isFieldRole
                            ? 'bg-white text-gray-900 border border-amber-100 rounded-tl-none shadow-2xs'
                            : 'bg-white text-gray-900 border border-purple-100 rounded-tl-none shadow-2xs')
                    )}>
                      {m.message}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </CardContent>

          {/* Active Message Input Bar */}
          <div className={cn(
            "p-3 bg-white border-t shrink-0",
            isClientRole ? "border-teal-100" : isFieldRole ? "border-amber-100" : "border-purple-100"
          )}>
            {/* Status Header Helper */}
            {activeTab === 'orders' ? (
              <div className="flex items-center justify-between text-[10.5px] mb-1.5 px-2 text-gray-500 font-medium">
                <span className={cn(
                  "flex items-center gap-1 font-semibold",
                  isClientRole ? "text-teal-700" : isFieldRole ? "text-amber-800" : "text-purple-700"
                )}>
                  {messages.length === 0 ? (
                    <>
                      <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                      <span className="text-emerald-700 font-bold">New Direct Conversation</span> &bull; {activeChannel?.name} ({activeChannel?.role || 'User'})
                    </>
                  ) : (
                    <>
                      💬 Active Conversation &bull; {activeChannel?.name} ({activeChannel?.role || 'User'})
                    </>
                  )}
                </span>
              </div>
            ) : (
              <div className="flex items-center justify-between text-[10.5px] mb-1.5 px-2 text-rose-700 font-semibold">
                <span className="flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3 text-rose-600" />
                  Support Discussion &bull; {activeComplaint?.category}
                </span>
                <span className="text-gray-400 font-mono text-[10px]">{activeComplaint?.complaintCode}</span>
              </div>
            )}

            <div className="flex items-center gap-2">
              <Input 
                ref={inputRef}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder={
                  activeTab === 'orders' 
                    ? (messages.length === 0 ? `Start conversation with ${activeChannel?.name || 'user'}...` : `Message ${activeChannel?.name || 'worker'} directly...`)
                    : "Type your message..."
                }
                className={cn(
                  "flex-1 rounded-full text-gray-900 text-sm h-10 px-4 placeholder:text-gray-400",
                  isClientRole 
                    ? "bg-teal-50/40 border-teal-200 focus-visible:ring-teal-500" 
                    : isFieldRole 
                    ? "bg-amber-50/40 border-amber-200 focus-visible:ring-amber-500" 
                    : "bg-purple-50/40 border-purple-200 focus-visible:ring-purple-500"
                )}
                disabled={isSending}
              />
              <Button 
                size="icon" 
                className={cn(
                  "rounded-full shrink-0 cursor-pointer text-white shadow-md h-10 w-10",
                  isClientRole 
                    ? "bg-teal-600 hover:bg-teal-700 shadow-teal-600/30" 
                    : isFieldRole 
                    ? "bg-amber-600 hover:bg-amber-700 shadow-amber-600/30" 
                    : "bg-purple-600 hover:bg-purple-700 shadow-purple-600/30"
                )}
                onClick={handleSend}
                disabled={!inputText.trim() || isSending}
              >
                {isSending ? <Loader2 className="h-4 w-4 animate-spin text-white" /> : <Send className="h-4 w-4 text-white" />}
              </Button>
            </div>
          </div>
          </>
          )}
        </Card>
      </div>

      {/* ─── File Complaint Dialog Modal ─── */}
      <Dialog open={isNewComplaintOpen} onOpenChange={setIsNewComplaintOpen}>
        <DialogContent className="bg-white border border-purple-200 text-gray-900 w-[calc(100vw-1.5rem)] max-w-lg p-4 sm:p-6 rounded-2xl shadow-2xl max-h-[90dvh] overflow-y-auto touch-scroll">
          <DialogHeader>
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-rose-50 text-rose-600 border border-rose-200">
                <Flag className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-gray-900">Report Issue / File Complaint</DialogTitle>
                <DialogDescription className="text-xs text-gray-500">
                  Submit an operational, safety, or service quality dispute to facility administration.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleFileComplaint} className="space-y-4 my-2">
            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1">Issue Category</label>
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-purple-200 text-sm bg-white text-gray-900 focus:ring-2 focus:ring-purple-500"
              >
                <option value="Service Delay & Equipment">Service Delay & Missing Equipment</option>
                <option value="Safety & Hazard">Safety Hazard & Code Violation</option>
                <option value="Workmanship Quality">Poor Workmanship / Incomplete Job</option>
                <option value="Access & Security Dispute">Access Refused / Security Issue</option>
                <option value="Billing & Pricing Dispute">Billing or Scope Dispute</option>
                <option value="Unprofessional Conduct">Unprofessional Conduct</option>
                <option value="Other">Other Operational Complaint</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1">Related Work Order</label>
              <select
                value={newWoId}
                onChange={(e) => setNewWoId(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-purple-200 text-sm bg-white text-gray-900 focus:ring-2 focus:ring-purple-500"
              >
                {workOrders.map((wo) => (
                  <option key={wo._id || wo.id} value={wo._id || wo.id}>
                    {wo.workOrderCode || wo._id} – {wo.title || 'Work Order'}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">Severity Level</label>
                <select
                  value={newSeverity}
                  onChange={(e) => setNewSeverity(e.target.value as any)}
                  className="w-full h-10 px-3 rounded-lg border border-purple-200 text-sm bg-white text-gray-900 focus:ring-2 focus:ring-purple-500"
                >
                  <option value="Low">Low - Minor Inconvenience</option>
                  <option value="Medium">Medium - Standard Resolution</option>
                  <option value="Elevated">Elevated Priority</option>
                  <option value="Urgent">Urgent - Immediate Safety Hazard</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">Complaint Headline</label>
                <Input
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Uncapped live wiring"
                  className="bg-white border-purple-200 text-gray-900 text-sm"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1">Detailed Description of the Issue</label>
              <Textarea
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Explain the specific issue, timeline, and what needs to be resolved..."
                className="bg-white border-purple-200 text-gray-900 text-sm min-h-[90px]"
                required
              />
            </div>

            <DialogFooter className="pt-2 flex justify-end gap-2 border-t border-purple-100">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsNewComplaintOpen(false)}
                className="border-purple-200 text-gray-700 hover:bg-purple-50"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmittingComplaint}
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold cursor-pointer shadow-md shadow-rose-600/30"
              >
                {isSubmittingComplaint ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Flag className="w-4 h-4 mr-2" />}
                Submit Complaint Ticket
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      {/* ─── Delete Chat Confirmation Modal ─── */}
      <Dialog open={!!confirmDeleteWo} onOpenChange={(open) => { if (!open) setConfirmDeleteWo(null); }}>
        <DialogContent className="bg-white border border-rose-200 text-gray-900 w-[calc(100vw-1.5rem)] max-w-md p-4 sm:p-6 rounded-2xl shadow-2xl max-h-[90dvh] overflow-y-auto touch-scroll">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-rose-100 text-rose-700 border border-rose-200">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-gray-900">Delete Chat from this Portal?</DialogTitle>
                <DialogDescription className="text-xs text-gray-500">
                  Remove conversation for {confirmDeleteWo?.code || 'this conversation'} from your portal view.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="my-3 p-3.5 bg-rose-50/70 rounded-xl border border-rose-200 text-xs text-rose-950 space-y-1.5">
            <p className="font-bold flex items-center gap-1.5 text-rose-700">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              Portal-Isolated Deletion
            </p>
            <p className="text-gray-600 leading-relaxed">
              This conversation will be hidden exclusively in your <b>{isAdminRole ? 'Admin' : isClientRole ? 'Client' : 'Worker'}</b> portal. Other participants in their respective portals will retain their full chat history intact.
            </p>
          </div>

          <DialogFooter className="pt-2 flex justify-end gap-2 border-t border-gray-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirmDeleteWo(null)}
              disabled={isDeletingChat}
              className="border-gray-200 text-gray-700 hover:bg-gray-50 cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleDeleteChat}
              disabled={isDeletingChat}
              className="bg-rose-600 hover:bg-rose-700 text-white font-bold cursor-pointer shadow-md shadow-rose-600/30 flex items-center gap-1.5"
            >
              {isDeletingChat ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              Yes, Delete Chat
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Profile & Location Inspection Modal ─── */}
      <Dialog open={!!inspectingProfile} onOpenChange={(open) => !open && setInspectingProfile(null)}>
        <DialogContent className="bg-white border border-purple-200 text-gray-900 w-[calc(100vw-1.5rem)] max-w-xl max-h-[min(90dvh,calc(100vh-2rem))] flex flex-col p-4 sm:p-6 rounded-2xl shadow-2xl overflow-hidden">
          {inspectingProfile && (
            <>
              <DialogHeader className="shrink-0 border-b border-purple-100 pb-4">
                <div className="flex items-center gap-3.5">
                  <div className={cn(
                    "h-14 w-14 rounded-full flex items-center justify-center text-3xl shrink-0 select-none shadow-sm border",
                    inspectingProfile.gender === 'girl'
                      ? "bg-pink-100/90 border-pink-200 ring-2 ring-pink-100"
                      : inspectingProfile.role === 'Worker'
                        ? "bg-amber-100 text-amber-900 border-amber-300 ring-2 ring-amber-200"
                        : "bg-purple-100 text-purple-900 border-purple-200 ring-2 ring-purple-100"
                  )}>
                    <span className="font-bold text-base select-none">
                      {inspectingProfile.name ? inspectingProfile.name.split(' ').map((n: string) => n[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() : 'CF'}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <DialogTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
                      <span>{inspectingProfile.name}</span>
                      <span className={cn(
                        "text-xs px-2.5 py-0.5 rounded-full font-semibold border",
                        inspectingProfile.role === 'Worker'
                          ? "bg-amber-100 text-amber-800 border-amber-200"
                          : "bg-purple-100 text-purple-800 border-purple-200"
                      )}>
                        {inspectingProfile.role}
                      </span>
                    </DialogTitle>
                    <DialogDescription className="text-xs text-gray-500 mt-1 flex items-center gap-2 flex-wrap">
                      <span>ID: <b className="font-mono text-purple-700">{inspectingProfile.id}</b></span>
                      <span>&bull;</span>
                      <span>Registered: {inspectingProfile.registeredDate}</span>
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              {/* Modal Body */}
              <div className="overflow-y-auto pr-1 space-y-3.5 my-3 flex-1 text-xs">
                {/* CNIC & Phone */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-purple-50/60 p-3 rounded-xl border border-purple-100">
                    <span className="text-[11px] text-gray-500 block font-medium">CNIC (National ID)</span>
                    <span className="font-mono text-sm font-bold text-purple-900 tracking-wider">
                      {inspectingProfile.cnic}
                    </span>
                  </div>
                  <div className="bg-purple-50/60 p-3 rounded-xl border border-purple-100">
                    <span className="text-[11px] text-gray-500 block font-medium">Phone Number</span>
                    <div className="flex items-center gap-1.5 text-sm font-semibold text-gray-900 mt-0.5">
                      <Phone className="w-3.5 h-3.5 text-purple-600" />
                      <span>{inspectingProfile.phone}</span>
                    </div>
                  </div>
                </div>

                {/* Email */}
                <div className="bg-purple-50/60 p-3 rounded-xl border border-purple-100">
                  <span className="text-[11px] text-gray-500 block font-medium">Official Email</span>
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-900 mt-0.5">
                    <Mail className="w-3.5 h-3.5 text-purple-600" />
                    <span>{inspectingProfile.email}</span>
                  </div>
                </div>

                {/* Location & Sector Address */}
                <div className="bg-purple-50/60 p-3.5 rounded-xl border border-purple-100">
                  <span className="text-[11px] text-gray-500 block font-medium mb-1">Facility / Sector Location</span>
                  <div className="flex items-start gap-2 text-xs text-gray-800">
                    <MapPin className="h-4 w-4 text-purple-600 shrink-0 mt-0.5" />
                    <span className="font-semibold leading-relaxed">{inspectingProfile.address}</span>
                  </div>
                </div>

                {/* Worker Specific Specialization & Crew */}
                {inspectingProfile.role === 'Worker' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-purple-50/60 p-3 rounded-xl border border-purple-100">
                      <span className="text-[11px] text-gray-500 block font-medium">Specialization</span>
                      <span className="text-xs font-bold text-purple-900 block mt-0.5">
                        {inspectingProfile.specialization || 'Facility Maintenance'}
                      </span>
                    </div>
                    <div className="bg-purple-50/60 p-3 rounded-xl border border-purple-100">
                      <span className="text-[11px] text-gray-500 block font-medium">Assigned Fleet</span>
                      <span className="text-xs font-semibold text-gray-900 block mt-0.5">
                        {inspectingProfile.crewName || 'ClearFlow Operations'}
                      </span>
                    </div>
                  </div>
                )}

                {/* Current Active Channel Counterpart context */}
                {activeChannel && (
                  <div className="bg-indigo-50/50 p-3 rounded-xl border border-indigo-100 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      {activeChannel.category && <CategorySquircleLogo name={activeChannel.category} size="xs" />}
                      <div>
                        <span className="text-[10.5px] text-indigo-600 font-semibold uppercase tracking-wider block">
                          Linked Operation Channel
                        </span>
                        <span className="text-gray-800 font-medium">
                          {activeChannel.category}: {activeChannel.taskTitle}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-gray-500 block">
                        {activeChannel.type === 'worker' ? 'Customer' : 'Assigned Worker'}
                      </span>
                      <span className="font-bold text-purple-900">
                        {activeChannel.counterpartName}
                      </span>
                    </div>
                  </div>
                )}

                {/* Performance Analytics */}
                <div className="bg-gradient-to-br from-purple-50/70 to-white p-3.5 rounded-xl border border-purple-200">
                  <div className="text-xs font-bold text-purple-900 mb-2">
                    Performance & Request Analytics
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-center">
                    <div className="bg-white p-2 rounded-lg border border-purple-100">
                      <span className="text-[10px] text-gray-500 block">Total</span>
                      <span className="text-sm font-bold text-gray-900">{inspectingProfile.totalRequests}</span>
                    </div>
                    <div className="bg-white p-2 rounded-lg border border-purple-100">
                      <span className="text-[10px] text-emerald-600 block">Accepted</span>
                      <span className="text-sm font-bold text-emerald-600">{inspectingProfile.acceptedRequests}</span>
                    </div>
                    <div className="bg-white p-2 rounded-lg border border-purple-100">
                      <span className="text-[10px] text-rose-500 block">Cancelled</span>
                      <span className="text-sm font-bold text-rose-600">{inspectingProfile.cancelledRequests}</span>
                    </div>
                    <div className="bg-white p-2 rounded-lg border border-purple-100">
                      <span className="text-[10px] text-amber-600 block">Rating</span>
                      <span className="text-sm font-bold text-amber-600 flex items-center justify-center gap-0.5">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        {Number(inspectingProfile.rating ?? 0.0).toFixed(1)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Verification Badge */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50/80 border border-emerald-200 text-emerald-800">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span className="font-bold text-xs">Account Status</span>
                  </div>
                  <span className="font-semibold text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 border border-emerald-300">
                    {inspectingProfile.status}
                  </span>
                </div>
              </div>

              <DialogFooter className="shrink-0 pt-2 border-t border-purple-100">
                <Button 
                  onClick={() => setInspectingProfile(null)}
                  className={cn(
                    "w-full text-white rounded-xl h-9 text-xs font-semibold cursor-pointer",
                    isClientRole 
                      ? "bg-teal-600 hover:bg-teal-700 shadow-teal-600/30" 
                      : isFieldRole 
                      ? "bg-amber-600 hover:bg-amber-700 shadow-amber-600/30" 
                      : "bg-purple-600 hover:bg-purple-700 shadow-purple-600/30"
                  )}
                >
                  Close Profile Details
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

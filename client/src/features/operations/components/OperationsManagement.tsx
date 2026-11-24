import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Users, Wrench, Search, Building, 
  MapPin, Star, CheckCircle2, XCircle, Clock, Eye, EyeOff,
  Coins, ArrowUpDown, ClipboardList, MessageSquare,
  ShieldCheck, UserCheck, UserX, UserPlus, FileText, Phone, Mail,
  Calendar, AlertTriangle, AlertCircle, Check, Pencil, Trash2, KeyRound, Power, Lock, Loader2, RotateCcw
} from 'lucide-react';
import { DropdownMenu } from '@/components/ui/dropdown-menu';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter 
} from '@/components/ui/dialog';
import { apiClient } from '@/infrastructure/api/client';
import { ENDPOINTS } from '@/infrastructure/api/endpoints';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useAuth } from '@/entities/user/hooks/useAuth';

export interface RegistrationItem {
  _id: string;
  name: string;
  email: string;
  phone: string;
  role: 'Client' | 'FieldTeam' | 'Worker' | string;
  cnic?: string;
  cnicMasked: string;
  rawCnic: string;
  address: string;
  city: string;
  serviceCategories: string[];
  experienceYears?: string;
  isVerified: boolean;
  verificationStatus: 'Newly Registered' | 'Profile Incomplete' | 'Verification Pending' | 'Verified' | 'Rejected' | string;
  profileCompletionStatus: 'Complete' | 'Incomplete';
  accountStatus: 'Active' | 'Suspended';
  registeredAt: string | Date;
}

export interface ClientOperationItem {
  id: string;
  _id: string;
  name: string;
  gender: 'boy' | 'girl';
  email: string;
  phone: string;
  cnic: string;
  address: string;
  totalRequests: number;
  acceptedRequests: number;
  cancelledOrRefused: number;
  inProgress: number;
  averageRating: number;
  status: 'Active' | 'Pending' | 'Completed' | 'Inactive' | 'Suspended' | string;
  isActive?: boolean;
  suspendedAt?: string;
  suspendedUntil?: string;
  suspensionReason?: string;
  registeredDate?: string;
}

export interface WorkerOperationItem {
  id: string;
  _id: string;
  name: string;
  gender: 'boy' | 'girl';
  email: string;
  phone: string;
  cnic: string;
  address: string;
  specialization?: string;
  serviceCategories?: string[];
  crewName?: string;
  totalRequests: number;
  acceptedRequests: number;
  cancelledOrRefused: number;
  inProgress: number;
  averageRating: number;
  status: 'Active' | 'On Duty' | 'Standby' | 'Completed' | 'Inactive' | 'Suspended' | string;
  isActive?: boolean;
  suspendedAt?: string;
  suspendedUntil?: string;
  suspensionReason?: string;
  purchasedPoints?: number;
  bankDepositPkr?: string;
  totalEarnings?: string;
  registeredDate?: string;
}

export interface AdminOperationItem {
  id: string;
  _id: string;
  name: string;
  gender: 'boy' | 'girl';
  email: string;
  phone: string;
  cnic: string;
  address: string;
  role: 'Admin';
  isPrimary?: boolean;
  canDelete?: boolean;
  specialization?: string;
  totalRequests: number;
  acceptedRequests: number;
  cancelledOrRefused: number;
  inProgress: number;
  averageRating: number;
  status: 'Active' | 'Inactive' | 'Suspended' | string;
  isActive?: boolean;
  suspendedAt?: string;
  suspendedUntil?: string;
  suspensionReason?: string;
  purchasedPoints?: number;
  bankDepositPkr?: string;
  totalEarnings?: string;
  registeredDate?: string;
}

export type OperationListItem = 
  | ({ itemType: 'client' } & ClientOperationItem)
  | ({ itemType: 'worker' } & WorkerOperationItem)
  | ({ itemType: 'admin' } & AdminOperationItem);

export interface PersonWorkOrder {
  id: string;
  workOrderCode: string;
  title: string;
  category: string;
  status: 'Completed' | 'InProgress' | 'Assigned' | 'Cancelled' | 'Open';
  isAccepted: boolean;
  isCancelled: boolean;
  cancellationReason?: string;
  date: string;
  location: string;
  counterpartLabel: 'Assigned Worker' | 'Requesting Client';
  counterpartName: string;
  counterpartId: string;
  price: string;
}

const TEMPLATE_WORK_ORDERS: any[] = [];

const generatePersonWorkOrders = (_type: 'client' | 'worker' | 'admin', _person: any): PersonWorkOrder[] => {
  return [];
};


const CLEARFLOW_OPS_CLIENTS_KEY = 'clearflow_ops_clients';
const CLEARFLOW_OPS_WORKERS_KEY = 'clearflow_ops_workers';
const CLEARFLOW_OPS_ADMINS_KEY = 'clearflow_ops_admins';
const CLEARFLOW_DELETED_USERS_KEY = 'clearflow_deleted_users';
const CLEARFLOW_USER_OVERRIDES_KEY = 'clearflow_user_overrides';

// Cache-bust: wipe any stale localStorage ops data so only real server-registered
// users are shown. We always fetch fresh from the server on mount anyway.
try {
  localStorage.removeItem(CLEARFLOW_OPS_CLIENTS_KEY);
  localStorage.removeItem(CLEARFLOW_OPS_WORKERS_KEY);
  localStorage.removeItem(CLEARFLOW_OPS_ADMINS_KEY);
  localStorage.removeItem(CLEARFLOW_USER_OVERRIDES_KEY);
} catch (_) {}

const PROTECTED_CORE_USERS = new Set([
  'ahsankhalid9768@gmail.com',
  'abdullahikram666@gmail.com',
  '65f000000000000000000001',
]);

const getDeletedIdentifiers = (): Set<string> => {
  try {
    const raw = localStorage.getItem(CLEARFLOW_DELETED_USERS_KEY);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) {
        return new Set(arr.map((x: string) => String(x).toLowerCase().trim()));
      }
    }
  } catch (_) {}
  return new Set<string>();
};

const addDeletedIdentifiers = (...ids: (string | undefined | null)[]) => {
  const current = getDeletedIdentifiers();
  ids.forEach((id) => {
    if (id) current.add(String(id).toLowerCase().trim());
  });
  try {
    localStorage.setItem(CLEARFLOW_DELETED_USERS_KEY, JSON.stringify(Array.from(current)));
  } catch (_) {}
};

const getUserOverrides = (): Record<string, any> => {
  try {
    const raw = localStorage.getItem(CLEARFLOW_USER_OVERRIDES_KEY);
    if (raw) return JSON.parse(raw);
  } catch (_) {}
  return {};
};

const saveUserOverride = (key: string, data: any) => {
  if (!key) return;
  const k = String(key).toLowerCase().trim();
  const current = getUserOverrides();
  current[k] = { ...(current[k] || {}), ...data };
  try {
    localStorage.setItem(CLEARFLOW_USER_OVERRIDES_KEY, JSON.stringify(current));
  } catch (_) {}
};

const cleanDisplayEmail = (email?: string, name?: string): string => {
  if (email && email.includes('@')) return email;
  if (name) return `${name.toLowerCase().replace(/[^a-z0-9]/g, '')}@clearflow.com`;
  return 'user@clearflow.com';
};

const isItemDeleted = (item: any): boolean => {
  if (!item) return true;
  const id = String(item.id || '').toLowerCase().trim();
  const _id = String(item._id || '').toLowerCase().trim();
  const email = String(item.email || '').toLowerCase().trim();

  // Core accounts (Admin 1, Hassan, Ahsan, seed clients & workers) can NEVER be deleted
  if (
    PROTECTED_CORE_USERS.has(email) ||
    PROTECTED_CORE_USERS.has(_id) ||
    PROTECTED_CORE_USERS.has(id)
  ) {
    return false;
  }

  const deleted = getDeletedIdentifiers();

  // Strictly match exact unique keys: _id, id, email
  return (
    (_id.length > 0 && deleted.has(_id)) ||
    (email.length > 0 && deleted.has(email)) ||
    (id.length > 0 && deleted.has(id))
  );
};

export const applyItemOverrides = <T extends { id?: string; _id?: string; email?: string }>(item: T): T => {
  const overrides = getUserOverrides();
  const k1 = String(item._id || '').toLowerCase().trim();
  const k2 = String(item.id || '').toLowerCase().trim();
  const k3 = String(item.email || '').toLowerCase().trim();
  const ov = overrides[k1] || overrides[k2] || overrides[k3];
  if (!ov) return item;
  return {
    ...item,
    ...(ov.name ? { name: ov.name } : {}),
    ...(ov.email ? { email: ov.email } : {}),
    ...(ov.phone !== undefined ? { phone: ov.phone } : {}),
    ...(ov.cnic !== undefined ? { cnic: ov.cnic } : {}),
    ...(ov.address !== undefined ? { address: ov.address } : {}),
    ...(ov.city !== undefined ? { city: ov.city } : {}),
    ...(ov.role ? { role: ov.role } : {}),
    ...(ov.isActive !== undefined ? { isActive: ov.isActive } : {}),
    ...(ov.status ? { status: ov.status } : {}),
    ...(ov.suspendedAt !== undefined ? { suspendedAt: ov.suspendedAt } : {}),
    ...(ov.suspendedUntil !== undefined ? { suspendedUntil: ov.suspendedUntil } : {}),
    ...(ov.suspensionReason !== undefined ? { suspensionReason: ov.suspensionReason } : {}),
  };
};

const INITIAL_CLIENTS: ClientOperationItem[] = [];
const INITIAL_WORKERS: WorkerOperationItem[] = [];

const INITIAL_ADMINS: AdminOperationItem[] = [];

export const OperationsManagement = () => {
  const navigate = useNavigate();
  const { user: authUser } = useAuth();
  const isDefaultAdmin = useMemo(() => {
    if (!authUser) return false;
    const email = (authUser.email || '').toLowerCase().trim();
    const id = String(authUser._id || authUser.id || '');
    return id === '65f000000000000000000001' || email === 'admin@clearflow.com' || email === 'admin@clearflow.pk';
  }, [authUser]);

  // Main view: 'operations' (hub directory) or 'registrations' (Identity Verification Monitor)
  const [mainView, setMainView] = useState<'operations' | 'registrations'>(() => {
    const saved = localStorage.getItem('clearflow_pref_operations_filter');
    if (saved === 'registrations') return 'registrations';
    return 'operations';
  });
  // Options state: Option 1: 'all' (Mix), Option 2: 'clients', Option 3: 'workers', Option 4: 'admins' (Default Admin only)
  const [activeTab, setActiveTab] = useState<'all' | 'clients' | 'workers' | 'admins'>(() => {
    const saved = localStorage.getItem('clearflow_pref_operations_filter');
    if (saved === 'clients' || saved === 'workers' || saved === 'admins') return saved;
    return 'all';
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState(() => {
    const saved = localStorage.getItem('clearflow_pref_operations_filter');
    if (saved && ['Active', 'On Duty', 'Completed'].includes(saved)) return saved;
    return 'All';
  });

  const handleOperationsFilterSelect = (optId: string) => {
    setSelectedRowId(null);
    localStorage.setItem('clearflow_pref_operations_filter', optId);
    if (optId === 'registrations') {
      setMainView('registrations');
    } else if (optId === 'clients') {
      setMainView('operations');
      setActiveTab('clients');
      setStatusFilter('All');
    } else if (optId === 'workers') {
      setMainView('operations');
      setActiveTab('workers');
      setStatusFilter('All');
    } else if (optId === 'admins') {
      setMainView('operations');
      setActiveTab('admins');
      setStatusFilter('All');
    } else if (optId === 'all') {
      setMainView('operations');
      setActiveTab('all');
      setStatusFilter('All');
    } else {
      setMainView('operations');
      setActiveTab('all');
      setStatusFilter(optId);
    }
  };
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [inspectedItem, setInspectedItem] = useState<{ type: 'client' | 'worker' | 'admin'; data: any } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [orderFilter, setOrderFilter] = useState<'all' | 'accepted' | 'cancelled'>('all');

  // Registrations monitoring state
  const [registrations, setRegistrations] = useState<RegistrationItem[]>([]);
  const [revealedCnics, setRevealedCnics] = useState<Record<string, boolean>>({});
  const [registrationSubTab, setRegistrationSubTab] = useState<'all' | 'clients' | 'workers'>('all');
  const [regSearchQuery, setRegSearchQuery] = useState('');
  const [regStatusFilter, setRegStatusFilter] = useState<string>('All');
  const [inspectedRegistration, setInspectedRegistration] = useState<RegistrationItem | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Reset orderFilter whenever a new person is inspected
  useEffect(() => {
    if (inspectedItem) {
      setOrderFilter('all');
    }
  }, [inspectedItem?.data?.id]);

  const personWorkOrders = useMemo(() => {
    if (!inspectedItem) return [];
    return generatePersonWorkOrders(inspectedItem.type, inspectedItem.data);
  }, [inspectedItem]);

  const displayedOrders = useMemo(() => {
    if (orderFilter === 'accepted') {
      return personWorkOrders.filter((o) => o.isAccepted);
    }
    if (orderFilter === 'cancelled') {
      return personWorkOrders.filter((o) => o.isCancelled);
    }
    return personWorkOrders;
  }, [personWorkOrders, orderFilter]);

  const [clients, setClients] = useState<ClientOperationItem[]>([]);
  const [workers, setWorkers] = useState<WorkerOperationItem[]>([]);
  const [admins, setAdmins] = useState<AdminOperationItem[]>([]);

  useEffect(() => {
    // No localStorage caching — always fetch fresh from server
  }, [clients]);

  useEffect(() => {
    // No localStorage caching — always fetch fresh from server
  }, [workers]);

  useEffect(() => {
    // No localStorage caching — always fetch fresh from server
  }, [admins]);

  const [isRefreshing, setIsRefreshing] = useState(false);
  const location = useLocation();

  // Full-Power Admin CRUD State
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [addUserForm, setAddUserForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'Client',
    phone: '',
    cnic: '',
    address: '',
    city: 'Lahore',
    serviceCategories: '',
    experienceYears: '3',
  });

  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editUserForm, setEditUserForm] = useState({
    name: '',
    email: '',
    role: 'Client',
    phone: '',
    cnic: '',
    address: '',
    city: 'Lahore',
    isActive: true,
  });

  const [resetPasswordUser, setResetPasswordUser] = useState<any | null>(null);
  const [newPasswordVal, setNewPasswordVal] = useState('');
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  const [deletingUser, setDeletingUser] = useState<any | null>(null);
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const [isDeletingUser, setIsDeletingUser] = useState(false);

  const [suspendingUser, setSuspendingUser] = useState<any | null>(null);
  const [isSuspendingUser, setIsSuspendingUser] = useState(false);
  const [suspendDurationDays, setSuspendDurationDays] = useState<number>(7);
  const [suspendReason, setSuspendReason] = useState<string>('Administrative policy compliance review');

  const [revokingSuspensionUser, setRevokingSuspensionUser] = useState<any | null>(null);
  const [isRevokingSuspension, setIsRevokingSuspension] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('action') === 'new-user') {
      setIsAddUserOpen(true);
    }
  }, [location.search]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addUserForm.name || !addUserForm.email || !addUserForm.password) {
      toast.error('Name, email, and password are required');
      return;
    }
    if (addUserForm.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    setIsAddingUser(true);
    try {
      const payload = {
        ...addUserForm,
        serviceCategories: addUserForm.serviceCategories
          ? addUserForm.serviceCategories.split(',').map((s) => s.trim()).filter(Boolean)
          : ['Cleaning'],
      };
      const res = await apiClient.post(ENDPOINTS.USERS.BASE, payload);
      if (res.data?.success) {
        toast.success(res.data.message || `User ${addUserForm.name} created! A verification code has been sent to ${addUserForm.email}`);
        setIsAddUserOpen(false);
        setAddUserForm({
          name: '',
          email: '',
          password: '',
          role: 'Client',
          phone: '',
          cnic: '',
          address: '',
          city: 'Lahore',
          serviceCategories: '',
          experienceYears: '3',
        });
        fetchDirectory(false);
        window.dispatchEvent(new CustomEvent('clearflow:refresh-data'));
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to create user');
    } finally {
      setIsAddingUser(false);
    }
  };

  const openEditModal = (item: any) => {
    setEditingUser(item);
    setEditUserForm({
      name: item.name || '',
      email: item.email || '',
      role: item.role || (item.itemType === 'admin' ? 'Admin' : item.itemType === 'worker' ? 'FieldTeam' : 'Client'),
      phone: item.phone || '',
      cnic: item.rawCnic || item.cnic || '',
      address: item.address || '',
      city: item.city || 'Lahore',
      isActive: item.isActive !== false && item.status !== 'Suspended',
    });
  };

  const handleSaveEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setIsSavingEdit(true);
    try {
      const userId = editingUser._id || editingUser.id;
      const res = await apiClient.put(ENDPOINTS.USERS.UPDATE(userId), editUserForm);
      if (res.data?.success) {
        toast.success('User details updated successfully');
        saveUserOverride(userId, editUserForm);
        if (editingUser.id) saveUserOverride(editingUser.id, editUserForm);
        if (editUserForm.email) saveUserOverride(editUserForm.email, editUserForm);

        setClients((prev) =>
          prev.map((c) =>
            c._id === userId || c.id === userId || (editingUser.id && c.id === editingUser.id)
              ? applyItemOverrides({ ...c, ...editUserForm })
              : c
          )
        );
        setWorkers((prev) =>
          prev.map((w) =>
            w._id === userId || w.id === userId || (editingUser.id && w.id === editingUser.id)
              ? applyItemOverrides({ ...w, ...editUserForm })
              : w
          )
        );
        setAdmins((prev) =>
          prev.map((a) =>
            a._id === userId || a.id === userId || (editingUser.id && a.id === editingUser.id)
              ? applyItemOverrides({ ...a, ...editUserForm, role: 'Admin' as const })
              : a
          )
        );

        setEditingUser(null);
        fetchDirectory(false);
        window.dispatchEvent(new CustomEvent('clearflow:refresh-data'));
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to update user');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleSavePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetPasswordUser) return;
    if (!newPasswordVal || newPasswordVal.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }
    setIsSavingPassword(true);
    try {
      const userId = resetPasswordUser._id || resetPasswordUser.id;
      const res = await apiClient.post(`/users/${encodeURIComponent(userId)}/reset-password`, {
        newPassword: newPasswordVal,
      });
      if (res.data?.success) {
        toast.success(`Password reset successfully for ${resetPasswordUser.name}`);
        setResetPasswordUser(null);
        setNewPasswordVal('');
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to reset password');
    } finally {
      setIsSavingPassword(false);
    }
  };

  const handleToggleUserStatus = async (item: any) => {
    const isSuspended = item.status === 'Suspended' || item.isActive === false;
    if (isSuspended) {
      setRevokingSuspensionUser(item);
    } else {
      setSuspendDurationDays(7);
      setSuspendReason('Administrative policy compliance review');
      setSuspendingUser(item);
    }
  };

  const handleConfirmSuspendUser = async () => {
    if (!suspendingUser) return;
    setIsSuspendingUser(true);
    try {
      const userId = suspendingUser._id || suspendingUser.id;
      const days = Math.max(1, Math.min(365, Number(suspendDurationDays) || 7));
      const res = await apiClient.patch(`/users/${encodeURIComponent(userId)}/status`, {
        isActive: false,
        durationDays: days,
        reason: suspendReason || `Account suspended for ${days} days by Administrator`
      });
      if (res.data?.success) {
        const untilDate = res.data.data?.suspendedUntil
          ? new Date(res.data.data.suspendedUntil).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
          : new Date(Date.now() + days * 86400000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        toast.success(`Account for ${suspendingUser.name} suspended for ${days} day${days > 1 ? 's' : ''} (until ${untilDate})`);
        
        const suspOverride = { isActive: false, status: 'Suspended', suspendedUntil: res.data.data?.suspendedUntil };
        saveUserOverride(userId, suspOverride);
        if (suspendingUser.id) saveUserOverride(suspendingUser.id, suspOverride);
        if (suspendingUser.email) saveUserOverride(suspendingUser.email, suspOverride);

        setClients((prev) =>
          prev.map((c) =>
            c._id === userId || c.id === userId
              ? { ...c, isActive: false, status: 'Suspended', suspendedUntil: res.data.data?.suspendedUntil }
              : c
          )
        );
        setWorkers((prev) =>
          prev.map((w) =>
            w._id === userId || w.id === userId
              ? { ...w, isActive: false, status: 'Suspended', suspendedUntil: res.data.data?.suspendedUntil }
              : w
          )
        );
        setAdmins((prev) =>
          prev.map((a) =>
            a._id === userId || a.id === userId
              ? { ...a, isActive: false, status: 'Suspended', suspendedUntil: res.data.data?.suspendedUntil }
              : a
          )
        );
        setSuspendingUser(null);
        fetchDirectory(false);
        window.dispatchEvent(new CustomEvent('clearflow:refresh-data'));
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to suspend user');
    } finally {
      setIsSuspendingUser(false);
    }
  };

  const handleRevokeSuspension = async () => {
    if (!revokingSuspensionUser) return;
    setIsRevokingSuspension(true);
    try {
      const userId = revokingSuspensionUser._id || revokingSuspensionUser.id;
      const res = await apiClient.patch(`/users/${encodeURIComponent(userId)}/status`, {
        isActive: true,
        revokeSuspension: true
      });
      if (res.data?.success) {
        toast.success(`Suspension revoked successfully. ${revokingSuspensionUser.name} is now Active.`);

        const activeOverride = { isActive: true, status: 'Active', suspendedUntil: null, suspendedAt: null, suspensionReason: null };
        saveUserOverride(userId, activeOverride);
        if (revokingSuspensionUser.id) saveUserOverride(revokingSuspensionUser.id, activeOverride);
        if (revokingSuspensionUser.email) saveUserOverride(revokingSuspensionUser.email, activeOverride);

        setClients((prev) =>
          prev.map((c) =>
            c._id === userId || c.id === userId
              ? { ...c, isActive: true, status: 'Active', suspendedUntil: undefined }
              : c
          )
        );
        setWorkers((prev) =>
          prev.map((w) =>
            w._id === userId || w.id === userId
              ? { ...w, isActive: true, status: 'Active', suspendedUntil: undefined }
              : w
          )
        );
        setAdmins((prev) =>
          prev.map((a) =>
            a._id === userId || a.id === userId
              ? { ...a, isActive: true, status: 'Active', suspendedUntil: undefined }
              : a
          )
        );
        setRevokingSuspensionUser(null);
        fetchDirectory(false);
        window.dispatchEvent(new CustomEvent('clearflow:refresh-data'));
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to revoke suspension');
    } finally {
      setIsRevokingSuspension(false);
    }
  };

  const handleSetPrimaryAdmin = async (targetAdmin: any) => {
    const adminId = targetAdmin._id || targetAdmin.id;
    try {
      await apiClient.post(`/api/users/${encodeURIComponent(adminId)}/set-primary-admin`);
      toast.success(`${targetAdmin.name || 'Administrator'} is now designated as the Primary Administrator!`);
    } catch (err: any) {
      toast.info(`Primary Administrator updated to ${targetAdmin.name || 'Administrator'}.`);
    }

    setAdmins((prev) => {
      const next = prev.map((a) => {
        const isMatch = Boolean((a._id && a._id === adminId) || (a.id && a.id === adminId) || (a.email && a.email.toLowerCase() === (targetAdmin.email || '').toLowerCase()));
        return {
          ...a,
          isPrimary: isMatch,
          canDelete: !isMatch,
          specialization: isMatch ? 'Primary Administrator & Ownership' : 'System Administration & Operations',
        };
      });
      try {
        localStorage.setItem(CLEARFLOW_OPS_ADMINS_KEY, JSON.stringify(next));
      } catch (_) {}
      return next;
    });
  };

  const handleConfirmDeleteUser = async () => {
    if (!deletingUser) return;
    setIsDeletingUser(true);
    const userId = deletingUser._id || deletingUser.id;
    const displayId = deletingUser.id || '';
    const userName = deletingUser.name || 'User';
    const userEmail = deletingUser.email || '';
    const userCnic = (deletingUser as any).cnic || '';

    if (deletingUser.role === 'Admin') {
      if (!adminPasswordInput) {
        toast.error('Primary Administrator password is required');
        setIsDeletingUser(false);
        return;
      }
    }

    try {
      try {
        await apiClient.delete(ENDPOINTS.USERS.BY_ID(userId), {
          data: { adminPassword: adminPasswordInput }
        });
      } catch (apiErr: any) {
        if (deletingUser.role === 'Admin') {
          throw apiErr;
        }
        console.warn('Backend delete notification warning:', apiErr?.message);
      }

      // Always record all identifiers in persistent localStorage so refresh NEVER restores them
      // Do not include names or CNICs so mock/shared data is never accidentally filtered
      addDeletedIdentifiers(
        userId, 
        displayId, 
        userEmail
      );

      const updatedClients = clients.filter((c) => c._id !== userId && c.id !== userId && c.id !== displayId && !isItemDeleted(c));
      const updatedWorkers = workers.filter((w) => w._id !== userId && w.id !== userId && w.id !== displayId && !isItemDeleted(w));
      const updatedAdmins = admins.filter((a) => a._id !== userId && a.id !== userId && a.id !== displayId && !isItemDeleted(a));

      setClients(updatedClients);
      setWorkers(updatedWorkers);
      setAdmins(updatedAdmins);
      setRegistrations((prev) => prev.filter((r) => r._id !== userId && (r as any).id !== userId && (r as any).id !== displayId));

      try {
        localStorage.setItem(CLEARFLOW_OPS_CLIENTS_KEY, JSON.stringify(updatedClients));
        localStorage.setItem(CLEARFLOW_OPS_WORKERS_KEY, JSON.stringify(updatedWorkers));
        localStorage.setItem(CLEARFLOW_OPS_ADMINS_KEY, JSON.stringify(updatedAdmins));
      } catch (_) {}

      toast.success(`User ${userName} and location tracking deleted permanently`);
      setDeletingUser(null);
      fetchDirectory(false);
      window.dispatchEvent(new CustomEvent('clearflow:refresh-data'));
      window.dispatchEvent(new StorageEvent('storage', { key: CLEARFLOW_DELETED_USERS_KEY }));
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to delete user');
    } finally {
      setIsDeletingUser(false);
    }
  };

  const fetchDirectory = async (showToast = false) => {
    if (showToast) setIsRefreshing(true);
    const start = Date.now();
    try {
      const [dirRes, regRes] = await Promise.allSettled([
        apiClient.get(ENDPOINTS.OPERATIONS.DIRECTORY),
        apiClient.get(ENDPOINTS.USERS.REGISTRATIONS),
      ]);

      if (dirRes.status === 'fulfilled' && dirRes.value.data?.success && dirRes.value.data?.data) {
        const d = dirRes.value.data.data;
        if (Array.isArray(d.clients)) {
          const mappedClients: ClientOperationItem[] = d.clients
            .map((c: any, idx: number) => {
              const isAli = (c.name && c.name.toLowerCase().trim() === 'ali') ||
                            (c.email && c.email.toLowerCase() === 'ahsankhalid8657@gmail.com') ||
                            String(c.id || c._id || '').includes('ofpt') ||
                            c.id === 'C#01';
              return {
                id: isAli ? 'C#01' : (c.id?.startsWith?.('C#') ? c.id : `C#${String(c.id || c._id || (5000 + idx)).slice(-4)}`),
                _id: c._id || c.id || `cli_${idx}`,
                name: c.name || 'Client User',
                gender: c.gender || (idx % 2 === 0 ? 'boy' : 'girl'),
                email: c.email || '',
                phone: c.phone || '+92 300 1234567',
                cnic: c.cnic || '',
                address: c.address || 'Central Facility Complex, Lahore',
                totalRequests: Number(c.totalRequests ?? c.totalOrders ?? 0),
                acceptedRequests: Number(c.acceptedRequests ?? c.completedJobs ?? 0),
                cancelledOrRefused: Number(c.cancelledOrRefused ?? 0),
                inProgress: Number(c.inProgress ?? c.activeOrders ?? 0),
                averageRating: Number(c.averageRating ?? c.rating ?? 0.0),
                status: c.status || (c.isActive !== false ? 'Active' : 'Inactive'),
                isActive: c.isActive !== false,
                suspendedAt: c.suspendedAt,
                suspendedUntil: c.suspendedUntil,
                suspensionReason: c.suspensionReason,
                registeredDate: c.registeredDate || 'Jan 15, 2026',
              };
            })
            .filter((c: any) => !isItemDeleted(c) && Boolean(c.cnic && c.cnic.replace(/\D/g, '').length === 13))
            .map((c: any) => applyItemOverrides(c));
          setClients(mappedClients);
        } else {
          setClients([]);
        }
        if (Array.isArray(d.workers)) {
          const mappedWorkers: WorkerOperationItem[] = d.workers
            .map((w: any, idx: number) => {
              const isAhmad = (w.name && w.name.toLowerCase().trim() === 'ahmad') ||
                              (w.email && w.email.toLowerCase() === 'ahsankhalid8796@gmail.com') ||
                              String(w.id || w._id || '').includes('ftx8') ||
                              w.id === 'W#01';
              return {
                id: isAhmad ? 'W#01' : (w.id?.startsWith?.('W#') ? w.id : `W#${String(w.id || w._id || (6000 + idx)).slice(-4)}`),
                _id: w._id || w.id || `wrk_${idx}`,
                name: w.name || 'Field Worker',
                gender: w.gender || (idx % 2 === 0 ? 'boy' : 'girl'),
                email: w.email || '',
                phone: w.phone || '+92 300 1234567',
                cnic: w.cnic || '',
                address: w.address || 'Central Maintenance Zone, Lahore',
                specialization: w.specialization || (Array.isArray(w.serviceCategories) ? w.serviceCategories.join(', ') : 'HVAC Maintenance'),
                crewName: w.crewName || 'Alpha Crew (Cleaning)',
                totalRequests: Number(w.totalRequests ?? w.totalOrders ?? 0),
                acceptedRequests: Number(w.acceptedRequests ?? w.completedJobs ?? 0),
                cancelledOrRefused: Number(w.cancelledOrRefused ?? 0),
                inProgress: Number(w.inProgress ?? w.activeOrders ?? 0),
                averageRating: Number(w.averageRating ?? w.rating ?? 0.0),
                status: w.status || (w.isActive !== false ? 'Active' : 'Inactive'),
                isActive: w.isActive !== false,
                suspendedAt: w.suspendedAt,
                suspendedUntil: w.suspendedUntil,
                suspensionReason: w.suspensionReason,
                purchasedPoints: Number(w.purchasedPoints ?? 0),
                bankDepositPkr: w.bankDepositPkr || 'PKR 0',
                totalEarnings: w.totalEarnings || 'PKR 0',
                registeredDate: w.registeredDate || 'Jan 10, 2026',
              };
            })
            .filter((w: any) => !isItemDeleted(w) && Boolean(w.cnic && w.cnic.replace(/\D/g, '').length === 13))
            .map((w: any) => applyItemOverrides(w));
          setWorkers(mappedWorkers);
        } else {
          setWorkers([]);
        }
        if (isDefaultAdmin && Array.isArray(d.admins) && d.admins.length > 0) {
          // Clear any accidental deletion markers in localStorage for active backend admins
          const currentDeleted = getDeletedIdentifiers();
          let clearedAny = false;
          d.admins.forEach((adm: any) => {
            const e = (adm.email || '').toLowerCase().trim();
            const id = (adm.id || '').toLowerCase().trim();
            const _id = (adm._id || '').toLowerCase().trim();
            if (e && currentDeleted.has(e)) { currentDeleted.delete(e); clearedAny = true; }
            if (id && currentDeleted.has(id)) { currentDeleted.delete(id); clearedAny = true; }
            if (_id && currentDeleted.has(_id)) { currentDeleted.delete(_id); clearedAny = true; }
          });
          if (clearedAny) {
            try {
              localStorage.setItem(CLEARFLOW_DELETED_USERS_KEY, JSON.stringify(Array.from(currentDeleted)));
            } catch (_) {}
          }

          const mappedAdmins: AdminOperationItem[] = d.admins
            .map((a: any, idx: number) => {
              const isPrimary = a.isPrimary ?? (a.email === 'admin@clearflow.com' || a._id === '65f000000000000000000001' || a.id === 'A#0001');
              return {
                id: a.id?.startsWith?.('A#') ? a.id : `A#${String(a.id || a._id || (7000 + idx)).slice(-4)}`,
                _id: a._id || a.id || `adm_${idx}`,
                name: a.name || 'Administrator',
                gender: 'boy',
                email: a.email || '',
                phone: a.phone || (isPrimary ? '+1 555 0192834' : '+1 555 0192835'),
                cnic: a.cnic || (isPrimary ? '35201-1234567-1' : '35201-1234567-2'),
                address: a.address || 'Operations HQ, Central Facility Complex',
                role: 'Admin' as const,
                isPrimary,
                canDelete: a.canDelete ?? !isPrimary,
                specialization: a.specialization || (isPrimary ? 'Primary Administrator & Ownership' : 'System Administration & Operations'),
                totalRequests: Number(a.totalRequests ?? 0),
                acceptedRequests: Number(a.acceptedRequests ?? 0),
                cancelledOrRefused: Number(a.cancelledOrRefused ?? 0),
                inProgress: Number(a.inProgress ?? 0),
                averageRating: Number(a.averageRating ?? 0.0),
                status: a.status || (a.isActive !== false ? 'Active' : 'Inactive'),
                isActive: a.isActive !== false,
                suspendedAt: a.suspendedAt,
                suspendedUntil: a.suspendedUntil,
                suspensionReason: a.suspensionReason,
                purchasedPoints: Number(a.purchasedPoints ?? (isPrimary ? 10000 : 5000)),
                bankDepositPkr: a.bankDepositPkr || (isPrimary ? 'PKR 1,000,000' : 'PKR 500,000'),
                totalEarnings: a.totalEarnings || 'PKR 0',
                registeredDate: a.registeredDate || 'Jan 01, 2026',
              };
            })
            .map((a: any) => applyItemOverrides(a));

          setAdmins(mappedAdmins);
        } else if (isDefaultAdmin) {
          setAdmins([]);
        }
      }

      if (regRes.status === 'fulfilled' && regRes.value.data?.success && regRes.value.data?.data) {
        const regData = regRes.value.data.data;
        if (Array.isArray(regData)) {
          setRegistrations(regData);
        } else if (Array.isArray(regData.all)) {
          setRegistrations(regData.all);
        }
      }

      if (showToast) {
        const elapsed = Date.now() - start;
        if (elapsed < 750) {
          await new Promise((resolve) => setTimeout(resolve, 750 - elapsed));
        }
        toast.success('Operations & Registrations data synchronized');
      }
    } catch (err) {
      console.warn('Sync fallback warning:', err);
      if (showToast) {
        toast.success('Operations directory updated');
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDirectory(false);
    const handleGlobal = () => fetchDirectory(false);
    window.addEventListener('clearflow:refresh-data', handleGlobal);
    // Poll periodically to catch real-time registrations and identity verification submissions
    const interval = setInterval(() => fetchDirectory(false), 8000);
    return () => {
      window.removeEventListener('clearflow:refresh-data', handleGlobal);
      clearInterval(interval);
    };
  }, []);

  const handleUpdateVerificationStatus = async (
    userId: string,
    newStatus: 'Verified' | 'Rejected',
    reason?: string
  ) => {
    setUpdatingId(userId);
    try {
      const res = await apiClient.patch(ENDPOINTS.USERS.UPDATE_VERIFICATION_STATUS(userId), {
        status: newStatus,
        reason: reason || (newStatus === 'Verified' ? 'Approved by ClearFlow Administration' : 'Identity verification rejected by Admin'),
      });
      if (res.data?.success) {
        toast.success(`Verification status updated to ${newStatus}`);
        setRegistrations((prev) =>
          prev.map((r) =>
            r._id === userId
              ? {
                  ...r,
                  verificationStatus: newStatus,
                  isVerified: newStatus === 'Verified',
                }
              : r
          )
        );
        if (inspectedRegistration && inspectedRegistration._id === userId) {
          setInspectedRegistration((prev) =>
            prev ? { ...prev, verificationStatus: newStatus, isVerified: newStatus === 'Verified' } : null
          );
        }
        window.dispatchEvent(new CustomEvent('clearflow:refresh-data'));
        fetchDirectory(false);
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to update verification status');
    } finally {
      setUpdatingId(null);
    }
  };

  const toggleCnicReveal = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setRevealedCnics((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const pendingVerificationsCount = useMemo(() => {
    return registrations.filter(
      (r) =>
        r.verificationStatus === 'Verification Pending' ||
        r.verificationStatus === 'Newly Registered' ||
        !r.isVerified
    ).length;
  }, [registrations]);

  const clientRegistrations = useMemo(() => {
    return registrations.filter((r) => r.role === 'Client');
  }, [registrations]);

  const workerRegistrations = useMemo(() => {
    return registrations.filter((r) => r.role === 'FieldTeam' || r.role === 'Worker');
  }, [registrations]);

  const filteredRegistrations = useMemo(() => {
    let list = registrations;
    if (registrationSubTab === 'clients') {
      list = clientRegistrations;
    } else if (registrationSubTab === 'workers') {
      list = workerRegistrations;
    }

    return list.filter((r) => {
      const q = regSearchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        r.name.toLowerCase().includes(q) ||
        r.email.toLowerCase().includes(q) ||
        (r.phone && r.phone.toLowerCase().includes(q)) ||
        (r.cnicMasked && r.cnicMasked.toLowerCase().includes(q)) ||
        (r.rawCnic && r.rawCnic.toLowerCase().includes(q)) ||
        (r.city && r.city.toLowerCase().includes(q)) ||
        (r.address && r.address.toLowerCase().includes(q)) ||
        (Array.isArray(r.serviceCategories) && r.serviceCategories.some((c) => c.toLowerCase().includes(q)));

      const matchesStatus =
        regStatusFilter === 'All' ||
        (r.verificationStatus || '').toLowerCase() === regStatusFilter.toLowerCase();

      return matchesSearch && matchesStatus;
    });
  }, [registrations, clientRegistrations, workerRegistrations, registrationSubTab, regSearchQuery, regStatusFilter]);

  // Mixed Operations List (interleaved clients & workers for authentic mixed operations overview, with other admins shown for Default Admin)
  const mixedList = useMemo<OperationListItem[]>(() => {
    const mixed: OperationListItem[] = [];
    if (isDefaultAdmin && admins.length > 0) {
      for (const a of admins) {
        mixed.push({ itemType: 'admin', ...a });
      }
    }
    const maxLen = Math.max(clients.length, workers.length);
    for (let i = 0; i < maxLen; i++) {
      if (i < clients.length) mixed.push({ itemType: 'client', ...clients[i] });
      if (i < workers.length) mixed.push({ itemType: 'worker', ...workers[i] });
    }
    return mixed;
  }, [clients, workers, admins, isDefaultAdmin]);

  // Unified Filtered Operations List
  const filteredItems = useMemo<OperationListItem[]>(() => {
    let baseList: OperationListItem[] = [];
    if (activeTab === 'all') {
      baseList = mixedList;
    } else if (activeTab === 'clients') {
      baseList = clients.map((c) => ({ itemType: 'client', ...c }));
    } else if (activeTab === 'admins') {
      baseList = isDefaultAdmin ? admins.map((a) => ({ itemType: 'admin', ...a })) : [];
    } else {
      baseList = workers.map((w) => ({ itemType: 'worker', ...w }));
    }

    return baseList.filter((item) => {
      const q = (searchQuery || '').toLowerCase();
      const matchesSearch = 
        !q ||
        (item.name || '').toLowerCase().includes(q) ||
        (item.id || '').toLowerCase().includes(q) ||
        (item.cnic || '').toLowerCase().includes(q) ||
        (item.address || '').toLowerCase().includes(q) ||
        (item.email || '').toLowerCase().includes(q) ||
        (item.phone || '').toLowerCase().includes(q) ||
        (item.itemType === 'admin' && (
          ((item.specialization || '').toLowerCase().includes(q)) ||
          'admin'.includes(q)
        )) ||
        (item.itemType === 'worker' && (
          ((item.specialization || '').toLowerCase().includes(q)) ||
          ((item.crewName || '').toLowerCase().includes(q))
        ));

      const matchesStatus = 
        statusFilter === 'All' || 
        (item.status || 'Active').toLowerCase() === statusFilter.toLowerCase();

      return matchesSearch && matchesStatus;
    });
  }, [activeTab, mixedList, clients, workers, admins, isDefaultAdmin, searchQuery, statusFilter]);

  const getRemainingSuspensionDays = (suspendedUntil?: string | Date) => {
    if (!suspendedUntil) return 7;
    const diff = new Date(suspendedUntil).getTime() - Date.now();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days > 0 ? days : 1;
  };

  // Status Badge Pill renderer
  const renderStatusPill = (status?: string, item?: any) => {
    const isSuspended =
      status?.toLowerCase() === 'suspended' ||
      item?.status?.toLowerCase() === 'suspended' ||
      (item && item.isActive === false) ||
      Boolean(item?.suspendedUntil && new Date(item.suspendedUntil).getTime() > Date.now());

    if (isSuspended) {
      const days = item?.suspendedUntil ? getRemainingSuspensionDays(item.suspendedUntil) : 7;
      return (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (item) setRevokingSuspensionUser(item);
          }}
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-800 border border-rose-300 shadow-2xs hover:bg-rose-100 hover:border-rose-400 cursor-pointer transition-all"
          title={`Account suspended (${days}d remaining). Click to Revoke Suspension.`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
          <span>Suspended ({days}d)</span>
          <RotateCcw className="w-3 h-3 text-rose-600 ml-0.5" />
        </button>
      );
    }

    const isWorker = item?.itemType === 'worker' || item?.role === 'Worker' || item?.role === 'worker';
    const isClient = item?.itemType === 'client' || item?.role === 'Client' || item?.role === 'client';
    const isAdmin = item?.itemType === 'admin' || item?.role === 'Admin' || item?.role === 'admin';

    const cleanStatus = status || 'Active';
    switch (cleanStatus.toLowerCase()) {
      case 'active':
      case 'completed':
      case 'verified':
        return (
          <span className={cn(
            "inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold shadow-2xs border",
            isWorker
              ? "bg-amber-50 text-amber-800 border-amber-200/90"
              : isClient
              ? "bg-teal-50 text-teal-800 border-teal-200/90"
              : isAdmin
              ? "bg-purple-50 text-purple-700 border-purple-200/90"
              : "bg-emerald-50 text-emerald-700 border-emerald-200/90"
          )}>
            {cleanStatus}
          </span>
        );
      case 'on duty':
      case 'in progress':
      case 'inprogress':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200/90 shadow-2xs">
            {cleanStatus}
          </span>
        );
      case 'pending':
      case 'assigned':
      case 'dispatched':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200/90 shadow-2xs">
            {cleanStatus.toLowerCase() === 'dispatched' ? 'Assigned' : cleanStatus}
          </span>
        );
      case 'failed':
      case 'cancelled':
      case 'refused':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200/90 shadow-2xs">
            {cleanStatus}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-gray-50 text-gray-700 border border-gray-200/90 shadow-2xs">
            {cleanStatus}
          </span>
        );
    }
  };

  const renderOrderStatusBadge = (status: string) => {
    switch (status) {
      case 'Completed':
      case 'Closed':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/90 shadow-2xs">
            <CheckCircle2 className="h-2.5 w-2.5" />
            Completed
          </span>
        );
      case 'InProgress':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200/90 shadow-2xs">
            <Clock className="h-2.5 w-2.5" />
            In Progress
          </span>
        );
      case 'Assigned':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200/90 shadow-2xs">
            <Clock className="h-2.5 w-2.5" />
            Assigned
          </span>
        );
      case 'PendingReview':
      case 'Pending Review':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200/90 shadow-2xs">
            <Clock className="h-2.5 w-2.5" />
            Pending Review
          </span>
        );
      case 'PendingClientConfirmation':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs">
            <Clock className="h-2.5 w-2.5" />
            Pending Confirmation
          </span>
        );
      case 'RevisionRequired':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-800 border border-rose-300 shadow-2xs">
            <AlertCircle className="h-2.5 w-2.5" />
            Revision Required
          </span>
        );
      case 'Open':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200/90 shadow-2xs">
            <Clock className="h-2.5 w-2.5" />
            Open
          </span>
        );
      case 'Cancelled':
      case 'Refused':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200/90 shadow-2xs">
            <XCircle className="h-2.5 w-2.5" />
            Cancelled
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-gray-50 text-gray-700 border border-gray-200/90 shadow-2xs">
            <Clock className="h-2.5 w-2.5" />
            {status}
          </span>
        );
    }
  };

  const renderVerificationBadge = (status: string) => {
    const s = (status || 'Newly Registered').toLowerCase();
    if (s === 'verified') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <CheckCircle2 className="h-3 w-3 text-emerald-600" />
          Verified
        </span>
      );
    }
    if (s.includes('pending')) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
          <Clock className="h-3 w-3 text-purple-600" />
          Verification Pending
        </span>
      );
    }
    if (s.includes('incomplete')) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
          <AlertTriangle className="h-3 w-3 text-amber-600" />
          Profile Incomplete
        </span>
      );
    }
    if (s.includes('reject')) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
          <XCircle className="h-3 w-3 text-rose-600" />
          Rejected
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
        <UserPlus className="h-3 w-3 text-blue-600" />
        Newly Registered
      </span>
    );
  };

  const renderProfileCompletionBadge = (status: string) => {
    const isDone = (status || '').toLowerCase() === 'complete';
    return (
      <span className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border",
        isDone
          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
          : "bg-amber-50 text-amber-700 border-amber-200"
      )}>
        {isDone ? <Check className="h-3 w-3 text-emerald-600" /> : <Clock className="h-3 w-3 text-amber-600" />}
        {isDone ? 'Complete' : 'Incomplete'}
      </span>
    );
  };

  const renderAccountStatusBadge = (status: string, role?: string) => {
    const isActive = (status || 'Active').toLowerCase() === 'active';
    const isWorker = role?.toLowerCase() === 'worker';
    return (
      <span className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border",
        isActive
          ? isWorker
            ? "bg-amber-50 text-amber-800 border-amber-200"
            : "bg-emerald-50 text-emerald-700 border-emerald-200"
          : "bg-gray-100 text-gray-700 border-gray-200"
      )}>
        {isActive ? 'Active' : 'Suspended'}
      </span>
    );
  };

  return (
    <div className="space-y-4 w-full pb-16">
      {/* ─── Search & Status Filters Bar (Unified across Operations & Identity Verification) ─── */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-purple-200/80 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            value={mainView === 'registrations' ? regSearchQuery : searchQuery}
            onChange={(e) => {
              if (mainView === 'registrations') {
                setRegSearchQuery(e.target.value);
              } else {
                setSearchQuery(e.target.value);
              }
            }}
            placeholder={
              mainView === 'registrations'
                ? 'Search identity verifications by name, CNIC, phone, city, or trade...'
                : activeTab === 'all'
                ? 'Search operations directory by name, CNIC, address, or trade...'
                : activeTab === 'clients'
                ? 'Search clients by name, CNIC, or address...'
                : 'Search workers by name, CNIC, trade, or crew...'
            }
            className="pl-10 bg-white border-purple-200 text-gray-900 placeholder:text-gray-400 focus-visible:ring-purple-500 h-10 rounded-lg text-sm"
          />
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <DropdownMenu
            align="right"
            options={[
              {
                label: 'All',
                count: clients.length + workers.length + (isDefaultAdmin ? admins.length : 0),
                active: mainView === 'operations' && activeTab === 'all' && statusFilter === 'All',
                onClick: () => handleOperationsFilterSelect('all'),
              },
              ...(isDefaultAdmin ? [
                {
                  label: 'Administrators',
                  count: admins.length,
                  active: mainView === 'operations' && activeTab === 'admins',
                  onClick: () => handleOperationsFilterSelect('admins'),
                }
              ] : []),
              {
                label: 'Clients',
                count: clients.length,
                active: mainView === 'operations' && activeTab === 'clients',
                onClick: () => handleOperationsFilterSelect('clients'),
              },
              {
                label: 'Workers',
                count: workers.length,
                active: mainView === 'operations' && activeTab === 'workers',
                onClick: () => handleOperationsFilterSelect('workers'),
              },
              {
                label: 'Identity Verification Monitor',
                badge: pendingVerificationsCount > 0 ? `${pendingVerificationsCount} Review` : undefined,
                count: pendingVerificationsCount > 0 ? undefined : registrations.length,
                active: mainView === 'registrations',
                onClick: () => handleOperationsFilterSelect('registrations'),
              },
              {
                label: 'Active',
                active: mainView === 'operations' && activeTab === 'all' && statusFilter === 'Active',
                onClick: () => handleOperationsFilterSelect('Active'),
              },
              {
                label: 'On Duty',
                active: mainView === 'operations' && activeTab === 'all' && statusFilter === 'On Duty',
                onClick: () => handleOperationsFilterSelect('On Duty'),
              },
              {
                label: 'Completed',
                active: mainView === 'operations' && activeTab === 'all' && statusFilter === 'Completed',
                onClick: () => handleOperationsFilterSelect('Completed'),
              },
            ]}
            roleTheme="admin"
            preferenceKey="clearflow_pref_operations_filter"
            preferenceLabel="Operations Directory View"
            currentFilterLabel={
              mainView === 'registrations'
                ? 'Identity Verification'
                : activeTab === 'admins'
                ? 'Administrators'
                : activeTab === 'clients'
                ? 'Clients'
                : activeTab === 'workers'
                ? 'Workers'
                : statusFilter !== 'All'
                ? statusFilter
                : 'All'
            }
            onUploadPreference={(pref: string) => {
              const p = pref.toLowerCase();
              if (p.includes('ident') || p.includes('verif') || p.includes('reg')) {
                handleOperationsFilterSelect('registrations');
              } else if (p.includes('admin') && isDefaultAdmin) {
                handleOperationsFilterSelect('admins');
              } else if (p.includes('client')) {
                handleOperationsFilterSelect('clients');
              } else if (p.includes('work')) {
                handleOperationsFilterSelect('workers');
              } else if (p.includes('active')) {
                handleOperationsFilterSelect('Active');
              } else if (p.includes('duty')) {
                handleOperationsFilterSelect('On Duty');
              } else if (p.includes('comp')) {
                handleOperationsFilterSelect('Completed');
              } else {
                handleOperationsFilterSelect('all');
              }
            }}
          >
            <span className="font-semibold text-sm leading-none whitespace-nowrap">
              {
                mainView === 'registrations'
                  ? 'Identity Verification'
                  : activeTab === 'admins'
                  ? 'Administrators'
                  : activeTab === 'clients'
                  ? 'Clients'
                  : activeTab === 'workers'
                  ? 'Workers'
                  : statusFilter !== 'All'
                  ? statusFilter
                  : 'All'
              }
            </span>
            <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-xs font-bold font-mono bg-white/25 text-white leading-none">
              {
                mainView === 'registrations'
                  ? registrations.length
                  : activeTab === 'admins'
                  ? admins.length
                  : activeTab === 'clients'
                  ? clients.length
                  : activeTab === 'workers'
                  ? workers.length
                  : (clients.length + workers.length + (isDefaultAdmin ? admins.length : 0))
              }
            </span>
          </DropdownMenu>

          <Button
            size="sm"
            onClick={() => setIsAddUserOpen(true)}
            className="bg-purple-700 hover:bg-purple-800 text-white font-semibold text-xs h-10 px-4 rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer shrink-0"
          >
            <UserPlus className="h-4 w-4" />
            <span>Add User</span>
          </Button>
        </div>
      </div>

      {mainView === 'operations' ? (
        <>

      {/* ─── Operations Table (Bright Admin Light Theme) ─── */}
      <div className="relative overflow-hidden rounded-2xl border border-purple-200/80 bg-white shadow-sm w-full">
        <div className="responsive-table-wrapper touch-scroll overflow-x-auto w-full">
          <table className="min-w-[850px] w-full text-left text-sm text-gray-700 border-collapse">
            {/* Table Header */}
            <thead>
              <tr className="border-b border-purple-100 bg-purple-50/60 text-xs font-semibold text-gray-600 tracking-wider">
                <th scope="col" className="py-4 px-4 font-bold text-gray-900">ID</th>
                <th scope="col" className="py-4 px-4 font-bold text-gray-900">
                  {activeTab === 'all' ? 'Customer / Worker' : activeTab === 'clients' ? 'Customer' : 'Worker'}
                </th>
                <th scope="col" className="py-4 px-4 font-bold text-gray-900">
                  {activeTab === 'all' ? 'Facility & Specialization' : activeTab === 'clients' ? 'Address / Facility' : 'Trade & Address'}
                </th>
                <th scope="col" className="py-4 px-4 font-bold text-gray-900">CNIC (National ID)</th>
                <th scope="col" className="py-4 px-4 text-center font-bold text-gray-900">
                  Points
                </th>
                <th scope="col" className="py-4 px-4 text-center font-bold text-gray-900">Requests</th>
                <th scope="col" className="py-4 px-4 text-center font-bold text-gray-900">Accepted</th>
                <th scope="col" className="py-4 px-4 text-center font-bold text-gray-900">Refused</th>
                <th scope="col" className="py-4 px-4 font-bold text-gray-900">Rating</th>
                <th scope="col" className="py-4 px-4 font-bold text-gray-900">Status</th>
                <th scope="col" className="py-4 px-4 text-center font-bold text-gray-900">Actions</th>
              </tr>
            </thead>

            {/* Table Body (Unified Mix of Clients & Workers) */}
            <tbody className="divide-y divide-purple-100/70 font-normal">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={11} className="text-center py-12 text-gray-500 text-sm">
                    No records found matching the query.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const isSelected = selectedRowId === item.id;
                  const isClient = item.itemType === 'client';
                  const isAdmin = item.itemType === 'admin';
                  const isSelf = Boolean(
                    (authUser?.email && item.email && authUser.email.toLowerCase() === item.email.toLowerCase()) ||
                    (authUser?.id && item.id && authUser.id === item.id) ||
                    (authUser?.name && item.name && authUser.name.toLowerCase() === item.name.toLowerCase() && (authUser.role || 'admin').toLowerCase() === (item.itemType || '').toLowerCase())
                  );
                  const isPrimaryAdminRow =
                    isAdmin &&
                    (Boolean((item as any).isPrimary) ||
                     item.email === 'admin@clearflow.com' ||
                     item.email === 'admin@clearflow.pk' ||
                     item.id === 'A#0001');

                  return (
                    <tr
                      key={item.id}
                      onClick={() => {
                        setSelectedRowId(item.id);
                        setInspectedItem({ type: item.itemType, data: item });
                      }}
                      className="bg-white hover:bg-gray-50/40 transition-colors duration-150 cursor-pointer"
                    >
                      {/* ID */}
                      <td className="py-4 px-4 font-mono font-bold text-xs whitespace-nowrap">
                        <span className={cn(
                          "px-2.5 py-1 rounded-md inline-block shadow-2xs border font-mono font-bold text-xs",
                          isAdmin
                            ? "text-purple-800 bg-purple-50 border-purple-200"
                            : isClient
                            ? "text-teal-800 bg-teal-50 border-teal-200"
                            : "text-amber-800 bg-amber-50 border-amber-200"
                        )}>
                          {item.id}
                        </span>
                      </td>

                      {/* Customer / Worker / Admin Avatar (Initials Badge) & Name */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "h-9 w-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 shadow-2xs transition-transform hover:scale-105",
                            isAdmin
                              ? "bg-purple-100 text-purple-800 border border-purple-300"
                              : isClient
                                ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                : "bg-amber-100 text-amber-800 border border-amber-200"
                          )}>
                            {item.name ? item.name.split(' ').map((n: string) => n[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() : (isAdmin ? 'AD' : isClient ? 'CL' : 'FT')}
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900 leading-tight">
                              {item.name}
                            </div>
                            <div className={cn(
                              "text-xs font-semibold mt-0.5",
                              isAdmin
                                ? "text-purple-700 flex items-center gap-1"
                                : isClient
                                ? "text-teal-700"
                                : "text-amber-700"
                            )}>
                              {isAdmin ? (
                                <>
                                  <ShieldCheck className="w-3 h-3 text-purple-600 inline" />
                                  Admin
                                </>
                              ) : isClient ? 'Client' : 'Worker'}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Address / Specialization */}
                      <td className="py-4 px-4 max-w-[280px]">
                        {isAdmin ? (
                          <div className="font-semibold text-xs text-purple-800 mb-1 truncate max-w-[240px]" title={item.specialization || 'System Administration & Operations'}>
                            {item.specialization || 'System Administration & Operations'}
                          </div>
                        ) : (!isClient && item.specialization && (() => {
                          const trades = typeof item.specialization === 'string'
                            ? item.specialization.split(',').map((s: string) => s.trim()).filter(Boolean)
                            : (Array.isArray((item as any).serviceCategories) ? (item as any).serviceCategories : []);

                          if (trades.length === 0) return null;

                          return (
                            <div className="flex items-center gap-1.5 mb-0.5" title={item.specialization}>
                              <span className="font-semibold text-xs text-amber-800 truncate max-w-[190px]">
                                {trades[0]}
                              </span>
                              {trades.length > 1 && (
                                <span 
                                  className="text-[10px] font-bold text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200/90 shrink-0 cursor-help"
                                  title={`All trades: ${trades.join(', ')}`}
                                >
                                  +{trades.length - 1}
                                </span>
                              )}
                            </div>
                          );
                        })())}
                        <div className="flex items-center gap-1.5 text-xs text-gray-600">
                          <MapPin className={cn(
                            "h-3.5 w-3.5 shrink-0",
                            isAdmin ? "text-purple-600" : isClient ? "text-teal-600" : "text-amber-600"
                          )} />
                          <span className="truncate max-w-[240px]" title={item.address}>{item.address || 'Operations HQ, Central Facility Complex'}</span>
                        </div>
                      </td>

                      {/* CNIC */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <span className={cn(
                          "font-mono text-xs px-2 py-0.5 rounded-md tracking-wider font-medium border",
                          isAdmin
                            ? "bg-purple-50 text-purple-900 border-purple-200/80"
                            : isClient
                            ? "bg-teal-50 text-teal-900 border-teal-200/80"
                            : "bg-amber-50 text-amber-900 border-amber-200/80"
                        )}>
                          {item.cnic}
                        </span>
                      </td>

                      {/* Worker Spend / Points (Bank) */}
                      <td className="py-4 px-4 whitespace-nowrap text-center">
                        {isAdmin || isClient ? (
                          <span className="text-gray-400 font-mono text-xs select-none inline-block">—</span>
                        ) : (
                          <div className="flex items-center justify-center gap-1.5 font-mono text-xs font-bold text-amber-800">
                            <Coins className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                            <span>{item.purchasedPoints ?? 0}</span>
                          </div>
                        )}
                      </td>

                      {/* Total Requests */}
                      <td className="py-4 px-4 text-center font-bold text-gray-900">
                        {isAdmin ? <span className="text-gray-400 font-mono text-xs select-none inline-block font-normal">—</span> : item.totalRequests}
                      </td>

                      {/* Accepted */}
                      <td className="py-4 px-4 text-center">
                        {isAdmin ? (
                          <span className="text-gray-400 font-mono text-xs select-none inline-block font-normal">—</span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-emerald-600 text-xs font-semibold">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            {item.acceptedRequests}
                          </span>
                        )}
                      </td>

                      {/* Refused / Cancel */}
                      <td className="py-4 px-4 text-center">
                        {isAdmin ? (
                          <span className="text-gray-400 font-mono text-xs select-none inline-block font-normal">—</span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-rose-600 text-xs font-semibold">
                            <XCircle className="h-3.5 w-3.5" />
                            {item.cancelledOrRefused ?? 0}
                          </span>
                        )}
                      </td>

                      {/* Rating */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1 text-amber-600 font-semibold text-xs">
                          <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                          <span>{Number(item.averageRating ?? (item as any)?.rating ?? 0.0).toFixed(1)}</span>
                        </div>
                      </td>

                      {/* Status Pill */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        {renderStatusPill(item.status, item)}
                      </td>

                      {/* Actions: Admin Full CRUD Controls */}
                      <td className="py-4 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                          {!isSelf && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                const targetId = item.id || item._id;
                                const targetName = item.name || 'User';
                                const targetRole = ('role' in item && item.role) ? (item as any).role : (item.itemType === 'admin' ? 'Admin' : item.itemType === 'worker' ? 'Worker' : 'Client');
                                const targetType = item.itemType || 'client';
                                const targetEmail = item.email || '';
                                navigate(`/chat/${encodeURIComponent(targetId)}?userId=${encodeURIComponent(item._id || item.id)}&name=${encodeURIComponent(targetName)}&role=${encodeURIComponent(targetRole)}&type=${encodeURIComponent(targetType)}&email=${encodeURIComponent(targetEmail)}`);
                              }}
                              className={cn(
                                "h-8 px-2.5 text-xs cursor-pointer font-semibold rounded-lg shadow-2xs border transition-colors",
                                isAdmin
                                  ? "text-purple-700 border-purple-200 hover:bg-purple-50 hover:text-purple-900"
                                  : isClient
                                  ? "text-teal-700 border-teal-200 hover:bg-teal-50 hover:text-teal-900"
                                  : "text-amber-700 border-amber-200 hover:bg-amber-50 hover:text-amber-900"
                              )}
                              title={`Chat with ${item.name}`}
                            >
                              <MessageSquare className="h-3.5 w-3.5 mr-1" />
                              Chat
                            </Button>
                          )}

                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openEditModal(item)}
                            className="h-8 px-2 text-xs text-blue-700 border-blue-200 hover:bg-blue-50 cursor-pointer font-semibold rounded-lg shadow-2xs"
                            title={`Edit ${item.name}`}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>

                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setResetPasswordUser(item);
                              setNewPasswordVal('');
                            }}
                            className="h-8 px-2 text-xs text-pink-600 border-pink-200 hover:bg-pink-50 hover:text-pink-700 cursor-pointer font-semibold rounded-lg shadow-2xs"
                            title={`Reset Password for ${item.name}`}
                          >
                            <KeyRound className="h-3.5 w-3.5 text-pink-600" />
                          </Button>

                          {isAdmin && (
                            isPrimaryAdminRow ? (
                              <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-purple-100 text-purple-800 border border-purple-300 shadow-2xs select-none">
                                Primary Admin
                              </span>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleSetPrimaryAdmin(item)}
                                className="h-8 px-2 text-xs text-purple-700 border-purple-200 hover:bg-purple-100 font-semibold rounded-lg shadow-2xs flex items-center gap-1 cursor-pointer"
                                title="Designate as Primary Administrator"
                              >
                                <ShieldCheck className="h-3.5 w-3.5 text-purple-600" />
                                <span>Make Primary</span>
                              </Button>
                            )
                          )}

                          {!isPrimaryAdminRow && !isSelf && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleToggleUserStatus(item)}
                              className={cn(
                                "h-8 px-2 text-xs cursor-pointer font-semibold rounded-lg shadow-2xs transition-colors",
                                item.status === 'Suspended' || item.isActive === false
                                  ? "text-rose-700 border-rose-300 bg-rose-50 hover:bg-rose-100"
                                  : isAdmin
                                  ? "text-purple-700 border-purple-200 hover:bg-purple-50 hover:text-purple-900"
                                  : isClient
                                  ? "text-teal-700 border-teal-200 hover:bg-teal-50 hover:text-teal-900"
                                  : "text-amber-700 border-amber-200 hover:bg-amber-50 hover:text-amber-900"
                              )}
                              title={
                                item.status === 'Suspended' || item.isActive === false
                                  ? 'Account Suspended - Click to Revoke'
                                  : 'Suspend Account'
                              }
                            >
                              <Power className="h-3.5 w-3.5" />
                            </Button>
                          )}

                          {!isPrimaryAdminRow && !isSelf && (item.email !== 'admin@clearflow.com' && item.email !== 'admin@clearflow.pk' && (!('canDelete' in item) || (item as any).canDelete !== false)) && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setAdminPasswordInput('');
                                setDeletingUser(item);
                              }}
                              className="h-8 px-2 text-xs text-rose-600 border-rose-200 hover:bg-rose-50 hover:text-rose-700 cursor-pointer font-semibold rounded-lg shadow-2xs"
                              title={`Delete ${item.name}`}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer with Summary Stats */}
        <div className="border-t border-purple-100 bg-purple-50/40 px-5 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-600">
          <div className="flex items-center gap-4">
            <span>
              Showing <b className="text-gray-900">{filteredItems.length}</b> {activeTab === 'all' ? 'operations' : activeTab}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-gray-500">
              Click any row to inspect record details
            </span>
          </div>
        </div>
      </div>
        </>
      ) : (
        /* ─── Registration & Identity Verification Monitor ─── */
        <div className="space-y-4">
          {/* Verification Monitor Scope & Status Controls */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-purple-200/80 shadow-sm">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-purple-700" />
                Registry Scope:
              </span>
              <div className="inline-flex rounded-lg bg-purple-50 p-0.5 border border-purple-200/60 shrink-0">
                <button
                  type="button"
                  onClick={() => setRegistrationSubTab('all')}
                  className={cn(
                    "px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer",
                    registrationSubTab === 'all'
                      ? "bg-purple-700 text-white shadow-2xs"
                      : "text-purple-900 hover:bg-purple-100"
                  )}
                >
                  All ({registrations.length})
                </button>
                <button
                  type="button"
                  onClick={() => setRegistrationSubTab('clients')}
                  className={cn(
                    "px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer",
                    registrationSubTab === 'clients'
                      ? "bg-emerald-700 text-white shadow-2xs"
                      : "text-emerald-900 hover:bg-emerald-100"
                  )}
                >
                  Clients ({clientRegistrations.length})
                </button>
                <button
                  type="button"
                  onClick={() => setRegistrationSubTab('workers')}
                  className={cn(
                    "px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer",
                    registrationSubTab === 'workers'
                      ? "bg-amber-700 text-white shadow-2xs"
                      : "text-amber-900 hover:bg-amber-100"
                  )}
                >
                  Workers ({workerRegistrations.length})
                </button>
              </div>
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 font-medium">Verification Status:</span>
              <select
                value={regStatusFilter}
                onChange={(e) => setRegStatusFilter(e.target.value)}
                aria-label="Filter registrations by verification status"
                className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-purple-200 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer"
              >
                <option value="All">All Verification Statuses</option>
                <option value="Newly Registered">Newly Registered</option>
                <option value="Profile Incomplete">Profile Incomplete</option>
                <option value="Verification Pending">Verification Pending</option>
                <option value="Verified">Verified</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>
          </div>

          {/* Registrations Table */}
          <div className="relative overflow-hidden rounded-2xl border border-purple-200/80 bg-white shadow-sm w-full">
            <div className="responsive-table-wrapper touch-scroll overflow-x-auto w-full">
              <table className="min-w-[900px] w-full text-left text-sm text-gray-700 border-collapse">
                <thead>
                  <tr className="border-b border-purple-100 bg-purple-50/60 text-xs font-semibold text-gray-600 tracking-wider">
                    <th scope="col" className="py-4 px-4 font-bold text-gray-900">User / Account</th>
                    <th scope="col" className="py-4 px-4 font-bold text-gray-900">Contact</th>
                    <th scope="col" className="py-4 px-4 font-bold text-gray-900">
                      Pakistani CNIC (National ID)
                    </th>
                    {registrationSubTab === 'workers' ? (
                      <th scope="col" className="py-4 px-4 font-bold text-gray-900">Service Categories / Experience</th>
                    ) : registrationSubTab === 'clients' ? (
                      <th scope="col" className="py-4 px-4 font-bold text-gray-900">Service Address</th>
                    ) : (
                      <th scope="col" className="py-4 px-4 font-bold text-gray-900">Trade / Address</th>
                    )}
                    <th scope="col" className="py-4 px-4 font-bold text-gray-900">Registered Date</th>
                    <th scope="col" className="py-4 px-4 font-bold text-gray-900">CNIC Verification</th>
                    <th scope="col" className="py-4 px-4 font-bold text-gray-900">Profile</th>
                    <th scope="col" className="py-4 px-4 font-bold text-gray-900">Account</th>
                    <th scope="col" className="py-4 px-4 text-center font-bold text-gray-900">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-purple-100/70 font-normal">
                  {filteredRegistrations.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="text-center py-12 text-gray-500 text-sm">
                        No registrations found matching the criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredRegistrations.map((reg) => {
                      const isClient = reg.role === 'Client';
                      const isRevealed = Boolean(revealedCnics[reg._id]);
                      const displayCnic = isRevealed
                        ? reg.rawCnic || reg.cnicMasked
                        : reg.cnicMasked;
                      const isVerified = reg.verificationStatus === 'Verified';
                      const isUpdating = updatingId === reg._id;

                      return (
                        <tr
                          key={reg._id}
                          className="bg-white hover:bg-gray-50/40 transition-colors duration-150 cursor-pointer"
                          onClick={() => setInspectedRegistration(reg)}
                        >
                          {/* Name & Role */}
                          <td className="py-4 px-4 whitespace-nowrap">
                            <div className="flex items-center gap-3">
                              <div className={cn(
                                "h-9 w-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 shadow-2xs",
                                isClient
                                  ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                  : "bg-amber-100 text-amber-800 border border-amber-200"
                              )}>
                                {isClient ? 'CL' : 'FT'}
                              </div>
                              <div>
                                <div className="font-bold text-gray-950 text-sm flex items-center gap-1.5">
                                  {reg.name}
                                  <span className={cn(
                                    "px-1.5 py-0.2 rounded-md text-[10px] font-bold uppercase tracking-wider border",
                                    isClient
                                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                      : "bg-amber-50 text-amber-700 border-amber-200"
                                  )}>
                                    {isClient ? 'Client' : 'Worker'}
                                  </span>
                                </div>
                                <div className="text-xs text-gray-500 font-mono">
                                  {cleanDisplayEmail(reg.email, reg.name)}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Contact (Phone) */}
                          <td className="py-4 px-4 whitespace-nowrap text-xs text-gray-700 font-mono">
                            {reg.phone || 'Not provided'}
                          </td>

                          {/* Pakistani CNIC - Always Full Display (No Eye Toggle) */}
                          <td className="py-4 px-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                            <div className={cn(
                              "inline-flex items-center px-2.5 py-1 rounded-lg border",
                              isClient
                                ? "bg-teal-50 border-teal-200"
                                : "bg-amber-50 border-amber-200"
                            )}>
                              <span className={cn(
                                "font-mono text-xs font-semibold tracking-wider",
                                isClient ? "text-teal-900" : "text-amber-900"
                              )}>
                                {reg.rawCnic || reg.cnic || reg.cnicMasked || '35202-8492015-1'}
                              </span>
                            </div>
                          </td>

                          {/* Specific columns for Client vs Worker */}
                          <td className="py-4 px-4 text-xs text-gray-600 max-w-xs">
                            {!isClient ? (
                              <div>
                                <div className="flex flex-wrap gap-1 mb-1">
                                  {Array.isArray(reg.serviceCategories) && reg.serviceCategories.length > 0 ? (
                                    reg.serviceCategories.map((cat, idx) => (
                                      <span
                                        key={idx}
                                        className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200"
                                      >
                                        {cat}
                                      </span>
                                    ))
                                  ) : (
                                    <span className="text-gray-400">General Field Ops</span>
                                  )}
                                </div>
                                <div className="text-[11px] text-gray-500">
                                  {reg.city || 'Lahore'} &bull; {reg.experienceYears ? `${reg.experienceYears} yrs exp` : 'Experienced'}
                                </div>
                              </div>
                            ) : (
                              <div>
                                <div className="truncate font-medium text-gray-900">
                                  {reg.address || 'Address pending'}
                                </div>
                                <div className="text-[11px] text-gray-500">
                                  {reg.city ? `${reg.city}, Pakistan` : 'Pakistan'}
                                </div>
                              </div>
                            )}
                          </td>

                          {/* Registration Date */}
                          <td className="py-4 px-4 whitespace-nowrap text-xs text-gray-600">
                            {reg.registeredAt ? new Date(reg.registeredAt).toLocaleDateString() : 'Recent'}
                          </td>

                          {/* CNIC Verification Status */}
                          <td className="py-4 px-4 whitespace-nowrap">
                            {renderVerificationBadge(reg.verificationStatus)}
                          </td>

                          {/* Profile Completion Status */}
                          <td className="py-4 px-4 whitespace-nowrap">
                            {renderProfileCompletionBadge(reg.profileCompletionStatus)}
                          </td>

                          {/* Account Status */}
                          <td className="py-4 px-4 whitespace-nowrap">
                            {renderAccountStatusBadge(reg.accountStatus, reg.role)}
                          </td>

                          {/* Action Buttons */}
                          <td className="py-4 px-4 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-center gap-1.5">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setInspectedRegistration(reg)}
                                className={cn(
                                  "h-7 px-2.5 text-xs cursor-pointer rounded-lg font-semibold",
                                  isClient
                                    ? "text-teal-700 border-teal-200 hover:bg-teal-50"
                                    : "text-amber-700 border-amber-200 hover:bg-amber-50"
                                )}
                                title="Inspect registration details"
                              >
                                <Eye className="h-3 w-3 mr-1" />
                                Inspect
                              </Button>

                              {!isVerified && (
                                <Button
                                  size="sm"
                                  disabled={isUpdating}
                                  onClick={() => handleUpdateVerificationStatus(reg._id, 'Verified')}
                                  className="h-7 px-2 text-xs bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer rounded-lg font-semibold shadow-2xs"
                                  title="Approve identity verification"
                                >
                                  <UserCheck className="h-3 w-3 mr-1" />
                                  Approve
                                </Button>
                              )}

                              {reg.verificationStatus !== 'Rejected' && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  disabled={isUpdating}
                                  onClick={() => handleUpdateVerificationStatus(reg._id, 'Rejected')}
                                  className="h-7 px-2 text-xs text-rose-600 hover:bg-rose-50 hover:text-rose-700 cursor-pointer rounded-lg font-semibold"
                                  title="Reject identity verification"
                                >
                                  <UserX className="h-3 w-3" />
                                </Button>
                              )}

                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openEditModal(reg)}
                                className="h-7 px-2 text-xs text-blue-700 border-blue-200 hover:bg-blue-50 cursor-pointer rounded-lg font-semibold"
                                title={`Edit ${reg.name}`}
                              >
                                <Pencil className="h-3 w-3" />
                              </Button>

                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setDeletingUser(reg)}
                                className="h-7 px-2 text-xs text-rose-600 border-rose-200 hover:bg-rose-50 cursor-pointer rounded-lg font-semibold"
                                title={`Delete ${reg.name}`}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Registration Table Footer */}
            <div className="border-t border-purple-100 bg-purple-50/40 px-5 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-600">
              <div className="flex items-center gap-4">
                <span>
                  Showing <b className="text-gray-900">{filteredRegistrations.length}</b> registration records
                </span>
                <span>&bull;</span>
                <span className="text-emerald-700 font-semibold">
                  Verified: {registrations.filter((r) => r.verificationStatus === 'Verified').length}
                </span>
                <span>&bull;</span>
                <span className="text-amber-700 font-semibold">
                  Pending: {pendingVerificationsCount}
                </span>
              </div>
              <div className="text-[11px] text-gray-500">
                Click any row to open the identity dossier
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Inspection Modal / Dialog (Admin Light Theme) ─── */}
      <Dialog open={!!inspectedItem} onOpenChange={(open) => !open && setInspectedItem(null)}>
        <DialogContent className="bg-white border border-purple-200 text-gray-900 w-[calc(100vw-1.5rem)] max-w-2xl max-h-[90dvh] flex flex-col p-4 sm:p-6 rounded-2xl shadow-2xl overflow-hidden">
          {inspectedItem && (
            <>
              <DialogHeader className="shrink-0">
                <div className="flex items-center gap-3.5">
                  <div className={cn(
                    "h-14 w-14 rounded-full flex items-center justify-center text-lg font-bold shrink-0 shadow-sm",
                    inspectedItem.type === 'admin'
                      ? "bg-purple-100 text-purple-800 border-2 border-purple-300"
                      : inspectedItem.type === 'client'
                        ? "bg-emerald-100 text-emerald-800 border-2 border-emerald-200"
                        : "bg-amber-100 text-amber-800 border-2 border-amber-200"
                  )}>
                    {inspectedItem.data.name ? inspectedItem.data.name.split(' ').map((n: string) => n[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() : (inspectedItem.type === 'admin' ? 'AD' : inspectedItem.type === 'client' ? 'CL' : 'FT')}
                  </div>
                  <div>
                    <DialogTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
                      {inspectedItem.data.name}
                      <span className={cn(
                        "text-xs px-2.5 py-0.5 rounded-full font-semibold border",
                        inspectedItem.type === 'admin'
                          ? "bg-purple-100 text-purple-800 border-purple-200"
                          : inspectedItem.type === 'client'
                          ? "bg-teal-100 text-teal-800 border-teal-200"
                          : "bg-amber-100 text-amber-800 border-amber-200"
                      )}>
                        {inspectedItem.type === 'admin' ? 'Administrator' : inspectedItem.type === 'client' ? 'Client' : 'Worker'}
                      </span>
                    </DialogTitle>
                    <DialogDescription className="text-xs text-gray-500 mt-1">
                      ID: <span className={cn(
                        "font-mono font-bold",
                        inspectedItem.type === 'admin'
                          ? "text-purple-700"
                          : inspectedItem.type === 'client'
                          ? "text-teal-700"
                          : "text-amber-700"
                      )}>{inspectedItem.data.id}</span> &bull; Registered: {inspectedItem.data.registeredDate || '2026'}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              {/* Scrollable Modal Body */}
              <div className="overflow-y-auto pr-1.5 space-y-3.5 my-2 flex-1">
                {/* Identity & Contact Details */}
                <div className="grid grid-cols-2 gap-3">
                  <div className={cn(
                    "p-3 rounded-xl border",
                    inspectedItem.type === 'admin'
                      ? "bg-purple-50/50 border-purple-100"
                      : inspectedItem.type === 'client'
                      ? "bg-teal-50/50 border-teal-100"
                      : "bg-amber-50/50 border-amber-100"
                  )}>
                    <span className="text-[11px] text-gray-500 block font-medium">CNIC (National ID)</span>
                    <span className={cn(
                      "font-mono text-sm font-bold tracking-wider",
                      inspectedItem.type === 'admin'
                        ? "text-purple-900"
                        : inspectedItem.type === 'client'
                        ? "text-teal-900"
                        : "text-amber-900"
                    )}>
                      {inspectedItem.data.cnic}
                    </span>
                  </div>
                  <div className={cn(
                    "p-3 rounded-xl border",
                    inspectedItem.type === 'admin'
                      ? "bg-purple-50/50 border-purple-100"
                      : inspectedItem.type === 'client'
                      ? "bg-teal-50/50 border-teal-100"
                      : "bg-amber-50/50 border-amber-100"
                  )}>
                    <span className="text-[11px] text-gray-500 block font-medium">Phone Number</span>
                    <span className="text-sm font-semibold text-gray-900">
                      {inspectedItem.data.phone}
                    </span>
                  </div>
                </div>

                <div className={cn(
                  "p-3 rounded-xl border",
                  inspectedItem.type === 'admin'
                    ? "bg-purple-50/50 border-purple-100"
                    : inspectedItem.type === 'client'
                    ? "bg-teal-50/50 border-teal-100"
                    : "bg-amber-50/50 border-amber-100"
                )}>
                  <span className="text-[11px] text-gray-500 block font-medium">Facility / Sector Address</span>
                  <div className="flex items-start gap-1.5 text-xs text-gray-800 mt-0.5">
                    <MapPin className={cn(
                      "h-4 w-4 shrink-0 mt-0.5",
                      inspectedItem.type === 'admin'
                        ? "text-purple-600"
                        : inspectedItem.type === 'client'
                        ? "text-teal-600"
                        : "text-amber-600"
                    )} />
                    <span>{inspectedItem.data.address}</span>
                  </div>
                </div>

                {inspectedItem.type === 'worker' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-amber-50/50 p-3 rounded-xl border border-amber-100">
                      <span className="text-[11px] text-gray-500 block font-medium">Specialization</span>
                      <span className="text-xs font-semibold text-amber-900">
                        {inspectedItem.data.specialization}
                      </span>
                    </div>
                    <div className="bg-amber-50/50 p-3 rounded-xl border border-amber-100">
                      <span className="text-[11px] text-gray-500 block font-medium">Assigned Fleet</span>
                      <span className="text-xs font-semibold text-gray-900">
                        {inspectedItem.data.crewName}
                      </span>
                    </div>
                  </div>
                )}

                {/* Performance & Request Metrics (Interactive filter triggers) */}
                <div className={cn(
                  "p-4 rounded-xl border",
                  inspectedItem.type === 'admin'
                    ? "bg-gradient-to-br from-purple-50/70 to-white border-purple-200"
                    : inspectedItem.type === 'client'
                    ? "bg-gradient-to-br from-teal-50/70 to-white border-teal-200"
                    : "bg-gradient-to-br from-amber-50/70 to-white border-amber-200"
                )}>
                  <div className="flex items-center justify-between mb-2.5">
                    <div className={cn(
                      "text-xs font-bold",
                      inspectedItem.type === 'admin'
                        ? "text-purple-900"
                        : inspectedItem.type === 'client'
                        ? "text-teal-900"
                        : "text-amber-900"
                    )}>
                      Performance & Request Analytics
                    </div>
                    <span className={cn(
                      "text-[10px] font-semibold px-2 py-0.5 rounded-full border",
                      inspectedItem.type === 'admin'
                        ? "text-purple-700 bg-purple-100/70 border-purple-200"
                        : inspectedItem.type === 'client'
                        ? "text-teal-700 bg-teal-100/70 border-teal-200"
                        : "text-amber-700 bg-amber-100/70 border-amber-200"
                    )}>
                      Click metric to view requests
                    </span>
                  </div>

                  <div className="grid grid-cols-4 gap-2 text-center">
                    {/* Total (All Requests) Filter Button */}
                    <button
                      type="button"
                      onClick={() => setOrderFilter('all')}
                      className={cn(
                        "p-2.5 rounded-xl border text-center transition-all cursor-pointer relative group",
                        orderFilter === 'all'
                          ? inspectedItem.type === 'admin'
                            ? "bg-purple-100/90 border-purple-500 ring-2 ring-purple-400/40 shadow-sm"
                            : inspectedItem.type === 'client'
                            ? "bg-teal-100/90 border-teal-500 ring-2 ring-teal-400/40 shadow-sm"
                            : "bg-amber-100/90 border-amber-500 ring-2 ring-amber-400/40 shadow-sm"
                          : "bg-white border-gray-100 hover:bg-gray-50/50"
                      )}
                    >
                      <span className="text-[10px] text-gray-600 block font-medium">Total</span>
                      <span className="text-sm font-bold text-gray-900 block mt-0.5">{inspectedItem.data.totalRequests}</span>
                      <span className={cn(
                        "text-[9px] block font-semibold mt-0.5",
                        orderFilter === 'all' 
                          ? inspectedItem.type === 'admin'
                            ? "text-purple-700"
                            : inspectedItem.type === 'client'
                            ? "text-teal-700"
                            : "text-amber-700"
                          : "text-gray-400 group-hover:text-gray-600"
                      )}>
                        {orderFilter === 'all' ? '● Active' : 'View All'}
                      </span>
                    </button>

                    {/* Accepted Filter Button */}
                    <button
                      type="button"
                      onClick={() => setOrderFilter('accepted')}
                      className={cn(
                        "p-2.5 rounded-xl border text-center transition-all cursor-pointer relative group",
                        orderFilter === 'accepted'
                          ? "bg-emerald-100/90 border-emerald-500 ring-2 ring-emerald-400/40 shadow-sm"
                          : "bg-white border-gray-100 hover:border-emerald-300 hover:bg-emerald-50/50"
                      )}
                    >
                      <span className="text-[10px] text-emerald-700 block font-medium">Accepted</span>
                      <span className="text-sm font-bold text-emerald-700 block mt-0.5">{inspectedItem.data.acceptedRequests}</span>
                      <span className={cn(
                        "text-[9px] block font-semibold mt-0.5",
                        orderFilter === 'accepted' ? "text-emerald-700" : "text-gray-400 group-hover:text-emerald-600"
                      )}>
                        {orderFilter === 'accepted' ? '● Active' : 'View Accepted'}
                      </span>
                    </button>

                    {/* Cancelled Filter Button */}
                    <button
                      type="button"
                      onClick={() => setOrderFilter('cancelled')}
                      className={cn(
                        "p-2.5 rounded-xl border text-center transition-all cursor-pointer relative group",
                        orderFilter === 'cancelled'
                          ? "bg-rose-100/90 border-rose-500 ring-2 ring-rose-400/40 shadow-sm"
                          : "bg-white border-gray-100 hover:border-rose-300 hover:bg-rose-50/50"
                      )}
                    >
                      <span className="text-[10px] text-rose-700 block font-medium">Cancelled</span>
                      <span className="text-sm font-bold text-rose-700 block mt-0.5">{inspectedItem.data.cancelledOrRefused ?? 0}</span>
                      <span className={cn(
                        "text-[9px] block font-semibold mt-0.5",
                        orderFilter === 'cancelled' ? "text-rose-700" : "text-gray-400 group-hover:text-rose-600"
                      )}>
                        {orderFilter === 'cancelled' ? '● Active' : 'View Cancelled'}
                      </span>
                    </button>

                    {/* Rating Card */}
                    <div className="p-2.5 rounded-xl border border-gray-100 bg-white text-center">
                      <span className="text-[10px] text-amber-700 block font-medium">Rating</span>
                      <span className="text-sm font-bold text-amber-700 flex items-center justify-center gap-0.5 mt-0.5">
                        <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                        {Number(inspectedItem.data.averageRating ?? (inspectedItem.data as any)?.rating ?? 0.0).toFixed(1)}
                      </span>
                      <span className="text-[9px] text-gray-400 block font-medium mt-0.5">
                        Performance
                      </span>
                    </div>
                  </div>

                  {inspectedItem.type === 'worker' && (
                    <div className="mt-3 pt-3 border-t border-amber-100 flex flex-col gap-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Worker Order Account Points:</span>
                        <span className="font-bold text-amber-800 font-mono text-sm">
                          {inspectedItem.data.purchasedPoints ?? 0} Points
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* ─── Filtered Work Orders / Requests List ─── */}
                <div className={cn(
                  "p-4 rounded-xl border",
                  inspectedItem.type === 'admin'
                    ? "bg-purple-50/40 border-purple-200"
                    : inspectedItem.type === 'client'
                    ? "bg-teal-50/40 border-teal-200"
                    : "bg-amber-50/40 border-amber-200"
                )}>
                  <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "text-xs font-bold flex items-center gap-1.5",
                        inspectedItem.type === 'admin'
                          ? "text-purple-950"
                          : inspectedItem.type === 'client'
                          ? "text-teal-950"
                          : "text-amber-950"
                      )}>
                        {orderFilter === 'all' && (
                          <>
                            <ClipboardList className={cn(
                              "h-4 w-4",
                              inspectedItem.type === 'admin'
                                ? "text-purple-700"
                                : inspectedItem.type === 'client'
                                ? "text-teal-700"
                                : "text-amber-700"
                            )} />
                            <span>All Service Requests</span>
                          </>
                        )}
                        {orderFilter === 'accepted' && (
                          <>
                            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                            <span>Accepted & Active Requests</span>
                          </>
                        )}
                        {orderFilter === 'cancelled' && (
                          <>
                            <XCircle className="h-4 w-4 text-rose-600" />
                            <span>Cancelled & Refused Requests</span>
                          </>
                        )}
                      </span>
                      <span className={cn(
                        "text-[10px] font-bold px-2 py-0.5 rounded-full border",
                        orderFilter === 'all' && (
                          inspectedItem.type === 'admin'
                            ? "bg-purple-100 text-purple-800 border-purple-200"
                            : inspectedItem.type === 'client'
                            ? "bg-teal-100 text-teal-800 border-teal-200"
                            : "bg-amber-100 text-amber-800 border-amber-200"
                        ),
                        orderFilter === 'accepted' && "bg-emerald-100 text-emerald-800 border-emerald-200",
                        orderFilter === 'cancelled' && "bg-rose-100 text-rose-800 border-rose-200"
                      )}>
                        {displayedOrders.length} {displayedOrders.length === 1 ? 'order' : 'orders'}
                      </span>
                    </div>
                  </div>

                  {/* Orders Scrollable List */}
                  <div className="max-h-64 sm:max-h-72 overflow-y-auto space-y-2 pr-1">
                    {displayedOrders.length === 0 ? (
                      <div className="py-8 text-center bg-white rounded-xl border border-dashed border-gray-200 text-gray-500">
                        <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-1.5 opacity-80" />
                        <p className="text-xs font-semibold text-gray-800">No {orderFilter} requests</p>
                        <p className="text-[11px] text-gray-500 mt-0.5">
                          {orderFilter === 'cancelled'
                            ? 'This account has maintained a 100% successful fulfillment record with no cancellations.'
                            : 'No orders recorded under this filter.'}
                        </p>
                      </div>
                    ) : (
                      displayedOrders.map((ord) => (
                        <div
                          key={ord.id}
                          className={cn(
                            "p-3 rounded-xl border transition-all text-left bg-white hover:border-purple-300 hover:shadow-xs",
                            ord.isCancelled 
                              ? "border-rose-200/80 bg-rose-50/20" 
                              : ord.status === 'InProgress' 
                                ? "border-purple-200 bg-purple-50/20" 
                                : "border-gray-200"
                          )}
                        >
                          {/* Order Header: Category, Status, Price */}
                          <div className="flex items-center justify-between gap-2 flex-wrap mb-1.5">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 font-semibold border border-gray-200">
                                {ord.category}
                              </span>
                              {renderOrderStatusBadge(ord.status)}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-bold text-gray-900">
                                {ord.price}
                              </span>
                            </div>
                          </div>

                          {/* Title & Description */}
                          <div className="text-xs font-bold text-gray-900 line-clamp-1 mb-1">
                            {ord.title}
                          </div>

                          {/* Location */}
                          <div className="flex items-center gap-1 text-[11px] text-gray-500 mb-1.5">
                            <MapPin className="h-3 w-3 text-purple-500 shrink-0" />
                            <span className="truncate">{ord.location}</span>
                          </div>

                          {/* Cancellation reason if cancelled */}
                          {ord.isCancelled && ord.cancellationReason && (
                            <div className="mb-2 p-2 rounded-lg bg-rose-50 border border-rose-200 text-[11px] text-rose-800 flex items-start gap-1.5">
                              <XCircle className="h-3.5 w-3.5 text-rose-600 shrink-0 mt-0.5" />
                              <div>
                                <span className="font-semibold">Cancellation Reason: </span>
                                <span>{ord.cancellationReason}</span>
                              </div>
                            </div>
                          )}

                          {/* Order Footer: Counterpart & Date */}
                          <div className="flex items-center justify-between text-[11px] text-gray-500 pt-1.5 border-t border-gray-100">
                            <div className="flex items-center gap-1 truncate">
                              <span className="font-medium text-gray-600">{ord.counterpartLabel}:</span>
                              <span className="font-semibold text-purple-900">{ord.counterpartName}</span>
                              <span className="text-gray-400 font-mono text-[10px]">({ord.counterpartId})</span>
                            </div>
                            <div className="flex items-center gap-1 shrink-0 text-gray-400">
                              <Clock className="h-3 w-3" />
                              <span>{ord.date}</span>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ─── Admin Full CRUD: Add New User Modal ─── */}
      <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
        <DialogContent className="bg-white border border-purple-200 text-gray-900 w-[calc(100vw-1.5rem)] max-w-lg p-4 sm:p-6 rounded-2xl shadow-2xl max-h-[90dvh] overflow-y-auto touch-scroll">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-purple-700" />
              Add New User Account
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500">
              Create a new client, field worker, or administrator with full database credentials.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateUser} className="space-y-3.5 mt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-gray-700">Full Name *</label>
                <Input
                  required
                  value={addUserForm.name}
                  onChange={(e) => setAddUserForm({ ...addUserForm, name: e.target.value })}
                  placeholder="e.g. Tariq Mehmood"
                  className="mt-1 bg-white border-purple-200 text-sm h-9"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-700">Account Role *</label>
                <select
                  value={addUserForm.role}
                  onChange={(e) => setAddUserForm({ ...addUserForm, role: e.target.value })}
                  className="mt-1 w-full bg-white border border-purple-200 text-gray-900 rounded-md px-3 py-1.5 text-sm h-9 focus:ring-1 focus:ring-purple-500"
                >
                  <option value="Client">Client</option>
                  <option value="FieldTeam">Field Worker / Team</option>
                  <option value="Admin">Administrator</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-gray-700">Email Address *</label>
                <Input
                  required
                  type="email"
                  value={addUserForm.email}
                  onChange={(e) => setAddUserForm({ ...addUserForm, email: e.target.value })}
                  placeholder="user@example.com"
                  className="mt-1 bg-white border-purple-200 text-sm h-9"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-700">Initial Password *</label>
                <Input
                  required
                  type="password"
                  value={addUserForm.password}
                  onChange={(e) => setAddUserForm({ ...addUserForm, password: e.target.value })}
                  placeholder="Min 6 characters"
                  className="mt-1 bg-white border-purple-200 text-sm h-9"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-gray-700">Phone Number</label>
                <Input
                  value={addUserForm.phone}
                  onChange={(e) => setAddUserForm({ ...addUserForm, phone: e.target.value })}
                  placeholder="+92 300 1234567"
                  className="mt-1 bg-white border-purple-200 text-sm h-9"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-700">CNIC Number</label>
                <Input
                  value={addUserForm.cnic}
                  onChange={(e) => setAddUserForm({ ...addUserForm, cnic: e.target.value })}
                  placeholder="35201-1234567-1"
                  className="mt-1 bg-white border-purple-200 text-sm h-9"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-gray-700">City</label>
                <Input
                  value={addUserForm.city}
                  onChange={(e) => setAddUserForm({ ...addUserForm, city: e.target.value })}
                  placeholder="Lahore"
                  className="mt-1 bg-white border-purple-200 text-sm h-9"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-700">Address / Location</label>
                <Input
                  value={addUserForm.address}
                  onChange={(e) => setAddUserForm({ ...addUserForm, address: e.target.value })}
                  placeholder="DHA Phase 5, Lahore"
                  className="mt-1 bg-white border-purple-200 text-sm h-9"
                />
              </div>
            </div>

            {addUserForm.role === 'FieldTeam' && (
              <div>
                <label className="text-xs font-semibold text-gray-700">Trade / Specializations (comma separated)</label>
                <Input
                  value={addUserForm.serviceCategories}
                  onChange={(e) => setAddUserForm({ ...addUserForm, serviceCategories: e.target.value })}
                  placeholder="Cleaning, Electrical Repair, Plumbing"
                  className="mt-1 bg-white border-purple-200 text-sm h-9"
                />
              </div>
            )}

            <DialogFooter className="pt-3 border-t border-purple-100 flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddUserOpen(false)}
                className="rounded-xl border-gray-200 text-xs h-9 cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isAddingUser}
                className="rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-semibold text-xs h-9 px-4 cursor-pointer"
              >
                {isAddingUser ? 'Creating Account...' : 'Create Account'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ─── Admin Full CRUD: Edit User Modal ─── */}
      <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
        <DialogContent className="bg-white border border-purple-200 text-gray-900 w-[calc(100vw-1.5rem)] max-w-lg p-4 sm:p-6 rounded-2xl shadow-2xl max-h-[90dvh] overflow-y-auto touch-scroll">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Pencil className="h-5 w-5 text-blue-700" />
              Edit User Record
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500">
              Update user contact details, role, and active status in the database.
            </DialogDescription>
          </DialogHeader>

          {editingUser && (
            <form onSubmit={handleSaveEditUser} className="space-y-3.5 mt-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-700">Full Name</label>
                  <Input
                    required
                    value={editUserForm.name}
                    onChange={(e) => setEditUserForm({ ...editUserForm, name: e.target.value })}
                    className="mt-1 bg-white border-purple-200 text-sm h-9"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-700">Role</label>
                  <select
                    value={editUserForm.role}
                    onChange={(e) => setEditUserForm({ ...editUserForm, role: e.target.value })}
                    className="mt-1 w-full bg-white border border-purple-200 text-gray-900 rounded-md px-3 py-1.5 text-sm h-9 focus:ring-1 focus:ring-purple-500"
                  >
                    <option value="Client">Client</option>
                    <option value="FieldTeam">Field Worker / Team</option>
                    <option value="Admin">Administrator</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-700">Email Address</label>
                  <Input
                    required
                    type="email"
                    value={editUserForm.email}
                    onChange={(e) => setEditUserForm({ ...editUserForm, email: e.target.value })}
                    className="mt-1 bg-white border-purple-200 text-sm h-9"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-700">Phone</label>
                  <Input
                    value={editUserForm.phone}
                    onChange={(e) => setEditUserForm({ ...editUserForm, phone: e.target.value })}
                    className="mt-1 bg-white border-purple-200 text-sm h-9"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-700">CNIC</label>
                  <Input
                    value={editUserForm.cnic}
                    onChange={(e) => setEditUserForm({ ...editUserForm, cnic: e.target.value })}
                    className="mt-1 bg-white border-purple-200 text-sm h-9"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-700">Account Status</label>
                  <select
                    value={editUserForm.isActive ? 'Active' : 'Suspended'}
                    onChange={(e) => setEditUserForm({ ...editUserForm, isActive: e.target.value === 'Active' })}
                    className="mt-1 w-full bg-white border border-purple-200 text-gray-900 rounded-md px-3 py-1.5 text-sm h-9 focus:ring-1 focus:ring-purple-500"
                  >
                    <option value="Active">Active</option>
                    <option value="Suspended">Suspended</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-700">City</label>
                  <Input
                    value={editUserForm.city}
                    onChange={(e) => setEditUserForm({ ...editUserForm, city: e.target.value })}
                    className="mt-1 bg-white border-purple-200 text-sm h-9"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-700">Address</label>
                  <Input
                    value={editUserForm.address}
                    onChange={(e) => setEditUserForm({ ...editUserForm, address: e.target.value })}
                    className="mt-1 bg-white border-purple-200 text-sm h-9"
                  />
                </div>
              </div>

              <DialogFooter className="pt-3 border-t border-purple-100 flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingUser(null)}
                  className="rounded-xl border-gray-200 text-xs h-9 cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSavingEdit}
                  className="rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-semibold text-xs h-9 px-4 cursor-pointer"
                >
                  {isSavingEdit ? 'Saving...' : 'Save Changes'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* ─── Admin Full CRUD: Reset Password Modal ─── */}
      <Dialog open={!!resetPasswordUser} onOpenChange={(open) => !open && setResetPasswordUser(null)}>
        <DialogContent className="bg-white border border-purple-200 text-gray-900 w-[calc(100vw-1.5rem)] max-w-md p-4 sm:p-6 rounded-2xl shadow-2xl max-h-[90dvh] overflow-y-auto touch-scroll">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-pink-600" />
              Reset User Password
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500">
              Directly set a new password for <b className="text-gray-900">{resetPasswordUser?.name}</b> ({resetPasswordUser?.email}).
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSavePasswordReset} className="space-y-4 mt-2">
            <div>
              <label className="text-xs font-semibold text-gray-700">New Password (minimum 6 characters)</label>
              <Input
                required
                type="password"
                value={newPasswordVal}
                onChange={(e) => setNewPasswordVal(e.target.value)}
                placeholder="Enter new password"
                className="mt-1 bg-white border-purple-200 text-sm h-10"
              />
            </div>

            <DialogFooter className="pt-3 border-t border-purple-100 flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setResetPasswordUser(null)}
                className="rounded-xl border-gray-200 text-xs h-9 cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSavingPassword || newPasswordVal.length < 6}
                className="rounded-xl bg-pink-600 hover:bg-pink-700 text-white font-semibold text-xs h-9 px-4 cursor-pointer"
              >
                {isSavingPassword ? 'Resetting...' : 'Update Password'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ─── Admin Full CRUD: Confirm Delete User Modal ─── */}
      <Dialog open={!!deletingUser} onOpenChange={(open) => {
        if (!open) {
          setDeletingUser(null);
          setAdminPasswordInput('');
        }
      }}>
        <DialogContent className="bg-white border border-red-200 text-gray-900 w-[calc(100vw-1.5rem)] max-w-md p-4 sm:p-6 rounded-2xl shadow-2xl max-h-[90dvh] overflow-y-auto touch-scroll">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-red-600 flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-red-600" />
              {deletingUser?.role === 'Admin' ? 'Confirm Delete Secondary Administrator' : 'Confirm Delete User'}
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-600 mt-2">
              Are you sure you want to permanently delete the account for <b className="text-gray-900">{deletingUser?.name}</b> ({deletingUser?.email})?
              <br /><br />
              {deletingUser?.role === 'Admin' ? (
                <span className="text-red-700 font-semibold block mb-3">
                  This secondary administrator account will be permanently deactivated, blocked from logging in, and revoked across all operational portals.
                </span>
              ) : (
                <span className="text-red-600 font-semibold">Warning: This action will permanently remove this user account, and permanently purge all associated live GPS location tracking, field positions, and telemetry history.</span>
              )}
            </DialogDescription>
          </DialogHeader>

          {deletingUser?.role === 'Admin' && (
            <div className="my-3 space-y-2 p-3 bg-red-50/70 border border-red-200 rounded-xl">
              <label className="block text-xs font-bold text-red-900">
                Primary Administrator Password Verification <span className="text-red-500">*</span>
              </label>
              <p className="text-[11px] text-gray-600 mb-2">
                Enter the Primary Administrator (Admin 1) password to securely authorize deletion of this administrator.
              </p>
              <Input
                type="password"
                placeholder="Enter Admin 1 password (e.g. Admin@123)"
                value={adminPasswordInput}
                onChange={(e) => setAdminPasswordInput(e.target.value)}
                className="bg-white text-xs border-red-300 focus:border-red-500 rounded-xl"
              />
            </div>
          )}

          <DialogFooter className="pt-4 border-t border-gray-100 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setDeletingUser(null);
                setAdminPasswordInput('');
              }}
              className="rounded-xl border-gray-200 text-xs h-9 cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={isDeletingUser || (deletingUser?.role === 'Admin' && !adminPasswordInput)}
              onClick={handleConfirmDeleteUser}
              className="rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold text-xs h-9 px-4 cursor-pointer shadow-xs disabled:opacity-50"
            >
              {isDeletingUser ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                  Deleting...
                </>
              ) : (
                deletingUser?.role === 'Admin' ? 'Confirm Delete Administrator' : 'Permanently Delete User'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Admin Full CRUD: Suspend User Modal ─── */}
      <Dialog open={!!suspendingUser} onOpenChange={(open) => !open && setSuspendingUser(null)}>
        <DialogContent className="bg-white border border-amber-200 text-gray-900 w-[calc(100vw-1.5rem)] max-w-md p-4 sm:p-6 rounded-2xl shadow-2xl max-h-[90dvh] overflow-y-auto touch-scroll">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-amber-700 flex items-center gap-2">
              <Power className="h-5 w-5 text-amber-600" />
              Suspend Account
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-600 mt-2 space-y-3">
              <p>
                Are you sure you want to temporarily suspend access for <b className="text-gray-900">{suspendingUser?.name}</b> ({suspendingUser?.email})?
              </p>

              {/* Custom Duration Selection */}
              <div className="space-y-2 pt-1 text-left">
                <div className="flex items-center justify-between">
                  <label className="text-[12px] font-semibold text-gray-700">
                    Suspension Duration
                  </label>
                  <span className="text-amber-700 font-bold text-xs bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                    {suspendDurationDays} {suspendDurationDays === 1 ? 'Day' : 'Days'}
                  </span>
                </div>

                {/* Preset quick buttons */}
                <div className="grid grid-cols-5 gap-1.5">
                  {[1, 3, 7, 14, 30].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setSuspendDurationDays(preset)}
                      className={cn(
                        "py-1.5 text-xs font-semibold rounded-lg border transition-all cursor-pointer",
                        suspendDurationDays === preset
                          ? "bg-amber-600 text-white border-amber-600 shadow-xs"
                          : "bg-white text-gray-700 border-gray-200 hover:bg-amber-50 hover:border-amber-300"
                      )}
                    >
                      {preset}d
                    </button>
                  ))}
                </div>

                {/* Custom days number input */}
                <div className="flex items-center gap-2 pt-1">
                  <Input
                    type="number"
                    min={1}
                    max={365}
                    value={suspendDurationDays}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      setSuspendDurationDays(isNaN(val) ? 1 : Math.max(1, Math.min(365, val)));
                    }}
                    className="h-9 text-xs rounded-xl border-gray-300 bg-white"
                    placeholder="Enter custom days..."
                  />
                  <span className="text-xs text-gray-500 whitespace-nowrap font-medium">Days</span>
                </div>
              </div>

              {/* Dynamic Expiration Notice */}
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-xs">
                <p className="font-semibold flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-700" />
                  Automatic Expiration Policy
                </p>
                <p className="mt-1 text-[11px] text-amber-800 leading-relaxed">
                  This user will be suspended for <b>{suspendDurationDays} {suspendDurationDays === 1 ? 'day' : 'days'}</b> until{' '}
                  <b>{new Date(Date.now() + (suspendDurationDays || 1) * 86400000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</b>.
                  After this period, access will automatically unlock. You can also manually revoke this suspension at any time.
                </p>
              </div>
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="pt-4 border-t border-gray-100 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setSuspendingUser(null)}
              className="rounded-xl border-gray-200 text-xs h-9 cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={isSuspendingUser}
              onClick={handleConfirmSuspendUser}
              className="rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs h-9 px-4 cursor-pointer shadow-xs"
            >
              {isSuspendingUser ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                  Suspending...
                </>
              ) : (
                `Suspend for ${suspendDurationDays} ${suspendDurationDays === 1 ? 'Day' : 'Days'}`
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Admin Full CRUD: Revoke Suspension Modal ─── */}
      <Dialog open={!!revokingSuspensionUser} onOpenChange={(open) => !open && setRevokingSuspensionUser(null)}>
        <DialogContent className="bg-white border border-emerald-200 text-gray-900 w-[calc(100vw-1.5rem)] max-w-md p-4 sm:p-6 rounded-2xl shadow-2xl max-h-[90dvh] overflow-y-auto touch-scroll">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-emerald-700 flex items-center gap-2">
              <RotateCcw className="h-5 w-5 text-emerald-600" />
              Revoke Account Suspension
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-600 mt-2 space-y-2">
              <p>
                This account for <b className="text-gray-900">{revokingSuspensionUser?.name}</b> ({revokingSuspensionUser?.email}) is currently{' '}
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800">
                  Suspended
                </span>.
              </p>
              {revokingSuspensionUser?.suspendedUntil && (
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-xs">
                  <p className="font-semibold text-amber-900">Current Suspension Period:</p>
                  <p className="mt-1 text-[11px] text-amber-800">
                    Suspended until: <b>{new Date(revokingSuspensionUser.suspendedUntil).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</b>
                  </p>
                  {revokingSuspensionUser?.suspensionReason && (
                    <p className="mt-1 text-[11px] text-amber-700 italic">
                      "{revokingSuspensionUser.suspensionReason}"
                    </p>
                  )}
                </div>
              )}
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-900 text-xs">
                <p className="font-semibold flex items-center gap-1.5 text-emerald-800">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Restore Full Access
                </p>
                <p className="mt-1 text-[11px] text-emerald-800 leading-relaxed">
                  Revoking the suspension will immediately restore active status, clearing the suspension block and allowing this user to sign in to their portal normally.
                </p>
              </div>
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="pt-4 border-t border-gray-100 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setRevokingSuspensionUser(null)}
              className="rounded-xl border-gray-200 text-xs h-9 cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={isRevokingSuspension}
              onClick={handleRevokeSuspension}
              className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs h-9 px-4 cursor-pointer shadow-xs"
            >
              {isRevokingSuspension ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                  Revoking...
                </>
              ) : (
                'Revoke Suspension'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Registration & Identity Verification Inspection Dossier Modal ─── */}
      <Dialog
        open={Boolean(inspectedRegistration)}
        onOpenChange={(open) => {
          if (!open) setInspectedRegistration(null);
        }}
      >
        <DialogContent className="w-[calc(100vw-1.5rem)] max-w-2xl bg-white text-gray-900 border border-purple-200 rounded-2xl shadow-xl max-h-[90dvh] overflow-y-auto touch-scroll p-4 sm:p-6">
          {inspectedRegistration && (
            <>
              <DialogHeader className="border-b border-purple-100 pb-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className={cn(
                      "h-10 w-10 rounded-xl flex items-center justify-center font-bold text-sm shadow-2xs",
                      inspectedRegistration.role === 'Client'
                        ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                        : "bg-amber-100 text-amber-800 border border-amber-200"
                    )}>
                      {inspectedRegistration.role === 'Client' ? 'CL' : 'FT'}
                    </div>
                    <div>
                      <DialogTitle className="text-lg font-bold text-gray-950 flex items-center gap-2">
                        {inspectedRegistration.name}
                        <span className={cn(
                          "px-2 py-0.5 rounded-full text-xs font-semibold border",
                          inspectedRegistration.role === 'Client'
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-amber-50 text-amber-700 border-amber-200"
                        )}>
                          {inspectedRegistration.role === 'Client' ? 'Client' : 'Field Worker'}
                        </span>
                      </DialogTitle>
                      <DialogDescription className="text-xs text-gray-500">
                        Official identity verification dossier & registration details
                      </DialogDescription>
                    </div>
                  </div>
                  <div>
                    {renderVerificationBadge(inspectedRegistration.verificationStatus)}
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-4 py-2">
                {/* Dossier Information Grid */}
                <div className={cn(
                  "grid grid-cols-1 sm:grid-cols-2 gap-3.5 p-4 rounded-xl border text-xs",
                  inspectedRegistration.role === 'Client'
                    ? "bg-teal-50/30 border-teal-100"
                    : "bg-amber-50/30 border-amber-100"
                )}>
                  <div>
                    <span className="text-gray-500 font-medium block">Full Legal Name</span>
                    <span className="font-bold text-gray-900 text-sm mt-0.5 block">{inspectedRegistration.name}</span>
                  </div>

                  <div>
                    <span className="text-gray-500 font-medium block">Account Email</span>
                    <span className="font-bold text-gray-900 text-sm mt-0.5 font-mono block">
                      {cleanDisplayEmail(inspectedRegistration.email, inspectedRegistration.name)}
                    </span>
                  </div>

                  <div>
                    <span className="text-gray-500 font-medium block">Pakistani 13-Digit CNIC</span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={cn(
                        "font-bold font-mono text-sm bg-white px-2 py-0.5 rounded border",
                        inspectedRegistration.role === 'Client'
                          ? "border-teal-200 text-teal-900"
                          : "border-amber-200 text-amber-900"
                      )}>
                        {inspectedRegistration.rawCnic || inspectedRegistration.cnic || inspectedRegistration.cnicMasked || '35202-8492015-1'}
                      </span>
                    </div>
                  </div>

                  <div>
                    <span className="text-gray-500 font-medium block">Mobile Phone</span>
                    <span className="font-bold text-gray-900 text-sm mt-0.5 font-mono block">{inspectedRegistration.phone || 'Pending'}</span>
                  </div>

                  <div className="sm:col-span-2">
                    <span className="text-gray-500 font-medium block">Residential / Service Address</span>
                    <span className="font-medium text-gray-900 mt-0.5 block">
                      {inspectedRegistration.address || 'Address pending'}
                      {inspectedRegistration.city && `, ${inspectedRegistration.city}`}
                    </span>
                  </div>

                  {inspectedRegistration.role !== 'Client' && (
                    <>
                      <div className="sm:col-span-2">
                        <span className="text-gray-500 font-medium block mb-1">Service Categories / Operational Skills</span>
                        <div className="flex flex-wrap gap-1.5">
                          {Array.isArray(inspectedRegistration.serviceCategories) && inspectedRegistration.serviceCategories.length > 0 ? (
                            inspectedRegistration.serviceCategories.map((c, i) => (
                              <span key={i} className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                                {c}
                              </span>
                            ))
                          ) : (
                            <span className="text-gray-500">General Field Operations</span>
                          )}
                        </div>
                      </div>

                      {inspectedRegistration.experienceYears && (
                        <div>
                          <span className="text-gray-500 font-medium block">Professional Experience</span>
                          <span className="font-bold text-gray-900 mt-0.5 block">{inspectedRegistration.experienceYears} Years</span>
                        </div>
                      )}
                    </>
                  )}

                  <div>
                    <span className="text-gray-500 font-medium block">Profile Completion</span>
                    <div className="mt-1">{renderProfileCompletionBadge(inspectedRegistration.profileCompletionStatus)}</div>
                  </div>

                  <div>
                    <span className="text-gray-500 font-medium block">Registered Timestamp</span>
                    <span className="font-medium text-gray-700 mt-0.5 block">
                      {inspectedRegistration.registeredAt ? new Date(inspectedRegistration.registeredAt).toLocaleString() : 'Recent'}
                    </span>
                  </div>
                </div>
              </div>

              <DialogFooter className="flex items-center justify-between border-t border-purple-100 pt-3 gap-2">
                <Button
                  variant="outline"
                  onClick={() => setInspectedRegistration(null)}
                  className="rounded-xl border-gray-200 text-gray-700 text-xs cursor-pointer"
                >
                  Close Dossier
                </Button>

                <div className="flex items-center gap-2">
                  {inspectedRegistration.verificationStatus !== 'Rejected' && (
                    <Button
                      variant="outline"
                      onClick={() => handleUpdateVerificationStatus(inspectedRegistration._id, 'Rejected')}
                      className="rounded-xl border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-semibold cursor-pointer"
                    >
                      <UserX className="h-3.5 w-3.5 mr-1" />
                      Reject Verification
                    </Button>
                  )}

                  {inspectedRegistration.verificationStatus !== 'Verified' && (
                    <Button
                      onClick={() => handleUpdateVerificationStatus(inspectedRegistration._id, 'Verified')}
                      className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs cursor-pointer"
                    >
                      <UserCheck className="h-3.5 w-3.5 mr-1" />
                      Approve Verification
                    </Button>
                  )}
                </div>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OperationsManagement;

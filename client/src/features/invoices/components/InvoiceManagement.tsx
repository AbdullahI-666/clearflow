import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { 
  Receipt, Banknote, CheckCircle2, Clock, Download, Plus, Search, 
  Loader2, X, Check, MessageSquare, Phone, Sparkles, HandCoins, Pencil,
  TrendingUp, ArrowRight, Wallet, ChevronRight, Trash2, SlidersHorizontal
} from 'lucide-react';
import { DropdownMenu } from '@/components/ui/dropdown-menu';
import { apiClient } from '@/infrastructure/api/client';
import { socketClient } from '@/infrastructure/socket/client';
import { useAuth } from '@/entities/user/hooks/useAuth';
import { toast } from 'sonner';
import { downloadInvoicePdf } from '@/shared/utils/pdfDownloader';

interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface Invoice {
  _id: string;
  invoiceCode: string;
  workOrderId: any;
  clientId: any;
  amount: number;
  subtotal?: number;
  tax?: number;
  currency: string;
  status: 'Issued' | 'Paid' | 'Cancelled';
  items?: InvoiceItem[];
  pdfUrl?: string;
  issuedAt: string;
  paidAt?: string;
  paymentMethod?: string;
}

interface WorkerProfile {
  id: string;
  name: string;
  crew: string;
  phone: string;
  rating: number;
  avatar: string;
  category: string;
}

const WORKER_DIRECTORY: Record<string, WorkerProfile> = {};

interface PostedPaymentInfo {
  invoiceId: string;
  invoiceCode: string;
  workOrderCode: string;
  workerName: string;
  workerCrew: string;
  workerAvatar?: string;
  amount: number;
  paymentMethod: string;
  message: string;
  postedAt: string;
}

export const InvoiceManagement = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const userRole = (user?.role || '').toLowerCase();
  const isAdminRole = userRole === 'admin';
  const isFieldRole = userRole === 'fieldteam' || userRole === 'field_team' || userRole === 'field-team' || userRole === 'field' || userRole === 'worker';
  const isClientRole = !isAdminRole && !isFieldRole;

  const isDemoAccount =
    (user?.email || '').toLowerCase().trim() === 'client@clearflow.com' ||
    (user?.email || '').toLowerCase().trim() === 'resident@clearflow.com' ||
    (user?.email || '').toLowerCase().trim() === 'field@clearflow.com' ||
    (user?.email || '').toLowerCase().trim() === 'worker@clearflow.com' ||
    (user?.email || '').toLowerCase().trim() === 'crew@clearflow.com' ||
    (user?.email || '').toLowerCase().trim() === 'admin@clearflow.com' ||
    (user?.email || '').toLowerCase().trim() === 'adminn@clearflow.com' ||
    (user?.email || '').toLowerCase().trim() === 'adminnn@clearflow.com' ||
    user?._id === '65f000000000000000000001' ||
    user?._id === '65f000000000000000000011' ||
    user?._id === '65f000000000000000000012' ||
    user?._id === '65f000000000000000000002' ||
    user?._id === '65f000000000000000000004';

  const isHassan = (user?.name || '').toLowerCase().includes('hassan') || 
                   (user?.email || '').toLowerCase().includes('client@clearflow') || 
                   (user?.email || '').toLowerCase().includes('worker@clearflow');

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>(() => {
    const saved = localStorage.getItem('clearflow_pref_invoice_filter');
    return saved || 'All';
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const location = useLocation();
  const [deletingInvoiceId, setDeletingInvoiceId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('action') === 'new') {
      setIsCreateOpen(true);
    }
  }, [location.search]);

  const confirmDeleteInvoice = async () => {
    if (!deletingInvoiceId) return;
    setIsDeleting(true);
    try {
      await apiClient.delete(`/invoices/${deletingInvoiceId}`);
    } catch (_) {}

    try {
      const raw = localStorage.getItem('clearflow_deleted_invoice_ids');
      const set = new Set(raw ? JSON.parse(raw) : []);
      set.add(deletingInvoiceId);
      localStorage.setItem('clearflow_deleted_invoice_ids', JSON.stringify(Array.from(set)));
    } catch (_) {}

    setInvoices((prev) => prev.filter((i) => i._id !== deletingInvoiceId && (i as any).id !== deletingInvoiceId && i.invoiceCode !== deletingInvoiceId));
    toast.success(isFieldRole ? 'Earnings record deleted' : 'Invoice deleted successfully');
    setDeletingInvoiceId(null);
    window.dispatchEvent(new CustomEvent('clearflow:refresh-data'));
    setIsDeleting(false);
  };

  // New Invoice Form State (Admin)
  const [workOrders, setWorkOrders] = useState<any[]>([]);
  const [selectedWoId, setSelectedWoId] = useState('');
  const [itemDescription, setItemDescription] = useState('Standard facility maintenance & materials');
  const [itemAmount, setItemAmount] = useState<number | ''>(120);
  const [isCreating, setIsCreating] = useState(false);

  // Client Post Payment & Message Box Modal State
  const [paymentModalData, setPaymentModalData] = useState<{
    invoice: Invoice;
    worker: WorkerProfile;
    woCode: string;
    woTitle: string;
    existingPayment?: PostedPaymentInfo;
  } | null>(null);

  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<string>('Cash on Site (Handed to Worker)');
  const [paymentMessage, setPaymentMessage] = useState<string>('');
  const [isPostingPayment, setIsPostingPayment] = useState<boolean>(false);

  // Persistent Client Posted Payments Store
  const [postedPayments, setPostedPayments] = useState<Record<string, PostedPaymentInfo>>(() => {
    if (!isDemoAccount) return {};
    try {
      const raw = localStorage.getItem('clearflow_worker_posted_payments');
      if (raw) {
        const parsed = JSON.parse(raw);
        Object.values(parsed).forEach((p: any) => {
          if (p && p.paymentMethod) {
            p.paymentMethod = p.paymentMethod.replace(' (Auto-Debit)', '');
          }
        });
        return parsed;
      }
    } catch (e) {}
    return {
      'INV-2026-0001': {
        invoiceId: 'INV-2026-0001',
        invoiceCode: 'INV-2026-0001',
        workOrderCode: 'WO-2026-0004',
        workerName: 'Hamza Qureshi',
        workerCrew: 'Green Tech Disposal',
        amount: 120,
        paymentMethod: 'Bank Transfer',
        message: 'Excellent carpet shampoo & window sanitization. All inspection criteria met.',
        postedAt: new Date(Date.now() - 36000 * 1000).toISOString(),
      },
    };
  });

  const fetchInvoices = async () => {
    try {
      const res = await apiClient.get('/invoices');
      if (res.data?.success && res.data?.data) {
        const list = Array.isArray(res.data.data) ? res.data.data : res.data.data.data || [];
        setInvoices(list);
      }
    } catch (err) {
      console.error('Failed to load invoices:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchWorkOrders = async () => {
    try {
      const res = await apiClient.get('/work-orders');
      if (res.data?.success && res.data?.data) {
        const list = Array.isArray(res.data.data) ? res.data.data : res.data.data.data || [];
        setWorkOrders(list);
        if (list.length > 0) setSelectedWoId(list[0]._id);
      }
    } catch (err) {}
  };

  useEffect(() => {
    fetchInvoices();
    fetchWorkOrders();

    const handleGlobal = () => {
      fetchInvoices();
      fetchWorkOrders();
    };

    window.addEventListener('clearflow:refresh-data', handleGlobal);
    window.addEventListener('storage', handleGlobal);

    socketClient.connect();
    const socket = socketClient.getSocket();
    if (socket) {
      socket.on('invoice:paid', handleGlobal);
      socket.on('invoice_updated', handleGlobal);
      socket.on('work_order_updated', handleGlobal);
      socket.on('work_order_created', handleGlobal);
    }

    return () => {
      window.removeEventListener('clearflow:refresh-data', handleGlobal);
      window.removeEventListener('storage', handleGlobal);
      if (socket) {
        socket.off('invoice:paid', handleGlobal);
        socket.off('invoice_updated', handleGlobal);
        socket.off('work_order_updated', handleGlobal);
        socket.off('work_order_created', handleGlobal);
      }
    };
  }, []);

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWoId) {
      toast.error('Please select a work order');
      return;
    }

    setIsCreating(true);
    try {
      const res = await apiClient.post('/invoices', {
        workOrderId: selectedWoId,
        amount: Number(itemAmount),
        items: [
          { description: itemDescription, quantity: 1, unitPrice: Number(itemAmount), total: Number(itemAmount) }
        ],
      });

      if (res.data?.success) {
        toast.success(`Invoice created successfully!`);
        setIsCreateOpen(false);
        fetchInvoices();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create invoice');
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: 'Paid' | 'Cancelled') => {
    try {
      const res = await apiClient.patch(`/invoices/${id}/status`, { status: newStatus });
      if (res.data?.success) {
        toast.success(`Invoice status updated to ${newStatus}`);
        fetchInvoices();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update invoice');
    }
  };

  const handleDownloadInvoicePdf = async (invId: string, invoiceCode: string) => {
    try {
      const inv = invoices.find(i => i._id === invId) || { _id: invId, invoiceCode };
      await downloadInvoicePdf(inv);
    } catch (err: any) {
      toast.error('Could not download invoice PDF. Please try again.');
    }
  };

  // Worker lookup helper
  const getWorkerForInvoice = (inv: Invoice): WorkerProfile => {
    const woCode = typeof inv.workOrderId === 'object' && inv.workOrderId ? inv.workOrderId.workOrderCode : String(inv.workOrderId || '');
    if (WORKER_DIRECTORY[woCode]) return WORKER_DIRECTORY[woCode];

    const matchedWo = workOrders.find((w) => w.workOrderCode === woCode || w._id === (inv.workOrderId?._id || inv.workOrderId));
    if (matchedWo?.assignedWorker) {
      const isAhmad = (matchedWo.assignedWorker.name || '').toLowerCase().includes('ahmad') || matchedWo.assignedWorker.workerId === 'W#01';
      return {
        id: isAhmad ? 'W#01' : (matchedWo.assignedWorker.workerId || 'W#0001'),
        name: matchedWo.assignedWorker.name || 'Assigned Worker',
        crew: matchedWo.assignedWorker.crew || matchedWo.teamId?.name || 'ClearFlow Operations',
        phone: matchedWo.assignedWorker.phone || '+92 300 1234567',
        rating: Number((matchedWo.assignedWorker as any)?.rating ?? (matchedWo.assignedWorker as any)?.averageRating ?? 0.0),
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&q=80',
        category: matchedWo.categoryId?.name || 'Facility Services',
      };
    }
    if (matchedWo?.teamId?.name) {
      const isAhmad = matchedWo.teamId.name.toLowerCase().includes('ahmad');
      return {
        id: isAhmad ? 'W#01' : 'W#0001',
        name: matchedWo.teamId.name,
        crew: matchedWo.teamId.name,
        phone: '+92 300 0000000',
        rating: Number((matchedWo.teamId as any)?.averageRating ?? 0.0),
        avatar: '',
        category: matchedWo.categoryId?.name || 'Facility Maintenance',
      };
    }

    return {
      id: 'W#0001',
      name: 'Assigned Worker',
      crew: 'ClearFlow Operations',
      phone: '+92 300 0000000',
      rating: 0.0,
      avatar: '',
      category: 'Facility Maintenance',
    };
  };

  // Ensure completed client work orders appear in Payments automatically
  const mergedInvoices = [...invoices];
  workOrders.forEach((wo) => {
    const isClientWo = (isDemoAccount && !isHassan)
      ? (String(wo.clientId?._id || wo.clientId) === String(user?._id) || 
         String(wo.clientId?._id || wo.clientId) === '65f000000000000000000002')
      : (String(wo.clientId?._id || wo.clientId) === String(user?._id));
    if (isClientWo && (wo.status === 'Closed' || (wo.status as string) === 'Completed' || wo.isAccepted)) {
      const woCode = wo.workOrderCode;
      const alreadyHasInvoice = mergedInvoices.some(
        (inv) => (typeof inv.workOrderId === 'object' ? inv.workOrderId?.workOrderCode : inv.workOrderId) === woCode
      );
      if (!alreadyHasInvoice && woCode) {
        mergedInvoices.push({
          _id: `inv_auto_${wo._id || woCode}`,
          invoiceCode: `INV-${woCode.replace('WO-', '')}`,
          workOrderId: {
            _id: wo._id,
            workOrderCode: woCode,
            title: wo.title,
            locationAddress: wo.locationAddress,
            description: wo.description,
          },
          clientId: {
            _id: user?._id || '65f000000000000000000002',
            name: user?.name || 'Client',
            email: user?.email || '',
          },
          amount: wo.agreedPrice || wo.estimatedPrice || 85,
          subtotal: Math.round((wo.agreedPrice || wo.estimatedPrice || 85) * 0.85),
          tax: Math.round((wo.agreedPrice || wo.estimatedPrice || 85) * 0.15),
          currency: 'PKR',
          status: wo.status === 'Closed' ? 'Paid' : 'Issued',
          issuedAt: wo.closedAt || wo.createdAt || new Date().toISOString(),
        });
      }
    }
  });

  let deletedInvSet = new Set<string>();
  try {
    const raw = localStorage.getItem('clearflow_deleted_invoice_ids');
    if (raw) deletedInvSet = new Set(JSON.parse(raw));
  } catch (_) {}

  const userScopedInvoices = mergedInvoices.filter((inv) => {
    if (deletedInvSet.has(inv._id) || deletedInvSet.has((inv as any).id) || deletedInvSet.has(inv.invoiceCode)) return false;
    if (isAdminRole) return true;
    if (isFieldRole) {
      if (isDemoAccount) {
        const worker = getWorkerForInvoice(inv);
        const isMyWorkerJob = 
          inv.invoiceCode?.startsWith('PAY-') ||
          worker.name.toLowerCase().includes('ahsan') ||
          worker.id === 'W#6754' ||
          worker.crew.toLowerCase().includes('alpha') ||
          (user?.name && worker.name.toLowerCase().includes(user.name.toLowerCase()));
        return isMyWorkerJob;
      }
      const wo = typeof inv.workOrderId === 'object' ? inv.workOrderId : workOrders.find(w => w._id === inv.workOrderId || w.workOrderCode === inv.workOrderId);
      const assignedWorkerId = (wo as any)?.assignedWorkerId || (wo as any)?.workerId || (typeof (wo as any)?.teamId === 'object' ? (wo as any)?.teamId?._id : (wo as any)?.teamId);
      return String(assignedWorkerId) === String(user?._id) || String((inv as any).workerId) === String(user?._id);
    }
    const clientName = typeof inv.clientId === 'object' && inv.clientId ? (inv.clientId as any).name?.toLowerCase() : '';
    const clientId = typeof inv.clientId === 'object' && inv.clientId ? (inv.clientId as any)._id : inv.clientId;
    if (isDemoAccount && !isHassan) {
      return String(clientId) === String(user?._id) || 
             String(clientId) === '65f000000000000000000002';
    }
    return String(clientId) === String(user?._id);
  });

  const filteredInvoices = userScopedInvoices.filter((inv) => {
    const matchesStatus = statusFilter === 'All' || inv.status === statusFilter;
    const clientName = typeof inv.clientId === 'object' && inv.clientId ? (inv.clientId as any).name?.toLowerCase() : '';
    const woTitle = typeof inv.workOrderId === 'object' && inv.workOrderId ? ((inv.workOrderId as any).title || '').toLowerCase() : '';
    const code = (inv.invoiceCode || '').toLowerCase();
    const q = searchQuery.toLowerCase();
    const matchesSearch = code.includes(q) || clientName.includes(q) || woTitle.includes(q);
    return matchesStatus && matchesSearch;
  });

  const totalBilled = userScopedInvoices.reduce((acc, inv) => acc + (inv.status !== 'Cancelled' ? inv.amount : 0), 0);
  const totalPaid = userScopedInvoices.filter((i) => i.status === 'Paid').reduce((acc, inv) => acc + inv.amount, 0);
  const totalPending = userScopedInvoices.filter((i) => i.status === 'Issued').reduce((acc, inv) => acc + inv.amount, 0);

  const themeClasses = {
    primaryBg: isClientRole ? 'bg-teal-600 hover:bg-teal-700' : isFieldRole ? 'bg-amber-600 hover:bg-amber-700' : 'bg-purple-600 hover:bg-purple-700',
    primaryText: isClientRole ? 'text-teal-700' : isFieldRole ? 'text-amber-800' : 'text-purple-700',
    accentColor: isClientRole ? 'text-teal-600' : isFieldRole ? 'text-amber-600' : 'text-purple-600',
    shadow: isClientRole ? 'shadow-teal-600/20' : isFieldRole ? 'shadow-amber-600/20' : 'shadow-purple-600/20',
    softBg: isClientRole ? 'bg-teal-50' : isFieldRole ? 'bg-amber-50' : 'bg-purple-50',
    border: isClientRole ? 'border-teal-200' : isFieldRole ? 'border-amber-200' : 'border-purple-200',
  };

  // Open Payment & Message Modal
  const handleOpenPaymentModal = (inv: Invoice, worker: WorkerProfile) => {
    const woCode = typeof inv.workOrderId === 'object' && inv.workOrderId ? inv.workOrderId.workOrderCode : 'WO-REFERENCE';
    const woTitle = typeof inv.workOrderId === 'object' && inv.workOrderId ? (inv.workOrderId.title || inv.workOrderId.description) : 'Facility Maintenance Order';
    const existing = postedPayments[inv.invoiceCode] || postedPayments[inv._id];

    setPaymentModalData({
      invoice: inv,
      worker,
      woCode,
      woTitle,
      existingPayment: existing,
    });

    setPaymentAmount(existing?.amount || inv.amount || 85);
    setPaymentMethod(
      existing?.paymentMethod
        ? existing.paymentMethod.replace(' (Auto-Debit)', '').replace('JazzCash', 'Jazzcash').replace('EasyPaisa', 'Easypaisa')
        : 'Bank Transfer'
    );
    setPaymentMessage(
      existing?.message ||
        `Work completed satisfactorily on site. Paid PKR ${existing?.amount || inv.amount || 85} to ${worker.name}. Thank you!`
    );
  };

  // Submit Payment Post with Client Message
  const handlePostWorkerPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentModalData) return;
    if (!paymentAmount || paymentAmount <= 0) {
      toast.error('Please enter a valid payment amount');
      return;
    }
    if (!paymentMessage.trim()) {
      toast.error('Please write a message or note for the worker');
      return;
    }

    setIsPostingPayment(true);
    try {
      const { invoice, worker, woCode } = paymentModalData;

      // 1. Update invoice status on server
      if (invoice.status !== 'Paid') {
        try {
          await apiClient.patch(`/invoices/${invoice._id}/status`, { status: 'Paid' });
        } catch (err) {
          console.warn('Backend patch notice (local in-memory fallback active):', err);
        }
      }

      // 2. Save payment record
      const paymentRecord: PostedPaymentInfo = {
        invoiceId: invoice._id,
        invoiceCode: invoice.invoiceCode,
        workOrderCode: woCode,
        workerName: worker.name,
        workerCrew: worker.crew,
        workerAvatar: worker.avatar,
        amount: Number(paymentAmount),
        paymentMethod,
        message: paymentMessage.trim(),
        postedAt: new Date().toISOString(),
      };

      const updatedPosted = {
        ...postedPayments,
        [invoice.invoiceCode]: paymentRecord,
        [invoice._id]: paymentRecord,
      };
      setPostedPayments(updatedPosted);
      try {
        localStorage.setItem('clearflow_worker_posted_payments', JSON.stringify(updatedPosted));
      } catch (e) {}

      // 3. Post to worker chat thread
      try {
        const storedChat = localStorage.getItem('clearflow_order_chat_history');
        const parsedChat = storedChat ? JSON.parse(storedChat) : {};
        const channelMessages = parsedChat[woCode] || [];

        const newChatMessage = {
          id: `msg_pay_${Date.now()}`,
          workOrderId: woCode,
          senderId: user?._id || '65f000000000000000000002',
          senderName: user?.name || 'Client',
          senderRole: 'Client',
          receiverName: worker.name,
          text: `💰 Payment Settled: PKR ${Number(paymentAmount).toLocaleString()} paid to ${worker.name} via ${paymentMethod}.\n\nClient Note: "${paymentMessage.trim()}"`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          status: 'sent',
          type: 'text',
        };

        parsedChat[woCode] = [...channelMessages, newChatMessage];
        localStorage.setItem('clearflow_order_chat_history', JSON.stringify(parsedChat));

        window.dispatchEvent(
          new CustomEvent('clearflow:chat-message', {
            detail: { channelCode: woCode, message: newChatMessage },
          })
        );
      } catch (e) {
        console.warn('Failed to dispatch payment message to chat:', e);
      }

      // 4. Update UI invoice state
      setInvoices((prev) =>
        prev.map((i) =>
          i._id === invoice._id || i.invoiceCode === invoice.invoiceCode
            ? { ...i, status: 'Paid', amount: Number(paymentAmount), paidAt: new Date().toISOString() }
            : i
        )
      );

      toast.success(`Payment of PKR ${Number(paymentAmount).toLocaleString()} successfully posted to ${worker.name}!`, {
        description: `Note dispatched directly to ${worker.name}'s chat thread.`,
      });

      setPaymentModalData(null);
    } finally {
      setIsPostingPayment(false);
    }
  };

  return (
    <div className="space-y-4 w-full pb-12">
      {/* Top Controls */}
      {isAdminRole && (
        <div className="flex justify-end mb-2">
          <Button onClick={() => setIsCreateOpen(true)} className={`${themeClasses.primaryBg} shadow-md ${themeClasses.shadow} text-white cursor-pointer`}>
            <Plus className="mr-2 h-4 w-4" /> Issue New Invoice
          </Button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-2">
          <DropdownMenu
            align="left"
            options={['All', 'Issued', 'Paid', 'Cancelled'].map((st) => {
              const label = st === 'All'
                ? 'All'
                : isFieldRole
                ? st === 'Issued' ? 'Pending Settlement' : st === 'Paid' ? 'Settled (Paid)' : 'Cancelled'
                : st === 'Issued' ? 'Pending (Issued)' : st;
              const count = st === 'All'
                ? invoices.length
                : invoices.filter((i) => i.status === st).length;
              return {
                label,
                count,
                active: statusFilter === st,
                onClick: () => {
                  setStatusFilter(st);
                  localStorage.setItem('clearflow_pref_invoice_filter', st);
                },
              };
            })}
            roleTheme={isAdminRole ? 'admin' : isFieldRole ? 'fieldteam' : 'client'}
            preferenceKey="clearflow_pref_invoice_filter"
            preferenceLabel="Invoices Status View"
            currentFilterLabel={
              statusFilter === 'All'
                ? 'All'
                : isFieldRole
                ? statusFilter === 'Issued' ? 'Pending Settlement' : statusFilter === 'Paid' ? 'Settled (Paid)' : 'Cancelled'
                : statusFilter === 'Issued' ? 'Pending (Issued)' : statusFilter
            }
            onUploadPreference={(pref: string) => {
              const p = pref.toLowerCase();
              if (p.includes('pend') || p.includes('issu')) {
                setStatusFilter('Issued');
                localStorage.setItem('clearflow_pref_invoice_filter', 'Issued');
              } else if (p.includes('paid') || p.includes('settl')) {
                setStatusFilter('Paid');
                localStorage.setItem('clearflow_pref_invoice_filter', 'Paid');
              } else if (p.includes('canc')) {
                setStatusFilter('Cancelled');
                localStorage.setItem('clearflow_pref_invoice_filter', 'Cancelled');
              } else {
                setStatusFilter('All');
                localStorage.setItem('clearflow_pref_invoice_filter', 'All');
              }
            }}
          >
            <span className="font-semibold text-sm leading-none whitespace-nowrap">
              {
                statusFilter === 'All'
                  ? 'All'
                  : isFieldRole
                  ? statusFilter === 'Issued' ? 'Pending Settlement' : statusFilter === 'Paid' ? 'Settled (Paid)' : 'Cancelled'
                  : statusFilter === 'Issued' ? 'Pending (Issued)' : statusFilter
              }
            </span>
            <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-xs font-bold font-mono bg-white/25 text-white leading-none">
              {statusFilter === 'All' ? invoices.length : invoices.filter((i) => i.status === statusFilter).length}
            </span>
          </DropdownMenu>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          <Input
            placeholder={isFieldRole ? "Search service, client, or job code..." : "Search invoice code or client..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="text-center placeholder:text-center pl-9 pr-9 bg-gray-50/50 border-gray-200 h-10 rounded-xl text-sm"
          />
        </div>
      </div>

      {/* Invoices Table / List */}
      {isLoading ? (
        <div className="py-20 text-center text-gray-400">
          <Loader2 className={`w-8 h-8 animate-spin ${themeClasses.accentColor} mx-auto mb-2`} />
          <p className="text-sm">Loading payments...</p>
        </div>
      ) : filteredInvoices.length === 0 ? (
        <div className="py-16 text-center text-gray-500 bg-white rounded-2xl p-8 border border-gray-100">
          <Receipt className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="font-semibold text-gray-700">No payment records match your selection.</p>
        </div>
      ) : (
        <div className="space-y-3.5">
          {filteredInvoices.map((inv) => {
            const clientName = typeof inv.clientId === 'object' && inv.clientId ? (inv.clientId as any).name : 'Authorized Client';
            const clientEmail = typeof inv.clientId === 'object' && inv.clientId ? (inv.clientId as any).email : '';
            const woCode = typeof inv.workOrderId === 'object' && inv.workOrderId ? (inv.workOrderId as any).workOrderCode : 'WO-REFERENCE';
            const woTitle = typeof inv.workOrderId === 'object' && inv.workOrderId ? ((inv.workOrderId as any).title || (inv.workOrderId as any).description) : 'Field Service Delivery';
            const worker = getWorkerForInvoice(inv);
            const postedInfo = postedPayments[inv.invoiceCode] || postedPayments[inv._id];
            const displayCode = isFieldRole 
              ? (inv.invoiceCode?.startsWith('PAY-') ? inv.invoiceCode : `PAY-${inv.invoiceCode.replace('INV-', '')}`)
              : inv.invoiceCode;

            // Worker Portal View (My Earnings)
            if (isFieldRole) {
              return (
                <div
                  key={inv._id}
                  className="bg-white p-5 rounded-2xl border border-amber-200/90 hover:border-amber-400 hover:shadow-md transition-all flex flex-col justify-between gap-4 shadow-xs"
                >
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    {/* Left: Code, Work Order & Client Info */}
                    <div className="flex flex-col justify-center">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-gray-900 text-base leading-none font-mono">
                          {displayCode}
                        </span>
                        <Badge
                          className={
                            inv.status === 'Paid'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200 font-bold'
                              : 'bg-amber-50 text-amber-800 border-amber-200 font-bold'
                          }
                        >
                          {inv.status === 'Paid' ? '✓ Settled & Paid to Wallet' : '⏳ In Escrow / Pending Review'}
                        </Badge>
                      </div>
                      <p className="text-sm font-semibold text-gray-900 mt-1">
                        {woTitle}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-2 flex-wrap">
                        <span>Client: <strong className="text-gray-700">{clientName}</strong></span>
                        {clientEmail && <span className="text-gray-400">({clientEmail})</span>}
                        <span>• {new Date(inv.issuedAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                      </p>
                    </div>

                    {/* Right: Amount & Actions */}
                    <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 pt-3 sm:pt-0">
                      <div className="text-left sm:text-right">
                        <span className="text-[11px] text-gray-400 block font-medium">Net Technician Payout</span>
                        <span className="text-xl sm:text-2xl font-black font-mono text-emerald-700">
                          +PKR {(postedInfo ? postedInfo.amount : inv.amount).toLocaleString()}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => navigate(`/work-orders/${(inv.workOrderId as any)?.workOrderCode || woCode || (inv.workOrderId as any)?._id}`)}
                          className="text-xs h-9 px-3 text-gray-600 hover:text-amber-900 hover:bg-amber-50/80 rounded-xl cursor-pointer"
                          title="Open Work Order Details"
                        >
                          <span>View Order</span>
                          <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setDeletingInvoiceId(inv._id)}
                          className="border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-300 text-xs h-9 px-3 rounded-xl cursor-pointer shadow-2xs flex items-center gap-1.5 font-semibold"
                          title="Delete Earning Record"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete</span>
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Client Review Note / Feedback */}
                  {((inv as any).note || postedInfo?.message) && (
                    <div className="bg-gradient-to-r from-amber-50/70 via-yellow-50/50 to-amber-50/70 border border-amber-200/90 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                      <div className="flex items-start gap-2 min-w-0">
                        <MessageSquare className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <div className="min-w-0">
                          <span className="font-bold text-amber-950">Client Note from {clientName}: </span>
                          <span className="italic text-gray-800">"{(inv as any).note || postedInfo?.message}"</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
                        <span className="text-[10px] text-amber-800 font-semibold bg-white/90 px-2 py-0.5 rounded-md border border-amber-200">
                          {(inv as any).method || (postedInfo ? `Settled via ${postedInfo.paymentMethod}` : 'Transferred to Wallet')}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              );
            }

            return (
              <div
                key={inv._id}
                className={`bg-white p-4 sm:p-5 rounded-2xl border transition-all flex flex-col justify-between gap-4 shadow-xs ${
                  isClientRole 
                    ? 'border-teal-100 hover:border-teal-300 hover:shadow-teal-600/5' 
                    : 'border-gray-100 hover:border-purple-200'
                }`}
              >
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  {/* Left: Invoice Badge & Status */}
                  <div className="flex items-center gap-3.5">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-xs border shrink-0 ${
                      isClientRole
                        ? 'bg-teal-50 text-teal-700 border-teal-200 shadow-2xs'
                        : isFieldRole
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : 'bg-purple-50 text-purple-700 border-purple-200'
                    }`}>
                      INV
                    </div>
                    <div className="flex flex-col justify-center">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-gray-900 text-base leading-none">{inv.invoiceCode}</span>
                        <Badge
                          variant={inv.status === 'Paid' ? 'default' : inv.status === 'Cancelled' ? 'destructive' : 'secondary'}
                          className={
                            inv.status === 'Paid'
                              ? isClientRole
                                ? 'bg-teal-600 text-white font-semibold'
                                : 'bg-purple-600 text-white'
                              : inv.status === 'Issued'
                              ? 'bg-amber-100 text-amber-800 border-amber-200 font-semibold'
                              : ''
                          }
                        >
                          {inv.status === 'Issued' ? 'Pending Payment' : inv.status}
                        </Badge>
                      </div>
                      {!isClientRole && (
                        <p className="text-xs text-gray-500 mt-1">
                          Client: <span className="font-semibold text-gray-700">{clientName}</span> {clientEmail && `(${clientEmail})`}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right: Amount & Actions */}
                  <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 pt-3 sm:pt-0">
                    <div className="text-left sm:text-right">
                      <span className="text-[11px] text-gray-400 block font-medium">Total Amount</span>
                      <span className="text-xl font-bold text-gray-900">
                        PKR {postedInfo ? postedInfo.amount : inv.amount}
                      </span>
                    </div>

                    <div className="flex gap-2">
                      {isClientRole ? (
                        <>
                          {inv.status === 'Issued' ? (
                            <Button
                              size="sm"
                              onClick={() => handleOpenPaymentModal(inv, worker)}
                              className="bg-teal-600 hover:bg-teal-700 text-white text-xs h-9 px-3.5 rounded-xl shadow-md shadow-teal-600/20 font-bold cursor-pointer transition-all hover:scale-[1.02] active:scale-95 flex items-center gap-1.5"
                            >
                              <Banknote className="w-4 h-4" /> Post Payment
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleOpenPaymentModal(inv, worker)}
                              className="border-teal-200 text-teal-800 hover:bg-teal-50 text-xs h-9 px-3.5 rounded-xl cursor-pointer flex items-center gap-1.5 font-bold shadow-2xs transition-all hover:scale-[1.02] active:scale-95"
                            >
                              <Pencil className="w-3.5 h-3.5 text-teal-600" /> Edit
                            </Button>
                          )}
                        </>
                      ) : (
                        isAdminRole && inv.status === 'Issued' && (
                          <Button
                            size="sm"
                            onClick={() => handleUpdateStatus(inv._id, 'Paid')}
                            className="bg-purple-600 hover:bg-purple-700 text-white text-xs h-8 cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5 mr-1" /> Mark Paid
                          </Button>
                        )
                      )}

                      <button
                        type="button"
                        onClick={() => handleDownloadInvoicePdf(inv._id, inv.invoiceCode)}
                        className={`inline-flex items-center justify-center rounded-xl text-xs font-semibold border border-gray-200 bg-white h-9 px-3 text-gray-700 cursor-pointer transition-colors shadow-2xs ${
                          isClientRole ? 'hover:bg-teal-50 hover:text-teal-700 hover:border-teal-200' : 'hover:bg-gray-100'
                        }`}
                      >
                        <Download className="w-3.5 h-3.5 mr-1 text-gray-500" /> PDF
                      </button>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setDeletingInvoiceId(inv._id)}
                        className="border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700 text-xs h-9 px-3 rounded-xl cursor-pointer shadow-2xs flex items-center gap-1.5 font-semibold"
                        title={isFieldRole ? "Delete Earning Record" : "Delete Invoice"}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete</span>
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Assigned Worker (Clean: Only worker name and work, photos & ratings removed) */}
                <div className="pt-3 border-t border-gray-100/90 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-gray-500 font-medium">Assigned Worker:</span>
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold select-none ${
                        isClientRole
                          ? 'bg-teal-50/90 border-teal-200 text-teal-950'
                          : isFieldRole
                          ? 'bg-amber-50/90 border-amber-200 text-amber-950'
                          : 'bg-gray-50 border-gray-200 text-gray-800'
                      }`}
                    >
                      <span className="font-bold">
                        {worker.name}
                      </span>
                      <span className={isClientRole ? "text-[11px] text-teal-700 font-medium" : "text-[11px] text-gray-500 font-medium"}>
                        ({worker.crew || worker.category})
                      </span>
                    </span>
                  </div>

                  {postedInfo && (
                    <div className="text-[11px] text-teal-800 font-semibold flex items-center gap-1.5 self-start sm:self-auto">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                      Settled via {postedInfo.paymentMethod.replace(' (Auto-Debit)', '').replace('JazzCash', 'Jazzcash').replace('EasyPaisa', 'Easypaisa')}
                    </div>
                  )}
                </div>

                {/* Posted Message Box Quote Preview */}
                {postedInfo?.message && (
                  <div className="bg-gradient-to-r from-teal-50/70 via-emerald-50/50 to-teal-50/70 border border-teal-200/80 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                    <div className="flex items-start gap-2 min-w-0">
                      <MessageSquare className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <span className="font-bold text-teal-950">Your Payment Note to {worker.name}: </span>
                        <span className="italic text-gray-700">"{postedInfo.message}"</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
                      <span className="text-[10px] text-teal-700 font-medium bg-white/80 px-2 py-0.5 rounded-md border border-teal-100">
                        {new Date(postedInfo.postedAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Post Payment to Worker Modal (with Message Box) */}
      {paymentModalData && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 overflow-y-auto p-4 sm:p-6 flex justify-center items-start sm:items-center">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200 border border-teal-100 my-auto">
            {/* Modal Header */}
            <div className="flex justify-between items-start mb-5 pb-3 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-teal-50 border border-teal-200 text-teal-700 flex items-center justify-center shadow-2xs">
                  <HandCoins className="w-6 h-6 text-teal-600" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-gray-900 leading-tight">
                    {paymentModalData.invoice.status === 'Paid' || paymentModalData.existingPayment
                      ? 'Edit'
                      : 'Post Payment to Worker'}
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {paymentModalData.invoice.status === 'Paid' || paymentModalData.existingPayment
                      ? <>Modify payment details & note for <span className="font-semibold text-teal-800">{paymentModalData.worker.name}</span></>
                      : <>Settle payment & send completion message for <span className="font-semibold text-teal-800">{paymentModalData.worker.name}</span></>}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPaymentModalData(null)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Worker Details Card (Clean: Only worker name and work) */}
            <div className="bg-gradient-to-br from-teal-50/90 via-emerald-50/50 to-teal-50/90 rounded-2xl p-4 border border-teal-200/80 mb-5 shadow-2xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h4 className="font-bold text-base text-teal-950">
                    {paymentModalData.worker.name}
                  </h4>
                  <p className="text-xs text-teal-800 font-medium mt-0.5">
                    {paymentModalData.worker.crew}
                  </p>
                </div>
              </div>
              {paymentModalData.woTitle && (
                <div className="mt-2.5 pt-2 border-t border-teal-200/60 text-xs text-teal-900 line-clamp-1">
                  <span className="font-semibold text-teal-800">Task:</span> {paymentModalData.woTitle}
                </div>
              )}
            </div>

            {/* Form */}
            <form onSubmit={handlePostWorkerPayment} className="space-y-4">
              {/* Payment Amount */}
              <div>
                <label className="text-xs font-bold text-gray-800 block mb-1.5">
                  How much you pay to that worker after work (PKR) *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <span className="text-xs font-bold text-teal-700">PKR</span>
                  </div>
                  <Input
                    type="number"
                    min={1}
                    value={paymentAmount || ''}
                    onChange={(e) => setPaymentAmount(Number(e.target.value))}
                    placeholder="e.g. 85"
                    required
                    className="pl-14 text-base font-bold text-gray-900 border-teal-200 focus-visible:ring-teal-500 rounded-xl h-11"
                  />
                </div>
                {/* Quick preset pills */}
                <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                  <span className="text-[11px] text-gray-400 font-medium">Quick Amount:</span>
                  {[
                    paymentModalData.invoice.amount,
                    paymentModalData.invoice.amount + 50,
                    paymentModalData.invoice.amount + 100,
                    paymentModalData.invoice.amount + 200,
                  ]
                    .filter((amt, i, arr) => arr.indexOf(amt) === i && amt > 0)
                    .map((amt) => (
                      <button
                        type="button"
                        key={amt}
                        onClick={() => setPaymentAmount(amt)}
                        className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                          paymentAmount === amt
                            ? 'bg-teal-600 text-white border-teal-600 shadow-2xs'
                            : 'bg-teal-50/70 text-teal-800 border-teal-200 hover:bg-teal-100'
                        }`}
                      >
                        PKR {amt} {amt > paymentModalData.invoice.amount ? `(+${amt - paymentModalData.invoice.amount} tip)` : ''}
                      </button>
                    ))}
                </div>
              </div>

              {/* Settlement Method */}
              <div>
                <label className="text-xs font-bold text-gray-800 block mb-1.5">
                  Settlement Method *
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full border border-teal-200 rounded-xl p-2.5 text-xs font-semibold text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer"
                >
                  <option value="Bank Transfer">🏦 Settled via Bank Transfer</option>
                  <option value="Easypaisa">📲 Settled via Easypaisa</option>
                  <option value="Jazzcash">📱 Settled via Jazzcash</option>
                  <option value="Cash on Site">💵 Settled via Cash on Site</option>
                </select>
              </div>

              {/* Message Box */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-teal-600" />
                    Message / Note to {paymentModalData.worker.name} *
                  </label>
                  <span className="text-[10px] text-gray-400">Sent directly to chat</span>
                </div>
                <Textarea
                  value={paymentMessage}
                  onChange={(e) => setPaymentMessage(e.target.value)}
                  rows={3}
                  placeholder={`Tell ${paymentModalData.worker.name} how much you paid, acknowledge work completion, or leave a feedback note...`}
                  required
                  className="border-teal-200 focus-visible:ring-teal-500 rounded-xl text-xs leading-relaxed text-gray-800"
                />
              </div>

              {/* Modal Actions */}
              <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setPaymentModalData(null)}
                  className="rounded-xl border-gray-200 text-gray-600 hover:bg-gray-50 text-xs h-10 px-4 cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isPostingPayment}
                  className="bg-teal-600 hover:bg-teal-700 text-white shadow-lg shadow-teal-600/25 rounded-xl text-xs font-bold h-10 px-5 cursor-pointer flex items-center gap-1.5 transition-all hover:scale-[1.01] active:scale-95"
                >
                  {isPostingPayment ? (
                    <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                  ) : (paymentModalData.invoice.status === 'Paid' || paymentModalData.existingPayment) ? (
                    <Pencil className="w-4 h-4 mr-1.5" />
                  ) : (
                    <Banknote className="w-4 h-4 mr-1.5" />
                  )}
                  {(paymentModalData.invoice.status === 'Paid' || paymentModalData.existingPayment)
                    ? `Save Changes (PKR ${paymentAmount})`
                    : `Post Payment (PKR ${paymentAmount})`}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Admin Issue Invoice Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 overflow-y-auto touch-scroll flex items-center justify-center p-3 sm:p-4 safe-pt safe-pb">
          <div className="bg-white rounded-2xl max-w-md w-full max-h-[min(90dvh,calc(100vh-2rem))] overflow-y-auto touch-scroll p-4 sm:p-6 shadow-2xl relative animate-in fade-in zoom-in duration-200 my-auto">
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-gray-100">
              <h3 className="font-bold text-base sm:text-lg text-gray-900">Issue New Digital Invoice</h3>
              <button onClick={() => setIsCreateOpen(false)} className="text-gray-400 hover:text-gray-600 p-1 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateInvoice} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">Target Work Order *</label>
                <select
                  value={selectedWoId}
                  onChange={(e) => setSelectedWoId(e.target.value)}
                  className="w-full border border-gray-200 rounded-md p-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  {workOrders.map((wo) => (
                    <option key={wo._id} value={wo._id}>
                      {wo.title || wo.description?.substring(0, 40) || 'Work Order'}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">Line Item Description</label>
                <Input
                  value={itemDescription}
                  onChange={(e) => setItemDescription(e.target.value)}
                  placeholder="e.g. Deep cleaning & material replacement"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">Invoice Amount (PKR) *</label>
                <Input
                  type="number"
                  min={1}
                  value={itemAmount}
                  onChange={(e) => setItemAmount(e.target.value === '' ? '' : Number(e.target.value))}
                  required
                />
              </div>

              <div className="flex flex-col-reverse sm:flex-row justify-end gap-2.5 sm:gap-3 pt-4 border-t border-gray-100">
                <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)} className="w-full sm:w-auto cursor-pointer">
                  Cancel
                </Button>
                <Button type="submit" className="bg-purple-600 hover:bg-purple-700 text-white shadow-md shadow-purple-600/20 w-full sm:w-auto cursor-pointer" disabled={isCreating}>
                  {isCreating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Create & Issue
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deletingInvoiceId && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs overflow-y-auto touch-scroll flex items-center justify-center p-3 sm:p-4 safe-pt safe-pb">
          <div className="bg-white rounded-2xl max-w-md w-full max-h-[min(90dvh,calc(100vh-2rem))] overflow-y-auto touch-scroll p-4 sm:p-6 shadow-2xl border border-rose-200 animate-in fade-in zoom-in-95 my-auto">
            <div className="flex items-center gap-3 text-rose-600 mb-3">
              <Trash2 className="w-6 h-6" />
              <h3 className="text-lg font-bold">{isFieldRole ? 'Delete Earning Record' : 'Delete Invoice'}</h3>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Are you sure you want to permanently delete this {isFieldRole ? 'earning' : 'invoice'} record? This action will remove it from the system.
            </p>
            <div className="flex justify-end gap-2.5 pt-3 border-t border-gray-100">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDeletingInvoiceId(null)}
                className="text-xs h-9 px-4 rounded-xl cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={isDeleting}
                onClick={confirmDeleteInvoice}
                className="bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs h-9 px-4 rounded-xl cursor-pointer shadow-xs"
              >
                {isDeleting ? 'Deleting...' : 'Permanently Delete'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

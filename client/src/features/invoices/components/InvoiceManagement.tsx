import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Receipt, DollarSign, CheckCircle2, Clock, Download, Plus, Search, Filter, Loader2, X, Check, FileText } from 'lucide-react';
import { apiClient } from '@/infrastructure/api/client';
import { toast } from 'sonner';

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
}

export const InvoiceManagement = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // New Invoice Form State
  const [workOrders, setWorkOrders] = useState<any[]>([]);
  const [selectedWoId, setSelectedWoId] = useState('');
  const [itemDescription, setItemDescription] = useState('Standard facility maintenance & materials');
  const [itemAmount, setItemAmount] = useState(120);
  const [isCreating, setIsCreating] = useState(false);

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
    const token = localStorage.getItem('token');
    try {
      toast.info('Downloading digital invoice PDF...');
      const res = await apiClient.get(`/invoices/${invId}/pdf`, { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${invoiceCode || 'invoice'}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Invoice PDF downloaded successfully!');
    } catch (err) {
      window.open(`/api/invoices/${invId}/pdf?token=${token}`, '_blank');
      toast.success('Opening invoice PDF...');
    }
  };

  const filteredInvoices = invoices.filter((inv) => {
    const matchesStatus = statusFilter === 'All' || inv.status === statusFilter;
    const clientName = typeof inv.clientId === 'object' && inv.clientId ? (inv.clientId as any).name?.toLowerCase() : '';
    const code = (inv.invoiceCode || '').toLowerCase();
    const q = searchQuery.toLowerCase();
    const matchesSearch = code.includes(q) || clientName.includes(q);
    return matchesStatus && matchesSearch;
  });

  const totalBilled = invoices.reduce((acc, inv) => acc + (inv.status !== 'Cancelled' ? inv.amount : 0), 0);
  const totalPaid = invoices.filter((i) => i.status === 'Paid').reduce((acc, inv) => acc + inv.amount, 0);
  const totalPending = invoices.filter((i) => i.status === 'Issued').reduce((acc, inv) => acc + inv.amount, 0);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Invoices & Billing</h1>
          <p className="text-gray-500 mt-1">Manage client service billing, payments, and digital PDF invoices.</p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)} className="bg-teal-600 hover:bg-teal-700 shadow-md cursor-pointer">
          <Plus className="mr-2 h-4 w-4" /> Issue New Invoice
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-none shadow-sm bg-white p-5">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Billed</span>
            <DollarSign className="w-5 h-5 text-teal-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-2">${totalBilled.toLocaleString()}</p>
          <span className="text-xs text-gray-500 mt-1 block">{invoices.length} total issued invoices</span>
        </Card>

        <Card className="border-none shadow-sm bg-white p-5">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Collected (Paid)</span>
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          </div>
          <p className="text-2xl font-bold text-emerald-600 mt-2">${totalPaid.toLocaleString()}</p>
          <span className="text-xs text-emerald-700 font-medium mt-1 block">
            {invoices.filter((i) => i.status === 'Paid').length} paid settlements
          </span>
        </Card>

        <Card className="border-none shadow-sm bg-white p-5">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Outstanding (Pending)</span>
            <Clock className="w-5 h-5 text-amber-500" />
          </div>
          <p className="text-2xl font-bold text-amber-600 mt-2">${totalPending.toLocaleString()}</p>
          <span className="text-xs text-amber-700 font-medium mt-1 block">
            {invoices.filter((i) => i.status === 'Issued').length} pending payment
          </span>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div className="flex gap-2 overflow-x-auto w-full sm:w-auto">
          {['All', 'Issued', 'Paid', 'Cancelled'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                statusFilter === st
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {st === 'Issued' ? 'Pending (Issued)' : st}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search invoice code or client..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-gray-50/50 border-gray-200"
          />
        </div>
      </div>

      {/* Invoices Table / List */}
      {isLoading ? (
        <div className="py-20 text-center text-gray-400">
          <Loader2 className="w-8 h-8 animate-spin text-teal-600 mx-auto mb-2" />
          <p className="text-sm">Loading invoices...</p>
        </div>
      ) : filteredInvoices.length === 0 ? (
        <div className="py-16 text-center text-gray-500 bg-white rounded-2xl p-8 border border-gray-100">
          <Receipt className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="font-semibold text-gray-700">No invoices match your selection.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredInvoices.map((inv) => {
            const clientName = typeof inv.clientId === 'object' && inv.clientId ? (inv.clientId as any).name : 'Authorized Client';
            const clientEmail = typeof inv.clientId === 'object' && inv.clientId ? (inv.clientId as any).email : '';
            const woCode = typeof inv.workOrderId === 'object' && inv.workOrderId ? (inv.workOrderId as any).workOrderCode : 'WO-REFERENCE';

            return (
              <div
                key={inv._id}
                className="bg-white p-4 rounded-xl border border-gray-100 hover:border-teal-200 transition-colors flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-sm"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center font-bold text-xs border border-teal-100">
                    INV
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-900">{inv.invoiceCode}</span>
                      <Badge
                        variant={inv.status === 'Paid' ? 'default' : inv.status === 'Cancelled' ? 'destructive' : 'secondary'}
                        className={inv.status === 'Paid' ? 'bg-emerald-600 text-white' : inv.status === 'Issued' ? 'bg-amber-100 text-amber-800' : ''}
                      >
                        {inv.status === 'Issued' ? 'Pending Payment' : inv.status}
                      </Badge>
                      <span className="text-xs text-gray-400 font-medium">Ref: {woCode}</span>
                    </div>
                    <p className="text-sm text-gray-500 mt-0.5">
                      Client: <span className="font-medium text-gray-700">{clientName}</span> {clientEmail && `(${clientEmail})`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 pt-3 sm:pt-0">
                  <div className="text-right">
                    <span className="text-xs text-gray-400 block">Total Amount</span>
                    <span className="text-lg font-bold text-gray-900">${inv.amount} {inv.currency || 'USD'}</span>
                  </div>

                  <div className="flex gap-2">
                    {inv.status === 'Issued' && (
                      <Button
                        size="sm"
                        onClick={() => handleUpdateStatus(inv._id, 'Paid')}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8 cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5 mr-1" /> Mark Paid
                      </Button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDownloadInvoicePdf(inv._id, inv.invoiceCode)}
                      className="inline-flex items-center justify-center rounded-md text-xs font-medium border border-gray-200 bg-white hover:bg-teal-50 hover:text-teal-700 h-8 px-3 text-gray-700 cursor-pointer transition-colors"
                    >
                      <Download className="w-3.5 h-3.5 mr-1" /> PDF
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Issue Invoice Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl relative animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-gray-100">
              <h3 className="font-bold text-lg text-gray-900">Issue New Digital Invoice</h3>
              <button onClick={() => setIsCreateOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateInvoice} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">Target Work Order *</label>
                <select
                  value={selectedWoId}
                  onChange={(e) => setSelectedWoId(e.target.value)}
                  className="w-full border border-gray-200 rounded-md p-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  {workOrders.map((wo) => (
                    <option key={wo._id} value={wo._id}>
                      {wo.workOrderCode} — {wo.description?.substring(0, 35)}...
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
                <label className="text-xs font-semibold text-gray-700 block mb-1">Invoice Amount ($ USD) *</label>
                <Input
                  type="number"
                  min={1}
                  value={itemAmount}
                  onChange={(e) => setItemAmount(Number(e.target.value))}
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-teal-600 hover:bg-teal-700 text-white" disabled={isCreating}>
                  {isCreating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Create & Issue
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

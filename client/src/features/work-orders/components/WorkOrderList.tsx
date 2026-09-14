import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, Filter, Plus, Calendar, Loader2, ArrowRight, AlertCircle, UserCheck, ShieldAlert } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { StatusBadge } from '@/shared/components/StatusBadge';
import { usePermissions } from '@/entities/user/hooks/usePermissions';
import { apiClient } from '@/infrastructure/api/client';
import { ENDPOINTS } from '@/infrastructure/api/endpoints';
import type { WorkOrder } from '@/entities/workOrder/types';
import type { FieldTeam } from '@/entities/team/types';
import { toast } from 'sonner';

export const WorkOrderList = () => {
  const navigate = useNavigate();
  const { isAdmin } = usePermissions();
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [teams, setTeams] = useState<FieldTeam[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Override modal state
  const [overrideWo, setOverrideWo] = useState<WorkOrder | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [overrideReason, setOverrideReason] = useState('Urgent re-dispatch by Administrator');
  const [isOverriding, setIsOverriding] = useState(false);

  const fetchOrdersAndTeams = async () => {
    try {
      const [woRes, teamsRes] = await Promise.allSettled([
        apiClient.get(ENDPOINTS.WORK_ORDERS.BASE),
        apiClient.get(ENDPOINTS.TEAMS.BASE),
      ]);

      if (woRes.status === 'fulfilled' && woRes.value.data?.data) {
        const list = Array.isArray(woRes.value.data.data) ? woRes.value.data.data : woRes.value.data.data.data || [];
        setWorkOrders(list);
      }

      if (teamsRes.status === 'fulfilled' && teamsRes.value.data?.data) {
        setTeams(teamsRes.value.data.data || []);
      }
    } catch (err) {
      console.error('Failed to load work orders:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrdersAndTeams();
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

  const allCount = workOrders.length;
  const openCount = workOrders.filter((w) => w.status === 'Open').length;
  const inProgressCount = workOrders.filter((w) => w.status === 'InProgress' || w.status === 'Assigned').length;
  const reviewCount = workOrders.filter((w) => w.status === 'PendingReview').length;
  const closedCount = workOrders.filter((w) => w.status === 'Closed').length;

  const filteredOrders = workOrders.filter((wo) => {
    if (activeFilter === 'Open' && wo.status !== 'Open') return false;
    if (activeFilter === 'InProgress' && wo.status !== 'InProgress' && wo.status !== 'Assigned') return false;
    if (activeFilter === 'PendingReview' && wo.status !== 'PendingReview') return false;
    if (activeFilter === 'Closed' && wo.status !== 'Closed') return false;

    const q = searchQuery.toLowerCase();
    const code = (wo.workOrderCode || '').toLowerCase();
    const desc = (wo.description || '').toLowerCase();
    const addr = (wo.locationAddress || '').toLowerCase();
    const catName = typeof wo.categoryId === 'object' && wo.categoryId ? (wo.categoryId as any).name?.toLowerCase() : '';
    const teamName = typeof wo.teamId === 'object' && wo.teamId ? (wo.teamId as any).name?.toLowerCase() : '';

    return code.includes(q) || desc.includes(q) || addr.includes(q) || catName?.includes(q) || teamName?.includes(q);
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Work Orders</h1>
          <p className="text-gray-500 mt-1">Manage, dispatch, and track facility service requests in real-time.</p>
        </div>
        <Button onClick={() => navigate('/work-orders/new')} className="bg-teal-600 hover:bg-teal-700 shadow-md cursor-pointer">
          <Plus className="mr-2 h-4 w-4" /> New Request
        </Button>
      </div>

      <Card className="border-none shadow-sm overflow-hidden bg-white">
        <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex flex-wrap gap-2 w-full md:w-auto">
            <Badge
              variant={activeFilter === 'All' ? 'secondary' : 'outline'}
              className={`cursor-pointer px-3 py-1 text-xs ${
                activeFilter === 'All' ? 'bg-teal-600 text-white hover:bg-teal-700' : 'bg-white text-gray-600 hover:bg-gray-100'
              }`}
              onClick={() => setActiveFilter('All')}
            >
              All ({allCount})
            </Badge>
            <Badge
              variant={activeFilter === 'Open' ? 'secondary' : 'outline'}
              className={`cursor-pointer px-3 py-1 text-xs ${
                activeFilter === 'Open' ? 'bg-teal-600 text-white hover:bg-teal-700' : 'bg-white text-gray-600 hover:bg-gray-100'
              }`}
              onClick={() => setActiveFilter('Open')}
            >
              Open ({openCount})
            </Badge>
            <Badge
              variant={activeFilter === 'InProgress' ? 'secondary' : 'outline'}
              className={`cursor-pointer px-3 py-1 text-xs ${
                activeFilter === 'InProgress' ? 'bg-teal-600 text-white hover:bg-teal-700' : 'bg-white text-gray-600 hover:bg-gray-100'
              }`}
              onClick={() => setActiveFilter('InProgress')}
            >
              In Progress ({inProgressCount})
            </Badge>
            <Badge
              variant={activeFilter === 'PendingReview' ? 'secondary' : 'outline'}
              className={`cursor-pointer px-3 py-1 text-xs ${
                activeFilter === 'PendingReview' ? 'bg-teal-600 text-white hover:bg-teal-700' : 'bg-white text-gray-600 hover:bg-gray-100'
              }`}
              onClick={() => setActiveFilter('PendingReview')}
            >
              Review ({reviewCount})
            </Badge>
            <Badge
              variant={activeFilter === 'Closed' ? 'secondary' : 'outline'}
              className={`cursor-pointer px-3 py-1 text-xs ${
                activeFilter === 'Closed' ? 'bg-teal-600 text-white hover:bg-teal-700' : 'bg-white text-gray-600 hover:bg-gray-100'
              }`}
              onClick={() => setActiveFilter('Closed')}
            >
              Closed ({closedCount})
            </Badge>
          </div>

          <div className="flex gap-2 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search ID, title, or address..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-sm bg-white"
              />
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="py-16 text-center text-gray-400">
            <Loader2 className="w-8 h-8 animate-spin text-teal-600 mx-auto mb-2" />
            <p className="text-sm">Loading work orders from database...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="py-16 text-center text-gray-500">
            <p className="font-semibold text-gray-700 text-base">No work orders match the current filter.</p>
            <p className="text-sm text-gray-400 mt-1">Try selecting a different status chip or clearing your search.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredOrders.map((wo) => {
              const orderId = wo._id || wo.id;
              const catName = typeof wo.categoryId === 'object' && wo.categoryId ? (wo.categoryId as any).name : 'Service';
              const teamName = typeof wo.teamId === 'object' && wo.teamId ? (wo.teamId as any).name : 'Unassigned';
              const formattedDate = wo.createdAt ? new Date(wo.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recent';

              return (
                <div
                  key={orderId}
                  className="p-4 sm:p-5 hover:bg-teal-50/30 transition-colors flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 group"
                >
                  <div
                    onClick={() => navigate(`/work-orders/${orderId}`)}
                    className="flex items-start gap-4 w-full sm:w-auto cursor-pointer"
                  >
                    <div className="h-10 w-10 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center font-bold text-teal-700 group-hover:bg-teal-600 group-hover:text-white transition-colors shrink-0">
                      {catName.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-gray-900 group-hover:text-teal-700 transition-colors">
                          {wo.workOrderCode || orderId}
                        </span>
                        <StatusBadge status={wo.status} />
                        {wo.urgency === 'High' && (
                          <Badge variant="destructive" className="bg-red-100 text-red-700 border-none px-1.5 py-0 text-[10px] uppercase font-bold flex items-center gap-0.5">
                            <AlertCircle className="w-2.5 h-2.5" /> High
                          </Badge>
                        )}
                      </div>
                      <p className="font-medium text-gray-800 text-sm mb-1 line-clamp-1">{wo.description}</p>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                        <span className="flex items-center">
                          <Calendar className="h-3 w-3 mr-1" /> {formattedDate}
                        </span>
                        <span className="bg-gray-100 px-1.5 py-0.5 rounded font-medium text-gray-600">{catName}</span>
                        <span>{wo.locationAddress}</span>
                      </div>
                    </div>
                  </div>

                  <div className="w-full sm:w-auto flex flex-row sm:flex-col justify-between sm:items-end gap-2 text-sm border-t sm:border-0 pt-3 sm:pt-0 border-gray-100">
                    <div className="text-xs text-gray-500 flex items-center gap-2">
                      <span>Assigned: <strong className={teamName === 'Unassigned' ? 'italic text-amber-600 font-medium' : 'font-semibold text-gray-700'}>{teamName}</strong></span>
                      {isAdmin && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setOverrideWo(wo);
                            setSelectedTeamId(typeof wo.teamId === 'object' && wo.teamId ? (wo.teamId as any)._id : '');
                          }}
                          className="h-6 px-2 text-[10px] text-amber-700 border-amber-200 hover:bg-amber-50 cursor-pointer"
                        >
                          Override
                        </Button>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate(`/work-orders/${orderId}`)}
                      className="h-8 text-teal-600 hover:bg-teal-50 group-hover:translate-x-1 transition-all cursor-pointer"
                    >
                      View Details &rarr;
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Admin Manual Dispatch Override Modal */}
      {overrideWo && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100 space-y-4">
            <div className="flex items-center gap-2.5 pb-2 border-b border-gray-100">
              <ShieldAlert className="w-6 h-6 text-amber-600" />
              <div>
                <h3 className="font-bold text-gray-900 text-lg">Admin Dispatch Override</h3>
                <p className="text-xs text-gray-500">Reassign work order {overrideWo.workOrderCode}</p>
              </div>
            </div>

            <form onSubmit={handleExecuteOverride} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1.5">Select Replacement Field Crew</label>
                <select
                  value={selectedTeamId}
                  onChange={(e) => setSelectedTeamId(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-gray-300 text-sm bg-white focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  required
                >
                  <option value="">-- Choose Field Team --</option>
                  {teams.map((t) => (
                    <option key={t._id} value={t._id}>
                      {t.name} ({t.activeOrderCount || 0} active, {t.averageRating || 4.8}★)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1.5">Administrative Reason</label>
                <Input
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  placeholder="e.g. Technician reassigned due to high urgency load"
                  required
                />
              </div>

              <div className="flex gap-2 justify-end pt-3 border-t border-gray-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOverrideWo(null)}
                  disabled={isOverriding}
                  className="cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isOverriding}
                  className="bg-amber-600 hover:bg-amber-700 text-white cursor-pointer shadow-md"
                >
                  {isOverriding ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <UserCheck className="w-4 h-4 mr-2" />}
                  Confirm Re-assignment
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

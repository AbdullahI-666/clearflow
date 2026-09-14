import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CheckCircle2, Search, ArrowRight, FileText, Clock, Check, Plus, Loader2 } from 'lucide-react';
import { KpiCard } from '@/shared/components/KpiCard';
import { StatusBadge } from '@/shared/components/StatusBadge';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/entities/user/hooks/useAuth';
import { apiClient } from '@/infrastructure/api/client';
import { ENDPOINTS } from '@/infrastructure/api/endpoints';
import type { WorkOrder } from '@/entities/workOrder/types';

export const ClientDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const res = await apiClient.get(ENDPOINTS.WORK_ORDERS.BASE);
        if (res.data?.success && res.data?.data) {
          const list = Array.isArray(res.data.data) ? res.data.data : res.data.data.data || [];
          setWorkOrders(list);
        }
      } catch (err) {
        console.error('Failed to fetch client work orders:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrders();
  }, []);

  const totalCount = workOrders.length;
  const inProgressCount = workOrders.filter(w => w.status === 'InProgress' || w.status === 'Assigned').length;
  const completedCount = workOrders.filter(w => w.status === 'Closed' || w.status === 'PendingReview').length;

  const filteredOrders = workOrders.filter(wo => {
    const q = searchQuery.toLowerCase();
    const code = (wo.workOrderCode || '').toLowerCase();
    const desc = (wo.description || '').toLowerCase();
    const addr = (wo.locationAddress || '').toLowerCase();
    const catName = typeof wo.categoryId === 'object' && wo.categoryId ? (wo.categoryId as any).name?.toLowerCase() : '';
    return code.includes(q) || desc.includes(q) || addr.includes(q) || catName.includes(q);
  });

  const recentOrders = filteredOrders.slice(0, 5);

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            Good day, {user?.name || user?.firstName || 'Valued Client'}!
          </h1>
          <p className="text-gray-500 mt-1">Here is the real-time status of your facility service requests.</p>
        </div>
        <Button onClick={() => navigate('/work-orders/new')} className="bg-teal-600 hover:bg-teal-700 shadow-md cursor-pointer">
          <Plus className="mr-2 h-4 w-4" />
          New Request
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <KpiCard title="Total Requests" value={String(totalCount)} icon={<FileText className="w-5 h-5 text-teal-600"/>} />
        <KpiCard title="In Progress" value={String(inProgressCount)} icon={<Clock className="w-5 h-5 text-teal-600"/>} trend={{ value: `${inProgressCount} active`, isPositive: true }} />
        <KpiCard title="Completed" value={String(completedCount)} icon={<Check className="w-5 h-5 text-teal-600"/>} />
      </div>

      <Card className="border-none shadow-sm bg-white">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 gap-4">
          <CardTitle className="text-xl font-semibold">Recent Requests</CardTitle>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
            <Input 
              type="search" 
              placeholder="Search orders..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-gray-50 focus-visible:ring-teal-500 border border-gray-200" 
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center text-gray-400">
              <Loader2 className="w-8 h-8 animate-spin text-teal-600 mb-2" />
              <p className="text-sm">Loading work orders from MongoDB...</p>
            </div>
          ) : recentOrders.length === 0 ? (
            <div className="py-12 text-center text-gray-500">
              <p className="font-medium text-gray-700">No service requests found.</p>
              <p className="text-sm mt-1">Submit your first facility request to get started.</p>
              <Button onClick={() => navigate('/work-orders/new')} className="mt-4 bg-teal-600 hover:bg-teal-700 text-sm">
                <Plus className="w-4 h-4 mr-1" /> Create Request
              </Button>
            </div>
          ) : (
            <div className="space-y-3 mt-4">
              {recentOrders.map((req) => {
                const catName = typeof req.categoryId === 'object' && req.categoryId ? (req.categoryId as any).name : 'Service';
                const formattedDate = req.createdAt ? new Date(req.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Recent';
                const orderId = req._id || req.id;

                return (
                  <div 
                    key={orderId} 
                    onClick={() => navigate(`/work-orders/${orderId}`)}
                    className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-xl border border-gray-100 hover:border-teal-200 hover:bg-teal-50/30 transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-4 mb-3 sm:mb-0">
                      <div className="h-10 w-10 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 font-semibold shrink-0">
                        {catName.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-900">{req.workOrderCode || orderId}</span>
                          <StatusBadge status={req.status} />
                          {req.urgency === 'High' && (
                            <span className="px-2 py-0.5 text-xs rounded-full bg-red-100 text-red-700 font-medium">High</span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500 mt-0.5">{catName} &bull; {req.locationAddress || 'Campus Site'}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between w-full sm:w-auto gap-4">
                      <span className="text-xs text-gray-400">{formattedDate}</span>
                      <Button variant="ghost" size="icon" className="group-hover:text-teal-600 group-hover:translate-x-1 transition-all">
                        <ArrowRight className="h-5 w-5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          
          {workOrders.length > 5 && (
            <div className="mt-4 text-center">
              <Button variant="link" onClick={() => navigate('/work-orders')} className="text-teal-600 hover:text-teal-700">
                View all {workOrders.length} requests &rarr;
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};


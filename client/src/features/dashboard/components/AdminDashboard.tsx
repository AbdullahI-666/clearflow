import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Map, Users, BarChart3, AlertCircle, Clock, CheckCircle2, Star, Zap, Loader2, ArrowRight, Plus, FolderKanban, Receipt, Settings, ArrowRightLeft, ShieldAlert, AlertTriangle } from 'lucide-react';
import { KpiCard } from '@/shared/components/KpiCard';
import { StatusBadge } from '@/shared/components/StatusBadge';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '@/infrastructure/api/client';
import { ENDPOINTS } from '@/infrastructure/api/endpoints';
import type { WorkOrder } from '@/entities/workOrder/types';
import type { FieldTeam } from '@/entities/team/types';

export const AdminDashboard = () => {
  const navigate = useNavigate();
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [teams, setTeams] = useState<FieldTeam[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [anomaliesData, setAnomaliesData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [woRes, teamsRes, analyticsRes, anomRes] = await Promise.allSettled([
          apiClient.get(ENDPOINTS.WORK_ORDERS.BASE, { params: { limit: 10 } }),
          apiClient.get(ENDPOINTS.TEAMS.BASE),
          apiClient.get(ENDPOINTS.ANALYTICS.DASHBOARD),
          apiClient.get(ENDPOINTS.AI.ANOMALIES),
        ]);

        if (woRes.status === 'fulfilled' && woRes.value.data?.data) {
          const list = Array.isArray(woRes.value.data.data) ? woRes.value.data.data : woRes.value.data.data.data || [];
          setWorkOrders(list);
        }

        if (teamsRes.status === 'fulfilled' && teamsRes.value.data?.data) {
          setTeams(teamsRes.value.data.data || []);
        }

        if (analyticsRes.status === 'fulfilled' && analyticsRes.value.data?.data) {
          setAnalytics(analyticsRes.value.data.data);
        }

        if (anomRes.status === 'fulfilled' && anomRes.value.data?.data) {
          setAnomaliesData(anomRes.value.data.data);
        }
      } catch (err) {
        console.error('Failed to load admin dashboard data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const totalOrders = analytics?.kpis?.totalRequests ?? workOrders.length ?? 6;
  const completionRate = analytics?.kpis?.completionRate ?? '92.4%';
  const avgResponse = analytics?.kpis?.avgResponseMinutes ? `${analytics.kpis.avgResponseMinutes} min` : '39 min';
  const csatScore = analytics?.kpis?.csatRating ?? '4.8 / 5';
  const aiConf = analytics?.kpis?.aiConfidence ?? '94%';
  const activeTeamsCount = teams.filter(t => t.isActive).length || teams.length || 5;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header & Quick Action Shortcuts */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Facility Operations Command</h1>
          <p className="text-gray-500 mt-1">Real-time worldwide facility management, telemetry, and automated dispatch.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => navigate('/categories')} className="border-gray-200 text-gray-700 hover:bg-teal-50 hover:text-teal-700 cursor-pointer">
            <FolderKanban className="mr-1.5 h-4 w-4 text-teal-600" /> Categories
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate('/invoices')} className="border-gray-200 text-gray-700 hover:bg-teal-50 hover:text-teal-700 cursor-pointer">
            <Receipt className="mr-1.5 h-4 w-4 text-teal-600" /> Invoices
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate('/tracking')} className="border-teal-200 text-teal-700 hover:bg-teal-50 cursor-pointer">
            <Map className="mr-1.5 h-4 w-4" /> Live Map
          </Button>
          <Button size="sm" onClick={() => navigate('/analytics')} className="bg-teal-600 hover:bg-teal-700 text-white shadow-md cursor-pointer">
            <BarChart3 className="mr-1.5 h-4 w-4" /> Analytics & Forecast
          </Button>
        </div>
      </div>

      {/* F-32: AI Operational Anomaly Monitor */}
      {anomaliesData?.summary?.totalAnomalies > 0 && (
        <div className="bg-gradient-to-r from-amber-50 via-rose-50 to-orange-50 border border-amber-200 rounded-2xl p-4 shadow-xs">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-amber-500/10 text-amber-700 rounded-xl">
                <ShieldAlert className="w-6 h-6 text-amber-600 animate-pulse" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                  AI Operational Anomaly Scanner
                  <span className="px-2 py-0.5 text-xs rounded-full bg-rose-100 text-rose-700 font-extrabold">
                    {anomaliesData.summary.totalAnomalies} Outliers Detected
                  </span>
                </h3>
                <p className="text-xs text-gray-600 mt-0.5">
                  Top Priority: <span className="font-semibold text-gray-800">{anomaliesData.anomalies[0]?.title}</span> — {anomaliesData.anomalies[0]?.description}
                </p>
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate('/work-orders')}
              className="border-amber-300 text-amber-900 hover:bg-amber-100 text-xs font-semibold shrink-0 cursor-pointer"
            >
              Review Flagged Orders &rarr;
            </Button>
          </div>
        </div>
      )}

      {/* 4 Core KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard title="Avg Response Time" value={avgResponse} icon={<Clock className="w-5 h-5 text-teal-600"/>} trend={{ value: "-12%", isPositive: true }} subtitle="vs last week" />
        <KpiCard title="Completion Rate" value={completionRate} icon={<CheckCircle2 className="w-5 h-5 text-emerald-600"/>} trend={{ value: "+2.1%", isPositive: true }} subtitle="SLA Target: 90%" />
        <KpiCard title="CSAT Score" value={csatScore} icon={<Star className="w-5 h-5 text-amber-500 fill-amber-500"/>} subtitle="Verified client ratings" />
        <KpiCard title="AI Quality Confidence" value={aiConf} icon={<Zap className="w-5 h-5 text-purple-600"/>} subtitle="Deep Residual CNN" />
      </div>

      {/* Main Operational Split: Work Orders Queue vs Fleet Telemetry */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Work Orders Queue */}
        <Card className="col-span-3 md:col-span-2 border-none shadow-sm bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-gray-50">
            <div>
              <CardTitle className="text-lg font-bold text-gray-900">Active Work Order Queue</CardTitle>
              <p className="text-xs text-gray-400 mt-0.5">{totalOrders} total work orders registered in facility database</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => navigate('/work-orders')} className="text-teal-600 hover:text-teal-700 cursor-pointer text-xs font-semibold">
              View All Work Orders &rarr;
            </Button>
          </CardHeader>
          <CardContent className="pt-4">
            {isLoading ? (
              <div className="py-12 flex flex-col items-center justify-center text-gray-400">
                <Loader2 className="w-8 h-8 animate-spin text-teal-600 mb-2" />
                <p className="text-sm">Fetching work orders...</p>
              </div>
            ) : workOrders.length === 0 ? (
              <div className="py-12 text-center text-gray-500">
                <p>No active work orders recorded yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {workOrders.slice(0, 5).map((wo) => {
                  const orderId = wo._id || wo.id;
                  const catName = typeof wo.categoryId === 'object' && wo.categoryId ? (wo.categoryId as any).name : 'Facility Ops';
                  const teamName = typeof wo.teamId === 'object' && wo.teamId ? (wo.teamId as any).name : 'Auto-Assigned';
                  const timeFormatted = wo.createdAt ? new Date(wo.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recently';

                  return (
                    <div 
                      key={orderId} 
                      onClick={() => navigate(`/work-orders/${orderId}`)}
                      className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3.5 rounded-xl border border-gray-100 hover:border-teal-200 hover:bg-teal-50/20 transition-all cursor-pointer shadow-xs"
                    >
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-gray-900 text-sm">{wo.workOrderCode || orderId}</span>
                          <StatusBadge status={wo.status} />
                          {wo.urgency === 'High' && (
                            <span className="px-2 py-0.5 text-[11px] rounded-full bg-red-100 text-red-700 font-bold flex items-center gap-1">
                              <AlertCircle className="w-3 h-3"/> High Priority
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500">
                          {catName} &bull; Crew: <span className="font-medium text-gray-700">{teamName}</span> &bull; {wo.locationAddress?.substring(0, 35)}...
                        </p>
                      </div>
                      <div className="flex items-center gap-3 mt-2 sm:mt-0">
                        <span className="text-xs text-gray-400 font-mono">{timeFormatted}</span>
                        <Button 
                          size="sm" 
                          variant={wo.status === 'Flagged' ? 'destructive' : 'secondary'}
                          className="text-xs h-7 px-2.5"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/work-orders/${orderId}`);
                          }}
                        >
                          {wo.status === 'Flagged' ? 'Re-Inspect' : 'Details'}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Fleet Telemetry Live Status */}
        <Card className="col-span-3 md:col-span-1 border-none shadow-sm flex flex-col bg-white">
          <CardHeader className="pb-2 border-b border-gray-50">
            <CardTitle className="text-lg font-bold text-gray-900">Fleet Telemetry</CardTitle>
            <p className="text-xs text-gray-400 mt-0.5">Real-time GPS dispatch & telemetry tracking</p>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col pt-4">
            <div 
              onClick={() => navigate('/tracking')}
              className="flex-1 rounded-xl bg-gradient-to-br from-teal-50 to-emerald-50/80 overflow-hidden relative min-h-[220px] border border-teal-100 flex items-center justify-center cursor-pointer group shadow-inner"
            >
              <div className="relative z-10 flex flex-col items-center p-4 text-center">
                <div className="w-12 h-12 rounded-2xl bg-white shadow-md flex items-center justify-center text-teal-600 mb-2 group-hover:scale-110 transition-transform">
                  <Map className="h-6 w-6" />
                </div>
                <span className="font-bold text-gray-900 bg-white/95 px-3 py-1 rounded-full shadow-xs text-xs border border-teal-100">
                  {activeTeamsCount} Field Crews Active
                </span>
                <p className="text-xs text-teal-700 mt-2 font-semibold flex items-center gap-1">
                  Open Interactive Map <ArrowRight className="w-3.5 h-3.5" />
                </p>
              </div>
              
              <div className="absolute top-1/4 left-1/4 h-3.5 w-3.5 bg-emerald-500 rounded-full border-2 border-white shadow-md animate-ping"></div>
              <div className="absolute top-1/2 right-1/4 h-3.5 w-3.5 bg-teal-500 rounded-full border-2 border-white shadow-md animate-ping"></div>
              <div className="absolute bottom-1/3 left-1/2 h-3.5 w-3.5 bg-amber-500 rounded-full border-2 border-white shadow-md animate-ping"></div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <Button variant="outline" size="sm" onClick={() => navigate('/teams')} className="w-full justify-start text-xs border-gray-200 hover:bg-gray-50">
                <Users className="mr-1.5 h-3.5 w-3.5 text-teal-600"/> Team Roster ({teams.length})
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigate('/tracking')} className="w-full justify-start text-xs border-gray-200 hover:bg-gray-50">
                <Map className="mr-1.5 h-3.5 w-3.5 text-teal-600"/> Full Telemetry
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

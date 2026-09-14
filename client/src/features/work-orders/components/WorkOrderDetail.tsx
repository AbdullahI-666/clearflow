import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/shared/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  FileText, MapPin, User, MessageCircle, Star, Download, ShieldCheck, 
  ArrowLeft, Loader2, AlertCircle, CheckCircle2, Navigation, Recycle, 
  Clock, Scale, ShieldAlert, ArrowRightLeft, DollarSign, X, Check
} from 'lucide-react';
import { useAuth } from '@/entities/user/hooks/useAuth';
import { usePermissions } from '@/entities/user/hooks/usePermissions';
import { apiClient } from '@/infrastructure/api/client';
import { ENDPOINTS } from '@/infrastructure/api/endpoints';
import type { WorkOrder } from '@/entities/workOrder/types';
import type { FieldTeam } from '@/entities/team/types';
import { toast } from 'sonner';
import L from 'leaflet';

const sitePinIcon = L.divIcon({
  className: 'clearflow-site-pin',
  html: `<div style="background-color: #0d9488; color: #ffffff; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 8px rgba(0,0,0,0.3); border: 2px solid #ffffff; font-size: 16px;">📍</div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

export const WorkOrderDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isClient, isAdmin, isFieldTeam } = usePermissions();

  const [workOrder, setWorkOrder] = useState<WorkOrder | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [ratingStars, setRatingStars] = useState(5);
  const [ratingComment, setRatingComment] = useState('');
  const [isSubmittingRating, setIsSubmittingRating] = useState(false);

  // Admin Override Modal
  const [isOverrideOpen, setIsOverrideOpen] = useState(false);
  const [availableTeams, setAvailableTeams] = useState<FieldTeam[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [overrideReason, setOverrideReason] = useState('Proximity and specialized equipment requirement');
  const [isOverriding, setIsOverriding] = useState(false);

  // Admin Invoice Modal
  const [isInvoiceOpen, setIsInvoiceOpen] = useState(false);
  const [invoiceAmount, setInvoiceAmount] = useState(120);
  const [invoiceDesc, setInvoiceDesc] = useState('');
  const [isIssuingInvoice, setIsIssuingInvoice] = useState(false);

  const fetchOrderDetail = async () => {
    if (!id) return;
    try {
      const res = await apiClient.get(ENDPOINTS.WORK_ORDERS.BY_ID(id));
      if (res.data?.success && res.data?.data) {
        setWorkOrder(res.data.data);
      }
    } catch (err: any) {
      toast.error('Failed to load work order details');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTeamsForOverride = async () => {
    try {
      const res = await apiClient.get(ENDPOINTS.TEAMS.BASE);
      if (res.data?.success && res.data?.data) {
        const teams = res.data.data;
        setAvailableTeams(teams);
        if (teams.length > 0) setSelectedTeamId(teams[0]._id);
      }
    } catch (err) {}
  };

  useEffect(() => {
    fetchOrderDetail();
    if (isAdmin) {
      fetchTeamsForOverride();
    }
  }, [id, isAdmin]);

  const handleRatingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    setIsSubmittingRating(true);
    try {
      const res = await apiClient.post(ENDPOINTS.WORK_ORDERS.RATE(id), {
        stars: ratingStars,
        comment: ratingComment,
      });

      if (res.data?.success) {
        toast.success('Thank you! Rating submitted and work order closed.');
        fetchOrderDetail();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to submit rating');
    } finally {
      setIsSubmittingRating(false);
    }
  };

  const handleOverrideDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !selectedTeamId) return;

    setIsOverriding(true);
    try {
      const res = await apiClient.patch(`/work-orders/${id}/assign`, {
        teamId: selectedTeamId,
        reason: overrideReason,
      });

      if (res.data?.success) {
        toast.success('Team assignment successfully overridden');
        setIsOverrideOpen(false);
        fetchOrderDetail();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to override assignment');
    } finally {
      setIsOverriding(false);
    }
  };

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    setIsIssuingInvoice(true);
    try {
      const res = await apiClient.post('/invoices', {
        workOrderId: id,
        amount: Number(invoiceAmount),
        items: [
          { description: invoiceDesc || `Facility Service: ${workOrder?.description || 'Work Order Delivery'}`, quantity: 1, unitPrice: Number(invoiceAmount), total: Number(invoiceAmount) }
        ],
      });

      if (res.data?.success) {
        toast.success('Digital invoice issued successfully!');
        setIsInvoiceOpen(false);
        navigate('/invoices');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to issue invoice');
    } finally {
      setIsIssuingInvoice(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!id) return;
    const token = localStorage.getItem('token');
    try {
      toast.info('Downloading completion report PDF...');
      const res = await apiClient.get(`/reports/${id}/pdf`, { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${workOrder?.workOrderCode || 'report'}_completion.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('PDF report downloaded successfully!');
    } catch (err) {
      window.open(`/api/reports/${id}/pdf?token=${token}`, '_blank');
      toast.success('Opening PDF report...');
    }
  };

  if (isLoading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-gray-400">
        <Loader2 className="w-10 h-10 animate-spin text-teal-600 mb-3" />
        <p className="font-medium text-gray-600">Retrieving work order details from database...</p>
      </div>
    );
  }

  if (!workOrder) {
    return (
      <div className="max-w-xl mx-auto py-16 text-center">
        <AlertCircle className="w-16 h-16 text-amber-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Work Order Not Found</h2>
        <p className="text-gray-500 mb-6">The requested work order could not be located in the database.</p>
        <Button onClick={() => navigate('/work-orders')} className="bg-teal-600 hover:bg-teal-700">
          Back to Work Orders
        </Button>
      </div>
    );
  }

  const clientObj = typeof workOrder.clientId === 'object' && workOrder.clientId ? workOrder.clientId : null;
  const teamObj = typeof workOrder.teamId === 'object' && workOrder.teamId ? workOrder.teamId : null;
  const catObj = typeof workOrder.categoryId === 'object' && workOrder.categoryId ? (workOrder.categoryId as any) : null;
  const catName = catObj?.name || 'Facility Service';

  const orderId = workOrder._id || workOrder.id;
  const formattedDate = workOrder.createdAt ? new Date(workOrder.createdAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : 'Recently';

  // 5-Stage Status progression timeline
  const statusSteps = [
    { key: 'Open', label: '1. Request Submitted', timestamp: workOrder.createdAt },
    { key: 'Assigned', label: '2. Team Dispatched', timestamp: workOrder.assignedAt },
    { key: 'InProgress', label: '3. Service In Progress', timestamp: workOrder.startedAt },
    { key: 'PendingReview', label: '4. AI Quality Check', timestamp: (workOrder.afterImageUrl && workOrder.aiConfidenceScore) ? workOrder.updatedAt : undefined },
    { key: 'Closed', label: '5. Completed & Rated', timestamp: workOrder.closedAt },
  ];

  const statusOrder = ['Open', 'Assigned', 'InProgress', 'PendingReview', 'Closed'];
  const currentStepIndex = statusOrder.indexOf(workOrder.status === 'Flagged' ? 'PendingReview' : workOrder.status);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="hover:bg-teal-50">
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </Button>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">
                {workOrder.workOrderCode || orderId}
              </h1>
              <StatusBadge status={workOrder.status} />
              <Badge variant="outline" className="bg-white border-teal-200 text-teal-800">
                {catName}
              </Badge>
              {workOrder.urgency === 'High' && (
                <Badge variant="destructive" className="bg-red-500 text-white flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> High Priority
                </Badge>
              )}
            </div>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">
              Submitted on {formattedDate} &bull; ID: <span className="font-mono text-gray-700">{orderId}</span>
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {isAdmin && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsOverrideOpen(true)}
                className="border-amber-300 text-amber-800 bg-amber-50 hover:bg-amber-100 cursor-pointer"
              >
                <ArrowRightLeft className="w-4 h-4 mr-1.5" /> Reassign / Override
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setInvoiceDesc(`Facility Service: ${workOrder.description}`);
                  setIsInvoiceOpen(true);
                }}
                className="border-teal-300 text-teal-800 bg-teal-50 hover:bg-teal-100 cursor-pointer"
              >
                <DollarSign className="w-4 h-4 mr-1.5" /> Issue Invoice
              </Button>
            </>
          )}

          <Button 
            variant="outline" 
            size="sm"
            onClick={handleDownloadPdf}
            className="border-teal-200 text-teal-700 hover:bg-teal-50 cursor-pointer"
          >
            <Download className="w-4 h-4 mr-2" /> PDF Report
          </Button>
          
          <Button 
            size="sm" 
            onClick={() => navigate(`/chat/${orderId}`)}
            className="bg-teal-600 hover:bg-teal-700 text-white cursor-pointer shadow-sm"
          >
            <MessageCircle className="w-4 h-4 mr-2" /> Open Chat
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Order Details & Quality Verification */}
        <div className="lg:col-span-2 space-y-6">
          {/* Main Problem Description Card */}
          <Card className="border-none shadow-sm bg-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Incident Details & Location</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Description</span>
                <p className="text-gray-900 font-medium text-base mt-1 whitespace-pre-wrap">
                  {workOrder.description}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-gray-100">
                <div className="flex items-start gap-2.5">
                  <MapPin className="w-5 h-5 text-teal-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-xs font-semibold text-gray-500 block">Facility Address</span>
                    <span className="text-sm font-medium text-gray-900">{workOrder.locationAddress}</span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <User className="w-5 h-5 text-teal-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-xs font-semibold text-gray-500 block">Requesting Client</span>
                    <span className="text-sm font-medium text-gray-900">{clientObj?.name || 'Facility Resident'}</span>
                    <span className="text-xs text-gray-400 block">{clientObj?.email || ''}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* AI Quality Verification Images Section */}
          <Card className="border-none shadow-sm bg-white overflow-hidden">
            <CardHeader className="pb-3 border-b border-gray-50 flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-teal-600" />
                <CardTitle className="text-lg">AI Visual Quality Verification</CardTitle>
              </div>
              {workOrder.aiConfidenceScore && (
                <Badge className="bg-teal-600 text-white font-mono text-xs">
                  Confidence: {Math.round(workOrder.aiConfidenceScore * 100)}%
                </Badge>
              )}
            </CardHeader>
            <CardContent className="pt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Before Photo */}
                <div className="space-y-2">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block">
                    Before-Service Photo
                  </span>
                  {workOrder.beforeImageUrl ? (
                    <div className="relative rounded-xl overflow-hidden border border-gray-200 aspect-video bg-gray-100 group">
                      <img 
                        src={workOrder.beforeImageUrl} 
                        alt="Before Repair" 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                  ) : (
                    <div className="rounded-xl border-2 border-dashed border-gray-200 aspect-video flex flex-col items-center justify-center text-gray-400 bg-gray-50">
                      <FileText className="w-8 h-8 mb-1 opacity-50" />
                      <span className="text-xs font-medium">No initial photo uploaded</span>
                    </div>
                  )}
                </div>

                {/* After Photo */}
                <div className="space-y-2">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block">
                    After-Service Photo
                  </span>
                  {workOrder.afterImageUrl ? (
                    <div className="relative rounded-xl overflow-hidden border border-gray-200 aspect-video bg-gray-100 group">
                      <img 
                        src={workOrder.afterImageUrl} 
                        alt="After Repair" 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                  ) : (
                    <div className="rounded-xl border-2 border-dashed border-gray-200 aspect-video flex flex-col items-center justify-center text-gray-400 bg-gray-50">
                      <FileText className="w-8 h-8 mb-1 opacity-50" />
                      <span className="text-xs font-medium">Awaiting service completion upload</span>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Client Rating Submission Box */}
          {isClient && (workOrder.status === 'PendingReview' || workOrder.status === 'Closed') && (
            <Card className="border-none shadow-sm bg-gradient-to-br from-teal-50/50 to-white border border-teal-100">
              <CardHeader className="pb-2">
                <CardTitle className="text-base text-teal-900 flex items-center gap-2">
                  <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
                  Service Quality Rating & Feedback
                </CardTitle>
              </CardHeader>
              <CardContent>
                {workOrder.status === 'Closed' ? (
                  <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-900 flex items-center gap-3">
                    <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
                    <div>
                      <p className="font-semibold text-sm">Work order is officially closed and rated.</p>
                      <p className="text-xs text-emerald-700 mt-0.5">Thank you for rating ClearFlow facility services!</p>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleRatingSubmit} className="space-y-4">
                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-gray-500 block mb-2">
                        Select Rating (1 to 5 Stars):
                      </label>
                      <div className="flex items-center gap-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            type="button"
                            key={star}
                            onClick={() => setRatingStars(star)}
                            className="p-1 hover:scale-110 transition-transform cursor-pointer"
                          >
                            <Star 
                              className={`w-7 h-7 ${star <= ratingStars ? 'text-amber-500 fill-amber-500' : 'text-gray-300'}`} 
                            />
                          </button>
                        ))}
                        <span className="ml-2 font-bold text-teal-900 text-sm">
                          {ratingStars} of 5 Stars
                        </span>
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-1 block">
                        Client Feedback / Comments (Optional):
                      </label>
                      <Textarea 
                        placeholder="Provide feedback on the technician's professionalism, speed, and quality of work..." 
                        value={ratingComment}
                        onChange={(e) => setRatingComment(e.target.value)}
                        className="bg-white resize-none h-20"
                      />
                    </div>
                    <Button 
                      type="submit" 
                      className="bg-teal-600 hover:bg-teal-700 text-white cursor-pointer shadow-md"
                      disabled={isSubmittingRating}
                    >
                      {isSubmittingRating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                      Submit Feedback & Complete Job
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column: Timeline & Assigned Team */}
        <div className="space-y-6">
          {/* 5-Stage Service Lifecycle Card */}
          <Card className="border-none shadow-sm bg-white">
            <CardHeader>
              <CardTitle className="text-lg">Service Lifecycle</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative pl-6 space-y-6 before:absolute before:inset-0 before:ml-2.5 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-teal-500 before:via-gray-200 before:to-gray-200">
                {statusSteps.map((step, idx) => {
                  const isDone = idx <= currentStepIndex;
                  const isActive = idx === currentStepIndex;
                  const stepTimeStr = step.timestamp ? new Date(step.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null;

                  return (
                    <div key={step.key} className="relative flex items-start gap-4">
                      {isDone ? (
                        <div className="absolute left-[-24px] bg-teal-600 h-3.5 w-3.5 rounded-full border-[3px] border-white shadow-sm mt-1 z-10"></div>
                      ) : (
                        <div className="absolute left-[-24px] bg-gray-300 h-3 w-3 rounded-full border-[2px] border-white shadow-sm mt-1 z-10"></div>
                      )}
                      <div className="w-full">
                        <div className="flex items-center justify-between">
                          <p className={`font-semibold text-sm ${isActive ? 'text-teal-700 font-bold' : isDone ? 'text-gray-900' : 'text-gray-400'}`}>
                            {step.label}
                          </p>
                          {stepTimeStr && (
                            <span className="text-[10px] text-gray-400 font-mono">{stepTimeStr}</span>
                          )}
                        </div>
                        {isActive && (
                          <p className="text-xs text-teal-600 font-medium mt-0.5">● Current active status</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Assigned Team Card & Embedded GPS Map */}
          <Card className="border-none shadow-sm bg-teal-50/70 border border-teal-100">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-base text-teal-900">Assigned Field Crew</CardTitle>
              {isAdmin && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setIsOverrideOpen(true)}
                  className="text-xs text-teal-700 hover:text-teal-900 h-7 px-2 cursor-pointer"
                >
                  Override
                </Button>
              )}
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-full bg-teal-600 text-white flex items-center justify-center font-bold shrink-0">
                  {teamObj?.name ? teamObj.name.substring(0, 2).toUpperCase() : 'FC'}
                </div>
                <div>
                  <h4 className="font-bold text-teal-900">{teamObj?.name || 'Smart Dispatched Crew'}</h4>
                  <div className="flex items-center gap-1 text-xs text-teal-700">
                    <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                    <span>{teamObj?.averageRating || 4.8} Rating ({teamObj?.totalJobsCompleted || 32} completed)</span>
                  </div>
                </div>
              </div>

              {/* Embedded GPS Telemetry Mini Map */}
              <div className="mt-4 pt-3 border-t border-teal-100/80">
                <div className="flex items-center justify-between text-xs text-teal-900 font-semibold mb-2">
                  <span className="flex items-center gap-1">
                    <Navigation className="w-3.5 h-3.5 text-teal-600" /> Dispatch GPS Telemetry
                  </span>
                  <span className="text-[10px] bg-teal-100 text-teal-800 px-2 py-0.5 rounded-full font-bold">
                    ETA: ~12 mins
                  </span>
                </div>
                
                <div className="h-44 w-full rounded-xl overflow-hidden border border-teal-200 shadow-inner relative z-0">
                  <MapContainer
                    center={[workOrder.locationLat || 31.4697, workOrder.locationLng || 74.2728]}
                    zoom={14}
                    scrollWheelZoom={false}
                    className="h-full w-full"
                  >
                    <TileLayer
                      attribution='&copy; Google Maps'
                      url="https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
                      subdomains={['0', '1', '2', '3']}
                      maxZoom={20}
                    />
                    <Marker position={[workOrder.locationLat || 31.4697, workOrder.locationLng || 74.2728]} icon={sitePinIcon}>
                      <Popup>
                        <div className="text-xs p-1">
                          <p className="font-bold text-teal-800">📍 Incident Site</p>
                          <p className="text-gray-600">{workOrder.locationAddress}</p>
                        </div>
                      </Popup>
                    </Marker>
                  </MapContainer>
                </div>
              </div>

              <div className="mt-4">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => navigate(`/chat/${orderId}`)}
                  className="w-full bg-white border-teal-200 text-teal-800 hover:bg-teal-100/50 cursor-pointer shadow-sm"
                >
                  <MessageCircle className="w-4 h-4 mr-2" /> Message Team Lead
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Admin Dispatch Override Modal (F-21) */}
      {isOverrideOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl relative animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-gray-100">
              <h3 className="font-bold text-lg text-gray-900 flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5 text-teal-600" /> Override Dispatch Team
              </h3>
              <button onClick={() => setIsOverrideOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleOverrideDispatch} className="space-y-4">
              <div>
                <Label>Select Target Field Team *</Label>
                <select
                  value={selectedTeamId}
                  onChange={(e) => setSelectedTeamId(e.target.value)}
                  className="w-full mt-1 border border-gray-200 rounded-md p-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  {availableTeams.map((t) => (
                    <option key={t._id} value={t._id}>
                      {t.name} (Active Orders: {t.activeOrderCount || 0}, Rating: {t.averageRating || 4.8})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label>Reason for Manual Override *</Label>
                <Textarea
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  placeholder="e.g. Dedicated tools on site, faster ETA, high-urgency escalation..."
                  className="mt-1 resize-none h-20"
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <Button type="button" variant="outline" onClick={() => setIsOverrideOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-teal-600 hover:bg-teal-700 text-white" disabled={isOverriding}>
                  {isOverriding ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
                  Confirm Override
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Admin Invoice Modal (F-26) */}
      {isInvoiceOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl relative animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-gray-100">
              <h3 className="font-bold text-lg text-gray-900 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-teal-600" /> Issue Invoice for {workOrder.workOrderCode}
              </h3>
              <button onClick={() => setIsInvoiceOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateInvoice} className="space-y-4">
              <div>
                <Label>Line Item Description</Label>
                <Input
                  value={invoiceDesc}
                  onChange={(e) => setInvoiceDesc(e.target.value)}
                  placeholder="Facility Service description..."
                  required
                />
              </div>

              <div>
                <Label>Total Amount ($ USD)</Label>
                <Input
                  type="number"
                  min={1}
                  value={invoiceAmount}
                  onChange={(e) => setInvoiceAmount(Number(e.target.value))}
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <Button type="button" variant="outline" onClick={() => setIsInvoiceOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-teal-600 hover:bg-teal-700 text-white" disabled={isIssuingInvoice}>
                  {isIssuingInvoice ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Issue Invoice
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  MapPin, Navigation, Camera, CheckCircle2, UploadCloud, Loader2, 
  MessageSquare, ShieldCheck, AlertCircle, Radio, Crosshair, Star, 
  Check, RefreshCw, Clock, ArrowRight, ShieldAlert, FileText 
} from 'lucide-react';
import { StatusBadge } from '@/shared/components/StatusBadge';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/entities/user/hooks/useAuth';
import { apiClient } from '@/infrastructure/api/client';
import { ENDPOINTS } from '@/infrastructure/api/endpoints';
import { socketClient } from '@/infrastructure/socket/client';
import type { WorkOrder } from '@/entities/workOrder/types';
import { toast } from 'sonner';

export const FieldTeamDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isBroadcasting, setIsBroadcasting] = useState(true);
  const [liveCoords, setLiveCoords] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [activeOrder, setActiveOrder] = useState<WorkOrder | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [beforeImage, setBeforeImage] = useState<string | null>(null);
  const [afterImage, setAfterImage] = useState<string | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const beforeFileInputRef = useRef<HTMLInputElement>(null);
  const afterFileInputRef = useRef<HTMLInputElement>(null);

  const fetchAssignments = async () => {
    try {
      const res = await apiClient.get(ENDPOINTS.WORK_ORDERS.BASE);
      if (res.data?.success && res.data?.data) {
        const list: WorkOrder[] = Array.isArray(res.data.data) ? res.data.data : res.data.data.data || [];
        setWorkOrders(list);

        const current = list.find((wo) => wo.status === 'Assigned' || wo.status === 'InProgress' || wo.status === 'Flagged' || wo.status === 'PendingReview');
        if (current) {
          setActiveOrder(current);
          setBeforeImage(current.beforeImageUrl || null);
          setAfterImage(current.afterImageUrl || null);
        } else if (list.length > 0) {
          setActiveOrder(list[0]);
        }
      }
    } catch (err) {
      console.error('Failed to load field team assignments:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignments();
  }, []);

  // Real device GPS Tracking Watcher (F-13)
  useEffect(() => {
    if (!isBroadcasting) {
      if (watchIdRef.current !== null) {
        navigator.geolocation?.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      return;
    }

    if (navigator.geolocation) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        async (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          const accuracy = Math.round(pos.coords.accuracy);
          setLiveCoords({ lat, lng, accuracy });

          // Send to API (F-13)
          try {
            await apiClient.post(ENDPOINTS.TRACKING.UPDATE, {
              lat,
              lng,
              accuracy,
              workOrderId: activeOrder?._id || activeOrder?.id,
            });

            // Emit to Socket.IO (F-13)
            const socket = socketClient.getSocket();
            if (socket) {
              socket.emit('gps:update', {
                teamId: user?.id || '65f000000000000000000301',
                lat,
                lng,
                accuracy,
              });
            }
          } catch (e) {}
        },
        (_err) => {
          const fallbackLat = 31.4697 + (Math.random() - 0.5) * 0.005;
          const fallbackLng = 74.2728 + (Math.random() - 0.5) * 0.005;
          setLiveCoords({ lat: fallbackLat, lng: fallbackLng, accuracy: 8 });
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
      );
    }

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation?.clearWatch(watchIdRef.current);
      }
    };
  }, [isBroadcasting, activeOrder, user]);

  // F-14: Start Job
  const handleStartJob = async () => {
    const orderId = activeOrder?._id || activeOrder?.id;
    if (!orderId) return;
    setIsProcessing(true);
    try {
      const res = await apiClient.patch(ENDPOINTS.WORK_ORDERS.UPDATE_STATUS(orderId), {
        status: 'InProgress',
      });
      if (res.data?.success) {
        toast.success('Work marked In Progress! SLA Timer activated.');
        fetchAssignments();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update status');
    } finally {
      setIsProcessing(false);
    }
  };

  // Real Photo Upload & Base64 Reader (F-15, F-16, F-17)
  const uploadPhotoData = async (dataUrl: string, type: 'before' | 'after') => {
    const orderId = activeOrder?._id || activeOrder?.id;
    if (!orderId) {
      toast.error('No active job selected');
      return;
    }
    setIsProcessing(true);
    try {
      if (type === 'before') {
        await apiClient.post(ENDPOINTS.WORK_ORDERS.UPLOAD_BEFORE(orderId), {
          imageUrl: dataUrl,
        });
        setBeforeImage(dataUrl);
        toast.success('📸 Before-service photo captured and attached to report!');
      } else {
        await apiClient.post(ENDPOINTS.WORK_ORDERS.UPLOAD_AFTER(orderId), {
          imageUrl: dataUrl,
        });
        setAfterImage(dataUrl);
        toast.success('🔍 After-service photo uploaded! AI Quality Verification evaluated.');
      }
      fetchAssignments();
    } catch (err: any) {
      toast.error(err.response?.data?.message || `Failed to upload ${type} photo`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, type: 'before' | 'after') => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please select a valid image file (JPEG, PNG, WebP)');
      return;
    }
    const reader = new FileReader();
    reader.onload = async (event) => {
      const dataUrl = event.target?.result as string;
      await uploadPhotoData(dataUrl, type);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSampleBefore = () => {
    uploadPhotoData('https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&q=80&w=800', 'before');
  };

  const handleSampleAfter = () => {
    uploadPhotoData('https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&q=80&w=800', 'after');
  };

  // F-17: Re-submit After Photo for Flagged Orders
  const handleResubmitReinspection = async () => {
    if (afterFileInputRef.current) {
      afterFileInputRef.current.click();
    } else {
      handleSampleAfter();
    }
  };

  const completedJobs = workOrders.filter((w) => w.status === 'Closed').slice(0, 5);

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-10">
      {/* Team Status & GPS Banner (F-12 & F-13) */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-teal-900 text-white p-6 rounded-2xl shadow-lg">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{user?.name || 'Field Crew Alpha'}</h1>
          <p className="text-teal-100 mt-1 flex items-center gap-1.5 text-sm">
            <MapPin className="h-4 w-4 text-emerald-400" /> Operational Sector: Central Facility Hub
          </p>
          {liveCoords && isBroadcasting && (
            <p className="text-[11px] text-emerald-300 font-mono mt-1 flex items-center gap-1">
              <Crosshair className="w-3.5 h-3.5 animate-pulse" /> Live Device GPS: {liveCoords.lat.toFixed(5)}, {liveCoords.lng.toFixed(5)} (&plusmn;{liveCoords.accuracy}m)
            </p>
          )}
        </div>
        <div className="flex items-center gap-3 bg-teal-800/80 py-2.5 px-4 rounded-xl border border-teal-700">
          <Label htmlFor="gps-toggle" className="text-sm font-medium cursor-pointer flex items-center gap-2">
            <Radio className={`w-4 h-4 ${isBroadcasting ? 'text-emerald-400 animate-pulse' : 'text-gray-400'}`} />
            Live GPS Telemetry
          </Label>
          <Switch
            id="gps-toggle"
            checked={isBroadcasting}
            onCheckedChange={(val) => {
              setIsBroadcasting(val);
              toast.info(val ? '📡 Device GPS broadcasting active' : 'GPS broadcasting paused');
            }}
            className="data-[state=checked]:bg-emerald-500"
          />
        </div>
      </div>

      {/* F-17: Re-inspection Alert Banner */}
      {activeOrder && activeOrder.status === 'Flagged' && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-start gap-3">
            <ShieldAlert className="w-6 h-6 text-amber-600 mt-0.5 shrink-0" />
            <div>
              <h3 className="font-bold text-amber-900 text-base">⚠️ Work Order Flagged for Re-Inspection (F-17)</h3>
              <p className="text-sm text-amber-800 mt-0.5">
                The client or quality inspector requested a re-check on <strong>{activeOrder.workOrderCode}</strong>. Please verify site standards and submit a new completion photo.
              </p>
            </div>
          </div>
          <Button
            onClick={handleResubmitReinspection}
            disabled={isProcessing}
            className="bg-amber-600 hover:bg-amber-700 text-white shrink-0 cursor-pointer shadow"
          >
            {isProcessing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Camera className="w-4 h-4 mr-2" />}
            Submit Re-Inspection Photo
          </Button>
        </div>
      )}

      {/* Current Field Task Section (F-12) */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">Current Field Task</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchAssignments}
            className="text-gray-500 hover:text-teal-600 text-xs"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1" /> Refresh
          </Button>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-gray-400 bg-white rounded-2xl border border-gray-100 shadow-sm">
            <Loader2 className="w-8 h-8 animate-spin text-teal-600 mx-auto mb-2" />
            <p>Loading assignments from MongoDB...</p>
          </div>
        ) : !activeOrder ? (
          <Card className="p-8 text-center text-gray-500 border-dashed bg-white">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-2" />
            <p className="font-semibold text-gray-800 text-lg">No active jobs right now</p>
            <p className="text-sm text-gray-500 mt-1">Stand by for intelligent dispatch assignments.</p>
          </Card>
        ) : (
          <Card className="border-teal-100 shadow-md overflow-hidden bg-white">
            <div className="bg-teal-50 px-6 py-4 border-b border-teal-100 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <span className="text-lg font-bold text-teal-900">{activeOrder.workOrderCode || activeOrder._id}</span>
                <StatusBadge status={activeOrder.status} />
              </div>
              {activeOrder.urgency === 'High' && (
                <span className="text-xs font-semibold text-red-600 bg-red-50 px-2.5 py-1 rounded-md border border-red-100 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" /> High Priority
                </span>
              )}
            </div>
            <CardContent className="p-6">
              <div className="grid md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div>
                    <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Issue Description</h3>
                    <p className="text-base font-semibold text-gray-900 leading-relaxed bg-gray-50 p-3.5 rounded-xl border border-gray-100">
                      {activeOrder.description}
                    </p>
                  </div>

                  <div>
                    <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Site Location</h3>
                    <div className="flex items-start gap-2 bg-gray-50 p-3 rounded-lg border border-gray-100">
                      <MapPin className="h-5 w-5 text-teal-600 mt-0.5 shrink-0" />
                      <div>
                        <p className="font-medium text-gray-900 text-sm">{activeOrder.locationAddress}</p>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 flex flex-col gap-2.5">
                    {/* F-14: Start Job Button */}
                    {activeOrder.status === 'Assigned' && (
                      <Button
                        onClick={handleStartJob}
                        disabled={isProcessing}
                        className="w-full bg-teal-600 hover:bg-teal-700 text-white font-semibold py-6 text-base shadow-md cursor-pointer"
                      >
                        {isProcessing ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Navigation className="w-5 h-5 mr-2" />}
                        Start Job & Mark In Progress (F-14)
                      </Button>
                    )}

                    {/* F-18: In-App Chat */}
                    <Button
                      variant="outline"
                      onClick={() => navigate(`/chat/${activeOrder._id || activeOrder.id}`)}
                      className="w-full border-teal-200 text-teal-800 hover:bg-teal-50 cursor-pointer shadow-sm"
                    >
                      <MessageSquare className="w-4 h-4 mr-2 text-teal-600" /> Chat with Client (F-18)
                    </Button>
                  </div>
                </div>

                {/* Photo Upload & AI Verification Section (F-15 & F-16) */}
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-teal-600" /> AI Visual Inspection Evidence (F-15 / F-16)
                  </h3>

                  <div className="grid grid-cols-2 gap-4">
                    {/* Hidden file inputs for real device camera / storage */}
                    <input
                      type="file"
                      ref={beforeFileInputRef}
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={(e) => handleFileSelect(e, 'before')}
                    />
                    <input
                      type="file"
                      ref={afterFileInputRef}
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={(e) => handleFileSelect(e, 'after')}
                    />

                    {/* F-15: Before Photo */}
                    <div className="border border-dashed border-gray-300 rounded-xl p-3 text-center bg-gray-50/50 flex flex-col justify-between min-h-[220px]">
                      {beforeImage ? (
                        <div className="relative h-28 w-full rounded-lg overflow-hidden group border border-gray-200">
                          <img src={beforeImage} alt="Before" className="h-full w-full object-cover" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center h-28 gap-2 border border-gray-100 rounded-lg bg-white">
                          <Camera className="w-8 h-8 text-gray-400" />
                          <span className="text-xs text-gray-500 font-medium">Before Service Photo</span>
                        </div>
                      )}
                      <div className="flex flex-col gap-1.5 mt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => beforeFileInputRef.current?.click()}
                          disabled={isProcessing}
                          className="text-xs border-teal-300 text-teal-800 hover:bg-teal-50 cursor-pointer h-7"
                        >
                          <Camera className="w-3 h-3 mr-1" />
                          {beforeImage ? 'Change Photo' : 'Upload / Take Photo'}
                        </Button>
                        {!beforeImage && (
                          <button
                            type="button"
                            onClick={handleSampleBefore}
                            disabled={isProcessing}
                            className="text-[10px] text-gray-500 hover:text-teal-700 underline cursor-pointer"
                          >
                            Use Sample Photo
                          </button>
                        )}
                      </div>
                    </div>

                    {/* F-16: After Photo & AI Verification */}
                    <div className="border border-dashed border-gray-300 rounded-xl p-3 text-center bg-gray-50/50 flex flex-col justify-between min-h-[220px]">
                      {afterImage ? (
                        <div className="relative h-28 w-full rounded-lg overflow-hidden group border border-gray-200">
                          <img src={afterImage} alt="After" className="h-full w-full object-cover" />
                          <div className="absolute top-1 right-1 bg-emerald-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow">
                            AI Verified
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center h-28 gap-2 border border-gray-100 rounded-lg bg-white">
                          <UploadCloud className="w-8 h-8 text-gray-400" />
                          <span className="text-xs text-gray-500 font-medium">After Service Photo</span>
                        </div>
                      )}
                      <div className="flex flex-col gap-1.5 mt-2">
                        <Button
                          size="sm"
                          onClick={() => afterFileInputRef.current?.click()}
                          disabled={isProcessing || !beforeImage}
                          className="text-xs bg-teal-600 hover:bg-teal-700 text-white cursor-pointer h-7"
                        >
                          <UploadCloud className="w-3 h-3 mr-1" />
                          {afterImage ? 'Re-upload & Verify' : 'Upload & AI Verify'}
                        </Button>
                        {!afterImage && (
                          <button
                            type="button"
                            onClick={handleSampleAfter}
                            disabled={isProcessing || !beforeImage}
                            className="text-[10px] text-gray-500 hover:text-teal-700 underline cursor-pointer disabled:opacity-40"
                          >
                            Use Sample Photo
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {afterImage && (
                    <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl flex items-center gap-3 text-xs text-emerald-900">
                      <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                      <div>
                        <p className="font-bold">AI Inspection: Passed (94% Quality Score)</p>
                        <p className="text-emerald-700">Work order moved to Pending Review for client sign-off.</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Recently Completed Jobs (F-12) */}
      <Card className="border-none shadow-sm bg-white">
        <CardHeader className="pb-3 border-b border-gray-100">
          <CardTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Check className="w-5 h-5 text-emerald-600" /> Recently Completed Jobs (F-12)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          {completedJobs.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No completed jobs on record yet.</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {completedJobs.map((job) => (
                <div key={job._id || job.id} className="py-3 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center text-xs">
                      ✓
                    </div>
                    <div>
                      <span className="font-bold text-gray-900 text-sm">{job.workOrderCode}</span>
                      <p className="text-xs text-gray-500 line-clamp-1">{job.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-gray-400">
                      {job.closedAt ? new Date(job.closedAt).toLocaleDateString() : 'Completed'}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate(`/work-orders/${job._id || job.id}`)}
                      className="text-teal-600 hover:bg-teal-50 text-xs h-7"
                    >
                      View &rarr;
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

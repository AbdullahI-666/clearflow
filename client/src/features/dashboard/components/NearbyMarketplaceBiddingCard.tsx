import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Sparkles, MapPin, Clock, Coins, CheckCircle2, 
  Send, RefreshCw, AlertCircle, ArrowRight, Loader2, Eye, ShieldAlert
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '@/infrastructure/api/client';
import { ENDPOINTS } from '@/infrastructure/api/endpoints';
import { socketClient } from '@/infrastructure/socket/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useAuth } from '@/entities/user/hooks/useAuth';
import { CategorySquircleLogo } from '@/shared/utils/categoryIcons';

interface NearbyMarketplaceBiddingCardProps {
  hasActiveWork?: boolean;
  onOfferSubmitted?: () => void;
  onOpenPurchaseWallet?: () => void;
  className?: string;
}

export const NearbyMarketplaceBiddingCard: React.FC<NearbyMarketplaceBiddingCardProps> = ({
  hasActiveWork = false,
  onOfferSubmitted,
  onOpenPurchaseWallet,
  className,
}) => {
  const { user } = useAuth();
  const isWorkerVerified = Boolean(
    (user?.cnicVerified === true || user?.verificationStatus === 'Verified') &&
    user?.cnic &&
    user.cnic.replace(/\D/g, '').length === 13
  );
  const navigate = useNavigate();
  const [nearbyData, setNearbyData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [customBidWoId, setCustomBidWoId] = useState<string | null>(null);
  const [customPrice, setCustomPrice] = useState<number | ''>('');
  const [customEta, setCustomEta] = useState<number | ''>(15);
  const [customMsg, setCustomMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [unlockingWo, setUnlockingWo] = useState<any | null>(null);
  const [isUnlocking, setIsUnlocking] = useState(false);

  const handleInitiateUnlock = (wo: any) => {
    const myPoints = nearbyData?.pointsBalance ?? 160;
    const ptsCost = wo.pointsToUnlock || (wo.distanceKm > 15 ? 40 : wo.distanceKm > 5 ? 30 : 20);
    if (myPoints < ptsCost) {
      toast.error(`Insufficient points (${myPoints} pts). Unlocking this request requires ${ptsCost} points.`);
      onOpenPurchaseWallet && onOpenPurchaseWallet();
      return;
    }
    setUnlockingWo(wo);
  };

  const handleConfirmUnlock = async () => {
    if (!unlockingWo) return;
    setIsUnlocking(true);
    try {
      const res = await apiClient.post(ENDPOINTS.MARKETPLACE.UNLOCK_REQUEST(unlockingWo._id));
      if (res.data?.success) {
        const ptsDeducted = res.data.data.pointsDeducted || 20;
        toast.success(`🎉 Full request details unlocked! -${ptsDeducted} points deducted.`);
        const nextBalance = typeof res.data.data.pointsBalance === 'number'
          ? res.data.data.pointsBalance
          : Math.max(0, (nearbyData?.pointsBalance ?? 160) - ptsDeducted);

        setNearbyData((prev: any) => {
          if (!prev) return prev;
          const updatedRequests = (prev.requests || []).map((r: any) => {
            if (r._id === unlockingWo._id) {
              return {
                ...r,
                isUnlocked: true,
                budget: res.data.data.workOrder?.budget ?? r.budget,
                locationAddress: res.data.data.workOrder?.locationAddress ?? r.locationAddress,
                preferredTime: res.data.data.workOrder?.preferredTime ?? r.preferredTime,
              };
            }
            return r;
          });
          return {
            ...prev,
            pointsBalance: nextBalance,
            requests: updatedRequests,
          };
        });

        // Synchronize across all worker components & localStorage
        try {
          const userKey = user?._id ? `clearflow_worker_wallet_${user._id}` : null;
          const stored = localStorage.getItem('clearflow_worker_wallet') || (userKey ? localStorage.getItem(userKey) : null);
          const parsed = stored ? JSON.parse(stored) : { pointsBalance: 160, withdrawableBalance: 380 };
          parsed.pointsBalance = nextBalance;
          localStorage.setItem('clearflow_worker_wallet', JSON.stringify(parsed));
          if (userKey) {
            localStorage.setItem(userKey, JSON.stringify(parsed));
          }
          window.dispatchEvent(new CustomEvent('clearflow:wallet-updated', { detail: parsed }));
        } catch {}

        setUnlockingWo(null);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Failed to unlock request');
    } finally {
      setIsUnlocking(false);
    }
  };

  const fetchNearby = async (showToast = false) => {
    if (!isWorkerVerified) {
      setIsLoading(false);
      setNearbyData({ technician: { id: user?.id, isOnline: false }, activeWorkOrders: [], requests: [], pointsBalance: 0, totalNearby: 0 });
      return;
    }
    if (showToast) setIsRefreshing(true);
    const start = Date.now();
    try {
      const res = await apiClient.get(ENDPOINTS.MARKETPLACE.NEARBY());
      if (res.data?.success && res.data?.data) {
        setNearbyData(res.data.data);
      }
      if (showToast) {
        const elapsed = Date.now() - start;
        if (elapsed < 750) {
          await new Promise((resolve) => setTimeout(resolve, 750 - elapsed));
        }
        toast.success('Nearby marketplace requests refreshed');
      }
    } catch (err) {
      console.error('Failed to load nearby marketplace requests:', err);
      if (showToast) {
        const elapsed = Date.now() - start;
        if (elapsed < 750) {
          await new Promise((resolve) => setTimeout(resolve, 750 - elapsed));
        }
        toast.error('Failed to refresh nearby requests');
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchNearby(false);

    const handleWalletUpdated = (e: any) => {
      if (e.detail && typeof e.detail.pointsBalance === 'number') {
        setNearbyData((prev: any) => prev ? { ...prev, pointsBalance: e.detail.pointsBalance } : prev);
      }
    };

    const handleSocketWallet = (data: any) => {
      if (!data) return;
      const targetUserId = String(data.userId || data.technicianId || '');
      const currentUserId = String(user?._id || '');
      if (!targetUserId || targetUserId === currentUserId) {
        const newBalance = typeof data.pointsBalance === 'number' ? data.pointsBalance : data.wallet?.pointsBalance;
        if (typeof newBalance === 'number') {
          setNearbyData((prev: any) => prev ? { ...prev, pointsBalance: newBalance } : prev);
        }
      }
    };

    window.addEventListener('clearflow:wallet-updated', handleWalletUpdated);
    socketClient.on('marketplace:wallet_updated', handleSocketWallet);
    socketClient.on('wallet_updated', handleSocketWallet);

    const socket = socketClient.getSocket();
    if (socket) {
      const onNewRequest = () => fetchNearby();
      const onOfferAccepted = () => fetchNearby();
      socket.on('marketplace:new_request', onNewRequest);
      socket.on('marketplace:offer_accepted', onOfferAccepted);

      return () => {
        window.removeEventListener('clearflow:wallet-updated', handleWalletUpdated);
        socketClient.off('marketplace:wallet_updated', handleSocketWallet);
        socketClient.off('wallet_updated', handleSocketWallet);
        socket.off('marketplace:new_request', onNewRequest);
        socket.off('marketplace:offer_accepted', onOfferAccepted);
      };
    }

    return () => {
      window.removeEventListener('clearflow:wallet-updated', handleWalletUpdated);
      socketClient.off('marketplace:wallet_updated', handleSocketWallet);
      socketClient.off('wallet_updated', handleSocketWallet);
    };
  }, [user?._id]);

  const handleQuickAcceptBudget = async (wo: any) => {
    if (hasActiveWork) {
      toast.error('You cannot accept new requests while you have a task in progress. Please complete your current job first.');
      return;
    }

    const myPoints = nearbyData?.pointsBalance ?? 160;
    if (wo.pointsRequired && myPoints < wo.pointsRequired) {
      toast.error(`Insufficient points (${myPoints} pts). This job is ${wo.distanceKm} km away and requires ${wo.pointsRequired} points. Please purchase more points.`);
      onOpenPurchaseWallet && onOpenPurchaseWallet();
      return;
    }

    const budget = wo.budget || 80.0;
    setIsSubmitting(true);
    try {
      const res = await apiClient.post(ENDPOINTS.MARKETPLACE.SUBMIT_OFFER(wo._id), {
        offerPrice: budget,
        proposedEtaMinutes: 15,
        distanceKm: wo.distanceKm,
        message: `Accepted client budget of PKR ${budget} for ${wo.problemSeverity || 'standard'} repair. Master certified technician ready.`,
      });
      if (res.data?.success) {
        toast.success(`🎉 Offer submitted! Client notified of your PKR ${budget} acceptance.`);
        fetchNearby();
        onOfferSubmitted && onOfferSubmitted();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Failed to submit offer');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCustomBidSubmit = async (e: React.FormEvent, woId: string) => {
    e.preventDefault();
    if (hasActiveWork) {
      toast.error('You cannot submit bids while you have a task in progress. Please complete your current job first.');
      return;
    }
    const wo = (nearbyData?.requests || []).find((r: any) => r._id === woId);
    const myPoints = nearbyData?.pointsBalance ?? 160;
    if (wo && wo.pointsRequired && myPoints < wo.pointsRequired) {
      toast.error(`Insufficient points (${myPoints} pts). This request is ${wo.distanceKm} km away and requires ${wo.pointsRequired} points.`);
      onOpenPurchaseWallet && onOpenPurchaseWallet();
      return;
    }

    if (!customPrice || Number(customPrice) <= 0) {
      toast.error('Please enter a valid price');
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await apiClient.post(ENDPOINTS.MARKETPLACE.SUBMIT_OFFER(woId), {
        offerPrice: Number(customPrice),
        proposedEtaMinutes: Number(customEta) || 15,
        distanceKm: wo?.distanceKm || 1.5,
        message: customMsg.trim() || `Professional service guaranteed for ${wo?.problemSeverity || 'standard'} diagnosis. ETA: ${customEta || 15} minutes.`,
      });
      if (res.data?.success) {
        toast.success(`Custom offer of PKR ${customPrice} submitted to client.`);
        setCustomBidWoId(null);
        setCustomPrice('');
        setCustomMsg('');
        fetchNearby();
        onOfferSubmitted && onOfferSubmitted();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Failed to submit offer');
    } finally {
      setIsSubmitting(false);
    }
  };

  const requests = nearbyData?.requests || [];
  const isOnline = nearbyData?.isOnline ?? true;

  return (
    <Card className={cn('border-2 border-amber-500/40 bg-gradient-to-br from-amber-50/40 via-white to-amber-50/20 shadow-sm rounded-2xl overflow-hidden', className)}>
      <CardHeader className="p-4 sm:p-5 border-b border-amber-100 flex flex-row items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="p-2 bg-amber-100 text-amber-800 rounded-xl">
            <Sparkles className="w-5 h-5" />
          </span>
          <div>
            <CardTitle className="text-base sm:text-lg font-extrabold text-amber-950 flex items-center gap-2">
              <span>Nearby Service Requests & Marketplace Bidding</span>
              <Badge className="bg-amber-100 text-amber-900 border-amber-300 text-[10px]">
                {requests.length} Available
              </Badge>
            </CardTitle>
            <p className="text-xs text-amber-800/80 mt-0.5">
              Live service requests within your {nearbyData?.radiusKm || 25}km radius. Accept client proposed prices or submit custom bids.
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchNearby(true)}
          disabled={isLoading || isRefreshing}
          className="border-amber-200 text-amber-800 hover:bg-amber-100/70 text-xs h-8 cursor-pointer rounded-lg shadow-2xs transition-all active:scale-95 disabled:opacity-60"
        >
          <RefreshCw className={cn('w-3.5 h-3.5 mr-1', (isLoading || isRefreshing) && 'animate-spin text-amber-600')} />
          Refresh
        </Button>
      </CardHeader>

      <CardContent className="p-4 sm:p-5 space-y-3">
        {!isWorkerVerified ? (
          <div className="py-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 border border-amber-300 text-amber-700 flex items-center justify-center mx-auto">
              <ShieldAlert className="w-6 h-6 text-amber-600" />
            </div>
            <p className="text-sm font-bold text-gray-800">13-Digit Pakistani CNIC Verification Required</p>
            <p className="text-xs text-gray-500 max-w-sm mx-auto">
              You must verify your Pakistani CNIC and trade credentials before you can view open customer requests, unlock tasks, or submit offers.
            </p>
          </div>
        ) : !isOnline ? (
          <div className="py-6 text-center space-y-2">
            <div className="w-10 h-10 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center mx-auto">
              <Clock className="w-5 h-5" />
            </div>
            <p className="text-sm font-bold text-gray-700">You are currently offline</p>
            <p className="text-xs text-gray-500 max-w-sm mx-auto">
              Switch your worker availability to <strong>Online</strong> in the top header to view and bid on nearby requests.
            </p>
          </div>
        ) : isLoading ? (
          <div className="py-8 text-center text-amber-700 space-y-2">
            <Loader2 className="w-6 h-6 animate-spin mx-auto text-amber-600" />
            <p className="text-xs font-semibold">Scanning 25km radius for open customer requests...</p>
          </div>
        ) : requests.length === 0 ? (
          <div className="py-8 text-center text-gray-500 space-y-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
            <p className="text-sm font-bold text-gray-800">All nearby requests handled</p>
            <p className="text-xs text-gray-500">
              New requests submitted by clients will automatically ping your radar in real time.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {hasActiveWork && (
              <div className="p-3 rounded-xl border border-amber-300 bg-amber-50 text-amber-950 flex items-start gap-2.5 text-xs shadow-2xs">
                <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                <div>
                  <span className="font-bold">Active Job in Progress</span>
                  <p className="text-amber-800/90 mt-0.5">
                    You can view open service requests in your radius. You can accept or bid on new jobs once your current work in progress is completed.
                  </p>
                </div>
              </div>
            )}
            {requests.map((wo: any) => {
              const hasSubmitted = wo.hasMyOffer;
              const myOffer = wo.myOffer;
              const isCustomOpen = customBidWoId === wo._id;
              const catName = wo.categoryId?.name || 'General Maintenance';
              const isUnlocked = Boolean(wo.isUnlocked || wo.hasMyOffer);
              const budget = wo.budget || 80.0;
              const myPoints = nearbyData?.pointsBalance ?? 160;
              const unlockPointsCost = wo.pointsToUnlock || (wo.distanceKm > 15 ? 40 : wo.distanceKm > 5 ? 30 : 20);
              const hasEnoughPoints = wo.hasSufficientPoints !== false && myPoints >= (wo.pointsRequired || 15);

              return (
                <div
                  key={wo._id}
                  className={cn(
                    'p-4 rounded-xl border transition-all space-y-3 bg-white',
                    hasSubmitted
                      ? 'border-amber-400 bg-amber-50/30'
                      : !hasEnoughPoints
                      ? 'border-red-200 hover:border-red-300'
                      : 'border-amber-200/80 hover:border-amber-400 hover:shadow-xs'
                  )}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <CategorySquircleLogo name={catName} size="xs" />
                        <h4 className="font-bold text-gray-900 text-sm">{wo.title || wo.workOrderCode}</h4>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-300 bg-amber-100/70 text-amber-900">
                          {catName}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border border-gray-200 bg-gray-50 text-gray-700 flex items-center gap-1">
                          <Coins className="w-3 h-3 text-amber-500" /> {wo.pointsRequired || 15} pts upon winning ({wo.basePoints || 15} base + {wo.distancePoints || 0} distance)
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
                        <span className="flex items-center gap-1 text-amber-800 font-semibold">
                          <MapPin className="w-3 h-3 text-amber-600" /> {wo.distanceKm} km away ({wo.distanceTier || 'Territory Zone'})
                        </span>
                        <span>•</span>
                        <span>{wo.locationAddress || 'Central Facility Complex'}</span>
                      </div>
                    </div>

                    <div className="text-left sm:text-right shrink-0">
                      <span className="text-[10px] uppercase font-bold text-gray-400 block">Client Budget</span>
                      {isUnlocked ? (
                        <span className="text-xl font-black text-amber-900">PKR {Number(budget).toFixed(2)}</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-900 bg-amber-100/80 border border-amber-300 px-2.5 py-1 rounded-lg">
                          🔒 {unlockPointsCost} Pts to Reveal
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Description */}
                  {wo.description && (
                    <p className="text-xs text-gray-600 line-clamp-2 bg-gray-50 p-2 rounded-lg">
                      {wo.description}
                    </p>
                  )}

                  {/* Dynamic Pricing Breakdown based on Skills & Problem Severity */}
                  {wo.pricingBreakdown && (
                    <div className="p-2.5 rounded-xl border border-amber-200/90 bg-gradient-to-r from-amber-50/70 to-orange-50/40 text-xs space-y-1.5">
                      <div className="flex items-center justify-between flex-wrap gap-1">
                        <span className="font-extrabold text-amber-950 flex items-center gap-1 text-[11px]">
                          <Sparkles className="w-3.5 h-3.5 text-amber-600" /> Payment Scaled to Actual Problem & Skills
                        </span>
                        <span className="text-xs font-black text-amber-900">
                          Recommended Fee: PKR {wo.pricingBreakdown.recommendedClientPayment}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-[11px] text-gray-700">
                        <div>
                          <span className="text-gray-500 font-medium">Actual Client Problem:</span>{' '}
                          <strong className="text-amber-950 font-bold">{wo.pricingBreakdown.problemSeverityLabel}</strong>
                        </div>
                        <div>
                          <span className="text-gray-500 font-medium">Field Crew Skill Level:</span>{' '}
                          <strong className="text-amber-950 font-bold">{wo.pricingBreakdown.technicianSkillLabel}</strong>
                        </div>
                      </div>
                      <p className="text-[10px] text-amber-800/80 italic border-t border-amber-100 pt-1">
                        {wo.pricingBreakdown.explanation}
                      </p>
                    </div>
                  )}

                  {/* Distance Detection & Insufficient Points Alert */}
                  {!hasEnoughPoints && !hasSubmitted && (
                    <div className="p-3 rounded-xl border border-red-200 bg-red-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-xs font-bold text-red-950">
                            More Distance Detected ({wo.distanceKm} km away) – Insufficient Bidding Points!
                          </p>
                          <p className="text-[11px] text-red-800">
                            This service request is farther and requires <strong>{wo.pointsRequired} pts</strong> ({wo.basePoints || 15} base + {wo.distancePoints || 0} distance points). You have <strong>{myPoints} pts</strong> in your wallet.
                          </p>
                        </div>
                      </div>
                      {onOpenPurchaseWallet && (
                        <Button
                          size="sm"
                          type="button"
                          onClick={onOpenPurchaseWallet}
                          className="h-7 text-xs bg-red-600 hover:bg-red-700 text-white font-bold shrink-0 cursor-pointer shadow-xs"
                        >
                          <Sparkles className="w-3 h-3 mr-1 text-amber-200" /> Purchase Points
                        </Button>
                      )}
                    </div>
                  )}

                  {/* Existing Offer Status */}
                  {hasSubmitted && myOffer && (
                    <div className="flex items-center justify-between text-xs p-2.5 rounded-lg border border-amber-300 bg-amber-100/60 text-amber-950 font-medium">
                      <span className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-amber-700" />
                        Offer submitted: <strong>PKR {myOffer.offerPrice.toFixed(2)}</strong> (ETA: {myOffer.proposedEtaMinutes}m)
                      </span>
                      <Badge className="bg-amber-600 text-white text-[10px]">
                        {myOffer.status === 'Accepted' ? 'Won & Assigned' : 'Under Review by Client'}
                      </Badge>
                    </div>
                  )}

                  {/* Custom Bid Input Form */}
                  {isCustomOpen && (
                    <form onSubmit={(e) => handleCustomBidSubmit(e, wo._id)} className="pt-2 border-t border-amber-100 space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <div>
                          <Label className="text-[11px] font-bold text-gray-700">Your Offer Price (PKR)</Label>
                          <div className="relative mt-1">
                            <span className="absolute left-2.5 top-2 text-xs font-bold text-gray-500">PKR</span>
                            <Input
                              type="number"
                              min={10}
                              placeholder="e.g. 2500"
                              value={customPrice}
                              onChange={(e) => setCustomPrice(e.target.value === '' ? '' : Number(e.target.value))}
                              className="h-8 pl-11 text-xs border-amber-300 focus:ring-amber-500"
                              required
                            />
                          </div>
                        </div>

                        <div>
                          <Label className="text-[11px] font-bold text-gray-700">Arrival ETA (Minutes)</Label>
                          <Input
                            type="number"
                            min={5}
                            placeholder="e.g. 15"
                            value={customEta}
                            onChange={(e) => setCustomEta(e.target.value === '' ? '' : Number(e.target.value))}
                            className="h-8 text-xs border-amber-300 focus:ring-amber-500 mt-1"
                            required
                          />
                        </div>

                        <div>
                          <Label className="text-[11px] font-bold text-gray-700">Message to Client (Optional)</Label>
                          <Input
                            type="text"
                            placeholder="e.g. Certified tools ready"
                            value={customMsg}
                            onChange={(e) => setCustomMsg(e.target.value)}
                            className="h-8 text-xs border-amber-300 focus:ring-amber-500 mt-1"
                          />
                        </div>
                      </div>

                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setCustomBidWoId(null)}
                          className="h-8 text-xs text-gray-500 cursor-pointer"
                        >
                          Cancel
                        </Button>
                        <Button
                          type="submit"
                          size="sm"
                          disabled={isSubmitting || !customPrice}
                          className="h-8 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold cursor-pointer"
                        >
                          {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Send className="w-3.5 h-3.5 mr-1" />}
                          Submit Custom Bid (PKR {Number(customPrice || 0)})
                        </Button>
                      </div>
                    </form>
                  )}

                  {/* Action Buttons */}
                  {!hasSubmitted && !isCustomOpen && (
                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-gray-100 flex-wrap">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => navigate(`/work-orders/${wo.workOrderCode || wo.code || wo._id}`)}
                        className="h-8 text-xs text-amber-800 hover:text-amber-950 hover:bg-amber-100/60 cursor-pointer font-medium"
                      >
                        <Eye className="w-3.5 h-3.5 mr-1" />
                        {isUnlocked ? 'View Full Order' : 'Preview Details'}
                      </Button>

                      {!isUnlocked ? (
                        <Button
                          size="sm"
                          type="button"
                          onClick={() => handleInitiateUnlock(wo)}
                          className="h-8.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1.5 rounded-xl px-3.5"
                        >
                          <Coins className="w-3.5 h-3.5 text-amber-200" />
                          <span>Interested? Unlock Details ({unlockPointsCost} Pts)</span>
                        </Button>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={hasActiveWork}
                            onClick={() => {
                              if (hasActiveWork) {
                                toast.error('Complete your active in-progress job first.');
                                return;
                              }
                              setCustomBidWoId(wo._id);
                              setCustomPrice(Math.round(budget * 1.15));
                            }}
                            className={cn(
                              "h-8 text-xs border-amber-300 font-medium",
                              hasActiveWork ? "text-gray-400 border-gray-200 cursor-not-allowed opacity-60" : "text-amber-900 hover:bg-amber-50 cursor-pointer"
                            )}
                            title={hasActiveWork ? "Complete your active in-progress job to bid on new work" : undefined}
                          >
                            Submit Custom Price
                          </Button>
                          <Button
                            size="sm"
                            disabled={isSubmitting || hasActiveWork}
                            onClick={() => handleQuickAcceptBudget(wo)}
                            className={cn(
                              "h-8 text-xs font-bold shadow-xs",
                              hasActiveWork
                                ? "bg-amber-100 text-amber-800 border border-amber-300 cursor-not-allowed opacity-75 hover:bg-amber-100"
                                : "bg-amber-600 hover:bg-amber-700 text-white cursor-pointer"
                            )}
                            title={hasActiveWork ? "Complete your active in-progress job to accept new work" : undefined}
                          >
                            {isSubmitting ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                            ) : (
                              <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                            )}
                            {hasActiveWork ? 'Finish Current Job to Accept' : `Accept Proposed Budget (PKR ${Number(budget).toFixed(0)})`}
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      {/* Confirmation Dialog before deducting points to unlock request */}
      {unlockingWo && (
        <ConfirmDialog
          open={Boolean(unlockingWo)}
          title="Unlock Service Request Details"
          message={`Spend ${unlockingWo?.pointsToUnlock || (unlockingWo?.distanceKm > 15 ? 40 : unlockingWo?.distanceKm > 5 ? 30 : 20)} Bidding Points to unlock the customer budget, exact address, and direct quotation access for this ${unlockingWo?.distanceKm} km job? Your current wallet balance is ${nearbyData?.pointsBalance ?? 160} pts.`}
          confirmLabel={`Unlock with ${unlockingWo?.pointsToUnlock || (unlockingWo?.distanceKm > 15 ? 40 : unlockingWo?.distanceKm > 5 ? 30 : 20)} Points`}
          cancelLabel="Cancel"
          variant="warning"
          isLoading={isUnlocking}
          onConfirm={handleConfirmUnlock}
          onCancel={() => setUnlockingWo(null)}
        />
      )}
    </Card>
  );
};

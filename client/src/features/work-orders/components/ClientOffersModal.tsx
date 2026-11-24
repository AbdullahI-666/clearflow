import React, { useState, useEffect } from 'react';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Star, MapPin, Clock, ShieldCheck, CheckCircle2, 
  X, MessageSquare, AlertCircle, ArrowRight, Loader2, Sparkles
} from 'lucide-react';
import { apiClient } from '@/infrastructure/api/client';
import { ENDPOINTS } from '@/infrastructure/api/endpoints';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { triggerPopupNotification } from '@/shared/components/RightPopupNotifications';

interface ClientOffersModalProps {
  isOpen: boolean;
  onClose: () => void;
  workOrder: any;
  onOfferAccepted?: (offer: any) => void;
}

export const ClientOffersModal: React.FC<ClientOffersModalProps> = ({
  isOpen,
  onClose,
  workOrder,
  onOfferAccepted,
}) => {
  const [offers, setOffers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [counterInputId, setCounterInputId] = useState<string | null>(null);
  const [counterPrice, setCounterPrice] = useState<number | ''>('');

  const workOrderId = workOrder?._id || workOrder?.id;

  const fetchOffers = async () => {
    if (!workOrderId) return;
    setIsLoading(true);
    try {
      const res = await apiClient.get(ENDPOINTS.MARKETPLACE.OFFERS(workOrderId));
      if (res.data?.success && Array.isArray(res.data.data)) {
        setOffers(res.data.data);
      }
    } catch (err: any) {
      console.error('Failed to fetch offers:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && workOrderId) {
      fetchOffers();
    }
  }, [isOpen, workOrderId]);

  const handleRespond = async (offerId: string, action: 'accept' | 'reject' | 'counter') => {
    setActionInProgress(offerId);
    try {
      const payload: any = { action };
      if (action === 'counter') {
        if (!counterPrice || Number(counterPrice) <= 0) {
          toast.error('Please enter a valid counter price');
          setActionInProgress(null);
          return;
        }
        payload.counterPrice = Number(counterPrice);
      }

      const res = await apiClient.post(ENDPOINTS.MARKETPLACE.RESPOND_OFFER(offerId), payload);
      if (res.data?.success) {
        if (action === 'accept') {
          toast.success(`🎉 Offer accepted! Technician assigned to your service.`);
          triggerPopupNotification({
            title: 'Offer Accepted',
            description: 'Technician offer confirmed! Worker assigned to service request.',
            type: 'accept',
            workOrderId,
          });
          onOfferAccepted && onOfferAccepted(res.data.data?.offer || res.data.data);
          onClose();
        } else if (action === 'counter') {
          toast.success(`Counter offer of PKR ${counterPrice} sent to technician.`);
          triggerPopupNotification({
            title: 'Counter Offer Sent',
            description: `Counter offer of PKR ${counterPrice} sent to worker.`,
            type: 'event',
            workOrderId,
          });
          setCounterInputId(null);
          setCounterPrice('');
          fetchOffers();
        } else {
          toast.info('Offer declined.');
          triggerPopupNotification({
            title: 'Offer Declined',
            description: 'Technician service offer was declined.',
            type: 'reject',
            workOrderId,
          });
          fetchOffers();
        }
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Action failed');
    } finally {
      setActionInProgress(null);
    }
  };

  const clientBudget = workOrder?.budget || 85.0;

  return (
    <Dialog open={isOpen} onOpenChange={(open: boolean) => !open && onClose()}>
      <DialogContent className="w-[calc(100vw-1.5rem)] max-w-2xl max-h-[min(90dvh,calc(100vh-2rem))] overflow-y-auto touch-scroll p-4 sm:p-6 bg-white rounded-2xl shadow-2xl border border-teal-100">
        <DialogHeader className="pb-3 border-b border-gray-100">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="p-2 bg-teal-50 text-teal-700 rounded-xl shrink-0">
                <Sparkles className="w-5 h-5" />
              </span>
              <div>
                <DialogTitle className="text-lg sm:text-xl font-extrabold text-gray-900">
                  Provider Offers & Bids
                </DialogTitle>
                <DialogDescription className="text-xs text-gray-500">
                  Compare prices, ratings, and arrival times from nearby certified providers.
                </DialogDescription>
              </div>
            </div>
            <div className="text-left sm:text-right shrink-0 bg-teal-50/60 sm:bg-transparent p-2 sm:p-0 rounded-xl border sm:border-0 border-teal-100">
              <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400 block">Your Budget</span>
              <span className="text-base sm:text-lg font-black text-teal-700">PKR {clientBudget.toFixed(2)}</span>
            </div>
          </div>
        </DialogHeader>

        {isLoading ? (
          <div className="py-12 flex flex-col items-center justify-center text-teal-700">
            <Loader2 className="w-8 h-8 animate-spin mb-3 text-teal-600" />
            <p className="text-sm font-medium">Scanning live offers from nearby workers...</p>
          </div>
        ) : offers.length === 0 ? (
          <div className="py-12 text-center text-gray-500 space-y-3">
            <div className="w-12 h-12 rounded-full bg-teal-50 text-teal-600 flex items-center justify-center mx-auto">
              <Clock className="w-6 h-6 animate-pulse" />
            </div>
            <h4 className="font-bold text-gray-800">Broadcasting to Nearby Providers</h4>
            <p className="text-xs text-gray-500 max-w-sm mx-auto">
              Your request is live on the provider network. Qualified field members within 25km are reviewing your target price.
            </p>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <div className="flex items-center justify-between text-xs font-semibold text-gray-600 px-1">
              <span>{offers.length} Offer{offers.length > 1 ? 's' : ''} Received</span>
              <span className="text-teal-700 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> All Technicians Identity & AI Verified
              </span>
            </div>

            {offers.map((offer) => {
              const isAccepted = offer.status === 'Accepted';
              const isCountered = offer.status === 'Countered';
              const isRejected = offer.status === 'Rejected';
              const isCounterOpen = counterInputId === offer._id;
              const isBusy = actionInProgress === offer._id;

              const priceDiff = offer.offerPrice - clientBudget;

              return (
                <div
                  key={offer._id}
                  className={cn(
                    'p-4 rounded-xl border transition-all space-y-3',
                    isAccepted
                      ? 'border-emerald-500 bg-emerald-50/50 ring-2 ring-emerald-400/20'
                      : isRejected
                      ? 'border-gray-200 bg-gray-50/50 opacity-60'
                      : 'border-teal-100 bg-white hover:border-teal-300 hover:shadow-sm'
                  )}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 sm:gap-4">
                    {/* Provider Info */}
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-full bg-gradient-to-br from-teal-500 to-emerald-600 text-white font-bold flex items-center justify-center text-base shrink-0 shadow-xs">
                        {(offer.technicianName || 'T').charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-gray-900 text-sm">{offer.technicianName}</h4>
                          <span className="flex items-center gap-0.5 text-xs font-extrabold text-amber-500 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                            {offer.technicianRating !== undefined ? Number(offer.technicianRating).toFixed(1) : '0.0'}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-gray-500 mt-0.5">
                          <span>{offer.technicianJobsCompleted || 35}+ jobs</span>
                          <span>•</span>
                          <span className="flex items-center gap-1 text-teal-700 font-medium">
                            <MapPin className="w-3 h-3" /> {offer.distanceKm || 1.2} km away
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1 text-gray-600">
                            <Clock className="w-3 h-3" /> ~{offer.proposedEtaMinutes || 15} mins ETA
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Price & Difference */}
                    <div className="text-left sm:text-right shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-100 flex sm:block items-baseline justify-between">
                      <div className="text-xl font-black text-gray-900">PKR {offer.offerPrice.toFixed(2)}</div>
                      {priceDiff === 0 ? (
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 block sm:inline-block">
                          Matches Your Budget
                        </span>
                      ) : priceDiff > 0 ? (
                        <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded block sm:inline-block">
                          +PKR {priceDiff.toFixed(2)} vs budget
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded block sm:inline-block">
                          -PKR {Math.abs(priceDiff).toFixed(2)} below budget
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Message & Skill / Problem Severity Pricing Note */}
                  {offer.message && (
                    <div className="bg-teal-50/50 border border-teal-100 p-2.5 rounded-lg text-xs text-teal-900 flex items-start gap-2">
                      <MessageSquare className="w-3.5 h-3.5 text-teal-600 shrink-0 mt-0.5" />
                      <p className="italic">"{offer.message}"</p>
                    </div>
                  )}

                  {offer.pricingBreakdown && (
                    <div className="bg-emerald-50/60 border border-emerald-200 p-2 rounded-lg text-[11px] text-emerald-950 flex items-center justify-between flex-wrap gap-1">
                      <span className="font-semibold flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-emerald-600" />
                        Skills & Problem: <strong>{offer.pricingBreakdown.technicianSkillLabel}</strong> for <strong>{offer.pricingBreakdown.problemSeverityLabel}</strong>
                      </span>
                      <span className="text-[10px] text-emerald-700 font-bold">
                        Distance: {offer.distanceKm} km
                      </span>
                    </div>
                  )}

                  {/* Counter Status */}
                  {isCountered && (
                    <div className="bg-amber-50 border border-amber-200 p-2 rounded-lg text-xs text-amber-800 font-medium">
                      You proposed a counter-price of <strong>PKR {offer.counterPrice}</strong>. Awaiting technician confirmation.
                    </div>
                  )}

                  {/* Counter input box */}
                  {isCounterOpen && (
                    <div className="pt-2 flex items-center gap-2">
                      <div className="relative flex-1">
                        <span className="absolute left-3 top-2 text-xs font-bold text-gray-500">PKR</span>
                        <Input
                          type="number"
                          placeholder="Enter your counter price"
                          value={counterPrice}
                          onChange={(e) => setCounterPrice(e.target.value === '' ? '' : Number(e.target.value))}
                          className="h-8 pl-11 text-xs border-teal-200 focus:ring-teal-500"
                        />
                      </div>
                      <Button
                        size="sm"
                        disabled={isBusy}
                        onClick={() => handleRespond(offer._id, 'counter')}
                        className="h-8 bg-teal-600 hover:bg-teal-700 text-white text-xs cursor-pointer"
                      >
                        {isBusy ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Send Counter'}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setCounterInputId(null)}
                        className="h-8 text-xs text-gray-500 cursor-pointer"
                      >
                        Cancel
                      </Button>
                    </div>
                  )}

                  {/* Actions */}
                  {!isAccepted && !isRejected && !isCounterOpen && (
                    <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-gray-100">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={isBusy}
                        onClick={() => handleRespond(offer._id, 'reject')}
                        className="h-8 text-xs border-gray-200 text-gray-600 hover:bg-rose-50 hover:text-rose-700 cursor-pointer flex-1 sm:flex-none"
                      >
                        Decline
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={isBusy}
                        onClick={() => {
                          setCounterInputId(offer._id);
                          setCounterPrice(Math.round(offer.offerPrice * 0.9));
                        }}
                        className="h-8 text-xs border-teal-200 text-teal-800 hover:bg-teal-50 cursor-pointer flex-1 sm:flex-none"
                      >
                        Counter
                      </Button>
                      <Button
                        size="sm"
                        disabled={isBusy}
                        onClick={() => handleRespond(offer._id, 'accept')}
                        className="h-8 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold cursor-pointer shadow-xs w-full sm:w-auto"
                      >
                        {isBusy ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                        ) : (
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                        )}
                        Accept Offer (PKR {offer.offerPrice})
                      </Button>
                    </div>
                  )}

                  {isAccepted && (
                    <div className="flex items-center justify-between text-xs font-bold text-emerald-800 bg-emerald-100/70 p-2 rounded-lg border border-emerald-300">
                      <span className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        Job Awarded & Technician Confirmed
                      </span>
                      <span>Assigned</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

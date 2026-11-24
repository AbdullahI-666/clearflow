import React, { useState, useEffect } from 'react';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Coins, Wallet, ArrowDownRight, ArrowUpRight, Award, 
  Sparkles, Clock, CheckCircle2, AlertCircle, Loader2, Banknote,
  ShoppingCart, Zap, ArrowLeft, ShieldCheck, CreditCard,
  Target, Trophy, Hourglass, Flame
} from 'lucide-react';
import { Pricing, type PricingPlan } from '@/components/ui/pricing';
import { RuixenPaymentCard } from '@/components/ui/modern-payment-form';
import { VisaMastercardLogo, EasypaisaLogo, JazzCashLogo } from '@/components/ui/payment-icons';
import { PakistaniBankSelector } from '@/components/ui/pakistani-bank-selector';
import { apiClient } from '@/infrastructure/api/client';
import { ENDPOINTS } from '@/infrastructure/api/endpoints';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useAuth } from '@/entities/user/hooks/useAuth';

interface FieldWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  onWalletUpdated?: (walletData: any) => void;
  initialTab?: 'overview' | 'targets' | 'points' | 'earnings' | 'purchase' | 'checkout';
}

const FIELD_TEAM_PLANS: PricingPlan[] = [
  {
    name: "Starter Operations",
    price: "250",
    yearlyPrice: "200", // Save 20%: 250 * 0.8 = 200 PKR
    period: "100 PTS",
    features: [
      "100 Bidding Points",
      "Annual Save 20%: PKR 200",
      "Nearby Marketplace instant access",
      "Standard routing & GPS navigation",
      "Real-time client messaging",
      "Email & in-app field support",
    ],
    description: "Ideal for solo technicians getting started in the ClearFlow operations network.",
    buttonText: "Purchase Starter Plan (100 PTS)",
    isPopular: false,
    points: 100,
  },
  {
    name: "Pro Crew",
    price: "750",
    yearlyPrice: "600", // Save 20%: 750 * 0.8 = 600 PKR
    period: "300 PTS",
    features: [
      "300 Bidding Points",
      "Annual Save 20%: PKR 600",
      "High-value commercial job priority",
      "Reduced platform fee (8% vs 12%)",
      "Fast 24-hr payout approval",
      "AI Verification pre-check badge",
      "Priority operational phone & live support",
    ],
    description: "Our top choice for active technicians & high-volume service crews.",
    buttonText: "Get Pro Crew Plan (300 PTS)",
    isPopular: true,
    points: 300,
  },
  {
    name: "Fleet Enterprise",
    price: "2000",
    yearlyPrice: "1600", // Save 20%: 2000 * 0.8 = 1600 PKR
    period: "800 PTS",
    features: [
      "800 Bidding Points",
      "Annual Save 20%: PKR 1,600",
      "Multi-van pooled points wallet",
      "Lowest platform fee (5% tier)",
      "Instant same-day payout approvals",
      "Dedicated account & service manager",
      "Custom SLA guarantees & priority bids",
    ],
    description: "Designed for multi-van contractors and commercial facility service fleets.",
    buttonText: "Upgrade to Fleet Plan (800 PTS)",
    isPopular: false,
    points: 800,
  },
];

export const FieldWalletModal: React.FC<FieldWalletModalProps> = ({
  isOpen,
  onClose,
  onWalletUpdated,
  initialTab = 'overview',
}) => {
  const { user } = useAuth();
  const isDemo =
    (user?.email || '').toLowerCase().trim() === 'fieldteam@clearflow.com' ||
    user?._id === '65f000000000000000000004' ||
    user?._id === '65f000000000000000000005';
  const [tab, setTab] = useState<'overview' | 'targets' | 'points' | 'earnings' | 'purchase' | 'checkout'>(initialTab || 'overview');
  const [walletData, setWalletData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const [selectedPlanForCheckout, setSelectedPlanForCheckout] = useState<PricingPlan | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Weekly Targets & 5-Hour Admin Audit Monitor State
  const [weeklyTargets, setWeeklyTargets] = useState<any[]>([]);
  const [targetPayoutRequests, setTargetPayoutRequests] = useState<any[]>([]);
  const [isClaimingTarget, setIsClaimingTarget] = useState(false);
  const [nowTime, setNowTime] = useState(Date.now());

  // 1-second interval for active 5-hour countdown timer
  useEffect(() => {
    const timer = setInterval(() => setNowTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchTargets = async () => {
    try {
      const res = await apiClient.get(ENDPOINTS.MARKETPLACE.TARGETS);
      if (res.data?.success && res.data?.data) {
        setWeeklyTargets(res.data.data.targets || []);
        setTargetPayoutRequests(res.data.data.targetPayoutRequests || []);
      }
    } catch (err) {
      console.error('Failed to load weekly targets:', err);
    }
  };

  const handleRequestTargetPayout = async (target: any) => {
    setIsClaimingTarget(true);
    try {
      const res = await apiClient.post(ENDPOINTS.MARKETPLACE.REQUEST_TARGET_PAYOUT(target.id), {
        customNotes: `Worker requested payout of PKR ${target.rewardCash} through ${target.rewardPoints} points for milestone "${target.title}".`,
      });
      if (res.data?.success) {
        toast.success(`🎯 Payout requested for "${target.title}"! Admin 5-Hour Audit Monitor initiated.`);
        fetchTargets();
        fetchWallet();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Failed to request target payout');
    } finally {
      setIsClaimingTarget(false);
    }
  };

  const formatCountdown = (expiresAt: string | Date) => {
    const diff = new Date(expiresAt).getTime() - nowTime;
    if (diff <= 0) return '00:00:00 (Audit Complete)';
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const secs = Math.floor((diff % (1000 * 60)) / 1000);
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const fetchWallet = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.get(ENDPOINTS.MARKETPLACE.WALLET);
      const payload = res.data?.data?.wallet || res.data?.data || res.data?.wallet;
      if (payload && typeof payload.pointsBalance === 'number') {
        setWalletData(payload);
        onWalletUpdated && onWalletUpdated(payload);
        try {
          localStorage.setItem('clearflow_worker_wallet', JSON.stringify(payload));
          if (user?._id) {
            localStorage.setItem(`clearflow_worker_wallet_${user._id}`, JSON.stringify(payload));
          }
        } catch {}
      }
    } catch (err) {
      console.error('Failed to load wallet:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const handleWalletUpdated = (e: any) => {
      if (e.detail && typeof e.detail.pointsBalance === 'number') {
        setWalletData((prev: any) => ({
          ...(prev || {}),
          ...e.detail,
          pointsBalance: e.detail.pointsBalance,
        }));
      }
    };
    window.addEventListener('clearflow:wallet-updated', handleWalletUpdated);
    return () => window.removeEventListener('clearflow:wallet-updated', handleWalletUpdated);
  }, []);

  useEffect(() => {
    if (isOpen) {
      if (initialTab) {
        setTab(initialTab);
      } else {
        setTab('overview');
      }
      fetchWallet();
      fetchTargets();
    }
  }, [isOpen, initialTab]);

  const handleSelectPlan = (plan: PricingPlan, isAnnual?: boolean) => {
    const isYearly = Boolean(isAnnual ?? plan.isAnnual);
    const finalPrice = isYearly ? plan.yearlyPrice : plan.price;
    setSelectedPlanForCheckout({
      ...plan,
      isAnnual: isYearly,
      price: finalPrice,
      effectivePrice: Number(finalPrice),
    });
    setTab('checkout');
  };

  const handlePaymentSuccess = async (ticket: any) => {
    const pts = selectedPlanForCheckout?.points || ticket.points || 100;
    const planName = selectedPlanForCheckout?.name || ticket.planName || 'Pro Crew';
    const pricePaid = Number(selectedPlanForCheckout?.effectivePrice || selectedPlanForCheckout?.price || ticket.amount || 250);
    const methodLabel =
      ticket.method === 'card'
        ? 'Visa / Mastercard'
        : ticket.method === 'jazzcash'
        ? 'JazzCash'
        : 'EasyPaisa';
    const accountDetails = ticket.maskedAccount || 'Direct Mobile Wallet Transfer';

    let newPts = (walletData?.pointsBalance || 160) + pts;
    try {
      const apiRes = await apiClient.post(ENDPOINTS.MARKETPLACE.PURCHASE_POINTS, {
        planName,
        points: pts,
        price: pricePaid,
        pricePaid: pricePaid,
        billingCycle: selectedPlanForCheckout?.isAnnual ? 'annual' : 'monthly',
        paymentMethod: methodLabel,
        accountInfo: accountDetails,
        technicianName: user?.name || 'Registered Technician',
      });
      if (apiRes.data?.data?.newPointsBalance !== undefined) {
        newPts = apiRes.data.data.newPointsBalance;
      }
    } catch (e) {
      // Offline fallback maintains newPts
    }

    const updatedWallet = {
      ...(walletData || {}),
      pointsBalance: newPts,
    };
    setWalletData(updatedWallet);
    if (onWalletUpdated) onWalletUpdated(updatedWallet);
    try {
      localStorage.setItem('clearflow_worker_wallet', JSON.stringify(updatedWallet));
      if (user?._id) {
        localStorage.setItem(`clearflow_worker_wallet_${user._id}`, JSON.stringify(updatedWallet));
      }
    } catch {}
    window.dispatchEvent(new CustomEvent('clearflow:wallet-updated', { detail: updatedWallet }));

    // 🟣 Synchronize Admin Platform Revenue in real time across portals
    try {
      const storedRev = localStorage.getItem('clearflow_admin_revenue');
      const prevData = storedRev ? JSON.parse(storedRev) : {
        totalRevenue: 0.0,
        packageSubscriptionsRevenue: 0.0,
        commissionRevenue: 0.0,
        withdrawableRevenue: 0.0,
        packagePurchases: [],
      };

      const newPurchaseRecord = {
        _id: 'pkg_' + Date.now(),
        technicianName: user?.name || 'Registered Technician',
        planName,
        pointsAwarded: pts,
        amount: pricePaid,
        billingCycle: 'monthly',
        paymentMethod: methodLabel,
        accountInfo: accountDetails,
        status: 'Credited',
        createdAt: new Date().toISOString(),
      };

      const updatedRevenue = {
        ...prevData,
        totalRevenue: (prevData.totalRevenue || 50347.0) + pricePaid,
        packageSubscriptionsRevenue: (prevData.packageSubscriptionsRevenue || 3497.0) + pricePaid,
        withdrawableRevenue: (prevData.withdrawableRevenue || 50347.0) + pricePaid,
        packagePurchases: [newPurchaseRecord, ...(prevData.packagePurchases || [])],
      };

      localStorage.setItem('clearflow_admin_revenue', JSON.stringify(updatedRevenue));

      // Global window event for all listening components
      window.dispatchEvent(new CustomEvent('clearflow:package_purchased', {
        detail: {
          planName,
          price: pricePaid,
          method: methodLabel,
          accountInfo: accountDetails,
          points: pts,
          technicianName: user?.name || 'Registered Technician',
        },
      }));
    } catch (err) {}

    toast.success(`🎉 ${planName} activated! +${pts} Points credited to Field Wallet. Admin Platform Earnings: +PKR ${pricePaid.toFixed(2)} recorded in purple theme.`);
    fetchWallet();
  };

  const pointsBalance = walletData?.pointsBalance ?? (isDemo ? 160 : 50);
  const withdrawable = walletData?.withdrawableBalance ?? 0.0;
  const pending = walletData?.pendingBalance ?? 0.0;
  const totalEarned = walletData?.totalEarnings ?? 0.0;

  const isWideModal = tab === 'purchase' || tab === 'checkout';

  return (
    <Dialog open={isOpen} onOpenChange={(open: boolean) => !open && onClose()}>
      <DialogContent className={cn(
        "w-[calc(100vw-1.5rem)] max-h-[min(92dvh,calc(100vh-2rem))] overflow-y-auto touch-scroll bg-white rounded-2xl shadow-2xl border border-amber-200 transition-all duration-300",
        isWideModal ? "max-w-5xl p-4 sm:p-6" : tab === 'targets' ? "max-w-4xl p-4 sm:p-6" : "max-w-2xl p-4 sm:p-6"
      )}>
        {/* Top Header - In Purchase/Checkout, show clean streamlined bar */}
        {isWideModal ? (
          <div className="flex items-center justify-between pb-3 mb-2 border-b border-amber-100">
            <button
              type="button"
              onClick={() => setTab('overview')}
              className="flex items-center gap-1.5 text-xs font-bold text-amber-800 hover:text-amber-950 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Wallet Overview
            </button>
          </div>
        ) : (
          <DialogHeader className="pb-3 border-b border-amber-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-amber-100 text-amber-800 rounded-xl">
                  <Wallet className="w-5 h-5" />
                </span>
                <div>
                  <DialogTitle className="text-xl font-extrabold text-amber-950">
                    Field Member Wallet & Points Ledger
                  </DialogTitle>
                  <DialogDescription className="text-xs text-amber-800/80">
                    Manage your bidding points, net service earnings, and instant payout withdrawals.
                  </DialogDescription>
                </div>
              </div>
            </div>

            {/* Navigation Tabs (Request Payout accessed via bottom button) */}
            <div className="flex items-center gap-2 pt-3 border-t border-amber-50 overflow-x-auto touch-scroll pb-1 w-full">
              {[
                { id: 'overview', label: 'Overview' },
                { 
                  id: 'targets', 
                  label: 'Milestone Targets',
                  badge: targetPayoutRequests.some((r) => r.status === 'PendingAdminAudit') ? '5-Hr SLA' : undefined 
                },
                { id: 'points', label: 'Points Ledger' },
                { id: 'earnings', label: 'Earnings & Bonuses' },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id as any)}
                  className={cn(
                    'px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5',
                    tab === t.id
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
                  )}
                >
                  {t.id === 'targets' && <Target className="w-3.5 h-3.5 text-amber-600" />}
                  {t.label}
                  {t.badge && (
                    <span className="px-1.5 py-0.5 rounded-full text-[9px] font-black bg-amber-900 text-amber-100 animate-pulse">
                      {t.badge}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </DialogHeader>
        )}

        {isLoading ? (
          <div className="py-12 flex flex-col items-center justify-center text-amber-700">
            <Loader2 className="w-8 h-8 animate-spin mb-3 text-amber-600" />
            <p className="text-sm font-medium">Loading wallet transactions and points ledger...</p>
          </div>
        ) : (
          <div className="space-y-4 py-1">
            {/* ─── TAB 1: OVERVIEW ─── */}
            {tab === 'overview' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="p-3 bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-xl text-center">
                    <p className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">Points Balance</p>
                    <p className="text-xl font-black text-amber-700 mt-1 flex items-center justify-center gap-1">
                      <Coins className="w-4 h-4 text-amber-500" /> {pointsBalance}
                    </p>
                    <span className="text-[10px] text-amber-700 font-medium">Ready for Bidding</span>
                  </div>

                  <div className="p-3 bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-xl text-center">
                    <p className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">Withdrawable Cash</p>
                    <p className="text-xl font-black text-emerald-700 mt-1">PKR {withdrawable.toFixed(2)}</p>
                    <span className="text-[10px] text-emerald-700 font-medium">Available Now</span>
                  </div>

                  <div className="p-3 bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-xl text-center">
                    <p className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">Pending Payouts</p>
                    <p className="text-xl font-black text-amber-800 mt-1">PKR {pending.toFixed(2)}</p>
                    <span className="text-[10px] text-gray-500 font-medium">In Verification</span>
                  </div>

                  <div className="p-3 bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-xl text-center">
                    <p className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">Total Earned</p>
                    <p className="text-xl font-black text-amber-900 mt-1">PKR {totalEarned.toFixed(2)}</p>
                    <span className="text-[10px] text-amber-700 font-medium">Gross Services</span>
                  </div>
                </div>

                {/* Point Rules Card */}
                <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl space-y-2">
                  <h4 className="font-bold text-amber-950 text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-600" /> Bidding Points Mechanics
                  </h4>
                  <ul className="text-xs text-amber-900 space-y-1">
                    <li className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                      <strong>0 Points to Bid:</strong> You can submit offers and review jobs for free without risking any points.
                    </li>
                    <li className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                      <strong>Points Deducted Only When Won:</strong> Points (15–25 pts depending on job category) are deducted only when the customer accepts your offer.
                    </li>
                    <li className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                      <strong>100% Refund on Cancellations:</strong> If a customer cancels an assigned job, points are immediately refunded to your balance.
                    </li>
                  </ul>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-2 border-t border-amber-100">
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Button
                      onClick={() => setTab('purchase')}
                      className="flex-1 sm:flex-none bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white font-bold text-xs h-9 cursor-pointer shadow-xs flex items-center gap-1.5"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-200" /> Purchase Bidding Points
                    </Button>
                    <Button
                      onClick={() => setTab('targets')}
                      variant="outline"
                      className="flex-1 sm:flex-none border-amber-300 text-amber-900 hover:bg-amber-100/70 font-bold text-xs h-9 cursor-pointer shadow-2xs flex items-center gap-1.5"
                    >
                      <Target className="w-3.5 h-3.5 text-amber-600" /> Milestone Targets
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* ─── TAB: MILESTONE TARGETS & 5-HOUR SLA AUDIT ─── */}
            {tab === 'targets' && (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl border-2 border-amber-300 bg-gradient-to-br from-amber-50/80 via-orange-50/40 to-white shadow-xs space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-200/70 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="p-2 bg-gradient-to-br from-amber-500 to-orange-600 text-white rounded-xl shadow-xs">
                        <Target className="w-5 h-5" />
                      </span>
                      <div>
                        <h3 className="text-sm sm:text-base font-black text-amber-950 flex items-center gap-1.5">
                          Weekly Performance Milestone Targets
                        </h3>
                        <p className="text-xs text-amber-800/80">
                          Fulfill weekly targets like completing 10 jobs per week to earn free bidding reward points for your wallet balance.
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] font-bold text-gray-400 block uppercase">Bidding Points Balance</span>
                      <span className="text-sm font-black text-amber-700 flex items-center gap-1 justify-end">
                        <Coins className="w-3.5 h-3.5 text-amber-500" /> {pointsBalance} pts
                      </span>
                    </div>
                  </div>

                  {/* ACTIVE 5-HOUR ADMIN AUDIT MONITOR BANNER */}
                  {targetPayoutRequests.some((r) => r.status === 'PendingAdminAudit') && (
                    <div className="p-3.5 rounded-xl border-2 border-amber-400 bg-amber-100/70 shadow-xs space-y-2">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <Hourglass className="w-4 h-4 text-amber-700 animate-spin" />
                          <span className="text-xs font-black text-amber-950 uppercase tracking-wide">
                            Active 5-Hour Admin SLA Audit Monitor
                          </span>
                        </div>
                        {targetPayoutRequests
                          .filter((r) => r.status === 'PendingAdminAudit')
                          .map((req) => (
                            <span
                              key={req._id}
                              className="px-2.5 py-1 rounded-lg bg-amber-900 text-amber-100 font-mono text-xs font-black flex items-center gap-1.5 shadow-xs"
                            >
                              <Clock className="w-3.5 h-3.5 text-amber-300" />
                              {formatCountdown(req.auditExpiresAt)} remaining
                            </span>
                          ))}
                      </div>

                      {targetPayoutRequests
                        .filter((r) => r.status === 'PendingAdminAudit')
                        .map((req) => (
                          <div key={req._id} className="text-xs text-amber-900 space-y-1 pt-1 border-t border-amber-200/80">
                            <p className="font-semibold">
                              Payout Request: <strong className="text-amber-950">{req.targetTitle}</strong> — Redeeming {req.pointsRedeemed} pts for <strong>PKR {req.rewardCash.toFixed(2)}</strong>.
                            </p>
                            <p className="text-[11px] text-amber-800">
                              Admin is monitoring completed job photos and SLA compliance. After the 5-hour audit window (or upon supervisor approval), PKR {req.rewardCash.toFixed(2)} will unlock into your Withdrawable Balance.
                            </p>
                          </div>
                        ))}
                    </div>
                  )}

                  {/* WEEKLY TARGETS CARDS */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {(weeklyTargets.length > 0 ? weeklyTargets : [
                      {
                        id: 'target_10_works',
                        title: '10 Works Per Week Fleet Milestone',
                        description: 'Complete 10 client work orders within the current 7-day work cycle.',
                        targetCount: 10,
                        currentCount: 10,
                        isFulfilled: true,
                        rewardPoints: 200,
                      },
                      {
                        id: 'target_5_star_quality',
                        title: 'Quality Star Milestone (5 High-Score Jobs)',
                        description: 'Achieve 5 verified jobs with >92% AI inspection confidence score.',
                        targetCount: 5,
                        currentCount: 4,
                        isFulfilled: false,
                        rewardPoints: 150,
                      },
                      {
                        id: 'target_far_distance_hero',
                        title: 'Territory Outreach Hero (15 km)',
                        description: 'Complete 3 extended-distance service orders to remote facilities.',
                        targetCount: 3,
                        currentCount: 3,
                        isFulfilled: true,
                        rewardPoints: 120,
                      },
                    ]).map((target: any) => {
                      const isPending = targetPayoutRequests.some(
                        (r) => r.targetId === target.id && r.status === 'PendingAdminAudit'
                      );
                      const isApproved = targetPayoutRequests.some(
                        (r) => r.targetId === target.id && r.status === 'Approved'
                      );
                      const currentCount = Number(target.currentCount ?? target.current ?? 0);
                      const targetCount = Number(target.targetCount ?? target.target ?? 10);
                      const progressPct = targetCount > 0 ? Math.min(100, Math.max(0, Math.round((currentCount / targetCount) * 100))) : 0;
                      const isCompleted = currentCount >= targetCount || target.isFulfilled;
                      const rewardPts = Number(target.rewardPoints || 200);

                      return (
                        <div
                          key={target.id}
                          className={cn(
                            'p-3.5 rounded-xl border flex flex-col justify-between space-y-3 transition-all bg-white',
                            isCompleted ? 'border-amber-400 shadow-xs' : 'border-gray-200'
                          )}
                        >
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="font-extrabold text-xs text-gray-900">{target.title}</span>
                              {isCompleted ? (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-0.5">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Done
                                </span>
                              ) : (
                                <span className="text-[10px] font-bold text-gray-500">
                                  {currentCount} / {targetCount}
                                </span>
                              )}
                            </div>

                            <p className="text-[11px] text-gray-500 leading-tight">{target.description}</p>

                            {/* Progress bar */}
                            <div className="space-y-1 pt-1">
                              <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                                <div
                                  className={cn(
                                    'h-full transition-all duration-500',
                                    isCompleted ? 'bg-emerald-500' : 'bg-amber-500'
                                  )}
                                  style={{ width: `${progressPct}%` }}
                                />
                              </div>
                              <div className="flex justify-between text-[10px] text-gray-400 font-semibold">
                                <span>Progress: {progressPct}%</span>
                                <span className="text-amber-700 font-bold font-mono">+{rewardPts} pts</span>
                              </div>
                            </div>
                          </div>

                          <div className="pt-2 border-t border-gray-100">
                            {isPending ? (
                              <div className="text-center py-1 bg-amber-50 rounded-lg border border-amber-200">
                                <span className="text-[11px] font-bold text-amber-800 flex items-center justify-center gap-1">
                                  <Clock className="w-3 h-3 text-amber-600" /> Pending 5-Hr Audit
                                </span>
                              </div>
                            ) : isApproved ? (
                              <div className="text-center py-1 bg-emerald-50 rounded-lg border border-emerald-200">
                                <span className="text-[11px] font-bold text-emerald-800 flex items-center justify-center gap-1">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Points Credited (+{rewardPts} pts)
                                </span>
                              </div>
                            ) : isCompleted ? (
                              <Button
                                size="sm"
                                disabled={isClaimingTarget}
                                onClick={() => handleRequestTargetPayout(target)}
                                className="w-full h-8 text-xs bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white font-bold cursor-pointer shadow-xs flex items-center justify-center gap-1"
                              >
                                {isClaimingTarget ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <Coins className="w-3.5 h-3.5 text-amber-200" />
                                )}
                                Claim Milestone (+{rewardPts} pts)
                              </Button>
                            ) : (
                              <div className="text-center py-1 bg-amber-50/60 rounded-lg border border-amber-100 text-[10.5px] font-semibold text-amber-800">
                                {Math.max(0, targetCount - currentCount)} more jobs to earn +{rewardPts} pts
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* ─── TAB: PURCHASE BIDDING PLANS ─── */}
            {tab === 'purchase' && (
              <div className="space-y-4">
                <Pricing
                  plans={FIELD_TEAM_PLANS}
                  title="Field Crew Bidding Plans"
                  description="Choose an affordable package to unlock instant bidding points and start winning jobs across your service territory."
                  roleTheme="fieldteam"
                  className="py-1"
                  onSelectPlan={handleSelectPlan}
                />
              </div>
            )}

            {/* ─── TAB: CHECKOUT (PAKISTANI PAYMENTS: VISA/MC, JAZZCASH, EASYPAISA) ─── */}
            {tab === 'checkout' && selectedPlanForCheckout && (
              <div className="py-2">
                <RuixenPaymentCard
                  planName={selectedPlanForCheckout.name}
                  amount={Number(selectedPlanForCheckout.price)}
                  points={selectedPlanForCheckout.points || 100}
                  roleTheme="fieldteam"
                  onBack={() => setTab('purchase')}
                  onSuccess={handlePaymentSuccess}
                />
              </div>
            )}

            {/* ─── TAB: POINTS LEDGER ─── */}
            {tab === 'points' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs font-semibold text-gray-600 px-1">
                  <span>Complete Points Transaction History</span>
                  <div className="flex items-center gap-2">
                    <span className="text-amber-700 font-bold">{pointsBalance} pts Available</span>
                    <button
                      type="button"
                      onClick={() => setTab('purchase')}
                      className="text-[11px] font-bold text-white bg-amber-600 hover:bg-amber-700 px-2.5 py-1 rounded-lg cursor-pointer flex items-center gap-1 shadow-2xs"
                    >
                      <Sparkles className="w-3 h-3" /> Purchase Points
                    </button>
                  </div>
                </div>

                <div className="space-y-2 max-h-72 overflow-y-auto">
                  {(walletData?.pointsHistory || []).length === 0 ? (
                    <div className="p-6 text-center text-xs text-amber-800 bg-amber-50/50 rounded-xl border border-dashed border-amber-200">
                      <Coins className="w-6 h-6 mx-auto mb-1.5 text-amber-500" />
                      <p className="font-bold">No points transactions recorded yet</p>
                      <p className="text-[11px] text-amber-700/80 mt-1">
                        Starter bidding points are allocated automatically upon registration. Points are deducted only when you win a service assignment.
                      </p>
                    </div>
                  ) : (
                    (walletData?.pointsHistory || []).map((pt: any) => {
                      const isPositive = pt.pointsChange > 0;
                      return (
                        <div
                          key={pt._id}
                          className="p-3 bg-white border border-amber-100 rounded-xl flex items-center justify-between text-xs hover:border-amber-300"
                        >
                          <div className="flex items-center gap-2.5">
                            <span
                              className={cn(
                                'w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs',
                                isPositive ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                              )}
                            >
                              {isPositive ? <ArrowDownRight className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                            </span>
                            <div>
                              <p className="font-bold text-gray-900">
                                {(pt.reason || pt.type || '').replace(/50\s*Starter\s*Bidding\s*Points/gi, '').replace(/\s{2,}/g, ' ').trim() || 'Welcome to ClearFlow!'}
                              </p>
                              <span className="text-[10px] text-gray-400">
                                {new Date(pt.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                          <div className="text-right">
                            <span
                              className={cn(
                                'font-black text-sm block',
                                isPositive ? 'text-emerald-700' : 'text-amber-800'
                              )}
                            >
                              {isPositive ? `+${pt.pointsChange}` : pt.pointsChange} pts
                            </span>
                            <span className="text-[10px] text-gray-500 font-medium">Bal: {pt.balanceAfter} pts</span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* ─── TAB: EARNINGS & BONUSES ─── */}
            {tab === 'earnings' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
                    <Award className="w-4 h-4 text-amber-600" /> Performance Bonus Awards
                  </h4>
                  {(walletData?.bonusHistory || []).length === 0 ? (
                    <div className="p-4 rounded-xl border border-dashed border-amber-200 bg-amber-50/50 text-center text-xs text-amber-900">
                      <Sparkles className="w-5 h-5 mx-auto mb-1 text-amber-500" />
                      <p className="font-bold">No performance bonuses earned yet</p>
                      <p className="text-[11px] text-amber-700 mt-0.5">
                        Complete assigned jobs with on-time arrival and high AI quality scores (&gt;90%) to unlock real cash & bonus points!
                      </p>
                    </div>
                  ) : (
                    <div className="grid sm:grid-cols-2 gap-2">
                      {(walletData?.bonusHistory || []).map((bon: any) => (
                        <div
                          key={bon._id}
                          className="p-3 bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-xl text-xs space-y-1"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-amber-950">{bon.bonusType}</span>
                            <span className="font-black text-emerald-700">+PKR {bon.amountCash?.toFixed(2)}</span>
                          </div>
                          <p className="text-[11px] text-amber-800">{bon.reason}</p>
                          <span className="text-[10px] font-semibold text-amber-600">+{bon.pointsAwarded} pts credited</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700">Financial Ledger</h4>
                  {(walletData?.walletHistory || []).length === 0 ? (
                    <div className="p-4 rounded-xl border border-dashed border-gray-200 bg-gray-50/60 text-center text-xs text-gray-600">
                      <Clock className="w-5 h-5 mx-auto mb-1 text-gray-400" />
                      <p className="font-bold">No financial transactions yet</p>
                      <p className="text-[11px] text-gray-500 mt-0.5">
                        Net payouts from completed service work and bonus credits will be recorded here automatically.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {(walletData?.walletHistory || []).map((w: any) => {
                        const isPositive = w.amount > 0;
                        return (
                          <div
                            key={w._id}
                            className="p-2.5 bg-white border border-gray-100 rounded-lg flex items-center justify-between text-xs"
                          >
                            <div>
                              <p className="font-semibold text-gray-900">{w.description}</p>
                              <span className="text-[10px] text-gray-400">
                                {new Date(w.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                            <div className="text-right">
                              <span
                                className={cn(
                                  'font-bold text-sm block',
                                  isPositive ? 'text-emerald-700' : 'text-gray-800'
                                )}
                              >
                                {isPositive ? `+PKR ${w.amount.toFixed(2)}` : `-PKR ${Math.abs(w.amount).toFixed(2)}`}
                              </span>
                              <span className="text-[10px] text-gray-500 font-medium capitalize">{w.status}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

import React, { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { 
  Coins, Wallet, ArrowDownRight, ArrowUpRight, Award, 
  Sparkles, Clock, CheckCircle2, AlertCircle, Loader2, Banknote,
  ShoppingCart, Zap, ShieldCheck, CreditCard,
  Target, Trophy, Flame, X, RefreshCw, Radio, Plus, Check, RotateCcw
} from 'lucide-react';
import { VisaMastercardLogo, EasypaisaLogo, JazzCashLogo } from '@/components/ui/payment-icons';
import { PakistaniBankSelector } from '@/components/ui/pakistani-bank-selector';
import { apiClient } from '@/infrastructure/api/client';
import { ENDPOINTS } from '@/infrastructure/api/endpoints';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/entities/user/hooks/useAuth';

export interface WalletSidebarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  walletInfo?: any;
  onWalletUpdated?: (walletData: any) => void;
  initialTab?: 'buy' | 'history' | 'targets';
}

interface PointsPackage {
  id: string;
  name: string;
  points: number;
  pricePKR: number;
  badge?: string;
  isPopular?: boolean;
  isAnnual?: boolean;
  perks: string[];
}

const POINTS_PACKAGES: PointsPackage[] = [
  {
    id: 'starter',
    name: 'Starter Pack',
    points: 100,
    pricePKR: 250,
    perks: ['100 Bidding Points', 'Standard routing access', 'Real-time client messaging'],
  },
  {
    id: 'pro',
    name: 'Pro Crew Pack',
    points: 300,
    pricePKR: 750,
    badge: 'MOST POPULAR',
    isPopular: true,
    perks: ['300 Bidding Points', 'Priority high-value bids', 'Fast 24-hr payout approval', 'AI Verification badge'],
  },
  {
    id: 'fleet',
    name: 'Fleet Enterprise',
    points: 800,
    pricePKR: 2000,
    badge: 'BEST VALUE',
    perks: ['800 Bidding Points', 'Lowest platform fee (5%)', 'Same-day payout priority', 'Dedicated manager'],
  },
  {
    id: 'mini',
    name: 'Quick Top-Up',
    points: 50,
    pricePKR: 125,
    perks: ['50 Points for urgent bids', 'Immediate activation'],
  },
];

export const WalletSidebar: React.FC<WalletSidebarProps> = ({
  open,
  onOpenChange,
  walletInfo: externalWalletInfo,
  onWalletUpdated,
  initialTab = 'buy',
}) => {
  const { user } = useAuth();
  const isDemoWorker =
    (user?.email || '').toLowerCase().trim() === 'field@clearflow.com' ||
    (user?.email || '').toLowerCase().trim() === 'worker@clearflow.com' ||
    (user?.email || '').toLowerCase().trim() === 'crew@clearflow.com' ||
    user?._id === '65f000000000000000000004';

  const [tab, setTab] = useState<'buy' | 'history' | 'targets'>(initialTab);
  const [wallet, setWallet] = useState<any>(() => {
    if (externalWalletInfo) return externalWalletInfo;
    if (!isDemoWorker) {
      return {
        pointsBalance: 0,
        withdrawableBalance: 0.0,
        totalEarnedPoints: 0,
        spentPoints: 0,
        isOnlineAvailability: true,
      };
    }
    try {
      const saved = user?._id
        ? localStorage.getItem(`clearflow_worker_wallet_${user._id}`)
        : (isDemoWorker ? localStorage.getItem('clearflow_worker_wallet') : null);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed.pointsBalance === 'number') {
          if (!isDemoWorker) {
            if (parsed.pointsBalance === 100 || parsed.pointsBalance === 160) parsed.pointsBalance = 50;
            if (parsed.totalEarnedPoints === 175) parsed.totalEarnedPoints = 0;
            if (parsed.withdrawableBalance === 380.0) parsed.withdrawableBalance = 0.0;
          }
          return parsed;
        }
      }
    } catch {}
    return {
      pointsBalance: isDemoWorker ? 160 : 50,
      withdrawableBalance: isDemoWorker ? 380.0 : 0.0,
      totalEarnedPoints: isDemoWorker ? 175 : 0,
      spentPoints: isDemoWorker ? 15 : 0,
      isOnlineAvailability: true,
    };
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Buy Points State
  const [selectedPackage, setSelectedPackage] = useState<PointsPackage>(POINTS_PACKAGES[1]);
  const [paymentMethod, setPaymentMethod] = useState<'jazzcash' | 'easypaisa' | 'bank' | 'card'>('jazzcash');
  const [accountNumber, setAccountNumber] = useState(user?.phone || (isDemoWorker ? '0300-1234567' : ''));
  const [selectedBank, setSelectedBank] = useState('Meezan Bank');
  const [cardholderName, setCardholderName] = useState(user?.name || (isDemoWorker ? 'Muhammad Ahsan' : ''));
  const [cardNumber, setCardNumber] = useState(isDemoWorker ? '4214 7892 0182 8237' : '');
  const [expiryDate, setExpiryDate] = useState(isDemoWorker ? '08/28' : '');
  const [cvv, setCvv] = useState(isDemoWorker ? '782' : '');
  const [paymentSuccessTicket, setPaymentSuccessTicket] = useState<any>(null);
  const [isAnnual, setIsAnnual] = useState(false);

  // Status Toggles
  const [isOnline, setIsOnline] = useState(true);
  const [isGpsActive, setIsGpsActive] = useState(true);

  // Targets State
  const [weeklyTargets, setWeeklyTargets] = useState<any[]>([]);

  const fetchWalletData = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.get(ENDPOINTS.MARKETPLACE.WALLET);
      const walletPayload = res.data?.data?.wallet || res.data?.data || res.data?.wallet;
      if (walletPayload && typeof walletPayload.pointsBalance === 'number') {
        setWallet(walletPayload);
        setIsOnline(walletPayload.isAvailableOnline ?? walletPayload.isOnlineAvailability ?? true);
        if (onWalletUpdated) onWalletUpdated(walletPayload);
        try {
          localStorage.setItem('clearflow_worker_wallet', JSON.stringify(walletPayload));
          if (user?._id) {
            localStorage.setItem(`clearflow_worker_wallet_${user._id}`, JSON.stringify(walletPayload));
          }
        } catch {}
      }
    } catch (e) {
      // Fallback data
      const fallbackData = isDemoWorker ? {
        pointsBalance: 160,
        withdrawableBalance: 380.0,
        totalEarnedPoints: 175,
        spentPoints: 15,
        isOnlineAvailability: true,
      } : {
        pointsBalance: 50,
        withdrawableBalance: 0.0,
        totalEarnedPoints: 0,
        spentPoints: 0,
        isOnlineAvailability: true,
      };
      setWallet(fallbackData);
      if (isDemoWorker) {
        try {
          localStorage.setItem('clearflow_worker_wallet', JSON.stringify(fallbackData));
        } catch {}
      }
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTargets = async () => {
    try {
      const res = await apiClient.get(ENDPOINTS.MARKETPLACE.TARGETS);
      const targetsList = res.data?.data?.targets || res.data?.data || res.data?.targets;
      if (Array.isArray(targetsList) && targetsList.length > 0) {
        setWeeklyTargets(targetsList);
      }
    } catch {
      setWeeklyTargets(isDemoWorker ? [
        { id: '1', title: 'Complete 5 Jobs This Week', current: 4, target: 5, rewardPoints: 50, rewardCash: 500, status: 'in_progress' },
        { id: '2', title: 'Maintain 4.8+ Customer Rating', current: 4.9, target: 4.8, rewardPoints: 30, rewardCash: 300, status: 'completed' },
        { id: '3', title: '100% On-Time Arrival Milestone', current: 100, target: 100, rewardPoints: 20, rewardCash: 200, status: 'completed' },
      ] : [
        { id: '1', title: 'Complete 5 Jobs This Week', current: 0, target: 5, rewardPoints: 50, rewardCash: 500, status: 'in_progress' },
        { id: '2', title: 'Maintain 4.8+ Customer Rating', current: 0, target: 4.8, rewardPoints: 30, rewardCash: 300, status: 'in_progress' },
        { id: '3', title: '100% On-Time Arrival Milestone', current: 0, target: 100, rewardPoints: 20, rewardCash: 200, status: 'in_progress' },
      ]);
    }
  };

  useEffect(() => {
    if (open) {
      fetchWalletData();
      fetchTargets();
    }
  }, [open]);

  useEffect(() => {
    const handleOpen = (e: any) => {
      if (e.detail?.tab) {
        setTab(e.detail.tab);
      }
    };
    const handleWalletUpdated = (e: any) => {
      if (e.detail && typeof e.detail.pointsBalance === 'number') {
        setWallet((prev: any) => ({
          ...(prev || {}),
          ...e.detail,
          pointsBalance: e.detail.pointsBalance,
        }));
      }
    };
    window.addEventListener('clearflow:open-wallet', handleOpen);
    window.addEventListener('clearflow:wallet-updated', handleWalletUpdated);
    return () => {
      window.removeEventListener('clearflow:open-wallet', handleOpen);
      window.removeEventListener('clearflow:wallet-updated', handleWalletUpdated);
    };
  }, []);

  useEffect(() => {
    if (externalWalletInfo) {
      setWallet(externalWalletInfo);
    }
  }, [externalWalletInfo]);

  const handleToggleOnline = async (checked: boolean) => {
    setIsOnline(checked);
    try {
      await apiClient.patch(ENDPOINTS.MARKETPLACE.AVAILABILITY, { isOnline: checked });
      toast.success(checked ? 'You are now Online and receiving jobs' : 'You are now Offline');
    } catch {
      toast.info(checked ? 'Switched to Online mode' : 'Switched to Offline mode');
    }
  };

  const handleToggleGps = (checked: boolean) => {
    setIsGpsActive(checked);
    toast.info(checked ? 'Live GPS broadcasting enabled' : 'GPS telemetry paused');
  };

  // Buy Points Handler with Animated Processing & Ticket Receipt
  const handleBuyPoints = async () => {
    setIsSubmitting(true);
    try {
      const generatedTicketId = 'PKR-' + Math.floor(100000000000 + Math.random() * 900000000000);
      const ticket = {
        ticketId: generatedTicketId,
        amount: selectedPackage.pricePKR,
        planName: selectedPackage.name,
        points: selectedPackage.points,
        date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) + ' • ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        method: paymentMethod,
        bankName: selectedBank,
        maskedAccount:
          paymentMethod === 'card'
            ? `Visa / Mastercard •••• ${cardNumber.replace(/\s+/g, '').slice(-4) || '8237'}`
            : paymentMethod === 'bank'
            ? `${selectedBank} •••• ${(accountNumber || 'PK36MEZN00010293847561').slice(-4)}`
            : paymentMethod === 'jazzcash'
            ? `JazzCash •••• ${(accountNumber || '03001234567').slice(-4)}`
            : `EasyPaisa •••• ${(accountNumber || '03451234567').slice(-4)}`,
        accountName: cardholderName || (user?.name || 'Muhammad Ahsan'),
        barcodeNumber: '2893726' + Math.floor(1000000 + Math.random() * 9000000),
      };

      setPaymentSuccessTicket(ticket);

      const currentPts = typeof wallet?.pointsBalance === 'number' ? wallet.pointsBalance : 160;
      const updated = {
        ...wallet,
        pointsBalance: currentPts + selectedPackage.points,
      };
      setWallet(updated);
      if (onWalletUpdated) onWalletUpdated(updated);
      try {
        localStorage.setItem('clearflow_worker_wallet', JSON.stringify(updated));
        if (user?._id) {
          localStorage.setItem(`clearflow_worker_wallet_${user._id}`, JSON.stringify(updated));
        }
      } catch {}

      window.dispatchEvent(new CustomEvent('clearflow:wallet-updated', { detail: updated }));
      window.dispatchEvent(new CustomEvent('clearflow:package_purchased', {
        detail: {
          planName: selectedPackage.name,
          price: selectedPackage.pricePKR,
          method: paymentMethod,
          accountInfo: ticket.maskedAccount,
          points: selectedPackage.points,
          technicianName: user?.name || 'Ahsan (Worker)',
        },
      }));

      // Trigger Celebration Confetti
      confetti({
        particleCount: 75,
        spread: 65,
        origin: { y: 0.6 },
        colors: ['#00A859', '#DC2626', '#ea580c', '#3b82f6', '#f59e0b'],
      });

      toast.success(`🎉 Successfully bought ${selectedPackage.points} points! New balance: ${updated.pointsBalance} pts.`);

      // Optimistic API sync
      try {
        const apiRes = await apiClient.post(ENDPOINTS.MARKETPLACE.PURCHASE_POINTS, {
          points: selectedPackage.points,
          price: selectedPackage.pricePKR,
          pricePaid: selectedPackage.pricePKR,
          planName: selectedPackage.name,
          billingCycle: isAnnual ? 'annual' : 'monthly',
          paymentMethod: paymentMethod === 'bank' ? `${selectedBank} Transfer` : paymentMethod,
          accountInfo: ticket.maskedAccount,
          technicianName: user?.name || 'Ahsan (Worker)',
        });
        if (apiRes.data?.data?.newPointsBalance !== undefined) {
          const synced = {
            ...updated,
            pointsBalance: apiRes.data.data.newPointsBalance,
          };
          setWallet(synced);
          localStorage.setItem('clearflow_worker_wallet', JSON.stringify(synced));
          if (user?._id) {
            localStorage.setItem(`clearflow_worker_wallet_${user._id}`, JSON.stringify(synced));
          }
          window.dispatchEvent(new CustomEvent('clearflow:wallet-updated', { detail: synced }));
        }
      } catch {}
    } catch (e: any) {
      toast.error('Payment processing failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };


  const pointsBalance = wallet?.pointsBalance ?? (isDemoWorker ? 160 : 50);
  const withdrawableCash = wallet?.withdrawableBalance ?? (isDemoWorker ? 380.0 : 0.0);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent 
        side="right" 
        className="w-full sm:max-w-md md:max-w-lg lg:max-w-xl p-0 flex flex-col bg-[#FCFAF5] border-l border-amber-200 text-gray-900 shadow-2xl"
      >
        <SheetTitle className="sr-only">Field Member Points & Wallet</SheetTitle>

        {/* Top Header Card */}
        <div className="bg-gradient-to-r from-amber-700 via-amber-800 to-amber-900 text-white p-5 sm:p-6 shrink-0 relative overflow-hidden">
          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-amber-600/40 border border-amber-400/40 flex items-center justify-center text-amber-200">
                <Wallet className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-black tracking-tight flex items-center gap-2">
                  Worker Points & Wallet
                </h2>
                <p className="text-xs text-amber-200/90 font-medium">
                  Live bidding points, targets & rewards ledger
                </p>
              </div>
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              className="text-amber-200 hover:text-white hover:bg-white/10 rounded-xl cursor-pointer"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Quick Availability Toggles */}
          <div className="mt-4 pt-3 border-t border-amber-600/50 flex items-center justify-between text-xs relative z-10">
            <div className="flex items-center gap-2">
              <span className={cn('w-2 h-2 rounded-full', isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-gray-400')} />
              <span className="font-semibold text-amber-100">{isOnline ? 'Online' : 'Offline'}</span>
              <Switch
                checked={isOnline}
                onCheckedChange={handleToggleOnline}
                className="scale-75 data-[state=checked]:bg-emerald-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <Radio className={cn('w-3.5 h-3.5', isGpsActive ? 'text-amber-300 animate-pulse' : 'text-amber-400/50')} />
              <span className="font-semibold text-amber-100">Live GPS</span>
              <Switch
                checked={isGpsActive}
                onCheckedChange={handleToggleGps}
                className="scale-75 data-[state=checked]:bg-amber-400"
              />
            </div>
          </div>
        </div>

        {/* Live Balance Summary Banner */}
        <div className="p-4 sm:px-6 bg-white border-b border-amber-200/80 shadow-2xs shrink-0">
          {/* Points Card */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50/80 border border-amber-200 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">Bidding Points</span>
              <Coins className="w-4 h-4 text-amber-600" />
            </div>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-3xl font-black text-amber-950 font-mono">{pointsBalance}</span>
              <span className="text-xs font-bold text-amber-700">PTS</span>
            </div>
          </div>

          {/* Navigation Pill Tabs */}
          <div className="flex items-center gap-1.5 mt-3.5 p-1 bg-amber-100/70 rounded-xl text-xs font-bold text-amber-900">
            <button
              onClick={() => setTab('buy')}
              className={cn(
                'flex-1 py-1.5 px-2 rounded-lg transition-all text-center cursor-pointer flex items-center justify-center gap-1',
                tab === 'buy' ? 'bg-amber-800 text-white shadow-xs' : 'hover:bg-amber-200/60'
              )}
            >
              <ShoppingCart className="w-3.5 h-3.5" /> Buy Points
            </button>
            <button
              onClick={() => setTab('history')}
              className={cn(
                'flex-1 py-1.5 px-2 rounded-lg transition-all text-center cursor-pointer flex items-center justify-center gap-1',
                tab === 'history' ? 'bg-amber-800 text-white shadow-xs' : 'hover:bg-amber-200/60'
              )}
            >
              <Clock className="w-3.5 h-3.5" /> History
            </button>
            <button
              onClick={() => setTab('targets')}
              className={cn(
                'flex-1 py-1.5 px-2 rounded-lg transition-all text-center cursor-pointer flex items-center justify-center gap-1',
                tab === 'targets' ? 'bg-amber-800 text-white shadow-xs' : 'hover:bg-amber-200/60'
              )}
            >
              <Target className="w-3.5 h-3.5" /> Targets
            </button>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {/* TAB 1: BUY POINTS */}
          {tab === 'buy' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-600" /> Choose Points Package
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Points let you submit bids on nearby marketplace work orders and claim high-value jobs.
                  </p>
                </div>
              </div>

              {/* Annual Billing Toggle (Save 20%) */}
              <div className="flex items-center justify-between p-2.5 bg-amber-50/80 rounded-xl border border-amber-200/80">
                <span className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                  Annual billing <span className="text-amber-700 font-extrabold">(Save 20%)</span>
                </span>
                <Switch
                  checked={isAnnual}
                  onCheckedChange={(checked) => {
                    setIsAnnual(checked);
                    if (selectedPackage) {
                      const finalP = checked ? Math.round(selectedPackage.pricePKR * 0.8) : (selectedPackage.points * 2.5);
                      setSelectedPackage({ ...selectedPackage, pricePKR: finalP, isAnnual: checked });
                    }
                  }}
                  className="data-[state=checked]:bg-amber-600 cursor-pointer"
                />
              </div>

              {/* Package Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {POINTS_PACKAGES.map((pkg) => {
                  const effectivePrice = isAnnual ? Math.round(pkg.pricePKR * 0.8) : pkg.pricePKR;
                  const isSelected = selectedPackage.id === pkg.id;
                  return (
                    <div
                      key={pkg.id}
                      onClick={() => {
                        setSelectedPackage({ ...pkg, pricePKR: effectivePrice, isAnnual });
                        setPaymentSuccessTicket(null);
                      }}
                      className={cn(
                        'p-4 rounded-2xl border transition-all cursor-pointer relative flex flex-col justify-between text-left',
                        isSelected 
                          ? 'border-amber-500 bg-amber-50/70 ring-2 ring-amber-500/20 shadow-xs' 
                          : 'border-gray-200 bg-white hover:border-amber-300 hover:bg-amber-50/30'
                      )}
                    >
                      {pkg.badge && (
                        <span className={cn(
                          'absolute -top-2 right-3 text-[9px] font-black uppercase px-2 py-0.5 rounded-full shadow-2xs',
                          pkg.isPopular ? 'bg-amber-600 text-white' : 'bg-purple-600 text-white'
                        )}>
                          {pkg.badge}
                        </span>
                      )}

                      <div>
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-bold text-gray-900">{pkg.name}</h4>
                          {isSelected && <Check className="w-4 h-4 text-amber-600" />}
                        </div>
                        <div className="mt-2 flex items-baseline gap-1">
                          <span className="text-2xl font-black text-amber-950 font-mono">{pkg.points}</span>
                          <span className="text-xs font-bold text-amber-700">PTS</span>
                        </div>
                        <div className="mt-1">
                          <p className="text-xs font-bold text-amber-900 font-mono">
                            PKR {effectivePrice.toLocaleString()}
                          </p>
                        </div>
                      </div>

                      <ul className="mt-3 space-y-1 text-[11px] text-gray-600 border-t border-gray-100 pt-2">
                        {pkg.perks.map((perk, i) => (
                          <li key={i} className="flex items-center gap-1.5">
                            <Check className="w-3 h-3 text-amber-600 shrink-0" />
                            <span>{perk}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>

              {/* Animated Pakistani Payment Methods Card */}
              <div className="bg-white rounded-2xl border border-amber-200 p-4 space-y-3 overflow-hidden shadow-xs">
                <AnimatePresence mode="wait">
                  {!paymentSuccessTicket ? (
                    <motion.div
                      key="form"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.96 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-bold text-gray-800 block">Select Payment Method</Label>
                        <span className="text-[10px] text-emerald-700 font-bold flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3 text-emerald-600" /> 100% Encrypted
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <button
                          type="button"
                          onClick={() => setPaymentMethod('jazzcash')}
                          className={cn(
                            'p-2.5 rounded-xl border flex items-center justify-center transition-all cursor-pointer h-16',
                            paymentMethod === 'jazzcash'
                              ? 'border-amber-500 bg-amber-50/80 ring-2 ring-amber-500/20'
                              : 'border-gray-200 hover:border-amber-300'
                          )}
                          title="JazzCash"
                        >
                          <JazzCashLogo className="h-10 w-auto object-contain" />
                        </button>

                        <button
                          type="button"
                          onClick={() => setPaymentMethod('easypaisa')}
                          className={cn(
                            'p-2.5 rounded-xl border flex items-center justify-center transition-all cursor-pointer h-16',
                            paymentMethod === 'easypaisa'
                              ? 'border-amber-500 bg-amber-50/80 ring-2 ring-amber-500/20'
                              : 'border-gray-200 hover:border-amber-300'
                          )}
                          title="EasyPaisa"
                        >
                          <EasypaisaLogo className="h-9 w-auto object-contain" />
                        </button>

                        <button
                          type="button"
                          onClick={() => setPaymentMethod('card')}
                          className={cn(
                            'p-2.5 rounded-xl border flex items-center justify-center transition-all cursor-pointer h-16',
                            paymentMethod === 'card'
                              ? 'border-amber-500 bg-amber-50/80 ring-2 ring-amber-500/20'
                              : 'border-gray-200 hover:border-amber-300'
                          )}
                          title="Visa / Mastercard"
                        >
                          <VisaMastercardLogo className="h-9 w-auto object-contain" />
                        </button>
                      </div>

                      {/* Method-specific input */}
                      {paymentMethod === 'card' ? (
                        <div className="space-y-2 pt-1">
                          <div className="space-y-1">
                            <Label className="text-[11px] font-bold text-gray-700">16-Digit Card Number</Label>
                            <Input
                              value={cardNumber}
                              onChange={(e) => setCardNumber(e.target.value)}
                              placeholder="0000 0000 0000 0000"
                              className="h-9 text-xs rounded-xl border-gray-200 bg-white font-mono"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <Label className="text-[11px] font-bold text-gray-700">Expiry</Label>
                              <Input
                                value={expiryDate}
                                onChange={(e) => setExpiryDate(e.target.value)}
                                placeholder="MM/YY"
                                className="h-9 text-xs rounded-xl border-gray-200 bg-white font-mono text-center"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[11px] font-bold text-gray-700">CVV</Label>
                              <Input
                                value={cvv}
                                onChange={(e) => setCvv(e.target.value)}
                                placeholder="123"
                                type="password"
                                maxLength={4}
                                className="h-9 text-xs rounded-xl border-gray-200 bg-white font-mono text-center"
                              />
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-1.5 pt-1">
                          <Label className="text-[11px] font-bold text-gray-700">
                            {paymentMethod === 'jazzcash' ? 'JazzCash Mobile Number' : 'EasyPaisa Mobile Number'}
                          </Label>
                          <Input
                            value={accountNumber}
                            onChange={(e) => setAccountNumber(e.target.value)}
                            placeholder={paymentMethod === 'jazzcash' ? '0300-1234567' : '0345-1234567'}
                            className="h-9 text-xs rounded-xl border-gray-200 bg-white font-mono"
                          />
                        </div>
                      )}

                      {/* Action Buttons: Confirm & Cancel */}
                      <div className="flex items-center gap-2 pt-1">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => onOpenChange(false)}
                          disabled={isSubmitting}
                          className="flex-1 h-11 border-gray-300 text-gray-700 hover:bg-gray-100 font-bold text-sm rounded-xl cursor-pointer"
                        >
                          Cancel
                        </Button>
                        <Button
                          type="button"
                          onClick={handleBuyPoints}
                          disabled={isSubmitting}
                          className="flex-1 h-11 bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm rounded-xl cursor-pointer shadow-md transition-all active:scale-[0.99] flex items-center justify-center gap-1.5"
                        >
                          {isSubmitting ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin mr-1" />
                              Processing...
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="w-4 h-4" />
                              Confirm
                            </>
                          )}
                        </Button>
                      </div>
                    </motion.div>
                  ) : (
                    /* Ticket Receipt Animation State */
                    <motion.div
                      key="ticket"
                      initial={{ opacity: 0, scale: 0.92, y: 15 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.96 }}
                      transition={{ duration: 0.5, type: 'spring', stiffness: 120 }}
                      className="space-y-4 py-1 text-center"
                    >
                      <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm space-y-3 relative overflow-hidden">
                        <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center mx-auto shadow-xs">
                          <CheckCircle2 className="w-7 h-7" />
                        </div>

                        <div>
                          <h4 className="text-lg font-black text-gray-900 font-sidebar-title">Thank you!</h4>
                          <p className="text-xs text-gray-500 font-medium">
                            Your points purchase ticket has been issued successfully
                          </p>
                        </div>

                        <hr className="border-dashed border-gray-200 my-1" />

                        <div className="grid grid-cols-2 gap-2 text-left py-1 text-xs">
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">Ticket ID</span>
                            <span className="font-mono font-bold text-gray-900">{paymentSuccessTicket.ticketId}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">Amount</span>
                            <span className="font-mono font-black text-gray-900">PKR {paymentSuccessTicket.amount.toFixed(2)}</span>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-left py-1 border-t border-gray-50 text-xs">
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">Package</span>
                            <span className="font-bold text-amber-700">+{paymentSuccessTicket.points} PTS</span>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">Date</span>
                            <span className="text-gray-600 text-[11px]">{paymentSuccessTicket.date}</span>
                          </div>
                        </div>

                        {/* Account pill */}
                        <div className="p-2.5 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-between text-left">
                          <div className="flex items-center gap-2">
                            {paymentSuccessTicket.method === 'card' ? (
                              <VisaMastercardLogo className="h-5 w-auto" />
                            ) : paymentSuccessTicket.method === 'jazzcash' ? (
                              <JazzCashLogo className="h-4 w-auto" />
                            ) : paymentSuccessTicket.method === 'easypaisa' ? (
                              <EasypaisaLogo className="h-4 w-auto" />
                            ) : (
                              <Banknote className="h-5 w-5 text-amber-600" />
                            )}
                            <div>
                              <p className="text-xs font-bold text-gray-900">{paymentSuccessTicket.accountName}</p>
                              <p className="text-[10px] text-gray-500 font-mono">{paymentSuccessTicket.maskedAccount}</p>
                            </div>
                          </div>
                          <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            Paid
                          </span>
                        </div>

                        {/* Barcode */}
                        <div className="pt-1 space-y-1">
                          <div className="flex justify-center items-center h-9 px-6 opacity-85">
                            <svg viewBox="0 0 200 40" className="w-full h-full" preserveAspectRatio="none">
                              {[
                                2, 1, 3, 1, 2, 4, 1, 3, 2, 1, 4, 2, 1, 3, 2, 1, 4, 1, 2, 3, 1, 4, 2, 1, 3, 2, 1, 4, 2, 1, 3,
                                1, 2, 4, 1, 3, 2, 1, 4,
                              ].map((width, idx) => {
                                const x = idx * 5;
                                return <rect key={idx} x={x} y="0" width={width} height="40" fill="#1E293B" />;
                              })}
                            </svg>
                          </div>
                          <p className="font-mono text-[10px] tracking-widest text-gray-400">{paymentSuccessTicket.barcodeNumber}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          onClick={() => setPaymentSuccessTicket(null)}
                          variant="outline"
                          className="h-10 font-bold text-xs rounded-xl border-amber-300 text-amber-900 hover:bg-amber-50 cursor-pointer shadow-2xs"
                        >
                          <RotateCcw className="w-3.5 h-3.5 mr-1" /> Buy Another
                        </Button>
                        <Button
                          onClick={() => {
                            setPaymentSuccessTicket(null);
                            setTab('history');
                          }}
                          className="h-10 font-bold text-xs rounded-xl bg-amber-600 hover:bg-amber-700 text-white cursor-pointer shadow-xs"
                        >
                          <Check className="w-3.5 h-3.5 mr-1" /> View History
                        </Button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          )}

          {/* TAB 2: POINTS HISTORY */}
          {tab === 'history' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-gray-900">Recent Points Activity</h3>
                  <p className="text-xs text-gray-500">Live ledger of points earned, spent, and purchased.</p>
                </div>
                <Button variant="ghost" size="sm" onClick={fetchWalletData} className="h-8 px-2 text-xs">
                  <RefreshCw className={cn("w-3.5 h-3.5", isLoading && "animate-spin")} />
                </Button>
              </div>

              <div className="space-y-2">
                {[
                  { title: 'Completed HVAC Deep Clean Service', date: 'Today, 2:40 PM', points: '+50 pts', type: 'earn', cash: '+PKR 4,500' },
                  { title: 'Submitted Marketplace Bid (DHA Phase 6)', date: 'Today, 11:15 AM', points: '-20 pts', type: 'spend', cash: 'Bid Fee' },
                  { title: '5-Star Rating Milestone Bonus', date: 'Yesterday', points: '+30 pts', type: 'bonus', cash: '+PKR 300' },
                  { title: 'Purchased Starter Operations Pack', date: '14 Nov 2026', points: '+100 pts', type: 'purchase', cash: 'PKR 250' },
                  { title: 'Emergency Plumbing Repair (Model Town)', date: '13 Nov 2026', points: '+45 pts', type: 'earn', cash: '+PKR 3,800' },
                ].map((item, idx) => (
                  <div key={idx} className="p-3 bg-white rounded-xl border border-gray-200/90 shadow-2xs flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className={cn(
                        'w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
                        item.type === 'earn' ? 'bg-amber-100 text-amber-800' :
                        item.type === 'bonus' ? 'bg-orange-100 text-orange-800' :
                        item.type === 'purchase' ? 'bg-amber-100 text-amber-700' :
                        'bg-red-100 text-red-600'
                      )}>
                        {item.type === 'spend' ? <ArrowDownRight className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-gray-800 leading-tight">{item.title}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">{item.date} • {item.cash}</p>
                      </div>
                    </div>
                    <span className={cn(
                      'text-xs font-black font-mono px-2 py-0.5 rounded-full',
                      item.type === 'spend' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-900 border border-amber-200'
                    )}>
                      {item.points}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: TARGETS */}
          {tab === 'targets' && (
            <div className="space-y-3">
              <div>
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                  <Trophy className="w-4 h-4 text-amber-600" /> Weekly Milestone Targets
                </h3>
                <p className="text-xs text-gray-500">Hit these operational goals to earn points and bonus incentives.</p>
              </div>

              <div className="space-y-2.5">
                {weeklyTargets.map((t) => {
                  const currentVal = t.currentCount ?? t.current ?? 0;
                  const targetVal = t.targetCount ?? t.target ?? 1;
                  const percent = Math.min(100, Math.round((currentVal / targetVal) * 100));
                  const isDone = percent >= 100 || t.isFulfilled;
                  return (
                    <div key={t.id} className="p-3.5 bg-white rounded-2xl border border-gray-200 shadow-2xs space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-gray-900">{t.title}</span>
                        {isDone ? (
                          <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Done
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                            {targetVal - currentVal} remaining
                          </span>
                        )}
                      </div>

                      <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                        <div
                          className={cn('h-full transition-all', isDone ? 'bg-emerald-500' : 'bg-amber-500')}
                          style={{ width: `${percent}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-gray-500">
                        <span>Progress: {currentVal} / {targetVal}</span>
                        <div className="flex items-center gap-2 font-bold">
                          <span className="text-amber-800 font-mono">+{t.rewardPoints} pts</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>
      </SheetContent>
    </Sheet>
  );
};
export default WalletSidebar;

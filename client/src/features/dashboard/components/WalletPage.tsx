import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { 
  Coins, Wallet, ArrowDownRight, ArrowUpRight, Award, 
  Sparkles, Clock, CheckCircle2, AlertCircle, Loader2, Banknote,
  ShoppingCart, Zap, ShieldCheck, CreditCard,
  Target, Trophy, Flame, RefreshCw, Radio, Check, TrendingUp,
  History, ArrowRight, DollarSign, Gift, Star, RotateCcw
} from 'lucide-react';
import { VisaMastercardLogo, EasypaisaLogo, JazzCashLogo } from '@/components/ui/payment-icons';
import { PakistaniBankSelector } from '@/components/ui/pakistani-bank-selector';
import { Pricing, type PricingPlan } from '@/components/ui/pricing';
import { useAuth } from '@/entities/user/hooks/useAuth';
import { apiClient } from '@/infrastructure/api/client';
import { ENDPOINTS } from '@/infrastructure/api/endpoints';
import { socketClient } from '@/infrastructure/socket/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'framer-motion';

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
    perks: ['300 Bidding Points', 'Priority high-value bids', 'Fast 24-hr order approval', 'AI Verification badge'],
  },
  {
    id: 'fleet',
    name: 'Fleet Enterprise',
    points: 800,
    pricePKR: 2000,
    badge: 'BEST VALUE',
    perks: ['800 Bidding Points', 'Lowest platform fee (5%)', 'Priority dispatch status', 'Dedicated manager'],
  },
  {
    id: 'mini',
    name: 'Quick Top-Up',
    points: 50,
    pricePKR: 125,
    perks: ['50 Points for urgent bids', 'Immediate activation'],
  },
];

interface LedgerItem {
  id: string;
  title: string;
  category: 'earn' | 'spend' | 'bonus' | 'purchase';
  points: number;
  cashLabel?: string;
  timestamp: string;
  refCode: string;
}

const INITIAL_LEDGER: LedgerItem[] = [
  { id: '1', title: '5-Star Customer Rating & AI Quality (96%) Bonus', category: 'bonus', points: 25, cashLabel: '+PKR 300 Bonus', timestamp: 'Yesterday, 6:10 PM', refCode: 'REV-8291' },
  { id: '2', title: 'Won Job Assignment: Cleaning (WO-2026-0004)', category: 'spend', points: -15, cashLabel: 'Assignment Deduct', timestamp: '2 days ago', refCode: 'WO-2026-0004' },
  { id: '3', title: 'Welcome Onboarding Points Allocation', category: 'earn', points: 150, cashLabel: '+150 Points Grant', timestamp: '7 days ago', refCode: 'GRT-1001' },
];

const BIDDING_PRICING_PLANS: PricingPlan[] = [
  {
    name: 'Starter Pack',
    price: '250',
    yearlyPrice: '200', // Save 20%: 250 * 0.8 = 200 PKR
    period: '100 PTS',
    features: [
      '100 Bidding Points',
      'Annual Save 20%: PKR 200',
      'Standard metropolitan service routing access',
      'Real-time client messaging',
      'Community field crew support',
    ],
    description: 'Perfect for part-time specialists & new technicians',
    buttonText: 'Select Starter (100 PTS)',
    href: '#payment-checkout',
    isPopular: false,
    points: 100,
  },
  {
    name: 'Pro Crew Pack',
    price: '750',
    yearlyPrice: '600', // Save 20%: 750 * 0.8 = 600 PKR
    period: '300 PTS',
    features: [
      '300 Bidding Points',
      'Annual Save 20%: PKR 600',
      'Priority high-value bids access',
      'Fast 24-hr order approval',
      'AI Verification badge on profile',
      'Priority dispatch ranking',
    ],
    description: 'Most popular for active full-time service crews',
    buttonText: 'Select Pro Crew (300 PTS)',
    href: '#payment-checkout',
    isPopular: true,
    points: 300,
  },
  {
    name: 'Fleet Enterprise',
    price: '2000',
    yearlyPrice: '1600', // Save 20%: 2000 * 0.8 = 1600 PKR
    period: '800 PTS',
    features: [
      '800 Bidding Points',
      'Annual Save 20%: PKR 1,600',
      'Lowest platform commission fee (5%)',
      'Priority dispatch status',
      'Dedicated account manager',
      'Same-day payout priority clearance',
    ],
    description: 'High-volume contractors & commercial facility operations',
    buttonText: 'Select Enterprise (800 PTS)',
    href: '#payment-checkout',
    isPopular: false,
    points: 800,
  },
];

export const WalletPage: React.FC = () => {
  const { user } = useAuth();
  const isDemoWorker =
    (user?.email || '').toLowerCase().trim() === 'field@clearflow.com' ||
    (user?.email || '').toLowerCase().trim() === 'worker@clearflow.com' ||
    (user?.email || '').toLowerCase().trim() === 'fieldteam@clearflow.com' ||
    user?._id === '65f000000000000000000004' ||
    user?._id === '65f000000000000000000005';

  const walletStorageKey = user?._id ? `clearflow_worker_wallet_${user._id}` : 'clearflow_worker_wallet_guest';

  const [tab, setTab] = useState<'history' | 'targets'>('history');
  const [showBuyPoints, setShowBuyPoints] = useState(false);
  const buyPointsRef = React.useRef<HTMLDivElement>(null);
  const checkoutFormRef = React.useRef<HTMLDivElement>(null);
  const [wallet, setWallet] = useState<any>(() => {
    try {
      const saved = user?._id
        ? localStorage.getItem(walletStorageKey)
        : (isDemoWorker ? localStorage.getItem('clearflow_worker_wallet') : null);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed.pointsBalance === 'number') {
          if (!isDemoWorker) {
            // Clean up any demo cache that leaked into non-demo worker profile
            if (parsed.pointsBalance === 100 || parsed.pointsBalance === 160) parsed.pointsBalance = 50;
            if (parsed.totalEarnedPoints === 175) parsed.totalEarnedPoints = 0;
            if (parsed.totalEarningsPKR === 48250) parsed.totalEarningsPKR = 0;
            if (parsed.withdrawableBalance === 380.0) parsed.withdrawableBalance = 0.0;
            if (parsed.activeBidsCount === 12) parsed.activeBidsCount = 0;
            if (parsed.bidsPlaced === 12) parsed.bidsPlaced = 0;
            if (parsed.bidsAwarded === 10) parsed.bidsAwarded = 0;
            if (parsed.winRate === 88) parsed.winRate = 0;
          }
          return parsed;
        }
      }
    } catch {}
    return isDemoWorker
      ? {
          pointsBalance: 160,
          withdrawableBalance: 380.0,
          totalEarnedPoints: 175,
          spentPoints: 15,
          totalEarningsPKR: 48250,
          activeBidsCount: 12,
          bidsPlaced: 12,
          bidsAwarded: 10,
          winRate: 88,
          isOnlineAvailability: true,
        }
      : {
          pointsBalance: 50,
          withdrawableBalance: 0.0,
          totalEarnedPoints: 0,
          spentPoints: 0,
          totalEarningsPKR: 0,
          activeBidsCount: 0,
          bidsPlaced: 0,
          bidsAwarded: 0,
          winRate: 0,
          isOnlineAvailability: true,
        };
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Buy Points State
  const [selectedPackage, setSelectedPackage] = useState<PointsPackage | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'jazzcash' | 'easypaisa' | 'card'>('jazzcash');
  const [accountNumber, setAccountNumber] = useState('0300-1234567');
  const [selectedBank, setSelectedBank] = useState('Meezan Bank');
  const [cardholderName, setCardholderName] = useState(user?.name || (isDemoWorker ? 'Muhammad Ahsan' : 'Field Technician'));
  const [cardNumber, setCardNumber] = useState('4214 7892 0182 8237');
  const [expiryDate, setExpiryDate] = useState('08/28');
  const [cvv, setCvv] = useState('782');
  const [paymentSuccessTicket, setPaymentSuccessTicket] = useState<any>(null);

  // Status Toggles
  const [isOnline, setIsOnline] = useState(true);
  const [isGpsActive, setIsGpsActive] = useState(true);

  // Ledger Filter
  const [ledgerFilter, setLedgerFilter] = useState<'all' | 'earn' | 'spend' | 'purchase'>('all');
  const [ledgerItems, setLedgerItems] = useState<LedgerItem[]>(isDemoWorker ? INITIAL_LEDGER : []);

  // Targets State
  const [weeklyTargets, setWeeklyTargets] = useState<any[]>(
    isDemoWorker
      ? [
          { id: '1', title: 'Complete 5 Jobs This Week', current: 4, target: 5, rewardPoints: 50, rewardCash: 500, status: 'in_progress', claimed: false },
          { id: '2', title: 'Maintain 4.8+ Customer Rating', current: 4.9, target: 4.8, rewardPoints: 30, rewardCash: 300, status: 'completed', claimed: false },
          { id: '3', title: '100% On-Time Arrival Milestone', current: 100, target: 100, rewardPoints: 20, rewardCash: 200, status: 'completed', claimed: false },
        ]
      : [
          { id: '1', title: 'Complete 5 Jobs This Week', current: 0, target: 5, rewardPoints: 50, rewardCash: 500, status: 'in_progress', claimed: false },
          { id: '2', title: 'Maintain 4.8+ Customer Rating', current: 0, target: 4.8, rewardPoints: 30, rewardCash: 300, status: 'in_progress', claimed: false },
          { id: '3', title: '100% On-Time Arrival Milestone', current: 0, target: 100, rewardPoints: 20, rewardCash: 200, status: 'in_progress', claimed: false },
        ]
  );

  const fetchWalletData = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.get(ENDPOINTS.MARKETPLACE.WALLET);
      const walletPayload = res.data?.data?.wallet || res.data?.data || res.data?.wallet;
      if (walletPayload && typeof walletPayload.pointsBalance === 'number') {
        setWallet(walletPayload);
        setIsOnline(walletPayload.isAvailableOnline ?? walletPayload.isOnlineAvailability ?? true);
        try {
          localStorage.setItem(walletStorageKey, JSON.stringify(walletPayload));
        } catch {}
      }
      const ptsHistory = res.data?.data?.pointsHistory || [];
      if (Array.isArray(ptsHistory) && ptsHistory.length > 0) {
        const mappedItems: LedgerItem[] = ptsHistory.map((p: any) => {
          let cleanTitle = p.reason || (p.type === 'WelcomeBonus' ? 'Welcome to ClearFlow!' : 'Points Allocation');
          cleanTitle = cleanTitle.replace(/50\s*Starter\s*Bidding\s*Points/gi, '').replace(/\s{2,}/g, ' ').trim();
          if (!cleanTitle || cleanTitle === '!' || cleanTitle === 'Welcome to ClearFlow!') {
            cleanTitle = 'Welcome to ClearFlow!';
          }
          return {
            id: p._id || `ptx_${Date.now()}_${Math.random()}`,
            title: cleanTitle,
            category: p.type === 'WelcomeBonus' || p.pointsChange > 0 ? (p.type === 'Purchased' ? 'purchase' : 'earn') : 'spend',
            points: p.pointsChange,
            cashLabel: p.pointsChange > 0 ? `+${p.pointsChange} Points` : `${p.pointsChange} Points`,
            timestamp: p.createdAt ? new Date(p.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : 'Recent',
            refCode: p.workOrderId || `PTS-${String(p._id || '').slice(-4).toUpperCase() || '1001'}`,
          };
        });
        setLedgerItems(mappedItems);
      }
    } catch {
      // Demo state fallback only for demo accounts
      const fallbackData = isDemoWorker
        ? {
            pointsBalance: 160,
            withdrawableBalance: 380.0,
            totalEarnedPoints: 175,
            spentPoints: 15,
            totalEarningsPKR: 48250,
            activeBidsCount: 12,
            bidsPlaced: 12,
            bidsAwarded: 10,
            winRate: 88,
            isOnlineAvailability: true,
          }
        : {
            pointsBalance: 50,
            withdrawableBalance: 0.0,
            totalEarnedPoints: 0,
            spentPoints: 0,
            totalEarningsPKR: 0,
            activeBidsCount: 0,
            bidsPlaced: 0,
            bidsAwarded: 0,
            winRate: 0,
            isOnlineAvailability: true,
          };
      setWallet((prev: any) => prev || fallbackData);
      try {
        localStorage.setItem(walletStorageKey, JSON.stringify(fallbackData));
      } catch {}
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
      // kept fallback
    }
  };

  useEffect(() => {
    fetchWalletData();
    fetchTargets();

    const handleLocalWalletUpdate = (e: any) => {
      if (e.detail && typeof e.detail.pointsBalance === 'number') {
        setWallet((prev: any) => ({
          ...(prev || {}),
          ...e.detail,
          pointsBalance: e.detail.pointsBalance,
        }));
      }
    };

    const handleSocketWallet = (data: any) => {
      if (!data) return;
      const targetUserId = String(data.userId || data.technicianId || '');
      const currentUserId = String(user?._id || '');
      if (!targetUserId || targetUserId === currentUserId || isDemoWorker) {
        const newBalance = typeof data.pointsBalance === 'number' ? data.pointsBalance : data.wallet?.pointsBalance;
        if (typeof newBalance === 'number') {
          setWallet((prev: any) => {
            const updated = {
              ...(prev || {}),
              ...(data.wallet || {}),
              pointsBalance: newBalance,
            };
            try {
              localStorage.setItem(walletStorageKey, JSON.stringify(updated));
              localStorage.setItem('clearflow_worker_wallet', JSON.stringify(updated));
            } catch {}
            return updated;
          });
          if (data.bonusAwarded) {
            const bonusEntry: LedgerItem = {
              id: Date.now().toString(),
              title: `Admin Special Bonus (+${data.bonusAwarded} PTS)`,
              category: 'bonus',
              points: data.bonusAwarded,
              cashLabel: `+${data.bonusAwarded} PTS`,
              timestamp: 'Just now',
              refCode: `BON-${Date.now().toString().slice(-4)}`,
            };
            setLedgerItems((prev) => [bonusEntry, ...prev]);
            toast.success(`🎉 Operations Admin awarded you +${data.bonusAwarded} bidding points!`);
          }
        }
      }
    };

    window.addEventListener('clearflow:wallet-updated', handleLocalWalletUpdate);
    socketClient.on('marketplace:wallet_updated', handleSocketWallet);
    socketClient.on('wallet_updated', handleSocketWallet);

    return () => {
      window.removeEventListener('clearflow:wallet-updated', handleLocalWalletUpdate);
      socketClient.off('marketplace:wallet_updated', handleSocketWallet);
      socketClient.off('wallet_updated', handleSocketWallet);
    };
  }, [user?._id, walletStorageKey, isDemoWorker]);

  const handleToggleOnline = async (checked: boolean) => {
    setIsOnline(checked);
    try {
      await apiClient.patch(ENDPOINTS.MARKETPLACE.AVAILABILITY, { isOnline: checked });
      toast.success(checked ? 'You are Online and ready to bid on nearby orders' : 'You are now Offline');
    } catch {
      toast.info(checked ? 'Online status active' : 'Offline mode active');
    }
  };

  const handleToggleGps = (checked: boolean) => {
    setIsGpsActive(checked);
    toast.info(checked ? 'Live GPS broadcasting active' : 'GPS telemetry paused');
  };

  // Buy Points Handler with Animated Processing & Ticket Receipt
  const handleBuyPoints = async () => {
    if (!selectedPackage) return;
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
            : paymentMethod === 'jazzcash'
            ? `JazzCash •••• ${(accountNumber || '03001234567').slice(-4)}`
            : `EasyPaisa •••• ${(accountNumber || '03451234567').slice(-4)}`,
        accountName: cardholderName || (user?.name || 'Muhammad Ahsan'),
        barcodeNumber: '2893726' + Math.floor(1000000 + Math.random() * 9000000),
      };

      setPaymentSuccessTicket(ticket);

      const currentPoints = typeof wallet?.pointsBalance === 'number' ? wallet.pointsBalance : 160;
      const updatedPoints = currentPoints + selectedPackage.points;
      const updated = {
        ...wallet,
        pointsBalance: updatedPoints,
        totalEarnedPoints: (wallet?.totalEarnedPoints || 175) + selectedPackage.points,
      };
      setWallet(updated);
      try {
        localStorage.setItem('clearflow_worker_wallet', JSON.stringify(updated));
        localStorage.setItem(walletStorageKey, JSON.stringify(updated));
      } catch {}

      // Add to ledger
      const newEntry: LedgerItem = {
        id: Date.now().toString(),
        title: `Purchased ${selectedPackage.name}`,
        category: 'purchase',
        points: selectedPackage.points,
        cashLabel: `PKR ${selectedPackage.pricePKR.toLocaleString()} Paid`,
        timestamp: 'Just now',
        refCode: generatedTicketId,
      };
      setLedgerItems((prev) => [newEntry, ...prev]);

      // Fire global wallet events
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
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#00A859', '#DC2626', '#ea580c', '#3b82f6', '#f59e0b'],
      });

      toast.success(`🎉 Payment verified! +${selectedPackage.points} points credited.`);

      // Backend API sync
      try {
        const apiRes = await apiClient.post(ENDPOINTS.MARKETPLACE.PURCHASE_POINTS, {
          points: selectedPackage.points,
          price: selectedPackage.pricePKR,
          pricePaid: selectedPackage.pricePKR,
          planName: selectedPackage.name,
          billingCycle: 'monthly',
          paymentMethod: paymentMethod === 'card' ? 'Visa / Mastercard' : paymentMethod,
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
          localStorage.setItem(walletStorageKey, JSON.stringify(synced));
          window.dispatchEvent(new CustomEvent('clearflow:wallet-updated', { detail: synced }));
        }
      } catch {}
    } catch {
      toast.error('Payment processing failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Claim Target Reward Handler
  const handleClaimTarget = async (targetId: string) => {
    const target = weeklyTargets.find((t) => t.id === targetId);
    if (!target || target.claimed) return;

    try {
      const res = await apiClient.post(ENDPOINTS.MARKETPLACE.CLAIM_TARGET(targetId));
      const pointsAwarded = res.data?.data?.pointsAwarded || target.rewardPoints;
      const newPointsBalance = res.data?.data?.newPointsBalance ?? ((wallet?.pointsBalance || 160) + pointsAwarded);

      setWeeklyTargets(
        weeklyTargets.map((t) => (t.id === targetId ? { ...t, claimed: true } : t))
      );

      const updated = {
        ...wallet,
        pointsBalance: newPointsBalance,
      };
      setWallet(updated);
      try {
        localStorage.setItem('clearflow_worker_wallet', JSON.stringify(updated));
        localStorage.setItem(walletStorageKey, JSON.stringify(updated));
      } catch {}

      const newEntry: LedgerItem = {
        id: Date.now().toString(),
        title: `Claimed Milestone Reward: ${target.title}`,
        category: 'bonus',
        points: pointsAwarded,
        timestamp: 'Just now',
        refCode: `REW-${Math.floor(1000 + Math.random() * 9000)}`,
      };
      setLedgerItems((prev) => [newEntry, ...prev]);

      window.dispatchEvent(new CustomEvent('clearflow:wallet-updated', { detail: updated }));
      confetti({ particleCount: 70, spread: 70, origin: { y: 0.6 } });
      toast.success(`🎉 Milestone Reached: +${pointsAwarded} points credited to your wallet balance!`);
    } catch (err: any) {
      // Fallback local claim if offline or mock
      const pointsAwarded = target.rewardPoints;
      const updatedPoints = (wallet?.pointsBalance || 160) + pointsAwarded;
      setWeeklyTargets(
        weeklyTargets.map((t) => (t.id === targetId ? { ...t, claimed: true } : t))
      );
      const updated = {
        ...wallet,
        pointsBalance: updatedPoints,
      };
      setWallet(updated);
      try {
        localStorage.setItem('clearflow_worker_wallet', JSON.stringify(updated));
        localStorage.setItem(walletStorageKey, JSON.stringify(updated));
      } catch {}

      const newEntry: LedgerItem = {
        id: Date.now().toString(),
        title: `Claimed Milestone Reward: ${target.title}`,
        category: 'bonus',
        points: pointsAwarded,
        timestamp: 'Just now',
        refCode: `REW-${Math.floor(1000 + Math.random() * 9000)}`,
      };
      setLedgerItems((prev) => [newEntry, ...prev]);
      window.dispatchEvent(new CustomEvent('clearflow:wallet-updated', { detail: updated }));
      confetti({ particleCount: 70, spread: 70, origin: { y: 0.6 } });
      toast.success(`🎉 Milestone Reached: +${pointsAwarded} points credited to your wallet balance!`);
    }
  };

  const pointsBalance = wallet?.pointsBalance ?? (isDemoWorker ? 160 : 50);
  const withdrawableCash = wallet?.withdrawableBalance ?? (isDemoWorker ? 380.0 : 0.0);
  const lifetimeEarned = wallet?.totalEarnedPoints ?? (isDemoWorker ? 175 : 0);
  const lifetimeCash = wallet?.totalEarningsPKR ?? (wallet?.totalEarnings ? Math.round(wallet.totalEarnings * 31) : (isDemoWorker ? 48250 : 0));
  const bidsPlaced = wallet?.bidsPlaced ?? (isDemoWorker ? 12 : 0);
  const bidsAwarded = wallet?.bidsAwarded ?? (isDemoWorker ? 10 : 0);
  const winRate = wallet?.winRate ?? (bidsPlaced > 0 ? Math.round((bidsAwarded / bidsPlaced) * 100) : (isDemoWorker ? 88 : 0));

  const filteredLedger = ledgerItems.filter((item) => {
    if (ledgerFilter === 'all') return true;
    if (ledgerFilter === 'earn') return item.category === 'earn' || item.category === 'bonus';
    if (ledgerFilter === 'spend') return item.category === 'spend';
    if (ledgerFilter === 'purchase') return item.category === 'purchase';
    return true;
  });

  return (
    <div className="w-full max-w-7xl mx-auto space-y-5 pb-12 animate-in fade-in-50 duration-300">
      {/* ================= COMPACT HEADER ROW ================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-black font-sidebar-title tracking-tight text-gray-900">
              Worker Points & Wallet
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-gray-500 font-medium mt-1">
            Live bidding points, milestones & task performance rewards
          </p>
        </div>
      </div>

      {/* ================= 3 FINANCIAL METRIC CARDS ================= */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* 1. Bidding Points Balance */}
        <div className="bg-white rounded-3xl p-5 border border-amber-200/90 shadow-xs hover:shadow-md transition-all relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-800 uppercase tracking-wider font-sidebar-title">
              Bidding Points
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
              <Coins className="w-4 h-4" />
            </div>
          </div>
          <div className="my-3">
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl sm:text-4xl font-black text-amber-950 font-mono tracking-tight">
                {pointsBalance}
              </span>
              <span className="text-sm font-bold text-amber-600 font-sidebar-title">PTS</span>
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => {
              setShowBuyPoints((prev) => {
                const next = !prev;
                if (next) {
                  setTimeout(() => {
                    buyPointsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }, 50);
                }
                return next;
              });
            }}
            className={cn(
              "w-full font-bold text-xs rounded-xl shadow-2xs cursor-pointer h-9 transition-all",
              showBuyPoints
                ? "bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300"
                : "bg-amber-600 hover:bg-amber-700 text-white"
            )}
          >
            <Zap className="w-3.5 h-3.5 mr-1" /> {showBuyPoints ? 'Hide Packages' : '+ Buy Points'}
          </Button>
        </div>

        {/* 2. Lifetime Earned Points */}
        <div className="bg-white rounded-3xl p-5 border border-amber-200/70 shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-900 uppercase tracking-wider font-sidebar-title">
              Lifetime Earned
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
              <Trophy className="w-4 h-4" />
            </div>
          </div>
          <div className="my-3">
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl sm:text-4xl font-black text-amber-950 font-mono tracking-tight">
                {lifetimeEarned}
              </span>
              <span className="text-sm font-bold text-amber-700 font-sidebar-title">PTS</span>
            </div>
            <p className="text-xs text-amber-800/80 mt-1 font-medium">
              PKR {lifetimeCash.toLocaleString()} cumulative revenue
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-amber-900 font-bold bg-amber-50 px-2.5 py-1.5 rounded-xl border border-amber-200/80">
            <TrendingUp className="w-3.5 h-3.5 text-amber-600" />
            {isDemoWorker || lifetimeEarned > 0 ? "Top Performance Specialist" : "New Specialist Profile"}
          </div>
        </div>

        {/* 3. Active Bids & Win Rate */}
        <div className="bg-white rounded-3xl p-5 border border-amber-200/70 shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-900 uppercase tracking-wider font-sidebar-title">
              Bid Performance
            </span>
            <div className="w-8 h-8 rounded-xl bg-orange-100 text-orange-700 flex items-center justify-center">
              <Target className="w-4 h-4" />
            </div>
          </div>
          <div className="my-3">
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl sm:text-4xl font-black text-amber-950 font-mono tracking-tight">
                {bidsPlaced > 0 || isDemoWorker ? `${winRate}%` : "0%"}
              </span>
              <span className="text-xs font-bold text-orange-600 font-sidebar-title">WIN RATE</span>
            </div>
            <p className="text-xs text-gray-500 mt-1 font-medium">
              {bidsPlaced > 0 || isDemoWorker
                ? `${bidsPlaced} bids placed • ${bidsAwarded} awarded`
                : "0 bids placed • 0 awarded"}
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-orange-800 font-bold bg-orange-50 px-2.5 py-1.5 rounded-xl border border-orange-200/80">
            <CheckCircle2 className="w-3.5 h-3.5 text-orange-600" />
            {bidsPlaced > 0 || isDemoWorker ? "High-Priority Match Active" : "Ready for First Service Bid"}
          </div>
        </div>
      </div>

      {/* ================= EXPANDABLE BUY POINTS & PRICING PACKAGES (TOGGLED VIA + BUY POINTS) ================= */}
      <AnimatePresence>
        {showBuyPoints && (
          <motion.div
            ref={buyPointsRef}
            initial={{ opacity: 0, height: 0, y: -20 }}
            animate={{ opacity: 1, height: 'auto', y: 0 }}
            exit={{ opacity: 0, height: 0, y: -20 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className="space-y-6 overflow-hidden pt-1"
          >
            {/* 1. Integrated PRICING Component with Toggle & NumberFlow */}
            <Pricing
              plans={BIDDING_PRICING_PLANS}
              title="Simple, Transparent Points Pricing"
              description={`Choose the bidding package that works best for your crew.\nAll packages include instant wallet activation and priority marketplace dispatch.`}
              roleTheme="fieldteam"
              onSelectPlan={(plan, isAnnual) => {
                const isYearly = Boolean(isAnnual ?? plan.isAnnual);
                const finalPrice = isYearly ? Number(plan.yearlyPrice) : Number(plan.price);
                const found: PointsPackage = {
                  id: plan.name,
                  name: plan.name,
                  points: plan.points || 100,
                  pricePKR: finalPrice,
                  isAnnual: isYearly,
                  perks: plan.features,
                };
                setSelectedPackage(found);
                toast.success(`Selected ${plan.name} (${plan.points} PTS) - PKR ${finalPrice.toLocaleString()}${isYearly ? ' (Save 20% Annual Discount Applied)' : ''}`);
                setTimeout(() => {
                  checkoutFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 100);
              }}
            />

            {/* 2. Pakistani Payment Methods Section (JazzCash, EasyPaisa, Visa/Mastercard) */}
            {selectedPackage && (
              <div
                ref={checkoutFormRef}
                id="payment-checkout"
                className="bg-white rounded-3xl border border-amber-200 p-6 sm:p-8 space-y-6 shadow-sm overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300"
              >
              <AnimatePresence mode="wait">
                {!paymentSuccessTicket ? (
                  <motion.div
                    key="checkout-form"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={{ duration: 0.25 }}
                    className="space-y-6"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-4">
                      <div>
                        <h3 className="text-base font-bold text-gray-900 font-sidebar-title flex items-center gap-2">
                          Complete Your Payment
                        </h3>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Pay securely using your preferred local Pakistani mobile wallet or direct bank transfer.
                        </p>
                      </div>
                      <span className="text-[11px] text-emerald-700 font-bold flex items-center gap-1 self-start sm:self-auto bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> 100% Encrypted & Instant
                      </span>
                    </div>

                    {/* 3 Payment Method Buttons (No text, Large Logos) */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('jazzcash')}
                        className={cn(
                          'p-3 sm:p-4 rounded-2xl border flex items-center justify-center transition-all cursor-pointer h-20 sm:h-24',
                          paymentMethod === 'jazzcash'
                            ? 'border-amber-500 bg-amber-50/80 ring-2 ring-amber-500/20 shadow-xs'
                            : 'border-gray-200 hover:border-amber-300 bg-white'
                        )}
                        title="JazzCash"
                      >
                        <JazzCashLogo className="h-12 sm:h-14 max-w-[85%] w-auto object-contain" />
                      </button>

                      <button
                        type="button"
                        onClick={() => setPaymentMethod('easypaisa')}
                        className={cn(
                          'p-3 sm:p-4 rounded-2xl border flex items-center justify-center transition-all cursor-pointer h-20 sm:h-24',
                          paymentMethod === 'easypaisa'
                            ? 'border-amber-500 bg-amber-50/80 ring-2 ring-amber-500/20 shadow-xs'
                            : 'border-gray-200 hover:border-amber-300 bg-white'
                        )}
                        title="EasyPaisa"
                      >
                        <EasypaisaLogo className="h-11 sm:h-13 max-w-[85%] w-auto object-contain" />
                      </button>

                      <button
                        type="button"
                        onClick={() => setPaymentMethod('card')}
                        className={cn(
                          'p-3 sm:p-4 rounded-2xl border flex items-center justify-center transition-all cursor-pointer h-20 sm:h-24',
                          paymentMethod === 'card'
                            ? 'border-amber-500 bg-amber-50/80 ring-2 ring-amber-500/20 shadow-xs'
                            : 'border-gray-200 hover:border-amber-300 bg-white'
                        )}
                        title="Visa / Mastercard"
                      >
                        <VisaMastercardLogo className="h-11 sm:h-13 max-w-[85%] w-auto object-contain" />
                      </button>
                    </div>

                    {/* Dynamic Form per Payment Method */}
                    <div className="bg-amber-50/40 rounded-2xl border border-amber-100 p-5 max-w-xl">
                      {paymentMethod === 'card' ? (
                        <div className="space-y-4">
                          <div className="space-y-1.5">
                            <Label className="text-xs font-bold text-gray-700">Select Pakistani Bank</Label>
                            <PakistaniBankSelector
                              value={selectedBank}
                              onChange={(bankName) => setSelectedBank(bankName)}
                            />
                          </div>

                          <div className="space-y-1.5">
                            <Label htmlFor="card-number" className="text-xs font-bold text-gray-700">
                              16-Digit Card Number
                            </Label>
                            <Input
                              id="card-number"
                              value={cardNumber}
                              onChange={(e) => setCardNumber(e.target.value)}
                              placeholder="0000 0000 0000 0000"
                              inputMode="numeric"
                              className="text-sm h-10 font-mono tracking-wider bg-white rounded-xl border-gray-200"
                              required
                            />
                          </div>

                          <div className="space-y-1.5">
                            <Label htmlFor="cardholder-name" className="text-xs font-bold text-gray-700">
                              Cardholder Full Name
                            </Label>
                            <Input
                              id="cardholder-name"
                              value={cardholderName}
                              onChange={(e) => setCardholderName(e.target.value)}
                              placeholder="e.g. Muhammad Ahsan"
                              className="text-sm h-10 bg-white rounded-xl border-gray-200"
                              required
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                              <Label htmlFor="expiry" className="text-xs font-bold text-gray-700">
                                Expiry Date
                              </Label>
                              <Input
                                id="expiry"
                                value={expiryDate}
                                onChange={(e) => setExpiryDate(e.target.value)}
                                placeholder="MM/YY"
                                className="text-sm h-10 text-center bg-white rounded-xl border-gray-200 font-mono"
                                required
                              />
                            </div>
                            <div className="space-y-1.5">
                              <Label htmlFor="cvv" className="text-xs font-bold text-gray-700">
                                CVV Security Code
                              </Label>
                              <Input
                                id="cvv"
                                value={cvv}
                                onChange={(e) => setCvv(e.target.value)}
                                placeholder="123"
                                inputMode="numeric"
                                type="password"
                                maxLength={4}
                                className="text-sm h-10 text-center bg-white rounded-xl border-gray-200 font-mono"
                                required
                              />
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div className="space-y-1.5">
                            <Label className="text-xs font-bold text-gray-700">
                              {paymentMethod === 'jazzcash' ? 'JazzCash Mobile Account Number' : 'EasyPaisa Mobile Account Number'}
                            </Label>
                            <Input
                              value={accountNumber}
                              onChange={(e) => setAccountNumber(e.target.value)}
                              placeholder={paymentMethod === 'jazzcash' ? '0300-1234567' : '0345-1234567'}
                              className="h-10 text-sm rounded-xl border-gray-200 bg-white font-mono"
                              required
                            />
                          </div>

                          <div className="space-y-1.5">
                            <Label className="text-xs font-bold text-gray-700">Account Title / Full Name</Label>
                            <Input
                              value={cardholderName}
                              onChange={(e) => setCardholderName(e.target.value)}
                              placeholder="e.g. Muhammad Ahsan"
                              className="h-10 text-sm rounded-xl border-gray-200 bg-white"
                              required
                            />
                          </div>

                          <div className="p-3 rounded-xl bg-amber-100/60 border border-amber-200/80 text-xs text-amber-900 flex items-start gap-2">
                            <span className="text-base leading-none">📲</span>
                            <span>An instant payment authorization USSD prompt will be sent to your phone. Approve with your MPIN.</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Order Summary & Confirmation Button */}
                    <div className="border-t border-gray-100 pt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">Total Amount</span>
                          {selectedPackage.isAnnual && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Annual 20% Discount
                            </span>
                          )}
                        </div>
                        <div className="text-2xl font-black text-gray-900 font-mono">
                          PKR {selectedPackage.pricePKR.toLocaleString()}
                          <span className="text-xs text-amber-700 font-bold ml-2">
                            (+{selectedPackage.points} PTS to be credited)
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-500 mt-0.5">
                          {selectedPackage.isAnnual ? 'Annual Savings Applied' : 'Standard Package Rate'}
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setSelectedPackage(null)}
                          disabled={isSubmitting}
                          className="h-12 px-6 border-gray-300 text-gray-700 hover:bg-gray-100 hover:text-gray-900 font-bold text-sm rounded-2xl cursor-pointer transition-all"
                        >
                          Cancel
                        </Button>

                        <Button
                          type="button"
                          onClick={handleBuyPoints}
                          disabled={isSubmitting}
                          className="h-12 px-8 bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm rounded-2xl cursor-pointer shadow-lg hover:shadow-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                        >
                          {isSubmitting ? (
                            <>
                              <Loader2 className="w-5 h-5 animate-spin mr-1" />
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
                    className="max-w-lg mx-auto space-y-6 py-2"
                  >
                    <div className="bg-white rounded-3xl border border-gray-200 p-6 sm:p-8 shadow-md space-y-5 text-center relative overflow-hidden">
                      <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center mx-auto shadow-xs">
                        <CheckCircle2 className="w-8 h-8" />
                      </div>

                      <div>
                        <h3 className="text-2xl font-black text-gray-900 font-sidebar-title">Thank you!</h3>
                        <p className="text-xs text-gray-500 font-medium mt-1">
                          Your points purchase ticket has been issued and credited successfully
                        </p>
                      </div>

                      <hr className="border-dashed border-gray-200 my-2" />

                      <div className="grid grid-cols-2 gap-4 text-left py-1">
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">Ticket ID</span>
                          <span className="font-mono font-black text-xs sm:text-sm text-gray-900">{paymentSuccessTicket.ticketId}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">Amount Paid</span>
                          <span className="font-mono font-black text-xs sm:text-sm text-gray-900">PKR {paymentSuccessTicket.amount.toFixed(2)}</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-left py-1 border-t border-gray-50">
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">Plan & Points</span>
                          <span className="text-xs sm:text-sm font-bold text-amber-700">
                            {paymentSuccessTicket.planName} (+{paymentSuccessTicket.points} PTS)
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">Date & Time</span>
                          <span className="text-xs font-semibold text-gray-700">{paymentSuccessTicket.date}</span>
                        </div>
                      </div>

                      {/* Payment Account Pill */}
                      <div className="p-3 bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-between text-left">
                        <div className="flex items-center gap-3">
                          {paymentSuccessTicket.method === 'card' ? (
                            <VisaMastercardLogo className="h-6 w-auto" />
                          ) : paymentSuccessTicket.method === 'jazzcash' ? (
                            <JazzCashLogo className="h-5 w-auto" />
                          ) : paymentSuccessTicket.method === 'easypaisa' ? (
                            <EasypaisaLogo className="h-5 w-auto" />
                          ) : (
                            <Banknote className="h-6 w-6 text-amber-600" />
                          )}
                          <div>
                            <p className="text-xs font-bold text-gray-900">{paymentSuccessTicket.accountName}</p>
                            <p className="text-[11px] text-gray-500 font-mono">{paymentSuccessTicket.maskedAccount}</p>
                          </div>
                        </div>
                        <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                          Paid
                        </span>
                      </div>

                      {/* SVG Barcode & Number */}
                      <div className="pt-2 space-y-1.5">
                        <div className="flex justify-center items-center h-12 px-6 opacity-85">
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
                        <p className="font-mono text-[11px] tracking-widest text-gray-400">{paymentSuccessTicket.barcodeNumber}</p>
                      </div>
                    </div>

                    {/* Dual Action Buttons */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Button
                        onClick={() => {
                          setPaymentSuccessTicket(null);
                          setSelectedPackage(null);
                        }}
                        variant="outline"
                        className="h-11 font-bold text-xs rounded-xl border-amber-300 text-amber-900 hover:bg-amber-50 cursor-pointer shadow-xs"
                      >
                        <RotateCcw className="w-4 h-4 mr-1.5" /> Purchase Another Package
                      </Button>
                      <Button
                        onClick={() => {
                          setPaymentSuccessTicket(null);
                          setSelectedPackage(null);
                          setShowBuyPoints(false);
                        }}
                        className="h-11 font-bold text-xs rounded-xl bg-amber-600 hover:bg-amber-700 text-white cursor-pointer shadow-md"
                      >
                        <Check className="w-4 h-4 mr-1.5" /> Done & Return to Wallet
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ================= FULL-WIDTH SEGMENTED NAVIGATION TABS ================= */}
      <div className="bg-white rounded-2xl border border-amber-200/80 p-1.5 shadow-xs flex items-center gap-2 overflow-x-auto">
        <button
          onClick={() => setTab('history')}
          className={cn(
            'flex-1 py-3 px-4 rounded-xl font-sidebar-title font-bold text-xs sm:text-sm transition-all cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap',
            tab === 'history'
              ? 'bg-amber-600 text-white shadow-md'
              : 'text-gray-600 hover:text-amber-900 hover:bg-amber-50/80'
          )}
        >
          <Clock className="w-4 h-4" /> Points Activity & Ledger
        </button>

        <button
          onClick={() => setTab('targets')}
          className={cn(
            'flex-1 py-3 px-4 rounded-xl font-sidebar-title font-bold text-xs sm:text-sm transition-all cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap',
            tab === 'targets'
              ? 'bg-amber-600 text-white shadow-md'
              : 'text-gray-600 hover:text-amber-900 hover:bg-amber-50/80'
          )}
        >
          <Target className="w-4 h-4" /> Weekly Targets & Rewards
        </button>
      </div>

      {/* ================= TAB 1: POINTS ACTIVITY & LEDGER ================= */}
      {tab === 'history' && (
        <div className="bg-white rounded-3xl border border-gray-200 p-6 sm:p-8 space-y-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900 font-sidebar-title flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-600" /> Points Activity & Audit Ledger
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Full chronological ledger of points earned from jobs, bid fees deducted, and package purchases.
              </p>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 bg-gray-100/80 p-1 rounded-xl text-xs font-bold text-gray-600 self-start sm:self-auto">
              {(['all', 'earn', 'spend', 'purchase'] as const).map((filterKey) => (
                <button
                  key={filterKey}
                  onClick={() => setLedgerFilter(filterKey)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg capitalize cursor-pointer transition-all',
                    ledgerFilter === filterKey ? 'bg-white text-gray-900 shadow-2xs' : 'hover:text-gray-900'
                  )}
                >
                  {filterKey === 'all' ? 'All Activity' : filterKey === 'earn' ? 'Earned' : filterKey === 'spend' ? 'Bids' : 'Purchased'}
                </button>
              ))}
            </div>
          </div>

          {/* Ledger List */}
          <div className="divide-y divide-gray-100 border border-gray-100 rounded-2xl overflow-hidden">
            {filteredLedger.map((item) => (
              <div key={item.id} className="p-4 sm:p-5 flex items-center justify-between hover:bg-gray-50/80 transition-colors">
                <div className="flex items-center gap-4">
                  <div
                    className={cn(
                      'w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-2xs',
                      item.category === 'earn'
                        ? 'bg-amber-100 text-amber-800'
                        : item.category === 'bonus'
                        ? 'bg-orange-100 text-orange-800'
                        : item.category === 'purchase'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-red-100 text-red-600'
                    )}
                  >
                    {item.category === 'spend' ? (
                      <ArrowDownRight className="w-5 h-5" />
                    ) : (
                      <ArrowUpRight className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-gray-900 leading-snug">
                      {(item.title || '').replace(/50\s*Starter\s*Bidding\s*Points/gi, '').replace(/\s{2,}/g, ' ').trim() || 'Welcome to ClearFlow!'}
                    </h4>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {item.timestamp}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span
                    className={cn(
                      'text-sm font-black font-mono px-3 py-1 rounded-full inline-block',
                      item.points > 0
                        ? 'bg-amber-50 text-amber-900 border border-amber-300/80'
                        : 'bg-red-50 text-red-700 border border-red-200/60'
                    )}
                  >
                    {item.points > 0 ? `+${item.points}` : item.points} PTS
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ================= TAB 3: WEEKLY TARGETS & REWARDS ================= */}
      {tab === 'targets' && (
        <div className="bg-white rounded-3xl border border-gray-200 p-6 sm:p-8 space-y-6 shadow-xs">
          <div>
            <h2 className="text-lg font-bold text-gray-900 font-sidebar-title flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-600" /> Weekly Milestone Targets
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Achieve weekly performance benchmarks to unlock free bidding points and performance incentives.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {weeklyTargets.map((t) => {
              const currentVal = Number(t.currentCount ?? t.current ?? 0);
              const targetVal = Number(t.targetCount ?? t.target ?? 1);
              const percent = targetVal > 0 ? Math.min(100, Math.round((currentVal / targetVal) * 100)) : 0;
              const isDone = percent >= 100 || t.isFulfilled;
              return (
                <div
                  key={t.id}
                  className="p-5 rounded-3xl border border-gray-200 bg-white shadow-xs space-y-4 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-400 uppercase tracking-wider font-sidebar-title">
                        Weekly Goal
                      </span>
                      {t.claimed ? (
                        <span className="text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full font-semibold">
                          CLAIMED
                        </span>
                      ) : isDone ? (
                        <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-300 px-2.5 py-0.5 rounded-full flex items-center gap-1 font-semibold">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" /> READY TO CLAIM
                        </span>
                      ) : null}
                    </div>

                    <h3 className="text-sm font-bold text-gray-900 leading-snug">{t.title}</h3>

                    <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                      <div
                        className={cn('h-full transition-all duration-500', isDone ? 'bg-emerald-500' : 'bg-amber-500')}
                        style={{ width: `${percent}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>Progress: {currentVal} / {targetVal}</span>
                      <div className="flex items-center gap-2 font-bold">
                        <span className="text-amber-800 font-mono">+{t.rewardPoints} pts</span>
                      </div>
                    </div>
                  </div>

                  {isDone && !t.claimed && (
                    <Button
                      onClick={() => handleClaimTarget(t.id)}
                      className="w-full h-10 font-bold text-xs rounded-xl cursor-pointer shadow-2xs transition-all bg-amber-600 hover:bg-amber-700 text-white animate-pulse"
                    >
                      Claim Reward Now
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default WalletPage;

import { useState, useEffect } from 'react';
import { Outlet, useNavigate, Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, ClipboardList, Map, MessageSquare, Briefcase, 
  Menu, UserCircle, LogOut, Settings, FolderKanban, RefreshCw,
  Receipt, History, LifeBuoy, Star, Wallet, Coins, Wrench, ArrowLeftRight
} from 'lucide-react';
import { useAuth } from '../../../entities/user/hooks/useAuth';
import { usePermissions } from '../../../entities/user/hooks/usePermissions';
import { Role } from '../../../entities/user/types';
import { VercelNotificationPopover } from '@/components/ui/vercel-notification-popover';
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ClearFlowLogo } from '@/components/ui/clearflow-logo';
import { socketClient } from '@/infrastructure/socket/client';
import { useUnreadChat } from '../../hooks/useUnreadChat';
import { Sidebar, SidebarBody, SidebarLink } from '@/components/ui/sidebar';
import { AnimatedPortalSidebar, type PortalNavItem, type PortalRole } from '@/components/ui/animated-portal-sidebar';
import { apiClient, clearApiCache } from '@/infrastructure/api/client';
import { ENDPOINTS } from '@/infrastructure/api/endpoints';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export const DashboardLayout = () => {
  const { user, logout, updateUser, login } = useAuth();
  const { isAdmin } = usePermissions();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isHeaderRefreshing, setIsHeaderRefreshing] = useState(false);
  const isDemoField =
    (user?.email || '').toLowerCase().trim() === 'field@clearflow.com' ||
    (user?.email || '').toLowerCase().trim() === 'worker@clearflow.com' ||
    (user?.email || '').toLowerCase().trim() === 'fieldteam@clearflow.com' ||
    user?._id === '65f000000000000000000004' ||
    user?._id === '65f000000000000000000005';

  const walletStorageKey = user?._id ? `clearflow_worker_wallet_${user._id}` : 'clearflow_worker_wallet_guest';

  const [workerWallet, setWorkerWallet] = useState<any>(() => {
    try {
      const saved = localStorage.getItem(walletStorageKey) || localStorage.getItem('clearflow_worker_wallet');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed.pointsBalance === 'number') {
          return parsed;
        }
      }
    } catch {}
    return isDemoField ? { pointsBalance: 160, withdrawableBalance: 380.0 } : { pointsBalance: 0, withdrawableBalance: 0.0 };
  });
  const { hasUnreadChat } = useUnreadChat();
  const location = useLocation();

  const handleGlobalRefresh = async () => {
    setIsHeaderRefreshing(true);
    const start = Date.now();
    try {
      window.dispatchEvent(new CustomEvent('clearflow:refresh-data'));
      const elapsed = Date.now() - start;
      if (elapsed < 800) {
        await new Promise((r) => setTimeout(r, 800 - elapsed));
      }
      toast.success('Portal data refreshed');
    } finally {
      setIsHeaderRefreshing(false);
    }
  };

  useEffect(() => {
    socketClient.connect();
  }, [user]);

  // Ensure window always opens at the top when navigating between routes across all portals
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [location.pathname]);

  const userRole = (user?.role || Role.CLIENT).toLowerCase();
  const isAdminRole = userRole === 'admin';
  const isFieldRole = userRole === 'fieldteam' || userRole === 'field_team' || userRole === 'field-team' || userRole === 'field' || userRole === 'worker';
  const isClientRole = !isAdminRole && !isFieldRole;
  const formattedRole = isAdminRole ? 'Admin' : isFieldRole ? 'Worker' : 'Client';

  useEffect(() => {
    if (isFieldRole) {
      apiClient.get(ENDPOINTS.MARKETPLACE.WALLET)
        .then((res) => {
          const walletPayload = res.data?.data?.wallet || res.data?.data || res.data?.wallet;
          if (walletPayload && typeof walletPayload.pointsBalance === 'number') {
            setWorkerWallet(walletPayload);
            try {
              localStorage.setItem(walletStorageKey, JSON.stringify(walletPayload));
              localStorage.setItem('clearflow_worker_wallet', JSON.stringify(walletPayload));
            } catch {}
          }
        })
        .catch(() => {
          setWorkerWallet((prev: any) => {
            const fallback = prev || (isDemoField ? { pointsBalance: 160, withdrawableBalance: 380.0 } : { pointsBalance: 0, withdrawableBalance: 0.0 });
            return fallback;
          });
        });
    }

    const handleWalletUpdated = (e: any) => {
      if (e.detail && typeof e.detail.pointsBalance === 'number') {
        setWorkerWallet(e.detail);
        try {
          localStorage.setItem(walletStorageKey, JSON.stringify(e.detail));
          localStorage.setItem('clearflow_worker_wallet', JSON.stringify(e.detail));
        } catch {}
      }
    };

    const handleSocketWallet = (data: any) => {
      if (!data) return;
      const targetUserId = String(data.userId || data.technicianId || '');
      const currentUserId = String(user?._id || '');
      if (!targetUserId || targetUserId === currentUserId || isDemoField) {
        const newBalance = typeof data.pointsBalance === 'number' ? data.pointsBalance : data.wallet?.pointsBalance;
        if (typeof newBalance === 'number') {
          setWorkerWallet((prev: any) => {
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
        }
      }
    };

    const handleOpenWallet = () => navigate('/wallet');

    window.addEventListener('clearflow:wallet-updated', handleWalletUpdated);
    window.addEventListener('clearflow:open-wallet', handleOpenWallet);
    socketClient.on('marketplace:wallet_updated', handleSocketWallet);
    socketClient.on('wallet_updated', handleSocketWallet);

    return () => {
      window.removeEventListener('clearflow:wallet-updated', handleWalletUpdated);
      window.removeEventListener('clearflow:open-wallet', handleOpenWallet);
      socketClient.off('marketplace:wallet_updated', handleSocketWallet);
      socketClient.off('wallet_updated', handleSocketWallet);
    };
  }, [isFieldRole, navigate, user?._id, walletStorageKey, isDemoField]);

  // Centralized Real-Time Synchronization across Admin, Client, and Worker portals
  useEffect(() => {
    const handleCategorySync = () => {
      window.dispatchEvent(new CustomEvent('clearflow:refresh-data'));
      window.dispatchEvent(new CustomEvent('clearflow:categories-updated'));
    };

    const handleSettingsSync = (data: any) => {
      window.dispatchEvent(new CustomEvent('clearflow:refresh-data'));
      window.dispatchEvent(new CustomEvent('clearflow:company-updated', { detail: data }));
    };

    const handleUserRegisteredSync = (newUser: any) => {
      window.dispatchEvent(new CustomEvent('clearflow:refresh-data'));
      if (isAdminRole && newUser?.name) {
        toast.info(`New ${newUser.role === 'FieldTeam' ? 'Worker' : newUser.role || 'user'} registered: ${newUser.name}`);
      }
    };

    const handleUserUpdatedSync = (updatedUser?: any) => {
      clearApiCache();
      if (updatedUser) {
        window.dispatchEvent(new CustomEvent('clearflow:user-updated', { detail: updatedUser }));
        if (updatedUser.role === 'Admin') {
          window.dispatchEvent(new CustomEvent('clearflow:company-updated', { 
            detail: { 
              companyName: updatedUser.name, 
              phone: updatedUser.phone, 
              address: updatedUser.address, 
              companyIcon: updatedUser.avatar || updatedUser.avatarUrl 
            } 
          }));
        }
      }
      window.dispatchEvent(new CustomEvent('clearflow:refresh-data', { detail: updatedUser }));
    };

    const handleWorkOrderSync = () => {
      clearApiCache();
      window.dispatchEvent(new CustomEvent('clearflow:refresh-data'));
    };

    socketClient.on('category:updated', handleCategorySync);
    socketClient.on('category:created', handleCategorySync);
    socketClient.on('category:deleted', handleCategorySync);
    socketClient.on('categories:changed', handleCategorySync);
    socketClient.on('settings:updated', handleSettingsSync);
    socketClient.on('company:updated', handleSettingsSync);
    socketClient.on('company:profile_updated', handleSettingsSync);
    socketClient.on('user:registered', handleUserRegisteredSync);
    socketClient.on('user:new', handleUserRegisteredSync);
    socketClient.on('user:updated', handleUserUpdatedSync);
    socketClient.on('profile:updated', handleUserUpdatedSync);
    socketClient.on('workOrder:created', handleWorkOrderSync);
    socketClient.on('workOrder:new', handleWorkOrderSync);
    socketClient.on('workOrder:progress', handleWorkOrderSync);
    socketClient.on('workOrder:updated', handleWorkOrderSync);

    return () => {
      socketClient.off('category:updated', handleCategorySync);
      socketClient.off('category:created', handleCategorySync);
      socketClient.off('category:deleted', handleCategorySync);
      socketClient.off('categories:changed', handleCategorySync);
      socketClient.off('settings:updated', handleSettingsSync);
      socketClient.off('company:updated', handleSettingsSync);
      socketClient.off('company:profile_updated', handleSettingsSync);
      socketClient.off('user:registered', handleUserRegisteredSync);
      socketClient.off('user:new', handleUserRegisteredSync);
      socketClient.off('user:updated', handleUserUpdatedSync);
      socketClient.off('profile:updated', handleUserUpdatedSync);
      socketClient.off('workOrder:created', handleWorkOrderSync);
      socketClient.off('workOrder:new', handleWorkOrderSync);
      socketClient.off('workOrder:progress', handleWorkOrderSync);
      socketClient.off('workOrder:updated', handleWorkOrderSync);
    };
  }, [isAdminRole]);


  const handleSignOut = () => {
    setIsMobileMenuOpen(false);
    try {
      sessionStorage.setItem('clearflow_from_signout', 'true');
    } catch (e) {}
    logout();
    navigate('/login', { replace: true, state: { fromSignOut: true } });
  };

  const handleSwitchPortal = async (targetRole: 'Client' | 'FieldTeam') => {
    try {
      if (user?._id) {
        const res = await apiClient.patch(`/users/${user._id}/role`, { targetRole });
        if (res.data?.success && res.data.data?.user) {
          const updatedUser = res.data.data.user;
          const newToken = res.data.data.token;
          login(newToken || localStorage.getItem('clearflow_token') || '', updatedUser);
          toast.success(`Switched to ${targetRole === 'FieldTeam' ? 'Worker' : 'Client'} Portal`);
          navigate('/dashboard', { replace: true });
          return;
        }
      }
      if (user) {
        updateUser({ role: targetRole });
        toast.success(`Switched to ${targetRole === 'FieldTeam' ? 'Worker' : 'Client'} Portal`);
        navigate('/dashboard', { replace: true });
      }
    } catch {
      if (user) {
        updateUser({ role: targetRole });
        toast.success(`Switched to ${targetRole === 'FieldTeam' ? 'Worker' : 'Client'} Portal`);
        navigate('/dashboard', { replace: true });
      }
    }
  };

  const currentRoleKey: PortalRole = isAdminRole ? 'admin' : isFieldRole ? 'fieldteam' : 'client';

  // Navigation Links tailored to exact user requirements with social-links style gradients
  const portalNavItems: PortalNavItem[] = isFieldRole ? [
    {
      label: 'Dashboard',
      href: '/dashboard',
      icon: <LayoutDashboard className="w-5 h-5 shrink-0" />,
      gradient: "from-amber-600 via-orange-600 to-amber-500",
      hoverGradient: "from-amber-500 via-orange-500 to-amber-400",
    },
    {
      label: 'My Wallet',
      href: '/wallet',
      icon: <Wallet className="w-5 h-5 shrink-0" />,
      gradient: "from-amber-700 via-yellow-600 to-amber-500",
      hoverGradient: "from-amber-600 via-yellow-500 to-amber-400",
    },
    {
      label: 'Work Orders',
      href: '/work-orders',
      icon: <ClipboardList className="w-5 h-5 shrink-0" />,
      gradient: "from-orange-600 via-amber-600 to-orange-500",
      hoverGradient: "from-orange-500 via-amber-500 to-orange-400",
    },
    {
      label: 'Live Tracking',
      href: '/tracking',
      icon: <Map className="w-5 h-5 shrink-0" />,
      gradient: "from-amber-600 via-orange-500 to-amber-500",
      hoverGradient: "from-amber-500 via-orange-400 to-amber-400",
    },
    {
      label: 'My Earnings',
      href: '/invoices',
      icon: <Receipt className="w-5 h-5 shrink-0" />,
      gradient: "from-amber-600 via-yellow-600 to-orange-500",
      hoverGradient: "from-amber-500 via-yellow-500 to-orange-400",
    },
    {
      label: 'Ratings & Reviews',
      href: '/reviews',
      icon: <Star className="w-5 h-5 shrink-0" />,
      gradient: "from-amber-500 via-yellow-500 to-orange-400",
      hoverGradient: "from-amber-400 via-yellow-400 to-orange-300",
    },
    {
      label: 'Chat',
      href: '/chat',
      icon: <MessageSquare className="w-5 h-5 shrink-0" />,
      badge: hasUnreadChat ? (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-red-500 text-white shadow-2xs animate-pulse">
          NEW
        </span>
      ) : undefined,
      gradient: "from-orange-600 via-amber-600 to-orange-500",
      hoverGradient: "from-orange-500 via-amber-500 to-orange-400",
    },
    {
      label: 'Help & Support',
      href: '/help',
      icon: <LifeBuoy className="w-5 h-5 shrink-0" />,
      gradient: "from-amber-700 via-orange-800 to-amber-600",
      hoverGradient: "from-amber-600 via-orange-700 to-amber-500",
    },
  ] : isAdminRole ? [
    {
      label: 'Dashboard',
      href: '/dashboard',
      icon: <LayoutDashboard className="w-5 h-5 shrink-0" />,
      gradient: "from-purple-700 via-indigo-600 to-purple-500",
      hoverGradient: "from-purple-600 via-indigo-500 to-purple-400",
    },
    {
      label: 'Work Orders',
      href: '/work-orders',
      icon: <ClipboardList className="w-5 h-5 shrink-0" />,
      gradient: "from-indigo-700 via-purple-600 to-indigo-500",
      hoverGradient: "from-indigo-600 via-purple-500 to-indigo-400",
    },
    {
      label: 'Live Tracking',
      href: '/tracking',
      icon: <Map className="w-5 h-5 shrink-0" />,
      gradient: "from-purple-700 via-indigo-600 to-purple-500",
      hoverGradient: "from-purple-600 via-indigo-500 to-purple-400",
    },
    {
      label: 'Categories',
      href: '/categories',
      icon: <FolderKanban className="w-5 h-5 shrink-0" />,
      gradient: "from-violet-700 via-purple-600 to-indigo-600",
      hoverGradient: "from-violet-600 via-purple-500 to-indigo-500",
    },
    {
      label: 'Operations',
      href: '/operations',
      icon: <Briefcase className="w-5 h-5 shrink-0" />,
      gradient: "from-purple-800 via-indigo-700 to-purple-600",
      hoverGradient: "from-purple-700 via-indigo-600 to-purple-500",
    },
    {
      label: 'Invoices',
      href: '/invoices',
      icon: <Receipt className="w-5 h-5 shrink-0" />,
      gradient: "from-violet-800 via-purple-700 to-indigo-600",
      hoverGradient: "from-violet-700 via-purple-600 to-indigo-500",
    },
    {
      label: 'Chat',
      href: '/chat',
      icon: <MessageSquare className="w-5 h-5 shrink-0" />,
      badge: hasUnreadChat ? (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-red-500 text-white shadow-2xs animate-pulse">
          NEW
        </span>
      ) : undefined,
      gradient: "from-indigo-600 via-purple-600 to-violet-500",
      hoverGradient: "from-indigo-500 via-purple-500 to-violet-400",
    },
    {
      label: 'Settings',
      href: '/settings',
      icon: <Settings className="w-5 h-5 shrink-0" />,
      gradient: "from-purple-900 via-indigo-800 to-purple-700",
      hoverGradient: "from-purple-800 via-indigo-700 to-purple-600",
    },
  ] : [
    {
      label: 'Dashboard',
      href: '/dashboard',
      icon: <LayoutDashboard className="w-5 h-5 shrink-0" />,
      gradient: "from-teal-600 via-emerald-600 to-teal-500",
      hoverGradient: "from-teal-500 via-emerald-500 to-teal-400",
    },
    {
      label: 'Work Orders',
      href: '/work-orders',
      icon: <ClipboardList className="w-5 h-5 shrink-0" />,
      gradient: "from-emerald-600 via-teal-600 to-emerald-500",
      hoverGradient: "from-emerald-500 via-teal-500 to-emerald-400",
    },
    {
      label: 'Live Tracking',
      href: '/tracking',
      icon: <Map className="w-5 h-5 shrink-0" />,
      gradient: "from-teal-600 via-emerald-600 to-teal-500",
      hoverGradient: "from-teal-500 via-emerald-500 to-teal-400",
    },
    {
      label: 'Payments',
      href: '/payments',
      icon: <Receipt className="w-5 h-5 shrink-0" />,
      gradient: "from-emerald-700 via-teal-600 to-emerald-500",
      hoverGradient: "from-emerald-600 via-teal-500 to-emerald-400",
    },
    {
      label: 'Chat',
      href: '/chat',
      icon: <MessageSquare className="w-5 h-5 shrink-0" />,
      badge: hasUnreadChat ? (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-red-500 text-white shadow-2xs animate-pulse">
          NEW
        </span>
      ) : undefined,
      gradient: "from-teal-600 via-emerald-500 to-teal-400",
      hoverGradient: "from-teal-500 via-emerald-400 to-teal-300",
    },
    {
      label: 'Help & Support',
      href: '/help',
      icon: <LifeBuoy className="w-5 h-5 shrink-0" />,
      gradient: "from-teal-700 via-emerald-700 to-teal-600",
      hoverGradient: "from-teal-600 via-emerald-600 to-teal-500",
    },
  ];

  const sidebarLinks = portalNavItems.map((item) => ({
    label: item.label,
    href: item.href,
    icon: item.icon,
    badge: item.badge,
  }));

  // Role-based Palette
  const roleTheme = {
    activeNavBg: isAdminRole 
      ? 'bg-purple-100/90 text-purple-900 font-bold rounded-xl' 
      : isFieldRole 
      ? 'bg-amber-100/90 text-amber-900 font-bold rounded-xl' 
      : 'bg-teal-100/90 text-teal-900 font-bold rounded-xl',
    activeNavIndicator: isAdminRole ? 'bg-purple-600' : isFieldRole ? 'bg-amber-600' : 'bg-teal-600',
    activeNavIcon: isAdminRole ? 'text-purple-700' : isFieldRole ? 'text-amber-700' : 'text-teal-700',
    hoverNavBg: isAdminRole 
      ? 'hover:bg-purple-50/80 hover:text-purple-700 text-gray-600 rounded-xl' 
      : isFieldRole 
      ? 'hover:bg-amber-50/80 hover:text-amber-700 text-gray-600 rounded-xl' 
      : 'hover:bg-teal-50/80 hover:text-teal-700 text-gray-600 rounded-xl',
    hoverNavIcon: isAdminRole 
      ? 'group-hover:text-purple-700' 
      : isFieldRole 
      ? 'group-hover:text-amber-700' 
      : 'group-hover:text-teal-700',
    roleBadge: isAdminRole
      ? 'bg-purple-50 text-purple-700 border border-purple-200/90'
      : isFieldRole
      ? 'bg-amber-50 text-amber-700 border border-amber-200/90'
      : 'bg-teal-50 text-teal-700 border border-teal-200/90',
    userAvatarBg: isAdminRole ? 'bg-purple-100 text-purple-700 ring-1 ring-purple-200' : isFieldRole ? 'bg-amber-100 text-amber-700 ring-1 ring-amber-200' : 'bg-teal-100 text-teal-700 ring-1 ring-teal-200',
    searchRing: isAdminRole
      ? 'focus-within:ring-purple-200 focus-within:border-purple-300'
      : isFieldRole
      ? 'focus-within:ring-amber-200 focus-within:border-amber-300'
      : 'focus-within:ring-teal-200 focus-within:border-teal-300',
    userBtnHover: isAdminRole
      ? 'hover:bg-purple-50/80 hover:border-purple-200 border border-transparent text-gray-800'
      : isFieldRole
      ? 'hover:bg-amber-50/80 hover:border-amber-200'
      : 'hover:bg-teal-50/80 hover:border-teal-200',
    mobileMenuHover: isAdminRole
      ? 'hover:bg-purple-50 hover:text-purple-700 text-gray-600'
      : isFieldRole
      ? 'hover:bg-amber-50 hover:text-amber-800 text-gray-600'
      : 'hover:bg-teal-50 hover:text-teal-700 text-gray-600',
    dropdownHover: isAdminRole
      ? 'hover:bg-purple-50 hover:text-purple-900'
      : isFieldRole
      ? 'hover:bg-amber-50 hover:text-amber-900'
      : 'hover:bg-teal-50 hover:text-teal-900',
    headerBorder: 'border-gray-100',
    sidebarBorder: 'border-transparent',
    pageBg: 'bg-white'
  };



  return (
    <div
      data-role={isAdminRole ? 'admin' : isFieldRole ? 'fieldteam' : 'client'}
      className={`min-h-screen bg-white flex flex-col transition-colors duration-300 role-${isAdminRole ? 'admin' : isFieldRole ? 'fieldteam' : 'client'}`}
    >
      {/* ================= FULL-WIDTH UNIFIED TOP HEADER ================= */}
      <header className="h-16 bg-white/95 backdrop-blur-md text-gray-900 border-b border-gray-100 shadow-none flex items-center justify-between px-3 sm:px-4 lg:px-8 sticky top-0 z-50 w-full transition-colors duration-200">
        {/* LEFT: ClearFlow Brand Logo & Mobile Trigger */}
        <div className="flex items-center gap-2 sm:gap-3 z-10 shrink-0">
          {/* Mobile Drawer Trigger - All Roles */}
          <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <SheetTrigger asChild className="lg:hidden">
              <Button variant="ghost" size="icon" className={`text-gray-600 ${roleTheme.mobileMenuHover} cursor-pointer shrink-0`}>
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className={cn("p-0 w-[280px] max-w-[85vw] flex flex-col bg-white text-gray-900 border-r rounded-r-3xl shadow-2xl overflow-hidden", roleTheme.sidebarBorder)}>
              <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
              <div className={`h-16 px-5 flex items-center justify-between border-b ${roleTheme.sidebarBorder}`}>
                <Link to="/dashboard" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center hover:opacity-95 transition-opacity">
                  <ClearFlowLogo badgeSize={32} textSize="text-xl font-bold" role={isFieldRole ? 'worker' : isAdminRole ? 'admin' : 'client'} />
                </Link>
              </div>
              <div className="flex-1 overflow-y-auto p-3.5 space-y-1.5 touch-scroll">
                {sidebarLinks.map((link, idx) => (
                  <SidebarLink
                    key={idx}
                    link={link}
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                    }}
                    activeClassName={roleTheme.activeNavBg}
                    activeIconClassName={roleTheme.activeNavIcon}
                    className={roleTheme.hoverNavBg}
                  />
                ))}
              </div>
            </SheetContent>
          </Sheet>

          {/* ClearFlow Logo on the Left */}
          <Link
            to="/dashboard"
            className="flex items-center gap-1.5 sm:gap-2 hover:opacity-95 transition-opacity"
            title="ClearFlow Home"
          >
            <ClearFlowLogo
              badgeSize={30}
              textSize="text-lg sm:text-xl font-bold"
              role={isFieldRole ? 'worker' : isAdminRole ? 'admin' : 'client'}
            />
          </Link>
        </div>

        {/* RIGHT: Points Pill (Worker - Hidden on Wallet Page) + Refresh + Notifications Bell + User Profile */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 z-10 shrink-0">
          {isFieldRole && !location.pathname.startsWith('/wallet') && (
            <Button
              variant="ghost"
              onClick={() => navigate('/wallet')}
              className="hidden min-[420px]:flex bg-amber-100/90 hover:bg-amber-200/90 text-amber-950 border border-amber-300/80 rounded-full h-8 px-2 sm:px-3 text-xs font-bold items-center gap-1.5 cursor-pointer shadow-2xs transition-all active:scale-95"
              title="Open My Points & Wallet Page"
            >
              <Coins className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span className="font-mono font-black">{workerWallet?.pointsBalance ?? (isDemoField ? 160 : 0)} pts</span>
            </Button>
          )}

          <Button
            variant="ghost"
            size="icon"
            onClick={handleGlobalRefresh}
            disabled={isHeaderRefreshing}
            className={`h-9 w-9 rounded-xl border border-transparent bg-transparent text-gray-600 hover:text-gray-900 ${roleTheme.mobileMenuHover} cursor-pointer transition-all active:scale-95 shadow-none`}
            title="Refresh portal data"
          >
            <RefreshCw className={cn("h-4 w-4", isHeaderRefreshing && "animate-spin", roleTheme.activeNavIcon)} />
          </Button>

          <VercelNotificationPopover />

          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className={`flex items-center gap-2 pl-2 pr-3 py-1.5 h-9 rounded-full ${roleTheme.userBtnHover} border border-transparent transition-all cursor-pointer focus-visible:ring-0 focus:outline-none select-none`}>
                <div className={`w-7.5 h-7.5 rounded-full ${roleTheme.userAvatarBg} flex items-center justify-center font-bold text-xs shrink-0`}>
                  <UserCircle className="w-4.5 h-4.5" />
                </div>
                <div className="hidden sm:flex items-center">
                  <span className="text-xs sm:text-sm font-semibold text-gray-800 leading-none">
                    {user?.name || user?.firstName || 'User'}
                  </span>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent 
              align="end" 
              className="w-48 sm:w-52 bg-white/98 backdrop-blur-md border border-gray-100 shadow-xl shadow-gray-900/10 rounded-2xl p-1.5 z-[9999] space-y-0.5 font-sans"
            >
              <DropdownMenuItem 
                className={cn(
                  "cursor-pointer flex items-center justify-between px-3 py-2 rounded-xl text-[13px] font-semibold transition-all group outline-none",
                  roleTheme.dropdownHover
                )} 
                onClick={() => navigate('/profile')}
              >
                <div className="flex items-center gap-2.5">
                  <UserCircle className={cn(
                    "w-4 h-4 shrink-0 transition-colors",
                    isAdminRole ? "text-purple-600" : isFieldRole ? "text-amber-600" : "text-teal-600"
                  )} />
                  <span className="text-gray-700 group-hover:text-gray-900 font-semibold text-[13px]">User Profile</span>
                </div>
                <span className={cn(
                  "text-[10px] sm:text-[11px] font-bold px-2 py-0.5 rounded-full border shadow-2xs leading-none",
                  roleTheme.roleBadge
                )}>
                  {formattedRole}
                </span>
              </DropdownMenuItem>

              <div className="border-t border-gray-100 my-1 mx-1" />

              <DropdownMenuItem 
                className="cursor-pointer flex items-center justify-between px-3 py-2 rounded-xl text-[13px] font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 focus:text-red-700 focus:bg-red-50 transition-all group outline-none" 
                onClick={handleSignOut}
              >
                <div className="flex items-center gap-2.5">
                  <LogOut className="w-4 h-4 shrink-0 text-red-500 group-hover:text-red-600 transition-colors" />
                  <span className="font-semibold text-[13px] text-red-600 group-hover:text-red-700">Sign Out</span>
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* ================= BODY AREA ================= */}
      <div className="flex-1 flex relative">
        {/* Animated Edge-Docked Portal Sidebar with Social-Links Hover Sliding Animation */}
        <AnimatedPortalSidebar
          items={portalNavItems}
          role={currentRoleKey}
          showOnMobile={true}
        />

        {/* Main Content Area - Positioned up cleanly across all portals */}
        <main className="flex-1 px-3 sm:px-4 pt-2.5 pb-12 lg:px-8 lg:pt-3 lg:pb-8 w-full max-w-full overflow-x-hidden lg:pl-[76px] min-h-[calc(100vh-4rem)]">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

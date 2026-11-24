'use client';

import React from 'react';
import { 
  Paperclip, MessageSquare, User, Banknote, ShieldCheck, 
  Sparkles, X, Bell, CheckCircle2, ArrowRight
} from 'lucide-react';
import { useAuth } from '@/entities/user/hooks/useAuth';
import { cn } from '@/lib/utils';

export type NotificationRoleTheme =
  | 'fieldteam'
  | 'client'
  | 'admin'
  | 'orange'
  | 'green'
  | 'purple';

export interface PopupNotificationItem {
  id: string;
  title: string;
  description?: string;
  timeAgo?: string;
  type?: 'event' | 'message' | 'user' | 'payment' | 'inspection' | 'accept' | 'reject' | 'order' | string;
  workOrderId?: string;
  invoiceId?: string;
  link?: string;
  createdAt?: number;
  roleTheme?: NotificationRoleTheme;
  onAccept?: () => void;
  onReject?: () => void;
  acceptLabel?: string;
  rejectLabel?: string;
}

interface NotificationPopupCardProps {
  notification: PopupNotificationItem;
  roleTheme?: NotificationRoleTheme;
  onDismiss?: (id: string) => void;
  onClick?: (notification: PopupNotificationItem) => void;
}

const ROLE_THEME_STYLES: Record<string, {
  cardBg: string;
  cardBorder: string;
  hoverBorder: string;
  titleText: string;
  descText: string;
  dotText: string;
  timeText: string;
  closeBtn: string;
  badgeRing: string;
}> = {
  fieldteam: {
    // 🟠 Orange / Amber Theme for Field Team
    cardBg: 'bg-gradient-to-r from-[#451a03]/95 via-[#7c2d12]/95 to-[#9a3412]/95 backdrop-blur-md',
    cardBorder: 'border border-orange-500/40 shadow-[0_12px_36px_rgba(234,88,12,0.35)]',
    hoverBorder: 'hover:border-orange-400/80 hover:shadow-[0_16px_40px_rgba(234,88,12,0.5)]',
    titleText: 'text-white font-extrabold',
    descText: 'text-orange-200/90 font-medium',
    dotText: 'text-orange-400',
    timeText: 'text-orange-300/80 font-mono',
    closeBtn: 'text-orange-300 hover:text-white hover:bg-orange-800/60',
    badgeRing: 'ring-2 ring-orange-400/40',
  },
  client: {
    // 🟢 Green / Emerald Theme for Client
    cardBg: 'bg-gradient-to-r from-[#022c22]/95 via-[#064e3b]/95 to-[#065f46]/95 backdrop-blur-md',
    cardBorder: 'border border-emerald-500/40 shadow-[0_12px_36px_rgba(16,185,129,0.35)]',
    hoverBorder: 'hover:border-emerald-400/80 hover:shadow-[0_16px_40px_rgba(16,185,129,0.5)]',
    titleText: 'text-white font-extrabold',
    descText: 'text-emerald-200/90 font-medium',
    dotText: 'text-emerald-400',
    timeText: 'text-emerald-300/80 font-mono',
    closeBtn: 'text-emerald-300 hover:text-white hover:bg-emerald-800/60',
    badgeRing: 'ring-2 ring-emerald-400/40',
  },
  admin: {
    // 🟣 Purple Theme for Admin
    cardBg: 'bg-gradient-to-r from-[#2e1065]/95 via-[#3b0764]/95 to-[#581c87]/95 backdrop-blur-md',
    cardBorder: 'border border-purple-500/40 shadow-[0_12px_36px_rgba(147,51,234,0.35)]',
    hoverBorder: 'hover:border-purple-400/80 hover:shadow-[0_16px_40px_rgba(147,51,234,0.5)]',
    titleText: 'text-white font-extrabold',
    descText: 'text-purple-200/90 font-medium',
    dotText: 'text-purple-400',
    timeText: 'text-purple-300/80 font-mono',
    closeBtn: 'text-purple-300 hover:text-white hover:bg-purple-800/60',
    badgeRing: 'ring-2 ring-purple-400/40',
  },
};

const normalizeRole = (role?: string): 'fieldteam' | 'client' | 'admin' => {
  if (!role) return 'client';
  const r = role.toLowerCase();
  if (r === 'fieldteam' || r === 'orange' || r.includes('field')) return 'fieldteam';
  if (r === 'admin' || r === 'purple') return 'admin';
  return 'client';
};

const cleanFieldTeamText = (text?: string): string => {
  if (!text) return '';
  return text
    .replace(/ClearFlow\s+Field\s+Team/gi, 'ClearFlow')
    .replace(/\s*\(\s*Field\s+Team\s*\)/gi, '')
    .replace(/Field\s+Team\s+Started\s+Work/gi, 'Technician Started Work')
    .replace(/Accepted\s+by\s+Field\s+Team/gi, 'Accepted')
    .replace(/Declined\s+by\s+Field\s+Team/gi, 'Declined')
    .replace(/Completed\s+by\s+Field\s+Team/gi, 'Completed')
    .replace(/by\s+Field\s+Team/gi, 'by Technician')
    .replace(/Field\s+team\s+has\s+begun/gi, 'Technician has begun')
    .replace(/Field\s+team\s+accepted/gi, 'Technician accepted')
    .replace(/Field\s+team\s+declined/gi, 'Technician declined')
    .replace(/Field\s+team\s+payout/gi, 'Technician payout')
    .replace(/Field\s+teams/gi, 'Technicians')
    .replace(/field\s+teams/gi, 'technicians')
    .replace(/Field\s+team\s+technicians/gi, 'Technicians')
    .replace(/field\s+team\s+technicians/gi, 'technicians')
    .replace(/Field\s+Team/gi, 'Technician')
    .replace(/field\s+team/gi, 'technician');
};

export const NotificationPopupCard: React.FC<NotificationPopupCardProps> = ({
  notification,
  roleTheme,
  onDismiss,
  onClick,
}) => {
  const { id, title: rawTitle, description: rawDescription = 'ClearFlow Operations', timeAgo = 'Just now', type = 'event' } = notification;
  const title = cleanFieldTeamText(rawTitle);
  const description = cleanFieldTeamText(rawDescription);
  const { user } = useAuth();

  // Resolve active theme: explicit prop > notification payload > user role / route fallback
  const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
  const detectedRole = (user?.role || '').toLowerCase();
  const fallbackRole = 
    detectedRole.includes('field') || currentPath.includes('/field')
      ? 'fieldteam'
      : detectedRole === 'admin' || currentPath.includes('/admin') || currentPath.includes('/invoices') || currentPath.includes('/categories')
      ? 'admin'
      : 'client';

  const themeKey = normalizeRole(roleTheme || notification.roleTheme || fallbackRole);
  const theme = ROLE_THEME_STYLES[themeKey] || ROLE_THEME_STYLES.client;

  // Determine Icon & Color Style matching Magic UI design
  const getBadgeConfig = () => {
    switch (type) {
      case 'accept':
      case 'approved':
        return {
          bg: 'bg-[#10b981]', // Emerald Green
          icon: <CheckCircle2 className="w-5 h-5 text-white stroke-[2.2]" />,
        };
      case 'reject':
      case 'declined':
        return {
          bg: 'bg-[#ef4444]', // Rose Red
          icon: <X className="w-5 h-5 text-white stroke-[2.2]" />,
        };
      case 'order':
      case 'request':
        return {
          bg: 'bg-[#f59e0b]', // Warm Amber / Gold
          icon: <Sparkles className="w-5 h-5 text-white stroke-[2.2]" />,
        };
      case 'message':
      case 'chat':
        return {
          bg: 'bg-[#ff2d55]', // Vibrant Pink/Red
          icon: <MessageSquare className="w-5 h-5 text-white stroke-[2.2]" />,
        };
      case 'user':
      case 'team':
      case 'assignment':
        return {
          bg: 'bg-[#ff9500]', // Warm Amber/Yellow
          icon: <User className="w-5 h-5 text-white stroke-[2.2]" />,
        };
      case 'payment':
      case 'invoice':
      case 'payout':
        return {
          bg: 'bg-[#00c7be]', // Mint / Emerald Green
          icon: <Banknote className="w-5 h-5 text-white stroke-[2.2]" />,
        };
      case 'inspection':
      case 'ai':
        return {
          bg: 'bg-[#8b5cf6]', // Purple
          icon: <ShieldCheck className="w-5 h-5 text-white stroke-[2.2]" />,
        };
      case 'event':
      default:
        return {
          bg: 'bg-[#007aff]', // Bright Royal Blue
          icon: <Paperclip className="w-5 h-5 text-white stroke-[2.2] -rotate-45" />,
        };
    }
  };

  const badge = getBadgeConfig();

  return (
    <div
      onClick={() => onClick?.(notification)}
      className={cn(
        "group relative flex items-center gap-3.5 w-full max-w-[360px]",
        "p-3 sm:p-3.5 rounded-2xl cursor-pointer select-none transition-all duration-200",
        theme.cardBg,
        theme.cardBorder,
        theme.hoverBorder
      )}
    >
      {/* Colorful Circular Icon Badge */}
      <div
        className={cn(
          "w-11 h-11 rounded-full flex items-center justify-center shrink-0 shadow-md",
          badge.bg,
          theme.badgeRing
        )}
      >
        {badge.icon}
      </div>

      {/* Title, Time & Subtitle */}
      <div className="flex-1 min-w-0 pr-4">
        <div className="flex items-center gap-1.5 truncate">
          <span className={cn("text-[13px] truncate", theme.titleText)}>
            {title}
          </span>
          <span className={cn("text-[10px] select-none", theme.dotText)}>·</span>
          <span className={cn("text-[11px] shrink-0", theme.timeText)}>
            {timeAgo}
          </span>
        </div>
        <p className={cn("text-[11.5px] truncate mt-0.5 leading-snug", theme.descText)}>
          {description}
        </p>

        {/* Quick Action Buttons (Accept / Reject) */}
        {(notification.onAccept || notification.onReject) && (
          <div className="flex items-center gap-2 pt-2">
            {notification.onReject && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  notification.onReject?.();
                  onDismiss?.(id);
                }}
                className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-white/10 hover:bg-rose-500/30 hover:text-rose-200 text-white/90 border border-white/15 transition-colors cursor-pointer"
              >
                {notification.rejectLabel || 'Reject'}
              </button>
            )}
            {notification.onAccept && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  notification.onAccept?.();
                  onDismiss?.(id);
                }}
                className="px-2.5 py-1 text-xs font-bold rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm transition-colors cursor-pointer"
              >
                {notification.acceptLabel || 'Accept'}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Close Button on Hover */}
      {onDismiss && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDismiss(id);
          }}
          className={cn(
            "absolute top-2.5 right-2.5 p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer",
            theme.closeBtn
          )}
          aria-label="Dismiss"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};

export default NotificationPopupCard;

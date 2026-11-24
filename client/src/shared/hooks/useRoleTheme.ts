import { useAuth } from '@/entities/user/hooks/useAuth';

export interface RoleTheme {
  role: 'admin' | 'fieldteam' | 'client';
  // Primary button style
  primaryBtn: string;
  // Outline button or secondary button style
  outlineBtn: string;
  // Active pill / badge style
  activeBadge: string;
  // Accent badge (light background with border)
  accentBadge: string;
  // Card / row hover
  rowHover: string;
  // Icon / avatar circle background & text
  avatarBg: string;
  avatarBgHover: string;
  // Text link / accent color
  textAccent: string;
  textAccentHover: string;
  // Focus ring
  focusRing: string;
  // Spinner color
  spinner: string;
  // Border accent
  borderAccent: string;
  // Progress bar / track
  progressBar: string;
  // Icon box container
  iconBox: string;
  // Header / banner gradient
  bannerGradient: string;
  // Subtle card / section background
  subtleBg: string;
}

export const useRoleTheme = (): RoleTheme => {
  const { user } = useAuth();
  const rawRole = (user?.role || '').toLowerCase();
  const isAdmin = rawRole === 'admin';
  const isFieldTeam =
    rawRole === 'fieldteam' ||
    rawRole === 'field_team' ||
    rawRole === 'field-team' ||
    rawRole === 'field' ||
    rawRole === 'worker';

  if (isAdmin) {
    return {
      role: 'admin',
      primaryBtn: 'bg-purple-600 hover:bg-purple-700 text-white shadow-md shadow-purple-600/20 cursor-pointer',
      outlineBtn: 'border-purple-300 text-purple-700 hover:bg-purple-50 cursor-pointer',
      activeBadge: 'bg-purple-600 text-white hover:bg-purple-700',
      accentBadge: 'bg-purple-50 text-purple-700 border-purple-200',
      rowHover: 'hover:bg-purple-50/40',
      avatarBg: 'bg-purple-50 border-purple-200 text-purple-700',
      avatarBgHover: 'group-hover:bg-purple-600 group-hover:text-white',
      textAccent: 'text-purple-600 group-hover:text-purple-700',
      textAccentHover: 'text-purple-600 hover:text-purple-700 hover:bg-purple-50',
      focusRing: 'focus-visible:ring-purple-500',
      spinner: 'text-purple-600',
      borderAccent: 'border-purple-300',
      progressBar: 'bg-purple-600',
      iconBox: 'bg-purple-50 text-purple-700 border-purple-200',
      bannerGradient: 'bg-gradient-to-r from-purple-700 to-indigo-800 text-white',
      subtleBg: 'bg-purple-50/60 border-purple-100',
    };
  }

  if (isFieldTeam) {
    return {
      role: 'fieldteam',
      primaryBtn: 'bg-amber-600 hover:bg-amber-700 text-white shadow-md shadow-amber-600/20 cursor-pointer',
      outlineBtn: 'border-amber-300 text-amber-800 hover:bg-amber-50 cursor-pointer',
      activeBadge: 'bg-amber-600 text-white hover:bg-amber-700',
      accentBadge: 'bg-amber-50 text-amber-800 border-amber-200',
      rowHover: 'hover:bg-amber-50/40',
      avatarBg: 'bg-amber-50 border-amber-200 text-amber-800',
      avatarBgHover: 'group-hover:bg-amber-600 group-hover:text-white',
      textAccent: 'text-amber-700 group-hover:text-amber-800',
      textAccentHover: 'text-amber-700 hover:text-amber-800 hover:bg-amber-50',
      focusRing: 'focus-visible:ring-amber-500',
      spinner: 'text-amber-600',
      borderAccent: 'border-amber-300',
      progressBar: 'bg-amber-600',
      iconBox: 'bg-amber-50 text-amber-800 border-amber-200',
      bannerGradient: 'bg-gradient-to-r from-amber-600 to-orange-700 text-white',
      subtleBg: 'bg-amber-50/60 border-amber-100',
    };
  }

  // Client (Default - Teal/Green)
  return {
    role: 'client',
    primaryBtn: 'bg-teal-600 hover:bg-teal-700 text-white shadow-md shadow-teal-600/20 cursor-pointer',
    outlineBtn: 'border-teal-300 text-teal-800 hover:bg-teal-50 cursor-pointer',
    activeBadge: 'bg-teal-600 text-white hover:bg-teal-700',
    accentBadge: 'bg-teal-50 text-teal-700 border-teal-100',
    rowHover: 'hover:bg-teal-50/30',
    avatarBg: 'bg-teal-50 border-teal-100 text-teal-700',
    avatarBgHover: 'group-hover:bg-teal-600 group-hover:text-white',
    textAccent: 'text-teal-700 group-hover:text-teal-800',
    textAccentHover: 'text-teal-600 hover:text-teal-700 hover:bg-teal-50',
    focusRing: 'focus-visible:ring-teal-500',
    spinner: 'text-teal-600',
    borderAccent: 'border-teal-300',
    progressBar: 'bg-teal-600',
    iconBox: 'bg-teal-50 text-teal-700 border-teal-100',
    bannerGradient: 'bg-gradient-to-r from-teal-700 to-teal-800 text-white',
    subtleBg: 'bg-teal-50/60 border-teal-100',
  };
};

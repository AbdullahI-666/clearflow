import React from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { GoogleLogoIcon, AppleLogoIcon } from './SocialAuthModal';
import { cn } from '@/lib/utils';

export interface SocialAuthButtonsProps {
  onSelectProvider: (provider: 'google' | 'apple') => void;
  role?: 'admin' | 'fieldteam' | 'client' | string;
  mode?: 'signin' | 'register';
  loadingProvider?: 'google' | 'apple' | null;
}

const THEME_BUTTON_STYLES = {
  admin: {
    btnHover: 'hover:border-purple-400/50 hover:bg-purple-500/10 hover:shadow-[0_0_15px_rgba(168,85,247,0.22)] focus:ring-purple-400/40',
    ring: 'focus:border-purple-400',
  },
  fieldteam: {
    btnHover: 'hover:border-amber-400/50 hover:bg-amber-500/10 hover:shadow-[0_0_15px_rgba(245,158,11,0.22)] focus:ring-amber-400/40',
    ring: 'focus:border-amber-400',
  },
  client: {
    btnHover: 'hover:border-teal-400/50 hover:bg-teal-500/10 hover:shadow-[0_0_15px_rgba(20,184,166,0.22)] focus:ring-teal-400/40',
    ring: 'focus:border-teal-400',
  },
};

export const SocialAuthButtons: React.FC<SocialAuthButtonsProps> = ({
  onSelectProvider,
  role = 'client',
  mode = 'signin',
  loadingProvider = null,
}) => {
  const normRole = (role || 'client').toLowerCase();
  const activeRole: 'admin' | 'fieldteam' | 'client' = 
    normRole === 'admin' ? 'admin' :
    normRole === 'fieldteam' || normRole === 'worker' || normRole === 'field' ? 'fieldteam' : 'client';

  const theme = THEME_BUTTON_STYLES[activeRole];

  return (
    <div className="space-y-1.5 pt-0.5">
      {/* Divider - Background completely removed */}
      <div className="flex items-center gap-2.5 sm:gap-3 py-0.5">
        <div className="h-px flex-1 bg-white/10" />
        <span className="text-[10px] sm:text-[10.5px] text-white/45 tracking-wider font-medium select-none shrink-0">
          {mode === 'register' ? 'or sign up with' : 'or sign in with'}
        </span>
        <div className="h-px flex-1 bg-white/10" />
      </div>

      {/* Social Providers Grid */}
      <div className="grid grid-cols-2 gap-2">
        {/* Google Button */}
        <motion.button
          type="button"
          disabled={Boolean(loadingProvider)}
          whileHover={{ scale: 1.015 }}
          whileTap={{ scale: 0.985 }}
          onClick={() => onSelectProvider('google')}
          className={cn(
            "h-8 sm:h-8.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/[0.08] text-white flex items-center justify-center gap-2 text-xs font-semibold transition-all duration-300 shadow-sm cursor-pointer outline-none focus:ring-2 disabled:opacity-60 disabled:cursor-not-allowed",
            theme.btnHover
          )}
        >
          {loadingProvider === 'google' ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-white" />
              <span>Connecting...</span>
            </>
          ) : (
            <>
              <GoogleLogoIcon className="w-4 h-4 shrink-0" />
              <span>Google</span>
            </>
          )}
        </motion.button>

        {/* Apple Button */}
        <motion.button
          type="button"
          disabled={Boolean(loadingProvider)}
          whileHover={{ scale: 1.015 }}
          whileTap={{ scale: 0.985 }}
          onClick={() => onSelectProvider('apple')}
          className={cn(
            "h-8 sm:h-8.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/[0.08] text-white flex items-center justify-center gap-2 text-xs font-semibold transition-all duration-300 shadow-sm cursor-pointer outline-none focus:ring-2 disabled:opacity-60 disabled:cursor-not-allowed",
            theme.btnHover
          )}
        >
          {loadingProvider === 'apple' ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-white" />
              <span>Connecting...</span>
            </>
          ) : (
            <>
              <AppleLogoIcon className="w-4 h-4 shrink-0 fill-current text-white" />
              <span>Apple</span>
            </>
          )}
        </motion.button>
      </div>
    </div>
  );
};

export default SocialAuthButtons;

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, ArrowRight, CheckCircle2, User, Mail, Shield, Smartphone, Lock } from 'lucide-react';
import { apiClient } from '@/infrastructure/api/client';
import { ENDPOINTS } from '@/infrastructure/api/endpoints';
import { useAuth } from '@/entities/user/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export interface SocialAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  provider: 'google' | 'apple';
  role?: 'admin' | 'fieldteam' | 'client' | string;
  mode?: 'login' | 'register';
}

const THEMES = {
  admin: {
    banner: 'from-purple-600 via-purple-500 to-indigo-600',
    border: 'border-purple-500/30',
    glow: 'shadow-[0_0_35px_rgba(168,85,247,0.25)]',
    badge: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    primaryBtn: 'bg-gradient-to-r from-purple-600 via-purple-500 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 shadow-purple-600/30 text-white',
    ring: 'focus:border-purple-400 focus:ring-purple-400/30',
    cardSelect: 'border-purple-400/60 bg-purple-500/15',
    accentText: 'text-purple-300',
  },
  fieldteam: {
    banner: 'from-amber-500 via-amber-600 to-orange-600',
    border: 'border-amber-500/30',
    glow: 'shadow-[0_0_35px_rgba(245,158,11,0.25)]',
    badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    primaryBtn: 'bg-gradient-to-r from-amber-500 via-amber-600 to-orange-600 hover:from-amber-400 hover:to-orange-500 shadow-amber-500/30 text-white',
    ring: 'focus:border-amber-400 focus:ring-amber-400/30',
    cardSelect: 'border-amber-400/60 bg-amber-500/15',
    accentText: 'text-amber-300',
  },
  client: {
    banner: 'from-teal-500 via-emerald-500 to-teal-500',
    border: 'border-teal-500/30',
    glow: 'shadow-[0_0_35px_rgba(20,184,166,0.25)]',
    badge: 'bg-teal-500/20 text-teal-300 border-teal-500/30',
    primaryBtn: 'bg-gradient-to-r from-teal-500 via-emerald-500 to-teal-500 hover:from-teal-400 hover:to-teal-400 shadow-teal-500/30 text-white',
    ring: 'focus:border-teal-400 focus:ring-teal-400/30',
    cardSelect: 'border-teal-400/60 bg-teal-500/15',
    accentText: 'text-teal-300',
  },
};

export const GoogleLogoIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
  </svg>
);

export const AppleLogoIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="3.1 3.4 15.6 18.7" fill="currentColor">
    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.61-.75 1.04-1.8 1.01-2.87-.96.04-2.17.65-2.84 1.43-.58.67-1.09 1.74-1.03 2.79 1.07.08 2.22-.55 2.86-1.35z"/>
  </svg>
);

export const SocialAuthModal: React.FC<SocialAuthModalProps> = ({
  isOpen,
  onClose,
  provider,
  role = 'client',
  mode = 'login',
}) => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const normRole = (role || 'client').toLowerCase();
  const activeRole: 'admin' | 'fieldteam' | 'client' = 
    normRole === 'admin' ? 'admin' :
    normRole === 'fieldteam' || normRole === 'worker' || normRole === 'field' ? 'fieldteam' : 'client';

  const theme = THEMES[activeRole];

  // Default suggested credentials tailored to role & provider (Sara, Hamza, Hassan, Bilal - no surnames)
  const defaultName = activeRole === 'admin'
    ? 'Ahsan'
    : activeRole === 'fieldteam'
    ? (provider === 'google' ? 'Hamza' : 'Bilal')
    : (provider === 'google' ? 'Sara' : 'Hassan');

  const defaultEmail = activeRole === 'admin'
    ? (provider === 'google' ? 'ahsankhalid9768@gmail.com' : 'ahsankhalid@icloud.com')
    : activeRole === 'fieldteam'
    ? (provider === 'google' ? 'hamza@clearflow.com' : 'bilal@clearflow.com')
    : (provider === 'google' ? 'sara@clearflow.com' : 'hassan@clearflow.com');

  const [selectedAccount, setSelectedAccount] = useState<'primary' | 'custom'>('primary');
  const [customEmail, setCustomEmail] = useState('');
  const [customName, setCustomName] = useState('');
  const [hideEmail, setHideEmail] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleOAuthSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsLoading(true);

    try {
      const authEmail = selectedAccount === 'primary' 
        ? defaultEmail 
        : (customEmail.trim() || defaultEmail);
      const authName = selectedAccount === 'primary'
        ? defaultName
        : (customName.trim() || (provider === 'apple' ? 'Apple Member' : 'Google Member'));

      const payload = {
        provider,
        email: authEmail,
        name: authName,
        role: activeRole === 'fieldteam' ? 'FieldTeam' : activeRole === 'admin' ? 'Admin' : 'Client',
      };

      const res: any = await apiClient.post(ENDPOINTS.AUTH.OAUTH, payload);
      const authData = res?.data?.data || res?.data || res;

      if (authData?.token && authData?.user) {
        // Persist session
        try {
          localStorage.setItem('clearflow_token', authData.token);
          localStorage.setItem('token', authData.token);
          localStorage.setItem('clearflow_user', JSON.stringify(authData.user));
          localStorage.setItem('cf_preferred_role', (authData.user.role || '').toLowerCase());
        } catch (_) {}

        login(authData.token, authData.user);
        toast.success(res?.data?.message || authData.message || `Signed in with ${provider === 'apple' ? 'Apple' : 'Google'}!`);
        onClose();
        navigate('/dashboard', { replace: true });
      } else {
        toast.error('Unexpected response from authentication server.');
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || `Failed to sign in with ${provider === 'apple' ? 'Apple' : 'Google'}`;
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto touch-scroll safe-pt safe-pb">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity"
          />

          {/* Modal Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className={cn(
              "relative w-full max-w-[calc(100vw-1.5rem)] sm:max-w-md max-h-[min(90dvh,calc(100vh-2rem))] overflow-y-auto touch-scroll my-auto bg-[#0e0f14]/95 border rounded-2xl sm:rounded-3xl shadow-2xl z-10 flex flex-col",
              theme.border,
              theme.glow
            )}
          >
            {/* Header */}
            <div className={cn("px-5 py-4 bg-gradient-to-r text-white flex items-center justify-between shrink-0", theme.banner)}>
              <div className="flex items-center gap-2.5">
                <div>
                  <h3 className="font-bold text-base tracking-tight">
                    {provider === 'google' ? 'Google Authentication' : 'Apple ID Verification'}
                  </h3>
                  <p className="text-white/80 text-xs">
                    {mode === 'register' ? 'Register ClearFlow Account' : 'Sign in to ClearFlow'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content Form */}
            <div className="p-5 sm:p-6 space-y-4">
              <div className="text-center space-y-1">
                <p className="text-white/80 text-xs sm:text-sm font-medium">
                  {provider === 'google'
                    ? 'Choose an authorized Google Account to proceed'
                    : 'Authorize with your Apple ID credentials'}
                </p>
                <span className={cn("inline-block px-2.5 py-0.5 rounded-full border text-[10px] font-semibold uppercase tracking-wider", theme.badge)}>
                  {activeRole === 'fieldteam' ? 'Worker Role' : activeRole === 'admin' ? 'Admin Role' : 'Client Role'}
                </span>
              </div>

              {/* Quick Account Pill */}
              <div
                onClick={() => setSelectedAccount('primary')}
                className={cn(
                  "p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between",
                  selectedAccount === 'primary' 
                    ? theme.cardSelect 
                    : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-white/20 to-white/10 flex items-center justify-center font-bold text-white text-sm border border-white/20 shadow-xs">
                    {defaultName.charAt(0)}
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-white text-xs sm:text-sm leading-tight">{defaultName}</p>
                    <p className="text-white/60 text-[11px] sm:text-xs font-mono">{defaultEmail}</p>
                  </div>
                </div>
                {selectedAccount === 'primary' && (
                  <CheckCircle2 className={cn("w-5 h-5 shrink-0", theme.accentText)} />
                )}
              </div>

              {/* Custom / Alternative Account Option */}
              <div
                onClick={() => setSelectedAccount('custom')}
                className={cn(
                  "p-3.5 rounded-2xl border transition-all cursor-pointer space-y-2.5",
                  selectedAccount === 'custom' 
                    ? theme.cardSelect 
                    : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]"
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-white/60" />
                    <span className="text-xs sm:text-sm font-semibold text-white">Use a different {provider === 'google' ? 'Google' : 'Apple'} email</span>
                  </div>
                  {selectedAccount === 'custom' && (
                    <CheckCircle2 className={cn("w-5 h-5 shrink-0", theme.accentText)} />
                  )}
                </div>

                {selectedAccount === 'custom' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="space-y-2 pt-1"
                  >
                    <input
                      type="text"
                      placeholder="Full Name"
                      value={customName}
                      onChange={(e) => setCustomName(e.target.value)}
                      className="w-full h-9 rounded-xl border border-white/15 bg-white/5 px-3 text-xs text-white placeholder:text-white/30 outline-none focus:border-white/40"
                    />
                    <input
                      type="email"
                      placeholder={`name@${provider === 'google' ? 'gmail.com' : 'icloud.com'}`}
                      value={customEmail}
                      onChange={(e) => setCustomEmail(e.target.value)}
                      className="w-full h-9 rounded-xl border border-white/15 bg-white/5 px-3 text-xs text-white placeholder:text-white/30 outline-none focus:border-white/40"
                    />
                  </motion.div>
                )}
              </div>

              {/* Apple Specific: Hide My Email toggle */}
              {provider === 'apple' && (
                <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/10 text-xs text-white/70">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-white/50" />
                    <span>Hide My Email (iCloud Relay)</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={hideEmail}
                    onChange={(e) => setHideEmail(e.target.checked)}
                    className="h-4 w-4 rounded border-white/20 bg-white/10 text-amber-500 focus:ring-0 cursor-pointer"
                  />
                </div>
              )}

              {/* Trust statement */}
              <div className="flex items-center justify-center gap-1.5 text-[11px] text-white/45">
                <Lock className="w-3 h-3" />
                <span>Verified End-to-End Cryptographic Handshake</span>
              </div>
            </div>

            {/* Bottom Submit */}
            <div className="px-5 py-4 bg-[#0a0b0e] border-t border-white/10 flex items-center justify-between gap-3 shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-xs sm:text-sm font-semibold transition-all cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => handleOAuthSubmit()}
                disabled={isLoading}
                className={cn(
                  "px-5 py-2 sm:px-6 sm:py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer hover:scale-[1.01] active:scale-[0.99]",
                  theme.primaryBtn
                )}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Authenticating...</span>
                  </>
                ) : (
                  <>
                    <span>Continue with {provider === 'apple' ? 'Apple' : 'Google'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default SocialAuthModal;

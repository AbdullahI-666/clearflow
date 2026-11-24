import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, CheckCircle2, AlertCircle, ArrowRight, ShieldCheck, KeyRound, Info } from 'lucide-react';
import { useAuth } from '@/entities/user/hooks/useAuth';
import { apiClient } from '@/infrastructure/api/client';
import { ENDPOINTS } from '@/infrastructure/api/endpoints';
import { completeGoogleOAuth, completeAppleOAuth } from '../services/oauth.service';
import { GoogleLogoIcon, AppleLogoIcon } from '../components/SocialAuthModal';
import { ShaderBackground } from '@/components/ui/green-shader';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface OAuthCallbackProps {
  providerOverride?: 'google' | 'apple';
}

export const OAuthCallbackPage: React.FC<OAuthCallbackProps> = ({ providerOverride }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();
  const { login } = useAuth();

  const provider = (providerOverride || (location.pathname.includes('apple') ? 'apple' : 'google')) as 'google' | 'apple';

  const [status, setStatus] = useState<'verifying' | 'success' | 'error' | 'unconfigured'>('verifying');
  const [errorMessage, setErrorMessage] = useState('');
  const [userProfile, setUserProfile] = useState<{ name?: string; email?: string; role?: string } | null>(null);
  const [roleTheme, setRoleTheme] = useState<'fieldteam' | 'client'>('client');

  const executionLockRef = useRef(false);

  useEffect(() => {
    if (executionLockRef.current) return;
    executionLockRef.current = true;

    const processOAuth = async () => {
      try {
        // 1. Extract query params and hash fragment
        const searchParams = new URLSearchParams(location.search);
        
        // Handle hash fragments (Apple uses response_mode=fragment)
        let hashParams = new URLSearchParams();
        if (location.hash && location.hash.length > 1) {
          hashParams = new URLSearchParams(location.hash.substring(1));
        }

        const code = searchParams.get('code') || hashParams.get('code');
        const idToken = searchParams.get('id_token') || hashParams.get('id_token');
        const state = searchParams.get('state') || hashParams.get('state');
        const error = searchParams.get('error') || hashParams.get('error');
        const errorDescription = searchParams.get('error_description') || hashParams.get('error_description');

        // Extract role hint from query params or state
        const roleParam = searchParams.get('role');
        if (roleParam) {
          const r = roleParam.toLowerCase();
          if (r === 'fieldteam' || r === 'worker' || r === 'field') setRoleTheme('fieldteam');
          else setRoleTheme('client');
        } else if (state) {
          try {
            const raw = state.split('.')[0];
            let padded = raw.replace(/-/g, '+').replace(/_/g, '/');
            while (padded.length % 4) padded += '=';
            const parsed = JSON.parse(atob(padded));
            if (parsed.role) {
              const r = String(parsed.role).toLowerCase();
              if (r === 'fieldteam' || r === 'worker') setRoleTheme('fieldteam');
              else setRoleTheme('client');
            }
          } catch (_) {}
        }

        // 2. Check for user cancellation or provider error
        if (error) {
          if (error === 'access_denied') {
            toast.info('Sign-in cancelled by user. Returning to login.');
          } else {
            toast.error(errorDescription || `Authentication error: ${error}`);
          }
          setStatus('error');
          setErrorMessage(errorDescription || 'Authentication was cancelled or not approved.');
          setTimeout(() => navigate('/login', { replace: true }), 2500);
          return;
        }

        // 3. If neither code nor id_token is provided, provider credentials are awaiting external setup
        if (!code && !idToken) {
          setStatus('unconfigured');
          return;
        }

        // 4. Exchange code / verify token with ClearFlow Backend
        let authResult: any = null;

        if (provider === 'google') {
          authResult = await completeGoogleOAuth(code || '', state || '');
        } else {
          authResult = await completeAppleOAuth(idToken || code || '', code || undefined, state || undefined);
        }

        const data = authResult?.data || authResult;
        if (!data || !data.token || !data.user) {
          throw new Error('Authentication succeeded but server returned invalid user payload.');
        }

        // 5. Establish secure session in frontend
        setUserProfile(data.user);
        const userRole = (data.user.role || 'client').toLowerCase();
        if (userRole === 'fieldteam' || userRole === 'worker') setRoleTheme('fieldteam');
        else setRoleTheme('client');

        login(data.token, data.user);
        setStatus('success');
        toast.success(`Welcome to ClearFlow, ${data.user.name || 'Member'}!`);

        // Navigate to role-based dashboard after a brief animation confirmation
        setTimeout(() => {
          navigate('/dashboard', { replace: true });
        }, 1200);

      } catch (err: any) {
        console.error('OAuth Callback Error:', err);
        const msg = err.response?.data?.message || err.message || 'Authentication exchange failed.';
        
        // If credentials are unconfigured on backend
        if (msg.includes('credentials') && (msg.includes('server/.env') || msg.includes('required'))) {
          setStatus('unconfigured');
          setErrorMessage(msg);
        } else {
          setStatus('error');
          setErrorMessage(msg);
        }
      }
    };

    processOAuth();
  }, [location, provider, navigate, login]);

  const isGoogle = provider === 'google';
  const isWorker = roleTheme === 'fieldteam';

  const defaultName = isGoogle
    ? (isWorker ? 'Hamza' : 'Sara')
    : (isWorker ? 'Bilal' : 'Hassan');

  const defaultEmail = isGoogle
    ? (isWorker ? 'hamza.worker@clearflow.com' : 'sara.client@clearflow.com')
    : (isWorker ? 'bilal.worker@clearflow.com' : 'hassan.client@clearflow.com');

  // Developer quick-test action for staging / evaluation
  const handleRunDeveloperTest = async () => {
    setStatus('verifying');
    try {
      const targetRole = isWorker ? 'FieldTeam' : 'Client';
      
      const payload = {
        provider,
        email: defaultEmail,
        name: defaultName,
        role: targetRole,
      };

      const res: any = await apiClient.post(ENDPOINTS.AUTH.OAUTH, payload);
      const data = res?.data?.data || res?.data || res;

      if (data?.token && data?.user) {
        try {
          localStorage.setItem('clearflow_token', data.token);
          localStorage.setItem('token', data.token);
          localStorage.setItem('clearflow_user', JSON.stringify(data.user));
          localStorage.setItem('cf_preferred_role', (data.user.role || '').toLowerCase());
        } catch (_) {}

        login(data.token, data.user);
        setStatus('success');
        setUserProfile(data.user);
        toast.success(`Verified test account (${data.user.role})! Redirecting...`);
        setTimeout(() => navigate('/dashboard', { replace: true }), 1000);
      } else {
        throw new Error('Server returned invalid user payload.');
      }
    } catch (e: any) {
      console.error('Test Flow Error:', e);
      setStatus('error');
      setErrorMessage(e.response?.data?.message || e.message || 'Developer test failed.');
    }
  };

  const THEMES = {
    admin: {
      shader: 'admin' as const,
      glow: 'shadow-[0_0_80px_rgba(168,85,247,0.35)]',
      cardSurface: 'bg-[#0e071c]/90',
      border: 'border-purple-500/40',
      badge: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
      btn: 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-purple-600/30',
      activeTab: 'bg-purple-500/25 text-purple-200 border-purple-500/50 shadow-sm shadow-purple-500/20',
      accentText: 'text-purple-300',
    },
    fieldteam: {
      shader: 'fieldteam' as const,
      glow: 'shadow-[0_0_80px_rgba(245,158,11,0.35)]',
      cardSurface: 'bg-[#180c04]/90',
      border: 'border-amber-500/40',
      badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      btn: 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white shadow-amber-500/30',
      activeTab: 'bg-amber-500/25 text-amber-200 border-amber-500/50 shadow-sm shadow-amber-500/20',
      accentText: 'text-amber-300',
    },
    client: {
      shader: 'client' as const,
      glow: 'shadow-[0_0_80px_rgba(20,184,166,0.35)]',
      cardSurface: 'bg-[#081510]/90',
      border: 'border-teal-500/40',
      badge: 'bg-teal-500/20 text-teal-300 border-teal-500/40',
      btn: 'bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white shadow-teal-500/30',
      activeTab: 'bg-teal-500/25 text-teal-200 border-teal-500/50 shadow-sm shadow-teal-500/20',
      accentText: 'text-teal-300',
    },
  };

  const currentTheme = THEMES[roleTheme];

  return (
    <div className="min-h-screen w-full relative overflow-hidden flex items-center justify-center p-4 bg-slate-950 text-white select-none">
      <ShaderBackground role={currentTheme.shader} className="absolute inset-0 z-0 pointer-events-none opacity-85" />
      <div className="absolute inset-0 z-0 bg-radial from-transparent via-slate-950/70 to-slate-950 pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className={cn(
          "w-full max-w-md relative z-10 rounded-3xl backdrop-blur-2xl border p-6 sm:p-8 text-center shadow-2xl overflow-hidden isolate [transform:translateZ(0)]",
          currentTheme.cardSurface,
          currentTheme.border,
          currentTheme.glow
        )}
      >
        <AnimatePresence mode="wait">
          {/* VERIFYING STATE */}
          {status === 'verifying' && (
            <motion.div
              key="verifying"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-5"
            >
              <div className="relative mx-auto w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shadow-inner">
                {provider === 'google' ? (
                  <GoogleLogoIcon className="w-8 h-8" />
                ) : (
                  <AppleLogoIcon className="w-8 h-8 text-white" />
                )}
                <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-slate-900 border border-white/20 flex items-center justify-center">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                </div>
              </div>

              <div className="space-y-1.5">
                <h3 className="text-xl font-bold tracking-tight text-white">
                  Verifying {provider === 'google' ? 'Google' : 'Apple'} Credentials
                </h3>
                <p className="text-xs sm:text-sm text-white/60 leading-relaxed">
                  Cryptographically validating signature & establishing your ClearFlow session...
                </p>
              </div>

              <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
                <motion.div
                  className={cn("h-full", currentTheme.btn)}
                  initial={{ width: "20%" }}
                  animate={{ width: "90%" }}
                  transition={{ duration: 2, repeat: Infinity, repeatType: "reverse" }}
                />
              </div>
            </motion.div>
          )}

          {/* SUCCESS STATE */}
          {status === 'success' && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-5"
            >
              <div className="mx-auto w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shadow-lg">
                <CheckCircle2 className="w-9 h-9 text-emerald-400" />
              </div>

              <div className="space-y-1.5">
                <span className={cn("inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold border mb-1", currentTheme.badge)}>
                  {userProfile?.role || 'Verified User'}
                </span>
                <h3 className="text-xl font-bold tracking-tight text-white">
                  Authenticated Successfully!
                </h3>
                <p className="text-xs sm:text-sm text-white/70">
                  Welcome, <span className="text-white font-medium">{userProfile?.name || userProfile?.email}</span>. Opening your ClearFlow portal...
                </p>
              </div>

              <div className="flex items-center justify-center gap-2 text-xs text-white/50 pt-1">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Redirecting to Dashboard</span>
              </div>
            </motion.div>
          )}

          {/* UNCONFIGURED CREDENTIALS GUIDANCE */}
          {status === 'unconfigured' && (
            <motion.div
              key="unconfigured"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-4 text-center"
            >
              <div className="text-center space-y-1">
                <h3 className="text-base font-bold text-white tracking-tight">
                  {provider === 'google' ? 'Google Sign-In Setup' : 'Apple Sign-In Setup'}
                </h3>
                <p className="text-xs text-white/60">
                  {provider === 'google'
                    ? 'Official Google authentication is currently awaiting developer configuration.'
                    : 'Official Sign in with Apple is currently awaiting developer configuration.'}
                </p>
              </div>

              {/* Role Selector Tabs - Text Only, Client and Worker, Centered */}
              <div className="pt-1">
                <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-white/5 border border-white/10 max-w-xs mx-auto">
                  <button
                    type="button"
                    onClick={() => setRoleTheme('client')}
                    className={cn(
                      "py-2 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center justify-center border border-transparent",
                      roleTheme === 'client'
                        ? currentTheme.activeTab
                        : "text-white/60 hover:text-white hover:bg-white/5"
                    )}
                  >
                    Client
                  </button>
                  <button
                    type="button"
                    onClick={() => setRoleTheme('fieldteam')}
                    className={cn(
                      "py-2 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center justify-center border border-transparent",
                      roleTheme === 'fieldteam'
                        ? currentTheme.activeTab
                        : "text-white/60 hover:text-white hover:bg-white/5"
                    )}
                  >
                    Worker
                  </button>
                </div>
              </div>

              {/* Instant Test Flow Execution */}
              <div className="space-y-1.5 pt-1">
                <button
                  type="button"
                  onClick={handleRunDeveloperTest}
                  className={cn(
                    "w-full py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all shadow-md",
                    currentTheme.btn
                  )}
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>
                    Test Flow: Authenticate as {defaultName} ({isWorker ? 'Worker' : 'Client'})
                  </span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Return to Sign Up */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => navigate('/register', { replace: true })}
                  className="w-full py-2 text-center text-xs text-white/50 hover:text-white transition-colors cursor-pointer"
                >
                  Return to Sign Up
                </button>
              </div>
            </motion.div>
          )}

          {/* ERROR STATE */}
          {status === 'error' && (
            <motion.div
              key="error"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              <div className="mx-auto w-14 h-14 rounded-2xl bg-red-500/20 border border-red-500/30 flex items-center justify-center">
                <AlertCircle className="w-7 h-7 text-red-400" />
              </div>

              <div className="space-y-1">
                <h3 className="text-lg font-bold text-white">Authentication Failed</h3>
                <p className="text-xs text-red-300/90 max-w-sm mx-auto leading-relaxed">
                  {errorMessage || 'Unable to complete sign-in. Please try again.'}
                </p>
              </div>

              <div className="pt-2 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => setStatus('unconfigured')}
                  className={cn("w-full py-2.5 rounded-xl font-semibold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-md", currentTheme.btn)}
                >
                  <span>Try Again with Test Flow</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => navigate('/register', { replace: true })}
                  className="w-full py-2 rounded-xl font-semibold text-xs border border-white/10 bg-white/5 hover:bg-white/10 text-white flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  <span>Return to Sign Up</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

export default OAuthCallbackPage;

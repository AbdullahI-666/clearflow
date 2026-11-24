import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { Mail, Lock, Eye, EyeClosed, ArrowRight, Leaf, KeyRound, Loader2, ShieldAlert, AlertTriangle, Shield, User, Wrench, UserPlus } from 'lucide-react';
import { useAuth } from '@/entities/user/hooks/useAuth';
import { apiClient } from '@/infrastructure/api/client';
import { ENDPOINTS } from '@/infrastructure/api/endpoints';
import { toast } from 'sonner';
import { ShaderBackground } from '@/components/ui/green-shader';
import { ClearFlowPreloader } from '@/components/ui/clearflow-preloader';
import { CodeSlots } from '@/components/ui/CodeSlots';
import { SocialAuthButtons } from '@/features/auth/components/SocialAuthButtons';
import { SocialAuthModal } from '@/features/auth/components/SocialAuthModal';
import { initiateGoogleOAuth, initiateAppleOAuth } from '@/features/auth/services/oauth.service';

import { cn } from "@/lib/utils"

const LOGIN_THEMES = {
  admin: {
    bgPage: 'bg-[#080312]',
    shaderVignette: 'from-transparent via-[#080312]/40 to-[#04010a]/85',
    shaderGradient: 'from-[#080312]/30 via-transparent to-[#04010a]/75',
    topGlow: 'bg-purple-500/15',
    cardOuterGlow: [
      "0 0 20px 2px rgba(168,85,247,0.18)",
      "0 0 35px 8px rgba(147,51,234,0.24)",
      "0 0 20px 2px rgba(168,85,247,0.18)"
    ],
    beamGradient: 'from-transparent via-purple-300 to-transparent',
    cardSurface: 'bg-[#0e071c]/90 border-purple-500/20 shadow-[0_25px_60px_rgba(10,3,25,0.8)]',
    logoBox: 'bg-gradient-to-br from-purple-500 via-purple-600 to-indigo-600 shadow-purple-500/35',
    logoIcon: Leaf,
    inputFocusRing: 'focus-visible:border-purple-400 focus-visible:ring-purple-400/30 selection:bg-purple-600 focus-visible:ring-[3px]',
    inputIconFocus: 'text-purple-300',
    inputHighlight: 'bg-purple-500/10',
    checkbox: 'checked:bg-purple-600 checked:border-purple-600 focus:ring-purple-500/30',
    linkText: 'text-purple-400 hover:text-purple-300',
    primaryBtn: 'bg-gradient-to-r from-purple-600 via-purple-500 to-indigo-600 shadow-purple-600/30',
    btnGlow: 'bg-purple-500/30',
    keyIcon: 'text-purple-400',
    registerLink: 'text-purple-400 group-hover/signup:text-purple-300',
    registerUnderline: 'bg-purple-400',
  },
  fieldteam: {
    bgPage: 'bg-[#120802]',
    shaderVignette: 'from-transparent via-[#120802]/40 to-[#090401]/85',
    shaderGradient: 'from-[#120802]/30 via-transparent to-[#090401]/75',
    topGlow: 'bg-amber-500/15',
    cardOuterGlow: [
      "0 0 20px 2px rgba(245,158,11,0.18)",
      "0 0 35px 8px rgba(217,119,6,0.24)",
      "0 0 20px 2px rgba(245,158,11,0.18)"
    ],
    beamGradient: 'from-transparent via-amber-300 to-transparent',
    cardSurface: 'bg-[#180c04]/90 border-amber-500/20 shadow-[0_25px_60px_rgba(20,8,0,0.8)]',
    logoBox: 'bg-gradient-to-br from-amber-500 via-amber-600 to-orange-600 shadow-amber-500/35',
    logoIcon: Leaf,
    inputFocusRing: 'focus-visible:border-amber-400 focus-visible:ring-amber-400/30 selection:bg-amber-500 focus-visible:ring-[3px]',
    inputIconFocus: 'text-amber-300',
    inputHighlight: 'bg-amber-500/10',
    checkbox: 'checked:bg-amber-500 checked:border-amber-500 focus:ring-amber-500/30',
    linkText: 'text-amber-400 hover:text-amber-300',
    primaryBtn: 'bg-gradient-to-r from-amber-500 via-amber-600 to-orange-600 shadow-amber-500/30',
    btnGlow: 'bg-amber-500/30',
    keyIcon: 'text-amber-400',
    registerLink: 'text-amber-400 group-hover/signup:text-amber-300',
    registerUnderline: 'bg-amber-400',
  },
  client: {
    bgPage: 'bg-[#07130e]',
    shaderVignette: 'from-transparent via-[#07130e]/40 to-[#050e0a]/80',
    shaderGradient: 'from-[#07130e]/30 via-transparent to-[#050e0a]/70',
    topGlow: 'bg-teal-400/10',
    cardOuterGlow: [
      "0 0 20px 2px rgba(20,184,166,0.12)",
      "0 0 35px 8px rgba(16,185,129,0.18)",
      "0 0 20px 2px rgba(20,184,166,0.12)"
    ],
    beamGradient: 'from-transparent via-teal-300 to-transparent',
    cardSurface: 'bg-[#081510]/85 border-white/10 shadow-[0_25px_60px_rgba(0,0,0,0.7)]',
    logoBox: 'bg-gradient-to-br from-teal-500 to-emerald-600 shadow-teal-500/25',
    logoIcon: Leaf,
    inputFocusRing: 'focus-visible:border-teal-400 focus-visible:ring-teal-400/30 selection:bg-teal-500 focus-visible:ring-[3px]',
    inputIconFocus: 'text-teal-300',
    inputHighlight: 'bg-teal-500/10',
    checkbox: 'checked:bg-teal-500 checked:border-teal-500 focus:ring-teal-500/30',
    linkText: 'text-teal-400 hover:text-teal-300',
    primaryBtn: 'bg-gradient-to-r from-teal-500 to-emerald-500 shadow-teal-500/25',
    btnGlow: 'bg-teal-500/25',
    keyIcon: 'text-teal-400',
    registerLink: 'text-teal-400 group-hover/signup:text-teal-300',
    registerUnderline: 'bg-teal-400',
  },
};

const SignInInput = React.forwardRef<HTMLInputElement, React.ComponentProps<"input"> & { focusRing?: string }>(
  ({ className, type, focusRing, ...props }, ref) => {
    return (
      <input
        ref={ref}
        type={type}
        data-slot="input"
        autoComplete={props.autoComplete || "off"}
        className={cn(
          "file:text-foreground placeholder:text-white/35 border-white/10 flex h-12 w-full min-w-0 rounded-xl border bg-white/5 px-4 py-2 text-sm sm:text-base shadow-xs transition-all outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
          focusRing || "focus-visible:border-teal-400 focus-visible:ring-teal-400/30 focus-visible:ring-[3px]",
          "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
          className
        )}
        {...props}
      />
    );
  }
);
SignInInput.displayName = "SignInInput";

const validateLoginIdentifier = (identifierStr: string): string | null => {
  const trimmed = identifierStr.trim();
  if (!trimmed) {
    return 'Please enter your email or username.';
  }

  // If the user typed an email address (contains '@'), validate email format and domain typos
  if (trimmed.includes('@')) {
    const [localPart, domain] = trimmed.split('@');
    if (!localPart || localPart.trim() === '') {
      return 'Missing name before "@". Please enter a valid email or username.';
    }
    if (!domain || domain.trim() === '') {
      return 'Missing domain after "@". Please enter a domain like gmail.com.';
    }

    const knownTypos: Record<string, string> = {
      'gmai.com': 'gmail.com',
      'gmial.com': 'gmail.com',
      'gamil.com': 'gmail.com',
      'gmal.com': 'gmail.com',
      'gmaill.com': 'gmail.com',
      'gmaii.com': 'gmail.com',
      'gmail.co': 'gmail.com',
      'gmail.cm': 'gmail.com',
      'gma.com': 'gmail.com',
      'hotmial.com': 'hotmail.com',
      'hotmal.com': 'hotmail.com',
      'hotmai.com': 'hotmail.com',
      'outlok.com': 'outlook.com',
      'outloo.com': 'outlook.com',
      'yaho.com': 'yahoo.com',
      'yahooo.com': 'yahoo.com',
      'clearflo.com': 'clearflow.com',
      'clearfloww.com': 'clearflow.com',
      'clerflow.com': 'clearflow.com',
    };

    if (knownTypos[domain.toLowerCase()]) {
      return `Wrong domain "@${domain}". Did you mean "@${knownTypos[domain.toLowerCase()]}"? Please fix it to continue.`;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmed)) {
      return 'Invalid email format. Please check your email or enter your username.';
    }
    return null;
  }

  // If the user typed a username/name, ensure it has at least 2 characters
  if (trimmed.length < 2) {
    return 'Username must be at least 2 characters long.';
  }

  return null;
};

const getClientDeviceId = (): string => {
  try {
    let id = localStorage.getItem('clearflow_device_id');
    if (!id) {
      id = 'dev_' + Math.random().toString(36).substring(2, 10) + '_' + Date.now().toString(36);
      localStorage.setItem('clearflow_device_id', id);
    }
    return id;
  } catch {
    return 'dev_default';
  }
};

export function SignInCard2() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { login } = useAuth();

  // Theme state: initialized from URL param or default to admin
  const [selectedRole, setSelectedRole] = useState<'admin' | 'fieldteam' | 'client'>(() => {
    const p = searchParams.get('role')?.toLowerCase();
    if (p === 'fieldteam' || p === 'worker') return 'fieldteam';
    if (p === 'client') return 'client';
    if (p === 'admin') return 'admin';
    return 'admin';
  });

  const [showPassword, setShowPassword] = useState(false);
  const initialEmail = searchParams.get('email') || (location.state as any)?.email || '';
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [focusedInput, setFocusedInput] = useState<string | null>(null);
  const [rememberMe, setRememberMe] = useState(() => {
    try {
      return localStorage.getItem('clearflow_remember_me') === 'true';
    } catch {
      return false;
    }
  });
  const [error, setError] = useState('');
  const [isLocked, setIsLocked] = useState(false);
  const [isUnverified, setIsUnverified] = useState(false);
  const [isNotRegistered, setIsNotRegistered] = useState(false);
  const [isActivating, setIsActivating] = useState(false);

  // 2FA Security Code Verification State (Live email verification code every time)
  const [isAwaitingCode, setIsAwaitingCode] = useState(false);
  const [verificationCodeInput, setVerificationCodeInput] = useState('');
  const [codeHint, setCodeHint] = useState('');
  const [isVerifyingCode, setIsVerifyingCode] = useState(false);
  const [isResendingCode, setIsResendingCode] = useState(false);
  const [isSocialModalOpen, setIsSocialModalOpen] = useState(false);
  const [socialModalProvider, setSocialModalProvider] = useState<'google' | 'apple'>('google');
  const [socialLoading, setSocialLoading] = useState<'google' | 'apple' | null>(null);

  // ── Auto-Cycling Theme: rotate through 3 themes every 5 seconds when idle ──
  // Sequence: Purple (admin) → Green (client) → Amber (fieldteam) → repeat
  useEffect(() => {
    if (email.trim() || isAwaitingCode || searchParams.get('role')) return;

    const timer = setInterval(() => {
      setSelectedRole((prev) => {
        const order: ('admin' | 'client' | 'fieldteam')[] = ['admin', 'client', 'fieldteam'];
        const currentIdx = order.indexOf(prev);
        const nextIdx = (currentIdx + 1) % order.length;
        return order[nextIdx];
      });
    }, 5000);

    return () => clearInterval(timer);
  }, [email, isAwaitingCode, searchParams]);

  const handleInstantActivate = async () => {
    if (!email) return;
    setIsActivating(true);
    try {
      const res = await apiClient.post(ENDPOINTS.AUTH.INSTANT_ACTIVATE, { email: email.trim().toLowerCase() });
      if (res.data?.success) {
        toast.success(res.data.message || 'Account verified! Logging in...');
        setIsUnverified(false);
        setError('');
        if (password) {
          setTimeout(() => {
            const form = document.querySelector('form');
            if (form) form.requestSubmit();
          }, 300);
        }
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Could not activate account');
    } finally {
      setIsActivating(false);
    }
  };

  const handleResendVerification = async () => {
    if (!email) return;
    setIsActivating(true);
    try {
      const res = await apiClient.post(ENDPOINTS.AUTH.RESEND_VERIFICATION, { email: email.trim().toLowerCase() });
      if (res.data?.success) {
        toast.success('Verification link resent! Check your inbox or click Activate Account.');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to resend verification email');
    } finally {
      setIsActivating(false);
    }
  };

  // Branded ClearFlow preloader runs when website is freshly opened or reloaded, NOT on signout from any portal
  const [isPreloading, setIsPreloading] = useState(() => {
    if (typeof window === 'undefined') return false;

    // Bypassed if redirected from signout
    const isFromSignOut = (location.state as any)?.fromSignOut || sessionStorage.getItem('clearflow_from_signout') === 'true';
    if (isFromSignOut) {
      try {
        sessionStorage.removeItem('clearflow_from_signout');
      } catch {}
      return false;
    }

    if ((location.state as any)?.skipPreloader) {
      return false;
    }

    return true;
  });

  useEffect(() => {
    if ((location.state as any)?.fromSignOut || sessionStorage.getItem('clearflow_from_signout') === 'true') {
      try {
        sessionStorage.removeItem('clearflow_from_signout');
      } catch {}
      setIsPreloading(false);
    }
  }, [location.state]);

  // Guard against browser credential autofill on load
  const [isAutofillGuarded, setIsAutofillGuarded] = useState(true);
  const emailInputRef = useRef<HTMLInputElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Purge any stored or injected autofill values on page load
    setEmail("");
    setPassword("");
    if (emailInputRef.current) emailInputRef.current.value = "";
    if (passwordInputRef.current) passwordInputRef.current.value = "";

    const timer = setTimeout(() => {
      if (emailInputRef.current && !email) emailInputRef.current.value = "";
      if (passwordInputRef.current && !password) passwordInputRef.current.value = "";
      setIsAutofillGuarded(false);
    }, 450);

    return () => clearTimeout(timer);
  }, []);

  // For 3D card effect
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const rotateX = useTransform(mouseY, [-350, 350], [9, -9]);
  const rotateY = useTransform(mouseX, [-350, 350], [-9, 9]);

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    mouseX.set(e.clientX - rect.left - rect.width / 2);
    mouseY.set(e.clientY - rect.top - rect.height / 2);
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  const fillDemo = (demoEmail: string, demoPass: string) => {
    setIsAutofillGuarded(false);
    setEmail(demoEmail);
    setPassword(demoPass);
    if (emailInputRef.current) emailInputRef.current.value = demoEmail;
    if (passwordInputRef.current) passwordInputRef.current.value = demoPass;
    if (demoEmail.includes('admin') || demoEmail.includes('ahsankhalid9768') || demoEmail.includes('abdullahikram666')) {
      setSelectedRole('admin');
      try { localStorage.setItem('cf_preferred_role', 'admin'); } catch (e) {}
    } else if (demoEmail.includes('field') || demoEmail.includes('team') || demoEmail.includes('crew') || demoEmail.includes('worker')) {
      setSelectedRole('fieldteam');
      try { localStorage.setItem('cf_preferred_role', 'fieldteam'); } catch (e) {}
    } else {
      setSelectedRole('client');
      try { localStorage.setItem('cf_preferred_role', 'client'); } catch (e) {}
    }
    setError('');
    setIsLocked(false);
    setIsUnverified(false);
    setIsNotRegistered(false);
  };

  const handleEmailChange = (val: string) => {
    setEmail(val);
    const lower = val.toLowerCase();
    if (lower.includes('admin') || lower.includes('ahsankhalid9768') || lower.includes('abdullahikram666') || lower === 'ahsan' || lower === 'abdullah ikram' || lower === 'abdullah') {
      setSelectedRole('admin');
      try { localStorage.setItem('cf_preferred_role', 'admin'); } catch (e) {}
    } else if (lower.includes('field') || lower.includes('team') || lower.includes('crew') || lower.includes('worker') || lower === 'hamza' || lower === 'bilal') {
      setSelectedRole('fieldteam');
      try { localStorage.setItem('cf_preferred_role', 'fieldteam'); } catch (e) {}
    } else if (lower.includes('client') || lower === 'sara' || lower === 'hassan') {
      setSelectedRole('client');
      try { localStorage.setItem('cf_preferred_role', 'client'); } catch (e) {}
    }
  };

  const handleEmailBlur = () => {
    setFocusedInput(null);
    if (email.trim()) {
      const formatErr = validateLoginIdentifier(email);
      if (formatErr) {
        setError(formatErr);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLocked(false);
    setIsUnverified(false);
    setIsNotRegistered(false);

    if (!email.trim() || !password) {
      setError('Please enter both your email/username and password');
      return;
    }

    const trimmedIdentifier = email.trim();
    const formatErr = validateLoginIdentifier(trimmedIdentifier);
    if (formatErr) {
      setError(formatErr);
      toast.error(formatErr);
      return;
    }

    setIsLoading(true);

    try {
      const response = await apiClient.post(ENDPOINTS.AUTH.LOGIN, {
        email: trimmedIdentifier,
        password,
        rememberMe,
        deviceId: getClientDeviceId(),
      });

      if (response.data?.success && response.data?.data) {
        // If 2FA security verification code is required
        if (response.data.data.requires2FA) {
          setIsAwaitingCode(true);
          if (response.data.data.role) {
            const returnedRole = String(response.data.data.role).toLowerCase();
            const matchingTheme = returnedRole === 'admin' ? 'admin' : (returnedRole === 'fieldteam' || returnedRole === 'worker') ? 'fieldteam' : 'client';
            setSelectedRole(matchingTheme);
          }
          toast.info(response.data.message || `A 4-digit verification code has been sent to ${email}`, { duration: 5000 });
          return;
        }

        const { token, user } = response.data.data;
        login(token, user);
        const toastId = toast.success(`Welcome back, ${user.name || 'User'}!`, { duration: 1000 });
        setTimeout(() => {
          toast.dismiss(toastId);
        }, 1000);

        const from = (location.state as any)?.from?.pathname;
        if (from) {
          navigate(from, { replace: true });
        } else {
          navigate('/dashboard', { replace: true });
        }
      } else {
        setError(response.data?.message || 'Login failed');
      }
    } catch (err: any) {
      const isNetworkOrTimeout = !err.response || err.code === 'ECONNABORTED' || err.message?.includes('timeout') || err.message?.includes('Network Error');
      const status = err.response?.status;
      const msg = err.response?.data?.message || (isNetworkOrTimeout ? 'Backend server is waking up. Please try again in 10-15 seconds.' : 'Invalid email or password.');

      if (status === 404 || msg.toLowerCase().includes('register yourself first') || msg.toLowerCase().includes('no account found')) {
        setIsNotRegistered(true);
        setError(msg || 'No account found with this email address. Please register yourself first to get started.');
        toast.error('No account found. Please register yourself first to continue.');
      } else if (status === 429) {
        setIsLocked(true);
        setError(msg);
        toast.error('Account Locked: Too many failed login attempts');
      } else if (status === 403 && msg.toLowerCase().includes('verify')) {
        setIsUnverified(true);
        setError(msg);
        toast.error('Email verification required');
      } else {
        setError(msg);
        toast.error(msg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyLoginCode = async (e?: React.FormEvent, directCode?: string) => {
    if (e) e.preventDefault();
    const codeToVerify = (directCode || verificationCodeInput || '').trim();
    if (!codeToVerify) {
      setError('Please enter the 4-digit verification code.');
      return;
    }

    setError('');
    setIsVerifyingCode(true);

    try {
      const res = await apiClient.post('/auth/verify-login-code', {
        email: email.trim().toLowerCase(),
        code: codeToVerify,
        rememberMe,
        deviceId: getClientDeviceId(),
      });

      if (res.data?.success && res.data?.data) {
        const { token, user } = res.data.data;
        login(token, user);
        toast.success(`Welcome back, ${user.name || 'User'}!`);
        navigate('/dashboard', { replace: true });
      } else {
        setError(res.data?.message || 'Verification failed');
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Invalid or expired verification code.';
      setError(msg);
      toast.error(msg);
    } finally {
      setIsVerifyingCode(false);
    }
  };

  const handleResendCode = async () => {
    setIsResendingCode(true);
    setError('');
    try {
      const res = await apiClient.post('/auth/resend-login-code', {
        email: email.trim().toLowerCase(),
      });
      if (res.data?.success) {
        toast.success(`A new 4-digit code has been sent to ${email}!`, { duration: 5000 });
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to resend code');
    } finally {
      setIsResendingCode(false);
    }
  };

  const handleDirectOAuth = async (provider: 'google' | 'apple') => {
    setSocialLoading(provider);
    const toastId = toast.loading(`Connecting to ${provider === 'apple' ? 'Apple ID' : 'Google Account'}...`);

    try {
      const roleToSend = selectedRole === 'fieldteam' ? 'fieldteam' : selectedRole === 'admin' ? 'admin' : 'client';

      if (provider === 'google') {
        const authData = await initiateGoogleOAuth(roleToSend, 'signin');
        toast.dismiss(toastId);
        setSocialLoading(null);
        if (authData.isConfigured && authData.url) {
          window.location.href = authData.url;
        } else {
          navigate(`/auth/callback/google?state=${encodeURIComponent(authData.state)}&unconfigured=true`);
        }
      } else {
        const authData = await initiateAppleOAuth(roleToSend, 'signin');
        toast.dismiss(toastId);
        setSocialLoading(null);
        if (authData.isConfigured && authData.url) {
          window.location.href = authData.url;
        } else {
          navigate(`/auth/callback/apple?state=${encodeURIComponent(authData.state)}&unconfigured=true`);
        }
      }
    } catch (err: any) {
      toast.dismiss(toastId);
      const msg = err?.response?.data?.message || err?.message || `Failed to connect with ${provider === 'apple' ? 'Apple' : 'Google'}`;
      toast.error(msg);
      setSocialLoading(null);
    }
  };

  const currentTheme = LOGIN_THEMES[selectedRole];
  const LogoIcon = currentTheme.logoIcon;

  return (
    <>
      <AnimatePresence mode="wait">
        {isPreloading && (
          <ClearFlowPreloader
            onComplete={() => {
              setIsPreloading(false);
            }}
            minDuration={2000}
          />
        )}
      </AnimatePresence>

      <div data-auth-page="true" className={cn("fixed inset-0 w-full min-h-[100dvh] overflow-hidden flex items-center justify-center p-3 sm:p-4 md:p-6 transition-colors duration-700 ease-in-out select-none", currentTheme.bgPage)}>
      {/* Interactive WebGL Aurora Role-Themed Shader Background - unmounted during preloader to eliminate GPU/CPU contention */}
      {!isPreloading && (
        <ShaderBackground role={selectedRole} className="absolute inset-0 z-0 pointer-events-auto opacity-90 transition-opacity duration-700 ease-in-out" />
      )}

      {/* Vignette and Dark Tint Overlays to enhance text readability */}
      <div className={cn("absolute inset-0 z-0 bg-radial pointer-events-none transition-all duration-700 ease-in-out", currentTheme.shaderVignette)} />
      <div className={cn("absolute inset-0 z-0 bg-gradient-to-b pointer-events-none transition-all duration-700 ease-in-out", currentTheme.shaderGradient)} />

      {/* Top subtle radial glow */}
      <div className={cn("absolute top-0 left-1/2 transform -translate-x-1/2 w-[110vh] max-w-full h-[50vh] rounded-b-[50%] blur-[90px] pointer-events-none transition-all duration-700 ease-in-out", currentTheme.topGlow)} />

      {/* Main Login Card - Exactly 490px centered without scrolling */}
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-[490px] relative z-10 my-auto"
        style={{ perspective: 1600 }}
      >
        <motion.div
          className="relative"
          style={{ rotateX, rotateY }}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          whileHover={{ z: 8 }}
        >
          <div className="relative group rounded-3xl overflow-hidden">
            {/* Glass Card Surface */}
            <div className={cn("relative backdrop-blur-2xl rounded-3xl p-5 sm:p-6 md:p-7 border transition-all duration-700 ease-in-out overflow-hidden", currentTheme.cardSurface)}>
              {/* Subtle inner mesh pattern */}
              <div
                className="absolute inset-0 opacity-[0.025] pointer-events-none"
                style={{
                  backgroundImage: `linear-gradient(135deg, white 0.5px, transparent 0.5px), linear-gradient(45deg, white 0.5px, transparent 0.5px)`,
                  backgroundSize: '28px 28px'
                }}
              />

              {/* Logo & Header (hidden during verification so code input sits at top) */}
              {!isAwaitingCode && (
                <div className="text-center space-y-1 mb-4">
                  <motion.div
                    initial={{ scale: 0.6, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", duration: 0.8, bounce: 0.3 }}
                    className={cn("mx-auto w-12 h-12 rounded-2xl flex items-center justify-center relative overflow-hidden shadow-xl mb-2 border border-white/15 transition-all duration-700 ease-in-out", currentTheme.logoBox)}
                  >
                    <LogoIcon className="h-6 w-6 text-white drop-shadow-sm transition-transform duration-300" strokeWidth={2.4} />
                    <div className="absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent opacity-60" />
                  </motion.div>

                  <motion.h1
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                    className="text-2xl sm:text-[26px] font-extrabold bg-clip-text text-transparent bg-gradient-to-b from-white to-white/90 tracking-tight"
                  >
                    Sign In to ClearFlow
                  </motion.h1>

                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.25 }}
                    className="text-white/60 text-xs sm:text-sm font-medium"
                  >
                    Modern Facility Management System
                  </motion.p>
                </div>
              )}

              {/* Error messages */}
              <AnimatePresence>
                {isLocked && (
                  <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="rounded-xl bg-rose-500/10 p-3.5 text-xs sm:text-sm text-rose-300 border border-rose-500/20 flex items-start gap-2.5 mb-5">
                    <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                    <div><p className="font-bold">Security Lockout Active</p><p className="mt-0.5 text-rose-300/80">{error}</p></div>
                  </motion.div>
                )}
                {isUnverified && !isLocked && (
                  <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="rounded-xl bg-amber-500/10 p-3.5 text-xs sm:text-sm text-amber-300 border border-amber-500/20 flex flex-col gap-2.5 mb-5">
                    <div className="flex items-start gap-2.5">
                      <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold">Account Verification Required</p>
                        <p className="mt-0.5 text-amber-300/80">{error}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 pt-1 pl-7 flex-wrap">
                      <button
                        type="button"
                        onClick={handleInstantActivate}
                        disabled={isActivating}
                        className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs cursor-pointer transition-all shadow flex items-center gap-1"
                      >
                        {isActivating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : '⚡'}
                        {isActivating ? 'Activating...' : 'Activate Account Now'}
                      </button>
                      <button
                        type="button"
                        onClick={handleResendVerification}
                        disabled={isActivating}
                        className="px-3 py-1.5 rounded-lg border border-amber-400/30 hover:bg-amber-400/10 text-amber-300 text-xs font-semibold cursor-pointer transition-all"
                      >
                        Resend Verification Email
                      </button>
                    </div>
                  </motion.div>
                )}
                {isNotRegistered && !isLocked && !isUnverified && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className={cn(
                      "rounded-2xl p-4 sm:p-5 text-xs sm:text-sm border flex flex-col items-center text-center gap-2.5 mb-5 backdrop-blur-md transition-all duration-300 shadow-lg",
                      selectedRole === 'client'
                        ? "bg-teal-500/10 text-teal-200 border-teal-500/30 shadow-teal-950/20"
                        : selectedRole === 'fieldteam'
                        ? "bg-amber-500/10 text-amber-200 border-amber-500/30 shadow-amber-950/20"
                        : "bg-purple-500/10 text-purple-200 border-purple-500/30 shadow-purple-950/20"
                    )}
                  >
                    <p className="font-bold text-white text-sm sm:text-base tracking-wide">
                      Account Not Found
                    </p>
                    <p className="opacity-90 leading-relaxed max-w-sm">
                      {error || "No account found with this email or username. Please sign up first to get started."}
                    </p>
                    <div className="pt-1.5 w-full flex justify-center">
                      <button
                        type="button"
                        onClick={() => navigate(`/register?role=${selectedRole}&email=${encodeURIComponent(email.trim())}`)}
                        className={cn(
                          "px-5 py-2 rounded-xl font-bold text-xs sm:text-sm cursor-pointer transition-all duration-300 shadow-md hover:scale-[1.02] active:scale-[0.98]",
                          selectedRole === 'client'
                            ? "bg-teal-500 hover:bg-teal-400 text-slate-950 shadow-teal-500/25"
                            : selectedRole === 'fieldteam'
                            ? "bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/25"
                            : "bg-purple-600 hover:bg-purple-500 text-white shadow-purple-600/25"
                        )}
                      >
                        Sign Up First
                      </button>
                    </div>
                  </motion.div>
                )}
                {error && !isLocked && !isUnverified && !isNotRegistered && (
                  <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="rounded-xl bg-red-500/10 p-3.5 text-xs sm:text-sm text-red-300 border border-red-500/20 mb-5">
                    {error}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Login Form or 2FA Security Code Verification */}
              {isAwaitingCode ? (
                <form onSubmit={handleVerifyLoginCode} autoComplete="off" className="space-y-4 pt-1">
                  <div className="text-center space-y-1.5 mb-2">
                    <motion.div
                      initial={{ scale: 0.6, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: "spring", duration: 0.8, bounce: 0.3 }}
                      className={cn("mx-auto w-12 h-12 rounded-2xl flex items-center justify-center relative overflow-hidden shadow-xl mb-3 border border-white/15 transition-all duration-700 ease-in-out", currentTheme.logoBox)}
                    >
                      <KeyRound className="w-6 h-6 text-white drop-shadow-sm" strokeWidth={2.4} />
                      <div className="absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent opacity-60" />
                    </motion.div>
                    <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">Security Verification Code</h2>
                    <p className="text-white/60 text-xs sm:text-sm leading-relaxed max-w-xs mx-auto">
                      Enter the 4-digit verification code sent to <br />
                      <span className="text-white font-semibold font-mono">{email}</span>
                    </p>
                  </div>

                  {/* 4-Digit CodeSlots Animated Typing Input */}
                  <div className="flex justify-center items-center py-2">
                    <CodeSlots
                      length={4}
                      value={verificationCodeInput}
                      status={error ? 'error' : 'idle'}
                      onChange={(code) => {
                        setVerificationCodeInput(code);
                        if (error) setError('');
                      }}
                      onComplete={(code) => {
                        setVerificationCodeInput(code);
                        handleVerifyLoginCode(undefined, code);
                      }}
                      autoFocus
                      slotSize={52}
                      gap={12}
                      radius={14}
                      accentColor={
                        selectedRole === 'admin'
                          ? '#a855f7'
                          : selectedRole === 'fieldteam'
                          ? '#f59e0b'
                          : '#14b8a6'
                      }
                      inkColor={
                        selectedRole === 'admin'
                          ? '#c084fc'
                          : selectedRole === 'fieldteam'
                          ? '#fbbf24'
                          : '#2dd4bf'
                      }
                      slotColor={
                        selectedRole === 'admin'
                          ? 'rgba(168, 85, 247, 0.16)'
                          : selectedRole === 'fieldteam'
                          ? 'rgba(245, 158, 11, 0.16)'
                          : 'rgba(20, 184, 166, 0.16)'
                      }
                      digitColor="#ffffff"
                      dangerColor="#ef4444"
                    />
                  </div>

                  {/* Verify Button */}
                  <motion.button
                    whileHover={{ scale: 1.015 }}
                    whileTap={{ scale: 0.985 }}
                    type="submit"
                    disabled={isVerifyingCode || !verificationCodeInput.trim()}
                    className="w-full relative group/button cursor-pointer"
                  >
                    <div className={cn("absolute inset-0 rounded-xl blur-lg opacity-0 group-hover/button:opacity-100 transition-all duration-300", currentTheme.btnGlow)} />

                    <div className={cn("relative overflow-hidden text-white font-semibold h-11 sm:h-11.5 rounded-xl transition-all duration-300 flex items-center justify-center shadow-lg", currentTheme.primaryBtn)}>
                      {isVerifyingCode ? (
                        <div className="flex items-center justify-center gap-2">
                          <Loader2 className="w-5 h-5 animate-spin" />
                          <span className="text-sm font-semibold">Verifying Code...</span>
                        </div>
                      ) : (
                        <span className="flex items-center justify-center gap-2 text-sm sm:text-base font-semibold tracking-wide">
                          Verify & Access ClearFlow
                          <ArrowRight className="w-4 h-4 group-hover/button:translate-x-1 transition-transform duration-300" />
                        </span>
                      )}
                    </div>
                  </motion.button>

                  {/* Resend and Back Buttons */}
                  <div className="flex items-center justify-between text-xs pt-2">
                    <button
                      type="button"
                      onClick={handleResendCode}
                      disabled={isResendingCode}
                      className={cn("font-medium transition-colors hover:underline cursor-pointer", currentTheme.linkText)}
                    >
                      {isResendingCode ? 'Sending...' : 'Resend Code'}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsAwaitingCode(false);
                        setVerificationCodeInput('');
                        setError('');
                      }}
                      className="text-white/50 hover:text-white/80 transition-colors cursor-pointer"
                    >
                      Back to Sign In
                    </button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleSubmit} autoComplete="off" className="space-y-3 sm:space-y-3.5">
                  {/* Deflect aggressive browser credential autofill on page load */}
                  <div style={{ position: 'absolute', opacity: 0, height: 0, width: 0, zIndex: -1, pointerEvents: 'none', overflow: 'hidden' }} aria-hidden="true">
                    <input type="text" name="cf_decoy_user" tabIndex={-1} autoComplete="off" readOnly />
                    <input type="password" name="cf_decoy_pass" tabIndex={-1} autoComplete="new-password" readOnly />
                  </div>

                  <div className="space-y-2.5 sm:space-y-3">
                    {/* Email Input */}
                    <motion.div
                      className={`relative ${focusedInput === "email" ? 'z-10' : ''}`}
                      whileHover={{ scale: 1.008 }}
                      transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    >
                      <div className="relative flex items-center overflow-hidden rounded-xl">
                        {email.includes('@') ? (
                          <Mail className={cn("absolute left-3.5 w-5 h-5 transition-all duration-300", focusedInput === "email" ? currentTheme.inputIconFocus : 'text-white/40')} />
                        ) : (
                          <User className={cn("absolute left-3.5 w-5 h-5 transition-all duration-300", focusedInput === "email" ? currentTheme.inputIconFocus : 'text-white/40')} />
                        )}
                        <SignInInput
                          ref={emailInputRef}
                          type="text"
                          name="cf_user_input_identifier"
                          id="cf_user_input_identifier"
                          autoComplete="off"
                          readOnly={isAutofillGuarded}
                          placeholder="Email or username"
                          value={email}
                          onChange={(e) => handleEmailChange(e.target.value)}
                          onPointerDown={(e) => {
                            e.currentTarget.removeAttribute('readonly');
                            setIsAutofillGuarded(false);
                          }}
                          onFocus={(e) => {
                            e.currentTarget.removeAttribute('readonly');
                            setIsAutofillGuarded(false);
                            setFocusedInput("email");
                          }}
                          onBlur={handleEmailBlur}
                          focusRing={currentTheme.inputFocusRing}
                          className="pl-11 pr-4 bg-white/5 border-white/10 text-white placeholder:text-white/35 focus:bg-white/10"
                        />
                        {focusedInput === "email" && (
                          <motion.div
                            layoutId="input-highlight"
                            className={cn("absolute inset-0 -z-10 rounded-xl transition-colors duration-300", currentTheme.inputHighlight)}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                          />
                        )}
                      </div>
                    </motion.div>

                    {/* Password Input */}
                    <motion.div
                      className={`relative ${focusedInput === "password" ? 'z-10' : ''}`}
                      whileHover={{ scale: 1.008 }}
                      transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    >
                      <div className="relative flex items-center overflow-hidden rounded-xl">
                        <Lock className={cn("absolute left-3.5 w-5 h-5 transition-all duration-300", focusedInput === "password" ? currentTheme.inputIconFocus : 'text-white/40')} />
                        <SignInInput
                          ref={passwordInputRef}
                          type={showPassword ? "text" : "password"}
                          name="cf_user_input_secret"
                          id="cf_user_input_secret"
                          autoComplete="new-password"
                          readOnly={isAutofillGuarded}
                          placeholder="••••••••"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          onPointerDown={(e) => {
                            e.currentTarget.removeAttribute('readonly');
                            setIsAutofillGuarded(false);
                          }}
                          onFocus={(e) => {
                            e.currentTarget.removeAttribute('readonly');
                            setIsAutofillGuarded(false);
                            setFocusedInput("password");
                          }}
                          onBlur={() => setFocusedInput(null)}
                          focusRing={currentTheme.inputFocusRing}
                          className="pl-11 pr-11 bg-white/5 border-white/10 text-white placeholder:text-white/35 focus:bg-white/10"
                        />
                        <div
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3.5 cursor-pointer p-1 rounded-md hover:bg-white/10 transition-colors"
                        >
                          {showPassword ? (
                            <Eye className={cn("w-4 h-4 transition-colors", focusedInput === "password" ? currentTheme.inputIconFocus : 'text-white/50')} />
                          ) : (
                            <EyeClosed className={cn("w-4 h-4 transition-colors", focusedInput === "password" ? currentTheme.inputIconFocus : 'text-white/50')} />
                          )}
                        </div>
                        {focusedInput === "password" && (
                          <motion.div
                            layoutId="input-highlight"
                            className={cn("absolute inset-0 -z-10 rounded-xl transition-colors duration-300", currentTheme.inputHighlight)}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                          />
                        )}
                      </div>
                    </motion.div>
                  </div>

                  {/* Remember Me & Forgot Password */}
                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center space-x-2.5">
                      <div className="relative flex items-center">
                        <input
                          id="remember-me"
                          name="remember-me"
                          type="checkbox"
                          checked={rememberMe}
                          onChange={() => {
                            const next = !rememberMe;
                            setRememberMe(next);
                            try {
                              localStorage.setItem('clearflow_remember_me', String(next));
                            } catch (_) {}
                          }}
                          className={cn("appearance-none h-4 w-4 rounded-md border border-white/25 bg-white/5 focus:outline-none focus:ring-2 transition-all cursor-pointer", currentTheme.checkbox)}
                        />
                        {rememberMe && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.5 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="absolute inset-0 flex items-center justify-center text-white pointer-events-none"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                          </motion.div>
                        )}
                      </div>
                      <label htmlFor="remember-me" className="text-xs sm:text-sm text-white/60 hover:text-white/80 transition-colors cursor-pointer select-none">
                        Remember me
                      </label>
                    </div>

                    <div>
                      <Link to={`/forgot-password?role=${selectedRole}`} className={cn("text-xs sm:text-sm font-medium transition-colors", currentTheme.linkText)}>
                        Forgot password?
                      </Link>
                    </div>
                  </div>

                  {/* Sign In Button */}
                  <motion.button
                    whileHover={{ scale: 1.015 }}
                    whileTap={{ scale: 0.985 }}
                    type="submit"
                    disabled={isLoading}
                    className="w-full relative group/button mt-3.5 sm:mt-4 cursor-pointer"
                  >
                    <div className={cn("absolute inset-0 rounded-xl blur-lg opacity-0 group-hover/button:opacity-100 transition-all duration-300", currentTheme.btnGlow)} />

                    <div className={cn("relative overflow-hidden text-white font-semibold h-11 sm:h-11.5 rounded-xl transition-all duration-300 flex items-center justify-center shadow-lg", currentTheme.primaryBtn)}>
                      <motion.div
                        className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/25 to-white/0 -z-10"
                        animate={{ x: ['-100%', '100%'] }}
                        transition={{ duration: 1.6, ease: "easeInOut", repeat: Infinity, repeatDelay: 1 }}
                        style={{ opacity: isLoading ? 1 : 0, transition: 'opacity 0.3s ease' }}
                      />

                      <AnimatePresence mode="wait">
                        {isLoading ? (
                          <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center justify-center gap-2">
                            <Loader2 className="w-5 h-5 animate-spin" />
                            <span className="text-sm font-semibold">Signing In...</span>
                          </motion.div>
                        ) : (
                          <motion.span key="button-text" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center justify-center gap-2 text-sm sm:text-base font-semibold tracking-wide">
                            Sign In to ClearFlow
                            <ArrowRight className="w-4 h-4 group-hover/button:translate-x-1 transition-transform duration-300" />
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </div>
                  </motion.button>

                  {/* Sign up link - No demo credentials */}
                  <motion.p
                    className="text-center text-xs text-white/50 mt-4 pt-1"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                  >
                    Don't have an account?{' '}
                    <Link 
                      to={`/register?role=${selectedRole === 'fieldteam' ? 'worker' : 'client'}`} 
                      className="relative inline-block group/signup ml-1"
                    >
                      <span className={cn("relative z-10 transition-colors duration-300 font-semibold", currentTheme.registerLink)}>
                        Sign Up
                      </span>
                      <span className={cn("absolute bottom-0 left-0 w-0 h-[1.5px] group-hover/signup:w-full transition-all duration-300", currentTheme.registerUnderline)} />
                    </Link>
                  </motion.p>
                </form>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
    </>
  );
}

export { SignInCard2 as Component };
export default SignInCard2;

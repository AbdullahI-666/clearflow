import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { 
  User, Mail, Lock, Eye, EyeOff, ArrowRight, Leaf, 
  Loader2, MailCheck, CheckCircle2, AlertTriangle, Wrench
} from 'lucide-react';
import { apiClient } from '@/infrastructure/api/client';
import { ENDPOINTS } from '@/infrastructure/api/endpoints';
import { useAuth } from '@/entities/user/hooks/useAuth';
import { toast } from 'sonner';
import { ShaderBackground } from '@/components/ui/green-shader';
import { cn } from '@/lib/utils';
import { SocialAuthButtons } from './SocialAuthButtons';
import { SocialAuthModal } from './SocialAuthModal';
import { TermsAndPrivacyModal } from './TermsAndPrivacyModal';
import { initiateGoogleOAuth, initiateAppleOAuth } from '../services/oauth.service';

const REGISTER_THEMES = {
  FieldTeam: {
    shaderRole: 'fieldteam' as const,
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
    cardSurface: 'bg-[#180c04]/95 border border-amber-500/35 shadow-[0_25px_60px_rgba(20,8,0,0.85)]',
    logoBox: 'bg-gradient-to-br from-amber-500 via-amber-600 to-orange-600 shadow-amber-500/35',
    logoIcon: Leaf,
    inputFocusRing: 'focus-within:border-amber-400 focus-within:ring-[2px] focus-within:ring-amber-400/20',
    inputIconFocus: 'text-amber-300',
    eyeHover: 'hover:text-amber-300',
    primaryBtn: 'bg-gradient-to-r from-amber-500 via-amber-600 to-orange-600 hover:from-amber-400 hover:via-amber-500 hover:to-orange-500 shadow-amber-500/30',
    btnGlow: 'bg-amber-500/30',
    linkText: 'text-amber-400 hover:text-amber-300',
    linkUnderline: 'bg-amber-400',
    successBox: 'bg-amber-500/10 border-amber-500/20',
    successText: 'text-amber-300',
    successIcon: 'text-amber-400',
  },
  Client: {
    shaderRole: 'client' as const,
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
    cardSurface: 'bg-[#081510]/95 border border-teal-500/35 shadow-[0_25px_60px_rgba(0,0,0,0.85)]',
    logoBox: 'bg-gradient-to-br from-teal-500 to-emerald-600 shadow-teal-500/25',
    logoIcon: Leaf,
    inputFocusRing: 'focus-within:border-teal-400 focus-within:ring-[2px] focus-within:ring-teal-400/20',
    inputIconFocus: 'text-teal-300',
    eyeHover: 'hover:text-teal-300',
    primaryBtn: 'bg-gradient-to-r from-teal-500 via-emerald-500 to-teal-500 hover:from-teal-400 hover:via-emerald-400 hover:to-teal-400 shadow-teal-500/25',
    btnGlow: 'bg-teal-500/25',
    linkText: 'text-teal-300 hover:text-teal-200',
    linkUnderline: 'bg-teal-300',
    successBox: 'bg-teal-500/10 border-teal-500/20',
    successText: 'text-teal-300',
    successIcon: 'text-teal-400',
  },
};

export const RegisterForm = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [searchParams] = useSearchParams();

  const initialRole = (() => {
    const fromParam = searchParams.get('role')?.toLowerCase();
    if (fromParam === 'fieldteam' || fromParam === 'field' || fromParam === 'crew' || fromParam === 'worker') return 'FieldTeam';
    if (fromParam === 'client') return 'Client';
    const fromStorage = localStorage.getItem('cf_preferred_role')?.toLowerCase();
    if (fromStorage === 'fieldteam' || fromStorage === 'field' || fromStorage === 'crew' || fromStorage === 'worker') return 'FieldTeam';
    return 'Client';
  })();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'Client' | 'FieldTeam'>(initialRole);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [focusedInput, setFocusedInput] = useState<string | null>(null);
  const [isRegistered, setIsRegistered] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [isTermsModalOpen, setIsTermsModalOpen] = useState(false);
  const [isSocialModalOpen, setIsSocialModalOpen] = useState(false);
  const [socialModalProvider, setSocialModalProvider] = useState<'google' | 'apple'>('google');
  const [socialLoading, setSocialLoading] = useState<'google' | 'apple' | null>(null);

  const handleDirectOAuth = async (provider: 'google' | 'apple') => {
    setSocialLoading(provider);
    const toastId = toast.loading(`Connecting to ${provider === 'apple' ? 'Apple ID' : 'Google Account'}...`);

    try {
      const roleToSend = role === 'FieldTeam' ? 'fieldteam' : 'client';

      if (provider === 'google') {
        const authData = await initiateGoogleOAuth(roleToSend, 'register');
        toast.dismiss(toastId);
        setSocialLoading(null);
        if (authData.isConfigured && authData.url) {
          window.location.href = authData.url;
        } else {
          navigate(`/auth/callback/google?state=${encodeURIComponent(authData.state)}&unconfigured=true&role=${roleToSend}`);
        }
      } else {
        const authData = await initiateAppleOAuth(roleToSend, 'register');
        toast.dismiss(toastId);
        setSocialLoading(null);
        if (authData.isConfigured && authData.url) {
          window.location.href = authData.url;
        } else {
          navigate(`/auth/callback/apple?state=${encodeURIComponent(authData.state)}&unconfigured=true&role=${roleToSend}`);
        }
      }
    } catch (err: any) {
      toast.dismiss(toastId);
      const msg = err?.response?.data?.message || err?.message || `Failed to connect with ${provider === 'apple' ? 'Apple' : 'Google'}`;
      toast.error(msg);
      setSocialLoading(null);
    }
  };

  const handleRoleChange = (newRole: 'Client' | 'FieldTeam') => {
    setRole(newRole);
    try {
      localStorage.setItem('cf_preferred_role', newRole === 'FieldTeam' ? 'fieldteam' : 'client');
    } catch (e) {}
  };

  // Clear any default or browser-injected credentials on mount
  useEffect(() => {
    setName('');
    const qEmail = searchParams.get('email');
    setEmail(qEmail ? qEmail.trim() : '');
    setPassword('');
    setConfirmPassword('');
  }, [searchParams]);

  // 3D perspective tilt effect
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const rotateX = useTransform(mouseY, [-350, 350], [8, -8]);
  const rotateY = useTransform(mouseX, [-350, 350], [-8, 8]);

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    mouseX.set(e.clientX - rect.left - rect.width / 2);
    mouseY.set(e.clientY - rect.top - rect.height / 2);
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Form Validations
    if (!name.trim()) {
      setError('Please enter your full name');
      return;
    }

    if (!email.trim() || !email.includes('@')) {
      setError('Please provide a valid email address');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      toast.error('Password must be at least 6 characters long');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      toast.error('Passwords do not match');
      return;
    }

    if (!acceptedTerms) {
      setError('Please agree to the Terms & Privacy Policy to register.');
      toast.error('Please accept the Terms & Privacy Policy before continuing.');
      return;
    }

    setIsLoading(true);

    try {
      const response = await apiClient.post(ENDPOINTS.AUTH.REGISTER, {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        role,
        password,
      });

      if (response.data?.success) {
        const regEmail = email.trim().toLowerCase();
        setRegisteredEmail(regEmail);
        const chosenRole = role === 'FieldTeam' ? 'fieldteam' : 'client';
        try {
          localStorage.setItem('cf_preferred_role', chosenRole);
        } catch (e) {}
        const toastId = toast.success('Registration successful! Please enter the 4-digit code sent to your email.', { duration: 2000 });
        setTimeout(() => {
          toast.dismiss(toastId);
        }, 2000);
        navigate(`/verify-email?email=${encodeURIComponent(regEmail)}&role=${encodeURIComponent(chosenRole)}`, {
          state: { email: regEmail, role: chosenRole }
        });
      } else {
        setError(response.data?.message || 'Registration failed');
      }
    } catch (err: any) {
      const isNetworkOrTimeout = !err.response || err.code === 'ECONNABORTED' || err.message?.includes('timeout') || err.message?.includes('Network Error');
      const status = err.response?.status;
      let msg = '';

      if (err.response?.data?.errors && Array.isArray(err.response.data.errors) && err.response.data.errors.length > 0) {
        msg = err.response.data.errors.map((e: any) => e.msg).join('. ');
      } else if (err.response?.data?.message) {
        msg = err.response.data.message;
      }

      if (status === 409) {
        msg = 'An account with this email already exists. Please log in or reset your password.';
      } else if (isNetworkOrTimeout) {
        msg = 'Connection timeout: Backend server is waking up. Please click Register again in 10-15 seconds.';
      } else if (!msg) {
        msg = 'Registration failed. Please check your details and try again.';
      }

      setError(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // Success Confirmation Screen (Exact same luxury dark shader theme)
  const currentTheme = REGISTER_THEMES[role];
  const LogoIcon = currentTheme.logoIcon;

  if (isRegistered) {
    return (
      <div className={cn("min-h-screen w-full relative overflow-x-hidden overflow-y-auto flex items-center justify-center p-4 sm:p-6 md:p-8 transition-colors duration-500", currentTheme.bgPage)}>
        <ShaderBackground role={currentTheme.shaderRole} className="absolute inset-0 z-0 pointer-events-auto opacity-90 transition-opacity duration-500" />
        <div className={cn("absolute inset-0 z-0 bg-radial pointer-events-none transition-all duration-500", currentTheme.shaderVignette)} />
        <div className={cn("absolute inset-0 z-0 bg-gradient-to-b pointer-events-none transition-all duration-500", currentTheme.shaderGradient)} />
        <div className={cn("absolute top-0 left-1/2 transform -translate-x-1/2 w-[110vh] h-[50vh] rounded-b-[50%] blur-[90px] pointer-events-none transition-all duration-500", currentTheme.topGlow)} />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-[520px] relative z-10 my-auto"
        >
          <div className={cn("relative backdrop-blur-2xl rounded-3xl p-6 sm:p-8 border transition-all duration-500 text-center overflow-hidden", currentTheme.cardSurface)}>
            <div
              className="absolute inset-0 opacity-[0.025] pointer-events-none"
              style={{
                backgroundImage: `linear-gradient(135deg, white 0.5px, transparent 0.5px), linear-gradient(45deg, white 0.5px, transparent 0.5px)`,
                backgroundSize: '28px 28px'
              }}
            />

            {/* Glowing Icon */}
            <motion.div
              initial={{ scale: 0.5, rotate: -10 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', bounce: 0.4 }}
              className={cn("mx-auto w-16 h-16 rounded-2xl flex items-center justify-center shadow-xl mb-4 border border-white/20 transition-all duration-500", currentTheme.logoBox)}
            >
              <MailCheck className="h-8 w-8 text-white drop-shadow" />
            </motion.div>

            <h2 className="text-2xl sm:text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-b from-white to-white/85 tracking-tight mb-2">
              Verify Your Email
            </h2>
            <p className="text-white/60 text-sm sm:text-base font-medium mb-5">
              We sent an activation link to{' '}
              <span className={cn("font-semibold", currentTheme.successText)}>{registeredEmail}</span>
            </p>

            <div className={cn("rounded-2xl p-4 text-left space-y-2 mb-5 transition-all duration-500", currentTheme.successBox)}>
              <div className="flex items-center gap-2 text-sm font-semibold">
                <CheckCircle2 className={cn("w-5 h-5 shrink-0", currentTheme.successIcon)} />
                <span>Next step: Activate your account</span>
              </div>
              <p className="text-white/65 text-xs sm:text-sm pl-7 leading-relaxed">
                Click the verification button in your email to activate your account. Once verified, you can immediately log in.
              </p>
            </div>

            <button
              onClick={() => navigate(`/verify-email?email=${encodeURIComponent(registeredEmail)}`)}
              className={cn("w-full py-3.5 mb-3 text-white font-bold rounded-xl shadow-lg transition-all text-sm sm:text-base flex items-center justify-center gap-2 cursor-pointer", currentTheme.primaryBtn)}
            >
              <span>Enter 4-Digit Code</span>
              <ArrowRight className="w-4.5 h-4.5 text-white" />
            </button>

            <button
              onClick={() => navigate('/login', { state: { skipPreloader: true } })}
              className="w-full py-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white font-semibold text-sm sm:text-base transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Proceed to Sign In</span>
              <ArrowRight className={cn("w-4.5 h-4.5", currentTheme.successIcon)} />
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div data-auth-page="true" className={cn("fixed inset-0 w-full min-h-[100dvh] overflow-hidden flex items-center justify-center p-2 sm:p-3 md:p-4 transition-colors duration-500 select-none", currentTheme.bgPage)}>
      {/* Interactive WebGL Aurora Role-Themed Shader Background */}
      <ShaderBackground role={currentTheme.shaderRole} className="absolute inset-0 z-0 pointer-events-auto opacity-90 transition-opacity duration-500" />

      {/* Vignette and Dark Tint Overlays to enhance text readability */}
      <div className={cn("absolute inset-0 z-0 bg-radial pointer-events-none transition-all duration-500", currentTheme.shaderVignette)} />
      <div className={cn("absolute inset-0 z-0 bg-gradient-to-b pointer-events-none transition-all duration-500", currentTheme.shaderGradient)} />

      {/* Top subtle radial glow */}
      <div className={cn("absolute top-0 left-1/2 transform -translate-x-1/2 w-[110vh] h-[50vh] rounded-b-[50%] blur-[90px] pointer-events-none transition-all duration-500", currentTheme.topGlow)} />

      {/* Main Registration Card - Centered with symmetric top and bottom borders */}
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-[455px] relative z-10 my-auto"
        style={{ perspective: 1600 }}
      >
        <motion.div
          className="relative"
          style={{ rotateX, rotateY }}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          whileHover={{ z: 6 }}
        >
          <div className="relative group rounded-3xl overflow-hidden">
            {/* Glass Card Surface */}
            <div className={cn("relative backdrop-blur-2xl rounded-3xl p-3 sm:p-3.5 md:p-4 border transition-all duration-500 overflow-hidden", currentTheme.cardSurface)}>
              {/* Subtle inner mesh pattern */}
              <div
                className="absolute inset-0 opacity-[0.025] pointer-events-none"
                style={{
                  backgroundImage: `linear-gradient(135deg, white 0.5px, transparent 0.5px), linear-gradient(45deg, white 0.5px, transparent 0.5px)`,
                  backgroundSize: '28px 28px'
                }}
              />

              {/* Logo & Header */}
              <div className="text-center space-y-0.5 mb-1.5 sm:mb-2">
                <motion.div
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", duration: 0.8, bounce: 0.3 }}
                  className={cn("mx-auto w-8.5 h-8.5 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center relative overflow-hidden shadow-lg mb-1 border border-white/15 transition-all duration-500", currentTheme.logoBox)}
                >
                  <LogoIcon className="h-4.5 w-4.5 text-white drop-shadow-sm transition-transform duration-300" strokeWidth={2.4} />
                  <div className="absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent opacity-60" />
                </motion.div>

                <motion.h1
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                  className="text-lg sm:text-xl font-extrabold bg-clip-text text-transparent bg-gradient-to-b from-white to-white/90 tracking-tight"
                >
                  Sign Up for ClearFlow
                </motion.h1>

                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.25 }}
                  className="text-white/60 text-[10px] sm:text-[11px] font-medium"
                >
                  Join ClearFlow Modern Facility Management System
                </motion.p>
              </div>

              {/* Error messages */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="rounded-xl bg-rose-500/10 p-2 text-xs text-rose-300 border border-rose-500/20 flex items-start gap-2 mb-1.5"
                  >
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Registration Form */}
              <form onSubmit={handleSubmit} autoComplete="off" className="space-y-1 sm:space-y-1.5">
                {/* Deflect browser credential autofill so registration starts completely blank */}
                <div style={{ position: 'absolute', opacity: 0, height: 0, width: 0, zIndex: -1, pointerEvents: 'none', overflow: 'hidden' }} aria-hidden="true">
                  <input type="text" name="cf_decoy_reg_email" tabIndex={-1} autoComplete="off" readOnly />
                  <input type="password" name="cf_decoy_reg_pass" tabIndex={-1} autoComplete="new-password" readOnly />
                </div>

                {/* Full Name */}
                <div className="space-y-0.5">
                  <label className="text-[10px] sm:text-[11px] font-semibold text-white/75">Full Name</label>
                  <motion.div
                    className="relative"
                    whileHover={{ scale: 1.005 }}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                  >
                    <div className={cn("relative flex items-center overflow-hidden rounded-xl border border-white/10 bg-white/5 transition-all duration-300", currentTheme.inputFocusRing)}>
                      <User className={cn("absolute left-3 w-3.5 h-3.5 transition-all duration-300", focusedInput === "name" ? currentTheme.inputIconFocus : "text-white/40")} />
                      <input
                        type="text"
                        name="cf_reg_name"
                        id="cf_reg_name"
                        autoComplete="name"
                        placeholder="e.g. Abdullah Ali"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        onFocus={() => setFocusedInput("name")}
                        onBlur={() => setFocusedInput(null)}
                        required
                        className="w-full bg-transparent text-white placeholder:text-white/35 h-8 sm:h-8.5 pl-8.5 pr-3 text-xs sm:text-[13px] outline-none"
                      />
                    </div>
                  </motion.div>
                </div>

                {/* Email Address */}
                <div className="space-y-0.5">
                  <label className="text-[10px] sm:text-[11px] font-semibold text-white/75">Email Address (Any Domain)</label>
                  <motion.div
                    className="relative"
                    whileHover={{ scale: 1.005 }}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                  >
                    <div className={cn("relative flex items-center overflow-hidden rounded-xl border border-white/10 bg-white/5 transition-all duration-300", currentTheme.inputFocusRing)}>
                      <Mail className={cn("absolute left-3 w-3.5 h-3.5 transition-all duration-300", focusedInput === "email" ? currentTheme.inputIconFocus : "text-white/40")} />
                      <input
                        type="email"
                        name="cf_reg_email"
                        id="cf_reg_email"
                        autoComplete="off"
                        placeholder="name@gmail.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        onFocus={() => setFocusedInput("email")}
                        onBlur={() => setFocusedInput(null)}
                        required
                        className="w-full bg-transparent text-white placeholder:text-white/35 h-8 sm:h-8.5 pl-8.5 pr-3 text-xs sm:text-[13px] outline-none"
                      />
                    </div>
                  </motion.div>
                </div>

                {/* Role / Account Type Selector (Glass Pills) */}
                <div className="space-y-0.5 pt-0.5">
                  <label className="text-[10px] sm:text-[11px] font-semibold text-white/75">Role / Account Type</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleRoleChange('Client')}
                      className={`h-7.5 sm:h-8 rounded-xl border text-[11px] sm:text-xs font-semibold transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer ${
                        role === 'Client'
                          ? 'border-teal-400 bg-teal-500/20 text-teal-200 shadow-md shadow-teal-500/20 ring-1 ring-teal-400/40'
                          : 'border-white/15 bg-white/5 text-white/60 hover:bg-white/10 hover:text-white hover:border-white/25'
                      }`}
                    >
                      <User className="w-3.5 h-3.5" />
                      <span>Client (User)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleRoleChange('FieldTeam')}
                      className={`h-7.5 sm:h-8 rounded-xl border text-[11px] sm:text-xs font-semibold transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer ${
                        role === 'FieldTeam'
                          ? 'border-amber-400 bg-amber-500/20 text-amber-200 shadow-md shadow-amber-500/20 ring-1 ring-amber-400/40'
                          : 'border-white/15 bg-white/5 text-white/60 hover:bg-white/10 hover:text-white hover:border-white/25'
                      }`}
                    >
                      <Wrench className="w-3.5 h-3.5" />
                      <span>Worker (Crew)</span>
                    </button>
                  </div>
                </div>

                {/* Password & Confirm Password Grid */}
                <div className="grid grid-cols-2 gap-2 pt-0.5">
                  {/* Password */}
                  <div className="space-y-0.5">
                    <label className="text-[10px] sm:text-[11px] font-semibold text-white/75">Password</label>
                    <motion.div
                      className="relative"
                      whileHover={{ scale: 1.005 }}
                      transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    >
                      <div className={cn("relative flex items-center overflow-hidden rounded-xl border border-white/10 bg-white/5 transition-all duration-300", currentTheme.inputFocusRing)}>
                        <Lock className={cn("absolute left-2.5 w-3.5 h-3.5 transition-all duration-300", focusedInput === "password" ? currentTheme.inputIconFocus : "text-white/40")} />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          name="cf_reg_password"
                          id="cf_reg_password"
                          autoComplete="new-password"
                          placeholder="••••••••"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          onFocus={() => setFocusedInput("password")}
                          onBlur={() => setFocusedInput(null)}
                          required
                          className="w-full bg-transparent text-white placeholder:text-white/35 h-8 sm:h-8.5 pl-8 pr-7 text-xs sm:text-[13px] outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className={cn("absolute right-2 text-white/40 transition-colors cursor-pointer", currentTheme.eyeHover)}
                        >
                          {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </motion.div>
                  </div>

                  {/* Confirm Password */}
                  <div className="space-y-0.5">
                    <label className="text-[10px] sm:text-[11px] font-semibold text-white/75">Confirm Password</label>
                    <motion.div
                      className="relative"
                      whileHover={{ scale: 1.005 }}
                      transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    >
                      <div className={cn("relative flex items-center overflow-hidden rounded-xl border border-white/10 bg-white/5 transition-all duration-300", currentTheme.inputFocusRing)}>
                        <Lock className={cn("absolute left-2.5 w-3.5 h-3.5 transition-all duration-300", focusedInput === "confirmPassword" ? currentTheme.inputIconFocus : "text-white/40")} />
                        <input
                          type={showConfirmPassword ? 'text' : 'password'}
                          name="cf_reg_confirm_password"
                          id="cf_reg_confirm_password"
                          autoComplete="new-password"
                          placeholder="••••••••"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          onFocus={() => setFocusedInput("confirmPassword")}
                          onBlur={() => setFocusedInput(null)}
                          required
                          className="w-full bg-transparent text-white placeholder:text-white/35 h-8 sm:h-8.5 pl-8 pr-7 text-xs sm:text-[13px] outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className={cn("absolute right-2 text-white/40 transition-colors cursor-pointer", currentTheme.eyeHover)}
                        >
                          {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </motion.div>
                  </div>
                </div>

                {/* Terms & Privacy Policy Agreement Checkbox */}
                <div className="flex items-center space-x-2 pt-0.5">
                  <div className="relative flex items-center">
                    <input
                      id="terms-policy"
                      name="terms-policy"
                      type="checkbox"
                      checked={acceptedTerms}
                      onChange={() => setAcceptedTerms(!acceptedTerms)}
                      className={cn(
                        "appearance-none h-3.5 w-3.5 rounded border border-white/25 bg-white/5 focus:outline-none focus:ring-2 transition-all cursor-pointer",
                        role === 'FieldTeam' 
                          ? 'checked:bg-amber-500 checked:border-amber-500 focus:ring-amber-500/30' 
                          : 'checked:bg-teal-500 checked:border-teal-500 focus:ring-teal-500/30'
                      )}
                    />
                    {acceptedTerms && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="absolute inset-0 flex items-center justify-center text-white pointer-events-none"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                      </motion.div>
                    )}
                  </div>
                  <label htmlFor="terms-policy" className="text-[10.5px] sm:text-[11.5px] text-white/70 select-none cursor-pointer">
                    I agree to the{' '}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        setIsTermsModalOpen(true);
                      }}
                      className={cn("font-medium hover:text-white transition-colors cursor-pointer", currentTheme.linkText)}
                    >
                      Terms & Privacy Policy
                    </button>
                  </label>
                </div>

                {/* Submit Button */}
                <motion.button
                  whileHover={{ scale: 1.015 }}
                  whileTap={{ scale: 0.985 }}
                  type="submit"
                  disabled={isLoading}
                  className="w-full relative group/button mt-1.5 sm:mt-2 cursor-pointer"
                >
                  <div className={cn("absolute inset-0 rounded-xl blur-lg opacity-0 group-hover/button:opacity-80 transition-opacity duration-300", currentTheme.btnGlow)} />
                  <div className={cn("relative overflow-hidden text-white font-bold h-8.5 sm:h-9 rounded-xl transition-all duration-300 flex items-center justify-center shadow-lg", currentTheme.primaryBtn)}>
                    {/* Shimmer beam */}
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -z-10"
                      animate={{ x: ['-100%', '100%'] }}
                      transition={{ duration: 1.8, ease: "easeInOut", repeat: Infinity, repeatDelay: 1 }}
                      style={{ opacity: isLoading ? 1 : 0.4 }}
                    />
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <span className="flex items-center gap-1.5 text-xs sm:text-[13px] font-bold tracking-wide">
                        Sign Up & Get Started
                        <ArrowRight className="w-4 h-4 group-hover/button:translate-x-1 transition-transform duration-300" />
                      </span>
                    )}
                  </div>
                </motion.button>

                {/* Google & Apple Social Registration - Instant Direct Redirection */}
                <SocialAuthButtons
                  mode="register"
                  role={role === 'FieldTeam' ? 'fieldteam' : 'client'}
                  loadingProvider={socialLoading}
                  onSelectProvider={(prov) => {
                    handleDirectOAuth(prov);
                  }}
                />
              </form>

              {/* Already have an account link */}
              <motion.p
                className="text-center text-[10.5px] sm:text-[11px] text-white/55 mt-1.5 sm:mt-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
              >
                Already have an account?{' '}
                <Link
                  to={`/login?role=${role === 'FieldTeam' ? 'fieldteam' : 'client'}`}
                  state={{ skipPreloader: true, role: role === 'FieldTeam' ? 'fieldteam' : 'client' }}
                  className={cn("relative inline-block group/signin font-semibold transition-colors duration-200", currentTheme.linkText)}
                >
                  <span>Sign In</span>
                  <span className={cn("absolute bottom-0 left-0 w-0 h-[1.5px] group-hover/signin:w-full transition-all duration-300", currentTheme.linkUnderline)} />
                </Link>
              </motion.p>
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* Terms & Privacy Policies Modal */}
      <TermsAndPrivacyModal
        isOpen={isTermsModalOpen}
        onClose={() => setIsTermsModalOpen(false)}
        onAccept={() => {
          setAcceptedTerms(true);
          setIsTermsModalOpen(false);
          toast.success('Terms & Privacy Policy accepted.');
        }}
        onReject={() => {
          setAcceptedTerms(false);
          setIsTermsModalOpen(false);
        }}
        role={role === 'FieldTeam' ? 'fieldteam' : 'client'}
      />

      {/* Google & Apple Social Registration Modal */}
      <SocialAuthModal
        isOpen={isSocialModalOpen}
        onClose={() => setIsSocialModalOpen(false)}
        provider={socialModalProvider}
        role={role === 'FieldTeam' ? 'fieldteam' : 'client'}
        mode="register"
      />
    </div>
  );
};

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link, useSearchParams, useLocation } from 'react-router-dom';
import { Mail, ArrowLeft, CheckCircle2, Loader2, Lock, Eye, EyeOff, KeyRound, ShieldAlert, Check, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiClient } from '@/infrastructure/api/client';
import { ENDPOINTS } from '@/infrastructure/api/endpoints';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { CodeSlots } from '@/components/ui/CodeSlots';

type Step = 'EMAIL' | 'CODE' | 'NEW_PASSWORD' | 'SUCCESS';

const THEMES = {
  fieldteam: {
    cardSurface: 'bg-[#180c04]/90 border-amber-500/20 shadow-[0_25px_60px_rgba(20,8,0,0.8)]',
    logoBox: 'bg-gradient-to-br from-amber-500 via-amber-600 to-orange-600 shadow-amber-500/35 border-amber-400/30',
    primaryBtn: 'bg-gradient-to-r from-amber-500 via-amber-600 to-orange-600 hover:from-amber-400 hover:to-orange-500 shadow-amber-500/30 text-white',
    focusRing: 'focus-within:border-amber-400 focus-within:ring-[3px] focus-within:ring-amber-400/25',
    accentText: 'text-amber-400',
    accentHover: 'hover:text-amber-300',
    badge: 'bg-amber-500/15 border-amber-500/30 text-amber-300',
    codeBox: 'border-amber-500/30 bg-amber-500/10 text-amber-200 focus:border-amber-400 focus:ring-amber-400/30',
    successIcon: 'text-amber-400',
    codeSlots: {
      accentColor: '#ea580c',
      inkColor: '#fb923c',
      slotColor: 'rgba(234, 88, 12, 0.14)',
      digitColor: '#ffffff',
      dangerColor: '#ef4444',
    },
  },
  admin: {
    cardSurface: 'bg-[#0e071c]/90 border-purple-500/20 shadow-[0_25px_60px_rgba(10,3,25,0.8)]',
    logoBox: 'bg-gradient-to-br from-purple-500 via-purple-600 to-indigo-600 shadow-purple-500/35 border-purple-400/30',
    primaryBtn: 'bg-gradient-to-r from-purple-600 via-purple-500 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 shadow-purple-600/30 text-white',
    focusRing: 'focus-within:border-purple-400 focus-within:ring-[3px] focus-within:ring-purple-400/25',
    accentText: 'text-purple-400',
    accentHover: 'hover:text-purple-300',
    badge: 'bg-purple-500/15 border-purple-500/30 text-purple-300',
    codeBox: 'border-purple-500/30 bg-purple-500/10 text-purple-200 focus:border-purple-400 focus:ring-purple-400/30',
    successIcon: 'text-purple-400',
    codeSlots: {
      accentColor: '#9333ea',
      inkColor: '#c084fc',
      slotColor: 'rgba(147, 51, 234, 0.14)',
      digitColor: '#ffffff',
      dangerColor: '#ef4444',
    },
  },
  client: {
    cardSurface: 'bg-[#081510]/85 border-white/10 shadow-[0_25px_60px_rgba(0,0,0,0.7)]',
    logoBox: 'bg-gradient-to-br from-teal-500 to-emerald-600 shadow-teal-500/25 border-white/20',
    primaryBtn: 'bg-gradient-to-r from-teal-500 via-emerald-500 to-teal-500 hover:from-teal-400 hover:to-emerald-400 shadow-teal-500/25 text-white',
    focusRing: 'focus-within:border-teal-400 focus-within:ring-[3px] focus-within:ring-teal-400/20',
    accentText: 'text-teal-400',
    accentHover: 'hover:text-teal-300',
    badge: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300',
    codeBox: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200 focus:border-emerald-400 focus:ring-teal-400/30',
    successIcon: 'text-emerald-400',
    codeSlots: {
      accentColor: '#10b981',
      inkColor: '#34d399',
      slotColor: 'rgba(16, 185, 129, 0.14)',
      digitColor: '#ffffff',
      dangerColor: '#ef4444',
    },
  },
};

export const ForgotPasswordForm = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const location = useLocation();

  // Role detection
  const detectedRole = (() => {
    const fromParam = (searchParams.get('role') || '').toLowerCase();
    if (fromParam === 'fieldteam' || fromParam === 'field' || fromParam === 'crew') return 'fieldteam';
    if (fromParam === 'admin') return 'admin';
    if (fromParam === 'client') return 'client';

    const fromState = ((location.state as any)?.role || '').toLowerCase();
    if (fromState === 'fieldteam' || fromState === 'field' || fromState === 'crew') return 'fieldteam';
    if (fromState === 'admin') return 'admin';
    if (fromState === 'client') return 'client';

    try {
      const fromStorage = (localStorage.getItem('cf_preferred_role') || '').toLowerCase();
      if (fromStorage === 'fieldteam' || fromStorage === 'field' || fromStorage === 'crew') return 'fieldteam';
      if (fromStorage === 'admin') return 'admin';
      if (fromStorage === 'client') return 'client';
    } catch (e) {}

    return 'client';
  })() as 'client' | 'fieldteam' | 'admin';

  const theme = THEMES[detectedRole];

  // Multi-step State
  const [step, setStep] = useState<Step>('EMAIL');
  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [codeStatus, setCodeStatus] = useState<'idle' | 'error' | 'success'>('idle');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [notRegisteredError, setNotRegisteredError] = useState('');

  // Handle Step 1: Send Recovery Code
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      toast.error('Please enter your account email');
      return;
    }

    setNotRegisteredError('');
    setIsLoading(true);
    try {
      const res = await apiClient.post(ENDPOINTS.AUTH.FORGOT_PASSWORD, {
        email: cleanEmail,
        role: detectedRole,
      });

      if (res.data?.success) {
        toast.success(res.data.message || '4-digit recovery code sent to your email.');
        setStep('CODE');
      }
    } catch (err: any) {
      const status = err.response?.status;
      const message = err.response?.data?.message || 'Failed to request password reset';
      if (status === 404 && message.toLowerCase().includes('register')) {
        setNotRegisteredError(message);
      } else {
        toast.error(message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Step 2: Verify Code
  const handleVerifyCodeSubmit = async (e?: React.FormEvent, codeOverride?: string) => {
    if (e) e.preventDefault();
    const code = (codeOverride ?? otpCode).trim();
    if (code.length !== 4) {
      toast.error('Please enter the full 4-digit recovery code');
      return;
    }

    setIsLoading(true);
    try {
      const res = await apiClient.post(ENDPOINTS.AUTH.VERIFY_RESET_CODE, {
        email: email.trim().toLowerCase(),
        code,
      });

      if (res.data?.success) {
        setCodeStatus('success');
        toast.success('Recovery code verified! Choose your new password.');
        setTimeout(() => {
          setStep('NEW_PASSWORD');
          setCodeStatus('idle');
        }, 850);
      }
    } catch (err: any) {
      setCodeStatus('error');
      toast.error(err.response?.data?.message || 'Invalid or expired recovery code');
    } finally {
      setIsLoading(false);
    }
  };

  // Resend Recovery Code
  const handleResendCode = async () => {
    if (!email.trim() || isResending) return;
    setIsResending(true);
    try {
      const res = await apiClient.post(ENDPOINTS.AUTH.FORGOT_PASSWORD, {
        email: email.trim().toLowerCase(),
        role: detectedRole,
      });
      if (res.data?.success) {
        toast.success('A new 4-digit recovery code has been sent to your email.');
        setOtpCode('');
        setCodeStatus('idle');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to resend code');
    } finally {
      setIsResending(false);
    }
  };

  // Handle Step 3: Set New Password
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setIsLoading(true);
    try {
      const res = await apiClient.post(ENDPOINTS.AUTH.RESET_PASSWORD_DIRECT, {
        email: email.trim().toLowerCase(),
        code: otpCode.trim(),
        password,
      });

      if (res.data?.success) {
        toast.success(res.data.message || 'Password updated successfully!');
        setStep('SUCCESS');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to reset password');
    } finally {
      setIsLoading(false);
    }
  };

  const loginUrl = `/login?role=${detectedRole}`;
  const registerUrl = `/register?role=${detectedRole === 'fieldteam' ? 'fieldteam' : 'client'}`;

  return (
    <div className={cn("w-full max-w-md mx-auto border backdrop-blur-2xl rounded-3xl overflow-hidden p-6 sm:p-8 transition-all duration-300", theme.cardSurface)}>
      {/* Top Themed Header */}
      <div className="space-y-1.5 text-center pb-5">
        <div className={cn("mx-auto w-14 h-14 rounded-2xl flex items-center justify-center text-white mb-3 shadow-xl transition-all duration-300", theme.logoBox)}>
          {step === 'EMAIL' && <Mail className="w-6 h-6 drop-shadow" />}
          {step === 'CODE' && <KeyRound className="w-6 h-6 drop-shadow" />}
          {step === 'NEW_PASSWORD' && <Lock className="w-6 h-6 drop-shadow" />}
          {step === 'SUCCESS' && <CheckCircle2 className="w-7 h-7 drop-shadow" />}
        </div>

        <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-white to-white/90">
          {step === 'EMAIL' && 'Forgot Password'}
          {step === 'CODE' && 'Reset Your Password'}
          {step === 'NEW_PASSWORD' && 'Enter New Password'}
          {step === 'SUCCESS' && 'Password Updated!'}
        </h2>

        <p className="text-xs sm:text-sm text-white/60">
          {step === 'EMAIL' && "Enter your registered email address and we'll send a 4-digit recovery code."}
          {step === 'CODE' && (
            <span>
              Enter the 4-digit recovery code sent to{' '}
              <strong className={theme.accentText}>{email}</strong>
            </span>
          )}
          {step === 'NEW_PASSWORD' && 'Create a new secure password for your ClearFlow account.'}
          {step === 'SUCCESS' && 'Your account password has been updated. You can now log in.'}
        </p>
      </div>

      <AnimatePresence mode="wait">
        {/* STEP 1: ENTER EMAIL */}
        {step === 'EMAIL' && (
          <motion.div
            key="step-email"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            {notRegisteredError && (
              <div className="mb-4 rounded-2xl p-4 bg-red-500/10 border border-red-500/25 text-left space-y-2.5">
                <div className="flex items-start gap-2.5">
                  <ShieldAlert className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                  <p className="text-xs sm:text-sm font-semibold text-red-200 leading-snug">
                    {notRegisteredError}
                  </p>
                </div>
                <Link
                  to={registerUrl}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-red-300 hover:text-white transition-colors"
                >
                  Register Yourself First &rarr;
                </Link>
              </div>
            )}

            <form onSubmit={handleEmailSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="email" className="text-xs font-semibold text-white/70">
                  Account Email
                </label>
                <div className={cn("relative flex items-center overflow-hidden rounded-xl border border-white/10 bg-white/5 transition-all", theme.focusRing)}>
                  <Mail className="absolute left-3.5 w-4 h-4 text-white/40" />
                  <input
                    id="email"
                    type="email"
                    placeholder="name@organization.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (notRegisteredError) setNotRegisteredError('');
                    }}
                    className="w-full bg-transparent text-white placeholder:text-white/35 h-11 pl-10 pr-4 text-xs sm:text-sm outline-none"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className={cn("w-full font-bold py-2.5 rounded-xl shadow-lg transition-all cursor-pointer flex items-center justify-center text-sm", theme.primaryBtn)}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sending Code...
                  </>
                ) : (
                  'Send Reset Instructions'
                )}
              </button>
            </form>
          </motion.div>
        )}

        {/* STEP 2: ENTER 4-DIGIT RECOVERY CODE */}
        {step === 'CODE' && (
          <motion.div
            key="step-code"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="space-y-4"
          >
            <form onSubmit={handleVerifyCodeSubmit} className="space-y-4">
              {/* Email preview with change option */}
              <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white/70">
                <span className="truncate pr-2">{email}</span>
                <button
                  type="button"
                  onClick={() => setStep('EMAIL')}
                  className={cn("text-[11px] font-semibold underline shrink-0 cursor-pointer", theme.accentText, theme.accentHover)}
                >
                  Change
                </button>
              </div>

              {/* 4-Digit CodeSlots Animated Input */}
              <div className="space-y-3 text-center py-2">
                <label className="block text-center text-xs font-semibold tracking-wide text-white/70">
                  Enter 4-Digit Recovery Code
                </label>
                <div className="flex justify-center items-center py-1">
                  <CodeSlots
                    length={4}
                    value={otpCode}
                    status={codeStatus}
                    onChange={(code) => {
                      setOtpCode(code);
                      if (codeStatus !== 'idle') setCodeStatus('idle');
                    }}
                    onComplete={(code) => {
                      handleVerifyCodeSubmit(undefined, code);
                    }}
                    accentColor={theme.codeSlots.accentColor}
                    inkColor={theme.codeSlots.inkColor}
                    slotColor={theme.codeSlots.slotColor}
                    digitColor={theme.codeSlots.digitColor}
                    dangerColor={theme.codeSlots.dangerColor}
                    slotSize={52}
                    gap={12}
                    radius={14}
                    bounce={0.25}
                    settle={0.3}
                    rise={10}
                    cascade={25}
                    autoFocus
                    disabled={isLoading}
                  />
                </div>
              </div>

              {/* Resend Action */}
              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={handleResendCode}
                  disabled={isResending}
                  className={cn("inline-flex items-center gap-1.5 text-xs font-semibold cursor-pointer transition-colors", theme.accentText, theme.accentHover)}
                >
                  {isResending ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Resending Code...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-3.5 h-3.5" />
                      Didn't receive the email? Resend code
                    </>
                  )}
                </button>
              </div>

              {/* Submit: Reset Password Button */}
              <button
                type="submit"
                disabled={isLoading || otpCode.length !== 4}
                className={cn(
                  "w-full font-bold py-2.5 rounded-xl shadow-lg transition-all cursor-pointer flex items-center justify-center text-sm disabled:opacity-50 disabled:cursor-not-allowed",
                  theme.primaryBtn
                )}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Verifying Code...
                  </>
                ) : (
                  'Reset Password'
                )}
              </button>
            </form>
          </motion.div>
        )}

        {/* STEP 3: ENTER NEW PASSWORD */}
        {step === 'NEW_PASSWORD' && (
          <motion.div
            key="step-password"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              {/* New Password */}
              <div className="space-y-1.5">
                <label htmlFor="new-pass" className="text-xs font-semibold text-white/70">
                  New Password
                </label>
                <div className={cn("relative flex items-center overflow-hidden rounded-xl border border-white/10 bg-white/5 transition-all", theme.focusRing)}>
                  <Lock className="absolute left-3.5 w-4 h-4 text-white/40" />
                  <input
                    id="new-pass"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-transparent text-white placeholder:text-white/35 h-11 pl-10 pr-10 text-xs sm:text-sm outline-none"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 text-white/40 hover:text-white cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div className="space-y-1.5">
                <label htmlFor="confirm-pass" className="text-xs font-semibold text-white/70">
                  Confirm Password
                </label>
                <div className={cn("relative flex items-center overflow-hidden rounded-xl border border-white/10 bg-white/5 transition-all", theme.focusRing)}>
                  <Lock className="absolute left-3.5 w-4 h-4 text-white/40" />
                  <input
                    id="confirm-pass"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-transparent text-white placeholder:text-white/35 h-11 pl-10 pr-10 text-xs sm:text-sm outline-none"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 text-white/40 hover:text-white cursor-pointer"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Password Requirements Checklist */}
              <div className="rounded-xl bg-white/5 border border-white/10 p-3 space-y-1.5 text-xs text-white/60">
                <div className="flex items-center gap-2">
                  <div className={cn("w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px]", password.length >= 6 ? "bg-emerald-500/20 text-emerald-400" : "bg-white/10 text-white/30")}>
                    {password.length >= 6 ? <Check className="w-2.5 h-2.5 stroke-[3]" /> : "•"}
                  </div>
                  <span className={password.length >= 6 ? "text-emerald-300 font-medium" : ""}>
                    Minimum 6 characters
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className={cn("w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px]", confirmPassword && password === confirmPassword ? "bg-emerald-500/20 text-emerald-400" : "bg-white/10 text-white/30")}>
                    {confirmPassword && password === confirmPassword ? <Check className="w-2.5 h-2.5 stroke-[3]" /> : "•"}
                  </div>
                  <span className={confirmPassword && password === confirmPassword ? "text-emerald-300 font-medium" : ""}>
                    Passwords match
                  </span>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading || password.length < 6 || password !== confirmPassword}
                className={cn(
                  "w-full font-bold py-2.5 rounded-xl shadow-lg transition-all cursor-pointer flex items-center justify-center text-sm disabled:opacity-50 disabled:cursor-not-allowed",
                  theme.primaryBtn
                )}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Resetting Password...
                  </>
                ) : (
                  'Reset Password'
                )}
              </button>
            </form>
          </motion.div>
        )}

        {/* STEP 4: SUCCESS */}
        {step === 'SUCCESS' && (
          <motion.div
            key="step-success"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="py-2 text-center space-y-4"
          >
            <div className={cn("rounded-2xl p-4 text-xs sm:text-sm text-left space-y-2", theme.badge)}>
              <div className="flex items-center gap-2 font-bold">
                <CheckCircle2 className={cn("w-5 h-5 shrink-0", theme.successIcon)} />
                <span>Password successfully reset!</span>
              </div>
              <p className="text-white/70 leading-relaxed text-xs">
                Your credentials have been securely updated. You can now log in to ClearFlow.
              </p>
            </div>

            <button
              onClick={() => navigate(loginUrl, { state: { skipPreloader: true } })}
              className={cn("w-full py-2.5 font-bold rounded-xl shadow-lg transition-all cursor-pointer text-sm flex items-center justify-center", theme.primaryBtn)}
            >
              Log In to ClearFlow &rarr;
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SINGLE BACK TO LOG IN LINK - NO DUPLICATE BOTTOM BUTTONS */}
      <div className="flex justify-center border-t border-white/10 pt-4 mt-6">
        <Link
          to={loginUrl}
          state={{ skipPreloader: true }}
          className={cn("flex items-center text-xs font-semibold transition-colors cursor-pointer", theme.accentText, theme.accentHover)}
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Back to Log In
        </Link>
      </div>
    </div>
  );
};

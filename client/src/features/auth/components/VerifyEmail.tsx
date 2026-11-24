import React, { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Leaf, Wrench, CheckCircle2, AlertCircle, Loader2, ArrowRight, 
  RotateCw, Mail, ShieldCheck, Edit3, Check, Smartphone, Shield
} from 'lucide-react';
import { apiClient } from '@/infrastructure/api/client';
import { ENDPOINTS } from '@/infrastructure/api/endpoints';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { CodeSlots } from '@/components/ui/CodeSlots';

export const VerifyEmail = () => {
  const { token } = useParams<{ token?: string }>();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();

  // Role state: from query param, navigation state, or localStorage
  const rawRole = (
    searchParams.get('role') || 
    (location.state as any)?.role || 
    (() => {
      try {
        return localStorage.getItem('cf_preferred_role');
      } catch (e) {
        return null;
      }
    })() || 
    ''
  ).toLowerCase();

  const isFieldRole = rawRole === 'fieldteam' || rawRole === 'field' || rawRole === 'crew';
  const isAdminRole = rawRole === 'admin';
  const roleKey = isFieldRole ? 'fieldteam' : isAdminRole ? 'admin' : 'client';

  // Theme definition
  const theme = isFieldRole ? {
    cardSurface: 'bg-[#180c04]/90 border-amber-500/25 shadow-[0_25px_60px_rgba(20,8,0,0.8)]',
    logoBox: 'bg-gradient-to-br from-amber-500 via-amber-600 to-orange-600 shadow-amber-500/35 border-white/20',
    LogoIcon: Leaf,
    successBox: 'bg-gradient-to-br from-amber-500/20 to-orange-500/20 border-amber-500/30 text-amber-400 shadow-amber-500/20',
    statusBox: 'bg-amber-500/10 border-amber-500/25 text-amber-300',
    statusText: 'text-amber-300/80',
    primaryBtn: 'bg-gradient-to-r from-amber-500 via-amber-600 to-orange-600 hover:from-amber-400 hover:via-amber-500 hover:to-orange-500 text-white shadow-amber-500/30',
    accentText: 'text-amber-400 hover:text-amber-300',
    inputBorderFocus: 'border-amber-500/50 focus:border-amber-400',
    hintBox: 'bg-amber-500/10 border-amber-500/20 text-amber-300/90',
    digitFilled: 'border-amber-400/80 bg-amber-500/10 shadow-lg shadow-amber-500/20',
    digitEmptyFocus: 'focus:border-amber-400 focus:bg-white/10',
    loginLinkHover: 'hover:text-amber-400',
    loginHighlight: 'text-amber-400',
    codeSlots: {
      accentColor: '#ea580c',
      inkColor: '#fb923c',
      slotColor: 'rgba(234, 88, 12, 0.14)',
      digitColor: '#ffffff',
      dangerColor: '#ef4444',
    },
  } : isAdminRole ? {
    cardSurface: 'bg-[#0e071c]/90 border-purple-500/25 shadow-[0_25px_60px_rgba(10,3,25,0.8)]',
    logoBox: 'bg-gradient-to-br from-purple-500 via-purple-600 to-indigo-600 shadow-purple-500/35 border-white/20',
    LogoIcon: Shield,
    successBox: 'bg-gradient-to-br from-purple-500/20 to-indigo-500/20 border-purple-500/30 text-purple-400 shadow-purple-500/20',
    statusBox: 'bg-purple-500/10 border-purple-500/25 text-purple-300',
    statusText: 'text-purple-300/80',
    primaryBtn: 'bg-gradient-to-r from-purple-600 via-purple-500 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-purple-600/30',
    accentText: 'text-purple-400 hover:text-purple-300',
    inputBorderFocus: 'border-purple-500/50 focus:border-purple-400',
    hintBox: 'bg-purple-500/10 border-purple-500/20 text-purple-300/90',
    digitFilled: 'border-purple-400/80 bg-purple-500/10 shadow-lg shadow-purple-500/20',
    digitEmptyFocus: 'focus:border-purple-400 focus:bg-white/10',
    loginLinkHover: 'hover:text-purple-400',
    loginHighlight: 'text-purple-400',
    codeSlots: {
      accentColor: '#9333ea',
      inkColor: '#c084fc',
      slotColor: 'rgba(147, 51, 234, 0.14)',
      digitColor: '#ffffff',
      dangerColor: '#ef4444',
    },
  } : {
    cardSurface: 'bg-[#081510]/85 border-teal-500/25 shadow-[0_25px_60px_rgba(0,0,0,0.7)]',
    logoBox: 'bg-gradient-to-br from-teal-500 to-emerald-600 shadow-teal-500/25 border-white/20',
    LogoIcon: Leaf,
    successBox: 'bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border-emerald-500/30 text-emerald-400 shadow-emerald-500/20',
    statusBox: 'bg-emerald-500/10 border-emerald-500/25 text-emerald-300',
    statusText: 'text-emerald-300/75',
    primaryBtn: 'bg-gradient-to-r from-teal-500 via-emerald-500 to-teal-500 hover:from-teal-400 hover:via-emerald-400 hover:to-teal-400 text-white shadow-teal-500/25',
    accentText: 'text-teal-400 hover:text-teal-300',
    inputBorderFocus: 'border-teal-500/50 focus:border-teal-400',
    hintBox: 'bg-teal-500/10 border-teal-500/20 text-teal-300/90',
    digitFilled: 'border-teal-400/80 bg-teal-500/10 shadow-lg shadow-teal-500/20',
    digitEmptyFocus: 'focus:border-teal-400 focus:bg-white/10',
    loginLinkHover: 'hover:text-teal-400',
    loginHighlight: 'text-teal-400',
    codeSlots: {
      accentColor: '#10b981',
      inkColor: '#34d399',
      slotColor: 'rgba(16, 185, 129, 0.14)',
      digitColor: '#ffffff',
      dangerColor: '#ef4444',
    },
  };

  const LogoIcon = theme.LogoIcon;

  // Email state: from query param, navigation state, or manual input
  const initialEmail = searchParams.get('email') || (location.state as any)?.email || '';
  
  const [email, setEmail] = useState(initialEmail);
  const [isEditingEmail, setIsEditingEmail] = useState(!initialEmail);

  // 4-digit OTP state & CodeSlots status
  const [otpCode, setOtpCode] = useState('');
  const [codeStatus, setCodeStatus] = useState<'idle' | 'error' | 'success'>('idle');

  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const [isResending, setIsResending] = useState(false);

  // Handle URL token if present (e.g. from direct email link)
  useEffect(() => {
    if (token) {
      if (/^\d{4}$/.test(token)) {
        setOtpCode(token);
        if (email) {
          submitCode(email, token);
        }
      } else {
        verifyLegacyToken(token);
      }
    }
  }, [token]);

  // Resend cooldown timer countdown
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Auto-redirect to login after successful verification
  useEffect(() => {
    if (isSuccess) {
      const redirectTimer = setTimeout(() => {
        navigate(`/login?role=${roleKey}&email=${encodeURIComponent(email)}`, { 
          state: { skipPreloader: true, role: roleKey, email }, 
          replace: true 
        });
      }, 1800);
      return () => clearTimeout(redirectTimer);
    }
  }, [isSuccess, navigate, roleKey, email]);

  const verifyLegacyToken = async (rawToken: string) => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      const res = await apiClient.get(ENDPOINTS.AUTH.VERIFY_EMAIL(rawToken));
      if (res.data?.success) {
        setIsSuccess(true);
        toast.success('Email successfully verified! Redirecting to sign in...', { duration: 2000 });
      } else {
        setErrorMessage(res.data?.message || 'Verification failed');
      }
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Invalid or expired verification link.');
    } finally {
      setIsLoading(false);
    }
  };

  const submitCode = async (targetEmail: string, code: string) => {
    if (!targetEmail.trim() || !targetEmail.includes('@')) {
      setErrorMessage('Please provide a valid email address');
      setIsEditingEmail(true);
      return;
    }
    if (code.length !== 4) {
      setErrorMessage('Please enter the full 4-digit code');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    try {
      const response = await apiClient.post(ENDPOINTS.AUTH.VERIFY_CODE, {
        email: targetEmail.trim().toLowerCase(),
        code: code.trim(),
      });

      if (response.data?.success) {
        setCodeStatus('success');
        setTimeout(() => {
          setIsSuccess(true);
          toast.success('Email successfully verified! Redirecting to sign in...', { duration: 1800 });
        }, 850);
      } else {
        setCodeStatus('error');
        setErrorMessage(response.data?.message || 'Invalid verification code');
      }
    } catch (err: any) {
      setCodeStatus('error');
      const msg = err.response?.data?.message || 'Verification failed. Please check your 4-digit code.';
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email.trim() || !email.includes('@')) {
      setErrorMessage('Please enter a valid email address to receive the code');
      setIsEditingEmail(true);
      return;
    }

    if (resendCooldown > 0 || isResending) return;

    setIsResending(true);
    setErrorMessage('');

    try {
      const response = await apiClient.post(ENDPOINTS.AUTH.RESEND_VERIFICATION, {
        email: email.trim().toLowerCase(),
      });

      if (response.data?.success) {
        setResendCooldown(30);
        setOtpCode('');
        setCodeStatus('idle');
        toast.success('Verification code sent to your Gmail! Check your inbox or Spam folder.', { duration: 2000 });
      } else {
        toast.error(response.data?.message || 'Failed to resend code');
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to resend code. Please try again.';
      toast.error(msg);
    } finally {
      setIsResending(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitCode(email, otpCode);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="w-full max-w-[520px] relative z-10 my-auto"
    >
      <div className={cn("relative backdrop-blur-2xl rounded-3xl p-6 sm:p-8 border text-center overflow-hidden transition-all duration-500", theme.cardSurface)}>
        {/* Subtle background grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.025] pointer-events-none"
          style={{
            backgroundImage: `linear-gradient(135deg, white 0.5px, transparent 0.5px), linear-gradient(45deg, white 0.5px, transparent 0.5px)`,
            backgroundSize: '28px 28px'
          }}
        />

        {/* Card Header with Role-Themed Icon */}
        <div className="text-center space-y-2 mb-6">
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', duration: 0.7 }}
            className={cn("mx-auto w-14 h-14 rounded-2xl flex items-center justify-center relative overflow-hidden shadow-xl border transition-all duration-500", theme.logoBox)}
          >
            <LogoIcon className="h-7 w-7 text-white drop-shadow" />
            <div className="absolute inset-0 bg-gradient-to-br from-white/25 to-transparent opacity-50 pointer-events-none" />
          </motion.div>

          <h1 className="text-2xl sm:text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-b from-white to-white/85 tracking-tight">
            Verify Your Email
          </h1>

          <p className="text-white/60 text-xs sm:text-sm">
            Enter the 4-digit code sent to your email to activate your account
          </p>
        </div>

        {/* Success Confirmation State */}
        <AnimatePresence mode="wait">
          {isSuccess ? (
            <motion.div
              key="success-state"
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="py-4 space-y-5"
            >
              <div className={cn("mx-auto w-16 h-16 rounded-2xl border flex items-center justify-center shadow-xl transition-all duration-500", theme.successBox)}>
                <CheckCircle2 className="w-10 h-10 animate-bounce" />
              </div>

              <div className="space-y-1.5">
                <h3 className="text-xl font-bold text-white tracking-tight">
                  Email Verified Successfully!
                </h3>
                <p className="text-xs sm:text-sm text-white/65 max-w-sm mx-auto leading-relaxed">
                  Your ClearFlow account is now fully active. Redirecting you to sign in...
                </p>
              </div>

              <div className={cn("rounded-2xl p-4 text-left flex items-start gap-3 transition-all duration-500", theme.statusBox)}>
                <ShieldCheck className="w-5 h-5 shrink-0 mt-0.5" />
                <div className="text-xs sm:text-sm">
                  <p className="font-semibold">Account Status: Verified</p>
                  <p className={cn("text-xs mt-0.5", theme.statusText)}>
                    Ready for instant sign in across all ClearFlow services.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => navigate(`/login?role=${roleKey}&email=${encodeURIComponent(email)}`, { state: { skipPreloader: true, role: roleKey, email }, replace: true })}
                className={cn("w-full py-3.5 font-bold rounded-xl shadow-lg transition-all text-sm sm:text-base flex items-center justify-center gap-2 cursor-pointer", theme.primaryBtn)}
              >
                <span>Proceed to Sign In</span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </button>
            </motion.div>
          ) : (
            <motion.div
              key="otp-form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-5"
            >
              {/* Target Email Banner & Edit Option */}
              <div className="rounded-2xl bg-white/5 border border-white/10 p-3.5 text-left flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <Mail className={cn("w-4 h-4 shrink-0", isFieldRole ? "text-amber-400" : "text-teal-400")} />
                  {isEditingEmail ? (
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@organization.com"
                      className={cn("bg-transparent text-xs sm:text-sm text-white placeholder:text-white/30 border-b outline-none w-full py-0.5", theme.inputBorderFocus)}
                      autoFocus
                    />
                  ) : (
                    <span className="text-xs sm:text-sm text-white/80 font-medium truncate">
                      {email || 'No email specified'}
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setIsEditingEmail(!isEditingEmail)}
                  className={cn("text-xs font-medium shrink-0 flex items-center gap-1 transition-colors cursor-pointer", theme.accentText)}
                >
                  {isEditingEmail ? (
                    <>
                      <Check className="w-3.5 h-3.5" /> Done
                    </>
                  ) : (
                    <>
                      <Edit3 className="w-3.5 h-3.5" /> Edit
                    </>
                  )}
                </button>
              </div>

              {/* Instructions badge prompting user to check their device/Gmail app */}
              <div className={cn("rounded-2xl p-3 text-left flex items-center gap-2.5 transition-all duration-500", theme.hintBox)}>
                <Smartphone className="w-4 h-4 shrink-0" />
                <p className="text-xs leading-relaxed">
                  We sent a 4-digit code to your email. Check your <strong>Gmail app</strong> (including <strong>Spam / Junk</strong> folder), then enter the code below.
                </p>
              </div>

              {/* Error Message Display */}
              {errorMessage && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-xl bg-rose-500/10 border border-rose-500/25 p-3 text-xs sm:text-sm text-rose-300 flex items-start gap-2 text-left"
                >
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </motion.div>
              )}

              {/* 4-Digit CodeSlots Animated Input */}
              <form onSubmit={handleFormSubmit} className="space-y-6">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-white/50 mb-4 text-center">
                    Enter 4-Digit Code
                  </label>
                  <div className="flex justify-center items-center py-1">
                    <CodeSlots
                      length={4}
                      value={otpCode}
                      status={codeStatus}
                      onChange={(code) => {
                        setOtpCode(code);
                        if (codeStatus !== 'idle') setCodeStatus('idle');
                        setErrorMessage('');
                      }}
                      onComplete={(code) => {
                        if (email.trim()) {
                          submitCode(email.trim(), code);
                        }
                      }}
                      accentColor={theme.codeSlots.accentColor}
                      inkColor={theme.codeSlots.inkColor}
                      slotColor={theme.codeSlots.slotColor}
                      digitColor={theme.codeSlots.digitColor}
                      dangerColor={theme.codeSlots.dangerColor}
                      slotSize={54}
                      gap={12}
                      radius={14}
                      bounce={0.25}
                      settle={0.3}
                      rise={10}
                      cascade={25}
                      autoFocus={!isEditingEmail}
                      disabled={isLoading}
                    />
                  </div>
                </div>

                {/* Submit Verification Button */}
                <button
                  type="submit"
                  disabled={isLoading || otpCode.length !== 4 || !email.trim()}
                  className={cn("w-full py-3.5 font-bold rounded-xl shadow-lg transition-all text-sm sm:text-base flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed", theme.primaryBtn)}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Verifying Code...</span>
                    </>
                  ) : (
                    <>
                      <span>Verify Code</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              {/* Resend 4-digit code option */}
              <div className="pt-2 text-center text-xs text-white/50">
                <p>
                  Didn't receive the email code?{' '}
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={resendCooldown > 0 || isResending || !email.trim()}
                    className={cn("font-medium inline-flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed", theme.accentText)}
                  >
                    {isResending ? (
                      <>
                        <RotateCw className="w-3 h-3 animate-spin" /> Sending...
                      </>
                    ) : resendCooldown > 0 ? (
                      `Resend in ${resendCooldown}s`
                    ) : (
                      'Resend Code'
                    )}
                  </button>
                </p>
              </div>

              {/* Return to Login link */}
              <div className="border-t border-white/10 pt-4 mt-4">
                <Link
                  to={`/login?role=${roleKey}&email=${encodeURIComponent(email)}`}
                  state={{ skipPreloader: true, role: roleKey, email }}
                  className={cn("text-xs text-white/50 transition-colors duration-200", theme.loginLinkHover)}
                >
                  Already verified? <span className={cn("font-semibold", theme.loginHighlight)}>Sign In</span>
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

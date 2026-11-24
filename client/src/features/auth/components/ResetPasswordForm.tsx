import React, { useState } from 'react';
import { useParams, useNavigate, Link, useSearchParams, useLocation } from 'react-router-dom';
import { Lock, CheckCircle2, Loader2, ArrowLeft, Eye, EyeOff, Check } from 'lucide-react';
import { apiClient } from '@/infrastructure/api/client';
import { ENDPOINTS } from '@/infrastructure/api/endpoints';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const THEMES = {
  fieldteam: {
    cardSurface: 'bg-[#180c04]/90 border-amber-500/20 shadow-[0_25px_60px_rgba(20,8,0,0.8)]',
    logoBox: 'bg-gradient-to-br from-amber-500 via-amber-600 to-orange-600 shadow-amber-500/35 border-amber-400/30',
    primaryBtn: 'bg-gradient-to-r from-amber-500 via-amber-600 to-orange-600 hover:from-amber-400 hover:to-orange-500 shadow-amber-500/30 text-white',
    focusRing: 'focus-within:border-amber-400 focus-within:ring-[3px] focus-within:ring-amber-400/25',
    accentText: 'text-amber-400',
    accentHover: 'hover:text-amber-300',
    badge: 'bg-amber-500/15 border-amber-500/30 text-amber-300',
    successIcon: 'text-amber-400',
  },
  admin: {
    cardSurface: 'bg-[#0e071c]/90 border-purple-500/20 shadow-[0_25px_60px_rgba(10,3,25,0.8)]',
    logoBox: 'bg-gradient-to-br from-purple-500 via-purple-600 to-indigo-600 shadow-purple-500/35 border-purple-400/30',
    primaryBtn: 'bg-gradient-to-r from-purple-600 via-purple-500 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 shadow-purple-600/30 text-white',
    focusRing: 'focus-within:border-purple-400 focus-within:ring-[3px] focus-within:ring-purple-400/25',
    accentText: 'text-purple-400',
    accentHover: 'hover:text-purple-300',
    badge: 'bg-purple-500/15 border-purple-500/30 text-purple-300',
    successIcon: 'text-purple-400',
  },
  client: {
    cardSurface: 'bg-[#081510]/85 border-white/10 shadow-[0_25px_60px_rgba(0,0,0,0.7)]',
    logoBox: 'bg-gradient-to-br from-teal-500 to-emerald-600 shadow-teal-500/25 border-white/20',
    primaryBtn: 'bg-gradient-to-r from-teal-500 via-emerald-500 to-teal-500 hover:from-teal-400 hover:to-emerald-400 shadow-teal-500/25 text-white',
    focusRing: 'focus-within:border-teal-400 focus-within:ring-[3px] focus-within:ring-teal-400/20',
    accentText: 'text-teal-400',
    accentHover: 'hover:text-teal-300',
    badge: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300',
    successIcon: 'text-emerald-400',
  },
};

export const ResetPasswordForm = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const location = useLocation();

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

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      toast.error('Missing password reset token');
      return;
    }
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
      const res = await apiClient.post(ENDPOINTS.AUTH.RESET_PASSWORD(token), {
        password: password,
      });

      if (res.data?.success) {
        setIsSuccess(true);
        toast.success(res.data.message || 'Your password has been successfully reset.');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Invalid or expired password reset link');
    } finally {
      setIsLoading(false);
    }
  };

  const loginUrl = `/login?role=${detectedRole}`;

  return (
    <div className={cn("w-full max-w-md mx-auto border backdrop-blur-2xl rounded-3xl overflow-hidden p-6 sm:p-8 transition-all duration-300", theme.cardSurface)}>
      <div className="space-y-1.5 text-center pb-5">
        <div className={cn("mx-auto w-14 h-14 rounded-2xl flex items-center justify-center text-white mb-3 shadow-xl transition-all duration-300", theme.logoBox)}>
          {isSuccess ? <CheckCircle2 className="w-7 h-7 drop-shadow" /> : <Lock className="w-6 h-6 drop-shadow" />}
        </div>
        <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-white to-white/90">
          {isSuccess ? 'Password Updated!' : 'Enter New Password'}
        </h2>
        <p className="text-xs sm:text-sm text-white/60">
          {isSuccess
            ? 'Your account password has been updated. You can now log in.'
            : 'Enter a new secure password for your ClearFlow account.'}
        </p>
      </div>

      <div>
        {isSuccess ? (
          <div className="py-2 text-center space-y-4">
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
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="pass" className="text-xs font-semibold text-white/70">
                New Password
              </label>
              <div className={cn("relative flex items-center overflow-hidden rounded-xl border border-white/10 bg-white/5 transition-all", theme.focusRing)}>
                <Lock className="absolute left-3.5 w-4 h-4 text-white/40" />
                <input
                  id="pass"
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

            <div className="space-y-1.5">
              <label htmlFor="confirm" className="text-xs font-semibold text-white/70">
                Confirm Password
              </label>
              <div className={cn("relative flex items-center overflow-hidden rounded-xl border border-white/10 bg-white/5 transition-all", theme.focusRing)}>
                <Lock className="absolute left-3.5 w-4 h-4 text-white/40" />
                <input
                  id="confirm"
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
        )}
      </div>

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

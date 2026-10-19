import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Mail, ArrowLeft, CheckCircle2, Loader2, Zap } from 'lucide-react';
import { apiClient } from '@/infrastructure/api/client';
import { ENDPOINTS } from '@/infrastructure/api/endpoints';
import { toast } from 'sonner';

export const ForgotPasswordForm = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [resetUrl, setResetUrl] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error('Please enter your account email');
      return;
    }

    setIsLoading(true);
    try {
      const res = await apiClient.post(ENDPOINTS.AUTH.FORGOT_PASSWORD, { email: email.trim() });
      if (res.data?.success) {
        setResetUrl(res.data?.data?.resetUrl || '');
        setIsSent(true);
        toast.success('Password reset link has been dispatched to your email.');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to request password reset');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto shadow-2xl border-none bg-white/95 backdrop-blur-md rounded-2xl overflow-hidden">
      <CardHeader className="space-y-1 text-center pb-4">
        <div className="mx-auto w-12 h-12 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-700 mb-2">
          <Mail className="w-6 h-6" />
        </div>
        <CardTitle className="text-2xl font-bold text-gray-900">Forgot Password</CardTitle>
        <CardDescription className="text-gray-500">
          Enter your registered email address and we'll send a secure password reset link.
        </CardDescription>
      </CardHeader>

      <CardContent>
        {isSent ? (
          <div className="py-6 text-center space-y-4">
            <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto animate-bounce" />
            <h3 className="font-bold text-lg text-gray-900">Check Your Inbox</h3>
            <p className="text-sm text-gray-600">
              We've dispatched recovery instructions to <span className="font-semibold text-teal-800">{email}</span>.
            </p>

            {resetUrl && (
              <div className="rounded-xl bg-emerald-50/80 p-3.5 border border-emerald-200 text-xs text-emerald-900 space-y-2 text-left mt-2">
                <div className="flex items-center gap-1.5 font-bold text-emerald-800">
                  <Zap className="w-4 h-4 text-emerald-600" />
                  <span>Direct Reset Link (Instant Access):</span>
                </div>
                <p className="text-[11px] text-gray-600">
                  You can set your new password immediately by clicking below:
                </p>
                <a
                  href={resetUrl}
                  className="block text-center w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg shadow-sm transition-colors text-xs"
                >
                  ⚡ Set New Password Now
                </a>
              </div>
            )}

            <Button onClick={() => navigate('/login')} className="w-full bg-teal-600 hover:bg-teal-700 mt-4 text-white font-semibold">
              Return to Sign In
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-semibold text-gray-700 uppercase">
                Account Email
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="name@clearflow.pk"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-9 bg-gray-50/50 border-gray-200 focus-visible:ring-teal-500"
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-teal-600 hover:bg-teal-700 text-white font-semibold py-2.5 shadow-md shadow-teal-700/20 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending Link...
                </>
              ) : (
                'Send Reset Instructions'
              )}
            </Button>
          </form>
        )}
      </CardContent>

      <CardFooter className="flex justify-center border-t border-gray-100 py-4 bg-gray-50/50">
        <Link to="/login" className="flex items-center text-xs font-semibold text-teal-700 hover:text-teal-800 hover:underline">
          <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Back to Sign In
        </Link>
      </CardFooter>
    </Card>
  );
};

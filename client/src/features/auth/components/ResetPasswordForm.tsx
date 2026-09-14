import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Lock, CheckCircle2, Loader2, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { apiClient } from '@/infrastructure/api/client';
import { ENDPOINTS } from '@/infrastructure/api/endpoints';
import { toast } from 'sonner';

export const ResetPasswordForm = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
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
        toast.success('Your password has been successfully reset.');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Invalid or expired password reset link');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-[80vh] items-center justify-center p-4">
      <Card className="w-full max-w-md mx-auto shadow-2xl border-none bg-white/95 backdrop-blur-md rounded-2xl overflow-hidden">
        <CardHeader className="space-y-1 text-center pb-4">
          <div className="mx-auto w-12 h-12 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-700 mb-2">
            <Lock className="w-6 h-6" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">Reset Password</CardTitle>
          <CardDescription className="text-gray-500">
            Enter a new secure password for your ClearFlow account.
          </CardDescription>
        </CardHeader>

        <CardContent>
          {isSuccess ? (
            <div className="py-6 text-center space-y-4">
              <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto animate-bounce" />
              <h3 className="font-bold text-lg text-gray-900">Password Updated!</h3>
              <p className="text-sm text-gray-600">
                You can now sign in to ClearFlow using your new credentials.
              </p>
              <Button onClick={() => navigate('/login')} className="w-full bg-teal-600 hover:bg-teal-700 mt-4 font-semibold text-white">
                Proceed to Sign In
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="pass" className="text-xs font-semibold text-gray-700 uppercase">
                  New Password
                </Label>
                <div className="relative">
                  <Input
                    id="pass"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Min 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pr-10 bg-gray-50/50 border-gray-200 focus-visible:ring-teal-500"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="confirm" className="text-xs font-semibold text-gray-700 uppercase">
                  Confirm New Password
                </Label>
                <div className="relative">
                  <Input
                    id="confirm"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Re-enter password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pr-10 bg-gray-50/50 border-gray-200 focus-visible:ring-teal-500"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
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
                    Updating Password...
                  </>
                ) : (
                  'Save New Password'
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
    </div>
  );
};

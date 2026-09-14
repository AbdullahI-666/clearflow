import React, { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Leaf, Eye, EyeOff, Loader2, KeyRound, AlertTriangle, ShieldAlert } from 'lucide-react';
import { useAuth } from '@/entities/user/hooks/useAuth';
import { apiClient } from '@/infrastructure/api/client';
import { ENDPOINTS } from '@/infrastructure/api/endpoints';
import { toast } from 'sonner';

export const LoginForm = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isLocked, setIsLocked] = useState(false);
  const [isUnverified, setIsUnverified] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLocked(false);
    setIsUnverified(false);

    if (!email.trim() || !password) {
      setError('Please enter both your email and password');
      return;
    }

    setIsLoading(true);

    try {
      const response = await apiClient.post(ENDPOINTS.AUTH.LOGIN, {
        email: email.trim().toLowerCase(),
        password,
      });

      if (response.data?.success && response.data?.data) {
        const { token, user } = response.data.data;
        login(token, user);
        toast.success(`Welcome back, ${user.name || 'User'}!`);

        // Navigate to role-specific dashboard or target route
        const from = (location.state as any)?.from?.pathname;
        if (from) {
          navigate(from, { replace: true });
        } else {
          const role = (user.role || '').toLowerCase();
          if (role === 'admin') {
            navigate('/admin/dashboard', { replace: true });
          } else if (role === 'fieldteam' || role === 'field_team') {
            navigate('/team/dashboard', { replace: true });
          } else {
            navigate('/client/dashboard', { replace: true });
          }
        }
      } else {
        setError(response.data?.message || 'Login failed');
      }
    } catch (err: any) {
      const status = err.response?.status;
      const msg = err.response?.data?.message || 'Invalid email or password. Please try again.';

      if (status === 429) {
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

  const fillDemo = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setError('');
    setIsLocked(false);
    setIsUnverified(false);
  };

  return (
    <div className="flex min-h-[80vh] items-center justify-center p-4">
      <Card className="w-full max-w-md border-none shadow-xl bg-white/95 backdrop-blur-sm">
        <CardHeader className="space-y-3 text-center">
          <div className="flex justify-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-600 shadow-inner">
              <Leaf className="h-6 w-6 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight text-gray-900">
            Welcome back
          </CardTitle>
          <CardDescription className="text-gray-500">
            AI-Powered Facility Management System
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {isLocked && (
              <div className="rounded-xl bg-rose-50 p-3.5 text-xs text-rose-700 border border-rose-200 flex items-start gap-2.5">
                <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Security Lockout Active</p>
                  <p className="mt-0.5">{error}</p>
                </div>
              </div>
            )}

            {isUnverified && !isLocked && (
              <div className="rounded-xl bg-amber-50 p-3.5 text-xs text-amber-800 border border-amber-200 flex items-start gap-2.5">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Account Not Verified</p>
                  <p className="mt-0.5">{error}</p>
                </div>
              </div>
            )}

            {error && !isLocked && !isUnverified && (
              <div className="rounded-md bg-red-50 p-3 text-sm text-red-600 border border-red-100">
                {error}
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@organization.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="focus-visible:ring-teal-500"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link to="/forgot-password" className="text-xs font-semibold text-teal-600 hover:text-teal-500">
                  Forgot Password?
                </Link>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Enter your password"
                  className="pr-10 focus-visible:ring-teal-500"
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

            <div className="flex items-center space-x-2">
              <Checkbox id="remember" className="data-[state=checked]:bg-teal-600 data-[state=checked]:border-teal-600" />
              <label
                htmlFor="remember"
                className="text-xs font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-gray-600"
              >
                Remember me on this device
              </label>
            </div>

            <Button 
              type="submit" 
              className="w-full bg-gradient-to-r from-teal-600 to-emerald-500 hover:from-teal-700 hover:to-emerald-600 text-white shadow-md transition-all cursor-pointer font-semibold py-2.5"
              disabled={isLoading}
            >
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Log In to ClearFlow'}
            </Button>
          </form>

          {/* Quick Demo Access Buttons */}
          <div className="mt-6 pt-4 border-t border-gray-100">
            <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium mb-2">
              <KeyRound className="w-3.5 h-3.5 text-teal-600" />
              <span>Instant Demo Credentials:</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-xs h-8 border-teal-200 text-teal-700 hover:bg-teal-50 hover:text-teal-800"
                onClick={() => fillDemo('admin@clearflow.com', 'Admin@123')}
              >
                Admin
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-xs h-8 border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800"
                onClick={() => fillDemo('client@clearflow.com', 'Demo@123')}
              >
                Client
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-xs h-8 border-amber-200 text-amber-700 hover:bg-amber-50 hover:text-amber-800"
                onClick={() => fillDemo('field@clearflow.com', 'Demo@123')}
              >
                Field Team
              </Button>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-center border-t border-gray-100 py-3 bg-gray-50/50">
          <p className="text-sm text-gray-500">
            Don't have an account?{' '}
            <Link to="/register" className="font-semibold text-teal-600 hover:text-teal-500">
              Register now
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
};

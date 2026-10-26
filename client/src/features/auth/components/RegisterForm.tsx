import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Leaf, Eye, EyeOff, Loader2, MailCheck, CheckCircle2, ArrowRight, Zap } from 'lucide-react';
import { apiClient } from '@/infrastructure/api/client';
import { ENDPOINTS } from '@/infrastructure/api/endpoints';
import { toast } from 'sonner';

export const RegisterForm = () => {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<'Client' | 'FieldTeam'>('Client');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isRegistered, setIsRegistered] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');
  const [verificationUrl, setVerificationUrl] = useState('');

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

    if (!phone.trim()) {
      setError('Please enter your phone number');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      toast.error('Password must be at least 6 characters');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      toast.error('Passwords do not match');
      return;
    }

    setIsLoading(true);

    try {
      const response = await apiClient.post(ENDPOINTS.AUTH.REGISTER, {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        role,
        password,
      });

      if (response.data?.success) {
        setRegisteredEmail(email.trim().toLowerCase());
        setVerificationUrl(response.data?.data?.verificationUrl || '');
        setIsRegistered(true);
        toast.success('Registration successful! Please verify your email.');
      } else {
        setError(response.data?.message || 'Registration failed');
      }
    } catch (err: any) {
      const isNetworkOrTimeout = !err.response || err.code === 'ECONNABORTED' || err.message?.includes('timeout') || err.message?.includes('Network Error');
      const status = err.response?.status;
      let msg = err.response?.data?.message;

      if (status === 409) {
        msg = 'An account with this email already exists. Please sign in or reset your password.';
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

  // Success Confirmation Screen
  if (isRegistered) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center p-4 py-12">
        <Card className="w-full max-w-md border-none shadow-xl bg-white/95 backdrop-blur-sm text-center">
          <CardHeader className="space-y-3">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-teal-50 border border-teal-100 text-teal-600 animate-bounce">
              <MailCheck className="h-8 w-8" />
            </div>
            <CardTitle className="text-2xl font-bold tracking-tight text-gray-900">
              Verify Your Email
            </CardTitle>
            <CardDescription className="text-gray-600 text-sm">
              We've dispatched an activation link to{' '}
              <span className="font-semibold text-teal-800">{registeredEmail}</span>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-left">
            <div className="rounded-xl bg-teal-50/60 p-4 border border-teal-100/80 space-y-2 text-xs text-teal-900">
              <div className="flex items-center gap-2 font-semibold">
                <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
                <span>Next step: Activate your account</span>
              </div>
              <p className="text-gray-600 pl-6 leading-relaxed">
                Click the verification button in your email to activate your account. Once verified, you can sign in to ClearFlow.
              </p>
            </div>

            {/* Instant Activation Link */}
            {verificationUrl && (
              <div className="rounded-xl bg-emerald-50/80 p-3.5 border border-emerald-200 text-xs text-emerald-900 space-y-2">
                <div className="flex items-center gap-1.5 font-bold text-emerald-800">
                  <Zap className="w-4 h-4 text-emerald-600" />
                  <span>Instant Activation (Direct Link):</span>
                </div>
                <p className="text-[11px] text-gray-600">
                  You can click below to activate your account immediately:
                </p>
                <a
                  href={verificationUrl}
                  className="block text-center w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg shadow-sm transition-colors text-xs"
                >
                  ⚡ Activate Account Now
                </a>
              </div>
            )}

            <Button
              onClick={() => navigate('/login')}
              variant="outline"
              className="w-full text-gray-700 font-semibold py-2.5 cursor-pointer mt-2"
            >
              Proceed to Sign In <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          </CardContent>
          <CardFooter className="flex justify-center border-t border-gray-100 py-4 bg-gray-50/50">
            <p className="text-xs text-gray-500">
              Didn't receive an email? Check spam or configure SMTP in server settings.
            </p>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-[80vh] items-center justify-center p-4 py-12">
      <Card className="w-full max-w-md border-none shadow-xl bg-white/95 backdrop-blur-sm">
        <CardHeader className="space-y-3 text-center">
          <div className="flex justify-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-600 shadow-inner">
              <Leaf className="h-6 w-6 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight text-gray-900">
            Create an account
          </CardTitle>
          <CardDescription className="text-gray-500">
            Join ClearFlow Facility Management System
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-md bg-red-50 p-3 text-sm text-red-600 border border-red-100">
                {error}
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                placeholder="Sarah Miller"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="focus-visible:ring-teal-500"
              />
            </div>
            
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
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+1 555 123 4567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                className="focus-visible:ring-teal-500"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="role">Role / Account Type</Label>
              <Select value={role} onValueChange={(val: any) => setRole(val)}>
                <SelectTrigger className="focus:ring-teal-500">
                  <SelectValue placeholder="Select account type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Client">Client (Facility User / Resident / Corporate)</SelectItem>
                  <SelectItem value="FieldTeam">Field Team (Service Crew / Technician)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Min 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="pr-10 focus-visible:ring-teal-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirm-password">Confirm Password</Label>
              <div className="relative">
                <Input
                  id="confirm-password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Re-enter password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="pr-10 focus-visible:ring-teal-500"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full bg-gradient-to-r from-teal-600 to-emerald-500 hover:from-teal-700 hover:to-emerald-600 text-white shadow-md transition-all mt-4 cursor-pointer"
              disabled={isLoading}
            >
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Register & Create Account'}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center">
          <p className="text-sm text-gray-500">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-teal-600 hover:text-teal-500">
              Log in
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
};

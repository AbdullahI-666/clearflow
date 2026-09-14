import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, AlertCircle, Loader2, Leaf, ArrowRight, RefreshCw } from 'lucide-react';
import { apiClient } from '@/infrastructure/api/client';
import { ENDPOINTS } from '@/infrastructure/api/endpoints';

export const VerifyEmail = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  const verify = async () => {
    if (!token) {
      setStatus('error');
      setMessage('Missing verification token in the URL.');
      return;
    }

    setStatus('loading');
    try {
      const res = await apiClient.get(ENDPOINTS.AUTH.VERIFY_EMAIL(token));
      if (res.data?.success) {
        setStatus('success');
        setMessage(res.data.message || 'Email address successfully verified!');
      } else {
        setStatus('error');
        setMessage(res.data?.message || 'Email verification failed.');
      }
    } catch (err: any) {
      setStatus('error');
      setMessage(err.response?.data?.message || 'Invalid or expired email verification link.');
    }
  };

  useEffect(() => {
    verify();
  }, [token]);

  return (
    <div className="flex min-h-[80vh] items-center justify-center p-4">
      <Card className="w-full max-w-md mx-auto shadow-xl border-none bg-white/95 backdrop-blur-sm text-center py-6">
        <CardHeader className="space-y-3">
          <div className="flex justify-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-600 shadow-inner">
              <Leaf className="h-6 w-6 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight text-gray-900">
            Email Verification
          </CardTitle>
          <CardDescription className="text-gray-500">
            Validating your ClearFlow account credentials
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {status === 'loading' && (
            <div className="py-8 space-y-3">
              <Loader2 className="w-12 h-12 text-teal-600 animate-spin mx-auto" />
              <p className="text-gray-600 text-sm font-medium">Verifying your token with the secure backend...</p>
            </div>
          )}

          {status === 'success' && (
            <div className="py-4 space-y-4">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 border border-emerald-100 text-emerald-600">
                <CheckCircle2 className="w-10 h-10 animate-bounce" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">{message}</h3>
              <p className="text-sm text-gray-600">
                Your account is now fully active. You can proceed to log in to your dashboard.
              </p>
              <Button
                className="w-full bg-teal-600 hover:bg-teal-700 text-white font-semibold py-2.5 shadow-md shadow-teal-700/20 cursor-pointer mt-2"
                onClick={() => navigate('/login')}
              >
                Proceed to Sign In <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </div>
          )}

          {status === 'error' && (
            <div className="py-4 space-y-4">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-rose-50 border border-rose-100 text-rose-600">
                <AlertCircle className="w-10 h-10" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Verification Failed</h3>
              <p className="text-sm text-gray-600">{message}</p>
              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1" onClick={verify}>
                  <RefreshCw className="w-4 h-4 mr-1.5" /> Retry
                </Button>
                <Button className="flex-1 bg-teal-600 hover:bg-teal-700 text-white" onClick={() => navigate('/login')}>
                  Back to Login
                </Button>
              </div>
            </div>
          )}
        </CardContent>

        <CardFooter className="flex justify-center border-t border-gray-100 py-3 bg-gray-50/50">
          <Link to="/login" className="text-xs font-semibold text-teal-600 hover:text-teal-500">
            Return to ClearFlow Login
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
};

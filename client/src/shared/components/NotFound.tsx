import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Home, ArrowLeft } from 'lucide-react';
import { useRoleTheme } from '@/shared/hooks/useRoleTheme';
import { cn } from '@/lib/utils';

export const NotFound = () => {
  const navigate = useNavigate();
  const theme = useRoleTheme();

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center p-6">
      <div className={cn("w-20 h-20 rounded-2xl flex items-center justify-center mb-6 shadow-sm border", theme.iconBox)}>
        <AlertTriangle className="w-10 h-10" />
      </div>
      <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight mb-2">404 - Page Not Found</h1>
      <p className="text-gray-500 max-w-md mb-8 text-sm">
        The requested screen or URL could not be located in the ClearFlow system. It may have been moved or removed.
      </p>
      <div className="flex gap-3">
        <Button variant="outline" onClick={() => navigate(-1)} className="border-gray-300 cursor-pointer">
          <ArrowLeft className="w-4 h-4 mr-2" /> Go Back
        </Button>
        <Button onClick={() => navigate('/dashboard')} className={theme.primaryBtn}>
          <Home className="w-4 h-4 mr-2" /> Dashboard
        </Button>
      </div>
    </div>
  );
};

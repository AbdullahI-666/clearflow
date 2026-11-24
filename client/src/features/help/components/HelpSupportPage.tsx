import React, { useState, useEffect } from 'react';
import { AIAssistantInterface } from '@/components/ui/ai-assistant-interface';
import { useAuth } from '@/entities/user/hooks/useAuth';
import { apiClient } from '@/infrastructure/api/client';

export const HelpSupportPage: React.FC = () => {
  const { user } = useAuth();

  const [operationalSettings, setOperationalSettings] = useState<any>({
    companyPhone: '+92 42 35889104',
  });

  useEffect(() => {
    let isMounted = true;
    const fetchSettings = async () => {
      try {
        const res = await apiClient.get('/settings');
        if (res.data?.data && isMounted) {
          setOperationalSettings(res.data.data);
        }
      } catch (_) {}
    };
    fetchSettings();

    const handleRefresh = (e: any) => {
      if (e?.detail) {
        setOperationalSettings((prev: any) => ({ ...prev, ...e.detail }));
      } else {
        fetchSettings();
      }
    };

    window.addEventListener('clearflow:refresh-data', handleRefresh);
    window.addEventListener('clearflow:company-updated', handleRefresh);
    window.addEventListener('clearflow:settings-updated', handleRefresh);

    return () => {
      isMounted = false;
      window.removeEventListener('clearflow:refresh-data', handleRefresh);
      window.removeEventListener('clearflow:company-updated', handleRefresh);
      window.removeEventListener('clearflow:settings-updated', handleRefresh);
    };
  }, []);

  return (
    <div className="w-full pb-10 animate-in fade-in duration-300">
      <AIAssistantInterface role={user?.role} companyPhone={operationalSettings?.companyPhone} />
    </div>
  );
};

export default HelpSupportPage;
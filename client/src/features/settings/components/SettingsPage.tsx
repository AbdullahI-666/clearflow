import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Cpu, ShieldAlert, Mail, Save, Loader2, RefreshCw, Radio } from 'lucide-react';
import { apiClient, clearApiCache } from '@/infrastructure/api/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export const SettingsPage = () => {
  const [companyName, setCompanyName] = useState('ClearFlow Facilities');
  const [companyPhone, setCompanyPhone] = useState('+92 42 35889104');
  const [companyEmail, setCompanyEmail] = useState('operations@clearflow.pk');
  const [companyAnnouncement, setCompanyAnnouncement] = useState('Facility operations active 24/7. Rapid-response teams deployed on standby.');
  const [serviceAvailability, setServiceAvailability] = useState('All Services Operational');
  const [aiThreshold, setAiThreshold] = useState(0.75);
  const [gpsInterval, setGpsInterval] = useState(30);
  const [maxActiveOrders, setMaxActiveOrders] = useState(5);
  const [maxFailedAttempts, setMaxFailedAttempts] = useState<number | ''>(5);
  const [currency, setCurrency] = useState('PKR');
  const [slaHours, setSlaHours] = useState<number | ''>(4);
  const [autoDispatch, setAutoDispatch] = useState(true);
  const [smtpHost, setSmtpHost] = useState('');
  const [smtpUser, setSmtpUser] = useState('');
  const [smtpPort, setSmtpPort] = useState<number | ''>(587);

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const fetchSettings = async (showToast = false) => {
    if (showToast) setIsRefreshing(true);
    const start = Date.now();
    try {
      const res = await apiClient.get('/settings');
      if (res.data?.success && res.data?.data) {
        const s = res.data.data;
        if (s.companyName) setCompanyName(s.companyName);
        if (s.companyPhone) setCompanyPhone(s.companyPhone);
        if (s.companyEmail) setCompanyEmail(s.companyEmail);
        if (s.companyAnnouncement) setCompanyAnnouncement(s.companyAnnouncement);
        if (s.serviceAvailability) setServiceAvailability(s.serviceAvailability);
        setAiThreshold(s.aiConfidenceThreshold ?? 0.75);
        setGpsInterval(s.gpsIntervalSeconds ?? 30);
        setMaxActiveOrders(s.maxActiveOrdersPerTeam ?? 5);
        setMaxFailedAttempts(s.maxFailedLoginAttempts ?? 5);
        setCurrency(s.defaultCurrency || 'PKR');
        setSlaHours(s.slaTargetHours || 4);
        setAutoDispatch(s.autoDispatchEnabled ?? true);
        setSmtpHost(s.smtpHost || '');
        setSmtpUser(s.smtpUser || '');
        setSmtpPort(s.smtpPort || 587);
      }
      if (showToast) {
        const elapsed = Date.now() - start;
        if (elapsed < 750) {
          await new Promise((resolve) => setTimeout(resolve, 750 - elapsed));
        }
        toast.success('System settings reloaded');
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
      if (showToast) {
        const elapsed = Date.now() - start;
        if (elapsed < 750) {
          await new Promise((resolve) => setTimeout(resolve, 750 - elapsed));
        }
        toast.error('Failed to reload settings');
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSettings(false);
    const handleGlobal = () => fetchSettings(true);
    window.addEventListener('clearflow:refresh-data', handleGlobal);
    return () => window.removeEventListener('clearflow:refresh-data', handleGlobal);
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await apiClient.patch('/settings', {
        companyName: companyName.trim(),
        companyPhone: companyPhone.trim(),
        companyEmail: companyEmail.trim(),
        companyAnnouncement: companyAnnouncement.trim(),
        serviceAvailability: serviceAvailability.trim(),
        aiConfidenceThreshold: Number(aiThreshold),
        gpsIntervalSeconds: Number(gpsInterval),
        maxActiveOrdersPerTeam: Number(maxActiveOrders),
        maxFailedLoginAttempts: Number(maxFailedAttempts),
        defaultCurrency: currency,
        slaTargetHours: Number(slaHours),
        autoDispatchEnabled: autoDispatch,
        smtpHost: smtpHost.trim(),
        smtpUser: smtpUser.trim(),
        smtpPort: Number(smtpPort),
      });

      if (res.data?.success) {
        clearApiCache();
        window.dispatchEvent(new CustomEvent('clearflow:company-updated', { detail: res.data.data }));
        window.dispatchEvent(new CustomEvent('clearflow:refresh-data', { detail: res.data.data }));
        toast.success('Global system settings and company information updated successfully!');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update settings');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4 w-full pb-12">
      {isLoading ? (
        <div className="py-20 text-center text-gray-400">
          <Loader2 className="w-8 h-8 animate-spin text-purple-600 mx-auto mb-2" />
          <p className="text-sm">Loading system configurations...</p>
        </div>
      ) : (
        <form onSubmit={handleSave} className="space-y-6">
          {/* Quality Verification Thresholds */}
          <Card className="border-none shadow-sm bg-white">
            <CardHeader>
              <CardTitle className="text-base text-gray-900 flex items-center gap-2">
                <Cpu className="w-5 h-5 text-purple-600" /> Automated Quality Verification
              </CardTitle>
              <CardDescription>
                Tune the confidence threshold for before/after service photo automated quality verification.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between items-center text-sm font-semibold">
                  <Label className="text-gray-700">Confidence Threshold</Label>
                  <span className="text-purple-700 font-bold bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-200">
                    {Math.round(aiThreshold * 100)}%
                  </span>
                </div>
                <div className="relative pt-1 pb-4">
                  <input
                    type="range"
                    min="0.50"
                    max="0.95"
                    step="0.01"
                    list="ai-threshold-ticks"
                    value={aiThreshold}
                    onChange={(e) => setAiThreshold(parseFloat(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
                  />
                  <datalist id="ai-threshold-ticks">
                    <option value="0.50" />
                    <option value="0.75" />
                    <option value="0.95" />
                  </datalist>
                  <div className="relative w-full text-[11px] text-gray-500 mt-2 font-medium h-4">
                    <button
                      type="button"
                      onClick={() => setAiThreshold(0.50)}
                      className={cn(
                        "absolute left-0 hover:text-purple-700 transition-colors cursor-pointer select-none",
                        Math.round(aiThreshold * 100) === 50 && "text-purple-700 font-bold"
                      )}
                    >
                      50% (Permissive)
                    </button>
                    <button
                      type="button"
                      onClick={() => setAiThreshold(0.75)}
                      style={{ left: `${((0.75 - 0.50) / (0.95 - 0.50)) * 100}%` }}
                      className={cn(
                        "absolute -translate-x-1/2 hover:text-purple-700 transition-colors cursor-pointer select-none whitespace-nowrap",
                        Math.round(aiThreshold * 100) === 75 ? "text-purple-700 font-bold" : "text-gray-500"
                      )}
                    >
                      75% (Recommended Default)
                    </button>
                    <button
                      type="button"
                      onClick={() => setAiThreshold(0.95)}
                      className={cn(
                        "absolute right-0 hover:text-purple-700 transition-colors cursor-pointer select-none",
                        Math.round(aiThreshold * 100) === 95 && "text-purple-700 font-bold"
                      )}
                    >
                      95% (Strict Quality Control)
                    </button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Security & Lockout Policy */}
          <Card className="border-none shadow-sm bg-white">
            <CardHeader>
              <CardTitle className="text-base text-gray-900 flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-purple-600" /> Security & Lockout Policy
              </CardTitle>
              <CardDescription>
                Brute-force protection rules and account lockout thresholds.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-1.5 max-w-sm">
                <Label className="text-xs font-semibold text-gray-700">Max Failed Login Attempts</Label>
                <Input
                  type="number"
                  min="3"
                  max="10"
                  value={maxFailedAttempts}
                  onChange={(e) => setMaxFailedAttempts(e.target.value === '' ? '' : Number(e.target.value))}
                  className="bg-gray-50/50"
                  required
                />
                <p className="text-[11px] text-gray-400">Locks account for 15 minutes after threshold is exceeded.</p>
              </div>
            </CardContent>
          </Card>

          {/* Email / SMTP Credentials */}
          <Card className="border-none shadow-sm bg-white">
            <CardHeader>
              <CardTitle className="text-base text-gray-900 flex items-center gap-2">
                <Mail className="w-5 h-5 text-purple-600" /> Email Notifications Gateway (SMTP)
              </CardTitle>
              <CardDescription>
                SendGrid or standard SMTP configuration for automated email notifications.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs font-semibold text-gray-700">SMTP Host / Provider</Label>
                <Input
                  placeholder="smtp.gmail.com"
                  value={smtpHost}
                  onChange={(e) => setSmtpHost(e.target.value)}
                  className="bg-gray-50/50"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-700">Port</Label>
                <Input
                  type="number"
                  value={smtpPort}
                  onChange={(e) => setSmtpPort(e.target.value === '' ? '' : Number(e.target.value))}
                  className="bg-gray-50/50"
                />
              </div>
            </CardContent>
          </Card>

          {/* Action Footer */}
          <div className="flex justify-end pt-2">
            <Button
              type="submit"
              disabled={isSaving}
              className="bg-purple-600 hover:bg-purple-700 text-white font-semibold px-6 shadow-md shadow-purple-600/20 cursor-pointer"
            >
              {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Save Global Settings
            </Button>
          </div>
        </form>
      )}
    </div>
  );
};

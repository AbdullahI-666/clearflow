import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sliders, Cpu, Radio, ShieldAlert, Mail, Save, Loader2, RefreshCw, DollarSign, Clock, Zap } from 'lucide-react';
import { apiClient } from '@/infrastructure/api/client';
import { toast } from 'sonner';

export const SettingsPage = () => {
  const [aiThreshold, setAiThreshold] = useState(0.75);
  const [gpsInterval, setGpsInterval] = useState(30);
  const [maxActiveOrders, setMaxActiveOrders] = useState(5);
  const [maxFailedAttempts, setMaxFailedAttempts] = useState(5);
  const [currency, setCurrency] = useState('USD');
  const [slaHours, setSlaHours] = useState(4);
  const [autoDispatch, setAutoDispatch] = useState(true);
  const [smtpHost, setSmtpHost] = useState('');
  const [smtpUser, setSmtpUser] = useState('');
  const [smtpPort, setSmtpPort] = useState(587);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const fetchSettings = async () => {
    try {
      const res = await apiClient.get('/settings');
      if (res.data?.success && res.data?.data) {
        const s = res.data.data;
        setAiThreshold(s.aiConfidenceThreshold ?? 0.75);
        setGpsInterval(s.gpsIntervalSeconds ?? 30);
        setMaxActiveOrders(s.maxActiveOrdersPerTeam ?? 5);
        setMaxFailedAttempts(s.maxFailedLoginAttempts ?? 5);
        setCurrency(s.defaultCurrency || 'USD');
        setSlaHours(s.slaTargetHours || 4);
        setAutoDispatch(s.autoDispatchEnabled ?? true);
        setSmtpHost(s.smtpHost || '');
        setSmtpUser(s.smtpUser || '');
        setSmtpPort(s.smtpPort || 587);
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await apiClient.patch('/settings', {
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
        toast.success('Global system settings updated successfully!');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update settings');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">System Settings</h1>
          <p className="text-gray-500 mt-1">Configure AI model thresholds, GPS telemetry intervals, currency, and security policies.</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchSettings} className="bg-white">
          <RefreshCw className="w-4 h-4 mr-2" /> Reload
        </Button>
      </div>

      {isLoading ? (
        <div className="py-20 text-center text-gray-400">
          <Loader2 className="w-8 h-8 animate-spin text-teal-600 mx-auto mb-2" />
          <p className="text-sm">Loading system configurations...</p>
        </div>
      ) : (
        <form onSubmit={handleSave} className="space-y-6">
          {/* AI Intelligence Thresholds */}
          <Card className="border-none shadow-sm bg-white">
            <CardHeader>
              <CardTitle className="text-base text-gray-900 flex items-center gap-2">
                <Cpu className="w-5 h-5 text-teal-600" /> AI Verification & Machine Learning
              </CardTitle>
              <CardDescription>
                Tune the confidence threshold for before/after service photo automated quality verification.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between items-center text-sm font-semibold">
                  <Label className="text-gray-700">Confidence Threshold</Label>
                  <span className="text-teal-700 font-bold bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-200">
                    {Math.round(aiThreshold * 100)}% ({aiThreshold.toFixed(2)})
                  </span>
                </div>
                <input
                  type="range"
                  min="0.50"
                  max="0.95"
                  step="0.01"
                  value={aiThreshold}
                  onChange={(e) => setAiThreshold(parseFloat(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-teal-600"
                />
                <div className="flex justify-between text-[11px] text-gray-400">
                  <span>50% (Permissive)</span>
                  <span>75% (Recommended Default)</span>
                  <span>95% (Strict Quality Control)</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* GPS Telemetry & Dispatch Rules */}
          <Card className="border-none shadow-sm bg-white">
            <CardHeader>
              <CardTitle className="text-base text-gray-900 flex items-center gap-2">
                <Radio className="w-5 h-5 text-teal-600" /> GPS Telemetry & Dispatch Rules
              </CardTitle>
              <CardDescription>
                Configure real-time tracking polling frequency, SLA targets, and workload capacity.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-700">GPS Interval (Seconds)</Label>
                <Input
                  type="number"
                  min="10"
                  max="120"
                  value={gpsInterval}
                  onChange={(e) => setGpsInterval(Number(e.target.value))}
                  className="bg-gray-50/50"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-700">Max Orders Per Team</Label>
                <Input
                  type="number"
                  min="1"
                  max="20"
                  value={maxActiveOrders}
                  onChange={(e) => setMaxActiveOrders(Number(e.target.value))}
                  className="bg-gray-50/50"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-700">SLA Target (Hours)</Label>
                <Input
                  type="number"
                  min="1"
                  max="48"
                  value={slaHours}
                  onChange={(e) => setSlaHours(Number(e.target.value))}
                  className="bg-gray-50/50"
                  required
                />
              </div>
            </CardContent>
          </Card>

          {/* Billing & Currency */}
          <Card className="border-none shadow-sm bg-white">
            <CardHeader>
              <CardTitle className="text-base text-gray-900 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-teal-600" /> Commercial Currency & Billing
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-700">Default Currency</Label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full border border-gray-200 rounded-md p-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  <option value="USD">USD ($) - US Dollar (Worldwide)</option>
                  <option value="EUR">EUR (€) - Euro</option>
                  <option value="GBP">GBP (£) - British Pound</option>
                  <option value="AED">AED (د.إ) - UAE Dirham</option>
                  <option value="SAR">SAR (﷼) - Saudi Riyal</option>
                  <option value="PKR">PKR (Rs) - Pakistani Rupee</option>
                </select>
              </div>

              <div className="space-y-1.5 flex flex-col justify-center">
                <label className="flex items-center gap-3 cursor-pointer pt-4">
                  <input
                    type="checkbox"
                    checked={autoDispatch}
                    onChange={(e) => setAutoDispatch(e.target.checked)}
                    className="w-4 h-4 text-teal-600 rounded border-gray-300 focus:ring-teal-500"
                  />
                  <span className="text-xs font-semibold text-gray-700">Enable Smart Automated Haversine Dispatch</span>
                </label>
              </div>
            </CardContent>
          </Card>

          {/* Security & Lockout Policy */}
          <Card className="border-none shadow-sm bg-white">
            <CardHeader>
              <CardTitle className="text-base text-gray-900 flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-teal-600" /> Security & Lockout Policy
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
                  onChange={(e) => setMaxFailedAttempts(Number(e.target.value))}
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
                <Mail className="w-5 h-5 text-teal-600" /> Email Notifications Gateway (SMTP)
              </CardTitle>
              <CardDescription>
                SendGrid or standard SMTP configuration for automated email dispatch.
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
                  onChange={(e) => setSmtpPort(Number(e.target.value))}
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
              className="bg-teal-600 hover:bg-teal-700 text-white font-semibold px-6 shadow-md shadow-teal-700/20 cursor-pointer"
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

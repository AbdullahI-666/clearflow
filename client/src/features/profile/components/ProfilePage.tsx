import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  User, Mail, Phone, Shield, CheckCircle2, Loader2, KeyRound, 
  Star, Award, ArrowRight, MessageSquare, MapPin, Navigation, Compass, AlertCircle,
  Lock, AlertTriangle
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/entities/user/hooks/useAuth';
import { apiClient, clearApiCache } from '@/infrastructure/api/client';
import { ENDPOINTS } from '@/infrastructure/api/endpoints';
import { useRoleTheme } from '@/shared/hooks/useRoleTheme';
import { IdentityVerificationModal } from '@/shared/components/IdentityVerificationModal';
import { resolveAddressCoordinates, reverseGeocodeCoords, findPresetMatch, forwardGeocodeAddress } from '@/shared/utils/locationHelper';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export const ProfilePage = () => {
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();
  const theme = useRoleTheme();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [detectedCoords, setDetectedCoords] = useState<{ lat: number; lng: number; label: string } | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [isSavingSecurity, setIsSavingSecurity] = useState(false);
  const [isVerificationModalOpen, setIsVerificationModalOpen] = useState(false);



  // Nearby Discovery Radius state (Persisted in localStorage)
  const [workRadius, setWorkRadius] = useState<number>(() => {
    const saved = localStorage.getItem('clearflow_worker_work_radius');
    return saved ? Number(saved) : 15;
  });
  const [clientRadius, setClientRadius] = useState<number>(() => {
    const saved = localStorage.getItem('clearflow_client_worker_radius');
    return saved ? Number(saved) : 15;
  });
  const [selectedCity] = useState('Johar Town, Lahore');

  // Dynamic estimate of available jobs based on radius
  const getEstimatedJobs = (radiusKm: number) => {
    switch (radiusKm) {
      case 5: return 4;
      case 10: return 8;
      case 15: return 14;
      case 25: return 22;
      case 50: return 31;
      default: return 14;
    }
  };

  // Dynamic estimate of available technicians based on radius
  const getEstimatedWorkers = (radiusKm: number) => {
    switch (radiusKm) {
      case 5: return 6;
      case 10: return 14;
      case 15: return 24;
      case 25: return 38;
      case 50: return 52;
      default: return 24;
    }
  };

  const handleWorkerRadiusChange = (radiusKm: number) => {
    setWorkRadius(radiusKm);
    localStorage.setItem('clearflow_worker_work_radius', String(radiusKm));
    toast.success(`Nearby work radius set to ${radiusKm} km (${getEstimatedJobs(radiusKm)} jobs available)`);
  };

  const handleClientRadiusChange = (radiusKm: number) => {
    setClientRadius(radiusKm);
    localStorage.setItem('clearflow_client_worker_radius', String(radiusKm));
    toast.success(`Technician search radius set to ${radiusKm} km (${getEstimatedWorkers(radiusKm)} workers nearby)`);
  };

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setPhone(user.phone || '');
      setAddress((user as any).address || '');
      setCity((user as any).city || 'Lahore');
    }
  }, [user]);

  // Real-time address geocoding preview as the user types or updates the address field
  useEffect(() => {
    const clean = address.trim();
    if (!clean || clean.length < 2) {
      setDetectedCoords(null);
      return;
    }

    const preset = findPresetMatch(clean);
    if (preset) {
      setDetectedCoords({ lat: preset.lat, lng: preset.lng, label: preset.name });
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const found = await resolveAddressCoordinates(clean, city) || await forwardGeocodeAddress(clean);
        if (found) {
          setDetectedCoords({ lat: found.lat, lng: found.lng, label: (found as any).name || clean });
        }
      } catch (_) {}
    }, 350);

    return () => clearTimeout(timer);
  }, [address, city]);

  const handleDetectGpsLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }
    setIsDetectingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          const detected = await reverseGeocodeCoords(lat, lng);
          setAddress(detected);
          setCity('Lahore');
          localStorage.setItem('clearflow_user_profile_address', detected);
          localStorage.setItem('clearflow_user_profile_lat', String(lat));
          localStorage.setItem('clearflow_user_profile_lng', String(lng));
          toast.success(`Detected GPS location: ${detected}`);
        } catch {
          toast.error('Failed to resolve address from coordinates');
        } finally {
          setIsDetectingLocation(false);
        }
      },
      (err) => {
        setIsDetectingLocation(false);
        toast.error(`GPS Error: ${err.message}. Please allow location permissions.`);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const userId = user?._id || user?.id || (user as any)?.email || 'me';
    if (!userId) return;

    setIsUpdatingProfile(true);
    try {
      const cleanAddress = address.trim();
      const cleanCity = city.trim();

      const origAddress = (user?.address || '').trim();
      const isAddressChanged = cleanAddress.toLowerCase() !== origAddress.toLowerCase();

      // Resolve coordinates for the address (checking presets first, then Photon/Nominatim geocode)
      let resolvedLat: number | undefined = undefined;
      let resolvedLng: number | undefined = undefined;

      if (cleanAddress) {
        if (detectedCoords) {
          resolvedLat = detectedCoords.lat;
          resolvedLng = detectedCoords.lng;
        } else {
          const preset = findPresetMatch(cleanAddress);
          if (preset) {
            resolvedLat = preset.lat;
            resolvedLng = preset.lng;
          } else {
            const coords = await resolveAddressCoordinates(cleanAddress, cleanCity) || await forwardGeocodeAddress(cleanAddress);
            if (coords) {
              resolvedLat = coords.lat;
              resolvedLng = coords.lng;
            }
          }
        }
      }

      // If address did not change and geocoding didn't find new coords, retain existing coordinates
      if (!isAddressChanged && (resolvedLat === undefined || resolvedLng === undefined)) {
        resolvedLat = (user as any)?.locationLat || (user as any)?.lat;
        resolvedLng = (user as any)?.locationLng || (user as any)?.lng;
      }

      const payload: any = {
        name: name.trim(),
        phone: phone.trim(),
        address: cleanAddress,
        city: cleanCity,
      };

      if (resolvedLat && resolvedLng) {
        payload.locationLat = resolvedLat;
        payload.locationLng = resolvedLng;
      }

      const res = await apiClient.patch(ENDPOINTS.USERS.UPDATE(userId), payload);

      if (res.data?.success && res.data?.data) {
        const updated = {
          ...res.data.data,
          address: cleanAddress,
          city: cleanCity,
          ...(resolvedLat && resolvedLng ? { locationLat: resolvedLat, locationLng: resolvedLng } : {}),
        };
        updateUser(updated);
        clearApiCache();

        const userKey = String(userId).toLowerCase().trim();
        if (cleanAddress) {
          localStorage.setItem('clearflow_user_profile_address', cleanAddress);
          if (userKey) localStorage.setItem(`clearflow_user_profile_address_${userKey}`, cleanAddress);
        }
        if (resolvedLat && resolvedLng) {
          localStorage.setItem('clearflow_user_profile_lat', String(resolvedLat));
          localStorage.setItem('clearflow_user_profile_lng', String(resolvedLng));
          if (userKey) {
            localStorage.setItem(`clearflow_user_profile_lat_${userKey}`, String(resolvedLat));
            localStorage.setItem(`clearflow_user_profile_lng_${userKey}`, String(resolvedLng));
          }
        }

        window.dispatchEvent(new CustomEvent('clearflow:user-updated', { detail: updated }));
        window.dispatchEvent(new CustomEvent('clearflow:refresh-data', { detail: updated }));
        toast.success('Profile details & location updated successfully!');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const validateEmailAddress = (emailStr: string): string | null => {
    if (!emailStr.trim()) return null;
    const clean = emailStr.trim().toLowerCase();

    if (!clean.includes('@')) {
      return 'Missing "@" in email address. Please enter a valid format.';
    }

    const [localPart, domain] = clean.split('@');
    if (!localPart) {
      return 'Missing username before "@". Please enter a valid email.';
    }
    if (!domain) {
      return 'Missing domain after "@". Please enter a domain like gmail.com.';
    }

    const knownTypos: Record<string, string> = {
      'gmai.com': 'gmail.com',
      'gmial.com': 'gmail.com',
      'gamil.com': 'gmail.com',
      'gmal.com': 'gmail.com',
      'gmaill.com': 'gmail.com',
      'gmaii.com': 'gmail.com',
      'gmail.co': 'gmail.com',
      'gmail.cm': 'gmail.com',
      'gma.com': 'gmail.com',
      'hotmial.com': 'hotmail.com',
      'hotmal.com': 'hotmail.com',
      'hotmai.com': 'hotmail.com',
      'outlok.com': 'outlook.com',
      'outloo.com': 'outlook.com',
      'yaho.com': 'yahoo.com',
      'yahooo.com': 'yahoo.com',
      'clearflo.com': 'clearflow.com',
      'clearfloww.com': 'clearflow.com',
      'clerflow.com': 'clearflow.com',
    };

    if (knownTypos[domain]) {
      return `Wrong domain "@${domain}". Did you mean "@${knownTypos[domain]}"? Please fix it to continue.`;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(clean)) {
      return 'Invalid email format. Please check your email (e.g. name@clearflow.com).';
    }

    return null;
  };

  const handleSaveCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    const userId = user?._id || user?.id || (user as any)?.email || 'me';
    if (!userId) return;

    const trimmedEmail = newEmail.trim().toLowerCase();
    const isEmailChanging = Boolean(trimmedEmail);
    const isPasswordChanging = Boolean(newPassword);

    if (!isEmailChanging && !isPasswordChanging) {
      toast.info('Please enter a new email or new password to update.');
      return;
    }

    if (isEmailChanging) {
      if (trimmedEmail === user?.email?.toLowerCase()) {
        toast.error('New email must be different from your current email address');
        return;
      }
      const err = validateEmailAddress(trimmedEmail);
      if (err) {
        setEmailError(err);
        toast.error(err);
        return;
      }
    }

    if (isPasswordChanging) {
      if (newPassword.length < 6) {
        toast.error('New password must be at least 6 characters');
        return;
      }
      if (newPassword !== confirmPassword) {
        toast.error('New passwords do not match');
        return;
      }
    }

    if (!currentPassword) {
      toast.error('Please enter your current password to authorize security changes');
      return;
    }

    setIsSavingSecurity(true);
    try {
      const payload: any = {
        currentPassword,
      };
      if (isEmailChanging) payload.newEmail = trimmedEmail;
      if (isPasswordChanging) payload.newPassword = newPassword;

      const res = await apiClient.patch(ENDPOINTS.USERS.UPDATE(userId), payload);

      if (res.data?.success && res.data?.data) {
        const updated = res.data.data;
        if (updated.token) {
          localStorage.setItem('clearflow_token', updated.token);
        }
        updateUser(updated);
        clearApiCache();
        window.dispatchEvent(new CustomEvent('clearflow:user-updated', { detail: updated }));
        window.dispatchEvent(new CustomEvent('clearflow:refresh-data', { detail: updated }));

        if (isEmailChanging && isPasswordChanging) {
          toast.success('Email address and password updated successfully!');
        } else if (isEmailChanging) {
          toast.success('Email address updated successfully!');
        } else {
          toast.success('Password changed successfully!');
        }

        setNewEmail('');
        setEmailError(null);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update credentials');
    } finally {
      setIsSavingSecurity(false);
    }
  };

  return (
    <div className="w-full pb-4">
      {/* Top Page Header */}
      <div className="pb-3 border-b border-gray-100 mb-4 bg-white transition-colors shrink-0">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">User Profile</h1>
        <p className="text-gray-500 text-xs sm:text-sm mt-0.5">Manage your account credentials, contact information, and security preferences.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
        {/* Left Column (Forms: Personal Info & Security) - Independent Scrolling */}
        <div className="order-2 md:order-1 md:col-span-2 space-y-6 md:h-[calc(100vh-12rem)] md:overflow-y-auto custom-scrollbar overscroll-contain pr-1 md:pr-3 pb-12">
          {/* Contact Details Form */}
          <Card className="border-none shadow-sm bg-white">
            <CardHeader>
              <CardTitle className="text-base text-gray-900 flex items-center gap-2">
                <User className={cn("w-4 h-4", theme.role === 'admin' ? 'text-purple-600' : theme.role === 'fieldteam' ? 'text-amber-600' : 'text-teal-600')} /> Personal Information
              </CardTitle>
              <CardDescription>Update your display name and contact phone number.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-gray-700">Full Name</Label>
                    <Input 
                      value={name} 
                      onChange={(e) => setName(e.target.value)} 
                      placeholder="Enter your name" 
                      className={cn("bg-gray-50/50", theme.focusRing)}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-gray-700">Phone Number</Label>
                    <Input 
                      value={phone} 
                      onChange={(e) => setPhone(e.target.value)} 
                      placeholder="e.g. 03001234567" 
                      className={cn("bg-gray-50/50", theme.focusRing)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold text-gray-700">Facility / Base Address</Label>
                      <button
                        type="button"
                        onClick={handleDetectGpsLocation}
                        disabled={isDetectingLocation}
                        className="text-[11px] font-semibold text-teal-600 hover:text-teal-700 flex items-center gap-1 cursor-pointer transition-colors"
                        title="Detect address from current device GPS"
                      >
                        {isDetectingLocation ? <Loader2 className="w-3 h-3 animate-spin text-teal-600" /> : <Navigation className="w-3 h-3 text-teal-600" />}
                        <span>Use My GPS</span>
                      </button>
                    </div>
                    <Input 
                      value={address} 
                      onChange={(e) => setAddress(e.target.value)} 
                      placeholder="e.g. Canal View, Johar Town, Lahore" 
                      className={cn("bg-gray-50/50", theme.focusRing)}
                    />
                    <span className="text-[10px] text-gray-400">Used as your default location for service requests and live tracking</span>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-gray-700">Operational City</Label>
                    <Input 
                      value={city} 
                      onChange={(e) => setCity(e.target.value)} 
                      placeholder="e.g. Lahore" 
                      className={cn("bg-gray-50/50", theme.focusRing)}
                    />
                  </div>
                </div>

                {/* Update CNIC Action & Save Profile Changes */}
                <div className="pt-3 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsVerificationModalOpen(true)}
                    className={cn(
                      "rounded-xl text-xs font-bold transition-all border cursor-pointer",
                      theme.role === 'admin'
                        ? "border-purple-200 text-purple-700 hover:bg-purple-50"
                        : theme.role === 'fieldteam'
                        ? "border-amber-200 text-amber-700 hover:bg-amber-50"
                        : "border-teal-200 text-teal-700 hover:bg-teal-50"
                    )}
                  >
                    Update your CNIC
                  </Button>

                  <Button 
                    type="submit" 
                    disabled={isUpdatingProfile}
                    className={theme.primaryBtn}
                  >
                    {isUpdatingProfile ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Save Profile Changes
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Security & Credentials */}
          <Card className="border-none shadow-sm bg-white">
            <CardHeader>
              <CardTitle className="text-base text-gray-900 flex items-center gap-2">
                <KeyRound className={cn("w-4 h-4", theme.role === 'admin' ? 'text-purple-600' : theme.role === 'fieldteam' ? 'text-amber-600' : 'text-teal-600')} /> Security & Credentials
              </CardTitle>
              <CardDescription>Update your primary login email address and account password in one unified form.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveCredentials} className="space-y-5">
                {/* Email Section */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-gray-800 uppercase tracking-wider">
                    <Mail className="w-3.5 h-3.5 text-gray-500" />
                    <span>Login Email Address</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-gray-700">Current Registered Email</Label>
                      <Input 
                        value={user?.email || ''} 
                        disabled 
                        className="bg-gray-100/80 text-gray-500 cursor-not-allowed"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-gray-700">New Email Address</Label>
                      <Input 
                        type="email"
                        value={newEmail} 
                        onChange={(e) => {
                          setNewEmail(e.target.value);
                          if (emailError) setEmailError(null);
                        }} 
                        placeholder="e.g. name@clearflow.com" 
                        className={cn("bg-gray-50/50", emailError ? "border-red-500 focus-visible:ring-red-500" : theme.focusRing)}
                      />
                      {emailError ? (
                        <p className="text-[11px] font-semibold text-red-600 flex items-center gap-1 mt-1">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                          {emailError}
                        </p>
                      ) : (
                        <span className="text-[11px] text-gray-400">Leave blank if keeping current email</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Password Section */}
                <div className="space-y-3 pt-3 border-t border-gray-100">
                  <div className="flex items-center gap-2 text-xs font-bold text-gray-800 uppercase tracking-wider">
                    <KeyRound className="w-3.5 h-3.5 text-gray-500" />
                    <span>Account Password</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-gray-700">New Password</Label>
                      <Input 
                        type="password"
                        value={newPassword} 
                        onChange={(e) => setNewPassword(e.target.value)} 
                        placeholder="Minimum 6 characters (or leave blank)" 
                        className={cn("bg-gray-50/50", theme.focusRing)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-gray-700">Confirm New Password</Label>
                      <Input 
                        type="password"
                        value={confirmPassword} 
                        onChange={(e) => setConfirmPassword(e.target.value)} 
                        placeholder="Repeat new password" 
                        className={cn("bg-gray-50/50", theme.focusRing)}
                      />
                    </div>
                  </div>
                </div>

                {/* Confirmation Current Password */}
                <div className="pt-3 border-t border-gray-100 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold text-gray-800 flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-gray-500" /> Current Password (Required for confirmation)
                    </Label>
                    <span className="text-[11px] text-gray-400">Required to authorize updates</span>
                  </div>
                  <Input 
                    type="password"
                    value={currentPassword} 
                    onChange={(e) => setCurrentPassword(e.target.value)} 
                    placeholder="Enter current password to save security updates" 
                    className={cn("bg-gray-50/50", theme.focusRing)}
                    required
                  />
                </div>

                <div className="flex justify-end pt-1">
                  <Button 
                    type="submit" 
                    disabled={isSavingSecurity || Boolean(emailError) || (!newEmail && !newPassword) || !currentPassword}
                    className={theme.primaryBtn}
                  >
                    {isSavingSecurity ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Save Security Changes
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Right Column (Profile Summary Card) - Independent Scrolling */}
        <div 
          className="order-1 md:order-2 col-span-1 md:h-[calc(100vh-12rem)] md:overflow-y-auto custom-scrollbar overscroll-contain pr-1 md:pr-2 pb-12 space-y-4"
        >
          {/* Profile Card Summary */}
          <Card className="border-none shadow-sm bg-white overflow-hidden">
            <div className={cn("p-6 text-white text-center", theme.bannerGradient)}>
              <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-md border-2 border-white/60 mx-auto flex items-center justify-center font-bold text-2xl mb-3 shadow-lg">
                {user?.name ? user.name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase() : 'U'}
              </div>
              <h2 className="font-bold text-lg">{user?.name || 'Authorized User'}</h2>
              <p className="text-white/80 text-xs mt-0.5">{user?.email}</p>
              <div className="mt-3">
                <Badge className="bg-white/20 text-white border-none text-xs px-2.5 py-0.5">
                  {(user?.role === 'FieldTeam' || user?.role?.toLowerCase() === 'fieldteam' ? 'Worker' : user?.role) || 'Member'} Role
                </Badge>
              </div>
            </div>

            <CardContent className="p-5 space-y-4 text-xs text-gray-600">
              <div className="flex items-center justify-between py-2 border-b border-gray-50">
                <span className="flex items-center gap-2 text-gray-500">
                  <Shield className={cn("w-4 h-4", theme.role === 'admin' ? 'text-purple-600' : theme.role === 'fieldteam' ? 'text-amber-600' : 'text-teal-600')} /> Account Status
                </span>
                <span className={cn(
                  "font-bold flex items-center gap-1",
                  theme.role === 'admin' ? "text-purple-600" : theme.role === 'fieldteam' ? "text-amber-600" : "text-emerald-600"
                )}>
                  <CheckCircle2 className="w-3.5 h-3.5" /> Active & Verified
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-gray-50">
                <span className="flex items-center gap-2 text-gray-500">
                  <Mail className={cn("w-4 h-4", theme.role === 'admin' ? 'text-purple-600' : theme.role === 'fieldteam' ? 'text-amber-600' : 'text-teal-600')} /> Registered Email
                </span>
                <span className="font-medium text-gray-900">{user?.email}</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="flex items-center gap-2 text-gray-500">
                  <Phone className={cn("w-4 h-4", theme.role === 'admin' ? 'text-purple-600' : theme.role === 'fieldteam' ? 'text-amber-600' : 'text-teal-600')} /> Phone
                </span>
                <span className="font-medium text-gray-900">{user?.phone || 'Not provided'}</span>
              </div>
            </CardContent>

            {/* Worker Ratings Showcase */}
            {theme.role === 'fieldteam' && (
              <div className="p-4 bg-amber-50/70 border-t border-amber-100 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                    <Star className="w-4 h-4 fill-amber-500 text-amber-500" /> Your Rating
                  </span>
                  <span className="text-sm font-black text-amber-700 font-mono">
                    {Number((user as any)?.rating ?? (user as any)?.averageRating ?? 0.0).toFixed(1)} ★
                  </span>
                </div>
                <Link
                  to="/reviews"
                  className="w-full py-2 px-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  View All Reviews
                  <ArrowRight className="w-3.5 h-3.5 ml-auto" />
                </Link>
              </div>
            )}

            {/* Client Ratings Showcase */}
            {theme.role === 'client' && (
              <div className="p-4 bg-teal-50/70 border-t border-teal-100">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-teal-950 flex items-center gap-1.5">
                    <Star className="w-4 h-4 fill-amber-500 text-amber-500" /> Your Rating
                  </span>
                  <span className="text-sm font-black text-teal-700 font-mono">
                    {Number((user as any)?.rating ?? (user as any)?.averageRating ?? 0.0).toFixed(1)} ★
                  </span>
                </div>
              </div>
            )}

            {/* Worker Nearby Job Radius Bar */}
            {theme.role === 'fieldteam' && (
              <div className="p-4 bg-amber-50/60 border-t border-amber-100 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                    <Navigation className="w-4 h-4 text-amber-700" /> Nearby Job Radius
                  </span>
                  <Badge variant="outline" className="border-amber-300 text-amber-800 bg-amber-100/60 text-xs font-bold px-2 py-0.5 rounded-full">
                    {workRadius} km
                  </Badge>
                </div>

                {/* Radius Options Bar */}
                <div className="grid grid-cols-5 gap-1 pt-0.5">
                  {[5, 10, 15, 25, 50].map((r) => {
                    const isSelected = Number(workRadius) === r;
                    return (
                      <button
                        key={r}
                        type="button"
                        onClick={() => handleWorkerRadiusChange(r)}
                        className={cn(
                          "py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border text-center select-none",
                          isSelected
                            ? "bg-amber-600 text-white border-amber-600 shadow-xs scale-105"
                            : "bg-white text-gray-700 border-gray-200 hover:border-amber-300 hover:bg-amber-50/50"
                        )}
                      >
                        {r}km
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Client Nearby Worker Search Radius Bar */}
            {theme.role === 'client' && (
              <div className="p-4 bg-teal-50/60 border-t border-teal-100 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-teal-950 flex items-center gap-1.5">
                    <Navigation className="w-4 h-4 text-teal-700" /> Nearby Worker Radius
                  </span>
                  <Badge variant="outline" className="border-teal-300 text-teal-800 bg-teal-100/60 text-xs font-bold px-2 py-0.5 rounded-full">
                    {clientRadius} km
                  </Badge>
                </div>

                {/* Radius Options Bar */}
                <div className="grid grid-cols-5 gap-1 pt-0.5">
                  {[5, 10, 15, 25, 50].map((r) => {
                    const isSelected = Number(clientRadius) === r;
                    return (
                      <button
                        key={r}
                        type="button"
                        onClick={() => handleClientRadiusChange(r)}
                        className={cn(
                          "py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border text-center select-none",
                          isSelected
                            ? "bg-teal-600 text-white border-teal-600 shadow-xs scale-105"
                            : "bg-white text-gray-700 border-gray-200 hover:border-teal-300 hover:bg-teal-50/50"
                        )}
                      >
                        {r}km
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>

      {isVerificationModalOpen && (
        <IdentityVerificationModal
          isOpen={isVerificationModalOpen}
          onClose={() => setIsVerificationModalOpen(false)}
          onVerified={(updatedUser) => {
            updateUser(updatedUser);
            setIsVerificationModalOpen(false);
            toast.success("Identity verified successfully! You will now appear in operations and chat.");
          }}
          role={user?.role}
        />
      )}
    </div>
  );
};

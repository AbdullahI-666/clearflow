import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { User, Mail, Phone, Shield, Lock, CheckCircle2, Loader2, KeyRound } from 'lucide-react';
import { useAuth } from '@/entities/user/hooks/useAuth';
import { apiClient } from '@/infrastructure/api/client';
import { ENDPOINTS } from '@/infrastructure/api/endpoints';
import { toast } from 'sonner';

export const ProfilePage = () => {
  const { user, login } = useAuth();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setPhone(user.phone || '');
    }
  }, [user]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const userId = user?._id || user?.id;
    if (!userId) return;

    setIsUpdatingProfile(true);
    try {
      const res = await apiClient.patch(ENDPOINTS.USERS.UPDATE(userId), {
        name: name.trim(),
        phone: phone.trim(),
      });

      if (res.data?.success && res.data?.data) {
        toast.success('Profile details updated successfully!');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const userId = user?._id || user?.id;
    if (!userId) return;

    if (!currentPassword) {
      toast.error('Please enter your current password');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('New password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    setIsChangingPassword(true);
    try {
      const res = await apiClient.patch(ENDPOINTS.USERS.UPDATE(userId), {
        currentPassword,
        newPassword,
      });

      if (res.data?.success) {
        toast.success('Password changed successfully!');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to change password');
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">User Profile</h1>
        <p className="text-gray-500 mt-1">Manage your account credentials, contact information, and security preferences.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Profile Card Summary */}
        <Card className="border-none shadow-sm bg-white overflow-hidden h-fit">
          <div className="bg-gradient-to-r from-teal-700 to-teal-800 p-6 text-white text-center">
            <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-md border-2 border-white/60 mx-auto flex items-center justify-center font-bold text-2xl mb-3 shadow-lg">
              {user?.name ? user.name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase() : 'U'}
            </div>
            <h2 className="font-bold text-lg">{user?.name || 'Authorized User'}</h2>
            <p className="text-teal-100 text-xs mt-0.5">{user?.email}</p>
            <div className="mt-3">
              <Badge className="bg-teal-500/80 text-white border-none text-xs px-2.5 py-0.5">
                {user?.role || 'Member'} Role
              </Badge>
            </div>
          </div>

          <CardContent className="p-5 space-y-4 text-xs text-gray-600">
            <div className="flex items-center justify-between py-2 border-b border-gray-50">
              <span className="flex items-center gap-2 text-gray-500">
                <Shield className="w-4 h-4 text-teal-600" /> Account Status
              </span>
              <span className="font-bold text-emerald-600 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Active & Verified
              </span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-50">
              <span className="flex items-center gap-2 text-gray-500">
                <Mail className="w-4 h-4 text-teal-600" /> Registered Email
              </span>
              <span className="font-medium text-gray-900">{user?.email}</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="flex items-center gap-2 text-gray-500">
                <Phone className="w-4 h-4 text-teal-600" /> Phone
              </span>
              <span className="font-medium text-gray-900">{user?.phone || 'Not provided'}</span>
            </div>
          </CardContent>
        </Card>

        {/* Edit Details & Security Tabs */}
        <div className="md:col-span-2 space-y-6">
          {/* Contact Details Form */}
          <Card className="border-none shadow-sm bg-white">
            <CardHeader>
              <CardTitle className="text-base text-gray-900 flex items-center gap-2">
                <User className="w-4 h-4 text-teal-600" /> Personal Information
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
                      placeholder="Your full name"
                      className="bg-gray-50/50"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-gray-700">Phone Number</Label>
                    <Input 
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+92 300 1234567"
                      className="bg-gray-50/50"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <Button 
                    type="submit" 
                    disabled={isUpdatingProfile}
                    className="bg-teal-600 hover:bg-teal-700 text-white cursor-pointer"
                  >
                    {isUpdatingProfile ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Save Profile Changes
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Security & Password Form */}
          <Card className="border-none shadow-sm bg-white">
            <CardHeader>
              <CardTitle className="text-base text-gray-900 flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-teal-600" /> Security & Password
              </CardTitle>
              <CardDescription>Ensure your account is using a secure password.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleChangePassword} className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-700">Current Password</Label>
                  <Input 
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                    className="bg-gray-50/50"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-gray-700">New Password</Label>
                    <Input 
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Minimum 6 characters"
                      className="bg-gray-50/50"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-gray-700">Confirm New Password</Label>
                    <Input 
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repeat new password"
                      className="bg-gray-50/50"
                      required
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <Button 
                    type="submit" 
                    disabled={isChangingPassword}
                    className="bg-teal-600 hover:bg-teal-700 text-white cursor-pointer"
                  >
                    {isChangingPassword ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Update Password
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

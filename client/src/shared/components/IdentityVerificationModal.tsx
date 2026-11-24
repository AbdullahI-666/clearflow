import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck, CheckCircle2, AlertCircle, User as UserIcon, Briefcase, FileText } from 'lucide-react';
import { apiClient } from '@/infrastructure/api/client';
import { useAuth } from '@/entities/user/hooks/useAuth';
import { toast } from 'sonner';

interface IdentityVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVerified?: (userData: any) => void;
  role?: 'Client' | 'FieldTeam' | string;
  sourceActionTitle?: string;
}

const WORKER_SKILLS = [
  'Electrical & HVAC',
  'Plumbing & Drainage',
  'Commercial Cleaning',
  'Pest Control & Fumigation',
  'General Waste & Disposal',
  'E-Waste & Recycling',
  'Carpentry & Masonry',
  'Facility Maintenance',
];

export const IdentityVerificationModal: React.FC<IdentityVerificationModalProps> = ({
  isOpen,
  onClose,
  onVerified,
  role: roleProp,
  sourceActionTitle,
}) => {
  const { user, updateUser } = useAuth();
  const roleStr = String(roleProp || user?.role || '').toLowerCase();
  const isAdmin = roleStr === 'admin';
  const isWorker = roleStr.includes('field') || roleStr.includes('worker');

  const [fullName, setFullName] = useState(user?.name || '');
  const [cnic, setCnic] = useState(user?.cnic || '');
  const [selectedSkills, setSelectedSkills] = useState<string[]>(
    user?.serviceCategories && user.serviceCategories.length > 0
      ? user.serviceCategories
      : ['Electrical & HVAC']
  );
  const [experienceYears, setExperienceYears] = useState(user?.experienceYears || '3');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Format CNIC as user types: XXXXX-XXXXXXX-X
  const handleCnicChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawDigits = e.target.value.replace(/\D/g, '').slice(0, 13);
    let formatted = rawDigits;
    if (rawDigits.length > 5 && rawDigits.length <= 12) {
      formatted = `${rawDigits.slice(0, 5)}-${rawDigits.slice(5)}`;
    } else if (rawDigits.length > 12) {
      formatted = `${rawDigits.slice(0, 5)}-${rawDigits.slice(5, 12)}-${rawDigits.slice(12, 13)}`;
    }
    setCnic(formatted);
    if (rawDigits.length === 13) {
      setErrorMessage('');
    }
  };

  const cnicDigits = cnic.replace(/\D/g, '');
  const isCnicValid = cnicDigits.length === 13;

  const toggleSkill = (skill: string) => {
    setSelectedSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!fullName.trim()) {
      setErrorMessage('Please enter your full legal name matching your government CNIC.');
      return;
    }

    if (!isCnicValid) {
      setErrorMessage('Please enter a valid 13-digit Pakistani CNIC number (format: XXXXX-XXXXXXX-X).');
      return;
    }

    if (isWorker && selectedSkills.length === 0) {
      setErrorMessage('Please select at least one operational skill category.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        name: fullName.trim(),
        cnic: cnic.trim(),
        phone: user?.phone || '',
        address: user?.address || '',
        city: user?.city || 'Lahore',
        serviceCategories: selectedSkills,
        experienceYears,
      };

      const res = await apiClient.post('/users/verify-identity', payload);
      const updatedData = res.data?.data || payload;

      // Update local auth context
      updateUser({
        name: fullName.trim(),
        cnic: cnic.trim(),
        cnicVerified: true,
        verificationStatus: 'Verified',
        serviceCategories: selectedSkills,
        experienceYears,
        isVerified: true,
      });

      toast.success('Identity verification successfully verified and saved!', {
        description: isAdmin
          ? 'Your administrator identity has been confirmed and verified.'
          : isWorker
          ? 'Your profile is approved. You can now accept field jobs.'
          : 'Your client identity has been verified. You can now create service requests.',
      });

      if (onVerified) {
        onVerified(updatedData);
      }
      onClose();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Identity verification failed. Please check details.';
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const themeColors = isAdmin
    ? {
        border: 'border-purple-200',
        badge: 'bg-purple-50 text-purple-800 border-purple-200',
        button: 'bg-purple-600 hover:bg-purple-700 text-white shadow-purple-500/25',
        iconBg: 'bg-purple-50 border-purple-200 text-purple-700',
        activePill: 'bg-purple-600 text-white border-purple-600',
        inactivePill: 'bg-purple-50 text-purple-800 border-purple-200 hover:bg-purple-100',
        validText: 'text-purple-600',
        validBorder: 'border-purple-500 focus-visible:ring-purple-400',
        focusRing: 'focus-visible:ring-purple-500 focus:ring-purple-500',
      }
    : isWorker
    ? {
        border: 'border-orange-200',
        badge: 'bg-orange-50 text-orange-800 border-orange-200',
        button: 'bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white shadow-orange-500/25',
        iconBg: 'bg-orange-50 border-orange-200 text-orange-600',
        activePill: 'bg-orange-600 text-white border-orange-600',
        inactivePill: 'bg-orange-50 text-orange-800 border-orange-200 hover:bg-orange-100',
        validText: 'text-orange-600',
        validBorder: 'border-orange-500 focus-visible:ring-orange-400',
        focusRing: 'focus-visible:ring-orange-500 focus:ring-orange-500',
      }
    : {
        border: 'border-teal-200',
        badge: 'bg-teal-50 text-teal-800 border-teal-200',
        button: 'bg-teal-600 hover:bg-teal-700 text-white shadow-teal-500/20',
        iconBg: 'bg-teal-50 border-teal-200 text-teal-700',
        activePill: 'bg-teal-600 text-white border-teal-600',
        inactivePill: 'bg-teal-50 text-teal-800 border-teal-200 hover:bg-teal-100',
        validText: 'text-emerald-600',
        validBorder: 'border-emerald-300 focus-visible:ring-emerald-400',
        focusRing: 'focus-visible:ring-teal-500 focus:ring-teal-500',
      };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto bg-white rounded-3xl p-6 shadow-2xl border border-gray-100">
        <DialogHeader className="space-y-2">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center shadow-xs ${themeColors.iconBg}`}>
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <DialogTitle className="text-lg font-bold text-gray-900 font-sidebar-title">
                  {isAdmin
                    ? 'Administrator Identity Verification'
                    : isWorker
                    ? 'Field Worker Identity Verification'
                    : 'Client Identity Verification'}
                </DialogTitle>
                <Badge variant="outline" className={`text-[10px] font-bold ${themeColors.badge}`}>
                  Required
                </Badge>
              </div>
              <DialogDescription className="text-xs text-gray-500 mt-0.5">
                {sourceActionTitle
                  ? `Required before ${sourceActionTitle}. Enter your government credentials to proceed.`
                  : isAdmin
                  ? 'Verify your national identity credentials as an authorized platform administrator.'
                  : isWorker
                  ? 'Verify your identity to accept jobs, receive task assignments, and collect payouts.'
                  : 'Verify your national identity before submitting your first facility service request.'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {errorMessage && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-xs text-rose-700">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Full Legal Name */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
              <UserIcon className="w-3.5 h-3.5 text-gray-400" />
              <span>Full Legal Name (as printed on CNIC)</span>
              <span className="text-rose-500">*</span>
            </Label>
            <Input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Muhammad Ahsan Tariq"
              className={`bg-white border-gray-200 text-sm rounded-xl focus-visible:ring-1 ${themeColors.focusRing}`}
              required
            />
          </div>

          {/* Pakistani 13-Digit CNIC */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-gray-400" />
                <span>Pakistani 13-Digit CNIC Number</span>
                <span className="text-rose-500">*</span>
              </Label>
              {isCnicValid && (
                <span className={`text-[11px] font-bold flex items-center gap-1 ${themeColors.validText}`}>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Valid Format
                </span>
              )}
            </div>
            <Input
              value={cnic}
              onChange={handleCnicChange}
              placeholder="35201-1234567-1"
              maxLength={15}
              className={`font-mono text-sm tracking-wider rounded-xl bg-white ${
                isCnicValid ? themeColors.validBorder : 'border-gray-200'
              }`}
              required
            />
            <p className="text-[11px] text-gray-400">
              Format: 5 digits - 7 digits - 1 digit (e.g., 35201-1234567-1). Masked in public directories for security.
            </p>
          </div>

          {/* Worker Specific: Skills & Experience */}
          {isWorker && (
            <div className="space-y-3 pt-2 border-t border-gray-100">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-700 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Briefcase className="w-3.5 h-3.5 text-gray-400" />
                    <span>Service Categories & Skills (Select all that apply)</span>
                    <span className="text-rose-500">*</span>
                  </span>
                  <span className="text-[10px] text-gray-400 font-normal">
                    {selectedSkills.length} selected
                  </span>
                </Label>
                <div className="flex flex-wrap gap-1.5">
                  {WORKER_SKILLS.map((skill) => {
                    const isSelected = selectedSkills.includes(skill);
                    return (
                      <button
                        key={skill}
                        type="button"
                        onClick={() => toggleSkill(skill)}
                        className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                          isSelected ? themeColors.activePill : themeColors.inactivePill
                        }`}
                      >
                        {skill}
                        {isSelected && ' ✓'}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-700">
                  Relevant Professional Experience
                </Label>
                <select
                  value={experienceYears}
                  onChange={(e) => setExperienceYears(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-gray-200 bg-white text-sm text-gray-800 outline-none focus:ring-1 focus:ring-amber-500"
                >
                  <option value="1">1 Year Experience</option>
                  <option value="2">2 Years Experience</option>
                  <option value="3">3-4 Years Field Experience</option>
                  <option value="5">5+ Years Senior Professional</option>
                  <option value="10">10+ Years Master Technician</option>
                </select>
              </div>
            </div>
          )}

          {/* Action Footer */}
          <div className="pt-4 flex items-center justify-end gap-2.5 border-t border-gray-100">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-xl text-xs h-10 px-4 cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !isCnicValid}
              className={`rounded-xl text-xs font-bold h-10 px-6 cursor-pointer shadow-sm ${themeColors.button}`}
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                  Saving Identity...
                </span>
              ) : (
                'Submit & Verify Identity'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

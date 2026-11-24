import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface TermsAndPrivacyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept: () => void;
  onReject: () => void;
  role?: 'admin' | 'fieldteam' | 'client' | string;
}

const THEME_STYLES = {
  admin: {
    banner: 'from-purple-600 via-purple-500 to-indigo-600',
    border: 'border-purple-500/30',
    glow: 'shadow-[0_0_35px_rgba(168,85,247,0.25)]',
    primaryBtn: 'bg-gradient-to-r from-purple-600 via-purple-500 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 shadow-purple-600/35 text-white',
    accentText: 'text-purple-300',
  },
  fieldteam: {
    banner: 'from-amber-500 via-amber-600 to-orange-600',
    border: 'border-amber-500/30',
    glow: 'shadow-[0_0_35px_rgba(245,158,11,0.25)]',
    primaryBtn: 'bg-gradient-to-r from-amber-500 via-amber-600 to-orange-600 hover:from-amber-400 hover:to-orange-500 shadow-amber-500/35 text-white',
    accentText: 'text-amber-300',
  },
  client: {
    banner: 'from-teal-500 via-emerald-500 to-teal-500',
    border: 'border-teal-500/30',
    glow: 'shadow-[0_0_35px_rgba(20,184,166,0.25)]',
    primaryBtn: 'bg-gradient-to-r from-teal-500 via-emerald-500 to-teal-500 hover:from-teal-400 hover:to-teal-400 shadow-teal-500/30 text-white',
    accentText: 'text-teal-300',
  },
};

const COMBINED_TERMS = [
  'By registering or accessing ClearFlow, you acknowledge and agree to comply with our digitized facility management rules, operational schedules, and digital service terms.',
  'All platform members (both clients and field personnel) must supply accurate, legitimate identification and contact information. Accounts are non-transferable and restricted to authorized operational use.',
  'Two-Factor Authentication (2FA) and cryptographic password encryption safeguard every account. Users are strictly responsible for maintaining credential secrecy and preventing unauthorized account sharing.',
  'Clients agree to guarantee hazard-free access to facilities during scheduled maintenance windows, while field technicians agree to uphold verified professional service standards and safety compliance during task execution.',
  'Live Radar and GPS perimeter tracking are active solely during active work shifts to facilitate real-time job matching, dispatching, and technician safety.',
  'Personal information, contact details, and facility addresses are encrypted in transit and at rest. ClearFlow never sells, rents, or licenses user or operational data to external advertisers.',
  'All service charges, work order estimates, and technician incentive points are calculated transparently with zero hidden deductions. Wallet rewards and payments are processed upon verified inspection sign-off.',
  'Submitting fraudulent work requests, fabricated completion photos, or attempting unauthorized system access is strictly prohibited and will result in immediate permanent account suspension.',
  'ClearFlow reserves the right to audit service compliance and update operational policies to ensure continuous safety, reliability, and platform excellence.'
];

export const TermsAndPrivacyModal: React.FC<TermsAndPrivacyModalProps> = ({
  isOpen,
  onClose,
  onAccept,
  onReject,
  role = 'client',
}) => {
  const normRole = (role || 'client').toLowerCase();
  const activeRole: 'admin' | 'fieldteam' | 'client' = 
    normRole === 'admin' ? 'admin' :
    normRole === 'fieldteam' || normRole === 'worker' || normRole === 'field' ? 'fieldteam' : 'client';

  const theme = THEME_STYLES[activeRole];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-y-auto touch-scroll safe-pt safe-pb">
          {/* Backdrop Blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity"
          />

          {/* Modal Dialog Surface */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className={cn(
              "relative w-full max-w-[calc(100vw-1.5rem)] sm:max-w-2xl bg-[#0e0f14]/95 border rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden z-10 flex flex-col max-h-[85vh] my-auto",
              theme.border,
              theme.glow
            )}
          >
            {/* Top Clean Header - Centered title without X button */}
            <div className={cn("px-5 py-3.5 sm:px-6 sm:py-4 bg-gradient-to-r text-white flex items-center justify-center shrink-0", theme.banner)}>
              <div className="flex items-center justify-center gap-2.5">
                <ShieldCheck className="w-5 h-5 text-white" />
                <span className="font-bold text-base sm:text-lg tracking-tight">Terms & Privacy Policy</span>
              </div>
            </div>

            {/* Structured Unified Policy List - Same for All Users */}
            <div className="flex-1 overflow-y-auto px-5 py-4 sm:px-6 sm:py-5 space-y-2 text-xs sm:text-[13px] text-white/80">
              <div className="p-3 rounded-xl bg-white/[0.04] border border-white/10 text-white/70 text-xs leading-relaxed mb-3">
                Please review these Terms and Conditions & Privacy Policy carefully before registering or using ClearFlow. By accepting below, you agree to comply with our service standards, security protocols, and operational policies.
              </div>

              <div className="space-y-2">
                {COMBINED_TERMS.map((term, index) => (
                  <div
                    key={index}
                    className="p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.05] border border-white/10 transition-colors flex items-start gap-3"
                  >
                    <div className={cn("w-5 h-5 rounded-full bg-white/5 border border-white/10 flex items-center justify-center shrink-0 mt-0.5 text-[11px] font-bold", theme.accentText)}>
                      {index + 1}
                    </div>
                    <p className="leading-relaxed text-white/85 text-xs sm:text-[13px]">
                      {term}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom Actions Bar with Accept & Back Buttons */}
            <div className="px-5 py-3.5 sm:px-6 sm:py-4 bg-[#0a0b0e] border-t border-white/10 flex items-center justify-between gap-3 shrink-0">
              <button
                type="button"
                onClick={onReject}
                className="px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl border border-white/20 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white font-semibold text-xs sm:text-sm transition-all cursor-pointer"
              >
                Back
              </button>

              <button
                type="button"
                onClick={onAccept}
                className={cn(
                  "px-5 py-2 sm:px-6 sm:py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-1.5 shadow-lg hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer",
                  theme.primaryBtn
                )}
              >
                <Check className="w-4 h-4" />
                <span>Accept</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default TermsAndPrivacyModal;

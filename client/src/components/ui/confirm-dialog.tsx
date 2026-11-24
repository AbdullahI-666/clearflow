import * as React from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';
import { Button } from './button';
import { AlertTriangle, X, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ConfirmDialogProps {
  open: boolean;
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'info';
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  title = 'Are you sure?',
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  isLoading = false,
  onConfirm,
  onCancel,
}) => {
  // Close on Escape key
  React.useEffect(() => {
    if (!open || isLoading) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, isLoading, onCancel]);

  if (typeof document === 'undefined') return null;

  const iconColor = variant === 'danger' ? 'text-red-600' : variant === 'warning' ? 'text-amber-600' : 'text-blue-600';
  const iconBg   = variant === 'danger' ? 'bg-red-50 border border-red-100' : variant === 'warning' ? 'bg-amber-50 border border-amber-100' : 'bg-blue-50 border border-blue-100';
  const confirmCls = variant === 'danger'
    ? 'bg-red-600 hover:bg-red-700 text-white shadow-md shadow-red-600/20'
    : variant === 'warning'
    ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-md shadow-amber-600/20'
    : 'bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/20';

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 safe-pt safe-pb"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/60 backdrop-blur-xs"
            onClick={isLoading ? undefined : onCancel}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* Dialog Container */}
          <motion.div
            className="relative bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-[calc(100vw-1.5rem)] sm:max-w-md max-h-[min(90dvh,calc(100vh-2rem))] overflow-y-auto touch-scroll z-10"
            initial={{ scale: 0.94, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.94, opacity: 0, y: 10 }}
            transition={{ type: 'spring', duration: 0.25, bounce: 0.15 }}
          >
            {/* Close button */}
            <button
              onClick={isLoading ? undefined : onCancel}
              disabled={isLoading}
              className="absolute top-4 right-4 p-1.5 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-50 cursor-pointer"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="p-4 sm:p-6">
              {/* Icon + Title */}
              <div className="flex items-start gap-3 sm:gap-4">
                <div className={cn('p-2.5 sm:p-3 rounded-2xl shrink-0', iconBg)}>
                  <AlertTriangle className={cn('w-5 h-5 sm:w-6 sm:h-6', iconColor)} />
                </div>
                <div className="flex-1 pt-0.5 pr-4">
                  <h3 className="text-sm sm:text-base font-bold text-gray-900 leading-snug">{title}</h3>
                  <p className="mt-1 sm:mt-1.5 text-xs sm:text-sm text-gray-600 leading-relaxed">{message}</p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-2.5 mt-5 sm:mt-6 pt-3 sm:pt-4 border-t border-gray-100">
                <Button
                  variant="outline"
                  type="button"
                  onClick={onCancel}
                  disabled={isLoading}
                  className="cursor-pointer border-gray-200 text-gray-700 hover:bg-gray-50 font-medium px-4 h-10 text-xs sm:text-sm rounded-xl w-full sm:w-auto"
                >
                  {cancelLabel}
                </Button>
                <Button
                  type="button"
                  onClick={onConfirm}
                  disabled={isLoading}
                  className={cn('cursor-pointer font-bold px-4 h-10 text-xs sm:text-sm rounded-xl flex items-center justify-center w-full sm:w-auto', confirmCls)}
                >
                  {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {confirmLabel}
                </Button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};

"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";

// --- TYPES ---
export type PaymentMethod = {
  id: string | number;
  icon: React.ReactNode;
  label: string;
  description: string;
};

export interface PaymentMethodSelectorProps {
  title: string;
  actionText?: string;
  methods: PaymentMethod[];
  defaultSelectedId?: string | number;
  onActionClick?: () => void;
  onSelectionChange?: (id: string | number) => void;
  className?: string;
  roleTheme?: "admin" | "fieldteam" | "client";
}

// --- HELPER COMPONENTS ---
const PlusIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="12" y1="5" x2="12" y2="19"></line>
    <line x1="5" y1="12" x2="19" y2="12"></line>
  </svg>
);

// --- MAIN COMPONENT ---
export function PaymentMethodSelector({
  title,
  actionText = "Add new method",
  methods,
  defaultSelectedId,
  onActionClick,
  onSelectionChange,
  className,
  roleTheme = "fieldteam",
}: PaymentMethodSelectorProps) {
  const [selectedId, setSelectedId] = React.useState(
    defaultSelectedId ?? (methods.length > 0 ? methods[0].id : null)
  );

  React.useEffect(() => {
    if (defaultSelectedId !== undefined) {
      setSelectedId(defaultSelectedId);
    }
  }, [defaultSelectedId]);

  const handleSelect = (id: string | number) => {
    setSelectedId(id);
    if (onSelectionChange) {
      onSelectionChange(id);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.08 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: { opacity: 1, y: 0 },
  };

  // Portal Theme Styles (Admin = Purple, Field = Orange, Client = Teal)
  const themeStyles = {
    admin: {
      activeBorder: "#9333ea",
      activeRing: "rgba(147, 51, 234, 0.2)",
      dotBg: "#9333ea",
      actionColor: "text-purple-600 hover:text-purple-700",
    },
    fieldteam: {
      activeBorder: "#ea580c",
      activeRing: "rgba(234, 88, 12, 0.2)",
      dotBg: "#ea580c",
      actionColor: "text-amber-700 hover:text-amber-800",
    },
    client: {
      activeBorder: "#0d9488",
      activeRing: "rgba(13, 148, 136, 0.2)",
      dotBg: "#0d9488",
      actionColor: "text-teal-700 hover:text-teal-800",
    },
  }[roleTheme || "fieldteam"];

  const cardClasses = `w-full max-w-md rounded-2xl border bg-white text-gray-900 shadow-sm p-5 sm:p-6 ${className || ""}`;

  return (
    <div className={cardClasses}>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-lg sm:text-xl font-bold leading-tight tracking-tight text-gray-900">
          {title}
        </h3>
        {actionText && (
          <button
            type="button"
            onClick={onActionClick}
            className={`flex items-center gap-1 text-xs font-semibold ${themeStyles.actionColor} transition-colors cursor-pointer`}
          >
            <PlusIcon className="w-3.5 h-3.5" />
            {actionText}
          </button>
        )}
      </div>

      {/* Payment Methods List */}
      <motion.div
        className="space-y-3"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        role="radiogroup"
      >
        {methods.map((method) => {
          const isSelected = selectedId === method.id;
          return (
            <motion.div
              key={method.id}
              variants={itemVariants}
              onClick={() => handleSelect(method.id)}
              onKeyDown={(e) => (e.key === " " || e.key === "Enter") && handleSelect(method.id)}
              className="flex items-center p-3.5 rounded-xl border cursor-pointer transition-all duration-200 bg-white hover:bg-gray-50/80 shadow-2xs"
              style={{
                borderColor: isSelected ? themeStyles.activeBorder : "#E2E8F0",
                boxShadow: isSelected
                  ? `0 0 0 2px ${themeStyles.activeBorder}, 0 4px 12px ${themeStyles.activeRing}`
                  : "none",
              }}
              role="radio"
              aria-checked={isSelected}
              tabIndex={0}
            >
              <div className="flex-shrink-0 flex items-center justify-center p-1 bg-gray-50 rounded-lg border border-gray-100 min-w-[56px] h-10">
                {method.icon}
              </div>
              <div className="ml-3.5 flex-grow">
                <p className="font-bold text-xs sm:text-sm text-gray-900">{method.label}</p>
                <p className="text-[11px] sm:text-xs text-gray-500 font-medium">{method.description}</p>
              </div>
              <div
                className="ml-3 flex h-5 w-5 items-center justify-center rounded-full border-2 transition-colors shrink-0"
                style={{
                  borderColor: isSelected ? themeStyles.activeBorder : "#CBD5E1",
                }}
              >
                <AnimatePresence>
                  {isSelected && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: themeStyles.dotBg }}
                    />
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
}

export default PaymentMethodSelector;

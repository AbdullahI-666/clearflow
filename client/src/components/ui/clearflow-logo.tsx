import React from 'react';
import { Leaf } from 'lucide-react';

interface ClearFlowLogoProps {
  className?: string;
  badgeSize?: number;
  textSize?: string;
  showText?: boolean;
  role?: string;
}

export function ClearFlowLogo({
  className = '',
  badgeSize = 38,
  textSize = 'text-2xl',
  showText = true,
  role,
}: ClearFlowLogoProps) {
  const iconSize = Math.round(badgeSize * 0.58);
  const normalizedRole = (role || '').toLowerCase();
  
  let badgeGradient = 'from-[#09B599] to-[#00A487]';
  if (normalizedRole === 'admin') {
    badgeGradient = 'from-purple-600 to-indigo-600';
  } else if (
    normalizedRole === 'fieldteam' || 
    normalizedRole === 'field_team' || 
    normalizedRole === 'field-team' || 
    normalizedRole === 'field' ||
    normalizedRole === 'worker'
  ) {
    badgeGradient = 'from-amber-500 to-orange-600';
  }

  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      {/* Official Leaf Badge */}
      <div
        className={`rounded-[11px] bg-gradient-to-br ${badgeGradient} flex items-center justify-center shadow-sm shrink-0 transition-transform hover:scale-105`}
        style={{ width: badgeSize, height: badgeSize }}
      >
        <Leaf
          className="text-white drop-shadow-sm"
          style={{ width: iconSize, height: iconSize }}
          strokeWidth={2.4}
        />
      </div>

      {/* ClearFlow Wordmark */}
      {showText && (
        <span
          className={`${textSize} font-extrabold text-[#0b1a2d] tracking-tight leading-none clearflow-brand-text`}
          style={{ fontFamily: "'Outfit', sans-serif" }}
        >
          ClearFlow
        </span>
      )}
    </div>
  );
}

export default ClearFlowLogo;

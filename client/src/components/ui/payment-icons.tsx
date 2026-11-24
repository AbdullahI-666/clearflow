import React, { useState } from 'react';

/**
 * High-fidelity Pakistani Payment Provider Logos (JazzCash, EasyPaisa, Visa / Mastercard, Raast / Bank)
 * Crisp transparent vectors and official assets that scale to fill their containers boldly and cleanly.
 */

// ─── 1. JAZZCASH LOGO (Official Yellow & Red Crescent Wings + Bold Typography) ───
export const JazzCashLogo: React.FC<{ className?: string; layout?: 'stacked' | 'horizontal' }> = ({
  className = "h-14 w-auto",
  layout = 'stacked',
}) => {
  const [imgError, setImgError] = useState(false);

  // If using the official raster asset and no error occurred, render with high clarity
  if (!imgError && layout === 'stacked') {
    return (
      <img
        src="/jazzcash-logo.png"
        alt="JazzCash"
        className={`object-contain transition-transform duration-200 ${className}`}
        onError={() => setImgError(true)}
      />
    );
  }

  // Crisp Vector implementation
  if (layout === 'stacked') {
    return (
      <svg viewBox="0 0 100 85" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
        <g transform="translate(18, 4)">
          {/* Yellow Left Wing/Crescent */}
          <path
            d="M32 3C18 3 8 13 8 28C8 44 20 56 36 56C30 50 26 40 26 28C26 16 28 8 32 3Z"
            fill="#FFB800"
          />
          {/* Red Right Crescent */}
          <path
            d="M35 7C44 13 50 23 50 35C50 47 44 57 35 63C51 63 63 51 63 35C63 19 51 7 35 7Z"
            fill="#E31837"
          />
        </g>
        <text
          x="50"
          y="78"
          textAnchor="middle"
          fill="#111827"
          fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
          fontWeight="900"
          fontSize="18"
          letterSpacing="-0.5px"
        >
          Jazz<tspan fontWeight="800">Cash</tspan>
        </text>
      </svg>
    );
  }

  // Horizontal layout for inline banners
  return (
    <svg viewBox="0 0 160 52" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <g transform="translate(4, 2)">
        <path
          d="M26 2C15 2 7 10 7 22C7 35 17 45 30 45C25 40 22 32 22 22C22 12 24 6 26 2Z"
          fill="#FFB800"
        />
        <path
          d="M28 5C35 10 40 18 40 28C40 38 35 46 28 51C41 51 51 41 51 28C51 15 41 5 28 5Z"
          fill="#E31837"
        />
      </g>
      <text
        x="64"
        y="35"
        fill="#111827"
        fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
        fontWeight="900"
        fontSize="24"
        letterSpacing="-0.6px"
      >
        Jazz<tspan fontWeight="800">Cash</tspan>
      </text>
    </svg>
  );
};

// Compact Icon Mark for small chips/headers
export const JazzCashMark: React.FC<{ className?: string }> = ({ className = "h-8 w-8" }) => (
  <svg viewBox="0 0 64 64" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M30 4C16 4 6 15 6 30C6 46 18 58 34 58C28 52 24 42 24 30C24 18 26 9 30 4Z"
      fill="#FFB800"
    />
    <path
      d="M32 8C40 14 46 24 46 36C46 48 40 58 32 64C48 64 60 52 60 36C60 20 48 8 32 8Z"
      fill="#E31837"
    />
  </svg>
);

// ─── 2. EASYPAISA LOGO (Official Vibrant Green 'e' Swirl + Bold Typography) ───
export const EasypaisaLogo: React.FC<{ className?: string; layout?: 'stacked' | 'horizontal' }> = ({
  className = "h-14 w-auto",
  layout = 'stacked',
}) => {
  const [imgError, setImgError] = useState(false);

  if (!imgError) {
    return (
      <img
        src="/easypaisa-logo.png"
        alt="Easypaisa"
        className={`object-contain transition-transform duration-200 ${className}`}
        onError={() => setImgError(true)}
      />
    );
  }

  if (layout === 'stacked') {
    return (
      <svg viewBox="0 0 110 85" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Large Green Swirl 'e' Mark */}
        <g transform="translate(30, 2)">
          <circle cx="25" cy="25" r="24" fill="#00C365" />
          <path
            d="M25 8C16 8 9 15 9 24C9 27 10 30 11.5 32.5C13 29 16.5 26.5 20.5 26.5H29.5C33.5 26.5 37 29 38.5 32.5C40 30 41 27 41 24C41 15 34 8 25 8Z"
            fill="#FFFFFF"
          />
          <ellipse cx="25" cy="18" rx="8" ry="6" fill="#00C365" />
          <path
            d="M12 33C15 39 21.5 43 28 41.8C33.5 40.8 37.8 37 39.5 31.5C36.5 34 32 35.8 26 35.8C20 35.8 14.8 34.8 12 33Z"
            fill="#0F172A"
          />
        </g>
        <text
          x="55"
          y="78"
          textAnchor="middle"
          fill="#0F172A"
          fontFamily="system-ui, -apple-system, sans-serif"
          fontWeight="900"
          fontSize="17"
          letterSpacing="-0.5px"
        >
          easy<tspan fill="#00C365">paisa</tspan>
        </text>
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 170 52" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <g transform="translate(4, 4)">
        <circle cx="22" cy="22" r="22" fill="#00C365" />
        <path
          d="M22 6C14 6 7.5 12.5 7.5 20.5C7.5 23 8.2 25.4 9.3 27.4C10.4 24.4 13.3 22.2 16.8 22.2H27.2C30.7 22.2 33.6 24.4 34.7 27.4C35.8 25.4 36.5 23 36.5 20.5C36.5 12.5 30 6 22 6Z"
          fill="#FFFFFF"
        />
        <ellipse cx="22" cy="15" rx="7" ry="5" fill="#00C365" />
        <path
          d="M9.8 27.8C12.5 33.5 18.5 37 25 35.8C30.2 34.8 34.2 31.2 35.6 26.2C33 28.5 29.2 30 23.5 30C17.8 30 12.6 29.2 9.8 27.8Z"
          fill="#0F172A"
        />
      </g>
      <text
        x="56"
        y="33"
        fill="#0F172A"
        fontFamily="system-ui, -apple-system, sans-serif"
        fontWeight="900"
        fontSize="24"
        letterSpacing="-0.6px"
      >
        easy<tspan fill="#00C365">paisa</tspan>
      </text>
    </svg>
  );
};

// ─── 3. VISA / MASTERCARD LOGO (100% Transparent Vector - Pure White Contrast, No Gray Box) ───
export const VisaMastercardLogo: React.FC<{ className?: string }> = ({ className = "h-14 w-auto" }) => {
  const [imgError, setImgError] = useState(false);

  if (!imgError) {
    return (
      <img
        src="/visa-mastercard-logo.png"
        alt="Visa / Mastercard"
        className={`object-contain transition-transform duration-200 ${className}`}
        onError={() => setImgError(true)}
      />
    );
  }

  return (
    <svg viewBox="0 0 170 56" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* VISA Section */}
      <g transform="translate(6, 12)">
        <text
          x="0"
          y="26"
          fill="#1A1F71"
          fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
          fontWeight="900"
          fontSize="30"
          fontStyle="italic"
          letterSpacing="-1px"
        >
          VISA
        </text>
      </g>

      {/* Clean Sleek Divider */}
      <line x1="82" y1="8" x2="82" y2="48" stroke="#E2E8F0" strokeWidth="2" strokeLinecap="round" />

      {/* Mastercard Interlocking Circles */}
      <g transform="translate(94, 6)">
        <circle cx="18" cy="20" r="17" fill="#EB001B" />
        <circle cx="38" cy="20" r="17" fill="#F79E1B" fillOpacity="0.95" />
        <path
          d="M28 7.5a16.96 16.96 0 0 1 5.7 12.5c0 4.9-2.1 9.4-5.7 12.5a16.96 16.96 0 0 1-5.7-12.5c0-4.9 2.1-9.4 5.7-12.5z"
          fill="#FF5F00"
        />
        <text
          x="28"
          y="45"
          textAnchor="middle"
          fill="#1E293B"
          fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
          fontWeight="800"
          fontSize="9.5"
          letterSpacing="-0.3px"
        >
          mastercard
        </text>
      </g>
    </svg>
  );
};

// ─── 4. RAAST / PAKISTANI BANK TRANSFER LOGO (State Bank of Pakistan Instant Network) ───
export const RaastBankLogo: React.FC<{ className?: string; layout?: 'stacked' | 'horizontal' }> = ({
  className = "h-14 w-auto",
  layout = 'stacked',
}) => {
  if (layout === 'stacked') {
    return (
      <svg viewBox="0 0 110 85" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Raast Emerald & Orange Mark with Bank Symbol */}
        <g transform="translate(30, 2)">
          {/* Outer circle accent */}
          <rect x="0" y="0" width="50" height="50" rx="14" fill="#ECFDF5" stroke="#A7F3D0" strokeWidth="1.5" />
          {/* Classical bank pillars / vault motif in Emerald */}
          <path
            d="M25 10L12 18V20H38V18L25 10Z"
            fill="#059669"
          />
          <rect x="15" y="22" width="4" height="12" rx="1" fill="#059669" />
          <rect x="23" y="22" width="4" height="12" rx="1" fill="#D97706" />
          <rect x="31" y="22" width="4" height="12" rx="1" fill="#059669" />
          <rect x="11" y="35" width="28" height="4" rx="1" fill="#059669" />
          {/* Instant lightning / speed dot */}
          <circle cx="37" cy="13" r="4" fill="#F59E0B" />
        </g>
        <text
          x="55"
          y="73"
          textAnchor="middle"
          fill="#065F46"
          fontFamily="system-ui, -apple-system, sans-serif"
          fontWeight="900"
          fontSize="15"
          letterSpacing="-0.3px"
        >
          Bank / <tspan fill="#D97706">Raast</tspan>
        </text>
        <text
          x="55"
          y="84"
          textAnchor="middle"
          fill="#6B7280"
          fontFamily="system-ui, -apple-system, sans-serif"
          fontWeight="600"
          fontSize="9"
        >
          Instant IBAN Transfer
        </text>
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 170 52" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <g transform="translate(4, 4)">
        <rect x="0" y="0" width="44" height="44" rx="12" fill="#ECFDF5" stroke="#A7F3D0" strokeWidth="1.5" />
        <path d="M22 8L10 16V18H34V16L22 8Z" fill="#059669" />
        <rect x="13" y="20" width="3.5" height="11" rx="0.8" fill="#059669" />
        <rect x="20.2" y="20" width="3.5" height="11" rx="0.8" fill="#D97706" />
        <rect x="27.5" y="20" width="3.5" height="11" rx="0.8" fill="#059669" />
        <rect x="9" y="32" width="26" height="3.5" rx="0.8" fill="#059669" />
        <circle cx="33" cy="11" r="3.5" fill="#F59E0B" />
      </g>
      <text
        x="56"
        y="28"
        fill="#065F46"
        fontFamily="system-ui, -apple-system, sans-serif"
        fontWeight="900"
        fontSize="18"
        letterSpacing="-0.4px"
      >
        Bank / <tspan fill="#D97706">Raast</tspan>
      </text>
      <text
        x="56"
        y="42"
        fill="#6B7280"
        fontFamily="system-ui, -apple-system, sans-serif"
        fontWeight="600"
        fontSize="11"
      >
        Instant IBAN Deposit
      </text>
    </svg>
  );
};

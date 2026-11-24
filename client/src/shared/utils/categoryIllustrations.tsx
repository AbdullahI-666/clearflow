import React from 'react';

// =======================================================================
// PASTEL SQUIRCLE ILLUSTRATIVE CATEGORY LOGOS
// Styled after cute, soft claymorphic / pastel line-art iconography
// =======================================================================

export interface IllustrationProps {
  className?: string;
}

/** 1. Cleaning & Janitorial (Broom & Sparkles) */
export const CleaningIllustration: React.FC<IllustrationProps> = ({ className = "w-full h-full" }) => (
  <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    {/* Soap Bubbles */}
    <circle cx="8" cy="28" r="3.2" fill="#e0f2fe" stroke="#38bdf8" strokeWidth="2" />
    <circle cx="6" cy="20" r="1.8" fill="#e0f2fe" stroke="#38bdf8" strokeWidth="1.6" />
    <circle cx="13" cy="37" r="2.2" fill="#e0f2fe" stroke="#38bdf8" strokeWidth="1.8" />
    
    {/* Broom Handle */}
    <line x1="37" y1="8" x2="25" y2="23" stroke="#854d0e" strokeWidth="3" strokeLinecap="round" />
    
    {/* Broom Bristles Base */}
    <path
      d="M23 21 L30 26 L26 38 C26 38 18 41 12 34 C8 29 16 22 23 21 Z"
      fill="#fde047"
      stroke="#854d0e"
      strokeWidth="2.5"
      strokeLinejoin="round"
    />
    
    {/* Bristle Straw Lines */}
    <line x1="16" y1="31" x2="19" y2="38" stroke="#ca8a04" strokeWidth="2" strokeLinecap="round" />
    <line x1="21" y1="28" x2="23" y2="37" stroke="#ca8a04" strokeWidth="2" strokeLinecap="round" />
    
    {/* Broom Band */}
    <rect
      x="21"
      y="22"
      width="8"
      height="3.5"
      rx="1"
      transform="rotate(-38 25 23.75)"
      fill="#b45309"
      stroke="#854d0e"
      strokeWidth="1.5"
    />
    
    {/* Main Twinkling Sparkle Star */}
    <path
      d="M16 6 Q16 14 8 14 Q16 14 16 22 Q16 14 24 14 Q16 14 16 6 Z"
      fill="#bae6fd"
      stroke="#0284c7"
      strokeWidth="2.2"
      strokeLinejoin="round"
    />
    <circle cx="16" cy="14" r="1.2" fill="#0284c7" />

    {/* Small Sparkle Star */}
    <path
      d="M32 5 Q32 9 28 9 Q32 9 32 13 Q32 9 36 9 Q32 9 32 5 Z"
      fill="#93c5fd"
      stroke="#0284c7"
      strokeWidth="1.8"
      strokeLinejoin="round"
    />
  </svg>
);

/** 2. Electrical & Power (Smiling Lightning Bolt) */
export const ElectricalIllustration: React.FC<IllustrationProps> = ({ className = "w-full h-full" }) => (
  <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    {/* Lightning Bolt */}
    <path
      d="M27 6 L12 25 L23 25 L18 42 L36 20 L24 20 L27 6 Z"
      fill="#fef08a"
      stroke="#854d0e"
      strokeWidth="2.8"
      strokeLinejoin="round"
    />
    {/* Kawaii Face */}
    <circle cx="21" cy="21" r="1.6" fill="#713f12" />
    <circle cx="26" cy="21" r="1.6" fill="#713f12" />
    <path d="M22 24 Q23.5 26.5 25 24" stroke="#713f12" strokeWidth="1.8" strokeLinecap="round" fill="none" />
  </svg>
);

/** 3. Plumbing & Hydraulics (Water Teardrop) */
export const PlumbingIllustration: React.FC<IllustrationProps> = ({ className = "w-full h-full" }) => (
  <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    {/* Plump Droplet Body */}
    <path
      d="M24 7 C24 7 11 20 11 29 C11 36.5 16.8 42 24 42 C31.2 42 37 36.5 37 29 C37 20 24 7 24 7 Z"
      fill="#7dd3fc"
      stroke="#0369a1"
      strokeWidth="2.8"
      strokeLinejoin="round"
    />
    {/* Inner Soft Gradient Ring */}
    <path
      d="M24 13 C24 13 15 23 15 29 C15 34.5 19 38.5 24 38.5"
      stroke="#bae6fd"
      strokeWidth="2.6"
      strokeLinecap="round"
      fill="none"
    />
    {/* Top-Left Glossy Sheen */}
    <ellipse cx="19" cy="24" rx="2.5" ry="5" transform="rotate(-25 19 24)" fill="#ffffff" opacity="0.85" />
  </svg>
);

/** 4. Waste Management & Refuse (Ribbed Trash Can) */
export const WasteIllustration: React.FC<IllustrationProps> = ({ className = "w-full h-full" }) => (
  <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    {/* Can Body */}
    <path
      d="M12 17 L15 41 C15 42.5 16.5 43 18 43 L30 43 C31.5 43 33 42.5 33 41 L36 17 Z"
      fill="#fda4af"
      stroke="#9f1239"
      strokeWidth="2.6"
      strokeLinejoin="round"
    />
    {/* Can Ribs */}
    <line x1="20" y1="23" x2="20.5" y2="37" stroke="#9f1239" strokeWidth="2.4" strokeLinecap="round" />
    <line x1="24" y1="23" x2="24" y2="37" stroke="#9f1239" strokeWidth="2.4" strokeLinecap="round" />
    <line x1="28" y1="23" x2="27.5" y2="37" stroke="#9f1239" strokeWidth="2.4" strokeLinecap="round" />
    
    {/* Flared Lid */}
    <path
      d="M9 16 C9 14.5 10.5 14 12 14 L36 14 C37.5 14 39 14.5 39 16 L38 18 L10 18 Z"
      fill="#fb7185"
      stroke="#9f1239"
      strokeWidth="2.6"
      strokeLinejoin="round"
    />
    {/* Lid Handle */}
    <path
      d="M20 14 V11 C20 9.8 21 9 22 9 H26 C27 9 28 9.8 28 11 V14"
      stroke="#9f1239"
      strokeWidth="2.6"
      strokeLinecap="round"
      fill="none"
    />
    {/* Floating Paper / Trash Particles */}
    <rect x="15" y="6" width="3.2" height="3.2" rx="0.8" transform="rotate(18 16.5 7.5)" fill="#f43f5e" stroke="#9f1239" strokeWidth="1.5" />
    <circle cx="24" cy="5" r="1.8" fill="#f43f5e" stroke="#9f1239" strokeWidth="1.5" />
    <polygon points="32,7 34.5,11 29.5,11" fill="#f43f5e" stroke="#9f1239" strokeWidth="1.5" />
  </svg>
);

/** 5. Pest & Termite Control (Cute Magenta Beetle) */
export const PestIllustration: React.FC<IllustrationProps> = ({ className = "w-full h-full" }) => (
  <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    {/* Antennae */}
    <path d="M21 13 Q18 7 13 8" stroke="#701a75" strokeWidth="2.4" strokeLinecap="round" fill="none" />
    <path d="M27 13 Q30 7 35 8" stroke="#701a75" strokeWidth="2.4" strokeLinecap="round" fill="none" />
    <circle cx="13" cy="8" r="1.5" fill="#701a75" />
    <circle cx="35" cy="8" r="1.5" fill="#701a75" />
    
    {/* Legs */}
    <path d="M12 21 L6 20 M11 28 L5 29 M13 35 L7 38" stroke="#701a75" strokeWidth="2.5" strokeLinecap="round" />
    <path d="M36 21 L42 20 M37 28 L43 29 M35 35 L41 38" stroke="#701a75" strokeWidth="2.5" strokeLinecap="round" />
    
    {/* Head */}
    <path d="M18 17 C18 13.5 21 12 24 12 C27 12 30 13.5 30 17 Z" fill="#86198f" stroke="#701a75" strokeWidth="2.5" />
    
    {/* Beetle Shell Body */}
    <ellipse cx="24" cy="29" rx="13" ry="14" fill="#f472b6" stroke="#701a75" strokeWidth="2.8" />
    
    {/* Wing Split Line */}
    <line x1="24" y1="17" x2="24" y2="43" stroke="#701a75" strokeWidth="2.5" />
    
    {/* Spots */}
    <circle cx="18" cy="27" r="2.2" fill="#86198f" />
    <circle cx="30" cy="27" r="2.2" fill="#86198f" />
    <circle cx="19" cy="35" r="1.8" fill="#86198f" />
    <circle cx="29" cy="35" r="1.8" fill="#86198f" />
  </svg>
);

/** 6. Gardening & Landscaping (Cute Smiling Leaf) */
export const LeafIllustration: React.FC<IllustrationProps> = ({ className = "w-full h-full" }) => (
  <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    {/* Leaf Stem */}
    <path d="M14 39 C14 39 18 37 21 32" stroke="#14532d" strokeWidth="3" strokeLinecap="round" fill="none" />
    
    {/* Plump Leaf Body */}
    <path
      d="M21 32 C13 31 10 22 14 14 C18 6 32 6 38 10 C42 16 42 28 32 34 C27 37 23 35 21 32 Z"
      fill="#86efac"
      stroke="#14532d"
      strokeWidth="2.8"
      strokeLinejoin="round"
    />
    
    {/* Vein */}
    <path d="M21 32 Q26 24 36 12" stroke="#14532d" strokeWidth="2.2" strokeLinecap="round" fill="none" />
    
    {/* Kawaii Face */}
    <circle cx="24" cy="20" r="1.6" fill="#14532d" />
    <circle cx="31" cy="21" r="1.6" fill="#14532d" />
    <path d="M26 24 Q28 27 30 24" stroke="#14532d" strokeWidth="1.8" strokeLinecap="round" fill="none" />
  </svg>
);

/** 7. E-Waste & IT (Desktop Monitor & Smartphone) */
export const TechIllustration: React.FC<IllustrationProps> = ({ className = "w-full h-full" }) => (
  <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    {/* Computer Monitor */}
    <rect x="7" y="10" width="26" height="19" rx="3.5" fill="#e9d5ff" stroke="#581c87" strokeWidth="2.6" />
    <rect x="10" y="13" width="20" height="13" rx="1.5" fill="#faf5ff" stroke="#7e22ce" strokeWidth="1.6" />
    <path d="M20 29 V34 M15 34 H25" stroke="#581c87" strokeWidth="2.6" strokeLinecap="round" />
    
    {/* Standing Smartphone */}
    <rect x="29" y="19" width="12" height="19" rx="2.5" fill="#d8b4fe" stroke="#581c87" strokeWidth="2.5" />
    <rect x="31" y="22" width="8" height="12" rx="1" fill="#ffffff" />
    <line x1="33" y1="35.5" x2="37" y2="35.5" stroke="#581c87" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

/** 8. Sanitation & Water Flow (Wave & Droplets) */
export const SanitationIllustration: React.FC<IllustrationProps> = ({ className = "w-full h-full" }) => (
  <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    {/* Sweeping Wave */}
    <path
      d="M8 35 C13 35 15 31 18 29 C22 26 27 25 31 28 C35 31 38 34 42 34 C42 34 39 41 29 41 C19 41 12 37 8 35 Z"
      fill="#67e8f9"
      stroke="#0e7490"
      strokeWidth="2.6"
      strokeLinejoin="round"
    />
    <path
      d="M28 26 C33 28 37 32 40 31 C40 28 35 24 30 25 Z"
      fill="#a5f3fc"
      stroke="#0e7490"
      strokeWidth="2"
      strokeLinejoin="round"
    />
    
    {/* Big Splashing Droplet */}
    <path
      d="M20 10 C20 10 13 18 13 22 C13 26 16 29 20 29 C24 29 27 26 27 22 C27 18 20 10 20 10 Z"
      fill="#38bdf8"
      stroke="#0369a1"
      strokeWidth="2.5"
      strokeLinejoin="round"
    />
    
    {/* Small Splashing Droplet */}
    <path
      d="M33 11 C33 11 29 16 29 19 C29 21.5 31 23.5 33 23.5 C35 23.5 37 21.5 37 19 C37 16 33 11 33 11 Z"
      fill="#7dd3fc"
      stroke="#0369a1"
      strokeWidth="2"
      strokeLinejoin="round"
    />
  </svg>
);

/** 9. HVAC & Climate Control (Spinning Fan & Breeze) */
export const HvacIllustration: React.FC<IllustrationProps> = ({ className = "w-full h-full" }) => (
  <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    {/* Central Hub */}
    <circle cx="24" cy="24" r="3.5" fill="#0d9488" stroke="#134e4a" strokeWidth="2.5" />
    
    {/* 4 Fan Blades */}
    <path d="M24 20.5 C24 14 18 10 14 14 C12 16 14 21 21 21.5" fill="#5eead4" stroke="#134e4a" strokeWidth="2.4" strokeLinejoin="round" />
    <path d="M27.5 24 C34 24 38 18 34 14 C32 12 27 14 26.5 21" fill="#5eead4" stroke="#134e4a" strokeWidth="2.4" strokeLinejoin="round" />
    <path d="M24 27.5 C24 34 30 38 34 34 C36 32 34 27 27 26.5" fill="#5eead4" stroke="#134e4a" strokeWidth="2.4" strokeLinejoin="round" />
    <path d="M20.5 24 C14 24 10 30 14 34 C16 36 21 34 21.5 27" fill="#5eead4" stroke="#134e4a" strokeWidth="2.4" strokeLinejoin="round" />
    
    {/* Wind Airflow Lines */}
    <path d="M7 17 C6 13 9 9 12 8" stroke="#0f766e" strokeWidth="2" strokeLinecap="round" fill="none" />
    <path d="M39 9 C42 12 43 16 41 19" stroke="#0f766e" strokeWidth="2" strokeLinecap="round" fill="none" />
    <path d="M41 31 C42 35 39 39 36 40" stroke="#0f766e" strokeWidth="2" strokeLinecap="round" fill="none" />
    <path d="M9 39 C6 36 5 32 7 29" stroke="#0f766e" strokeWidth="2" strokeLinecap="round" fill="none" />
  </svg>
);

/** 10. Fire Safety & Heating (Warm Fire Flame) */
export const FlameIllustration: React.FC<IllustrationProps> = ({ className = "w-full h-full" }) => (
  <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    {/* Outer Orange Flame */}
    <path
      d="M24 7 C27 13 31 16 34 21 C38 27 38 34 34 39 C30 43 23 44 18 41 C13 38 10 32 12 26 C13 22 16 19 19 18 C18 22 20 25 23 25 C24 22 24 18 22 15 C21 13 22 9 24 7 Z"
      fill="#fb923c"
      stroke="#9a3412"
      strokeWidth="2.8"
      strokeLinejoin="round"
    />
    {/* Inner Yellow Core Flame */}
    <path
      d="M24 23 C26 27 28 29 29 32 C30 36 29 39 26 40 C23 41 20 39 19 37 C18 35 18 33 20 31 C21 32 22 33 24 33 C25 31 25 29 23 27 C22 26 23 24 24 23 Z"
      fill="#fef08a"
      stroke="#ca8a04"
      strokeWidth="2"
      strokeLinejoin="round"
    />
  </svg>
);

/** 11. Recycling Stream (Looping Arrows - High-Contrast 3D Emerald/Forest Green) */
export const RecyclingIllustration: React.FC<IllustrationProps> = ({ className = "w-full h-full" }) => (
  <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    {/* Shadow / Depth layer */}
    <g fill="#14532d" opacity="0.15">
      <path d="M22 8 L29 14 L25 14 C25 19 27 22 30 25 L27 28 C23 24 21 19 21 14 L17 14 Z" />
      <path d="M39 28 L37 36 L34 34 C30 37 26 37 21 35 L22 31 C26 33 29 32 32 30 L29 28 Z" />
      <path d="M13 38 L11 30 L15 31 C18 27 20 24 22 20 L26 22 C24 27 21 30 18 34 L21 35 Z" />
    </g>

    {/* Primary Rich Green Arrows with crisp dark stroke */}
    <g fill="#16a34a" stroke="#0f3d0e" strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round">
      {/* Top arrow */}
      <path d="M21 7 L28 13 L24 13 C24 18 26 21 29 24 L26 27 C22 23 20 18 20 13 L16 13 Z" />
      {/* Bottom-right arrow */}
      <path d="M38 27 L36 35 L33 33 C29 36 25 36 20 34 L21 30 C25 32 28 31 31 29 L28 27 Z" />
      {/* Bottom-left arrow */}
      <path d="M12 37 L10 29 L14 30 C17 26 19 23 21 19 L25 21 C23 26 20 29 17 33 L20 34 Z" />
    </g>

    {/* Subtle highlight sheen on arrow folds */}
    <g fill="#4ade80" opacity="0.45">
      <path d="M21 7 L25 10 L23 10 C23 14 24 17 26 19 L25 20 C22 17 21 14 21 10 L18 10 Z" />
      <path d="M38 27 L36 32 L34 31 C32 32 29 33 26 33 L26 31 C29 31 31 30 33 29 L31 28 Z" />
      <path d="M12 37 L11 32 L13 33 C15 30 17 27 18 24 L20 25 C19 28 17 31 15 34 L17 35 Z" />
    </g>
  </svg>
);

/** 12. Mechanical & Tooling (Toolbox with Gear & Wrench) */
export const ToolingIllustration: React.FC<IllustrationProps> = ({ className = "w-full h-full" }) => (
  <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    {/* Toolbox Body */}
    <rect x="8" y="18" width="32" height="23" rx="4" fill="#cbd5e1" stroke="#334155" strokeWidth="2.8" />
    <path d="M18 18 V12 C18 10.5 19.5 9 21 9 H27 C28.5 9 30 10.5 30 12 V18" fill="none" stroke="#334155" strokeWidth="2.8" strokeLinecap="round" />
    <line x1="8" y1="26" x2="40" y2="26" stroke="#334155" strokeWidth="2" />
    
    {/* Central Gear */}
    <circle cx="24" cy="33" r="6" fill="#94a3b8" stroke="#334155" strokeWidth="2.2" />
    <circle cx="24" cy="33" r="2.5" fill="#f1f5f9" stroke="#334155" strokeWidth="1.8" />
    <path d="M24 25.5 V27 M24 39 V40.5 M16.5 33 H18 M30 33 H31.5" stroke="#334155" strokeWidth="2.2" strokeLinecap="round" />
    
    {/* Wrench Angled */}
    <path d="M28 20 L37 29 M34 17 L38 21" stroke="#475569" strokeWidth="3" strokeLinecap="round" />
  </svg>
);

/** 13. Security & Access Control (Shield with Lock) */
export const SecurityIllustration: React.FC<IllustrationProps> = ({ className = "w-full h-full" }) => (
  <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path
      d="M24 7 L37 12 V23 C37 32 31 39 24 42 C17 39 11 32 11 23 V12 L24 7 Z"
      fill="#93c5fd"
      stroke="#1e3a8a"
      strokeWidth="2.8"
      strokeLinejoin="round"
    />
    <path d="M24 13 L33 17 V24 C33 30 29 35 24 37 C19 35 15 30 15 24 V17 L24 13 Z" fill="#bfdbfe" opacity="0.6" />
    {/* Keyhole / Checkmark */}
    <path d="M19 24 L23 28 L29 20" stroke="#1e3a8a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/** 14. CCTV & Surveillance (Security Camera) */
export const CctvIllustration: React.FC<IllustrationProps> = ({ className = "w-full h-full" }) => (
  <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M12 9 H20 M16 9 V17" stroke="#581c87" strokeWidth="2.8" strokeLinecap="round" />
    <path d="M14 23 L28 15 L38 21 L24 29 Z" fill="#c084fc" stroke="#581c87" strokeWidth="2.6" strokeLinejoin="round" />
    <path d="M38 21 L43 18 V26 L38 23" fill="#e9d5ff" stroke="#581c87" strokeWidth="2.4" strokeLinejoin="round" />
    <circle cx="24" cy="29" r="4.5" fill="#7e22ce" stroke="#581c87" strokeWidth="2" />
    <circle cx="24" cy="29" r="2" fill="#38bdf8" />
  </svg>
);

/** 15. Painting & Finishing (Paintbrush with Drip) */
export const PaintingIllustration: React.FC<IllustrationProps> = ({ className = "w-full h-full" }) => (
  <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <line x1="36" y1="8" x2="26" y2="20" stroke="#831843" strokeWidth="3.2" strokeLinecap="round" />
    <rect x="23" y="19" width="9" height="5" rx="1.5" transform="rotate(-40 27.5 21.5)" fill="#e2e8f0" stroke="#831843" strokeWidth="2" />
    <path d="M22 23 L27 27 L20 37 C18 39 14 38 13 36 C12 34 13 31 16 29 Z" fill="#f472b6" stroke="#831843" strokeWidth="2.6" strokeLinejoin="round" />
    <circle cx="12" cy="40" r="2" fill="#ec4899" stroke="#831843" strokeWidth="1.6" />
    <circle cx="17" cy="42" r="1.2" fill="#ec4899" />
  </svg>
);

/** 16. Carpentry & Woodwork (Hammer & Wood) */
export const CarpentryIllustration: React.FC<IllustrationProps> = ({ className = "w-full h-full" }) => (
  <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <line x1="17" y1="38" x2="31" y2="20" stroke="#78350f" strokeWidth="3.5" strokeLinecap="round" />
    <path d="M25 15 L34 8 L39 12 L33 19 L36 23 L32 26 L29 22 Z" fill="#94a3b8" stroke="#1e293b" strokeWidth="2.6" strokeLinejoin="round" />
    <line x1="10" y1="35" x2="22" y2="43" stroke="#b45309" strokeWidth="2.8" strokeLinecap="round" />
  </svg>
);

/** 17. Solar & Renewable Power (Smiling Sun) */
export const SolarIllustration: React.FC<IllustrationProps> = ({ className = "w-full h-full" }) => (
  <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <circle cx="24" cy="24" r="11" fill="#fde047" stroke="#854d0e" strokeWidth="2.8" />
    {/* Sunrays */}
    <line x1="24" y1="6" x2="24" y2="9" stroke="#854d0e" strokeWidth="2.8" strokeLinecap="round" />
    <line x1="24" y1="39" x2="24" y2="42" stroke="#854d0e" strokeWidth="2.8" strokeLinecap="round" />
    <line x1="6" y1="24" x2="9" y2="24" stroke="#854d0e" strokeWidth="2.8" strokeLinecap="round" />
    <line x1="39" y1="24" x2="42" y2="24" stroke="#854d0e" strokeWidth="2.8" strokeLinecap="round" />
    <line x1="11" y1="11" x2="13.5" y2="13.5" stroke="#854d0e" strokeWidth="2.8" strokeLinecap="round" />
    <line x1="34.5" y1="34.5" x2="37" y2="37" stroke="#854d0e" strokeWidth="2.8" strokeLinecap="round" />
    <line x1="11" y1="37" x2="13.5" y2="34.5" stroke="#854d0e" strokeWidth="2.8" strokeLinecap="round" />
    <line x1="34.5" y1="13.5" x2="37" y2="11" stroke="#854d0e" strokeWidth="2.8" strokeLinecap="round" />
    {/* Kawaii Face */}
    <circle cx="20" cy="22" r="1.6" fill="#713f12" />
    <circle cx="28" cy="22" r="1.6" fill="#713f12" />
    <path d="M21 26 Q24 29 27 26" stroke="#713f12" strokeWidth="2" strokeLinecap="round" fill="none" />
  </svg>
);

/** 18. Roofing & Waterproofing (Roof Layers) */
export const RoofingIllustration: React.FC<IllustrationProps> = ({ className = "w-full h-full" }) => (
  <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M8 23 L24 10 L40 23" stroke="#0f766e" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    <path d="M12 28 L24 18 L36 28" stroke="#0f766e" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    <path d="M16 33 L24 26 L32 33" stroke="#0f766e" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    <circle cx="24" cy="38" r="2.2" fill="#2dd4bf" stroke="#0f766e" strokeWidth="1.8" />
  </svg>
);

/** 19. Locksmith (Key & Lock) */
export const LocksmithIllustration: React.FC<IllustrationProps> = ({ className = "w-full h-full" }) => (
  <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <circle cx="17" cy="18" r="8" fill="#fef08a" stroke="#854d0e" strokeWidth="2.8" />
    <circle cx="17" cy="18" r="3.5" fill="#fef9c3" stroke="#854d0e" strokeWidth="2" />
    <path d="M23 22 L37 36 L34 39 L31 36 L29 38 L26 35 L28 33 L25 30" stroke="#854d0e" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" fill="#fef08a" />
  </svg>
);

/** 20. Civil Works & Masonry (Hard Hat & Brick) */
export const CivilIllustration: React.FC<IllustrationProps> = ({ className = "w-full h-full" }) => (
  <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M12 27 C12 18 17 13 24 13 C31 13 36 18 36 27 Z" fill="#fde047" stroke="#78350f" strokeWidth="2.8" strokeLinejoin="round" />
    <line x1="8" y1="27" x2="40" y2="27" stroke="#78350f" strokeWidth="3.2" strokeLinecap="round" />
    <line x1="24" y1="13" x2="24" y2="27" stroke="#ca8a04" strokeWidth="2" />
    <rect x="14" y="32" width="20" height="9" rx="2" fill="#fed7aa" stroke="#78350f" strokeWidth="2.2" />
    <line x1="24" y1="32" x2="24" y2="41" stroke="#78350f" strokeWidth="1.8" />
  </svg>
);

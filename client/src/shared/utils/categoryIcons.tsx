import React from 'react';
import { cn } from '@/lib/utils';
import {
  CleaningIllustration,
  ElectricalIllustration,
  PlumbingIllustration,
  WasteIllustration,
  PestIllustration,
  LeafIllustration,
  TechIllustration,
  HvacIllustration,
  RecyclingIllustration,
  ToolingIllustration,
  SecurityIllustration,
  CctvIllustration,
  PaintingIllustration,
  CarpentryIllustration,
  SolarIllustration,
  RoofingIllustration,
  LocksmithIllustration,
  CivilIllustration,
} from './categoryIllustrations';

export interface CategoryIconConfig {
  id: string;
  label: string;
  hint: string;
  Icon: React.ComponentType<{ className?: string }>;
  color: string;
  bg: string;
  border: string;
  shadow: string;
  badge: string;
}

const createShadow = (r: number, g: number, b: number, alpha = 0.18) => 
  `shadow-[0_6px_16px_rgba(${r},${g},${b},${alpha}),inset_0_2px_2px_rgba(255,255,255,0.95),inset_0_-2px_3px_rgba(${r},${g},${b},0.12)]`;

export const CATEGORY_ICON_REGISTRY: Record<string, CategoryIconConfig> = {
  sparkles: {
    id: 'sparkles',
    label: 'Cleaning & Janitorial',
    hint: 'Deep Clean, Janitorial & Housekeeping',
    Icon: CleaningIllustration,
    color: 'text-blue-600',
    bg: 'bg-gradient-to-b from-[#eef2ff] to-[#e0e7ff]',
    border: 'border-[#c7d2fe]',
    shadow: createShadow(99, 102, 241),
    badge: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  zap: {
    id: 'zap',
    label: 'Electrical & Power',
    hint: 'Wiring, Panels, Circuit Breakers & Backup',
    Icon: ElectricalIllustration,
    color: 'text-amber-600',
    bg: 'bg-gradient-to-b from-[#fffbeb] to-[#fef3c7]',
    border: 'border-[#fde68a]',
    shadow: createShadow(245, 158, 11),
    badge: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  droplet: {
    id: 'droplet',
    label: 'Plumbing & Hydraulics',
    hint: 'Pipes, Valves, Drainage & Leak Repairs',
    Icon: PlumbingIllustration,
    color: 'text-cyan-600',
    bg: 'bg-gradient-to-b from-[#f0f9ff] to-[#e0f2fe]',
    border: 'border-[#bae6fd]',
    shadow: createShadow(14, 165, 233),
    badge: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  },
  'trash-2': {
    id: 'trash-2',
    label: 'Waste Hauling & Refuse',
    hint: 'Commercial Refuse, Dumpster Hauling',
    Icon: WasteIllustration,
    color: 'text-red-600',
    bg: 'bg-gradient-to-b from-[#fff1f2] to-[#ffe4e6]',
    border: 'border-[#fecdd3]',
    shadow: createShadow(244, 63, 94),
    badge: 'bg-red-50 text-red-700 border-red-200',
  },
  bug: {
    id: 'bug',
    label: 'Pest & Termite Control',
    hint: 'Fumigation, Rodent, Insect & Termite Eradication',
    Icon: PestIllustration,
    color: 'text-pink-600',
    bg: 'bg-gradient-to-b from-[#fdf2f8] to-[#fce7f3]',
    border: 'border-[#fbcfe8]',
    shadow: createShadow(236, 72, 153),
    badge: 'bg-pink-50 text-pink-700 border-pink-200',
  },
  leaf: {
    id: 'leaf',
    label: 'Gardening & Landscaping',
    hint: 'Horticulture, Lawn Mowing, Tree Pruning',
    Icon: LeafIllustration,
    color: 'text-emerald-600',
    bg: 'bg-gradient-to-b from-[#f0fdf4] to-[#dcfce7]',
    border: 'border-[#bbf7d0]',
    shadow: createShadow(34, 197, 94),
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  'monitor-smartphone': {
    id: 'monitor-smartphone',
    label: 'E-Waste & IT Recycling',
    hint: 'Computers, Screens, Batteries & Circuit Boards',
    Icon: TechIllustration,
    color: 'text-purple-600',
    bg: 'bg-gradient-to-b from-[#faf5ff] to-[#f3e8ff]',
    border: 'border-[#e9d5ff]',
    shadow: createShadow(168, 85, 247),
    badge: 'bg-purple-50 text-purple-700 border-purple-200',
  },
  fan: {
    id: 'fan',
    label: 'HVAC & Climate Control',
    hint: 'Air Conditioning, Ventilation & Chillers',
    Icon: HvacIllustration,
    color: 'text-teal-600',
    bg: 'bg-gradient-to-b from-[#f0fdfa] to-[#ccfbf1]',
    border: 'border-[#99f6e4]',
    shadow: createShadow(20, 184, 166),
    badge: 'bg-teal-50 text-teal-700 border-teal-200',
  },
  recycle: {
    id: 'recycle',
    label: 'Recycling Stream',
    hint: 'Plastic, Paper, Cardboard & Glass Sorting',
    Icon: RecyclingIllustration,
    color: 'text-emerald-700',
    bg: 'bg-gradient-to-b from-[#ecfdf5] to-[#d1fae5]',
    border: 'border-[#a7f3d0]',
    shadow: createShadow(16, 185, 129),
    badge: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  },
  wrench: {
    id: 'wrench',
    label: 'Mechanical & Tooling',
    hint: 'Pumps, Generators, Compressors & Assemblies',
    Icon: ToolingIllustration,
    color: 'text-indigo-600',
    bg: 'bg-gradient-to-b from-[#f8fafc] to-[#f1f5f9]',
    border: 'border-[#cbd5e1]',
    shadow: createShadow(100, 116, 139),
    badge: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  },
  camera: {
    id: 'camera',
    label: 'CCTV & Surveillance',
    hint: 'Security Cameras, DVRs & Network Monitoring',
    Icon: CctvIllustration,
    color: 'text-violet-600',
    bg: 'bg-gradient-to-b from-[#faf5ff] to-[#f3e8ff]',
    border: 'border-[#e9d5ff]',
    shadow: createShadow(139, 92, 246),
    badge: 'bg-violet-50 text-violet-700 border-violet-200',
  },
  paintbrush: {
    id: 'paintbrush',
    label: 'Painting & Surface Finish',
    hint: 'Interior Walls, Epoxy Flooring, Weather Coatings',
    Icon: PaintingIllustration,
    color: 'text-fuchsia-600',
    bg: 'bg-gradient-to-b from-[#fdf2f8] to-[#fce7f3]',
    border: 'border-[#fbcfe8]',
    shadow: createShadow(217, 70, 239),
    badge: 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200',
  },
  hammer: {
    id: 'hammer',
    label: 'Carpentry & Woodwork',
    hint: 'Doors, Partitions, Cabinetry & Furniture Repair',
    Icon: CarpentryIllustration,
    color: 'text-amber-700',
    bg: 'bg-gradient-to-b from-[#fff7ed] to-[#ffedd5]',
    border: 'border-[#fed7aa]',
    shadow: createShadow(180, 83, 9),
    badge: 'bg-amber-50 text-amber-800 border-amber-200',
  },
  sun: {
    id: 'sun',
    label: 'Solar & Renewable Power',
    hint: 'Photovoltaic Panels, Inverters & Battery Banks',
    Icon: SolarIllustration,
    color: 'text-yellow-600',
    bg: 'bg-gradient-to-b from-[#fefce8] to-[#fef08a]',
    border: 'border-[#fde047]',
    shadow: createShadow(202, 138, 4),
    badge: 'bg-yellow-50 text-yellow-800 border-yellow-200',
  },
  layers: {
    id: 'layers',
    label: 'Roofing & Waterproofing',
    hint: 'Membrane Sealing, Flashing, Leak Prevention',
    Icon: RoofingIllustration,
    color: 'text-teal-700',
    bg: 'bg-gradient-to-b from-[#f0fdfa] to-[#ccfbf1]',
    border: 'border-[#99f6e4]',
    shadow: createShadow(15, 118, 110),
    badge: 'bg-teal-50 text-teal-800 border-teal-200',
  },
  key: {
    id: 'key',
    label: 'Locksmith & Security Hardware',
    hint: 'Deadbolts, Master Key Systems & Smart Locks',
    Icon: LocksmithIllustration,
    color: 'text-yellow-700',
    bg: 'bg-gradient-to-b from-[#fefce8] to-[#fef08a]',
    border: 'border-[#fde047]',
    shadow: createShadow(161, 98, 7),
    badge: 'bg-yellow-50 text-yellow-800 border-yellow-200',
  },
  'hard-hat': {
    id: 'hard-hat',
    label: 'Civil Works & Masonry',
    hint: 'Concrete, Paver Restoration, Brickwork & Plaster',
    Icon: CivilIllustration,
    color: 'text-stone-700',
    bg: 'bg-gradient-to-b from-[#fff7ed] to-[#fed7aa]',
    border: 'border-[#fdba74]',
    shadow: createShadow(120, 113, 108),
    badge: 'bg-stone-50 text-stone-800 border-stone-200',
  },
  waves: {
    id: 'waves',
    label: 'Water Tank Maintenance',
    hint: 'Underground & Overhead Tank Deep Cleaning',
    Icon: PlumbingIllustration,
    color: 'text-blue-600',
    bg: 'bg-gradient-to-b from-[#ecfeff] to-[#cffafe]',
    border: 'border-[#a5f3fc]',
    shadow: createShadow(37, 99, 235),
    badge: 'bg-blue-50 text-blue-700 border-blue-200',
  },
};

// Exactly 10 essential facility service categories matching the 10-category system
export const ICON_OPTIONS = [
  CATEGORY_ICON_REGISTRY['sparkles'],
  CATEGORY_ICON_REGISTRY['zap'],
  CATEGORY_ICON_REGISTRY['droplet'],
  CATEGORY_ICON_REGISTRY['trash-2'],
  CATEGORY_ICON_REGISTRY['bug'],
  CATEGORY_ICON_REGISTRY['leaf'],
  CATEGORY_ICON_REGISTRY['monitor-smartphone'],
  CATEGORY_ICON_REGISTRY['fan'],
  CATEGORY_ICON_REGISTRY['recycle'],
  CATEGORY_ICON_REGISTRY['wrench'],
].map((c) => ({
  id: c.id,
  label: c.label,
  hint: c.hint,
}));

export const getCategory3DIcon = (name?: string, iconKey?: string): CategoryIconConfig => {
  // 1. Direct match on iconKey / iconUrl
  if (iconKey) {
    const key = iconKey.toLowerCase().trim();
    if (CATEGORY_ICON_REGISTRY[key]) {
      return CATEGORY_ICON_REGISTRY[key];
    }
  }

  // 2. Keyword matching on category name
  const lower = (name || '').toLowerCase();

  if (lower.includes('waste') && !lower.includes('e-waste')) return CATEGORY_ICON_REGISTRY['trash-2'];
  if (lower.includes('e-waste') || lower.includes('electron') || lower.includes('gadget') || lower.includes('device') || lower.includes('tech') || lower.includes('screen')) return CATEGORY_ICON_REGISTRY['monitor-smartphone'];
  if (lower.includes('clean') || lower.includes('janitor') || lower.includes('housekeep') || lower.includes('sweeping') || lower.includes('maid') || lower.includes('sanit') || lower.includes('disinfect') || lower.includes('wash') || lower.includes('pressure')) return CATEGORY_ICON_REGISTRY['sparkles'];
  if (lower.includes('electr') || lower.includes('power') || lower.includes('wiring') || lower.includes('volt') || lower.includes('breaker') || lower.includes('panel')) return CATEGORY_ICON_REGISTRY['zap'];
  if (lower.includes('plumb') || lower.includes('pipe') || lower.includes('drain') || lower.includes('sewer') || lower.includes('leak') || lower.includes('faucet') || lower.includes('hydraulic')) return CATEGORY_ICON_REGISTRY['droplet'];
  if (lower.includes('hvac') || lower.includes('air cond') || lower.includes('chiller') || lower.includes('duct') || lower.includes('ventilat') || lower.includes('thermal') || lower.includes('cooling') || lower.includes('fire') || lower.includes('heat') || lower.includes('boiler')) return CATEGORY_ICON_REGISTRY['fan'];
  if (lower.includes('pest') || lower.includes('termite') || lower.includes('fumigat') || lower.includes('rodent') || lower.includes('bug') || lower.includes('insect') || lower.includes('cockroach')) return CATEGORY_ICON_REGISTRY['bug'];
  if (lower.includes('garden') || lower.includes('landscap') || lower.includes('lawn') || lower.includes('tree') || lower.includes('plant') || lower.includes('horticult')) return CATEGORY_ICON_REGISTRY['leaf'];
  if (lower.includes('recycle') || lower.includes('sorting') || lower.includes('diversion')) return CATEGORY_ICON_REGISTRY['recycle'];
  if (lower.includes('mechan') || lower.includes('pump') || lower.includes('compressor') || lower.includes('generator') || lower.includes('tool') || lower.includes('repair') || lower.includes('machin') || lower.includes('motor') || lower.includes('conveyor') || lower.includes('elevator') || lower.includes('secur') || lower.includes('barrier') || lower.includes('guard')) return CATEGORY_ICON_REGISTRY['wrench'];
  if (lower.includes('cctv') || lower.includes('camera') || lower.includes('surveill')) return CATEGORY_ICON_REGISTRY['camera'];
  if (lower.includes('paint') || lower.includes('coat') || lower.includes('epoxy') || lower.includes('finish') || lower.includes('wall')) return CATEGORY_ICON_REGISTRY['paintbrush'];
  if (lower.includes('carpent') || lower.includes('wood') || lower.includes('furniture') || lower.includes('cabinet') || lower.includes('door')) return CATEGORY_ICON_REGISTRY['hammer'];
  if (lower.includes('solar') || lower.includes('photovoltaic') || lower.includes('renewable')) return CATEGORY_ICON_REGISTRY['sun'];
  if (lower.includes('roof') || lower.includes('waterproof') || lower.includes('membrane')) return CATEGORY_ICON_REGISTRY['layers'];
  if (lower.includes('lock') || lower.includes('key')) return CATEGORY_ICON_REGISTRY['key'];
  if (lower.includes('civil') || lower.includes('mason') || lower.includes('concrete') || lower.includes('brick') || lower.includes('plaster')) return CATEGORY_ICON_REGISTRY['hard-hat'];
  if (lower.includes('tank') || lower.includes('reservoir')) return CATEGORY_ICON_REGISTRY['waves'];

  // 3. Fallback
  return CATEGORY_ICON_REGISTRY['wrench'];
};

/**
 * Universal Pastel Squircle Category Logo Component
 * Renders the exact cute claymorphic squircle badge with illustrative icon.
 */
export const CategorySquircleLogo: React.FC<{
  name?: string;
  iconKey?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}> = ({ name, iconKey, size = 'md', className }) => {
  const iconConfig = getCategory3DIcon(name, iconKey);
  const IconComp = iconConfig.Icon;

  const sizeClasses = {
    xs: 'w-6 h-6 rounded-lg p-0.5',
    sm: 'w-8 h-8 rounded-xl p-1',
    md: 'w-10 h-10 rounded-[1.125rem] p-1.5',
    lg: 'w-14 h-14 rounded-2xl p-2.5',
    xl: 'w-18 h-18 rounded-3xl p-3',
  }[size];

  return (
    <div
      className={cn(
        'flex items-center justify-center shrink-0 border transition-all select-none',
        sizeClasses,
        iconConfig.bg,
        iconConfig.border,
        iconConfig.shadow,
        className
      )}
    >
      <IconComp className="w-full h-full drop-shadow-xs" />
    </div>
  );
};

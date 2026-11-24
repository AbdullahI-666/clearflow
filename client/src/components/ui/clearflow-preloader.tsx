import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Leaf } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ClearFlowPreloaderProps {
  onComplete?: () => void;
  minDuration?: number; // Total duration in ms (default: 2000ms = 2 seconds)
  fullScreen?: boolean;
}

interface PortalStage {
  name: string;
  role: 'client' | 'fieldteam' | 'admin';
  colorName: string;
  gradient: string;
  ringBorder: string;
  ambientColor: string;
  textColor: string;
  badgeBg: string;
  dotColor: string;
  tagline: string;
}

const PORTAL_STAGES: PortalStage[] = [
  {
    name: 'Client Portal',
    role: 'client',
    colorName: 'green',
    gradient: 'from-emerald-400 via-teal-500 to-emerald-600',
    ringBorder: 'border-emerald-400/50',
    ambientColor: 'rgba(16, 185, 129, 0.22)',
    textColor: 'text-emerald-300',
    badgeBg: 'bg-emerald-500/15 border-emerald-500/35 text-emerald-300',
    dotColor: 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.9)]',
    tagline: 'Client Service & Operations Experience',
  },
  {
    name: 'Worker Portal',
    role: 'fieldteam',
    colorName: 'orange',
    gradient: 'from-amber-400 via-amber-500 to-orange-600',
    ringBorder: 'border-amber-400/50',
    ambientColor: 'rgba(245, 158, 11, 0.22)',
    textColor: 'text-amber-300',
    badgeBg: 'bg-amber-500/15 border-amber-500/35 text-amber-300',
    dotColor: 'bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.9)]',
    tagline: 'Worker Operations & Real-Time Telemetry',
  },
  {
    name: 'Admin Portal',
    role: 'admin',
    colorName: 'purple',
    gradient: 'from-purple-400 via-purple-600 to-indigo-600',
    ringBorder: 'border-purple-400/50',
    ambientColor: 'rgba(168, 85, 247, 0.22)',
    textColor: 'text-purple-300',
    badgeBg: 'bg-purple-500/15 border-purple-500/35 text-purple-300',
    dotColor: 'bg-purple-400 shadow-[0_0_10px_rgba(192,132,252,0.9)]',
    tagline: 'Operations Command & AI Intelligence',
  },
];

export function ClearFlowPreloader({
  onComplete,
  minDuration = 2000,
  fullScreen = true,
}: ClearFlowPreloaderProps) {
  // Capture precise mount timestamp immediately when component function renders
  const mountTimeRef = useRef<number>(
    typeof performance !== 'undefined' ? performance.now() : Date.now()
  );
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let animId: number;
    const start = mountTimeRef.current;

    const tick = (now: number) => {
      const elapsed = now - start;
      const p = Math.min(1, Math.max(0, elapsed / minDuration));
      setProgress(p);

      if (p < 1) {
        animId = requestAnimationFrame(tick);
      } else {
        if (onComplete) {
          onComplete();
        }
      }
    };

    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [minDuration, onComplete]);

  // Exactly 1/3 (666.67ms) for each of the 3 portal themes:
  // Stage 0 (Client - Green):       0.000 to 0.333333 (0ms to 666.67ms)
  // Stage 1 (Field Team - Orange):  0.333333 to 0.666667 (666.67ms to 1333.33ms)
  // Stage 2 (Admin - Purple):       0.666667 to 1.000000 (1333.33ms to 2000.00ms)
  const stageIndex = progress < 1 / 3 ? 0 : progress < 2 / 3 ? 1 : 2;
  const currentStage = PORTAL_STAGES[stageIndex];

  return (
    <motion.div
      data-auth-page="true"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      style={{ willChange: 'opacity, transform', transform: 'translateZ(0)' }}
      className={`${
        fullScreen ? 'fixed inset-0 z-50 w-full h-full' : 'w-full h-full'
      } bg-[#06070a] flex flex-col items-center justify-center select-none overflow-hidden`}
    >
      {/* GPU-composited ambient backdrop glow matching current portal color */}
      <motion.div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full blur-[110px] pointer-events-none"
        animate={{
          backgroundColor: currentStage.ambientColor,
          scale: [0.95, 1.05, 0.95],
        }}
        transition={{
          backgroundColor: { duration: 0.25, ease: 'easeOut' },
          scale: { duration: 1.5, repeat: Infinity, ease: 'easeInOut' },
        }}
        style={{ willChange: 'transform, background-color', transform: 'translate3d(-50%, -50%, 0)' }}
      />

      {/* Center Preloader Container */}
      <div className="relative z-10 flex flex-col items-center">
        {/* Leaf Logo Badge — 3-Color Portal Theme Morph (Green -> Orange -> Purple) */}
        <div className="relative w-20 h-20 sm:w-24 sm:h-24">
          <motion.div
            animate={{
              boxShadow:
                stageIndex === 0
                  ? '0 12px 45px rgba(16,185,129,0.45)'
                  : stageIndex === 1
                  ? '0 12px 45px rgba(245,158,11,0.45)'
                  : '0 12px 45px rgba(168,85,247,0.45)',
            }}
            transition={{ duration: 0.2 }}
            className="relative w-full h-full rounded-2xl sm:rounded-3xl flex items-center justify-center border border-white/20 overflow-hidden"
          >
            {/* Smooth Crossfading Gradient Layers for 60fps color morphing */}
            {PORTAL_STAGES.map((stage, idx) => (
              <motion.div
                key={stage.role}
                initial={false}
                animate={{ opacity: stageIndex === idx ? 1 : 0 }}
                transition={{ duration: 0.12, ease: 'easeOut' }}
                className={cn(
                  'absolute inset-0 rounded-2xl sm:rounded-3xl bg-gradient-to-br',
                  stage.gradient
                )}
              />
            ))}

            {/* Subtle inner glassy gleam */}
            <div className="absolute inset-0 bg-gradient-to-tr from-white/25 via-transparent to-transparent rounded-2xl sm:rounded-3xl pointer-events-none" />

            {/* Center Leaf Icon with energetic spring pulse on each stage change */}
            <motion.div
              key={`badge-bounce-${stageIndex}`}
              initial={{ scale: 0.88, rotate: -6 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{
                type: 'spring',
                stiffness: 450,
                damping: 24,
              }}
              className="relative z-10 flex items-center justify-center"
            >
              <Leaf className="w-10 h-10 sm:w-12 sm:h-12 text-white drop-shadow-md" />
            </motion.div>
          </motion.div>

          {/* Dynamic Ripple Pulse Ring around the Badge */}
          <motion.div
            key={`ring-${stageIndex}`}
            className={cn(
              'absolute -inset-2.5 rounded-[26px] sm:rounded-[34px] border pointer-events-none',
              currentStage.ringBorder
            )}
            initial={{ scale: 0.95, opacity: 0.85 }}
            animate={{ scale: 1.25, opacity: 0 }}
            transition={{ duration: 0.45, ease: 'easeOut' }}
          />
        </div>

        {/* ClearFlow Brand Wordmark */}
        <div className="mt-5 flex flex-col items-center">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white drop-shadow-sm">
            ClearFlow
          </h1>

          {/* 2-Second Synchronized Continuous Progress Bar */}
          <div className="w-48 h-1 bg-white/10 rounded-full mt-5 overflow-hidden relative border border-white/5">
            <div
              className="h-full rounded-full transition-colors duration-150"
              style={{
                width: `${Math.min(100, Math.max(0, progress * 100))}%`,
                background:
                  stageIndex === 0
                    ? 'linear-gradient(90deg, #10b981, #14b8a6)'
                    : stageIndex === 1
                    ? 'linear-gradient(90deg, #f59e0b, #ea580c)'
                    : 'linear-gradient(90deg, #a855f7, #6366f1)',
              }}
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default ClearFlowPreloader;

'use client';

import React, { forwardRef, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { animate, motion, useMotionValue, useReducedMotion, useTransform } from 'framer-motion';
import { HugeiconsIcon } from '@hugeicons/react';
import { Notification03Icon } from '@hugeicons/core-free-icons';
import './BellToggle.css';

const SPRING_UI = { type: 'spring', duration: 0.3, bounce: 0 } as const;
const SEG_EASE = 'cubic-bezier(0.77, 0, 0.175, 1)';
const WARP = 0.6;
const SIZES: Record<string, [number, number, number, number, number]> = {
  sm: [36, 12.5, 14, 15, 8],
  md: [44, 13.5, 16, 19, 9],
  lg: [52, 15, 18, 23, 10],
};
const WOBBLE = { amplitude: 0.4, passes: 3, duration: 420 };
const BELL_BODY = 'M6 16.5V10a6 6 0 0 1 12 0v6.5l1.6 2.3H4.4L6 16.5z';

const passOffset = (k: number, passes: number) => 1 - Math.pow(1 - (k + 2 / 3) / (passes + 1), WARP);

const ringKeyframes = (from: number, amplitude: number, passes: number, decay: number) => {
  const frames: Keyframe[] = [{ transform: `rotate(${from}deg)`, offset: 0, easing: SEG_EASE }];
  for (let k = 0; k < passes; k++) {
    const angle = amplitude * Math.pow(1 - k / passes, decay) * (k % 2 ? 1 : -1);
    frames.push({ transform: `rotate(${angle.toFixed(2)}deg)`, offset: passOffset(k, passes), easing: SEG_EASE });
  }
  frames.push({ transform: 'rotate(0deg)', offset: 1 });
  return frames;
};

const liveAngle = (el: HTMLElement) => {
  if (typeof window === 'undefined') return 0;
  const tf = getComputedStyle(el).transform;
  if (!tf || tf === 'none') return 0;
  try {
    const m = new DOMMatrix(tf);
    return (Math.atan2(m.b, m.a) * 180) / Math.PI;
  } catch (e) {
    return 0;
  }
};

export interface BellToggleProps {
  offLabel?: string;
  onLabel?: string;
  icon?: React.ReactNode;
  label?: string;
  color?: string;
  background?: string;
  onColor?: string;
  onBackground?: string;
  size?: 'sm' | 'md' | 'lg';
  radius?: number;
  ringAmplitude?: number;
  ringPasses?: number;
  ringDecay?: number;
  ringDuration?: number;
  ringPivot?: number;
  crossfadeMs?: number;
  revealBounce?: number;
  count?: number;
  badge?: boolean;
  badgeColor?: string;
  badgeTextColor?: string;
  indicatorType?: 'badge' | 'target' | 'both';
  waves?: boolean;
  clapper?: boolean;
  pressed?: boolean;
  defaultPressed?: boolean;
  onChange?: (pressed: boolean) => void;
  disabled?: boolean;
  className?: string;
  iconOnly?: boolean;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  onIconClick?: (e: React.MouseEvent<HTMLElement>) => void;
  title?: string;
}

export const BellToggle = forwardRef<HTMLButtonElement, BellToggleProps>(function BellToggle(
  {
    offLabel = 'Notify me',
    onLabel = "You'll be notified",
    icon,
    label,
    color = '#f5f5f5',
    background = '#27272a',
    onColor = '#18181b',
    onBackground = '#f5f5f5',
    size = 'md',
    radius = 22,
    ringAmplitude = 17,
    ringPasses = 5,
    ringDecay = 1,
    ringDuration = 820,
    ringPivot = 16,
    crossfadeMs = 200,
    revealBounce = 0,
    count = 0,
    badge = true,
    badgeColor = '#ef4444',
    badgeTextColor = '#ffffff',
    indicatorType = 'badge',
    waves = true,
    clapper = false,
    pressed,
    defaultPressed = false,
    onChange,
    disabled = false,
    className = '',
    iconOnly = false,
    onClick,
    onIconClick,
    title,
  },
  forwardedRef
) {
  const [inner, setInner] = useState(defaultPressed);
  const on = pressed ?? inner;
  const reduce = useReducedMotion();
  const rootRef = useRef<HTMLSpanElement>(null);
  const glyphRef = useRef<HTMLSpanElement>(null);
  const clapperRef = useRef<HTMLSpanElement>(null);
  const waveLeft = useRef<SVGSVGElement>(null);
  const waveRight = useRef<SVGSVGElement>(null);
  const offRef = useRef<HTMLSpanElement>(null);
  const onRef = useRef<HTMLSpanElement>(null);
  const lastInput = useRef<'pointer' | 'keyboard'>('pointer');
  const pending = useRef<'pointer' | 'keyboard' | null>(null);
  const spring = useRef<any>(null);
  const prevCount = useRef(count);
  const [h, fs, iconSize, px, gap] = SIZES[size] ?? SIZES.md;

  const t = useMotionValue(on ? 1 : 0);
  const wOff = useMotionValue(0);
  const wOn = useMotionValue(0);
  const clip = useTransform([t, wOff, wOn], ([v, a, b]: any[]) => `${Math.max(a, b) - (a + (b - a) * v)}px`);

  const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

  useIsomorphicLayoutEffect(() => {
    if (iconOnly) return;
    const measure = () => {
      if (offRef.current) wOff.set(offRef.current.offsetWidth);
      if (onRef.current) wOn.set(onRef.current.offsetWidth);
    };
    measure();
    const observer = new ResizeObserver(measure);
    if (offRef.current) observer.observe(offRef.current);
    if (onRef.current) observer.observe(onRef.current);
    if (typeof document !== 'undefined' && document.fonts?.ready) {
      document.fonts.ready.then(measure);
    }
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offLabel, onLabel, size, iconOnly]);

  const swing = (amplitude: number, passes: number, duration: number) => {
    const el = glyphRef.current;
    if (!el || typeof el.animate !== 'function') return;
    if (typeof el.getAnimations === 'function') {
      el.getAnimations().forEach((a) => a.cancel());
    }
    el.animate(ringKeyframes(liveAngle(el), amplitude, passes, ringDecay), { duration, easing: 'linear' });

    const c = clapperRef.current;
    if (c && typeof c.animate === 'function') {
      if (typeof c.getAnimations === 'function') {
        c.getAnimations().forEach((a) => a.cancel());
      }
      c.animate(ringKeyframes(liveAngle(c), amplitude * 1.6, passes, ringDecay), {
        duration,
        delay: 70,
        easing: 'linear',
      });
    }

    if (!waves) return;
    for (let k = 0; k < passes; k++) {
      const side = k % 2 ? waveRight.current : waveLeft.current;
      if (!side || typeof side.animate !== 'function') continue;
      const strength = Math.pow(1 - k / passes, ringDecay);
      side.animate(
        [
          { opacity: 0, transform: 'scale(0.55)' },
          { opacity: 0.9 * strength, offset: 0.3 },
          { opacity: 0, transform: 'scale(1.25)' },
        ],
        { duration: 380, delay: passOffset(k, passes) * duration, easing: 'ease-out' }
      );
    }
  };

  useIsomorphicLayoutEffect(() => {
    const pointer = pending.current === 'pointer' && !reduce;
    pending.current = null;
    spring.current?.stop();
    if (pointer) spring.current = animate(t, on ? 1 : 0, { ...SPRING_UI, bounce: revealBounce });
    else t.jump(on ? 1 : 0);
    if (on && pointer) swing(ringAmplitude, ringPasses, ringDuration);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [on]);

  useIsomorphicLayoutEffect(() => () => spring.current?.stop(), []);

  useEffect(() => {
    const was = prevCount.current;
    prevCount.current = count;
    if (count > was && !reduce) {
      swing(ringAmplitude * WOBBLE.amplitude, WOBBLE.passes, WOBBLE.duration);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count]);

  const toggle = (e: React.MouseEvent<HTMLButtonElement>) => {
    pending.current = lastInput.current;
    if (pressed === undefined) setInner(!on);
    onChange?.(!on);
    onClick?.(e);
  };

  const press = (e: React.PointerEvent<HTMLButtonElement>) => {
    lastInput.current = 'pointer';
    if (e.button === 0 && !disabled && e.currentTarget) e.currentTarget.dataset.pressed = '';
  };

  const release = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.currentTarget) delete e.currentTarget.dataset.pressed;
  };

  const key = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'Enter' || e.key === ' ') lastInput.current = 'keyboard';
  };

  const showBadge = badge && count > 0 && (indicatorType === 'badge' || indicatorType === 'both');
  const showTarget = count > 0 && (indicatorType === 'target' || indicatorType === 'both');

  return (
    <motion.button
      ref={forwardedRef}
      type="button"
      className={`bell-toggle${className ? ` ${className}` : ''}`}
      data-on={on ? 'true' : 'false'}
      data-disabled={disabled ? '' : undefined}
      data-icon-only={iconOnly ? 'true' : undefined}
      aria-pressed={on}
      aria-label={label ?? (iconOnly ? 'Notifications' : offLabel)}
      title={title ?? (label ?? (iconOnly ? `Notifications ${count > 0 ? `(${count} unread)` : ''}` : offLabel))}
      disabled={disabled}
      onPointerDown={press}
      onPointerUp={release}
      onPointerCancel={release}
      onPointerLeave={release}
      onKeyDown={key}
      onClick={toggle}
      style={{
        ['--bt-clip' as any]: clip,
        ['--bt-color' as any]: color,
        ['--bt-bg' as any]: background,
        ['--bt-on-color' as any]: onColor,
        ['--bt-on-bg' as any]: onBackground,
        ['--bt-badge' as any]: badgeColor,
        ['--bt-badge-ink' as any]: badgeTextColor,
        ['--bt-radius' as any]: `${radius}px`,
        ['--bt-fade' as any]: `${crossfadeMs}ms`,
        ['--bt-pivot' as any]: `${ringPivot}%`,
        ['--bt-h' as any]: `${h}px`,
        ['--bt-fs' as any]: `${fs}px`,
        ['--bt-icon' as any]: `${iconSize}px`,
        ['--bt-px' as any]: `${iconOnly ? 0 : px}px`,
        ['--bt-gap' as any]: `${iconOnly ? 0 : gap}px`,
      }}
    >
      <span className="bell-toggle__button">
        <span 
          className="bell-toggle__bell" 
          aria-hidden="true"
          onClick={onIconClick ? (e) => {
            e.stopPropagation();
            onIconClick(e);
          } : undefined}
          style={onIconClick ? { pointerEvents: 'auto' } : undefined}
        >
          <span ref={glyphRef} className="bell-toggle__glyph">
            {clapper ? (
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d={BELL_BODY} />
                <path d="M12 2.5V4" />
              </svg>
            ) : (
              (icon ?? <HugeiconsIcon icon={Notification03Icon as any} size={iconSize} strokeWidth={2} />)
            )}
          </span>

          {clapper ? (
            <span ref={clapperRef} className="bell-toggle__clapper">
              <svg viewBox="0 0 24 24">
                <circle cx="12" cy="20.4" r="1.7" fill="currentColor" />
              </svg>
            </span>
          ) : null}

          {waves ? (
            <>
              <svg ref={waveLeft} className="bell-toggle__wave bell-toggle__wave--left" viewBox="0 0 14 14">
                <path d="M14 8a6 6 0 0 0-6 6" />
                <path d="M14 4A10 10 0 0 0 4 14" />
              </svg>
              <svg ref={waveRight} className="bell-toggle__wave bell-toggle__wave--right" viewBox="0 0 14 14">
                <path d="M0 8a6 6 0 0 1 6 6" />
                <path d="M0 4a10 10 0 0 1 10 10" />
              </svg>
            </>
          ) : null}

          {/* Standard Count Badge */}
          {badge && (
            <span className="bell-toggle__badge" data-show={showBadge ? '' : undefined}>
              <span key={count} className="bell-toggle__digit">
                {count > 9 ? '9+' : count}
              </span>
            </span>
          )}

          {/* Concentric Target Ring Indicator (from User Screenshot) */}
          {showTarget && (
            <span className="bell-toggle__target-indicator" data-show="">
              <span className="absolute inline-flex h-3.5 w-3.5 rounded-full bg-red-400 opacity-25 animate-ping" />
              <svg
                width="14"
                height="14"
                viewBox="0 0 16 16"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="relative shadow-xs"
              >
                <circle cx="8" cy="8" r="6.2" stroke={badgeColor} strokeWidth="1.6" fill="white" />
                <circle cx="8" cy="8" r="3.2" fill={badgeColor} />
              </svg>
            </span>
          )}
        </span>

        {!iconOnly && (
          <span className="bell-toggle__say" aria-hidden="true">
            <span ref={offRef} className="bell-toggle__face bell-toggle__face--off">
              {offLabel}
            </span>
            <span ref={onRef} className="bell-toggle__face bell-toggle__face--on">
              {onLabel}
            </span>
          </span>
        )}
      </span>
    </motion.button>
  );
});

export default BellToggle;

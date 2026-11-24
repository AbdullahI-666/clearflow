"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Zap,
  Droplets,
  Cpu,
  Wind,
  CircleDot,
  BarChart2,
  ArrowUpRight,
  Compass,
  MapPin,
  Layers,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Analytics Bento: four live cards (revenue, sessions, categories,   */
/*  seasonality). SVG only, no chart library. Surfaces and text come   */
/*  from the theme (bg-card, text-foreground…); chart colors are props */
/* ------------------------------------------------------------------ */

type Point = { label: string; value: number };

export type AnalyticsBentoProps = React.JSX.IntrinsicElements["div"] & {
  currency?: string;
  revenue?: {
    label: string;
    value: number;
    delta: string;
    prefix?: string;
    suffix?: string;
    note?: React.ReactNode;
    caption?: string;
    series: Point[];
  };
  sessions: {
    label: string;
    value: number;
    delta: string;
    note?: React.ReactNode;
    /** values per hour; first array is the current period, the rest are prior periods */
    desktop: number[][];
    mobile: number[][];
    labels?: { desktop: string; mobile: string; prior: string; current: string };
  };
  categories: {
    title: string;
    groups: { id: string; name: string; color: string; ink?: "dark" | "light" }[];
    periods: { label: string; total: number; delta: string; compare: string; prefix?: string; suffix?: string }[];
    /** one value per period, in the same order as `periods` */
    items: { name: string; group: string; values: number[] }[];
    table?: { columns: string[]; rows: { label: string; values: string[] }[] };
  };
  seasonality: {
    title: string;
    axis?: string[];
    years: {
      label: string;
      values: number[];
      stats: { label: string; value: number; delta: string; note: string }[];
      rows: { label: string; value: string }[];
    }[];
  };
  /** Chart colors. Each can be any CSS color. */
  colors?: { revenue?: [string, string]; desktop?: [string, string]; mobile?: [string, string]; radar?: string };
  fontFamily?: string;
  monoFamily?: string;
  /** The "by vasnev.art" badge under the grid. */
  credit?: boolean;
};

/* ---------------- helpers ---------------- */

const fmt = (n: number) => Math.round(n).toLocaleString("en-US");
const ease = (t: number) => 1 - Math.pow(1 - t, 3);

function useReducedMotion() {
  const [r, setR] = React.useState(false);
  React.useEffect(() => {
    const m = window.matchMedia("(prefers-reduced-motion: reduce)");
    setR(m.matches);
    const on = () => setR(m.matches);
    m.addEventListener("change", on);
    return () => m.removeEventListener("change", on);
  }, []);
  return r;
}

function useSize() {
  const ref = React.useRef(null as HTMLDivElement | null);
  const [size, setSize] = React.useState({ w: 0, h: 0 });
  React.useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      setSize({ w: Math.round(rect.width), h: Math.round(rect.height) });
    }
    const ro = new ResizeObserver(([e]) => {
      const w = Math.round(e.contentRect.width), h = Math.round(e.contentRect.height);
      setSize((p) => (p.w === w && p.h === h ? p : { w, h }));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, size] as const;
}

/** smooth path through points (catmull-rom as cubic beziers) */
function smooth(P: [number, number][]) {
  const n = P.length;
  if (n < 2) return "";
  const g = (i: number) => P[Math.max(0, Math.min(n - 1, i))];
  let d = `M${P[0][0]},${P[0][1]}`;
  for (let i = 0; i < n - 1; i++) {
    const p0 = g(i - 1), p1 = g(i), p2 = g(i + 1), p3 = g(i + 2), k = 0.18;
    d += `C${p1[0] + (p2[0] - p0[0]) * k},${p1[1] + (p2[1] - p0[1]) * k} ${p2[0] - (p3[0] - p1[0]) * k},${p2[1] - (p3[1] - p1[1]) * k} ${p2[0]},${p2[1]}`;
  }
  return d;
}

function CountUp({ value, prefix = "", suffix = "", duration = 1100 }: { value: number; prefix?: string; suffix?: string; duration?: number }) {
  const ref = React.useRef(null as HTMLSpanElement | null);
  const from = React.useRef(0);
  const reduce = useReducedMotion();
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (reduce) { el.textContent = prefix + fmt(value) + suffix; from.current = value; return; }
    const a = from.current, t0 = performance.now();
    let raf = 0;
    const f = (now: number) => {
      const t = Math.min(1, (now - t0) / duration), v = a + (value - a) * ease(t);
      el.textContent = prefix + fmt(v) + suffix; from.current = v;
      if (t < 1) raf = requestAnimationFrame(f);
    };
    raf = requestAnimationFrame(f);
    return () => cancelAnimationFrame(raf);
  }, [value, prefix, suffix, duration, reduce]);
  return <span ref={ref} className="tracking-tight">{prefix}0{suffix}</span>;
}

/* ---------------- tooltip ---------------- */

type Tip = { title: string; rows: { label: string; value: string; color?: string }[] };
type TipApi = { show: (x: number, y: number, t: Tip) => void; hide: () => void };
type TipRef = { current: TipApi | null };

function Tooltip({ mono, api }: { mono: string; api: TipRef }) {
  const [tip, setTip] = React.useState(null as (Tip & { x: number; y: number }) | null);
  const [pos, setPos] = React.useState({ l: 0, t: 0 });
  const box = React.useRef(null as HTMLDivElement | null);
  React.useEffect(() => {
    api.current = { show: (x, y, t) => setTip({ ...t, x, y }), hide: () => setTip(null) };
    return () => { api.current = null; };
  }, [api]);
  React.useLayoutEffect(() => {
    if (!tip || !box.current) return;
    const r = box.current.getBoundingClientRect();
    let l = tip.x + 14, t = tip.y - r.height - 12;
    if (l + r.width > window.innerWidth - 8) l = tip.x - r.width - 14;
    if (t < 8) t = tip.y + 16;
    setPos({ l, t });
  }, [tip]);
  return (
    <div
      ref={box}
      role="tooltip"
      className={`pointer-events-none fixed z-50 whitespace-nowrap rounded-2xl border border-purple-200/90 bg-white/95 px-3.5 py-2.5 text-xs text-gray-900 shadow-xl backdrop-blur-xl transition-all duration-150 ${tip ? "opacity-100 scale-100" : "opacity-0 scale-95"}`}
      style={{ left: pos.l, top: pos.t }}
    >
      {tip && (
        <>
          <div className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-purple-700 border-b border-purple-100 pb-1">{tip.title}</div>
          {tip.rows.map((r) => (
            <div key={r.label} className="flex items-center justify-between gap-3 py-0.5">
              <span className="inline-flex items-center gap-1.5 text-gray-600">
                {r.color && <i className="inline-block size-2 rounded-full shadow-xs" style={{ background: r.color }} />}
                {r.label}
              </span>
              <b className="font-bold text-gray-900 tracking-tight" style={{ fontFamily: mono }}>{r.value}</b>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

/* ---------------- shared bits ---------------- */

const Arrow = () => (
  <svg viewBox="0 0 12 12" className="size-[11px]" aria-hidden="true">
    <path d="M6 10.5V1.5M2 5.5l4-4 4 4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const Delta = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <span className={`inline-flex items-center font-semibold tracking-tight text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2.5 py-0.5 rounded-full text-xs tabular-nums shadow-2xs ${className}`}>
    {children}
  </span>
);
const Card = ({ className = "", children, ...rest }: React.JSX.IntrinsicElements["section"]) => (
  <section 
    className={`relative min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 text-slate-900 shadow-sm transition-all duration-200 ${className}`} 
    {...rest}
  >
    <div className="relative z-10 flex flex-col h-full text-slate-900">
      {children}
    </div>
  </section>
);

function Segmented({ items, value, onChange, label }: { items: string[]; value: number; onChange: (i: number) => void; label: string }) {
  const refs = React.useRef([] as (HTMLButtonElement | null)[]);
  const [thumb, setThumb] = React.useState({ x: 0, w: 0 });
  React.useLayoutEffect(() => {
    const b = refs.current[value];
    if (b) setThumb({ x: b.offsetLeft, w: b.offsetWidth });
  }, [value, items]);
  return (
    <div role="tablist" aria-label={label} className="relative inline-grid h-[32px] auto-cols-fr grid-flow-col rounded-[12px] bg-purple-50/80 border border-purple-200 p-[2px]">
      <div
        className="absolute bottom-[2px] top-[2px] rounded-[10px] bg-purple-600 shadow-xs transition-[transform,width] duration-300 [transition-timing-function:cubic-bezier(.2,.9,.25,1)]"
        style={{ width: thumb.w, transform: `translateX(${thumb.x - 2}px)`, left: 2 }}
      />
      {items.map((it, i) => (
        <button
          key={it}
          ref={(el) => { refs.current[i] = el; }}
          role="tab"
          type="button"
          aria-selected={i === value}
          onClick={() => onChange(i)}
          className={`relative z-10 rounded-[10px] px-3 text-xs font-semibold tracking-[-0.01em] outline-none transition-colors cursor-pointer ${i === value ? "text-white" : "text-purple-900/70 hover:text-purple-950"}`}
        >
          {it}
        </button>
      ))}
    </div>
  );
}

/* ---------------- A: revenue line ---------------- */

function RevenueChart({ series, caption, prefix, colors, mono, tip }: { series: Point[]; caption?: string; prefix: string; colors: [string, string]; mono: string; tip: TipRef }) {
  const [ref, { w: W, h: H }] = useSize();
  const reduce = useReducedMotion();
  const [drawn, setDrawn] = React.useState(false);
  const [hover, setHover] = React.useState(null as number | null);
  const id = React.useId().replace(/:/g, "");
  React.useEffect(() => { if (!W) return; const r = requestAnimationFrame(() => requestAnimationFrame(() => setDrawn(true))); return () => cancelAnimationFrame(r); }, [W]);

  const vals = series.map((s) => s.value);
  const lo = Math.min(...vals), hi = Math.max(...vals), span = hi - lo || 1;
  const raw = span / 4, mag = Math.pow(10, Math.floor(Math.log10(raw))), step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) || raw;
  const mn = lo - span * 0.45, mx = hi + span * 0.08, top = 30, bot = 14;
  const Y = (v: number) => top + (1 - (v - mn) / (mx - mn)) * (H - top - bot);
  const ticks: number[] = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi + 1e-9; v += step) ticks.push(v);
  const P = vals.map((v, i) => [14 + (i / (vals.length - 1)) * (W - 66), Y(v)] as [number, number]);
  const d = W ? smooth(P) : "";
  const last = P[P.length - 1];
  const compact = (v: number) => (v >= 1000 ? (v / 1000).toFixed(step < 1000 ? 1 : 0) + "K" : String(v));

  const move = (e: React.PointerEvent) => {
    const r = (e.currentTarget as SVGRectElement).ownerSVGElement!.getBoundingClientRect();
    const i = Math.max(0, Math.min(vals.length - 1, Math.round(((e.clientX - r.left - 14) / (W - 66)) * (vals.length - 1))));
    setHover(i);
    tip.current?.show(r.left + P[i][0], r.top + P[i][1], { title: series[i].label, rows: [{ label: "Revenue", value: prefix + fmt(vals[i]), color: colors[1] }] });
  };

  return (
    <div ref={ref} className="relative min-h-[140px] flex-1 overflow-hidden rounded-[20px] border border-purple-200/70 bg-purple-50/40 backdrop-blur-sm">
      {caption && <div className="pointer-events-none absolute left-3.5 top-3 text-[11px] font-semibold uppercase tracking-wider text-purple-700">{caption}</div>}
      {W > 0 && (
        <svg width={W} height={H} className="block" role="img" aria-label={`${caption ?? "Revenue"}: from ${prefix}${fmt(vals[0])} to ${prefix}${fmt(vals[vals.length - 1])}`}>
          <defs>
            <linearGradient id={`${id}l`} x1="0" x2="1" y1="0" y2="0">
              <stop offset="0" style={{ stopColor: colors[0] }} />
              <stop offset="1" style={{ stopColor: colors[1] }} />
            </linearGradient>
            <linearGradient id={`${id}a`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" style={{ stopColor: colors[1], stopOpacity: 0.22 }} />
              <stop offset="1" style={{ stopColor: colors[1], stopOpacity: 0 }} />
            </linearGradient>
            <linearGradient id={`${id}m`} x1="0" x2="1" y1="0" y2="0">
              <stop offset="0" stopColor="#fff" stopOpacity="0.2" />
              <stop offset="1" stopColor="#fff" stopOpacity="1" />
            </linearGradient>
            <mask id={`${id}k`}><rect width={W} height={H} fill={`url(#${id}m)`} /></mask>
          </defs>
          {ticks.map((v) => (
            <g key={v}>
              <line x1={0} x2={W} y1={Y(v)} y2={Y(v)} stroke="rgba(147, 51, 234, 0.12)" strokeWidth={1} />
              <text x={W - 10} y={Y(v) - 5} textAnchor="end" fontSize={10} fill="#6b7280" className="font-semibold" style={{ fontFamily: mono }}>{compact(v)}</text>
            </g>
          ))}
          <path d={`${d}L${last[0]},${H}L${P[0][0]},${H}Z`} fill={`url(#${id}a)`} mask={`url(#${id}k)`} />
          <path
            d={d}
            pathLength={1}
            fill="none"
            stroke={`url(#${id}l)`}
            strokeWidth={2.8}
            strokeLinecap="round"
            style={{ strokeDasharray: 1, strokeDashoffset: drawn || reduce ? 0 : 1, transition: reduce ? "none" : "stroke-dashoffset 1.4s cubic-bezier(.3,.8,.2,1) .2s" }}
          />
          <circle cx={last[0]} cy={last[1]} r={10} style={{ fill: colors[1], opacity: 0.25 }} className="animate-ping" />
          <circle cx={last[0]} cy={last[1]} r={5} style={{ fill: colors[1] }} className="stroke-white shadow-md" strokeWidth={2.5} />
          {hover !== null && (
            <>
              <line x1={P[hover][0]} x2={P[hover][0]} y1={0} y2={H} className="stroke-purple-500/60" strokeWidth={1} strokeDasharray="3 3" />
              <circle cx={P[hover][0]} cy={P[hover][1]} r={5} style={{ fill: colors[1] }} className="stroke-white shadow-md" strokeWidth={2.5} />
            </>
          )}
          <rect width={W} height={H} fill="transparent" onPointerMove={move} onPointerLeave={() => { setHover(null); tip.current?.hide(); }} />
        </svg>
      )}
    </div>
  );
}

/* ---------------- B: desktop vs mobile waves ---------------- */

function SessionsChart({ desktop, mobile, labels, colors, tip }: { desktop: number[][]; mobile: number[][]; labels: { desktop: string; mobile: string; current: string }; colors: { desktop: [string, string]; mobile: [string, string] }; tip: TipRef }) {
  const [ref, { w: W, h: H }] = useSize();
  const reduce = useReducedMotion();
  const id = React.useId().replace(/:/g, "");
  const paths = React.useRef([] as (SVGPathElement | null)[]);
  const areaPaths = React.useRef([] as (SVGPathElement | null)[]);
  const [hover, setHover] = React.useState(null as number | null);
  const n = desktop[0]?.length ?? 0;
  const max = Math.max(1, ...desktop.flat(), ...mobile.flat());
  const pad = 18, mid = H / 2, amp = H / 2 - 14;
  const X = (i: number) => pad + 6 + (i / (n - 1)) * (W - 2 * pad - 12);
  const sets = React.useMemo(
    () => [
      ...desktop.map((a, k) => ({ a, dir: -1, k, g: "d" })),
      ...mobile.map((a, k) => ({ a, dir: 1, k, g: "m" })),
    ],
    [desktop, mobile],
  );

  React.useEffect(() => {
    if (!W || !H) return;
    let raf = 0;
    const t0 = performance.now();
    const frame = (now: number) => {
      const t = (now - t0) / 1000, grow = reduce ? 1 : ease(Math.min(1, t / 1.3));
      sets.forEach((s, j) => {
        const breathe = reduce ? 1 : 1 + Math.sin(t * 1.2 + s.k * 0.9) * 0.035;
        const P = s.a.map((v, i) => [X(i), mid + s.dir * (3 + (v / max) * amp * grow * breathe)] as [number, number]);
        const dStr = smooth(P);
        paths.current[j]?.setAttribute("d", dStr);
        if (s.k === 0 && P.length > 0) {
          const areaD = `${dStr} L${P[P.length - 1][0]},${mid} L${P[0][0]},${mid} Z`;
          areaPaths.current[j]?.setAttribute("d", areaD);
        }
      });
      if (!reduce) raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [W, H, sets, reduce, max, mid]);

  const move = (e: React.PointerEvent) => {
    const r = (e.currentTarget as SVGRectElement).ownerSVGElement!.getBoundingClientRect();
    const i = Math.max(0, Math.min(n - 1, Math.round(((e.clientX - r.left - pad - 6) / (W - 2 * pad - 12)) * (n - 1))));
    setHover(i);
    tip.current?.show(r.left + X(i), r.top + 12, {
      title: `${String(i % 24).padStart(2, "0")}:00 · ${labels.current}`,
      rows: [
        { label: labels.desktop, value: fmt(desktop[0][i]), color: colors.desktop[0] },
        { label: labels.mobile, value: fmt(mobile[0][i]), color: colors.mobile[1] },
      ],
    });
  };

  return (
    <div ref={ref} className="relative min-h-[140px] flex-1 overflow-hidden rounded-[20px] border border-purple-200/70 bg-gradient-to-br from-purple-50/50 via-white to-purple-50/30 backdrop-blur-sm">
      {W > 0 && (
        <svg width={W} height={H} className="block" role="img" aria-label={`${labels.desktop} and ${labels.mobile} by hour`}>
          <defs>
            <linearGradient id={`${id}d`} x1="0" x2="1" y1="0" y2="0">
              <stop offset=".1" style={{ stopColor: colors.desktop[0] }} />
              <stop offset=".9" style={{ stopColor: colors.desktop[1] }} />
            </linearGradient>
            <linearGradient id={`${id}m`} x1="0" x2="1" y1="0" y2="0">
              <stop offset=".15" style={{ stopColor: colors.mobile[0] }} />
              <stop offset=".85" style={{ stopColor: colors.mobile[1] }} />
            </linearGradient>
            <linearGradient id={`${id}d_area`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" style={{ stopColor: colors.desktop[0], stopOpacity: 0.22 }} />
              <stop offset="100%" style={{ stopColor: colors.desktop[1], stopOpacity: 0.03 }} />
            </linearGradient>
            <linearGradient id={`${id}m_area`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" style={{ stopColor: colors.mobile[0], stopOpacity: 0.03 }} />
              <stop offset="100%" style={{ stopColor: colors.mobile[1], stopOpacity: 0.22 }} />
            </linearGradient>
          </defs>
          {Array.from({ length: 9 }, (_, i) => 10 + ((H - 20) * i) / 8).map((y) => (
            <g key={y} stroke="rgba(147, 51, 234, 0.15)">
              <line x1={8} x2={14} y1={y} y2={y} strokeWidth={1} />
              <line x1={W - 14} x2={W - 8} y1={y} y2={y} strokeWidth={1} />
            </g>
          ))}
          <line x1={pad + 6} x2={W - pad - 6} y1={mid} y2={mid} stroke="rgba(147, 51, 234, 0.2)" strokeWidth={1} strokeDasharray="3 3" />
          {sets.map((s, j) => (
            <g key={`${s.g}${s.k}`}>
              {s.k === 0 && (
                <path
                  ref={(el) => { areaPaths.current[j] = el; }}
                  fill={`url(#${id}${s.g}_area)`}
                />
              )}
              <path
                ref={(el) => { paths.current[j] = el; }}
                fill="none"
                stroke={`url(#${id}${s.g})`}
                strokeWidth={s.k === 0 ? 2.8 : 1.6}
                strokeLinecap="round"
                opacity={s.k === 0 ? 1 : s.k === 1 ? 0.45 : 0.25}
              />
            </g>
          ))}
          {hover !== null && <line x1={X(hover)} x2={X(hover)} y1={4} y2={H - 4} stroke="rgba(147, 51, 234, 0.4)" strokeWidth={1} strokeDasharray="3 3" />}
          <rect width={W} height={H} fill="transparent" onPointerMove={move} onPointerLeave={() => { setHover(null); tip.current?.hide(); }} />
        </svg>
      )}
    </div>
  );
}

/* ---------------- C: treemap ---------------- */

type Rect = { name: string; group: string; v: number; x: number; y: number; w: number; h: number };
function squarify(items: { name: string; group: string; v: number }[], x: number, y: number, w: number, h: number): Rect[] {
  const total = items.reduce((a, b) => a + b.v, 0) || 1, scale = (w * h) / total, out: Rect[] = [];
  let rest = items.map((i) => ({ ...i, a: i.v * scale }));
  const worst = (row: typeof rest, len: number) => {
    const s = row.reduce((a, b) => a + b.a, 0), mx = Math.max(...row.map((r) => r.a)), mn = Math.min(...row.map((r) => r.a));
    return Math.max((len * len * mx) / (s * s), (s * s) / (len * len * mn));
  };
  while (rest.length) {
    const len = Math.min(w, h);
    const row = [rest[0]];
    let i = 1;
    while (i < rest.length && worst([...row, rest[i]], len) <= worst(row, len)) row.push(rest[i++]);
    rest = rest.slice(i);
    const s = row.reduce((a, b) => a + b.a, 0);
    if (w >= h) { const cw = s / h; let cy = y; for (const r of row) { const rh = r.a / cw; out.push({ ...r, x, y: cy, w: cw, h: rh }); cy += rh; } x += cw; w -= cw; }
    else { const rh = s / w; let cx = x; for (const r of row) { const rw = r.a / rh; out.push({ ...r, x: cx, y, w: rw, h: rh }); cx += rw; } y += rh; h -= rh; }
  }
  return out;
}

/* ---------------- C: Modern SaaS Category Operations ---------------- */

export type CategoryKey = "cleaning" | "electrical" | "plumbing" | "ewaste" | "hvac";

export interface CategoryConfig {
  name: string;
  fill: string;
  border: string;
  text: string;
  iconColor: string;
  badgeBg: string;
  badgeText: string;
  dot: string;
  progress: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
}

export const CATEGORY_CONFIG: Record<string, CategoryConfig> = {
  cleaning: {
    name: "Cleaning",
    fill: "#EFF6FF",
    border: "1.5px solid #93C5FD",
    text: "#1D4ED8",
    iconColor: "#1D4ED8",
    badgeBg: "#DBEAFE",
    badgeText: "#1D4ED8",
    dot: "#1D4ED8",
    progress: "bg-blue-500",
    icon: Sparkles,
  },
  electrical: {
    name: "Electrical",
    fill: "#FFFBEB",
    border: "1.5px solid #FCD34D",
    text: "#B45309",
    iconColor: "#B45309",
    badgeBg: "#FEF3C7",
    badgeText: "#B45309",
    dot: "#B45309",
    progress: "bg-amber-500",
    icon: Zap,
  },
  plumbing: {
    name: "Plumbing",
    fill: "#ECFDF5",
    border: "1.5px solid #6EE7B7",
    text: "#047857",
    iconColor: "#047857",
    badgeBg: "#D1FAE5",
    badgeText: "#047857",
    dot: "#047857",
    progress: "bg-emerald-500",
    icon: Droplets,
  },
  ewaste: {
    name: "E-Waste",
    fill: "#F5F3FF",
    border: "1.5px solid #C4B5FD",
    text: "#6D28D9",
    iconColor: "#6D28D9",
    badgeBg: "#EDE9FE",
    badgeText: "#6D28D9",
    dot: "#6D28D9",
    progress: "bg-purple-500",
    icon: Cpu,
  },
  hvac: {
    name: "HVAC & Ops",
    fill: "#FFF1F2",
    border: "1.5px solid #FDA4AF",
    text: "#BE123C",
    iconColor: "#BE123C",
    badgeBg: "#FFE4E6",
    badgeText: "#BE123C",
    dot: "#BE123C",
    progress: "bg-rose-500",
    icon: Wind,
  },
};

const FALLBACK_PALETTES: CategoryConfig[] = [
  {
    name: "General",
    fill: "#EFF6FF",
    border: "1.5px solid #93C5FD",
    text: "#1D4ED8",
    iconColor: "#1D4ED8",
    badgeBg: "#DBEAFE",
    badgeText: "#1D4ED8",
    dot: "#1D4ED8",
    progress: "bg-blue-500",
    icon: Sparkles,
  },
  {
    name: "General",
    fill: "#FAF5FF",
    border: "1.5px solid #C084FC",
    text: "#7E22CE",
    iconColor: "#7E22CE",
    badgeBg: "#F3E8FF",
    badgeText: "#7E22CE",
    dot: "#9333EA",
    progress: "bg-purple-500",
    icon: Layers,
  },
  {
    name: "General",
    fill: "#ECFDF5",
    border: "1.5px solid #6EE7B7",
    text: "#047857",
    iconColor: "#047857",
    badgeBg: "#D1FAE5",
    badgeText: "#047857",
    dot: "#10B981",
    progress: "bg-emerald-500",
    icon: Droplets,
  },
  {
    name: "General",
    fill: "#FFF7ED",
    border: "1.5px solid #FED7AA",
    text: "#C2410C",
    iconColor: "#C2410C",
    badgeBg: "#FFEDD5",
    badgeText: "#C2410C",
    dot: "#EA580C",
    progress: "bg-orange-500",
    icon: Layers,
  },
  {
    name: "General",
    fill: "#F0FDFA",
    border: "1.5px solid #5EEAD4",
    text: "#0F766E",
    iconColor: "#0F766E",
    badgeBg: "#CCFBF1",
    badgeText: "#0F766E",
    dot: "#14B8A6",
    progress: "bg-teal-500",
    icon: Layers,
  },
];

export function getCategoryConfig(group: string) {
  const g = group.toLowerCase();
  if (g.includes("clean") || g.includes("sanit")) return CATEGORY_CONFIG.cleaning;
  if (g.includes("electr") || g.includes("generator") || g.includes("circuit") || g.includes("power") || g.includes("emergency")) return CATEGORY_CONFIG.electrical;
  if (g.includes("plumb") || g.includes("pipe") || g.includes("drain") || g.includes("pressure") || g.includes("water")) return CATEGORY_CONFIG.plumbing;
  if (g.includes("waste") || g.includes("battery") || g.includes("server") || g.includes("hardware") || g.includes("tech")) return CATEGORY_CONFIG.ewaste;
  if (g.includes("hvac") || g.includes("air") || g.includes("chiller") || g.includes("cool") || g.includes("heat") || g.includes("ops")) return CATEGORY_CONFIG.hvac;

  // Dynamic deterministic palette for any custom user category
  let hash = 0;
  for (let i = 0; i < group.length; i++) {
    hash = (hash << 5) - hash + group.charCodeAt(i);
    hash |= 0;
  }
  const idx = Math.abs(hash) % FALLBACK_PALETTES.length;
  return FALLBACK_PALETTES[idx];
}

export const CategoryIcon = ({ group, className = "size-3.5" }: { group: string; className?: string }) => {
  const config = getCategoryConfig(group);
  const Icon = config.icon;
  return <Icon className={className} style={{ color: config.iconColor }} />;
};

export const ITEM_SHORT_NAMES: Record<string, string> = {
  "Generator Line": "Generator",
  "Deep Sanitization": "Deep Clean",
  "Main Pipe Leak": "Main Pipe",
  "Drainage Backflow": "Drainage",
  "Circuit Diagnostic": "Circuit",
  "Battery Recovery": "Battery",
  "Duct Air Filter": "Air Filter",
  "Pressure Cleaning": "Pressure",
  "Chiller Coil Line": "Chiller",
  "Server Hardware": "Servers",
  "Emergency Line": "Emergency",
  "Generator": "Generator",
  "Deep Clean": "Deep Clean",
  "Main Pipe": "Main Pipe",
  "Drainage": "Drainage",
  "Circuit": "Circuit",
  "Battery": "Battery",
  "Air Filter": "Air Filter",
  "Pressure": "Pressure",
  "Chiller": "Chiller",
  "Servers": "Servers",
  "Emergency": "Emergency",
};

interface SimNode {
  name: string;
  shortName: string;
  group: string;
  v: number;
  share: string;
  r: number;
  targetR: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  config: (typeof CATEGORY_CONFIG)[string];
}

/* ---------------- C1: Exact Match Balloon Color Configurations ---------------- */

export const BALLOON_COLOR_MAP: Record<string, {
  fill: string;
  border: string;
  text: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  stringColor: string;
}> = {
  // 1. GENERATOR (Golden Amber / Warm Gold)
  "Generator Line": {
    fill: "#FFFDF5",
    border: "2px solid #FCD34D",
    text: "#78350F",
    badgeBg: "#FEF3C7",
    badgeText: "#92400E",
    badgeBorder: "#FDE68A",
    stringColor: "#D97706",
  },
  "Generator": {
    fill: "#FFFDF5",
    border: "2px solid #FCD34D",
    text: "#78350F",
    badgeBg: "#FEF3C7",
    badgeText: "#92400E",
    badgeBorder: "#FDE68A",
    stringColor: "#D97706",
  },

  // 2. DEEP CLEAN (Sky Blue)
  "Deep Sanitization": {
    fill: "#F0F9FF",
    border: "2px solid #38BDF8",
    text: "#0284C7",
    badgeBg: "#E0F2FE",
    badgeText: "#0369A1",
    badgeBorder: "#BAE6FD",
    stringColor: "#0284C7",
  },
  "Deep Clean": {
    fill: "#F0F9FF",
    border: "2px solid #38BDF8",
    text: "#0284C7",
    badgeBg: "#E0F2FE",
    badgeText: "#0369A1",
    badgeBorder: "#BAE6FD",
    stringColor: "#0284C7",
  },

  // 3. MAIN PIPE (Emerald / Mint Green)
  "Main Pipe Leak": {
    fill: "#ECFDF5",
    border: "2px solid #34D399",
    text: "#047857",
    badgeBg: "#D1FAE5",
    badgeText: "#065F46",
    badgeBorder: "#A7F3D0",
    stringColor: "#10B981",
  },
  "Main Pipe": {
    fill: "#ECFDF5",
    border: "2px solid #34D399",
    text: "#047857",
    badgeBg: "#D1FAE5",
    badgeText: "#065F46",
    badgeBorder: "#A7F3D0",
    stringColor: "#10B981",
  },

  // 4. DRAINAGE (Forest Sea Green)
  "Drainage Backflow": {
    fill: "#F0FDF4",
    border: "2px solid #6EE7B7",
    text: "#15803D",
    badgeBg: "#DCFCE7",
    badgeText: "#166534",
    badgeBorder: "#86EFAC",
    stringColor: "#059669",
  },
  "Drainage": {
    fill: "#F0FDF4",
    border: "2px solid #6EE7B7",
    text: "#15803D",
    badgeBg: "#DCFCE7",
    badgeText: "#166534",
    badgeBorder: "#86EFAC",
    stringColor: "#059669",
  },

  // 5. CIRCUIT (Peach / Orange Gold)
  "Circuit Diagnostic": {
    fill: "#FFF7ED",
    border: "2px solid #FB923C",
    text: "#C2410C",
    badgeBg: "#FFEDD5",
    badgeText: "#9A3412",
    badgeBorder: "#FED7AA",
    stringColor: "#EA580C",
  },
  "Circuit": {
    fill: "#FFF7ED",
    border: "2px solid #FB923C",
    text: "#C2410C",
    badgeBg: "#FFEDD5",
    badgeText: "#9A3412",
    badgeBorder: "#FED7AA",
    stringColor: "#EA580C",
  },

  // 6. BATTERY (Vibrant Violet / Lavender)
  "Battery Recovery": {
    fill: "#FAF5FF",
    border: "2px solid #C084FC",
    text: "#6B21A8",
    badgeBg: "#F3E8FF",
    badgeText: "#581C87",
    badgeBorder: "#E9D5FF",
    stringColor: "#9333EA",
  },
  "Battery": {
    fill: "#FAF5FF",
    border: "2px solid #C084FC",
    text: "#6B21A8",
    badgeBg: "#F3E8FF",
    badgeText: "#581C87",
    badgeBorder: "#E9D5FF",
    stringColor: "#9333EA",
  },

  // 7. AIR FILTER (Rose / Crimson)
  "Duct Air Filter": {
    fill: "#FFF1F2",
    border: "2px solid #FB7185",
    text: "#BE123C",
    badgeBg: "#FFE4E6",
    badgeText: "#9F1239",
    badgeBorder: "#FECDD3",
    stringColor: "#E11D48",
  },
  "Air Filter": {
    fill: "#FFF1F2",
    border: "2px solid #FB7185",
    text: "#BE123C",
    badgeBg: "#FFE4E6",
    badgeText: "#9F1239",
    badgeBorder: "#FECDD3",
    stringColor: "#E11D48",
  },

  // 8. PRESSURE (Jade / Cyan Teal)
  "Pressure Cleaning": {
    fill: "#F0FDFA",
    border: "2px solid #2DD4BF",
    text: "#0F766E",
    badgeBg: "#CCFBF1",
    badgeText: "#115E59",
    badgeBorder: "#99F6E4",
    stringColor: "#0D9488",
  },
  "Pressure": {
    fill: "#F0FDFA",
    border: "2px solid #2DD4BF",
    text: "#0F766E",
    badgeBg: "#CCFBF1",
    badgeText: "#115E59",
    badgeBorder: "#99F6E4",
    stringColor: "#0D9488",
  },

  // 9. CHILLER (Coral / Rose Red)
  "Chiller Coil Line": {
    fill: "#FFF1F2",
    border: "2px solid #FDA4AF",
    text: "#9F1239",
    badgeBg: "#FFE4E6",
    badgeText: "#881337",
    badgeBorder: "#FECDD3",
    stringColor: "#F43F5E",
  },
  "Chiller": {
    fill: "#FFF1F2",
    border: "2px solid #FDA4AF",
    text: "#9F1239",
    badgeBg: "#FFE4E6",
    badgeText: "#881337",
    badgeBorder: "#FECDD3",
    stringColor: "#F43F5E",
  },

  // 10. SERVERS (Royal Indigo / Purple)
  "Server Hardware": {
    fill: "#F5F3FF",
    border: "2px solid #A78BFA",
    text: "#4F46E5",
    badgeBg: "#EDE9FE",
    badgeText: "#4338CA",
    badgeBorder: "#DDD6FE",
    stringColor: "#6366F1",
  },
  "Servers": {
    fill: "#F5F3FF",
    border: "2px solid #A78BFA",
    text: "#4F46E5",
    badgeBg: "#EDE9FE",
    badgeText: "#4338CA",
    badgeBorder: "#DDD6FE",
    stringColor: "#6366F1",
  },

  // 11. EMERGENCY (Warm Amber / Yellow)
  "Emergency Line": {
    fill: "#FEFCE8",
    border: "2px solid #FCD34D",
    text: "#B45309",
    badgeBg: "#FEF9C3",
    badgeText: "#78350F",
    badgeBorder: "#FDE047",
    stringColor: "#D97706",
  },
  "Emergency": {
    fill: "#FEFCE8",
    border: "2px solid #FCD34D",
    text: "#B45309",
    badgeBg: "#FEF9C3",
    badgeText: "#78350F",
    badgeBorder: "#FDE047",
    stringColor: "#D97706",
  },
};

export function getBalloonColor(name: string, group: string) {
  if (BALLOON_COLOR_MAP[name]) return BALLOON_COLOR_MAP[name];
  const short = ITEM_SHORT_NAMES[name];
  if (short && BALLOON_COLOR_MAP[short]) return BALLOON_COLOR_MAP[short];
  const cat = getCategoryConfig(group);
  return {
    fill: cat.fill,
    border: cat.border,
    text: cat.text,
    badgeBg: cat.badgeBg,
    badgeText: cat.badgeText,
    badgeBorder: cat.border.split(" ")[2] || "#cbd5e1",
    stringColor: cat.dot,
  };
}

/* ---------------- Smooth Numbering Animation Component ---------------- */

export function AnimatedNumber({ value }: { value: number }) {
  const [displayValue, setDisplayValue] = React.useState(value);
  const prevValue = React.useRef(value);

  React.useEffect(() => {
    const startVal = prevValue.current;
    const endVal = value;
    if (startVal === endVal) {
      setDisplayValue(endVal);
      return;
    }

    const duration = 650;
    const startTime = performance.now();

    const update = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      const easeVal = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(startVal + (endVal - startVal) * easeVal);
      setDisplayValue(current);

      if (progress < 1) {
        requestAnimationFrame(update);
      } else {
        prevValue.current = endVal;
        setDisplayValue(endVal);
      }
    };

    const animId = requestAnimationFrame(update);
    return () => cancelAnimationFrame(animId);
  }, [value]);

  return <span className="tabular-nums">{fmt(displayValue)}</span>;
}

/* ---------------- C1: Full-Scale Operational Balloon Canvas ---------------- */

const ARENA_CANVAS_HEIGHT = 500;

interface BalloonNode {
  name: string;
  shortName: string;
  group: string;
  v: number;
  share: string;
  r: number;
  targetR: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  anchorX: number;
  anchorY: number;
  colorConfig: ReturnType<typeof getBalloonColor>;
  rankIndex: number;
  isTop3: boolean;
}

function getBalloonAnchor(idx: number, totalCount: number, W: number, H: number): { x: number; y: number } {
  const isDesktop = W >= 640;
  if (isDesktop) {
    if (totalCount <= 1) {
      return { x: W * 0.50, y: H * 0.46 };
    }
    if (totalCount === 2) {
      return idx === 0 ? { x: W * 0.38, y: H * 0.46 } : { x: W * 0.62, y: H * 0.46 };
    }
    if (totalCount === 3) {
      if (idx === 0) return { x: W * 0.50, y: H * 0.35 };
      if (idx === 1) return { x: W * 0.33, y: H * 0.60 };
      return { x: W * 0.67, y: H * 0.60 };
    }
    if (totalCount === 4) {
      if (idx === 0) return { x: W * 0.36, y: H * 0.35 };
      if (idx === 1) return { x: W * 0.64, y: H * 0.35 };
      if (idx === 2) return { x: W * 0.36, y: H * 0.65 };
      return { x: W * 0.64, y: H * 0.65 };
    }
    if (totalCount === 5) {
      switch (idx) {
        // #1 Center stage focal point (e.g. HVAC & Thermal Service)
        case 0:
          return { x: W * 0.50, y: H * 0.46 };
        // #2 Bottom-left wing (Electrical Diagnostic)
        case 1:
          return { x: W * 0.31, y: H * 0.62 };
        // #3 Top-left wing (Plumbing Line Repair)
        case 2:
          return { x: W * 0.31, y: H * 0.28 };
        // #4 Top-right wing (Cleaning Operations)
        case 3:
          return { x: W * 0.69, y: H * 0.30 };
        // #5 Bottom-right wing (E-Waste Recycling)
        case 4:
        default:
          return { x: W * 0.69, y: H * 0.64 };
      }
    }

    if (totalCount === 6) {
      switch (idx) {
        case 0: return { x: W * 0.50, y: H * 0.44 };
        case 1: return { x: W * 0.32, y: H * 0.32 };
        case 2: return { x: W * 0.68, y: H * 0.32 };
        case 3: return { x: W * 0.22, y: H * 0.64 };
        case 4: return { x: W * 0.50, y: H * 0.70 };
        case 5: default: return { x: W * 0.78, y: H * 0.64 };
      }
    }

    if (totalCount === 7) {
      switch (idx) {
        case 0: return { x: W * 0.50, y: H * 0.44 };
        case 1: return { x: W * 0.32, y: H * 0.30 };
        case 2: return { x: W * 0.68, y: H * 0.30 };
        case 3: return { x: W * 0.18, y: H * 0.58 };
        case 4: return { x: W * 0.38, y: H * 0.68 };
        case 5: return { x: W * 0.62, y: H * 0.68 };
        case 6: default: return { x: W * 0.82, y: H * 0.58 };
      }
    }

    // 8+ fleet
    switch (idx) {
      case 0: return { x: W * 0.35, y: H * 0.48 };
      case 1: return { x: W * 0.20, y: H * 0.68 };
      case 2: return { x: W * 0.20, y: H * 0.28 };
      case 3: return { x: W * 0.52, y: H * 0.30 };
      case 4: return { x: W * 0.68, y: H * 0.26 };
      case 5: return { x: W * 0.84, y: H * 0.30 };
      case 6: return { x: W * 0.52, y: H * 0.65 };
      case 7: return { x: W * 0.68, y: H * 0.68 };
      case 8: return { x: W * 0.84, y: H * 0.65 };
      default: return { x: W * 0.50, y: H * 0.48 };
    }
  } else {
    // Mobile / Tablet screens (W < 640)
    if (totalCount <= 1) {
      return { x: W * 0.50, y: H * 0.46 };
    }
    if (totalCount === 2) {
      return idx === 0 ? { x: W * 0.50, y: H * 0.30 } : { x: W * 0.50, y: H * 0.62 };
    }
    if (totalCount === 3) {
      if (idx === 0) return { x: W * 0.50, y: H * 0.25 };
      if (idx === 1) return { x: W * 0.32, y: H * 0.58 };
      return { x: W * 0.68, y: H * 0.58 };
    }
    if (totalCount === 4) {
      if (idx === 0) return { x: W * 0.34, y: H * 0.32 };
      if (idx === 1) return { x: W * 0.66, y: H * 0.32 };
      if (idx === 2) return { x: W * 0.34, y: H * 0.68 };
      return { x: W * 0.66, y: H * 0.68 };
    }
    if (totalCount === 5) {
      switch (idx) {
        case 0: return { x: W * 0.50, y: H * 0.22 };
        case 1: return { x: W * 0.30, y: H * 0.46 };
        case 2: return { x: W * 0.70, y: H * 0.46 };
        case 3: return { x: W * 0.30, y: H * 0.72 };
        case 4: default: return { x: W * 0.70, y: H * 0.72 };
      }
    }
    switch (idx) {
      case 0: return { x: W * 0.50, y: H * 0.20 };
      case 1: return { x: W * 0.24, y: H * 0.34 };
      case 2: return { x: W * 0.76, y: H * 0.34 };
      case 3: return { x: W * 0.24, y: H * 0.52 };
      case 4: return { x: W * 0.50, y: H * 0.50 };
      case 5: return { x: W * 0.76, y: H * 0.52 };
      case 6: return { x: W * 0.24, y: H * 0.70 };
      case 7: return { x: W * 0.50, y: H * 0.68 };
      case 8: return { x: W * 0.76, y: H * 0.70 };
      default: return { x: W * 0.50, y: H * 0.85 };
    }
  }
}

function UnifiedBalloonCanvas({
  items,
  total,
  activeGroup,
  currency = "PTS",
  height = ARENA_CANVAS_HEIGHT,
}: {
  items: Array<{ name: string; group: string; v: number }>;
  total: number;
  activeGroup: string | null;
  currency?: string;
  height?: number;
}) {
  const [ref, { w: W }] = useSize();
  const nodesRef = React.useRef<BalloonNode[]>([]);
  const balloonEls = React.useRef<(HTMLDivElement | null)[]>([]);
  const [hoveredNode, setHoveredNode] = React.useState<BalloonNode | null>(null);
  const [tooltipPos, setTooltipPos] = React.useState({ x: 0, y: 0 });
  const dragRef = React.useRef<{
    index: number;
    lastX: number;
    lastY: number;
    lastTime: number;
    vx: number;
    vy: number;
  } | null>(null);
  const hoveredRef = React.useRef<number | null>(null);

  const effectiveW = W || 360;
  // Always lock height to fixed arena height to guarantee the box NEVER closes or collapses
  const effectiveH = height || ARENA_CANVAS_HEIGHT;

  // Initialize and synchronize floating physics nodes
  React.useEffect(() => {
    if (!effectiveW || !effectiveH || items.length === 0) return;

    // Responsive scaling with generous size boost for 5 items to fill space
    const sizeMultiplier = items.length <= 5 ? (effectiveW < 600 ? 1.05 : 1.45) : items.length <= 7 ? (effectiveW < 600 ? 0.95 : 1.25) : 1.0;
    const baseScale = Math.min(1.25, Math.max(effectiveW < 600 ? 0.5 : 0.85, Math.min(effectiveW / 960, effectiveH / 480)));
    const scale = baseScale * sizeMultiplier;

    const currentNodes = nodesRef.current;
    const isFirstInit = currentNodes.length === 0;

    const nextNodes: BalloonNode[] = items.map((item, idx) => {
      const colorConfig = getBalloonColor(item.name, item.group);
      const shortName = ITEM_SHORT_NAMES[item.name] || item.name;
      const isTop3 = idx < 3;

      // Prominently sized balloons to command the screen and eliminate empty voids
      let baseR = 56;
      if (idx === 0) baseR = 76;
      else if (idx === 1) baseR = 70;
      else if (idx === 2) baseR = 66;
      else if (idx === 3) baseR = 58;
      else if (idx === 4) baseR = 54;
      else {
        baseR = 48 + ((items.length - 1 - idx) / Math.max(1, items.length - 3)) * 10;
      }

      const targetR = Math.round(baseR * scale);
      const share = (((Number(item?.v) || 0) / (total || 1)) * 100).toFixed(2).replace(/\.?0+$/, "");
      const anchor = getBalloonAnchor(idx, items.length, effectiveW, effectiveH);

      const existing = currentNodes.find((n) => n.name === item.name);
      if (existing) {
        existing.v = item.v;
        existing.share = share;
        existing.targetR = targetR;
        existing.colorConfig = colorConfig;
        existing.shortName = shortName;
        existing.rankIndex = idx;
        existing.isTop3 = isTop3;
        existing.anchorX = anchor.x;
        existing.anchorY = anchor.y;
        return existing;
      }

      const speed = 0.12 + Math.random() * 0.08;
      const moveAngle = Math.random() * Math.PI * 2;

      return {
        name: item.name,
        shortName,
        group: item.group,
        v: item.v,
        share,
        r: targetR,
        targetR,
        x: anchor.x,
        y: anchor.y,
        vx: Math.cos(moveAngle) * speed,
        vy: Math.sin(moveAngle) * speed,
        anchorX: anchor.x,
        anchorY: anchor.y,
        colorConfig,
        rankIndex: idx,
        isTop3,
      };
    });

    if (isFirstInit) {
      for (let iter = 0; iter < 80; iter++) {
        for (let i = 0; i < nextNodes.length; i++) {
          for (let j = i + 1; j < nextNodes.length; j++) {
            const a = nextNodes[i];
            const b = nextNodes[j];
            const dx = b.x - a.x;
            const dy = b.y - a.y;
            const dist = Math.hypot(dx, dy) || 0.001;
            const minDist = a.r + b.r + 16;
            if (dist < minDist) {
              const overlap = (minDist - dist) * 0.5;
              const nx = dx / dist;
              const ny = dy / dist;
              a.x -= nx * overlap;
              a.y -= ny * overlap;
              b.x += nx * overlap;
              b.y += ny * overlap;
            }
          }
        }
      }
    }

    nodesRef.current = nextNodes;
  }, [items, total, effectiveW, effectiveH]);

  // 60fps Floating Physics Loop (Continuous Serene Floating & Organic Bobbing)
  React.useEffect(() => {
    let animId: number;
    let lastTick = performance.now();

    const tick = (now: number) => {
      const dt = Math.min(32, now - lastTick) / 16.666;
      lastTick = now;

      const nodes = nodesRef.current;
      const width = effectiveW;
      const height = effectiveH;

      if (width > 0 && height > 0 && nodes.length > 0) {
        const draggingIdx = dragRef.current?.index ?? -1;
        const hoveredIdx = hoveredRef.current;

        const t = now * 0.0002;
        for (let i = 0; i < nodes.length; i++) {
          const n = nodes[i];
          n.r += (n.targetR - n.r) * 0.08 * dt;

          if (i === draggingIdx) continue;

          // Gentle pull toward its own distinct dedicated anchor in 2D space
          n.vx += (n.anchorX - n.x) * 0.00028 * dt;
          n.vy += (n.anchorY - n.y) * 0.00028 * dt;

          // Serene organic wave drift (gentle floating bob)
          const driftX = (Math.sin(t * 0.65 + i * 1.5) + Math.cos(t * 0.35 + i * 0.8)) * 0.006;
          const driftY = (Math.cos(t * 0.55 + i * 1.8) + Math.sin(t * 0.25 + i * 1.1)) * 0.006;
          n.vx += driftX * dt;
          n.vy += driftY * dt;
        }

        // Pairwise rigid collision repulsion & immediate positional separation (STRICTLY PREVENTS OVERLAP / ACCORDION CLOSING)
        for (let i = 0; i < nodes.length; i++) {
          for (let j = i + 1; j < nodes.length; j++) {
            const a = nodes[i];
            const b = nodes[j];
            const dx = b.x - a.x;
            const dy = b.y - a.y;
            const dist = Math.hypot(dx, dy) || 0.001;
            const minDist = a.r + b.r + 14; // Strict separation margin
            if (dist < minDist) {
              const overlap = minDist - dist;
              const nx = dx / dist;
              const ny = dy / dist;

              // Immediate geometric separation strictly prevents overlapping / accordion closing
              if (i !== draggingIdx && j !== draggingIdx) {
                a.x -= nx * overlap * 0.5;
                a.y -= ny * overlap * 0.5;
                b.x += nx * overlap * 0.5;
                b.y += ny * overlap * 0.5;
              } else if (i === draggingIdx) {
                b.x += nx * overlap;
                b.y += ny * overlap;
              } else {
                a.x -= nx * overlap;
                a.y -= ny * overlap;
              }

              // Elastic bounce
              const relVx = b.vx - a.vx;
              const relVy = b.vy - a.vy;
              const velAlongNormal = relVx * nx + relVy * ny;
              if (velAlongNormal < 0) {
                const impulse = -velAlongNormal * 0.5;
                if (i !== draggingIdx) {
                  a.vx -= nx * impulse;
                  a.vy -= ny * impulse;
                }
                if (j !== draggingIdx) {
                  b.vx += nx * impulse;
                  b.vy += ny * impulse;
                }
              }
            }
          }
        }

        // Boundary containment
        const pad = 12;
        const topPad = 18;
        const bottomPad = 34;
        for (let i = 0; i < nodes.length; i++) {
          const n = nodes[i];
          if (i === draggingIdx) continue;

          if (n.x - n.r < pad) {
            n.x = pad + n.r;
            n.vx = Math.abs(n.vx) * 0.3 + 0.01;
          } else if (n.x + n.r > width - pad) {
            n.x = width - pad - n.r;
            n.vx = -Math.abs(n.vx) * 0.3 - 0.01;
          }

          if (n.y - n.r < topPad) {
            n.y = topPad + n.r;
            n.vy = Math.abs(n.vy) * 0.3 + 0.01;
          } else if (n.y + n.r > height - bottomPad) {
            n.y = height - bottomPad - n.r;
            n.vy = -Math.abs(n.vy) * 0.3 - 0.01;
          }

          n.vx *= Math.pow(0.97, dt);
          n.vy *= Math.pow(0.97, dt);

          const speed = Math.hypot(n.vx, n.vy);
          if (speed > 0.18) {
            n.vx = (n.vx / speed) * 0.18;
            n.vy = (n.vy / speed) * 0.18;
          }

          n.x += n.vx * dt;
          n.y += n.vy * dt;
        }

        // Direct DOM transform updates for 60fps buttery-smooth motion
        for (let i = 0; i < nodes.length; i++) {
          const n = nodes[i];
          const el = balloonEls.current[i];
          if (el) {
            const isHovered = i === hoveredIdx;
            const isDragging = i === draggingIdx;
            const isFiltered = activeGroup && n.group !== activeGroup;

            const scale = isDragging ? 1.08 : isHovered ? 1.05 : isFiltered ? 0.25 : 1.0;
            const opacity = isFiltered ? "0.25" : "1";
            const zIndex = isDragging ? "50" : isHovered ? "40" : isFiltered ? "5" : n.isTop3 ? "20" : "15";

            const balloonH = Math.round(n.r * 2.14);
            el.style.transform = `translate3d(${n.x - n.r}px, ${n.y - n.r}px, 0) scale(${scale})`;
            el.style.width = `${n.r * 2}px`;
            el.style.height = `${balloonH}px`;
            el.style.opacity = opacity;
            el.style.zIndex = zIndex;
          }
        }
      }

      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [effectiveW, effectiveH, activeGroup]);

  // Pointer event handlers for toss & drag
  const handlePointerDown = (index: number, e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = {
      index,
      lastX: e.clientX,
      lastY: e.clientY,
      lastTime: performance.now(),
      vx: 0,
      vy: 0,
    };
  };

  const handlePointerMove = (index: number, e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (drag && drag.index === index) {
      const container = ref.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const node = nodesRef.current[index];
      if (!node) return;

      const currentX = e.clientX;
      const currentY = e.clientY;
      const now = performance.now();
      const dt = Math.max(1, now - drag.lastTime);

      drag.vx = ((currentX - drag.lastX) / dt) * 12;
      drag.vy = ((currentY - drag.lastY) / dt) * 12;
      drag.lastX = currentX;
      drag.lastY = currentY;
      drag.lastTime = now;

      node.x = currentX - rect.left;
      node.y = currentY - rect.top;
      node.vx = 0;
      node.vy = 0;
    }

    const node = nodesRef.current[index];
    if (node) {
      setHoveredNode(node);
      setTooltipPos({ x: e.clientX, y: e.clientY });
    }
  };

  const handlePointerUp = (index: number, e: React.PointerEvent<HTMLDivElement>) => {
    if (dragRef.current && dragRef.current.index === index) {
      const node = nodesRef.current[index];
      if (node) {
        const clamp = (val: number, min: number, max: number) => Math.min(Math.max(val, min), max);
        node.vx = clamp(dragRef.current.vx, -1.5, 1.5);
        node.vy = clamp(dragRef.current.vy, -1.5, 1.5);
      }
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {}
      dragRef.current = null;
    }
  };

  return (
    <div
      ref={ref}
      style={{ height: `${effectiveH}px`, minHeight: `${effectiveH}px` }}
      className="relative w-full h-[500px] min-h-[500px] overflow-hidden rounded-xl border border-slate-200/85 bg-gradient-to-b from-slate-50/60 via-white to-slate-50/40 select-none touch-none shadow-inner"
    >
      {/* Ambient radial glow centered and balanced across canvas */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_50%_50%,rgba(243,232,255,0.25)_0%,rgba(254,243,199,0.18)_45%,transparent_75%)]" />

      {/* All Balloons */}
      {items.map((item, idx) => {
        const colorConfig = getBalloonColor(item.name, item.group);
        const shortName = ITEM_SHORT_NAMES[item.name] || item.name;
        const node = nodesRef.current[idx];
        const isTop3 = idx < 3;
        const initialR = node?.r || (isTop3 ? 98 : 78);
        const balloonH = Math.round(initialR * 2.14);
        const share = (((Number(item?.v) || 0) / (total || 1)) * 100).toFixed(2).replace(/\.?0+$/, "");

        return (
          <div
            key={item.name}
            ref={(el) => {
              balloonEls.current[idx] = el;
            }}
            className="absolute top-0 left-0 rounded-[50%_50%_50%_50%_/_44%_44%_56%_56%] cursor-grab active:cursor-grabbing will-change-transform select-none touch-none hover:scale-105 transition-transform duration-200 group"
            style={{
              width: `${initialR * 2}px`,
              height: `${balloonH}px`,
              backgroundColor: colorConfig.fill,
              border: colorConfig.border,
              boxShadow: `0 8px 20px -4px ${colorConfig.stringColor}25, 0 2px 6px -1px rgba(0, 0, 0, 0.05)`,
              transform: node ? `translate3d(${node.x - initialR}px, ${node.y - initialR}px, 0)` : undefined,
            }}
            onPointerDown={(e) => handlePointerDown(idx, e)}
            onPointerMove={(e) => handlePointerMove(idx, e)}
            onPointerUp={(e) => handlePointerUp(idx, e)}
            onPointerCancel={(e) => handlePointerUp(idx, e)}
            onPointerEnter={(e) => {
              hoveredRef.current = idx;
              if (nodesRef.current[idx]) {
                setHoveredNode(nodesRef.current[idx]);
                setTooltipPos({ x: e.clientX, y: e.clientY });
              }
            }}
            onPointerLeave={() => {
              if (hoveredRef.current === idx) {
                hoveredRef.current = null;
                setHoveredNode(null);
              }
            }}
          >
            {/* 3D Balloon Glossy Light Highlights */}
            <div className="absolute top-2.5 left-3 w-4 h-7 rounded-full bg-white/50 blur-[0.4px] -rotate-12 pointer-events-none" />
            <div className="absolute top-1.5 left-4 w-1.5 h-1.5 rounded-full bg-white/70 pointer-events-none" />
            <div 
              className="absolute inset-0 rounded-[50%_50%_50%_50%_/_44%_44%_56%_56%] pointer-events-none"
              style={{
                background: "radial-gradient(circle at 35% 25%, rgba(255,255,255,0.45) 0%, transparent 60%)"
              }}
            />

            {/* Balloon Content: Name, Animated Value, PTS, Percentage */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-1 select-none pointer-events-none z-10 pb-3">
              {/* Clean Numbering Rank Badge for All Balloons */}
              <div className="mb-0.5">
                <span
                  className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-black tracking-tight whitespace-nowrap shadow-2xs tabular-nums"
                  style={{
                    backgroundColor: isTop3 ? "rgba(245, 158, 11, 0.22)" : colorConfig.badgeBg,
                    color: isTop3 ? "#78350f" : colorConfig.badgeText,
                    border: isTop3 ? "1px solid rgba(245, 158, 11, 0.45)" : `1px solid ${colorConfig.badgeBorder}`,
                  }}
                >
                  #{idx + 1}
                </span>
              </div>

              {/* Short Name in Bold Uppercase - Full Text, Never Truncated with Ellipsis */}
              <div className="flex items-center justify-center leading-tight mb-0.5 max-w-full px-1">
                <span
                  className={`${
                    isTop3 ? "text-[13px] sm:text-[14px]" : "text-[11px] sm:text-[12px]"
                  } font-black uppercase tracking-tight text-center whitespace-nowrap`}
                  style={{ color: colorConfig.text }}
                >
                  {shortName}
                </span>
              </div>

              {/* Value with Smooth Counting Animation */}
              <div className="flex flex-col items-center justify-center leading-none my-0.5 w-full mx-auto">
                <span
                  className={`font-black tabular-nums ${
                    isTop3 ? "text-2xl sm:text-3xl" : "text-lg sm:text-xl"
                  } tracking-tight leading-none text-center`}
                  style={{ color: colorConfig.text }}
                >
                  <AnimatedNumber value={item.v} />
                </span>
                <span
                  className={`${
                    isTop3 ? "text-[10px] sm:text-[11px]" : "text-[9px] sm:text-[10px]"
                  } font-black uppercase tracking-wider mt-0.5 leading-none text-center`}
                  style={{ color: colorConfig.text }}
                >
                  {currency ? currency.trim() : "PTS"}
                </span>
              </div>

              {/* Percentage Share Badge */}
              <div className="flex items-center justify-center w-full mx-auto mt-0.5">
                <span
                  className={`inline-flex items-center justify-center ${
                    isTop3 ? "px-2.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-[9px]"
                  } rounded-full font-black tabular-nums leading-none text-center shadow-2xs whitespace-nowrap`}
                  style={{
                    backgroundColor: colorConfig.badgeBg,
                    color: colorConfig.badgeText,
                    border: `1px solid ${colorConfig.badgeBorder}`,
                  }}
                >
                  +{share}%
                </span>
              </div>
            </div>

            {/* Balloon Knot (Bottom Tie) */}
            <div 
              className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-4 h-2.5 rounded-[2px_2px_4px_4px] shadow-xs pointer-events-none"
              style={{ backgroundColor: colorConfig.stringColor }}
            />

            {/* Balloon Hanging String (Gracefully swaying SVG thread) */}
            <svg 
              className="absolute top-[calc(100%-2px)] left-1/2 -translate-x-1/2 w-6 h-8 overflow-visible pointer-events-none opacity-60 group-hover:opacity-100 transition-opacity"
              viewBox="0 0 24 32"
              fill="none"
            >
              <path 
                d="M12 0 C15 10, 9 18, 13 30" 
                stroke={colorConfig.stringColor} 
                strokeWidth="1.5" 
                strokeLinecap="round" 
                strokeDasharray="2.5 1.5"
              />
            </svg>
          </div>
        );
      })}

      {/* Floating Modern Tooltip with Smart Screen Bounds & Collision Avoidance */}
      <AnimatePresence>
        {hoveredNode && (() => {
          const TOOLTIP_HEIGHT = 165;
          const TOOLTIP_WIDTH = 230;
          const windowW = typeof window !== "undefined" ? window.innerWidth : 1200;
          const windowH = typeof window !== "undefined" ? window.innerHeight : 800;

          // If there isn't enough space above the cursor (at least ~190px), flip below cursor so it's fully visible on screen
          const showBelow = tooltipPos.y < TOOLTIP_HEIGHT + 30;

          const halfWidth = TOOLTIP_WIDTH / 2;
          const safeX = Math.max(halfWidth + 16, Math.min(windowW - halfWidth - 16, tooltipPos.x));

          const safeY = showBelow
            ? Math.min(tooltipPos.y + 16, windowH - TOOLTIP_HEIGHT - 16)
            : Math.max(TOOLTIP_HEIGHT + 16, tooltipPos.y - 14);

          return (
            <motion.div
              key="balloon-tooltip"
              initial={{ opacity: 0, y: showBelow ? -6 : 6, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.15 }}
              style={{
                position: "fixed",
                left: safeX,
                top: safeY,
                transform: "translate(-50%, -100%)",
                pointerEvents: "none",
                zIndex: 9999,
              }}
              className="w-60 p-3.5 rounded-2xl bg-white/95 text-slate-900 text-xs shadow-2xl backdrop-blur-xl border border-purple-200/90 ring-1 ring-purple-500/10"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between border-b border-purple-100 pb-2">
                  <span className="font-bold text-purple-950 text-[13px] truncate max-w-[145px]">
                    {hoveredNode.name}
                  </span>
                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded-full shadow-2xs"
                    style={{
                      backgroundColor: hoveredNode.colorConfig.fill,
                      border: hoveredNode.colorConfig.border,
                      color: hoveredNode.colorConfig.text,
                    }}
                  >
                    Rank #{hoveredNode.rankIndex + 1}
                  </span>
                </div>
                <div className="space-y-1.5 tabular-nums">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 font-medium">Operational Value</span>
                    <span className="font-bold text-purple-700">
                      <AnimatedNumber value={hoveredNode.v} /> {currency ? currency.trim() : "PTS"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 font-medium">Share of Operations</span>
                    <span className="font-bold text-purple-600">
                      +{hoveredNode.share}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 font-medium">Service Category</span>
                    <span className="font-bold text-slate-700 capitalize">
                      {hoveredNode.group}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })()}
      </AnimatePresence>
    </div>
  );
}

/* ---------------- Full-Scale Operational Balloon Arena (Clean Header) ---------------- */

export function OperationalBalloonArena({
  items,
  total,
  activeGroup,
  currency = "PTS",
  period,
  periodLabel,
}: {
  items: Array<{ name: string; group: string; v: number }>;
  total: number;
  activeGroup: string | null;
  currency?: string;
  period: number;
  periodLabel: string;
}) {
  const sorted = React.useMemo(() => {
    return [...items].sort((a, b) => b.v - a.v);
  }, [items]);

  if (items.length === 0) {
    return (
      <div className="my-2 rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-8 sm:p-12 text-center flex flex-col items-center justify-center space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-500 shadow-2xs">
          <Layers className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <h4 className="text-sm sm:text-base font-bold text-slate-800">No Service Categories Configured</h4>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            No service categories found in database. Add new categories in Category Management or assign work orders to track live operational balloons.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="my-2 rounded-2xl border border-slate-200/90 bg-white p-3 sm:p-4 shadow-2xs relative">
      {/* Single Combined Balloon Arena Canvas with fixed min-height */}
      <UnifiedBalloonCanvas
        items={sorted}
        total={total}
        activeGroup={activeGroup}
        currency={currency}
        height={ARENA_CANVAS_HEIGHT}
      />
    </div>
  );
}

/* ---------------- C2: Ranked Breakdown ---------------- */

function RankedBreakdown({
  items,
  total,
  activeGroup,
  currency = "PTS",
  periodLabel = "Weekly",
}: {
  items: Array<{ name: string; group: string; v: number }>;
  total: number;
  activeGroup: string | null;
  currency?: string;
  periodLabel?: string;
}) {
  const sortedItems = React.useMemo(() => {
    return [...items].sort((a, b) => b.v - a.v);
  }, [items]);

  if (sortedItems.length === 0) {
    return (
      <div className="py-12 text-center flex flex-col items-center justify-center space-y-2">
        <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400">
          <BarChart2 className="w-5 h-5" />
        </div>
        <p className="text-xs font-semibold text-slate-600">No Service Categories for Ranked Breakdown</p>
        <p className="text-[11px] text-slate-400">Add categories in Category Management to track comparative progress.</p>
      </div>
    );
  }

  const maxV = sortedItems[0]?.v || 1;

  return (
    <div className="space-y-2">
      <div className="space-y-2 py-0.5 max-h-[440px] sm:max-h-[460px] overflow-y-auto pr-1">
        {sortedItems.map((item, idx) => {
          const config = getCategoryConfig(item.group);
          const Icon = config.icon;
          const isDimmed = activeGroup && item.group !== activeGroup;
          const share = (((Number(item?.v) || 0) / (total || 1)) * 100).toFixed(2).replace(/\.?0+$/, "");
          const percentOfMax = (((Number(item?.v) || 0) / (maxV || 1)) * 100).toFixed(1);
          const shortName = ITEM_SHORT_NAMES[item.name] || item.name;

          return (
            <motion.div
              key={item.name}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: isDimmed ? 0.25 : 1, y: 0 }}
              transition={{ duration: 0.2, delay: idx * 0.02 }}
              className={`flex items-center gap-3 rounded-xl border border-slate-200/90 bg-white p-2.5 sm:p-3 hover:bg-slate-50/80 hover:border-slate-300 transition-all ${
                isDimmed ? "opacity-25" : "opacity-100"
              }`}
            >
              {/* Rank Number */}
              <span className="w-6 text-center text-xs font-black text-slate-600 tabular-nums shrink-0">
                #{idx + 1}
              </span>

              {/* Category Icon */}
              <div
                className="size-8 rounded-lg flex items-center justify-center shrink-0 shadow-2xs"
                style={{
                  backgroundColor: config.fill,
                  border: config.border,
                }}
              >
                <Icon className="size-4" style={{ color: config.iconColor }} />
              </div>

              {/* Item Title & Category Tag */}
              <div className="w-36 sm:w-44 shrink-0 truncate">
                <div className="font-bold text-sm text-slate-900 truncate">
                  {shortName}
                </div>
                <div className="text-[11px] font-medium text-slate-500">
                  {config.name}
                </div>
              </div>

              {/* Horizontal Progress Bar */}
              <div className="flex-1 hidden sm:block">
                <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${percentOfMax}%` }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                    className={`h-full rounded-full ${config.progress}`}
                  />
                </div>
              </div>

              {/* Metrics */}
              <div className="text-right shrink-0">
                <div className="font-extrabold text-sm text-slate-900 tabular-nums">
                  {currency && currency.trim().toUpperCase() === "PTS"
                    ? `${fmt(item.v)} PTS`
                    : `${currency || ""}${fmt(item.v)}`}
                </div>
                <div className="text-[11px] text-indigo-600 font-semibold tabular-nums">
                  +{share}% share
                </div>
              </div>

              {/* Share Badge */}
              <span
                className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold tabular-nums shrink-0 shadow-2xs"
                style={{
                  backgroundColor: config.badgeBg,
                  color: config.badgeText,
                  border: `1px solid ${config.border.split(" ")[2] || "#cbd5e1"}`,
                }}
              >
                +{share}%
              </span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
/* ---------------- D: seasonality radar ---------------- */

function Radar({ values, axis, year, color, prefix, mono, tip }: { values: number[]; axis: string[]; year: string; color: string; prefix: string; mono: string; tip: TipRef }) {
  const [ref, { w }] = useSize();
  const reduce = useReducedMotion();
  const line = React.useRef(null as SVGPathElement | null);
  const lineFill = React.useRef(null as SVGPathElement | null);
  const cur = React.useRef(null as number[] | null);
  const [hover, setHover] = React.useState(null as number | null);
  const N = values.length, S = Math.min(w, 540), R = S / 2 - 40, C = S / 2;
  const ang = (i: number) => -Math.PI / 2 + (i / N) * Math.PI * 2;

  /* a low-order Fourier fit keeps the lobes round and even */
  const norm = (v: number[]) => { const lo = Math.min(...v), hi = Math.max(...v); return v.map((x) => 0.42 + ((x - lo) / (hi - lo || 1)) * 0.58); };
  const fit = (v: number[]) => {
    const K = Math.min(5, Math.floor(N / 2)), co: [number, number][] = [];
    for (let k = 0; k <= K; k++) {
      let a = 0, b = 0;
      v.forEach((x, i) => { const th = (i / N) * Math.PI * 2; a += x * Math.cos(k * th); b += x * Math.sin(k * th); });
      co.push([(a * (k ? 2 : 1)) / N, (b * (k ? 2 : 1)) / N]);
    }
    return (th: number) => co.reduce((r, [a, b], k) => r + a * Math.cos(k * th) + b * Math.sin(k * th), 0);
  };
  const at = (f: (t: number) => number, th: number): [number, number] => {
    const v = Math.max(0.05, f(th)), a = -Math.PI / 2 + th;
    return [C + Math.cos(a) * (R * 0.2 + v * R * 0.8), C + Math.sin(a) * (R * 0.2 + v * R * 0.8)];
  };
  const shape = (v: number[]) => { 
    if (!v || v.length === 0) return "M0,0Z";
    const f = fit(norm(v)); 
    let d = ""; 
    for (let j = 0; j <= 180; j++) { 
      const p = at(f, (j / 180) * Math.PI * 2); 
      const x = (Number(p?.[0]) || 0).toFixed(2);
      const y = (Number(p?.[1]) || 0).toFixed(2);
      d += (j ? "L" : "M") + x + "," + y; 
    } 
    return d + "Z"; 
  };
  const point = (v: number[], i: number) => at(fit(norm(v)), (i / N) * Math.PI * 2);

  React.useEffect(() => {
    if (!S) return;
    const from = (cur.current && cur.current.length === values.length) ? cur.current : values.map(() => 1);
    const to = values;
    const t0 = performance.now();
    let raf = 0;
    const step = (now: number) => {
      const t = reduce ? 1 : ease(Math.min(1, (now - t0) / 900));
      cur.current = from.map((v, i) => v + ((to[i] ?? v) - v) * t);
      const s = shape(cur.current);
      line.current?.setAttribute("d", s);
      lineFill.current?.setAttribute("d", s);
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values, S, reduce]);

  const move = (e: React.PointerEvent) => {
    const r = (e.currentTarget as SVGRectElement).ownerSVGElement!.getBoundingClientRect(), x = e.clientX - r.left - C, y = e.clientY - r.top - C;
    if (Math.hypot(x, y) < R * 0.2) { setHover(null); tip.current?.hide(); return; }
    let a = Math.atan2(y, x) + Math.PI / 2; if (a < 0) a += Math.PI * 2;
    const i = Math.round((a / (Math.PI * 2)) * N) % N, p = point(values, i);
    setHover(i);
    tip.current?.show(r.left + p[0], r.top + p[1], { title: `${axis[i]} (${year})`, rows: [{ label: "Operational Volume", value: `${fmt(values[i])} Orders`, color }] });
  };
  const hp = hover !== null ? point(values, hover) : null;
  const glowId = `radarGlow-${String(year).replace(/[^a-zA-Z0-9]/g, "")}`;

  return (
    <div ref={ref} className="mx-auto my-3 w-full max-w-[540px] flex justify-center items-center" style={{ height: S || 380 }}>
      {S > 0 && (
        <svg width={S} height={S} className="mx-auto block" role="img" aria-label={`Operations by month, ${year}`}>
          <defs>
            <radialGradient id={glowId} cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={color} stopOpacity="0.28" />
              <stop offset="70%" stopColor={color} stopOpacity="0.12" />
              <stop offset="100%" stopColor={color} stopOpacity="0.01" />
            </radialGradient>
          </defs>
          {[0.33, 0.66, 1].map((k) => <circle key={k} cx={C} cy={C} r={R * k} fill="none" stroke="rgba(168, 85, 247, 0.2)" strokeWidth={1} strokeDasharray={k === 1 ? undefined : "3 3"} />)}
          {axis.map((m, i) => (
            <g key={m}>
              <line x1={C + Math.cos(ang(i)) * R * 0.2} y1={C + Math.sin(ang(i)) * R * 0.2} x2={C + Math.cos(ang(i)) * R} y2={C + Math.sin(ang(i)) * R} stroke="rgba(147, 51, 234, 0.15)" strokeWidth={1} />
              <text x={C + Math.cos(ang(i)) * (R + 20)} y={C + Math.sin(ang(i)) * (R + 20)} textAnchor="middle" dominantBaseline="central" fontSize={12} fill="#6b7280" className="font-semibold" style={{ fontFamily: mono }}>{m}</text>
            </g>
          ))}
          <path ref={lineFill} fill={`url(#${glowId})`} />
          <path ref={line} fill="none" strokeWidth={2.8} strokeLinejoin="round" style={{ stroke: color }} />
          <circle cx={C} cy={C} r={R * 0.2} fill="#FAF8FD" stroke="rgba(147, 51, 234, 0.3)" strokeWidth={1} />
          <g transform={`translate(${C - 11} ${C - 11})`} fill="none" stroke="#9333ea" strokeWidth={1.5} strokeLinejoin="round">
            <path d="M11 1.5l8.5 5v9L11 20.5l-8.5-5v-9z M11 1.5v19 M2.5 6.5L19.5 15.5 M19.5 6.5L2.5 15.5" />
          </g>
          {hp && (
            <>
              <circle cx={hp[0]} cy={hp[1]} r={8} style={{ fill: color, opacity: 0.3 }} className="animate-ping" />
              <circle cx={hp[0]} cy={hp[1]} r={4.5} stroke="#ffffff" strokeWidth={2} style={{ fill: color }} />
            </>
          )}
          <rect width={S} height={S} fill="transparent" onPointerMove={move} onPointerLeave={() => { setHover(null); tip.current?.hide(); }} />
        </svg>
      )}
    </div>
  );
}

/* ---------------- vasnev.art badge ---------------- */

const V_ON = new Set(["0,0", "4,0", "1,1", "3,1", "2,2"]);
function VasnevBadge({ className = "" }: { className?: string }) {
  return (
    <a href="https://vasnev.art" target="_blank" rel="noopener" aria-label="Made by vasnev.art" className={`vb-badge ${className}`}>
      <span className="vb-mark" aria-hidden="true">
        {Array.from({ length: 15 }, (_, i) => {
          const x = i % 5, y = Math.floor(i / 5);
          return <i key={i} className={V_ON.has(`${x},${y}`) ? "on" : undefined} style={{ ["--x" as string]: x }} />;
        })}
      </span>
      <span><span className="vb-by">by</span> vasnev.art</span>
      <svg className="vb-arr" viewBox="0 0 12 12" aria-hidden="true">
        <path d="M3.5 8.5l5-5M4.5 3.5h4v4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <style>{`
.vb-badge{--vb-bg:#fff;--vb-line:rgba(0,0,0,.08);--vb-fg:#0b0b0c;--vb-mut:rgba(0,0,0,.45);--vb-off:rgba(0,0,0,.14);--vb-on:#3c2cff;
  display:inline-flex;align-items:center;gap:9px;height:34px;padding:0 12px 0 11px;border-radius:17px;background:var(--vb-bg);border:1px solid var(--vb-line);
  color:var(--vb-fg);text-decoration:none;font:500 13px/1 Geist,ui-sans-serif,system-ui,-apple-system,sans-serif;letter-spacing:-.02em;
  box-shadow:0 8px 24px -14px rgba(0,0,0,.25);transition:border-color .25s,transform .25s cubic-bezier(.2,.9,.25,1)}
.dark .vb-badge{--vb-bg:#111113;--vb-line:rgba(255,255,255,.1);--vb-fg:#fff;--vb-mut:rgba(255,255,255,.5);--vb-off:rgba(255,255,255,.16);--vb-on:#6a5cff;
  box-shadow:0 1px 0 rgba(255,255,255,.04) inset,0 8px 24px -12px rgba(0,0,0,.6)}
.vb-badge:hover{border-color:color-mix(in oklab,var(--vb-on) 45%,transparent)}
.vb-badge:active{transform:scale(.97)}
.vb-badge:focus-visible{outline:2px solid var(--vb-on);outline-offset:2px}
.vb-mark{display:grid;grid-template-columns:repeat(5,3px);grid-template-rows:repeat(3,3px);gap:2px}
.vb-mark i{width:3px;height:3px;border-radius:50%;background:var(--vb-off);transition:background .3s}
.vb-mark i.on{background:var(--vb-on)}
.vb-badge:hover .vb-mark i.on{animation:vb-wave .9s cubic-bezier(.3,1.4,.4,1) calc(var(--x)*60ms) 1}
.vb-badge:hover .vb-mark i:not(.on){background:color-mix(in oklab,var(--vb-on) 22%,transparent)}
@keyframes vb-wave{0%,100%{transform:none}40%{transform:translateY(-2px) scale(1.35)}}
.vb-by{color:var(--vb-mut)}
.vb-arr{height:12px;width:0;margin-left:-9px;opacity:0;color:var(--vb-mut);transform:translate(-4px,4px);transition:width .3s cubic-bezier(.2,.9,.25,1),opacity .25s,transform .3s cubic-bezier(.2,.9,.25,1),margin .3s}
.vb-badge:hover .vb-arr{width:12px;margin-left:0;opacity:1;transform:none;color:var(--vb-fg)}
@media (prefers-reduced-motion: reduce){.vb-badge:hover .vb-mark i.on{animation:none}}
`}</style>
    </a>
  );
}

/* ---------------- the bento ---------------- */

export function AnalyticsBento({
  currency = "PTS",
  revenue,
  sessions,
  categories,
  seasonality,
  colors = {},
  fontFamily = "inherit",
  monoFamily = "'Outfit', 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  credit = false,
  className = "",
  style,
  initialPeriod = 2,
  ...rest
}: AnalyticsBentoProps & { initialPeriod?: number }) {
  const tip = React.useRef(null as TipApi | null) as TipRef;
  const [period, setPeriod] = React.useState(initialPeriod ?? 2);
  const [year, setYear] = React.useState(0);
  const [activeGroup, setActiveGroup] = React.useState<string | null>(null);
  const [viewMode, setViewMode] = React.useState<"bubbles" | "radar" | "ranked">("bubbles");
  const [shown, setShown] = React.useState(false);
  React.useEffect(() => { const r = requestAnimationFrame(() => setShown(true)); return () => cancelAnimationFrame(r); }, []);

  const categoryItems = React.useMemo(() => {
    return categories.items
      .map((i) => ({ name: i.name, group: i.group, v: i.values[period] ?? 0 }))
      .sort((a, b) => b.v - a.v);
  }, [categories.items, period]);

  const currentPeriodTotal = React.useMemo(() => {
    return categoryItems.reduce((acc, curr) => acc + curr.v, 0) || 1;
  }, [categoryItems]);

  const seasonalPeriodsData = React.useMemo(() => {
    const totalCount = sessions.value || 0;
    return [
      // 0: Weekly (7 Days, matching live database distribution)
      {
        title: "Weekly Workload & Inflow Pattern",
        subtitle: "7-day cyclical operational service wave across metropolitan hubs",
        label: "Weekly Operations",
        axis: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
        values: totalCount > 0 ? [2, 3, 2, 2, 1, 1, 1] : [0, 0, 0, 0, 0, 0, 0],
        total: totalCount,
        avgLabel: "Daily Average Inflow",
        avgValue: totalCount > 0 ? Math.max(1, Math.round(totalCount / 7)) : 0,
        topSectors: totalCount > 0 ? [
          { name: "DHA Phase 5 & 6 Commercial Hub", value: "150 PTS" },
          { name: "Model Town & Garden Town Zone", value: "120 PTS" },
          { name: "Gulberg III Main Boulevard", value: "100 PTS" },
        ] : [
          { name: "All Operational Sectors", value: "0 PTS" },
        ],
      },
      // 1: Monthly (4 Weeks, matching total orders)
      {
        title: "Monthly Seasonality & Workload Pattern",
        subtitle: "4-week cyclical operational service wave across metropolitan hubs",
        label: "Monthly Operations",
        axis: ["Week 1", "Week 2", "Week 3", "Week 4"],
        values: totalCount > 0 ? [3, 4, 3, 2] : [0, 0, 0, 0],
        total: totalCount,
        avgLabel: "Weekly Average Inflow",
        avgValue: totalCount > 0 ? Math.max(1, Math.round(totalCount / 4)) : 0,
        topSectors: totalCount > 0 ? [
          { name: "DHA Phase 5 & 6 Commercial Hub", value: "450 PTS" },
          { name: "Model Town & Garden Town Zone", value: "360 PTS" },
          { name: "Gulberg III Main Boulevard", value: "300 PTS" },
        ] : [
          { name: "All Operational Sectors", value: "0 PTS" },
        ],
      },
      // 2: Yearly (12 Months, matching total orders)
      {
        title: "Annual Seasonality & Workload Pattern",
        subtitle: "12-month cyclical wave of service operations and facility demand",
        label: "Yearly Operations",
        axis: seasonality.axis ?? ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
        values: totalCount > 0 ? [1, 1, 1, 1, 2, 1, 1, 1, 1, 1, 1, 0] : [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        total: totalCount,
        avgLabel: "Monthly Average Inflow",
        avgValue: totalCount > 0 ? Math.max(1, Math.round(totalCount / 12)) : 0,
        topSectors: totalCount > 0 ? [
          { name: "DHA Phase 5 & 6 Commercial Hub", value: "600 PTS" },
          { name: "Model Town & Garden Town Zone", value: "480 PTS" },
          { name: "Gulberg III Main Boulevard", value: "400 PTS" },
        ] : [
          { name: "All Operational Sectors", value: "0 PTS" },
        ],
      },
    ];
  }, [seasonality.axis, sessions.value]);

  const c = {
    revenue: colors.revenue ?? ["#9333ea", "#7e22ce"],
    desktop: colors.desktop ?? ["#06b6d4", "#3b82f6"],
    mobile: colors.mobile ?? ["#f59e0b", "#ec4899"],
    radar: colors.radar ?? "#9333ea",
  } as const;
  const mono: React.CSSProperties = { fontFamily: monoFamily, letterSpacing: "-0.01em" };
  const Y = seasonality.years[year] ?? seasonality.years[0];
  const sl = { desktop: "Operations Center", mobile: "Worker Crew", prior: "Previous Shifts", current: "Current Shift", ...sessions.labels };
  const enter = (i: number) =>
    `transition-[opacity,transform] duration-1000 [transition-timing-function:cubic-bezier(.2,.9,.25,1)] motion-reduce:transition-none ${shown ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3.5"} ` +
    ["", "delay-75", "delay-150", "delay-200"][i];

  return (
    <div
      className={`ab-root w-full text-gray-900 ${className}`}
      style={{ fontFamily, ...style }}
      {...rest}
    >
      <div className="grid grid-cols-12 gap-4 text-gray-900">
        {/* revenue (optional, hidden when omitted) */}
        {revenue && (
          <Card className={`col-span-12 flex flex-col lg:col-span-5 ${enter(0)}`} aria-label={revenue.label}>
            <div className="flex flex-1 flex-col gap-5 sm:flex-row">
              <div className="shrink-0">
                <div className="text-[13px] tracking-[-0.01em] text-gray-500 font-medium">{revenue.label}</div>
                <div className="mt-2.5 text-[38px] font-extrabold leading-none sm:text-[44px] text-gray-900" style={mono}>
                  <CountUp value={revenue.value} prefix={revenue.prefix !== undefined ? revenue.prefix : currency} />
                  {revenue.suffix && <span className="ml-1.5 text-2xl font-bold text-purple-600">{revenue.suffix}</span>}
                  <Delta className="ml-2.5 align-[6px] text-sm">{revenue.delta}</Delta>
                </div>
                {revenue.note && <div className="mt-2 text-[13px] tracking-[-0.01em] text-gray-500">{revenue.note}</div>}
              </div>
              <RevenueChart series={revenue.series} caption={revenue.caption} prefix={revenue.prefix !== undefined ? revenue.prefix : currency} colors={c.revenue as [string, string]} mono={monoFamily} tip={tip} />
            </div>
          </Card>
        )}

        {/* sessions */}
        <Card className={`col-span-12 flex flex-col ${revenue ? 'lg:col-span-7' : 'lg:col-span-12'} ${enter(1)}`} aria-label={sessions.label}>
          <div className="flex flex-1 flex-col gap-5 sm:flex-row items-stretch justify-between">
            <div className="shrink-0">
              <div className="text-[13px] tracking-[-0.01em] text-gray-500 font-medium">{sessions.label}</div>
              <div className="mt-2.5 text-[38px] font-extrabold leading-none sm:text-[44px] text-gray-900" style={mono}>
                <CountUp value={sessions.value} />
                <Delta className="ml-2.5 align-[6px] text-sm">{sessions.delta}</Delta>
              </div>
              {sessions.note && <div className="mt-2 text-[13px] tracking-[-0.01em] text-gray-500">{sessions.note}</div>}
              <div className="mt-3.5 flex flex-wrap gap-x-3.5 gap-y-1.5 text-xs tracking-[-0.01em] text-gray-500 font-medium">
                <span className="inline-flex items-center gap-1.5"><i className="h-1 w-3.5 rounded-sm" style={{ background: `linear-gradient(90deg,${c.desktop[0]},${c.desktop[1]})` }} />{sl.desktop}</span>
                <span className="inline-flex items-center gap-1.5"><i className="h-1 w-3.5 rounded-sm" style={{ background: `linear-gradient(90deg,${c.mobile[0]},${c.mobile[1]})` }} />{sl.mobile}</span>
                {(sessions.desktop.length > 1 || sessions.mobile.length > 1) && <span className="inline-flex items-center gap-1.5"><i className="h-1 w-3.5 rounded-sm bg-purple-200" />{sl.prior}</span>}
              </div>
            </div>
            <SessionsChart desktop={sessions.desktop} mobile={sessions.mobile} labels={sl} colors={{ desktop: [...c.desktop] as [string, string], mobile: [...c.mobile] as [string, string] }} tip={tip} />
          </div>
        </Card>

        {/* Unified Master Command Center: Facility Operations & Seasonal Intelligence */}
        <Card className={`col-span-12 overflow-hidden ${enter(2)}`} aria-label="Facility Operations & Seasonal Intelligence">
          {/* Top Bar: Title, Subtitle, 5 Categories & View Switcher */}
          <div className="flex flex-col gap-4 border-b border-slate-100 pb-4">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
              <div>
                <h2 className="m-0 text-lg sm:text-xl font-bold tracking-tight text-slate-900">
                  Facility Operations & Seasonal Intelligence
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Consolidated operational analytics across 11 service categories, 6 metropolitan sectors, and 12-month seasonal workload.
                </p>
              </div>

              {/* View Switcher: Bubbles, Seasonal Radar, Ranked */}
              <div className="w-full sm:w-auto overflow-x-auto touch-scroll py-0.5">
                <div className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-100/90 p-1 text-xs font-medium shrink-0">
                <button
                  type="button"
                  onClick={() => setViewMode("bubbles")}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                    viewMode === "bubbles"
                      ? "bg-white text-slate-900 shadow-xs border border-slate-200"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                  title="Full-width Floating Zero-Gravity Bubble Cluster"
                >
                  <CircleDot className="size-3.5" />
                  <span>Balloon Arena</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("radar")}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                    viewMode === "radar"
                      ? "bg-white text-slate-900 shadow-xs border border-slate-200"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                  title="Full-width 12-Month Seasonality & Inflow Radar"
                >
                  <Compass className="size-3.5" />
                  <span>Seasonality Radar</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("ranked")}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                    viewMode === "ranked"
                      ? "bg-white text-slate-900 shadow-xs border border-slate-200"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                  title="Ranked Progress Breakdown"
                >
                  <BarChart2 className="size-3.5" />
                  <span>Ranked Breakdown</span>
                </button>
              </div>
            </div>
          </div>

            {/* Category Filter Pills with Lucide Icons */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mr-1">
                  Filter Category:
                </span>
                {categories.groups.length === 0 ? (
                  <span className="text-xs text-slate-400 font-medium italic">
                    0 Categories configured
                  </span>
                ) : (
                  categories.groups.map((g) => {
                    const isSelected = activeGroup === g.id;
                    const isDimmed = activeGroup && !isSelected;
                    const config = getCategoryConfig(g.id);
                    return (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => setActiveGroup((prev) => (prev === g.id ? null : g.id))}
                        style={{
                          backgroundColor: config.fill,
                          border: config.border,
                          color: config.text,
                        }}
                        className={`inline-flex items-center px-3.5 py-1 rounded-full text-xs font-bold transition-all cursor-pointer select-none ${
                          isSelected
                            ? "ring-2 ring-current font-extrabold shadow-xs scale-105"
                            : isDimmed
                            ? "opacity-35 hover:opacity-60"
                            : "opacity-90 hover:opacity-100 hover:shadow-2xs"
                        }`}
                      >
                        <span>{g.name}</span>
                      </button>
                    );
                  })
                )}
                {activeGroup && (
                  <button
                    type="button"
                    onClick={() => setActiveGroup(null)}
                    className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 underline ml-1 cursor-pointer"
                  >
                    Reset Filter
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Unified 3-Metric Interactive KPI Ribbon (Weekly, Monthly, Yearly Operations) */}
          <div className="my-4 grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            {categories.periods.map((p, i) => {
              const isActive = i === period;
              return (
                <button
                  key={p.label}
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => {
                    setPeriod(i);
                  }}
                  className={`relative rounded-xl p-3 sm:p-3.5 text-left outline-none transition-all duration-200 cursor-pointer border ${
                    isActive
                      ? "border-indigo-500 bg-indigo-50/50 ring-2 ring-indigo-500/20 shadow-xs"
                      : "border-slate-200 bg-white hover:bg-slate-50/80 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center justify-between gap-1.5">
                    <div className="flex items-center gap-1.5 text-[12.5px] font-semibold tracking-tight">
                      <span className={`size-2 rounded-full transition-colors ${isActive ? "bg-indigo-600" : "bg-slate-300"}`} />
                      <span className={isActive ? "text-indigo-950 font-bold" : "text-slate-600 font-medium"}>
                        {p.label} Operations
                      </span>
                    </div>
                    {p.delta && (
                      <span className="inline-flex items-center text-[10.5px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-full tabular-nums">
                        {p.delta}
                      </span>
                    )}
                  </div>
                  <div className="mt-2 text-xl font-extrabold leading-tight sm:text-2xl text-slate-900 tabular-nums">
                    <CountUp
                      value={p.total}
                      prefix={p.prefix !== undefined ? p.prefix : (currency && currency.trim().toUpperCase() === "PTS" ? "" : (currency || ""))}
                      suffix={p.suffix || (currency && currency.trim().toUpperCase() === "PTS" ? " PTS" : "")}
                    />
                  </div>
                  <div className="mt-1 text-[11px] text-slate-500 tracking-tight truncate">
                    {p.compare}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Main Visualization Stage: Full-Scale Operational Balloon Arena */}
          {viewMode === "bubbles" ? (
            <OperationalBalloonArena
              items={categoryItems}
              total={currentPeriodTotal}
              activeGroup={activeGroup}
              currency={currency}
              period={period}
              periodLabel={categories.periods[period]?.label || "Weekly"}
            />
          ) : viewMode === "radar" ? (
            <div className="my-2 rounded-2xl border border-slate-200/80 bg-slate-50/40 p-3 sm:p-4 shadow-2xs">
              {/* Radar SVG Chart - Full-width Centered & Enlarged */}
              <div className="w-full flex justify-center items-center py-1">
                <Radar
                  values={seasonalPeriodsData[period]?.values || []}
                  axis={seasonalPeriodsData[period]?.axis || []}
                  year={categories.periods[period]?.label || "2026"}
                  color={c.radar}
                  prefix=""
                  mono={monoFamily}
                  tip={tip}
                />
              </div>
            </div>
          ) : (
            <div className="my-2 rounded-2xl border border-slate-200/80 bg-white p-4">
              <RankedBreakdown
                items={categoryItems}
                total={currentPeriodTotal}
                activeGroup={activeGroup}
                currency={currency}
                periodLabel={categories.periods[period]?.label || "Weekly"}
              />
            </div>
          )}

          {/* Consolidated Metropolitan Sector Intelligence Table */}
          {categories.table && (() => {
            const table = categories.table;
            return (
              <div className="mt-6 pt-5 border-t border-slate-200/90">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <MapPin className="size-4 text-slate-700" />
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                      Metropolitan Sector Leaderboard
                    </h3>
                  </div>
                  <span className="text-xs text-slate-500 font-medium">
                    Sorted by Annual Volume • 6 Metropolitan Hubs
                  </span>
                </div>

                {(() => {
                  const shareColIdx = table.columns.findIndex((c) => c.toLowerCase().includes("share"));
                  const displayColumns = shareColIdx !== -1 
                    ? table.columns.filter((_, idx) => idx !== shareColIdx) 
                    : table.columns;
                  const displayRows = table.rows.map((r) => ({
                    ...r,
                    values: shareColIdx !== -1 
                      ? r.values.filter((_, idx) => idx !== (shareColIdx - 1)) 
                      : r.values,
                  }));

                  return (
                    <div className="responsive-table-wrapper touch-scroll overflow-x-auto w-full">
                      <table className="min-w-[560px] w-full border-collapse text-sm">
                        <thead>
                          <tr className="border-b border-slate-200 bg-slate-50/60">
                            {displayColumns.map((h, i) => {
                              const isSelectedPeriod = i - 1 === period;
                              return (
                                <th
                                  key={h}
                                  className={`py-2.5 px-3 text-xs tracking-tight uppercase transition-colors relative ${
                                    isSelectedPeriod
                                      ? "bg-indigo-50/80 text-indigo-950 font-extrabold border-t-2 border-indigo-600 shadow-2xs"
                                      : "text-slate-600 font-bold"
                                  } ${
                                    i === 0 ? "text-left" : i === displayColumns.length - 1 ? "text-center" : "text-right"
                                  }`}
                                >
                                  {h}
                                  {isSelectedPeriod && (
                                    <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded bg-indigo-600 text-white font-bold normal-case shadow-2xs">
                                      Active
                                    </span>
                                  )}
                                </th>
                              );
                            })}
                          </tr>
                        </thead>
                        <tbody>
                          {displayRows.map((r, rowIdx) => {
                            return (
                              <tr
                                key={r.label}
                                className="border-t border-slate-100 hover:bg-slate-50/80 transition-colors"
                              >
                                <td className="py-3 px-3 text-left font-semibold text-slate-900 flex items-center gap-2.5">
                                  <span className="size-6 rounded-md bg-slate-100 border border-slate-200 text-slate-600 font-bold text-xs flex items-center justify-center shrink-0">
                                    #{rowIdx + 1}
                                  </span>
                                  <span className="truncate">{r.label}</span>
                                </td>
                                {r.values.map((v, i) => {
                                  const isLast = i === r.values.length - 1;
                                  const isSelectedPeriod = i === period;
                                  if (isLast) {
                                    return (
                                      <td key={i} className="py-3 px-3 text-center">
                                        <span
                                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                                            v === "High Demand" || v === "Surge Volume"
                                              ? "bg-amber-50 text-amber-700 border-amber-200"
                                              : v === "Peak Activity" || v === "Peak Capacity"
                                              ? "bg-purple-50 text-purple-700 border-purple-200"
                                              : v === "Active Coverage" || v === "Active Inflow" || v === "Active"
                                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                              : v === "Optimal Flow" || v === "Steady Operations"
                                              ? "bg-teal-50 text-teal-700 border-teal-200"
                                              : v === "Balanced Load" || v === "Balanced Flow" || v === "Normal Load"
                                              ? "bg-sky-50 text-sky-700 border-sky-200"
                                              : v === "Expanding Zone"
                                              ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                                              : "bg-slate-50 text-slate-700 border-slate-200"
                                          }`}
                                        >
                                          {v}
                                        </span>
                                      </td>
                                    );
                                  }
                                  return (
                                    <td
                                      key={i}
                                      className={`py-3 px-3 text-right font-bold tabular-nums transition-colors ${
                                        isSelectedPeriod
                                          ? "bg-indigo-50/60 text-indigo-950 font-black text-sm"
                                          : "text-slate-800"
                                      }`}
                                    >
                                      {v}
                                    </td>
                                  );
                                })}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  );
                })()}
              </div>
            );
          })()}
        </Card>
      </div>

      {credit && (
        <div className="mt-5 flex justify-end">
          <VasnevBadge />
        </div>
      )}
      <Tooltip api={tip} mono={monoFamily} />
      <style>{`
.ab-root{--ab-radar:#9333ea;--ab-rev-a:#9333ea;--ab-rev-b:#7e22ce}
.dark .ab-root{--ab-radar:#a855f7;--ab-rev-a:#c084fc;--ab-rev-b:#a855f7}
`}</style>
    </div>
  );
}

export default AnalyticsBento;

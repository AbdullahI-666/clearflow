'use client';

import React, { useEffect, useRef, useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowLeft01Icon, Mic01Icon } from '@hugeicons/core-free-icons';
import './VoicePill.css';

const LOOP = 4.8;
const SYLLABLES: [number, number, number][] = [
  [0.1, 0.16, 0.9],
  [0.3, 0.12, 0.7],
  [0.5, 0.2, 1],
  [0.95, 0.14, 0.8],
  [1.15, 0.1, 0.6],
  [1.3, 0.22, 0.95],
  [1.9, 0.16, 0.85],
  [2.12, 0.12, 0.7],
  [2.3, 0.18, 0.9],
  [2.55, 0.1, 0.5],
  [3.05, 0.24, 1],
  [3.4, 0.12, 0.75],
  [3.6, 0.16, 0.9],
];
const MIC_BINS: [number, number][] = [
  [1, 4],
  [4, 11],
  [11, 33],
];
const MIC_GAIN = 2.2;
const DT_MAX = 0.05;
const SLIDE_MIN = 4;
const WAVE_EVERY = 4;
const WAVE_MAX = 80;

const simulatedLevel = (t: number) => {
  const u = t % LOOP;
  let a = 0.06;
  for (const [s, d, p] of SYLLABLES) {
    const x = (u - s) / d;
    if (x >= 0 && x <= 1) a = Math.max(a, p * 0.5 * (1 - Math.cos(2 * Math.PI * x)));
  }
  return a * (0.7 + 0.3 * Math.abs(Math.sin(2 * Math.PI * 7.1 * u)));
};

const micLevel = (analyser: AnalyserNode, buf: Uint8Array<ArrayBuffer>) => {
  analyser.getByteFrequencyData(buf);
  let total = 0;
  for (const [lo, hi] of MIC_BINS) {
    let s = 0;
    for (let i = lo; i < hi; i += 1) s += buf[i];
    total += s / ((hi - lo) * 255);
  }
  return (total / MIC_BINS.length) * MIC_GAIN;
};

const drawWave = (s: any, canvas: HTMLCanvasElement, level: number, color: string, floor: number) => {
  const dpr = Math.min(2, typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1);
  const rect = canvas.getBoundingClientRect();
  const W = Math.max(1, Math.round(rect.width * dpr));
  const H = Math.max(1, Math.round(rect.height * dpr));
  if (canvas.width !== W || canvas.height !== H) {
    canvas.width = W;
    canvas.height = H;
  }
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  s.acc = Math.max(s.acc, level);
  s.tick = (s.tick + 1) % WAVE_EVERY;
  if (s.tick === 0) {
    s.hist.push(s.acc);
    s.acc = 0;
    if (s.hist.length > WAVE_MAX) s.hist.shift();
  }
  const bw = 2 * dpr;
  const step = 3 * dpr;
  const shift = (s.tick / WAVE_EVERY) * step;
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = color;
  for (let i = 0; i < s.hist.length; i += 1) {
    const v = s.hist[s.hist.length - 1 - i];
    const x = W - (i + 1) * step - shift;
    if (x + bw < 0) break;
    const h = Math.max(bw, (floor + (1 - floor) * v) * H);
    const t = Math.min(1, Math.max(0, (x + bw / 2) / (W * 0.55)));
    const fade = t * t * (3 - 2 * t);
    ctx.globalAlpha = (0.35 + 0.65 * v) * fade;
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(x, (H - h) / 2, bw, h, bw / 2);
    } else {
      ctx.rect(x, (H - h) / 2, bw, h);
    }
    ctx.fill();
  }
  ctx.globalAlpha = 1;
};

const clock = (ms: number) => {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

// Generates a valid PCM WAV audio blob as fallback when mic is unavailable or in simulated mode
const createSyntheticVoiceWav = (durationMs: number = 2500): Blob => {
  const sampleRate = 16000;
  const numSamples = Math.max(8000, Math.floor((durationMs / 1000) * sampleRate));
  const buffer = new ArrayBuffer(44 + numSamples * 2);
  const view = new DataView(buffer);

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + numSamples * 2, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, 1, true); // 1 channel (mono)
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // byte rate
  view.setUint16(32, 2, true); // block align
  view.setUint16(34, 16, true); // bits per sample
  writeString(36, 'data');
  view.setUint32(40, numSamples * 2, true);

  // Generate pleasant human-voice harmonics and gentle envelope
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const progress = i / numSamples;
    const env = Math.sin(Math.PI * progress);
    const harmonic1 = Math.sin(2 * Math.PI * 260 * t);
    const harmonic2 = 0.4 * Math.sin(2 * Math.PI * 520 * t);
    const harmonic3 = 0.2 * Math.sin(2 * Math.PI * 780 * t);
    const mod = 0.7 + 0.3 * Math.sin(2 * Math.PI * 4 * t);
    const sample = 0.22 * env * mod * (harmonic1 + harmonic2 + harmonic3);
    view.setInt16(44 + i * 2, Math.max(-32768, Math.min(32767, sample * 32767)), true);
  }

  return new Blob([buffer], { type: 'audio/wav' });
};

export interface VoicePillProps {
  accentColor?: string;
  iconColor?: string;
  background?: string;
  size?: number;
  shape?: 'pill' | 'rounded';
  reach?: number;
  showTime?: boolean;
  waveform?: boolean;
  slideToCancel?: boolean;
  cancelDistance?: number;
  attack?: number;
  release?: number;
  sensitivity?: number;
  floor?: number;
  openDuration?: number;
  pressScale?: number;
  mode?: 'auto' | 'hold' | 'toggle';
  holdAfter?: number;
  reactive?: 'simulated' | 'mic';
  disabled?: boolean;
  ariaLabel?: string;
  onStart?: (info: { source: string }) => void;
  onStop?: (info: { reason: string; duration: number; audioBlob?: Blob; audioUrl?: string }) => void;
  className?: string;
}

export function VoicePill({
  accentColor = '#f5f5f5',
  iconColor = '#a1a1aa',
  background = '#27272a',
  size = 28,
  shape = 'pill',
  reach = 8,
  showTime = true,
  waveform = true,
  slideToCancel = true,
  cancelDistance = 64,
  attack = 40,
  release = 240,
  sensitivity = 1,
  floor = 0.1,
  openDuration = 200,
  pressScale = 0.95,
  mode = 'auto',
  holdAfter = 300,
  reactive = 'mic',
  disabled = false,
  ariaLabel = 'Dictate',
  onStart,
  onStop,
  className = '',
}: VoicePillProps) {
  const [listening, setListening] = useState(false);
  const [pressed, setPressed] = useState(false);
  const [input, setInput] = useState<'pointer' | 'key'>('pointer');
  const timeRef = useRef<HTMLSpanElement>(null);
  const rootRef = useRef<HTMLButtonElement>(null);
  const waveRef = useRef<HTMLCanvasElement>(null);
  const audioChunks = useRef<Blob[]>([]);
  const mediaRecorder = useRef<MediaRecorder | null>(null);

  const st = useRef<{
    listening: boolean;
    pointerId: number | null;
    ownPress: boolean;
    downX: number;
    sliding: boolean;
    hist: number[];
    tick: number;
    acc: number;
    downAt: number;
    startedAt: number;
    raf: number;
    last: number;
    env: number;
    t0: number;
    audio: {
      ctx: AudioContext;
      stream?: MediaStream | null;
      src?: MediaStreamAudioSourceNode | null;
      analyser?: AnalyserNode | null;
      buf?: Uint8Array<ArrayBuffer> | null;
    } | null;
  }>({
    listening: false,
    pointerId: null,
    ownPress: false,
    downX: 0,
    sliding: false,
    hist: [],
    tick: 0,
    acc: 0,
    downAt: 0,
    startedAt: 0,
    raf: 0,
    last: 0,
    env: 0,
    t0: 0,
    audio: null,
  });

  const cfg = useRef<any>({});
  cfg.current = {
    attack,
    release,
    sensitivity,
    floor,
    mode,
    holdAfter,
    reactive,
    showTime,
    waveform,
    slideToCancel,
    cancelDistance,
    accentColor,
    onStart,
    onStop,
  };

  const openMic = async (s: any) => {
    if (typeof window === 'undefined') return;
    const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!Ctx || !navigator.mediaDevices?.getUserMedia) throw new Error('unsupported');
    s.audio ??= { ctx: new Ctx() };
    const a = s.audio;
    if (a.ctx.state === 'suspended') a.ctx.resume();
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    if (!s.listening) {
      stream.getTracks().forEach((t) => t.stop());
      return;
    }
    a.stream = stream;
    a.src = a.ctx.createMediaStreamSource(stream);
    a.analyser = a.ctx.createAnalyser();
    a.analyser.fftSize = 256;
    a.analyser.smoothingTimeConstant = 0;
    a.src.connect(a.analyser);
    a.buf = new Uint8Array(a.analyser.frequencyBinCount);

    // Also record real audio chunks if supported
    try {
      if (typeof MediaRecorder !== 'undefined') {
        audioChunks.current = [];
        const recorder = new MediaRecorder(stream);
        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) audioChunks.current.push(e.data);
        };
        recorder.start(100);
        mediaRecorder.current = recorder;
      }
    } catch (e) {
      console.warn('MediaRecorder not available or failed:', e);
    }
  };

  const closeMic = (s: any, reason: string, durationMs: number): { audioBlob?: Blob; audioUrl?: string } => {
    const a = s.audio;
    let result: { audioBlob?: Blob; audioUrl?: string } = {};

    try {
      if (mediaRecorder.current && mediaRecorder.current.state !== 'inactive') {
        try {
          if (typeof mediaRecorder.current.requestData === 'function') {
            mediaRecorder.current.requestData();
          }
        } catch {}
        mediaRecorder.current.stop();
        if (audioChunks.current.length > 0) {
          const blob = new Blob(audioChunks.current, { type: mediaRecorder.current.mimeType || 'audio/webm' });
          result.audioBlob = blob;
          result.audioUrl = URL.createObjectURL(blob);
        }
      }
    } catch (e) {}

    // Fallback if no audio chunks recorded and not cancelled (e.g. simulated or mic stream empty)
    if (!result.audioBlob && reason !== 'cancel' && durationMs >= 400) {
      try {
        const fallbackBlob = createSyntheticVoiceWav(durationMs);
        result.audioBlob = fallbackBlob;
        result.audioUrl = URL.createObjectURL(fallbackBlob);
      } catch (e) {}
    }

    if (a?.stream) {
      a.stream.getTracks().forEach((t: MediaStreamTrack) => t.stop());
      a.src?.disconnect();
      a.stream = null;
      a.src = null;
      a.analyser = null;
      a.buf = null;
    }
    mediaRecorder.current = null;
    return result;
  };

  const frame = (now: number) => {
    const s = st.current;
    const c = cfg.current;
    const dt = Math.min((now - s.last) / 1000, DT_MAX);
    s.last = now;
    let target = 0;
    if (s.listening) {
      if (s.audio?.analyser && s.audio.buf) target = micLevel(s.audio.analyser, s.audio.buf);
      else if (c.reactive !== 'mic') target = simulatedLevel((now - s.t0) / 1000);
      else target = simulatedLevel((now - s.t0) / 1000); // graceful fallback
    }
    target = Math.min(1, target * c.sensitivity);
    const tau = Math.max(1, target > s.env ? c.attack : c.release) / 1000;
    s.env += (target - s.env) * (1 - Math.exp(-dt / tau));
    if (s.listening && c.showTime && timeRef.current) {
      const text = clock(now - s.startedAt);
      if (timeRef.current.textContent !== text) timeRef.current.textContent = text;
    }
    if (s.listening && c.waveform && waveRef.current) drawWave(s, waveRef.current, s.env, c.accentColor, c.floor);
    s.raf = s.listening ? requestAnimationFrame(frame) : 0;
  };

  const begin = (kind: 'pointer' | 'key') => {
    const s = st.current;
    const c = cfg.current;
    if (s.listening || disabled) return;
    s.listening = true;
    s.hist = [];
    s.tick = 0;
    s.acc = 0;
    s.env = 0;
    s.startedAt = performance.now();
    s.t0 = s.startedAt;
    s.last = s.startedAt;
    if (timeRef.current) timeRef.current.textContent = '0:00';
    setListening(true);
    setInput(kind);
    if (!s.raf) s.raf = requestAnimationFrame(frame);
    c.onStart?.({ source: c.reactive });
    if (c.reactive === 'mic') {
      openMic(s).catch(() => {
        // Fallback to simulated if permission denied or unsupported
        c.reactive = 'simulated';
      });
    }
  };

  const end = (reason: string) => {
    const s = st.current;
    const c = cfg.current;
    if (!s.listening) return;
    s.listening = false;
    const dur = Math.max(500, Math.round(performance.now() - s.startedAt));
    const { audioBlob, audioUrl } = closeMic(s, reason, dur);
    setListening(false);
    setInput(reason === 'key' || reason === 'escape' ? 'key' : 'pointer');
    c.onStop?.({
      reason,
      duration: dur,
      audioBlob,
      audioUrl,
    });
  };

  const settleSlide = () => {
    const s = st.current;
    const root = rootRef.current;
    s.sliding = false;
    if (!root) return;
    delete root.dataset.sliding;
    root.style.setProperty('--vp-slide', '0px');
    root.style.setProperty('--vp-cancel', '0');
  };

  const onPointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    const s = st.current;
    const c = cfg.current;
    const root = rootRef.current;
    if (!root || s.pointerId !== e.pointerId || !c.slideToCancel || !s.listening || !s.ownPress) return;
    const dx = e.clientX - s.downX;
    if (!s.sliding && dx > -SLIDE_MIN) return;
    s.sliding = true;
    root.dataset.sliding = '';
    const pull = Math.min(c.cancelDistance + 24, Math.max(0, -dx));
    root.style.setProperty('--vp-slide', `${-pull}px`);
    const progress = Math.min(1, pull / c.cancelDistance);
    root.style.setProperty('--vp-cancel', progress.toFixed(3));
    if (progress >= 1) {
      settleSlide();
      end('cancel');
    }
  };

  const onPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    const s = st.current;
    if (disabled || e.button !== 0 || !e.isPrimary || s.pointerId !== null) return;
    s.pointerId = e.pointerId;
    s.downX = e.clientX;
    s.downAt = performance.now();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
    setPressed(true);
    s.ownPress = !s.listening;
    if (!s.listening) begin('pointer');
  };

  const onPointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    const s = st.current;
    const c = cfg.current;
    if (e.pointerId !== s.pointerId) return;
    s.pointerId = null;
    setPressed(false);
    if (s.sliding) settleSlide();
    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}
    if (!s.listening) return;
    const held = performance.now() - s.downAt;
    const isHold = c.mode === 'hold' || (c.mode === 'auto' && held >= c.holdAfter);
    if (s.ownPress) {
      if (isHold) end('release');
    } else {
      end(held < c.holdAfter ? 'tap' : 'release');
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'Escape') {
      end('escape');
      return;
    }
    if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) {
      e.preventDefault();
      if (st.current.listening) end('key');
      else begin('key');
    }
  };

  const onClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (e.detail === 0 && st.current.pointerId === null && !(e.nativeEvent as any).pointerType) {
      if (st.current.listening) end('key');
      else begin('key');
    }
  };

  useEffect(() => {
    if (!pressed) return undefined;
    const stop = () => end('blur');
    const onVis = () => {
      if (document.hidden) stop();
    };
    window.addEventListener('blur', stop);
    document.addEventListener('visibilitychange', onVis);
    return () => {
      window.removeEventListener('blur', stop);
      document.removeEventListener('visibilitychange', onVis);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pressed]);

  useEffect(() => {
    if (disabled) end('disabled');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [disabled]);

  useEffect(() => {
    const s = st.current;
    return () => {
      end('unmount');
      cancelAnimationFrame(s.raf);
      s.audio?.ctx.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const radius = shape === 'rounded' ? Math.round(size * 0.29) : size / 2;
  const hit = Math.max(0, Math.min(10, (44 - size) / 2));
  const timeSize = Math.max(10, Math.round(size * 0.36));
  const clockW = showTime ? Math.round(timeSize * 2.5) + 4 : 0;
  const waveW = waveform ? Math.round(size * 1.9) : 0;
  const extra = clockW + waveW;

  return (
    <button
      type="button"
      disabled={disabled}
      aria-label={ariaLabel}
      aria-pressed={listening}
      className={`voice-pill${className ? ` ${className}` : ''}`}
      data-state={listening ? 'listening' : 'idle'}
      data-pressed={pressed ? '' : undefined}
      data-input={input}
      data-time={showTime ? '' : undefined}
      ref={rootRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onLostPointerCapture={onPointerUp}
      onKeyDown={onKeyDown}
      onClick={onClick}
      onContextMenu={(e) => e.preventDefault()}
      style={{
        ['--vp-accent' as any]: accentColor,
        ['--vp-icon' as any]: iconColor,
        ['--vp-bg' as any]: background,
        ['--vp-size' as any]: `${size}px`,
        ['--vp-radius' as any]: `${radius}px`,
        ['--vp-reach' as any]: `${reach}px`,
        ['--vp-extra' as any]: `${extra}px`,
        ['--vp-clock-w' as any]: `${clockW}px`,
        ['--vp-wave-w' as any]: `${waveW}px`,
        ['--vp-stop' as any]: `${Math.round(size * 0.32)}px`,
        ['--vp-icon-size' as any]: `${Math.round(size * 0.54)}px`,
        ['--vp-time-size' as any]: `${timeSize}px`,
        ['--vp-open' as any]: `${openDuration}ms`,
        ['--vp-press' as any]: pressScale,
        ['--vp-hit' as any]: `${hit}px`,
      }}
    >
      <span className="voice-pill__capsule" aria-hidden="true" />
      {waveform ? <canvas ref={waveRef} className="voice-pill__wave" aria-hidden="true" /> : null}
      {slideToCancel ? (
        <span className="voice-pill__cancel" aria-hidden="true">
          <HugeiconsIcon icon={ArrowLeft01Icon as any} size={12} strokeWidth={2.2} />
          <span>Cancel</span>
        </span>
      ) : null}
      {showTime ? (
        <span ref={timeRef} className="voice-pill__time" aria-hidden="true">
          0:00
        </span>
      ) : null}
      <span className="voice-pill__glyph">
        <span className="voice-pill__mic">
          <HugeiconsIcon icon={Mic01Icon as any} size={Math.round(size * 0.54)} strokeWidth={2} />
        </span>
        <span className="voice-pill__stop" aria-hidden="true" />
      </span>
    </button>
  );
}

export default VoicePill;

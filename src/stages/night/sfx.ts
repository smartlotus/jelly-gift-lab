// Stage 3 sound design, all synthesized (no files). Goes through the shared master gain, so it is silent unless the
// player switched sound on (default muted). Tasteful: wind, crickets, soft footsteps, heartbeat, a low "hmph", tape
// static, then a clear little "ding~" + sparkle on the kawaii flip. No screams, no loud stingers.
import { out, unlock } from '../../shared/audio';

let ctx: AudioContext | null = null; let bus: GainNode | null = null; let noiseBuf: AudioBuffer | null = null;
let wind: { g: GainNode; f: BiquadFilterNode } | null = null; let cricketsOn = true; let nextCricket = 0;
function init() {
  if (ctx) return true;
  ctx = unlock(); const m = out(); if (!ctx || !m) { ctx = null; return false; }
  bus = ctx.createGain(); bus.gain.value = 0.9; bus.connect(m);
  noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return true;
}
function noise(dur: number, freq: number, q: number, vol: number, type: BiquadFilterType = 'bandpass', at = 0) {
  if (!ctx || !bus || !noiseBuf) return;
  const t0 = ctx.currentTime + at, s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
  const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
  const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + Math.min(0.02, dur / 4)); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  s.connect(f).connect(g).connect(bus); s.start(t0, Math.random()); s.stop(t0 + dur + 0.05);
}
function tone(freq: number, dur: number, vol: number, type: OscillatorType = 'sine', at = 0, slide = 0, attack = 0.01) {
  if (!ctx || !bus) return;
  const t0 = ctx.currentTime + at, o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t0); if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), t0 + dur);
  g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + attack); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(bus); o.start(t0); o.stop(t0 + dur + 0.05);
}

export const sfx = {
  start() {
    if (!init() || !ctx || !bus || !noiseBuf) return;
    const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 380; const g = ctx.createGain(); g.gain.value = 0.0;
    g.gain.linearRampToValueAtTime(0.11, ctx.currentTime + 3);
    s.connect(f).connect(g).connect(bus); s.start(); wind = { g, f };
  },
  /** per-frame ambience driver */
  tick(t: number, tension: number) {
    if (!ctx) return;
    if (wind) { wind.f.frequency.value = 320 + Math.sin(t * 0.37) * 120 + tension * 200; }
    if (cricketsOn && t > nextCricket) {
      nextCricket = t + 0.9 + Math.random() * 1.6;
      const f = 4200 + Math.random() * 900, n = 2 + Math.floor(Math.random() * 3);
      for (let i = 0; i < n; i++) tone(f, 0.05, 0.018, 'sine', i * 0.075);
    }
  },
  crickets(on: boolean) { cricketsOn = on; },
  step(run = false) { noise(run ? 0.09 : 0.12, run ? 900 : 650, 0.9, run ? 0.09 : 0.06); },
  heavyStep(vol = 0.25) { tone(62, 0.28, vol, 'sine', 0, -24); noise(0.16, 180, 1.2, vol * 0.5, 'lowpass'); },
  heartbeat(vol = 0.25) { tone(58, 0.16, vol, 'sine', 0, -14); tone(54, 0.18, vol * 0.75, 'sine', 0.2, -14); },
  /** low pitched-down "hmph" - pig grunt */
  grunt(vol = 0.12) { tone(110, 0.38, vol, 'sawtooth', 0, -50, 0.04); tone(96, 0.3, vol * 0.6, 'square', 0.32, -30, 0.03); noise(0.3, 300, 3, vol * 0.3, 'bandpass'); },
  rustle() { noise(0.5, 2200, 0.6, 0.05, 'highpass'); noise(0.35, 1500, 0.8, 0.04, 'bandpass', 0.25); },
  torchOut() { noise(0.2, 900, 1, 0.06, 'lowpass'); },
  wind(v: number) { if (wind && ctx) wind.g.gain.linearRampToValueAtTime(v, ctx.currentTime + 0.6); },
  staticBurst() { noise(0.36, 3000, 0.3, 0.07, 'highpass'); },
  ding() {
    if (!init()) return;
    if (wind && ctx) wind.g.gain.cancelScheduledValues(ctx.currentTime), wind.g.gain.setValueAtTime(0, ctx.currentTime);
    tone(1568, 1.6, 0.16, 'sine', 0.02); tone(2093, 1.3, 0.08, 'sine', 0.02); tone(3136, 0.6, 0.03, 'triangle', 0.02);
    [1319, 1568, 1976, 2637, 3136].forEach((f, i) => tone(f, 0.25, 0.05, 'triangle', 0.35 + i * 0.07));
  },
  pop() { tone(660, 0.12, 0.08, 'sine', 0, 500); },
};
// puzzle bits (appended): soft and friendly, never a buzzer
export const pzSfx = {
  tap(i = 0) { init(); tone(660 * Math.pow(1.26, i), 0.16, 0.06, 'triangle'); },
  nope() { init(); tone(330, 0.16, 0.05, 'sine', 0, -60); tone(262, 0.2, 0.04, 'sine', 0.12, -40); },
  ok() { init(); [784, 988, 1319].forEach((f, i) => tone(f, 0.3, 0.05, 'sine', i * 0.08)); },
  click() { init(); noise(0.05, 2400, 4, 0.08, 'bandpass'); tone(1800, 0.04, 0.03, 'square'); },
  creak() { init(); tone(140, 1.1, 0.05, 'sawtooth', 0, 60, 0.2); noise(0.9, 500, 6, 0.03, 'bandpass', 0.1); },
  /** music-box note: bright sine + a tine overtone, long soft tail */
  note(f: number) { init(); tone(f, 1.1, 0.07, 'sine'); tone(f * 4, 0.25, 0.012, 'sine'); },
  whoosh(lit: boolean) { init(); noise(0.18, lit ? 1600 : 700, 1.2, 0.05, 'bandpass'); if (lit) tone(880, 0.12, 0.02, 'triangle'); },
};
// v03f: area ambience + the cute scares (all soft; no screams, no loud stingers)
let amb: { g: GainNode; f: BiquadFilterNode; kind: string } | null = null; let nextAmb = 0;
export const night = {
  /** forest | house | grave | tunnel | clear | road | pink | end */
  area(kind: string) {
    if (!init() || !ctx || !bus || !noiseBuf) return;
    if (!amb) { const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true; const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 0.7; const g = ctx.createGain(); g.gain.value = 0; s.connect(f).connect(g).connect(bus); s.start(); amb = { g, f, kind: '' }; }
    if (amb.kind === kind) return; amb.kind = kind;
    const t = ctx.currentTime, [fr, v] = ({ house: [260, 0.05], tunnel: [140, 0.08], grave: [520, 0.045], pink: [900, 0.015], road: [300, 0.03] } as Record<string, [number, number]>)[kind] ?? [400, 0.0];
    amb.f.frequency.setTargetAtTime(fr, t, 0.8); amb.g.gain.setTargetAtTime(v, t, 0.8);
    cricketsOn = kind === 'forest' || kind === 'clear' || kind === 'pink' || kind === 'road';
  },
  tick(t: number) {
    if (!ctx || !amb || t < nextAmb) return;
    const k = amb.kind;
    if (k === 'house') { nextAmb = t + 3 + Math.random() * 5; if (Math.random() < .5) tone(95 + Math.random() * 40, 0.9, 0.025, 'sawtooth', 0, 40, 0.25); else { tone(1800, 0.03, 0.02, 'square'); tone(1500, 0.03, 0.015, 'square', 0.5); } }
    else if (k === 'tunnel') { nextAmb = t + 0.8 + Math.random() * 2.2; tone(1200 + Math.random() * 900, 0.12, 0.035, 'sine', 0, -500); }
    else if (k === 'grave') { nextAmb = t + 6 + Math.random() * 7; tone(420, 0.35, 0.03, 'sine', 0, -40, 0.06); tone(340, 0.5, 0.03, 'sine', 0.42, -30, 0.06); } // owl: hoo-hoo
    else nextAmb = t + 2;
  },
  boing() { init(); tone(180, 0.5, 0.09, 'sine', 0, 520, 0.01); tone(260, 0.35, 0.04, 'triangle', 0.05, 380); },
  horn() { init(); tone(420, 0.16, 0.06, 'square', 0, 60); tone(520, 0.5, 0.06, 'square', 0.17, -40); noise(0.4, 3000, 0.5, 0.03, 'highpass', 0.1); },
  ooo() { init(); tone(330, 1.2, 0.05, 'sine', 0, 140, 0.3); tone(332, 1.2, 0.03, 'triangle', 0.05, 120, 0.3); },
  flutter() { init(); for (let i = 0; i < 10; i++) noise(0.04, 2400, 2, 0.03, 'bandpass', i * 0.06); },
  sparkle() { init(); [1568, 1976, 2349, 3136].forEach((f, i) => tone(f, 0.22, 0.04, 'triangle', i * 0.06)); },
  engine(on: boolean) { if (!init()) return; if (on) { tone(55, 4.5, 0.06, 'sawtooth', 0, 25, 1.5); noise(4.5, 160, 0.8, 0.05, 'lowpass'); } else { noise(0.6, 900, 1, 0.05, 'bandpass'); tone(700, 0.25, 0.04, 'sine', 0.1, -300); } },
  pickup() { init(); tone(988, 0.12, 0.05, 'triangle'); tone(1319, 0.3, 0.05, 'triangle', 0.09); },
};

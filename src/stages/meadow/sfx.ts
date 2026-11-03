// Stage 1 sounds - all synthesised (shared/audio.ts; muted by default, the top-right toggle turns them on).
import { blip, out, unlock, soundOn, onSound } from '../../shared/audio';
const later = (ms: number, f: () => void) => setTimeout(f, ms);
export const sfx = {
  jump: () => blip(392, 0.12, 'square', 0.07, 420),
  heart: () => { blip(1175, 0.05, 'square', 0.06); later(55, () => blip(1568, 0.11, 'square', 0.06)); },
  bump: () => blip(150, 0.07, 'square', 0.1, -50),
  stomp: () => { blip(520, 0.06, 'triangle', 0.22, -300); later(60, () => blip(880, 0.08, 'square', 0.05)); },
  boop: () => blip(330, 0.09, 'triangle', 0.18, 120),
  bang: () => { blip(1320, 0.04, 'square', 0.05); later(70, () => blip(1320, 0.05, 'square', 0.05)); },
  spring: () => blip(180, 0.32, 'square', 0.07, 900),
  splash: () => { blip(240, 0.25, 'sawtooth', 0.04, -170); later(40, () => blip(900, 0.12, 'triangle', 0.05, -500)); },
  puff: () => blip(600, 0.14, 'triangle', 0.08, -380),
  bell: () => { blip(1568, 0.5, 'sine', 0.16); later(110, () => blip(2093, 0.7, 'sine', 0.09)); },
  slide: () => blip(220, 0.22, 'triangle', 0.12, -120),
  squeak: () => { blip(900, 0.08, 'square', 0.05, 500); later(90, () => blip(1400, 0.08, 'square', 0.05, 300)); },
  door: () => { blip(196, 0.16, 'triangle', 0.22); later(120, () => blip(147, 0.2, 'triangle', 0.18)); },
  sparkle: () => blip(2000 + Math.random() * 1400, 0.05, 'sine', 0.035),
  fanfare: () => [523, 659, 784, 1047, 1319, 1568].forEach((f, i) => later(i * 85, () => blip(f, 0.22, 'square', 0.06))),
};

// ---- a tiny looping tune (C major, 120 bpm): square lead + triangle bass, scheduled ahead on the AudioContext clock ----
const N: Record<string, number> = { C4: 261.6, D4: 293.7, E4: 329.6, F4: 349.2, G4: 392, A4: 440, B4: 493.9, C5: 523.3, D5: 587.3, E5: 659.3, F5: 698.5, G5: 784, A5: 880, C3: 130.8, F3: 174.6, G3: 196, A3: 220, E3: 164.8 };
// 32 eighth-notes per loop ('-' = rest, '_' = hold)
const LEAD = 'E5 G5 C5 _ E5 D5 C5 G4 | A4 C5 F5 _ E5 C5 D5 _ | E5 G5 C5 _ E5 D5 C5 A4 | G4 C5 D5 E5 C5 _ - -'.replace(/\|/g, '').split(/\s+/).filter(Boolean);
const BASS = 'C3 _ G3 _ C3 _ G3 _ | F3 _ C4 _ G3 _ G3 _ | A3 _ E3 _ F3 _ G3 _ | C3 _ G3 _ C3 _ - -'.replace(/\|/g, '').split(/\s+/).filter(Boolean);
let timer = 0, nextT = 0, step = 0, playing = false;
function tone(ctx: AudioContext, f: number, t0: number, dur: number, type: OscillatorType, vol: number) {
  const m = out(); if (!m) return;
  const o = ctx.createOscillator(), g = ctx.createGain(); o.type = type; o.frequency.value = f;
  g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(vol, t0 + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(m); o.start(t0); o.stop(t0 + dur + 0.03);
}
const holdLen = (seq: string[], i: number) => { let n = 1; while (seq[(i + n) % seq.length] === '_' && n < 8) n++; return n; };
export function music(on: boolean) {
  if (on === playing) return; playing = on; clearInterval(timer);
  if (!on) return;
  const ctx = unlock(); if (!ctx) return;
  const E = 60 / 120 / 2; nextT = ctx.currentTime + 0.1;
  timer = window.setInterval(() => {
    if (!soundOn()) return;
    while (nextT < ctx.currentTime + 0.3) {
      const i = step % LEAD.length, l = LEAD[i], b = BASS[i];
      if (N[l]) tone(ctx, N[l], nextT, E * holdLen(LEAD, i) * 0.9, 'square', 0.035);
      if (N[b]) tone(ctx, N[b], nextT, E * holdLen(BASS, i) * 0.95, 'triangle', 0.09);
      nextT += E; step++;
    }
  }, 60);
}
onSound(v => { if (v && playing) { const ctx = unlock(); if (ctx) nextT = Math.max(nextT, ctx.currentTime + 0.05); } });

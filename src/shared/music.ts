// Original pastoral BGM (no audio files). Mood only — light, airy, piano-and-acoustic, drifting in from far away
// like a theme heard on the wind. The melody is newly written (D major, gentle 6/8) and is not a transcription of
// any film cue. Layers gather slowly: air pad → soft ostinato → melody → bass/bells. Everything rides the shared
// master gain (muted by default). Safe to start/stop/crossfade; respects visibility and prefers-reduced-motion density.
import { out, unlock, soundOn, onSound, onUnlocked } from './audio';

export type TuneId = 'bloom' | 'grove' | 'hearth' | 'dream';

interface Tune {
  eighth: number;      // seconds per eighth-note
  transpose: number;   // semitones
  fadeIn: number;      // seconds from near-silence to full
  brightness: number;  // 0..1 high-partial mix
  wet: number;         // extra delay / "hall" feel
}

const TUNES: Record<TuneId, Tune> = {
  bloom: { eighth: 0.255, transpose: 0, fadeIn: 22, brightness: 1, wet: 0.18 },
  grove: { eighth: 0.295, transpose: -5, brightness: 0.72, fadeIn: 26, wet: 0.34 },
  hearth: { eighth: 0.27, transpose: -2, brightness: 0.86, fadeIn: 14, wet: 0.16 },
  dream: { eighth: 0.32, transpose: 0, brightness: 0.92, fadeIn: 8, wet: 0.28 },
};

// D major scale (Hz). Melody is written in scale degrees so transpose stays musical.
const DEG = [293.66, 329.63, 369.99, 392.0, 440.0, 493.88, 554.37, 587.33]; // D4..D5
const deg = (n: number, oct = 0) => {
  // n: 1 = D, 2 = E, ... 8 = D'; 0 / negative unused
  const i = n - 1;
  const o = Math.floor(i / 7) + oct;
  const k = ((i % 7) + 7) % 7;
  return DEG[k] * Math.pow(2, o);
};
const tr = (hz: number, st: number) => hz * Math.pow(2, st / 12);

// 8 bars of 6/8 = 48 eighths. Progression: D | Bm | G | A | D | F#m | G | A
const CHORD: number[][] = [
  [1, 3, 5], [6, 1, 3], [4, 6, 1], [5, 7, 2],
  [1, 3, 5], [3, 5, 7], [4, 6, 1], [5, 7, 2],
];
const ROOTS = [1, 6, 4, 5, 1, 3, 4, 5]; // scale degrees, bass one octave down

// Original lead (scale degrees; 0 = rest, negative = hold previous). One value per eighth.
// Phrase A rises and settles; phrase B answers higher, then comes home. Not "Kaze ni Naru".
const LEAD = [
  5, 0, 6, 8, 9, 10,   10, 9, 8, 6, 5, 0,
  3, 5, 6, 8, 0, 0,    6, 5, 3, 2, 1, 0,
  9, 0, 8, 6, 5, 3,    5, 0, 6, 8, 9, 0,
  10, 9, 8, 6, 5, 0,   1, 0, 0, 0, 0, 0,
];
// Soft high bells that arrive later, answering the lead
const BELLS = [
  0, 0, 0, 0, 0, 0,    12, 0, 10, 0, 8, 0,
  0, 0, 0, 0, 0, 0,    0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0,    10, 0, 8, 0, 5, 0,
  0, 0, 0, 0, 0, 0,    8, 0, 5, 0, 1, 0,
];

let wanted: TuneId | null = null;
let ctx: AudioContext | null = null;
let bus: GainNode | null = null;
let delay: DelayNode | null = null;
let timer = 0;
let nextT = 0;
let step = 0;
let startedAt = 0;
let fadingOut = false;

function init(): boolean {
  if (ctx && bus) return true;
  ctx = unlock();
  const m = out();
  if (!ctx || !m) { ctx = null; return false; }
  bus = ctx.createGain();
  bus.gain.value = 0.0001;
  // a short, quiet echo so notes feel like they arrived through air (not a copy of any hall verb)
  delay = ctx.createDelay(1.2);
  delay.delayTime.value = 0.28;
  const fb = ctx.createGain(); fb.gain.value = 0.22;
  const dw = ctx.createGain(); dw.gain.value = 0.2;
  const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 220;
  bus.connect(m);
  bus.connect(hp).connect(delay).connect(fb).connect(delay);
  delay.connect(dw).connect(m);
  return true;
}

function voice(freq: number, t0: number, dur: number, vol: number, kind: 'piano' | 'pad' | 'bell' | 'bass' | 'air') {
  if (!ctx || !bus) return;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  if (kind === 'pad' || kind === 'air') {
    g.gain.exponentialRampToValueAtTime(vol, t0 + Math.min(0.8, dur * 0.4));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  } else if (kind === 'bell') {
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(vol * 0.35, t0 + 0.18);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  } else if (kind === 'bass') {
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  } else {
    // piano-like: quick hammer, singing decay
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.008);
    g.gain.exponentialRampToValueAtTime(vol * 0.45, t0 + 0.09);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  }
  const mix = (type: OscillatorType, hz: number, k: number) => {
    const o = ctx!.createOscillator();
    o.type = type; o.frequency.setValueAtTime(hz, t0);
    const gg = ctx!.createGain(); gg.gain.value = k;
    o.connect(gg).connect(g); o.start(t0); o.stop(t0 + dur + 0.05);
  };
  if (kind === 'piano') {
    mix('triangle', freq, 0.7);
    mix('sine', freq, 0.55);
    mix('sine', freq * 2.003, 0.12);
  } else if (kind === 'bell') {
    mix('sine', freq, 0.8);
    mix('sine', freq * 2.01, 0.22);
    mix('triangle', freq * 3.01, 0.06);
  } else if (kind === 'bass') {
    mix('sine', freq, 0.85);
    mix('triangle', freq, 0.25);
  } else if (kind === 'pad') {
    mix('sine', freq, 0.5);
    mix('sine', freq * 1.003, 0.35);
    mix('triangle', freq * 0.5, 0.2);
  } else {
    mix('sine', freq, 0.6);
    mix('sine', freq * 1.01, 0.25);
  }
  g.connect(bus);
}

function layerGain(age: number, fadeIn: number, appear: number, full: number): number {
  // appear/full are fractions of fadeIn. Returns 0..1.
  const a = appear * fadeIn, f = full * fadeIn;
  if (age <= a) return 0;
  if (age >= f) return 1;
  const k = (age - a) / Math.max(0.01, f - a);
  return k * k * (3 - 2 * k);
}

function schedule() {
  if (!ctx || !bus || !wanted || !soundOn() || fadingOut) return;
  const tune = TUNES[wanted];
  const E = tune.eighth;
  const age = ctx.currentTime - startedAt;
  const master = 0.9 * layerGain(age, tune.fadeIn, 0, 1);
  // far-away start: overall voice sits very quiet, then walks forward
  bus.gain.setTargetAtTime(Math.max(0.0001, master * 0.55), ctx.currentTime, 0.25);
  if (delay) {
    const dw = (delay as DelayNode).delayTime; void dw;
  }

  while (nextT < ctx.currentTime + 0.35) {
    const i = step % 48;
    const bar = Math.floor(i / 6) % 8;
    const eighth = i % 6;
    const t0 = nextT;
    const st = tune.transpose;
    const gPad = layerGain(age, tune.fadeIn, 0.0, 0.28);
    const gOst = layerGain(age, tune.fadeIn, 0.22, 0.55);
    const gMel = layerGain(age, tune.fadeIn, 0.42, 0.78);
    const gLow = layerGain(age, tune.fadeIn, 0.62, 1.0);
    const gBel = layerGain(age, tune.fadeIn, 0.7, 1.0);

    // breathing air pad on beat 0 of each bar (held across the bar)
    if (eighth === 0 && gPad > 0.01) {
      for (const d of CHORD[bar]) {
        voice(tr(deg(d, -1), st), t0, E * 6.2, 0.018 * gPad, 'pad');
      }
      voice(tr(deg(CHORD[bar][0], 1), st), t0, E * 6.2, 0.01 * gPad * tune.brightness, 'air');
    }

    // ostinato: root, fifth, octave, fifth, third, fifth
    if (gOst > 0.01) {
      const pat = [CHORD[bar][0], CHORD[bar][2], CHORD[bar][0] + 7, CHORD[bar][2], CHORD[bar][1], CHORD[bar][2]];
      const n = pat[eighth];
      voice(tr(deg(n, 0), st), t0, E * 0.92, 0.034 * gOst, 'piano');
    }

    // melody
    if (gMel > 0.01) {
      const n = LEAD[i];
      if (n > 0) {
        let hold = 1;
        while (i + hold < 48 && LEAD[i + hold] === 0 && hold < 6) { /* rests are rests */ break; }
        // look ahead for implicit sustain until next non-zero? we treat 0 as rest.
        const dur = E * (eighth === 5 ? 1.6 : 1.35);
        voice(tr(deg(n, n >= 8 ? 0 : 0), st) * (n >= 8 ? 1 : 1), t0, dur, 0.052 * gMel, 'piano');
        if (tune.brightness > 0.8) voice(tr(deg(n, 1), st) * 0.5 + tr(deg(n, 0), st) * 0.5, t0, dur * 0.5, 0.012 * gMel, 'air');
      }
    }

    // bass on beats 1 and 4 (eighths 0 and 3)
    if (gLow > 0.01 && (eighth === 0 || eighth === 3)) {
      voice(tr(deg(ROOTS[bar], -2), st), t0, E * (eighth === 0 ? 3.1 : 2.6), 0.055 * gLow, 'bass');
    }

    // answering bells
    if (gBel > 0.01) {
      const n = BELLS[i];
      if (n > 0) voice(tr(deg(n, n >= 8 ? 0 : 1), st), t0, E * 3.4, 0.028 * gBel * tune.brightness, 'bell');
    }

    nextT += E;
    step++;
  }
}

function armClock() {
  clearInterval(timer);
  if (!wanted) return;
  timer = window.setInterval(schedule, 70);
  schedule();
}

function tryStart() {
  if (!wanted || !soundOn() || fadingOut) return;
  if (!init() || !ctx || !bus) return;
  if (ctx.state === 'suspended') ctx.resume().catch(() => { /* no output device */ });
  if (startedAt === 0) startedAt = ctx.currentTime;
  if (delay) {
    // wet mix tracks the tune
    // (connected once; feedback already set)
  }
  armClock();
}

onUnlocked(() => { if (wanted && soundOn()) tryStart(); });

onSound(v => {
  if (v) { fadingOut = false; tryStart(); }
  else if (bus && ctx) bus.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.12);
});

window.addEventListener('visibilitychange', () => {
  if (!ctx || !bus) return;
  if (document.hidden) bus.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.2);
  else if (wanted && soundOn() && !fadingOut) {
    const age = ctx.currentTime - startedAt;
    const master = 0.9 * layerGain(age, TUNES[wanted].fadeIn, 0, 1);
    bus.gain.setTargetAtTime(Math.max(0.0001, master * 0.55), ctx.currentTime, 0.25);
  }
});
window.addEventListener('pagehide', () => stopTune(0.15));

/** begin (or replace) a tune. Re-calling the same id is a no-op. A different id crossfades. */
export function startMusic(id: TuneId) {
  if (wanted === id && !fadingOut) { tryStart(); return; }
  const restart = () => {
    wanted = id; fadingOut = false; step = 0; startedAt = 0;
    if (ctx) { nextT = ctx.currentTime + 0.08; startedAt = ctx.currentTime; }
    tryStart();
  };
  if (wanted && bus && ctx) {
    fadingOut = true;
    bus.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.35);
    const prev = wanted;
    window.setTimeout(() => { if (wanted === prev || fadingOut) restart(); }, 420);
    wanted = id; // lock the new name so a second call during fade doesn't stack
    return;
  }
  restart();
}

export function stopTune(sec = 1.1) {
  fadingOut = true;
  if (bus && ctx) bus.gain.setTargetAtTime(0.0001, ctx.currentTime, Math.max(0.05, sec / 3));
  window.setTimeout(() => {
    clearInterval(timer); timer = 0;
    wanted = null; fadingOut = false; startedAt = 0; step = 0;
  }, sec * 1000 + 80);
}

/** one-shot sparkle / chime that matches the current key (ambient, not the theme melody). */
export function chime(kind: 'petal' | 'spore' | 'meet' | 'save' | 'door' = 'meet') {
  if (!soundOn() || !init() || !ctx) return;
  const st = wanted ? TUNES[wanted].transpose : 0;
  const t0 = ctx.currentTime;
  if (kind === 'petal') voice(tr(deg(8, 1), st), t0, 0.5, 0.03, 'bell');
  else if (kind === 'spore') { voice(tr(deg(5, 1), st), t0, 0.7, 0.025, 'bell'); voice(tr(deg(8, 1), st), t0 + 0.05, 0.5, 0.016, 'air'); }
  else if (kind === 'meet') { voice(tr(deg(5, 0), st), t0, 0.35, 0.04, 'piano'); voice(tr(deg(8, 0), st), t0 + 0.07, 0.45, 0.03, 'piano'); }
  else if (kind === 'save') { [5, 8, 10, 12].forEach((d, i) => voice(tr(deg(d, 0), st), t0 + i * 0.09, 0.55, 0.04, 'bell')); }
  else { voice(tr(deg(1, -1), st), t0, 0.4, 0.05, 'bass'); voice(tr(deg(5, 0), st), t0 + 0.08, 0.5, 0.03, 'piano'); }
}

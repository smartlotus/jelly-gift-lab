// Tiny WebAudio synth (no audio files -> nothing to download, nothing to host). MUTED BY DEFAULT; the choice persists in
// localStorage['gift.sound'] across stages. ?sound=1 forces on (dev). The AudioContext is created on the first user gesture
// (iOS rule), so call unlock() from a pointerdown/keydown handler (the stage start card does this).
const STORE = 'gift.sound';
let on = (() => { if (new URLSearchParams(location.search).get('sound') === '1') return true; try { return localStorage.getItem(STORE) === '1'; } catch { return false; } })();
let ctx: AudioContext | null = null; let master: GainNode | null = null;
let gestured = false;
const subs: ((on: boolean) => void)[] = [];
const unlockedSubs: (() => void)[] = [];
export const soundOn = () => on;
export function markGesture() { gestured = true; }
export function onUnlocked(f: () => void) { unlockedSubs.push(f); }
function mayUnlock(): boolean {
  try {
    const ua = (navigator as Navigator & { userActivation?: { hasBeenActive?: boolean } }).userActivation;
    if (ua && typeof ua.hasBeenActive === 'boolean' && ua.hasBeenActive) return true;
  } catch { /* */ }
  return gestured;
}
/** has she ever flipped the switch (or was ?sound=1 given)? Unset = muted by default, but a deliberate tap may offer sound */
export const soundChosen = () => { try { return localStorage.getItem(STORE) !== null; } catch { return true; } };
export function setSound(v: boolean, persist = true) { on = v; if (persist) try { localStorage.setItem(STORE, v ? '1' : '0'); } catch { /* */ } if (master) master.gain.value = v ? 0.6 : 0; subs.forEach(f => f(v)); }
export function onSound(f: (on: boolean) => void) { subs.push(f); }
let notifiedUnlock = false;
export function unlock(): AudioContext | null {
  if (!mayUnlock()) return ctx;
  if (!ctx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext; if (!AC) return null;
    try { ctx = new AC(); } catch { return null; } master = ctx.createGain(); master.gain.value = on ? 0.6 : 0; master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => { /* no audio device / no gesture: stay silent */ });
  // Notify once so listeners (music) can start after a real gesture without re-entering unlock().
  if (!notifiedUnlock) {
    notifiedUnlock = true;
    unlockedSubs.slice().forEach(f => f());
  }
  return ctx;
}
export const out = () => master;
/** one chiptune-ish note: blip(660, .08, 'square') */
export function blip(freq: number, dur = 0.08, type: OscillatorType = 'square', vol = 0.18, slide = 0) {
  if (!on || !ctx || !master) return;
  const t0 = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t0); if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t0 + dur);
  g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(master); o.start(t0); o.stop(t0 + dur + 0.02);
}

/** a sounding note with a start delay and stereo pan: tone(880, .3, 'sine', .1, { at: .2, slide: -300, pan: -.5 }) */
export function tone(freq: number, dur = 0.2, type: OscillatorType = 'sine', vol = 0.12, o: { at?: number; slide?: number; pan?: number; attack?: number } = {}) {
  if (!on || !ctx || !master) return;
  const t0 = ctx.currentTime + (o.at ?? 0), osc = ctx.createOscillator(), g = ctx.createGain(); const a = o.attack ?? 0.004;
  osc.type = type; osc.frequency.setValueAtTime(freq, t0); if (o.slide) osc.frequency.exponentialRampToValueAtTime(Math.max(30, freq + o.slide), t0 + dur);
  g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + a); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  let n: AudioNode = g; if (o.pan && ctx.createStereoPanner) { const p = ctx.createStereoPanner(); p.pan.value = Math.max(-1, Math.min(1, o.pan)); g.connect(p); n = p; }
  osc.connect(g); n.connect(master); osc.start(t0); osc.stop(t0 + dur + 0.03);
}
let noiseBuf: AudioBuffer | null = null;
/** filtered noise burst (pops, whooshes, taps): noise(.25, .2, { freq: 900, to: 200, q: 0.8, type: 'lowpass', at: 0 }) */
export function noise(dur = 0.2, vol = 0.15, o: { freq?: number; to?: number; q?: number; type?: BiquadFilterType; at?: number; pan?: number; attack?: number } = {}) {
  if (!on || !ctx || !master) return;
  if (!noiseBuf) { noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
  const t0 = ctx.currentTime + (o.at ?? 0), src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
  src.buffer = noiseBuf; src.loop = true; f.type = o.type ?? 'lowpass'; f.Q.value = o.q ?? 0.7; f.frequency.setValueAtTime(o.freq ?? 1200, t0);
  if (o.to) f.frequency.exponentialRampToValueAtTime(Math.max(40, o.to), t0 + dur);
  g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + (o.attack ?? 0.004)); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  let n: AudioNode = g; if (o.pan && ctx.createStereoPanner) { const p = ctx.createStereoPanner(); p.pan.value = Math.max(-1, Math.min(1, o.pan)); g.connect(p); n = p; }
  src.connect(f).connect(g); n.connect(master); src.start(t0, Math.random() * 0.5); src.stop(t0 + dur + 0.03);
}

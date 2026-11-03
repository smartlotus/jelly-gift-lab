// Tiny WebAudio synth (no audio files -> nothing to download, nothing to host). MUTED BY DEFAULT; the choice persists in
// localStorage['gift.sound'] across stages. ?sound=1 forces on (dev). The AudioContext is created on the first user gesture
// (iOS rule), so call unlock() from a pointerdown/keydown handler (the stage start card does this).
const STORE = 'gift.sound';
let on = (() => { if (new URLSearchParams(location.search).get('sound') === '1') return true; try { return localStorage.getItem(STORE) === '1'; } catch { return false; } })();
let ctx: AudioContext | null = null; let master: GainNode | null = null;
const subs: ((on: boolean) => void)[] = [];
export const soundOn = () => on;
export function setSound(v: boolean) { on = v; try { localStorage.setItem(STORE, v ? '1' : '0'); } catch { /* */ } if (master) master.gain.value = v ? 0.6 : 0; subs.forEach(f => f(v)); }
export function onSound(f: (on: boolean) => void) { subs.push(f); }
export function unlock(): AudioContext | null {
  if (!ctx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext; if (!AC) return null;
    ctx = new AC(); master = ctx.createGain(); master.gain.value = on ? 0.6 : 0; master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') void ctx.resume();
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

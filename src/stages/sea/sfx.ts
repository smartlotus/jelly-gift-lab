// /sea/ sound (v03d), all synthesized — no files. Goes through the shared master gain, so it is silent unless the player
// switched sound on (default muted, remembered across stages in localStorage['gift.sound']). Quiet and round: a low
// underwater hush that breathes, the odd bubble while swimming, a soft glass bell when a new scene opens (pentatonic, one
// note per scene so the run plays a slow melody), a little pluck when the shark noses into a bridge object and a sparkle
// when it has turned into the next scene's thing; on the way up the hush opens out, then a soft splash at the surface.
import { out, unlock, soundOn } from '../../shared/audio';

let ctx: AudioContext | null = null, bus: GainNode | null = null, noiseBuf: AudioBuffer | null = null;
let hush: { g: GainNode; f: BiquadFilterNode } | null = null, nextBubble = 0, rising = 0;
function init() {
  if (ctx) return true;
  ctx = unlock(); const m = out(); if (!ctx || !m) { ctx = null; return false; }
  bus = ctx.createGain(); bus.gain.value = 0.9; bus.connect(m);
  noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate); const d = noiseBuf.getChannelData(0);
  let b = 0; for (let i = 0; i < d.length; i++) { b = (b + 0.02 * (Math.random() * 2 - 1)) / 1.02; d[i] = b * 3.5; } // brown-ish: warmer than white
  return true;
}
function tone(freq: number, dur: number, vol: number, type: OscillatorType = 'sine', at = 0, slide = 0, attack = 0.012) {
  if (!ctx || !bus) return;
  const t0 = ctx.currentTime + at, o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t0); if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), t0 + dur);
  g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + attack); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(bus); o.start(t0); o.stop(t0 + dur + 0.05);
}
function noise(dur: number, freq: number, q: number, vol: number, type: BiquadFilterType = 'bandpass', at = 0) {
  if (!ctx || !bus || !noiseBuf) return;
  const t0 = ctx.currentTime + at, s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
  const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
  const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + Math.min(0.08, dur / 3)); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  s.connect(f).connect(g).connect(bus); s.start(t0, Math.random()); s.stop(t0 + dur + 0.05);
}
// D major pentatonic over two octaves: the run's scenes walk it up and back so the bells never clash
const PENTA = [587.3, 659.3, 740, 880, 987.8, 1174.7, 1318.5, 1480];
const bellOf = (i: number) => PENTA[[0, 2, 1, 3, 4, 2, 3, 5, 4, 6, 5, 3, 4, 2, 0][i % 15] ?? 0];

export const sfx = {
  /** call from a user gesture (or when sound is switched on): starts the hush; safe to call repeatedly */
  start() {
    if (!soundOn() || !init() || !ctx || !bus || !noiseBuf || hush) return;
    const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 260; f.Q.value = 0.4;
    const g = ctx.createGain(); g.gain.value = 0; g.gain.linearRampToValueAtTime(0.16, ctx.currentTime + 3);
    s.connect(f).connect(g).connect(bus); s.start(); hush = { g, f };
  },
  /** per-frame: the hush breathes (and opens up while rising); bubbles now and then while the shark swims hard */
  tick(t: number, swim: number) {
    if (!ctx || !hush) return;
    hush.f.frequency.value = 220 + Math.sin(t * 0.23) * 60 + Math.sin(t * 0.61) * 25 + rising * 900;
    if (t > nextBubble) {
      nextBubble = t + (swim > 0.5 ? 0.7 : 2.4) + Math.random() * 2.2;
      const n = 1 + Math.floor(Math.random() * (swim > 0.5 ? 3 : 2)), f0 = 380 + Math.random() * 260;
      for (let i = 0; i < n; i++) tone(f0 * (1 + i * 0.18), 0.09, 0.022, 'sine', i * 0.07 + Math.random() * 0.03, f0 * 1.4, 0.006);
    }
  },
  /** a new scene opens: one soft glass bell (sine + a quiet fifth above), its note set by the scene's place in the run */
  scene(i: number) {
    if (!ctx) return; const f = bellOf(i);
    tone(f, 2.6, 0.06, 'sine', 0, 0, 0.02); tone(f * 1.5, 1.8, 0.018, 'sine', 0.04, 0, 0.02); tone(f * 2.01, 0.9, 0.01, 'triangle', 0.02);
  },
  /** the shark noses into a bridge object */
  pick() { if (!ctx) return; tone(784, 0.22, 0.04, 'triangle', 0, 120); tone(1175, 0.18, 0.02, 'sine', 0.05); },
  /** the bridge object has become the next scene's thing */
  turned() { if (!ctx) return; [1319, 1568, 1976, 2349].forEach((f, k) => tone(f, 0.5, 0.022, 'sine', k * 0.06)); },
  /** surfacing: k 0 → 1 over the rise; splash once at the top */
  rise(k: number) { rising = Math.max(0, Math.min(1, k)); if (hush && ctx) hush.g.gain.setTargetAtTime(0.16 * (1 - rising * 0.55), ctx.currentTime, 0.3); },
  splash() { if (!ctx) return; noise(0.9, 1400, 0.6, 0.05, 'highpass'); noise(0.5, 700, 0.8, 0.04, 'bandpass', 0.05); tone(392, 1.8, 0.02, 'sine', 0.3); },
  fade() { if (hush && ctx) hush.g.gain.setTargetAtTime(0, ctx.currentTime, 0.4); },
};

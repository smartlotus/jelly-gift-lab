// v03g: "alive" idle life for the piglet and the cat (the shark/fish already have theirs).
//
// Everything here is *gentle input to the real soft-body sim*, never a vertex animation:
//   - muscle channels (ears, snout, tail, head tilt) are driven by randomised one-shot events
//   - the whole body breathes / sways / squats through a tiny, smooth extra acceleration (the same input the
//     phone's gravity sensor uses), so the jelly answers the way jelly does: squish, lean, settle
//   - hops are the engine's existing invisible-hand `celebrate()`
// All timing is randomised, so no two minutes look alike. Anything the user does (touch, wheel, drag, tilt switch)
// fades the whole thing out within ~250 ms and it only comes back after she has been still for a moment.

export type AliveChar = 'pig' | 'cat';
type Shape = (p: number) => number; // p in 0..1 -> -1..1
const TAU = Math.PI * 2;
const rnd = (a: number, b: number) => a + Math.random() * (b - a);
const pick = <T,>(...v: T[]) => v[(Math.random() * v.length) | 0];
const bump: Shape = p => Math.sin(Math.PI * p) ** 2;                                 // soft in, soft out
const flick: Shape = p => Math.sin(Math.PI * Math.min(1, p / 0.8)) * Math.exp(-p * 1.5) * (p < 0.8 ? 1 : 0.3); // sharp fold, soft return
const hold: Shape = p => { const a = Math.min(1, p / 0.22), b = Math.min(1, (1 - p) / 0.3); const s = (x: number) => x * x * (3 - 2 * x); return s(a) * s(b); };
const sniff: Shape = p => Math.sin(TAU * 4.2 * p) * Math.sin(Math.PI * p) ** 0.7;
const wag: Shape = p => Math.sin(TAU * 3 * p) * Math.sin(Math.PI * p);

interface Ev { ch: number; t0: number; dur: number; amp: number; f: Shape }
interface AEv { t0: number; dur: number; dir: number[]; amp: number; f: (p: number, t: number) => number }

export class Alive {
  /** set by the engine: ask the invisible hand for a hop */
  hop: (n: number) => void = () => {};
  /** the 3-vector of extra acceleration (sim units/s^2) to add this frame */
  acc = [0, 0, 0];
  reduced = false;
  private t = 0; private gain = 0; private still = 0;
  private evs: Ev[] = []; private aevs: AEv[] = [];
  private next: Record<string, number> = {};
  private tailPh = 0;
  readonly channels: number;
  constructor(readonly id: AliveChar, reduced = false) {
    this.reduced = reduced; this.channels = 4;
    // the first signs of life come quickly (a sniff or an ear flick within ~1.5 s), the big moves a bit later
    const k = (a: number, b: number) => rnd(a, b);
    this.next = id === 'pig'
      ? { earL: k(1.0, 2.2), earR: k(2.5, 4), sniff: k(0.8, 1.6), look: k(3.5, 6), hop: k(5, 8), sway: k(3, 5), squish: k(6, 9) }
      : { earL: k(1.2, 2.4), earR: k(2.8, 4.4), tilt: k(1.0, 2.0), flick: k(3, 5), hop: k(6, 9), sway: k(3.5, 6), stretch: k(7, 10) };
  }

  private add(ch: number, dur: number, amp: number, f: Shape) { this.evs.push({ ch, t0: this.t, dur, amp: amp * (this.reduced ? 0.55 : 1), f }); }
  private push(dur: number, dir: number[], amp: number, f: (p: number, t: number) => number) { this.aevs.push({ t0: this.t, dur, dir, amp: amp * (this.reduced ? 0.3 : 1), f }); }
  private due(k: string, a: number, b: number) { if (this.t < this.next[k]) return false; this.next[k] = this.t + rnd(a, b); return true; }
  private sway(amp: number) { const a = rnd(0, TAU), s = Math.random() < 0.5 ? 1 : -1; const w = rnd(1.8, 2.4); this.push(1.5, [Math.cos(a), 0, Math.sin(a)], amp * s, (p, t) => Math.sin(TAU * w * t) * Math.exp(-3.2 * t)); }

  /** @param busy the user is touching / dragging / twisting / tilting */
  update(dt: number, busy: boolean, act: Float32Array) {
    this.t += dt;
    this.still = busy ? 0 : this.still + dt;
    const goal = !busy && this.still > 1.1 ? 1 : 0;
    this.gain += (goal - this.gain) * (1 - Math.exp(-dt / (goal ? 0.5 : 0.09)));
    if (busy) { this.evs.length = 0; this.aevs.length = 0; }
    const live = this.gain > 0.98 && !busy;
    if (live) this.schedule();
    if (busy) this.pendingHop = null;
    else if (this.pendingHop && this.t >= this.pendingHop.at) { this.hop(this.pendingHop.n); this.pendingHop = null; }
    this.evs = this.evs.filter(e => this.t - e.t0 < e.dur); this.aevs = this.aevs.filter(e => this.t - e.t0 < e.dur);
    act.fill(0);
    for (const e of this.evs) if (this.t >= e.t0) act[e.ch] += e.amp * e.f((this.t - e.t0) / e.dur);
    if (this.id === 'pig') act[3] += 0.07 * Math.sin(TAU * this.t / 3.1 - 0.5) * (this.reduced ? 0.4 : 1); // the belly breathes with the body
    if (this.id === 'cat') { // the tail never quite stops: a lazy swish whose speed and size drift, plus occasional flicks above
      const drift = 0.5 + 0.5 * Math.sin(TAU * this.t / 7.3 + 1.1);
      this.tailPh += TAU * dt * (0.42 + 0.38 * drift);
      act[0] += (0.30 + 0.28 * drift) * Math.sin(this.tailPh) * (this.reduced ? 0.55 : 1);
    }
    // breathing: a slow, soft vertical acceleration -> the body squishes a hair on the in-breath and rises on the out
    const br = (this.id === 'pig' ? 3.4 : 2.6) * Math.sin(TAU * this.t / (this.id === 'pig' ? 3.1 : 3.8)) * (this.reduced ? 0.4 : 1);
    // ...and a never-quite-still lean that wanders (two slow incommensurate sines per axis)
    const m = this.reduced ? 0.3 : 1;
    this.acc[0] = m * 2.2 * (Math.sin(TAU * this.t / 5.3 + 0.7) + 0.6 * Math.sin(TAU * this.t / 3.1)); this.acc[1] = br; this.acc[2] = m * 1.6 * Math.sin(TAU * this.t / 6.7 + 2.1);
    for (const e of this.aevs) { if (this.t < e.t0) continue; const tt = this.t - e.t0, v = e.amp * e.f(tt / e.dur, tt); this.acc[0] += e.dir[0] * v; this.acc[1] += e.dir[1] * v; this.acc[2] += e.dir[2] * v; }
    for (let i = 0; i < 3; i++) this.acc[i] *= this.gain;
    for (let i = 0; i < act.length; i++) act[i] *= this.gain;
  }

  private schedule() {
    const red = this.reduced;
    if (this.id === 'pig') {
      if (this.due('earL', 2.4, 5.5)) { this.add(1, 0.9, rnd(0.7, 1), flick); if (Math.random() < 0.28) this.add(2, 0.9, rnd(0.6, 0.9), flick); }
      if (this.due('earR', 2.8, 6)) { this.add(2, 0.9, rnd(0.7, 1), flick); if (Math.random() < 0.25) this.add(1, 0.9, rnd(0.5, 0.8), flick); }
      if (this.due('sniff', 3, 6.5)) { this.add(0, 1.15, rnd(0.55, 0.8), sniff); if (Math.random() < 0.4) this.add(3, 0.5, 0.12, bump); }
      if (this.due('look', 6, 10.5)) { // look left, then right, then back: the snout leads, a little sway follows
        const s = pick(-1, 1); this.add(0, 1.5, 0.5 * s, hold);
        this.evs.push({ ch: 0, t0: this.t + 1.55, dur: 1.6, amp: -0.42 * s * (red ? 0.55 : 1), f: hold });
        if (Math.random() < 0.6) this.sway(9);
      }
      if (this.due('sway', 5, 9)) this.sway(rnd(10, 16));
      if (this.due('squish', 8, 14) && !red) { // a happy little squat-and-stretch, no hop
        this.push(0.9, [0, 1, 0], -22, (p) => Math.sin(Math.PI * p * 2) * (p < 0.5 ? 1 : -0.8) * Math.sin(Math.PI * p));
      }
      if (this.due('hop', 7, 13) && !red) { const n = Math.random() < 0.3 ? 2 : 1; this.push(0.14, [0, 1, 0], -20, bump); this.pendingHop = { at: this.t + 0.13, n }; }
    } else {
      if (this.due('earL', 2.6, 6)) { this.add(2, 0.6, rnd(0.45, 0.8), (p) => Math.sin(Math.PI * p) * Math.exp(-p * 2)); if (Math.random() < 0.5) this.add(2, 0.5, 0.4, wag); }
      if (this.due('earR', 3.0, 6.8)) { this.add(3, 0.6, rnd(0.45, 0.8), (p) => Math.sin(Math.PI * p) * Math.exp(-p * 2)); if (Math.random() < 0.4) this.add(3, 0.5, 0.4, wag); }
      if (this.due('tilt', 4.5, 8.5)) { // the curious head tilt, held, sometimes answered the other way
        const s = pick(-1, 1); this.add(1, 1.9, 0.42 * s, hold);
        this.add(2, 0.6, 0.6, (p) => Math.sin(Math.PI * p));
        if (Math.random() < 0.4) this.evs.push({ ch: 1, t0: this.t + 2.0, dur: 1.7, amp: -0.36 * s * (red ? 0.55 : 1), f: hold });
      }
      if (this.due('flick', 7, 13)) this.add(0, 0.9, 0.5, wag);
      if (this.due('sway', 5.5, 10)) this.sway(rnd(8, 13));
      if (this.due('stretch', 10, 16) && !red) { // a little lazy stretch: a soft rise then settle
        this.push(1.6, [0, 1, 0], 4.2, (p) => Math.sin(Math.PI * p) ** 2);
      }
      if (this.due('hop', 8, 14) && !red) { this.push(0.14, [0, 1, 0], -20, bump); this.pendingHop = { at: this.t + 0.13, n: 1 }; }
    }
  }
  private pendingHop: { at: number; n: number } | null = null;
}

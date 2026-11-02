import type { Actuation } from '../../core/character';
import { clamp, smoothstep } from '../../core/sdf';
import { S, YOFF, EARS, HEAD, TAIL_PTS, sdCore } from './shape';

const bY = (y: number) => y / S + YOFF;
const KEEL = 1.2, TOP = 0.42;
// tail centre-line x at a given height (upper, upright part of the tail)
const tailX = (by: number) => { let best = TAIL_PTS[0], bd = 1e9; for (const p of TAIL_PTS) { const d = Math.abs(p[1] - by); if (d < bd && p[1] > 9) { bd = d; best = p; } } return best[0]; };

/** Four muscles: 0 tail swish, 1 head tilt, 2/3 left/right ear twitch. */
export const catActuation: Actuation = {
  channels: 4,
  axes: [[0, 1, 0], [0, 1, 0], EARS[0].v, EARS[1].v],
  weights(cx, cy, cz, out) {
    const bx = cx / S, by = bY(cy), bz = cz / S;
    // tail: the upright part bends sideways (left half stretches while the right half shortens)
    const inTail = smoothstep(-6.0, -7.8, bz) * smoothstep(9.0, 13.0, by) * smoothstep(8.0, 10.0, bx);
    out[0] = inTail * clamp((bx - tailX(by)) / 1.4, -1, 1);
    // head tilt: the neck/lower head on one side lengthens, the other shortens
    const neck = smoothstep(HEAD.c[1] - 13, HEAD.c[1] - 8, by) * (1 - smoothstep(HEAD.c[1] - 1, HEAD.c[1] + 3, by));
    out[1] = neck * clamp(bx / 7, -1, 1) * smoothstep(0.02, -0.005, sdCore(cx, cy, cz));
    for (let i = 0; i < 2; i++) {
      const f = EARS[i]; const dx = bx - f.o[0], dy = by - f.o[1], dz = bz - f.o[2];
      const v = dx * f.v[0] + dy * f.v[1] + dz * f.v[2], w = dx * f.w[0] + dy * f.w[1] + dz * f.w[2];
      const side = i === 0 ? bx > 1 : bx < -1;
      out[2 + i] = side ? clamp(w / 1.2, -1, 1) * smoothstep(-1.5, 1.5, v) : 0;
    }
  },
  stiffness(cx, cy) { return 3.0 + 0.6 * smoothstep(0.1, 0.3, cy); },
  gravity(x, y, z) {
    const sec = clamp(y / TOP * 2 - 1, -1, 1);
    const keel = Math.max(0.2, 1 - KEEL * 0.5 * sec);
    return keel * (1 - 0.8 * smoothstep(0.0, 0.03, sdCore(x, y, z)));
  },
  activation(t, out) {
    // tail: a slow lazy swish with a livelier flick now and then
    const env = 0.55 + 0.45 * smoothstep(0.3, 0.9, 0.5 + 0.5 * Math.sin(2 * Math.PI * t / 9.0));
    out[0] = 0.55 * env * Math.sin(2 * Math.PI * t / 2.2);
    // head tilt: a curious tilt held for a moment, every ~8 s, alternating sides
    const ph = ((t + 2) % 16) / 16; const tilt = (a: number) => smoothstep(a, a + 0.06, ph) * (1 - smoothstep(a + 0.2, a + 0.28, ph));
    out[1] = 0.16 * (tilt(0.05) - tilt(0.55));
    // ear twitches
    const tw = (tt: number, per: number) => { const p = ((tt % per) + per) % per; return p < 0.5 ? Math.sin(Math.PI * p / 0.5) * Math.exp(-p * 2) : 0; };
    out[2] = 0.5 * tw(t - 0.8, 5.3);
    out[3] = 0.5 * tw(t - 3.4, 6.7);
  },
};

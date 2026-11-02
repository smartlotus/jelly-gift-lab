import type { Actuation } from '../../core/character';
import { clamp, smoothstep, type V3 } from '../../core/sdf';
import { S, YOFF, SNOUT, EARS, HEAD, sdCore } from './shape';

// rest-space helpers (figure units -> rest)
const bY = (y: number) => y / S + YOFF;
const earAxis = (i: number): V3 => EARS[i].v;
const earN = (i: number): V3 => EARS[i].w;
const KEEL = 1.2;
const TOP = 0.5;

/** Four muscles: 0 snout wiggle (side to side), 1/2 left/right ear flick, 3 a little squash-and-stretch bounce. */
export const pigActuation: Actuation = {
  channels: 4,
  axes: [[0, 0, 1], earAxis(0), earAxis(1), [0, 1, 0]],
  weights(cx, cy, cz, out) {
    const bx = cx / S, by = bY(cy), bz = cz / S;
    // snout + the face right behind it; left half lengthens while the right half shortens -> the snout swings sideways
    const sn = smoothstep(9.0, 4.0, Math.hypot(bx * 0.8, (by - SNOUT.y) * 1.1)) * smoothstep(3.0, 8.0, bz);
    out[0] = clamp(bx / 2.5, -1, 1) * sn;
    // ears: front face vs back face of the slab -> the ear folds forward/back
    for (let i = 0; i < 2; i++) {
      const f = EARS[i]; const dx = bx - f.o[0], dy = by - f.o[1], dz = bz - f.o[2];
      const v = dx * f.v[0] + dy * f.v[1] + dz * f.v[2], w = dx * earN(i)[0] + dy * earN(i)[1] + dz * earN(i)[2];
      const side = i === 0 ? bx > 1 : bx < -1;
      out[1 + i] = side ? clamp(w / 1.2, -1, 1) * smoothstep(-1.5, 1.5, v) : 0;
    }
    // bounce: the lower body stretches up while the head rides on top
    out[3] = smoothstep(HEAD.c[1] + 2, HEAD.c[1] - 8, by) * smoothstep(0.03, -0.005, sdCore(cx, cy, cz));
  },
  // a firm-ish jelly so the big head does not sag into the body; ears/tail get the fin stiffness from finW
  stiffness(cx, cy) { return 3.0 + 0.6 * smoothstep(0.1, 0.3, cy); },
  gravity(x, y, z) {
    const sec = clamp(y / TOP * 2 - 1, -1, 1);
    const keel = Math.max(0.2, 1 - KEEL * 0.5 * sec);
    return keel * (1 - 0.75 * smoothstep(0.0, 0.03, sdCore(x, y, z)));
  },
  activation(t, out) {
    // snout: a quick sniff-wiggle every ~4.6 s
    const ps = (t % 4.6) / 4.6; const envS = smoothstep(0.0, 0.05, ps) * (1 - smoothstep(0.18, 0.3, ps));
    out[0] = 0.6 * Math.sin(2 * Math.PI * t * 3.4) * envS;
    // ears: alternate flicks, a sharp fold then a soft return
    const flick = (tt: number) => { const p = ((tt % 6.2) + 6.2) % 6.2; return p < 0.9 ? Math.sin(Math.PI * p / 0.9) * Math.exp(-p * 1.5) : 0; };
    out[1] = 0.95 * flick(t - 1.2);
    out[2] = 0.95 * flick(t - 4.3);
    // bounce: two little hops every ~7 s
    const pb = (t % 7.0); const hop = (a: number) => pb > a && pb < a + 0.5 ? Math.sin(Math.PI * (pb - a) / 0.5) : 0;
    out[3] = 0.2 * (hop(2.6) + 0.7 * hop(3.15));
  },
};

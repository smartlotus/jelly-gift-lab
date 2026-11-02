import type { Actuation } from '../../core/character';
import { clamp, smoothstep } from '../../core/sdf';
import { bodyA, sdCore } from './shape';

/** Two muscle channels: 0 = slow head sweep (metal detector over the sand), 1 = tail swish. */
export const sharkActuation: Actuation = {
  channels: 2,
  weights(cx, cy, cz, out) {
    const inside = smoothstep(0.02, -0.004, sdCore(cx, cy, cz));
    const side = clamp(cz / (bodyA(clamp(cx, -0.42, 0.47)) * 0.75), -1, 1);
    const head = smoothstep(0.10, 0.20, cx) * (1 - smoothstep(0.33, 0.40, cx));
    const tail = smoothstep(-0.02, -0.14, cx) * (1 - smoothstep(-0.36, -0.40, cx) * 0.5);
    out[0] = side * head * inside;
    out[1] = side * tail * inside;
  },
  // the head and neck are a little firmer so the hammer is carried just above the sand
  stiffness(cx) { return 1 + 1.6 * smoothstep(0.22, 0.40, cx) + 10 * smoothstep(-0.26, -0.37, cx); },
  // the hammer skims the sand (low friction); the belly and fins grip
  friction(x) { return 1 - 0.92 * smoothstep(0.30, 0.40, x); },
  gravity(x, y, z) { return 1 - 0.8 * smoothstep(0.0, 0.035, sdCore(x, y, z)); },
  activation(t, out) {
    out[0] = 0.28 * Math.sin((2 * Math.PI * t) / 5.2);
    const env = smoothstep(0.15, 0.85, 0.5 + 0.5 * Math.sin((2 * Math.PI * t) / 7.0 + 1.3));
    out[1] = 0.13 * Math.sin((2 * Math.PI * t) / 1.5) * env;
  },
};

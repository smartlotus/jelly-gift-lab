// Cat look: three colourways + sleepy face drawn in the shader from rest-space coordinates.
import type { Colourway, Look } from '../../core/look';
import { twin, f } from '../../core/shaderlang';
import { S, YOFF, FACE } from './shape';

const BG = { bgTop: [0.50, 0.50, 0.495] as [number, number, number], bgBot: [0.36, 0.36, 0.355] as [number, number, number], floor: [0.66, 0.655, 0.645] as [number, number, number] };
export const COLOURWAYS: Colourway[] = [
  { id: 'cream', absorb: [0.45, 1.1, 2.9], back: [0.97, 0.60, 0.70, 0.85], finTip: [0.97, 0.60, 0.70, 0.9], belly: [1.0, 0.965, 0.91, 1], glow: [1.0, 0.88, 0.70, 1], bead: [0.40, 0.62, 0.95, 1], swatch: '#f1e3c8', ...BG },
  { id: 'mint', absorb: [3.2, 0.75, 1.7], back: [0.97, 0.62, 0.72, 0.85], finTip: [0.97, 0.62, 0.72, 0.9], belly: [0.95, 1.0, 0.97, 1], glow: [0.70, 1.0, 0.86, 1], bead: [0.98, 0.55, 0.45, 1], swatch: '#b9e3cf', ...BG },
  { id: 'lavender', absorb: [1.5, 2.3, 0.6], back: [0.98, 0.60, 0.74, 0.85], finTip: [0.98, 0.60, 0.74, 0.9], belly: [0.97, 0.955, 1.0, 1], glow: [0.86, 0.78, 1.0, 1], bead: [0.98, 0.80, 0.35, 1], swatch: '#cbbfec', ...BG },
];

const F = FACE;
const inner = twin('innerPattern', [['X', 'vec3'], ['Nr', 'vec3']], /* glsl */`
  vec3 b = X / ${f(S)} + vec3(0.0, ${f(YOFF)}, 0.0);
  float ax = abs(b.x);
  float face = smoothstep(2.0, 5.0, b.z);
  // sleepy closed eyes: thick arcs, tapering at the ends
  float t = clamp((ax - ${f(F.eyeX)}) / ${f(F.eyeHW)}, -1.0, 1.0);
  float cy = ${f(F.eyeY)} + ${f(F.eyeArch)} * (1.0 - t * t);
  float ex = max(abs(ax - ${f(F.eyeX)}) - ${f(F.eyeHW)}, 0.0);
  float ed = length(vec2(ex, b.y - cy));
  float eyes = (1.0 - smoothstep(${f(F.eyeW)} * (1.0 - 0.45 * t * t), ${f(F.eyeW)} * (1.0 - 0.45 * t * t) + 0.16, ed)) * face;
  // ω mouth: two little lower arcs
  vec2 mq = vec2(ax - ${f(F.mouthR)}, b.y - ${f(F.mouthY + 0.35)});
  float md = abs(length(mq) - ${f(F.mouthR)});
  float mouth = (1.0 - smoothstep(0.17, 0.3, md)) * smoothstep(0.25, -0.15, mq.y) * face * (1.0 - smoothstep(${f(F.mouthR * 2.2)}, ${f(F.mouthR * 2.4)}, ax));
  // a tiny pink nose
  float nose = 1.0 - smoothstep(0.85, 1.0, length(vec2(b.x / 0.75, (b.y - ${f(F.noseY)}) / 0.5)));
  nose = nose * face;
  // whiskers: three per side, fanning out
  float wk = 0.0;
  float wx = clamp((ax - ${f(F.whiskX0)}) / ${f(F.whiskX1 - F.whiskX0)}, 0.0, 1.0);
  float win = smoothstep(${f(F.whiskX0 - 0.3)}, ${f(F.whiskX0 + 0.3)}, ax) * (1.0 - smoothstep(${f(F.whiskX1 - 0.3)}, ${f(F.whiskX1 + 0.2)}, ax));
  float w0 = abs(b.y - (${f(F.whiskY + F.whiskGap)} + 0.9 * wx));
  float w1 = abs(b.y - (${f(F.whiskY)} + 0.1 * wx));
  float w2 = abs(b.y - (${f(F.whiskY - F.whiskGap)} - 0.7 * wx));
  wk = (1.0 - smoothstep(${f(F.whiskW)}, ${f(F.whiskW + 0.14)}, min(w0, min(w1, w2)))) * win * smoothstep(0.0, 3.0, b.z);
  float ch = 1.0 - smoothstep(0.4, 1.05, length(vec2((ax - ${f(F.cheekX)}) / ${f(F.cheekRX)}, (b.y - ${f(F.cheekY)}) / ${f(F.cheekRY)})));
  ch = ch * face;
  vec3 alb = vec3(1.0);
  alb = mix(alb, vec3(1.0, 0.66, 0.74), ch * 0.8);
  alb = mix(alb, vec3(0.95, 0.55, 0.64), nose);
  alb = mix(alb, vec3(0.50, 0.50, 0.54), wk);
  alb = mix(alb, vec3(0.10, 0.085, 0.09), max(eyes, mouth));
  return vec4(alb, 0.0);`);
const shell = twin('shellPattern', [['X', 'vec3'], ['Nr', 'vec3'], ['A', 'vec4']], /* glsl */`
  return vec4(A.z + A.w, 0.0, A.w, 0.0);`);

export const catLook: Look = { colourways: COLOURWAYS, shellGLSL: shell.glsl, innerGLSL: inner.glsl, shellWGSL: shell.wgsl, innerWGSL: inner.wgsl };

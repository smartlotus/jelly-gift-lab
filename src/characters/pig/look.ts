// Pig look: three colourways + face drawn in the shader from rest-space coordinates (shared constants with shape.ts).
import type { Colourway, Look } from '../../core/look';
import { twin, f, v3 } from '../../core/shaderlang';
import { S, YOFF, SNOUT, NOSTRIL, CHEEK, EYES, EYE_R } from './shape';

const BG = { bgTop: [0.50, 0.50, 0.495] as [number, number, number], bgBot: [0.36, 0.36, 0.355] as [number, number, number], floor: [0.66, 0.655, 0.645] as [number, number, number] };
export const COLOURWAYS: Colourway[] = [
  { id: 'strawberry', label: 'Strawberry', zh: '草莓', absorb: [0.9, 8.5, 5.2], back: [0.96, 0.52, 0.62, 0.85], finTip: [0.95, 0.55, 0.66, 0.5], belly: [1.0, 0.84, 0.87, 1], glow: [1.0, 0.60, 0.68, 1], bead: [0.98, 0.80, 0.30, 1], swatch: '#f0a1b2', ...BG },
  { id: 'peach', label: 'Peach', zh: '蜜桃', absorb: [0.55, 3.0, 6.2], back: [1.0, 0.58, 0.50, 0.8], finTip: [1.0, 0.62, 0.52, 0.5], belly: [1.0, 0.89, 0.81, 1], glow: [1.0, 0.72, 0.55, 1], bead: [0.55, 0.78, 0.36, 1], swatch: '#f4b48f', ...BG },
  { id: 'milk', label: 'Milk', zh: '牛奶', absorb: [0.45, 0.55, 0.7], back: [0.98, 0.58, 0.68, 0.85], finTip: [0.97, 0.70, 0.76, 0.5], belly: [0.985, 0.975, 0.965, 1], glow: [1.0, 0.90, 0.88, 1], bead: [0.95, 0.42, 0.50, 1], swatch: '#efebe4', ...BG },
];

const E = EYES;
const inner = twin('innerPattern', [['X', 'vec3'], ['Nr', 'vec3']], /* glsl */`
  vec3 b = X / ${f(S)} + vec3(0.0, ${f(YOFF)}, 0.0);
  float sd = step(0.0, b.x);
  vec3 eo = mix(${v3(E[1].o)}, ${v3(E[0].o)}, sd);
  vec3 eu = mix(${v3(E[1].u)}, ${v3(E[0].u)}, sd);
  vec3 ev = mix(${v3(E[1].v)}, ${v3(E[0].v)}, sd);
  vec3 ew = mix(${v3(E[1].w)}, ${v3(E[0].w)}, sd);
  vec3 d = b - eo;
  vec3 q = vec3(dot(d, eu), dot(d, ev), dot(d, ew)) / ${v3(EYE_R)};
  float eye = 1.0 - smoothstep(1.03, 1.12, length(q));
  float e = length(vec2(b.x / ${f(SNOUT.rx - 0.5)}, (b.y - ${f(SNOUT.y)}) / ${f(SNOUT.ry - 0.5)}));
  float snout = (1.0 - smoothstep(0.97, 1.08, e)) * smoothstep(${f(SNOUT.z0 + 1.2)}, ${f(SNOUT.z0 + 2.4)}, b.z);
  float front = smoothstep(0.5, 0.8, Nr.z);
  float nos = 1.0 - smoothstep(0.86, 1.0, length(vec2((abs(b.x) - ${f(NOSTRIL.x)}) / ${f(NOSTRIL.rx)}, (b.y - ${f(SNOUT.y)}) / ${f(NOSTRIL.ry)})));
  nos = nos * front * snout;
  float rim = (1.0 - smoothstep(0.0, 0.07, abs(e - 0.9))) * front * snout * 0.35;
  float ch = 1.0 - smoothstep(0.45, 1.05, length(vec2((abs(b.x) - ${f(CHEEK.x)}) / ${f(CHEEK.rx)}, (b.y - ${f(CHEEK.y)}) / ${f(CHEEK.ry)})));
  ch = ch * smoothstep(2.0, 5.5, b.z) * (1.0 - snout);
  vec3 alb = vec3(1.0);
  alb = mix(alb, vec3(0.97, 0.66, 0.75), snout);
  alb = mix(alb, vec3(0.98, 0.50, 0.60), ch * 0.85);
  alb = alb * (1.0 - rim);
  alb = mix(alb, vec3(0.20, 0.11, 0.13), nos);
  return vec4(alb, eye);`);
const shell = twin('shellPattern', [['X', 'vec3'], ['Nr', 'vec3'], ['A', 'vec4']], /* glsl */`
  return vec4(A.z, 0.0, A.w * 0.7, 0.0);`);

export const pigLook: Look = { colourways: COLOURWAYS, shellGLSL: shell.glsl, innerGLSL: inner.glsl, shellWGSL: shell.wgsl, innerWGSL: inner.wgsl };

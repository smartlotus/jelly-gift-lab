// Shark look: colourways + rest-space pattern shaders (GLSL + WGSL twins).
import type { Colourway, Look } from '../../core/look';
export type { Colourway };
export const COLOURWAYS: Colourway[] = [
  { id: 'steel', label: 'Steel', zh: '钢灰', absorb: [5.0, 3.0, 1.9], back: [0.42, 0.50, 0.58, 0.6], finTip: [0.20, 0.24, 0.30, 0.8], belly: [0.93, 0.935, 0.93, 1], glow: [0.62, 0.78, 0.92, 1], bead: [0.95, 0.45, 0.32, 1], swatch: '#7d8b97',
    bgTop: [0.50, 0.50, 0.495], bgBot: [0.36, 0.36, 0.355], floor: [0.66, 0.655, 0.645] },
  { id: 'amber', label: 'Amber', zh: '琥珀', absorb: [0.5, 2.8, 9.0], back: [0.62, 0.38, 0.14, 0.55], finTip: [0.35, 0.18, 0.06, 0.8], belly: [0.98, 0.93, 0.82, 1], glow: [1.0, 0.70, 0.30, 1], bead: [0.85, 0.15, 0.20, 1], swatch: '#c98a2e',
    bgTop: [0.52, 0.505, 0.49], bgBot: [0.37, 0.36, 0.35], floor: [0.67, 0.655, 0.635] },
  { id: 'gummy', label: 'Gummy Blue', zh: '软糖蓝', absorb: [13.0, 4.6, 0.8], back: [0.18, 0.33, 0.78, 0.6], finTip: [0.05, 0.10, 0.40, 0.8], belly: [0.90, 0.94, 1.0, 1], glow: [0.35, 0.62, 1.0, 1], bead: [1.0, 0.55, 0.15, 1], swatch: '#2f63d6',
    bgTop: [0.50, 0.505, 0.51], bgBot: [0.355, 0.36, 0.365], floor: [0.655, 0.66, 0.665] },
];

const HAMMER_FRONT_GLSL = `float hammerFront(float z){ float q = abs(z)/0.226; return 0.505 - 0.018*q*q - 0.0085*exp(-(z*z)/(0.011*0.011)); }`;
const HAMMER_FRONT_WGSL = `fn hammerFront(z: f32) -> f32 { let q = abs(z)/0.226; return 0.505 - 0.018*q*q - 0.0085*exp(-(z*z)/(0.011*0.011)); }`;

/** shell: returns vec4(backPigment, slitMask, duskyTip, grooveMask) */
export const SHELL_PATTERN_GLSL = /* glsl */`
${HAMMER_FRONT_GLSL}
vec4 shellPattern(vec3 X, vec3 Nr, vec4 A) {
  float secV = A.x * 4.0 - 2.0; float fin = A.y; float tip = A.z;
  float back = smoothstep(-0.25, 0.85, secV);
  back = max(back, fin * smoothstep(0.10, 0.20, X.y) * 0.85);   // dorsal fins dark too
  // five gill slits, drawn from rest space
  float gill = 0.0;
  for (int k = 0; k < 5; k++) {
    float xk = 0.318 - float(k) * 0.0150;
    float xc = xk - 0.008 * secV * secV + 0.004 * secV;
    float w = 0.0009 + 0.0006 * (1.0 - abs(secV));
    float d = abs(X.x - xc);
    float span = 1.0 - smoothstep(0.38, 0.62, abs(secV + 0.05 + float(k) * 0.02));
    gill = max(gill, (1.0 - smoothstep(w * 0.4, w, d)) * span);
  }
  gill *= smoothstep(0.30, 0.55, abs(Nr.z)) * (1.0 - fin);
  // narial grooves running along the front of the hammer
  float du = hammerFront(X.z) - X.x;
  float gz = smoothstep(0.018, 0.04, abs(X.z)) * (1.0 - smoothstep(0.19, 0.215, abs(X.z)));
  float groove = (1.0 - smoothstep(0.0005, 0.0011, abs(du - 0.0062 - 0.004 * abs(X.z)))) * gz;
  groove += (1.0 - smoothstep(0.0004, 0.0009, abs(du - 0.0125 - 0.006 * abs(X.z)))) * gz * 0.6;
  groove *= smoothstep(0.38, 0.44, X.x) * smoothstep(-0.2, 0.3, Nr.y);
  return vec4(back, gill, tip, groove);
}
`;
export const SHELL_PATTERN_WGSL = /* wgsl */`
${HAMMER_FRONT_WGSL}
fn shellPattern(X: vec3f, Nr: vec3f, A: vec4f) -> vec4f {
  let secV = A.x * 4.0 - 2.0; let fin = A.y; let tip = A.z;
  var back = smoothstep(-0.25, 0.85, secV);
  back = max(back, fin * smoothstep(0.10, 0.20, X.y) * 0.85);
  var gill = 0.0;
  for (var k = 0; k < 5; k++) {
    let xk = 0.318 - f32(k) * 0.0150;
    let xc = xk - 0.008 * secV * secV + 0.004 * secV;
    let w = 0.0009 + 0.0006 * (1.0 - abs(secV));
    let d = abs(X.x - xc);
    let span = 1.0 - smoothstep(0.38, 0.62, abs(secV + 0.05 + f32(k) * 0.02));
    gill = max(gill, (1.0 - smoothstep(w * 0.4, w, d)) * span);
  }
  gill *= smoothstep(0.30, 0.55, abs(Nr.z)) * (1.0 - fin);
  let du = hammerFront(X.z) - X.x;
  let gz = smoothstep(0.018, 0.04, abs(X.z)) * (1.0 - smoothstep(0.19, 0.215, abs(X.z)));
  var groove = (1.0 - smoothstep(0.0005, 0.0011, abs(du - 0.0062 - 0.004 * abs(X.z)))) * gz;
  groove += (1.0 - smoothstep(0.0004, 0.0009, abs(du - 0.0125 - 0.006 * abs(X.z)))) * gz * 0.6;
  groove *= smoothstep(0.38, 0.44, X.x) * smoothstep(-0.2, 0.3, Nr.y);
  return vec4f(back, gill, tip, groove);
}
`;

/** inner (milky) layer: returns vec4(albedo multiplier rgb, eye mask) — eyes glossy black, mouth crescent w/ milky teeth, pores. */
export const INNER_PATTERN_GLSL = /* glsl */`
float hash21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
vec4 innerPattern(vec3 X, vec3 Nr) {
  vec3 eyeC = vec3(0.465, 0.048, sign(X.z) * 0.218);
  float eye = 1.0 - smoothstep(0.0148, 0.0158, length(X - eyeC));
  float down = smoothstep(-0.25, -0.6, Nr.y);
  // mouth: crescent on the underside of the head
  vec2 mc = vec2(0.392, 0.0); vec2 q = X.xz - mc;
  float r = length(q); float th = atan(q.y, q.x);
  float arc = abs(r - 0.042);
  float inArc = 1.0 - smoothstep(0.62, 0.78, abs(th));
  float mouth = (1.0 - smoothstep(0.0016, 0.0026, arc)) * inArc * down;
  // teeth: small milky triangles along the crescent
  float tt = fract(th * 30.0 / 3.14159);
  float tooth = (1.0 - smoothstep(0.0, 0.0018 * (1.0 - abs(tt * 2.0 - 1.0)) + 0.0002, abs(r - 0.0418))) * step(0.0, 0.0) ;
  tooth *= inArc * down * step(0.5, 1.0 - abs(tt * 2.0 - 1.0) + 0.25);
  // ampullary pores beneath the hammer
  vec2 cell = X.xz / 0.0062; vec2 ci = floor(cell); vec2 cf = fract(cell) - 0.5;
  vec2 jit = vec2(hash21(ci), hash21(ci + 7.1)) - 0.5;
  float pr = length(cf - jit * 0.6) * 0.0062;
  float du = hammerFront(X.z) - X.x;
  float poreZone = down * smoothstep(0.37, 0.42, X.x) * (1.0 - smoothstep(0.035, 0.06, du)) * step(0.35, hash21(ci + 3.3));
  float pore = (1.0 - smoothstep(0.00045, 0.0008, pr)) * poreZone;
  vec3 alb = vec3(1.0);
  alb *= 1.0 - mouth * 0.82;
  alb = mix(alb, vec3(1.08), tooth * mouth);
  alb *= 1.0 - pore * 0.55;
  return vec4(alb, eye);
}
`;
export const INNER_PATTERN_WGSL = /* wgsl */`
fn hash21(p0: vec2f) -> f32 { var p = fract(p0 * vec2f(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
fn innerPattern(X: vec3f, Nr: vec3f) -> vec4f {
  let eyeC = vec3f(0.465, 0.048, sign(X.z) * 0.218);
  let eye = 1.0 - smoothstep(0.0148, 0.0158, length(X - eyeC));
  let down = smoothstep(-0.25, -0.6, Nr.y);
  let mc = vec2f(0.392, 0.0); let q = X.xz - mc;
  let r = length(q); let th = atan2(q.y, q.x);
  let arc = abs(r - 0.042);
  let inArc = 1.0 - smoothstep(0.62, 0.78, abs(th));
  let mouth = (1.0 - smoothstep(0.0016, 0.0026, arc)) * inArc * down;
  let tt = fract(th * 30.0 / 3.14159);
  var tooth = (1.0 - smoothstep(0.0, 0.0018 * (1.0 - abs(tt * 2.0 - 1.0)) + 0.0002, abs(r - 0.0418)));
  tooth *= inArc * down * step(0.5, 1.0 - abs(tt * 2.0 - 1.0) + 0.25);
  let cell = X.xz / 0.0062; let ci = floor(cell); let cf = fract(cell) - 0.5;
  let jit = vec2f(hash21(ci), hash21(ci + 7.1)) - 0.5;
  let pr = length(cf - jit * 0.6) * 0.0062;
  let du = hammerFront(X.z) - X.x;
  let poreZone = down * smoothstep(0.37, 0.42, X.x) * (1.0 - smoothstep(0.035, 0.06, du)) * step(0.35, hash21(ci + 3.3));
  let pore = (1.0 - smoothstep(0.00045, 0.0008, pr)) * poreZone;
  var alb = vec3f(1.0);
  alb *= 1.0 - mouth * 0.82;
  alb = mix(alb, vec3f(1.08), tooth * mouth);
  alb *= 1.0 - pore * 0.55;
  return vec4f(alb, eye);
}
`;

export const sharkLook: Look = {
  colourways: COLOURWAYS,
  shellGLSL: SHELL_PATTERN_GLSL, innerGLSL: INNER_PATTERN_GLSL,
  shellWGSL: SHELL_PATTERN_WGSL, innerWGSL: INNER_PATTERN_WGSL,
};

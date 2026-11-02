import { GLSL_FRAME } from '../frame';
import { SHELL_PATTERN_GLSL, INNER_PATTERN_GLSL } from '../../characters/shark/look';

const HDR = `#version 300 es
precision highp float; precision highp int; precision highp sampler2D;
${GLSL_FRAME}
`;

export const COMMON = /* glsl */`
float sat(float x){ return clamp(x, 0.0, 1.0); }
float rectMask(vec2 p, vec2 h, float s){ vec2 q = 1.0 - smoothstep(h - s, h + s, abs(p)); return q.x * q.y; }
// Studio environment: dim walls + large overhead softbox + two strip lights + rim.
vec3 envStudio(vec3 d){
  float up = d.y;
  vec3 c = mix(vec3(0.035, 0.035, 0.038), vec3(0.16, 0.16, 0.158), smoothstep(-0.3, 0.9, up)) + vec3(0.22) * smoothstep(0.1, -0.25, up);
  if (d.y > 0.02) { vec2 p = d.xz * (2.2 / d.y) - vec2(0.25, 0.55); c += vec3(6.0, 5.9, 5.7) * rectMask(p, vec2(1.1, 0.75), 0.35); }
  if (d.z > 0.05) { vec2 p = vec2(d.x, d.y) * (2.4 / d.z) - vec2(-1.3, 0.9); c += vec3(2.6) * rectMask(p, vec2(0.22, 0.9), 0.12); }
  if (d.x > 0.05) { vec2 p = vec2(d.z, d.y) * (2.6 / d.x) - vec2(1.2, 0.8); c += vec3(2.0, 2.0, 2.05) * rectMask(p, vec2(0.25, 0.7), 0.15); }
  if (d.z < -0.05) { vec2 p = vec2(d.x, d.y) * (2.5 / -d.z) - vec2(-0.2, 1.4); c += vec3(3.2, 3.1, 3.0) * rectMask(p, vec2(1.4, 0.5), 0.4); }
  return c;
}
vec3 lightKey(){ return normalize(fr.lightDir.xyz); }
vec3 lightRim(){ return normalize(vec3(-0.15, 0.55, -1.0)); }
float linDepth(vec3 P){ return -(fr.view * vec4(P, 1.0)).z; }
`;

const SKIN = /* glsl */`
uniform highp sampler2D uNodes; uniform highp sampler2D uRest;
ivec2 tcoord(int t){ return ivec2(t & 1023, t >> 10); }
void skinOne(int n, float w, vec3 X, inout vec3 P, inout mat3 Fs){
  vec3 x = texelFetch(uNodes, tcoord(n * 4), 0).xyz;
  mat3 F = mat3(texelFetch(uNodes, tcoord(n * 4 + 1), 0).xyz, texelFetch(uNodes, tcoord(n * 4 + 2), 0).xyz, texelFetch(uNodes, tcoord(n * 4 + 3), 0).xyz);
  vec3 Xk = texelFetch(uRest, tcoord(n), 0).xyz;
  P += w * (x + F * (X - Xk)); Fs += w * F;
}
void skin(vec3 X, vec3 Nr, uvec4 nd, vec4 w, out vec3 P, out vec3 Nw){
  P = vec3(0.0); mat3 Fs = mat3(0.0);
  skinOne(int(nd.x), w.x, X, P, Fs); skinOne(int(nd.y), w.y, X, P, Fs);
  skinOne(int(nd.z), w.z, X, P, Fs); skinOne(int(nd.w), w.w, X, P, Fs);
  mat3 C = mat3(cross(Fs[1], Fs[2]), cross(Fs[2], Fs[0]), cross(Fs[0], Fs[1]));
  Nw = normalize(C * Nr);
}
layout(location=0) in vec4 aPos; layout(location=1) in vec4 aNrm; layout(location=2) in vec4 aAttr;
layout(location=3) in uvec4 aNodes; layout(location=4) in vec4 aW;
`;

// ---------------------------------------------------------------- surface VS (shared by all mesh passes)
export const MESH_VS = HDR + SKIN + /* glsl */`
uniform int uLight; // 1 = render from light
out vec3 vP; out vec3 vN; out vec3 vX; out vec3 vNr; out vec4 vA;
void main(){
  vec3 X = fr.qmin.xyz + aPos.xyz * fr.qext.xyz;
  vec3 Nr = normalize(aNrm.xyz);
  vec4 w = max(aW * 2.0, vec4(0.0)); w /= max(dot(w, vec4(1.0)), 1e-4);
  vec3 P, N; skin(X, Nr, aNodes, w, P, N);
  vP = P; vN = N; vX = X; vNr = Nr; vA = aAttr;
  gl_Position = (uLight == 1 ? fr.lightVP : fr.viewProj) * vec4(P, 1.0);
}`;

// ---------------------------------------------------------------- shadow (signed light-space thickness)
export const SHADOW_FS = HDR + COMMON + /* glsl */`
uniform int uLayer;
in vec3 vP; in vec3 vN; in vec3 vX; in vec3 vNr; in vec4 vA;
out vec4 o;
void main(){
  float d = -dot(vP, lightKey());
  float s = gl_FrontFacing ? -d : d;
  o = uLayer == 0 ? vec4(s, 0.0, 0.0, vP.y) : vec4(0.0, s, 0.0, vP.y);
}`;

// ---------------------------------------------------------------- back faces of the shell: linear depth
export const BACK_FS = HDR + COMMON + /* glsl */`
in vec3 vP; in vec3 vN; in vec3 vX; in vec3 vNr; in vec4 vA;
out vec4 o;
void main(){ o = vec4(linDepth(vP), 0.0, 0.0, 1.0); }`;

// ---------------------------------------------------------------- backdrop: seamless studio sweep + tinted shadows
export const FULL_VS = `#version 300 es
out vec2 vUv; void main(){ vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2)); vUv = p; gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0); }`;

export const SHADOW_SAMPLE = /* glsl */`
uniform sampler2D uShadow;
vec3 floorShadow(vec3 P, out float ao){
  vec4 lp = fr.lightVP * vec4(P, 1.0); vec2 uv = lp.xy * 0.5 + 0.5;
  vec4 c0 = texture(uShadow, uv);
  float hgt = clamp(P.y - (c0.a > 5.0 ? 0.0 : c0.a), 0.0, 0.4);
  vec2 acc = vec2(0.0); float wsum = 0.0; vec2 aoAcc = vec2(0.0);
  float rad = 0.006 + 0.07 * clamp(c0.a < 5.0 ? c0.a : 0.12, 0.0, 0.3);
  for (int i = 0; i < 16; i++) {
    float a = float(i) * 2.39996 + 0.3; float r = sqrt((float(i) + 0.5) / 16.0);
    vec2 o2 = vec2(cos(a), sin(a)) * r;
    vec4 s = texture(uShadow, uv + o2 * rad / 1.6);
    acc += max(s.rg, 0.0); wsum += 1.0;
    vec4 s2 = texture(uShadow, uv + o2 * 0.10 / 1.6);
    aoAcc += max(s2.rg, 0.0);
  }
  acc /= wsum; aoAcc /= 16.0;
  ao = 1.0 - 0.45 * sat((aoAcc.x * 0.6 + aoAcc.y * 2.0) * 6.0);
  vec3 T = exp(-fr.absorb.rgb * acc.x * 1.25) * exp(-vec3(26.0) * acc.y);
  return T;
}
vec3 beadShadow(vec3 P){
  vec3 s = vec3(1.0);
  for (int i = 0; i < 16; i++) {
    if (float(i) >= fr.misc.x) break;
    vec4 b = fr.beads[i];
    vec3 d = b.xyz - P; float dl = length(d);
    float occ = b.w * b.w / (dl * dl);
    float k = sat(dot(normalize(d), lightKey()) * 0.5 + 0.5);
    s *= 1.0 - 0.55 * occ * k * k * (1.0 - fr.beadCol.a * 0.0);
  }
  return mix(vec3(1.0), s, 0.9) * mix(vec3(1.0), fr.beadCol.rgb, (1.0 - s.r) * 0.35);
}`;

export const BACKDROP_FS = HDR + COMMON + SHADOW_SAMPLE + /* glsl */`
in vec2 vUv; out vec4 o;
void main(){
  vec4 a = fr.invViewProj * vec4(vUv * 2.0 - 1.0, -1.0, 1.0); vec4 b = fr.invViewProj * vec4(vUv * 2.0 - 1.0, 1.0, 1.0);
  vec3 ro = a.xyz / a.w; vec3 rd = normalize(b.xyz / b.w - ro);
  vec3 bg = mix(fr.bgBot.rgb, fr.bgTop.rgb, smoothstep(-0.05, 0.6, rd.y)) ;
  float depth = 1000.0;
  vec3 col = bg;
  if (rd.y < 0.0) {
    float t = -ro.y / rd.y; vec3 P = ro + rd * t;
    float r = length(P.xz - vec2(-0.02, 0.02));
    float pool = exp(-r * r / 0.85);
    float ao; vec3 T = floorShadow(P, ao);
    vec3 bs = beadShadow(P);
    vec3 key = vec3(0.70) * T * bs; vec3 amb = vec3(0.42) * ao;
    // jelly caustic: a little focused light inside the tinted shadow
    vec3 caustic = (1.0 - T) * T * fr.glowCol.rgb * 0.55;
    vec3 floorC = fr.studio.rgb * (amb * 0.8 + key * (0.42 + 0.30 * pool) + caustic) * (0.80 + 0.16 * pool);
    float fade = smoothstep(2.5, 7.0, t);
    col = mix(floorC, bg, fade);
    depth = linDepth(P);
  }
  o = vec4(col, depth);
}`;

// ---------------------------------------------------------------- inner milky layer + eyes
export const INNER_FS = HDR + COMMON + SHADOW_SAMPLE + SHELL_PATTERN_GLSL + INNER_PATTERN_GLSL + /* glsl */`
in vec3 vP; in vec3 vN; in vec3 vX; in vec3 vNr; in vec4 vA;
out vec4 o;
void main(){
  vec3 N = normalize(vN); vec3 V = normalize(fr.camPos.xyz - vP);
  vec4 pat = innerPattern(vX, normalize(vNr));
  // light reaching the milky layer has crossed clear jelly: tint it
  vec4 lp = fr.lightVP * vec4(vP, 1.0); vec4 sh = texture(uShadow, lp.xy * 0.5 + 0.5);
  vec3 T = exp(-fr.absorb.rgb * max(sh.r, 0.0) * 0.45);
  vec3 L = lightKey();
  float wrap = sat((dot(N, L) + 0.7) / 1.7);
  float rim = pow(1.0 - sat(dot(N, V)), 2.0);
  vec3 sss = fr.bellyCol.rgb * (0.38 + 0.75 * wrap * T) + fr.glowCol.rgb * rim * 0.12;
  vec3 col = sss * pat.rgb;
  // eye: glossy black lens
  if (pat.a > 0.0) {
    vec3 R = reflect(-V, N);
    float f = 0.04 + 0.96 * pow(1.0 - sat(dot(N, V)), 5.0);
    vec3 eyeC = vec3(0.012, 0.011, 0.012) + envStudio(R) * (0.06 + f * 0.6);
    col = mix(col, eyeC, pat.a);
  }
  o = vec4(col, linDepth(vP));
}`;

// ---------------------------------------------------------------- trapped bubbles (instanced impostors, skinned)
export const BUBBLE_VS = HDR + /* glsl */`
uniform highp sampler2D uNodes;
ivec2 tcoord(int t){ return ivec2(t & 1023, t >> 10); }
layout(location=0) in vec4 iBub; layout(location=1) in uvec4 iN; layout(location=2) in vec4 iW;
out vec2 vQ; out vec3 vC; out float vR;
vec3 nodeP(uint n){ return texelFetch(uNodes, tcoord(int(n) * 4), 0).xyz; }
void main(){
  vec2 q = vec2(float(gl_VertexID & 1), float((gl_VertexID >> 1) & 1)) * 2.0 - 1.0;
  vec3 C = nodeP(iN.x) * iW.x + nodeP(iN.y) * iW.y + nodeP(iN.z) * iW.z + nodeP(iN.w) * iW.w;
  vec3 right = vec3(fr.view[0][0], fr.view[1][0], fr.view[2][0]); vec3 up = vec3(fr.view[0][1], fr.view[1][1], fr.view[2][1]);
  vec3 P = C + (right * q.x + up * q.y) * iBub.w;
  vQ = q; vC = C; vR = iBub.w;
  gl_Position = fr.viewProj * vec4(P, 1.0);
}`;
export const BUBBLE_FS = HDR + COMMON + /* glsl */`
in vec2 vQ; in vec3 vC; in float vR; out vec4 o;
void main(){
  float r2 = dot(vQ, vQ); if (r2 > 1.0) discard;
  float z = sqrt(1.0 - r2);
  float rim = pow(1.0 - z, 2.2);
  float spec = pow(sat(1.0 - length(vQ - vec2(-0.38, 0.42)) * 2.6), 3.0);
  float a = sat(rim * 0.95 + spec + 0.06);
  vec3 c = vec3(1.0) * (rim * 1.2 + spec * 2.5) + fr.glowCol.rgb * 0.05;
  o = vec4(c * a, a);
}`;

// ---------------------------------------------------------------- jelly bait beads
export const BEAD_VS = HDR + /* glsl */`
out vec2 vQ; flat out int vI;
void main(){
  int i = gl_VertexID / 6; int k = gl_VertexID % 6;
  int kk = k < 3 ? k : k - 2; if (k == 3) kk = 2; if (k == 4) kk = 1; if (k == 5) kk = 3;
  vec2 q = vec2(float(kk & 1), float((kk >> 1) & 1)) * 2.0 - 1.0;
  vec4 b = fr.beads[i];
  vec3 right = vec3(fr.view[0][0], fr.view[1][0], fr.view[2][0]); vec3 up = vec3(fr.view[0][1], fr.view[1][1], fr.view[2][1]);
  vec3 P = b.xyz + (right * q.x + up * q.y) * b.w * 1.05;
  vQ = q * 1.05; vI = i;
  gl_Position = float(i) < fr.misc.x ? fr.viewProj * vec4(P, 1.0) : vec4(2.0, 2.0, 2.0, 1.0);
}`;
export const BEAD_FS = HDR + COMMON + /* glsl */`
in vec2 vQ; flat in int vI; out vec4 o;
void main(){
  vec4 b = fr.beads[vI];
  vec3 right = vec3(fr.view[0][0], fr.view[1][0], fr.view[2][0]); vec3 up = vec3(fr.view[0][1], fr.view[1][1], fr.view[2][1]);
  vec3 fwd = normalize(b.xyz - fr.camPos.xyz);
  float r2 = dot(vQ, vQ); if (r2 > 1.0) discard;
  float z = sqrt(1.0 - r2);
  vec3 N = normalize(right * vQ.x + up * vQ.y - fwd * z);
  vec3 P = b.xyz + N * b.w;
  vec3 V = normalize(fr.camPos.xyz - P);
  float f = 0.03 + 0.97 * pow(1.0 - sat(dot(N, V)), 5.0);
  vec3 R = reflect(-V, N);
  float thick = z;
  vec3 body = fr.beadCol.rgb * fr.beadCol.rgb * (0.25 + 0.9 * exp(-2.2 * thick)) ;
  vec3 L = lightKey();
  vec3 glow = fr.beadCol.rgb * pow(sat(dot(-N, L) * 0.5 + 0.5), 2.0) * 0.6;
  vec3 col = body + glow * (1.0 - z) + envStudio(R) * f * 0.9;
  vec4 cp = fr.viewProj * vec4(P, 1.0);
  gl_FragDepth = (cp.z / cp.w) * 0.5 + 0.5;
  o = vec4(col, linDepth(P));
}`;

// ---------------------------------------------------------------- the clear jelly shell
export const SHELL_FS = HDR + COMMON + SHELL_PATTERN_GLSL + /* glsl */`
uniform sampler2D uScene; uniform sampler2D uBack;
in vec3 vP; in vec3 vN; in vec3 vX; in vec3 vNr; in vec4 vA;
out vec4 o;
vec2 toUv(vec3 P){ vec4 c = fr.viewProj * vec4(P, 1.0); return c.xy / c.w * 0.5 + 0.5; }
void main(){
  vec3 N = normalize(vN); vec3 V = normalize(fr.camPos.xyz - vP);
  if (!gl_FrontFacing) N = -N;
  vec2 uv = gl_FragCoord.xy * fr.res.zw;
  float zf = linDepth(vP);
  vec4 sc = texture(uScene, uv);
  if (sc.a < zf - 0.004) discard;                       // something (a bead) is in front
  float zb = texture(uBack, uv).r; if (zb < zf) zb = zf + 0.004; if (zb > 100.0) zb = zf + 0.004;
  vec4 pat = shellPattern(vX, normalize(vNr), vA);
  float back = pat.x * fr.backCol.a; float slit = pat.y; float tip = pat.z * fr.finTipCol.a; float groove = pat.w;
  // refraction through the jelly (chromatic)
  float ior = fr.absorb.a;
  float thick0 = clamp(min(zb, sc.a) - zf, 0.0, 0.5);
  vec3 col = vec3(0.0); vec3 Tsum = vec3(0.0);
  vec3 sig = fr.absorb.rgb * (1.0 + back * 0.9 + tip * 2.5) + vec3(slit * 30.0 + groove * 6.0);
  for (int c = 0; c < 3; c++) {
    float e = ior + (float(c) - 1.0) * 0.018;
    vec3 rd = refract(-V, N, 1.0 / e);
    float travel = thick0 * 0.85 + 0.01;
    vec2 ruv = toUv(vP + rd * travel);
    ruv = mix(uv, ruv, 0.9);
    vec4 s = texture(uScene, ruv);
    float zb2 = texture(uBack, ruv).r;
    float th = clamp(min(max(zb2, zf), s.a) - zf, 0.0, 0.5);
    th = zb2 > 100.0 ? thick0 : mix(thick0, th, 0.6);
    vec3 T = exp(-sig * th);
    if (c == 0) { col.r = s.r * T.r; Tsum.r = T.r; }
    if (c == 1) { col.g = s.g * T.g; Tsum.g = T.g; }
    if (c == 2) { col.b = s.b * T.b; Tsum.b = T.b; }
  }
  // surface pigment: darker back, dusky fin tips, slits
  vec3 filt = mix(vec3(1.0), fr.backCol.rgb, back) * mix(vec3(1.0), fr.finTipCol.rgb, tip);
  filt *= 1.0 - 0.5 * slit;
  col *= filt;
  // back-lit glow in the thin parts
  float thin = exp(-thick0 / 0.035);
  vec3 L = lightKey(); vec3 Lr = lightRim();
  float through = pow(sat(dot(-N, Lr) * 0.6 + 0.4), 1.5) * 1.1 + pow(sat(dot(-V, L) * 0.5 + 0.5), 2.0) * 0.4;
  vec3 glow = fr.glowCol.rgb * filt * thin * through * (1.0 - Tsum * 0.5) * 0.85;
  // subsurface-ish body colour in thick parts (scattered key light)
  vec3 scatter = fr.glowCol.rgb * filt * (1.0 - Tsum) * 0.10 * (0.5 + 0.5 * sat(dot(N, L)));
  // reflections
  vec3 R = reflect(-V, N);
  float ndv = sat(dot(N, V));
  float F = 0.025 + 0.975 * pow(1.0 - ndv, 5.0);
  vec3 refl = envStudio(R) * (1.0 - slit * 0.7 - groove * 0.4);
  // tight key specular to make the jelly wet
  vec3 H = normalize(L + V);
  float sp = pow(sat(dot(N, H)), 420.0) * 3.0;
  col = col * (1.0 - F) + refl * F + glow + scatter + vec3(sp) * (1.0 - slit);
  o = vec4(col, 1.0);
}`;

// ---------------------------------------------------------------- composite + tonemap
export const COMPOSITE_FS = `#version 300 es
precision highp float;
uniform sampler2D uScene; uniform sampler2D uShell; uniform vec4 uParams; // exposure, time, grain, vignette
in vec2 vUv; out vec4 o;
vec3 neutral(vec3 color){
  const float startCompression = 0.8 - 0.04; const float desaturation = 0.15;
  float x = min(color.r, min(color.g, color.b)); float offset = x < 0.08 ? x - 6.25 * x * x : 0.04;
  color -= offset; float peak = max(color.r, max(color.g, color.b));
  if (peak < startCompression) return color;
  const float d = 1.0 - startCompression; float newPeak = 1.0 - d * d / (peak + d - startCompression);
  color *= newPeak / peak; float g = 1.0 - 1.0 / (desaturation * (peak - newPeak) + 1.0);
  return mix(color, newPeak * vec3(1.0), g);
}
float h12(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
void main(){
  vec4 s = texture(uScene, vUv); vec4 j = texture(uShell, vUv);
  vec3 c = j.rgb + s.rgb * (1.0 - j.a);
  c *= uParams.x;
  vec2 q = vUv - 0.5; c *= 1.0 - uParams.w * dot(q, q) * 1.2;
  c = neutral(c);
  c = pow(max(c, 0.0), vec3(1.0 / 2.2));
  c += (h12(gl_FragCoord.xy + fract(uParams.y) * 100.0) - 0.5) * uParams.z;
  o = vec4(c, 1.0);
}`;

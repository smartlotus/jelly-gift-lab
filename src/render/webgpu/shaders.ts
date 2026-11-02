// WGSL twins of src/render/webgl2/shaders.ts (keep in sync).
import { WGSL_FRAME } from '../frame';

const HDR = WGSL_FRAME + /* wgsl */`
@group(0) @binding(0) var<uniform> fr: Frame;
fn sat(x: f32) -> f32 { return clamp(x, 0.0, 1.0); }
fn rectMask(p: vec2f, h: vec2f, s: f32) -> f32 { let q = 1.0 - smoothstep(h - s, h + s, abs(p)); return q.x * q.y; }
fn envStudio(d: vec3f) -> vec3f {
  let up = d.y;
  var c = mix(vec3f(0.035, 0.035, 0.038), vec3f(0.16, 0.16, 0.158), smoothstep(-0.3, 0.9, up)) + vec3f(0.22) * smoothstep(0.1, -0.25, up);
  if (d.y > 0.02) { let p = d.xz * (2.2 / d.y) - vec2f(0.25, 0.55); c += vec3f(6.0, 5.9, 5.7) * rectMask(p, vec2f(1.1, 0.75), 0.35); }
  if (d.z > 0.05) { let p = vec2f(d.x, d.y) * (2.4 / d.z) - vec2f(-1.3, 0.9); c += vec3f(2.6) * rectMask(p, vec2f(0.22, 0.9), 0.12); }
  if (d.x > 0.05) { let p = vec2f(d.z, d.y) * (2.6 / d.x) - vec2f(1.2, 0.8); c += vec3f(2.0, 2.0, 2.05) * rectMask(p, vec2f(0.25, 0.7), 0.15); }
  if (d.z < -0.05) { let p = vec2f(d.x, d.y) * (2.5 / -d.z) - vec2f(-0.2, 1.4); c += vec3f(3.2, 3.1, 3.0) * rectMask(p, vec2f(1.4, 0.5), 0.4); }
  return c;
}
fn lightKey() -> vec3f { return normalize(fr.lightDir.xyz); }
fn lightRim() -> vec3f { return normalize(vec3f(-0.15, 0.55, -1.0)); }
fn linDepth(P: vec3f) -> f32 { return -(fr.view * vec4f(P, 1.0)).z; }
fn ndcToUv(c: vec4f) -> vec2f { let n = c.xy / c.w; return vec2f(n.x * 0.5 + 0.5, 0.5 - n.y * 0.5); }
`;

const SKIN = /* wgsl */`
@group(1) @binding(0) var<storage, read> nodeData: array<vec4f>;
@group(1) @binding(1) var<storage, read> restN: array<vec4f>;
struct VIn { @location(0) pos: vec4f, @location(1) nrm: vec4f, @location(2) attr: vec4f, @location(3) nodes: vec4u, @location(4) w: vec4f };
struct VOut { @builtin(position) clip: vec4f, @location(0) P: vec3f, @location(1) N: vec3f, @location(2) X: vec3f, @location(3) Nr: vec3f, @location(4) A: vec4f };
fn skinVS(v: VIn, light: bool) -> VOut {
  let X = fr.qmin.xyz + v.pos.xyz * fr.qext.xyz;
  let Nr = normalize(v.nrm.xyz);
  var w = max(v.w * 2.0, vec4f(0.0)); w = w / max(dot(w, vec4f(1.0)), 1e-4);
  var P = vec3f(0.0); var Fs = mat3x3f(vec3f(0.0), vec3f(0.0), vec3f(0.0));
  for (var k = 0; k < 4; k++) {
    let n = v.nodes[k]; let wk = w[k];
    let x = nodeData[4u * n].xyz;
    let F = mat3x3f(nodeData[4u * n + 1u].xyz, nodeData[4u * n + 2u].xyz, nodeData[4u * n + 3u].xyz);
    let Xk = restN[n].xyz;
    P += wk * (x + F * (X - Xk)); Fs = Fs + F * wk;
  }
  let C = mat3x3f(cross(Fs[1], Fs[2]), cross(Fs[2], Fs[0]), cross(Fs[0], Fs[1]));
  var o: VOut;
  o.P = P; o.N = normalize(C * Nr); o.X = X; o.Nr = Nr; o.A = v.attr;
  if (light) { o.clip = fr.lightVP * vec4f(P, 1.0); } else { o.clip = fr.viewProj * vec4f(P, 1.0); }
  return o;
}
@vertex fn vsMain(v: VIn) -> VOut { return skinVS(v, false); }
@vertex fn vsLight(v: VIn) -> VOut { return skinVS(v, true); }
`;

const SHADOW_SAMPLE = /* wgsl */`
@group(2) @binding(0) var shadowTex: texture_2d<f32>;
@group(2) @binding(1) var linSamp: sampler;
fn shadowUv(P: vec3f) -> vec2f { return ndcToUv(fr.lightVP * vec4f(P, 1.0)); }
struct FS { T: vec3f, ao: f32 };
fn floorShadow(P: vec3f) -> FS {
  let uv = shadowUv(P);
  let c0 = textureSampleLevel(shadowTex, linSamp, uv, 0.0);
  var acc = vec2f(0.0); var aoAcc = vec2f(0.0);
  let rad = 0.006 + 0.07 * clamp(select(0.12, c0.a, c0.a < 5.0), 0.0, 0.3);
  for (var i = 0; i < 16; i++) {
    let a = f32(i) * 2.39996 + 0.3; let r = sqrt((f32(i) + 0.5) / 16.0);
    let o2 = vec2f(cos(a), sin(a)) * r;
    let s = textureSampleLevel(shadowTex, linSamp, uv + o2 * rad / 1.6, 0.0);
    acc += max(s.rg, vec2f(0.0));
    let s2 = textureSampleLevel(shadowTex, linSamp, uv + o2 * 0.10 / 1.6, 0.0);
    aoAcc += max(s2.rg, vec2f(0.0));
  }
  acc /= 16.0; aoAcc /= 16.0;
  var o: FS;
  o.ao = 1.0 - 0.45 * sat((aoAcc.x * 0.6 + aoAcc.y * 2.0) * 6.0);
  o.T = exp(-fr.absorb.rgb * acc.x * 1.25) * exp(-vec3f(26.0) * acc.y);
  return o;
}
fn beadShadow(P: vec3f) -> vec3f {
  var s = vec3f(1.0);
  for (var i = 0; i < 16; i++) {
    if (f32(i) >= fr.misc.x) { break; }
    let b = fr.beads[i];
    let d = b.xyz - P; let dl = length(d);
    let occ = b.w * b.w / (dl * dl);
    let k = sat(dot(normalize(d), lightKey()) * 0.5 + 0.5);
    s *= 1.0 - 0.55 * occ * k * k;
  }
  return mix(vec3f(1.0), s, 0.9) * mix(vec3f(1.0), fr.beadCol.rgb, (1.0 - s.r) * 0.35);
}
`;

export const MESH_WGSL = HDR + SKIN;

export const SHADOW_WGSL = HDR + SKIN + /* wgsl */`
@fragment fn fsShell(i: VOut, @builtin(front_facing) ff: bool) -> @location(0) vec4f {
  let d = -dot(i.P, lightKey()); let s = select(d, -d, ff);
  return vec4f(s, 0.0, 0.0, i.P.y);
}
@fragment fn fsInner(i: VOut, @builtin(front_facing) ff: bool) -> @location(0) vec4f {
  let d = -dot(i.P, lightKey()); let s = select(d, -d, ff);
  return vec4f(0.0, s, 0.0, i.P.y);
}`;

export const BACK_WGSL = HDR + SKIN + /* wgsl */`
@fragment fn fsMain(i: VOut) -> @location(0) vec4f { return vec4f(linDepth(i.P), 0.0, 0.0, 1.0); }`;

export const FULL_VS = /* wgsl */`
struct FOut { @builtin(position) pos: vec4f, @location(0) ndc: vec2f };
@vertex fn vsFull(@builtin(vertex_index) vi: u32) -> FOut {
  let p = vec2f(f32((vi << 1u) & 2u), f32(vi & 2u));
  var o: FOut; o.ndc = p * 2.0 - 1.0; o.pos = vec4f(o.ndc, 0.0, 1.0); return o;
}`;

export const BACKDROP_WGSL = HDR + SHADOW_SAMPLE + FULL_VS + /* wgsl */`
@fragment fn fsMain(i: FOut) -> @location(0) vec4f {
  let a = fr.invViewProj * vec4f(i.ndc, 0.0, 1.0); let b = fr.invViewProj * vec4f(i.ndc, 1.0, 1.0);
  let ro = a.xyz / a.w; let rd = normalize(b.xyz / b.w - ro);
  let bg = mix(fr.bgBot.rgb, fr.bgTop.rgb, smoothstep(-0.05, 0.6, rd.y));
  var depth = 1000.0; var col = bg;
  if (rd.y < 0.0) {
    let t = -ro.y / rd.y; let P = ro + rd * t;
    let r = length(P.xz - vec2f(-0.02, 0.02));
    let pool = exp(-r * r / 0.85);
    let sh = floorShadow(P);
    let bs = beadShadow(P);
    let key = vec3f(0.70) * sh.T * bs; let amb = vec3f(0.42) * sh.ao;
    let caustic = (1.0 - sh.T) * sh.T * fr.glowCol.rgb * 0.55;
    let floorC = fr.studio.rgb * (amb * 0.8 + key * (0.42 + 0.30 * pool) + caustic) * (0.80 + 0.16 * pool);
    let fade = smoothstep(2.5, 7.0, t);
    col = mix(floorC, bg, fade);
    depth = linDepth(P);
  }
  return vec4f(col, depth);
}`;

export const innerWGSL = (shellPat: string, innerPat: string) => HDR + SKIN + SHADOW_SAMPLE + shellPat + innerPat + /* wgsl */`
@fragment fn fsMain(i: VOut) -> @location(0) vec4f {
  let N = normalize(i.N); let V = normalize(fr.camPos.xyz - i.P);
  let pat = innerPattern(i.X, normalize(i.Nr));
  let sh = textureSampleLevel(shadowTex, linSamp, shadowUv(i.P), 0.0);
  let T = exp(-fr.absorb.rgb * max(sh.r, 0.0) * 0.45);
  let L = lightKey();
  let wrap = sat((dot(N, L) + 0.7) / 1.7);
  let rim = pow(1.0 - sat(dot(N, V)), 2.0);
  let sss = fr.bellyCol.rgb * (0.38 + 0.75 * wrap * T) + fr.glowCol.rgb * rim * 0.12;
  var col = sss * pat.rgb;
  if (pat.a > 0.0) {
    let R = reflect(-V, N);
    let f = 0.04 + 0.96 * pow(1.0 - sat(dot(N, V)), 5.0);
    let eyeC = vec3f(0.012, 0.011, 0.012) + envStudio(R) * (0.06 + f * 0.6);
    col = mix(col, eyeC, pat.a);
  }
  return vec4f(col, linDepth(i.P));
}`;

export const BUBBLE_WGSL = HDR + /* wgsl */`
@group(1) @binding(0) var<storage, read> nodeData: array<vec4f>;
struct BIn { @location(0) bub: vec4f, @location(1) n: vec4u, @location(2) w: vec4f };
struct BOut { @builtin(position) clip: vec4f, @location(0) q: vec2f };
@vertex fn vsMain(b: BIn, @builtin(vertex_index) vi: u32) -> BOut {
  let q = vec2f(f32(vi & 1u), f32((vi >> 1u) & 1u)) * 2.0 - 1.0;
  let C = nodeData[4u * b.n.x].xyz * b.w.x + nodeData[4u * b.n.y].xyz * b.w.y + nodeData[4u * b.n.z].xyz * b.w.z + nodeData[4u * b.n.w].xyz * b.w.w;
  let right = vec3f(fr.view[0][0], fr.view[1][0], fr.view[2][0]); let up = vec3f(fr.view[0][1], fr.view[1][1], fr.view[2][1]);
  var o: BOut; o.q = q; o.clip = fr.viewProj * vec4f(C + (right * q.x + up * q.y) * b.bub.w, 1.0); return o;
}
@fragment fn fsMain(i: BOut) -> @location(0) vec4f {
  let r2 = dot(i.q, i.q); if (r2 > 1.0) { discard; }
  let z = sqrt(1.0 - r2);
  let rim = pow(1.0 - z, 2.2);
  let spec = pow(sat(1.0 - length(i.q - vec2f(-0.38, 0.42)) * 2.6), 3.0);
  let a = sat(rim * 0.95 + spec + 0.06);
  let c = vec3f(1.0) * (rim * 1.2 + spec * 2.5) + fr.glowCol.rgb * 0.05;
  return vec4f(c * a, a);
}`;

export const BEAD_WGSL = HDR + /* wgsl */`
struct BOut { @builtin(position) clip: vec4f, @location(0) q: vec2f, @location(1) @interpolate(flat) i: u32 };
@vertex fn vsMain(@builtin(vertex_index) vi: u32) -> BOut {
  let i = vi / 6u; let k = vi % 6u;
  var kk = k; if (k == 3u) { kk = 2u; } if (k == 4u) { kk = 1u; } if (k == 5u) { kk = 3u; }
  let q = vec2f(f32(kk & 1u), f32((kk >> 1u) & 1u)) * 2.0 - 1.0;
  let b = fr.beads[i];
  let right = vec3f(fr.view[0][0], fr.view[1][0], fr.view[2][0]); let up = vec3f(fr.view[0][1], fr.view[1][1], fr.view[2][1]);
  var o: BOut; o.q = q * 1.05; o.i = i;
  o.clip = select(vec4f(2.0, 2.0, 2.0, 1.0), fr.viewProj * vec4f(b.xyz + (right * q.x + up * q.y) * b.w * 1.05, 1.0), f32(i) < fr.misc.x);
  return o;
}
struct FOut2 { @location(0) c: vec4f, @builtin(frag_depth) d: f32 };
@fragment fn fsMain(v: BOut) -> FOut2 {
  let b = fr.beads[v.i];
  let right = vec3f(fr.view[0][0], fr.view[1][0], fr.view[2][0]); let up = vec3f(fr.view[0][1], fr.view[1][1], fr.view[2][1]);
  let fwd = normalize(b.xyz - fr.camPos.xyz);
  let r2 = dot(v.q, v.q); if (r2 > 1.0) { discard; }
  let z = sqrt(1.0 - r2);
  let N = normalize(right * v.q.x + up * v.q.y - fwd * z);
  let P = b.xyz + N * b.w;
  let V = normalize(fr.camPos.xyz - P);
  let f = 0.03 + 0.97 * pow(1.0 - sat(dot(N, V)), 5.0);
  let R = reflect(-V, N);
  let body = fr.beadCol.rgb * fr.beadCol.rgb * (0.25 + 0.9 * exp(-2.2 * z));
  let L = lightKey();
  let glow = fr.beadCol.rgb * pow(sat(dot(-N, L) * 0.5 + 0.5), 2.0) * 0.6;
  let col = body + glow * (1.0 - z) + envStudio(R) * f * 0.9;
  let cp = fr.viewProj * vec4f(P, 1.0);
  var o: FOut2; o.c = vec4f(col, linDepth(P)); o.d = cp.z / cp.w; return o;
}`;

export const shellWGSL = (shellPat: string) => HDR + SKIN + shellPat + /* wgsl */`
@group(2) @binding(0) var sceneTex: texture_2d<f32>;
@group(2) @binding(1) var backTex: texture_2d<f32>;
@group(2) @binding(2) var linSamp: sampler;
@group(2) @binding(3) var nearSamp: sampler;
fn toUv(P: vec3f) -> vec2f { return ndcToUv(fr.viewProj * vec4f(P, 1.0)); }
@fragment fn fsMain(i: VOut, @builtin(front_facing) ff: bool) -> @location(0) vec4f {
  var N = normalize(i.N); let V = normalize(fr.camPos.xyz - i.P);
  if (!ff) { N = -N; }
  let uv = i.clip.xy * fr.res.zw;
  let zf = linDepth(i.P);
  let sc = textureSampleLevel(sceneTex, linSamp, uv, 0.0);
  if (sc.a < zf - 0.004) { discard; }
  var zb = textureSampleLevel(backTex, nearSamp, uv, 0.0).r;
  if (zb < zf) { zb = zf + 0.004; } if (zb > 100.0) { zb = zf + 0.004; }
  let pat = shellPattern(i.X, normalize(i.Nr), i.A);
  let back = pat.x * fr.backCol.a; let slit = pat.y; let tip = pat.z * fr.finTipCol.a; let groove = pat.w;
  let ior = fr.absorb.a;
  let thick0 = clamp(min(zb, sc.a) - zf, 0.0, 0.5);
  var col = vec3f(0.0); var Tsum = vec3f(0.0);
  let sig = fr.absorb.rgb * (1.0 + back * 0.9 + tip * 2.5) + vec3f(slit * fr.extra.x + groove * 6.0);
  for (var c = 0; c < 3; c++) {
    let e = ior + (f32(c) - 1.0) * 0.018;
    let rd = refract(-V, N, 1.0 / e);
    let travel = thick0 * 0.85 + 0.01;
    let ruv = mix(uv, toUv(i.P + rd * travel), 0.9);
    let s = textureSampleLevel(sceneTex, linSamp, ruv, 0.0);
    let zb2 = textureSampleLevel(backTex, nearSamp, ruv, 0.0).r;
    var th = clamp(min(max(zb2, zf), s.a) - zf, 0.0, 0.5);
    th = select(mix(thick0, th, 0.6), thick0, zb2 > 100.0);
    let T = exp(-sig * th);
    col[c] = s[c] * T[c]; Tsum[c] = T[c];
  }
  var filt = mix(vec3f(1.0), fr.backCol.rgb, back) * mix(vec3f(1.0), fr.finTipCol.rgb, tip);
  filt *= 1.0 - fr.extra.y * slit;
  col *= filt;
  let thin = exp(-thick0 / 0.035);
  let L = lightKey(); let Lr = lightRim();
  let through = pow(sat(dot(-N, Lr) * 0.6 + 0.4), 1.5) * 1.1 + pow(sat(dot(-V, L) * 0.5 + 0.5), 2.0) * 0.4;
  let behind = mix(0.12, 1.0, smoothstep(0.02, 0.3, dot(sc.rgb, vec3f(0.3, 0.6, 0.1))));
  let glow = fr.glowCol.rgb * filt * thin * through * (1.0 - Tsum * 0.5) * 0.85 * behind;
  let scatter = fr.glowCol.rgb * filt * (1.0 - Tsum) * 0.10 * (0.5 + 0.5 * sat(dot(N, L)));
  let R = reflect(-V, N);
  let ndv = sat(dot(N, V));
  let F = 0.025 + 0.975 * pow(1.0 - ndv, 5.0);
  let refl = envStudio(R) * (1.0 - slit * 0.7 - groove * 0.4);
  let H = normalize(L + V);
  let sp = pow(sat(dot(N, H)), 420.0) * 3.0;
  col = col * (1.0 - F) + refl * F + glow + scatter + vec3f(sp) * (1.0 - slit);
  return vec4f(col, 1.0);
}`;

export const COMPOSITE_WGSL = FULL_VS + /* wgsl */`
@group(0) @binding(0) var sceneTex: texture_2d<f32>;
@group(0) @binding(1) var shellTex: texture_2d<f32>;
@group(0) @binding(2) var<uniform> params: vec4f;
fn neutral(c0: vec3f) -> vec3f {
  var color = c0;
  let startCompression = 0.8 - 0.04; let desaturation = 0.15;
  let x = min(color.r, min(color.g, color.b)); let offset = select(0.04, x - 6.25 * x * x, x < 0.08);
  color -= offset; let peak = max(color.r, max(color.g, color.b));
  if (peak < startCompression) { return color; }
  let d = 1.0 - startCompression; let newPeak = 1.0 - d * d / (peak + d - startCompression);
  color *= newPeak / peak; let g = 1.0 - 1.0 / (desaturation * (peak - newPeak) + 1.0);
  return mix(color, newPeak * vec3f(1.0), g);
}
fn h12(p: vec2f) -> f32 { var p3 = fract(vec3f(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
@fragment fn fsMain(i: FOut) -> @location(0) vec4f {
  let px = vec2i(i.pos.xy);
  let s = textureLoad(sceneTex, px, 0); let j = textureLoad(shellTex, px, 0);
  var c = j.rgb + s.rgb * (1.0 - j.a);
  c *= params.x;
  let q = i.pos.xy / vec2f(textureDimensions(sceneTex)) - 0.5; c *= 1.0 - params.w * dot(q, q) * 1.2;
  c = neutral(c);
  c = pow(max(c, vec3f(0.0)), vec3f(1.0 / 2.2));
  c += (h12(i.pos.xy + fract(params.y) * 100.0) - 0.5) * params.z;
  return vec4f(c, 1.0);
}`;

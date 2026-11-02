import{a as e,i as t,n,r,t as i}from"./index-z63_vfqk.js";var a=`
struct Sim {
  h: f32, gravity: f32, damp: f32, muBody: f32,
  muFin: f32, lambdaRatio: f32, fs: f32, fk: f32,
  grabK: f32, nodeR: f32, beadCount: f32, grabCount: f32,
  act: vec4f, tgt: vec4f, axis: vec4f,
  counts: vec4u,
  spin: vec4f, spinC: vec4f,
  beads: array<vec4f, 16>,
};
struct Range { offset: u32, count: u32, pad0: u32, pad1: u32 };

@group(0) @binding(0) var<uniform> sim: Sim;
@group(0) @binding(1) var<storage, read_write> X: array<vec4f>;      // xyz, invMass
@group(0) @binding(2) var<storage, read_write> Pp: array<vec4f>;     // previous xyz, friction scale
@group(0) @binding(3) var<storage, read_write> Vv: array<vec4f>;     // velocity xyz, gravity scale
@group(0) @binding(4) var<storage, read> tets: array<vec4u>;
@group(0) @binding(5) var<storage, read> tetB: array<vec4f>;         // 3 rows per tet: B row + (restVol, mu, -)
@group(0) @binding(6) var<storage, read> tetM: array<vec4f>;         // muscle weights (4 channels)
@group(0) @binding(7) var<storage, read_write> tetQ: array<vec4f>;
@group(1) @binding(0) var<uniform> range: Range;

fn quatToMat(q: vec4f) -> mat3x3f {
  let x = q.x; let y = q.y; let z = q.z; let w = q.w;
  return mat3x3f(
    vec3f(1.0 - 2.0 * (y * y + z * z), 2.0 * (x * y + z * w), 2.0 * (x * z - y * w)),
    vec3f(2.0 * (x * y - z * w), 1.0 - 2.0 * (x * x + z * z), 2.0 * (y * z + x * w)),
    vec3f(2.0 * (x * z + y * w), 2.0 * (y * z - x * w), 1.0 - 2.0 * (x * x + y * y)));
}

@compute @workgroup_size(64)
fn predict(@builtin(global_invocation_id) gid: vec3u) {
  let i = gid.x; if (i >= sim.counts.x) { return; }
  let xi = X[i]; if (xi.w == 0.0) { return; }
  var v = Vv[i];
  v.y -= sim.gravity * v.w * sim.h;
  v = vec4f(v.xyz + cross(sim.spin.xyz, xi.xyz - sim.spinC.xyz) * sim.h, v.w);
  let vel = v.xyz * sim.damp;
  Vv[i] = vec4f(vel, v.w);
  Pp[i] = vec4f(xi.xyz, Pp[i].w);
  X[i] = vec4f(xi.xyz + vel * sim.h, xi.w);
}

@compute @workgroup_size(64)
fn solveTets(@builtin(global_invocation_id) gid: vec3u) {
  if (gid.x >= range.count) { return; }
  let t = range.offset + gid.x;
  let id = tets[t];
  let r0 = tetB[3u * t]; let r1 = tetB[3u * t + 1u]; let r2 = tetB[3u * t + 2u];
  let vol = r0.w; let mu = r1.w;
  let m = tetM[t];
  let s = max(dot(m, sim.act), -0.6);
  let sx = 1.0 / (1.0 + s); let syz = sqrt(1.0 + s);
  // effective inverse rest matrix with isochoric active stretch (columns scaled)
  let B = mat3x3f(vec3f(r0.x * sx, r1.x * sx, r2.x * sx), vec3f(r0.y * syz, r1.y * syz, r2.y * syz), vec3f(r0.z * syz, r1.z * syz, r2.z * syz)); // columns of B
  var x0 = X[id.x]; var x1 = X[id.y]; var x2 = X[id.z]; var x3 = X[id.w];
  let w0 = x0.w; let w1 = x1.w; let w2 = x2.w; let w3 = x3.w;
  let ih2 = 1.0 / (sim.h * sim.h);
  for (var ps = 0; ps < 2; ps++) {
    let Ds = mat3x3f(x1.xyz - x0.xyz, x2.xyz - x0.xyz, x3.xyz - x0.xyz);
    let F = Ds * B;
    var P: mat3x3f; var C: f32; var alpha: f32;
    if (ps == 0) {
      var q = tetQ[t];
      for (var it = 0; it < 3; it++) {
        let R = quatToMat(q);
        let om = cross(R[0], F[0]) + cross(R[1], F[1]) + cross(R[2], F[2]);
        let den = abs(dot(R[0], F[0]) + dot(R[1], F[1]) + dot(R[2], F[2])) + 1e-9;
        let wv = om / den; let ang = length(wv);
        if (ang < 1e-7) { break; }
        let ha = min(ang, 1.0) * 0.5;
        let a = wv * (sin(ha) / ang); let c = cos(ha);
        let dq = vec4f(a, c);
        // q = dq * q
        q = vec4f(dq.w * q.xyz + q.w * dq.xyz + cross(dq.xyz, q.xyz), dq.w * q.w - dot(dq.xyz, q.xyz));
        q = normalize(q);
      }
      tetQ[t] = q;
      let R = quatToMat(q);
      P = F - R;
      C = sqrt(dot(P[0], P[0]) + dot(P[1], P[1]) + dot(P[2], P[2]));
      if (C < 1e-9) { continue; }
      P = P * (1.0 / C);
      alpha = 1.0 / (mu * vol);
    } else {
      P = mat3x3f(cross(F[1], F[2]), cross(F[2], F[0]), cross(F[0], F[1]));
      C = dot(F[0], P[0]) - 1.0;
      alpha = 1.0 / (mu * sim.lambdaRatio * vol);
    }
    // g_j = P * (row j of B)  -> with B stored as columns: row j = (B[0][j], B[1][j], B[2][j])
    let g1 = P * vec3f(B[0].x, B[1].x, B[2].x);
    let g2 = P * vec3f(B[0].y, B[1].y, B[2].y);
    let g3 = P * vec3f(B[0].z, B[1].z, B[2].z);
    let g0 = -(g1 + g2 + g3);
    let den = w0 * dot(g0, g0) + w1 * dot(g1, g1) + w2 * dot(g2, g2) + w3 * dot(g3, g3) + alpha * ih2;
    if (den < 1e-12) { continue; }
    let dl = -C / den;
    x0 = vec4f(x0.xyz + w0 * dl * g0, w0); x1 = vec4f(x1.xyz + w1 * dl * g1, w1);
    x2 = vec4f(x2.xyz + w2 * dl * g2, w2); x3 = vec4f(x3.xyz + w3 * dl * g3, w3);
  }
  X[id.x] = x0; X[id.y] = x1; X[id.z] = x2; X[id.w] = x3;
}

@group(0) @binding(8) var<storage, read> grab: array<vec4f>; // [0..63]: offset.xyz, weight ; [64..127]: x = node index
@compute @workgroup_size(64)
fn solveGrab(@builtin(global_invocation_id) gid: vec3u) {
  let j = gid.x; if (f32(j) >= sim.grabCount) { return; }
  let g = grab[j]; let i = u32(grab[64u + j].x);
  let o = g.xyz; let ax = sim.axis.xyz; let tw = sim.tgt.w;
  let c = cos(tw); let s = sin(tw);
  let r = o * c + cross(ax, o) * s + ax * dot(ax, o) * (1.0 - c);
  let k = min(1.0, sim.grabK * g.w);
  let xi = X[i];
  X[i] = vec4f(xi.xyz + (sim.tgt.xyz + r - xi.xyz) * k, xi.w);
}

@compute @workgroup_size(64)
fn contacts(@builtin(global_invocation_id) gid: vec3u) {
  let i = gid.x; if (i >= sim.counts.x) { return; }
  var x = X[i]; if (x.w == 0.0) { return; }
  let pp = Pp[i];
  var p = x.xyz;
  for (var b = 0; b < 16; b++) {
    if (f32(b) >= sim.beadCount) { break; }
    let bd = sim.beads[b];
    let d = p - bd.xyz; let rr = bd.w + sim.nodeR; let d2 = dot(d, d);
    if (d2 < rr * rr && d2 > 1e-12) { let dl = sqrt(d2); p += d * ((rr - dl) / dl * 0.5); }
  }
  if (p.y < 0.0) {
    let pen = -p.y; p.y = 0.0;
    let fsc = pp.w;
    let t = vec2f(p.x - pp.x, p.z - pp.z); let tl = length(t);
    if (tl < sim.fs * fsc * pen) { p.x = pp.x; p.z = pp.z; }
    else if (tl > 0.0) { let f = min(sim.fk * fsc * pen / tl, 1.0); p.x -= t.x * f; p.z -= t.y * f; }
  }
  X[i] = vec4f(p, x.w);
  let v = Vv[i];
  Vv[i] = vec4f((p - pp.xyz) / sim.h, v.w);
}
`,o=`
@group(0) @binding(0) var<uniform> counts: vec4u;
@group(0) @binding(1) var<storage, read> X: array<vec4f>;
@group(0) @binding(2) var<storage, read> tets: array<vec4u>;
@group(0) @binding(3) var<storage, read> tetB: array<vec4f>;
@group(0) @binding(4) var<storage, read> adjOff: array<u32>;
@group(0) @binding(5) var<storage, read> adjTet: array<u32>;
@group(0) @binding(6) var<storage, read_write> nodeData: array<vec4f>;
@compute @workgroup_size(64)
fn nodeF(@builtin(global_invocation_id) gid: vec3u) {
  let i = gid.x; if (i >= counts.x) { return; }
  var Fs = mat3x3f(vec3f(0.0), vec3f(0.0), vec3f(0.0)); var ws = 0.0;
  for (var k = adjOff[i]; k < adjOff[i + 1u]; k++) {
    let t = adjTet[k]; let id = tets[t];
    let r0 = tetB[3u * t]; let r1 = tetB[3u * t + 1u]; let r2 = tetB[3u * t + 2u];
    let B = mat3x3f(vec3f(r0.x, r1.x, r2.x), vec3f(r0.y, r1.y, r2.y), vec3f(r0.z, r1.z, r2.z));
    let x0 = X[id.x].xyz;
    let Ds = mat3x3f(X[id.y].xyz - x0, X[id.z].xyz - x0, X[id.w].xyz - x0);
    let F = Ds * B; let v = r0.w;
    Fs = Fs + F * v; ws += v;
  }
  Fs = Fs * (1.0 / max(ws, 1e-12));
  nodeData[4u * i] = vec4f(X[i].xyz, 1.0);
  nodeData[4u * i + 1u] = vec4f(Fs[0], 0.0);
  nodeData[4u * i + 2u] = vec4f(Fs[1], 0.0);
  nodeData[4u * i + 3u] = vec4f(Fs[2], 0.0);
}
`,s=r+`
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
`,c=`
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
`,l=`
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
`;s+c;var u=s+c+`
@fragment fn fsShell(i: VOut, @builtin(front_facing) ff: bool) -> @location(0) vec4f {
  let d = -dot(i.P, lightKey()); let s = select(d, -d, ff);
  return vec4f(s, 0.0, 0.0, i.P.y);
}
@fragment fn fsInner(i: VOut, @builtin(front_facing) ff: bool) -> @location(0) vec4f {
  let d = -dot(i.P, lightKey()); let s = select(d, -d, ff);
  return vec4f(0.0, s, 0.0, i.P.y);
}`,d=s+c+`
@fragment fn fsMain(i: VOut) -> @location(0) vec4f { return vec4f(linDepth(i.P), 0.0, 0.0, 1.0); }`,f=`
struct FOut { @builtin(position) pos: vec4f, @location(0) ndc: vec2f };
@vertex fn vsFull(@builtin(vertex_index) vi: u32) -> FOut {
  let p = vec2f(f32((vi << 1u) & 2u), f32(vi & 2u));
  var o: FOut; o.ndc = p * 2.0 - 1.0; o.pos = vec4f(o.ndc, 0.0, 1.0); return o;
}`,p=s+l+f+`
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
}`,m=s+c+l+e+t+`
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
}`,ee=s+`
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
}`,te=s+`
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
}`,ne=s+c+e+`
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
  let sig = fr.absorb.rgb * (1.0 + back * 0.9 + tip * 2.5) + vec3f(slit * 13.0 + groove * 6.0);
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
  filt *= 1.0 - 0.32 * slit;
  col *= filt;
  let thin = exp(-thick0 / 0.035);
  let L = lightKey(); let Lr = lightRim();
  let through = pow(sat(dot(-N, Lr) * 0.6 + 0.4), 1.5) * 1.1 + pow(sat(dot(-V, L) * 0.5 + 0.5), 2.0) * 0.4;
  let glow = fr.glowCol.rgb * filt * thin * through * (1.0 - Tsum * 0.5) * 0.85;
  let scatter = fr.glowCol.rgb * filt * (1.0 - Tsum) * 0.10 * (0.5 + 0.5 * sat(dot(N, L)));
  let R = reflect(-V, N);
  let ndv = sat(dot(N, V));
  let F = 0.025 + 0.975 * pow(1.0 - ndv, 5.0);
  let refl = envStudio(R) * (1.0 - slit * 0.7 - groove * 0.4);
  let H = normalize(L + V);
  let sp = pow(sat(dot(N, H)), 420.0) * 3.0;
  col = col * (1.0 - F) + refl * F + glow + scatter + vec3f(sp) * (1.0 - slit);
  return vec4f(col, 1.0);
}`,re=f+`
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
}`,h=GPUBufferUsage,g=GPUTextureUsage,_=GPUShaderStage,v=400,y=`rgba16float`,b=class{capture(){return new Promise(e=>{this.captureReq=e})}constructor(e,t,r,a=4){i(this,`canvas`,void 0),i(this,`asset`,void 0),i(this,`dev`,void 0),i(this,`samples`,void 0),i(this,`kind`,`webgpu`),i(this,`ready`,void 0),i(this,`substeps`,n.substeps),i(this,`ctx`,void 0),i(this,`fmt`,void 0),i(this,`N`,void 0),i(this,`T`,void 0),i(this,`colours`,[]),i(this,`b`,{}),i(this,`simBG`,void 0),i(this,`rangeBG`,void 0),i(this,`nodeFBG`,void 0),i(this,`cp`,{}),i(this,`rp`,{}),i(this,`bgl`,{}),i(this,`frameBG`,void 0),i(this,`dummyBG`,void 0),i(this,`meshBG`,void 0),i(this,`shadowSBG`,void 0),i(this,`shellBG`,void 0),i(this,`compBG`,void 0),i(this,`shadowTex`,void 0),i(this,`tg`,{}),i(this,`linS`,void 0),i(this,`nearS`,void 0),i(this,`W`,0),i(this,`H`,0),i(this,`simU`,new ArrayBuffer(v)),i(this,`simF`,new Float32Array(this.simU)),i(this,`simI`,new Uint32Array(this.simU)),i(this,`grabData`,new Float32Array(512)),i(this,`latest`,void 0),i(this,`staging`,[]),i(this,`stagingBusy`,[!1,!1]),i(this,`stagingNext`,0),i(this,`cost`,0),i(this,`inflight`,0),i(this,`nOuter`,void 0),i(this,`nInner`,void 0),i(this,`nBub`,void 0),i(this,`lost`,!1),i(this,`skip`,!1),i(this,`pendingEnc`,null),i(this,`pendingRead`,-1),i(this,`presented`,0),i(this,`simSteps`,0),i(this,`captureReq`,null),this.canvas=e,this.asset=t,this.dev=r,this.samples=a;let o=t;this.N=o.nodes.length/3,this.T=o.tets.length/4;let s=e.getContext(`webgpu`);if(!s)throw Error(`no webgpu canvas context`);this.ctx=s,this.fmt=navigator.gpu.getPreferredCanvasFormat(),s.configure({device:r,format:this.fmt,alphaMode:`opaque`,usage:g.RENDER_ATTACHMENT|g.COPY_SRC}),r.lost.then(e=>{this.lost=!0,e.reason!==`destroyed`&&console.error(`WebGPU device lost:`,e.message)}),r.addEventListener(`uncapturederror`,e=>console.error(`WebGPU error:`,e.error?.message??e)),this.latest=new Float32Array(this.N*4);for(let e=0;e<this.N;e++)this.latest.set([o.nodes[3*e],o.nodes[3*e+1],o.nodes[3*e+2],o.invMass[e]],4*e);this.nOuter=o.s.o_idx.length,this.nInner=o.s.i_idx.length,this.nBub=o.s.bub.length/4;let c=o.colourOffsets;for(let e=0;e+1<c.length;e++)c[e+1]>c[e]&&this.colours.push({off:c[e],count:c[e+1]-c[e]});this.ready=this.init()}buf(e,t,n){let r=typeof t==`number`?t:t.byteLength,i=this.dev.createBuffer({size:Math.max(16,Math.ceil(r/4)*4),usage:n|h.COPY_DST,mappedAtCreation:typeof t!=`number`});return typeof t!=`number`&&(new Uint8Array(i.getMappedRange()).set(new Uint8Array(t.buffer,t.byteOffset,t.byteLength)),i.unmap()),this.b[e]=i,i}async init(){let e=this.dev,t=this.asset,r=this.N,i=this.T;e.pushErrorScope(`validation`);let s=n,c=new Float32Array(i*12);for(let e=0;e<i;e++){for(let n=0;n<3;n++)for(let r=0;r<3;r++)c[12*e+4*n+r]=t.B[9*e+3*n+r];c[12*e+3]=t.restVol[e],c[12*e+7]=(s.muBody+(s.muFin-s.muBody)*t.finW[e])*t.stiff[e]}let l=new Float32Array(i*4);for(let e=0;e<i;e++)for(let n=0;n<Math.min(4,t.channels);n++)l[4*e+n]=t.muscle[e*t.channels+n];let f=h.STORAGE;this.buf(`X`,r*16,f|h.COPY_SRC),this.buf(`P`,r*16,f),this.buf(`V`,r*16,f),this.buf(`Q`,i*16,f),this.buf(`tets`,t.tets,f),this.buf(`tetB`,c,f),this.buf(`tetM`,l,f),this.buf(`adjOff`,t.adjOffsets,f),this.buf(`adjTet`,t.adjTets,f),this.buf(`nodeData`,r*64,f),this.buf(`sim`,v,h.UNIFORM),this.buf(`grab`,2048,f);let b=new Uint32Array([r,i,0,0]);this.buf(`counts`,b,h.UNIFORM);let x=new Uint32Array(Math.max(1,this.colours.length)*64);this.colours.forEach((e,t)=>{x[64*t]=e.off,x[64*t+1]=e.count}),this.buf(`ranges`,x,h.UNIFORM),this.writeInitialState();for(let t=0;t<2;t++)this.staging.push(e.createBuffer({size:r*16,usage:h.MAP_READ|h.COPY_DST}));let S=(e,t,n=_.COMPUTE)=>({binding:e,visibility:n,buffer:{type:t}}),C=e.createBindGroupLayout({entries:[S(0,`uniform`),S(1,`storage`),S(2,`storage`),S(3,`storage`),S(4,`read-only-storage`),S(5,`read-only-storage`),S(6,`read-only-storage`),S(7,`storage`),S(8,`read-only-storage`)]}),w=e.createBindGroupLayout({entries:[{binding:0,visibility:_.COMPUTE,buffer:{type:`uniform`,hasDynamicOffset:!0,minBindingSize:16}}]}),T=e.createShaderModule({code:a,label:`sim`}),ie=e.createPipelineLayout({bindGroupLayouts:[C,w]}),E=(t,n,r)=>e.createComputePipelineAsync({layout:r,compute:{module:t,entryPoint:n}}),D=this.b;this.simBG=e.createBindGroup({layout:C,entries:[`sim`,`X`,`P`,`V`,`tets`,`tetB`,`tetM`,`Q`,`grab`].map((e,t)=>({binding:t,resource:{buffer:D[e]}}))}),this.rangeBG=e.createBindGroup({layout:w,entries:[{binding:0,resource:{buffer:D.ranges,size:16}}]});let O=e.createBindGroupLayout({entries:[S(0,`uniform`),S(1,`read-only-storage`),S(2,`read-only-storage`),S(3,`read-only-storage`),S(4,`read-only-storage`),S(5,`read-only-storage`),S(6,`storage`)]});this.nodeFBG=e.createBindGroup({layout:O,entries:[`counts`,`X`,`tets`,`tetB`,`adjOff`,`adjTet`,`nodeData`].map((e,t)=>({binding:t,resource:{buffer:D[e]}}))});let k=e.createShaderModule({code:o,label:`nodeF`}),A=new Float32Array(r*4);for(let e=0;e<r;e++)A.set([t.nodes[3*e],t.nodes[3*e+1],t.nodes[3*e+2],1],4*e);this.buf(`restN`,A,f),this.buf(`frame`,832,h.UNIFORM),this.buf(`comp`,16,h.UNIFORM);let j=h.VERTEX;for(let e of[`o_`,`i_`])for(let n of[`pos`,`nrm`,`attr`,`nodes`,`wts`])this.buf(e+n,t.s[e+n],j);this.buf(`o_idx`,new Uint32Array(t.s.o_idx),h.INDEX),this.buf(`i_idx`,new Uint32Array(t.s.i_idx),h.INDEX),this.buf(`bub`,t.s.bub,j),this.buf(`bubN`,t.s.bubN,j),this.buf(`bubW`,t.s.bubW,j),this.linS=e.createSampler({magFilter:`linear`,minFilter:`linear`}),this.nearS=e.createSampler({magFilter:`nearest`,minFilter:`nearest`}),this.shadowTex=e.createTexture({size:[512,512],format:y,usage:g.RENDER_ATTACHMENT|g.TEXTURE_BINDING});let ae=_.VERTEX|_.FRAGMENT,oe=g.TEXTURE_BINDING,M=this.bgl;M.frame=e.createBindGroupLayout({entries:[{binding:0,visibility:ae,buffer:{type:`uniform`}}]}),M.mesh=e.createBindGroupLayout({entries:[S(0,`read-only-storage`,_.VERTEX),S(1,`read-only-storage`,_.VERTEX)]});let N=(e,t=`float`)=>({binding:e,visibility:_.FRAGMENT,texture:{sampleType:t}}),P=e=>({binding:e,visibility:_.FRAGMENT,sampler:{type:`filtering`}});M.shadowS=e.createBindGroupLayout({entries:[N(0),P(1)]}),M.shell=e.createBindGroupLayout({entries:[N(0),N(1),P(2),P(3)]}),M.comp=e.createBindGroupLayout({entries:[N(0,`unfilterable-float`),N(1,`unfilterable-float`),{binding:2,visibility:_.FRAGMENT,buffer:{type:`uniform`}}]}),this.frameBG=e.createBindGroup({layout:M.frame,entries:[{binding:0,resource:{buffer:D.frame}}]}),this.meshBG=e.createBindGroup({layout:M.mesh,entries:[{binding:0,resource:{buffer:D.nodeData}},{binding:1,resource:{buffer:D.restN}}]});let se=e.createTexture({size:[1,1],format:y,usage:oe});this.dummyBG=e.createBindGroup({layout:M.shadowS,entries:[{binding:0,resource:se.createView()},{binding:1,resource:this.linS}]}),this.shadowSBG=e.createBindGroup({layout:M.shadowS,entries:[{binding:0,resource:this.shadowTex.createView()},{binding:1,resource:this.linS}]});let F=[{arrayStride:8,attributes:[{shaderLocation:0,offset:0,format:`unorm16x4`}]},{arrayStride:8,attributes:[{shaderLocation:1,offset:0,format:`snorm16x4`}]},{arrayStride:4,attributes:[{shaderLocation:2,offset:0,format:`unorm8x4`}]},{arrayStride:8,attributes:[{shaderLocation:3,offset:0,format:`uint16x4`}]},{arrayStride:8,attributes:[{shaderLocation:4,offset:0,format:`snorm16x4`}]}],ce=[{arrayStride:16,stepMode:`instance`,attributes:[{shaderLocation:0,offset:0,format:`float32x4`}]},{arrayStride:8,stepMode:`instance`,attributes:[{shaderLocation:1,offset:0,format:`uint16x4`}]},{arrayStride:16,stepMode:`instance`,attributes:[{shaderLocation:2,offset:0,format:`float32x4`}]}],I=(t,n)=>e.createShaderModule({code:t,label:n}),L=I(u,`shadow`),R=I(d,`back`),z=I(m,`inner`),B=I(ne,`shell`),V=I(p,`backdrop`),H=I(ee,`bubble`),U=I(te,`bead`),W=I(re,`composite`),G=e.createPipelineLayout({bindGroupLayouts:[M.frame,M.mesh,M.shadowS]}),le=e.createPipelineLayout({bindGroupLayouts:[M.frame,M.mesh,M.shell]}),ue=e.createPipelineLayout({bindGroupLayouts:[M.comp]}),K=(e=!0,t=`less`)=>({format:`depth24plus`,depthWriteEnabled:e,depthCompare:t}),q={count:this.samples},J={operation:`add`,srcFactor:`one`,dstFactor:`one`},de=this.rp,Y=[],X=(t,n)=>Y.push(e.createRenderPipelineAsync({label:t,...n}).then(e=>{de[t]=e}));X(`shadowO`,{layout:G,vertex:{module:L,entryPoint:`vsLight`,buffers:F},fragment:{module:L,entryPoint:`fsShell`,targets:[{format:y,blend:{color:J,alpha:{operation:`min`,srcFactor:`one`,dstFactor:`one`}}}]},primitive:{cullMode:`none`}}),X(`shadowI`,{layout:G,vertex:{module:L,entryPoint:`vsLight`,buffers:F},fragment:{module:L,entryPoint:`fsInner`,targets:[{format:y,blend:{color:J,alpha:{operation:`min`,srcFactor:`one`,dstFactor:`one`}}}]},primitive:{cullMode:`none`}}),X(`backdrop`,{layout:G,vertex:{module:V,entryPoint:`vsFull`},fragment:{module:V,entryPoint:`fsMain`,targets:[{format:y}]},depthStencil:K(!1,`always`),multisample:q}),X(`inner`,{layout:G,vertex:{module:z,entryPoint:`vsMain`,buffers:F},fragment:{module:z,entryPoint:`fsMain`,targets:[{format:y}]},primitive:{cullMode:`back`},depthStencil:K(),multisample:q}),X(`bead`,{layout:G,vertex:{module:U,entryPoint:`vsMain`},fragment:{module:U,entryPoint:`fsMain`,targets:[{format:y}]},depthStencil:K(),multisample:q}),X(`bubble`,{layout:G,vertex:{module:H,entryPoint:`vsMain`,buffers:ce},fragment:{module:H,entryPoint:`fsMain`,targets:[{format:y,blend:{color:{operation:`add`,srcFactor:`one`,dstFactor:`one-minus-src-alpha`},alpha:{operation:`add`,srcFactor:`zero`,dstFactor:`one`}}}]},primitive:{topology:`triangle-strip`},depthStencil:K(!1),multisample:q}),X(`back`,{layout:G,vertex:{module:R,entryPoint:`vsMain`,buffers:F},fragment:{module:R,entryPoint:`fsMain`,targets:[{format:y}]},primitive:{cullMode:`front`},depthStencil:K()}),X(`shell`,{layout:le,vertex:{module:B,entryPoint:`vsMain`,buffers:F},fragment:{module:B,entryPoint:`fsMain`,targets:[{format:y}]},primitive:{cullMode:`back`},depthStencil:K(),multisample:q}),X(`comp`,{layout:ue,vertex:{module:W,entryPoint:`vsFull`},fragment:{module:W,entryPoint:`fsMain`,targets:[{format:this.fmt}]}});for(let e of[`predict`,`solveTets`,`solveGrab`,`contacts`])Y.push(E(T,e,ie).then(t=>{this.cp[e]=t}));Y.push(E(k,`nodeF`,e.createPipelineLayout({bindGroupLayouts:[O]})).then(e=>{this.cp.nodeF=e}));for(let e of[T,k,L,R,z,B,V,H,U,W]){let t=await e.getCompilationInfo();for(let n of t.messages)if(n.type===`error`)throw await Promise.allSettled(Y),Error(`WGSL ${e.label}:${n.lineNum}:${n.linePos}: ${n.message}`)}await Promise.all(Y);let Z=await e.popErrorScope();if(Z)throw Error(`WebGPU validation: `+Z.message);let Q=e.createCommandEncoder(),$=Q.beginComputePass();$.setPipeline(this.cp.nodeF),$.setBindGroup(0,this.nodeFBG),$.dispatchWorkgroups(Math.ceil(r/64)),$.end(),e.queue.submit([Q.finish()]),await e.queue.onSubmittedWorkDone()}writeInitialState(){let e=this.asset,t=this.N,n=this.dev.queue,r=new Float32Array(t*4),i=new Float32Array(t*4),a=new Float32Array(t*4);for(let n=0;n<t;n++)r.set([e.nodes[3*n],e.nodes[3*n+1],e.nodes[3*n+2],e.invMass[n]],4*n),i.set([e.nodes[3*n],e.nodes[3*n+1],e.nodes[3*n+2],e.fric[n]],4*n),a.set([0,0,0,e.grav[n]],4*n);let o=new Float32Array(this.T*4);for(let e=0;e<this.T;e++)o[4*e+3]=1;n.writeBuffer(this.b.X,0,r),n.writeBuffer(this.b.P,0,i),n.writeBuffer(this.b.V,0,a),n.writeBuffer(this.b.Q,0,o)}step(e){if(this.lost||!(e.dt>1e-5)||(this.skip=this.inflight>=2,this.skip))return;this.cost>20&&this.substeps>8?this.substeps--:this.cost<10&&this.substeps<10&&this.substeps++;let t=n,r=this.substeps,i=e.dt/r,a=this.simF,o=this.simI,s=e.grab;a[0]=i,a[1]=t.gravity,a[2]=Math.exp(-t.damping*i),a[3]=t.muBody,a[4]=t.muFin,a[5]=t.lambdaRatio,a[6]=t.frictionStatic,a[7]=t.frictionKinetic,a[8]=t.grabStiffness,a[9]=this.asset.meta.h*.42,a[10]=Math.min(e.beadCount,16),a[11]=s.active?s.count:0,a.fill(0,12,16);for(let t=0;t<Math.min(4,e.act.length);t++)a[12+t]=e.act[t];a[16]=s.target[0],a[17]=s.target[1],a[18]=s.target[2],a[19]=s.twist,a[20]=s.axis[0],a[21]=s.axis[1],a[22]=s.axis[2],a[23]=0,o[24]=this.N,o[25]=this.T,o[26]=0,o[27]=0,a[28]=e.spin[0],a[29]=e.spin[1],a[30]=e.spin[2],a[31]=0,a[32]=e.spin[3],a[33]=e.spin[4],a[34]=e.spin[5],a[35]=0,a.set(e.beads.subarray(0,64),36);let c=this.dev.queue;c.writeBuffer(this.b.sim,0,this.simU);let l=s.active&&s.count>0;if(l){let e=this.grabData;for(let t=0;t<s.count;t++)e[4*t]=s.off[3*t],e[4*t+1]=s.off[3*t+1],e[4*t+2]=s.off[3*t+2],e[4*t+3]=s.wt[t],e[4*(64+t)]=s.idx[t];c.writeBuffer(this.b.grab,0,e)}let u=this.dev.createCommandEncoder(),d=u.beginComputePass(),f=Math.ceil(this.N/64);d.setBindGroup(0,this.simBG),d.setBindGroup(1,this.rangeBG,[0]);for(let e=0;e<r;e++){d.setPipeline(this.cp.predict),d.dispatchWorkgroups(f),d.setPipeline(this.cp.solveTets);for(let e=0;e<this.colours.length;e++)d.setBindGroup(1,this.rangeBG,[e*256]),d.dispatchWorkgroups(Math.ceil(this.colours[e].count/64));l&&(d.setPipeline(this.cp.solveGrab),d.dispatchWorkgroups(Math.ceil(s.count/64))),d.setPipeline(this.cp.contacts),d.dispatchWorkgroups(f)}d.setPipeline(this.cp.nodeF),d.setBindGroup(0,this.nodeFBG),d.dispatchWorkgroups(f),d.end();let p=this.stagingNext,m=!1;this.stagingBusy[p]||(u.copyBufferToBuffer(this.b.X,0,this.staging[p],0,this.N*16),m=!0,this.stagingNext=1-p),this.pendingEnc=u,this.pendingRead=m?p:-1}submit(e){let t=this.dev.queue,n=performance.now();t.submit([e.finish()]),this.inflight++,this.presented++,this.simSteps++,t.onSubmittedWorkDone().then(()=>{this.inflight--,this.cost=this.cost*.85+(performance.now()-n)*.15});let r=this.pendingRead;if(this.pendingRead=-1,r>=0){this.stagingBusy[r]=!0;let e=this.staging[r];e.mapAsync(GPUMapMode.READ).then(()=>{this.latest=new Float32Array(e.getMappedRange().slice(0)),e.unmap(),this.stagingBusy[r]=!1}).catch(()=>{this.stagingBusy[r]=!1})}}resize(e,t){if(e===this.W&&t===this.H&&this.tg.scene)return;this.W=e,this.H=t,this.canvas.width=e,this.canvas.height=t;for(let e of Object.values(this.tg))e?.destroy();let n=this.dev,r=g.RENDER_ATTACHMENT,i=g.TEXTURE_BINDING,a=(r,i,a=1)=>n.createTexture({size:[e,t],format:r,usage:i,sampleCount:a}),o=this.samples;this.tg={sceneMS:o>1?a(y,r,o):void 0,scene:a(y,r|i),sceneDepth:a(`depth24plus`,r,o),back:a(y,r|i),backDepth:a(`depth24plus`,r),shellMS:o>1?a(y,r,o):void 0,shell:a(y,r|i),shellDepth:a(`depth24plus`,r,o)},this.shellBG=n.createBindGroup({layout:this.bgl.shell,entries:[{binding:0,resource:this.tg.scene.createView()},{binding:1,resource:this.tg.back.createView()},{binding:2,resource:this.linS},{binding:3,resource:this.nearS}]}),this.compBG=n.createBindGroup({layout:this.bgl.comp,entries:[{binding:0,resource:this.tg.scene.createView()},{binding:1,resource:this.tg.shell.createView()},{binding:2,resource:{buffer:this.b.comp}}]})}mesh(e,t){let n=this.b;[`pos`,`nrm`,`attr`,`nodes`,`wts`].forEach((r,i)=>e.setVertexBuffer(i,n[t+r])),e.setIndexBuffer(n[t+`idx`],`uint32`),e.drawIndexed(t===`o_`?this.nOuter:this.nInner)}render(e,t,n){if(this.lost||!this.tg.scene||this.skip)return;let r=this.dev,i=r.queue,a=this.rp,o=this.tg;i.writeBuffer(this.b.frame,0,e),i.writeBuffer(this.b.comp,0,new Float32Array([t,n,1.5/255,.35]));let s=this.pendingEnc??r.createCommandEncoder();this.pendingEnc=null;let c=e=>{e.setBindGroup(0,this.frameBG),e.setBindGroup(1,this.meshBG)},l=s.beginRenderPass({colorAttachments:[{view:this.shadowTex.createView(),loadOp:`clear`,storeOp:`store`,clearValue:[0,0,0,10]}]});c(l),l.setBindGroup(2,this.dummyBG),l.setPipeline(a.shadowO),this.mesh(l,`o_`),l.setPipeline(a.shadowI),this.mesh(l,`i_`),l.end(),l=s.beginRenderPass({colorAttachments:[{view:(o.sceneMS??o.scene).createView(),resolveTarget:o.sceneMS?o.scene.createView():void 0,loadOp:`clear`,storeOp:o.sceneMS?`discard`:`store`,clearValue:[0,0,0,1e3]}],depthStencilAttachment:{view:o.sceneDepth.createView(),depthClearValue:1,depthLoadOp:`clear`,depthStoreOp:`discard`}}),c(l),l.setBindGroup(2,this.shadowSBG),l.setPipeline(a.backdrop),l.draw(3),l.setPipeline(a.inner),this.mesh(l,`i_`),l.setPipeline(a.bead),l.draw(96),l.setPipeline(a.bubble),l.setVertexBuffer(0,this.b.bub),l.setVertexBuffer(1,this.b.bubN),l.setVertexBuffer(2,this.b.bubW),this.nBub&&l.draw(4,this.nBub),l.end(),l=s.beginRenderPass({colorAttachments:[{view:o.back.createView(),loadOp:`clear`,storeOp:`store`,clearValue:[1e3,0,0,1]}],depthStencilAttachment:{view:o.backDepth.createView(),depthClearValue:1,depthLoadOp:`clear`,depthStoreOp:`discard`}}),c(l),l.setBindGroup(2,this.shadowSBG),l.setPipeline(a.back),this.mesh(l,`o_`),l.end(),l=s.beginRenderPass({colorAttachments:[{view:(o.shellMS??o.shell).createView(),resolveTarget:o.shellMS?o.shell.createView():void 0,loadOp:`clear`,storeOp:o.shellMS?`discard`:`store`,clearValue:[0,0,0,0]}],depthStencilAttachment:{view:o.shellDepth.createView(),depthClearValue:1,depthLoadOp:`clear`,depthStoreOp:`discard`}}),c(l),l.setBindGroup(2,this.shellBG),l.setPipeline(a.shell),this.mesh(l,`o_`),l.end();let u=this.ctx.getCurrentTexture();l=s.beginRenderPass({colorAttachments:[{view:u.createView(),loadOp:`clear`,storeOp:`store`,clearValue:[0,0,0,1]}]}),l.setPipeline(a.comp),l.setBindGroup(0,this.compBG),l.draw(3),l.end();let d=null;if(this.captureReq){let e=Math.ceil(this.W*4/256)*256,t=r.createBuffer({size:e*this.H,usage:h.COPY_DST|h.MAP_READ});s.copyTextureToBuffer({texture:u},{buffer:t,bytesPerRow:e},[this.W,this.H]),d={buf:t,bpr:e,res:this.captureReq},this.captureReq=null}if(this.submit(s),d){let{buf:e,bpr:t,res:n}=d,r=this.W,i=this.H,a=this.fmt===`bgra8unorm`;e.mapAsync(GPUMapMode.READ).then(()=>{let o=new Uint8Array(e.getMappedRange()),s=new ImageData(r,i);for(let e=0;e<i;e++)for(let n=0;n<r;n++){let i=e*t+4*n,c=4*(e*r+n);s.data[c]=o[i+(a?2:0)],s.data[c+1]=o[i+1],s.data[c+2]=o[i+(a?0:2)],s.data[c+3]=255}e.unmap(),e.destroy(),n(s)})}}nodes(){return{data:this.latest,stride:4}}reset(){this.writeInitialState()}simMs(){return this.cost}busy(){return this.inflight>=2}idle(){return this.dev.queue.onSubmittedWorkDone()}};export{b as GPUPath};
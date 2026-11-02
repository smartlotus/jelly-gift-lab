// WGSL XPBD solver: identical algorithm to src/sim/cpu.ts (co-rotational deviatoric + volume per tet, graph-coloured Gauss-Seidel).
export const SIM_WGSL = /* wgsl */`
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
`;

// per-node smoothed deformation gradient for skinning (separate bind layout)
export const NODEF_WGSL = /* wgsl */`
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
`;

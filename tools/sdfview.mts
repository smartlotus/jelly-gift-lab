// Quick SDF preview: sphere-traced orthographic views (front, side, 3/4, top) of a character's outer + inner surfaces -> PPM
import { writeFileSync } from 'fs';
const id = process.argv[2] || 'pig';
const mod = await import(`../src/characters/${id}/shape.ts`);
const ch = mod[id];
const W = 260, H = 300; const views = [[0, 0], [Math.PI / 2, 0], [0.6, 0.3], [0, 1.45], [Math.PI, 0]];
const img = Buffer.alloc(W * views.length * H * 3, 255);
const b = ch.bounds; const cx = (b.min[0] + b.max[0]) / 2, cy = (b.min[1] + b.max[1]) / 2, cz = (b.min[2] + b.max[2]) / 2;
const span = Math.max(b.max[0] - b.min[0], b.max[1] - b.min[1], b.max[2] - b.min[2]) * 1.05;
views.forEach(([yaw, pitch], vi) => {
  const f = [Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch)];
  const r = [Math.cos(yaw), 0, -Math.sin(yaw)];
  const u = [f[1] * r[2] - f[2] * r[1], f[2] * r[0] - f[0] * r[2], f[0] * r[1] - f[1] * r[0]];
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    const sx = (i / W - 0.5) * span * W / H * 1.0, sy = (0.5 - j / H) * span;
    const o = [cx + r[0] * sx + u[0] * sy + f[0] * span, cy + r[1] * sx + u[1] * sy + f[1] * span, cz + r[2] * sx + u[2] * sy + f[2] * span];
    let t = 0, hit = -1, hitIn = false;
    for (let k = 0; k < 160 && t < span * 2; k++) {
      const p = [o[0] - f[0] * t, o[1] - f[1] * t, o[2] - f[2] * t];
      const d = ch.outer(p[0], p[1], p[2]);
      if (d < 0.0004) { hit = t; break; }
      t += Math.max(d * 0.8, 0.0005);
    }
    let col = [235, 235, 235];
    if (hit >= 0) {
      const p = [o[0] - f[0] * hit, o[1] - f[1] * hit, o[2] - f[2] * hit]; const e = 0.001;
      const n = [ch.outer(p[0] + e, p[1], p[2]) - ch.outer(p[0] - e, p[1], p[2]), ch.outer(p[0], p[1] + e, p[2]) - ch.outer(p[0], p[1] - e, p[2]), ch.outer(p[0], p[1], p[2] + e) - ch.outer(p[0], p[1], p[2] - e)];
      const nl = Math.hypot(...n) || 1; const L = [0.4, 0.7, 0.6]; const ll = Math.hypot(...L);
      const dif = Math.max(0, (n[0] * L[0] + n[1] * L[1] + n[2] * L[2]) / nl / ll);
      // depth of the milky core below the surface: march a little further
      let tin = 0; for (let k = 0; k < 40; k++) { const q = [p[0] - f[0] * tin, p[1] - f[1] * tin, p[2] - f[2] * tin]; const di = ch.inner(q[0], q[1], q[2]); if (di < 0.0003) break; tin += Math.max(di, 0.0004); if (tin > 0.08) break; }
      const a = new Float32Array(4); ch.attrs(p[0], p[1], p[2], a);
      const milky = tin < 0.08 ? Math.exp(-tin / 0.02) : 0;
      const base = [255 * (0.55 + 0.45 * milky), 160 + 90 * milky, 175 + 80 * milky];
      const sh = 0.35 + 0.65 * dif;
      col = base.map((c, k) => Math.min(255, c * sh * (1 - 0.35 * a[2]) * (k === 0 ? 1 : 1 - 0.3 * a[1])));
      // eyes (inner very close & black-ish region): detect by inner distance tiny and outside core
      if (tin < 0.0055 && ch.core(p[0], p[1], p[2]) > -0.012 && mod.EYES) col = [30, 30, 30];
    }
    const idx = (j * W * views.length + vi * W + i) * 3; img[idx] = col[0]; img[idx + 1] = col[1]; img[idx + 2] = col[2];
  }
});
writeFileSync(`/tmp/${id}-sdf.ppm`, Buffer.concat([Buffer.from(`P6 ${W * views.length} ${H} 255\n`), img]));
console.log('ok');

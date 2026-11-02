// Quick CPU sphere-traced preview of a character SDF (top / side / 3-4 views) for shape iteration.
import { writeFileSync } from 'fs';
import { shark } from '../src/characters/shark/shape';
const W = 480, H = 300;
const f = shark.outer, g = shark.inner;
function render(eye: number[], tgt: number[], name: string, fn = f) {
  const img = Buffer.alloc(W * H * 3);
  const fw = norm(sub(tgt, eye)); const rt = norm(cross(fw, [0, 1, 0])); const up = cross(rt, fw);
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    const u = (i / W - 0.5) * 2 * (W / H) * 0.17, v = -(j / H - 0.5) * 2 * 0.17;
    const rd = norm([fw[0] + rt[0] * u + up[0] * v, fw[1] + rt[1] * u + up[1] * v, fw[2] + rt[2] * u + up[2] * v]);
    let t = 0, hit = false;
    for (let k = 0; k < 200; k++) {
      const p = [eye[0] + rd[0] * t, eye[1] + rd[1] * t, eye[2] + rd[2] * t];
      const d = fn(p[0], p[1], p[2]);
      if (d < 0.0005) { hit = true; break; }
      t += d * 0.8; if (t > 8) break;
    }
    let c = [235, 232, 226];
    if (hit) {
      const p = [eye[0] + rd[0] * t, eye[1] + rd[1] * t, eye[2] + rd[2] * t]; const e = 0.0008;
      const n = norm([fn(p[0] + e, p[1], p[2]) - fn(p[0] - e, p[1], p[2]), fn(p[0], p[1] + e, p[2]) - fn(p[0], p[1] - e, p[2]), fn(p[0], p[1], p[2] + e) - fn(p[0], p[1], p[2] - e)]);
      const l = Math.max(0, dot(n, norm([0.3, 1, 0.4]))) * 0.75 + 0.25;
      const belly = g(p[0], p[1], p[2]) < 0.012 ? 1 : 0;
      c = belly ? [255 * l, 250 * l, 240 * l] : [120 * l, 140 * l, 160 * l];
    } else if (rd[1] < 0) { const tt = -eye[1] / rd[1]; const p = [eye[0] + rd[0] * tt, 0, eye[2] + rd[2] * tt]; if (Math.abs(p[0] * 10 % 1) < 0.03 || Math.abs(p[2] * 10 % 1) < 0.03) c = [200, 200, 200]; }
    const o = (j * W + i) * 3; img[o] = c[0]; img[o + 1] = c[1]; img[o + 2] = c[2];
  }
  writeFileSync(`/tmp/${name}.ppm`, Buffer.concat([Buffer.from(`P6 ${W} ${H} 255\n`), img]));
}
function sub(a: number[], b: number[]) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
function norm(a: number[]) { const l = Math.hypot(a[0], a[1], a[2]); return [a[0] / l, a[1] / l, a[2] / l]; }
function cross(a: number[], b: number[]) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
function dot(a: number[], b: number[]) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
render([-0.08, 3.5, 0.001], [-0.08, 0, 0], 'top');
render([-0.08, 0.12, 3.5], [-0.08, 0.12, 0], 'side');
render([1.6, 1.3, 2.0], [-0.05, 0.08, 0], 'q34');
render([3.5, 0.6, 0.0], [0, 0.08, 0], 'front');
render([0.6, -1.5, 0.6], [0.2, 0.05, 0], 'under'); render([-0.3,0.3,2.2],[-0.45,0.12,0],'tail');

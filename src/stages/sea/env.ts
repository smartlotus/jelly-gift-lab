// The living sea around the film sets: depth layers (far silhouettes, mid reef, near plants), caustic light from the
// surface, plankton/bubbles, fish schools, jellyfish, and a detailed seabed. Colours derive from each scene's palette
// (top / bot / sand) so every film keeps its mood. Static reef + seabed pieces are baked once per scene into a canvas;
// only swaying / moving things are drawn per frame. Everything is deterministic (hash of index) → no allocation per frame.
import { R, disc, hash, mix, shade, fish } from './art';

export interface Pal { top: string; bot: string; sand: string; reef?: number; kelp?: number; life?: number; accent?: string }
export interface EnvCtx { g: CanvasRenderingContext2D; t: number; w: number; h: number; x0: number; L: number; floor: number; cam: number }

const bakes = new Map<string, HTMLCanvasElement>();
/** reef rocks, coral fans, shells, starfish, sand ripples — baked (scene-local, L x h) */
function baked(id: string, p: Pal, L: number, h: number, floor: number): HTMLCanvasElement {
  const key = `${id}:${h}`; let c = bakes.get(key); if (c) return c;
  c = document.createElement('canvas'); c.width = L; c.height = h; const g = c.getContext('2d')!; const seed = id.length * 31 + id.charCodeAt(0);
  const reef = p.reef ?? 1, rock = mix(shade(p.sand, -0.45), p.bot, 0.35), rockHi = mix(rock, p.sand, 0.35), rockLo = shade(rock, -0.25);
  // sand: ripples + speckles
  for (let y = floor + 1; y < h; y += 3) for (let x = (y * 7) % 9; x < L; x += 9 + ((x + y) % 5)) R(g, x, y, 4, 1, shade(p.sand, (x + y) % 2 ? -0.08 : 0.08));
  for (let i = 0; i < 70; i++) R(g, hash(seed + i) * L, floor + 2 + hash(seed + i * 3) * (h - floor - 2), 1, 1, shade(p.sand, hash(i) > 0.5 ? -0.18 : 0.15));
  // rocks (rounded, lit from above)
  const nRock = Math.round(5 * reef);
  for (let i = 0; i < nRock; i++) {
    const x = hash(seed + i * 7) * L, rw = 12 + hash(seed + i * 11) * 26, rh = 6 + hash(seed + i * 13) * 16;
    for (let y = 0; y < rh; y++) { const hw = rw / 2 * Math.sqrt(1 - ((rh - y) / rh) ** 2); R(g, x - hw, floor - y, hw * 2, 1, y > rh - 2 ? rockHi : y < 2 ? rockLo : rock); }
    R(g, x - rw * 0.2, floor - rh + 1, rw * 0.25, 1, shade(rockHi, 0.15));
  }
  // coral fans + brain coral
  const corals = [mix('#e07a6a', p.bot, 0.3), mix('#f2a65a', p.bot, 0.3), mix('#c96aa0', p.bot, 0.3), mix('#e8d6b0', p.bot, 0.35)];
  for (let i = 0; i < Math.round(7 * reef); i++) {
    const x = hash(seed + i * 17 + 1) * L, col = corals[i % 4], ht = 8 + hash(seed + i * 19) * 16;
    if (i % 3 === 2) { disc(g, x, floor - 3, 4, col); for (let k = -3; k <= 3; k += 2) R(g, x + k, floor - 5 + Math.abs(k) / 2, 1, 3, shade(col, -0.2)); continue; }
    const branch = (bx: number, by: number, len: number, dir: number, d: number) => { for (let s = 0; s < len; s++) { const xx = bx + dir * s * 0.45, yy = by - s; R(g, xx, yy, 1, 1, col); if (d < 2 && s === Math.floor(len * 0.5)) { branch(xx, yy, len * 0.6, -dir, d + 1); branch(xx, yy, len * 0.55, dir * 1.6, d + 1); } } R(g, bx + dir * len * 0.45, by - len, 1, 1, shade(col, 0.3)); };
    branch(x, floor, ht, 0.4, 0); branch(x, floor, ht * 0.8, -0.8, 1);
  }
  // shells + starfish
  for (let i = 0; i < Math.round(6 * reef + 2); i++) {
    const x = hash(seed + i * 23 + 5) * L, y = floor + 3 + hash(seed + i * 29) * Math.max(1, h - floor - 6);
    if (i % 2) { const col = mix('#f0a07a', p.sand, 0.25); R(g, x, y, 1, 5, col); R(g, x - 2, y + 2, 5, 1, col); R(g, x - 1, y + 1, 3, 3, col); R(g, x - 1, y + 4, 1, 1, col); R(g, x + 1, y + 4, 1, 1, col); }
    else { const col = mix('#f4e3cf', p.sand, 0.2); R(g, x - 2, y + 1, 5, 2, col); R(g, x - 1, y, 3, 1, col); R(g, x - 1, y + 1, 1, 2, shade(col, -0.2)); R(g, x + 1, y + 1, 1, 2, shade(col, -0.2)); }
  }
  bakes.set(key, c); return c;
}

/** far: soft silhouettes of ridges / arches / a sunken ruin far behind, drawn across the screen in each scene's tone */
export function far(g: CanvasRenderingContext2D, w: number, h: number, floor: number, cam: number, palAt: (worldX: number) => Pal) {
  const P = 0.22, step = 58, first = Math.floor((cam * P) / step) - 1;
  for (let i = first; i < first + Math.ceil(w / step) + 3; i++) {
    const sx = i * step - cam * P + hash(i * 1.9) * 20, pal = palAt(sx + cam), col = mix(mix(pal.bot, pal.top, 0.42), '#000000', 0.1), kind = hash(i * 9.3);
    if (kind > 0.84) { // a natural rock arch
      const aw = 40, ah = h * 0.16; R(g, sx - aw / 2, floor - ah, 8, ah, col); R(g, sx + aw / 2 - 8, floor - ah, 8, ah, col);
      for (let a = 0; a <= 20; a++) { const ang = Math.PI * a / 20; R(g, sx - Math.cos(ang) * (aw / 2 - 4) - 4, floor - ah - Math.sin(ang) * 12 - 4, 8, 8, col); }
      continue;
    }
    const tall = kind > 0.66, ht = h * (tall ? 0.22 + hash(i * 3.1) * 0.12 : 0.06 + hash(i * 3.1) * 0.12), wd = tall ? 22 + hash(i * 5.7) * 12 : step * (1 + hash(i * 5.7) * 0.9);
    for (let y = 0; y < ht; y += 2) { const k = y / ht, hw = tall ? wd / 2 * (1 - 0.35 * k) * (k > 0.92 ? 0.8 : 1) : wd / 2 * Math.sqrt(Math.max(0, 1 - k * k)); const jit = Math.round(Math.sin(i * 7 + Math.floor(y / 6)) * 1.5); R(g, sx - hw + jit, floor - y - 2, hw * 2, 2, col); }
  }
}
/** caustic light rays from the surface + a shimmering surface band at the top */
export function rays(g: CanvasRenderingContext2D, w: number, h: number, t: number, cam: number, k = 1) {
  if (k <= 0) return;
  for (let i = 0; i < 6; i++) {
    const base = ((i * 71 - cam * 0.15 + Math.sin(t * 0.2 + i) * 14) % (w + 80) + w + 80) % (w + 80) - 40, wd = 8 + hash(i) * 14, len = h * (0.55 + hash(i + 2) * 0.35);
    for (let y = 0; y < len; y += 2) { const a = (1 - y / len) * 0.075 * k * (0.7 + 0.3 * Math.sin(t * 0.8 + i * 1.7)); g.globalAlpha = a; R(g, base + y * 0.28, y, wd * (1 + y / len), 2, '#fffbea'); }
  }
  g.globalAlpha = 0.14 * k; for (let x = 0; x < w; x += 3) { const y = 1 + Math.round(1.5 + Math.sin(x * 0.11 + t * 1.6) + Math.sin(x * 0.05 - t)); R(g, x, y, 2, 1, '#ffffff'); } g.globalAlpha = 1;
}
/** plankton + bubbles (depth-scaled parallax) */
export function motes(g: CanvasRenderingContext2D, w: number, h: number, floor: number, t: number, cam: number) {
  for (let i = 0; i < 80; i++) {
    const z = 0.3 + hash(i * 1.7) * 0.9, x = ((hash(i * 2.3) * (w + 40) - cam * z + Math.sin(t * 0.5 + i) * 3) % (w + 40) + w + 40) % (w + 40) - 20, y = (hash(i * 3.9) * floor + t * 2 * z + Math.sin(t * 0.7 + i) * 2) % floor;
    g.globalAlpha = 0.25 + z * 0.35; R(g, x, y, z > 0.95 ? 2 : 1, 1, i % 7 === 0 ? '#ffe9b0' : '#d8eef2');
  }
  for (let i = 0; i < 22; i++) { const x = ((i * 53.3 - cam * 0.6) % (w + 20) + w + 20) % (w + 20) - 10, y = floor - ((t * (9 + (i % 5) * 3) + i * 47) % (floor + 20)); g.globalAlpha = 0.6; const r = i % 4 === 0 ? 2 : 1; R(g, x + Math.sin(t * 2 + i) * 2, y, r, r, '#e6f6fa'); if (r > 1) R(g, x + Math.sin(t * 2 + i) * 2, y, 1, 1, '#ffffff'); }
  g.globalAlpha = 1;
}
/** per scene (clipped to its strip by the caller): baked reef + kelp, anemones, a jellyfish or two, schools of fish */
export function life(c: EnvCtx, id: string, p: Pal) {
  const { g, t, x0, L, floor, h } = c, kelp = p.kelp ?? 1, lifeK = p.life ?? 1;
  g.drawImage(baked(id, p, L, h, floor), Math.round(x0), 0);
  const seed = id.charCodeAt(0) * 13 + id.length;
  // kelp: segmented ribbons swaying with the current
  const kc = mix('#4f8a55', p.bot, 0.4), kd = shade(kc, -0.25);
  for (let i = 0; i < Math.round(9 * kelp); i++) {
    const bx = x0 + hash(seed + i * 5.3) * L, ht = floor * (0.25 + hash(seed + i * 7.1) * 0.45);
    for (let s = 0; s < ht; s += 2) { const k = s / ht, x = bx + Math.sin(t * 1.1 + i + s * 0.05) * 6 * k; R(g, x, floor - s, 2, 2, s % 8 < 2 ? kd : kc); if (s % 12 === 6) R(g, x + (i % 2 ? 2 : -3), floor - s, 3, 2, kc); }
  }
  // anemones: tufts of tentacles on the sand
  const ac = [mix('#e88aa8', p.bot, 0.25), mix('#b07ad9', p.bot, 0.25), mix('#f2b05a', p.bot, 0.25)];
  for (let i = 0; i < Math.round(5 * (p.reef ?? 1)); i++) {
    const bx = x0 + hash(seed + i * 9.7 + 3) * L, col = ac[i % 3];
    R(g, bx - 3, floor - 2, 7, 3, shade(col, -0.3));
    for (let k = -3; k <= 3; k++) for (let s = 0; s < 7; s++) R(g, bx + k + Math.sin(t * 2 + k + i) * s * 0.25, floor - 3 - s, 1, 1, s > 5 ? shade(col, 0.3) : col);
  }
  // jellyfish drifting in the upper water (fills the tall portrait sky)
  for (let i = 0; i < Math.round(2 * lifeK); i++) {
    const jx = x0 + (0.2 + 0.6 * hash(seed + i * 3)) * L + Math.sin(t * 0.3 + i) * 10, jy = h * (0.12 + 0.3 * hash(seed + i * 4)) + Math.sin(t * 0.8 + i * 2) * 6, pulse = Math.sin(t * 2.2 + i) > 0 ? 1 : 0;
    g.globalAlpha = 0.55; const col = mix('#d8c8f0', p.top, 0.25);
    for (let r = 0; r < 5; r++) R(g, jx - 4 - pulse + r * 0.5 + (r === 0 ? 1 : 0), jy + r, 9 + pulse * 2 - r, 1, r === 0 ? shade(col, 0.3) : col);
    for (let k = 0; k < 4; k++) for (let s = 0; s < 6; s++) R(g, jx - 3 + k * 2 + Math.sin(t * 2 + s * 0.6 + k) * 1, jy + 5 + s * 2, 1, 2, col);
    g.globalAlpha = 1;
  }
  // schools: a few groups of small fish swimming as one
  const sc = [mix('#f2d27a', p.bot, 0.2), mix('#9fd6e0', p.bot, 0.2), mix('#f4a6a0', p.bot, 0.2)];
  for (let s = 0; s < Math.round(3 * lifeK); s++) {
    const n = 7 + (s % 3) * 3, dir = s % 2 ? 1 : -1, cx = x0 + ((hash(seed + s) * L + dir * t * 10) % L + L) % L, cy = h * (0.15 + 0.55 * hash(seed + s * 7)) + Math.sin(t * 0.6 + s) * 8;
    for (let k = 0; k < n; k++) { const a = k * 2.4, rr = 3 + (k % 4) * 3; fish(g, cx + Math.cos(a + t * 0.4) * rr * 1.5, cy + Math.sin(a + t * 0.5) * rr * 0.7, sc[s % 3], dir, shade(sc[s % 3], -0.5)); }
  }
}
/** near: a few tall dark plant silhouettes passing in front (faster parallax), kept low so they never hide the shark */
export function near(g: CanvasRenderingContext2D, w: number, h: number, t: number, cam: number, palAt: (worldX: number) => Pal) {
  const P = 1.35, step = 170, first = Math.floor((cam * P) / step) - 1;
  for (let i = first; i < first + Math.ceil(w / step) + 3; i++) {
    const bx = i * step - cam * P + hash(i * 4.4) * 60, pal = palAt(bx + cam), col = shade(mix(pal.bot, '#1a3a2a', 0.4), -0.45), ht = h * (0.1 + hash(i * 2.2) * 0.09);
    for (let k = 0; k < 4; k++) for (let s = 0; s < ht * (0.6 + k * 0.15); s += 2) R(g, bx + k * 4 + Math.sin(t * 1.3 + k + s * 0.07) * s * 0.08, h - s, 3, 2, col);
  }
}

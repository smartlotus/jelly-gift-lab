// The places we've been, as "underwater meets landmark" vistas between the films. In each, the waterline comes DOWN from
// the top as the shark swims in (and goes back up as it leaves), so the neighbouring scenes stay fully underwater; above
// the line: sky + the landmark (parallax), below it: its wavering reflection, then the water and the local life. Each has
// one small beat when the shark arrives (tide falls, niches glow, lanterns, sunrise, clouds part, the city lights up).
// Landmark shapes from reference photos, simplified to pixel silhouettes — no text beyond the small place name.
import { draw, frameAt } from '../../shared/pixel/sprite';
import { catSprites } from '../../shared/pixel/cat';
import { pigSprites } from '../../shared/pixel/pig';
import { SW, SH } from './shark';
import { R, disc, hash, mix, shade, fish } from './art';
import type { Scene, Ctx } from './scenes';

const clamp = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const ease = (v: number) => { v = clamp(v); return v * v * (3 - 2 * v); };
type G = CanvasRenderingContext2D;
interface Land { (g: G, W: number, H: number, ax: number, c: Ctx): void }
const offs = new Map<string, HTMLCanvasElement>();
/** waterline fraction of the screen height (portrait shows more sky) */
const wlOf = (c: Ctx) => (c.w < c.h ? 0.3 : 0.36);
/** how far the waterline has come down (0 = fully underwater at the scene edges, 1 = vista) */
export const appear = (c: Ctx) => ease(Math.min(c.p / 0.16, (1 - c.p) / 0.14, 1));
function vista(c: Ctx, id: string, sky: string[], land: Land, refl = 0.32) {
  const { g, w, h, t } = c, WL = Math.round(h * wlOf(c)), a = appear(c); if (a <= 0.001) return;
  let off = offs.get(id); if (!off || off.width !== w || off.height !== WL) { off = document.createElement('canvas'); off.width = w; off.height = WL; offs.set(id, off); }
  const o = off.getContext('2d')!; o.imageSmoothingEnabled = false;
  for (let b = 0; b < 8; b++) { const k = b / 7, i = Math.min(sky.length - 2, Math.floor(k * (sky.length - 1))), f = k * (sky.length - 1) - i; R(o, 0, Math.round(WL * b / 8), w, Math.ceil(WL / 8) + 1, mix(sky[i], sky[i + 1], f)); }
  const ax = Math.round(c.x0 * 0.55 + c.L * 0.45);
  land(o, w, WL, ax, c);
  const wl = Math.round(WL * a), top = wl - WL; // the picture slides down with the waterline
  g.drawImage(off, 0, top);
  const rh = Math.min(WL, Math.round(h * 0.2)); // reflection: flipped rows, rippling, fading with depth
  for (let y = 0; y < rh; y++) { const k = y / rh, dx = Math.round(Math.sin(t * 2.2 + y * 0.45) * (0.6 + k * 2)); g.globalAlpha = refl * (1 - k) * a; g.drawImage(off, 0, WL - 1 - y, w, 1, dx, wl + y, w, 1); }
  g.globalAlpha = 1;
  for (let x = 0; x < w; x += 2) R(g, x, wl + Math.round(Math.sin(x * 0.13 + t * 2) * 0.7), 2, 1, 'rgba(255,255,255,.55)');
  for (let i = 0; i < 10; i++) { g.globalAlpha = 0.4; R(g, (i * 47 + t * 9) % w, wl + 2 + (i % 3) * 2, 4, 1, '#ffffff'); } g.globalAlpha = 1;
}
const tri = (g: G, x: number, y: number, hw: number, ht: number, c: string) => { for (let j = 0; j < ht; j++) { const k = j / ht; R(g, x - hw * k, y - ht + j, hw * 2 * k + 1, 1, c); } };
const hills = (g: G, W: number, base: number, amp: number, ph: number, sc: number, col: string, off = 0) => { for (let x = 0; x < W; x += 2) { const hh = amp * (0.55 + 0.45 * Math.sin((x + off) * sc + ph)) * (0.7 + 0.3 * Math.sin((x + off) * sc * 2.3 + ph * 3)); R(g, x, base - hh, 2, hh, col); } };
/** a Chinese hall roof: curved hip roof with upturned eaves */
function roof(g: G, cx: number, y: number, w: number, ht: number, col: string, ridge: string) {
  for (let j = 0; j < ht; j++) { const k = j / ht, hw = w / 2 * (0.42 + 0.58 * Math.pow(k, 0.75)); R(g, cx - hw, y + j, hw * 2, 1, j === ht - 1 ? shade(col, -0.25) : col); }
  R(g, cx - w * 0.21, y - 1, w * 0.42, 2, ridge); R(g, cx - w / 2 - 2, y + ht - 2, 3, 1, col); R(g, cx + w / 2 - 1, y + ht - 2, 3, 1, col); // ridge + upturned corners
}
const bird = (g: G, x: number, y: number, t: number, c = '#f4f6f8') => { const f = Math.sin(t * 8) > 0 ? 1 : 0; R(g, x - 2, y - f, 2, 1, c); R(g, x, y, 1, 1, c); R(g, x + 1, y - f, 2, 1, c); };

export const TRAVEL: Scene[] = [
  { // 锦州 · 笔架山: a rocky island with three peaks like a brush rest, a little temple on top; at low tide the gravel
    //     "sky bridge" path rises out of the sea to it. Beat: the tide falls and the path appears; gulls lift off
    id: 'jinzhou', zh: '锦州 · 笔架山', en: 'Jinzhou · Bijia Mountain', year: 0, top: '#2f6f8f', bot: '#123a52', sand: '#d9c08a', env: { reef: 0.6, kelp: 0.4 }, wipe: 'dither', wipeCol: '#bfe3ef', form: 'plain', beat: { at: 0.38, dur: 6 },
    back(c) {
      const tide = c.bt < 0 ? 0 : ease(c.bt / 3);
      vista(c, 'jinzhou', ['#7fb8e0', '#bfe0f0', '#f4e6c8'], (g, W, H, ax) => {
        hills(g, W, H, 10, 1.2, 0.03, '#8aa9b8', ax * 0.3);
        const pk = (x: number, ht: number, wd: number) => { for (let j = 0; j < ht; j++) { const k = j / ht, hw = wd * Math.pow(k, 0.7) * (0.92 + 0.08 * Math.sin(j * 0.5)); R(g, x - hw, H - ht + j, hw * 2, 1, ((j * 7 + Math.round(hw)) % 11 < 2) ? '#7a7466' : k < 0.35 ? '#5a7a52' : '#6a6a5a'); } };
        pk(ax - 30, H * 0.3, 26); pk(ax + 30, H * 0.32, 24); pk(ax, H * 0.44, 30); R(g, ax - 60, H - 4, 120, 4, '#6a6a5a'); // the three peaks (middle tallest)
        roof(g, ax, H - H * 0.44 - 6, 12, 4, '#b8433a', '#e7b84a'); R(g, ax - 4, H - H * 0.44 - 2, 8, 3, '#e9dcc0');
        R(g, 0, H - 3, W, 3, '#d9c08a'); // the near beach on the left
        for (let x = 0; x < ax - 30; x += 2) R(g, x, H - 2, 2, 2, (x / 2) % 3 ? '#e6d29c' : '#c9ad78');
        if (tide > 0) { g.globalAlpha = tide; for (let x = 0; x < ax - 20; x += 1) R(g, x, H - 1 - Math.round(Math.sin(x * 0.05) * 0.5), 1, 1, (x % 3) ? '#cdbb92' : '#a8987a'); g.globalAlpha = 1; } // the sky bridge path
        for (let i = 0; i < 5; i++) { const fly = tide > 0 ? tide * (20 + i * 8) : 0; bird(g, ax - 40 + i * 14 + fly * 0.6, H * 0.3 + (i % 2) * 6 - fly * 0.5 + Math.sin(c.t + i) * 2, c.t + i); }
      });
      // underwater: a crab walking on the sand, sea grass
      const cx = c.x0 + ((c.t * 6) % c.L), cy = c.floor - 4; R(c.g, cx, cy, 6, 3, '#d9643a'); R(c.g, cx - 2, cy - 2, 2, 2, '#d9643a'); R(c.g, cx + 6, cy - 2, 2, 2, '#d9643a'); for (let k = 0; k < 3; k++) { R(c.g, cx + k * 2, cy + 3, 1, 1 + ((Math.floor(c.t * 6) + k) % 2), '#b8502a'); }
    },
    pose(c) { return c.bt >= 0 && c.bt < 3 ? { slow: 0.5 } : {}; },
  },
  { // 义县 · 奉国寺 + 万佛堂: the great Liao-dynasty wooden hall — nine bays wide, single-eave hip roof, on a stone terrace —
    //     and the grotto cliffs over the Daling River with rows of carved niches. Beat: the bell; the niches glow one by one
    id: 'yixian', zh: '义县 · 奉国寺', en: 'Yixian · Fengguo Temple', year: 0, top: '#3f6a5e', bot: '#1d3a34', sand: '#8a8070', env: { reef: 0.5, kelp: 0.6 }, wipe: 'dither', wipeCol: '#e9d8b0', form: 'plain', beat: { at: 0.4, dur: 7 },
    back(c) {
      const bt = c.bt;
      vista(c, 'yixian', ['#a9c4d4', '#e8dcc4', '#f2e2c0'], (g, W, H, ax) => {
        hills(g, W, H, H * 0.25, 2, 0.02, '#9aa89a', ax * 0.4);
        // the grotto cliff (left), with niches
        const cx = ax - 130; for (let x = cx - 56; x < cx + 50; x += 2) { const k = (x - cx + 56) / 106, top = H * (0.25 + 0.4 * Math.sin(Math.PI * Math.min(1, k * 1.3)) ** 0.5) + Math.sin(x * 0.3) * 2; R(g, x, H - top, 2, top, ((x * 13) % 17 < 3) ? '#a08462' : '#b59a78'); }
        for (let r = 0; r < 3; r++) for (let i = 0; i < 6 - (r === 0 ? 2 : 0); i++) { const nx = cx - 36 + i * 12 + (r === 0 ? 12 : 0), ny = H - H * 0.5 + r * 12, lit = bt > 1 + (r * 6 + i) * 0.22; R(g, nx + 1, ny, 5, 1, lit ? '#f2c870' : '#6a5440'); R(g, nx, ny + 1, 7, 7, lit ? '#f2c870' : '#6a5440'); R(g, nx + 2, ny + 4, 3, 4, lit ? '#c98a3a' : '#4a3a2a'); R(g, nx + 3, ny + 2, 1, 2, lit ? '#c98a3a' : '#4a3a2a'); }
        // the great hall: terrace, ten columns (nine bays), the wide hip roof
        const hw = 64, base = H - 4; R(g, ax - hw - 8, base, hw * 2 + 16, 4, '#9a9488'); R(g, ax - hw - 8, base, hw * 2 + 16, 1, '#c4beb2');
        R(g, ax - hw, base - 14, hw * 2, 14, '#7a3a2a'); for (let i = 0; i <= 9; i++) R(g, ax - hw + i * (hw * 2 / 9) - 1, base - 14, 2, 14, '#5a2a1e');
        for (let i = 0; i < 9; i++) R(g, ax - hw + i * (hw * 2 / 9) + 3, base - 11, hw * 2 / 9 - 6, 6, '#3a2a22');
        R(g, ax - hw - 2, base - 17, hw * 2 + 4, 3, '#8a5a3a'); // brackets
        roof(g, ax, base - 34, hw * 2 + 26, 17, '#5f5e62', '#3f3e42');
        if (bt > 0 && bt < 4) for (let k = 0; k < 3; k++) { const r = ((bt * 30 + k * 18) % 54); g.globalAlpha = (1 - r / 54) * 0.6; for (let a = 0; a < 40; a++) { const an = a / 40 * Math.PI; R(g, ax + Math.cos(an) * r, base - 30 - Math.sin(an) * r * 0.6, 1, 1, '#fff6d8'); } g.globalAlpha = 1; }
      });
      for (let i = 0; i < 4; i++) fish(c.g, c.x0 + ((i * 110 + c.t * 8) % c.L), c.floor - 30 - i * 14, i % 2 ? '#e0703a' : '#f2e2c0', 1); // carp in the river
    },
    pose(c) { return c.bt >= 0 && c.bt < 4 ? { slow: 0.4 } : {}; },
  },
  { // 沈阳 · 故宫: the octagonal Dazheng Hall (double eaves, yellow glazed tiles with green edges, red walls, a gold finial)
    //     with the Ten Kings' Pavilions in two rows before it. Beat: red lanterns light up the rows, pigeons circle the hall
    id: 'shenyang', zh: '沈阳 · 故宫', en: 'Shenyang · Mukden Palace', year: 0, top: '#3a5a7a', bot: '#1a2a40', sand: '#8a7a68', env: { reef: 0.4, kelp: 0.4 }, wipe: 'blinds', wipeCol: '#e0b030', form: 'plain', beat: { at: 0.4, dur: 7 },
    back(c) {
      const bt = c.bt;
      vista(c, 'shenyang', ['#6aa8e0', '#b8d8f0', '#e8f0f4'], (g, W, H, ax) => {
        R(g, 0, H - 22, W, 22, '#a8322a'); R(g, 0, H - 24, W, 3, '#e0b030'); R(g, 0, H - 25, W, 1, '#3a8a5a'); // the red palace wall, yellow coping
        const base = H - 2;
        for (let s = -1; s <= 1; s += 2) for (let i = 0; i < 5; i++) { // Ten Kings' Pavilions, receding
          const x = ax + s * (48 + i * 26), sc = 1.3 - i * 0.1, pw = 14 * sc, ph = 10 * sc;
          R(g, x - pw / 2, base - ph, pw, ph, '#a8322a'); R(g, x - pw / 2 + 2, base - ph + 2, pw - 4, ph - 4, '#7a2a22'); roof(g, x, base - ph - 6 * sc, pw + 6, 6 * sc, '#e0b030', '#3a8a5a');
          if (bt > 0.6 + i * 0.3) { R(g, x - 1, base - ph + 1, 2, 3, '#ff5a3a'); R(g, x - 1, base - ph, 2, 1, '#ffd27a'); }
        }
        // Dazheng Hall: terrace, red octagon body with columns, two eaves, the finial
        R(g, ax - 36, base - 6, 72, 6, '#c4beb2'); R(g, ax - 36, base - 6, 72, 1, '#e4dfd4'); R(g, ax - 24, base - 34, 48, 28, '#a8322a'); for (let i = 0; i < 7; i++) R(g, ax - 23 + i * 7.5, base - 34, 2, 28, '#7a1e18'); R(g, ax - 6, base - 22, 12, 16, '#5a2a1e');
        roof(g, ax, base - 46, 66, 12, '#e0b030', '#3a8a5a'); R(g, ax - 33, base - 35, 66, 1, '#3a8a5a');
        R(g, ax - 15, base - 55, 30, 9, '#a8322a'); roof(g, ax, base - 70, 44, 15, '#e0b030', '#3a8a5a'); R(g, ax - 1, base - 79, 3, 9, '#f2c84a'); disc(g, ax + 1, base - 80, 2, '#f2c84a');
        for (let i = 0; i < 6; i++) { const a = c.t * 1.2 + i, r = bt > 0 ? 40 + i * 3 : 0; if (r) bird(g, ax + Math.cos(a) * r, base - 74 + Math.sin(a) * r * 0.25, c.t + i, '#e8ecf0'); }
      });
      for (let i = 0; i < 6; i++) { const x = c.x0 + 40 + i * 80, y = c.floor - 10; R(c.g, x, y, 10, 10, '#6a6260'); R(c.g, x + 1, y + 1, 8, 1, '#8a8280'); } // fallen palace stones
    },
    pose(c) { return c.bt >= 0 && c.bt < 3.5 ? { slow: 0.4 } : {}; },
  },
  { // 吉林 · 松花湖 / 雾凇: a winter morning on the Songhua: blue mountains, the long Fengman dam, willows white with rime
    //     along the bank, mist breathing off the unfrozen water. Beat: the sun comes up and the rime glitters
    id: 'jilin', zh: '吉林 · 松花湖', en: 'Jilin · Songhua Lake', year: 0, top: '#4a7a94', bot: '#1c3446', sand: '#a8b4bc', env: { reef: 0.3, kelp: 0.3, life: 0.6 }, wipe: 'dither', wipeCol: '#f4f8fb', form: 'plain', beat: { at: 0.36, dur: 7 },
    back(c) {
      const bt = c.bt, sun = bt < 0 ? 0 : ease(bt / 4);
      vista(c, 'jilin', ['#c8d4ec', '#f0d8dc', '#f8e8d8'], (g, W, H, ax) => {
        disc(g, ax + 70, H - 6 - sun * H * 0.4, 7, sun > 0 ? '#ffd8a0' : '#f8dcc0'); if (sun > 0) { g.globalAlpha = 0.25 * sun; disc(g, ax + 70, H - 6 - sun * H * 0.4, 14, '#fff0d0'); g.globalAlpha = 1; }
        hills(g, W, H, H * 0.42, 0.5, 0.012, '#8a9ab8', ax * 0.2); hills(g, W, H, H * 0.28, 2.1, 0.02, '#6a7a98', ax * 0.35);
        const dx = ax - 150; R(g, dx, H - 16, 90, 16, '#b4b8bc'); for (let i = 0; i < 9; i++) R(g, dx + 4 + i * 10, H - 14, 5, 10, '#8a8e94'); R(g, dx, H - 17, 90, 1, '#d4d8dc'); // the dam
        for (let i = 0; i < 9; i++) { // rime trees on the bank
          const tx = ax - 40 + i * 24 + (i % 2) * 5, th = 24 + (i % 3) * 8; R(g, tx, H - th, 2, th, '#5a5a62');
          for (let k = 0; k < 26; k++) { const a = hash(i * 31 + k), b = hash(k * 7 + i), bx = tx + (a - 0.5) * 22, by = H - th + b * th * 0.7; R(g, bx, by, 2, 1, '#ffffff'); R(g, bx, by + 1, 1, Math.round(1 + a * 3), '#e6eef6'); if (sun > 0.3 && (k + Math.floor(c.t * 6)) % 9 === 0) R(g, bx, by - 1, 1, 1, '#fffbe0'); }
        }
        R(g, 0, H - 3, W, 3, '#eef2f6');
        for (let k = 0; k < 4; k++) { g.globalAlpha = 0.18; R(g, ((k * 90 + c.t * 4) % (W + 80)) - 60, H - 8 - k * 3, 70, 3, '#ffffff'); } g.globalAlpha = 1; // mist off the water
      }, 0.38);
      for (let i = 0; i < 3; i++) { const x = c.x0 + 60 + i * 150, wl = Math.round(c.h * wlOf(c) * appear(c)); R(c.g, x, wl, 16, 3, '#eef4fa'); R(c.g, x + 2, wl + 3, 12, 1, '#c8d8e4'); } // drifting ice
    },
    pose(c) { return c.bt >= 0 && c.bt < 4 ? { slow: 0.4 } : {}; },
  },
  { // 长白山 · 天池 (summer): the crater lake ringed by jagged grey-brown peaks with late snow in the gullies, green lower
    //     slopes, the long white waterfall pouring from the northern gap. Beat: the clouds part; a rainbow in the spray
    id: 'changbai', zh: '长白山 · 天池', en: 'Changbai Mountain · Tianchi', year: 0, top: '#1f5f9a', bot: '#0c2a4a', sand: '#6a7a72', env: { reef: 0.3, kelp: 0.2, life: 0.5 }, wipe: 'dither', wipeCol: '#e8f4ff', form: 'plain', beat: { at: 0.38, dur: 7 },
    back(c) {
      const bt = c.bt, part = bt < 0 ? 0 : ease(bt / 3);
      vista(c, 'changbai', ['#5a9ad8', '#a8d0f0', '#dcecf6'], (g, W, H, ax) => {
        const rim = (x0: number, x1: number, peak: number, seed: number) => { for (let x = x0; x < x1; x += 2) { const k = (x - x0) / (x1 - x0), hh = H * peak * Math.sin(Math.PI * k) ** 0.7 * (0.78 + 0.12 * Math.sin(x * 0.09 + seed) + 0.1 * Math.sin(x * 0.23 + seed * 2)) + 6; for (let y = 0; y < hh; y++) { const fromTop = y / hh; R(g, x, H - hh + y, 2, 1, fromTop < 0.06 ? '#9a8a78' : fromTop > 0.7 ? (fromTop > 0.85 ? '#4a7a3e' : '#5f8f4a') : (Math.abs(((x * 0.5 + y) % 19) - 9) < 1 && fromTop < 0.45) ? '#eef2f6' : fromTop < 0.4 ? '#7d6e62' : '#8a7a62'); } } };
        rim(ax - 170, ax - 20, 0.75, 1); rim(ax + 30, ax + 190, 0.7, 4); rim(ax - 30, ax + 40, 0.35, 7);
        const fx = ax + 8; for (let y = H * 0.55; y < H; y++) R(g, fx + Math.round(Math.sin(y * 0.3 + c.t * 8) * 0.6), y, 3, 1, (Math.floor(y + c.t * 30) % 4) ? '#ffffff' : '#cfe6f6'); // the falls
        if (part > 0) { const cols = ['#e05a5a', '#f2a33a', '#f2e05a', '#5ab86a', '#5a8ad9']; g.globalAlpha = 0.35 * part; cols.forEach((col, i) => { for (let a = 0; a < 24; a++) { const an = Math.PI * a / 24; R(g, fx + 1 + Math.cos(an) * (14 + i), H - 2 - Math.sin(an) * (10 + i), 1, 1, col); } }); g.globalAlpha = 1; }
        for (let k = 0; k < 5; k++) { const x = (k * 70 + c.t * 3) % (W + 60) - 30, y = H * (0.15 + (k % 3) * 0.12); g.globalAlpha = 0.85 * (1 - part * 0.85); for (let j = 0; j < 4; j++) R(g, x - j * 4 + (j % 2) * 3, y + j * 2, 28 + j * 6, 3, '#ffffff'); g.globalAlpha = 1; } // clouds part in the beat
      }, 0.4);
      for (let i = 0; i < 18; i++) R(c.g, c.x0 + hash(i) * c.L, c.floor - 2 - hash(i + 3) * 4, 3, 2, shade('#6a7a72', hash(i) > 0.5 ? 0.15 : -0.15)); // volcanic pebbles
    },
    pose(c) { return c.bt >= 0 && c.bt < 3.5 ? { slow: 0.4 } : {}; },
  },
  { // 长春 · 南湖: home. Dusk over South Lake: the arched bridge, willows, lotus leaves on the water, the city skyline with
    //     the TV tower; a little rowboat with the pixel cat and pig. Beat: the city lights come on, the two wave, hearts rise
    id: 'changchun', zh: '长春 · 南湖', en: 'Changchun · South Lake', year: 0, top: '#3a3a6a', bot: '#141a34', sand: '#5a5a62', env: { reef: 0.4, kelp: 0.5, life: 0.5 }, wipe: 'dither', wipeCol: '#f8d8a8', form: 'plain', beat: { at: 0.4, dur: 8 },
    back(c) {
      const bt = c.bt, lit = bt < 0 ? 0 : ease(bt / 2.5);
      vista(c, 'changchun', ['#3a3a7a', '#b86a8a', '#f2a86a'], (g, W, H, ax) => {
        const sk = ax - 60;
        for (let i = 0; i < 22; i++) { const bw = 8 + hash(i) * 10, bh = 12 + hash(i + 7) * 34, x = sk - 120 + i * 13; R(g, x, H - bh - 6, bw, bh, '#4a3a5a'); for (let k = 0; k < 6; k++) if (hash(i * 9 + k) < lit * 0.8) R(g, x + 2 + (k % 2) * 4, H - bh - 2 + Math.floor(k / 2) * 5, 2, 2, '#ffd890'); }
        const tx = sk + 150; R(g, tx, H - 70, 3, 64, '#4a3a5a'); R(g, tx - 5, H - 52, 13, 4, '#4a3a5a'); R(g, tx - 3, H - 56, 9, 4, '#4a3a5a'); R(g, tx + 1, H - 80, 1, 10, '#4a3a5a'); if (lit > 0) R(g, tx + 1, H - 80, 1, 1, Math.floor(c.t * 2) % 2 ? '#ff5a5a' : '#4a3a5a'); // TV tower
        const bx = ax + 10; for (let a = 0; a < 3; a++) { const x0 = bx + a * 30; for (let x = 0; x < 30; x++) { const y = Math.round(Math.sin(Math.PI * x / 30) * 8); R(g, x0 + x, H - 6 - y - 3, 1, 3, '#d8c8b8'); R(g, x0 + x, H - 6 - y, 1, y + 6 - 6 >= 0 ? 0 : 0, '#d8c8b8'); } R(g, x0, H - 9, 2, 9, '#d8c8b8'); } R(g, bx, H - 18, 90, 1, '#d8c8b8'); for (let i = 0; i < 10; i++) if (lit > 0) R(g, bx + i * 10, H - 20, 1, 2, '#ffd890'); // bridge
        for (let i = 0; i < 4; i++) { const wx = ax - 150 + i * 16; R(g, wx, H - 30, 2, 30, '#3a4a3a'); for (let k = 0; k < 10; k++) R(g, wx - 6 + k * 1.4, H - 28 + Math.abs(k - 5) * 2 + Math.sin(c.t + k) * 1, 1, 10 - Math.abs(k - 5), '#4a6a4a'); }
      }, 0.42);
      const { g, h, t } = c, wl = Math.round(h * wlOf(c) * appear(c));
      for (let i = 0; i < 8; i++) { const x = c.x0 + 40 + i * 55 + Math.sin(i) * 10; R(g, x, wl - 1, 8, 2, '#4a7a4a'); R(g, x + 3, wl + 1, 1, 22 + (i % 3) * 8, '#3a5a3a'); if (i % 3 === 0) { R(g, x + 2, wl - 4, 4, 3, '#f4b6c2'); R(g, x + 3, wl - 5, 2, 1, '#ffffff'); } } // lotus
      // the rowboat with the cat and the pig, drifting along the surface
      if (appear(c) > 0.6) {
        const bx = c.x0 + c.L * 0.55 + Math.sin(t * 0.3) * 10, by = wl - 6 + Math.round(Math.sin(t * 1.5));
        const cat = frameAt(catSprites().idle, t), pig = frameAt(pigSprites().idle, t + 1);
        draw(g, cat, bx + 2, by - 12 - (bt > 2.6 && Math.sin(t * 6) > 0 ? 1 : 0)); draw(g, pig, bx + 16, by - 12 - (bt > 2.8 && Math.sin(t * 6 + 1) > 0 ? 1 : 0), true);
        R(g, bx - 2, by + 2, 38, 3, '#8a5a3a'); R(g, bx, by + 5, 34, 2, '#6a4a2a'); R(g, bx - 2, by + 1, 38, 1, '#a87a4a');
        if (bt > 3) for (let k = 0; k < 5; k++) { const yy = by - 18 - ((t * 10 + k * 12) % 50); g.globalAlpha = clamp(1 - ((t * 10 + k * 12) % 50) / 50); R(g, bx + 16 + Math.sin(t + k) * 8, yy, 2, 1, '#f4b6c2'); R(g, bx + 19 + Math.sin(t + k) * 8, yy, 2, 1, '#f4b6c2'); R(g, bx + 15 + Math.sin(t + k) * 8, yy + 1, 7, 2, '#f4b6c2'); R(g, bx + 16 + Math.sin(t + k) * 8, yy + 3, 5, 1, '#f4b6c2'); R(g, bx + 17 + Math.sin(t + k) * 8, yy + 4, 3, 1, '#f4b6c2'); g.globalAlpha = 1; }
      }
    },
    pose(c) { return c.bt >= 0 && c.bt < 4 ? { slow: 0.35 } : {}; },
  },
];
export { SW, SH };

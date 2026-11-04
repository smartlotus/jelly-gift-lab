// The hammerhead (v03b: ~1.8x the v03 size), in the meadow's pixel language: soft-black outline, sleepy closed eyes, blush.
// Side view facing right; the hammer is drawn as a tall bar at the front with an eye at each tip so it reads at 1x.
// Built from simple shapes into string art. FORMS = the shark's costume per film (part of the sprite, so it bends with
// the body); `post` layers (veil, cane, katana, glass) go on after the outline. 8 swim frames: a travelling body wave
// that grows towards the tail + a pectoral flutter.
import { anim, outline, type Anim, type Palette } from '../../shared/pixel/sprite';

const BASE: Palette = {
  k: '#2E2A2B', d: '#6C7B8A', g: '#8D9CAB', l: '#AEBBC7', w: '#EEF1F3', b: '#F7A3B6',
  K: '#1c1a22', W: '#f7f5f0', r: '#b8434e', R: '#7e2a33', y: '#e7b84a', o: '#b8892a', m: '#b9c2cc', M: '#7d8794',
  t: '#ece6d6', T: '#b9b2a2', v: '#5f6b3e', V: '#3e4729', c: '#c4a57a', C: '#8f744f', h: '#3a2b25', p: '#f4b6c2', P: '#e58aa0',
  s: '#dfe4ea', n: '#2b3440', e: 'rgba(255,255,255,.82)', E: '#ffffff', '1': '#4d7bd9', '2': '#d9434e', '3': '#47b36b', '4': '#a35ad9', '5': '#f1c232', '6': '#f08a3c',
  Y: '#f2c230', j: '#f7d75a', J: '#c99a1e', u: '#ffe07a', q: '#e0c9a8',
};
export type Form = 'plain' | 'baron' | 'thief' | 'endgame' | 'busan' | 'raccoon' | 'bill' | 'mad' | 'drama' | 'still';
type Put = (x: number, y: number, c: string) => void;
const GW = 60, GH = 40, CY = 22;
export const SW = GW + 2, SH = GH + 2; // frame size after outline
/** anchors in frame (outlined) coordinates */
export const AT = { nose: { x: 54, y: CY + 1 }, mouth: { x: 52, y: CY + 4 }, fin: { x: 26, y: CY + 13 }, headTop: { x: 49, y: CY - 10 }, back: { x: 30, y: CY - 6 }, mid: { x: 30, y: CY + 1 } };

function grid() { return Array.from({ length: GH }, () => Array<string>(GW).fill('.')); }
function tri(put: Put, a: number[], b: number[], c: number[], ch: string) {
  const minx = Math.floor(Math.min(a[0], b[0], c[0])), maxx = Math.ceil(Math.max(a[0], b[0], c[0])), miny = Math.floor(Math.min(a[1], b[1], c[1])), maxy = Math.ceil(Math.max(a[1], b[1], c[1]));
  for (let y = miny; y <= maxy; y++) for (let x = minx; x <= maxx; x++) {
    const s = (p: number[], q: number[]) => (x + .5 - q[0]) * (p[1] - q[1]) - (p[0] - q[0]) * (y + .5 - q[1]);
    const d1 = s(a, b), d2 = s(b, c), d3 = s(c, a); if (!((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0))) put(x, y, ch);
  }
}
const rect = (put: Put, x: number, y: number, w: number, h: number, c: string) => { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) put(x + i, y + j, c); };
const half = (x: number) => { const u = (x - 5) / 40; return 1.2 + 6.8 * (u < 0.55 ? Math.sin((Math.PI / 2) * u / 0.55) ** 0.8 : 1 - 0.35 * ((u - 0.55) / 0.45) ** 1.5); };
const isBody = (x: number, y: number) => x >= 5 && x <= 45 && y >= Math.round(CY - half(x)) && y <= Math.round(CY + half(x) * 0.85);

function body(put: Put, flap: number) {
  tri(put, [11, CY - 2], [1, CY - 14], [6, CY], 'd'); tri(put, [11, CY + 2], [3, CY + 9], [6, CY], 'd'); // caudal fin
  for (let x = 5; x <= 45; x++) { const hh = half(x), top = Math.round(CY - hh), bot = Math.round(CY + hh * 0.85); for (let y = top; y <= bot; y++) put(x, y, y <= top ? 'd' : y > CY + 0.5 ? 'w' : (y === top + 2 && x > 13 && x < 39) ? 'l' : 'g'); }
  tri(put, [21, CY - 6], [27, CY - 17], [32, CY - 6], 'd'); tri(put, [23, CY - 6], [27, CY - 15], [29, CY - 6], 'g'); // tall first dorsal
  tri(put, [12, CY - 3], [14, CY - 7], [17, CY - 3], 'd');
  tri(put, [29, CY + 4], [24 - flap, CY + 12 + flap], [35, CY + 5], 'd'); // pectoral (flutters)
  tri(put, [17, CY + 4], [16, CY + 7], [20, CY + 4], 'd');
  for (let y = CY - 11; y <= CY + 11; y++) for (let x = 45; x <= 51; x++) { if (Math.abs(y - CY) >= 10 && (x === 45 || x === 51)) continue; put(x, y, x >= 50 || y > CY + 1 ? 'w' : y === CY - 11 ? 'd' : 'g'); }
  for (let y = CY - 2; y <= CY + 2; y++) put(52, y, 'w');
  for (const s of [-1, 1]) { const ey = CY + s * 8; put(47, ey, 'k'); put(48, ey + (s < 0 ? 1 : -1) * -1 + (s < 0 ? 0 : 0), 'k'); put(49, ey, 'k'); put(48, ey + 1, 'k'); }
  put(42, CY + 2, 'b'); put(43, CY + 2, 'b'); put(51, CY + 3, 'k'); put(50, CY + 4, 'k');
  for (const gx of [38, 40]) for (let y = CY - 2; y <= CY + 1; y++) put(gx, y, 'd');
}
// costumes: `pre` is part of the body (bends + gets outlined); `post` sits on top after the outline (frame coords)
const FORMS: Record<Form, { pal?: Record<string, string>; pre?: (put: Put, f: number) => void; post?: (put: Put, f: number) => void }> = {
  plain: {},
  baron: { // The Cat Returns: cat ears, top hat with a red band, red bow tie; a cane in the fin
    pre(put) { tri(put, [35, CY - 5], [36, CY - 12], [40, CY - 6], 'g'); tri(put, [40, CY - 6], [43, CY - 12], [44, CY - 5], 'g'); put(37, CY - 8, 'p'); put(42, CY - 8, 'p');
      rect(put, 44, CY - 12, 9, 1, 'K'); rect(put, 46, CY - 18, 5, 6, 'K'); rect(put, 46, CY - 14, 5, 1, 'r');
      rect(put, 41, CY + 4, 2, 3, 'r'); put(43, CY + 5, 'R'); rect(put, 44, CY + 4, 2, 3, 'r'); },
    post(put, f) { const x = 26 + (f % 4 < 2 ? 0 : 1); for (let y = CY + 12; y <= CY + 19; y++) put(x, y, 'h'); put(x + 1, CY + 11, 'y'); put(x + 2, CY + 11, 'y'); put(x + 2, CY + 12, 'y'); },
  },
  thief: { // Once a Thief: black tie — tux over the back, white shirt front, bow tie, a red rose
    pre(put) { for (let x = 18; x <= 45; x++) for (let y = 0; y < GH; y++) if (isBody(x, y) && y <= CY) put(x, y, 'K'); for (let y = CY - 3; y <= CY + 5; y++) for (let x = 40; x <= 45; x++) if (isBody(x, y) && x - 40 >= (CY + 5 - y) * 0.5) put(x, y, 'W');
      rect(put, 43, CY + 3, 1, 3, 'K'); rect(put, 45, CY + 3, 1, 3, 'K'); put(44, CY + 4, 'K'); put(36, CY - 2, 'r'); put(37, CY - 1, 'r'); put(36, CY - 1, 'R'); },
    post(put) { const x = 23, y = CY + 12; rect(put, x, y, 4, 3, 'r'); rect(put, x, y - 1, 4, 1, 's'); put(x + 1, y + 3, 's'); put(x + 2, y + 3, 's'); put(x + 1, y + 4, 's'); put(x + 2, y + 4, 's'); rect(put, x, y + 5, 4, 1, 's'); },
  },
  endgame: { // Endgame: red-and-gold armour plates along the back, a gilded gauntlet with six stones on the fin
    pre(put) { for (let x = 26; x <= 42; x++) for (let y = 0; y < GH; y++) if (isBody(x, y) && y <= CY - 2) put(x, y, (x + y) % 6 === 0 ? 'y' : 'r'); for (let x = 26; x <= 42; x++) put(x, Math.round(CY - half(x)) + 1, 'y'); rect(put, 33, CY - 1, 4, 3, 'm'); put(34, CY, 's'); put(35, CY, 's'); },
    post(put, f) { const fl = f % 4 < 2 ? 0 : 1, x = 23 - fl, y = CY + 11 + fl; rect(put, x, y, 6, 5, 'y'); rect(put, x, y + 4, 6, 1, 'o'); put(x + 1, y + 1, '1'); put(x + 3, y + 1, '2'); put(x + 5, y + 1, '3'); put(x + 1, y + 3, '4'); put(x + 3, y + 3, '5'); put(x + 5, y + 3, '6'); },
  },
  busan: { // Train to Busan: shirt sleeve rolled, the fin bound in white tape like a forearm guard; a loosened tie
    pre(put, f) { const fl = f % 4 < 2 ? 0 : 1; for (let i = 0; i < 9; i++) { const x = 33 - i, y = CY + 5 + Math.round(i * 0.8) + (i > 5 ? fl : 0); if (i % 2 === 0) { put(x, y, 't'); put(x, y + 1, 'T'); } } rect(put, 30, CY + 3, 6, 1, 'W');
      for (let y = CY + 3; y <= CY + 8; y++) put(44 - Math.floor((y - CY - 3) / 3), y, '1'); },
  },
  raccoon: { // Resident Evil: courier in a tactical vest (pouches, straps), red cap, the parcel strapped on
    pre(put) { for (let x = 24; x <= 41; x++) for (let y = 0; y < GH; y++) if (isBody(x, y)) put(x, y, (x === 29 || x === 36) ? 'V' : 'v'); rect(put, 26, CY + 1, 3, 3, 'V'); rect(put, 31, CY + 1, 3, 3, 'V'); rect(put, 37, CY + 1, 3, 3, 'V');
      rect(put, 45, CY - 13, 6, 2, 'r'); rect(put, 51, CY - 12, 3, 1, 'r'); rect(put, 13, CY - 11, 8, 6, 'c'); rect(put, 13, CY - 9, 8, 1, 'C'); rect(put, 16, CY - 11, 1, 6, 'C'); put(17, CY - 8, '2'); },
  },
  bill: { // Kill Bill: the yellow suit with the black stripe down the side; a katana slung across the back
    pal: { g: '#f2c230', l: '#ffe07a', d: '#c99a1e', w: '#f7d75a' },
    pre(put) { for (let x = 7; x <= 45; x++) { put(x, CY - 1, 'K'); put(x, CY, 'K'); } },
    post(put) { for (let i = 0; i < 30; i++) put(12 + i, CY - 11 + Math.round(i * 0.18), 's'); for (let i = 0; i < 6; i++) put(42 + i, CY - 6 + Math.round(i * 0.18), 'K'); put(41, CY - 7, 'y'); put(41, CY - 5, 'y'); },
  },
  mad: { // Mad Detective: a long tan trench coat with a belt and collar, a brown hat
    pre(put) { for (let x = 12; x <= 43; x++) for (let y = 0; y < GH; y++) if (isBody(x, y) && y < Math.round(CY + half(x) * 0.85)) put(x, y, x === 30 ? 'C' : (y === CY + 1 ? 'C' : 'c')); for (let y = CY - 5; y <= CY + 4; y++) { put(41, y, 'C'); put(42, y, 'q'); } put(36, CY - 2, 'h'); put(36, CY + 3, 'h');
      rect(put, 44, CY - 12, 9, 1, 'h'); rect(put, 46, CY - 15, 5, 3, 'C'); rect(put, 46, CY - 13, 5, 1, 'h'); },
  },
  drama: { // The Drama: a flower crown and a long veil flowing back over the body
    pre(put) { const fl = ['p', 'W', 'P', 'p', 'W', 'P', 'p']; fl.forEach((c, i) => { put(45 + i, CY - 12, c); if (i % 2) put(45 + i, CY - 13, '3'); }); },
    post(put, f) { const sw = [0, 1, 1, 0, 0, -1, -1, 0][f]; for (let i = 0; i < 22; i++) { const x = 47 - i, y0 = CY - 11 + Math.round(i * 0.35), len = 2 + Math.round(i * 0.42) + (i > 10 ? sw : 0); for (let j = 0; j < len; j++) put(x, y0 + j, j === len - 1 && i % 2 ? 'E' : 'e'); } },
  },
  still: { // Still Life: plain and calm; only a narrow dark tie
    pal: { g: '#8a98a6', l: '#a7b3be' },
    pre(put) { for (let y = CY + 3; y <= CY + 9; y++) put(44, y, 'n'); put(43, CY + 4, 'n'); put(45, CY + 4, 'n'); },
  },
};
function frame(form: Form, f: number): string[] {
  const g = grid(), put: Put = (x, y, c) => { x = Math.round(x); y = Math.round(y); if (x >= 0 && x < GW && y >= 0 && y < GH) g[y][x] = c; };
  const flap = [0, 1, 1, 0, -1, -1, 0, 0][f], F = FORMS[form];
  body(put, flap); F.pre?.(put, f);
  // the swim: each column shifts by a wave that travels from head to tail and grows towards the tail
  const ph = (f / 8) * Math.PI * 2, bent = grid();
  for (let x = 0; x < GW; x++) { const k = Math.max(0, (46 - x) / 46), dy = Math.round(2.6 * k ** 2.2 * Math.sin(ph - x * 0.09)); for (let y = 0; y < GH; y++) { const yy = y + dy; if (yy >= 0 && yy < GH && g[y][x] !== '.') bent[yy][x] = g[y][x]; } }
  let rows = outline(bent.map(r => r.join('')));
  if (F.post) { const g2 = rows.map(r => [...r]); F.post((x, y, c) => { x = Math.round(x) + 1; y = Math.round(y) + 1; if (y >= 0 && y < g2.length && x >= 0 && x < g2[0].length) g2[y][x] = c; }, f); rows = g2.map(r => r.join('')); }
  return rows;
}
const cache = new Map<Form, Anim>();
export const sharkForm = (form: Form): Anim => { let a = cache.get(form); if (!a) { a = anim([0, 1, 2, 3, 4, 5, 6, 7].map(f => frame(form, f)), { ...BASE, ...(FORMS[form].pal ?? {}) }, 10); cache.set(form, a); } return a; };
export const sharkRows = frame; // for tools (ASCII previews)

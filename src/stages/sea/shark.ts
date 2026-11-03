// The hammerhead, in the meadow's pixel language (soft-black outline, sleepy closed eyes, blush). Side view facing right,
// with the hammer drawn as a vertical bar at the front (eyes at both tips) so it reads as a hammerhead at 1x.
// Generated from simple shapes into string art, then outlined, so it stays editable. 4 swim frames (tail sweep).
import { anim, outline, type Anim, type Palette } from '../../shared/pixel/sprite';

export const SHARK_PAL: Palette = { k: '#2E2A2B', g: '#8D9CAB', d: '#6C7B8A', w: '#EEF1F3', b: '#F7A3B6' };
export const SW = 32, SH = 20; // frame size after outline

export function frame(tail: number): string[] {
  const W = 30, H = 18, g: string[][] = Array.from({ length: H }, () => Array<string>(W).fill('.'));
  const put = (x: number, y: number, c: string) => { x = Math.round(x); y = Math.round(y); if (x >= 0 && x < W && y >= 0 && y < H) g[y][x] = c; };
  const tri = (a: number[], b: number[], c: number[], ch: string) => {
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const s = (p: number[], q: number[]) => (x + .5 - q[0]) * (p[1] - q[1]) - (p[0] - q[0]) * (y + .5 - q[1]);
      const d1 = s(a, b), d2 = s(b, c), d3 = s(c, a); if (!((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0))) put(x, y, ch);
    }
  };
  const cy = 9;
  // tail (caudal fin): long upper lobe, short lower lobe; sweeps with `tail`
  tri([6, cy - 1], [0, cy - 7 + tail], [3, cy], 'd'); tri([6, cy + 1], [1, cy + 5 + tail], [3, cy], 'd');
  // body: tapered spindle
  for (let x = 3; x <= 24; x++) {
    const u = (x - 3) / 21, half = 0.8 + 3.6 * Math.sin(Math.PI * Math.min(1, u * 0.9 + 0.08)) ** 0.8;
    for (let y = Math.round(cy - half); y <= Math.round(cy + half * 0.85); y++) put(x, y, y > cy + 0.5 ? 'w' : 'g');
  }
  tri([11, cy - 3], [14, cy - 9], [17, cy - 3], 'd'); // dorsal fin, tall (hammerheads have a tall first dorsal)
  tri([5, cy - 1], [6, cy - 3], [8, cy - 1], 'd');    // small second dorsal
  tri([15, cy + 2], [13, cy + 6], [19, cy + 3], 'd'); // pectoral fin
  // the hammer: vertical bar at the front, rounded ends
  for (let y = cy - 6; y <= cy + 6; y++) for (let x = 24; x <= 27; x++) { const e = Math.abs(y - cy) >= 6 && (x === 24 || x === 27); if (!e) put(x, y, x === 27 || y > cy + 1 ? 'w' : 'g'); }
  for (let y = cy - 1; y <= cy + 1; y++) put(28, y, 'w');
  // sleepy closed eyes at both tips, blush behind the head, a tiny smile
  put(25, cy - 4, 'k'); put(26, cy - 4, 'k'); put(25, cy + 4, 'k'); put(26, cy + 4, 'k');
  put(22, cy + 1, 'b'); put(23, cy + 1, 'b'); put(26, cy + 2, 'k');
  // gill slits
  put(20, cy - 1, 'd'); put(20, cy + 1, 'd'); put(19, cy, 'd');
  return outline(g.map(r => r.join('')));
}
let cache: Anim | null = null;
export const sharkSwim = () => cache ??= anim([frame(0), frame(1), frame(0), frame(-1)], SHARK_PAL, 6);
/** hammer tip (eye) and fin positions inside the frame, for costumes */
export const AT = { headTop: { x: 25, y: 3 }, headBot: { x: 25, y: 15 }, nose: { x: 30, y: 10 }, fin: { x: 15, y: 15 }, dorsal: { x: 15, y: 2 }, back: { x: 9, y: 6 }, body: { x: 6, y: 6, w: 19, h: 9 } };

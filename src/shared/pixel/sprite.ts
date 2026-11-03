// Sprites authored as string art + palette (one char = one pixel, '.' = transparent), rasterised once to canvases.
// Diff-friendly and editable by any agent; tools/pixel/sheet.ts dumps every sheet to PNG (review/sprites/) for review.
export type Palette = Record<string, string>;
export function raster(rows: string[], pal: Palette): HTMLCanvasElement {
  const h = rows.length, w = Math.max(...rows.map(r => r.length));
  const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d')!;
  rows.forEach((r, y) => { for (let x = 0; x < r.length; x++) { const col = pal[r[x]]; if (col) { g.fillStyle = col; g.fillRect(x, y, 1, 1); } } });
  return c;
}
export interface Anim { frames: HTMLCanvasElement[]; fps: number; loop?: boolean }
export const anim = (frames: string[][], pal: Palette, fps = 8, loop = true): Anim => ({ frames: frames.map(f => raster(f, pal)), fps, loop });
export function frameAt(a: Anim, t: number) { const i = Math.floor(t * a.fps); return a.frames[a.loop === false ? Math.min(i, a.frames.length - 1) : i % a.frames.length]; }
/** draw at integer coords; flip = face left. ox/oy = pivot (feet centre) offsets */
export function draw(g: CanvasRenderingContext2D, img: CanvasImageSource & { width: number; height: number }, x: number, y: number, flip = false) {
  x = Math.round(x); y = Math.round(y);
  if (!flip) { g.drawImage(img, x, y); return; }
  g.save(); g.translate(x + img.width, y); g.scale(-1, 1); g.drawImage(img, 0, 0); g.restore();
}

// ---- authoring helpers (pure string ops: usable from node tools too) ----
/** a layer of string art placed at (dx, dy) inside a frame */
export interface Layer { rows: string[]; dx?: number; dy?: number }
/** overlay layers (later layers win, '.' and ' ' are transparent) into a w x h frame */
export function compose(w: number, h: number, ...layers: Layer[]): string[] {
  const g = Array.from({ length: h }, () => Array<string>(w).fill('.'));
  for (const l of layers) l.rows.forEach((r, y) => { for (let x = 0; x < r.length; x++) { const c = r[x], X = x + (l.dx ?? 0), Y = y + (l.dy ?? 0); if (c !== '.' && c !== ' ' && X >= 0 && X < w && Y >= 0 && Y < h) g[Y][X] = c; } });
  return g.map(r => r.join(''));
}
/** mirror string art horizontally */
export const mirror = (rows: string[]) => rows.map(r => [...r].reverse().join(''));
/** add a 1px outline of char `k` around every opaque pixel (grows the art by 1px on each side) */
export function outline(rows: string[], k = 'k'): string[] {
  const h = rows.length + 2, w = Math.max(...rows.map(r => r.length)) + 2;
  const at = (x: number, y: number) => { const r = rows[y - 1]; const c = r?.[x - 1]; return c !== undefined && c !== '.' && c !== ' '; };
  const out: string[] = [];
  for (let y = 0; y < h; y++) { let s = ''; for (let x = 0; x < w; x++) s += at(x, y) ? rows[y - 1][x - 1] : (at(x - 1, y) || at(x + 1, y) || at(x, y - 1) || at(x, y + 1)) ? k : '.'; out.push(s); }
  return out;
}
/** recolour: map chars (e.g. palette swaps for a sleepy / tinted variant) */
export const recolor = (rows: string[], map: Record<string, string>) => rows.map(r => [...r].map(c => map[c] ?? c).join(''));
/** one-off: a canvas with a sprite pre-tinted to a flat colour (silhouettes, flashes) */
export function silhouette(src: HTMLCanvasElement, colour: string): HTMLCanvasElement {
  const c = document.createElement('canvas'); c.width = src.width; c.height = src.height; const g = c.getContext('2d')!;
  g.drawImage(src, 0, 0); g.globalCompositeOperation = 'source-in'; g.fillStyle = colour; g.fillRect(0, 0, c.width, c.height); return c;
}

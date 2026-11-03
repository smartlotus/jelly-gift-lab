// Sprites authored as string art + palette (one char = one pixel, '.' = transparent), rasterised once to canvases.
// Diff-friendly and editable by any agent; tools can dump sheets to PNG for review.
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

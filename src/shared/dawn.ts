// The night → dawn → morning hand-off between /sky/ (real stars) and /coop/ (pixel meadow). Both pages draw the SAME
// low-resolution pixel frame with drawDawn(), so leaving the sky and arriving in the meadow is one continuous picture:
// /sky/ lowers its eyes to the horizon, pixelates, and settles into drawDawn(k ≈ 0.35); /coop/ opens on that exact frame
// (?hz = horizon height as a fraction of the screen), lets the dawn finish (k → 1 = the level's own day palette) and
// dissolves into the game with an ordered dither. Colours are banded (no smooth gradients) so it reads as pixel art.
const C = (h: string) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const mix = (a: number[], b: number[], k: number) => a.map((v, i) => v + (b[i] - v) * k);
const rgb = (c: number[]) => `rgb(${c.map(v => Math.round(v)).join(',')})`;
// key frames: night (k=0) · dawn (k=.5) · morning = the coop level's sky (k=1)
const TOP = [C('#05070d'), C('#2a2f5c'), C('#46B5FF')], HOR = [C('#0e1626'), C('#f0a57c'), C('#A6E1FF')];
const HILL = [C('#060a0c'), C('#2f4a4a'), C('#4CBF5A')], HILL2 = [C('#04070a'), C('#22383b'), C('#36A048')], GROUND = [C('#030507'), C('#26302a'), C('#3d8f47')];
const key = (arr: number[][], k: number) => k <= 0.5 ? mix(arr[0], arr[1], k / 0.5) : mix(arr[1], arr[2], (k - 0.5) / 0.5);
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
/** ordered-dither threshold (0..1) for a logical pixel */
export const bayer = (x: number, y: number) => (BAYER[(y & 3) * 4 + (x & 3)] + 0.5) / 16;

/** draw the pixel horizon at logical size w x h; hz = horizon y fraction; k = 0 night … 1 morning; t = seconds (twinkle) */
export function drawDawn(g: CanvasRenderingContext2D, w: number, h: number, hz: number, k: number, t = 0) {
  const hy = Math.round(h * hz), top = key(TOP, k), hor = key(HOR, k), bands = 9;
  for (let i = 0; i < bands; i++) { // banded sky: 9 flat steps from zenith to horizon
    const y0 = Math.round((hy * i) / bands), y1 = Math.round((hy * (i + 1)) / bands), f = Math.pow((i + 0.5) / bands, 1.6);
    g.fillStyle = rgb(mix(top, hor, f)); g.fillRect(0, y0, w, y1 - y0);
  }
  // stars fade as the dawn comes (deterministic positions)
  const sa = Math.max(0, 1 - k * 2.2);
  if (sa > 0) for (let i = 0; i < 70; i++) {
    const x = (i * 97.13 + 13) % w | 0, y = ((i * 57.7) % (hy * 0.9)) | 0, tw = 0.6 + 0.4 * Math.sin(t * 2 + i);
    g.fillStyle = `rgba(236,232,223,${(sa * tw * (i % 5 === 0 ? 1 : 0.55)).toFixed(3)})`; g.fillRect(x, y, 1, 1);
  }
  // two rows of stepped hills (the meadow's skyline), then the earth
  const hill = (col: number[], amp: number, base: number, ph: number, sc: number) => {
    g.fillStyle = rgb(col);
    for (let x = 0; x < w; x += 2) { const hh = Math.round(base + amp * (0.5 + 0.5 * Math.sin(x * sc + ph)) * (0.6 + 0.4 * Math.sin(x * sc * 0.37 + ph * 2))); g.fillRect(x, hy - hh, 2, hh + 1); }
  };
  hill(key(HILL2, k), h * 0.07, h * 0.02, 1.3, 0.045);
  hill(key(HILL, k), h * 0.045, 0, 4.1, 0.07);
  g.fillStyle = rgb(key(GROUND, k)); g.fillRect(0, hy, w, h - hy);
}
/** logical height of the hand-off frame (both pages use it, so the pixels match) */
export const DAWN_LINES = 150;

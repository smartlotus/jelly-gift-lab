// Crisp hinged door — integer slices only (path fills anti-alias and look like a snap when upscaled).
export function swingDoor(
  g: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  open: number, lit: boolean,
) {
  x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
  const o = Math.max(0, Math.min(1, open));
  g.fillStyle = '#3A322C';
  g.fillRect(x - 2, y - 1, w + 4, h + 1);
  g.fillStyle = '#2A2420';
  g.fillRect(x, y, w, h);
  if (o > 0.02) {
    const warm = 0.35 + 0.65 * o;
    g.fillStyle = lit
      ? `rgb(${Math.round(80 + 175 * warm)},${Math.round(70 + 160 * warm)},${Math.round(48 + 128 * warm)})`
      : '#3A3228';
    g.fillRect(x + 1, y + 1, w - 2, h - 2);
  }
  const ang = o * Math.PI * 0.46;
  const vis = Math.max(o > 0.94 ? 2 : 3, Math.round(w * Math.cos(ang)));
  const skew = Math.round(Math.sin(ang) * Math.min(14, Math.round(h * 0.24)));
  for (let i = 0; i < vis; i++) {
    const t = vis <= 1 ? 0 : i / (vis - 1);
    const top = y + Math.round(skew * t);
    g.fillStyle = i === vis - 1 ? '#8A6A40' : (i < 2 ? '#A88858' : (i % 6 === 3 ? '#B89860' : '#C4A06A'));
    g.fillRect(x + i, top, 1, h - (top - y));
  }
  if (vis > 8) {
    g.fillStyle = '#A88858';
    const top = y + Math.round(skew * (3 / Math.max(1, vis - 1)));
    g.fillRect(x + 3, top + 6, vis - 6, 1);
    g.fillRect(x + 3, y + Math.round(h * 0.48), vis - 6, 1);
  }
  if (o < 0.14 && vis > 10) {
    g.fillStyle = '#8A6A40';
    g.fillRect(x + vis - 6, y + Math.round(h * 0.55), 3, 4);
  }
}

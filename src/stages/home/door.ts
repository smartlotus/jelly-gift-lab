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
  if (o > 0.001) {
    // Always a warm interior once any gap exists — never a black pit.
    const warm = lit ? (0.62 + 0.38 * o) : (0.42 + 0.22 * o);
    g.fillStyle = `rgb(${Math.round(78 + 177 * warm)},${Math.round(58 + 152 * warm)},${Math.round(32 + 118 * warm)})`;
    g.fillRect(x, y, w, h);
    // brighter inner glow so the reveal reads as lamplight, not a void
    const inset = 3;
    g.fillStyle = `rgb(${Math.round(110 + 145 * warm)},${Math.round(88 + 130 * warm)},${Math.round(50 + 100 * warm)})`;
    g.fillRect(x + inset, y + inset, Math.max(0, w - inset * 2), Math.max(0, h - inset * 2));
  } else {
    g.fillStyle = '#2A2420';
    g.fillRect(x, y, w, h);
  }
  // Cap the swing so a wood slab stays readable (~30% width) instead of vanishing into a hole.
  const ang = o * Math.PI * 0.40;
  const vis = Math.max(Math.round(w * 0.30), Math.round(w * Math.cos(ang)));
  const skew = Math.round(Math.sin(ang) * Math.min(18, Math.round(h * 0.30)));
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
  if (o < 0.18 && vis > 10) {
    g.fillStyle = '#8A6A40';
    g.fillRect(x + vis - 6, y + Math.round(h * 0.55), 3, 4);
  }
}

// Page-to-page transitions: a stepped (pixel-feel) iris over everything, DOM-based so it works above Canvas2D, three.js
// and the jelly page alike. irisOut() before navigating away, irisIn() when a stage boots.
let el: HTMLDivElement | null = null;
function veil(colour: string) {
  if (!el) { el = document.createElement('div'); el.className = 'gift-iris'; document.body.appendChild(el); }
  el.style.background = colour; return el;
}
function run(from: number, to: number, ms: number, x: number, y: number, colour: string, steps = 14) {
  const v = veil(colour); const R = Math.hypot(innerWidth, innerHeight);
  return new Promise<void>(res => {
    let i = 0;
    const tick = () => {
      const k = i / steps, r = (from + (to - from) * k) * R;
      v.style.clipPath = `polygon(evenodd, 0 0, 100% 0, 100% 100%, 0 100%, 0 0, ${circle(x, y, r)})`;
      v.style.opacity = r >= R * 0.999 ? '0' : '1';
      if (i++ < steps) setTimeout(tick, ms / steps); else res();
    };
    tick();
  });
}
function circle(x: number, y: number, r: number) {
  const n = 28, pts: string[] = [];
  for (let i = 0; i <= n; i++) { const a = (i / n) * Math.PI * 2; pts.push(`${x + Math.cos(a) * r}px ${y + Math.sin(a) * r}px`); }
  return pts.join(', ');
}
/** close the iris onto (x,y) css px (default centre) */
export const irisOut = (x = innerWidth / 2, y = innerHeight / 2, ms = 650, colour = '#141414') => run(1, 0, ms, x, y, colour);
/** open from black at page start */
export const irisIn = (x = innerWidth / 2, y = innerHeight / 2, ms = 650, colour = '#141414') => run(0, 1, ms, x, y, colour);

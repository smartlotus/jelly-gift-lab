// Page-to-page transitions: a stepped (pixel-feel) iris over everything, DOM-based so it works above Canvas2D, three.js
// and the jelly page alike. irisOut() before navigating away, irisIn() when a stage boots.
import { gate, reveal } from './curtain';
let el: HTMLDivElement | null = null;
function veil(colour: string) {
  if (!el) { el = document.createElement('div'); el.className = 'gift-iris'; el.style.cssText = 'position:fixed;inset:0;z-index:100;pointer-events:none'; document.body.appendChild(el); } // inline: also used on the jelly page (no chrome.css)
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
export async function irisIn(x = innerWidth / 2, y = innerHeight / 2, ms = 650, colour = '#141414') {
  await gate; veil(colour).style.clipPath = ''; veil(colour).style.opacity = '1'; // the closed iris is up under the curtain
  void reveal(320); // v03e: the loading curtain lifts off the closed iris, which then opens
  return run(0, 1, ms, x, y, colour);
}

/** paper / dark stages: a plain full-screen dissolve (no iris). to = 1 covers the page, to = 0 reveals it.
 *  Reduced motion -> instant. The same veil element as the iris, so an arrival can continue a departure's colour. */
export async function dissolve(to: 0 | 1, ms = 600, colour = '#f6efe4', ease = 'cubic-bezier(.65,0,.35,1)'): Promise<void> {
  if (to === 0) { await gate; const u = veil(colour); u.style.clipPath = ''; u.style.transition = 'none'; u.style.opacity = '1'; void reveal(320); }
  const v = veil(colour); v.style.clipPath = ''; v.style.transition = 'none';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  v.style.opacity = String(1 - to); void v.offsetWidth;
  if (reduce) { v.style.opacity = String(to); return Promise.resolve(); }
  v.style.transition = `opacity ${ms}ms ${ease}`; v.style.opacity = String(to);
  return new Promise(res => setTimeout(() => { v.style.transition = ''; res(); }, ms + 20));
}

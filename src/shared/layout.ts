// 2026-11-14 · adaptive control layout. Every stage places its own controls (touch pad, colour swatches, map, back,
// 一起玩 …) with CSS; on some screens (360×640 / 360×780 Android, 20:9, foldables, landscape) the shared floating pieces
// landed on top of them. This resolver runs on every page (imported by orient.ts) and only moves the SHARED floating
// pieces, never a stage's own controls:
//   · .gs-dock (惊喜 / 跳过 / 收集)   → steps DOWN below whatever it would cover (it is top-right, under the chrome)
//   · .gift-whisper (the spoken line) → steps UP above bottom controls (portrait) or DOWN below top ones (landscape pill)
//   · .shop-load (3D status chip)     → steps UP
// It works with margins (the pieces keep their own transforms / transitions), re-checks on resize, orientation change,
// font load and a slow 700 ms tick while the page is visible (a few rects, no layout thrash), and gives up rather than
// pushing anything off-screen. Tap targets ≥ 44 px come from layout.css (touch screens only; desktop looks unchanged).
import './layout.css';

const TAP = 'button, a[href], [role="button"], input:not([type="hidden"]), select, textarea, .gs-item';
const GAP = 8;
type Dir = 'up' | 'down' | 'auto';
const MOVERS: [string, Dir][] = [['.gs-dock', 'down'], ['.gift-whisper.on', 'auto'], ['.shop-load:not([hidden])', 'up']];

function shown(el: Element) {
  for (let e: Element | null = el; e && e !== document.documentElement; e = e.parentElement) {
    const cs = getComputedStyle(e);
    if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) < 0.05) return false;
  }
  return true;
}
const hit = (a: DOMRect, b: DOMRect) => Math.min(a.right, b.right) - Math.max(a.left, b.left) > 0.5 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 0.5;

function obstacles(self: HTMLElement) {
  const out: DOMRect[] = [];
  document.querySelectorAll<HTMLElement>(TAP).forEach(o => {
    if (self.contains(o) || o.contains(self) || o.closest('.gs-fx, #gift-curtain, .gs-orient')) return;
    // other shared movers are resolved in their own pass
    if (o.closest('.gs-dock, .gift-whisper, .shop-load') && !self.matches('.gift-whisper, .shop-load')) return;
    const r = o.getBoundingClientRect(); if (r.width < 2 || r.height < 2) return;
    if (getComputedStyle(o).pointerEvents === 'none' || !shown(o)) return;
    out.push(r);
  });
  return out;
}

/** the CSS margin (measured with no inline margins, cached per settle) */
function base(el: HTMLElement, side: 'Top' | 'Bottom') {
  const k = `m${side}`;
  if (el.dataset[k] == null) {
    const t = el.style.marginTop, b = el.style.marginBottom; el.style.marginTop = ''; el.style.marginBottom = '';
    el.dataset[k] = String(parseFloat(getComputedStyle(el)[`margin${side}`]) || 0); el.style.marginTop = t; el.style.marginBottom = b;
  }
  return Number(el.dataset[k]);
}
/** move a fixed element by m px up or down through whichever inset anchors it (top-anchored → margin-top, bottom-anchored → margin-bottom) */
function shift(el: HTMLElement, d: 'up' | 'down', m: number) {
  let topAnchored = el.dataset.anchor === 't';
  if (!el.dataset.anchor) { // probe (once per settle — the anchoring flips with orientation): does margin-top move it?
    // relative to the element's own CSS margins (a <p> line has 1em of them)
    const y0 = el.getBoundingClientRect().top; const mt = el.style.marginTop; el.style.marginTop = `${base(el, 'Top') + 10}px`;
    topAnchored = Math.abs(el.getBoundingClientRect().top - y0 - 10) < 1; el.style.marginTop = mt; el.dataset.anchor = topAnchored ? 't' : 'b';
  }
  const v = Math.round(m) * (d === 'up' ? -1 : 1);
  if (topAnchored) { el.style.marginBottom = ''; el.style.marginTop = `${base(el, 'Top') + v}px`; } else { el.style.marginTop = ''; el.style.marginBottom = `${base(el, 'Bottom') - v}px`; }
}
function attempt(el: HTMLElement, d: 'up' | 'down') {
  el.style.marginTop = ''; el.style.marginBottom = '';
  let r = el.getBoundingClientRect(), m = 0;
  for (let i = 0; i < 6; i++) {
    const hits = obstacles(el).filter(o => hit(r, o)); if (!hits.length) return m;
    m += d === 'up' ? r.bottom - Math.min(...hits.map(h => h.top)) + GAP : Math.max(...hits.map(h => h.bottom)) - r.top + GAP;
    shift(el, d, m);
    r = el.getBoundingClientRect();
    if (r.top < 0 || r.bottom > innerHeight) break;
  }
  return -1;
}
function settle(el: HTMLElement, dir: Dir) {
  el.style.marginTop = ''; el.style.marginBottom = ''; delete el.dataset.anchor; delete el.dataset.mTop; delete el.dataset.mBottom;
  const r = el.getBoundingClientRect(); if (r.width < 2) return;
  const first: 'up' | 'down' = dir === 'auto' ? (r.top + r.height / 2 > innerHeight / 2 ? 'up' : 'down') : dir;
  const order: ('up' | 'down')[] = [first, first === 'up' ? 'down' : 'up'];
  // try the preferred direction, then the other one, and keep the smaller move
  let best: { d: 'up' | 'down'; m: number } | null = null;
  for (const d of order) { const m = attempt(el, d); if (m === 0) { el.dataset.settled = '0'; return; } if (m > 0 && (!best || m < best.m)) best = { d, m }; }
  el.style.marginTop = ''; el.style.marginBottom = '';
  if (best) { shift(el, best.d, best.m); el.dataset.settled = `${best.d}${Math.round(best.m)}`; }
  else el.dataset.settled = 'x'; // no clear spot on this screen: stay where the stage's CSS put it
}

let queued = 0;
export function settleAll() {
  queued = 0;
  for (const [sel, dir] of MOVERS) document.querySelectorAll<HTMLElement>(sel).forEach(el => settle(el, dir));
}
export function settleSoon(ms = 60) { if (!queued) queued = window.setTimeout(settleAll, ms); }

let mounted = false;
export function mountLayout() {
  if (mounted || typeof window === 'undefined') return; mounted = true;
  addEventListener('resize', () => settleSoon(120), { passive: true });
  addEventListener('orientationchange', () => settleSoon(400), { passive: true });
  try { document.fonts?.ready.then(() => settleSoon()); } catch { /* */ }
  [300, 1500, 4000].forEach(t => setTimeout(settleAll, t));
  setInterval(() => { if (document.visibilityState === 'visible') settleAll(); }, 700);
  (window as unknown as { __layout: unknown }).__layout = { settleAll };
}
mountLayout();

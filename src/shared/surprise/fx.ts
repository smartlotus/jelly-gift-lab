// Small toolkit for the per-stage surprise animations (anims/*.ts). Everything is DOM + CSS transforms/opacity driven by the
// Web Animations API (iOS Safari 13.1+), on one fixed layer that ignores pointer input and is removed afterwards — the stage
// underneath keeps running and keeps its own input. No canvas loops, no extra network beyond art the site already ships.
import type { StageId } from '../stage-list';

export interface Ctx {
  stage: StageId;
  /** full-screen, pointer-events:none layer; cleared by the kit when the animation resolves */
  layer: HTMLElement;
  w: number; h: number;
  reduced: boolean;
  /** URL of a public/ file from this page (asset() of flow.ts) */
  asset: (p: string) => string;
  /** where the hidden thing will sit (client px), or null when it is already found — the animation may end by sending a spark there */
  target: { x: number; y: number } | null;
  /** zh | en (for the odd drawn glyph) */
  lang: 'zh' | 'en';
}
export type Anim = (c: Ctx) => Promise<void>;

export const wait = (ms: number) => new Promise<void>(r => setTimeout(r, ms));
export const rnd = (a: number, b: number) => a + Math.random() * (b - a);
export const pick = <T,>(a: readonly T[]) => a[(Math.random() * a.length) | 0];

export function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls: string, parent: HTMLElement, css = '', html = ''): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag); if (cls) e.className = cls; if (css) e.style.cssText = css; if (html) e.innerHTML = html; parent.appendChild(e); return e;
}
/** WAAPI with a promise; resolves even if the element is removed or WAAPI is missing */
export function play(e: Element, kf: Keyframe[] | PropertyIndexedKeyframes, o: KeyframeAnimationOptions): Promise<void> {
  const ms = (typeof o.duration === 'number' ? o.duration : 0) + (o.delay ?? 0) + (o.endDelay ?? 0);
  if (!('animate' in e)) return wait(ms);
  try {
    const a = (e as HTMLElement).animate(kf, { fill: 'both', ...o });
    return new Promise(r => { a.onfinish = () => r(); a.oncancel = () => r(); setTimeout(r, ms + 400); });
  } catch { return wait(ms); }
}

/** a pixel-art SVG from a character grid (same idea as the loading curtain's pig); runs are merged into one rect */
export function pxSvg(rows: string[], pal: Record<string, string>, cls = '', extra = ''): string {
  const w = Math.max(...rows.map(r => r.length)), h = rows.length; let r = '';
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length;) {
      const c = row[x]; let n = 1; while (row[x + n] === c) n++;
      if (pal[c]) r += `<rect x="${x}" y="${y}" width="${n}" height="1" fill="${pal[c]}"/>`; x += n;
    }
  });
  return `<svg class="${cls}" viewBox="0 0 ${w} ${h}" shape-rendering="crispEdges" aria-hidden="true" ${extra}>${r}</svg>`;
}

/** show a canvas sprite (16×16 pixel cat/pig frames etc.) scaled up crisply; frames cycle at fps until the element is removed */
export function sprite(parent: HTMLElement, frames: (HTMLCanvasElement | HTMLImageElement)[], scale: number, fps = 8, css = '', flip = false): HTMLCanvasElement {
  const f0 = frames[0]; const c = document.createElement('canvas');
  c.width = f0.width; c.height = f0.height;
  c.style.cssText = `position:absolute;width:${f0.width * scale}px;height:${f0.height * scale}px;image-rendering:pixelated;image-rendering:crisp-edges;${css}`;
  const g = c.getContext('2d')!; g.imageSmoothingEnabled = false;
  let i = 0; const drawF = () => { const f = frames[i % frames.length]; g.clearRect(0, 0, c.width, c.height); g.save(); if (flip) { g.translate(c.width, 0); g.scale(-1, 1); } g.drawImage(f, 0, 0); g.restore(); };
  drawF();
  if (frames.length > 1) { const id = window.setInterval(() => { if (!c.isConnected) { clearInterval(id); return; } i++; drawF(); }, 1000 / fps); }
  parent.appendChild(c); return c;
}
/** an <img> of a public art file, pixelated */
export function img(parent: HTMLElement, src: string, w: number, css = '', crisp = true): HTMLImageElement {
  const i = document.createElement('img'); i.src = src; i.alt = ''; i.decoding = 'async'; i.draggable = false;
  i.style.cssText = `position:absolute;width:${w}px;height:auto;${crisp ? 'image-rendering:pixelated;' : ''}${css}`;
  parent.appendChild(i); return i;
}
export const loadImg = (src: string) => new Promise<HTMLImageElement>(res => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(i); i.src = src; });

/** a parabola from a→b over ms (outer element moves x, inner moves y) — for hearts, confetti, a spark sent to the hiding spot */
export function arc(parent: HTMLElement, html: string, a: { x: number; y: number }, b: { x: number; y: number }, ms: number, lift = 120, o: { delay?: number; spin?: number; cls?: string; scale?: [number, number] } = {}): Promise<void> {
  const ox = el('div', `gs-arc ${o.cls ?? ''}`, parent, `position:absolute;left:0;top:0;transform:translate(${a.x}px,0)`);
  const oy = el('div', '', ox, `transform:translate(0,${a.y}px)`, html);
  const s = o.scale ?? [1, 1];
  const delay = o.delay ?? 0;
  const px = play(ox, [{ transform: `translate(${a.x}px,0)` }, { transform: `translate(${b.x}px,0)` }], { duration: ms, delay, easing: 'linear' });
  const top = Math.min(a.y, b.y) - lift;
  const py = play(oy, [
    { transform: `translate(0,${a.y}px) scale(${s[0]}) rotate(0deg)`, offset: 0, easing: 'cubic-bezier(.2,.6,.4,1)' },
    { transform: `translate(0,${top}px) scale(${(s[0] + s[1]) / 2}) rotate(${(o.spin ?? 0) / 2}deg)`, offset: 0.45, easing: 'cubic-bezier(.6,0,.8,.4)' },
    { transform: `translate(0,${b.y}px) scale(${s[1]}) rotate(${o.spin ?? 0}deg)`, offset: 1 },
  ], { duration: ms, delay });
  return Promise.all([px, py]).then(() => ox.remove());
}

/** the closing beat every animation shares: a small glowing spark flies to where the hidden thing will be */
export async function sendSpark(c: Ctx, from: { x: number; y: number }, colour = '#FFE7A0', ms = 900) {
  if (!c.target) return;
  const html = `<i class="gs-spark" style="--c:${colour}"></i>`;
  if (c.reduced) { const s = el('div', '', c.layer, `position:absolute;left:${c.target.x}px;top:${c.target.y}px`, html); await play(s, [{ opacity: 0 }, { opacity: 1 }, { opacity: 0 }], { duration: 500 }); return; }
  // a short trail of three
  const trail = [0, 70, 140].map(d => arc(c.layer, html, from, c.target!, ms, 90, { delay: d, scale: [1, d ? 0.5 : 0.8] }));
  await Promise.all(trail);
  const p = el('div', '', c.layer, `position:absolute;left:${c.target.x}px;top:${c.target.y}px`, `<i class="gs-spark-pop" style="--c:${colour}"></i>`);
  await play(p.firstElementChild!, [{ transform: 'translate(-50%,-50%) scale(.2)', opacity: 1 }, { transform: 'translate(-50%,-50%) scale(1.6)', opacity: 0 }], { duration: 420, easing: 'ease-out' });
}

/** only the arrival pop at the hiding spot (when the animation carried the thing there itself) */
export async function popAt(c: Ctx, colour = '#FFE7A0') {
  if (!c.target) return;
  const p = el('div', '', c.layer, `position:absolute;left:${c.target.x}px;top:${c.target.y}px`, `<i class="gs-spark-pop" style="--c:${colour}"></i>`);
  await play(p.firstElementChild!, [{ transform: 'translate(-50%,-50%) scale(.2)', opacity: 1 }, { transform: 'translate(-50%,-50%) scale(1.6)', opacity: 0 }], { duration: 420, easing: 'ease-out' });
}

/** gentle screen shake of the whole layer's backdrop element (used by the night stomp) */
export function shake(e: HTMLElement, px = 4, ms = 160) {
  return play(e, [{ transform: 'translate(0,0)' }, { transform: `translate(${px}px,${-px / 2}px)` }, { transform: `translate(${-px}px,${px / 2}px)` }, { transform: 'translate(0,0)' }], { duration: ms, easing: 'steps(4,end)' });
}

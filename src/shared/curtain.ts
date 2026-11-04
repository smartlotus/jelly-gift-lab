// v03e · runtime side of the loading curtain (markup + safety net are inlined into every page: curtain-inline.ts).
//   hold()      -> a release fn; the arrival transition (irisIn / dissolve / auto-reveal) waits until every hold is released
//   gate        -> resolves when nothing holds the curtain any more
//   progress(p) -> pixel bar on heavy pages (shop models, jelly meshes)
//   reveal(ms)  -> fade the curtain away (called by irisIn/dissolve and by the auto-reveal for pages without an arrival)
//   cover(to, colour) -> before navigating: the curtain comes back on the colour the outro closed on, pig hopping, with the
//                 next stop's name; the colour is handed to the next page (sessionStorage) so the two curtains match exactly.
import { CURTAIN_STAGES } from './curtain-inline';
type C = { el: HTMLElement; shown: boolean; progress(p: number): void; reveal(ms?: number): void; cover(bg: string, stage?: string): void; fail(why?: unknown): void };
const W = (): C | undefined => (window as unknown as { __curtain?: C }).__curtain;

let holds = 0, release: () => void = () => {};
export let gate: Promise<void> = Promise.resolve();
export function hold(): () => void {
  if (holds++ === 0) gate = new Promise(r => { release = r; });
  let done = false;
  return () => { if (done) return; done = true; if (--holds === 0) release(); };
}
export const progress = (p: number) => W()?.progress(p);
export const fail = (why?: unknown) => W()?.fail(why);
export const showing = () => !!W()?.shown;
export const element = () => W()?.el ?? null;
/** fade the curtain away once nothing holds it (no-op if already revealed) */
export async function reveal(ms?: number) { await gate; W()?.reveal(ms); }

// auto-reveal: pages without an arrival transition (sea, sky-from-jelly, ?skip) reveal once the stage has drawn twice.
let auto = true;
export const manual = () => { auto = false; };
const autoReveal = () => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(() => { if (auto) void reveal(); }, 60)));
if (document.readyState === 'complete') autoReveal(); else window.addEventListener('load', autoReveal, { once: true });

/** cover the page before navigating to `to`. Takes the colour of a closed iris/dissolve veil when there is one. */
export function cover(to: string, colour?: string): Promise<void> {
  const c = W(); const iris = document.querySelector<HTMLElement>('.gift-iris');
  let bg = colour;
  if (!bg && iris && getComputedStyle(iris).opacity === '1') bg = rgbHex(getComputedStyle(iris).backgroundColor);
  bg = bg || (CURTAIN_STAGES[to] ?? CURTAIN_STAGES.ar)[0];
  try { sessionStorage.setItem('gift.curtain', JSON.stringify({ to, c: bg, t: Date.now() })); } catch { /* private mode */ }
  if (!c) return Promise.resolve();
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  c.cover(bg, to);
  const el = c.el; el.style.transitionDuration = ''; // fade in (from transparent) unless an opaque veil is already up
  if (!reduce && !(iris && getComputedStyle(iris).opacity === '1')) {
    el.classList.add('gcc-out'); void el.offsetWidth; el.classList.remove('gcc-out');
    return new Promise(r => setTimeout(r, 300));
  }
  return Promise.resolve();
}
function rgbHex(s: string): string | undefined {
  const m = s.match(/\d+(\.\d+)?/g); if (!m || m.length < 3) return undefined;
  return '#' + m.slice(0, 3).map(v => Math.round(+v).toString(16).padStart(2, '0')).join('');
}

// Journey routing shared by every stage. Each stage is its own Vite page (multi-page app):
//   meadow    /            invitation
//   flower    /flower/     living bouquet forest (云南紫精灵 + 戴安娜粉玫瑰)
//   mushroom  /mushroom/   luminous mushroom wood
//   shop      /shop/       handmade keepsakes (AR side path returns here; rear splits to night or jelly)
//   night     /night/      optional night walk together
//   jelly     /jelly/      relief / play
//   sea       /sea/        remembered seas
//   sky       /sky/        Changchun sky + 200-day film
//   coop      /coop/       play together
//   home      /home/       discover, furnish, transform, day-2000 life
//   (ar       /ar/         shop side room; returns to shop)
// vite base is './' so every URL here is RELATIVE (works at a domain root or any subpath, including a future Pages URL).
import { cover } from './curtain';
import { whoosh } from './sfx';
export type StageId = 'meadow' | 'flower' | 'mushroom' | 'shop' | 'night' | 'jelly' | 'sea' | 'sky' | 'coop' | 'home' | 'ar';
export const STAGES: readonly StageId[] = ['meadow', 'flower', 'mushroom', 'shop', 'night', 'jelly', 'sea', 'sky', 'coop', 'home'];
const PATH: Record<StageId, string> = { meadow: '', flower: 'flower/', mushroom: 'mushroom/', shop: 'shop/', night: 'night/', jelly: 'jelly/', sea: 'sea/', sky: 'sky/', coop: 'coop/', home: 'home/', ar: 'ar/' };
/** query params that survive page hops (language + dev switches) */
const CARRY = ['lang', 'dev', 'sound', 'skip'];
const PROGRESS = 'gift.progress';

/** current stage = <meta name="gift-stage" content="..."> in each page's index.html */
export const here: StageId = (document.querySelector<HTMLMetaElement>('meta[name="gift-stage"]')?.content as StageId) || 'meadow';
const rootRel = here === 'meadow' ? './' : '../';
export const params = new URLSearchParams(location.search);
export const dev = params.has('dev');

export function stageUrl(id: StageId, extra: Record<string, string> = {}): string {
  const q = new URLSearchParams();
  for (const k of CARRY) { const v = params.get(k); if (v !== null) q.set(k, v); }
  for (const k in extra) q.set(k, extra[k]);
  const qs = q.toString();
  return `${rootRel}${PATH[id]}${qs ? '?' + qs : ''}`;
}
export function nextStage(id: StageId = here): StageId | null { const i = STAGES.indexOf(id); return STAGES[i + 1] ?? null; }

/** furthest stage reached (localStorage; only used for a discreet "continue" affordance + dev) */
export function reached(): number { try { return +(localStorage.getItem(PROGRESS) || 0); } catch { return 0; } }
export function markReached(id: StageId = here) {
  const i = STAGES.indexOf(id);
  try { if (i > reached()) localStorage.setItem(PROGRESS, String(i)); } catch { /* private mode */ }
}

/** dev jump from the root link: ?stage=2|shop|3|night|4|jelly  -> redirects before the stage boots. Returns true if redirecting. */
export function handleStageParam(): boolean {
  const s = params.get('stage'); if (!s || here !== 'meadow') return false;
  const id = (/^\d+$/.test(s) ? STAGES[+s - 1] : s) as StageId;
  if (!STAGES.includes(id) || id === 'meadow') return false;
  location.replace(stageUrl(id)); return true;
}

/** warm the next stage so the hop feels like one continuous app (v03g): fetch its HTML (same URL go() will navigate to, so it
 *  is a cache hit), then modulepreload its scripts and preload its stylesheets — read from that HTML, so it works with the
 *  hashed filenames of any build. Safe to call repeatedly; never throws. */
const warmed = new Set<string>();
export function warm(id: StageId, extra: Record<string, string> = {}) {
  const url = stageUrl(id, { from: here, ...extra }); if (warmed.has(url)) return; warmed.add(url);
  try {
    const conn = (navigator as unknown as { connection?: { saveData?: boolean } }).connection; if (conn?.saveData) return;
    void fetch(url, { credentials: 'same-origin' }).then(r => (r.ok ? r.text() : '')).then(html => {
      if (!html) return;
      const doc = new DOMParser().parseFromString(html, 'text/html'); const base = new URL(url, location.href);
      const seen = new Set<string>();
      doc.querySelectorAll<HTMLElement>('script[type="module"][src], link[rel="modulepreload"], link[rel="stylesheet"]').forEach(el => {
        const href = el.getAttribute('src') || el.getAttribute('href'); if (!href) return;
        const u = new URL(href, base).href; if (u.slice(0, location.origin.length) !== location.origin || seen.has(u)) return; seen.add(u);
        const l = document.createElement('link');
        if (el.tagName === 'LINK' && (el as HTMLLinkElement).rel === 'stylesheet') { l.rel = 'preload'; l.as = 'style'; } else { l.rel = 'modulepreload'; }
        l.href = u; document.head.appendChild(l);
      });
    }).catch(() => { warmed.delete(url); });
  } catch { /* old browser: the curtain covers the load */ }
}
/** call when the player approaches the exit */
export function prefetchNext(id: StageId = here) {
  const n = nextStage(id); if (!n) return;
  warm(n);
  // Decode the next stage's ground plate now so the first painted frame is the forest, not an empty body colour.
  const plates: Partial<Record<StageId, string>> = { mushroom: 'art/plates/mushroom-ground-wide.jpg' };
  const plate = plates[n];
  if (plate) {
    try { const im = new Image(); im.src = asset(plate); void im.decode?.(); } catch { /* */ }
  }
}

/** leave for the next stage: optional outro (e.g. iris close) then navigate. */
export async function go(to: StageId | null = nextStage(), outro?: () => Promise<void>, extra: Record<string, string> = {}) {
  if (!to) return;
  markReached(to); warm(to, extra); // the outro (iris close, dissolve) is time to fetch the next page's code
  whoosh(true);
  if (outro) await outro();
  await cover(to); // v03e: the loading curtain (pig hopping on the closed colour) bridges the page load
  location.assign(stageUrl(to, { from: here, ...extra }));
}
/** where this page was entered from (?from=...), for arrival animations */
export const from = params.get('from') as StageId | null;
export const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

/** URL of a file in public/ (copied to the site root) from any stage page, e.g. asset('models/figure-pig.glb').
 *  Never use '/models/..' (absolute paths break under a subpath) or import.meta.env.BASE_URL (= './', document-relative). */
export const asset = (p: string) => `${rootRel}${p}`;

// Journey routing shared by every stage. Each stage is its own Vite page (multi-page app):
//   meadow  /         stage 1 · bright Cat-Mario-style pixel platformer (the link she opens)
//   shop    /shop/    stage 2 · pixel cat walks through a shop of lotus's 3D models
//   night   /night/   stage 3 · blocky night walk, "caught" by the pig -> kawaii flip
//   jelly   /jelly/   stage 4 · Jelly Studies + mushroom easter egg (existing page) -> 抬头 / Look up
//   sky     /sky/     stage 5 · the real live sky over Changchun -> 一起玩 / Play together
//   coop    /coop/    stage 6 · the pig + cat co-op level (one phone by default, two phones optional) = the finale
//   (ar     /ar/      side room of the shop: the figure on a real table; returns to the same exhibit)
// vite base is './' so every URL here is RELATIVE (works under https://smartlotus.github.io/jelly-gift/ and any host).
export type StageId = 'meadow' | 'shop' | 'night' | 'jelly' | 'sky' | 'coop' | 'ar';
export const STAGES: readonly StageId[] = ['meadow', 'shop', 'night', 'jelly', 'sky', 'coop'];
const PATH: Record<StageId, string> = { meadow: '', shop: 'shop/', night: 'night/', jelly: 'jelly/', sky: 'sky/', coop: 'coop/', ar: 'ar/' };
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
  const id = (/^\d$/.test(s) ? STAGES[+s - 1] : s) as StageId;
  if (!STAGES.includes(id) || id === 'meadow') return false;
  location.replace(stageUrl(id)); return true;
}

/** hint the browser to fetch the next page's HTML early (call when the player approaches the exit) */
export function prefetchNext(id: StageId = here) {
  const n = nextStage(id); if (!n) return;
  const l = document.createElement('link'); l.rel = 'prefetch'; l.href = stageUrl(n); document.head.appendChild(l);
}

/** leave for the next stage: optional outro (e.g. iris close) then navigate. */
export async function go(to: StageId | null = nextStage(), outro?: () => Promise<void>, extra: Record<string, string> = {}) {
  if (!to) return;
  markReached(to);
  if (outro) await outro();
  location.assign(stageUrl(to, { from: here, ...extra }));
}
/** where this page was entered from (?from=...), for arrival animations */
export const from = params.get('from') as StageId | null;
export const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

/** URL of a file in public/ (copied to the site root) from any stage page, e.g. asset('models/figure-pig.glb').
 *  Never use '/models/..' (absolute breaks under /jelly-gift/) or import.meta.env.BASE_URL (= './', document-relative). */
export const asset = (p: string) => `${rootRel}${p}`;

// Collection state for the 惊喜 hunt: one hidden thing per journey stage.
// Pure data + localStorage (no DOM) so it loads in node for tests (tools/collect-test.ts).
//
//   revealed: the stage's surprise has been played, so its hidden thing is out there somewhere
//   found:    she tapped it
// Stored as one JSON object under COLLECT_KEY; survives page hops and reloads; resetCollection() is called by 从头再来.
import { STAGES, type StageId } from '../stage-list';

export const COLLECT_KEY = 'gift.collect.v1';
/** the stages that hide something, in journey order (= STAGES; the AR side room has none) */
export const COLLECT_STAGES: readonly StageId[] = STAGES;
export const TOTAL = COLLECT_STAGES.length;

export interface CollectState { v: 1; found: Partial<Record<StageId, number>>; revealed: Partial<Record<StageId, number>> }
type Store = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

let store: Store | null = null;
/** tests inject a fake Storage; in the browser this is localStorage (null in a locked-down private mode) */
export function useStore(s: Store | null) { store = s; }
function st(): Store | null {
  if (store) return store;
  try { return (globalThis as { localStorage?: Store }).localStorage ?? null; } catch { return null; }
}
const empty = (): CollectState => ({ v: 1, found: {}, revealed: {} });
const valid = (id: unknown): id is StageId => typeof id === 'string' && (COLLECT_STAGES as readonly string[]).includes(id);

export function load(): CollectState {
  try {
    const raw = st()?.getItem(COLLECT_KEY); if (!raw) return empty();
    const o = JSON.parse(raw) as Partial<CollectState>;
    const s = empty();
    for (const k of ['found', 'revealed'] as const) {
      const src = o && typeof o[k] === 'object' && o[k] ? o[k]! : {};
      for (const id in src) if (valid(id) && typeof (src as Record<string, unknown>)[id] === 'number') s[k][id] = (src as Record<string, number>)[id];
    }
    return s;
  } catch { return empty(); }
}
function save(s: CollectState) { try { st()?.setItem(COLLECT_KEY, JSON.stringify(s)); } catch { /* private mode: this visit only */ } emit(); }

const subs = new Set<() => void>();
/** called after every change made on this page (and, via onStorage, in other tabs) */
export function subscribe(fn: () => void): () => void { subs.add(fn); return () => subs.delete(fn); }
function emit() { subs.forEach(f => { try { f(); } catch { /* */ } }); }
/** wire the browser 'storage' event (another tab changed the state) — called by the kit */
export function onStorage(e: { key: string | null }) { if (e.key === COLLECT_KEY || e.key === null) emit(); }

export const isFound = (id: StageId) => !!load().found[id];
export const isRevealed = (id: StageId) => !!load().revealed[id];
export function markRevealed(id: StageId) { if (!valid(id)) return; const s = load(); if (s.revealed[id]) return; s.revealed[id] = Date.now(); save(s); }
/** returns true the first time this stage's thing is found */
export function markFound(id: StageId): boolean {
  if (!valid(id)) return false;
  const s = load(); if (s.found[id]) return false;
  s.found[id] = Date.now(); s.revealed[id] ??= s.found[id]; save(s); return true;
}
export const foundList = (): StageId[] => { const s = load(); return COLLECT_STAGES.filter(id => s.found[id]); };
export const missingList = (): StageId[] => { const s = load(); return COLLECT_STAGES.filter(id => !s.found[id]); };
export const foundCount = () => foundList().length;
export const allFound = () => missingList().length === 0;
export function resetCollection() { try { st()?.removeItem(COLLECT_KEY); } catch { /* */ } emit(); }

/** what happens when the ending film is over: every thing found → the secret page; otherwise the list, with what is missing */
export type EndRoute = { kind: 'secret' } | { kind: 'list'; missing: StageId[] };
export function endRoute(s: CollectState = load()): EndRoute {
  const missing = COLLECT_STAGES.filter(id => !s.found[id]);
  return missing.length ? { kind: 'list', missing } : { kind: 'secret' };
}

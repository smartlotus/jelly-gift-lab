// 2026-11-14 · robust GLB delivery for the shop's 3D figurines / fridge magnets (and the meadow's background prefetch).
// Why: on a slow phone connection all five exhibits (six GLBs, ~2.3 MB decoded) used to start at once and share the
// bandwidth, so even the first one took 20 s+; GitHub Pages gzips GLBs, so loaded/total ran past 100 % and the pixel
// progress bar looked frozen; a stalled or failed request was never retried and the exhibit stayed "loading" forever.
// Now: ≤ 2 downloads at a time, nearest exhibit first; a stall timeout (no bytes for STALL_MS) aborts and retries with
// back-off (fresh, cache: 'reload'); progress is measured against the real decoded size; failures surface as an error
// state the page shows with a retry button. Paths go through asset() (document-relative), so any base works
// (GitHub Pages /jelly-gift-lab/, Cloudflare Pages at the root, a local server).
import { asset } from '../../shared/flow';
import type { ExhibitId } from './exhibits';

/** decoded byte size of every public/models/*.glb (tools/lab-verify.mjs checks these against the files) */
export const GLB_BYTES: Record<string, number> = {
  'cat-fig': 192552, 'cat-relief': 114248, 'figure-cat': 419288, 'figure-pig': 410136, 'magnet-cat': 423112,
  'magnet-pig': 413136, 'pair-cat': 335084, 'pair-pig': 331328, 'pig-fig': 194960, 'pig-relief': 119068,
};
/** GLB files behind each exhibit */
export const FILES: Record<ExhibitId, string[]> = {
  'figure-pig': ['figure-pig'], 'figure-cat': ['figure-cat'], 'magnet-pig': ['magnet-pig'], 'magnet-cat': ['magnet-cat'],
  pair: ['pair-pig', 'pair-cat'], 'pig-fig': ['pig-fig'], 'cat-fig': ['cat-fig'], 'pig-relief': ['pig-relief'], 'cat-relief': ['cat-relief'],
};

const q = new URLSearchParams(location.search);
/** test hooks: ?glbstall=<file> never delivers that file once (exercises the stall timeout + retry); ?glbfail=<file> always 404s */
const STALL_TEST = q.get('glbstall'), FAIL_TEST = q.get('glbfail');
export const STALL_MS = Number(q.get('glbstallms')) || 9000;
export const TRIES = 3;

const wait = (ms: number) => new Promise<void>(r => setTimeout(r, ms));
const stalledOnce = new Set<string>();

/** one GLB as an ArrayBuffer, streaming progress 0…1, aborting a stalled transfer and retrying with back-off */
export async function fetchGlb(file: string, onProgress: (p: number) => void, tries = TRIES): Promise<ArrayBuffer> {
  const url = asset(`models/${file}.glb${FAIL_TEST === file ? '.missing' : ''}`);
  let lastErr: unknown;
  for (let a = 0; a < tries; a++) {
    const ac = new AbortController(); let last = performance.now(); let n = 0;
    const tick = setInterval(() => { if (performance.now() - last > STALL_MS) ac.abort(); }, 500);
    try {
      if (STALL_TEST === file && !stalledOnce.has(file)) { stalledOnce.add(file); await new Promise((_, rej) => ac.signal.addEventListener('abort', () => rej(new Error('stalled (test)')))); }
      const r = await fetch(url, { signal: ac.signal, cache: a ? 'reload' : 'default', credentials: 'same-origin' });
      if (!r.ok) throw new Error(`HTTP ${r.status} ${file}.glb`);
      last = performance.now();
      const enc = r.headers.get('content-encoding'), len = Number(r.headers.get('content-length')) || 0;
      const total = GLB_BYTES[file] || (!enc && len) || 0;
      if (!r.body || !('getReader' in r.body)) { const b = await r.arrayBuffer(); onProgress(1); return b; }
      const rd = r.body.getReader(); const chunks: Uint8Array[] = [];
      for (;;) {
        const { done, value } = await rd.read(); if (done) break;
        chunks.push(value); n += value.byteLength; last = performance.now();
        if (total) onProgress(Math.min(0.99, n / total));
      }
      const out = new Uint8Array(n); let o = 0; for (const c of chunks) { out.set(c, o); o += c.byteLength; }
      onProgress(1); return out.buffer;
    } catch (e) {
      lastErr = ac.signal.aborted ? new Error(`stalled ${file}.glb (${STALL_MS} ms without data)`) : e;
      if (a < tries - 1) await wait(700 * 3 ** a);
    } finally { clearInterval(tick); }
  }
  throw lastErr;
}

const prefetched = new Set<string>();
/** fill the HTTP cache with the shop's first exhibits while the meadow is still playing (idle, low priority, never on Save-Data / 2G) */
export function prefetchShopModels(files = ['figure-pig', 'figure-cat', 'magnet-pig', 'magnet-cat', 'pair-pig', 'pair-cat']) {
  try {
    const c = (navigator as unknown as { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
    if (c?.saveData || /(^|-)2g$/.test(c?.effectiveType ?? '')) return;
  } catch { /* */ }
  const go = async () => {
    for (const f of files) {
      if (prefetched.has(f)) continue; prefetched.add(f);
      try { const r = await fetch(asset(`models/${f}.glb`), { credentials: 'same-origin', priority: 'low' } as RequestInit); await r.arrayBuffer(); } catch { /* best effort */ }
    }
  };
  const ric = (window as unknown as { requestIdleCallback?: (f: () => void, o?: { timeout: number }) => void }).requestIdleCallback;
  if (ric) ric(() => void go(), { timeout: 4000 }); else setTimeout(() => void go(), 1500);
}

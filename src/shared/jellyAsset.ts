// 2026-11-14 · the jelly page's big download is its tet-mesh asset (/jelly/assets/<id>/<level>.bin, ~2.2 MB for the phone
// levels). This module is shared by the jelly page (starts the download at once, in parallel with the WebGPU probe) and
// by the night stage before it (warms the HTTP cache while she walks, idle + low priority, skipped on Save-Data / 2G).
// The Cloudflare build also ships <level>.bin.gz (Pages does not compress application/octet-stream; GitHub Pages does):
// VITE_JELLY_GZ=1 makes the page fetch those and inflate them with DecompressionStream (falls back to .bin without it).
import { perfTier } from './perf';

const GZ = import.meta.env.VITE_JELLY_GZ === '1' && typeof DecompressionStream !== 'undefined';
/** decoded byte sizes for progress (GitHub's gzip makes content-length the compressed size; Pages sends none) */
const RAW: Record<string, number> = JSON.parse(import.meta.env.VITE_JELLY_SIZES || '{}');
const GZS: Record<string, number> = JSON.parse(import.meta.env.VITE_JELLY_GZ_SIZES || '{}');

const ua = typeof navigator === 'undefined' ? '' : navigator.userAgent;
const isMobile = typeof matchMedia !== 'undefined' && (matchMedia('(pointer: coarse)').matches || /Android|iPhone|iPad|iPod|Mobile|MicroMessenger/i.test(ua));
const isWebKit = /iPhone|iPad|iPod/i.test(ua) || (typeof navigator !== 'undefined' && navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  || (/AppleWebKit/i.test(ua) && !/Chrome|Chromium|Edg|OPR|Android/i.test(ua));

/** the level the jelly page will pick (same rule as src/main.ts boot(); WebGL2 always takes 'lo'). Asks for a WebGPU
 *  adapter (fast; the answer is kept for the session) so a phone without one does not download the WebGPU level. */
export async function guessLevel(q = new URLSearchParams(location.search).get('q')): Promise<string> {
  if (q) return q;
  const webgpu = 'gpu' in navigator && !isWebKit && new URLSearchParams(location.search).get('backend') !== 'webgl2' && await hasAdapter();
  if (!webgpu) return 'lo';
  return isMobile ? (perfTier() === 'low' ? 'lo' : 'md') : 'hi';
}
async function hasAdapter(): Promise<boolean> {
  try { const v = sessionStorage.getItem('jelly.gpu'); if (v) return v === '1'; } catch { /* */ }
  let ok = false;
  try {
    const gpu = (navigator as unknown as { gpu: { requestAdapter(o?: object): Promise<unknown> } }).gpu;
    ok = !!(await Promise.race([gpu.requestAdapter({ powerPreference: 'high-performance' }), new Promise(r => setTimeout(() => r(null), 1500))]));
  } catch { ok = false; }
  try { sessionStorage.setItem('jelly.gpu', ok ? '1' : '0'); } catch { /* */ }
  return ok;
}

/** URL of a character asset, relative to the jelly page or to a sibling stage page */
export function assetUrl(id: string, level: string, fromSibling = false) {
  return `${fromSibling ? '../jelly/' : import.meta.env.BASE_URL}assets/${id}/${level}.bin${GZ ? '.gz' : ''}`;
}

const inflight = new Map<string, { p: Promise<ArrayBuffer>; on: Set<(p: number) => void>; last: number }>();
/** fetch (once) + inflate; every caller's onP gets 0..1 (a late caller gets the progress so far at once) */
export function loadJellyAsset(id: string, level: string, onP?: (p: number) => void): Promise<ArrayBuffer> {
  const key = `${id}/${level}`;
  let e = inflight.get(key);
  if (!e) {
    const on = new Set<(p: number) => void>(); const ent = { p: null as unknown as Promise<ArrayBuffer>, on, last: 0 };
    const emit = (v: number) => { ent.last = v; on.forEach(f => f(v)); };
    ent.p = (async () => {
      const url = assetUrl(id, level);
      const res = await fetch(url);
      if (!res.ok || !res.body) throw new Error(`asset ${url}: ${res.status}`);
      const len = +(res.headers.get('content-length') || 0), enc = res.headers.get('content-encoding');
      const total = (GZ ? GZS[key] : RAW[key]) || (!enc ? len : 0);
      const reader = res.body.getReader(); const chunks: Uint8Array[] = []; let got = 0;
      for (;;) {
        const { done, value } = await reader.read(); if (done) break;
        chunks.push(value); got += value.length; if (total) emit(Math.min(0.99, got / total));
      }
      const out = new Uint8Array(got); let o = 0; for (const c of chunks) { out.set(c, o); o += c.length; }
      // gzip magic → inflate here (a host that already sent Content-Encoding: gzip hands us the plain bytes)
      const buf = out[0] === 0x1f && out[1] === 0x8b
        ? await new Response(new Blob([out]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer()
        : out.buffer;
      emit(1);
      return buf;
    })();
    ent.p.catch(() => inflight.delete(key));
    inflight.set(key, ent); e = ent;
  }
  if (onP) { e.on.add(onP); if (e.last) onP(e.last); }
  return e.p;
}

let warmed = false;
/** from a sibling stage: put the jelly's first asset into the HTTP cache (idle, low priority) */
export function prefetchJelly(id = 'pig') {
  if (warmed) return; warmed = true;
  const c = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
  if (c?.saveData || /(^|-)2g$/.test(c?.effectiveType || '')) return;
  const go = async () => {
    const url = assetUrl(id, await guessLevel(null), true);
    fetch(url, { priority: 'low' } as RequestInit).then(r => r.arrayBuffer()).catch(() => { warmed = false; });
    for (const href of ['../jelly/']) { const l = document.createElement('link'); l.rel = 'prefetch'; l.href = href; document.head.appendChild(l); }
  };
  const ric = (window as unknown as { requestIdleCallback?: (f: () => void, o?: { timeout: number }) => void }).requestIdleCallback;
  if (ric) ric(() => void go(), { timeout: 4000 }); else setTimeout(() => void go(), 1500);
}

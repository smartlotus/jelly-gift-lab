// AR helpers shared by /ar/ and the shop inspector. iOS/iPadOS: AR Quick Look with a pre-built USDZ at real printed size
// (public/models/<id>.usdz, tools/models/export_usdz.py). Android: WebXR immersive-ar + hit-test (src/stages/ar/xr.ts) when the
// browser supports it. Never Scene Viewer / model-viewer CDNs (Google services, unreachable in mainland China).
import { asset } from './flow';
export type ArId = 'figure-pig' | 'figure-cat' | 'pair';
export const AR_IDS: ArId[] = ['figure-pig', 'figure-cat', 'pair'];
export const isArId = (id: string): id is ArId => (AR_IDS as string[]).includes(id);
export const AR_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3.5l7 4v8l-7 4-7-4v-8z"/><path d="M5 7.5l7 4 7-4M12 11.5v8"/><path d="M2.5 6V3.5H5M19 3.5h2.5V6M21.5 18v2.5H19M5 20.5H2.5V18"/></svg>';
export function quickLook(): boolean { try { return document.createElement('a').relList.supports('ar'); } catch { return false; } }
export async function webxrAR(): Promise<boolean> {
  const xr = (navigator as Navigator & { xr?: { isSessionSupported(m: string): Promise<boolean> } }).xr;
  if (!xr || !window.isSecureContext) return false;
  try { return await xr.isSessionSupported('immersive-ar'); } catch { return false; }
}
export const usdz = (id: ArId) => `${asset(`models/${id}.usdz`)}#allowsContentScaling=0`;
/** open AR Quick Look (must run inside a user gesture). The anchor needs an <img> child or iOS ignores rel="ar". */
export function openQuickLook(id: ArId) {
  const a = document.createElement('a'); a.rel = 'ar'; a.href = usdz(id);
  a.appendChild(document.createElement('img')); a.style.display = 'none'; document.body.appendChild(a); a.click(); setTimeout(() => a.remove(), 1000);
}

// AR helpers shared by /ar/ and the shop inspector. Every model in the shop has AR (2026-11-15: + the fridge magnets and the
// Lotus30 set; a new model only needs an entry in AR_IDS / src/stages/ar/models.ts and `tools/models/build_ar.mjs` + glb_to_usdz.py).
// · iOS/iPadOS: AR Quick Look with a pre-built USDZ at real printed size (public/models/<id>.usdz)
// · Android: WebXR immersive-ar + hit-test in the page (src/stages/ar/xr.ts) when Chrome has it; otherwise Google Scene Viewer
//   (intent) with a plain glTF copy (public/models/ar/<id>.glb: no meshopt / quantization, metres, standing on y = 0). Scene
//   Viewer needs Google Play Services for AR, which many phones sold in mainland China lack — then its fallback URL brings her
//   back to /ar/ with a short note and the 3D turntable. Nothing is loaded from a Google CDN; the AR files are only fetched
//   when AR is tapped (by Quick Look / Scene Viewer themselves).
// · WeChat / other in-app browsers can't open either: a note says to open the page in the browser.
import { asset } from './flow';
export type ArId = 'figure-pig' | 'figure-cat' | 'pair' | 'pig-fig' | 'cat-fig' | 'magnet-pig' | 'magnet-cat' | 'pig-relief' | 'cat-relief';
export const AR_IDS: ArId[] = ['figure-pig', 'figure-cat', 'pair', 'pig-fig', 'cat-fig', 'magnet-pig', 'magnet-cat', 'pig-relief', 'cat-relief'];
/** the /ar/ carousel shows one family at a time (figures / fridge magnets), so the dots always fit a 360 px phone */
export const AR_FAMILIES: ArId[][] = [['figure-pig', 'figure-cat', 'pair', 'pig-fig', 'cat-fig'], ['magnet-pig', 'magnet-cat', 'pig-relief', 'cat-relief']];
export const isArId = (id: string): id is ArId => (AR_IDS as string[]).includes(id);
export const isMagnet = (id: string) => id.startsWith('magnet') || id.endsWith('-relief');
export const AR_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3.5l7 4v8l-7 4-7-4v-8z"/><path d="M5 7.5l7 4 7-4M12 11.5v8"/><path d="M2.5 6V3.5H5M19 3.5h2.5V6M21.5 18v2.5H19M5 20.5H2.5V18"/></svg>';
const ua = typeof navigator === 'undefined' ? '' : navigator.userAgent;
export const isAndroid = /Android/i.test(ua);
/** in-app browsers that block intents / Quick Look (WeChat, QQ, Weibo, Alipay, DingTalk, Douyin …) */
export const inAppBrowser = /MicroMessenger|QQ\/|Weibo|AlipayClient|DingTalk|aweme|Bytedance|NewsArticle/i.test(ua);
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
/** Scene Viewer intent (real size: resizable=false; magnets may also go on a wall). fallback = where Chrome goes without it. */
export function sceneViewerUrl(id: ArId, title: string, fallback: string) {
  const file = new URL(asset(`models/ar/${id}.glb`), location.href).href;
  const q = new URLSearchParams({ file, mode: 'ar_preferred', title, resizable: 'false' });
  if (isMagnet(id)) q.set('enable_vertical_placement', 'true');
  return `intent://arvr.google.com/scene-viewer/1.0?${q}#Intent;scheme=https;package=com.google.android.googlequicksearchbox;action=android.intent.action.VIEW;S.browser_fallback_url=${encodeURIComponent(fallback)};end;`;
}

// 流畅度档位（安卓适配，2026-11-14）。所有页面共用，首次 import 时就把档位写到 <html data-perf>。
//
//   high — 原样（电脑、iPhone/iPad、?perf=high）。
//   mid  — 安卓 / 鸿蒙 / 微信 X5·XWeb / 国产浏览器的默认：大画布像素比最高 1.5（原来 2），其余不变。
//   low  — 低端机（≤3GB 内存或 ≤4 核），或运行中持续掉帧后自动降到这一档：像素比最高 1.25、关掉抗锯齿 / 降阴影、
//          去掉 CSS 模糊 / 大阴影等昂贵效果。
//
// 自动降档：页面可见时用 rAF 量帧间隔，每 2 秒一窗；连续两窗中位数 > 30ms（< 约 33fps）就降一档（只降不升，免得来回跳）。
// 刚加载、刚转屏 / resize、刚切回前台的 2.5 秒不计。降档写进 localStorage（12 小时内有效），所以下一关直接从这一档开始。
// 降档时广播 `gift:perf` 事件并补发一次 resize，各关按 capDpr() 重新设置画布尺寸。
// URL：?perf=high|mid|low 固定档位（不自动降）；?perf=auto 清掉记下的档位。测试钩子 window.__perf。
export type Tier = 'high' | 'mid' | 'low';
const ORDER: Tier[] = ['high', 'mid', 'low'];
const KEY = 'gift.perf.v1';
const TTL = 12 * 3600e3;
const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
/** Android incl. HarmonyOS, the WeChat / QQ X5 · XWeb kernels and the Huawei / Xiaomi / vivo / OPPO / UC / Quark browsers */
export const isAndroid = /Android|HarmonyOS|OpenHarmony/i.test(ua);
export const inApp = /MicroMessenger|QQ\/|TBS\/|XWEB|MQQBrowser|Weibo|DingTalk|AlipayClient|Lark|Feishu/i.test(ua);
export const vendorBrowser = /HuaweiBrowser|HONORBrowser|MiuiBrowser|XiaoMi|VivoBrowser|HeyTapBrowser|OppoBrowser|UCBrowser|Quark|SamsungBrowser|baiduboxapp|SogouMobile|360/i.test(ua);
export const reducedMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

type Nav = Navigator & { deviceMemory?: number };
function detect(): Tier {
  if (!isAndroid && !(inApp && /Linux/i.test(ua))) return 'high';
  const mem = (navigator as Nav).deviceMemory, cores = navigator.hardwareConcurrency || 0;
  if ((mem && mem <= 3) || (cores && cores <= 4)) return 'low';
  return 'mid';
}
const lower = (a: Tier, b: Tier) => (ORDER.indexOf(a) >= ORDER.indexOf(b) ? a : b);

let forced: Tier | null = null;
let tier: Tier = 'high';
let reason = 'default';
const history: { tier: Tier; reason: string; at: number }[] = [];
const subs = new Set<(t: Tier) => void>();
{
  let q = '';
  try { q = new URLSearchParams(location.search).get('perf') || ''; } catch { /* */ }
  if (q === 'auto') { try { localStorage.removeItem(KEY); } catch { /* */ } }
  if (q === 'high' || q === 'mid' || q === 'low') { forced = q; tier = q; reason = 'url'; }
  else {
    tier = detect(); reason = isAndroid || inApp ? 'android' : 'default';
    try {
      const s = JSON.parse(localStorage.getItem(KEY) || 'null') as { tier?: Tier; t?: number } | null;
      if (s?.tier && ORDER.includes(s.tier) && Date.now() - (s.t || 0) < TTL && lower(s.tier, tier) !== tier) { tier = s.tier; reason = 'remembered'; }
    } catch { /* private mode */ }
  }
  history.push({ tier, reason, at: 0 });
  if (typeof document !== 'undefined') document.documentElement.dataset.perf = tier;
}

export const perfTier = () => tier;
/** device pixel ratio for a canvas, capped by the page's own maximum and by the current tier */
export function capDpr(max = 2): number {
  const d = (typeof devicePixelRatio === 'number' && devicePixelRatio) || 1;
  const cap = tier === 'low' ? 1.25 : tier === 'mid' ? 1.5 : Infinity;
  return Math.max(1, Math.min(d, max, cap));
}
/** call fn now and whenever the tier changes; returns an unsubscribe */
export function onPerf(fn: (t: Tier) => void): () => void { subs.add(fn); return () => subs.delete(fn); }
export function setTier(t: Tier, why = 'manual') {
  if (t === tier) return;
  tier = t; reason = why; history.push({ tier: t, reason: why, at: Math.round(performance.now()) });
  document.documentElement.dataset.perf = t;
  if (why === 'slow') { try { localStorage.setItem(KEY, JSON.stringify({ tier: t, t: Date.now() })); } catch { /* */ } }
  for (const f of subs) { try { f(t); } catch (e) { console.warn(e); } }
  dispatchEvent(new CustomEvent('gift:perf', { detail: { tier: t, reason: why } }));
  dispatchEvent(new Event('resize'));
}

// ---------- sustained-slow-frame watcher ----------
const WINDOW_MS = 2000, SLOW_MS = 30, QUIET_MS = 2500;
let quietUntil = 0, winStart = 0, slowWins = 0, last = 0, watching = false;
const samples: number[] = [];
const windows: number[] = [];
const quiet = () => { quietUntil = performance.now() + QUIET_MS; samples.length = 0; winStart = 0; last = 0; };
function tick(now: number) {
  if (!watching) return;
  requestAnimationFrame(tick);
  if (document.hidden) { last = 0; return; }
  if (now < quietUntil) { last = now; return; }
  if (last) samples.push(now - last);
  last = now;
  if (!winStart) winStart = now;
  if (now - winStart < WINDOW_MS) return;
  if (samples.length >= 8) {
    const s = samples.slice().sort((a, b) => a - b); const med = s[s.length >> 1];
    windows.push(Math.round(med * 10) / 10); if (windows.length > 30) windows.shift();
    slowWins = med > SLOW_MS ? slowWins + 1 : 0;
    if (slowWins >= 2 && !forced && tier !== 'low') { slowWins = 0; setTier(ORDER[ORDER.indexOf(tier) + 1], 'slow'); quiet(); }
  }
  samples.length = 0; winStart = now;
}
export function watchFrames() {
  if (watching || typeof requestAnimationFrame !== 'function') return;
  watching = true; quiet();
  addEventListener('resize', (e) => { if (e.isTrusted) quiet(); });
  document.addEventListener('visibilitychange', quiet);
  addEventListener('pageshow', quiet);
  requestAnimationFrame(tick);
}
if (typeof window !== 'undefined') {
  (window as unknown as { __perf?: unknown }).__perf = {
    tier: () => tier, reason: () => reason, history: () => history.slice(), windows: () => windows.slice(), forced: () => forced,
    capDpr, set: (t: Tier) => setTier(t, 'test'), android: isAndroid, inApp, vendorBrowser, gate: () => frameGate(),
  };
  watchFrames();
}

// ---------- 60 fps gate for 90/120 Hz screens ----------
// Many Android phones refresh at 90/120 Hz, so rAF loops render 1.5–2× as often as on a 60 Hz screen. On mid/low the
// heavy loops call gate(now) and skip drawing when the previous frame is less than ~15 ms old (simulation time still
// advances by the real elapsed time). high keeps every frame.
export function frameGate(): (now: number) => boolean {
  let lastDraw = -1e9;
  return (now: number) => {
    if (tier === 'high') { lastDraw = now; return true; }
    if (now - lastDraw < 14.5) return false;
    lastDraw = now; return true;
  };
}

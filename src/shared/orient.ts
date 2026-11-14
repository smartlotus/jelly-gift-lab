// 横竖屏切换过渡（所有页面共用；不锁方向）。
// 手机一转：一层带本关色调的柔光幕（背景虚化 + 轻微缩放 + 一个转动的小手机图标）盖上来，
// 等浏览器停止 resize（iOS 旋转时会连发多次）再补发一次 resize，让各关的画布 / 渲染器按最终尺寸重排，
// 然后柔光幕以"由中心向外散开"的方式淡出。prefers-reduced-motion：只做 0.2s 的纯淡入淡出，不动、不缩放。
// 由 mountChrome() / mountSurprise() / 秘密页各调用一次，重复调用无副作用。
import './orient.css';
import './perf.css';
import './perf'; // 流畅度档位：写 <html data-perf>，并开始持续掉帧检测
import './layout';

type Theme = { tint: string; ink: string; glow: string };
const THEMES: Record<string, Theme> = {
  meadow: { tint: 'rgba(158, 214, 255, .55)', ink: '#5a3208', glow: '#FFC93C' },
  shop: { tint: 'rgba(243, 226, 195, .62)', ink: '#6B4A2B', glow: '#F9C6CF' },
  ar: { tint: 'rgba(246, 239, 228, .62)', ink: '#6B4A2B', glow: '#F9C6CF' },
  night: { tint: 'rgba(8, 10, 22, .62)', ink: '#f4f4ee', glow: '#ff4a4a' },
  jelly: { tint: 'rgba(238, 236, 232, .6)', ink: '#141414', glow: '#F08AA4' },
  sea: { tint: 'rgba(6, 34, 52, .6)', ink: '#dff4ff', glow: '#7fd8ff' },
  sky: { tint: 'rgba(8, 12, 34, .62)', ink: '#f3eeff', glow: '#ffd45c' },
  coop: { tint: 'rgba(246, 239, 228, .62)', ink: '#2E2A2B', glow: '#8FCB9B' },
  flower: { tint: 'rgba(251, 227, 234, .6)', ink: '#6a3346', glow: '#EE8FA6' },
  mushroom: { tint: 'rgba(27, 22, 34, .62)', ink: '#efe6ff', glow: '#c9a8ff' },
  home: { tint: 'rgba(244, 231, 214, .62)', ink: '#4a3424', glow: '#FFD45C' },
  secret: { tint: 'rgba(246, 239, 232, .62)', ink: '#2a2420', glow: '#F9C6CF' },
};
const stageOf = () => {
  const m = location.pathname.replace(/\/index\.html$/, '/').match(/\/([a-z]+)\/$/);
  const id = m?.[1] ?? 'meadow';
  return id in THEMES ? id : 'meadow';
};
const PHONE = `<svg viewBox="0 0 48 48" aria-hidden="true"><rect x="15" y="6" width="18" height="36" rx="4" fill="none" stroke="currentColor" stroke-width="2.4"/><circle cx="24" cy="37" r="1.6" fill="currentColor"/></svg>`;

let mounted = false;
export function mountOrient() {
  if (mounted || typeof matchMedia !== 'function') return;
  mounted = true;
  const mq = matchMedia('(orientation: landscape)');
  const stage = stageOf();
  const th = THEMES[stage];
  document.documentElement.dataset.stageId = stage;
  const el = document.createElement('div');
  el.className = 'gs-orient';
  el.dataset.stage = stage;
  el.setAttribute('aria-hidden', 'true');
  el.style.setProperty('--or-tint', th.tint);
  el.style.setProperty('--or-ink', th.ink);
  el.style.setProperty('--or-glow', th.glow);
  el.innerHTML = `<div class="gs-or-glyph">${PHONE}</div>`;
  document.body.appendChild(el);
  const mark = () => { document.documentElement.dataset.orientation = mq.matches ? 'landscape' : 'portrait'; };
  mark();
  let lastResize = 0, timer = 0, held = false, runs = 0, pending: (() => void) | null = null;
  addEventListener('resize', e => { if (e.isTrusted) lastResize = performance.now(); });
  const finish = () => { el.classList.remove('on', 'cover', 'reveal', 'rm', 'to-land', 'to-port'); el.dataset.phase = 'idle'; document.documentElement.classList.remove('gs-orienting'); };
  const refit = () => { mark(); dispatchEvent(new Event('resize')); visualViewport?.dispatchEvent?.(new Event('resize')); };
  // Android: an on-screen keyboard (night's number lock) shrinks the viewport on older WebViews and flips
  // (orientation: landscape) without the phone turning. Use screen.orientation when there is one and skip the veil while typing.
  const typing = () => { const a = document.activeElement as HTMLElement | null; return !!a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA' || a.isContentEditable); };
  const screenLand = () => { const t = screen.orientation?.type; return t ? t.startsWith('landscape') : null; };
  let lastScreen = screenLand();
  function run() {
    const sl = screenLand();
    if (typing() && sl === lastScreen) { mark(); return; }
    lastScreen = sl;
    runs++; mark(); clearTimeout(timer);
    const rm = matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.className = `gs-orient on ${mq.matches ? 'to-land' : 'to-port'}${rm ? ' rm' : ' cover'}`;
    el.dataset.phase = 'cover';
    document.documentElement.classList.add('gs-orienting');
    const start = performance.now();
    const min = rm ? 120 : 300;
    const tick = () => {
      const now = performance.now();
      if (!held && now - start > min && now - lastResize > 160) {
        refit();
        requestAnimationFrame(() => requestAnimationFrame(() => {
          el.classList.remove('cover'); el.classList.add('reveal'); el.dataset.phase = 'reveal';
          timer = window.setTimeout(finish, rm ? 220 : 620);
        }));
      } else timer = window.setTimeout(tick, 50);
    };
    pending = tick;
    timer = window.setTimeout(tick, 50);
  }
  mq.addEventListener('change', run);
  // test hook (tools/lab-verify.mjs): freeze the veil to capture a mid-transition frame
  (window as unknown as { __orient?: unknown }).__orient = {
    run, runs: () => runs, phase: () => el.dataset.phase ?? 'idle',
    hold(progress = 0.5) { held = true; clearTimeout(timer); for (const a of el.getAnimations({ subtree: true })) { a.pause(); const d = Number(a.effect?.getTiming().duration) || 0; a.currentTime = d * progress; } },
    release() { held = false; for (const a of el.getAnimations({ subtree: true })) a.play(); if (el.dataset.phase === 'cover' && pending) timer = window.setTimeout(pending, 50); else if (el.dataset.phase === 'reveal') timer = window.setTimeout(finish, 620); },
  };
}

// Shared page chrome for the journey stages: zh/EN switch + sound toggle (top right, same typography as the jelly page),
// (v03g: the per-stage title/start cards are gone). Each stage calls mountChrome() once at boot; it also folds the
// iOS audio unlock invisibly into the first touch/key, so no page needs a "tap to start" card.
import './chrome.css';
import { apply, lang, onLang, setLang, t, type Lang } from './i18n';
import { onSound, setSound, soundOn, unlock, markGesture } from './audio';
import { mountStory } from './story';
import * as Sfx from './sfx';
import { mountOrient } from './orient';

// 2026-11-14 · stale-HTML guard: a page served from cache after a redeploy may ask for a lazy chunk (e.g. the shop's
// 3D viewer) whose hashed file is gone. Vite reports that as 'vite:preloadError' — reload once (per page, per 5 min) so
// the fresh HTML and its chunks are used, instead of a stage that silently never finishes loading.
window.addEventListener('vite:preloadError', (ev) => {
  try {
    const k = `gift.reload.${location.pathname}`, t = Number(sessionStorage.getItem(k) || 0);
    if (Date.now() - t < 5 * 60e3) return;
    sessionStorage.setItem(k, String(Date.now())); ev.preventDefault();
    const u = new URL(location.href); u.searchParams.set('r', Date.now().toString(36)); location.replace(u.href);
  } catch { /* storage blocked: leave it to the page's own error state */ }
});

export function mountChrome(opts: { sound?: boolean; theme?: 'light' | 'dark' } = {}) {
  document.documentElement.dataset.theme = opts.theme ?? 'light';
  const bar = document.createElement('div'); bar.className = 'gift-chrome';
  bar.innerHTML = `${opts.sound === false ? '' : '<button type="button" class="gc-sound"></button><span class="gc-sep" aria-hidden="true"></span>'}
    <div class="gc-lang" role="group" data-i18n-aria="ui.lang"><button type="button" data-lang="zh" lang="zh-CN">中</button><span aria-hidden="true">/</span><button type="button" data-lang="en" lang="en">EN</button></div>`;
  document.body.appendChild(bar);
  mountStory();
  mountOrient();
  const sync = () => {
    bar.querySelectorAll<HTMLButtonElement>('[data-lang]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.lang === lang)));
    const s = bar.querySelector<HTMLButtonElement>('.gc-sound');
    if (s) { s.textContent = t(soundOn() ? 'ui.sound.on' : 'ui.sound.off'); s.setAttribute('aria-pressed', String(soundOn())); }
  };
  bar.addEventListener('click', e => {
    const b = (e.target as HTMLElement).closest('button'); if (!b) return;
    if (b.dataset.lang) { setLang(b.dataset.lang as Lang); Sfx.tap(); }
    else if (b.classList.contains('gc-sound')) { unlock(); const next = !soundOn(); setSound(next); next ? Sfx.toggleOn() : Sfx.toggleOff(); }
  });
  onLang(sync); onSound(sync); apply(); sync();
  // invisible audio unlock: the very first gesture anywhere on the page creates/resumes the shared AudioContext (iOS rule)
  // Android Chrome / WebView: a touch pointerdown is not a user activation yet (touchend / pointerup / click are), so an
  // AudioContext made there stays 'suspended'. Keep listening until the context really runs.
  const evs = ['pointerdown', 'pointerup', 'touchend', 'click', 'keydown'];
  const done = () => evs.forEach(e => removeEventListener(e, first, true));
  const first = () => { markGesture(); const c = unlock(); if (c?.state === 'running') done(); else c?.resume().then(() => { if (c.state === 'running') done(); }, () => { /* no device */ }); };
  evs.forEach(e => addEventListener(e, first, { capture: true, passive: true }));
  return bar;
}

/** one-time soft pulse on the sound toggle (no text). Used by night on first entry when sound is still off. */
export function flashSound(times = 3) {
  const b = document.querySelector<HTMLButtonElement>('.gift-chrome .gc-sound');
  if (!b || soundOn()) return;
  try { if (sessionStorage.getItem('gift.sound.nudge') === '1') return; sessionStorage.setItem('gift.sound.nudge', '1'); } catch { /* */ }
  b.classList.add('nudge');
  setTimeout(() => b.classList.remove('nudge'), 900 * times + 400);
}


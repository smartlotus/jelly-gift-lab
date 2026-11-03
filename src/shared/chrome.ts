// Shared page chrome for the journey stages: zh/EN switch + sound toggle (top right, same typography as the jelly page),
// and a start card helper. Each stage calls mountChrome() once at boot.
import './chrome.css';
import { apply, lang, onLang, setLang, t, type Lang } from './i18n';
import { onSound, setSound, soundOn, unlock } from './audio';

export function mountChrome(opts: { sound?: boolean; theme?: 'light' | 'dark' } = {}) {
  document.documentElement.dataset.theme = opts.theme ?? 'light';
  const bar = document.createElement('div'); bar.className = 'gift-chrome';
  bar.innerHTML = `${opts.sound === false ? '' : '<button type="button" class="gc-sound"></button><span class="gc-sep" aria-hidden="true"></span>'}
    <div class="gc-lang" role="group" data-i18n-aria="ui.lang"><button type="button" data-lang="zh" lang="zh-CN">中</button><span aria-hidden="true">/</span><button type="button" data-lang="en" lang="en">EN</button></div>`;
  document.body.appendChild(bar);
  const sync = () => {
    bar.querySelectorAll<HTMLButtonElement>('[data-lang]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.lang === lang)));
    const s = bar.querySelector<HTMLButtonElement>('.gc-sound');
    if (s) { s.textContent = t(soundOn() ? 'ui.sound.on' : 'ui.sound.off'); s.setAttribute('aria-pressed', String(soundOn())); }
  };
  bar.addEventListener('click', e => {
    const b = (e.target as HTMLElement).closest('button'); if (!b) return;
    if (b.dataset.lang) setLang(b.dataset.lang as Lang);
    else if (b.classList.contains('gc-sound')) { unlock(); setSound(!soundOn()); }
  });
  onLang(sync); onSound(sync); apply(); sync();
  return bar;
}

/** full-screen start card (title + tap/press to begin). Resolves on the first gesture (which also unlocks audio). */
export function startCard(kicker: string, title: string, sub?: string): Promise<void> {
  const c = document.createElement('div'); c.className = 'gift-card';
  const touch = matchMedia('(pointer: coarse)').matches;
  c.innerHTML = `<p class="gk-kicker" data-i18n="${kicker}"></p><h1 class="gk-title" data-i18n="${title}"></h1>${sub ? `<p class="gk-sub" data-i18n="${sub}"></p>` : ''}<p class="gk-go" data-i18n="${touch ? 'ui.tap' : 'ui.press'}"></p>`;
  document.body.appendChild(c); apply(c);
  return new Promise(res => {
    const done = (e: Event) => {
      if ((e.target as HTMLElement)?.closest?.('.gift-chrome')) return;
      window.removeEventListener('pointerdown', done); window.removeEventListener('keydown', done);
      unlock(); c.classList.add('out'); setTimeout(() => c.remove(), 600); res();
    };
    window.addEventListener('pointerdown', done); window.addEventListener('keydown', done);
  });
}

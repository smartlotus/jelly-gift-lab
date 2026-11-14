// After the ending film (home's closing card): every hidden thing found → a small card counts down and opens the secret
// page (SECRET_PAGE in config.ts); something missing → the collection list slides up with hints and ways back.
// The closing card's own buttons (再看一遍 / 继续布置 / 从头再来) keep working and cancel whatever is pending.
import { t } from '../i18n';
import * as Sfx from '../sfx';
import { endRoute } from './collect';
import { openPanel, closePanel } from './panel';
import { SECRET_DELAY_S, LIST_DELAY_S } from './config';
import { openSecret } from './secret-link';
export { openSecret, secretUrl } from './secret-link';

let pending: { cancel(): void } | null = null;
/** call when the closing card comes up after the film. Returns a cancel function (also: cancelEnding()). */
export function startEnding(): () => void {
  cancelEnding();
  const route = endRoute();
  const timers: number[] = [];
  let card: HTMLElement | null = null;
  const cancel = () => { timers.forEach(clearTimeout); card?.classList.remove('on'); const c = card; card = null; setTimeout(() => c?.remove(), 600); if (pending === me) pending = null; };
  const me = { cancel };
  pending = me;
  if (route.kind === 'list') {
    timers.push(window.setTimeout(() => { if (pending === me) openPanel({ mode: 'after', here: 'home' }); }, LIST_DELAY_S * 1000));
    return cancel;
  }
  // all found: a small card with a 4 s fuse, 打开 now or 等一下
  timers.push(window.setTimeout(() => {
    if (pending !== me) return;
    card = document.createElement('div'); card.className = 'gs-end'; card.setAttribute('role', 'status');
    card.innerHTML = `<p>${t('gs.end.all')}</p><span class="gs-end-bar"><i></i></span><div><button type="button" class="gs-end-stay">${t('gs.end.stay')}</button><button type="button" class="primary gs-end-open">${t('gs.end.open')}</button></div>`;
    for (const k of ['pointerdown', 'pointerup', 'touchstart', 'touchend', 'click']) card.addEventListener(k, e => e.stopPropagation());
    document.body.appendChild(card);
    requestAnimationFrame(() => card?.classList.add('on'));
    const bar = card.querySelector<HTMLElement>('.gs-end-bar i')!;
    const FUSE = 4200;
    bar.animate?.([{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], { duration: FUSE, easing: 'linear', fill: 'forwards' });
    card.querySelector('.gs-end-open')!.addEventListener('click', () => { cancel(); void openSecret(); });
    card.querySelector('.gs-end-stay')!.addEventListener('click', () => { Sfx.tap(); cancel(); });
    timers.push(window.setTimeout(() => { if (pending === me) { cancel(); void openSecret(); } }, FUSE));
    Sfx.softChime();
  }, SECRET_DELAY_S * 1000 - 4200));
  return cancel;
}
export function cancelEnding() { pending?.cancel(); closePanel(); }

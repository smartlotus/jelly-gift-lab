// Stage 3 · Night - blocky (Minecraft-like) found-footage night walk; the pig always catches you; kawaii flip -> /jelly/.
// STUB: hold-to-walk placeholder + the flip. Workstream C replaces this (docs/GIFT_PLAN.md §5.3).
import { go, markReached } from '../../shared/flow';
import { register, t, apply } from '../../shared/i18n';
import { mountChrome, startCard } from '../../shared/chrome';
import { irisIn } from '../../shared/transition';
import * as dict from './dict';
import './style.css';

register(dict); mountChrome({ theme: 'dark' }); markReached();
void irisIn();
const host = document.getElementById('game')!;
void startCard('night.kicker', 'night.title', 'night.sub').then(() => {
  host.innerHTML = `<div class="n-rec">● REC</div><div class="n-eyes"><i></i><i></i></div>`;
  setTimeout(() => {
    document.documentElement.dataset.theme = 'light';
    host.innerHTML = `<div class="n-kawaii"><p class="n-caught">${t('night.caught')}</p><p class="n-sub" data-i18n="night.caught.sub"></p><button class="n-go" data-i18n="ui.continue"></button></div>`;
    apply(host);
    host.querySelector('.n-go')!.addEventListener('click', () => void go());
  }, 3200);
});

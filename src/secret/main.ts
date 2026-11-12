// /secret/ · PLACEHOLDER for the bonus page that opens after the ending film once every hidden thing is found.
// The owner has not designed it yet: this page only says so, and offers the way back. Its address is SECRET_PAGE in
// src/shared/surprise/config.ts; it is not part of the journey (not in STAGES, no skip-ahead target).
import { register, t, onLang, apply } from '../shared/i18n';
import { mountChrome } from '../shared/chrome';
import { stageUrl } from '../shared/flow';
import { irisIn } from '../shared/transition';
import * as dict from '../shared/surprise/dict';
import { allFound } from '../shared/surprise/collect';
import { openPanel } from '../shared/surprise/panel';
import '../shared/surprise/surprise.css';
import './style.css';

register(dict); mountChrome({ theme: 'dark' });
const root = document.getElementById('secret')!;
function render() {
  const ok = allFound();
  root.innerHTML = `<div class="sc-stars" aria-hidden="true">${Array.from({ length: 28 }, (_, i) => `<i style="left:${(i * 37) % 100}%;top:${(i * 53) % 100}%;animation-delay:${-(i % 7) * 0.6}s"></i>`).join('')}</div>
    <section class="sc-card"><svg class="sc-heart" viewBox="0 0 7 6" aria-hidden="true" shape-rendering="crispEdges"><path fill="#FFD45C" d="M1 0h2v1h1V0h2v1h1v2H6v1H5v1H4v1H3V5H2V4H1V3H0V1h1z"/><path fill="#FFF6C8" d="M1 1h1v1H1z"/></svg>
    <h1>${t('secret.meta.title')}</h1><p>${t(ok ? 'secret.soon' : 'secret.locked')}</p>
    <div class="sc-acts">${ok ? '' : `<button type="button" class="sc-list">${t('secret.list')}</button>`}<a class="sc-back" href="${stageUrl('home', { at: 'room' })}">${t('secret.back')}</a></div></section>`;
  root.querySelector('.sc-list')?.addEventListener('click', () => openPanel({ onClose: render }));
}
render(); apply(); onLang(() => { apply(); render(); });
void irisIn(innerWidth / 2, innerHeight / 2, 800, '#2a1e2a');

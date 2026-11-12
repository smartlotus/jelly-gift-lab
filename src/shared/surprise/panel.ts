// The collection list (成就列表): every stage, its hidden thing, found or not. A missing one shows a gentle hint and a way
// back to that stage. Opened from the pouch entry on any page, and after the ending film (mode 'after').
import type { StageId } from '../stage-list';
import { t, onLang } from '../i18n';
import { go, asset } from '../flow';
import * as Sfx from '../sfx';
import { COLLECT_STAGES, load, TOTAL } from './collect';
import { ITEMS } from './items';
import { openSecret } from './secret-link';

type HuntStage = Exclude<StageId, 'ar'>;
export interface PanelOpts {
  /** the page it is opened on (its row says "on this page" instead of a link) */
  here?: StageId;
  onHere?: () => void;
  /** 'after' = shown at the end of the journey: a headline about the last surprise */
  mode?: 'browse' | 'after';
  onClose?: () => void;
}
let open: HTMLElement | null = null;
const stop = (e: Event) => e.stopPropagation();

export function closePanel() { if (!open) return; const p = open; open = null; p.classList.remove('on'); setTimeout(() => p.remove(), 380); }
export const panelOpen = () => !!open;

export function openPanel(o: PanelOpts = {}) {
  if (open) return open;
  const wrap = document.createElement('div'); wrap.className = 'gs-panel'; wrap.setAttribute('role', 'dialog'); wrap.setAttribute('aria-modal', 'true');
  for (const k of ['pointerdown', 'pointerup', 'mousedown', 'touchstart', 'touchend', 'click', 'keydown', 'wheel']) wrap.addEventListener(k, stop);
  document.body.appendChild(wrap); open = wrap;
  const render = () => {
    const s = load(); const n = COLLECT_STAGES.filter(id => s.found[id]).length; const miss = TOTAL - n;
    const head = miss === 0 ? t('gs.list.done') : o.mode === 'after' ? t('gs.list.after', { n: miss }) : t('gs.list.missing', { n: miss });
    const rows = (COLLECT_STAGES as HuntStage[]).map((id, i) => {
      const got = !!s.found[id]; const shown = !!s.revealed[id];
      const hint = got ? '' : shown ? t(`gs.hint.${id}`) : t('gs.hint.first');
      const act = got ? '' : id === o.here
        ? `<button type="button" class="gs-row-go here" data-here="1">${t('gs.list.here')}</button>`
        : `<button type="button" class="gs-row-go" data-go="${id}">${t('gs.list.go')}</button>`;
      return `<li class="gs-row${got ? ' got' : ''}" data-stage="${id}"><span class="gs-row-n">${String(i + 1).padStart(2, '0')}</span>`
        + `<span class="gs-row-art" style="--gs-item:${Math.min(30, ITEMS[id].size)}px">${ITEMS[id].art(asset)}</span>`
        + `<span class="gs-row-t"><b>${t(`gs.stage.${id}`)}</b><span>${got ? t(`gs.item.${id}`) : t('gs.list.notyet')}</span>${hint ? `<em>${hint}</em>` : ''}</span>${act}</li>`;
    }).join('');
    wrap.innerHTML = `<div class="gs-card${o.mode === 'after' ? ' after' : ''}"><header><h2>${t('gs.list.title')}</h2><p class="gs-count">${t('gs.list.count', { n, total: TOTAL })}</p><p class="gs-head">${head}</p></header>`
      + `<ol class="gs-rows">${rows}</ol><footer><button type="button" class="gs-close">${t('gs.list.close')}</button>${miss === 0 ? `<button type="button" class="gs-open">${t('gs.end.open')}</button>` : ''}</footer></div>`;
  };
  render();
  onLang(() => { if (open === wrap) render(); });
  wrap.addEventListener('click', e => {
    const b = (e.target as HTMLElement).closest('button');
    if (!b) { if (e.target === wrap) { closePanel(); o.onClose?.(); } return; }
    Sfx.tap();
    if (b.classList.contains('gs-close')) { closePanel(); o.onClose?.(); return; }
    if (b.classList.contains('gs-open')) { closePanel(); void openSecret(); return; }
    if (b.dataset.here) { closePanel(); o.onClose?.(); setTimeout(() => o.onHere?.(), 380); return; }
    if (b.dataset.go) { const id = b.dataset.go as StageId; b.disabled = true; closePanel(); void go(id); }
  });
  wrap.addEventListener('keydown', e => { if (e.key === 'Escape') { closePanel(); o.onClose?.(); } });
  requestAnimationFrame(() => { wrap.classList.add('on'); wrap.querySelector<HTMLButtonElement>('.gs-close')?.focus({ preventScroll: true }); });
  return wrap;
}

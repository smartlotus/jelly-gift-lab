// On-screen touch controls (shown only on coarse pointers via CSS): ◀ ▶ on the left thumb, A (jump) [+ B (act)] on the right.
// Pointer events with capture, multi-touch safe; sliding a finger between ◀ and ▶ switches direction (like a real d-pad).
import { input, type Action } from './input';
import { t, onLang } from '../i18n';
const ICON: Record<string, string> = {
  left: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M15 5l-7 7 7 7"/></svg>',
  right: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M9 5l7 7-7 7"/></svg>',
  jump: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M5 15l7-7 7 7"/></svg>',
  act: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><circle cx="12" cy="12" r="3.2"/><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z"/></svg>',
};
export function mountTouch(opts: { act?: boolean; dpad?: boolean } = {}) {
  const pad = document.createElement('div'); pad.className = 'touchpad';
  const L = opts.dpad === false ? '' : `<div class="tp-group"><button data-act="left" class="tp-l">${ICON.left}</button><button data-act="right" class="tp-r">${ICON.right}</button></div>`;
  pad.innerHTML = `${L}<div class="tp-group">${opts.act ? `<button data-act="act" class="tp-b" hidden>${ICON.act}</button>` : ''}<button data-act="jump" class="tp-a">${ICON.jump}</button></div>`;
  document.body.appendChild(pad);
  const label = () => pad.querySelectorAll<HTMLButtonElement>('button').forEach(b => b.setAttribute('aria-label', t(`ctl.${b.dataset.act === 'jump' ? 'jump' : b.dataset.act}`)));
  label(); onLang(label);
  const owner = new Map<number, HTMLButtonElement>();
  const press = (id: number, b: HTMLButtonElement | null) => {
    const old = owner.get(id); if (old === b) return;
    if (old) { input.up(old.dataset.act as Action); old.classList.remove('on'); owner.delete(id); }
    if (b) { input.down(b.dataset.act as Action); b.classList.add('on'); owner.set(id, b); navigator.vibrate?.(6); }
  };
  pad.addEventListener('pointerdown', e => { const b = (e.target as HTMLElement).closest('button'); if (!b) return; e.preventDefault(); press(e.pointerId, b); });
  window.addEventListener('pointermove', e => {
    if (!owner.has(e.pointerId)) return;
    const el = document.elementFromPoint(e.clientX, e.clientY)?.closest('.touchpad button') as HTMLButtonElement | null;
    const cur = owner.get(e.pointerId)!;
    // slide between left/right only (don't steal jump)
    if (el && el !== cur && (el.dataset.act === 'left' || el.dataset.act === 'right') && (cur.dataset.act === 'left' || cur.dataset.act === 'right')) press(e.pointerId, el);
  });
  const end = (e: PointerEvent) => press(e.pointerId, null);
  window.addEventListener('pointerup', end); window.addEventListener('pointercancel', end);
  pad.addEventListener('contextmenu', e => e.preventDefault());
  return {
    el: pad,
    /** show/hide the contextual B button (e.g. "look" near an exhibit) */
    showAct(v: boolean) { const b = pad.querySelector<HTMLButtonElement>('.tp-b'); if (b) b.hidden = !v; },
  };
}

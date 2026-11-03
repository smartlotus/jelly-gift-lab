// Per-player controls: keyboard + on-screen pads. Solo (one phone, two players): pig pad on the left edge, cat pad on the
// right edge. Duo (own phone): one standard pad (◀ ▶ left thumb, ▲ right thumb).
export class Pad { l = false; r = false; held = false; seq = 0; private last = 0; get ax() { return (this.r ? 1 : 0) - (this.l ? 1 : 0); }
  /** jump pressed since the previous poll (seq lets the network carry presses without losing one) */
  hit(seq = this.seq) { const h = seq !== this.last; this.last = seq; return h; } }
const I = {
  l: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M15 5l-7 7 7 7"/></svg>',
  r: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M9 5l7 7-7 7"/></svg>',
  j: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M5 15l7-7 7 7"/></svg>',
};
export function mountPads(pads: Pad[], layout: 'solo' | 'duo') {
  const root = document.createElement('div'); root.className = `cp-pads cp-${layout}`;
  const group = (p: number, cls: string, keys: string) => `<div class="cp-g ${cls}" data-p="${p}">${[...keys].map(k => `<button type="button" data-k="${k}">${I[k as 'l']}</button>`).join('')}</div>`;
  root.innerHTML = layout === 'solo' ? group(0, 'cp-pig', 'lrj') + group(1, 'cp-cat', 'jlr') : group(0, 'cp-left', 'lr') + group(0, 'cp-right', 'j');
  document.body.appendChild(root);
  const own = new Map<number, HTMLButtonElement>();
  const set = (b: HTMLButtonElement, on: boolean) => {
    const p = pads[+b.closest<HTMLElement>('.cp-g')!.dataset.p!], k = b.dataset.k!; b.classList.toggle('on', on);
    if (k === 'l') p.l = on; else if (k === 'r') p.r = on; else { if (on && !p.held) p.seq++; p.held = on; }
  };
  root.addEventListener('pointerdown', e => { const b = (e.target as HTMLElement).closest('button'); if (!b) return; e.preventDefault(); try { root.releasePointerCapture(e.pointerId); } catch { /* */ } own.set(e.pointerId, b); set(b, true); navigator.vibrate?.(5); });
  window.addEventListener('pointermove', e => {
    const cur = own.get(e.pointerId); if (!cur || cur.dataset.k === 'j') return;
    const el = (document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null)?.closest<HTMLButtonElement>('.cp-pads button');
    if (el && el !== cur && el.dataset.k !== 'j' && el.closest('.cp-g') === cur.closest('.cp-g')) { set(cur, false); own.set(e.pointerId, el); set(el, true); }
  });
  const up = (e: PointerEvent) => { const b = own.get(e.pointerId); if (b) { set(b, false); own.delete(e.pointerId); } };
  window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up);
  root.addEventListener('touchstart', e => e.preventDefault(), { passive: false }); root.addEventListener('contextmenu', e => e.preventDefault());
  // keyboard: solo -> pig A/D/W, cat ←/→/↑ ; duo -> both sets drive your own character
  const map: Record<string, [number, 'l' | 'r' | 'j']> = layout === 'solo'
    ? { KeyA: [0, 'l'], KeyD: [0, 'r'], KeyW: [0, 'j'], ArrowLeft: [1, 'l'], ArrowRight: [1, 'r'], ArrowUp: [1, 'j'], Space: [1, 'j'] }
    : { KeyA: [0, 'l'], KeyD: [0, 'r'], KeyW: [0, 'j'], ArrowLeft: [0, 'l'], ArrowRight: [0, 'r'], ArrowUp: [0, 'j'], Space: [0, 'j'] };
  const key = (e: KeyboardEvent, on: boolean) => { const m = map[e.code]; if (!m) return; e.preventDefault(); const p = pads[m[0]]; if (m[1] === 'l') p.l = on; else if (m[1] === 'r') p.r = on; else { if (on && !p.held) p.seq++; p.held = on; } };
  window.addEventListener('keydown', e => key(e, true)); window.addEventListener('keyup', e => key(e, false));
  window.addEventListener('blur', () => pads.forEach(p => { p.l = p.r = p.held = false; }));
  return root;
}

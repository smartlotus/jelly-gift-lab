// v03f · on-screen controls for the branching night (portrait-phone first): way choices at a junction (big buttons with
// an arrow pointing where the path goes), "turn back", the item strip (3 note pieces, candle, ?? stickers n/5), a
// camcorder-style map with fast-forward travel to places already visited, and a small toast line.
import { t, apply } from '../../shared/i18n';
import { EDGES, NODES, type NodeId } from './map';

export interface Choice { key: string; label: string; ang: number; locked?: boolean; glow?: boolean; back?: boolean }
const arrow = (deg: number) => `<svg viewBox="0 0 24 24" style="transform:rotate(${deg}deg)" aria-hidden="true"><path d="M12 20V5M5.5 11.5L12 5l6.5 6.5"/></svg>`;
const stop = (el: HTMLElement) => { for (const ev of ['pointerdown', 'pointerup', 'touchstart', 'pointermove'] as const) el.addEventListener(ev, e => e.stopPropagation()); };

export function makeUI(host: HTMLElement) {
  const box = document.createElement('div'); box.className = 'nv'; host.appendChild(box);
  box.innerHTML = `
    <div class="nv-inv" aria-live="polite"><button type="button" class="nv-map" data-i18n-aria="night.ui.map"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z M9 4v14 M15 6v14"/></svg></button><span class="nv-notes"><i></i><i></i><i></i></span><span class="nv-candle" hidden>🕯</span><span class="nv-st"><b>??</b> <em>0/5</em></span></div>
    <div class="nv-choices" role="group"></div>
    <button type="button" class="nv-back" data-i18n-aria="night.ui.back"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 14L4 9l5-5M4 9h10a6 6 0 010 12h-3"/></svg><span data-i18n="night.ui.back"></span></button>
    <p class="nv-toast"></p>`;
  apply(box); stop(box.querySelector('.nv-inv')!); stop(box.querySelector('.nv-choices')!); stop(box.querySelector('.nv-back')!);
  const choices = box.querySelector<HTMLElement>('.nv-choices')!, back = box.querySelector<HTMLButtonElement>('.nv-back')!, toastEl = box.querySelector<HTMLElement>('.nv-toast')!;
  let onBack = () => {}; back.addEventListener('click', () => onBack());
  let onMap = () => {}; box.querySelector('.nv-map')!.addEventListener('click', () => onMap());
  let toastT = 0;
  return {
    showChoices(list: Choice[], pick: (key: string) => void) {
      const sorted = [...list].sort((a, b) => b.ang - a.ang); // left -> right
      choices.innerHTML = sorted.map(c => `<button type="button" class="nv-c${c.locked ? ' locked' : ''}${c.glow ? ' glow' : ''}${c.back ? ' back' : ''}" data-k="${c.key}">${arrow(-c.ang * 180 / Math.PI)}<span>${c.label}</span></button>`).join('');
      choices.querySelectorAll<HTMLButtonElement>('.nv-c').forEach(b => b.addEventListener('click', () => pick(b.dataset.k!)));
      choices.classList.add('on');
    },
    hideChoices() { choices.classList.remove('on'); choices.innerHTML = ''; },
    choicesShown: () => choices.classList.contains('on'),
    setBack(show: boolean, fn?: () => void) { back.classList.toggle('on', show); if (fn) onBack = fn; },
    setMap(fn: () => void) { onMap = fn; },
    setInv(notes: boolean[], candle: boolean, stickers: number) {
      box.querySelectorAll('.nv-notes i').forEach((i, k) => i.classList.toggle('on', notes[k]));
      (box.querySelector('.nv-candle') as HTMLElement).hidden = !candle;
      box.querySelector('.nv-st em')!.textContent = `${stickers}/5`; box.querySelector('.nv-st')!.classList.toggle('all', stickers >= 5);
    },
    bump(sel: 'notes' | 'candle' | 'st') { const el = box.querySelector(`.nv-${sel}`) as HTMLElement; el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); },
    toast(text: string, ms = 2600) { toastEl.textContent = text; toastEl.classList.add('on'); clearTimeout(toastT); toastT = window.setTimeout(() => toastEl.classList.remove('on'), ms); },
    hideAll(v: boolean) { box.classList.toggle('hide', v); },
  };
}
export type UI = ReturnType<typeof makeUI>;

/** the camcorder map: nodes + edges seen so far, "you are here", tap a visited place to fast-forward there */
export function openMap(cur: { x: number; z: number }, nodes: string[], edges: string[], canGo: boolean, travel: (n: NodeId) => void, lockKeys: Record<string, boolean>) {
  const el = document.createElement('section'); el.className = 'nv-mapov'; el.setAttribute('role', 'dialog');
  el.innerHTML = `<div class="nv-mapin"><p class="nv-mapt"><span class="rec">● REC</span> <span data-i18n="night.ui.map"></span></p><canvas></canvas><p class="nv-maph" data-i18n="${canGo ? 'night.ui.map.hint' : 'night.ui.map.no'}"></p><button type="button" class="nv-mapx" data-i18n="night.ui.close"></button></div>`;
  document.body.appendChild(el); apply(el); stop(el);
  const cv = el.querySelector('canvas')!; const W = Math.min(innerWidth - 40, 420), H = Math.min(innerHeight - 220, 560);
  const dpr = Math.min(2, devicePixelRatio || 1); cv.width = W * dpr; cv.height = H * dpr; cv.style.width = `${W}px`; cv.style.height = `${H}px`;
  const g = cv.getContext('2d')!; g.scale(dpr, dpr);
  const xs = Object.values(NODES).map(n => n.x), zs = Object.values(NODES).map(n => n.z);
  const minX = Math.min(...xs) - 6, maxX = Math.max(...xs) + 6, minZ = Math.min(...zs) - 6, maxZ = Math.max(...zs) + 6;
  const k = Math.min(W / (maxX - minX), H / (maxZ - minZ)); const ox = (W - (maxX - minX) * k) / 2, oy = (H - (maxZ - minZ) * k) / 2;
  const P = (x: number, z: number): [number, number] => [ox + (x - minX) * k, oy + (z - minZ) * k];
  const seenN = new Set(nodes), seenE = new Set(edges);
  g.fillStyle = '#0b0d12'; g.fillRect(0, 0, W, H);
  g.lineCap = 'round'; g.lineJoin = 'round';
  for (const e of EDGES) {
    const known = seenE.has(e.id), near = seenN.has(e.a) || seenN.has(e.b); if (!known && !near) continue;
    if (e.id === 'tree' && !lockKeys.tree) continue;
    g.beginPath(); for (let i = 0; i < e.xs.length; i += 4) { const [x, y] = P(e.xs[i], e.zs[i]); if (i) g.lineTo(x, y); else g.moveTo(x, y); } const [lx, ly] = P(e.xs[e.xs.length - 1], e.zs[e.zs.length - 1]); g.lineTo(lx, ly);
    g.setLineDash(known ? [] : [3, 5]); g.strokeStyle = known ? (e.theme === 'pink' ? '#f4a7b9' : '#d9cdb4') : 'rgba(217,205,180,.35)'; g.lineWidth = known ? 3 : 2; g.stroke();
  }
  g.setLineDash([]);
  const hits: { id: NodeId; x: number; y: number }[] = [];
  for (const n of Object.values(NODES)) {
    if (!seenN.has(n.id)) continue; const [x, y] = P(n.x, n.z);
    g.fillStyle = '#f1e4cf'; g.fillRect(x - 4, y - 4, 8, 8); hits.push({ id: n.id, x, y });
    g.font = `12px ${getComputedStyle(document.body).fontFamily}`; g.fillStyle = 'rgba(241,228,207,.8)'; g.textAlign = 'left'; g.fillText(t(`night.place.${n.id}`), x + 8, y + 4);
  }
  const [cx, cy] = P(cur.x, cur.z); g.fillStyle = '#ff5a76'; g.beginPath(); g.arc(cx, cy, 6, 0, Math.PI * 2); g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 1.5; g.stroke();
  const close = () => { el.classList.remove('on'); setTimeout(() => el.remove(), 300); };
  requestAnimationFrame(() => { el.classList.add('on'); const r = cv.getBoundingClientRect(); (window as unknown as { __mapHits: unknown }).__mapHits = Object.fromEntries(hits.map(h => [h.id, [r.left + h.x, r.top + h.y]])); });
  el.querySelector('.nv-mapx')!.addEventListener('click', close);
  cv.addEventListener('click', e => {
    if (!canGo) return; const r = cv.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
    let best: NodeId | null = null, bd = 26; for (const h of hits) { const d = Math.hypot(h.x - x, h.y - y); if (d < bd) { bd = d; best = h.id; } }
    if (best) { close(); travel(best); }
  });
  return close;
}

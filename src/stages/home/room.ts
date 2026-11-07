// Landscape furniture decorating: pick from a drawer, place, drag, flip, remove, undo, reset, persist.
// The empty room still has warm architecture (window, boards, floor). Items stay in bounds.
import { t, apply } from '../../shared/i18n';
import { KINDS, sprite, thumb, kindById, type Kind } from './furniture';
import { loadLayout, persistLayout, type SavedItem } from './save';
import { placed, saved, wood } from './sfx';

export interface Placed { id: number; kind: string; x: number; y: number; flip: boolean }

let uid = 1;

export interface RoomApi {
  update(dt: number): void;
  render(g: CanvasRenderingContext2D, w: number, h: number): void;
  items(): Placed[];
  furnishDemo(): void;
  destroy(): void;
  onSave: ((items: Placed[]) => void) | null;
}

export function createRoom(canvas: HTMLCanvasElement, toLogical: (cx: number, cy: number) => { x: number; y: number }): RoomApi {
  let items: Placed[] = loadLayout().items.map(i => ({ id: uid++, kind: i.kind, x: i.x, y: i.y, flip: !!i.flip }));
  const undo: Placed[][] = [];
  let selectedKind: string | null = null;
  let hold: { id: number; dx: number; dy: number } | null = null;
  let focus: number | null = items.length ? items[items.length - 1]!.id : null;
  let pulse = 0;
  let onSave: ((items: Placed[]) => void) | null = null;

  const snap = () => undo.push(items.map(i => ({ ...i })));

  const tools = document.createElement('div'); tools.className = 'hm-tools';
  tools.innerHTML = `<button type="button" data-k="undo" data-i18n="home.undo"></button>
    <button type="button" data-k="reset" data-i18n="home.reset"></button>
    <button type="button" class="primary" data-k="save" data-i18n="home.save"></button>`;
  document.body.appendChild(tools);

  const hint = document.createElement('p'); hint.className = 'hm-hint on'; hint.dataset.i18n = 'home.hint';
  document.body.appendChild(hint);

  const drawer = document.createElement('div'); drawer.className = 'hm-drawer';
  for (const k of KINDS) {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'hm-chip'; b.dataset.kind = k.id;
    b.appendChild(thumb(k.id));
    const lab = document.createElement('span'); lab.dataset.i18n = k.label; b.appendChild(lab);
    b.setAttribute('aria-label', t(k.label));
    drawer.appendChild(b);
  }
  document.body.appendChild(drawer);

  const sel = document.createElement('div'); sel.className = 'hm-sel';
  sel.innerHTML = `<button type="button" data-k="flip" data-i18n="home.rotate"></button><button type="button" data-k="del" data-i18n="home.remove"></button>`;
  document.body.appendChild(sel);

  const turn = document.createElement('div'); turn.className = 'hm-turn';
  turn.innerHTML = `<div class="hm-phone" aria-hidden="true"></div><p data-i18n="home.turn"></p><button type="button" data-k="skipturn" data-i18n="home.turn.skip"></button>`;
  document.body.appendChild(turn);

  const syncSel = () => {
    drawer.querySelectorAll<HTMLButtonElement>('.hm-chip').forEach(b => b.classList.toggle('on', b.dataset.kind === selectedKind));
    tools.querySelector<HTMLButtonElement>('[data-k=undo]')!.disabled = undo.length === 0;
    const it = items.find(i => i.id === focus);
    if (!it) { sel.classList.remove('on'); return; }
    sel.classList.add('on');
  };

  const bounds = (w: number, h: number) => {
    const floor = h - Math.max(28, Math.round(h * 0.16));
    const wall = Math.round(h * 0.28);
    const left = 14, right = w - 14;
    return { floor, wall, left, right, top: 18 };
  };

  const hit = (lx: number, ly: number, w: number, h: number): Placed | null => {
    const { floor } = bounds(w, h);
    for (let i = items.length - 1; i >= 0; i--) {
      const it = items[i]!;
      const k = kindById(it.kind); if (!k) continue;
      const img = sprite(it.kind, it.flip);
      const x = it.x - img.width / 2, y = (k.wall ? it.y : floor - it.y) - (k.wall ? 0 : img.height);
      if (lx >= x && lx <= x + img.width && ly >= y && ly <= y + img.height) return it;
    }
    return null;
  };

  const clamp = (it: Placed, w: number, h: number) => {
    const k = kindById(it.kind) ?? KINDS[0]!;
    const b = bounds(w, h);
    const half = k.w / 2;
    it.x = Math.max(b.left + half, Math.min(b.right - half, it.x));
    if (k.wall) it.y = Math.max(b.top, Math.min(b.wall - 4, it.y));
    else it.y = Math.max(0, Math.min(b.floor - b.wall - 4, it.y));
  };

  const orient = () => {
    const portrait = matchMedia('(orientation: portrait)').matches && innerHeight > innerWidth;
    document.body.classList.toggle('hm-portrait', portrait);
  };
  orient();
  window.addEventListener('resize', orient);

  const onTool = (e: Event) => {
    const b = (e.target as HTMLElement).closest('button'); if (!b) return;
    const k = b.dataset.k || b.dataset.kind;
    if (b.dataset.kind) { selectedKind = selectedKind === b.dataset.kind ? null : b.dataset.kind; syncSel(); return; }
    if (k === 'undo') { const prev = undo.pop(); if (prev) items = prev; focus = items.at(-1)?.id ?? null; syncSel(); return; }
    if (k === 'reset') { snap(); items = []; focus = null; persistLayout([]); syncSel(); wood(); return; }
    if (k === 'save') { persistLayout(items.map(({ kind, x, y, flip }) => ({ kind, x, y, flip }))); saved(); onSave?.(items); return; }
    if (k === 'skipturn') { document.body.classList.add('hm-turn-skip'); return; }
    const it = items.find(i => i.id === focus);
    if (k === 'flip' && it) { snap(); it.flip = !it.flip; wood(); }
    if (k === 'del' && it) { snap(); items = items.filter(i => i.id !== it.id); focus = null; wood(); }
    syncSel();
  };
  tools.addEventListener('click', onTool);
  drawer.addEventListener('click', onTool);
  sel.addEventListener('click', onTool);
  turn.addEventListener('click', onTool);

  const down = (e: PointerEvent) => {
    if ((e.target as HTMLElement).closest('.hm-drawer, .hm-tools, .hm-sel, .hm-turn, .gift-chrome')) return;
    const w = canvas.width, h = canvas.height;
    const p = toLogical(e.clientX, e.clientY);
    const it = hit(p.x, p.y, w, h);
    if (it) {
      e.preventDefault();
      hold = { id: it.id, dx: p.x - it.x, dy: p.y - (kindById(it.kind)?.wall ? it.y : it.y) };
      // lift to top
      items = items.filter(i => i.id !== it.id).concat(it);
      focus = it.id; selectedKind = null;
      try { canvas.setPointerCapture(e.pointerId); } catch { /* */ }
      snap();
      syncSel();
      return;
    }
    if (selectedKind) {
      e.preventDefault();
      const k = kindById(selectedKind); if (!k) return;
      const b = bounds(w, h);
      snap();
      const placedItem: Placed = {
        id: uid++, kind: selectedKind,
        x: p.x,
        y: k.wall ? p.y : Math.max(0, b.floor - p.y),
        flip: false,
      };
      clamp(placedItem, w, h);
      items.push(placedItem); focus = placedItem.id; selectedKind = null;
      placed(); syncSel();
    } else {
      focus = null; syncSel();
    }
  };
  const move = (e: PointerEvent) => {
    if (!hold) return;
    const it = items.find(i => i.id === hold!.id); if (!it) return;
    const p = toLogical(e.clientX, e.clientY);
    it.x = p.x - hold.dx;
    const k = kindById(it.kind);
    if (k?.wall) it.y = p.y - hold.dy;
    else it.y = Math.max(0, (canvas.height - Math.max(28, Math.round(canvas.height * 0.16))) - (p.y - hold.dy) - (k?.h ?? 0) + (k?.h ?? 0));
    // For floor items y is height above floor (feet). Recompute from pointer:
    if (!k?.wall) {
      const floor = canvas.height - Math.max(28, Math.round(canvas.height * 0.16));
      it.y = floor - p.y; // feet follow the finger's y, then clamp
    }
    clamp(it, canvas.width, canvas.height);
  };
  const up = () => { hold = null; };
  canvas.addEventListener('pointerdown', down);
  window.addEventListener('pointermove', move);
  window.addEventListener('pointerup', up);
  window.addEventListener('pointercancel', up);

  const drawRoom = (g: CanvasRenderingContext2D, w: number, h: number) => {
    const b = bounds(w, h);
    // walls
    g.fillStyle = '#F3E6D4'; g.fillRect(0, 0, w, b.floor);
    g.fillStyle = '#E8D4BC'; g.fillRect(0, b.floor - 8, w, 8); // baseboard
    // floor
    g.fillStyle = '#C4A07A'; g.fillRect(0, b.floor, w, h - b.floor);
    g.fillStyle = '#B08862';
    for (let y = b.floor + 4; y < h; y += 5) g.fillRect(0, y, w, 1);
    // window
    const wx = (w * 0.62) | 0, wy = 16, ww = Math.min(70, (w * 0.22) | 0), wh = Math.min(42, (h * 0.22) | 0);
    g.fillStyle = '#2E2A2B'; g.fillRect(wx, wy, ww, wh);
    g.fillStyle = '#BFD6E8'; g.fillRect(wx + 2, wy + 2, ww - 4, wh - 4);
    g.fillStyle = '#FFE6B8'; g.fillRect(wx + 2, wy + 2, (ww - 4) / 2, wh - 4);
    g.fillStyle = '#2E2A2B'; g.fillRect(wx + ww / 2 - 1, wy, 2, wh); g.fillRect(wx, wy + wh / 2 - 1, ww, 2);
    // curtains
    g.fillStyle = '#E8B0C0'; g.fillRect(wx - 4, wy, 6, wh + 8); g.fillRect(wx + ww - 2, wy, 6, wh + 8);
    // ceiling beam
    g.fillStyle = '#C4A06A'; g.fillRect(0, 0, w, 5);
    g.fillStyle = '#2E2A2B'; g.fillRect(0, 5, w, 1);
  };

  const api: RoomApi = {
    update(dt) { pulse += dt; },
    render(g, w, h) {
      drawRoom(g, w, h);
      const b = bounds(w, h);
      const order = [...items].sort((a, c) => {
        const ka = kindById(a.kind)?.layer ?? 'furn', kc = kindById(c.kind)?.layer ?? 'furn';
        const rank = (l: string) => l === 'rug' ? 0 : l === 'furn' ? 1 : l === 'top' ? 2 : 3;
        if (rank(ka) !== rank(kc)) return rank(ka) - rank(kc);
        return (c.y - a.y) || (a.id - c.id);
      });
      for (const it of order) {
        const k = kindById(it.kind); if (!k) continue;
        const img = sprite(it.kind, it.flip);
        const x = Math.round(it.x - img.width / 2);
        const y = k.wall ? Math.round(it.y) : Math.round(b.floor - it.y - img.height);
        g.drawImage(img, x, y);
        if (it.id === focus) {
          g.strokeStyle = `rgba(46,42,43,${0.45 + Math.sin(pulse * 4) * 0.2})`;
          g.lineWidth = 1; g.strokeRect(x - 1, y - 1, img.width + 2, img.height + 2);
        }
      }
    },
    items: () => items,
    furnishDemo() {
      items = [
        { id: uid++, kind: 'rug', x: 120, y: 8, flip: false },
        { id: uid++, kind: 'sofa', x: 120, y: 14, flip: false },
        { id: uid++, kind: 'coffee', x: 122, y: 4, flip: false },
        { id: uid++, kind: 'lamp', x: 160, y: 4, flip: false },
        { id: uid++, kind: 'tv', x: 50, y: 6, flip: false },
        { id: uid++, kind: 'bed', x: 240, y: 10, flip: false },
        { id: uid++, kind: 'roses', x: 190, y: 4, flip: false },
        { id: uid++, kind: 'lisi', x: 80, y: 4, flip: false },
        { id: uid++, kind: 'cattree', x: 30, y: 4, flip: false },
        { id: uid++, kind: 'dogbed', x: 200, y: 2, flip: false },
        { id: uid++, kind: 'frame', x: 90, y: 22, flip: false },
        { id: uid++, kind: 'lights', x: 150, y: 12, flip: false },
      ];
      persistLayout(items.map(({ kind, x, y, flip }) => ({ kind, x, y, flip })));
    },
    destroy() {
      tools.remove(); drawer.remove(); hint.remove(); sel.remove(); turn.remove();
      canvas.removeEventListener('pointerdown', down);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      window.removeEventListener('resize', orient);
    },
    get onSave() { return onSave; },
    set onSave(f) { onSave = f; },
  };
  syncSel(); apply();
  // expose for tests
  (window as unknown as { __homeRoom?: { items: () => Placed[]; save: () => void } }).__homeRoom = {
    items: () => items,
    save: () => { persistLayout(items.map(({ kind, x, y, flip }) => ({ kind, x, y, flip }))); onSave?.(items); },
  };
  return api;
}

export function drawFurnished(g: CanvasRenderingContext2D, w: number, h: number, items: SavedItem[], scale = 1) {
  // reused by montage: paint a compact room using saved (or default) furniture
  const floor = h - Math.max(16, Math.round(h * 0.14));
  g.fillStyle = '#F3E6D4'; g.fillRect(0, 0, w, floor);
  g.fillStyle = '#C4A07A'; g.fillRect(0, floor, w, h - floor);
  g.fillStyle = '#BFD6E8'; g.fillRect((w * 0.62) | 0, 10, Math.min(48, w * 0.18), Math.min(28, h * 0.18));
  const list = items.length ? items : [
    { kind: 'rug', x: w * 0.45, y: 6, flip: false },
    { kind: 'sofa', x: w * 0.45, y: 12, flip: false },
    { kind: 'tv', x: w * 0.18, y: 6, flip: false },
  ];
  const sorted = [...list].sort((a, b) => (kindById(a.kind)?.layer === 'rug' ? -1 : 0) - (kindById(b.kind)?.layer === 'rug' ? -1 : 0) || a.y - b.y);
  for (const it of sorted) {
    const k = kindById(it.kind); if (!k) continue;
    const img = sprite(it.kind, it.flip);
    const x = Math.round(it.x * (scale === 1 ? 1 : scale) - img.width / 2);
    // saved coords were from the decorating screen — scale x into this frame
    const xx = Math.round((it.x / 320) * w - img.width / 2);
    const y = k.wall ? Math.round((it.y / 180) * h) : floor - img.height - Math.round(it.y * 0.4);
    g.drawImage(img, Math.max(-img.width + 4, Math.min(w - 4, xx)), y);
    void x;
  }
}

export const SAVE_KEY = 'gift.home.layout.v1';
export interface SavedItem { kind: string; x: number; y: number; flip: boolean }
export interface Layout { v: 1; items: SavedItem[] }

export function loadLayout(): Layout {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return { v: 1, items: [] };
    const o = JSON.parse(raw) as Layout;
    if (!o || o.v !== 1 || !Array.isArray(o.items)) return { v: 1, items: [] };
    return { v: 1, items: o.items.filter(i => i && typeof i.kind === 'string' && Number.isFinite(i.x) && Number.isFinite(i.y)) };
  } catch { return { v: 1, items: [] }; }
}
export function persistLayout(items: SavedItem[]) {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify({ v: 1, items })); } catch { /* private mode */ }
}
export function clearLayout() { try { localStorage.removeItem(SAVE_KEY); } catch { /* */ } }

// Module A persistence only. v2 stores world-floor x/z and yaw in degrees (0/90/180/270).
// Legacy v1 used 2D sprite stickers (x/y/flip) and cannot be mapped into the diorama —
// we reset with a truthful hint rather than guessing.
export const SAVE_KEY = 'gift.home.layout.v2';
export const SAVE_KEY_LEGACY = 'gift.home.layout.v1';

export interface SavedItem {
  kind: string;
  x: number;
  z: number;
  yaw: number;
}

export type LoadNotice = 'ok' | 'empty' | 'reset';

function valid(i: SavedItem): boolean {
  return !!i && typeof i.kind === 'string' && Number.isFinite(i.x) && Number.isFinite(i.z) && Number.isFinite(i.yaw);
}

function normYaw(y: number): number {
  const t = ((Math.round(y / 90) * 90) % 360 + 360) % 360;
  return t;
}

export function loadLayout(): { items: SavedItem[]; notice: LoadNotice } {
  try {
    const raw2 = localStorage.getItem(SAVE_KEY);
    if (raw2) {
      const o = JSON.parse(raw2) as { v?: number; items?: SavedItem[] };
      if (o && o.v === 2 && Array.isArray(o.items)) {
        return { items: o.items.filter(valid).map(i => ({ kind: i.kind, x: i.x, z: i.z, yaw: normYaw(i.yaw) })), notice: 'ok' };
      }
    }
    const raw1 = localStorage.getItem(SAVE_KEY_LEGACY);
    if (raw1) return { items: [], notice: 'reset' };
  } catch { /* private mode / bad json */ }
  return { items: [], notice: 'empty' };
}

export function persistLayout(items: SavedItem[]) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({
      v: 2,
      items: items.map(i => ({ kind: i.kind, x: +i.x, z: +i.z, yaw: normYaw(i.yaw) })),
    }));
    localStorage.removeItem(SAVE_KEY_LEGACY);
  } catch { /* private mode */ }
}

export function clearLayout() {
  try {
    localStorage.removeItem(SAVE_KEY);
    localStorage.removeItem(SAVE_KEY_LEGACY);
  } catch { /* */ }
}

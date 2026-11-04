// v03f · progress save for the branching night (localStorage; private mode just forgets).
import type { NodeId } from './map';
export interface Save {
  v: 3; node: NodeId; notes: [boolean, boolean, boolean]; candle: boolean;
  stickers: string[]; solved: string[]; scares: string[]; edges: string[]; nodes: string[]; endings: string[];
}
const KEY = 'gift.night.v3';
export const fresh = (endings: string[] = []): Save => ({ v: 3, node: 'S', notes: [false, false, false], candle: false, stickers: [], solved: [], scares: [], edges: [], nodes: ['S'], endings });
export function load(): Save | null {
  try { const s = JSON.parse(localStorage.getItem(KEY) || 'null'); return s && s.v === 3 ? { ...fresh(), ...s } : null; } catch { return null; }
}
export function store(s: Save) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* private mode */ } }
export const hasProgress = (s: Save | null) => !!s && (s.node !== 'S' || s.edges.length > 1 || s.stickers.length > 0);

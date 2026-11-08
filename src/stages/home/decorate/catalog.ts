// Floor furniture for Module A. Wall stickers (frame / lights) stay out —
// they had no volumetric footprint. Sizes are half-extents at yaw 0 (x = width, z = depth).
import type { SavedItem } from '../save';

export interface Kind3 {
  id: string;
  label: `home.item.${string}`;
  w: number;
  d: number;
  collide: boolean;
}

export const FLOOR_KINDS: Kind3[] = [
  { id: 'rug', label: 'home.item.rug', w: 1.85, d: 1.22, collide: false },
  { id: 'sofa', label: 'home.item.sofa', w: 1.18, d: 0.50, collide: true },
  { id: 'armchair', label: 'home.item.armchair', w: 0.50, d: 0.48, collide: true },
  { id: 'coffee', label: 'home.item.coffee', w: 0.72, d: 0.44, collide: true },
  { id: 'table', label: 'home.item.table', w: 0.78, d: 0.78, collide: true },
  { id: 'chair', label: 'home.item.chair', w: 0.28, d: 0.30, collide: true },
  { id: 'bed', label: 'home.item.bed', w: 1.12, d: 0.88, collide: true },
  { id: 'night', label: 'home.item.night', w: 0.28, d: 0.28, collide: true },
  { id: 'shelf', label: 'home.item.shelf', w: 0.58, d: 0.24, collide: true },
  { id: 'tv', label: 'home.item.tv', w: 0.88, d: 0.30, collide: true },
  { id: 'lamp', label: 'home.item.lamp', w: 0.20, d: 0.20, collide: true },
  { id: 'wardrobe', label: 'home.item.wardrobe', w: 0.58, d: 0.30, collide: true },
  { id: 'side', label: 'home.item.side', w: 0.28, d: 0.28, collide: true },
  { id: 'cushion', label: 'home.item.cushion', w: 0.32, d: 0.32, collide: true },
  { id: 'cattree', label: 'home.item.cattree', w: 0.34, d: 0.34, collide: true },
  { id: 'dogbed', label: 'home.item.dogbed', w: 0.44, d: 0.40, collide: true },
  { id: 'roses', label: 'home.item.roses', w: 0.14, d: 0.14, collide: true },
  { id: 'lisi', label: 'home.item.lisi', w: 0.14, d: 0.14, collide: true },
];

export const ROOM = { w: 8.4, d: 6.2, h: 2.72, wall: 2.58 };

export function kind3(id: string): Kind3 | undefined {
  return FLOOR_KINDS.find(k => k.id === id);
}

export function extents(kind: string, yaw: number): { hw: number; hd: number } {
  const k = kind3(kind);
  if (!k) return { hw: 0.2, hd: 0.2 };
  const q = ((Math.round(yaw / 90) * 90) % 360 + 360) % 360;
  return q === 90 || q === 270 ? { hw: k.d, hd: k.w } : { hw: k.w, hd: k.d };
}

export function demoLayout3(): SavedItem[] {
  return [
    { kind: 'rug', x: 0, z: 0.2, yaw: 0 },
    { kind: 'sofa', x: 0, z: -1.6, yaw: 0 },
    { kind: 'coffee', x: 0, z: 0.2, yaw: 0 },
    { kind: 'armchair', x: -2.15, z: -0.95, yaw: 90 },
    { kind: 'tv', x: 0, z: 2.3, yaw: 180 },
    { kind: 'lamp', x: -2.15, z: -2.25, yaw: 0 },
    { kind: 'shelf', x: -3.4, z: -2.4, yaw: 0 },
    { kind: 'wardrobe', x: -3.4, z: 0.2, yaw: 90 },
    { kind: 'table', x: 2.5, z: 1.5, yaw: 0 },
    { kind: 'chair', x: 2.5, z: 0.35, yaw: 0 },
    { kind: 'bed', x: 2.55, z: -1.85, yaw: 90 },
    { kind: 'night', x: 3.6, z: -0.35, yaw: 0 },
    { kind: 'roses', x: 1.05, z: 0.15, yaw: 0 },
    { kind: 'lisi', x: -3.15, z: -1.55, yaw: 0 },
    { kind: 'cattree', x: -3.35, z: 1.85, yaw: 0 },
    { kind: 'dogbed', x: -1.6, z: 1.85, yaw: 0 },
  ];
}

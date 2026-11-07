// Pixel furniture for the decorating game and (later) the furnished home in the montage.
// Drawn as crisp outlined blocks — warm wood, cream upholstery, the two bouquet flowers in vases.
import { drawDianaRose, drawLisianthusBloom } from '../wander/blooms';

export type Layer = 'rug' | 'furn' | 'wall' | 'top';
export interface Kind {
  id: string;
  label: `home.item.${string}`;
  layer: Layer;
  w: number; h: number;
  wall?: boolean;
}

export const KINDS: Kind[] = [
  { id: 'rug', label: 'home.item.rug', layer: 'rug', w: 70, h: 18 },
  { id: 'sofa', label: 'home.item.sofa', layer: 'furn', w: 52, h: 24 },
  { id: 'armchair', label: 'home.item.armchair', layer: 'furn', w: 22, h: 22 },
  { id: 'coffee', label: 'home.item.coffee', layer: 'furn', w: 28, h: 14 },
  { id: 'table', label: 'home.item.table', layer: 'furn', w: 36, h: 18 },
  { id: 'chair', label: 'home.item.chair', layer: 'furn', w: 14, h: 20 },
  { id: 'bed', label: 'home.item.bed', layer: 'furn', w: 48, h: 26 },
  { id: 'night', label: 'home.item.night', layer: 'furn', w: 14, h: 16 },
  { id: 'shelf', label: 'home.item.shelf', layer: 'furn', w: 22, h: 36 },
  { id: 'tv', label: 'home.item.tv', layer: 'furn', w: 34, h: 24 },
  { id: 'lamp', label: 'home.item.lamp', layer: 'furn', w: 12, h: 34 },
  { id: 'wardrobe', label: 'home.item.wardrobe', layer: 'furn', w: 24, h: 38 },
  { id: 'side', label: 'home.item.side', layer: 'furn', w: 14, h: 16 },
  { id: 'cushion', label: 'home.item.cushion', layer: 'furn', w: 16, h: 10 },
  { id: 'cattree', label: 'home.item.cattree', layer: 'furn', w: 18, h: 32 },
  { id: 'dogbed', label: 'home.item.dogbed', layer: 'furn', w: 22, h: 12 },
  { id: 'roses', label: 'home.item.roses', layer: 'top', w: 14, h: 22 },
  { id: 'lisi', label: 'home.item.lisi', layer: 'top', w: 14, h: 22 },
  { id: 'frame', label: 'home.item.frame', layer: 'wall', w: 16, h: 14, wall: true },
  { id: 'lights', label: 'home.item.lights', layer: 'wall', w: 40, h: 10, wall: true },
];

const ink = '#2E2A2B';
function box(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, fill: string, edge = ink) {
  g.fillStyle = fill; g.fillRect(x, y, w, h);
  g.fillStyle = edge;
  g.fillRect(x, y, w, 1); g.fillRect(x, y + h - 1, w, 1);
  g.fillRect(x, y, 1, h); g.fillRect(x + w - 1, y, 1, h);
}

function paint(kind: Kind, g: CanvasRenderingContext2D) {
  const { w, h, id } = kind;
  if (id === 'rug') {
    box(g, 0, 2, w, h - 2, '#C96A6A', '#8A3A3A');
    g.fillStyle = '#E8A0A0';
    for (let x = 3; x < w - 3; x += 4) g.fillRect(x, 5, 2, h - 8);
  } else if (id === 'sofa') {
    box(g, 2, 4, w - 4, 14, '#E8D4B8');
    box(g, 0, 6, 8, 16, '#DCC4A4');
    box(g, w - 8, 6, 8, 16, '#DCC4A4');
    box(g, 8, 6, w - 16, 10, '#F0E2CA');
    g.fillStyle = ink; g.fillRect(4, h - 3, 3, 3); g.fillRect(w - 7, h - 3, 3, 3);
  } else if (id === 'armchair') {
    box(g, 3, 4, w - 6, 12, '#E8D4B8');
    box(g, 0, 8, 5, 12, '#DCC4A4');
    box(g, w - 5, 8, 5, 12, '#DCC4A4');
    g.fillStyle = ink; g.fillRect(3, h - 3, 3, 3); g.fillRect(w - 6, h - 3, 3, 3);
  } else if (id === 'coffee' || id === 'side' || id === 'night') {
    box(g, 0, 4, w, 6, '#C4A06A');
    g.fillStyle = '#8A6A40'; g.fillRect(2, 10, 2, h - 10); g.fillRect(w - 4, 10, 2, h - 10);
    if (id === 'night') { g.fillStyle = '#F4EED8'; g.fillRect(3, 1, 8, 4); g.fillStyle = ink; g.fillRect(3, 1, 8, 1); }
  } else if (id === 'table') {
    box(g, 0, 6, w, 5, '#C4A06A');
    g.fillStyle = '#8A6A40';
    g.fillRect(2, 11, 2, h - 11); g.fillRect(w - 4, 11, 2, h - 11);
  } else if (id === 'chair') {
    box(g, 1, 0, w - 2, 8, '#C4A06A');
    box(g, 1, 8, w - 2, 5, '#D4B47A');
    g.fillStyle = '#8A6A40'; g.fillRect(2, 13, 2, h - 13); g.fillRect(w - 4, 13, 2, h - 13);
  } else if (id === 'bed') {
    box(g, 0, 8, w, h - 10, '#E8D8C0');
    box(g, 2, 4, 12, 10, '#F4EEF2'); // pillows
    box(g, 16, 6, w - 20, 10, '#F0C8D0');
    g.fillStyle = '#C4A06A'; g.fillRect(0, h - 4, w, 4);
  } else if (id === 'shelf') {
    box(g, 0, 0, w, h, '#C4A06A');
    g.fillStyle = '#8A6A40';
    for (let y = 6; y < h - 2; y += 8) g.fillRect(2, y, w - 4, 2);
    g.fillStyle = '#6A8CB0'; g.fillRect(4, 8, 5, 6); g.fillStyle = '#C85A6A'; g.fillRect(11, 8, 6, 6);
    g.fillStyle = '#E8D078'; g.fillRect(4, 18, 6, 5);
  } else if (id === 'tv') {
    box(g, 2, 10, w - 4, 8, '#C4A06A');
    box(g, 0, 0, w, 16, '#2A2A30');
    g.fillStyle = '#6A9AB8'; g.fillRect(2, 2, w - 4, 12);
    g.fillStyle = '#F4F0A8'; g.fillRect(w / 2 - 2, 5, 4, 3);
  } else if (id === 'lamp') {
    g.fillStyle = ink; g.fillRect(w / 2 - 1, 10, 2, h - 12);
    box(g, 1, 0, w - 2, 12, '#F4E6B0');
    g.fillStyle = '#C4A06A'; g.fillRect(2, h - 3, w - 4, 3);
  } else if (id === 'wardrobe') {
    box(g, 0, 0, w, h, '#C4A06A');
    g.fillStyle = ink; g.fillRect(w / 2 - 1, 2, 2, h - 6);
    g.fillStyle = '#E8D078'; g.fillRect(4, h / 2, 3, 3); g.fillRect(w - 7, h / 2, 3, 3);
  } else if (id === 'cushion') {
    box(g, 0, 2, w, h - 2, '#D87890');
    g.fillStyle = '#F0A8B8'; g.fillRect(3, 4, w - 6, h - 6);
  } else if (id === 'cattree') {
    g.fillStyle = '#C4A06A'; g.fillRect(2, h - 4, w - 4, 4);
    g.fillStyle = '#D8B878'; g.fillRect(w / 2 - 2, 6, 4, h - 8);
    box(g, 0, 0, 12, 8, '#E8C878');
    box(g, 6, 14, 12, 7, '#E8C878');
  } else if (id === 'dogbed') {
    box(g, 0, 4, w, h - 4, '#6A7A8A');
    g.fillStyle = '#C8D0D8'; g.fillRect(3, 6, w - 6, h - 8);
  } else if (id === 'roses') {
    g.fillStyle = '#C4D0B8'; box(g, 3, 12, 8, 10, '#E8F0DC');
    drawDianaRose(g, 7, 7, 3.4, 1);
  } else if (id === 'lisi') {
    g.fillStyle = '#C4D0B8'; box(g, 3, 12, 8, 10, '#E8F0DC');
    drawLisianthusBloom(g, 7, 7, 3.2, 0);
  } else if (id === 'frame') {
    box(g, 0, 0, w, h, '#C4A06A');
    g.fillStyle = '#E8D8C8'; g.fillRect(2, 2, w - 4, h - 4);
    g.fillStyle = '#E890A8'; g.fillRect(4, 5, 3, 4);
    g.fillStyle = '#2E2A2B'; g.fillRect(8, 4, 3, 5);
  } else if (id === 'lights') {
    g.fillStyle = ink; g.fillRect(0, 1, w, 1);
    for (let i = 2; i < w; i += 5) {
      g.fillStyle = i % 10 === 2 ? '#F0E080' : '#F0A0B0';
      g.fillRect(i, 3, 3, 3);
    }
  }
}

const cache = new Map<string, HTMLCanvasElement>();
export function sprite(id: string, flip = false): HTMLCanvasElement {
  const key = id + (flip ? ':f' : '');
  const hit = cache.get(key); if (hit) return hit;
  const kind = KINDS.find(k => k.id === id) ?? KINDS[0]!;
  const c = document.createElement('canvas'); c.width = kind.w; c.height = kind.h;
  const g = c.getContext('2d')!;
  paint(kind, g);
  if (flip) {
    const f = document.createElement('canvas'); f.width = c.width; f.height = c.height;
    const fg = f.getContext('2d')!;
    fg.translate(c.width, 0); fg.scale(-1, 1); fg.drawImage(c, 0, 0);
    cache.set(key, f); return f;
  }
  cache.set(key, c); return c;
}

export function kindById(id: string): Kind | undefined { return KINDS.find(k => k.id === id); }

export function thumb(id: string): HTMLCanvasElement {
  const src = sprite(id);
  const c = document.createElement('canvas'); c.width = 48; c.height = 40;
  const g = c.getContext('2d')!;
  g.imageSmoothingEnabled = false;
  const s = Math.min(44 / src.width, 36 / src.height);
  const dw = Math.max(1, Math.round(src.width * s)), dh = Math.max(1, Math.round(src.height * s));
  g.drawImage(src, 0, 0, src.width, src.height, ((48 - dw) / 2) | 0, ((40 - dh) / 2) | 0, dw, dh);
  return c;
}

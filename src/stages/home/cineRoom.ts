// Module B: a fixed painted interior used only by the cinematic montage.
// Never reads the player's saved layout. Empty, cluttered, or rotated rooms
// from Module A produce the exact same film.
import { sprite, kindById } from './furniture';
import { art } from '../../art/loader';
import { alignPlateFloor } from '../../art/blit';

interface CineItem { kind: string; x: number; y: number; flip: boolean }

// Designed blocking — copied from the previous art-directed sitting room,
// not from anything the player placed.
const CINE_ITEMS: CineItem[] = [
  { kind: 'rug', x: 138, y: -10, flip: false },
  { kind: 'sofa', x: 142, y: 4, flip: false },
  { kind: 'coffee', x: 144, y: -16, flip: false },
  { kind: 'lamp', x: 192, y: 3, flip: false },
  { kind: 'tv', x: 48, y: 3, flip: false },
  { kind: 'bed', x: 256, y: -14, flip: false },
  { kind: 'night', x: 296, y: -10, flip: false },
  { kind: 'roses', x: 160, y: -16, flip: false },
  { kind: 'lisi', x: 92, y: 2, flip: false },
  { kind: 'cattree', x: 22, y: -8, flip: false },
  { kind: 'dogbed', x: 198, y: -18, flip: false },
  { kind: 'frame', x: 90, y: 22, flip: false },
  { kind: 'lights', x: 154, y: 12, flip: false },
];

function drawWoodFloor(g: CanvasRenderingContext2D, w: number, h: number, floor: number) {
  const fh = h - floor;
  g.fillStyle = '#D4B48A';
  g.fillRect(0, floor, w, Math.max(1, fh));
  const edges: number[] = [floor];
  const n = 6;
  for (let i = 1; i <= n; i++) {
    const y = Math.round(floor + (i / n) * (i / n) * fh);
    const prev = edges[edges.length - 1]!;
    if (y >= prev + 5) edges.push(y);
  }
  if (edges[edges.length - 1]! < h) edges.push(h);
  for (let i = 0; i < edges.length - 1; i++) {
    const y0 = edges[i]!, y1 = edges[i + 1]!;
    g.fillStyle = i % 2 ? '#C4A07A' : '#D4B48A';
    g.fillRect(0, y0, w, y1 - y0);
    if (y1 - y0 >= 6) {
      g.fillStyle = '#E0C49A';
      g.fillRect(0, y0, w, 1);
    }
  }
  g.fillStyle = '#A88860';
  g.fillRect(0, floor, w, 2);
}

function drawArchitecture(g: CanvasRenderingContext2D, w: number, h: number, floor: number) {
  const plate = art.plates.interior;
  if (plate) {
    g.fillStyle = '#E6D4B8';
    g.fillRect(0, 0, w, floor);
    g.fillStyle = '#C4A06A';
    g.fillRect(0, floor, w, Math.max(1, h - floor));
    alignPlateFloor(g, plate, w, floor, 0.72);
    return;
  }
  g.fillStyle = '#E8D2B4'; g.fillRect(0, 0, w, floor);
  g.fillStyle = 'rgba(180,150,120,0.08)';
  for (let y = 8; y < floor - 6; y += 5) for (let x = (y % 10); x < w; x += 9) g.fillRect(x, y, 2, 1);
  g.fillStyle = '#6A4A32'; g.fillRect(0, 0, w, 8);
  g.fillStyle = '#8A6848'; g.fillRect(0, 8, w, 3);
  g.fillStyle = '#5A3E2A'; g.fillRect(0, floor - 5, w, 5);
  drawWoodFloor(g, w, h, floor);
  const wx = (w * 0.56) | 0, wy = 12, ww = Math.min(86, (w * 0.28) | 0), wh = Math.min(56, Math.round(floor * 0.42));
  g.fillStyle = 'rgba(255,200,120,0.16)';
  g.beginPath(); g.moveTo(wx, wy + wh); g.lineTo(wx + ww, wy + wh); g.lineTo(wx + ww + 40, floor); g.lineTo(wx - 12, floor); g.fill();
  g.fillStyle = '#6A5848'; g.fillRect(wx - 4, wy - 4, ww + 8, wh + 8);
  g.fillStyle = '#7A9EC0'; g.fillRect(wx, wy, ww, wh);
  g.fillStyle = '#F0B070'; g.fillRect(wx, wy, (ww / 2) | 0, wh);
  g.fillStyle = '#6A5848'; g.fillRect(wx + ((ww / 2) | 0) - 1, wy, 2, wh); g.fillRect(wx, wy + ((wh / 2) | 0) - 1, ww, 2);
  g.fillStyle = '#E8D8C0'; g.fillRect(wx - 10, wy - 2, 10, wh + 14); g.fillRect(wx + ww, wy - 2, 10, wh + 14);
}

export function drawCinematicRoom(g: CanvasRenderingContext2D, w: number, h: number, scale = 1) {
  const floor = Math.round(h * 0.72);
  drawArchitecture(g, w, h, floor);
  const rank = (k?: string) => k === 'rug' ? 0 : k === 'furn' ? 1 : k === 'top' ? 2 : 3;
  const sorted = [...CINE_ITEMS].sort((a, b) => rank(kindById(a.kind)?.layer) - rank(kindById(b.kind)?.layer) || (b.y - a.y));
  const sc = 0.82 * scale;
  for (const it of sorted) {
    const k = kindById(it.kind); if (!k) continue;
    const img = sprite(it.kind, it.flip);
    const dw = img.width * sc, dh = img.height * sc;
    const xx = Math.round((it.x / 320) * w - dw / 2);
    const y = k.wall ? Math.round((it.y / 180) * h) : Math.round(floor - it.y - dh);
    if (!k.wall && it.kind !== 'rug') {
      g.fillStyle = 'rgba(42, 28, 18, 0.20)';
      const cx = xx + dw / 2, cy = y + dh - 1, rw = dw * 0.36, rh = Math.max(2.4, dh * 0.055);
      for (let dy = -rh; dy <= rh; dy++) {
        const t = 1 - (dy * dy) / (rh * rh);
        if (t <= 0) continue;
        const hw = Math.round(rw * Math.sqrt(t));
        g.fillRect(Math.round(cx - hw), Math.round(cy + dy), hw * 2, 1);
      }
    }
    g.imageSmoothingEnabled = false;
    g.drawImage(img, Math.max(-dw + 4, Math.min(w - 4, xx)), y, dw, dh);
  }
}

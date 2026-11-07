// Magical mushroom wood — a different place from the flower forest, not a palette-swap.
// Caps, stems, spots, gills and a soft bioluminescent halo. Several silhouettes:
// round spotted, tall bell, clustered pins, flat parasol, shelf fungus, textured cone.

export const MS = {
  stem: '#E6DCC4', stemD: '#C8B89A', stemN: '#8A7A62',
  moss: '#3A5A42',
  teal: '#3E9A96', tealD: '#2A6E6C', mint: '#8FE0C8',
  ink: '#5A6EB0', inkD: '#3A4A88', cream: '#F0E6C8',
  gold: '#E8D878', glow: '#A8F0E0', glow2: '#D0F8A8',
  capR: '#C46A62', capRD: '#8A3A3A', spot: '#F4EEE0',
};

function px(g: CanvasRenderingContext2D, x: number, y: number, c: string) {
  g.fillStyle = c; g.fillRect(x | 0, y | 0, 1, 1);
}
function disc(g: CanvasRenderingContext2D, x: number, y: number, r: number, c: string) {
  const R = Math.max(1, Math.round(r)), rr = r * r;
  g.fillStyle = c;
  for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) if (dx * dx + dy * dy <= rr) g.fillRect((x + dx) | 0, (y + dy) | 0, 1, 1);
}
/** Smooth bioluminescent halo. Real alpha on the baked sprite — no hashed scribble. */
function halo(g: CanvasRenderingContext2D, x: number, y: number, r: number, c: string) {
  const hex = parseInt(c.slice(1), 16);
  const R = (hex >> 16) & 255, G = (hex >> 8) & 255, B = hex & 255;
  const steps = Math.max(4, Math.round(r));
  for (let i = steps; i >= 1; i--) {
    const t = i / steps;
    const a = 0.16 * (1 - t) * (1 - t) + 0.04 * (1 - t);
    g.fillStyle = `rgba(${R},${G},${B},${a.toFixed(3)})`;
    const rr = r * t, rad = Math.ceil(rr);
    for (let dy = -rad; dy <= rad; dy++) for (let dx = -rad; dx <= rad; dx++) {
      if (dx * dx + dy * dy <= rr * rr) g.fillRect((x + dx) | 0, (y + dy) | 0, 1, 1);
    }
  }
}

export type ShroomKind = 'spot' | 'bell' | 'pin' | 'parasol' | 'shelf' | 'cone';

export function drawShroom(g: CanvasRenderingContext2D, x: number, baseY: number, kind: ShroomKind, s: number, seed: number, glow = 1) {
  if (glow > 0.2) halo(g, x, baseY - s * 1.2, s * 1.8, seed % 2 ? MS.glow : MS.glow2);
  if (kind === 'spot') {
    // classic rounded cap, cream spots, teal or russet, chunky stem
    const cap = seed % 3 === 0 ? MS.capR : seed % 3 === 1 ? MS.teal : MS.ink;
    const capD = seed % 3 === 0 ? MS.capRD : seed % 3 === 1 ? MS.tealD : MS.inkD;
    const stemH = s * 1.6, capR = s * 1.15;
    for (let i = 0; i < stemH; i++) {
      const w = s * (0.28 + 0.06 * Math.sin(i / 2));
      for (let dx = -w; dx <= w; dx++) px(g, x + dx, baseY - i, Math.abs(dx) > w - 0.6 ? MS.stemD : MS.stem);
    }
    disc(g, x, baseY - stemH, capR, cap);
    disc(g, x, baseY - stemH - capR * 0.15, capR * 0.85, capD);
    // underside lip
    for (let dx = -capR; dx <= capR; dx++) if (dx * dx < capR * capR) px(g, x + dx, baseY - stemH + capR * 0.35, MS.stemN);
    const spots = 4 + (seed % 4);
    for (let i = 0; i < spots; i++) {
      const a = seed * 1.7 + i * 2.3;
      disc(g, x + Math.cos(a) * capR * 0.45, baseY - stemH - Math.sin(a) * capR * 0.3, 0.7 + s * 0.12, MS.spot);
    }
    if (glow) disc(g, x, baseY - stemH - capR * 0.2, s * 0.2, MS.glow);
  } else if (kind === 'bell') {
    const stemH = s * 2.4;
    for (let i = 0; i < stemH; i++) {
      const w = s * 0.16;
      for (let dx = -w; dx <= w; dx++) px(g, x + dx, baseY - i, MS.stem);
    }
    const capH = s * 1.3, capW = s * 0.95;
    for (let i = 0; i < capH; i++) {
      const t = i / capH;
      const w = capW * (0.35 + 0.75 * t * t);
      const y = baseY - stemH - capH + i + s * 0.4;
      for (let dx = -w; dx <= w; dx++) px(g, x + dx, y, Math.abs(dx) > w - 0.7 ? MS.inkD : (t < 0.3 ? MS.ink : MS.ink));
    }
    if (glow) disc(g, x, baseY - stemH - capH * 0.3, s * 0.25, MS.glow);
  } else if (kind === 'pin') {
    const n = 4 + (seed % 4);
    for (let i = 0; i < n; i++) {
      const ox = x + (i - n / 2) * s * 0.7 + ((seed + i) % 3) - 1;
      const hh = s * (0.9 + ((seed + i * 5) % 5) * 0.18);
      for (let k = 0; k < hh; k++) px(g, ox, baseY - k, MS.stem);
      disc(g, ox, baseY - hh, s * 0.38, i % 2 ? MS.mint : MS.gold);
      if (glow) px(g, ox, baseY - hh, MS.glow);
    }
  } else if (kind === 'parasol') {
    const stemH = s * 1.8;
    for (let i = 0; i < stemH; i++) px(g, x, baseY - i, MS.stem), px(g, x + 1, baseY - i, MS.stemD);
    const capR = s * 1.4;
    for (let dx = -capR; dx <= capR; dx++) {
      const t = Math.abs(dx) / capR;
      const drop = t * t * s * 0.45;
      const y = baseY - stemH + drop;
      const top = y - s * 0.45 * (1 - t);
      for (let yy = top; yy <= y; yy++) px(g, x + dx, yy, t > 0.88 ? MS.tealD : MS.teal);
    }
    if (glow) disc(g, x, baseY - stemH - s * 0.1, s * 0.2, MS.mint);
  } else if (kind === 'shelf') {
    // stacked brackets on an implied tree (caller places against a trunk)
    for (let i = 0; i < 3; i++) {
      const w = s * (1.1 - i * 0.15), y = baseY - i * s * 0.55;
      for (let dx = 0; dx <= w; dx++) {
        const t = dx / w;
        const th = s * 0.22 * (1 - t * t);
        for (let dy = -th; dy <= th; dy++) px(g, x + dx, y + dy, dy < 0 ? MS.cream : MS.tealD);
      }
      if (glow) px(g, x + w * 0.4, y - 1, MS.gold);
    }
  } else {
    // textured cone (morel-ish), magical gold-teal
    const stemH = s * 0.7;
    for (let i = 0; i < stemH; i++) for (let dx = -s * 0.22; dx <= s * 0.22; dx++) px(g, x + dx, baseY - i, MS.stem);
    const capH = s * 1.6, capW = s * 0.7;
    for (let i = 0; i < capH; i++) {
      const t = i / capH;
      const w = capW * Math.sin(t * Math.PI) * (0.7 + 0.3 * t);
      const y = baseY - stemH - i;
      for (let dx = -w; dx <= w; dx++) {
        const pit = ((i + (dx | 0) * 3 + seed) % 4 === 0);
        px(g, x + dx, y, pit ? MS.tealD : (Math.abs(dx) > w - 0.6 ? MS.tealD : MS.gold));
      }
    }
  }
}

export interface MushCluster {
  canvas: HTMLCanvasElement;
  w: number; h: number;
  ax: number;
}

const KINDS: ShroomKind[] = ['spot', 'bell', 'pin', 'parasol', 'cone'];

export function bakeMushCluster(seed: number, scale = 1): MushCluster {
  const n = 3 + (seed % 4);
  const w = Math.round((30 + n * 11) * scale);
  const h = Math.round((46 + (seed % 5) * 6) * scale);
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d')!;
  const base = h - 2;
  // mossy ground patch
  g.fillStyle = MS.moss;
  for (let i = 0; i < w; i++) if ((i + seed) % 3 !== 0) g.fillRect(i, base - ((i * 5 + seed) % 3), 1, 3);
  for (let i = 0; i < n; i++) {
    const x = Math.round(6 * scale + (i + 0.35) * ((w - 10 * scale) / n));
    const kind = KINDS[(seed + i * 2) % KINDS.length]!;
    const s = (4.5 + ((seed + i * 9) % 6)) * scale;
    drawShroom(g, x, base, kind, s, seed + i * 17, 1);
  }
  return { canvas: c, w, h, ax: (w / 2) | 0 };
}

export function drawSpore(g: CanvasRenderingContext2D, x: number, y: number, s: number, warm: boolean) {
  disc(g, x, y, s, warm ? MS.gold : MS.glow);
  px(g, x, y, '#fff6d8');
}

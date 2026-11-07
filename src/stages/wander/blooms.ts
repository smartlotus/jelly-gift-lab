// The only flowers in the forest: 云南紫精灵 (a Yunnan double purple lisianthus / 洋桔梗 cultivar)
// and 戴安娜粉玫瑰 (Diana, a classic high-centred pink cut rose).
// Drawn as pixel discs and pointed petals — not daisies, not lavender spikes, not generic 5-petal icons.
// Clusters are baked once so the stroll can stamp them cheaply.

export const LISI = {
  stem: '#6A7B58', stemD: '#556348',
  leaf: '#6E8458', leafD: '#4E623E',
  // ruffled double lisianthus: violet outer, slightly paler throat
  outer: '#5A3A80', mid: '#7A56A8', inner: '#A888C8', throat: '#D4C4E8', bud: '#6B4494',
};
export const DIANA = {
  stem: '#3F5A32', stemD: '#2E4426',
  leaf: '#4A6A38', leafD: '#334C28', thorn: '#6A4A32',
  // clear princess-pink, inner a touch deeper, outer a touch milkier
  outer: '#F2B8C6', mid: '#E890A8', inner: '#D87090', heart: '#C85A7A', bud: '#E07898', hi: '#F8D4DC',
};

function px(g: CanvasRenderingContext2D, x: number, y: number, c: string) {
  g.fillStyle = c; g.fillRect(x | 0, y | 0, 1, 1);
}
function disc(g: CanvasRenderingContext2D, x: number, y: number, r: number, c: string) {
  const R = Math.max(1, Math.round(r)), rr = r * r;
  g.fillStyle = c;
  for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) if (dx * dx + dy * dy <= rr) g.fillRect((x + dx) | 0, (y + dy) | 0, 1, 1);
}
/** pointed oval petal along angle a (radians), length len, half-width hw */
function petal(g: CanvasRenderingContext2D, x: number, y: number, len: number, hw: number, a: number, rim: string, fill: string, tip?: string) {
  const ca = Math.cos(a), sa = Math.sin(a), nx = -sa, ny = ca;
  const steps = Math.max(4, Math.round(len * 2));
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    // pointed at both ends, fullest just past the middle (ruffled lisianthus / rose petal)
    const w = Math.sin(t * Math.PI) * hw * (0.75 + 0.25 * Math.sin(t * Math.PI * 3));
    const px0 = x + ca * t * len, py0 = y + sa * t * len;
    const col = t > 0.82 && tip ? tip : (t < 0.18 || t > 0.88 ? rim : fill);
    const span = Math.max(0.6, w);
    for (let s = -span; s <= span; s += 0.7) px(g, px0 + nx * s, py0 + ny * s, col);
  }
}

/** one open 紫精灵 bloom: double lisianthus / 洋桔梗, rose-form when open.
 *  Ruffled layered petals, paler throat, wavy edges. Not a hydrangea mound, not a campanula bell. */
export function drawLisianthusBloom(g: CanvasRenderingContext2D, x: number, y: number, s: number, tilt = 0) {
  disc(g, x, y + s * 0.55, s * 0.22, LISI.leaf);
  disc(g, x, y + s * 0.62, s * 0.14, LISI.leafD);
  const outer = 6;
  for (let i = 0; i < outer; i++) {
    const a = tilt - Math.PI / 2 + (i / outer) * Math.PI * 2 + 0.2;
    const len = s * (0.95 + 0.12 * Math.sin(i * 1.7 + tilt));
    petal(g, x, y + s * 0.08, len, s * 0.34, a, LISI.outer, LISI.mid, LISI.inner);
  }
  const inner = 5;
  for (let i = 0; i < inner; i++) {
    const a = tilt - Math.PI / 2 + (i / inner) * Math.PI * 2 + 0.55;
    petal(g, x, y + s * 0.02, s * 0.62, s * 0.22, a, LISI.mid, LISI.inner, LISI.throat);
  }
  disc(g, x, y - s * 0.02, s * 0.2, LISI.inner);
  disc(g, x, y - s * 0.06, s * 0.1, LISI.throat);
}

/** tight lisianthus bud (the cultivar carries several buds per stem) */
export function drawLisianthusBud(g: CanvasRenderingContext2D, x: number, y: number, s: number) {
  // sepal
  disc(g, x, y + s * 0.15, s * 0.28, LISI.leaf);
  // pointed oval bud
  for (let i = -s; i <= s * 0.4; i++) {
    const t = (i + s) / (s * 1.4);
    const w = Math.sin(t * Math.PI) * s * 0.38;
    for (let dx = -w; dx <= w; dx++) px(g, x + dx, y + i, Math.abs(dx) > w - 0.6 ? LISI.outer : LISI.bud);
  }
}

/** 戴安娜: classic high-centred hybrid-tea rose, spiral petals, pointed bud */
export function drawDianaRose(g: CanvasRenderingContext2D, x: number, y: number, s: number, open = 1) {
  // High-centred Yunnan cut rose “戴安娜”: outer petals shorter and recurved,
  // inner petals longer, spiral climb to a pointed heart. Bright princess pink.
  disc(g, x, y + s * 0.48, s * 0.18, DIANA.leaf);
  // outer guard petals — shorter, rolling out (高心卷边)
  const guards = 6;
  for (let i = 0; i < guards; i++) {
    const a = -Math.PI + 0.35 + (i / Math.max(1, guards - 1)) * (Math.PI - 0.7);
    const flare = a + (a < -Math.PI / 2 ? -0.55 : 0.55) * (0.35 + 0.65 * open);
    petal(g, x, y + s * 0.12, s * (0.7 + 0.25 * open), s * 0.28, flare, DIANA.mid, DIANA.outer, DIANA.hi);
  }
  // spiral of inner petals (outer short → inner long), climbing to the high centre
  const n = 7 + Math.round(open * 3);
  for (let i = 0; i < n; i++) {
    const tt = i / Math.max(1, n - 1);
    const a = -Math.PI / 2 + i * 0.72;
    const len = s * (0.38 + tt * 0.22 + (1 - tt) * 0.15 * open);
    const lift = -s * (0.08 + tt * 0.42 * open);
    const hw = s * (0.16 + (1 - tt) * 0.06);
    const fill = tt < 0.35 ? DIANA.heart : tt < 0.65 ? DIANA.inner : DIANA.mid;
    petal(g, x + Math.cos(a) * s * 0.06, y + lift, len, hw, a + (i % 2 ? 0.12 : -0.12), DIANA.inner, fill, DIANA.hi);
  }
  // pointed high centre
  petal(g, x, y - s * 0.5 * open, s * 0.38, s * 0.11, -Math.PI / 2 - 0.08, DIANA.heart, DIANA.inner);
  petal(g, x, y - s * 0.46 * open, s * 0.32, s * 0.1, -Math.PI / 2 + 0.1, DIANA.inner, DIANA.mid);
}

export function drawDianaBud(g: CanvasRenderingContext2D, x: number, y: number, s: number) {
  // sepals
  for (let i = -1; i <= 1; i++) petal(g, x, y + s * 0.25, s * 0.55, s * 0.16, -Math.PI / 2 + i * 0.45, DIANA.leafD, DIANA.leaf);
  for (let i = -s * 0.9; i <= s * 0.35; i++) {
    const t = (i + s * 0.9) / (s * 1.25);
    const w = Math.sin(t * Math.PI) * s * 0.32 * (0.7 + 0.3 * t);
    for (let dx = -w; dx <= w; dx++) px(g, x + dx, y + i, Math.abs(dx) > w - 0.55 ? DIANA.inner : DIANA.bud);
  }
}

function stem(g: CanvasRenderingContext2D, x: number, y0: number, y1: number, col: string, sway: number) {
  const h = y1 - y0;
  for (let i = 0; i <= Math.abs(h); i++) {
    const t = i / Math.max(1, Math.abs(h));
    px(g, x + sway * Math.sin(t * Math.PI) * t, y0 + Math.sign(h) * i, col);
  }
}
function leafPair(g: CanvasRenderingContext2D, x: number, y: number, s: number, col: string, dark: string, opposite: boolean) {
  // lanceolate (lisianthus) or slightly serrated (rose) leaves
  const dir = opposite ? 1 : 0.85;
  for (const side of [-1, 1]) {
    for (let i = 0; i <= s * 1.6; i++) {
      const t = i / (s * 1.6);
      const w = Math.sin(t * Math.PI) * s * 0.45;
      for (let dy = -w; dy <= w; dy++) {
        const serr = !opposite && ((i | 0) % 3 === 0) ? 0.6 : 0;
        px(g, x + side * i * dir, y + dy * 0.7 - t * s * 0.25, Math.abs(dy) > w - 0.7 - serr ? dark : col);
      }
    }
  }
}

/** one 紫精灵 stem: grey-green opposite leaves, several ruffled heads + buds (how cut lisianthus actually grows) */
export function drawLisianthusStem(g: CanvasRenderingContext2D, x: number, baseY: number, h: number, seed: number, sway = 0) {
  const top = baseY - h;
  stem(g, x, baseY, top, LISI.stem, sway * 1.4);
  stem(g, x + 1, baseY, top + 2, LISI.stemD, sway * 1.4);
  leafPair(g, x, baseY - h * 0.35, Math.max(3, h * 0.12), LISI.leaf, LISI.leafD, true);
  leafPair(g, x, baseY - h * 0.58, Math.max(3, h * 0.1), LISI.leaf, LISI.leafD, true);
  const heads = 1 + (seed % 2); // one open cup, sometimes a second — not a hydrangea mound
  for (let i = 0; i < heads; i++) {
    const k = (i + 1) / (heads + 0.4);
    const ox = x + Math.sin(seed * 1.7 + i * 2.1) * (3 + h * 0.04) + sway * k * 2;
    const oy = top + 4 + i * (h * 0.09);
    const sz = 5.8 + (h / 36) * 3.4 + (i === 0 ? 1.4 : 0);
    if ((seed + i * 3) % 5 === 0) drawLisianthusBud(g, ox + 3, oy + 2, sz * 0.7);
    else drawLisianthusBloom(g, ox, oy, sz, Math.sin(seed + i) * 0.15);
  }
}

/** one 戴安娜 stem: pinnate leaves, small thorns, a single high-centred bloom (sometimes a side bud) */
export function drawDianaStem(g: CanvasRenderingContext2D, x: number, baseY: number, h: number, seed: number, sway = 0, open = 1) {
  const top = baseY - h;
  stem(g, x, baseY, top, DIANA.stem, sway);
  stem(g, x + 1, baseY, top + 1, DIANA.stemD, sway);
  // thorns
  for (let y = baseY - 6; y > top + 10; y -= 5) px(g, x + ((y + seed) % 2 === 0 ? 2 : -1), y, DIANA.thorn);
  leafPair(g, x, baseY - h * 0.3, Math.max(3, h * 0.14), DIANA.leaf, DIANA.leafD, false);
  leafPair(g, x, baseY - h * 0.52, Math.max(3, h * 0.12), DIANA.leaf, DIANA.leafD, false);
  leafPair(g, x, baseY - h * 0.72, Math.max(2, h * 0.09), DIANA.leaf, DIANA.leafD, false);
  const ox = x + sway * 1.6, oy = top + 3;
  const sz = 6.8 + (h / 34) * 3.8;
  if (open < 0.35) drawDianaBud(g, ox, oy, sz * 0.85);
  else drawDianaRose(g, ox, oy, sz, open);
  if (seed % 3 === 0) drawDianaBud(g, ox + 5, oy + 7, sz * 0.45);
}

export type FlowerKind = 'lisi' | 'diana';

export interface Cluster {
  kind: FlowerKind;
  canvas: HTMLCanvasElement;
  w: number; h: number;
  ax: number; // feet-x in the canvas
}

/** bake a little grove of one species (several stems, slightly varied) */
export function bakeCluster(kind: FlowerKind, seed: number, scale = 1): Cluster {
  const stems = 2 + (seed % 2);
  const w = Math.round((48 + stems * 20) * scale);
  const h = Math.round((78 + (seed % 4) * 10) * scale);
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d')!;
  const base = h - 2;
  for (let i = 0; i < stems; i++) {
    const x = Math.round(8 * scale + (i + 0.5) * ((w - 16 * scale) / stems));
    const hh = (46 + ((seed + i * 7) % 18)) * scale;
    const sway = ((seed + i) % 5) - 2;
    const open = 0.45 + ((seed + i * 5) % 7) / 10;
    if (kind === 'lisi') drawLisianthusStem(g, x, base, hh, seed + i * 13, sway * 0.15);
    else drawDianaStem(g, x, base, hh, seed + i * 11, sway * 0.12, open);
  }
  return { kind, canvas: c, w, h, ax: (w / 2) | 0 };
}

/** a single falling petal (rose = notched oval pink; lisianthus = smoother violet) */
export function drawPetal(g: CanvasRenderingContext2D, x: number, y: number, kind: FlowerKind, rot: number, s = 2.4) {
  g.save();
  g.translate(x | 0, y | 0);
  // approximate rotation with a shear-less pixel plot
  const ca = Math.cos(rot), sa = Math.sin(rot);
  const fill = kind === 'diana' ? DIANA.mid : LISI.mid;
  const rim = kind === 'diana' ? DIANA.inner : LISI.outer;
  for (let j = -s; j <= s; j++) for (let i = -s * 0.7; i <= s * 0.7; i++) {
    const u = i / s, v = j / s;
    // rose petal has a small notch at the tip
    const notch = kind === 'diana' && v < -0.55 && Math.abs(u) < 0.25 ? 1 : 0;
    if (u * u * 1.6 + v * v > 1 || notch) continue;
    const rx = i * ca - j * sa, ry = i * sa + j * ca;
    px(g, rx, ry, (u * u + v * v > 0.62) ? rim : fill);
  }
  g.restore();
}

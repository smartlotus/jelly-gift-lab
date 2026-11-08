// Baked depth bands for the flower sea and mushroom sea.
// Thousands-looking carpets come from instancing extracted sprites once onto long strips.
import { art } from '../../art/loader';
import { stamp } from '../../art/blit';
import { drawDianaRose, drawLisianthusBloom } from './blooms';
import { drawShroom, type ShroomKind } from './shrooms';

export const rnd = (n: number) => {
  let s = n | 0 || 1;
  return () => {
    s = Math.imul(s ^ (s << 13), 1597334677);
    s = Math.imul(s ^ (s >>> 16), 3812015801);
    return (s >>> 0) / 4294967296;
  };
};

export function pathY(wx: number, floor: number) {
  return floor - 2 + Math.round(Math.sin(wx * 0.011) * 8 + Math.sin(wx * 0.027) * 4);
}

export interface Prop {
  x: number;
  img: HTMLCanvasElement;
  sc: number;
  ax: number;
  layer: 'far' | 'mid' | 'near' | 'fg';
  par: number;
}

export interface Sea {
  far: HTMLCanvasElement;
  mid: HTMLCanvasElement;
  carpet: HTMLCanvasElement;
  props: Prop[];
}

function bakeBand(
  sprites: HTMLCanvasElement[],
  width: number, height: number,
  count: number, seed: number,
  scaleMin: number, scaleMax: number,
  fade = 1, hillish = true,
): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = width; c.height = height;
  const g = c.getContext('2d')!;
  const r = rnd(seed);
  if (!sprites.length) return c;
  for (let i = 0; i < count; i++) {
    const img = sprites[(Math.floor(r() * sprites.length) + i) % sprites.length]!;
    const targetH = scaleMin + r() * (scaleMax - scaleMin);
    const sc = targetH / Math.max(1, img.height);
    const x = r() * width;
    const hill = hillish ? height * (0.42 + 0.18 * Math.sin(x * 0.018 + seed) + 0.1 * Math.sin(x * 0.007)) : height * 0.4;
    const y = hill + r() * (height - hill - 2);
    stamp(g, img, x, y, sc, fade * (0.75 + r() * 0.25));
  }
  return c;
}

function proceduralFlowers(): HTMLCanvasElement[] {
  const out: HTMLCanvasElement[] = [];
  for (let i = 0; i < 8; i++) {
    const c = document.createElement('canvas'); c.width = 28; c.height = 36;
    const g = c.getContext('2d')!;
    if (i % 2 === 0) drawLisianthusBloom(g, 14, 16, 9 + (i % 3), (i - 4) * 0.05);
    else drawDianaRose(g, 14, 16, 9 + (i % 3), 0.7 + (i % 4) * 0.08);
    out.push(c);
  }
  return out;
}

function proceduralMush(): HTMLCanvasElement[] {
  const kinds: ShroomKind[] = ['spot', 'bell', 'pin', 'parasol', 'cone', 'shelf'];
  const out: HTMLCanvasElement[] = [];
  for (let i = 0; i < 8; i++) {
    const c = document.createElement('canvas'); c.width = 36; c.height = 44;
    const g = c.getContext('2d')!;
    drawShroom(g, 18, 42, kinds[i % kinds.length]!, 8 + (i % 4), 11 + i * 5, 0.85);
    out.push(c);
  }
  return out;
}

export function bakeFlowerSea(worldW: number): Sea {
  const sprites = art.flowers.length ? art.flowers : proceduralFlowers();
  const far = bakeBand(sprites, 1600, 200, 1400, 11, 6, 14, 0.85);
  const mid = bakeBand(sprites, 1800, 190, 720, 29, 14, 32, 0.96);
  const carpet = bakeBand(sprites, 1400, 70, 380, 47, 10, 20, 1);
  const props: Prop[] = [];
  const r = rnd(91);
  // rolling near/fg clusters of the larger extracted stems
  const big = sprites.slice().sort((a, b) => b.width * b.height - a.width * a.height);
  for (let i = 0; i < 38; i++) {
    const img = big[i % Math.min(8, big.length)]!;
    const fg = i % 5 === 0;
    const sc = (fg ? 72 : 52) / img.height * (0.85 + r() * 0.4);
    props.push({
      x: 40 + i * (worldW / 36) + r() * 50,
      img, sc, ax: 0,
      layer: fg ? 'fg' : 'near',
      par: fg ? 1.16 : 1,
    });
  }
  for (let i = 0; i < 22; i++) {
    const img = sprites[(i * 3 + 2) % sprites.length]!;
    props.push({
      x: 70 + i * (worldW / 20) + r() * 40,
      img, sc: 38 / img.height, ax: 0,
      layer: 'mid', par: 0.72,
    });
  }
  return { far, mid, carpet, props };
}

export function bakeMushroomSea(worldW: number): Sea {
  const sprites = art.mushrooms.length ? art.mushrooms : proceduralMush();
  const far = bakeBand(sprites, 1500, 200, 640, 17, 7, 16, 0.78);
  const mid = bakeBand(sprites, 1700, 190, 340, 33, 16, 36, 0.93);
  const carpet = bakeBand(sprites, 1300, 64, 520, 51, 6, 14, 0.95, false);
  const props: Prop[] = [];
  const r = rnd(77);
  const sorted = sprites.slice().sort((a, b) => b.width * b.height - a.width * a.height);
  const giant = sorted[0] ?? sprites[0]!;
  // giant umbrella mushrooms as architecture (replacing tree poles)
  for (let i = 0; i < 16; i++) {
    const img = i % 3 === 0 ? giant : sorted[Math.min(sorted.length - 1, 1 + (i % 4))]!;
    const target = 110 + (i % 5) * 18;
    props.push({
      x: 50 + i * (worldW / 15) + r() * 70,
      img, sc: target / img.height, ax: 0,
      layer: i % 4 === 0 ? 'far' : 'mid',
      par: i % 4 === 0 ? 0.38 : 0.64,
    });
  }
  for (let i = 0; i < 28; i++) {
    const img = sprites[(i * 5 + 1) % sprites.length]!;
    const fg = i % 6 === 0;
    props.push({
      x: 30 + i * (worldW / 26) + r() * 36,
      img, sc: (fg ? 64 : 36) / img.height, ax: 0,
      layer: fg ? 'fg' : 'near',
      par: fg ? 1.14 : 1,
    });
  }
  return { far, mid, carpet, props };
}

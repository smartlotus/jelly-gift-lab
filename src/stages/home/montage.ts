// Future-life montage: six animated scenes (not title cards) dissolving into each other,
// then the final line fades in. Saved furniture is reused in the home / sofa frames.
import { drawPerson } from './people';
import { drawFurnished } from './room';
import { critterFrame } from '../../shared/pixel/fauna';
import { draw } from '../../shared/pixel/sprite';
import { type SavedItem } from './save';
import { drawDianaRose, drawLisianthusBloom } from '../wander/blooms';

export const SCENE_IDS = ['walk', 'greet', 'sofa', 'sleep', 'snow', 'dawn'] as const;
export type SceneId = typeof SCENE_IDS[number];
const DURS: Record<SceneId, number> = { walk: 5.8, greet: 5.6, sofa: 5.8, sleep: 5.6, snow: 6.4, dawn: 8.2 };
const FADE = 0.7;

export interface MontageApi {
  update(dt: number): void;
  render(g: CanvasRenderingContext2D, w: number, h: number): void;
  skip(): void;
  replay(): void;
  seek(id: SceneId | 'finale', t?: number): void;
  get scene(): SceneId | 'finale';
  get finaleT(): number;
}

function disc(g: CanvasRenderingContext2D, x: number, y: number, r: number, c: string) {
  const R = Math.max(1, Math.round(r));
  g.fillStyle = c;
  for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) {
    if (dx * dx + dy * dy * 0.85 <= r * r) g.fillRect((x + dx) | 0, (y + dy) | 0, 1, 1);
  }
}

function tree(g: CanvasRenderingContext2D, x: number, floor: number, ht: number, seed: number, winter = false) {
  const tw = 3 + (seed % 2);
  g.fillStyle = winter ? '#4A3A32' : '#6A4E34';
  g.fillRect((x - (tw >> 1)) | 0, floor - ht + 16, tw, ht - 16);
  if (winter) {
    g.fillStyle = '#E8EEF4';
    disc(g, x, floor - ht + 12, 8 + (seed % 3), '#E8EEF4');
    disc(g, x - 6, floor - ht + 18, 6, '#D8DEE8');
    disc(g, x + 6, floor - ht + 16, 6, '#F4F6FA');
  } else {
    disc(g, x, floor - ht + 10, 10 + (seed % 4), seed % 2 ? '#5E8444' : '#4A6E36');
    disc(g, x - 8, floor - ht + 16, 8, '#4A6E36');
    disc(g, x + 7, floor - ht + 14, 7, '#5E8444');
  }
}

function cottage(g: CanvasRenderingContext2D, hx: number, floor: number, open: number, lit: boolean) {
  g.fillStyle = '#A87868'; g.fillRect(hx + 46, floor - 78, 7, 16);
  g.fillStyle = '#E8D4B8'; g.fillRect(hx, floor - 58, 64, 58);
  g.fillStyle = '#B24A4A';
  g.beginPath(); g.moveTo(hx - 6, floor - 56); g.lineTo(hx + 32, floor - 84); g.lineTo(hx + 70, floor - 56); g.fill();
  g.fillStyle = lit ? '#FFE6B0' : '#3A3E48';
  g.fillRect(hx + 8, floor - 44, 14, 12);
  g.fillStyle = '#C8B898'; g.fillRect(hx + 14, floor - 44, 2, 12); g.fillRect(hx + 8, floor - 39, 14, 2);
  g.fillStyle = '#2E2A2B'; g.fillRect(hx + 34, floor - 32, 16, 32);
  g.fillStyle = '#C4A06A'; g.fillRect(hx + 34 + open * 12, floor - 32, Math.max(3, 16 - open * 12), 32);
  if (open > 0.2) { g.fillStyle = '#FFE6B0'; g.fillRect(hx + 36, floor - 30, 8, 28); }
}

function snowflakes(g: CanvasRenderingContext2D, w: number, h: number, t: number, heavy: boolean) {
  g.fillStyle = '#F8F8FC';
  const n = heavy ? 110 : 40;
  for (let i = 0; i < n; i++) {
    const x = ((i * 97 + t * (12 + (i % 5))) % (w + 10)) - 5;
    const y = ((i * 53 + t * (18 + (i % 7))) % (h + 10)) - 5;
    const s = 1 + (i % 3);
    g.fillRect(x | 0, y | 0, s, s);
  }
}

function drawWalk(g: CanvasRenderingContext2D, w: number, h: number, t: number) {
  const k = Math.min(1, t / 5.8);
  const floor = h - 22;
  const sky = g.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, '#C8B0C8'); sky.addColorStop(0.45, '#E8B898'); sky.addColorStop(1, '#F0C8A8');
  g.fillStyle = sky; g.fillRect(0, 0, w, h);
  g.fillStyle = '#FFE2A8';
  const sunX = w * 0.82, sunY = h * 0.18;
  for (let dy = -9; dy <= 9; dy++) for (let dx = -9; dx <= 9; dx++) if (dx * dx + dy * dy <= 81) g.fillRect((sunX + dx) | 0, (sunY + dy) | 0, 1, 1);
  g.fillStyle = '#C88890';
  g.beginPath(); g.moveTo(0, floor - 36);
  for (let x = 0; x <= w; x += 12) g.lineTo(x, floor - 30 - Math.sin(x * 0.04) * 10);
  g.lineTo(w, h); g.lineTo(0, h); g.fill();
  tree(g, 18, floor, 48, 2); tree(g, 46, floor, 62, 5); tree(g, w - 24, floor, 54, 8);
  g.fillStyle = '#6A8A52'; g.fillRect(0, floor, w, h - floor);
  g.fillStyle = '#C8B48A'; g.fillRect(0, floor - 3, w, 6);
  const hx = w * 0.68 - k * 18;
  cottage(g, hx, floor, Math.max(0, (k - 0.58) / 0.32), k > 0.62);
  drawLisianthusBloom(g, hx - 8, floor - 16, 4.6, 0);
  drawDianaRose(g, hx + 70, floor - 17, 4.8, 1);
  const x = 28 + k * (hx + 8 - 36);
  drawPerson(g, 'him', 'hold', x, floor, false, t);
  drawPerson(g, 'her', 'holdL', x + 15, floor, false, t);
}

function drawGreet(g: CanvasRenderingContext2D, w: number, h: number, t: number, layout: SavedItem[]) {
  drawFurnished(g, w, h, layout);
  const floor = h - Math.max(16, Math.round(h * 0.14));
  const k = Math.min(1, t / 5.6);
  drawPerson(g, 'him', 'kneel', w * 0.24, floor, false, t);
  drawPerson(g, 'her', 'kneel', w * 0.36, floor, true, t);
  const dogX = w + 10 - k * (w * 0.52);
  const catX = w + 46 - k * (w * 0.46);
  const dog = critterFrame('collie', k < 0.85 ? 'walk' : 'extra', t);
  const kit = critterFrame('calico', k < 0.8 ? 'walk' : 'extra', t);
  draw(g, dog, Math.round(dogX), floor - dog.height, true);
  draw(g, kit, Math.round(catX), floor - kit.height, true);
}

function drawSofa(g: CanvasRenderingContext2D, w: number, h: number, t: number, layout: SavedItem[]) {
  drawFurnished(g, w, h, layout);
  const floor = h - Math.max(16, Math.round(h * 0.14));
  const sofa = layout.find(i => i.kind === 'sofa');
  const sx = sofa ? (sofa.x / 320) * w : w * 0.48;
  const tv = layout.find(i => i.kind === 'tv');
  const tvX = tv ? (tv.x / 320) * w : w * 0.18;
  g.fillStyle = `hsl(${200 + Math.sin(t * 9) * 20},48%,${58 + Math.sin(t * 13) * 8}%)`;
  g.fillRect(Math.round(tvX - 9), floor - 22, 20, 9);
  drawPerson(g, 'him', 'sit', sx - 12, floor - 8, false, t);
  drawPerson(g, 'her', 'lean', sx + 10, floor - 8, false, t);
  const dog = critterFrame('collie', 'extra', t);
  const kit = critterFrame('calico', 'extra', t);
  draw(g, dog, Math.round(sx - 36), floor - dog.height, false);
  draw(g, kit, Math.round(sx + 28), floor - kit.height - 10, false);
}

function drawSleep(g: CanvasRenderingContext2D, w: number, h: number, t: number) {
  g.fillStyle = '#1A2230'; g.fillRect(0, 0, w, h);
  const floor = h - 20;
  g.fillStyle = '#2A2830'; g.fillRect(0, floor, w, h - floor);
  g.fillStyle = '#8AA0C0'; g.fillRect(w * 0.68, 10, 40, 30);
  g.fillStyle = '#C8D4E4'; g.fillRect(w * 0.68 + 18, 10, 3, 30); g.fillRect(w * 0.68, 23, 40, 3);
  g.fillStyle = 'rgba(200,220,255,0.14)'; g.fillRect(w * 0.52, 10, 90, h);
  g.fillStyle = '#C4A06A'; g.fillRect(w * 0.16, floor - 18, w * 0.60, 18);
  g.fillStyle = '#E8D8C8'; g.fillRect(w * 0.18, floor - 22, w * 0.56, 12);
  g.fillStyle = '#F4EEF2'; g.fillRect(w * 0.18, floor - 26, 16, 10); g.fillRect(w * 0.34, floor - 26, 16, 10);
  const breathe = Math.sin(t * 1.4) * 0.6;
  drawPerson(g, 'him', 'sleep', w * 0.38, floor - 16 + breathe, false, t);
  drawPerson(g, 'her', 'sleep', w * 0.52, floor - 15 - breathe, false, t);
  g.fillStyle = 'rgba(232,200,196,0.92)';
  g.fillRect(w * 0.28, floor - 14, w * 0.38, 10);
  const kit = critterFrame('calico', 'extra', t);
  const dog = critterFrame('collie', 'extra', t);
  draw(g, kit, Math.round(w * 0.22), floor - kit.height - 10, false);
  draw(g, dog, Math.round(w * 0.70), floor - dog.height, true);
}

function drawSnow(g: CanvasRenderingContext2D, w: number, h: number, t: number) {
  const sky = g.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, '#6A7888'); sky.addColorStop(1, '#D0D8E4');
  g.fillStyle = sky; g.fillRect(0, 0, w, h);
  const floor = h - 24;
  tree(g, 22, floor, 58, 3, true);
  tree(g, 58, floor, 72, 6, true);
  tree(g, w - 30, floor, 64, 9, true);
  tree(g, w - 70, floor, 50, 11, true);
  cottage(g, w * 0.72, floor, 0, true);
  g.fillStyle = '#F4F6FA'; g.fillRect(0, floor - 10, w, h - floor + 10);
  g.fillStyle = '#E4E8F0';
  for (let i = 0; i < 6; i++) g.fillRect(i * 60, floor - 6 - (i % 3), 50, 8);
  snowflakes(g, w, h, t, true);
  const k = (t % 6.4) / 6.4;
  const x = 16 + k * (w - 80);
  const bounce = Math.abs(Math.sin(t * 10)) * 2;
  drawPerson(g, 'him', 'run', x, floor - bounce, false, t);
  drawPerson(g, 'her', 'run', x + 14, floor - bounce, false, t);
  const dog = critterFrame('collie', 'walk', t);
  draw(g, dog, Math.round(x - 18), floor - dog.height - bounce, false);
}

function drawDawn(g: CanvasRenderingContext2D, w: number, h: number, t: number) {
  const k = Math.min(1, t / 8.2);
  const rise = Math.pow(k, 0.55);
  const sky = g.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, mix('#141828', '#F07850', rise));
  sky.addColorStop(0.35, mix('#2A3048', '#F0A060', rise));
  sky.addColorStop(0.7, mix('#3A4058', '#F8C888', rise));
  sky.addColorStop(1, mix('#3A4058', '#F8E0C8', rise));
  g.fillStyle = sky; g.fillRect(0, 0, w, h);
  const floor = h * 0.72;
  const sunY = floor + 6 - rise * (floor * 0.62);
  const sx = w * 0.5, sr = 12 + rise * 6;
  // glow
  g.fillStyle = `rgba(255,200,120,${0.18 + rise * 0.22})`;
  for (let dy = -sr * 2; dy <= sr * 2; dy++) for (let dx = -sr * 2; dx <= sr * 2; dx++) {
    if (dx * dx + dy * dy <= (sr * 2) * (sr * 2) && (dx * dx + dy * dy) > sr * sr) {
      if (((dx + dy) & 3) === 0) g.fillRect((sx + dx) | 0, (sunY + dy) | 0, 1, 1);
    }
  }
  g.fillStyle = mix('#E8B070', '#FFE8A0', rise);
  for (let dy = -sr; dy <= sr; dy++) for (let dx = -sr; dx <= sr; dx++) if (dx * dx + dy * dy <= sr * sr) g.fillRect((sx + dx) | 0, (sunY + dy) | 0, 1, 1);
  g.fillStyle = mix('#1A2028', '#3A4A38', rise);
  g.beginPath(); g.moveTo(0, floor + 8);
  for (let x = 0; x <= w; x += 8) g.lineTo(x, floor - 10 - Math.sin(x * 0.04) * 12 - Math.sin(x * 0.01) * 6);
  g.lineTo(w, h); g.lineTo(0, h); g.fill();
  // pine silhouettes
  g.fillStyle = mix('#12161C', '#2A3828', rise);
  for (const px of [18, 42, w - 28, w - 52]) {
    g.beginPath();
    g.moveTo(px, floor + 4);
    g.lineTo(px + 7, floor - 36);
    g.lineTo(px + 14, floor + 4);
    g.fill();
  }
  const stand = floor - 4;
  drawPerson(g, 'him', 'lean', w * 0.46, stand, false, t);
  drawPerson(g, 'her', 'lean', w * 0.56, stand, false, t);
}

function mix(a: string, b: string, k: number): string {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  const ch = (s: number, o: number) => Math.round(((s >> o) & 255) * (1 - k) + ((pb >> o) & 255) * k);
  const r = ch(pa, 16), gv = ch(pa, 8), bl = ch(pa, 0);
  return `rgb(${r},${gv},${bl})`;
}

export function createMontage(layout: SavedItem[]): MontageApi {
  let idx = 0, t = 0, finaleT = 0;
  const drawScene = (id: SceneId, g: CanvasRenderingContext2D, w: number, h: number, tt: number) => {
    if (id === 'walk') drawWalk(g, w, h, tt);
    else if (id === 'greet') drawGreet(g, w, h, tt, layout);
    else if (id === 'sofa') drawSofa(g, w, h, tt, layout);
    else if (id === 'sleep') drawSleep(g, w, h, tt);
    else if (id === 'snow') drawSnow(g, w, h, tt);
    else drawDawn(g, w, h, tt);
  };
  const buf = document.createElement('canvas');
  const api: MontageApi = {
    update(dt) {
      if (idx >= SCENE_IDS.length) { finaleT += dt; return; }
      t += dt;
      if (t >= DURS[SCENE_IDS[idx]!]) {
        t = 0; idx++;
      }
    },
    render(g, w, h) {
      if (idx >= SCENE_IDS.length) {
        drawDawn(g, w, h, 8.2);
        g.fillStyle = `rgba(20,16,14,${Math.min(0.22, finaleT * 0.06)})`;
        g.fillRect(0, 0, w, h);
        return;
      }
      const id = SCENE_IDS[idx]!;
      drawScene(id, g, w, h, t);
      if (t < FADE && idx > 0) {
        if (buf.width !== w || buf.height !== h) { buf.width = w; buf.height = h; }
        const bg = buf.getContext('2d')!;
        drawScene(SCENE_IDS[idx - 1]!, bg, w, h, DURS[SCENE_IDS[idx - 1]!]!);
        g.save(); g.globalAlpha = 1 - t / FADE; g.drawImage(buf, 0, 0); g.restore();
      }
    },
    skip() {
      if (idx >= SCENE_IDS.length) return;
      t = 0; idx++;
    },
    replay() { idx = 0; t = 0; finaleT = 0; },
    seek(id, tt = 0) {
      if (id === 'finale') { idx = SCENE_IDS.length; finaleT = tt; t = 0; }
      else {
        const i = SCENE_IDS.indexOf(id);
        if (i >= 0) { idx = i; t = tt; finaleT = 0; }
      }
    },
    get scene() { return idx >= SCENE_IDS.length ? 'finale' : SCENE_IDS[idx]!; },
    get finaleT() { return finaleT; },
  };
  return api;
}

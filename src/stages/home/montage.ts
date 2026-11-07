// Future-life montage: six animated scenes dissolving into each other,
// then the final line fades in. Saved furniture is reused in the home / sofa frames.
import { drawPerson, type Pose, type Who } from './people';
import { swingDoor } from './door';
import { drawFurnished } from './room';
import { critterFrame } from '../../shared/pixel/fauna';
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

function figure(g: CanvasRenderingContext2D, who: Who, pose: Pose, x: number, y: number, flip: boolean, t: number, s = 1.85) {
  g.save();
  g.imageSmoothingEnabled = false;
  g.translate(Math.round(x), Math.round(y));
  g.scale(s, s);
  drawPerson(g, who, pose, 0, 0, flip, t);
  g.restore();
}

function pet(g: CanvasRenderingContext2D, kind: 'collie' | 'calico', pose: 'walk' | 'extra', x: number, floor: number, flip: boolean, t: number, s = 1.7) {
  const img = critterFrame(kind, pose, t);
  g.save();
  g.imageSmoothingEnabled = false;
  g.translate(x, floor);
  g.scale(flip ? -s : s, s);
  g.drawImage(img, flip ? -img.width : 0, -img.height);
  g.restore();
}

function tree(g: CanvasRenderingContext2D, x: number, floor: number, ht: number, seed: number, winter = false) {
  const tw = 4 + (seed % 2);
  g.fillStyle = winter ? '#4A3A32' : '#6A4E34';
  g.fillRect((x - (tw >> 1)) | 0, floor - ht + 16, tw, ht - 16);
  if (winter) {
    disc(g, x, floor - ht + 16, 16 + (seed % 5), '#E8EEF4');
    disc(g, x - 12, floor - ht + 28, 12, '#D8DEE8');
    disc(g, x + 12, floor - ht + 24, 12, '#F4F6FA');
    disc(g, x, floor - ht + 36, 10, '#EEF2F6');
  } else {
    disc(g, x, floor - ht + 18, 18 + (seed % 5), seed % 2 ? '#5E8444' : '#4A6E36');
    disc(g, x - 14, floor - ht + 32, 14, '#4A6E36');
    disc(g, x + 13, floor - ht + 28, 13, '#5E8444');
    disc(g, x, floor - ht + 48, 12, '#3E6230');
  }
}


function cottage(g: CanvasRenderingContext2D, hx: number, floor: number, open: number, lit: boolean) {
  g.fillStyle = '#A87868'; g.fillRect(hx + 68, floor - 122, 12, 28);
  g.fillStyle = '#8A5A4E'; g.fillRect(hx + 66, floor - 126, 16, 6);
  g.fillStyle = '#E8D4B8'; g.fillRect(hx, floor - 88, 98, 88);
  g.fillStyle = '#D4C0A4'; g.fillRect(hx + 98, floor - 82, 8, 82);
  g.fillStyle = '#B24A4A';
  g.beginPath(); g.moveTo(hx - 10, floor - 86); g.lineTo(hx + 50, floor - 128); g.lineTo(hx + 114, floor - 86); g.fill();
  g.fillStyle = '#C45A5A';
  g.beginPath(); g.moveTo(hx - 4, floor - 86); g.lineTo(hx + 50, floor - 118); g.lineTo(hx + 108, floor - 86); g.fill();
  g.fillStyle = lit ? '#FFE6B0' : '#3A3E48';
  g.fillRect(hx + 12, floor - 70, 20, 16);
  g.fillStyle = '#C8B898'; g.fillRect(hx + 21, floor - 70, 2, 16); g.fillRect(hx + 12, floor - 63, 20, 2);
  swingDoor(g, hx + 46, floor - 54, 28, 54, open, lit);
  g.fillStyle = '#C8B48A'; g.fillRect(hx + 44, floor - 6, 32, 6);
}

function snowflakes(g: CanvasRenderingContext2D, w: number, h: number, t: number, heavy: boolean) {
  g.fillStyle = '#F8F8FC';
  const n = heavy ? 70 : 28;
  for (let i = 0; i < n; i++) {
    const x = ((i * 97 + t * (12 + (i % 5))) % (w + 10)) - 5;
    const y = ((i * 53 + t * (18 + (i % 7))) % (h + 10)) - 5;
    const s = 1 + (i % 3);
    g.fillRect(x | 0, y | 0, s, s);
  }
}

function drawWalk(g: CanvasRenderingContext2D, w: number, h: number, t: number) {
  const k = Math.min(1, t / 5.8);
  const floor = Math.round(h * 0.78);
  const sky = g.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, '#C8B0C8'); sky.addColorStop(0.42, '#E8B898'); sky.addColorStop(1, '#F0C8A8');
  g.fillStyle = sky; g.fillRect(0, 0, w, h);
  g.fillStyle = '#FFE2A8';
  const sunX = w * 0.78, sunY = Math.max(20, floor - h * 0.48);
  for (let dy = -11; dy <= 11; dy++) for (let dx = -11; dx <= 11; dx++) if (dx * dx + dy * dy <= 121) g.fillRect((sunX + dx) | 0, (sunY + dy) | 0, 1, 1);
  g.fillStyle = '#C88890';
  g.beginPath(); g.moveTo(0, floor - h * 0.22);
  for (let x = 0; x <= w; x += 12) g.lineTo(x, floor - h * 0.18 - Math.sin(x * 0.04) * h * 0.04);
  g.lineTo(w, h); g.lineTo(0, h); g.fill();
  const th = Math.round(h * 0.72);
  tree(g, 14, floor, th, 2); tree(g, 42, floor, th + 16, 5); tree(g, w - 18, floor, th + 4, 8); tree(g, w - 48, floor, th - 20, 3);
  g.fillStyle = '#6A8A52'; g.fillRect(0, floor, w, h - floor);
  g.fillStyle = '#C8B48A'; g.fillRect(0, floor - 4, w, 8);
  const hx = w * 0.40 - k * 4;
  const arrive = Math.min(1, k / 0.82);
  const doorX = hx + 58;
  const x = w * 0.08 + arrive * (doorX - 36 - w * 0.08);
  const near = Math.max(0, Math.min(1, (k - 0.54) / (0.80 / 5.8)));
  cottage(g, hx, floor, near, near > 0.2);
  drawLisianthusBloom(g, hx - 10, floor - 28, 6.4, 0);
  drawDianaRose(g, hx + 108, floor - 30, 6.8, 1);
  const atDoor = k > 0.84;
  figure(g, 'him', atDoor ? 'stand' : 'hold', x, floor, false, t);
  figure(g, 'her', atDoor ? 'stand' : 'holdL', x + 26, floor, false, t);
}

function drawGreet(g: CanvasRenderingContext2D, w: number, h: number, t: number, layout: SavedItem[]) {
  drawFurnished(g, w, h, layout);
  const floor = Math.round(h * 0.62);
  const k = Math.min(1, t / 5.6);
  const sofa = layout.find(i => i.kind === 'sofa');
  const sofaX = sofa ? (sofa.x / 320) * w : w * 0.48;
  // kneeling side by side; collie settles left of him, calico right of her
  const herX = Math.min(sofaX - 130, w * 0.36);
  const himX = herX - 48;
  const dogSettle = himX - 46;
  const catSettle = herX + 40;
  figure(g, 'him', 'kneel', himX, floor, false, t);
  figure(g, 'her', 'kneel', herX, floor, false, t);
  const rush = 1 - Math.pow(1 - Math.min(1, k / 0.72), 2);
  const dogX = (w + 40) * (1 - rush) + dogSettle * rush;
  const catX = (w + 88) * (1 - rush) + catSettle * rush;
  pet(g, 'collie', k < 0.74 ? 'walk' : 'extra', dogX, floor, true, t, 2.35);
  pet(g, 'calico', k < 0.78 ? 'walk' : 'extra', catX, floor, true, t, 2.15);
}

function drawSofa(g: CanvasRenderingContext2D, w: number, h: number, t: number, layout: SavedItem[]) {
  drawFurnished(g, w, h, layout);
  const floor = Math.round(h * 0.62);
  const sofa = layout.find(i => i.kind === 'sofa');
  const sx = sofa ? (sofa.x / 320) * w : w * 0.48;
  const tv = layout.find(i => i.kind === 'tv');
  const tvX = tv ? (tv.x / 320) * w : w * 0.18;
  g.fillStyle = `hsl(${200 + Math.sin(t * 9) * 20},48%,${58 + Math.sin(t * 13) * 8}%)`;
  g.fillRect(Math.round(tvX - 14), floor - 36, 28, 14);
  figure(g, 'him', 'sit', sx - 22, floor - 8, false, t, 1.7);
  figure(g, 'her', 'sit', sx + 22, floor - 8, false, t, 1.7);
  pet(g, 'collie', 'extra', sx - 62, floor, false, t, 2.05);
  pet(g, 'calico', 'extra', sx + 58, floor - 4, false, t, 1.95);
}

function drawSleep(g: CanvasRenderingContext2D, w: number, h: number, t: number) {
  g.fillStyle = '#1C1826'; g.fillRect(0, 0, w, h);
  const floor = Math.round(h * 0.72);
  g.fillStyle = '#2A2430'; g.fillRect(0, floor, w, h - floor);
  g.fillStyle = '#8AA0C0'; g.fillRect(w * 0.62, 12, 52, 38);
  g.fillStyle = '#C8D4E4'; g.fillRect(w * 0.62 + 24, 12, 4, 38); g.fillRect(w * 0.62, 28, 52, 4);
  g.fillStyle = 'rgba(200,220,255,0.16)';
  g.beginPath(); g.moveTo(w * 0.62, 50); g.lineTo(w * 0.62 + 52, 50); g.lineTo(w * 0.88, floor); g.lineTo(w * 0.48, floor); g.fill();
  g.fillStyle = '#8A6844'; g.fillRect(w * 0.08, floor - 28, w * 0.84, 28);
  g.fillStyle = '#E8D8C8'; g.fillRect(w * 0.10, floor - 34, w * 0.80, 16);
  g.fillStyle = '#F4EEF2'; g.fillRect(w * 0.16, floor - 28, 26, 16); g.fillRect(w * 0.30, floor - 26, 26, 14);
  const breathe = Math.sin(t * 1.4) * 0.6;
  figure(g, 'him', 'sleep', w * 0.32, floor - 16 + breathe, false, t, 1.95);
  figure(g, 'her', 'sleep', w * 0.48, floor - 14 - breathe, false, t, 1.95);
  g.fillStyle = 'rgba(232,200,196,0.94)';
  g.fillRect(w * 0.28, floor - 16, w * 0.42, 12);
  pet(g, 'calico', 'extra', w * 0.18, floor - 16, false, t, 1.55);
  pet(g, 'collie', 'extra', w * 0.78, floor, true, t, 1.65);
}

function drawSnow(g: CanvasRenderingContext2D, w: number, h: number, t: number) {
  const sky = g.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, '#6A7888'); sky.addColorStop(1, '#D0D8E4');
  g.fillStyle = sky; g.fillRect(0, 0, w, h);
  const floor = Math.round(h * 0.78);
  const th = Math.round(h * 0.74);
  tree(g, 18, floor, th, 3, true);
  tree(g, 52, floor, th + 18, 6, true);
  tree(g, w - 22, floor, th + 8, 9, true);
  tree(g, w - 56, floor, th - 16, 11, true);
  cottage(g, w * 0.62, floor, 0, true);
  g.fillStyle = '#F4F6FA'; g.fillRect(0, floor - 12, w, h - floor + 12);
  g.fillStyle = '#E4E8F0';
  for (let i = 0; i < 6; i++) g.fillRect(i * 60, floor - 8 - (i % 3), 50, 10);
  snowflakes(g, w, h, t, true);
  const k = (t % 6.4) / 6.4;
  const x = w * 0.08 + k * (w * 0.58);
  const bounce = Math.abs(Math.sin(t * 11)) * 2;
  figure(g, 'him', 'runHold', x, floor - bounce, false, t);
  figure(g, 'her', 'runHoldL', x + 28, floor - bounce, false, t);
  const claspY = floor - bounce - 24;
  g.fillStyle = '#E6C2AE';
  g.fillRect(Math.round(x + 12), Math.round(claspY), 10, 2);
  const dogBob = Math.abs(Math.sin(t * 14)) * 2;
  pet(g, 'collie', 'walk', x - 74, floor - dogBob, false, t, 2.15);
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
  const floor = h * 0.70;
  const sunY = floor + 6 - rise * (floor * 0.58);
  const sx = w * 0.5, sr = 16 + rise * 8;
  for (let i = 3; i >= 1; i--) {
    const R = sr * (1 + i * 0.55);
    g.fillStyle = `rgba(255,200,120,${(0.08 + rise * 0.08) / i})`;
    for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) {
      if (dx * dx + dy * dy <= R * R) g.fillRect((sx + dx) | 0, (sunY + dy) | 0, 1, 1);
    }
  }
  g.fillStyle = mix('#E8B070', '#FFE8A0', rise);
  for (let dy = -sr; dy <= sr; dy++) for (let dx = -sr; dx <= sr; dx++) if (dx * dx + dy * dy <= sr * sr) g.fillRect((sx + dx) | 0, (sunY + dy) | 0, 1, 1);
  g.fillStyle = mix('#1A2028', '#3A4A38', rise);
  g.beginPath(); g.moveTo(0, floor + 10);
  for (let x = 0; x <= w; x += 8) g.lineTo(x, floor - 14 - Math.sin(x * 0.04) * 16 - Math.sin(x * 0.01) * 8);
  g.lineTo(w, h); g.lineTo(0, h); g.fill();
  g.fillStyle = mix('#12161C', '#2A3828', rise);
  for (const px of [16, 44, w - 24, w - 52]) {
    g.beginPath();
    g.moveTo(px, floor + 6);
    g.lineTo(px + 10, floor - 56);
    g.lineTo(px + 20, floor + 6);
    g.fill();
  }
  const stand = floor - 2;
  figure(g, 'him', 'lean', w * 0.445, stand, false, t, 2.1);
  figure(g, 'her', 'lean', w * 0.555, stand, false, t, 2.1);
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

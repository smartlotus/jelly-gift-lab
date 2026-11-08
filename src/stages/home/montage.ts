// Future-life montage: six animated scenes dissolving into each other,
// then the final line fades in. Saved furniture is reused in the home / sofa frames.
import { drawPerson, drawPair, type Pose, type Who } from './people';
import { swingDoor } from './door';
import { drawFurnished } from './room';
import { critterFrame } from '../../shared/pixel/fauna';
import { type SavedItem } from './save';
import { drawDianaRose, drawLisianthusBloom } from '../wander/blooms';
import { art } from '../../art/loader';
import { coverPlate } from '../../art/blit';

export const SCENE_IDS = ['walk', 'greet', 'sofa', 'sleep', 'snow', 'dawn'] as const;
export type SceneId = typeof SCENE_IDS[number];
const DURS: Record<SceneId, number> = { walk: 7.2, greet: 5.6, sofa: 5.8, sleep: 5.6, snow: 6.4, dawn: 8.2 };
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
  const floor = Math.round(h * 0.86);
  const plate = art.plates.cottage;
  let hx = w * 0.42;
  let mapped: { x: number; y: number; s: number; dw: number; dh: number } | null = null;
  if (plate) {
    mapped = coverPlate(g, plate, w, h, 'cover-bottom');
    hx = mapped.x + mapped.dw * 0.48;
  } else {
    const sky = g.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#C8B0C8'); sky.addColorStop(0.42, '#E8B898'); sky.addColorStop(1, '#F0C8A8');
    g.fillStyle = sky; g.fillRect(0, 0, w, h);
    g.fillStyle = '#6A8A52'; g.fillRect(0, floor, w, h - floor);
    g.fillStyle = '#C8B48A'; g.fillRect(0, floor - 4, w, 8);
    cottage(g, hx, floor, 0, false);
    drawLisianthusBloom(g, hx - 10, floor - 28, 6.4, 0);
    drawDianaRose(g, hx + 108, floor - 30, 6.8, 1);
  }
  const walkT = 3.4;
  const doorStart = 3.4;
  const doorDur = 1.6;
  const open = t <= doorStart ? 0 : Math.min(1, (t - doorStart) / doorDur);
  if (open > 0) {
    if (mapped) {
      const doorX = mapped.x + mapped.dw * 0.468;
      const doorY = mapped.y + mapped.dh * 0.48;
      const doorW = mapped.dw * 0.07;
      const doorH = mapped.dh * 0.27;
      g.fillStyle = `rgba(255, 214, 140, ${0.12 + open * 0.28})`;
      g.fillRect(doorX | 0, doorY | 0, doorW | 0, doorH | 0);
    } else {
      swingDoor(g, hx + 46, floor - 54, 28, 54, open, true);
    }
  }
  const startX = w * 0.14;
  const pauseX = (mapped ? mapped.x + mapped.dw * 0.42 : hx) - 8;
  const arrive = Math.min(1, t / walkT);
  const x = startX + arrive * (pauseX - startX);
  const paused = t >= walkT;
  drawPair(g, paused ? 'hold' : 'walk', x, floor - 2, t, false, Math.round(h * 0.46));
}

function drawGreet(g: CanvasRenderingContext2D, w: number, h: number, t: number, layout: SavedItem[]) {
  const floor = Math.round(h * 0.72);
  const sofa = layout.find(i => i.kind === 'sofa');
  const sofaX = sofa ? (sofa.x / 320) * w : w * 0.48;
  g.save();
  g.beginPath(); g.rect(0, 0, w, h); g.clip();
  g.translate(w * 0.5, h * 0.68);
  g.scale(1.22, 1.22);
  g.translate(-sofaX, -floor);
  drawFurnished(g, w, h, layout, 1.15);
  const k = Math.min(1, t / 5.6);
  const herX = Math.min(sofaX - 90, w * 0.42);
  const himX = herX - 56;
  const dogSettle = himX - 50;
  const catSettle = herX + 48;
  figure(g, 'him', 'stand', himX, floor, false, t, 1);
  figure(g, 'her', 'stand', herX, floor, false, t, 1);
  const rush = 1 - Math.pow(1 - Math.min(1, k / 0.72), 2);
  const dogX = (w + 40) * (1 - rush) + dogSettle * rush;
  const catX = (w + 88) * (1 - rush) + catSettle * rush;
  pet(g, 'collie', k < 0.74 ? 'walk' : 'extra', dogX, floor, true, t, 1.35);
  pet(g, 'calico', k < 0.78 ? 'walk' : 'extra', catX, floor, true, t, 1.25);
  g.restore();
}

function drawSofa(g: CanvasRenderingContext2D, w: number, h: number, t: number, layout: SavedItem[]) {
  const floor = Math.round(h * 0.72);
  const sofa = layout.find(i => i.kind === 'sofa');
  const sx = sofa ? (sofa.x / 320) * w : w * 0.48;
  const tv = layout.find(i => i.kind === 'tv');
  const tvX = tv ? (tv.x / 320) * w : w * 0.18;
  g.save();
  g.beginPath(); g.rect(0, 0, w, h); g.clip();
  g.translate(w * 0.5, h * 0.70);
  g.scale(1.28, 1.28);
  g.translate(-sx, -floor);
  drawFurnished(g, w, h, layout, 1.15);
  g.fillStyle = `hsl(${200 + Math.sin(t * 9) * 20},48%,${58 + Math.sin(t * 13) * 8}%)`;
  g.fillRect(Math.round(tvX - 18), floor - 36, 34, 18);
  drawPair(g, 'sit', sx, floor - 3, t, false, Math.round(h * 0.33));
  g.restore();
}

function drawSleep(g: CanvasRenderingContext2D, w: number, h: number, t: number) {
  const floor = Math.round(h * 0.86);
  if (art.plates.interior) {
    const plate = art.plates.interior;
    const s = Math.max(w / plate.width, h / plate.height) * 1.55;
    const dw = plate.width * s, dh = plate.height * s;
    g.imageSmoothingEnabled = false;
    g.drawImage(plate, (w - dw) * 0.25, h - dh + Math.round(h * 0.10), dw, dh);
    g.fillStyle = 'rgba(16, 12, 28, 0.40)';
    g.fillRect(0, 0, w, h);
  } else {
    g.fillStyle = '#1C1826'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#2A2430'; g.fillRect(0, floor, w, h - floor);
  }
  const breathe = Math.sin(t * 1.4) * 1.2;
  const bh = Math.round(h * 0.40);
  if (art.furniture.bed) {
    g.imageSmoothingEnabled = false;
    g.drawImage(art.furniture.bed, w * 0.14, floor - bh, w * 0.72, bh);
  } else {
    g.fillStyle = '#8A6844'; g.fillRect(w * 0.16, floor - 28, w * 0.68, 28);
    g.fillStyle = '#E8D4C4'; g.fillRect(w * 0.18, floor - 34, w * 0.64, 20);
  }
  drawPair(g, 'sleep', w * 0.50, floor - Math.round(h * 0.10) + breathe, t, false, Math.round(h * 0.44));
}

function drawSnow(g: CanvasRenderingContext2D, w: number, h: number, t: number) {
  const floor = Math.round(h * 0.86);
  if (art.plates.cottage) {
    coverPlate(g, art.plates.cottage, w, h, 'cover-bottom');
    g.fillStyle = 'rgba(186, 204, 222, 0.32)';
    g.fillRect(0, 0, w, h);
  } else {
    const sky = g.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#6A7888'); sky.addColorStop(1, '#D0D8E4');
    g.fillStyle = sky; g.fillRect(0, 0, w, h);
    cottage(g, w * 0.62, floor, 0, true);
  }
  g.fillStyle = '#F4F6FA';
  for (let sx = 0; sx < w; sx++) {
    const top = floor - 8 - Math.round(Math.sin(sx * 0.05) * 5 + Math.sin(sx * 0.02) * 3);
    g.fillRect(sx, top, 1, h - top);
  }
  snowflakes(g, w, h, t, true);
  const k = (t % 6.4) / 6.4;
  const x = w * 0.16 + k * (w * 0.50);
  const bounce = Math.abs(Math.sin(t * 11)) * 2;
  // run frames already include a separate running dog
  drawPair(g, 'run', x, floor - bounce, t, false, Math.round(h * 0.44));
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
  drawPair(g, 'lean', w * 0.5, stand, t, false, Math.round(h * 0.50));
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
        const prev = SCENE_IDS[idx - 1]!;
        // Sleep is full of large filled rects (bed, window, light cone). Blitting it
        // over the snow landscape reads as semi-transparent rectangular blocks on
        // the sky / trees / roof. Dissolve through a dark veil instead.
        if (prev === 'sleep' && id === 'snow') {
          g.fillStyle = `rgba(16, 18, 24, ${(1 - t / FADE) * 0.55})`;
          g.fillRect(0, 0, w, h);
        } else {
          if (buf.width !== w || buf.height !== h) { buf.width = w; buf.height = h; }
          const bg = buf.getContext('2d')!;
          drawScene(prev, bg, w, h, DURS[prev]!);
          g.save(); g.globalAlpha = 1 - t / FADE; g.drawImage(buf, 0, 0); g.restore();
        }
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

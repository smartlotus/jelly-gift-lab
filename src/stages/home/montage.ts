// Future-life montage: six animated scenes (not title cards) dissolving into each other,
// then the final line fades in. Saved furniture is reused in the home / sofa frames.
import { drawPerson } from './people';
import { drawFurnished } from './room';
import { critterFrame } from '../../shared/pixel/fauna';
import { draw } from '../../shared/pixel/sprite';
import { type SavedItem } from './save';

export const SCENE_IDS = ['walk', 'greet', 'sofa', 'sleep', 'snow', 'dawn'] as const;
export type SceneId = typeof SCENE_IDS[number];
const DURS: Record<SceneId, number> = { walk: 5.8, greet: 5.6, sofa: 5.8, sleep: 5.6, snow: 6.4, dawn: 8.2 };
const FADE = 0.7;

export interface MontageApi {
  update(dt: number): void;
  render(g: CanvasRenderingContext2D, w: number, h: number): void;
  skip(): void;
  replay(): void;
  get scene(): SceneId | 'finale';
  get finaleT(): number;
}

function snowflakes(g: CanvasRenderingContext2D, w: number, h: number, t: number, heavy: boolean) {
  g.fillStyle = '#F8F8FC';
  const n = heavy ? 90 : 40;
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
  sky.addColorStop(0, '#C8B0C8'); sky.addColorStop(0.55, '#E8B898'); sky.addColorStop(1, '#F0C8A8');
  g.fillStyle = sky; g.fillRect(0, 0, w, h);
  g.fillStyle = '#6A8A52'; g.fillRect(0, floor, w, h - floor);
  g.fillStyle = '#C8B48A'; g.fillRect(0, floor - 2, w, 4);
  // house slides toward them as they walk
  const hx = w * 0.72 - k * 20;
  g.fillStyle = '#E8D4B8'; g.fillRect(hx, floor - 58, 58, 58);
  g.fillStyle = '#C45A5A';
  g.beginPath(); g.moveTo(hx - 6, floor - 56); g.lineTo(hx + 29, floor - 82); g.lineTo(hx + 64, floor - 56); g.fill();
  const open = Math.max(0, (k - 0.62) / 0.3);
  g.fillStyle = '#2E2A2B'; g.fillRect(hx + 22, floor - 32, 14, 32);
  g.fillStyle = '#C4A06A'; g.fillRect(hx + 22 + open * 10, floor - 32, 14 - open * 8, 32);
  g.fillStyle = '#FFE6B0'; if (open > 0.2) g.fillRect(hx + 24, floor - 30, 6, 28);
  const x = 28 + k * (hx + 10 - 40);
  drawPerson(g, 'him', 'hold', x, floor, false, t);
  drawPerson(g, 'her', 'hold', x + 16, floor, false, t);
}

function drawGreet(g: CanvasRenderingContext2D, w: number, h: number, t: number, layout: SavedItem[]) {
  drawFurnished(g, w, h, layout);
  const floor = h - Math.max(16, Math.round(h * 0.14));
  const k = Math.min(1, t / 5.6);
  drawPerson(g, 'him', 'kneel', w * 0.42, floor, false, t);
  drawPerson(g, 'her', 'kneel', w * 0.55, floor, true, t);
  // pets run in
  const dogX = w + 10 - k * (w * 0.55);
  const catX = w + 40 - k * (w * 0.48);
  const dog = critterFrame('collie', k < 0.85 ? 'walk' : 'extra', t);
  const kit = critterFrame('calico', k < 0.8 ? 'walk' : 'extra', t);
  draw(g, dog, Math.round(dogX), floor - dog.height, true);
  draw(g, kit, Math.round(catX), floor - kit.height, true);
}

function drawSofa(g: CanvasRenderingContext2D, w: number, h: number, t: number, layout: SavedItem[]) {
  drawFurnished(g, w, h, layout);
  const floor = h - Math.max(16, Math.round(h * 0.14));
  // TV flicker
  const tvX = Math.round(w * 0.14), tvY = floor - 48;
  g.fillStyle = `hsl(${200 + Math.sin(t * 9) * 20},40%,${55 + Math.sin(t * 13) * 8}%)`;
  g.fillRect(tvX + 4, tvY + 4, 26, 12);
  drawPerson(g, 'him', 'sit', w * 0.46, floor - 6, false, t);
  drawPerson(g, 'her', 'lean', w * 0.58, floor - 6, false, t);
  const dog = critterFrame('collie', 'extra', t);
  const kit = critterFrame('calico', 'extra', t);
  draw(g, dog, Math.round(w * 0.3), floor - dog.height, false);
  draw(g, kit, Math.round(w * 0.62), floor - kit.height - 8, false);
}

function drawSleep(g: CanvasRenderingContext2D, w: number, h: number, t: number) {
  g.fillStyle = '#1A2230'; g.fillRect(0, 0, w, h);
  const floor = h - 20;
  g.fillStyle = '#2A2830'; g.fillRect(0, floor, w, h - floor);
  // moonlight window
  g.fillStyle = '#8AA0C0'; g.fillRect(w * 0.7, 12, 36, 28);
  g.fillStyle = 'rgba(200,220,255,0.12)'; g.fillRect(w * 0.55, 12, 80, h);
  // bed
  g.fillStyle = '#C4A06A'; g.fillRect(w * 0.18, floor - 18, w * 0.56, 18);
  g.fillStyle = '#E8D8C8'; g.fillRect(w * 0.2, floor - 22, w * 0.52, 12);
  const breathe = Math.sin(t * 1.4) * 0.6;
  drawPerson(g, 'him', 'sleep', w * 0.38, floor - 16 + breathe, false, t);
  drawPerson(g, 'her', 'sleep', w * 0.52, floor - 15 - breathe, false, t);
  // blanket
  g.fillStyle = 'rgba(232,200,196,0.92)';
  g.fillRect(w * 0.28, floor - 14, w * 0.38, 10);
  const kit = critterFrame('calico', 'extra', t);
  const dog = critterFrame('collie', 'extra', t);
  draw(g, kit, Math.round(w * 0.24), floor - kit.height - 10, false);
  draw(g, dog, Math.round(w * 0.68), floor - dog.height, true);
}

function drawSnow(g: CanvasRenderingContext2D, w: number, h: number, t: number) {
  const sky = g.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, '#9AA8B8'); sky.addColorStop(1, '#E8EEF4');
  g.fillStyle = sky; g.fillRect(0, 0, w, h);
  const floor = h - 24;
  g.fillStyle = '#F4F6FA'; g.fillRect(0, floor - 8, w, h - floor + 8);
  // drifts
  g.fillStyle = '#E4E8F0';
  for (let i = 0; i < 6; i++) g.fillRect(i * 60, floor - 4 - (i % 3), 50, 6);
  snowflakes(g, w, h, t, true);
  const k = (t % 6.4) / 6.4;
  const x = 20 + k * (w - 70);
  drawPerson(g, 'him', 'run', x, floor, false, t);
  drawPerson(g, 'her', 'run', x + 18, floor, false, t);
  const dog = critterFrame('collie', 'walk', t);
  draw(g, dog, Math.round(x - 16), floor - dog.height, false);
}

function drawDawn(g: CanvasRenderingContext2D, w: number, h: number, t: number) {
  const k = Math.min(1, t / 8.2);
  const sky = g.createLinearGradient(0, 0, 0, h);
  const rise = k * k * (3 - 2 * k);
  sky.addColorStop(0, mix('#141828', '#F0A070', rise));
  sky.addColorStop(0.45, mix('#2A3048', '#F8C888', rise));
  sky.addColorStop(1, mix('#3A4058', '#F8E0C0', rise));
  g.fillStyle = sky; g.fillRect(0, 0, w, h);
  const floor = h * 0.72;
  const sunY = floor + 10 - rise * (floor * 0.55);
  const sx = w * 0.5, sr = 10 + rise * 4;
  g.fillStyle = mix('#E8B070', '#FFE8A0', rise);
  for (let dy = -sr; dy <= sr; dy++) for (let dx = -sr; dx <= sr; dx++) if (dx * dx + dy * dy <= sr * sr) g.fillRect((sx + dx) | 0, (sunY + dy) | 0, 1, 1);
  g.fillStyle = mix('#2A3040', '#3A4A38', rise);
  g.fillRect(0, floor, w, h - floor);
  // hill silhouette
  g.beginPath(); g.moveTo(0, floor + 4);
  for (let x = 0; x <= w; x += 8) g.lineTo(x, floor - 8 - Math.sin(x * 0.04) * 10);
  g.lineTo(w, h); g.lineTo(0, h); g.fill();
  drawPerson(g, 'him', 'lean', w * 0.46, floor + 18, false, t);
  drawPerson(g, 'her', 'lean', w * 0.56, floor + 18, false, t);
}

function mix(a: string, b: string, k: number): string {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  const ch = (s: number, o: number) => Math.round(((s >> o) & 255) * (1 - k) + ((pb >> o) & 255) * k);
  const r = ch(pa, 16), g = ch(pa, 8), bl = ch(pa, 0);
  return `rgb(${r},${g},${bl})`;
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
        // gentle dim so the words can live on top
        g.fillStyle = `rgba(243,235,224,${Math.min(0.28, finaleT * 0.08)})`;
        g.fillRect(0, 0, w, h);
        return;
      }
      const id = SCENE_IDS[idx]!;
      drawScene(id, g, w, h, t);
      if (t < FADE && idx > 0) {
        // crossfade from previous
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
    get scene() { return idx >= SCENE_IDS.length ? 'finale' : SCENE_IDS[idx]!; },
    get finaleT() { return finaleT; },
  };
  return api;
}

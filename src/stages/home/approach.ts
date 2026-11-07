// Opening of /home/: pig and cat walk a quiet path and notice an empty house.
// Dialogue (exact): 「这里有一间空房子诶，我们可以布置一下」
import { draw } from '../../shared/pixel/sprite';
import { catSprites, catFrame } from '../../shared/pixel/cat';
import { pigSprites, pigFrame } from '../../shared/pixel/pig';
import { t } from '../../shared/i18n';
import { opened } from './sfx';
import { drawDianaRose, drawLisianthusBloom } from '../wander/blooms';

export interface ApproachApi {
  update(dt: number): void;
  render(g: CanvasRenderingContext2D, w: number, h: number): void;
  done: boolean;
  lineOn: boolean;
  skip(): void;
}

function disc(g: CanvasRenderingContext2D, x: number, y: number, r: number, c: string) {
  const R = Math.max(1, Math.round(r));
  g.fillStyle = c;
  for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) {
    if (dx * dx + dy * dy * 0.85 <= r * r) g.fillRect((x + dx) | 0, (y + dy) | 0, 1, 1);
  }
}

function tree(g: CanvasRenderingContext2D, x: number, floor: number, h: number, seed: number) {
  const tw = 3 + (seed % 3);
  g.fillStyle = '#6A4E34'; g.fillRect((x - (tw >> 1)) | 0, floor - h + 18, tw, h - 18);
  g.fillStyle = '#5A3E28'; g.fillRect((x - (tw >> 1)) | 0, floor - h + 18, 1, h - 18);
  const blobs = 4 + (seed % 3);
  for (let i = 0; i < blobs; i++) {
    disc(g, x + Math.sin(seed + i * 1.8) * 10, floor - h + 10 + (i % 3) * 7, 9 + (i % 3) * 3, i % 2 ? '#5E8444' : '#4A6E36');
  }
}

function house(g: CanvasRenderingContext2D, hx: number, floor: number, open: number) {
  const hy = floor - 84;
  // chimney
  g.fillStyle = '#A87868'; g.fillRect(hx + 52, hy + 8, 8, 18);
  g.fillStyle = '#8A5A4E'; g.fillRect(hx + 50, hy + 6, 12, 4);
  // body
  g.fillStyle = '#E8D4B8'; g.fillRect(hx, hy + 24, 78, 60);
  g.fillStyle = '#D4C0A4'; g.fillRect(hx + 78, hy + 28, 6, 56);
  // roof
  g.fillStyle = '#B24A4A';
  g.beginPath(); g.moveTo(hx - 8, hy + 26); g.lineTo(hx + 40, hy - 6); g.lineTo(hx + 88, hy + 26); g.fill();
  g.fillStyle = '#C45A5A';
  g.beginPath(); g.moveTo(hx - 4, hy + 26); g.lineTo(hx + 40, hy); g.lineTo(hx + 84, hy + 26); g.fill();
  // empty windows — dark inside to read as vacant
  g.fillStyle = '#3A3E48'; g.fillRect(hx + 8, hy + 34, 16, 14);
  g.fillStyle = '#8AA8B8'; g.fillRect(hx + 8, hy + 34, 16, 2);
  g.fillStyle = '#C8B898'; g.fillRect(hx + 15, hy + 34, 2, 14); g.fillRect(hx + 8, hy + 40, 16, 2);
  g.fillStyle = '#3A3E48'; g.fillRect(hx + 8, hy + 52, 12, 10);
  g.fillStyle = '#C8B898'; g.fillRect(hx + 13, hy + 52, 2, 10);
  // door
  g.fillStyle = '#2E2A2B'; g.fillRect(hx + 44, hy + 42, 18, 42);
  g.fillStyle = '#C4A06A'; g.fillRect(hx + 44 + open * 14, hy + 42, Math.max(3, 18 - open * 14), 42);
  if (open > 0.15) {
    g.fillStyle = '#FFE6B8'; g.fillRect(hx + 46, hy + 44, 8, 38);
  } else {
    g.fillStyle = '#8A6A40'; g.fillRect(hx + 56, hy + 62, 2, 4); // knob
  }
  // step
  g.fillStyle = '#C8B48A'; g.fillRect(hx + 40, floor - 4, 26, 4);
}

export function createApproach(): ApproachApi {
  const catSp = catSprites();
  const pigSp = pigSprites();
  let t0 = 0, catX = 20, pigX = 4, phase: 'walk' | 'look' | 'talk' | 'enter' = 'walk';
  let done = false, lineOn = false, spoken = false;

  const floorOf = (h: number) => h - Math.max(24, Math.round(h * 0.14));

  const api: ApproachApi = {
    get done() { return done; },
    get lineOn() { return lineOn; },
    skip() {
      if (phase === 'walk' || phase === 'look') { phase = 'talk'; lineOn = true; catX = 118; pigX = 102; }
      else if (phase === 'talk') { phase = 'enter'; }
      else done = true;
    },
    update(dt) {
      t0 += dt;
      if (phase === 'walk') {
        catX += 22 * dt; pigX += 22 * dt;
        if (catX > 118) { phase = 'look'; t0 = 0; }
      } else if (phase === 'look') {
        if (t0 > 0.8 && !spoken) { spoken = true; lineOn = true; phase = 'talk'; t0 = 0; }
      } else if (phase === 'talk') {
        if (t0 > 3.2) { phase = 'enter'; t0 = 0; opened(); }
      } else if (phase === 'enter') {
        catX += 16 * dt; pigX += 16 * dt;
        if (t0 > 1.5) done = true;
      }
    },
    render(g, w, h) {
      const floor = floorOf(h);
      const sky = g.createLinearGradient(0, 0, 0, h);
      sky.addColorStop(0, '#F2C8B4'); sky.addColorStop(0.45, '#F0B8A4'); sky.addColorStop(1, '#E8A888');
      g.fillStyle = sky; g.fillRect(0, 0, w, h);
      // late sun
      g.fillStyle = '#FFE2A8';
      const sx = w * 0.78, sy = h * 0.16;
      for (let dy = -12; dy <= 12; dy++) for (let dx = -12; dx <= 12; dx++) if (dx * dx + dy * dy <= 144) g.fillRect((sx + dx) | 0, (sy + dy) | 0, 1, 1);
      // far hills
      g.fillStyle = '#C88890';
      g.beginPath(); g.moveTo(0, floor - 70);
      for (let x = 0; x <= w; x += 10) g.lineTo(x, floor - 62 - Math.sin(x * 0.03) * 16);
      g.lineTo(w, h); g.lineTo(0, h); g.fill();
      g.fillStyle = '#A07078';
      g.beginPath(); g.moveTo(0, floor - 44);
      for (let x = 0; x <= w; x += 10) g.lineTo(x, floor - 40 - Math.sin(x * 0.045 + 1) * 12);
      g.lineTo(w, h); g.lineTo(0, h); g.fill();
      // trees, mixed heights
      for (let i = 0; i < 7; i++) tree(g, 8 + i * 28, floor, 52 + (i % 3) * 14, 3 + i * 5);
      tree(g, w - 18, floor, 64, 21);
      tree(g, w - 42, floor, 48, 17);
      // ground + path
      g.fillStyle = '#7AA85A'; g.fillRect(0, floor, w, h - floor);
      g.fillStyle = '#6A944C'; g.fillRect(0, floor, w, 2);
      g.fillStyle = '#D8C29A'; g.fillRect(0, floor - 3, w, 8);
      g.fillStyle = '#E8D6B0';
      for (let x = 0; x < w; x += 9) g.fillRect(x, floor, 2, 1);
      g.fillStyle = '#5E8A40';
      for (let x = 4; x < w; x += 11) {
        const hh = 2 + (x * 13 % 4);
        g.fillRect(x, floor - hh - 3, 1, hh);
        g.fillRect(x + 2, floor - hh - 2, 1, hh - 1);
      }
      const hx = Math.min(w - 100, 168);
      house(g, hx, floor, phase === 'enter' ? Math.min(1, t0 * 1.4) : 0);
      // a couple of the real bouquet flowers by the stoop
      drawLisianthusBloom(g, hx - 10, floor - 18, 5.2, -0.1);
      drawDianaRose(g, hx + 86, floor - 20, 5.6, 1);
      const pigImg = pigFrame(pigSp, { vx: phase === 'look' || phase === 'talk' ? 0 : 22, vy: 0, ground: true }, t0, 1);
      const catImg = catFrame(catSp, { vx: phase === 'look' || phase === 'talk' ? 0 : 22, vy: 0, ground: true }, t0, 1);
      draw(g, pigImg, Math.round(pigX), floor - 16, false);
      draw(g, catImg, Math.round(catX), floor - 16, false);
      void w;
    },
  };
  void t;
  return api;
}

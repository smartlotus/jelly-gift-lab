// Opening of /home/: pig and cat walk a quiet path and notice an empty house.
// Dialogue (exact): 「这里有一间空房子诶，我们可以布置一下」
import { catSprites, catFrame } from '../../shared/pixel/cat';
import { pigSprites, pigFrame } from '../../shared/pixel/pig';
import { t } from '../../shared/i18n';
import { opened } from './sfx';
import { drawDianaRose, drawLisianthusBloom } from '../wander/blooms';
import { swingDoor } from './door';
import { art } from '../../art/loader';
import { coverPlate } from '../../art/blit';

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
  const tw = 4 + (seed % 3);
  g.fillStyle = '#6A4E34'; g.fillRect((x - (tw >> 1)) | 0, floor - h + 16, tw, h - 16);
  g.fillStyle = '#5A3E28'; g.fillRect((x - (tw >> 1)) | 0, floor - h + 16, 1, h - 16);
  const blobs = 6 + (seed % 3);
  for (let i = 0; i < blobs; i++) {
    disc(g, x + Math.sin(seed + i * 1.8) * 16, floor - h + 18 + (i % 4) * 16, 14 + (i % 3) * 5, i % 2 ? '#5E8444' : '#4A6E36');
  }
}


function house(g: CanvasRenderingContext2D, hx: number, floor: number, open: number) {
  const hy = floor - 118;
  g.fillStyle = '#A87868'; g.fillRect(hx + 70, hy + 10, 12, 26);
  g.fillStyle = '#8A5A4E'; g.fillRect(hx + 68, hy + 8, 16, 6);
  g.fillStyle = '#E8D4B8'; g.fillRect(hx, hy + 34, 98, 84);
  g.fillStyle = '#D4C0A4'; g.fillRect(hx + 98, hy + 40, 8, 78);
  g.fillStyle = '#B24A4A';
  g.beginPath(); g.moveTo(hx - 10, hy + 36); g.lineTo(hx + 50, hy - 8); g.lineTo(hx + 114, hy + 36); g.fill();
  g.fillStyle = '#C45A5A';
  g.beginPath(); g.moveTo(hx - 4, hy + 36); g.lineTo(hx + 50, hy); g.lineTo(hx + 108, hy + 36); g.fill();
  g.fillStyle = '#3A3E48'; g.fillRect(hx + 10, hy + 46, 20, 18);
  g.fillStyle = '#8AA8B8'; g.fillRect(hx + 10, hy + 46, 20, 3);
  g.fillStyle = '#C8B898'; g.fillRect(hx + 19, hy + 46, 2, 18); g.fillRect(hx + 10, hy + 54, 20, 2);
  g.fillStyle = '#3A3E48'; g.fillRect(hx + 10, hy + 70, 16, 12);
  g.fillStyle = '#C8B898'; g.fillRect(hx + 17, hy + 70, 2, 12);
  swingDoor(g, hx + 50, hy + 52, 28, 66, open, open > 0.12);
  g.fillStyle = '#C8B48A'; g.fillRect(hx + 46, floor - 6, 36, 6);
  // stoop plants already drawn by caller
}

export function createApproach(): ApproachApi {
  const catSp = catSprites();
  const pigSp = pigSprites();
  let t0 = 0, catX = 20, pigX = 4, phase: 'walk' | 'look' | 'talk' | 'enter' = 'walk';
  let done = false, lineOn = false, spoken = false;

  const floorOf = (h: number) => h - Math.max(36, Math.round(h * 0.18));

  const api: ApproachApi = {
    get done() { return done; },
    get lineOn() { return lineOn; },
    skip() {
      if (phase === 'walk' || phase === 'look') { phase = 'talk'; lineOn = true; catX = 108; pigX = 90; }
      else if (phase === 'talk') { phase = 'enter'; }
      else done = true;
    },
    update(dt) {
      t0 += dt;
      if (phase === 'walk') {
        catX += 22 * dt; pigX += 22 * dt;
        if (catX > 108) { phase = 'look'; t0 = 0; }
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
      if (art.plates.cottage) {
        coverPlate(g, art.plates.cottage, w, h, 'cover-bottom');
        if (phase === 'enter') {
          const open = Math.min(1, t0 / 0.8);
          swingDoor(g, w * 0.468, h * 0.50, w * 0.07, h * 0.22, open, true);
        }
      } else {
      const sky = g.createLinearGradient(0, 0, 0, h);
      sky.addColorStop(0, '#F2C8B4'); sky.addColorStop(0.45, '#F0B8A4'); sky.addColorStop(1, '#E8A888');
      g.fillStyle = sky; g.fillRect(0, 0, w, h);
      g.fillStyle = '#7AA85A'; g.fillRect(0, floor, w, h - floor);
      const hx = Math.min(w - 96, Math.max(70, Math.round(w * 0.46)));
      house(g, hx, floor, phase === 'enter' ? Math.min(1, t0 / 0.8) : 0);
      drawLisianthusBloom(g, hx - 14, floor - 28, 7.2, -0.1);
      drawDianaRose(g, hx + 92, floor - 30, 7.6, 1);
      }
      const pigImg = pigFrame(pigSp, { vx: phase === 'look' || phase === 'talk' ? 0 : 22, vy: 0, ground: true }, t0, 1);
      const catImg = catFrame(catSp, { vx: phase === 'look' || phase === 'talk' ? 0 : 22, vy: 0, ground: true }, t0, 1);
      const blit = (img: HTMLCanvasElement, x: number) => {
        g.save(); g.imageSmoothingEnabled = false; g.translate(x, floor); g.scale(1.35, 1.35); g.drawImage(img, 0, -img.height); g.restore();
      };
      blit(pigImg, Math.round(pigX));
      blit(catImg, Math.round(catX));
      void w;
    },
  };
  void t;
  return api;
}

// Opening of /home/: pig and cat walk a quiet path and notice an empty house.
// Dialogue (exact): 「这里有一间空房子诶，我们可以布置一下」
import { draw } from '../../shared/pixel/sprite';
import { catSprites, catFrame } from '../../shared/pixel/cat';
import { pigSprites, pigFrame } from '../../shared/pixel/pig';
import { t } from '../../shared/i18n';
import { opened } from './sfx';

export interface ApproachApi {
  update(dt: number): void;
  render(g: CanvasRenderingContext2D, w: number, h: number): void;
  done: boolean;
  lineOn: boolean;
  skip(): void;
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
      if (phase === 'walk' || phase === 'look') { phase = 'talk'; lineOn = true; }
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
      // late-afternoon path
      const sky = g.createLinearGradient(0, 0, 0, h);
      sky.addColorStop(0, '#F0D0C0'); sky.addColorStop(1, '#E8B8A8');
      g.fillStyle = sky; g.fillRect(0, 0, w, h);
      g.fillStyle = '#8FBF6A'; g.fillRect(0, floor, w, h - floor);
      g.fillStyle = '#D8C29A'; g.fillRect(0, floor - 2, w, 6);
      // far trees
      g.fillStyle = '#6E8C54';
      for (let i = 0; i < 8; i++) {
        const x = 10 + i * 48;
        g.fillRect(x + 10, floor - 36, 6, 36);
        g.beginPath(); g.arc(x + 13, floor - 40, 16, 0, Math.PI * 2); g.fill();
      }
      // empty house
      const hx = Math.min(w - 90, 168), hy = floor - 70;
      g.fillStyle = '#E8D4B8'; g.fillRect(hx, hy + 18, 72, 52);
      g.fillStyle = '#C45A5A'; // roof
      g.beginPath(); g.moveTo(hx - 6, hy + 20); g.lineTo(hx + 36, hy - 8); g.lineTo(hx + 78, hy + 20); g.fill();
      g.fillStyle = '#6A9AB8'; g.fillRect(hx + 8, hy + 28, 14, 12);
      g.fillStyle = '#2E2A2B';
      const doorOpen = phase === 'enter' ? Math.min(1, t0 * 1.4) : 0;
      g.fillRect(hx + 40, hy + 34, 16, 36);
      g.fillStyle = '#C4A06A';
      g.fillRect(hx + 40 + doorOpen * 12, hy + 34, 16 - doorOpen * 10, 36);
      if (phase !== 'walk') {
        // a little ?? from the pig
      }
      const pigImg = pigFrame(pigSp, { vx: phase === 'look' || phase === 'talk' ? 0 : 22, vy: 0, ground: true }, t0, 1);
      const catImg = catFrame(catSp, { vx: phase === 'look' || phase === 'talk' ? 0 : 22, vy: 0, ground: true }, t0, 1);
      draw(g, pigImg, Math.round(pigX), floor - 16, false);
      draw(g, catImg, Math.round(catX), floor - 16, false);
      // scale characters to sit in wider views — already 16px, fine
      void w;
    },
  };
  void t; // dialogue is rendered by main via data-i18n
  return api;
}

// TEMPORARY scaffold scene used by the stage stubs (meadow, shop) until each stage is built: flat ground, the cat,
// a door on the far right -> next stage. Proves the shared engine (screen, loop, input, touch, tiles, camera, sprites, flow).
// Delete the import from a stage once it has its real level.
import { PixelScreen } from './screen';
import { startLoop } from './loop';
import { input } from './input';
import { mountTouch } from './touch';
import { makeMap, body, moveBody, find, overlap, TILE } from './tiles';
import { Camera } from './camera';
import { catSprites } from './cat';
import { draw, frameAt } from './sprite';
import { go, prefetchNext } from '../flow';
import { irisOut } from '../transition';

export function stubWalk(host: HTMLElement, o: { sky: string; ground: string; label: string; length?: number }) {
  const L = o.length ?? 48, H = 12;
  const rows = Array.from({ length: H }, (_, y) => (y >= H - 2 ? '#'.repeat(L) : y === H - 4 ? ' '.repeat(L - 3) + 'D  ' : ' '.repeat(L)));
  rows[1] = ' S' + ' '.repeat(L - 2);
  const map = makeMap(rows, c => c === '#');
  const scr = new PixelScreen({ host, minW: 256, minH: 160, maxH: H * TILE });
  const cam = new Camera(L * TILE, H * TILE);
  const s = find(map, 'S')[0], door = find(map, 'D')[0];
  const cat = body(s.x, (H - 3) * TILE);
  const doorBox = { x: door.x + 2, y: door.y, w: 12, h: 32 };
  const sp = catSprites(); mountTouch();
  let t = 0, leaving = false, prefetched = false;
  cam.snap(cat.x, cat.y, scr.w, scr.h);
  startLoop(dt => {
    input.update(); t += dt;
    moveBody(cat, map, dt, input.axis(), input.hit('jump') || input.hit('up'), input.pressed('jump') || input.pressed('up'));
    cam.follow(cat.x + cat.w / 2, cat.y, cat.face, scr.w, scr.h, dt);
    if (!prefetched && cat.x > door.x - 160) { prefetched = true; prefetchNext(); }
    if (!leaving && overlap(cat, doorBox)) {
      leaving = true; input.enabled = false;
      const c = scr.toClient(cat.x + cat.w / 2 - cam.ix, cat.y + cat.h / 2 - cam.iy);
      void go(undefined, () => irisOut(c.x, c.y));
    }
  }, () => {
    const g = scr.ctx, ox = -cam.ix, oy = -cam.iy;
    g.fillStyle = o.sky; g.fillRect(0, 0, scr.w, scr.h);
    g.fillStyle = o.ground;
    for (let ty = 0; ty < map.h; ty++) for (let tx = 0; tx < map.w; tx++) if (map.data[ty][tx] === '#') g.fillRect(tx * TILE + ox, ty * TILE + oy, TILE, TILE);
    g.fillStyle = '#2E2A2B'; g.fillRect(door.x + ox, door.y + oy, 16, 32); g.fillStyle = '#FFD45C'; g.fillRect(door.x + 11 + ox, door.y + 17 + oy, 2, 2);
    g.fillStyle = '#2E2A2B'; g.font = '8px monospace'; g.fillText(o.label, 24 + ox, 40 + oy);
    const img = cat.ground ? (Math.abs(cat.vx) > 5 ? frameAt(sp.walk, t) : frameAt(sp.idle, t)) : sp.jump;
    draw(g, img, cat.x + cat.w / 2 - 7 + ox, cat.y + cat.h - 16 + oy, cat.face < 0);
  });
}

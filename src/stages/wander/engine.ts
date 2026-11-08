// Shared leisurely side-scroll stroll used by /flower/ and /mushroom/.
// The hero cat walks a long, layered wood; woodland animals cross her path (no fail state).
// Touch: hold or drag — she walks toward the finger. Keyboard: ← → / A D. Dev: ?at=end · ?auto.
import { PixelScreen } from '../../shared/pixel/screen';
import { startLoop } from '../../shared/pixel/loop';
import { input } from '../../shared/pixel/input';
import { Camera } from '../../shared/pixel/camera';
import { critterFrame, type CritterKind } from '../../shared/pixel/fauna';
import { params, reducedMotion } from '../../shared/flow';
import { drawPetal, drawDianaRose, drawLisianthusBloom } from './blooms';
import { drawSpore, drawShroom } from './shrooms';
import { chime } from '../../shared/music';
import { pathY } from './fields';
import { blitGroundSequence, worldWidthOf } from '../../art/blit';
import { art } from '../../art/loader';
import { cat32Sprites, cat32Frame } from '../../shared/pixel/cat32';

export type WoodTheme = 'flower' | 'mushroom';
export interface WoodOpts {
  host: HTMLElement;
  theme: WoodTheme;
  onNearExit: () => void;
  onExit: (cx: number, cy: number) => void;
}

const WORLD_W = 3400;

interface Theme {
  sky0: string; sky1: string; sky2: string;
  far: string; far2: string;
  trunk: string; trunkD: string;
  canopy: string; canopyD: string;
  ground: string; groundD: string; path: string; pathHi: string;
  grass: string; sun: string; fg: string; mote: string;
}

const FLOWER: Theme = {
  sky0: '#F7D5C8', sky1: '#F3C6D4', sky2: '#E8B4D0',
  far: '#E0A0B8', far2: '#C888A8',
  trunk: '#8A6A48', trunkD: '#6A4E34',
  canopy: '#7AA05A', canopyD: '#5E8444',
  ground: '#8FBF6A', groundD: '#6E9A4E', path: '#D8C29A', pathHi: '#E8D6B0',
  grass: '#5E8A40', sun: '#FFE2A8', fg: '#3E5A2C', mote: 'rgba(255,244,230,.55)',
};
const MUSH: Theme = {
  sky0: '#1A2438', sky1: '#243848', sky2: '#1E3A40',
  far: '#2A3A48', far2: '#1C2C38',
  trunk: '#3A2E28', trunkD: '#241C18',
  canopy: '#1E3A36', canopyD: '#142824',
  ground: '#2A3A30', groundD: '#1C2A22', path: '#3A4034', pathHi: '#4A5244',
  grass: '#3A5A42', sun: '#E8E0C0', fg: '#0E1A16', mote: 'rgba(168,240,224,.45)',
};

interface Prop { x: number; img: HTMLCanvasElement; ax: number; layer: 'mid' | 'near' | 'fg' }
interface Critter {
  kind: CritterKind; x: number; vx: number; face: number;
  mode: 'walk' | 'stand' | 'extra' | 'fly';
  phase: 'in' | 'notice' | 'out';
  age: number; notice: number;
}
interface Particle { x: number; y: number; vx: number; vy: number; rot: number; kind: 'diana' | 'lisi' | 'spore' | 'fire'; s: number; life: number }

const rnd = (n: number) => { let s = n | 0 || 1; return () => { s = Math.imul(s ^ (s << 13), 1597334677); s = Math.imul(s ^ (s >>> 16), 3812015801); return (s >>> 0) / 4294967296; }; };

function wrapX(n: number, m: number) { return ((n % m) + m) % m; }

function blob(g: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, c: string, seed = 1, scallopAmp = 0.06) {
  g.fillStyle = c;
  const Rx = Math.max(1, Math.round(rx)), Ry = Math.max(1, Math.round(ry));
  for (let dy = -Ry; dy <= Ry; dy++) for (let dx = -Rx; dx <= Rx; dx++) {
    const ang = Math.atan2(dy, dx);
    const scallop = 1 + scallopAmp * Math.sin(ang * 3 + seed);
    if ((dx * dx) / (rx * rx) + (dy * dy) / (ry * ry) <= scallop) g.fillRect((x + dx) | 0, (y + dy) | 0, 1, 1);
  }
}

function bakeTree(th: Theme, h: number, w: number, seed: number, mush: boolean): HTMLCanvasElement {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d')!;
  const tx = (w / 2) | 0, tw = Math.max(6, (w * 0.15) | 0);
  g.fillStyle = th.trunk; g.fillRect(tx - (tw >> 1), (h * 0.06) | 0, tw, (h * 0.94) | 0);
  g.fillStyle = th.trunkD; g.fillRect(tx - (tw >> 1), (h * 0.06) | 0, 2, (h * 0.94) | 0);
  g.fillStyle = th.trunk;
  g.fillRect(tx, (h * 0.22) | 0, (w * 0.28) | 0, 4);
  g.fillRect(tx - (w * 0.24 | 0), (h * 0.34) | 0, (w * 0.24) | 0, 4);
  g.fillRect(tx + 2, (h * 0.48) | 0, (w * 0.18) | 0, 3);
  const clumps = 11 + (seed % 4);
  for (let i = 0; i < clumps; i++) {
    const cx = tx + Math.sin(seed * 1.3 + i * 1.7) * w * 0.36;
    const cy = h * (0.06 + (i / Math.max(1, clumps - 1)) * 0.52);
    const rx = w * (0.22 + ((seed + i) % 5) * 0.04);
    const ry = rx * (0.62 + ((seed + i * 3) % 4) * 0.08);
    blob(g, cx, cy, rx * 1.12, ry * 1.16, th.canopyD, seed + i, 0.03);
    blob(g, cx, cy, rx, ry, i % 2 ? th.canopy : th.canopyD, seed + i, 0.06);
  }
  // one or two large blooms / shelf mushrooms near the lower trunk — not a dotted climb
  if (mush) {
    drawShroom(g, tx + (tw >> 1) + 3, (h * 0.78) | 0, 'shelf', 6 + (seed % 3), seed, 1);
    if (seed % 3 === 0) drawShroom(g, tx - tw - 2, (h * 0.58) | 0, 'pin', 5, seed + 3, 0.9);
  } else if (seed % 3 !== 1) {
    if (seed % 2 === 0) drawDianaRose(g, tx + tw + 6, (h * 0.72) | 0, 6.4, 0.95);
    else drawLisianthusBloom(g, tx - tw - 6, (h * 0.74) | 0, 6.0, -0.08);
  }
  return c;
}

function bakeHills(width: number, h: number, color: string, seed: number): HTMLCanvasElement {
  const c = document.createElement('canvas'); c.width = width; c.height = h;
  const g = c.getContext('2d')!;
  const r = rnd(seed);
  g.fillStyle = color;
  const base = h * 0.55;
  for (let x = 0; x < c.width; x++) {
    const y = base + Math.sin(x * 0.02 + seed) * h * 0.12 + Math.sin(x * 0.007 + seed * 2) * h * 0.18 + (r() - 0.5) * 2;
    g.fillRect(x, y | 0, 1, h - (y | 0) + 2);
  }
  return c;
}

export function startWander(opts: WoodOpts) {
  const theme = opts.theme;
  const T = theme === 'flower' ? FLOWER : MUSH;
  const reduced = reducedMotion();
  const screen = new PixelScreen({ host: opts.host, minW: 176, minH: 248, maxH: 640 });
  const ctx = screen.ctx;
  const catSp = cat32Sprites();
  const floorOf = (w: number, h: number) => h - Math.max(22, Math.round(h * (h > w ? 0.13 : 0.16)));
  const landscape = () => theme === 'flower' ? art.plates.flowerGround : art.plates.mushroomGround;
  const coverOf = (w: number, h: number) => {
    const base = h > w ? 1.16 : 1;
    const plates = landscape();
    if (!plates.length) return base;
    const raw = worldWidthOf(plates, floorOf(w, h), base);
    const want = Math.max(raw, w * (h > w ? 4.2 : 2.75));
    return raw > 0 ? base * (want / raw) : base;
  };
  const measureWorld = (w: number, h: number) => {
    const floor = floorOf(w, h);
    const plates = landscape();
    if (!plates.length) return 1800;
    return Math.max(w + 64, worldWidthOf(plates, floor, coverOf(w, h)));
  };

  const atEnd = params.get('at') === 'end';
  const auto = params.has('auto');
  let worldW = WORLD_W;
  const cat = { x: atEnd ? 0 : 36, vx: 0, face: 1 };
  const cam = new Camera(worldW, 220);
  let placedEnd = false;
  const critters: Critter[] = [];
  const parts: Particle[] = [];

  // `at` is a fraction of the finite world (no wrapping).
  const PLAN: { at: number; kind: CritterKind; dir: number }[] = theme === 'flower'
    ? [
      { at: 0.18, kind: 'lamb', dir: 1 }, { at: 0.34, kind: 'kitten', dir: -1 },
      { at: 0.50, kind: 'deer', dir: 1 }, { at: 0.66, kind: 'collie', dir: -1 },
      { at: 0.82, kind: 'owl', dir: 1 },
    ]
    : [
      { at: 0.16, kind: 'owl', dir: 1 }, { at: 0.32, kind: 'deer', dir: -1 },
      { at: 0.50, kind: 'kitten', dir: 1 }, { at: 0.66, kind: 'collie', dir: 1 },
      { at: 0.82, kind: 'lamb', dir: 1 },
    ];
  const spawned = new Set<number>();

  let time = 0, leaving = false, nearSent = false, meetCool = 0, partAcc = 0;
  let held: { x: number } | null = null;
  const host = opts.host;
  host.style.touchAction = 'none';
  const pick = (e: PointerEvent) => { held = { x: screen.toLogical(e.clientX, e.clientY).x }; };
  host.addEventListener('pointerdown', e => { pick(e); try { (e.target as HTMLElement).setPointerCapture?.(e.pointerId); } catch { /* */ } });
  host.addEventListener('pointermove', e => { if (held) pick(e); });
  const clear = () => { held = null; };
  host.addEventListener('pointerup', clear);
  host.addEventListener('pointercancel', clear);

  const heightOf = (k: CritterKind) => k === 'deer' ? 18 : k === 'collie' ? 16 : k === 'owl' ? 16 : 14;

  const emit = (x: number, y: number) => {
    if (reduced || parts.length > 64) return;
    if (theme === 'flower') parts.push({ x, y, vx: -10 + Math.random() * 8, vy: 4 + Math.random() * 10, rot: Math.random() * 6, kind: Math.random() < 0.5 ? 'diana' : 'lisi', s: 2 + Math.random() * 1.5, life: 1 });
    else parts.push({ x, y, vx: (Math.random() - 0.5) * 10, vy: -8 - Math.random() * 16, rot: 0, kind: Math.random() < 0.3 ? 'fire' : 'spore', s: 1 + Math.random(), life: 1 });
  };

  startLoop(dt => {
    time += dt; meetCool = Math.max(0, meetCool - dt);
    input.update();
    const floor = floorOf(screen.w, screen.h);
    worldW = measureWorld(screen.w, screen.h);
    const EXIT_X = worldW - 80;
    if (!placedEnd && atEnd) { cat.x = Math.max(36, EXIT_X - 70); placedEnd = true; }

    let ax = input.axis();
    if (held) {
      const d = (cam.x + held.x) - cat.x;
      ax = Math.abs(d) < 6 ? 0 : Math.sign(d);
    }
    if ((auto && !leaving) || leaving) ax = 1;
    const max = 46;
    cat.vx += (ax * max - cat.vx) * Math.min(1, dt * 4.2);
    if (!ax) cat.vx += (0 - cat.vx) * Math.min(1, dt * 6);
    cat.x += cat.vx * dt;
    if (ax) cat.face = ax;
    cat.x = Math.max(16, Math.min(worldW - 32, cat.x));

    cam.worldW = worldW;
    cam.worldH = Math.max(220, screen.h);
    cam.follow(cat.x, floor - 18, cat.face, screen.w, screen.h, dt);

    PLAN.forEach((p, i) => {
      if (spawned.has(i) || cat.x + 50 < p.at * worldW) return;
      spawned.add(i);
      // same-direction critters spawn ahead (on screen) so a walking player can catch up;
      // oncoming critters still enter from the right edge.
      const x = p.dir > 0 ? Math.min(cam.x + screen.w - 40, cat.x + 100) : cam.x + screen.w + 28;
      critters.push({
        kind: p.kind, x, vx: p.dir * (p.kind === 'collie' ? 40 : p.kind === 'deer' ? 24 : p.kind === 'owl' ? 30 : 17),
        face: p.dir, mode: p.kind === 'owl' ? 'fly' : 'walk', phase: 'in', age: 0, notice: 0,
      });
    });

    for (const c of critters) {
      c.age += dt;
      if (c.phase === 'in') {
        c.x += c.vx * dt;
        c.mode = c.kind === 'owl' ? 'fly' : 'walk';
        c.face = Math.sign(c.vx) || c.face;
        if (Math.abs(c.x - cat.x) < 38) {
          c.phase = 'notice'; c.notice = 0; c.vx = 0;
          c.mode = c.kind === 'owl' ? 'extra' : (c.kind === 'collie' || c.kind === 'kitten' || c.kind === 'greykit' || c.kind === 'lamb' ? 'extra' : 'stand');
          c.face = c.x > cat.x ? -1 : 1;
          if (meetCool <= 0) { chime('meet'); meetCool = 2.6; }
        }
      } else if (c.phase === 'notice') {
        c.notice += dt;
        // owl blinks (extra) then takes off; others pause, look, then continue the way they were heading
        if (c.kind === 'owl' && c.notice > 0.7) c.mode = 'extra';
        if (c.notice > (c.kind === 'deer' ? 1.5 : 1.15)) {
          c.phase = 'out';
          const dir = c.x < cat.x ? -1 : 1; // walk on past her
          c.vx = dir * (c.kind === 'collie' ? 42 : c.kind === 'owl' ? 32 : 20);
          c.face = dir;
          c.mode = c.kind === 'owl' ? 'fly' : 'walk';
        }
      } else {
        c.x += c.vx * dt;
        c.mode = c.kind === 'owl' ? 'fly' : 'walk';
      }
    }
    // drop far-off critters
    for (let i = critters.length - 1; i >= 0; i--) {
      const c = critters[i]!;
      if (c.x < cam.x - 80 || c.x > cam.x + screen.w + 80) critters.splice(i, 1);
    }

    partAcc += dt;
    const rate = reduced ? 0.22 : (theme === 'flower' ? 0.07 : 0.09);
    while (partAcc > rate) {
      partAcc -= rate;
      emit(cam.x + Math.random() * screen.w, theme === 'flower' ? (8 + Math.random() * (floor - 40)) : (floor - 10 - Math.random() * 80));
    }
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i]!;
      p.x += p.vx * dt; p.y += p.vy * dt; p.rot += dt * 1.6; p.life -= dt * 0.18;
      if (theme === 'mushroom') p.vy += -4 * dt;
      else p.vy += 6 * dt;
      if (p.life <= 0 || p.y > floor + 8) parts.splice(i, 1);
    }

    if (!nearSent && cat.x > worldW * 0.88) { nearSent = true; opts.onNearExit(); }
    if (!leaving && cat.x > EXIT_X - 8) {
      leaving = true;
      const c = screen.toClient(cat.x - cam.ix, floor - 18 - cam.iy);
      opts.onExit(c.x, c.y);
    }
  }, () => {
    const w = screen.w, h = screen.h, floor = floorOf(w, h);
    const ox = cam.ix;
    const portrait = h > w;

    // fallback sky only shows if a plate is missing or letterboxed
    const grd = ctx.createLinearGradient(0, 0, 0, h);
    grd.addColorStop(0, T.sky0); grd.addColorStop(0.55, T.sky1); grd.addColorStop(1, T.sky2);
    ctx.fillStyle = grd; ctx.fillRect(0, 0, w, h);

    const plates = landscape();
    if (plates.length) {
      blitGroundSequence(ctx, plates, ox, floor, w, coverOf(w, h));
    } else {
      ctx.fillStyle = T.ground; ctx.fillRect(0, floor, w, h - floor);
      ctx.fillStyle = T.path;
      for (let sx = 0; sx < w; sx++) ctx.fillRect(sx, pathY(sx + ox, floor) - 2, 1, 8);
    }

    const floorY = floor;
    const blit = (img: HTMLCanvasElement, x: number, feetY: number, flip: boolean, sc: number) => {
      ctx.save(); ctx.imageSmoothingEnabled = false;
      ctx.translate(x, feetY);
      ctx.scale(flip ? -sc : sc, sc);
      ctx.drawImage(img, flip ? -img.width : 0, -img.height);
      ctx.restore();
    };
    critters.sort((a, b) => a.x - b.x);
    for (const c of critters) {
      const img = critterFrame(c.kind, c.mode, time);
      const fly = c.kind === 'owl' && c.mode === 'fly';
      const feet = fly ? floorY - 54 - Math.sin(c.age * 1.6) * 7 : floorY;
      const sc = img.height >= 28 ? 1 : 2;
      blit(img, Math.round(c.x - ox - img.width * sc / 2), Math.round(feet), c.face < 0, sc);
    }

    const catImg = cat32Frame(catSp, cat.vx, time);
    blit(catImg, Math.round(cat.x - ox - catImg.width / 2), Math.round(floor), cat.face < 0, 1);

    for (const p of parts) {
      const x = p.x - ox, y = p.y;
      if (x < -4 || x > w + 4) continue;
      if (p.kind === 'diana' || p.kind === 'lisi') drawPetal(ctx, x, y, p.kind, p.rot, p.s);
      else drawSpore(ctx, x, y, p.s, p.kind === 'fire');
    }

  });

  const api = {
    screen,
    get x() { return cat.x; },
    get t() { return time; },
    seek(x: number) {
      worldW = measureWorld(screen.w, screen.h);
      cat.x = Math.max(16, Math.min(worldW - 32, x));
      cam.worldW = worldW;
      cam.snap(cat.x, floorOf(screen.w, screen.h) - 18, screen.w, screen.h);
      // Skip encounters well behind the seek point; keep the nearest upcoming one.
      PLAN.forEach((p, i) => { if (p.at * worldW < cat.x - 80) spawned.add(i); });
    },
    get worldW() { return worldW; },
    get plates() { return landscape().length; },
    // Review helper: stand next to the planned animal so a shot/clip can show the meeting.
    placeEncounter(frac: number) {
      api.seek(worldW * frac);
      const i = PLAN.findIndex(p => Math.abs(p.at - frac) < 0.09);
      if (i < 0) return;
      spawned.add(i);
      const p = PLAN[i]!;
      critters.push({
        kind: p.kind,
        x: cat.x + 78,
        vx: 0,
        face: -1,
        mode: p.kind === 'owl' ? 'fly' : 'walk',
        phase: 'notice',
        age: 0.5,
        notice: 0.35,
      });
    },
  };
  (window as unknown as { __wander?: typeof api }).__wander = api;
  return api;
}

// Shared leisurely side-scroll stroll used by /flower/ and /mushroom/.
// The hero cat walks a long, layered wood; woodland animals cross her path (no fail state).
// Touch: hold or drag — she walks toward the finger. Keyboard: ← → / A D. Dev: ?at=end · ?auto.
import { PixelScreen } from '../../shared/pixel/screen';
import { startLoop } from '../../shared/pixel/loop';
import { input } from '../../shared/pixel/input';
import { Camera } from '../../shared/pixel/camera';
import { catSprites, catFrame } from '../../shared/pixel/cat';
import { critterFrame, type CritterKind } from '../../shared/pixel/fauna';
import { params, reducedMotion } from '../../shared/flow';
import { bakeCluster, drawPetal, drawDianaRose, drawLisianthusBloom, type Cluster } from './blooms';
import { bakeMushCluster, drawSpore, drawShroom, type MushCluster } from './shrooms';
import { chime } from '../../shared/music';

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

function blob(g: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, c: string) {
  g.fillStyle = c;
  const Rx = Math.max(1, Math.round(rx)), Ry = Math.max(1, Math.round(ry));
  for (let dy = -Ry; dy <= Ry; dy++) for (let dx = -Rx; dx <= Rx; dx++) {
    if ((dx * dx) / (rx * rx) + (dy * dy) / (ry * ry) <= 1) g.fillRect((x + dx) | 0, (y + dy) | 0, 1, 1);
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
    blob(g, cx, cy, rx, ry, i % 2 ? th.canopy : th.canopyD);
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
  const catSp = catSprites();
  const floorOf = (h: number) => h - Math.max(28, Math.round(h * 0.16));
  const WORLD = WORLD_W;
  const EXIT_X = WORLD - 150;

  const treesFar: { x: number; img: HTMLCanvasElement }[] = [];
  const treesMid: { x: number; img: HTMLCanvasElement }[] = [];
  const props: Prop[] = [];
  const flowerSet: Cluster[] = [];
  const mushSet: MushCluster[] = [];
  if (theme === 'flower') {
    for (let i = 0; i < 16; i++) flowerSet.push(bakeCluster(i % 2 === 0 ? 'diana' : 'lisi', 11 + i * 17, 1.7 + (i % 5 === 0 ? 0.4 : 0)));
  } else {
    for (let i = 0; i < 16; i++) mushSet.push(bakeMushCluster(23 + i * 19, 1.55 + (i % 4 === 0 ? 0.3 : 0)));
  }
  for (let i = 0; i < 22; i++) treesFar.push({ x: 24 + i * 155 + (i * 37) % 60, img: bakeTree(T, 260 + (i % 5) * 24, 72 + (i % 3) * 10, 50 + i * 9, theme === 'mushroom') });
  for (let i = 0; i < 26; i++) treesMid.push({ x: 8 + i * 132 + (i * 19) % 44, img: bakeTree(T, 390 + (i % 4) * 28, 84 + (i % 3) * 12, 90 + i * 13, theme === 'mushroom') });
  if (theme === 'flower') {
    flowerSet.forEach((cl, i) => {
      props.push({ x: 80 + i * 220 + (i * 47) % 80, img: cl.canvas, ax: cl.ax, layer: i % 3 === 0 ? 'fg' : 'near' });
      const cl2 = flowerSet[(i * 3 + 1) % flowerSet.length]!;
      props.push({ x: 150 + i * 220 + (i % 7) * 6, img: cl2.canvas, ax: cl2.ax, layer: 'mid' });
    });
  } else {
    mushSet.forEach((m, i) => {
      props.push({ x: 60 + i * 200 + (i * 29) % 90, img: m.canvas, ax: m.ax, layer: i % 4 === 0 ? 'fg' : 'near' });
      const m2 = mushSet[(i * 2 + 3) % mushSet.length]!;
      props.push({ x: 140 + i * 200, img: m2.canvas, ax: m2.ax, layer: 'mid' });
    });
  }
  const hillsFar = bakeHills(Math.round(WORLD * 0.22 + 80), 78, T.far, 3);
  const hillsMid = bakeHills(Math.round(WORLD * 0.34 + 80), 68, T.far2, 8);

  const atEnd = params.get('at') === 'end';
  const auto = params.has('auto');
  const cat = { x: atEnd ? EXIT_X - 70 : 36, vx: 0, face: 1 };
  const cam = new Camera(WORLD, 220);
  const critters: Critter[] = [];
  const parts: Particle[] = [];

  const PLAN: { at: number; kind: CritterKind; dir: number }[] = theme === 'flower'
    ? [
      { at: 260, kind: 'lamb', dir: 1 }, { at: 520, kind: 'kitten', dir: -1 }, { at: 780, kind: 'deer', dir: 1 },
      { at: 1080, kind: 'collie', dir: -1 }, { at: 1360, kind: 'owl', dir: 1 }, { at: 1640, kind: 'lamb', dir: 1 },
      { at: 1680, kind: 'lamb', dir: -1 }, { at: 1980, kind: 'deer', dir: -1 }, { at: 2040, kind: 'greykit', dir: 1 },
      { at: 2340, kind: 'collie', dir: 1 }, { at: 2620, kind: 'owl', dir: -1 }, { at: 2880, kind: 'kitten', dir: 1 },
      { at: 3000, kind: 'deer', dir: -1 },
    ]
    : [
      { at: 240, kind: 'owl', dir: 1 }, { at: 480, kind: 'deer', dir: -1 }, { at: 760, kind: 'kitten', dir: 1 },
      { at: 1020, kind: 'collie', dir: 1 }, { at: 1280, kind: 'owl', dir: -1 }, { at: 1540, kind: 'lamb', dir: 1 },
      { at: 1820, kind: 'deer', dir: 1 }, { at: 2080, kind: 'owl', dir: 1 }, { at: 2140, kind: 'greykit', dir: -1 },
      { at: 2460, kind: 'collie', dir: -1 }, { at: 2740, kind: 'lamb', dir: 1 }, { at: 2920, kind: 'deer', dir: 1 },
      { at: 3100, kind: 'owl', dir: -1 },
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
    const floor = floorOf(screen.h);

    let ax = input.axis();
    if (held) {
      const d = (cam.x + held.x) - (cat.x + 8);
      ax = Math.abs(d) < 6 ? 0 : Math.sign(d);
    }
    if ((auto && !leaving) || leaving) ax = 1;
    const max = 46;
    cat.vx += (ax * max - cat.vx) * Math.min(1, dt * 4.2);
    if (!ax) cat.vx += (0 - cat.vx) * Math.min(1, dt * 6);
    cat.x += cat.vx * dt;
    if (ax) cat.face = ax;
    cat.x = Math.max(8, Math.min(WORLD - 24, cat.x));

    cam.worldW = WORLD;
    cam.worldH = Math.max(220, screen.h);
    cam.follow(cat.x + 8, floor - 16, cat.face, screen.w, screen.h, dt);

    PLAN.forEach((p, i) => {
      if (spawned.has(i) || cat.x + 50 < p.at) return;
      spawned.add(i);
      const x = p.dir > 0 ? cam.x - 28 : cam.x + screen.w + 28;
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

    if (!nearSent && cat.x > EXIT_X - 220) { nearSent = true; opts.onNearExit(); }
    if (!leaving && cat.x > EXIT_X - 8) {
      leaving = true;
      const c = screen.toClient(cat.x + 8 - cam.ix, floor - 16 - cam.iy);
      opts.onExit(c.x, c.y);
    }
  }, () => {
    const w = screen.w, h = screen.h, floor = floorOf(h);
    const ox = cam.ix, oy = cam.iy;
    // sky
    const grd = ctx.createLinearGradient(0, 0, 0, h);
    grd.addColorStop(0, T.sky0); grd.addColorStop(0.45, T.sky1); grd.addColorStop(1, T.sky2);
    ctx.fillStyle = grd; ctx.fillRect(0, 0, w, h);

    // sun / moon
    const sx = w * (theme === 'flower' ? 0.78 : 0.18), sy = h * (theme === 'flower' ? 0.16 : 0.14);
    ctx.fillStyle = T.sun;
    const sr = theme === 'flower' ? 11 : 9;
    for (let dy = -sr; dy <= sr; dy++) for (let dx = -sr; dx <= sr; dx++) if (dx * dx + dy * dy <= sr * sr) ctx.fillRect((sx + dx) | 0, (sy + dy) | 0, 1, 1);
    if (theme === 'mushroom') {
      ctx.fillStyle = '#1A2438';
      for (let dy = -sr; dy <= sr; dy++) for (let dx = -sr; dx <= sr; dx++) if (dx * dx + dy * dy <= (sr - 3) * (sr - 3) && dx > 1) ctx.fillRect((sx + dx + 3) | 0, (sy + dy - 1) | 0, 1, 1);
      ctx.fillStyle = 'rgba(230,230,240,.7)';
      for (let i = 0; i < 18; i++) ctx.fillRect(((i * 73 + 17) % w) | 0, ((i * 47 + 11) % (h * 0.4)) | 0, 1, 1);
    }

    // far hills
    ctx.drawImage(hillsFar, -((ox * 0.16) | 0) % hillsFar.width, (floor - 92 - oy * 0.1) | 0);
    ctx.drawImage(hillsFar, -((ox * 0.16) | 0) % hillsFar.width + hillsFar.width, (floor - 92 - oy * 0.1) | 0);
    ctx.drawImage(hillsMid, -((ox * 0.28) | 0) % hillsMid.width, (floor - 74 - oy * 0.12) | 0);
    ctx.drawImage(hillsMid, -((ox * 0.28) | 0) % hillsMid.width + hillsMid.width, (floor - 74 - oy * 0.12) | 0);

    // far trees
    for (const tr of treesFar) {
      const x = Math.round(tr.x - ox * 0.34);
      if (x > -tr.img.width && x < w + 4) ctx.drawImage(tr.img, x, floor - tr.img.height + 8 - (oy * 0.15) | 0);
    }

    // light shafts (flower) / glow haze (mushroom)
    if (!reduced) {
      if (theme === 'flower') {
        ctx.fillStyle = 'rgba(255,236,210,0.07)';
        for (let i = 0; i < 5; i++) {
          const x = ((i * 90 + 40 - ox * 0.2) % (w + 80)) - 20;
          ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + 18, 0); ctx.lineTo(x + 46, floor); ctx.lineTo(x + 10, floor); ctx.fill();
        }
      } else {
        ctx.fillStyle = 'rgba(80,160,150,0.06)';
        ctx.fillRect(0, floor - 70, w, 70);
      }
    }

    // mid trees
    for (const tr of treesMid) {
      const x = Math.round(tr.x - ox * 0.72);
      if (x > -tr.img.width && x < w + 4) ctx.drawImage(tr.img, x, floor - tr.img.height + 6);
    }

    const stamp = (layer: Prop['layer'], par: number) => {
      for (const p of props) {
        if (p.layer !== layer) continue;
        const x = Math.round(p.x - ox * par) - p.ax;
        if (x > -p.img.width && x < w + 4) ctx.drawImage(p.img, x, floor - p.img.height + 2);
      }
    };
    stamp('mid', 0.85);

    // ground + path
    ctx.fillStyle = T.ground; ctx.fillRect(0, floor, w, h - floor);
    ctx.fillStyle = T.groundD; ctx.fillRect(0, floor, w, 2);
    ctx.fillStyle = T.path;
    ctx.fillRect(0, floor - 1, w, 7);
    ctx.fillStyle = T.pathHi;
    for (let x = 0; x < w; x++) if (((x + ox) % 9) === 0) ctx.fillRect(x, floor + 1, 2, 1);

    // grass tufts
    ctx.fillStyle = T.grass;
    for (let x = -((ox) % 11); x < w; x += 11) {
      const hh = 2 + ((x + ox) * 13 % 4);
      ctx.fillRect(x, floor - hh, 1, hh);
      ctx.fillRect(x + 2, floor - hh + 1, 1, hh - 1);
    }

    stamp('near', 1);

    // exit arch
    const ax = Math.round(EXIT_X - ox);
    if (ax > -50 && ax < w + 20) {
      ctx.fillStyle = T.trunk; ctx.fillRect(ax, floor - 54, 4, 54); ctx.fillRect(ax + 38, floor - 54, 4, 54);
      ctx.fillStyle = T.trunkD;
      for (let i = 0; i <= 40; i++) {
        const a = Math.PI * (i / 40);
        ctx.fillRect(ax + 2 + Math.cos(Math.PI - a) * 20, floor - 52 - Math.sin(a) * 16, 3, 3);
      }
      if (theme === 'flower') {
        drawDianaRose(ctx, ax + 14, floor - 66, 4.2, 1);
        drawLisianthusBloom(ctx, ax + 30, floor - 64, 3.6, 0.1);
        drawShroom(ctx, ax + 22, floor - 4, 'spot', 3.6, 2, 0.9);
      } else {
        drawShroom(ctx, ax + 12, floor - 54, 'spot', 4.5, 4, 1);
        drawShroom(ctx, ax + 28, floor - 56, 'bell', 5, 7, 1);
      }
    }

    // animals — a little larger than the 16px sheets so they read on a phone
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
      const feet = fly ? floorY - 52 - Math.sin(c.age * 1.6) * 7 : floorY;
      blit(img, Math.round(c.x - ox), Math.round(feet), c.face < 0, 1.7);
    }

    // cat
    const catImg = catFrame(catSp, { vx: cat.vx, vy: 0, ground: true }, time, 1);
    blit(catImg, Math.round(cat.x - ox + 8), Math.round(floor), cat.face < 0, 1.5);

    stamp('fg', 1.18);

    // particles
    for (const p of parts) {
      const x = p.x - ox, y = p.y - oy * 0.2;
      if (x < -4 || x > w + 4) continue;
      if (p.kind === 'diana' || p.kind === 'lisi') drawPetal(ctx, x, y, p.kind, p.rot, p.s);
      else drawSpore(ctx, x, y, p.s, p.kind === 'fire');
    }

    // enclosing canopy + a mid hanging layer so portrait woods are a tunnel, not trunks in open air
    ctx.fillStyle = T.canopyD;
    for (let i = 0; i < 16; i++) {
      const x = ((i * 46 - ox * 0.5) % (w + 90)) - 40;
      blob(ctx, x, h * 0.08 + (i % 3) * 10, 28 + (i % 4) * 6, 20 + (i % 3) * 5, T.canopyD);
    }
    ctx.fillStyle = T.canopy;
    for (let i = 0; i < 12; i++) {
      const x = ((i * 58 - ox * 0.72 + 18) % (w + 80)) - 30;
      blob(ctx, x, 8 + (i % 2) * 6, 22 + (i % 3) * 5, 16, T.canopy);
    }
    for (let i = 0; i < 9; i++) {
      const x = ((i * 70 - ox * 0.6 + 30) % (w + 100)) - 40;
      blob(ctx, x, h * 0.30 + (i % 3) * 14, 26 + (i % 3) * 6, 18, i % 2 ? T.canopy : T.canopyD);
    }
    // close foliage left and right, so the walk sits inside the wood
    blob(ctx, 8, h * 0.42, 22, 48, T.fg);
    blob(ctx, 4, h * 0.22, 18, 36, T.canopyD);
    blob(ctx, w - 8, h * 0.38, 24, 52, T.fg);
    blob(ctx, w - 6, h * 0.18, 18, 34, T.canopyD);
    if (theme === 'flower') {
      drawLisianthusBloom(ctx, 16, floor - 36, 7.2, -0.15);
      drawDianaRose(ctx, w - 18, floor - 40, 7.6, 1);
    } else {
      drawShroom(ctx, 14, floor - 4, 'bell', 7, 3, 1);
      drawShroom(ctx, w - 16, floor - 4, 'parasol', 7.5, 8, 1);
    }

    // soft vignette
    ctx.fillStyle = theme === 'flower' ? 'rgba(180,80,110,0.06)' : 'rgba(0,10,16,0.18)';
    ctx.fillRect(0, 0, w, 8); ctx.fillRect(0, h - 10, w, 10);
  });

  const api = {
    screen,
    get x() { return cat.x; },
    get t() { return time; },
    seek(x: number) {
      cat.x = Math.max(8, Math.min(WORLD - 24, x));
      cam.snap(cat.x + 8, floorOf(screen.h) - 16, screen.w, screen.h);
    },
  };
  (window as unknown as { __wander?: typeof api }).__wander = api;
  return api;
}

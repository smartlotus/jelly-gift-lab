// Stage 1 · Meadow - the game: physics, entities, gags, the heart fountain, the door. Rendering is Canvas2D at the
// logical resolution of PixelScreen (crisp integer upscale). Fixed 60 Hz steps (shared/pixel/loop.ts).
import { PixelScreen } from '../../shared/pixel/screen';
import { startLoop } from '../../shared/pixel/loop';
import { input } from '../../shared/pixel/input';
import { makeMap, body, moveBody, overlap, setTile, landOn, tileAt, FEEL, TILE, type Body } from '../../shared/pixel/tiles';
import { raster, draw } from '../../shared/pixel/sprite';
import { catSprites, catFrame } from '../../shared/pixel/cat';
import { Particles } from '../../shared/pixel/particles';
import { PAL, TILES, SPRITES, HEARTS, DECO, bigCloud, hills } from './art';
import { buildLevel, W, H, G, type Content } from './level';
import { sfx } from './sfx';

export interface Hooks {
  hearts(n: number, roll?: boolean): void;   // heart counter changed (roll = fountain count-up)
  firstMove(): void;                          // the player figured out the controls
  fountain(): void;                           // fountain show started
  caption(): void;                            // time for the "day 200" line
  nearExit(): void;                           // prefetch the next page
  exit(clientX: number, clientY: number): void; // walked through the door
}
type Img = HTMLCanvasElement;
const R = (rows: string[]) => raster(rows, PAL);
const rnd = (a: number, b: number) => a + Math.random() * (b - a);
const pick = <T,>(a: T[]) => a[(Math.random() * a.length) | 0];
const ease = (t: number) => t < 0 ? 0 : t > 1 ? 1 : t * t * (3 - 2 * t);
const SOLID = new Set(['#', 'X', 'B', '?', 'u', 'Q', '[', ']', '{', '}', '=', 'F', 'H']);
const ONEWAY = new Set(['=', 'H']);
const GROUNDY = new Set(['#', 'F']);
const WORLD_W = W * TILE, WORLD_H = H * TILE;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

export function startMeadow(host: HTMLElement, hooks: Hooks, opts: { ready: Promise<void>; at?: string | null; dev?: boolean }) {
  // ---------- assets ----------
  const sp = catSprites();
  const T = {
    grass: TILES.grass.map(v => v.map(R)), dirt: TILES.dirt.map(v => v.map(R)), brick: R(TILES.brick), q: TILES.q.map(R), used: R(TILES.used), stone: R(TILES.stone),
    pipe: { '[': R(TILES.pipe.TL), ']': R(TILES.pipe.TR), '{': R(TILES.pipe.L), '}': R(TILES.pipe.R) } as Record<string, Img>,
    water: TILES.water.map(R), deep: R(TILES.waterDeep), plazaTop: TILES.plazaTop.map(R), plaza: TILES.plaza.map(R), plank: R(TILES.plank), heartBrick: R(TILES.heartBrick),
  };
  const S = {
    mush: SPRITES.mush.map(R), sleep: R(SPRITES.mushSleep[0]), flat: R(SPRITES.mushFlat[0]), cloud: SPRITES.cloud.map(R), spring: SPRITES.spring.map(R), bell: SPRITES.bell.map(R),
    fountain: SPRITES.fountain.map(R), door: SPRITES.door.map(R), puff: SPRITES.puff.map(R), splash: SPRITES.splash.map(R),
    heart: HEARTS.small.map(R), tiny: HEARTS.tiny.map(R), big: HEARTS.big.map(R), pickup: HEARTS.pickup.map(R),
    z: R(['kkk', '.k.', 'kkk'].map(r => r)), note: R(['.kk', '.k.', 'kk.']),
  };
  const D: Record<string, Img> = {}; for (const k in DECO) D[k] = R(DECO[k as keyof typeof DECO]);
  const skyClouds = [0, 1, 2, 3, 4, 5].map(i => R(bigCloud(i, i % 2 ? 56 : 72, i % 2 ? 22 : 28)));
  const hillFar = R(hills(1, 512, 96, 70, 46, 'C', 'x', 'i'));
  const hillNear = R(hills(4, 384, 70, 40, 30, 'g', 'G', 'l'));

  // ---------- level ----------
  const L = buildLevel();
  const map = makeMap(L.rows, c => SOLID.has(c), c => ONEWAY.has(c));
  const content = L.content, multi = new Map<string, number>();
  const ent = (k: string) => L.ents.filter(e => e.kind === k);
  const start = ent('start')[0];
  const cat = body(start.x, start.y - 13);
  const scr = new PixelScreen({ host, minW: 288, minH: 192 });

  // static layer (deco + terrain) pre-rendered once
  const layer = document.createElement('canvas'); layer.width = WORLD_W; layer.height = WORLD_H;
  const lg = layer.getContext('2d')!;
  const hsh = (x: number) => ((x * 2654435761) >>> 0) % 4;
  for (const d of L.deco) {
    const img = D[d.name]; const x = Math.round(d.x * TILE), y = d.y * TILE - img.height + (d.name.startsWith('flower') || d.name === 'tuft' ? 0 : 1);
    if (d.name.startsWith('flower')) { lg.drawImage(img, x, y); lg.drawImage(img, x + 5, y - 1); lg.drawImage(img, x + 10, y); } else lg.drawImage(img, x, y);
  }
  const paintStatic = (tx: number, ty: number) => {
    const c = map.data[ty][tx], x = tx * TILE, y = ty * TILE;
    if (c === '#') {
      const top = !GROUNDY.has(tileAt(map, tx, ty - 1)) && ty > 0, l = !SOLID.has(tileAt(map, tx - 1, ty)) || tileAt(map, tx - 1, ty) === '~', r = !SOLID.has(tileAt(map, tx + 1, ty));
      lg.drawImage((top ? T.grass : T.dirt)[hsh(tx)][(l ? 1 : 0) + (r ? 2 : 0)], x, y);
    } else if (c === 'Q') lg.drawImage(tileAt(map, tx, ty - 1) === 'Q' ? T.plaza[tx & 1] : T.plazaTop[tx & 1], x, y);
    else if (c === 'X') lg.drawImage(T.stone, x, y);
    else if (T.pipe[c]) lg.drawImage(T.pipe[c], x, y);
    else if (c === '=') lg.drawImage(T.plank, x, y);
  };
  for (let ty = 0; ty < H; ty++) for (let tx = 0; tx < W; tx++) paintStatic(tx, ty);

  // ---------- entities ----------
  interface Mush { b: Body; dir: number; state: 'walk' | 'flat' | 'gone'; t: number; pause: number }
  const mushes: Mush[] = ent('mush').map(e => ({ b: body(e.x + 2, e.y - 12, 12, 12), dir: e.dir as number, state: 'walk', t: 0, pause: 0 }));
  const MFEEL = { ...FEEL, run: 22, accel: 300 };
  const sl = ent('sleepy')[0], gp = ent('giftpipe')[0];
  const sleepy = { b: body(sl.x, sl.y - 12, 12, 12), state: 'sleep' as 'sleep' | 'wake' | 'run' | 'leap' | 'dive' | 'gone', t: 0, lx: 0, ly: 0, zT: 0 };
  const gift = { x: gp.x, top: gp.y, done: false, t: -1 };
  const clouds = ent('cloud').map((e, i) => ({ x0: e.x, y0: e.y, x: e.x, y: e.y, ax: e.ax as number, ay: e.ay as number, period: e.period as number, ph: i * 1.7, dx: 0, top: e.y + 5, prevTop: e.y + 5, blink: 0 }));
  const sE = ent('spring')[0];
  const fakes: { tx: number; ty: number }[] = []; map.data.forEach((r, ty) => { for (let tx = 0; tx < r.length; tx++) if (r[tx] === 'F') fakes.push({ tx, ty }); });
  const spring = { x: sE.x, bottom: sE.y, active: false, squash: 0, x0: Math.min(...fakes.map(f => f.tx)) * TILE, x1: (Math.max(...fakes.map(f => f.tx)) + 1) * TILE };
  let fakeT = 0, fakeFall = -1;
  const bells = ent('bell').map(e => ({ x: e.x, y: e.y, rung: false, t: 0 }));
  const fE = ent('fountain')[0];
  const fountain = { x: fE.x, y: fE.y, state: 'idle' as 'idle' | 'show' | 'after', t: 0 };
  const dE = ent('door')[0];
  const door = { x: dE.x, x0: dE.x, y: dE.y, hopTo: dE.hop as number, state: 'idle' as 'idle' | 'hop' | 'still' | 'enter' | 'done', t: 0, hopY: 0 };
  const pickups = ent('pickup').map(e => ({ x: e.x, y: e.y, taken: false, ph: Math.random() * 6 }));
  const pops: { x: number; y: number; t: number; big: boolean }[] = [];
  const bumps = new Map<string, number>();
  const slides: { tx: number; ty: number; t: number }[] = [];
  const bangs: { x: number; y: number; t: number; follow?: boolean }[] = [];
  const pondFalls = new Map<number, number>();
  const fx = new Particles(500), hearts = new Particles(1100), rain = new Particles(700);

  // ---------- state ----------
  let time = 0, hearts$ = 0, shown = 0, rollFrom = 0, rollT = -1;
  let mode: 'intro' | 'play' = 'intro', introT = -1, lockT = 0, knockT = 0, boost = false, landT = 1, prevGround = true;
  let splashT = -1, blinkT = 0, onCloud: (typeof clouds)[0] | null = null, safe = { x: cat.x, y: cat.y }, moved = false, nearExit = false, exited = false;
  let catBang = 0;
  const cam = { x: 0, y: 0, look: 0 };
  const addHearts = (n: number) => { hearts$ += n; if (rollT < 0) { shown = hearts$; hooks.hearts(shown); } };

  // dev / review jumps: ?at=lake|spring|bricks|hill|plaza|fountain|exit
  const AT: Record<string, number> = { lake: 61, spring: 78, bricks: 97, hill: 123, plaza: 146, fountain: 152, exit: 180 };
  if (opts.at && AT[opts.at] !== undefined) { cat.x = AT[opts.at] * TILE; cat.y = G * TILE - 13; safe = { x: cat.x, y: cat.y }; if (AT[opts.at] > 56) { sleepy.state = 'gone'; } }
  opts.ready.then(() => { introT = 0; });

  // ---------- helpers ----------
  const catCx = () => cat.x + cat.w / 2;
  const bangAt = (x: number, y: number, follow = false) => { bangs.push({ x, y, t: 0, follow }); sfx.bang(); };
  const puff = (x: number, y: number, n = 1) => { for (let i = 0; i < n; i++) { const p = fx.add(S.puff[0], x + rnd(-4, 4), y + rnd(-2, 2), rnd(-20, 20), rnd(-20, -6), { life: 0.45, drag: 3, blinkOut: false }); (p as unknown as { anim: Img[] }).anim = S.puff; } };
  const sparkle = (x: number, y: number, n = 6) => { for (let i = 0; i < n; i++) fx.add(pick(S.tiny), x, y, rnd(-70, 70), rnd(-120, -30), { g: 260, life: rnd(0.4, 0.8) }); };
  const popHeart = (tx: number, ty: number, big = false) => { pops.push({ x: tx * TILE + 8, y: ty * TILE, t: 0, big }); addHearts(big ? 5 : 1); sfx.heart(); };
  const firstMove = () => { if (!moved) { moved = true; hooks.firstMove(); } };

  function hitBlock(tx: number, ty: number) {
    const c = map.data[ty]?.[tx], key = `${tx},${ty}`;
    if (c !== '?' && c !== 'B' && c !== 'u') return;
    bumps.set(key, 0);
    // knock mushrooms standing on the block
    for (const m of mushes) if (m.state === 'walk' && Math.abs(m.b.x + 6 - (tx * TILE + 8)) < 12 && Math.abs(m.b.y + m.b.h - ty * TILE) < 3) { m.state = 'flat'; m.t = 0; sfx.stomp(); }
    if (c !== '?') { sfx.bump(); return; }
    const what: Content = content.get(key) ?? 'heart';
    if (what === 'shy') {
      if (tileAt(map, tx + 1, ty) === ' ') { setTile(map, tx, ty, ' '); slides.push({ tx, ty, t: 0 }); bangAt(tx * TILE + 16 + 6, ty * TILE - 10); sfx.squeak(); content.delete(key); content.set(`${tx + 1},${ty}`, 'big'); }
      else { content.set(key, 'big'); hitBlock(tx, ty); }
      return;
    }
    if (what === 'hearts5') { const n = (multi.get(key) ?? 5) - 1; multi.set(key, n); popHeart(tx, ty); if (n <= 0) setTile(map, tx, ty, 'u'); return; }
    if (what === 'big' || what === 'bang') { popHeart(tx, ty, true); sparkle(tx * TILE + 8, ty * TILE, 8); }
    else popHeart(tx, ty);
    setTile(map, tx, ty, 'u');
  }
  function heartBridge(x0: number, x1: number) {
    for (let x = x0; x <= x1; x++) { setTile(map, x, G, 'H'); sparkle(x * TILE + 8, G * TILE + 4, 3); }
    sfx.fanfare();
  }
  function respawn() {
    cat.x = safe.x; cat.y = safe.y; cat.vx = 0; cat.vy = 0; cat.ground = true; blinkT = 1; puff(catCx(), cat.y + 8, 3); sfx.puff();
  }

  // ---------- update ----------
  function update(dt: number) {
    input.update(); time += dt;
    let axis = input.axis();
    let jumpHit = input.hit('jump') || input.hit('up'), jumpHeld = input.pressed('jump') || input.pressed('up');
    if (axis || jumpHit) firstMove();
    // intro: sitting cat, '!!', stand up
    if (mode === 'intro') {
      axis = 0; jumpHit = false;
      if (introT >= 0) { introT += dt; if (introT > 0.35 && catBang === 0) { catBang = 1; bangAt(0, 0, true); } if (introT > 1.0) mode = 'play'; }
    }
    if (lockT > 0) { lockT -= dt; axis = 0; jumpHit = false; }
    if (knockT > 0) { knockT -= dt; axis = 0; }
    if (door.state === 'enter' || door.state === 'done') { axis = 0; jumpHit = false; }
    if (boost) { jumpHeld = true; if (cat.vy >= 0) boost = false; }

    // clouds move first (they carry the cat)
    for (const c of clouds) {
      const k = (time / c.period) * Math.PI * 2, nx = c.x0 + c.ax * Math.sin(k), ny = c.y0 + c.ay * Math.sin(k * 1.3 + c.ph);
      c.dx = nx - c.x; c.x = nx; c.y = ny; c.prevTop = c.top; c.top = ny + 5; c.blink = Math.max(0, c.blink - dt); if (Math.random() < dt * 0.3) c.blink = 0.15;
    }

    if (splashT >= 0) { splashT += dt; if (splashT > 0.75) { splashT = -1; respawn(); } }
    else if (door.state !== 'done') {
      if (onCloud) { cat.x += onCloud.dx; cat.y = onCloud.top - cat.h; }
      const prevBottom = cat.y + cat.h, prevTop = cat.y, prevVy = cat.vy;
      const r = moveBody(cat, map, dt, axis, jumpHit, jumpHeld);
      if (r.jumped) { sfx.jump(); onCloud = null; }
      // clouds (one-way, moving)
      const wasCloud = onCloud; onCloud = null;
      if (!r.jumped) for (const c of clouds) if (landOn(cat, prevBottom + (c.top - c.prevTop), c.top, c.x + 4, c.x + 44)) { onCloud = c; if (!wasCloud) { c.blink = 0.25; } }
      // spring (catches anything that falls into its hole)
      if (spring.active && landOn(cat, prevBottom, spring.bottom - 11, spring.x0, spring.x1)) {
        cat.vy = -540; cat.ground = false; boost = true; spring.squash = 0.18; sfx.spring(); puff(spring.x, spring.bottom - 6, 2);
      }
      // head bumps (blocks) + hidden blocks
      if (prevVy < 0 && cat.vy === 0 && !cat.ground) {
        const ty = Math.floor((cat.y - 1) / TILE), cx = catCx();
        const cands = [Math.floor(cx / TILE), Math.floor((cat.x + 1) / TILE), Math.floor((cat.x + cat.w - 1) / TILE)];
        const hit = cands.find(tx => '?Bu'.includes(tileAt(map, tx, ty)));
        if (hit !== undefined) hitBlock(hit, ty);
      }
      if (cat.vy < 0) {
        const ty = Math.floor(cat.y / TILE), tx = Math.floor(catCx() / TILE);
        if (tileAt(map, tx, ty) === 'i' && prevTop >= (ty + 1) * TILE - 0.5) { setTile(map, tx, ty, '?'); cat.y = (ty + 1) * TILE; cat.vy = 0; bangAt(catCx(), cat.y - 26); hitBlock(tx, ty); }
      }
      // landing
      if (cat.ground && !prevGround) { landT = 0; if (prevVy > 260) puff(catCx(), cat.y + cat.h - 2, 2); }
      landT += dt; prevGround = cat.ground;
      if (Math.abs(cat.vx) > 80 && cat.ground && Math.random() < dt * 6) fx.add(S.puff[0], cat.x + (cat.face > 0 ? 0 : cat.w), cat.y + cat.h - 3, -cat.face * 10, -8, { life: 0.25, blinkOut: false });
      // fake floor -> spring
      if (cat.ground && fakeFall < 0) {
        const under = tileAt(map, Math.floor(catCx() / TILE), Math.floor((cat.y + cat.h + 1) / TILE));
        if (under === 'F') { fakeT += dt; if (fakeT > 0.16) { fakeFall = 0; for (const f of fakes) setTile(map, f.tx, f.ty, ' '); spring.active = true; bangAt(0, 0, true); sfx.slide(); cat.ground = false; } }
      }
      // safe ground (respawn point after a splash)
      if (cat.ground && !onCloud) {
        const a = tileAt(map, Math.floor((cat.x + 1) / TILE), Math.floor((cat.y + cat.h + 1) / TILE)), b = tileAt(map, Math.floor((cat.x + cat.w - 1) / TILE), Math.floor((cat.y + cat.h + 1) / TILE));
        if ('#QXH'.includes(a) && '#QXH'.includes(b) && a !== ' ' && b !== ' ') safe = { x: cat.x, y: cat.y };
      }
      // water
      if (cat.y + cat.h > (G + 1) * TILE + 3 || cat.y > WORLD_H + 32) {
        splashT = 0; cat.vx = 0; cat.vy = 0; sfx.splash();
        for (let i = 0; i < 3; i++) fx.add(S.splash[i], catCx() + (i - 1) * 5, (G + 1) * TILE - 6, 0, 0, { life: 0.2 + i * 0.12, blinkOut: false });
        for (let i = 0; i < 10; i++) fx.add(S.tiny[2], catCx(), (G + 1) * TILE, rnd(-60, 60), rnd(-160, -60), { g: 500, life: 0.6 });
        const tx = Math.floor(catCx() / TILE), pond = L.ponds.find(p => tx >= p.x0 - 1 && tx <= p.x1 + 1);
        if (pond) { const n = (pondFalls.get(pond.x0) ?? 0) + 1; pondFalls.set(pond.x0, n); if (n === 3) setTimeout(() => heartBridge(pond.x0, pond.x1), 800); }
      }
    }
    if (blinkT > 0) blinkT -= dt;
    spring.squash = Math.max(0, spring.squash - dt);
    if (fakeFall >= 0) fakeFall += dt;

    // pickups
    for (const p of pickups) if (!p.taken && Math.abs(p.x - catCx()) < 10 && Math.abs(p.y - (cat.y + 6)) < 12 && splashT < 0) { p.taken = true; addHearts(1); sfx.heart(); sparkle(p.x, p.y, 4); }
    for (const p of pops) p.t += dt; while (pops.length && pops[0].t > 0.6) { const p = pops.shift()!; sparkle(p.x, p.y - 20, 3); }
    for (const [k, v] of bumps) { if (v > 0.16) bumps.delete(k); else bumps.set(k, v + dt); }
    for (const s of slides) { s.t += dt; if (s.t >= 0.25 && s.t - dt < 0.25) setTile(map, s.tx + 1, s.ty, '?'); }
    for (const b of bangs) b.t += dt; while (bangs.length && bangs[0].t > 0.9) bangs.shift();

    // mushrooms
    const near = (x: number) => Math.abs(x - cam.x - scr.w / 2) < scr.w;
    for (const m of mushes) {
      if (m.state === 'gone' || !near(m.b.x)) continue;
      if (m.state === 'flat') { m.t += dt; if (m.t > 0.35) { m.state = 'gone'; puff(m.b.x + 6, m.b.y + 6, 2); pops.push({ x: m.b.x + 6, y: m.b.y, t: 0, big: false }); addHearts(1); sfx.heart(); } continue; }
      m.t += dt; m.pause = Math.max(0, m.pause - dt);
      moveBody(m.b, map, dt, m.pause > 0 ? 0 : m.dir, false, false, MFEEL);
      const ahead = tileAt(map, Math.floor((m.dir > 0 ? m.b.x + m.b.w + 2 : m.b.x - 2) / TILE), Math.floor((m.b.y + m.b.h + 2) / TILE));
      const wall = tileAt(map, Math.floor((m.dir > 0 ? m.b.x + m.b.w + 1 : m.b.x - 1) / TILE), Math.floor((m.b.y + 6) / TILE));
      if (m.b.ground && (!SOLID.has(ahead) || SOLID.has(wall))) m.dir = -m.dir;
      if (splashT < 0 && overlap(cat, m.b)) {
        if (cat.vy > 20 && cat.y + cat.h - m.b.y < 9) { m.state = 'flat'; m.t = 0; cat.vy = -270; cat.ground = false; boost = true; sfx.stomp(); }
        else if (knockT <= 0) {
          const k = Math.sign(catCx() - (m.b.x + 6)) || -cat.face;
          cat.vx = k * 190; cat.vy = -170; cat.ground = false; boost = true; knockT = 0.3; m.dir = -k; m.pause = 0.7; sfx.boop(); bangAt(0, 0, true);
        }
      }
    }
    // the sleepy mushroom: wakes up, panics, runs into the tall pipe; later peeks out with a gift
    const sb = sleepy.b;
    if (sleepy.state === 'sleep') { sleepy.zT += dt; if (sleepy.zT > 0.9) { sleepy.zT = 0; fx.add(S.z, sb.x + 10, sb.y - 2, 8, -14, { life: 1.4, sway: 6 }); } if (Math.abs(catCx() - sb.x) < 92) { sleepy.state = 'wake'; sleepy.t = 0; bangs.push({ x: sb.x + 4, y: sb.y - 12, t: 0 }); sfx.bang(); sb.vy = -150; } }
    else if (sleepy.state === 'wake') { sleepy.t += dt; moveBody(sb, map, dt, 0, false, false, MFEEL); if (sleepy.t > 0.5) sleepy.state = 'run'; }
    else if (sleepy.state === 'run') { moveBody(sb, map, dt, 1, false, false, { ...FEEL, run: 120 }); if (sb.x > gift.x - 22) { sleepy.state = 'leap'; sleepy.t = 0; sleepy.lx = sb.x; sleepy.ly = sb.y; } }
    else if (sleepy.state === 'leap') { sleepy.t += dt; const k = Math.min(1, sleepy.t / 0.5); sb.x = sleepy.lx + (gift.x + 10 - sleepy.lx) * k; sb.y = sleepy.ly + (gift.top - 12 - sleepy.ly) * k - Math.sin(k * Math.PI) * 30; if (k >= 1) { sleepy.state = 'dive'; sleepy.t = 0; sfx.boop(); } }
    else if (sleepy.state === 'dive') { sleepy.t += dt; sb.y = gift.top - 12 + Math.min(14, sleepy.t * 40); if (sleepy.t > 0.4) sleepy.state = 'gone'; }
    if (!gift.done && sleepy.state === 'gone' && cat.ground && Math.abs(cat.y + cat.h - gift.top) < 1 && cat.x + cat.w > gift.x && cat.x < gift.x + 32) { gift.done = true; gift.t = 0; }
    if (gift.t >= 0) { const before = gift.t; gift.t += dt; for (const at of [0.35, 0.6, 0.85]) if (before < at && gift.t >= at) { pops.push({ x: gift.x + 16 + (at - 0.6) * 30, y: gift.top - 10, t: 0, big: false }); addHearts(1); sfx.heart(); } if (gift.t > 2) gift.t = -2; }

    // bells
    for (const b of bells) { if (b.rung) { b.t += dt; continue; } if (catCx() > b.x) { b.rung = true; b.t = 0; sfx.bell(); for (let i = 0; i < 3; i++) fx.add(S.tiny[0], b.x + 8, b.y - 30, rnd(-30, 30), rnd(-60, -30), { life: 1.2, sway: 12 }); } }

    // fountain
    const F = fountain;
    if (F.state === 'idle' && catCx() > F.x - 26 && splashT < 0) {
      F.state = 'show'; F.t = 0; lockT = 2.3; cat.vx = 0; bangAt(0, 0, true); sfx.fanfare(); hooks.fountain();
      rollFrom = shown; rollT = 0;
      for (let i = 0; i < 56; i++) { const a = (i / 56) * Math.PI * 2; hearts.add(pick(S.heart), F.x, F.y - 60, Math.cos(a) * rnd(150, 230), Math.sin(a) * rnd(150, 230) - 60, { g: 200, drag: 0.8, life: rnd(2.5, 3.6), sway: 8 }); }
    }
    if (F.state !== 'idle') F.t += dt;
    if (F.state === 'show') {
      const k = F.t < 4 ? 1 : 1 - (F.t - 4) / 2.6, vw = scr.w, vh = scr.h;
      // jet from the spout
      for (let n = Math.floor(rnd(0, 1) + 150 * dt * k); n > 0; n--) hearts.add(Math.random() < 0.07 ? pick(S.big) : pick(S.heart), F.x + rnd(-3, 3), F.y - 60, rnd(-150, 150), -rnd(220, 470), { g: 290, drag: 0.35, life: rnd(2.6, 4.2), sway: rnd(4, 16) });
      // sprays from the bowl rim
      for (let n = Math.floor(rnd(0, 1) + 50 * dt * k); n > 0; n--) { const s = Math.random() < 0.5 ? -1 : 1; hearts.add(pick(S.tiny), F.x + s * 16, F.y - 44, s * rnd(40, 150), -rnd(100, 240), { g: 330, drag: 0.3, life: rnd(1.6, 2.6) }); }
      // heart rain over the whole screen (screen space)
      const rate = (reduced ? 30 : 90) * k * Math.min(1, F.t / 0.6) * (vw / 320);
      for (let n = Math.floor(rnd(0, 1) + rate * dt); n > 0; n--) rain.add(Math.random() < 0.08 ? pick(S.big) : pick(Math.random() < 0.4 ? S.tiny : S.heart), rnd(0, vw), -8, rnd(-12, 12), rnd(40, 110), { g: 22, sway: rnd(10, 26), life: (vh + 30) / 70 + 1.5 });
      if (Math.random() < dt * 10) sfx.sparkle();
      if (F.t > 3.4 && F.t - dt <= 3.4) hooks.caption();
      if (F.t > 6.6) F.state = 'after';
      if (lockT > 0 && F.t > 0.5 && F.t < 2 && cat.ground && Math.random() < dt * 2) { cat.vy = -160; cat.ground = false; }
    }
    if (F.state === 'after' && Math.random() < dt * 3.5 && Math.abs(F.x - cam.x - scr.w / 2) < scr.w) hearts.add(pick(S.heart), F.x + rnd(-2, 2), F.y - 60, rnd(-50, 50), -rnd(160, 260), { g: 300, drag: 0.3, life: rnd(1.4, 2) });
    if (rollT >= 0) {
      rollT += dt; const k = ease(rollT / 4.2);
      shown = Math.round(rollFrom + (200 - rollFrom) * k); hooks.hearts(shown, true);
      if (rollT >= 4.2) { rollT = -1; hearts$ = Math.max(hearts$, 200); shown = hearts$; hooks.hearts(shown); }
    }

    // door
    const dr = door;
    if (!nearExit && cat.x > dr.x - 260) { nearExit = true; hooks.nearExit(); }
    if (dr.state === 'idle' && cat.x + cat.w > dr.x - 40) { dr.state = 'hop'; dr.t = 0; bangs.push({ x: dr.x + 14, y: dr.y - 62, t: 0 }); sfx.squeak(); }
    else if (dr.state === 'hop') {
      dr.t += dt; const k = Math.min(1, Math.max(0, (dr.t - 0.35) / 0.75));
      dr.x = dr.x0 + (dr.hopTo - dr.x0) * ease(k); dr.hopY = -Math.abs(Math.sin(k * Math.PI * 2)) * (k < 0.5 ? 26 : 12);
      if (k >= 1) { dr.state = 'still'; dr.hopY = 0; puff(dr.x + 4, dr.y - 4, 2); puff(dr.x + 28, dr.y - 4, 2); sfx.boop(); }
    } else if (dr.state === 'still' && cat.ground && Math.abs(catCx() - (dr.x + 16)) < 13) { dr.state = 'enter'; dr.t = 0; input.reset(); sfx.door(); }
    else if (dr.state === 'enter') {
      dr.t += dt; cat.vx = 0; cat.x += ((dr.x + 16 - cat.w / 2) - cat.x) * Math.min(1, dt * 12);
      if (dr.t > 0.95) { dr.state = 'done'; dr.t = 0; sfx.door(); pops.push({ x: dr.x + 16, y: dr.y - 48, t: 0, big: true }); }
    } else if (dr.state === 'done') {
      dr.t += dt;
      if (dr.t > 0.45 && !exited) { exited = true; const c = scr.toClient(dr.x + 16 - cam.x, dr.y - 22 - cam.y); hooks.exit(c.x, c.y); }
    }

    fx.update(dt); hearts.update(dt); rain.update(dt);
    // camera
    const vw = scr.w, vh = scr.h;
    cam.look += ((cat.vx > 10 ? 1 : cat.vx < -10 ? -1 : cam.look > 0 ? 1 : -1) * 26 - cam.look) * Math.min(1, dt * 1.6);
    let tx = catCx() + cam.look - vw / 2;
    if (F.state === 'show' && F.t < 2.6) tx = F.x - vw / 2;
    if (dr.state === 'enter' || dr.state === 'done') tx = dr.x + 16 - vw / 2;
    cam.x += (tx - cam.x) * Math.min(1, dt * 4.5); cam.x = Math.max(0, Math.min(WORLD_W - vw, cam.x));
    if (vh >= WORLD_H) cam.y = WORLD_H - vh + Math.min(vh - WORLD_H, padBottom());
    else { const ty = cat.y - vh * 0.56; cam.y += (Math.max(0, Math.min(WORLD_H - vh, ty)) - cam.y) * Math.min(1, dt * (cat.ground ? 3 : 1.5)); }
  }
  // portrait phones: lift the world above the on-screen buttons
  const coarse = matchMedia('(pointer: coarse)').matches;
  const padBottom = () => (coarse && innerHeight > innerWidth ? Math.ceil(Math.min(180, innerHeight * 0.22) * scr.dpr / scr.scale) : 0);

  // ---------- render ----------
  let sky: CanvasGradient | null = null, skyKey = '';
  function render() {
    const g = scr.ctx, vw = scr.w, vh = scr.h, cx = Math.round(cam.x), cy = Math.round(cam.y);
    const key = `${vh},${cy}`;
    if (key !== skyKey) { skyKey = key; sky = g.createLinearGradient(0, -cy - 140, 0, -cy + G * TILE); sky.addColorStop(0, '#46B5FF'); sky.addColorStop(0.55, '#5EC4FF'); sky.addColorStop(1, '#A6E1FF'); }
    g.fillStyle = sky!; g.fillRect(0, 0, vw, vh);
    // sky clouds (parallax + drift)
    skyClouds.forEach((c, i) => {
      const span = vw + 260, x = ((i * 173 + 40 - cx * 0.12 - time * (3 + i)) % span + span) % span - 120;
      g.drawImage(c, Math.round(x), Math.round(-cy + 14 + ((i * 37) % 70) - (i % 3) * 26));
    });
    // hills
    for (const [img, f, base] of [[hillFar, 0.22, G * TILE - 80], [hillNear, 0.45, G * TILE - 54]] as [Img, number, number][]) {
      const ox = -((cx * f) % img.width), y = base - cy;
      for (let x = ox; x < vw; x += img.width) g.drawImage(img, Math.round(x), y);
      if (y + img.height < vh) { g.fillStyle = img === hillFar ? PAL.C : PAL.g; g.fillRect(0, y + img.height, vw, vh - y - img.height); }
    }
    // terrain layer (source-rect blit of the visible window)
    const sx = Math.max(0, cx), sy = Math.max(0, cy), sw = Math.min(WORLD_W - sx, vw), sh = Math.min(WORLD_H - sy, vh - Math.max(0, -cy));
    if (sw > 0 && sh > 0) g.drawImage(layer, sx, sy, sw, sh, sx - cx, sy - cy, sw, sh);
    const c0 = Math.max(0, Math.floor(cx / TILE)), c1 = Math.min(W - 1, Math.floor((cx + vw) / TILE));
    // below the world (portrait phones): the earth continues
    const bottom = WORLD_H - cy;
    if (bottom < vh) for (let tx = c0; tx <= c1; tx++) for (let y = bottom, j = 0; y < vh; y += TILE, j++) g.drawImage(T.dirt[(tx + j) & 3][0], tx * TILE - cx, y);
    // dynamic tiles: water, blocks, fake floor, heart bridge
    const wf = Math.floor(time * 4) & 3;
    for (let tx = c0; tx <= c1; tx++) for (let ty = 0; ty < H; ty++) {
      const ch = map.data[ty][tx]; if (ch === ' ' || ch === '#' || ch === 'Q' || ch === 'X' || T.pipe[ch]) continue;
      const x = tx * TILE - cx, k = `${tx},${ty}`, bt = bumps.get(k); let y = ty * TILE - cy;
      if (bt !== undefined) y -= Math.round(Math.sin((bt / 0.16) * Math.PI) * 5);
      if (ch === '~') g.drawImage(T.water[(wf + tx) & 3], x, y);
      else if (ch === '%') g.drawImage(T.deep, x, y);
      else if (ch === 'B') g.drawImage(T.brick, x, y);
      else if (ch === '?') g.drawImage(T.q[(Math.floor(time * 1.6 + tx * 0.13) % 4 === 0) ? 1 : 0], x, y);
      else if (ch === 'u') g.drawImage(T.used, x, y);
      else if (ch === 'F') g.drawImage(T.grass[hsh(tx)][0], x, y);
      else if (ch === 'H') g.drawImage(T.heartBrick, x, y);
    }
    for (const s of slides) if (s.t < 0.25) g.drawImage(T.q[0], Math.round(s.tx * TILE + (s.t / 0.25) * TILE - cx), s.ty * TILE - cy - Math.round(Math.sin(s.t / 0.25 * Math.PI) * 4));
    if (fakeFall >= 0 && fakeFall < 0.6 && Math.floor(fakeFall * 20) % 2 === 0) for (const f of fakes) g.drawImage(T.grass[hsh(f.tx)][0], f.tx * TILE - cx + (f.tx === fakes[0].tx ? -1 : 1) * Math.round(fakeFall * 30), f.ty * TILE - cy + Math.round(fakeFall * fakeFall * 300));
    // spring
    if (spring.active) g.drawImage(S.spring[spring.squash > 0 ? 1 : 0], Math.round(spring.x - 8 - cx), spring.bottom - 16 - cy);
    // pickups
    for (const p of pickups) if (!p.taken) { const img = S.pickup[Math.floor(time * 1.2 + p.ph) % 5 === 0 ? (Math.floor(time * 8) % 2 ? 2 : 1) : 0]; g.drawImage(img, Math.round(p.x - 4.5 - cx), Math.round(p.y - 4 - cy + Math.sin(time * 3 + p.ph) * 1.5)); }
    // pops (hearts jumping out of blocks)
    for (const p of pops) { const k = p.t / 0.6, img = p.big ? S.big[0] : S.pickup[0]; g.drawImage(img, Math.round(p.x - img.width / 2 - cx), Math.round(p.y - img.height - cy - Math.sin(Math.min(1, k * 1.3) * Math.PI * 0.85) * 30)); }
    // bells
    for (const b of bells) g.drawImage(S.bell[b.rung && b.t < 1.4 ? 1 + (Math.floor(b.t * 8) & 1) : b.rung ? 3 : 0], b.x - cx, b.y - 32 - cy + 1);
    // clouds
    for (const c of clouds) g.drawImage(S.cloud[c.blink > 0 ? 1 : 0], Math.round(c.x - cx), Math.round(c.y - cy));
    // mushrooms
    for (const m of mushes) {
      if (m.state === 'gone') continue;
      const img = m.state === 'flat' ? S.flat : S.mush[Math.floor(m.t * 5) & 1];
      draw(g, img, m.b.x - 2 - cx, m.b.y + m.b.h - 16 - cy, m.dir > 0);
    }
    // sleepy mushroom (clipped into the pipe when diving) + its gift peek
    if (sleepy.state !== 'gone') {
      const img = sleepy.state === 'sleep' ? S.sleep : S.mush[Math.floor(time * 12) & 1];
      if (sleepy.state === 'dive') { g.save(); g.beginPath(); g.rect(0, 0, vw, gift.top - cy); g.clip(); }
      draw(g, img, sleepy.b.x - 2 - cx, sleepy.b.y + sleepy.b.h - 16 - cy, sleepy.state !== 'sleep');
      if (sleepy.state === 'dive') g.restore();
    }
    if (gift.t >= 0) {
      const k = Math.min(1, gift.t / 0.25) * (gift.t > 1.6 ? Math.max(0, 1 - (gift.t - 1.6) / 0.3) : 1);
      g.save(); g.beginPath(); g.rect(0, 0, vw, gift.top - cy); g.clip(); g.drawImage(S.mush[0], gift.x + 8 - cx, gift.top - cy - Math.round(k * 9)); g.restore();
      g.drawImage(T.pipe['['], gift.x - cx, gift.top - cy); g.drawImage(T.pipe[']'], gift.x + 16 - cx, gift.top - cy);
    }
    // fountain + door
    g.drawImage(S.fountain[Math.floor(time * (fountain.state === 'show' ? 12 : 6)) & 3], fountain.x - 32 - cx, fountain.y - 64 - cy);
    const dr = door, dframe = dr.state === 'enter' ? 2 : dr.state === 'done' ? 0 : (dr.state === 'still' && Math.abs(catCx() - dr.x - 16) < 64) ? 1 : 0;
    g.drawImage(S.door[dframe], Math.round(dr.x - cx), Math.round(dr.y - 48 - cy + dr.hopY));
    if (dframe) { const lx = Math.round(dr.x - cx), ly = dr.y - cy; g.fillStyle = PAL.L; g.fillRect(lx + 8, ly, 16, 1); g.fillRect(lx + 4, ly + 1, 24, 1); g.fillStyle = PAL.Y; g.fillRect(lx + 11, ly, 10, 1); if (Math.floor(time * 3) & 1) { g.fillStyle = PAL.w; g.fillRect(lx + 2 + ((time * 7) % 28 | 0), ly - 18 - ((time * 11) % 20 | 0), 1, 1); } }
    // the cat
    if (splashT < 0 && dr.state !== 'done' && !(blinkT > 0 && Math.floor(blinkT * 16) % 2)) {
      let img: Img;
      if (mode === 'intro') img = introT > 0.35 && introT < 0.75 ? sp.sitAlert : introT >= 0.75 ? sp.land : sp.sit;
      else if (dr.state === 'enter') img = sp.back.frames[Math.floor(dr.t * 6) & 1];
      else if (fountain.state === 'show' && lockT > 0) img = cat.ground ? sp.happy.frames[0] : sp.happy.frames[1];
      else if (knockT > 0) img = sp.look;
      else img = catFrame(sp, cat, time, landT);
      const x = catCx() - 8 - cx, y = cat.y + cat.h - 16 - cy;
      if (dr.state === 'enter') { g.save(); g.beginPath(); g.rect(dr.x + 5 - cx, 0, 22, dr.y - cy - 1); g.clip(); draw(g, img, x, y + Math.round(Math.max(0, dr.t - 0.45) * 8), false); g.restore(); }
      else draw(g, img, x, y, cat.face < 0);
    }
    // '!!' pops
    for (const b of bangs) {
      const bx = b.follow ? catCx() + 3 : b.x, by = b.follow ? cat.y - 12 : b.y;
      if (b.t > 0.7 && Math.floor(b.t * 20) % 2) continue;
      g.drawImage(sp.bang, Math.round(bx - cx), Math.round(by - cy - (b.t < 0.08 ? 3 : 0)));
    }
    fx.draw(g, -cx, -cy, vw, vh);
    for (const p of fx.list) { const a = (p as unknown as { anim?: Img[] }).anim; if (a) p.img = a[Math.min(a.length - 1, Math.floor((1 - p.life / p.max) * a.length))]; }
    hearts.draw(g, -cx, -cy, vw, vh);
    rain.draw(g, 0, 0, vw, vh);
    if (opts.dev) { g.fillStyle = '#2E2A2B'; g.font = '8px monospace'; g.fillText(`${fps.toFixed(0)}fps ${Math.floor(catCx() / TILE)},${Math.floor(cat.y / TILE)} p${hearts.list.length + rain.list.length}`, 4, vh - 4); }
  }
  let fps = 60, last = performance.now();
  cam.x = Math.max(0, catCx() - scr.w / 2 + 26); cam.y = scr.h >= WORLD_H ? WORLD_H - scr.h : Math.max(0, Math.min(WORLD_H - scr.h, cat.y - scr.h * 0.56));
  const stop = startLoop(update, () => { const n = performance.now(); fps += (1000 / Math.max(1, n - last) - fps) * 0.05; last = n; render(); });
  scr.onResize(render);
  const dbg = { cat, cam, fountain, door, get hearts() { return hearts$; } };
  (window as unknown as { __meadow: typeof dbg }).__meadow = dbg;
  return { stop, screen: scr };
}

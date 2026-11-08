// /coop/ · the shared level: simulation (host-authoritative, pure data -> snapshot) + renderer (draws any horizontal slice
// of the world, so two phones side by side each draw their half of one wide view). Reuses the meadow art + physics.
//  Beats: ① gate - a plate on each side; one stands, the other walks through, then holds the far plate for the first
//         ② wall - 4 tiles is too high for one jump: stand on the partner's head (+boost), press the plate on top -> steps
//         ③ the heart door - both plates at once -> door opens -> they meet on the seam, a big heart across both screens.
import { makeMap, body, moveBody, setTile, landOn, tileAt, FEEL, TILE, type Body, type TileMap } from '../../shared/pixel/tiles';
import { raster, draw } from '../../shared/pixel/sprite';
import { catSprites, catFrame } from '../../shared/pixel/cat';
import { pigSprites, pigFrame } from '../../shared/pixel/pig';
import { PAL, TILES, SPRITES, HEARTS, DECO, bigCloud, hills } from '../meadow/art';

export const H = 12, G = 10, WT = 110, WW = WT * TILE, WH = H * TILE;
const SOLID = new Set(['#', 'X', 'g', 's']);
// ---------- level ----------
interface Plate { tx: number; ty: number; kind: 'gate' | 'steps' | 'heart' }
function build() {
  const g = Array.from({ length: H }, () => Array<string>(WT).fill(' '));
  const fill = (x0: number, x1: number, y0: number, y1: number, ch: string) => { for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) g[y][x] = ch; };
  fill(0, WT - 1, G, H - 1, '#');
  // ① gate: a stone pillar from the sky down to a 3-tile gate
  fill(19, 19, 0, G - 4, 'X');
  // ② the wall/ledge (4 tiles), steps appear at its foot
  fill(35, 46, G - 4, G - 1, '#');
  // ③ end wall
  fill(WT - 2, WT - 1, 0, G - 1, 'X');
  const plates: Plate[] = [{ tx: 13, ty: G - 1, kind: 'gate' }, { tx: 25, ty: G - 1, kind: 'gate' }, { tx: 43, ty: G - 5, kind: 'steps' }, { tx: 59, ty: G - 1, kind: 'heart' }, { tx: 69, ty: G - 1, kind: 'heart' }];
  const deco = [['flowerW', 2], ['tuft', 5], ['flowerP', 8.5], ['bush', 10], ['flowerY', 16], ['tuft', 22], ['flowerW', 28], ['tree', 30], ['fence', 48], ['fence', 49], ['flowerP', 51], ['bench', 53], ['lamp', 57], ['lamp', 71.5], ['flowerY', 73], ['bush', 74.5], ['tree', 79], ['flowerP', 83], ['tuft', 86], ['bed', 89], ['flowerW', 93], ['bush', 96], ['flowerY', 100], ['tree', 103], ['tuft', 106]] as [keyof typeof DECO, number][];
  return { rows: g.map(r => r.join('')), plates, gate: { tx: 19, ty0: G - 3, ty1: G - 1 }, steps: [{ tx: 33, ty: G - 1 }, { tx: 34, ty: G - 1 }, { tx: 34, ty: G - 2 }], door: { x: 64 * TILE - 16 + 8, y: G * TILE }, deco, start: [{ x: 3 * TILE, y: G * TILE - 13 }, { x: 6 * TILE, y: G * TILE - 13 }] };
}
export type Lvl = ReturnType<typeof build>;

// ---------- simulation ----------
export interface PIn { ax: number; held: boolean; hit: boolean }
export const NO_IN: PIn = { ax: 0, held: false, hit: false };
type Who = 0 | 1; // 0 = pig (left phone / host), 1 = cat
export class Sim {
  L: Lvl = build(); map: TileMap; b: [Body, Body]; land = [1, 1];
  plates: boolean[] = []; gate = 0; steps = false; stepT = -1; door = 0; both = 0; end = -1; t = 0; camX = 0;
  private on: (Body | null)[] = [null, null];
  constructor(public view: () => { tw: number; seam: number }, at?: string | null) {
    this.map = makeMap(this.L.rows, c => SOLID.has(c));
    this.b = [body(this.L.start[0].x, this.L.start[0].y), body(this.L.start[1].x, this.L.start[1].y)];
    this.b[1].face = 1;
    if (at === 'wall') { this.b[0].x = 30 * TILE; this.b[1].x = 31.5 * TILE; this.gate = 1; }
    if (at === 'end') { this.b[0].x = 55 * TILE; this.b[1].x = 57 * TILE; this.gate = 1; this.latchSteps(); this.stepT = 9; }
    this.setGate(this.gate > 0.5);
    this.camX = this.camTarget();
  }
  private latchSteps() { this.steps = true; this.stepT = 0; for (const s of this.L.steps) setTile(this.map, s.tx, s.ty, 's'); }
  private setGate(open: boolean) { const gt = this.L.gate; for (let y = gt.ty0; y <= gt.ty1; y++) setTile(this.map, gt.tx, y, open ? ' ' : 'g'); }
  private camTarget() {
    const { tw, seam } = this.view();
    if (this.end >= 0) {
      const cottage = 88 * TILE;
      const k = Math.max(0, Math.min(1, (this.end - 2.2) / 3.4));
      const aim = this.L.door.x + 16 + (cottage - this.L.door.x) * k;
      return Math.max(0, Math.min(WW - tw, aim - seam));
    }
    const mid = (this.b[0].x + this.b[1].x + this.b[0].w) / 2; return Math.max(0, Math.min(WW - tw, mid - tw / 2));
  }
  step(inp: [PIn, PIn], dt: number) {
    this.t += dt; const [pig, cat] = this.b;
    if (this.end >= 0) { this.end += dt; inp = this.autoWalk(); }
    const prev = this.b.map(b => ({ x: b.x, bottom: b.y + b.h, onP: this.on[this.b.indexOf(b)] !== null }));
    this.b.forEach((b, i) => {
      const r = moveBody(b, this.map, dt, inp[i].ax, inp[i].hit, inp[i].held);
      if (r.jumped && prev[i].onP) b.vy = -FEEL.jump * 1.22; // a leg-up from the partner's head
      this.land[i] = b.ground ? this.land[i] + dt : 0;
    });
    // standing on each other: one-way platform on the partner's head, carried along by its motion
    for (const i of [0, 1] as Who[]) {
      const a = this.b[i], o = this.b[1 - i]; this.on[i] = null;
      if (landOn(a, prev[i].bottom, o.y, o.x, o.x + o.w)) { this.on[i] = o; a.x += o.x - prev[1 - i].x; }
    }
    if (this.end < 0) { // keep both inside the shared view (two phones = one window)
      const { tw } = this.view(); for (const b of this.b) b.x = Math.max(this.camX + 1, Math.min(this.camX + tw - b.w - 1, b.x));
    }
    // plates
    this.plates = this.L.plates.map(p => this.b.some(b => b.ground && Math.abs(b.y + b.h - (p.ty + 1) * TILE) < 1.5 && b.x + b.w > p.tx * TILE + 2 && b.x < p.tx * TILE + 14));
    const gateWant = this.L.plates.some((p, i) => p.kind === 'gate' && this.plates[i]);
    const gt = this.L.gate, inGate = this.b.some(b => b.x + b.w > gt.tx * TILE && b.x < (gt.tx + 1) * TILE && b.y + b.h > gt.ty0 * TILE);
    const before = this.gate > 0.5;
    this.gate = Math.max(0, Math.min(1, this.gate + (gateWant || (inGate && this.gate > 0.3) ? dt * 3.2 : -dt * 2.4)));
    if ((this.gate > 0.5) !== before) this.setGate(this.gate > 0.5);
    if (!this.steps && this.L.plates.some((p, i) => p.kind === 'steps' && this.plates[i])) this.latchSteps();
    if (this.stepT >= 0) this.stepT += dt;
    const hearts = this.L.plates.map((p, i) => p.kind === 'heart' && this.plates[i]).filter(Boolean).length;
    this.both = hearts >= 2 ? this.both + dt : 0;
    if (this.end < 0 && this.both > 0.35) this.end = 0;
    this.door = this.end >= 0 ? Math.min(1, this.end / 0.6) : hearts * 0.18;
    const ct = this.camTarget(); this.camX += (ct - this.camX) * Math.min(1, dt * (this.end >= 0 ? 2.2 : 5));
    void pig; void cat;
  }
  /** ending: meet at the door, then both walk the same way toward the cottage */
  private autoWalk(): [PIn, PIn] {
    const door = this.L.door.x + 16;
    const cottage = 86 * TILE;
    const meet = [door - 14, door + 4];
    const onward = [cottage - 18, cottage - 4];
    const going = this.end > 2.1;
    const goal = going ? onward : meet;
    return this.b.map((b, i) => {
      const d = goal[i] - b.x;
      if (!going && (this.end < 0.55 || Math.abs(d) < 1.5)) return { ax: 0, held: false, hit: false };
      return { ax: Math.abs(d) < 1.4 ? 0 : Math.sign(d), held: false, hit: false };
    }) as [PIn, PIn];
  }
  snapshot(): number[] {
    const r = (v: number) => Math.round(v * 10) / 10, s: number[] = [];
    for (const b of this.b) s.push(r(b.x), r(b.y), r(b.vx), r(b.vy), b.ground ? 1 : 0, b.face);
    s.push(r(this.camX), Math.round(this.gate * 100) / 100, this.steps ? 1 : 0, r(this.stepT), Math.round(this.door * 100) / 100, r(this.end), r(this.t), this.plates.reduce((m, p, i) => m | (p ? 1 << i : 0), 0), r(this.land[0]), r(this.land[1]));
    return s;
  }
  load(s: number[]) {
    this.b.forEach((b, i) => { const o = i * 6; b.x = s[o]; b.y = s[o + 1]; b.vx = s[o + 2]; b.vy = s[o + 3]; b.ground = !!s[o + 4]; b.face = s[o + 5] as 1 | -1; });
    const [camX, gate, steps, stepT, door, end, t, pl, l0, l1] = s.slice(12);
    this.camX = camX; this.gate = gate; this.steps = !!steps; this.stepT = stepT; this.door = door; this.end = end; this.t = t; this.land = [l0, l1];
    this.plates = this.L.plates.map((_, i) => !!(pl & (1 << i)));
  }
}

// ---------- renderer ----------
type Img = HTMLCanvasElement;
const R = (rows: string[]) => raster(rows, PAL);
const hash = (i: number, s = 0) => { let h = (i * 374761393 + s * 668265263) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
export class Art {
  cat = catSprites(); pig = pigSprites();
  T = { grass: TILES.grass.map(v => v.map(R)), dirt: TILES.dirt.map(v => v.map(R)), stone: R(TILES.stone), plank: R(TILES.plank) };
  door = SPRITES.door.map(R); heart = R(HEARTS.big[0]); small = HEARTS.small.map(R); puff = SPRITES.puff.map(R);
  clouds = [0, 1, 2, 3, 4, 5].map(i => R(bigCloud(i, i % 2 ? 56 : 72, i % 2 ? 22 : 28)));
  hillFar = R(hills(1, 512, 96, 70, 46, 'C', 'x', 'i')); hillNear = R(hills(4, 384, 70, 40, 30, 'g', 'G', 'l'));
  deco: Record<string, Img> = Object.fromEntries(Object.entries(DECO).map(([k, v]) => [k, R(v as string[])]));
  plate = [R(['..kkkkkkkkkkkk..', '.kqqqqqqqqqqqqk.', 'kQQQQQQQQQQQQQQk']), R(['................', '..kkkkkkkkkkkk..', 'kqqqqqqqqqqqqqqk'])];
  heartPlate = [R(['..kkkkkkkkkkkk..', '.khhhhrrhhhhhhk.', 'kRRRRRRRRRRRRRRk']), R(['................', '..kkkkkkkkkkkk..', 'khhhhhrrhhhhhhhk'])];
  bars = R(Array.from({ length: 48 }, (_, y) => y % 12 === 0 ? 'kEEEEEEEEEEEEEEk' : '.kDk.kDk.kDk.kDk'.replace(/D/g, y % 12 < 2 ? 'e' : 'D')));
  layer: Img; private lvl: Lvl;
  constructor(sim: Sim) {
    this.lvl = sim.L; const m = sim.map;
    const c = this.layer = document.createElement('canvas'); c.width = WW; c.height = WH; const g = c.getContext('2d')!;
    const hs = (x: number) => ((x * 2654435761) >>> 0) % 4, solidG = (ch: string) => ch === '#';
    for (const [n, x] of this.lvl.deco) { const img = this.deco[n]; const X = Math.round(x * TILE), Y = G * TILE - img.height + (String(n).startsWith('flower') || n === 'tuft' ? 0 : 1); if (String(n).startsWith('flower')) { g.drawImage(img, X, Y); g.drawImage(img, X + 5, Y - 1); } else g.drawImage(img, X, Y); }
    for (let ty = 0; ty < H; ty++) for (let tx = 0; tx < WT; tx++) {
      const ch = this.lvl.rows[ty][tx], x = tx * TILE, y = ty * TILE;
      if (ch === '#') { const top = !solidG(tileAt(m, tx, ty - 1)) && ty > 0, l = !solidG(tileAt(m, tx - 1, ty)), r = !solidG(tileAt(m, tx + 1, ty)); g.drawImage((top ? this.T.grass : this.T.dirt)[hs(tx)][(l && top ? 1 : 0) + (r && top ? 2 : 0)], x, y); }
      else if (ch === 'X') g.drawImage(this.T.stone, x, y);
    }
  }
  /** draw the world slice [vx, vx+vw) into g (logical px). sim may be the host sim or a snapshot-fed replica. */
  render(g: CanvasRenderingContext2D, sim: Sim, vx: number, vw: number, vh: number) {
    const cx = Math.round(vx), cy = WH - vh, t = sim.t, L = sim.L;
    const sky = g.createLinearGradient(0, -cy - 60, 0, -cy + G * TILE); sky.addColorStop(0, '#46B5FF'); sky.addColorStop(0.55, '#5EC4FF'); sky.addColorStop(1, '#A6E1FF');
    g.fillStyle = sky; g.fillRect(0, 0, vw, vh);
    // parallax is relative to the shared camera (not this slice) so clouds/hills continue across the seam
    const cam = Math.round(sim.camX), off = cx - cam;
    this.clouds.forEach((c, i) => { const span = 1100, x = ((i * 197 + 40 - cam * 0.12 - t * (3 + i)) % span + span) % span - 120; g.drawImage(c, Math.round(x - off), Math.round(-cy + 10 + ((i * 37) % 60) - (i % 3) * 20)); });
    for (const [img, f, base] of [[this.hillFar, 0.22, G * TILE - 80], [this.hillNear, 0.45, G * TILE - 54]] as [Img, number, number][]) {
      const ox = -((cam * f) % img.width) - off, y = base - cy; for (let x = ox - img.width * 2; x < vw; x += img.width) g.drawImage(img, Math.round(x), y);
    }
    g.drawImage(this.layer, cx, 0, vw, WH, 0, -cy, vw, WH);
    // steps (appear with a little rise), gate bars, plates, door
    if (sim.steps) L.steps.forEach((s, i) => { const k = Math.min(1, Math.max(0, (sim.stepT - i * 0.12) / 0.25)); if (k > 0) g.drawImage(this.T.stone, s.tx * TILE - cx, s.ty * TILE - cy + Math.round((1 - k) * 16)); });
    const gt = L.gate, gy = gt.ty0 * TILE - cy - Math.round(sim.gate * 46);
    g.save(); g.beginPath(); g.rect(gt.tx * TILE - cx, gt.ty0 * TILE - cy, TILE, 48); g.clip(); g.drawImage(this.bars, gt.tx * TILE - cx, gy); g.restore();
    L.plates.forEach((p, i) => { const on = sim.plates[i] ? 1 : 0, img = (p.kind === 'heart' ? this.heartPlate : this.plate)[on]; g.drawImage(img, p.tx * TILE - cx, (p.ty + 1) * TILE - cy - 3); });
    const dr = L.door, df = sim.door >= 1 ? 2 : sim.door > 0.3 ? 1 : 0;
    g.drawImage(this.door[df], dr.x - cx, dr.y - 48 - cy);
    // the two
    const [pig, cat] = sim.b, ending = sim.end >= 0;
    const pf = ending && sim.end > 1.6 ? this.pig.happy.frames[Math.floor(t * 4) & 1] : pigFrame(this.pig, pig, t, sim.land[0]);
    const cf = ending && sim.end > 1.6 ? this.cat.happy.frames[Math.floor(t * 4 + 1) & 1] : catFrame(this.cat, cat, t, sim.land[1]);
    const pFace = ending && sim.end > 2.1 ? 1 : pig.face, cFace = ending && sim.end > 2.1 ? 1 : cat.face;
    draw(g, pf, pig.x + pig.w / 2 - 8 - cx, pig.y + pig.h - 16 - cy, pFace < 0);
    draw(g, cf, cat.x + cat.w / 2 - 8 - cx, cat.y + cat.h - 16 - cy, cFace < 0);
    if (ending) this.finale(g, sim, vx, vw, vh, cy);
  }
  /** the ending is a pure function of time (no RNG), so both phones draw exactly the same picture across the seam */
  private finale(g: CanvasRenderingContext2D, sim: Sim, vx: number, vw: number, vh: number, cy: number) {
    const { tw, seam } = sim.view(), e = sim.end, sx = sim.camX + seam - vx;
    // falling hearts over the whole shared view (both screens)
    const span = tw;
    for (let i = 0; i < 90; i++) {
      const d = 1.4 + hash(i, 1) * 3.5; if (e < d) continue;
      const img = this.small[i % 3], sp = 26 + hash(i, 2) * 38, y = -10 + ((e - d) * sp) % (vh + 20), x = sim.camX + hash(i, 3) * span + Math.sin(e * 1.3 + i) * 6 - vx;
      if (x > -8 && x < vw + 8) g.drawImage(img, Math.round(x), Math.round(y));
    }
    // one big pixel heart centred on the seam, growing in integer steps
    if (e > 1.6 && e < 3.4) {
      const kMax = Math.max(2, Math.floor(Math.min((span * 0.42) / 11, vh * 0.4 / 10))), k = Math.max(1, Math.min(kMax, Math.floor((e - 1.6) / 0.09) + 1));
      const fade = e > 2.6 ? Math.max(0, 1 - (e - 2.6) / 0.8) : 1;
      g.save(); g.globalAlpha = fade;
      const pulse = e > 3 && Math.floor(e * 1.6) % 2 ? 1 : 0, kk = k + (k === kMax ? pulse : 0), w = 11 * kk, h = 10 * kk;
      g.drawImage(this.heart, Math.round(sx - w / 2), Math.max(4, Math.round((G * TILE - cy - 48 - h) / 2)), w, h);
      g.restore();
    }
    // cottage waiting further along the path (same walking direction)
    if (e > 2.0) {
      const hx = 88 * TILE - vx, hy = G * TILE - cy;
      const show = Math.min(1, (e - 2.0) / 1.2);
      g.save(); g.globalAlpha = show;
      g.fillStyle = '#C4A078'; g.fillRect(Math.round(hx - 28), Math.round(hy - 52), 56, 52);
      g.fillStyle = '#8A4A3A'; g.fillRect(Math.round(hx - 34), Math.round(hy - 64), 68, 16);
      g.fillStyle = '#6A4A32'; g.fillRect(Math.round(hx - 8), Math.round(hy - 28), 16, 28);
      g.fillStyle = '#7A9EC0'; g.fillRect(Math.round(hx + 10), Math.round(hy - 42), 12, 12);
      g.fillStyle = '#F0B070'; g.fillRect(Math.round(hx + 10), Math.round(hy - 42), 6, 12);
      g.restore();
    }
  }
}

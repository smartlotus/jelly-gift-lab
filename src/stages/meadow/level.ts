// Stage 1 level, authored with a tiny builder that emits the classic string-row tile map (15 rows x 200 cols, 16px tiles)
// plus an entity list. Beats (docs/GIFT_PLAN.md §5.1): learn to walk/jump -> ? blocks (one is shy, one is invisible) ->
// stairs -> sleepy mushroom that runs off into a pipe -> smiling clouds over a lake -> fake floor -> spring -> bell ->
// brick rows -> stone hill -> plaza with the heart fountain -> the door (which hops away once) -> /shop/.
// Tile chars: '#' ground  'X' stone  'B' brick  '?' question  'i' hidden block  'Q' plaza  '[ ] { }' pipe  '=' plank (one-way)
//             'F' fake floor  '~' water surface  '%' deep water.  No death anywhere: water = splash + respawn on the last
//             safe ground; 3 splashes in the same pond lays a heart-brick bridge.
export const W = 200, H = 15, G = 12; // ground surface row
export type Content = 'heart' | 'hearts5' | 'shy' | 'big' | 'bang';
export interface Ent { kind: string; x: number; y: number; [k: string]: unknown }
export interface Level { rows: string[]; ents: Ent[]; content: Map<string, Content>; ponds: { x0: number; x1: number }[]; deco: { name: string; x: number; y: number }[] }

export function buildLevel(): Level {
  const g = Array.from({ length: H }, () => Array<string>(W).fill(' '));
  const ents: Ent[] = [], content = new Map<string, Content>(), ponds: { x0: number; x1: number }[] = [], deco: Level['deco'] = [];
  const ground = (x0: number, x1: number, top = G, ch = '#') => { for (let x = x0; x <= x1; x++) for (let y = top; y < H; y++) g[y][x] = ch; };
  const pond = (x0: number, x1: number) => { for (let x = x0; x <= x1; x++) { g[G + 1][x] = '~'; g[G + 2][x] = '%'; } ponds.push({ x0, x1 }); };
  const set = (x: number, y: number, ch: string) => { g[y][x] = ch; };
  const q = (x: number, y: number, c: Content = 'heart') => { set(x, y, '?'); content.set(`${x},${y}`, c); };
  const col = (x: number, top: number, ch = 'X') => { for (let y = top; y < G; y++) set(x, y, ch); };
  const pipe = (x: number, h: number) => { const top = G - h; set(x, top, '['); set(x + 1, top, ']'); for (let y = top + 1; y < G; y++) { set(x, y, '{'); set(x + 1, y, '}'); } };
  const heart = (x: number, y: number) => ents.push({ kind: 'pickup', x: x * 16 + 8, y: y * 16 + 8 });
  const row = (x0: number, x1: number, y: number) => { for (let x = x0; x <= x1; x++) heart(x, y); };
  const arc = (x0: number, x1: number, y0: number, h: number) => { for (let x = x0; x <= x1; x++) { const t = (x - x0) / Math.max(1, x1 - x0); heart(x, Math.round(y0 - Math.sin(t * Math.PI) * h)); } };
  const d = (name: string, x: number, y = G) => deco.push({ name, x, y });

  // 0-14 · start meadow: learn to walk, a first ? block, a little step
  ground(0, 14); ents.push({ kind: 'start', x: 3 * 16, y: G * 16 });
  d('signArrow', 6); d('flowerW', 1.3); d('tuft', 4.6); d('flowerP', 8.2); d('bush', 10.5); d('flowerY', 13.6);
  q(9, 8); arc(11, 13, 10, 1); col(13, 11);
  // 15-16 · first little pond
  pond(15, 16);
  // 17-34 · ? row: hearts, a bashful block that scoots away, an invisible block
  ground(17, 34);
  q(20, 8); set(22, 8, 'B'); q(23, 8, 'hearts5'); set(24, 8, 'B'); q(25, 8); set(27, 8, 'i'); content.set('27,8', 'bang'); q(30, 8, 'shy');
  col(21, 11); row(22, 24, 6); d('flowerW', 18.3); d('tuft', 21); d('flowerP', 26.4); d('fence', 31); d('fence', 32); d('flowerY', 33.5);
  // 35-37 · stairs up and a hop down
  col(35, 11); col(36, 10); col(37, 9); arc(37, 41, 7, 2);
  // 38-62 · mushroom meadow, two pipes, the sleepy mushroom
  ground(38, 62);
  ents.push({ kind: 'mush', x: 44 * 16, y: G * 16, dir: -1 }, { kind: 'mush', x: 49 * 16, y: G * 16, dir: -1 });
  pipe(52, 2); heart(52.5, 8); ents.push({ kind: 'sleepy', x: 56 * 16, y: G * 16 }); pipe(60, 3); ents.push({ kind: 'giftpipe', x: 60 * 16, y: (G - 3) * 16 });
  set(57, G - 2, '='); // M7: a one-way plank halfway up, so the 3-tile pipe is a comfortable two-step hop (the sleepy mushroom runs underneath)
  d('bush', 39.5); d('flowerW', 42.2); d('tuft', 46.5); d('flowerP', 50.3); d('tree', 55.6); d('flowerY', 58.8);
  // 63-72 · the lake, crossed on smiling clouds
  pond(63, 72);
  ents.push({ kind: 'cloud', x: 64.5 * 16, y: 9.6 * 16, ax: 0, ay: 6, period: 3.2 }, { kind: 'cloud', x: 68.8 * 16, y: 8.6 * 16, ax: 18, ay: 3, period: 4.4 });
  arc(64, 72, 6, 2);
  // 73-92 · bell checkpoint, the fake floor -> spring -> heart arc, a wandering mushroom
  ground(73, 92); ents.push({ kind: 'bell', x: 75 * 16, y: G * 16 });
  set(81, G, 'F'); set(82, G, 'F'); ents.push({ kind: 'spring', x: 81.5 * 16, y: (G + 1) * 16 });
  arc(81, 90, 4, 2); ents.push({ kind: 'mush', x: 89 * 16, y: G * 16, dir: -1 });
  d('flowerP', 74.2); d('tuft', 78); d('flowerW', 79.4); d('bush', 85); d('flowerY', 91.3);
  // 93-95 · pond
  pond(93, 95);
  // 96-118 · brick road, a high ? block, two mushrooms, planks
  ground(96, 118);
  col(97, 11); col(98, 10); for (let x = 99; x <= 105; x++) set(x, 8, 'B'); q(101, 8); q(103, 8, 'hearts5'); q(102, 4, 'big'); row(99, 100, 6); row(104, 105, 6);
  ents.push({ kind: 'mush', x: 109 * 16, y: G * 16, dir: -1 }, { kind: 'mush', x: 112 * 16, y: G * 16, dir: 1 });
  for (let x = 114; x <= 117; x++) set(x, 9, '='); row(114, 117, 7);
  d('flowerW', 96.1); d('tree', 107); d('tuft', 110.5); d('flowerP', 113.2); d('fence', 116); d('fence', 117);
  // 119-121 · pond
  pond(119, 121); arc(118, 122, 8, 2);
  // 122-140 · stone hill, second bell
  ground(122, 140); ents.push({ kind: 'bell', x: 123.5 * 16, y: G * 16 });
  col(126, 11); col(127, 10); for (let x = 128; x <= 131; x++) col(x, 9); col(132, 10); col(133, 11); row(128, 131, 7);
  d('flowerY', 125); d('bush', 135); d('flowerW', 138.2); d('tuft', 139.6);
  // 141-176 · the plaza and the heart fountain
  ground(141, 176, G, 'Q');
  ents.push({ kind: 'fountain', x: 158 * 16, y: G * 16 });
  d('lamp', 143.5); d('bench', 146.5); d('bed', 150); d('lamp', 153.2); d('lamp', 162.4); d('bed', 164); d('bench', 168.5); d('lamp', 173.5);
  // 177-199 · last stretch of grass, the door
  ground(177, 199); ents.push({ kind: 'door', x: 186 * 16, y: G * 16, hop: 192 * 16 });
  d('flowerP', 178.2); d('tuft', 180.5); d('flowerW', 183.4); d('bush', 196.5); d('tree', 197.6); d('flowerY', 190); d('flowerW', 195.2);
  return { rows: g.map(r => r.join('')), ents, content, ponds, deco };
}

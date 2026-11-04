// v03d · the bridge objects (转换物品): at every seam between two scenes one small thing from scene A drifts in the water
// ahead of the shark; the shark noses into it and carries it across the seam, where it dissolves (ordered dither +
// sparkles) into a thing that belongs to scene B; the shark lets it go and it settles into B. Pixel string-art sprites.
import { bayer } from '../../shared/dawn';
import { R } from './art';

type Spr = { rows: string[]; pal: Record<string, string> };
export interface Bridge { a: Spr; b: Spr; rest: number; zh: string; en: string }
const P = (rows: string, pal: Record<string, string>): Spr => ({ rows: rows.trim().split(/\s+/), pal });
const K = '#1e1a24', W = '#fffbf2';
// ---- the sprites -----------------------------------------------------------------------------------------------
const JELLY = P(`
..pppppppp..
.pPPPPPPPPp.
pPwwPPPPPPPp
pPwPPPPPPPPp
pPPPPPPPPPPp
pPPPPPPPPPPp
pPPPPPPPPPPp
.pPPPPPPPPp.
..pppppppp..`, { p: '#d9658a', P: '#f29ab4', w: W });
const GIFT = P(`
...r....r...
....r..r....
.....rr.....
bbbbbrrbbbbb
bBBBBrrBBBBb
bBBBBrrBBBBb
rrrrrrrrrrrr
bBBBBrrBBBBb
bBBBBrrBBBBb
bbbbbrrbbbbb`, { b: '#2f5f95', B: '#5a8ec5', r: '#e05a5a' });
const HAT = P(`
...kkkkkkk...
...kKKKKKk...
...kKKKKKk...
...kKKKKKk...
...kKKKKKk...
...rrrrrrr...
kkkkkkkkkkkkk
.kkkkkkkkkkk.`, { k: K, K: '#3a3446', r: '#b0303a' });
const BUOY = P(`
.....yy.....
.....yyy....
.....y......
.....k......
....rrrr....
...wwwwww...
...rrrrrr...
..wwwwwwww..
..rrrrrrrr..
.bbbbbbbbbb.
..bbbbbbbb..`, { y: '#f2c230', k: K, r: '#d8343a', w: W, b: '#2a3a4a' });
const SHELL = P(`
.....ss.....
...sSsSsS...
..sSsSsSsS..
.sSsSsSsSsS.
.sSsSsSsSsS.
..sSsSsSsS..
...ttwwtt...
..tTTwwTTt..
...tttttt...`, { s: '#e8a088', S: '#f6cdb6', w: W, t: '#c97a68', T: '#e8b0a0' });
const DIAMOND = P(`
...cCCCCc...
..cCwCCCCc..
.cCCwCCCCCc.
cCCCCCCCCCCc
.cCCCCCCCCc.
..cCCCCCCc..
...cCCCCc...
....cCCc....
.....cc.....`, { c: '#5ab0d0', C: '#bdf0fb', w: W });
const FRAME = P(`
gggggggggggg
gGGGGGGGGGGg
gGbbbbbbbbGg
gGbbyybbbbGg
gGbbyybbbbGg
gGbbbbbmmbGg
gGbbbmmmmmGg
gGmmmmmmmmGg
gGGGGGGGGGGg
gggggggggggg`, { g: '#a07818', G: '#e8c050', b: '#3a5a8a', y: '#f2e090', m: '#2e4a3a' });
const WINDOW = P(`
wwwwwwwwwwww
wPPwPPwPPwPw
wPPwPPwPPwPw
wwwwwwwwwwww
wPPwPPwPPwPw
wPPwPPwPPwPw
wwwwwwwwwwww
wPPwPPwPPwPw
wPPwPPwPPwPw
wwwwwwwwwwww`, { w: '#8a3a2a', P: '#f8e2a8' });
const LAMP = P(`
.....y.....
....yoy....
....yoy....
...yoooy...
....yyy....
.bbbbbbbbb.
..bBBBBBb..
...bbbbb...
....bbb....
...bbbbb...`, { y: '#ffe08a', o: '#ff9a3c', b: '#8a6a3a', B: '#c8a060' });
const SPARKS = P(`
....oOOo....
..oO....Oo..
.o........o.
.O........O.
o..........o
O..........O
o..........o
.O........O.
.o........o.
..oO....Oo..
....oOOo....`, { o: '#ff9a3c', O: '#ffd27a' });
const GEM = P(`
...pPPp...
..pPwwPp..
.pPPwPPPp.
pPPPPPPPPp
pPPPPPPPPp
.pPPPPPPp.
..pPPPPp..
...pPPp...`, { p: '#7a3ad0', P: '#c08af8', w: W });
const LANTERN = P(`
....yy....
..yyyyyy..
.rrrRrrrr.
rrRrrrrRrr
rRrrRRrrRr
rRrrRRrrRr
rrRrrrrRrr
.rrrRrrrr.
..yyyyyy..
....yy....
....rr....
...r..r...`, { y: '#e8b830', r: '#c8282e', R: '#f05a4a' });
const COIN = P(`
...cccccc...
..cCCCCCCc..
.cCCyCCyCCc.
cCCCC..CCCCc
cCyCC..CCyCc
cCCCC..CCCCc
.cCCyCCyCCc.
..cCCCCCCc..
...cccccc...`, { c: '#8a5a2a', C: '#d8a050', y: '#f2d080' });
const TICKET = P(`
pppppppppppppp
pRRRRppppppppp
p.....p.......
pppppppppppppp
pkkkkkkkpkkppp
pppppppppppppp
pkkkpppkkkkkpp
pppppppppppppp`, { p: '#f4ead8', R: '#c8282e', k: '#6a6058' });
const CAR = P(`
.wwwwwwwwwwwwwww.
wwkkwkkkwkkkwkkww
wwkkwkkkwkkkwkkww
bbbbbbbbbbbbbbbbb
wwwwwwwwwwwwwwwww
.kk...........kk.`, { w: '#e9ecea', k: '#2a3438', b: '#3a7ac0' });
const POLICE = P(`
......rb......
....kkkkkk....
...kccwwcck...
.wwwwwwwwwwww.
wwwwkkkkkkwwww
wwwwwwwwwwwwww
.kkk......kkk.`, { r: '#e0303a', b: '#3a7ae0', k: '#1a1e24', w: '#e8ecf0', c: '#9ac8e0' });
const HERB = P(`
..g..g..g...
.gGg.GG.gGg.
..gGgGGgGg..
...gGGGGg...
....gGGg....
...bbbbbb...
...bBBBBb...
....bbbb....`, { g: '#3a9a4a', G: '#7ad86a', b: '#6a4a2a', B: '#9a6a3a' });
const RIME = P(`
w..w....w..w
.wkw..w.wkw.
..kww.wkw...
...wkwkw..w.
....kkkwwkw.
.....kk.....
.....k......
.....k......`, { w: '#f4fbff', k: '#6a5a50' });
const ICICLE = P(`
wwwwwwwwww
.wCCwwCCw.
.wCCw.wCw.
..wCw.wC..
..wC...w..
...w......`, { w: '#f4fbff', C: '#a8d8f0' });
const KATANA = P(`
.....y..........
kKkKkyGGGGGGGGGw
kKkKkyGgggggggw.
.....y..........`, { k: '#1a1a1a', K: '#e8d040', y: '#c8a030', G: '#dfe6ea', g: '#a8b4bc', w: W });
const SNOW = P(`
..wwww..
.wwwwww.
wwwwwwCw
wwwwwwCw
wwwwwCCw
.wwCCCw.
..wwww..`, { w: '#f8fcff', C: '#c8e0f0' });
const PUMICE = P(`
...ssssss...
.ssSsSSsSss.
sSSdSSSSdSSs
sSSSSdSSSSSs
.sSdSSSSdSs.
..ssssssss..`, { s: '#7a7470', S: '#b8b0a8', d: '#5a5450' });
const DROP = P(`
....b....
....b....
...bBb...
..bBBBb..
.bBwBBBb.
.bBwBBBb.
.bBBBBBb.
..bBBBb..
...bbb...`, { b: '#3a8ad8', B: '#9ad0f8', w: W });
const LENS = P(`
...gggg.....
..gCCCCg....
.gCwCCCCg...
.gCwCCCCg...
.gCCCCCCg...
..gCCCCg....
...ggggkk...
.......kkk..
........kkk.
.........kk.`, { g: '#c8a040', C: '#bfe0e8', w: W, k: '#4a2e1e' });
const SHARD = P(`
w..........
cw.........
ccw........
cCcw.......
cCCcw......
cCCCcw.....
cCCCCcw....
ccccccccw..`, { w: W, c: '#9ab8c0', C: '#d8eef2' });
const RING = P(`
....wCw....
...wCCCw...
....CwC....
...yyyyy...
..yy...yy..
.yy.....yy.
.y.......y.
.yy.....yy.
..yy...yy..
...yyyyy...`, { w: W, C: '#bdf0fb', y: '#e8c050' });
const BOUQUET = P(`
.pP.rR.pP.
pPPrRRpPPp
.pPRrrRpP.
..pgPRgp..
...gggg...
....ww....
...wwww...
....gg....
....gg....`, { p: '#f29ab4', P: '#fbd0dc', r: '#e05a6a', R: '#f88a8a', g: '#4a8a4a', w: W });
const PHOTO = P(`
wwwwwwwwww
wddddddddw
wdssssssdw
wdssyssssw
wdsssmmsdw
wdmmmmmmdw
wddddddddw
wwwwwwwwww
wwwwwwwwww`, { w: '#f4f0e6', d: '#3a3a44', s: '#8aa0b8', y: '#f2e090', m: '#5a6a5a' });
const PAGE = P(`
cccccccccccc
cpppcccqqqqc
cpppcccqqqqc
cpppcccqqqqc
cccccccccccc
cccqqqqcpppc
cccqqqqcpppc
cccqqqqcpppc
cccccccccccc`, { c: '#efe4cc', p: '#8a9aaa', q: '#c8a888' });
const BOAT = P(`
......w.......
.....wWw......
....wWWWw.....
...wWWWWWw....
wwwwwwwwwwwwww
.wWWWWWWWWWWw.
..wWWWWWWWWw..
...wwwwwwww...`, { w: '#c8ccd4', W: '#f8f8fa' });
// ---- the 15 bridges: [into scene 1 from the jelly stage], then one per seam (rest = where B settles, × floor) -----------
export const BRIDGES: Bridge[] = [
  { a: JELLY, b: GIFT, rest: 0.42, zh: '小果冻 → 礼物', en: 'jelly → gift' },
  { a: HAT, b: BUOY, rest: 0.14, zh: '男爵礼帽 → 浮标', en: 'top hat → buoy' },
  { a: SHELL, b: DIAMOND, rest: 0.46, zh: '珍珠贝 → 钻石', en: 'pearl shell → diamond' },
  { a: FRAME, b: WINDOW, rest: 0.3, zh: '名画画框 → 格子窗', en: 'painting frame → lattice window' },
  { a: LAMP, b: SPARKS, rest: 0.34, zh: '佛前油灯 → 火花环', en: 'oil lamp → spark ring' },
  { a: GEM, b: LANTERN, rest: 0.24, zh: '宝石 → 宫灯', en: 'gem → palace lantern' },
  { a: COIN, b: TICKET, rest: 0.4, zh: '铜钱 → 车票', en: 'copper coin → train ticket' },
  { a: CAR, b: POLICE, rest: 0.52, zh: '车厢 → 警车', en: 'train car → police car' },
  { a: HERB, b: RIME, rest: 0.3, zh: '绿色草药 → 雾凇枝', en: 'green herb → rime twig' },
  { a: ICICLE, b: KATANA, rest: 0.4, zh: '冰凌 → 武士刀', en: 'icicle → katana' },
  { a: SNOW, b: PUMICE, rest: 0.16, zh: '雪球 → 火山浮石', en: 'snowball → pumice' },
  { a: DROP, b: LENS, rest: 0.38, zh: '水滴 → 放大镜', en: 'water drop → magnifier' },
  { a: SHARD, b: RING, rest: 0.34, zh: '镜子碎片 → 戒指', en: 'mirror shard → ring' },
  { a: BOUQUET, b: PHOTO, rest: 0.4, zh: '捧花 → 相片', en: 'bouquet → photograph' },
  { a: PAGE, b: BOAT, rest: 0.12, zh: '相册页 → 纸船', en: 'album page → paper boat' },
];
// ---- baking: both sprites on one padded canvas size, 17 dissolve steps (bayer threshold) between them ----------------
const SC = 2; // the bridge objects are drawn at 2× the scene pixel so they read on a phone next to the 62 px shark
const baked = new Map<number, HTMLCanvasElement[]>();
function frames(i: number): HTMLCanvasElement[] {
  let f = baked.get(i); if (f) return f;
  const { a, b } = BRIDGES[i], w = Math.max(...[a, b].map(s => Math.max(...s.rows.map(r => r.length)))), h = Math.max(a.rows.length, b.rows.length);
  const px = (s: Spr, x: number, y: number) => { const ox = Math.floor((w - Math.max(...s.rows.map(r => r.length))) / 2), oy = Math.floor((h - s.rows.length) / 2), ch = s.rows[y - oy]?.[x - ox]; return ch && ch !== '.' ? s.pal[ch] : null; };
  f = [];
  for (let n = 0; n <= 16; n++) {
    const c = document.createElement('canvas'); c.width = w * SC; c.height = h * SC; const g = c.getContext('2d')!;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const col = bayer(x, y) * 16 < n ? px(b, x, y) : px(a, x, y); if (col) R(g, x * SC, y * SC, SC, SC, col); }
    f.push(c);
  }
  baked.set(i, f); return f;
}
export const bridgeSize = (i: number) => { const c = frames(i)[0]; return { w: c.width, h: c.height }; };
/** state of one bridge object in world coordinates; k = morph 0 (A) → 1 (B) */
export interface BState { ph: 0 | 1 | 2; x: number; y: number; k: number; rx: number; ry: number; t: number }
export function drawBridge(g: CanvasRenderingContext2D, i: number, s: BState, cam: number, oy: number, t: number) {
  const fr = frames(i), img = fr[Math.round(s.k * 16)], x = Math.round(s.x - cam), y = Math.round(s.y + oy);
  if (x < -img.width - 20 || x > g.canvas.width + 20) return;
  // a soft halo + glints so the eye finds it before the shark does
  const cx = x + img.width / 2, cy = y + img.height / 2, gl = 0.5 + 0.5 * Math.sin(t * 2.4 + i);
  g.globalAlpha = 0.12 + 0.08 * gl; g.fillStyle = '#fffbe8'; const r = Math.max(img.width, img.height) * 0.75;
  for (let d = -r; d <= r; d += 2) { const hw = Math.sqrt(r * r - d * d); g.fillRect(Math.round(cx - hw), Math.round(cy + d), Math.round(hw * 2), 2); }
  g.globalAlpha = 1; g.drawImage(img, x, y);
  if (s.ph === 0 || (s.k > 0.05 && s.k < 0.95)) for (let k = 0; k < 4; k++) { const a = t * 1.3 + k * 1.57 + i, rr = r + 2 + (s.k > 0.05 && s.k < 0.95 ? 6 * Math.sin(s.k * 3.14) : 0); g.globalAlpha = (k % 2 ? 0.5 : 0.9) * (0.4 + 0.6 * gl); const sx = Math.round(cx + Math.cos(a) * rr), sy = Math.round(cy + Math.sin(a) * rr * 0.7); R(g, sx, sy - 1, 1, 3, '#fffbe8'); R(g, sx - 1, sy, 3, 1, '#fffbe8'); }
  g.globalAlpha = 1;
}

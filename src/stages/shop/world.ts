// Stage 2 pixel art: a warm little shop, pre-rendered once into a world-sized background canvas (it is small: 1120×192
// logical px), plus a few animated bits drawn per frame (lamp glow, dust motes in the light, back-door flicker, loading lines).
// Art rules (GIFT_PLAN §4.1/§7.1): integer coords only, light from the top-left, terrain without outlines, ≤ ~24 colours.
import { raster } from '../../shared/pixel/sprite';
import { EXHIBITS } from './exhibits';

export const WORLD_W = 1120, WORLD_H = 192, FLOOR_Y = 160;
export const ENTRY = { x: 12, y: 104, w: 32, h: 56 };
export const BACKDOOR = { x: 1048, y: 104, w: 32, h: 56 };
export const FRIDGE = { x: 604, y: 74, w: 64, h: 86 };
export const LAMPS = [272, 432, 832];

type G = CanvasRenderingContext2D;
const R = (g: G, x: number, y: number, w: number, h: number, c: string) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
// 4×4 Bayer matrix for ordered dithering (the "pixel" way to do soft light)
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => (v + 0.5) / 16);
const bayer = (x: number, y: number) => BAYER[(y & 3) * 4 + (x & 3)];
const hash = (x: number, y: number) => { let h = (x * 374761393 + y * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };

// 3×5 pixel font (digits + a few capitals)
const FONT: Record<string, string> = {
  '0': '111101101101111', '1': '010110010010111', '2': '111001111100111', '3': '111001111001111', '4': '101101111001001',
  '5': '111100111001111', '6': '111100111101111', '7': '111001010010010', '8': '111101111101111', '9': '111101111001111',
  O: '111101101101111', P: '111101111100100', E: '111100110100111', N: '101111111111101', '.': '000000000000010',
};
export function text(g: G, s: string, x: number, y: number, c: string) {
  g.fillStyle = c;
  for (const ch of s) { const f = FONT[ch]; if (f) for (let i = 0; i < 15; i++) if (f[i] === '1') g.fillRect(x + (i % 3), y + Math.floor(i / 3), 1, 1); x += 4; }
}

const PLANT = raster([
  '......gg..........',
  '.....gGGg...gg....',
  '....gGGGGg.gGGg...',
  '....gGdGGg.gGGGg..',
  '.....gGdGgdgGdGg..',
  '.gg...gGd.dgGdg...',
  'gGGgg..gd.dgdg....',
  'gGGGGg..d.d.g..gg.',
  '.gGdGGg.dd.d..gGGg',
  '..ggdGGddd..dgGGGg',
  '....ggdd.d.dgGdGg.',
  '......d..ddgGdGg..',
  '..gg..d..d.gggg...',
  '.gGGg.d..d........',
  '.gGdGgd..d........',
  '..ggGdd.d.........',
  '.....dd.d.........',
  '......ddd.........',
  '....rrrrrrrrr.....',
  '....RpppppppPR....',
  '.....pppppppP.....',
  '.....pppppppP.....',
  '......pppppP......',
  '......pppppP......',
], { g: '#9ED4A8', G: '#76B888', d: '#4F8C63', r: '#F7D7BF', R: '#E7B898', p: '#F2C6A6', P: '#D9A585' });
const CAT_FACE = raster([
  '.k........k.',
  'kpk......kpk',
  'kwwkkkkkkwwk',
  'kwwkwwwwkwwk',
  'kwkwkwwkwkwk',
  'kbwwwwwwwwbk',
  'kwwwwkkwwwwk',
  'kwwwkwwkwwwk',
  '.kwwwwwwwwk.',
  '..kkkkkkkk..',
], { k: '#2E2A2B', w: '#FFF4E4', p: '#F4A7B9', b: '#F7B6C2' });
const PIG_FACE = raster([
  '.kk......kk.',
  'kssk....kssk',
  'kpppkkkkpppk',
  'kppppppppppk',
  'kppkppppkppk',
  'kbpkkkkkkpbk',
  'kppkSkkSkppk',
  'kppkkkkkkppk',
  '.kppppppppk.',
  '..kkkkkkkk..',
], { k: '#2E2A2B', p: '#F9C6CF', s: '#EE8FA6', S: '#EE8FA6', b: '#F5A3B4' });
const REGISTER = raster([
  '....kkkkkkk.......',
  '....kgggggk.......',
  '....kgkgkgk.......',
  '....kkkkkkk.......',
  '..kkkkkkkkkkkkkk..',
  '..kppppppppppppk..',
  '..kpckckckckckpk..',
  '..kppppppppppppk..',
  '..kpckckckckckpk..',
  '..kppppppppppppk..',
  '.kkkkkkkkkkkkkkkk.',
  '.kPPPPPPPPPPPPPPk.',
  '.kPPPPPyyyPPPPPPk.',
  '.kkkkkkkkkkkkkkkk.',
], { k: '#2E2A2B', g: '#CFEBDD', p: '#F9C6CF', c: '#FFF4E4', P: '#EE8FA6', y: '#FFD45C' });
const HEART = raster(['.rr.rr.', 'rhrrrrr', 'rrrrrrr', '.rrrrr.', '..rrr..', '...r...'], { r: '#EE8FA6', h: '#FFE3EA' });
const BELL = raster(['..k..', '.yyy.', '.yYy.', 'yyyyy', '..k..'], { k: '#8A6A3A', y: '#FFD45C', Y: '#FFF1B8' });
const JAR = (c: string, d: string) => raster(['.kkkk.', 'k....k', 'kcccck', 'kcCcck', 'kcccck', 'kcccdk', '.kkkk.'], { k: '#B9A58C', c, C: '#FFFFFF', d });
const FLOWER = raster(['.r.r.', 'rrRrr', '.rrr.', '..g..', '.gg..', '..g..', '.vvv.', '.vVv.', '.vvv.'], { r: '#F08AA4', R: '#FFD45C', g: '#76B888', v: '#9CC8EE', V: '#D6ECFF' });

function plinth(g: G, cx: number, no: string) {
  const top = 124, x = cx - 20;
  R(g, cx - 26, 159, 52, 2, 'rgba(120,80,50,0.18)');                       // floor contact shadow
  R(g, x - 2, top, 44, 1, '#FFFFFF'); R(g, x - 2, top + 1, 44, 4, '#FBF7F1'); R(g, x - 2, top + 5, 44, 1, '#E4D8C6');
  R(g, x, top + 6, 40, 1, '#DCCFBC');                                       // under-slab shadow
  R(g, x, top + 7, 40, 26, '#F8F3EB'); R(g, x, top + 7, 1, 26, '#FFFFFF'); R(g, x + 36, top + 7, 4, 26, '#EAE0D1'); R(g, x + 39, top + 7, 1, 26, '#E0D4C2');
  R(g, x - 2, top + 32, 44, 4, '#EDE4D6'); R(g, x - 2, top + 32, 44, 1, '#FFFFFF'); R(g, x + 38, top + 32, 4, 4, '#E0D4C2');
  // brass plate "01"
  const px = cx - 9, py = top + 14;
  R(g, px, py, 18, 9, '#B48A45'); R(g, px + 1, py + 1, 16, 7, '#E2BE73'); R(g, px + 1, py + 1, 16, 1, '#F3DDA6');
  text(g, no, px + 6, py + 2, '#6E5323');
}
function lamp(g: G, cx: number, top = 9) {
  R(g, cx, top, 1, 26, '#7A6A62'); R(g, cx - 1, top + 26, 3, 2, '#7A6A62');
  const rows = [6, 10, 14, 16, 18, 18, 18];
  rows.forEach((w, i) => { const x = cx - Math.floor(w / 2) + 0, y = top + 28 + i; R(g, x, y, w, 1, '#EE8FA6'); R(g, x, y, Math.max(2, Math.floor(w / 4)), 1, '#F6B5C4'); R(g, x + w - 2, y, 2, 1, '#D8738D'); });
  R(g, cx - 9, top + 35, 18, 1, '#D8738D');
  R(g, cx - 2, top + 36, 5, 2, '#FFF6D8');
}
function frame(g: G, x: number, y: number, face: HTMLCanvasElement, bg: string) {
  R(g, x + 1, y + 1, 20, 22, 'rgba(120,90,60,0.16)');
  R(g, x, y, 20, 22, '#D9B26A'); R(g, x, y, 20, 1, '#F3DDA6'); R(g, x, y, 1, 22, '#EED29A'); R(g, x + 19, y, 1, 22, '#B48A45'); R(g, x, y + 21, 20, 1, '#B48A45');
  R(g, x + 2, y + 2, 16, 18, '#FFFDF8'); R(g, x + 3, y + 3, 14, 16, bg);
  g.drawImage(face, x + 4, y + 6);
}

export function buildShop() {
  const c = document.createElement('canvas'); c.width = WORLD_W; c.height = WORLD_H;
  const g = c.getContext('2d')!; g.imageSmoothingEnabled = false;
  // ceiling + crown moulding
  R(g, 0, 0, WORLD_W, 6, '#EADCC6'); R(g, 0, 6, WORLD_W, 1, '#FFFAF2'); R(g, 0, 7, WORLD_W, 1, '#E8D8C0'); R(g, 0, 8, WORLD_W, 1, '#D9C6AA');
  // wallpaper: cream with fine stripes + tiny diamonds
  R(g, 0, 9, WORLD_W, 98, '#F6EFE4');
  for (let x = 0; x < WORLD_W; x += 16) { R(g, x, 9, 1, 98, '#F1E7D7'); }
  for (let y = 17; y < 104; y += 16) for (let x = 8; x < WORLD_W; x += 16) { R(g, x, y, 1, 1, '#ECDFCB'); R(g, x - 1, y + 1, 3, 1, '#F1E6D4'); R(g, x, y + 2, 1, 1, '#ECDFCB'); }
  R(g, 0, 9, WORLD_W, 2, '#EFE4D3');                                        // shadow under the moulding
  // chair rail + wainscot panels + baseboard
  R(g, 0, 106, WORLD_W, 1, '#FFFDF8'); R(g, 0, 107, WORLD_W, 3, '#EADBC5'); R(g, 0, 110, WORLD_W, 1, '#D9C7AD');
  R(g, 0, 111, WORLD_W, 41, '#F1E6D5');
  for (let x = 4; x < WORLD_W; x += 48) {
    R(g, x, 116, 40, 31, '#EEE2CF'); R(g, x, 116, 40, 1, '#E0D0B8'); R(g, x, 116, 1, 31, '#E0D0B8'); R(g, x, 146, 40, 1, '#FBF5EA'); R(g, x + 39, 116, 1, 31, '#FBF5EA');
  }
  R(g, 0, 152, WORLD_W, 1, '#FBF5EA'); R(g, 0, 153, WORLD_W, 6, '#E7D8C2'); R(g, 0, 159, WORLD_W, 1, '#CDB89C');
  // wooden floor (staggered planks, a little grain, darker towards the front)
  for (let row = 0; row < 6; row++) {
    const y = 160 + row * 6, base = row % 2 ? '#DDBB8E' : '#E4C499';
    R(g, 0, y, WORLD_W, 6, base); R(g, 0, y + 5, WORLD_W, 1, '#CFA878');
    for (let x = (row * 23) % 58; x < WORLD_W; x += 58) R(g, x, y, 1, 5, '#C99E6E');
    for (let x = 0; x < WORLD_W; x++) { const h = hash(x, y); if (h < 0.05) R(g, x, y + 1 + Math.floor(hash(y, x) * 4), 2, 1, row % 2 ? '#D4B07F' : '#EACDA6'); }
  }
  R(g, 0, 160, WORLD_W, 1, '#C9A473');
  // pink runner rug under the displays
  const rx0 = 196, rx1 = 708;
  R(g, rx0, 167, rx1 - rx0, 18, '#F4C7CE'); R(g, rx0, 167, rx1 - rx0, 1, '#E79AAE'); R(g, rx0, 184, rx1 - rx0, 1, '#E79AAE'); R(g, rx0, 169, rx1 - rx0, 1, '#F9DDE2'); R(g, rx0, 182, rx1 - rx0, 1, '#ECADBB');
  for (let x = rx0 + 6; x < rx1 - 4; x += 10) { R(g, x, 175, 1, 1, '#FBE3E8'); R(g, x - 1, 176, 3, 1, '#F9D6DD'); R(g, x, 177, 1, 1, '#FBE3E8'); }
  for (let y = 168; y < 184; y += 2) { R(g, rx0 - 2, y, 2, 1, '#FFF4E4'); R(g, rx1, y, 2, 1, '#FFF4E4'); }

  // entry door (left) with a glimpse of the bright meadow, OPEN sign, bell
  const E = ENTRY;
  R(g, E.x - 3, E.y - 3, E.w + 6, E.h + 3, '#E2D2BA'); R(g, E.x - 3, E.y - 3, E.w + 6, 1, '#FFFAF2');
  R(g, E.x, E.y, E.w, E.h, '#E6C79F'); R(g, E.x + E.w - 3, E.y, 3, E.h, '#D2AE80'); R(g, E.x, E.y, 1, E.h, '#F0D6B0');
  R(g, E.x + 5, E.y + 5, 22, 20, '#C99E6E'); R(g, E.x + 6, E.y + 6, 20, 18, '#9ADCFF'); R(g, E.x + 6, E.y + 6, 20, 6, '#5EC4FF');
  R(g, E.x + 6, E.y + 19, 20, 5, '#4CC25A'); R(g, E.x + 6, E.y + 18, 9, 1, '#4CC25A'); R(g, E.x + 18, E.y + 9, 6, 2, '#FFFFFF'); R(g, E.x + 16, E.y + 10, 2, 1, '#FFFFFF');
  R(g, E.x + 7, E.y + 7, 1, 6, '#FFFFFF'); R(g, E.x + 16, E.y + 6, 1, 18, '#C99E6E');
  R(g, E.x + 5, E.y + 30, 22, 20, '#DDBB8E'); R(g, E.x + 5, E.y + 30, 22, 1, '#CFA878'); R(g, E.x + 5, E.y + 30, 1, 20, '#CFA878');
  R(g, E.x + 26, E.y + 30, 2, 2, '#D9B26A');
  R(g, E.x + 16 - 6, E.y + 26, 1, 3, '#8A6A3A'); R(g, E.x + 16 + 5, E.y + 26, 1, 3, '#8A6A3A');
  R(g, E.x + 6, E.y + 28, 20, 9, '#EE8FA6'); R(g, E.x + 7, E.y + 29, 18, 7, '#FFF4E4'); text(g, 'OPEN', E.x + 9, E.y + 30, '#E07C96');
  g.drawImage(BELL, E.x + E.w + 3, E.y - 1); R(g, E.x + E.w + 5, E.y - 4, 1, 3, '#8A6A3A');
  R(g, E.x - 2, 161, E.w + 4, 3, '#C7868F'); R(g, E.x - 2, 161, E.w + 4, 1, '#D99AA4');

  // hanging sign: ♥ 200
  R(g, 96, 9, 1, 22, '#B9A58C'); R(g, 136, 9, 1, 22, '#B9A58C');
  R(g, 90, 31, 52, 18, '#C99E6E'); R(g, 91, 32, 50, 16, '#E6C79F'); R(g, 91, 32, 50, 1, '#F0D6B0'); R(g, 91, 47, 50, 1, '#CFA878');
  g.drawImage(HEART, 101, 37); text(g, '200', 113, 38, '#8A5A3A');
  // tall plant by the entrance
  g.drawImage(PLANT, 146, 136);
  R(g, 148, 159, 18, 2, 'rgba(120,80,50,0.16)');

  // lamps + displays
  for (const ex of EXHIBITS) if (ex.kind === 'figure') plinth(g, ex.x, ex.no);
  // portraits between the displays (the couple)
  frame(g, 330, 40, CAT_FACE, '#E6F2FB'); frame(g, 354, 40, PIG_FACE, '#FDECEF');
  R(g, 348, 30, 1, 10, '#C9B79E'); R(g, 341, 30, 15, 1, '#C9B79E');
  // little side table with flowers
  R(g, 512, 134, 28, 3, '#C99E6E'); R(g, 512, 134, 28, 1, '#DDB383'); R(g, 516, 137, 2, 23, '#B98A5C'); R(g, 534, 137, 2, 23, '#B98A5C'); R(g, 513, 158, 26, 2, 'rgba(120,80,50,0.15)');
  g.drawImage(FLOWER, 523, 125);

  // the fridge (retro, pastel pink, two doors) - magnets are 3D, anchored on the big door
  const F = FRIDGE;
  R(g, F.x - 3, 158, F.w + 6, 3, 'rgba(110,60,70,0.18)');
  const fx = F.x, fy = F.y, fw = F.w;
  R(g, fx + 2, fy, fw - 4, 1, '#F7C9D0'); R(g, fx + 1, fy + 1, fw - 2, 1, '#F7C9D0'); R(g, fx, fy + 2, fw, 78, '#F7C9D0');
  R(g, fx + 1, fy + 80, fw - 2, 1, '#F7C9D0');
  R(g, fx + 2, fy + 1, 2, 78, '#FCE1E5'); R(g, fx + 2, fy, fw - 6, 1, '#FCE6E9');
  R(g, fx + fw - 4, fy + 2, 3, 78, '#E7AEB9'); R(g, fx + fw - 1, fy + 3, 1, 76, '#D898A6');
  R(g, fx, fy + 26, fw, 1, '#D898A6'); R(g, fx, fy + 27, fw, 1, '#FCE1E5');
  R(g, fx + 7, fy + 9, 2, 12, '#ECECF0'); R(g, fx + 9, fy + 9, 1, 12, '#B8BCC4');
  R(g, fx + 7, fy + 32, 2, 16, '#ECECF0'); R(g, fx + 9, fy + 32, 1, 16, '#B8BCC4');
  R(g, fx + fw / 2 - 5, fy + 4, 10, 2, '#ECECF0'); R(g, fx + fw / 2 - 5, fy + 5, 10, 1, '#C9CCD3');
  R(g, fx + 6, fy + 81, 4, 5, '#8F8487'); R(g, fx + fw - 10, fy + 81, 4, 5, '#8F8487');
  // a taped polaroid on the freezer door
  R(g, fx + 41, fy + 6, 13, 16, 'rgba(120,70,80,0.18)'); R(g, fx + 40, fy + 5, 13, 16, '#FFFFFF'); R(g, fx + 41, fy + 6, 11, 10, '#FBE3E8'); g.drawImage(HEART, fx + 43, fy + 8);
  R(g, fx + 44, fy + 4, 5, 2, 'rgba(255,240,200,0.85)');

  // window at dusk (foreshadowing the night)
  const wx = 712, wy = 30, ww = 44, wh = 56;
  R(g, wx - 3, wy - 3, ww + 6, wh + 6, '#E9DCC8'); R(g, wx - 3, wy - 3, ww + 6, 1, '#FFFAF2');
  const sky = ['#5E5A97', '#6E6AA8', '#8778B0', '#A685B4', '#C691B0', '#E39DA8', '#F2AE9F', '#F6C59A'];
  for (let y = 0; y < wh; y++) for (let x = 0; x < ww; x++) {
    const v = (y / wh) * (sky.length - 1) + (bayer(x, y) - 0.5) * 0.9; g.fillStyle = sky[Math.max(0, Math.min(sky.length - 1, Math.round(v)))]; g.fillRect(wx + x, wy + y, 1, 1);
  }
  R(g, wx + 30, wy + 8, 4, 4, '#FFF4E4'); R(g, wx + 31, wy + 8, 3, 3, '#6E6AA8');                 // crescent
  [[6, 6], [16, 12], [24, 4], [38, 18], [10, 20]].forEach(([x, y]) => R(g, wx + x, wy + y, 1, 1, '#FFF4E4'));
  R(g, wx, wy + wh - 8, ww, 8, '#4D4A78'); R(g, wx + 4, wy + wh - 11, 10, 3, '#4D4A78'); R(g, wx + 28, wy + wh - 12, 12, 4, '#4D4A78');
  R(g, wx + ww / 2 - 1, wy, 2, wh, '#E9DCC8'); R(g, wx, wy + wh / 2 - 1, ww, 2, '#E9DCC8');
  R(g, wx - 5, wy + wh + 3, ww + 10, 3, '#E2D2BA'); R(g, wx - 5, wy + wh + 3, ww + 10, 1, '#FFFAF2');
  R(g, wx - 7, wy - 6, 6, wh + 8, '#F4C7CE'); R(g, wx + ww + 1, wy - 6, 6, wh + 8, '#F4C7CE'); R(g, wx - 3, wy - 6, 1, wh + 8, '#E79AAE'); R(g, wx + ww + 5, wy - 6, 1, wh + 8, '#E79AAE');
  R(g, wx - 9, wy - 8, ww + 18, 2, '#C99E6E');

  // counter with register, bell, flowers; shelf of jars above
  R(g, 790, 64, 84, 3, '#C99E6E'); R(g, 790, 64, 84, 1, '#DDB383'); R(g, 796, 67, 2, 5, '#B98A5C'); R(g, 866, 67, 2, 5, '#B98A5C');
  [['#F9C6CF', '#EE8FA6'], ['#CFEBDD', '#8FCB9B'], ['#FFE7A3', '#FFD45C'], ['#E4DCF5', '#B9A9E0']].forEach(([a, b], i) => g.drawImage(JAR(a, b), 800 + i * 16, 57));
  R(g, 784, 124, 96, 1, '#E8C08E'); R(g, 784, 125, 96, 3, '#C99A6B'); R(g, 786, 128, 92, 1, '#A97E52');
  R(g, 786, 129, 92, 31, '#E6C79F'); for (let x = 794; x < 878; x += 8) R(g, x, 129, 1, 29, '#D6B285');
  R(g, 786, 129, 92, 1, '#F0D6B0'); R(g, 786, 156, 92, 4, '#B98A5C'); R(g, 780, 159, 104, 2, 'rgba(120,80,50,0.16)');
  g.drawImage(REGISTER, 846, 110); g.drawImage(BELL, 800, 119); g.drawImage(FLOWER, 820, 115);

  // the back door: dark, ajar, night outside
  const B = BACKDOOR;
  R(g, B.x - 3, B.y - 3, B.w + 6, B.h + 3, '#6E5E58'); R(g, B.x - 3, B.y - 3, B.w + 6, 1, '#8A7A72');
  R(g, B.x, B.y, B.w, B.h, '#0C0B10');
  R(g, B.x, B.y, B.w - 6, B.h, '#4B4046'); R(g, B.x, B.y, 1, B.h, '#5E5258'); R(g, B.x + 4, B.y + 5, 16, 20, '#433940'); R(g, B.x + 4, B.y + 30, 16, 20, '#433940');
  R(g, B.x + 21, B.y + 30, 2, 2, '#C9A15A');
  R(g, B.x + B.w - 5, B.y + 2, 1, B.h - 2, '#2A3550');                         // cold moonlight in the gap
  R(g, B.x - 2, 161, B.w + 4, 3, '#6E5A58'); R(g, B.x - 2, 161, B.w + 4, 1, '#836C69');

  // soft lamp light: dithered cones on the wall + warm pools (Bayer ordered dither, never blurry)
  const id = g.getImageData(0, 0, WORLD_W, WORLD_H), d = id.data;
  const warm = [255, 236, 200];
  const tint = (x: number, y: number, k: number) => {
    if (k <= 0 || x < 0 || x >= WORLD_W || y < 0 || y >= WORLD_H) return;
    const lv = Math.floor(k * 4 + bayer(x, y)) / 4; if (lv <= 0) return;   // 4 quantised levels
    const i = (y * WORLD_W + x) * 4, a = Math.min(0.5, lv * 0.32);
    d[i] += (warm[0] - d[i]) * a; d[i + 1] += (warm[1] - d[i + 1]) * a; d[i + 2] += (warm[2] - d[i + 2]) * a;
  };
  for (const lx of LAMPS) {
    const y0 = 47, y1 = lx > 800 ? 124 : 124;
    for (let y = y0; y < y1; y++) {
      const f = (y - y0) / (y1 - y0), half = 7 + f * 22;
      for (let x = Math.floor(lx - half - 4); x <= lx + half + 4; x++) {
        const edge = 1 - Math.max(0, (Math.abs(x - lx + 0.5) - half) / 4);
        tint(x, y, Math.min(1, edge) * (0.75 - f * 0.45) * (edge > 0 ? 1 : 0));
      }
    }
    for (let y = 161; y < 190; y++) for (let x = lx - 44; x < lx + 44; x++) {
      const e = 1 - Math.hypot((x - lx) / 44, (y - 170) / 14); tint(x, y, e * 0.6);
    }
  }
  g.putImageData(id, 0, 0);
  for (const lx of LAMPS) lamp(g, lx);
  // dim the floor towards the viewer a touch
  for (let y = 180; y < 192; y++) { g.fillStyle = `rgba(90,55,30,${((y - 180) / 12) * 0.12})`; g.fillRect(0, y, WORLD_W, 1); }
  return c;
}

/** per-frame overlays in world space (ox, oy = -camera) */
export function drawDynamic(g: G, ox: number, oy: number, t: number, o: { flicker: number; loading: { x: number; y: number; w: number; p: number }[] }) {
  // bulbs breathe a little
  for (const lx of LAMPS) {
    const k = 0.5 + 0.5 * Math.sin(t * 1.3 + lx);
    g.fillStyle = `rgba(255,246,216,${0.35 + 0.35 * k})`; g.fillRect(lx - 3 + ox, 46 + oy, 7, 1);
    // dust motes drifting in the light
    for (let i = 0; i < 5; i++) {
      const s = hash(lx, i), ph = (t * (0.05 + s * 0.05) + s) % 1;
      const y = 52 + ph * 66, x = lx + Math.sin(t * (0.6 + s) + i * 2) * (5 + ph * 14);
      if (ph > 0.05 && ph < 0.95) { g.fillStyle = `rgba(255,252,240,${0.75 * Math.sin(ph * Math.PI)})`; g.fillRect(Math.round(x + ox), Math.round(y + oy), 1, 1); }
    }
  }
  // back door: a cold flicker in the gap
  const B = BACKDOOR, fl = Math.sin(t * 13) > 0.6 || Math.sin(t * 2.1) > 0.97;
  g.fillStyle = fl ? '#3B4C78' : '#27324B'; g.fillRect(B.x + B.w - 5 + ox, B.y + 2 + oy, 1, B.h - 2);
  // loading hairlines (exhibit not ready yet)
  for (const l of o.loading) { g.fillStyle = '#E3D6C3'; g.fillRect(Math.round(l.x - l.w / 2 + ox), l.y + oy, l.w, 1); g.fillStyle = '#EE8FA6'; g.fillRect(Math.round(l.x - l.w / 2 + ox), l.y + oy, Math.max(1, Math.round(l.w * l.p)), 1); }
  // lights flicker twice when you near the back door
  if (o.flicker > 0) { g.fillStyle = `rgba(14,10,18,${o.flicker})`; g.fillRect(0, 0, g.canvas.width, g.canvas.height); }
}

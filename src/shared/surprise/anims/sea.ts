// 海里 · a school of little pixel fish swirls through the water in a wave, bubbles stream up, and a big soft whale glides
// past underneath with its mouth full of bubbles; the fish scatter. A pink seashell sinks to the sand.
// (The hammerhead is the stage's own swimmer, so the big passer-by here is a gentle pixel whale.)
import { el, play, pxSvg, rnd, sendSpark, wait, type Ctx } from '../fx';
import * as Sfx from '../../sfx';

const FISH = ['..kkkk..k', '.kbbbbkkk', 'kbebbbbbk', 'kbbbbbbk.', '.kbbbbkkk', '..kkkk..k'];
const fish = (b: string, s: number) => pxSvg(FISH, { k: '#1c3440', b, e: '#1c3440' }, '', `width="${9 * s}" height="${6 * s}"`);
const COLS = ['#FFB56B', '#FFD45C', '#9CE3E6', '#F9C6CF', '#FF8F7A'];
const WHALE = [
  '..........kkkkkkkk..........',
  '.......kkkbbbbbbbbkkk.......',
  '.....kkbbbbbbbbbbbbbbkk.....',
  '...kkbbbbbbbbbbbbbbbbbbk..kk',
  '..kbbekbbbbbbbbbbbbbbbbbkkbk',
  '.kbbbkkbbbbbbbbbbbbbbbbbbbbk',
  'kbpbbbbbbbbbbbbbbbbbbbbbbbk.',
  'kwwwwwbbbbbbbbbbbbbbbbbbbk..',
  'kwlwlwwwwbbbbbbbbbbbbbbbk...',
  '.kwwwwwwwwwwwbbbbbbbbbkk....',
  '..kkwwwwwwwwwwwwbbbkkk......',
  '....kkkkwwwwwkkkkk..........',
  '........kkkkk...............',
];
const whale = (s: number) => pxSvg(WHALE, { k: '#1c3440', b: '#6C9BD2', w: '#DCEBF7', l: '#A9C7E6', e: '#1c3440', p: '#F7A3B6' }, '', `width="${28 * s}" height="${13 * s}"`);

export default async function sea(c: Ctx) {
  const { layer, w, h } = c;
  // bubbles
  const bub: Promise<void>[] = [];
  for (let i = 0; i < 26; i++) {
    const s = rnd(5, 14), x = rnd(0, w), d = rnd(2200, 3600);
    const b = el('div', '', layer, `left:${x}px;top:${h + 10}px;width:${s}px;height:${s}px;border-radius:50%;border:1.5px solid rgba(220,250,255,.75);background:radial-gradient(circle at 30% 30%, rgba(255,255,255,.6) 0 18%, rgba(160,230,255,.08) 40%)`);
    bub.push(play(b, [{ transform: 'translate(0,0)', opacity: 0 }, { opacity: 1, offset: 0.1 }, { transform: `translate(${rnd(-14, 14)}px,${-h * 0.5}px)`, offset: 0.5 }, { transform: `translate(${rnd(-14, 14)}px,${-h - 30}px)`, opacity: 0.2 }], { duration: d, delay: rnd(0, 1600), easing: 'cubic-bezier(.3,0,.7,1)' }));
  }
  if (c.reduced) { await sendSpark(c, { x: w / 2, y: h / 2 }, '#FFD3DE'); return; }
  // the school
  const ps = Math.max(3, Math.round(w / 130)); const yc = h * 0.4; const amp = Math.min(70, h * 0.08);
  const school: Promise<void>[] = [];
  for (let i = 0; i < 18; i++) {
    const row = i % 4, col = Math.floor(i / 4);
    const outer = el('div', '', layer, `left:0;top:0`);
    const inner = el('div', '', outer, '', fish(COLS[i % COLS.length], ps));
    const dy = (row - 1.5) * 14 * ps / 2 + rnd(-6, 6), lag = col * 120 + rnd(0, 80), dur = 3400;
    school.push(play(outer, [{ transform: `translateX(${-60 - col * 10 * ps}px)` }, { transform: `translateX(${w + 40}px)` }], { duration: dur, delay: lag, easing: 'linear' }));
    // wave, then a scatter up/down when the shark passes (~60 %)
    const scatter = (row < 2 ? -1 : 1) * rnd(h * 0.12, h * 0.22);
    play(inner, [
      { transform: `translateY(${yc + dy}px)` }, { transform: `translateY(${yc + dy - amp}px)`, offset: 0.25 }, { transform: `translateY(${yc + dy + amp * 0.6}px)`, offset: 0.5 },
      { transform: `translateY(${yc + dy + scatter}px)`, offset: 0.7 }, { transform: `translateY(${yc + dy + scatter * 1.2}px)` },
    ], { duration: dur, delay: lag, easing: 'ease-in-out' });
  }
  Sfx.tide();
  // the whale, right → left, lower down, rising and falling slowly
  await wait(900);
  const ws = Math.max(4, Math.round(Math.min(w, 700) / 80));
  const ww = 28 * ws;
  const wh = el('div', '', layer, `left:0;top:${h * 0.56}px;filter:drop-shadow(0 6px 10px rgba(0,20,40,.35))`, whale(ws));
  const pass = play(wh, [{ transform: `translate(${w + 20}px,0)` }, { transform: `translate(${w * 0.5}px,${-ws * 3}px)`, offset: 0.4 }, { transform: `translate(${-ww - 20}px,${ws * 2}px)` }], { duration: 4600, easing: 'linear' });
  // bubbles from its blowhole
  for (let i = 0; i < 7; i++) setTimeout(() => {
    const r = wh.getBoundingClientRect(); const b = el('div', '', layer, `left:${r.left + 9 * ws}px;top:${r.top}px;width:${rnd(6, 10)}px;height:${rnd(6, 10)}px;border-radius:50%;border:1.5px solid rgba(230,250,255,.85)`);
    void play(b, [{ transform: 'translate(0,0)', opacity: 1 }, { transform: `translate(${rnd(-10, 10)}px,${-rnd(60, 120)}px)`, opacity: 0 }], { duration: 1200 });
  }, 600 + i * 330);
  await wait(2200);
  await sendSpark(c, { x: w * 0.5, y: h * 0.5 }, '#FFD3DE', 1100);
  await Promise.all([pass, ...school]);
  void bub;
}

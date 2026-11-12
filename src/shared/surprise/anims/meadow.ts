// 草地 · the ? block: it drops in, gets bumped, and a fountain of pixel hearts bursts out while the little cat runs
// along underneath, hopping after them. The last heart is a golden one that hides somewhere in the sky.
import { catSprites } from '../../pixel/cat';
import { arc, el, play, pxSvg, rnd, sendSpark, sprite, wait, type Ctx } from '../fx';
import * as Sfx from '../../sfx';

const Q = ['oooooooooooooooo', 'oyyyyyyyyyyyyyyo', 'oylyyyyyyyyyyldo', 'oyyyykkkkkkyyydo', 'oyyykkyyyykkyydo', 'oyyykkyyyykkyydo', 'oyyyyyyyykkyyydo', 'oyyyyyykkkyyyydo', 'oyyyyyykkyyyyydo', 'oyyyyyyyyyyyyydo', 'oyyyyyykkyyyyydo', 'oyyyyyykkyyyyydo', 'oylyyyyyyyyyyldo', 'oyyyyyyyyyyyyydo', 'oddddddddddddddo', 'oooooooooooooooo'];
const USED = Q.map(r => r.replace(/[ykl]/g, 'u'));
const PAL = { o: '#5a3208', y: '#FFC93C', l: '#FFF2B0', d: '#D88A12', k: '#7A4A12', u: '#B8742E' };
const HEART = ['.kk.kk.', 'krrkrrk', 'krwrrrk', 'krrrrrk', '.krrrk.', '..krk..', '...k...'];
const heart = (c: string, hi: string) => pxSvg(HEART, { k: '#2E2A2B', r: c, w: hi }, '', 'width="26" height="26"');
const COLS: [string, string][] = [['#FF3B5C', '#FF9BB0'], ['#FF6F91', '#FFC2D1'], ['#F9C6CF', '#FFFFFF'], ['#E85A7A', '#F9B8C6']];

export default async function meadow(c: Ctx) {
  const { layer, w, h } = c;
  const S = Math.round(Math.min(72, Math.max(52, w * 0.15)));
  const bx = w / 2 - S / 2, by = Math.round(h * 0.3);
  const block = el('div', '', layer, `left:${bx}px;top:${by}px;width:${S}px;height:${S}px;filter:drop-shadow(0 4px 0 rgba(90,50,8,.35))`, pxSvg(Q, PAL, '', 'width="100%" height="100%"'));
  if (c.reduced) {
    await play(block, [{ opacity: 0 }, { opacity: 1 }], { duration: 300 });
    await sendSpark(c, { x: w / 2, y: by }, '#FFE07A'); return;
  }
  await play(block, [{ transform: `translateY(${-by - S}px)` }, { transform: 'translateY(0)', offset: 0.7 }, { transform: 'translateY(-10px)', offset: 0.85 }, { transform: 'translateY(0)' }], { duration: 650, easing: 'cubic-bezier(.5,0,.6,1)' });
  // the cat runs in from the left along the bottom
  const sp = catSprites(); const cs = Math.max(3, Math.round(w / 130));
  const floor = Math.round(h * 0.8);
  const cat = sprite(layer, sp.walk.frames, cs, 12, `left:0;top:${floor - 16 * cs}px;filter:drop-shadow(0 ${cs}px 0 rgba(0,0,0,.18))`);
  const run = play(cat, [{ transform: `translate(${-20 * cs}px,0)` }, { transform: `translate(${w * 0.3}px,${-12 * cs}px)`, offset: 0.3 }, { transform: `translate(${w * 0.45}px,0)`, offset: 0.45 }, { transform: `translate(${w * 0.7}px,${-14 * cs}px)`, offset: 0.68 }, { transform: `translate(${w * 0.8}px,0)`, offset: 0.8 }, { transform: `translate(${w + 20 * cs}px,0)` }], { duration: 3000, delay: 150, easing: 'linear' });
  // bump: the block jolts and turns into a used block, hearts burst out
  await wait(250);
  Sfx.jump(true);
  void play(block, [{ transform: 'translateY(0)' }, { transform: `translateY(${-S * 0.28}px)` }, { transform: 'translateY(0)' }], { duration: 220, easing: 'ease-out' });
  block.innerHTML = pxSvg(USED, PAL, '', 'width="100%" height="100%"');
  const top = { x: w / 2, y: by };
  const flights: Promise<void>[] = [];
  for (let i = 0; i < 22; i++) {
    const [a, b] = COLS[i % COLS.length];
    const tx = rnd(w * 0.06, w * 0.94), ty = rnd(h * 0.62, h * 0.86);
    flights.push(arc(layer, heart(a, b), { x: top.x - 13, y: top.y - 26 }, { x: tx - 13, y: ty }, rnd(900, 1500), rnd(50, 130), { delay: i * 55, scale: [0.6, rnd(0.9, 1.4)] }));
    if (i % 5 === 0) setTimeout(() => Sfx.tick(), i * 55);
  }
  await Promise.all(flights.slice(0, 12));
  // the golden one
  const g = el('div', '', layer, `left:${top.x - 15}px;top:${top.y - 34}px`, pxSvg(HEART, { k: '#9A6200', r: '#FFD45C', w: '#FFF6C8' }, '', 'width="30" height="30"'));
  await play(g, [{ transform: 'translateY(16px) scale(.3)', opacity: 0 }, { transform: 'translateY(-14px) scale(1.3)', opacity: 1, offset: 0.6 }, { transform: 'translateY(-8px) scale(1)', opacity: 1 }], { duration: 500, easing: 'cubic-bezier(.3,1.4,.5,1)' });
  Sfx.twinkle();
  await Promise.all([run, sendSpark(c, { x: top.x, y: top.y - 20 }, '#FFE07A', 900).then(() => g.remove()), play(g, [{ opacity: 1 }, { opacity: 0 }], { duration: 300, delay: 120 })]);
  await play(block, [{ opacity: 1 }, { opacity: 0, transform: 'translateY(-8px)' }], { duration: 350 });
}

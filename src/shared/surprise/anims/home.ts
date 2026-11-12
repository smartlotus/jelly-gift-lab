// 小家 · the lights come on: a warm glow, two strings of fairy lights sag across the top and light bulb by bulb, little
// hearts drift up like chimney smoke, and the two of them walk across hand in hand. The house key is left somewhere.
import { el, img, loadImg, play, rnd, sendSpark, sprite, wait, type Ctx } from '../fx';
import * as Sfx from '../../sfx';

const HEART = `<svg viewBox="0 0 24 22" width="100%" height="100%" aria-hidden="true"><path d="M12 21C6 17 1 13 1 7.5 1 4 3.6 1.5 6.7 1.5c2.2 0 4 1.2 5.3 3 1.3-1.8 3.1-3 5.3-3C20.4 1.5 23 4 23 7.5 23 13 18 17 12 21z" fill="#F9B8C6"/></svg>`;

export default async function home(c: Ctx) {
  const { layer, w, h } = c;
  const warm = el('div', '', layer, 'inset:0;background:radial-gradient(90% 70% at 50% 40%, rgba(255,200,120,.22), rgba(255,170,90,.08) 60%, rgba(60,30,10,.18))');
  void play(warm, [{ opacity: 0 }, { opacity: 1 }], { duration: 800 });
  if (c.reduced) { await sendSpark(c, { x: w / 2, y: h * 0.5 }, '#FFE2A0'); return; }
  // fairy lights (art/furniture/lights.png, 120×54) tiled across, then lit bulb by bulb
  const lw = Math.round(Math.max(90, Math.min(150, w / 3))); const n = Math.ceil(w / lw) + 1;
  const strings: HTMLElement[] = [];
  for (const [row, dy] of [[0, 0.1], [1, 0.16]] as const) {
    for (let i = 0; i < n; i++) {
      const x = i * lw - (row ? lw / 2 : 0);
      const im = img(layer, c.asset('art/furniture/lights.png'), lw, `left:${x}px;top:${h * dy}px;opacity:0;filter:brightness(.5) saturate(.6)`);
      strings.push(im);
      const d = (row * n + i) * 90;
      void play(im, [{ opacity: 0, filter: 'brightness(.5) saturate(.6)' }, { opacity: 1, filter: 'brightness(.6) saturate(.6)', offset: 0.3 }, { opacity: 1, filter: 'brightness(1.25) saturate(1.1) drop-shadow(0 0 6px rgba(255,210,120,.9))' }], { duration: 700, delay: 200 + d });
      if (i % 2 === 0) setTimeout(() => Sfx.lamp(), 300 + d);
    }
  }
  // the two of them walk across, hand in hand (people/walk0-3, 184×221)
  const frames = await Promise.all([0, 1, 2, 3].map(i => loadImg(c.asset(`art/people/walk${i}.png`))));
  const ph = Math.round(Math.min(h * 0.24, 200)); const scale = ph / 221;
  const pair = el('div', '', layer, `left:0;top:${h * 0.9 - ph}px;filter:drop-shadow(0 6px 8px rgba(40,20,10,.25))`);
  const cv = sprite(pair, frames, scale, 7, 'left:0;top:0;image-rendering:auto');
  void cv;
  const walk = play(pair, [{ transform: `translateX(${-184 * scale}px)` }, { transform: `translateX(${w}px)` }], { duration: 5200, easing: 'linear' });
  // hearts drifting up like smoke
  for (let i = 0; i < 12; i++) {
    const s = rnd(12, 24); const hh = el('div', '', layer, `left:${w * rnd(0.55, 0.85)}px;top:${h * 0.55}px;width:${s}px;height:${s}px;filter:blur(.3px)`, HEART);
    void play(hh, [{ transform: 'translate(0,0) scale(.4)', opacity: 0 }, { opacity: 0.9, offset: 0.2 }, { transform: `translate(${rnd(-40, 40)}px,${-h * rnd(0.3, 0.45)}px) scale(1.2)`, opacity: 0 }], { duration: rnd(2200, 3200), delay: 700 + i * 220, easing: 'ease-out' });
  }
  await wait(2600);
  Sfx.softChime();
  await sendSpark(c, { x: w * 0.5, y: h * 0.7 }, '#FFE2A0', 1000);
  await walk;
  await Promise.all([warm, ...strings].map(e => play(e, [{ opacity: 1 }, { opacity: 0 }], { duration: 600 })));
}

// 一起玩 · high five: the pixel pig and the pixel cat run in from both sides, jump, and meet in the air — a pixel star
// burst, a big heart, little hearts floating up. A small gamepad drops out of the burst and hides in the grass.
import { catSprites } from '../../pixel/cat';
import { pigSprites } from '../../pixel/pig';
import { el, play, pxSvg, rnd, sendSpark, sprite, wait, type Ctx } from '../fx';
import * as Sfx from '../../sfx';

const STAR = pxSvg(['...k...', '...k...', '..kyk..', 'kkyyykk', '..kyk..', '...k...', '...k...'], { k: '#2E2A2B', y: '#FFD45C' }, '', 'width="28" height="28"');
const HEART = (s: number) => pxSvg(['.kk.kk.', 'kppkppk', 'kpwpppk', 'kpppppk', '.kpppk.', '..kpk..', '...k...'], { k: '#2E2A2B', p: '#EE8FA6', w: '#FFFFFF' }, '', `width="${s}" height="${s}"`);

export default async function coop(c: Ctx) {
  const { layer, w, h } = c;
  if (c.reduced) { await sendSpark(c, { x: w / 2, y: h / 2 }, '#FFC7D3'); return; }
  const s = Math.max(3, Math.round(Math.min(w, 700) / 95)); const S = 16 * s;
  const floor = Math.round(h * 0.9);
  const pig = sprite(layer, pigSprites().walk.frames, s, 10, `left:0;top:${floor - S}px`);
  const cat = sprite(layer, catSprites().walk.frames, s, 10, `left:0;top:${floor - S}px`, true);
  const meet = w / 2;
  const inL = play(pig, [{ transform: `translateX(${-S}px)` }, { transform: `translateX(${meet - S - 4}px)` }], { duration: 1100, easing: 'cubic-bezier(.3,.5,.4,1)' });
  const inR = play(cat, [{ transform: `translateX(${w}px)` }, { transform: `translateX(${meet + 4}px)` }], { duration: 1100, easing: 'cubic-bezier(.3,.5,.4,1)' });
  for (let i = 0; i < 5; i++) setTimeout(() => Sfx.step(), i * 200);
  await Promise.all([inL, inR]);
  // jump together
  Sfx.jump(true);
  const up = (e: HTMLElement, x: number, tilt: number) => play(e, [{ transform: `translateX(${x}px) translateY(0)` }, { transform: `translateX(${x}px) translateY(${-S * 0.9}px) rotate(${tilt}deg)`, offset: 0.45 }, { transform: `translateX(${x}px) translateY(${-S * 0.9}px) rotate(${tilt}deg)`, offset: 0.55 }, { transform: `translateX(${x}px) translateY(0)` }], { duration: 900, easing: 'cubic-bezier(.3,.6,.4,1)' });
  const j1 = up(pig, meet - S - 4, 8), j2 = up(cat, meet + 4, -8);
  await wait(420);
  // the high five
  Sfx.coopWin();
  const burstAt = { x: meet, y: floor - S * 1.6 };
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2, r = rnd(60, 110);
    const st = el('div', '', layer, `left:${burstAt.x - 14}px;top:${burstAt.y - 14}px`, STAR);
    void play(st, [{ transform: 'translate(0,0) scale(.4)', opacity: 1 }, { transform: `translate(${Math.cos(a) * r}px,${Math.sin(a) * r}px) scale(1)`, opacity: 1, offset: 0.7 }, { transform: `translate(${Math.cos(a) * r * 1.15}px,${Math.sin(a) * r * 1.15}px) scale(.6)`, opacity: 0 }], { duration: 800, easing: 'cubic-bezier(.2,.7,.3,1)' });
  }
  const big = el('div', '', layer, `left:${burstAt.x - 36}px;top:${burstAt.y - 100}px`, HEART(72));
  void play(big, [{ transform: 'translateY(30px) scale(0)', opacity: 0 }, { transform: 'translateY(0) scale(1.2)', opacity: 1, offset: 0.4 }, { transform: 'translateY(-6px) scale(1)', opacity: 1, offset: 0.8 }, { transform: 'translateY(-30px) scale(1)', opacity: 0 }], { duration: 2000, easing: 'ease-out' });
  for (let i = 0; i < 7; i++) {
    const hh = el('div', '', layer, `left:${burstAt.x + rnd(-80, 80)}px;top:${burstAt.y + rnd(-20, 20)}px`, HEART(rnd(16, 26) | 0));
    void play(hh, [{ transform: 'translateY(0)', opacity: 0 }, { opacity: 1, offset: 0.2 }, { transform: `translate(${rnd(-20, 20)}px,${-rnd(80, 160)}px)`, opacity: 0 }], { duration: rnd(1400, 2000), delay: 200 + i * 90, easing: 'ease-out' });
  }
  await Promise.all([j1, j2]);
  Sfx.land();
  await wait(300);
  await sendSpark(c, burstAt, '#FFC7D3', 1000);
  // they trot off together
  const outA = play(pig, [{ transform: `translateX(${meet - S - 4}px)` }, { transform: `translateX(${w + S}px)` }], { duration: 1500, easing: 'cubic-bezier(.5,0,.8,.6)' });
  cat.style.transform = ''; const cat2 = sprite(layer, catSprites().walk.frames, s, 10, `left:0;top:${floor - S}px`); cat.remove();
  const outB = play(cat2, [{ transform: `translateX(${meet + 4}px)` }, { transform: `translateX(${w + S * 2.2}px)` }], { duration: 1500, easing: 'cubic-bezier(.5,0,.8,.6)' });
  await Promise.all([outA, outB]);
}

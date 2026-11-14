// 花林 · a gust through the wood: 紫精灵 and 戴安娜 petals blow across the screen, the two flowers grow up from the bottom
// edge and open, and a white butterfly with purple-rimmed wings dances through and settles on a flower somewhere.
import { arc, el, img, play, popAt, rnd, wait, type Ctx } from '../fx';
import * as Sfx from '../../sfx';

// rose petal (戴安娜粉玫瑰) / carnation petal (云南紫精灵: white with a purple frilled rim)
const ROSE = (s: number) => `<svg viewBox="0 0 20 24" width="${s}" height="${s * 1.2}" aria-hidden="true"><path d="M10 1C4 6 2 12 4 18c2 4 10 5 12 0 2-6 0-12-6-17z" fill="#F7A3BC" stroke="#E07A9A" stroke-width="1"/><path d="M10 4c-2 4-3 8-2 13" stroke="#FFD0DC" stroke-width="1.2" fill="none"/></svg>`;
const CARN = (s: number) => `<svg viewBox="0 0 24 20" width="${s}" height="${s * 0.84}" aria-hidden="true"><path d="M2 14C3 8 7 3 12 3s9 5 10 11l-2-1-1 2-2-1-1 2-2-1-2 2-2-2-2 1-1-2-2 1-1-2z" fill="#FDF7FF" stroke="#9B5BC9" stroke-width="1.4" stroke-linejoin="round"/><path d="M5 12c2-4 4-6 7-6" stroke="#E7D4F5" stroke-width="1.2" fill="none"/></svg>`;
const BFLY = `<svg class="gs-bfly" viewBox="0 0 44 36" width="34" height="28" aria-hidden="true"><g class="gs-wl"><path d="M21 18C16 6 6 2 3 6s2 12 10 13c-7 2-9 9-5 11s11-3 13-12z" fill="#fbf4ff" stroke="#8b4fc0" stroke-width="2"/></g><g class="gs-wr"><path d="M23 18C28 6 38 2 41 6s-2 12-10 13c7 2 9 9 5 11s-11-3-13-12z" fill="#fbf4ff" stroke="#8b4fc0" stroke-width="2"/></g><path d="M22 11v17" stroke="#3b2a3e" stroke-width="2.4" stroke-linecap="round"/></svg>`;

export default async function flower(c: Ctx) {
  const { layer, w, h } = c;
  if (c.reduced) { await popAt(c, '#E7C8FF'); return; }
  Sfx.whoosh();
  // the gust
  const gust: Promise<void>[] = [];
  for (let i = 0; i < 34; i++) {
    const rose = i % 2 === 0, s = rnd(12, 22), y0 = rnd(h * 0.05, h * 0.85), dur = rnd(2200, 3400);
    const outer = el('div', '', layer, 'left:0;top:0');
    const inner = el('div', '', outer, '', rose ? ROSE(s) : CARN(s));
    gust.push(play(outer, [{ transform: `translate(${-40}px,${y0}px)` }, { transform: `translate(${w + 40}px,${y0 + rnd(-h * 0.2, h * 0.2)}px)` }], { duration: dur, delay: rnd(0, 1200), easing: 'cubic-bezier(.4,.1,.6,.9)' }));
    void play(inner, [0, 1, 2, 3, 4].map(k => ({ transform: `translateY(${Math.sin(k * 1.6 + i) * 18}px) rotate(${k * rnd(60, 120)}deg) rotateX(${k * 70}deg)` })), { duration: dur, delay: 0, easing: 'ease-in-out' });
  }
  // flowers grow from the bottom edge and open
  await wait(500);
  const plants = [
    { src: 'art/flowers/fl04.png', x: 0.12, hgt: 0.34 }, { src: 'art/flowers/fl02.png', x: 0.34, hgt: 0.3 },
    { src: 'art/flowers/fl05.png', x: 0.6, hgt: 0.24 }, { src: 'art/flowers/fl03.png', x: 0.84, hgt: 0.32 },
  ];
  const grown = plants.map((p, i) => {
    const ht = Math.min(h * p.hgt, 300); const wd = ht * 0.55;
    const im = img(layer, c.asset(p.src), wd, `left:${p.x * w - wd / 2}px;top:${h - ht}px;height:${ht}px;width:auto;transform-origin:50% 100%;filter:drop-shadow(0 4px 6px rgba(120,60,90,.25))`);
    void play(im, [{ transform: 'scaleY(0) scaleX(.4)', opacity: 0 }, { transform: 'scaleY(1.06) scaleX(1.02)', opacity: 1, offset: 0.7 }, { transform: 'scale(1)', opacity: 1 }], { duration: 900, delay: i * 180, easing: 'cubic-bezier(.3,1.3,.5,1)' });
    setTimeout(() => Sfx.place(), i * 180 + 300);
    return im;
  });
  await wait(1100);
  // the butterfly loops through and lands
  const from = { x: -30, y: h * 0.3 }, mid = { x: w * 0.55, y: h * 0.18 };
  await arc(layer, BFLY, from, { x: mid.x - 17, y: mid.y }, 1100, 60);
  const dst = c.target ? { x: c.target.x - 17, y: c.target.y - 14 } : { x: w * 0.7, y: h * 0.5 };
  await arc(layer, BFLY, { x: mid.x - 17, y: mid.y }, dst, 1200, 90);
  Sfx.softChime();
  await popAt(c, '#E7C8FF');
  await Promise.all([...grown.map(g => play(g, [{ opacity: 1 }, { opacity: 0, transform: 'scale(.9)' }], { duration: 500 })), ...gust.slice(0, 6)]);
}

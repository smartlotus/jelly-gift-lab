// 蘑菇林 · lanterns: the dusk deepens a little, glowing mushrooms pop up one by one along the bottom like lamps being lit,
// and a swarm of fireflies rises and swirls. One small pink mushroom keeps glowing somewhere among the caps.
import { el, img, play, rnd, sendSpark, wait, type Ctx } from '../fx';
import * as Sfx from '../../sfx';

const SHROOMS = [['ms05', '#c58bff'], ['ms07', '#6fe0d4'], ['ms10', '#ff9ad9'], ['ms11', '#ffd27a'], ['ms08', '#9fd0ff'], ['ms06', '#ff9ad9']] as const;

export default async function mushroom(c: Ctx) {
  const { layer, w, h } = c;
  const dusk = el('div', '', layer, 'inset:0;background:radial-gradient(120% 90% at 50% 100%, rgba(10,14,30,.15), rgba(6,8,20,.5))');
  void play(dusk, [{ opacity: 0 }, { opacity: 1 }], { duration: 700 });
  if (c.reduced) { await sendSpark(c, { x: w / 2, y: h * 0.7 }, '#FFB8E6'); return; }
  // lamps along the bottom
  const n = SHROOMS.length; const caps: HTMLElement[] = [];
  for (let i = 0; i < n; i++) {
    const [id, col] = SHROOMS[i]; const wd = Math.round(Math.min(110, w * 0.2) * rnd(0.75, 1.05)); const x = ((i + 0.5) / n) * w - wd / 2 + rnd(-10, 10);
    const halo = el('div', '', layer, `left:${x - wd * 0.4}px;top:${h - wd * 1.5}px;width:${wd * 1.8}px;height:${wd * 1.8}px;border-radius:50%;background:radial-gradient(closest-side, ${col}66, ${col}22 50%, transparent);opacity:0;mix-blend-mode:screen`);
    const m = img(layer, c.asset(`art/mushrooms/${id}.png`), wd, `left:${x}px;bottom:-4px;transform-origin:50% 100%;filter:drop-shadow(0 0 8px ${col})`);
    caps.push(halo, m);
    void play(m, [{ transform: 'scaleY(0)', opacity: 0 }, { transform: 'scaleY(1.15)', opacity: 1, offset: 0.6 }, { transform: 'scaleY(1)', opacity: 1 }], { duration: 600, delay: 250 + i * 260, easing: 'cubic-bezier(.3,1.4,.5,1)' });
    void play(halo, [{ opacity: 0 }, { opacity: 1, offset: 0.4 }, { opacity: 0.7 }, { opacity: 1 }], { duration: 1600, delay: 450 + i * 260 });
    setTimeout(() => Sfx.lamp(), 300 + i * 260);
  }
  // fireflies
  const flies: Promise<void>[] = [];
  for (let i = 0; i < 34; i++) {
    const x = rnd(0, w), y = h * rnd(0.7, 1.0), s = rnd(3, 6);
    const f = el('div', '', layer, `left:${x}px;top:${y}px;width:${s}px;height:${s}px;border-radius:50%;background:#f6ffb0;box-shadow:0 0 ${s * 2}px ${s}px rgba(220,255,140,.55)`);
    const k = [0, 1, 2, 3].map(j => ({ transform: `translate(${Math.sin(i + j * 1.7) * rnd(20, 60)}px,${-j * h * rnd(0.12, 0.22)}px)`, opacity: j === 0 ? 0 : j % 2 ? 1 : 0.35 }));
    k.push({ transform: `translate(${rnd(-40, 40)}px,${-h * rnd(0.6, 0.8)}px)`, opacity: 0 });
    flies.push(play(f, k, { duration: rnd(2600, 3800), delay: 600 + rnd(0, 1600), easing: 'ease-in-out' }));
  }
  await wait(2400);
  Sfx.twinkle();
  await sendSpark(c, { x: w * 0.5, y: h * 0.8 }, '#FFB8E6', 1000);
  await Promise.all(flies.slice(0, 10));
  await Promise.all([dusk, ...caps].map(e => play(e, [{ opacity: 1 }, { opacity: 0 }], { duration: 600 })));
}

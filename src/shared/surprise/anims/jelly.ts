// 果冻 · jelly rain: soft translucent drops in the specimen colourways fall, land with a squash and wobble, and a big
// jelly heart plops down in the middle and jiggles. A cherry lands on top, bounces off and rolls away to hide.
import { arc, el, play, rnd, wait, popAt, sendSpark, type Ctx } from '../fx';
import * as Sfx from '../../sfx';

const WAYS = [['#ffd1dc', '#f58fa9'], ['#ffe2c6', '#f4a46b'], ['#d9f2e3', '#7fc79c'], ['#e6defa', '#a48ad9'], ['#fff1b8', '#e6be3c']];
const blob = (a: string, b: string, s: number) => `<i style="display:block;width:${s}px;height:${s * 0.82}px;border-radius:50% 50% 44% 44% / 62% 62% 38% 38%;background:radial-gradient(70% 70% at 35% 30%, rgba(255,255,255,.85) 0 8%, ${a}cc 26%, ${b}b3 78%, ${b}e6 100%);box-shadow:inset 0 -${s * 0.08}px ${s * 0.16}px ${b}88, 0 ${s * 0.1}px ${s * 0.2}px rgba(0,0,0,.12)"></i>`;
const HEART = `<svg viewBox="0 0 120 108" width="100%" height="100%" aria-hidden="true"><defs><radialGradient id="gsjh" cx=".38" cy=".32" r=".8"><stop offset="0" stop-color="#fff" stop-opacity=".95"/><stop offset=".12" stop-color="#ffc2d1" stop-opacity=".9"/><stop offset=".7" stop-color="#f58fa9" stop-opacity=".82"/><stop offset="1" stop-color="#d9547a" stop-opacity=".95"/></radialGradient></defs><path d="M60 104C24 80 4 58 4 34 4 16 18 4 34 4c11 0 20 6 26 16 6-10 15-16 26-16 16 0 30 12 30 30 0 24-20 46-56 70z" fill="url(#gsjh)" stroke="rgba(160,40,80,.25)" stroke-width="1.5"/><ellipse cx="34" cy="26" rx="12" ry="7" fill="#fff" opacity=".55" transform="rotate(-24 34 26)"/></svg>`;
const CHERRY = `<svg viewBox="0 0 40 44" width="30" height="33" aria-hidden="true"><defs><radialGradient id="gsjc" cx=".35" cy=".35" r=".75"><stop offset="0" stop-color="#ff8aa6"/><stop offset=".55" stop-color="#e0284f"/><stop offset="1" stop-color="#8f0f2c"/></radialGradient></defs><path d="M21 4c-1 9-4 15-9 21" fill="none" stroke="#5c7a3a" stroke-width="2.2" stroke-linecap="round"/><path d="M21 4c6 1 10 4 12 8-5 1-9-1-12-8z" fill="#7fb24f"/><circle cx="13" cy="31" r="10" fill="url(#gsjc)"/><ellipse cx="9.5" cy="27" rx="3" ry="2" fill="#fff" opacity=".7"/></svg>`;

export default async function jelly(c: Ctx) {
  const { layer, w, h } = c;
  const floor = h * 0.8;
  const H = Math.round(Math.min(190, w * 0.42)), hx = w / 2 - H / 2, hy = Math.round(h * 0.42 - H * 0.45);
  if (c.reduced) { await sendSpark(c, { x: w / 2, y: h / 2 }, '#FF9DB4'); return; }
  // drops
  const drops: Promise<void>[] = [];
  for (let i = 0; i < 14; i++) {
    const [a, b] = WAYS[i % WAYS.length]; const s = Math.round(rnd(30, 64)); const x = rnd(w * 0.04, w * 0.96 - s); const y = floor - s * 0.82 + rnd(-h * 0.14, h * 0.06);
    const d = el('div', '', layer, `left:${x}px;top:${y}px;transform-origin:50% 100%`, blob(a, b, s));
    drops.push(play(d, [
      { transform: `translateY(${-y - s}px) scale(.9,1.12)`, opacity: 1, easing: 'cubic-bezier(.55,0,.9,.5)' },
      { transform: 'translateY(0) scale(1.35,.66)', offset: 0.42, easing: 'cubic-bezier(.3,0,.3,1)' },
      { transform: 'translateY(0) scale(.86,1.16)', offset: 0.56 },
      { transform: 'translateY(0) scale(1.1,.92)', offset: 0.7 },
      { transform: 'translateY(0) scale(.97,1.03)', offset: 0.82 },
      { transform: 'translateY(0) scale(1)', opacity: 1, offset: 0.9 },
      { transform: 'translateY(0) scale(1)', opacity: 0 },
    ], { duration: 2600, delay: i * 110 }));
    setTimeout(() => Sfx.squish(), i * 110 + 1100);
  }
  // the heart
  await wait(500);
  const shadow = el('div', '', layer, `left:${w / 2 - H * 0.36}px;top:${hy + H * 0.92}px;width:${H * 0.72}px;height:${H * 0.1}px;border-radius:50%;background:radial-gradient(closest-side, rgba(40,20,30,.28), transparent)`);
  const heart = el('div', '', layer, `left:${hx}px;top:${hy}px;width:${H}px;height:${H * 0.9}px;transform-origin:50% 100%`, HEART);
  void play(shadow, [{ opacity: 0, transform: 'scale(.3)' }, { opacity: 1, transform: 'scale(1)' }], { duration: 600 });
  await play(heart, [{ transform: `translateY(${-hy - H}px)`, easing: 'cubic-bezier(.55,0,.9,.5)' }, { transform: 'translateY(0) scale(1.28,.72)', offset: 0.35 }, { transform: 'scale(.84,1.18)', offset: 0.5 }, { transform: 'scale(1.12,.9)', offset: 0.64 }, { transform: 'scale(.95,1.06)', offset: 0.78 }, { transform: 'scale(1.02,.98)', offset: 0.9 }, { transform: 'scale(1)' }], { duration: 1500 });
  Sfx.jellyRelease();
  // the cherry: lands on the heart, boings off, rolls to its hiding place
  const top = { x: w / 2 - 15, y: hy - 30 };
  const ch = el('div', '', layer, `left:${top.x}px;top:${top.y}px`, CHERRY);
  await play(ch, [{ transform: `translateY(${-top.y - 40}px)` }, { transform: 'translateY(0)' }], { duration: 520, easing: 'cubic-bezier(.55,0,.9,.5)' });
  Sfx.jellyColour();
  void play(heart, [{ transform: 'scale(1)' }, { transform: 'scale(1.08,.92)' }, { transform: 'scale(.97,1.03)' }, { transform: 'scale(1)' }], { duration: 420 });
  ch.remove();
  const dst = c.target ? { x: c.target.x - 15, y: c.target.y - 16 } : { x: top.x + 80, y: floor - 30 };
  await arc(layer, CHERRY, top, dst, 950, 110, { spin: 540 });
  await popAt(c, '#FF9DB4');
  await Promise.all([...drops, play(heart, [{ opacity: 1 }, { opacity: 0, transform: 'scale(.92)' }], { duration: 450 }), play(shadow, [{ opacity: 1 }, { opacity: 0 }], { duration: 450 })]);
}

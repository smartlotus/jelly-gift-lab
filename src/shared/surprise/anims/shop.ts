// 小店 · opening time: paper bunting unrolls under the ceiling, the shop bell swings and rings, a kraft gift box drops in,
// its lid pops off and the little pig and cat jump out among paper confetti. The bell slips off its string and hides.
import { catSprites } from '../../pixel/cat';
import { pigSprites } from '../../pixel/pig';
import { arc, el, play, popAt, rnd, sendSpark, sprite, wait, type Ctx } from '../fx';
import { blip, soundOn } from '../../audio';
import * as Sfx from '../../sfx';

const FLAGS = ['#F9C6CF', '#FFF4E4', '#9CC8EE', '#FFD45C', '#8FCB9B', '#E4DCF5', '#EE8FA6'];
const BELL = `<svg viewBox="0 0 40 46" width="40" height="46" aria-hidden="true"><path d="M20 0v6" stroke="#6B4A2B" stroke-width="1.5"/><path d="M20 6c-8 0-12 7-12 15v8l-4 6h32l-4-6v-8c0-8-4-15-12-15z" fill="#F2C14E" stroke="#5A3A12" stroke-width="2" stroke-linejoin="round"/><path d="M13 14c1-3 3-5 6-5" stroke="#FFF1B8" stroke-width="2.4" stroke-linecap="round" fill="none"/><circle cx="20" cy="38" r="4" fill="#E85A7A" stroke="#5A3A12" stroke-width="1.6"/></svg>`;
const ring = () => { if (!soundOn()) return; blip(1568, 0.25, 'sine', 0.1); setTimeout(() => blip(2093, 0.4, 'sine', 0.07), 90); };

export default async function shop(c: Ctx) {
  const { layer, w, h } = c;
  const yT = Math.round(h * 0.17);
  // bunting
  const n = Math.max(7, Math.round(w / 48)); let flags = '';
  const sag = (x: number) => yT + Math.sin((x / w) * Math.PI) * 26;
  for (let i = 0; i < n; i++) { const x0 = (i + 0.15) * (w / n), x1 = (i + 0.85) * (w / n), xm = (x0 + x1) / 2; flags += `<path d="M${x0} ${sag(x0)}L${x1} ${sag(x1)}L${xm} ${sag(xm) + 30}z" fill="${FLAGS[i % FLAGS.length]}" stroke="rgba(107,74,43,.45)" stroke-width="1"/>`; }
  let line = `M0 ${yT}`; for (let x = 0; x <= w; x += 12) line += `L${x} ${sag(x)}`;
  const bunt = el('div', '', layer, `left:0;top:0;width:${w}px;height:${yT + 70}px`, `<svg width="${w}" height="${yT + 70}" aria-hidden="true"><path d="${line}" fill="none" stroke="#6B4A2B" stroke-width="1.2"/>${flags}</svg>`);
  if (c.reduced) { await play(bunt, [{ opacity: 0 }, { opacity: 1 }], { duration: 300 }); await sendSpark(c, { x: w / 2, y: yT + 40 }, '#FFE7A0'); return; }
  void play(bunt, [{ clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0 0 0)' }], { duration: 750, easing: 'cubic-bezier(.3,.7,.3,1)' });
  // the bell, hanging under the middle of the bunting
  const bell = el('div', '', layer, `left:${w / 2 - 20}px;top:${sag(w / 2) + 2}px;transform-origin:20px 0`, BELL);
  await play(bell, [{ transform: 'translateY(-60px)', opacity: 0 }, { transform: 'translateY(0)', opacity: 1 }], { duration: 380, easing: 'cubic-bezier(.3,1.4,.5,1)' });
  ring();
  const swing = play(bell, [0, 26, -22, 16, -10, 5, 0].map(d => ({ transform: `rotate(${d}deg)` })), { duration: 1300, easing: 'ease-in-out' });
  // the gift box
  const B = Math.round(Math.min(120, w * 0.3)), bx = w / 2 - B / 2, by = Math.round(h * 0.68);
  const box = el('div', '', layer, `left:${bx}px;top:${by}px;width:${B}px;height:${B * 0.78}px;transform-origin:50% 100%`,
    `<svg viewBox="0 0 100 78" width="100%" height="100%" aria-hidden="true"><rect x="4" y="10" width="92" height="66" rx="3" fill="#D9B98A" stroke="#6B4A2B" stroke-width="2.5"/><rect x="44" y="10" width="12" height="66" fill="#F08AA4"/><path d="M4 30h92" stroke="rgba(107,74,43,.25)" stroke-width="2"/></svg>`);
  const lid = el('div', '', layer, `left:${bx - B * 0.05}px;top:${by - B * 0.12}px;width:${B * 1.1}px;height:${B * 0.3}px;transform-origin:50% 100%`,
    `<svg viewBox="0 0 110 30" width="100%" height="100%" aria-hidden="true"><rect x="3" y="8" width="104" height="20" rx="3" fill="#E6C99C" stroke="#6B4A2B" stroke-width="2.5"/><rect x="49" y="8" width="12" height="20" fill="#F08AA4"/><path d="M55 8c-8-10-20-8-16-1 3 4 12 2 16 1zM55 8c8-10 20-8 16-1-3 4-12 2-16 1z" fill="#F08AA4" stroke="#B8566E" stroke-width="1.5"/></svg>`);
  await Promise.all([box, lid].map(e => play(e, [{ transform: `translateY(${-by - B}px)` }, { transform: 'translateY(0) scale(1.08,.9)', offset: 0.75 }, { transform: 'translateY(0) scale(1)' }], { duration: 600, easing: 'cubic-bezier(.5,0,.7,1)' })));
  Sfx.land();
  await play(box, [{ transform: 'scale(1)' }, { transform: 'scale(1.06,.94)' }, { transform: 'scale(.96,1.05)' }, { transform: 'scale(1)' }], { duration: 360 });
  // pop
  Sfx.split(true);
  void play(lid, [{ transform: 'translate(0,0) rotate(0)' }, { transform: `translate(${w * 0.18}px,${-h * 0.22}px) rotate(38deg)`, offset: 0.5 }, { transform: `translate(${w * 0.32}px,${h * 0.12}px) rotate(80deg)`, opacity: 0 }], { duration: 1100, easing: 'cubic-bezier(.3,.6,.5,1)' });
  for (let i = 0; i < 26; i++) {
    const col = FLAGS[i % FLAGS.length];
    void arc(layer, `<i style="display:block;width:${rnd(6, 10)}px;height:${rnd(4, 7)}px;background:${col};box-shadow:0 0 0 1px rgba(107,74,43,.25)"></i>`, { x: w / 2, y: by }, { x: w / 2 + rnd(-w * 0.45, w * 0.45), y: h * rnd(0.82, 0.98) }, rnd(900, 1500), rnd(120, 260), { spin: rnd(-540, 540), delay: rnd(0, 120) });
  }
  const s = Math.max(4, Math.round(w / 80));
  const pig = sprite(layer, pigSprites().happy.frames, s, 6, `left:${w / 2 - 8 * s - B * 0.18}px;top:${by - 6 * s}px`);
  const cat = sprite(layer, catSprites().happy.frames, s, 6, `left:${w / 2 - 8 * s + B * 0.18}px;top:${by - 6 * s}px`, true);
  const hop = (e: HTMLElement, dx: number) => play(e, [{ transform: 'translate(0,40px) scale(.4)', opacity: 0 }, { transform: `translate(${dx * 0.6}px,${-h * 0.14}px) scale(1)`, opacity: 1, offset: 0.45 }, { transform: `translate(${dx}px,${B * 0.5}px)`, offset: 0.8 }, { transform: `translate(${dx}px,${B * 0.42}px)`, offset: 0.9 }, { transform: `translate(${dx}px,${B * 0.5}px)` }], { duration: 1000, easing: 'cubic-bezier(.3,.6,.5,1)' });
  await Promise.all([hop(pig, -w * 0.22), hop(cat, w * 0.22), swing]);
  Sfx.coopJoin();
  await wait(500);
  // the bell lets go of its string and hides
  const b = bell.getBoundingClientRect();
  bell.style.opacity = '0';
  await arc(layer, BELL, { x: b.left, y: b.top }, c.target ? { x: c.target.x - 20, y: c.target.y - 23 } : { x: b.left, y: b.top - 40 }, 800, 70, { scale: [1, 0.6], spin: 360 });
  await popAt(c, '#FFE7A0');
  await Promise.all([bunt, box, pig, cat].map(e => play(e, [{ opacity: 1 }, { opacity: 0 }], { duration: 400 })));
}

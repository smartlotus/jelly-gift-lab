// 夜路 · the camcorder catches it: tape noise, the torch beam, and the little cat sprinting past with the blocky pig
// monster (glowing eyes, "??") stomping after her — every stomp shakes the picture. It loses her, looks around, and
// stomps off; in the scramble the camera's spare battery rolls away into the dark.
import { catSprites } from '../../pixel/cat';
import { el, play, pxSvg, sendSpark, shake, sprite, wait, type Ctx } from '../fx';
import { noise, blip, soundOn } from '../../audio';

// the boss of the night road, side view facing right, zombie arms forward (see stages/night/pig.ts for the 3D one)
const BODY = [
  '....kk.....kk.......',
  '...kppk...kppk......',
  '..kpppkkkkkpppk.....',
  '..kppppppppppppk....',
  '..kpppppppppppppk...',
  '..kppEEpppppEEppk...',
  '..kppEEpppppEEppkkk.',
  '..kpbbpppppppssssk..',
  '..kpppppppppsnsnsk..',
  '..kpppppppppssssk...',
  '...kpppppppppppk....',
  '....kkkkkkkkkkk.....',
  '.....kppppppkkkkkkkk',
  '.....kppppppppppppph',
  '.....kpppppppkkkkkkk',
  '.....kppppppppk.....',
  '.....kpppppppk......',
  '......kkkkkkkk......',
];
const LEGS = [
  ['......kpk..kpk......', '......kpk..kpk......', '......khk..khk......'],
  ['.....kpk....kpk.....', '....kpk......kpk....', '....khk......khk....'],
];
const PAL = { k: '#1d1416', p: '#E98DA5', b: '#F7A3B6', s: '#F2B3C2', n: '#7a2a3e', E: '#FFF59A', h: '#c97b8f' };
const Qg = ['.###.', '#...#', '....#', '...#.', '..#..', '.....', '..#..'];
const QQ = pxSvg(Qg.map(r => `${r}..${r}`), { '#': '#FFD45C' }, '', 'width="48" height="28" style="filter:drop-shadow(1px 1px 0 #2e2a2b) drop-shadow(-1px -1px 0 #2e2a2b)"');
const BANG = pxSvg(['kk.kk', 'kk.kk', 'kk.kk', '.....', 'kk.kk'], { k: '#FFD45C' }, '', 'width="15" height="15"');
const stomp = () => { if (soundOn()) { noise(0.18, 0.08, { type: 'lowpass', freq: 220, to: 60, q: 0.7 }); blip(70, 0.12, 'triangle', 0.08, -20); } };
const hiss = () => { if (soundOn()) noise(0.5, 0.05, { type: 'bandpass', freq: 3000, to: 1500, q: 0.6 }); };

export default async function night(c: Ctx) {
  const { w, h } = c;
  const layer = el('div', '', c.layer, 'inset:0');
  // tape: scanlines + a tracking band + darkness with a torch beam that follows the chase
  const dark = el('div', '', layer, 'inset:0;background:radial-gradient(circle at var(--bx,30%) 72%, rgba(255,240,200,.10) 0, rgba(0,0,0,.0) 18%, rgba(0,0,0,.62) 42%)');
  const lines = el('div', '', layer, 'inset:0;background:repeating-linear-gradient(0deg, rgba(255,255,255,.05) 0 1px, transparent 1px 3px);mix-blend-mode:screen');
  const band = el('div', '', layer, 'left:0;right:0;top:0;height:18px;background:linear-gradient(transparent, rgba(255,255,255,.18), transparent);filter:blur(1px)');
  hiss();
  await play(layer, [{ opacity: 0, filter: 'contrast(2) brightness(2)' }, { opacity: 1, filter: 'none' }], { duration: 260, easing: 'steps(3,end)' });
  void play(band, [{ transform: 'translateY(-20px)' }, { transform: `translateY(${h + 20}px)` }], { duration: 1800, iterations: 3, easing: 'linear' });
  if (c.reduced) { await sendSpark(c, { x: w / 2, y: h * 0.7 }, '#9CFFAA'); return; }
  const floor = Math.round(h * 0.78);
  // the cat, sprinting left → right with "!!"
  const cs = Math.max(3, Math.round(Math.min(w, h * 1.6) / 110));
  const catWrap = el('div', '', layer, `left:0;top:${floor - 16 * cs}px;width:${16 * cs}px;height:${16 * cs}px`);
  sprite(catWrap, catSprites().walk.frames, cs, 16, 'left:0;top:0');
  el('div', '', catWrap, `position:absolute;left:${10 * cs}px;top:${-6 * cs}px`, BANG);
  const catRun = play(catWrap, [{ transform: `translateX(${-20 * cs}px)` }, { transform: `translateX(${w * 0.45}px)`, offset: 0.4 }, { transform: `translateX(${w * 0.55}px) translateY(${-6 * cs}px)`, offset: 0.48 }, { transform: `translateX(${w * 0.65}px)`, offset: 0.56 }, { transform: `translateX(${w + 20 * cs}px)` }], { duration: 2300, easing: 'linear' });
  // torch follows the cat
  const t0 = performance.now();
  const beam = window.setInterval(() => { const k = Math.min(1, (performance.now() - t0) / 3600); dark.style.setProperty('--bx', `${(10 + k * 80).toFixed(1)}%`); }, 50);
  await wait(650);
  // the monster
  const ps = Math.max(4, Math.round(Math.min(w, 560, h * 1.1) / 46));
  const mw = 20 * ps, mh = 21 * ps;
  const mon = el('div', '', layer, `left:0;top:${floor - mh}px;width:${mw}px;height:${mh}px;filter:drop-shadow(0 0 ${ps * 2}px rgba(0,0,0,.6))`);
  const draw = (f: number) => { mon.innerHTML = pxSvg([...BODY, ...LEGS[f]], PAL, '', `width="${mw}" height="${mh}"`) + `<i style="position:absolute;left:${5 * ps}px;top:${5 * ps}px;width:${8 * ps}px;height:${2 * ps}px;box-shadow:0 0 ${ps * 3}px ${ps}px rgba(255,245,154,.55);border-radius:50%"></i>`; };
  draw(0);
  const qq = el('div', '', mon, `position:absolute;left:${4 * ps}px;top:${-9 * ps}px;opacity:0`, QQ);
  let f = 0;
  const steps = 7, stepMs = 300;
  const startX = -mw, endX = w * 0.52 - mw / 2;
  for (let i = 0; i <= steps; i++) {
    f ^= 1; draw(f); mon.appendChild(qq);
    const x = startX + (endX - startX) * (i / steps);
    mon.style.transform = `translateX(${x}px) translateY(${f ? -ps : 0}px)`;
    if (i % 2 === 0) { stomp(); void shake(lines, ps * 0.6, 140); void shake(dark, ps * 0.6, 140); }
    await wait(stepMs);
  }
  // lost her: looks around, "??"
  draw(0); mon.appendChild(qq);
  void play(qq, [{ opacity: 0, transform: 'translateY(8px) scale(.6)' }, { opacity: 1, transform: 'translateY(0) scale(1.15)', offset: 0.5 }, { opacity: 1, transform: 'translateY(-4px) scale(1)' }], { duration: 400 });
  await play(mon, [{ transform: `translateX(${endX}px) scaleX(1)` }, { transform: `translateX(${endX}px) scaleX(-1)`, offset: 0.3 }, { transform: `translateX(${endX}px) scaleX(-1)`, offset: 0.6 }, { transform: `translateX(${endX}px) scaleX(1)` }], { duration: 1100, easing: 'steps(1,end)' });
  // something drops as it turns to go
  const drop = sendSpark({ ...c, layer: c.layer }, { x: endX + mw * 0.6, y: floor - mh * 0.45 }, '#9CFFAA', 900);
  const off = play(mon, [{ transform: `translateX(${endX}px) scaleX(-1)` }, { transform: `translateX(${-mw * 1.2}px) scaleX(-1)` }], { duration: 1500, easing: 'steps(6,end)' });
  void (async () => { for (let i = 0; i < 3; i++) { stomp(); await wait(500); } })();
  await Promise.all([catRun, drop, off]);
  clearInterval(beam);
  hiss();
  await play(layer, [{ filter: 'none' }, { filter: 'contrast(2) brightness(1.8)' }, { filter: 'none', opacity: 0 }], { duration: 320, easing: 'steps(3,end)' });
}

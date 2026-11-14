// 小家 · the magic moving box (2026-11-14, replaces "the two of them walk across"): a cardboard moving box drops in and
// wobbles, its flaps pop open and a whole little room flies out of it piece by piece — the rug unrolls, the sofa lands
// with a squash, the floor lamp, the side table, a picture frame that lands crooked and rights itself, a cushion that
// bounces onto the sofa. The empty box folds itself flat and scoots off, the lamp clicks on (a warm pool of light), a tiny
// pixel house appears in the frame, and a spark flies to where the house key is hidden. No people.
// Android: transform/opacity only (no animated filter / blur / box-shadow), every piece is a pre-decoded <img>, nothing
// loops, about a dozen elements in total.
import { el, img, loadImg, play, pxSvg, rnd, sendSpark, wait, type Ctx } from '../fx';
import * as Sfx from '../../sfx';

const BOX = pxSvg([
  'kkkkkkkkkkkkkkkkkkkk',
  'kbbbbbbbbttbbbbbbbbk',
  'kbbbbbbbbttbbbbbbbbk',
  'kddddddddttddddddddk',
  'kbbbbbbbbbbbbbbbbbbk',
  'kbbbbbbbbbbbbbbbbbbk',
  'kbbbwwwwbbbbbbbbbbbk',
  'kbbbwkkwbbbbbbbbbbbk',
  'kbbbwwwwbbbbbbbbbbbk',
  'kbbbbbbbbbbbbbbbbbbk',
  'kbbbbbbbbbbbbbbbbbbk',
  'kddddddddddddddddddk',
  'kkkkkkkkkkkkkkkkkkkk',
], { k: '#5A3A22', b: '#D29A5E', d: '#B07842', t: '#EAD6A8', w: '#FFF6E4' }, '', 'width="100%" height="100%"');
const FLAP = pxSvg(['kkkkkkkkkk', 'kbbbbbbbbk', 'kddddddddk', 'kkkkkkkkkk'], { k: '#5A3A22', b: '#DCA86C', d: '#B07842' }, '', 'width="100%" height="100%" preserveAspectRatio="none"');
const HOUSE = pxSvg([
  '.....kk.....',
  '....krrk....',
  '...krrrrk...',
  '..krrrrrrk..',
  '.krrrrrrrrk.',
  'kkkkkkkkkkkk',
  '.kwwwwwwwwk.',
  '.kwyykwddwk.',
  '.kwyykwddwk.',
  '.kwwwwwddwk.',
  '.kkkkkkkkkk.',
], { k: '#2E2A2B', r: '#E07A6A', w: '#FFF3DC', y: '#FFD45C', d: '#9A6A44' }, '', 'width="100%" height="100%"');

type Piece = { src: string; nw: number; nh: number; cx: number; by: number; z: number; spin: number; land?: 'squash' | 'crooked' | 'bounce' };

/** a parabola as sampled keyframes on ONE element (top-left origin), ending scale 1 — WAAPI composites it on the GPU */
function fly(e: HTMLElement, a: { x: number; y: number }, b: { x: number; y: number }, lift: number, spin: number, ms: number, delay: number) {
  const N = 10, kf: Keyframe[] = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N, x = a.x + (b.x - a.x) * t, y = a.y + (b.y - a.y) * t - lift * 4 * t * (1 - t);
    const s = 0.25 + 0.75 * Math.min(1, t * 1.4);
    kf.push({ transform: `translate(${x.toFixed(1)}px,${y.toFixed(1)}px) rotate(${(spin * (1 - t)).toFixed(1)}deg) scale(${s.toFixed(3)})`, opacity: t < 0.08 ? t / 0.08 : 1 });
  }
  return play(e, kf, { duration: ms, delay, easing: 'linear' });
}

export default async function home(c: Ctx) {
  const { layer, w, h } = c;
  const warm = el('div', '', layer, 'inset:0;background:radial-gradient(90% 70% at 50% 62%, rgba(255,214,150,.20), rgba(255,180,110,.06) 60%, rgba(60,30,10,.16))');
  void play(warm, [{ opacity: 0 }, { opacity: 1 }], { duration: 600 });
  if (c.reduced) { await sendSpark(c, { x: w / 2, y: h * 0.6 }, '#FFE2A0'); return; }

  const R = Math.min(w * 0.94, 560, h * 0.95); const k = R / 600;
  const cx = w / 2, fy = Math.round(Math.min(h * 0.8, h - 96));
  const A = (p: string) => c.asset(`art/furniture/${p}`);
  const sofaTop = fy - 14 * k - 178 * k;
  const pieces: Piece[] = [
    { src: 'rug.png', nw: 172, nh: 93, cx, by: fy + 26 * k, z: 1, spin: 0 },
    { src: 'sofa.png', nw: 275, nh: 178, cx, by: fy - 14 * k, z: 2, spin: -10, land: 'squash' },
    { src: 'lamp.png', nw: 73, nh: 194, cx: cx - 196 * k, by: fy - 8 * k, z: 2, spin: 18 },
    { src: 'side.png', nw: 135, nh: 126, cx: cx + 214 * k, by: fy - 4 * k, z: 2, spin: -16 },
    { src: 'frame.png', nw: 118, nh: 106, cx: cx + 4 * k, by: sofaTop - 26 * k, z: 2, spin: 30, land: 'crooked' },
    { src: 'cushion.png', nw: 160, nh: 115, cx: cx - 52 * k, by: fy - 76 * k, z: 3, spin: -40, land: 'bounce' },
  ];
  // decode everything first so nothing pops in mid-flight (all already shipped for the decorating room)
  await Promise.all(pieces.map(p => loadImg(A(p.src)).then(i => (i.decode ? i.decode().catch(() => {}) : undefined))));

  // the box drops in and lands with a squash
  const bw = Math.round(150 * k * 1.1), bh = Math.round(bw * 13 / 20);
  const bx = cx - bw / 2, by = fy + 30 * k - bh;
  const box = el('div', '', layer, `left:0;top:0;width:${bw}px;height:${bh}px;z-index:5;transform-origin:50% 100%`, BOX);
  const fl = [0, 1].map(i => el('div', '', box, `left:${i ? bw / 2 : 0}px;top:${-bh * 0.1}px;width:${bw / 2}px;height:${bh * 0.22}px;transform-origin:${i ? '100%' : '0%'} 100%`, FLAP));
  const shadow = el('div', '', layer, `left:${cx - bw * 0.55}px;top:${fy + 26 * k}px;width:${bw * 1.1}px;height:${Math.max(6, bh * 0.12)}px;border-radius:50%;background:rgba(40,20,10,.22);z-index:4;opacity:0`);
  void play(shadow, [{ opacity: 0, transform: 'scale(.3)' }, { opacity: 1, transform: 'scale(1)' }], { duration: 520, easing: 'ease-in' });
  await play(box, [
    { transform: `translate(${bx}px,${-bh - 20}px)`, easing: 'cubic-bezier(.5,0,.9,.5)' },
    { transform: `translate(${bx}px,${by}px) scale(1.12,.84)`, offset: 0.7 },
    { transform: `translate(${bx}px,${by - 14 * k}px) scale(.96,1.05)`, offset: 0.85 },
    { transform: `translate(${bx}px,${by}px) scale(1,1)` },
  ], { duration: 720 });
  Sfx.land();
  // wobble, wobble… pop
  await play(box, [0, -6, 6, -4, 4, 0].map(r => ({ transform: `translate(${bx}px,${by}px) rotate(${r}deg)` })), { duration: 520, easing: 'ease-in-out' });
  Sfx.jump(true);
  fl.forEach((f, i) => void play(f, [{ transform: 'rotate(0deg)' }, { transform: `rotate(${i ? 128 : -128}deg)` }], { duration: 300, easing: 'cubic-bezier(.3,1.6,.5,1)' }));

  // the room flies out of the box, piece by piece
  const mouth = { x: cx, y: by };
  const els: HTMLElement[] = [];
  const flights = pieces.map((p, i) => {
    const pw = p.nw * k, ph = p.nh * k;
    const e = img(layer, A(p.src), pw, `left:0;top:0;z-index:${p.z};transform-origin:50% 100%;opacity:0`, false);
    els.push(e);
    const a = { x: mouth.x - pw / 2, y: mouth.y - ph * 0.6 }, b = { x: p.cx - pw / 2, y: p.by - ph };
    const d = 120 + i * 230;
    setTimeout(() => Sfx.jump(false), d);
    return fly(e, a, b, Math.max(90, h * 0.16) + rnd(0, 30), p.spin, 640, d).then(async () => {
      const at = `translate(${b.x}px,${b.y}px)`;
      if (p.land === 'squash') { Sfx.land(); await play(e, [{ transform: `${at} scale(1.08,.9)` }, { transform: `${at} scale(.98,1.03)` }, { transform: `${at} scale(1)` }], { duration: 300 }); }
      else if (p.land === 'crooked') {
        Sfx.tick();
        await play(e, [{ transform: `${at} rotate(0deg)` }, { transform: `${at} rotate(-11deg)`, offset: 0.25 }, { transform: `${at} rotate(-11deg)`, offset: 0.7 }, { transform: `${at} rotate(2deg)`, offset: 0.85 }, { transform: `${at} rotate(0deg)` }], { duration: 1300, delay: 120 });
        Sfx.tick();
      } else if (p.land === 'bounce') { await play(e, [{ transform: at }, { transform: `translate(${b.x}px,${b.y - 22 * k}px) rotate(6deg)` }, { transform: at }], { duration: 360, easing: 'ease-in-out' }); }
      else if (i === 0) await play(e, [{ transform: `${at} scale(.2,1)` }, { transform: `${at} scale(1)` }], { duration: 260, easing: 'ease-out' });
    });
  });
  await Promise.all(flights);

  // the empty box folds flat and scoots off to the right
  const out = play(box, [
    { transform: `translate(${bx}px,${by}px) scale(1,1)` },
    { transform: `translate(${bx}px,${by + bh * 0.75}px) scale(1.15,.22)`, offset: 0.35 },
    { transform: `translate(${w + 40}px,${by + bh * 0.75}px) scale(1.15,.22)` },
  ], { duration: 820, easing: 'cubic-bezier(.5,0,.6,1)' });
  void play(shadow, [{ opacity: 1 }, { opacity: 0 }], { duration: 400 });

  // the lamp clicks on: a pre-drawn warm pool, faded in (no filters)
  const lamp = pieces[2];
  await wait(380);
  Sfx.lamp();
  const lr = 300 * k;
  const glow = el('div', '', layer, `left:${lamp.cx - lr}px;top:${lamp.by - 194 * k - lr * 0.55}px;width:${lr * 2}px;height:${lr * 2}px;border-radius:50%;background:radial-gradient(closest-side, rgba(255,226,150,.55), rgba(255,200,120,.22) 45%, rgba(255,190,110,0));z-index:0;opacity:0`);
  void play(glow, [{ opacity: 0 }, { opacity: 1, offset: 0.35 }, { opacity: 0.75, offset: 0.5 }, { opacity: 1 }], { duration: 700, easing: 'steps(6,end)' });
  // a tiny pixel house appears inside the frame
  const fr = pieces[4], fw = 118 * k, fh = 106 * k;
  const pic = el('div', '', layer, `left:${fr.cx - fw * 0.3}px;top:${fr.by - fh * 0.78}px;width:${fw * 0.6}px;height:${fw * 0.55}px;z-index:3;opacity:0`, HOUSE);
  await play(pic, [{ opacity: 0, transform: 'scale(.6)' }, { opacity: 1, transform: 'scale(1)' }], { duration: 420, delay: 200, easing: 'cubic-bezier(.3,1.5,.5,1)' });
  Sfx.softChime();
  await out;
  await wait(700);
  await sendSpark(c, { x: fr.cx, y: fr.by - fh / 2 }, '#FFE2A0', 1000);
  await Promise.all([warm, glow, pic, ...els].map(e => play(e, [{ opacity: Number(getComputedStyle(e).opacity) || 1 }, { opacity: 0 }], { duration: 600 })));
}

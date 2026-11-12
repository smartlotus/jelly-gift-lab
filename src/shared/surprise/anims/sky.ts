// 天空 · meteors cross the Changchun sky, then stars light up one by one and a hairline joins them into a heart, the way
// the chart draws constellations. One star of the heart slips loose and falls somewhere among the others.
import { el, play, rnd, sendSpark, wait, type Ctx } from '../fx';
import * as Sfx from '../../sfx';

export default async function sky(c: Ctx) {
  const { layer, w, h } = c;
  if (c.reduced) { await sendSpark(c, { x: w / 2, y: h * 0.36 }, '#FFE2A0'); return; }
  // meteors
  const met: Promise<void>[] = [];
  for (let i = 0; i < 9; i++) {
    const len = rnd(90, 170), x = rnd(w * 0.2, w * 1.1), y = rnd(-20, h * 0.35), ang = rnd(28, 38);
    const m = el('div', '', layer, `left:${x}px;top:${y}px;width:${len}px;height:1.6px;transform-origin:0 50%;background:linear-gradient(90deg, rgba(255,255,255,.95), rgba(190,210,255,.35) 30%, transparent);border-radius:2px;opacity:0`);
    const dx = -Math.cos(ang * Math.PI / 180) * w * 0.5, dy = Math.sin(ang * Math.PI / 180) * w * 0.5;
    met.push(play(m, [{ transform: `translate(0,0) rotate(${180 - ang}deg)`, opacity: 0 }, { opacity: 1, offset: 0.15 }, { transform: `translate(${dx}px,${dy}px) rotate(${180 - ang}deg)`, opacity: 0 }], { duration: rnd(700, 1100), delay: i * 210 + rnd(0, 120), easing: 'cubic-bezier(.3,.6,.4,1)' }));
  }
  Sfx.twinkle();
  await wait(1000);
  // the heart constellation
  const R = Math.min(w * 0.32, h * 0.22), cx = w / 2, cy = h * 0.36;
  const N = 13; const pts: { x: number; y: number }[] = [];
  for (let i = 0; i < N; i++) { const t = (i / N) * Math.PI * 2; const x = 16 * Math.sin(t) ** 3, y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t); pts.push({ x: cx + (x / 17) * R, y: cy - (y / 17) * R }); }
  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg'); svg.setAttribute('width', String(w)); svg.setAttribute('height', String(h)); svg.style.cssText = 'position:absolute;left:0;top:0;overflow:visible';
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join('') + 'Z';
  const path = document.createElementNS(svgNS, 'path'); path.setAttribute('d', d); path.setAttribute('fill', 'none'); path.setAttribute('stroke', 'rgba(236,232,223,.55)'); path.setAttribute('stroke-width', '1'); path.setAttribute('stroke-dasharray', '3 4');
  svg.appendChild(path); layer.appendChild(svg);
  const lenP = path.getTotalLength?.() || 1000;
  path.style.strokeDasharray = `${lenP}`; path.style.strokeDashoffset = `${lenP}`;
  const stars = pts.map((p, i) => {
    const s = el('div', '', layer, `left:${p.x - 6}px;top:${p.y - 6}px;width:12px;height:12px;border-radius:50%;background:radial-gradient(circle, #fff 0 18%, rgba(255,240,210,.6) 35%, transparent 70%);opacity:0`);
    void play(s, [{ opacity: 0, transform: 'scale(.2)' }, { opacity: 1, transform: 'scale(1.6)', offset: 0.5 }, { opacity: 1, transform: 'scale(1)' }], { duration: 420, delay: i * 110 });
    if (i % 3 === 0) setTimeout(() => Sfx.tick(), i * 110);
    return s;
  });
  await wait(N * 110 + 200);
  await play(path, [{ strokeDashoffset: lenP }, { strokeDashoffset: 0 }], { duration: 1300, easing: 'cubic-bezier(.4,0,.2,1)' });
  path.style.strokeDasharray = '3 4'; path.style.strokeDashoffset = '0';
  const glow = el('div', '', layer, `left:${cx - R * 1.3}px;top:${cy - R * 1.2}px;width:${R * 2.6}px;height:${R * 2.4}px;border-radius:50%;background:radial-gradient(closest-side, rgba(255,214,160,.16), transparent)`);
  Sfx.softChime();
  await play(glow, [{ opacity: 0 }, { opacity: 1 }, { opacity: 0.6 }], { duration: 900 });
  // the bottom star falls loose
  const tip = pts[Math.round(N / 2)];
  stars[Math.round(N / 2)].style.opacity = '0';
  await sendSpark(c, tip, '#FFE2A0', 1100);
  await Promise.all([...met, play(svg, [{ opacity: 1 }, { opacity: 0 }], { duration: 700 }), play(glow, [{ opacity: 0.6 }, { opacity: 0 }], { duration: 700 }), ...stars.map((s, i) => play(s, [{ opacity: 1 }, { opacity: 0 }], { duration: 600, delay: i * 30 }))]);
}

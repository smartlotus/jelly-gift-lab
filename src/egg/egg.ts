// The 200-day easter egg, loaded on demand from the mushroom.
// Sequence: the studio lights dim -> a few slow bursts in a champagne/ivory palette while the jelly hops ->
// an odometer rolls to 200 -> the line rises word by word -> quiet motes drift until it is closed.
// Tap the number (or Replay) to run it again. prefers-reduced-motion gets the card alone, no motion.
import './egg.css';
import { t, lang } from '../i18n/i18n';

type Celebrant = { celebrate?: (times?: number, gap?: number) => void };
const NAME = 'lushiva';
const PALETTE = ['#ecd9ad', '#f6f0e4', '#d4ad6a', '#e6bcb0', '#c3ccd4'];
const SHELLS = [ // t (s), x, y (fraction of viewport), colour, kind
  { t: 0.45, x: 0.50, y: 0.30, c: 0, k: 'peony' }, { t: 1.05, x: 0.24, y: 0.36, c: 3, k: 'ring' },
  { t: 1.45, x: 0.77, y: 0.27, c: 1, k: 'peony' }, { t: 2.15, x: 0.36, y: 0.20, c: 4, k: 'ring' },
  { t: 2.55, x: 0.66, y: 0.40, c: 0, k: 'peony' }, { t: 3.25, x: 0.50, y: 0.18, c: 2, k: 'willow' },
] as const;
type P = { x: number; y: number; vx: number; vy: number; life: number; max: number; c: string; r: number; tw: number; drag: number; g: number; trail: boolean };
type Mote = { x: number; y: number; vy: number; vx: number; r: number; a: number; ph: number };

/** one canvas does both acts: the salvo, then the slow motes (until stopped) */
function sky(cv: HTMLCanvasElement) {
  const ctx = cv.getContext('2d')!;
  const dpr = Math.min(2, devicePixelRatio || 1);
  let W = 0, H = 0;
  const size = () => { W = innerWidth; H = innerHeight; cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); };
  size(); addEventListener('resize', size);
  const parts: P[] = []; const rockets: { x: number; y: number; vx: number; vy: number; ty: number; c: string; k: string }[] = [];
  const motes: Mote[] = [];
  let t0 = performance.now(), last = t0, launched = 0, raf = 0, moteAlpha = 0;
  const scale = () => Math.min(1.2, Math.max(0.7, Math.min(W, H) / 720));
  const burst = (x: number, y: number, c: string, k: string) => {
    const s0 = 4.0 * scale();
    if (k === 'willow') { // long, drooping gold strands for the last shell
      for (let i = 0; i < 70; i++) { const a = (i / 70) * Math.PI * 2; const s = s0 * (0.5 + 0.35 * Math.random());
        parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s * 0.85, life: 0, max: 2.8 + Math.random(), c, r: 1.0, tw: Math.random() * 6, drag: 0.972, g: 0.022, trail: true }); }
    } else {
      const n = k === 'ring' ? 54 : 84; const ring = k === 'ring';
      for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2 + Math.random() * 0.05; const s = s0 * (ring ? 0.92 + 0.08 * Math.random() : 0.5 + 0.5 * Math.sqrt(Math.random()));
        parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0, max: 1.5 + Math.random() * 0.8, c: Math.random() < 0.86 ? c : '#fffaf0', r: ring ? 1.3 : 1.1 + Math.random() * 0.7, tw: Math.random() * 6, drag: 0.958, g: 0.04, trail: true }); }
    }
    for (let i = 0; i < 14; i++) { const a = Math.random() * Math.PI * 2; const s = Math.random() * 1.2; // glitter that lingers
      parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0, max: 2.2 + Math.random(), c: '#fffaf0', r: 0.8, tw: Math.random() * 6, drag: 0.95, g: 0.012, trail: false }); }
  };
  const spawnMote = (anyY: boolean): Mote => ({ x: Math.random() * W, y: anyY ? Math.random() * H : H + 10, vy: -(0.12 + Math.random() * 0.28), vx: (Math.random() - 0.5) * 0.08, r: 0.6 + Math.random() * 1.3, a: 0.25 + Math.random() * 0.5, ph: Math.random() * 6.3 });
  const frame = (now: number) => {
    const tt = (now - t0) / 1000; const dt = Math.min(0.033, (now - last) / 1000); last = now; const k = dt * 60;
    while (launched < SHELLS.length && tt >= SHELLS[launched].t) {
      const s = SHELLS[launched++]; const c = PALETTE[s.c];
      rockets.push({ x: s.x * W + (Math.random() - 0.5) * 20, y: H + 10, vx: (Math.random() - 0.5) * 0.5, vy: -(H - s.y * H) / 32, ty: s.y * H, c, k: s.k });
    }
    ctx.globalCompositeOperation = 'destination-out'; ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'lighter';
    for (let i = rockets.length - 1; i >= 0; i--) {
      const r = rockets[i]; const ox = r.x, oy = r.y; r.x += r.vx * k; r.y += r.vy * k; r.vy *= Math.pow(0.984, k);
      ctx.globalAlpha = 0.8; ctx.strokeStyle = r.c; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(ox, oy + 6); ctx.lineTo(r.x, r.y); ctx.stroke();
      if (r.y <= r.ty || r.vy > -1.4) { burst(r.x, r.y, r.c, r.k); rockets.splice(i, 1); }
    }
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i]; p.life += dt; if (p.life > p.max) { parts.splice(i, 1); continue; }
      const ox = p.x, oy = p.y; const d = Math.pow(p.drag, k);
      p.vx *= d; p.vy = p.vy * d + p.g * k; p.x += p.vx * k; p.y += p.vy * k;
      const f = 1 - p.life / p.max; const tw = 0.7 + 0.3 * Math.sin(p.tw + p.life * 20);
      ctx.globalAlpha = Math.max(0, f * f * tw);
      if (p.trail) { ctx.strokeStyle = p.c; ctx.lineWidth = p.r; ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(p.x, p.y); ctx.stroke(); }
      else { ctx.fillStyle = p.c; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.3); ctx.fill(); }
    }
    // act two: motes rise slowly once the salvo thins out
    if (tt > 3.0) {
      moteAlpha = Math.min(1, moteAlpha + dt * 0.4);
      const want = Math.round(Math.min(60, W * H / 22000));
      while (motes.length < want) motes.push(spawnMote(motes.length < want / 2));
      for (const m of motes) {
        m.x += m.vx * k + Math.sin(m.ph + tt * 0.6) * 0.06 * k; m.y += m.vy * k;
        if (m.y < -10) Object.assign(m, spawnMote(false));
        ctx.globalAlpha = moteAlpha * m.a * (0.6 + 0.4 * Math.sin(m.ph + tt * 1.7));
        ctx.fillStyle = '#ecd9ad'; ctx.beginPath(); ctx.arc(m.x, m.y, m.r, 0, 6.3); ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);
  return {
    replay() { t0 = last = performance.now(); launched = 0; rockets.length = 0; moteAlpha = 0; motes.length = 0; },
    stop() { cancelAnimationFrame(raf); removeEventListener('resize', size); },
  };
}

/** odometer columns for "200": each digit spins down a strip, the ones fastest */
function odometer(value: string) {
  const cycles = [1, 2, 3];
  return [...value].map((d, i) => {
    const n = cycles[i] ?? 1; const digits: number[] = [];
    for (let c = 0; c < n; c++) for (let k = 0; k < 10; k++) digits.push(k);
    digits.push(+d);
    return `<span class="odo-col" style="--n:${digits.length - 1};--i:${i}"><span class="odo-strip">${digits.map(x => `<span>${x}</span>`).join('')}</span></span>`;
  }).join('');
}
/** the message, split into segments that rise one after another; the name keeps its own face */
function lineHTML() {
  const raw = t('egg.line', { name: '\u0000' });
  const [pre, post] = raw.split('\u0000');
  const segs = lang === 'zh' ? (pre.match(/^\d+\s*天|[^，]+，?/g) ?? [pre]) : pre.trim().split(/\s+/).map(w => w + ' ');
  const seg = (s: string, cls = '') => `<span class="seg${cls}"><span>${s}</span></span>`;
  return segs.map(s => seg(s)).join('') + seg(`${NAME}${post ?? ''}`, ' name');
}

let open = false;
export function openEgg(trigger?: HTMLElement, scene?: Celebrant) {
  if (open) return; open = true;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const root = document.createElement('div');
  root.className = 'egg'; root.setAttribute('role', 'dialog'); root.setAttribute('aria-modal', 'true');
  const render = () => {
    root.setAttribute('aria-label', t('egg.aria'));
    root.innerHTML = `
    <div class="egg-night"></div>
    <div class="egg-card">
      <p class="egg-kicker">${t('egg.kicker')}</p>
      <button class="egg-num" type="button" aria-label="${t('egg.replay')}"><span class="odo" aria-hidden="true">${odometer('200')}</span></button>
      <span class="egg-rule" aria-hidden="true"></span>
      <h2 class="egg-line">${lineHTML()}</h2>
      <div class="egg-foot"><button class="egg-btn" data-a="replay" type="button">${t('egg.replay')}</button><span class="egg-dot" aria-hidden="true"></span><button class="egg-btn" data-a="close" type="button">${t('egg.close')}</button></div>
    </div>`;
    root.classList.toggle('zh', lang === 'zh');
  };
  render();
  const cv = document.createElement('canvas'); cv.className = 'egg-fx'; cv.setAttribute('aria-hidden', 'true');
  document.body.append(root); root.insertBefore(cv, root.querySelector('.egg-card'));
  const fx = reduce ? null : sky(cv);
  if (reduce) cv.remove();
  const timers: number[] = [];
  const later = (ms: number, f: () => void) => timers.push(window.setTimeout(f, ms));
  const run = () => {
    timers.forEach(clearTimeout); timers.length = 0;
    root.classList.remove('act1', 'act2', 'act3', 'act4');
    void root.offsetWidth; // restart the CSS transitions
    if (reduce) { root.classList.add('act1', 'act2', 'act3', 'act4', 'still'); return; }
    root.classList.add('act1');                 // lights down
    fx?.replay();
    later(500, () => scene?.celebrate?.(3, 0.62)); // the jelly hops with the first bursts
    later(1700, () => root.classList.add('act2')); // kicker + odometer
    later(3300, () => root.classList.add('act3')); // rule + line
    later(4500, () => root.classList.add('act4')); // foot
  };
  requestAnimationFrame(run);
  (root.querySelector('[data-a="close"]') as HTMLButtonElement)?.focus({ preventScroll: true });
  const bind = () => {
    root.querySelector('[data-a="close"]')!.addEventListener('click', close);
    root.querySelector('[data-a="replay"]')!.addEventListener('click', run);
    root.querySelector('.egg-num')!.addEventListener('click', run);
  };
  const close = () => {
    root.classList.add('leaving'); removeEventListener('keydown', onKey);
    timers.forEach(clearTimeout);
    setTimeout(() => { fx?.stop(); root.remove(); open = false; trigger?.focus({ preventScroll: true }); }, reduce ? 10 : 900);
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') close();
    if (e.key === 'Tab') { // keep focus inside the dialog
      const f = [...root.querySelectorAll<HTMLButtonElement>('button')]; const i = f.indexOf(document.activeElement as HTMLButtonElement);
      e.preventDefault(); f[(i + (e.shiftKey ? f.length - 1 : 1)) % f.length].focus();
    }
  };
  addEventListener('keydown', onKey);
  bind();
  // (the language toggle sits under the modal, so the card never needs re-rendering while open)
  (window as any).__eggClose = close;
  (window as any).__eggReplay = run;
}

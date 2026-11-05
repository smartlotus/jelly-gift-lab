// The 200-day easter egg, loaded on demand from the mushroom.
// Sequence: the studio lights dim -> a few slow bursts in a champagne/ivory palette while the jelly hops ->
// an odometer rolls to 200 -> the line rises word by word -> quiet motes drift until it is closed.
// Tap the number (or Replay) to run it again. prefers-reduced-motion gets the card alone, no motion.
import './egg.css';
import { t, lang } from '../i18n/i18n';
import { go } from '../shared/flow';
import * as Audio from '../shared/audio';

type Celebrant = { celebrate?: (times?: number, gap?: number) => void };
const NAME = 'lushiva';
// pastel candy sky: strawberry, peach, butter, lilac, mint, cream, deep rose
const PALETTE = ['#ffb0c8', '#ffd2b4', '#ffe8a6', '#cdb6ff', '#b6f0da', '#fff4ee', '#ff86ac'];
type Kind = 'peony' | 'ring' | 'heart' | 'star' | 'willow' | 'crackle' | 'finale';
const SHELLS: { t: number; x: number; y: number; c: number; k: Kind }[] = [ // t (s), x, y (fractions of the viewport), colour, kind
  { t: 0.40, x: 0.50, y: 0.31, c: 0, k: 'peony' }, { t: 0.95, x: 0.22, y: 0.38, c: 3, k: 'ring' },
  { t: 1.30, x: 0.78, y: 0.30, c: 1, k: 'heart' }, { t: 1.90, x: 0.34, y: 0.21, c: 2, k: 'star' },
  { t: 2.30, x: 0.70, y: 0.42, c: 4, k: 'peony' }, { t: 2.75, x: 0.50, y: 0.25, c: 6, k: 'heart' },
  { t: 3.25, x: 0.17, y: 0.25, c: 5, k: 'crackle' }, { t: 3.45, x: 0.84, y: 0.22, c: 2, k: 'willow' },
  { t: 4.30, x: 0.50, y: 0.32, c: 0, k: 'finale' },
];
// 0 round dot, 1 streak (trail), 2 four-point glint
type P = { x: number; y: number; vx: number; vy: number; life: number; max: number; c: string; r: number; tw: number; drag: number; g: number; k: 0 | 1 | 2 };
type Mote = { x: number; y: number; vy: number; vx: number; r: number; a: number; ph: number; heart: boolean };
type Rocket = { x: number; y: number; vx: number; vy: number; ty: number; c: string; kind: Kind };
type Flash = { x: number; y: number; t: number; c: string; r: number };
const MAXP = 640;

/** sound for the sky: soft whistle on launch, a rounded pop + sparkle crackle on burst; silent unless the shared switch is on */
const pan = (x: number, W: number) => Math.max(-0.8, Math.min(0.8, (x / W - 0.5) * 1.4));
const sfx = {
  launch(x: number, W: number, dur: number) { Audio.tone(520, dur, 'sine', 0.025, { slide: 900, pan: pan(x, W), attack: dur * 0.5 }); Audio.noise(dur, 0.012, { type: 'bandpass', freq: 900, to: 2600, q: 1.2, pan: pan(x, W) }); },
  pop(kind: Kind, x: number, W: number) {
    const p = pan(x, W), big = kind === 'finale' ? 1.5 : 1;
    Audio.noise(0.34 * big, 0.2 * big, { freq: 1700, to: 140, q: 0.6, pan: p });
    Audio.tone(150 * (kind === 'finale' ? 0.8 : 1), 0.3 * big, 'sine', 0.22 * big, { slide: -95, pan: p });
    // a tiny bright chime so the pops feel like candy, not gunpowder
    const base = [880, 988, 1175, 1319, 1480][(Math.random() * 5) | 0];
    Audio.tone(base, 0.5, 'triangle', 0.04, { at: 0.02, pan: p }); Audio.tone(base * 1.5, 0.42, 'sine', 0.025, { at: 0.06, pan: p });
    const n = kind === 'crackle' ? 16 : kind === 'finale' ? 22 : 7;
    for (let i = 0; i < n; i++) Audio.noise(0.025, 0.03 + Math.random() * 0.03, { type: 'highpass', freq: 5200 + Math.random() * 2500, q: 0.7, at: 0.12 + Math.random() * (kind === 'crackle' ? 0.9 : 0.6), pan: p + (Math.random() - 0.5) * 0.4 });
  },
};

/** one canvas does both acts: the salvo, then the slow motes (until stopped) */
function sky(cv: HTMLCanvasElement) {
  const ctx = cv.getContext('2d')!;
  const dpr = Math.min(1.75, devicePixelRatio || 1);
  let W = 0, H = 0;
  const size = () => { W = innerWidth; H = innerHeight; cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); };
  size(); addEventListener('resize', size);
  const parts: P[] = []; const rockets: Rocket[] = []; const flashes: Flash[] = []; const motes: Mote[] = [];
  let t0 = performance.now(), last = t0, launched = 0, raf = 0, moteAlpha = 0;
  const scale = () => Math.min(1.3, Math.max(0.85, Math.min(W, H) / 640));
  const room = () => MAXP - parts.length;
  const add = (p: P) => { if (parts.length < MAXP) parts.push(p); };
  const jit = (c: string) => (Math.random() < 0.82 ? c : '#fffaf4');

  const heartPt = (a: number) => [16 * Math.sin(a) ** 3, -(13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a))];
  const starPt = (u: number) => { // u in 0..1 around a 5-point star; outer radius 1, inner .46
    const seg = u * 10, i = Math.floor(seg), f = seg - i; const pt = (j: number) => { const a = -Math.PI / 2 + (j * Math.PI) / 5, r = j % 2 ? 0.46 : 1; return [Math.cos(a) * r, Math.sin(a) * r]; };
    const A = pt(i % 10), B = pt((i + 1) % 10); return [A[0] + (B[0] - A[0]) * f, A[1] + (B[1] - A[1]) * f];
  };
  const burst = (x: number, y: number, c: string, kind: Kind) => {
    const sc = scale(); flashes.push({ x, y, t: 0, c, r: (kind === 'finale' ? 260 : 150) * sc });
    sfx.pop(kind, x, W);
    const lite = room() < 220; // on a struggling frame budget, thin the sparkle rather than the shape
    if (kind === 'heart' || kind === 'finale') {
      const tilt = (Math.random() - 0.5) * 0.25, big = kind === 'finale' ? 1.45 : 1, n = Math.round(60 * (kind === 'finale' ? 1.2 : 1));
      for (let i = 0; i < n; i++) {
        const [hx, hy] = heartPt((i / n) * Math.PI * 2); const ct = Math.cos(tilt), st = Math.sin(tilt); const k = (7.6 * sc * big) / 16;
        add({ x, y, vx: (hx * ct - hy * st) * k, vy: (hx * st + hy * ct) * k, life: 0, max: 2.0 + Math.random() * 0.5, c: jit(c), r: 1.5, tw: Math.random() * 6, drag: 0.925, g: 0.03, k: 1 });
      }
      if (kind === 'finale') { // a smaller, paler heart inside, then the glitter rain
        for (let i = 0; i < 40; i++) { const [hx, hy] = heartPt((i / 40) * Math.PI * 2); const k = (3.9 * sc) / 16; add({ x, y, vx: hx * k, vy: hy * k, life: 0, max: 2.3, c: '#fff4ee', r: 1.25, tw: Math.random() * 6, drag: 0.925, g: 0.03, k: 1 }); }
        for (let i = 0; i < (lite ? 30 : 90); i++) { const a = Math.random() * 6.283, s = Math.random() * 7 * sc; add({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 1.2, life: 0, max: 3.4 + Math.random() * 1.6, c: PALETTE[(Math.random() * 6) | 0], r: 1.4 + Math.random() * 1.2, tw: Math.random() * 6, drag: 0.955, g: 0.017, k: 2 }); }
      }
    } else if (kind === 'star') {
      for (let i = 0; i < 60; i++) { const [sx, sy] = starPt(i / 60); const k = 6.4 * sc; add({ x, y, vx: sx * k, vy: sy * k, life: 0, max: 1.9 + Math.random() * 0.4, c: jit(c), r: 1.4, tw: Math.random() * 6, drag: 0.93, g: 0.026, k: 1 }); }
    } else if (kind === 'willow') {
      for (let i = 0; i < 60; i++) { const a = (i / 60) * 6.283, s = 4.2 * sc * (0.55 + 0.4 * Math.random()); add({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s * 0.85, life: 0, max: 3 + Math.random() * 1.0, c, r: 1.0, tw: Math.random() * 6, drag: 0.972, g: 0.024, k: 1 }); }
    } else if (kind === 'crackle') {
      for (let i = 0; i < 44; i++) { const a = Math.random() * 6.283, s = (2 + Math.random() * 3.6) * sc; add({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0, max: 1.1 + Math.random() * 1.1, c: i % 3 ? c : '#ffffff', r: 1.6, tw: Math.random() * 6, drag: 0.95, g: 0.02, k: 2 }); }
    } else {
      const ring = kind === 'ring', n = ring ? 54 : 78;
      for (let i = 0; i < n; i++) { const a = (i / n) * 6.283 + Math.random() * 0.05, s = 4.1 * sc * (ring ? 0.94 + 0.06 * Math.random() : 0.45 + 0.55 * Math.sqrt(Math.random()));
        add({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0, max: 1.6 + Math.random() * 0.7, c: jit(c), r: ring ? 1.4 : 1.1 + Math.random() * 0.7, tw: Math.random() * 6, drag: 0.962, g: 0.022, k: ring ? 1 : 0 }); }
    }
    for (let i = 0; i < (lite ? 5 : 14); i++) { const a = Math.random() * 6.283, s = Math.random() * 1.3; // glitter that lingers
      add({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0, max: 2.4 + Math.random(), c: '#fff6ee', r: 1.1, tw: Math.random() * 6, drag: 0.95, g: 0.012, k: 2 }); }
  };
  const spawnMote = (anyY: boolean): Mote => ({ x: Math.random() * W, y: anyY ? Math.random() * H : H + 10, vy: -(0.12 + Math.random() * 0.28), vx: (Math.random() - 0.5) * 0.08, r: 0.7 + Math.random() * 1.4, a: 0.25 + Math.random() * 0.45, ph: Math.random() * 6.3, heart: Math.random() < 0.16 });
  const heartPath = (x: number, y: number, r: number) => { ctx.beginPath(); ctx.moveTo(x, y + r * 0.9); ctx.bezierCurveTo(x - r * 2.2, y - r * 0.2, x - r * 1.1, y - r * 1.7, x, y - r * 0.6); ctx.bezierCurveTo(x + r * 1.1, y - r * 1.7, x + r * 2.2, y - r * 0.2, x, y + r * 0.9); ctx.fill(); };
  const frame = (now: number) => {
    const tt = (now - t0) / 1000; const dt = Math.min(0.033, (now - last) / 1000); last = now; const k = dt * 60;
    while (launched < SHELLS.length && tt >= SHELLS[launched].t) {
      const s = SHELLS[launched++]; const c = PALETTE[s.c]; const rise = 0.5 + (s.k === 'finale' ? 0.1 : 0);
      rockets.push({ x: s.x * W + (Math.random() - 0.5) * 20, y: H + 10, vx: (Math.random() - 0.5) * 0.5, vy: -(H - s.y * H) / 32, ty: s.y * H, c, kind: s.k });
      sfx.launch(s.x * W, W, rise);
    }
    ctx.clearRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'lighter';
    for (let i = flashes.length - 1; i >= 0; i--) { // a soft bloom at each burst
      const f = flashes[i]; f.t += dt; const u = f.t / 0.38; if (u >= 1) { flashes.splice(i, 1); continue; }
      const g = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.r * (0.5 + u * 0.5)); g.addColorStop(0, f.c); g.addColorStop(1, 'rgba(255,160,190,0)');
      ctx.globalAlpha = 0.34 * (1 - u) * (1 - u); ctx.fillStyle = g; ctx.fillRect(f.x - f.r, f.y - f.r, f.r * 2, f.r * 2);
    }
    for (let i = rockets.length - 1; i >= 0; i--) {
      const r = rockets[i]; const ox = r.x, oy = r.y; r.x += r.vx * k; r.y += r.vy * k; r.vy *= Math.pow(0.984, k);
      ctx.globalAlpha = 0.85; ctx.strokeStyle = r.c; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.moveTo(ox - r.vx * 5, oy - r.vy * 0.6); ctx.lineTo(r.x, r.y); ctx.stroke();
      if (parts.length < MAXP && Math.random() < 0.7) add({ x: r.x, y: r.y + 3, vx: (Math.random() - 0.5) * 0.4, vy: 0.3 + Math.random() * 0.4, life: 0, max: 0.5 + Math.random() * 0.3, c: '#fff1e6', r: 0.8, tw: 0, drag: 0.94, g: 0.01, k: 0 });
      if (r.y <= r.ty || r.vy > -1.4) { burst(r.x, r.y, r.c, r.kind); rockets.splice(i, 1); }
    }
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i]; p.life += dt; if (p.life > p.max) { parts[i] = parts[parts.length - 1]; parts.pop(); continue; }
      const d = Math.pow(p.drag, k); p.vx *= d; p.vy = p.vy * d + p.g * k; p.x += p.vx * k; p.y += p.vy * k;
      const f = 1 - p.life / p.max; const tw = 0.72 + 0.28 * Math.sin(p.tw + p.life * 22);
      ctx.globalAlpha = Math.max(0, f * f * tw);
      if (p.k === 1) { ctx.strokeStyle = p.c; ctx.lineWidth = p.r; ctx.beginPath(); ctx.moveTo(p.x - p.vx * 2.4, p.y - p.vy * 2.4); ctx.lineTo(p.x, p.y); ctx.stroke(); }
      else if (p.k === 2) { const z = p.r * (1.6 + 1.6 * tw); ctx.strokeStyle = p.c; ctx.lineWidth = 0.9; ctx.beginPath(); ctx.moveTo(p.x - z, p.y); ctx.lineTo(p.x + z, p.y); ctx.moveTo(p.x, p.y - z); ctx.lineTo(p.x, p.y + z); ctx.stroke(); }
      else { ctx.fillStyle = p.c; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.3); ctx.fill(); }
    }
    // act two: the salvo thins out, and pink motes (a few tiny hearts) rise slowly until the card is closed
    if (tt > 3.4) {
      moteAlpha = Math.min(1, moteAlpha + dt * 0.35);
      const want = Math.round(Math.min(52, W * H / 24000));
      while (motes.length < want) motes.push(spawnMote(motes.length < want / 2));
      ctx.globalCompositeOperation = 'source-over';
      for (const m of motes) {
        m.x += m.vx * k + Math.sin(m.ph + tt * 0.6) * 0.06 * k; m.y += m.vy * k;
        if (m.y < -10) Object.assign(m, spawnMote(false));
        ctx.globalAlpha = moteAlpha * m.a * (0.6 + 0.4 * Math.sin(m.ph + tt * 1.7));
        ctx.fillStyle = m.heart ? '#ff9fbd' : '#ffd6e2';
        if (m.heart) heartPath(m.x, m.y, m.r * 1.6); else { ctx.beginPath(); ctx.arc(m.x, m.y, m.r, 0, 6.3); ctx.fill(); }
      }
    }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
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
    <button class="egg-snd" data-a="snd" type="button" aria-label="${t('egg.sound')}" aria-pressed="${Audio.soundOn()}"><svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9.5v5h3.6L12 18.5v-13L7.6 9.5z"/><path class="w" d="M15.4 9.2a4 4 0 0 1 0 5.6M17.8 6.8a7.4 7.4 0 0 1 0 10.4"/><path class="x" d="M16 9.5l5 5M21 9.5l-5 5"/></svg></button>
    <div class="egg-card">
      <p class="egg-kicker">${t('egg.kicker')}</p>
      <button class="egg-num" type="button" aria-label="${t('egg.replay')}"><span class="odo" aria-hidden="true">${odometer('200')}</span></button>
      <span class="egg-rule" aria-hidden="true"></span>
      <h2 class="egg-line">${lineHTML()}</h2>
      <div class="egg-foot"><button class="egg-btn" data-a="replay" type="button">${t('egg.replay')}</button><span class="egg-dot" aria-hidden="true"></span><button class="egg-btn" data-a="close" type="button">${t('egg.close')}</button></div>
      <button class="egg-up" data-a="up" type="button"><span>${t('egg.sea')}</span><svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round"><path d="M7 10l5 5 5-5"/></svg></button>
      <div class="egg-water" aria-hidden="true"><i></i></div>
    </div>`;
    root.classList.toggle('zh', lang === 'zh');
  };
  render();
  // the mushroom tap is a deliberate gesture: if she never touched the sound switch, let the sky be heard (not remembered)
  if (!Audio.soundChosen()) Audio.setSound(true, false);
  Audio.unlock();
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
    const snd = root.querySelector('[data-a="snd"]') as HTMLButtonElement;
    snd.addEventListener('click', () => { Audio.unlock(); Audio.setSound(!Audio.soundOn()); snd.setAttribute('aria-pressed', String(Audio.soundOn())); if (Audio.soundOn()) Audio.tone(988, 0.3, 'triangle', 0.06); });
    root.querySelector('[data-a="up"]')!.addEventListener('click', lookUp);
  };
  // onward: the sea rises — a dark tide fills the room from below, the card and the sparks drift up through it -> /sea/
  let leavingUp = false;
  const lookUp = () => {
    if (leavingUp) return; leavingUp = true; removeEventListener('keydown', onKey); timers.forEach(clearTimeout);
    root.classList.add('tide');
    void go('sea', () => new Promise(r => setTimeout(r, reduce ? 10 : 2600)));
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

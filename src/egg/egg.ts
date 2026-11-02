// The 200-day easter egg: a short, elegant firework salvo on a 2D canvas, then a black-and-white editorial card.
// Loaded on demand (first hover/click on the mushroom), so it costs nothing on first paint.
import './egg.css';

const PALETTE = ['#e9cf94', '#f6ecd6', '#ffffff', '#e8b9c2', '#c9ccd3', '#d8aa5c'];
type P = { x: number; y: number; vx: number; vy: number; life: number; max: number; c: string; r: number; tw: number; trail: boolean };

function fireworks(cv: HTMLCanvasElement, done: () => void) {
  const ctx = cv.getContext('2d')!;
  const dpr = Math.min(2, devicePixelRatio || 1);
  let W = 0, H = 0;
  const size = () => { W = innerWidth; H = innerHeight; cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); };
  size(); addEventListener('resize', size);
  const parts: P[] = []; const rockets: { x: number; y: number; vy: number; vx: number; ty: number; c: string; t: number }[] = [];
  const small = Math.min(W, H) < 600;
  const shells = [
    { t: 0.00, x: 0.50, y: 0.30 }, { t: 0.35, x: 0.28, y: 0.38 }, { t: 0.62, x: 0.73, y: 0.34 },
    { t: 1.05, x: 0.40, y: 0.24 }, { t: 1.30, x: 0.62, y: 0.27 }, { t: 1.75, x: 0.52, y: 0.36 },
  ];
  const burst = (x: number, y: number, c: string) => {
    const n = small ? 64 : 92; const sp = (small ? 2.6 : 3.4) * Math.min(1.25, Math.max(0.75, Math.min(W, H) / 700));
    const c2 = PALETTE[(PALETTE.indexOf(c) + 2) % PALETTE.length];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + Math.random() * 0.08; const s = sp * (0.55 + 0.45 * Math.sqrt(Math.random()));
      parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0, max: 1.6 + Math.random() * 0.9, c: Math.random() < 0.8 ? c : c2, r: 1.1 + Math.random() * 0.9, tw: Math.random() * 6, trail: true });
    }
    for (let i = 0; i < 18; i++) { const a = Math.random() * Math.PI * 2; parts.push({ x, y, vx: Math.cos(a) * 0.6, vy: Math.sin(a) * 0.6, life: 0, max: 2.4, c: '#ffffff', r: 0.8, tw: Math.random() * 6, trail: false }); }
  };
  let t0 = performance.now(), last = t0, launched = 0, raf = 0;
  const frame = (now: number) => {
    const t = (now - t0) / 1000; const dt = Math.min(0.033, (now - last) / 1000); last = now; const k = dt * 60;
    while (launched < shells.length && t >= shells[launched].t) {
      const s = shells[launched++]; const c = PALETTE[launched % PALETTE.length];
      rockets.push({ x: s.x * W, y: H + 10, vx: (Math.random() - 0.5) * 0.6, vy: -(H - s.y * H) / 34, ty: s.y * H, c, t: 0 });
    }
    ctx.globalCompositeOperation = 'destination-out'; ctx.fillStyle = 'rgba(0,0,0,0.22)'; ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'lighter';
    for (let i = rockets.length - 1; i >= 0; i--) {
      const r = rockets[i]; r.t += dt; r.x += r.vx * k; r.y += r.vy * k; r.vy *= Math.pow(0.985, k);
      ctx.fillStyle = 'rgba(255,244,220,0.9)'; ctx.beginPath(); ctx.arc(r.x, r.y, 1.4, 0, 7); ctx.fill();
      if (r.y <= r.ty || r.vy > -1.5) { burst(r.x, r.y, r.c); rockets.splice(i, 1); }
    }
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i]; p.life += dt; if (p.life > p.max) { parts.splice(i, 1); continue; }
      const ox = p.x, oy = p.y;
      p.vx *= Math.pow(0.962, k); p.vy = p.vy * Math.pow(0.962, k) + 0.045 * k; p.x += p.vx * k; p.y += p.vy * k;
      const f = 1 - p.life / p.max; const tw = 0.65 + 0.35 * Math.sin(p.tw + p.life * 22);
      ctx.globalAlpha = Math.max(0, f * f * tw);
      if (p.trail) { ctx.strokeStyle = p.c; ctx.lineWidth = p.r; ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(p.x, p.y); ctx.stroke(); }
      ctx.fillStyle = p.c; ctx.beginPath(); ctx.arc(p.x, p.y, p.r * (0.6 + 0.4 * f), 0, 7); ctx.fill();
    }
    ctx.globalAlpha = 1;
    if (launched >= shells.length && !rockets.length && !parts.length) { removeEventListener('resize', size); done(); return; }
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);
  return () => { cancelAnimationFrame(raf); removeEventListener('resize', size); };
}

let open = false;
export function openEgg(trigger?: HTMLElement) {
  if (open) return; open = true;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const root = document.createElement('div');
  root.className = 'egg'; root.setAttribute('role', 'dialog'); root.setAttribute('aria-modal', 'true'); root.setAttribute('aria-labelledby', 'egg-line');
  root.innerHTML = `
    <div class="egg-paper"></div>
    <div class="egg-card">
      <p class="egg-kicker">Jelly Studies · Special Edition</p>
      <hr class="egg-rule"><hr class="egg-rule thin">
      <p class="egg-num" aria-hidden="true">200</p>
      <h2 class="egg-line" id="egg-line">200 天纪念日快乐，<span class="lat">lushiva</span></h2>
      <p class="egg-dateline">Day Two Hundred <span aria-hidden="true">·</span> <span class="zh">第二百天</span></p>
      <button class="egg-close" type="button">Close · 关闭</button>
    </div>`;
  const cv = document.createElement('canvas'); cv.className = 'egg-fx'; cv.setAttribute('aria-hidden', 'true');
  document.body.append(root, cv);
  let stopFx: (() => void) | null = null;
  const show = () => { root.classList.add('show'); (root.querySelector('.egg-close') as HTMLButtonElement).focus({ preventScroll: true }); };
  if (reduce) { requestAnimationFrame(show); cv.remove(); }
  else { stopFx = fireworks(cv, () => cv.remove()); setTimeout(show, 1500); }
  const close = () => {
    root.classList.add('leaving'); cv.classList.add('leaving'); removeEventListener('keydown', onKey);
    setTimeout(() => { stopFx?.(); root.remove(); cv.remove(); open = false; trigger?.focus({ preventScroll: true }); }, reduce ? 10 : 620);
  };
  const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); if (e.key === 'Tab') { e.preventDefault(); (root.querySelector('.egg-close') as HTMLButtonElement).focus(); } };
  addEventListener('keydown', onKey);
  root.querySelector('.egg-close')!.addEventListener('click', close);
  root.querySelector('.egg-paper')!.addEventListener('click', close);
  (window as any).__eggClose = close;
}

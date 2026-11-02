import type { Colourway } from '../characters/shark/look';
import type { Readouts } from '../app/engine';

const $ = (id: string) => document.getElementById(id)!;

export function setProgress(p: number) {
  ($('bar') as HTMLElement).style.width = `${Math.round(p * 100)}%`;
  $('pct').textContent = `${Math.round(p * 100)}%`;
}
export function hideLoader() { $('loader').classList.add('done'); }
export function showFail() { $('fail').hidden = false; $('loader').classList.add('done'); }

export function buildColourways(list: Colourway[], onPick: (c: Colourway) => void) {
  const root = document.querySelector('.colourways')!;
  root.innerHTML = '';
  list.forEach((c, i) => {
    const b = document.createElement('button');
    b.className = 'cw' + (i === 0 ? ' active' : '');
    b.setAttribute('role', 'radio'); b.setAttribute('aria-checked', i === 0 ? 'true' : 'false');
    b.dataset.id = c.id;
    b.innerHTML = `<span class="dot" style="background:${c.swatch}"></span><span class="en">${c.label}</span><span class="zh">${c.zh}</span>`;
    b.addEventListener('click', () => {
      root.querySelectorAll('.cw').forEach(x => { x.classList.remove('active'); x.setAttribute('aria-checked', 'false'); });
      b.classList.add('active'); b.setAttribute('aria-checked', 'true');
      onPick(c);
    });
    root.appendChild(b);
  });
}

const fmt = (v: number, d: number) => v.toFixed(d);
let shown: Readouts | null = null;
export function updateReadouts(r: Readouts) {
  // gentle easing so the numbers breathe with the jelly instead of flickering
  if (!shown) shown = { ...r };
  const k = 0.45;
  shown.massG += (r.massG - shown.massG) * k; shown.volumeMl += (r.volumeMl - shown.volumeMl) * k;
  shown.forkCm += (r.forkCm - shown.forkCm) * k; shown.eyeCm += (r.eyeCm - shown.eyeCm) * k;
  $('ro-mass').textContent = fmt(shown.massG, 1);
  $('ro-vol').textContent = fmt(shown.volumeMl, 1);
  $('ro-fork').textContent = fmt(shown.forkCm, 2);
  $('ro-eye').textContent = fmt(shown.eyeCm, 2);
}
export function fadeHint() { $('hint').classList.add('gone'); }
export function setColophon(t: string) { $('colophon').textContent = t; }

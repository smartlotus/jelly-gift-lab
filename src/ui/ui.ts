import type { Colourway } from '../core/look';
import type { Readouts, Metric } from '../app/engine';

const $ = (id: string) => document.getElementById(id)!;

export function setProgress(p: number) {
  ($('bar') as HTMLElement).style.width = `${Math.round(p * 100)}%`;
  $('pct').textContent = `${Math.round(p * 100)}%`;
}
export function hideLoader() { $('loader').classList.add('done'); }
export function showFail() { $('fail').hidden = false; $('loader').classList.add('done'); }

export function buildColourways(list: Colourway[], onPick: (c: Colourway) => void, activeId?: string) {
  const root = document.querySelector('.colourways')!;
  root.innerHTML = '';
  list.forEach((c, i) => {
    const b = document.createElement('button');
    const on = activeId ? c.id === activeId : i === 0;
    b.className = 'cw' + (on ? ' active' : '');
    b.setAttribute('role', 'radio'); b.setAttribute('aria-checked', on ? 'true' : 'false');
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
let shown: Readouts | null = null; let metricDefs: Metric[] = [];
/** (re)build the readout strip: mass, volume + the character's own measurements */
export function buildReadouts(metrics: Metric[]) {
  metricDefs = metrics; shown = null;
  const root = document.querySelector('.readouts')!;
  const cell = (id: string, en: string, zh: string, unit: string) =>
    `<div class="ro"><span class="lab">${en} <b class="zh">${zh}</b></span><span class="val"><span id="${id}">—</span><small>${unit}</small></span></div>`;
  root.innerHTML = cell('ro-mass', 'Mass', '质量', 'g') + cell('ro-vol', 'Volume', '体积', 'ml') + metrics.map((m, i) => cell(`ro-m${i}`, m.label, m.zh, 'cm')).join('');
}
export function updateReadouts(r: Readouts) {
  // gentle easing so the numbers breathe with the jelly instead of flickering
  if (!shown || shown.metrics.length !== r.metrics.length) shown = { ...r, metrics: [...r.metrics] };
  const k = 0.45;
  shown.massG += (r.massG - shown.massG) * k; shown.volumeMl += (r.volumeMl - shown.volumeMl) * k;
  r.metrics.forEach((v, i) => { shown!.metrics[i] += (v - shown!.metrics[i]) * k; });
  $('ro-mass').textContent = fmt(shown.massG, 1);
  $('ro-vol').textContent = fmt(shown.volumeMl, 1);
  shown.metrics.forEach((v, i) => { const el = document.getElementById(`ro-m${i}`); if (el) el.textContent = fmt(v, metricDefs[i]?.decimals ?? 2); });
}
export function setMasthead(name: string, subtitle: string, num: string) {
  const t = document.querySelector('.title em')!; const sub = document.querySelector('.subtitle')!; const n = document.querySelector('.kicker .num')!;
  t.textContent = name; sub.textContent = subtitle; n.innerHTML = `No.&nbsp;${num}`;
  document.title = `Jelly Studies — No. ${num} ${name}`;
}
export function setActiveCharacter(id: string) {
  document.querySelectorAll<HTMLButtonElement>('.char').forEach(b => { const on = b.dataset.char === id; b.classList.toggle('active', on); b.setAttribute('aria-pressed', on ? 'true' : 'false'); });
}
export function enableCharacters(ready: string[], onPick: (id: string) => void) {
  document.querySelectorAll<HTMLButtonElement>('.char').forEach(b => {
    const id = b.dataset.char!; const ok = ready.includes(id);
    b.classList.toggle('soon', !ok); if (ok) { b.removeAttribute('aria-disabled'); b.removeAttribute('title'); b.querySelector('i')?.remove(); }
    b.onclick = ok ? () => onPick(id) : null;
  });
}
/** cross-fade veil for character changes */
export async function veil(on: boolean) {
  const v = document.getElementById('veil')!; v.classList.toggle('on', on);
  await new Promise(r => setTimeout(r, on ? 380 : 10));
}
export function fadeHint() { $('hint').classList.add('gone'); }
export function setColophon(t: string) { $('colophon').textContent = t; }

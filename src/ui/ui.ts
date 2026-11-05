import type { Colourway } from '../core/look';
import { t, type Key } from '../i18n/i18n';
import { progress as curtainProgress } from '../shared/curtain';

const $ = (id: string) => document.getElementById(id)!;

export function setProgress(p: number) {
  ($('bar') as HTMLElement).style.width = `${Math.round(p * 100)}%`;
  $('pct').textContent = `${Math.round(p * 100)}`;
  curtainProgress(p);
}
export function hideLoader() { $('loader').classList.add('done'); }
export function showFail() { $('fail').hidden = false; $('loader').classList.add('done'); }

/** colour dots; the active colour's name sits beside them (one label, not three) */
let cwList: Colourway[] = []; let cwActive = '';
export function buildColourways(list: Colourway[], onPick: (c: Colourway) => void, activeId?: string) {
  cwList = list; cwActive = activeId ?? list[0].id;
  const root = document.querySelector('.colourways .dots')!;
  root.innerHTML = '';
  for (const c of list) {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'cw'; b.dataset.id = c.id; b.setAttribute('role', 'radio');
    b.innerHTML = `<span class="dot" style="background:${c.swatch}"></span>`;
    b.addEventListener('click', () => { cwActive = c.id; labelColourways(); onPick(c); });
    root.appendChild(b);
  }
  labelColourways();
}
export function labelColourways() {
  document.querySelectorAll<HTMLButtonElement>('.colourways .cw').forEach(b => {
    const on = b.dataset.id === cwActive; b.classList.toggle('active', on);
    b.setAttribute('aria-checked', on ? 'true' : 'false'); b.setAttribute('aria-label', t(`cw.${b.dataset.id}` as Key));
  });
  const name = document.querySelector('.cw-name')!; if (cwList.length) name.textContent = t(`cw.${cwActive}` as Key);
}

export function setMasthead(id: string, num: string) {
  const name = t(`title.${id}` as Key);
  document.querySelector('.title em')!.textContent = name;
  document.querySelector('.kicker .num')!.textContent = num.padStart(2, '0');
  document.title = `${name} — ${t('meta.title')}`;
}
export function setActiveCharacter(id: string) {
  document.querySelectorAll<HTMLButtonElement>('.char').forEach(b => { const on = b.dataset.char === id; b.classList.toggle('active', on); b.setAttribute('aria-pressed', on ? 'true' : 'false'); });
}
export function enableCharacters(ready: string[], onPick: (id: string) => void) {
  document.querySelectorAll<HTMLButtonElement>('.char').forEach(b => {
    const id = b.dataset.char!; const ok = ready.includes(id);
    b.hidden = !ok; b.onclick = ok ? () => onPick(id) : null;
  });
}
/** cross-fade veil for character changes */
export async function veil(on: boolean) {
  const v = document.getElementById('veil')!; v.classList.toggle('on', on);
  await new Promise(r => setTimeout(r, on ? 380 : 10));
}
/** the interaction hint says its line once, then gets out of the way */
let hintTimer = 0;
export function showHint(touch: boolean) {
  const h = $('hint'); h.textContent = t(touch ? 'hint.touch' : 'hint.mouse');
  if (!hintTimer && !h.classList.contains('gone')) hintTimer = window.setTimeout(fadeHint, 9000);
}
export function fadeHint() { $('hint').classList.add('gone'); }
export function setColophon(s: string) { $('colophon').textContent = s; }
export function bindLang(current: string, onPick: (l: 'zh' | 'en') => void) {
  const btns = document.querySelectorAll<HTMLButtonElement>('.lang button');
  const mark = (l: string) => btns.forEach(b => { const on = b.dataset.lang === l; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on ? 'true' : 'false'); });
  btns.forEach(b => b.addEventListener('click', () => { onPick(b.dataset.lang as 'zh' | 'en'); mark(b.dataset.lang!); }));
  mark(current);
}

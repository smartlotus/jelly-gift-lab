// The flip: a hard cut from dark voxel found-footage to a soft pastel picture-book page (watercolour + crayon, thin
// warm-brown lines, blush marks): the pig hugs the cat. Hand-lettered title, floating hearts, sparkles, a slow breathing
// bounce; tap for a squeeze. Then "Continue" -> pink iris -> /jelly/.
import { t } from '../../shared/i18n';
import { irisOut } from '../../shared/transition';
import { go } from '../../shared/flow';
import { sfx } from './sfx';
import HUG from './art/hug.webp';
import './kawaii.css';

// art/hug.webp: the pig hugging the cat, soft crayon-and-watercolour picture-book style (generated from the doodle refs,
// 1600 px square, ~140 KB). Decoded at import time so the hard cut shows it on the very first frame.
const PAPER = '#FBEDEA';
const pre = new Image(); pre.src = HUG; void pre.decode?.().catch(() => {});
const star = (cls: string) => `<svg class="${cls}" viewBox="-10 -10 20 20"><path d="M0 -10 C1 -3 3 -1 10 0 C3 1 1 3 0 10 C-1 3 -3 1 -10 0 C-3 -1 -1 -3 0 -10 Z" fill="#FFE7A3" stroke="#B9826A" stroke-width="1" stroke-linejoin="round"/></svg>`;
const hsvg = (fill: string) => `<svg viewBox="-13 -13 26 22"><path d="M0 6 C-7 -1 -12 -6 -7 -10 C-4 -12.5 -1 -11 0 -8 C1 -11 4 -12.5 7 -10 C12 -6 7 -1 0 6 Z" fill="${fill}"/></svg>`;

/** caught = the pig catches you at the dead end · bus = you made the last bus (the pig was the driver) · best = the tree house */
export type Ending = 'caught' | 'bus' | 'best';
export function showKawaii(root: HTMLElement = document.body, end: Ending = 'caught', info?: { endings: number; stickers: number }) {
  document.documentElement.dataset.theme = 'light';
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', PAPER);
  const el = document.createElement('section'); el.className = `kw kw-${end}`; el.setAttribute('aria-live', 'polite');
  const title = t(end === 'caught' ? 'night.caught' : `night.end.${end}`);
  const tilt = [-4, 3, -2, 4, -3, 2, -1, 3];
  const letters = [...title].map((ch, i) => `<span style="--i:${i};--t:${tilt[i % tilt.length]}deg">${ch}</span>`).join('');
  const rnd = (a: number, b: number) => a + Math.random() * (b - a);
  let float = '';
  for (let i = 0; i < (end === 'best' ? 28 : 16); i++) float += `<i class="kw-f" style="left:${rnd(2, 96)}%;--d:${rnd(7, 13)}s;--del:${-rnd(0, 12)}s;--s:${rnd(.5, 1.25)};--x:${rnd(-30, 30)}px">${hsvg(['#F7A9BB', '#FBCAD5', '#FFFFFF', '#F3B6C4'][i % 4])}</i>`;
  for (let i = 0; i < 12; i++) float += `<i class="kw-tw" style="left:${rnd(3, 97)}%;top:${rnd(4, 94)}%;--d:${rnd(1.6, 3.2)}s;--del:${-rnd(0, 3)}s;--s:${rnd(.5, 1.3)}">${star('')}</i>`;
  let burst = '';
  for (let i = 0; i < 26; i++) { const a = (i / 26) * Math.PI * 2 + rnd(-.1, .1), r = rnd(150, 420);
    burst += `<i class="kw-c kw-c${i % 4}" style="--dx:${Math.cos(a) * r}px;--dy:${Math.sin(a) * r}px;--r:${rnd(-200, 200)}deg;--del:${rnd(0, .12)}s"></i>`; }
  el.innerHTML = `
    <div class="kw-bg"></div>
    <div class="kw-float" aria-hidden="true">${float}</div>
    <div class="kw-burst" aria-hidden="true">${burst}</div>
    <div class="kw-stage">
      <h2 class="kw-title" aria-label="${title}">${letters}</h2>
      <div class="kw-sticker"><img class="kw-art" src="${HUG}" alt="" draggable="false" decoding="sync"/><div class="kw-rise">${[1, 2, 3, 4].map(i => `<i class="r${i}">${hsvg(['#F58FA9', '#F9B3C3', '#EF7C9A', '#FBC4D0'][i - 1])}</i>`).join('')}</div>${star('kw-s1')}${star('kw-s2')}${star('kw-s3')}</div>
      <p class="kw-sub">${t(end === 'caught' ? 'night.caught.sub' : `night.end.${end}.sub`)}</p>
      <p class="kw-tag">${t(`night.end.tag.${end}`)}${info ? ` · ${t('night.end.count').replace('{n}', String(info.endings))}` : ''}${info && end !== 'best' && info.stickers < 5 ? `<br><small>${t('night.end.more').replace('{n}', String(info.stickers))}</small>` : ''}</p>
      <button type="button" class="kw-go"><span>${t('ui.continue')}</span><svg viewBox="0 0 24 24" width="16" height="16"><path d="M5 12h13M13 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
    </div>`;
  root.appendChild(el);
  sfx.ding(); setTimeout(() => sfx.pop(), 900);
  let left = false;
  const leave = () => {
    if (left) return; left = true;
    const b = el.querySelector('.kw-go')!.getBoundingClientRect();
    void go('jelly', () => irisOut(b.left + b.width / 2, b.top + b.height / 2, 750, '#F9C6CF'));
  };
  el.querySelector('.kw-go')!.addEventListener('click', leave);
  // a tap on the sticker = a squeeze (and a pop)
  el.querySelector('.kw-sticker')!.addEventListener('pointerdown', () => { const s = el.querySelector('.kw-sticker')!; s.classList.remove('squish'); void (s as HTMLElement).offsetWidth; s.classList.add('squish'); sfx.pop(); });
  window.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { if (el.classList.contains('ready')) leave(); } });
  setTimeout(() => el.classList.add('ready'), 2300);
  if (!new URLSearchParams(location.search).has('stay')) setTimeout(leave, end === 'best' ? 16000 : 14000);
  return el;
}

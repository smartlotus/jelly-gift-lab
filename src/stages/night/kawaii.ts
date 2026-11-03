// The flip: a hard cut from dark voxel found-footage to a soft, glossy pastel-pink sticker scene (vector, NOT pixel):
// the pig (doodle features: pointy ears, oval snout, bean eyes, curly tail) hugs the cat (closed happy eyes, :3, pink
// tail ring). "??" above the pig pops into hearts. Then "Continue" -> pink iris -> /jelly/.
import { t } from '../../shared/i18n';
import { irisOut } from '../../shared/transition';
import { go } from '../../shared/flow';
import { sfx } from './sfx';
import './kawaii.css';

const INK = '#2E2A2B';
const heart = (x: number, y: number, s: number, fill: string, cls = '') =>
  `<path class="${cls}" transform="translate(${x} ${y}) scale(${s})" d="M0 6 C-7 -1 -12 -6 -7 -10 C-4 -12.5 -1 -11 0 -8 C1 -11 4 -12.5 7 -10 C12 -6 7 -1 0 6 Z" fill="${fill}" stroke="${INK}" stroke-width="${2.2 / s}" stroke-linejoin="round"/>`;
/** capsule limb: outline + fill by stroking the same path twice */
const limb = (d: string, w: number, fill: string) => `<path d="${d}" fill="none" stroke="${INK}" stroke-width="${w + 7}" stroke-linecap="round"/><path d="${d}" fill="none" stroke="${fill}" stroke-width="${w}" stroke-linecap="round"/>`;

const ART = /* svg */`
<svg class="kw-art" viewBox="0 0 440 400" role="img" aria-hidden="true">
  <defs>
    <filter id="kw-sticker" x="-12%" y="-12%" width="124%" height="124%" color-interpolation-filters="sRGB">
      <feMorphology in="SourceAlpha" operator="dilate" radius="9" result="d"/>
      <feFlood flood-color="#ffffff"/><feComposite in2="d" operator="in" result="w"/>
      <feGaussianBlur in="d" stdDeviation="7" result="b"/><feOffset in="b" dy="8" result="bo"/>
      <feFlood flood-color="#e9819f" flood-opacity=".38"/><feComposite in2="bo" operator="in" result="sh"/>
      <feMerge><feMergeNode in="sh"/><feMergeNode in="w"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <radialGradient id="kw-pigG" cx=".38" cy=".3" r=".8"><stop offset="0" stop-color="#FFE9EE"/><stop offset=".6" stop-color="#FFD3DD"/><stop offset="1" stop-color="#F9BDCB"/></radialGradient>
    <radialGradient id="kw-catG" cx=".38" cy=".3" r=".85"><stop offset="0" stop-color="#FFFFFF"/><stop offset=".65" stop-color="#FFF6EA"/><stop offset="1" stop-color="#F6E6D2"/></radialGradient>
    <radialGradient id="kw-blush"><stop offset="0" stop-color="#FF8FAB" stop-opacity=".85"/><stop offset="1" stop-color="#FF8FAB" stop-opacity="0"/></radialGradient>
  </defs>
  <g filter="url(#kw-sticker)" stroke="${INK}" stroke-width="4.5" stroke-linejoin="round" stroke-linecap="round">
    <!-- PIG (behind) -->
    <path d="M378 300 c22 -6 26 -30 10 -34 c-12 -3 -16 12 -6 15" fill="none" stroke-width="5"/>
    <ellipse cx="300" cy="306" rx="84" ry="66" fill="url(#kw-pigG)"/>
    <g class="kw-pighead">
      <path d="M226 136 C220 104 226 82 236 72 C252 84 266 100 274 118 Z" fill="url(#kw-pigG)"/>
      <path d="M236 92 C240 98 248 106 256 116" fill="none" stroke="#F4A7B9" stroke-width="7"/>
      <path d="M318 112 C330 96 346 84 362 78 C370 92 370 116 362 140 Z" fill="url(#kw-pigG)"/>
      <path d="M352 96 C348 104 344 112 340 120" fill="none" stroke="#F4A7B9" stroke-width="7"/>
      <path d="M210 186 C206 136 246 110 296 110 C350 110 384 140 382 186 C380 236 344 262 296 262 C246 262 212 236 210 186 Z" fill="url(#kw-pigG)"/>
      <ellipse cx="256" cy="212" rx="16" ry="10" fill="url(#kw-blush)" stroke="none"/>
      <ellipse cx="358" cy="206" rx="20" ry="11" fill="url(#kw-blush)" stroke="none"/>
      <ellipse cx="262" cy="180" rx="8" ry="10.5" fill="${INK}" stroke="none"/><circle cx="264.5" cy="176" r="3" fill="#fff" stroke="none"/>
      <ellipse cx="330" cy="177" rx="8" ry="10.5" fill="${INK}" stroke="none"/><circle cx="332.5" cy="173" r="3" fill="#fff" stroke="none"/>
      <ellipse cx="297" cy="212" rx="30" ry="20" fill="#F7AFC0"/>
      <ellipse cx="287" cy="212" rx="4.5" ry="7" fill="#9B4560" stroke="none"/><ellipse cx="307" cy="212" rx="4.5" ry="7" fill="#9B4560" stroke="none"/>
      <path d="M287 240 q10 7 20 0" fill="none" stroke-width="4"/>
    </g>
    <!-- CAT (front) -->
    <path d="M118 336 C84 334 70 304 80 270 C84 256 96 252 100 262 C104 272 92 282 96 300 C100 316 112 320 124 318" fill="url(#kw-catG)"/>
    <path d="M82 282 l22 4" stroke="#EE8FA6" stroke-width="9"/>
    <ellipse cx="166" cy="322" rx="66" ry="56" fill="url(#kw-catG)"/>
    <g class="kw-cathead">
      <path d="M96 190 C92 160 96 130 106 112 C126 124 142 140 152 156 Z" fill="url(#kw-catG)"/>
      <path d="M110 134 C116 144 124 152 132 160" fill="none" stroke="#F4A7B9" stroke-width="8"/>
      <path d="M182 152 C196 136 214 124 232 116 C240 136 240 162 234 186 Z" fill="url(#kw-catG)"/>
      <path d="M222 140 C216 148 210 156 204 164" fill="none" stroke="#F4A7B9" stroke-width="8"/>
      <path d="M88 222 C86 176 122 150 166 150 C214 150 246 178 244 222 C242 262 208 284 166 284 C122 284 90 262 88 222 Z" fill="url(#kw-catG)"/>
      <ellipse cx="112" cy="242" rx="18" ry="10" fill="url(#kw-blush)" stroke="none"/>
      <ellipse cx="222" cy="240" rx="18" ry="10" fill="url(#kw-blush)" stroke="none"/>
      <path d="M118 222 q14 -15 28 0" fill="none" stroke-width="5"/>
      <path d="M186 220 q14 -15 28 0" fill="none" stroke-width="5"/>
      <path d="M152 240 q7 9 14 0 q7 9 14 0" fill="none" stroke-width="4"/>
      <path d="M96 232 l-22 -4 M98 244 l-20 4 M236 230 l22 -4 M234 242 l20 4" stroke-width="3"/>
    </g>
    <!-- the hug: pig arm over the cat's tummy + far hoof peeking out on the left; cat paws holding on -->
    ${limb('M104 322 C100 312 102 302 110 296', 26, '#FFD3DD')}
    <path d="M100 302 C102 294 108 292 112 296" fill="none" stroke="#F4A7B9" stroke-width="10"/>
    ${limb('M318 290 C280 330 214 340 150 318', 30, '#FFD3DD')}
    <path d="M154 330 C146 326 142 318 146 308" fill="none" stroke="#F4A7B9" stroke-width="12"/>
    <ellipse cx="190" cy="318" rx="15" ry="12" fill="url(#kw-catG)"/><path d="M184 312 v7 M191 311 v7" stroke-width="2.6"/>
    <ellipse cx="226" cy="322" rx="15" ry="12" fill="url(#kw-catG)"/><path d="M220 316 v7 M227 315 v7" stroke-width="2.6"/>
  </g>
  <!-- ?? -> hearts above the pig -->
  <g class="kw-qq" font-family="Playfair, serif" font-style="italic" font-weight="700" font-size="58" fill="#FFD45C" stroke="${INK}" stroke-width="4" paint-order="stroke" stroke-linejoin="round">
    <text x="368" y="92">?</text><text x="398" y="74" font-size="44">?</text>
  </g>
  <g class="kw-hh">${heart(386, 72, 2.3, '#FF6F95', 'kw-h1')}${heart(414, 46, 1.6, '#FF9DB5', 'kw-h2')}</g>
  <!-- little hearts rising from the hug -->
  <g class="kw-rise">${heart(250, 122, 1.2, '#FF8FAB', 'r1')}${heart(214, 104, 0.9, '#FFB3C6', 'r2')}${heart(270, 96, 0.8, '#FF6F95', 'r3')}</g>
</svg>`;

const star = (cls: string) => `<svg class="${cls}" viewBox="-10 -10 20 20"><path d="M0 -10 C1 -3 3 -1 10 0 C3 1 1 3 0 10 C-1 3 -3 1 -10 0 C-3 -1 -1 -3 0 -10 Z" fill="#fff" stroke="#F08AA4" stroke-width="1.2" stroke-linejoin="round"/></svg>`;
const hsvg = (fill: string) => `<svg viewBox="-13 -13 26 22"><path d="M0 6 C-7 -1 -12 -6 -7 -10 C-4 -12.5 -1 -11 0 -8 C1 -11 4 -12.5 7 -10 C12 -6 7 -1 0 6 Z" fill="${fill}"/></svg>`;

export function showKawaii(root: HTMLElement = document.body) {
  document.documentElement.dataset.theme = 'light';
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#FFE4EC');
  const el = document.createElement('section'); el.className = 'kw'; el.setAttribute('aria-live', 'polite');
  const title = t('night.caught');
  const letters = [...title].map((ch, i) => `<span style="--i:${i}">${ch}</span>`).join('');
  const rnd = (a: number, b: number) => a + Math.random() * (b - a);
  let float = '';
  for (let i = 0; i < 16; i++) float += `<i class="kw-f" style="left:${rnd(2, 96)}%;--d:${rnd(7, 13)}s;--del:${-rnd(0, 12)}s;--s:${rnd(.5, 1.25)};--x:${rnd(-30, 30)}px">${hsvg(['#FF9DB5', '#FFC2D1', '#FFFFFF', '#F7A1B8'][i % 4])}</i>`;
  for (let i = 0; i < 12; i++) float += `<i class="kw-tw" style="left:${rnd(3, 97)}%;top:${rnd(4, 94)}%;--d:${rnd(1.6, 3.2)}s;--del:${-rnd(0, 3)}s;--s:${rnd(.5, 1.3)}">${star('')}</i>`;
  let burst = '';
  for (let i = 0; i < 26; i++) { const a = (i / 26) * Math.PI * 2 + rnd(-.1, .1), r = rnd(150, 420);
    burst += `<i class="kw-c kw-c${i % 4}" style="--dx:${Math.cos(a) * r}px;--dy:${Math.sin(a) * r}px;--r:${rnd(-200, 200)}deg;--del:${rnd(0, .12)}s"></i>`; }
  el.innerHTML = `
    <div class="kw-bg"></div><div class="kw-rays"></div><div class="kw-dots"></div>
    <div class="kw-float" aria-hidden="true">${float}</div>
    <div class="kw-burst" aria-hidden="true">${burst}</div>
    <div class="kw-stage">
      <h2 class="kw-title" aria-label="${title}">${letters}</h2>
      <div class="kw-sticker">${ART}${star('kw-s1')}${star('kw-s2')}${star('kw-s3')}</div>
      <p class="kw-sub">${t('night.caught.sub')}</p>
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
  if (!new URLSearchParams(location.search).has('stay')) setTimeout(leave, 12000);
  return el;
}

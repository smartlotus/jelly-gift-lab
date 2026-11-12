// Stage 1 · Meadow - bright Cat-Mario-style pixel platformer -> heart fountain -> door -> /shop/ (docs/GIFT_PLAN.md §5.1).
// main.ts = page shell: chrome (zh/EN + sound), start card, HUD (heart counter), hints, the "Day 200" caption, exit.
import { handleStageParam, markReached, go, prefetchNext, params, dev } from '../../shared/flow';
import { register, t, onLang, apply } from '../../shared/i18n';
import { mountChrome } from '../../shared/chrome';
import { irisIn, irisOut } from '../../shared/transition';
import { stashCanvas } from '../../shared/curtain';
import { onSound, soundOn } from '../../shared/audio';
import { mountTouch } from '../../shared/pixel/touch';
import { startMeadow } from './game';
import { music } from './sfx';
import { tell } from '../../shared/story';
import { mountSurprise } from '../../shared/surprise/kit';
import * as dict from './dict';
import './style.css';

if (!handleStageParam()) {
  register(dict); mountChrome(); markReached();
  const host = document.getElementById('game')!;
  const coarse = matchMedia('(pointer: coarse)').matches;

  // HUD: a pixel heart + counter (site serif, tabular figures)
  const hud = document.createElement('div'); hud.className = 'm-hud';
  hud.innerHTML = `<svg viewBox="0 0 7 6" aria-hidden="true" shape-rendering="crispEdges"><path fill="#FF3B5C" d="M1 0h2v1h1V0h2v1h1v2H6v1H5v1H4v1H3V5H2V4H1V3H0V1h1z"/><path fill="#FF9BB0" d="M1 1h1v1H1z"/></svg><span class="m-count">000</span><span class="m-label" data-i18n="meadow.hearts"></span>`;
  document.body.appendChild(hud);
  const count = hud.querySelector<HTMLSpanElement>('.m-count')!;
  let lastN = -1;
  const setHearts = (n: number, roll = false) => {
    if (n === lastN) return; lastN = n; count.textContent = String(n).padStart(3, '0');
    if (!roll) { hud.classList.remove('bump'); void hud.offsetWidth; hud.classList.add('bump'); }
    hud.classList.toggle('full', n >= 200);
  };
  // hint (fades once she moves)
  const hint = document.createElement('p'); hint.className = 'm-hint'; hint.dataset.i18n = coarse ? 'meadow.hint.touch' : 'meadow.hint.keys';
  document.body.appendChild(hint);
  // the fountain caption
  const cap = document.createElement('div'); cap.className = 'm-cap';
  cap.innerHTML = `<p class="m-cap-k" data-i18n="meadow.day"></p><p class="m-cap-l" data-i18n="meadow.line"></p>`;
  document.body.appendChild(cap);
  // lab: 惊喜 / 跳过 / 收集 on every stage (replaces the old replay-only skip). 跳过 leaves exactly like the door does.
  mountSurprise({ stage: 'meadow', skip: at => { music(false); const snap = stashCanvas(game.screen.canvas); void go('shop', () => irisOut(at.x, at.y, 700, snap?.color || '#5EC4FF', snap?.img)); } });
  apply(); onLang(() => apply());

  mountTouch();
  const skip = params.has('skip');
  let resolveReady!: () => void; const ready = new Promise<void>(r => (resolveReady = r));
  const game = startMeadow(host, {
    hearts: setHearts,
    firstMove: () => setTimeout(() => hint.classList.add('out'), 1800),
    fountain: () => { hud.classList.add('glow'); hint.classList.add('out'); },
    caption: () => { cap.classList.add('on'); setTimeout(() => cap.classList.remove('on'), 4200); },
    nearExit: () => { prefetchNext(); tell('story.meadow.out'); },
    exit: (x, y) => { music(false); const snap = stashCanvas(game.screen.canvas); void go('shop', () => irisOut(x, y, 700, snap?.color || '#5EC4FF', snap?.img)); },
  }, { ready, at: params.get('at'), dev });

  // portrait phones: show more of the level (smaller minimum width => bigger pixels)
  const fit = () => game.screen.configure(innerHeight > innerWidth ? { minW: 224, minH: 192 } : { minW: 288, minH: 192 });
  fit(); window.addEventListener('resize', fit);

  void irisIn();
  const begin = () => { resolveReady(); hint.classList.add('on'); music(soundOn()); };
  begin(); // v03g: no title card — she lands straight in the level (audio unlocks on her first touch, see chrome.ts)
  onSound(v => music(v));
  void t;
}

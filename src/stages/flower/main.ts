import { register, apply, onLang } from '../../shared/i18n';
import { mountChrome } from '../../shared/chrome';
import { markReached, go, prefetchNext, reducedMotion } from '../../shared/flow';
import { irisIn, irisOut } from '../../shared/transition';
import { stashCanvas, peekCarry, clearCarry } from '../../shared/curtain';
import { startWander } from '../wander/engine';
import { preloadArt } from '../../art/loader';
import { startFlowerAudio, leaveFlower, rustle } from './sfx';
import { tell } from '../../shared/story';
import * as dict from './dict';
import './style.css';

register(dict); mountChrome(); markReached(); apply(); onLang(() => apply());
const host = document.getElementById('flower')!;
const coarse = matchMedia('(pointer: coarse)').matches;
const hint = document.createElement('p'); hint.className = 'fl-hint'; hint.dataset.i18n = coarse ? 'flower.hint.touch' : 'flower.hint.keys';
document.body.appendChild(hint); apply();
startFlowerAudio();
await preloadArt();
let left = false, hinted = false;
const wood = startWander({
  host, theme: 'flower',
  onNearExit: () => { prefetchNext(); tell('story.flower.out'); },
  onExit: (x, y) => {
    if (left) return; left = true;
    const snap = stashCanvas(wood.screen.canvas);
    leaveFlower();
    void go('mushroom', () => reducedMotion() ? Promise.resolve() : irisOut(x, y, 720, snap?.color || '#5a4038', snap?.img));
  },
});
const fit = () => wood.screen.configure(innerHeight > innerWidth ? { minW: 176, minH: 248 } : { minW: 300, minH: 168 });
fit(); window.addEventListener('resize', fit);
const carry = peekCarry();
void irisIn(innerWidth * 0.2, innerHeight * 0.72, 700, carry?.color || '#f3d4e0', carry?.img).then(() => clearCarry());
hint.classList.add('on');
const tick = () => { rustle(wood.t); if (!hinted && wood.x > 80) { hinted = true; setTimeout(() => hint.classList.add('out'), 1400); } };
window.setInterval(tick, 240);
setTimeout(() => hint.classList.add('out'), 7000);
if (new URLSearchParams(location.search).get('at') !== 'end') setTimeout(() => tell('story.flower.in'), 1200);

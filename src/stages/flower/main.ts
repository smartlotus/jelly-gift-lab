import { register, apply, onLang } from '../../shared/i18n';
import { mountChrome } from '../../shared/chrome';
import { markReached, go, prefetchNext, reducedMotion } from '../../shared/flow';
import { irisIn, irisOut } from '../../shared/transition';
import { startWander } from '../wander/engine';
import { startFlowerAudio, leaveFlower, rustle } from './sfx';
import * as dict from './dict';
import './style.css';

register(dict); mountChrome(); markReached(); apply(); onLang(() => apply());
const host = document.getElementById('flower')!;
const coarse = matchMedia('(pointer: coarse)').matches;
const hint = document.createElement('p'); hint.className = 'fl-hint'; hint.dataset.i18n = coarse ? 'flower.hint.touch' : 'flower.hint.keys';
document.body.appendChild(hint); apply();
startFlowerAudio();
let left = false, hinted = false;
const wood = startWander({
  host, theme: 'flower',
  onNearExit: () => prefetchNext(),
  onExit: (x, y) => {
    if (left) return; left = true; leaveFlower();
    void go('mushroom', () => reducedMotion() ? Promise.resolve() : irisOut(x, y, 720, '#c888a8'));
  },
});
const fit = () => wood.screen.configure(innerHeight > innerWidth ? { minW: 210, minH: 186 } : { minW: 280, minH: 176 });
fit(); window.addEventListener('resize', fit);
void irisIn(innerWidth * 0.2, innerHeight * 0.72, 700, '#f3d4e0');
hint.classList.add('on');
const tick = () => { rustle(wood.t); if (!hinted && wood.x > 80) { hinted = true; setTimeout(() => hint.classList.add('out'), 1400); } };
window.setInterval(tick, 240);
setTimeout(() => hint.classList.add('out'), 7000);

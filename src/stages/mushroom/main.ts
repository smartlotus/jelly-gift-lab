import { register, apply, onLang } from '../../shared/i18n';
import { mountChrome } from '../../shared/chrome';
import { markReached, go, prefetchNext, reducedMotion } from '../../shared/flow';
import { irisIn, irisOut } from '../../shared/transition';
import { startWander } from '../wander/engine';
import { startGroveAudio, leaveGrove, drip } from './sfx';
import { tell } from '../../shared/story';
import * as dict from './dict';
import './style.css';

register(dict); mountChrome({ theme: 'dark' }); markReached(); apply(); onLang(() => apply());
const host = document.getElementById('mushroom')!;
const coarse = matchMedia('(pointer: coarse)').matches;
const hint = document.createElement('p'); hint.className = 'mu-hint'; hint.dataset.i18n = coarse ? 'mushroom.hint.touch' : 'mushroom.hint.keys';
document.body.appendChild(hint); apply();
startGroveAudio();
let left = false, hinted = false;
const wood = startWander({
  host, theme: 'mushroom',
  onNearExit: () => { prefetchNext(); tell('story.mushroom.out'); },
  onExit: (x, y) => {
    if (left) return; left = true; leaveGrove();
    void go('shop', () => reducedMotion() ? Promise.resolve() : irisOut(x, y, 720, '#1a2830'));
  },
});
const fit = () => wood.screen.configure(innerHeight > innerWidth ? { minW: 176, minH: 248 } : { minW: 300, minH: 168 });
fit(); window.addEventListener('resize', fit);
void irisIn(innerWidth * 0.2, innerHeight * 0.72, 720, '#c888a8');
hint.classList.add('on');
const tick = () => { drip(wood.t); if (!hinted && wood.x > 80) { hinted = true; setTimeout(() => hint.classList.add('out'), 1400); } };
window.setInterval(tick, 240);
setTimeout(() => hint.classList.add('out'), 7000);
if (new URLSearchParams(location.search).get('at') !== 'end') setTimeout(() => tell('story.mushroom.in'), 1200);

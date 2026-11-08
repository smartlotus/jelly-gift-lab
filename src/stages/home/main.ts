// /home/ · after 一起玩: pig and cat find an empty house, furnish a future home (spatial Module A),
// then a cinematic (Module B) plays a fixed, art-directed life-together montage — independent of the layout.
import { register, apply, onLang, t } from '../../shared/i18n';
import { mountChrome } from '../../shared/chrome';
import { markReached, go, params, reducedMotion } from '../../shared/flow';
import { irisIn, irisOut } from '../../shared/transition';
import { peekCarry, clearCarry } from '../../shared/curtain';
import { PixelScreen } from '../../shared/pixel/screen';
import { startLoop } from '../../shared/pixel/loop';
import { catSprites, catFrame } from '../../shared/pixel/cat';
import { pigSprites, pigFrame } from '../../shared/pixel/pig';
import { createApproach } from './approach';
import { drawCinematicRoom } from './cineRoom';
import { createMontage, type MontageApi } from './montage';
import { drawPerson } from './people';
import { preloadArt } from '../../art/loader';
import { clearLayout } from './save';
import { startHomeAudio, toDream, leaveHome } from './sfx';
import * as dict from './dict';
import './style.css';

register(dict); mountChrome(); markReached();
await preloadArt();
if (params.has('fresh')) clearLayout();

type Phase = 'approach' | 'room' | 'transform' | 'montage';
const at = params.get('at') || '';
let phase: Phase = at === 'room' || at === 'transform' || ['walk', 'greet', 'sofa', 'sleep', 'snow', 'dawn', 'finale'].includes(at) ? (at === 'room' ? 'room' : at === 'transform' ? 'transform' : 'montage') : 'approach';

const host = document.getElementById('home')!;
const screen = new PixelScreen({ host, minW: 176, minH: 248, maxH: 640 });
const catSp = catSprites();
const pigSp = pigSprites();

const line = document.createElement('p'); line.className = 'hm-line'; line.dataset.i18n = 'home.found';
const finale = document.createElement('p'); finale.className = 'hm-finale'; finale.dataset.i18n = 'home.finale';
const skip = document.createElement('button'); skip.type = 'button'; skip.className = 'hm-skip'; skip.dataset.i18n = 'home.skip';
const replay = document.createElement('button'); replay.type = 'button'; replay.className = 'hm-replay'; replay.dataset.i18n = 'home.replay';
const again = document.createElement('button'); again.type = 'button'; again.className = 'hm-again'; again.dataset.i18n = 'home.again';
const edit = document.createElement('button'); edit.type = 'button'; edit.className = 'hm-edit'; edit.dataset.i18n = 'home.edit';
document.body.append(line, finale, skip, replay, again, edit);
apply(); onLang(() => apply());

startHomeAudio('hearth');

let approach = createApproach();
type DecorateApi = import('./decorate/world').DecorateApi;
let room: DecorateApi | null = null;
let montage: MontageApi | null = null;
let transformT = 0;
let spark: { x: number; y: number; vx: number; vy: number; life: number }[] = [];

async function enterRoom() {
  phase = 'room';
  document.body.classList.add('hm-decorating');
  document.body.classList.remove('hm-on-finale');
  line.classList.remove('on');
  finale.classList.remove('on');
  montage?.replay();
  montage = null;
  const { createDecorate } = await import('./decorate/world');
  room = createDecorate(document.body);
  room.onSave = () => { leaveRoom(); };
  if (params.has('furnish')) room.furnishDemo();
}

function leaveRoom() {
  document.body.classList.remove('hm-decorating', 'hm-portrait', 'hm-turn-skip');
  room?.destroy(); room = null;
  phase = 'transform'; transformT = 0;
  line.dataset.i18n = 'home.transform'; apply(); line.classList.add('on');
  toDream();
  const floor = screen.h - 24;
  for (let i = 0; i < 40; i++) spark.push({ x: screen.w * 0.5 + (Math.random() - 0.5) * 40, y: floor - 20 + Math.random() * 10, vx: (Math.random() - 0.5) * 26, vy: -10 - Math.random() * 30, life: 0.8 + Math.random() });
}

function enterMontage() {
  phase = 'montage';
  line.classList.remove('on');
  // Module B never reads the player's layout.
  montage = createMontage();
  if (['walk', 'greet', 'sofa', 'sleep', 'snow', 'dawn', 'finale'].includes(at)) {
    const startT = at === 'dawn' ? 5.5 : at === 'walk' ? 2.6 : at === 'greet' ? 3.6 : at === 'snow' ? 2.4 : at === 'finale' ? 1.2 : 1.8;
    montage.seek(at as 'walk', startT);
  }
}

if (phase === 'room') await enterRoom();
else if (phase === 'transform') { await enterRoom(); leaveRoom(); }
else if (phase === 'montage') enterMontage();

skip.addEventListener('click', () => {
  if (phase === 'approach') approach.skip();
  else if (phase === 'transform') enterMontage();
  else if (phase === 'montage') montage?.skip();
});
replay.addEventListener('click', () => {
  finale.classList.remove('on');
  document.body.classList.remove('hm-on-finale');
  montage?.replay();
});
again.addEventListener('click', () => { leaveHome(); void go('meadow', () => reducedMotion() ? Promise.resolve() : irisOut(innerWidth / 2, innerHeight / 2, 700, '#f3ebe0')); });
edit.addEventListener('click', () => { void enterRoom(); });

const reduced = reducedMotion();
startLoop(dt => {
  if (phase === 'approach') {
    approach.update(dt);
    line.classList.toggle('on', approach.lineOn);
    if (approach.done) void enterRoom();
  } else if (phase === 'room') {
    room?.update(dt);
  } else if (phase === 'transform') {
    transformT += dt;
    for (const s of spark) { s.x += s.vx * dt; s.y += s.vy * dt; s.vy += 18 * dt; s.life -= dt; }
    spark = spark.filter(s => s.life > 0);
    if (transformT > (reduced ? 2.2 : 5.2)) enterMontage();
  } else {
    montage?.update(dt);
    if (montage?.scene === 'finale') {
      document.body.classList.add('hm-on-finale');
      if ((montage.finaleT) > 0.8) finale.classList.add('on');
    }
  }
}, () => {
  const g = screen.ctx, w = screen.w, h = screen.h;
  if (phase === 'approach') {
    approach.render(g, w, h);
  } else if (phase === 'room') {
    // Module A draws itself in WebGL.
  } else if (phase === 'transform') {
    drawCinematicRoom(g, w, h);
    const floor = Math.round(h * 0.72);
    const k = Math.max(0, Math.min(1, (transformT - 0.6) / 2.4));
    g.save(); g.globalAlpha = 1 - k;
    const pig = pigFrame(pigSp, { vx: 0, vy: 0, ground: true }, transformT, 1);
    const cat = catFrame(catSp, { vx: 0, vy: 0, ground: true }, transformT, 1);
    const blit = (img: HTMLCanvasElement, x: number) => {
      g.save(); g.imageSmoothingEnabled = false; g.translate(x, floor); g.scale(1.4, 1.4); g.drawImage(img, 0, -img.height); g.restore();
    };
    blit(pig, Math.round(w * 0.38)); blit(cat, Math.round(w * 0.52));
    g.restore();
    g.save(); g.globalAlpha = k; drawPerson(g, 'him', 'stand', w * 0.38, floor, false, transformT); g.restore();
    g.save(); g.globalAlpha = k; drawPerson(g, 'her', 'stand', w * 0.58, floor, false, transformT); g.restore();
    g.fillStyle = '#FFE8A0';
    for (const s of spark) { g.globalAlpha = Math.max(0, s.life); g.fillRect(s.x | 0, s.y | 0, 2, 2); }
    g.globalAlpha = 1;
  } else {
    montage?.render(g, w, h);
  }
});

const fit = () => {
  if (phase === 'room') screen.configure(innerHeight > innerWidth ? { minW: 210, minH: 200 } : { minW: 300, minH: 168 });
  else screen.configure(innerHeight > innerWidth ? { minW: 176, minH: 248 } : { minW: 300, minH: 168 });
};
fit(); window.addEventListener('resize', fit);

const carry = peekCarry();
void irisIn(innerWidth * 0.7, innerHeight * 0.6, 700, carry?.color || '#f3ebe0', carry?.img).then(() => clearCarry());
void t;

(window as unknown as { __home?: { phase: () => string; skip: () => void; save: () => void; seek: (id: string, tt?: number) => void; edit: () => void } }).__home = {
  phase: () => phase === 'montage' ? (montage?.scene ?? phase) : phase,
  skip: () => skip.click(),
  save: () => (window as unknown as { __homeRoom?: { save: () => void } }).__homeRoom?.save(),
  seek: (id: string, tt = 0) => montage?.seek(id as 'walk', tt),
  edit: () => { void enterRoom(); },
};

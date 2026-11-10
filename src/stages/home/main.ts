// /home/ · after 一起玩: pig and cat find an empty house, furnish a future home (spatial Module A),
// then Module B — the fixed future-home film (an independently produced, reviewed MP4; see endingFilm.ts) —
// plays the same picture for every layout. Until that asset is committed the journey ends on the end card.
import { register, apply, onLang, t } from '../../shared/i18n';
import { mountChrome } from '../../shared/chrome';
import { markReached, go, params, reducedMotion } from '../../shared/flow';
import { irisIn, irisOut } from '../../shared/transition';
import { peekCarry, clearCarry } from '../../shared/curtain';
import { PixelScreen } from '../../shared/pixel/screen';
import { startLoop } from '../../shared/pixel/loop';
import { createApproach } from './approach';
import { createFilm, type FilmApi } from './film';
import { drawPerson } from './people';
import { preloadArt } from '../../art/loader';
import { clearLayout } from './save';
import { startHomeAudio, toDream, leaveHome } from './sfx';
import { stopTune, startMusic } from '../../shared/music';
import { probeFutureFilm, createFilmPlayer, type FilmPlayer, type FilmManifest } from './endingFilm';
import * as dict from './dict';
import './style.css';

register(dict); mountChrome(); markReached();
await preloadArt();
if (params.has('fresh')) clearLayout();

// ── Module B ────────────────────────────────────────────────────────────────
// FILM_ENABLED wires the old code-drawn six-shot film (film.ts, parked; bookmark branch v03o-film).
// It stays false: t26 replaces it with an independently produced future-home MP4 played by endingFilm.ts.
// The /sky/ 200-day film is NOT the ending (t26) — it stays an optional film on /sky/.
export const FILM_ENABLED = false;

type Phase = 'approach' | 'room' | 'transform' | 'montage' | 'video' | 'end';
const at = params.get('at') || '';
const filmAt = ['walk', 'greet', 'sofa', 'sleep', 'snow', 'dawn', 'finale'].includes(at);
let phase: Phase = at === 'room' ? 'room'
  : at === 'transform' ? (FILM_ENABLED ? 'transform' : 'end')
  : filmAt ? (FILM_ENABLED ? 'montage' : 'end')
  : at === 'video' ? 'video'
  : 'approach';

const host = document.getElementById('home')!;
const screen = new PixelScreen({ host, minW: 176, minH: 248, maxH: 640 });

const line = document.createElement('p'); line.className = 'hm-line'; line.dataset.i18n = 'home.found';
const finale = document.createElement('p'); finale.className = 'hm-finale'; finale.dataset.i18n = 'home.finale';
const skip = document.createElement('button'); skip.type = 'button'; skip.className = 'hm-skip'; skip.dataset.i18n = 'home.skip';
const replay = document.createElement('button'); replay.type = 'button'; replay.className = 'hm-replay'; replay.dataset.i18n = 'home.replay';
const again = document.createElement('button'); again.type = 'button'; again.className = 'hm-again'; again.dataset.i18n = 'home.again';
const edit = document.createElement('button'); edit.type = 'button'; edit.className = 'hm-edit'; edit.dataset.i18n = 'home.edit';
if (FILM_ENABLED) document.body.classList.add('hm-code-film');
document.body.append(line, finale, skip, replay, again, edit);
apply(); onLang(() => apply());

startHomeAudio('hearth');

let approach = createApproach();
type DecorateApi = import('./decorate/world').DecorateApi;
let room: DecorateApi | null = null;
let film: FilmApi | null = null;
let transformT = 0;
let endT = 0;
let endFromFilm = false;
let player: FilmPlayer | null = null;
let manifest: FilmManifest | null = null;
let finaleInFilm = false;
const manifestReady = probeFutureFilm().then(m => { manifest = m; document.body.classList.toggle('hm-has-film', !!m); return m; });
let spark: { x: number; y: number; vx: number; vy: number; life: number }[] = [];

async function enterRoom() {
  phase = 'room';
  document.body.classList.add('hm-decorating');
  document.body.classList.remove('hm-on-finale', 'hm-endcard');
  line.classList.remove('on');
  finale.classList.remove('on');
  film?.replay();
  film = null;
  const { createDecorate } = await import('./decorate/world');
  room = createDecorate(document.body);
  room.onSave = () => { leaveRoom(); };
  if (params.has('furnish')) room.furnishDemo();
}

function leaveRoom() {
  document.body.classList.remove('hm-decorating', 'hm-portrait', 'hm-turn-skip');
  room?.destroy(); room = null;
  transformT = 0; endT = 0;
  phase = 'transform';
  document.body.classList.add('hm-endcard');   // centred paper typography, not the old caption bar
  line.dataset.i18n = 'home.transform'; apply();
  // a film that carries this line in its own picture gets no second copy on top
  if (!manifest?.burned?.transform) line.classList.add('on');
  toDream();
  // future-home film (when the reviewed asset is in): starts muted under the veil, so the cream clears onto it
  if (!FILM_ENABLED) void manifestReady.then(m => { if (m && phase === 'transform') startEndingFilm(m); });
  // The film starts under the veil: the dollhouse light blooms, and the first shot of the film is
  // already there when the cream clears — no cut, no pixel sprites.
  if (FILM_ENABLED) { film = createFilm(); fit(); }
  if (!FILM_ENABLED) return;
  const floor = screen.h - 24;
  for (let i = 0; i < 40; i++) spark.push({ x: screen.w * 0.5 + (Math.random() - 0.5) * 40, y: floor - 20 + Math.random() * 10, vx: (Math.random() - 0.5) * 26, vy: -10 - Math.random() * 30, life: 0.8 + Math.random() });
}

/** Module B: the fixed future-home film. Same picture for every layout; never reads the save. */
function startEndingFilm(m: FilmManifest) {
  if (player) return;
  player = createFilmPlayer(m, {
    onEnded: () => toEndCard(),
    // a film with its own soundtrack takes over from the page music, which comes back on the end card
    onAudio: audible => { if (audible) stopTune(0.8); },
  });
  // the veil has to clear first, otherwise the caption sits on the opening frame of the film
  const p = player;
  window.setTimeout(() => p.show(), reduced ? 300 : 1050);
}

function stopEndingFilm() {
  const p = player;
  player = null;
  p?.close();
}

function toEndCard() {
  if (phase === 'end') return;
  const fromFilm = !!player;
  const fin = manifest?.burned?.finale;
  finaleInFilm = fromFilm && fin !== undefined && (player?.time() ?? 0) >= fin;
  document.body.classList.toggle('hm-finale-in-film', finaleInFilm);
  stopEndingFilm();
  if (fromFilm) startMusic('dream');
  document.body.classList.add('hm-endcard');
  endFromFilm = true;          // the "maybe one day" line already played before the film
  line.classList.remove('on');
  phase = 'end';
  endT = 0;
}

function enterMontage() {
  if (!FILM_ENABLED) { phase = 'end'; endT = 0; return; }
  phase = 'montage';
  line.classList.remove('on');
  // Module B never reads the player's layout.
  film ??= createFilm();
  if (['walk', 'greet', 'sofa', 'sleep', 'snow', 'dawn', 'finale'].includes(at)) {
    const startT = at === 'dawn' ? 5.5 : at === 'walk' ? 2.6 : at === 'greet' ? 3.6 : at === 'snow' ? 2.4 : at === 'finale' ? 1.2 : 1.8;
    film.seek(at as 'walk', startT);
  }
}

skip.addEventListener('click', () => {
  if (phase === 'approach') approach.skip();
  else if (phase === 'transform') { if (FILM_ENABLED) enterMontage(); else toEndCard(); }
  else if (phase === 'montage') film?.skip();
  else if (phase === 'video') toEndCard();
  else if (phase === 'end') endT = 4;
});
replay.addEventListener('click', () => {
  finale.classList.remove('on');
  document.body.classList.remove('hm-on-finale');
  if (FILM_ENABLED) { film?.replay(); return; }
  if (!manifest) return;
  endFromFilm = false;
  document.body.classList.remove('hm-on-finale');
  phase = 'video';
  startEndingFilm(manifest);
  player?.show();
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
    if (transformT > (reduced ? 1.3 : 2.0)) {
      if (FILM_ENABLED) enterMontage();
      else if (player) { phase = 'video'; line.classList.remove('on'); }
      // no reviewed film yet: let the page line breathe, then the end card (never a placeholder film)
      else if (transformT > (reduced ? 2.0 : 3.4) && manifest === null) toEndCard();
    }
  } else if (phase === 'video') {
    // the film drives itself; if the browser refused to start it, let a tap do it
    // the player shows its own tap / loading states
  } else if (phase === 'end') {
    endT += dt;
    // when the end card is reached directly (dev link) the first line still needs to play;
    // when it follows the film, that line already played, so the closing line comes sooner
    if (!endFromFilm && endT < 0.2) { line.dataset.i18n = 'home.transform'; apply(); line.classList.add('on'); }
    if (endT > (endFromFilm ? 0.6 : 2.6)) line.classList.remove('on');
    if (endT > (endFromFilm ? 0.9 : 3.2)) {
      document.body.classList.add('hm-on-finale');
      // the film already showed the closing line in its last shot: the end card keeps only the buttons
      if (!finaleInFilm) finale.classList.add('on');
    }
  } else {
    film?.update(dt);
    if (film?.scene === 'finale') {
      document.body.classList.add('hm-on-finale');
      if ((film.finaleT) > 0.8) finale.classList.add('on');
    }
  }
}, () => {
  const g = screen.ctx, w = screen.w, h = screen.h;
  if (phase === 'approach') {
    approach.render(g, w, h);
  } else if (phase === 'room') {
    // Module A draws itself in WebGL.
  } else if (phase === 'transform') {
    // No pixel cutaway any more: the film's first frame is already on screen, and a warm veil
    // (the light of the room we just left) lifts off it while the dust settles.
    film?.render(g, w, h);
    const k = Math.max(0, Math.min(1, (transformT - 0.25) / (reduced ? 1.4 : 2.6)));
    const veil = 1 - k;
    if (veil > 0.001) {
      g.save();
      g.globalAlpha = veil;
      const grd = g.createRadialGradient(w * 0.5, h * 0.42, Math.min(w, h) * 0.10, w * 0.5, h * 0.5, Math.max(w, h) * 0.72);
      grd.addColorStop(0, '#FFF7EA');
      grd.addColorStop(0.55, '#F6ECDC');
      grd.addColorStop(1, '#E4D3B8');
      g.fillStyle = grd;
      g.fillRect(0, 0, w, h);
      g.restore();
    }
    for (const sp of spark) {
      g.globalAlpha = Math.max(0, sp.life) * 0.85;
      g.fillStyle = '#FFE8A0';
      g.fillRect(sp.x | 0, sp.y | 0, 2, 2);
    }
    g.globalAlpha = 1;
  } else if (phase === 'video') {
    // the <video> covers this; keep the canvas on the same paper tone so letterboxing reads as a page
    g.fillStyle = '#EFE6D6';
    g.fillRect(0, 0, w, h);
  } else if (phase === 'end') {
    // 静态结尾卡：暖光落在纸上，没有影片，只有最后那句话
    const k = Math.min(1, endT / 2.4);
    const grd = g.createRadialGradient(w * 0.5, h * 0.42, Math.min(w, h) * 0.06, w * 0.5, h * 0.52, Math.max(w, h) * 0.8);
    grd.addColorStop(0, '#FFF9EF');
    grd.addColorStop(0.42, '#F7EDDC');
    grd.addColorStop(1, '#E2D0B4');
    g.fillStyle = grd;
    g.fillRect(0, 0, w, h);
    // a slow warm bloom, as if the room's lamp were still on somewhere off-frame
    const bloom = 0.16 + Math.sin(endT * 0.7) * 0.03;
    const b = g.createRadialGradient(w * 0.5, h * 0.46, 0, w * 0.5, h * 0.46, Math.max(w, h) * 0.55);
    b.addColorStop(0, `rgba(255,214,150,${bloom.toFixed(3)})`);
    b.addColorStop(1, 'rgba(255,214,150,0)');
    g.fillStyle = b;
    g.fillRect(0, 0, w, h);
    // dust
    for (let i = 0; i < 22; i++) {
      const dx = ((i * 137.5 + endT * (4 + (i % 3) * 3)) % (w + 40)) - 20;
      const dy = (h * 0.18 + ((i * 71) % (h * 0.62)) + Math.sin(endT * 0.4 + i) * 10) % h;
      g.fillStyle = `rgba(255,236,205,${0.10 + ((i % 4) / 4) * 0.14})`;
      g.beginPath(); g.arc(dx, dy, 1.1 + (i % 3), 0, Math.PI * 2); g.fill();
    }
    // vignette
    const vg = g.createRadialGradient(w * 0.5, h * 0.5, Math.min(w, h) * 0.30, w * 0.5, h * 0.5, Math.max(w, h) * 0.78);
    vg.addColorStop(0, 'rgba(60,44,30,0)');
    vg.addColorStop(1, `rgba(60,44,30,${(0.16 + 0.10 * k).toFixed(3)})`);
    g.fillStyle = vg;
    g.fillRect(0, 0, w, h);
  } else {
    film?.render(g, w, h);
  }
});

const fit = () => {
  if (phase === 'room') screen.configure(innerHeight > innerWidth ? { minW: 210, minH: 200, maxH: 640 } : { minW: 300, minH: 168, maxH: 640 });
  else if (phase === 'transform' || phase === 'montage' || phase === 'end' || phase === 'video') {
    // vector art, not pixels: run at ~1 canvas pixel per CSS pixel (the integer scaler still applies)
    screen.configure(innerHeight > innerWidth ? { minW: 540, minH: 960, maxH: 4000 } : { minW: 900, minH: 520, maxH: 4000 });
  } else screen.configure(innerHeight > innerWidth ? { minW: 176, minH: 248, maxH: 640 } : { minW: 300, minH: 168, maxH: 640 });
};
fit(); window.addEventListener('resize', fit);

// dev entry points run after fit() is initialised (leaveRoom calls it)
if (phase === 'room') await enterRoom();
else if (phase === 'transform') { await enterRoom(); leaveRoom(); }
else if (phase === 'montage') enterMontage();
else if (phase === 'video') void manifestReady.then(m => { if (m) { startEndingFilm(m); player?.show(); } else toEndCard(); });
else if (phase === 'end') document.body.classList.add('hm-endcard');

const carry = peekCarry();
void irisIn(innerWidth * 0.7, innerHeight * 0.6, 700, carry?.color || '#f3ebe0', carry?.img).then(() => clearCarry());
void t;

(window as unknown as { __home?: { phase: () => string; film: () => string; skip: () => void; save: () => void; seek: (id: string, tt?: number) => void; edit: () => void } }).__home = {
  phase: () => phase === 'montage' ? (film?.scene ?? phase) : phase,
  film: () => player?.state() ?? (manifest ? 'ready' : 'none'),
  skip: () => skip.click(),
  save: () => (window as unknown as { __homeRoom?: { save: () => void } }).__homeRoom?.save(),
  seek: (id: string, tt = 0) => film?.seek(id as 'walk', tt),
  edit: () => { void enterRoom(); },
};

// Module B player: the fixed "future home" film that follows 保存布局.
//
// The film is an independently produced, reviewed MP4. It never reads the player's layout — it is the same
// picture for every save. Until the reviewed asset is committed, there is NO film and NO placeholder: the
// manifest below is absent, `probeFutureFilm()` resolves null and the journey ends on the static end card.
//
// Which film plays is decided by ONE manifest, public/media/ending-film.json:
//   { "v": 1, "src": "media/<film>.mp4", "poster": "media/<film>-poster.jpg",
//     "audio": true|false, "burned": { "transform": [a, b], "finale": c } }   (burned only if the lines are in the picture)
//   the MP4: H.264 + AAC, faststart (moov first), ≤ 1080p
// t33 (branch v03s-anniv-ending): ending-film.json points at the 200-day film media/anniv-200.mp4 (no burned lines).
// The v4 future-home film and its old manifest (future-home.json / .mp4 / -poster.jpg) stay committed but unused;
// to switch back, copy future-home.json's contents into ending-film.json.
import { asset } from '../../shared/flow';
import { soundOn, onSound, unlock } from '../../shared/audio';
import { apply } from '../../shared/i18n';

/**
 * `burned`: protected lines that are already rendered into the picture (seconds). The page then does not put the
 * same words on top: no page caption for `transform`, and no second finale text on the end card once the film has
 * played past `finale`. Absent → the page shows both lines itself.
 */
export interface FilmManifest { v: number; src: string; poster?: string; audio?: boolean; burned?: { transform?: [number, number]; finale?: number };
  /** 2026-11-14: lighter encodes; the page picks one by screen size and connection (src stays the default) */
  sources?: { src: string; h: number }[] }

type Conn = { saveData?: boolean; effectiveType?: string; downlink?: number };
/** 720p by default; 480p on a slow or data-saving connection, or when the film box is small on screen */
export function pickFilmSource(m: FilmManifest): string {
  const list = (m.sources ?? []).filter(s => typeof s.src === 'string' && s.src.endsWith('.mp4')).sort((a, b) => b.h - a.h);
  if (!list.length) return m.src;
  const c = (navigator as Navigator & { connection?: Conn }).connection;
  const slow = !!c && (c.saveData === true || /(^|-)2g$|^3g$/.test(c.effectiveType || '') || (typeof c.downlink === 'number' && c.downlink > 0 && c.downlink < 2.5));
  // device px height of a 16:9 film fitted into the viewport
  const boxH = Math.min(innerHeight, innerWidth * 9 / 16) * Math.min(devicePixelRatio || 1, 2);
  const want = slow ? 480 : boxH <= 560 ? 480 : 720;
  return (list.find(s => s.h <= want) ?? list[list.length - 1]).src;
}

// One <video> per page, made early so it can buffer before the ending: prepareFilm(m, 'metadata') when the manifest
// arrives, prepareFilm(m, 'auto') once the ending is near (the room / save step), then createFilmPlayer() adopts it.
let warm: HTMLVideoElement | null = null;
function makeVideo(m: FilmManifest): HTMLVideoElement {
  const v = document.createElement('video');
  v.className = 'hm-film-v';
  v.setAttribute('playsinline', '');
  v.setAttribute('webkit-playsinline', '');
  // WeChat / QQ (X5 · XWeb) and UC otherwise lift the film into their own native player
  v.setAttribute('x5-playsinline', ''); v.setAttribute('x5-video-player-type', 'h5-page'); v.setAttribute('t7-video-player-type', 'inline');
  v.setAttribute('disablepictureinpicture', '');
  v.setAttribute('controlslist', 'nodownload noplaybackrate');
  v.muted = true; v.defaultMuted = true; v.setAttribute('muted', '');
  v.preload = 'metadata';
  if (m.poster) v.poster = asset(m.poster);
  v.src = asset(pickFilmSource(m));
  return v;
}
export function prepareFilm(m: FilmManifest, preload: 'metadata' | 'auto') {
  warm ??= makeVideo(m);
  if (preload === 'auto' && warm.preload !== 'auto') { warm.preload = 'auto'; try { warm.load(); } catch { /* */ } }
  return warm;
}

export const FUTURE_FILM_MANIFEST = 'media/ending-film.json';

let probed: Promise<FilmManifest | null> | null = null;

/** a browser without an H.264 decoder (some Linux builds) keeps the end card instead of a black box */
function canPlayMp4(): boolean {
  try { return document.createElement('video').canPlayType('video/mp4; codecs="avc1.42E01E, mp4a.40.2"') !== ''; } catch { return false; }
}

/** fetch the manifest once; any failure (404 while the film is in production, offline, bad JSON) → null */
export function probeFutureFilm(): Promise<FilmManifest | null> {
  probed ??= fetch(asset(FUTURE_FILM_MANIFEST), { cache: 'no-cache' })
    .then(r => (r.ok ? r.json() : null))
    .then((m: FilmManifest | null) => (m && typeof m.src === 'string' && m.src.endsWith('.mp4') && canPlayMp4() ? m : null))
    .catch(() => null);
  return probed;
}

export interface FilmPlayer {
  readonly el: HTMLDivElement;
  readonly video: HTMLVideoElement;
  /** fade the film layer in (the page line can stay on top until then) */
  show(): void;
  /** stop, fade out and remove */
  close(): void;
  /** user-facing state for tests / review */
  state(): 'loading' | 'tap' | 'playing' | 'paused' | 'ended' | 'error' | 'closed';
  /** seconds into the film (the film's own clock — picture and its embedded soundtrack stay in sync) */
  time(): number;
}

export interface PlayerHooks {
  onEnded: () => void;
  /** film has its own soundtrack and sound is on → the page music should step aside (and come back after) */
  onAudio?: (filmAudible: boolean) => void;
}

export function createFilmPlayer(m: FilmManifest, hooks: PlayerHooks): FilmPlayer {
  let st: ReturnType<FilmPlayer['state']> = 'loading';
  const wrap = document.createElement('div');
  wrap.className = 'hm-film loading';
  const v = warm ?? makeVideo(m); warm = null;
  v.preload = 'auto';
  v.muted = true;                     // a muted start is always allowed; sound follows the site switch once playing
  wrap.appendChild(v);

  const load = document.createElement('p');
  load.className = 'hm-film-load'; load.dataset.i18n = 'home.film.loading';
  const tap = document.createElement('button');
  tap.type = 'button'; tap.className = 'hm-film-tap'; tap.dataset.i18n = 'home.film.play';
  wrap.append(load, tap);
  document.body.appendChild(wrap);
  document.body.classList.add('hm-watching');
  apply();

  const hasAudio = m.audio !== false;
  const syncMute = () => {
    const audible = hasAudio && soundOn();
    v.muted = !audible;
    hooks.onAudio?.(audible && !v.paused);
  };
  const off = { done: false };
  onSound(() => { if (!off.done) syncMute(); });

  const start = () => {
    unlock();
    void v.play().then(() => { st = 'playing'; wrap.classList.remove('tap'); syncMute(); }).catch(() => { st = 'tap'; wrap.classList.add('tap'); });
  };
  // WeChat (X5 · XWeb) only lets a muted inline video autoplay from inside its JS bridge callback
  const wx = (window as unknown as { WeixinJSBridge?: { invoke: (n: string, a: object, cb: () => void) => void } });
  const viaBridge = () => { try { wx.WeixinJSBridge?.invoke('getNetworkType', {}, () => { if (v.paused && st !== 'ended' && st !== 'closed') start(); }); } catch { /* */ } };
  if (/MicroMessenger/i.test(navigator.userAgent)) { if (wx.WeixinJSBridge) viaBridge(); else document.addEventListener('WeixinJSBridgeReady', viaBridge, { once: true }); }
  tap.addEventListener('click', e => { e.stopPropagation(); start(); });
  wrap.addEventListener('click', () => { if (v.paused && st !== 'ended') start(); });
  v.addEventListener('waiting', () => wrap.classList.add('loading'));
  v.addEventListener('playing', () => { st = 'playing'; wrap.classList.remove('loading', 'tap'); });
  v.addEventListener('canplay', () => wrap.classList.remove('loading'));
  v.addEventListener('pause', () => { if (st === 'playing') st = 'paused'; hooks.onAudio?.(false); });
  v.addEventListener('ended', () => { st = 'ended'; hooks.onAudio?.(false); hooks.onEnded(); });
  v.addEventListener('error', () => { st = 'error'; hooks.onAudio?.(false); hooks.onEnded(); });
  // a phone that backgrounds the tab mid-film resumes paused; the tap button brings it back
  const vis = () => { if (document.hidden && !v.paused) v.pause(); else if (!document.hidden && st === 'paused') { st = 'tap'; wrap.classList.add('tap'); } };
  document.addEventListener('visibilitychange', vis);
  start();

  return {
    el: wrap, video: v,
    show() { wrap.classList.add('on'); },
    close() {
      if (st === 'closed') return;
      st = 'closed'; off.done = true;
      document.removeEventListener('visibilitychange', vis);
      v.pause();
      hooks.onAudio?.(false);
      document.body.classList.remove('hm-watching');
      wrap.classList.add('out');
      setTimeout(() => { wrap.remove(); v.removeAttribute('src'); v.load(); }, 900);
    },
    state: () => st,
    time: () => (st === 'ended' ? Number.POSITIVE_INFINITY : v.currentTime || 0),
  };
}

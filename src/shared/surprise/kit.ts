// 惊喜 / 跳过 / 收集 — the layer every journey stage mounts once (mountSurprise).
//
//  · 跳过 calls the stage's own exit (so its iris, colour hand-off and sound fade stay exactly as when she walks out).
//  · 惊喜 lazy-loads that stage's animation (anims/<stage>.ts, its own chunk), plays it on a pointer-less layer above the
//    scene, then — the first time — a hidden thing appears somewhere in the scene. Tapping it collects it (localStorage,
//    collect.ts) and it flies into the small pouch entry, which opens the collection list (panel.ts).
//  · Text is rendered by this module with the shared t() (not data-i18n), because the jelly page runs its own apply().
import './surprise.css';
import type { StageId } from '../stage-list';
import { register, t, onLang, lang } from '../i18n';
import { asset, reducedMotion } from '../flow';
import * as Sfx from '../sfx';
import * as dict from './dict';
import { ITEMS } from './items';
import { ICONS, POUCH } from './icons';
import { foundCount, isFound, isRevealed, markFound, markRevealed, subscribe, onStorage, TOTAL } from './collect';
import { openPanel } from './panel';
import { mountOrient } from '../orient';
import type { Anim, Ctx } from './fx';

register(dict);

let probe: HTMLElement | null = null;
/** env(safe-area-inset-*) in px (measured from a hidden probe; 0 where unsupported). */
export function safeInsets() {
  if (!probe) { probe = document.createElement('div'); probe.style.cssText = 'position:fixed;left:0;top:0;width:0;height:0;visibility:hidden;pointer-events:none;padding:env(safe-area-inset-top,0px) env(safe-area-inset-right,0px) env(safe-area-inset-bottom,0px) env(safe-area-inset-left,0px)'; document.body.appendChild(probe); }
  const cs = getComputedStyle(probe);
  return { top: parseFloat(cs.paddingTop) || 0, right: parseFloat(cs.paddingRight) || 0, bottom: parseFloat(cs.paddingBottom) || 0, left: parseFloat(cs.paddingLeft) || 0 };
}

type HuntStage = Exclude<StageId, 'ar'>;
const ANIMS: Record<HuntStage, () => Promise<{ default: Anim }>> = {
  meadow: () => import('./anims/meadow'), shop: () => import('./anims/shop'), night: () => import('./anims/night'),
  jelly: () => import('./anims/jelly'), sea: () => import('./anims/sea'), sky: () => import('./anims/sky'),
  coop: () => import('./anims/coop'), flower: () => import('./anims/flower'), mushroom: () => import('./anims/mushroom'),
  home: () => import('./anims/home'),
};

export interface SurpriseOpts {
  stage: HuntStage;
  /** the stage's own way out to the next stage; gets the button centre (client px) for an iris */
  skip: (at: { x: number; y: number }) => void;
}
export interface SurpriseApi {
  dock: HTMLElement;
  /** hide everything (e.g. while the night's sticker page or the ending film is up) */
  setHidden(h: boolean): void;
  /** hide only 惊喜 + 跳过, keep the pouch (the closing card) */
  setButtonsHidden(h: boolean): void;
  /** play the surprise as if 惊喜 was tapped */
  surprise(): Promise<void>;
  readonly playing: boolean;
}

let api: SurpriseApi | null = null;
const stop = (e: Event) => e.stopPropagation();
/** keep taps on our controls away from the stage's own pointer / touch / key handlers */
function guard(e: HTMLElement) { for (const k of ['pointerdown', 'pointerup', 'mousedown', 'touchstart', 'touchend', 'click', 'keydown']) e.addEventListener(k, stop); }
const txt = (key: string, vars?: Record<string, string | number>) => t(key, vars);

export function mountSurprise(o: SurpriseOpts): SurpriseApi {
  mountOrient();
  if (api) return api;
  const { stage } = o;
  const ic = ICONS[stage];
  const dock = document.createElement('div');
  dock.className = 'gs-dock'; dock.dataset.stage = stage;
  dock.innerHTML = `<button type="button" class="gs-btn gs-surprise"><i class="gs-ico">${ic.s}</i><span class="gs-l" data-gs="gs.surprise"></span></button>`
    + `<button type="button" class="gs-btn gs-skip"><span class="gs-l" data-gs="gs.skip"></span><i class="gs-ico">${ic.k}</i></button>`
    + `<button type="button" class="gs-btn gs-entry" data-gs-aria="gs.entry"><i class="gs-ico">${POUCH}</i><span class="gs-n"></span></button>`;
  document.body.appendChild(dock); guard(dock);
  document.documentElement.classList.add('gs-on');
  const bSur = dock.querySelector<HTMLButtonElement>('.gs-surprise')!;
  const bSkip = dock.querySelector<HTMLButtonElement>('.gs-skip')!;
  const bEntry = dock.querySelector<HTMLButtonElement>('.gs-entry')!;
  const nEl = dock.querySelector<HTMLSpanElement>('.gs-n')!;

  const toast = document.createElement('p'); toast.className = 'gs-toast'; toast.dataset.stage = stage; toast.setAttribute('aria-live', 'polite');
  document.body.appendChild(toast);
  let toastT = 0;
  const say = (s: string, ms = 3200) => { toast.textContent = s; toast.classList.add('on'); clearTimeout(toastT); toastT = window.setTimeout(() => toast.classList.remove('on'), ms); };

  const render = () => {
    dock.querySelectorAll<HTMLElement>('[data-gs]').forEach(e => { e.textContent = txt(e.dataset.gs!); });
    dock.querySelectorAll<HTMLElement>('[data-gs-aria]').forEach(e => { e.setAttribute('aria-label', `${txt(e.dataset.gsAria!)} ${foundCount()}/${TOTAL}`); });
    const n = foundCount(); nEl.textContent = `${n}/${TOTAL}`; bEntry.classList.toggle('all', n >= TOTAL);
    if (item) item.setAttribute('aria-label', txt(`gs.item.${stage}`));
  };

  // ── the hidden thing ───────────────────────────────────────────────
  const spec = ITEMS[stage];
  let item: HTMLButtonElement | null = null;
  // centre of the hidden thing, kept inside the notch / home-indicator safe area (landscape phones put the notch on a side)
  const where = () => {
    const p = innerWidth > innerHeight ? spec.landscape : spec.portrait;
    const ins = safeInsets(), half = Math.max(24, spec.size / 2 + 8) + 6;
    const clamp = (v: number, lo: number, hi: number) => Math.round(Math.min(Math.max(v, lo), Math.max(lo, hi)));
    return { x: clamp(p[0] * innerWidth, ins.left + half, innerWidth - ins.right - half), y: clamp(p[1] * innerHeight, ins.top + half, innerHeight - ins.bottom - half) };
  };
  const place = () => { if (!item) return; const p = where(); item.style.left = `${p.x}px`; item.style.top = `${p.y}px`; };
  function showItem(fresh: boolean) {
    if (item || isFound(stage)) return;
    item = document.createElement('button'); item.type = 'button'; item.className = 'gs-item'; item.dataset.stage = stage;
    item.style.setProperty('--gs-item', `${spec.size}px`);
    item.innerHTML = `<span class="gs-item-art">${spec.art(asset)}</span>`;
    document.body.appendChild(item); guard(item); place(); render();
    if (fresh) item.classList.add('fresh');
    item.addEventListener('click', collect);
  }
  function collect() {
    if (!item) return;
    const it = item; item = null;
    const first = markFound(stage);
    Sfx.twinkle();
    // fly into the pouch
    const a = it.getBoundingClientRect(), b = bEntry.getBoundingClientRect();
    it.classList.add('taken'); it.disabled = true;
    const dx = b.left + b.width / 2 - (a.left + a.width / 2), dy = b.top + b.height / 2 - (a.top + a.height / 2);
    const art = it.querySelector<HTMLElement>('.gs-item-art')!;
    const done = () => { it.remove(); bEntry.classList.remove('bump'); void bEntry.offsetWidth; bEntry.classList.add('bump'); render(); };
    if (reducedMotion() || !('animate' in art)) done();
    else art.animate([
      { transform: 'translate(0,0) scale(1.5)', offset: 0 },
      { transform: `translate(${dx * 0.35}px,${dy * 0.35 - 60}px) scale(1.25)`, offset: 0.4 },
      { transform: `translate(${dx}px,${dy}px) scale(.35)`, opacity: 0.6, offset: 1 },
    ], { duration: 900, easing: 'cubic-bezier(.5,0,.4,1)', fill: 'forwards' }).onfinish = done;
    if (first) say(txt('gs.found', { item: txt(`gs.item.${stage}`) }));
  }

  // ── 惊喜 ───────────────────────────────────────────────────────────
  let playing = false;
  async function surprise() {
    if (playing) return; playing = true;
    dock.classList.add('busy'); bSur.disabled = true;
    Sfx.softChime();
    const layer = document.createElement('div'); layer.className = 'gs-fx'; layer.dataset.stage = stage; document.body.appendChild(layer);
    const already = isFound(stage);
    const ctx: Ctx = { stage, layer, w: innerWidth, h: innerHeight, reduced: reducedMotion(), asset, target: already || item ? null : where(), lang: lang === 'zh' ? 'zh' : 'en' };
    try { const m = await ANIMS[stage](); await m.default(ctx); }
    catch (e) { console.warn('[surprise]', e); }
    finally {
      layer.classList.add('out'); setTimeout(() => layer.remove(), 450);
      playing = false; dock.classList.remove('busy'); bSur.disabled = false;
    }
    if (!already && !item) { markRevealed(stage); showItem(true); say(txt('gs.hidden')); }
  }
  bSur.addEventListener('click', () => void surprise());

  // ── 跳过 ───────────────────────────────────────────────────────────
  let skipping = false;
  bSkip.addEventListener('click', () => {
    if (skipping) return; skipping = true; Sfx.tap();
    const r = bSkip.getBoundingClientRect();
    o.skip({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
    setTimeout(() => { skipping = false; }, 1500); // a stage that stays (e.g. home: approach → room) can be skipped again
  });

  // ── 收集 ───────────────────────────────────────────────────────────
  bEntry.addEventListener('click', () => { Sfx.tap(); openPanel({ here: stage, onHere: pointHere }); });
  /** "it's on this page": nudge the right thing */
  function pointHere() {
    if (item) { item.classList.remove('nudge'); void item.offsetWidth; item.classList.add('nudge'); return; }
    bSur.classList.remove('nudge'); void bSur.offsetWidth; bSur.classList.add('nudge');
  }

  if (isRevealed(stage) && !isFound(stage)) showItem(false);
  render();
  onLang(render); subscribe(render);
  window.addEventListener('storage', (e: StorageEvent) => onStorage(e));
  addEventListener('resize', place);

  api = {
    dock,
    setHidden(h) { dock.classList.toggle('gs-hide', h); item?.classList.toggle('gs-hide', h); toast.classList.toggle('gs-hide', h); },
    setButtonsHidden(h) { dock.classList.toggle('gs-only-entry', h); item?.classList.toggle('gs-hide', h); },
    surprise,
    get playing() { return playing; },
  };
  (window as unknown as { __surprise?: unknown }).__surprise = { api, collect: () => collect(), item: () => item, where };
  return api;
}

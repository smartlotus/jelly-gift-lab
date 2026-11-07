import * as Audio from './shared/audio';
import * as Sfx from './shared/sfx';
import './ui/style.css';
import * as I18N from './i18n/i18n';
import { decodeAsset } from './sim/mesh';
import { CHARACTERS, type CharacterEntry } from './characters/registry';
import { Engine } from './app/engine';
import { GLPath } from './app/glpath';
import type { Path } from './app/path';
import * as UI from './ui/ui';
import { hasSensors, askPermission, needsPermission } from './app/tilt';
import * as Curtain from './shared/curtain';
import { tell, mountStory } from './shared/story';
// v03e: this page reveals the shared loading curtain itself (after the first frames), never on the auto timer
Curtain.manual();
// journey arrival: the night stage's kawaii flip closed its iris on pink, so the curtain arrives pink (its colour is handed
// over by curtain.ts cover()). Once the pig stands there, that pink gathers into it (strawberry, the same pink) and dissolves:
// a radial mask shrinking onto where the pig stands (see pinkInto()).
const fromNight = new URLSearchParams(location.search).get('from') === 'night';
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
function pinkInto(x: number, y: number, r: number) {
  const pink = Curtain.element();
  if (!pink || !Curtain.showing()) return;
  if (!fromNight || reduceMotion) { void Curtain.reveal(fromNight ? 0 : 520); return; }
  pink.classList.add('gcc-solid'); pink.style.transition = 'none';
  const R = Math.hypot(innerWidth, innerHeight), t0 = performance.now(), D = 1500;
  const tick = (now: number) => {
    const k = Math.min(1, (now - t0) / D), e = 1 - Math.pow(1 - k, 3); // cubic-out
    const rad = R * (1 - e) + r * e, soft = 40 + 80 * e;
    const m = `radial-gradient(circle at ${x}px ${y}px, #000 ${rad}px, transparent ${rad + soft}px)`;
    pink.style.setProperty('-webkit-mask-image', m); pink.style.setProperty('mask-image', m);
    pink.style.opacity = String(k < 0.55 ? 1 : 1 - (k - 0.55) / 0.45);
    if (k < 1) requestAnimationFrame(tick); else { Curtain.reveal(0); pink.style.removeProperty('-webkit-mask-image'); pink.style.removeProperty('mask-image'); pink.style.opacity = ''; pink.style.transition = ''; pink.classList.remove('gcc-solid'); }
  };
  requestAnimationFrame(tick);
}
/** reject after ms (WebKit's WebGPU can hang without an error: createComputePipelineAsync / onSubmittedWorkDone) */
function within<T>(p: Promise<T>, ms: number, what: string): Promise<T> {
  return new Promise<T>((res, rej) => { const t = setTimeout(() => rej(new Error(`${what} timed out after ${ms} ms`)), ms); p.then(v => { clearTimeout(t); res(v); }, e => { clearTimeout(t); rej(e); }); });
}

I18N.apply();
const params = new URLSearchParams(location.search);
const isMobile = matchMedia('(pointer: coarse)').matches || /Android|iPhone|iPad|iPod|Mobile|MicroMessenger/i.test(navigator.userAgent);
// v03e: every iOS browser and Safari is WebKit. iOS 26 Safari exposes navigator.gpu, but its WebGPU hung this page's compute
// pipelines (no error, no frame: the pink arrival curtain stayed forever). WebKit uses the proven WebGL2 path unless
// ?backend=webgpu asks otherwise; everyone else still tries WebGPU first, now with timeouts and a WebGL2 fallback.
const ua = navigator.userAgent;
const isWebKit = /iPhone|iPad|iPod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  || (/AppleWebKit/i.test(ua) && !/Chrome|Chromium|Edg|OPR|Android/i.test(ua));

async function fetchWithProgress(url: string, onP: (p: number) => void): Promise<ArrayBuffer> {
  const res = await fetch(url);
  if (!res.ok || !res.body) throw new Error(`asset ${url}: ${res.status}`);
  const total = +(res.headers.get('content-length') || 0);
  const reader = res.body.getReader(); const chunks: Uint8Array[] = []; let got = 0;
  for (;;) {
    const { done, value } = await reader.read(); if (done) break;
    chunks.push(value); got += value.length; if (total) onP(got / total);
  }
  const out = new Uint8Array(got); let o = 0; for (const c of chunks) { out.set(c, o); o += c.length; }
  return out.buffer;
}

async function tryWebGPU(): Promise<{ adapter: GPUAdapter; device: GPUDevice } | null> {
  const want = params.get('backend');
  if (want === 'webgl2') return null;
  if (isWebKit && want !== 'webgpu') return null;
  if (!('gpu' in navigator)) return null;
  try {
    return await within((async () => {
      const adapter = await navigator.gpu.requestAdapter({ powerPreference: 'high-performance' });
      if (!adapter) return null;
      const device = await adapter.requestDevice({ requiredLimits: { maxStorageBuffersPerShaderStage: Math.min(8, adapter.limits.maxStorageBuffersPerShaderStage) } });
      return { adapter, device };
    })(), 5000, 'WebGPU adapter');
  } catch (e) { console.info('WebGPU unavailable:', e); return null; }
}

const assetCache = new Map<string, ArrayBuffer>();
async function loadAsset(id: string, level: string, onP: (p: number) => void) {
  const key = `${id}/${level}`;
  if (!assetCache.has(key)) assetCache.set(key, await fetchWithProgress(`${import.meta.env.BASE_URL}assets/${key}.bin`, onP));
  return assetCache.get(key)!;
}

async function boot() {
  let canvas = document.getElementById('gl') as HTMLCanvasElement;
  const ready = CHARACTERS.filter(c => c.ready);
  let ch: CharacterEntry = ready.find(c => c.id === params.get('char')) ?? ready[0];
  UI.setProgress(0.05);
  const gpu = await tryWebGPU();
  let path: Path | null = null; let level = '';
  const dprCap = +(params.get('dpr') || (isMobile ? 2 : 2));
  let kind: 'webgpu' | 'webgl2' = 'webgl2';
  const makePath = async (c: CharacterEntry, onP: (p: number) => void): Promise<Path> => {
    if (kind === 'webgpu') {
      const buf = await loadAsset(c.id, level, onP);
      const asset = decodeAsset(buf, c.actuation, 1);
      const { GPUPath } = await import('./app/gpupath');
      const gp = new GPUPath(canvas, asset, gpu!.device, 4, c.look);
      await gp.ready;
      return gp as unknown as Path;
    }
    const buf = await loadAsset(c.id, level, onP);
    const asset = decodeAsset(buf, c.actuation, 1);
    const gp = new GLPath(canvas, asset, buf, c.id, isMobile ? 0 : 4, c.look);
    await gp.ready;
    return gp;
  };
  const bootP = (p: number) => UI.setProgress(0.05 + p * 0.85);
  if (gpu) {
    level = params.get('q') || (isMobile ? 'md' : 'hi'); kind = 'webgpu';
    try { path = await within(makePath(ch, bootP), 12000, 'WebGPU init'); } catch (e) {
      console.warn('WebGPU path failed, falling back to WebGL2:', e); path = null;
      // a canvas keeps its first context type: swap in a fresh element for WebGL2
      const fresh = canvas.cloneNode(false) as HTMLCanvasElement; canvas.replaceWith(fresh); canvas = fresh;
      try { gpu.device.destroy(); } catch { /* ignore */ }
    }
  }
  if (!path) { level = params.get('q') || 'lo'; kind = 'webgl2'; path = await makePath(ch, bootP); }
  UI.setProgress(1);
  const zeroToOne = path.kind === 'webgpu';
  const engine = new Engine(canvas, path, ch, dprCap, zeroToOne, isMobile && innerWidth < innerHeight);
  (window as any).__jelly = engine;
  const camQ = params.get('cam');
  const applyCamQ = () => {
    if (camQ) { const [y, p, z] = camQ.split(',').map(Number); Object.assign(engine.camGoal, { yaw: y, pitch: p, zoom: z ?? 1 }); Object.assign(engine.cam, { yaw: y, pitch: p, zoom: z ?? 1 }); }
    if (params.get('tgt')) engine.cam.target = params.get('tgt')!.split(',').map(Number);
  };
  applyCamQ();
  const colophon = () => {
    UI.setColophon(I18N.t('colophon', { backend: I18N.t(kind === 'webgpu' ? 'backend.webgpu' : 'backend.webgl2'), tets: engine.path.asset.meta.tets.toLocaleString('en-US') }));
  };
  const label = (c: CharacterEntry) => {
    UI.setMasthead(c.id, c.num); UI.labelColourways();
    canvas.setAttribute('aria-label', I18N.t('aria.canvas', { name: I18N.t(`title.${c.id}` as I18N.Key) }));
    UI.showHint(isMobile); colophon();
  };
  const shroomEl = document.getElementById('shroom')!;
  const dress = (c: CharacterEntry) => {
    UI.setActiveCharacter(c.id);
    shroomEl.classList.toggle('off', c.id !== 'shark'); // the mushroom (easter egg) belongs to the last specimen only
    nudgeNext(c.id);
    UI.buildColourways(c.colourways, cw => { engine.setColour(cw); veilTone(); Sfx.jellyColour(); });
    label(c); veilTone();
  };
  const veilTone = () => { const b = engine.colour.bgBot, t = engine.colour.bgTop; const h = (v: number[]) => `rgb(${v.map(x => Math.round(255 * Math.pow(Math.min(1, x), 1 / 2.2))).join(',')})`; document.documentElement.style.setProperty('--veil', `linear-gradient(${h(t)}, ${h(b)})`); };
  engine.onFirstInteract = () => UI.fadeHint();
  engine.onGrab = () => Sfx.jellyGrab();
  engine.onRelease = () => Sfx.jellyRelease();
  engine.onTwist = () => Sfx.jellyTwist();
  dress(ch);
  I18N.onLang(() => label(ch));
  UI.bindLang(I18N.lang, l => I18N.setLang(l)); UI.bindSound();
  let switching = false; var nudgeT = 0;
  const switchTo = async (id: string) => {
    const next = CHARACTERS.find(c => c.id === id && c.ready);
    if (!next || next === ch || switching) return;
    switching = true; UI.setActiveCharacter(id); Sfx.jellySwitch();
    try {
      const [, p] = await Promise.all([UI.veil(true), makePath(next, () => {})]);
      engine.stop(); const old = engine.path; engine.setCharacter(p, next); old.dispose(); ch = next;
      dress(ch); engine.resize(); engine.start();
      history.replaceState(null, '', `?${new URLSearchParams({ ...Object.fromEntries(params), char: id })}`);
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
      await UI.veil(false);
    } catch (e) { console.error('character switch failed', e); UI.setActiveCharacter(ch.id); await UI.veil(false); }
    switching = false;
  };
  UI.enableCharacters(ready.map(c => c.id), switchTo);
  // journey: pig -> cat -> shark. If she lingers, the next tab glows once, quietly (never on the last one).
  function nudgeNext(id: string) {
    clearTimeout(nudgeT); document.querySelectorAll('.char.nudge').forEach(b => b.classList.remove('nudge'));
    if (!fromNight) return;
    const order = ready.map(c => c.id), nx = order[order.indexOf(id) + 1]; if (!nx) return;
    nudgeT = window.setTimeout(() => { const b = document.querySelector<HTMLElement>(`.char[data-char="${nx}"]`); b?.classList.add('nudge'); }, id === order[0] ? 16000 : 13000);
  }
  (window as any).__switchTo = switchTo;
  const onResize = () => engine.resize();
  addEventListener('resize', onResize); new ResizeObserver(onResize).observe(canvas);
  engine.resize();
  const shroom = document.getElementById('shroom')!;
  const egg = () => import('./egg/egg');
  shroom.addEventListener('pointerenter', () => { egg(); }, { once: true });
  shroom.addEventListener('click', async () => { Audio.unlock(); (await egg()).openEgg(shroom, engine); }); // unlock inside the tap: iOS only starts audio from a gesture
  // Journey arrival (/jelly/?from=night): once the shark is shown, a quiet glint on the mushroom after ~6 s (then every ~16 s),
  // at a moment she isn't dragging; stops once she found it. The egg leads on to /sea/.
  // dragging; stops once she found it. The egg leads on to /sky/ (抬头 / Look up).
  if (fromNight) {
    let found = false, lastTouch = 0, shownAt = 0;
    shroom.addEventListener('click', () => { found = true; }, { once: true });
    window.addEventListener('pointerdown', () => { lastTouch = performance.now(); });
    const tryGlint = () => {
      if (found) return;
      if (ch.id !== 'shark') { shownAt = 0; setTimeout(tryGlint, 1000); return; } // only while the shark is shown
      if (!shownAt) { shownAt = performance.now(); setTimeout(tryGlint, 6000); return; }
      if (performance.now() - lastTouch < 2000) { setTimeout(tryGlint, 700); return; }
      shroom.classList.add('glint'); setTimeout(() => shroom.classList.remove('glint'), 2600);
      setTimeout(tryGlint, 14000);
    };
    setTimeout(tryGlint, 1000);
  }

  // gravity sensor switch (default off, remembered). iOS asks on the tap; a remembered "on" re-asks on her first touch.
  const grav = document.getElementById('grav') as HTMLButtonElement, GK = 'jelly.gravity';
  if (hasSensors() || params.has('grav')) {
    grav.hidden = false;
    const set = (on: boolean) => {
      grav.setAttribute('aria-pressed', String(on)); try { localStorage.setItem(GK, on ? '1' : '0'); } catch { /* private mode */ }
      if (on) {
        engine.sensor.start();
        const t0 = performance.now(); // no events within 2 s = no sensor after all: quietly switch off and hide
        setTimeout(() => { if (engine.sensor.on && engine.sensor.lastEvent < t0 && !params.has('grav')) { engine.sensor.stop(); grav.setAttribute('aria-pressed', 'false'); grav.hidden = true; } }, 2000);
      } else engine.sensor.stop();
    };
    const turnOn = async () => {
      if (await askPermission()) set(true);
      else { set(false); grav.classList.remove('nope'); void grav.offsetWidth; grav.classList.add('nope'); }
    };
    grav.addEventListener('click', () => { if (engine.sensor.on) set(false); else void turnOn(); });
    let stored = false; try { stored = localStorage.getItem(GK) === '1'; } catch { /* */ }
    if (stored) {
      if (!needsPermission()) set(true);
      else { grav.setAttribute('aria-pressed', 'true'); addEventListener('pointerup', e => { if (!grav.contains(e.target as Node) && !engine.sensor.on) void turnOn(); }, { once: true }); }
    }
  }
  document.getElementById('reset')!.addEventListener('click', () => { engine.reset(); Sfx.jellyReset(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) engine.stop(); else engine.start(); });
  engine.start();
  requestAnimationFrame(() => requestAnimationFrame(() => {
    UI.hideLoader();
    // gather the arrival pink onto the pig (its rest-pose centre projected to the screen); otherwise a plain fade
    const a = engine.path.asset.nodes; let cx = 0, cy = 0, cz = 0; const n = a.length / 3; for (let i = 0; i < a.length; i += 3) { cx += a[i]; cy += a[i + 1]; cz += a[i + 2]; }
    const p = engine.project([cx / n, cy / n, cz / n]);
    pinkInto(p.x, p.y, Math.min(innerWidth, innerHeight) * 0.18);
  }));
  (window as any).__jellyReady = { backend: path.kind, level, tets: path.asset.meta.tets };
}

boot().catch((e) => { console.error(e); UI.showFail(); Curtain.fail(e); });

mountStory();
setTimeout(() => tell('story.jelly.in'), 1600);

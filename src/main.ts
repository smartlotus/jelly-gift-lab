import './ui/style.css';
import * as I18N from './i18n/i18n';
import { decodeAsset } from './sim/mesh';
import { CHARACTERS, type CharacterEntry } from './characters/registry';
import { Engine } from './app/engine';
import { GLPath } from './app/glpath';
import type { Path } from './app/path';
import * as UI from './ui/ui';
import { irisIn } from './shared/transition';
// journey arrival: the night stage's kawaii flip closed its iris on pink, so open from pink (before the loader shows)
if (new URLSearchParams(location.search).get('from') === 'night') void irisIn(innerWidth / 2, innerHeight / 2, 900, '#F9C6CF');

I18N.apply();
const params = new URLSearchParams(location.search);
const isMobile = matchMedia('(pointer: coarse)').matches || /Android|iPhone|iPad|iPod|Mobile|MicroMessenger/i.test(navigator.userAgent);

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
  if (params.get('backend') === 'webgl2') return null;
  if (!('gpu' in navigator)) return null;
  try {
    const adapter = await navigator.gpu.requestAdapter({ powerPreference: 'high-performance' });
    if (!adapter) return null;
    const device = await adapter.requestDevice({ requiredLimits: { maxStorageBuffersPerShaderStage: Math.min(8, adapter.limits.maxStorageBuffersPerShaderStage) } });
    return { adapter, device };
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
  let prog = 0.05; UI.setProgress(prog);
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
    try { path = await makePath(ch, bootP); } catch (e) {
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
    UI.setMasthead(c.id, c.num); UI.labelColourways(); UI.buildReadouts(c.metrics);
    canvas.setAttribute('aria-label', I18N.t('aria.canvas', { name: I18N.t(`title.${c.id}` as I18N.Key) }));
    UI.showHint(isMobile); colophon();
  };
  const dress = (c: CharacterEntry) => {
    UI.setActiveCharacter(c.id);
    UI.buildColourways(c.colourways, cw => { engine.setColour(cw); veilTone(); });
    label(c); veilTone();
  };
  const veilTone = () => { const b = engine.colour.bgBot, t = engine.colour.bgTop; const h = (v: number[]) => `rgb(${v.map(x => Math.round(255 * Math.pow(Math.min(1, x), 1 / 2.2))).join(',')})`; document.documentElement.style.setProperty('--veil', `linear-gradient(${h(t)}, ${h(b)})`); };
  engine.onReadouts = r => UI.updateReadouts(r);
  engine.onFirstInteract = () => UI.fadeHint();
  dress(ch);
  I18N.onLang(() => label(ch));
  UI.bindLang(I18N.lang, l => I18N.setLang(l));
  let switching = false;
  const switchTo = async (id: string) => {
    const next = CHARACTERS.find(c => c.id === id && c.ready);
    if (!next || next === ch || switching) return;
    switching = true; UI.setActiveCharacter(id);
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
  (window as any).__switchTo = switchTo;
  const onResize = () => engine.resize();
  addEventListener('resize', onResize); new ResizeObserver(onResize).observe(canvas);
  engine.resize();
  const shroom = document.getElementById('shroom')!;
  const egg = () => import('./egg/egg');
  shroom.addEventListener('pointerenter', () => { egg(); }, { once: true });
  shroom.addEventListener('click', async () => { (await egg()).openEgg(shroom, engine); });
  // Journey arrival (/jelly/?from=night): one quiet glint on the mushroom ~18 s in, at a moment she isn't dragging.
  // Once per visit; never if she already found it. The egg itself is untouched.
  if (new URLSearchParams(location.search).get('from') === 'night') {
    let found = false, lastTouch = 0;
    shroom.addEventListener('click', () => { found = true; }, { once: true });
    window.addEventListener('pointerdown', () => { lastTouch = performance.now(); });
    const tryGlint = () => {
      if (found) return;
      if (performance.now() - lastTouch < 2000) { setTimeout(tryGlint, 700); return; }
      shroom.classList.add('glint'); setTimeout(() => shroom.classList.remove('glint'), 2600);
    };
    setTimeout(tryGlint, 18000);
  }
  document.getElementById('bait')!.addEventListener('click', () => { engine.dropBait(); UI.fadeHint(); });
  document.getElementById('reset')!.addEventListener('click', () => engine.reset());
  document.addEventListener('visibilitychange', () => { if (document.hidden) engine.stop(); else engine.start(); });
  engine.start();
  requestAnimationFrame(() => requestAnimationFrame(() => UI.hideLoader()));
  (window as any).__jellyReady = { backend: path.kind, level, tets: path.asset.meta.tets };
}

boot().catch((e) => { console.error(e); UI.showFail(); });

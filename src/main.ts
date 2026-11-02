import './ui/style.css';
import { decodeAsset } from './sim/mesh';
import { CHARACTERS } from './characters/registry';
import { Engine } from './app/engine';
import { GLPath } from './app/glpath';
import type { Path } from './app/path';
import * as UI from './ui/ui';

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

async function boot() {
  let canvas = document.getElementById('gl') as HTMLCanvasElement;
  const ch = CHARACTERS[0];
  let prog = 0.05; UI.setProgress(prog);
  const gpu = await tryWebGPU();
  let path: Path | null = null; let level = '';
  const dprCap = +(params.get('dpr') || (isMobile ? 2 : 2));
  if (gpu) {
    level = params.get('q') || (isMobile ? 'md' : 'hi');
    try {
      const buf = await fetchWithProgress(`${import.meta.env.BASE_URL}assets/${ch.id}/${level}.bin`, p => UI.setProgress(0.05 + p * 0.85));
      const asset = decodeAsset(buf, ch.actuation!, 1);
      const { GPUPath } = await import('./app/gpupath');
      const gp = new GPUPath(canvas, asset, gpu.device, isMobile ? 4 : 4);
      await gp.ready;
      path = gp as unknown as Path;
    } catch (e) {
      console.warn('WebGPU path failed, falling back to WebGL2:', e); path = null;
      // a canvas keeps its first context type: swap in a fresh element for WebGL2
      const fresh = canvas.cloneNode(false) as HTMLCanvasElement; canvas.replaceWith(fresh); canvas = fresh;
      try { gpu.device.destroy(); } catch { /* ignore */ }
    }
  }
  if (!path) {
    level = params.get('q') || 'lo';
    const buf = await fetchWithProgress(`${import.meta.env.BASE_URL}assets/${ch.id}/${level}.bin`, p => UI.setProgress(0.05 + p * 0.85));
    const asset = decodeAsset(buf, ch.actuation!, 1);
    const gp = new GLPath(canvas, asset, buf, ch.id, isMobile ? 0 : 4);
    await gp.ready;
    path = gp;
  }
  UI.setProgress(1);
  const zeroToOne = path.kind === 'webgpu';
  const engine = new Engine(canvas, path, ch.actuation!, ch.colourways!, dprCap, zeroToOne);
  (window as any).__jelly = engine;
  engine.idle = ch.idle ?? null;
  if (isMobile && innerWidth < innerHeight) { engine.camGoal.yaw = engine.cam.yaw = 1.3; engine.camGoal.pitch = engine.cam.pitch = 0.6; }
  const camQ = params.get('cam');
  if (camQ) { const [y, p, z] = camQ.split(',').map(Number); Object.assign(engine.camGoal, { yaw: y, pitch: p, zoom: z ?? 1 }); Object.assign(engine.cam, { yaw: y, pitch: p, zoom: z ?? 1 }); }
  if (params.get('tgt')) engine.cam.target = params.get('tgt')!.split(',').map(Number);
  UI.buildColourways(ch.colourways!, c => engine.setColour(c));
  engine.onReadouts = r => UI.updateReadouts(r);
  engine.onFirstInteract = () => UI.fadeHint();
  const a = path.asset;
  UI.setColophon(`${path.kind === 'webgpu' ? 'WebGPU compute' : 'WebGL 2 · CPU worker'} · ${a.meta.tets.toLocaleString('en-US')} tetrahedra · ${(a.meta.outer.tris + a.meta.inner.tris).toLocaleString('en-US')} triangles`);
  const onResize = () => engine.resize();
  addEventListener('resize', onResize); new ResizeObserver(onResize).observe(canvas);
  engine.resize();
  document.getElementById('bait')!.addEventListener('click', () => { engine.dropBait(); UI.fadeHint(); });
  document.getElementById('reset')!.addEventListener('click', () => engine.reset());
  document.addEventListener('visibilitychange', () => { if (document.hidden) engine.stop(); else engine.start(); });
  engine.start();
  requestAnimationFrame(() => requestAnimationFrame(() => UI.hideLoader()));
  (window as any).__jellyReady = { backend: path.kind, level, tets: a.meta.tets };
}

boot().catch((e) => { console.error(e); UI.showFail(); });

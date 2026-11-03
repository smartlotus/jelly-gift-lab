// /ar/ · the printed figures on a real table. Page = a calm turntable carousel (pig · cat · the couple set) + one AR button:
// iOS -> AR Quick Look (USDZ, real printed size) · Android with WebXR -> immersive-ar (xr.ts) · otherwise the button hides
// and the page stays a 3D viewer (drag to turn). ?m=figure-pig|figure-cat|pair picks the first model; ?ar=force shows the button.
import { WebGLRenderer, Scene, PerspectiveCamera, DirectionalLight, Mesh, PlaneGeometry, ShadowMaterial, PMREMGenerator, NeutralToneMapping, PCFShadowMap, Group, Color } from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { register, t, onLang, apply } from '../../shared/i18n';
import { mountChrome } from '../../shared/chrome';
import { irisIn } from '../../shared/transition';
import { params } from '../../shared/flow';
import { AR_IDS, AR_ICON, isArId, quickLook, webxrAR, openQuickLook, type ArId } from '../../shared/ar';
import { loadFigure } from './models';
import * as dict from './dict';
import './style.css';

register(dict); mountChrome({ sound: false });
const host = document.getElementById('ar')!;
const r = new WebGLRenderer({ antialias: true, alpha: true }); r.setPixelRatio(Math.min(devicePixelRatio, 2)); r.setSize(innerWidth, innerHeight);
r.toneMapping = NeutralToneMapping; r.toneMappingExposure = 0.95; r.shadowMap.enabled = true; r.shadowMap.type = PCFShadowMap; r.setClearColor(0, 0);
host.appendChild(r.domElement);
const scene = new Scene(), cam = new PerspectiveCamera(30, innerWidth / innerHeight, 0.05, 50);
scene.environment = new PMREMGenerator(r).fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.5;
const key = new DirectionalLight(new Color('#fff0dc'), 1.9); key.position.set(-2.2, 3.6, 3); key.castShadow = true;
const sc = key.shadow.camera; sc.left = sc.bottom = -1.5; sc.right = sc.top = 1.5; key.shadow.mapSize.set(1024, 1024); key.shadow.radius = 4; key.shadow.bias = -0.0004;
scene.add(key, new DirectionalLight(new Color('#ffd9e2'), 0.5).translateX(2.5).translateY(1.5).translateZ(-3));
const floor = new Mesh(new PlaneGeometry(8, 8).rotateX(-Math.PI / 2), new ShadowMaterial({ opacity: 0.16 })); floor.receiveShadow = true; scene.add(floor);
const stage = new Group(); scene.add(stage);
window.addEventListener('resize', () => { r.setSize(innerWidth, innerHeight); cam.aspect = innerWidth / innerHeight; cam.updateProjectionMatrix(); });

// ---------- UI: dots + one round AR button ----------
const ui = document.createElement('div'); ui.className = 'ar-ui';
ui.innerHTML = `<button type="button" class="ar-btn" data-i18n-aria="ar.place" hidden>${AR_ICON}</button><nav class="ar-dots">${AR_IDS.map(id => `<button type="button" data-id="${id}" data-i18n-aria="ar.m.${id}"></button>`).join('')}</nav>
<div class="ar-overlay" hidden><button type="button" class="ar-exit" data-i18n-aria="ar.exit"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>`;
document.body.appendChild(ui); apply(); onLang(() => apply());
const btn = ui.querySelector<HTMLButtonElement>('.ar-btn')!, overlay = ui.querySelector<HTMLElement>('.ar-overlay')!;
let idx = Math.max(0, AR_IDS.indexOf((params.get('m') || '') as ArId));
const figs = new Map<ArId, Group>();
let mode: 'ql' | 'xr' | null = null;
void (async () => { mode = quickLook() ? 'ql' : (await webxrAR()) ? 'xr' : null; btn.hidden = !mode && params.get('ar') !== 'force'; })();

// ---------- carousel ----------
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches, cv = r.domElement;
let spin = 0, spinV = 0.25, shown: Group | null = null, fade = 1, dist = 4;
async function show(i: number) {
  idx = (i + AR_IDS.length) % AR_IDS.length; const id = AR_IDS[idx];
  ui.querySelectorAll<HTMLButtonElement>('.ar-dots button').forEach(b => b.setAttribute('aria-current', String(b.dataset.id === id)));
  let f = figs.get(id); if (!f) { f = await loadFigure(id); figs.set(id, f); }
  if (AR_IDS[idx] !== id) return;
  // cross-dissolve through the paper: out 260 ms, swap, the new one eases in on the turntable (expo-out)
  if (shown && !reduced) { cv.style.opacity = '0'; await new Promise(r => setTimeout(r, 260)); if (AR_IDS[idx] !== id) return; }
  if (shown) stage.remove(shown); shown = f; stage.add(f); fade = reduced ? 1 : 0; cv.style.opacity = '1';
  const s = f.userData.size; const rad = Math.hypot(s.x, s.y, s.z) / 2;
  const vf = cam.fov * Math.PI / 180, hf = 2 * Math.atan(Math.tan(vf / 2) * cam.aspect);
  dist = Math.max(rad / Math.sin(vf / 2) * 1.1, (s.x / 2 * 1.3) / Math.tan(hf / 2) + s.z / 2);
  cam.userData.ty = s.y * 0.46;
  for (const id2 of AR_IDS) if (!figs.has(id2)) void loadFigure(id2).then(g => figs.set(id2, g)); // warm the rest
}
ui.querySelector('.ar-dots')!.addEventListener('click', e => { const b = (e.target as HTMLElement).closest('button'); if (b) void show(AR_IDS.indexOf(b.dataset.id as ArId)); });
btn.addEventListener('click', async () => {
  btn.classList.remove('ping'); void btn.offsetWidth; btn.classList.add('ping');
  const id = AR_IDS[idx];
  if (mode === 'ql') { openQuickLook(id); return; }
  if (mode === 'xr' && shown) {
    overlay.hidden = false; document.body.classList.add('ar-live');
    try { const { runXR } = await import('./xr'); await runXR(r, cam, shown, overlay); } catch (err) { console.warn('webxr', err); }
    overlay.hidden = true; document.body.classList.remove('ar-live'); r.setAnimationLoop(loop);
  }
});
// drag = turn the figure; a quick flick = next / previous
let px = 0, p0 = 0, t0 = 0, drag = false;
r.domElement.addEventListener('pointerdown', e => { drag = true; px = p0 = e.clientX; t0 = performance.now(); r.domElement.setPointerCapture(e.pointerId); });
r.domElement.addEventListener('pointermove', e => { if (!drag) return; spin += (e.clientX - px) * 0.012; spinV = 0; px = e.clientX; });
r.domElement.addEventListener('pointerup', e => { drag = false; const dx = e.clientX - p0, dt = performance.now() - t0; if (Math.abs(dx) > 70 && dt < 280) { spin -= dx * 0.012; void show(idx + (dx < 0 ? 1 : -1)); } spinV = 0.25; });
window.addEventListener('keydown', e => { if (e.code === 'ArrowRight') void show(idx + 1); if (e.code === 'ArrowLeft') void show(idx - 1); });

let last = performance.now(), camD = 4, camY = 0.2;
function loop() {
  const now = performance.now(), dt = Math.min(0.05, (now - last) / 1000); last = now;
  if (!params.has('still')) spin += spinV * dt; fade = Math.min(1, fade + dt / 0.9);
  const ef = 1 - Math.pow(2, -10 * fade); // expo-out
  stage.rotation.y = spin + (1 - ef) * 0.9; stage.position.y = -(1 - ef) * 0.05; stage.scale.setScalar(0.94 + 0.06 * ef);
  camD += (dist - camD) * Math.min(1, dt * 5); camY += ((cam.userData.ty ?? 0.2) - camY) * Math.min(1, dt * 5);
  cam.position.set(0, camY + camD * 0.28, camD); cam.lookAt(0, camY, 0);
  r.render(scene, cam);
}
r.setAnimationLoop(loop);
void show(idx); void irisIn(innerWidth / 2, innerHeight / 2, 700, '#eeece8');
void t; void isArId;

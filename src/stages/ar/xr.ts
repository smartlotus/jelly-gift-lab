// Android WebXR immersive-ar: hit-test reticle on real surfaces, tap to place the figure at REAL size (GLB unit 10 cm -> 0.1),
// tap again to move it. three.js is bundled (no CDN). Returns when the session ends.
import { Scene, Mesh, RingGeometry, MeshBasicMaterial, CircleGeometry, HemisphereLight, DirectionalLight, Matrix4, Vector3, Quaternion, type WebGLRenderer, type Group, type PerspectiveCamera, CanvasTexture } from 'three';
import { UNIT_M } from './models';
export async function runXR(renderer: WebGLRenderer, camera: PerspectiveCamera, figure: Group, overlay: HTMLElement): Promise<void> {
  const xr = navigator.xr!;
  const session = await xr.requestSession('immersive-ar', { requiredFeatures: ['hit-test'], optionalFeatures: ['dom-overlay', 'local-floor'], domOverlay: { root: overlay } });
  const scene = new Scene();
  scene.add(new HemisphereLight(0xfff6ec, 0x8a7f74, 1.6));
  const sun = new DirectionalLight(0xffffff, 1.4); sun.position.set(0.3, 1, 0.4); scene.add(sun);
  const reticle = new Mesh(new RingGeometry(0.028, 0.034, 48).rotateX(-Math.PI / 2), new MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 }));
  reticle.matrixAutoUpdate = false; reticle.visible = false; scene.add(reticle);
  // soft contact shadow under the figure
  const c = document.createElement('canvas'); c.width = c.height = 64; const g2 = c.getContext('2d')!; const gr = g2.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(0,0,0,.45)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g2.fillStyle = gr; g2.fillRect(0, 0, 64, 64);
  const size = figure.userData.size as Vector3;
  const blob = new Mesh(new CircleGeometry(0.5, 32).rotateX(-Math.PI / 2), new MeshBasicMaterial({ map: new CanvasTexture(c), transparent: true, depthWrite: false }));
  blob.scale.setScalar(Math.max(size.x, size.z) * UNIT_M * 1.5);
  const fig = figure.clone(); fig.scale.setScalar(UNIT_M); fig.rotation.set(0, 0, 0); fig.position.set(0, 0, 0); fig.visible = false; fig.add(blob); blob.scale.divideScalar(UNIT_M);
  scene.add(fig);
  renderer.xr.enabled = true; renderer.xr.setReferenceSpaceType('local');
  await renderer.xr.setSession(session);
  const ref = await session.requestReferenceSpace('local'), viewer = await session.requestReferenceSpace('viewer');
  const src = await session.requestHitTestSource!({ space: viewer });
  const m = new Matrix4(), p = new Vector3(), q = new Quaternion(), s = new Vector3(), camPos = new Vector3();
  session.addEventListener('select', () => {
    if (!reticle.visible) return;
    reticle.matrix.decompose(p, q, s); fig.position.copy(p);
    renderer.xr.getCamera().getWorldPosition(camPos); fig.rotation.set(0, Math.atan2(camPos.x - p.x, camPos.z - p.z), 0); fig.visible = true;
  });
  return new Promise(res => {
    session.addEventListener('end', () => { renderer.setAnimationLoop(null); renderer.xr.enabled = false; res(); });
    overlay.querySelector('button')?.addEventListener('click', () => void session.end(), { once: true });
    renderer.setAnimationLoop((_t: number, frame?: XRFrame) => {
      if (frame) { const hit = frame.getHitTestResults(src!)[0]?.getPose(ref); reticle.visible = !!hit; if (hit) { m.fromArray(hit.transform.matrix); reticle.matrix.copy(m); } }
      renderer.render(scene, camera);
    });
  });
}

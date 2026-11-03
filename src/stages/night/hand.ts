// First-person cat paw holding a torch (Minecraft-hand homage) in its own little scene, drawn after the world.
import { AmbientLight, BoxGeometry, Group, Mesh, MeshBasicMaterial, MeshLambertMaterial, PerspectiveCamera, PointLight, Scene } from 'three';
import { T, tileTexture } from './textures';
import { glow } from './pig';

export function makeHand() {
  const scene = new Scene(); const cam = new PerspectiveCamera(60, 1, 0.01, 10);
  const fur = new MeshLambertMaterial({ map: tileTexture(T.fur) }), paw = new MeshLambertMaterial({ map: tileTexture(T.paw) });
  const stick = new MeshLambertMaterial({ map: tileTexture(T.torch) });
  const flameM = new MeshBasicMaterial({ map: tileTexture(T.flame) });
  const rig = new Group(); scene.add(rig);
  const arm = new Group(); rig.add(arm);
  const fore = new Mesh(new BoxGeometry(0.24, 0.24, 0.9), fur); fore.position.set(0, 0, 0.25); arm.add(fore);
  const hand = new Mesh(new BoxGeometry(0.3, 0.27, 0.26), [fur, fur, fur, paw, paw, fur]); hand.position.set(0, 0.02, -0.28); arm.add(hand);
  // pink ring on the wrist (the cat's tail ring, as a little bracelet)
  const ring = new Mesh(new BoxGeometry(0.255, 0.255, 0.05), new MeshLambertMaterial({ color: '#ee8fa6' })); ring.position.z = -0.08; arm.add(ring);
  const torch = new Group(); torch.position.set(0, 0.05, -0.3); arm.add(torch);
  const s = new Mesh(new BoxGeometry(0.075, 0.62, 0.075), stick); s.position.y = 0.18; torch.add(s);
  const flame = new Mesh(new BoxGeometry(0.1, 0.12, 0.1), flameM); flame.position.y = 0.53; torch.add(flame);
  const halo = glow('255,150,60', 0.4, 0.28); halo.position.y = 0.56; torch.add(halo);
  arm.rotation.set(0.38, 0.3, 0.1); arm.position.set(0.5, -0.5, -0.95); arm.scale.setScalar(0.82);
  torch.rotation.x = -0.5;
  const light = new PointLight('#ffb35c', 1.2, 3, 1.4); light.position.set(0.3, 0.25, -1.0); scene.add(light, new AmbientLight('#2a3550', 0.6));
  let lit = 1;
  return {
    scene, cam,
    resize(aspect: number) { cam.aspect = aspect; cam.updateProjectionMatrix(); const narrow = aspect < 0.8; rig.position.set(narrow ? -0.12 : 0, narrow ? 0.05 : 0, narrow ? 0.12 : 0); },
    /** bob: walk phase; amp 0..1; flicker 0..1 light; lit=false hides flame */
    update(t: number, phase: number, amp: number, flick: number, isLit: boolean, sway: number) {
      lit += ((isLit ? 1 : 0) - lit) * 0.5;
      rig.position.x += 0; arm.position.x = 0.52 + Math.sin(phase) * 0.035 * amp + sway * 0.06;
      arm.position.y = -0.47 - Math.abs(Math.cos(phase)) * 0.05 * amp + Math.sin(t * 1.4) * 0.008;
      arm.rotation.z = 0.12 + Math.sin(phase) * 0.04 * amp;
      flame.visible = lit > 0.3; halo.visible = flame.visible;
      flame.scale.set(1, 0.85 + flick * 0.3, 1); halo.scale.setScalar((0.34 + flick * 0.12) * lit);
      light.intensity = (0.7 + flick * 0.6) * lit + 0.08;
    },
  };
}

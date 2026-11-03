// The boss: a blocky, upright "zombie-pose" pig built from the doodle's features (pointy ears, big oval snout with two
// nostrils, bean eyes, blush, curly tail, "??" above its head). In the dark only torch-lit bits + two glowing eyes show.
import { AdditiveBlending, BoxGeometry, CanvasTexture, Color, Group, Mesh, MeshBasicMaterial, MeshLambertMaterial, Sprite, SpriteMaterial, type Material } from 'three';
import { T, tileTexture, tex } from './textures';

const Q = ['.###.', '#...#', '....#', '...#.', '..#..', '.....', '..#..'];
/** "??" in pixel glyphs, yellow with a soft-black outline */
export function qqTexture() {
  const s = 2, c = document.createElement('canvas'); c.width = 15 * s + 4; c.height = 9 * s + 4; const g = c.getContext('2d')!;
  const draw = (col: string, off: number) => { g.fillStyle = col; for (const ox of [0, 7]) Q.forEach((row, y) => [...row].forEach((ch, x) => { if (ch === '#') for (let a = -off; a <= off; a++) for (let b = -off; b <= off; b++) g.fillRect(2 + (ox + x) * s + a * s / 2 + (ox ? 2 : 0), 2 + (y + (ox ? 1 : 0)) * s + b * s / 2, s, s); })); };
  draw('#2e2a2b', 1); draw('#ffd45c', 0);
  return tex(c);
}
function glowTexture(rgb: string) {
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d')!;
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, `rgba(${rgb},1)`); gr.addColorStop(.25, `rgba(${rgb},.45)`); gr.addColorStop(1, `rgba(${rgb},0)`);
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return new CanvasTexture(c);
}
export const glow = (rgb: string, size: number, opacity = 1) => { const s = new Sprite(new SpriteMaterial({ map: glowTexture(rgb), blending: AdditiveBlending, depthWrite: false, transparent: true, opacity, fog: false })); s.scale.setScalar(size); return s; };

export function makePig() {
  const skin = new MeshLambertMaterial({ map: tileTexture(T.pig) });
  const face = new MeshLambertMaterial({ map: tileTexture(T.pigFace) });
  const snoutM = new MeshLambertMaterial({ map: tileTexture(T.snout) });
  const hoof = new MeshLambertMaterial({ color: new Color('#c97b8f') });
  const inner = new MeshLambertMaterial({ color: new Color('#ee8fa6') });
  const box = (w: number, h: number, d: number, m: Material | Material[], x = 0, y = 0, z = 0) => { const b = new Mesh(new BoxGeometry(w, h, d), m); b.position.set(x, y, z); return b; };
  const root = new Group(); const body = new Group(); root.add(body);
  // legs (pivot at hip)
  const legs = [-0.25, 0.25].map(x => { const p = new Group(); p.position.set(x, 1.0, 0); p.add(box(0.42, 0.86, 0.42, skin, 0, -0.43, 0), box(0.44, 0.14, 0.44, hoof, 0, -0.93, 0)); body.add(p); return p; });
  // torso
  body.add(box(1.0, 1.05, 0.62, skin, 0, 1.52, 0));
  body.add(box(0.62, 0.5, 0.04, inner, 0, 1.45, 0.32)); // belly patch
  // tail (curly, back)
  body.add(box(0.1, 0.1, 0.18, inner, 0.0, 1.25, -0.38), box(0.1, 0.18, 0.1, inner, 0.08, 1.33, -0.48), box(0.14, 0.1, 0.1, inner, 0.02, 1.43, -0.5));
  // arms: zombie reach, pivot at shoulder
  const arms = [-0.66, 0.66].map(x => { const p = new Group(); p.position.set(x, 1.92, 0); p.add(box(0.32, 0.32, 1.0, skin, 0, 0, 0.45), box(0.34, 0.34, 0.14, hoof, 0, 0, 0.98)); body.add(p); return p; });
  // head
  const head = new Group(); head.position.set(0, 2.08, 0.02); body.add(head);
  const faceMats = [skin, skin, skin, skin, face, skin];
  head.add(box(1.04, 0.92, 0.92, faceMats, 0, 0.46, 0));
  head.add(box(0.5, 0.32, 0.14, [snoutM, snoutM, snoutM, snoutM, snoutM, snoutM], 0, 0.3, 0.52));
  // pointy ears (doodle!) - stacked blocks, leaning out
  for (const s of [-1, 1]) {
    const ear = new Group(); ear.position.set(0.34 * s, 0.92, -0.05); ear.rotation.z = -0.28 * s;
    ear.add(box(0.3, 0.18, 0.14, skin, 0, 0.09, 0), box(0.18, 0.16, 0.14, skin, 0.03 * s, 0.25, 0), box(0.08, 0.1, 0.14, skin, 0.05 * s, 0.37, 0), box(0.14, 0.12, 0.02, inner, 0, 0.12, 0.075));
    head.add(ear);
  }
  // eyes: glowing (unlit, ignore fog) + halos
  const eyeM = new MeshBasicMaterial({ color: new Color('#ff5a76'), fog: false });
  const halos: Sprite[] = [];
  for (const s of [-1, 1]) {
    head.add(box(0.16, 0.16, 0.03, eyeM, 0.25 * s, 0.6, 0.47));
    const h = glow('255,70,100', 0.9, 0.55); h.position.set(0.25 * s, 0.6, 0.52); head.add(h); halos.push(h);
  }
  // "??" floating above the head
  const qq = new Sprite(new SpriteMaterial({ map: qqTexture(), transparent: true, fog: true })); qq.scale.set(0.9, 0.48, 1); qq.position.set(0.42, 1.55, 0); head.add(qq);
  root.visible = false;
  let phase = 0;
  return {
    root, head, qq,
    setEyes(intensity: number) { eyeM.color.setRGB(1 * intensity + 0.15, 0.3 * intensity + 0.05, 0.4 * intensity + 0.08); halos.forEach(h => { (h.material as SpriteMaterial).opacity = 0.65 * intensity; }); },
    /** speed in blocks/s; reach 0..1 (arms up and forward) */
    animate(dt: number, speed: number, reach = 1, t = 0) {
      phase += dt * (2.2 + speed * 2.4);
      const sw = Math.min(1, speed / 2) * 0.7;
      legs[0].rotation.x = Math.sin(phase) * sw; legs[1].rotation.x = -Math.sin(phase) * sw;
      arms.forEach((a, i) => { a.rotation.x = -0.08 * reach + Math.sin(phase + i * 1.4) * 0.12 * reach + (1 - reach) * 1.25; a.rotation.y = (i ? -1 : 1) * 0.06; });
      body.position.y = Math.abs(Math.sin(phase)) * 0.06 * Math.min(1, speed);
      body.rotation.z = Math.sin(phase) * 0.04;
      head.rotation.z = Math.sin(t * 1.3) * 0.06;
      qq.position.y = 1.55 + Math.sin(t * 3) * 0.06;
    },
  };
}
export type Pig = ReturnType<typeof makePig>;

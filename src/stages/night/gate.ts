// A wooden two-leaf gate with a padlock + a little sign. v03f: placed by the caller (props.ts) across the clearing's
// wall; the lock is the 4-digit "our day one" lock. Swings open when solved.
import { BoxGeometry, Group, Mesh, MeshLambertMaterial } from 'three';
import { T, tileTexture, signTexture } from './textures';

export function makeGate(lang: 'en' | 'zh') {
  const root = new Group();
  const wood = new MeshLambertMaterial({ map: tileTexture(T.planks) }), log = new MeshLambertMaterial({ map: tileTexture(T.oakSide) });
  const iron = new MeshLambertMaterial({ color: '#b9934a', emissive: '#2a1a06' });
  const post = (x: number) => { const m = new Mesh(new BoxGeometry(0.28, 2.3, 0.28), log); m.position.set(x, 1.15, 0); root.add(m); };
  post(-1.75); post(1.75);
  const leaf = (side: -1 | 1) => {
    const pivot = new Group(); pivot.position.set(side * 1.6, 0, 0);
    const w = 1.58;
    for (const y of [0.35, 1.0, 1.65]) { const b = new Mesh(new BoxGeometry(w, 0.32, 0.09), wood); b.position.set(-side * w / 2, y, 0); pivot.add(b); }
    for (const x of [0.12, w - 0.12]) { const s = new Mesh(new BoxGeometry(0.14, 1.75, 0.11), wood); s.position.set(-side * x, 1.0, 0.01); pivot.add(s); }
    root.add(pivot); return pivot;
  };
  const L = leaf(-1), R = leaf(1);
  const lock = new Mesh(new BoxGeometry(0.16, 0.18, 0.08), iron); lock.position.set(1.47, 1.0, 0.09); L.add(lock);
  const shackle = new Mesh(new BoxGeometry(0.12, 0.08, 0.04), iron); shackle.position.set(1.47, 1.12, 0.09); L.add(shackle);
  const signMat = () => [0, 0, 0, 0, 1, 0].map(i => new MeshLambertMaterial({ map: i ? signTexture('_ _ _ _') : tileTexture(T.planks) }));
  const board = new Mesh(new BoxGeometry(0.9, 0.46, 0.06), signMat()); board.position.set(0.8, 1.42, 0.08); board.rotation.z = 0.05; L.add(board);
  let open = 0, target = 0;
  return {
    root,
    open() { target = 1; },
    get isOpen() { return target === 1; },
    setLang(l: 'en' | 'zh') { void l; void lang; },
    update(dt: number) {
      if (open === target) return;
      open = Math.min(1, open + dt / 1.3); const e = 1 - Math.pow(1 - open, 3);
      L.rotation.y = e * 1.75; R.rotation.y = -e * 1.75; lock.visible = shackle.visible = open < 0.2;
    },
  };
}

// Load the printed figures (meshopt GLBs, 1 unit = 10 cm) as table-ready groups: origin = bottom centre, real proportions.
// 2026-11-15: every shop model. The Lotus30 set (pig-fig / cat-fig / *-relief) is mm + Z-up -> turned Y-up and scaled to 10 cm
// units; fridge magnets lie flat as printed -> stood upright, face toward +Z (same pose as public/models/ar/<id>.glb).
import { Group, Box3, Vector3, Mesh, Color, type MeshStandardMaterial } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { asset } from '../../shared/flow';
import { isMagnet, type ArId } from '../../shared/ar';
import { partKey } from '../shop/exhibits';
import { fetchGlb } from '../shop/models';
const PAIR_DX = 0.608493; // cat at +60.8493 mm in the assembled couple set (lotus-3d-figures README v5)
// GLBs come through fetchGlb (shop/models.ts): stall timeout, retries, any base path
const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
const FILES: Record<ArId, [string, number][]> = { 'figure-pig': [['figure-pig', 0]], 'figure-cat': [['figure-cat', 0]], pair: [['pair-pig', 0], ['pair-cat', PAIR_DX]],
  'pig-fig': [['pig-fig', 0]], 'cat-fig': [['cat-fig', 0]], 'magnet-pig': [['magnet-pig', 0]], 'magnet-cat': [['magnet-cat', 0]], 'pig-relief': [['pig-relief', 0]], 'cat-relief': [['cat-relief', 0]] };
const L30 = (id: ArId) => id.endsWith('-fig') || id.endsWith('-relief');
export const UNIT_M = 0.1; // metres per GLB unit
export async function loadFigure(id: ArId): Promise<Group> {
  const g = new Group(), inner = new Group(); g.add(inner);
  const parts = await Promise.all(FILES[id].map(async ([f, dx]) => { const s = (await loader.parseAsync(await fetchGlb(f, () => {}), asset('models/'))).scene; s.position.x += dx; return s; }));
  const pose = new Group(); parts.forEach(p => pose.add(p)); inner.add(pose);
  if (L30(id)) { pose.rotation.x = -Math.PI / 2; pose.scale.setScalar(0.01); } // mm, Z-up -> 10 cm units, Y-up
  if (isMagnet(id)) { const up = new Group(); inner.remove(pose); up.add(pose); up.rotation.x = Math.PI / 2; inner.add(up); } // lying flat -> upright
  inner.traverse(o => {
    const m = o as Mesh; if (!m.isMesh) return; m.castShadow = true; m.receiveShadow = true;
    let mat = m.material as MeshStandardMaterial;
    // Lotus30: one grey material, the colour is the part name ('NN_rrggbb')
    if (L30(id) && mat && /^[0-9a-f]{6}$/i.test(partKey(m.name))) { mat = m.material = mat.clone(); mat.color = new Color(`#${partKey(m.name)}`); mat.metalness = 0; }
    if (mat && 'roughness' in mat) { mat.roughness = Math.max(mat.roughness, 0.55); mat.envMapIntensity = 0.9; }
  });
  inner.updateMatrixWorld(true);
  const b = new Box3().setFromObject(inner), c = b.getCenter(new Vector3());
  inner.position.set(-c.x, -b.min.y, -c.z);
  g.userData.size = b.getSize(new Vector3()); // units
  g.userData.magnet = isMagnet(id);
  return g;
}

// Load the printed figures (meshopt GLBs, 1 unit = 10 cm) as table-ready groups: origin = bottom centre, real proportions.
import { Group, Box3, Vector3, Mesh, type MeshStandardMaterial } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { asset } from '../../shared/flow';
import type { ArId } from '../../shared/ar';
import { fetchGlb } from '../shop/models';
const PAIR_DX = 0.608493; // cat at +60.8493 mm in the assembled couple set (lotus-3d-figures README v5)
// GLBs come through fetchGlb (shop/models.ts): stall timeout, retries, any base path
const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
const FILES: Record<ArId, [string, number][]> = { 'figure-pig': [['figure-pig', 0]], 'figure-cat': [['figure-cat', 0]], pair: [['pair-pig', 0], ['pair-cat', PAIR_DX]] };
export const UNIT_M = 0.1; // metres per GLB unit
export async function loadFigure(id: ArId): Promise<Group> {
  const g = new Group(), inner = new Group(); g.add(inner);
  const parts = await Promise.all(FILES[id].map(async ([f, dx]) => { const s = (await loader.parseAsync(await fetchGlb(f, () => {}), asset('models/'))).scene; s.position.x += dx; return s; }));
  parts.forEach(p => inner.add(p));
  inner.traverse(o => {
    const m = o as Mesh; if (!m.isMesh) return; m.castShadow = true; m.receiveShadow = true;
    const mat = m.material as MeshStandardMaterial; if (mat && 'roughness' in mat) { mat.roughness = Math.max(mat.roughness, 0.55); mat.envMapIntensity = 0.9; }
  });
  inner.updateMatrixWorld(true);
  const b = new Box3().setFromObject(inner), c = b.getCenter(new Vector3());
  inner.position.set(-c.x, -b.min.y, -c.z);
  g.userData.size = b.getSize(new Vector3()); // units
  return g;
}

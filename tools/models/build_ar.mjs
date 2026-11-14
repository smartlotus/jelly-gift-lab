// 2026-11-15 · AR copies of every shop model for Android Scene Viewer (and the source of the iOS USDZ, glb_to_usdz.py).
// The web GLBs use EXT_meshopt_compression + KHR_mesh_quantization (+ KHR_materials_specular), which Scene Viewer does not
// read. This writes public/models/ar/<id>.glb: plain glTF 2.0 (no extensions), REAL size in metres, Y-up, standing on y = 0,
// centred in x/z, front toward +Z. Figures stand as printed; fridge magnets stand upright (face toward +Z, so they can also go
// on a wall with Scene Viewer's vertical placement). The couple set is one file (cat at +60.8493 mm).
//   node tools/models/build_ar.mjs           (needs @gltf-transform/{core,extensions,functions} + meshoptimizer; ARTOOLS=<dir with node_modules>)
import { createRequire } from 'node:module';
import { mkdirSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
const ROOT = resolve(import.meta.dirname, '../..');
const req = createRequire(`${process.env.ARTOOLS || '/workspace/artools'}/`);
const { NodeIO, Document } = req('@gltf-transform/core');
const { ALL_EXTENSIONS } = req('@gltf-transform/extensions');
const { dequantize, getBounds, normals, prune, dedup, mergeDocuments, unpartition, weld } = req('@gltf-transform/functions');
const { MeshoptDecoder } = req('meshoptimizer');
await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
const PAIR_DX = 0.608493; // GLB units (10 cm)
// id -> [files (+dx in file units)], family: 'v5' = 1 unit 10 cm, Y-up (print up +Y); 'l30' = Lotus30 3MF export, mm, Z-up; kind
const MODELS = {
  'figure-pig': [[['figure-pig', 0]], 'v5', 'figure'], 'figure-cat': [[['figure-cat', 0]], 'v5', 'figure'],
  pair: [[['pair-pig', 0], ['pair-cat', PAIR_DX]], 'v5', 'figure'],
  'magnet-pig': [[['magnet-pig', 0]], 'v5', 'magnet'], 'magnet-cat': [[['magnet-cat', 0]], 'v5', 'magnet'],
  'pig-fig': [[['pig-fig', 0]], 'l30', 'figure'], 'cat-fig': [[['cat-fig', 0]], 'l30', 'figure'],
  'pig-relief': [[['pig-relief', 0]], 'l30', 'magnet'], 'cat-relief': [[['cat-relief', 0]], 'l30', 'magnet'],
};
const srgb2lin = c => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const quat = (ax, ang) => { const s = Math.sin(ang / 2); return [ax[0] * s, ax[1] * s, ax[2] * s, Math.cos(ang / 2)]; };
const mulQ = (a, b) => [a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1], a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0], a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3], a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2]];
mkdirSync(`${ROOT}/public/models/ar`, { recursive: true });
const only = process.argv.slice(2);
for (const [id, [files, fam, kind]] of Object.entries(MODELS)) {
  if (only.length && !only.includes(id)) continue;
  const doc = new Document(); doc.createBuffer();
  const scene = doc.createScene(id); doc.getRoot().setDefaultScene(scene);
  const root = doc.createNode(id); scene.addChild(root);
  for (const [f, dx] of files) {
    const src = await io.read(`${ROOT}/public/models/${f}.glb`);
    await src.transform(dequantize());
    for (const ext of src.getRoot().listExtensionsUsed()) ext.dispose(); // meshopt / quantization / specular
    const map = mergeDocuments(doc, src);
    const sScene = src.getRoot().getDefaultScene() || src.getRoot().listScenes()[0];
    const holder = doc.createNode(f).setTranslation([dx, 0, 0]); root.addChild(holder);
    for (const n of sScene.listChildren()) holder.addChild(map.get(n));
  }
  for (const s of doc.getRoot().listScenes()) if (s !== scene) s.dispose();
  // Lotus30: one grey material for every part, the colour is the mesh name ('NN_rrggbb') -> one matte material per colour
  if (fam === 'l30') {
    const mats = new Map();
    for (const node of doc.getRoot().listNodes()) {
      const mesh = node.getMesh(); if (!mesh) continue;
      const hex = /([0-9a-f]{6})$/i.exec(node.getName() || mesh.getName() || '')?.[1]; if (!hex) continue;
      if (!mats.has(hex)) mats.set(hex, doc.createMaterial(hex).setBaseColorFactor([0, 2, 4].map(i => srgb2lin(parseInt(hex.slice(i, i + 2), 16) / 255)).concat(1)).setRoughnessFactor(0.62).setMetallicFactor(0));
      for (const p of mesh.listPrimitives()) p.setMaterial(mats.get(hex));
    }
  }
  for (const m of doc.getRoot().listMaterials()) { m.setMetallicFactor(Math.min(m.getMetallicFactor(), 0.2)); m.setRoughnessFactor(Math.max(m.getRoughnessFactor(), 0.55)); }
  // orientation + metres: v5 1 unit = 0.1 m (Y-up); l30 mm Z-up -> Y-up. Magnets lie flat (print up) -> stand upright, face +Z
  let q = fam === 'l30' ? quat([1, 0, 0], -Math.PI / 2) : [0, 0, 0, 1];
  if (kind === 'magnet') q = mulQ(quat([1, 0, 0], Math.PI / 2), q);
  const s = fam === 'l30' ? 0.001 : 0.1;
  root.setRotation(q).setScale([s, s, s]);
  let b = getBounds(scene);
  root.setTranslation([-(b.min[0] + b.max[0]) / 2, -b.min[1], -(b.min[2] + b.max[2]) / 2]);
  await doc.transform(normals({ overwrite: false }), weld(), dedup(), prune(), unpartition());
  b = getBounds(scene);
  const out = `${ROOT}/public/models/ar/${id}.glb`;
  await new NodeIO().write(out, doc);
  console.log(id.padEnd(11), 'mm', b.max.map((v, i) => ((v - b.min[i]) * 1000).toFixed(1)).join(' × '), ' ', (statSync(out).size / 1048576).toFixed(2), 'MiB');
}

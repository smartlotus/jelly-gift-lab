"""Blender (4.2, headless) OBJ+MTL -> web GLB, one model per call.
Usage: blender -b --python tools/models/export_glb.py -- <in.obj> <out.glb> [targetTris=90000]
- OBJ is Z-up, millimetres (lotus-3d-figures v5 exports). glTF exporter writes Y-up; we scale mm -> metres*10 (1 unit = 10 cm) so
  a ~60 mm figure is ~0.6 units: the viewer normalises by bounding box anyway.
- Each colour part keeps its own material (Kd from the .mtl -> Principled base colour, matte PLA look).
- Decimate (collapse) per object so the whole model lands near targetTris; small parts keep more detail (min ratio floor).
Then run tools/models/compress.sh for meshopt compression + quantisation."""
import bpy, sys
argv = sys.argv[sys.argv.index('--') + 1:]
src, dst = argv[0], argv[1]
target = int(argv[2]) if len(argv) > 2 else 90000
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.wm.obj_import(filepath=src, forward_axis='Y', up_axis='Z')
objs = [o for o in bpy.context.scene.objects if o.type == 'MESH']
total = sum(len(o.data.polygons) for o in objs)
ratio = min(1.0, target / max(1, total))
print('tris', total, 'ratio', ratio)
for o in objs:
    n = len(o.data.polygons)
    r = ratio if n > 4000 else max(ratio, 0.6)   # keep eyes / text / tiny parts crisp
    if r < 0.999:
        m = o.modifiers.new('dec', 'DECIMATE'); m.ratio = r; m.use_collapse_triangulate = True
    bpy.context.view_layer.objects.active = o
    for p in o.data.polygons: p.use_smooth = True
    for slot in o.material_slots:
        mat = slot.material
        if not mat or not mat.use_nodes: continue
        b = mat.node_tree.nodes.get('Principled BSDF')
        if not b: continue
        b.inputs['Roughness'].default_value = 0.32 if 'metal' in mat.name else 0.58
        b.inputs['Metallic'].default_value = 0.55 if 'metal' in mat.name or 'pins' in mat.name else 0.0
        b.inputs['Specular IOR Level'].default_value = 0.35
for o in objs: o.scale = (0.01, 0.01, 0.01)
bpy.ops.export_scene.gltf(filepath=dst, export_format='GLB', export_apply=True, export_yup=True,
                          export_normals=True, export_texcoords=False, export_materials='EXPORT', export_cameras=False, export_lights=False)
print('wrote', dst)

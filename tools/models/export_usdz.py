"""Blender 4.2 headless: raw web GLB(s) -> USDZ for iOS AR Quick Look, at REAL printed size (metres, Y-up).
Usage: blender -b --python tools/models/export_usdz.py -- <out.usdz> <targetTris> <in.glb>[@dx_units] [<in2.glb>@dx ...]
- input = tmp/models/<id>.raw.glb from export_glb.py (1 unit = 10 cm); we scale x0.1 -> metres and shift by dx (pair: cat +0.608493)
- materials -> UsdPreviewSurface (matte PLA colours); decimated to targetTris total (Quick Look likes < ~100k)."""
import bpy, sys
argv = sys.argv[sys.argv.index('--') + 1:]
dst, target, srcs = argv[0], int(argv[1]), argv[2:]
bpy.ops.wm.read_factory_settings(use_empty=True)
for s in srcs:
    path, dx = (s.split('@') + ['0'])[:2]
    before = set(bpy.context.scene.objects)
    bpy.ops.import_scene.gltf(filepath=path)
    for o in set(bpy.context.scene.objects) - before:
        if o.parent is None:
            o.location.x += float(dx)   # glTF +X == Blender +X
objs = [o for o in bpy.context.scene.objects if o.type == 'MESH']
total = sum(len(o.data.polygons) for o in objs); ratio = min(1.0, target / max(1, total))
for o in objs:
    n = len(o.data.polygons); r = ratio if n > 4000 else max(ratio, 0.6)
    if r < 0.999:
        m = o.modifiers.new('dec', 'DECIMATE'); m.ratio = r; m.use_collapse_triangulate = True
# scale everything about the origin: 1 unit (10 cm) -> 0.1 m. Parent all roots under one empty so the scale applies once.
root = bpy.data.objects.new('figure', None); bpy.context.scene.collection.objects.link(root)
for o in list(bpy.context.scene.objects):
    if o is not root and o.parent is None: o.parent = root
root.scale = (0.1, 0.1, 0.1)
bpy.context.view_layer.update()
# rest on the table: lowest point -> z = 0 (Blender Z-up), centred in X/Y
import mathutils
pts = [o.matrix_world @ mathutils.Vector(c) for o in objs for c in o.bound_box]
minz = min(p.z for p in pts); cx = (min(p.x for p in pts) + max(p.x for p in pts)) / 2; cy = (min(p.y for p in pts) + max(p.y for p in pts)) / 2
root.location = (-cx, -cy, -minz)
bpy.context.view_layer.update()
pts = [o.matrix_world @ mathutils.Vector(c) for o in objs for c in o.bound_box]
print('SIZE_MM', [round((max(getattr(p, a) for p in pts) - min(getattr(p, a) for p in pts)) * 1000, 1) for a in 'xyz'])
bpy.ops.wm.usd_export(filepath=dst, export_materials=True, generate_preview_surface=True, export_normals=True, export_uvmaps=False,
                      convert_orientation=True, export_global_forward_selection='NEGATIVE_Z', export_global_up_selection='Y',
                      evaluation_mode='RENDER', export_animation=False, export_cameras=False, export_lights=False, triangulate_meshes=True)
print('wrote', dst)

"""2026-11-15 · AR-ready GLB (tools/models/build_ar.mjs: plain glTF, metres, Y-up, standing on y=0) -> USDZ for iOS AR Quick Look.
No Blender needed: pip install usd-core numpy (e.g. in a venv), then
    python tools/models/glb_to_usdz.py public/models/ar/<id>.glb public/models/<id>.usdz
Meshes are baked to world space, one UsdPreviewSurface per glTF material (base colour factor or the palette texture), matte PLA."""
import json, struct, sys, os, tempfile, shutil
import numpy as np
from pxr import Usd, UsdGeom, UsdShade, Sdf, Gf, UsdUtils, Vt

src, dst = sys.argv[1], sys.argv[2]
raw = open(src, 'rb').read()
assert raw[:4] == b'glTF'
off, js, binc = 12, None, None
while off < len(raw):
    ln, ty = struct.unpack_from('<II', raw, off); chunk = raw[off + 8: off + 8 + ln]; off += 8 + ln
    if ty == 0x4E4F534A: js = json.loads(chunk)
    elif ty == 0x004E4942: binc = chunk
CT = {5126: np.float32, 5125: np.uint32, 5123: np.uint16, 5121: np.uint8}
NC = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4}
def acc(i):
    a = js['accessors'][i]; bv = js['bufferViews'][a['bufferView']]; dt = np.dtype(CT[a['componentType']]); n = NC[a['type']]
    start = bv.get('byteOffset', 0) + a.get('byteOffset', 0); stride = bv.get('byteStride', 0)
    if stride and stride != dt.itemsize * n:
        arr = np.ndarray((a['count'], n), dtype=dt, buffer=binc, offset=start, strides=(stride, dt.itemsize))
    else:
        arr = np.frombuffer(binc, dtype=dt, count=a['count'] * n, offset=start).reshape(a['count'], n)
    return np.array(arr, dtype=np.float64 if dt == np.float32 else np.int64)
def trs(n):
    if 'matrix' in n: return np.array(n['matrix'], dtype=np.float64).reshape(4, 4).T
    t = n.get('translation', [0, 0, 0]); r = n.get('rotation', [0, 0, 0, 1]); s = n.get('scale', [1, 1, 1])
    x, y, z, w = r
    R = np.array([[1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w)], [2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w)], [2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)]])
    M = np.eye(4); M[:3, :3] = R * np.array(s)[None, :]; M[:3, 3] = t; return M

work = tempfile.mkdtemp(); name = os.path.splitext(os.path.basename(dst))[0].replace('-', '_')
usdc = os.path.join(work, f'{name}.usdc')
stage = Usd.Stage.CreateNew(usdc)
UsdGeom.SetStageUpAxis(stage, UsdGeom.Tokens.y); UsdGeom.SetStageMetersPerUnit(stage, 1.0)
root = UsdGeom.Xform.Define(stage, '/root'); stage.SetDefaultPrim(root.GetPrim())
UsdGeom.Scope.Define(stage, '/root/Looks')
mats = {}
def material(mi):
    if mi in mats: return mats[mi]
    m = js['materials'][mi] if mi is not None else {}
    pbr = m.get('pbrMetallicRoughness', {})
    path = f'/root/Looks/m{len(mats)}'
    mat = UsdShade.Material.Define(stage, path)
    sh = UsdShade.Shader.Define(stage, path + '/surf'); sh.CreateIdAttr('UsdPreviewSurface')
    f = pbr.get('baseColorFactor', [1, 1, 1, 1])
    sh.CreateInput('roughness', Sdf.ValueTypeNames.Float).Set(float(max(0.55, pbr.get('roughnessFactor', 1.0))))
    sh.CreateInput('metallic', Sdf.ValueTypeNames.Float).Set(float(min(0.2, pbr.get('metallicFactor', 0.0))))
    tex = pbr.get('baseColorTexture')
    if tex is not None:
        img = js['images'][js['textures'][tex['index']]['source']]; bv = js['bufferViews'][img['bufferView']]
        ext = '.png' if img.get('mimeType', 'image/png') == 'image/png' else '.jpg'; fn = f'tex{tex["index"]}{ext}'
        open(os.path.join(work, fn), 'wb').write(binc[bv.get('byteOffset', 0): bv.get('byteOffset', 0) + bv['byteLength']])
        st = UsdShade.Shader.Define(stage, path + '/uv'); st.CreateIdAttr('UsdPrimvarReader_float2'); st.CreateInput('varname', Sdf.ValueTypeNames.String).Set('st')
        t = UsdShade.Shader.Define(stage, path + '/tex'); t.CreateIdAttr('UsdUVTexture')
        t.CreateInput('file', Sdf.ValueTypeNames.Asset).Set(fn); t.CreateInput('sourceColorSpace', Sdf.ValueTypeNames.Token).Set('sRGB')
        t.CreateInput('st', Sdf.ValueTypeNames.Float2).ConnectToSource(st.ConnectableAPI(), 'result')
        t.CreateInput('wrapS', Sdf.ValueTypeNames.Token).Set('clamp'); t.CreateInput('wrapT', Sdf.ValueTypeNames.Token).Set('clamp')
        t.CreateInput('scale', Sdf.ValueTypeNames.Float4).Set(Gf.Vec4f(f[0], f[1], f[2], 1))
        t.CreateOutput('rgb', Sdf.ValueTypeNames.Float3)
        sh.CreateInput('diffuseColor', Sdf.ValueTypeNames.Color3f).ConnectToSource(t.ConnectableAPI(), 'rgb')
    else:
        sh.CreateInput('diffuseColor', Sdf.ValueTypeNames.Color3f).Set(Gf.Vec3f(*f[:3]))
    mat.CreateSurfaceOutput().ConnectToSource(sh.ConnectableAPI(), 'surface')
    mats[mi] = mat; return mat

count = [0]; lo = np.full(3, np.inf); hi = np.full(3, -np.inf); tris = 0
def walk(ni, parent):
    global lo, hi, tris
    n = js['nodes'][ni]; M = parent @ trs(n)
    if 'mesh' in n:
        for p in js['meshes'][n['mesh']]['primitives']:
            at = p['attributes']; P = acc(at['POSITION'])
            P = (np.c_[P, np.ones(len(P))] @ M.T)[:, :3]
            idx = acc(p['indices']).reshape(-1) if 'indices' in p else np.arange(len(P))
            idx = idx.reshape(-1, 3)
            if np.linalg.det(M[:3, :3]) < 0: idx = idx[:, ::-1]
            mesh = UsdGeom.Mesh.Define(stage, f'/root/g{count[0]}'); count[0] += 1
            mesh.CreatePointsAttr(Vt.Vec3fArray.FromNumpy(P.astype(np.float32)))
            mesh.CreateFaceVertexCountsAttr(Vt.IntArray.FromNumpy(np.full(len(idx), 3, dtype=np.int32)))
            mesh.CreateFaceVertexIndicesAttr(Vt.IntArray.FromNumpy(idx.reshape(-1).astype(np.int32)))
            mesh.CreateSubdivisionSchemeAttr('none'); mesh.CreateDoubleSidedAttr(False)
            if 'NORMAL' in at:
                N = acc(at['NORMAL']) @ np.linalg.inv(M[:3, :3]).T; N /= np.linalg.norm(N, axis=1, keepdims=True) + 1e-12
                mesh.CreateNormalsAttr(Vt.Vec3fArray.FromNumpy(N.astype(np.float32))); mesh.SetNormalsInterpolation('vertex')
            if 'TEXCOORD_0' in at:
                T = acc(at['TEXCOORD_0']); T[:, 1] = 1 - T[:, 1]
                pv = UsdGeom.PrimvarsAPI(mesh).CreatePrimvar('st', Sdf.ValueTypeNames.TexCoord2fArray, UsdGeom.Tokens.vertex)
                pv.Set(Vt.Vec2fArray.FromNumpy(T.astype(np.float32)))
            mesh.CreateExtentAttr([Gf.Vec3f(*P.min(0)), Gf.Vec3f(*P.max(0))])
            UsdShade.MaterialBindingAPI.Apply(mesh.GetPrim()).Bind(material(p.get('material')))
            lo = np.minimum(lo, P.min(0)); hi = np.maximum(hi, P.max(0)); tris += len(idx)
    for c in n.get('children', []): walk(c, M)
for ni in js['scenes'][js.get('scene', 0)]['nodes']: walk(ni, np.eye(4))
stage.GetRootLayer().Save()
cwd = os.getcwd(); os.chdir(work)
ok = UsdUtils.CreateNewARKitUsdzPackage(Sdf.AssetPath(os.path.basename(usdc)), os.path.join(cwd, dst) if not os.path.isabs(dst) else dst)
os.chdir(cwd); shutil.rmtree(work)
print(os.path.basename(dst), 'ok' if ok else 'FAILED', 'size_mm', [round(float(v) * 1000, 1) for v in hi - lo], 'min_y', round(float(lo[1]), 4), 'tris', tris, f'{os.path.getsize(dst) / 1048576:.2f} MiB')

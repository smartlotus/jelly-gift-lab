# Zip source + dist (no node_modules / .git / font source TTFs) -> /workspace/jelly_stage1_shark.zip
import os, zipfile
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
out = '/workspace/jelly_stage1_shark.zip'
skip_dirs = {'node_modules', '.git'}
with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as z:
    for d, dirs, files in os.walk(root):
        dirs[:] = [x for x in dirs if x not in skip_dirs]
        rel = os.path.relpath(d, root)
        for f in files:
            if rel.startswith('fonts-src') and f.endswith('.ttf'): continue
            if rel.startswith('review') and f.endswith('.png'): continue
            if f.endswith('.mp4') or f.endswith('.gif'): continue
            p = os.path.join(d, f); z.write(p, os.path.join('jelly-site', os.path.relpath(p, root)))
print(out, os.path.getsize(out) / 1e6, 'MB')

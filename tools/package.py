# Zip source + dist (no node_modules / .git / font source TTFs) -> /workspace/jelly_stage2.zip (or argv[1])
import os, sys, zipfile
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
out = sys.argv[1] if len(sys.argv) > 1 else '/workspace/jelly_stage2.zip'
skip_dirs = {'node_modules', '.git'}
with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as z:
    for d, dirs, files in os.walk(root):
        dirs[:] = [x for x in dirs if x not in skip_dirs]
        rel = os.path.relpath(d, root)
        for f in files:
            if rel.startswith('fonts-src') and f.endswith('.ttf'): continue
            if rel.startswith('review') and f.endswith('.png'): continue
            if f.endswith('.mp4') or f.endswith('.gif'): continue
            if rel.startswith(os.path.join('public', 'assets')) and f.endswith('.bin'): continue  # identical copies ship in dist/assets; regenerate with npm run bake
            if rel.startswith('review') and not rel.startswith(os.path.join('review', 'stage2')): continue
            p = os.path.join(d, f); z.write(p, os.path.join('jelly-site', os.path.relpath(p, root)))
print(out, os.path.getsize(out) / 1e6, 'MB')

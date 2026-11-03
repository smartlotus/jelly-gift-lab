#!/usr/bin/env bash
# Rebuild web GLBs for the shop (stage 2) from the lotus-3d-figures repo (v5 colour OBJ+MTL).
# Usage: tools/models/compress.sh [figures-repo=/workspace/lotus-3d-figures-repo] [blender=/workspace/blender-4.2.3-linux-x64/blender]
# Output: public/models/<id>.glb  (meshopt-compressed; decoded by three/examples/jsm/libs/meshopt_decoder.module.js, bundled, no CDN)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
FIG="${1:-/workspace/lotus-3d-figures-repo}"; B="${2:-/workspace/blender-4.2.3-linux-x64/blender}"
OUT="$ROOT/public/models"; TMP="$ROOT/tmp/models"; mkdir -p "$OUT" "$TMP"
declare -A SRC=(
  [figure-pig]="models/figures/A_pig/Figure_A_Pig_v5_round_color.obj"
  [figure-cat]="models/figures/B_cat/Figure_B_Cat_v5_round_color.obj"
  [magnet-pig]="models/reliefs/A_pig/Relief_A_Pig_v5_color.obj"
  [magnet-cat]="models/reliefs/B_cat/Relief_B_Cat_v5_color.obj"
)
for id in "${!SRC[@]}"; do
  "$B" -b --python "$ROOT/tools/models/export_glb.py" -- "$FIG/${SRC[$id]}" "$TMP/$id.raw.glb" "${TRIS:-90000}" >/dev/null
  npx --yes @gltf-transform/cli@4 optimize "$TMP/$id.raw.glb" "$OUT/$id.glb" \
    --compress meshopt --simplify false --texture-compress false --instance false --join false --flatten false
  ls -la "$OUT/$id.glb"
done

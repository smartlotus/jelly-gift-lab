#!/usr/bin/env bash
# Cloudflare Pages build of the LAB (direct upload; GitHub Pages stays as it is — scripts/deploy_pages.sh).
#   scripts/build_cloudflare.sh            → dist-cf/   (then: wrangler pages deploy dist-cf --project-name jelly-gift-lab)
# The Vite base is './' (document-relative), so the same build works at the pages.dev root and under a subpath.
# Differences from the GitHub build: SECRET_PAGE → the album on Cloudflare; _headers (long cache for hashed assets,
# video type + ranges); the unused 35 MB future-home.mp4 is left out (Pages' per-file limit is 25 MiB).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"; cd "$ROOT"
ALBUM_URL="${ALBUM_URL:-https://rhine-album.pages.dev/?from=jelly}"
rm -rf dist-cf
VITE_SECRET_PAGE="$ALBUM_URL" npx vite build --outDir dist-cf --emptyOutDir
rm -f dist-cf/media/future-home.mp4 dist-cf/media/future-home.json dist-cf/media/future-home-poster.jpg
find dist-cf -name '*.map' -delete
# byte sizes for the Range function (functions/media/[[path]].js): Pages' asset responses carry no Content-Length
python3 - <<'PY'
import json, os
d = 'dist-cf/media'
json.dump({f: os.path.getsize(os.path.join(d, f)) for f in os.listdir(d) if os.path.isfile(os.path.join(d, f))}, open('functions/media/sizes.json', 'w'), indent=1)
PY
# Pages already sends the right Content-Type (video/mp4, model/gltf-binary …) but answers Range requests with a full 200 —
# functions/media/[[path]].js turns those into 206; rules must not overlap (overlapping rules append header values).
cat > dist-cf/_headers <<'H'
/assets/*
  Cache-Control: public, max-age=31536000, immutable
/media/anniv-200-720.mp4
  Cache-Control: public, max-age=2592000
/media/anniv-200-480.mp4
  Cache-Control: public, max-age=2592000
/media/anniv-200-poster-720.jpg
  Cache-Control: public, max-age=2592000
/models/*
  Cache-Control: public, max-age=604800
/art/*
  Cache-Control: public, max-age=604800
H
if find dist-cf -type f -size +25M | grep -q .; then echo "file > 25 MiB in dist-cf:" >&2; find dist-cf -type f -size +25M >&2; exit 1; fi
grep -rl "rhine-album.pages.dev" dist-cf/assets >/dev/null || { echo "SECRET_PAGE not switched to Cloudflare" >&2; exit 1; }
echo "dist-cf ready ($(find dist-cf -type f | wc -l) files, $(du -sh dist-cf | cut -f1)); album link: $ALBUM_URL"

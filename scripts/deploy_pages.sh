#!/usr/bin/env bash
# Rebuild the site and publish dist/ as the root of branch `main` in the PUBLIC repo
# smartlotus/jelly-gift (GitHub Pages: https://smartlotus.github.io/jelly-gift/).
# Only built output is pushed - never source. Never force-pushes.
# Usage: scripts/deploy_pages.sh [deploy-dir]   (default /workspace/jelly-gift-deploy)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEPLOY="${1:-/workspace/jelly-gift-deploy}"
REPO_URL="https://github.com/smartlotus/jelly-gift.git"
EMAIL="227950577+smartlotus@users.noreply.github.com"
NAME="smartlotus"

cd "$ROOT"
rm -rf dist
npm run build            # base './' in vite.config.ts -> works under /jelly-gift/
touch dist/.nojekyll
# guard rails: no source maps, nothing near GitHub's 100MB file limit
if find dist -name '*.map' | grep -q .; then echo "source maps in dist - aborting" >&2; exit 1; fi
if find dist -type f -size +95M | grep -q .; then echo "file >95MB in dist - aborting" >&2; exit 1; fi

if [ ! -d "$DEPLOY/.git" ]; then
  if git ls-remote "$REPO_URL" >/dev/null 2>&1 && [ -n "$(git ls-remote "$REPO_URL" main)" ]; then
    git clone --branch main "$REPO_URL" "$DEPLOY"
  else
    mkdir -p "$DEPLOY" && git -C "$DEPLOY" init -b main && git -C "$DEPLOY" remote add origin "$REPO_URL"
  fi
fi
cd "$DEPLOY"
git pull --ff-only origin main 2>/dev/null || true
# replace working tree with fresh dist (keep .git)
find . -mindepth 1 -maxdepth 1 ! -name .git -exec rm -rf {} +
cp -a "$ROOT/dist/." .
git add -A
if git diff --cached --quiet; then echo "nothing changed"; exit 0; fi
SRC_REV="$(git -C "$ROOT" rev-parse --short HEAD)"
git -c user.email="$EMAIL" -c user.name="$NAME" commit -q -m "Deploy built site (jelly-gift-site@$SRC_REV)"
git push origin main
echo "pushed; Pages will rebuild: https://smartlotus.github.io/jelly-gift/"

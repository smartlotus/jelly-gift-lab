#!/usr/bin/env bash
# Publish dist/ of THIS private story edition (smartlotus/jelly-gift-story) to a gh-pages
# branch of the SAME repository. Never touches smartlotus/jelly-gift (the stable public site).
#
# Private-repo GitHub Pages on a free user plan is often unavailable. If `gh api` reports
# that Pages cannot be enabled, STOP. Do not change repository visibility to public.
#
# Usage: GIFT_DEPLOY=1 scripts/deploy_pages.sh
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SELF_URL="https://github.com/smartlotus/jelly-gift-story.git"
EMAIL="227950577+smartlotus@users.noreply.github.com"
NAME="smartlotus"

cd "$ROOT"
if [ "${GIFT_DEPLOY:-}" != "1" ]; then
  echo "Refusing to deploy without GIFT_DEPLOY=1." >&2
  echo "This script publishes the story edition only (same repo, gh-pages branch)." >&2
  echo "It will never push to smartlotus/jelly-gift." >&2
  exit 1
fi

# Hard guard: never accept the old public Pages remote.
if [ "${PAGES_REMOTE:-$SELF_URL}" = "https://github.com/smartlotus/jelly-gift.git" ]; then
  echo "Refusing to deploy to the old public Pages repository." >&2
  exit 1
fi

rm -rf dist
npm run build
touch dist/.nojekyll
if find dist -name '*.map' | grep -q .; then echo "source maps in dist - aborting" >&2; exit 1; fi
if find dist -type f -size +95M | grep -q .; then echo "file >95MB in dist - aborting" >&2; exit 1; fi

WORKDIR="$(mktemp -d)"
git clone --branch gh-pages "$SELF_URL" "$WORKDIR" 2>/dev/null || {
  mkdir -p "$WORKDIR"
  git -C "$WORKDIR" init -b gh-pages
  git -C "$WORKDIR" remote add origin "$SELF_URL"
}
find "$WORKDIR" -mindepth 1 -maxdepth 1 ! -name .git -exec rm -rf {} +
cp -a dist/. "$WORKDIR/"
cd "$WORKDIR"
git add -A
if git diff --cached --quiet; then echo "nothing changed"; exit 0; fi
SRC_REV="$(git -C "$ROOT" rev-parse --short HEAD)"
git -c user.email="$EMAIL" -c user.name="$NAME" commit -q -m "Deploy story edition ($SRC_REV)"
git push -u origin gh-pages
echo "pushed gh-pages of smartlotus/jelly-gift-story (not the old public site)"

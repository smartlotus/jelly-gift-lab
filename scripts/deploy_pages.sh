#!/usr/bin/env bash
# Publish dist/ of THIS experimental lab copy (smartlotus/jelly-gift-lab) to the gh-pages branch of the SAME
# repository -> https://smartlotus.github.io/jelly-gift-lab/
# It refuses every other target. In particular it never pushes to smartlotus/jelly-gift (the stable public site)
# or smartlotus/jelly-gift-story (the story edition).
#
# Usage: GIFT_DEPLOY=1 scripts/deploy_pages.sh
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SELF_REPO="smartlotus/jelly-gift-lab"
SELF_URL="https://github.com/${SELF_REPO}.git"
EMAIL="227950577+smartlotus@users.noreply.github.com"
NAME="smartlotus"

# owner/name of a git URL (https or ssh, with or without .git), lower-case
repo_of() { printf '%s' "$1" | sed -E 's#^(https?://|git@)?github\.com[:/]##; s#/+$##; s#\.git$##' | tr 'A-Z' 'a-z'; }
FORBIDDEN="smartlotus/jelly-gift smartlotus/jelly-gift-story"

cd "$ROOT"
if [ "${GIFT_DEPLOY:-}" != "1" ]; then
  echo "Refusing to deploy without GIFT_DEPLOY=1." >&2
  echo "This script publishes the lab copy only (smartlotus/jelly-gift-lab, gh-pages branch)." >&2
  echo "It will never push to smartlotus/jelly-gift or smartlotus/jelly-gift-story." >&2
  exit 1
fi

# Hard guards: the target must be this lab repo, never the stable site or the story edition.
TARGET="${PAGES_REMOTE:-$SELF_URL}"
for bad in $FORBIDDEN; do
  if [ "$(repo_of "$TARGET")" = "$bad" ]; then echo "Refusing to deploy to $bad (only $SELF_REPO is allowed)." >&2; exit 1; fi
done
if [ "$(repo_of "$TARGET")" != "$SELF_REPO" ]; then echo "Refusing: target $TARGET is not $SELF_REPO." >&2; exit 1; fi
# and the checkout itself must be the lab repo (a copied script in another clone stops here)
ORIGIN="$(git -C "$ROOT" remote get-url origin 2>/dev/null || true)"
if [ "$(repo_of "$ORIGIN")" != "$SELF_REPO" ]; then echo "Refusing: this checkout's origin ($ORIGIN) is not $SELF_REPO." >&2; exit 1; fi

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
# 2026-11-14: keep the PREVIOUS deploy's hashed chunks (assets/*) for one more generation. A phone that still has the old
# HTML cached (Pages sends max-age=600; WeChat / X5 keeps pages much longer) would otherwise request a lazy chunk such as
# viewer-<hash>.js that no longer exists, and the shop's 3D figurines would never appear. Older generations are pruned.
OLDASSETS="$(mktemp -d)"
if [ -d "$WORKDIR/assets" ]; then
  KEEP="$(git -C "$WORKDIR" show HEAD:.assets-prev 2>/dev/null || true)"
  cp -a "$WORKDIR/assets/." "$OLDASSETS/"
  ( cd "$OLDASSETS" && for f in *; do
      [ -e "$f" ] || continue
      if git -C "$WORKDIR" cat-file -e "HEAD:assets/$f" 2>/dev/null && ! printf '%s\n' "$KEEP" | grep -qx "$f"; then :; else rm -f "$f"; fi
    done )
fi
find "$WORKDIR" -mindepth 1 -maxdepth 1 ! -name .git -exec rm -rf {} +
cp -a dist/. "$WORKDIR/"
mkdir -p "$WORKDIR/assets"
# old chunks that the new build does not have, listed so the next deploy prunes them
( cd "$OLDASSETS" && for f in *; do [ -e "$f" ] || continue; [ -e "$WORKDIR/assets/$f" ] || { cp -a "$f" "$WORKDIR/assets/"; echo "$f"; }; done ) > "$WORKDIR/.assets-prev"
rm -rf "$OLDASSETS"
cd "$WORKDIR"
git add -A
if git diff --cached --quiet; then echo "nothing changed"; exit 0; fi
SRC_REV="$(git -C "$ROOT" rev-parse --short HEAD)"
git -c user.email="$EMAIL" -c user.name="$NAME" commit -q -m "Deploy lab ($SRC_REV)"
git push -u origin gh-pages
echo "pushed gh-pages of $SELF_REPO -> https://smartlotus.github.io/jelly-gift-lab/"

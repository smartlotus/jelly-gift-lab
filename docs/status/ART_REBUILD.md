# Art rebuild — finishing pass (v03m)

Branch: `v03k-art-rebuild` on `smartlotus/jelly-gift-story` only.
Do not deploy and do not touch `jelly-gift` / live gh-pages until a parent review
of `review/v03m/` stills and `/workspace/review/v03m/clip-*.mp4` authorizes it.

This pass fixes the remaining material mismatches after the v03l environment
and pose-sheet direction were accepted: wrap double-exposure, the dismembered
cat, blob collie, old procedural snow/dawn, guessed door rectangle, and dark
chrome on a dark ceiling.

## What changed

- Wander worlds are finite. One continuous wide plate per forest
  (`flower-ground-wide.jpg`, `mushroom-ground-wide.jpg`) is drawn once with
  camera clamp and a chapter exit near the right edge. No wrap, no left-edge
  crossfade, no full-scene morph overlay. Older A/B plates remain only as
  fallback if a wide file is missing.
- Desktop cover is boosted so a single 16:9 plate still walks ~2.75 screens
  without a composition join. Portrait keeps a wider vista of the same painting.
- Hero cat and shared fauna (deer, lamb, border collie, kitten, owl) are
  extracted connected whole-body pixel walk cycles, native scale, no
  detached head/torso/feet stack and no magenta fringe. Relative size
  deer > collie ≈ lamb > cat > owl. Owl flies with a wing cycle and can perch.
- Couple walk/run sheets are real 4-frame limb cycles (not a translated still).
  Sit / hold / sleep / lean keep the improved young-adult pose sheet. Greet
  pets use the new collie and calico.
- Cottage door overlay is the measured leaf (`x=205,y=104,w=35,h=58` on the
  480×270 plate) plus the extracted door pixels hinged over a warm interior
  glow — not a pale guessed rectangle. Snow and dawn are dedicated plates
  (snow on roof/path/trees and warm windows; dawn sun, water, grasses, path).
- Empty room is architecture only. `?furnish` / demo layout is a sitting area
  plus a bed on the right, with floor contact shadows, not a default lineup.
- Top chrome is a cream pill so dark labels stay readable on a dark ceiling
  or a bright sky. Chinese narrative lines are unchanged.

## Review evidence

zh-CN full-size stills live in `review/v03m/`. Real-time motion clips
(all under 15MB, also copied to `/workspace/review/v03m/`) cover flower and
mushroom walks (desktop + portrait) and home walk / greet / sofa / sleep /
snow / dawn.

WebKit iPhone-15 checks against local `dist/` (flower, mushroom, home room)
revealed the curtain and reported no page errors; wander loaded one plate.

## Known leftovers (not claimed finished)

- Walk/run dress hem is shorter than the midi hold/sit/sleep dress. Hair,
  sweater, and palette still match the same couple.
- Desktop forest framing is a closer path crop of the wide plate (so the
  world can be walked without a second mismatched painting). Portrait still
  shows sky and distant hills of the same artwork.
- This note does not claim the aesthetic gate passed and does not authorize deploy.

# Earlier note — compositing repair (v03l)

Branch: `v03k-art-rebuild` on `smartlotus/jelly-gift-story` only.
Do not deploy and do not touch `jelly-gift` / `jelly-gift-site`.

The previous pass failed visual review: extracted sprite clippings were stamped
into the sky (sticker collage), with a flat green ground bar and an oversized
white 16² cat. This pass rebuilds compositing from complete grounded landscape
plates rather than adding more floating density.

## What changed

- Flower and mushroom wander now draw complete opaque pixel landscapes. Plants
  are painted into the terrain; a sandy/earth path runs left-to-right; the cat
  walks on `pathY` aligned to the painted path line (`pathT`).
- No more baked scatter bands or sky-stamped extracted clippings.
- No flat colored ground strip over the plates.
- Landscape plates are stitched into wide panoramas and tiled with a left-edge
  fade so loops blend instead of cutting.
- Portrait modes use dedicated tall plates (flower) or a zoomed grounded plate
  (mushroom) so the garden fills the phone, not empty sky.
- Wander cat is a refined 32×32 cream walker (same ears, sleepy face, tail
  band) drawn at native size on the path.
- Home vases are extracted ceramic bouquets of only 紫精灵 and 戴安娜, not the
  old flat green/white pots.
- Empty interior plate is architecture only (shelf, lamp, curtains, window,
  floor). Sofa and bed appear only as placed furniture.
- Review shots in `review/v03l/` are in-app zh-CN.

## Visual audit notes (from full-size reads)

- Flower desktop / portrait / landscape: rooted carpets, open path, Chinese
  line 「紫精灵和戴安娜……好像专门开给我们看的。」 Cat stands on the path.
- Mushroom desktop / portrait / landscape: planted giant caps with gills and
  stems, path, Chinese line 「天暗了下来。这些蘑菇，一盏一盏的。」
- A panorama loop can still show a *soft* blend morph (not a knife-cut) when
  the wide plate wraps.
- Animals are still the original small pixel critters at integer 2×. The collie
  can read dark at this size; they were not fully redrawn at 32–64px.
- Couple close-up (`portraits.png`) is still more painterly than the graphic
  in-game walk/sit sheets. Identity matches; finish does not.

This note does not claim the art is finished or “best.”

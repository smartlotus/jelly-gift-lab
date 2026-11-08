# Art rebuild — compositing repair (after first aesthetic gate fail)

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

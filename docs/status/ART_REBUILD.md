# v03k art rebuild — aesthetic design gate

Branch: `v03k-art-rebuild` on `smartlotus/jelly-gift-story` only.
Do not deploy and do not touch `jelly-gift` / `jelly-gift-site`.
Live published story stays as-is until a later parent-requested deploy.

This note is not a claim that the art is finished or “best.” It records what
was actually implemented for the first visual gate, with full-size captures
under `review/v03k/`.

## Visual goals

- Flower chapter is a flower *sea*: rolling carpets of only 云南紫精灵 (working
  reference: cream carnation with a violet picotee edge) and 戴安娜粉玫瑰
  (pastel spiral tea rose). Winding path, atmospheric depth, foreground
  occlusion. No tall-pole woods and no solid green blob canopy.
- Mushroom chapter is a mushroom *sea*: giant umbrella caps with gills, many
  scales, tiny luminous carpets, soft mist. Not a neon ellipse row, and not
  80% empty sky.
- People are a new attractive young-adult pixel couple (~6–7 heads), not
  photo-traces and not thick-outline chibi. Woman: mid-part dark hair, navy
  dress. Man: textured dark hair, cream knit, dark trousers, no glasses.
- Home has architectural depth (plate: plaster, beams, lamp, evening window,
  curtains, built-in shelves, wood floor). Placeable furniture uses shaded
  material sprites. Empty room stays empty of moveable furniture.
- Only those two flower species appear as flowers, including vases.

## What changed in this rebuild

- Generated original pixel plates and sprite sheets live under `public/art/`
  (no private reference photos; raw generator output is gitignored).
- `src/art/loader.ts` preloads them; stages fall back to procedural stamps if
  a file is missing.
- Flower/mushroom density comes from baked strips (`fields.ts`) that instance
  extracted sprites once, then `drawImage` the strips each frame. Stamp scale
  is a multiplier (`targetH / img.height`), not a raw pixel height.
- Animals and the cat are drawn larger; the cat stays the readable focus.
- Montage uses pair sprites (walk cycle, run-with-dog, sit, sleep, lean) and
  closer cameras for sofa / sleep. The run sheet already has a dog separated
  from the couple’s legs.
- Cottage walk uses the exterior plate; the beige procedural door slab is no
  longer painted over the plate’s wooden door (only a warm glow).
- Interior furniture now sits on the plate’s actual skirting (`plateFloorT`
  0.72, matching the painted floor junction) instead of mid-plaster.
- Sleep is a closer cropped composition with the couple on a bed, not a
  distant pair floating in the empty wide shot.
- Layout persistence, exact Chinese lines, audio, and pause/DPR budget are
  unchanged. The English flower line now says 紫精灵 carnations, not lisianthus.

## Full-size evidence (`review/v03k/`)

- Flower sea: `flower-desktop.png`, `flower-portrait.png`, `flower-landscape.png`
  (side-by-side published look: `old-flower-desktop.png`)
- Mushroom sea: `mushroom-desktop.png`, `mushroom-portrait.png`, `mushroom-landscape.png`
  (old: `old-mushroom-desktop.png`)
- Couple design: `portraits.png`, `pose-sheet.png`
- Home: `home-empty-desktop.png`, `home-furnished-desktop.png`,
  `home-walk-desktop.png`, `home-sofa-desktop.png`, `home-sleep-desktop.png`,
  `home-snow-desktop.png`, `home-dawn-desktop.png`, `home-approach-desktop.png`

## Unresolved choices

- Florist listings for “云南紫精灵” sometimes describe a fully purple carnation;
  other listings mix the name with 紫边 (white, purple edge). This rebuild keeps
  the previous working reference (cream + violet edge) rather than changing
  species again.
- Stand/sit sheets use a longer navy dress; the walk/run cycle came back
  slightly shorter. Identity (hair, palette, faces) matches.
- Generated portraits are a painterly-pixel close-up; in-game bodies come from
  the more graphic pose/walk sheets. They share identity, not an identical
  rendering finish.
- Distant flower/mushroom stamps can read as floating against the sky rather
  than planted on a hillside. Desktop seas are dense; portrait still leaves a
  noticeable sky band above the ridge (better than the old 80% void, not gone).
- The playable ground/path is still a flat colored band in front of the seas.
- Demo furniture lines up along the back wall (the coordinate `y` still means
  “up from the floor line toward the wall”). The perspective foreground floor
  stays empty unless the player drags items. The demo bed sits in front of the
  lower window.
- Greet-scene pets are still the old small pixel critters, so they clash with
  the new couple; they were removed from the sofa close-up for that reason.
- Snow is a cool grade plus a wavy white ground over the summer cottage garden,
  not a rebuilt winter plate.
- Dawn is still procedural hills and triangle pines behind a stronger lean pair.
- Door-open glow is an estimated warm rectangle on the plate’s printed door.
- The mushroom establishing plate (unused by the wander engine) has tiny pink
  ground dots that can read as extra blossoms.

Motion, layout persistence, and a later Pages deploy are out of scope for this
gate. Parent review of these captures should happen before any replace of the
live story.

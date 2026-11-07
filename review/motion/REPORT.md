# Motion repair — jelly-gift-story (private)

Date: 2026-11-07 (America/Los_Angeles). Repo: `smartlotus/jelly-gift-story` (private). Old `jelly-gift-site` was not touched. No Pages publish and no visibility change.

This is not a claim that animation quality is final. Code tests were not used as proof of motion quality. Frames below were taken from real-time Chromium playback (844×390, dpr=1) at wall-clock seconds, not `__pause` / `__steps` / forced `seek`.

## What the reviewer saw, and what it actually was

| Observation | Classification | Root cause |
|---|---|---|
| People statically slide rather than walk/run | Implementation | `hold` / `holdL` set `moving=false`, so legs stayed at gait 0. Snow `runHold` used a 3–5px sine bob that disappeared at playback. Pair spacing 16–18px at ~1.85 scale caused overlap. |
| Cat / animals slide | Implementation (partly recording) | Hero walk frames only shifted paws 1–2px under a front-facing 16×16 head. Critter walk rows were similarly tiny. Old `flower-deer.webm` used `__wander.seek(780)` then idled, so the hero stood still. Same-direction animals spawned at `cam.x-28` and were culled behind a right-scrolling camera during a continuous ArrowRight hold. |
| Door snaps open | Implementation | `beginPath` trapezoid fills (canvas AA, then integer upscale) plus a 24px door and a long 2.9s window that was easy to miss. |
| Greeting pets unread as calico/collie; “floating pink heads” | Implementation + some misread | Pets were tiny; calico used grey `g` instead of black `b` for the dark patch; greet scale ~1.75. Chibi kneel (large peach heads) plus pink rose vases read as floating heads. |
| Sofa people overlap | Implementation | Sitters placed too close (`sx±` small) without solid laps. |
| Snow dog stuck behind his legs; dawn “white artifact” | Implementation (+ lighting) | Dog drawn at `x-22` sharing the pair bounce, so it sat in his stride. Dawn snow/white pixels on a pale ground can read as debris; not separately “fixed” beyond pulling the dog clear. |
| Sunset hard-cut; lean = idle stand | Recording artifact + implementation | Old `snow-dawn.webm` did `page.goto(?at=snow)` then `page.goto(?at=dawn)` (two loads). Lean used `g.rotate(0.16)`, which smeared every pixel and still looked like standing. |
| Flower pink/white “corruption” | Implementation + recording | Aggressive scallop `0.16*sin(5θ)+0.08*sin(3θ)` punched pink-sky holes; JS `(-n % m)` is negative, so live canopy wrap flickered. Old flower video was also **portrait 390×844** and used `seek()`, so the canopy plus a standing cat looked broken. Some pink gaps are intentional sky windows. |
| Indoor floor glitchy horizontal streaks | Implementation (confirmed by parent screenshot) | `drawWoodFloor` used `t²` perspective boards quantized with `\| 0`, so early boards collapsed onto the same 1px rows and overdrew alternating browns, plus rgba 1px strokes. Not an uncleared-buffer bug. |

## What changed (code)

- `src/stages/home/door.ts` (new) — integer-slice hinged door (jamb, dark-to-warm interior, width `w*cos(ang)`, skew, panel lines, knob). No path fills. Shared by cottage walk and the approach house.
- `src/stages/home/room.ts` — `drawWoodFloor()`: solid base, six perspective boards with a minimum 5px gap, opaque 1px highlights only on wide boards, 2px junctions. Used by empty and furnished rooms.
- `src/stages/home/people.ts` — walk/run stride 6/8 with foot lift and hip-to-foot interpolation; `hold`/`holdL` now walk (or run) instead of freezing; sit has lap/thighs/shins; kneel has shins on the floor; lean is a dedicated inward shift (no canvas rotate); sleep is a longer side-lying body.
- `src/stages/home/montage.ts` — pair spacing; ~0.8s door open from t≈3.13–3.93; greet: kneeling side by side, collie rushes to his left, calico to her right; sofa sitters at `sx±22`; snow her at `x+28`, collie at `x-74` with its own `t*14` bob; dawn lean without tilt.
- `src/stages/home/approach.ts` — same hinged door; enter open = `min(1, t0/0.8)`.
- `src/stages/wander/engine.ts` — positive `wrapX`; gentler tree scallops + softer under-blob; same-direction critters spawn ahead on screen (`cat.x+100`, clamped) so a walking player can catch up instead of the animal being culled behind the camera.
- `src/shared/pixel/cat.ts` — walk cycle plants one paw and lifts the other, with a 1px body shift and a 2px pass bob.
- `src/shared/pixel/fauna.ts` — wider stance on deer/lamb/collie walk vs collected; calico dark patch uses `b`; added `CAL_RUN2`.

## Recordings

All three new clips are Chromium `recordVideo` at 844×390, normal speed, well under 15MB.

| File | Size | How it was shot |
|---|---|---|
| `/workspace/motion-review/home-motion.webm` (also `review/motion/video/home-motion.webm`, `/workspace/jelly/recordings/home-motion.webm`) | 1063KB | Save furniture → one skip into walk → let walk 5.8s, greet 5.6s, sofa auto-advance. No extra skips. ~15s. |
| `/workspace/motion-review/snow-dawn.webm` | 1422KB | Save → five skips to snow t=0 → play snow 6.4s then the in-engine ~0.7s fade into dawn, recorded through ~14s. **No second `page.goto`.** |
| `/workspace/motion-review/flower-walk.webm` | 2052KB | `flower/?lang=zh`, hold ArrowRight 18s from the start. **No `seek`.** |

### Why the earlier three clips were incomplete (do not reuse them as quality evidence)

- `door-greet-sofa.webm` played the scenes in one page, but the door was an AA path fill and `hold` did not animate legs, so a “walk” looked like a slide. Floor streaks were already in the renderer.
- `snow-dawn.webm` hard-cut because it navigated `?at=snow` and then `?at=dawn` as two page loads (`startT` 2.4 vs 5.5).
- `flower-deer.webm` was portrait 390×844 and used `__wander.seek(780)` then an idle wait, so the cat stood still and animals popped in from a teleport rather than a walk. Seek also retro-spawned every earlier PLAN entry.

A first pass of `home-motion.webm` in this repair also skipped greet by accident: waiting 5.9s of a 5.8s walk let the scene auto-advance to greet, and the “skip to greet” actually entered sofa. That take was discarded. The delivered `home-motion.webm` lets scenes auto-advance; stills were tagged with `window.__home.phase()` (`walk` / `greet` / `sofa`).

## AFTER stills (wall-clock, filenames are the target; flower shots drifted ~0.2–0.3s)

Logged flower times: 0.78, 2.25, 4.74, 6.23, 8.23, 12.24, 16.23s (labels 0.5 / 2.0 / 4.5 / 6.0 / 8.0 / 12.0 / 16.0). Home/snow times matched the labels within ~0.04s.

What the AFTER frames actually show (inspected, not assumed):

- Walk 1.6s vs 5.2s: pair spaced, holding hands, changing feet; at 5.2s they stand at a fully open warm doorway.
- Door 3.2 / 3.6 / 4.0s: closed wooden slab → hinged ajar with warm interior and lit window → thinner open slab. Readable across ~0.8s.
- Greet 1.6 / 3.2 / 5.0s (`phase=greet`): kneeling pair; black-white collie and orange-cream-dark calico run in from the right; collie reaches his left, calico settles to her right. Not floating pink heads. Floor is stepped wood, no rainbow 1px streaks.
- Sofa 1.4s (`phase=sofa`): two separated seated bodies on the sofa, collie left, calico right, clean floor bands.
- Snow 2.0 / 4.0s: different run strides; clasped hands; collie trots on his left with a clear gap (no longer in his legs).
- Dawn fade 6.8s: dissolve (ghost of the snow runners + emerging dawn pair and house). Dawn 8.5 / 11.5s: pair leaning inward with reaching arms, sun brightening — not a second page load.
- Flower: canopy is large overlapping green masses with intentional pink sky windows (no random punched holes). Cat moves across the path. Lamb appears ahead (~4.5s), beside (~6.0s), then passed to the left (~8.0s). Grey kitten from the right (~12s). Brown deer ahead at ~16s, kitten already on the left.

BEFORE extracts from the old webms live in `review/motion/before/`. Side-by-side labeled grids:

- `review/motion/grids/gait-before-after.jpg`
- `review/motion/grids/door-before-after.jpg`
- `review/motion/grids/greet-pets-before-after.jpg`
- `review/motion/grids/sofa-floor-before-after.jpg`
- `review/motion/grids/snow-before-after.jpg`
- `review/motion/grids/dawn-before-after.jpg`
- `review/motion/grids/flower-before-after.jpg`

Copies of the three videos and the seven grids are also at `/workspace/motion-review/`.

## Leftovers (do not stamp “all passed”)

- Figures are still blocky chibi (big heads, short legs). Walk/run is readable at 844×390 compared with the old idle-slide, but it is not film animation.
- Dawn lean is a distinct inward shift, not a rotate-smear, but it can still read as “standing closer together” rather than a deep slump.
- Greeting collie settles against his left side and slightly overlaps his shirt; it is beside him, not a clean stand-off gap.
- Hero cat stays a front-facing 16×16 cream chibi. One-paw-up vs one-paw-down is visible in a nearest-neighbor crop (e.g. flower 4.5s) and is no longer a 1px shuffle, but a glance at full-screen still reads as a round cream cat sliding because the head dominates the silhouette. This is not a side-view run cycle.
- Wander lamb is a 14px outlined sprite; at play scale the black outline dominates, so the lamb often reads as a small dark rounded body rather than fluffy white wool. The deer is a clearer brown four-leg silhouette.
- Tree negative spaces are now intentional rounded sky windows, not wrap-flicker holes. They are still stylized pink gaps and could be read as “arty holes” by a harsh reviewer.
- Same-direction animals now spawn ahead so a right-hold can meet them. If the player stands still, oncoming (`dir < 0`) animals still enter from the right; same-direction ones appear ahead and walk away slowly until the player moves.
- Finale caption covering legs, night-owl blend, and other non-motion items were left untouched.
- Animation quality is **not** declared done. Parent should run an independent videoReview on the three new clips before any user handoff.

## Repo / publish

Commits belong only on private `smartlotus/jelly-gift-story`. Do not merge or deploy to `jelly-gift-site`. GitHub Pages stays off (plan previously returned HTTP 422). Visibility stays private until the parent explicitly authorizes otherwise.

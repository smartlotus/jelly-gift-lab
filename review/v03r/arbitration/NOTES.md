# t26 review arbitration (2026-11-09 evening, America/Los_Angeles)

Made with `tools/v03r-arbitrate.mjs` (Chromium, real time, **no seek / test teleports during recording**). Every
animation frame the page logs telemetry; a debug-only stamp `T=…` (bottom-left, this test only, not in the app)
burns the same clock into the video, so a frame can be matched to its telemetry exactly. The mp4 files are local
only (gitignored); telemetry JSON, strips and annotated stills are committed.

## Home (`home-*`)

Reviewer claims: opaque table through the sofa (~4 s), heavy penetration (7–8 s), toddler bed (11–14 s).

| Claim | Finding (telemetry over every frame) |
| --- | --- |
| table through the sofa ~3.5–4 s | **Genuine, short**: in the fe69b7b build, arming the table chip showed the preview at its last position — exactly where the sofa had just been dropped — for ~0.25 s (10 frames, T 3.48–3.72, preview/sofa overlap −0.915 m). `before-fix/`, `home-annotated-1.jpg`. Fixed: the preview is hidden when a chip is armed and appears only at a pointer position that passed the collision check. After the fix: min preview–sofa gap over the whole clip **+0.042 m** (`home-annotated-2.jpg`). Regression test added. At the parent's 4 s still the table is a valid preview beside the sofa (adjacency, not intersection). |
| heavy penetration 7–8 s | **Not a geometry bug.** The placed table stops at the sofa: min table–sofa gap over every drag frame **+0.042 m**, one table mesh only. The red rectangle is the "cannot go here" floor decal (not a mesh, no second table); it is drawn on the floor where the table would have gone, so on screen it lies under/around the sofa. `home-annotated-3.jpg`, `-4.jpg`. |
| toddler bed 11–14 s | **Not a bug.** Measured mesh bounds: bed 2.15 × 1.76 m (h 1.15 with headboard), sofa 2.02 × 0.86 m (h 0.88), table 1.50 × 0.97 m. In perspective the bed reads larger than the sofa (`home-annotated-5.jpg`). No resizing. |

## Woods (`woods-*`, `reviewed-clip-*`)

Reviewer claims: pig always faces right while the cat goes left; teleports flower 7–8 s, mushroom 4–5 s and 7–8 s.

- **Facing:** frames where the pig faces against its own motion: **0** (flower, mushroom). While the cat walks left the
  pig faces left in 83/160 (flower) and 88/166 (mushroom) frames. It faces right only during the crossing
  (≈1.3 s, T 5.3–6.7 flower / 5.2–6.5 mushroom): the cat has turned back, and the pig walks right *behind* her on the
  back lane to get to her new rear. That is its direction of travel, not a wrong heading. The sheet is drawn facing
  right and mirrored when facing < 0: `woods-pig-flip-aligned.jpg` (sync stamps match telemetry within 0.03 s).
- **Teleports:** largest per-frame steps (world px; view is 320 px wide): cat 1.7, pig 3.3, camera 1.7. The 3.3 px pig
  step is two fixed 1/60 s simulation steps in one sample at ~98 px/s crossing speed. One 0.59 s page stall happens
  at load (T 0.59–1.18), before any walking. The fe69b7b review clips at the claimed moments, 10 fps:
  `reviewed-clip-*-zoom-*.jpg` and `reviewed-clip-*-strip-*.jpg` — the motion is continuous. The fe69b7b clips did call
  `seek()` once at ≈1.5 s, before walking; the new `woods-*-desktop.mp4` start at the entrance with no seek.
- Not reproduced → no woods code changed in this pass.

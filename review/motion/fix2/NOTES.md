# Fix 2 — door staging and sleep→snow overlay

2026-11-07 (America/Los_Angeles). Private `smartlotus/jelly-gift-story` only. No Pages / visibility change. Old `jelly-gift-site` untouched.

## 1. Door “snap to black rectangle”

Old home-motion.webm ~00:04→05 was walk t≈3.1–4.0 of an 0.8s open while the pair kept walking into the jamb. Cosine foreshortening plus a `#2A2420` hole made later frames read as a sudden dark/yellow rectangle, and the couple covered the remaining slab.

Change (walk scene only, plus shared `swingDoor` warmth/slab):
- Pair walks until t=3.4s and **stops short of the door** (door stays fully visible to their right).
- Door opens over **1.6s** (t=3.4–5.0) while they stand.
- Interior is warm amber from the first gap (never a black pit). A wood slab stays ≥30% width so the hinge remains readable.
- Walk scene length is now 7.2s so the open door can be seen at rest.

Verified from the trimmed normal-speed clip `door-open.webm` (not forced game seeks): 00:03.20 closed + walking; 00:03.90 paused, ajar, warm gap; 00:04.40 more open; 00:05.00 warm reveal with a remaining hinged slab. Matches lossless PNGs in `after/door-*.png`.

## 2. Semi-transparent rectangles on snow ~00:01

Not a VP9 compression artifact and not the snowflake particles (1–3px squares).

ffmpeg extract of old `snow-dawn.webm` at 00:01 (`before/video-snow-01.00.png`) shows the sleep scene’s **window** (top-right) and **bed** (wide horizontal bar) composited over the snow cottage / trees / sky.

A live lossless PNG captured at the same logical moment — snow t=0.15s right after skip/seek onto snow, no video encode — shows the **identical overlay** (`before/live-snow-0.15s.png`). Cause: montage fade blits the previous scene at declining alpha for 0.7s. Sleep is made of large filled rects, so sleep→snow looks like glitch blocks. The old review clip used five rapid skips, so that fade landed near file time 00:01; a normal playthrough would show the same overlay at the start of snow after sleep.

Fix: sleep→snow dissolves through a dark veil instead of blitting the sleep framebuffer. Other fades, including the passed snow→dawn dissolve, are unchanged.

Verified: `after/snow-0.15s.png` (lossless) and `from-clip/snow-clip-0.15s.png` (from `snow-start.webm` 00:00.15) show only a slight dim veil over a clean snow landscape — no bed, no window on the roof. At 00:01 the clip is fully clean snow with the running pair and the independent dog.

## Deliverable paths

Clips (both well under 15MB):
- `/workspace/motion-review/door-open.webm` (also `review/motion/fix2/door-open.webm`, 102KB, 7.2s, starts at walk t=0)
- `/workspace/motion-review/snow-start.webm` (also `review/motion/fix2/snow-start.webm`, 211KB, 4.0s, starts at snow t=0)

Before/after:
- `review/motion/fix2/door-before-after.jpg`
- `review/motion/fix2/snow-before-after.jpg`
- Before video frames: `review/motion/fix2/before/video-door-*.png`, `before/video-snow-01.00.png`
- Before live PNG: `review/motion/fix2/before/live-snow-0.15s.png`
- After lossless: `review/motion/fix2/after/door-*.png`, `after/snow-*.png`
- After from clips: `review/motion/fix2/from-clip/`

## Leftovers (subjective, not new bugs from this pass)

- The door is still a pixel hinged slab, not a 3D swing.
- The couple’s pause is a standing chibi pose.
- Sleep→snow is now a short dim veil, not a pictorial dissolve (snow→dawn is still the pictorial dissolve that passed QA).
- Unrelated leftovers from the previous motion pass (front-facing hero cat glance-silhouette, lamb outline reading dark, dawn lean as “standing closer”) were not touched.

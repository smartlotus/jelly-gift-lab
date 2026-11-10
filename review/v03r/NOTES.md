# review/v03r — t26 evidence (2026-11-09, America/Los_Angeles)

Produced by `node tools/v03r-verify.mjs` against `node tools/serve.mjs dist 8833` (fresh `vite build`), Linux box,
Playwright Chromium (swiftshader WebGL) + Playwright WebKit. Results: route 29/29, woods 60/60, home + film 49/49.

- `rec-flower-walk.mp4`, `rec-mushroom-walk.mp4` — real-time recordings of a scripted walk (hold right, reverse,
  walk on); the pig follows the cat continuously, crossing behind her on reversals.
- `rec-home-3d-editing.mp4` — real-time recording of the 3D room: place, drag near→far and back, rotate, more pieces,
  orbit, zoom. Long (≈2 min) because software WebGL renders slowly; nothing is sped up or stitched.
- `chromium-*.png` / `webkit-*.png` — woods (desktop + phone portrait), home editor, end card without a film,
  film player with a synthetic test pattern (not the real film).

Limits: no real GPU or phone; the WebKit build here has no H.264 decoder, so WebKit only checks the end-card fallback.
The future-home film itself is not in the repo yet (separate workstream) and was not tested.

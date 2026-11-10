# review/v03r — t26 evidence (2026-11-09, America/Los_Angeles)

Produced by `node tools/v03r-verify.mjs` against `node tools/serve.mjs dist 8833` (fresh `vite build`), Linux box,
Playwright Chromium (swiftshader WebGL) + Playwright WebKit. Results: route 29/29, woods 60/60, home + film 49/49.

(The three `rec-*.mp4` files are gitignored — regenerate with `ONLY=rec node tools/v03r-verify.mjs`.)

- `rec-flower-walk.mp4`, `rec-mushroom-walk.mp4` — real-time recordings of a scripted walk (hold right, reverse,
  walk on); the pig follows the cat continuously, crossing behind her on reversals.
- `rec-home-3d-editing.mp4` — real-time recording of the 3D room: place, drag near→far and back, rotate, more pieces,
  orbit, zoom. Long (≈2 min) because software WebGL renders slowly; nothing is sped up or stitched.
- `chromium-*.png` / `webkit-*.png` — woods (desktop + phone portrait), home editor, end card without a film,
  film player with a synthetic test pattern (not the real film).

Limits: no real GPU or phone; the WebKit build here has no H.264 decoder, so WebKit only checks the end-card fallback.
The future-home film itself is not in the repo yet (separate workstream) and was not tested.

## t26b targeted clips (after the review fixes)

- `clip-flower-reverse-desktop.mp4`, `clip-flower-reverse-phone.mp4`, `clip-mushroom-reverse-desktop.mp4`,
  `clip-mushroom-reverse-phone.mp4` — real time, ~12 s, right → left → right; the pig steps up the path and passes
  behind the cat in both directions. Strips: `strip-*-reverse-*.jpg` (2.5 fps).
- `clip-home-blocked-drop-bed.mp4` — sofa placed; armed table swept across it (red footprint, no preview inside);
  tap there places nothing; valid near drop; near → far drag; pushed into the sofa it stops at the edge; queen bed
  beside the sofa; orbit + zoom. Strip: `strip-home-blocked-drop-bed.jpg` (1 fps).
- The `rec-*.mp4` files above predate these fixes.

## t26d real future-home film (v4 candidate, dev branch, not deployed)

`ONLY=real node tools/v03r-verify.mjs` plays the committed `public/media/future-home.mp4` (no request routing).
Full suite this round: 172/172 (route, woods, home, block, film, real; Chromium + WebKit).

- `chromium-real-film-playing-3s.png` — desktop 1280×720, burned first line in the picture, 跳过 bottom-right, no page caption.
- `chromium-real-film-finale-frame.png` — near the end: the film's own closing lines, controls clear of them.
- `chromium-real-film-endcard.png` — after the film: buttons only, no second copy of the closing lines.
- `chromium-real-film-phone-landscape-tap.png` / `-phone-landscape-playing.png` / `-phone-portrait-playing.png` —
  touch phone, autoplay refused → 轻触播放 → plays; turned to portrait, letterboxed (contain).

Playback numbers are in `verify.json` and AI_HANDOFF §t26d. Limits: headless Chromium with software rendering, visibility
change simulated, no real phone, WebKit build has no H.264 (fallback only). Frame-level QA only — not a whole-film pass.

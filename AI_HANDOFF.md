# AI handoff — story edition WIP (read this first)

**Last checkpoint:** Saturday 7 November 2026, late evening, America/Los_Angeles (this file updates with each pushed increment).
**Follow-up pass:** Sunday 8 November 2026 — pig companion, caption clearance, cottage, dollhouse polish (see §"v03n pass").
**t26 pass:** Monday 9 November 2026 — the 200-day ending is withdrawn, web polish (see §"t26").
**t26d:** Monday 9 November 2026, evening — the v4 future-home film **candidate is integrated on this dev branch** (not merged, not deployed, still under review; see §"t26d").
**t26e:** same evening — the WebKit page errors from the t26d run explained; two real unhandled rejections fixed (see §"t26e").
**t33 (branch `v03s-anniv-ending`):** same night — preview branch where the ending plays the **200-day film** (`anniv-200.mp4`) instead of the v4 future-home film (see §"t33").
**t35 / t36:** no pre-film text, closing card order 2·3·1·4 (t35); the complete 1080p v2 200-day film swapped in, `v03s-anniv-ending` **merged into `main` and deployed to Pages** on Wednesday 11 November 2026 (see §"t36").

This file is the durable takeover note. It describes **what is on branch `v03m-spatial-home` right now**, not what the live Pages site runs.

| Item | Value |
| --- | --- |
| Repo | [`smartlotus/jelly-gift-story`](https://github.com/smartlotus/jelly-gift-story) (public) |
| Working tree | `/workspace/jelly/jelly-gift-story` |
| WIP branch | `v03m-spatial-home` |
| Default branch `main` | `a2094e3` — merge of `v03s-anniv-ending` (t36, Wednesday 11 November 2026); previous `e08e1c2` (v03l record) |
| Live delivered source | tag **`v03l`** = `ef2405b635d532cd219914812f7681f523640be7` (merge of [PR #2](https://github.com/smartlotus/jelly-gift-story/pull/2)) |
| Live Pages | https://smartlotus.github.io/jelly-gift-story/ — `gh-pages` `c4818cbe68a10b39676bc62ad930656f33a0460b` (“Deploy story edition (a2094e3)”, t36: v03s-anniv-ending + complete 1080p 200-day film). Previous: `de208c3` (v03l, source `ef2405b`) |
| This WIP | **deployed in t36** (user asked: 「现在把这个版本部署上网站」). Do not redeploy further changes without a new user request. |
| Old stable gift | **Do not touch.** `smartlotus/jelly-gift` / `jelly-gift-site`, live https://smartlotus.github.io/jelly-gift/, last deploy `1c2d5de`. Do not merge this work into that default branch. Old source PR 7 stays open and untouched. |

After each push, `git rev-parse origin/v03m-spatial-home` is the source of truth for the SHA.

---

## t36 — complete 1080p 200-day film; merged and deployed (Wednesday 11 November 2026, Asia/Shanghai)

User request t36u: 「这个视频才那么短吗？Notion 里面的不是很长吗？把 Notion 里面的完整视频加进去啊我要的是完整版，同时现在把这个版本部署上网站，给我网站网址」.

- Source: Notion page 臭猪臭猫｜200天纪念日动画完整项目 (`bdb0d79231e4434885f3d359c66b5239`), project zip → `anniv/out/臭猪臭猫_200天纪念日_v2.mp4` (final v2 成片). It is the same film as the old site file (Remotion `durationInFrames={2030}`, 30 fps = **67.712 s**); there is no longer cut in that project. The old site copy was a 1280×720 / 11.6 MB downscale.
- `public/media/anniv-200.mp4` is now that file **byte for byte** (no re-encode, no cut, already faststart: `moov` before `mdat`): H.264 High 1920×1080 30 fps 2030 frames + AAC, 58,067,050 bytes, md5 `d570c6b239b61cd6a933b5a52375e76e`. Same filename, so `ending-film.json` and `/sky/` cinema both pick it up.
- `public/media/anniv-200-poster.jpg` regenerated from the 1080p film at the same frame as before (~66.67 s, the 臭猪臭猫 / 200天纪念日快乐 title card), 1920×1080.
- `tools/v03r-verify.mjs`: real-film check now expects 1920×1080 and duration 67.712 s. Suite 208/208 (Chromium + WebKit), log `review/v03s/t36-verify.log`.
- Deploy: `v03s-anniv-ending` merged into `main` (non-force `--no-ff`) = `a2094e3`, then `GIFT_DEPLOY=1 scripts/deploy_pages.sh` → `gh-pages` `c4818cb` (Pages build `built`). GitHub warned the 55 MB mp4 is over the 50 MB recommendation (limit 100 MB); no LFS.
- Live check: `/media/ending-film.json` → `media/anniv-200.mp4`; live mp4 md5 `d570c6b239b61cd6a933b5a52375e76e`, 58,067,050 bytes, 1920×1080, 2030 frames, 67.712 s; poster md5 `1718fb42…`. `tools/check-pages.mjs` on the live base: all 16 pages OK. `ONLY=real` of `v03r-verify.mjs` against the live base: 24/24 (Chromium real film + WebKit fallback).

 closing card in the order 2 · 3 · 1 · 4 (branch `v03s-anniv-ending`, 2026-11-09 night, America/Los_Angeles)

User request t35u: 「我要将播放后顺序改为 2314，播放前不放文字了」. The four sentences: 1 也许有一天，也许会是第 2000 天，我们已经拥有了一个自己的家。 2 我们已经有属于自己的两百天了， 3 我想第两千天可能也并不遥远吧。 4 我的小臭猫。

- **Before the film:** after SAVE there is no text any more (`.hm-line` stays off in `leaveRoom` and in the transform/end phases). It goes save → cream paper veil → film fades in. Without a playable film (WebKit headless / no H.264 / manifest missing), it goes straight to the closing card after ~1.4 s.
- **Closing card:** `home.finale` (zh + en in `src/stages/home/dict.ts`) = stanzas split by blank lines: [2, 3] / [1] / [4]. `renderFinale()` in `main.ts` builds `<p class="hm-fs">` per stanza with one `<span>` per line (`.hm-fs-last` = 我的小臭猫。, emphasised, with a short hairline above). `.hm-finale` has no `data-i18n` any more; it is re-rendered on language switch. `textContent` equals the user's exact string: 我们已经有属于自己的两百天了，我想第两千天可能也并不遥远吧。也许有一天，也许会是第 2000 天，我们已经拥有了一个自己的家。我的小臭猫。
- **Layout:** t35 block at the end of `src/stages/home/style.css` (clamp font sized on min(vw, vh), phone portrait and short-landscape media queries). Checked with `tools/v03s-t35-preview.mjs` (screens + geometry at 1280×720, 844×390, 390×844, 360×640, 667×375, en at 844×390; output in `review/v03s/t35/`, mp4 gitignored) and in `tools/v03r-verify.mjs` (exact text, no line before film, fit at 1280×720 / 390×844 / 844×390, WebKit fallback text).
- `home.transform` is kept in the dict but is no longer shown on /home/.
- Suite: 208/208 (Chromium + WebKit).

## t33 — preview: the 200-day film as the ending (branch `v03s-anniv-ending`, 2026-11-09 night, America/Los_Angeles)

User request t33u: 「现在先用第四个视频替代未来的家影片，做好网页给我看看效果」 — the 4th video = `anniv-200.mp4` (the 200-day film).
Branch `v03s-anniv-ending` from `v03m-spatial-home` @ `3a5fd50`. **Not merged, not deployed**; `main` / `gh-pages` unchanged.

- New `public/media/ending-film.json` → `{src: media/anniv-200.mp4, poster: media/anniv-200-poster.jpg, audio: true}`, **no `burned`**:
  the film has none of the protected lines in its picture (it ends on its own drawn title 臭猪臭猫 / 200天纪念日快乐), so the
  page shows 「也许有一天…」 on the paper page before the film (it leaves at +2.0 s, the film fades in from +1.05 s) and the
  end card shows 「我们已经有属于自己的两百天了…我的小臭猫。」 after it — the same hand-off v03q (`9ae6f5d`) used.
- `endingFilm.ts`: the manifest constant now reads `media/ending-film.json` (one file decides which film plays).
  The v4 files `future-home.{json,mp4}` / `future-home-poster.jpg` stay committed but unused. **To switch back:** copy
  `future-home.json`'s contents into `ending-film.json`.
- `/sky/` still offers the same 200-day film as its optional side film (unchanged).
- Tests (`tools/v03r-verify.mjs`): fixtures now route `ending-film.json`; the real-film block asserts anniv-200 (1280×720,
  json 200 / poster 200 / mp4 206), no v4 request, page line before the film and gone once it plays, end card **with** the
  finale line, replay, skip, 继续布置, phone refused-autoplay → 轻触播放, portrait contain. Full suite: **203/203** (Chromium + WebKit;
  WebKit here has no H.264 → fallback only). Log: `review/v03s/verify-203.log`.
- Preview: `tools/v03s-preview.mjs` (silent real-time recording; one test-only seek to shorten it) → screenshots in `review/v03s/`.
- Known look issue: the film's white background shows as a white band on the paper page in phone portrait (contain).

---

## t26 — the 200-day ending is withdrawn; web polish; future-home film in production (2026-11-09, America/Los_Angeles)

**Status:** still **not deployed**, nothing merged to `main` / `gh-pages`, old stable `smartlotus/jelly-gift(-site)` and PR 7 untouched.

### Ending decision (supersedes v03q below)

The user asked (t26) for a **new** ending film of a possible future home. So:

- `/home/` **no longer plays `public/media/anniv-200.mp4`**. That 200-day film stays only as the optional film on `/sky/`.
  `tools/v03r-verify.mjs` checks that `/home/` never requests `anniv-200`.
- The future-home film is **being produced in a separate workstream** (six scenes, the three protected lines retained) and
  goes through an independent video review first. A first full draft has been rendered in the separate workstream
  and is **under review — not accepted, not in this repo, no media deployed**. No placeholder video is
  committed and none must be.
- Until it lands, 保存布局 → the line 「也许有一天…」 under the warm veil → the static end card (second line, 继续布置 / 从头再来).
  No 再看一遍 is shown while there is no film.
- Integration contract (`src/stages/home/endingFilm.ts`): commit exactly
  `public/media/future-home.json` `{ "v": 1, "src": "media/future-home.mp4", "poster": "media/future-home-poster.jpg", "audio": true }`,
  `public/media/future-home.mp4` (H.264 + AAC, faststart) and `public/media/future-home-poster.jpg`. The page probes the
  manifest (`no-cache`); 404 / bad JSON / a browser without an H.264 decoder → end card. With a manifest the player is
  `playsinline` + `webkit-playsinline`, poster shown while loading (「影片载入中……」), starts muted and follows the site
  sound switch (a user gesture), shows 「轻触播放」 if autoplay is refused, pauses on tab hide, 跳过 works during the film,
  ended → end card with 再看一遍 (restarts at 0) and 继续布置 (returns the same saved pieces). The film never reads the
  saved layout (same `src` for any layout — tested). The code-drawn six-shot film stays parked (`FILM_ENABLED = false`).

### t26b — fixes from the independent review of the v03r recordings (2026-11-09 evening, PT)

Reviewer kept: whole cat cycles, both animals on camera, caption clear of the feet, real 3D perspective/orbit/zoom.
Reviewer blockers and what changed (still **awaiting a new independent visual review** — not a full pass):

- **Flower reversal, pig in front of the cat** (`rec-flower-walk` 00:08–00:10). Cause: the pig only started moving to
  the back lane once it was already overlapping her, and the lane was 5 px, so for a few frames it read as the same
  depth. Now (`engine.ts`) the pig *yields* when she turns toward it: it stops, steps 9 px up the path first, and only
  then trots past while drawn under the cat; it returns to her lane after she has passed. Both animals have a blocky
  contact shadow so the depth step reads as ground, and a pig on the back lane is drawn behind the ground critters
  too (painter's order by depth).
- **Table passing through the sofa** (`rec-home-3d-editing` 01:06–01:11). That was the armed-chip preview: a 45 %
  see-through ghost let the sofa show through it and read as two solids inside each other. Now: over an occupied
  spot there is no preview, only a red footprint on the floor; the tap places nothing and the chip stays armed (tap
  it again to put it down). On a valid spot the preview is near-solid (depth-sorted like an object, warm tint, no
  shadow). Dragging a placed piece into another stops at the last valid spot and shows the red footprint where it
  cannot go; release leaves it there. Every footprint now encloses its solid mesh (measured with
  `__homeRoom.bounds()`; before, several meshes overhung their footprint by a few cm).
- **Bed too small next to the sofa.** Measured in metres: the sofa was 2.2–2.26 m over the arms (oversized) and the
  bed's mattress top was only ~0.5 m with a thin quilt. Now sofa 2.0 × 0.86 × 0.88 m (seat ~0.48 m), queen bed
  2.15 × 1.76 m with mattress top ~0.6 m and headboard ~1.1 m; dining table 1.5 × 0.95 m top at 0.78 m; chairs
  0.96 m. Other pieces unchanged. The demo bed now stands with its headboard against the right wall.
- **Future film with burned-in lines.** The manifest may carry `burned: { transform: [a, b], finale: c }`; then the
  page does not show its own 「也许有一天…」 caption over the film, and if the film played past `c` the end card
  shows only the buttons (no second finale). The film's own AAC track is used (the video element is the clock,
  muted state follows the site switch). The draft film (95.6 s) is **under the parent's independent review and is
  not in this repo**; nothing was copied or integrated.

Fresh results (Chromium + WebKit): route + woods + home + blocked + film **153/153**, then film again with the
burned-lines case **16/16**; tsc + build OK. Targeted real-time clips (local only, gitignored mp4) in
`review/v03r/`: `clip-flower-reverse-desktop.mp4`, `clip-flower-reverse-phone.mp4`, `clip-mushroom-reverse-desktop.mp4`,
`clip-mushroom-reverse-phone.mp4` (~12 s each, right → left → right) and `clip-home-blocked-drop-bed.mp4` (15 s).
Committed frame strips: `review/v03r/strip-*.jpg`. The older `rec-*.mp4` predate these fixes.

### t26e — the WebKit page errors, explained and fixed where they were app bugs (2026-11-09 evening, PT)

The t26d run printed four kinds of uncaught page errors in the **WebKit route hops** (not in the film tests), which the
suite logged but did not assert. Reproduced with full message, stack, page and request path:

| Message (WebKit) | Where | Cause | Verdict |
| --- | --- | --- | --- |
| `NotAllowedError: Permission was denied` (no stack) | `/coop/` on start, also when the page sits still | `navigator.wakeLock.request('screen')` rejected (no user gesture); the promise was `void`-ed, so the rejection was unhandled | **app bug** — fixed: `.catch()` in `src/stages/coop/main.ts` |
| `TypeError: Load failed` (no stack); Chromium: `TypeError: Failed to fetch` | `/shop/` | a failed `figure-pig.glb` fetch (offline, or aborted by leaving) rejected the fire-and-forget `viewer.load()` promise unhandled | **app bug** — fixed: `Viewer.load()` marks its promise handled once (callers that await still see the rejection; a failed exhibit stays empty as before) and the AR-return chain has a catch (`src/stages/shop/viewer.ts`, `main.ts`) |
| `Fetch API cannot load …/models/figure-pig.glb due to access control checks` | `/shop/`, 150–170 ms after the hop's own navigation began | same-origin fetch cancelled by the navigation; WebKit reports cancelled loads with this wording and surfaces it even when the promise is handled | **test environment** (navigation abort), not CORS — kept in the log, classified, not silenced |
| `Cannot load …/assets/worker-*.js due to access control checks` | `/jelly/`, ~40 ms after the hop's navigation began | `new Worker()` started while the page was being left; the app's `boot().catch` already handles it | **test environment** (navigation abort) |

None of them is related to H.264, the future-home film or its fallback. Regression (`tools/v03r-verify.mjs`):
- route hops: every uncaught error is recorded with page, stack and time since the last navigation; only a same-origin
  "access control checks" error fired within 2.5 s of a navigation (or for a request that failed as aborted) is accepted —
  anything else **fails**.
- settled pages (coop solo, shop, shop with `figure-pig.glb` forced to abort, shop back from AR with it aborted, jelly):
  zero uncaught errors in both browsers. Against the pre-fix build these failed (Chromium 2, WebKit 4); after the fix they pass.
- every other test key (woods, home editor, blocked, film fixtures, real film — phone and fixture contexts included) now
  ends with a "no uncaught page errors in any context" assertion. Full suite after the fix: 194/194 (route, woods, home,
  block, film, real; Chromium + WebKit).

This does **not** mean Safari plays the film: the headless WebKit here still has no H.264 decoder, so only the fallback is tested.
Not fixed (not reproduced, out of scope): `src/stages/coop/qr.ts` also does `void video.play()` for the camera preview.

### t26d — v4 future-home film candidate integrated on the dev branch (2026-11-09 evening, PT)

**Status:** candidate, under review. On `v03m-spatial-home` only; **not merged, not deployed**; `main`, `gh-pages` and
the old stable gift are unchanged. Earlier notes in this file that say "not integrated" describe the state before t26d.

Files (copied byte for byte from the render dir `jelly-future-film-v03r/out/v4/`, nothing else from it):

| File | What |
| --- | --- |
| `public/media/future-home.mp4` | 35,353,075 bytes, 95.58 s, H.264 High 1920×1080 24 fps, AAC-LC 48 kHz stereo, faststart (moov first) |
| `public/media/future-home-poster.jpg` | 1920×1080 poster (frame at 0:31) |
| `public/media/future-home.json` | `{src, poster, audio:true, burned:{transform:[0.5,7.7], finale:77.4}}` |

The 270 MB master and raw images are **not** committed. Burned-in text (from the film's own VTT): 0.5–7.7 s
「也许有一天，也许会是第 2000 天，我们已经拥有了一个自己的家。」; 77.4 s to the end 「我们已经有属于自己的两百天了，我想第两千天可能也并不遥远吧。」
plus 「我的小臭猫。」 from 82.4 s. So the page does **not** show its own first line over the film, and the end card hides its
finale text when the film was watched past 77.4 s (it still shows it after 「跳过」 earlier). The three exact lines are unchanged.

- **What the film is:** about **8 s** (S2, 0:17.6–0:25.6) is generated image-to-video. Everything else is **2D
  programmatic cut-out animation** (code moving painted pieces, pans and push-ins) over generated reference stills and
  the gift's existing original art. The art is natively **1280×720, upscaled 1.5×** to the 1920×1080 web file.
- **Music:** original synthesized 3/4 waltz (no samples), mixed into the file's AAC track.
- **Not linked to the layout:** the film is fixed; it never reads the saved furniture.
- **Known limits (unchanged):** 2D cut-out look, Z-shaped running legs, rigid arms, soft local push-ins in S3/S4, a
  panorama seam around 1:00–1:01, the dog dark-on-dark for 2–3 frames.
- **Review status:** accepted only on **frame-level QA**; real playback review is still pending. A separate targeted
  review of the v4 dog shot (0:55.6–0:58.5) confirmed it passes behind the couple, runs out of frame with complete legs,
  and shows no fragments or merging; its only limit is the 2D style with few drawn frames. That is a targeted check of
  one shot, **not** a whole-film pass. Not tested on a real phone.

Integration fixes (only what the real file exposed):
- `.hm-film-v` now fills the layer (`position:absolute; inset:0; width/height 100%; object-fit:contain`). Before, a
  grid cell's `max-height:100%` did not resolve and on an 844×390 landscape phone the video element was 474 px tall,
  cutting off the bottom of the picture.
- Tests: `ONLY=real node tools/v03r-verify.mjs` (no routing, the real file over the real server).

Real playback (Chromium with H.264, swiftshader, headless box): json 200 / poster 200 / mp4 206 under the relative
`media/` base; `/home/` never requests anniv-200; currentTime 2.1 → 4.6 s with decoded frames 54 → advancing (1 dropped),
1920×1080, picture luminance spread 193 (not blank); sound switch unmutes and the AAC track decodes (audio bytes rise);
skip / sound pills sit outside the burned text bands; simulated hidden tab pauses, return shows 轻触播放 and resumes;
end → end card with 再看一遍 / 继续布置 and no second finale text; replay restarts at 0 and decodes; skip mid-film shows the
finale text; 继续布置 returns the same saved pieces; refused autoplay on a touch phone (844×390) → 轻触播放 → plays; turned
to portrait 390×844 keeps playing, whole picture contained; no page or video errors. **WebKit** here has no H.264
decoder (`canPlayType` empty): the manifest is ignored and the page lines + end card play instead — that fallback is
tested, real WebKit/Safari playback is **not**. Screenshots: `review/v03r/chromium-real-film-*.png`.

### t26c — arbitration of the second review (2026-11-09 evening, PT)

Per-frame telemetry plus a burned sync stamp (`tools/v03r-arbitrate.mjs`, no seek during recording). Full table in
`review/v03r/arbitration/NOTES.md`. One genuine defect, fixed: arming a chip showed the preview at its stale spot
(where the previous piece had just been dropped, i.e. inside the sofa) for ~0.25 s. Not reproduced, no change: the table
penetrating the sofa while dragged (min gap 0.042 m every frame; the red rectangle is the floor decal), the toddler bed
(bed 2.15 × 1.76 m vs sofa 2.02 × 0.86 m), the pig facing (0 frames against its motion; it faces right only while
crossing behind the cat), and teleports (max per-frame step 3.3 px of a 320 px view). The final visual gate is
still pending with the parent.

### Web fixes in this pass

- **Woods (flower + mushroom):** the follow gap is computed from the *visible* cat width (painted cat has ~5 px clear
  margin per side): `FOLLOW_GAP ≈ 70`, hard minimum separation outside crossings. When the cat reverses, the pig walks
  *behind* her on a back lane (drawn 5 px higher, under the cat) instead of being pushed through her body, then falls in
  behind. The camera frames the group (centre of both sprites, look-ahead shrinks when the pair is wide, clamped so both
  keep ≥ 8 px margin) — fixes the portrait pig half out of frame. Portrait floor sits higher (0.2) and the caption no
  longer covers the feet; the key hint hides while a line is spoken on tall portrait screens. Cat frames repaired
  (transparent slits bridged, green fringe recoloured, cat-1 cropped muzzle replaced).
- **Cottage (`src/stages/wander/house.ts`):** rewritten as a baked, textured night building (plaster, timber, plinth,
  tiles, moss, chimney) graded to the moonlit scene, with only the warm window/porch light and smoke animated.
- **Dollhouse (Module A):** soft shadows (PCF), plank floor texture; every model rebuilt with real parts (sofa cushions
  and rolled arms, oval coffee table with shelf, dining table with apron/turned legs/runner, spindle chairs, nightstand
  with drawers + lamp, bookcase with varied books, console TV, tripod lamp, panelled wardrobe, cat tree with den, dog
  bed, two vases with only 戴安娜粉玫瑰 / 云南紫精灵, bordered rug). Footprints shrunk where the old table read as a big flat
  slab. Camera auto-fits the whole room above the drawer and tool row (or left of the side tool column on short
  landscape phones); pinch + wheel zoom; drawer thumbnails are rendered from the same 3D meshes. Tapping a piece that
  is already placed now picks it up even if a chip is still armed (previously a failed placement left the chip armed and
  blocked dragging). Demo layout: 17 pieces, collision-free.

### Verification (fresh, this machine, Linux, 2026-11-09 ~16:50 PT)

- `npx tsc --noEmit -p .` OK; `npx vite build` OK.
- `tools/v03r-verify.mjs` (Playwright, Chromium with swiftshader WebGL + WebKit):
  route 29/29, woods 60/60, home + film 49/49 — all PASS. Run per part with `ONLY=route|woods|home|film|rec`.
- Recordings (real-time Chromium session, not slideshows), **local only** (`review/**/*.mp4` is gitignored; on the build box under `/workspace/jelly/jelly-gift-story/review/v03r/`, regenerate with `ONLY=rec node tools/v03r-verify.mjs`): `rec-flower-walk.mp4` (13.9 s),
  `rec-mushroom-walk.mp4` (20.1 s), `rec-home-3d-editing.mp4` (122 s — place, near↔far drags, rotate, orbit, zoom;
  long because swiftshader renders slowly). Screenshots: `review/v03r/*.png`. Notes: `review/v03r/NOTES.md`.
- Old verify39 「diff fail」: that log came from the uncommitted Windows puppeteer port; its Python film-diff step ran even
  with the film parked, found no `film-*.png` and errored. `tools/v03m-verify.mjs` now skips it unless the code film is
  on, and takes `VERIFY_OUT` so it does not overwrite the tracked `review/v03m/`. Superseded by `v03r-verify.mjs`.
- Limits: headless swiftshader (not a real GPU), no real iPhone/Android; this Linux WebKit build has **no H.264
  decoder**, so film *playback* is verified in Chromium only (WebKit verifies the fallback to the end card); the real
  film asset has not been tested because it does not exist in the repo yet.

---

## v03n pass — pig companion, caption clearance, cottage, dollhouse polish (2026-11-08)

Still **not deployed**; nothing merged to `main`. Everything below is on `v03m-spatial-home` only.

### Painted pig companion (flower + mushroom woods)

- `public/art/fauna/pig-0..3.png` — a four-frame walk cycle drawn by the image generator on flat magenta, keyed at the
  block grid with alpha-weighted colour (no magenta fringe), given a 1 px warm-brown rim, quarter-reduced to **46×41**
  and foot-aligned on a shared baseline. She is deliberately smaller than the 79×52 painted cat.
- `src/shared/pixel/pigpaint.ts` picks frames exactly like `cat32Frame`; `src/shared/pixel/pig.ts` still backs the 16²
  pixel stages (meadow, shop, coop, home transform), so nothing there changed.
- `src/art/loader.ts` loads `art/fauna.pig` (4 walk frames).
- The follow distance now scales with the painted frames (`pigW/2 + catW/2 − 6`, ≈57 px target; the easing settles at
  ≈62–68 px between centres while walking), the left world edge keeps room behind her so the pig can never be squeezed
  into her body, and `seek()` uses the same limit. `window.__wander` also exposes `gapPx` / `pigW`.

### Caption vs key hint

`tell()` now adds `gift-telling` to `<body>`; `.fl-hint` / `.mu-hint` lift 52 px while a line is spoken. The landscape
caption bar used to clip the lower half of 「← → 漫步」.

### Mushroom grove cottage

New `src/stages/wander/house.ts` (replaces the flat rectangle overlay in `engine.ts`): real gable with the eaves on the
wall top, staggered shingle rows, chimney seated on the right slope with drifting smoke, timber frame, stone plinth,
two lit windows with curtains, porch lamp, irregular flower clumps and a soft contact shadow.

### Dollhouse editor (Module A)

- the per-piece toolbar (`rotate` / `remove`) is clamped inside the viewport and above the save row — it used to land
  on top of 「保存布局」, making both unreadable.
- wood texture softened: fine low-contrast grain instead of the high-contrast bands that read as a barcode on tall pieces.

### Verification on this machine

`tools/v03m-verify.mjs` imports Playwright from a Linux path, which does not exist here, so the same checks were ported
to puppeteer-core + the local Chrome (`.setup/verify.mjs`, not committed). Result: **40/40 PASS**, WebKit smoke replaced
by a Chrome mobile-viewport boot of every stage. Covered: the full hop chain (meadow → shop → night → jelly → sea → sky →
coop → flower → mushroom → home, AR back to shop, `?at=lit` does not skip), every stage booting with no page errors, pig
follow in both woods (min gap 62.1 / 62.4 px, never parked, never overlapping), dollhouse place / collision / rotate /
persist, and film independence (mean pixel difference **0.51** greet, **0** sofa — furniture never leaks into Module B).

### Second pass (same day): discovery walk + dollhouse furniture

- `/home/` discovery walk (`src/stages/home/approach.ts`) keeps the pixel pair (16² at 1.2×, soft contact shadows,
  ground line raised to `h − 0.205 h`). The painted 79×52 sheets were tried first and rejected with evidence: on this
  scene's ~320 px logical canvas they either tower over the cottage door (`home-approach2` attempt) or, shrunk to door
  height, lose their faces entirely. The plate is painted; the pets stay in the site's pixel idiom, on the path.
- `decorate/meshes.ts`: wardrobe rebuilt (cornice, plinth, four feet, two inset door panels, centre shadow gap, brass
  knobs) and the TV rebuilt (console with legs, top slab, drawer line and handle, bezel, recessed lit screen, stand,
  ventilated back plate — the demo layout points the TV at the sofa, so the camera mostly sees that back).
- `home/style.css`: undo / reset / save are now separate light pills; as bare underlined text they disappeared against
  dark furniture.
- `decorate/meshes.ts`: the bed gained legs, a frame, a mattress with a visible sheet edge, a folded quilt and two
  pillows; `catalog.ts`'s demo layout was then re-arranged (bed turned side-on, TV moved to the right wall facing the
  sofa, table/chair shifted) because the old layout put a black TV back and a bed footboard right in the camera's way.
  The demo is only shown by `?furnish` / 继续布置 — player layouts are untouched.

### Third pass (same day): transform beat + empty-room affordances

- `/home/` transform beat (`main.ts`): the couple now stands at `0.80 h` instead of `0.72 h`, i.e. on the painted floor
  in front of the coffee table instead of appearing to stand on it, and each gets a soft contact shadow.
- the editor's 撤回 / 重置 buttons are disabled (and dimmed) when there is nothing to undo or clear, so an empty room no
  longer offers dead controls.

### v03q — the ending now plays the 200-day film (2026-11-08, parent request) — **SUPERSEDED by t26** (history only)

Parent's brief: *「结尾就用这支 200 天视频，重新做好相关的部分之间的衔接」* — i.e. the `/sky/` 200-day MP4 (`public/media/
anniv-200.mp4`, 67.7 s, 1280×720, B&W hand-drawn) is the ending of `/home/`, and the seams around it had to be rebuilt.

The ending chain is now:

1. **保存布局** → the dollhouse is torn down; the same warm page stays on screen with the centred line
   「也许有一天，也许会是第 2000 天，我们已经拥有了一个自己的家。」
2. at ~1.05 s the film starts **under** that page and fades in over 1.4 s (the caption leaves at 2.0 s), so there is no cut:
   cream → moving picture of the same paper colour.
3. the film plays full-bleed (`object-fit: contain` on a paper backdrop, so a phone letterbox still reads as a page);
   「跳过」 becomes a dark pill over the white frame; the global sound switch unmutes it (it starts muted so autoplay is
   always allowed; if a browser still refuses, a 「轻触播放」 button appears).
4. on `ended` → the film fades out (0.9 s) and the end card takes over: the closing line
   「我们已经有属于自己的两百天了…我的小臭猫。」in centred paper typography, with **继续布置 / 从头再来**.
5. **再看一遍** replays the film (it recreates the element, so it always starts from frame 1).

Other changes in this pass:

- `tools/serve.mjs` gained **Range support** (206 + `accept-ranges`). Without it Chrome reports `seekable.end = 0` for the
  MP4, so the film could not be scrubbed or resumed in local preview. GitHub Pages already supports ranges.
- the code-drawn Module B is still parked (`FILM_ENABLED = false`) and still bookmarked on `v03o-film`; flip that flag if
  you ever want the six-shot version back instead of the MP4.
- verification harnesses now key the film-independence checks on `body.hm-code-film` (only present when the code film is
  wired in), so the suite says "skipped" instead of testing a film that is not in the flow.

### v03p — the film is parked (2026-11-08, parent request)

Parent's brief: *「现在先暂时删除结尾的短片…相当于我之后把短片做完之后再加上短片，同时现在做好的短片也要进行上传 github」*.

- `src/stages/home/main.ts` now opens with **`export const FILM_ENABLED = false;`**. With it false the journey ends on a
  static end card instead of the film: the two protected lines appear in sequence, centred —
  「也许有一天，也许会是第 2000 天，我们已经拥有了一个自己的家。」then「我们已经有属于自己的两百天了…我的小臭猫。」—
  with 继续布置 / 从头再来 at the bottom and **no 再看一遍** (nothing to replay), no 跳过.
- The film itself is untouched and still in the tree (`src/stages/home/film.ts`, `review/v03o-film/`). Re-enabling is one
  line: set `FILM_ENABLED = true`. `?at=walk|greet|sofa|sleep|snow|dawn|finale` then play the film again; while parked
  those params land on the end card so old links do not 404 or blank.
- The film is also bookmarked on its own branch **`v03o-film`** (head `b8d9359`, the last commit with the film wired in)
  so it can be diffed or restored without touching the story branch.
- `body.hm-no-film` is set while parked; `tools/v03m-verify.mjs` (and the local puppeteer port) use it to skip the two
  film-independence checks and to accept `end` as a valid exit phase, so the suite stays honest instead of failing.

### v03o — Module B rebuilt as a drawn film (2026-11-08, parent request)

Parent's brief: *「不要使用这个像素风格的过场动画了…现在这人物和背景都混在一起了效果很差」*. The old film laid painted
sprites on painted plates, so figures dissolved into the set; the transform still opened with 16² pixel animals.

- **New module `src/stages/home/film.ts`** (same `createFilm` interface `montage.ts` had: `update / render / skip /
  replay / seek / scene / finaleT`, same `SCENE_IDS` walk · greet · sofa · sleep · snow · dawn). Six shots drawn in
  code: soft gouache sets with no outlines, the couple as flat shapes with a warm ink outline, rim light and contact
  shadow; medium/close framings; paper grain + vignette; 0.9 s dissolves. Story: empty house with boxes → filling the
  shelf → night sofa with mugs and the cat → dozing under the moon → snow at the glass (silhouettes) → sunrise balcony,
  then the finale hold with the exact 「我们已经有属于自己的两百天了…」 line.
- **Transform beat**: no pixel cutaway any more. The film's first frame is already on screen and a warm veil lifts off
  it (`main.ts`), so the dollhouse light becomes the first shot instead of a pixel iris.
- **Resolution**: `fit()` switches the PixelScreen to ~1 canvas pixel per CSS pixel while the film plays (minW/minH
  900×520 landscape, 540×960 portrait, maxH 4000), so outlines are hairlines rather than 4× upscaled blocks.
- Portrait re-stages (sofa/figures scale from `min(w,h)`), not a crop.
- Evidence: `review/v03o-film/` (contact sheet, transition, shelf, portrait, finale) + notes.
- `montage.ts` / `cineRoom.ts` are now unused; left in the tree for a follow-up delete.

### Still open after this pass

- ~~Sea bridge objects dissolve through a bayer checker~~ — **changed in the v03n pass**: `src/stages/sea/bridges.ts` now
  swaps A→B with a top-down wipe and a one-pixel dithered seam, so both silhouettes stay legible instead of reading as static.
- Dollhouse furniture is still hand-built boxes with better textures — not modelled pieces. The wardrobe/TV are the
  weakest silhouettes.
- No WebKit run on this machine (Chrome only), so the iOS-specific paths rely on the earlier WebKit evidence.

---

## What the user wants (mandatory)

### Journey order (t23u)

**meadow → shop → night → jelly → sea → sky → coop → flower → mushroom → empty-house discovery → spatial furnishing → fixed independent future film**

User wording: 「我要求现在顺序是草地到小店再到夜路再到果冻海天空再到一起玩再到花海蘑菇海再到空房子再到布置和未来生活，合理衔接调整」.

Do **not** implement flower-before-shop, mushroom→shop, coop→home, or a shop “lit door” that skips night.

Night is on the mainline; every night ending still goes to jelly. AR is optional and returns to the shop. The sky 200-day film and the jelly mushroom egg stay optional. Jelly keeps a visible ungated **入海**.

### Pig companion (t24u)

On **both** `/flower/` and `/mushroom/`, a small pig **follows the cat continuously** (walk frames, same grounded path, depth, and gap; no overlapping or trapping; facing follows travel). Not an entrance send-off and not waiting at the exit.

### Spatial home (t21u)

Two independent modules: **A** realtime volumetric decoration; **B** a fixed cinematic that never reads the player’s layout. Save persists Module A only (`gift.home.layout.v2` `{kind,x,z,yaw}`). Legacy v1 cannot be mapped; reset with a truthful hint.

### Protected copy, art, music

Do not change the three exact Chinese home lines in `src/stages/home/dict.ts` (`home.found` / `home.transform` / `home.finale`). Only two named flower species: **戴安娜粉玫瑰** and **云南紫精灵**. Keep the original airy BGM. No original private photos. Pig loader only if a page takes longer than 700 ms.

---

## Superseded plans (do not revive)

| Superseded idea | Why it is void |
| --- | --- |
| meadow → flower → mushroom → shop → … → coop → home | User’s required order is meadow → shop → night → … → coop → flower → mushroom → home |
| Night optional; shop “lit exit” straight to jelly | Night is mandatory on the mainline |
| Shop left window showing dusk wood | Meadow enters a **sunny** shop |
| Coop ending walks to a cottage and `go('home')` | Coop goes to **flower** along an open path |
| Pig sees the cat off at the flower entrance, then waits at the mushroom shop window | t24: pig **follows** the cat through both woods |

Historical `docs/HANDOFF.md` paragraphs about v03j’s old sequence are history, not the current brief.

---

## What is implemented on this branch (verified 2026-11-07 evening, America/Los_Angeles)

### Routing — done and hop-tested (Chromium)

`STAGES` and curtain `NEXT` match t23. Explicit `go(...)` targets:

- meadow door → `shop` (canvas/colour carry, `#5EC4FF` fallback)
- shop dark rear door only → `night` (whisper 「外面天黑了。」). `LITEXIT` removed.
- shop left door glass restored to bright meadow (`#9ADCFF` / `#5EC4FF` / `#4CC25A`). Right-side dusk window still foreshadows night.
- night kawaii continue → `jelly` (pink iris)
- jelly `#to-sea` → `sea` (egg remains optional)
- sea → `sky`, sky `.sk-next` → `coop` without watching the film
- coop 「往前走走」 (`.cp-home`) → `flower` along an open path; the drawn cottage was removed
- flower → `mushroom` (existing canvas iris)
- mushroom → `home`; grove end is a warm **house** (pitched roof, chimney, glowing windows), not a shop. Near-exit line is 「前面有暖光。窗子亮着。」 and does **not** repeat `home.found`.
- AR `?from=shop` back → `shop`
- curtain skip-ahead from shop points at `night/`

Verification: `tools/v03m-verify.mjs` **34/34 PASS** including the hops above, “`?at=lit` does not skip to jelly”, WebKit load of flower/mushroom/shop/home, and pig presence on WebKit flower.

`prefetchNext()` now decodes the flower plate when leaving coop and the mushroom plate when leaving flower.

Meadow skip (`go(undefined)`) follows `nextStage()` → shop. `?stage=2` is shop, `?stage=3` is night, `?stage=4` is jelly.

### Pig follow — done and measured

Same follow AI on both woods: stay ~34 px behind the cat’s last travel direction, walk-cycle frames (`pigSprites` / `pigFrame`), wait and face her rather than walking through when she turns, soft min-separation 22 px. Drawn on the same floor as the cat, just before the cat so the pair stays readable.

Measured gaps while walking right: about **37–45 px**, never parked at the old send-off (x=118) or mushroom exit wait. Closest measured separation ~37 px.

Evidence:

- https://github.com/smartlotus/jelly-gift-story/blob/v03m-spatial-home/review/v03m/flower-pig-follow-strip.png
- https://github.com/smartlotus/jelly-gift-story/blob/v03m-spatial-home/review/v03m/mushroom-pig-follow-strip.png
- https://github.com/smartlotus/jelly-gift-story/blob/v03m-spatial-home/review/v03m/flower-pig-follow.webm (short, ~114 KB)
- https://github.com/smartlotus/jelly-gift-story/blob/v03m-spatial-home/review/v03m/mushroom-end-cottage.png — pig behind the cat, house (not shop) on the right
- https://github.com/smartlotus/jelly-gift-story/blob/v03m-spatial-home/review/v03m/cat-walk-after-desktop-right-frame.png — painted cat whole-body + following pig

`window.__wander` now also exposes `pigX`, `pigFace`, `pigVx`, `face`, `vx`.

### Cat walk sheets — repaired; after-evidence captured

`public/art/fauna/cat-0.png`–`cat-3.png` are 79×52 (padded; cat-2 tail bridged; bottom unpadded so feet stay grounded). After strips and a short right-walk webm were captured at desktop and phone sizes.

Inspected: the after desktop right frame shows both ears, a complete tail with the pink tip, and all four legs — no obvious missing corners at this scale. Phone portrait strip also shows the full body on the path, not clipped by the screen edge (cat min/max x now accounts for the 79 px half-width).

Before strips (tight crops from the earlier investigation) remain at `review/v03m/cat-walk-before-*-strip.png`. After strips are full-scene (iris-pink first frame on some), so they are not a pixel-identical crop of the before set.

### Spatial home — functional; parent should still visually gate aesthetics

Module A is a three.js cutaway dollhouse (perspective floor, walls, window, hand-built furniture, contact-shadow planes, raycast placement, 90° yaw, AABB collision, 0.2 snap). Inspected empty and furnished landscape shots: the floor recedes, furniture has sides/tops, the rotated sofa shows a real 3D orientation (not a 2D flip). Portrait shows the existing dismissible “把手机横过来” hint over the room.

Verified:

- Empty WebGL canvas + floor raycast
- Collision rejects a second overlapping sofa; rugs do not collide
- Rotate 90° succeeds when the footprint fits (`rotate()` now applies directly and returns a boolean)
- Editor layout persists across a navigation without `?fresh=1`
- Save leaves the editor into transform/film
- 「继续布置」 / `home.edit` returns the persisted pieces
- Fixed film at `?at=greet` and `?at=sofa`: pixel difference **mean 0** between an empty save and a cluttered save (`review/v03m/film-greet-diff.png`, `film-sofa-diff.png`)

Honest aesthetic caveat: the furniture is hand-built from boxes/textures in a pixel-art vibe — volumetric and perspective-correct, but still simple (wardrobe/TV are blocky). Module B remains a **painted** cinematic interior by design (independent of the dollhouse). Parent visual review should judge whether the dollhouse reads “spatial enough.”

---

## Still unfinished / caveats

- **Not deployed.** Live Pages are still v03l / the old published order (meadow → flower → mushroom → shop → … → coop → home).
- No merge to `main`.
- ~~Pig companion uses the procedural 16×16 walk cycle~~ — **fixed in the v03n pass**: she now uses painted 46×41 frames (`public/art/fauna/pig-0..3.png`). The 16² sheet still drives the pure-pixel stages (meadow/shop/coop/home transform), where it matches the art there.
- On a sudden reverse, the pig **waits** on its current side until the cat passes, then falls in behind (so it never walks through her). A short left-walk strip taken immediately after a right-walk can still show the pig on the old side.
- After-strips include an iris-pink first frame on some captures. Videos are short (~1–2 s) assembled from those frames, not a long handheld phone recording.
- ~~Mushroom cottage is a simple overlay~~ — **redrawn in the v03n pass** (`src/stages/wander/house.ts`); it is drawn, not painted, so it is still flatter than the plate's foliage, but the gable, shingles, chimney and lit windows now read as one object.
- Spatial drag video was not recorded as a separate clip (a dragged screenshot exists: `review/v03m/home-dragged-desktop.png`). Rotate evidence is `home-rotated-desktop.png`.
- `tools/v03m-gate.mjs` is obsolete (it tested the superseded no-night route). Use `tools/v03m-verify.mjs`.
- Do not commit `public/art/plates/*-far.jpg`, `review/v03n/cadence/`, or secrets. Intermediate `review/v03m/frames/` PNGs are local capture leftovers — prefer the stitched strips and short webms.

---

## Next priorities (for whoever picks this up)

1. Parent visual + functional gate of this increment (journey, pig follow, cottage, spatial dollhouse, film independence). Do not deploy until that happens.
2. If the gate wants richer furniture or a less overlay-like mushroom cottage, polish those without changing the t23 order or the three home lines.
3. Optional: a longer normal-speed flower/mushroom walk video and a dedicated drag-near/far recording if the parent wants more motion evidence than the short webms + strips.
4. Open a PR against `main` only if convention requires review; do not merge or deploy.

---

## Commands

```bash
cd /workspace/jelly/jelly-gift-story
npm install
npx tsc --noEmit -p .
npx vite build
node tools/serve.mjs dist 8833
GIO_USE_PROXY_RESOLVER=dummy GSETTINGS_BACKEND=memory \
  node tools/v03m-verify.mjs   # expects BASE=http://127.0.0.1:8833
```

Playwright import used by this repo’s tools: `file:///workspace/jelly/pw/node_modules/playwright/index.mjs`. Chrome: `/usr/bin/google-chrome`.

Deploy (**do not run** until parent authorizes; story repo only, non-force):

```bash
GIFT_DEPLOY=1 scripts/deploy_pages.sh
```

The deploy script hard-refuses `jelly-gift.git`.

---

## Source map

| Area | Path |
| --- | --- |
| Stage order, `go`, `from`, `asset()`, progress | `src/shared/flow.ts` |
| Loading curtain + skip-ahead `NEXT` | `src/shared/curtain-inline.ts` |
| Story whispers | `src/shared/story-dict.ts` |
| Meadow → shop | `src/stages/meadow/main.ts` |
| Shop (sunny entry, night-only exit) | `src/stages/shop/{main,world}.ts` |
| Night → jelly | `src/stages/night/kawaii.ts` |
| Jelly 入海 | `jelly/index.html` `#to-sea`, `src/main.ts` |
| Coop → flower | `src/stages/coop/{main,game}.ts` |
| Woods + pig follow + cottage | `src/stages/wander/engine.ts` |
| Home Module A | `src/stages/home/decorate/*`, `save.ts` |
| Home Module B | `src/stages/home/cineRoom.ts`, `montage.ts`, `main.ts` |
| Verification | `tools/v03m-verify.mjs`, `review/v03m/verify.json` |

Vite MPA `base: './'`. Never use absolute `/art/...` URLs.

---

## Constraints

- Story repo only. No edits under `/workspace/jelly/jelly-gift` or `smartlotus/jelly-gift`.
- No deploy, no force-push, no amend of already-pushed commits.
- No original private photos, no `*-far.jpg` dumps, no secrets, no giant mp4s.

# AI handoff — story edition WIP (read this first)

**Last checkpoint:** Saturday 7 November 2026, late evening, America/Los_Angeles (this file updates with each pushed increment).
**Follow-up pass:** Sunday 8 November 2026 — pig companion, caption clearance, cottage, dollhouse polish (see §"v03n pass").

This file is the durable takeover note. It describes **what is on branch `v03m-spatial-home` right now**, not what the live Pages site runs.

| Item | Value |
| --- | --- |
| Repo | [`smartlotus/jelly-gift-story`](https://github.com/smartlotus/jelly-gift-story) (public) |
| Working tree | `/workspace/jelly/jelly-gift-story` |
| WIP branch | `v03m-spatial-home` |
| Default branch `main` | `e08e1c2` — “Record v03l live Pages hashes and delivered-art screenshots.” |
| Live delivered source | tag **`v03l`** = `ef2405b635d532cd219914812f7681f523640be7` (merge of [PR #2](https://github.com/smartlotus/jelly-gift-story/pull/2)) |
| Live Pages | https://smartlotus.github.io/jelly-gift-story/ — `gh-pages` `de208c3e903f6397f8ccb869680ae1421d28488f` (“Deploy story edition (ef2405b)”) |
| This WIP | **not deployed**. Do not run `scripts/deploy_pages.sh` until a parent visual + functional gate says so. |
| Old stable gift | **Do not touch.** `smartlotus/jelly-gift` / `jelly-gift-site`, live https://smartlotus.github.io/jelly-gift/, last deploy `1c2d5de`. Do not merge this work into that default branch. Old source PR 7 stays open and untouched. |

After each push, `git rev-parse origin/v03m-spatial-home` is the source of truth for the SHA.

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

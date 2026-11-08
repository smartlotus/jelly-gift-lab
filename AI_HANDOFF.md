# AI handoff — story edition WIP (read this first)

**Last checkpoint:** Saturday 7 November 2026, late evening, America/Los_Angeles (this file updates with each pushed increment).

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
- Pig companion uses the existing procedural 16×16 walk cycle drawn at scale 2, not painted fauna sheets (there are no `pig-*.png` walk plates). It reads smaller and more “sprite-y” next to the painted 79×52 cat.
- On a sudden reverse, the pig **waits** on its current side until the cat passes, then falls in behind (so it never walks through her). A short left-walk strip taken immediately after a right-walk can still show the pig on the old side.
- After-strips include an iris-pink first frame on some captures. Videos are short (~1–2 s) assembled from those frames, not a long handheld phone recording.
- Mushroom cottage is a readable pixel house overlaid on the painted grove; it is simpler than the plate around it.
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

# AI handoff — story edition WIP (read this first)

**Checkpoint date:** Saturday 7 November 2026, evening, America/Los_Angeles.

This file is the durable takeover note for another agent. It describes **what is on the branch right now**, not what the live Pages site runs.

| Item | Value |
| --- | --- |
| Repo | [`smartlotus/jelly-gift-story`](https://github.com/smartlotus/jelly-gift-story) (public) |
| Working tree | `/workspace/jelly/jelly-gift-story` |
| WIP branch | `v03m-spatial-home` |
| Default branch `main` | `e08e1c2` — “Record v03l live Pages hashes and delivered-art screenshots.” |
| Live delivered source | tag **`v03l`** = `ef2405b635d532cd219914812f7681f523640be7` (merge of [PR #2](https://github.com/smartlotus/jelly-gift-story/pull/2)) |
| Live Pages | https://smartlotus.github.io/jelly-gift-story/ — `gh-pages` `de208c3e903f6397f8ccb869680ae1421d28488f` (“Deploy story edition (ef2405b)”) |
| This WIP | **not deployed**. Do not run `scripts/deploy_pages.sh` until a parent visual + functional gate says so. |
| Old stable gift | **Do not touch.** `smartlotus/jelly-gift` / `jelly-gift-site`, live https://smartlotus.github.io/jelly-gift/, last deploy `1c2d5de`. Local checkout `/workspace/jelly/jelly-gift` is still `1c2d5deaba7980f4e96de18200d82ac054c2a540`. Do not merge this work into that default branch. Old source PR 7 stays open and untouched. |

After this checkpoint is pushed, treat `git rev-parse origin/v03m-spatial-home` as the source of truth for the SHA (also listed at the bottom of this file once filled).

---

## What the user wants now (mandatory)

### Journey order (t23u — supersedes every earlier story-order plan)

Exact primary sequence:

**meadow → shop → night → jelly → sea → sky → coop → flower → mushroom → empty-house discovery → spatial furnishing → fixed independent future film**

User wording (keep this intent): 「我要求现在顺序是草地到小店再到夜路再到果冻海天空再到一起玩再到花海蘑菇海再到空房子再到布置和未来生活，合理衔接调整」.

**Do not** implement or re-introduce:

- flower before shop
- mushroom → shop
- coop → home
- bypassing night by default (no “lit door straight to jelly” as the mainline)

Night is on the mainline. Every night ending still goes to jelly (existing pastel pink-circle / kawaii iris). AR remains an optional side room that returns to the shop. The sky 200-day film and the jelly mushroom egg stay optional. Jelly must keep a **visible, ungated 入海** control so the egg is not the only way into the sea.

Intended connective beats (not yet fully in code — see “Unfinished”):

- Meadow door enters a **sunny** shop (left shop window = bright meadow, not dusk wood).
- Shop rear exit is dusk/night; short transient whisper 「外面天黑了。」 on proximity (not a chapter card).
- Night protective pink circle → jelly.
- Visible 入海 → sea horizon → sky dawn → coop (existing handoffs).
- Coop finish 「往前走走」: pig and cat walk the **same direction** along an **open path into the flower wood**, not toward a cottage, and **not** to `/home/`.
- Flower (after coop) is a shared walk toward the future home.
- Flower → mushroom keeps the existing canvas/iris handoff.
- Mushroom/grove end warm window is the **home cottage**, not the shop. Reveal the empty house; then spatial furnish; then the fixed film.
- Arrival colours carry the outgoing canvas/colour (no cream→blue flat flashes).
- Music: graceful fade out/in (no promised single cross-page `AudioContext`). Flower → grove → home should stay the original soft tunes (`bloom` / `grove` / `hearth` / `dream`).
- No new chapter title cards. Pig loader on the curtain only if a page takes longer than 700 ms (already `LATE_MS = 700` in `src/shared/curtain-inline.ts`).

### Pig companion (t24u)

On **both** `/flower/` and `/mushroom/`, a small pig must **follow the cat continuously** (same grounded path, depth, and gap; walking frames; no overlapping or trapping the cat; facing follows travel).

**Not** an entrance send-off that then stays behind, and **not** a pig waiting at the exit / shop window.

### Spatial home (t21u — still in force)

Two independent modules:

- **Module A** — realtime spatial / volumetric decoration (perspective, real furniture sides and tops, floor raycast, 90° yaw, collision). Not 2D stickers on a painted room.
- **Module B** — after Save, a **fixed** art-directed cinematic. The player’s layout must **never** affect greet / sofa / sleep / snow / dawn / finale blocking or furniture. Empty, cluttered, or rotated rooms produce the same film.

Save persists Module A only (`gift.home.layout.v2` with `{kind,x,z,yaw}`). Legacy `gift.home.layout.v1` (`x,y,flip`) cannot be mapped; reset with a truthful hint, do not invent 3D coordinates.

### Cat walk frames (t22u)

On published story art the cat lost corners/frames while walking. Source investigation: `public/art/fauna/cat-0.png`–`cat-3.png` were 67×48 with opaque pixels on the crop box; cat-2’s tail tip was a disconnected island (hole around x=7–10). This branch **repairs the PNGs** (bridge cat-2, pad left/right/top, not the bottom foot edge; now 79×52). **In-game after-strips and a normal-speed walk video were not captured before this checkpoint.** Before-strips are in `review/v03m/cat-walk-before-*-strip.png`. Do not assume the live site has the repaired sheets (it does not, until a later authorized deploy).

### Protected copy, art, music

Do not change the three exact Chinese home lines:

1. `home.found`：这里有一间空房子诶，我们可以布置一下
2. `home.transform`：也许有一天，也许会是第 2000 天，我们已经拥有了一个自己的家。
3. `home.finale`：我们已经有属于自己的两百天了，我想第两千天可能也并不遥远吧。我的小臭猫。

Only two named flower species in the woods: **戴安娜粉玫瑰** and **云南紫精灵** (picotee carnation, 白底紫边 — see `docs/STORY.md`). No extra species.

Keep the original airy BGM tunes. No original private photos in the repo. Do not commit `public/art/plates/*-far.jpg`, cadence dump folders, or secrets.

---

## Superseded plans (do not revive)

Several earlier narrative instructions conflict with t23/t24. They are **void**:

| Superseded idea | Why it is void |
| --- | --- |
| meadow → flower → mushroom → shop → … → coop → home | User’s required order is meadow → shop → night → … → coop → flower → mushroom → home |
| Night optional; shop “lit exit” straight to jelly | Night is mandatory on the mainline |
| Shop left window showing 暮色林 / dusk wood | Meadow now enters a **sunny** shop |
| Coop ending walks to a cottage and `go('home')` | Coop goes to **flower** along an open path |
| Pig sees the cat off at the flower entrance, then waits at the mushroom shop window | t24: pig **follows** the cat through both woods |
| Optional-night route test as the definition of “done” | Test the **t23** sequence (night on the path; AR / film / egg still optional) |

`docs/STORY.md` in older revisions, and comments in `docs/HANDOFF.md` § v03j, still describe the flower-before-shop order. The **Order** section of `docs/STORY.md` was corrected in this checkpoint to t23. Historical HANDOFF paragraphs about v03j’s old sequence are history, not the current brief.

---

## What is actually implemented on this branch (honest)

### Done, or close to done (code written this session)

1. **Module A (spatial decorate), compiled**
   - `src/stages/home/decorate/catalog.ts` — floor kinds, footprints, `demoLayout3()`
   - `src/stages/home/decorate/meshes.ts` — dollhouse room + hand-built furniture (sofa, bed, table, chair, shelf, TV, lamp, vases for the two flowers, etc.), contact-shadow planes (three r187 has no `ContactShadows` helper)
   - `src/stages/home/decorate/world.ts` — lazy-loaded from `home/main.ts`; WebGL renderer; raycast floor; place / drag / 90° rotate / delete / undo / reset; AABB collision; 0.2 grid snap; catalog drawer; WebGL fallback that still allows saving an empty layout
   - Save format v2 in `src/stages/home/save.ts`; v1 present without v2 → empty layout + `home.migrate` hint
2. **Module B (fixed film), compiled**
   - `src/stages/home/cineRoom.ts` — painted interior + **hardcoded** cinematic furniture; never reads the player layout
   - `src/stages/home/montage.ts` — `createMontage()` takes **no** layout; greet/sofa use fixed `sofaX` / `herX` (`w*0.48` / `w*0.54`)
   - `src/stages/home/room.ts` — retired 2D sticker decorator (stub re-exports `drawCinematicRoom`)
   - Save leaves decorate and starts transform → montage. 「继续布置」 (`home.edit`) returns to Module A. 「再看一遍」 replays only the film.
3. **Cat sheet repair (assets)** — `public/art/fauna/cat-0.png` … `cat-3.png` resized to 79×52 as described above.
4. **Jelly 入海** — `#to-sea` button on `jelly/index.html`, wired in `src/main.ts` to `go('sea')`. Uses existing i18n `egg.sea` (入海 / Into the sea). Egg remains.
5. **Shop door whisper** — `tell('shop.door')` when the cat nears the dark rear door (copy already 「外面天黑了。」).
6. **Some transition hygiene** — `stashCanvas` / `peekCarry` on several hops; home `irisIn` uses the carried frame/colour falling back to `#f3ebe0` (not `#5EC4FF`).
7. **Home dict** — added `home.rotate`, `home.edit`, `home.migrate`, `home.nowebgl`. The three protected Chinese lines are unchanged (verified).
8. Typecheck and production build **passed on this WIP** earlier this session: `npx tsc --noEmit -p .` and `npx vite build`. Not re-run at the exact second of this checkpoint; if you pull, run them again.

### Unfinished, inconsistent, or broken (do not treat as shipped)

The **router still follows the old flower-before-shop / coop-to-home order**, plus leftover pieces of a superseded “optional night” experiment. This is the most important WIP warning.

| Location | Current (wrong vs t23/t24) | Should become |
| --- | --- | --- |
| `src/shared/flow.ts` `STAGES` | `meadow, flower, mushroom, shop, night, jelly, sea, sky, coop, home` | `meadow, shop, night, jelly, sea, sky, coop, flower, mushroom, home` |
| `src/shared/curtain-inline.ts` `NEXT` | `meadow→flower/`, `mushroom→shop/`, `shop→jelly/`, `coop→home/` | `meadow→shop/`, `shop→night/`, `mushroom→home/`, `coop→flower/` (night→jelly, jelly→sea, sea→sky, sky→coop, flower→mushroom stay) |
| `src/stages/meadow/main.ts` door exit | `go('flower')` | `go('shop')` |
| Meadow skip (`go(undefined)`) | uses `nextStage()` → currently flower | will follow `STAGES` once that array is fixed |
| `src/stages/mushroom/main.ts` | `go('shop')`; near-exit still `story.mushroom.out` (“是你的小店”) | `go('home')`; grove-end window = cottage; house reveal |
| `src/stages/coop/main.ts` | `go('home')` | `go('flower')` |
| `src/stages/coop/game.ts` | after the heart door they walk the same way toward a **drawn cottage** | same-direction walk along an **open path** (no cottage reveal here) |
| `src/stages/shop/world.ts` | left door glass is **dusk forest**; extra `LITEXIT` warm doorway | sunny meadow in the left window; remove the lit bypass |
| `src/stages/shop/main.ts` | dark door → night **and** `LITEXIT` → jelly; `warm('night')` and `warm('jelly')` | dark door → night only; do not bypass night |
| `src/stages/wander/engine.ts` | pig: flower entrance send-off then stay; mushroom pig waits at exit; mushroom end draws a **shop** window; flower dusk + first glowing mushrooms (those last two can stay as visual cues) | pig **follows** the cat on both themes; mushroom end = home cottage |
| Cat after-evidence | not taken | phone + desktop continuous walk strips + video, compared to `review/v03m/cat-walk-before-*` |
| Spatial aesthetic gate | code exists; **no reviewed screenshot/video set** from this checkpoint | empty + furnished 844×390 and portrait; drag/rotate clip; pixel-diff of two saved layouts at the same film timestamps (must match except UI / seeded particles) |
| `tools/v03m-gate.mjs` | written, **did not run** (`Cannot find package 'playwright'`). Import like `tools/story-review.mjs`: `file:///workspace/jelly/pw/node_modules/playwright/index.mjs`. Also still encodes the superseded no-night route. | retarget to t23; then run Chromium + WebKit |

Other notes:

- `prefetchNext()` warms `nextStage()` and currently pre-decodes only the mushroom ground plate. After `STAGES` changes, also prefetch the flower plate when leaving coop (`public/art/plates/flower-ground-wide.jpg` exists).
- Legacy `?from=` assumptions: shop still special-cases `from===ar` (keep). Sky still special-cases `from===jelly` vs `from===sea` (mainline arrival is `sea`). Flower `peekCarry` was added expecting meadow; after t23 it will arrive from **coop**. Home `peekCarry` will arrive from **mushroom**.
- `?stage=2` is 1-based into `STAGES`. Today that is flower. After the t23 `STAGES` rewrite, `?stage=2` becomes shop (which matches the older comment `?stage=2|shop|3|night|4|jelly`).
- `tools/v03m-gate.mjs` and several `window.__home` / `__homeRoom` / `__wander` hooks are for tests. `__homeRoom` now talks v2 `{kind,x,z,yaw}` plus `place`, `raycast`, `collides`, `furnishDemo`.

---

## Next priorities (for the agent who picks this up)

1. Read this file and `docs/STORY.md` (Order section). Do not re-read obsolete “flower then shop” or “optional night” plans as current requirements.
2. Retarget **all** routing: `STAGES`, `NEXT`, every `go(...)`, prefetch/warm, skip/resume, docs comments. Verify with a walk of the t23 sequence.
3. Remove shop `LITEXIT` and restore a **sunny** meadow in the shop’s left door window.
4. Coop: same-direction walk → open path → `go('flower')` with canvas/colour carry.
5. Flower + mushroom: pig **follows** the cat (t24). Replace send-off / waiting-at-exit behaviour.
6. Mushroom end: cottage / empty-house reveal (not a shop window) → `go('home')`. Keep the exact `home.found` line; do not invent a new title card.
7. Finish cat after-evidence (phone + desktop, left and right, normal speed) and confirm the repaired sheets no longer clip.
8. Spatial visual + functional gate (screenshots, drag/rotate video, montage pixel-diff, persistence, WebGL fallback, touch raycast tests). Inspect your own screenshots before claiming pass.
9. Update route tests. Do **not** deploy. Parent visual + functional review comes first.

---

## Commands

```bash
cd /workspace/jelly/jelly-gift-story
npm install
npx tsc --noEmit -p .
npx vite build
# static preview of dist (this box often uses 8833)
node tools/serve.mjs dist 8833
# or: npm run serve   → see package.json (historically port 8800)
npm run dev           # Vite MPA dev server
```

Playwright (box path used by earlier review scripts):

```bash
GIO_USE_PROXY_RESOLVER=dummy GSETTINGS_BACKEND=memory \
  node tools/story-review.mjs http://127.0.0.1:8833/
# Chrome binary: /usr/bin/google-chrome
```

Deploy (**do not run** until parent authorizes; story repo only, non-force):

```bash
GIFT_DEPLOY=1 scripts/deploy_pages.sh
```

The deploy script hard-refuses `jelly-gift.git`. Never point it at the old stable remote.

---

## Source map (where to look)

| Area | Path |
| --- | --- |
| Stage order, `go`, `from`, `asset()`, progress | `src/shared/flow.ts` |
| Loading curtain, pig-after-700ms, skip-ahead `NEXT` | `src/shared/curtain-inline.ts`, `src/shared/curtain.ts` |
| Iris / dissolve | `src/shared/transition.ts` |
| Story whispers | `src/shared/story.ts`, `src/shared/story-dict.ts` |
| Music fade | `src/shared/music.ts` |
| Meadow | `src/stages/meadow/{main,game}.ts` |
| Shop pixel world + exits | `src/stages/shop/{main,world}.ts` |
| Night → jelly | `src/stages/night/kawaii.ts` (`go('jelly')` + pink iris) |
| Jelly 入海 | `jelly/index.html` `#to-sea`, `src/main.ts` |
| Sea → sky | `src/stages/sea/main.ts` (auto after path `D+2.2`) |
| Sky → coop | `src/stages/sky/main.ts` (`.sk-next`; film is `.sk-film`, optional) |
| Coop → (should be flower) | `src/stages/coop/{main,game}.ts` |
| Flower / mushroom stroll | `src/stages/wander/engine.ts`, `src/stages/flower/main.ts`, `src/stages/mushroom/main.ts` |
| Home Module A | `src/stages/home/decorate/*`, `save.ts`, `dict.ts`, `style.css` |
| Home Module B | `src/stages/home/cineRoom.ts`, `montage.ts`, `main.ts` |
| Cat walk sheets | `public/art/fauna/cat-0.png`–`cat-3.png`; blit in `src/shared/pixel/cat32.ts` + wander engine |
| Art loader (must use `asset()` on Pages) | `src/art/loader.ts` |
| Before-evidence for the cat bug | `review/v03m/cat-walk-before-desktop-strip.png`, `cat-walk-before-phone-strip.png`, `cat-walk-before-desktop-frame2.png` |

Vite MPA pages live next to the repo root (`/`, `flower/`, `mushroom/`, `shop/`, `night/`, `jelly/`, `sea/`, `sky/`, `coop/`, `home/`, `ar/`). `base: './'`. Never use absolute `/art/...` URLs (that 404s under GitHub Pages `/jelly-gift-story/`).

---

## Constraints

- Story repo only. No edits under `/workspace/jelly/jelly-gift`, `jelly-gift-site`, or `smartlotus/jelly-gift`.
- No deploy, no force-push, no amend of already-pushed commits, no squash-merge into `main` unless a later parent brief says otherwise.
- No original private photos, no `*-far.jpg` generation dumps, no cadence folders, no secrets, no giant mp4s in git.
- Repo is already public; do not change visibility.

---

## Checkpoint git footer

Filled when this note is committed:

- Branch: `v03m-spatial-home`
- Commit: *(see the commit that added or last updated this file on the branch)*
- Tree: https://github.com/smartlotus/jelly-gift-story/tree/v03m-spatial-home
- This file: https://github.com/smartlotus/jelly-gift-story/blob/v03m-spatial-home/AI_HANDOFF.md
- Engineering log: https://github.com/smartlotus/jelly-gift-story/blob/v03m-spatial-home/docs/HANDOFF.md
- Story intent: https://github.com/smartlotus/jelly-gift-story/blob/v03m-spatial-home/docs/STORY.md

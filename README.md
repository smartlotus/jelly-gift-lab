# jelly-gift-story

Public **story edition** of the 200-day anniversary gift. On 11 November 2026 (Asia/Shanghai) branch `v03s-anniv-ending` was merged into `main` (`a2094e3`, 11:34) and deployed to GitHub Pages (`gh-pages` `c4818cb`; Pages build completed 11:35, status `built`). A follow-up commit on `main`, `1598fc4` (11:37), records those live hashes. Read [`AI_HANDOFF.md`](AI_HANDOFF.md) first (also pointed from [`docs/HANDOFF.md`](docs/HANDOFF.md)).

Live journey (`STAGES` in `src/shared/flow.ts`):

`meadow → shop → night → jelly → sea → sky → coop → flower → mushroom → home`

AR is a side room from the shop and always returns to the shop. After 「保存布局」, `/home/` plays the complete Notion v2 200-day film (`public/media/anniv-200.mp4`, 1920×1080, 67.712 s) with no text before the film; the closing card then uses the t35 order (2·3·1·4), ending on 「我的小臭猫。」. The unused v4 future-home film remains in the repo; a v5 realistic cut exists only as pre-release [`film-v05`](https://github.com/smartlotus/jelly-gift-story/releases/tag/film-v05) / draft [PR #3](https://github.com/smartlotus/jelly-gift-story/pull/3) and is not integrated. Do not redeploy without a new user request.

Known leftovers: the film’s white background leaves letterbox bands on a portrait phone; a real iPhone Safari walkthrough is still needed (automated tests are not a substitute); the 55 MB `anniv-200.mp4` is over GitHub’s 50 MB recommendation (hard limit 100 MB) and is not on LFS.

- Live site: [https://smartlotus.github.io/jelly-gift-story/](https://smartlotus.github.io/jelly-gift-story/)
- This is **not** the older stable gift. That site remains at [`smartlotus/jelly-gift-site`](https://github.com/smartlotus/jelly-gift-site) (private source, delivered **v03i**) and [https://smartlotus.github.io/jelly-gift/](https://smartlotus.github.io/jelly-gift/) (last deploy `1c2d5de`, 5 November 2026 10:10 Asia/Shanghai). Do not merge this tree back into those remotes and do not deploy over the old Pages site.

- Story intent and beat table: [`docs/STORY.md`](docs/STORY.md)
- Engineering notes: [`docs/HANDOFF.md`](docs/HANDOFF.md)
- All stage URLs are relative (`base: './'`). The site works at the domain root or under `/jelly-gift-story/`.
- Local preview: `npm install && npm run build && npm run serve`
- Deploy this edition only: `GIFT_DEPLOY=1 scripts/deploy_pages.sh` (publishes `dist/` to this repo's `gh-pages` branch, never to `smartlotus/jelly-gift`).

---

# Jelly Studies（果冻标本）— Hammerhead · Little Pig · Sleepy Cat

> **200 天礼物旅程**：本仓库是一个多页面网站。现行顺序见上文；果冻页在 `jelly/index.html`，不再是终章。
> 计划见 [`docs/GIFT_PLAN.md`](docs/GIFT_PLAN.md)，接手/进度见 [`AI_HANDOFF.md`](AI_HANDOFF.md) 与 [`docs/HANDOFF.md`](docs/HANDOFF.md)。下文描述的是果冻页本身（资源在 `public/jelly/assets/`）。

Interactive soft-body jelly characters for a 200-day anniversary gift: No. 1 hammerhead shark, No. 2 the pig and
No. 3 the cat from the couple's doodles. A hidden line-art mushroom (top right) opens the easter egg.
Fully static: `dist/` can be served from any static host / object storage, no CDN, no external fonts.

## Run
```
npm install
npm run build        # type-check + vite build -> dist/
npm run serve        # static server for dist/ on http://localhost:8800 (jelly page: /jelly/)
npm run dev          # vite dev server
npm run bake -- all  # regenerate public/jelly/assets/<id>/{hi,md,lo}.bin (or: npm run bake -- pig lo)
npm run fonts        # re-subset fonts (needs fonts-src/*.ttf, pip fonttools brotli)
```

## Pipeline (generic, per character)
`src/characters/<id>/shape.ts` (SDF + attrs + landmarks) → `tools/bake.ts` (surface nets → outer + inner surface,
snapped hex lattice → Kuhn tets, colouring, smooth node embedding, bubbles) → `public/assets/<id>/<level>.bin`
→ runtime XPBD (`src/sim/gpu.wgsl.ts` on WebGPU, `src/sim/cpu.ts` in a worker for WebGL2) → skinned surface
→ per-character pattern shader (`look.ts`) and actuation (`actuation.ts`). Register new characters in
`src/characters/registry.ts`.

## Backends
* WebGPU (default): compute-shader XPBD (graph-coloured Gauss–Seidel), WGSL render passes. Level `hi` on desktop, `md` on mobile.
* WebGL 2 fallback (automatic if WebGPU is missing or fails to initialise): same solver on a CPU worker, GLSL passes, level `lo`.

URL params: `char=shark|pig|cat`; debug: `backend=webgl2`, `q=hi|md|lo`, `dpr=1.5`, `cam=yaw,pitch,zoom`, `tgt=x,y,z`, `lockstep=1`
(self-check: one 60 Hz frame per finished sim step, so slow software GPUs reproduce real-time behaviour).

## Self-check
`node tools/shoot.mjs w=390 h=844 dpr=3 mobile=1 lock=1 steps=drag,twist,bait,colour:amber,touchtwist,fps`
(headless Chrome + SwiftShader); extra steps `switch:<id>`, `egg`. `tools/record.mjs` records a lockstep clip,
`tools/settle.ts <id> [rollDeg]` checks standing stability / self-righting on the CPU solver, `tools/sdfview.mts <id>`
previews an SDF without baking.

Characters are lazy-loaded: only the first character's mesh is fetched at start; the others when you switch.
The easter-egg module, CSS and Playfair fonts load on first hover/click of the mushroom.

Fonts: Source Serif 4, Playfair Display and Noto Serif SC (SIL OFL 1.1), subset and self-hosted in `src/assets/fonts/`.

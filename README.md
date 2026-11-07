# jelly-gift-story

Private **story edition** of the 200-day anniversary gift. This repository is a full copy of the journey (meadow → flower woods → mushroom woods → shop → night → jelly → sea → sky → coop → home) plus a through-line of small plot beats.

It is **not** the live stable site. The unchanged public gift remains at `smartlotus/jelly-gift-site` (source) and `smartlotus/jelly-gift` (GitHub Pages). Do not merge this tree back into those remotes and do not deploy over the old Pages site.

- Story intent and beat table: [`docs/STORY.md`](docs/STORY.md)
- Engineering notes: [`docs/HANDOFF.md`](docs/HANDOFF.md)
- All stage URLs are relative (`base: './'`). The site works at the domain root or under a subpath.
- Local preview: `npm install && npm run build && npm run serve`
- GitHub Pages for a *private* user repository may require a paid plan. Do not flip this repository public just to host Pages. If Pages cannot be enabled privately, use the local static build.

---

# Jelly Studies（果冻标本）— Hammerhead · Little Pig · Sleepy Cat

> **200 天礼物旅程（进行中）**：本仓库现在是一个多页面网站——`/` 第一章像素闯关 → `/shop/` 3D 模型小店 → `/night/` 夜路整蛊 → `/jelly/` 本果冻页（终章）。
> 计划见 [`docs/GIFT_PLAN.md`](docs/GIFT_PLAN.md)，接手/进度见 [`docs/HANDOFF.md`](docs/HANDOFF.md)。下文描述的是果冻页本身（现位于 `jelly/index.html`，资源在 `public/jelly/assets/`）。

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

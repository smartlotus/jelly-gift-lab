# Jelly Studies — No. 1 · Great Hammerhead（果冻标本 · 无沟双髻鲨）

Interactive soft-body jelly hammerhead. Stage 1 of an anniversary gift site (pig + cat + easter egg come next).
Fully static: `dist/` can be served from any static host / object storage, no CDN, no external fonts.

## Run
```
npm install
npm run build        # type-check + vite build -> dist/
npm run serve        # static server for dist/ on http://localhost:8800
npm run dev          # vite dev server
npm run bake         # regenerate public/assets/shark/{hi,md,lo}.bin from the SDF (slow, ~minutes)
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

URL params (debug): `backend=webgl2`, `q=hi|md|lo`, `dpr=1.5`, `cam=yaw,pitch,zoom`, `tgt=x,y,z`, `lockstep=1`
(self-check: one 60 Hz frame per finished sim step, so slow software GPUs reproduce real-time behaviour).

## Self-check
`node tools/shoot.mjs w=390 h=844 dpr=3 mobile=1 lock=1 steps=drag,twist,bait,colour:amber,touchtwist,fps`
(headless Chrome + SwiftShader). `tools/record.mjs` records a lockstep clip.

Fonts: Source Serif 4 and Noto Serif SC (SIL OFL 1.1), subset and self-hosted in `src/assets/fonts/`.

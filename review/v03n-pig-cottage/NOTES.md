# v03n pass — evidence (2026-11-08)

Not deployed. Branch `v03m-spatial-home` only.

| File | What it shows |
| --- | --- |
| `flower-pig-follow.png` | Painted pig companion walking behind the cat in the flower wood (1280×720, live build). |
| `mushroom-pig-follow.png` | Same pair in the mushroom wood. |
| `flower-pig-follow-strip.png` | Nine-frame strip of the follow while the cat walks right. |
| `flower-portrait-pig.png` | Portrait 390×844: chrome pill inside the screen, both animals grounded, caption clear of the key hint. |
| `cottage-grove-end.png` | The redrawn grove-end cottage (`src/stages/wander/house.ts`). |
| `dollhouse-furnished.png` | Module A with the softened wood grain; the per-piece toolbar is clamped away from 保存布局. |
| `verify-40.json` | Machine-readable result of the local puppeteer port of `tools/v03m-verify.mjs`: **40 tests, 0 failed**. |

Measured on this run:

- pig follow, flower: min gap 62.1 px, max 68.2 px, never parked, never overlapping
- pig follow, mushroom: min gap 62.4 px, max 68.2 px
- film independence: mean pixel diff 0.51 (greet) and 0 (sofa) between an empty save and a seven-piece save
- every stage boots with no page errors; the full hop chain passes (meadow → shop → night → jelly → sea → sky → coop → flower → mushroom → home, plus AR → shop)

Reproduce (this machine, Chrome at `C:/Program Files/Google/Chrome/Application/chrome.exe`):

```
npx vite build --config .setup/vite.local.config.mjs   # or: npm run build
node tools/serve.mjs dist 8833
node .setup/verify.mjs
```

`.setup/` is local tooling and is not committed; the port mirrors `tools/v03m-verify.mjs` check for check except the
WebKit smoke, which is replaced by a Chrome mobile-viewport boot of every stage.

# v03q — the ending is the 200-day film (2026-11-08)

Not deployed. Branch `v03m-spatial-home`.

## The chain

| step | what happens |
| --- | --- |
| 保存布局 | dollhouse torn down; warm paper page + centred 「也许有一天，也许会是第 2000 天…」 |
| +1.05 s | `anniv-200.mp4` starts muted under that page and fades in over 1.4 s |
| +2.0 s | the page's line leaves; the film owns the screen (`跳过` becomes a dark pill) |
| film ends | the film fades out 0.9 s, the end card takes over with 「我们已经有属于自己的两百天了…我的小臭猫。」 |
| end card | 继续布置 · 从头再来 · **再看一遍 = replays the film from frame 1** |

Sound: the film starts muted so autoplay is always allowed, then follows the site's sound switch (`onSound`). If a
browser still refuses to start it, a 「轻触播放」 button appears on the poster.

## Evidence

| File | Shows |
| --- | --- |
| `1-line-before-film.png` | the paper page with the first line, right after 保存布局 |
| `2-film-fades-in.png` | the film arriving under the page |
| `5-film-playing.png` | the film full-bleed (cat and pig, mushroom) |
| `3-after-film.png` | the beat after the film fades out |
| `4-end-card.png` | the closing line + buttons |
| `verify-39.log` | local puppeteer port of `tools/v03m-verify.mjs`: 39/39 |

## Also in this pass

- `tools/serve.mjs`: Range support (206 + `accept-ranges`). Without it Chrome reports `seekable.end = 0` for the MP4 in
  local preview, so the film could not be scrubbed or resumed. GitHub Pages already answers ranges.
- the code-drawn six-shot film stays parked (`FILM_ENABLED = false`, bookmark branch `v03o-film`); the verification
  harnesses now key their film-independence checks on `body.hm-code-film` and print "skipped" while it is unwired.

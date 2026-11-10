# Future-home film (ending, Module B) — production notes

Status (2026-11-09, America/Los_Angeles): **v4 candidate, integrated on branch `v03m-spatial-home` only — not merged,
not deployed, under review.**

## Source

Made in a separate workstream (render dir `jelly-future-film-v03r/`, not in this repo). Only the web encode, its poster
and a small manifest are committed under `public/media/`:

- `future-home.mp4` — 95.58 s, H.264 High 1920×1080 24 fps yuv420p, AAC-LC 48 kHz stereo, faststart, 35.4 MB.
- `future-home-poster.jpg` — frame at 0:31.
- `future-home.json` — `burned.transform = [0.5, 7.7]`, `burned.finale = 77.4` (seconds, from the film's VTT).

The ~270 MB master and the raw stills stay in the render dir.

## What it is, honestly

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

## Burned-in text (do not overlay again)

| Time | Line |
| --- | --- |
| 0.5–7.7 s | 也许有一天，也许会是第 2000 天，/ 我们已经拥有了一个自己的家。 |
| 77.4 s – end | 我们已经有属于自己的两百天了，/ 我想第两千天可能也并不遥远吧。 |
| 82.4 s – end | 我的小臭猫。 |

The page keeps the same three exact lines for the no-film fallback (WebKit without H.264, missing manifest, video error).

## Player contract

`src/stages/home/endingFilm.ts`: the video element is the clock; the film's AAC follows the global sound switch; a
refused autoplay or a return from a hidden tab shows 轻触播放; 跳过 goes to the end card; 再看一遍 replays only the
film; 继续布置 returns to the saved room. The film never reads the saved layout. `/home/` never loads anniv-200.

## Not yet verified

Real phones (iOS Safari / Android Chrome), real WebKit H.264 playback, a full real-time human review of the whole film.

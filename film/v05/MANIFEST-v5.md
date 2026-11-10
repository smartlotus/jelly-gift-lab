# 第 2000 天的家 — v5 (realistic cinematic), 2026-11-09

Duration 98.66 s, 24 fps, H.264 + AAC 48k stereo, -16 LUFS integrated, -2.6 dBFS peak.

## Deliverables
- future-home-2000-v5_16x9_1080p_web.mp4 — 1920x1080, ~8.8 Mbps, 109 MB (recommended to share/play)
- future-home-2000-v5_16x9_1080p_master.mp4 — 1920x1080 CRF16, 296 MB (archive)
- future-home-2000-v5_9x16_1080x1920.mp4 — vertical, full 16:9 picture centred on blurred fill, text in lower band, 58 MB
- future-home-2000-v5_cover.jpg (with title 「第 2000 天的家」), future-home-2000-v5_cover_notext.jpg
- stills/still_*.jpg, future-home-2000-v5_contactsheet.jpg, future-home-2000-v5_score.wav
- clean_notext.mov — ProRes graded edit without text/music (for re-titling)

## Method
1. GenerateImage reference sheets: couple (front/back), calico cat, border collie (refs/).
2. Per-shot 16:9 keyframes generated with those refs (keys/).
3. GenerateVideo image-to-video at native 1080p (1920x1088) per shot; crop to 1080; multiple takes for hard actions.
4. Edit/xfade/grade (warmth, vignette, light grain) via ffmpeg (build_video.py). Text rendered with Noto Serif CJK SC via PIL and overlaid (make_text.py) — no AI-drawn text.
5. Original score synthesised in code (audio/compose.py): piano + string pad + bells, 72 BPM, C major, follows scenes.

## Edit decision list (start in final film)
| t (s) | shot | source take | notes |
|---|---|---|---|
| 0.0 | dusk establishing, opening title | s0_establish_t1 | |
| 8.3 | garden path, hand in hand | s1_garden_t1 | |
| 15.8 | porch, door opens, light floods | s1_door_t1 | they reach the threshold; full step-in implied by next shot |
| 22.8 | inside: cat & dog greet | s2_greet_t1 (key v3) | v1/v2 keys rejected (cat running wrong way / cat oversized) |
| 29.3 | night sofa, TV glow, cat jumps onto lap, dog on rug | s3_sofa_t2 | t1 rejected (cat climbs, stretched) |
| 38.3 | sofa close-up, kiss on head, cat asleep on lap | s3_lap_t1 | |
| 43.8 | sleeping embraced, cat on quilt, snow outside | s4_bed_t1 | |
| 52.8 | window, first snow | s4_window_t1 | |
| 57.3 | snowy cottage morning | s5_snowhouse_t1 | |
| 62.3 | snowy lane walk toward camera | s5_snow_t1 (first 3.4 s only) | rest of t1 rejected (dog ran opposite way) |
| 65.7 | side track: dog overtakes, couple run after it | s5_snowside_t2 | snow_t2/t3, snowside_t1 rejected |
| 72.2 | sunrise from behind, cat & dog | s6_sunrise_t1 | |
| 86.8 | sunrise hold, 「我的小臭猫。」 89 s→end, fade to black 95.8 s | s6_sunrise_ext_t1 (I2V from last frame of previous) | |

All shots are generated video; no still-image/Ken-Burns fallback was used.

## Final mux commands (as run)
```bash
# 16:9 master
ffmpeg -i out/clean_notext.mov -loop 1 -t 98.658 -i text/open_16x9.png -loop 1 -t 98.658 -i text/end_16x9.png -i audio/score_v5.wav -filter_complex "\
[1:v]format=rgba,fade=t=in:st=1.3:d=1.4:alpha=1,fade=t=out:st=7.4:d=1.4:alpha=1[o];\
[2:v]format=rgba,fade=t=in:st=89.0:d=2.2:alpha=1[e];\
[0:v][o]overlay=0:0:shortest=1[a];[a][e]overlay=0:0:shortest=1,fade=t=in:st=0:d=1.2,fade=t=out:st=95.8:d=2.85,format=yuv420p[v]" \
-map "[v]" -map 3:a -c:v libx264 -preset slow -crf 16 -profile:v high -level 4.1 -pix_fmt yuv420p -r 24 -c:a aac -b:a 256k -ar 48000 -movflags +faststart -t 98.658 future-home-2000-v5_16x9_1080p_master.mp4
# web
ffmpeg -i future-home-2000-v5_16x9_1080p_master.mp4 -c:v libx264 -preset slow -crf 21 -maxrate 9M -bufsize 18M -profile:v high -level 4.1 -pix_fmt yuv420p -c:a copy -movflags +faststart future-home-2000-v5_16x9_1080p_web.mp4
# 9:16: same as master but background = [0:v]scale=-2:1920,crop=1080:1920,gblur=sigma=40,eq=brightness=-0.10:saturation=0.85,
#        foreground = scale=1080:608 overlaid at y=656, text/open_9x16.png + text/end_9x16.png, crf 20, maxrate 9M
```

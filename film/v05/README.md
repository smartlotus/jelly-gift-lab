# 《第 2000 天的家》v5 —— 写实电影风短片（素材与制作代码）

> 状态（2026-11-09 PT）：**成片已完成，但尚未接入网站**。网站 `public/media/future-home.mp4` 仍是 v4；本目录不会改变网站任何行为。未合并 main，未部署 gh-pages。
> 本仓库是公开仓库，本目录与 Release 中的素材均为公开可见。所有画面都是 AI 生成，未使用真实人物照片。

## 成片下载（GitHub Release `film-v05`，预发布）
https://github.com/smartlotus/jelly-gift-story/releases/tag/film-v05

| 文件 | 说明 |
|---|---|
| `future-home-2000-v5_16x9_1080p_web.mp4` | 横屏 1920x1080，约 8.8 Mbps，109 MB —— 推荐观看/分享 |
| `future-home-2000-v5_16x9_1080p_master.mp4` | 横屏高质量母版 CRF16，296 MB |
| `future-home-2000-v5_9x16_1080x1920.mp4` | 竖屏 1080x1920（横屏画面居中 + 上下虚化背景，文字在下方） |
| `future-home-2000-v5_generated-clips.tar` | 全部 AI 生成原始片段（含被淘汰的版本），约 400 MB |
| `future-home-2000-v5_clean_notext_prores.mov.part00/01` | 无字幕、无音乐的调色剪辑 ProRes 母版（2.3 GB，超过单文件 2 GB 上限，故无损切成两段） |
| `SHA256SUMS.txt` | 校验值 |

无字母版还原：
```bash
cat future-home-2000-v5_clean_notext_prores.mov.part00 future-home-2000-v5_clean_notext_prores.mov.part01 > clean_notext.mov
sha256sum clean_notext.mov   # 与 SHA256SUMS.txt 中 clean_notext.mov 一行比对
```

时长 98.66 秒，24fps，H.264 + AAC 48k 立体声，响度 -16 LUFS。

## 目录结构
```
film/v05/
├── README.md                 本文件
├── MANIFEST-v5.md            方法、镜头表（每镜头起始时间、采用哪一条）、淘汰原因
├── PROMPTS.md                设定图 / 关键画面 / 视频动作提示词记录
├── timeline.json             剪辑后每个镜头的起点
├── future-home-2000-v5_cover.jpg / _cover_notext.jpg   封面（带/不带标题）
├── future-home-2000-v5_contactsheet.jpg                全片缩略图
├── future-home-2000-v5_score.wav                       原创配乐（24-bit 48k，-16 LUFS）
├── refs/      人物、三花猫、边牧设定图
├── keys/      每个镜头的首帧关键画面（含淘汰版本）
├── text/      叠加字幕 PNG（横/竖屏开头句、结尾句、封面标题）
├── stills/    成片代表帧
├── review/    每条生成片段的 12 帧抽帧检查图 + 成片检查图
└── scripts/
    ├── build_video.py   规范化片段（裁到 1080、24fps、ProRes）→ 交叉淡化 → 调色，输出 clean_notext.mov
    ├── make_text.py     用 Noto Serif CJK SC 渲染字幕 PNG
    ├── sheet.sh         生成抽帧检查图
    └── audio/compose.py 代码合成原创钢琴+弦乐+铃声配乐
```

## 如何重建
脚本里写死了工作目录 `/workspace/jelly-future-film-v05/`（片段在 `clips/`，输出在 `out/`）。在别处重建时改脚本开头的路径即可。
1. 下载 Release 中的 `generated-clips.tar` 解压得到 `clips/`。
2. `python3 scripts/build_video.py` → `out/clean_notext.mov`（需 ffmpeg，约 4 分钟）。
3. `python3 scripts/make_text.py` → 字幕 PNG（需 Pillow 与 Noto Serif CJK 字体）。
4. 配乐：`python3 scripts/audio/compose.py`（需 numpy、scipy、soundfile）→ `score_raw.wav`，再 `ffmpeg -i score_raw.wav -af "lowpass=f=12000,volume=-1.63dB" score_v5.wav`。
5. 合成横屏：clean_notext.mov + 开头字幕（1.3–8.8s 淡入淡出）+ 结尾字幕（89s 淡入）+ 配乐，结尾 95.8s 起 2.85s 淡出黑场；具体 ffmpeg 命令见 MANIFEST-v5.md。竖屏为同一剪辑缩放居中叠在虚化背景上。

## 已知不足
1. 沙发和进门镜头里小猫比例略大；跳跃时身体被拉长。
2. 开门镜头两人走到门口、镜头推进光中，没有完整拍到跨进门（下一镜从室内接上）。
3. 屋内门与屋外门造型不完全一致。
4. 各镜头人物长相接近但非完全一致（未训练专属人物模型）。
5. 睡觉镜头女生穿米白睡衣；雪景中加了大衣和围巾。
6. 沙发近景男生毛衣上有几道电视光条纹，略不自然。
7. 雪地奔跑时狗从两人腿前穿过：抽帧看遮挡合理，但未逐帧检查。
8. 日出镜头女生背上有一点镜头光斑；逆光下猫背花纹更像虎斑。
9. 配乐为电脑合成音色，只用频谱和响度表检查过，未试听；可换成真人演奏或正版无版权音乐。
10. 竖屏版不是逐镜头重新构图，手机上画面偏小。
11. 文件对网站偏大；接入网站前需要另做轻量编码，并在真机 Safari/Android 上测试。

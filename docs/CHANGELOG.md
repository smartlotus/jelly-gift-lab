# 实验版更新记录（jelly-gift-lab）

只记实验版（本仓库）的改动；故事版 / 稳定版不受影响。时间为北京时间。

## 2026-11-15 · 每个模型都能 AR（t15）

- **之前**：只有 3 个模型能 AR（小猪、小猫、情侣件；iOS 用 Quick Look 打开 USDZ，安卓用页面里的 WebXR，不支持就隐藏按钮）。冰箱贴和后来加的 Lotus30 四件（书桌前的小猪、看书的小猫、两块浮雕冰箱贴）都没有。
- **现在小店 9 个模型全部能 AR**（`src/shared/ar.ts` 的 `AR_IDS`；以后加模型：在这里和 `src/stages/ar/models.ts` 加一项，再跑下面两个脚本）。
  - iOS / iPadOS：AR Quick Look，新做了 6 个 USDZ（`tools/models/glb_to_usdz.py`，用 usd-core，不需要 Blender），真实打印尺寸，不能缩放。
  - 安卓：Chrome 支持 WebXR 时在页面里放置（冰箱贴可以贴到墙上 / 冰箱门上，其他放在桌面上）；不支持时改用 Google Scene Viewer，打开专门的 AR 版 GLB（`public/models/ar/<id>.glb`，`tools/models/build_ar.mjs`）。这个版本不用 meshopt / 量化 / 其他扩展，单位是米，底面贴地，前面朝 +Z；冰箱贴是竖着的，允许贴墙。没有 Google AR 服务的手机会回到 /ar/，提示「暂时打不开 AR」，可以继续转着看 3D。
  - 微信等 App 内置浏览器会提示「用浏览器打开」；电脑上会提示「用手机打开」。
  - AR 文件只在点了 AR 之后才由 Quick Look / Scene Viewer 下载，平时加载不变。/ar/ 页一次只显示一类（摆件 5 个 / 冰箱贴 4 个），圆点按钮在 360 px 宽的屏幕上也放得下。
  - 尺寸：AR 版 GLB 1.9–3.6 MiB，pair 3.0 MiB；新 USDZ 1.6–3.3 MiB。所有文件都远小于 Cloudflare 25 MiB 的上限。
- **检视器底栏**：「看背面」按钮原来在每个模型上都会显示（CSS 盖掉了 hidden），现在只在浮雕冰箱贴上显示。底栏所有按钮都改成 44×44。手机屏（≤ 520 px）上「看背面」只显示图标，按钮太多时中间一排换成两行，不再超出 360 px 屏幕。
- **测试**：新增 `tools/ar-verify.mjs`（`npm run test:ar`，也是 lab-verify 第 7 部分），检查：
  - 文件：AR 文件齐全，没有扩展，小于 25 MiB；
  - 线上：MIME 是 model/gltf-binary 和 model/vnd.usdz+zip；
  - 安卓：生成的 Scene Viewer 链接和回退地址正确；
  - iOS（模拟）：打开的是对应模型的 USDZ；
  - 微信 / 电脑：显示对应提示；
  - 检视器：每个模型都有 AR 按钮，至少 44 px。
  - 另外用 gltf-validator 检查了 9 个 GLB（0 错误 0 警告），用 USD 合规检查（ARKit 规则）检查了 9 个 USDZ（0 问题）。`tools/ar-preview.html` 可以预览 AR 版 GLB 的姿态。
- 真正的 AR（摄像头、Quick Look、Scene Viewer）没法在无头浏览器里测，需要真机确认。

## 2026-11-14（夜）· 果冻重力四个方向 + 果冻页加载提速（t14）

- **重力感应不能往上的原因**（`src/app/tilt.ts`）：旧算法只取「向下」向量在屏幕右方向的分量（左右）和前后倾，竖直方向永远是「地板重力减一点」，所以 out[1] 只能 ≥ −G 的一部分、不会变成向上；物理里也只有地板没有顶。修法：屏幕平面内的重力方向用 x、y 两个分量一起算（近乎平放时平滑回到普通地板，放桌上不会飘），手机倒过来时竖直分量变为向上；`engine.ts` 给模拟加一个顶（`box[7]`，在可视范围内、不压到惊喜坞），`cpu.ts` / `gpu.wgsl.ts` 都处理顶部碰撞。仍保留原来的指数平滑。横屏（90° / 270°）沿用 `screen.orientation.angle` 的映射。
- **新测试** `tools/jelly-tilt-verify.mjs`（`npm run test:tilt`，也是 lab-verify 第 6 部分）：模拟 deviceorientation / devicemotion，竖屏 + 横屏 90 / 270，左 / 右 / 上 / 下都要移动、左右对称、上下能靠到边界。
- **果冻页加载**（`src/shared/jellyAsset.ts`）：主要耗时是 tet-mesh 资源（~2.2 MB）。
  - 果冻页一打开就开始下载，和 WebGPU 初始化并行；只下载真正会用的档位（先问一次 WebGPU adapter，结果存会话，避免下载两份）。
  - 夜路走 6 秒后空闲低优先级预取果冻资源和果冻页（省流量 / 2G 不预取）。
  - Cloudflare 版附带预压缩的 `.bin.gz`，浏览器用 DecompressionStream 解压（Pages 不压缩二进制），并加 1 小时缓存头；GitHub Pages 本身会 gzip。
  - 实测（无头 Chrome，慢 4G + CPU 4× 降速，`tools/jelly-load.mjs`，`npm run perf:jelly-load`）：改前冷启动果冻可动 15.4 s；GitHub 版冷启动 15.5 s（瓶颈是网络），Cloudflare 版冷启动 9.6 s；从夜路过来（停留 30 s）改前 13.3 s → 改后 GitHub 1.0 s / Cloudflare 1.2 s，幕布消失 14.9 s → 2.6 / 3.3 s。数据在 `/workspace/lab-shots/android/jelly-load/`。

## 2026-11-14（晚）· 文案表里清空的 38 条按删除处理（t13）

- 用户确认：表格里被清空的格子就是要删掉。中文和对应英文一起删，共 38 条（清单与处理见 `/workspace/英文同步对照表.xlsx` 第二页）。
  - 草地：底部操作提示（键盘 / 触屏两条）不再显示；喷泉字幕只留「BOOM!」；`meadow.sub` 本来就没显示，删掉。
  - 夜路：开场台词「牵着手走吧……」整步去掉（不弹空气泡）；操作提示两条不再显示。
  - 小店：展品名称、介绍、类别、颜色数、材质、标题、副标题、操作提示这些文字在当前版本里本来就没显示，从字典删掉；「分开」删掉后拼合件的拆分按钮沿用「分色拆解」的提示；「完整展厅 →」删掉文字后改成一个外链小图标（44×44），点它仍打开 Lotus30 展厅，不会出现空按钮。
  - 天空：短片标题和说明随天空关短片一起已经撤掉。
- 相册没有涉及。

## 2026-11-14 · 安卓流畅度与适配（t12）

- **性能档位**（`src/shared/perf.ts`、`perf.css`）：按设备内存、核数、省流量、微信 / X5 自动分 high / mid / low 三档，`?perf=high|mid|low` 可强制；`html[data-perf]` 给 CSS 用。画布分辨率封顶（mid 1.5×，low 1.25×），高刷屏限 60 帧，页面隐藏时停循环、挂起音频；低档去掉模糊 / 毛玻璃等贵的效果。高档（好设备）外观不变。
- **安卓适配**：所有页面 `interactive-widget=resizes-visual`（键盘不挤画面）、`100dvh` 回退、安全区 / 手势条、转屏柔光幕不在打字时触发、首次点击解锁音频、微信 / X5 的 `playsinline` / `x5-*` 属性、中文字体回退。
- **天空关去掉影片**，影片只在结尾放。**家里的惊喜动画重做**：一个会变魔术的搬家纸箱，弹出地毯、沙发、台灯、边桌、相框和抱枕，箱子折平溜走，台灯亮起，相框里出现小房子；不再出现两个人。
- **结尾影片转码**：720p H.264（13.7 MB，约 1.6 Mbps）为主，480p（7.3 MB，约 0.86 Mbps）备用，加 720 海报；原 58 MB 的 1080p 文件移出仓库。按需预加载。
- **商店三维小摆件 / 冰箱贴「一直在加载」修好**（`src/stages/shop/models.ts`、`viewer.ts`）：
  - 原因：6 个模型同时下载，慢网下第一个被挤到 20 秒以上；GitHub Pages 的 gzip 让进度超过 100% 看起来像卡住；卡住或失败的请求从不重试；部署后旧 HTML 引用已删除的分块 → 404，模型永远出不来；WebGL 上下文丢失没处理。
  - 修法：先只下载离起点最近的一个，之后两路并发、由近到远；流式下载，9 秒没进展就中断重试（最多 3 次，退避）；3.5 秒后显示进度百分比，失败显示「重试」按钮，联网 / 回到前台自动重试；进入商店前在草地空闲时预取；分块 404 时自动刷新一次；部署脚本保留上一版的 assets 一代；上下文丢失 / 恢复后重建环境光照。
  - 模型本身已是 meshopt + 量化，贴图只有 64×4 调色板，再压缩只省约 3%，没有再动。
- **控件自适应布局**（`src/shared/layout.ts`、`layout.css`）：惊喜坞、台词、商店状态条会自动避开本关控件（触摸板、色板、地图、返回、一起玩……），触屏上所有按钮至少 44 px。8 种视口（360×640、360×780、20:9、412×915、横屏 640×360 / 873×393、折叠屏、平板，带手势条）× 12 页自动检查：改前 63 处问题，改后 0。
- **文案**：按你改过的表格更新了 14 处中文，并同步了英文；表格里被清空的 38 格没有删除，等确认（见 `/workspace/英文同步对照表.xlsx`）。
- **Cloudflare Pages**：`scripts/build_cloudflare.sh` 构建 `dist-cf`（base `/`，秘密页指向 `https://rhine-album.pages.dev/?from=jelly`，加 `_headers` 长缓存），部署到 https://jelly-gift-lab.pages.dev/ 。GitHub Pages 版本不变，秘密页仍指向 GitHub 上的相册。
- **测试**：新增 `tools/android-perf.mjs`、`tools/android-compat.mjs`、`tools/shop-models-verify.mjs`、`tools/overlap-audit.mjs`；`tools/lab-verify.mjs` 第 5 部分为重叠检查（`OVERLAP=0` 跳过）。

## 2026-11-13 · 横屏与转屏（t11）

- **所有页面支持手机横屏**：十关、AR 侧室、惊喜 / 跳过 / 收集坞、收集清单、结尾短片与结尾卡片、秘密页（占位）。在 844×390、932×430、667×375 和 390×844 下检查过，模拟 iPhone 安全区（刘海、底部横条）。
  - 横屏矮屏时台词改到顶部居中（两人小局在左上，果冻页宽横屏在底部中间），不再压住底部按钮。
  - 天空关的惊喜坞移到顶部；两人小局的惊喜坞改为右侧竖排。
  - 收集清单横屏时铺满高度，「关上」钉在卡片底部；两侧让出刘海。
  - 藏起来的东西不会落进刘海一侧（按安全区夹紧）。
  - 「中 / EN」按钮加宽，好点。
- **转屏过渡**（`src/shared/orient.ts`）：按关配色的柔光幕 + 转动的小手机图标，盖住重排，画布按最终尺寸重新适配后再淡出；减弱动态效果时只淡入淡出；不锁方向。
- **集齐后的秘密页**改为相册网站：`SECRET_PAGE = https://smartlotus.github.io/rhine-album/?from=jelly`（`src/shared/surprise/config.ts`）。原来的 `secret/` 占位页保留（提前打开时提示还没找齐）。
- **测试**：`tools/lab-verify.mjs` 新增横屏 / 转屏部分；新增 `tools/landscape-audit.mjs`。
- **部署**：第一次部署到本仓库自己的 Pages：https://smartlotus.github.io/jelly-gift-lab/ （`GIFT_DEPLOY=1 scripts/deploy_pages.sh`，脚本拒绝其他仓库）。PR #1 仍未合并。

## 2026-11-12 · 惊喜 / 跳过 / 收集

- 每关一个惊喜坞：「惊喜」播本关动画并藏一样东西，「跳过」走本关自己的出口到下一关，「n/10」打开收集清单。
- 结尾短片后：没找齐 → 清单自动弹出并提示还差几样；全部找到 → 小卡片「全找到了…」后打开秘密页。「再看一遍 / 继续布置」取消，「从头再来」清空收集。
- 测试：`npm run test:collect`（26 项）、`tools/lab-verify.mjs`（e2e）。

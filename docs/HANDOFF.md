# HANDOFF · 交接文档（任何 AI / 开发者从这里接手）

> 先读：本文件 → [`GIFT_PLAN.md`](./GIFT_PLAN.md)（设计与验收的唯一事实来源）→ 你负责的 [`status/<A|B|C>.md`](./status/)。
> **规则：每完成一个可运行的小步就 commit + `git push origin master`，并更新下面的状态表 / 你的 status 文件。** 额度随时可能中断，下一个人只看 GitHub。

## 1. 项目是什么

给 lushiva 的 200 天纪念礼物，一个链接、四章：`/` 猫里奥式像素闯关（喷泉爱心 + 门）→ `/shop/` 像素猫领逛 3D 模型小店 → `/night/` 方块夜路整蛊（必被小猪抓 → 粉嫩反转）→ `/jelly/` 果冻标本 + 蘑菇彩蛋。用户：lotus（写中文）。

## 2. 仓库与环境

| 项 | 值 |
|---|---|
| 源码仓库（私有） | `https://github.com/smartlotus/jelly-gift-site`，分支 **master**，本机 `/workspace/jelly-site` |
| 公开部署仓库（只放 dist） | `smartlotus/jelly-gift` 分支 `main` → GitHub Pages `https://smartlotus.github.io/jelly-gift/`（本机 `/workspace/jelly-gift-deploy`） |
| 3D 模型仓库（私有） | `smartlotus/lotus-3d-figures`，本机 `/workspace/lotus-3d-figures-repo` |
| 涂鸦参考 | `/workspace/figure-project/refs/ref_A_pig_laptop.jpg`（猪+笔记本）、`ref_B_cat_book.jpg`（猫+书） |
| Blender | `/workspace/blender-4.2.3-linux-x64/blender`（模型转换用） |
| git 身份 | `gh` 已登录 smartlotus；本仓库已 `git config user.email 227950577+smartlotus@users.noreply.github.com` / `user.name smartlotus`（新克隆要重新设置，否则会以 bot@local 提交） |
| 规则 | 每次提交后 `git push origin master`；**禁止 force-push**；提交前 `git pull --rebase origin master` |

## 3. 目录结构

```
index.html                 第一章 /        (meta gift-stage=meadow)
shop/index.html            第二章 /shop/
night/index.html           第三章 /night/
jelly/index.html           终章 /jelly/    (原果冻页，移动自根目录)
vite.config.ts             MPA 入口 + %T:key% 标题插件（合并所有词典的英文）
src/shared/                共享：flow / i18n / dict / chrome(.css) / audio / transition
src/shared/pixel/          2D 像素引擎：screen loop input touch tiles camera sprite cat stubwalk
src/stages/meadow|shop|night/   各章：main.ts dict.ts style.css (+ 你的模块)
src/main.ts + src/{app,characters,core,egg,i18n,render,sim,ui}/   果冻页（WebGPU/WebGL2 软体）
src/assets/fonts/          自托管字体子集（Source Serif 4、Noto Serif SC、Playfair Display）
public/jelly/assets/<id>/{hi,md,lo}.bin   果冻网格（页面用相对路径 ./assets/ 读取）
public/models/*.glb        第二章模型（meshopt 压缩）
tools/                     bake/fonts/shoot/serve/... + tools/models/（GLB 管线）+ tools/smoke-flow.mjs
scripts/deploy_pages.sh    部署（已加 GIFT_DEPLOY=1 闸门）
docs/                      GIFT_PLAN.md、HANDOFF.md、status/
review/                    截图（按章分子目录）
```

`dist/` **不再提交**（已加入 .gitignore；构建产物只进公开部署仓库）。

## 4. 运行 / 构建 / 部署

```bash
cd /workspace/jelly-site
npm install
npm run dev                       # http://localhost:5173/  /shop/  /night/  /jelly/
npm run build                     # tsc --noEmit + vite build → dist/（四个页面）
npm run serve                     # node tools/serve.mjs dist 8800（/shop → /shop/ 重定向，同 GitHub Pages）
node tools/smoke-flow.mjs         # 需先 serve 在 8811：node tools/serve.mjs dist 8811；走完 / → /shop/，检查 ?stage= 和 /jelly/
npm run fonts                     # 中文文案变更后重新子集化（见 §6）
tools/models/compress.sh          # 重新生成 public/models/*.glb（TRIS=60000 可降面）
GIFT_DEPLOY=1 scripts/deploy_pages.sh   # 仅在 M8 完成后！会把线上根目录换成第一章
```

开发直达：`/?stage=2`（或 shop/3/night/4/jelly）、`?lang=zh|en`、`?dev`、`?sound=1`、`?skip`；果冻页原有参数 `char=`、`backend=webgl2`、`q=`、`lockstep=1` 等不变。

## 5. 约定（conventions）

- **相对路径**：vite `base: './'`。页面互链用 `stageUrl()/go()`；`public/` 里的文件用 `asset('models/x.glb')`。不要写 `/models/...`（部署在 `/jelly-gift/` 子路径下会 404），也别用 `import.meta.env.BASE_URL`（它是 `./`，相对当前页面）。
- **i18n**：每章 `dict.ts` 导出 `en`/`zh`，键前缀为章名；`register(dict)` 后 `apply()`；DOM 用 `data-i18n`。语言存 `localStorage['jelly.lang']`（与果冻页共享）。
- **像素**：逻辑分辨率 + 整数放大（`PixelScreen`）；坐标取整；精灵用字符画（`raster()`）；60 Hz 固定步长（`startLoop`）。
- **输入**：游戏代码只读 `input.pressed/hit/axis()`；触屏按钮 `mountTouch()`。
- **样式**：UI 只用 `chrome.css` 的 tokens 和字体；各章私有样式写在自己的 `style.css`，选择器加章节前缀避免互相污染。
- **无外链**：不引用任何 CDN / Google Fonts / 外部图片；新依赖走 npm 打包。
- **音频**：默认静音，用 `audio.ts`，不加音频文件。
- **TypeScript**：`strict`；tsconfig 的 lib 里有 `WebWorker`，所以全局 `addEventListener` 的事件类型是 `Event` → **写 `window.addEventListener`**。
- **提交**：小步、信息清楚（`meadow: fountain hearts particle system`）；改了谁的文件看 GIFT_PLAN §9 归属表。

## 6. 坑 / gotchas

1. **无头截图**：SwiftShader 很慢。像素章用 `window.__pause = true` 冻结循环、`window.__steps = N` 前进 N 个 60 Hz 步再截图（`src/shared/pixel/loop.ts`）。果冻页用已有的 `lockstep=1` 参数和 `tools/shoot.mjs`（WebGPU flags 已写好；默认 URL 已改为 `/jelly/`）。3D 章（three.js）建议也实现 `?dev&freeze` 或同样读 `window.__pause`，否则 rAF 在截图前跑飞/超时。
2. **字体子集**：`src/assets/fonts/NotoSerifSC-sub.woff2` 只含站内用到的汉字（`tools/fonts.py` 扫描所有页面 HTML + `src/**/*.ts|css`）。**改中文文案后不跑 `npm run fonts`，新字会回退到系统宋体**。源 ttf 在 `fonts-src/`（被 gitignore，本机有；没有就按 fonts.py 顶部注释下载）。并行开发期间别提交字体，M7 统一生成。
3. **果冻页移动到 /jelly/**：资源在 `public/jelly/assets/`，代码 `./assets/${id}/${q}.bin` 相对页面解析。URL 必须带结尾斜杠（`/jelly/`）；GitHub Pages 和 `tools/serve.mjs` 都会 301 到带斜杠的地址。`vite dev` 下要打开 `/jelly/`（不是 `/jelly`）。
4. **部署闸门**：`scripts/deploy_pages.sh` 没有 `GIFT_DEPLOY=1` 会拒绝执行——线上现在还是旧的果冻页（根目录），必须等整个旅程完成再部署。
5. **Vite 8 = rolldown**：多页入口写在 `build.rollupOptions.input`（仍兼容）。新增页面要同时加到这里和 `flow.ts` 的 `STAGES/PATH`。
6. **TypeScript 7（tsgo）** 很快但报错信息略不同；`npm run build` 先跑 `tsc --noEmit`。
7. **iOS**：音频必须在手势里 `unlock()`（标题卡已做）；不要用 `100vh`；`touch-action: none` 已全局设置——需要页面滚动的地方（没有）要单独放开。
8. **GLB**：meshopt 压缩，必须 `GLTFLoader.setMeshoptDecoder(MeshoptDecoder)`（`three/examples/jsm/libs/meshopt_decoder.module.js`）。模型单位：1 = 10 cm，Y-up，原点在 OBJ 原点（底面附近，未居中）→ 查看器按包围盒居中/缩放。
9. **大文件**：GitHub 单文件 100 MB 上限，无 LFS；3D 仓库的 .blend 很大，别复制进本仓库。
10. 果冻页的 `tools/*.mjs` 截图脚本依赖 `/usr/bin/google-chrome` + puppeteer-core（已在 devDependencies）。

## 7. 状态表（随时更新）

| # | 里程碑 | 归属 | 状态 | 备注 / 提交 |
|---|---|---|---|---|
| M0 | 计划 + 交接 + MPA 脚手架 + 共享引擎雏形 + GLB 管线 | 整合人 | ✅ 完成 | `55de709` |
| M1 | 像素引擎定稿 + 猫精灵定稿 + 审稿工具 | A | ✅ 完成 | `b15a7fe`，详见 `status/A.md` |
| M2 | 第一章关卡 + 喷泉 + 门 | A | ✅ 完成 | `9990799` … `44b7b4c` |
| M3 | 3D 查看器模块 | B | ✅ 完成 | `3fcbcce`，详见 `status/B.md` |
| M4 | 第二章像素小店 + 集成（含 No.05 情侣拼合） | B | ✅ 完成 | `3fcbcce` … `e59693b` |
| M5 | 第三章体素世界 + 录像滤镜 | C | ✅ 完成 | `df2f9ef`，详见 `status/C.md` |
| M6 | 第三章追逐 + 反转 | C | ✅ 完成 | `df2f9ef` … `796cc6a` |
| M7 | 整合：字体、文案、转场连续、果冻到达提示、报告里的小修 | 整合人 | ✅ 完成 | 见 §9 变更日志 |
| M8 | 部署 | 整合人 | ✅ 已部署 | 公开仓库 `smartlotus/jelly-gift@473aaf3`（源 `31e6ac5`，T24）；只做了最少的线上检查（见 §9） |

线上地址：`https://smartlotus.github.io/jelly-gift/`（第一章）· `/shop/` · `/night/` · `/jelly/`。
**再次部署**：`GIFT_DEPLOY=1 scripts/deploy_pages.sh`（普通 push，不会 force）。
**交付版 01 = tag `v01`**（源 `jelly-gift-site@v01` = `317a483`，部署 `jelly-gift@v01` = `473aaf3`，Release 附 dist zip）。恢复：`git checkout v01 && GIFT_DEPLOY=1 scripts/deploy_pages.sh`。
**最少线上检查**：`node tools/check-pages.mjs https://smartlotus.github.io/jelly-gift/ [phone-shot.png]`（四页 console 错误 / 失败请求）。

## 8. 下一步（可选打磨；礼物已可用）

- 真机试玩（iPhone 竖/横屏、安卓、iPad、桌面）——全部工作流都只做了无头截图验证。重点：第一章手感与门、第二章检视模式双指缩放、第三章帧率。
- 第三章：追逐中的猪/横穿身影不与地形碰撞（暗处，基本看不出来）；粉嫩贴纸是手写 SVG，可换成 potrace 描的涂鸦线。
- 第一章：`ui.rotate` 横屏提示未使用；喷泉时可加大号 "200"。
- 国内网络：如 github.io 不稳定，把 `dist/` 原样上传到任意国内静态托管即可（全相对路径）。

## 8b. 原始下一步（M0 时写的，已完成，留作参考）

1. **A**：精修 `cat.ts`（全部帧）→ `tools/pixel/sheet.mjs` 审稿 → `src/stages/meadow/level.ts`（字符地图，GIFT_PLAN §5.1 草图）+ 瓦片条带预渲染 → 问号砖/小怪/云/弹簧/检查点 → 喷泉爱心粒子 + 200 计数 → 门 + 出场。竖屏布局（画布贴上、按钮在下方留白）。
2. **B**：`src/stages/shop/viewer.ts`（three：renderer、RoomEnvironment、GLTFLoader+Meshopt、OrbitControls、scissor 视口、检视模式、分色拆解）→ `/shop/?dev&viewer` 单测 → 像素小店 `world.ts` + 展台锚点 → 说明卡 → 后门。
3. **C**：`src/stages/night/voxel.ts`（程序贴图 + InstancedMesh 小路森林）→ 前进/环顾 → 录像后期 → 事件脚本（timeline）→ 猪 Boss 体素 → 抓取 → `kawaii.ts`（SVG 贴纸 + 动画）→ `go()`。
4. **整合人**：合并后跑 `npm run fonts`、全流程 QA、音效、部署。

## 9. 变更日志（共享 API 有变化时在此记一行）

- 2026-11-03 T24（整合人，按用户试玩反馈）：①果冻彩蛋 kicker 去掉「特刊 / Special Edition」→「果冻标本 / Jelly Studies」；②第三章加三个轻解谜（`src/stages/night/puzzles.ts`，DOM 覆盖层 + 像素画）：蘑菇从小到大（木牌圆点提示）→ 三岔路跟蹄印 → 木门挂锁「世界屁股日是什么时候？」`__ 月 __ 日` 数字轮（▲▼ / 数字键盘 / 键盘，答案 5/05 · 2/02）；2 次错给提示，蘑菇 4 次 / 岔路 3 次 / 门锁 6 次后自动通过；闲置 9 s 自动前行；门（`gate.ts`，体素小路上的双开木门）解开后打开，随后追逐 + 必被抓不变；dev `?at=trail|gate`；③反转画面换成绘本风插画 `src/stages/night/art/hug.webp`（GenerateImage 以涂鸦为参考生成，1600 px，141 KB，导入时预解码），纸张底色 + 颗粒、手写感倾斜标题、心形上浮、闪光、呼吸弹跳；④小店去掉所有展示文字：说明卡 → 只在桌面显示一个圆形眼睛按钮（触屏用触控板上的眼睛键 / 点模型），检视器去掉编号/标题/描述/规格/「打印用色」/操作提示，控制改为纯图标（复位、拆解、自动转、光线带色点），像素场景里的 OPEN/200/铜牌编号和后门「外面天黑了」去掉；`npm run fonts`。截图：`review/rev-t24/`。
- 2026-11-03 M7/M8（整合人）：`npm run fonts`（CJK 318 字）；文案微调（第二章副标题不再写"四件"——现在有 5 件）；转场连续：草地门光圈收拢 → 小店从入口门打开光圈 → 夜路 → 粉色光圈 → 果冻页从粉色打开（`?from=night`，`transition.ts` 改为内联样式，果冻页也能用）；果冻页 `?from=night` 一次性蘑菇微光（~18 s，避开拖动，找到后不再出现，彩蛋未改动）；第一章门进入判定 ±7 → ±13 px、3 格高管子前加一块单向木板（瞌睡蘑菇从下面跑过）；第二章：冰箱贴说明卡不再盖住另一块（小猪卡在左、小猫卡在右）、每个视口单独清深度（两块磁贴视口重叠）、模型加载后立即预编译着色器（No.01 在标题卡期间就编译好）、竖屏冰箱贴视口 ×1.3；标题卡副标题 `text-wrap: balance`；`vite.config.ts` 原生加载器警告清除（`"type": "module"`、`.ts` 扩展名、`import.meta.dirname`）；新增 `tools/check-pages.mjs`；部署到公开仓库。
- 2026-11-03 M0：建立 `src/shared/*` 与 `src/shared/pixel/*` 初版 API；果冻页移到 `/jelly/`；`dist/` 停止跟踪；部署加闸门；GLB 管线与 4 个模型。

## 10. v02 番外（分支 `v02-extras`，未合入 master、未部署；线上仍是 v01）

规格：`smartlotus/jelly-gift-ideas` → `designs/v02/{sky,ar,coop}.md`。三个独立新页面（没有接进 flow.ts 的四章旅程，合入 v02 时再决定入口）：

| 页面 | 入口文件 | 要点 |
|---|---|---|
| `/sky/` 真实星空 | `src/stages/sky/{config,astro,main}.ts` | **日期/城市/钟点全在 `config.ts`（占位，待用户确认）**。星表 `data/stars.json`（HYG 派生、mag ≤ 6、5044 颗，`tools/sky/gen.mjs` 从 d3-celestial 数据生成）+ IAU 连线；astronomy-engine（打包）算岁差/章动/大气折射/月亮/行星；「下一次同样的星空」= `astro.recur()` 逐日搜索 300 年（结果缓存 localStorage）。`tools/sky/check.ts` 用另一条 astronomy-engine 路径交叉验证地平坐标。dev：`?day=1`、`?still` |
| `/ar/` AR 手办 | `src/stages/ar/*`、`src/shared/ar.ts` | iOS：`public/models/{figure-pig,figure-cat,pair}.usdz`（`tools/models/export_usdz.py`，Blender，实物 mm 尺寸、Y-up、底面落地），`rel="ar"` Quick Look；安卓：WebXR hit-test（`xr.ts`）；都不支持则隐藏按钮只做转台。小店检视器多了 AR 图标（仅人偶 + 情侣件）。dev：`?m=pair`、`?ar=force` |
| `/coop/` 双手机合作关 | `src/stages/coop/*`、`src/shared/pixel/pig.ts` | 主机（小猪，左手机）权威：60 Hz 模拟、30 Hz 快照；客机（小猫）发手柄。信令：offer/answer 压缩成 URL 二维码（系统相机扫 offer 直接打开客机页；主机页内扫回码，或用系统相机打开回码 URL → BroadcastChannel/storage 回传给原标签页）。一部手机模式（左右分键）。dev：`?solo`、`?preview`（两部手机并排画在一个屏幕上）、`?at=wall|end`、`?auto`。检查：`npx tsx tools/coop-sim.ts`（谜题逻辑）、`tools/coop-net-test.ts`（Node + node-datachannel 验证信令/通道）、`tools/coop-rtc.mjs`（两页真浏览器，**本机 Chrome 策略禁 UDP，需在普通机器上跑**） |

截图：`review/v02/`；脚本 `node tools/v02-shots.mjs <base> 'path|out.png|waitMs|WxH' …`。本地预览：`npm run build && node tools/serve.mjs dist 8800` → `http://localhost:8800/sky/`、`/ar/`、`/coop/`（手机同 Wi-Fi 访问需 HTTPS 才能用相机/陀螺仪/WebXR：可用 `npx vite --host` + 自签证书，或部署到预览仓库）。

### v02 extras — motion, live sky, jelly gravity (2026-11-03)
- **/sky/**：默认 = 长春此刻的实时星空（地球自转每帧、日月行星每 2 s 重算，平滑插值），太阳高度决定天色（白天 / 民用·航海·天文晨昏），「隐去日光」0.8 s 过渡；「此刻 / 第 1 天 / 第 200 天」三视图连续形变；「下一次同样的星空」对三个时刻都在浏览器里现算（此刻视图跨日才重算）。dev：`?at=YYYY-MM-DDTHH:MM`（固定时刻）、`?still`。
- **动效**：规格 `jelly-gift-ideas/designs/v02/motion.md`。sky 星星按星等淡入 / 数值滚入；ar 模型溶解 + 转台 expo-out、按钮外扩环；coop 大厅/配对面板依次浮现、进入关卡/连接/再来一次用草地关的像素虹膜。全部尊重 prefers-reduced-motion。
- **/jelly/ 重力感应**：`src/app/tilt.ts`（DeviceOrientation β/γ → 屏幕坐标“下”方向，低通 120 ms，前后倾相对 4 s 自适应握姿；DeviceMotion.acceleration 高通 + 死区 → 冲量，总量限幅 2.2 G，向上 ≤ 1.1 G）。Engine 每帧把额外加速度 `acc` 与侧墙 `box`（相机坐标系下、按可见宽度的盒子）传给求解器：CPU (`cpu.ts`) 与 WGSL (`gpu.wgsl.ts`，Sim uniform 464 → 512 B) 同步实现；开关关闭时与旧版完全一致。开关 `#grav`（`localStorage['jelly.gravity']`），iOS 在点按时 requestPermission，拒绝 → 复位并轻摇；无传感器（桌面 / 2 s 内无事件）隐藏。检查：`node tools/jelly-grav-check.mjs http://localhost:8811/`（`?grav` 强制显示，合成倾斜/摇晃事件）。
- **部署**（只增不改 + /jelly/）：公开仓库只新增 sky/ ar/ coop/ 及其资源、USDZ，并更新 `jelly/index.html`；/、/shop/、/night/ 的 html 与其引用的资源未动（同名资源逐字节一致）。

### v02 = 一条线的完整旅程（2026-11-03）
`/` 草地 → `/shop/` 小店（检视器 AR 按钮：iOS Quick Look；其他设备纸面溶解进 `/ar/?from=shop&m=<id>`，‹ 回 `/shop/?from=ar&ex=<id>` 同一展台自动重开检视器）→ `/night/` → `/jelly/`（蘑菇在旅程中 12 s 起每 16 s 微光；彩蛋卡片下新增「抬头 / Look up」，彩蛋原文案未改）→ `/sky/?from=jelly`（暗场连续：卡片下沉、烟花下滑、入夜 2.7 s；天空从地平线 −6° 抬到目标高度 3.6 s，星星按星等浮现；7 s 后出现「一起玩 ›」）→ `/coop/?from=sky`（淡入黑 0.9 s → 像素光圈从黑打开，直接一部手机双人；左上两部手机图标 → `?duo` 配对）→ 结局满屏爱心后 ↻ 再来 / ⌂ 从头再来（光圈 → `/?from=coop`）。
- `flow.ts`：`STAGES` = meadow, shop, night, jelly, sky, coop（`ar` 为侧室路径）；`go(to, outro, extra)`；`from`；`?stage=5|sky`、`6|coop` 可直达。`transition.ts` 新增 `dissolve(to, ms, colour)`（纸面 / 暗场溶解，同一 veil 元素，尊重 reduced-motion）。
- 过渡语言：像素章 = 像素光圈；纸面（小店检视器 ⇄ AR）= 纸色溶解 `#eeece8`；暗场（彩蛋 → 天空 → 合作关）= 经黑色慢淡。
- 检查：`node tools/journey-v02.mjs http://localhost:8811/`（彩蛋 → 天空 → 合作关 → 结局 → 草地；小店 AR → /ar/ → 回到同一展台；截图 `review/v02/journey-*.png`）。
- 草地隐藏管道（彩蛋式直达 /coop/）未做（可选）。

## v03 — 海洋番外（分支 `v03-ocean`，从 master/v02 切出）· 冷启动交接
**还原点**：tag `v01`（交付版 01）、tag `v02`（一条线旅程：草地→小店(+AR)→夜路→果冻→天空→合作关）。v03 完成后合入 master、打 tag `v03`、`GIFT_DEPLOY=1 scripts/deploy_pages.sh` 全量部署（只推 dist，不 force）。

### 目标
1. `/jelly/` 顺序改为 猪 → 猫 → 鲨（夜路被小猪抓 → 粉色反转 → 无缝落到果冻猪上）。
2. 蘑菇彩蛋按钮**只在鲨鱼**时出现；微光提示只在鲨鱼显示时运行。
3. 彩蛋后「入海 / Into the sea」→ 新像素海洋章 `/sea/` → 结尾鲨鱼游上水面看星空 → 无缝进入 `/sky/?from=sea` → `/coop/` → 结局（不变）。
4. `/sea/`：像素锤头鲨（与果冻鲨同色系：钢灰 #7d8b97 / 白腹，与草地猫/猪同一像素风格：软黑描边、闭眼腮红）。玩法：从左游到右（触屏拖动 = 跟随手指、桌面方向键；无死亡，轻洋流），依次穿过 9 个「一起看过的电影」致敬场景，鲨鱼变装/扮演经典画面，场景之间有各自风格的转场（遮罩形状）。只出现「片名 · 年份」小字（zh/en）。不用任何海报/剧照/logo/真人肖像，全部原创像素画。
5. 用户另提：`/sky/ → /coop/` 过渡太突兀——改为一个连续动作：镜头从星空慢慢降到地平线、天空逐步变暗/像素化成合作关草地的夜/晨色调，「一起玩」更柔和出现，交接无黑场+光圈的断点。

### 片目核对（已用网络确认）与场景设计（情绪弧：俏皮 → 动作 → 温柔）
| # | 片名 | 确认的影片 | 场景 · 鲨鱼的变装 / 扮演 | 转场 |
|---|---|---|---|---|
| 1 | 猫的报恩 | The Cat Returns（2002，吉卜力，森田宏幸） | 暖金黄昏的海，猫王国城堡剪影；一列"猫鱼"游行抬着小王冠；鲨鱼戴高礼帽 + 领结 + 手杖（男爵） | 圆形光圈（像素） |
| 2 | 纵横四海 | Once a Thief（1991，吴宇森；周润发/张国荣/钟楚红） | 古堡盗画：红外线网 + 金框名画 + 水晶吊灯；鲨鱼穿黑礼服，鳍端红酒杯借反光穿过红线（经典"红酒杯过红外线"），轻轻华尔兹 | 百叶窗（横条） |
| 3 | 复仇者联盟4 | Avengers: Endgame（2019） | 橙金色传送门一个个打开、剪影鱼群涌出（"Avengers assemble"）；鲨鱼鳍戴金色手套，中段"响指"：闪白 + 紫色碎屑化尘 | 传送门环扩散（火花边） |
| 4 | 釜山行 | Train to Busan（2016，延尚昊） | 高速列车（白车身蓝条，非真实涂装）在海中飞驰；鲨鱼趴在车顶，身后僵尸鱼群（灰绿、白眼）潮水般追来；鳍缠白胶带（致敬尚华缠臂） | 列车横向擦除 |
| 5 | 生化危机爆发夜 | 生化危机：爆发夜 Resident Evil（2026，扎克·克雷格；医疗快递员布莱恩在浣熊市爆发夜求生，10/5 内地上映） | 夜色浣熊市剪影 + 红色警示灯闪；红白相间伞形水母（只是伞形，无 logo）漂浮；鲨鱼戴快递帽背医疗包裹 | 方块故障（glitch tiles） |
| 6 | 杀死比尔 | Kill Bill: Vol. 1（2003，昆汀） | 青叶屋：蓝色背景 + 黑色剪影、纸窗格；剪影鱼一波波冲来；鲨鱼换黄色带黑条的战衣 + 武士刀，自动一刀两断 | 斜向刀切 |
| 7 | 神探 | Mad Detective（2007，杜琪峰/韦家辉；刘青云"看见人的内在人格"） | 镜子长廊（餐厅/厕所镜子那场）；鲨鱼身后跟着 7 个不同颜色的"内在人格"鲨影；镜子碎裂 | 碎玻璃片 |
| 8 | 爱情抓马 | The Drama（2026，A24，克里斯托弗·博格利；赞达亚/罗伯特·帕丁森；婚礼前夕的情侣秘密，高潮是失控的婚礼） | 柔粉奶油色婚礼：花拱门、串灯、香槟塔、多层蛋糕；鲨鱼戴白纱/领结走进聚光灯，蛋糕戏剧性地塌掉化成气泡（不涉及原片敏感情节） | 心形光圈 |
| 9 | 寂静人生 | Still Life（2013，乌贝托·帕索里尼；埃迪·马森饰约翰·梅） | 灰蓝安静的海、海雪缓落，相框/相册漂过；鲨鱼系一条朴素领带、速度放慢、独自游；最后许多小鱼慢慢聚拢跟随它（"孤独 → 被记得"，对应结尾墓前众灵） | 慢速抖动溶解 |
| — | 结尾 | — | 鲨鱼带着鱼群从海底游向水面，探出头看像素星空；像素夜空 → 无缝溶入真实 `/sky/?from=sea`（地平线 = 水线位置、同样暗度，sky 页以水波纹渐隐开场） | 匹配地平线 |

### 进度（截至本提交）
- ✅ `src/characters/registry.ts`：顺序 pig(01) → cat(02) → shark(03)；`jelly/index.html` 标签同序，默认猪。
- ✅ `src/main.ts`（果冻页）：蘑菇 `.shroom.off` 只在鲨鱼时显示；微光只在鲨鱼显示 6 s 后开始、每 14 s 一次；旅程中逗留时下一个标签轻微发光（`.char.nudge`）；夜路到达：粉色 `.pink-veil` 盖住加载，随后径向遮罩收拢到猪的位置并淡出（`pinkInto()`，用新 `Engine.project()` 把猪的中心投到屏幕）。
- ✅ `src/egg/egg.ts/.css`：第三个按钮改为「入海 / Into the sea」（`egg.sea`），点击后深青色潮水从下往上涨满（`.egg-water`，终色 `#0d2c3b`），卡片和火花上浮淡出 → `go('sea')`。彩蛋原文案不变。
- ✅ `src/shared/flow.ts`：STAGES = meadow, shop, night, jelly, **sea**, sky, coop（ar 为侧室）。
- ✅ `/sea/`：`sea/index.html`、`vite.config.ts` 入口；`src/stages/sea/shark.ts`（像素锤头鲨，由形状生成 → 字符画 → 描边，4 帧摆尾，`AT` = 服装锚点）、`scenes.ts`（9 个场景：各自水色/沙色、back/front 道具、dress 服装、wipe 转场类型 + 颜色；`L = 340` px/场景）、`main.ts`（PixelScreen minW 200/minH 170/maxH 640；按住拖动游向手指，松手自动向右漂，摄像机只前进；场景交界 16 px Bayer 抖动接缝 + 进入时的形状扫过转场 + 顶部「片名 / 年份」；神探 = 身后七色人格鲨影；寂静人生起小鱼逐渐跟随；结尾 6 s 视角升到水面、鲨鱼探头、像素星空，8.6 s 后 `go('sky', …, {hz})`，hz 按窗口坐标）、`style.css`（深青到达遮罩、标题）。开发参数 `?at=1..9`、`?end`、`?auto`。截图 `node tools/sea-shots.mjs 390x844|844x390` → `review/v03/sea-*.png`；旅程 `node tools/journey-v03.mjs`（果冻猪先、蘑菇隐藏 → 鲨 → 彩蛋 → 入海 → /sea/）；`node tools/sea-sky-shots.mjs`（结尾 → /sky/?from=sea）。
- ✅ `/sky/?from=sea`：前 0.6 s 用反馈把地平线对到 hz，`.sk-water` 深青水层从水线下方退去，然后照旧抬眼。
- 未做/可选：海里音效（目前 `/sea/` 不挂声音开关）；真机手感调参；场景细节可继续加（如复联「集结」的更多剪影、婚礼的人物剪影等）。
- ✅ `/sky/ → /coop/` 连续过渡：`src/shared/dawn.ts` 的 `drawDawn()` 是两页共用的像素地平线帧（夜 k=0 → 黎明 .5 → 合作关白天配色 1，分层色带 + 两排阶梯山 + 渐隐像素星）。sky 点「一起玩」（现在 9 s/4 s 后才带模糊渐显）：文字先淡出 → 视线 1.6 s 降到地平线（反馈控制让地平线落在 ~64% 高）→ 0.8 s 起逐级像素化 → 1.7 s 起抖动叠入 dawn 帧（k→.35）→ `go('coop', …, {hz})`。coop `?from=sky`：`coop/index.html` 头部内联脚本先把背景设为夜色，`dawnArrive()` 从同一帧开始把清晨走完（1.6 s）再用 Bayer 抖动溶解进正在运行的关卡（1.3 s）。无黑场、无光圈。检查脚本 `tools/sky-coop-shots.mjs`（`VW=844 VH=390` 横屏），截图 `review/v03/sky-coop-strip-land.png`。
- ✅ GIFT_PLAN mermaid 已含 `/sea/`；`npm run fonts` 已重跑；合入 master、tag `v03`、全量部署（见下）。

### 运行 / 构建 / 部署
`npm run dev`（`/jelly/` 要带结尾斜杠）· `npx tsc --noEmit -p . && npx vite build` · 本地预览 `node tools/serve.mjs dist 8811` · 截图 `node tools/v02-shots.mjs http://localhost:8811/ "sea/?lang=zh|review/v03/x.png|3000|390x844"` · 旅程检查 `node tools/journey-v02.mjs`（v03 需把 jelly→sky 段改为 jelly→sea→sky）· 部署 `GIFT_DEPLOY=1 scripts/deploy_pages.sh`（公开仓库 `smartlotus/jelly-gift` main）。提交邮箱 227950577+smartlotus@users.noreply.github.com，永不 force push。

**v03 已交付（2026-11-03）**：master `6d7a0de`（合并 v03-ocean），tag `v03`；公开仓库 `smartlotus/jelly-gift` main `5307194`。线上 /、/shop/、/night/、/jelly/、/sea/、/sky/、/coop/、/ar/ 都是 200。还原点：`v01`、`v02`、`v03`。

## v03b — 海洋细节版（分支 `v03b-sea-detail` → master，tag `v03b`）
用户反馈：「像素海洋细节不足、太空荡；鱼的形象要随电影变化；鱼要更大」+「电影角色当 NPC 与主角鱼互动」。
**还原**：上一版 = tag `v03`（`git checkout v03` 后 `GIFT_DEPLOY=1 scripts/deploy_pages.sh` 即可回滚线上）。

改动（都在 `src/stages/sea/`）：
- `shark.ts` 重写：锤头鲨约 1.8 倍（62×42 帧），8 帧游动（从头到尾逐渐增大的身体波 + 胸鳍扑动）。`FORMS` = 每部电影的造型，是精灵的一部分（随身体弯曲、带描边），另有 post 层（面纱、手杖、武士刀、酒杯、手套）：baron 猫耳+高礼帽+红领结+手杖 · thief 燕尾服+白衬衫+领结+玫瑰+红酒杯 · endgame 红金铠甲+六石手套 · busan 白胶带缠鳍+卷袖+领带 · raccoon 战术背心+红帽+包裹 · bill 黄衣黑条+武士刀 · mad 风衣+腰带+帽 · drama 花冠+长面纱 · still 素色+细领带。进场景时以 Bayer 抖动溶解 + 火花变身（0.9 s），出海面前变回 plain。
- `env.ts`（新）：远景（岩丘/海蚀拱/石柱，视差 0.22）、远处巨影（蝠鲼/鲸，0.12）、水面焦散光柱 + 水面闪光、每场景烘焙的礁石/珊瑚/贝壳/海星/沙纹（每场景一张缓存画布）、摆动的海带和海葵、水母、鱼群、浮游生物与气泡（深度视差）、前景近景水草（1.35，低矮不挡鲨鱼）。颜色都由场景的 top/bot/sand 推导；`env` 字段调密度（室内感场景如画廊/青叶屋少海带）。
- `art.ts`（新）：像素工具 + `npcFish()`（角色鱼生成器：椭圆身体、分叉尾、困眼腮红 + 配饰，2 帧，缓存）。
- `scenes.ts` 重写：L = 420 px/场景；每场景 1–3 个 NPC 和一个 **beat**（鲨鱼进度 p ≥ beat.at 时触发，几秒，无文字，不阻挡——一直游就在身后演完；`pose()` 只让漂流变慢/加速/点头）：
  1 猫的报恩：猫王坐轿游行 + 胖猫 Muta；男爵迎上来举帽鞠躬，鲨鱼回礼，火花 · 2 纵横四海：白礼服搭档 + 红裙搭档加入，三人一起在红外线里穿梭、偷走一幅画，最后绕圈跳舞 · 3 复联4：传送门依次打开，四位英雄鱼（盾、锤+披风、红金、绿巨）列队在鲨鱼身后；紫色泰坦和军团在前方——响指：白闪、化尘 · 4 釜山行：车顶上的父亲、小女孩、缠拳大块头；僵尸鱼潮涌来，小女孩躲到鲨鱼身前，鱼潮在鲨鱼身后撞散，女孩随行，父亲挥手 · 5 生化危机：警车后躲着两名幸存者（手电筒、红围巾），跟鲨鱼一起冲刺（加速），尸潮被甩在后面；探照灯、红色警报、伞形水母 · 6 杀死比尔：青叶屋里戴面具的黑衣鱼冲来被一分为二（无血）；后半段雪庭：与白和服头目对峙→一刀白闪→她鞠躬离去，红发簪飘落 · 7 神探：嫌疑鱼身边浮现七色内在人格，光圈逐个扫过，停在躲在下巴下的小黑鱼（真我），其余化泡；鲨鱼身后也拖着三个自己的影子 · 8 爱情抓马：新郎新娘在花拱下，宾客椅子、香槟塔；蛋糕倒塌、宾客四散、新人转圈，新娘抛花束——鲨鱼接住（花束留在嘴边）、爱心环绕 · 9 寂静人生：孤单的小灰鱼在照片旁，鲨鱼停在它身边，它慢慢变成金色并跟上；照片变暖，其他小鱼陆续加入；拿相册的职员鱼。
- `main.ts`：新层次顺序（水→接缝→巨影/远景→光柱→每场景生态→场景 back→跟随鱼/影子→鲨鱼（含变身）→场景 front→浮游→近景→提示→转场）；竖屏摄像机让鲨鱼在 26% 宽处、横屏 34%；竖屏游动高度 55%。开发参数新增 `?p=<0..1>`（场景内起点）和 `?beat=<秒>`（冻结该场景 beat 时间，用于截图）。
- 截图：`node tools/sea-shots.mjs 390x844` / `844x390` → `review/v03b/sea-grid.png`、`sea-grid-land.png`（每格 = 一部电影的 beat 中段）。旅程检查仍用 `tools/journey-v03.mjs`、`tools/sea-sky-shots.mjs`。
- 已知不足：无音效；NPC 在竖屏里相对较小；远处巨影很淡；真机性能未测（每帧约几千个 fillRect，静态部分已烘焙）。

## v03c — 旅行地 + 更慢更丝滑（分支 `v03c-travel` → master，tag `v03c`）
用户反馈：上浮再丝滑些；游速慢一点；电影场景过得太快看不清互动；加入一起去过的地方作为转场场景。
**还原**：上一版 = tag `v03b`（再上一版 `v03`）；`git checkout v03b && GIFT_DEPLOY=1 scripts/deploy_pages.sh` 即可回滚线上。

- **顺序（15 个场景，`main.ts` 中的 `SCENES`）**：猫的报恩 → 锦州·笔架山 → 纵横四海 → 义县·奉国寺 → 复联4 → 沈阳·故宫 → 釜山行 → 生化危机：爆发夜 → 吉林·松花湖 → 杀死比尔 → 长白山·天池 → 神探 → 爱情抓马 → 寂静人生 → 长春·南湖 → 上浮看星空 → /sky/（长春此刻的星空）。旅行地从辽西向东（锦州→义县→沈阳），坐上「釜山行」的火车去吉林（松花湖雾凇 → 雪庭的「杀死比尔」→ 长白山），最后回到长春。
- **`travel.ts`（新）**：6 个「水下望见地标」场景。`vista()`：鲨鱼进入时水线从顶部降下（离开时升回；在场景条两端也有 60 px 的缓坡，所以横屏里不会被竖直切断），水线上方是天空 + 地标（视差 0.55，离屏画布），下方是摇曳的倒影 + 水线高光；水下是本地小细节。每个场景一个 beat：锦州 = 退潮露出「天桥」、海鸥起飞（三峰岛 + 山顶小庙、沙滩、小螃蟹）· 义县 = 奉国寺大雄殿（九开间、单檐庑殿顶、台基）钟声波纹，万佛堂崖壁石窟逐个亮起，河里的鲤鱼 · 沈阳 = 大政殿（八角重檐黄琉璃绿剪边、金顶）+ 两侧十王亭，红灯笼依次亮、鸽子绕殿 · 吉林 = 冬晨松花江：远山、丰满大坝、岸边雾凇树、江面雾气、浮冰；太阳升起、雾凇闪光 · 长白山 = 夏天天池：火山口锯齿峰（残雪、绿坡）、长白瀑布；云散开、瀑布水雾里出现彩虹 · 长春 = 黄昏南湖：天际线 + 电视塔、拱桥、柳树、荷叶荷花；水面上一条小船载着像素小猫和小猪（共用草地精灵），城市亮灯、两人挥手、爱心升起。
- **节奏**：`L` 420 → 520 px/场景；按住最高速 84 → 58（-31%），松手漂流 30；beat 进行时即便按住也会被柔和限速（不低于 45%），上下操控不受影响。估算：一直按住约 11 s/场景，全程约 3 分钟；松手看约 4.5 分钟；混合正常玩约 3–3.5 分钟。
- **上浮（`startEnding/updateEnding`）**：一条三次贝塞尔曲线（先保持前进惯性再向上弯），用 Hermite 时间曲线（起速 = 当前速度，终速 0，8.5 s），身体随切线逐渐倾斜、到水面时抬头 -0.22 rad，摄像机弹簧跟随（x、y），光柱随上浮变亮，停住看星 2.2 s 后才交给 /sky/。截图条：`review/v03c/surface-strip.png`。
- 远处鲸/蝠鲼更明显（更深的颜色、不透明）。
- 截图：`node tools/sea-shots.mjs 390x844|844x390` → `review/v03c/sea-grid.png`（5×3，竖屏 15 个场景）、`sea-grid-land.png`（3×5）、`surface-strip.png`。
- 已知不足：无音效；竖屏中的 NPC 仍偏小；时长是按速度估算，未在真机计时；地标是简化剪影（按记忆中的照片形态），真机效果待看。

## v03d — 场景之间的「转换物品」+ 海里的声音（分支 `v03d-bridges` → master，tag `v03d`）
目标（接上一轮未完成的 WIP `e249e68`）：场景交界不再是一刀切/遮罩擦除，而是**一个物品把两个场景连起来**——A 场景里的一件小东西漂在鲨鱼前方，鲨鱼用鼻子顶着它穿过交界，途中以 Bayer 抖动 + 火花变成 B 场景的东西，到了 B 场景松开、它留在那里。
**还原**：上一版 = tag `v03c`（`git checkout v03c && GIFT_DEPLOY=1 scripts/deploy_pages.sh` 回滚线上）。

- **`src/stages/sea/bridges.ts`（新）**：15 个转换物品（字符画精灵，2× 场景像素，柔光晕 + 闪点让眼睛先找到它）：小果冻 → 礼物（从果冻页进海）· 男爵礼帽 → 浮标 · 珍珠贝 → 钻石 · 名画画框 → 格子窗 · 佛前油灯 → 火花环 · 宝石 → 宫灯 · 铜钱 → 车票 · 车厢 → 警车 · 绿色草药 → 雾凇枝 · 冰凌 → 武士刀 · 雪球 → 火山浮石 · 水滴 → 放大镜 · 镜子碎片 → 戒指 · 捧花 → 相片 · 相册页 → 纸船。`zh/en` 字段只是备注，**页面不显示任何文字**（守「只出现片名 · 年份」的规矩）。
- **`main.ts`**：`BR` 状态机（0 漂在交界前 120 px → 鲨鱼靠近 150 px 内时物品缓缓漂进它的泳道 → 1 顶在鼻尖、过交界时变形 → 2 交界后 120 px 松开，落到该场景的 `rest` 高度轻轻浮动）。调色板在交界两侧各 110 px 内平滑混合（远景/巨影/近景按各自视差取色，所以各层在不同时刻转色）；每个场景的 back/front 层画进离屏层，用互补的抖动坡度在交界两侧各 90 px 交叉溶解（取代 v03c 的 `clip` 硬边 + 16 px 抖动缝）；场景转场遮罩降为 28% 透明度的「呼吸」，变化主要由物品承担。
- **本轮完成 / 修复 / 优化**：
  - 性能：交界水体每帧 ~1600 次 `fillRect` + 字符串颜色运算 → 每个交界烘焙一张画布（每 2 px 一列连续混色，顺带去掉 1/24 量化造成的竖条），一次 `drawImage`；混合调色板记忆化；屏幕内没有坡度时场景层直接画、不走离屏合成。6× CPU 降速（≈中端手机）下帧间隔 **~30 ms → 16.7 ms**（`node tools/sea-perf.mjs`）。
  - 修复：`?at=N` 开发直达时，已经过去的交界物品原来 `ry = 0` 会漂到海面顶上 → 现在停在各自场景的落点。
  - 手感：物品不再从远处"瞬移"吸到鼻尖，鲨鱼靠近时它先漂进泳道（顶一下就带走）。
  - **声音（`sfx.ts`，新）**：海里第一次有声音，全部 WebAudio 合成、无文件、默认静音（顶部恢复「声音开/关」开关，和其他章共用 `gift.sound`）：会呼吸的低沉水声、游动时偶尔的气泡、每进一个场景一声柔和的玻璃铃（D 大调五声音阶，15 个场景连起来是一段慢旋律）、顶到物品时轻拨一下、变形完成时一串小闪音、上浮时水声打开、到水面一声轻溅，离开前淡出。
  - `tools/check-pages.mjs` 现在检查全部 8 个页面 + sea/sky/coop 的到达参数（全部 OK、无 console 错误）。
- **检查 / 截图**：`node tools/seam-shots.mjs 390x844|844x390` → `review/v03d/seams-grid[-land].png`（每个交界鲨鱼顶着物品的瞬间）；`node tools/bridge-strip.mjs <场景 1..15> [WxH]` → `review/v03d/strip-<N>.png`（一次穿越的时间条，`__pause/__steps` 确定性步进）；`node tools/sea-shots.mjs` 现在写到 `review/v03d/`（15 个 beat）；`node tools/sea-perf.mjs`（帧间隔）；旅程 `node tools/journey-v03.mjs`（果冻 → 彩蛋 → 入海 → /sea/，无错误）。
- **已知不足 / 下一步建议**：真机（iPhone/安卓）手感、帧率、声音音量仍未实测；竖屏 NPC 仍偏小；杀死比尔青叶屋这类不透明大布景在交界处是 90 px 抖动溶解，像素感较强（风格上可接受）；声音只在第一次触摸/按键后开始（iOS 规则），完全不碰屏幕自动漂流时保持安静。

**v03d 已交付（2026-11-03）**：master `645b4d8`（合并 v03d-bridges，PR #1），tag `v03d`；公开仓库 `smartlotus/jelly-gift` main `92521fd`。线上 8 个页面 `node tools/check-pages.mjs https://smartlotus.github.io/jelly-gift/` 全部 OK。还原点：`v01`、`v02`、`v03`、`v03b`、`v03c`、`v03d`。

## v03e — 果冻页在 iPhone 上打不开 + 全站加载过渡（分支 `v03e-jelly-fix-transitions` → master，tag `v03e`）
用户反馈（iPhone Safari 截图）：果冻页整屏只剩一片粉色；页面之间切换没有加载动画过渡。
**还原**：上一版 = tag `v03d`（`git checkout v03d && GIFT_DEPLOY=1 scripts/deploy_pages.sh /workspace/jelly/jelly-gift` 回滚线上）。

- **根因（果冻页一片粉）**：那片粉色是从夜路过来时的「到达粉幕」（`.pink-veil`，z-index 90，main.ts 一启动就盖上，等第一帧画好才收拢到小猪身上）。iOS 26 的 Safari 开始提供 `navigator.gpu`，所以页面优先走 WebGPU 路径；WebKit 的 WebGPU 在 `createComputePipelineAsync` / 多个 compute 命令缓冲在途时会**无错误地挂住**（WebKit bug 311598 等同类报告），`boot()` 永远不结束 → 粉幕永远不收。就算报错，失败提示 `.fail`（z-index 11）也被粉幕盖住。在 WebKit 无头（Playwright WPE，无 WebGPU）里 WebGL2 路径完全正常，证实问题只在 WebGPU 分支。（无法在本机跑 iOS 的 WebGPU，挂起点按上述已知 bug 推断；修法对挂起和报错两种情况都成立。）
- **修复（`src/main.ts`）**：所有 WebKit（iOS 上所有浏览器 + Safari）默认走已验证的 **WebGL2** 路径（`?backend=webgpu` 可强制试 WebGPU）；其他浏览器仍先试 WebGPU，但 adapter/device 5 s、WebGPU 初始化 12 s 超时后自动退回 WebGL2；启动失败时加载幕变成「哎呀，这一页卡住了 · 再试一次 / 跳到下一站」，永远不会白屏/粉屏。旧 `.pink-veil` 不再创建，到达的粉色由共享加载幕承担（收拢到小猪的动画不变）。
- **全站加载过渡（新，`src/shared/curtain-inline.ts` + `src/shared/curtain.ts`）**：
  - 每个页面的 `<body>` 开头由 vite 插件 `gift-curtain` **内联**一块加载幕（样式+脚本都内联，第一帧就有，不等 CSS/JS）：一只 16×13 的像素果冻小猪在上一页关上的颜色上一蹦一蹦（steps 动画 + 挤压拉伸 + 影子），下面是下一站的名字（中/英随语言）和三个像素点；重页面（小店 3D 模型、果冻网格）有像素进度条。
  - 离开：`go()` 在原有出场动画（光圈/溶解）之后调用 `cover(to)`：小猪幕在关上的颜色上淡入，颜色写进 `sessionStorage['gift.curtain']`；新页面内联脚本读到同一颜色，所以两页之间是**同一块幕、同一只小猪**，没有闪白。
  - 到达：`irisIn()` / `dissolve(0)` 先等 `curtain.gate`（`hold()` 未释放就一直等），再让幕淡出、光圈打开；没有到达动画的页面（海、从彩蛋来的星空、`?skip`）在画完两帧后自动淡出。小店 `hold()` 到 three.js + 第一个手办加载完（最多 8 s，进度条）。果冻页 `manual()`，第一帧画好后淡出（从夜路来时收拢成小猪）。
  - 安全网：揭幕前出现脚本/资源错误 → 2.5 s 后变成重试/跳过卡片；20 s 还没好 → 显示「还在努力加载…」和同样两个按钮（加载仍在继续）。`pageshow`（bfcache 返回）时立即撤掉幕和关着的光圈。`prefers-reduced-motion` 下无动画、瞬切。
- **检查 / 截图**（Playwright WebKit，iPhone 15 模拟；Playwright 装在 `/workspace/jelly/pw`，WebKit 依赖库解压在 `/opt/wk` 并加入 ldconfig）：`node tools/wk-check.mjs http://localhost:8811/ <outdir> webkit` 全部 8 页 + 两种果冻入口均揭幕、无 console 错误；`tools/wk-flow.mjs`（夜路 → 果冻 过渡帧 + 返回）；`tools/wk-fail.mjs`（模拟网格 404 → 失败卡片）。桌面 Chrome 下果冻页仍走 WebGPU（hi，23841 tets）正常。
  - `review/v03e/webkit-pages-grid.png`（上排：每页加载幕；下排：揭幕后）、`transition-night-to-jelly.png`、`transition-meadow-to-shop.png`、`webkit-jelly-1-ready.png`、`webkit-jelly-fail-card.png`。
- **已知不足**：iOS 真机需要再看一次（WebGL2 路径在真 iPhone GPU 上的帧率；加载幕中文字用系统宋体，因为 `fonts-src/` 里没有源 ttf，未重新子集化字体）。

**v03e 已交付（2026-11-04）**：master `4b7c368`（合并 v03e-jelly-fix-transitions，PR #2），tag `v03e`；公开仓库 `smartlotus/jelly-gift` main `514c0b5`。线上 8 页在 WebKit iPhone 15 模拟下全部揭幕、无 console 错误（`/workspace/jelly/pw/check.mjs https://smartlotus.github.io/jelly-gift/ <out> webkit`；本机 WPE 无可用 TLS，脚本让 node 代取线上文件）。还原点：… `v03d`、`v03e`。

## v03f — 夜路扩展成多路线小游戏（分支 `v03f-night-expansion` → master，tag `v03f`）
用户：「那个恐怖游戏可以做得更加丰富一些，流程更长一些，不是只有一条路」。夜路从一条直线改成一张有岔路、会汇合的小地图，有收集、谜题、可爱惊吓、三个结局（含隐藏结局），进度自动保存。
**还原**：上一版 = tag `v03e`（`git checkout v03e && GIFT_DEPLOY=1 scripts/deploy_pages.sh /workspace/jelly/jelly-gift`）。

### 路线图（`src/stages/night/map.ts`，节点 = 路口，边 = 可走的小路）
```
                    BUS 公交站                TREE 树屋 (隐藏)            END 死路
                  [结局:末班车]            [最佳结局: 5 张 ?? 齐]      [结局:被抓到]
                         \______________________ G2 空地 _____________________/
                                                  |  gg：大门密码锁 0503（三张纸条）
   W2 空心树 ── 小溪 w2g ─────────────────────▶ G 大门 ◀──── 隧道 tun ──── E3 隧道口
   纸条① 05__ · 猫头鹰                           ▲  (要蜡烛；中间铁栅=世界屁股日 5/2)  |
     |                                           | 花园 h3g                         E2 地穴
   W1 刻字的树（蹄印谜题）                         H3 后门                          九蜡烛谜题
     ↻ 窄小道 loop（贴纸②）                        | 锁着的门（八音盒解开）            纸条③ ___3 + 蜡烛
     |                                           H2 音乐室：柜子派对惊吓 + 八音盒     |
     |                                           H1 走廊：眨眼画像  · 楼梯贴纸③      e12 墓碑间：床单小鬼 · 贴纸④
     |                                           H0 门廊                           E1 墓园大门
      \_________ 森林 fw ________________ F 岔路口 ________________ 墓地 fe _________/
                                                  |  s：别回头木牌 · 蘑菇谜题 · ?? 一闪 · 粉方块贴纸①
                                                  S 起点
```
（贴纸⑤在隧道里；纸条②「__0_」在音乐室，八音盒解开后出现。）

### 内容
- **三条路**（森林 / 老房子 / 墓地）从岔路口分开，在大门汇合；路上任何时候可以「回头」，路口有大按钮（箭头指向那条路真实的方向），地图（摄像机风格）可以「快进」到去过的地方。
- **谜题 6 个，各不相同**：蘑菇按大小顺序（观察）· 三个树洞跟蹄印（观察）· 八音盒两段旋律照弹（记忆/听）· 九根蜡烛 Lights-Out（逻辑）· 铁栅锁「世界屁股日」5/2（我们的梗）· 大门 4 位密码「我们的第一天」0503（三条路各一张纸条拼出来）。都没有失败：错两次给提示，错很多次自动过。
- **钥匙 / 收集**：3 张纸条（门的密码）、蜡烛（没有就进不了隧道）、5 张隐藏的「??」贴纸（点一下拾取；集齐后树屋的粉灌木墙才让路）。
- **可爱惊吓**：路边一闪的 ??、火把灭两下、小猪横穿小路、画像眨眼变鬼脸、柜子里蹦出吹派对喇叭的小猪、猫头鹰眼睛、害羞的床单小鬼、隧道里一群小蝙蝠、有一段路小猪一直跟在身后（到路口就害羞跑掉）、死路的回头。
- **结局**：①死路——被追、回头、小猪贴脸 → 「抓到你啦！」；②公交站——末班车开来，司机是小猪 → 「赶上末班车！」；③隐藏：5 张贴纸齐 → 粉色小路 → 树屋，萤火虫围成心 → 「找到你啦！最好的结局是你」。三个结局都翻到粉色绘本页（显示「已发现 n/3」与贴纸提示），继续 → 共享加载幕 + 光圈 → /jelly/。
- **保存**：`localStorage['gift.night.v3']`（所在路口、纸条、蜡烛、贴纸、已解谜题、已触发的惊吓、走过的路、已见结局）。再来时开始卡片显示「上次停在：××」与「从头开始」。看完一个结局会存在空地，可以回来看其他结局。
- **声音**：全部 WebAudio 合成，沿用全站声音开关（默认静音）：每个区域一种氛围底噪（森林虫鸣风声、屋里低沉吱呀和钟表滴答、墓地低风和猫头鹰「咕咕」、隧道滴水、公交引擎）+ 各种惊吓/拾取音效。
- **操作（iPhone 竖屏优先）**：按住屏幕前进、拖动环顾、点 ?? 拾取；12 s 不动会自己慢慢走；键盘 W/↑ 前进、1–4 选路、M 地图、B 回头。
- **性能**：体素世界按 16×16 区块异步网格化（加载幕显示进度），每帧只渲染镜头附近区块；只有火把 + 最近的一盏灯两个点光源；萤火虫只更新镜头附近的。

### 开发参数
`?at=<节点>`（S F W1 W2 H0–H3 E1–E3 G G2 BUS END TREE；`kawaii`/`chase`/`caught` 仍可用）· `&give=1`（纸条+蜡烛+谜题）/ `&give=all`（再加 5 张贴纸）· `&fresh=1` 清进度 · `&skip=1` 跳开始卡 · `&dev` 显示 fps/位置/draw calls。`window.__night` 测试钩子。
### 测试
`tools/wk-night.mjs <base> <outdir> <forest|house|grave|full|ends> [look]`（Playwright WebKit，iPhone 15 模拟）：自动按住前进、解谜、转头点贴纸、选路、用地图快进，走完三条路 + 三个结局。WebKit 启动需要 `GIO_USE_PROXY_RESOLVER=dummy GSETTINGS_BACKEND=memory`（已写进各脚本；没有它网络进程因缺少 gnome proxy schema 崩溃，所有页面加载报 internal error）。

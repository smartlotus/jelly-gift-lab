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
- ⏳ TODO `/sea/`：`sea/index.html` + `vite.config.ts` 入口 + `src/stages/sea/{main.ts, shark.ts, scenes.ts, fx.ts, dict.ts, style.css}`（计划：PixelScreen minW 192 / minH 160 / maxH 240；`?at=<0..9>` 直达场景、`window.__pause/__steps` 截图；到达 `from=jelly` 时从 `#0d2c3b` 溶解进入、鲨鱼从上方潜入；结尾 `go('sky', …, { hz: <水线比例> })`）。
- ⏳ TODO `/sky/?from=sea`：按 `hz` 让地平线落在相同屏幕高度，下半屏水波纹叠层渐隐，星星照常按星等浮现。
- ⏳ TODO `/sky/ → /coop/` 连续过渡（见目标 5）。
- ⏳ TODO 文档：GIFT_PLAN mermaid 加 `/sea/`；`npm run fonts`（新中文）；截图 `review/v03/`；合入 master、tag v03、部署、确认 200。

### 运行 / 构建 / 部署
`npm run dev`（`/jelly/` 要带结尾斜杠）· `npx tsc --noEmit -p . && npx vite build` · 本地预览 `node tools/serve.mjs dist 8811` · 截图 `node tools/v02-shots.mjs http://localhost:8811/ "sea/?lang=zh|review/v03/x.png|3000|390x844"` · 旅程检查 `node tools/journey-v02.mjs`（v03 需把 jelly→sky 段改为 jelly→sea→sky）· 部署 `GIFT_DEPLOY=1 scripts/deploy_pages.sh`（公开仓库 `smartlotus/jelly-gift` main）。提交邮箱 227950577+smartlotus@users.noreply.github.com，永不 force push。

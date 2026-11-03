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

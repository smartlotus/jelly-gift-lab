# 工作流 B · 小店 + 3D（M3, M4）

> 只有工作流 B 编辑本文件。文件归属见 GIFT_PLAN.md §9。

## 状态
- ✅ M3 3D 查看器、✅ M4 像素小店 + 展台集成 + 后门（第一版完成，可玩、可构建）。剩下的是打磨（见"下一步"）。
- 开发直达：`/shop/?skip`（跳过标题卡）、`/shop/?viewer`（直接进入检视模式，可 ‹ › 浏览 4 件）、`?at=pig|cat|fridge|counter|door`（猫的出生点）、`?lang=zh|en`。

## 已完成
- `src/stages/shop/world.ts`：整间店的像素美术，一次性预渲染成 1120×192 的背景（奶油条纹墙纸 + 护墙板 + 木地板 + 粉色地毯、粉色吊灯 + Bayer 抖动光锥、左侧入口门（门玻璃里是第一章的蓝天绿地）+ OPEN 牌 + 门铃、♥200 挂牌、盆栽、两个白色展台（黄铜牌 01/02）、墙上小猫/小猪像素肖像、小边桌插花、**粉色复古双门冰箱**（拍立得 + 两个 3D 冰箱贴锚点）、黄昏窗（预告夜晚）、收银台 + 收银机 + 罐子架、**深色后门**（门缝冷光闪烁））。每帧动态：灯泡呼吸、光里的浮尘、后门冷光、加载细线、靠近后门时灯闪两下。3×5 像素字体 `text()`。
- `src/stages/shop/viewer.ts`（three.js，动态 import，独立 chunk）：一个全屏透明 WebGL 画布；每个可见展品用 scissor 视口渲染在像素锚点上（随镜头滚动，手办慢慢转、冰箱贴轻轻摆）。模型统一归一化到半径 1、以底面中心为枢轴。
  - 光照：NeutralToneMapping + RoomEnvironment PMREM + 暖色主光（PCF 软阴影，手机 1024 / 桌面 2048）+ 粉色轮廓光；ShadowMaterial 真阴影 + 径向渐变接触阴影（冰箱贴的阴影投在冰箱门上）。
  - 材质：每个颜色零件一个 MeshPhysicalMaterial（哑光 PLA：roughness .62、淡 sheen；金属件 .36/.55），`onBeforeCompile` 注入 **0.2 mm 打印层纹**（按打印方向，fwidth 抗锯齿，只有放大时才出现）。
  - 检视模式：视口从展台平滑放大到全屏；OrbitControls（拖动旋转、滚轮/双指缩放、阻尼、俯仰限制、禁平移）；3.8 s 无操作自动转；双击/双点复位（带缓动，转到 3/4 英雄角度）；单击 = 果冻 Q 弹（以底面为枢轴的弹簧挤压）；**分色拆解**（手办沿质心径向散开，冰箱贴按层叠方向抬起并自动转到 3/4 角度）；**单色查看**（色点 → 其他零件变成 10% 幽灵）；**灯光**三档（影棚 / 窗边 / 傍晚）。
- `src/stages/shop/ui.ts`：靠近展品的说明卡（编号、标题、一句话、类型 · 尺寸 · 颜色数、「看看 →」），横屏放在模型旁边、竖屏放在舞台下方；检视界面（左上标题块、右上关闭、底部：色名 + 色点、细线胶囊按钮 ‹ 复位 · 分色拆解 · 自动转 · 灯光 ›、操作提示 5 s 后淡出）。键盘：Esc/E/Enter/X 关闭，←/→ 浏览，R 复位，S/空格 拆解，L 灯光。
- `src/stages/shop/main.ts`：图层（像素背景 → 检视底板 → 3D → 像素前景(猫) → UI）；猫用 A 的最终精灵（`catFrame`，靠近展品时 look/happy + "!!"，进后门用背影帧）；进店自动走两步 + 门铃；按距离懒加载 GLB（No.01 开场即加载）；点模型 / B 键 / E 打开检视；检视时像素世界模糊、猫与触屏键隐藏、输入锁定；靠近后门："外面天黑了。" + 灯闪 + prefetch；进门 → 光圈收拢 → `go('night')`。竖屏时舞台上移，舞台上下用天花板/地板色填满。
- **No.05 情侣拼合**（收银台上的奶油色矮台 + 黄铜牌 05）：`public/models/pair-{pig,cat}.glb`（`ONLY="pair-pig pair-cat" TRIS=70000 tools/models/compress.sh`，各 ~330 KB），查看器里拼成一组（猫 +60.8493 mm X）。平时两件分开，猫走近时慢慢滑到一起，合上时"咔哒"Q 弹 + 叮；检视里"分开"按钮。
- `src/stages/shop/exhibits.ts`：5 件展品数据（尺寸/零件数来自 3D 仓库 README v5 §4）+ 全部料色表（中英名、HEX）。
- `src/stages/shop/dict.ts`：中英文案（新增的中文字在 M7 `npm run fonts` 前会回退系统宋体）。
- 截图：`review/stage2-shop/desk-pig.jpg`、`desk-inspect.jpg`、`phone-fridge.jpg`。

## 进行中 / 下一步（打磨，按优先级）
1. 真机检查：iPhone 上检视模式双指缩放 / 双击复位手感；模型在小屏展台上是否够大（`exhibits.ts` 的 `box`）。
2. 显示模式下模型首次出现时的着色器编译小卡顿（可在标题卡期间预编译）。
3. No.05 情侣拼合台只做了代码 + GLB，未截图验证（猫在 +X 60.8493 mm，已按 OBJ 包围盒核对：猪 x∈[-29.9, 35.9]、猫 x∈[-30.9, 31.0]）。

## 对共享代码的需求（给整合人 / 其他工作流）
- 无。只读使用 `shared/pixel`（PixelScreen、startLoop、input、mountTouch、tiles、Camera、catSprites/catFrame）、`flow`、`i18n`、`chrome`、`transition`、`audio`。
- M7：`npm run fonts`（shop/dict.ts 有新中文）。

## 已知问题
- 无头 SwiftShader 下 3D 很慢（截图要等 ~10 s）；真机正常。
- 冰箱上两块磁贴的说明卡在横屏时可能盖住另一块磁贴。

# Story edition — intent and beat table

A single walk through two hundred days, and a glimpse of two thousand. The cat (and later the pig with her) moves through places they already share: the flowers he will give her, the mushrooms she loves, the things he made, a playful night, the jelly they can poke, the sea and the Changchun sky, a game they play together, and a house they might one day fill.

There are no chapter title cards. Lines are short, spoken in the scene, and fade on their own. Existing tunings stay: the shop door still says 「外面天黑了。」, night keeps its map and back, the pink iris into jelly, the sea and sky handoffs, coop’s 「往前走走」.

## Flower identity (researched)

The name **云南紫精灵** is a market nickname, not a unique Latin species. Public pages that can be opened today do **not** agree on one plant, so this edition renders the variety that Yunnan/斗南 wholesale listings actually sell under that name.

| Name | What public sources say | Exact URLs opened this pass | How we draw it |
| --- | --- | --- | --- |
| 云南紫精灵 | The strongest current wholesale match is a **carnation** (康乃馨), English listing “Carnations-purple fariy / purple fairy”, colour **白底紫边** (white base, purple edge), sold from 昆明斗南. 花礼网 also lists “紫精灵康乃馨” as a bouquet material, which treats it as a carnation rather than 洋桔梗. A separate, unverified older claim that florists used 紫精灵 for a purple lisianthus was not matched to an openable URL in this pass (the previously cited 陌上花卉 2014 thread has no recoverable link here), so that reading is **not** used. 紫精灵 also appears as an unrelated hardy 月季 nickname on some garden pages; that is not the 斗南 cut-flower listing. | http://x7hh.com/pro_show.php?id=157 (紫精灵 · Carnations-purple fariy · 颜色：白底紫边 · 斗南金河花卉); http://www.x7hh.com/goodsgm.php?id=157 (Carnations-purple fariy Grade B); http://www.x7hh.com/pricehuac.php?id=7 (斗南康乃馨价目，含紫精灵); https://www.hua.com/product/9012869.html (花礼网花材表含“紫精灵康乃馨4枝”) | Ruffled picotee carnation: cream/white petals with a purple rim and a bulbous green calyx. Not a solid-violet lisianthus, not hydrangea, not campanula. |
| 戴安娜粉玫瑰 | The common **Chinese cut rose “戴安娜”**, a bright pink (亮粉色) high-centred variety widely grown in Yunnan: many petals, outer petals shorter, inner gradually longer, 高心卷边, large upright head. Flower language on that page: 初恋. Distinct from the English garden rose *Rosa* ‘Diana, Princess of Wales’ (creamy-white edged pink). | https://www.hua.com/huayu/14144.html 《常用的鲜切花——戴安娜》, 花礼网, 2016/1/15 | Layered spiral, pointed high centre, recurved outer petals, princess pink — not a triangle or closed bud |

Double purple lisianthus morphology (for contrast only, **not** used as 紫精灵): https://www.miaoyewang.com/baike/show-8674.html (苗业网：重瓣洋桔梗 10–20 瓣，开放后像月季).

No other flower species appear in the woods.

## Order

**Required (t23u, supersedes earlier flower-before-shop and optional-night plans):**

`meadow → shop → night → jelly → sea → sky → coop → flower → mushroom → empty-house discovery → spatial furnish → fixed independent future film`

AR remains a side path from the shop and always returns to the shop (`go('shop')`). Night is **on the mainline** (do not skip it via a lit shop exit). Night’s internal map and “turn back” stay inside the night; every night ending goes to jelly. Jelly has a clear 入海 control outside the mushroom egg (the egg is optional). The 200-day film on `/sky/` is optional. Coop’s 「往前走走」 continues into the flower wood along an open path (not a cottage, not `/home/`). Flower → mushroom keeps the canvas/iris handoff. The mushroom grove ends at a warm **home cottage** window, then the empty house, then spatial decorate. Save starts a cinematic whose furniture and blocking never read the saved layout. Home “再看一遍” replays only that film; “从头再来” returns to the meadow. Progress still uses `gift.progress` for the discreet continue affordance.

**Implementation note (2026-11-07):** the committed router on this branch has **not** been fully retargeted yet. `src/shared/flow.ts` `STAGES`, `curtain-inline.ts` `NEXT`, and several `go(...)` calls still follow the old live order plus leftover optional-night experiments. See [`AI_HANDOFF.md`](../AI_HANDOFF.md). Do not treat that mixed code as the desired sequence.

## Beat table

| # | Place | When it is said | 中文 | English | What it does |
| --- | --- | --- | --- | --- | --- |
| 1 | meadow | After the heart fountain line, near the door | 这些花瓣好像在请我们再往前走走。 | These petals seem to be asking us to keep walking. | Invitation. A few 紫精灵 / 戴安娜 petals blow toward the exit (the bouquet waiting ahead). |
| 2 | flower | Shortly after entering | 紫精灵和戴安娜……好像专门开给我们看的。 | The 紫精灵 carnations and the Dianas… as if they opened just for us. | Names the real bouquet, living here. |
| 3 | flower | Near the arch | 林子深处开始亮起来了。 | Something is beginning to glow deeper in the woods. | Motivates the mushroom chapter; a first cap may glow by the arch. |
| 4 | mushroom | Shortly after entering | 天暗了下来。这些蘑菇，一盏一盏的。 | It’s gotten dark. The mushrooms are lighting the way, one by one. | Her other love; dusk. Distinct from the flower wood. |
| 5 | mushroom | Near the arch | *(copy TBD — must not say “your little shop”; grove end is the home cottage under t23. Do not invent a second title card that duplicates `home.found`.)* | *(TBD)* | Hands off to the empty house. Current `story.mushroom.out` still says 「前面有灯。是你的小店。」 and must be rewritten when routing is retargeted. |
| 6 | shop | Shortly after arriving | 你做的那些，都还在这儿。 | Everything you made is still here. | Handmade keepsakes. Existing inspect / AR side path unchanged. |
| 7 | ar | After the table appears | 放到桌上看看……看完我们再回去。 | Let’s set them on the table… then we’ll go back. | Side route; back button still `go('shop')`. |
| 8 | shop dark door | When the cat nears the dark rear door (proximity, not a title card) | 外面天黑了。 | It’s dark outside. | Short whisper, kept verbatim. The dark door is the **mainline** night path. Do not add a neighbouring lit doorway that skips night. |
| 9 | night | Shortly after the path opens | 牵着手走吧，这条夜路我陪你。 | Let’s walk it together. I’ll stay with you on this night path. | Shared challenge, not a jump scare dumped on her alone. |
| 10 | jelly | Shortly after the pink arrival | 到这儿就安心了。要不要玩一会儿？ | It’s safe here. Want to play for a bit? | Relief and play after the night. |
| 11 | sea | Shortly after entering the water | 那些一起看过的海，还记得吗。 | The seas we watched together — do you still remember? | Shared films and places. |
| 12 | sky | Shortly after the sky appears | 长春的天空。两百天，也都在这上面。 | The sky over Changchun. Two hundred days are up there too. | Real sky + the 200-day film already on this page. |
| 13 | coop | When the meadow-for-two is ready | 要不要一起再玩一回？ | Want to play a round together? | They play as themselves. |
| 14 | coop win | Existing button | 往前走走 | Keep walking | The path is not finished. |
| 15 | home · find | When they stop at the house | 这里有一间空房子诶，我们可以布置一下 | There’s an empty house — we could furnish it a little. | Exact user line. |
| 16 | home · save | On 保存布局 — leaves the spatial room and starts the fixed film | 也许有一天，也许会是第 2000 天，我们已经拥有了一个自己的家。 | Maybe one day, maybe on day 2000, we already have a home of our own. | Exact user line. |
| 17 | home · finale | After the sunrise | 我们已经有属于自己的两百天了，我想第两千天可能也并不遥远吧。我的小臭猫。 | We already have two hundred days of our own. I don’t think day two thousand is that far away. My little stinky cat. | Exact user line. |

Visual connective cues (not extra species): petals of the two bouquet flowers may drift in the meadow toward the shop door. After coop, pig and cat walk the same way into the flower wood. On **both** flower and mushroom paths a small pig **follows the cat continuously** (walking frames, same grounded path and gap, no overlapping or trapping, coherent facing) — not an entrance send-off and not waiting at the exit. The flower wood may gradually dusken with the first glowing mushrooms near its exit. The mushroom grove ends at a warm home-cottage window, not a shop window. Sea and sky are remembered views — they do not turn the couple into a shark.

## Optional paths (no dead ends)

- Night is **not** optional on the mainline. Full night gameplay and the pastel pink-circle ending into jelly stay as they were.
- AR is a side room from the shop and always returns to the shop.
- The 200-day film on `/sky/` is optional; the path continues to coop without watching it.
- The jelly mushroom egg is optional; 入海 on the jelly page is the mainline way into the sea.
- Home decorating is a spatial room (Module A). Save leaves that game and plays a fixed cinematic (Module B) whose furniture and blocking never read the saved layout. An empty save still continues. 「继续布置」 returns to the saved spatial room; 「再看一遍」 replays only the film.

There are no new chapter title cards. The pig loading curtain still appears only if a page takes longer than 700 ms. Outgoing colour and canvas are handed to the next page so hops are not a flat flash. Music fades out and in across page loads — a single uninterrupted AudioContext cannot span this multi-page app.

## Progress, back, re-entry

- `gift.progress` still records the furthest stage for the existing quiet continue pill.
- Night map / turn-back stay inside `/night/`.
- AR always returns to `/shop/`.
- Home “从头再来” → meadow (full story again). “再看一遍” → montage only.
- All `go()` targets use relative URLs from `src/shared/flow.ts`. Nothing should hardcode `smartlotus.github.io/jelly-gift`.

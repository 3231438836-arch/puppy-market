# CUSTOMER_001 实际实现与验收

## 已实现

- 独立罗伯罗夫斯基仓鼠精灵：沙棕背、浅腹、眉斑、圆耳，小于吉娃娃；多口袋马甲、小记录本。四向三帧、检查、两帧伸手、排队待机。导航碰撞/顾客间距沿用现有尺寸，交互范围 56 世界像素，右下大按钮，避免小视觉尺寸缩小操作范围。
- 从第二天开始按权重安排到店，不固定每天来；身份和到店时刻写在原客流计划。首次高货位事件在现有面包槽验证，检查→伸手→可帮助，超时不帮则放弃本次购买并离店，归还已拿但未支付的物品，不发奖。
- 帮助后可下移面包货位，改变该槽位的可达标记和商品显示高度，不改变货架碰撞、价格、容量、总库存。以后能自行取货，不再重复首次事件。没有好感度、礼物或额外金币奖励。
- NPC 对话池字段包括 npcId、dialogueId、category、trigger、conditions、weight、cooldown、once、status、enabled、lines。普通、熟悉、特殊三类；支持来访次数、货位调整和事件标记条件；按来访和日期冷却防重复。多句对话复用既有浮层与肖像，文字逐步显示，可点全文，再点继续；关闭/跳过恢复控制。
- 普通结账无强制对话。经批准的一句结账短句有 25% 尝试概率，未满足冷却/审核条件时不显示；非模态金额反馈不阻断离店。闲聊需要靠近并主动按「交谈」，按权重选择。
- 仅开发预览异步加载草稿包；常规入口只加载 approved 包。当前没有获批的正式仓鼠台词，批准包为空，因此常规入口仍可进行角色经营互动，不会播放试读稿。开发模式有明确草稿标签。

## 数据位置与创作边界

- `content/author/customer-001.json`：已确认生活、兴趣、角色边界；未知项保持 null。
- `src/data/npcs/customer-001.json`：公开名、物种、阶段、权重、商品偏好与原型槽位、等待时间、状态标记名。
- `src/data/npcs/customer-001.dialogues.json`：作者给出的试读台词，全部 draft；另有明确作者占位反馈，不生成正式新台词。
- `src/data/npcs/customer-001.approved.json`：正常入口批准包，当前为空。作者审阅后把条目状态改 approved 并纳入批准包，重新构建；在草稿文件中改标记不会自动发布。
- `src/data/npcs/customer-001.future-events.json`：共同采购候选接口，enabled=false，guestDefinition=null。没有室友立绘、名字、物种、动机或 CUSTOMER_002。
- `content/candidates/customer001-cardboard-house.json`：候选、acquisitionCondition=null、autoAward=false；`src/art/candidates/cardboard-house-{detail,pixel}.svg` 为两份占位素材，不是已实现宿舍系统或已获得物品。

## 状态与旧存档

继续使用 `puppy-mart.shop-session.v1` 原快照，不新增关系数据库。`narrative.profiles.CUSTOMER_001` 保存：

| 需求状态 | 实际位置 |
| --- | --- |
| customer001_met | eventFlags.customer001_met |
| customer001_first_shelf_event_seen | eventFlags.customer001_first_shelf_event_seen |
| customer001_shelf_adjusted | eventFlags.customer001_shelf_adjusted |
| customer001_visit_count | visitCount |
| customer001_dialogue_history | dialogueHistory，每条记录 count / lastDay |
| customer001_last_visit_day | lastVisitDay |
| customer001_life_phase | relationshipState.life_phase = young-adult |

旧档缺少档案或历史时安全延迟创建，不清空资金、作者笔记或原角色。Visitor 的帮助、检查时间等新增字段可选；中途等待、帮助后购物和队列随同旧经营现场保存。对话开始即记录使用历史，刷新或跳过不反复播放 once 台词。生活阶段不随日期或权重自动推断改变。

## 独立预览方式

运行 `npm ci`（依赖已安装可跳过）和 `npm run dev -- --port 5191`，在运行机器打开 `http://localhost:5191/?npc-preview=001`。

预览使用单独 `puppy-mart.npc001-preview.v1` 和教程记录；准备阶段有少量初始库存，第一位计划顾客是仓鼠，仍按「开店」后自动进店，没有正式游戏手动召唤按钮。不会写正常经营、教程或名字存档。云环境的 localhost 不能直接在手机上访问；同一局域网手机可以用运行机器的局域网 IP 和端口。

首次验证：开店→等仓鼠检查并伸手→靠近面包架下侧→帮忙拿取→可先听草稿试读→帮忙取货→调整摆放位置→柜台一键结账。可在帮助后刷新验证下移仍在。

后续到店：完成当前计划其余顾客、全部离店后打烊→下一天开店，独立预览仍让首位为仓鼠，已调整后可自行购物；正常入口按权重决定到访，不保证每天出现。首次事件重验只清理预览键及相应预览教程键，不要删除正常营业记录。

## 尚未实现

真实谷物、种子、袋子和容器商品；正式仓鼠文学内容；室友角色与共同购物行为；真正宿舍收藏页、物品获得与摆放；更多肖像表情；作者工作台的通用 NPC 编辑表单。原因分别是基础商品/宿舍系统尚无、作者未定稿或超出本次最小实装。本次没有将它们伪装为完成。

不部署正式站点，不更新 gh-pages。移动浏览器自动化为 Chromium 触摸模拟，真机 iPhone Safari 与长期多日性能需另行验收。

## 已执行验证（2026-10-23）

- `npm run build` 通过，包含 `tsc --noEmit` 类型检查；保留原 Phaser 大包警告。
- 最终单元测试 12 文件、53 项通过。新增覆盖自动到店、帮助范围/幂等、库存守恒、超时离店、空架先补货、调整状态刷新和下一天继承、再次自主购买、旧字段保留、计划身份不重抽、草稿默认禁止、once/冷却/来访限制、逐句节点恢复、审批、禁用室友、候选不赠送。
- 全套 Chromium 触摸浏览器 22/22 通过；之后补上空架边界与注册 ID 检查，单元全套重跑通过，4 项仓鼠触摸用例再次通过。未把重复运行算作额外独立用例。
- 浏览器实际执行：自动进店→检查/伸手→帮助→调整→刷新→排队→结账直到仓鼠确实完成交易并离店；稍后帮助→无购买离店；多句草稿/点击全文/旋转/刷新恢复/闲聊只一次；常规入口不请求草稿包、无强制对话结账。原有移动、双指、货架、队列、打烊、手册、熟客记忆和作者工作台回归通过。
- 生产构建本机预览 HTTP 200、无未捕获页面错误；正常入口草稿网络请求 0，独立开发预览请求 1 个草稿包；正常经营存储和名字保持原值。
- 跨日货位继承和再次自主取货使用真实模型 tick / nextDay 单元验证，未冒充真机多日测试。真机 Safari、Android 和长期性能测试未执行。

开发预览修复：预览中的店长名字保存在该预览快照的 `previewManagerName`，刷新无需重填，也不覆盖正式名字。

截图：

- [实际伸手·竖屏](screenshots/final-reach-portrait.png) / [横屏](screenshots/final-reach-landscape.png)
- [仓鼠肖像和草稿·竖屏](screenshots/final-dialogue-portrait.png) / [横屏](screenshots/final-dialogue-landscape.png)
- [日常闲聊·横屏](screenshots/final-chat-landscape.png)
- [本地生产预览](screenshots/production-dialogue-portrait.png)

[完整文件清单](FILES.md)。分阶段提交保留在 `feature/customer-001`；未合并 main，未运行发布脚本，gh-pages 保持原部署提交 ac9b234。

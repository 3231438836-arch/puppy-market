# P2-01｜第一切片交付（不等于整个 Issue #2 完成）

## 基底与 PR 顺序

独立分支 `feature/p2-01-hamster-scheduling`，基于 P2-00 `e27e51b`（PR #1）。依赖未合并时，新 PR 应以 `feature/puppy-mart-evening-diary` 为 base；#1 合并后再按实际 Git 历史调整 base。不合并 main，不部署。未导入另一个开发分支的全部系统。

## 已接入

- 新游戏的第二营业日名单必含一位 CUSTOMER_001；到店顺序在生成计划时选择，不固定每日第一位。
- 后续最短回访间隔2天、权重0.35，位于角色数据配置；不会无条件每天来。计划身份、到店时间与到店标记一起保存；恢复当前营业日不重排。
- 旧版记录缺少调度元数据时，第4天未遇见的玩家保留当日计划、在下一个营业日补首次。已有来访则使用自然回访规则；旧活动测试对话可继续。
- 实际入店才记 visitCount，以真实 visitor ID 去重。打开/继续/跳过对话、刷新都不再增加次数。
- 首次真实抵达高货架时，在现有 Narrative 中开启一次求助事件；使用同一 Visitor 状态机，结束/跳过后正常拿库存、排队、一键结账、离开。事件期间模拟暂停；未结算订单不能提前正常打烊，玩家可跳过对话后继续营业。
- 仓鼠专用临时地图动画（四向/伸手）及大头肖像，复用另一个开发分支的原创临时美术，不使用兔子肖像冒充正式仓鼠。统一碰撞体保留，不因视觉较小改变寻路。
- 普通生产名单不再固定把第一位变成测试熟客；显式保存的旧 test-regular 身份、活动对话、分支记忆和作者工作台保留。原回访浏览器测试用明确的测试熟客持久化计划验证兼容，不要求正式名单继续无条件生成测试角色。

## 明确未完成/依赖

1. **首遇正式文学对白**：此前候选文本仍是 draft。`src/data/npcs/customer-001.drafts.json` 忠实保留来源，不被运行时导入；当前首遇只显示明确的「待作者填写」功能占位。没有自行扩写姓名、室友、职业、身份或故事。
2. **真实矮架翻新回访端到端**：本 PR 基底没有家具购买/安装系统，不能编造已安装状态。本批复用 Narrative 的 `ShelfAccess` 条件接口，要求 purchased、installed、goodsReachable 全部为真；默认 undefined 永远不触发。还要求已完成首遇、另一次真实到访、一次性对白标记。Issue #2 中确认的翻新原句已配置并单测；待 #4 用实际安装/库存适配该接口后，才能验收完整回访。没有给玩家添加调试开关来冒充完成条件。
3. 不包含 #3 的正式手册/收藏柜、#4 货架实例、#5 黑猫或 #6 互动家具/广告。

## 修改文件

| 路径 | 变化 |
| --- | --- |
| src/data/npcs/customer-001.json | 角色、调度、事件、功能占位与已确认翻新原句 |
| src/data/npcs/customer-001.drafts.json | 作者候选首遇草案，生产不导入 |
| src/simulation/customer-flow.ts | Arrival 可选 customerId，兼容旧计划 |
| src/simulation/narrative.ts | 在原引擎注册仓鼠；身份/活动节点/一次性条件/去重来访/首遇日期 |
| src/simulation/world.ts | 生成身份计划、实际到店记忆、真实到货架触发、对话暂停模拟 |
| src/simulation/persistence.ts | 缺少调度元数据的旧档默认下一营业日，无根版本/键变更 |
| src/simulation/scene.ts | 独立仓鼠地图纹理、伸手和只读测试观察数据 |
| src/simulation/hamster-art.ts | 原创临时仓鼠像素动画 |
| src/art/portraits/customer001.svg | 原创临时仓鼠肖像 |
| src/simulation/app.ts | 按档案肖像渲染，刚触发活动事件立即存档 |
| tests/hamster-scheduling.test.ts | 7个保底/旧档/完整经营/条件/记忆用例 |
| tests/browser/hamster.spec.ts | 320/390实际购物链路、旧档补首遇 |
| tests/browser/simulation.spec.ts、layout.spec.ts | 普通顾客交易不再假设强制测试对话 |
| tests/browser/narrative.spec.ts | 显式保留测试角色回访计划以验证旧角色兼容 |
| README.md、docs/p2-01/ | 交付范围、测试与手机截图 |

## 存档

原根 version1、`puppy-mart.shop-session.v1` 不变。可选 `flow.plan[].customerId` 与 `narrative.firstDueDays` 向后兼容；来访和事件使用既有 profile.eventFlags/dialogueFlags，不新建平行 NPC 数据库。当前计划不重新生成；未知扩展、库存、资金保留。无法识别的更高版本仍由原 readStore 保留并禁止覆盖，不应拿本 PR 较早的 schema 强行读取/覆盖另一个分支的 v2 货架档案。

## 测试方法与限制

运行 `npm ci`、`npm run dev -- --port 5173`；正常新局完成第1天→结算→宿舍→睡觉→第2天，采购/补货后开店，仓鼠按保存的计划自行出现。后续回访有概率并遵守间隔；不保证每天出现。无家具安装系统，因此此切片正常游玩不会触发翻新评价。

`npm run build`、`npm test`、`npm run test`、`npm run test:e2e -- --workers=2` 最终记录见下方。浏览器使用系统 Chromium 与模拟触屏，不能当作真机 Safari 测试。

浏览器首遇测试使用真实引擎生成的第2天计划作可复现存档（Node 内控制随机输入），随后全部经过实际帧更新、移动、取货、排队和按钮结账；多种随机输入的保底保证由单元测试覆盖。测试初版在浏览器全局把 Math.random 固定0，导致引擎不推进，已移除该测试污染；没有把浏览器流程替换成直接调用结账或瞬移 NPC。

## 最终结果

2026-10-25（Asia/Tokyo），最后固定源码的完整执行结果：

| 命令 | 结果 |
| --- | --- |
| npm run build | TypeScript + Vite通过；原 Phaser 大包提示仍在 |
| npm test | 55/55通过，12个文件 |
| npm run test | 同一脚本另一次真实执行，55/55通过 |
| npm run test:e2e -- --workers=2 | 27/27通过，约3.1分钟，无跳过/无重试 |
| git diff --check | 通过 |

初次全套25通过、2失败，原因是旧测试角色回访夹具在刷新前修改存储，被 pagehide 的自动保存覆盖。改为新文档加载前注入显式测试名单，并断言恢复出的完整名单，再执行真实购物/排队/肖像分支/结账；修复后27项全套通过，未改生产保底策略。P2-00 的24项用例也全部纳入本轮回归。

手机截图：`first-shelf-320.png`、`first-shelf-390.png`。真机 Safari未测；未宣称家具翻新端到端已通过。

完成前重新读取 Issue #2，已按作者新增“年轻、独立认真”的确认记录剧情版本；首遇仍待确认，所以生产显示明确占位。早期候选改为 superseded-draft 归档，最新首遇摘要仍是 draft，不自动加载。

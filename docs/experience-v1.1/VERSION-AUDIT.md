# 版本核查（实施前与本地验证分开）

用户反馈的线上体验不能由工作区文件存在来证实。本次开始核查时：

- GitHub开发分支 `feature/customer-001` 为 `a4cc91efa04c24d172fe54fc1bd39d26226568c1`。
- main为 `ce90da4aecb5c94b4e537897fb464930a2e5c12d`；gh-pages为 `ac9b234e1057f67d86a35776f0be051ceaed30fa`。
- 本轮体验、目录、动态条件与调度改动尚未提交或部署，不能说线上已具备这些功能。
- 此前交付 `puppy-mart-ad-preview.zip` 的修改时间为2026-10-24 00:55（日本时间）；实际检查压缩包JS，缺少“进入宿舍”“打开夜间购物目录”“切换游戏速度”“小镇来客簿”。旧包不包括本轮功能。
- Cloudflare token没有注入；没有用户实际Cloudflare站点URL、部署记录或可用授权，**无法确定线上分支、SHA、构建时间或缓存状态**。不能猜测已部署某包。

## 初始功能核查表

| 项目 | 状态 | 实际证据 / 接入点 |
|---|---|---|
| GitHub是否包含本轮升级 | 尚未实现（核查时尚未提交） | git log/status与远端ref已查询；本轮改动在工作区 |
| Cloudflare构建及线上版本 | 无法验证 | 需要实际网址、部署详情中的分支/SHA/时间，或Cloudflare只读访问 |
| 宿舍原入口 | 存在故障 | 原app楼梯仅赋值“切片暂不开放”，并没有房间切换 |
| 新宿舍 | 已实现且可触发（本地） | app.interact → experience.room → scene.applyRoom；手机视口和PC实测进入、移动、设施、刷新、返回 |
| 普通外观 | 已实现且可触发（本地） | customer-art生成216帧；scene按appearanceId选纹理；非普通角色保留独立纹理 |
| 原客流重复 | 存在故障 | startDay固定4人；tick按ID末尾1强制test-regular；购物固定前两件 |
| 新动态调度 | 核查时无法验证，修复后十日测试通过 | customer-schedule → startDay → persisted flow.plan；三种长度购物清单；独立特殊调度；见10日报告 |
| 新调度触发对向行走卡死 | 存在故障，已定位并修复 | 同格中心吸附+占位重规划导致双方等待；后到者向相邻安全通道避让，保存完整绕行路线 |
| 目录/家具仓库/布局 | 核查时无法验证完整UI | furniture-ui → app夜间阶段；核心事务单元测试已通过，浏览器验证结果另见交付说明 |
| 家具实际功能 | 已实现且可触发（本地模拟） | bread-slot实际放置 + breadOnLowShelf才让仓鼠自行取货；购买不算安装 |
| 特殊动态对话 | 已实现且可触发（本地单元测试） | world实际facts → npc-dialogues条件/优先级 → Narrative；候选稿仅草稿模式加载 |
| 旧档兼容 | 已实现且可触发（本地测试） | persistence缺省迁移：旧档不播放开场、不清空资金/设施/广告/原NPC记录 |
| 版本标识及来客簿 | 核查时尚未实现 | 后续增量接入；最终状态见IMPLEMENTATION说明 |

## 线上核对方法

新包的设置底部及 `/version.json` 应显示同一版本、构建时间、提交与dirty标识。先确认站点返回此文件，再与实际部署记录和预期提交比对；不要只看部署成功或域名可打开。Cloudflare静态直传ZIP没有Git分支绑定，应记录上传包内的清单和实际deployment ID；不能虚构Git自动部署分支。

重新上传后若仍见旧界面，先记录设置/manifest、检查是否打开旧网址或旧deployment；不要让玩家清空localStorage来解决静态资源问题。当前项目无Service Worker缓存；新包对HTML/version.json设no-cache/no-store，带哈希静态资源长期缓存。

## 旧档触发限制（不是要求清档）

当天已有flow.plan不会重新随机生成，应到下一天观察新调度；已完成的一次性事件不再触发；旧档默认开场已看过，可在设置重看；候选仓鼠改造台词保持draft，正常模式不自动播放，需在独立 `?npc-preview=001` 试读或由作者批准。来客簿迁移仅使用已有明确信息，不臆造首次见面日期。

## 用户提供实际入口后的更新

用户随后提供：

- `https://3231438836-arch.github.io/puppy-market/?v=3`：GitHub Pages。查询参数v=3不会选择开发分支。
- `https://puppy-market.3231438836.workers.dev/`：Cloudflare Workers，不是Pages域名。

本环境对GitHub Pages请求返回HTTP403；对Workers首页和version.json的代理连接均返回403 Forbidden，未取得线上正文、资源或版本清单。因此仍不能判断线上是否命中旧缓存，也不能猜测Cloudflare对应分支/SHA/构建时间。

实际读取了仓库gh-pages分支对象：部署提交`ac9b234e1057f67d86a35776f0be051ceaed30fa`的提交时间为2026-10-23 22:11:54（日本时间），提交说明明确来自源码`ce90da4aecb5c94b4e537897fb464930a2e5c12d`，入口引用`index-DokCRF__.js`。这是Git发布分支的证据，不是Cloudflare部署记录，也不能单独证明GitHub Pages此刻的服务端配置。

# 修改文件

- `src/data/ad-rewards.json`：奖励、概率、次数及空广告位配置。
- `src/ads/config.ts`：环境和配置验证。
- `src/ads/provider.ts`：独立提供者合同、未配置平台兜底。
- `src/ads/service.ts`：状态机、超时、事务及幂等发奖。
- `src/ads/reward-ledger.ts`：奖励账本、收据、验证及随机池。
- `src/ads/taptap-contract.ts`：已确认的官方关闭结果判断。
- `src/ads/development-provider.ts`：仅DEV的明确模拟界面。
- `src/ads/ui.ts`：可选奖励与状态界面。
- `src/simulation/app.ts`：主动入口、测试隔离、原子存档及用券采购。
- `src/simulation/world.ts`：奖励库存跨天保留及优惠券。
- `src/simulation/persistence.ts`：可选字段与旧档兼容。
- `src/simulation/growth-ui.ts`：补贴与营业利润分开显示。
- `tests/rewarded-ads.test.ts`、`tests/browser/rewarded-ads.spec.ts`：合同、经营及浏览器测试。
- `docs/ads/`：说明、清单和模拟截图。
- `docs/taptap/`：H5自测准备方案及评估更新。

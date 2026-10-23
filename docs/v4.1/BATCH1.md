# 第一批交付：自动客流与一键结账

完成项与技术实现见 [审计记录](AUDIT.md)。主要文件：world.ts、customer-flow.ts、persistence.ts、scene.ts、app.ts、immersive.css、tutorial.ts、data/tutorial.json、data/business.json，以及经营、教程、布局与触控测试。经营目标保留原 change 存储键，仅把显示说明改为一键收款，旧奖励不重复发放。

验证：TypeScript/Vite 构建通过；32 项单元测试通过；12 项浏览器场景通过（11 项首轮通过，一项资金断言纠正为 81 后单独重跑通过）。完整四客营业实测含刷新恢复，销售 56、已售成本 28、利润 28；教程完成可正常次日经营。无真机 Safari 实测。

[手机竖屏截图](../screenshots/v4.1-batch1-portrait.png)

本批不包含正式剧情或熟客分支。前期耐心宽松、不会因等待几秒离队；正常日四位顾客、最多三位在店。到店间隔 10–18 秒，保存随机结果；尚未扩展到不同客流规模或提前打烊。

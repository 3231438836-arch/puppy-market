# TapTap H5 自测准备方案（尚未上传）

技术栈保持 Phaser 3 + TypeScript + Vite。产物为H5网页，不因Phaser使用WebGL而改用Tap小游戏或APK方案。CLI负责开发者中心业务，运行时H5 SDK另行核对。

## 已核实

读取了官方 `@taptap/cli` 2026.10.21 随包的 taptap-cli、包体管理、素材准备 Skill；仅在 `/tmp` 解包执行，无全局安装和项目依赖变更。已运行版本、skills list、帮助与schema等只读命令。嵌入schema source_version为1.0.57，不代表账号实况。

- create-app schema支持 `package_type: h5`。
- H5 ZIP要求根目录只有一个游戏目录，示例 `game/index.html` 和 `game/assets/`，不能直接将dist文件散放ZIP根目录。
- 上传H5帮助提供 screen-orientation：0横屏、1竖屏；未确认自动方向选项。现有双布局需在真实容器验证，不通过CSS强旋转。
- H5包列表和测试二维码能力存在；必须使用真实devId/appId/包体ID，当前均未取得，不生成伪二维码。

用户随后提供的CLI总览确认：先帮助/schema、定位开发者与应用；本地上传也是写操作。创建、上传、提审不能连续自动执行。新版Skill随CLI同步，无须另外安装不匹配的第三方技能。

## 后续最小步骤

1. 取得H5 MCP/SDK初始化正文，保持现有引擎；不顺带接入登录、云存档或分析。
2. 本地为H5生成独立临时产物，验证Vite相对资源路径和ZIP目录；保留GitHub Pages现有base与流程。预计只新增独立打包脚本/说明，实际修改前根据官方规范审阅，不修改生产环境配置。
3. 用户需要后台操作时，再进行官方登录授权。读取开发者、按名称查询已有游戏，避免重复创建；schema核对权限/参数。
4. 准备实际包体、校验结果、应用范围和方向参数供用户审阅；取得该次上传授权后再上传。创建游戏若必要，先dry-run，另行确认。
5. 从真实包列表取得包体ID，读取实际测试二维码并交付；当前没有可用TapTap测试链接或二维码。
6. 真机扫码检验进入→移动→取货→补货→自动到店→排队→结账→打烊→次日→刷新；iPhone Safari及TapTap容器横竖屏、旋转、弹窗关闭、双指、仓鼠事件、待办改造均需测试。
7. 广告单独验收：真实配置后验证完整观看只发一次，提前关闭/失败/无填充不发，奖励与保存一致。真实视频尚未验证，不能以开发模拟替代。

不自动创建应用、开测试计划、上传、提交审核或上线。审核需单独读取最新资质要求，不推断H5免除任何资格；实际审核时间不作承诺。

## 存档及发布边界

平台域名与GitHub Pages的localStorage不同，不能声称自动继承存档。本轮只向后兼容同源旧字段，跨域迁移未实现。自测使用独立进度，禁止覆盖线上数据。

官方索引：
- https://developer.taptap.cn/v3/cli/
- https://developer.taptap.cn/minigameapidoc/quick-start/mcp-guide/mcp-setup/
- https://developer.taptap.cn/minigameapidoc/quick-start/mcp-guide/ad-integration-guide/
- https://developer.taptap.cn/minigameapidoc/dev/tutorial/open-capabilities/ad/rewarded-video-ad/

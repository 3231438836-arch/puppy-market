# 横竖屏与自适应 UI

基于已完成 P1 增量开发。地图、角色、库存、营业账本、教程和作者内容继续共用原实现；只增加显示偏好、布局与画布视口尺寸管理。

## 选择与设置

首次进入显示「游玩方式」：竖屏「随时随地轻松经营」，横屏「更宽视野，双手操作」。屏幕顶部「布局设置」可随时修改偏好、摇杆区域（110/120/130px）、互动按钮（68/74/78/80px）与摇杆水平位置（靠左/标准/向内）。其他重要按钮至少44px。

偏好使用独立 `puppy-mart.layout.v1`。不改写 `shop-session.v1`、教程、名字或音效设置。未知版本记录保留，不用默认偏好覆盖。

实际排布按当前视口宽高决定，监听 resize、orientationchange、visualViewport 与地图 ResizeObserver。偏好与实际方向不符时显示可关闭的旋转提示，也可按当前方向继续。不请求方向锁定、不强制全屏、不用 CSS 旋转画布。

## 显示策略

- 竖屏：顶部精简栏，下方地图、可滚动经营区与独立底部双手操作区。
- 横屏：地图占主要宽度，右侧滚动经营面板；左摇杆、右互动键。收银使用双列，仓库商品双列，笔记使用正文/翻页分栏，设置为多列。
- Phaser 使用同一 Game / Scene，以 RESIZE 和 parent-size 刷新实际画布与摄像机视口，不改变精灵比例、坐标、碰撞、库存或顾客状态。横屏首次载入时也通过真实父容器尺寸恢复画布。
- 切换时清理旧触摸指针，避免残留移动；不会调用新一天、重建模型、清除存档或重新播放教程。
- 顶部/底部及横屏左右均保留安全区；长弹窗内部滚动，退出按钮保持顶部可达。WASD、方向键和 E 保留。

## 测试

最终构建、31 项单元测试、13 项 Chromium 浏览器测试通过。新增测试覆盖：首次横屏/竖屏、独立偏好保存、按钮与摇杆尺寸、偏好不一致提示、笔记翻页后旋转、拿箱旋转继续补货、收银扫描后横竖切换再找零完成交易、刷新后偏好保持，以及画布像素/CSS 宽高比例一致。

截图来自运行中的同一项目，见本目录 `screenshots/layout-portrait.png`、`layout-landscape.png`；浏览器测试另输出横屏收银截图。

### Safari 验证边界

真实 iPhone Safari / Android 真机未接入此云环境。尝试安装 Playwright WebKit 时，官方 `cdn.playwright.dev` 与 `playwright.download.prss.microsoft.com` 下载均被网络策略拒绝（403 Domain forbidden），因此 **WebKit 用例没有执行**。未将 Chromium 设备模拟称为 Safari 测试。

已提供独立配置，配置采集可成功列出 3 项方向用例；在可下载浏览器的环境运行：

```sh
PLAYWRIGHT_BROWSERS_PATH=/tmp/puppy-webkit npx --no-install playwright install webkit
PLAYWRIGHT_BROWSERS_PATH=/tmp/puppy-webkit npx --no-install playwright test -c playwright.webkit.config.ts
```

WebKit 引擎验证仍不能代替真机。iPhone Safari 验收建议：进入并选竖屏→实际旋转→拿箱后再旋转→打开收银/笔记各旋转一次→完成交易→修改按钮尺寸→刷新确认恢复。另检查地址栏收起/展开、安全区、软键盘及双指操作。

经典模式保持原布局；本次双布局面向当前 P1 可走动经营入口。极短或分屏窗口可能需要滚动经营区/弹窗。Phaser 包体积警告仍保留。

生产子路径补充：HTTP200、首次选择、双方向有效画布、偏好修改前后营业现场一致、笔记翻页与无页面异常检查通过；正式验收截图由生产构建生成。

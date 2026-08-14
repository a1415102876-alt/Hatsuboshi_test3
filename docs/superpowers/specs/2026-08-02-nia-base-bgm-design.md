# N.I.A 基础 BGM 设计

## 目标

玩家在剧本选择页点亮 N.I.A 后，基础背景音乐切换为 N.I.A《事務所》，并在整条 N.I.A 路线中保持为普通界面的默认 BGM。

## 资源

- 来源：用户提供的《事務所》MP3。
- 项目路径：`assets/bgm/nia-office.mp3`。
- 页面只引用项目相对路径，不依赖外部磁盘路径或 CDN。

## 路由优先级

1. 小手机音乐播放器和 Live 演出音频继续拥有最高优先级，会停止游戏 BGM。
2. 课程、训练、营业、外出、休息、交流和 Live 准备等既有专属 BGM 继续覆盖基础 BGM。
3. N.I.A 剧本预览、制作人档案、N.I.A 开场、企划平板和普通育成界面使用 `nia_base`。
4. 改选“初”、返回偶像选择或离开 N.I.A 路线时恢复原有 `select` 或 `lobby`。

## 实现

- 在 `BGM_CONFIG` 中注册 `nia_base: "./assets/bgm/nia-office.mp3"`。
- 新增纯判断函数区分剧本选择面板中的当前预览，以及已确认的 N.I.A 路线。
- `updateBgm()` 在选择舞台和普通兜底分支使用该判断；专属场景分支保持原顺序。
- `renderScenarioPreview()`、`resetScenarioPreview()` 和返回担当选择时主动调用 `updateBgm()`，保证点击剧本卡片立即切歌。
- 切换继续使用现有 `bgmManager.play()` 交叉淡入淡出，不创建额外音频实例。

## 验证

- 音频资源存在且非空。
- 点亮 N.I.A 卡片会选择 `nia_base`，点亮“初”会选择 `select`。
- 已确认 N.I.A 后普通界面使用 `nia_base`。
- 训练、外出等专属 BGM 判断仍在 N.I.A 基础兜底之前。
- 既有模式选择和 N.I.A 流程测试无回归。

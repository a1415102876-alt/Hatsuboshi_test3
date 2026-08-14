# N.I.A 开场剧情设计

## 目标

玩家签署 N.I.A 合约并看完 N.I.A 标题转场后，先通过 SillyTavern 主 API 生成并播放一段独立开场剧情；剧情确认完成后再进入第一轮企划日。

## 玩家流程

```text
签署 N.I.A 合约
→ N.I.A 标题转场
→ 主 API 生成 N.I.A 开场剧情
→ 现有 VN 系统播放剧情
→ 玩家点击“进入企划日”
→ 打开 N.I.A 企划页面
```

“初”剧本、沙盒模式与 N.I.A 已进入训练后的恢复流程保持不变。

## 剧情约束

参考材料：`E:/GKMS/hnms/好感剧情/gemini-code-1782773723430.txt`。

主 API 可以补充场景、动作、心理和制作人的反应，但正文必须依次完成以下剧情锚点：

1. 制作人向咲季说明 NEXT IDOL AUDITION 及粉丝投票机制。
2. 咲季意识到必须先获得支持自己的粉丝，才能站上竞争的起跑线。
3. 咲季把吸粉、选拔与排名理解成适合自己的新战斗，并主动接受目标。
4. 佑芽登场，姐妹二人兴奋讨论 N.I.A。
5. 二人约定分别通过选拔积累粉丝，并在 FINALE 正面对决。
6. 结尾必须落在咲季与佑芽的约定以及制作人即将开始制定企划，不能提前描写选拔结果或 FINALE 胜负。

输出继续使用现有剧情文本协议，使正文能够由现有 VN 解析器播放。开场只发送一次主 API 请求，不与亚纱里企划生成合并。

## 状态模型

在 `state.nia` 中增加独立开场状态：

- `openingStatus`: `idle | generating | ready | completed | retryable_failed`
- `openingStory`: 已完成生成的正文，用于重进后恢复播放
- `openingRequest`: 当前请求的 Harness 身份信息；完成、失败或恢复后清空

`normalizeNiaState()` 负责补齐旧存档。已有 N.I.A 签约存档若没有这些字段，按 `idle` 迁移，不清除企划草案与其他 N.I.A 进度。

## 请求与播放

新增独立的 `nia_opening` Harness owner kind 和 `niaOpening` 故事节点：

1. 标题转场结束后调用 N.I.A 开场入口。
2. 入口先占用主模型通道，再持久化 `generating` 状态并发送提示词。
3. 有效最终回复写入 `openingStory`，状态变为 `ready`，随后用现有事件覆盖层和 VN 播放。
4. VN 完成按钮显示“进入企划日”。确认后写入 `completed`，清理故事节点并调用 `openNiaPrototype()`。
5. 无法连接 SillyTavern 时沿用现有提示词编辑/手工发送能力，不伪造本地剧情。

N.I.A 开场回复必须在通用回复处理器中先于普通 `opening` 分支识别，避免被结算成“初”的好感度 0 开场。

## 恢复规则

- `idle`：从签约或恢复入口发起开场生成。
- `generating` 且 Harness 请求仍有效：继续等待，不重复发送。
- `generating` 但页面已重载：转为 `retryable_failed`，通过 Harness 恢复/重试入口重新发送。
- `ready`：重新打开 VN 播放保存的 `openingStory`。
- `completed` 且训练未开始：直接打开 N.I.A 企划页面。
- `completed` 且训练已开始：进入现有 N.I.A 育成界面。

通用 `resumeOpeningIfNeeded()` 继续拒绝所有 `produceScenario === "nia"` 的存档。

## 验证

自动测试覆盖：

- N.I.A 签约转场结束后调用专用开场，而不是直接打开企划页面。
- 提示词包含六个剧情锚点和禁止提前结算的约束。
- 主 API 回复由 `niaOpening` 分支保存并进入 VN。
- 确认 VN 后才打开企划页面。
- `idle`、`ready`、`completed` 与页面重载后的恢复分流。
- N.I.A 开场不会触发“初”的好感度 0 开场或重复占用主模型通道。
- 既有场景选择、N.I.A 宿主桥接和“初”开场测试无回归。

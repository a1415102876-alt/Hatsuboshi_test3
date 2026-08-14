# N.I.A 企划确认设计

## 目标

亚纱里老师完成企划评价后，不直接进入育成。系统先返回平板的企划回执页面，让玩家检查修改后的公众印象、执行原则、企划主轴与五日安排；玩家主动确认后才开始育成。

## 流程

```text
亚纱里评价 VN 播放结束
→ 提交修改后的企划为 plan_ready / committed
→ 关闭 VN 并重新显示 N.I.A 平板
→ 玩家检查企划回执与五日计划
→ 点击“确认企划，开始育成”
→ 平板发送 niaTrainingStart
→ 宿主验证企划已提交且尚未开训
→ 进入现有 N.I.A 育成界面
```

## 状态与职责

- `completeNiaPlanReview()` 只完成企划提交、关闭 VN、显示平板和同步状态，不再调用 `startNiaTrainingFromCommittedPlan()`。
- `nia-prototype.html` 在企划回执底部提供唯一的开训按钮。
- `nia-prototype.js` 仅在 `phase === "plan_ready"` 且存在企划时启用按钮，并发送 `niaTrainingStart`。
- `app.js` 只接受当前 N.I.A iframe 发出的 `niaTrainingStart`；宿主再次验证 `planStatus === "committed"`、企划存在且训练未启动，随后调用现有开训函数并保存、同步、渲染。
- 重复点击或过期消息不会重复初始化训练。

## 验证

- 亚纱里 VN 完成后平板重新可见，训练仍为未启动。
- 修改后的完整企划和五日顺序能够显示。
- 平板按钮发送独立的 `niaTrainingStart` 消息。
- 只有合法的已提交企划能启动训练。
- 现有 N.I.A 开场、企划生成、VN 和训练回归测试继续通过。

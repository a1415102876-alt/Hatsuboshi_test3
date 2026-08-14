# 沙盒 First Live 与学生宿舍设计

## 目标

在沙盒模式的大地图中增加两个地点：

- 讲堂上方的“校内舞台”，用于当前担当的一次性 First Live 挑战。
- 食堂上方的“学生宿舍”，用于消耗时间恢复体力。

首版只建立“训练属性 -> 概率判定 -> First Live -> 失败冷却重试”的闭环，不建设可重复 Live、票房、观众、收益或场地等级系统。

## 已确认规则

### First Live

- 仅对沙盒模式当前担当开放。
- First Live 成功前可以多次挑战。
- 每次挑战消耗 3 小时。
- 只有当前时间不晚于 19:00 才能开始，确保挑战不会越过 22:00 日终。
- 失败后冷却两个完整游戏日。
- 例如第 3 天失败，第 4、5 天不可挑战，第 6 天恢复挑战。
- 失败保留 First Live 任务，不视为完成。
- 成功完成现有 `first_live_success` 任务。
- 首版成功或失败均不额外修改初星币、知名度、好感度、压力、体力或其他奖励与惩罚。

### 属性贡献与成功率

每项属性独立映射为成功贡献率：

```text
属性 < 400        -> 0%
400 <= 属性 < 500 -> 50%
500 <= 属性 < 600 -> 80%
属性 >= 600       -> 100%
```

三个属性等权：

```text
successRate = (VoRate + DaRate + ViRate) / 3
```

例如：

```text
Vo 650 -> 100%
Da 550 -> 80%
Vi 450 -> 50%

综合成功率 = 76.67%
```

确认举办后冻结属性快照、成功率和一次随机结果。AI 生成重试、页面刷新和 Recovery 不得重新抽签。

### 学生宿舍

- 每次休息消耗 2 小时。
- 只有当前时间不晚于 20:00 才能开始。
- 体力恢复 30，上限 100。
- 体力已满时禁止开始。
- 不计入训练次数或校园训练上限。
- 复用现有普通 `rest` 行动的 Harness、AI 叙事和失败恢复机制。
- 首版只加入学生宿舍入口；制作人公寓后续复用同一休息服务。

## 架构选择

采用“沙盒独立挑战状态，成功后同步现有 First Live”的方式。

不直接复用 `startFirstLive()`。现有函数属于经典育成固定最终日流程，失败也会把 `state.firstLive.completed` 标为完成，并会触发经典模式的日程、自由模式和羁绊语义。沙盒模式需要失败后冷却并重新挑战，两者不能共享同一状态机。

沙盒挑战状态是尝试、冷却和 Recovery 的权威来源。现有 `state.firstLive` 只作为成功后的兼容投影，继续供任务系统、角色公开层和已有后续功能读取。

## 地图与界面

### 校内舞台

新增地图地点：

```js
{
  id: "campus_stage",
  name: "校内舞台",
  shortLabel: "舞台",
  x: 52,
  y: 22
}
```

初始位置在讲堂上方。最终坐标可使用现有地图布局编辑器微调。

地点弹窗保留普通探索入口，并增加 First Live 专用区域：

```text
First Live 挑战

Vo  650  -> 100%
Da  550  ->  80%
Vi  450  ->  50%

综合成功率：76.7%
预计耗时：3 小时
```

按钮状态：

- `available`：举办 First Live。
- `cooldown`：禁用并显示恢复挑战的游戏日。
- `generating` 或 Recovery 未解决：禁用并引导用户先完成恢复。
- `completed`：禁用并显示 First Live 已成功。
- 当前没有担当：不显示挑战区域。
- 当前时间晚于 19:00：禁用并显示今日剩余时间不足。

点击举办后显示二次确认。确认文案必须说明：

- 当前属性和综合成功率。
- 判定结果将在确认后固定。
- 挑战消耗 3 小时。
- 失败后冷却两个完整游戏日。

确认前不得创建 attempt、抽签、推进时间、写日志或发送 AI 请求。

### 学生宿舍

新增地图地点：

```js
{
  id: "student_dormitory",
  name: "学生宿舍",
  shortLabel: "宿舍",
  x: 87,
  y: 76
}
```

初始位置在食堂上方，最终坐标同样可由地图布局编辑器微调。

地点弹窗增加“休息 2 小时”按钮，并显示：

```text
当前体力：42 / 100
休息恢复：+30
预计结束：17:30
```

## 状态结构

在 `state.sandbox` 下增加：

```ts
interface SandboxFirstLiveChallenge {
  schemaVersion: 1;
  status: "available" | "generating" | "recovery_required" | "cooldown" | "completed";
  attemptCount: number;
  lastAttemptDay: number | null;
  nextAvailableDay: number | null;
  activeAttempt: SandboxFirstLiveAttempt | null;
  history: SandboxFirstLiveAttemptReceipt[];
}

interface SandboxFirstLiveAttempt {
  attemptId: string;
  turnId: string;
  requestId: string;
  requestIds: string[];
  saveScope: string;
  sessionEpoch: string;
  attemptDay: number;
  startedAtWorldMinute: number;
  statSnapshot: {
    Vo: number;
    Da: number;
    Vi: number;
  };
  contributionRates: {
    Vo: 0 | 0.5 | 0.8 | 1;
    Da: 0 | 0.5 | 0.8 | 1;
    Vi: 0 | 0.5 | 0.8 | 1;
  };
  successRate: number;
  roll: number;
  success: boolean;
  generationPrompt: string;
  generationPromptLength: number;
  generationPromptStatus: "missing" | "captured" | "rejected";
  status: "settled" | "generating" | "recovery_required" | "completed" | "abandoned";
}

interface SandboxFirstLiveAttemptReceipt {
  attemptId: string;
  attemptDay: number;
  statSnapshot: { Vo: number; Da: number; Vi: number };
  successRate: number;
  roll: number;
  success: boolean;
  completedAt: number;
}
```

`history` 只保留最近 12 次。持久 trace 只记录 attemptId/turnId/requestId 后缀、成功率、roll、结果和状态变化，不记录 Prompt 或正文。

旧存档缺少该字段时初始化为：

```js
{
  schemaVersion: 1,
  status: state.firstLive?.success ? "completed" : "available",
  attemptCount: 0,
  lastAttemptDay: null,
  nextAvailableDay: null,
  activeAttempt: null,
  history: []
}
```

## Harness 与所有权

First Live 使用新的 Harness kind：

```text
sandbox_first_live
```

入口顺序必须是：

```text
读取并验证当前挑战条件
-> 创建 requestId / turnId
-> tryAcquirePrimaryModelChannel
-> 创建 activeTurn
-> 冻结属性和成功率
-> 抽取并保存唯一 roll
-> 推进 3 小时
-> 写入成功或失败的权威结果
-> 构建并冻结 Prompt
-> 保存 generating
-> 发送请求
```

正式 lease 必须在任何时间、随机结果、任务、日志和挑战状态写入前取得。通道被占用时，除 toast/debug rejection 外，状态和 UI 输入保持不变。

ownerKind 使用：

```text
sandbox_first_live
```

owner 只能由精确的 `requestId + channelLeaseId` 释放，旧回复或旧 lease 不能释放新 owner。

## 单请求双段叙事

沙盒 First Live 不复用经典模式的两次独立网络请求。一次 Prompt 同时请求：

```xml
<live_pre>
登台前后台剧情
</live_pre>

<live_post>
演出结束后的成功或失败剧情
</live_post>
```

约束：

- `live_pre` 只能写后台准备和登台前一刻，不提前泄露判定结果。
- `live_post` 必须服从前端冻结的成功或失败结果。
- 不得由 AI 修改属性、成功率、roll、时间、任务、奖励或冷却。
- 不得生成新选项。
- 两个区块必须同时完整存在才算有效回复。

有效回复的展示顺序：

```text
播放 live_pre
-> 玩家确认“Live 开始”
-> 播放现有担当 Live 视频
-> 视频结束
-> 播放 live_post
```

视频不存在或加载失败时跳过视频，但仍展示 `live_post`。

## Recovery

在数值和时间已经结算、正文尚未完整提交时刷新页面：

- `sandbox_first_live` 的 `settled` 或 `generating` 进入 `recovery_required`。
- 不恢复旧网络请求。
- 保留 attemptId、turnId、属性快照、成功率、roll、成功/失败结果和冻结 Prompt。
- 重新生成使用新 requestId，但保留 turnId 和 attemptId。
- 不重新推进时间、不重新抽签、不重复完成任务或写失败冷却。
- 普通关闭恢复弹窗不得视为 abandoned。
- 显式放弃叙事只放弃正文恢复，已经发生的 Live 结果仍然有效。

回复验证失败、输出截断或模型停止但没有完整双段正文时，回到 `recovery_required`，不得停在不可恢复的 failed 终态。

## 成功与失败提交

### 成功

确定性结算时写入：

```js
state.firstLive = {
  completed: true,
  success: true,
  result: sandboxResult
};
```

随后复用任务系统对 `state.firstLive.success` 的读取，完成 `first_live_success`，并刷新 `cast_first_live` 公开缓存。叙事尚未完成时，`state.sandbox.firstLiveChallenge.status` 继续保持 `generating` 或 `recovery_required`；有效正文提交或玩家显式放弃叙事恢复后才进入 `completed`。

### 失败

确定性结算时保持：

```js
state.firstLive.completed = false;
state.firstLive.success = false;
```

并写入：

```js
challenge.lastAttemptDay = attemptDay;
challenge.nextAvailableDay = attemptDay + 3;
```

叙事尚未完成时，挑战状态继续保持 `generating` 或 `recovery_required`。有效正文提交或玩家显式放弃叙事恢复后进入 `cooldown`。下一次日切或打开校内舞台时，如果当前游戏日达到 `nextAvailableDay`，将状态归一化为 `available`。

## Director 与 Storyteller

First Live Prompt 注入当前有效 Director `DailyDirection` 和与当前担当、校内舞台相关的 Pressure，作为长期关系和戏剧矛盾参考。

First Live 不执行 Storyteller 候选选择、附着或通知扫描。First Live 本身已经是重大固定事件，不能再叠加随机事件改变焦点。

有效最终回复进入 Chronicle，并提交一条 Director digest。无效、过期或 requestId/lease 门禁拒绝的回复不得写入 Chronicle 或 Director evidence。

学生宿舍休息仍按普通行动处理，可以接受合法的轻微或中等 Storyteller 附着事件。

## 学生宿舍结算复用

扩展地图设施类型：

```text
lesson | training | rest
```

休息设施调用现有普通行动 `settleAction("rest")`，但设施时间成本按类型解析：

```js
lesson/training -> 60 分钟
rest            -> 120 分钟
```

学生宿舍不受训练次数上限影响。普通行动 lease 必须在体力和时间写入前取得。AI 失败后使用现有普通行动 Recovery，不创建第二套休息状态机。

## 副作用边界

First Live 允许的副作用：

- 主模型 owner acquire/release。
- 新建并更新一个 `sandbox_first_live` Harness turn。
- 推进 180 分钟。
- 写入一次固定随机判定。
- 更新 First Live 挑战状态、任务完成状态、公开 cast 状态、日志、Chronicle 和 Director digest。

First Live 禁止的副作用：

- 重复时间推进或重复抽签。
- AI 修改权威结果。
- Storyteller 追加事件。
- 自动奖励初星币、知名度、好感度或其他数值。
- 失败时完成 First Live 任务。

学生宿舍允许的副作用仅为现有普通休息行动的体力、时间、叙事、日志和合法 Storyteller 结果。

## 测试范围

至少覆盖：

1. 属性档位边界：399、400、499、500、599、600。
2. 三项等权成功率计算。
3. 确认前无状态写入。
4. owner 被占用时不推进时间、不抽签、不清空 UI。
5. 时间 19:00 可举办，19:01 不可举办。
6. 成功完成任务并同步公开 cast 状态。
7. 失败不完成任务并正确计算两天完整冷却。
8. 第 3 天失败后第 4、5 天拒绝，第 6 天允许。
9. AI 重试、刷新恢复和旧回复不重新抽签。
10. 双段输出缺少任一标签时进入 Recovery。
11. 有效回复按 pre -> video -> post 顺序展示。
12. 视频加载失败仍展示 post。
13. First Live Prompt 包含 Director，但不包含 Storyteller 事件附加块。
14. 学生宿舍 20:00 可休息，20:01 不可休息。
15. 学生宿舍体力 +30 且不超过 100。
16. 体力已满时不消耗时间。
17. 学生宿舍休息不计入训练次数。
18. 学生宿舍休息复用普通行动 requestId/lease/Recovery 门禁。

## 首版不做

- 可重复 Live。
- 票房、观众、评价、收益和排名。
- 多场地难度。
- 自动中断或排队。
- Live 专属 Storyteller 随机事件。
- 第二担当独立 Live 状态。
- 制作人公寓休息入口。
- 不同偶像的个性化成功率公式。
- 成功或失败的额外数值奖励与惩罚。

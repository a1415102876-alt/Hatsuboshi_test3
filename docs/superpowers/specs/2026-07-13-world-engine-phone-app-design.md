# 初星世界引擎手机应用设计

日期：2026-07-13

状态：已确认设计，待实施计划

## 1. 目标

在现有小手机中新增“初星世界引擎”应用，让玩家和开发者可以确认世界引擎当前是否生效、生成了什么结构化结果，以及最近一次 Director 任务的运行状态。

该应用只读取现有 `state.freeMode.world.director` 数据。它不调用模型、不触发 Director 重算、不修改 Director 状态，也不调用 `saveState()`。

## 2. 方案选择

采用“双层档案”方案：

- 默认页面保持玩家可读的叙事表达。
- 独立“运行”页展示必要的 revision、任务状态和失败原因。
- 不采用仅玩家视角方案，因为它不足以验证 Director 是否真正运行。
- 不采用原始调试终端方案，因为完整结构字段会破坏手机应用的一致体验，并增加敏感信息泄漏风险。

## 3. 应用边界

### 3.1 允许读取

应用从 `state.freeMode.world.director` 读取：

- `enabled`
- `dirty`
- `dailyDirection`
- `pressures`
- `activeJob`
- `directorRevision`
- `chronicleRevision`
- `receipts`

必要时只读取当前游戏日期，用于判断 `dailyDirection.dayKey` 是否属于今天。

### 3.2 禁止展示或记录

以下内容不得进入手机应用 DOM、日志或调试快照：

- API Key
- Prompt 正文
- 模型原始回复全文
- 完整 `requestId`、`jobId` 或 `saveScope`
- Harness trace
- 完整 `state`

### 3.3 禁止副作用

打开应用、切换页签和点击刷新均不得：

- 发起 primary 或 secondary 模型请求
- 调用 Director 手动重算
- 修改 `activeJob`、`dirty`、revision 或 receipt
- 调用 `saveState()`
- 初始化并持久化缺失的世界引擎状态

## 4. 页面结构

应用复用现有小手机的状态栏、返回逻辑、底部导航和尺寸约束。应用内包含三个页签。

### 4.1 今日

展示当前 `dailyDirection` 的玩家可读摘要：

- 日期
- 基调 `tone`
- 推进目标 `progressTarget`
- 当前状态

状态解释：

- `dailyDirection` 缺失：显示“今日方向尚未生成”。
- `dailyDirection.dayKey` 与当前日期不一致：显示“今日方向尚未更新”，旧方向只作为历史信息，不伪装成当前方向。
- `dirty === true`：显示“发现新动向，等待日切或手动重算”。

首版不直接展示 `avoid`、`sourceRefs` 或完整 focus ID 列表，避免把内部约束和标识符暴露给玩家。

### 4.2 压力线

展示当前可观察的 `pressures`，每项包括：

- 角色或范围的可读名称
- 压力主题
- 阶段
- 强度
- `sourceSummary` 或 `dramaticNeed` 中适合玩家阅读的短摘要

首版只展示未结束且仍具有观察价值的压力：`active` 和 `suspended`。`resolved`、`dissipated`、`transformed` 结果保留在运行记录中，不混入当前压力列表。

`pressures: []` 是正常状态，显示“今日局势平稳”，不得标记为失败。

### 4.3 运行

展示用于验收和排错的有限状态：

- 是否启用
- 是否存在待处理证据
- `activeJob` 的阶段和开始时间
- `directorRevision`
- `chronicleRevision`
- 最近五条 receipt 的时间、触发原因和结果摘要
- 最近一次可重试失败的裁剪后原因

运行页不提供自动重试或手动重算按钮。现有 DEBUG 入口继续负责显式重算，避免手机应用获得新的调度职责。

## 5. 数据转换

新增一个只读的世界引擎手机视图模型转换函数。该函数接收 Director 状态和当前日期，返回渲染所需的最小对象。

```ts
interface WorldEnginePhoneViewModel {
  availability: "unavailable" | "disabled" | "ready";
  direction: {
    dayKey: string;
    isCurrentDay: boolean;
    tone: string;
    progressTarget: string;
  } | null;
  pressures: Array<{
    idSuffix: string;
    actorLabel: string;
    themeLabel: string;
    stageLabel: string;
    intensity: number;
    summary: string;
    status: "active" | "suspended";
  }>;
  runtime: {
    enabled: boolean;
    dirty: boolean;
    jobStatus: string;
    jobStartedAt: number | null;
    directorRevision: number;
    chronicleRevision: number;
    lastError: string;
    receipts: Array<{
      timestamp: number;
      triggerLabel: string;
      resultLabel: string;
    }>;
  };
}
```

转换函数的约束：

- 不修改输入对象。
- 对缺失字段、未知枚举和旧存档形状使用安全默认值。
- 对所有文本做现有 HTML 转义，并限制失败原因和摘要长度。
- 角色 ID 通过现有角色资料映射为可读名称；无法映射时显示“未知对象”，不直接暴露完整 ID。
- receipt 按时间取最近五条，不展示内部标识符。

## 6. 刷新策略

以下时机重新构建视图模型并渲染：

1. 从手机首页进入“初星世界引擎”。
2. 在应用内切换页签。
3. 点击标题栏的刷新图标。

首版不增加轮询、事件总线或状态订阅。如果 Director 在应用打开期间异步完成，用户通过刷新图标读取最新状态；再次进入应用时也会自动读取最新状态。

## 7. 现有代码接入

### 7.1 `app.js`

- 在 `phoneAppRegistry` 注册新应用。
- 在 `launchPhoneApp()` 增加世界引擎路由。
- 新增只读视图模型转换函数。
- 新增应用打开、页签切换、刷新和渲染函数。
- 打开时隐藏其他手机应用视图，并复用现有手机返回和导航规则。

### 7.2 `st.html`

- 在现有手机应用容器中增加独立世界引擎视图。
- 使用语义化按钮实现三个页签。
- 为状态、方向、压力列表、receipt 列表和空态预留明确容器。

### 7.3 `style.css`

- 采用已确认的“双层档案”视觉方向。
- 延续现有小手机的屏幕尺寸和状态栏规则。
- 使用克制的中性色、少量状态色和清晰的信息层级，不做纯开发后台风格。
- 页签和固定控件使用稳定尺寸，确保长文本换行而不改变主布局。

## 8. 错误与兼容行为

| 条件 | UI 行为 | 副作用 |
| --- | --- | --- |
| 旧存档没有 `world` 或 `director` | 显示“世界引擎尚未启用” | 无 |
| `enabled === false` | 显示已停用状态，保留可读的最近结果 | 无 |
| `dailyDirection` 缺失 | 显示方向空态 | 无 |
| `pressures` 为空 | 显示“今日局势平稳” | 无 |
| `dirty === true` | 显示等待日切或手动重算 | 无 |
| `activeJob` 正在运行 | 显示当前阶段和开始时间 | 无 |
| `activeJob.status === "retryable_failed"` | 显示裁剪后的失败原因和现有调试入口提示 | 不自动重试 |
| 未知字段或枚举 | 使用“未知”或安全默认标签 | 无 |

手机应用不创造新的 `failed` 终态语义，也不改变现有 Director 失败恢复策略。

## 9. 测试策略

### 9.1 执行级测试

- 视图模型转换不会修改输入状态。
- 旧存档、未启用状态和字段缺失可以安全转换。
- 当前与过期 `dailyDirection` 正确区分。
- `pressures: []` 生成正常空态。
- 压力筛选只保留首版允许展示的状态。
- receipt 只保留最近五条，并移除完整内部 ID。
- 长错误文本和摘要按上限裁剪。
- 打开、切页和刷新不会调用模型发送、Director 重算或保存函数。

### 9.2 路由与回归测试

- 手机首页出现“初星世界引擎”应用。
- 应用路由正确隐藏 LINE、音乐、广播部和初星圈视图。
- 返回按钮回到手机首页。
- 现有四个手机应用的打开和返回行为保持不变。

### 9.3 视觉与手工验收

- 在 390px 窄屏和现有手机最大宽度下检查三个页签。
- 验证无横向溢出、遮挡、文字裁切或固定控件位移。
- 在真实 SillyTavern 中分别验证未生成、生成中、已提交、dirty、可重试失败和空压力状态。
- 验证 DOM、控制台和手机应用文本中均无 Prompt、API Key、完整 requestId/jobId/saveScope 或完整 state。

## 10. 明确不做

- 不在手机内触发 Director 生成、重试或手动重算。
- 不修改 Director Prompt、schema、patch、调度频率或日级语义。
- 不修改主模型叙事注入。
- 不增加轮询、事件总线、队列或新持久化字段。
- 不把手机应用扩展成完整 Harness trace 或原始 JSON 浏览器。
- 不迁移或重构 LINE、音乐、广播部、初星圈。

## 11. 完成标准

1. 玩家可以从手机首页进入“初星世界引擎”。
2. “今日”“压力线”“运行”分别展示与当前 Director 状态一致的内容。
3. 旧存档和所有正常空态不会抛错。
4. 应用的所有交互均为只读，不产生模型请求、保存或 Director 状态变更。
5. 敏感字段不会进入 DOM。
6. 窄屏和现有手机尺寸下布局稳定。
7. 现有手机应用和世界引擎运行语义无回归。

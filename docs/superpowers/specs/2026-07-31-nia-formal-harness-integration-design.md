# N.I.A 第一阶段正式 Harness 接入设计

## 目标

将当前 N.I.A 原型从“可直接调用主 API 的独立测试 iframe”升级为与经典育成模式、沙盒模式共用主应用状态、存档和 Harness 事务体系的正式第三模式。

第一阶段只开放两页界面：偶像档案页与第一轮企划草案页。玩家提交草案后，主应用负责生成、校验、保存和恢复企划；页面显示正式的“企划已建立”回执，但暂不进入五日日程和营业阶段。

## 范围

### 本阶段包含

- 将启动页第三张模式卡从 Prototype 文案改为正式的“N.I.A 模式”。
- 在主应用状态中增加持久化的 `state.nia`。
- 将企划生成的主模型通道所有权、请求身份、Harness turn、错误和恢复放入 `app.js`。
- 将 `nia-prototype.html` 降为纯视图：提交玩家草案、接收状态快照、渲染当前状态。
- 继续使用现有平板档案第一页与第一轮企划草案第二页。
- 成功生成后显示正式企划回执，不进入后续原型阶段。
- 覆盖首次提交、重复提交、回复校验、失败重试、刷新恢复和聊天作用域切换。

### 本阶段不包含

- 不实现五日行动界面。
- 不开放自由行动池。
- 不实现营业、粉丝审查和轮次结算。
- 不重构经典育成或沙盒现有状态结构。
- 不复制一套 Harness 到 iframe 内。
- 不在 API 失败时生成本地伪企划。

## 已确认的后续规则

后续五日行动将严格按照企划制定的顺序逐日显示。本阶段只保存能够支持该方向的正式企划数据，不提前实现行动执行界面。

## 架构

采用“iframe 纯视图，主应用拥有状态和 Harness”的结构：

```text
nia-prototype.html
    │ niaPlanSubmit
    ▼
app.js
    ├─ state.nia
    ├─ Primary Model Channel
    ├─ state.harness.activeTurn
    ├─ requestHostPromptSend
    └─ niaStateSync
            │
            ▼
nia-prototype.html
```

`nia-prototype.html` 不再直接发送 `sendPrompt`，不创建模型通道 lease，也不持有可决定游戏进度的权威企划。`app.js` 是 N.I.A 状态和事务的唯一所有者；`st.html` 继续作为酒馆宿主执行统一的生成协议。

## 正式模式入口

- 启动页第三张卡标题改为“N.I.A 模式”，描述改为第一轮企划育成的正式说明。
- 点击入口时，主应用把当前运行模式设为 `nia`，初始化或恢复 `state.nia`，再显示 N.I.A iframe。
- 返回模式选择只关闭 iframe，不清除 `state.nia`。
- 再次进入或 iframe 完成加载后，主应用发送完整的 `niaStateSync`。
- iframe 标题、返回按钮和状态文案移除“Prototype”“测试”等临时表述。

## 状态模型

`state.nia` 使用独立 schema，并至少包含：

```js
{
  schemaVersion: 1,
  mode: "nia",
  round: 1,
  phase: "draft",
  draft: {
    goal: "",
    image: "",
    approach: ""
  },
  plan: null,
  planStatus: "idle",
  activeRequest: null,
  lastError: "",
  updatedAt: 0
}
```

`phase` 第一阶段只允许 `draft` 和 `plan_ready`。`planStatus` 只允许 `idle`、`generating`、`retryable_failed` 和 `committed`。

`activeRequest` 在生成期间保存 `requestId`、`channelLeaseId`、`turnId`、`saveScope`、`sessionEpoch` 和提交操作 ID。已提交或明确失败后清空；历史身份由 Harness trace 和已保存企划承担。

旧存档没有 `state.nia` 时，由状态规范化函数补入默认结构。无效字段必须回落到安全默认值，不能直接信任聊天元数据中的对象形状。

## iframe 消息协议

所有消息继续使用既有 `source` 命名空间，并增加明确的 N.I.A 消息类型。

### `niaViewReady`

iframe 加载完成后通知主应用。主应用回应当前状态快照。

### `niaPlanSubmit`

iframe 向主应用提交：

```js
{
  source: "hatsuboshi-produce-nia-view",
  type: "niaPlanSubmit",
  operationId: "nia-plan-operation-...",
  draft: { goal, image, approach }
}
```

iframe 不携带或生成 `requestId`、lease、turn、saveScope 或 sessionEpoch。

### `niaStateSync`

主应用向 iframe 发送可显示的状态投影：

```js
{
  source: "hatsuboshi-produce-nia-host",
  type: "niaStateSync",
  state: {
    round,
    phase,
    draft,
    plan,
    planStatus,
    lastError
  }
}
```

投影不得包含内部 lease、宿主存档作用域、sessionEpoch 或完整 Harness trace。

## 企划生成事务

1. 主应用收到 `niaPlanSubmit` 后验证消息来源、当前模式、字段长度与草案非空。
2. 若已有 N.I.A 活动请求或其他主模型 owner，占用提示通过状态同步返回，不创建第二次事务。
3. 主应用生成 `requestId` 和稳定的 N.I.A `turnId`，调用 `tryAcquirePrimaryModelChannel()` 获取真实 `channelLeaseId`。
4. 获取成功后写入 `state.nia.activeRequest`，并创建或更新 `state.harness.activeTurn`，ownerKind 固定为 `nia_plan`。
5. 主应用保存状态，再通过 `requestHostPromptSend()` 发送企划提示词，generationMode 使用现有 Harness 支持的同层生成模式。
6. 回复进入统一主模型路由后，必须匹配当前 owner、requestId、channelLeaseId、turnId、saveScope 与 sessionEpoch。
7. 解析成功后，将标准化企划写入 `state.nia.plan`，设置 `phase=plan_ready`、`planStatus=committed`，清理活动请求并释放模型通道。
8. 提交完成后调用 `saveState()`，再向 iframe 发送 `niaStateSync`。

企划提示词和解析器可以继续复用 `nia-prototype-api.js`，但调用权从 iframe 移到主应用。

## Harness 行为

- N.I.A 企划生成必须遵守当前会话全局单飞锁。
- `state.harness.activeTurn` 必须记录 N.I.A turn 的请求、lease、阶段、提示词和生成状态。
- 成功回复只允许提交一次。
- 旧 request、旧 lease、旧 saveScope、旧 sessionEpoch 或已结束 turn 的回复必须被拒绝。
- 生成中关闭 N.I.A 界面不会取消事务；重新进入时显示生成状态。
- 若宿主无法确认最终回复，保留恢复所需的 turn 和提示词信息，使用现有 Harness 恢复入口或等价的 N.I.A 恢复动作。
- N.I.A 不得绕过主模型 owner 直接向 `st.html` 发送用户伪造的 lease。

## 界面状态

### 独立预览

直接打开 `nia-prototype.html` 时允许浏览档案和编辑草案，但提交只显示“请从初扩展的 N.I.A 模式进入”，不调用 API，也不生成本地结果。

### 编辑中

显示三个草案字段和正式提交按钮。主应用同步已有草案时恢复字段值。

### 生成中

字段保持可读但禁止重复提交，状态区显示主 API 正在建立企划。关闭与重新进入不会丢失该状态。

### 可重试失败

保留原草案，显示明确错误和“重新提交企划”动作。重试必须获取新的 requestId 与 channelLeaseId，并沿用或关联同一逻辑 turn。

### 企划已建立

显示正式档案回执，包括企划主轴、公众印象、执行原则和按顺序排列的五日计划摘要。页面底部说明“正式育成行动将在后续阶段开放”，不显示现有测试用营业按钮。

## 保存与恢复

- `state.nia` 随主应用现有 `saveState()` 一起进入本地存储和宿主聊天元数据。
- 恢复状态必须经过 `normalizeNiaState()`，不能直接使用原始保存对象。
- 收到宿主角色与存档同步后，主应用重新向已打开的 iframe 推送状态。
- 切换聊天或角色导致 saveScope 改变时，旧活动请求不得提交到新作用域。
- 返回模式选择不会清除 N.I.A 状态；明确的新游戏或重置操作才可重置。

## 错误处理

- 无宿主连接：保留草案并显示正式入口提示。
- 主模型通道被占用：不修改草案，不创建活动请求，提示稍后重试。
- 发送失败：释放刚获取的 lease，将状态设为 `retryable_failed`。
- API 回复格式错误：保留原文恢复上下文，不写入企划，不生成本地兜底。
- 超时或宿主失败：记录错误并允许重新生成，不重复结算。
- iframe 重复提交同一 operationId：幂等拒绝或返回当前状态。

## 文件职责

- `index.html`：正式第三模式入口文案。
- `app.js`：N.I.A 状态、规范化、入口、消息路由、Harness 事务、存档与状态同步。
- `nia-prototype.html`：档案、草案与企划回执结构。
- `nia-prototype.js`：纯视图状态机、表单消息、状态渲染和独立预览提示。
- `nia-prototype-api.js`：纯提示词构建、解析和标准化函数。
- `st.html`：继续执行统一宿主生成协议，不增加 N.I.A 特例 lease。
- `tests/`：模式入口、消息协议、状态规范化、模型所有权、提交与恢复回归测试。

## 验证标准

- 启动页显示与育成、沙盒并列的正式 N.I.A 模式。
- iframe 源码不再包含直接 `type: 'sendPrompt'` 的企划或营业请求。
- iframe 不生成 requestId、channelLeaseId、turnId、saveScope 或 sessionEpoch。
- 企划提交必须由 `app.js` 获取真实主模型 lease，并建立 `ownerKind=nia_plan` 的 Harness turn。
- 未匹配全部请求身份的回复不能修改 `state.nia`。
- 成功企划随 `saveState()` 保存，刷新和重新进入后可恢复。
- API 失败不产生本地伪企划，并能从原草案重试。
- 关闭 iframe 不删除或中断已保存的 N.I.A 状态。
- 独立打开页面不能调用主 API。
- 经典育成、沙盒、主模型所有权、宿主桥接和 Harness 恢复测试继续通过。

## 后续阶段

下一阶段在 `plan_ready` 基础上实现五日正式育成界面。每天只显示企划中对应顺序的行动，玩家自由度放在“如何执行该行动”的 VN 选择中，而不是替换行动类型。

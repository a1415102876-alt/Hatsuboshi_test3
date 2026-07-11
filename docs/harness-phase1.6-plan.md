# Harness Phase 1.6 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为四个高风险 `legacy_main` 入口增加业务写入前的正式 ownership 门禁、执行级回归测试和无 Prompt 的 owner debug snapshot，并完成真实 SillyTavern 验收，不进入全面 Phase 2。

**Architecture:** 保留 Phase 1.5 的单一内存 owner 和精确 lease，不建立新队列。新增一个 host-aware 的入口 acquire helper：真实宿主请求在任何 pending/UI/input/log/state 写入前取得 lease；非宿主本地手动复制 fallback 不占 owner并保持旧行为。四个入口使用细分 ownerKind 便于 UI 和诊断，但 timeout 仍复用现有 `handlePrimaryModelChannelFailure()` 的 generic fallback，不新增业务状态机。

**Tech Stack:** 原生 JavaScript、SillyTavern `postMessage` 桥接、现有 VN debug overlay、Node.js `node:test`、`node:vm` 执行级测试。

---

## 0. 范围、基线与完成定义

本计划基于：

- `docs/harness-phase1.5-completion.md`
- `app.js` 当前 `tryAcquirePrimaryModelChannel()` / `requestHostPromptSend()` / `requestHostRegeneration()`
- 当前四个入口的真实实现，而不是文件名推断

本阶段只迁移：

1. `submitFreeChat()`
2. `submitIdolInteraction()`
3. `submitAiPrompt()`
4. `triggerRegeneration()` 的非 choice 通用分支

完成定义：

- 在 SillyTavern host 中，四个目标入口在任何 pending、UI、输入清空、日志和业务 state 写入前取得正式 lease。
- owner 被占用时，除 busy toast 和内存 debug rejection 记录外，输入、state、pending 和业务 UI 保持调用前状态。
- 成功 acquire 后显式透传 `channelLeaseId`，不依赖 `requestHostPromptSend()` 的 `legacy_main` 自动 acquire。
- 本地非宿主模式继续沿用当前“准备 Prompt/手动复制”行为，不因不存在宿主而被 ownership 拒绝。
- 新测试实际调用四个入口函数，并比较调用前后的 state、DOM stub 和副作用调用，不以源码字符串顺序作为主要证明。
- owner debug snapshot 不包含 Prompt、正文、输入内容或完整 requestId。
- 真实 SillyTavern 手工验收有明确清单和实际结果记录。

本阶段不承诺：

- 修复所有 `legacy_main`。
- 改变通用回复解析、timeout 业务语义或 Recovery。
- 取消宿主正在运行的请求。
- 迁移 choice prompt、choice resolution、gift、First Live、地图或委托。

## 1. 当前入口审查

### 1.1 `submitFreeChat()`

当前顺序为：读取 topic -> build Prompt -> 写 `activeStoryNode/lastPrompt/lastStory` -> `saveState()` -> 关闭输入 overlay -> 写 pending -> 打开 waiting UI -> transport acquire。

风险：通道已占用时，闲聊 state 已保存、输入 overlay 已关闭、waiting UI 已打开。

Phase 1.6 顺序：读取并校验 topic -> 只读 build Prompt -> 创建 requestId -> 正式 acquire -> 原有 state/UI/save -> 显式 lease 发送。Prompt builder 不写 state，放在 acquire 前可避免 builder 抛错后占住 lease。

### 1.2 `submitIdolInteraction()`

当前校验逻辑应保留。有效提交目前在 transport acquire 前写 `activeStoryNode`、Prompt、story、save、overlay 和 pending。

Phase 1.6 顺序：读取模式/选择/plot并完成现有校验 -> 只读 build Prompt -> 创建 requestId -> acquire -> 原有写入和发送。无效表单仍可显示原验证提示，不进入 ownership。

### 1.3 `submitAiPrompt()`

当前在 transport acquire 前写 `lastPrompt`、save、关闭编辑 overlay 和 pending。函数还有 phonechat 分支。

Phase 1.6 分类：

- `state.activeStoryNode?.type === "phonechat"`：使用 `phone_chat` ownerKind，显式 lease 交给 `sendPhoneChatPromptToHost()`，保留现有手机失败/重试语义。
- 其他情况：使用 `manual_prompt` ownerKind，显式 lease 交给 `requestHostPromptSend()`。

两类都必须在 `state.lastPrompt` 和 overlay/pending 写入前 acquire。

### 1.4 `triggerRegeneration()`

当前函数先写 pending/`lastRequestId`/save，再禁用按钮、清选择、更新 story UI，最后才进入 transport acquire。

Phase 1.6 只迁移：

```js
!isChoicePromptMode() && !isChoiceResolutionMode()
```

该分支使用 `regeneration` ownerKind，在任何 state/UI 写入前 acquire，再把显式 lease 交给 `requestHostRegeneration()`。

以下分支本阶段不移动 acquire：

- `isChoicePromptMode() === true`
- `isChoiceResolutionMode() === true`

原因是 choice 的“选项已选中、奖励是否结算、是否允许重新生成”属于本计划明确排除的产品语义。

## 2. 方案选择

### 方案 A：每个入口直接复制 acquire 代码

优点：局部直观。缺点：四处重复 host 判断、reject 和 lease options，后续容易出现某个入口在本地 fallback 或拒绝语义上偏离。

### 方案 B：小型 host-aware 入口 helper（采用）

新增：

```js
function acquirePrimaryEntryDispatch(requestId, ownerKind, options = {}) {
  if (!isSillyTavernHost()) {
    return { ok: true, owner: null, localFallback: true };
  }
  const acquired = tryAcquirePrimaryModelChannel({
    requestId,
    ownerKind,
    turnId: options.turnId || "",
    saveScope: activeHostSaveScope,
    sessionEpoch: runtimeSessionEpoch
  });
  if (!acquired.ok) {
    rejectPrimaryModelDispatch(acquired.blockingOwner, {
      requestId,
      ownerKind,
      reason: "channel_occupied",
      silent: Boolean(options.silent)
    });
    return { ok: false, owner: null, localFallback: false };
  }
  return { ok: true, owner: acquired.owner, localFallback: false };
}
```

调用者只在 `dispatch.owner` 存在时向 transport 传入：

```js
{
  channelLeaseId: dispatch.owner.channelLeaseId,
  ownerKind
}
```

优点：只消除真实重复，不改变 transport 和失败状态机；本地 fallback 明确。缺点：目标入口仍需各自正确放置 helper 调用，必须靠执行级测试验证。

### 方案 C：把业务门禁全部下沉到 transport

排除。transport 无法撤销调用前已发生的 state/UI/日志写入，正是 Phase 1.6 要解决的问题。

## 3. ownerKind 与失败语义

新增 ownerKind：

```js
"free_chat"
"idol_interaction"
"manual_prompt"
"regeneration"
```

`describePrimaryModelOwner()` 增加稳定文案：

```js
free_chat: "担当闲聊正在等待回复",
idol_interaction: "偶像互动剧情正在生成",
manual_prompt: "编辑后的剧情请求正在生成",
regeneration: "剧情正在重新生成"
```

本阶段不为这四类新增专用 timeout 状态机。`handlePrimaryModelChannelFailure()` 继续走当前 generic fallback：清兼容 pending并精确释放 lease。原因是 Phase 1.6 只解决请求前副作用；为每种旧剧情补恢复/回滚会进入 Phase 2 范围。

`submitAiPrompt()` 的 phonechat 分支不使用 `manual_prompt`，继续使用已有 `phone_chat` 失败处理。

## 4. owner debug snapshot 设计

### 4.1 运行时数据

在 owner 变量附近新增：

```js
const primaryModelChannelDebug = {
  lastReleaseReason: "",
  lastReleaseAt: 0,
  lastRejectReason: "",
  lastRejectAt: 0
};
```

新增只读 snapshot helper：

```js
function getPrimaryModelChannelDebugSnapshot(now = Date.now()) {
  const owner = getPrimaryModelChannelOwner();
  const requestId = String(owner?.requestId || "");
  return {
    ownerKind: String(owner?.ownerKind || "none"),
    ageMs: owner ? Math.max(0, Number(now) - Number(owner.acquiredAt || now)) : 0,
    scope: String(owner?.saveScope || activeHostSaveScope || ""),
    requestIdSuffix: requestId ? requestId.slice(-8) : "",
    lastReleaseReason: primaryModelChannelDebug.lastReleaseReason,
    lastRejectReason: primaryModelChannelDebug.lastRejectReason
  };
}
```

约束：

- snapshot 不返回 Prompt、正文、输入文本、完整 requestId、leaseId 或完整 state。
- `ageMs` 为读取时计算，不启动额外 interval。
- 精确 release 成功后才更新 `lastReleaseReason/lastReleaseAt`；错误 lease 的失败释放不能伪装成 release。
- `rejectPrimaryModelDispatch()` 更新 `lastRejectReason/lastRejectAt`，默认 reason 为 `channel_occupied`。
- debug 数据只保存在页面内存，不写入 `state.harness.trace` 或存档。

### 4.2 现有 Debug UI

在 `buildVnDebugHtml()` 现有桥接诊断卡中读取一次 snapshot，显示：

- ownerKind
- age（毫秒或格式化秒数）
- scope
- requestId 后 8 位
- last release reason
- last reject reason

不新增独立 overlay，不改 index.html 结构。打开或刷新 DEBUG 时更新年龄即可。

## 5. 文件范围

**修改：**

- `app.js`
  - owner debug state/helpers
  - `tryAcquirePrimaryModelChannel()`、`releasePrimaryModelChannel()`、`rejectPrimaryModelDispatch()` 的 debug 更新
  - `describePrimaryModelOwner()` 新 ownerKind 文案
  - 新增 `acquirePrimaryEntryDispatch()`
  - `submitFreeChat()`
  - `submitIdolInteraction()`
  - `submitAiPrompt()`
  - `triggerRegeneration()` 的非 choice 分支
  - `buildVnDebugHtml()`

**新增：**

- `tests/primary-model-entry-gates.test.mjs`
  - 实际执行入口函数的 VM/DOM stub 测试
  - snapshot 数据和 debug reason 测试

**可能补充但不应替代执行测试：**

- `tests/primary-model-ownership.test.mjs`
  - 仅在 owner primitive 契约需要新增断言时修改

**不修改：**

- `st.html`
- Prompt builder
- 数值/随机/时间/日志结算函数
- gift、First Live、地图、委托、choice continuation 代码

## 6. 实施任务

每个 Task 均按 RED -> 最小实现 -> GREEN -> `node --check app.js` -> `git diff --check` -> 单独检查 diff 执行。当前工作区已有 Phase 1.5 未提交修改，实施者不得用 reset/checkout 清理或覆盖它们。

### Task 1：建立执行级测试夹具和 owner debug snapshot

**Files:**

- Modify: `app.js` owner state、release/reject、`buildVnDebugHtml()`
- Create: `tests/primary-model-entry-gates.test.mjs`

- [ ] **Step 1: 创建可执行测试夹具**

测试文件复用当前项目的 brace-aware `readFunction()`，并提供最小 DOM/state：

```js
function makeElement(value = "") {
  return {
    value,
    textContent: "",
    innerHTML: "",
    hidden: false,
    disabled: false,
    classList: { add() {}, remove() {}, toggle() {} }
  };
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}
```

测试必须通过 `vm.runInNewContext()` 加载并实际调用被测函数，不得只比较函数体中字符串位置。

- [ ] **Step 2: 写 snapshot RED 测试**

断言：

```js
assert.deepEqual(snapshot, {
  ownerKind: "free_chat",
  ageMs: 2500,
  scope: "char-1-chat-a",
  requestIdSuffix: "90abcdef",
  lastReleaseReason: "accepted_final",
  lastRejectReason: "channel_occupied"
});
assert.doesNotMatch(JSON.stringify(snapshot), /prompt|channelLeaseId|完整正文/iu);
```

另测错误 requestId/lease 的 release 返回 false且不更新 `lastReleaseReason`。

- [ ] **Step 3: 运行 RED**

Run:

```powershell
node --test tests/primary-model-entry-gates.test.mjs
```

Expected: FAIL，原因是 `getPrimaryModelChannelDebugSnapshot()` 和 debug state 尚不存在。

- [ ] **Step 4: 实现最小 debug snapshot**

按第 4 节结构实现。`releasePrimaryModelChannel()` 仅在双 ID 精确匹配并实际清空 owner 后记录 release；`rejectPrimaryModelDispatch()` 记录：

```js
primaryModelChannelDebug.lastRejectReason = String(options.reason || "channel_occupied");
primaryModelChannelDebug.lastRejectAt = Date.now();
```

在 `buildVnDebugHtml()` 中只渲染 snapshot 标量。

- [ ] **Step 5: 验证 Task 1**

Run:

```powershell
node --test tests/primary-model-entry-gates.test.mjs tests/primary-model-ownership.test.mjs tests/vn-flow.test.mjs
node --check app.js
git diff --check
git diff -- app.js tests/primary-model-entry-gates.test.mjs tests/primary-model-ownership.test.mjs tests/vn-flow.test.mjs
```

Expected: snapshot/owner/VN debug 专项全通过；diff 不包含 Prompt 或持久化 trace 改动。

### Task 2：入口 acquire helper 与 `submitFreeChat()`

**Files:**

- Modify: `app.js`
- Modify: `tests/primary-model-entry-gates.test.mjs`

- [ ] **Step 1: 写 busy rejection 执行测试**

构造：

```js
const beforeState = clone(context.state);
const beforeInput = elements.freeChatTextarea.value;
context.acquireResult = { ok: false, blockingOwner: { ownerKind: "phone_chat" } };
context.submitFreeChat();

assert.deepEqual(clone(context.state), beforeState);
assert.equal(elements.freeChatTextarea.value, beforeInput);
assert.equal(context.calls.saveState, 0);
assert.equal(context.calls.closeFreeChatOverlay, 0);
assert.equal(context.calls.openEventOverlay, 0);
assert.equal(context.calls.requestHostPromptSend, 0);
assert.equal(context.calls.rejectPrimaryModelDispatch, 1);
```

允许的变化只有 toast/debug rejection spy。

- [ ] **Step 2: 写成功与本地 fallback 执行测试**

成功路径断言 `requestHostPromptSend()` 收到：

```js
{
  channelLeaseId: "lease-free-chat",
  ownerKind: "free_chat"
}
```

并断言 acquire 调用先于 `saveState()`/close/open/send 的 call log。

本地非宿主路径断言不调用 `tryAcquirePrimaryModelChannel()`，仍执行现有 state 写入和手动 Prompt fallback。

- [ ] **Step 3: 运行 RED**

Run: `node --test tests/primary-model-entry-gates.test.mjs`

Expected: busy 路径仍会修改 state/UI，测试失败。

- [ ] **Step 4: 实现 helper 和 free chat 前置门禁**

在读取、校验并只读构建 Prompt 后，在任何 state/UI/save 写入前：

```js
const prompt = buildFreeChatPrompt(topic);
const requestId = createRequestId();
const dispatch = acquirePrimaryEntryDispatch(requestId, "free_chat");
if (!dispatch.ok) return;
```

发送时：

```js
const dispatchOptions = dispatch.owner
  ? { channelLeaseId: dispatch.owner.channelLeaseId, ownerKind: "free_chat" }
  : undefined;
requestHostPromptSend(prompt, requestId, dispatchOptions);
```

不得清空或重写 `freeChatTextarea`，不得修改 Prompt 文案。

- [ ] **Step 5: 验证 Task 2**

Run:

```powershell
node --test tests/primary-model-entry-gates.test.mjs tests/primary-model-ownership.test.mjs
node --check app.js
git diff --check
git diff -- app.js tests/primary-model-entry-gates.test.mjs
```

Expected: busy/success/local 三路径通过。

### Task 3：`submitIdolInteraction()` 前置门禁

**Files:**

- Modify: `app.js`
- Modify: `tests/primary-model-entry-gates.test.mjs`

- [ ] **Step 1: 写有效提交被占用的执行测试**

使用至少一名 selected character，避免命中原表单校验。调用真实 `submitIdolInteraction()` 后断言：

```js
assert.deepEqual(clone(context.state), beforeState);
assert.deepEqual([...context.selectedInteractionCharacters], beforeCharacters);
assert.equal(elements.interactionPlotTextarea.value, beforePlot);
assert.equal(context.calls.saveState, 0);
assert.equal(context.calls.closeInteractionOverlay, 0);
assert.equal(context.calls.openEventOverlay, 0);
assert.equal(context.calls.requestHostPromptSend, 0);
```

- [ ] **Step 2: 写成功 lease 透传测试**

断言 ownerKind 为 `idol_interaction`，lease 为 acquisition 返回值；原 `selectedCharacters/aiDecides/plot` 写入结果保持不变。

- [ ] **Step 3: 运行 RED**

Run: `node --test tests/primary-model-entry-gates.test.mjs`

Expected: 当前函数在 transport reject 前已写 state/UI，测试失败。

- [ ] **Step 4: 最小移动 acquire**

保持原 validation，随后：

```js
const plot = document.getElementById("interactionPlotTextarea").value.trim();
const prompt = buildIdolInteractionPrompt(selectedCharacters, plot, aiDecides);
const requestId = createRequestId();
const dispatch = acquirePrimaryEntryDispatch(requestId, "idol_interaction");
if (!dispatch.ok) return;
```

发送时显式传递 lease。不得修改交互 Prompt、角色选择或“不消耗行动”规则。

- [ ] **Step 5: 验证 Task 3**

Run:

```powershell
node --test tests/primary-model-entry-gates.test.mjs tests/idol-interaction.test.mjs tests/primary-model-ownership.test.mjs
node --check app.js
git diff --check
git diff -- app.js tests/primary-model-entry-gates.test.mjs
```

Expected: 新执行测试通过；记录现有 `idol-interaction` 基线失败时必须逐项说明，不得归因于 Phase 1.6。

### Task 4：`submitAiPrompt()` 普通与 phonechat 分支

**Files:**

- Modify: `app.js`
- Modify: `tests/primary-model-entry-gates.test.mjs`

- [ ] **Step 1: 写普通编辑重发 busy 测试**

实际调用 `submitAiPrompt()`，断言通道占用时：

- `aiPromptTextarea.value` 不变。
- `state.lastPrompt`、active node 和 pending 不变。
- 不调用 save、render、close、open event、Notebook或 transport。

- [ ] **Step 2: 写 phonechat busy 测试**

`state.activeStoryNode.type = "phonechat"` 时，ownerKind 必须为 `phone_chat`。被占用时不得改变 awaiting、phone pending、typing、composer 或输入文本。

- [ ] **Step 3: 写两个成功路径测试**

普通路径断言 `requestHostPromptSend(prompt, requestId, { channelLeaseId, ownerKind: "manual_prompt" })`。

phonechat 路径断言 `sendPhoneChatPromptToHost(prompt, requestId, { channelLeaseId, ownerKind: "phone_chat" })`。

- [ ] **Step 4: 运行 RED**

Run: `node --test tests/primary-model-entry-gates.test.mjs`

Expected: 当前函数在 acquire 前保存 Prompt、关闭 overlay并写 pending，busy 测试失败。

- [ ] **Step 5: 实现分支分类和前置 acquire**

读取并校验 Prompt 后：

```js
const requestId = createRequestId();
const phoneEdit = state.activeStoryNode?.type === "phonechat";
const ownerKind = phoneEdit ? "phone_chat" : "manual_prompt";
const dispatch = acquirePrimaryEntryDispatch(requestId, ownerKind);
if (!dispatch.ok) return;
```

之后保留原 state/UI 逻辑，只把显式 lease 传给对应 transport wrapper。

- [ ] **Step 6: 验证 Task 4**

Run:

```powershell
node --test tests/primary-model-entry-gates.test.mjs tests/phone-chat.test.mjs tests/primary-model-ownership.test.mjs
node --check app.js
git diff --check
git diff -- app.js tests/primary-model-entry-gates.test.mjs
```

Expected: 普通/phonechat busy 和成功路径均通过；手机既有解析测试无新增失败。

### Task 5：非 choice `triggerRegeneration()` 前置门禁

**Files:**

- Modify: `app.js`
- Modify: `tests/primary-model-entry-gates.test.mjs`

- [ ] **Step 1: 写通用 regeneration busy 执行测试**

设置 `isChoicePromptMode() === false`、`isChoiceResolutionMode() === false`，记录：

- `pendingAiRequestId`
- `state.lastRequestId`
- 完整 state clone
- `eventChoices.innerHTML/hidden`
- `eventStory.textContent/innerHTML`
- event action disabled 状态

调用后除 toast/debug外必须完全相同，且不调用 `saveState()`、`openEventOverlay()`、`requestHostRegeneration()`。

- [ ] **Step 2: 写成功显式 lease 测试**

断言：

```js
requestHostRegeneration(requestId, {
  channelLeaseId: "lease-regeneration",
  ownerKind: "regeneration"
});
```

并验证原 waiting UI 和 pending 更新仍发生。

- [ ] **Step 3: 写 choice 排除测试**

分别执行 choice prompt 和 choice resolution 情境，断言 `acquirePrimaryEntryDispatch()` 没有以 `regeneration` 调用，现有 choice transport/界面路径保持原样。该测试用于防止 Phase 1.6 暗中迁移 choice，而不是宣称 choice 已安全。

- [ ] **Step 4: 运行 RED**

Run: `node --test tests/primary-model-entry-gates.test.mjs`

Expected: 非 choice busy 路径当前会先修改 state/UI，测试失败。

- [ ] **Step 5: 实现条件门禁**

在任何写入前计算模式：

```js
const choicePrompt = isChoicePromptMode();
const choiceResolution = isChoiceResolutionMode();
const requestId = choicePrompt ? createRequestId() : (state.lastRequestId || createRequestId());
let dispatch = { ok: true, owner: null, localFallback: !isSillyTavernHost() };
if (!choicePrompt && !choiceResolution) {
  dispatch = acquirePrimaryEntryDispatch(requestId, "regeneration");
  if (!dispatch.ok) return;
}
```

非 choice host 发送时传显式 lease；choice 分支保留当前调用方式和产品语义。

- [ ] **Step 6: 验证 Task 5**

Run:

```powershell
node --test tests/primary-model-entry-gates.test.mjs tests/vn-flow.test.mjs tests/primary-model-ownership.test.mjs
node --check app.js
git diff --check
git diff -- app.js tests/primary-model-entry-gates.test.mjs
```

Expected: 非 choice busy/success 通过；choice 排除测试和既有 VN regeneration 测试保持通过。

### Task 6：组合回归和真实宿主验收

**Files:**

- No business changes expected
- Update only test evidence/report if explicitly requested

- [ ] **Step 1: Phase 1.6 组合测试**

Run:

```powershell
node --test tests/primary-model-entry-gates.test.mjs tests/primary-model-ownership.test.mjs tests/harness-phase1.test.mjs tests/harness-recovery.test.mjs tests/phone-chat.test.mjs tests/idol-interaction.test.mjs tests/vn-flow.test.mjs tests/st-loader-bridge.test.mjs
node --check app.js
git diff --check
```

Expected: Phase 1.6 新测试全绿；所有既有失败按实施前基线逐项列出。

- [ ] **Step 2: 完整测试**

Run:

```powershell
node --test tests
```

实施前完整基线为 `295` tests / `289` pass / `6` fail。验收要求是不新增失败；测试总数应因新增执行级测试而增加。

- [ ] **Step 3: 检查范围**

Run:

```powershell
git status --short
git diff --stat
git diff -- app.js tests/primary-model-entry-gates.test.mjs tests/primary-model-ownership.test.mjs
```

确认：

- 无 `st.html` 修改。
- 无 Prompt 文案 diff。
- 无 gift/First Live/map/side quest/choice settlement 修改。
- debug snapshot 无 Prompt、正文、完整 requestId 或 leaseId。

- [ ] **Step 4: 执行第 8 节真实 SillyTavern 手工验收**

若 BasicAuth 阻挡，必须报告“未执行”，不得用自动化测试替代或宣称端到端通过。

## 7. 执行级测试矩阵

| 入口 | occupied 时必须不变 | 成功时必须证明 | 本地 fallback |
|---|---|---|---|
| `submitFreeChat()` | topic、state、pending、overlay、save count | `free_chat` lease 显式发送 | 保留手动 Prompt |
| `submitIdolInteraction()` | selected set、plot、state、validation 后业务 UI | `idol_interaction` lease 显式发送 | 保留手动 Prompt |
| `submitAiPrompt()` 普通 | textarea、lastPrompt、state、pending、overlay | `manual_prompt` lease | 保留 Notebook fallback |
| `submitAiPrompt()` phone | textarea、awaiting、phone pending、typing/composer | `phone_chat` lease | 保留手机失败 UI |
| `triggerRegeneration()` 非 choice | pending、lastRequestId、story、choices、buttons、state | `regeneration` lease | 保留未连接提示 |
| `triggerRegeneration()` choice | 不作为已迁移入口 | 原路径未被 Phase 1.6 改写 | 原行为 |

“state 不变”使用调用前后深比较；“UI 不变”比较 DOM stub 字段和 UI helper 调用计数；“无副作用”要求 save、render、close/open、transport spy 均为零。toast/debug rejection 不计入业务 state/UI 变化。

## 8. 真实 SillyTavern 手工验收清单

### 8.1 前置条件

1. 在已通过 BasicAuth 的 SillyTavern 页面加载当前前端。
2. 确认角色卡和 `saveScope` 已绑定。
3. 打开 VN `DEBUG`，确认初始 ownerKind 为 `none`。
4. DevTools 选中实际游戏 iframe，而不是 loader/script iframe。

### 8.2 occupied rejection

对每个目标入口至少执行一次：

1. 先发起手机私聊或广播，使 primary owner 处于占用。
2. 打开闲聊，输入独特 topic，点击发送。
3. 确认 busy toast 出现；输入仍在、overlay 未关闭、没有新增 story/pending/save 可见状态。
4. 对偶像互动重复：角色选择和 plot 保留，未进入 waiting overlay。
5. 对编辑 Prompt 重发重复：textarea 保留，原事件内容和 pending 不变。
6. 对非 choice 重新生成重复：原正文、按钮、选项容器和 requestId 不变。
7. 查看 DEBUG：owner 仍是原手机/广播 owner；last reject reason 为 `channel_occupied`。

### 8.3 四入口成功 acquire/release

1. 等待当前 owner 正常完成，确认 DEBUG ownerKind 变为 `none`，last release reason 为 `accepted_final` 或对应终态。
2. 发起担当闲聊；生成期间 DEBUG 显示 `free_chat`、正确 scope、递增 age 和 requestId 后缀。
3. 完成后确认 owner 清空；再发起偶像互动，观察 `idol_interaction`。
4. 在普通事件中使用编辑 Prompt 重发，观察 `manual_prompt`。
5. 在手机编辑 Prompt 场景重发，观察 ownerKind 仍为 `phone_chat`。
6. 在非 choice 普通剧情点击重新生成，观察 `regeneration`。
7. 每次请求完成后立即尝试下一入口，确认通道可再次 acquire。

### 8.4 旧 lease 与切聊天

1. 请求 A 完成或失败后发起请求 B。
2. 若宿主迟到显示 A 的回复，确认 B owner 不被释放，DEBUG 仍显示 B。
3. 在请求进行中切换聊天，确认旧 scope owner 被释放，新聊天没有接收旧回复。

### 8.5 隐私检查

在 DEBUG UI 和 console snapshot 中确认：

- 只显示 requestId 后 8 位。
- 不显示 `channelLeaseId`。
- 不显示 Prompt、topic、plot、正文、textarea 内容或完整 state。

### 8.6 本地非宿主回归

直接打开本地页面：

- 闲聊/互动/编辑 Prompt 保留当前手动复制 fallback。
- 非 choice regenerate 保留“未连接酒馆”提示。
- 不应因 owner helper 报错或留下五分钟 owner。

## 9. 本阶段排除入口及待确认产品语义

### 9.1 Gift

实施前必须确认：

- owner 忙时，礼物是否仍应立即从背包消耗？
- 好感是否仍应立即结算？
- 若结算保留，叙事是可恢复、可放弃还是仅手动 Prompt？
- acquire 应在 `giveGift()` 前还是只在 `beginGiftGivingStory()` 前？

未确认前移动 acquire 可能把“赠礼成功但叙事稍后补”改成“通道忙就不能赠礼”。

### 9.2 First Live

实施前必须确认：

- acquire 在 `evaluateFirstLive()`、完成标记、日志和视频播放前还是后？
- 主模型忙时是否允许先完成确定性 Live 并稍后补登台前/演后记？
- pre-stage 和 post-stage 是否共享一个业务 turn，还是两个独立 lease？
- 演后记失败是否影响 First Live completed/success？

### 9.3 地图和委托

实施前必须确认：

- owner 忙时是否允许先移动地点、推进 clock、写 journal？
- 委托奖励/完成状态应在叙事前还是回复验证后结算？
- 返回地图和纯导航是否应占主模型 owner？
- 已推进时间但正文未生成时是否需要独立 Recovery？

### 9.4 Choice continuation

实施前必须确认：

- acquire 在用户选项锁定、评分/奖励结算和 UI 清空前还是后？
- 通道忙时保留“已选中但未提交”，还是允许用户改选？
- choice prompt 重生成和 choice resolution 重生成是否使用相同产品语义？
- 重生成是否必须新 requestId，还是允许相同业务 requestId + 新 lease？
- 失败后是否保留原选项、原选择和已结算奖励？

## 10. 风险与回滚

### 风险

- 新 ownerKind 走 generic timeout fallback，不能恢复每种剧情 UI；本阶段只保证请求前拒绝无副作用。
- VM/DOM stub 是执行级单元测试，但仍不是完整浏览器/SillyTavern 集成测试。
- 非宿主 fallback 和真实宿主路径分叉，必须分别测试。
- choice 分支仍保留 legacy 风险，不能因同一个函数部分迁移而误报为全覆盖。

### 回滚

1. 删除四入口的 `acquirePrimaryEntryDispatch()` 调用和显式 lease options，即可恢复 transport-level `legacy_main`。
2. 删除新增 ownerKind label不会影响 Phase 1.5 owner。
3. 删除 debug snapshot/UI card不影响请求生命周期。
4. 保留 `requestHostPromptSend()`、`requestHostRegeneration()` 和 Phase 1.5 精确 lease，不回退既有安全门禁。
5. 不删除测试基线或修改 Prompt/结算以“让测试通过”。

## 11. 现在不应该继续做的内容

- 不迁移 gift、First Live、地图、委托或 choice continuation。
- 不修改 Prompt 文案、Prompt builder、数值、随机、时间、日志结算规则。
- 不为四个 ownerKind建立新 Recovery、rollback 或复杂 timeout 状态机。
- 不引入队列、优先级、抢占、事件总线、数据库、微服务或 host ACK 协议。
- 不持久化 owner 或 debug snapshot。
- 不在 debug 中记录 Prompt、输入、正文、完整 requestId 或 leaseId。
- 不把 choice 分支因为位于 `triggerRegeneration()` 内就视为已迁移。
- 不在真实 SillyTavern 手工验收未执行时宣称端到端完成。

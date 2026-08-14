# World Director Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在现有 `world/` 与 Harness 上实现严格日级的 `DailyDirection + DramaPressure`，只由日切或 DEBUG 手工触发，并将经过本地筛选的私密导演信息注入普通行动、担当闲聊和偶像互动。

**Architecture:** 保留 `app.js` 作为调度与宿主桥接入口，把 Director 状态、次 API 输入输出校验和场景注入拆到三个纯模块。已接受场景只积累有界 digest 并置 `dirty`；Director 使用独立 secondary 单飞 owner，在公开世界生成释放 owner 后运行，所有模型输出先在副本上校验和应用，再一次替换 Director 子树。

**Tech Stack:** 浏览器原生 JavaScript IIFE、SillyTavern `postMessage` bridge、Node.js `node:test`、`vm` 模块测试、现有 localStorage/chat metadata 保存机制。

---

## Scope And File Map

**Create:**

- `world/director-state.js`: 默认 shape、旧存档归一化、digest 去重与裁剪、pressure identity/episode、受限 patch 原子应用。
- `world/secondary-channel-owner.js`: secondary owner 的 acquire、精确匹配、release 和 timeout 判定纯函数。
- `world/director-api.js`: Director 输入快照、Prompt、回复解析、schema/revision/sourceRef/evidence 校验。
- `world/director-injection.js`: 当前场景相关 Direction/Pressure 筛选和有界私密 Prompt block。
- `tests/world-director-state.test.mjs`
- `tests/secondary-channel-owner.test.mjs`
- `tests/world-director-api.test.mjs`
- `tests/world-director-injection.test.mjs`
- `tests/world-director-integration.test.mjs`

**Modify:**

- `index.html`: 在 `world/world-gen-api.js` 与 `app.js` 之前按依赖顺序加载四个新模块。
- `st.html`: 同步新模块列表；secondary envelope 回显 `jobId/requestId/saveScope/kind`，不接受 malformed 或错 scope 请求。
- `app.js`: 默认 state/归一化、digest candidate、secondary owner、Director job 调度、日切后继检查、DEBUG 展示和三个 Prompt builder 接入。
- `chronicle/sum-chronicle.js`: 新增可选 `<director_event>` 提取与有界归一化，不改变 `<sum>` 的 100 字规则或世界书写入格式。
- `world/world-gen-api.js`: 现有 `world/daily/tier/test` 调用改为 acquire-before-side-effect；不改变公开世界 Prompt 和业务 apply 规则。
- `tests/chronicle-sum.test.mjs`, `tests/world-gen-api.test.mjs`, `tests/world-engine.test.mjs`, `tests/tasks-sandbox.test.mjs`, `tests/shujuku-harness-bridge.test.mjs`: 回归和执行级集成覆盖。

**Explicitly unchanged:** `settleAction()`、数值/随机/时间规则、普通行动 Recovery、primary owner、shujuku primary same-layer 协议、`composeWorldSummary()` 的公开内容、地图/委托/手机/广播/gift/First Live/NSFW/choice continuation 的 Prompt 语义。

## Shared Verification Commands

每个 Task 的 GREEN 后必须执行：

```powershell
node --check app.js
git diff --check
git status --short
```

全量命令：

```powershell
$files = Get-ChildItem -LiteralPath tests -Filter '*.test.mjs' | Sort-Object Name | ForEach-Object { $_.FullName }
node --test $files
```

当前基线（2026-07-12）：401 tests，395 pass，6 fail。既有失败为：

- `selected idols are all required in a zero-cost interaction`
- `producer profile includes gender in state, form, save flow, and prompts`
- `st.html loader uses a responsive mobile viewport instead of a fixed desktop canvas`
- `st.html pauses floor hiding when the opening floor is not mounted`
- `advanceDay only advances schedule from summary round`
- `day 21 summary round advances into First Live schedule`

任何新增失败或上述失败签名变化都视为回归。

---

### Task 0: Freeze Baseline And Confirm Entry Points

**Files:**

- Read: `app.js:2722`, `app.js:3943`, `app.js:4072`, `app.js:4146`, `app.js:10545`, `app.js:12998`, `app.js:18207`, `app.js:18734`
- Read: `st.html:648`, `st.html:2098`, `st.html:2111`
- Read: `world/world-gen-api.js`
- No code changes

- [ ] **Step 1: Run the existing full suite and save the summary in the Task notes**

Run the full-suite command above. Expected: exactly 401 tests, 395 pass, 6 known failures.

- [ ] **Step 2: Confirm the secondary pre-side-effect problem remains reproducible in source**

Verify `maybeRequestDailyWorldGeneration()`, `maybeRequestSideQuestGeneration()` and `requestSideQuestTierGeneration()` currently write loading/pending state before `requestHostSecondaryPromptSend()`.

- [ ] **Step 3: Confirm the prompt builders are read-only before later injection**

Inspect `buildPrompt()`, `buildFreeChatPrompt()` and `buildIdolInteractionPrompt()`. They may read state and helper data, but must not call `saveState()`, mutate `state`, append logs, clear inputs, or update caches. If any such write is found, stop before Task 5 and move only that write after ownership acquisition; do not hide it in `composeDirectorNarrativeBlock()`.

- [ ] **Step 4: Record the checkpoint without committing**

Expected: no diff. This Task is a preflight gate, not a commit.

---

### Task 1: Director State, Structured Digest, And Accepted-Final Commit

**Files:**

- Create: `world/director-state.js`
- Create: `tests/world-director-state.test.mjs`
- Modify: `chronicle/sum-chronicle.js`
- Modify: `tests/chronicle-sum.test.mjs`
- Modify: `index.html`
- Modify: `st.html`
- Modify: `app.js:2327`, `app.js:3583`, `app.js:12998`, `app.js:18207`, `app.js:18734`
- Modify: `tests/harness-phase1.test.mjs`

- [ ] **Step 1: Write RED pure-module tests for shape and digest rules**

Test these exact behaviors in `tests/world-director-state.test.mjs`:

```js
assert.deepEqual(api.defaultDirectorState(), {
  schemaVersion: 1,
  enabled: true,
  directorRevision: 0,
  chronicleRevision: 0,
  chronicleDigests: [],
  dailyDirection: null,
  pressures: [],
  activeJob: null,
  dirty: false,
  lastAppliedJobId: "",
  receipts: []
});

const first = api.commitChronicleDigest(state, candidate);
assert.equal(first.committed, true);
assert.equal(state.chronicleRevision, 1);
assert.equal(state.dirty, true);
assert.equal(state.chronicleDigests.length, 1);

const duplicate = api.commitChronicleDigest(state, candidate);
assert.equal(duplicate.committed, false);
assert.equal(state.chronicleRevision, 1);
```

Also assert: max 32 digests; `sourceTurnId + sourceMessageId` primary dedupe; missing message id falls back to `sourceRequestId`; normalization of old saves; no Prompt/body fields survive; receipts max 20.

- [ ] **Step 2: Write RED parser tests for `<director_event>`**

Add tests to `tests/chronicle-sum.test.mjs` for:

```js
const parsed = api.extractDirectorEvent(`<director_event>{"facts":["明确约定"],"playerChoices":["接受邀请"],"observations":[],"hooksCreated":[],"hooksResolved":[]}</director_event>`);
assert.equal(parsed.evidenceQuality, "structured");
assert.deepEqual(parsed.signals.facts, ["明确约定"]);
```

Invalid JSON, unknown keys, overlong strings, or more than three items per group must return empty signals with `evidenceQuality: "summary_only"`. Existing `<sum>` extraction and 100-character rejection tests must remain unchanged.

- [ ] **Step 3: Run RED tests**

```powershell
node --test tests/world-director-state.test.mjs tests/chronicle-sum.test.mjs
```

Expected: FAIL because `HatsuWorld.directorState` and `extractDirectorEvent()` do not exist.

- [ ] **Step 4: Implement the pure state and extraction APIs**

Expose these exact APIs:

```js
global.HatsuWorld.directorState = {
  defaultDirectorState,
  ensureDirectorShape,
  normalizeDigestCandidate,
  commitChronicleDigest,
  makePressureSignature,
  normalizePressure,
  applyDirectorPatch
};

global.HatsuChronicle.extractDirectorEvent = extractDirectorEvent;
```

`extractDirectorEvent()` only parses and bounds evidence. It never writes state. `commitChronicleDigest()` is the sole writer for `chronicleRevision`, digest trimming and `dirty=true`.

- [ ] **Step 5: Add state shape and script loading**

Add `director: globalThis.HatsuWorld?.directorState?.defaultDirectorState?.() || null` under `state.freeMode.world`. In `ensureStateShape()`, call `ensureDirectorShape(state)` after `freeMode.world` exists. Load `director-state.js` before `app.js` in both `index.html` and the `st.html` local file list.

- [ ] **Step 6: Add in-memory candidates and commit only through final ACK**

In `app.js`, maintain `const pendingDirectorDigestCandidates = new Map()`. After `applyAiReply()` passes its current request/lease gate, prepare a candidate keyed by the exact requestId. Do not write Director state there. In `sendAiReplyAck()`:

```js
if (isFinal && !retry) {
  if (accepted) commitPendingDirectorDigestCandidate(requestId);
  else discardPendingDirectorDigestCandidate(requestId, "rejected_final");
  releasePrimaryModelChannel(requestId, activeInboundPrimaryChannelLeaseId, accepted ? "accepted_final" : "rejected_final");
}
```

Partial, retry, stale and rejected-final paths must not commit. A successful commit calls existing `saveState("director.digest_committed")` once but must not start a secondary request.

- [ ] **Step 7: Add execution-level stale and duplicate tests**

Extend `tests/harness-phase1.test.mjs` to execute the candidate/ACK decision helpers and assert: stale request creates no candidate; partial ACK retains but does not commit; retry discards the current candidate; two accepted-final ACKs commit only once; no `sendSecondaryPrompt` occurs.

- [ ] **Step 8: Run GREEN and regression tests**

```powershell
node --test tests/world-director-state.test.mjs tests/chronicle-sum.test.mjs tests/harness-phase1.test.mjs
node --check app.js
git diff --check
```

Expected: all selected tests pass.

- [ ] **Step 9: Inspect diff and commit only Task 1 files**

```powershell
git diff --stat
git diff -- world/director-state.js chronicle/sum-chronicle.js app.js index.html st.html tests/world-director-state.test.mjs tests/chronicle-sum.test.mjs tests/harness-phase1.test.mjs
git add world/director-state.js chronicle/sum-chronicle.js app.js index.html st.html tests/world-director-state.test.mjs tests/chronicle-sum.test.mjs tests/harness-phase1.test.mjs
git commit -m "feat: add world director digest state"
```

---

### Task 2: Secondary Owner, Exact Envelope, And Acquire-Before-Side-Effect

**Files:**

- Create: `world/secondary-channel-owner.js`
- Create: `tests/secondary-channel-owner.test.mjs`
- Modify: `index.html`
- Modify: `st.html:648`, `st.html:2098`, `st.html:2111`
- Modify: `app.js:2722`, `app.js:3943`, `app.js:4072`, `app.js:4114`, `app.js:4146`, `app.js:4332`, `app.js:4358`, `app.js:19809`
- Modify: `world/world-gen-api.js`
- Modify: `tests/world-gen-api.test.mjs`
- Modify: `tests/tasks-sandbox.test.mjs`
- Modify: `tests/shujuku-harness-bridge.test.mjs`

- [ ] **Step 1: Write RED owner lifecycle tests**

Cover the minimal owner:

```js
const intent = { jobId: "world:day-2", requestId: "req-1", kind: "world", saveScope: "scope-a", acquiredAt: 100 };
assert.equal(api.acquireSecondaryOwner(null, intent).acquired, true);
assert.equal(api.acquireSecondaryOwner(intent, { ...intent, requestId: "req-2" }).acquired, false);
assert.equal(api.releaseSecondaryOwner(intent, { jobId: "world:day-2", requestId: "req-old", saveScope: "scope-a" }).released, false);
assert.equal(api.releaseSecondaryOwner(intent, { jobId: "world:day-2", requestId: "req-1", saveScope: "scope-a" }).released, true);
```

Also test scope switch, timeout identity, malformed intent, and that an old release cannot clear a newer owner.

- [ ] **Step 2: Write RED execution tests for pre-side-effect rejection**

Execute `maybeRequestDailyWorldGeneration()`, `maybeRequestSideQuestGeneration()`, `requestSideQuestTierGeneration()` and `runSecondaryApiTest()` in a sandbox with an occupied owner. Snapshot relevant state and UI call counters before invocation; assert deep equality afterward except for sanitized reject debug/toast. No loading marker, save, render, or input mutation is allowed before successful acquire.

- [ ] **Step 3: Write RED host envelope tests**

In `tests/shujuku-harness-bridge.test.mjs`, execute normalization and reply helpers. Require `jobId`, `requestId`, `saveScope`, `kind`; reject wrong current scope before fetch; echo all four fields on success and failure.

- [ ] **Step 4: Run RED tests**

```powershell
node --test tests/secondary-channel-owner.test.mjs tests/world-gen-api.test.mjs tests/tasks-sandbox.test.mjs tests/shujuku-harness-bridge.test.mjs
```

Expected: FAIL because owner APIs and v2 secondary envelope do not exist.

- [ ] **Step 5: Implement one page-memory secondary owner**

Replace `pendingSecondaryRequestId/meta` as the authority with:

```js
let secondaryChannelOwner = null;
let secondaryChannelTimeoutId = 0;
```

All migrated calls create identity before writes. `acquireSecondaryModelChannel(intent)` returns the exact owner or `{ ok:false, reason:"secondary_busy" }`. Only after success may callers set pending/loading, save, render or clear UI. `releaseSecondaryModelChannel(jobId, requestId, saveScope, reason)` clears only an exact match and always clears its timer locally.

- [ ] **Step 6: Centralize timeout through existing reply failure handling**

On timeout call `handleSecondaryAiReply({ jobId, requestId, saveScope, kind, ok:false, error:"timeout" })`. Do not add a second world/daily/tier failure state machine. Late host/local replies fail the exact-owner gate and have no side effects.

- [ ] **Step 7: Upgrade app-to-host and host-to-app envelopes**

`sendSecondaryPrompt` and `secondaryAiReply` must carry:

```js
{ jobId, requestId, saveScope, kind, prompt, apiConfig }
```

Host validation reads the current scope immediately before starting fetch and again before posting the result. It never logs Prompt/API key. The app accepts a reply only when all identity fields equal the current owner and `saveScope === activeHostSaveScope`.

- [ ] **Step 8: Migrate `world/daily/tier/test` callers**

Move every loading/pending/save/render mutation after owner acquisition. If acquisition fails, return without changing business state. `legacy_main` is not involved because this is the separate secondary channel.

- [ ] **Step 9: Run GREEN, syntax, and diff checks**

```powershell
node --test tests/secondary-channel-owner.test.mjs tests/world-gen-api.test.mjs tests/tasks-sandbox.test.mjs tests/shujuku-harness-bridge.test.mjs
node --check app.js
git diff --check
```

- [ ] **Step 10: Inspect diff and commit only Task 2 files**

```powershell
git diff --stat
git add world/secondary-channel-owner.js world/world-gen-api.js app.js index.html st.html tests/secondary-channel-owner.test.mjs tests/world-gen-api.test.mjs tests/tasks-sandbox.test.mjs tests/shujuku-harness-bridge.test.mjs
git commit -m "feat: guard the secondary model channel"
```

---

### Task 3: Director Input, Validation, Pressure Identity, And Atomic Patch

**Files:**

- Create: `world/director-api.js`
- Create: `tests/world-director-api.test.mjs`
- Modify: `world/director-state.js`
- Modify: `tests/world-director-state.test.mjs`
- Modify: `index.html`
- Modify: `st.html`

- [ ] **Step 1: Write RED input privacy tests**

Call `buildDirectorInput(state, job, helpers)` and assert it includes only: schema/version/scope/job/day/time/location, latest 12 digests, bounded active pressures, current direction, minimal known-character relationship stage, public world summary, recent scene statistics. Assert serialized output does not contain API keys, Harness trace, full state, generationPrompt, lastStory, or full quest state.

- [ ] **Step 2: Write RED parser and identity tests**

Require a marked JSON response with exact `schemaVersion`, `jobId`, base revisions, `dailyDirection`, and allowed `pressureOperations`. Test deterministic signature:

```js
assert.equal(
  api.makePressureSignature({ type: "relationship", theme: "trust", actorId: "idol:a", targetIds: ["idol:c", "idol:b"], scopeKey: "thread-1" }),
  "v1|relationship|trust|idol:a|idol:b,idol:c|thread-1"
);
```

Reject unknown theme/actor/sourceRef, arbitrary patch paths, text beyond limits, intensity outside 0-100, delta beyond ±20, invalid stage jumps, locked changes, and base revision mismatch.

- [ ] **Step 3: Write RED evidence-quality tests**

Assert a new pressure is rejected when it references only one `summary_only` digest; accepted with one `structured` digest or two distinct `summary_only` digests. A single `summary_only` digest may update an existing same-signature active pressure. `resolved`/`dissipated` episodes are not ordinary merge targets.

- [ ] **Step 4: Write RED atomicity and idempotency tests**

An operation list with one valid and one invalid operation leaves the original state byte-for-byte unchanged. Applying the same `jobId` twice increments `directorRevision` only once. Successful apply replaces only the Director subtree, increments `directorRevision` once, writes one bounded receipt and preserves `chronicleRevision`.

- [ ] **Step 5: Run RED tests**

```powershell
node --test tests/world-director-api.test.mjs tests/world-director-state.test.mjs
```

- [ ] **Step 6: Implement `director-api.js` pure APIs**

Expose:

```js
global.HatsuWorld.directorApi = {
  buildDirectorInput,
  buildDirectorPrompt,
  parseDirectorResponse,
  validateDirectorOutput,
  prepareDirectorPatch
};
```

The model proposes operations; local code computes signature, episode id, merge target, stage clamp and intensity clamp. `prepareDirectorPatch()` returns `{ ok, patch, receiptDraft, reason }` and never mutates state.

- [ ] **Step 7: Implement atomic apply in `director-state.js`**

Clone only `state.freeMode.world.director`, apply all operations to the clone, normalize, then replace the subtree once. Reject the whole patch if `jobId`, scope or either base revision is stale. No arbitrary JSON Patch paths are accepted.

- [ ] **Step 8: Load the module and run GREEN checks**

```powershell
node --test tests/world-director-api.test.mjs tests/world-director-state.test.mjs
node --check app.js
git diff --check
```

- [ ] **Step 9: Inspect diff and commit Task 3**

```powershell
git add world/director-api.js world/director-state.js index.html st.html tests/world-director-api.test.mjs tests/world-director-state.test.mjs
git commit -m "feat: validate world director patches"
```

---

### Task 4: Strict Day-Level Scheduling And Manual Recalculation

**Files:**

- Create: `tests/world-director-integration.test.mjs`
- Modify: `app.js:4072`, `app.js:4146`, `app.js:10545`, DEBUG panel near `app.js:17000`
- Modify: `tests/world-engine.test.mjs`
- Modify: `tests/world-gen-api.test.mjs`

- [ ] **Step 1: Write RED job lifecycle tests**

Execute helpers around a real state object and assert:

```js
assert.equal(prepareWorldDirectorJob("day_change").trigger, "day_change");
assert.equal(prepareWorldDirectorJob("scene_commit"), null);
```

Scene digest commit only sets `dirty`. Day change creates a job with current `directorRevision`, `chronicleRevision`, dayKey and scope. Manual recalculation creates `trigger:"manual"` and a new job/request identity.

- [ ] **Step 2: Write RED scheduling-order tests**

Instrument calls during `advanceFreeModeToNextDay()` and require this order:

```text
deterministic day mutation
runFreeModeWorldDailyTick / public world queue
public secondary acquire and completion/failure release
Director dirty check
Director secondary acquire
```

If public generation owns secondary, Director remains dirty/prepared without UI or save churn. The public owner release path performs exactly one Director follow-up check; this is not a generic queue.

- [ ] **Step 3: Write RED failure/refresh/scope tests**

Timeout, parse failure or API error yields `retryable_failed`, retains old Direction/Pressure and `dirty=true`, and releases the exact owner. On `ensureStateShape()` after refresh, persisted `generating/validating` becomes `retryable_failed`, old requestId is cleared, and no request auto-resends. Scope switch rejects the old reply.

- [ ] **Step 4: Run RED tests**

```powershell
node --test tests/world-director-integration.test.mjs tests/world-engine.test.mjs tests/world-gen-api.test.mjs
```

- [ ] **Step 5: Implement orchestration in `app.js`**

Add focused functions:

```js
prepareWorldDirectorJob(trigger, options)
maybeRequestWorldDirector(options)
handleWorldDirectorReply(payload, owner)
finishWorldDirectorAttempt(owner, result)
requestManualWorldDirectorRecalculation()
```

`maybeRequestWorldDirector()` requires feature enabled, `dirty`, valid scope/config, no primary owner, and successful secondary acquire. It builds Prompt only after acquire. It must not alter deterministic action/time settlement.

- [ ] **Step 6: Enforce strict daily direction semantics**

Normal day-change jobs must not replace an already committed `dailyDirection` for the same dayKey. DEBUG manual recalculation may replace it and must write a receipt with `trigger:"manual"`. Injection later ignores a direction whose `dayKey` differs from the current day.

- [ ] **Step 7: Add DEBUG manual control and sanitized status**

Display feature flag, revisions, dirty, active job status, pressure count and latest receipt reason. The manual button asks for confirmation, does not expose Prompt/full response, and is disabled while primary/secondary is occupied.

- [ ] **Step 8: Run GREEN and regression checks**

```powershell
node --test tests/world-director-integration.test.mjs tests/world-engine.test.mjs tests/world-gen-api.test.mjs tests/secondary-channel-owner.test.mjs
node --check app.js
git diff --check
```

- [ ] **Step 9: Inspect diff and commit Task 4**

```powershell
git add app.js tests/world-director-integration.test.mjs tests/world-engine.test.mjs tests/world-gen-api.test.mjs
git commit -m "feat: run world director at day boundaries"
```

---

### Task 5: Private Narrative Injection And Structured Evidence Contract

**Files:**

- Create: `world/director-injection.js`
- Create: `tests/world-director-injection.test.mjs`
- Modify: `index.html`
- Modify: `st.html`
- Modify: `app.js:7179`, `app.js:8240`, `app.js:8387`
- Modify: `tests/affinity-stage-tags.test.mjs`
- Modify: `tests/world-engine.test.mjs`

- [ ] **Step 1: Write RED relevance and privacy tests**

Build state with several pressures and assert `composeDirectorNarrativeBlock()` includes only pressures matching current participants/location/scope, excludes suspended/dissipated/private unrelated actors, respects `maxChars`, and returns empty when feature disabled or `dailyDirection.dayKey !== currentDayKey`.

- [ ] **Step 2: Write RED narrative-contract tests**

Assert the block explicitly says Direction is tone rather than a script, Pressure need not erupt now, deterministic values cannot be changed, and player choices cannot be invented. Assert it contains no source Prompt, API response, receipt, or unrelated private pressure.

- [ ] **Step 3: Write RED builder execution tests**

Execute `buildPrompt()`, `buildFreeChatPrompt()` and `buildIdolInteractionPrompt()` against a frozen state proxy. Assert no state mutation and exactly one Director block plus one `<director_event>` output contract. Existing affinity/VN/world public blocks must remain byte-for-byte present. Builders outside these three must not contain the private block.

- [ ] **Step 4: Run RED tests**

```powershell
node --test tests/world-director-injection.test.mjs tests/affinity-stage-tags.test.mjs tests/world-engine.test.mjs
```

- [ ] **Step 5: Implement the pure injection module**

Expose:

```js
global.HatsuWorld.directorInjection = {
  selectRelevantPressures,
  composeDirectorNarrativeBlock,
  composeDirectorEvidenceContract
};
```

Selection uses explicit participants, locationId, scene scope, status/stage/visibility/intensity, focus ids and a deterministic character budget. It never calls `composeWorldSummary()` and never mutates state.

- [ ] **Step 6: Append to only the three approved builders**

At the final string assembly of the three builders, append the private block and evidence contract. Do not rewrite existing Prompt prose. Do not add them to map, commission, phone, broadcast, gift, First Live, NSFW, choice continuation or sidecar flows.

- [ ] **Step 7: Run GREEN, syntax, and diff checks**

```powershell
node --test tests/world-director-injection.test.mjs tests/affinity-stage-tags.test.mjs tests/world-engine.test.mjs tests/chronicle-sum.test.mjs
node --check app.js
git diff --check
```

- [ ] **Step 8: Inspect diff and commit Task 5**

```powershell
git add world/director-injection.js app.js index.html st.html tests/world-director-injection.test.mjs tests/affinity-stage-tags.test.mjs tests/world-engine.test.mjs
git commit -m "feat: inject private world direction into scenes"
```

---

### Task 6: Full Regression, Feature-Flag Rollback, And Real SillyTavern Acceptance

**Files:**

- Modify only if a failing Director-specific assertion proves an implementation defect.
- Do not fix the six unrelated baseline failures in this Task.

- [ ] **Step 1: Run all Director and bridge suites together**

```powershell
node --test tests/world-director-state.test.mjs tests/secondary-channel-owner.test.mjs tests/world-director-api.test.mjs tests/world-director-injection.test.mjs tests/world-director-integration.test.mjs tests/chronicle-sum.test.mjs tests/world-gen-api.test.mjs tests/world-engine.test.mjs tests/tasks-sandbox.test.mjs tests/harness-phase1.test.mjs tests/harness-recovery.test.mjs tests/primary-model-ownership.test.mjs tests/primary-model-entry-gates.test.mjs tests/shujuku-harness-bridge.test.mjs tests/chat-metadata-save.test.mjs
```

Expected: all selected tests pass. If a selected file contains an established unrelated failure, record the exact test name and prove it matches Task 0 before proceeding.

- [ ] **Step 2: Run the full suite and compare to baseline**

Run the shared full-suite command. Expected: no new failures; the six Task 0 signatures may remain.

- [ ] **Step 3: Run static checks and inspect final scope**

```powershell
node --check app.js
git diff --check
git status --short
git diff --stat
```

Confirm no changes to deterministic settlement, Recovery semantics, primary ownership, save ordering, public world Prompt, or excluded Prompt builders.

- [ ] **Step 4: Perform real SillyTavern accepted-final and dedupe checks**

1. Enable the Director feature and secondary API in a disposable chat.
2. Complete one ordinary action and wait for final acceptance.
3. Verify one digest is stored, `chronicleRevision` increments once, `dirty=true`, and no Director API call occurs during the day.
4. Reroll or inject an old reply and verify no duplicate digest.
5. Verify `<sum>` still updates the existing chronicle worldbook and `<director_event>` is absent from displayed story/worldbook text.

- [ ] **Step 5: Perform day-change and channel contention checks**

1. Trigger the next day while public world generation is enabled.
2. Verify public world generation owns secondary first.
3. Verify Director starts only after that owner releases.
4. While Director is active, attempt world/tier/test generation; verify rejection before loading/save/UI mutation.
5. Let Director time out once; verify the old Direction/Pressure remains, `dirty=true`, and normal actions still work.

- [ ] **Step 6: Perform scope, refresh, and private-injection checks**

1. Refresh while Director is generating; verify no old request is restored or automatically resent.
2. Switch chats before a reply; verify the old reply cannot mutate the new scope.
3. In a relevant ordinary/free-chat/idol-interaction Prompt, verify the private block appears once.
4. Verify broadcast, public SNS, map and commission Prompts contain no private Pressure.
5. Disable the feature flag and verify the old save loads and normal gameplay continues with no Director injection/request.

- [ ] **Step 7: Perform manual recalculation checks**

1. Use DEBUG manual recalculation twice on the same day.
2. Verify each attempt gets a new jobId/requestId.
3. Verify successful replacement writes `trigger:"manual"` receipt.
4. Verify normal gameplay does not otherwise replace same-day `DailyDirection`.

- [ ] **Step 8: Commit only verification fixes, if any**

If no defect was found, do not create an empty commit. If fixes were required, rerun the affected Task suite and full baseline before committing:

```powershell
git add app.js index.html st.html chronicle/sum-chronicle.js world/director-state.js world/secondary-channel-owner.js world/director-api.js world/director-injection.js world/world-gen-api.js tests/world-director-state.test.mjs tests/secondary-channel-owner.test.mjs tests/world-director-api.test.mjs tests/world-director-injection.test.mjs tests/world-director-integration.test.mjs
git commit -m "fix: close world director acceptance gaps"
```

## Stop Conditions

Stop and request product direction instead of improvising if implementation would require any of the following:

- changing deterministic time, settlement, random or relationship rules;
- deciding whether map/commission/phone/broadcast/gift/First Live/NSFW/choice continuation should receive private Director context;
- converting Director into a queue, event bus, background service or database;
- allowing AI to choose authoritative state paths, pressure ids, time advancement or player choices;
- increasing `<sum>` beyond its current 100-character worldbook contract;
- starting Director automatically after each scene;
- making Director failure block ordinary gameplay.

## Completion Gate

Implementation is complete only when: accepted-final digest commit is idempotent; `world/daily/tier/test/director` share exact secondary ownership; old scope/job/request/revision cannot commit; same-day Direction is stable except explicit manual recalculation; single `summary_only` evidence cannot create a Pressure; private injection is limited to the three approved builders; the six baseline failures do not increase; and real SillyTavern acceptance is recorded rather than inferred from unit tests.

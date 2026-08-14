# Storyteller S0-S1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在不改变现有游戏行为的前提下，先建立 Storyteller 只读观测层，再生成并展示严格日级的 `StorytellerPlan`。

**Architecture:** 新增 `world/storyteller/` 纯模块，负责观测归一化、节奏统计、计划 schema 和确定性计划构建。`app.js` 只负责收集当前状态、在日切/手动推演安全节点调用计划模块并保存到 Director 子树或独立 Storyteller 子树；不创建 IncidentCandidate，不启动主模型事件回合，不修改数值、时间、随机、任务或现有 Prompt。

**Tech Stack:** 原生 JavaScript、Node `node:test`、现有 `state.freeMode.world` 持久化、现有世界引擎手机视图和 Harness secondary owner。

---

## Scope And Boundaries

本计划只覆盖：

- Phase S0：只读观测、节奏统计、重复指纹和审计诊断。
- Phase S1：日级 `StorytellerPlan` 的 schema、构建、保存、刷新和世界引擎只读展示。

本计划明确不实现：

- `IncidentDefinition` 目录和 `IncidentCandidate` 生成。
- 事件合法性落地门禁。
- 主模型事件附着、SNS、手机邀约、来访和重大事件确认。
- Character Intent、NPC 主动事件和 World Update。
- 每次行动调用次 API。
- 对 `settleAction()`、Prompt 文案、Recovery、数值、随机或时间规则的重构。

## Files And Responsibilities

- Create: `world/storyteller/observations.js` - 纯函数，将当前状态转换为有界观测和事件指纹。
- Create: `world/storyteller/plan.js` - `StorytellerPlan` schema、normalize、默认安全计划和确定性计划构建。
- Create: `tests/storyteller-observations.test.mjs` - S0 观测和指纹测试。
- Create: `tests/storyteller-plan.test.mjs` - S1 schema、节奏预算和计划确定性测试。
- Create: `tests/storyteller-integration.test.mjs` - app.js 加载、日切/手动触发和不改变业务状态的执行级测试。
- Modify: `index.html` - 按依赖顺序加载 Storyteller 纯模块。
- Modify: `st.html` - iframe/宿主加载列表中加入同一模块。
- Modify: `app.js` - 状态 shape、观测采集、日级计划调度、持久化和世界引擎视图读取。
- Modify: `world/director-state.js` only if a narrowly scoped bridge is required; do not merge Storyteller plan fields into `DailyDirection` or `DramaPressure`.
- Modify: `world/director-phone-view.js` only to expose a bounded, read-only Storyteller plan view model if the existing phone app requires it.
- Modify: `tests/world-director-phone-view.test.mjs` and `tests/world-engine-phone-app.test.mjs` only for the new read-only plan display contract.

## Shared Verification Commands

Run from `G:\SillyTavern\SillyTavern\public\hatsu-produce-local`:

```powershell
node --test tests/storyteller-observations.test.mjs
node --test tests/storyteller-plan.test.mjs
node --test tests/storyteller-integration.test.mjs
node --test tests/world-director-state.test.mjs tests/world-director-api.test.mjs tests/world-director-injection.test.mjs tests/world-director-integration.test.mjs tests/world-engine-phone-app.test.mjs
node --check app.js
node --check world/storyteller/observations.js
node --check world/storyteller/plan.js
git diff --check
```

每个 Task 都必须遵循：先写 RED 测试，单独运行并确认失败；写最小实现；单独运行专项测试；运行 `node --check app.js` 和 `git diff --check`；检查该 Task 的 diff 后再进入下一 Task。

### Task 0: Freeze The S0-S1 Baseline

**Files:**
- Test: existing Director/world/Harness suites listed above.
- Create: no production files.

- [ ] **Step 1: Run the baseline suites before adding Storyteller code**

Run:

```powershell
node --test tests/world-director-state.test.mjs tests/world-director-api.test.mjs tests/world-director-injection.test.mjs tests/world-director-integration.test.mjs tests/world-engine-phone-app.test.mjs
node --test tests
```

Expected: Director-specific suites pass; full suite records the current six known baseline failures and no new Storyteller failures.

- [ ] **Step 2: Record the baseline without editing existing failures**

Capture the six failing test names in the implementation handoff. Do not change their assertions as part of this plan.

- [ ] **Step 3: Inspect the current daily checkpoint hooks**

The implementer must locate and document the existing calls to `advanceFreeModeToNextDay`, `maybeFollowWorldDirectorAfterPublicWorld`, `requestManualWorldDirectorRecalculation`, and `renderWorldEnginePhoneApp`. The Storyteller plan must attach only to those safe checkpoints.

### Task 1: S0 Observation Normalization

**Files:**
- Create: `world/storyteller/observations.js`
- Create: `tests/storyteller-observations.test.mjs`

- [ ] **Step 1: Write RED tests for bounded observation extraction**

Add tests with these exact behaviors:

```js
test("buildObservationSnapshot keeps only bounded public runtime facts", () => {
  const snapshot = api.buildObservationSnapshot({
    freeMode: {
      postLiveDay: 3,
      clockMinutes: 810,
      activeLocationId: "courtyard",
      world: { director: { generationPrompt: "SECRET", receipts: [{ reason: "ok" }] } }
    },
    idol: "秦谷美铃",
    pendingActionContext: { action: "training", secret: "do not copy" },
    log: [{ day: 3, round: 1, action: "training", result: "训练完成" }]
  }, { saveScope: "chat-a", currentActors: ["producer", "idol:秦谷美铃"] });

  assert.equal(snapshot.dayKey, "live+3");
  assert.equal(snapshot.locationId, "courtyard");
  assert.deepEqual(snapshot.participants, ["producer", "idol:秦谷美铃"]);
  assert.equal(JSON.stringify(snapshot).includes("SECRET"), false);
  assert.equal(JSON.stringify(snapshot).includes("do not copy"), false);
});

test("buildIncidentFingerprint normalizes order and removes empty values", () => {
  assert.equal(
    api.buildIncidentFingerprint({
      category: "visitor",
      archetypeId: "visit",
      actorIds: ["idol:b", "idol:a"],
      locationId: "courtyard",
      modifierIds: ["rain", ""]
    }),
    "visitor|visit|idol:a,idol:b|courtyard|rain"
  );
});

test("buildRecentStorytellerStats counts intensity and category without changing state", () => {
  const before = JSON.stringify(state);
  const stats = api.buildRecentStorytellerStats(state, { limit: 8 });
  assert.equal(JSON.stringify(state), before);
  assert.ok(Number.isInteger(stats.calmDays));
  assert.ok(Number.isInteger(stats.majorEvents));
});
```

- [ ] **Step 2: Run the observation tests and verify the expected RED failure**

Run: `node --test tests/storyteller-observations.test.mjs`

Expected: FAIL because `world/storyteller/observations.js` and its exported functions do not exist.

- [ ] **Step 3: Implement the minimal pure observation module**

Export `buildObservationSnapshot(state, context)`, `buildIncidentFingerprint(value)`, and `buildRecentStorytellerStats(state, options)`. Enforce these limits in code:

- at most 12 recent scene records;
- at most 8 participants per snapshot;
- at most 160 characters per text label;
- only scalar counters, IDs, day/time/location, category and severity metadata;
- never copy `lastPrompt`, `generationPrompt`, `lastStory`, API configuration, full logs, Harness trace or reply正文.

Use stable sorting for actor and modifier IDs. The module must not call `saveState`, `Date.now` for identity, random APIs, DOM APIs or mutate its input.

- [ ] **Step 4: Run GREEN verification**

Run: `node --test tests/storyteller-observations.test.mjs`

Expected: all observation tests pass.

- [ ] **Step 5: Run syntax and diff checks, then inspect the Task 1 diff**

Run:

```powershell
node --check app.js
node --check world/storyteller/observations.js
git diff --check
git diff -- world/storyteller/observations.js tests/storyteller-observations.test.mjs
```

### Task 2: S0 Runtime Observation Hook

**Files:**
- Modify: `app.js` at the existing accepted-final digest/day checkpoint helpers.
- Modify: `index.html` and `st.html` only if module loading is required by Task 1.
- Test: `tests/storyteller-integration.test.mjs`

- [ ] **Step 1: Write RED execution tests**

Test that the observation hook:

1. runs after an accepted final reply or completed day checkpoint;
2. writes only a bounded observation record under a dedicated Storyteller subtree;
3. does not call a model, clear input, alter `state.Vo/Da/Vi/stamina/stress/trust`, advance time, append normal gameplay logs, or change `state.harness.activeTurn`;
4. ignores stale/rejected replies;
5. is isolated by `saveScope`.

The test must use an execution harness with counters for `saveState`, `requestHostPromptSend`, `advanceFreeModeTime`, and `state.log` snapshots; source assertions alone are insufficient.

- [ ] **Step 2: Run the integration test and confirm RED**

Run: `node --test tests/storyteller-integration.test.mjs`

Expected: FAIL because no Storyteller observation hook exists.

- [ ] **Step 3: Add the smallest persisted observation shape**

Under `state.freeMode.world.storyteller`, add only:

```js
{
  schemaVersion: 1,
  observations: [],
  recentFingerprints: [],
  lastObservedDayKey: ""
}
```

Store only allowlisted observation metadata and cap each list. Use a helper `recordStorytellerObservation(state, observation, saveScope)` that refuses a mismatched or empty scope and returns `{ recorded, reason }`.

Call it only after existing accepted-final ACK processing or after the existing public-world day checkpoint has completed. It must not initiate S1 generation.

- [ ] **Step 4: Run GREEN execution tests**

Run: `node --test tests/storyteller-integration.test.mjs`

Expected: observation tests pass and no business-state counters change.

- [ ] **Step 5: Verify syntax, diff and existing Director integration**

Run the Task 2 commands from the shared verification list, then run the Director integration suite. Inspect only the Task 2 diff before continuing.

### Task 3: StorytellerPlan Schema And Safe Defaults

**Files:**
- Create: `world/storyteller/plan.js`
- Create: `tests/storyteller-plan.test.mjs`

- [ ] **Step 1: Write RED tests for plan normalization**

Cover:

- default safe plan is `normal` with zero major budget;
- invalid pacing/category/severity values normalize to safe enums;
- category weights are bounded and unknown categories removed;
- `saveScope`, `dayKey`, `planId`, `seed` and `generatedByJobId` are bounded;
- plan normalization never copies Prompt, reply text or full state;
- `normalizeStorytellerPlan(null)` returns a valid idle/empty representation rather than throwing.

- [ ] **Step 2: Run RED**

Run: `node --test tests/storyteller-plan.test.mjs`

Expected: FAIL because the plan module is not present.

- [ ] **Step 3: Implement plan schema and pure builders**

Export:

```js
defaultStorytellerPlan(dayKey, saveScope)
normalizeStorytellerPlan(value)
buildStorytellerPlan(input)
isCurrentStorytellerPlan(plan, dayKey, saveScope)
```

`buildStorytellerPlan(input)` must be deterministic for the same `dayKey`, `saveScope`, observation stats and seed. It produces pacing, category weights, severity budget and diversity constraints only. It must not produce `IncidentCandidate` objects or choose concrete actors/locations.

Use conservative rules:

- `calmDays >= 2` may raise visitor/resource/positive opportunity weights but never force a major event;
- recent major events set major budget to zero during cooldown;
- repeated category/archetype streaks reduce that category weight and increase untouched-category preference;
- no evidence or invalid input returns the safe default plan.

- [ ] **Step 4: Run GREEN**

Run: `node --test tests/storyteller-plan.test.mjs`

Expected: all plan schema and determinism tests pass.

- [ ] **Step 5: Run syntax and diff checks**

Run `node --check app.js`, `node --check world/storyteller/plan.js`, and `git diff --check`; inspect the Task 3 diff.

### Task 4: Persist And Schedule The Daily Plan

**Files:**
- Modify: `app.js` at `ensureStateShape`, the existing day-change follow-up, and `requestManualWorldDirectorRecalculation` adjacency.
- Modify: `index.html` and `st.html` only if required to load `plan.js` before `app.js`.
- Test: `tests/storyteller-integration.test.mjs`

- [ ] **Step 1: Write RED execution tests**

Cover these exact behaviors:

1. A completed day checkpoint creates at most one current-day plan.
2. Repeating the same checkpoint does not replace a committed current-day plan.
3. Manual world-engine recalculation can explicitly replace the current-day plan only after existing confirmation and owner checks.
4. A busy primary or secondary model channel leaves the previous plan and input state unchanged.
5. Plan generation never calls `requestHostSecondaryPromptSend` in S1; it is local and deterministic.
6. Switching `saveScope` makes the old plan non-current and prevents it from being displayed or reused.

- [ ] **Step 2: Run RED**

Run: `node --test tests/storyteller-integration.test.mjs`

Expected: FAIL because no persisted plan or scheduler exists.

- [ ] **Step 3: Implement the minimal scheduler**

Add `state.freeMode.world.storyteller.plan` and a helper:

```js
function ensureStorytellerPlanForCheckpoint(trigger, options = {}) { /* ... */ }
```

Rules:

- accepted trigger values are `day_change` and `manual`;
- day change returns the existing current plan without saving again;
- manual replacement requires the existing UI confirmation path and no active model owner;
- plan creation occurs after deterministic public-world day settlement, never before it;
- no Storyteller plan call changes `state.day`, `postLiveDay`, clock, stats, tasks, random candidates, normal log or Harness active turn;
- failed plan construction retains the previous current plan and records a bounded retryable reason;
- only `saveState("storyteller.plan_committed")` persists a newly committed plan.

Do not reuse `director.activeJob`, `directorRevision`, `chronicleRevision`, `persistenceRevision` or `hostSaveSequence` as the Storyteller plan identity. Store a separate `planId`, `seed` and `generatedByJobId` reference.

- [ ] **Step 4: Run GREEN and regression suites**

Run the integration suite, all Director suites, `node --check app.js`, and `git diff --check`. Confirm the existing six baseline failures do not increase.

- [ ] **Step 5: Inspect Task 4 diff before continuing**

Review only the changed scheduler, state shape, loader and tests. Verify no Prompt builder or settleAction changes are present.

### Task 5: Read-Only World Engine Plan View

**Files:**
- Modify: `world/director-phone-view.js` or create `world/storyteller/phone-view.js` if keeping responsibilities separate is clearer.
- Modify: `app.js` world-engine rendering functions around `renderWorldEngineToday` and `renderWorldEngineRuntime`.
- Modify: `index.html` only for a bounded plan status container if needed.
- Test: `tests/world-engine-phone-app.test.mjs` and `tests/world-director-phone-view.test.mjs`.

- [ ] **Step 1: Write RED tests**

Verify that the world-engine app displays only:

- current day key and plan status;
- pacing label;
- category weight labels;
- minor/moderate/major budget;
- novelty and cooldown summary;
- last plan error/reason without Prompt or full IDs.

Also verify the renderer is pure: opening or refreshing the app cannot save, call either model, normalize the Director subtree, or mutate the Storyteller plan.

- [ ] **Step 2: Run RED**

Run the two phone view suites and confirm the new plan assertions fail before implementation.

- [ ] **Step 3: Implement the bounded read-only view**

Expose a view model with short labels and suffix-only identifiers. Escape all model-provided strings using the existing rendering helper. Do not show `seed`, full `planId`, `saveScope`, Prompt, API key, reply text or full audit payload.

- [ ] **Step 4: Run GREEN and UI regression tests**

Run both phone suites, Director integration, `node --check app.js`, and `git diff --check`.

### Task 6: Combined S0-S1 Acceptance

**Files:**
- Modify: no production files unless a test exposes a defect in Tasks 1-5.
- Test: all existing and new Storyteller suites.

- [ ] **Step 1: Run focused Storyteller suites**

```powershell
node --test tests/storyteller-observations.test.mjs tests/storyteller-plan.test.mjs tests/storyteller-integration.test.mjs
```

Expected: all new tests pass.

- [ ] **Step 2: Run Director/Harness/world regression suites**

```powershell
node --test tests/world-director-state.test.mjs tests/world-director-api.test.mjs tests/world-director-injection.test.mjs tests/world-director-integration.test.mjs tests/harness-recovery.test.mjs tests/secondary-channel-owner.test.mjs tests/world-engine-phone-app.test.mjs
```

Expected: no new failures beyond the recorded baseline.

- [ ] **Step 3: Run full suite and syntax checks**

```powershell
node --test tests
node --check app.js
node --check world/storyteller/observations.js
node --check world/storyteller/plan.js
git diff --check
```

- [ ] **Step 4: Manual acceptance in SillyTavern**

1. Open a sandbox chat and record the current world-engine runtime view.
2. Complete one normal action; verify only observation metadata changes and no Storyteller secondary request starts.
3. Advance to the next day; verify one plan appears for the new day.
4. Repeat refresh/day checkpoint; verify the same plan identity and no duplicate save churn.
5. Click manual recalculation; verify confirmation and owner checks, then verify the current plan updates only after the operation completes.
6. Start a primary or secondary request and attempt manual recalculation; verify input, state, UI and logs remain unchanged except for a rejection toast/debug event.
7. Switch chats; verify the previous plan is not displayed or reused.
8. Inspect the world-engine app and confirm no Prompt, API key, full plan ID, full saveScope or full state is visible.

- [ ] **Step 5: Report the S0-S1 handoff**

Report changed files/functions, each Task's RED/GREEN result and diff summary, full test count and baseline failures, manual acceptance results, and explicitly state that IncidentCandidate and event landing remain unimplemented.

## Stop Conditions

Pause and ask before proceeding if any of these occur:

- plan generation would need to modify deterministic settlement or Prompt wording;
- Storyteller needs to acquire the primary model owner in S1;
- current `saveScope` behavior cannot isolate plans;
- a proposed change would merge Storyteller state into Director revisions or change existing Recovery semantics;
- a test requires changing one of the six known baseline failures rather than adding a focused regression.

## Completion Gate

S0-S1 is complete only when:

1. observations are bounded, pure and do not contain Prompt or正文;
2. a deterministic, current-day `StorytellerPlan` can be built and persisted;
3. repeated same-day checkpoints do not replace the plan;
4. manual recalculation is explicit and respects current model ownership;
5. the phone app exposes plan state read-only;
6. no IncidentCandidate is created and no event request is started;
7. existing Director/Harness behavior and the six-failure baseline are unchanged.

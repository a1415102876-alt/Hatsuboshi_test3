# N.I.A Multi-Period Training Day Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand each committed N.I.A companion-training plan day into two freely chosen Hatsu-style cultivation periods followed by one single-scene campus activity, while advancing the five-day plan only once.

**Architecture:** Extend `nia-training-core.js` with a pure nested-day state machine and keep `app.js` as the owner of rendering, ordinary-action settlement, SillyTavern requests, VN playback, and persistence. Morning and afternoon reuse the existing lesson/training/rest path; evening uses the existing outing destination overlay populated with campus locations, then dispatches one dedicated main-model request. The nested state stores morning/afternoon story summaries so every later prompt explicitly continues the same day.

**Tech Stack:** Vanilla JavaScript, existing SillyTavern postMessage bridge and Harness, HTML/CSS, Node.js built-in test runner.

---

## File Map

- Modify `nia-training-core.js`: normalize the nested training-day runtime, decide which actions are legal, advance internal periods idempotently, and advance the outer plan only after evening.
- Modify `app.js`: render Hatsu actions for the first two periods, append zero-cost chat/interaction actions, add N.I.A continuity to prompts, reuse the outing overlay for campus selection, own the evening API request, and persist/resume each phase.
- Modify `index.html`: add N.I.A-specific copy hooks to the existing outing overlay without duplicating the modal.
- Modify `style.css`: add only phase-label and campus-mode presentation rules needed by the reused action area and outing overlay.
- Modify `tests/nia-training-core.test.mjs`: pure state-machine and idempotency coverage.
- Modify `tests/nia-training-flow.test.mjs`: source-level integration contracts for rendering, settlement, prompt continuity, request routing, and outer-day advancement.
- Modify `tests/nia-training-ui.test.mjs`: stable DOM/CSS hooks for the period indicator and campus destination mode.

## Constraints

- Do not change the producer-workday companion-training option; it remains one of three producer-work periods.
- Do not change ordinary Hatsu, sandbox, independent N.I.A outing, business, or producer-work behavior.
- `freechat` and `interaction` retain their existing zero-action, zero-reward, unlimited behavior.
- A model request may complete a nested period only after its VN result has played. Failed, stale, or duplicate replies cannot advance the period.
- The evening campus activity is one complete scene and one model request. It must not use the ordinary outing choice-opening/choice-resolution pair.
- Use the existing campus location records from `WORLD_MAP_LOCATIONS`; do not create a second location catalogue.

### Task 1: Pure Nested Training-Day Runtime

**Files:**
- Modify: `nia-training-core.js`
- Test: `tests/nia-training-core.test.mjs`

- [ ] **Step 1: Add failing normalization and phase tests**

Add imports for the new helpers and the following tests:

```js
const {
  normalizeNiaTraining,
  ensureCompanionTrainingDay,
  getCompanionTrainingPhase,
  completeCompanionTrainingPeriod,
  completeCompanionTrainingCampusActivity
} = globalThis.HatsuNiaTraining;

test('normalizes a resumable three-phase companion training day', () => {
  const training = normalizeNiaTraining({
    active: true,
    actionIndex: 1,
    companionDay: {
      planDayIndex: 1,
      periodIndex: 1,
      morningSummary: '上午完成换气练习',
      afternoonSummary: 42,
      campusLocationId: 'student_store',
      processedOperationIds: ['period-a', 'period-a']
    }
  });
  assert.equal(training.companionDay.periodIndex, 1);
  assert.equal(training.companionDay.morningSummary, '上午完成换气练习');
  assert.equal(training.companionDay.afternoonSummary, '');
  assert.deepEqual(training.companionDay.processedOperationIds, ['period-a']);
  assert.equal(getCompanionTrainingPhase(training), 'afternoon');
});

test('advances two internal periods without advancing the outer plan day', () => {
  const morning = completeCompanionTrainingPeriod(
    ensureCompanionTrainingDay({ active: true, actionIndex: 2 }),
    { operationId: 'morning-1', summary: '发现镜头前表情过紧' }
  );
  assert.equal(morning.training.actionIndex, 2);
  assert.equal(morning.training.companionDay.periodIndex, 1);

  const afternoon = completeCompanionTrainingPeriod(morning.training, {
    operationId: 'afternoon-1',
    summary: '通过节奏练习改善了表情'
  });
  assert.equal(afternoon.training.actionIndex, 2);
  assert.equal(getCompanionTrainingPhase(afternoon.training), 'campus');
});

test('completes the outer plan day only after one campus activity', () => {
  const training = normalizeNiaTraining({
    active: true,
    actionIndex: 2,
    companionDay: { planDayIndex: 2, periodIndex: 2 }
  });
  const result = completeCompanionTrainingCampusActivity(training, {
    operationId: 'campus-1', locationId: 'student_store'
  });
  assert.equal(result.completed, true);
  assert.equal(result.training.actionIndex, 3);
  assert.equal(result.training.companionDay, null);
});

test('rejects stale and duplicate nested-day completion operations', () => {
  const start = ensureCompanionTrainingDay({ active: true, actionIndex: 0 });
  const first = completeCompanionTrainingPeriod(start, { operationId: 'same', summary: 'done' });
  const duplicate = completeCompanionTrainingPeriod(first.training, { operationId: 'same', summary: 'again' });
  assert.equal(duplicate.completed, false);
  assert.equal(duplicate.training.companionDay.periodIndex, 1);
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node --test tests/nia-training-core.test.mjs`

Expected: FAIL because the nested-day helpers and `companionDay` state do not exist.

- [ ] **Step 3: Implement the nested runtime**

Extend the normalized training shape with `companionDay: null` and add these pure interfaces:

```js
function ensureCompanionTrainingDay(rawTraining) {
  const training = normalizeNiaTraining(rawTraining);
  if (training.companionDay?.planDayIndex === training.actionIndex) return training;
  return {
    ...training,
    companionDay: {
      planDayIndex: training.actionIndex,
      periodIndex: 0,
      morningSummary: '',
      afternoonSummary: '',
      campusLocationId: '',
      processedOperationIds: []
    }
  };
}

function getCompanionTrainingPhase(training) {
  const period = normalizeNiaTraining(training).companionDay?.periodIndex ?? 0;
  return period <= 0 ? 'morning' : period === 1 ? 'afternoon' : 'campus';
}
```

`completeCompanionTrainingPeriod()` must accept only periods `0` and `1`, require a non-empty operation ID, store a bounded plain-text summary in the matching field, deduplicate the last 12 operation IDs, and leave `actionIndex` unchanged. `completeCompanionTrainingCampusActivity()` must accept only period `2`, increment `actionIndex` exactly once, and clear `companionDay`.

- [ ] **Step 4: Run the focused test and verify GREEN**

Run: `node --test tests/nia-training-core.test.mjs`

Expected: all `nia-training-core` tests PASS.

- [ ] **Step 5: Commit the pure runtime**

```powershell
git add -- nia-training-core.js tests/nia-training-core.test.mjs
git commit -m "feat: add NIA nested training day runtime"
```

### Task 2: Hatsu Action Set for Morning and Afternoon

**Files:**
- Modify: `app.js`
- Test: `tests/nia-training-flow.test.mjs`

- [ ] **Step 1: Add failing action-rendering contracts**

Add tests asserting that the N.I.A companion-training branch calls a focused renderer and that the renderer creates:

```js
for (const attribute of ['Vo', 'Da', 'Vi']) {
  createActionButton(`${attribute}上课`, 'lesson', attribute, statColors[attribute], '上课');
  createActionButton(`${attribute}训练`, 'training', attribute, statColors[attribute], '-12体力');
}
createActionButton('休息', 'rest', null, '#20dfad', '恢复体力');
createActionButton('闲聊', 'freechat', null, '#8c73ff', '行动0');
createActionButton('互动', 'interaction', null, '#ff783f', '行动0');
```

Also assert that the generic one-button `mapNiaPlanAction()` branch remains in place for business, producer work, independent outing, and other plan days.

- [ ] **Step 2: Run the focused flow test and verify RED**

Run: `node --test tests/nia-training-flow.test.mjs`

Expected: FAIL because a companion-training day still renders one inferred training button.

- [ ] **Step 3: Add companion-day detection and action rendering**

Add `isCurrentNiaCompanionTrainingDay()` using the current committed plan entry. In `renderActionButtons()`, branch before the generic N.I.A one-button path:

```js
if (isCurrentNiaCompanionTrainingDay()) {
  state.nia.training = niaTrainingCore.ensureCompanionTrainingDay(state.nia.training);
  renderNiaCompanionTrainingActions(container);
  renderActionHighlights();
  return;
}
```

For phases `morning` and `afternoon`, append the six existing lesson/training buttons, rest, freechat, and interaction. Reuse `createActionButton()` so current icons, SP badges, stamina costs, click delegation, and accessibility remain unchanged. Set `actionModeLabel` to `N.I.A 第 N 日 · 上午` or `N.I.A 第 N 日 · 下午` plus the committed plan title.

For phase `campus`, append one `nia_campus_activity` button plus the same freechat and interaction buttons. Do not render lesson, training, or rest in this phase.

- [ ] **Step 4: Preserve ordinary availability rules**

Change the N.I.A shortcut in `renderActionHighlights()` so only freechat, interaction, and the campus selector are always enabled. Lesson and training must call `hasEnoughStaminaForAction()`, and rest must follow the existing full-stamina restriction. Do not call legacy round availability because N.I.A nested periods do not use `state.round`.

- [ ] **Step 5: Run the focused flow test and verify GREEN**

Run: `node --test tests/nia-training-flow.test.mjs`

Expected: all flow contracts PASS.

- [ ] **Step 6: Commit the action renderer**

```powershell
git add -- app.js tests/nia-training-flow.test.mjs
git commit -m "feat: expose Hatsu actions in NIA training days"
```

### Task 3: Period Completion and Narrative Continuity

**Files:**
- Modify: `app.js`
- Modify: `tests/nia-training-flow.test.mjs`

- [ ] **Step 1: Add failing settlement and prompt tests**

Assert that:

- `isCurrentNiaOrdinaryPlanAction()` accepts `lesson`, `training`, or `rest` only during the first two companion-day periods.
- `completeCurrentNiaOrdinaryActionAfterPlayback()` calls `completeCompanionTrainingPeriod()` for a companion day and the existing `advanceNiaOrdinaryPlanAction()` for all other ordinary N.I.A days.
- The completion operation ID comes from the current Harness turn/request identity rather than `Date.now()`.
- `buildPrompt()` includes a dedicated `buildNiaCompanionTrainingContinuity()` block.

- [ ] **Step 2: Run the flow test and verify RED**

Run: `node --test tests/nia-training-flow.test.mjs`

Expected: FAIL because companion training currently advances the outer `actionIndex` after one action.

- [ ] **Step 3: Route nested-period completion after VN playback**

Update `isCurrentNiaOrdinaryPlanAction()` so the companion-day branch accepts only `lesson`, `training`, and `rest` in morning/afternoon. In `completeCurrentNiaOrdinaryActionAfterPlayback()`, use the accepted reply story as the bounded summary:

```js
const summary = summarizeNiaTrainingPeriodStory(state.lastStory);
const operationId = String(
  state.harness?.activeTurn?.requestId
  || state.pendingActionContext?.actionContext?.operationId
  || state.lastRequestId
  || ''
);
const completion = isCurrentNiaCompanionTrainingDay()
  ? niaTrainingCore.completeCompanionTrainingPeriod(state.nia.training, { operationId, summary })
  : niaTrainingCore.advanceNiaOrdinaryPlanAction(state.nia, state.pendingActionContext);
```

Clear transient VN state only after `completion.completed === true`. Do not call `advanceRound()` for nested N.I.A periods; existing Hatsu/sandbox paths stay unchanged.

- [ ] **Step 4: Add explicit same-day continuity to ordinary prompts**

Implement `buildNiaCompanionTrainingContinuity()` to return an empty string outside a companion day. Its morning text establishes the committed plan purpose and current difficulty. Its afternoon text includes `morningSummary` and requires continuation rather than a reset. Append the block to `buildPrompt()` after the existing general continuity section.

Required afternoon rules:

```text
- 直接承接上午已经发生的训练结果，不要重新介绍同一个困难。
- 本次必须验证上午的方法、巩固成果、调整路径，或处理上午暴露的新问题。
- 即使玩家再次选择相同属性，也不能复刻上午的场景结构和对白。
- 本次回复结束时写清楚下午取得的实际进展，供傍晚活动继续承接。
```

- [ ] **Step 5: Keep failed generation retryable without double settlement**

Persist the current Harness turn and nested `periodIndex` before dispatch. A failed/stale reply must leave `periodIndex` unchanged. While the same Harness turn is pending or recoverable, block a second click from applying the same action delta again; recovery resends the captured prompt. If the user explicitly abandons the turn through the existing Harness recovery control, restore the turn's pre-settlement stat snapshot before clearing it. Add one focused source contract proving the N.I.A rollback hook is called from the existing abandon path.

- [ ] **Step 6: Run focused tests and verify GREEN**

Run: `node --test tests/nia-training-core.test.mjs tests/nia-training-flow.test.mjs`

Expected: all tests PASS.

- [ ] **Step 7: Commit period settlement and continuity**

```powershell
git add -- app.js tests/nia-training-flow.test.mjs
git commit -m "feat: connect NIA training period narratives"
```

### Task 4: Reuse the Outing Overlay for Campus Selection

**Files:**
- Modify: `index.html`
- Modify: `style.css`
- Modify: `app.js`
- Modify: `tests/nia-training-ui.test.mjs`
- Modify: `tests/nia-training-flow.test.mjs`

- [ ] **Step 1: Add failing campus-mode UI tests**

Assert that the existing `outingOverlay` contains stable title, note, custom-field, and destination-list hooks, and that `openOutingOverlay()` branches on the N.I.A campus phase. Assert the N.I.A branch uses `WORLD_MAP_LOCATIONS`, excludes the school entrance/off-campus path, and does not call `enterFreeMode()`.

- [ ] **Step 2: Run UI and flow tests and verify RED**

Run: `node --test tests/nia-training-ui.test.mjs tests/nia-training-flow.test.mjs`

Expected: FAIL because the outing overlay always renders off-campus destinations.

- [ ] **Step 3: Add semantic copy hooks to the existing overlay**

Give the existing overlay title and explanatory paragraph stable IDs such as `outingOverlayTitle` and `outingOverlayNote`. Wrap the custom destination input in `outingCustomField` so it can be hidden in N.I.A campus mode. Do not duplicate the overlay.

- [ ] **Step 4: Populate eligible campus locations in N.I.A evening**

Add `getNiaCampusActivityLocations()` that filters `WORLD_MAP_LOCATIONS` to actual campus destinations and omits `school_entrance`. In `openOutingOverlay()`:

```js
const campusMode = isNiaCompanionTrainingCampusPhase();
const destinations = campusMode ? getNiaCampusActivityLocations() : outingDestinations;
title.textContent = campusMode ? '选择校内自由活动地点' : '选择外出地点';
note.textContent = campusMode
  ? '选择一处校内地点，与担当偶像度过训练后的傍晚。'
  : existingOutingNote;
customField.hidden = campusMode;
```

Render each campus record's existing `name` and `description`. Route selection through `confirmNiaCampusActivityLocation(location.id)` in campus mode; preserve `confirmOutingDestination()` for every other mode.

- [ ] **Step 5: Style campus mode without changing ordinary outing layout**

Use a modifier class on `outingOverlay`, keep the existing destination-card dimensions, hide only the custom field, and ensure long campus descriptions wrap without changing button height after hover.

- [ ] **Step 6: Run focused tests and verify GREEN**

Run: `node --test tests/nia-training-ui.test.mjs tests/nia-training-flow.test.mjs`

Expected: all tests PASS.

- [ ] **Step 7: Commit campus selection**

```powershell
git add -- index.html style.css app.js tests/nia-training-ui.test.mjs tests/nia-training-flow.test.mjs
git commit -m "feat: add campus activity selection to NIA training"
```

### Task 5: One-Request Campus Activity and Outer-Day Completion

**Files:**
- Modify: `app.js`
- Modify: `tests/nia-training-flow.test.mjs`

- [ ] **Step 1: Add failing request-lifecycle tests**

Add contracts for these focused functions:

```js
buildNiaCampusActivityPrompt(location)
startNiaCampusActivity(locationId)
isCurrentNiaCampusActivityReply(requestId)
handleNiaCampusActivityReply(text, rawText, renderedText, requestId, isFinal)
completeNiaCampusActivityAfterPlayback()
```

Assert one `requestHostPromptSend()` call, one primary-channel owner kind `nia_campus_activity`, no ordinary `settleAction('outing')`, and one call to `completeCompanionTrainingCampusActivity()` after VN playback.

- [ ] **Step 2: Run the flow test and verify RED**

Run: `node --test tests/nia-training-flow.test.mjs`

Expected: FAIL because no N.I.A campus request lifecycle exists.

- [ ] **Step 3: Build the complete-scene prompt**

`buildNiaCampusActivityPrompt(location)` must include:

- current idol, producer profile, committed round goal, public image, and current plan-day purpose;
- the selected campus location name and description;
- both `morningSummary` and `afternoonSummary`;
- a requirement to show arrival, interaction, reflection or relaxation, and a complete same-day ending;
- a prohibition on options, fan totals, additional training settlement, continuous map exploration, and a new unresolved cliffhanger;
- the existing `outputContract()` wrapper and world/director context used by ordinary produce prompts.

- [ ] **Step 4: Implement the dedicated primary-model lifecycle**

`startNiaCampusActivity()` validates N.I.A mode, campus phase, location ID, and primary-channel availability. It creates an operation/request ID, stores `campusLocationId`, acquires owner kind `nia_campus_activity`, opens the existing VN overlay in a waiting state, and sends exactly one prompt.

`handleNiaCampusActivityReply()` accepts only the active request, supports streaming display without settlement, selects the rendered reply source at final completion, stores the final story, clears the channel lease, acknowledges the reply, and starts normal VN playback. Invalid final text keeps the phase retryable and does not advance `actionIndex`.

- [ ] **Step 5: Complete the day only after VN playback**

Add a campus-activity branch to `handleVnSlidesEnd()` and the manual event-close path. `completeNiaCampusActivityAfterPlayback()` calls:

```js
niaTrainingCore.completeCompanionTrainingCampusActivity(state.nia.training, {
  operationId: state.pendingActionContext.actionContext.operationId,
  locationId: state.pendingActionContext.actionContext.locationId
});
```

On success, clear request/VN transients, save with a dedicated reason, render the next committed N.I.A plan day, and keep `training.active` true. Duplicate completion returns without changing state.

- [ ] **Step 6: Run focused tests and verify GREEN**

Run: `node --test tests/nia-training-core.test.mjs tests/nia-training-flow.test.mjs tests/nia-training-ui.test.mjs`

Expected: all tests PASS.

- [ ] **Step 7: Commit the evening lifecycle**

```powershell
git add -- app.js tests/nia-training-flow.test.mjs
git commit -m "feat: complete NIA training days with campus scenes"
```

### Task 6: Persistence, Regression Verification, and SillyTavern Smoke Test

**Files:**
- Modify: `tests/nia-host-bridge.test.mjs`
- Verify: `app.js`, `st.html`, `nia-training-core.js`, `index.html`, `style.css`

- [ ] **Step 1: Add one saved-state recovery contract**

Create a test fixture with `launchMode: 'nia'`, active training, a companion plan day, `periodIndex: 1`, and a morning summary. Assert normalization preserves the afternoon phase and rendering does not reset it to morning. Add a second fixture with `periodIndex: 2` and a selected campus location to prove refresh resumes campus selection without advancing the outer plan.

- [ ] **Step 2: Run all N.I.A tests**

Run:

```powershell
$files = Get-ChildItem tests -Filter 'nia-*.test.mjs' | ForEach-Object { $_.FullName }
node --test $files
```

Expected: all N.I.A tests PASS with zero failures.

- [ ] **Step 3: Run syntax and diff checks**

Run:

```powershell
node --check app.js
node --check nia-training-core.js
git diff --check -- app.js nia-training-core.js index.html style.css tests/nia-training-core.test.mjs tests/nia-training-flow.test.mjs tests/nia-training-ui.test.mjs
```

Expected: every command exits `0`; no whitespace errors are reported.

- [ ] **Step 4: Smoke-test inside SillyTavern**

Use the real `st.html` embedded route, not the standalone `8765` prototype:

1. Resume or seed a committed N.I.A plan whose current day is companion training.
2. Confirm the morning screen shows six Vo/Da/Vi lesson/training buttons, rest, freechat, and interaction.
3. Complete one action and confirm the afternoon screen remains on the same outer N.I.A day.
4. Complete a different action and confirm only the campus activity button remains alongside freechat/interaction.
5. Open campus selection and confirm no off-campus or custom destination is available.
6. Select a campus location and confirm SillyTavern generates exactly one complete VN scene that references both earlier periods.
7. Close the VN and confirm the next N.I.A plan day appears exactly once.
8. Refresh during afternoon and campus phases to confirm recovery preserves the phase.

- [ ] **Step 5: Review mode isolation**

Open ordinary Hatsu and sandbox once each. Confirm their action buttons, round progression, outing overlay, free-mode map, chat/interaction behavior, and save restoration remain unchanged. Confirm a producer-workday companion-training period still occupies only one of its three work periods.

- [ ] **Step 6: Commit the saved-state recovery tests**

```powershell
git add -- tests/nia-host-bridge.test.mjs
git commit -m "test: cover NIA multi-period training recovery"
```

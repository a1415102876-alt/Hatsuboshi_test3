# Storyteller Style Mix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add next-day player-configurable Heroic/Romance Storyteller weighting that influences both Director focus threads and deterministic legal incident disturbances without changing authoritative settlement or existing Harness semantics.

**Architecture:** Add one pure style module responsible for normalization, pending/active activation, streak state and deterministic style weighting. Extend the current Director, Storyteller Plan and Incident Candidate schemas in place; reuse the existing candidate attachment, notification, ownership, recovery, validation and accepted-final commit paths.

**Tech Stack:** Browser JavaScript IIFEs, DOM APIs, existing global module registry, Node.js `node:test`, existing VM-based execution tests, HTML/CSS phone UI.

---

## File Structure

- Create `world/storyteller/styles.js`: pure style configuration, activation, eligibility weight normalization and one-shot anti-streak state.
- Create `tests/storyteller-styles.test.mjs`: executable unit tests for style state and deterministic weighting.
- Modify `index.html`: load `styles.js` before Storyteller Plan and Incident modules; add settings controls.
- Modify `app.js`: initialize/migrate style state, activate pending settings at day transition, pass frozen style context, save UI changes and render style diagnostics.
- Modify `world/storyteller/plan.js`: schema v2 Plan normalization and daily style snapshot.
- Modify `world/director-state.js`: DailyDirection v2 style-thread normalization and atomic state persistence.
- Modify `world/director-api.js`: style-aware input/output contract and strict validation.
- Modify `world/director-injection.js`: separate bounded Heroic and Romance long-term guidance.
- Modify `world/director-phone-view.js`: expose separate style threads to the phone view model.
- Modify `world/storyteller/incidents.js`: style-capable definitions, candidate schema, legal style filtering, deterministic choice, disturbance construction and exact revalidation.
- Modify `world/storyteller/injection.js`: inject open disturbances without outcomes or authority changes.
- Modify `world/storyteller/observations.js`: record committed style and maintain bounded streak history.
- Modify `world/storyteller/phone-view.js`: bounded style mix, selection diagnostic, streak and recent distribution models.
- Modify `style.css`: phone-sized style settings and diagnostics layout.
- Modify focused existing tests listed in each task; do not restructure unrelated tests.

Implementation commits are not authorized by this plan alone. After each task, inspect the focused diff and leave changes uncommitted unless the user explicitly requests a commit.

### Task 1: Pure Style Configuration And Save Migration

**Files:**
- Create: `world/storyteller/styles.js`
- Create: `tests/storyteller-styles.test.mjs`
- Modify: `index.html:1616`
- Modify: `app.js:2361-2374`
- Modify: `app.js:3740-3772`
- Test: `tests/storyteller-styles.test.mjs`
- Test: `tests/world-director-state.test.mjs`

- [ ] **Step 1: Write failing executable tests for defaults, normalization and migration**

Create a VM loader matching the other Storyteller tests and assert these exact behaviors:

```js
test("style config defaults to 60 heroic 40 romance and disabled kaibunsho", () => {
  const api = loadStylesApi();
  assert.deepEqual(api.defaultStyleMix(), { heroic: 60, romance: 40, kaibunsho: 0 });
  assert.deepEqual(api.defaultStyleConfig("live+1"), {
    schemaVersion: 1,
    activeMix: { heroic: 60, romance: 40, kaibunsho: 0 },
    pendingMix: { heroic: 60, romance: 40, kaibunsho: 0 },
    styleMixRevision: 0,
    activeFromDayKey: "live+1",
    pendingActivationDayKey: "",
    legacyUntilDayChange: false
  });
});

test("old saves defer default style activation until the next day", () => {
  const api = loadStylesApi();
  const migrated = api.normalizeStyleConfig(null, {
    currentDayKey: "live+4",
    nextDayKey: "live+5",
    existingSave: true
  });
  assert.equal(migrated.legacyUntilDayChange, true);
  assert.equal(migrated.pendingActivationDayKey, "live+5");
  assert.deepEqual(migrated.pendingMix, { heroic: 60, romance: 40, kaibunsho: 0 });
});

test("invalid percentages normalize to the last valid mix", () => {
  const api = loadStylesApi();
  const previous = api.defaultStyleConfig("live+2");
  const normalized = api.normalizeStyleConfig({
    ...previous,
    pendingMix: { heroic: 63, romance: 50, kaibunsho: 9 }
  }, { currentDayKey: "live+2", previous });
  assert.deepEqual(normalized.pendingMix, previous.pendingMix);
});
```

- [ ] **Step 2: Run the new tests and verify RED**

Run:

```powershell
node --test tests/storyteller-styles.test.mjs
```

Expected: FAIL because `world/storyteller/styles.js` and `HatsuWorldStorytellerStyles` do not exist.

- [ ] **Step 3: Implement the pure style state module**

Expose a bounded API with no DOM, save or network access:

```js
(function (global) {
  "use strict";

  const STYLE_IDS = Object.freeze(["heroic", "romance", "kaibunsho"]);
  const DEFAULT_MIX = Object.freeze({ heroic: 60, romance: 40, kaibunsho: 0 });

  function defaultStyleMix() {
    return { ...DEFAULT_MIX };
  }

  function isValidMix(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return false;
    const heroic = Number(value.heroic);
    const romance = Number(value.romance);
    const kaibunsho = Number(value.kaibunsho);
    return [heroic, romance, kaibunsho].every((item) => Number.isInteger(item) && item >= 0 && item <= 100 && item % 5 === 0)
      && heroic + romance + kaibunsho === 100
      && kaibunsho === 0;
  }

  function normalizeMix(value, fallback = DEFAULT_MIX) {
    return isValidMix(value) ? { heroic: value.heroic, romance: value.romance, kaibunsho: 0 } : { ...fallback };
  }

  function defaultStyleConfig(dayKey = "") {
    return {
      schemaVersion: 1,
      activeMix: defaultStyleMix(),
      pendingMix: defaultStyleMix(),
      styleMixRevision: 0,
      activeFromDayKey: String(dayKey || "").slice(0, 120),
      pendingActivationDayKey: "",
      legacyUntilDayChange: false
    };
  }

  function defaultStyleStreak() {
    return { styleId: "", committedCount: 0, penaltyArmed: false };
  }

  function boundedText(value, max = 120) {
    return Array.from(String(value || "").trim()).slice(0, max).join("");
  }

  function boundedRevision(value) {
    const number = Number(value);
    return Number.isInteger(number) && number >= 0 ? number : 0;
  }

  function sameMix(left, right) {
    return STYLE_IDS.every((id) => Number(left?.[id]) === Number(right?.[id]));
  }

  function normalizeStyleConfig(value, options = {}) {
    const source = value && typeof value === "object" && !Array.isArray(value) ? value : null;
    const previous = options.previous && typeof options.previous === "object" ? options.previous : null;
    const currentDayKey = boundedText(options.currentDayKey);
    const nextDayKey = boundedText(options.nextDayKey);
    if (!source) {
      const created = defaultStyleConfig(currentDayKey);
      if (options.existingSave) {
        created.activeFromDayKey = "";
        created.pendingActivationDayKey = nextDayKey;
        created.legacyUntilDayChange = true;
      }
      return created;
    }
    const fallbackActive = isValidMix(previous?.activeMix) ? previous.activeMix : DEFAULT_MIX;
    const activeMix = normalizeMix(source.activeMix, fallbackActive);
    const fallbackPending = isValidMix(previous?.pendingMix) ? previous.pendingMix : activeMix;
    return {
      schemaVersion: 1,
      activeMix,
      pendingMix: normalizeMix(source.pendingMix, fallbackPending),
      styleMixRevision: boundedRevision(source.styleMixRevision),
      activeFromDayKey: boundedText(source.activeFromDayKey),
      pendingActivationDayKey: boundedText(source.pendingActivationDayKey),
      legacyUntilDayChange: Boolean(source.legacyUntilDayChange)
    };
  }

  function normalizeStyleStreak(value) {
    const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
    const styleId = ["heroic", "romance"].includes(source.styleId) ? source.styleId : "";
    const committedCount = styleId ? Math.max(0, Math.min(99, Math.floor(Number(source.committedCount) || 0))) : 0;
    return { styleId, committedCount, penaltyArmed: Boolean(styleId && source.penaltyArmed) };
  }

  function setPendingMix(value, mix, activationDayKey) {
    const config = normalizeStyleConfig(value);
    if (!isValidMix(mix) || !boundedText(activationDayKey)) return config;
    return {
      ...config,
      pendingMix: normalizeMix(mix),
      pendingActivationDayKey: boundedText(activationDayKey)
    };
  }

  function activatePendingMix(value, dayKey) {
    const config = normalizeStyleConfig(value);
    const targetDayKey = boundedText(dayKey);
    const due = Boolean(targetDayKey && config.pendingActivationDayKey === targetDayKey);
    const changed = !sameMix(config.activeMix, config.pendingMix);
    if (!due || (!changed && !config.legacyUntilDayChange)) return { config, activated: false };
    return {
      activated: true,
      config: {
        ...config,
        activeMix: { ...config.pendingMix },
        styleMixRevision: config.styleMixRevision + (changed ? 1 : 0),
        activeFromDayKey: targetDayKey,
        pendingActivationDayKey: "",
        legacyUntilDayChange: false
      }
    };
  }

  global.HatsuWorldStorytellerStyles = {
    STYLE_IDS,
    defaultStyleMix,
    defaultStyleConfig,
    defaultStyleStreak,
    isValidMix,
    normalizeMix,
    normalizeStyleConfig,
    normalizeStyleStreak,
    setPendingMix,
    activatePendingMix
  };
})(typeof globalThis !== "undefined" ? globalThis : window);
```

`activatePendingMix` returns `{ config, activated }`; it increments `styleMixRevision` only when the pending mix differs and its activation day equals the supplied day. Migration marks `legacyUntilDayChange` and leaves current-day Plans untouched.

- [ ] **Step 4: Wire loading and state normalization**

Load the module before `observations.js`:

```html
<script src="./world/storyteller/styles.js"></script>
<script src="./world/storyteller/observations.js"></script>
```

Add `styleConfig` and `styleStreak` to the new-state Storyteller object. In `ensureStateShape()`, normalize them through the new module using the current and next day keys. Detect an existing save from the presence of Storyteller/Director data, not from a global save version.

- [ ] **Step 5: Run focused verification**

Run:

```powershell
node --test tests/storyteller-styles.test.mjs tests/world-director-state.test.mjs
node --check world/storyteller/styles.js
node --check app.js
git diff --check
git diff --stat -- world/storyteller/styles.js tests/storyteller-styles.test.mjs index.html app.js
```

Expected: all focused tests pass; syntax and diff checks return exit code 0. Inspect that no Director Plan, active candidate, numeric state or Harness field is changed during migration.

### Task 2: Next-Day Activation And Storyteller Plan V2

**Files:**
- Modify: `world/storyteller/styles.js`
- Modify: `world/storyteller/plan.js`
- Modify: `app.js:3906-3955`
- Modify: `app.js:11896-11922`
- Modify: `tests/storyteller-styles.test.mjs`
- Modify: `tests/storyteller-plan.test.mjs`
- Modify: `tests/storyteller-integration.test.mjs`

- [ ] **Step 1: Write failing tests for activation and frozen Plans**

Add tests proving:

```js
test("a changed pending mix activates once on its target day", () => {
  const pending = api.setPendingMix(api.defaultStyleConfig("live+2"), {
    heroic: 35, romance: 65, kaibunsho: 0
  }, "live+3");
  const first = api.activatePendingMix(pending, "live+3");
  const second = api.activatePendingMix(first.config, "live+3");
  assert.equal(first.activated, true);
  assert.equal(first.config.styleMixRevision, 1);
  assert.deepEqual(first.config.activeMix, { heroic: 35, romance: 65, kaibunsho: 0 });
  assert.equal(second.activated, false);
  assert.equal(second.config.styleMixRevision, 1);
});

test("storyteller plan freezes style mix and revision", () => {
  const plan = planApi.buildStorytellerPlan({
    ...input,
    styleMix: { heroic: 35, romance: 65, kaibunsho: 0 },
    styleMixRevision: 4
  });
  assert.equal(plan.schemaVersion, 2);
  assert.equal(plan.styleMixRevision, 4);
  assert.deepEqual(plan.styleMix, { heroic: 35, romance: 65, kaibunsho: 0 });
});
```

Integration assertions must prove `advanceFreeModeToNextDay()` activates the pending mix before `ensureStorytellerPlanForCheckpoint("day_change")` and `prepareWorldDirectorJob("day_change")`. Manual planning must not call activation.

- [ ] **Step 2: Run the focused tests and verify RED**

Run:

```powershell
node --test tests/storyteller-styles.test.mjs tests/storyteller-plan.test.mjs tests/storyteller-integration.test.mjs
```

Expected: FAIL because Plans do not contain style fields and day transition does not activate pending settings.

- [ ] **Step 3: Upgrade Storyteller Plan normalization**

Change the normalized Plan shape to:

```js
return {
  schemaVersion: 2,
  planId,
  dayKey,
  saveScope,
  seed,
  pacing,
  categoryWeights,
  severityBudget,
  diversity,
  styleMix: styles.normalizeMix(value.styleMix),
  styleMixRevision: boundedInt(value.styleMixRevision, 0, Number.MAX_SAFE_INTEGER, 0),
  generatedByJobId,
  status,
  reason
};
```

Include `styleMix` and `styleMixRevision` in the Plan identity hash. An old schema v1 Plan remains readable for the current migration day but is not considered style-aware.

- [ ] **Step 4: Activate before building day-change jobs**

Add one orchestration helper in `app.js`:

```js
function activateStorytellerStyleMixForDay(dayKey) {
  const storyteller = state.freeMode?.world?.storyteller;
  const api = globalThis.HatsuWorldStorytellerStyles;
  if (!storyteller || !api?.activatePendingMix) return { activated: false };
  const result = api.activatePendingMix(storyteller.styleConfig, dayKey);
  storyteller.styleConfig = result.config;
  return result;
}
```

Call it immediately after incrementing `postLiveDay` and before Plan/Director preparation. Pass active mix and revision into `buildStorytellerPlan()`. Do not call it from manual re-plan.

- [ ] **Step 5: Run focused verification**

Run:

```powershell
node --test tests/storyteller-styles.test.mjs tests/storyteller-plan.test.mjs tests/storyteller-integration.test.mjs tests/world-director-integration.test.mjs
node --check world/storyteller/plan.js
node --check app.js
git diff --check
git diff --stat -- world/storyteller/styles.js world/storyteller/plan.js app.js tests/storyteller-styles.test.mjs tests/storyteller-plan.test.mjs tests/storyteller-integration.test.mjs
```

Expected: all focused tests pass. Inspect ordering in `advanceFreeModeToNextDay()` and verify no additional model request is introduced.

### Task 3: Director Style Threads And Atomic Validation

**Files:**
- Modify: `world/director-state.js`
- Modify: `world/director-api.js`
- Modify: `world/director-injection.js`
- Modify: `world/director-phone-view.js`
- Modify: `app.js:4748-4840`
- Modify: `tests/world-director-state.test.mjs`
- Modify: `tests/world-director-api.test.mjs`
- Modify: `tests/world-director-injection.test.mjs`
- Modify: `tests/world-director-phone-view.test.mjs`
- Modify: `tests/world-director-integration.test.mjs`

- [ ] **Step 1: Write failing Director schema tests**

Add a valid fixture containing:

```js
styleMixRevision: 3,
styleThreads: {
  heroic: {
    status: "active",
    weight: 60,
    focusPressureIds: ["pressure:a"],
    dramaticQuestion: "她能否在限制下找到新的表演方法？",
    narrativeGoals: ["让当前能力差距面临可观察的检验"],
    dormantReason: ""
  },
  romance: {
    status: "dormant",
    weight: 40,
    focusPressureIds: [],
    dramaticQuestion: "",
    narrativeGoals: [],
    dormantReason: "当前证据不足以形成关系线扰动"
  },
  kaibunsho: null
}
```

Assert full rejection for wrong revision, modified weight, unknown Pressure ID, missing positive-weight thread, active thread without a question, dormant thread with goals, or non-null Kaibunsho. Assert the prior Director state remains byte-identical after `applyDirectorPatch()` rejects a malformed payload.

- [ ] **Step 2: Run Director tests and verify RED**

Run:

```powershell
node --test tests/world-director-state.test.mjs tests/world-director-api.test.mjs tests/world-director-injection.test.mjs tests/world-director-phone-view.test.mjs tests/world-director-integration.test.mjs
```

Expected: FAIL because the current DailyDirection schema does not normalize or validate style threads.

- [ ] **Step 3: Extend Director state normalization**

Add pure normalizers:

```js
function normalizeStyleThread(value, expectedWeight) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const status = value.status === "dormant" ? "dormant" : value.status === "active" ? "active" : "";
  const weight = boundedInteger(value.weight, -1);
  const focusPressureIds = boundedTextList(value.focusPressureIds, 8, 160);
  const dramaticQuestion = boundedText(value.dramaticQuestion, 240);
  const narrativeGoals = boundedTextList(value.narrativeGoals, 6, 180);
  const dormantReason = boundedText(value.dormantReason, 160);
  if (!status || weight !== expectedWeight || !focusPressureIds || !narrativeGoals) return null;
  if (status === "active" && (!dramaticQuestion || dormantReason)) return null;
  if (status === "dormant" && (dramaticQuestion || narrativeGoals.length || !dormantReason)) return null;
  return { status, weight, focusPressureIds, dramaticQuestion, narrativeGoals, dormantReason };
}
```

Keep legacy directions readable as `{ styleMixRevision: null, styleThreads: null }` so the current migration day is not erased. Freeze `styleMode: "legacy" | "styled"` into each Director job from `storyteller.styleConfig.legacyUntilDayChange`. A styled job requires `styleMixRevision` and exact Heroic/Romance threads; a legacy job retains the old contract. Preserve the atomic `applyDirectorPatch` path.

- [ ] **Step 4: Extend Director input, contract and validation**

`buildDirectorInput()` reads the active configuration and includes:

```js
styleMix: clone(storyteller.styleConfig.activeMix),
styleMixRevision: storyteller.styleConfig.styleMixRevision
```

The output contract requires the model to echo the revision and create separate threads. `prepareDirectorPatch()` compares the reply against the job's frozen style revision and mix, validates all Pressure IDs, and returns `invalid_style_threads` or `style_revision_mismatch` without producing a partial patch.

Freeze `styleMix` and `styleMixRevision` into the Director job at preparation time so settings or day changes cannot mutate an in-flight contract.

For a migration-day manual re-plan, freeze `styleMode: "legacy"` and emit the old contract. After activation, every new job freezes `styleMode: "styled"`; a legacy-shaped response to that job is rejected.

- [ ] **Step 5: Extend injection and phone view models**

Compose separate bounded lines only for active current threads:

```text
王道长期问题：...
王道可追求：...
恋爱长期问题：...
恋爱可追求：...
```

Dormant threads do not enter the narrative Prompt. The phone view exposes both threads, their weights, status and bounded reason for display.

- [ ] **Step 6: Run focused verification**

Run:

```powershell
node --test tests/world-director-state.test.mjs tests/world-director-api.test.mjs tests/world-director-injection.test.mjs tests/world-director-phone-view.test.mjs tests/world-director-integration.test.mjs
node --check world/director-state.js
node --check world/director-api.js
node --check world/director-injection.js
node --check world/director-phone-view.js
node --check app.js
git diff --check
git diff --stat -- world/director-state.js world/director-api.js world/director-injection.js world/director-phone-view.js app.js tests/world-director-state.test.mjs tests/world-director-api.test.mjs tests/world-director-injection.test.mjs tests/world-director-phone-view.test.mjs tests/world-director-integration.test.mjs
```

Expected: all focused tests pass. Inspect the generated Director contract for bounded size and verify the model cannot change percentages.

### Task 4: Styled Incident Selection And Open Disturbances

**Files:**
- Modify: `world/storyteller/styles.js`
- Modify: `world/storyteller/incidents.js`
- Modify: `app.js:3958-4016`
- Modify: `tests/storyteller-styles.test.mjs`
- Modify: `tests/storyteller-incidents.test.mjs`
- Modify: `tests/storyteller-major-incidents.test.mjs`
- Modify: `tests/storyteller-map-coverage.test.mjs`

- [ ] **Step 1: Write failing selection and revalidation tests**

Use tiny test catalogs with explicit style metadata. Prove:

```js
const heroicOnly = definition({
  id: "heroic-test",
  styleIds: ["heroic"],
  operatorIdsByStyle: { heroic: ["threshold_test"] }
});
const romanceOnly = definition({
  id: "romance-test",
  styleIds: ["romance"],
  operatorIdsByStyle: { romance: ["boundary_test"] }
});
```

Tests must cover:

- legality removes a style before weights are normalized;
- a 20/80 configured mix becomes 100% Heroic when only Heroic is legal;
- identical frozen inputs select identical style, operators, disturbance and candidate;
- two committed Heroic observations arm one Heroic half-weight penalty;
- one created candidate consumes the penalty;
- a no-candidate scan does not consume it;
- candidate normalization bounds operators to two and rejects unknown operators;
- candidate revalidation rejects changed style, operators, disturbance or revision;
- major incidents still require `crisis_allowed`, budget and confirmation;
- map selection still requires an allowed map step.

- [ ] **Step 2: Run focused selection tests and verify RED**

Run:

```powershell
node --test tests/storyteller-styles.test.mjs tests/storyteller-incidents.test.mjs tests/storyteller-major-incidents.test.mjs tests/storyteller-map-coverage.test.mjs
```

Expected: FAIL because definitions and candidates do not contain style data.

- [ ] **Step 3: Add style capability to definitions**

Extend `freezeDefinition()` with validated fields:

```js
const OPERATORS_BY_STYLE = Object.freeze({
  heroic: new Set([
    "threshold_test", "resource_constraint", "rival_comparison",
    "public_expectation", "method_failure", "opportunity_window"
  ]),
  romance: new Set([
    "expectation_gap", "attention_competition", "boundary_test",
    "dependency_exposure", "promise_pressure", "misread_signal"
  ]),
  kaibunsho: new Set()
});

styleIds: Object.freeze(uniqueSorted(value.styleIds, 3).filter((id) => STYLE_IDS.includes(id))),
operatorIdsByStyle: Object.freeze(normalizeOperatorMap(value.operatorIdsByStyle))
```

Map every existing minor, moderate and major definition to at least one legal Heroic or Romance operator. Do not add new incident definitions in this task. Keep Kaibunsho unsupported.

- [ ] **Step 4: Implement legal style-pair evaluation and deterministic selection**

Add pure helpers:

```js
evaluateStyledDefinition(definition, context)
normalizeEligibleStyleWeights(activeMix, eligibleStyleIds, streak)
selectStyleForDefinitionPairs(pairs, context)
buildStorytellerDisturbance(selectedPair, context)
```

`buildStorytellerIncidentContext()` must pass the exact current Director `styleThreads`, Plan style revision, active style mix and normalized style streak. A style is eligible only when its current thread is `active`; a dormant or stale thread removes that style before weighting. A focus Pressure overlap increases support but is not mandatory when the active thread and current legal world facts ground the operator.

The selection key includes Plan seed, style revision, source turn, action, location and sorted eligible definition/style identities. The selected candidate freezes:

```js
styleId,
styleMixRevision,
operatorIds,
disturbance: {
  styleId,
  sourcePressureIds,
  sourceRefs,
  groundedPremise,
  triggerFact,
  immediateConstraint,
  reasonToRespond,
  openQuestions,
  forbiddenOutcomes
}
```

Build these fields only from definition metadata, resolved actor/location/modifier instances and selected Pressure facts. Do not create success, failure, confession, jealousy or player decisions.

`selectIncidentCandidate()` remains pure and returns `nextStyleStreak` only when it creates a candidate. `prepareStorytellerCandidateForOrdinaryTurn()` and notification scanning persist that returned streak together with the newly stored candidate. Reusing an existing candidate or returning no candidate leaves the streak byte-identical.

- [ ] **Step 5: Extend exact candidate revalidation and diagnostics**

Recompute the expected style selection and disturbance from the same context. Include exact comparisons for style revision, style ID, operator IDs and every disturbance field. Extend diagnostics with bounded configured weights, legal counts, normalized weights, applied penalty and selected style.

- [ ] **Step 6: Run focused verification**

Run:

```powershell
node --test tests/storyteller-styles.test.mjs tests/storyteller-incidents.test.mjs tests/storyteller-major-incidents.test.mjs tests/storyteller-map-coverage.test.mjs
node --check world/storyteller/styles.js
node --check world/storyteller/incidents.js
node --check app.js
git diff --check
git diff --stat -- world/storyteller/styles.js world/storyteller/incidents.js app.js tests/storyteller-styles.test.mjs tests/storyteller-incidents.test.mjs tests/storyteller-major-incidents.test.mjs tests/storyteller-map-coverage.test.mjs
```

Expected: all focused tests pass. Inspect catalog changes to ensure each operator is supported by existing actor/location/action prerequisites.

### Task 5: Prompt Injection, Accepted-Final History And Recovery Stability

**Files:**
- Modify: `world/storyteller/injection.js`
- Modify: `world/storyteller/observations.js`
- Modify: `app.js:3868-3904`
- Modify: `app.js:4192-4333`
- Modify: `app.js:8500-8520`
- Modify: `app.js:8790-8820`
- Modify: `tests/storyteller-attachment.test.mjs`
- Modify: `tests/storyteller-event-turn.test.mjs`
- Modify: `tests/storyteller-observations.test.mjs`
- Modify: `tests/storyteller-notification-integration.test.mjs`
- Modify: `tests/harness-recovery.test.mjs`

- [ ] **Step 1: Write failing execution tests for open Prompt injection and committed history**

Assert the attached and independent-event Prompt blocks contain bounded fields equivalent to:

```text
本轮 Storyteller 风格：王道故事
现实依据：...
触发事实：...
即时限制：...
必须回应的原因：...
开放问题：...
禁止预设结果：不得决定成功、失败、关系升级、玩家选择或权威状态。
```

Tests must prove incomplete, stale, retry and wrong-scope replies do not record style history or arm streak state. Only an accepted final reply for the exact current candidate records one style observation. Recovery must reuse the frozen candidate and Prompt while its new request ID remains governed by existing Harness rules.

- [ ] **Step 2: Run focused flow tests and verify RED**

Run:

```powershell
node --test tests/storyteller-attachment.test.mjs tests/storyteller-event-turn.test.mjs tests/storyteller-observations.test.mjs tests/storyteller-notification-integration.test.mjs tests/harness-recovery.test.mjs
```

Expected: FAIL because style disturbance is not injected or recorded.

- [ ] **Step 3: Compose bounded open-disturbance blocks**

Update both existing injection functions. Return an empty block unless the candidate is in the same statuses/channels already accepted by the current implementation and has a valid normalized disturbance. Keep the existing authority text and add explicit open-outcome language.

- [ ] **Step 4: Record style only after accepted-final candidate settlement**

Upgrade observations to schema v3 with:

```js
styleId: resolvedCandidate && STYLE_IDS.includes(value.styleId) ? value.styleId : "",
operatorIds: resolvedCandidate ? normalizeOperatorIds(value.operatorIds) : []
```

In `recordAcceptedFinalStorytellerObservation()`, copy style data from the exact resolved candidate. Update `styleStreak` after the observation is successfully recorded, not before. Duplicate request rejection must leave streak unchanged.

Use this transition:

```js
function recordCommittedStyle(streak, styleId) {
  if (streak.styleId !== styleId) return { styleId, committedCount: 1, penaltyArmed: false };
  const committedCount = streak.committedCount + 1;
  return {
    styleId,
    committedCount,
    penaltyArmed: committedCount === 2 ? true : streak.penaltyArmed
  };
}
```

Candidate creation consumes an armed penalty through a dedicated pure transition; recovery and existing pending-candidate reuse do not consume it again.

- [ ] **Step 5: Run focused verification**

Run:

```powershell
node --test tests/storyteller-attachment.test.mjs tests/storyteller-event-turn.test.mjs tests/storyteller-observations.test.mjs tests/storyteller-notification-integration.test.mjs tests/harness-recovery.test.mjs tests/primary-model-ownership.test.mjs
node --check world/storyteller/injection.js
node --check world/storyteller/observations.js
node --check app.js
git diff --check
git diff --stat -- world/storyteller/injection.js world/storyteller/observations.js app.js tests/storyteller-attachment.test.mjs tests/storyteller-event-turn.test.mjs tests/storyteller-observations.test.mjs tests/storyteller-notification-integration.test.mjs tests/harness-recovery.test.mjs
```

Expected: all focused tests pass. Verify no candidate is committed, observed or counted before existing accepted-final gates.

### Task 6: World Engine Style Settings And Diagnostics UI

**Files:**
- Modify: `index.html:1491-1524`
- Modify: `style.css`
- Modify: `world/director-phone-view.js`
- Modify: `world/storyteller/phone-view.js`
- Modify: `app.js:16130-16172`
- Modify: `app.js:16267-16346`
- Modify: `app.js:16675-16695`
- Modify: `tests/world-engine-phone-app.test.mjs`
- Modify: `tests/world-director-phone-view.test.mjs`
- Modify: `tests/storyteller-phone-view.test.mjs`

- [ ] **Step 1: Write failing DOM and executable view-model tests**

Require these controls:

```html
<input id="worldEngineHeroicWeight" type="range" min="0" max="100" step="5">
<input id="worldEngineRomanceWeight" type="range" min="0" max="100" step="5">
<button id="worldEngineStyleSaveBtn" type="button">次日起生效</button>
```

Require a disabled Kaibunsho row, active/pending labels, separate Director thread cards and bounded diagnostics. Execute the save handler with a state fixture and prove it changes only `pendingMix` plus its target day; it must not call Director generation, Storyteller scanning or any model adapter.

- [ ] **Step 2: Run focused UI tests and verify RED**

Run:

```powershell
node --test tests/world-engine-phone-app.test.mjs tests/world-director-phone-view.test.mjs tests/storyteller-phone-view.test.mjs
```

Expected: FAIL because style controls and view fields do not exist.

- [ ] **Step 3: Add the settings section and save action**

Add a `叙事者设置` section below engine operations. Keep the two range controls synchronized to 100%:

```js
function syncWorldEngineStyleInputs(changedId) {
  const heroic = document.getElementById("worldEngineHeroicWeight");
  const romance = document.getElementById("worldEngineRomanceWeight");
  if (!heroic || !romance) return;
  if (changedId === heroic.id) romance.value = String(100 - Number(heroic.value));
  else heroic.value = String(100 - Number(romance.value));
}
```

The save handler calls only `setPendingMix`, stores the next day key, saves state once and renders the phone app. It shows a toast explaining that the current Plan is unchanged.

- [ ] **Step 4: Render style threads and bounded diagnostics**

Display:

- today's active mix;
- next-day pending mix;
- Heroic and Romance thread status, weight, question/goals or dormant reason;
- selected style and operators for the current candidate;
- configured, normalized and penalized weights;
- up to 20 committed style observations and current streak.

Escape every model-derived string through the existing phone escaping helper. Do not display Prompt, user input, narrative body, full request ID, lease ID or full state.

- [ ] **Step 5: Add stable phone-sized CSS**

Use existing World Engine colors, borders and spacing. Keep labels in fixed grid tracks, range inputs full-width, and thread cards un-nested. Include mobile constraints so percentages and status labels wrap instead of overflowing.

- [ ] **Step 6: Run focused verification**

Run:

```powershell
node --test tests/world-engine-phone-app.test.mjs tests/world-director-phone-view.test.mjs tests/storyteller-phone-view.test.mjs
node --check world/director-phone-view.js
node --check world/storyteller/phone-view.js
node --check app.js
git diff --check
git diff --stat -- index.html style.css world/director-phone-view.js world/storyteller/phone-view.js app.js tests/world-engine-phone-app.test.mjs tests/world-director-phone-view.test.mjs tests/storyteller-phone-view.test.mjs
```

Expected: all focused tests pass. Inspect the phone layout at its existing width and confirm no control changes the current active Plan.

### Task 7: Integration, Migration And Full Acceptance

**Files:**
- Modify only files already touched in Tasks 1-6 if failures expose an in-scope defect.
- Test: all `tests/storyteller-*.test.mjs`
- Test: all `tests/world-director-*.test.mjs`
- Test: Harness, ownership, world-engine and save integration suites.

- [ ] **Step 1: Add cross-module execution tests**

Cover complete paths:

1. Existing save loads with its current Plan unchanged, day transition activates `60/40/0`, Director receives the new revision, and the first style-aware Plan commits.
2. Player saves `30/70/0`; current-day manual Director retry still uses the active mix; next day uses `30/70/0`.
3. Ordinary action selects and freezes a legal style before Prompt assembly, then accepted-final reply records it once.
4. Map arrival/exploration/custom choice uses the same style selection and exact candidate ownership.
5. Notification and major incident acceptance retain their confirmation, lease and recovery semantics.
6. A changed scope, day, Plan, revision or stale reply cannot commit style history.
7. No legal Heroic candidate with a 100% Heroic mix results in no event rather than an illegal fallback.

- [ ] **Step 2: Run the complete focused World Engine suite**

Run:

```powershell
$files = @()
$files += Get-ChildItem tests -Filter 'storyteller-*.test.mjs'
$files += Get-ChildItem tests -Filter 'world-director-*.test.mjs'
$files += Get-Item tests/world-engine.test.mjs, tests/world-engine-phone-app.test.mjs, tests/harness-phase1.test.mjs, tests/harness-recovery.test.mjs, tests/primary-model-ownership.test.mjs
node --test $files.FullName
```

Expected: all focused suites pass with no new failure.

- [ ] **Step 3: Run syntax and diff verification**

Run:

```powershell
Get-ChildItem world/storyteller -Filter '*.js' | ForEach-Object { node --check $_.FullName }
Get-ChildItem world -Filter 'director-*.js' | ForEach-Object { node --check $_.FullName }
node --check app.js
git diff --check
git status --short
git diff --stat
```

Expected: every syntax command and `git diff --check` exits 0. Review status carefully because the worktree already contains unrelated user changes.

- [ ] **Step 4: Run the full repository test suite**

Run:

```powershell
$all = Get-ChildItem tests -Filter '*.test.mjs'
node --test $all.FullName
```

Expected: no failures beyond the six documented existing baseline failures. Record exact test/pass/fail counts and the names of all six baseline failures; investigate any additional failure before completion.

- [ ] **Step 5: Perform real SillyTavern manual acceptance**

In the actual host environment:

1. Open the World Engine app and confirm active `60/40` plus pending `60/40` are shown.
2. Change to `30/70`, save, and confirm today's Plan and Director threads do not change.
3. Manually re-plan today and confirm it still sends the active mix.
4. Advance one day and confirm `30/70` becomes active before the Director request.
5. Inspect Director output and confirm separate Heroic/Romance threads with exact weights.
6. Trigger ordinary and map actions until a legal candidate appears; confirm style/operator/disturbance diagnostics are present.
7. Refresh during generation and recover; confirm style and candidate remain frozen while request ID changes according to existing Recovery rules.
8. Complete a valid reply and confirm one Observation and one streak update.
9. Ignore or fail another event and confirm it does not update committed style history.
10. Switch chat/save scope and confirm the old direction, candidate and style state do not appear in the new scope.

If BasicAuth or host availability prevents this step, report it as not executed rather than claiming success.

- [ ] **Step 6: Final scope and diff review**

Confirm the final diff does not contain:

- new Kaibunsho event behavior;
- settlement, relationship, time or probability changes;
- new queues, event buses or model endpoints;
- Prompt prose rewrites outside bounded Director/Storyteller additions;
- changes to Harness ownership, request identity or Recovery semantics;
- unrelated formatting or mojibake cleanup.

Leave all work uncommitted unless the user explicitly requests a commit.

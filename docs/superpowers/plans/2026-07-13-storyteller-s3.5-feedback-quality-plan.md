# Storyteller S3.5 Feedback And Selection Quality Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Storyteller plans learn from actual resolved incidents, match only relevant Pressures, produce deterministic but varied concrete combinations, and apply an explicit Director/Storyteller Prompt hierarchy without adding model requests or output tags.

**Architecture:** Extend the existing pure `observations.js`, `incidents.js`, `injection.js` and `phone-view.js` modules, with narrowly scoped orchestration changes in `app.js`. Candidate resolution remains inside the accepted-final ACK path; Recovery continues to reuse the frozen Prompt and candidate. All new diagnostics are bounded metadata and read-only.

**Tech Stack:** Native JavaScript, browser globals, Node `node:test`, existing Harness/ownership/Recovery, Director Pressure state, SillyTavern postMessage bridge.

---

## Workspace Rule

The branch contains extensive pre-existing uncommitted work. For each task: write RED tests, implement the minimum change, run the focused tests, run `node --check` and `git diff --check`, and inspect the task diff. Do not create intermediate commits unless the user explicitly asks.

## Task 1: Observation V2 And Accepted-Final Eligibility

**Files:**
- Modify: `world/storyteller/observations.js`
- Modify: `app.js`
- Modify: `tests/storyteller-observations.test.mjs`
- Modify: `tests/storyteller-attachment.test.mjs`
- Modify: `tests/harness-phase1.test.mjs`

- [ ] Add RED tests requiring version 2 normalization and candidate-backed metadata:

```js
const normalized = api.normalizeStorytellerObservation({
  schemaVersion: 2,
  sourceKind: "resolved_candidate",
  requestId: "request-a",
  turnId: "turn-a",
  category: "visitor",
  severity: "moderate",
  archetypeId: "peer_observation",
  pressureCount: 2
});
assert.equal(normalized.category, "visitor");
assert.equal(normalized.severity, "moderate");
assert.equal(normalized.sourceKind, "resolved_candidate");
assert.equal(normalized.pressureCount, 2);
```

- [ ] Add RED execution tests for `recordAcceptedFinalStorytellerObservation(requestId, candidateSettlement)`:

```js
const result = record("request-a", {
  resolved: true,
  candidate: {
    category: "visitor",
    severity: "moderate",
    archetypeId: "peer_observation",
    pressureIds: ["p1", "p2"]
  }
});
assert.equal(result.recorded, true);
assert.equal(observation.category, "visitor");
assert.equal(observation.severity, "moderate");
```

- [ ] Prove phone, broadcast, stale, partial, retry and unsupported active turns record nothing. Prove completed ordinary/map turns without candidates record `ambient_turn` with empty category/severity.
- [ ] Run RED:

```powershell
node --test tests/storyteller-observations.test.mjs tests/storyteller-attachment.test.mjs tests/harness-phase1.test.mjs
```

- [ ] Implement `normalizeStorytellerObservation()` and use it from `ensureStorytellerState()`, `recordStorytellerObservation()` and statistics. Version 1 records with valid category/severity become `resolved_candidate`; other version 1 records become `ambient_turn`.
- [ ] Change `recordAcceptedFinalStorytellerObservation()` to require an exact completed `produce_action` or `map_explore` turn in the active scope. Copy resolved candidate metadata when present; otherwise record an ambient observation.
- [ ] Pass `candidateSettlement` from `sendAiReplyAck()` into observation recording. Do not change ACK release, Chronicle or candidate settlement order.
- [ ] Verify:

```powershell
node --test tests/storyteller-observations.test.mjs tests/storyteller-attachment.test.mjs tests/harness-phase1.test.mjs
node --check app.js
node --check world/storyteller/observations.js
git diff --check
```

## Task 2: Bounded Pressure Relevance

**Files:**
- Modify: `world/storyteller/incidents.js`
- Modify: `app.js`
- Modify: `tests/storyteller-incidents.test.mjs`
- Modify: `tests/storyteller-attachment.test.mjs`

- [ ] Add RED pure tests for `normalizeStorytellerPressureFacts()` and `selectRelevantPressures()`:

```js
const relevant = api.selectRelevantPressures({
  category: "hostile",
  actorIds: ["idol:A"],
  targetIds: ["producer"],
  locationId: "courtyard"
}, [
  { pressureId: "match", type: "relationship", theme: "competition", actorId: "idol:A", targetIds: ["producer"], stage: "active", intensity: 60, visibility: "private" },
  { pressureId: "other", type: "relationship", theme: "trust", actorId: "idol:B", targetIds: ["producer"], stage: "active", intensity: 80, visibility: "private" }
]);
assert.deepEqual(relevant.map((item) => item.pressureId), ["match"]);
```

- [ ] Test public pressure fallback, inactive/resolved exclusion, type/category compatibility, bounded intensity, and zero bonus for unrelated Pressure.
- [ ] Run RED:

```powershell
node --test tests/storyteller-incidents.test.mjs tests/storyteller-attachment.test.mjs
```

- [ ] Extend `buildStorytellerIncidentContext()` to pass at most eight normalized active Pressure facts rather than a flat ID list. Use only `id/pressureId`, type, theme, actor, targets, stage, intensity and visibility.
- [ ] In `incidents.js`, compute relevant pressures after the concrete actor/location instance exists. Use the relevant set in scoring and store only its IDs in the candidate.
- [ ] Keep Pressure as a bounded score bonus only. It cannot alter legality, severity, budget, cooldown or deterministic state.
- [ ] Verify focused tests, `node --check app.js`, `node --check world/storyteller/incidents.js`, and `git diff --check`.

## Task 3: Deterministic Concrete Combination And Diagnostics

**Files:**
- Modify: `world/storyteller/incidents.js`
- Modify: `app.js`
- Modify: `tests/storyteller-incidents.test.mjs`
- Modify: `tests/storyteller-attachment.test.mjs`

- [ ] Add RED tests proving the same plan/turn/definition selects the same present actor and modifiers, while different turn IDs can select different legal combinations.
- [ ] Add RED tests requiring a bounded diagnostic result:

```js
assert.deepEqual(Object.keys(result.diagnostic.rejectionCounts).sort(), [
  "cooldown", "diversity", "fingerprint", "legality"
]);
assert.ok(result.diagnostic.selectedScore >= 0);
assert.ok(result.diagnostic.eligibleCount <= result.diagnostic.evaluatedCount);
```

- [ ] Run RED with `node --test tests/storyteller-incidents.test.mjs tests/storyteller-attachment.test.mjs`.
- [ ] Add a stable integer chooser based on `plan.seed|sourceTurnId|definition.id|action|locationId`. Use it to choose a legal present actor and zero to two definition modifiers without `Math.random()`.
- [ ] Build the fingerprint only after concrete actor/modifier selection. Preserve existing cooldown, fingerprint and daily actor/location limits.
- [ ] Return a normalized `diagnostic` from `selectIncidentCandidate()` and store it as `storyteller.lastSelectionDiagnostic`; do not place it inside Harness trace or Prompt.
- [ ] Verify focused tests and syntax/diff checks.

## Task 4: Director And Storyteller Prompt Authority

**Files:**
- Modify: `app.js`
- Modify: `world/storyteller/injection.js`
- Modify: `tests/storyteller-attachment.test.mjs`
- Modify: `tests/storyteller-map-coverage.test.mjs`
- Modify: `tests/world-director-injection.test.mjs`

- [ ] Add RED source and execution tests requiring this order for ordinary prompts:

```text
composeWorldDirectorPromptAddendum
composeStorytellerIncidentPromptAddendum
composeNarrativeAuthorityContract
outputContract
```

- [ ] Add RED map Prompt tests requiring the Storyteller block and authority contract before the final choice/output contract.
- [ ] Run RED:

```powershell
node --test tests/storyteller-attachment.test.mjs tests/storyteller-map-coverage.test.mjs tests/world-director-injection.test.mjs
```

- [ ] Add a static pure `composeNarrativeAuthorityContract({ hasDirector, hasStoryteller })` helper. It states that Director owns long-range guidance, Storyteller owns the current legal complication, and deterministic state remains authoritative.
- [ ] Reorder generated blocks without changing the existing Director content, Storyteller content, action prose, map prose or output tags.
- [ ] Ensure frozen Recovery prompts preserve the resulting order and do not rebuild any block.
- [ ] Verify focused tests and syntax/diff checks.

## Task 5: Read-Only S3.5 Diagnostics

**Files:**
- Modify: `world/storyteller/phone-view.js`
- Modify: `app.js`
- Modify: `tests/storyteller-phone-view.test.mjs`
- Modify: `tests/world-engine-phone-app.test.mjs`

- [ ] Add RED tests requiring bounded candidate reasoning and last observation output while rejecting Prompt, narrative, full IDs, Pressure contents and full state.
- [ ] Extend the phone view model with:

```js
selection: {
  selectedScore: 72,
  categoryWeight: 35,
  actionFit: 6,
  noveltyBonus: 15,
  pressureBonus: 16,
  relevantPressureCount: 1,
  evaluatedCount: 12,
  eligibleCount: 3,
  rejectionSummary: ["合法性 5", "冷却 2"]
},
lastObservation: { sourceLabel: "事件候选", categoryLabel: "来访者", severityLabel: "中等" }
```

- [ ] Run RED with `node --test tests/storyteller-phone-view.test.mjs tests/world-engine-phone-app.test.mjs`.
- [ ] Normalize only allowlisted integer fields and rejection reason counts. Render one compact read-only section under the existing candidate card using existing escaping.
- [ ] Verify focused tests, `node --check world/storyteller/phone-view.js`, `node --check app.js`, and `git diff --check`.

## Task 6: Acceptance

- [ ] Run focused integration suites:

```powershell
$files = @();
$files += Get-ChildItem tests -Filter 'storyteller-*.test.mjs';
$files += Get-ChildItem tests -Filter 'world-director-*.test.mjs';
$files += Get-ChildItem tests -Filter 'harness-*.test.mjs';
$files += Get-ChildItem tests -Filter '*ownership*.test.mjs';
$files += Get-ChildItem tests -Filter 'free-mode.test.mjs';
$files += Get-ChildItem tests -Filter 'world-engine-phone-app.test.mjs';
node --test ($files.FullName | Sort-Object -Unique)
```

- [ ] Run the full suite:

```powershell
node --test tests
```

Expected baseline: exactly six known failures and no new failures.

- [ ] Run syntax and diff checks:

```powershell
node --check app.js
Get-ChildItem world/storyteller -Filter '*.js' | ForEach-Object { node --check $_.FullName }
git diff --check
git status --short
```

- [ ] Manual SillyTavern acceptance:

1. Resolve a visible `visitor/moderate` candidate and confirm the world-engine diagnostic records `visitor / moderate`.
2. Complete a phone and broadcast reply and confirm Storyteller observation counts do not change.
3. Use a save with one relevant and one unrelated private Pressure; confirm only the relevant Pressure count is shown.
4. Retry a Recovery turn and confirm the candidate actors, modifiers, Pressure IDs and Prompt remain unchanged.
5. Compare two different turns using the same plan and confirm legal combinations may differ while each retry remains stable.
6. Inspect an ordinary and map Prompt and confirm Director direction precedes the concrete Storyteller event, followed by the final authority/output contract.

## Stop Conditions

Stop before implementation if any task requires a new model call, a new output tag, a change to deterministic settlement/time/tasks/resources, migration of unsupported event channels, semantic AI judging, or broad refactoring of `app.js` unrelated to S3.5.

# Storyteller S2-S3 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a deterministic local incident catalog and safely attach minor or moderate Storyteller incidents to ordinary `lesson`, `training`, and `rest` turns without adding model requests or changing settlement and Recovery semantics.

**Architecture:** `world/storyteller/incidents.js` owns the read-only incident catalog, five-layer eligibility checks, deterministic scoring, stable IDs, fingerprints, and cooldown logic. `world/storyteller/injection.js` converts an already-selected candidate into a bounded narrative instruction. `app.js` persists one pending candidate under the existing Storyteller subtree, selects it after deterministic settlement but before `buildPrompt()`, freezes it into the ordinary Harness turn, and resolves it only after the current request receives an accepted final reply.

**Tech Stack:** Native JavaScript, browser globals, Node `node:test`, existing `state.freeMode.world.storyteller`, ordinary-action Harness, primary model ownership, and frozen Recovery prompts.

---

## Scope And Invariants

- Only `lesson`, `training`, and `rest` may attach candidates in S3.
- Only `minor` and `moderate` candidates with `channel: "attach"` may attach automatically.
- `major`, `sns`, `phone`, `invite`, `background`, map, commission, broadcast, gift, choice continuation, and NPC-to-NPC flows remain untouched.
- Candidate selection occurs after deterministic stat/random settlement and before `buildPrompt()` and `captureHarnessGenerationPrompt()`.
- Candidate context cannot change stats, stamina, stress, trust, time, round, random results, tasks, resources, ordinary logs, or model ownership.
- Recovery reuses the frozen `generationPrompt`; it never rebuilds the Prompt or reselects a candidate.
- `activeTurn.requestId` remains the only accepted reply ID. A stale/rejected/retry reply cannot resolve a candidate.
- The candidate is scope/day bound. A mismatched `saveScope`, stale `dayKey`, unavailable current plan, or failed legality recheck means no attachment and no blocked ordinary action.
- No Prompt, reply text, API key, full request ID, full state, or full Harness trace is stored in Storyteller state or audit receipts.

## Files And Responsibilities

- Create `world/storyteller/incidents.js`: static catalog, normalization, five-layer legality, stable selection, cooldown and candidate transition helpers.
- Create `world/storyteller/injection.js`: pure bounded Prompt addendum for a selected attach candidate.
- Create `tests/storyteller-incidents.test.mjs`: pure S2 catalog, legality, determinism, diversity and lifecycle tests.
- Create `tests/storyteller-attachment.test.mjs`: execution-level S3 settlement, reply gate and Recovery tests.
- Modify `app.js`: Storyteller state shape, selection context, ordinary settlement insertion point, Harness candidate freeze, accepted-final commit and read-only phone model.
- Modify `index.html`: load `incidents.js` and `injection.js` before `app.js`.
- Modify `st.html`: add the same modules to the host loader in dependency order.
- Modify `world/storyteller/phone-view.js`: expose bounded pending/recent candidate diagnostics only.
- Modify `tests/storyteller-integration.test.mjs`, `tests/storyteller-phone-view.test.mjs`, and `tests/world-engine-phone-app.test.mjs`: loader/state/view regressions.

## Shared Verification Commands

Run from `G:\SillyTavern\SillyTavern\public\hatsu-produce-local` after every task:

```powershell
node --check app.js
git diff --check
git diff --stat
```

The frozen full-suite baseline is `511/517`, with these six existing failures left unchanged:

1. selected idols are all required in a zero-cost interaction
2. producer profile includes gender in state, form, save flow, and prompts
3. st.html loader uses a responsive mobile viewport instead of a fixed desktop canvas
4. st.html pauses floor hiding when the opening floor is not mounted
5. advanceDay only advances schedule from summary round
6. day 21 summary round advances into First Live schedule

### Task 1: S2 Incident Catalog, Five-Layer Legality, And Deterministic Selection

**Files:**
- Create: `world/storyteller/incidents.js`
- Create: `tests/storyteller-incidents.test.mjs`

- [ ] **Step 1: Write RED tests for the public pure API**

The tests load the module in a VM and require these exports:

```js
const {
  INCIDENT_CATALOG,
  normalizeIncidentCandidate,
  evaluateIncidentDefinition,
  selectIncidentCandidate,
  transitionIncidentCandidate
} = loadIncidentApi();
```

Cover these behaviors separately:

```js
test("catalog contains diverse local definitions with bounded slots", () => {
  assert.ok(INCIDENT_CATALOG.length >= 12);
  assert.ok(new Set(INCIDENT_CATALOG.map((item) => item.category)).size >= 5);
  assert.ok(INCIDENT_CATALOG.every((item) => item.actorPool.length && item.locationPool.length));
});

test("legality checks pacing category severity world context and concrete slots", () => {
  const result = evaluateIncidentDefinition(definition, context);
  assert.equal(result.eligible, true);
  assert.equal(result.layers.pacing, true);
  assert.equal(result.layers.category, true);
  assert.equal(result.layers.severity, true);
  assert.equal(result.layers.world, true);
  assert.equal(result.layers.instance, true);
});

test("major candidates cannot use automatic attach", () => {
  const result = evaluateIncidentDefinition(majorDefinition, context);
  assert.equal(result.eligible, false);
  assert.equal(result.reason, "confirmation_required");
});

test("same plan seed and context produce the same candidate identity", () => {
  assert.deepEqual(selectIncidentCandidate(input), selectIncidentCandidate(input));
});

test("recent fingerprint and cooldown exclude repeated candidates", () => {
  assert.equal(selectIncidentCandidate(repeatedInput).candidate, null);
});
```

Also verify normalization strips unknown fields such as `prompt`, `reply`, `state`, and `apiKey`; IDs and labels are bounded; actor/modifier ordering is stable; and input objects are not mutated.

- [ ] **Step 2: Run RED and confirm the failure is caused by the missing module**

```powershell
node --test tests/storyteller-incidents.test.mjs
```

Expected: FAIL because `world/storyteller/incidents.js` or its exports do not exist.

- [ ] **Step 3: Implement the minimal catalog and pure selection engine**

Use a frozen catalog with campus-specific archetypes across at least five categories. Definitions may combine these local slots:

```js
{
  id: "visitor_peer_observation",
  category: "visitor",
  archetypeId: "peer_observation",
  actorPool: ["assigned_idol", "present_idol"],
  locationPool: ["idol_classroom", "producer_classroom", "courtyard"],
  modifierPool: ["public_attention", "unexpected_question"],
  channels: ["attach"],
  severityRange: ["minor", "moderate"],
  prerequisites: ["assigned_idol"],
  allowedActions: ["lesson", "training", "rest"],
  allowedPacing: ["normal", "tense", "crisis_allowed"],
  cooldownDays: 2,
  requiresConfirmation: false
}
```

`evaluateIncidentDefinition(definition, context)` returns `{ eligible, reason, layers, instances }`. The layers are:

1. pacing: plan permits the definition's pacing;
2. category: category weight is positive;
3. severity: plan budget allows `minor` or `moderate` and automatic attachment never picks `major`;
4. world: current scope/day/action/mode, assignment, location and prerequisites match;
5. instance: actor, target and location slots resolve to concrete allowlisted IDs.

`selectIncidentCandidate(input)` evaluates every definition, scores eligible combinations with category weight, novelty, action fit and pressure relevance, applies exact fingerprint/cooldown exclusions, then uses a stable hash of `plan.seed + turnId + action + locationId` for deterministic weighted selection. It returns `{ candidate, reason, evaluatedCount }`; an empty pool returns `candidate: null` and never throws.

Candidate identity must be stable and must not use `Date.now()` or `Math.random()`:

```js
{
  schemaVersion: 1,
  incidentId: `incident:${stableHash(identity)}`,
  planId,
  saveScope,
  dayKey,
  sourceTurnId,
  fingerprint,
  category,
  severity,
  archetypeId,
  actorIds,
  targetIds,
  locationId,
  modifierIds,
  channel: "attach",
  pressureIds,
  resolutionMode: "observe",
  status: "pending",
  randomSeed,
  requiresConfirmation: false,
  sourceRefs: []
}
```

`transitionIncidentCandidate(candidate, nextStatus, context)` permits only `pending -> attached -> resolved`, plus `pending -> expired`; it returns a new normalized object and rejects invalid transitions or scope/plan/turn mismatches.

- [ ] **Step 4: Run GREEN and static checks**

```powershell
node --test tests/storyteller-incidents.test.mjs
node --check world/storyteller/incidents.js
node --check app.js
git diff --check
git diff -- world/storyteller/incidents.js tests/storyteller-incidents.test.mjs
```

### Task 2: Persist One Scope-Bound Pending Candidate

**Files:**
- Modify: `app.js`
- Modify: `index.html`
- Modify: `st.html`
- Modify: `tests/storyteller-integration.test.mjs`
- Test: `tests/storyteller-attachment.test.mjs`

- [ ] **Step 1: Write RED execution tests for state and selection lifecycle**

Use a VM harness around the new app helpers, not source ordering alone. Cover:

```js
test("prepareStorytellerCandidateForOrdinaryTurn persists one scoped pending candidate", () => {
  const result = prepare("training", "Vo", { turnId: "turn-1" });
  assert.equal(result.candidate.status, "pending");
  assert.equal(state.freeMode.world.storyteller.pendingCandidate.incidentId, result.candidate.incidentId);
});

test("selection is a no-op when plan scope or day is stale", () => {
  const before = structuredClone(state);
  assert.equal(prepare("training", "Vo", { turnId: "turn-1", activeScope: "chat-b" }).candidate, null);
  assert.deepEqual(state, before);
});

test("existing candidate for the same turn is reused without reselection", () => {
  assert.equal(prepareTwice().first.incidentId, prepareTwice().second.incidentId);
});
```

Also assert that candidate preparation does not call a model, save state independently, advance time, append gameplay logs, reroll action events, or change business stats.

- [ ] **Step 2: Run RED**

```powershell
node --test tests/storyteller-attachment.test.mjs tests/storyteller-integration.test.mjs
```

Expected: FAIL because the loaders, state shape and app helpers do not exist.

- [ ] **Step 3: Add the smallest persisted S2 state and app adapter**

Load the two new modules before `app.js`. Extend only the Storyteller subtree:

```js
{
  schemaVersion: 2,
  observations: [],
  recentFingerprints: [],
  lastObservedDayKey: "",
  plan: null,
  pendingCandidate: null,
  recentCandidates: [],
  receipts: [],
  lastPlanError: "",
  lastCandidateReason: ""
}
```

Add pure-context adapter helpers in `app.js`:

```js
function buildStorytellerIncidentContext(action, attribute, options = {}) { /* bounded facts */ }
function prepareStorytellerCandidateForOrdinaryTurn(action, attribute, options = {}) { /* select/reuse */ }
```

The context includes only current `saveScope`, `dayKey`, action, attribute, current location/facility location, assigned idol ID, bounded present actor IDs, plan, recent fingerprints/candidates, and current pressure IDs. It must not expose Prompt, reply text, full logs or full state.

Preparation reuses an existing `pending`/`attached` candidate only when `sourceTurnId`, `saveScope`, `dayKey` and `planId` all match. Stale candidates may be marked `expired` in bounded audit state but cannot attach to the new turn. The helper itself does not save; the ordinary settled save persists the candidate atomically with the Harness turn.

- [ ] **Step 4: Run GREEN and inspect Task 2 diff**

```powershell
node --test tests/storyteller-attachment.test.mjs tests/storyteller-integration.test.mjs
node --check app.js
node --check world/storyteller/incidents.js
git diff --check
git diff --stat
```

### Task 3: S3 Attach Candidate To The Frozen Ordinary Prompt

**Files:**
- Create: `world/storyteller/injection.js`
- Modify: `app.js`
- Modify: `index.html`
- Modify: `st.html`
- Modify: `tests/storyteller-attachment.test.mjs`
- Modify: `tests/harness-recovery.test.mjs`

- [ ] **Step 1: Write RED tests for bounded injection and exact settlement order**

Pure injection tests require:

```js
const block = composeStorytellerIncidentPromptAddendum(candidate, context);
assert.match(block, /\[Storyteller 事件骨架\]/);
assert.match(block, /不得修改已结算数值、时间、任务或资源/);
assert.equal(block.length <= 2400, true);
assert.equal(block.includes(candidate.randomSeed), false);
assert.equal(block.includes(candidate.saveScope), false);
```

Execution tests require that a normal `lesson`, `training`, or `rest` turn:

1. acquires the existing primary owner before any business mutation;
2. performs the existing deterministic settlement exactly once;
3. prepares/rechecks the candidate after settlement and before `buildPrompt()`;
4. passes the candidate into `buildPrompt()` without changing existing Prompt text outside the appended block;
5. captures the resulting Prompt once in `activeTurn.generationPrompt`;
6. stores `incidentId` and `planId` on `activeTurn.storytellerCandidateRef`;
7. sends one existing primary request and creates no secondary or additional primary request.

Also prove no attachment occurs for `outing`, `companion`, `intimacy`, phone, broadcast, map, commission, choice continuation, skipped-AI lesson/training, missing current plan, `major`, or `requiresConfirmation: true`.

- [ ] **Step 2: Run RED**

```powershell
node --test tests/storyteller-attachment.test.mjs tests/harness-recovery.test.mjs
```

Expected: FAIL because the injection module and settlement integration are absent.

- [ ] **Step 3: Implement minimal bounded injection and ordinary attachment**

`composeStorytellerIncidentPromptAddendum(candidate, context)` maps catalog IDs to local Chinese labels and emits only:

- event category, severity and archetype;
- concrete actor/target/location IDs translated by local allowlists;
- at most two modifiers;
- narrative goal and guardrails;
- a statement that the incident is a narrative complication inside this already-settled action.

It must not include random seed, scope, full IDs used only for persistence, Director Prompt, model output, rewards, numeric deltas or new choices.

Change `buildPrompt()` to accept an optional candidate in `actionContext.storytellerCandidate` and append the pure block immediately before the existing output contract/Director addendum. Do not change existing prose when no valid candidate exists.

In `settleAction()`, after `delta` and `randomEvent` have been applied but before `buildPendingStory()`/`buildPrompt()`, call candidate preparation only for Harness ordinary actions that will generate narrative. Freeze a bounded reference onto the active turn through `markHarnessProduceTurn("settled", patch)` and mark the persisted candidate `attached` in the same pre-save state. If preparation or final legality recheck fails, continue the ordinary action unchanged.

- [ ] **Step 4: Run GREEN, syntax and diff checks**

```powershell
node --test tests/storyteller-attachment.test.mjs tests/harness-recovery.test.mjs
node --check world/storyteller/injection.js
node --check app.js
git diff --check
git diff -- app.js world/storyteller/injection.js tests/storyteller-attachment.test.mjs tests/harness-recovery.test.mjs
```

### Task 4: Accepted-Final Resolution And Recovery Stability

**Files:**
- Modify: `app.js`
- Modify: `tests/storyteller-attachment.test.mjs`
- Modify: `tests/harness-recovery.test.mjs`

- [ ] **Step 1: Write RED execution tests for reply and Recovery gates**

Cover:

```js
test("accepted final current reply resolves the attached candidate once", () => {
  sendAiReplyAck("request-new", true, false, true);
  assert.equal(storyteller.pendingCandidate, null);
  assert.equal(storyteller.recentCandidates.at(-1).status, "resolved");
});

test("stale rejected partial and retry replies never resolve a candidate", () => {
  for (const ack of staleAcks) assert.equal(commit(ack), false);
  assert.equal(storyteller.pendingCandidate.status, "attached");
});

test("recovery keeps turn candidate and frozen prompt while requestId changes", () => {
  assert.equal(after.turnId, before.turnId);
  assert.notEqual(after.requestId, before.requestId);
  assert.equal(after.generationPrompt, before.generationPrompt);
  assert.deepEqual(after.storytellerCandidateRef, before.storytellerCandidateRef);
});
```

Also verify invalid final output, timeout, send failure and `recovery_required` retain the candidate; explicit abandonment may expire the candidate with reason `narrative_abandoned`; and an old request/lease cannot resolve or release state belonging to the new Recovery request.

- [ ] **Step 2: Run RED**

```powershell
node --test tests/storyteller-attachment.test.mjs tests/harness-recovery.test.mjs tests/primary-model-ownership.test.mjs
```

- [ ] **Step 3: Implement exact candidate commit helpers**

Add:

```js
function settleStorytellerCandidateForReply(requestId, accepted, retry, isFinal) { /* exact gate */ }
function expireStorytellerCandidateForTurn(turn, reason) { /* explicit abandonment only */ }
```

The reply helper must require all of:

- `accepted === true`, `isFinal === true`, `retry === false`;
- `state.harness.activeTurn.requestId === requestId`;
- active turn status has reached `completed` for the same current request;
- active turn candidate reference exactly matches pending candidate `incidentId`, `planId`, `sourceTurnId`, `saveScope` and `dayKey`;
- current scope still equals candidate scope.

On success, move a normalized `resolved` candidate into `recentCandidates` (cap 24), append its fingerprint to `recentFingerprints` only if absent, append one bounded receipt (cap 40), clear `pendingCandidate`, and rely on the same accepted-final save path. Do not write Chronicle or Pressure in S3.

Call the helper in `sendAiReplyAck()` after ordinary reply validation has marked the turn completed and before the accepted-final observation save. Failure/retry/stale paths leave the candidate untouched. Recovery does not call selection or `buildPrompt()`; existing frozen Prompt and candidate reference survive unchanged.

Explicit `abandonHarnessNarrativeRecovery()` may expire only the candidate exactly referenced by that turn after the existing second confirmation. `closeEventOverlay()` and ordinary overlay close paths remain no-ops for candidate status.

- [ ] **Step 4: Run GREEN and ownership regressions**

```powershell
node --test tests/storyteller-attachment.test.mjs tests/harness-recovery.test.mjs tests/primary-model-ownership.test.mjs tests/primary-model-entry-gates.test.mjs
node --check app.js
git diff --check
git diff --stat
```

### Task 5: Bounded Phone Diagnostics And Combined Acceptance

**Files:**
- Modify: `world/storyteller/phone-view.js`
- Modify: `app.js`
- Modify: `tests/storyteller-phone-view.test.mjs`
- Modify: `tests/world-engine-phone-app.test.mjs`

- [ ] **Step 1: Write RED tests for read-only diagnostics**

The phone view may show only:

- pending/recent status;
- category, severity, archetype and location labels;
- short incident ID suffix;
- attached turn ID suffix;
- last selection/rejection reason;
- recent cooldown count.

Assert it does not expose Prompt, reply/body text, seed, saveScope, complete incident/request/lease/turn IDs, API configuration or full state. Rendering or refreshing the app must not save, select, resolve, expire or call a model.

- [ ] **Step 2: Run RED**

```powershell
node --test tests/storyteller-phone-view.test.mjs tests/world-engine-phone-app.test.mjs
```

- [ ] **Step 3: Implement the bounded read-only candidate view**

Extend `HatsuWorldStorytellerPhoneView.buildViewModel()` with a `candidate` object and render one compact section below the existing plan. All labels come from local maps; all dynamic strings pass existing escaping. No controls are added in S3.

- [ ] **Step 4: Run focused Storyteller and integration suites**

```powershell
node --test tests/storyteller-observations.test.mjs tests/storyteller-plan.test.mjs tests/storyteller-incidents.test.mjs tests/storyteller-integration.test.mjs tests/storyteller-attachment.test.mjs tests/storyteller-phone-view.test.mjs tests/world-engine-phone-app.test.mjs
node --test tests/world-director-state.test.mjs tests/world-director-api.test.mjs tests/world-director-injection.test.mjs tests/world-director-integration.test.mjs tests/harness-phase1.test.mjs tests/harness-recovery.test.mjs tests/primary-model-ownership.test.mjs tests/primary-model-entry-gates.test.mjs tests/secondary-channel-owner.test.mjs
```

- [ ] **Step 5: Run full verification**

```powershell
node --test tests
node --check app.js
node --check world/storyteller/observations.js
node --check world/storyteller/plan.js
node --check world/storyteller/incidents.js
node --check world/storyteller/injection.js
node --check world/storyteller/phone-view.js
git diff --check
git status --short
```

Expected: all new/focused tests pass; the full suite remains at the six known baseline failures with no additional failure.

- [ ] **Step 6: Manual SillyTavern acceptance**

1. Open a sandbox save with a current Storyteller Plan and disable the skip-AI option.
2. Perform `lesson`, `training`, and `rest` separately; confirm each sends one ordinary primary request and the Prompt contains at most one Storyteller event block.
3. Confirm stats, random event, time and normal log change exactly once and match the pre-S3 behavior.
4. Inspect the world-engine phone app while generating; confirm the candidate is shown as attached without Prompt or full IDs.
5. Complete a valid reply; confirm the candidate becomes resolved exactly once.
6. Force an invalid/empty reply; confirm Recovery retains the same candidate and no new candidate is selected.
7. Retry Recovery; confirm a new request ID, the same turn ID, the same frozen Prompt and the same candidate.
8. Send an old request reply; confirm it is rejected and does not resolve the candidate.
9. Close the Recovery overlay; confirm candidate and turn remain pending.
10. Use the explicit abandon button and second confirmation; confirm only the narrative candidate expires and settled values/time remain unchanged.
11. Switch chats or change day; confirm the old candidate is not attached in the new scope/day.
12. Try map, phone, broadcast, commission, gift and choice continuation; confirm no Storyteller attach block is added.

## Stop Conditions

Stop and ask before proceeding if implementation would require:

- changing ordinary settlement values, random tables, time advancement or task rules;
- rebuilding a Recovery Prompt or restoring an old network request;
- adding a second model request or a new owner kind for attached incidents;
- allowing `major` incidents to auto-attach;
- resolving a candidate from any ID other than `activeTurn.requestId`;
- migrating phone, broadcast, map, commission, gift, choice continuation, SNS or invitation behavior;
- changing Director/Pressure schemas or writing Chronicle from an attached incident;
- fixing any of the six frozen baseline failures as part of S2/S3.

## Completion Gate

S2/S3 is complete only when a current scoped plan can deterministically produce a legal local candidate, one minor/moderate candidate can be embedded in an existing ordinary turn without new settlement or model work, Recovery retains that exact candidate and Prompt, only an accepted final current reply resolves it, the phone view remains read-only and bounded, and the six-failure baseline does not increase.

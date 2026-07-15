# Storyteller S4 Notification Inbox Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add one non-blocking Storyteller event notification per save scope, a read-only world-engine inbox, and an independently recoverable `storyteller_event` narrative turn without changing time, stats, resources, tasks or ordinary/map settlement.

**Architecture:** Extend the existing incident schema with notification lifecycle metadata, add a pure `notifications.js` module, and let `app.js` scan only at committed safe checkpoints. A notification does not acquire the primary channel; explicit acceptance revalidates the candidate, acquires an exact lease, creates a dedicated Harness turn, freezes one Prompt and reuses current validation, Chronicle and Recovery gates.

**Tech Stack:** Native browser JavaScript, Node `node:test`, existing Storyteller modules, primary-model ownership, Harness active turns, SillyTavern postMessage bridge, existing phone UI.

---

## Workspace And Scope Rules

- Work on `codex/world-engine-control-console`; preserve all existing uncommitted changes.
- Use `apply_patch` for manual edits.
- For every task: write RED tests, run them and confirm the intended failure, implement the minimum, run focused tests, run relevant `node --check`, run `git diff --check`, and inspect the task diff.
- Do not create implementation commits unless the user explicitly asks.
- Do not begin S5 major-incident production code in this plan.
- Do not modify Prompt output tags, deterministic settlement, time calculation, tasks, resources, relationships, Director generation, host save ordering or ordinary/map Recovery meaning.

## File Map

- Modify `world/storyteller/incidents.js`: notification-compatible statuses, metadata, invite definitions, channel-aware selection and revalidation.
- Create `world/storyteller/notifications.js`: pure world-minute, notification lifecycle and scan-gate helpers.
- Modify `world/storyteller/injection.js`: independent event Prompt addendum.
- Modify `world/storyteller/phone-view.js`: bounded inbox and badge view models.
- Modify `app.js`: state normalization, safe checkpoint scans, inbox commands, event Harness turn, reply settlement and Recovery routing.
- Modify `index.html`: events tab and notification badge markup.
- Modify `style.css`: compact inbox, badges and confirmation styling.
- Modify `index.html` and `st.html`: load `notifications.js` before `app.js`.
- Create `tests/storyteller-notifications.test.mjs`: pure S4 schema/lifecycle tests.
- Create `tests/storyteller-event-turn.test.mjs`: ownership, Prompt, reply and Recovery execution tests.
- Modify `tests/storyteller-incidents.test.mjs`, `tests/storyteller-phone-view.test.mjs`, `tests/world-engine-phone-app.test.mjs`, `tests/harness-recovery.test.mjs`, `tests/primary-model-ownership.test.mjs`, `tests/storyteller-map-coverage.test.mjs` and `tests/world-director-injection.test.mjs` only where the S4 contract changes their covered surface.

## Task 1: Notification Schema And Pure Lifecycle

**Files:**
- Modify: `world/storyteller/incidents.js`
- Create: `world/storyteller/notifications.js`
- Modify: `index.html`
- Modify: `st.html`
- Create: `tests/storyteller-notifications.test.mjs`
- Modify: `tests/storyteller-incidents.test.mjs`

- [ ] **Step 1: Write RED loader and normalization tests**

Add tests requiring both loaders to install `notifications.js` after `incidents.js` and before `app.js`, and requiring legacy candidates to remain readable:

```js
test("notification module loads after incidents and before app", () => {
  const htmlIncidents = html.indexOf("world/storyteller/incidents.js");
  const htmlNotifications = html.indexOf("world/storyteller/notifications.js");
  const htmlApp = html.indexOf("app.js", htmlNotifications);
  assert.ok(htmlIncidents >= 0 && htmlNotifications > htmlIncidents && htmlApp > htmlNotifications);
  assert.ok(st.indexOf('"world/storyteller/incidents.js"') < st.indexOf('"world/storyteller/notifications.js"'));
});

test("notification metadata normalizes without leaking narrative fields", () => {
  const candidate = incidentApi.normalizeIncidentCandidate({
    incidentId: "incident:a",
    planId: "plan-a",
    saveScope: "chat-a",
    dayKey: "live+2",
    sourceTurnId: "notify-turn-a",
    category: "visitor",
    severity: "minor",
    archetypeId: "peer_invitation",
    actorIds: ["idol:A"],
    locationId: "courtyard",
    channel: "invite",
    status: "notified",
    notification: {
      notifiedAtWorldMinute: 3500,
      deferredUntilWorldMinute: null,
      expiresAtWorldMinute: 4940,
      notificationReason: "time_advance",
      prompt: "SECRET"
    }
  });
  assert.equal(candidate.status, "notified");
  assert.equal(candidate.notification.notificationReason, "time_advance");
  assert.equal(JSON.stringify(candidate).includes("SECRET"), false);
});
```

- [ ] **Step 2: Write RED lifecycle tests**

Require these pure APIs:

```js
const minute = notificationApi.buildStorytellerWorldMinute({ dayOrdinal: 2, clockMinutes: 600 });
assert.equal(minute, 3480);

const notified = notificationApi.transitionNotification(candidate, "notify", {
  worldMinute: 3480,
  reason: "open_world_engine"
});
assert.equal(notified.ok, true);
assert.equal(notified.candidate.status, "notified");

const deferred = notificationApi.transitionNotification(notified.candidate, "defer", { worldMinute: 3480 });
assert.equal(deferred.candidate.status, "deferred");
assert.equal(deferred.candidate.notification.deferredUntilWorldMinute, 3540);

const ignored = notificationApi.transitionNotification(notified.candidate, "ignore", { worldMinute: 3480 });
assert.equal(ignored.candidate.status, "expired");
```

Also prove:

- ordinary close has no transition API;
- invalid ownership cannot transition;
- deferred badge visibility returns after 60 game minutes;
- missing metadata stays `null` for legacy saves;
- notification reason is allowlisted and bounded;
- no Prompt, narrative, request, lease or Pressure content survives normalization.

- [ ] **Step 3: Run RED**

```powershell
node --test tests/storyteller-notifications.test.mjs tests/storyteller-incidents.test.mjs
```

Expected: failures for the missing module, statuses and notification metadata.

- [ ] **Step 4: Implement the minimal pure schema**

In `incidents.js`:

```js
const STATUSES = [
  "pending", "attached", "notified", "deferred", "invited",
  "resolved", "expired", "abandoned"
];
```

Add a bounded `notification` property to `normalizeIncidentCandidate()`. Do not add Prompt or response fields.

Create `notifications.js` exporting:

```js
global.HatsuWorldStorytellerNotifications = {
  buildStorytellerWorldMinute,
  normalizeNotificationMeta,
  getNotificationBadgeState,
  canScanNotification,
  transitionNotification
};
```

Allowed lifecycle edges for S4 are:

```js
pending: new Set(["notified", "expired"]),
notified: new Set(["deferred", "invited", "expired"]),
deferred: new Set(["notified", "invited", "expired"]),
invited: new Set(["resolved", "abandoned"])
```

The module must be pure and must not reference DOM, `state`, model APIs or persistence.

- [ ] **Step 5: Install the loader**

Add `world/storyteller/notifications.js` immediately after `incidents.js` in `index.html` and the `st.html` module list.

- [ ] **Step 6: Verify Task 1**

```powershell
node --test tests/storyteller-notifications.test.mjs tests/storyteller-incidents.test.mjs
node --check world/storyteller/incidents.js
node --check world/storyteller/notifications.js
git diff --check
```

Inspect only the Task 1 files before continuing.

## Task 2: Invite Catalog And Safe Checkpoint Scan

**Files:**
- Modify: `world/storyteller/incidents.js`
- Modify: `app.js`
- Modify: `tests/storyteller-incidents.test.mjs`
- Modify: `tests/storyteller-notifications.test.mjs`
- Modify: `tests/storyteller-map-coverage.test.mjs`
- Create: `tests/storyteller-notification-integration.test.mjs`

- [ ] **Step 1: Write RED channel-aware selection tests**

Require `selectIncidentCandidate()` to respect `requiredChannel`:

```js
const invite = api.selectIncidentCandidate({
  ...context(),
  requiredChannel: "invite",
  catalog: [attachDefinition, inviteDefinition]
});
assert.equal(invite.candidate.channel, "invite");
assert.equal(invite.candidate.status, "pending");

const attach = api.selectIncidentCandidate({
  ...context(),
  requiredChannel: "attach",
  catalog: [attachDefinition, inviteDefinition]
});
assert.equal(attach.candidate.channel, "attach");
```

Add exactly four conservative minor/moderate S4 invite definitions covering visitor, opportunity, task and resource directions. Each definition must have `channels: ["invite"]`, no major severity and no confirmation requirement.

- [ ] **Step 2: Write RED execution tests for scanning**

Extract and execute `scanStorytellerNotificationAtCheckpoint(trigger, options)` from `app.js`. Prove:

```js
const beforeBusiness = JSON.stringify({
  clock: state.freeMode.clockMinutes,
  stats: { Vo: state.Vo, Da: state.Da, Vi: state.Vi },
  tasks: state.tasks,
  log: state.log,
  activeTurn: state.harness.activeTurn
});
const result = helpers.scan("open_world_engine", { locationId: "courtyard" });
assert.equal(result.notified, true);
assert.equal(state.freeMode.world.storyteller.pendingCandidate.status, "notified");
assert.equal(JSON.stringify(businessSnapshot(state)), beforeBusiness);
assert.equal(modelCalls, 0);
assert.equal(ownerCalls, 0);
```

Also prove scans reject:

- empty/mismatched save scope;
- stale/missing plan;
- unsupported trigger;
- unresolved `pending/notified/deferred/invited/attached` candidate;
- active `storyteller_event` recovery;
- no legal invite definition;
- major candidates in S4;
- duplicate checkpoint selection for the same unresolved candidate.

- [ ] **Step 3: Write RED checkpoint placement tests**

Require scanning only after committed state at these sites:

- `applyFreeModeManualTimeAdvance()` after its existing `saveState()`;
- `handleApartmentCompanionChoiceSelection()` and `handleApartmentCompanionCustomChoice()` after their time/log save and before the next model request;
- accepted-final map ACK after the current map candidate has resolved;
- `openPhoneSnsApp()` after state shape is ready;
- `openPhoneWorldEngineApp()` after Director reconciliation and before render.

Do not call scanning inside low-level `advanceFreeModeTime()`.

- [ ] **Step 4: Run RED**

```powershell
node --test tests/storyteller-incidents.test.mjs tests/storyteller-notifications.test.mjs tests/storyteller-notification-integration.test.mjs tests/storyteller-map-coverage.test.mjs
```

- [ ] **Step 5: Implement channel-aware selection and scanning**

Add `requiredChannel` filtering before legality/scoring in `selectIncidentCandidate()`. The default remains `attach` so existing callers retain behavior.

For notification selection, derive the non-Harness source identity deterministically:

```js
const sourceTurnId = `notify:${dayKey}:${worldMinute}:${locationId || "none"}`;
```

Do not include the UI trigger in this identity. Opening SNS and the world-engine app at the same game time/location must address the same deterministic selection point.

Add to `app.js`:

```js
function scanStorytellerNotificationAtCheckpoint(trigger, options = {}) {
  // validate trigger/scope/plan/current candidate/recovery
  // build the bounded existing incident context
  // select requiredChannel: "invite"
  // transition pending -> notified
  // store one receipt and save only when a candidate is created
  // return { notified, reason, candidate }
}
```

Allowed triggers are `time_advance`, `map_complete`, `open_sns` and `open_world_engine`.

Do not scan inside `advanceFreeModeTime()`. Insert calls at the tested committed checkpoints. For a final map reply, scan only after the existing candidate settlement/Observation/Chronicle decision and `saveState("storyteller.candidate_resolved")` path has completed; never replace `pendingCandidate` before the resolved candidate is copied into `recentCandidates`. The scan may call `saveState("storyteller.notification_notified")` only when it creates a candidate.

- [ ] **Step 6: Verify Task 2**

Run the four focused suites, `node --check app.js`, `node --check world/storyteller/incidents.js`, `node --check world/storyteller/notifications.js`, `git diff --check`, and inspect the Task 2 diff.

## Task 3: Read-Only Inbox And Phone Badges

**Files:**
- Modify: `world/storyteller/phone-view.js`
- Modify: `app.js`
- Modify: `index.html`
- Modify: `style.css`
- Modify: `tests/storyteller-phone-view.test.mjs`
- Modify: `tests/world-engine-phone-app.test.mjs`

- [ ] **Step 1: Write RED view-model privacy tests**

Require:

```js
assert.deepEqual(model.inbox, {
  available: true,
  status: "notified",
  statusLabel: "待处理",
  categoryLabel: "来访者",
  severityLabel: "轻微",
  archetypeLabel: "同伴邀约",
  locationLabel: "中庭",
  actorLabels: ["秦谷美铃"],
  modifierLabels: ["意外提问"],
  deferred: false,
  requiresConfirmation: false
});
assert.equal(model.badges.worldEngine, true);
assert.equal(model.badges.sns, true);
assert.doesNotMatch(JSON.stringify(model), /incident:|turn:|request:|lease:|scope-secret|PROMPT|NARRATIVE|PRESSURE/);
```

Test that deferred candidates remain visible in the inbox while badges are false before the defer deadline and true afterward.

- [ ] **Step 2: Write RED renderer and command wiring tests**

Require:

- a fourth world-engine tab `data-world-engine-tab="events"`;
- `setWorldEnginePhoneTab()` accepts `events`;
- `renderWorldEngineEvents(model)` escapes all text;
- buttons use `data-storyteller-event-action="accept|defer|ignore"`;
- renderer contains no direct model call or `saveState()`;
- phone icon rendering adds a separate notification dot without replacing the app icon text;
- SNS and world-engine badges derive only from the bounded phone model.

- [ ] **Step 3: Run RED**

```powershell
node --test tests/storyteller-phone-view.test.mjs tests/world-engine-phone-app.test.mjs
```

- [ ] **Step 4: Implement bounded inbox UI**

Extend `phone-view.js` with `buildInboxView()` and `buildBadgeView()`. Reuse existing category, severity, archetype, location and modifier labels; never expose internal IDs.

Add the events tab in `index.html`. In `app.js`, render an empty state or one event card and bind delegated clicks in `bindPhoneWorldEngineEvents()` to:

```js
acceptStorytellerNotification();
deferStorytellerNotification();
ignoreStorytellerNotification();
```

Task 3 only wires commands; Task 4 supplies acceptance dispatch. Defer and ignore use pure lifecycle transitions, write bounded receipts and call one named save. Ordinary close remains unchanged.

Add restrained phone-sized styles for the card, action row and small app-icon notification dot. Do not create nested cards or modal marketing layouts.

- [ ] **Step 5: Verify Task 3**

Run both phone suites, `node --check app.js`, `node --check world/storyteller/phone-view.js`, `git diff --check`, and inspect HTML/CSS for overflow at the existing phone width.

## Task 4: Independent Event Turn, Ownership And Frozen Prompt

**Files:**
- Modify: `app.js`
- Modify: `world/storyteller/injection.js`
- Create: `tests/storyteller-event-turn.test.mjs`
- Modify: `tests/primary-model-ownership.test.mjs`
- Modify: `tests/world-director-injection.test.mjs`

- [ ] **Step 1: Write RED acquire-before-mutation tests**

Execute `acceptStorytellerNotification()` with a blocking owner and prove the entire state, candidate, activeTurn, input, UI and logs remain byte-identical except debug reject/toast.

For success, require exact order:

```text
revalidate candidate
create request identity
tryAcquirePrimaryModelChannel
create storyteller_event activeTurn
transition candidate to invited
build Prompt
capture Prompt
save generating state
requestHostPromptSend
```

Assert owner intent:

```js
{
  requestId: "request-event",
  ownerKind: "storyteller_event",
  turnId: "storyteller-turn-a",
  saveScope: "chat-a",
  sessionEpoch: "session-new"
}
```

- [ ] **Step 2: Write RED Harness shape and Prompt tests**

Require a bounded `storyteller_event` turn preserving `incidentId`, exact scope and frozen Prompt. `requestIds` is capped audit-only.

Add `composeStorytellerIndependentEventPromptAddendum(candidate, context)` and require the final Prompt order:

```text
bounded world facts
composeWorldDirectorPromptAddendum
composeStorytellerIndependentEventPromptAddendum
composeNarrativeAuthorityContract
outputContract
```

The Prompt must state that no time, stat, resource, reward, penalty or task result is authorized. It must not contain saveScope, planId, incidentId, turnId, requestId, randomSeed or Pressure contents.

- [ ] **Step 3: Run RED**

```powershell
node --test tests/storyteller-event-turn.test.mjs tests/primary-model-ownership.test.mjs tests/world-director-injection.test.mjs
```

- [ ] **Step 4: Implement event dispatch**

Add narrowly scoped helpers in `app.js`:

```js
function beginHarnessStorytellerEventTurn(candidate, requestId) { /* bounded prepared turn */ }
function buildStorytellerIndependentEventPrompt(candidate) { /* approved order */ }
function acceptStorytellerNotification() { /* revalidate, acquire, create, freeze, send */ }
```

Do not call ordinary `settleAction()`, map settlement, random-event selection, time advancement or task APIs.

Use existing `requestHostPromptSend()` with `ownerKind: "storyteller_event"`, exact lease and `generationMode: "shujuku_same_layer"`. Local non-host fallback opens the manual Prompt overlay without creating an owner and without transitioning the candidate to `invited` until the project’s existing local-manual semantics can prove dispatch.

- [ ] **Step 5: Verify Task 4**

Run the three focused suites, syntax checks for `app.js` and `injection.js`, `git diff --check`, and inspect acquire/mutation ordering.

## Task 5: Reply Gate, Resolution, Observation And Chronicle

**Files:**
- Modify: `app.js`
- Modify: `tests/storyteller-event-turn.test.mjs`
- Modify: `tests/storyteller-observations.test.mjs`
- Modify: `tests/harness-phase1.test.mjs`

- [ ] **Step 1: Write RED accepted-final execution tests**

Require exact current reply identity:

```js
const result = settleStorytellerEventForReply("request-current", true, false, true);
assert.equal(result.resolved, true);
assert.equal(state.harness.activeTurn.status, "completed");
assert.equal(state.freeMode.world.storyteller.pendingCandidate.status, "resolved");
assert.equal(observations.length, 1);
assert.equal(chronicleWrites, 1);
```

Prove stale request, requestIds history, wrong lease, wrong scope, partial reply, retry reply and incomplete narrative produce no candidate transition, observation or Chronicle request.

- [ ] **Step 2: Write RED atomic ordering tests**

In the accepted-final branch, require:

```text
reply validation
mark storyteller_event completed
resolve exact candidate
record Observation V2
Chronicle decision/write request
bounded save
exact lease release
ACK independent of release
```

Observation must carry the real category, severity, archetype and Pressure count from the resolved candidate. It must not be recorded again if the same final payload is delivered twice.

- [ ] **Step 3: Run RED**

```powershell
node --test tests/storyteller-event-turn.test.mjs tests/storyteller-observations.test.mjs tests/harness-phase1.test.mjs
```

- [ ] **Step 4: Implement exact settlement**

Extend `applyAiReply()` and `sendAiReplyAck()` only through dedicated `storyteller_event` branches. Do not loosen ordinary/map reply gates.

Add:

```js
function settleStorytellerEventForReply(requestId, accepted, retry, isFinal) {
  // exact active turn + exact candidate ownership + active save scope
  // transition invited -> resolved once
}
```

Reuse existing Chronicle decision helpers after validation. Extend `recordAcceptedFinalStorytellerObservation()` eligibility to completed `storyteller_event` turns without admitting phone, broadcast or other legacy entries.

- [ ] **Step 5: Verify Task 5**

Run the three focused suites, `node --check app.js`, `git diff --check`, and inspect reply ordering and exact identity comparisons.

## Task 6: Refresh Recovery And Explicit Abandonment

**Files:**
- Modify: `app.js`
- Modify: `tests/storyteller-event-turn.test.mjs`
- Modify: `tests/harness-recovery.test.mjs`
- Modify: `tests/primary-model-ownership.test.mjs`

- [ ] **Step 1: Write RED refresh-disposition tests**

Require old-session `prepared/generating` `storyteller_event` turns to become `recovery_required`, while completed/abandoned turns and unaccepted notifications do not.

- [ ] **Step 2: Write RED retry tests**

Require recovery to:

- preserve original `turnId`, `incidentId` and `generationPrompt`;
- generate a new `requestId`;
- acquire `ownerKind: "storyteller_event_recovery"`;
- use `activeTurn.requestId` as the only reply gate;
- never re-run notification scan, selection, time, random, task or log settlement;
- return to `recovery_required` on retryable failure.

- [ ] **Step 3: Write RED abandonment tests**

Require the existing dedicated recovery abandon button and second confirmation to transition both the exact event turn and exact candidate to `abandoned`. `closeHarnessRecoveryOverlay()` and `closeEventOverlay()` must remain mutation-free.

- [ ] **Step 4: Run RED**

```powershell
node --test tests/storyteller-event-turn.test.mjs tests/harness-recovery.test.mjs tests/primary-model-ownership.test.mjs
```

- [ ] **Step 5: Extend the shared Recovery path**

Update the generic checks to admit `turn.kind === "storyteller_event"`. Select recovery owner kind as:

```js
const recoveryOwnerKind = turn.kind === "map_explore"
  ? "map_recovery"
  : turn.kind === "storyteller_event"
    ? "storyteller_event_recovery"
    : "ordinary_recovery";
```

Use event-specific overlay copy stating that no numeric/time settlement occurred. On confirmed abandonment, call a dedicated exact candidate transition hook; do not reuse ordinary/map expiration by loose identity.

- [ ] **Step 6: Verify Task 6**

Run the three focused suites, `node --check app.js`, `git diff --check`, and inspect every new Recovery kind branch.

## Task 7: S4 Acceptance Gate

**Files:**
- Test all S4 and existing Storyteller/Harness/Director/phone suites.

- [ ] **Step 1: Run the focused integration set**

```powershell
$files = @();
$files += Get-ChildItem tests -Filter 'storyteller-*.test.mjs';
$files += Get-ChildItem tests -Filter 'world-director-*.test.mjs';
$files += Get-ChildItem tests -Filter 'harness-*.test.mjs';
$files += Get-ChildItem tests -Filter '*ownership*.test.mjs';
$files += Get-ChildItem tests -Filter 'world-engine-phone-app.test.mjs';
$files += Get-ChildItem tests -Filter 'free-mode.test.mjs';
node --test ($files.FullName | Sort-Object -Unique)
```

Expected: zero focused failures.

- [ ] **Step 2: Run the full suite**

```powershell
node --test tests
```

Expected: only the six documented baseline failures, with no additions.

- [ ] **Step 3: Run syntax and diff checks**

```powershell
node --check app.js
Get-ChildItem world/storyteller -Filter '*.js' | ForEach-Object { node --check $_.FullName }
git diff --check
git status --short
```

- [ ] **Step 4: Perform real SillyTavern acceptance**

1. Open the world-engine app with a legal current plan and confirm one local invite notification appears without a model request.
2. Close the app and confirm the candidate remains notified.
3. Choose Later, confirm the inbox remains readable and phone badges hide until 60 game minutes pass.
4. Ignore a candidate and confirm it becomes expired without creating an owner or Harness turn.
5. With another primary request active, click Accept and confirm candidate, activeTurn, input, UI and logs remain unchanged.
6. Accept with a free channel and confirm owner kind `storyteller_event`, one frozen Prompt and no time/stat/task changes.
7. Complete a valid reply and confirm candidate resolution, one observation and one Chronicle write.
8. Refresh during generation and confirm Recovery appears without automatic resend.
9. Retry and confirm new request/lease with original turn, incident and Prompt.
10. Close Recovery and confirm no abandonment; use the dedicated confirmed abandon action and confirm both event turn and candidate become abandoned.
11. Switch chat scope and confirm the prior notification/event cannot render, recover or commit.

- [ ] **Step 5: Stop before S5**

Report changed files/functions, every Task’s RED/GREEN result, focused/full test counts, the six baseline failures, manual host results, deviations and residual risks. Do not add major incidents or Character Intent until the user accepts the S4 report.

## S4 Stop Conditions

Stop and request a design decision if implementation requires any of the following:

- automatic time, stat, resource, reward, penalty or task settlement;
- more than one pending notification;
- a new model output tag;
- a model request during scanning;
- Character Intent or major incident definitions;
- migration of phone chat, broadcast, commission, gift, First Live or choice continuation;
- forced interruption, automatic resend or ordinary-close abandonment;
- changing ordinary/map settlement or loosening exact request/lease/scope gates.

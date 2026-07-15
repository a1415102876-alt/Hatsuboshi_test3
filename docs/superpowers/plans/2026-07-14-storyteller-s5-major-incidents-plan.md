# Storyteller S5 Major Incidents Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add deterministic, explicitly confirmed major Storyteller incidents that reuse the S4 inbox, Harness event turn, ownership, validation and Recovery path without introducing automatic interruption or gameplay settlement.

**Architecture:** Extend the immutable incident catalog with six `invite`-only major definitions and add an explicit major-selection permission plus pure full-candidate revalidation. The existing single inbox remains the only candidate slot; major acceptance and decline use a dedicated confirmation overlay, then revalidate exact scope/day/plan/definition/instance before any owner or state mutation.

**Tech Stack:** Native browser JavaScript, existing Storyteller modules, Harness primary ownership, SillyTavern bridge, Node `node:test`.

---

## Scope Rules

- Preserve the current S4 single-candidate inbox and `storyteller_event` turn.
- Do not add automatic interruption, automatic model requests, time/stat/resource/task settlement, new output tags, Character Intent, queues or side-flow migration.
- Major incidents are impossible unless pacing is `crisis_allowed`, `severityBudget.major > used`, the definition is invite-only and `requiresConfirmation: true`.
- Every Task follows RED test, expected failure, minimal implementation, focused tests, `node --check`, `git diff --check`, and diff inspection.
- Do not commit implementation unless the user requests it.

## File Map

- Modify `world/storyteller/incidents.js`: major definitions, explicit major selection permission, definition identity and pure full revalidation.
- Modify `world/storyteller/plan.js`: conservative deterministic transition into `crisis_allowed` with one major budget.
- Modify `world/storyteller/injection.js`: bounded labels for new archetypes/modifiers; reuse the existing no-authoritative-state-change event contract.
- Modify `world/storyteller/phone-view.js`: bounded major inbox presentation and confirmation flags.
- Modify `app.js`: major scan policy, confirmation overlay commands, exact revalidation before acquire, confirmed decline and audit receipts.
- Modify `index.html`: one reusable major-confirmation dialog.
- Modify `style.css`: compact confirmation dialog styles.
- Create `tests/storyteller-major-incidents.test.mjs`: catalog, legality, determinism, revalidation and execution tests.
- Modify `tests/storyteller-incidents.test.mjs`, `tests/storyteller-event-turn.test.mjs`, `tests/storyteller-phone-view.test.mjs`, `tests/world-engine-phone-app.test.mjs`, and `tests/storyteller-notification-integration.test.mjs` where S5 extends their contracts.

## Task 1: Major Catalog And Explicit Selection Gate

**Files:**
- Modify: `world/storyteller/incidents.js`
- Modify: `world/storyteller/plan.js`
- Create: `tests/storyteller-major-incidents.test.mjs`
- Modify: `tests/storyteller-incidents.test.mjs`
- Modify: `tests/storyteller-plan.test.mjs`

- [ ] **Step 1: Write RED catalog tests**

Require exactly six conservative major definitions, one per category. Every definition must use `channels: ["invite"]`, `severityRange: ["major"]`, `allowedPacing: ["crisis_allowed"]`, `allowedActions: ["notification"]`, `requiresConfirmation: true`, at most eight actor/modifier entries and no deterministic result text.

- [ ] **Step 2: Write RED legality tests**

Require `evaluateIncidentDefinition(definition, context)` to reject a major definition by default and accept it only when `context.allowMajorConfirmation === true`, the plan is `crisis_allowed`, and major budget remains. Prove normal/tense pacing, zero budget, exhausted budget, wrong scope/day/action/location/prerequisite and attach-channel selection all reject.

Require `buildStorytellerPlan()` to produce `crisis_allowed` with major budget `1` only when recent stats contain at least two moderate events, no major event and the normal cooldown constraints allow escalation. Calm/normal/tense plans retain major budget `0`.

- [ ] **Step 3: Write RED deterministic selection tests**

Call `selectIncidentCandidate()` twice with the same crisis context and `allowMajorConfirmation: true`. Require the same incident, actor, location, modifiers and fingerprint, `severity === "major"`, `requiresConfirmation === true`, `channel === "invite"`, and a bounded `definitionId`. Without the explicit permission, the same catalog produces no major candidate.

- [ ] **Step 4: Run RED**

```powershell
node --test tests/storyteller-major-incidents.test.mjs tests/storyteller-incidents.test.mjs
```

- [ ] **Step 5: Implement the catalog and permission**

Add six immutable definitions:

```js
major_hostile_public_confrontation
major_environment_venue_disruption
major_resource_critical_conflict
major_visitor_authority_arrival
major_task_official_deadline
major_opportunity_high_visibility
```

Add bounded `definitionId` to normalized candidates. `evaluateIncidentDefinition()` may admit a major definition only when `allowMajorConfirmation === true`; ordinary/map callers never pass it. Candidate creation preserves the definition's confirmation flag instead of hardcoding `false`.

- [ ] **Step 6: Verify Task 1**

Run the incident and plan focused suites, syntax checks for both source files, `git diff --check`, and inspect that no attach definition gained major severity.

## Task 2: Pure Full Candidate Revalidation

**Files:**
- Modify: `world/storyteller/incidents.js`
- Modify: `tests/storyteller-major-incidents.test.mjs`

- [ ] **Step 1: Write RED revalidation tests**

Require:

```js
revalidateIncidentCandidate(candidate, context, {
  requiredChannel: "invite",
  allowMajorConfirmation: true
})
```

The result is valid only when definitionId, scope, day, plan, sourceTurnId, category, severity, actors, targets, location, modifiers, fingerprint, channel and confirmation flag exactly match a freshly evaluated legal instance.

- [ ] **Step 2: Prove stale candidates reject without mutation**

Test changed plan revision/identity, pacing, major budget, location, present actors, assigned actor, Pressure facts, cooldown list, fingerprint history, scope and day. Revalidation must return a bounded reason and must not rewrite the candidate.

- [ ] **Step 3: Run RED**

```powershell
node --test tests/storyteller-major-incidents.test.mjs
```

- [ ] **Step 4: Implement pure revalidation**

Find the immutable definition by `candidate.definitionId`, rerun legality and instance construction with the supplied context, rebuild the fingerprint, then compare every ownership and instance field. The function must not read DOM, global state, model APIs or persistence.

- [ ] **Step 5: Verify Task 2**

Run the focused suite, syntax and diff checks, and inspect that revalidation cannot repair stale ownership fields.

## Task 3: Major Scan And Bounded Inbox View

**Files:**
- Modify: `app.js`
- Modify: `world/storyteller/phone-view.js`
- Modify: `world/storyteller/injection.js`
- Modify: `tests/storyteller-notification-integration.test.mjs`
- Modify: `tests/storyteller-phone-view.test.mjs`
- Modify: `tests/storyteller-major-incidents.test.mjs`

- [ ] **Step 1: Write RED scan tests**

At the existing safe checkpoints, a crisis plan with major budget may select a major candidate by passing `allowMajorConfirmation: true`. Non-crisis plans retain S4 minor/moderate behavior. Scanning remains local, single-candidate, owner-free and model-free.

- [ ] **Step 2: Write RED view privacy tests**

Require the inbox to expose `isMajor`, `requiresConfirmation`, bounded labels and confirmation copy only. It must not expose definitionId, IDs, Prompt, Pressure contents, request/lease/scope or full candidate data.

- [ ] **Step 3: Write RED Prompt-label tests**

Require all six new archetypes and their allowlisted modifiers to produce a nonempty independent-event addendum. The existing no-time/stat/resource/reward/penalty/task contract remains present.

- [ ] **Step 4: Run RED**

```powershell
node --test tests/storyteller-major-incidents.test.mjs tests/storyteller-notification-integration.test.mjs tests/storyteller-phone-view.test.mjs
```

- [ ] **Step 5: Implement bounded scan and view support**

Pass `allowMajorConfirmation: true` only from notification scanning. Keep ordinary/map selection unchanged. Add bounded labels and major-specific inbox text without adding SNS posts or extra state.

- [ ] **Step 6: Verify Task 3**

Run the three focused suites, syntax checks for the three source files, and `git diff --check`.

## Task 4: Confirmation, Revalidation And Exact Acquire

**Files:**
- Modify: `index.html`
- Modify: `style.css`
- Modify: `app.js`
- Modify: `tests/storyteller-major-incidents.test.mjs`
- Modify: `tests/storyteller-event-turn.test.mjs`
- Modify: `tests/world-engine-phone-app.test.mjs`

- [ ] **Step 1: Write RED confirmation tests**

Clicking Accept on a major candidate opens a confirmation dialog and does not create requestId, owner, Harness turn, Prompt, log or state mutation. Cancel/ordinary close is mutation-free. Minor/moderate Accept continues directly through the S4 path.

- [ ] **Step 2: Write RED confirmed-acquire tests**

On confirmation, require exact order:

```text
read exact candidate
rebuild current incident context
full pure revalidation
create request/turn identity
tryAcquirePrimaryModelChannel
create storyteller_event turn
transition candidate invited
freeze Prompt
save generating
send
```

Any failed revalidation or occupied owner leaves candidate, Harness, input, UI and logs unchanged except bounded toast/debug rejection.

- [ ] **Step 3: Write RED stale-confirmation tests**

Open confirmation, then change scope/day/plan/location/actors/budget or candidate identity before confirming. No request or owner may be created.

- [ ] **Step 4: Run RED**

```powershell
node --test tests/storyteller-major-incidents.test.mjs tests/storyteller-event-turn.test.mjs tests/world-engine-phone-app.test.mjs
```

- [ ] **Step 5: Implement one reusable confirmation overlay**

Add `openStorytellerMajorConfirmation(mode)`, `closeStorytellerMajorConfirmation()`, `confirmStorytellerMajorAction()` and a shared `dispatchAcceptedStorytellerCandidate(candidate)` extracted from the current S4 accept body. The overlay stores no candidate object or secret identifiers; confirmation rereads current state.

- [ ] **Step 6: Verify Task 4**

Run the three focused suites, `node --check app.js`, `git diff --check`, and inspect acquire-before-mutation ordering.

## Task 5: Confirmed Decline And Audit Semantics

**Files:**
- Modify: `app.js`
- Modify: `world/storyteller/notifications.js`
- Modify: `tests/storyteller-major-incidents.test.mjs`
- Modify: `tests/storyteller-notifications.test.mjs`

- [ ] **Step 1: Write RED decline tests**

Major Ignore must open confirmation. Confirmed decline transitions the exact notified/deferred candidate to `expired`, writes one bounded `declined`/`expired` receipt and saves once. Cancel and stale confirmation are mutation-free. Minor/moderate Ignore retains the S4 direct behavior.

- [ ] **Step 2: Write RED audit privacy tests**

Receipts may contain bounded event/reason/day/scope ownership references but never Prompt, response, full request/lease, Pressure contents or full state. Duplicate confirmation cannot write twice.

- [ ] **Step 3: Run RED**

```powershell
node --test tests/storyteller-major-incidents.test.mjs tests/storyteller-notifications.test.mjs
```

- [ ] **Step 4: Implement confirmed decline**

Reuse the same confirmation overlay with mode `decline`. On confirm, reread and revalidate the current major candidate, then call the existing explicit ignore transition. Do not acquire ownership or create a Harness turn.

- [ ] **Step 5: Verify Task 5**

Run focused tests, source syntax checks and `git diff --check`.

## Task 6: S5 Acceptance Gate

**Files:**
- Test all Storyteller, Harness, ownership, world-engine phone, Director and free-mode suites.

- [ ] **Step 1: Run focused integration tests**

```powershell
$files = @()
$files += Get-ChildItem tests -Filter 'storyteller-*.test.mjs'
$files += Get-ChildItem tests -Filter 'world-director-*.test.mjs'
$files += Get-ChildItem tests -Filter 'harness-*.test.mjs'
$files += Get-ChildItem tests -Filter '*ownership*.test.mjs'
$files += Get-ChildItem tests -Filter 'world-engine-phone-app.test.mjs'
$files += Get-ChildItem tests -Filter 'free-mode.test.mjs'
node --test ($files.FullName | Sort-Object -Unique)
```

Expected: zero focused failures.

- [ ] **Step 2: Run full suite**

```powershell
node --test tests
```

Expected: only the six documented baseline failures.

- [ ] **Step 3: Run syntax and diff checks**

```powershell
node --check app.js
Get-ChildItem world/storyteller -Filter '*.js' | ForEach-Object { node --check $_.FullName }
git diff --check
git status --short
```

- [ ] **Step 4: Real SillyTavern checklist**

Verify crisis-only major discovery, bounded major inbox, accept confirmation, cancel purity, stale confirmation rejection, owner competition, valid generation, refresh Recovery, confirmed decline, switch-chat isolation, and unchanged ordinary/map/phone/broadcast behavior.

- [ ] **Step 5: Stop after S5**

Report changed files/functions, RED/GREEN results, automated counts, baseline failures, unexecuted host checks, deviations and remaining boundaries. Do not start Character Intent, forced interruption, queues or side-flow migration.

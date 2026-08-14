# N.I.A 5000 Fan Bond Event Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Force a one-time, AI-generated Saki bond story immediately after N.I.A fans first reach 5000, and block later N.I.A actions until its VN playback completes.

**Architecture:** Add focused state and API modules for the milestone. Persist the normalized state inside `state.nia`, route every fan-changing settlement through one reconciliation helper, and reuse the primary-model lease and VN overlay without coupling this event to rewards, database writes, or legacy affinity.

**Tech Stack:** Browser JavaScript, SillyTavern host bridge, existing VN overlay, Node.js `node:test`.

---

### Task 1: Persisted milestone state machine

**Files:**
- Create: `nia-fan-milestone-core.js`
- Create: `tests/nia-fan-milestone-core.test.mjs`

- [x] **Step 1: Write failing transition tests**

Test default normalization, Saki-only reconciliation at 5000 fans, non-N.I.A rejection, idempotent repeated checks, interrupted generation recovery, matching story application, and idempotent completion.

```js
const pending = core.reconcileFanMilestone(core.normalizeFanMilestone({}), {
  scenario: "nia", idolName: "花海咲季", fans: 5000
});
assert.equal(pending.status, "pending");
```

- [x] **Step 2: Run the core test and verify RED**

Run `node --test tests/nia-fan-milestone-core.test.mjs`.
Expected: FAIL because the module does not exist.

- [x] **Step 3: Implement the minimal core**

Export and register on `globalThis.HatsuNiaFanMilestone`:

```js
NIA_FAN_MILESTONE_EVENT_ID
NIA_FAN_MILESTONE_THRESHOLD
normalizeFanMilestone(raw)
reconcileFanMilestone(raw, context)
beginFanMilestoneGeneration(raw, request)
applyFanMilestoneStory(raw, payload)
recoverInterruptedFanMilestone(raw)
completeFanMilestone(raw)
```

Use only `idle`, `pending`, `generating`, `playing`, `retryable_failed`, and `completed`. No transition may apply rewards.

- [x] **Step 4: Run the core test and verify GREEN**

Run `node --test tests/nia-fan-milestone-core.test.mjs`.
Expected: PASS.

### Task 2: Tagged AI contract and story seed

**Files:**
- Create: `nia-fan-milestone-api.js`
- Create: `tests/nia-fan-milestone-api.test.mjs`

- [x] **Step 1: Write failing prompt and parser tests**

Require the prompt to contain the event ID, current fans, producer profile, seven approved plot beats, VN-only output, and prohibitions on choices and numerical settlement. Require the parser to select the last valid matching tag and return only `schemaVersion`, `eventId`, and `story`.

- [x] **Step 2: Run the API test and verify RED**

Run `node --test tests/nia-fan-milestone-api.test.mjs`.
Expected: FAIL because the API module does not exist.

- [x] **Step 3: Implement the contract**

Export and register:

```js
buildNiaFanMilestonePrompt(context, runtime)
parseNiaFanMilestonePayload(source, expected)
```

Use `<NIA_FAN_MILESTONE_EVENT>` around strict JSON. Bake the approved source into the prompt so runtime does not depend on the external `E:` drive. Ignore planning outside tags and discard settlement override fields.

- [x] **Step 4: Run API tests and verify GREEN**

Run `node --test tests/nia-fan-milestone-api.test.mjs`.
Expected: PASS.

### Task 3: Module loading and N.I.A persistence

**Files:**
- Modify: `index.html`
- Modify: `st.html`
- Modify: `app.js`
- Create: `tests/nia-fan-milestone-flow.test.mjs`

- [x] **Step 1: Write failing loader and state tests**

Assert direct mode loads both modules before `app.js`; embedded mode fetches both with `cache: 'no-store'`; and `createDefaultNiaState()` plus `normalizeNiaState()` preserve `fanMilestoneEvent`.

- [x] **Step 2: Run flow tests and verify RED**

Run `node --test tests/nia-fan-milestone-flow.test.mjs`.
Expected: FAIL because loaders and state fields are missing.

- [x] **Step 3: Add loaders and persisted state**

Follow the audition loader pattern. Bind `globalThis.HatsuNiaFanMilestone`, initialize the default field, and normalize old saves without changing other N.I.A state.

- [x] **Step 4: Run loader tests and verify GREEN**

Run `node --test tests/nia-fan-milestone-flow.test.mjs tests/nia-host-bridge.test.mjs`.
Expected: PASS.

### Task 4: Fan settlement reconciliation and forced VN

**Files:**
- Modify: `app.js`
- Modify: `tests/nia-fan-milestone-flow.test.mjs`

- [x] **Step 1: Write failing settlement and orchestration tests**

Require one `reconcileNiaFanMilestoneAfterSettlement()` helper after producer work, live, radio, and audition fan writes. Require original progression and new fan totals to save before event generation. Require request, failure, reply, completion, and resume functions.

- [x] **Step 2: Run the flow test and verify RED**

Run `node --test tests/nia-fan-milestone-flow.test.mjs`.
Expected: FAIL because settlements return directly to normal N.I.A flow.

- [x] **Step 3: Reconcile after every fan write**

Pass `{ scenario: state.produceScenario, idolName: state.idol, fans: training.fans }` through the shared core helper. Save the activity settlement first. Only a new `pending` state may launch the event; all later states are idempotent.

- [x] **Step 4: Add primary-model request handling**

Use owner kind `nia_fan_milestone`. Persist request identity before sending. Release its lease and retain `retryable_failed` on occupied channel, unavailable host, malformed reply, or interruption. A valid reply enters `playing` and opens a VN without options.

- [x] **Step 5: Complete after final VN playback**

Use `activeStoryNode.type === "niaFanMilestone"`. Generating and failed nodes cannot be dismissed. Final playback calls the idempotent completion transition, clears temporary VN state, saves, and restores N.I.A.

- [x] **Step 6: Run flow tests and verify GREEN**

Run:

```powershell
node --test tests/nia-fan-milestone-flow.test.mjs tests/nia-audition-recap-flow.test.mjs tests/nia-producer-work-flow.test.mjs tests/nia-live-business-ui.test.mjs tests/nia-radio-business-ui.test.mjs
```

Expected: PASS.

### Task 5: Recovery priority and global blocking

**Files:**
- Modify: `app.js`
- Modify: `tests/nia-fan-milestone-flow.test.mjs`

- [x] **Step 1: Write failing recovery tests**

Require milestone recovery before radio, live, audition, opening, or the tablet. Require unfinished states to replace normal N.I.A actions with forced continuation. Require old saves already above 5000 to enter `pending`.

- [x] **Step 2: Run recovery tests and verify RED**

Run `node --test tests/nia-fan-milestone-flow.test.mjs`.
Expected: FAIL because ordinary N.I.A recovery currently has priority.

- [x] **Step 3: Implement recovery and blocking**

`pending` starts generation, interrupted `generating` becomes retryable, `playing` reopens saved VN, `retryable_failed` exposes only retry, and `completed` does not intercept. Guard all N.I.A action entry points through this state.

- [x] **Step 4: Run recovery tests and verify GREEN**

Run `node --test tests/nia-fan-milestone-flow.test.mjs tests/nia-host-bridge.test.mjs tests/nia-prototype.test.mjs`.
Expected: PASS.

### Task 6: Regression verification

**Files:**
- Verify: `app.js`
- Verify: `index.html`
- Verify: `st.html`
- Verify: `nia-fan-milestone-core.js`
- Verify: `nia-fan-milestone-api.js`

- [x] **Step 1: Run syntax checks**

```powershell
node --check app.js
node --check nia-fan-milestone-core.js
node --check nia-fan-milestone-api.js
```

- [x] **Step 2: Run every N.I.A test**

```powershell
$niaTests = Get-ChildItem tests -Filter 'nia-*.test.mjs' | ForEach-Object FullName
node --test $niaTests
```

- [x] **Step 3: Check patch hygiene**

Run `git diff --check`, then inspect only the milestone files plus `app.js`, `index.html`, and `st.html`. Confirm fan rewards, attribute rewards, action advancement, database behavior, legacy affinity, and audition recap behavior are unchanged.

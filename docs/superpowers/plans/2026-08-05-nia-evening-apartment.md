# N.I.A Evening Apartment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a mandatory 22:00 apartment phase after every completed N.I.A plan day while reusing the full sandbox apartment UI without changing sandbox time or day state.

**Architecture:** A new `nia-evening-core.js` owns the persistent, idempotent N.I.A evening state. `app.js` supplies a mode-aware apartment adapter for date, clock, companion and sleep operations, while all existing apartment DOM and interaction flows remain shared. Every N.I.A path that advances `training.actionIndex` activates the evening before routing through forced events and recovery.

**Tech Stack:** Browser JavaScript, DOM APIs, Node.js built-in test runner, existing N.I.A state modules.

**Repository Constraint:** Do not create Git commits. Preserve all unrelated working-tree changes.

---

### Task 1: N.I.A Evening State Core

**Files:**
- Create: `nia-evening-core.js`
- Create: `tests/nia-evening-core.test.mjs`

- [ ] **Step 1: Write failing state tests**

Cover default normalization, activation at 22:00, duplicate activation preserving state, bounded time advancement, and idempotent completion without touching a training object.

- [ ] **Step 2: Verify the tests fail**

Run: `node --test tests/nia-evening-core.test.mjs`

Expected: failure because `HatsuNiaEvening` is not registered.

- [ ] **Step 3: Implement the state module**

Expose `normalizeEvening`, `activateEvening`, `advanceEveningClock`, `setEveningCompanion`, `completeEvening`, and `isEveningActive`. Activation accepts a completed zero-based day index and starts at minute 1320. Completion only changes evening state.

- [ ] **Step 4: Verify core tests pass**

Run: `node --test tests/nia-evening-core.test.mjs`

Expected: all tests pass.

### Task 2: Module Loading and N.I.A Persistence

**Files:**
- Modify: `index.html`
- Modify: `st.html`
- Modify: `app.js`
- Create: `tests/nia-evening-flow.test.mjs`

- [ ] **Step 1: Write failing loader and persistence tests**

Assert that direct and embedded entry points load `nia-evening-core.js` before `app.js`, and that `normalizeNiaState` persists a normalized `evening` field.

- [ ] **Step 2: Verify the tests fail**

Run: `node --test tests/nia-evening-flow.test.mjs`

Expected: missing module and missing normalized state assertions fail.

- [ ] **Step 3: Register the module and state field**

Add the script to both entry paths, bind `globalThis.HatsuNiaEvening`, and normalize `nia.evening` with the new core.

- [ ] **Step 4: Verify loader and persistence tests pass**

Run: `node --test tests/nia-evening-flow.test.mjs`

Expected: all tests pass.

### Task 3: Day Completion Coordinator

**Files:**
- Modify: `app.js`
- Modify: `tests/nia-evening-flow.test.mjs`

- [ ] **Step 1: Write failing completion-path tests**

Assert that ordinary actions, companion campus completion, producer work, SNS, live and radio settlements all invoke one `activateNiaEveningAfterDayCompletion(previousActionIndex)` coordinator immediately after successfully advancing `training.actionIndex`.

- [ ] **Step 2: Verify the tests fail**

Run: `node --test tests/nia-evening-flow.test.mjs`

Expected: coordinator calls are absent.

- [ ] **Step 3: Implement idempotent activation and route guards**

Capture the prior action index before each settlement, activate the matching evening once, persist it, and prevent the next N.I.A plan action from starting while evening status is active.

- [ ] **Step 4: Verify completion-path tests pass**

Run: `node --test tests/nia-evening-flow.test.mjs`

Expected: all completion paths are covered.

### Task 4: Mode-Aware Apartment Adapter

**Files:**
- Modify: `app.js`
- Modify: `tests/nia-evening-flow.test.mjs`
- Modify: `tests/free-mode.test.mjs`

- [ ] **Step 1: Write failing adapter tests**

Assert that an active N.I.A evening makes the shared apartment active, displays `N.I.A Day N`, reads 22:00 from `nia.evening`, stores the companion in N.I.A state, hides campus return, and leaves `freeMode.postLiveDay` and `freeMode.clockMinutes` unchanged.

- [ ] **Step 2: Verify the tests fail**

Run: `node --test tests/nia-evening-flow.test.mjs tests/free-mode.test.mjs`

Expected: current apartment helpers read only `freeMode`.

- [ ] **Step 3: Implement apartment state accessors**

Introduce focused helpers for current apartment mode, clock, day label, companion, time advancement and active state. Update apartment rendering, prompts and interaction-time calls to use them while preserving existing sandbox behavior.

- [ ] **Step 4: Verify adapter and sandbox tests pass**

Run: `node --test tests/nia-evening-flow.test.mjs tests/free-mode.test.mjs`

Expected: N.I.A adapter tests and existing sandbox apartment tests pass.

### Task 5: N.I.A Return Home, Sleep and Recovery

**Files:**
- Modify: `app.js`
- Modify: `tests/nia-evening-flow.test.mjs`

- [ ] **Step 1: Write failing navigation tests**

Assert that active N.I.A evening opens the existing return-home choice, permits eligible assigned-idol companionship, restores the apartment after refresh, blocks ordinary N.I.A actions, and dispatches sleep to N.I.A completion rather than `advanceFreeModeToNextDay`.

- [ ] **Step 2: Verify the tests fail**

Run: `node --test tests/nia-evening-flow.test.mjs`

Expected: recovery and sleep still use only sandbox flow.

- [ ] **Step 3: Implement N.I.A navigation**

Add N.I.A-specific entry through the shared return-home overlay, restore active evening from `resumeNiaModeIfNeeded`, and complete sleep by marking evening completed, clearing apartment transient state, returning to the N.I.A tablet, and leaving `training.actionIndex` unchanged.

- [ ] **Step 4: Verify navigation tests pass**

Run: `node --test tests/nia-evening-flow.test.mjs`

Expected: all navigation and recovery assertions pass.

### Task 6: Full Regression Verification

**Files:**
- Verify only.

- [ ] **Step 1: Run N.I.A and apartment suites**

Run the existing N.I.A training, business, radio, SNS, audition, fan milestone, free-mode, summary-round and apartment-related tests together with `tests/nia-evening-core.test.mjs` and `tests/nia-evening-flow.test.mjs`.

- [ ] **Step 2: Run syntax checks**

Run: `node --check nia-evening-core.js` and `node --check app.js`.

- [ ] **Step 3: Check patch hygiene**

Run: `git diff --check`.

Expected: no whitespace errors; unrelated existing working-tree files remain untouched.

### Task 7: Return-Home Entry on the Training Screen

**Files:**
- Modify: `app.js`
- Modify: `tests/nia-evening-flow.test.mjs`

- [ ] **Step 1: Write failing routing tests**

Assert that `renderActionButtons` renders only a `nia_evening_go_home` action while an unentered evening is active, that the action handler opens `openApartmentGoHomeOverlay`, and that recovery does not open the overlay automatically.

- [ ] **Step 2: Verify the tests fail**

Run: `node --test tests/nia-evening-flow.test.mjs`

Expected: the action does not exist, recovery still opens the overlay, and sleep still shows the prototype iframe.

- [ ] **Step 3: Implement the training-screen entry and sleep route**

Give active unentered evenings first priority in `renderActionButtons`, add the `nia_evening_go_home` click route, make recovery render the training screen without opening the home overlay, preserve direct apartment recovery when `atApartment` is true, and keep the prototype iframe hidden after N.I.A sleep.

- [ ] **Step 4: Verify the focused flow**

Run: `node --test tests/nia-evening-flow.test.mjs tests/nia-training-flow.test.mjs tests/free-mode.test.mjs`

Expected: all focused N.I.A evening, training, and sandbox apartment tests pass.

- [ ] **Step 5: Run full N.I.A regression and hygiene checks**

Run every `tests/nia-*.test.mjs` file plus `tests/free-mode.test.mjs`, then run `node --check app.js`, `node --check nia-evening-core.js`, and `git diff --check`.

Expected: all targeted tests and syntax checks pass with no whitespace errors.

### Task 8: Split N.I.A Apartment Affinity from Sandbox Relationships

**Files:**
- Modify: `app.js`
- Modify: `tests/nia-evening-flow.test.mjs`
- Verify: `tests/free-mode.test.mjs`

- [x] **Step 1: Write failing mode-routing tests**

Add focused tests proving that N.I.A apartment eligibility and prompt affinity read `state.trust`, that N.I.A chat applies only the assigned idol delta to `state.trust` within `0..100`, and that sandbox apartment chat continues to call `applyFreeModeRelationshipUpdate`.

- [x] **Step 2: Verify the new tests fail for the current sandbox-only implementation**

Run: `node --test tests/nia-evening-flow.test.mjs`

Expected: FAIL because the shared apartment helpers and reply route still call `getFreeModeRelationshipScore` and `applyFreeModeRelationshipUpdate` during N.I.A evenings.

- [x] **Step 3: Implement shared apartment affinity access and settlement boundaries**

Add helpers that return only the current assigned idol with `state.trust` in N.I.A, preserve the sandbox eligible-idol list otherwise, format the prompt from the active mode, and route parsed `relationship_update` through an N.I.A settlement that clamps the assigned idol delta to `-5..5` and the resulting trust to `0..100`. Update同行、亲密、邀约、提示词和聊天 reply routing to use the helpers.

- [x] **Step 4: Verify focused and sandbox behavior**

Run: `node --test tests/nia-evening-flow.test.mjs tests/free-mode.test.mjs`

Expected: the N.I.A tests use `state.trust`; all existing sandbox relationship tests remain green.

- [x] **Step 5: Run full N.I.A regression and hygiene checks**

Run every `tests/nia-*.test.mjs` file plus `tests/free-mode.test.mjs`, then run `node --check app.js`, `node --check nia-evening-core.js`, and `git diff --check`.

Expected: zero failures and no syntax or whitespace errors.

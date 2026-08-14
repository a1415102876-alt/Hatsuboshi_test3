# N.I.A Opening Story Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generate and play a dedicated N.I.A opening story through the SillyTavern primary API after contract signing, then enter planning day only after the player confirms the story.

**Architecture:** Extend the persisted `state.nia` state machine with an opening lifecycle, and route the opening through the existing primary-model Harness and event/VN overlay. Keep the N.I.A opening isolated from the existing Hatsu affinity-zero opening by using a dedicated owner kind and story-node type.

**Tech Stack:** Vanilla JavaScript, SillyTavern host bridge, Node.js built-in test runner.

---

### Task 1: Persist the N.I.A opening lifecycle

**Files:**
- Modify: `app.js`
- Test: `tests/nia-host-bridge.test.mjs`

- [ ] **Step 1: Write the failing state-normalization test**

Assert that `createDefaultNiaState()` defines `openingStatus`, `openingStory`, and `openingRequest`, and that `normalizeNiaState()` validates the five opening statuses while preserving stored story text.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node --test tests/nia-host-bridge.test.mjs`

Expected: FAIL because the opening fields do not exist.

- [ ] **Step 3: Add the minimal persisted fields**

Add defaults `{ openingStatus: "idle", openingStory: "", openingRequest: null }` and normalize them without changing existing N.I.A plan or training data.

- [ ] **Step 4: Run the focused test and verify GREEN**

Run: `node --test tests/nia-host-bridge.test.mjs`

Expected: PASS.

### Task 2: Dispatch the opening through the primary API

**Files:**
- Modify: `app.js`
- Test: `tests/nia-host-bridge.test.mjs`
- Test: `tests/scenario-selection.test.mjs`

- [ ] **Step 1: Write failing dispatch tests**

Assert that `buildNiaOpeningPrompt()` includes all six approved story anchors and forbids resolving auditions or FINALE; assert that `startNiaOpeningStory()` claims owner kind `nia_opening`, creates story node `niaOpening`, and that contract signing calls it after the N.I.A transition.

- [ ] **Step 2: Run the focused tests and verify RED**

Run: `node --test tests/nia-host-bridge.test.mjs tests/scenario-selection.test.mjs`

Expected: FAIL because the dedicated prompt and dispatcher do not exist.

- [ ] **Step 3: Implement the prompt and dispatcher**

Build the prompt from the selected idol and producer profile, claim the existing primary-model channel with `ownerKind: "nia_opening"`, persist `openingStatus: "generating"`, and send exactly one host request.

- [ ] **Step 4: Route contract signing through the opening**

Replace `triggerNiaEntryTransition(openNiaPrototype)` with `triggerNiaEntryTransition(() => startNiaOpeningStory("签署 N.I.A 合约"))`.

- [ ] **Step 5: Run the focused tests and verify GREEN**

Run: `node --test tests/nia-host-bridge.test.mjs tests/scenario-selection.test.mjs`

Expected: PASS.

### Task 3: Save, play, and confirm the opening story

**Files:**
- Modify: `app.js`
- Test: `tests/nia-host-bridge.test.mjs`

- [ ] **Step 1: Write failing reply and confirmation tests**

Assert that final replies for owner kind `nia_opening` are saved to `openingStory`, transition to `ready`, open the event overlay, and label confirmation `进入企划日`; assert confirmation marks the opening `completed` before calling `openNiaPrototype()`.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node --test tests/nia-host-bridge.test.mjs`

Expected: FAIL because N.I.A opening replies currently fall through the generic produce route.

- [ ] **Step 3: Implement the dedicated reply route**

Handle `nia_opening` before ordinary choice/produce routes, stream partial text into the existing story element, validate the final reply, persist it, release the Harness request, and open the VN overlay with the dedicated confirmation label.

- [ ] **Step 4: Implement confirmation**

In the shared event-confirm handler, recognize `activeStoryNode.type === "niaOpening"`, mark the lifecycle completed, clear the node and request, save, close the overlay, and open the N.I.A planning page.

- [ ] **Step 5: Run the focused test and verify GREEN**

Run: `node --test tests/nia-host-bridge.test.mjs`

Expected: PASS.

### Task 4: Restore safely after reload

**Files:**
- Modify: `app.js`
- Test: `tests/nia-host-bridge.test.mjs`

- [ ] **Step 1: Write failing recovery tests**

Assert that N.I.A recovery starts an idle opening, replays a ready saved story, converts an orphaned generating request to retryable failure, and only opens planning for completed openings; active training still uses the existing training view.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node --test tests/nia-host-bridge.test.mjs`

Expected: FAIL because `resumeNiaModeIfNeeded()` currently always opens the prototype.

- [ ] **Step 3: Implement lifecycle-aware recovery**

Branch recovery by `openingStatus`, preserving the current training-active branch and keeping `resumeOpeningIfNeeded()` excluded for N.I.A saves.

- [ ] **Step 4: Run the focused test and verify GREEN**

Run: `node --test tests/nia-host-bridge.test.mjs`

Expected: PASS.

### Task 5: Full verification

**Files:**
- Verify: `app.js`
- Verify: `tests/nia-host-bridge.test.mjs`
- Verify: `tests/scenario-selection.test.mjs`
- Verify: `tests/launch-mode.test.mjs`

- [ ] **Step 1: Check JavaScript syntax**

Run: `node --check app.js`

Expected: exit code 0.

- [ ] **Step 2: Run the regression suite**

Run: `node --test tests/nia-host-bridge.test.mjs tests/scenario-selection.test.mjs tests/launch-mode.test.mjs`

Expected: all tests pass.

- [ ] **Step 3: Check patch whitespace**

Run: `git diff --check -- app.js tests/nia-host-bridge.test.mjs tests/scenario-selection.test.mjs docs/superpowers/plans/2026-08-01-nia-opening.md`

Expected: no output and exit code 0.

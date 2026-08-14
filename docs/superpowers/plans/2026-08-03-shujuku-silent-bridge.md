# Shujuku Silent Bridge Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a runtime-only `shujuku_silent_v1` adapter that preserves Shujuku database planning and post-generation updates while committing the assistant floor through Hatsu's `refresh:'none'` path.

**Architecture:** Keep the remote `spv3.7` adapter unchanged and add a narrow local bridge contract. The Hatsu host bridge will create the hidden user floor, ask the local Shujuku bridge to prepare generation, obtain text without native assistant-floor creation, silently commit the assistant, then ask Shujuku to process that committed assistant. Existing `current_transactional` and `shujuku_v1` paths remain untouched.

**Tech Stack:** Vanilla JavaScript, SillyTavern/TavernHelper APIs, Node `node:test`, VM-based bridge tests.

---

### Task 1: Lock the silent adapter contract with failing tests

**Files:**
- Modify: `tests/shujuku-harness-bridge.test.mjs`
- Test target: `runHostGenerationAttempt` and the new silent adapter helper

- [ ] **Step 1: Add a failing test for adapter selection.** Assert that `HATSU_HOST_GENERATION_ADAPTER = 'shujuku_silent_v1'` is accepted and routed to a dedicated runner rather than `runTransactionalPrompt` or `runShujukuSameLayerAttempt`.

- [ ] **Step 2: Add a failing order test.** Inject fakes for `prepare`, `prepareShujuku`, `generateText`, `createAssistant`, `commitShujuku`, and `postCommittedReply`; assert the exact order is `prepare -> prepareShujuku -> generateText -> createAssistant -> commitShujuku -> postCommittedReply`.

- [ ] **Step 3: Add a failing safety test.** Assert the silent runner never calls `emitHostMessageSent`, `triggerNativeGeneration`, or a native assistant-generation callback, and rejects a missing Shujuku bridge with `shujuku_silent_unavailable`.

- [ ] **Step 4: Run the focused test and confirm RED.**

Run: `node --test tests/shujuku-harness-bridge.test.mjs`

Expected: the new tests fail because the adapter and runner do not exist.

### Task 2: Add the local Shujuku bridge boundary

**Files:**
- Create: `shujuku-silent-bridge.js`
- Modify: `index.html` or the active loader that imports Shujuku, only to load this bridge after Shujuku
- Test: `tests/shujuku-silent-bridge.test.mjs`

- [ ] **Step 1: Write failing bridge tests.** Test `prepareExternalGeneration` validates a user message id and prompt, delegates to the existing Shujuku planning entry when available, and returns a normalized generation prompt. Test `commitExternalAssistant` delegates exactly once with assistant id, request id, save scope, and raw text. Test missing APIs return explicit errors without emitting global generation events.

- [ ] **Step 2: Run the bridge tests and confirm RED.**

Run: `node --test tests/shujuku-silent-bridge.test.mjs`

Expected: module/API-not-found failures.

- [ ] **Step 3: Implement the narrow bridge.** Expose `window.HatsuShujukuSilentBridge` with `prepareExternalGeneration`, `commitExternalAssistant`, and `isAvailable`. Do not patch `eventSource.emit`, `TavernHelper.generate`, `printMessages`, or other global host methods.

- [ ] **Step 4: Run the bridge tests and confirm GREEN.**

Run: `node --test tests/shujuku-silent-bridge.test.mjs`

Expected: PASS.

### Task 3: Implement `shujuku_silent_v1` in the Hatsu host bridge

**Files:**
- Modify: `st.html` around adapter constants and `runHostGenerationAttempt`
- Modify: `tests/shujuku-harness-bridge.test.mjs`

- [ ] **Step 1: Add the adapter constant and dependency injection points.** Accept `current_transactional`, `shujuku_v1`, and `shujuku_silent_v1`; keep unknown values defaulting to `shujuku_v1`. Add injected dependencies for the local bridge, text generation, silent assistant creation, and Shujuku commit.

- [ ] **Step 2: Implement the minimal silent runner.** It must create/stamp/persist the hidden user floor, call `prepareExternalGeneration`, call a text-only generation function, reject empty or incompatible text, call `createSilentChatMessage('assistant', ...)`, persist, call `commitExternalAssistant`, and only then call `postCommittedReply`.

- [ ] **Step 3: Implement compensation.** On any failure after user creation, reuse `compensateHostGenerationAttempt`; do not emit native generation events or leave an unmarked assistant floor.

- [ ] **Step 4: Run the focused bridge tests and confirm GREEN.**

Run: `node --test tests/shujuku-harness-bridge.test.mjs tests/shujuku-silent-bridge.test.mjs`

Expected: PASS.

### Task 4: Wire the real text-only generation and local Shujuku import

**Files:**
- Modify: `st.html`
- Modify: the user's loader/import file for the local Shujuku copy
- Create or vendor: a local copy of `spv3.7/index.js` only if the bridge API cannot be attached without source changes

- [ ] **Step 1: Make the generation dependency use TavernHelper's text-returning call without `/trigger await=true`.** Preserve the existing request id and generation prompt, and keep the `js_generation_ended` listener scoped to that request.

- [ ] **Step 2: Bind the bridge only after Shujuku has initialized.** Fail closed with `shujuku_silent_unavailable` if `window.AutoCardUpdaterAPI` or the bridge contract is missing.

- [ ] **Step 3: Add runtime debug fields showing adapter and bridge availability without exposing prompt or response text.**

- [ ] **Step 4: Run all bridge and loader tests.**

Run: `node --test tests/shujuku-harness-bridge.test.mjs tests/shujuku-silent-bridge.test.mjs tests/st-loader-bridge.test.mjs`

Expected: PASS.

### Task 5: Verify against real SillyTavern and document rollback

**Files:**
- Modify: `docs/shujuku-harness-manual-acceptance.md`
- Modify: `docs/current-handoff.md` only for verified behavior

- [ ] **Step 1: Run one opening and one ordinary action with `shujuku_silent_v1`.** Record event order, chat length, assistant message id, database update result, and whether `CHAT_CHANGED` occurs.

- [ ] **Step 2: Verify failure and refresh recovery.** Confirm a timeout or malformed reply compensates the hidden user floor and does not duplicate database writes after reload.

- [ ] **Step 3: Verify both existing adapters remain unchanged.** `current_transactional` must continue bypassing the database bridge; `shujuku_v1` must retain its current native behavior.

- [ ] **Step 4: Document the loader value and rollback command.** The rollback is changing the runtime value back to `current_transactional` or `shujuku_v1`, followed by reloading `st.html`.

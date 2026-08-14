# Shujuku Original Silent Adapter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Load the official Shujuku spv3.7 implementation unchanged while preserving Hatsu's silent message flow, then verify table reads/fills and record whether `triggerUpdate()` refreshes the current floor.

**Architecture:** A loader dynamically imports the official module and waits for its public `AutoCardUpdaterAPI`. A small bridge exposes only Hatsu-facing operations and calls public API methods, while `st.html` selects a new adapter and reuses its existing same-layer planning, text generation, silent assistant creation, rollback, and commit flow. The first version does not suppress refreshes; it records non-sensitive diagnostics for manual acceptance.

**Tech Stack:** Browser ES modules, vanilla JavaScript, Node's built-in test runner, SillyTavern/TavernHelper APIs.

---

### Task 1: Official Shujuku loader

**Files:**
- Create: `shujuku-original-local.js`
- Test: `tests/shujuku-original-bridge.test.mjs`

- [ ] **Step 1: Write the failing loader contract test**

Assert the source uses a direct native `import(SHUJUKU_SPV37_URL)`, does not contain `fetch(`, `new Function`, or source rewriting, waits for `AutoCardUpdaterAPI`, and exposes `window.HATSU_SHUJUKU_ORIGINAL_READY`.

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `node --test tests/shujuku-original-bridge.test.mjs`
Expected: FAIL because `shujuku-original-local.js` is missing.

- [ ] **Step 3: Implement the minimal loader**

Define the official URL, import it once via a cached promise, poll for `AutoCardUpdaterAPI` with a bounded timeout, validate `triggerUpdate`, `exportTableAsJson`, and `refreshDataAndWorldbook`, then assign the ready promise to `window.HATSU_SHUJUKU_ORIGINAL_READY`. Reject with `shujuku_original_api_unavailable` on timeout or missing methods.

- [ ] **Step 4: Run the focused test and verify it passes**

Run: `node --test tests/shujuku-original-bridge.test.mjs`
Expected: PASS.

- [ ] **Step 5: Commit the loader and test**

Run: `git add shujuku-original-local.js tests/shujuku-original-bridge.test.mjs; git commit -m "feat: load official shujuku adapter"`

### Task 2: Public API bridge and diagnostics

**Files:**
- Create: `shujuku-original-bridge.js`
- Modify: `tests/shujuku-original-bridge.test.mjs`

- [ ] **Step 1: Write failing bridge tests**

Cover API discovery, table-count extraction from `exportTableAsJson()`, forwarding assistant commit to `triggerUpdate()`, and returning diagnostics without prompt/reply/table contents.

- [ ] **Step 2: Run tests to verify the new assertions fail**

Run: `node --test tests/shujuku-original-bridge.test.mjs`
Expected: FAIL because `shujuku-original-bridge.js` is missing.

- [ ] **Step 3: Implement minimal bridge**

Expose `window.HatsuShujukuOriginalBridge` with `isAvailable`, `commitExternalAssistant`, and `getLastCommitDiagnostics`. Snapshot chat length and table count before/after, call `api.triggerUpdate()`, detect node disconnection when available, and store only bounded IDs/counts/booleans/error codes.

- [ ] **Step 4: Run bridge tests and full focused regression tests**

Run: `node --test tests/shujuku-original-bridge.test.mjs tests/shujuku-harness-bridge.test.mjs`
Expected: PASS.

- [ ] **Step 5: Commit bridge changes**

Run: `git add shujuku-original-bridge.js tests/shujuku-original-bridge.test.mjs; git commit -m "feat: bridge public shujuku update API"`

### Task 3: Wire the new adapter into Hatsu

**Files:**
- Modify: `st.html`
- Modify: `shujuku-original-bridge.js` if host integration requires a compatibility shim

- [ ] **Step 1: Add a failing adapter-selection/integration assertion**

Assert `st.html` recognizes `shujuku_original_silent_v1`, invokes existing same-layer preparation before generation, creates the assistant silently, calls the new bridge, and commits the reply only after bridge completion.

- [ ] **Step 2: Run the assertion and verify it fails**

Run: `node --test tests/shujuku-original-bridge.test.mjs`
Expected: FAIL because the adapter is not wired.

- [ ] **Step 3: Implement adapter wiring**

Add the new adapter branch while preserving existing rollback/compensation paths. Reuse `prepareSameLayerAttempt`, `generateTextOnly`, `createSilentChatMessage`, `persistChatSilently`, and committed-reply handling. Call `HatsuShujukuOriginalBridge.commitExternalAssistant()` after assistant creation. Do not load the old silent loader or patch official source.

- [ ] **Step 4: Run focused and syntax checks**

Run: `node --test tests/shujuku-original-bridge.test.mjs tests/shujuku-harness-bridge.test.mjs; node --check shujuku-original-local.js; node --check shujuku-original-bridge.js`
Expected: PASS with no syntax errors.

- [ ] **Step 5: Commit adapter wiring**

Run: `git add st.html shujuku-original-bridge.js; git commit -m "feat: add original shujuku silent generation adapter"`

### Task 4: Provide the complete startup script and acceptance notes

**Files:**
- Create: `shujuku-original-startup.html`
- Create: `docs/superpowers/specs/2026-08-03-shujuku-original-acceptance.md`

- [ ] **Step 1: Write a failing startup-script test**

Assert the script sets `HATSU_HOST_GENERATION_ADAPTER` to `shujuku_original_silent_v1`, imports only the new loader, awaits readiness, and guards bootstrap against duplicate starts.

- [ ] **Step 2: Run the test and verify it fails**

Run: `node --test tests/shujuku-original-bridge.test.mjs`
Expected: FAIL because the startup artifact is missing.

- [ ] **Step 3: Add the complete startup script and acceptance checklist**

The script sets the local asset base, imports `shujuku-original-local.js` with a cache-busting query, awaits readiness, then loads `st.html`. Acceptance notes cover editor table visibility, unchanged table reads, real fill changes, normal reply commit, duplicate-message checks, and refresh diagnostics.

- [ ] **Step 4: Run all verification commands**

Run: `node --test tests/shujuku-original-bridge.test.mjs tests/shujuku-harness-bridge.test.mjs; node --check shujuku-original-local.js; node --check shujuku-original-bridge.js; git diff --check -- st.html shujuku-original-local.js shujuku-original-bridge.js shujuku-original-startup.html tests/shujuku-original-bridge.test.mjs docs/superpowers/specs/2026-08-03-shujuku-original-acceptance.md`
Expected: all tests pass, syntax checks succeed, and diff check is clean.

- [ ] **Step 5: Commit documentation and startup artifact**

Run: `git add shujuku-original-startup.html docs/superpowers/specs/2026-08-03-shujuku-original-acceptance.md; git commit -m "docs: add original shujuku startup and acceptance notes"`

### Manual acceptance

- [ ] Start SillyTavern with the complete script.
- [ ] Confirm the Shujuku editor shows existing tables and values.
- [ ] Send one normal prompt and confirm one hidden user plus one hidden assistant are created.
- [ ] Confirm the database fill changes the expected table values.
- [ ] Read `HatsuShujukuOriginalBridge.getLastCommitDiagnostics()` and record `floorRefreshDetected`, chat lengths, table counts, and any error code.

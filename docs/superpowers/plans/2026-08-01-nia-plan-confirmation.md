# N.I.A Plan Confirmation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Return to the tablet after Asari's review and start N.I.A training only after explicit player confirmation.

**Architecture:** Separate plan commitment from training activation. The embedded tablet sends a dedicated `niaTrainingStart` command, while the host remains authoritative for validation and state mutation.

**Tech Stack:** Vanilla JavaScript, HTML, SillyTavern iframe host bridge, Node.js test runner.

---

### Task 1: Lock the confirmation boundary with tests

**Files:**
- Modify: `tests/nia-training-flow.test.mjs`
- Modify: `tests/nia-host-bridge.test.mjs`

- [ ] Assert that `completeNiaPlanReview()` does not call `startNiaTrainingFromCommittedPlan()` and instead shows the tablet.
- [ ] Assert that the tablet contains `niaTrainingStartBtn`, sends `niaTrainingStart`, and the host routes that message to a guarded start handler.
- [ ] Run `node --test tests/nia-training-flow.test.mjs tests/nia-host-bridge.test.mjs` and verify failure because the confirmation boundary does not exist.

### Task 2: Add explicit tablet confirmation

**Files:**
- Modify: `nia-prototype.html`
- Modify: `nia-prototype.js`
- Modify: `app.js`

- [ ] Remove automatic training activation from `completeNiaPlanReview()` and restore the N.I.A tablet after committing the plan.
- [ ] Add the “确认企划，开始育成” button to the plan receipt and send `niaTrainingStart` on click.
- [ ] Add `startNiaTrainingFromTablet()` to validate committed state, start training once, persist state, sync the iframe, and render.
- [ ] Route `niaTrainingStart` only from the active N.I.A iframe.

### Task 3: Verify regressions

**Files:**
- Verify: `app.js`
- Verify: `nia-prototype.js`
- Verify: `tests/nia-training-flow.test.mjs`
- Verify: `tests/nia-host-bridge.test.mjs`
- Verify: `tests/vn-flow.test.mjs`

- [ ] Run `node --check app.js` and `node --check nia-prototype.js`.
- [ ] Run the focused and VN regression tests.
- [ ] Run `git diff --check` for all modified files.

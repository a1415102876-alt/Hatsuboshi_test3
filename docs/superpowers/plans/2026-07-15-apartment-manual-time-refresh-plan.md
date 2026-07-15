# Apartment Manual Time Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep the producer apartment UI synchronized when manual time advancement crosses the `22:00` late-night boundary.

**Architecture:** Preserve the existing time mutation and map refresh path in `applyFreeModeManualTimeAdvance()`. Reuse `renderProducerApartmentStage()` as the single renderer for the apartment clock, visual state, hint, campus return action, sleep action, and invite action.

**Tech Stack:** Browser JavaScript, Node.js built-in test runner, `node:assert/strict`, `node:vm`

---

### Task 1: Refresh Apartment State After Manual Time Advancement

**Files:**
- Modify: `tests/free-mode.test.mjs`
- Modify: `app.js:12489`

- [x] **Step 1: Write the failing regression test**

Add a focused source-level contract next to the existing free-mode time wiring assertions:

```js
test("manual time advancement refreshes the producer apartment state", () => {
  const advance = readFunction("applyFreeModeManualTimeAdvance");
  assert.match(advance, /renderFreeModeStage\(\)/);
  assert.match(advance, /renderProducerApartmentStage\(\)/);
  assert.ok(
    advance.indexOf("advanceFreeModeTime(toAdvance)") < advance.indexOf("renderProducerApartmentStage()"),
    "the apartment must render after the clock state changes"
  );
});
```

- [x] **Step 2: Run the test and verify the red state**

Run: `node --test --test-name-pattern="manual time advancement refreshes" tests/free-mode.test.mjs`

Expected: FAIL because `applyFreeModeManualTimeAdvance()` does not call `renderProducerApartmentStage()`.

- [x] **Step 3: Implement the minimal fix**

In `applyFreeModeManualTimeAdvance()`, keep the existing map refresh and add the apartment renderer immediately after it:

```js
renderFreeModeStage();
renderProducerApartmentStage();
updateFreeModeTimeOverlayUI();
```

- [x] **Step 4: Run focused and regression verification**

Run: `node --test --test-name-pattern="manual time advancement refreshes" tests/free-mode.test.mjs`

Expected: the new test passes.

Run: `node --test tests/free-mode.test.mjs`

Expected: all free-mode tests pass.

Run: `node --check app.js`

Expected: exit code 0 with no syntax errors.

Run: `git diff --check -- app.js tests/free-mode.test.mjs`

Expected: exit code 0 with no whitespace errors.

- [x] **Step 5: Review and commit the scoped change**

Run: `git diff -- app.js tests/free-mode.test.mjs`

Expected: one regression test and one apartment render call, with no changes to time rules or cross-day behavior.

Commit:

```powershell
git add -- app.js tests/free-mode.test.mjs docs/superpowers/plans/2026-07-15-apartment-manual-time-refresh-plan.md
git commit -m "Fix apartment state after manual time advance"
```

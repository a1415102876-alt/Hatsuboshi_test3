# First Live Start Deadline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the sandbox First Live available from map opening through `19:00`, and reject starts from `19:01` onward.

**Architecture:** Replace the ambiguous earliest-start constant with a clearly named latest-start deadline. Put the inclusive boundary in one helper and reuse it from challenge preparation, status text, and map-button locking so all entry points agree.

**Tech Stack:** Browser JavaScript, Node.js built-in test runner, `node:assert/strict`, `node:vm`

---

### Task 1: Correct the First Live Start-Time Boundary

**Files:**
- Modify: `tests/free-mode.test.mjs`
- Modify: `app.js:721`

- [x] **Step 1: Write the failing boundary and wiring tests**

Add a test that requires a unified helper with an inclusive `19:00` deadline:

```js
test("sandbox First Live can start through 19:00 but not after", () => {
  const sandbox = {};
  vm.runInNewContext(`
    const FIRST_LIVE_START_DEADLINE_MINUTES = 19 * 60;
    ${readFunction("canStartSandboxFirstLiveAt")}
    this.canStart = canStartSandboxFirstLiveAt;
  `, sandbox);

  assert.equal(sandbox.canStart(8 * 60), true);
  assert.equal(sandbox.canStart(19 * 60), true);
  assert.equal(sandbox.canStart(19 * 60 + 1), false);

  assert.match(readFunction("prepareSandboxFirstLiveAttempt"), /canStartSandboxFirstLiveAt/);
  assert.match(readFunction("getSandboxFirstLiveChallengeStatusText"), /canStartSandboxFirstLiveAt/);
  assert.match(readFunction("updateMapLocationEntryActions"), /canStartSandboxFirstLiveAt/);
  assert.doesNotMatch(readFunction("prepareSandboxFirstLiveAttempt"), /too_early/);
});
```

- [x] **Step 2: Run the test and verify the red state**

Run: `node --test --test-name-pattern="sandbox First Live can start through" tests/free-mode.test.mjs`

Expected: FAIL because `canStartSandboxFirstLiveAt()` does not exist and the current implementation treats `19:00` as the opening time.

- [x] **Step 3: Implement the unified inclusive deadline**

Rename the constant and add the helper:

```js
const FIRST_LIVE_START_DEADLINE_MINUTES = 19 * 60;

function canStartSandboxFirstLiveAt(clockMinutes = state.freeMode?.clockMinutes) {
  const clock = Number(clockMinutes);
  return Number.isFinite(clock) && clock <= FIRST_LIVE_START_DEADLINE_MINUTES;
}
```

Use `!canStartSandboxFirstLiveAt(clockMinutes)` in `prepareSandboxFirstLiveAttempt()` and return `too_late`. Use the same helper in `getSandboxFirstLiveChallengeStatusText()` and `updateMapLocationEntryActions()`. Change the unavailable status to `今日挑战时间已结束` and the confirmation error to `校内舞台 First Live 最晚需要在 19:00 开始。`.

- [x] **Step 4: Run focused and regression verification**

Run: `node --test --test-name-pattern="sandbox First Live can start through" tests/free-mode.test.mjs`

Expected: the new boundary test passes.

Run: `node --test tests/free-mode.test.mjs tests/primary-model-ownership.test.mjs tests/harness-recovery.test.mjs`

Expected: all First Live, ownership, recovery, and free-mode tests pass.

Run: `node --check app.js`

Expected: exit code 0 with no syntax errors.

Run: `git diff --check -- app.js tests/free-mode.test.mjs`

Expected: exit code 0 with no whitespace errors.

- [x] **Step 5: Review and commit the scoped change**

Run: `git diff -- app.js tests/free-mode.test.mjs`

Expected: one deadline helper, three shared call sites, updated late-time copy, and one boundary test. No settlement, cooldown, ownership, or Recovery behavior changes.

Commit:

```powershell
git add -- app.js tests/free-mode.test.mjs docs/superpowers/plans/2026-07-15-first-live-start-deadline-plan.md
git commit -m "Fix First Live start deadline"
```

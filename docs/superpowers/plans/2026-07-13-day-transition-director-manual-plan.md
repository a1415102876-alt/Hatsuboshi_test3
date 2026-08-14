# Day Transition and Director Manual Trigger Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep the visible free-mode scene synchronized after a day transition and expose the existing manual Director recalculation through the world-engine phone app.

**Architecture:** Preserve all deterministic day-transition and Director request logic. Replace the too-narrow post-transition render call with the existing full render boundary, then add a thin phone UI adapter that delegates to `requestManualWorldDirectorRecalculation()` and derives button state from the existing Director/channel state.

**Tech Stack:** Vanilla JavaScript, HTML, CSS, Node.js `node:test` and `vm` source-execution tests.

---

### Task 1: Synchronize the visible scene after day transition

**Files:**
- Modify: `app.js` (`advanceFreeModeToNextDay`)
- Test: `tests/world-director-integration.test.mjs`

- [ ] **Step 1: Write the failing execution test**

Extend the existing day-advance sandbox so it exposes `render()` and fails if only `renderFreeModeStage()` is called. Assert that the full render happens after the saved state has reached day 2 and 08:00.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node --test --test-name-pattern="day advance" tests/world-director-integration.test.mjs`

Expected: FAIL because `advanceFreeModeToNextDay()` currently calls only `renderFreeModeStage()`.

- [ ] **Step 3: Implement the minimal fix**

In `advanceFreeModeToNextDay()`, replace the final `renderFreeModeStage()` call with `render()`. Do not alter the surrounding world tick, Director preparation, save, toast, or request ordering.

- [ ] **Step 4: Verify GREEN and static checks**

Run:

```powershell
node --test --test-name-pattern="day advance" tests/world-director-integration.test.mjs
node --check app.js
git diff --check
```

Expected: focused test passes; syntax and diff checks exit 0.

### Task 2: Add the world-engine manual action

**Files:**
- Modify: `index.html` (`phoneWorldEngineApp`)
- Modify: `app.js` (`bindPhoneWorldEngineEvents`, `renderWorldEnginePhoneApp`; add a small button-state helper and click handler)
- Modify: `style.css` (world-engine action footer/button)
- Test: `tests/world-engine-phone-app.test.mjs`

- [ ] **Step 1: Write failing execution tests**

Add tests that require:

1. `worldEngineManualRunBtn` exists in the phone app.
2. `bindPhoneWorldEngineEvents()` invokes `requestManualWorldDirectorRecalculation()` only when the button is clicked, then refreshes the app.
3. The render path disables the button and changes its label while Director is generating/validating or a model channel is occupied.
4. Opening or refreshing the app still does not request a model by itself.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node --test tests/world-engine-phone-app.test.mjs`

Expected: FAIL because the button and binding do not exist.

- [ ] **Step 3: Implement the minimal phone adapter**

Add a fixed action footer below `worldEngineContent`. Bind the button once inside `bindPhoneWorldEngineEvents()`. The click handler calls the existing manual recalculation function and then `renderWorldEnginePhoneApp()`. The renderer derives disabled/label state without saving or mutating Director state.

- [ ] **Step 4: Verify GREEN and static checks**

Run:

```powershell
node --test tests/world-engine-phone-app.test.mjs
node --check app.js
git diff --check
```

Expected: all focused tests pass; syntax and diff checks exit 0.

### Task 3: Regression and manual verification

**Files:**
- Test only; no additional production changes unless a regression is demonstrated by a failing test.

- [ ] **Step 1: Run combined related tests**

```powershell
node --test tests/free-mode.test.mjs tests/world-director-integration.test.mjs tests/world-director-phone-view.test.mjs tests/world-engine-phone-app.test.mjs tests/world-engine.test.mjs
```

- [ ] **Step 2: Run the project test command and record existing baseline failures**

Use the repository's existing complete test command from `package.json` or the established `node --test tests/*.test.mjs` equivalent.

- [ ] **Step 3: Verify in the browser**

Confirm the apartment 22:00 -> next day flow immediately returns to the campus map at day 2, 08:00. Open the world-engine phone app, trigger manual recalculation, confirm the confirmation dialog, busy label, and final receipt/direction refresh.

- [ ] **Step 4: Final static checks**

```powershell
node --check app.js
git diff --check
git status --short
```

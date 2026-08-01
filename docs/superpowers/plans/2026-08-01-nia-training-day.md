# NIA Training Day Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reuse the existing produce screen as the first formal NIA training day, with plan-ordered actions, a four-item review target card, and a live fan progress/rank HUD.

**Architecture:** Extend the normalized `state.nia` object with a small training runtime and render NIA-specific additions behind `state.launchMode === "nia"`. Keep the current produce DOM and renderer as the single source of truth, then switch from the planning iframe to that view when Asari's review finishes. Extract pure NIA training helpers into a focused module so plan-action mapping, fan progress, and rank calculation can be tested without booting the full application.

**Tech Stack:** Vanilla HTML, CSS, JavaScript ES modules, Node.js built-in test runner.

## Global Constraints

- Reuse the existing produce view and Harness; do not duplicate the training page.
- Only NIA mode receives the fan target row, fan HUD, and plan-ordered action restriction.
- Normal produce and sandbox behavior must remain unchanged.
- The business action icon is `UI/Business.png`.
- Vo, Da, and Vi target icons are `UI/Vo_Mini.png`, `UI/Da_Mini.png`, and `UI/Vi_mini.png`.
- The fan track is translucent gray with an orange inner fill; its number is below the track and its right-side rank reuses the existing rank sprite/rules.
- Run the broad automated test suite once after all implementation tasks, per the user's requested workflow.

---

### Task 1: Pure NIA Training Runtime

**Files:**
- Create: `nia-training-core.js`
- Test: `tests/nia-training-core.test.mjs`

**Interfaces:**
- Consumes: committed NIA plan objects whose schedule entries contain `type`, optional `attribute`, and display text.
- Produces: `normalizeNiaTraining(raw)`, `getCurrentNiaPlanAction(nia)`, `mapNiaPlanAction(entry)`, `getFanProgress(fans, target)`, and `getFanRank(percent, rankFor)`.

- [ ] **Step 1: Write failing runtime tests**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeNiaTraining,
  getCurrentNiaPlanAction,
  mapNiaPlanAction,
  getFanProgress
} from '../nia-training-core.js';

test('normalizes fan runtime and clamps progress', () => {
  assert.deepEqual(normalizeNiaTraining({ fans: -10, fanTarget: 3000, actionIndex: -2 }), {
    active: false, fans: 0, fanTarget: 3000, actionIndex: 0
  });
  assert.equal(getFanProgress(4500, 3000), 100);
});

test('maps business to the NIA business action and icon', () => {
  assert.deepEqual(mapNiaPlanAction({ type: '营业' }), {
    action: 'nia_business', label: '营业', attribute: null,
    color: '#f0a33a', icon: 'UI/Business.png'
  });
});

test('returns only the current committed schedule entry', () => {
  const nia = { training: { active: true, actionIndex: 1 }, plan: { schedule: [{ type: '外出' }, { type: '营业' }] } };
  assert.equal(getCurrentNiaPlanAction(nia).type, '营业');
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node --test tests/nia-training-core.test.mjs`

Expected: FAIL because `nia-training-core.js` does not exist.

- [ ] **Step 3: Implement the minimal pure helpers**

Create exports that sanitize numeric state, clamp fan progress to `0..100`, map plan types to existing action IDs, and return only `plan.schedule[training.actionIndex]`. The business mapping must return `UI/Business.png`; training mappings must retain their Vo/Da/Vi attribute.

- [ ] **Step 4: Defer the GREEN run to the final verification batch**

Do not run intermediate tests; preserve the user's requested single end-of-work verification pass.

### Task 2: NIA HUD Markup and Assets

**Files:**
- Modify: `index.html:262-270`
- Modify: `style.css:835-873`
- Create: `UI/nia-fan-badge.png`
- Create: `UI/nia-fan-mini.png`
- Test: `tests/nia-training-ui.test.mjs`

**Interfaces:**
- Consumes: DOM values `targetFans`, `niaFanValue`, `niaFanFill`, and `niaFanRank` written by the renderer.
- Produces: an NIA-only fourth threshold row and an NIA-only fan progress component.

- [ ] **Step 1: Write failing DOM contract tests**

```js
test('training HUD declares four image-backed target rows and fan progress nodes', () => {
  assert.match(html, /UI\/Vo_Mini\.png/);
  assert.match(html, /UI\/Da_Mini\.png/);
  assert.match(html, /UI\/Vi_mini\.png/);
  assert.match(html, /id="targetFans"/);
  assert.match(html, /id="niaFanFill"/);
  assert.match(html, /id="niaFanValue"/);
  assert.match(html, /id="niaFanRank"/);
});
```

- [ ] **Step 2: Verify the test fails for the missing NIA HUD contract**

Run the test only if required to diagnose test syntax; otherwise include it in the final verification batch.

- [ ] **Step 3: Copy and wire the supplied fan assets**

Copy the detailed badge from `C:/Users/86139/AppData/Local/Temp/codex-clipboard-89aa8d7f-de0b-4b12-b931-e862afe8c1f6.png` to `UI/nia-fan-badge.png`, and the simple outlined star from `C:/Users/86139/AppData/Local/Temp/codex-clipboard-7a4c3dbc-447f-4c19-a4ab-4b8923c218e3.png` to `UI/nia-fan-mini.png`.

- [ ] **Step 4: Add semantic HUD markup**

Replace text labels with `<img class="threshold-icon">` assets. Add the fan target row with `hidden` by default and add a sibling `.nia-fan-progress` component containing badge, track/fill, number, and rank sprite nodes.

- [ ] **Step 5: Style a compact, stable NIA HUD**

Use equal fixed icon boxes with `object-fit: contain`, preserve right-aligned target values, reserve the fan track width to prevent layout shift, clamp overflow with `border-radius: inherit`, and show NIA-only pieces via a root `.is-nia-training` class. The rank sprite must reuse the existing sprite-sheet geometry instead of introducing text-only styling.

### Task 3: State Normalization and Rendering

**Files:**
- Modify: `app.js:2355-2414`
- Modify: `app.js:15883-15939`
- Test: `tests/nia-training-ui.test.mjs`

**Interfaces:**
- Consumes: helpers from `nia-training-core.js` and existing `rankFor`, `ratingSpriteImage`, `ratingSpriteRanks`, `ratingSpriteOffsets`.
- Produces: normalized `state.nia.training` and `renderNiaTrainingHud()`.

- [ ] **Step 1: Extend failing tests for state and rank wiring**

Assert that the app imports the pure helper module, applies the NIA root class, formats fans with `toLocaleString`, writes a clamped percentage to `niaFanFill`, and uses the existing rank sprite variables.

- [ ] **Step 2: Extend `createDefaultNiaState()` and `normalizeNiaState()`**

Add `training: { active: false, fans: 0, fanTarget: 3000, actionIndex: 0 }`, normalized through `normalizeNiaTraining`. Preserve old saves by falling back to these defaults.

- [ ] **Step 3: Implement `renderNiaTrainingHud()`**

Toggle `.is-nia-training` only when launch mode is NIA and training is active. Update the four target values, fan number, fill transform/width, accessible progress attributes, and existing sprite rank. Non-NIA renders must leave the fan elements hidden.

- [ ] **Step 4: Call the new renderer from the existing main render path**

Keep the current Vo/Da/Vi updates intact and place NIA-specific work behind the mode guard.

### Task 4: Enter Training After Asari Review

**Files:**
- Modify: `app.js:20693-20718`
- Modify: `app.js:20770-20820`
- Test: `tests/nia-training-flow.test.mjs`

**Interfaces:**
- Consumes: committed reviewed plan and `normalizeNiaTraining`.
- Produces: `startNiaTrainingFromCommittedPlan()` and a visible existing produce view with the prototype iframe closed.

- [ ] **Step 1: Write a failing flow contract test**

Assert that completing review activates `state.nia.training`, initializes `actionIndex` to zero, closes/hides the NIA prototype rather than restoring it, saves state, and calls the ordinary render path.

- [ ] **Step 2: Implement `startNiaTrainingFromCommittedPlan()`**

Initialize the runtime with the first-round target, preserve any existing fans, clear review/VN transient state, set the normal game view visible, and render. Do not add a transition.

- [ ] **Step 3: Change `completeNiaPlanReview()` handoff**

After committing `pendingReviewPlan`, call the new training entry function instead of returning to the prototype planning iframe.

### Task 5: Plan-Ordered Action Rendering

**Files:**
- Modify: `app.js:15790-15865`
- Modify: `app.js:15947-16010`
- Modify: `style.css` near existing action-button icon rules
- Test: `tests/nia-training-flow.test.mjs`

**Interfaces:**
- Consumes: `getCurrentNiaPlanAction()` and `mapNiaPlanAction()`.
- Produces: one actionable button for the current NIA schedule entry, including `UI/Business.png` for business.

- [ ] **Step 1: Add failing action contract tests**

Assert that NIA training renders only the mapped current entry, that business carries `UI/Business.png`, and that the normal action array remains the fallback outside NIA training.

- [ ] **Step 2: Add optional icon support to `createActionButton()`**

Accept an optional icon path, create an `<img>` with empty alt text because the button already has a visible label, and retain the current generated/icon behavior when no path is supplied.

- [ ] **Step 3: Branch the existing action renderer**

When NIA training is active, build a one-entry action list from the current plan position. Otherwise execute the existing produce/sandbox code unchanged. Update `actionModeLabel` to identify the current NIA plan day.

- [ ] **Step 4: Keep action advancement explicit**

On successful completion of an NIA plan action, increment `actionIndex` once and re-render. Do not increment on cancelled, failed, or merely opened VN actions.

### Task 6: Final Verification

**Files:**
- Test: `tests/nia-training-core.test.mjs`
- Test: `tests/nia-training-ui.test.mjs`
- Test: `tests/nia-training-flow.test.mjs`

- [ ] **Step 1: Run all NIA-focused tests once**

Run: `node --test tests/nia-training-core.test.mjs tests/nia-training-ui.test.mjs tests/nia-training-flow.test.mjs tests/nia-prototype.test.mjs tests/nia-host-bridge.test.mjs tests/nia-business-vn.test.mjs`

Expected: all tests PASS.

- [ ] **Step 2: Run the project test suite once**

Run the repository's existing Node test command or `node --test tests/*.test.mjs` when no package script is defined.

Expected: all tests PASS with no new warnings or uncaught errors.

- [ ] **Step 3: Perform one browser smoke check**

Open the local harness, complete or seed the committed first-round NIA plan, verify direct entry to the reused training screen, inspect the four target icons/fan bar/rank, and confirm the current plan exposes exactly one action with the correct icon.

- [ ] **Step 4: Review the diff for mode isolation**

Confirm every NIA-only DOM display and behavior branch is guarded by NIA training state and that no unrelated user changes were staged or reverted.

# N.I.A Audition Rewards And Training Balance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add fixed first-audition fan/stat rewards and double formal N.I.A training stat gains without changing ordinary produce balance.

**Architecture:** Keep reward arithmetic in the pure audition core and training multiplication in the pure N.I.A training core. The application passes frozen idol growth rates into the audition context, applies the settled result once, and renders the fixed rewards; AI payloads remain narrative-only.

**Tech Stack:** Vanilla JavaScript, UMD browser globals, Node `node:test`.

---

### Task 1: First-Audition Reward Contract

**Files:**
- Modify: `nia-audition-core.js`
- Modify: `tests/nia-audition-core.test.mjs`
- Modify: `nia-audition-api.js`
- Modify: `tests/nia-audition-api.test.mjs`

- [ ] Add a failing core test expecting 10,000 fans and `round(120 * (1 + growth / 100))` for Vo, Da, and Vi.
- [ ] Run `node --test tests/nia-audition-core.test.mjs` and confirm the reward assertion fails.
- [ ] Implement `calculateFirstAuditionRewards` and make settlement use frozen context growth instead of AI reward fields.
- [ ] Remove `fanGain` from the generated AI contract and ignore legacy reward fields while parsing.
- [ ] Run the core and API tests and confirm they pass.

### Task 2: N.I.A Training Multiplier

**Files:**
- Modify: `nia-training-core.js`
- Modify: `tests/nia-training-core.test.mjs`
- Modify: `app.js`
- Modify: `tests/nia-training-flow.test.mjs`

- [ ] Add a failing pure-core test proving active N.I.A training doubles an already calculated gain while ordinary training remains unchanged.
- [ ] Run `node --test tests/nia-training-core.test.mjs` and confirm the missing helper fails.
- [ ] Implement and export `applyNiaTrainingGainMultiplier`.
- [ ] Route training gains through the helper using `isNiaTrainingActive()` after existing growth, idol and SP calculations.
- [ ] Run training core and flow tests and confirm they pass.

### Task 3: Once-Only Frontend Settlement

**Files:**
- Modify: `app.js`
- Modify: `tests/nia-audition-flow.test.mjs`

- [ ] Add failing integration assertions for frozen growth context, capped Vo/Da/Vi application, reward display, and `progressionApplied` guarding all rewards.
- [ ] Apply settled `statGains` and fan gain inside `confirmNiaAuditionResult` before marking the runtime applied.
- [ ] Render the fixed rewards in the fourth-segment result message.
- [ ] Run audition flow tests and confirm they pass.

### Task 4: Verification

**Files:**
- Verify all modified files.

- [ ] Run `node --check app.js nia-training-core.js nia-audition-core.js nia-audition-api.js`.
- [ ] Run all `tests/nia-*.test.mjs` files.
- [ ] Run `git diff --check`.

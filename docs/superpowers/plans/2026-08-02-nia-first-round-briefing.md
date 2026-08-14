# N.I.A First Round Briefing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show a one-time Asari briefing when the first-round N.I.A planning tablet first opens.

**Architecture:** The host owns the persisted completion flag and includes it in the existing N.I.A state projection. The iframe owns presentation and sends one completion message through the existing postMessage bridge after the final slide.

**Tech Stack:** Plain HTML, CSS, JavaScript, Node.js built-in test runner.

---

### Task 1: Lock The Host Contract

**Files:**
- Modify: `tests/nia-host-bridge.test.mjs`
- Modify: `app.js`

- [ ] Add failing assertions for `firstRoundBriefingSeen`, its projected value, and `niaFirstRoundBriefingComplete` handling.
- [ ] Run `node --test tests/nia-host-bridge.test.mjs` and confirm the assertions fail because the contract is absent.
- [ ] Add the default/normalized boolean field, expose it through `getNiaStateProjection()`, and handle the completion message by saving and syncing state.
- [ ] Re-run the focused test and confirm it passes.

### Task 2: Build The Tablet Dialogue

**Files:**
- Modify: `tests/nia-prototype.test.mjs`
- Modify: `nia-prototype.html`
- Modify: `nia-prototype.css`
- Modify: `nia-prototype.js`

- [ ] Add failing assertions for the accessible dialogue layer, Asari standee, four fixed briefing topics, first-round trigger guard, completion message, and keyboard controls.
- [ ] Run `node --test tests/nia-prototype.test.mjs` and confirm the assertions fail because the briefing UI is absent.
- [ ] Add the briefing markup and four fixed messages.
- [ ] Add modal presentation styles, 44px controls, responsive layout, and reduced-motion behavior.
- [ ] Add first-round-only presentation, click/keyboard progression, local duplicate prevention, focus management, and host completion dispatch.
- [ ] Re-run the focused test and confirm it passes.

### Task 3: Regression Verification

**Files:**
- Verify: `app.js`
- Verify: `nia-prototype.js`
- Verify: related N.I.A tests

- [ ] Run `node --check app.js` and `node --check nia-prototype.js`.
- [ ] Run `node --test tests/nia-prototype.test.mjs tests/nia-host-bridge.test.mjs tests/nia-training-flow.test.mjs tests/vn-flow.test.mjs`.
- [ ] Run `git diff --check` on the files changed by this feature and report any unrelated pre-existing whitespace separately.

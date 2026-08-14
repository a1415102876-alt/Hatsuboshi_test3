# Saki VN Expression Standees Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Hanami Saki's VN dialogue use the existing semantic expression standees, with `neutral_standby.png` as the untagged default.

**Architecture:** Reuse the portrait-expression resolver already used by N.I.A live scenes. The VN renderer will normalize Saki's untagged speaker cue to the neutral preset, resolve tagged cues through the shared resolver, and display only the base speaker name; all other speakers continue through the same resolver's existing fallback path.

**Tech Stack:** Vanilla JavaScript, Node.js built-in test runner.

---

### Task 1: Connect VN Rendering to Expression Presets

**Files:**
- Modify: `app.js`
- Modify: `tests/portrait-integration.test.mjs`

- [x] **Step 1: Write the failing integration assertions**

Assert that `renderVnSlide()` calls `getDefaultSpeakerVisualCue(slide.speaker)`, resolves the normalized cue with `resolvePortraitForSpeakerVisualCue()`, and uses `visual.speaker` for the nameplate and idol theme lookup.

- [x] **Step 2: Run the focused test and verify failure**

Run: `node --test tests/portrait-integration.test.mjs`

Expected: FAIL because `renderVnSlide()` still calls `resolvePortraitForSpeaker(slide.speaker)` and displays the raw tagged speaker value.

- [x] **Step 3: Implement the minimal VN renderer change**

Normalize only through the shared default-cue helper, resolve the returned visual cue, use its base speaker for visible UI and color lookup, and apply its resolved portrait. The expression resolver preserves existing behavior for non-Saki speakers.

- [x] **Step 4: Run focused and related tests**

Run: `node --test tests/portrait-integration.test.mjs tests/portrait-expression-presets.test.mjs tests/nia-live-business-ui.test.mjs`

Expected: all tests pass.

- [x] **Step 5: Run syntax and diff checks**

Run: `node --check app.js` and `git diff --check`

Expected: both commands succeed. Do not commit because the user has not requested a commit and the worktree contains unrelated changes.

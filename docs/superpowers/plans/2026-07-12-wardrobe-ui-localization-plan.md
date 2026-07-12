# Wardrobe UI Localization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Localize the wardrobe UI and add an explicit producer-alias add button.

**Architecture:** Keep all existing portrait and alias state behavior. Change static labels in `index.html`, route button and Enter interactions through one small function in `app.js`, and adjust the existing input-row CSS for a text command button.

**Tech Stack:** HTML, CSS, browser JavaScript, Node test runner

---

### Task 1: RED tests

**Files:**
- Modify: `tests/portrait-wardrobe-ui.test.mjs`

- [ ] Assert all wardrobe labels and placeholders are Chinese and `portraitWardrobeAliasAddBtn` exists.
- [ ] Assert `assets/scenes/Wardrobe_Fitting_Room.png` exists locally and remains referenced by CSS.
- [ ] Assert both alias Enter and add-button handlers call `submitProducerPortraitAliasInput()`.
- [ ] Run `node --test tests/portrait-wardrobe-ui.test.mjs`; expect failures for the current English labels and missing button/helper.

### Task 2: Minimal UI implementation

**Files:**
- Modify: `index.html`
- Modify: `style.css`
- Modify: `app.js`

- [ ] Replace the approved wardrobe strings with Chinese equivalents without changing IDs.
- [ ] Replace the plus SVG with `<button id="portraitWardrobeAliasAddBtn" type="button">添加</button>`.
- [ ] Add `submitProducerPortraitAliasInput()` to read the input, call the existing validator, clear on success, and preserve the current toast failure behavior.
- [ ] Route Enter and click through the shared submit helper.
- [ ] Run the UI test, `node --check app.js`, and `git diff --check`.

### Task 3: Regression verification

**Files:**
- Verify only

- [ ] Run all five portrait test files and confirm zero failures.
- [ ] Inspect the final diff for unrelated changes.
- [ ] Verify the deployed Worker serves the tracked fitting-room asset after the next `npx wrangler deploy`.

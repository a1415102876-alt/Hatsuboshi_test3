# Idol Interaction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a permanent zero-cost interaction action for generating scenes between the担当 and selected or AI-chosen idols.

**Architecture:** Extend the existing data-driven action renderer with an `interaction` action and a dedicated overlay. Keep prompt construction in one function that accepts selected characters, optional plot direction and AI-decides mode; reuse the current SillyTavern request bridge and event reply overlay.

**Tech Stack:** Vanilla HTML/CSS/JavaScript, Node built-in test runner.

---

### Task 1: Interaction prompt contract

**Files:**
- Create: `tests/idol-interaction.test.mjs`
- Modify: `app.js`

- [ ] Write a test that extracts `buildIdolInteractionPrompt` from `app.js` and invokes it with a controlled state.
- [ ] Verify the test fails because the builder does not exist.
- [ ] Implement prompts for selected-character and AI-decides modes, optional plot text, one-to-three AI participants, zero action/time/stat changes, and the existing正文 protocol.
- [ ] Run `node --test tests/idol-interaction.test.mjs` and expect all cases to pass.

### Task 2: Permanent interaction overlay

**Files:**
- Modify: `index.html`
- Modify: `style.css`
- Modify: `app.js`

- [ ] Add a full-screen interaction overlay with segmented mode buttons, a multi-select character grid, optional plot textarea, internal validation text, cancel and generate controls.
- [ ] Render every character except the current担当; maintain selected names in a `Set` and expose selection through `aria-pressed`.
- [ ] Add `互动` with `行动0` to normal, extra and First Live action sets.
- [ ] Submit through the current bridge using active story type `interaction`; show the received reply under title `偶像互动` without settling an action.
- [ ] Add responsive styles for touch-size character choices and mobile scrolling.
- [ ] Run both interaction and idol-data tests, `node --check app.js`, and `git diff --check`.

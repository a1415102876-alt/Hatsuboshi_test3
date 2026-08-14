# N.I.A Desk Phone Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a fixed, clickable phone prop to the N.I.A planning desk without changing the tablet workflow.

**Architecture:** The phone is a sibling of the tablet inside `.desk`, so it belongs to the physical workspace rather than tablet content. A small click handler toggles one presentation class and `aria-pressed`; CSS owns placement, appearance, responsive behavior, and reduced motion.

**Tech Stack:** Vanilla HTML, CSS, JavaScript, Node test runner.

---

### Task 1: Desk Phone Prop

**Files:**
- Modify: `nia-prototype.html`
- Modify: `nia-prototype.css`
- Modify: `nia-prototype.js`
- Test: `tests/nia-desk-phone.test.mjs`

- [ ] Write a failing source-contract test for a `niaDeskPhone` button, desk-level placement, accessible pressed state, responsive CSS, and click binding.
- [ ] Run `node --test tests/nia-desk-phone.test.mjs` and confirm it fails because the phone does not exist.
- [ ] Add the phone markup as a direct `.desk` child beside `.tablet`.
- [ ] Add a fixed tabletop position, device shell, screen, notification state, focus treatment, small-screen rules, and reduced-motion fallback.
- [ ] Add a click handler that toggles `.is-awake` and synchronizes `aria-pressed`.
- [ ] Run `node --test tests/nia-desk-phone.test.mjs tests/nia-prototype.test.mjs` and confirm both pass.
- [ ] Run `node --check nia-prototype.js` and `git diff --check -- nia-prototype.html nia-prototype.css nia-prototype.js tests/nia-desk-phone.test.mjs`.

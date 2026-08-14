# N.I.A Vertical Prototype Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an isolated, playable prototype that validates planning-day compilation, editable five-day scheduling, and guidance-dependent business results.

**Architecture:** Keep the prototype separate from the current production entry points. Put deterministic planning and business-resolution rules in a small reusable core module, then have a standalone HTML/CSS/JS interface render the flow and persist only within the prototype session.

**Tech Stack:** Static HTML, CSS, vanilla JavaScript, Node built-in test runner.

---

### Task 1: Deterministic Prototype Rules

**Files:**
- Create: `nia-prototype-core.js`
- Test: `tests/nia-prototype.test.mjs`

- [ ] Write failing tests for draft compilation, schedule validation, and guidance-dependent business hooks.
- [ ] Run `node --test tests/nia-prototype.test.mjs` and verify failure because the module is missing.
- [ ] Implement the minimal pure functions and fixed Saki prototype data.
- [ ] Re-run the focused test and verify it passes.

### Task 2: Standalone Interactive Flow

**Files:**
- Create: `nia-prototype.html`
- Create: `nia-prototype.css`
- Create: `nia-prototype.js`

- [ ] Build the planning form with the supplied Saki draft prefilled.
- [ ] Render Asari's compiled proposal and editable five-day schedule.
- [ ] Add the business briefing, freeform producer guidance, intent confirmation, and deterministic result comparison.
- [ ] Preserve accessibility, responsive layout, visible focus, and reduced-motion behavior.

### Task 3: Verification

**Files:**
- Test: `tests/nia-prototype.test.mjs`

- [ ] Run the focused Node test.
- [ ] Run the complete Node test suite.
- [ ] Serve the static files locally and inspect desktop and mobile screenshots.
- [ ] Verify no overflow, overlap, broken assets, or console errors.

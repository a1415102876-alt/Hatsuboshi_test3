# Tagged JSON Last Opening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every N.I.A structured JSON parser select the final opening tag before a closing tag so planning text that mentions the protocol tag cannot poison parsing.

**Architecture:** Keep validation and payload contracts unchanged. Replace forward non-greedy tag scans with a small backward boundary search local to each API module, preserving each module's existing entity decoding and JSON repair behavior.

**Tech Stack:** Browser JavaScript ES modules/IIFEs, Node.js built-in test runner.

---

### Task 1: Add Regression Coverage

**Files:**
- Modify: `tests/nia-business-api.test.mjs`
- Modify: `tests/nia-radio-business-api.test.mjs`
- Modify: `tests/nia-audition-api.test.mjs`
- Modify: `tests/nia-fan-milestone-api.test.mjs`
- Modify: `tests/nia-sns-business-api.test.mjs`
- Modify: `tests/nia-producer-work-api.test.mjs`

- [ ] Add one case per parser where planning text mentions the same opening tag before the real tagged JSON block.
- [ ] Run the six tests and confirm they fail with missing/invalid JSON before implementation.

### Task 2: Use Final Opening Boundaries

**Files:**
- Modify: `nia-business-api.js`
- Modify: `nia-radio-business-api.js`
- Modify: `nia-audition-api.js`
- Modify: `nia-fan-milestone-api.js`
- Modify: `nia-sns-business-api.js`
- Modify: `nia-producer-work-api.js`

- [ ] Locate the last closing tag, then locate the last opening tag before that closing tag.
- [ ] Parse that body while retaining each module's existing validation, fallback, and error reasons.
- [ ] Repeat backward only when a module intentionally supports multiple candidate blocks.

### Task 3: Verify

**Files:**
- Verify only.

- [ ] Run all affected API tests.
- [ ] Run syntax checks for all modified JavaScript files.
- [ ] Run `git diff --check` without modifying unrelated failures or fixtures.

# Misuzu Action Balance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Misuzu-specific action costs, gains, rest events, and matching UI labels.

**Architecture:** Centralize per-idol action tuning in pure helpers consumed by settlement and rendering. Extend the existing random-event pool with a rest category available only to Misuzu.

**Tech Stack:** Vanilla JavaScript, Node.js built-in test runner

---

### Task 1: Balance rules

**Files:**
- Create: `tests/misuzu-balance.test.mjs`
- Modify: `app.js`

- [ ] Write failing tests for lesson, training, SP, rest chance, and default-idol fallback.
- [ ] Run `node --test tests/misuzu-balance.test.mjs` and confirm failure from missing helpers.
- [ ] Implement pure per-idol tuning helpers and rest-event eligibility.
- [ ] Run the focused test and confirm it passes.

### Task 2: Settlement and UI

**Files:**
- Modify: `app.js`
- Modify: `tests/misuzu-balance.test.mjs`

- [ ] Write failing source-contract tests for settlement, rest random events, and dynamic action labels.
- [ ] Update settlement and action rendering to consume the shared tuning.
- [ ] Run syntax checks and the complete frontend test suite.

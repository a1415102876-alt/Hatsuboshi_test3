# Shujuku Generation Lifecycle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Trigger Shujuku's official automatic table-fill scheduler after a Hatsu silent assistant reply without requesting a chat-floor render.

**Architecture:** Emit only SillyTavern's generation lifecycle events around Hatsu's text-only generation. Emit `GENERATION_STARTED` before generation and `GENERATION_ENDED` only after the silent assistant message has been created and persisted; keep render and chat-change events absent.

**Tech Stack:** Browser JavaScript, SillyTavern event source, Node.js test runner.

---

### Task 1: Lock lifecycle ordering with a regression test

**Files:**
- Modify: `tests/shujuku-original-bridge.test.mjs`

- [ ] Add a source-contract test requiring start before text generation and end after assistant persistence.
- [ ] Require that the original adapter does not emit `CHARACTER_MESSAGE_RENDERED` or `CHAT_CHANGED`.
- [ ] Run `node --test tests/shujuku-original-bridge.test.mjs` and verify the new test fails because lifecycle emission is absent.

### Task 2: Emit the official generation lifecycle

**Files:**
- Modify: `st.html`
- Modify: `shujuku-original-startup.html`

- [ ] Add focused helpers for `GENERATION_STARTED` and `GENERATION_ENDED`.
- [ ] Emit start after planning and immediately before text generation.
- [ ] Emit end after the assistant message is persisted and before the database commit bridge runs.
- [ ] Increment the `st.html` cache-busting version in the startup script.

### Task 3: Verify the integration contract

**Files:**
- Test: `tests/shujuku-original-bridge.test.mjs`
- Test: `tests/shujuku-harness-bridge.test.mjs`

- [ ] Run both test files and confirm all tests pass.
- [ ] Run JavaScript syntax checks and `git diff --check` on touched files.
- [ ] Report that browser runtime table filling still requires manual SillyTavern validation.

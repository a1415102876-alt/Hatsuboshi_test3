# Hatsuboshi Live Visual Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply the approved orange Hatsuboshi-branded livestream design without changing N.I.A live behavior.

**Architecture:** Preserve all existing live DOM IDs and event handlers. Extend the live overlay markup with brand and channel presentation, style it through component-scoped CSS tokens, and enrich comment rendering locally while retaining the API payload contract.

**Tech Stack:** Vanilla HTML, CSS, JavaScript, Node.js built-in test runner.

---

### Task 1: Add Visual Contract Tests

**Files:**
- Modify: `tests/nia-live-business-ui.test.mjs`

- [x] Assert that the overlay includes the official crest, platform identity, channel identity, and chat pinned notice.
- [x] Assert that CSS defines orange platform tokens, uses `--idol-theme` only as an accent, and retains desktop/mobile layouts.
- [x] Run `node --test tests/nia-live-business-ui.test.mjs` and confirm the new assertions fail because the structure is absent.

### Task 2: Implement Branded Structure and Styling

**Files:**
- Modify: `index.html`
- Modify: `style.css`
- Modify: `app.js`

- [x] Extend the existing live markup without changing IDs required by JavaScript.
- [x] Replace generic dark dashboard styling with the orange/white official-site visual system and responsive rules.
- [x] Render safe deterministic viewer identity markup around each generated comment.
- [x] Run the focused live UI and API tests and confirm all pass.

### Task 3: Verify the Integrated Screen

**Files:**
- Verify: `index.html`
- Verify: `style.css`
- Verify: `app.js`

- [x] Run syntax checks and `git diff --check`.
- [x] Open the local UI, capture desktop and mobile screenshots, and inspect for overflow, overlap, missing assets, and unusable controls.
- [x] Do not commit or push because the user has not requested repository operations.

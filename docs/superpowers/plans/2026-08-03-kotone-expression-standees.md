# Kotone Expression Standees Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 18 semantic Fujita Kotone expression standees to the shared VN and N.I.A live portrait pipeline.

**Architecture:** Extend the existing expression preset registry from a Saki-only lookup into a small per-character registry without changing its public parser API. Rename the approved Kotone assets mechanically, then expose Kotone's controlled vocabulary to the live prompt builder while retaining base-portrait fallback behavior.

**Tech Stack:** Native JavaScript, PNG assets, Node `node:test`.

---

### Task 1: Lock the Kotone expression contract

**Files:**
- Modify: `tests/portrait-expression-presets.test.mjs`
- Modify: `tests/nia-business-api.test.mjs`

- [ ] Add a test containing all 18 approved Kotone functional tags and semantic filenames.
- [ ] Assert `藤田琴音(功能词)` resolves to `Kotone_Standees_Altered`, unknown tags fall back, and the default cue is `藤田琴音(平常待机)`.
- [ ] Assert the live prompt contains Kotone's controlled tags and excludes Saki-only tags.
- [ ] Run `node --test tests/portrait-expression-presets.test.mjs tests/nia-business-api.test.mjs` and confirm failure because Kotone is not registered.

### Task 2: Normalize assets and implement the registry

**Files:**
- Modify: `assets/novel-standees/Kotone_Standees_Altered/*.png`
- Modify: `appearance/portrait-expression-presets.js`
- Modify: `nia-business-api.js`

- [ ] Delete `kotone_pose_16.png` and rename the other 18 files according to the tested mapping.
- [ ] Add Kotone's preset map, asset directory, exported tag list, parsing support, and default standby cue to the shared expression module.
- [ ] Add Kotone's controlled vocabulary to `buildNiaLiveSegmentPrompt` using the same speaker suffix contract as Saki.
- [ ] Run the focused tests and confirm they pass.

### Task 3: Verify integration and regressions

**Files:**
- Verify: `tests/portrait-integration.test.mjs`
- Verify: `tests/nia-live-business-ui.test.mjs`

- [ ] Run `node --test tests/portrait-expression-presets.test.mjs tests/portrait-integration.test.mjs tests/nia-business-api.test.mjs tests/nia-live-business-ui.test.mjs`.
- [ ] Run `node --check appearance/portrait-expression-presets.js` and `node --check nia-business-api.js`.
- [ ] Confirm the Kotone directory contains exactly the 18 tested semantic filenames and no `kotone_pose_16.png`.
- [ ] Run `git diff --check` on the changed source and test files.

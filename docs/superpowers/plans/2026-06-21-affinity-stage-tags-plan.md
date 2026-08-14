# Affinity Stage Tags Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Emit one compact idol-specific affinity stage tag in every AI prompt produced by the frontend.

**Architecture:** Add a data map from playable idol names to stable Romanized identifiers and pure helpers that select the current threshold and format the tag line. Prompt builders call one shared context formatter so all AI interactions use the same protocol.

**Tech Stack:** Vanilla JavaScript, Node.js built-in test runner

---

### Task 1: Affinity stage calculation

**Files:**
- Modify: `app.js`
- Create: `tests/affinity-stage-tags.test.mjs`

- [ ] **Step 1: Write the failing calculation test**

Extract `affinityIdolCodes`, `getAffinityStageThreshold`, and `getAffinityStageTag` from `app.js`. Assert all twelve idol codes and boundaries `0/19/20/39/40/59/60/79/80/99/100/150`.

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test tests/affinity-stage-tags.test.mjs`

Expected: FAIL because the map and helpers are not defined.

- [ ] **Step 3: Implement the data map and pure helpers**

Add `affinityIdolCodes`, calculate the highest threshold not greater than trust, and return `AFF_<CODE>_<THRESHOLD>` or an empty string for an unsupported idol.

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --test tests/affinity-stage-tags.test.mjs`

Expected: all calculation tests pass.

### Task 2: Prompt coverage

**Files:**
- Modify: `app.js`
- Modify: `tests/affinity-stage-tags.test.mjs`

- [ ] **Step 1: Write the failing prompt coverage test**

Assert every AI prompt builder includes a call to the shared affinity stage line formatter and that the formatter produces `好感度阶段标签：AFF_LILJA_40`.

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test tests/affinity-stage-tags.test.mjs`

Expected: FAIL because prompt builders do not yet include the tag.

- [ ] **Step 3: Inject the shared line into all prompt builders**

Add `getAffinityStageLine()` and include it in opening, action, Live preparation, affinity story, free chat, idol interaction, and First Live prompts.

- [ ] **Step 4: Run focused and regression tests**

Run: `node --check app.js; node --test tests/*.test.mjs`

Expected: JavaScript syntax is valid and all tests pass.

# Five Idols Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 仓本千奈、葛城莉莉娅、紫云清夏、有村麻央、姬崎莉波 as complete playable担当偶像.

**Architecture:** Extend the existing data-driven maps in `app.js`; the current selector, save system, prompt builders and event system will consume the new entries automatically. Add a Node data-contract test that extracts the literal configuration blocks and verifies every new idol has complete narrative, numeric and affinity data.

**Tech Stack:** Vanilla JavaScript, Node.js built-in test runner, SillyTavern iframe frontend.

---

### Task 1: Add a failing data-contract test

**Files:**
- Create: `tests/idol-data.test.mjs`
- Test: `tests/idol-data.test.mjs`

- [ ] **Step 1: Write the failing test**

Create a Node test which reads `app.js`, extracts `idols`, `idolPresets` and `affinityRouteSeeds` with `vm.runInNewContext`, and asserts all five names exist. Assert each idol has `core`, five action styles, a 12-number preset matching the supplied first six values, and affinity nodes `0/20/40/60/80/100`.

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/idol-data.test.mjs`

Expected: FAIL because the five names are present only in the interaction pool, not in the playable configuration maps.

### Task 2: Add complete playable data

**Files:**
- Modify: `app.js:12-240`
- Test: `tests/idol-data.test.mjs`

- [ ] **Step 1: Add narrative profiles**

Add one `idols` entry per new character. Each entry defines `tag`, `theme`, `core`, and `styles.lesson/training/outing/companion/rest` from the worldbook characterization.

- [ ] **Step 2: Add numeric presets**

Use these exact screenshot values for the first six fields:

```js
"姬崎莉波": [85, 120, 125, 13, 21.5, 25.5]
"葛城莉莉娅": [80, 100, 115, 18, 20, 18]
"有村麻央": [125, 90, 100, 22, 8, 23]
"紫云清夏": [100, 115, 90, 9, 23, 23]
"仓本千奈": [75, 115, 125, 10, 24, 20.5]
```

Append First Live thresholds and caps on the same difficulty scale as existing presets.

- [ ] **Step 3: Add affinity route seeds**

For each idol add keys `0`, `20`, `40`, `60`, `80`, and `100`. Base early nodes on the supplied first ten affinity episodes; keep node 80 on the First Live eve and node 100 after a successful live.

- [ ] **Step 4: Run contract and syntax tests**

Run: `node --test tests/idol-data.test.mjs`

Expected: PASS.

Run: `node --check app.js`

Expected: exit code 0 with no output.

### Task 3: Verify selector behavior

**Files:**
- Verify: `index.html`
- Verify: `app.js`

- [ ] **Step 1: Open the local frontend**

Open `file:///F:/SillyTavern/SillyTavern/public/hatsu-produce-local/index.html`, reset to the担当选择 screen, and confirm all five names appear.

- [ ] **Step 2: Select representative idols**

Select at least one new idol and confirm its displayed initial Vo/Da/Vi and growth rates match the test fixture. Return to selection and confirm another new idol loads independently.

- [ ] **Step 3: Inspect the final diff**

Run: `git diff --check` and `git diff -- app.js tests/idol-data.test.mjs`.

Expected: no whitespace errors; changes are limited to new idol data and its contract test.

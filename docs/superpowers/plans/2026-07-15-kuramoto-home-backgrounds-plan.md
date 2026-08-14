# Kuramoto Home Backgrounds Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Connect the three Kuramoto home facilities to their supplied scene background images.

**Architecture:** Keep the existing `FREE_MODE_OUTING_VENUES` facility-driven rendering path. Replace only the three `china_home` fallback image values, and extend the existing outing-scene test to verify both mappings and resource presence.

**Tech Stack:** Browser JavaScript, Node.js built-in test runner, `node:fs`.

---

### Task 1: Lock the background mapping with a failing test

**Files:**
- Modify: `tests/free-mode-outing-scene.test.mjs`
- Test: `tests/free-mode-outing-scene.test.mjs`

- [ ] **Step 1: Import the file existence helper**

Change the existing import to:

```js
import { existsSync, readFileSync } from "node:fs";
```

- [ ] **Step 2: Add mapping and resource assertions to the Kuramoto home test**

Add these assertions inside `Kuramoto home outing uses a gate, front hall, and bedroom venue`:

```js
assert.match(source, /id: "gate",[\s\S]*?image: "\.\/assets\/scenes\/kuramoto_house\.png"/);
assert.match(source, /id: "front_hall",[\s\S]*?image: "\.\/assets\/scenes\/kuramoto_front\.png"/);
assert.match(source, /id: "bedroom",[\s\S]*?image: "\.\/assets\/scenes\/Kuramoto_Bedroom\.png"/);
[
  "../assets/scenes/kuramoto_house.png",
  "../assets/scenes/kuramoto_front.png",
  "../assets/scenes/Kuramoto_Bedroom.png"
].forEach((path) => assert.equal(existsSync(new URL(path, import.meta.url)), true, `${path} must exist`));
```

- [ ] **Step 3: Run the focused test and verify RED**

Run:

```powershell
node --test tests/free-mode-outing-scene.test.mjs
```

Expected: FAIL because the three facilities still use `DEFAULT_OUTING_SCENE`.

### Task 2: Connect the supplied backgrounds

**Files:**
- Modify: `app.js:683`
- Test: `tests/free-mode-outing-scene.test.mjs`

- [ ] **Step 1: Replace the three fallback image values**

Use these exact values in `FREE_MODE_OUTING_VENUES.china_home.facilities`:

```js
image: "./assets/scenes/kuramoto_house.png"
image: "./assets/scenes/kuramoto_front.png"
image: "./assets/scenes/Kuramoto_Bedroom.png"
```

- [ ] **Step 2: Run the focused test and verify GREEN**

Run:

```powershell
node --test tests/free-mode-outing-scene.test.mjs
```

Expected: all subtests pass.

- [ ] **Step 3: Run syntax and related regression checks**

Run:

```powershell
node --check app.js
node --test tests/free-mode.test.mjs tests/off-campus-transit-layout.test.mjs tests/world-engine.test.mjs
git diff --check
```

Expected: all tests pass, syntax exits with code 0, and diff check reports no errors.

- [ ] **Step 4: Commit only the implementation files when requested**

```powershell
git add -- app.js tests/free-mode-outing-scene.test.mjs assets/scenes/kuramoto_house.png assets/scenes/kuramoto_front.png assets/scenes/Kuramoto_Bedroom.png
git commit -m "Connect Kuramoto home scene backgrounds"
```

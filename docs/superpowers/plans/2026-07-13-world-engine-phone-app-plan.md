# World Engine Phone App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a read-only “初星世界引擎” phone application that exposes current Director direction, pressures, runtime status, and recent receipts without changing state or sending requests.

**Architecture:** Add a pure `world/director-phone-view.js` adapter that converts the persisted Director shape into a bounded UI view model. Existing `app.js` phone routing renders that model into a new `index.html` app view; `style.css` supplies the approved dual-layer archive presentation. `st.html` only adds the new module to its loader list.

**Tech Stack:** Vanilla JavaScript IIFE modules, HTML, CSS, Node `node:test`, VM-based execution tests, SillyTavern local host.

---

### Task 1: Pure Director Phone View Model

**Files:**
- Create: `world/director-phone-view.js`
- Create: `tests/world-director-phone-view.test.mjs`
- Modify: `index.html` script list
- Modify: `st.html` `WORLD_SCRIPTS`

- [ ] **Step 1: Write failing execution tests**

Create VM tests that load `world/director-phone-view.js` and assert:

```js
const model = api.buildViewModel(director, {
  currentDayKey: "day-2",
  resolveActorLabel: (id) => id === "idol:藤田琴音" ? "藤田琴音" : "未知对象"
});
assert.equal(model.direction.summary, "让训练承诺获得回应。");
assert.equal(model.direction.isCurrentDay, true);
assert.equal(model.pressures.length, 1);
assert.equal(model.runtime.receipts.length, 5);
assert.equal(JSON.stringify(director), before);
assert.doesNotMatch(JSON.stringify(model), /request-secret|job-secret|scope-secret|prompt-secret/);
```

Also cover missing Director state, `enabled: false`, stale day keys, empty pressures, `active`/`suspended` filtering, resolved-stage exclusion, unknown enums, and bounded error/summary text.

- [ ] **Step 2: Run tests and verify RED**

Run: `node --test tests/world-director-phone-view.test.mjs`

Expected: FAIL because `world/director-phone-view.js` does not exist.

- [ ] **Step 3: Implement the pure adapter**

Export through the existing namespace:

```js
global.HatsuWorld.directorPhoneView = {
  buildViewModel,
  PRESSURE_THEME_LABELS,
  PRESSURE_STAGE_LABELS
};
```

`buildViewModel(value, options)` must only read its input. It returns `availability`, current direction using the actual `dailyDirection.summary` field, visible pressure cards, bounded runtime metadata, and the newest five receipts in reverse chronological order. It must not return IDs, source refs, Prompt fields, raw replies, or save scope.

- [ ] **Step 4: Load the module before `app.js`**

Add:

```html
<script src="./world/director-phone-view.js"></script>
```

after `world/director-injection.js` in `index.html`, and add `"world/director-phone-view.js"` at the same relative position in `st.html` `WORLD_SCRIPTS`.

- [ ] **Step 5: Verify Task 1**

Run:

```text
node --test tests/world-director-phone-view.test.mjs
node --check world/director-phone-view.js
git diff --check
```

Expected: all tests pass and both checks exit 0.

### Task 2: Phone Registration, DOM, and Read-Only Routing

**Files:**
- Modify: `app.js`
- Modify: `index.html`
- Create: `tests/world-engine-phone-app.test.mjs`

- [ ] **Step 1: Write failing route and side-effect tests**

Test that the registry contains `id: "world-engine"`, `launchPhoneApp()` routes to `openPhoneWorldEngineApp()`, home/back logic hides the view, and the new HTML contains the required IDs. Execute `openPhoneWorldEngineApp()` in a VM with stubbed DOM/render helpers and assert it calls only visibility/status/navigation/render helpers, never `saveState`, request transports, or Director recalculation.

- [ ] **Step 2: Run tests and verify RED**

Run: `node --test tests/world-engine-phone-app.test.mjs`

Expected: FAIL because the app, route, and DOM do not exist.

- [ ] **Step 3: Add the application shell**

Register:

```js
{
  id: "world-engine",
  name: "初星世界引擎",
  subtitle: "世界档案",
  theme: "linear-gradient(135deg, #167c80, #22324a)",
  iconText: "星",
  installed: true
}
```

Add `phoneWorldEngineApp` to every sibling-app hide list, `phoneNavBack()`, and `launchPhoneApp()`.

Add an `index.html` view with:

```html
<div id="phoneWorldEngineApp" class="world-engine-app" hidden>
  <header class="world-engine-head">...</header>
  <nav id="worldEngineTabs" class="world-engine-tabs" aria-label="世界引擎视图">...</nav>
  <div id="worldEngineContent" class="world-engine-scroll" aria-live="polite">...</div>
</div>
```

The header includes an icon-only refresh button with `aria-label="刷新世界引擎状态"`. Tabs use `data-world-engine-tab` and `aria-selected`.

- [ ] **Step 4: Implement opening and event binding**

Add `openPhoneWorldEngineApp()`, `bindPhoneWorldEngineEvents()`, and `setWorldEnginePhoneTab(tab)`. Opening hides sibling views, sets `world-engine` status mode, shows the phone navbar, binds once, and renders. Refresh only calls render.

- [ ] **Step 5: Verify Task 2**

Run:

```text
node --test tests/world-engine-phone-app.test.mjs
node --check app.js
git diff --check
```

Expected: all tests pass and both checks exit 0.

### Task 3: Three Read-Only Views and Visual Styling

**Files:**
- Modify: `app.js`
- Modify: `style.css`
- Modify: `tests/world-engine-phone-app.test.mjs`

- [ ] **Step 1: Extend tests for rendering contracts**

Assert that rendering consumes `globalThis.HatsuWorld.directorPhoneView.buildViewModel`, escapes all model-provided text, and creates the three approved states: current direction, empty pressure list, and runtime/receipt summary. Assert the source does not call `saveState`, `requestManualWorldDirectorRecalculation`, `requestHostSecondaryPromptSend`, or `sendAiPrompt` inside world-engine phone functions.

- [ ] **Step 2: Run tests and verify RED**

Run: `node --test tests/world-engine-phone-app.test.mjs`

Expected: FAIL because render functions and content are incomplete.

- [ ] **Step 3: Implement render functions**

Add:

```js
function getWorldEnginePhoneViewModel() { ... }
function renderWorldEnginePhoneApp() { ... }
function renderWorldEngineToday(model) { ... }
function renderWorldEnginePressures(model) { ... }
function renderWorldEngineRuntime(model) { ... }
```

All model text passes through `escapePhoneText`. `dirty` reads “发现新动向，等待日切或手动重算”; empty pressures read “今日局势平稳”; retryable failures show a bounded reason and direct the user to the existing DEBUG entry without a retry button.

- [ ] **Step 4: Implement the approved B styling**

Add `.world-engine-*` styles with a white/light-gray archive surface, teal identity accent, coral pressure accent, fixed tab height, scrollable content, bounded pressure meters, and the existing phone navbar bottom offset. Do not use nested decorative cards, gradients as the main page background, negative letter spacing, or viewport-scaled type.

- [ ] **Step 5: Verify Task 3**

Run:

```text
node --test tests/world-director-phone-view.test.mjs tests/world-engine-phone-app.test.mjs
node --check app.js
git diff --check
```

Expected: all tests pass and both checks exit 0.

### Task 4: Integration and Real UI Verification

**Files:**
- Modify only if verification finds a scoped defect: `app.js`, `index.html`, `style.css`, or the two new tests

- [ ] **Step 1: Run focused and regression suites**

Run:

```text
node --test tests/world-director-phone-view.test.mjs tests/world-engine-phone-app.test.mjs tests/world-director-state.test.mjs tests/world-director-integration.test.mjs tests/world-engine.test.mjs tests/phone-chat.test.mjs
node --test tests/*.test.mjs
node --check app.js
git diff --check
```

Record pass/fail counts and distinguish existing failures from new regressions.

- [ ] **Step 2: Verify in the real SillyTavern-hosted frontend**

Open `http://127.0.0.1:8000/hatsu-produce-local/index.html` or the active `st.html` loader, enter the phone, and verify 390px and the normal phone maximum width. Check all three tabs, refresh, back, home, and close. Confirm no horizontal overflow, clipping, overlap, model request, save, or Director state mutation.

- [ ] **Step 3: Inspect the final diff**

Confirm the diff contains only the new phone feature plus the pre-existing unrelated `app.js`/`tests/vn-flow.test.mjs` changes, with no `.superpowers/` or `.vs/` additions.

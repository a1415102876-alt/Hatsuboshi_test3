# China Scout Talk Action Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show only one full-width “和千奈搭话” action before China accepts the producer assignment, and route it into the existing scout story flow.

**Architecture:** Add a dedicated action button to the existing outing character menu and keep it hidden by default. `openFreeModeOutingIdolActionMenu()` switches between scout-only and standard actions using `isChinaHomeScoutBedroomActive()`, while `handleFreeModeOutingIdolAction()` routes the dedicated action to the existing full scout flow.

**Tech Stack:** HTML, CSS, browser JavaScript, Node.js built-in test runner.

---

### Task 1: Lock the scout-only menu behavior with a failing test

**Files:**
- Modify: `tests/free-mode-outing-scene.test.mjs`
- Test: `tests/free-mode-outing-scene.test.mjs`

- [ ] **Step 1: Add UI and route assertions**

Extend the Kuramoto home and outing character menu tests with assertions for:

```js
assert.match(html, /data-outing-idol-action="china_scout_talk"[^>]*>和千奈搭话<\/button>/);
assert.match(style, /\.outing-idol-scout-talk\s*\{[\s\S]*grid-column:\s*1\s*\/\s*-1/);
assert.match(readFunction("openFreeModeOutingIdolActionMenu"), /isChinaHomeScoutBedroomActive/);
assert.match(readFunction("openFreeModeOutingIdolActionMenu"), /standardButtons/);
assert.match(readFunction("openFreeModeOutingIdolActionMenu"), /scoutTalkButton/);
assert.match(readFunction("handleFreeModeOutingIdolAction"), /action === "china_scout_talk"/);
assert.match(readFunction("handleFreeModeOutingIdolAction"), /closeFreeModeOutingIdolActionMenu\(\)/);
assert.match(readFunction("handleFreeModeOutingIdolAction"), /startFreeModeOutingFacilityExplore\("chat"\)/);
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```powershell
node --test tests/free-mode-outing-scene.test.mjs
```

Expected: FAIL because the dedicated button and menu switching do not exist.

### Task 2: Implement the scout-only action

**Files:**
- Modify: `index.html:1019`
- Modify: `style.css:10434`
- Modify: `app.js:14682`
- Modify: `app.js:14887`
- Test: `tests/free-mode-outing-scene.test.mjs`

- [ ] **Step 1: Add the dedicated hidden button**

Append inside `.outing-idol-action-grid`:

```html
<button class="event-button primary outing-idol-scout-talk" type="button" data-outing-idol-action="china_scout_talk" hidden>和千奈搭话</button>
```

- [ ] **Step 2: Give the dedicated button stable full-row layout**

Add:

```css
.outing-idol-scout-talk {
  grid-column: 1 / -1;
}

.outing-idol-action-grid .event-button[hidden] {
  display: none;
}
```

- [ ] **Step 3: Switch menu actions when opening**

In `openFreeModeOutingIdolActionMenu()`, select the standard buttons and dedicated button, then apply:

```js
const scoutTalkOnly = canonical === "仓本千奈" && isChinaHomeScoutBedroomActive();
const standardButtons = document.querySelectorAll('[data-outing-idol-action]:not([data-outing-idol-action="china_scout_talk"])');
const scoutTalkButton = document.querySelector('[data-outing-idol-action="china_scout_talk"]');
standardButtons.forEach((button) => {
  button.hidden = scoutTalkOnly;
});
if (scoutTalkButton) scoutTalkButton.hidden = !scoutTalkOnly;
if (!scoutTalkOnly) {
  if (statusButton) statusButton.hidden = !isIdol;
  if (inviteButton) inviteButton.hidden = !isIdol;
}
```

- [ ] **Step 4: Route the dedicated action**

Add at the start of `handleFreeModeOutingIdolAction()`:

```js
if (action === "china_scout_talk") {
  if (!isChinaHomeScoutBedroomActive()) return;
  closeFreeModeOutingIdolActionMenu();
  startFreeModeOutingFacilityExplore("chat");
  return;
}
```

- [ ] **Step 5: Run the focused test and verify GREEN**

Run:

```powershell
node --test tests/free-mode-outing-scene.test.mjs
```

Expected: all subtests pass.

- [ ] **Step 6: Run related regression checks**

Run:

```powershell
node --check app.js
node --test tests/free-mode.test.mjs tests/tasks-sandbox.test.mjs tests/world-engine.test.mjs
git diff --check
```

Expected: all tests pass, syntax exits with code 0, and diff check reports no errors.

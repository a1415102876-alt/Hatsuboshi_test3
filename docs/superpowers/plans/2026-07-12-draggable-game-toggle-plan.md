# Draggable Game Toggle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the unreliable in-shell exit button with one host-body draggable toggle that hides and restores the existing persistent game iframe without reloading it.

**Architecture:** Upgrade the singleton launcher controller from V2 to V3. V3 owns a shell, iframe, and sibling floating button under the SillyTavern host body; pointer gestures update an in-memory position while short clicks toggle only `shell.hidden`.

**Tech Stack:** Vanilla JavaScript DOM APIs, Pointer Events, Node.js built-in test runner, `vm`, and the existing fake DOM harness.

---

## File Structure

- Modify `dist/hatsu-launcher/message-entry.js`: install the V3 controller, create the host-level floating toggle, implement click/drag behavior, and migrate V1/V2 nodes without replacing the iframe.
- Modify `tests/persistent-launcher.test.mjs`: extend the fake DOM with pointer dispatch, pointer capture, window events, and viewport data; add execution-level toggle, drag, singleton, and migration tests.
- Modify `launcher.html`: cache-bust the controller URL from `?v=2` to `?v=3`.
- Modify `README.md`: replace the obsolete in-shell Exit wording with host floating-toggle behavior.

Do not modify `app.js`, `st.html`, Harness, Prompt builders, settlement, Recovery, save metadata, or shujuku bridge code.

### Task 1: Host-Level Toggle Contract

**Files:**
- Modify: `tests/persistent-launcher.test.mjs`
- Modify: `dist/hatsu-launcher/message-entry.js`

- [ ] **Step 1: Extend the fake DOM and write failing toggle tests**

Add `removeEventListener`, `dispatchEvent`, `setPointerCapture`, `releasePointerCapture`, and `getBoundingClientRect` to `FakeElement`. Add host-window `addEventListener`, `removeEventListener`, `dispatchEvent`, `innerWidth`, and `innerHeight` support in `runLauncherInHost()`.

Add execution tests with this contract:

```js
test("start mounts a host-body floating toggle above the shell", () => {
  const env = runLauncherInHost();
  env.startButton.click();
  const shell = env.hostDocument.getElementById("hatsu-persistent-game-shell");
  const toggle = env.hostDocument.getElementById("hatsu-persistent-game-toggle");
  assert.equal(toggle.parentNode, env.hostDocument.body);
  assert.notEqual(toggle.parentNode, shell);
  assert.ok(Number(toggle.style.zIndex) > Number(shell.style.zIndex));
  assert.equal(toggle.hidden, false);
});

test("floating toggle hides and restores the same iframe without changing src", () => {
  const env = runLauncherInHost();
  env.startButton.click();
  const shell = env.hostDocument.getElementById("hatsu-persistent-game-shell");
  const frame = env.hostDocument.getElementById("hatsu-persistent-game-frame");
  const src = frame.src;
  const toggle = env.hostDocument.getElementById("hatsu-persistent-game-toggle");
  toggle.click();
  assert.equal(shell.hidden, true);
  assert.equal(toggle.hidden, false);
  toggle.click();
  assert.equal(shell.hidden, false);
  assert.equal(env.hostDocument.getElementById("hatsu-persistent-game-frame"), frame);
  assert.equal(frame.src, src);
});
```

- [ ] **Step 2: Run the focused tests and confirm RED**

Run `node --test tests/persistent-launcher.test.mjs`.

Expected: new tests fail because `#hatsu-persistent-game-toggle` is not created.

- [ ] **Step 3: Implement the minimal V3 host toggle**

Use these identities:

```js
const CONTROLLER_KEY = "__hatsuPersistentLauncherV3";
const PREVIOUS_CONTROLLER_KEYS = [
  "__hatsuPersistentLauncherV2",
  "__hatsuPersistentLauncherV1"
];
const TOGGLE_ID = "hatsu-persistent-game-toggle";
```

`ensureShell()` must create or reuse the shell and frame, hide the old `#hatsu-persistent-game-exit`, and create one native `button` directly under `hostDocument.body`. Give the shell z-index `999999` and the toggle a greater z-index. `open()` shows shell and toggle; `hide()` hides only shell; `toggle()` selects between them. A single `syncToggleState()` updates icon text, `title`, and `aria-label` from `controller.getStatus()`.

- [ ] **Step 4: Run Task 1 verification**

Run:

```powershell
node --test tests/persistent-launcher.test.mjs
node --check dist/hatsu-launcher/message-entry.js
git diff --check
```

Expected: launcher tests pass and both checks exit 0.

- [ ] **Step 5: Commit Task 1**

```powershell
git add tests/persistent-launcher.test.mjs dist/hatsu-launcher/message-entry.js
git commit -m "feat: add host-level game toggle"
```

### Task 2: Pointer Dragging and Viewport Clamping

**Files:**
- Modify: `tests/persistent-launcher.test.mjs`
- Modify: `dist/hatsu-launcher/message-entry.js`

- [ ] **Step 1: Write failing drag tests**

Add a `dispatchPointer(element, type, overrides)` helper whose defaults include `pointerId: 1`, `clientX`, `clientY`, `button: 0`, and `preventDefault()`.

Add execution tests proving:

```js
test("dragging the floating toggle moves it without hiding the game", () => {
  const env = runLauncherInHost();
  env.startButton.click();
  const shell = env.hostDocument.getElementById("hatsu-persistent-game-shell");
  const toggle = env.hostDocument.getElementById("hatsu-persistent-game-toggle");
  dispatchPointer(toggle, "pointerdown", { clientX: 900, clientY: 300 });
  dispatchPointer(toggle, "pointermove", { clientX: 700, clientY: 500 });
  dispatchPointer(toggle, "pointerup", { clientX: 700, clientY: 500 });
  assert.equal(shell.hidden, false);
  assert.equal(toggle.style.left, "678px");
  assert.equal(toggle.style.top, "478px");
});

test("drag position is clamped again after viewport resize", () => {
  const env = runLauncherInHost();
  env.startButton.click();
  const toggle = env.hostDocument.getElementById("hatsu-persistent-game-toggle");
  dispatchPointer(toggle, "pointerdown", { clientX: 900, clientY: 300 });
  dispatchPointer(toggle, "pointermove", { clientX: -100, clientY: -100 });
  dispatchPointer(toggle, "pointerup", { clientX: -100, clientY: -100 });
  assert.equal(toggle.style.left, "8px");
  assert.equal(toggle.style.top, "8px");
  env.hostWindow.innerWidth = 320;
  env.hostWindow.innerHeight = 240;
  env.hostWindow.dispatchEvent({ type: "resize" });
  assert.ok(Number.parseFloat(toggle.style.left) <= 268);
  assert.ok(Number.parseFloat(toggle.style.top) <= 188);
});
```

- [ ] **Step 2: Run the focused tests and confirm RED**

Run `node --test tests/persistent-launcher.test.mjs`.

Expected: drag tests fail because pointer gestures do not move or clamp the toggle.

- [ ] **Step 3: Implement pointer gesture state**

Store only in-memory fields equivalent to:

```js
const dragState = {
  pointerId: null,
  startX: 0,
  startY: 0,
  originLeft: 0,
  originTop: 0,
  moved: false
};
const DRAG_THRESHOLD_PX = 6;
const VIEWPORT_MARGIN_PX = 8;
const TOGGLE_SIZE_PX = 44;
```

Bind `pointerdown`, `pointermove`, `pointerup`, and `pointercancel` once per toggle. On a completed gesture, call `controller.toggle()` only when movement never exceeded the threshold. Do not also depend on a browser-generated `click`; suppress the post-drag click path by making pointer completion the sole pointer toggle path. Clamp coordinates to `[margin, viewport - size - margin]`, and re-clamp the current position from one host-window `resize` listener.

- [ ] **Step 4: Run Task 2 verification**

Run:

```powershell
node --test tests/persistent-launcher.test.mjs
node --check dist/hatsu-launcher/message-entry.js
git diff --check
```

Expected: all launcher tests pass; syntax and diff checks exit 0.

- [ ] **Step 5: Commit Task 2**

```powershell
git add tests/persistent-launcher.test.mjs dist/hatsu-launcher/message-entry.js
git commit -m "feat: make game toggle draggable"
```

### Task 3: Migration, Cache Busting, and Regression Verification

**Files:**
- Modify: `tests/persistent-launcher.test.mjs`
- Modify: `dist/hatsu-launcher/message-entry.js`
- Modify: `launcher.html`
- Modify: `README.md`

- [ ] **Step 1: Write failing migration and documentation tests**

Add tests proving that two launcher instances create exactly one toggle, removing a message-floor frame does not remove the toggle, V1/V2 shells reuse the existing iframe, the old exit button is hidden and `aria-hidden`, direct non-host use creates no toggle, `launcher.html` loads `message-entry.js?v=3`, and README describes a draggable floating toggle rather than an in-shell Exit button.

- [ ] **Step 2: Run focused tests and confirm RED**

Run `node --test tests/persistent-launcher.test.mjs`.

Expected: cache version and README assertions fail until Task 3 files are updated; any missing migration behavior also fails.

- [ ] **Step 3: Complete migration and documentation**

When V3 is absent, reuse DOM nodes from V2/V1 controllers through fixed element IDs rather than calling stale controller methods. Store only the V3 controller for new launcher instances. Hide legacy frame and old exit controls. Update `launcher.html` to `message-entry.js?v=3`. Update README to state that the draggable host-level toggle hides/restores the game and preserves the iframe.

- [ ] **Step 4: Run complete verification**

Run:

```powershell
node --test tests/persistent-launcher.test.mjs
node --test tests/*.test.mjs
node --check dist/hatsu-launcher/message-entry.js
node --check app.js
git diff --check
git status --short
```

Expected: launcher tests pass; the full suite has no failures beyond the documented six-test baseline; syntax and diff checks exit 0; `.superpowers/` remains unrelated and untracked.

- [ ] **Step 5: Manual SillyTavern acceptance**

1. Load `launcher.html?v=<new-commit>` from a regex-rendered floor.
2. Start the game and confirm one floating ball appears above the full-screen game.
3. Drag with mouse and touch, then release; confirm the game remains open.
4. Short-tap the ball to hide and restore the same game state.
5. Trigger a shujuku floor refresh; confirm the ball and iframe remain.
6. Resize the viewport; confirm the ball stays on-screen.
7. Confirm repeated floors still produce one shell, iframe, and ball.

- [ ] **Step 6: Commit Task 3**

```powershell
git add tests/persistent-launcher.test.mjs dist/hatsu-launcher/message-entry.js launcher.html README.md
git commit -m "fix: replace launcher exit with draggable toggle"
```

# Persistent SillyTavern Launcher Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace full game rendering inside regex-transformed chat floors with a compact launcher that opens one persistent top-level SillyTavern iframe and hides it without destroying its state.

**Architecture:** Add a browser controller dedicated to message-floor launchers. Each `launcher.html` instance binds its local Start/Resume button to a singleton controller stored on the accessible SillyTavern host window; that controller owns one host-body overlay, one game iframe, and one hide-only Exit button. Keep the existing launcher script and all game/Harness files unchanged.

**Tech Stack:** Vanilla HTML/CSS/JavaScript, SillyTavern/TavernHelper iframe integration, Node.js built-in test runner and `vm`.

---

## File Structure

- Create `dist/hatsu-launcher/message-entry.js`: resolve the host window, install/reuse the singleton overlay controller, and bind one message-floor launcher UI.
- Create `launcher.html`: compact message-floor card and configuration for `message-entry.js`.
- Create `tests/persistent-launcher.test.mjs`: execution-level fake-DOM tests for singleton mounting, hide/resume, floor removal, and non-host fallback.
- Modify `README.md`: document the new `launcher.html` loader snippet and hide-only lifecycle.
- Do not modify `app.js`, `st.html`, `index.html`, Harness state, Prompt builders, or shujuku bridge functions.

### Task 1: Persistent Host Controller

**Files:**
- Create: `tests/persistent-launcher.test.mjs`
- Create: `dist/hatsu-launcher/message-entry.js`

- [ ] **Step 1: Write the failing execution tests**

Create a small fake DOM supporting `createElement`, `appendChild`, `remove`, `getElementById`, attributes, styles, event listeners, and click dispatch. Execute `message-entry.js` with `vm.runInNewContext()` using separate entry and host windows.

Add tests equivalent to:

```js
test("start mounts one persistent game iframe under the host body", () => {
  const env = runLauncherInHost();
  env.startButton.click();
  assert.equal(env.hostDocument.body.children.filter(node => node.id === "hatsu-persistent-game-shell").length, 1);
  assert.equal(env.hostDocument.getElementById("hatsu-persistent-game-frame").src, EXPECTED_FRONTEND_URL);
});

test("repeated launchers reuse the same host overlay and iframe", () => {
  const first = runLauncherInHost();
  first.startButton.click();
  const frame = first.hostDocument.getElementById("hatsu-persistent-game-frame");
  const second = runLauncherInHost({ hostWindow: first.hostWindow });
  second.startButton.click();
  assert.equal(first.hostDocument.getElementById("hatsu-persistent-game-frame"), frame);
  assert.equal(first.hostDocument.body.children.filter(node => node.id === "hatsu-persistent-game-shell").length, 1);
});

test("exit hides the shell and resume preserves the iframe node and src", () => {
  const env = runLauncherInHost();
  env.startButton.click();
  const shell = env.hostDocument.getElementById("hatsu-persistent-game-shell");
  const frame = env.hostDocument.getElementById("hatsu-persistent-game-frame");
  env.hostDocument.getElementById("hatsu-persistent-game-exit").click();
  assert.equal(shell.hidden, true);
  env.startButton.click();
  assert.equal(shell.hidden, false);
  assert.equal(env.hostDocument.getElementById("hatsu-persistent-game-frame"), frame);
  assert.equal(frame.src, EXPECTED_FRONTEND_URL);
});

test("removing a message floor does not remove the host game shell", () => {
  const env = runLauncherInHost();
  env.startButton.click();
  env.entryFrame.remove();
  assert.ok(env.hostDocument.getElementById("hatsu-persistent-game-shell"));
});

test("direct launcher use shows a host warning and creates no local game owner", () => {
  const env = runLauncherWithoutHost();
  assert.match(env.status.textContent, /SillyTavern/);
  env.startButton.click();
  assert.equal(env.entryWindow.__hatsuPersistentLauncherV1, undefined);
  assert.equal(env.entryDocument.getElementById("hatsu-persistent-game-shell"), null);
});
```

- [ ] **Step 2: Run the tests and confirm RED**

Run:

```powershell
node --test tests/persistent-launcher.test.mjs
```

Expected: FAIL because `dist/hatsu-launcher/message-entry.js` does not exist.

- [ ] **Step 3: Implement the minimal controller**

Implement an IIFE with these fixed identities and public behavior:

```js
const CONTROLLER_KEY = "__hatsuPersistentLauncherV1";
const SHELL_ID = "hatsu-persistent-game-shell";
const FRAME_ID = "hatsu-persistent-game-frame";
const EXIT_ID = "hatsu-persistent-game-exit";
const DEFAULT_FRONTEND_URL = "http://127.0.0.1:8000/hatsu-produce-local/st.html";
```

The controller must:

- consider only an accessible `window.parent` or `window.top` different from the entry window as a valid host;
- store itself on `hostWindow[CONTROLLER_KEY]`;
- lazily create the shell and iframe on the first `open()`;
- append the shell directly to `hostDocument.body`;
- assign the iframe `src` only during first creation;
- implement `hide()` using `shell.hidden = true` without removing nodes or clearing `src`;
- implement `getStatus()` returning `not_started`, `visible`, or `hidden`;
- bind the entry button `#hatsu-launcher-start-btn` and status `#hatsu-launcher-status`;
- avoid Prompt, input, save, Harness, lease, or application-state reads/writes.

The host shell is built with DOM APIs, not untrusted `innerHTML`. Its fixed overlay styles include full viewport positioning, a high z-index, an opaque game background, and a top-right Exit button above the iframe.

- [ ] **Step 4: Run the focused tests and confirm GREEN**

Run:

```powershell
node --test tests/persistent-launcher.test.mjs
node --check dist/hatsu-launcher/message-entry.js
git diff --check
```

Expected: all launcher tests pass; syntax and diff checks exit 0.

- [ ] **Step 5: Commit Task 1**

```powershell
git add tests/persistent-launcher.test.mjs dist/hatsu-launcher/message-entry.js
git commit -m "feat: add persistent message launcher controller"
```

### Task 2: Compact Message-Floor Entry Page

**Files:**
- Modify: `tests/persistent-launcher.test.mjs`
- Create: `launcher.html`

- [ ] **Step 1: Add failing launcher page contract tests**

Add assertions that `launcher.html`:

```js
test("launcher page is a compact entry and loads the message controller", () => {
  assert.match(launcherHtml, /id="hatsu-launcher-start-btn"/);
  assert.match(launcherHtml, /id="hatsu-launcher-status"/);
  assert.match(launcherHtml, /dist\/hatsu-launcher\/message-entry\.js/);
  assert.doesNotMatch(launcherHtml, /<iframe/i);
  assert.doesNotMatch(launcherHtml, /position:\s*fixed[\s\S]*inset:\s*0/i);
});

test("launcher page configures the canonical st bridge URL", () => {
  assert.match(launcherHtml, /http:\/\/127\.0\.0\.1:8000\/hatsu-produce-local\/st\.html/);
});
```

- [ ] **Step 2: Run the tests and confirm RED**

Run:

```powershell
node --test tests/persistent-launcher.test.mjs
```

Expected: FAIL because `launcher.html` does not exist.

- [ ] **Step 3: Implement the compact launcher page**

Create a standalone UTF-8 HTML document with:

- a restrained, non-fullscreen card no wider than 520px;
- an `初星学园` heading;
- status element `#hatsu-launcher-status`;
- command button `#hatsu-launcher-start-btn` with initial label `启动游戏`;
- `window.HatsuMessageLauncherConfig.frontendUrl` set to the canonical local `st.html` URL before loading `message-entry.js`;
- no iframe and no application assets inside the message floor.

Use an 8px card radius, responsive width, accessible button focus styling, and no viewport-fixed page layout.

- [ ] **Step 4: Run focused verification**

Run:

```powershell
node --test tests/persistent-launcher.test.mjs
node --check dist/hatsu-launcher/message-entry.js
git diff --check
```

Expected: all focused tests pass and checks exit 0.

- [ ] **Step 5: Commit Task 2**

```powershell
git add launcher.html tests/persistent-launcher.test.mjs
git commit -m "feat: add compact message-floor game launcher"
```

### Task 3: Usage Documentation and Regression Verification

**Files:**
- Modify: `README.md`
- Modify: `tests/persistent-launcher.test.mjs`

- [ ] **Step 1: Add a failing documentation assertion**

Add a test that requires the README to include the canonical regex loader:

```html
<body>
  <script>
    $('body').load('http://127.0.0.1:8000/hatsu-produce-local/launcher.html');
  </script>
</body>
```

The test must also require wording that Exit hides the persistent iframe and does not cancel an in-flight generation.

- [ ] **Step 2: Run the test and confirm RED**

Run:

```powershell
node --test tests/persistent-launcher.test.mjs
```

Expected: FAIL because README does not document `launcher.html`.

- [ ] **Step 3: Update README**

Add a UTF-8 section describing:

- use `launcher.html` in the regex-rendered message instead of loading `st.html` directly;
- Start creates or reveals the one host-level game iframe;
- Exit only hides it and preserves current runtime state;
- shujuku floor refreshes cannot remove the host-level iframe;
- a full SillyTavern browser reload still reloads the runtime and may invoke normal Harness recovery.

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

Expected: launcher tests pass; the complete suite has no failures beyond the documented existing baseline; syntax and diff checks exit 0; `.superpowers/` remains unrelated and untracked.

- [ ] **Step 5: Manual SillyTavern acceptance**

1. Change the regex replacement to load `launcher.html`.
2. Confirm each rendered reply floor contains only the compact entry card.
3. Click Start and confirm the existing `st.html` game opens over SillyTavern.
4. Click Exit and confirm chat is visible while the game iframe remains in the host DOM with the same `src`.
5. Click Start from another floor and confirm the same game screen resumes.
6. Trigger a shujuku table refresh and confirm the game does not reload and Harness Recovery does not appear solely because of floor rebuilding.
7. Confirm a second Start does not create another `#hatsu-persistent-game-frame`.

- [ ] **Step 6: Commit Task 3**

```powershell
git add README.md tests/persistent-launcher.test.mjs
git commit -m "docs: document persistent launcher workflow"
```

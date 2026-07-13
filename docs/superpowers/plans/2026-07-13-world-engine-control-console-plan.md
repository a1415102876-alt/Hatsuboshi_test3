# World Engine Control Console Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move shared secondary API controls into an advanced World Engine console, decouple manual commission regeneration from Director, and make stale Director attempts observable and recoverable.

**Architecture:** Keep the existing secondary API config and owner state machines. Add request-scoped metadata for Director follow-up policy, extend the existing Director reconciliation path to expire aged exact owners through the common reply handler, and render a phone-sized advanced settings view from existing state. No Prompt or persistence schema changes are required.

**Tech Stack:** Vanilla JavaScript, HTML, CSS, Node.js built-in test runner, `vm` execution tests.

---

### Task 1: Expire stale Director owners through the existing failure path

**Files:**
- Modify: `app.js` (`reconcileWorldDirectorAttempt`, Director runtime helpers)
- Modify: `tests/world-director-integration.test.mjs`

- [ ] **Step 1: Write the failing execution test**

Add a test that installs `reconcileWorldDirectorAttempt`, creates a matching Director owner with `acquiredAt` older than `DIRECTOR_MODEL_CHANNEL_TIMEOUT_MS`, and asserts reconciliation invokes:

```js
handleSecondaryAiReply({
  ...owner,
  text: "",
  ok: false,
  error: "timeout"
});
```

The test must also assert a fresh matching owner remains unchanged and a different owner is never released.

- [ ] **Step 2: Verify RED**

Run:

```powershell
node --test --test-name-pattern="stale matching Director owner" tests/world-director-integration.test.mjs
```

Expected: FAIL because reconciliation currently accepts any exact owner regardless of age.

- [ ] **Step 3: Implement minimal stale-owner reconciliation**

In `reconcileWorldDirectorAttempt`, calculate age from `owner.acquiredAt`. When the exact Director owner is at least 210 seconds old, call the existing `handleSecondaryAiReply` timeout entry and return its handled state. Do not directly clear `secondaryChannelOwner` or create another failure state machine.

```js
const ownerAge = Math.max(0, Date.now() - Number(owner?.acquiredAt || 0));
if (exactOwner && ownerAge >= DIRECTOR_MODEL_CHANNEL_TIMEOUT_MS) {
  handleSecondaryAiReply({ ...owner, text: "", ok: false, error: "timeout" });
  return true;
}
```

- [ ] **Step 4: Verify GREEN**

Run:

```powershell
node --test tests/world-director-integration.test.mjs
node --check app.js
git diff --check
```

Expected: Director integration tests pass; syntax and diff checks exit 0.

### Task 2: Decouple manual commission regeneration from Director follow-up

**Files:**
- Modify: `app.js` (`forceSecondaryRegeneration`, `maybeRequestDailyWorldGeneration`, `handleSecondaryAiReply`)
- Modify: `tests/secondary-channel-owner.test.mjs`
- Modify: `tests/world-director-integration.test.mjs`

- [ ] **Step 1: Write failing execution tests**

Add tests for a world owner whose runtime metadata contains:

```js
{ includeSideQuests: true, suppressDirectorFollowup: true }
```

Cover success, API failure, and parse failure. Each case must assert `maybeRequestWorldDirector` is not called. Add a control case with `suppressDirectorFollowup: false` that asserts normal day-generation follow-up remains.

- [ ] **Step 2: Verify RED**

Run:

```powershell
node --test --test-name-pattern="manual commission regeneration suppresses Director" tests/world-director-integration.test.mjs
```

Expected: FAIL because all world completion branches currently call `maybeRequestWorldDirector`.

- [ ] **Step 3: Implement request-scoped follow-up policy**

Pass the option only from `forceSecondaryRegeneration`:

```js
maybeRequestDailyWorldGeneration({ suppressDirectorFollowup: true });
```

Store it in `secondaryChannelMeta` during world owner acquisition. In all three world reply branches, call Director only when the metadata flag is false:

```js
if (!meta.suppressDirectorFollowup) {
  maybeRequestWorldDirector({ reason: "public_world_completed" });
}
```

Do not persist the flag and do not modify the world Prompt.

- [ ] **Step 4: Verify GREEN**

Run:

```powershell
node --test tests/secondary-channel-owner.test.mjs tests/world-director-integration.test.mjs
node --check app.js
git diff --check
```

Expected: all targeted tests pass with normal day-change Director follow-up preserved.

### Task 3: Move secondary API controls into World Engine advanced settings

**Files:**
- Modify: `index.html` (remove commission API panel; add World Engine settings view and gear button)
- Modify: `style.css` (phone settings layout and scroll containment)
- Modify: `app.js` (`bindPhoneWorldEngineEvents`, config rendering/saving selectors, settings navigation)
- Modify: `tests/world-engine-phone-app.test.mjs`
- Modify: `tests/tasks-sandbox.test.mjs`

- [ ] **Step 1: Write failing DOM and execution tests**

Assert the commission overlay no longer contains `sideQuestApiPanel`. Assert the World Engine app contains:

```html
worldEngineSettingsBtn
worldEngineSettingsView
worldEngineApiEnabled
worldEngineApiBaseUrl
worldEngineApiModel
worldEngineApiKey
worldEngineApiSaveBtn
worldEngineApiTestBtn
worldEngineCommissionRegenBtn
```

Execute the settings event binding with fake elements and assert save/test/regenerate handlers are invoked only by their buttons. Assert rendering a stored API key never inserts it into `innerHTML` or diagnostic text.

- [ ] **Step 2: Verify RED**

Run:

```powershell
node --test tests/world-engine-phone-app.test.mjs
```

Expected: FAIL because advanced settings elements and handlers do not exist.

- [ ] **Step 3: Implement the advanced settings view**

Add a gear icon button to the World Engine header. The settings view is a full-height internal view with its own back command and scroll container. Reuse the existing configuration object and save functions; change DOM selectors from commission IDs to World Engine IDs. Remove the old commission API `<details>` block and its event bindings.

Keep the commission overlay source/status summary in the player-facing content. Do not move commission acceptance or completion controls.

- [ ] **Step 4: Verify GREEN and responsive containment**

Run:

```powershell
node --test tests/world-engine-phone-app.test.mjs
node --check app.js
git diff --check
```

Expected: tests pass and settings content remains inside the existing phone scroller at narrow width.

### Task 4: Add redacted runtime diagnostics and explicit stale-attempt recovery

**Files:**
- Modify: `app.js` (secondary debug records, Director reply gate, World Engine runtime/settings renderers, recovery action)
- Modify: `world/director-phone-view.js` if view-model shaping is needed
- Modify: `index.html` (stale recovery button container if not rendered dynamically)
- Modify: `style.css` (diagnostic rows and danger action)
- Modify: `tests/world-director-integration.test.mjs`
- Modify: `tests/world-engine-phone-app.test.mjs`
- Modify: `tests/world-director-phone-view.test.mjs`

- [ ] **Step 1: Write failing diagnostics tests**

Cover:

- Director reply received and accepted.
- Director reply rejected by exact identity gate.
- Timeout, parse failure, commit, and release reasons.
- Only requestId suffixes and scalar metadata are present.
- Prompt, response text, API Key, full requestId, leaseId, and full state are absent.
- Recovery button is visible only when a Director owner/job is at least 210 seconds old.
- Recovery requires `confirm()` and invokes the same timeout reply path.

- [ ] **Step 2: Verify RED**

Run:

```powershell
node --test tests/world-director-integration.test.mjs tests/world-engine-phone-app.test.mjs tests/world-director-phone-view.test.mjs
```

Expected: FAIL because Director gate rejection is currently silent and runtime does not expose owner age or stale recovery.

- [ ] **Step 3: Implement redacted diagnostics**

Record bounded scalar events around the existing lifecycle. Add a helper that returns only:

```js
{
  phase,
  ownerKind,
  ageMs,
  scopeMatches,
  requestSuffix,
  textLength,
  parseOk,
  reason,
  at
}
```

Render these records in the World Engine runtime/advanced view. On stale recovery confirmation, call `handleSecondaryAiReply({ ...owner, text: "", ok: false, error: "timeout" })` and re-render. Normal close, back, and tab actions must not mutate job state.

- [ ] **Step 4: Verify GREEN**

Run:

```powershell
node --test tests/world-director-integration.test.mjs tests/world-engine-phone-app.test.mjs tests/world-director-phone-view.test.mjs
node --check app.js
git diff --check
```

Expected: all targeted tests pass without sensitive diagnostic fields.

### Task 5: Full regression and real SillyTavern acceptance

**Files:**
- No production changes unless verification exposes a regression.

- [ ] **Step 1: Run focused integration suite**

```powershell
node --test tests/shujuku-harness-bridge.test.mjs tests/secondary-channel-owner.test.mjs tests/world-director-integration.test.mjs tests/world-engine-phone-app.test.mjs tests/world-director-phone-view.test.mjs
```

Expected: all focused tests pass.

- [ ] **Step 2: Run full suite and compare baseline**

```powershell
$files = Get-ChildItem -Path tests -Filter *.test.mjs | ForEach-Object { $_.FullName }
node --test $files
```

Expected: no failures beyond the six existing baseline failures documented before this plan.

- [ ] **Step 3: Perform SillyTavern manual checks**

Verify:

1. Existing API configuration appears in World Engine advanced settings without re-entry.
2. Commission overlay has no API form and remains scrollable.
3. Manual commission regeneration completes without starting Director.
4. Manual Director starts only from its own command.
5. A stale Director attempt can be ended after confirmation and becomes retryable.
6. Runtime diagnostics distinguish send, reply, reject, timeout, parse failure, and commit without showing secrets or narrative text.

- [ ] **Step 4: Review final diff**

```powershell
git diff --check
git status --short
```

Expected: only intended application, test, style, and documentation files are changed; unrelated user files remain untouched.

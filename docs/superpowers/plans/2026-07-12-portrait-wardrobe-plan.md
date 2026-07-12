# Portrait Wardrobe Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add per-chat custom producer/idol standees backed by SillyTavern user files, with an apartment wardrobe UI, deterministic upload retry, global library indexing, and builtin fallback.

**Architecture:** Add one browser-global pure module for appearance normalization, validation metadata, library merging, and portrait resolution. Keep `app.js` responsible for UI and the in-memory upload state machine; keep `st.html` responsible for authenticated SillyTavern file API effects and exact `operationId + saveScope` replies. Reuse existing `saveState()` and `hostSaveSequence` for equipped state without changing Prompt, Harness, or AI ownership.

**Tech Stack:** Vanilla JavaScript, HTML/CSS, SillyTavern `/api/files/upload` and `/api/files/verify`, Node.js built-in test runner, VM-based execution tests.

---

## File Map

- Create `appearance/portrait-wardrobe.js`: pure data normalization, character keys, builtin/user resolution, file metadata limits, library merge helpers.
- Create `tests/portrait-wardrobe.test.mjs`: pure module, app controller, DOM wiring, bridge execution, and regression tests.
- Modify `index.html`: load the appearance module and add apartment wardrobe entry/overlay.
- Modify `style.css`: wardrobe visuals, responsive layout, preview transform, upload/status states.
- Modify `app.js`: state shape, UI controller, host protocol routing, image fallback, VN/apartment integration.
- Modify `st.html`: load the appearance module in ST mode and execute authenticated file operations.
- Create `assets/scenes/Wardrobe_Fitting_Room.png`: copy the user-provided fitting-room image unchanged.
- Modify `docs/superpowers/specs/2026-07-12-portrait-wardrobe-design.md` only if implementation reveals an actual contract correction; do not broaden scope.

## Task 1: Pure Appearance Module

**Files:**
- Create: `appearance/portrait-wardrobe.js`
- Create: `tests/portrait-wardrobe.test.mjs`
- Modify: `index.html:1479-1492`
- Modify: `st.html:550-585`

- [ ] **Step 1: Write failing pure-module tests**

Create tests that load the module in `vm` and assert the public API:

```js
function loadPortraitApi() {
  const sandbox = { globalThis: {} };
  sandbox.globalThis = sandbox;
  vm.runInNewContext(
    readFileSync(new URL("../appearance/portrait-wardrobe.js", import.meta.url), "utf8"),
    sandbox,
    { filename: "appearance/portrait-wardrobe.js" }
  );
  return sandbox.HatsuPortraits;
}

test("appearance normalization preserves valid equipped refs and drops invalid keys", () => {
  const api = loadPortraitApi();
  const result = api.normalizeAppearanceState({
    schemaVersion: 1,
    equipped: {
      producer: { assetId: "asset-1", characterKey: "producer", url: "/user/files/a.png", name: "私服", source: "user", transform: { scale: 3, offsetX: -300, offsetY: 25 } },
      bad: { url: "javascript:alert(1)" }
    }
  });
  assert.equal(result.equipped.producer.transform.scale, 2);
  assert.equal(result.equipped.producer.transform.offsetX, -100);
  assert.equal(result.equipped.bad, undefined);
});

test("portrait resolution uses chat equipment then builtin fallback", () => {
  const api = loadPortraitApi();
  const builtins = { producer: "./assets/novel-standees/producer.png", "idol:藤田琴音": "./assets/novel-standees/kotone.png" };
  const appearance = api.normalizeAppearanceState({ equipped: { producer: { assetId: "asset-1", characterKey: "producer", url: "/user/files/a.png", name: "私服", source: "user", transform: { scale: 1.1, offsetX: 4, offsetY: -2 } } } });
  assert.equal(api.resolvePortrait("producer", appearance, builtins).url, "/user/files/a.png");
  assert.equal(api.resolvePortrait("idol:藤田琴音", appearance, builtins).source, "builtin");
});

test("library merge increments revision without removing concurrent assets", () => {
  const api = loadPortraitApi();
  const latest = { schemaVersion: 1, libraryRevision: 4, updatedAt: 10, assets: { old: { assetId: "old" } } };
  const merged = api.mergeLibraryAsset(latest, { assetId: "new", operationId: "op-1", characterKey: "producer", url: "/user/files/new.png" }, 20);
  assert.equal(merged.libraryRevision, 5);
  assert.deepEqual(Object.keys(merged.assets).sort(), ["new", "old"]);
});
```

- [ ] **Step 2: Run RED tests**

Run: `node --test tests/portrait-wardrobe.test.mjs`
Expected: FAIL because `appearance/portrait-wardrobe.js` does not exist.

- [ ] **Step 3: Implement the pure module**

Expose a frozen `global.HatsuPortraits` API from an IIFE. Include these constants and functions:

```js
const DEFAULT_TRANSFORM = Object.freeze({ scale: 1, offsetX: 0, offsetY: 0 });
const LIBRARY_URL = "/user/files/hatsu-produce-portrait-library.json";
const MAX_FILE_BYTES = 20 * 1024 * 1024;
const MAX_PIXELS = 40_000_000;
const MAX_EDGE = 8192;
const ALLOWED_MIME_TYPES = new Set(["image/png", "image/webp", "image/jpeg"]);

function characterKeyForSpeaker(speaker, producerName, canonicalize, hasIdol) {}
function normalizeTransform(value) {}
function normalizeAppearanceState(value) {}
function normalizeLibrary(value) {}
function validateDecodedImageMeta({ type, size, width, height }) {}
function mergeLibraryAsset(library, asset, now = Date.now()) {}
function archiveLibraryAsset(library, assetId, now = Date.now()) {}
function resolvePortrait(characterKey, appearance, builtins, invalidUrls = new Set()) {}
function createOperationId(now = Date.now(), random = Math.random()) {}
function createAssetId(operationId) { return `portrait:${operationId}`; }
function createUploadFileName(operationId, mimeType) {}
```

Only accept user URLs matching `^/user/files/[^?#]+$`. Clamp scale to `0.5..2`, offsets to `-100..100`, and return new objects without mutating inputs.

- [ ] **Step 4: Load the module in both launch modes**

Add `<script src="./appearance/portrait-wardrobe.js"></script>` immediately before `app.js` in `index.html`. Add `appearance/portrait-wardrobe.js` to `WORLD_SCRIPTS` in `st.html` so the same API exists when the page is loaded through the ST bridge.

- [ ] **Step 5: Run Task 1 verification**

Run:

```powershell
node --test tests/portrait-wardrobe.test.mjs
node --check appearance/portrait-wardrobe.js
node --check app.js
git diff --check
```

Expected: all PASS, no syntax or whitespace errors.

- [ ] **Step 6: Commit Task 1**

```powershell
git add appearance/portrait-wardrobe.js tests/portrait-wardrobe.test.mjs index.html st.html
git commit -m "feat: add portrait wardrobe data model"
```

## Task 2: Authenticated Host File Protocol

**Files:**
- Modify: `st.html:616-745`
- Modify: `st.html:1260-1310`
- Test: `tests/portrait-wardrobe.test.mjs`

- [ ] **Step 1: Add failing execution tests for host operations**

Extract and execute `normalizePortraitFileOperation`, `executePortraitFileOperation`, and `postPortraitFileOperationResult` in a VM. Assert:

```js
test("host portrait upload verifies scope and posts exact operation reply", async () => {
  const calls = [];
  const result = await helpers.execute({
    source: "hatsuboshi-produce",
    type: "portraitFileOperation",
    operationId: "op-1",
    saveScope: "scope-a",
    action: "upload",
    payload: { name: "hatsu-portrait-op-1.png", data: "YWJj" }
  }, {
    getCurrentScope: () => "scope-a",
    requestHeaders: () => ({ "Content-Type": "application/json", "X-CSRF-Token": "token" }),
    fetch: async (url, options) => { calls.push({ url, options }); return { ok: true, json: async () => ({ path: "/user/files/hatsu-portrait-op-1.png" }) }; }
  });
  assert.equal(result.ok, true);
  assert.equal(calls[0].url, "/api/files/upload");
});

test("host portrait operation rejects a changed save scope before fetch", async () => {
  let fetched = false;
  const result = await helpers.execute(validRequest, { getCurrentScope: () => "scope-b", requestHeaders: () => ({}), fetch: async () => { fetched = true; } });
  assert.equal(result.error, "save_scope_changed");
  assert.equal(fetched, false);
});
```

Also cover `verify`, cache-busted `readLibrary`, atomic `writeLibrary` through `/api/files/upload`, malformed request, and a scope change after fetch but before reply.

- [ ] **Step 2: Run RED bridge tests**

Run: `node --test tests/portrait-wardrobe.test.mjs`
Expected: FAIL because the bridge helpers do not exist.

- [ ] **Step 3: Implement host helpers**

Add:

```js
function normalizePortraitFileOperation(data) {}
function getHostRequestHeaders() {
  return getContext()?.getRequestHeaders?.() || { "Content-Type": "application/json" };
}
async function executePortraitFileOperation(data, deps = {}) {}
function postPortraitFileOperationResult(request, result) {
  postToFrame({
    source: "hatsuboshi-produce-host",
    type: "portraitFileOperationResult",
    operationId: request.operationId,
    saveScope: request.saveScope,
    action: request.action,
    ...result
  });
}
```

`executePortraitFileOperation` must check scope before and after I/O. `readLibrary` uses `fetch(`${LIBRARY_URL}?t=${Date.now()}`, { cache: "no-store" })` and treats 404 as an empty library. `writeLibrary` base64-encodes UTF-8 JSON and uploads the fixed filename `hatsu-produce-portrait-library.json`.

- [ ] **Step 4: Wire the independent message branch**

In `messageHandler`, handle `portraitFileOperation` without `queuePromptTask()`:

```js
if (data.type === "portraitFileOperation") {
  const request = normalizePortraitFileOperation(data);
  const result = request.ok
    ? await executePortraitFileOperation(request)
    : { ok: false, error: request.error };
  postPortraitFileOperationResult(request, result);
}
```

The branch must not touch `pendingRequestId`, `activeHostGenerationAttempts`, or primary model functions.

- [ ] **Step 5: Run Task 2 verification and commit**

Run:

```powershell
node --test tests/portrait-wardrobe.test.mjs tests/shujuku-harness-bridge.test.mjs tests/primary-model-ownership.test.mjs
node --check app.js
git diff --check
```

Commit:

```powershell
git add st.html tests/portrait-wardrobe.test.mjs
git commit -m "feat: add portrait file host bridge"
```

## Task 3: Frontend Upload State Machine

**Files:**
- Modify: `app.js:2320-2430`
- Modify: `app.js:2765-3140`
- Modify: `app.js:12360-12400`
- Modify: `app.js:18970-19060`
- Test: `tests/portrait-wardrobe.test.mjs`

- [ ] **Step 1: Add failing state-machine tests**

Use extracted functions with injected dependencies to execute these cases:

- File selection validates decoded metadata and never posts a host message.
- `beginPortraitCommit()` freezes scope, character, transform, name, operationId, and file.
- Host reply advances only when both operationId and saveScope match.
- A reply from the old chat does not call `saveState`, update equipment, or change controls.
- Retry begins with verify and reuses operationId and file name.
- Successful write requires a read-back containing the assetId before equipment changes.
- Timeout retry reuses the same operationId and ignores a late result from the timed-out action after the pipeline has advanced.
- Closing a preview revokes the Object URL and does not post or save.
- Non-host mode can preview but cannot commit and never creates an operation owner.

- [ ] **Step 2: Run RED controller tests**

Run: `node --test tests/portrait-wardrobe.test.mjs`
Expected: FAIL because controller functions are absent.

- [ ] **Step 3: Add state defaults and normalization**

Add to `baseState`:

```js
appearance: { schemaVersion: 1, equipped: {} },
```

In `ensureStateShape()` call:

```js
state.appearance = globalThis.HatsuPortraits.normalizeAppearanceState(state.appearance);
```

- [ ] **Step 4: Implement the in-memory controller**

Add one `portraitWardrobeState` object containing `open`, `selectedCharacterKey`, `library`, `pendingOperation`, `selectedAssetId`, `status`, and `invalidUrls`. Implement:

```js
function requestPortraitHostOperation(operation, action, payload) {}
function selectPortraitPreviewFile(file) {}
function beginPortraitCommit() {}
function readPortraitFileAsBase64(file) {}
function handlePortraitHostResult(payload) {}
function retryPortraitCommit() {}
function closePortraitWardrobe() {}
function equipPortraitReference(asset, transform) {}
```

Use a single operation pipeline: verify image URL, encode the frozen `File` only when upload is required, upload if absent, read library, write merged library, read library again, then equip. `readPortraitFileAsBase64()` must remove the `data:*;base64,` prefix before posting. Use a 15-second timer keyed by `operationId + action`; timeout sets status to retryable but does not synthesize a host reply or mutate equipment.

- [ ] **Step 5: Route the reply before AI routing**

In `routeHostAiPayload()` handle `portraitFileOperationResult` immediately after debug/character payloads. Do not let it reach `shouldSkipCommittedReply()` or `applyAiReply()`.

- [ ] **Step 6: Run Task 3 verification and commit**

Run:

```powershell
node --test tests/portrait-wardrobe.test.mjs tests/harness-phase1.test.mjs tests/primary-model-entry-gates.test.mjs
node --check app.js
git diff --check
```

Commit:

```powershell
git add app.js tests/portrait-wardrobe.test.mjs
git commit -m "feat: add portrait upload controller"
```

## Task 4: Apartment Wardrobe UI and Background

**Files:**
- Modify: `index.html:344-382`
- Modify: `index.html:440-525`
- Modify: `style.css:5216-5600`
- Modify: `app.js:9349-9410`
- Modify: `app.js:18775-18820`
- Create: `assets/scenes/Wardrobe_Fitting_Room.png`
- Test: `tests/portrait-wardrobe.test.mjs`

- [ ] **Step 1: Copy the approved background unchanged**

Copy `C:\Users\86139\AppData\Local\Temp\codex-clipboard-e7f2cf29-0152-4d5e-bcd9-80ea17928a52.png` to `assets/scenes/Wardrobe_Fitting_Room.png`. Verify SHA-256 equality with `Get-FileHash`.

- [ ] **Step 2: Add failing DOM and scope tests**

Assert exact IDs exist for the apartment entry and overlay controls, the approved background path appears in CSS, the module script loads before `app.js`, producer is always returned by `getWardrobeCharacterOptions()`, and sandbox idols come only from `state.sandbox.producedIdols` plus the active `state.idol`.

- [ ] **Step 3: Add apartment entry and overlay markup**

Add `apartmentWardrobeBtn` to the apartment hotspots. Add one `portraitWardrobeOverlay` with:

- `portraitWardrobeCloseBtn`
- character tab list `portraitWardrobeCharacters`
- stage `portraitWardrobeStage` and image `portraitWardrobePreview`
- outfit list `portraitWardrobeAssets`
- hidden file input `portraitWardrobeFileInput`
- name input and three range inputs
- `portraitWardrobeResetBtn`, `portraitWardrobeRestoreBtn`, `portraitWardrobeArchiveBtn`, `portraitWardrobeApplyBtn`
- status element with `aria-live="polite"`

Do not nest `.event-panel` cards inside other cards.

- [ ] **Step 4: Add responsive wardrobe styles**

Use `Wardrobe_Fitting_Room.png` with `background-size: cover`, desktop position `center 48%`, and mobile position `49% center`. Keep the preview area stable at a minimum 455 px desktop and 340 px mobile. Apply transform through CSS variables:

```css
.portrait-wardrobe-preview {
  transform: translate(calc(-50% + var(--portrait-x)), var(--portrait-y)) scale(var(--portrait-scale));
  transform-origin: center bottom;
}
```

At `max-width: 700px`, stack preview and controls. At 320 px, all buttons wrap with no horizontal overflow.

- [ ] **Step 5: Implement UI rendering and events**

Add:

```js
function getWardrobeCharacterOptions() {}
function openPortraitWardrobe() {}
function renderPortraitWardrobe() {}
function setPortraitWardrobeCharacter(characterKey) {}
function restoreBuiltinPortrait() {}
function archiveSelectedPortrait() {}
```

Opening reads the global library through the host. Producer is always first; idols are canonicalized and deduplicated. If an equipped user asset is missing from the loaded index, merge its saved lightweight metadata and write the repaired index before showing it as reusable. Uploading controls are disabled while a remote operation is active, while close remains available with confirmation.

`archiveSelectedPortrait()` must read the latest index, set only the selected asset's `archived` flag through `archiveLibraryAsset()`, write it, and require a read-back with `archived: true`. It must not delete the remote image and must not alter equipment in other chats.

- [ ] **Step 6: Run Task 4 verification and commit**

Run:

```powershell
node --test tests/portrait-wardrobe.test.mjs tests/free-mode.test.mjs
node --check app.js
git diff --check
```

Commit:

```powershell
git add assets/scenes/Wardrobe_Fitting_Room.png index.html style.css app.js tests/portrait-wardrobe.test.mjs
git commit -m "feat: add apartment portrait wardrobe"
```

## Task 5: VN and Apartment Portrait Resolution

**Files:**
- Modify: `app.js:8810-8840`
- Modify: `app.js:9349-9385`
- Modify: `app.js:15355-15410`
- Modify: `style.css:4546-4565`
- Modify: `style.css:5513-5595`
- Test: `tests/portrait-wardrobe.test.mjs`

- [ ] **Step 1: Add failing integration tests**

Assert:

- `resolvePortraitForSpeaker()` maps producer aliases and canonical idol names.
- VN rendering and apartment rendering both call the unified resolver.
- Transform CSS variables are applied to each target image.
- Image error calls `handlePortraitImageError()` and switches once to the builtin URL.
- Error fallback does not call `saveState()` or change library data.
- Existing SNS, phone, map, invite list, and broadcast avatar renderers do not call the resolver.

- [ ] **Step 2: Run RED integration tests**

Run: `node --test tests/portrait-wardrobe.test.mjs`
Expected: FAIL because unified integration is absent.

- [ ] **Step 3: Implement unified resolution and fallback**

Add:

```js
function getBuiltinPortraitMap() {}
function resolvePortraitForSpeaker(speaker) {}
function applyResolvedPortraitToImage(img, resolved) {}
function handlePortraitImageError(img, speaker) {}
```

`applyResolvedPortraitToImage` sets `src`, `--portrait-scale`, `--portrait-x`, and `--portrait-y`. It records speaker and fallback URL in dataset fields. `handlePortraitImageError` adds only the failed user URL to the in-memory invalid set and applies builtin once.

- [ ] **Step 4: Replace only the two approved render sites**

- In `renderProducerApartmentStage()`, replace direct `resolveIdolStandeeSrc(companion)` assignment.
- In the VN slide render branch, replace the producer/idol source switch with `resolvePortraitForSpeaker(slide.speaker)`.
- Preserve all existing visibility, transition, theme-color, and dialogue behavior.

- [ ] **Step 5: Run Task 5 verification and commit**

Run:

```powershell
node --test tests/portrait-wardrobe.test.mjs tests/vn-flow.test.mjs tests/free-mode.test.mjs tests/phone-chat.test.mjs
node --check app.js
git diff --check
```

Commit:

```powershell
git add app.js style.css tests/portrait-wardrobe.test.mjs
git commit -m "feat: apply equipped portraits to vn scenes"
```

## Task 6: Full Verification and Real ST Acceptance

**Files:**
- Modify: `docs/superpowers/specs/2026-07-12-portrait-wardrobe-design.md` only for verified contract corrections
- Test: all `tests/*.test.mjs`

- [ ] **Step 1: Run complete automated verification**

Run:

```powershell
node --test tests/*.test.mjs
node --check app.js
node --check appearance/portrait-wardrobe.js
git diff --check
git status --short
```

Record the pass/fail totals and distinguish any pre-existing baseline failure from new failures.

- [ ] **Step 2: Run browser responsive verification**

Start the local frontend from the SillyTavern-served URL. Verify desktop and `390x844` mobile viewports:

- wardrobe background is visible and correctly cropped;
- producer and idol tabs switch without layout shift;
- 320 px width has no horizontal overflow;
- sliders update the preview without changing the outer layout;
- file selection does not upload before Apply;
- console has no errors.

- [ ] **Step 3: Run real SillyTavern acceptance**

Use the current ST user and a test chat:

1. Upload a transparent PNG and equip it.
2. Refresh and verify VN/apartment persistence.
3. Switch chats and equip a different portrait.
4. Return to the first chat and verify isolation.
5. Rename/remove the uploaded file temporarily and verify builtin fallback.
6. Interrupt an upload, retry, and verify no duplicate deterministic filename.
7. Start upload, switch chat, and verify stale result rejection.
8. Open the same chat on mobile and verify `/user/files/...` rendering.

- [ ] **Step 4: Final diff review**

Confirm the diff contains no Prompt text changes, no settlement changes, no Harness ownership changes, no ST core files, and no avatar migrations outside VN/apartment.

- [ ] **Step 5: Commit any final verification-only correction**

If no correction is needed, do not create an empty commit. Otherwise stage only the corrected files and use:

```powershell
git commit -m "fix: complete portrait wardrobe integration"
```

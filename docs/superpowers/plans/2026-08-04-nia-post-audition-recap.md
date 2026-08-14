# N.I.A Post-Audition Recap Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a persisted two-request VN recap after the first N.I.A audition, with three AI-generated producer responses, one free-input response, and no duplicate reward application.

**Architecture:** Extend the existing audition core with a normalized `postAudition` sub-state and explicit transition functions. Extend the existing audition API module with separate tagged opening and resolution contracts. Keep orchestration in `app.js`, reusing the current VN choice overlay and primary-model lease routing while keeping the four audition segments and fixed rewards unchanged.

**Tech Stack:** Browser JavaScript, Node.js `node:test`, existing SillyTavern host bridge, existing VN overlay and choice controls.

---

### Task 1: Add the persisted recap state machine

**Files:**
- Modify: `nia-audition-core.js`
- Test: `tests/nia-audition-recap-core.test.mjs`

- [x] **Step 1: Write failing normalization and transition tests**

Create tests that require `normalizePostAudition`, `beginPostAuditionOpening`, `applyPostAuditionOpening`, `selectPostAuditionResponse`, `applyPostAuditionResolution`, `completePostAudition`, and recap-aware interruption recovery. Assert that old saves receive `status: "idle"`, opening requires a settled audition with `progressionApplied`, exactly three options are stored, response source is limited to `generated_option` or `free_input`, and completion is idempotent.

```js
assert.equal(core.normalizeAuditionRuntime({}).postAudition.status, "idle");

const opening = core.beginPostAuditionOpening(settledAndRewarded, {
  requestId: "open-1"
});
assert.equal(opening.runtime.postAudition.status, "generating_opening");

const applied = core.applyPostAuditionOpening(opening.runtime, {
  story: "<narration>后台。</narration>",
  options: ["认可她", "指出短板", "回应她的逞强"]
});
assert.equal(applied.runtime.postAudition.status, "awaiting_choice");
```

- [x] **Step 2: Run the core test and verify RED**

Run:

```powershell
node --test tests/nia-audition-recap-core.test.mjs
```

Expected: FAIL because the recap exports and `postAudition` state do not exist.

- [x] **Step 3: Implement the minimal core state machine**

Add a fixed recap status list and normalizer:

```js
const POST_AUDITION_STATUSES = Object.freeze([
  "idle",
  "generating_opening",
  "awaiting_choice",
  "generating_resolution",
  "playing_resolution",
  "retryable_failed",
  "completed"
]);

function normalizePostAudition(raw) {
  const source = object(raw);
  return {
    status: POST_AUDITION_STATUSES.includes(source.status) ? source.status : "idle",
    openingStory: text(source.openingStory, 8000),
    options: Array.isArray(source.options)
      ? source.options.slice(0, 3).map((item) => text(item, 240)).filter(Boolean)
      : [],
    selectedResponse: text(source.selectedResponse, 500),
    selectedResponseSource: ["generated_option", "free_input"].includes(source.selectedResponseSource)
      ? source.selectedResponseSource
      : "",
    resolutionStory: text(source.resolutionStory, 8000),
    recapSummary: text(source.recapSummary, 1000),
    activeRequest: source.activeRequest ? { ...object(source.activeRequest) } : null,
    retryPhase: ["opening", "resolution"].includes(source.retryPhase) ? source.retryPhase : "",
    lastError: text(source.lastError, 500),
    updatedAt: Math.max(0, Number(source.updatedAt) || 0)
  };
}
```

Store it in `normalizeAuditionRuntime`, implement guarded transitions for opening, selection, resolution, completion, and recovery, and export the functions. Recovery must map interrupted `generating_opening` and `generating_resolution` to `retryable_failed` while preserving already stored content and selected response.

- [x] **Step 4: Run the core tests and verify GREEN**

Run:

```powershell
node --test tests/nia-audition-recap-core.test.mjs tests/nia-audition-core.test.mjs
```

Expected: PASS.

### Task 2: Add opening and resolution API contracts

**Files:**
- Modify: `nia-audition-api.js`
- Test: `tests/nia-audition-recap-api.test.mjs`

- [x] **Step 1: Write failing prompt and parser tests**

Require four new exports:

```js
buildNiaPostAuditionOpeningPrompt(context, runtime)
parseNiaPostAuditionOpeningPayload(source, expected)
buildNiaPostAuditionResolutionPrompt(context, runtime)
parseNiaPostAuditionResolutionPayload(source, expected)
```

Opening tests must accept only the last valid `<NIA_AUDITION_RECAP_OPENING>` JSON block with matching `auditionId`, non-empty VN story, and exactly three non-empty options. Resolution tests must accept only `<NIA_AUDITION_RECAP_RESOLUTION>` containing matching `auditionId`, non-empty VN story, and `recapSummary`. Legacy or leaked planning text outside the tags must be ignored.

- [x] **Step 2: Run the API test and verify RED**

Run:

```powershell
node --test tests/nia-audition-recap-api.test.mjs
```

Expected: FAIL because the prompt builders and parsers are missing.

- [x] **Step 3: Implement strict tagged contracts**

The opening prompt must include the frozen context, final result, prior four segment summaries, backstage waiting-area location, and these fixed constraints:

```text
Generate the idol's post-audition opening and stop while waiting for the producer response.
Return exactly three semantically distinct producer responses: affirmation, calm review, relationship-specific response.
Do not output rewards, rankings, new incidents, new work, or a fourth option.
```

The opening JSON shape is:

```json
{
  "schemaVersion": 1,
  "auditionId": "nia-first-audition-id",
  "story": "<narration>...</narration><dialogue char=\"偶像\">...</dialogue>",
  "options": ["...", "...", "..."]
}
```

The resolution prompt must include the exact frozen `selectedResponse` and its source, require complete closure, and forbid another choice round. The resolution JSON shape is:

```json
{
  "schemaVersion": 1,
  "auditionId": "nia-first-audition-id",
  "story": "<dialogue char=\"制作人\">...</dialogue><narration>...</narration>",
  "recapSummary": "第一轮赛后复盘的客观摘要"
}
```

Parsers must ignore `rank`, `score`, `fanGain`, `statGains`, or other attempted settlement fields rather than applying them.

- [x] **Step 4: Run API tests and verify GREEN**

Run:

```powershell
node --test tests/nia-audition-recap-api.test.mjs tests/nia-audition-api.test.mjs
```

Expected: PASS.

### Task 3: Connect rewards, recap requests, choices, and completion

**Files:**
- Modify: `app.js`
- Test: `tests/nia-audition-recap-flow.test.mjs`
- Test: `tests/nia-audition-flow.test.mjs`

- [x] **Step 1: Write failing static flow tests**

Assert the app contains these behaviors:

```js
confirmNiaAuditionResult(); // applies rewards, preserves session, starts recap opening
requestNiaPostAuditionOpening();
handleNiaPostAuditionChoice(index);
handleNiaPostAuditionCustomChoice(text);
requestNiaPostAuditionResolution();
completeNiaPostAuditionAfterPlayback();
```

Require the result confirmation path to set `progressionApplied: true` before requesting the recap. Require the main completion display to check both `audition.progressionApplied` and `audition.postAudition.status === "completed"`. Require request routing to keep owner kind `nia_audition` and use the current primary-model lease identity.

- [x] **Step 2: Run flow tests and verify RED**

Run:

```powershell
node --test tests/nia-audition-recap-flow.test.mjs tests/nia-audition-flow.test.mjs
```

Expected: FAIL because the post-audition flow functions are missing and result confirmation still returns directly to the N.I.A view.

- [x] **Step 3: Start recap after one-time reward application**

Change `confirmNiaAuditionResult()` so it:

1. Applies fans and capped Vo/Da/Vi once.
2. Updates the runtime to `progressionApplied: true`.
3. Keeps `niaAuditionSession` alive.
4. Persists the updated runtime.
5. Calls `requestNiaPostAuditionOpening()` instead of clearing the session and returning to the N.I.A view.

The request function must acquire the primary channel, call `beginPostAuditionOpening`, persist `activeRequest`, set `pendingActionContext.actionContext.phase` to `post_audition_opening`, and send the opening prompt.

- [x] **Step 4: Parse and play the opening, then display three choices plus free input**

Extend `handleNiaAuditionAiReply()` to branch on the recap phase. On a valid opening payload, apply it through the core, persist it, set `state.pendingOptionTexts` to the three generated options, and play `openingStory` in the VN overlay.

When `handleVnSlidesEnd()` sees `postAudition.status === "awaiting_choice"`, call `showVnChoicesOverlay()`. Update `showVnChoicesOverlay()` so this phase accepts three generated options and always appends the existing custom-input button. Route preset clicks to `handleNiaPostAuditionChoice(index)` and custom submission to `handleNiaPostAuditionCustomChoice(text)`.

- [x] **Step 5: Freeze the player response and generate the resolution**

Both selection handlers must call the core selection transition with:

```js
{
  response: selectedText,
  source: "generated_option" // or "free_input"
}
```

Reject cleaned empty custom text. Close the choice overlay, acquire a new primary-model lease, call `beginPostAuditionResolution`, persist the selected response and request identity, and send the resolution prompt.

On a valid resolution payload, apply it through the core, persist it, and play `resolutionStory` with `pendingActionContext.actionContext.phase = "post_audition_resolution"`.

- [x] **Step 6: Complete the recap at the final VN slide**

When the resolution VN reaches its last slide, call `completePostAudition`. Then clear request and choice state, hide the ranking HUD and event overlay, release `niaAuditionSession`, show the N.I.A view, save, and render.

Update resume behavior:

- `generating_opening` or `generating_resolution`: recover to the matching retry phase.
- `awaiting_choice`: replay or restore the saved opening and choices without a new API request.
- `playing_resolution`: replay the saved resolution.
- `completed`: return to N.I.A without reopening the audition.

Update the N.I.A action panel so `progressionApplied` without completed recap shows a resume-recap action instead of “第一轮完成”.

- [x] **Step 7: Run flow tests and verify GREEN**

Run:

```powershell
node --test tests/nia-audition-recap-flow.test.mjs tests/nia-audition-flow.test.mjs
```

Expected: PASS.

### Task 4: Verify regression safety

**Files:**
- Verify: `app.js`
- Verify: `nia-audition-core.js`
- Verify: `nia-audition-api.js`
- Verify: all `tests/nia-*.test.mjs`

- [x] **Step 1: Run all N.I.A tests**

```powershell
$niaTests = Get-ChildItem tests -Filter 'nia-*.test.mjs' | ForEach-Object FullName
node --test $niaTests
```

Expected: all tests pass with zero failures.

- [x] **Step 2: Run syntax and patch checks**

```powershell
node --check app.js
node --check nia-audition-core.js
node --check nia-audition-api.js
git diff --check
```

Expected: all commands exit with code 0.

- [x] **Step 3: Inspect the final scoped diff**

```powershell
git diff -- nia-audition-core.js nia-audition-api.js app.js tests/nia-audition-recap-core.test.mjs tests/nia-audition-recap-api.test.mjs tests/nia-audition-recap-flow.test.mjs tests/nia-audition-flow.test.mjs
```

Confirm that the diff does not change the frozen `5 -> 4 -> 2 -> 1` ranking path, fixed `+10000` fan reward, stat reward formula, or N.I.A training multiplier.

# Harness + shujuku Bridge Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Harness-aware opening quiet path and a real shujuku same-layer generation path without changing deterministic settlement, Prompt wording, Recovery semantics, or metadata envelope v2.

**Architecture:** Keep `app.js` as the frontend authority and `st.html` as the only host transport adapter. Each host generation attempt is identified by `requestId + channelLeaseId + saveScope`; opening uses `generateQuietPrompt()` without chat floors, while ordinary narrative generation commits one hidden user floor, triggers native SillyTavern generation, verifies `qrf_plot*` on the exact floor, and returns the native assistant floor. The old metadata mirror is not imported.

**Tech Stack:** Vanilla JavaScript, SillyTavern `postMessage`, TavernHelper, shujuku event hooks, Node.js `node:test`, `node:vm`.

---

## File Map

- Modify: `app.js`
  - generation-mode selection;
  - opening ownership gate;
  - structured host dispatch options;
  - attempt-aware regeneration cache contract.
- Modify: `st.html`
  - host generation envelope normalization;
  - attempt identity and cache;
  - opening quiet route;
  - same-layer hidden-floor route;
  - qrf and assistant verification;
  - failure compensation and exact-lease replies.
- Create: `tests/shujuku-harness-bridge.test.mjs`
  - executable VM tests for envelope identity, opening quiet, same-layer preparation, qrf matching, assistant selection, and compensation.
- Modify: `tests/primary-model-ownership.test.mjs`
  - exact lease propagation across both generation modes.
- Modify: `tests/primary-model-entry-gates.test.mjs`
  - opening busy rejection and pre-side-effect acquire.
- Modify: `tests/st-loader-bridge.test.mjs`
  - retain existing bridge regressions and add small source-contract assertions only where execution fixtures cannot cover SillyTavern globals.
- Modify: `tests/harness-recovery.test.mjs`
  - Recovery mode and new-attempt identity assertions.
- Modify: `tests/vn-flow.test.mjs`
  - opening regeneration keeps cached generation mode.
- Create: `docs/shujuku-harness-manual-acceptance.md`
  - real SillyTavern acceptance matrix and evidence fields.

## Baseline

Before Task 1:

```powershell
node --check app.js
node --test tests/primary-model-entry-gates.test.mjs tests/primary-model-ownership.test.mjs tests/vn-flow.test.mjs
$files = Get-ChildItem -LiteralPath 'tests' -Filter '*.test.mjs' | Sort-Object Name
node --test $files.FullName
git diff --check
```

Expected baseline:

- focused ownership/VN suite: 56 passing, 0 failing;
- full suite: 313 tests, 307 passing, 6 known failures;
- known failures remain the zero-cost interaction, producer gender, responsive viewport, opening-floor hide gate, summary-round `advanceDay`, and Day 21 First Live tests.

---

### Task 1: Executable Host Attempt Fixture And Identity

**Files:**
- Create: `tests/shujuku-harness-bridge.test.mjs`
- Modify: `st.html:790-840`

- [ ] **Step 1: Write RED tests for normalized envelopes and exact attempt keys**

Add a brace-aware `readFunction()` and VM fixture that loads the wished-for helpers:

```js
test("host generation envelope requires request lease scope and explicit mode", () => {
  const normalized = normalizeHostGenerationEnvelope({
    requestId: "req-1",
    channelLeaseId: "lease-1",
    saveScope: "char-1-chat-a",
    ownerKind: "ordinary_action",
    generationMode: "shujuku_same_layer",
    prompt: "current prompt"
  });
  assert.equal(normalized.ok, true);
  assert.equal(normalized.attemptKey, "req-1::lease-1::char-1-chat-a");
});

test("host generation envelope rejects missing lease or unknown mode", () => {
  assert.equal(normalizeHostGenerationEnvelope({
    requestId: "req-1",
    saveScope: "scope-a",
    generationMode: "shujuku_same_layer",
    prompt: "x"
  }).ok, false);
  assert.equal(normalizeHostGenerationEnvelope({
    requestId: "req-1",
    channelLeaseId: "lease-1",
    saveScope: "scope-a",
    generationMode: "raw",
    prompt: "x"
  }).ok, false);
});
```

- [ ] **Step 2: Run RED**

```powershell
node --test tests/shujuku-harness-bridge.test.mjs
```

Expected: fail because `normalizeHostGenerationEnvelope()` and `createHostGenerationAttemptKey()` do not exist.

- [ ] **Step 3: Implement minimal pure identity helpers in `st.html`**

Add near `requestPromptCache`:

```js
const HOST_GENERATION_MODES = new Set(['opening_quiet', 'shujuku_same_layer']);

function createHostGenerationAttemptKey(requestId, channelLeaseId, saveScope) {
  return [requestId, channelLeaseId, saveScope].map(value => String(value || '')).join('::');
}

function normalizeHostGenerationEnvelope(data) {
  const requestId = String(data?.requestId || '');
  const channelLeaseId = String(data?.channelLeaseId || '');
  const saveScope = String(data?.saveScope || '');
  const generationMode = String(data?.generationMode || '');
  const prompt = String(data?.prompt || '');
  if (!requestId || !channelLeaseId || !saveScope || !prompt.trim() || !HOST_GENERATION_MODES.has(generationMode)) {
    return { ok: false, reason: 'invalid_generation_envelope' };
  }
  return {
    ok: true,
    requestId,
    channelLeaseId,
    saveScope,
    ownerKind: String(data?.ownerKind || 'legacy_main'),
    generationMode,
    prompt,
    turnId: String(data?.turnId || ''),
    attemptKey: createHostGenerationAttemptKey(requestId, channelLeaseId, saveScope)
  };
}
```

- [ ] **Step 4: Run GREEN and static checks**

```powershell
node --test tests/shujuku-harness-bridge.test.mjs
node --check app.js
git diff --check
```

Expected: new tests pass; syntax and diff checks pass.

- [ ] **Step 5: Commit Task 1**

```powershell
git add st.html tests/shujuku-harness-bridge.test.mjs
git commit -m "test: define shujuku host attempt identity"
```

---

### Task 2: Structured Frontend Dispatch And Attempt-Aware Cache

**Files:**
- Modify: `app.js:12408-12539`
- Modify: `st.html:620-660, 790-840`
- Modify: `tests/primary-model-ownership.test.mjs`
- Modify: `tests/shujuku-harness-bridge.test.mjs`

- [ ] **Step 1: Write RED tests for the full dispatch envelope**

Add assertions that `requestHostPromptSend()` posts:

```js
{
  source: "hatsuboshi-produce",
  type: "sendPrompt",
  requestId: "req-1",
  channelLeaseId: "lease-1",
  saveScope: "scope-a",
  ownerKind: "ordinary_action",
  generationMode: "shujuku_same_layer",
  turnId: "turn-1",
  prompt: "prompt"
}
```

Add an executable cache test:

```js
test("host cache stores mode scope and exact lease per attempt", () => {
  const entry = createHostPromptCacheEntry(envelope);
  assert.deepEqual(entry, {
    prompt: "prompt",
    generationMode: "shujuku_same_layer",
    saveScope: "scope-a",
    ownerKind: "ordinary_action",
    turnId: "turn-1",
    requestId: "req-1",
    channelLeaseId: "lease-1",
    attemptKey: "req-1::lease-1::scope-a"
  });
});
```

- [ ] **Step 2: Run RED**

```powershell
node --test tests/primary-model-ownership.test.mjs tests/shujuku-harness-bridge.test.mjs
```

Expected: fail because dispatch lacks `saveScope`, `generationMode`, `ownerKind`, and structured cache entries.

- [ ] **Step 3: Implement minimal frontend options**

Normalize `requestHostPromptSend()` options:

```js
const generationMode = options.generationMode || "shujuku_same_layer";
const ownerKind = options.ownerKind || owner.ownerKind || "legacy_main";
const turnId = String(options.turnId || owner.turnId || "");
```

Include these fields in `postMessage`, with `saveScope: owner.saveScope || activeHostSaveScope`.

Replace the host cache value with:

```js
function createHostPromptCacheEntry(envelope) {
  return {
    prompt: envelope.prompt,
    generationMode: envelope.generationMode,
    saveScope: envelope.saveScope,
    ownerKind: envelope.ownerKind,
    turnId: envelope.turnId,
    requestId: envelope.requestId,
    channelLeaseId: envelope.channelLeaseId,
    attemptKey: envelope.attemptKey
  };
}
```

- [ ] **Step 4: Route `sendPrompt` through normalization without changing behavior**

In `messageHandler`:

```js
const envelope = normalizeHostGenerationEnvelope(data);
if (!envelope.ok) {
  postPrimaryAiError(data.requestId, data.channelLeaseId, new Error(envelope.reason));
  return;
}
queuePromptTask(() => runHostGenerationAttempt(envelope));
```

For this task, `runHostGenerationAttempt()` delegates both modes to the existing `runTransactionalPrompt()` so behavior stays unchanged until Task 3.

- [ ] **Step 5: Run GREEN and focused regressions**

```powershell
node --test tests/primary-model-ownership.test.mjs tests/shujuku-harness-bridge.test.mjs tests/vn-flow.test.mjs
node --check app.js
git diff --check
```

- [ ] **Step 6: Commit Task 2**

```powershell
git add app.js st.html tests/primary-model-ownership.test.mjs tests/shujuku-harness-bridge.test.mjs
git commit -m "feat: add structured host generation envelopes"
```

---

### Task 3: Formal Opening Ownership And Quiet Generation

**Files:**
- Modify: `app.js:7789-7845, 12408-12495`
- Modify: `st.html:620-660, 1500-1530, 1689-1730`
- Modify: `tests/primary-model-entry-gates.test.mjs`
- Modify: `tests/shujuku-harness-bridge.test.mjs`
- Modify: `tests/vn-flow.test.mjs`

- [ ] **Step 1: Write RED frontend execution tests**

Execute the opening entry and assert that an occupied owner preserves pre-generation state:

```js
test("opening occupied rejection happens before pending story and host dispatch writes", () => {
  const before = clone(context.state);
  context.acquireOk = false;
  context.startOpeningStory();
  assert.deepEqual(clone(context.state), before);
  assert.equal(calls.saveState, 0);
  assert.equal(calls.openEventOverlay, 0);
  assert.equal(calls.requestHostPromptSend.length, 0);
});
```

Add success assertions for `ownerKind: "opening"` and `generationMode: "opening_quiet"`.

- [ ] **Step 2: Write RED host quiet-path tests**

Use a VM context with spies:

```js
test("opening quiet uses preset context without floors message events or trigger", async () => {
  const result = await runOpeningQuietAttempt(envelope, deps);
  assert.equal(calls.generateQuietPrompt, 1);
  assert.equal(calls.createSilentChatMessage, 0);
  assert.equal(calls.emitMessageSent, 0);
  assert.equal(calls.triggerSlash, 0);
  assert.equal(result.channelLeaseId, "lease-opening");
});
```

- [ ] **Step 3: Run RED**

```powershell
node --test tests/primary-model-entry-gates.test.mjs tests/shujuku-harness-bridge.test.mjs tests/vn-flow.test.mjs
```

- [ ] **Step 4: Add opening owner kind and pre-side-effect acquire**

Build the Prompt first, then acquire:

```js
const prompt = buildOpeningPrompt();
const requestId = createRequestId();
const dispatch = acquirePrimaryEntryDispatch(requestId, "opening");
if (!dispatch.ok) return false;
```

Only after acquire, perform the existing pending state, save, and UI writes. Send with:

```js
{
  channelLeaseId: dispatch.owner.channelLeaseId,
  ownerKind: "opening",
  generationMode: "opening_quiet"
}
```

Add `opening` to `describePrimaryModelOwner()` and generic failure handling.

- [ ] **Step 5: Implement `runOpeningQuietAttempt()`**

Call:

```js
context.generateQuietPrompt({
  quietPrompt: envelope.prompt,
  quietToLoud: false,
  skipWIAN: false,
  removeReasoning: true
});
```

Return through `postCommittedReply()` with the envelope lease and `messageId: null`. On missing API, empty text, or incompatibility, call `postPrimaryAiError()` with the exact lease. Do not mutate chat.

- [ ] **Step 6: Run GREEN and verify no Prompt changes**

```powershell
node --test tests/primary-model-entry-gates.test.mjs tests/shujuku-harness-bridge.test.mjs tests/primary-model-ownership.test.mjs tests/vn-flow.test.mjs
node --check app.js
git diff --check
git diff -- app.js | Select-String -Pattern "buildOpeningPrompt|好感度0担当开场"
```

Expected: tests pass and the Prompt builder body is unchanged.

- [ ] **Step 7: Commit Task 3**

```powershell
git add app.js st.html tests/primary-model-entry-gates.test.mjs tests/primary-model-ownership.test.mjs tests/shujuku-harness-bridge.test.mjs tests/vn-flow.test.mjs
git commit -m "feat: add harness-aware quiet opening generation"
```

---

### Task 4: Same-Layer Attempt Records And Exact Hidden Floors

**Files:**
- Modify: `st.html:790-840, 1418-1500`
- Modify: `tests/shujuku-harness-bridge.test.mjs`
- Modify: `tests/st-loader-bridge.test.mjs`

- [ ] **Step 1: Write RED tests for host attempt state and floor stamps**

```js
test("same-layer preparation commits one exact hidden user floor", async () => {
  const attempt = await prepareSameLayerAttempt(envelope, deps);
  assert.equal(attempt.status, "user_floor_committed");
  assert.equal(attempt.userMessageId, 4);
  assert.equal(chat[4].is_user, true);
  assert.equal(chat[4].is_hidden, true);
  assert.equal(chat[4].extra.hatsuRequestId, "req-1");
  assert.equal(chat[4].extra.hatsuAttemptKey, "req-1::lease-1::scope-a");
  assert.equal(chat[4].extra.hatsuSaveScope, "scope-a");
  assert.equal(chat[4].extra._acu_true_same_layer, true);
});
```

Add a test that a second call with the same attempt key does not create another floor.

- [ ] **Step 2: Run RED**

```powershell
node --test tests/shujuku-harness-bridge.test.mjs
```

- [ ] **Step 3: Implement attempt records and exact floor stamping**

Add:

```js
const activeHostGenerationAttempts = new Map();

function createHostGenerationAttempt(envelope) {
  return {
    ...envelope,
    status: 'prepared',
    userMessageId: null,
    assistantMessageId: null,
    startedAt: Date.now()
  };
}
```

Extend `stampTransactionalExtra()` to accept an attempt and store the attempt key and scope. Do not write the full lease to visible fields or debug output.

- [ ] **Step 4: Implement `prepareSameLayerAttempt()`**

It must create and persist exactly one hidden user floor before any generation call. Reuse the existing `createSilentChatMessage()` mechanics and set `is_hidden: true` only for this adapter.

- [ ] **Step 5: Run GREEN and existing bridge regressions**

```powershell
node --test tests/shujuku-harness-bridge.test.mjs tests/st-loader-bridge.test.mjs
node --check app.js
git diff --check
```

The two known `st-loader-bridge` baseline failures may remain; no new failure is allowed.

- [ ] **Step 6: Commit Task 4**

```powershell
git add st.html tests/shujuku-harness-bridge.test.mjs tests/st-loader-bridge.test.mjs
git commit -m "feat: prepare exact shujuku bridge floors"
```

---

### Task 5: Native shujuku Trigger, qrf Confirmation, And Assistant Commit

**Files:**
- Modify: `st.html:1530-1730`
- Modify: `tests/shujuku-harness-bridge.test.mjs`
- Modify: `tests/st-loader-bridge.test.mjs`

- [ ] **Step 1: Write RED tests for event order**

```js
test("same-layer generation persists user then emits MESSAGE_SENT then triggers native generation", async () => {
  await runShujukuSameLayerAttempt(envelope, deps);
  assert.deepEqual(calls.order.slice(0, 4), [
    "persist-user",
    "message-sent",
    "wait-qrf",
    "trigger"
  ]);
});
```

Add tests that qrf on an older floor is ignored and qrf on the exact floor is accepted.

- [ ] **Step 2: Write RED tests for native assistant selection**

```js
test("same-layer commit returns the native assistant without creating a duplicate", async () => {
  const result = await runShujukuSameLayerAttempt(envelope, deps);
  assert.equal(result.assistantMessageId, 5);
  assert.equal(calls.createAssistantFloor, 0);
  assert.equal(calls.postCommittedReply, 1);
  assert.equal(calls.reply.channelLeaseId, "lease-1");
});
```

- [ ] **Step 3: Run RED**

```powershell
node --test tests/shujuku-harness-bridge.test.mjs
```

- [ ] **Step 4: Implement host event and trigger helpers**

Add `emitHostMessageSent(messageId)` using `eventSource.emit(MESSAGE_SENT, messageId, 'extension')` with the existing two-argument fallback.

Add `triggerNativeGeneration(tavernHelper)` preferring `tavernHelper.triggerSlash('/trigger await=true')`, then `context.executeSlashCommandsWithOptions('/trigger await=true')`.

- [ ] **Step 5: Implement exact qrf observation**

`getExactBridgePlanningSnapshot(attempt)` reads only `chat[attempt.userMessageId]`, verifies the attempt key and scope, then returns non-empty `qrf_plot`, `qrf_plot_preset`, and `qrf_plot_tasks` fields.

- [ ] **Step 6: Implement native assistant observation**

Search only after the exact user floor and after `startedAt`. Reject user messages, hidden planning floors, empty placeholders, planning/recall text, and incompatible Prompt replies. Stamp the accepted assistant with the attempt key after it is found; do not create another assistant message.

- [ ] **Step 7: Run GREEN and focused bridge suite**

```powershell
node --test tests/shujuku-harness-bridge.test.mjs tests/st-loader-bridge.test.mjs tests/primary-model-ownership.test.mjs
node --check app.js
git diff --check
```

- [ ] **Step 8: Commit Task 5**

```powershell
git add st.html tests/shujuku-harness-bridge.test.mjs tests/st-loader-bridge.test.mjs tests/primary-model-ownership.test.mjs
git commit -m "feat: run native shujuku same-layer generation"
```

---

### Task 6: Failure Compensation, Scope Changes, And Late Replies

**Files:**
- Modify: `st.html:1418-1530, 1589-1730, 2039-2050`
- Modify: `app.js:5710-5760, 12540-12575`
- Modify: `tests/shujuku-harness-bridge.test.mjs`
- Modify: `tests/primary-model-ownership.test.mjs`

- [ ] **Step 1: Write RED compensation tests**

Cover each state:

```js
test("failure before planning removes the exact unmodified hidden user floor", async () => {
  const result = await compensateHostGenerationAttempt(attempt, "trigger_failed", deps);
  assert.equal(result.status, "compensated");
  assert.equal(chat.some(message => message?.extra?.hatsuAttemptKey === attempt.attemptKey), false);
});

test("failure after qrf preserves but abandons the planning floor", async () => {
  chat[4].qrf_plot = "planning";
  const result = await compensateHostGenerationAttempt(attempt, "assistant_timeout", deps);
  assert.equal(chat[4].is_hidden, true);
  assert.equal(chat[4].extra.hatsuBridgeAbandoned, true);
  assert.equal(chat[4].qrf_plot, "planning");
});
```

- [ ] **Step 2: Write RED stale scope and lease tests**

Assert that a completed host attempt is not posted when current scope differs, and an old lease cannot clear a newer attempt with the same requestId.

- [ ] **Step 3: Run RED**

```powershell
node --test tests/shujuku-harness-bridge.test.mjs tests/primary-model-ownership.test.mjs
```

- [ ] **Step 4: Implement compensation by attempt status**

Before qrf, remove only the exact unmodified bridge floor and persist. After qrf, keep the floor hidden, add `hatsuBridgeAbandoned: true`, and exclude it from exact planning and assistant searches.

- [ ] **Step 5: Add scope and exact-attempt commit checks**

Before `postCommittedReply()`:

```js
if (getCurrentContextInfo().saveScope !== attempt.saveScope) {
  await compensateHostGenerationAttempt(attempt, 'save_scope_changed', deps);
  return;
}
if (activeHostGenerationAttempts.get(attempt.attemptKey) !== attempt) return;
```

Always return `primaryAiError` with the original requestId and lease on terminal host failure.

- [ ] **Step 6: Run GREEN and syntax checks**

```powershell
node --test tests/shujuku-harness-bridge.test.mjs tests/primary-model-ownership.test.mjs
node --check app.js
git diff --check
```

- [ ] **Step 7: Commit Task 6**

```powershell
git add app.js st.html tests/shujuku-harness-bridge.test.mjs tests/primary-model-ownership.test.mjs
git commit -m "fix: compensate incomplete shujuku host attempts"
```

---

### Task 7: Recovery And Regeneration Attempt Identity

**Files:**
- Modify: `app.js:12408-12539, 14937-14995`
- Modify: `st.html:630-655, 790-840`
- Modify: `tests/harness-recovery.test.mjs`
- Modify: `tests/primary-model-entry-gates.test.mjs`
- Modify: `tests/vn-flow.test.mjs`
- Modify: `tests/shujuku-harness-bridge.test.mjs`

- [ ] **Step 1: Write RED Recovery mode test**

Extend the existing Recovery execution fixture:

```js
assert.equal(sent[0].options.generationMode, "shujuku_same_layer");
assert.equal(sent[0].options.turnId, "turn-1");
assert.equal(sent[0].requestId, "request-new");
```

- [ ] **Step 2: Write RED regeneration cache test**

Use one requestId with two leases. Assert that regeneration loads the cached Prompt and mode but creates a new attempt key, and an old completion cannot clear the new attempt.

- [ ] **Step 3: Run RED**

```powershell
node --test tests/harness-recovery.test.mjs tests/primary-model-entry-gates.test.mjs tests/vn-flow.test.mjs tests/shujuku-harness-bridge.test.mjs
```

- [ ] **Step 4: Pass explicit same-layer mode from Recovery**

Do not rebuild the Prompt. Add only:

```js
generationMode: "shujuku_same_layer"
```

to the existing `requestHostPromptSend(activeTurn.generationPrompt, newRequestId, ...)` options.

- [ ] **Step 5: Make regeneration cache selection lease-aware**

Cache by the latest accepted attempt record for the business requestId. When a new lease is acquired, create a new cache entry carrying the old Prompt/mode/scope but the new lease. Do not use host regenerate cache without an exact current lease.

- [ ] **Step 6: Preserve choice exclusions**

Verify `isChoicePromptMode()` and `isChoiceResolutionMode()` remain outside the new same-layer regeneration path. Do not change choice settlement or continuation.

- [ ] **Step 7: Run GREEN and combined regressions**

```powershell
node --test tests/harness-recovery.test.mjs tests/primary-model-entry-gates.test.mjs tests/primary-model-ownership.test.mjs tests/vn-flow.test.mjs tests/shujuku-harness-bridge.test.mjs
node --check app.js
git diff --check
```

- [ ] **Step 8: Commit Task 7**

```powershell
git add app.js st.html tests/harness-recovery.test.mjs tests/primary-model-entry-gates.test.mjs tests/vn-flow.test.mjs tests/shujuku-harness-bridge.test.mjs
git commit -m "feat: preserve harness recovery across shujuku attempts"
```

---

### Task 8: Debug Evidence, Manual Matrix, And Rollback Switch

**Files:**
- Modify: `app.js:5674-5685, 16290-16335`
- Modify: `st.html:790-840`
- Modify: `tests/shujuku-harness-bridge.test.mjs`
- Create: `docs/shujuku-harness-manual-acceptance.md`

- [ ] **Step 1: Write RED debug-redaction test**

Assert the snapshot contains only mode, status, age, scope, owner kind, request suffix, and last failure/compensation reason. Assert it excludes Prompt,正文, input, full requestId, full lease, qrf content, and state.

- [ ] **Step 2: Run RED**

```powershell
node --test tests/shujuku-harness-bridge.test.mjs
```

- [ ] **Step 3: Implement redacted host-attempt diagnostics**

Expose diagnostics to the existing VN debug surface through a host message or existing bridge debug payload. Do not persist it in `state.harness.trace`.

- [ ] **Step 4: Add a runtime-only adapter switch**

Use a non-persisted constant or loader configuration:

```js
const HATSU_HOST_GENERATION_ADAPTER = 'shujuku_v1';
```

Supported values are `current_transactional` and `shujuku_v1`. The switch selects only the host adapter and never changes saved state.

- [ ] **Step 5: Write the manual acceptance document**

Include exact fields for:

- SillyTavern version;
- TavernHelper version;
- shujuku commit/tag;
- preset name/version;
- opening request evidence;
- hidden user floor ID;
- qrf keys and floor ID without qrf text;
- assistant floor ID;
- requestId suffix and lease suffix;
- Recovery/regeneration/chat-switch outcomes;
- rollback-switch result.

- [ ] **Step 6: Run the complete automated acceptance suite**

```powershell
node --check app.js
node --test tests/shujuku-harness-bridge.test.mjs tests/primary-model-entry-gates.test.mjs tests/primary-model-ownership.test.mjs tests/harness-recovery.test.mjs tests/st-loader-bridge.test.mjs tests/vn-flow.test.mjs
$files = Get-ChildItem -LiteralPath 'tests' -Filter '*.test.mjs' | Sort-Object Name
node --test $files.FullName
git diff --check
```

Expected: all new bridge tests pass; no new full-suite failures beyond the recorded baseline.

- [ ] **Step 7: Run real SillyTavern acceptance**

Use `docs/shujuku-harness-manual-acceptance.md`. If BasicAuth blocks access, record the matrix as not executed and do not claim real-host compatibility.

- [ ] **Step 8: Commit Task 8**

```powershell
git add app.js st.html tests/shujuku-harness-bridge.test.mjs docs/shujuku-harness-manual-acceptance.md
git commit -m "docs: add shujuku harness acceptance workflow"
```

---

## Completion Gate

Before merge or push:

1. Verify every new production helper was introduced after a witnessed RED test.
2. Verify no changes to Prompt builder text, deterministic settlement, time progression, or metadata envelope v2.
3. Verify `world/hatsu-db-bridge.js` was not added.
4. Verify opening uses no host chat floors and ordinary generation uses exactly one hidden user plus one native assistant floor.
5. Verify exact lease propagation on success, failure, timeout, stale reply, regeneration, and Recovery.
6. Report full-suite results and the exact pre-existing failure baseline.
7. Report real SillyTavern acceptance separately from automated tests.


# Director Job Mismatch Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent same-chat host snapshots from invalidating an in-flight Director job, stop automatic retry loops after an identity mismatch, and make secondary-channel diagnostics truthful.

**Architecture:** Keep the existing Director owner, validator, and persistence contracts. Add an early same-scope path to `applyHostCharacter()`, change only the mismatch branch in `handleWorldDirectorReply()`, and render existing debug records according to their `phase` without adding new persistent data.

**Tech Stack:** Vanilla JavaScript, SillyTavern `postMessage` bridge, Node.js built-in `node:test`, `node:vm` execution tests.

---

## File Map

- Modify `app.js`: same-scope host sync guard, Director mismatch terminal handling, debug phase rendering.
- Create `tests/host-character-sync.test.mjs`: execute `applyHostCharacter()` for same-scope and scope-change cases.
- Modify `tests/world-director-integration.test.mjs`: verify mismatch releases without automatic resend and leaves a recoverable job.
- Modify `tests/secondary-channel-owner.test.mjs`: verify debug events are not mislabeled as replies.

No changes to `st.html`, `world/director-api.js`, Director Prompt/validator, Pressure rules, Chronicle, deterministic settlement, or save ordering.

### Task 1: Preserve In-Flight State On Same-Scope Character Sync

**Files:**
- Create: `tests/host-character-sync.test.mjs`
- Modify: `app.js:13872-13923`

- [ ] **Step 1: Write execution-level RED tests**

Create a test helper that extracts `applyHostCharacter()` from `app.js` using the brace-aware `readFunction()` pattern already used in `tests/world-director-integration.test.mjs`.

The first test must execute the function with `hostStateReady === true`, `activeHostSaveScope === "scope-a"`, a generating Director job, and live primary/secondary owners. Use throwing stubs for `switchStorageScope()`, `resolveHostState()`, `ensureStateShape()`, both release functions, `saveState()`, and `render()` so any old-path side effect fails the test. Assert the same state object remains installed and only `boundCharacter` changes:

```js
test("same-scope character refresh preserves live state and model owners", () => {
  const liveState = {
    marker: "live",
    boundCharacter: null,
    freeMode: { world: { director: { activeJob: {
      jobId: "director-job",
      requestId: "director-request",
      saveScope: "scope-a",
      status: "generating"
    } } } }
  };
  const fail = (name) => () => assert.fail(`${name} must not run for same-scope refresh`);
  const sandbox = {
    state: liveState,
    hostStateReady: true,
    activeHostSaveScope: "scope-a",
    pendingAiRequestId: "primary-request",
    getPrimaryModelChannelOwner: () => ({ requestId: "primary-request", saveScope: "scope-a" }),
    getSecondaryModelChannelOwner: () => ({ jobId: "director-job", requestId: "director-request", saveScope: "scope-a" }),
    switchStorageScope: fail("switchStorageScope"),
    resolveHostState: fail("resolveHostState"),
    ensureStateShape: fail("ensureStateShape"),
    releasePrimaryModelChannel: fail("releasePrimaryModelChannel"),
    releaseSecondaryModelChannel: fail("releaseSecondaryModelChannel"),
    saveState: fail("saveState"),
    render: fail("render")
  };
  const apply = vm.runInNewContext(`(${readFunction(appSource, "applyHostCharacter")})`, sandbox);
  apply({ name: "初星学园", avatar: "avatar.png" }, "scope-a", { marker: "stale" }, true);
  assert.equal(sandbox.state.marker, "live");
  assert.equal(sandbox.state.freeMode.world.director.activeJob.requestId, "director-request");
  assert.deepEqual(normalize(sandbox.state.boundCharacter), { name: "初星学园", avatar: "avatar.png" });
});
```

The second test must execute the non-fast path with `activeHostSaveScope === "scope-old"`, incoming `scope-new`, remote state marker `remote`, and old-scope owners. Stub the existing dependencies and assert both old owners are released, the remote state is installed, and `ensureStateShape({ recoverDirectorAttempt: true })` is called.

- [ ] **Step 2: Run RED tests**

Run:

```powershell
node --test tests/host-character-sync.test.mjs
```

Expected: the same-scope test fails because current `applyHostCharacter()` calls `resolveHostState()` and replaces `state`.

- [ ] **Step 3: Add the minimal same-scope early return**

Immediately after the character-name guard in `applyHostCharacter()`, normalize the incoming scope once and preserve the current in-memory state when the host is already ready for that same nonempty scope:

```js
const incomingScope = String(saveScope || "");
const isSameActiveScope = hostStateReady
  && Boolean(activeHostSaveScope)
  && incomingScope === activeHostSaveScope;
if (isSameActiveScope) {
  state.boundCharacter = {
    name: String(character.name),
    avatar: character.avatar ? String(character.avatar) : ""
  };
  return;
}
```

Replace later `String(saveScope || "")` identity comparisons and the `activeHostSaveScope` assignment with `incomingScope`. Do not move or weaken the existing different-scope owner release behavior.

- [ ] **Step 4: Verify Task 1**

Run:

```powershell
node --test tests/host-character-sync.test.mjs tests/chat-metadata-save.test.mjs tests/harness-recovery.test.mjs
node --check app.js
git diff --check
git diff -- app.js tests/host-character-sync.test.mjs
```

Expected: all selected tests pass; the diff contains only the guard, normalized scope reuse, and the new execution tests.

- [ ] **Step 5: Commit Task 1**

```powershell
git add app.js tests/host-character-sync.test.mjs
git commit -m "fix: preserve live state on same-scope host sync"
```

### Task 2: Stop Director Job-Mismatch Retry Loops

**Files:**
- Modify: `tests/world-director-integration.test.mjs:130-145, 290-315`
- Modify: `app.js:4260-4278`

- [ ] **Step 1: Replace the old automatic-follow-up expectation with RED tests**

Append `"reconcileWorldDirectorAttempt"` to `orchestrationFunctions` so existing slice-based setup remains stable.

Replace `an old director reply releases its owner and starts the newer prepared day job` with an execution test named `an old director reply releases its owner without automatically starting the newer job`. After preparing a newer job, clear `sandbox.events`, deliver the old reply, and assert:

```js
assert.equal(sandbox.handleWorldDirectorReply({ ...oldOwner, ok: true, text: "old" }, oldOwner), false);
assert.equal(sandbox.secondaryChannelOwner, null);
assert.equal(sandbox.state.freeMode.world.director.activeJob.dayKey, "day-3");
assert.equal(sandbox.state.freeMode.world.director.activeJob.status, "prepared");
assert.equal(sandbox.events.some((event) => event.startsWith("send:")), false);
```

Add a second test where the current `activeJob` has the same jobId/saveScope but a cleared requestId while still marked `generating`. Deliver the old owner reply and assert exact release, `retryable_failed`, reason `director_job_mismatch`, no Direction/Pressure mutation, and no new send.

- [ ] **Step 2: Run RED tests**

Run:

```powershell
node --test --test-name-pattern="job mismatch|old director reply" tests/world-director-integration.test.mjs
```

Expected: the existing branch calls `resumeWorldDirectorAfterRelease()` and starts another Director request.

- [ ] **Step 3: Implement non-retrying mismatch handling**

In the identity-mismatch branch of `handleWorldDirectorReply()`, keep the exact release but replace the immediate resume call with reconciliation:

```js
releaseSecondaryModelChannel(owner.jobId, owner.requestId, owner.saveScope, "director_job_mismatch");
reconcileWorldDirectorAttempt("director_job_mismatch");
renderSecondaryApiDebug();
renderWorldEnginePhoneApp();
return false;
```

Do not parse or commit the stale reply. Do not call `maybeRequestWorldDirector()` or `resumeWorldDirectorAfterRelease()` from this branch.

- [ ] **Step 4: Verify Task 2**

Run:

```powershell
node --test tests/world-director-integration.test.mjs tests/secondary-channel-owner.test.mjs
node --check app.js
git diff --check
git diff -- app.js tests/world-director-integration.test.mjs
```

Expected: Director integration and owner tests pass with no automatic resend after mismatch.

- [ ] **Step 5: Commit Task 2**

```powershell
git add app.js tests/world-director-integration.test.mjs
git commit -m "fix: stop director mismatch retry loops"
```

### Task 3: Render Secondary Debug Events By Phase

**Files:**
- Modify: `tests/secondary-channel-owner.test.mjs:45-75`
- Modify: `app.js:4695-4707`

- [ ] **Step 1: Write the RED diagnostic rendering test**

Build a sandbox with `secondaryApiDebug.events` containing one event for each phase. Execute `renderSecondaryApiDebug()` and assert the log includes phase-specific labels and only the reply line contains reply validity:

```js
assert.match(log.textContent, /取得通道 director/);
assert.match(log.textContent, /发送 director/);
assert.match(log.textContent, /释放 director_job_mismatch/);
assert.match(log.textContent, /拒绝 secondary_owner_mismatch/);
assert.match(log.textContent, /回复 director｜有效回复/);
assert.doesNotMatch(log.textContent, /取得通道 director[^\n]*无有效回复/);
```

Also assert the rendered log contains only request suffixes and not a full requestId.

- [ ] **Step 2: Run the RED test**

Run:

```powershell
node --test --test-name-pattern="renders acquire release reject and reply" tests/secondary-channel-owner.test.mjs
```

Expected: current rendering labels every non-send phase as a reply.

- [ ] **Step 3: Add phase-specific rendering**

Before the existing reply formatter in `renderSecondaryApiDebug()`, add branches for `acquire`, `release`, and `reject`:

```js
if (event.phase === "acquire") {
  return `[${time}] ◆ 取得通道 ${event.kind}｜请求 …${event.requestSuffix || "?"}`;
}
if (event.phase === "release") {
  return `[${time}] ■ 释放通道｜${event.error || "completed"}｜请求 …${event.requestSuffix || "?"}`;
}
if (event.phase === "reject") {
  return `[${time}] × 拒绝 ${event.kind}｜${event.error || "unknown"}｜请求 …${event.requestSuffix || "?"}`;
}
```

Keep the current `send` and `reply` fields. Do not add Prompt text, response text, full requestId, lease, owner object, or state to debug records.

- [ ] **Step 4: Verify Task 3**

Run:

```powershell
node --test tests/secondary-channel-owner.test.mjs
node --check app.js
git diff --check
git diff -- app.js tests/secondary-channel-owner.test.mjs
```

Expected: all owner/debug tests pass and acquire is no longer described as a response.

- [ ] **Step 5: Commit Task 3**

```powershell
git add app.js tests/secondary-channel-owner.test.mjs
git commit -m "fix: clarify secondary channel diagnostics"
```

### Task 4: Combined Verification And SillyTavern Acceptance

**Files:**
- No production changes expected.

- [ ] **Step 1: Run focused regression**

```powershell
node --test tests/host-character-sync.test.mjs tests/world-director-integration.test.mjs tests/secondary-channel-owner.test.mjs tests/world-director-api.test.mjs tests/chat-metadata-save.test.mjs tests/harness-recovery.test.mjs tests/shujuku-harness-bridge.test.mjs
node --check app.js
git diff --check
```

Expected: all focused tests pass.

- [ ] **Step 2: Run the full suite**

```powershell
$files = Get-ChildItem -LiteralPath tests -Filter '*.test.mjs' | Sort-Object Name | ForEach-Object { $_.FullName }
node --test $files
```

Expected baseline before these changes: 488 tests, 482 pass, 6 known failures. The new test count will increase; the only failures must remain:

1. `selected idols are all required in a zero-cost interaction`
2. `producer profile includes gender in state, form, save flow, and prompts`
3. `st.html loader uses a responsive mobile viewport instead of a fixed desktop canvas`
4. `st.html pauses floor hiding when the opening floor is not mounted`
5. `advanceDay only advances schedule from summary round`
6. `day 21 summary round advances into First Live schedule`

- [ ] **Step 3: Perform real SillyTavern acceptance**

1. Refresh the embedded frontend once so the existing loop becomes `retryable_failed`.
2. Open 小手机 → 初星世界引擎 → 运行 and start one manual calculation.
3. While it is generating, trigger a same-chat UI/floor refresh that previously caused character synchronization.
4. Confirm no second Director request is sent and the displayed job remains generating with the same request suffix.
5. Confirm the valid bounded JSON reply commits once, Direction appears under 今日, Pressure appears under 压力线, and Director revision increments once.
6. Confirm debug entries show acquire/send/reply/release as distinct phases and contain no “acquire as 0-byte reply” entry.
7. Switch to another chat and back; confirm each scope restores its own state and no old reply commits.

- [ ] **Step 4: Record any environment limitation**

If real SillyTavern acceptance cannot be run because the host/API is unavailable, report it as not executed rather than inferring success from automated tests.

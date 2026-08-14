# Sandbox First Live Presentation Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Route accepted sandbox First Live narratives through pre-live VN, the existing idol Live Theater, and post-live VN for both successful and failed attempts.

**Architecture:** Keep deterministic settlement and the single `sandbox_first_live` model request unchanged. Persist the parsed narrative on the active attempt, use sandbox-specific VN nodes for the two visible stages, and reuse `idolLiveVideos` plus `playLiveVideo()` only for playback.

**Tech Stack:** Existing browser JavaScript, DOM event overlay and Live Theater, Node.js `node:test`, source-level and VM-isolated regression tests.

---

### Task 1: Lock the missing presentation flow with failing tests

**Files:**
- Modify: `tests/free-mode.test.mjs`
- Modify: `tests/vn-flow.test.mjs`

- [ ] **Step 1: Add a reply-routing regression test**

Add assertions against `handleSandboxFirstLiveReply()` proving that an accepted reply stores the two blocks separately, creates `sandboxFirstLivePre`, renders only `narrative.pre`, and does not concatenate both blocks into the opened event:

```js
test("sandbox First Live accepted reply opens the pre-live stage before the post-live stage", () => {
  const body = readFunction("handleSandboxFirstLiveReply");
  assert.match(body, /attempt\.narrative\s*=\s*\{[\s\S]*pre:\s*narrative\.pre[\s\S]*post:\s*narrative\.post/);
  assert.match(body, /presentationStage\s*=\s*"pre"/);
  assert.match(body, /type:\s*"sandboxFirstLivePre"/);
  assert.match(body, /state\.lastStory\s*=\s*narrative\.pre/);
  assert.match(body, /openEventOverlay\([\s\S]*narrative\.pre/);
});
```

- [ ] **Step 2: Add presentation-controller regression tests**

Add assertions proving the sandbox controller resolves the current idol video, calls the existing player, and transitions to a sandbox post node without calling the classic post generator:

```js
test("sandbox First Live presentation reuses Live Theater without a second model request", () => {
  const startBody = readFunction("startSandboxFirstLivePresentation");
  const postBody = readFunction("showSandboxFirstLivePostStage");
  assert.match(startBody, /idolLiveVideos\[state\.idol\]/);
  assert.match(startBody, /playLiveVideo\(videoUrl, showPostStage\)/);
  assert.match(startBody, /showPostStage\(\)/);
  assert.doesNotMatch(startBody, /requestHostPromptSend|startFirstLivePostStage/);
  assert.match(postBody, /type:\s*"sandboxFirstLivePost"/);
  assert.match(postBody, /narrative\.post/);
});
```

- [ ] **Step 3: Add shared VN-control routing assertions**

Extend `tests/vn-flow.test.mjs` to require:

```js
assert.match(readFunction("setEventActionsEnabled"), /sandboxFirstLivePre/);
assert.match(readFunction("closeEventOverlay"), /sandboxFirstLivePre[\s\S]*startSandboxFirstLivePresentation/);
assert.match(readFunction("closeEventOverlay"), /sandboxFirstLivePost[\s\S]*completeSandboxFirstLivePresentation/);
```

- [ ] **Step 4: Run the focused tests and verify RED**

Run:

```powershell
node --test tests/free-mode.test.mjs tests/vn-flow.test.mjs
```

Expected: the new tests fail because the sandbox presentation functions and nodes do not exist and the accepted reply still concatenates both narrative blocks.

### Task 2: Implement sandbox pre-live, video, and post-live stages

**Files:**
- Modify: `app.js`

- [ ] **Step 1: Persist and open the accepted pre-live narrative**

Change the valid-final branch of `handleSandboxFirstLiveReply()` to preserve the combined reply for logs while presenting only the pre block:

```js
const combinedStory = `${narrative.pre}\n\n${narrative.post}`;
attempt.narrative = { pre: narrative.pre, post: narrative.post };
attempt.presentationStage = "pre";
state.lastStory = narrative.pre;
if (state.log[0]) state.log[0].aiReply = combinedStory;
state.activeStoryNode = { type: "sandboxFirstLivePre", ready: true };
```

Keep request clearing, challenge status, Harness completion, Chronicle update, save, render, and ACK exactly once. Open `First Live 登台前准备` with `narrative.pre`.

- [ ] **Step 2: Add the sandbox presentation controller**

Add focused functions beside the existing Live Theater helpers:

```js
function showSandboxFirstLivePostStage() {
  const attempt = state.sandbox?.firstLiveChallenge?.activeAttempt;
  const postStory = String(attempt?.narrative?.post || "").trim();
  if (!attempt || !postStory) return false;
  attempt.presentationStage = "post";
  state.activeStoryNode = { type: "sandboxFirstLivePost", ready: true };
  state.lastStory = postStory;
  saveState();
  render();
  openEventOverlay("First Live 演后记", attempt.success ? "演出成功" : "演出失败", postStory);
  return true;
}

function startSandboxFirstLivePresentation() {
  const attempt = state.sandbox?.firstLiveChallenge?.activeAttempt;
  if (!attempt?.narrative?.post) return false;
  attempt.presentationStage = "video";
  state.activeStoryNode = { type: "sandboxFirstLivePost", ready: false };
  deferredLivePostReply = null;
  saveState();
  render();
  setElementHidden("eventOverlay", true);
  const showPostStage = () => showSandboxFirstLivePostStage();
  const videoUrl = idolLiveVideos[state.idol];
  if (videoUrl) {
    triggerWipeTransition(() => playLiveVideo(videoUrl, showPostStage));
  } else {
    showPostStage();
  }
  return true;
}

function completeSandboxFirstLivePresentation() {
  const attempt = state.sandbox?.firstLiveChallenge?.activeAttempt;
  if (attempt) attempt.presentationStage = "completed";
  state.activeStoryNode = null;
  saveState();
  render();
}
```

- [ ] **Step 3: Route shared event controls and presentation styling state**

Update existing conditionals so:

```js
node?.type === "firstLivePre" || node?.type === "sandboxFirstLivePre"
```

uses the `Live 开始` label and live-preparation BGM/background.

Add `closeEventOverlay()` branches that call `startSandboxFirstLivePresentation()` for ready pre nodes and `completeSandboxFirstLivePresentation()` for ready post nodes. Neither branch may call `startFirstLivePostStage()` or `completeFirstLivePostFlow()`.

- [ ] **Step 4: Run focused tests and verify GREEN**

Run:

```powershell
node --check app.js
node --test tests/free-mode.test.mjs tests/vn-flow.test.mjs tests/launch-mode.test.mjs
```

Expected: syntax passes and all focused tests pass.

### Task 3: Document and verify the completed flow

**Files:**
- Modify: `docs/current-handoff.md`

- [ ] **Step 1: Add the handoff entry**

Document the root cause, new `sandboxFirstLivePre` and `sandboxFirstLivePost` stages, one-request boundary, success/failure behavior, and verification totals.

- [ ] **Step 2: Run regression verification**

Run:

```powershell
node --check app.js
node --test tests/free-mode.test.mjs tests/vn-flow.test.mjs tests/launch-mode.test.mjs tests/harness-recovery.test.mjs tests/primary-model-ownership.test.mjs
```

Then enumerate all `tests/*.test.mjs` files in PowerShell and pass them to `node --test`.

Expected: focused suites pass. Full-suite failures, if any, must be compared by name with the documented six-test baseline.

- [ ] **Step 3: Check diff quality**

Run:

```powershell
git diff --check
git diff -- app.js tests/free-mode.test.mjs tests/vn-flow.test.mjs docs/current-handoff.md
```

Expected: no whitespace errors and only the scoped presentation-flow changes.

- [ ] **Step 4: Commit the implementation**

Run:

```powershell
git add -- app.js tests/free-mode.test.mjs tests/vn-flow.test.mjs docs/current-handoff.md
git commit -m "Complete sandbox First Live presentation flow"
```

# External Event Shortcut And Conversation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a right-side external-event shortcut with a pending red dot and convert accepted external events into persistent multi-round Galgame conversations that settle only when the player explicitly ends the topic.

**Architecture:** Keep the existing Storyteller candidate as the authoritative event identity and add a bounded `activeConversation` subtree under Storyteller for cross-round continuity. The harness continues to own each in-flight model request, while application-level handlers reuse the existing Galgame choice parser and UI. The shortcut composes the existing phone and World Engine navigation rather than creating a second inbox.

**Tech Stack:** Vanilla JavaScript, HTML/CSS, Node.js `node:test`, VM-based source integration tests, existing Storyteller/Director/harness modules.

---

## File Map

- Modify `index.html`: add the bell symbol, right-side `事件` shortcut, and red-dot element.
- Modify `style.css`: style the shortcut and badge, and re-space the fixed right-side action rail.
- Modify `app.js`: normalize conversation state, calculate badge state, navigate to the inbox, manage multi-round event requests, reuse choice UI, restore sessions, and settle explicitly.
- Modify `world/storyteller/phone-view.js`: keep inbox view authoritative for `notified/deferred` candidates; no new state ownership.
- Modify `tests/storyteller-event-turn.test.mjs`: prove round acceptance does not resolve and explicit ending resolves exactly once.
- Create `tests/storyteller-event-shortcut.test.mjs`: test DOM, badge predicate, navigation, choice controls, and resume wiring.
- Modify `tests/world-engine-phone-app.test.mjs`: cover direct event-tab entry without duplicating the inbox renderer.
- Modify `tests/harness-recovery.test.mjs`: cover an awaiting-choice event conversation surviving normalization while only a generating round enters recovery.

### Task 1: Shortcut DOM, Pending Predicate, And Navigation

**Files:**
- Modify: `index.html`
- Modify: `style.css`
- Modify: `app.js`
- Create: `tests/storyteller-event-shortcut.test.mjs`

- [ ] **Step 1: Write the failing shortcut tests**

Add tests that assert:

```js
assert.match(html, /id="freeModeEventBtn"/);
assert.match(html, /id="freeModeEventBadge"/);
assert.match(readFunction("hasPendingExternalStorytellerEvent"), /candidate\.channel !== "invite"/);
assert.match(readFunction("hasPendingExternalStorytellerEvent"), /\["notified", "deferred"\]/);
assert.match(readFunction("openExternalStorytellerEventShortcut"), /openPhoneOverlay\(\)/);
assert.match(readFunction("openExternalStorytellerEventShortcut"), /openPhoneWorldEngineApp\(\)/);
assert.match(readFunction("openExternalStorytellerEventShortcut"), /setWorldEnginePhoneTab\("events"\)/);
```

Also execute the predicate in a VM with current and stale `invite`, `attach`, `phone`, and `sns` candidates.

- [ ] **Step 2: Run the test and verify RED**

Run:

```powershell
node --test tests/storyteller-event-shortcut.test.mjs
```

Expected: FAIL because `freeModeEventBtn` and `hasPendingExternalStorytellerEvent` do not exist.

- [ ] **Step 3: Add the shortcut and pure predicate**

Add HTML equivalent to:

```html
<button id="freeModeEventBtn" class="free-mode-event-btn" type="button" hidden aria-label="打开外部事件收件箱">
  <svg aria-hidden="true"><use href="#icon-bell"></use></svg>
  <span>事件</span>
  <span id="freeModeEventBadge" class="free-mode-event-badge" hidden></span>
</button>
```

Add these functions in `app.js`:

```js
function hasPendingExternalStorytellerEvent(candidate = state.freeMode?.world?.storyteller?.pendingCandidate) {
  const normalized = globalThis.HatsuWorldStorytellerIncidents?.normalizeIncidentCandidate?.(candidate);
  if (!normalized || normalized.channel !== "invite" || !["notified", "deferred"].includes(normalized.status)) return false;
  return normalized.dayKey === getWorldFeedDayKey()
    && normalized.saveScope === getSecondaryChannelSaveScope();
}

function updateFreeModeEventButton() {
  const button = document.getElementById("freeModeEventBtn");
  const badge = document.getElementById("freeModeEventBadge");
  if (!button) return;
  button.hidden = !isFreeModeActive();
  if (badge) badge.hidden = !hasPendingExternalStorytellerEvent();
}

function openExternalStorytellerEventShortcut() {
  if (resumeActiveStorytellerEventConversation()) return true;
  openPhoneOverlay();
  openPhoneWorldEngineApp();
  setWorldEnginePhoneTab("events");
  return true;
}
```

Wire the button click and call `updateFreeModeEventButton()` from free-mode rendering and Storyteller inbox transitions.

- [ ] **Step 4: Style and re-space the rail**

Place the shortcut at `top: calc(50% + 38px)` and move phone, bag, and apartment down by one 66px slot. Add an absolute 9px red circular badge at the top-right and preserve the existing 56px/72px stable button dimensions.

- [ ] **Step 5: Run focused tests and verify GREEN**

Run:

```powershell
node --test tests/storyteller-event-shortcut.test.mjs tests/free-mode.test.mjs tests/world-engine-phone-app.test.mjs
```

Expected: all tests pass.

### Task 2: Normalize A Bounded Active Conversation

**Files:**
- Modify: `app.js`
- Modify: `tests/storyteller-event-turn.test.mjs`
- Modify: `tests/harness-recovery.test.mjs`

- [ ] **Step 1: Write failing normalization tests**

Test an old save with no conversation and a malformed conversation. The normalized shape must be either `null` or:

```js
{
  incidentId: "incident-a",
  planId: "plan-a",
  saveScope: "scope-a",
  dayKey: "live+2",
  sourceTurnId: "notify-a",
  turnId: "storyteller-turn-a",
  status: "awaiting_choice",
  round: 2,
  storySegments: ["bounded story"],
  summaries: ["bounded summary"],
  choices: ["a", "b", "c", "d"],
  selectedActions: ["choice"],
  lastRequestId: "request-a"
}
```

Assert caps: 8 story segments, 8 summaries, 8 selected actions, 4 choices, and bounded scalar lengths.

- [ ] **Step 2: Run tests and verify RED**

Run:

```powershell
node --test tests/storyteller-event-turn.test.mjs tests/harness-recovery.test.mjs
```

Expected: FAIL because `activeConversation` is not normalized or restored.

- [ ] **Step 3: Implement normalization and identity matching**

Add `activeConversation: null` to Storyteller defaults and normalization. Add:

```js
function normalizeStorytellerEventConversation(value) { /* allowlisted bounded fields */ }
function getActiveStorytellerEventConversation() { /* normalized current state */ }
function isStorytellerEventConversationCurrent(conversation, candidate) { /* exact incident/plan/scope/day/source match */ }
function clearStorytellerEventConversation() { state.freeMode.world.storyteller.activeConversation = null; }
```

Invalid or stale identity must normalize to `null`; normalization must not issue model calls or save recursively.

- [ ] **Step 4: Restore awaiting-choice UI without recovery**

During state/render reconciliation, keep `awaiting_choice` conversations available to `resumeActiveStorytellerEventConversation()`. Only `status === "generating"` with an interrupted harness round enters the existing recovery path.

- [ ] **Step 5: Run tests and verify GREEN**

Run the Task 2 command and expect all tests to pass.

### Task 3: First Event Reply Becomes A Choice Round

**Files:**
- Modify: `app.js`
- Modify: `tests/storyteller-event-turn.test.mjs`

- [ ] **Step 1: Write the failing first-round tests**

Assert that `buildStorytellerIndependentEventPrompt()` requests `<story>`, four `<optionN>` tags, and `<sum>`, and no longer requests `自然收束，不要输出选项`.

Execute `commitStorytellerEventReply()` with a valid choice payload and assert:

```js
assert.equal(state.freeMode.world.storyteller.pendingCandidate.status, "invited");
assert.equal(state.freeMode.world.storyteller.activeConversation.status, "awaiting_choice");
assert.equal(state.freeMode.world.storyteller.activeConversation.round, 1);
assert.deepEqual(state.freeMode.world.storyteller.activeConversation.choices, ["A", "B", "C", "D"]);
assert.equal(finalChronicleCalls, 0);
assert.equal(finalDirectorDigestCalls, 0);
```

- [ ] **Step 2: Run the test and verify RED**

Run:

```powershell
node --test tests/storyteller-event-turn.test.mjs
```

Expected: FAIL because the first reply currently resolves and clears the candidate.

- [ ] **Step 3: Start conversation state when accepting**

In `dispatchAcceptedStorytellerCandidate()`, create `activeConversation` after the exact `invite` transition and before sending. Set `status: "generating"`, `round: 0`, empty bounded history, and the frozen candidate/turn identity.

- [ ] **Step 4: Parse and accept one round without final settlement**

Replace `commitStorytellerEventReply()` with round semantics:

```js
function commitStorytellerEventRoundReply(requestId, payload, rawSources) {
  // validate exact harness lease and active conversation identity
  // mark harness round completed/awaiting_choice without resolving candidate
  // append story and summary, freeze four choices, clear pending request
  // release the exact primary lease and render Galgame choices
}
```

Route Storyteller event replies through `extractChoicePayload`. An incomplete final payload returns the same turn to recovery and leaves the candidate `invited`.

- [ ] **Step 5: Run the test and verify GREEN**

Run Task 3 tests and expect all to pass.

### Task 4: Generated Choice And Custom Input Continuations

**Files:**
- Modify: `app.js`
- Modify: `tests/storyteller-event-turn.test.mjs`
- Modify: `tests/storyteller-event-shortcut.test.mjs`

- [ ] **Step 1: Write failing continuation tests**

Assert that the VN choices overlay recognizes an active event conversation, shows four choices, adds `自定义输入`, and adds `结束话题`. Execute generated and custom selection handlers and verify they acquire a new exact primary lease before changing the conversation to `generating`.

- [ ] **Step 2: Run tests and verify RED**

Run:

```powershell
node --test tests/storyteller-event-turn.test.mjs tests/storyteller-event-shortcut.test.mjs
```

Expected: FAIL because event-specific continuation handlers do not exist.

- [ ] **Step 3: Build bounded continuation prompts**

Add:

```js
function buildStorytellerEventContinuationPrompt(conversation, selectedAction) {
  // frozen world/event identity
  // newest story segments and summaries only
  // selected producer action
  // four choices + sum output contract
  // no time/stat/task/relationship mutation
}
```

- [ ] **Step 4: Implement one shared continuation dispatcher**

Add `requestNextStorytellerEventRound(selectedAction)` that validates `awaiting_choice`, acquires `{ ownerKind: "storyteller_event", turnId, saveScope }`, rotates request ID, captures the frozen prompt, changes both harness and conversation to `generating`, saves, renders a waiting state, and sends once.

Add `handleStorytellerEventChoiceSelection(index)` and `handleStorytellerEventCustomChoice(text)` as thin wrappers.

- [ ] **Step 5: Reuse the VN controls**

Extend `isChoicePromptAction`, `currentChoiceActionTitle`, `handleVnSlidesEnd`, `showVnChoicesOverlay`, `handleVnCustomChoiceSubmit`, and `handleChoiceSelection` for `action: "storyteller_event"`. Do not add reward, time, relationship, or task settlement branches.

- [ ] **Step 6: Run tests and verify GREEN**

Run Task 4 tests and expect all to pass.

### Task 5: Immediate End Topic And Exactly-Once Final Evidence

**Files:**
- Modify: `app.js`
- Modify: `tests/storyteller-event-turn.test.mjs`

- [ ] **Step 1: Write failing explicit-end tests**

From an exact `awaiting_choice` conversation, call `endStorytellerEventConversation()` and assert:

```js
assert.equal(result, true);
assert.equal(state.freeMode.world.storyteller.pendingCandidate, null);
assert.equal(state.freeMode.world.storyteller.activeConversation, null);
assert.equal(state.harness.activeTurn.status, "completed");
assert.equal(finalChronicleCalls, 1);
assert.equal(finalDirectorDigestCalls, 1);
assert.equal(modelSendCalls, 0);
```

Calling it again must return `false` and leave receipt/evidence counts unchanged.

- [ ] **Step 2: Run the test and verify RED**

Run:

```powershell
node --test tests/storyteller-event-turn.test.mjs
```

Expected: FAIL because explicit local settlement does not exist.

- [ ] **Step 3: Implement exact local settlement**

Add `endStorytellerEventConversation()` that rejects generating, stale, or mismatched conversations; transitions the exact candidate with `transitionNotification(candidate, "resolve", ownership)`; appends recent candidate/fingerprint/receipt once; builds one bounded combined evidence string from summaries and newest segments; requests Chronicle and Director digest once; clears active conversation/pending choices; marks the harness turn completed; saves; closes overlays; renders the prior free-mode surface; and performs no model send.

- [ ] **Step 4: Add resume behavior**

Implement `resumeActiveStorytellerEventConversation()` to reopen the saved latest story and choices for `awaiting_choice`, or the existing recovery overlay for an interrupted generating round.

- [ ] **Step 5: Run tests and verify GREEN**

Run Task 5 tests and expect all to pass.

### Task 6: Regression And Visual Safety

**Files:**
- Verify all modified files

- [ ] **Step 1: Run syntax checks**

```powershell
node --check app.js
node --check world/storyteller/phone-view.js
```

Expected: exit code 0.

- [ ] **Step 2: Run related regression suites**

```powershell
node --test tests/storyteller-event-shortcut.test.mjs tests/storyteller-event-turn.test.mjs tests/storyteller-notifications.test.mjs tests/storyteller-notification-integration.test.mjs tests/storyteller-phone-view.test.mjs tests/world-engine-phone-app.test.mjs tests/free-mode.test.mjs tests/phone-chat.test.mjs tests/harness-recovery.test.mjs tests/world-director-integration.test.mjs
```

Expected: zero failures.

- [ ] **Step 3: Check layout constraints in source tests**

Assert stable top offsets and 66px spacing for all seven right-side controls, plus a capped mobile rule that keeps the rail inside the viewport without overlap.

- [ ] **Step 4: Run diff checks**

```powershell
git diff --check
git status --short
```

Expected: no whitespace errors; unrelated existing changes remain untouched.

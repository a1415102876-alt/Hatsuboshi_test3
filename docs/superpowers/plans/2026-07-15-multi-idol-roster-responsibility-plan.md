# Multi-Idol Roster And Responsibility Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Preserve independent sandbox progression for multiple assigned idols, allow safe responsible-idol switching from the assigned-idol page, and bind accepted commissions to the responsible idol.

**Architecture:** Add a focused `HatsuIdolRoster` state module that snapshots and loads the existing top-level compatibility fields. Keep `state.idol` as the responsible-idol mirror, extend sandbox tasks with per-profile task initialization and commission ownership, and make the affinity overlay a non-mutating roster browser with an explicit switch command.

**Tech Stack:** Browser JavaScript globals, existing DOM/CSS, Node.js `node:test`, VM-isolated module tests and source integration tests.

---

### Task 1: Pure roster state, profiles, migration, and switching

**Files:**
- Create: `sandbox/idol-roster.js`
- Create: `tests/idol-roster.test.mjs`
- Modify: `index.html`

- [ ] **Step 1: Write failing pure-state tests**

Cover exact current-profile capture, independent object identity, save/load switching, legacy roster recovery, unconfirmed candidate exclusion, and idempotent normalization:

```js
test("responsible idol switching preserves independent profiles and global state", () => {
  const state = makeState("藤田琴音");
  roster.confirmAssignedIdol(state, "藤田琴音", { createProfile });
  state.Vo = 321;
  state.tasks.wallet.money = 500;
  roster.confirmAssignedIdol(state, "葛城莉莉娅", { createProfile });
  state.Vo = 123;
  roster.switchResponsibleIdol(state, "藤田琴音");
  assert.equal(state.Vo, 321);
  assert.equal(state.tasks.wallet.money, 500);
  assert.notEqual(state.sandbox.idolProfiles["藤田琴音"], state.sandbox.idolProfiles["葛城莉莉娅"]);
});
```

```js
test("legacy migration excludes an unconfirmed overwritten scout target", () => {
  const state = makeLegacyState({ idol: "葛城莉莉娅", producedIdols: ["藤田琴音"] });
  roster.normalizeRosterState(state, {
    validIdols: ["藤田琴音", "葛城莉莉娅"],
    confirmedIdols: ["藤田琴音"],
    createProfile
  });
  assert.deepEqual(state.sandbox.assignedIdols, ["藤田琴音"]);
});
```

- [ ] **Step 2: Run tests and verify RED**

Run `node --test tests/idol-roster.test.mjs`.

Expected: FAIL because `sandbox/idol-roster.js` does not exist.

- [ ] **Step 3: Implement the pure roster module**

Export `PROFILE_FIELDS`, `captureActiveProfile`, `applyProfile`, `normalizeRosterState`, `getAssignedIdols`, `saveResponsibleProfile`, `confirmAssignedIdol`, and `switchResponsibleIdol` on `globalThis.HatsuIdolRoster`.

Profiles clone these compatibility fields and task view:

```js
const PROFILE_FIELDS = [
  "Vo", "Da", "Vi", "growth", "threshold", "cap", "sp",
  "stamina", "stress", "trust", "liveReady", "affinity", "firstLive"
];
```

Also capture/load `state.sandbox.firstLiveChallenge`, `state.tasks.main`, and `state.tasks.baseline`. Do not copy wallet, inventory, side slots, campus, time, free-mode world, or relationships.

- [ ] **Step 4: Load the module before tasks and app**

Add:

```html
<script src="./sandbox/idol-roster.js"></script>
```

before `tasks/sandbox-tasks.js` and `app.js`.

- [ ] **Step 5: Verify GREEN**

Run `node --test tests/idol-roster.test.mjs` and `node --check sandbox/idol-roster.js`.

### Task 2: Per-idol task initialization and commission ownership

**Files:**
- Modify: `tasks/sandbox-tasks.js`
- Modify: `tests/tasks-sandbox.test.mjs`

- [ ] **Step 1: Write failing task ownership tests**

Require a confirmed-idol task factory and immutable commission owner:

```js
test("confirmed idol task state activates only that idol pack", () => {
  const taskState = HatsuTasks.createConfirmedIdolTaskState("葛城莉莉娅");
  assert.equal(taskState.main.scout_lilja.status, "completed");
  assert.equal(taskState.main.lilja_main_01.status, "active");
  assert.equal(taskState.main.temari_main_01.status, "locked");
});
```

```js
test("accepted commissions freeze owner and reject another responsible idol", () => {
  const state = readySideQuestState();
  state.sandbox.responsibleIdol = state.idol = "藤田琴音";
  assert.equal(HatsuTasks.setActiveSideQuest(state, 0).slot.ownerIdol, "藤田琴音");
  state.sandbox.responsibleIdol = state.idol = "葛城莉莉娅";
  assert.equal(HatsuTasks.applySideQuestTier(state, 0, "pass").reason, "owner_mismatch");
});
```

- [ ] **Step 2: Verify RED**

Run `node --test tests/tasks-sandbox.test.mjs`.

Expected: new factory is missing and side settlement does not reject owner mismatch.

- [ ] **Step 3: Implement task profile factory and target-aware scout completion**

Add `createConfirmedIdolTaskState(idolName)` using a fresh default main map, completing only the matching scout, activating generic relationship/ability/work/final tasks plus that idol's personal pack, and leaving other idol packs locked.

Change scout completion to pass the idol derived from the completed scout ID instead of reading `state.idol`. Only activate the current compatibility task view when the confirmed idol is currently responsible.

- [ ] **Step 4: Implement commission owner gates**

`setActiveSideQuest()` sets `slot.ownerIdol` only when absent. `getActiveSideQuest()` returns it. `applySideQuestTier()` rejects a nonmatching responsible idol before rewards or slot writes. Add owner to task snapshots for UI rendering.

- [ ] **Step 5: Verify GREEN**

Run `node --test tests/tasks-sandbox.test.mjs` and `node --check tasks/sandbox-tasks.js`.

### Task 3: App integration, recruitment confirmation, and busy switch guard

**Files:**
- Modify: `app.js`
- Create: `tests/multi-idol-integration.test.mjs`

- [ ] **Step 1: Write failing integration tests**

Require:

- second-idol scouting does not call `applyIdolPreset(candidate, true)` when a roster exists;
- additional invite close does not reset campus day or re-enter initial sandbox setup;
- accepted scout completion calls a finalizer that adds and switches to the confirmed idol;
- save flow captures the active profile;
- busy owner, Harness recovery, active VN, map exploration, and Live Theater block manual switching.

Use `readFunction()` assertions for routing and VM-isolated tests for guard decisions.

- [ ] **Step 2: Verify RED**

Run `node --test tests/multi-idol-integration.test.mjs`.

Expected: missing roster integration functions and old second-scout reset path.

- [ ] **Step 3: Normalize roster state in `ensureStateShape()`**

After task shape is available, derive confirmed scout idols from task status and call `HatsuIdolRoster.normalizeRosterState()` with `presetFor()` and `HatsuTasks.createConfirmedIdolTaskState()` based profile creation.

Add `createFreshSandboxIdolProfile()`, `syncResponsibleProfileBeforeSave()`, and call the latter from `saveState()` before serialization.

- [ ] **Step 4: Separate additional scouting from initial setup**

In `startSandboxInviteStory()` detect an existing roster. For additional scouting, keep the current responsible profile loaded, set only `scoutTargetIdol`, and mark the story node as `additionalScout`. In `closeEventOverlay()`, additional scout setup closes back to the current campus without calling `enterSandboxCampusAfterOpening()`.

- [ ] **Step 5: Finalize confirmed recruits**

After accepted task completion tags are applied, map completed scout IDs to idol names. For a newly confirmed idol, create its clean profile/task state, add it once, save the outgoing profile, and automatically load the new responsible profile.

- [ ] **Step 6: Add guarded responsible switching**

Implement `getResponsibleIdolSwitchBlockReason()` and `switchResponsibleIdolFromUi(name)`. Reject non-idle states without writes; otherwise switch through `HatsuIdolRoster`, save, rerender, refresh roster-dependent UI, and show a toast.

- [ ] **Step 7: Verify GREEN**

Run:

```powershell
node --check app.js
node --test tests/idol-roster.test.mjs tests/tasks-sandbox.test.mjs tests/multi-idol-integration.test.mjs
```

### Task 4: Assigned-idol paging and responsibility controls

**Files:**
- Modify: `index.html`
- Modify: `style.css`
- Modify: `app.js`
- Create: `tests/multi-idol-ui.test.mjs`

- [ ] **Step 1: Write failing UI structure and behavior tests**

Require previous/next icon buttons, page counter, responsibility badge/button, wraparound browsing, opening on the responsible idol, and browsing without `state.idol` mutation. Require secondary rows to exclude every assigned idol and network rows to include all assigned idols.

- [ ] **Step 2: Verify RED**

Run `node --test tests/multi-idol-ui.test.mjs`.

- [ ] **Step 3: Add stable paging controls**

Add `affinityPrevIdolBtn`, `affinityNextIdolBtn`, `affinityIdolCounter`, `affinityResponsibleBadge`, and `affinitySetResponsibleBtn` to the affinity header/identity area using existing chevron icons and button conventions.

- [ ] **Step 4: Render viewed idol separately from responsible idol**

Track `viewedAffinityIdolName`. `openAffinityOverlay()` initializes it from `responsibleIdol`; paging cycles the roster without state changes; `renderAffinityOverlay()` reads the viewed idol. The switch button invokes the guarded switch service.

- [ ] **Step 5: Update secondary and network views**

Exclude the assigned roster from “其他人物”. Add one producer-to-idol edge for every assigned idol and label the responsible one `当前负责`, with other roster members labeled `担当`.

- [ ] **Step 6: Add responsive CSS**

Use fixed 40px paging buttons, a stable counter width, flex wrapping for long names, and mobile rules that prevent controls from overlapping the identity text.

- [ ] **Step 7: Verify GREEN**

Run:

```powershell
node --test tests/multi-idol-ui.test.mjs tests/multi-idol-integration.test.mjs tests/affinity-stage-tags.test.mjs tests/tasks-sandbox.test.mjs
node --check app.js
node --check sandbox/idol-roster.js
```

### Task 5: Handoff, regression verification, and commit

**Files:**
- Modify: `docs/current-handoff.md`

- [ ] **Step 1: Document the final state model and migration limitation**

Record roster/responsible/profile fields, second-confirmation behavior, commission owner rules, UI paging, busy switch locks, exact validation totals, and the inability to recover numeric values already overwritten by old saves.

- [ ] **Step 2: Run scoped regression suites**

Run roster, tasks, free mode, First Live, portrait wardrobe, world engine, Storyteller, Harness recovery, and ownership tests together.

- [ ] **Step 3: Run full regression and compare failure names**

Enumerate `tests/*.test.mjs` with PowerShell and pass them to `node --test`. Compare failures against the documented six-test baseline.

- [ ] **Step 4: Check diff quality**

Run `node --check` for all modified JavaScript, `git diff --check`, and inspect the scoped diff.

- [ ] **Step 5: Commit implementation**

```powershell
git add -- sandbox/idol-roster.js tasks/sandbox-tasks.js app.js index.html style.css tests/idol-roster.test.mjs tests/tasks-sandbox.test.mjs tests/multi-idol-integration.test.mjs tests/multi-idol-ui.test.mjs docs/current-handoff.md
git commit -m "Add multi-idol roster and responsibility switching"
```

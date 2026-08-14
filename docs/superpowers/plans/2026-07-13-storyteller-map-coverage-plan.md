# Storyteller Map Coverage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend Storyteller and Harness coverage to sandbox campus-map arrival and ordinary exploration rounds without adding model calls or allowing rejected requests to consume time, location, choices, or logs.

**Architecture:** Add a dedicated `map_explore` variant to the persisted Harness active turn and reuse the existing primary owner, frozen Prompt and Recovery overlay. Map entry and ordinary option/custom steps acquire a formal lease before deterministic mutations, attach a scoped Storyteller candidate after settlement, and send the existing choice Prompt. Only a valid final scene plus four options completes the map turn and resolves its candidate.

**Tech Stack:** Native JavaScript, Node `node:test`, existing primary-model ownership, Harness Recovery, Storyteller incident/injection modules, map choice payload parser and SillyTavern postMessage bridge.

---

## Scope

Covered:

- campus `beginMapLocationExploreSession()` arrival;
- ordinary `handleMapLocationChoiceSelection()` steps;
- ordinary `handleMapLocationCustomChoice()` steps;
- `requestNextMapLocationOptions()` when called by a migrated step;
- refresh Recovery for a settled/generating `map_explore` turn.

Excluded:

- `isSandboxScoutActive()` flows;
- side-quest arrival and `sideQuestResolving`;
- `handleMapLocationReturn()`;
- `outing_scene_dialogue` and dedicated off-campus facility scenes;
- major events and all unrelated primary entry points.

## Task 1: Map Harness Turn And Recovery Semantics

**Files:**
- Modify: `app.js`
- Modify: `tests/harness-recovery.test.mjs`
- Create: `tests/storyteller-map-coverage.test.mjs`

- [ ] Write RED execution tests requiring `beginHarnessMapExploreTurn()`, map snapshot fields, global single-flight blocking, old-session transition to `recovery_required`, frozen Prompt retry with new request ID and same turn/candidate, and explicit abandon only.
- [ ] Run `node --test tests/storyteller-map-coverage.test.mjs tests/harness-recovery.test.mjs` and confirm failures are missing map support.
- [ ] Implement a `kind: "map_explore"` active turn with `stepKind`, location, selected-action summary, settled minutes, existing generation Prompt fields and candidate reference.
- [ ] Generalize recovery predicates and UI labels only enough to accept `produce_action` and `map_explore`; do not change ordinary settlement semantics.
- [ ] Ensure `returnHarnessRecoveryAttemptToPending()` accepts exact map requests, and timeout/send/invalid-response failures return to `recovery_required`.
- [ ] Run focused tests, `node --check app.js`, `git diff --check`, and inspect the Task 1 diff.

## Task 2: Initial Map Arrival Ownership And Storyteller Attachment

**Files:**
- Modify: `app.js`
- Modify: `world/storyteller/incidents.js`
- Modify: `world/storyteller/injection.js`
- Modify: `tests/storyteller-map-coverage.test.mjs`
- Modify: `tests/storyteller-incidents.test.mjs`

- [ ] Write RED execution tests proving an occupied channel leaves clock, location, pending state, options, logs and UI unchanged.
- [ ] Write RED tests proving a successful entry acquires `map_explore` before `advanceFreeModeTime(15)`, settles once, selects after movement, freezes one Prompt and sends one request with the exact lease.
- [ ] Add map-compatible incident location/action context without changing ordinary candidates; `map_location` remains ineligible unless the caller explicitly sets `mapStepKind` to an approved value.
- [ ] Extend the bounded injection block with arrival/exploration wording while preserving all state-authority prohibitions.
- [ ] Refactor `beginMapLocationExploreSession()` into preflight, formal acquire, deterministic movement, candidate attach, Prompt freeze/save and exact send. On synchronous send failure, retain the settled turn for Recovery.
- [ ] Keep scout, side quest and dedicated facility branches on their current paths without Storyteller attachment.
- [ ] Run focused tests and standard syntax/diff checks.

## Task 3: Ordinary Option And Custom Exploration Steps

**Files:**
- Modify: `app.js`
- Modify: `tests/storyteller-map-coverage.test.mjs`
- Modify: `tests/primary-model-ownership.test.mjs`

- [ ] Write RED tests proving occupied-channel rejection preserves selected option/custom input, time, logs, option arrays and UI.
- [ ] Add `prepareMapExploreDispatch(stepKind, context)` that creates request/turn/lease before business writes and returns an exact dispatch object.
- [ ] Change ordinary option and custom handlers to acquire first, then process deterministic quest-free selection, time and log writes exactly once.
- [ ] Pass the acquired dispatch into `requestNextMapLocationOptions()`; it must not auto-acquire or create a second request ID.
- [ ] If the step reaches day end, mark `completed_without_narrative`, release the exact lease and do not select a candidate or send a Prompt.
- [ ] Preserve side-quest routing before the migrated ordinary path.
- [ ] Run focused tests and standard syntax/diff checks.

## Task 4: Choice Validation, Candidate Commit And Recovery

**Files:**
- Modify: `app.js`
- Modify: `tests/storyteller-map-coverage.test.mjs`
- Modify: `tests/storyteller-attachment.test.mjs`
- Modify: `tests/harness-recovery.test.mjs`

- [ ] Write RED tests requiring a current final complete map choice payload before `markHarnessNarrativeTurn("completed")` and ACK.
- [ ] Prove stale, partial, retry and incomplete-four-option responses do not complete or resolve the candidate.
- [ ] Route incomplete final map payload into `recovery_required`, preserving Prompt, location, time, log, turn and candidate.
- [ ] Extend `settleStorytellerCandidateForReply()` to accept only an exact completed `map_explore` turn in addition to existing ordinary turns.
- [ ] Recovery must reuse frozen Prompt and candidate and must not call map settlement, selection or Prompt builders.
- [ ] Explicit abandonment expires the exact candidate; closing overlays remains state-neutral.
- [ ] Run map, Storyteller, Recovery and ownership suites plus standard checks.

## Task 5: Exclusions, Read-Only Diagnostics And Acceptance

**Files:**
- Modify: `world/storyteller/phone-view.js`
- Modify: `app.js`
- Modify: `tests/storyteller-phone-view.test.mjs`
- Modify: `tests/world-engine-phone-app.test.mjs`
- Modify: `tests/storyteller-map-coverage.test.mjs`

- [ ] Add RED tests showing scout, side quest, return and dedicated facility flows never create a map Harness turn or Storyteller candidate.
- [ ] Add a bounded `sourceLabel` (`普通行动`, `地图抵达`, `地图探索`) to the read-only candidate view; expose no full IDs, Prompt, option text or state.
- [ ] Run all Storyteller, Director, Harness, ownership and map tests.
- [ ] Run full `node --test tests`; expected baseline remains exactly six known failures.
- [ ] Run `node --check` for all Storyteller files and `app.js`, then `git diff --check`.

## Completion Gate

Completion requires: ownership before every migrated map side effect; one deterministic settlement and one request per map step; bounded candidate injection only for eligible campus map steps; current complete choice payload as the only commit path; refresh Recovery without re-settlement; unchanged excluded flows; no new full-suite failures.

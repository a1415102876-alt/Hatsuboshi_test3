# Idol Initiative Channels Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add validated daily idol intents and deliver up to two proactive behaviors through LINE, SNS, or apartment visits without background primary-model calls.

**Architecture:** Extend the existing Director patch with bounded `characterIntents`. A new pure `world/storyteller/initiative.js` module converts current-day intents into deterministic, budget-sharing IncidentCandidates and owns their bounded lifecycle; `app.js` adapts those candidates to existing LINE, Buzz, apartment, Harness, and Recovery surfaces.

**Tech Stack:** Vanilla browser JavaScript, SillyTavern host bridge, Node.js built-in test runner.

---

### Task 1: CharacterIntent Director contract

**Files:**
- Modify: `world/director-state.js`
- Modify: `world/director-api.js`
- Modify: `world/director-injection.js`
- Test: `tests/world-director-state.test.mjs`
- Test: `tests/world-director-api.test.mjs`
- Test: `tests/world-director-injection.test.mjs`

- [x] Add RED tests for a bounded current-day intent, unknown actors/targets/Pressure/source refs, private SNS drafts, extra fields, stale patches, migration, and participant-filtered soft Prompt injection.
- [x] Run `node --test tests/world-director-state.test.mjs tests/world-director-api.test.mjs tests/world-director-injection.test.mjs` and require failures caused by missing `characterIntents` support.
- [x] Add `normalizeCharacterIntent()` and `characterIntents: []` to Director state. Accept only `low|normal|high`, `private|public`, and `phone|sns|invite`; cap actors at known IDs, refs at known inputs, text fields at the design limits, and require public SNS drafts.
- [x] Extend Director input known-character records with `assigned` and `known`, add `characterIntents` to the output contract/example, and atomically include validated intents in `prepareDirectorPatch()` and `applyDirectorPatch()`.
- [ ] Inject only relevant actors' current-day intent as wording equivalent to “current inclination, not an accomplished action”.
- [x] Re-run the focused tests and require all pass.

### Task 2: Pure initiative selection and lifecycle

**Files:**
- Create: `world/storyteller/initiative.js`
- Modify: `world/storyteller/incidents.js`
- Modify: `index.html`
- Test: `tests/storyteller-initiative.test.mjs`
- Test: `tests/storyteller-incidents.test.mjs`

- [ ] Add RED tests for deterministic selection, legal-known actors, one action per actor, one-to-two daily candidates when legal, shared minor/moderate budget, public-only SNS, channel/topic cooldown, scope/day isolation, normalization, unread counts, and exact transitions.
- [ ] Run `node --test tests/storyteller-initiative.test.mjs tests/storyteller-incidents.test.mjs` and require missing-module/metadata failures.
- [ ] Implement and export:

```js
defaultInitiativeState();
ensureInitiativeState(value, options);
buildFallbackCharacterIntents(context);
selectInitiativeCandidates(input);
findInitiativeCandidate(state, candidateId);
transitionInitiativeCandidate(state, candidateId, action, ownership);
getUnreadPhoneInitiatives(state);
```

- [ ] Preserve `origin`, `intentId`, and bounded `delivery` metadata in `normalizeIncidentCandidate()`; Initiative candidates use existing `phone|sns|invite` channels and existing terminal statuses.
- [ ] Load `initiative.js` after `incidents.js` and before notification/phone-view modules.
- [ ] Re-run focused tests and require all pass.

### Task 3: App state, known idols, daily scheduling, and audit

**Files:**
- Modify: `app.js`
- Modify: `world/storyteller/phone-view.js`
- Test: `tests/idol-initiative-integration.test.mjs`
- Test: `tests/storyteller-phone-view.test.mjs`

- [ ] Add RED tests for assigned-plus-known idol discovery, stranger exclusion, old-save empty migration, Director commit scheduling, fallback scheduling, no overwrite of ordinary pending candidates, audit labels, and current-day cleanup.
- [ ] Run the two focused tests and require missing integration failures.
- [ ] Add `initiative: defaultInitiativeState()` to world Storyteller initialization/normalization. Implement `getKnownInitiativeIdolNames()` from assigned roster, responsible idol, LINE friends, and relationship keys.
- [ ] Make `getWorldDirectorHelpers()` expose only those known idols and their assigned flag.
- [ ] Implement `ensureIdolInitiativesForToday()` to choose Director intents or deterministic fallback, reserve at most two legal budget slots, persist exact candidates, and call it after Director commit, day-plan creation, load normalization, and relevant safe checkpoints.
- [ ] Extend phone-view audit with public intent summaries, proactive budget, channel/status labels, and unread state without exposing IDs or private Pressure text.
- [ ] Re-run focused tests and require all pass.

### Task 4: LINE delivery and phone badge

**Files:**
- Modify: `index.html`
- Modify: `style.css`
- Modify: `app.js`
- Test: `tests/idol-initiative-phone.test.mjs`
- Test: `tests/phone-chat-primary-channel.test.mjs`

- [ ] Add RED tests for a `1..9/9+` badge, thread unread preview, no clearing on phone open, lazy primary acquire on exact thread open, busy-owner no-op, frozen candidate identity, final commit clearing one unread item, and Recovery without reroll.
- [ ] Run focused tests and require failures caused by absent initiative phone delivery.
- [ ] Add `phoneUnreadBadge` inside the existing phone launcher and CSS for a stable red numeric badge.
- [ ] Materialize phone candidates as existing LINE threads without sending. On opening the exact thread, acquire `phone_chat`, freeze `candidateId/intentId/saveScope/dayKey` in `activeStoryNode`, and request the bounded first-message Prompt.
- [ ] On valid final reply, append lines, resolve only the exact candidate, then clear its unread state. On send/parse/timeout/reload failure retain it unread and retryable.
- [ ] Re-run focused tests and require all pass.

### Task 5: SNS publication and apartment doorbell

**Files:**
- Modify: `index.html`
- Modify: `style.css`
- Modify: `app.js`
- Test: `tests/idol-initiative-sns-visit.test.mjs`
- Test: `tests/free-mode.test.mjs`

- [ ] Add RED tests for stable SNS IDs, public-only publication, same-day merge without replacing world-gen posts, duplicate prevention, apartment time/location legality, doorbell actor display, accept/defer/decline, acquire-before-side-effect, exact event reference, and accepted-final resolution.
- [ ] Run focused tests and require missing delivery failures.
- [ ] Publish SNS candidates through `buildBuzzPost()` using `initiative:<candidateId>` IDs and `source: "character_intent"`; merge by ID and resolve only after the post exists.
- [ ] Add a hidden apartment doorbell hotspot and visitor overlay. Show only a legal current invite candidate at the apartment. Defer/decline through the pure transition API.
- [ ] Accept by acquiring the primary channel before UI/state consumption, then start the existing apartment choice scene with frozen initiative identity. Resolve after accepted final; retain the candidate for Recovery on failure.
- [ ] Re-run focused tests and require all pass.

### Task 6: Full verification

**Files:**
- Test all modified files and existing suites.

- [ ] Run `node --check app.js`, `node --check world/director-state.js`, `node --check world/director-api.js`, and `node --check world/storyteller/initiative.js`.
- [ ] Run all initiative, Director, Storyteller, LINE, SNS, apartment, Harness, Recovery, world-engine, multi-idol, and save migration tests.
- [ ] Run `git diff --check` and inspect the final diff for unrelated changes or raw IDs/private Pressure text in UI.

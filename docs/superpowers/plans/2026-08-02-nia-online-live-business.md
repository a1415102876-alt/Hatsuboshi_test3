# N.I.A Online Live Business Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the generic two-call VN online-live event with a dedicated four-segment live broadcast interface that preserves continuity, accepts one producer intervention, and settles exactly once.

**Architecture:** Add a focused UMD core module for persisted live runtime state, transition validation, trend mapping, and idempotent settlement. Extend `nia-business-api.js` to build and parse one strict payload per segment. Keep SillyTavern request ownership in `app.js`, while a dedicated overlay in `index.html` and `style.css` renders the live stage, timed comments, intervention drawer, and in-place result.

**Tech Stack:** Native JavaScript, HTML/CSS, SillyTavern main API bridge, Node `node:test`.

---

### Task 1: Four-segment runtime core

**Files:**
- Create: `nia-live-business-core.js`
- Create: `tests/nia-live-business-core.test.mjs`
- Modify: `index.html`
- Modify: `st.html`

- [ ] Write failing tests for the default runtime, legal segment transitions, stale reply rejection, trend-to-number mapping, refresh recovery, and one-time settlement.
- [ ] Run `node --test tests/nia-live-business-core.test.mjs` and confirm failure because the module does not exist.
- [ ] Implement `createLiveRuntime`, `normalizeLiveRuntime`, `beginSegmentGeneration`, `applySegmentPayload`, `submitProducerInstruction`, `recoverInterruptedLive`, and `settleLiveOnce` in a UMD module exposed as `globalThis.HatsuNiaLiveBusiness`.
- [ ] Load the module before `app.js` in direct and `st.html` embedded launches.
- [ ] Re-run the focused test and confirm all runtime tests pass.

The runtime must use these statuses exactly:

```js
const LIVE_STATUSES = [
  "idle", "ready",
  "generating_1", "playing_1", "awaiting_continue_1",
  "generating_2", "playing_2", "awaiting_continue_2",
  "generating_3", "playing_3", "awaiting_producer_instruction",
  "generating_4", "playing_4", "awaiting_settlement",
  "retryable_failed", "settled"
];
```

### Task 2: Segment prompt and payload contract

**Files:**
- Modify: `nia-business-api.js`
- Modify: `tests/nia-business-api.test.mjs`

- [ ] Write failing tests for segment 1-4 prompts, the third-segment incident/options contract, fourth-segment closing contract, last-tagged-block selection, and rejection of wrong `businessId` or `segmentIndex`.
- [ ] Run `node --test tests/nia-business-api.test.mjs` and confirm the new tests fail.
- [ ] Implement `buildNiaLiveSegmentPrompt(context, runtime)` and `parseNiaLiveSegmentPayload(payload, expected)` using `<NIA_LIVE_SEGMENT>` as the only accepted result block.
- [ ] Normalize `beats`, `comments`, controlled trend enums, continuity summary, segment-three incident/options, and segment-four evaluation fields.
- [ ] Require segment four to close the broadcast without a new incident or unresolved choice.
- [ ] Re-run the API tests and confirm they pass.

### Task 3: Dedicated live broadcast overlay

**Files:**
- Modify: `index.html`
- Modify: `style.css`
- Modify: `app.js`
- Create: `tests/nia-live-business-ui.test.mjs`

- [ ] Write failing source-level UI tests for `niaLiveOverlay`, live stage, standee, caption, comment rail, three metrics, topic bar, producer drawer, continue/retry controls, and in-place result panel.
- [ ] Run `node --test tests/nia-live-business-ui.test.mjs` and confirm failure.
- [ ] Add accessible overlay markup with fixed responsive dimensions and no nested cards.
- [ ] Add the approved layout: 68% stage, 32% comment rail, bottom metrics/topic bars, and a bottom producer instruction drawer that leaves comments visible.
- [ ] Implement rendering helpers in `app.js` for stage background, resolved idol portrait, comments, metrics, progress, loading, error, instruction, and settlement states.
- [ ] Add reduced-motion behavior and ensure all actionable controls are at least 44px high.
- [ ] Re-run UI tests and confirm they pass.

### Task 4: Timed playback and player controls

**Files:**
- Modify: `app.js`
- Modify: `tests/nia-live-business-ui.test.mjs`

- [ ] Write failing tests for sequential beat playback, comment triggers, metric updates after beats, locked controls during playback, and continue-button availability only after the segment finishes.
- [ ] Add one cancellable playback controller with timer cleanup on retry, close, refresh, and settlement.
- [ ] Play `beats` and insert `comments` by `triggerAfterBeatId`; update controlled metrics only at completed beat boundaries.
- [ ] Transition segments 1 and 2 to continue states, segment 3 to the producer drawer, and segment 4 to the in-place result.
- [ ] Re-run the UI tests and confirm they pass.

### Task 5: SillyTavern request integration and recovery

**Files:**
- Modify: `app.js`
- Modify: `tests/nia-business-vn.test.mjs`
- Modify: `tests/nia-host-bridge.test.mjs`

- [ ] Replace the old `nia_business` opening/resolution routing tests with four-segment request ownership tests.
- [ ] Persist `liveBusiness` inside N.I.A state and project it safely without exposing active lease internals to the view iframe.
- [ ] Start online-live only when completed producer work provides an `online_live` brief.
- [ ] Acquire one main-model lease per segment, send the segment prompt, accept only the matching reply, release the lease, persist the payload, and start playback.
- [ ] Send segment four with the exact producer option or free-text instruction.
- [ ] On malformed payload, preserve the last complete segment, show retry in the live overlay, and resend only the current segment.
- [ ] Recover interrupted `generating_N` states as `retryable_failed` after reload.
- [ ] Confirm no online-live path opens the generic VN overlay or returns to the N.I.A tablet between segments.

### Task 6: Idempotent settlement and training progression

**Files:**
- Modify: `app.js`
- Modify: `tests/nia-business-vn.test.mjs`
- Modify: `tests/nia-live-business-core.test.mjs`

- [ ] Write failing tests that map base fans plus `bonusTier` to a bounded result, apply pressure once, preserve the public-image summary, and advance `training.actionIndex` once.
- [ ] Implement settlement through `settleLiveOnce(businessId)` and retain the existing producer-work strong binding.
- [ ] Render final fans, image match, pressure delta, peak viewers/heat, bonus reason, and closing public impression over the ended live screen.
- [ ] Return to the N.I.A training surface only after explicit result confirmation.
- [ ] Re-run core and integration tests and confirm duplicate replies/confirmation cannot settle twice.

### Task 7: Full verification

**Files:**
- Verify only; do not change unrelated files.

- [ ] Run `node --test tests/nia-live-business-core.test.mjs tests/nia-business-api.test.mjs tests/nia-live-business-ui.test.mjs tests/nia-business-vn.test.mjs tests/nia-host-bridge.test.mjs tests/nia-training-flow.test.mjs`.
- [ ] Run `node --check app.js`, `node --check nia-business-api.js`, and `node --check nia-live-business-core.js`.
- [ ] Run `git diff --check -- app.js index.html style.css st.html nia-business-api.js nia-live-business-core.js tests/nia-live-business-core.test.mjs tests/nia-live-business-ui.test.mjs tests/nia-business-api.test.mjs tests/nia-business-vn.test.mjs`.
- [ ] Inspect the final diff for accidental changes to classic, sandbox, television, or offline business flows.

# School Radio Business Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the four-segment《初星放送部》school-radio business as a dedicated in-place broadcast experience, strongly bound to a completed `radio_plan` producer task and idempotently settled once.

**Architecture:** Reuse the existing N.I.A primary-model ownership and four-segment live request flow, but isolate radio state and payload parsing in two focused modules. The app will render the approved A/A1/T1 broadcast surface in the existing N.I.A overlay, with a radio-specific recovery and settlement path. The database remains optional and is only used for the final履历 enhancement.

**Tech Stack:** Native JavaScript UMD modules, existing HTML/CSS overlay, SillyTavern host bridge, Node `node:test`.

---

### Task 1: Radio runtime core

**Files:**
- Create: `nia-radio-business-core.js`
- Create: `tests/nia-radio-business-core.test.mjs`
- Modify: `index.html:1906-1912`
- Modify: `st.html:650-680`

- [ ] Write tests for default radio runtime, legal segment transitions, matching `businessId`/segment rejection, third-segment producer pause, interrupted-generation recovery, and one-time settlement.
- [ ] Run `node --test tests/nia-radio-business-core.test.mjs`; confirm the missing-module failure.
- [ ] Implement a UMD module exposed as `globalThis.HatsuNiaRadioBusiness` with:

```js
createRadioRuntime({ businessId, plan, baseFans })
normalizeRadioRuntime(raw)
beginSegmentGeneration(raw, segmentIndex)
applySegmentPayload(raw, payload)
completeSegmentPlayback(raw)
submitProducerInstruction(raw, instruction)
recoverInterruptedRadio(raw)
settleRadioOnce(raw, businessId)
```

- [ ] Use radio statuses `idle`, `ready`, `generating_1` through `generating_4`, `playing_1` through `playing_4`, `awaiting_continue_1`, `awaiting_continue_2`, `awaiting_producer_instruction`, `awaiting_settlement`, `retryable_failed`, and `settled`.
- [ ] Load the core in both direct `index.html` and embedded `st.html` before `app.js`.
- [ ] Re-run the focused test and confirm all core transitions pass.

### Task 2: Radio prompt and payload contract

**Files:**
- Create: `nia-radio-business-api.js`
- Create: `tests/nia-radio-business-api.test.mjs`
- Modify: `index.html:1905-1910`
- Modify: `st.html:675-685`

- [ ] Write tests for the four segment prompt responsibilities, exact three-option incident payload, fourth-segment closing payload, last-tagged-block parsing, and rejection of mismatched business or segment identifiers.
- [ ] Run the focused API test and confirm it fails before implementation.
- [ ] Implement `buildNiaRadioSegmentPrompt(context, runtime)` and `parseNiaRadioSegmentPayload(source, expected)`.
- [ ] Require the only accepted response block to be `<NIA_RADIO>{JSON}</NIA_RADIO>`; select the last valid tagged block so planning text cannot win.
- [ ] Normalize `lines`, `listenerLetter`, `problem`, `options`, `highlight`, `audienceResponse`, `impressionChange`, `followupHook`, and `resultSummary`.
- [ ] Enforce segment 3 `status: "awaiting_producer"` with exactly three preset options and segment 4 `status: "ended"` with no new problem or options.
- [ ] Re-run the API tests and confirm they pass.

### Task 3: Producer work binding and radio plan

**Files:**
- Modify: `nia-producer-work-core.js`
- Modify: `nia-producer-work-api.js`
- Modify: `app.js` around `startCurrentNiaBusinessAction`
- Create: `tests/nia-radio-work-binding.test.mjs`

- [ ] Add a fallback task `radio-department-plan` in the producer-work core with category `management`, one phase, and a three-period duration of one period.
- [ ] Make its completed output normalize to `radio_plan` containing `business_id`, `programTitle`, `episodeTitle`, `goal`, `host`, `guest`, and `interviewFocus`.
- [ ] Write tests proving an incomplete plan blocks radio start, a completed plan produces the same business id, and the task cannot be reused after settlement.
- [ ] Add `school_radio` to the business preparation resolver without treating it as `online_live` or `tv_variety`.
- [ ] Re-run producer-work and binding tests.

### Task 4: Dedicated radio overlay and T1/A1 interaction

**Files:**
- Modify: `index.html` near the N.I.A live overlay markup
- Modify: `style.css` near the N.I.A live styles
- Create: `tests/nia-radio-business-ui.test.mjs`

- [ ] Write source tests for the radio overlay, `ON AIR` badge, host/guest stage, one-line caption, expandable history drawer, segment marker, A1 producer cue card, three preset buttons, free-input control, retry state, and ended result panel.
- [ ] Add responsive overlay markup without routing through the generic VN player or the small-phone broadcast app.
- [ ] Style the approved T1 hierarchy: stable character stage, bottom caption, top `ON AIR`/segment strip, and history drawer that does not cover the stage by default.
- [ ] Add the A1 cue card as an in-place bottom panel; keep the last broadcast frame visible while awaiting input.
- [ ] Provide 44px minimum actionable controls, visible focus states, and reduced-motion behavior.
- [ ] Re-run UI tests.

### Task 5: Four-segment request integration and playback

**Files:**
- Modify: `app.js` around the existing live-business session and reply routing
- Modify: `tests/nia-business-vn.test.mjs`
- Modify: `tests/nia-host-bridge.test.mjs`

- [ ] Add a radio session alongside the live session with one request lease per segment and a single `business_id` throughout.
- [ ] Start only from a completed `radio_plan`; persist `radioBusiness` and `radioBusinessContext` in N.I.A state before requesting segment 1.
- [ ] Route matching host replies through `nia-radio-business-api.js`, reject stale or malformed payloads, preserve the last complete segment, and expose retry only for the current segment.
- [ ] Play segment lines manually through the T1 caption surface; after segment 1 and 2 show a continue control, after segment 3 show the A1 cue card, and after segment 4 show the ended result without leaving the overlay.
- [ ] Persist `generating_N` as `retryable_failed` on reload and recover to the same segment without duplicating previous lines.
- [ ] Assert that no radio request opens the generic VN overlay or returns to the N.I.A tablet between segments.
- [ ] Re-run host and business-flow tests.

### Task 6: Idempotent settlement and optional database履历

**Files:**
- Modify: `app.js` settlement and result rendering
- Modify: `tests/nia-radio-business-core.test.mjs`
- Modify: `tests/nia-business-vn.test.mjs`

- [ ] Write tests that duplicate the final reply and confirmation and verify only one settlement, one fan change, one impression update, and one producer-work completion.
- [ ] Implement `settleRadioOnce` with `business_id` and `settledBusinessId` guards.
- [ ] Render result summary, audience response, impression change, follow-up hook, and bounded fan change over the ended broadcast frame.
- [ ] Return to the N.I.A planning surface only after explicit result confirmation.
- [ ] Attempt the optional database履历 write after local settlement; database failure must leave the local result intact and must not repeat rewards.
- [ ] Re-run core, flow, and database-adapter tests.

### Task 7: Verification

**Files:**
- Verify only; do not change unrelated files.

- [ ] Run `node --test tests/nia-radio-business-core.test.mjs tests/nia-radio-business-api.test.mjs tests/nia-radio-work-binding.test.mjs tests/nia-radio-business-ui.test.mjs tests/nia-business-vn.test.mjs tests/nia-host-bridge.test.mjs`.
- [ ] Run `node --check app.js`, `node --check nia-radio-business-core.js`, and `node --check nia-radio-business-api.js`.
- [ ] Run `git diff --check -- app.js index.html style.css st.html nia-producer-work-core.js nia-producer-work-api.js nia-radio-business-core.js nia-radio-business-api.js tests`.
- [ ] Inspect the final diff to confirm classic, sandbox, online-live, TV variety, and offline event flows remain unchanged.

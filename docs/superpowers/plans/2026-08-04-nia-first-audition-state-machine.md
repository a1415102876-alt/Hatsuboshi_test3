# N.I.A First Audition State Machine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the sixth N.I.A day enter a resumable four-segment first audition, end with the responsible idol ranked first, and settle the round exactly once.

**Architecture:** Add a pure UMD audition core for frozen candidates, score trajectories, legal transitions, retry recovery, and idempotent settlement. Add a tagged-JSON prompt/parser module for one main-model request per segment, then bridge it into the existing VN player and persisted `state.nia` using the same primary-channel ownership pattern as radio/live business.

**Tech Stack:** Vanilla JavaScript, browser DOM, Node `node:test`, existing SillyTavern host bridge.

---

### Task 1: Pure Audition Runtime

**Files:**
- Create: `nia-audition-core.js`
- Create: `tests/nia-audition-core.test.mjs`

- [ ] Write tests that require a deterministic eight-candidate runtime, four frozen score snapshots, final responsible-idol rank 1, legal segment transitions, interrupted-generation recovery, and idempotent settlement.
- [ ] Run `node --test tests/nia-audition-core.test.mjs` and confirm failure because the module does not exist.
- [ ] Implement `createAuditionRuntime`, `normalizeAuditionRuntime`, `beginAuditionSegment`, `applyAuditionSegment`, `completeAuditionPlayback`, `recoverInterruptedAudition`, and `settleAuditionOnce`.
- [ ] Run the core test and confirm it passes.

### Task 2: Main-Model Contract

**Files:**
- Create: `nia-audition-api.js`
- Create: `tests/nia-audition-api.test.mjs`

- [ ] Write tests for four segment duties, frozen score injection, strict `<NIA_AUDITION>` parsing, identity checks, and a complete fourth-segment result.
- [ ] Run `node --test tests/nia-audition-api.test.mjs` and confirm failure because the module does not exist.
- [ ] Implement `buildNiaAuditionSegmentPrompt` and `parseNiaAuditionSegmentPayload`, rejecting missing, mismatched, incomplete, or result-reopening payloads.
- [ ] Run the API test and confirm it passes.

### Task 3: Sixth-Day Frontend Flow

**Files:**
- Modify: `index.html`
- Modify: `app.js`
- Modify: `tests/nia-audition-flow.test.mjs`

- [ ] Write static integration tests requiring the sixth-day action button, persisted audition state/context, one owned request per segment, VN playback advancement, retry handling, refresh recovery, and once-only settlement.
- [ ] Run the flow test and confirm the missing frontend symbols fail.
- [ ] Load the two audition modules before `app.js`, extend default/normalized N.I.A state, and add an `nia_audition` action when the five-day plan is complete.
- [ ] Implement start, request, reply, VN playback completion, next-segment continuation, failure/retry, recovery, result display, and confirmation handlers.
- [ ] Run the flow test and existing N.I.A suites.

### Task 4: Verification

**Files:**
- Modify: `docs/superpowers/specs/2026-08-04-nia-first-audition-design.md`

- [ ] Update the design text so first place is the only advancement result throughout.
- [ ] Run `node --check app.js nia-audition-core.js nia-audition-api.js`.
- [ ] Run all N.I.A-related tests with `node --test tests/nia-*.test.mjs`.
- [ ] Exercise the sixth-day HUD and four-segment controls in the local browser at desktop and 390px widths; confirm no overlap or horizontal overflow.

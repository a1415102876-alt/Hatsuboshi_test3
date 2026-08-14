# N.I.A Formal Harness Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the N.I.A iframe from a self-owned API prototype into the formal third game mode backed by `state.nia`, the shared primary-model lease, Harness turn identity, and normal save recovery.

**Architecture:** Keep the tablet iframe as a presentation surface. Move plan submission, prompt dispatch, reply ownership, normalization, persistence, and recovery into `app.js`; synchronize a safe N.I.A state projection to the iframe through dedicated messages.

**Tech Stack:** Static HTML/CSS, vanilla JavaScript modules, existing SillyTavern bridge, Node built-in tests.

## Global Constraints

- Run automated tests after implementation, per the user's explicit request.
- Do not expose five-day actions or business simulation in this phase.
- Do not let the iframe create or submit request, lease, turn, save-scope, or session identities.
- Preserve existing classic and sandbox behavior and unrelated uncommitted work.

---

### Task 1: Formal mode and persistent N.I.A state

**Files:**
- Modify: `index.html`
- Modify: `app.js`

**Interfaces:**
- Produces: `createDefaultNiaState()`, `normalizeNiaState(raw)`, `state.nia`, and official mode copy.

- [ ] Rename the third launcher card and iframe controls from prototype/test copy to formal N.I.A mode copy.
- [ ] Add a normalized versioned N.I.A state containing round, phase, draft, plan, status, active request, error, and update timestamp.
- [ ] Normalize `state.nia` during load, save, host-state replacement, and reset paths used by the main application.

### Task 2: View-only iframe protocol

**Files:**
- Modify: `nia-prototype.html`
- Modify: `nia-prototype.js`
- Modify: `nia-prototype.css`

**Interfaces:**
- Produces: `niaViewReady`, `niaPlanSubmit`, and `niaStateSync` messages.

- [ ] Remove direct plan and business `sendPrompt` dispatch from the iframe.
- [ ] Submit only operation ID and draft values to the main application.
- [ ] Render idle, generating, retryable failure, and committed states from host projections.
- [ ] Hide later prototype stages and show a formal plan receipt after commit.
- [ ] Keep standalone file preview editable while blocking fake generation.

### Task 3: Harness-owned plan transaction

**Files:**
- Modify: `app.js`

**Interfaces:**
- Consumes: `buildNiaPlanPrompt`, `parseNiaPlanPayload`, and `normalizeApiPlan` loaded from the existing N.I.A API module.
- Produces: `submitNiaPlanFromView`, `dispatchNiaPlanPrompt`, `commitNiaPlanReply`, `failNiaPlanRequest`, and `postNiaStateSync`.

- [ ] Route validated iframe submissions through the main application's message handler.
- [ ] Acquire the shared primary model channel with `ownerKind: "nia_plan"` and save a matching Harness active turn.
- [ ] Dispatch through `requestHostPromptSend` with the acquired lease.
- [ ] Gate replies on owner, request, lease, turn, scope, and session before committing.
- [ ] Persist committed or retryable failure state and synchronize it back to the iframe.

### Task 4: End-of-work verification

**Files:**
- Modify: `tests/nia-host-bridge.test.mjs`
- Modify: `tests/nia-prototype.test.mjs`

**Interfaces:**
- Produces: Regression coverage for formal mode copy, view-only iframe messages, state normalization, shared lease ownership, reply gating, persistence, and standalone blocking.

- [ ] Add focused source and pure-helper assertions after implementation.
- [ ] Run JavaScript syntax checks.
- [ ] Run focused N.I.A, primary ownership, Harness bridge, launcher, and save tests.
- [ ] Run the full suite once and report any unrelated existing failure separately.
- [ ] Run `git diff --check` and inspect only scoped changes.

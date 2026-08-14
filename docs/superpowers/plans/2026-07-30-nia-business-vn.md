# N.I.A Business VN Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace mechanical business validation with a two-call main-API VN event containing one producer intervention and a bounded result.

**Architecture:** Add a focused parser/prompt module for the two N.I.A business phases, then register `nia_business` as an isolated transaction in the existing app/VN state machine. The N.I.A iframe starts the transaction and receives only the completed structured result.

**Tech Stack:** Vanilla JavaScript ES modules, existing SillyTavern host bridge, existing VN renderer, Node test runner.

---

### Task 1: Business API contract

**Files:**
- Create: `nia-business-api.js`
- Create: `tests/nia-business-api.test.mjs`

- [ ] Write failing tests for opening/result parsing, exactly four options, one problem, numeric clamping and malformed output.
- [ ] Run `node --test tests/nia-business-api.test.mjs` and confirm missing exports fail.
- [ ] Implement prompt builders, parsers and result normalization without any keyword scoring.
- [ ] Re-run the test and confirm all contract cases pass.

### Task 2: N.I.A iframe protocol

**Files:**
- Modify: `nia-prototype.js`
- Modify: `nia-prototype.html`
- Modify: `nia-prototype.css`
- Modify: `tests/nia-host-bridge.test.mjs`

- [ ] Add a failing protocol test for `startNiaBusiness`, `niaBusinessStatus` and `niaBusinessCompleted` messages.
- [ ] Replace the mechanical guidance controls with a start button, connection/status display and final result panel.
- [ ] Send the confirmed plan and selected business day to the parent; accept only the matching `businessId` result.
- [ ] Confirm direct standalone access explains that VN business generation requires the酒馆主页入口.

### Task 3: Existing VN integration

**Files:**
- Modify: `app.js`
- Modify: `tests/vn-flow.test.mjs`
- Create: `tests/nia-business-vn.test.mjs`

- [ ] Write failing tests that require `nia_business` to use the current VN overlay, four choices and custom input.
- [ ] Add an isolated N.I.A business session containing `businessId`, phase, context, opening story, problem, choices, selected action and request metadata.
- [ ] On `startNiaBusiness`, acquire the primary channel with `ownerKind=nia_business`, request phase one and show the existing VN loading state.
- [ ] Route option clicks and custom input to phase two only when the active VN action is `nia_business`.
- [ ] Parse phase two, play its story, then post the normalized result to the N.I.A iframe when playback completes.
- [ ] Keep regenerate phase-specific and preserve the chosen action when retrying the result call.

### Task 4: Host bridge and end-to-end verification

**Files:**
- Modify: `st.html` only if the existing generic forwarding does not carry the new iframe messages.
- Modify: `tests/nia-host-bridge.test.mjs`

- [ ] Verify the iframe-to-main-page message reaches `app.js` without creating a second API bridge.
- [ ] Verify committed replies and errors reach both the main page and N.I.A iframe with matching request metadata.
- [ ] Run `node --check` on every modified JS file.
- [ ] Run `node --test tests/nia-prototype.test.mjs tests/nia-business-api.test.mjs tests/nia-business-vn.test.mjs tests/nia-host-bridge.test.mjs tests/vn-flow.test.mjs`.
- [ ] From the酒馆主页, start one business, choose a system action, then repeat with custom input and confirm both return bounded results after VN playback.

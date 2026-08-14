# N.I.A Asari Plan Review VN Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Route a completed N.I.A plan through the existing Asari-sensei VN player before committing and displaying the polished plan.

**Architecture:** Persist a normalized plan as `pendingReviewPlan` with `planStatus: reviewing`, release the harness channel immediately, then derive VN slides from the existing `asariReview` fields. A single idempotent completion function commits the plan and restores the N.I.A iframe after normal playback, skip, refresh recovery, or missing VN DOM fallback.

**Tech Stack:** Vanilla JavaScript, existing SillyTavern harness bridge, existing VN player, Node.js built-in test runner.

## Global Constraints

- Use one harness request; do not issue a second model request for dialogue.
- Do not project `plan_ready` before the review VN finishes.
- Reuse the existing event overlay, Asari portrait resolver, VN controls, and campus background.
- Persist the pending review and make completion idempotent.
- Per user instruction, perform implementation continuously and run tests once at the end.

---

### Task 1: Add the persisted reviewing state

**Files:**
- Modify: `app.js:2361-2420`

**Interfaces:**
- Consumes: normalized N.I.A plan objects.
- Produces: `state.nia.pendingReviewPlan`, `planStatus: "reviewing"`, and `phase: "draft"` until review completion.

- [ ] Extend the default and normalization logic to accept `reviewing` and preserve only object-shaped pending plans.
- [ ] Ensure stale generated requests still recover without discarding a valid pending review.

### Task 2: Play and complete the Asari review

**Files:**
- Modify: `app.js:20582-20620`
- Modify: `app.js:21180-21220`

**Interfaces:**
- Consumes: `pendingReviewPlan.asariReview`.
- Produces: `buildNiaPlanReviewSlides(plan)`, `openNiaPlanReviewVn()`, and idempotent `completeNiaPlanReview()`.

- [ ] Change successful reply handling to persist the plan as reviewing, finish the harness turn, release the model channel, hide the iframe, and open VN without posting a ready projection.
- [ ] Build one narration and three Asari dialogue slides using accepted, gap, and advice with local fallbacks.
- [ ] Mark `state.pendingActionContext.action` as `nia_plan_review` so the existing campus background and slide-end router can identify the flow.
- [ ] On slide end, commit the pending plan, clear review state, close the event overlay, restore the iframe, save, and post state sync.
- [ ] If the VN container is missing, call the same completion function immediately.

### Task 3: Restore interrupted reviews and verify once

**Files:**
- Modify: `app.js` initialization/resume path
- Modify: `tests/nia-host-bridge.test.mjs`
- Modify: `tests/vn-flow.test.mjs`

**Interfaces:**
- Consumes: normalized persisted reviewing state.
- Produces: review playback recovery without another API request.

- [ ] Reopen the review VN after state initialization when `pendingReviewPlan` is valid and the plan is not committed.
- [ ] Add regression assertions for reviewing-before-commit, dynamic Asari slides, VN-end commit, iframe restoration, recovery, and missing-DOM fallback.
- [ ] Run once at the end: `node --test tests/nia-host-bridge.test.mjs tests/nia-prototype.test.mjs tests/vn-flow.test.mjs tests/launcher.test.mjs`.
- [ ] Run once at the end: `node --check app.js` and `git diff --check -- app.js tests/nia-host-bridge.test.mjs tests/vn-flow.test.mjs`.

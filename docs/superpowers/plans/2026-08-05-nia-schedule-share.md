# N.I.A. Schedule Share Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Require the committed five-day N.I.A. schedule to be sent as a persistent LINE attachment and acknowledged by the idol before Day 1 can start.

**Architecture:** Add a small pure core module that normalizes schedule-share data, creates the attachment, and builds the dedicated reaction prompt. Keep host dispatch and persistence in app.js, extend existing phone messages with one typed attachment kind, and replace the tablet's direct training start with an idempotent schedule-share gate.

**Tech Stack:** Browser JavaScript, CommonJS-compatible core module, HTML/CSS, Node built-in test runner.

---

### Task 1: Pure schedule-share core

**Files:**
- Create: nia-schedule-share-core.js
- Create: tests/nia-schedule-share-core.test.mjs
- Modify: index.html

- [ ] Write tests proving that the core maps a committed five-day plan into a fixed attachment, normalizes lifecycle states, rejects stale completion, and builds a reaction prompt that distinguishes today from future activities.
- [ ] Run node --test tests/nia-schedule-share-core.test.mjs and confirm it fails because the module does not exist.
- [ ] Implement a UMD core module exporting createScheduleShareState, normalizeScheduleShare, buildScheduleAttachment, buildScheduleReactionPrompt, beginScheduleShare, markScheduleShareFailed, and completeScheduleShare.
- [ ] Load the core before app.js in index.html.
- [ ] Run the core test and confirm it passes.

### Task 2: Persisted host lifecycle and training gate

**Files:**
- Modify: app.js
- Modify: tests/nia-schedule-share-flow.test.mjs
- Modify: tests/nia-training-flow.test.mjs

- [ ] Write integration assertions for default-state normalization, plan-scoped idempotency, attachment persistence before dispatch, retry without duplicate attachment, successful reply completion, and a dedicated Start Day 1 action.
- [ ] Run the two flow tests and confirm the new assertions fail.
- [ ] Add scheduleShare to createDefaultNiaState and normalizeNiaState.
- [ ] Change startNiaTrainingFromTablet to open the assigned idol thread, append the fixed attachment once, and dispatch the dedicated reaction prompt instead of activating training.
- [ ] Route schedule-share AI replies through the existing private-chat parser, set retryable_failed on terminal failure, and mark completed only after the last reply bubble is persisted.
- [ ] Add retryNiaScheduleShareReply and startNiaFirstDayAfterScheduleShare. The first reuses the fixed prompt without appending another attachment; the second is the only new UI path into startNiaTrainingFromCommittedPlan.
- [ ] Reconcile an awaiting reply after refresh into retryable_failed while preserving attachment IDs.
- [ ] Run the flow tests and confirm they pass.

### Task 3: LINE attachment card and contextual actions

**Files:**
- Modify: index.html
- Modify: style.css
- Modify: app.js
- Create: tests/nia-schedule-share-ui.test.mjs

- [ ] Write UI assertions for the attachment discriminator, five compact day rows, schedule-list preview, retry label, Start Day 1 action, and event wiring.
- [ ] Run node --test tests/nia-schedule-share-ui.test.mjs and confirm it fails.
- [ ] Add a phone-chat contextual action container beneath the message list.
- [ ] Render nia_schedule_attachment as an outgoing document card using the existing calendar icon and escaped plan fields.
- [ ] Render 重新获取回复 only for retryable_failed and 开始第一天 only for completed in the assigned idol thread; hide the ordinary composer during this mandatory pre-Day-1 flow.
- [ ] Add compact responsive CSS for the attachment and actions without changing ordinary message bubbles.
- [ ] Wire the two action buttons to retryNiaScheduleShareReply and startNiaFirstDayAfterScheduleShare.
- [ ] Run the UI test and confirm it passes.

### Task 4: Authoritative plan context and regression verification

**Files:**
- Modify: app.js
- Modify: tests/nia-schedule-share-flow.test.mjs
- Modify only if needed: st.html, shujuku-original-startup.html, tests/shujuku-harness-bridge.test.mjs

- [ ] Add tests proving later N.I.A. prompts receive a normalized block with current day, today's action, future activities, and the complete order.
- [ ] Add a shared buildNiaAuthoritativeScheduleContext helper and include it in N.I.A. work, training, business, and audition prompts that depend on the committed plan.
- [ ] Run all N.I.A., phone-chat, VN, fan-milestone, and bridge tests.
- [ ] Run git diff --check and inspect the scoped diff for unrelated edits.
- [ ] If runtime asset query strings require cache invalidation, update only the relevant startup versions and their regression assertion.

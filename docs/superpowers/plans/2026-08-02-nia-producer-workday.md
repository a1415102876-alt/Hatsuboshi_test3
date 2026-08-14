# N.I.A Producer Workday Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a three-period producer workday to the formal N.I.A route, with schedulable tasks, one main-API resolution per period, persistent work receipts, and a return to the five-day training flow.

**Architecture:** Add a pure UMD runtime for normalization, fallback task seeds, scheduling, and deterministic state transitions; add an ES module for the structured main-API prompt and last-tag parsing. Keep orchestration and SillyTavern lease ownership in `app.js`, while the existing N.I.A iframe renders the tablet/phone work UI and sends intent messages to the host.

**Tech Stack:** Vanilla HTML/CSS/JavaScript, SillyTavern postMessage bridge, existing host generation adapter, Node.js built-in test runner.

---

## File Map

- Create `nia-producer-work-core.js`: pure state normalization, first-round fallback tasks, schedule validation, period lookup, bounded reaction mapping, and receipt application.
- Create `nia-producer-work-api.js`: main-API prompt, last complete `<NIA_WORK_RESULT>` extraction, validation, and bounded normalization.
- Modify `nia-prototype-api.js`: ask the planning API for a first workday seed and preserve it on the normalized plan; keep a local fallback for older responses.
- Modify `nia-prototype-core.js`: update the first-round fallback day order to producer work, training, outing, online business, formal business.
- Modify `index.html` and `st.html`: load the producer runtime before `app.js`.
- Modify `app.js`: persist `state.nia.producerWork`, enter/resume a workday, validate iframe commands, own the primary-model request, apply final receipts once, show the result in the existing story overlay, and advance the N.I.A day only after all three periods.
- Modify `nia-prototype.html`, `nia-prototype.css`, and `nia-prototype.js`: render the three-period tablet schedule, task dossier, decision form, completion stamps, and phone-centered online operation.
- Create `tests/nia-producer-work-core.test.mjs`, `tests/nia-producer-work-api.test.mjs`, and `tests/nia-producer-work-flow.test.mjs`: focused contracts plus mode-isolation checks.

### Task 1: Pure Producer Work Runtime

**Files:**
- Create: `nia-producer-work-core.js`
- Create: `tests/nia-producer-work-core.test.mjs`

- [ ] Implement a UMD module exposed as `globalThis.HatsuNiaProducerWork` with:

```js
normalizeProducerWork(raw)
createSakiRoundOneWorkday(planDay)
assignTaskToPeriod(runtime, taskId, periodId)
clearFutureAssignment(runtime, periodId)
getCurrentPeriod(runtime)
getAssignedTask(runtime, periodId)
applyWorkReceipt(runtime, receipt)
getOnlineFanDelta(reaction)
```

The normalized runtime contains `status`, `dayIndex`, `periodIndex`, three period records, two or three tasks, a backlog, documents, materials, contacts, terms, careerLog, risks, pendingDecision, activeRequest, processedOperationIds, and `trainingSettled`. The first-round fallback uses the confirmed variety negotiation, Vlog preparation, location plan, and companion-training option. A fixed meeting occupies afternoon; preparation is optional; companion training can be assigned once.

- [ ] Add focused tests after implementation for old-save normalization, fixed appointment preservation, one companion-training limit, receipt idempotency, and bounded fan reaction mapping.

### Task 2: Work API Contract

**Files:**
- Create: `nia-producer-work-api.js`
- Create: `tests/nia-producer-work-api.test.mjs`

- [ ] Implement:

```js
buildNiaProducerWorkPrompt(context, task, period, decision)
parseNiaProducerWorkPayload(payload)
normalizeNiaProducerWorkReceipt(data, context)
```

The prompt requires a complete current-period story and a structured result containing `taskId`, `periodId`, `summary`, `completedPhase`, `reaction`, `documents`, `materials`, `contacts`, `terms`, `careerLog`, `risksAdded`, `risksResolved`, `followUps`, `nextBriefing`, and optional `reunionStory`. It forbids advancing time, resolving other tasks, inventing fan totals, or ending on a new unresolved scene. The parser searches each reply candidate from the end and selects the last complete `<NIA_WORK_RESULT>` block so reasoning examples cannot shadow the real payload.

- [ ] Add focused tests after implementation for last-tag selection, malformed result rejection, field bounds, and final-period reunion requirements.

### Task 3: Planning Seed And Script Order

**Files:**
- Modify: `nia-prototype-core.js`
- Modify: `nia-prototype-api.js`
- Modify: `tests/nia-prototype.test.mjs`

- [ ] Change the local first-round fallback order to:

```text
制作人工作 -> 陪同训练 -> 外出 -> 营业（线上预热） -> 营业（正式综艺）
```

- [ ] Extend the planning JSON contract so a producer-work day may include `workSeed` with bounded task dossiers and initial briefings. Preserve the seed in `normalizeApiPlan`; if absent, runtime initialization uses `createSakiRoundOneWorkday`.

- [ ] Keep external-outing details out of the planning prompt: the outing day may state only its narrative role and must not prescribe destination, topic, or action.

### Task 4: Host State, Lease, And Day Lifecycle

**Files:**
- Modify: `index.html`
- Modify: `st.html`
- Modify: `app.js`
- Create: `tests/nia-producer-work-flow.test.mjs`

- [ ] Load `nia-producer-work-core.js` before `app.js` in both direct and embedded launch paths, and import `nia-producer-work-api.js` lazily from `app.js`.

- [ ] Add `producerWork` to the default and normalized N.I.A state. Project only the data the iframe needs, including current plan day, work runtime, fan count, and idol identity.

- [ ] Route `nia_producer_work` from the formal N.I.A action button into `startNiaProducerWorkday()`. Initialize from `planDay.workSeed` or the local fallback, keep `training.actionIndex` unchanged, and open the existing N.I.A desk in workday mode.

- [ ] Accept only messages from the current N.I.A iframe for schedule updates and `niaProducerWorkExecute`. Validate current period, task, operation ID, decision text, host save scope, and primary-channel availability.

- [ ] Send one prompt with owner kind `nia_producer_work`, save the lease identity, and preserve the player's decision before dispatch. On a valid final reply, apply the receipt once, clear the lease, show the story in the existing event overlay, and sync the iframe. On invalid/error replies, retain the decision and mark the request retryable without consuming the period.

- [ ] When the third receipt closes, settle autonomous or accompanied training once, mark the workday complete, increment `training.actionIndex` once, and return to the formal N.I.A training view after the result overlay closes.

### Task 5: Tablet Schedule And Phone Operation UI

**Files:**
- Modify: `nia-prototype.html`
- Modify: `nia-prototype.css`
- Modify: `nia-prototype.js`
- Modify: `tests/nia-desk-phone.test.mjs`

- [ ] Add a workday page inside the existing tablet with a stable two-column layout: three schedule rows on the left and two or three task cards plus companion training on the right. Fixed appointments are prefilled and locked; future non-fixed rows expose assign/replace controls.

- [ ] Add a task dossier and decision form showing briefing, constraints, assets, boundaries, expected output, neutral presets, and free input. Do not show success probability or predicted fan reward.

- [ ] Add schedule confirmation and current-period execution states. Completed rows receive a visible stamp; only future assignments remain editable. Loading and retry states preserve all selected values.

- [ ] For online operation, focus the existing desk phone, render material/image-angle/voice/comment-policy controls inside it, and submit through the same work execution message. For planning/management keep the tablet central. External contact and companion training hide the iframe while the host story overlay is active.

- [ ] Render returned documents, messages, materials, contacts, and follow-up notes on the desk without nesting cards or shifting the tablet/phone geometry. Respect reduced motion and mobile constraints.

### Task 6: Integrated Review And Verification

**Files:**
- Test: `tests/nia-producer-work-core.test.mjs`
- Test: `tests/nia-producer-work-api.test.mjs`
- Test: `tests/nia-producer-work-flow.test.mjs`
- Test: existing N.I.A suites

- [ ] Run the focused producer-work tests and fix contract failures.

```powershell
node --test tests/nia-producer-work-core.test.mjs tests/nia-producer-work-api.test.mjs tests/nia-producer-work-flow.test.mjs
```

- [ ] Run the existing N.I.A regression group, including planning, host bridge, desk phone, training, and business tests.

```powershell
node --test tests/nia-prototype.test.mjs tests/nia-host-bridge.test.mjs tests/nia-desk-phone.test.mjs tests/nia-training-core.test.mjs tests/nia-training-flow.test.mjs tests/nia-training-ui.test.mjs tests/nia-business-api.test.mjs tests/nia-business-vn.test.mjs
```

- [ ] Start the existing local server and inspect the formal SillyTavern-hosted route: enter a committed first-round plan, open the producer-work day, adjust the schedule, execute all three periods, verify phone/tablet switching, confirm each request generates one reply, and ensure the fourth plan day becomes active only after the workday closes.

- [ ] Review the full diff for accidental changes to the user's existing dirty files, stale request acceptance, duplicate period settlement, non-N.I.A regressions, text overflow, and device overlap. Do not stage or revert unrelated user changes.

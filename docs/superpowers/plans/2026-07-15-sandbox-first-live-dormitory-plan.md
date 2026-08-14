# Sandbox First Live And Student Dormitory Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add the planned sandbox `校内舞台` First Live challenge and `学生宿舍` stamina recovery entrance without changing classic First Live or ordinary action settlement semantics.

**Architecture:** Extend the existing map location and facility-entry paths. First Live receives a dedicated deterministic challenge state and `sandbox_first_live` Harness turn; the dormitory delegates to the existing `rest` action path with a facility-specific time cost and stamina recovery. AI receives frozen authoritative results and cannot decide them.

**Tech Stack:** Existing browser JavaScript, DOM map overlays, `node:test`, current Harness ownership/recovery helpers.

### Task 1: State and pure First Live rules

**Files:** `app.js`, `tests/free-mode.test.mjs`

- Add normalized `state.sandbox.firstLiveChallenge` with status, cooldown, active attempt and bounded history.
- Add pure helpers for attribute contribution rates and average success rate.
- RED tests cover 399/400/499/500/599/600 boundaries, average rates, migration and one-time roll preservation.
- Run focused tests before implementation, then `node --check app.js` and `git diff --check`.

### Task 2: Map facilities and dormitory entry

**Files:** `app.js`, `tests/free-mode.test.mjs`, `style.css` only if existing map controls require styling

- Add `campus_stage` above the auditorium and `student_dormitory` above the dining hall.
- Extend location normalization, map labels and facility buttons.
- Dormitory validates 20:00+, non-full stamina, then delegates to the ordinary `rest` preparation with 120 minutes and +30 stamina capped at 100.
- RED tests cover time boundary, full stamina no-op, 30-point cap and no training-counter mutation.

### Task 3: Sandbox First Live deterministic settlement

**Files:** `app.js`, `tests/free-mode.test.mjs`, `tests/primary-model-ownership.test.mjs`

- Add a dedicated confirmation flow that acquires the primary model lease before any challenge mutation.
- Freeze stat snapshot, contribution rates, success rate and one random roll only after confirmation.
- Advance exactly 180 minutes, write success/failure and cooldown, and mirror successful completion into `state.firstLive` plus the existing `first_live_success` task.
- Reject occupied channels without changing input, UI, time, random state or logs.

### Task 4: First Live Prompt, Harness and recovery

**Files:** `app.js`, `index.html`, `tests/harness-recovery.test.mjs`, `tests/free-mode.test.mjs`

- Build one frozen prompt containing `live_pre` and `live_post` contracts and Director context only.
- Use `sandbox_first_live` owner/turn fields; keep requestId gating and exact lease release.
- Accept only complete dual-block replies. Missing/truncated/failed replies return to `recovery_required`; retry rotates requestId and preserves attemptId/turnId/prompt/result.
- Explicit narrative abandonment does not undo settled time, roll or challenge outcome.

### Task 5: UI and regression verification

**Files:** `index.html`, `style.css`, `tests/free-mode.test.mjs`, `tests/world-engine-phone-app.test.mjs`

- Add stage-specific status, stat snapshot, success rate, cooldown and confirmation copy to the existing map overlay.
- Keep controls hidden or disabled when no担当, too early, cooldown, completed, busy or recovery-required.
- Run all First Live, dormitory, map, Harness, ownership and full test suites. Existing six baseline failures remain the accepted baseline.

No change is planned for classic `startFirstLive()`, First Live rewards, queue/event-bus infrastructure, producer apartment rest, or unrelated side flows.

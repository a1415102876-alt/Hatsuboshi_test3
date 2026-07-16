# Director And LINE Grounding Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent truncated Director replies from being misreported as parse errors and prevent ungrounded proactive LINE messages from creating disposable, context-free chats.

**Architecture:** Keep Director extraction separate from strict contract validation, but classify incomplete marked output before JSON parsing and give Director requests a larger token budget. Ground fallback intents in actor-specific evidence, freeze a bounded context packet into each initiative candidate, and persist non-friend proactive contacts independently from unread candidate state.

**Tech Stack:** Vanilla browser JavaScript, SillyTavern host bridge, Node.js built-in test runner.

---

### Task 1: Director completion budget and parse diagnostics

**Files:**
- Modify: `app.js`
- Modify: `world/director-api.js`
- Test: `tests/world-director-api.test.mjs`
- Test: `tests/secondary-channel-owner.test.mjs`

- [ ] Add failing tests proving Director requests use at least 8000 tokens and retries use at least 12000 tokens.
- [ ] Add failing tests distinguishing `missing_output_start`, `output_truncated`, `invalid_json`, and successful complete JSON extraction.
- [ ] Run the focused tests and confirm failures are caused by the old 3200-token floor and nullable parser result.
- [ ] Return structured parse diagnostics while preserving strict `prepareDirectorPatch()` validation.
- [ ] Map incomplete marked content to `output_truncated` and retain retryable Director state.
- [ ] Re-run focused tests and require all pass.

### Task 2: Evidence-gated fallback intents

**Files:**
- Modify: `world/storyteller/initiative.js`
- Modify: `app.js`
- Test: `tests/storyteller-initiative.test.mjs`
- Test: `tests/idol-initiative-integration.test.mjs`

- [ ] Add failing tests proving actors without an actor-specific digest, prior LINE history, relationship event, or active Pressure receive no fallback intent.
- [ ] Add failing tests proving a grounded fallback freezes relevant evidence summaries and the correct relationship role.
- [ ] Run focused tests and confirm the current unconditional assigned-idol fallback fails them.
- [ ] Build fallback intents only from actor-specific evidence and pass bounded evidence into candidate delivery metadata.
- [ ] Re-run focused tests and require all pass.

### Task 3: Contextual proactive LINE and persistent temporary contacts

**Files:**
- Modify: `app.js`
- Modify: `world/storyteller/incidents.js`
- Test: `tests/idol-initiative-phone.test.mjs`
- Test: `tests/phone-chat.test.mjs`

- [ ] Add failing tests proving proactive LINE prompts state `responsible`, `assigned`, `friend`, or `known` correctly and include bounded relevant chronology plus recent thread history.
- [ ] Add failing tests proving a delivered non-friend initiative thread remains in the chat list after its candidate resolves.
- [ ] Run focused tests and confirm the prompt lacks context and the resolved thread disappears.
- [ ] Persist bounded `initiativeContacts` in `phoneChat`, create it on successful proactive delivery, and include it in thread definitions without mutating the friend list.
- [ ] Build proactive prompts from the frozen context packet, relationship role, relevant digests, Pressure summaries, and recent LINE history.
- [ ] Re-run focused tests and require all pass.

### Task 4: Verification

**Files:**
- Verify all modified modules and relevant suites.

- [ ] Run syntax checks for `app.js`, Director modules, and Storyteller initiative modules.
- [ ] Run Director, secondary channel, initiative, LINE, Storyteller, save migration, Harness, and Recovery tests.
- [ ] Run `git diff --check` and inspect the diff for raw reasoning text, private prompts, or automatic friend mutations.

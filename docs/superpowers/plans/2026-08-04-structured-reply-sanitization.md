# Structured Reply Sanitization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Commit only the mode-required structured result block for N.I.A producer work, regardless of the model's reasoning-tag format.

**Architecture:** Add one pure prompt-aware sanitizer in `st.html` and call it at each host generation boundary before validation or persistence. Preserve the unsanitized value only as diagnostic `rawText` in the frontend event.

**Tech Stack:** Vanilla JavaScript, Node.js test runner, `vm`-based host bridge tests.

---

### Task 1: Specify Producer-Work Extraction

**Files:**
- Modify: `tests/shujuku-harness-bridge.test.mjs`
- Modify: `st.html`

- [ ] **Step 1: Write the failing extraction test**

Add a test that evaluates `selectCommittedReplyForPrompt()` with a producer-work prompt and a response containing Spanish planning, `</konatan_planning~>`, one complete `NIA_WORK_RESULT`, and trailing tags. Assert that only the complete result block is returned.

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `node --test tests/shujuku-harness-bridge.test.mjs`

Expected: FAIL because `selectCommittedReplyForPrompt` does not exist.

- [ ] **Step 3: Implement the pure selector**

In `st.html`, add `selectCommittedReplyForPrompt(promptText, generatedText)`. When the prompt contains `[HATSU_OUTPUT_MODE:NIA_PRODUCER_WORK]`, return the last complete `<NIA_WORK_RESULT>...</NIA_WORK_RESULT>` block; otherwise return trimmed generated text.

- [ ] **Step 4: Run the focused test to verify it passes**

Run: `node --test tests/shujuku-harness-bridge.test.mjs`

Expected: PASS.

### Task 2: Apply the Selector at Host Commit Boundaries

**Files:**
- Modify: `tests/shujuku-harness-bridge.test.mjs`
- Modify: `st.html`

- [ ] **Step 1: Write failing adapter tests**

Add tests proving the silent and original-silent adapters pass selected text to assistant creation and database lifecycle calls, while `postCommittedReply.rawText` retains the raw response. Add a same-layer assertion that its native assistant is normalized before persistence.

- [ ] **Step 2: Run the focused tests to verify they fail**

Run: `node --test tests/shujuku-harness-bridge.test.mjs tests/shujuku-original-bridge.test.mjs`

Expected: FAIL because adapters still commit raw generated text.

- [ ] **Step 3: Implement minimal adapter integration**

Call the selector immediately after generation in both silent paths. In the same-layer path, select from the discovered assistant text and replace that exact assistant message before stamping and persistence. Validate and commit the selected text.

- [ ] **Step 4: Run focused and related suites**

Run: `node --test tests/shujuku-harness-bridge.test.mjs tests/shujuku-original-bridge.test.mjs tests/nia-producer-work-api.test.mjs tests/reply-extraction.test.mjs`

Expected: all tests PASS with zero failures.

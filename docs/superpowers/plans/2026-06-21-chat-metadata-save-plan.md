# Chat Metadata Save Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Share one produce save across desktop and mobile for the same SillyTavern chat.

**Architecture:** The iframe keeps localStorage as a cache and standalone fallback, but waits for a host handshake before posting saves. The host extension reads and writes a versioned envelope under `chat_metadata.hatsuboshi_produce_state_v1`, validates the chat scope, and persists through `saveMetadataDebounced()`.

**Tech Stack:** Vanilla JavaScript, SillyTavern chat metadata API, postMessage, Node test runner.

---

### Task 1: Failing synchronization policy tests

**Files:**
- Create: `tests/chat-metadata-save.test.mjs`
- Modify: `app.js`
- Modify: `public/scripts/extensions/third-party/hatsuboshi-produce/index.js`

- [ ] Extract and test `resolveHostState`: remote state wins; a local state with an idol migrates when remote is absent; an empty local state does not migrate.
- [ ] Extract and test `shouldAcceptHostSave`: only a plain state object with a matching nonempty scope can be written.
- [ ] Run the test and observe both missing-function failures.

### Task 2: Host metadata bridge

**Files:**
- Modify: `public/scripts/extensions/third-party/hatsuboshi-produce/index.js`

- [ ] Load `/script.js` and `/scripts/extensions.js` as module namespaces during extension initialization.
- [ ] Add metadata key `hatsuboshi_produce_state_v1` and send its state plus presence flag in the character handshake.
- [ ] Handle `saveState` messages only when their scope equals the current chat scope, then write `{ version, updatedAt, state }` and call `saveMetadataDebounced()`.
- [ ] On `CHAT_CHANGED`, clear pending request data and send the new chat handshake.

### Task 3: Frontend handshake and migration

**Files:**
- Modify: `app.js`

- [ ] Keep host writes disabled until a character handshake is received.
- [ ] Load remote state when present; otherwise migrate a scoped local state only when it has a selected idol.
- [ ] After synchronization, write every state change to localStorage and post the current scope and cloned state to the host.
- [ ] Reset the write gate before switching chat scope and preserve standalone local-only behavior.

### Task 4: Verification

**Files:**
- Test: `tests/chat-metadata-save.test.mjs`
- Test: `tests/idol-interaction.test.mjs`
- Test: `tests/idol-data.test.mjs`

- [ ] Run all three frontend test files.
- [ ] Run `node --check` for frontend and bridge scripts.
- [ ] Run `git diff --check` in the frontend repository.

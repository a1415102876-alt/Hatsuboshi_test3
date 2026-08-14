# TavernDB Social Tables Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the character-card TavernDB preset with directed character relationships and explicit commitments without duplicating chronicle or NIA-specific data.

**Architecture:** Keep the JSON artifact generated deterministically by the existing Node script. Add two SQLite-backed sheets to update group 1, remove producer relationship data from the dynamic-state sheet, and preserve the chronicle in update group 2.

**Tech Stack:** JSON, Node.js, Node test runner, SQLite CLI.

---

### Task 1: Expand The Preset Contract

**Files:**
- Modify: `tests/taverndb-character-template.test.mjs`

- [ ] **Step 1: Write the failing table-list assertion**

Assert the ordered table names are `角色动态状态表`, `角色关系表`, `约定与待办表`, `纪要表`, `偶像公众印象表`, and `营业履历表`.

- [ ] **Step 2: Add schema assertions**

Assert `角色关系表` uses `UNIQUE(subject_name, object_name)`, both new tables use update group 1, and `角色动态状态表` no longer contains `producer_relationship`.

- [ ] **Step 3: Verify the contract fails**

Run: `node --test tests/taverndb-character-template.test.mjs`

Expected: FAIL because the generated artifact still contains four tables and the old dynamic-state column.

### Task 2: Generate The Two New Tables

**Files:**
- Modify: `tasks/build-taverndb-character-template.mjs`
- Generate: `TavernDB_template_HATSUBOSHI_IDOL.json`

- [ ] **Step 1: Remove the duplicate relationship field**

Delete `producer_relationship` from the dynamic-state DDL, headers, notes, and SQL examples.

- [ ] **Step 2: Add the directed relationship sheet**

Define `character_relationship` with subject/object identity, familiarity stage, relationship tone, current attitude, key shared experiences, relationship basis, unresolved tension, and update reason. Configure keyword injection from both character-name columns.

- [ ] **Step 3: Add the explicit commitment sheet**

Define `character_commitment` with type, initiator, related characters, responsible party, content, context, due condition, status, completion result, and update reason. Retain completed/cancelled/expired rows and configure participant-based keyword injection.

- [ ] **Step 4: Regenerate the artifact**

Run: `node tasks/build-taverndb-character-template.mjs`

Expected: the JSON is rewritten deterministically with six ordered sheets.

### Task 3: Verify Structure And SQL

**Files:**
- Test: `tests/taverndb-character-template.test.mjs`

- [ ] **Step 1: Run structural tests**

Run: `node --test tests/taverndb-character-template.test.mjs`

Expected: six tests pass with no failures.

- [ ] **Step 2: Execute DDL and example mutations in SQLite**

Create all six tables in an in-memory SQLite database, execute each initialization example and allowed update example, then query row counts.

Expected: each table contains one valid row and SQLite exits with code 0.

- [ ] **Step 3: Verify deterministic output**

Hash the JSON, regenerate it, and compare hashes.

Expected: both SHA-256 values are identical.

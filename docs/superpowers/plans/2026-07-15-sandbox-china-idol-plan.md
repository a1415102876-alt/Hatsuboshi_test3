# Sandbox China Idol Integration Implementation Plan

> **For Codex:** Execute this plan in the current session with test-driven checkpoints and preserve all pre-existing worktree changes.

**Goal:** Add 仓本千奈 as a complete sandbox idol with a scout quest, three character-specific main quests, legacy-save migration, and authoritative publicity-commission progress.

**Architecture:** Extend the existing data-driven idol quest packs in `tasks/sandbox-tasks.js`. Narrative replies may confirm story beats, while commission success remains front-end-authoritative through `applySideQuestTier`. `app.js` only injects the task module's prompt addenda into scout and side-quest scenes.

**Tech Stack:** Browser JavaScript, Node.js built-in test runner, existing `HatsuTasks` global module.

---

### Task 1: Quest pack and save migration

- [x] Add failing tests for selectable idol data, default/migrated quest state, scout activation, and ordered double completion.
- [x] Add `scout_china`, `china_main_01..03`, `CHINA_PERSONAL_IDS`, and the two persisted progress flags.
- [x] Run `node --test tests/tasks-sandbox.test.mjs` and confirm the new state tests pass.

### Task 2: China-specific narrative contracts

- [x] Add failing tests for the scout truth/choice contract and three personal-quest prompt blocks.
- [x] Implement a China scout prompt addendum and inject it into `buildSandboxScoutExplorePrompt`.
- [x] Extend the main-quest prompt builder with the confirmed character beats and location limits.

### Task 3: Publicity commission settlement

- [x] Add failing tests for the boundary marker, qualifying commission detection, failed commissions, wrong idol, and automatic `china_main_03` completion.
- [x] Parse `china_advantage_boundary` and persist its flag.
- [x] Record successful qualifying publicity commissions in `applySideQuestTier`, then evaluate main quest 03.
- [x] Add a China publicity-scene addendum without delegating reward truth to generated prose.

### Task 4: Verification and handoff

- [x] Run syntax checks and focused task tests.
- [x] Run related free-mode, idol roster, multi-idol, and bond-route regressions.
- [x] Run `git diff --check`, review the complete worktree diff, and preserve unrelated existing changes.
- [x] Complete and archive the character-analysis quality review.

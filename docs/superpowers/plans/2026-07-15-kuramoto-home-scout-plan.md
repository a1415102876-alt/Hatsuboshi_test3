# Kuramoto Home Scout Location Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Open 仓本家 as a three-facility off-campus venue, route China scouting to its bedroom, and add 冰渡香名江 as the front-hall resident NPC with a built-in standee.

**Architecture:** Extend the existing `OFF_CAMPUS_TRANSIT_STATIONS` and `FREE_MODE_OUTING_VENUES` data models rather than creating a mansion-only page. Add a narrow scout bridge that allows China to leave campus and binds scout presence to `china_home/bedroom`; generalize outing-scene character resolution just enough to render and chat with resident NPCs.

**Tech Stack:** Browser JavaScript, existing fullscreen outing UI, Node.js built-in test runner.

---

### Task 1: Open 仓本家 and define facilities

**Files:**
- Modify: `app.js`
- Modify: `tests/off-campus-transit-layout.test.mjs`
- Modify: `tests/free-mode-outing-scene.test.mjs`

- [ ] Add failing assertions that `china_home` is named `仓本家`, has `status: "open"`, is a selectable destination, and defines `gate`, `front_hall`, and `bedroom` facilities with `gate` as the entrance.
- [ ] Run `node --test tests/off-campus-transit-layout.test.mjs tests/free-mode-outing-scene.test.mjs` and confirm the new assertions fail because the station is locked and no venue exists.
- [ ] Add the destination and venue data. Use `DEFAULT_OUTING_SCENE` for all three facilities so missing future backgrounds cannot produce broken requests.
- [ ] Re-run the two tests and confirm they pass.

### Task 2: Route China scout to the bedroom

**Files:**
- Modify: `world/campus-behavior.js`
- Modify: `app.js`
- Modify: `tests/free-mode.test.mjs`
- Modify: `tests/free-mode-outing-scene.test.mjs`

- [ ] Add failing tests for `SCOUT_OPENING_PRESENCE["仓本千奈"]` with `locationId: "china_home"` and `facilityId: "bedroom"`, China-only off-campus access during scout, and the bedroom default when selecting 仓本家.
- [ ] Run the focused tests and confirm they fail on the missing presence and scout route.
- [ ] Extend scout slots to preserve optional `facilityId`. Add helpers that recognize the active scout venue/facility and allow the school entrance to open off-campus only for China scouting.
- [ ] Branch 仓本家 selection during China scout to `openFreeModeOutingScene("china_home", "alone", { facilityId: "bedroom", selectedIdol: "仓本千奈" })`.
- [ ] Inject the existing China scout quest contract into outing explore/dialogue prompts only when the active venue/facility is `china_home/bedroom`; do not allow gate/front-hall completion tags.
- [ ] Re-run the focused tests and confirm they pass.

### Task 3: Add Kanae as a resident scene character

**Files:**
- Modify: `app.js`
- Modify: `tests/portrait-integration.test.mjs`
- Modify: `tests/free-mode-outing-scene.test.mjs`
- Add existing asset to Git scope: `assets/novel-standees/Hiwatari-Kanae.png`

- [ ] Add failing tests that `vnStandees` maps `冰渡香名江` to `Hiwatari-Kanae.png`, the front hall declares her as resident, the bedroom does not, and outing rendering uses `resolvePortraitForSpeaker` for NPCs.
- [ ] Run the focused tests and confirm they fail for the missing mapping and resident rendering.
- [ ] Register the standee and add `residentCharacters: ["冰渡香名江"]` to the front hall.
- [ ] Replace the outing scene's idol-only collection with a scene-character collection:同行担当 plus current facility residents, de-duplicated. Use `resolvePortraitForSpeaker` and keep the existing click menu and dialogue prompt, without changing affinity.
- [ ] Re-run the focused tests and confirm they pass.

### Task 4: Regression verification

**Files:**
- Modify: `docs/superpowers/plans/2026-07-15-kuramoto-home-scout-plan.md`

- [ ] Run `node --check app.js` and `node --check world/campus-behavior.js`.
- [ ] Run `node --test tests/off-campus-transit-layout.test.mjs tests/free-mode-outing-scene.test.mjs tests/portrait-integration.test.mjs tests/free-mode.test.mjs tests/tasks-sandbox.test.mjs`.
- [ ] Run related roster and integration tests: `node --test tests/idol-data.test.mjs tests/idol-roster.test.mjs tests/multi-idol-integration.test.mjs tests/multi-idol-ui.test.mjs`.
- [ ] Run `git diff --check` and review only the intended files while preserving all pre-existing worktree changes.
- [ ] Mark this checklist complete and report the pre-existing `st-loader-bridge` test gap separately if it remains.

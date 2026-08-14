# Producer Portrait Aliases Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add save-scoped custom speaker aliases for the current producer portrait.

**Architecture:** Extend the pure portrait appearance normalizer and speaker resolver first, then add a producer-only wardrobe editor that saves aliases independently from portrait assets. Keep the global portrait library, Prompt, Harness, and idol behavior unchanged.

**Tech Stack:** Browser JavaScript, HTML, CSS, Node test runner

---

### Task 1: Appearance schema and speaker resolution

**Files:**
- Modify: `appearance/portrait-wardrobe.js`
- Modify: `app.js`
- Test: `tests/portrait-wardrobe.test.mjs`
- Test: `tests/portrait-integration.test.mjs`

- [ ] Add RED tests proving schema v1 migration preserves `equipped`, aliases normalize to at most 12 unique 40-character values, and a custom alias resolves to `producer`.
- [ ] Run `node --test tests/portrait-wardrobe.test.mjs tests/portrait-integration.test.mjs`; expect the new assertions to fail because bindings are discarded and the resolver has no alias input.
- [ ] Add `normalizeProducerAliases()`, return appearance schema v2 with `bindings.producer.aliases`, and accept an optional custom-alias argument in `characterKeyForSpeaker()` without breaking existing callers.
- [ ] Pass saved producer aliases from `resolvePortraitForSpeaker()` and derive producer nameplate styling from the resolved character key.
- [ ] Re-run both tests; expect all cases to pass.

### Task 2: Producer-only wardrobe alias editor

**Files:**
- Modify: `index.html`
- Modify: `style.css`
- Modify: `app.js`
- Test: `tests/portrait-wardrobe-ui.test.mjs`

- [ ] Add RED tests for producer-only visibility, immutable defaults, custom tag removal, idol-name rejection, and `saveState("portrait.aliases")` on explicit save.
- [ ] Run `node --test tests/portrait-wardrobe-ui.test.mjs`; expect the new tests to fail because the editor does not exist.
- [ ] Add the alias editor markup and restrained tag/input/button styles inside the existing wardrobe controls.
- [ ] Add draft alias state and pure add/remove/save helpers. Reject empty, overlong, over-limit, duplicate, default, and canonical-idol aliases without mutating saved state.
- [ ] Render the editor only for `selectedCharacterKey === "producer"`; wire Enter, remove, and save events. Keep portrait apply/upload behavior independent.
- [ ] Re-run the UI tests; expect all cases to pass.

### Task 3: Verification

**Files:**
- Verify only

- [ ] Run `node --test tests/portrait-wardrobe.test.mjs tests/portrait-integration.test.mjs tests/portrait-wardrobe-ui.test.mjs tests/portrait-upload-controller.test.mjs tests/portrait-host-bridge.test.mjs`.
- [ ] Run `node --check app.js`.
- [ ] Run `git diff --check` and inspect `git diff -- appearance/portrait-wardrobe.js app.js index.html style.css tests docs`.
- [ ] Manually verify in SillyTavern: add an alias, save, render a dialogue with that exact `char`, switch outfit, refresh, and confirm the alias still resolves to the current producer portrait.

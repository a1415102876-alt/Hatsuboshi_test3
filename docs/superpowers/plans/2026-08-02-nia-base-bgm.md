# N.I.A Base BGM Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Use the supplied N.I.A office track as the default BGM from N.I.A scenario selection through the N.I.A route while preserving scene-specific music priority.

**Architecture:** Register one additional track in the existing BGM manager and centralize N.I.A base-context detection in a small helper. Keep all playback, volume, mute, autoplay recovery, and crossfade behavior in the existing manager.

**Tech Stack:** Vanilla JavaScript, HTML Audio, MP3 assets, Node.js tests.

---

### Task 1: Add failing BGM route tests

**Files:**
- Create: `tests/nia-bgm.test.mjs`

- [ ] Assert that `assets/bgm/nia-office.mp3` exists and is non-empty.
- [ ] Assert that `BGM_CONFIG.nia_base` points at that file.
- [ ] Assert that N.I.A preview and confirmed N.I.A route select `nia_base`, while other scenario selection uses `select`.
- [ ] Assert that scene-specific BGM branches occur before the N.I.A default fallback.
- [ ] Run `node --test tests/nia-bgm.test.mjs` and verify failure because the asset and route do not exist.

### Task 2: Copy the asset and route the existing manager

**Files:**
- Create: `assets/bgm/nia-office.mp3`
- Modify: `app.js`

- [ ] Copy the supplied MP3 byte-for-byte into `assets/bgm/nia-office.mp3`.
- [ ] Register `nia_base` in `BGM_CONFIG`.
- [ ] Add N.I.A preview/base-context helpers and use them in selection and ordinary fallback branches.
- [ ] Trigger `updateBgm()` when preview selection or selection-panel ownership changes.
- [ ] Run `node --test tests/nia-bgm.test.mjs` and verify pass.

### Task 3: Verify regressions

**Files:**
- Verify: `app.js`
- Verify: `assets/bgm/nia-office.mp3`
- Verify: `tests/nia-bgm.test.mjs`

- [ ] Run `node --check app.js`.
- [ ] Run N.I.A, scenario-selection, launch-mode and BGM tests.
- [ ] Compare source and copied asset SHA-256 hashes.
- [ ] Run `git diff --check` on text files.

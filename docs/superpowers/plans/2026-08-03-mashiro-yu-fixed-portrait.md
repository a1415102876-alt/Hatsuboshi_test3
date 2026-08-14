# Mashiro Yu Fixed Portrait Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every supported VN speaker form for 真诚优 resolve to the previously supplied full-body PNG while retaining the separate square avatar for compact broadcast UI.

**Architecture:** Reuse the existing built-in NPC portrait registry and alias normalization path in `app.js`. Store the supplied bitmap in the stable `assets/novel-standees` directory, then verify both exact alias resolution and asset identity in the existing portrait integration suite.

**Tech Stack:** Vanilla JavaScript, Node.js test runner, PNG assets.

---

### Task 1: Install the formal standee asset

**Files:**
- Create: `assets/novel-standees/mashiro-yu.png`

- [x] **Step 1: Copy the approved source bitmap**

Copy `E:\download\ChatGPT Image 2026年8月3日 21_58_27.png` byte-for-byte to `assets/novel-standees/mashiro-yu.png`.

- [x] **Step 2: Verify asset identity**

Run:

```powershell
Get-FileHash -Algorithm SHA256 'E:\download\ChatGPT Image 2026年8月3日 21_58_27.png', 'assets\novel-standees\mashiro-yu.png'
```

Expected: both hashes equal `E09229F33D5C4547F9A210061E6A6BF6D34932E38F77EB3370C0AEFDB435B9B8`.

### Task 2: Register the NPC portrait and aliases

**Files:**
- Modify: `app.js`

- [x] **Step 1: Add the built-in standee**

Add this entry to `vnStandees`:

```js
"真诚优": "./assets/novel-standees/mashiro-yu.png"
```

- [x] **Step 2: Add exact speaker aliases**

Add these entries to `vnSpeakerAliases`:

```js
"优": "真诚优",
"优前辈": "真诚优",
"Mashiro Yu": "真诚优"
```

The existing `resolvePortraitForSpeaker` function then returns `npc:真诚优` for all four exact names. No substring matching is added.

### Task 3: Add regression coverage and verify

**Files:**
- Modify: `tests/portrait-integration.test.mjs`

- [x] **Step 1: Extend the test sandbox**

Add the same standee and aliases to the isolated `vnStandees` and `vnSpeakerAliases` fixtures.

- [x] **Step 2: Add the successful-resolution assertions**

For `真诚优`, `优`, `优前辈`, and `Mashiro Yu`, assert:

```js
resolved.characterKey === "npc:真诚优"
resolved.url === "./assets/novel-standees/mashiro-yu.png"
resolved.source === "builtin"
```

Also assert that an unrelated speaker such as `优秀学生` does not resolve, and that the formal PNG exists.

- [x] **Step 3: Run completed implementation tests**

Per the user's request, do not run an intentional failing test stage. After implementation run:

```powershell
node --test tests/portrait-integration.test.mjs tests/vn-flow.test.mjs
```

Expected: all tests pass.

- [x] **Step 4: Check source formatting and stale paths**

Run:

```powershell
git diff --check
rg -n "\.superpowers/brainstorm/radio-ui-20260803/content/mashiro-yu\.png" app.js index.html
```

Expected: no diff errors and no runtime reference to the brainstorm asset.

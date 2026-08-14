# Asari Portrait Aliases Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `亚纱里老师`, `亚纱里`, and `根绪亚纱里` resolve to the same built-in Asari VN portrait and character key.

**Architecture:** Add a focused NPC speaker alias map beside `vnStandees`, then normalize only the NPC lookup path inside `resolvePortraitForSpeaker`. Keep the original speaker string for dialogue display and keep idol canonicalization unchanged.

**Tech Stack:** Browser JavaScript, Node.js built-in test runner, VM-based integration tests.

---

### Task 1: Resolve Asari Speaker Aliases

**Files:**
- Modify: `app.js:284`
- Modify: `app.js:12649`
- Test: `tests/portrait-integration.test.mjs:83`

- [ ] **Step 1: Write the failing alias test**

Extend the NPC portrait test so all supported names must share one character key and URL:

```js
for (const speaker of ["亚纱里老师", "亚纱里", "根绪亚纱里"]) {
  const resolved = sandbox.api.resolvePortraitForSpeaker(speaker);
  assert.equal(resolved.characterKey, "npc:亚纱里老师");
  assert.equal(resolved.url, "./assets/novel-standees/asari-sensei.png");
  assert.equal(resolved.source, "builtin");
}
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```powershell
node --test tests/portrait-integration.test.mjs
```

Expected: FAIL because `亚纱里` and `根绪亚纱里` currently return an empty portrait.

- [ ] **Step 3: Add the minimal NPC alias normalization**

Add the alias map beside `vnStandees`:

```js
const vnSpeakerAliases = {
  "亚纱里": "亚纱里老师",
  "根绪亚纱里": "亚纱里老师"
};
```

In `resolvePortraitForSpeaker`, use the mapped NPC name only for the non-idol standee lookup:

```js
const npcSpeaker = vnSpeakerAliases[String(speaker || "").trim()] || canonicalSpeaker;
```

Build the NPC character key from `npcSpeaker`, while retaining the original `speaker` property in the returned object.

- [ ] **Step 4: Run focused and full portrait tests**

Run:

```powershell
node --test tests/portrait-integration.test.mjs
node --check app.js
```

Expected: all portrait integration tests pass and the syntax check exits with code 0.

- [ ] **Step 5: Run N.I.A regression tests**

Run:

```powershell
$files = Get-ChildItem tests -Filter 'nia-*.test.mjs' | ForEach-Object { $_.FullName }
node --test $files
```

Expected: all N.I.A tests pass with zero failures.

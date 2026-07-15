# Asari VN Portrait Regression Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore 亚纱里老师's built-in VN standee without adding her to idol business state or the portrait wardrobe UI.

**Architecture:** Extend the existing unified speaker resolver with a namespaced `npc:` fallback sourced only from `vnStandees`. Register the same NPC keys in the built-in portrait map so the existing `resolvePortrait()` and image application path remain unchanged.

**Tech Stack:** Vanilla JavaScript, Node.js built-in test runner, `vm`-based integration tests.

---

### Task 1: Reproduce and Fix NPC Speaker Resolution

**Files:**
- Modify: `tests/portrait-integration.test.mjs`
- Modify: `app.js`

- [ ] **Step 1: Write the failing regression test**

Extend the integration sandbox with an NPC-only standee and assert the exact public result:

```js
vnStandees: {
  "idol-a": "./assets/novel-standees/idol-a.png",
  "亚纱里老师": "./assets/novel-standees/asari-sensei.png"
}

test("speaker resolver preserves built-in VN portraits for non-idol NPCs", () => {
  const sandbox = loadIntegration();
  const resolved = sandbox.api.resolvePortraitForSpeaker("亚纱里老师");
  assert.equal(resolved.characterKey, "npc:亚纱里老师");
  assert.equal(resolved.url, "./assets/novel-standees/asari-sensei.png");
  assert.equal(resolved.source, "builtin");
  assert.equal(sandbox.api.resolvePortraitForSpeaker("未知老师").url, "");
});
```

- [ ] **Step 2: Run the test and verify the regression is real**

Run: `node --test --test-name-pattern="non-idol NPCs" tests/portrait-integration.test.mjs`

Expected: FAIL because the current resolver returns an empty `characterKey` and URL for 亚纱里老师.

- [ ] **Step 3: Register namespaced built-in NPC portraits**

Update `getBuiltinPortraitMap()` without adding NPCs to `idols`:

```js
function getBuiltinPortraitMap() {
  const builtins = { producer: "./assets/novel-standees/producer.png" };
  Object.keys(idols).forEach((name) => {
    const url = resolveIdolStandeeSrc(name);
    if (url) builtins[`idol:${name}`] = url;
  });
  Object.entries(vnStandees).forEach(([name, url]) => {
    const canonical = canonicalIdolName(name);
    if (canonical && !idols[canonical] && url) builtins[`npc:${canonical}`] = url;
  });
  return builtins;
}
```

- [ ] **Step 4: Fall back to the NPC key in the unified resolver**

Resolve the normal producer/idol key first, then use an NPC key only when `vnStandees` contains the canonical speaker:

```js
const canonicalSpeaker = canonicalIdolName(speaker);
const standardKey = globalThis.HatsuPortraits.characterKeyForSpeaker(
  speaker,
  state.producer?.name,
  canonicalIdolName,
  (name) => Boolean(idols[name]),
  appearance.bindings.producer.aliases
);
const characterKey = standardKey || (
  canonicalSpeaker && !idols[canonicalSpeaker] && vnStandees[canonicalSpeaker]
    ? `npc:${canonicalSpeaker}`
    : ""
);
```

- [ ] **Step 5: Run focused portrait and VN tests**

Run: `node --test tests/portrait-integration.test.mjs tests/vn-flow.test.mjs tests/launch-mode.test.mjs`

Expected: all tests pass, including the new NPC regression.

- [ ] **Step 6: Run syntax, diff, and full baseline checks**

Run:

```powershell
node --check app.js
git diff --check
$files = (Get-ChildItem -LiteralPath tests -Filter '*.test.mjs').FullName
node --test $files
```

Expected: no new failures beyond the six documented baseline failures.

- [ ] **Step 7: Commit the fix**

```powershell
git add -- app.js tests/portrait-integration.test.mjs docs/current-handoff.md
git commit -m "Fix Asari VN portrait resolution"
```

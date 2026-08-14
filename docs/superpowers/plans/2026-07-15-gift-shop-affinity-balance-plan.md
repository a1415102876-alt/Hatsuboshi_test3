# Gift Shop Affinity Balance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Double every gift shop item's affinity value and give NPC recipients the same full affinity gain as idol recipients.

**Architecture:** Keep `shop/gift-shop.js` as the single source of truth for catalog values and gift settlement. Update the catalog's explicit values so UI and settlement stay aligned, then make `getGiftAffinityGain` recipient-agnostic.

**Tech Stack:** Browser JavaScript, Node.js built-in test runner, `node:assert/strict`

---

### Task 1: Rebalance Gift Affinity

**Files:**
- Modify: `tests/gift-shop.test.mjs`
- Modify: `shop/gift-shop.js`

- [x] **Step 1: Write the failing catalog and recipient tests**

Replace the existing gift settlement assertions with explicit doubled values and add a complete catalog assertion:

```js
test("gift shop catalog uses doubled affinity values", () => {
  const shop = loadGiftShop();
  assert.deepEqual(
    Array.from(shop.GIFT_CATALOG, ({ id, affinity }) => [id, affinity]),
    [
      ["muscle_patch", 2],
      ["bottled_tea", 4],
      ["study_sticker", 4],
      ["pudding_cup", 6],
      ["fan_badge", 6],
      ["cookie_box", 8],
      ["star_hairpin", 10],
      ["throat_tea", 10],
      ["memory_album", 12],
      ["limited_plush", 16]
    ]
  );
});

test("npc gifts receive the same full affinity gain as idol gifts", () => {
  const shop = loadGiftShop();
  const item = shop.getCatalogItem("memory_album");
  assert.equal(shop.getGiftAffinityGain(item, "idol"), 12);
  assert.equal(shop.getGiftAffinityGain(item, "npc"), 12);
});
```

Update the existing `cookie_box` gift assertion from `4` to `8`.

- [x] **Step 2: Run the test to verify it fails**

Run: `node --test tests/gift-shop.test.mjs`

Expected: FAIL because the catalog still contains the old affinity values and NPC gains are still reduced.

- [x] **Step 3: Implement the minimal balance change**

In `shop/gift-shop.js`, replace the catalog affinities with:

```js
2, 4, 4, 6, 6, 8, 10, 10, 12, 16
```

Make affinity settlement independent of recipient type:

```js
function getGiftAffinityGain(item) {
  return Math.max(1, Number(item?.affinity) || 1);
}
```

- [x] **Step 4: Run focused verification**

Run: `node --test tests/gift-shop.test.mjs`

Expected: all gift shop tests pass.

Run: `node --check shop/gift-shop.js`

Expected: exit code 0 with no syntax errors.

Run: `git diff --check -- shop/gift-shop.js tests/gift-shop.test.mjs`

Expected: exit code 0 with no whitespace errors.

- [x] **Step 5: Review the scoped diff**

Run: `git diff -- shop/gift-shop.js tests/gift-shop.test.mjs`

Expected: only doubled affinity values, removal of the NPC reduction, and matching test expectations.

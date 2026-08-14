# Apartment Wardrobe Trigger Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Place the apartment wardrobe trigger directly below the phone trigger in the right-side action column and localize its visible copy.

**Architecture:** Preserve the existing apartment hotspot DOM and JavaScript event binding. Add a focused source-level UI test, then make the smallest HTML and CSS changes needed to give the wardrobe button explicit right-side positioning.

**Tech Stack:** Static HTML, CSS, Node.js built-in test runner.

---

### Task 1: Position and localize the wardrobe trigger

**Files:**
- Modify: `tests/portrait-wardrobe-ui.test.mjs`
- Modify: `index.html:379-382`
- Modify: `style.css:9686`

- [ ] **Step 1: Write the failing test**

Add a test that extracts the apartment hotspot container and asserts the summary, phone, and wardrobe order; checks the Chinese wardrobe trigger copy; and checks that `#apartmentWardrobeBtn` has `right: 4%` plus `bottom: calc(10% + env(safe-area-inset-bottom))`.

```js
test("apartment wardrobe trigger follows the right-side phone action", () => {
  const hotspots = html.match(/<div class="producer-apartment-hotspots"[\s\S]*?<\/div>/)?.[0] || "";
  assert.ok(hotspots.indexOf('id="apartmentDaySummaryBtn"') < hotspots.indexOf('id="apartmentPhoneBtn"'));
  assert.ok(hotspots.indexOf('id="apartmentPhoneBtn"') < hotspots.indexOf('id="apartmentWardrobeBtn"'));
  assert.match(hotspots, /id="apartmentWardrobeBtn"[\s\S]*?<span class="apartment-hotspot-kicker">衣柜<\/span>[\s\S]*?<strong>立绘衣柜<\/strong>/);
  assert.match(css, /#apartmentWardrobeBtn\s*\{[^}]*right:\s*4%;[^}]*bottom:\s*calc\(10% \+ env\(safe-area-inset-bottom\)\)/);
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node --test tests/portrait-wardrobe-ui.test.mjs`

Expected: the new test fails because the wardrobe trigger has no explicit right/bottom positioning and still contains English copy.

- [ ] **Step 3: Implement the minimal presentation change**

Update the existing button without changing its ID or class:

```html
<button id="apartmentWardrobeBtn" class="apartment-hotspot is-wardrobe" type="button" title="管理制作人与担当偶像的立绘。">
  <span class="apartment-hotspot-kicker">衣柜</span>
  <strong>立绘衣柜</strong>
</button>
```

Give the existing wardrobe-specific rule explicit placement while preserving its accent:

```css
#apartmentWardrobeBtn {
  right: 4%;
  bottom: calc(10% + env(safe-area-inset-bottom));
  border-color: rgba(65, 167, 133, 0.56);
}
```

- [ ] **Step 4: Run focused and regression verification**

Run: `node --test tests/free-mode.test.mjs tests/portrait-wardrobe-ui.test.mjs`

Expected: all tests pass.

Run: `node --check app.js`

Expected: exit code 0.

Run: `git diff --check`

Expected: exit code 0.

- [ ] **Step 5: Review the final diff**

Run: `git diff -- index.html style.css tests/portrait-wardrobe-ui.test.mjs`

Expected: only the localized trigger copy, wardrobe positioning rule, and focused test are added for this task; unrelated existing working-tree changes remain intact.

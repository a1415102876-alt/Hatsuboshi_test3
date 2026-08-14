# Stat Meter Ring Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Vo/Da/Vi full-circle conic meters with bottom-gap rounded SVG arcs and optically center the rating Sprite.

**Architecture:** Keep the existing `renderStatMeters()` data flow and add a decorative two-circle SVG to each meter. Compute the visible 270-degree progress length in JavaScript, expose it as a CSS custom property, and let CSS own stroke geometry and visual alignment.

**Tech Stack:** Vanilla JavaScript, HTML SVG, CSS custom properties, Node test runner, in-app browser.

---

### Task 1: SVG Rating Meter

**Files:**
- Modify: `tests/stat-meter-ui.test.mjs`
- Modify: `app.js:15790`
- Modify: `style.css:1164`

- [ ] **Step 1: Write the failing visual-contract test**

Add these assertions to `tests/stat-meter-ui.test.mjs`:

```js
assert.match(appSource, /const meterProgress = pct \* 0\.75/);
assert.match(appSource, /card\.style\.setProperty\("--meter-progress", String\(meterProgress\)\)/);
assert.match(appSource, /<svg class="meter-ring" viewBox="0 0 112 112"/);
assert.match(appSource, /class="meter-ring-track"[^>]+pathLength="100"/);
assert.match(appSource, /class="meter-ring-progress"[^>]+pathLength="100"/);
assert.match(cssSource, /\.meter-ring-track\s*\{[^}]*stroke-dasharray:\s*75 25/s);
assert.match(cssSource, /\.meter-ring-progress\s*\{[^}]*stroke-dasharray:\s*var\(--meter-progress\) 100/s);
assert.match(cssSource, /stroke-linecap:\s*round/);
assert.match(appSource, /const ratingSpriteOffsets = \{/);
assert.match(appSource, /--rank-shift-x:\$\{rankShiftX\}%;--rank-shift-y:\$\{rankShiftY\}%/);
assert.match(cssSource, /\.meter-rank\s*\{[^}]*inset:\s*10px[^}]*translate\(var\(--rank-shift-x\), var\(--rank-shift-y\)\)/s);
assert.doesNotMatch(cssSource, /\.meter-arc\s*\{[^}]*conic-gradient/s);
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```powershell
node --test tests/stat-meter-ui.test.mjs
```

Expected: FAIL because the SVG ring markup and CSS stroke rules do not exist yet.

- [ ] **Step 3: Add the SVG markup and progress value**

In `renderStatMeters()`, add the 270-degree progress length and SVG:

```js
const meterProgress = pct * 0.75;
card.style.setProperty("--meter-progress", String(meterProgress));
```

```html
<div class="meter-arc" aria-label="评级 ${rank}">
  <svg class="meter-ring" viewBox="0 0 112 112" aria-hidden="true">
    <circle class="meter-ring-track" cx="56" cy="56" r="43" pathLength="100"></circle>
    <circle class="meter-ring-progress" cx="56" cy="56" r="43" pathLength="100"></circle>
  </svg>
  <div class="meter-rank" style="--rank-image:url('${ratingSpriteUrl}');--rank-x:${rankX}%;--rank-y:${rankY}%" aria-hidden="true"></div>
</div>
```

- [ ] **Step 4: Replace the conic ring with rounded SVG strokes**

Update the meter styles to this geometry:

```css
.meter-arc {
  position: relative;
  width: min(100%, 112px);
  aspect-ratio: 1;
  margin: 0 auto -15px;
}

.meter-ring {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  overflow: visible;
  transform: rotate(135deg);
}

.meter-ring-track,
.meter-ring-progress {
  fill: none;
  stroke-linecap: round;
}

.meter-ring-track {
  stroke: rgba(57, 56, 60, 0.9);
  stroke-width: 16;
  stroke-dasharray: 75 25;
}

.meter-ring-progress {
  stroke: var(--meter-color);
  stroke-width: 11;
  stroke-dasharray: var(--meter-progress) 100;
}

.meter-rank {
  inset: 10px;
  transform: translate(var(--rank-shift-x), var(--rank-shift-y));
}
```

Remove the `.meter-arc` conic gradient, white outline shadow, and `.meter-arc::before` center fill.

- [ ] **Step 5: Run focused automated checks and verify GREEN**

Run:

```powershell
node --test tests/stat-meter-ui.test.mjs
node --check app.js
git diff --check -- app.js style.css tests/stat-meter-ui.test.mjs
```

Expected: one test passes, JavaScript syntax exits 0, and diff check exits 0 apart from an optional line-ending warning.

- [ ] **Step 6: Calibrate in the browser**

Reload `http://127.0.0.1:8765/` at desktop width. Verify all three meters use a lower-left start, clockwise top arc, lower-right finish, rounded caps, and centered rank glyphs. Adjust only `stroke-width`, `.meter-rank` inset, or the per-rank optical offsets if the screenshot comparison shows a mismatch.

- [ ] **Step 7: Review the scoped diff without committing**

Run:

```powershell
git diff -- app.js style.css tests/stat-meter-ui.test.mjs
```

Expected: only the rating-meter additions from this task appear alongside the pre-existing uncommitted UI work. Do not stage or commit the overlapping files unless the user explicitly requests it.

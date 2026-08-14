# N.I.A Logo Shimmer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a gold shimmer clipped inside the NIA title and reveal `NEXT IDOL AUDITION` one character at a time during the existing entry transition.

**Architecture:** Keep the existing transition owner and fullscreen launch flow. Add semantic character spans to the subtitle, implement both effects with CSS animations and custom delay variables, and extend the existing JavaScript timeout to match the 1.6-second visual timeline.

**Tech Stack:** HTML, CSS animations, vanilla JavaScript, Node.js built-in test runner.

## Global Constraints

- Keep the purple diagonal card, yellow star, fullscreen mount, and entry callback behavior.
- Do not restore sliders, fragments, ribbons, or camera movement.
- Clip the gold shimmer to the NIA glyphs; do not add an outline.
- Use a 1.6-second standard timeline and retain `prefers-reduced-motion` support.
- Do not add libraries or bitmap assets.

---

### Task 1: Encode the shimmer and character reveal contract

**Files:**
- Modify: `tests/nia-host-bridge.test.mjs`
- Test: `tests/nia-host-bridge.test.mjs`

**Interfaces:**
- Consumes: existing `indexHtml`, `styleCss`, and `appJs` fixture strings.
- Produces: assertions for `.nia-entry-subtitle-char`, `--char-index`, `niaEntryGoldShimmer`, `background-clip: text`, stagger delay, and 1600ms completion.

- [ ] **Step 1: Write the failing test**

Add assertions to the existing entry-transition test that require character spans with `aria-hidden`, an intact subtitle `aria-label`, CSS glyph clipping and shimmer keyframes, a delay calculated from `--char-index`, and `finishDelay` set to `1600`.

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/nia-host-bridge.test.mjs`

Expected: FAIL because character spans and `niaEntryGoldShimmer` do not exist and the timeout is still 1250ms.

### Task 2: Implement the approved motion timeline

**Files:**
- Modify: `index.html:1709-1714`
- Modify: `style.css:6549-6624`
- Modify: `app.js:2865-2885`
- Test: `tests/nia-host-bridge.test.mjs`

**Interfaces:**
- Consumes: character order through inline CSS property `--char-index`.
- Produces: a 1.6-second transition where the NIA shimmer begins after title entry, subtitle characters stagger at 25ms, and reduced motion removes both moving and staggered effects.

- [ ] **Step 1: Add accessible character markup**

Keep `aria-label="NEXT IDOL AUDITION"` on the subtitle, add `aria-hidden="true"` to its visual character container, and wrap each visible character in `.nia-entry-subtitle-char` with sequential `--char-index` values. Use `.nia-entry-subtitle-space` for spaces.

- [ ] **Step 2: Add glyph-clipped shimmer and stagger CSS**

Layer a white base fill and a narrow gold gradient on the NIA text using `background-clip: text`. Animate the gradient from left to right with `niaEntryGoldShimmer`. Animate subtitle characters with `niaEntrySubtitleChar`, calculating delay as `calc(.38s + var(--char-index) * 25ms)`.

- [ ] **Step 3: Synchronize JavaScript timing**

Set standard `openDelay` to `1180` and `finishDelay` to `1600`; keep reduced-motion delays at 60 and 120 milliseconds.

- [ ] **Step 4: Run focused verification**

Run: `node --test tests/nia-host-bridge.test.mjs tests/launcher.test.mjs`

Expected: 12 tests pass.

- [ ] **Step 5: Run syntax and diff checks**

Run: `node --check app.js` and `git diff --check -- app.js index.html style.css tests/nia-host-bridge.test.mjs`.

Expected: both commands exit 0.

### Task 3: Widen the title and add the upper-right gold star cut-in

**Files:**
- Modify: `style.css:6554-6665`
- Modify: `tests/nia-host-bridge.test.mjs:56-78`
- Test: `tests/nia-host-bridge.test.mjs`

**Interfaces:**
- Consumes: the existing `.nia-entry-logo`, `.nia-entry-logo-star`, and 1.6-second entry timeline.
- Produces: an uncropped wider title, warm-gold elongated four-point star, and `niaEntryStarCutIn` motion from the upper-right into the `I/A` gap.

- [ ] **Step 1: Write the failing visual-contract assertions**

Require a positive title `letter-spacing`, horizontal `scaleX(1.08)`, inline padding on the card, a warm-gold star gradient, an asymmetric elongated star polygon, and `@keyframes niaEntryStarCutIn` whose first state starts with positive X and negative Y translation.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node --test tests/nia-host-bridge.test.mjs`

Expected: FAIL because the title still has negative letter spacing and the star still uses the old lime fill and centered rotation animation.

- [ ] **Step 3: Implement the title and star correction**

Give the logo card responsive inline padding, set the title to a small positive letter spacing and `scaleX(1.08)`, and preserve that horizontal scale in title entry keyframes. Replace the star fill with a warm-gold gradient and reshape its polygon so the upper-right point is about 1.7 times longer. Animate it from beyond the upper-right, slightly overshoot the final position, and settle between `I` and `A` before the shimmer completes.

- [ ] **Step 4: Preserve reduced-motion behavior**

In the existing reduced-motion query, disable the cut-in path and place the star directly at its final transform while retaining the short opacity transition.

- [ ] **Step 5: Verify the revision**

Run: `node --test tests/nia-host-bridge.test.mjs tests/launcher.test.mjs`, `node --check app.js`, and `git diff --check -- style.css tests/nia-host-bridge.test.mjs`.

Expected: 12 tests pass and both checks exit 0.

### Task 4: Replace the polygon star with the approved reference-shaped SVG flare

**Files:**
- Modify: `index.html:1720-1724`
- Modify: `style.css:6587-6640`
- Modify: `tests/nia-host-bridge.test.mjs:56-82`
- Test: `tests/nia-host-bridge.test.mjs`

**Interfaces:**
- Consumes: the existing `.nia-entry-logo-star` animation hook and 1.6-second entry timeline.
- Produces: an inline SVG flare with curved concave sides, long upper-right/lower-left rays, solid reference yellow, and the existing upper-right cut-in motion.

- [x] **Step 1: Replace the decorative span with an accessible inline SVG**

Use a `400 × 400` view box and a single asymmetric path. Keep the existing class name, mark the SVG decorative, and make it unfocusable.

- [x] **Step 2: Replace polygon styling with the approved flat treatment**

Remove `clip-path`, gradient, outline, and glow. Size and position the SVG across the `I/A` boundary, fill it with `#f3d900`, and preserve responsive scaling.

- [x] **Step 3: Retarget the cut-in animation for native SVG geometry**

Remove the old 45-degree rotation from standard and reduced-motion keyframes. Continue entering from beyond the upper-right and settle at the same final transform.

- [x] **Step 4: Update the visual contract and run final verification once**

Require the SVG markup, asymmetric path, flat yellow fill, no stroke, and no polygon/gradient/filter styling. Run the focused suites, JavaScript syntax check, and diff check after all edits are complete.

### Task 5: Make the flare strictly symmetric around its diagonal axis

**Files:**
- Modify: `index.html:1734-1736`
- Modify: `tests/nia-host-bridge.test.mjs:72-78`
- Test: `tests/nia-host-bridge.test.mjs`

**Interfaces:**
- Consumes: the existing `400 × 400` SVG view box and `.nia-entry-logo-star` animation hook.
- Produces: a single path whose upper-left and lower-right short rays, plus their adjoining concave Bézier controls, are mirrored across the lower-left-to-upper-right axis.

- [x] **Step 1: Encode the diagonal-symmetry contract**

Require the path `M384 16 C262 156 238 212 257 257 C212 238 159 258 44 356 C142 241 162 188 143 143 C188 162 245 139 384 16 Z`. Its paired points are reflections across `x + y = 400`, while the two points on that line retain different main-ray lengths.

- [x] **Step 2: Replace the hand-tuned asymmetric path**

Keep the SVG element, styling, position, color, and animation unchanged. Replace only its `d` attribute with the symmetric path from Step 1.

- [x] **Step 3: Run final verification**

Run `node --test tests/nia-host-bridge.test.mjs tests/launcher.test.mjs`, `node --check app.js`, and `git diff --check -- index.html tests/nia-host-bridge.test.mjs docs/superpowers/plans/2026-08-01-nia-logo-shimmer.md`.

Expected: all 13 tests pass and both checks exit 0.

### Task 6: Replace the generated flare geometry with the supplied PNG asset

**Files:**
- Create: `UI/nia-yellow-star.png`
- Modify: `index.html:1734`
- Modify: `style.css:6615-6627`
- Modify: `tests/nia-host-bridge.test.mjs:72-78`

**Interfaces:**
- Consumes: the user-supplied transparent `706 × 703` ARGB PNG and existing `.nia-entry-logo-star` animation hook.
- Produces: a decorative image using the authored star silhouette without changing its layout or motion timeline.

- [x] **Step 1: Copy the supplied transparent PNG into the project UI assets.**
- [x] **Step 2: Replace the inline SVG with an inaccessible decorative image element.**
- [x] **Step 3: Retain the existing responsive box and animation while changing shape rendering to `object-fit: contain`.**
- [x] **Step 4: Run the focused test suites, syntax check, asset check, and diff check.**

### Task 7: Replace the browser-font wordmark with authored PNG artwork

**Files:**
- Create: `UI/nia-logo.png`
- Create: `UI/nia-subtitle.png`
- Modify: `index.html:1710-1733`
- Modify: `style.css:6568-6650`
- Modify: `tests/nia-host-bridge.test.mjs:58-80`

**Interfaces:**
- Consumes: the approved transparent `LOGO.png` and `NEXT_IDOL_AUDITION_纯白透明.png` resources.
- Produces: `.nia-entry-logo-image` and `.nia-entry-logo-shimmer` layers plus a 16-group `.nia-entry-subtitle-art` SVG.

- [x] **Step 1: Copy both approved PNG files into `UI/` without modifying their pixels.**
- [x] **Step 2: Replace the text NIA and character spans with cropped image layers and SVG glyph clips.**
- [x] **Step 3: Retarget the existing logo, shimmer, stagger, and reduced-motion animations to the new artwork classes.**
- [x] **Step 4: Update the markup and animation contract tests.**
- [x] **Step 5: Run the focused suites, JavaScript syntax check, asset checks, and diff check once.**

### Task 8: Reproduce the 30fps star deformation and color wipes

**Files:**
- Modify: `index.html:1760`
- Modify: `style.css:6640-6725`
- Modify: `tests/nia-host-bridge.test.mjs:70-86`

**Interfaces:**
- Consumes: `UI/nia-yellow-star.png`, the existing 1.6-second transition, and the approved eight-frame reference sequence.
- Produces: `.nia-entry-star-base`, two `.nia-entry-star-trail` layers, `.nia-entry-star-white`, and `.nia-entry-star-gold` under the unchanged `.nia-entry-logo-star` coordinate owner.

- [x] **Step 1: Replace the single star image with layered decorative markup.**
- [x] **Step 2: Encode eight consecutive 30fps poses at `9.375%` through `23.94%` of the 1.6-second timeline.**
- [x] **Step 3: Add short-lived motion trails, the `23.94–32.5%` white wipe, and the synchronized `32.5–55%` gold refill.**
- [x] **Step 4: Keep reduced motion at the final gold pose and assert the outer logo card has no transform animation.**
- [x] **Step 5: Run the focused suites, syntax check, and diff check once.**

### Task 9: Add an isolated camera pullback and full-height left gradient

**Files:**
- Modify: `index.html:1709-1780`
- Modify: `style.css:6549-6580`
- Modify: `tests/nia-host-bridge.test.mjs:56-90`

**Interfaces:**
- Consumes: the unchanged `.nia-entry-logo-card`, star-local keyframes, and 1.6-second transition timeline.
- Produces: `.nia-entry-camera` as the sole camera transform owner and `niaEntryCameraPullback` settling from `scale(1.5)` at `11.25%` to `scale(1)` at `42.5%`.

- [x] **Step 1: Wrap the existing logo card in `.nia-entry-camera` without changing its children.**
- [x] **Step 2: Add the medium pullback keyframes with origin `55% 45.5%`, `-1.2deg` initial tilt, and zeroed final transform.**
- [x] **Step 3: Replace the radial glow with a 90-degree full-height linear gradient using bright stops through 18% and transition through 34%.**
- [x] **Step 4: Add reduced-motion camera reset and assertions that star keyframes remain local.**
- [x] **Step 5: Run focused suites, syntax check, and diff check once.**

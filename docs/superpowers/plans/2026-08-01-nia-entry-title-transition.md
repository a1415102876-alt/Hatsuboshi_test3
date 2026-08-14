# N.I.A Logo Reveal Transition Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the incorrect title-card wipe with a three-slider, camera-pullback NIA logo reveal on the home launcher.

**Architecture:** An inline SVG in `index.html` owns the logo, three labeled sliders, fragments, stars, and diagonal purple field. CSS animates each SVG group and pulls the entire stage from 3.5× to 1×; the existing guarded JavaScript trigger controls timing and iframe reveal.

**Tech Stack:** Inline SVG, CSS keyframes, vanilla JavaScript, Node test runner.

## Global Constraints

- Use only on the home N.I.A launcher.
- Show exactly three `NEXT IDOL AUDITION` slider groups before the logo reveal.
- Reveal a large `NIA` logo through a 3.5× to 1× camera pullback.
- Remove the old ribbons and `新企划启动` title card.
- Preserve reduced-motion and browser-fullscreen behavior.

---

### Task 1: Replace title card with NIA logo reveal

**Files:**
- Modify: `tests/nia-host-bridge.test.mjs`
- Modify: `index.html`
- Modify: `style.css`
- Modify: `app.js`

**Interfaces:**
- Consumes: `triggerNiaEntryTransition(openNiaPrototype)`.
- Produces: `#niaEntryTransition`, `.nia-entry-stage`, three `.nia-entry-slider` groups, and `.nia-entry-logo`.

- [x] **Step 1: Change the regression test and verify RED**

Require an inline SVG, exactly three slider groups, camera pullback keyframes, the NIA logo group, and absence of old ribbon/title-card markup. Run `node --test tests/nia-host-bridge.test.mjs`; expect failure against the old implementation.

- [x] **Step 2: Replace the markup and animation**

Replace the old DOM with the SVG stage. Remove old ribbon/title CSS and define slider, fragment, pullback, logo settle, exit-mask, responsive, and reduced-motion states.

- [x] **Step 3: Align trigger timing**

Update normal motion to approximately 2.1 seconds, opening the iframe beneath the final exit mask; keep the 180ms reduced-motion path and missing-node fallback.

- [x] **Step 4: Verify GREEN**

Run `node --check app.js` and `node --test tests/nia-host-bridge.test.mjs tests/launcher.test.mjs`.

- [x] **Step 5: Inspect scoped diff**

Run `git diff --check -- app.js index.html style.css tests/nia-host-bridge.test.mjs`.

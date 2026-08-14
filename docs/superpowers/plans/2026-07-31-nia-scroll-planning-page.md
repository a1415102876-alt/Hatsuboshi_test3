# N.I.A Scroll Planning Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Preserve the supplied idol dossier as page one and add the existing N.I.A planning draft as a visually consistent second page inside the tablet's vertical scroller.

**Architecture:** Replace only the prototype presentation shell while retaining the existing form IDs and JavaScript business bindings. The tablet `.screen` becomes the sole vertical scroll container, containing two semantic `.paper-page` sections; a small navigation helper scrolls to page two without changing the API flow.

**Tech Stack:** Static HTML, CSS, vanilla JavaScript, Node built-in test runner.

## Global Constraints

- Keep the current N.I.A API, host messaging, field meanings, defaults, and submission result unchanged.
- Keep the supplied dossier content and tablet/desk visual language on page one.
- Do not redesign review, schedule, or business stages in this iteration.
- Run automated tests after implementation, as explicitly requested by the user.
- Preserve all existing uncommitted N.I.A work and edit only the scoped files.

---

### Task 1: Two-page tablet document structure

**Files:**
- Modify: `nia-prototype.html`

**Interfaces:**
- Consumes: Existing IDs `goalInput`, `imageInput`, `approachInput`, `apiStatus`, `compileBtn`, and stage containers used by `nia-prototype.js`.
- Produces: `#tabletScreen`, `#idolProfilePage`, `#planningDraftPage`, and `#continueToPlanning` for scrolling and tests.

- [ ] **Step 1: Replace the current app shell with the desk and tablet shell**

  Keep the standalone warning, then place the dossier and planning form inside:

  ```html
  <div class="screen" id="tabletScreen">
    <section class="paper-page profile-page" id="idolProfilePage">...</section>
    <section class="paper-page planning-page" id="planningDraftPage">...</section>
  </div>
  ```

- [ ] **Step 2: Preserve the dossier page content**

  Copy the reference portrait, identity block, radar chart, report copy, page number `01`, and add a keyboard-operable `#continueToPlanning` button at the bottom.

- [ ] **Step 3: Move the current draft controls into page two**

  Preserve all five business-critical element IDs and exact default textarea values. Use explicit `for` attributes and matching input IDs.

- [ ] **Step 4: Leave later stages mounted but visually separate**

  Keep the existing review, schedule, business, and idol-panel markup so existing JavaScript queries continue to resolve; do not redesign those stages in this task.

### Task 2: Unified dossier visual system

**Files:**
- Modify: `nia-prototype.css`
- Modify: `nia-prototype.html` (remove obsolete inline prototype styling)

**Interfaces:**
- Consumes: The two-page classes from Task 1.
- Produces: A responsive desk/tablet composition and reusable paper/form tokens for later N.I.A pages.

- [ ] **Step 1: Establish scene and tablet tokens**

  Define ink, paper, coral, desk, line, focus, success, warning, and error custom properties; implement a fixed scene with the tablet centered and `.screen` as the only scroll container.

- [ ] **Step 2: Style the profile page without altering its information hierarchy**

  Port the reference header, portrait, radar chart, report, fine rules, serif typography, and page metadata into scoped `.profile-page` rules.

- [ ] **Step 3: Style the single-page planning sheet**

  Render three vertically stacked ruled-paper textareas, visible labels, nearby API status, and a coral dossier-confirmation button with hover, focus, loading, disabled, success, warning, and error states.

- [ ] **Step 4: Add restrained pagination and responsive behavior**

  Add a paper gap and `scroll-snap-align: start` on each page while leaving `scroll-snap-type` proximity-based. At narrow widths, center the tablet, keep one-column fields, prevent horizontal overflow, and maintain 44px controls.

- [ ] **Step 5: Add reduced-motion and accessibility styling**

  Disable smooth scrolling and non-essential transitions under `prefers-reduced-motion: reduce`; keep visible `:focus-visible` outlines and readable contrast.

### Task 3: Scroll navigation behavior

**Files:**
- Modify: `nia-prototype.js`

**Interfaces:**
- Consumes: `#continueToPlanning` and `#planningDraftPage` from Task 1.
- Produces: A click handler that scrolls page two into view and respects reduced-motion preferences.

- [ ] **Step 1: Add a guarded page-two navigation helper**

  ```js
  function scrollToPlanningDraft() {
    const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
    document.querySelector('#planningDraftPage')?.scrollIntoView({ behavior, block: 'start' });
  }
  ```

- [ ] **Step 2: Bind the continue button without changing business listeners**

  Add an optional guarded listener for `#continueToPlanning`; leave planning compilation, host messages, and later-stage event handlers unchanged.

### Task 4: End-of-implementation verification

**Files:**
- Modify: `tests/nia-prototype.test.mjs`
- Verify: `nia-prototype.html`, `nia-prototype.css`, `nia-prototype.js`

**Interfaces:**
- Consumes: The completed two-page markup, CSS, and scroll helper.
- Produces: Regression coverage for structure and preserved bindings.

- [ ] **Step 1: Add structural regression assertions after implementation**

  Assert that the HTML contains `idolProfilePage`, `planningDraftPage`, `continueToPlanning`, all five preserved business IDs, explicit labels, and the dossier before the planning page.

- [ ] **Step 2: Add interaction-source assertions**

  Assert that the JavaScript contains the reduced-motion media query, `scrollIntoView`, and the guarded continue-button binding.

- [ ] **Step 3: Run focused tests**

  Run: `node --test tests/nia-prototype.test.mjs tests/nia-host-bridge.test.mjs`

  Expected: all focused N.I.A prototype and host bridge tests pass with zero failures.

- [ ] **Step 4: Run the complete test suite**

  Run: `node --test tests/*.test.mjs`

  Expected: zero failures; if an unrelated pre-existing failure appears, record the exact test and error separately.

- [ ] **Step 5: Perform browser visual QA**

  Serve the project locally and inspect desktop and narrow/mobile viewports. Verify first-load framing, internal scrolling, page-two alignment, form editing, no horizontal overflow, no broken assets, and no console errors.

- [ ] **Step 6: Review the final diff**

  Run `git diff --check` and inspect the scoped diff to ensure no API or host-message behavior changed.

# N.I.A Tablet Desktop Scale Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scale the existing N.I.A tablet to 1.5 times its current rendered size on large desktop viewports without reflowing its internal document.

**Architecture:** Keep the current tablet dimensions and event model. Add one combined width-and-height media query that extends the existing centered transform with `scale(1.5)`, leaving the mobile breakpoints untouched.

**Tech Stack:** HTML/CSS, Node.js built-in test runner.

## Global Constraints

- Apply only at `min-width: 1200px` and `min-height: 720px`.
- Do not modify N.I.A HTML or JavaScript.
- Preserve the existing `760px` and `430px` responsive rules.

---

### Task 1: Add the wide-screen tablet scale

**Files:**
- Modify: `nia-prototype.css:125-135`
- Modify: `tests/nia-prototype.test.mjs`

**Interfaces:**
- Consumes: the existing `.tablet` centered transform and fixed internal layout.
- Produces: an exact `translate(-50%, -50%) scale(1.5)` transform on qualifying desktop viewports.

- [x] **Step 1: Add a CSS contract test for the combined media query and exact scale.**
- [x] **Step 2: Add the media query without changing base or mobile rules.**
- [x] **Step 3: Run N.I.A prototype and host bridge tests, JavaScript syntax check, and diff check once.**

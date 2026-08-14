# Saki Expression Presets Implementation Plan

**Goal:** Use the 17 Hanami Saki standee presets in N.I.A online-live beats while keeping one resolver reusable by VN dialogue.

**Architecture:** A small UMD module parses a speaker suffix such as `花海咲季(被夸陶醉)` into a base speaker and an allowlisted visual preset. `app.js` composes that result with the existing portrait resolver, so unknown or missing presets fall back to the currently configured portrait.

**Files:**
- Create `appearance/portrait-expression-presets.js` and its focused Node test.
- Modify `nia-business-api.js` so the main API receives the controlled vocabulary.
- Modify `app.js` so each live beat changes the standee and displays the clean speaker name.
- Load the module from both `index.html` and the `st.html` embedded loader.

**Verification:** Run the focused parser, prompt, live UI, and portrait integration tests; run syntax checks and `git diff --check` for touched source files.

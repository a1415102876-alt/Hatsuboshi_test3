# Wardrobe UI Localization Design

Date: 2026-07-12
Status: Approved

## Goal

Translate every user-facing wardrobe label into Chinese and make producer alias addition discoverable with a visible button.

## UI Contract

- Translate the wardrobe title, section labels, field labels, placeholders, status text, accessibility labels, and action labels into concise Chinese.
- Replace the decorative plus icon beside the alias input with a text button labeled `添加`.
- Clicking `添加` and pressing Enter must call the same submit function.
- Keep `保存名称` separate because adding edits the local draft while saving persists the draft to the current save scope.
- Do not change portrait upload, alias validation, Prompt, Harness, or persistence behavior.

## Background Asset

The fitting-room background remains `assets/scenes/Wardrobe_Fitting_Room.png`. It is a tracked Cloudflare Worker static asset and does not use R2. A gray fallback after deployment means the active Worker deployment does not contain the file or the page still points at an older asset origin.

## Verification

- Automated tests assert the Chinese labels, add button ID, shared click/Enter submit path, CSS button layout, and local background file existence.
- Run the five portrait test files, `node --check app.js`, and `git diff --check`.
- Reload the real SillyTavern page and verify desktop/mobile layout after the Worker is redeployed.

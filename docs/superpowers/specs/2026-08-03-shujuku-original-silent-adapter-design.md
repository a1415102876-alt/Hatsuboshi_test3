# Shujuku Original Silent Adapter Design

Date: 2026-08-03

## Goal

Restore Shujuku's original table loading, chat isolation, settings, and editor behavior while retaining Hatsu's silent user/assistant floor creation. The first version may allow a SillyTavern floor refresh so that the original database update path can be verified before refresh suppression is designed.

## Scope

- Add a new `shujuku_original_silent_v1` host generation adapter.
- Load the pinned upstream `spv3.7/index.js` unchanged through native dynamic `import()`.
- Do not fetch, patch, evaluate, or locally fork the Shujuku source.
- Keep Hatsu's transactional request identity, lease, compensation, and committed-reply behavior.
- Use Shujuku's public `AutoCardUpdaterAPI.triggerUpdate()` for database filling.
- Instrument the first version to determine whether `triggerUpdate()` replaces or redraws the active SillyTavern floor.
- Leave the existing experimental adapter available until the original adapter passes manual acceptance.

## Architecture

### Upstream loader

`shujuku-original-local.js` imports the pinned upstream URL without source transformation. It waits for `AutoCardUpdaterAPI` and verifies that `triggerUpdate`, `exportTableAsJson`, and `refreshDataAndWorldbook` are available. It exposes a readiness promise to the startup script.

The loader must not treat a stale API from a destroyed floor as ready. Its ownership checks apply only to the small local bridge; Shujuku itself remains upstream-owned and unmodified.

### Local bridge

`shujuku-original-bridge.js` presents a narrow interface to `st.html`:

- `isAvailable()`
- `prepareExternalGeneration()`
- `commitExternalAssistant()`
- `getLastCommitDiagnostics()`

Preparation uses the existing Hatsu same-layer mechanism: silently create the exact hidden user floor, emit the normal upstream-compatible user-message event, and wait for Shujuku's planning result on that floor. It does not call private Shujuku closure functions.

Commit silently creates the assistant floor, saves chat, calls the original `AutoCardUpdaterAPI.triggerUpdate()`, waits for its result, and only then posts Hatsu's committed reply. A failed update rolls back the assistant and runs existing attempt compensation.

### Host adapter

`st.html` routes `shujuku_original_silent_v1` through a dedicated runner. The runner preserves the current request envelope and sequence:

1. Prepare the exact hidden user floor.
2. Let upstream Shujuku modify the generation prompt through its supported event path.
3. Generate text without native assistant-floor creation.
4. Silently create one assistant floor.
5. Invoke upstream `triggerUpdate()` and await completion.
6. Post the committed reply to Hatsu.

No synthetic `GENERATION_ENDED`, `/trigger`, duplicate assistant, or patched private Shujuku API is permitted.

## Data And Refresh Diagnostics

Before and after `triggerUpdate()`, record only non-narrative diagnostics:

- chat length and final assistant message ID;
- active Hatsu iframe/window identity;
- containing SillyTavern message-floor element identity;
- table count from `exportTableAsJson()`;
- `triggerUpdate()` return value and error text;
- whether the Hatsu iframe was disconnected, replaced, or reloaded.

Diagnostics must not expose prompts, replies, API keys, full request IDs, or table contents. They are readable through the bridge and logged with a stable prefix.

## Error Handling

- Missing upstream API: fail startup with `shujuku_original_api_unavailable`.
- Planning timeout or missing planned prompt: compensate the hidden user attempt.
- Empty generation: compensate without committing an assistant.
- `triggerUpdate()` failure: remove the exact assistant created by the attempt, compensate, and report a primary AI error.
- Floor refresh after a successful database update: record it as a successful database result plus `floorRefreshDetected: true`; do not attempt suppression in this version.

## Compatibility And Rollout

The startup script selects `shujuku_original_silent_v1` and imports only the new upstream loader. It must not simultaneously load `shujuku-silent-local.js` or another copy of the upstream script.

The existing `current_transactional`, `shujuku_v1`, and experimental `shujuku_silent_v1` paths remain unchanged. The new adapter becomes the recommended database path only after manual acceptance confirms that tables load and update.

## Testing

Automated tests cover:

- unchanged upstream import URL and absence of source patch/eval behavior;
- readiness requirements for the public API;
- routing to the dedicated adapter;
- exact ordering of user preparation, generation, assistant creation, `triggerUpdate`, and reply commit;
- rollback when `triggerUpdate()` fails;
- redacted refresh diagnostics;
- preservation of the existing adapters.

Manual SillyTavern acceptance covers:

1. The database editor shows the original table list and data.
2. Existing Shujuku settings and current-chat data are preserved.
3. Planning/analysis modifies the generation prompt as before.
4. One assistant response is produced and tables are updated.
5. Any floor refresh is captured accurately, including whether the Hatsu frontend reloads.
6. No duplicate user or assistant floors are created.

## Deferred Work

If the original `triggerUpdate()` refreshes the floor, a follow-up design will isolate the specific save/render boundary. Refresh suppression is explicitly deferred until the original data path is proven functional.

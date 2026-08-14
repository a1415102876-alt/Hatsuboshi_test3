# Official Shujuku Adapter Acceptance

Use `shujuku-original-startup.html` as the embedded startup page. It loads the official `spv3.7/index.js` unchanged, then starts Hatsu with `shujuku_original_silent_v1`.

## Manual checks

1. Open the database editor and verify the existing tables and values are visible.
2. Send one normal Hatsu prompt. Confirm generation starts and the reply is committed.
3. Confirm the database fill path runs and at least one expected table value changes.
4. Confirm there is no duplicate visible assistant reply.
5. In the browser console, inspect `HatsuShujukuOriginalBridge.getLastCommitDiagnostics()`. Record `tableCountBefore`, `tableCountAfter`, `chatLengthBefore`, `chatLengthAfter`, `floorRefreshDetected`, `completed`, and `error`.
6. If the floor refreshes, note whether the Hatsu frame is replaced or disconnected. Refresh suppression is intentionally out of scope for this first validation.

## Failure signals

- `shujuku_original_api_unavailable`: the official module did not expose the required public API before timeout.
- `shujuku_original_bridge_unavailable`: Hatsu could not find the public bridge.
- `shujuku_original_api_unavailable` from commit: `triggerUpdate()` could not be called.
- `completed: false`: inspect the bounded `error` code; prompt/reply/table contents are never included in diagnostics.

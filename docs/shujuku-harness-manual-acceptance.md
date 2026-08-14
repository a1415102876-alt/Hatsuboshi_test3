# shujuku Harness Bridge Manual Acceptance

## Status

- Automated acceptance: complete. `344` tests, `338` passing, `6` known baseline failures.
- Real SillyTavern acceptance: **not executed** in this agent session.
- Blocker: the local SillyTavern instance is protected by BasicAuth and no credentials were available to the agent.
- Compatibility claim: none until every required row below has evidence.

## Environment Record

| Field | Value |
| --- | --- |
| SillyTavern version | `1.18.0` |
| SillyTavern commit | `8aa3e1537` |
| TavernHelper version/commit | TODO: record from the running chat environment |
| shujuku version/commit | TODO: record from the running chat environment |
| Preset name/version | TODO: record the exact preset used for acceptance |
| Frontend branch | `codex/shujuku-harness-bridge` |
| Frontend commit | The commit containing this document |
| Browser | TODO |
| Model/API | TODO |
| Test chat `saveScope` suffix | TODO |

Do not record Prompt text, generated narrative text, a full request ID, or a full lease ID in this document.

Known automated baseline failures:

- zero-cost interaction requires all selected idols;
- producer profile gender wiring;
- responsive mobile loader viewport;
- opening-floor hide pause gate;
- summary-round-only `advanceDay` behavior;
- Day 21 transition into First Live.

## Evidence Format

For each generation attempt, record only:

- mode: `opening_quiet` or `shujuku_same_layer`;
- owner kind;
- request ID suffix (last 8 characters);
- lease ID suffix (last 8 characters);
- `saveScope` or an unambiguous scope suffix;
- hidden user floor ID, if one exists;
- qrf key names and their floor ID, without qrf values;
- native assistant floor ID, if one exists;
- frontend result and any failure/compensation reason.

The VN debug panel exposes the redacted host adapter, mode, status, age, scope, owner kind, request suffix, and last failure/compensation reason. Lease suffix evidence must be collected from a temporary message-event observer that prints only `String(data.channelLeaseId || "").slice(-8)`.

## Preconditions

- Use a disposable SillyTavern chat.
- Enable the exact TavernHelper and shujuku versions recorded above.
- Select the exact preset recorded above.
- Confirm the frontend uses metadata envelope v2.
- Confirm the VN debug panel reports `host adapter = shujuku_v1`.
- Clear unrelated pending model requests before each case.
- Keep DevTools open on the top SillyTavern page and on the frontend iframe.

## Required Matrix

| ID | Scenario | Expected result | Evidence | Status |
| --- | --- | --- | --- | --- |
| A1 | Affinity-zero opening | Uses `opening_quiet`; active preset/card/worldbook apply | request/lease suffix, VN host debug | Not executed |
| A2 | Opening chat mutation | Creates no user floor, assistant floor, qrf data, `MESSAGE_SENT`, or ACU review panel | chat length before/after, event observation | Not executed |
| A3 | Confirm opening | Opening narrative is committed once and is not duplicated | frontend log count and chat floors | Not executed |
| A4 | Ordinary lesson | Uses `shujuku_same_layer`; exactly one hidden bridge user floor and one native assistant floor | both floor IDs | Not executed |
| A5 | qrf ownership | `qrf_plot*` keys exist only on the exact hidden user floor | key names and floor ID | Not executed |
| A6 | Visible narrative | Planning/recall text is absent from frontend narrative | visual inspection, no narrative copied here | Not executed |
| A7 | Consecutive actions | Second action does not reuse the first Prompt, qrf floor, request lease, or assistant | two attempt suffix/floor sets | Not executed |
| A8 | Phone/broadcast contention | Existing owner rejects ordinary action before settlement/UI/log writes | owner kind and unchanged state fields | Not executed |
| A9 | Refresh after settlement | Enters existing Recovery; stats/time/log are not settled again | turnId and before/after state summary | Not executed |
| A10 | Recovery retry | Keeps original turnId, uses frozen Prompt, new requestId, new lease, and same-layer mode | turnId plus suffixes | Not executed |
| A11 | General regeneration | May reuse business requestId but always uses a new lease and new attempt key | request/lease suffix pair before/after | Not executed |
| A12 | Chat switch during generation | Old-scope result is rejected and cannot write narrative/chronicle into the new chat | both scopes and rejection reason | Not executed |
| A13 | Failure before qrf | Exact unplanned hidden bridge floor is removed | attempt suffix and chat floor list | Not executed |
| A14 | Failure after qrf | Planning floor remains hidden and is marked abandoned; no automatic resend occurs | floor ID and compensation reason | Not executed |
| A15 | Late old lease | Old reply cannot apply or release a newer owner with the same requestId | lease suffixes and rejection | Not executed |
| A16 | Legacy metadata | Existing version 1 metadata and legacy state still load without migration failure | test chat/result | Not executed |

## Rollback Check

The adapter switch is runtime-only and is not stored in gameplay state:

```js
globalThis.HATSU_HOST_GENERATION_ADAPTER = "current_transactional";
```

The override must be injected by the loader before the `st.html` bridge script executes. Reload the bridge, confirm the VN debug panel reports `current_transactional`, then repeat one opening and one ordinary action. Record whether the former transactional path is restored without changing metadata envelope v2, `hostSaveSequence`, Harness state, or saved gameplay values.

| Check | Expected | Evidence | Status |
| --- | --- | --- | --- |
| Adapter selection | VN debug reports `current_transactional` | screenshot or text transcription | Not executed |
| Opening rollback | Uses transactional adapter behavior | floor IDs and request suffix | Not executed |
| Ordinary rollback | Uses transactional adapter behavior | floor IDs and request suffix | Not executed |
| Save compatibility | Existing save loads and sequence ordering remains valid | saveScope and accepted sequence | Not executed |

After the rollback check, remove the loader override and reload. The VN debug panel must return to `shujuku_v1`.

## Experimental Silent Adapter

Load the pinned local Shujuku patch before loading `st.html`. Do not also import the original Shujuku URL, because the local loader fetches and installs `spv3.7` itself.

```html
<body>
  <script>
    (async function startHatsuShujukuSilent() {
      try {
        window.HATSU_ASSET_BASE =
          'http://127.0.0.1:8000/hatsu-produce-local/';
        window.HATSU_HOST_GENERATION_ADAPTER = 'shujuku_silent_v1';

        await import(
          window.HATSU_ASSET_BASE + 'shujuku-silent-local.js?v=20260803-4'
        );
        await window.HATSU_SHUJUKU_SILENT_READY;

        if (!window.HATSU_ST_BOOTSTRAP_STARTED) {
          window.HATSU_ST_BOOTSTRAP_STARTED = true;
          $('body').load(window.HATSU_ASSET_BASE + 'st.html');
        }
      } catch (error) {
        console.error('[Hatsu Shujuku Silent] bootstrap failed:', error);
        document.body.innerHTML =
          '<pre style="padding:12px;color:#ffb4b4;white-space:pre-wrap">' +
          'Hatsu Shujuku Silent 启动失败\n' +
          String(error?.stack || error?.message || error) +
          '</pre>';
      }
    })();
  </script>
</body>
```

Manual acceptance for this adapter must record:

| Check | Expected | Status |
| --- | --- | --- |
| Adapter | VN debug reports `shujuku_silent_v1` | Not executed |
| Planning | Exact hidden user floor receives Shujuku planning data | Not executed |
| Assistant commit | One assistant floor is created with no full floor redraw | Not executed |
| Database update | Shujuku processes the committed assistant and persists table data | Not executed |
| Host events | No native `/trigger`, synthetic `GENERATION_ENDED`, or duplicate assistant | Not executed |
| Frontend continuity | Hatsu iframe remains mounted with the same in-memory state | Not executed |

Rollback is runtime-only: restore `current_transactional` and remove the local Shujuku import, or restore the original `shujuku_v1` loader and reload `st.html`.

## Acceptance Decision

- PASS only if all A1-A16 rows and all rollback rows pass with evidence.
- FAIL if any attempt crosses `saveScope`, duplicates settlement, duplicates a native assistant, accepts an old lease, or exposes Prompt/narrative content in diagnostics.
- BLOCKED if BasicAuth, missing plugin versions, unavailable preset, or unavailable model prevents a case from running. A blocked matrix is not a compatibility pass.

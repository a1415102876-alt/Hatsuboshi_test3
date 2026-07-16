# External Event Shortcut And Conversation Design

## Goal

Add a dedicated `事件` shortcut to the sandbox map's right-side action rail. The shortcut provides direct access to the existing World Engine event inbox and shows a red notification dot while an old-style external event still requires player handling.

Replace the current one-reply external event narrative with a persistent, multi-round Galgame conversation. Each round offers four generated choices, custom input, and an explicit immediate `结束话题` action.

## Scope

- Add the shortcut between `委托` and `手机` in the visual action order.
- Reuse the existing phone overlay, World Engine app, and `events` tab.
- Reuse the existing Storyteller notification candidate and its accept, defer, and ignore actions.
- Do not create another event list, event state, or read/unread flag.
- Do not include proactive LINE, SNS, Attach audit entries, or Director status in the shortcut badge.
- Reuse the existing Galgame renderer, choice parser, custom choice input, and primary model channel ownership.
- Do not advance time or modify stats, resources, relationships, or tasks during the conversation.

## Interaction

When no accepted conversation is active, clicking `事件` performs one direct navigation flow:

1. Open the phone overlay.
2. Open the World Engine phone app.
3. Select the existing `events` tab.
4. Render the current event inbox.

Opening the inbox does not clear the notification dot. The dot remains until the external event leaves a player-actionable state.

When an accepted external event conversation is active, the same shortcut resumes that conversation instead of opening an empty inbox.

## Badge Rule

The shortcut shows one red dot when the current Storyteller `pendingCandidate`:

- belongs to the current day and save scope;
- uses the `invite` channel; and
- has status `notified` or `deferred`.

The dot is hidden for missing, stale, accepted, ignored, resolved, expired, Attach, LINE, and SNS candidates. A deferred event keeps the dot because it still needs later handling.

The existing phone badge remains responsible for proactive LINE unread messages. The two indicators must not share counts or state.

An accepted candidate in `invited` state does not show the red dot because it has left the inbox and is already being handled. Its conversation remains reachable through the shortcut.

## Continuous Conversation

Accepting an external event starts a bounded event conversation tied to the exact candidate, day, save scope, plan, and harness turn.

The first and every continuation model reply must contain:

- the current Galgame story segment;
- exactly four producer-first-person choices; and
- a short summary used for bounded continuation context.

After playback, the choice surface provides:

- four generated choices;
- the existing custom input action; and
- a fixed `结束话题` action.

Selecting a generated choice or submitting custom input starts another request within the same event conversation. The continuation prompt includes the frozen event identity and bounded prior conversation context. It must continue the current subject instead of inventing a new event or assuming that the event has already ended.

The conversation does not have a fixed round limit, but persisted history is bounded. Older segments may be reduced to summaries while the newest turns remain available verbatim.

## Settlement And Recovery

An accepted model reply completes only the current conversation round. It must not resolve the Storyteller candidate, clear the event conversation, or write the final Chronicle/Director digest.

Clicking `结束话题` performs an immediate local settlement with no additional model request:

1. Validate the active conversation against the exact candidate, turn, day, plan, and save scope.
2. Transition the candidate from `invited` to resolved.
3. Record the resolved candidate, fingerprint, receipt, and final bounded conversation summary.
4. Commit Chronicle/Director evidence once for the complete event conversation.
5. Clear the active event conversation and release the gameplay block.
6. Close the conversation and return to the prior sandbox surface.

While a model round is generating, the existing harness recovery flow remains authoritative. Refreshing during an awaiting-choice state restores the conversation and its options. A failed or rejected reply leaves the same round retryable and does not settle the candidate.

Closing the visual overlay is not equivalent to ending the topic. The player can resume the active conversation from the `事件` shortcut.

## Presentation

- Match the existing dark translucent right-side shortcut buttons.
- Label the button `事件` and use a familiar bell icon.
- Use a small circular red dot at the button's top-right corner without a number.
- Keep the button visible wherever the current sandbox right-side action rail is visible.
- Re-space the rail so the new control does not overlap `担当`, `课题`, `委托`, `手机`, `背包`, or `公寓` on supported desktop and mobile viewports.

## Implementation Boundaries

- Add a small pure predicate for determining whether the external event shortcut is pending.
- Add one update function that controls button visibility and badge state from current application state.
- Add one navigation function that composes existing phone and World Engine navigation functions.
- Refresh the badge during normal free-mode rendering and after Storyteller event transitions.
- Add a normalized, bounded active event-conversation state owned by the Storyteller subtree.
- Keep harness ownership focused on the currently generating round while the conversation state owns cross-round continuity.
- Split current event reply handling into round acceptance and explicit final settlement.
- Reuse the existing choice UI with event-specific generated-choice, custom-choice, and end-topic handlers.

## Verification

- A focused test must fail before production changes are added.
- Tests cover DOM presence, direct navigation to the `events` tab, actionable status filtering, exclusion of non-invite channels, and badge refresh wiring.
- Tests prove that the first accepted reply keeps the candidate `invited`, persists choices, and does not commit final evidence.
- Tests cover generated choice continuation, custom input continuation, exact ownership, bounded history, refresh restoration, retry behavior, and immediate end-topic settlement.
- Tests prove that the final candidate transition and Chronicle/Director evidence commit occur once and only after explicit ending.
- Run the relevant free-mode, World Engine, Storyteller notification, and phone app regression suites.
- Run JavaScript syntax checks and `git diff --check`.

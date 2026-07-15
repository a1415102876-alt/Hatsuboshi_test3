# Sandbox First Live Presentation Flow Design

## Goal

Complete the sandbox First Live presentation so every settled attempt follows the same visible performance rhythm as produce mode:

```text
pre-live story -> player confirms Live start -> idol Live Theater -> post-live story
```

Successful and failed attempts both use this sequence. The deterministic sandbox result remains authoritative and only changes the post-live narrative and existing challenge state.

## Root Cause

The original sandbox First Live design required `live_pre -> video -> live_post`, but `handleSandboxFirstLiveReply()` currently concatenates the two parsed blocks and opens one event overlay. It never calls the existing Live Theater player.

The numeric challenge, one-time random roll, three-hour time advance, Harness ownership, recovery, and dual-block reply validation are already implemented. This change completes only the missing presentation stage.

## Architecture

Keep the sandbox challenge state machine independent from classic `startFirstLive()`. Reuse the existing `idolLiveVideos`, `triggerWipeTransition()`, and `playLiveVideo()` presentation infrastructure through sandbox-specific stage functions.

Do not call `startFirstLivePostStage()`: that function starts a second AI request and belongs to the produce-mode schedule and completion flow.

The sandbox flow continues to use one model request that returns both narrative blocks. Once the reply is accepted, store the parsed blocks on the active attempt and move through two sandbox presentation nodes:

```text
sandboxFirstLivePre
  -> player confirms "Live 开始"
  -> Live Theater plays current idol video
  -> sandboxFirstLivePost
  -> player confirms completion
  -> return to sandbox gameplay
```

## Reply Acceptance

`handleSandboxFirstLiveReply()` retains all current request ID, lease, final-reply, parser, Chronicle, and Harness gates.

For a valid final reply it must:

1. Preserve `narrative.pre` and `narrative.post` separately on the active attempt.
2. Complete the Harness turn and clear pending request state exactly once.
3. Commit the existing challenge status (`completed` on success, `cooldown` on failure) exactly once.
4. Set the active presentation node to `sandboxFirstLivePre` and show only `narrative.pre`.
5. Acknowledge the accepted reply without dispatching another model request.

The combined narrative may still be written to the action log and Chronicle as one authoritative reply, but it must not be rendered as one uninterrupted event.

## Event Controls

The shared event confirmation control treats `sandboxFirstLivePre` like the classic pre-live node for its label:

```text
Live 开始
```

Confirming the pre-live event hides the event overlay and starts the sandbox presentation function. It must not call classic `startFirstLivePostStage()`.

The post-live node uses the normal `确定` label. Confirming it clears the sandbox presentation node, saves, renders, and returns the player to the normal sandbox surface without changing time, result, tasks, cooldown, or rewards.

Closing or confirming while a stage is not ready must not skip settlement or generate another request.

## Live Theater

Resolve the video with the existing `idolLiveVideos[state.idol]` map.

When a video exists:

```text
wipe transition -> playLiveVideo(videoUrl) -> show sandbox post-live event
```

The existing player continues to own autoplay fallback, click-to-play, mute, skip, video error, BGM pause, cleanup, and overlay hiding.

When no video exists, show the post-live event immediately. Video load failure and player skip also proceed to the post-live event through the player's existing completion callback.

The sandbox post-live story is already available before playback starts, so no deferred second AI reply is involved.

## Persistence And Recovery

Before a complete dual-block reply arrives, existing `sandbox_first_live` recovery behavior remains unchanged. Recovery rotates only the request ID and never rerolls or advances time again.

After a valid reply arrives, persist the separated narrative and current presentation stage on the active attempt before opening the pre-live event. This makes the accepted result and stories authoritative even if rendering is interrupted.

This change does not introduce a second recovery owner or a second generation prompt. Presentation replay after an interrupted browser session is outside this fix; persisted stage data prevents loss and leaves a direct follow-up path if restoration is added later.

## State And Side Effects

Allowed new state on the active sandbox attempt:

```js
narrative: {
  pre: string,
  post: string
},
presentationStage: "pre" | "video" | "post" | "completed"
```

The presentation functions must not:

- call `Math.random()`;
- call `advanceFreeModeTime()`;
- dispatch another AI request;
- reapply quest completion;
- change the frozen success result;
- change cooldown dates;
- invoke produce-mode First Live completion or free-mode unlock logic.

## Testing

Add focused regression tests that prove:

1. A valid sandbox reply stores `pre` and `post` separately and opens only the pre-live story.
2. The pre-live confirmation routes to a sandbox-specific presentation function.
3. The presentation function uses the current idol video and the existing Live Theater player.
4. Video completion, skip, error, or missing video reaches the post-live story.
5. Successful and failed attempts both use the same presentation sequence.
6. The post-live confirmation clears the presentation node without a new request, roll, time advance, or classic completion call.
7. Existing parser, recovery, ownership, classic First Live, and VN tests remain unchanged in behavior.

## Out Of Scope

- Changing sandbox First Live probability, time cost, cooldown, tasks, or rewards.
- Replacing the native challenge confirmation dialog.
- Adding new Live videos or local video assets.
- Changing classic produce-mode First Live prompts or its two-request flow.
- Adding a general event presentation engine.
- Automatically reopening a partially viewed presentation after browser restart.

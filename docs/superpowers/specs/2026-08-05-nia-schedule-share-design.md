# N.I.A. Committed Schedule Share Design

## Goal

After the first-round N.I.A. schedule is reviewed and committed, the producer must share that exact schedule with the assigned idol before Day 1 begins. This makes the committed plan an explicit part of the story and gives later AI requests a stable source of truth, preventing mistakes such as treating the Day 5 radio program as the Day 3 activity.

The schedule is a frontend-owned game artifact. AI may react to it, but may not author, reorder, rename, or reinterpret its entries.

## Player Flow

The existing flow changes from:

Asari review -> committed plan tablet -> start training -> Day 1

to:

Asari review -> committed plan tablet -> confirm plan -> open idol LINE thread -> send fixed schedule attachment -> receive idol reply -> player selects Start Day 1 -> close phone -> Day 1

The schedule is sent automatically. There is no editable producer message and no choice before sending. The player must see a successful idol reply before Day 1 can start.

## Schedule Attachment

The app appends one outgoing attachment message to the assigned idol's existing LINE thread. It is persisted as a phone message rather than rendered as a temporary overlay.

The typed payload adds kind = nia_schedule_attachment and an attachment object to the existing message fields. The attachment has schemaVersion, planId, title, statusLabel, and exactly five day entries. Each day entry contains day, type, title, and purpose.

All attachment fields come from the committed state.nia.plan. The renderer must not use AI output to populate them. Old saves containing only ordinary text messages remain valid; absent kind is treated as a normal text message.

The outgoing card is visually distinct from a green text bubble. It contains a calendar or document icon, the title N.I.A 第一轮活动日程, the subtitle 5日企划 · 已确认, and five compact day rows. The conversation-list preview uses [日程表] N.I.A 第一轮活动日程.

## Idol Reply

After the attachment is durably appended, the app sends a dedicated schedule-reaction request through the existing phone generation path. The prompt includes the full authoritative five-day plan and states that it has already been finalized and sent.

AI is responsible only for the assigned idol's immediate LINE response. It must:

- follow the existing 初星私聊 response contract;
- preserve the idol's established personality and relationship with the producer;
- acknowledge the overall arrangement and at least one concrete scheduled activity;
- distinguish the current pre-Day-1 conversation from future activities;
- avoid changing dates, day order, activity types, titles, or purposes;
- avoid choices, stat changes, time advancement, settlement, narration outside the chat reply, or starting Day 1 itself.

The prompt should explicitly contrast easily confused entries, especially Day 3 and the formal radio-program day, using their actual committed values rather than hard-coded assumptions.

## Lifecycle State

The feature has its own persisted lifecycle under state.nia.scheduleShare. It stores status, planId, threadId, attachmentMessageId, replyMessageId, requestId, and error.

Valid statuses are:

- idle: no schedule has been shared for the current committed plan;
- sending: attachment creation is in progress;
- awaiting_reply: attachment exists and the idol reply is pending;
- retryable_failed: the reply request failed and may be retried;
- completed: a valid idol reply has been persisted.

The committed plan identity scopes the lifecycle. A different committed plan resets the schedule-share state. Re-entering the same flow, double-clicking, receiving duplicate callbacks, or refreshing must never append a second attachment or a second accepted reply.

## Recovery And Failure Behavior

The attachment is persisted before requesting the reply. If generation fails, the attachment remains in the thread and the UI displays 重新获取回复. Retrying sends only the reaction request; it does not resend the attachment.

There is no fixed fallback reply. Until a valid AI reply is stored:

- 开始第一天 is absent or disabled;
- normal progression into N.I.A. Day 1 is blocked;
- refresh restores the idol thread and the appropriate waiting or retry state.

Stale results are ignored when their request ID, plan ID, or thread ID no longer matches the active schedule-share lifecycle. A successful parsed reply is appended once, recorded by replyMessageId, and changes the status to completed.

## Start Day 1

Once the reply is fully displayed and persisted, a dedicated 开始第一天 action appears at the bottom of the thread. Selecting it closes the phone and calls the existing committed-plan training start path. It does not issue another AI request and does not recommit or rewrite the plan.

The start action is idempotent. Repeated activation cannot initialize Day 1 twice. Existing N.I.A. progression gates, including the 5,000-fan forced bond event, remain unchanged.

## Authoritative Schedule In Later Prompts

Sharing the attachment improves narrative continuity but is not the sole source of AI context. Every later N.I.A. request that depends on the plan must receive a normalized authoritative schedule block derived from the same committed plan. The block identifies:

- current round and day;
- today's scheduled action;
- future activities currently being prepared for;
- the complete five-day order.

Prompts must explicitly prohibit treating preparation for a future activity as if that activity is occurring today. Database data may enrich this context but is not required for the core schedule contract.

## Component Boundaries

The implementation should keep four responsibilities separate:

1. A pure schedule normalizer builds stable attachment and prompt data from the committed plan.
2. A lifecycle controller performs idempotent send, retry, completion, refresh recovery, and Day 1 gating.
3. The phone renderer displays typed attachment messages and contextual retry/start actions while preserving existing text chats.
4. A dedicated AI request builder and parser produces only the idol reaction using the existing private-chat output contract.

No unrelated phone behavior or generic chat retry semantics should be changed.

## Verification

Automated coverage must verify:

- committed plan fields map to the five attachment rows without AI involvement;
- old text-only phone messages still normalize and render;
- thread preview text is correct for the attachment;
- the attachment is appended exactly once across retries, duplicate events, and refresh;
- failure enters retryable_failed and retry requests only the idol response;
- stale or malformed replies do not unlock progression;
- a valid reply is appended once and enables 开始第一天;
- Day 1 starts exactly once through the existing training entry point;
- later N.I.A. prompts distinguish today's action from future scheduled activities;
- existing N.I.A., phone, audition, and fan-milestone tests remain passing.

# Storyteller Style Mix Design

## 1. Purpose

Extend the existing World Director and Storyteller with player-configurable narrative styles inspired by distinct storyteller personalities.

The first version supports:

- `heroic` (王道故事): effort, limits, setbacks, method changes, opportunities and growth.
- `romance` (恋爱故事): expectations, dependence, distance, promises, attention and boundaries.
- `kaibunsho` (怪文书): reserved schema and UI placeholder only; disabled at 0% until its rules are designed.

This feature does not choose a predetermined plot. The Director maintains long-term thematic continuity, the Storyteller introduces a legal disturbance into otherwise calm play, the main narrative model determines character reactions and narrative outcomes, and the frontend remains authoritative for state.

## 2. Core Boundary

Pacing and style are independent dimensions:

- `StorytellerPlan.pacing` decides whether an incident may occur and which severity budget is available.
- The active style mix decides which story logic a legal incident uses.
- Legality is evaluated before style weighting. A configured percentage cannot bypass actor, location, action, Pressure, scope, cooldown or severity requirements.
- Style selection never changes relationship values, stats, time, random settlement or other authoritative state.

```text
Pacing
  -> may an incident happen?
  -> minor, moderate or major?

Style mix
  -> should the legal disturbance emphasize growth or relationship tension?
  -> which disturbance operators are available?
```

## 3. Selected Architecture

Extend the existing Director and Storyteller chain. Do not introduce a second candidate system or an additional model request.

```text
activeMix
  -> Director request generates DailyDirection.styleThreads
  -> local StorytellerPlan freezes the day's style mix
  -> existing INCIDENT_CATALOG legality filtering
  -> eligible style weights are renormalized
  -> deterministic style and incident selection
  -> IncidentCandidate freezes style, operators and disturbance
  -> existing ordinary/map attachment or notification flow
  -> bounded disturbance is injected into the narrative Prompt
  -> existing Harness validation, recovery, commit and Observation flow
```

Existing ownership, recovery, notification, major-event confirmation and accepted-final settlement rules remain authoritative.

## 4. Configuration State

Default mix:

```ts
type StorytellerStyleId = "heroic" | "romance" | "kaibunsho";

interface StorytellerStyleWeights {
  heroic: number;    // 0..100, 5% steps
  romance: number;   // 0..100, 5% steps
  kaibunsho: number; // v1 fixed at 0
}

interface StorytellerStyleConfig {
  schemaVersion: 1;
  activeMix: StorytellerStyleWeights;
  pendingMix: StorytellerStyleWeights;
  styleMixRevision: number;
  activeFromDayKey: string;
  pendingActivationDayKey: string;
}

interface StorytellerStyleStreak {
  styleId: StorytellerStyleId | "";
  committedCount: number;
  penaltyArmed: boolean;
}
```

The initial values are `heroic: 60`, `romance: 40`, `kaibunsho: 0`.

Rules:

- Active, enabled values must total 100%.
- Adjustments use 5% steps.
- In v1, adjusting one enabled style automatically adjusts the other to preserve 100%.
- Saving settings only changes `pendingMix`. It does not run the Director or make a model request.
- Normal game-day transition copies `pendingMix` into `activeMix` only when the values differ. That activation increments `styleMixRevision` once and records the new effective day.
- A day transition with no pending change keeps the existing revision.
- Manual re-planning for the current day uses the already active mix. It does not activate pending settings.
- A committed Storyteller Plan freezes the active mix and revision for that day.

## 5. Director Influence

The style mix influences which long-term themes the Director keeps in view. Heroic and romance remain separate threads rather than being blended into a generic direction sentence.

```ts
interface DirectorStyleThread {
  status: "active" | "dormant";
  weight: number;
  focusPressureIds: string[];
  dramaticQuestion: string;
  narrativeGoals: string[];
  dormantReason: string;
}

interface DirectorStyleThreads {
  heroic: DirectorStyleThread;
  romance: DirectorStyleThread;
  kaibunsho: null;
}

interface DailyDirectionV2 {
  dayKey: string;
  tone: string;
  summary: string;
  focusActorIds: string[];
  focusPressureIds: string[];
  narrativeGoals: string[];
  avoid: string[];
  styleMixRevision: number;
  styleThreads: DirectorStyleThreads;
}
```

### 5.1 Thread selection

- Heroic prioritizes ability gaps, deadlines, training bottlenecks, stage qualification and resource limits.
- Romance prioritizes expectation gaps, dependence, promises, distance, boundaries and third-party attention.
- One Pressure may appear in both threads only when each thread asks a materially different dramatic question.
- Weights determine attention, not the number of copied Pressure records.
- If no legal material supports a style, its thread is `dormant`; the Director must not force the style onto unrelated facts.
- A dormant thread contains no narrative goals and includes a bounded reason.

Example using the same physical-limitation Pressure:

- Heroic: can the idol find a performance method that turns the limitation into a distinctive strength?
- Romance: how does reliance on the producer's physical help test trust and professional boundaries?

### 5.2 Output contract

The Director request includes the frozen style mix and `styleMixRevision`. The response must echo that revision.

- Every style with weight above zero must have a thread.
- Thread status is only `active` or `dormant`.
- An active thread requires a bounded dramatic question and may only reference Pressure IDs from the request.
- A dormant thread must have no narrative goals.
- Thread weight must exactly match the request. The model cannot alter player configuration.
- `kaibunsho` must be `null` while its weight is zero.
- The whole Director patch is rejected if any critical field is invalid. No partial thread or direction is committed.
- On rejection, the previous valid Director state remains and the job is retryable.
- Storyteller consumers require an exact current `dayKey`, `saveScope` and `styleMixRevision` match.

## 6. Storyteller Influence

The style mix determines how a concrete legal incident creates a disturbance. It does not determine the outcome.

```ts
interface StorytellerDisturbance {
  styleId: StorytellerStyleId;
  sourcePressureIds: string[];
  sourceRefs: string[];
  groundedPremise: string;
  triggerFact: string;
  immediateConstraint: string;
  reasonToRespond: string;
  openQuestions: string[];
  forbiddenOutcomes: string[];
}
```

The disturbance is assembled deterministically from the selected incident definition, legal world instance and relevant Pressure facts. It is bounded Prompt context, not authoritative settlement.

### 6.1 Heroic operators

- `threshold_test`: expose the current capability gap through an observable test.
- `resource_constraint`: restrict venue, time, equipment or assistance.
- `rival_comparison`: expose a gap through a legal peer comparison, ranking or observation without inventing a permanent rival.
- `public_expectation`: create a traceable expectation from a teacher, peer or audience.
- `method_failure`: make the current training or performance method unsuitable under present conditions.
- `opportunity_window`: present a time-limited opportunity with a real tradeoff.

### 6.2 Romance operators

- `expectation_gap`: expose different interpretations of an agreement, response or relationship meaning.
- `attention_competition`: require limited time or attention to be distributed without automatically creating a love triangle.
- `boundary_test`: test public/private or professional/intimate boundaries through a concrete situation.
- `dependency_exposure`: make dependence or the feeling of being needed visible through a legal third party or practical difficulty.
- `promise_pressure`: make an existing promise require a response because of timing, changed conditions or new evidence.
- `misread_signal`: allow multiple reasonable readings of a real action without hiding player-known facts or making characters irrational.

Each incident uses at most two operators. The disturbance must not decide success, failure, confession, relationship advancement, jealousy, player choice or character commitment.

### 6.3 Existing catalog extension

Existing incident definitions gain style capability metadata rather than being replaced:

```ts
interface StyledIncidentDefinition {
  // existing fields remain
  styleIds: StorytellerStyleId[];
  operatorIdsByStyle: Partial<Record<StorytellerStyleId, string[]>>;
}
```

One definition may support multiple styles. For example, a shared training slot may become a heroic resource constraint or a romance attention/boundary test if the current facts legally support that interpretation.

## 7. Deterministic Selection

Selection occurs within the existing incident candidate path:

1. Evaluate pacing, category, severity, world and instance legality.
2. Evaluate Pressure and style-thread support for each candidate/style pair.
3. Remove unsupported styles.
4. Renormalize the configured weights across remaining styles.
5. Apply the one-event anti-streak adjustment when applicable.
6. Use the plan, turn and definition seed to choose a style deterministically.
7. Score and select the incident within that style using the existing catalog rules.
8. Freeze the candidate, style, operators, disturbance and random seed.

If one style has no legal candidates, its weight is temporarily redistributed to the legal styles. If no style is legal, no candidate is created.

Refresh, retry and recovery must produce the same style and candidate for the same frozen identity.

### 7.1 Anti-streak rule

- Count only successfully submitted events.
- Rejected, ignored, expired, abandoned and generation-failed candidates do not count.
- After two consecutive committed events of the same style, arm one penalty that halves that style's effective weight for the next successful candidate selection only.
- The adjustment is soft; it never makes a legal style impossible.
- Creating the next candidate consumes the armed penalty regardless of which style wins. A scan that produces no candidate does not consume it.
- A longer uninterrupted run does not arm another penalty. The streak must first break and a style must reach two consecutive committed events again.

Long-run distribution should approach the configured mix, but no short window is guaranteed to match it exactly.

## 8. Candidate And Plan Extensions

```ts
interface StorytellerPlanV2 {
  // existing fields remain
  schemaVersion: 2;
  styleMix: StorytellerStyleWeights;
  styleMixRevision: number;
}

interface StyledIncidentCandidate {
  // existing fields remain
  styleId: StorytellerStyleId;
  operatorIds: string[]; // maximum 2
  disturbance: StorytellerDisturbance;
}
```

These fields are immutable after candidate creation. Candidate revalidation recomputes them from the same frozen plan, definition, world context and Pressure facts. A mismatch rejects the candidate rather than repairing it in place.

## 9. Prompt And Authority Rules

The existing Director block remains long-term guidance. The Storyteller block adds the current concrete disturbance.

```text
Director style thread
  -> long-term dramatic question and themes worth watching

Storyteller disturbance
  -> current grounded trigger, immediate constraint and open questions

Main narrative model
  -> character-consistent reactions and prose
```

Prompt text must explicitly state:

- the disturbance is an open situation, not a required ending;
- characters must remain canon-consistent even if the situation is unusual;
- the model cannot alter frontend settlement, time, random results, relationship state or player decisions;
- unsupported details must not be invented merely to satisfy a style percentage.

No existing character Prompt, settlement Prompt or business rule is rewritten by this feature.

## 10. User Interface

Location: `小手机 -> 初星世界引擎 -> 叙事者设置`.

- Heroic and romance use 5% step controls.
- Kaibunsho is visible as `尚未启用` and fixed at 0%.
- The UI displays both today's active mix and the pending next-day mix.
- Saving changes does not trigger Director generation or Storyteller scanning.
- The Director result view presents heroic and romance threads separately.
- Dormant threads display `本日暂无合法素材` plus the bounded reason.

The debug view displays the chosen style, configured weights, legal candidate counts, renormalized weights, anti-streak adjustment and final deterministic result. It does not expose Prompt text.

## 11. Audit And Observability

Persist only bounded structural information:

- Storyteller Plan: frozen mix and revision.
- Storyteller state: bounded style streak and whether its one-shot penalty is armed.
- Selection diagnostic: configured weights, legal counts, normalized weights, anti-streak adjustment, deterministic cursor and selected style.
- Incident Candidate: style, operators, source Pressure IDs and bounded disturbance fields.
- Observation/Receipt: the style of a successfully submitted event.

The world-engine debug page shows up to 20 recent successful style results and the current consecutive-style count.

Do not record Prompt text, narrative body, user input, full request IDs or complete save state.

## 12. Save Migration

New saves enable `60/40/0` on day one.

For an existing save without style configuration:

1. Add `pendingMix = 60/40/0`.
2. Set activation to the next game day.
3. Preserve the current committed Director direction, Storyteller Plan, candidates and severity budget.
4. Continue legacy Storyteller behavior until normal day transition.
5. On day transition, activate the pending mix and generate the first style-aware Director direction and Storyteller Plan.

If the player edits the pending mix on the migration day, the edited value replaces the default and still activates next day.

Migration is detected from the presence of style configuration and the new Plan schema fields, not by guessing from a global save version.

## 13. Error Handling

- Invalid style settings normalize to the last valid mix; if none exists, use `60/40/0`.
- A Director style schema mismatch rejects the full patch and leaves the previous valid state intact.
- A style revision, scope or day mismatch prevents Storyteller consumption.
- An unsupported style/operator pair removes that pair before weighting.
- No legal styled candidate results in no event, not a forced fallback event.
- Candidate revalidation failure follows the existing candidate rejection/expiry rules.
- Generation failure follows the existing Harness recovery semantics; it does not reroll style or candidate.

## 14. Testing Requirements

### Configuration and migration

- Default mix is `60/40/0`.
- Enabled values total 100 and use 5% steps.
- Editing only changes pending state.
- Normal day transition activates a changed pending mix once and increments revision once.
- A day transition without a changed mix does not increment revision.
- Manual current-day re-plan does not activate pending state.
- Existing saves preserve the current day and activate next day.

### Director

- Valid dual threads commit atomically.
- Unknown Pressure IDs, wrong weight, wrong revision or missing active thread reject the entire patch.
- Dormant thread constraints are enforced.
- Old valid Director state survives a rejected patch.

### Storyteller selection

- Legality runs before style weighting.
- Unsupported style weight is redistributed only among legal styles.
- The same frozen identity produces the same style, operators and candidate.
- Two committed same-style events trigger one soft half-weight adjustment.
- The armed adjustment is consumed by one created candidate and is not repeatedly re-armed during the same uninterrupted streak.
- Failed, ignored and rejected events do not affect streak history.
- No legal style produces no candidate.

### Existing flows

- Ordinary lesson, training and rest attachment retain exact ownership and accepted-final settlement.
- Map arrival, exploration and custom-choice attachment retain exact ownership.
- Notification and major-event confirmation retain existing candidate lifecycle rules.
- Recovery preserves the original candidate and style while using existing new-request rules.
- Stale replies cannot commit a candidate, Observation or Chronicle entry.
- Existing S0-S5, Director, Harness, ownership and save tests gain no new failures.

## 15. Scope Exclusions

The first version does not include:

- active Kaibunsho generation rules or incident definitions;
- automatic preference learning or automatic ratio changes;
- per-idol style mixes;
- separate models or APIs for different styles;
- a queue, event bus or second Harness;
- style-driven numeric, relationship, time or settlement changes;
- strict short-window percentage guarantees;
- a rewrite of character, prose-style or settlement Prompts.

## 16. Expected File Boundaries

The implementation plan should keep changes within the existing ownership boundaries:

- `world/director-state.js`: normalize and persist style-aware DailyDirection fields.
- `world/director-api.js`: request contract, response parsing and atomic validation.
- `world/director-injection.js`: bounded separate thread guidance.
- `world/director-phone-view.js`: separate thread presentation.
- `world/storyteller/plan.js`: freeze daily style mix and revision.
- `world/storyteller/incidents.js`: style metadata, legality, deterministic selection, candidate normalization and revalidation.
- `world/storyteller/injection.js`: bounded open-disturbance Prompt block.
- `world/storyteller/observations.js`: committed-event style history.
- `world/storyteller/phone-view.js`: settings and bounded diagnostics view models.
- `app.js`: day activation orchestration, settings actions and existing-flow integration only.
- Existing focused tests plus new style-specific tests.

Do not use this work as a reason to refactor settlement, Prompt builders, Harness ownership or unrelated side flows.

# Multi-Idol Roster And Responsibility Design

## Goal

Support multiple formally assigned idols in sandbox mode without losing an earlier idol's state. Separate two concepts that are currently conflated by `state.idol`:

- **Assigned idols:** the producer's formal roster, containing one or more idols.
- **Responsible idol:** the one assigned idol currently targeted by training, actions, prompts, and idol-scoped task settlement.

The assigned-idol page must browse every roster member and allow an idle-time switch of the responsible idol.

## Root Cause

The current second-idol entry calls `startSandboxInviteStory(candidate)`, which calls `applyIdolPreset(candidate, true)`. That function immediately replaces `state.idol` and resets the shared Vo/Da/Vi, stamina, stress, legacy affinity, First Live state, and log.

Some earlier data survives incidentally:

- sandbox affinity is stored per name in `state.freeMode.relationships`;
- fully completed idols may remain in `state.sandbox.producedIdols`;
- idol-specific quest IDs remain in the global task map.

However, there is no authoritative assigned roster, no separate responsible-idol identity, and no per-idol training/First Live/task profile. The page therefore shows only the newly selected idol, and later actions use the overwritten state.

## Chosen Architecture

Use an active-profile compatibility layer. Add authoritative multi-idol state while keeping the existing top-level fields as the loaded view of the responsible idol:

```js
state.sandbox.assignedIdols = ["藤田琴音", "葛城莉莉娅"];
state.sandbox.responsibleIdol = "葛城莉莉娅";
state.sandbox.idolProfiles = {
  "藤田琴音": { /* independent idol progression */ },
  "葛城莉莉娅": { /* independent idol progression */ }
};
```

`state.idol` remains a compatibility mirror of `state.sandbox.responsibleIdol`. Existing action and prompt code may continue reading top-level `state.idol`, stats, stamina, stress, First Live, and task view.

All changes of the responsible idol go through one switching service:

```text
validate idle state and roster membership
-> save current top-level idol state into its profile
-> set responsibleIdol and state.idol
-> load target profile into top-level compatibility fields
-> save and rerender
```

Business code must not directly replace `state.idol` for second-idol scouting.

## Assigned Roster Lifecycle

### First Idol

When the initial sandbox scout quest reaches its existing “担当确认” completion, ensure the idol has a profile, add the idol to `assignedIdols`, and set it as `responsibleIdol`.

Initial sandbox setup may continue using the existing provisional selection flow, but the formal roster authority begins at scout confirmation.

### Additional Idol Scouting

Starting a second or later scout task does not change the roster or responsible idol. The candidate remains only in:

```js
state.sandbox.scoutTargetIdol
```

The invite/scout story uses that candidate explicitly. It must not call `applyIdolPreset(candidate, true)` and must not reset the currently responsible profile.

When the candidate's scout quest is completed by the accepted AI completion tag:

1. Create a fresh independent profile from the candidate's preset.
2. Add the candidate to `assignedIdols` exactly once.
3. Mark the candidate's scout quest completed.
4. Activate that candidate's personal task view.
5. Save the previous responsible idol's profile.
6. Automatically switch responsibility to the newly confirmed idol.

The earlier roster members and profiles remain unchanged.

## Idol Profile Boundary

Each assigned idol independently stores:

- Vo, Da, and Vi;
- growth, threshold, cap, and SP state;
- stamina and stress;
- compatibility trust/affinity state where still required by legacy paths;
- First Live result and sandbox First Live challenge/cooldown;
- idol-scoped task state and baselines;
- idol-specific action/debug continuity needed to avoid cross-idol settlement.

Sandbox relationship scores remain in the existing name-keyed `state.freeMode.relationships` map because it is already multi-character data. A profile references the same idol name and does not duplicate the relationship score.

The following remain global producer/world state:

- current game day and clock;
- wallet, fame, and inventory;
- world map, Director, Storyteller, broadcasts, and SNS;
- secondary API configuration;
- producer profile and appearance;
- global Chronicle/history storage;
- daily campus action count;
- generated commission slots.

## Task Ownership

### Idol-Scoped Main Tasks

The following task categories belong to an idol profile:

- scout completion receipt for that idol;
- relationship milestones;
- idol-specific conflict/personal quests;
- ability milestones;
- First Live/final milestones;
- any idol-facing work milestone whose completion represents that idol's development.

The existing `state.tasks.main` remains the compatibility view for the responsible idol. Switching responsibility saves the current idol-scoped entries and loads the target idol's entries. Task IDs that are inherently idol-specific remain associated with their matching idol pack; generic relationship, ability, work, and final IDs receive separate status per profile.

### Producer-Global Tasks

Wallet, inventory, API configuration, generated commission slots, global school/world events, and daily campus usage are not copied between idol profiles.

### Commission Ownership

Generated commission slots remain global and visible to every roster member. Calling `setActiveSideQuest()` freezes:

```js
slot.ownerIdol = state.sandbox.responsibleIdol;
```

The task card and active-task UI show the owner. Switching responsibility never rewrites `ownerIdol`.

Commission progress and tier settlement require the responsible idol to match `ownerIdol`. A mismatch returns an explicit `owner_mismatch` result and leaves rewards, slot state, time, and task progress unchanged. The player can switch back to the owner and continue.

Commission numeric rewards apply to the owning idol's active profile. Money and fame rewards remain global.

## Responsible-Idol Switching

Switching does not consume game time. It is allowed only when all of the following are idle:

- no primary-model channel owner;
- no generating or recovery-required Harness turn;
- no active VN/event narrative;
- no map continuous-exploration session;
- no First Live generation or presentation;
- no other deterministic settlement currently in progress.

Blocked switching shows a reason and changes no state.

Successful switching must be atomic from the player's perspective. Save the outgoing profile before loading the target, then persist the new responsible identity and rerender all responsible-idol-dependent surfaces.

Changing the responsible idol does not alter:

- time or day;
- wallet, fame, or inventory;
- relationship scores;
- world presence or generated events;
- commission owner;
- earlier idol profiles.

## Assigned-Idol Page

The existing affinity/assigned-idol overlay becomes a roster browser.

Behavior:

- Opening the overlay starts on `responsibleIdol`.
- Previous and next icon buttons cycle through `assignedIdols` with wraparound.
- A stable `current / total` counter is shown.
- Browsing changes only the viewed idol, not the responsible idol.
- The responsible idol shows a non-interactive “当前负责” status.
- Other roster members show a “设为当前负责” command.
- The command is disabled with an explanatory title while switching is blocked.
- With one roster member, paging controls remain dimensionally stable but are disabled or hidden accessibly.

The current tab continues to show the viewed idol's name, background, biography, relationship score, stage, recent interaction, and profile status.

The “其他人物” tab excludes every idol in `assignedIdols`, not only the responsible idol. The relationship network includes a formal producer edge for every assigned idol and distinguishes the responsible idol from other assigned idols.

The layout uses familiar chevron icons for paging, fixed-size icon buttons, and responsive constraints so names, counter, and responsibility controls do not shift or overlap on desktop or mobile.

## Existing Save Migration

Normalize all sandbox saves to the new structure.

### Roster Recovery

For saves that already contain the new schema, `assignedIdols` remains authoritative and is repaired only with idols whose scout confirmation is complete.

For legacy saves, build the initial roster from the ordered, canonical, deduplicated union of:

```text
state.sandbox.assignedIdols
state.sandbox.producedIdols
state.idol only when that idol's scout quest is completed
```

This prevents an old save that was overwritten while a second idol was merely being scouted from treating the unconfirmed candidate as formally assigned. Such a candidate remains represented by `scoutTargetIdol` and the active scout quest.

The current `state.idol` becomes `responsibleIdol` when it is a recovered roster member. Otherwise use the first recovered roster member.

### Current Idol

The current top-level state can be copied exactly into that idol's profile before any compatibility fields are normalized.

### Previously Overwritten Idol

An older save may already have lost the exact Vo/Da/Vi, stamina, stress, and First Live values of a previous idol. Those values cannot be reconstructed exactly.

For such a recovered roster member:

- start from the idol's configured preset;
- preserve the existing name-keyed relationship score;
- preserve matching idol-specific completed quest IDs and flags where available;
- infer completed First Live only when authoritative surviving task/produced state proves it;
- never copy the currently responsible idol's numeric state into another idol.

This migration restores identity and usable independent profiles but does not claim to recreate data already overwritten by old code.

Migration is idempotent. Repeated loads must not duplicate roster members, recreate profiles, or reset a valid profile.

## Failure Handling And Guards

- Unknown or non-roster switch targets are rejected.
- Missing profiles for valid roster members are repaired from preset plus surviving per-idol data.
- Duplicate assigned names are canonicalized and removed.
- A failed save/load profile transition leaves the prior responsible idol active.
- A stale model reply continues settling against the request's frozen owner context and cannot be redirected by page browsing.
- Page browsing never mutates `state.idol` or task ownership.
- Second-idol scout cancellation or incomplete confirmation does not create a formal profile.

## Testing

At minimum cover:

1. Starting second-idol scouting leaves the first responsible idol and profile unchanged.
2. Scout confirmation adds the new idol once and auto-switches responsibility.
3. First-idol stats, First Live, task progress, and relationship survive switching away and back.
4. Two idols never share mutable profile objects.
5. Wallet, fame, inventory, clock, world state, and campus daily count survive switching unchanged.
6. Legacy saves migrate current data exactly and rebuild prior produced idols conservatively.
7. Migration is idempotent.
8. The page opens on the responsible idol, pages with wraparound, and browsing does not switch responsibility.
9. The switch command updates the responsible badge and displayed profile.
10. Busy states block switching without state writes.
11. Other-character lists exclude every assigned idol.
12. The relationship network shows all assigned idols and marks the responsible idol.
13. Accepting a commission writes `ownerIdol` once.
14. Switching does not transfer an accepted commission.
15. Owner mismatch blocks progress and settlement without rewards.
16. Switching back permits the commission to continue and rewards the correct profile.
17. Existing single-idol saves and classic produce mode retain their current behavior.

## Out Of Scope

- Simultaneously training multiple idols in one action.
- Group/unit Live mechanics.
- Multiple concurrent active commissions.
- Reconstructing exact numeric data already overwritten in old saves.
- Making one AI request settle against multiple responsible idols.
- Changing world time, daily action limits, or commission reward balance.

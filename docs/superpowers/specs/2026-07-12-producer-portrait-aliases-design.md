# Producer Portrait Aliases Design

Date: 2026-07-12
Status: Approved

## Goal

Allow a player to configure additional speaker names that resolve to the currently equipped producer portrait. Aliases are appearance metadata for the current save scope, not properties of an uploaded image and not prompt context.

## Scope

- Only the `producer` portrait slot supports custom aliases.
- Existing aliases (`制作人`, `P`, `producer`, `producer-san`) and `state.producer.name` remain active and cannot be removed.
- Custom aliases are stored in `state.appearance.bindings.producer.aliases`.
- Portrait library schema and uploaded asset records remain unchanged.
- Idol alias configuration, fuzzy matching, regular expressions, Prompt changes, and Harness changes are excluded.

## Data Contract

```ts
interface AppearanceStateV2 {
  schemaVersion: 2;
  equipped: Record<string, EquippedPortraitRef>;
  bindings: {
    producer: {
      aliases: string[];
    };
  };
}
```

`normalizeAppearanceState()` migrates schema v1 and missing state without dropping equipped references. Aliases are trimmed, deduplicated case-insensitively, limited to 12 entries, and limited to 40 characters per entry.

## Matching

`characterKeyForSpeaker()` checks built-in producer aliases, the producer profile name, and normalized custom aliases before resolving canonical idol names. Matching is exact after trimming; Latin case differences are ignored. A custom alias that canonicalizes to a known idol is rejected by the UI save operation.

## UI

The producer wardrobe tab shows a compact alias editor with immutable default tags, removable custom tags, an input that adds on Enter, and a separate save button. Idol tabs hide the editor. Alias changes do not require selecting or uploading a portrait.

Saving updates only `state.appearance.bindings.producer.aliases`, calls `saveState("portrait.aliases")`, and rerenders the wardrobe. Restoring a built-in portrait or changing outfits does not remove aliases.

## Rendering

A custom alias resolves to `characterKey: "producer"`, so it uses the current producer portrait, transform, fallback, and producer nameplate color.

## Tests

- Schema v1 migration preserves equipped portraits.
- Alias normalization enforces trim, case-insensitive deduplication, length, and count limits.
- Built-in, profile, and custom aliases resolve to `producer`.
- Canonical idol names cannot be saved as producer aliases.
- Producer UI renders and saves aliases; idol tabs hide the editor.
- Custom producer aliases use producer portrait and nameplate styling.

## Rollback

Remove the alias editor and stop passing custom aliases to the resolver. Schema v2 fields are additive and can be ignored by older code; equipped portrait references remain valid.

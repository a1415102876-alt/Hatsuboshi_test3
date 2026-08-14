# Hatsuboshi Live Visual Design

## Direction

The N.I.A live screen combines a Twitch/YouTube information layout with the official Gakuen Idolmaster website's flat graphic language. The platform color is consistently orange, while the active idol color appears only as a small supporting accent.

## Layout

- A white and orange branded header contains the Hatsuboshi crest, platform name, live state, current topic, and four-part progress.
- Desktop retains the existing 68/32 video and chat split.
- The video area uses orange geometric school motifs, a restrained dark caption layer, and the existing standee crop.
- The chat rail uses compact viewer rows with generated anonymous handles and colored avatar blocks.
- The footer presents official channel identity, live metrics, and existing action controls.
- At narrow widths, video and chat stack vertically; secondary channel metadata is hidden before core controls.

## Color

- Platform orange: `#f7931e`
- Orange highlight: `#ffb52e`
- Warm white: `#fffdf9`
- Ink: `#17171b`
- Muted line: `#e8e1d8`
- Idol accent: existing `--idol-theme`, limited to small indicators and borders

## Behavior

All existing IDs, API data, full-screen mounting, four-segment playback, producer intervention, retry, and settlement behavior remain unchanged. Comment presentation may add deterministic local display names and avatar initials without changing generated comment payloads.

## Verification

Static integration tests cover required brand structure, official crest usage, platform color tokens, idol accent scoping, responsive layout, and existing interaction IDs. Browser screenshots verify desktop and mobile composition without overlap.

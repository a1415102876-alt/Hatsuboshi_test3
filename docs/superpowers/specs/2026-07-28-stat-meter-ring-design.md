# Stat Meter Ring Visual Design

## Scope

Adjust only the Vo/Da/Vi rating circle. Keep the numeric value badge, Mini icon, maximum value, growth badge, card width, and Sprite rank mapping unchanged.

## Ring Geometry

- Render the track and progress as two concentric SVG circles.
- Show a 270-degree arc with a 90-degree gap centered at the bottom.
- Start progress at the lower-left endpoint, travel clockwise across the top, and finish at the lower-right endpoint.
- Use round line caps on both layers.
- Use a thick dark-gray track and a slightly thinner colored progress stroke so the track remains visible as an outline around the progress.
- Continue deriving progress from the existing `--meter-pct` value.

## Rank Sprite

- Keep the current 4 by 4 Sprite sheet and rank-to-cell coordinates.
- Center the selected cell with a 10px inset inside the ring.
- Apply a 5px upward optical correction so the glyph does not sit low or touch the ring.

## Implementation

- Add a non-interactive SVG ring inside `.meter-arc` with separate track and progress circles.
- Use `pathLength="100"` and CSS dash arrays so percentage updates remain data-driven.
- Keep the existing accessible rank label on `.meter-arc`; mark the SVG and Sprite decorative.
- Replace the current conic-gradient ring styling rather than layering both implementations.

## Verification

- A focused source test verifies the SVG circles, round caps, and bottom gap contract.
- Browser inspection verifies the lower-left start, lower-right end, centered rank glyph, and consistent Vo/Da/Vi alignment at desktop width.

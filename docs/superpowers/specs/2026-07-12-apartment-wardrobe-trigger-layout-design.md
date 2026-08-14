# Apartment Wardrobe Trigger Layout Design

## Goal

Move the apartment wardrobe trigger from the upper-left fallback position into the existing right-side action column, directly below "打开手机".

## Scope

- Keep `#apartmentWardrobeBtn` inside `.producer-apartment-hotspots` and preserve its current DOM order after `#apartmentPhoneBtn`.
- Preserve the existing button ID, click handler, wardrobe opening behavior, and portrait state logic.
- Give the wardrobe trigger the same right alignment and spacing rhythm as "今日总结" and "打开手机".
- Keep its existing wardrobe-specific accent color while matching the dimensions and typography of the other apartment action buttons.
- Ensure the three right-side actions remain distinct and non-overlapping on narrow viewports.

## Implementation Shape

This is a CSS positioning change. `#apartmentWardrobeBtn` receives an explicit `right` and `bottom` position below `#apartmentPhoneBtn`. No new wrapper, layout system, or JavaScript behavior is introduced.

The visible trigger copy is localized as part of the same presentation fix:

- kicker: `Wardrobe` to `衣柜`
- label: `WARDROBE` to `立绘衣柜`
- title: `Portrait wardrobe` to `管理制作人与担当偶像的立绘。`

## Verification

- Add a focused UI/source test that confirms the wardrobe trigger remains after the phone trigger in the apartment hotspot container.
- Assert that the wardrobe trigger has explicit right-side positioning below the phone trigger.
- Assert the localized trigger copy.
- Run the focused wardrobe/apartment tests, `node --check app.js`, and `git diff --check`.
- Visually verify in SillyTavern at desktop and narrow viewport widths after refresh.

## Non-goals

- Reworking the apartment hotspot layout into Grid or Flexbox.
- Changing any apartment action behavior.
- Changing wardrobe storage, portrait binding, upload, or host bridge logic.

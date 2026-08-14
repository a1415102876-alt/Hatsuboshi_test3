# Structured Reply Sanitization Design

## Goal

Prevent model planning text and unrelated trailing blocks from entering the SillyTavern assistant message or database update when a frontend mode requires a tagged structured result.

## Scope

The first supported contract is `[HATSU_OUTPUT_MODE:NIA_PRODUCER_WORK]`, whose committed reply must be exactly one complete `<NIA_WORK_RESULT>...</NIA_WORK_RESULT>` block. The implementation must not depend on provider-specific reasoning tags such as `konatan_planning`.

## Data Flow

After generation, the host derives a committed reply from the original frontend prompt and raw model text. For producer work it selects the last complete `NIA_WORK_RESULT` block. That selected block is used for compatibility validation, the assistant chat floor, `GENERATION_ENDED`, database fallback, and the frontend reply. The unmodified response may remain only in the `rawText` diagnostic field sent to the frontend.

If the required result block is absent or incomplete, compatibility validation fails and no unrelated text is committed as the producer-work result.

## Adapter Coverage

The same sanitizer is used by the same-layer, silent Shujuku, and original silent Shujuku paths. The same-layer path also replaces the native assistant floor with the selected structured block before persisting it.

## Verification

Regression tests cover an arbitrary-language planning prefix, an unmatched reasoning closing tag, valid structured content, and unrelated trailing tags. They verify that chat/database-facing text contains only the required result block while diagnostic raw text remains available.

# Affinity Stage Tags Design

## Goal

Every prompt sent by the produce frontend exposes one compact, deterministic affinity-stage tag so SillyTavern worldbook EJS can select the current relationship personality.

## Tag protocol

The frontend emits exactly one line in each prompt:

```text
好感度阶段标签：AFF_LILJA_40
```

The suffix is the highest threshold not greater than the current trust value: `0`, `20`, `40`, `60`, `80`, or `100`. Values above 100 remain at stage 100.

Idol codes are `KOTONE`, `TEMARI`, `SAKI`, `UME`, `HIRO`, `SENA`, `MISUZU`, `CHINA`, `LILJA`, `SUMIKA`, `MAO`, and `RINAMI`.

## Prompt coverage

The tag is included in opening, ordinary actions, outings and companion actions, free chat, idol interaction, affinity stories, First Live preparation, and First Live performance prompts. It describes persistent personality state only and is independent from one-time affinity story event labels.

## Failure behavior

If no supported idol is selected, the formatter returns an empty string rather than emitting an invalid worldbook trigger.

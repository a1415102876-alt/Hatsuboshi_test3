import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { buildNiaPlanPrompt } from '../nia-prototype-api.js';
import { buildNiaProducerWorkPrompt } from '../nia-producer-work-api.js';
import {
  buildNiaBusinessOpeningPrompt,
  buildNiaBusinessResolutionPrompt,
  buildNiaLiveSegmentPrompt
} from '../nia-business-api.js';

const modeLine = (name) => `[HATSU_OUTPUT_MODE:${name}]`;

test('structured N.I.A prompts begin with exactly one matching output mode marker', () => {
  const prompts = [
    [buildNiaPlanPrompt({}, {}), 'NIA_PLAN'],
    [buildNiaProducerWorkPrompt({}, {}, {}, {}), 'NIA_PRODUCER_WORK'],
    [buildNiaBusinessOpeningPrompt({}), 'NIA_BUSINESS_OPENING'],
    [buildNiaBusinessResolutionPrompt({}, {}, ''), 'NIA_BUSINESS_RESOLUTION'],
    [buildNiaLiveSegmentPrompt({}, { pendingSegmentIndex: 1 }), 'NIA_ONLINE_LIVE']
  ];

  for (const [prompt, expectedMode] of prompts) {
    const markers = prompt.match(/\[HATSU_OUTPUT_MODE:[A-Z_]+\]/g) || [];
    assert.equal(prompt.split('\n', 1)[0], modeLine(expectedMode));
    assert.deepEqual(markers, [modeLine(expectedMode)]);
  }
});

test('ordinary and choice prompt contracts expose distinct worldbook trigger markers', async () => {
  const source = await readFile(new URL('../app.js', import.meta.url), 'utf8');

  assert.match(source, /mode === "choice"[\s\S]{0,160}\[HATSU_OUTPUT_MODE:CHOICE_STORY\]/);
  assert.match(source, /mode === "nsfw_choice"[\s\S]{0,200}\[HATSU_OUTPUT_MODE:NSFW_CHOICE_STORY\]/);
  assert.match(source, /mode === "nsfw"[\s\S]{0,160}\[HATSU_OUTPUT_MODE:NSFW_STORY\]/);
  assert.match(source, /return `\[HATSU_OUTPUT_MODE:NORMAL_STORY\]/);
  assert.match(source, /function buildMapExploreChoiceOutputBlock[\s\S]{0,240}\[HATSU_OUTPUT_MODE:CHOICE_STORY\]/);
  assert.match(source, /buildNsfwIntimacyOpeningPrompt[\s\S]{0,1200}galgameRenderContract\("nsfw_choice"\)/);
  assert.match(source, /buildNsfwIntimacyContinuePrompt[\s\S]{0,1200}galgameRenderContract\("nsfw_choice"\)/);
  assert.match(source, /buildNsfwIntimacyClosingPrompt[\s\S]{0,900}galgameRenderContract\("nsfw"\)/);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSnsPostPrompt, parseSnsPostPayload, buildSnsPostResultPrompt, parseSnsPostResultPayload } from '../nia-sns-business-api.js';

const context = { businessId: 'sns-1', idol: 'Saki', imagePreset: { imageId: 'training-log', title: 'training log', description: 'practice photo' } };
const payload = { schemaVersion: 1, businessId: 'sns-1', imageId: 'training-log', postText: 'generated post', comments: [{ id: 'c1', text: 'great', tone: 'positive' }, { id: 'c2', text: 'nice', tone: 'neutral' }, { id: 'c3', text: 'wow', tone: 'excited' }] };

test('SNS post prompt declares tagged contract and manual preservation', () => {
  const prompt = buildSnsPostPrompt(context, { businessId: 'sns-1', draft: { mode: 'manual', imageId: 'training-log', manualText: 'original text' } });
  assert.match(prompt, /<NIA_SNS_POST>/);
  assert.match(prompt, /manual/);
  assert.match(prompt, /花海佑芽/);
  assert.match(prompt, /author/);
});

test('SNS post parser accepts matching payload and preserves manual text', () => {
  const parsed = parseSnsPostPayload(`<NIA_SNS_POST>${JSON.stringify(payload)}</NIA_SNS_POST>`, { businessId: 'sns-1', imageId: 'training-log', mode: 'manual', manualText: 'original text' });
  assert.equal(parsed.ok, true);
  assert.equal(parsed.data.postText, 'original text');
});

test('SNS result parser enforces bounded evaluation enums', () => {
  const result = { businessId: 'sns-1', resultSummary: 'summary', publicImage: 'image', imageMatch: 'strong', bonusTier: 'medium', bonusReason: 'reason' };
  assert.equal(parseSnsPostResultPayload(`<NIA_SNS_POST_RESULT>${JSON.stringify(result)}</NIA_SNS_POST_RESULT>`, { businessId: 'sns-1' }).ok, true);
  assert.equal(parseSnsPostResultPayload(`<NIA_SNS_POST_RESULT>${JSON.stringify({ ...result, bonusTier: 'middle' })}</NIA_SNS_POST_RESULT>`, { businessId: 'sns-1' }).ok, false);
});

test('SNS result parser ignores a planning mention before the final tagged block', () => {
  const result = { businessId: 'sns-1', resultSummary: 'summary', publicImage: 'image', imageMatch: 'strong', bonusTier: 'large', bonusReason: 'reason' };
  const source = '思考：输出 `<NIA_SNS_POST_RESULT>` JSON。\n<NIA_SNS_POST_RESULT>'
    + JSON.stringify(result) + '</NIA_SNS_POST_RESULT>';
  assert.equal(parseSnsPostResultPayload(source, { businessId: 'sns-1' }).ok, true);
});

test('SNS result prompt binds the same business id', () => {
  assert.match(buildSnsPostResultPrompt(context, { businessId: 'sns-1' }), /NIA_SNS_POST_RESULT/);
  assert.match(buildSnsPostResultPrompt(context, { businessId: 'sns-1' }), /sns-1/);
});

import test from 'node:test';
import assert from 'node:assert/strict';

await import('../nia-sns-business-core.js');
const sns = globalThis.HatsuNiaSnsBusiness;

const draft = {
  mode: 'manual',
  imageId: 'training-log',
  manualText: 'Training is finished. Tomorrow I will do even better.'
};

test('sns post runtime starts composing and preserves a normalized draft while generating', () => {
  const runtime = sns.createSnsPostRuntime({ businessId: 'sns-1', baseFans: 1200 });
  assert.equal(runtime.status, 'composing');
  assert.equal(runtime.baseFans, 1200);

  const started = sns.beginPostGeneration(runtime, draft, { requestId: 'post-1' });
  assert.equal(started.ok, true);
  assert.equal(started.runtime.status, 'generating_post');
  assert.equal(started.runtime.draft.mode, 'manual');
  assert.equal(started.runtime.draft.imageId, 'training-log');
  assert.equal(started.runtime.draft.manualText, draft.manualText);
});

test('post payload advances to interaction only for the active business', () => {
  const started = sns.beginPostGeneration(sns.createSnsPostRuntime({ businessId: 'sns-1' }), draft).runtime;
  assert.equal(sns.applyPostPayload(started, { businessId: 'other', postText: 'No.', comments: [] }).reason, 'business_id_mismatch');

  const result = sns.applyPostPayload(started, {
    businessId: 'sns-1',
    postText: draft.manualText,
    comments: [{ id: 'c1', text: 'Keep it up!', tone: 'positive' }]
  });
  assert.equal(result.ok, true);
  assert.equal(result.runtime.status, 'awaiting_interaction');
  assert.equal(result.runtime.post.postText, draft.manualText);
  assert.equal(result.runtime.post.comments.length, 1);
  assert.equal(result.runtime.post.comments[0].author, '匿名观众');
});

test('interaction requires one known comment and leads to result generation', () => {
  const runtime = sns.normalizeSnsPostRuntime({
    businessId: 'sns-1', status: 'awaiting_interaction',
    post: { postText: 'Post text', comments: [{ id: 'c1', text: 'Comment', tone: 'positive' }] }
  });
  assert.equal(sns.submitInteraction(runtime, { commentId: 'other', action: 'like' }).reason, 'comment_not_found');
  assert.equal(sns.submitInteraction(runtime, { commentId: 'c1', action: 'reply' }).reason, 'reply_text_missing');

  const submitted = sns.submitInteraction(runtime, { commentId: 'c1', action: 'reply', replyText: 'Thank you.' });
  assert.equal(submitted.ok, true);
  assert.equal(submitted.runtime.interaction.action, 'reply');
  const generating = sns.beginResultGeneration(submitted.runtime, { requestId: 'result-1' });
  assert.equal(generating.ok, true);
  assert.equal(generating.runtime.status, 'generating_result');
});

test('interrupted generation becomes retryable without losing stage data', () => {
  const posting = sns.beginPostGeneration(sns.createSnsPostRuntime({ businessId: 'sns-1' }), draft).runtime;
  const postRecovered = sns.recoverInterruptedSnsPost(posting);
  assert.equal(postRecovered.status, 'retryable_failed');
  assert.equal(postRecovered.retryStage, 'post');
  assert.equal(postRecovered.draft.manualText, draft.manualText);
  assert.equal(sns.beginPostGeneration(postRecovered, { manualText: 'Changed' }).ok, true);

  const resultRecovered = sns.recoverInterruptedSnsPost(sns.normalizeSnsPostRuntime({
    businessId: 'sns-1', status: 'generating_result', draft,
    post: { postText: draft.manualText, comments: [{ id: 'c1', text: 'Great', tone: 'positive' }] },
    interaction: { commentId: 'c1', action: 'like' }
  }));
  assert.equal(resultRecovered.retryStage, 'result');
  assert.equal(sns.beginResultGeneration(resultRecovered).ok, true);
  assert.equal(resultRecovered.post.postText, draft.manualText);
});

test('result settlement applies fan bonus only once for its business id', () => {
  const generating = sns.normalizeSnsPostRuntime({
    businessId: 'sns-1', status: 'generating_result', baseFans: 2000,
    post: { postText: 'Post text', comments: [{ id: 'c1', text: 'Comment', tone: 'positive' }] },
    interaction: { commentId: 'c1', action: 'like' }
  });
  const applied = sns.applyResultPayload(generating, {
    businessId: 'sns-1', imageMatch: 'strong', bonusTier: 'medium',
    bonusReason: 'The post matched the idol image.', publicImage: 'Disciplined and approachable.',
    resultSummary: 'The campaign reached new fans.'
  });
  assert.equal(applied.ok, true);
  assert.equal(applied.runtime.status, 'settled');
  const first = sns.settleSnsPostOnce(applied.runtime, 'sns-1');
  assert.equal(first.ok, true);
  assert.equal(first.result.fans, 5000);
  assert.equal(sns.settleSnsPostOnce(first.runtime, 'sns-1').reason, 'already_settled');
});

test('SNS business starts at a 2000-fan minimum bonus', () => {
  const generating = sns.normalizeSnsPostRuntime({
    businessId: 'sns-2', status: 'generating_result', baseFans: 0,
    post: { postText: 'Post text', comments: [{ id: 'c1', text: 'Comment', tone: 'positive' }] },
    interaction: { commentId: 'c1', action: 'like' }
  });
  const applied = sns.applyResultPayload(generating, {
    businessId: 'sns-2', imageMatch: 'partial', bonusTier: 'small',
    bonusReason: 'reason', publicImage: 'image', resultSummary: 'summary'
  });
  assert.equal(applied.runtime.result.bonusFans, 2000);
});

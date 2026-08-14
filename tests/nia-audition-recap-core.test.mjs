import test from 'node:test';
import assert from 'node:assert/strict';

await import('../nia-audition-core.js');
const audition = globalThis.HatsuNiaAudition;

function rewardedRuntime(overrides = {}) {
  return audition.normalizeAuditionRuntime({
    auditionId: 'audition-r1-recap',
    idolName: '花海咲季',
    status: 'settled',
    settledAuditionId: 'audition-r1-recap',
    progressionApplied: true,
    result: {
      rank: 1,
      score: 612,
      qualified: true,
      fanGain: 10000,
      statGains: { Vo: 130, Da: 155, Vi: 151 },
      highlight: '最后一组镜头完整兑现了训练成果。',
      weakness: '开场仍会因为追求完美而紧张。',
      payoffSummary: '咲季把本轮积累变成了自己的舞台表现。',
      resultSummary: '花海咲季以第一名通过首轮试镜。'
    },
    ...overrides
  });
}

test('old audition saves receive an idle post-audition recap', () => {
  const runtime = audition.normalizeAuditionRuntime({ auditionId: 'legacy-audition' });
  assert.deepEqual(runtime.postAudition, {
    status: 'idle',
    openingStory: '',
    options: [],
    selectedResponse: '',
    selectedResponseSource: '',
    resolutionStory: '',
    recapSummary: '',
    activeRequest: null,
    retryPhase: '',
    lastError: '',
    updatedAt: 0
  });
});

test('recap opening starts only after settlement rewards are applied', () => {
  const notRewarded = rewardedRuntime({ progressionApplied: false });
  assert.equal(
    audition.beginPostAuditionOpening(notRewarded, { requestId: 'opening-1' }).reason,
    'progression_not_applied'
  );

  const started = audition.beginPostAuditionOpening(rewardedRuntime(), { requestId: 'opening-1' });
  assert.equal(started.ok, true);
  assert.equal(started.runtime.postAudition.status, 'generating_opening');
  assert.equal(started.runtime.postAudition.activeRequest.requestId, 'opening-1');
});

test('recap opening stores exactly three generated producer responses', () => {
  const started = audition.beginPostAuditionOpening(rewardedRuntime(), { requestId: 'opening-1' }).runtime;
  const invalid = audition.applyPostAuditionOpening(started, {
    auditionId: 'audition-r1-recap',
    story: '<narration>后台候场区。</narration>',
    options: ['认可她', '指出短板']
  });
  assert.equal(invalid.reason, 'invalid_options');

  const applied = audition.applyPostAuditionOpening(started, {
    auditionId: 'audition-r1-recap',
    story: '<narration>后台候场区。</narration>',
    options: ['认可她', '指出短板', '回应她的逞强']
  });
  assert.equal(applied.ok, true);
  assert.equal(applied.runtime.postAudition.status, 'awaiting_choice');
  assert.deepEqual(applied.runtime.postAudition.options, ['认可她', '指出短板', '回应她的逞强']);
});

test('generated and free-input responses are frozen before resolution', () => {
  const opening = audition.applyPostAuditionOpening(
    audition.beginPostAuditionOpening(rewardedRuntime(), { requestId: 'opening-1' }).runtime,
    {
      auditionId: 'audition-r1-recap',
      story: '<narration>后台候场区。</narration>',
      options: ['认可她', '指出短板', '回应她的逞强']
    }
  ).runtime;

  const generated = audition.selectPostAuditionResponse(opening, {
    response: '指出短板',
    source: 'generated_option'
  });
  assert.equal(generated.ok, true);
  assert.equal(generated.runtime.postAudition.selectedResponse, '指出短板');
  assert.equal(generated.runtime.postAudition.selectedResponseSource, 'generated_option');

  assert.equal(
    audition.selectPostAuditionResponse(opening, { response: '自定义', source: 'invalid' }).reason,
    'invalid_response_source'
  );
  assert.equal(
    audition.selectPostAuditionResponse(opening, { response: '   ', source: 'free_input' }).reason,
    'response_missing'
  );
});

test('resolution advances once and completion is idempotent', () => {
  let runtime = audition.applyPostAuditionOpening(
    audition.beginPostAuditionOpening(rewardedRuntime(), { requestId: 'opening-1' }).runtime,
    {
      auditionId: 'audition-r1-recap',
      story: '<narration>后台候场区。</narration>',
      options: ['认可她', '指出短板', '回应她的逞强']
    }
  ).runtime;
  runtime = audition.selectPostAuditionResponse(runtime, {
    response: '认可她',
    source: 'generated_option'
  }).runtime;
  runtime = audition.beginPostAuditionResolution(runtime, { requestId: 'resolution-1' }).runtime;
  assert.equal(runtime.postAudition.status, 'generating_resolution');

  const applied = audition.applyPostAuditionResolution(runtime, {
    auditionId: 'audition-r1-recap',
    story: '<dialogue char="花海咲季">下一轮也会是第一名。</dialogue>',
    recapSummary: '咲季接受认可，并把尚未解决的紧张带入下一轮。'
  });
  assert.equal(applied.ok, true);
  assert.equal(applied.runtime.postAudition.status, 'playing_resolution');

  const completed = audition.completePostAudition(applied.runtime);
  assert.equal(completed.ok, true);
  assert.equal(completed.runtime.postAudition.status, 'completed');
  assert.equal(audition.completePostAudition(completed.runtime).reason, 'already_completed');
});

test('interrupted recap generation preserves completed content and retries only its phase', () => {
  const openingInterrupted = audition.normalizeAuditionRuntime({
    ...rewardedRuntime(),
    postAudition: {
      status: 'generating_opening',
      activeRequest: { requestId: 'opening-1' }
    }
  });
  const recoveredOpening = audition.recoverInterruptedAudition(openingInterrupted);
  assert.equal(recoveredOpening.postAudition.status, 'retryable_failed');
  assert.equal(recoveredOpening.postAudition.retryPhase, 'opening');

  const resolutionInterrupted = audition.normalizeAuditionRuntime({
    ...rewardedRuntime(),
    postAudition: {
      status: 'generating_resolution',
      openingStory: '<narration>后台。</narration>',
      options: ['A', 'B', 'C'],
      selectedResponse: 'A',
      selectedResponseSource: 'generated_option',
      activeRequest: { requestId: 'resolution-1' }
    }
  });
  const recoveredResolution = audition.recoverInterruptedAudition(resolutionInterrupted);
  assert.equal(recoveredResolution.postAudition.status, 'retryable_failed');
  assert.equal(recoveredResolution.postAudition.retryPhase, 'resolution');
  assert.equal(recoveredResolution.postAudition.selectedResponse, 'A');
  assert.equal(recoveredResolution.postAudition.openingStory, '<narration>后台。</narration>');
});

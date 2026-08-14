import test from 'node:test';
import assert from 'node:assert/strict';

await import('../nia-radio-business-core.js');
const radio = globalThis.HatsuNiaRadioBusiness;

const plan = {
  business_id: 'radio-1',
  programTitle: 'Hatsuboshi Broadcast Club',
  episodeTitle: 'First guest',
  goal: 'Introduce the idol',
  host: 'Makoto Yu',
  guest: 'Hanami Saki',
  interviewFocus: 'Her competitive side'
};

test('radio runtime starts ready and keeps a normalized plan', () => {
  const runtime = radio.createRadioRuntime({ businessId: 'radio-1', plan, baseFans: 1200 });
  assert.equal(runtime.status, 'ready');
  assert.equal(runtime.segmentIndex, 0);
  assert.equal(runtime.baseFans, 1200);
  assert.equal(runtime.plan.business_id, 'radio-1');
  assert.equal(runtime.plan.host, 'Makoto Yu');
});

test('segments advance only through their legal radio states', () => {
  let runtime = radio.createRadioRuntime({ businessId: 'radio-1', plan });
  let result = radio.beginSegmentGeneration(runtime, 1, { requestId: 'req-1' });
  assert.equal(result.ok, true);
  runtime = result.runtime;
  assert.equal(runtime.status, 'generating_1');

  result = radio.applySegmentPayload(runtime, {
    businessId: 'radio-1', segmentIndex: 1, status: 'continue',
    lines: [{ speaker: 'Makoto Yu', text: 'Welcome.' }]
  });
  assert.equal(result.ok, true);
  assert.equal(result.runtime.status, 'playing_1');
  assert.equal(radio.completeSegmentPlayback(result.runtime).runtime.status, 'awaiting_continue_1');
  assert.equal(radio.beginSegmentGeneration(result.runtime, 2).reason, 'illegal_status');
});

test('mismatched business and segment replies are rejected', () => {
  const started = radio.beginSegmentGeneration(
    radio.createRadioRuntime({ businessId: 'radio-1', plan }), 1, { requestId: 'req-1' }
  ).runtime;
  assert.equal(radio.applySegmentPayload(started, { businessId: 'other', segmentIndex: 1 }).reason, 'business_id_mismatch');
  assert.equal(radio.applySegmentPayload(started, { businessId: 'radio-1', segmentIndex: 2 }).reason, 'segment_index_mismatch');
});

test('third segment pauses for a producer instruction before segment four', () => {
  const runtime = radio.normalizeRadioRuntime({
    businessId: 'radio-1', plan, status: 'awaiting_producer_instruction', segmentIndex: 3,
    segments: [{}, {}, { problem: 'A difficult listener letter', options: ['A', 'B', 'C'] }]
  });
  assert.equal(radio.beginSegmentGeneration(runtime, 4).reason, 'producer_instruction_missing');
  const submitted = radio.submitProducerInstruction(runtime, 'Answer honestly and bring it back to the episode theme.');
  assert.equal(submitted.ok, true);
  assert.equal(radio.beginSegmentGeneration(submitted.runtime, 4, { requestId: 'req-4' }).ok, true);
});

test('refresh turns interrupted generation into a retryable state for the same segment', () => {
  const runtime = radio.normalizeRadioRuntime({
    businessId: 'radio-1', plan, status: 'generating_2', segmentIndex: 1, pendingSegmentIndex: 2
  });
  const recovered = radio.recoverInterruptedRadio(runtime);
  assert.equal(recovered.status, 'retryable_failed');
  assert.equal(recovered.retrySegmentIndex, 2);
  assert.equal(radio.beginSegmentGeneration(recovered, 1).reason, 'retry_segment_mismatch');
  assert.equal(radio.beginSegmentGeneration(recovered, 2).ok, true);
});

test('runtime preserves the current line cursor for playback recovery', () => {
  const runtime = radio.normalizeRadioRuntime({
    businessId: 'radio-1', plan, status: 'playing_2', segmentIndex: 2, playbackLineIndex: 3
  });
  assert.equal(runtime.playbackLineIndex, 3);
  const completed = radio.completeSegmentPlayback(runtime);
  assert.equal(completed.runtime.playbackLineIndex, 0);
});

test('radio settlement applies once for one business id', () => {
  const runtime = radio.normalizeRadioRuntime({
    businessId: 'radio-1', plan, status: 'awaiting_settlement', segmentIndex: 4, baseFans: 2000,
    segments: [{}, {}, {}, {
      fanGain: 420,
      highlight: 'The guest turned a hard question into an honest answer.',
      audienceResponse: 'Listeners want another episode.',
      impressionChange: 'More approachable without losing confidence.',
      followupHook: 'A listener challenges her to return.',
      resultSummary: 'The first broadcast ended successfully.'
    }]
  });
  const first = radio.settleRadioOnce(runtime, 'radio-1');
  assert.equal(first.ok, true);
  assert.equal(first.result.fans, 2420);
  assert.equal(first.result.resultSummary, 'The first broadcast ended successfully.');
  assert.equal(first.runtime.status, 'settled');
  assert.equal(radio.settleRadioOnce(first.runtime, 'radio-1').reason, 'already_settled');
});

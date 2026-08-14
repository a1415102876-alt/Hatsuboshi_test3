import test from 'node:test';
import assert from 'node:assert/strict';

await import('../nia-live-business-core.js');
const live = globalThis.HatsuNiaLiveBusiness;

test('live runtime starts ready with stable metrics', () => {
  const runtime = live.createLiveRuntime({ businessId: 'live-1', baseFans: 1200 });
  assert.equal(runtime.status, 'ready');
  assert.equal(runtime.segmentIndex, 0);
  assert.equal(runtime.metrics.viewers, 180);
  assert.equal(runtime.metrics.heat, 12);
  assert.equal(runtime.metrics.pressure, 0);
  assert.equal(runtime.baseFans, 1200);
});

test('live initial viewers scale with the current fan count', () => {
  const small = live.createLiveRuntime({ businessId: 'live-small', audienceFans: 1000 });
  const large = live.createLiveRuntime({ businessId: 'live-large', audienceFans: 10000 });
  assert.equal(small.status, 'ready');
  assert.ok(large.metrics.viewers > small.metrics.viewers);
  assert.equal(large.metrics.viewers, 980);
  assert.equal(large.metrics.peakViewers, large.metrics.viewers);
});

test('segments advance only through their legal states', () => {
  let runtime = live.createLiveRuntime({ businessId: 'live-1' });
  let result = live.beginSegmentGeneration(runtime, 1, { requestId: 'req-1' });
  assert.equal(result.ok, true);
  runtime = result.runtime;
  assert.equal(runtime.status, 'generating_1');

  result = live.applySegmentPayload(runtime, {
    businessId: 'live-1', segmentIndex: 1, topic: '开场', beats: [{ id: 'b1', type: 'dialogue', speaker: '花海咲季', text: '开始吧。' }],
    comments: [], audienceTrend: 'up', heatTrend: 'up', pressureTrend: 'flat', continuitySummary: '直播顺利开场。'
  });
  assert.equal(result.ok, true);
  assert.equal(result.runtime.status, 'playing_1');
  assert.equal(live.completeSegmentPlayback(result.runtime).runtime.status, 'awaiting_continue_1');
});

test('stale and skipped segment replies are rejected', () => {
  const started = live.beginSegmentGeneration(live.createLiveRuntime({ businessId: 'live-1' }), 1, { requestId: 'req-1' }).runtime;
  assert.equal(live.applySegmentPayload(started, { businessId: 'other', segmentIndex: 1 }).reason, 'business_id_mismatch');
  assert.equal(live.applySegmentPayload(started, { businessId: 'live-1', segmentIndex: 2 }).reason, 'segment_index_mismatch');
});

test('trend mapping is bounded and deterministic', () => {
  const metrics = live.applyTrendMetrics({ viewers: 180, peakViewers: 180, heat: 12, peakHeat: 12, pressure: 98 }, {
    audienceTrend: 'surge', heatTrend: 'up', pressureTrend: 'spike'
  });
  assert.equal(metrics.viewers, 540);
  assert.equal(metrics.heat, 24);
  assert.equal(metrics.pressure, 100);
  assert.equal(metrics.peakViewers, 540);
});

test('third segment requires one producer instruction before segment four', () => {
  const runtime = live.normalizeLiveRuntime({
    businessId: 'live-1', status: 'awaiting_producer_instruction', segmentIndex: 3,
    segments: [{}, {}, { incident: '评论区误解了她的话', options: ['A', 'B', 'C'] }]
  });
  const result = live.submitProducerInstruction(runtime, '把胜负欲引向挑战环节');
  assert.equal(result.ok, true);
  assert.equal(result.runtime.producerInstruction, '把胜负欲引向挑战环节');
  assert.equal(live.beginSegmentGeneration(result.runtime, 4, { requestId: 'req-4' }).ok, true);
});

test('refresh turns interrupted generation into retryable failure', () => {
  const runtime = live.normalizeLiveRuntime({ businessId: 'live-1', status: 'generating_2', segmentIndex: 1, pendingSegmentIndex: 2 });
  const recovered = live.recoverInterruptedLive(runtime);
  assert.equal(recovered.status, 'retryable_failed');
  assert.equal(recovered.retrySegmentIndex, 2);
});

test('settlement applies once for one business id', () => {
  const runtime = live.normalizeLiveRuntime({
    businessId: 'live-1', status: 'awaiting_settlement', segmentIndex: 4, baseFans: 2000,
    segments: [{}, {}, {}, { bonusTier: 'medium', imageMatch: 'strong', bonusReason: '强化了企划形象', closingSummary: '实力与可爱并存' }],
    metrics: { viewers: 4200, peakViewers: 4500, heat: 88, peakHeat: 92, pressure: 40 }
  });
  const first = live.settleLiveOnce(runtime, 'live-1');
  assert.equal(first.ok, true);
  assert.equal(first.result.fans, 2500);
  assert.equal(first.runtime.status, 'settled');
  assert.equal(live.settleLiveOnce(first.runtime, 'live-1').reason, 'already_settled');
});

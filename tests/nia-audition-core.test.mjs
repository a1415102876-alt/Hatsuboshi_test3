import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';

await import('../nia-audition-core.js');
const audition = globalThis.HatsuNiaAudition;

test('first audition freezes eight candidates and four score snapshots', () => {
  const runtime = audition.createAuditionRuntime({
    auditionId: 'audition-r1-001',
    idolName: '花海咲季',
    idolAvatar: './assets/avatars/hanami-saki.png'
  });
  assert.equal(runtime.status, 'ready');
  assert.equal(runtime.candidates.length, 8);
  assert.equal(runtime.rankings.length, 4);
  assert.deepEqual(runtime.rankings.map((snapshot) => snapshot.find((item) => item.isSelf).rank), [5, 4, 2, 1]);
  assert.equal(runtime.rankings[3][0].name, '花海咲季');
  for (const candidate of runtime.candidates) {
    const scores = runtime.rankings.map((snapshot) => snapshot.find((item) => item.id === candidate.id).score);
    assert.ok(scores.every((score, index) => index === 0 || score > scores[index - 1]));
  }
});

test('second audition freezes Rinha with the supplied ranking avatar', () => {
  const runtime = audition.createAuditionRuntime({
    auditionId: 'audition-r2-001',
    roundNumber: 2,
    idolName: '花海咲季',
    idolAvatar: './assets/avatars/hanami-saki.png',
    candidates: [{ id: 'nia-round2-kaya-rinha', name: '贺阳燐羽', avatar: './assets/avatars/kaya-rinha.png' }]
  });
  assert.equal(runtime.roundNumber, 2);
  assert.equal(runtime.candidates.length, 8);
  assert.deepEqual(runtime.rankings.map((snapshot) => snapshot.find((item) => item.isSelf).rank), [5, 4, 2, 1]);
  const rinha = runtime.candidates.find((candidate) => candidate.name === '贺阳燐羽');
  assert.equal(rinha?.id, 'nia-round2-kaya-rinha');
  assert.equal(rinha?.avatar, './assets/avatars/kaya-rinha.png');
  assert.equal(existsSync(new URL('../assets/avatars/kaya-rinha.png', import.meta.url)), true);
  assert.equal(runtime.rankings.every((snapshot) => snapshot.some((candidate) => candidate.id === rinha.id)), true);
});

test('FINALE freezes Ume as the named rival and Saki overtakes her in the last segment', () => {
  const runtime = audition.createAuditionRuntime({
    auditionId: 'nia-finale-001',
    roundNumber: 3,
    idolName: '花海咲季',
    idolAvatar: './assets/avatars/hanami-saki.png',
    candidates: [{ id: 'nia-finale-hanami-ume', name: '花海佑芽', avatar: './assets/avatars/hanami-ume.png' }]
  });
  const ume = runtime.candidates.find((candidate) => candidate.name === '花海佑芽');
  assert.equal(runtime.roundNumber, 3);
  assert.equal(ume?.avatar, './assets/avatars/hanami-ume.png');
  assert.equal(existsSync(new URL('../assets/avatars/hanami-ume.png', import.meta.url)), true);
  assert.deepEqual(runtime.rankings.slice(0, 3).map((snapshot) => snapshot.find((item) => item.id === ume.id).rank), [1, 1, 1]);
  assert.equal(runtime.rankings[3].find((item) => item.isSelf).rank, 1);
  assert.equal(runtime.rankings[3].find((item) => item.id === ume.id).rank, 2);
});

test('audition segments advance only through legal states', () => {
  let runtime = audition.createAuditionRuntime({ auditionId: 'audition-r1-001', idolName: '花海咲季' });
  const started = audition.beginAuditionSegment(runtime, 1, { requestId: 'req-1' });
  assert.equal(started.ok, true);
  runtime = started.runtime;
  assert.equal(runtime.status, 'generating_1');

  const applied = audition.applyAuditionSegment(runtime, {
    auditionId: 'audition-r1-001', segmentIndex: 1,
    lines: [{ type: 'narration', speaker: '', text: '咲季登上舞台。' }],
    continuitySummary: '咲季完成开场。'
  });
  assert.equal(applied.ok, true);
  assert.equal(applied.runtime.status, 'playing_1');
  const completed = audition.completeAuditionPlayback(applied.runtime);
  assert.equal(completed.runtime.status, 'awaiting_continue_1');
  assert.equal(audition.beginAuditionSegment(applied.runtime, 2).reason, 'illegal_status');
  assert.equal(audition.beginAuditionSegment(completed.runtime, 2).ok, true);
});

test('audition rejects mismatched identity and segment replies', () => {
  const runtime = audition.beginAuditionSegment(
    audition.createAuditionRuntime({ auditionId: 'audition-r1-001', idolName: '花海咲季' }), 1
  ).runtime;
  assert.equal(audition.applyAuditionSegment(runtime, { auditionId: 'other', segmentIndex: 1 }).reason, 'audition_id_mismatch');
  assert.equal(audition.applyAuditionSegment(runtime, { auditionId: 'audition-r1-001', segmentIndex: 2 }).reason, 'segment_index_mismatch');
});

test('refresh makes interrupted generation retryable only for that segment', () => {
  const runtime = audition.normalizeAuditionRuntime({
    auditionId: 'audition-r1-001', idolName: '花海咲季',
    status: 'generating_3', segmentIndex: 2, pendingSegmentIndex: 3
  });
  const recovered = audition.recoverInterruptedAudition(runtime);
  assert.equal(recovered.status, 'retryable_failed');
  assert.equal(recovered.retrySegmentIndex, 3);
  assert.equal(audition.beginAuditionSegment(recovered, 2).reason, 'retry_segment_mismatch');
  assert.equal(audition.beginAuditionSegment(recovered, 3).ok, true);
});

test('fourth segment settles first place exactly once', () => {
  const runtime = audition.normalizeAuditionRuntime({
    auditionId: 'audition-r1-001', idolName: '花海咲季', status: 'awaiting_settlement', segmentIndex: 4,
    context: { growth: { Vo: 8, Da: 29.5, Vi: 25.5 } },
    segments: [{}, {}, {}, {
      highlight: '训练成果在最后一组镜头中完整兑现。',
      weakness: '开场仍然容易过度紧绷。',
      payoffSummary: '咲季把本轮积累转化成了自己的舞台表现。',
      resultSummary: '花海咲季获得第一名并通过首轮试镜。'
    }]
  });
  const first = audition.settleAuditionOnce(runtime, 'audition-r1-001');
  assert.equal(first.ok, true);
  assert.equal(first.result.rank, 1);
  assert.equal(first.result.qualified, true);
  assert.equal(first.result.fanGain, 10000);
  assert.deepEqual(first.result.statGains, { Vo: 130, Da: 155, Vi: 151 });
  assert.equal(first.runtime.status, 'settled');
  assert.equal(audition.settleAuditionOnce(first.runtime, 'audition-r1-001').reason, 'already_settled');
});

test('first audition rewards treat missing or negative growth as zero', () => {
  assert.deepEqual(
    audition.calculateFirstAuditionRewards({ Vo: -5, Da: null }),
    { fanGain: 10000, statGains: { Vo: 120, Da: 120, Vi: 120 } }
  );
});

test('second audition doubles the final fan and stat rewards exactly', () => {
  const runtime = audition.normalizeAuditionRuntime({
    auditionId: 'audition-r2-rewards', roundNumber: 2, idolName: '花海咲季',
    status: 'awaiting_settlement', segmentIndex: 4,
    context: { round: 2, growth: { Vo: 8, Da: 29.5, Vi: 25.5 } },
    segments: [{}, {}, {}, {
      highlight: '咲季在终盘完成逆转。',
      weakness: '仍需继续积累经验。',
      payoffSummary: '第二轮成果得到兑现。',
      resultSummary: '花海咲季获得第一名并通过第二轮试镜。'
    }]
  });
  const settled = audition.settleAuditionOnce(runtime, 'audition-r2-rewards');
  assert.equal(settled.ok, true);
  assert.equal(settled.result.fanGain, 20000);
  assert.deepEqual(settled.result.statGains, { Vo: 260, Da: 310, Vi: 302 });
  assert.deepEqual(
    audition.calculateAuditionRewards({ Vo: -5, Da: null }, 2),
    { fanGain: 20000, statGains: { Vo: 240, Da: 240, Vi: 240 } }
  );
  assert.deepEqual(
    audition.calculateAuditionRewards({ Vo: -5, Da: null }, 3),
    { fanGain: 20000, statGains: { Vo: 240, Da: 240, Vi: 240 } }
  );
});

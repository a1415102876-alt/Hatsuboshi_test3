import test from 'node:test';
import assert from 'node:assert/strict';

await import('../nia-fan-milestone-core.js');
const core = globalThis.HatsuNiaFanMilestone;

test('old saves receive an idle 5000-fan milestone', () => {
  assert.deepEqual(core.normalizeFanMilestone({}), {
    eventId: 'nia-saki-fans-5000',
    threshold: 5000,
    status: 'idle',
    story: '',
    activeRequest: null,
    lastError: '',
    triggeredAtFans: 0,
    completedAt: 0,
    updatedAt: 0
  });
});

test('only formal NIA routes reach the pending milestone', () => {
  const idle = core.normalizeFanMilestone({});
  assert.equal(core.reconcileFanMilestone(idle, {
    scenario: 'nia', idolName: '花海咲季', fans: 4999
  }).status, 'idle');
  assert.equal(core.reconcileFanMilestone(idle, {
    scenario: 'hatsu', idolName: '花海咲季', fans: 5000
  }).status, 'idle');
  assert.equal(core.reconcileFanMilestone(idle, {
    scenario: 'nia', idolName: '藤田琴音', fans: 5000
  }).status, 'idle');

  const pending = core.reconcileFanMilestone(idle, {
    scenario: 'nia', idolName: '花海咲季', fans: 5000
  });
  assert.equal(pending.status, 'pending');
  assert.equal(pending.triggeredAtFans, 5000);
  assert.deepEqual(core.reconcileFanMilestone(pending, {
    scenario: 'nia', idolName: '花海咲季', fans: 9000
  }), pending);
});

test('generation accepts only the matching event and stores no rewards', () => {
  const pending = core.reconcileFanMilestone({}, {
    scenario: 'nia', idolName: '花海咲季', fans: 5000
  });
  const generating = core.beginFanMilestoneGeneration(pending, { requestId: 'fan-1' });
  assert.equal(generating.ok, true);
  assert.equal(generating.runtime.status, 'generating');

  assert.equal(core.applyFanMilestoneStory(generating.runtime, {
    eventId: 'other', story: '<narration>错误事件。</narration>'
  }).reason, 'event_id_mismatch');

  const applied = core.applyFanMilestoneStory(generating.runtime, {
    eventId: 'nia-saki-fans-5000',
    story: '<dialogue char="花海咲季">“粉丝增加了！”</dialogue>',
    fanGain: 99999,
    affinityGain: 100
  });
  assert.equal(applied.ok, true);
  assert.equal(applied.runtime.status, 'playing');
  assert.equal(applied.runtime.story.includes('粉丝增加了'), true);
  assert.equal('fanGain' in applied.runtime, false);
  assert.equal('affinityGain' in applied.runtime, false);
});

test('interrupted generation becomes retryable while playing content survives refresh', () => {
  const interrupted = core.normalizeFanMilestone({
    status: 'generating',
    activeRequest: { requestId: 'fan-1' },
    triggeredAtFans: 5200
  });
  const recovered = core.recoverInterruptedFanMilestone(interrupted);
  assert.equal(recovered.status, 'retryable_failed');
  assert.equal(recovered.activeRequest, null);

  const playing = core.normalizeFanMilestone({
    status: 'playing',
    story: '<narration>保存的剧情。</narration>',
    triggeredAtFans: 5200
  });
  assert.deepEqual(core.recoverInterruptedFanMilestone(playing), playing);
});

test('completion is idempotent and permanently prevents retriggering', () => {
  const playing = core.normalizeFanMilestone({
    status: 'playing', story: '<narration>剧情结束。</narration>', triggeredAtFans: 5000
  });
  const completed = core.completeFanMilestone(playing);
  assert.equal(completed.ok, true);
  assert.equal(completed.runtime.status, 'completed');
  assert.equal(core.completeFanMilestone(completed.runtime).reason, 'already_completed');
  assert.equal(core.reconcileFanMilestone(completed.runtime, {
    scenario: 'nia', idolName: '花海咲季', fans: 15000
  }).status, 'pending');
});

test('the next milestone is Saki episode 13 at 10000 fans', () => {
  const context = { scenario: 'nia', idolName: '鑺辨捣鍜插', fans: 10000 };
  const pending12 = core.reconcileFanMilestone({}, context);
  const completed12 = core.normalizeFanMilestone({ ...pending12, status: 'completed', completedAt: 1 });
  const episode13 = core.reconcileFanMilestone(completed12, context);
  assert.equal(episode13.eventId, 'nia-saki-fans-10000');
  assert.equal(episode13.threshold, 10000);
  assert.equal(core.getFanMilestoneDefinition(episode13.eventId).episode, 13);
  assert.equal(episode13.status, 'pending');

  const completed13 = core.normalizeFanMilestone({
    eventId: 'nia-saki-fans-10000', status: 'completed', completedAt: 2
  });
  assert.equal(core.reconcileFanMilestone(completed13, {
    scenario: 'nia', idolName: '鑺辨捣鍜插', fans: 30000
  }).status, 'idle');
});

test('episodes 14 and 15 occupy the last two second-round schedule evenings', () => {
  const completed13 = core.normalizeFanMilestone({
    eventId: 'nia-saki-fans-10000', status: 'completed', completedAt: 2
  });
  const early = core.reconcileFanMilestone(completed13, {
    scenario: 'nia', idolName: '花海咲季', fans: 15000,
    round: 2, planLength: 5, actionIndex: 4
  });
  assert.equal(early.eventId, 'nia-saki-round2-audition-eve');
  assert.equal(core.getFanMilestoneDefinition(early.eventId).episode, 14);
  assert.equal(early.status, 'pending');

  const completed14 = core.normalizeFanMilestone({ ...early, status: 'completed', completedAt: 3 });
  const pending = core.reconcileFanMilestone(completed14, {
    scenario: 'nia', idolName: '花海咲季', fans: 15000,
    round: 2, planLength: 5, actionIndex: 5
  });
  assert.equal(pending.eventId, 'nia-saki-round2-quartet-opening');
  assert.equal(core.getFanMilestoneDefinition(pending.eventId).episode, 15);
  assert.equal(pending.status, 'pending');

  const completed15 = core.normalizeFanMilestone({ ...pending, status: 'completed', completedAt: 4 });
  const waiting16 = core.reconcileFanMilestone(completed15, {
    scenario: 'nia', idolName: '花海咲季', fans: 30000,
    round: 2, planLength: 5, actionIndex: 5
  });
  assert.equal(waiting16.eventId, 'nia-saki-round2-quartet-victory');
  assert.equal(core.getFanMilestoneDefinition(waiting16.eventId).episode, 16);
  assert.equal(waiting16.status, 'idle');
});

test('episode 16 waits for the completed second-round audition recap', () => {
  const waiting = core.normalizeFanMilestone({
    eventId: 'nia-saki-round2-quartet-victory', status: 'idle'
  });
  const context = {
    scenario: 'nia', idolName: '花海咲季', fans: 30000,
    round: 2, planLength: 5, actionIndex: 5
  };
  assert.equal(core.reconcileFanMilestone(waiting, context).status, 'idle');
  const pending = core.reconcileFanMilestone(waiting, {
    ...context, secondRoundAuditionCompleted: true
  });
  assert.equal(pending.status, 'pending');
  assert.equal(pending.eventId, 'nia-saki-round2-quartet-victory');

  const completed16 = core.normalizeFanMilestone({ ...pending, status: 'completed', completedAt: 5 });
  const waiting17 = core.reconcileFanMilestone(completed16, {
    ...context, secondRoundAuditionCompleted: true
  });
  assert.equal(waiting17.eventId, 'nia-saki-round3-first-business');
  assert.equal(waiting17.status, 'idle');
});

test('episode 17 waits for the first completed business action in round three', () => {
  const waiting = core.normalizeFanMilestone({
    eventId: 'nia-saki-round3-first-business', status: 'idle'
  });
  const context = {
    scenario: 'nia', idolName: '花海咲季', fans: 32000,
    round: 3, planLength: 5, actionIndex: 2
  };
  assert.equal(core.reconcileFanMilestone(waiting, context).status, 'idle');

  const pending = core.reconcileFanMilestone(waiting, {
    ...context, thirdRoundFirstBusinessCompleted: true
  });
  assert.equal(pending.eventId, 'nia-saki-round3-first-business');
  assert.equal(core.getFanMilestoneDefinition(pending.eventId).episode, 17);
  assert.equal(pending.status, 'pending');

  const completed17 = core.normalizeFanMilestone({ ...pending, status: 'completed', completedAt: 6 });
  const waiting18 = core.reconcileFanMilestone(completed17, {
    ...context, thirdRoundFirstBusinessCompleted: true
  });
  assert.equal(waiting18.eventId, 'nia-saki-round3-finale-eve');
  assert.equal(waiting18.status, 'idle');
});

test('episode 18 waits for the completed third-round schedule before FINALE', () => {
  const waiting = core.normalizeFanMilestone({
    eventId: 'nia-saki-round3-finale-eve', status: 'idle'
  });
  const context = {
    scenario: 'nia', idolName: '花海咲季', fans: 42000,
    round: 3, planLength: 5, actionIndex: 4,
    thirdRoundFirstBusinessCompleted: true
  };
  assert.equal(core.reconcileFanMilestone(waiting, context).status, 'idle');
  const pending = core.reconcileFanMilestone(waiting, {
    ...context, actionIndex: 5, thirdRoundScheduleCompleted: true
  });
  assert.equal(pending.eventId, 'nia-saki-round3-finale-eve');
  assert.equal(core.getFanMilestoneDefinition(pending.eventId).episode, 18);
  assert.equal(pending.status, 'pending');
});

test('episodes 19 and 20 run in order only after the completed FINALE recap', () => {
  const completed18 = core.normalizeFanMilestone({
    eventId: 'nia-saki-round3-finale-eve', status: 'completed', completedAt: 7
  });
  const beforeFinale = {
    scenario: 'nia', idolName: '花海咲季', fans: 50000,
    round: 3, planLength: 5, actionIndex: 5,
    thirdRoundScheduleCompleted: true
  };
  const waiting19 = core.reconcileFanMilestone(completed18, beforeFinale);
  assert.equal(waiting19.eventId, 'nia-saki-finale-sisters-aftermath');
  assert.equal(core.getFanMilestoneDefinition(waiting19.eventId).episode, 19);
  assert.equal(waiting19.status, 'idle');

  const pending19 = core.reconcileFanMilestone(waiting19, {
    ...beforeFinale, thirdRoundFinaleCompleted: true
  });
  assert.equal(pending19.status, 'pending');

  const completed19 = core.normalizeFanMilestone({ ...pending19, status: 'completed', completedAt: 8 });
  const pending20 = core.reconcileFanMilestone(completed19, {
    ...beforeFinale, thirdRoundFinaleCompleted: true
  });
  assert.equal(pending20.eventId, 'nia-saki-finale-partner-epilogue');
  assert.equal(core.getFanMilestoneDefinition(pending20.eventId).episode, 20);
  assert.equal(pending20.status, 'pending');

  const completed20 = core.normalizeFanMilestone({ ...pending20, status: 'completed', completedAt: 9 });
  const terminal = core.reconcileFanMilestone(completed20, {
    ...beforeFinale, thirdRoundFinaleCompleted: true
  });
  assert.equal(terminal.eventId, 'nia-saki-finale-partner-epilogue');
  assert.equal(terminal.status, 'completed');
});

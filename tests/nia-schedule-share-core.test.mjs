import test from 'node:test';
import assert from 'node:assert/strict';
await import('../nia-schedule-share-core.js');
const core = globalThis.HatsuNiaScheduleShare;

const plan = {
  idol: '花海咲季',
  round: 1,
  days: [
    { day: 1, type: '制作人工作', title: '争取广播机会', purpose: '确定节目条件' },
    { day: 2, type: '陪同训练', title: '临场表达训练', purpose: '准备正式收录' },
    { day: 3, type: '外出', title: '水族馆散心', purpose: '调整状态并确认方向' },
    { day: 4, type: '营业', title: '线上预热', purpose: '建立节目期待' },
    { day: 5, type: '营业', title: '初星放送部', purpose: '完成正式广播首秀' }
  ]
};

test('builds one fixed five-day attachment from the committed plan', () => {
  const attachment = core.buildScheduleAttachment(plan);
  assert.equal(attachment.kind, 'nia_schedule_attachment');
  assert.equal(attachment.title, 'N.I.A 第一轮活动日程');
  assert.equal(attachment.statusLabel, '5日企划 · 已确认');
  assert.equal(attachment.days.length, 5);
  assert.deepEqual(attachment.days[2], {
    day: 3,
    type: '外出',
    title: '水族馆散心',
    purpose: '调整状态并确认方向'
  });
  assert.match(attachment.planId, /^nia-plan-/);
});

test('builds a third-round attachment without falling back to round one', () => {
  const attachment = core.buildScheduleAttachment({
    ...plan,
    round: 3,
    days: plan.days.map((day) => ({ ...day, day: day.day + 1 }))
  });
  assert.equal(attachment.title, 'N.I.A 第三轮活动日程');
  assert.equal(attachment.statusLabel, '第2日至第6日企划 · 已确认');
  assert.deepEqual(attachment.days.map((day) => day.day), [2, 3, 4, 5, 6]);
});

test('keeps attachment identity while a failed reply becomes retryable', () => {
  const attachment = core.buildScheduleAttachment(plan);
  const awaiting = core.beginScheduleShare({}, {
    planId: attachment.planId,
    threadId: 'idol',
    attachmentMessageId: 'message-1',
    requestId: 'request-1'
  });
  const failed = core.markScheduleShareFailed(awaiting, {
    planId: attachment.planId,
    threadId: 'idol',
    requestId: 'request-1',
    error: 'Too Many Requests'
  });
  assert.equal(failed.status, 'retryable_failed');
  assert.equal(failed.attachmentMessageId, 'message-1');
  assert.equal(failed.requestId, '');
});

test('rejects stale completion and accepts the matching reply once', () => {
  const attachment = core.buildScheduleAttachment(plan);
  const awaiting = core.beginScheduleShare({}, {
    planId: attachment.planId,
    threadId: 'idol',
    attachmentMessageId: 'message-1',
    requestId: 'request-current'
  });
  const stale = core.completeScheduleShare(awaiting, {
    planId: attachment.planId,
    threadId: 'idol',
    requestId: 'request-stale',
    replyMessageId: 'reply-stale'
  });
  assert.equal(stale.status, 'awaiting_reply');
  assert.equal(stale.replyMessageId, '');

  const completed = core.completeScheduleShare(awaiting, {
    planId: attachment.planId,
    threadId: 'idol',
    requestId: 'request-current',
    replyMessageId: 'reply-1'
  });
  assert.equal(completed.status, 'completed');
  assert.equal(completed.replyMessageId, 'reply-1');
  assert.deepEqual(core.completeScheduleShare(completed, {
    planId: attachment.planId,
    threadId: 'idol',
    requestId: 'request-current',
    replyMessageId: 'reply-2'
  }), completed);
});

test('reaction prompt anchors Day 3 outing and Day 5 radio as future activities', () => {
  const prompt = core.buildScheduleReactionPrompt(plan, {
    idolName: '花海咲季',
    outputContract: '<初星私聊 from="花海咲季">...</初星私聊>'
  });
  assert.match(prompt, /日程已经最终确认并发送/);
  assert.match(prompt, /DAY 3｜外出｜水族馆散心/);
  assert.match(prompt, /DAY 5｜营业｜初星放送部/);
  assert.match(prompt, /当前仍是 Day 1 开始前/);
  assert.match(prompt, /不得把未来活动写成今天正在发生/);
  assert.match(prompt, /<初星私聊 from="花海咲季">/);
});

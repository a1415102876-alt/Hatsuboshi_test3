import test from 'node:test';
import assert from 'node:assert/strict';

await import('../nia-producer-work-core.js');
const api = await import('../nia-producer-work-api.js');
const workCore = globalThis.HatsuNiaProducerWork;

test('radio plan task is available as a one-period management task', () => {
  const work = workCore.createSakiRoundOneWorkday({ day: 1 });
  const task = work.tasks.find((item) => item.id === 'radio-department-plan');
  assert.ok(task);
  assert.equal(task.category, 'management');
  assert.equal(task.durationPeriods, 1);
  assert.equal(task.outputType, 'radio_plan');
});

test('incomplete radio plan blocks school radio preparation', () => {
  const work = workCore.createSakiRoundOneWorkday({ day: 1 });
  const prepared = workCore.resolveBusinessPreparation(work, 'school_radio', { title: '初星放送部' });
  assert.equal(prepared.ok, false);
  assert.equal(prepared.reason, 'radio_plan_incomplete');
});

test('completed radio plan prepares the same business id and required fields', () => {
  let work = workCore.createSakiRoundOneWorkday({ day: 1 });
  const task = work.tasks.find((item) => item.id === 'radio-department-plan');
  work = workCore.assignTaskToPeriod(work, task.id, 'morning', task.phases[0].id).runtime;
  work.status = 'generating';
  work.periods[0].status = 'generating';
  const result = workCore.applyWorkReceipt(work, {
    receiptId: 'radio-receipt-1', taskId: task.id, periodId: 'morning', completedPhase: task.phases[0].id,
    summary: '广播企划完成', story: '<narration>企划完成。</n</narration>',
    radioPlan: {
      business_id: 'radio-business-1', programTitle: '初星放送部', episodeTitle: '初回', goal: '认识咲季',
      host: '真诚优', guest: '花海咲季', interviewFocus: '胜负心',
      additionalGuestMode: 'specified', additionalGuest: '花海佑芽'
    }
  });
  assert.equal(result.ok, true);
  const prepared = workCore.resolveBusinessPreparation(result.runtime, 'school_radio');
  assert.equal(prepared.ok, true);
  assert.equal(prepared.sourceKind, 'radio_plan');
  assert.equal(prepared.radioPlan.business_id, 'radio-business-1');
  assert.equal(prepared.radioPlan.host, '真诚优');
  assert.equal(prepared.radioPlan.additionalGuestMode, 'specified');
  assert.equal(prepared.radioPlan.additionalGuest, '花海佑芽');
});

test('business preparation does not turn a specified radio guest back into random mode', () => {
  const work = workCore.normalizeProducerWork({
    status: 'complete',
    radioPlan: {
      business_id: 'radio-ume-guest', programTitle: '初星放送部', episodeTitle: '姐妹特辑',
      goal: '呈现姐妹互动', host: '真诚优', guest: '花海咲季', interviewFocus: '姐妹竞争',
      additionalGuestMode: 'specified', additionalGuest: '花海佑芽'
    },
    tasks: [{
      id: 'radio-department-plan', category: 'management', status: 'completed',
      goal: '完成广播企划', expectedOutput: '广播企划单', phases: [], completedPhases: []
    }]
  });
  const prepared = workCore.resolveBusinessPreparation(work, 'school_radio');
  assert.equal(prepared.ok, true);
  assert.equal(prepared.radioPlan.additionalGuestMode, 'specified');
  assert.equal(prepared.radioPlan.additionalGuest, '花海佑芽');
});

test('completed radio task recovers a deterministic plan when the AI omitted radioPlan', () => {
  const work = workCore.createSakiRoundOneWorkday({ day: 1 });
  const task = work.tasks.find((item) => item.id === 'radio-department-plan');
  task.status = 'completed';
  task.completedPhases = task.phases.map((phase) => phase.id);
  work.processedReceiptIds = ['receipt-without-radio-plan'];

  const prepared = workCore.resolveBusinessPreparation(work, 'school_radio', {
    title: '初星放送部', purpose: '介绍新人偶像', idol: '花海咲季'
  });

  assert.equal(prepared.ok, true);
  assert.equal(prepared.sourceKind, 'completed_radio_task');
  assert.equal(prepared.radioPlan.business_id, 'nia-radio-receipt-without-radio-plan');
  assert.equal(prepared.radioPlan.host, '真诚优');
  assert.equal(prepared.radioPlan.guest, '花海咲季');
  assert.deepEqual(prepared.runtime.radioPlan, prepared.radioPlan);
});

test('settled radio plan cannot be prepared again', () => {
  const work = workCore.normalizeProducerWork({
    status: 'complete', radioPlan: { business_id: 'radio-business-1', programTitle: '初星放送部' },
    radioSettledBusinessId: 'radio-business-1'
  });
  const prepared = workCore.resolveBusinessPreparation(work, 'school_radio');
  assert.equal(prepared.ok, false);
  assert.equal(prepared.reason, 'radio_already_settled');
});

test('producer work prompt and receipt preserve the radio plan contract', () => {
  const task = workCore.createSakiRoundOneWorkday({ day: 1 }).tasks.find((item) => item.id === 'radio-department-plan');
  const context = {
    receiptId: 'receipt-radio', taskId: task.id, phaseId: task.phases[0].id,
    periodId: 'morning', isFinalPeriod: false, idol: '花海咲季'
  };
  const prompt = api.buildNiaProducerWorkPrompt(context, task, { id: 'morning' }, {});
  assert.match(prompt, /radioPlan/);
  assert.match(prompt, /business_id/);
  const raw = {
    receiptId: 'receipt-radio', taskId: task.id, periodId: 'morning', completedPhase: task.phases[0].id,
    story: '<narration>完成。</n</narration>', summary: '企划完成',
    radioPlan: { business_id: 'radio-1', programTitle: '初星放送部', episodeTitle: '初回', goal: '介绍咲季', host: '真诚优', guest: '花海咲季', interviewFocus: '胜负心' }
  };
  const normalized = api.normalizeNiaProducerWorkReceipt(raw, context);
  assert.equal(normalized.ok, true);
  assert.equal(normalized.data.radioPlan.business_id, 'radio-1');
});

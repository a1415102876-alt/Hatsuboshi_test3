import test from 'node:test';
import assert from 'node:assert/strict';

await import('../nia-producer-work-core.js');

const workCore = globalThis.HatsuNiaProducerWork;

test('first-round workday keeps the fixed meeting and three schedulable periods', () => {
  const work = workCore.createSakiRoundOneWorkday({ day: 1 });
  assert.equal(work.status, 'planning');
  assert.equal(work.periods.length, 3);
  assert.equal(work.periods[1].id, 'afternoon');
  assert.equal(work.periods[1].fixed, true);
  assert.equal(work.tasks.filter((task) => task.priority !== 'companion').length, 3);
  assert.equal(work.tasks.filter((task) => task.priority === 'companion').length, 1);
});

test('first-round workday replaces the companion idol name for non-Saki routes', () => {
  const work = workCore.createSakiRoundOneWorkday({ day: 1, idol: '藤田琴音' });
  const companion = work.tasks.find((task) => task.priority === 'companion');
  assert.equal(companion.title, '陪同藤田琴音训练');
  assert.doesNotMatch(JSON.stringify(companion), /咲季/);
});

test('normalization migrates persisted Saki task copy for another active route', () => {
  const persisted = workCore.createSakiRoundOneWorkday({ day: 1 });
  const migrated = workCore.normalizeProducerWork(persisted, '藤田琴音');
  const companion = migrated.tasks.find((task) => task.priority === 'companion');
  assert.equal(companion.title, '陪同藤田琴音训练');
  assert.doesNotMatch(JSON.stringify(migrated.tasks), /咲季/);
});

test('keeps an AI supplied morning appointment without dropping the core afternoon meeting', () => {
  const work = workCore.createSakiRoundOneWorkday({
    day: 1,
    workSeed: {
      tasks: [
        {
          id: 'vlog-shoot',
          category: 'online',
          priority: 'optional',
          title: '向咲季提议Vlog拍摄企划',
          phases: [{ id: 'shoot', label: '整理提案材料', fixedPeriod: 'morning' }]
        },
        {
          id: 'variety-meeting',
          category: 'external',
          priority: 'core',
          title: '新人偶像综艺出演洽谈',
          deadline: '今日下午',
          phases: [{ id: 'meeting', label: '正式洽谈', required: true }]
        }
      ]
    }
  });

  assert.equal(work.periods[0].taskId, 'vlog-shoot');
  assert.equal(work.periods[0].fixed, true);
  assert.equal(work.periods[1].taskId, 'variety-meeting');
  assert.equal(work.periods[1].phaseId, 'meeting');
  assert.equal(work.periods[1].fixed, true);
});

test('repairs a persisted planning schedule that lost its afternoon meeting', () => {
  const broken = workCore.normalizeProducerWork({
    status: 'planning',
    tasks: [
      {
        id: 'vlog-shoot',
        category: 'online',
        title: 'Vlog拍摄企划',
        phases: [{ id: 'shoot', label: '整理素材', fixedPeriod: 'morning' }]
      },
      {
        id: 'variety-meeting',
        category: 'external',
        priority: 'core',
        title: '新人偶像综艺出演洽谈',
        deadline: '今日下午',
        phases: [{ id: 'meeting', label: '正式洽谈', required: true }]
      }
    ],
    periods: [
      { taskId: 'vlog-shoot', phaseId: 'shoot', fixed: true, status: 'ready' },
      {},
      {}
    ]
  });

  const repaired = workCore.reconcileFixedAppointments(broken);
  assert.equal(repaired.periods[1].taskId, 'variety-meeting');
  assert.equal(repaired.periods[1].phaseId, 'meeting');
  assert.equal(repaired.periods[1].fixed, true);
});

test('schedule protects fixed appointments and limits companion training to one period', () => {
  let work = workCore.createSakiRoundOneWorkday({ day: 1 });
  const companion = work.tasks.find((task) => task.category === 'training');
  const assigned = workCore.assignTaskToPeriod(work, companion.id, 'morning', 'companion');
  assert.equal(assigned.ok, true);
  work = assigned.runtime;
  assert.equal(workCore.assignTaskToPeriod(work, companion.id, 'evening', 'companion').reason, 'training_already_assigned');
  assert.equal(workCore.clearFutureAssignment(work, 'afternoon').reason, 'period_locked');
});

test('radio activity forces the radio plan into an AI supplied three-task workday', () => {
  const work = workCore.createSakiRoundOneWorkday({
    day: 1,
    requiresRadioPlan: true,
    workSeed: {
      tasks: [
        {
          id: 'required-meeting',
          category: 'external',
          priority: 'core',
          title: '节目出演洽谈',
          phases: [{ id: 'meeting', label: '正式洽谈', required: true }]
        },
        {
          id: 'core-publicity',
          category: 'management',
          priority: 'core',
          title: '核心宣传资料整理',
          phases: [{ id: 'draft', label: '整理资料' }]
        },
        {
          id: 'extra-interview',
          category: 'external',
          priority: 'optional',
          title: '追加采访接洽',
          phases: [{ id: 'contact', label: '联系编辑' }]
        }
      ]
    }
  });

  assert.ok(work.tasks.some((task) => task.id === 'radio-department-plan'));
  assert.ok(work.tasks.some((task) => task.id === 'required-meeting'));
  assert.equal(work.periods[1].taskId, 'required-meeting');
});

test('radio workday cannot be confirmed until the radio plan is scheduled', () => {
  let work = workCore.createSakiRoundOneWorkday({ day: 1, requiresRadioPlan: true });
  const vlog = work.tasks.find((task) => task.id === 'saki-vlog-prep');
  const companion = work.tasks.find((task) => task.id === 'saki-companion-training');

  work = workCore.assignTaskToPeriod(work, vlog.id, 'morning', vlog.phases[0].id).runtime;
  work = workCore.assignTaskToPeriod(work, companion.id, 'evening', companion.phases[0].id).runtime;

  assert.equal(workCore.validateWorkSchedule(work, { requireRadioPlan: true }).reason, 'radio_plan_required');
  assert.equal(workCore.validateWorkSchedule(work, { requireRadioPlan: false }).ok, true);

  work = workCore.clearFutureAssignment(work, 'morning').runtime;
  const radio = work.tasks.find((task) => task.id === 'radio-department-plan');
  work = workCore.assignTaskToPeriod(work, radio.id, 'morning', radio.phases[0].id).runtime;
  assert.equal(workCore.validateWorkSchedule(work, { requireRadioPlan: true }).ok, true);
});

test('online live activity forces a dedicated live plan into producer work', () => {
  const work = workCore.createSakiRoundOneWorkday({
    day: 1,
    requiresOnlineLivePlan: true,
    workSeed: {
      tasks: [
        { id: 'required-meeting', category: 'external', priority: 'core', title: '节目洽谈', phases: [{ id: 'meeting', label: '正式洽谈', required: true }] },
        { id: 'publicity', category: 'management', title: '资料整理', phases: [{ id: 'draft', label: '整理' }] },
        { id: 'extra', category: 'management', title: '其他工作', phases: [{ id: 'execute', label: '执行' }] }
      ]
    }
  });
  assert.ok(work.tasks.some((task) => task.id === 'online-live-plan'));
  assert.ok(work.tasks.some((task) => task.id === 'required-meeting'));
});

test('online live workday cannot be confirmed until live planning is scheduled', () => {
  let work = workCore.createSakiRoundOneWorkday({ day: 1, requiresOnlineLivePlan: true });
  const radio = work.tasks.find((task) => task.id === 'radio-department-plan');
  const companion = work.tasks.find((task) => task.id === 'saki-companion-training');
  work = workCore.assignTaskToPeriod(work, radio.id, 'morning', radio.phases[0].id).runtime;
  work = workCore.assignTaskToPeriod(work, companion.id, 'evening', companion.phases[0].id).runtime;
  assert.equal(workCore.validateWorkSchedule(work, { requireOnlineLivePlan: true }).reason, 'online_live_plan_required');
  work = workCore.clearFutureAssignment(work, 'morning').runtime;
  const livePlan = work.tasks.find((task) => task.id === 'online-live-plan');
  work = workCore.assignTaskToPeriod(work, livePlan.id, 'morning', livePlan.phases[0].id).runtime;
  assert.equal(workCore.validateWorkSchedule(work, { requireOnlineLivePlan: true }).ok, true);
});

test('persisted planning work is repaired with required live planning', () => {
  const original = workCore.createSakiRoundOneWorkday({ day: 1 });
  assert.equal(original.tasks.some((task) => task.id === 'online-live-plan'), false);
  const repaired = workCore.reconcileBusinessRequirements(original, { requireOnlineLivePlan: true });
  assert.equal(repaired.tasks.some((task) => task.id === 'online-live-plan'), true);
  assert.equal(repaired.periods[1].fixed, true);
});

test('radio and online live requirements coexist in the same workday', () => {
  const work = workCore.createSakiRoundOneWorkday({
    day: 1,
    requiresRadioPlan: true,
    requiresOnlineLivePlan: true
  });
  assert.ok(work.tasks.some((task) => task.id === 'radio-department-plan'));
  assert.ok(work.tasks.some((task) => task.id === 'online-live-plan'));
  assert.ok(work.tasks.some((task) => task.category === 'external' && task.priority === 'core'));
});

test('receipt advances one period once and keeps objective work records', () => {
  let work = workCore.createSakiRoundOneWorkday({ day: 1 });
  const management = work.tasks.find((task) => task.category === 'management');
  work = workCore.assignTaskToPeriod(work, management.id, 'morning', management.phases[0].id).runtime;
  work.status = 'generating';
  work.periods[0].status = 'generating';
  const receipt = {
    receiptId: 'receipt-1',
    taskId: management.id,
    periodId: 'morning',
    completedPhase: management.phases[0].id,
    summary: '形成了取材优先级。',
    story: '<narration>文件整理完成。</narration>',
    documents: ['商店街取材方案'],
    careerLog: ['首次完成生活向取材预案']
  };
  const applied = workCore.applyWorkReceipt(work, receipt);
  assert.equal(applied.ok, true);
  assert.equal(applied.runtime.periodIndex, 1);
  assert.deepEqual(applied.runtime.documents, ['商店街取材方案']);
  const duplicate = workCore.applyWorkReceipt(applied.runtime, receipt);
  assert.equal(duplicate.duplicate, true);
  assert.equal(duplicate.runtime.periodIndex, 1);
});

test('online reactions map to small bounded fan deltas', () => {
  assert.equal(workCore.getOnlineFanDelta('flat'), 40);
  assert.equal(workCore.getOnlineFanDelta('popular'), 400);
  assert.equal(workCore.getOnlineFanDelta('viral'), 0);
});

test('completed workday can prepare an online business when the generated task list omitted online', () => {
  const work = workCore.normalizeProducerWork({
    status: 'complete',
    tasks: [
      { id: 'tv-meeting', category: 'external', title: '新人节目接洽', goal: '争取公开机会', expectedOutput: '出演条件', status: 'completed' },
      { id: 'content-plan', category: 'management', title: '公开形象资料整理', goal: '统一对外表达', expectedOutput: '内容方针', status: 'completed' }
    ],
    documents: ['节目出演条件'],
    materials: ['训练与生活片段'],
    terms: ['允许在官方账号进行直播预热']
  });

  const prepared = workCore.resolveBusinessPreparation(work, 'online_live', {
    title: '个人SNS直播与答谢互动',
    purpose: '通过直播验证本轮公开形象'
  });

  assert.equal(prepared.ok, true);
  assert.equal(prepared.sourceKind, 'completed_workday');
  assert.equal(prepared.task.title, '个人SNS直播与答谢互动');
  assert.deepEqual(prepared.task.assets, ['训练与生活片段']);
});

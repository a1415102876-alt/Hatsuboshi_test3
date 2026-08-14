import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildNiaProducerWorkPrompt,
  parseNiaProducerWorkPayload
} from '../nia-producer-work-api.js';

const context = {
  receiptId: 'receipt-final',
  taskId: 'task-1',
  phaseId: 'meeting',
  periodId: 'evening',
  periodIndex: 2,
  isFinalPeriod: true
};

test('parser selects the last complete work result block', () => {
  const leaked = '<NIA_WORK_RESULT>{"schemaVersion":1}</NIA_WORK_RESULT>';
  const actual = {
    schemaVersion: 1,
    receiptId: 'receipt-final',
    taskId: 'task-1',
    periodId: 'evening',
    completedPhase: 'meeting',
    story: '<narration>面谈结束。</narration>',
    summary: '敲定了出演条件。',
    reaction: 'none',
    reunionStory: '<dialogue char="花海咲季">所以，谈得怎么样？</dialogue>'
  };
  const parsed = parseNiaProducerWorkPayload({ rawText: `${leaked}\n<NIA_WORK_RESULT>${JSON.stringify(actual)}</NIA_WORK_RESULT>` }, context);
  assert.equal(parsed.ok, true);
  assert.equal(parsed.data.summary, '敲定了出演条件。');
});

test('producer work prompt gives custom free-text instructions priority over presets', () => {
  const prompt = buildNiaProducerWorkPrompt(
    { receiptId: 'r-custom', periodIndex: 0, idol: '藤田琴音' },
    {
      id: 'saki-companion-training',
      category: 'training',
      title: '陪同藤田琴音训练',
      phases: [{ id: 'companion', label: '陪同训练', presets: ['观察动作'] }]
    },
    { id: 'morning', label: '上午', phase: { id: 'companion', label: '陪同训练' } },
    { preset: '观察动作', freeText: '让琴音先复盘昨天失败的转身，再制定三组逐步加速练习。' }
  );

  assert.match(prompt, /自定义方案是本次工作的主要指示/);
  assert.match(prompt, /三组逐步加速练习/);
  assert.match(prompt, /自定义方案优先/);
});

test('parser ignores a planning mention before the final work result block', () => {
  const testContext = { ...context, isFinalPeriod: false };
  const data = {
    schemaVersion: 1, receiptId: 'receipt-final', taskId: 'task-1', periodId: 'evening', completedPhase: 'meeting',
    story: '<narration>结束。</narration>', summary: '完成。', reaction: 'none', reunionStory: ''
  };
  const source = { rawText: '思考：输出 `<NIA_WORK_RESULT>` JSON。\n<NIA_WORK_RESULT>' + JSON.stringify(data) + '</NIA_WORK_RESULT>' };
  assert.equal(parseNiaProducerWorkPayload(source, testContext).ok, true);
});

test('final period rejects a result without the idol reunion', () => {
  const data = {
    schemaVersion: 1,
    receiptId: 'receipt-final',
    taskId: 'task-1',
    periodId: 'evening',
    completedPhase: 'meeting',
    story: '<narration>面谈结束。</narration>',
    summary: '敲定了出演条件。'
  };
  const parsed = parseNiaProducerWorkPayload({ text: `<NIA_WORK_RESULT>${JSON.stringify(data)}</NIA_WORK_RESULT>` }, context);
  assert.equal(parsed.ok, false);
  assert.equal(parsed.reason, 'missing_reunion_story');
});

test('prompt limits the model to one period and forbids invented fan totals', () => {
  const prompt = buildNiaProducerWorkPrompt(context, { id: 'task-1' }, { id: 'evening' }, { preset: '重新提出条款' });
  assert.match(prompt, /不得推进到下一时段/);
  assert.match(prompt, /不得顺手完成其他待办/);
  assert.match(prompt, /不要输出粉丝数/);
  assert.match(prompt, /reunionStory必须写制作人与担当偶像重新合流/);
});

test('radio planning receipt fills missing plan fields after the required task completes', () => {
  const radioContext = {
    ...context,
    taskId: 'radio-department-plan',
    phaseId: 'draft-radio-plan',
    periodId: 'morning',
    periodIndex: 0,
    isFinalPeriod: false
  };
  const data = {
    schemaVersion: 1,
    receiptId: 'receipt-final',
    taskId: 'radio-department-plan',
    periodId: 'morning',
    completedPhase: 'draft-radio-plan',
    story: '<narration>企划书整理完成。</narration>',
    summary: '拟定了节目方向。',
    radioPlan: {
      business_id: 'radio-001',
      programTitle: '初星放送部',
      host: '真诚优'
    }
  };

  const parsed = parseNiaProducerWorkPayload(
    { text: `<NIA_WORK_RESULT>${JSON.stringify(data)}</NIA_WORK_RESULT>` },
    radioContext
  );

  assert.equal(parsed.ok, true);
  assert.equal(parsed.data.radioPlan.business_id, 'radio-001');
  assert.equal(parsed.data.radioPlan.programTitle, data.radioPlan.programTitle);
  assert.equal(parsed.data.radioPlan.host, data.radioPlan.host);
  assert.ok(parsed.data.radioPlan.guest);
  assert.equal(parsed.data.radioPlan.episodeTitle, data.summary);
});

test('parser accepts snake case work and radio plan fields', () => {
  const radioContext = {
    receiptId: 'receipt-snake',
    taskId: 'radio-department-plan',
    phaseId: 'draft-radio-plan',
    periodId: 'morning',
    isFinalPeriod: false
  };
  const data = {
    schema_version: 1,
    receipt_id: 'receipt-snake',
    task_id: 'radio-department-plan',
    period_id: 'morning',
    completed_phase: 'draft-radio-plan',
    story: '<narration>企划完成。</narration>',
    summary: '完成广播企划。',
    next_briefing: { situation: '等待录制。', facts: [], constraints: [] },
    reunion_story: '',
    radio_plan: {
      business_id: 'radio-snake-1',
      program_title: '初星放送部',
      episode_title: '新人特别回',
      goal: '介绍新人偶像',
      host: '真诚优',
      guest: '花海咲季',
      interview_focus: '近期训练与反差魅力'
    }
  };

  const parsed = parseNiaProducerWorkPayload(
    { text: `<NIA_WORK_RESULT>${JSON.stringify(data)}</NIA_WORK_RESULT>` },
    radioContext
  );

  assert.equal(parsed.ok, true);
  assert.equal(parsed.data.radioPlan.episodeTitle, '新人特别回');
});

test('player-confirmed radio plan stays authoritative over AI output', () => {
  const radioContext = {
    receiptId: 'receipt-player-plan',
    taskId: 'radio-department-plan',
    phaseId: 'draft-radio-plan',
    periodId: 'morning',
    isFinalPeriod: false,
    idol: '花海咲季',
    radioPlan: {
      business_id: 'radio-player-1',
      programTitle: '初星放送部',
      episodeTitle: '玩家确定的标题',
      goal: '玩家确定的目标',
      host: '真诚优',
      guest: '花海咲季',
      interviewFocus: '玩家确定的访谈重点',
      additionalGuestMode: 'specified',
      additionalGuest: '月村手毬'
    }
  };
  const data = {
    receiptId: radioContext.receiptId,
    taskId: radioContext.taskId,
    periodId: radioContext.periodId,
    completedPhase: radioContext.phaseId,
    story: '<narration>企划执行完成。</narration>',
    summary: '完成广播企划。',
    radioPlan: {
      business_id: 'ai-changed-id',
      programTitle: 'AI改写的节目',
      episodeTitle: 'AI改写的标题',
      goal: 'AI改写的目标',
      host: 'AI改写的主持',
      guest: 'AI改写的嘉宾',
      interviewFocus: 'AI改写的重点',
      additionalGuestMode: 'random',
      additionalGuest: '藤田琴音'
    }
  };

  const parsed = parseNiaProducerWorkPayload(
    { text: `<NIA_WORK_RESULT>${JSON.stringify(data)}</NIA_WORK_RESULT>` },
    radioContext
  );

  assert.equal(parsed.ok, true);
  assert.deepEqual(parsed.data.radioPlan, radioContext.radioPlan);
});

test('parser keeps the last valid matching block when a malformed block trails it', () => {
  const valid = {
    schemaVersion: 1,
    receiptId: 'receipt-final',
    taskId: 'task-1',
    periodId: 'evening',
    completedPhase: 'meeting',
    story: '<narration>面谈结束。</narration>',
    summary: '敲定出演条件。',
    reunionStory: '<dialogue char="花海咲季">结果怎么样？</dialogue>'
  };
  const source = `<NIA_WORK_RESULT>${JSON.stringify(valid)}</NIA_WORK_RESULT>\n<NIA_WORK_RESULT>{bad json}</NIA_WORK_RESULT>`;

  const parsed = parseNiaProducerWorkPayload({ rawText: source }, context);

  assert.equal(parsed.ok, true);
  assert.equal(parsed.data.receiptId, 'receipt-final');
});

test('parser repairs unescaped dialogue attribute quotes inside the story string', () => {
  const brokenJson = [
    '{"schemaVersion":1,',
    '"receiptId":"receipt-dialogue",',
    '"taskId":"vlog_concept",',
    '"periodId":"morning",',
    '"completedPhase":"prepare",',
    '"story":"<narration>上午。</narration><dialogue char="根绪亚纱里">“申请表写好了吗？”</dialogue>",',
    '"summary":"完成了企划书。",',
    '"reunionStory":""}'
  ].join('');
  const dialogueContext = {
    receiptId: 'receipt-dialogue',
    taskId: 'vlog_concept',
    phaseId: 'prepare',
    periodId: 'morning',
    isFinalPeriod: false
  };

  const parsed = parseNiaProducerWorkPayload(
    { rawText: `<NIA_WORK_RESULT>${brokenJson}</NIA_WORK_RESULT>` },
    dialogueContext
  );

  assert.equal(parsed.ok, true);
  assert.match(parsed.data.story, /dialogue char="根绪亚纱里"/);
});

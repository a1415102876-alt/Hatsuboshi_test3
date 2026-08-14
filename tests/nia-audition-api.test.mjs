import test from 'node:test';
import assert from 'node:assert/strict';

const api = await import('../nia-audition-api.js');

const context = {
  auditionId: 'audition-r1-001',
  idol: '花海咲季',
  round: 1,
  plan: { goal: { playerGoal: '让观众看到咲季自然可爱的一面' }, publicImage: '实力强大且容易被夸得意' },
  payoffs: {
    trainingPayoff: { before: '面对镜头过度用力', gain: '学会放松肩线', auditionUse: '第二段近景' },
    publicPayoff: { confirmedCharm: '认真好胜时的可爱反差', auditionUse: '第三段观众反应' },
    relationshipEcho: { content: '本轮已经发生的制作人指导', auditionUse: '登台前回想' },
    remainingWeakness: { content: '过于在意动作是否完美', auditionEffect: '开场紧绷' }
  }
};

const runtime = {
  auditionId: 'audition-r1-001',
  pendingSegmentIndex: 2,
  rankings: [
    [{ id: 'responsible-idol', name: '花海咲季', rank: 5, score: 286, isSelf: true }],
    [{ id: 'responsible-idol', name: '花海咲季', rank: 4, score: 372, isSelf: true }],
    [{ id: 'responsible-idol', name: '花海咲季', rank: 2, score: 478, isSelf: true }],
    [{ id: 'responsible-idol', name: '花海咲季', rank: 1, score: 612, isSelf: true }]
  ],
  segments: []
};

test('prompt binds each segment to frozen rankings and its narrative duty', () => {
  const prompt = api.buildNiaAuditionSegmentPrompt(context, runtime);
  assert.match(prompt, /HATSU_OUTPUT_MODE:NIA_ROUND_1_AUDITION/);
  assert.match(prompt, /第 2 段/);
  assert.match(prompt, /训练成果/);
  assert.match(prompt, /"rank": 4/);
  assert.match(prompt, /不得修改.*分数.*排名/);
  assert.match(prompt, /不得生成.*选项/);
  assert.match(prompt, /<NIA_AUDITION>/);
});

test('second-round prompt preserves the fixed Rinha opponent', () => {
  const prompt = api.buildNiaAuditionSegmentPrompt({
    auditionId: 'audition-r2-001', round: 2, idol: '花海咲季',
    fixedOpponents: [{ name: '贺阳燐羽', avatar: './assets/avatars/kaya-rinha.png' }]
  }, {
    auditionId: 'audition-r2-001', roundNumber: 2, pendingSegmentIndex: 1,
    rankings: [[]], segments: []
  });
  assert.match(prompt, /HATSU_OUTPUT_MODE:NIA_ROUND_2_AUDITION/);
  assert.match(prompt, /第 2 轮试镜/);
  assert.match(prompt, /贺阳燐羽/);
  assert.match(prompt, /\.\/assets\/avatars\/kaya-rinha\.png/);
  assert.match(prompt, /不可替换的固定命名对手/);
});

test('FINALE prompt treats Ume as the fixed rival and closes with a championship', () => {
  const prompt = api.buildNiaAuditionSegmentPrompt({
    auditionId: 'nia-finale-001',
    round: 3,
    isFinale: true,
    fixedOpponents: [{ id: 'nia-finale-hanami-ume', name: '花海佑芽' }]
  }, {
    auditionId: 'nia-finale-001',
    roundNumber: 3,
    pendingSegmentIndex: 4,
    rankings: [[], [], [], [
      { id: 'responsible-idol', name: '花海咲季', rank: 1, score: 612, isSelf: true },
      { id: 'nia-finale-hanami-ume', name: '花海佑芽', rank: 2, score: 603, isSelf: false }
    ]],
    segments: []
  });
  assert.match(prompt, /N\.I\.A FINALE/);
  assert.match(prompt, /花海佑芽/);
  assert.match(prompt, /第一名获得冠军/);
  assert.match(prompt, /第一名夺冠结算/);
  assert.match(prompt, /获得 FINALE 第一名/);
});

test('parser accepts a complete matching middle segment', () => {
  const source = `<NIA_AUDITION>${JSON.stringify({
    schemaVersion: 1,
    auditionId: 'audition-r1-001',
    segmentIndex: 2,
    status: 'continue',
    lines: [
      { type: 'narration', speaker: '', text: '近景镜头推进。' },
      { type: 'dialogue', speaker: '花海咲季', text: '这一次不会再用力过头。' }
    ],
    continuitySummary: '咲季在近景中兑现了镜头训练成果。'
  })}</NIA_AUDITION>`;
  const result = api.parseNiaAuditionSegmentPayload(source, { auditionId: 'audition-r1-001', segmentIndex: 2 });
  assert.equal(result.ok, true);
  assert.equal(result.data.lines.length, 2);
  assert.equal(result.data.status, 'continue');
});

test('parser tolerates harmless wrapper noise and escaped audition tags', () => {
  const payload = {
    schemaVersion: 1,
    auditionId: 'audition-r1-001',
    segmentIndex: 3,
    status: 'continue',
    lines: [{ type: 'narration', text: '舞台灯光亮起。' }],
    continuitySummary: '咲季继续完成第三段。'
  };
  const json = JSON.stringify(payload);
  const source = `<!-- begin_of_Subtext_think -->计划<!-- end_of_Subtext_think -->\n</thinking>### 正文\n&lt;NIA_AUDITION&gt;${json}&lt;/NIA_AUDITION&gt;`;
  const result = api.parseNiaAuditionSegmentPayload(source, {
    auditionId: 'audition-r1-001',
    segmentIndex: 3
  });
  assert.equal(result.ok, true);
  assert.equal(result.data.segmentIndex, 3);
});

test('parser ignores a planning mention before the final NIA_AUDITION block', () => {
  const payload = { schemaVersion: 1, auditionId: 'audition-r1-001', segmentIndex: 3, status: 'continue', lines: [{ type: 'narration', text: '舞台灯光亮起。' }], continuitySummary: '继续第三段。' };
  const source = '思考：输出 `<NIA_AUDITION>` JSON。\n<NIA_AUDITION>'
    + JSON.stringify(payload) + '</NIA_AUDITION>';
  assert.equal(api.parseNiaAuditionSegmentPayload(source, { auditionId: 'audition-r1-001', segmentIndex: 3 }).ok, true);
});

test('parser rejects missing, mismatched, and choice-bearing payloads', () => {
  assert.equal(api.parseNiaAuditionSegmentPayload('plain text', { auditionId: 'audition-r1-001', segmentIndex: 1 }).reason, 'missing_nia_audition');
  const mismatch = `<NIA_AUDITION>${JSON.stringify({ auditionId: 'other', segmentIndex: 1 })}</NIA_AUDITION>`;
  assert.equal(api.parseNiaAuditionSegmentPayload(mismatch, { auditionId: 'audition-r1-001', segmentIndex: 1 }).reason, 'audition_id_mismatch');
  const choices = `<NIA_AUDITION>${JSON.stringify({
    auditionId: 'audition-r1-001', segmentIndex: 1, status: 'continue',
    lines: [{ type: 'narration', text: '开场。' }], continuitySummary: '完成开场。', options: ['A']
  })}</NIA_AUDITION>`;
  assert.equal(api.parseNiaAuditionSegmentPayload(choices, { auditionId: 'audition-r1-001', segmentIndex: 1 }).reason, 'unexpected_choices');
});

test('fourth segment must close with the fixed first-place result', () => {
  const valid = `<NIA_AUDITION>${JSON.stringify({
    auditionId: 'audition-r1-001', segmentIndex: 4, status: 'ended',
    lines: [{ type: 'narration', text: '最终结果显示在屏幕上。' }],
    continuitySummary: '咲季以第一名结束首轮试镜。',
    finalRank: 1,
    highlight: '最后的笑容不再像标准答案。',
    weakness: '开场仍然容易紧绷。',
    payoffSummary: '训练与公开营业成果都转化为了舞台表现。',
    resultSummary: '花海咲季获得第一名并晋级。',
    fanGain: 1800
  })}</NIA_AUDITION>`;
  const parsed = api.parseNiaAuditionSegmentPayload(valid, { auditionId: 'audition-r1-001', segmentIndex: 4 });
  assert.equal(parsed.ok, true);
  assert.equal('fanGain' in parsed.data, false);

  const wrongRank = valid.replace('"finalRank":1', '"finalRank":2');
  assert.equal(api.parseNiaAuditionSegmentPayload(wrongRank, { auditionId: 'audition-r1-001', segmentIndex: 4 }).reason, 'invalid_final_result');
});

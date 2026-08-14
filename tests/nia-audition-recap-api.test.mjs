import test from 'node:test';
import assert from 'node:assert/strict';

const api = await import('../nia-audition-api.js');

const context = {
  auditionId: 'audition-r1-recap',
  idol: '花海咲季',
  producer: '沢田羽',
  plan: {
    goal: '让观众看见咲季可靠之外的可爱反差',
    characterQuestion: '她能否把好胜心转化为属于自己的舞台魅力'
  },
  payoffs: {
    trainingPayoff: { gain: '学会在特写前放松肩线' },
    publicPayoff: { confirmedCharm: '被激将后认真自证的可爱反差' },
    relationshipEcho: { content: '本轮已经发生的制作人指导' },
    remainingWeakness: { content: '仍然过度在意动作是否完美' }
  }
};

const runtime = {
  auditionId: 'audition-r1-recap',
  result: {
    rank: 1,
    score: 612,
    fanGain: 10000,
    statGains: { Vo: 130, Da: 155, Vi: 151 },
    highlight: '最终镜头自然露出了得意神情。',
    weakness: '开场仍有追求完美造成的紧张。',
    payoffSummary: '训练和直播形成的反差魅力在舞台上得到确认。',
    resultSummary: '花海咲季以第一名通过第一轮。'
  },
  segments: [
    { continuitySummary: '咲季带着轻微紧张登台。' },
    { continuitySummary: '训练后的镜头控制得到评审认可。' },
    { continuitySummary: '直播形成的反差魅力带动分数。' },
    { continuitySummary: '咲季完成最终高光并获得第一名。' }
  ],
  postAudition: {
    status: 'awaiting_choice',
    openingStory: '<narration>咲季来到后台。</narration>',
    options: ['做得很好', '开场还可以更稳', '第一名现在满意了吗'],
    selectedResponse: '第一名现在满意了吗',
    selectedResponseSource: 'generated_option'
  }
};

test('opening prompt binds the backstage recap and three response duties', () => {
  const prompt = api.buildNiaPostAuditionOpeningPrompt(context, runtime);
  assert.match(prompt, /NIA_AUDITION_RECAP_OPENING/);
  assert.match(prompt, /试镜会场后台候场区/);
  assert.match(prompt, /恰好三个/);
  assert.match(prompt, /肯定/);
  assert.match(prompt, /冷静复盘/);
  assert.match(prompt, /关系/);
  assert.match(prompt, /不得输出.*fanGain|不得.*奖励/);
});

test('opening parser selects the last valid matching tagged block', () => {
  const source = [
    '<NIA_AUDITION_RECAP_OPENING>{broken}</NIA_AUDITION_RECAP_OPENING>',
    '<NIA_AUDITION_RECAP_OPENING>',
    JSON.stringify({
      schemaVersion: 1,
      auditionId: 'audition-r1-recap',
      story: '<narration>咲季推开后台的门。</narration>',
      options: ['做得很好', '开场还可以更稳', '第一名现在满意了吗'],
      fanGain: 999999
    }),
    '</NIA_AUDITION_RECAP_OPENING>'
  ].join('\n');
  const parsed = api.parseNiaPostAuditionOpeningPayload(source, { auditionId: 'audition-r1-recap' });
  assert.equal(parsed.ok, true);
  assert.deepEqual(parsed.data.options, ['做得很好', '开场还可以更稳', '第一名现在满意了吗']);
  assert.equal('fanGain' in parsed.data, false);
});

test('opening parser rejects mismatched identity and anything other than three choices', () => {
  const build = (overrides = {}) => `<NIA_AUDITION_RECAP_OPENING>${JSON.stringify({
    auditionId: 'audition-r1-recap',
    story: '<narration>后台。</narration>',
    options: ['A', 'B', 'C'],
    ...overrides
  })}</NIA_AUDITION_RECAP_OPENING>`;
  assert.equal(
    api.parseNiaPostAuditionOpeningPayload(build({ auditionId: 'other' }), { auditionId: 'audition-r1-recap' }).reason,
    'audition_id_mismatch'
  );
  assert.equal(
    api.parseNiaPostAuditionOpeningPayload(build({ options: ['A', 'B', 'C', 'D'] }), { auditionId: 'audition-r1-recap' }).reason,
    'invalid_recap_opening'
  );
});

test('resolution prompt includes the exact frozen producer response and forbids another choice round', () => {
  const prompt = api.buildNiaPostAuditionResolutionPrompt(context, runtime);
  assert.match(prompt, /第一名现在满意了吗/);
  assert.match(prompt, /generated_option/);
  assert.match(prompt, /不得生成.*选项|不要生成.*选项/);
  assert.match(prompt, /完整收束/);
});

test('resolution parser accepts only a matching complete closing payload', () => {
  const valid = `<NIA_AUDITION_RECAP_RESOLUTION>${JSON.stringify({
    schemaVersion: 1,
    auditionId: 'audition-r1-recap',
    story: '<dialogue char="花海咲季">下一轮我也会拿第一。</dialogue>',
    recapSummary: '咲季接受制作人的调侃，并确认会带着短板继续前进。',
    rank: 8,
    statGains: { Vo: 9999 }
  })}</NIA_AUDITION_RECAP_RESOLUTION>`;
  const parsed = api.parseNiaPostAuditionResolutionPayload(valid, { auditionId: 'audition-r1-recap' });
  assert.equal(parsed.ok, true);
  assert.equal(parsed.data.recapSummary, '咲季接受制作人的调侃，并确认会带着短板继续前进。');
  assert.equal('rank' in parsed.data, false);
  assert.equal('statGains' in parsed.data, false);

  const incomplete = valid.replace('咲季接受制作人的调侃，并确认会带着短板继续前进。', '');
  assert.equal(
    api.parseNiaPostAuditionResolutionPayload(incomplete, { auditionId: 'audition-r1-recap' }).reason,
    'invalid_recap_resolution'
  );
});

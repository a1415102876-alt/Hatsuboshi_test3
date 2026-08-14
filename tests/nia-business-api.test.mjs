import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildNiaBusinessOpeningPrompt,
  buildNiaBusinessResolutionPrompt,
  parseNiaBusinessOpening,
  parseNiaBusinessResolution,
  normalizeNiaBusinessResult,
  buildNiaLiveSegmentPrompt,
  parseNiaLiveSegmentPayload
} from '../nia-business-api.js';

const context = {
  idol: '花海咲季',
  publicImage: '实力强大，同时被夸奖时会坦率地高兴',
  principle: '不要求刻意卖萌，让可爱从认真行动后的自然反应中出现',
  spine: 'Vlog建立认识，训练校准表达，综艺公开验证',
  business: { title: '新人偶像问答挑战', purpose: '公开验证企划方向', output: '节目片段与观众印象' }
};

test('opening parser accepts one problem and exactly four producer actions', () => {
  const payload = {
    schemaVersion: 1,
    story: '<narration>录制开始。</n+</narration><dialogue char="主持人">临时改为妹妹话题抢答。</dialogue>',
    problem: '节目组临时要求咲季消费与妹妹的关系，她明显不愿配合。',
    options: ['与导演协商换题', '给咲季暗号让她自己决定', '把问题改成竞技挑战', '暂时中止录制确认底线'],
    continuity: ['咲季此前以认真可靠获得关注']
  };
  const parsed = parseNiaBusinessOpening('<NIA_BUSINESS_OPENING>'+JSON.stringify(payload)+'</NIA_BUSINESS_OPENING>');
  assert.equal(parsed.ok, true);
  assert.equal(parsed.data.options.length, 4);
  assert.match(parsed.data.problem, /妹妹/);
});

test('opening parser rejects the wrong number of actions', () => {
  const parsed = parseNiaBusinessOpening('<NIA_BUSINESS_OPENING>'+JSON.stringify({
    story: '<narration>开始。</n+</narration>', problem: '设备故障', options: ['等待', '继续'], continuity: []
  })+'</NIA_BUSINESS_OPENING>');
  assert.equal(parsed.ok, false);
});

test('opening parser ignores a planning mention before the final tagged block', () => {
  const payload = { story: 'story', problem: 'problem', options: ['a', 'b', 'c', 'd'] };
  const source = '思考：输出 `<NIA_BUSINESS_OPENING>` JSON。\n<NIA_BUSINESS_OPENING>'
    + JSON.stringify(payload) + '</NIA_BUSINESS_OPENING>';
  assert.equal(parseNiaBusinessOpening(source).ok, true);
});

test('resolution parser separates VN story from bounded settlement', () => {
  const reply = [
    '<story><dialogue char="花海咲季">那就比谁答得更快！</dialogue></story>',
    '<NIA_BUSINESS_RESULT>'+JSON.stringify({
      schemaVersion: 1,
      problemSolved: true,
      bonusFans: 9999,
      pressureDelta: -4,
      impressions: ['认真得可爱', '可靠的姐姐', '胜负欲', '临场反应', '多余印象'],
      bonusReasons: ['把敏感话题转成了咲季愿意接受的竞争', '制作人与咲季配合形成节目高光', '证据三', '多余理由'],
      summary: '以竞技方式完成公开验证。'
    })+'</NIA_BUSINESS_RESULT>'
  ].join('\n');
  const parsed = parseNiaBusinessResolution(reply);
  assert.equal(parsed.ok, true);
  const result = normalizeNiaBusinessResult(parsed.data.result, { baseFans: 2000 });
  assert.equal(result.baseFans, 2000);
  assert.equal(result.bonusFans, 2000);
  assert.equal(result.pressureDelta, 0);
  assert.equal(result.impressions.length, 4);
  assert.equal(result.bonusReasons.length, 3);
  assert.match(parsed.data.story, /花海咲季/);
});

test('prompts require one intervention and forbid mechanical keyword scoring', () => {
  const opening = buildNiaBusinessOpeningPrompt(context);
  assert.match(opening, /online_live/);
  assert.match(opening, /只设置一个核心现场问题/);
  assert.match(opening, /恰好四个/);
  const resolution = buildNiaBusinessResolutionPrompt(context, {
    story: '<narration>录制开始。</n+</narration>',
    problem: '临时改题',
    continuity: []
  }, '把问题改成竞技挑战');
  assert.match(resolution, /不得按关键词命中机械评分/);
  assert.match(resolution, /把问题改成竞技挑战/);
});

const liveContext = {
  businessId: 'live-1', idol: '花海咲季', round: 1,
  businessBrief: { title: '生活向自律直播', targetImage: '实力强大又可爱', approach: '展示自律日常' }
};

function liveSegment(index, extra = {}) {
  return {
    schemaVersion: 1,
    businessId: 'live-1',
    segmentIndex: index,
    topic: `第${index}段`,
    beats: [{ id: `beat-${index}`, type: 'dialogue', speaker: '花海咲季', text: '我会证明给大家看。', delayMs: 300 }],
    comments: [{ id: `comment-${index}`, text: '好有自信！', tone: 'positive', triggerAfterBeatId: `beat-${index}`, delayMs: 200 }],
    audienceTrend: 'up', heatTrend: 'up', pressureTrend: 'flat',
    continuitySummary: '直播顺利推进。',
    ...extra
  };
}

test('four live prompts have distinct segment duties', () => {
  const runtime = { businessId: 'live-1', continuity: ['已经完成开场'], producerInstruction: '把胜负欲引向挑战环节' };
  assert.match(buildNiaLiveSegmentPrompt(liveContext, { ...runtime, pendingSegmentIndex: 1 }), /直播开场/);
  assert.match(buildNiaLiveSegmentPrompt(liveContext, { ...runtime, pendingSegmentIndex: 2 }), /内容展开/);
  assert.match(buildNiaLiveSegmentPrompt(liveContext, { ...runtime, pendingSegmentIndex: 3 }), /三个制作人处理方案/);
  const closing = buildNiaLiveSegmentPrompt(liveContext, { ...runtime, pendingSegmentIndex: 4 });
  assert.match(closing, /把胜负欲引向挑战环节/);
  assert.match(closing, /自然收播/);
});

test('segment three requires one incident and exactly three options', () => {
  const valid = liveSegment(3, { incident: '主持人反复调侃她很好哄', options: ['引向挑战', '坦率回应', '转回训练'] });
  const parsed = parseNiaLiveSegmentPayload({ text: `<NIA_LIVE_SEGMENT>${JSON.stringify(valid)}</NIA_LIVE_SEGMENT>` }, { businessId: 'live-1', segmentIndex: 3 });
  assert.equal(parsed.ok, true);
  const invalid = { ...valid, options: ['A', 'B'] };
  assert.equal(parseNiaLiveSegmentPayload({ text: `<NIA_LIVE_SEGMENT>${JSON.stringify(invalid)}</NIA_LIVE_SEGMENT>` }, { businessId: 'live-1', segmentIndex: 3 }).ok, false);
});

test('segment four requires bounded evaluation and a closing summary', () => {
  const valid = liveSegment(4, {
    resolution: '咲季把胜负欲投入挑战环节并顺利收播。', imageMatch: 'strong', bonusTier: 'medium',
    bonusReason: '自然强化了实力与可爱的反差。', closingSummary: '实力强大又很好懂的可爱偶像'
  });
  const payload = `<NIA_LIVE_SEGMENT>${JSON.stringify(valid)}</NIA_LIVE_SEGMENT>`;
  assert.equal(parseNiaLiveSegmentPayload({ rawText: payload }, { businessId: 'live-1', segmentIndex: 4 }).ok, true);
  assert.equal(parseNiaLiveSegmentPayload({ rawText: payload }, { businessId: 'other', segmentIndex: 4 }).reason, 'business_id_mismatch');
  assert.equal(parseNiaLiveSegmentPayload({ rawText: payload }, { businessId: 'live-1', segmentIndex: 2 }).reason, 'segment_index_mismatch');
});

test('live parser selects the last complete tagged segment', () => {
  const leaked = liveSegment(1, { topic: '思考中的示例' });
  const actual = liveSegment(1, { topic: '实际开场' });
  const rawText = `<NIA_LIVE_SEGMENT>${JSON.stringify(leaked)}</NIA_LIVE_SEGMENT>\n<NIA_LIVE_SEGMENT>${JSON.stringify(actual)}</NIA_LIVE_SEGMENT>`;
  const parsed = parseNiaLiveSegmentPayload({ rawText }, { businessId: 'live-1', segmentIndex: 1 });
  assert.equal(parsed.ok, true);
  assert.equal(parsed.data.topic, '实际开场');
});

test('live parser ignores a planning mention before the final tagged segment', () => {
  const source = '思考：输出 `<NIA_LIVE_SEGMENT>` JSON。\n<NIA_LIVE_SEGMENT>'
    + JSON.stringify(liveSegment(1)) + '</NIA_LIVE_SEGMENT>';
  assert.equal(parseNiaLiveSegmentPayload(source, { businessId: 'live-1', segmentIndex: 1 }).ok, true);
});

test('live parser extracts JSON after explanatory text inside the segment tag', () => {
  const payload = liveSegment(4, {
    resolution: 'resolution', imageMatch: 'strong', bonusTier: 'medium',
    bonusReason: 'reason', closingSummary: 'closing'
  });
  const rawText = '<NIA_LIVE_SEGMENT>不要解释，直接输出 JSON：\\n```json\\n'
    + JSON.stringify(payload)
    + '\\n```</NIA_LIVE_SEGMENT>';
  const parsed = parseNiaLiveSegmentPayload({ text: rawText }, { businessId: 'live-1', segmentIndex: 4 });
  assert.equal(parsed.ok, true);
  assert.equal(parsed.data.segmentIndex, 4);
});

test('live parser normalizes common closing and pressure trend synonyms', () => {
  const payload = liveSegment(4, {
    pressureTrend: 'down',
    resolution: 'resolution', imageMatch: 'perfect', bonusTier: 'medium',
    bonusReason: 'reason', closingSummary: 'closing'
  });
  const parsed = parseNiaLiveSegmentPayload(
    { text: `<NIA_LIVE_SEGMENT>${JSON.stringify(payload)}</NIA_LIVE_SEGMENT>` },
    { businessId: 'live-1', segmentIndex: 4 }
  );
  assert.equal(parsed.ok, true);
  assert.equal(parsed.data.imageMatch, 'strong');
  assert.equal(parsed.data.pressureTrend, 'relief');
});

test('live parser accepts common AI aliases for closing evaluation enums', () => {
  const payload = liveSegment(4, {
    resolution: 'resolution', imageMatch: 'match', bonusTier: 'middle',
    bonusReason: 'reason', closingSummary: 'closing'
  });
  const parsed = parseNiaLiveSegmentPayload(
    { text: `<NIA_LIVE_SEGMENT>${JSON.stringify(payload)}</NIA_LIVE_SEGMENT>` },
    { businessId: 'live-1', segmentIndex: 4 }
  );
  assert.equal(parsed.ok, true);
  assert.equal(parsed.data.imageMatch, 'strong');
  assert.equal(parsed.data.bonusTier, 'medium');
});

test('segment four prompt states the canonical closing evaluation enums', () => {
  const prompt = buildNiaLiveSegmentPrompt(liveContext, { pendingSegmentIndex: 4 });
  assert.match(prompt, /imageMatch.*off.*partial.*strong/);
  assert.match(prompt, /bonusTier.*none.*small.*medium.*large/);
  assert.match(prompt, /match.*strong/);
  assert.match(prompt, /middle.*medium/);
});

test('resolution prompt closes the current business scene instead of starting another beat', () => {
  const resolution = buildNiaBusinessResolutionPrompt(context, {
    story: '<narration>录制进行到一半。</narration>',
    problem: '主持人临时改变提问方向',
    continuity: ['咲季此前一直维持可靠的优等生形象']
  }, '请主持人把提问改成限时挑战');

  assert.match(resolution, /这是当前营业事件的最后一段/);
  assert.match(resolution, /必须在本次回复内完成现场问题的处理与本场营业的收束/);
  assert.match(resolution, /不得以新的问题、悬念、待回应的台词或下一轮选择结束/);
  assert.match(resolution, /下一场可承接本场造成的结果，但本场本身必须完整结束/);
});

test('Saki live prompts expose only the canonical expression vocabulary', () => {
  const prompt = buildNiaLiveSegmentPrompt({ ...liveContext, idol: '花海咲季' }, {
    businessId: 'live-1', pendingSegmentIndex: 1, continuity: []
  });
  assert.match(prompt, /beats\[\]\.speaker/);
  assert.match(prompt, /花海咲季\(被夸陶醉\)/);
  assert.match(prompt, /自信说明/);
  assert.match(prompt, /凑近追问/);
  assert.match(prompt, /震惊失语/);
  assert.match(prompt, /只允许使用以下功能词/);
});

test('Kotone live prompts expose only Kotone expression vocabulary', () => {
  const prompt = buildNiaLiveSegmentPrompt({ ...liveContext, idol: '藤田琴音' }, {
    businessId: 'live-1', pendingSegmentIndex: 1, continuity: []
  });
  assert.match(prompt, /藤田琴音\(平常待机\)/);
  assert.match(prompt, /俏皮推销/);
  assert.match(prompt, /委屈忍耐/);
  assert.match(prompt, /生气抗议/);
  assert.doesNotMatch(prompt, /被夸陶醉/);
  assert.doesNotMatch(prompt, /凑近追问/);
});

test('Ume live prompts expose only Ume expression vocabulary', () => {
  const prompt = buildNiaLiveSegmentPrompt({ ...liveContext, idol: '花海佑芽' }, {
    businessId: 'live-1', pendingSegmentIndex: 1, continuity: []
  });
  assert.match(prompt, /花海佑芽\(羞涩待机\)/);
  assert.match(prompt, /得意欢呼/);
  assert.match(prompt, /倾慕陶醉/);
  assert.match(prompt, /沉思怀疑/);
  assert.doesNotMatch(prompt, /被夸陶醉/);
  assert.doesNotMatch(prompt, /俏皮推销/);
});

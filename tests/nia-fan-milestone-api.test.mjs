import test from 'node:test';
import assert from 'node:assert/strict';

const api = await import('../nia-fan-milestone-api.js');

test('prompt binds current state and all approved Saki story beats', () => {
  const prompt = api.buildNiaFanMilestonePrompt({
    eventId: 'nia-saki-fans-5000',
    idolName: '花海咲季',
    fans: 5270,
    producer: { name: '沢田羽', personality: '冷静认真' }
  }, { status: 'pending', triggeredAtFans: 5270 });
  assert.match(prompt, /NIA_FAN_MILESTONE_EVENT/);
  assert.match(prompt, /5270/);
  assert.match(prompt, /沢田羽/);
  assert.match(prompt, /欢喜若狂/);
  assert.match(prompt, /录下|录像/);
  assert.match(prompt, /真实的咲季/);
  assert.match(prompt, /佑芽/);
  assert.match(prompt, /并列/);
  assert.match(prompt, /FINALE/);
  assert.match(prompt, /轻视|轻敌/);
  assert.match(prompt, /不要输出.*选项|不得输出.*选项/);
  assert.match(prompt, /不得.*好感度|不增加.*好感度/);
});

test('Kotone route uses its own fixed episode prompt instead of Saki fallback', () => {
  const prompt = api.buildNiaFanMilestonePrompt({
    eventId: 'nia-kotone-round2-audition-eve',
    idolName: '藤田琴音',
    fans: 18000
  }, { status: 'pending' });
  assert.match(prompt, /生成藤田琴音/);
  assert.match(prompt, /第 14 话/);
  assert.match(prompt, /蓝井抚子/);
  assert.match(prompt, /白草四音/);
  assert.match(prompt, /藤田琴音\(功能词\)/);
  assert.doesNotMatch(prompt, /生成花海咲季/);
});

test('route-anchor provider builds a reusable episode prompt without idol-specific API branching', () => {
  const prompt = api.buildNiaFanMilestonePrompt({
    eventId: 'nia-ume-fans-10000',
    idolName: '花海佑芽',
    fans: 10020,
    route: {
      idolName: '花海佑芽',
      promptProvider: 'route-anchors',
      episodes: [{
        eventId: 'nia-ume-fans-10000',
        episode: 13,
        promptAnchors: ['咲季替佑芽复仇。', '燐羽被触动后亲吻佑芽。']
      }]
    }
  }, { status: 'pending', triggeredAtFans: 10020 });
  assert.match(prompt, /生成花海佑芽/);
  assert.match(prompt, /咲季替佑芽复仇/);
  assert.match(prompt, /燐羽被触动后亲吻佑芽/);
  assert.match(prompt, /H\.I\.F/);
  assert.match(prompt, /NIA_FAN_MILESTONE_EVENT/);
});

test('parser selects the last valid matching tag and discards settlement fields', () => {
  const source = [
    'pensamiento en español',
    '<NIA_FAN_MILESTONE_EVENT>{broken}</NIA_FAN_MILESTONE_EVENT>',
    '<NIA_FAN_MILESTONE_EVENT>',
    JSON.stringify({
      schemaVersion: 1,
      eventId: 'nia-saki-fans-5000',
      story: '<narration>咲季看着粉丝数字扬起下巴。</narration>',
      fanGain: 99999,
      affinityGain: 100,
      options: ['继续']
    }),
    '</NIA_FAN_MILESTONE_EVENT>'
  ].join('\n');
  const parsed = api.parseNiaFanMilestonePayload(source, {
    eventId: 'nia-saki-fans-5000'
  });
  assert.equal(parsed.ok, true);
  assert.deepEqual(Object.keys(parsed.data), ['schemaVersion', 'eventId', 'story']);
  assert.equal(parsed.data.story.includes('咲季'), true);
});

test('10000-fan prompt binds Saki episode 13 fixed story beats', () => {
  const prompt = api.buildNiaFanMilestonePrompt({
    eventId: 'nia-saki-fans-10000', idolName: '花海咲季', fans: 10840
  }, { status: 'pending', triggeredAtFans: 10840 });
  assert.match(prompt, /第 13 话/);
  assert.match(prompt, /10000 粉丝/);
  assert.match(prompt, /体外肌肉/);
  assert.match(prompt, /极月学园/);
  assert.match(prompt, /苦战/);
  assert.match(prompt, /花海咲季\(功能词\)/);
  assert.match(prompt, /nia-saki-fans-10000/);
});

test('round-two day five prompt binds Saki episode 14 fixed story beats', () => {
  const prompt = api.buildNiaFanMilestonePrompt({
    eventId: 'nia-saki-round2-audition-eve', idolName: '花海咲季', fans: 16000
  }, { status: 'pending' });
  assert.match(prompt, /第 14 话/);
  assert.match(prompt, /第二轮第 5 日结束后/);
  assert.match(prompt, /贺阳燐羽/);
  assert.match(prompt, /SyngUp!/);
  assert.match(prompt, /FINALE/);
  assert.match(prompt, /其他角色遵守各自世界书中的立绘情绪标记规则/);
  assert.doesNotMatch(prompt, /花海佑芽的 speaker 必须/);
  assert.match(prompt, /nia-saki-round2-audition-eve/);
});

test('round-two audition eve prompt binds Saki episode 15 and QUARTET', () => {
  const prompt = api.buildNiaFanMilestonePrompt({
    eventId: 'nia-saki-round2-quartet-opening', idolName: '花海咲季', fans: 18000
  }, { status: 'pending' });
  assert.match(prompt, /第 15 话/);
  assert.match(prompt, /《QUARTET》/);
  assert.match(prompt, /体外肌肉/);
  assert.match(prompt, /毅力、逞强、实力和额外的勇气/);
});

test('round-two victory prompt binds Saki episode 16 aftermath', () => {
  const prompt = api.buildNiaFanMilestonePrompt({
    eventId: 'nia-saki-round2-quartet-victory', idolName: '花海咲季', fans: 28000,
    auditionResult: { rank: 1, highlight: '最后一段以观众支持完成逆转。' },
    auditionRecapSummary: '制作人肯定咲季将粉丝支持化为自己的力量。'
  }, { status: 'pending' });
  assert.match(prompt, /第 16 话/);
  assert.match(prompt, /《QUARTET》第一名晋级且赛后复盘完整结束之后/);
  assert.match(prompt, /贺阳燐羽/);
  assert.match(prompt, /眼中本来就只有咲季/);
  assert.match(prompt, /算不上真正的偶像/);
  assert.match(prompt, /亲吻咲季脸颊/);
  assert.match(prompt, /当姐姐的怎么能对妹妹说话不算话/);
  assert.match(prompt, /明显受到触动/);
  assert.match(prompt, /姐妹羁绊/);
  assert.match(prompt, /不得写成毫无铺垫的突然调戏/);
  assert.match(prompt, /最讨厌燐羽/);
  assert.match(prompt, /欣然接受并迅速得意忘形/);
  assert.match(prompt, /其他角色遵守各自世界书中的立绘情绪标记规则/);
  assert.doesNotMatch(prompt, /花海佑芽的 speaker 必须/);
  assert.match(prompt, /nia-saki-round2-quartet-victory/);
  assert.match(prompt, /最后一段以观众支持完成逆转/);
  assert.match(prompt, /制作人肯定咲季将粉丝支持化为自己的力量/);
});

test('round-three first business prompt binds Saki episode 17 and the FINALE promise', () => {
  const prompt = api.buildNiaFanMilestonePrompt({
    eventId: 'nia-saki-round3-first-business', idolName: '花海咲季', fans: 34000,
    latestBusinessResult: { resultSummary: '第三轮特别节目顺利收官。' }
  }, { status: 'pending' });
  assert.match(prompt, /第 17 话/);
  assert.match(prompt, /第三轮第一次营业完整结算之后/);
  assert.match(prompt, /被自己以外的人叫“姐姐”/);
  assert.match(prompt, /卸下伪装时最有魅力/);
  assert.match(prompt, /FINALE/);
  assert.match(prompt, /只有面对咲季时/);
  assert.match(prompt, /做好觉悟/);
  assert.match(prompt, /欣然接受并迅速得意/);
  assert.match(prompt, /其他角色遵守各自世界书中的立绘情绪标记规则/);
  assert.doesNotMatch(prompt, /花海佑芽的 speaker 必须/);
  assert.match(prompt, /nia-saki-round3-first-business/);
  assert.match(prompt, /第三轮特别节目顺利收官/);
});

test('round-three finale eve prompt binds Saki episode 18 without starting the FINALE', () => {
  const prompt = api.buildNiaFanMilestonePrompt({
    eventId: 'nia-saki-round3-finale-eve', idolName: '花海咲季', fans: 42000
  }, { status: 'pending' });
  assert.match(prompt, /第 18 话/);
  assert.match(prompt, /第三轮五日企划全部完成/);
  assert.match(prompt, /接下来要参加的选拔是《FINALE》/);
  assert.match(prompt, /体外肌肉/);
  assert.match(prompt, /替妹妹报仇/);
  assert.match(prompt, /其他角色遵守各自世界书中的立绘情绪标记规则/);
  assert.doesNotMatch(prompt, /花海佑芽的 speaker 必须/);
  assert.match(prompt, /FINALE 的舞台、分数、排名或胜负/);
  assert.match(prompt, /nia-saki-round3-finale-eve/);
});

test('post-FINALE episode 19 preserves the sisters result and next-match promise', () => {
  const prompt = api.buildNiaFanMilestonePrompt({
    eventId: 'nia-saki-finale-sisters-aftermath', idolName: '花海咲季', fans: 52000,
    auditionResult: { rank: 1, resultSummary: '咲季获得 FINALE 第一名。' },
    auditionRecapSummary: '制作人与咲季完成了决赛后的舞台复盘。'
  }, { status: 'pending' });
  assert.match(prompt, /第 19 话/);
  assert.match(prompt, /FINALE 第一名结算及制作人赛后复盘完整结束之后/);
  assert.match(prompt, /佑芽找到咲季，坦率承认自己输了/);
  assert.match(prompt, /自己不会再逃跑/);
  assert.match(prompt, /炫耀一辈子的热烈较量/);
  assert.match(prompt, /prevalence、my/);
  assert.match(prompt, /其他角色遵守各自世界书中的立绘情绪标记规则/);
  assert.doesNotMatch(prompt, /花海佑芽的 speaker 必须/);
  assert.match(prompt, /nia-saki-finale-sisters-aftermath/);
});

test('post-FINALE episode 20 closes NIA with the destined-partner promise', () => {
  const prompt = api.buildNiaFanMilestonePrompt({
    eventId: 'nia-saki-finale-partner-epilogue', idolName: '花海咲季', fans: 52000,
    auditionResult: { rank: 1 },
    auditionRecapSummary: '咲季获胜，并与佑芽约定未来再次较量。'
  }, { status: 'pending' });
  assert.match(prompt, /第 20 话/);
  assert.match(prompt, /第 19 话姐妹约定再战完整结束之后/);
  assert.match(prompt, /体外肌肉/);
  assert.match(prompt, /只要一次也不输/);
  assert.match(prompt, /当然不会/);
  assert.match(prompt, /陪她一同坠落/);
  assert.match(prompt, /命中注定的搭档/);
  assert.match(prompt, /绝对不会放手/);
  assert.match(prompt, /nia-saki-finale-partner-epilogue/);
});

test('parser rejects mismatched identity and empty or non-VN stories', () => {
  const wrap = (payload) => `<NIA_FAN_MILESTONE_EVENT>${JSON.stringify(payload)}</NIA_FAN_MILESTONE_EVENT>`;
  assert.equal(api.parseNiaFanMilestonePayload(wrap({
    eventId: 'other', story: '<narration>内容。</narration>'
  }), { eventId: 'nia-saki-fans-5000' }).reason, 'event_id_mismatch');
  assert.equal(api.parseNiaFanMilestonePayload(wrap({
    eventId: 'nia-saki-fans-5000', story: ''
  }), { eventId: 'nia-saki-fans-5000' }).reason, 'invalid_story');
  assert.equal(api.parseNiaFanMilestonePayload(wrap({
    eventId: 'nia-saki-fans-5000', story: '<story><narration>错误外壳。</narration></story>'
  }), { eventId: 'nia-saki-fans-5000' }).reason, 'invalid_story');
});

test('parser ignores a planning mention before the final milestone block', () => {
  const payload = { eventId: 'nia-saki-fans-5000', story: '<narration>正式剧情。</narration>' };
  const source = '思考：输出 `<NIA_FAN_MILESTONE_EVENT>` JSON。\n<NIA_FAN_MILESTONE_EVENT>'
    + JSON.stringify(payload) + '</NIA_FAN_MILESTONE_EVENT>';
  assert.equal(api.parseNiaFanMilestonePayload(source, { eventId: 'nia-saki-fans-5000' }).ok, true);
});

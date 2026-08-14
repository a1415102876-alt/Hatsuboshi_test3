import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  compileSakiDraft,
  validateSchedule,
  parseGuidance,
  resolveBusiness
} from '../nia-prototype-core.js';
import { buildNiaPlanPrompt, parseNiaPlanResponse, parseNiaPlanPayload, normalizeApiPlan } from '../nia-prototype-api.js';

const draft = {
  goal: '让粉丝能够见到咲季的可爱之处',
  image: '不仅作为偶像实力强大，同时也是被夸就飘飘然、特别好哄的可爱偶像',
  approach: '制作生活类Vlog，运营SNS，同时在面向新人偶像的综艺节目上露脸'
};

test('renders the idol dossier before the editable planning sheet', async () => {
  const html = await readFile(new URL('../nia-prototype.html', import.meta.url), 'utf8');
  const dossierIndex = html.indexOf('id="idolProfilePage"');
  const planningIndex = html.indexOf('id="planningDraftPage"');

  assert.ok(dossierIndex >= 0);
  assert.ok(planningIndex > dossierIndex);
  assert.match(html, /id="continueToPlanning"/);
  assert.match(html, /label for="goalInput"/);
  assert.match(html, /label for="imageInput"/);
  assert.match(html, /name="businessMethod"/);
  assert.match(html, /type="checkbox"/);
  assert.match(html, /id="businessMethodOnlineLive"/);
  assert.match(html, /id="businessMethodSchoolRadio"/);
  assert.match(html, /id="businessMethodMiniLive"/);
  assert.match(html, /id="miniLiveVenueSelect"/);
  assert.match(html, /value="junior_school_auditorium"/);
  assert.match(html, /id="businessMethodTvProgram"/);
  assert.match(html, /data-unlock-round="2"/);
  assert.doesNotMatch(html, /id="approachInput"/);
  for (const id of ['goalInput', 'imageInput', 'businessMethodOnlineLive', 'businessMethodSchoolRadio', 'apiStatus', 'compileBtn']) {
    assert.match(html, new RegExp('id="' + id + '"'));
  }
});

test('serializes a selected supported business method into the legacy draft approach', async () => {
  const source = await readFile(new URL('../nia-prototype.js', import.meta.url), 'utf8');

  assert.match(source, /function readSelectedBusinessMethods\(\)/);
  assert.match(source, /businessMethods:\s*methods\.map/);
  assert.match(source, /miniLiveVenueId:\s*\$\('#miniLiveVenueSelect'\)/);
  assert.match(source, /function syncMiniLiveVenueField\(\)/);
  assert.match(source, /function selectBusinessMethodForApproach\(approach\)/);
  assert.match(source, /approach:\s*methods\.map\(.*approach/);
  assert.match(source, /input\[name="businessMethod"\][\s\S]*?input\.disabled/);
  assert.match(source, /tv_program/);
  assert.match(source, /lockedUntilSecondRound/);
});

test('TV business remains unlocked from the second round onward', async () => {
  const [source, html] = await Promise.all([
    readFile(new URL('../nia-prototype.js', import.meta.url), 'utf8'),
    readFile(new URL('../nia-prototype.html', import.meta.url), 'utf8')
  ]);

  assert.match(source, /secondRoundUnlocked = Number\(lastProjection\?\.round\) >= 2/);
  assert.doesNotMatch(source, /const secondRound = Number\(lastProjection\?\.round\) === 2/);
  assert.match(source, /input\.dataset\.unlockRound === '2' && Number\(projection\.round\) < 2/);
  assert.match(html, /电视综艺参演[\s\S]{0,160}第二轮起解锁/);
});

test('scrolls to the planning sheet while respecting reduced motion', async () => {
  const source = await readFile(new URL('../nia-prototype.js', import.meta.url), 'utf8');

  assert.match(source, /prefers-reduced-motion: reduce/);
  assert.match(source, /planningDraftPage[^\n]*scrollIntoView/);
  assert.match(source, /continueToPlanning[^\n]*addEventListener/);
});

test('shows a one-time accessible Asari briefing for the first planning round', async () => {
  const [html, css, source] = await Promise.all([
    readFile(new URL('../nia-prototype.html', import.meta.url), 'utf8'),
    readFile(new URL('../nia-prototype.css', import.meta.url), 'utf8'),
    readFile(new URL('../nia-prototype.js', import.meta.url), 'utf8')
  ]);

  assert.match(html, /id="niaBriefingOverlay"[^>]*role="dialog"/);
  assert.match(html, /aria-modal="true"/);
  assert.match(html, /assets\/novel-standees\/asari-sensei\.png/);
  assert.match(html, /id="niaBriefingText"/);
  assert.match(html, /id="niaBriefingNextBtn"/);
  assert.match(source, /function shouldOpenFirstRoundBriefing\(projection\)/);
  assert.match(source, /projection\.round === 1/);
  assert.match(source, /projection\.phase === 'draft'/);
  assert.match(source, /!projection\.firstRoundBriefingSeen/);
  assert.match(source, /三轮/);
  assert.match(source, /两次试镜/);
  assert.match(source, /FINALE/);
  assert.match(source, /粉丝数审查/);
  assert.match(source, /五天/);
  assert.match(source, /本轮目标/);
  assert.match(source, /希望观众看到的形象/);
  assert.match(source, /实现思路/);
  assert.match(source, /type:\s*'niaFirstRoundBriefingComplete'/);
  assert.match(source, /event\.key === 'Enter'/);
  assert.match(source, /event\.key === ' '/);
  assert.match(css, /\.nia-briefing-next[\s\S]{0,240}min-height:\s*44px/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)[\s\S]*?\.nia-briefing/);
});

test('scales the N.I.A tablet by 1.5 on large desktop viewports only', async () => {
  const css = await readFile(new URL('../nia-prototype.css', import.meta.url), 'utf8');

  assert.match(css, /@media \(min-width: 1200px\) and \(min-height: 720px\)/);
  assert.match(css, /@media \(min-width: 1200px\) and \(min-height: 720px\)\s*\{[\s\S]{0,180}\.tablet\s*\{[\s\S]{0,120}translate\(-50%, -50%\) scale\(1\.5\)/);
  assert.match(css, /@media \(max-width: 760px\)/);
  assert.match(css, /@media \(max-width: 430px\)/);
});

test('compiles the short draft into one connected five-day proposal', () => {
  const plan = compileSakiDraft(draft);
  assert.equal(plan.days.length, 5);
  assert.deepEqual(plan.days.map((day) => day.type), [
    '制作人工作', '陪同训练', '外出', '营业', '营业'
  ]);
  assert.match(plan.publicImage, /受到认可时/);
  assert.ok(plan.evidence.includes('受到真诚肯定后藏不住高兴'));
});

test('schedule validation warns when a required daily role is missing', () => {
  const plan = compileSakiDraft(draft);
  const valid = validateSchedule(plan.days);
  assert.equal(valid.ready, true);

  const withoutOuting = plan.days.map((day) => ({ ...day }));
  withoutOuting[2].type = '陪同训练';
  const invalid = validateSchedule(withoutOuting);
  assert.equal(invalid.ready, false);
  assert.ok(invalid.warnings.some((warning) => warning.includes('外出')));
});

test('different producer guidance activates different propagation hooks', () => {
  const natural = parseGuidance('让咲季全力比赛并帮助搭档。赛后根据实际表现真诚夸奖她，不要求刻意卖萌。');
  const performance = parseGuidance('接受节目组安排，让咲季对镜头刻意卖萌，优先制造节目效果。');

  const naturalResult = resolveBusiness(natural);
  const performanceResult = resolveBusiness(performance);

  assert.ok(naturalResult.hooks.some((hook) => hook.id === 'contrast' && hook.status === 'highlight'));
  assert.ok(naturalResult.hooks.some((hook) => hook.id === 'teamwork' && hook.status !== 'missed'));
  assert.ok(performanceResult.hooks.some((hook) => hook.id === 'direct-cute' && hook.status !== 'missed'));
  assert.notDeepEqual(naturalResult.impressions, performanceResult.impressions);
  assert.notEqual(naturalResult.fans, performanceResult.fans);
});

test('parses and normalizes a valid main API NIA plan response', () => {
  const apiPlan = {
    schemaVersion: 1,
    status: 'needs_confirmation',
    asariReview: { accepted: '方向明确。', gap: '还缺少连续性。', advice: '用公开挑战串联五天。' },
    idol: '花海咲季',
    round: 1,
    goal: { fanRequirement: 10000, playerGoal: '展示咲季作为实力派偶像的魅力' },
    publicImage: '实力强大的顶级偶像候选',
    principle: '用公开表现而非旁白证明实力',
    storyQuestion: '强大如何成为值得持续关注的偶像魅力？',
    spine: '综艺建立认知，训练解决问题，舞台公开验证',
    evidence: ['竞技高光', '临场判断', '舞台验证'],
    risks: ['只有数值而缺少高光', '综艺与舞台缺少承接'],
    assumptions: ['新人综艺暂按竞技类设计'],
    days: [
      { day: 1, type: '制作人工作', title: '争取机会', purpose: '取得工作', problem: '零实绩', output: '节目条件', carriesFrom: ['玩家简化企划'], preparesFor: [2] },
      { day: 2, type: '营业', title: '综艺亮相', purpose: '建立认知', problem: '很强但难记住', output: '观众反馈', carriesFrom: [1], preparesFor: [3] },
      { day: 3, type: '外出', title: '心情调剂', purpose: '理解评价', problem: '方向尚不清晰', output: '双方共识', carriesFrom: [2], preparesFor: [4] },
      { day: 4, type: '陪同训练', title: '舞台训练', purpose: '转化实力', problem: '感染力不足', output: '训练成果', carriesFrom: [2, 3], preparesFor: [5] },
      { day: 5, type: '营业', title: '线下舞台', purpose: '公开验证', problem: '能否持续吸引', output: '公众印象', carriesFrom: [1, 2, 3, 4], preparesFor: ['第一次试镜'] }
    ]
  };
  const parsed = parseNiaPlanResponse('<NIA_PLAN>' + JSON.stringify(apiPlan) + '</NIA_PLAN>');
  assert.equal(parsed.ok, true);
  const normalized = normalizeApiPlan(parsed.data, draft);
  assert.equal(normalized.days.length, 5);
  assert.match(normalized.asariReview, /方向明确/);
  assert.equal(normalized.asariReviewParts.accepted, '方向明确。');
  assert.equal(normalized.asariReviewParts.gap, '还缺少连续性。');
  assert.equal(normalized.asariReviewParts.advice, '用公开挑战串联五天。');
  assert.match(buildNiaPlanPrompt(draft), /非叙事系统任务/);
});

test('tries rendered reply candidates when raw model text only contains leaked planning', () => {
  const valid = {
    schemaVersion: 1,
    days: [
      { type: '制作人工作' },
      { type: '陪同训练' },
      { type: '外出' },
      { type: '营业' },
      { type: '营业' }
    ]
  };
  const payload = {
    rawText: '<konatan_planning>thinking only</konatan_planning>',
    text: '前置噪声<NIA_PLAN>' + JSON.stringify(valid) + '</NIA_PLAN><tucao>后置噪声</tucao>'
  };
  assert.equal(parseNiaPlanPayload(payload).ok, true);
});

test('parses the last NIA plan block when leaked planning mentions the opening tag', () => {
  const valid = {
    schemaVersion: 1,
    days: [
      { type: '制作人工作' },
      { type: '陪同训练' },
      { type: '外出' },
      { type: '营业' },
      { type: '营业' }
    ]
  };
  const reply = '思考：最终必须输出<NIA_PLAN>，不要添加说明。'
    + '<NIA_PLAN>' + JSON.stringify(valid) + '</NIA_PLAN>'
    + '<tucao>额外文本</tucao>';
  assert.equal(parseNiaPlanResponse(reply).ok, true);
});

test('second-round planning treats the fixed outing as day one and accepts days two through six', () => {
  const secondRound = {
    schemaVersion: 1,
    round: 2,
    days: [
      { day: 2, type: '制作人工作' },
      { day: 3, type: '陪同训练' },
      { day: 4, type: '营业' },
      { day: 5, type: '营业' },
      { day: 6, type: '陪同训练' }
    ]
  };
  const parsed = parseNiaPlanResponse('<NIA_PLAN>' + JSON.stringify(secondRound) + '</NIA_PLAN>');
  assert.equal(parsed.ok, true);
  const normalized = normalizeApiPlan(parsed.data, draft);
  assert.deepEqual(normalized.days.map((day) => day.day), [2, 3, 4, 5, 6]);
  const prompt = buildNiaPlanPrompt(draft, {
    round: 2,
    fixedOutingDestination: '水族馆',
    fixedOutingSummary: '试镜结束后在水族馆放松。'
  });
  assert.match(prompt, /第2日至第6日/);
  assert.match(prompt, /水族馆/);
  assert.match(prompt, /固定外出已经完成/);
});

test('third-round planning reuses the advanced five-day schedule contract', () => {
  const thirdRound = {
    schemaVersion: 1,
    round: 3,
    days: [
      { day: 2, type: '制作人工作' },
      { day: 3, type: '陪同训练' },
      { day: 4, type: '营业' },
      { day: 5, type: '营业' },
      { day: 6, type: '陪同训练' }
    ]
  };
  const parsed = parseNiaPlanResponse('<NIA_PLAN>' + JSON.stringify(thirdRound) + '</NIA_PLAN>');
  assert.equal(parsed.ok, true);
  const normalized = normalizeApiPlan(parsed.data, draft);
  assert.equal(normalized.round, 3);
  assert.deepEqual(normalized.days.map((day) => day.day), [2, 3, 4, 5, 6]);
  const prompt = buildNiaPlanPrompt(draft, { round: 3, fixedOutingDestination: '游乐园' });
  assert.match(prompt, /第3轮第2日至第6日日程硬规则/);
  assert.match(prompt, /当前轮次：3/);
  assert.match(prompt, /游乐园/);
});

test('planning prompt uses the active route idol instead of hard-coded Saki identity', () => {
  const prompt = buildNiaPlanPrompt({}, { idol: '藤田琴音', round: 1 });
  assert.match(prompt, /担当偶像：藤田琴音/);
  assert.match(prompt, /"idol": "藤田琴音"/);
  assert.doesNotMatch(prompt, /担当偶像：花海咲季/);
});

test('authoritative round overrides a stale round in the generated plan', () => {
  const stalePlan = {
    round: 1,
    days: Array.from({ length: 5 }, (_, index) => ({
      day: index + 1, type: index === 0 ? '制作人工作' : index < 3 ? '陪同训练' : '营业'
    }))
  };
  const normalized = normalizeApiPlan(stalePlan, draft, { round: 3 });
  assert.equal(normalized.round, 3);
  assert.deepEqual(normalized.days.map((day) => day.day), [2, 3, 4, 5, 6]);
});

test('planning freezes the selected mini-live venue into the business day', () => {
  const miniLiveDraft = {
    ...draft,
    businessMethods: ['mini_live', 'sns_post'],
    miniLiveVenueId: 'junior_school_auditorium'
  };
  const plan = {
    round: 1,
    days: [
      { day: 1, type: '制作人工作' },
      { day: 2, type: '陪同训练' },
      { day: 3, type: '外出' },
      { day: 4, type: '营业', businessType: 'mini_live', venueId: 'shopping_mall' },
      { day: 5, type: '营业', businessType: 'sns_post' }
    ]
  };

  const normalized = normalizeApiPlan(plan, miniLiveDraft);
  const miniLiveDay = normalized.days.find((day) => day.businessType === 'mini_live');
  assert.equal(normalized.miniLiveVenueId, 'junior_school_auditorium');
  assert.equal(miniLiveDay.venueId, 'junior_school_auditorium');
  const prompt = buildNiaPlanPrompt(miniLiveDraft);
  assert.match(prompt, /venueId=junior_school_auditorium/);
});

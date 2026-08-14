import { DAY_TYPES, compileSakiDraft, validateSchedule } from './nia-prototype-core.js';

function clean(value, limit = 1200) {
  return String(value || '').trim().slice(0, limit);
}

const MINI_LIVE_VENUES = Object.freeze({
  shopping_street: '商店街临时舞台',
  junior_school_auditorium: '初星学园中等部',
  shopping_mall: '购物中心中庭',
  campus_courtyard: '初星学园校园中庭'
});

export function buildNiaPlanPrompt(draft = {}, context = {}) {
  const round = Math.max(1, Math.floor(Number(context.round) || 1));
  const idol = clean(context.idol) || '花海咲季';
  const advancedRound = round >= 2;
  const displayDayOffset = advancedRound ? 1 : 0;
  const scheduleLabel = advancedRound ? '第2日至第6日的五项企划' : '五日企划';
  return [
    '[HATSU_OUTPUT_MODE:NIA_PLAN]',
    '[初星育成系统 · N.I.A企划编译器 v1]',
    '',
    '当前请求是非叙事系统任务。不要续写聊天剧情，不要描写提交企划的场景。',
    '将玩家的简化企划整理为前端可执行的' + scheduleLabel + '。',
    '',
    '职责：',
    '- 保留玩家核心目标，将公众形象转换为观众可见证的具体表现。',
    '- 提出一个没有预定答案的storyQuestion。',
    '- 五项日程必须形成前后因果，每天留下后续可使用的产物。',
    '- problem只描述困难，不得替玩家决定解决方法。',
    '- 所有根据原文补出的内容放入assumptions，等待玩家确认。',
    '- asariReview使用根绪亚纱里温和、专业、先肯定再指出缺口的教师口吻。',
    '',
    '禁止：',
    '- 不生成或修改粉丝、能力、压力数值。',
    '- 不预定活动成功、失败、角色理解或成长结论。',
    '- 不泄露制作人当前不知道的角色秘密。',
    '- 不输出小说、Markdown或JSON以外的说明。',
    '',
    advancedRound ? `第${round}轮第2日至第6日日程硬规则：` : '五日日程硬规则：',
    '- days恰好5项。',
    '- type只能是：陪同训练、制作人工作、营业、外出。',
    advancedRound
      ? '- 第1日固定外出已经完成，不包含在days中；剩余五项至少1次陪同训练、至少1次制作人工作、至少2次营业，不强制再次外出。'
      : '- 至少1次陪同训练、恰好1次外出、至少1次制作人工作、至少2次营业。',
    advancedRound
      ? '- days中的day必须依次为2、3、4、5、6，不得再次生成第1日。'
      : '- 第一轮按以下因果顺序输出：制作人工作、陪同训练、外出、线上预热营业、正式营业。',
    '- 制作人工作时偶像同步自主训练；营业和外出必须由制作人陪同。',
    '- 最后一次营业负责公开验证本轮方向。',
    '- 外出只写“心情调剂、整理关系或重新确认方向”等叙事作用，不规划地点、话题、具体行动和必然获得的素材。',
    '- 制作人工作日额外输出workSeed。它包含2至3项待办，不包含陪同训练；系统会单独加入陪同训练常驻项。',
    '- workSeed必须有1项external核心待办；另有online或management可选待办。任务只给资料与中性行动，不暗示正确答案。',
    '',
    '当前状态：',
    '- 担当偶像：' + idol,
    '- 当前轮次：' + round,
    '- 粉丝审查线：' + (Number(context.fanRequirement) || 10000),
    '- 当前粉丝：' + (Number(context.fans) || 0),
    '- 此前公众印象：' + (clean(context.previousImage) || '无'),
    '- 第一轮试镜与复盘摘要：' + (clean(context.firstRoundAuditionSummary) || '无'),
    '- 第1日固定外出地点：' + (clean(context.fixedOutingDestination) || (advancedRound ? '已完成但未记录地点' : '不适用')),
    '- 第1日固定外出摘要：' + (clean(context.fixedOutingSummary) || (advancedRound ? '固定外出已完成' : '不适用')),
    '',
    '企划用角色摘要：',
    '- 当前担当偶像的基础能力、性格和关系以路线及世界书为准，不要套用其他偶像的人设。',
    '- 企划应围绕当前担当偶像的真实优势、弱点和已确认的公众印象设计。',
    '- 受到夸奖、遇到竞争以及与身边角色互动时，必须遵循当前担当偶像的世界书设定。',
    '- 她需要制作人提供真正能帮助她取胜的判断。',
    '',
    '玩家简化企划：',
    '- 本轮目标：' + clean(draft.goal),
    '- 期望公众形象：' + clean(draft.image),
    '- 本轮选择的两种营业方式（必须分别安排在两个营业日）：' + (Array.isArray(draft.businessMethods) ? draft.businessMethods.join('、') : '未提供，请根据实现思路兼容旧草案'),
    Array.isArray(draft.businessMethods) && draft.businessMethods.includes('mini_live')
      ? '- 迷你演出固定地点：' + (MINI_LIVE_VENUES[draft.miniLiveVenueId] || MINI_LIVE_VENUES.shopping_street) + '（venueId=' + (MINI_LIVE_VENUES[draft.miniLiveVenueId] ? draft.miniLiveVenueId : 'shopping_street') + '）。迷你演出营业日必须原样写入该 venueId，不得另选地点。'
      : '',
    '- 实现思路：' + clean(draft.approach),
    '营业方式约束：本轮必须安排两个不同的营业日，并分别使用玩家选择的两种 businessMethods；不要只安排一种营业方式。营业日的 businessType 必须原样填写对应枚举。',
    '',
    '最终回复只能包含<NIA_PLAN>与</NIA_PLAN>边界，边界内为一个合法JSON对象。',
    '禁止Markdown代码块、JSON注释和额外顶层字段。',
    '',
    'JSON契约：',
    '{',
    '  "schemaVersion": 1,',
    '  "status": "needs_confirmation",',
    '  "asariReview": {"accepted":"1至2句","gap":"1至2句","advice":"1至3句"},',
    '  "idol": "' + idol.replace(/"/g, '\\"') + '",',
    '  "round": ' + round + ',',
    '  "goal": {"fanRequirement":10000,"playerGoal":"忠实保留玩家目标"},',
    '  "publicImage": "整理后的期望公众印象",',
    '  "principle": "执行原则",',
    '  "storyQuestion": "没有预定答案的核心问题",',
    '  "spine": "五天因果链概括",',
    '  "evidence": ["3至6项具体行为证据"],',
    '  "risks": ["2至5项偏移风险"],',
    '  "assumptions": ["1至5项需玩家确认的推断"],',
    '  "days": [',
    '    {"day":' + (1 + displayDayOffset) + ',"type":"制作人工作","businessType":"","venueId":"仅迷你演出营业日填写固定地点，否则为空字符串","title":"名称","purpose":"叙事作用","problem":"留给玩家处理的困难","output":"产物类型","carriesFrom":["玩家简化企划"],"preparesFor":[' + (2 + displayDayOffset) + '],"workSeed":{"tasks":[{"id":"稳定英文ID","category":"external","priority":"core","title":"任务名","deadline":"截止时间","goal":"一句话目标","background":"已知背景","constraints":["限制"],"assets":["已有筹码"],"boundaries":["偶像边界"],"expectedOutput":"预期产物","phases":[{"id":"prepare","label":"阶段名","required":false,"fixedPeriod":"","briefing":{"situation":"当前状况","facts":["已知事实"],"constraints":["阶段限制"]},"presets":["中性行动1","中性行动2","中性行动3"]},{"id":"meeting","label":"正式面谈","required":true,"fixedPeriod":"afternoon","briefing":{"situation":"会面前已知状况","facts":["已知事实"],"constraints":["阶段限制"]},"presets":["中性行动1","中性行动2","中性行动3"]}]}]}}',
    '营业日的 businessType 只能是 online_live、sns_post、school_radio、tv_program、mini_live；非营业日写空字符串。',
    '  ]',
    '}',
    '',
    '文本字段保持简洁。days必须实际输出五项，不得照抄单项示例。' + (advancedRound ? '五项的day编号必须是第2日至第6日。' : '')
  ].join('\n');
}

export function parseNiaPlanResponse(value = '') {
  const source = String(value || '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
  const endTag = '</NIA_PLAN>';
  const endIndex = source.toUpperCase().lastIndexOf(endTag);
  const startIndex = endIndex >= 0
    ? source.toUpperCase().lastIndexOf('<NIA_PLAN>', endIndex)
    : -1;
  if (startIndex < 0 || endIndex < 0 || startIndex >= endIndex) return { ok: false, reason: 'missing_boundary' };
  const jsonText = source.slice(startIndex + '<NIA_PLAN>'.length, endIndex).trim();
  try {
    const data = JSON.parse(jsonText);
    const allowed = new Set(DAY_TYPES);
    if (!data || data.schemaVersion !== 1 || !Array.isArray(data.days) || data.days.length !== 5) return { ok: false, reason: 'invalid_schema' };
    if (data.days.some((day) => !allowed.has(day.type))) return { ok: false, reason: 'invalid_day_type' };
    const round = Math.max(1, Math.floor(Number(data.round) || 1));
    const schedule = round >= 2
      ? {
          ready: data.days.some((day) => day.type === '陪同训练')
            && data.days.some((day) => day.type === '制作人工作')
            && data.days.filter((day) => day.type === '营业').length >= 2,
          warnings: []
        }
      : validateSchedule(data.days);
    if (!schedule.ready) return { ok: false, reason: 'invalid_schedule', warnings: schedule.warnings };
    if (round >= 2 && data.days.some((day, index) => Number(day.day) !== index + 2)) return { ok: false, reason: 'invalid_day_number' };
    return { ok: true, data };
  } catch {
    return { ok: false, reason: 'invalid_json' };
  }
}

export function parseNiaPlanPayload(payload = {}) {
  const candidates = [payload.rawText, payload.text, payload.renderedText]
    .map((value) => String(value || '').trim())
    .filter((value, index, values) => value && values.indexOf(value) === index);
  let failure = { ok: false, reason: 'missing_boundary' };
  for (const candidate of candidates) {
    const parsed = parseNiaPlanResponse(candidate);
    if (parsed.ok) return parsed;
    failure = parsed;
  }
  return failure;
}

export function normalizeApiPlan(data, draft = {}, options = {}) {
  const fallback = compileSakiDraft(draft);
  const review = data?.asariReview || {};
  const round = Math.max(1, Math.floor(Number(options?.round ?? data?.round) || 1));
  return {
    ...fallback,
    round,
    miniLiveVenueId: MINI_LIVE_VENUES[draft.miniLiveVenueId] ? draft.miniLiveVenueId : 'shopping_street',
    goal: clean(data?.goal?.playerGoal || fallback.goal),
    publicImage: clean(data?.publicImage || fallback.publicImage),
    principle: clean(data?.principle || fallback.principle),
    spine: clean(data?.spine || fallback.spine),
    storyQuestion: clean(data?.storyQuestion),
    evidence: Array.isArray(data?.evidence) && data.evidence.length ? data.evidence.slice(0, 6).map((item) => clean(item, 160)) : fallback.evidence,
    risks: Array.isArray(data?.risks) && data.risks.length ? data.risks.slice(0, 5).map((item) => clean(item, 160)) : fallback.risks,
    assumptions: Array.isArray(data?.assumptions) ? data.assumptions.slice(0, 5).map((item) => clean(item, 180)) : [],
    asariReview: [review.accepted, review.gap, review.advice].filter(Boolean).map((item) => clean(item, 240)).join(' '),
    asariReviewParts: {
      accepted: clean(review.accepted, 240),
      gap: clean(review.gap, 240),
      advice: clean(review.advice, 360)
    },
    days: data.days.map((day, index) => {
      const displayDayOffset = round >= 2 ? 1 : 0;
      const businessType = day.businessType || day.business_type;
      const allowedBusinessTypes = new Set(['online_live', 'sns_post', 'school_radio', 'tv_program', 'mini_live']);
      return ({
      id: 'day-' + (index + 1 + displayDayOffset),
      day: index + 1 + displayDayOffset,
      type: day.type,
      businessType: day.type === '营业' && allowedBusinessTypes.has(businessType) ? businessType : '',
      venueId: day.type === '营业' && businessType === 'mini_live'
        ? (MINI_LIVE_VENUES[draft.miniLiveVenueId] ? draft.miniLiveVenueId : 'shopping_street')
        : '',
      title: clean(day.title || '第' + (index + 1) + '日', 160),
      purpose: clean(day.purpose, 240),
      problem: clean(day.problem, 240),
      output: clean(day.output, 240),
      carriesFrom: Array.isArray(day.carriesFrom) ? day.carriesFrom : [],
      preparesFor: Array.isArray(day.preparesFor) ? day.preparesFor : [],
      workSeed: day.type === '制作人工作' && day.workSeed && typeof day.workSeed === 'object'
        ? {
            tasks: Array.isArray(day.workSeed.tasks)
              ? day.workSeed.tasks.slice(0, 3).map((task, taskIndex) => ({
                  id: clean(task?.id || `work-task-${taskIndex + 1}`, 80),
                  category: ['external', 'online', 'management'].includes(task?.category) ? task.category : 'management',
                  priority: ['core', 'followup', 'optional', 'emergency'].includes(task?.priority) ? task.priority : 'optional',
                  title: clean(task?.title || '制作人待办', 120),
                  deadline: clean(task?.deadline || '本工作日', 80),
                  goal: clean(task?.goal, 240),
                  background: clean(task?.background, 500),
                  constraints: Array.isArray(task?.constraints) ? task.constraints.slice(0, 6).map((item) => clean(item, 220)) : [],
                  assets: Array.isArray(task?.assets) ? task.assets.slice(0, 8).map((item) => clean(item, 180)) : [],
                  boundaries: Array.isArray(task?.boundaries) ? task.boundaries.slice(0, 6).map((item) => clean(item, 220)) : [],
                  expectedOutput: clean(task?.expectedOutput, 180),
                  phases: Array.isArray(task?.phases) ? task.phases.slice(0, 3).map((phase, phaseIndex) => ({
                    id: clean(phase?.id || `phase-${phaseIndex + 1}`, 80),
                    label: clean(phase?.label || `阶段 ${phaseIndex + 1}`, 100),
                    required: phase?.required !== false,
                    fixedPeriod: ['morning', 'afternoon', 'evening'].includes(phase?.fixedPeriod) ? phase.fixedPeriod : '',
                    briefing: {
                      situation: clean(phase?.briefing?.situation, 500),
                      facts: Array.isArray(phase?.briefing?.facts) ? phase.briefing.facts.slice(0, 8).map((item) => clean(item, 220)) : [],
                      constraints: Array.isArray(phase?.briefing?.constraints) ? phase.briefing.constraints.slice(0, 6).map((item) => clean(item, 220)) : []
                    },
                    presets: Array.isArray(phase?.presets) ? phase.presets.slice(0, 4).map((item) => clean(item, 220)) : []
                  })) : []
                }))
              : []
          }
        : null
    }); })
  };
}

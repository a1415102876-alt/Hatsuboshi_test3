const clean = (value, limit = 600) => String(value || '').trim().slice(0, limit);
const list = (value, max = 8, limit = 220) => Array.isArray(value)
  ? value.map((item) => clean(item, limit)).filter(Boolean).slice(0, max)
  : [];

function decodeTags(value) {
  return String(value || '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
}

function repairUnescapedStringQuotes(value) {
  const source = String(value || '');
  let result = '';
  let inString = false;
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (inString && char === '\\') {
      result += char;
      if (index + 1 < source.length) result += source[index += 1];
      continue;
    }
    if (char !== '"') {
      result += char;
      continue;
    }
    if (!inString) {
      inString = true;
      result += char;
      continue;
    }
    let nextIndex = index + 1;
    while (nextIndex < source.length && /\s/.test(source[nextIndex])) nextIndex += 1;
    const next = source[nextIndex];
    if (!next || [',', '}', ']', ':'].includes(next)) {
      inString = false;
      result += char;
    } else {
      result += '\\"';
    }
  }
  return result;
}

function parseTaggedJson(value) {
  const source = String(value || '').trim();
  try {
    return JSON.parse(source);
  } catch {
    try {
      return JSON.parse(repairUnescapedStringQuotes(source));
    } catch {
      return null;
    }
  }
}

function taggedJsonCandidates(value, tag) {
  const source = decodeTags(value);
  const opens = [...source.matchAll(new RegExp(`<${tag}\\b[^>]*>`, 'gi'))];
  const closes = [...source.matchAll(new RegExp(`</${tag}\\s*>`, 'gi'))];
  const bodies = [];
  let openIndex = opens.length - 1;
  for (let closeIndex = closes.length - 1; closeIndex >= 0 && openIndex >= 0; closeIndex -= 1) {
    const close = closes[closeIndex];
    while (openIndex >= 0 && opens[openIndex].index > close.index) openIndex -= 1;
    if (openIndex < 0) break;
    const open = opens[openIndex];
    bodies.push(source.slice(open.index + open[0].length, close.index));
    openIndex -= 1;
  }
  const candidates = [];
  for (const body of bodies) {
    const parsed = parseTaggedJson(body);
    if (parsed) candidates.push(parsed);
  }
  return {
    candidates,
    reason: bodies.length ? 'invalid_json' : `missing_${tag.toLowerCase()}`
  };
}

export function buildNiaProducerWorkPrompt(context = {}, task = {}, period = {}, decision = {}) {
  const finalPeriod = Number(context.periodIndex) === 2;
  const isRadioPlan = task.outputType === 'radio_plan' || task.id === 'radio-department-plan';
  const customDecision = clean(decision.freeText, 1200);
  const resultShape = {
    schemaVersion: 1,
    receiptId: '沿用context.receiptId',
    taskId: '沿用输入',
    periodId: '沿用输入',
    completedPhase: '沿用输入',
    story: '完整VN正文',
    summary: '客观结果',
    reaction: 'none',
    documents: [], materials: [], contacts: [], terms: [], careerLog: [],
    risksAdded: [], risksResolved: [], followUps: [],
    nextBriefing: { situation: '', facts: [], constraints: [] },
    reunionStory: ''
  };
  if (isRadioPlan) resultShape.radioPlan = {
    business_id: '本期广播的唯一稳定标识',
    programTitle: '初星放送部',
    episodeTitle: '本期标题',
    goal: '本期企划目标',
    host: '真诚优',
    guest: clean(context.idol, 120),
    interviewFocus: '主题访谈重点',
    additionalGuestMode: 'random',
    additionalGuest: ''
  };
  if (isRadioPlan && context.radioPlan && typeof context.radioPlan === 'object') {
    const fixed = context.radioPlan;
    resultShape.radioPlan = {
      business_id: clean(fixed.business_id || fixed.businessId, 160),
      programTitle: clean(fixed.programTitle, 160) || '初星放送部',
      episodeTitle: clean(fixed.episodeTitle, 200),
      goal: clean(fixed.goal, 600),
      host: clean(fixed.host, 120) || '真诚优',
      guest: clean(fixed.guest, 120) || clean(context.idol, 120),
      interviewFocus: clean(fixed.interviewFocus, 600),
      additionalGuestMode: ['random', 'specified'].includes(fixed.additionalGuestMode) ? fixed.additionalGuestMode : 'random',
      additionalGuest: clean(fixed.additionalGuest, 120)
    };
  }
  return [
    '[HATSU_OUTPUT_MODE:NIA_PRODUCER_WORK]',
    '[初星育成系统 · N.I.A制作人工作 v1]',
    '',
    '这是一个制作人工作时段。根据给出的现场资料和玩家决策，生成本时段完整的执行过程与客观工作回执。',
    '只处理当前taskId、phaseId和periodId。不得推进到下一时段，不得顺手完成其他待办，不得改变固定预约。',
    '正文必须在本次回复内结束当前工作场景。结果可以不完美，但不能以新的问题、待回应台词或下一次选择结束。',
    finalPeriod
      ? '这是当天最后一个时段。reunionStory必须写制作人与担当偶像重新合流、说明今天的重要结果，并把它接向后续日程；合流本身不再提出选择。'
      : '这不是当天最后一个时段。reunionStory必须为空字符串。',
    '',
    'N.I.A企划与连续状态：', JSON.stringify(context, null, 2),
    '当前待办：', JSON.stringify(task, null, 2),
    '当前时段：', JSON.stringify(period, null, 2),
    '玩家决策：', JSON.stringify(decision, null, 2),
    customDecision
      ? `玩家自定义方案是本次工作的主要指示，必须在 story、summary 或 nextBriefing 中体现其具体执行结果；不要只执行预设，也不要用泛泛的训练描写替代自定义内容。自定义方案：${customDecision}`
      : '',
    '',
    '叙事要求：',
    '- story使用现有VN格式：<narration>叙述</narration>与<dialogue char="角色名">台词</dialogue>。',
    '- 预设项只是玩家采取的行动，不代表正确答案；根据角色、现场和已持有筹码产生具体结果。若同时存在自定义方案，自定义方案优先，预设只作为补充方向。',
    '- 制作人独自工作时不要让偶像凭空出现在现场；只有合理的电话、消息或最后合流可以出现。',
    '- completedPhase必须等于输入phaseId；taskId与periodId必须原样返回。',
    '- nextBriefing只记录下一阶段开始前制作人已经能够知道的事实，不得预写下一阶段结果。',
    '- followUps最多2项，只能来自本次实际结果。',
    '- 线上运营reaction只能是flat、normal、good、popular；其他工作填none。不要输出粉丝数。',
    isRadioPlan ? '- 本任务必须填写radioPlan全部字段。business_id在本期企划、后续四段广播和结算中保持不变；主持人固定为真诚优，主嘉宾固定为当前担当偶像。若前端企划包含additionalGuest，该角色是Lv2多嘉宾采访的固定第二嘉宾，不得改写。' : '',
    '',
    '最终回复只能包含一个完整的<NIA_WORK_RESULT>块，不要使用Markdown代码块，不要输出额外说明：',
    '<NIA_WORK_RESULT>',
    JSON.stringify(resultShape),
    '</NIA_WORK_RESULT>'
  ].join('\n');
}

export function normalizeNiaProducerWorkReceipt(data = {}, context = {}) {
  const reaction = ['none', 'flat', 'normal', 'good', 'popular'].includes(data.reaction) ? data.reaction : 'none';
  const nextSource = data.nextBriefing || data.next_briefing;
  const next = nextSource && typeof nextSource === 'object' ? nextSource : {};
  const radioPlan = data.radioPlan || data.radio_plan;
  const receipt = {
    schemaVersion: 1,
    receiptId: clean(data.receiptId || data.receipt_id, 160),
    taskId: clean(data.taskId || data.task_id, 80),
    periodId: clean(data.periodId || data.period_id, 40),
    completedPhase: clean(data.completedPhase || data.completed_phase, 80),
    story: clean(data.story, 10000),
    summary: clean(data.summary, 300),
    reaction,
    documents: list(data.documents, 6),
    materials: list(data.materials, 6),
    contacts: list(data.contacts, 4),
    terms: list(data.terms, 6, 240),
    careerLog: list(data.careerLog || data.career_log, 4, 240),
    risksAdded: list(data.risksAdded || data.risks_added, 4),
    risksResolved: list(data.risksResolved || data.risks_resolved, 4),
    followUps: list(data.followUps || data.follow_ups, 2, 240),
    nextBriefing: {
      situation: clean(next.situation, 500),
      facts: list(next.facts, 8),
      constraints: list(next.constraints, 6)
    },
    reunionStory: clean(data.reunionStory || data.reunion_story, 3000)
  };
  if (!receipt.receiptId || receipt.receiptId !== clean(context.receiptId, 160)) return { ok: false, reason: 'receipt_id_mismatch' };
  if (!receipt.taskId || receipt.taskId !== clean(context.taskId, 80)) return { ok: false, reason: 'task_id_mismatch' };
  if (!receipt.periodId || receipt.periodId !== clean(context.periodId, 40)) return { ok: false, reason: 'period_id_mismatch' };
  if (!receipt.completedPhase || receipt.completedPhase !== clean(context.phaseId, 80)) return { ok: false, reason: 'phase_id_mismatch' };
  if (!receipt.story || !receipt.summary) return { ok: false, reason: 'missing_story_or_summary' };
  if (context.isFinalPeriod && !receipt.reunionStory) return { ok: false, reason: 'missing_reunion_story' };
  if (!context.isFinalPeriod) receipt.reunionStory = '';
  if (context.taskId === 'radio-department-plan') {
    const fixed = context.radioPlan && typeof context.radioPlan === 'object' && !Array.isArray(context.radioPlan)
      ? context.radioPlan
      : null;
    const source = fixed || (radioPlan && typeof radioPlan === 'object' && !Array.isArray(radioPlan) ? radioPlan : {});
    receipt.radioPlan = {
      business_id: clean(source.business_id || source.businessId, 160) || `nia-radio-${receipt.receiptId}`,
      programTitle: clean(source.programTitle || source.program_title, 160) || '初星放送部',
      episodeTitle: clean(source.episodeTitle || source.episode_title, 200) || receipt.summary || '新人特别回',
      goal: clean(source.goal, 600) || receipt.summary || '完成担当偶像的校园广播首秀',
      host: clean(source.host, 120) || '真诚优',
      guest: clean(source.guest, 120) || clean(context.idol, 120) || '担当偶像',
      interviewFocus: clean(source.interviewFocus || source.interview_focus, 600)
        || receipt.nextBriefing.situation
        || receipt.summary
        || '担当偶像近期经历与公众形象',
      additionalGuestMode: ['random', 'specified'].includes(source.additionalGuestMode) ? source.additionalGuestMode : 'random',
      additionalGuest: clean(source.additionalGuest, 120)
    };
  }
  return { ok: true, data: receipt };
}

export function parseNiaProducerWorkPayload(payload = {}, context = {}) {
  const candidates = [payload.rawText, payload.text, payload.renderedText]
    .map((value) => String(value || '').trim())
    .filter((value, index, values) => value && values.indexOf(value) === index);
  let failure = { ok: false, reason: 'missing_nia_work_result' };
  for (const candidate of candidates) {
    const tagged = taggedJsonCandidates(candidate, 'NIA_WORK_RESULT');
    if (!tagged.candidates.length) {
      failure = { ok: false, reason: tagged.reason };
      continue;
    }
    let candidateFailure = null;
    for (const data of tagged.candidates) {
      const normalized = normalizeNiaProducerWorkReceipt(data, context);
      if (normalized.ok) return normalized;
      if (!candidateFailure) candidateFailure = normalized;
    }
    failure = candidateFailure || failure;
  }
  return failure;
}

if (typeof globalThis !== 'undefined') {
  globalThis.HatsuNiaProducerWorkApi = Object.freeze({
    buildNiaProducerWorkPrompt,
    parseNiaProducerWorkPayload,
    normalizeNiaProducerWorkReceipt
  });
}

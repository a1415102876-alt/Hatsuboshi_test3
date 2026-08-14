const clampInteger = (value, min, max) => Math.min(max, Math.max(min, Math.round(Number(value) || 0)));
const text = (value, limit = 1000) => String(value || '').trim().slice(0, limit);
const object = (value) => value && typeof value === 'object' && !Array.isArray(value) ? value : {};

function normalizeLines(value) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 24).map((item, index) => ({
    id: text(item?.id, 80) || `audition-line-${index + 1}`,
    type: ['dialogue', 'narration'].includes(item?.type) ? item.type : 'narration',
    speaker: text(item?.speaker, 80),
    text: text(item?.text, 800)
  })).filter((line) => line.text && (line.type !== 'dialogue' || line.speaker));
}

function taggedJsonBodies(value, tag) {
  const source = String(value || '').replace(/&lt;/gi, '<').replace(/&gt;/gi, '>').replace(/&amp;/gi, '&');
  const opens = [...source.matchAll(new RegExp('<' + tag + '\\b[^>]*>', 'gi'))];
  const closes = [...source.matchAll(new RegExp('<\\/' + tag + '\\s*>', 'gi'))];
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
  return bodies;
}

function lastValidTaggedJson(value, tag) {
  const bodies = taggedJsonBodies(value, tag);
  for (const body of bodies) {
    try { return { ok: true, data: JSON.parse(body.trim()) }; }
    catch { /* Ignore planning examples and truncated blocks. */ }
  }
  return { ok: false, reason: bodies.length ? 'invalid_json' : 'missing_nia_audition' };
}

export function buildNiaAuditionSegmentPrompt(context = {}, runtime = {}) {
  const index = clampInteger(runtime.pendingSegmentIndex, 1, 4);
  const roundNumber = clampInteger(context.round || runtime.roundNumber, 1, 99);
  const isFinale = Boolean(context.isFinale) || roundNumber >= 3;
  const stageLabel = isFinale ? 'N.I.A FINALE' : `第 ${roundNumber} 轮试镜`;
  const duties = {
    1: '带着本轮经历登台：描写候场、登台与开场表现，用轻量关系回声建立基调，并让未解决短板留下轻微痕迹。',
    2: '训练成果接受检验：具体写出训练前的问题、形成的改善，以及改善如何在本段舞台镜头中发挥作用。',
    3: '企划与营业成果兑现：让此前公开确认的魅力转化为评审、镜头与现场反应，不得提前宣布最终结果。',
    4: isFinale
      ? '角色命题的最终回答：完成最终高光、结束动作、评审反应和第一名夺冠结算，同时保留人物真实的不完美。'
      : '角色命题的阶段性回答：完成最终高光、结束动作、评审反应和第一名晋级结算，同时保留冻结的未解决短板。'
  };
  const ranking = Array.isArray(runtime.rankings?.[index - 1]) ? runtime.rankings[index - 1] : [];
  const shape = {
    schemaVersion: 1,
    auditionId: text(context.auditionId || runtime.auditionId, 160),
    segmentIndex: index,
    status: index === 4 ? 'ended' : 'continue',
    lines: [
      { type: 'narration', speaker: '', text: '可直接在 VN 中播放的舞台、镜头或评审描写。' },
      { type: 'dialogue', speaker: text(context.idol, 80) || '担当偶像', text: '符合本段职责的台词。' }
    ],
    continuitySummary: '供下一段承接的已发生事实摘要。'
  };
  if (index === 4) Object.assign(shape, {
    finalRank: 1,
    highlight: '本场试镜最终高光。',
    weakness: '仍需带入下一轮的未解决短板。',
    payoffSummary: '本轮训练与公开成果如何成为偶像自己的能力。',
    resultSummary: isFinale ? '明确宣布担当偶像获得 FINALE 第一名。' : '明确宣布担当偶像第一名晋级。'
  });

  return [
    `[HATSU_OUTPUT_MODE:NIA_ROUND_${roundNumber}_AUDITION]`,
    `你正在为《学园偶像大师》N.I.A 篇生成${stageLabel}的第 ${index} 段。`,
    duties[index],
    isFinale
      ? '这是最终决赛，第一名获得冠军。前端已冻结八名选手和全部四段累计分数；不得修改、重新计算或质疑任何分数、排名和最终结果。'
      : '本场只有第 1 名晋级。前端已冻结八名选手和全部四段累计分数；不得修改、重新计算或质疑任何分数、排名和晋级结果。',
    '本段冻结排名：',
    JSON.stringify(ranking, null, 2),
    '本轮固定企划、培养回收与人物信息：',
    JSON.stringify(context, null, 2),
    'fixedOpponents 中的角色是本轮不可替换的固定命名对手，必须按冻结排名自然写入舞台、候场、镜头或评审观察；不得改名、删除或换成路人。',
    '此前已完成段落：',
    JSON.stringify(runtime.segments || [], null, 2),
    '不得生成表现方向、技能、制作人指示或任何选项，不得让玩家中途决策。',
    '粉丝与属性奖励由前端固定结算；不得输出 fanGain 或 statGains，也不得自行计算或修改奖励。',
    index < 4
      ? '本段 status 必须为 continue；不得宣布最终名次或试镜结果。'
      : '本段 status 必须为 ended，finalRank 必须为 1；必须完整收尾，不得提出新问题、追加第五段或留下待处理现场。',
    '只输出最后一个完整 JSON 块，不要 Markdown、解释、思考文本、普通剧情标签或表格操作。',
    '<NIA_AUDITION>',
    JSON.stringify(shape),
    '</NIA_AUDITION>'
  ].join('\n');
}

export function parseNiaAuditionSegmentPayload(source, expected = {}) {
  const candidates = typeof source === 'string'
    ? [source]
    : [source?.rawText, source?.text, source?.renderedText].filter((item) => item != null);
  let parsed = { ok: false, reason: 'missing_nia_audition' };
  for (const candidate of candidates) {
    parsed = lastValidTaggedJson(candidate, 'NIA_AUDITION');
    if (parsed.ok) break;
  }
  if (!parsed.ok) return parsed;

  const raw = object(parsed.data);
  const auditionId = text(raw.auditionId || raw.audition_id, 160);
  const segmentIndex = clampInteger(raw.segmentIndex || raw.segment_index, 1, 4);
  if (auditionId !== text(expected.auditionId, 160)) return { ok: false, reason: 'audition_id_mismatch' };
  if (segmentIndex !== clampInteger(expected.segmentIndex, 1, 4)) return { ok: false, reason: 'segment_index_mismatch' };
  if ((Array.isArray(raw.options) && raw.options.length) || raw.problem || raw.producerInstruction) {
    return { ok: false, reason: 'unexpected_choices' };
  }
  if (raw.rankings || raw.ranking || raw.scores || raw.candidates) {
    return { ok: false, reason: 'attempted_result_override' };
  }

  const data = {
    schemaVersion: 1,
    auditionId,
    segmentIndex,
    status: text(raw.status, 40),
    lines: normalizeLines(raw.lines),
    continuitySummary: text(raw.continuitySummary, 1000)
  };
  if (!data.lines.length || !data.continuitySummary) return { ok: false, reason: 'invalid_audition_segment_contract' };
  if (segmentIndex < 4) {
    if (data.status !== 'continue') return { ok: false, reason: 'invalid_audition_segment_contract' };
    return { ok: true, data };
  }

  data.finalRank = clampInteger(raw.finalRank, 1, 8);
  data.highlight = text(raw.highlight, 800);
  data.weakness = text(raw.weakness, 800);
  data.payoffSummary = text(raw.payoffSummary, 1000);
  data.resultSummary = text(raw.resultSummary, 1000);
  if (data.status !== 'ended' || data.finalRank !== 1 || !data.highlight || !data.weakness || !data.payoffSummary || !data.resultSummary) {
    return { ok: false, reason: 'invalid_final_result' };
  }
  return { ok: true, data };
}

export function buildNiaPostAuditionOpeningPrompt(context = {}, runtime = {}) {
  const auditionId = text(context.auditionId || runtime.auditionId, 160);
  const roundNumber = clampInteger(context.round || runtime.roundNumber, 1, 99);
  const stageLabel = Boolean(context.isFinale) || roundNumber >= 3 ? 'N.I.A FINALE' : `第 ${roundNumber} 轮 N.I.A 试镜`;
  const shape = {
    schemaVersion: 1,
    auditionId,
    story: '<narration>担当偶像离开舞台，在后台候场区找到制作人。</narration><dialogue char="担当偶像">符合人设的赛后第一反应。</dialogue>',
    options: [
      '肯定本轮已经取得的成果。',
      '冷静复盘本场仍未解决的短板。',
      '结合两人关系与偶像性格作出个性化回应。'
    ]
  };
  return [
    '[HATSU_OUTPUT_MODE:NIA_POST_AUDITION_OPENING]',
    `你正在生成${stageLabel}结束后的赛后复盘开场。`,
    '场景固定为试镜会场后台候场区：排名已经公布，担当偶像离开舞台，主动找到一直等待的制作人。',
    '只写偶像下台后的真实反应和两人会合，随后自然停在等待制作人回应的位置。',
    '必须生成恰好三个语义不同的制作人回应：肯定本轮成果、冷静复盘短板、贴近当前关系的个性化回应。',
    '不得输出第四个选项；自由输入入口由前端提供。',
    '不得输出或修改排名、分数、奖励、fanGain、statGains、属性与晋级结果。',
    '不得开始新营业、新训练、新事故或下一轮剧情，不得突然加入其他角色。',
    '冻结的试镜上下文：',
    JSON.stringify(context, null, 2),
    '冻结的试镜 runtime、四段摘要与最终结果：',
    JSON.stringify(runtime, null, 2),
    '只输出最后一个完整 JSON 标签块，不要 Markdown、解释、思考文本或其他剧情标签。',
    '<NIA_AUDITION_RECAP_OPENING>',
    JSON.stringify(shape),
    '</NIA_AUDITION_RECAP_OPENING>'
  ].join('\n');
}

export function parseNiaPostAuditionOpeningPayload(source, expected = {}) {
  const candidates = typeof source === 'string'
    ? [source]
    : [source?.rawText, source?.text, source?.renderedText].filter((item) => item != null);
  let parsed = { ok: false, reason: 'missing_recap_opening' };
  for (const candidate of candidates) {
    parsed = lastValidTaggedJson(candidate, 'NIA_AUDITION_RECAP_OPENING');
    if (parsed.ok) break;
  }
  if (!parsed.ok) return parsed;
  const raw = object(parsed.data);
  const auditionId = text(raw.auditionId || raw.audition_id, 160);
  if (auditionId !== text(expected.auditionId, 160)) return { ok: false, reason: 'audition_id_mismatch' };
  const story = text(raw.story, 8000);
  const rawOptions = Array.isArray(raw.options) ? raw.options : [];
  const options = rawOptions.map((item) => text(item, 240)).filter(Boolean);
  if (!story || rawOptions.length !== 3 || options.length !== 3) return { ok: false, reason: 'invalid_recap_opening' };
  return {
    ok: true,
    data: { schemaVersion: 1, auditionId, story, options }
  };
}

export function buildNiaPostAuditionResolutionPrompt(context = {}, runtime = {}) {
  const auditionId = text(context.auditionId || runtime.auditionId, 160);
  const roundNumber = clampInteger(context.round || runtime.roundNumber, 1, 99);
  const isFinale = Boolean(context.isFinale) || roundNumber >= 3;
  const stageLabel = isFinale ? 'N.I.A FINALE' : `第 ${roundNumber} 轮 N.I.A 试镜`;
  const recap = object(runtime.postAudition);
  const shape = {
    schemaVersion: 1,
    auditionId,
    story: '<dialogue char="制作人">玩家已经冻结的回应。</dialogue><dialogue char="担当偶像">符合人设的反应与收束。</dialogue>',
    recapSummary: `${stageLabel}赛后复盘的简短客观摘要。`
  };
  return [
    '[HATSU_OUTPUT_MODE:NIA_POST_AUDITION_RESOLUTION]',
    `你正在生成${stageLabel}结束后的赛后复盘收尾。`,
    '必须把玩家回应理解为制作人的真实表达，逐字承接其含义，不得评价玩家的选择质量。',
    `玩家回应来源：${text(recap.selectedResponseSource, 40)}`,
    `玩家最终回应：${text(recap.selectedResponse, 500)}`,
    '结合本场 highlight、payoffSummary 和 weakness 写出偶像的角色化反应。',
    isFinale
      ? '承认人物仍有真实的不完美，并完整回应赢得 FINALE 后的感受；明确本届 N.I.A 已经结束。'
      : `承认短板仍未完全解决，并把它作为后续培养起点；明确第 ${roundNumber} 轮已经结束且两人会继续前进。`,
    '必须完整收束，以偶像的动作或台词结束，不得提出需要玩家处理的新问题。',
    '不要生成任何选项、自由输入提示、第二轮选择或待处理现场。',
    '不得输出或修改排名、分数、奖励、fanGain、statGains、属性与晋级结果。',
    '不得开始新营业、新训练或直接跳到下一轮。',
    '冻结的试镜上下文：',
    JSON.stringify(context, null, 2),
    '冻结的试镜 runtime 与赛后开场：',
    JSON.stringify(runtime, null, 2),
    '只输出最后一个完整 JSON 标签块，不要 Markdown、解释、思考文本或普通剧情外壳。',
    '<NIA_AUDITION_RECAP_RESOLUTION>',
    JSON.stringify(shape),
    '</NIA_AUDITION_RECAP_RESOLUTION>'
  ].join('\n');
}

export function parseNiaPostAuditionResolutionPayload(source, expected = {}) {
  const candidates = typeof source === 'string'
    ? [source]
    : [source?.rawText, source?.text, source?.renderedText].filter((item) => item != null);
  let parsed = { ok: false, reason: 'missing_recap_resolution' };
  for (const candidate of candidates) {
    parsed = lastValidTaggedJson(candidate, 'NIA_AUDITION_RECAP_RESOLUTION');
    if (parsed.ok) break;
  }
  if (!parsed.ok) return parsed;
  const raw = object(parsed.data);
  const auditionId = text(raw.auditionId || raw.audition_id, 160);
  if (auditionId !== text(expected.auditionId, 160)) return { ok: false, reason: 'audition_id_mismatch' };
  const story = text(raw.story, 8000);
  const recapSummary = text(raw.recapSummary || raw.recap_summary, 1000);
  if (!story || !recapSummary) return { ok: false, reason: 'invalid_recap_resolution' };
  return {
    ok: true,
    data: { schemaVersion: 1, auditionId, story, recapSummary }
  };
}

if (typeof globalThis !== 'undefined') {
  globalThis.HatsuNiaAuditionApi = Object.freeze({
    buildNiaAuditionSegmentPrompt,
    parseNiaAuditionSegmentPayload,
    buildNiaPostAuditionOpeningPrompt,
    parseNiaPostAuditionOpeningPayload,
    buildNiaPostAuditionResolutionPrompt,
    parseNiaPostAuditionResolutionPayload
  });
}

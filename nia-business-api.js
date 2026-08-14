const clampInteger = (value, min, max) => Math.min(max, Math.max(min, Math.round(Number(value) || 0)));
const boundedStrings = (value, max, length = 180) => Array.isArray(value)
  ? value.map((item) => String(item || '').trim()).filter(Boolean).slice(0, max).map((item) => item.slice(0, length))
  : [];

const SAKI_LIVE_VISUAL_TAGS = [
  '自信说明', '冷静思考', '被夸陶醉', '被夸慌张', '恳切请求', '正面挑战',
  '激动强调', '不服审视', '真诚表态', '沮丧低落', '平常待机', '意外动摇',
  '慌张解释', '震惊失语', '振奋宣言', '得意大笑', '温柔喜悦', '凑近追问'
];
const KOTONE_LIVE_VISUAL_TAGS = [
  '俏皮推销', '委屈求饶', '黑脸无语', '精明盘算', '意外发愣', '平常待机',
  '认真审视', '诚恳请求', '害羞躲闪', '灿烂欢呼', '得意吐槽', '振奋宣言',
  '沮丧低落', '真诚表态', '委屈忍耐', '含泪抗议', '生气抗议', '温柔喜悦'
];
const UME_LIVE_VISUAL_TAGS = [
  '真诚说明', '惊讶解释', '羞涩待机', '轻微不满', '尴尬困惑', '温柔好奇',
  '俏皮提问', '恳切请求', '自信站姿', '严肃追问', '振奋宣言', '认真思考',
  '温柔喜悦', '开朗挥手', '害羞微笑', '不安询问', '羞恼抗议', '沮丧低落',
  '慌张不安', '得意欢呼', '凑近问候', '温暖问候', '倾慕陶醉', '沉思怀疑'
];
const LIVE_VISUAL_TAGS_BY_IDOL = Object.freeze({
  '花海咲季': SAKI_LIVE_VISUAL_TAGS,
  '藤田琴音': KOTONE_LIVE_VISUAL_TAGS,
  '花海佑芽': UME_LIVE_VISUAL_TAGS
});
const LIVE_DEFAULT_VISUAL_TAG_BY_IDOL = Object.freeze({
  '花海咲季': '平常待机',
  '藤田琴音': '平常待机',
  '花海佑芽': '羞涩待机'
});
const LIVE_EXAMPLE_VISUAL_TAG_BY_IDOL = Object.freeze({
  '花海咲季': '被夸陶醉',
  '藤田琴音': '俏皮推销',
  '花海佑芽': '得意欢呼'
});

function taggedJson(value, tag) {
  const text = String(value || '');
  const bodies = taggedJsonBodies(text, tag);
  if (!bodies.length) return { ok: false, reason: 'missing_' + tag.toLowerCase() };
  try { return { ok: true, data: JSON.parse(bodies[0].trim()) }; }
  catch { return { ok: false, reason: 'invalid_json' }; }
}

function taggedJsonBodies(value, tag) {
  const text = String(value || '');
  const opens = [...text.matchAll(new RegExp('<' + tag + '\\b[^>]*>', 'gi'))];
  const closes = [...text.matchAll(new RegExp('<\\/' + tag + '\\s*>', 'gi'))];
  const bodies = [];
  let openIndex = opens.length - 1;
  for (let closeIndex = closes.length - 1; closeIndex >= 0 && openIndex >= 0; closeIndex -= 1) {
    const close = closes[closeIndex];
    while (openIndex >= 0 && opens[openIndex].index > close.index) openIndex -= 1;
    if (openIndex < 0) break;
    const open = opens[openIndex];
    bodies.push(text.slice(open.index + open[0].length, close.index));
    openIndex -= 1;
  }
  return bodies;
}

export function parseNiaBusinessOpening(value) {
  const parsed = taggedJson(value, 'NIA_BUSINESS_OPENING');
  if (!parsed.ok) return parsed;
  const data = parsed.data || {};
  const story = String(data.story || '').trim();
  const problem = String(data.problem || '').trim();
  const options = boundedStrings(data.options, 4, 220);
  if (!story || !problem || options.length !== 4) return { ok: false, reason: 'invalid_opening_contract' };
  return { ok: true, data: { schemaVersion: 1, story, problem, options, continuity: boundedStrings(data.continuity, 8, 180) } };
}

export function parseNiaBusinessResolution(value) {
  const text = String(value || '');
  const parsed = taggedJson(text, 'NIA_BUSINESS_RESULT');
  if (!parsed.ok) return parsed;
  const storyMatch = text.match(/<story>([\s\S]*?)<\/story>/i);
  const story = String(storyMatch?.[1] || text.slice(0, text.indexOf('<NIA_BUSINESS_RESULT>'))).trim();
  if (!story) return { ok: false, reason: 'missing_resolution_story' };
  return { ok: true, data: { story, result: parsed.data || {} } };
}

export function normalizeNiaBusinessResult(value, options = {}) {
  const data = value || {};
  return {
    problemSolved: Boolean(data.problemSolved),
    baseFans: clampInteger(options.baseFans ?? 2000, 0, 100000),
    bonusFans: clampInteger(data.bonusFans, 0, 2000),
    pressureDelta: clampInteger(data.pressureDelta, 0, 8),
    impressions: boundedStrings(data.impressions, 4, 40),
    bonusReasons: boundedStrings(data.bonusReasons, 3, 180),
    summary: String(data.summary || '').trim().slice(0, 300)
  };
}

const contextJson = (context) => JSON.stringify(context || {}, null, 2);

export function buildNiaBusinessOpeningPrompt(context) {
  return [
    '[HATSU_OUTPUT_MODE:NIA_BUSINESS_OPENING]',
    '营业类型固定为 online_live（网上直播），不得改写成电视综艺、线下活动或其他项目。',
    '你正在为《学园偶像大师》N.I.A篇生成一次营业事件。这是非叙事系统任务，必须严格输出结构。',
    '营业上下文：', contextJson(context), '',
    '写一段适合现有VN播放器的节目开场，让本轮企划方向在实际营业中受到检验。只设置一个核心现场问题，而且必须具体、能由制作人当场介入、不能靠偶像单纯提升能力自动解决。问题出现时暂停剧情，不写结果。', '',
    '只输出：', '<NIA_BUSINESS_OPENING>',
    '{"schemaVersion":1,"story":"使用<narration>与<dialogue char=\\"角色名\\">的VN正文","problem":"核心现场问题","options":["制作人行动1","制作人行动2","制作人行动3","制作人行动4"],"continuity":["后续必须保持的事实"]}',
    '</NIA_BUSINESS_OPENING>', '',
    'options必须恰好四个，都是制作人能立即采取的不同解决思路，不得提前透露优劣或结果。'
  ].join('\n');
}

export function buildNiaBusinessResolutionPrompt(context, opening, action) {
  return [
    '[HATSU_OUTPUT_MODE:NIA_BUSINESS_RESOLUTION]',
    '本次仍是 online_live（网上直播），必须继续执行同一份网上直播企划单，不得切换营业类型。',
    '继续同一次N.I.A营业事件，并审查制作人的现场方案。',
    '营业上下文：' + contextJson(context),
    '前半段剧情：' + String(opening?.story || ''),
    '核心问题：' + String(opening?.problem || ''),
    '连续事实：' + JSON.stringify(opening?.continuity || []),
    '制作人的解决方案：' + String(action || ''), '',
    '这是当前营业事件的最后一段。先续写制作人方案引发的现场反应与偶像表现，再写出节目或活动实际结束后的落点。必须在本次回复内完成现场问题的处理与本场营业的收束。方案可以不完美、问题也可以没有彻底解决，但必须写清已经发生的具体后果；不得以新的问题、悬念、待回应的台词或下一轮选择结束。下一场可承接本场造成的结果，但本场本身必须完整结束。',
    '随后根据以下证据整体判断额外加分：是否解决问题、发挥偶像特质、符合本轮公开形象、形成传播高光、制作人与偶像是否有效配合。不得按关键词命中机械评分，也不得因为文辞华丽自动加分。', '',
    '严格输出：',
    '<story>只含<narration>与<dialogue char="角色名">的VN正文</story>',
    '<NIA_BUSINESS_RESULT>',
    '{"schemaVersion":1,"problemSolved":true,"bonusFans":0,"pressureDelta":0,"impressions":[],"bonusReasons":[],"summary":"本次营业如何推进企划"}',
    '</NIA_BUSINESS_RESULT>', '',
    'bonusFans范围0到2000，pressureDelta范围0到8。不要输出baseFans，基础粉丝由前端决定。理由必须引用正文实际发生的证据。'
  ].join('\n');
}

function lastTaggedJson(value, tag) {
  const bodies = taggedJsonBodies(value, tag);
  const last = bodies[0];
  if (last === undefined) return { ok: false, reason: 'missing_' + tag.toLowerCase() };
  try { return { ok: true, data: JSON.parse(last.trim()) }; }
  catch {
    let recovered = null;
    let recoveredLength = 0;
    for (let start = 0; start < last.length; start += 1) {
      if (last[start] !== '{') continue;
      let depth = 0;
      let inString = false;
      let escaped = false;
      for (let index = start; index < last.length; index += 1) {
        const char = last[index];
        if (inString) {
          if (escaped) escaped = false;
          else if (char === '\\') escaped = true;
          else if (char === '"') inString = false;
          continue;
        }
        if (char === '"') {
          inString = true;
          continue;
        }
        if (char === '{') depth += 1;
        else if (char === '}') {
          depth -= 1;
          if (depth === 0) {
            const candidate = last.slice(start, index + 1);
            try {
              const parsed = JSON.parse(candidate);
              if (candidate.length > recoveredLength) {
                recovered = parsed;
                recoveredLength = candidate.length;
              }
            } catch {}
            break;
          }
        }
      }
    }
    return recovered ? { ok: true, data: recovered } : { ok: false, reason: 'invalid_json' };
  }
}

const enumValue = (value, allowed, fallback) => allowed.includes(value) ? value : fallback;
const boundedText = (value, length = 600) => String(value || '').trim().slice(0, length);

function normalizeLiveBeats(value) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 12).map((item, index) => ({
    id: boundedText(item?.id, 80) || `beat-${index + 1}`,
    type: enumValue(item?.type, ['narration', 'dialogue', 'action'], 'narration'),
    speaker: boundedText(item?.speaker, 60),
    text: boundedText(item?.text, 500),
    delayMs: clampInteger(item?.delayMs, 0, 8000)
  })).filter((item) => item.text);
}

function normalizeLiveComments(value) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 24).map((item, index) => ({
    id: boundedText(item?.id, 80) || `comment-${index + 1}`,
    text: boundedText(item?.text, 180),
    tone: enumValue(item?.tone, ['positive', 'neutral', 'concerned', 'excited', 'negative'], 'neutral'),
    triggerAfterBeatId: boundedText(item?.triggerAfterBeatId, 80),
    delayMs: clampInteger(item?.delayMs, 0, 8000)
  })).filter((item) => item.text);
}

export function buildNiaLiveSegmentPrompt(context, runtime = {}) {
  const index = clampInteger(runtime.pendingSegmentIndex, 1, 4);
  const businessLevel = clampInteger(context?.businessLevel, 1, 3) || 1;
  const baseDuties = {
    1: '直播开场：建立直播主题、偶像当前状态与观众的第一印象。不要提前制造核心事故。',
    2: '内容展开：承接开场，用具体互动推进企划主题并积累观众反应。不要提前制造核心事故。',
    3: '关键事故：只设置一个能够由制作人现场介入的问题，并给出恰好三个制作人处理方案；在等待选择处停下。',
    4: '处理与收尾：严格执行制作人指示，写清现场后果并自然收播。不得再制造新事故、悬念或选择。'
  };
  const specialDuties = {
    1: '特别企划开场：明确宣布本期特别企划的主题、规则、准备内容与看点，让观众知道这不是普通闲聊直播。不要提前制造核心事故。',
    2: '特别企划执行：围绕既定规则和道具完整推进核心环节，具体回收此前训练、营业成果或公众印象。不要提前制造核心事故。',
    3: '企划关联事故：只设置一个由本期特别企划的规则、道具或互动自然引发的问题，并给出恰好三个制作人处理方案；在等待选择处停下。',
    4: '特别企划收尾：严格执行制作人指示，把事故转化为本期企划独有的高光并正式收播。不得再制造新事故、悬念或选择。'
  };
  const headlineDuties = {
    1: '官方重点特别企划开场：明确本期由官方重点推广，介绍成套环节、规则和担当偶像此前积累的代表性成果。不要提前制造核心事故。',
    2: '重点企划连续执行：推进多个相互承接的准备环节，让成熟公众印象在更大观众规模下接受验证。不要提前制造核心事故。',
    3: '形象压力事故：只设置一个会冲击既有公众印象、且必须由制作人判断方向的问题，并给出恰好三个处理方案；在等待选择处停下。',
    4: '重点企划正式收尾：严格执行制作人指示，把压力转化为能代表本轮成果的直播高光并正式收播。不得再制造新事故、悬念或选择。'
  };
  const duties = businessLevel >= 3 ? headlineDuties : businessLevel >= 2 ? specialDuties : baseDuties;
  const idol = String(context?.idol || '').trim();
  const visualTags = LIVE_VISUAL_TAGS_BY_IDOL[idol] || null;
  const defaultVisualTag = LIVE_DEFAULT_VISUAL_TAG_BY_IDOL[idol] || '';
  const visualCueRules = visualTags ? [
    `${idol}的立绘支持功能标签。她在 dialogue 或 action beat 中出场时，beats[].speaker 必须写成“${idol}(功能词)”；纯 narration beat 的 speaker 留空。`,
    '只允许使用以下功能词：' + visualTags.join('、') + '。根据当前台词与动作选择，不要随机切换，也不要自造近义词。',
    `示例：${idol}(${LIVE_EXAMPLE_VISUAL_TAG_BY_IDOL[idol]})。括号中的功能词只控制立绘，不属于角色姓名或台词。`
  ] : [];
  const shape = {
    schemaVersion: 1,
    businessId: String(context?.businessId || runtime.businessId || ''),
    segmentIndex: index,
    topic: '本段直播话题',
    beats: [{ id: 'beat-1', type: 'dialogue', speaker: visualTags ? `${idol}(${defaultVisualTag})` : (idol || '偶像'), text: '直播内容', delayMs: 500 }],
    comments: [{ id: 'comment-1', text: '观众评论', tone: 'positive', triggerAfterBeatId: 'beat-1', delayMs: 300 }],
    audienceTrend: 'up',
    heatTrend: 'up',
    pressureTrend: 'flat',
    continuitySummary: '供下一段承接的已发生事实'
  };
  if (index === 3) Object.assign(shape, { incident: '现场发生的单一问题', options: ['方案一', '方案二', '方案三'] });
  if (index === 4) Object.assign(shape, {
    resolution: '制作人指示造成的具体结果', imageMatch: 'partial', bonusTier: 'small',
    bonusReason: '基于本场具体事实的判断', closingSummary: '观众最终形成的公开印象'
  });
  return [
    '[HATSU_OUTPUT_MODE:NIA_ONLINE_LIVE]',
    '你正在为《学园偶像大师》N.I.A篇生成同一场 online_live（网络直播）的第 ' + index + ' 段。',
    businessLevel >= 3
      ? '本场是 Lv3 官方重点特别企划直播：官方推广带来更大观众规模，必须用成套环节检验此前形成的公众印象与代表性成果，不得退化成普通闲聊或一般特别回。'
      : businessLevel >= 2 ? '本场是 Lv2 特别企划直播：必须围绕企划规则、准备内容和既有成果展开，不得退化成普通闲聊直播。' : '本场是 Lv1 基础主题直播。',
    duties[index],
    '直播企划上下文：', contextJson(context),
    '此前连续事实：' + JSON.stringify(runtime.continuity || []),
    index === 4 ? '制作人的现场指示：' + boundedText(runtime.producerInstruction, 1200) : '',
    '每个 beat 必须是可直接播放的具体动作、台词或叙述；comments 必须像正在观看直播的短评论。',
    ...visualCueRules,
    '趋势只作定性判断，禁止直接生成粉丝数、观看数、热度值或压力数值。',
    index === 4 ? '第 4 段的闭幕评价字段必须严格使用以下枚举：imageMatch 只能为 "off"、"partial"、"strong"；bonusTier 只能为 "none"、"small"、"medium"、"large"。不得自造或翻译枚举值；不要输出 "match"，应输出 "strong"；不要输出 "middle"，应输出 "medium"。' : '',
    '只输出最后这一块，不要 Markdown，不要解释：',
    '<NIA_LIVE_SEGMENT>', JSON.stringify(shape), '</NIA_LIVE_SEGMENT>'
  ].filter(Boolean).join('\n');
}

export function parseNiaLiveSegmentPayload(payload, expected = {}) {
  const candidates = typeof payload === 'string'
    ? [payload]
    : [payload?.rawText, payload?.text, payload?.renderedText].filter((value) => value != null);
  let parsed = { ok: false, reason: 'missing_nia_live_segment' };
  for (const candidate of candidates) {
    parsed = lastTaggedJson(candidate, 'NIA_LIVE_SEGMENT');
    if (parsed.ok) break;
  }
  if (!parsed.ok) return parsed;
  const source = parsed.data || {};
  const pressureTrend = source.pressureTrend === 'down' ? 'relief' : source.pressureTrend;
  const imageMatch = source.imageMatch === 'perfect' ? 'strong' : source.imageMatch;
  const businessId = boundedText(source.businessId, 160);
  const segmentIndex = clampInteger(source.segmentIndex, 1, 4);
  if (businessId !== boundedText(expected.businessId, 160)) return { ok: false, reason: 'business_id_mismatch' };
  if (segmentIndex !== clampInteger(expected.segmentIndex, 1, 4)) return { ok: false, reason: 'segment_index_mismatch' };
  const data = {
    schemaVersion: 1,
    businessId,
    segmentIndex,
    topic: boundedText(source.topic, 180),
    beats: normalizeLiveBeats(source.beats),
    comments: normalizeLiveComments(source.comments),
    audienceTrend: enumValue(source.audienceTrend, ['down', 'flat', 'up', 'surge'], 'flat'),
    heatTrend: enumValue(source.heatTrend, ['down', 'flat', 'up'], 'flat'),
    pressureTrend: enumValue(pressureTrend, ['relief', 'flat', 'up', 'spike'], 'flat'),
    continuitySummary: boundedText(source.continuitySummary, 600)
  };
  if (!data.topic || !data.beats.length || !data.continuitySummary) return { ok: false, reason: 'invalid_live_segment_contract' };
  if (segmentIndex === 3) {
    data.incident = boundedText(source.incident, 500);
    data.options = boundedStrings(source.options, 3, 260);
    if (!data.incident || data.options.length !== 3) return { ok: false, reason: 'invalid_incident_contract' };
  }
  if (segmentIndex === 4) {
    data.resolution = boundedText(source.resolution, 600);
    const normalizedImageMatch = { match: 'strong' }[String(imageMatch || '').trim().toLowerCase()] || imageMatch;
    const normalizedBonusTier = { middle: 'medium' }[String(source.bonusTier || '').trim().toLowerCase()] || source.bonusTier;
    data.imageMatch = enumValue(normalizedImageMatch, ['off', 'partial', 'strong'], '');
    data.bonusTier = enumValue(normalizedBonusTier, ['none', 'small', 'medium', 'large'], '');
    data.bonusReason = boundedText(source.bonusReason, 500);
    data.closingSummary = boundedText(source.closingSummary, 500);
    if (!data.resolution || !data.imageMatch || !data.bonusTier || !data.bonusReason || !data.closingSummary) {
      return { ok: false, reason: 'invalid_closing_contract' };
    }
  }
  return { ok: true, data };
}

if (typeof globalThis !== 'undefined') {
  globalThis.HatsuNiaBusiness = Object.freeze({
    buildNiaBusinessOpeningPrompt,
    buildNiaBusinessResolutionPrompt,
    parseNiaBusinessOpening,
    parseNiaBusinessResolution,
    normalizeNiaBusinessResult,
    buildNiaLiveSegmentPrompt,
    parseNiaLiveSegmentPayload
  });
}

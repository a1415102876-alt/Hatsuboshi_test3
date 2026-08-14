const object = (value) => value && typeof value === 'object' && !Array.isArray(value) ? value : {};
const text = (value, limit = 1200) => String(value ?? '').trim().slice(0, limit);
const BONUS_TIERS = new Set(['none', 'small', 'medium', 'large']);

function lastTaggedJson(value, tag) {
  const source = String(value || '').replace(/&lt;/gi, '<').replace(/&gt;/gi, '>').replace(/&amp;/gi, '&');
  const opens = [...source.matchAll(new RegExp('<' + tag + '\\b[^>]*>', 'gi'))];
  const closes = [...source.matchAll(new RegExp('<\\/' + tag + '\\s*>', 'gi'))];
  for (let closeIndex = closes.length - 1; closeIndex >= 0; closeIndex -= 1) {
    const close = closes[closeIndex];
    for (let openIndex = opens.length - 1; openIndex >= 0; openIndex -= 1) {
      const open = opens[openIndex];
      if (open.index > close.index) continue;
      try { return { ok: true, data: JSON.parse(source.slice(open.index + open[0].length, close.index).trim()) }; }
      catch { return { ok: false, reason: 'invalid_json' }; }
    }
  }
  return { ok: false, reason: 'missing_nia_mini_live' };
}

function candidates(source) {
  return typeof source === 'string'
    ? [source]
    : [source?.rawText, source?.text, source?.renderedText].filter((item) => item != null);
}

export function buildNiaMiniLivePrompt(context = {}, runtime = {}) {
  const venue = object(context.venue);
  const idol = text(context.idol, 80) || '担当偶像';
  const shape = {
    schemaVersion: 1,
    businessId: text(context.businessId || runtime.businessId, 160),
    venueId: text(runtime.venueId || venue.id, 120),
    title: `${text(venue.name, 120)}迷你演出`,
    lines: [
      { id: 'line-1', type: 'narration', speaker: '', text: '开场与现场观众反应' },
      { id: 'line-2', type: 'dialogue', speaker: `${idol}(功能词)`, text: '偶像台词' }
    ],
    highlight: '本场最有记忆点的瞬间',
    audienceResponse: '现场观众的具体反馈',
    impressionChange: '本场形成或强化的公众印象',
    bonusTier: 'medium',
    bonusReason: '表现档位的具体依据',
    resultSummary: '整场迷你演出的事实摘要'
  };
  return [
    '[HATSU_OUTPUT_MODE:NIA_MINI_LIVE]',
    '生成一场完整的 N.I.A 迷你演出，只输出最后一个完整的 <NIA_MINI_LIVE> JSON 标签块。',
    '这是一轮单次生成：从开场、短演出、现场反馈到收尾全部写完，不要停下来等待制作人指示，也不要拆成多段请求。',
    'businessId、venueId、场地、观众构成、当日日程和本轮企划均由前端冻结，不得修改。禁止输出具体粉丝数。',
    'lines 必须为 6 至 12 条，只能使用 narration 或 dialogue。dialogue 必须填写 speaker；narration 的 speaker 为空字符串。',
    '现场需要出现一个轻量的小意外、临时互动或路人反馈，并由偶像自然完成演出；不得提前宣告后续试镜结果。',
    `${idol}说话时，speaker 必须使用“${idol}(功能词)”格式；其他角色遵守各自世界书中的立绘情绪标记规则，不在本提示词中另作限制。`,
    'bonusTier 只能是 none、small、medium、large。结果摘要必须以实际生成的演出内容为依据。',
    `场地：${text(venue.name, 120)}。观众：${text(venue.audience, 300)}。现场挑战：${text(venue.challenge, 300)}。`,
    '权威上下文：', JSON.stringify(context, null, 2),
    '<NIA_MINI_LIVE>', JSON.stringify(shape), '</NIA_MINI_LIVE>'
  ].join('\n');
}

export function parseNiaMiniLivePayload(source, expected = {}) {
  let parsed = { ok: false, reason: 'missing_nia_mini_live' };
  for (const candidate of candidates(source)) {
    parsed = lastTaggedJson(candidate, 'NIA_MINI_LIVE');
    if (parsed.ok) break;
  }
  if (!parsed.ok) return parsed;
  const raw = object(parsed.data);
  const businessId = text(raw.businessId || raw.business_id, 160);
  const venueId = text(raw.venueId || raw.venue_id, 120);
  if (businessId !== text(expected.businessId, 160)) return { ok: false, reason: 'business_id_mismatch' };
  if (venueId !== text(expected.venueId, 120)) return { ok: false, reason: 'venue_id_mismatch' };
  const lines = Array.isArray(raw.lines) ? raw.lines.slice(0, 12).map((value, index) => {
    const line = object(value);
    const type = line.type === 'dialogue' ? 'dialogue' : line.type === 'narration' ? 'narration' : '';
    return {
      id: text(line.id, 120) || `line-${index + 1}`,
      type,
      speaker: type === 'dialogue' ? text(line.speaker, 160) : '',
      text: text(line.text, 1200)
    };
  }) : [];
  if (lines.length < 6 || lines.some((line) => !line.type || !line.text || (line.type === 'dialogue' && !line.speaker))) {
    return { ok: false, reason: 'invalid_lines_contract' };
  }
  const aliasTier = text(raw.bonusTier || raw.bonus_tier, 40) === 'middle' ? 'medium' : text(raw.bonusTier || raw.bonus_tier, 40);
  if (!BONUS_TIERS.has(aliasTier)) return { ok: false, reason: 'invalid_bonus_tier' };
  const required = {
    highlight: text(raw.highlight, 600),
    audienceResponse: text(raw.audienceResponse || raw.audience_response, 600),
    impressionChange: text(raw.impressionChange || raw.impression_change, 600),
    bonusReason: text(raw.bonusReason || raw.bonus_reason, 600),
    resultSummary: text(raw.resultSummary || raw.result_summary || raw.summary, 1000)
  };
  if (Object.values(required).some((value) => !value)) return { ok: false, reason: 'invalid_result_contract' };
  return {
    ok: true,
    data: {
      schemaVersion: 1,
      businessId,
      venueId,
      title: text(raw.title, 200),
      lines,
      bonusTier: aliasTier,
      ...required
    }
  };
}

if (typeof globalThis !== 'undefined') {
  globalThis.HatsuNiaMiniLiveApi = Object.freeze({ buildNiaMiniLivePrompt, parseNiaMiniLivePayload });
}

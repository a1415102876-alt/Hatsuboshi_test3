const object = (value) => value && typeof value === 'object' && !Array.isArray(value) ? value : {};
const text = (value, limit = 1000) => String(value ?? '').trim().slice(0, limit);
const MODES = ['ai_expand', 'manual'];
const COMMENT_TONES = ['positive', 'neutral', 'concerned', 'excited', 'negative'];
const IMAGE_MATCHES = ['off', 'partial', 'strong'];
const BONUS_TIERS = ['none', 'small', 'medium', 'large'];
const COMMENT_AUTHORS = ['匿名观众', '花海佑芽', '月村手毬', '紫云清夏', '篠泽广', '葛城莉莉娅', '真诚优'];

function contextJson(value) {
  return JSON.stringify(value || {}, null, 2);
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

function lastTaggedJson(value, tag) {
  const bodies = taggedJsonBodies(value, tag);
  if (!bodies.length) return { ok: false, reason: 'missing_' + tag.toLowerCase() };
  try { return { ok: true, data: JSON.parse(bodies[0].trim()) }; }
  catch { return { ok: false, reason: 'invalid_json' }; }
}

function candidates(source) {
  return typeof source === 'string'
    ? [source]
    : [source?.rawText, source?.text, source?.renderedText].filter((item) => item != null);
}

function parseTagged(source, tag, missingReason) {
  let parsed = { ok: false, reason: missingReason };
  for (const value of candidates(source)) {
    parsed = lastTaggedJson(value, tag);
    if (parsed.ok) return parsed;
  }
  return parsed;
}

function normalizeComments(value) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 6).map((item, index) => {
    const comment = object(item);
    return {
      id: text(comment.id, 120) || `comment-${index + 1}`,
      author: text(comment.author, 120) || '匿名观众',
      text: text(comment.text, 800),
      tone: text(comment.tone, 40)
    };
  });
}

export function buildSnsPostPrompt(context = {}, runtime = {}) {
  const draft = object(runtime.draft);
  const mode = MODES.includes(draft.mode) ? draft.mode : 'ai_expand';
  const shape = {
    schemaVersion: 1,
    businessId: text(context.businessId || runtime.businessId, 160),
    imageId: text(draft.imageId || context.imagePreset?.imageId, 120),
    postText: '完整公开帖子正文',
    comments: [
      { id: 'comment-1', text: '观众评论', tone: 'positive' },
      { id: 'comment-2', text: '观众评论', tone: 'neutral' },
      { id: 'comment-3', text: '观众评论', tone: 'excited' }
    ]
  };
  return [
    '[HATSU_OUTPUT_MODE:NIA_SNS_POST]',
    '为初星圈单帖营业生成发布结果，只输出最后一个完整的 <NIA_SNS_POST> JSON 标签块。',
    '营业身份、预设配图和玩家输入由前端固定，businessId 与 imageId 必须原样返回。',
    `创作模式：${mode}。ai_expand 模式根据短主题补全完整正文；manual 模式必须逐字原样返回玩家正文，不得润色、删改或翻译。 manual mode must return player text unchanged.`,
    mode === 'manual' ? `玩家正文（必须原样）：${text(draft.manualText, 2000)}` : `玩家短主题：${text(draft.topic, 240)}`,
    '评论必须返回 3 至 6 条（3 to 6 comments），每条有稳定 id、text 和 tone；tone 只能是 positive、neutral、concerned、excited、negative。禁止输出粉丝数、浏览量、点赞数或热度数值。',
    '当前上下文：', contextJson(context),
    `comment author must be one of: ${COMMENT_AUTHORS.join(', ')}; include author for every comment.`,
    '<NIA_SNS_POST>', JSON.stringify(shape), '</NIA_SNS_POST>'
  ].join('\n');
}

export function parseSnsPostPayload(source, expected = {}) {
  const parsed = parseTagged(source, 'NIA_SNS_POST', 'missing_nia_sns_post');
  if (!parsed.ok) return parsed;
  const raw = object(parsed.data);
  const businessId = text(raw.businessId || raw.business_id, 160);
  if (businessId !== text(expected.businessId, 160)) return { ok: false, reason: 'business_id_mismatch' };
  const imageId = text(raw.imageId || raw.image_id, 120);
  if (!imageId || (expected.imageId && imageId !== text(expected.imageId, 120))) return { ok: false, reason: 'image_id_mismatch' };
  const comments = normalizeComments(raw.comments);
  if (comments.length < 3 || comments.length > 6 || comments.some((item) => !item.text || !COMMENT_TONES.includes(item.tone))) {
    return { ok: false, reason: 'invalid_comments_contract' };
  }
  const mode = MODES.includes(expected.mode) ? expected.mode : text(raw.mode, 20);
  if (!MODES.includes(mode)) return { ok: false, reason: 'invalid_mode' };
  const generatedText = text(raw.postText || raw.post_text, 2000);
  if (!generatedText) return { ok: false, reason: 'post_text_missing' };
  const postText = mode === 'manual' ? text(expected.manualText, 2000) : generatedText;
  if (!postText) return { ok: false, reason: 'manual_text_missing' };
  return { ok: true, data: { schemaVersion: 1, businessId, imageId, mode, postText, comments } };
}

export function buildSnsPostResultPrompt(context = {}, runtime = {}) {
  const shape = {
    schemaVersion: 1,
    businessId: text(context.businessId || runtime.businessId, 160),
    resultSummary: '本次帖子传播的事实摘要',
    publicImage: '本次形成的公众印象',
    imageMatch: 'partial',
    bonusTier: 'small',
    bonusReason: '引用帖子正文、配图和互动的具体依据'
  };
  return [
    '[HATSU_OUTPUT_MODE:NIA_SNS_POST_RESULT]',
    '根据已发布的初星圈帖子与一次互动，生成确定性的传播结算，只输出最后一个完整的 <NIA_SNS_POST_RESULT> JSON 标签块。',
    '不得重写帖子、伪造粉丝数/浏览量/点赞数或新增互动。',
    'imageMatch 只能使用 off、partial、strong；bonusTier 只能使用 none、small、medium、large。遇到不确定情况也必须从上述枚举中选择，不得使用 match、middle 等别名。',
    '帖子与互动上下文：', contextJson({ context, runtime }),
    '<NIA_SNS_POST_RESULT>', JSON.stringify(shape), '</NIA_SNS_POST_RESULT>'
  ].join('\n');
}

export function parseSnsPostResultPayload(source, expected = {}) {
  const parsed = parseTagged(source, 'NIA_SNS_POST_RESULT', 'missing_nia_sns_post_result');
  if (!parsed.ok) return parsed;
  const raw = object(parsed.data);
  const businessId = text(raw.businessId || raw.business_id, 160);
  if (businessId !== text(expected.businessId, 160)) return { ok: false, reason: 'business_id_mismatch' };
  const imageMatch = text(raw.imageMatch || raw.image_match, 40);
  const bonusTier = text(raw.bonusTier || raw.bonus_tier, 40);
  const resultSummary = text(raw.resultSummary || raw.result_summary || raw.summary, 1000);
  const publicImage = text(raw.publicImage || raw.public_image || raw.impression, 600);
  const bonusReason = text(raw.bonusReason || raw.bonus_reason, 600);
  if (!IMAGE_MATCHES.includes(imageMatch) || !BONUS_TIERS.includes(bonusTier) || !resultSummary || !publicImage || !bonusReason) {
    return { ok: false, reason: 'invalid_result_contract' };
  }
  return { ok: true, data: { schemaVersion: 1, businessId, resultSummary, publicImage, imageMatch, bonusTier, bonusReason } };
}

if (typeof globalThis !== 'undefined') {
  globalThis.HatsuNiaSnsBusinessApi = Object.freeze({
    buildSnsPostPrompt,
    parseSnsPostPayload,
    buildSnsPostResultPrompt,
    parseSnsPostResultPayload
  });
}

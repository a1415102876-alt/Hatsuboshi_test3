const clean = (value, limit = 800) => String(value == null ? "" : value).trim().slice(0, limit);
const TV_VISUAL_TAGS_BY_IDOL = Object.freeze({
  "花海咲季": ["自信说明", "冷静思考", "被夸陶醉", "被夸慌张", "恳切请求", "正面挑战", "激动强调", "不服审视", "真诚表态", "沮丧低落", "平常待机", "意外动摇", "慌张解释", "震惊失语", "振奋宣言", "得意大笑", "温柔喜悦", "凑近追问"],
  "藤田琴音": ["俏皮推销", "委屈求饶", "黑脸无语", "精明盘算", "意外发愣", "平常待机", "认真审视", "诚恳请求", "害羞躲闪", "灿烂欢呼", "得意吐槽", "振奋宣言", "沮丧低落", "真诚表态", "委屈忍耐", "含泪抗议", "生气抗议", "温柔喜悦"],
  "花海佑芽": ["真诚说明", "惊讶解释", "羞涩待机", "轻微不满", "尴尬困惑", "温柔好奇", "俏皮提问", "恳切请求", "自信站姿", "严肃追问", "振奋宣言", "认真思考", "温柔喜悦", "开朗挥手", "害羞微笑", "不安询问", "羞恼抗议", "沮丧低落", "慌张不安", "得意欢呼", "凑近问候", "温暖问候", "倾慕陶醉", "沉思怀疑"]
});
const TV_DEFAULT_VISUAL_TAG_BY_IDOL = Object.freeze({ "花海咲季": "平常待机", "藤田琴音": "平常待机", "花海佑芽": "羞涩待机" });
const tvTagBodies = (source) => {
  const text = String(source || "").replace(/&lt;/gi, "<").replace(/&gt;/gi, ">").replace(/&amp;/gi, "&");
  const open = [...text.matchAll(/<NIA_TV_PROGRAM\b[^>]*>/gi)]; const close = [...text.matchAll(/<\/NIA_TV_PROGRAM\s*>/gi)]; const bodies = [];
  for (let i = close.length - 1, j = open.length - 1; i >= 0 && j >= 0; i -= 1) { while (j >= 0 && open[j].index > close[i].index) j -= 1; if (j < 0) break; bodies.push(text.slice(open[j].index + open[j][0].length, close[i].index)); j -= 1; }
  return bodies;
};

export function buildNiaTvSegmentPrompt(context = {}, runtime = {}) {
  const index = Math.max(1, Math.min(4, Math.floor(Number(runtime.pendingSegmentIndex) || 1)));
  const businessLevel = Math.max(1, Math.min(3, Math.floor(Number(context.businessLevel) || 1)));
  const baseDuties = {
    1: "完成节目开场、主持人介绍和本期主题建立。",
    2: "完成节目的核心环节，体现当前表现策略。",
    3: "制造并处理一个临时节目变化，必须停在等待制作人指示。",
    4: "严格执行制作人指示，完成节目高潮和收尾，不要追加新问题。"
  };
  const premiumDuties = {
    1: "完成大型正式电视节目的开场，由专业主持人与节目组建立本期定位、全国性受众和严格镜头要求。",
    2: "完成大型节目的核心挑战或深度访谈，让担当偶像在更严格的摄影调度与节目任务中执行当前表现策略。",
    3: "由节目组临时追加一项合理要求或改变流程，形成现场压力，并停在等待制作人指示；不得制造危险事故。",
    4: "严格执行制作人指示，把临时要求转化为适合大众传播的节目名场面，完成正式高潮与收尾，不要追加新问题。"
  };
  const flagshipDuties = {
    1: "完成旗舰时段重点特辑的开场，建立专业主持阵容、成熟制作团队、广泛大众受众和明确的节目议题。",
    2: "推进旗舰节目的核心挑战或深度访谈，让担当偶像在高密度镜头、严格流程和公众审视下证明本轮形成的代表性魅力。",
    3: "由节目组临时追加一个会考验既有公众形象的合理追问或流程调整，并停在等待制作人指示；不得制造危险事故。",
    4: "严格执行制作人指示，让偶像在更尖锐的节目框架中守住自身立场并形成可广泛传播的名场面，完成正式收尾。"
  };
  const duties = businessLevel >= 3 ? flagshipDuties : businessLevel >= 2 ? premiumDuties : baseDuties;
  const idol = clean(context.idol, 80);
  const visualTags = TV_VISUAL_TAGS_BY_IDOL[idol] || null;
  const defaultVisualTag = TV_DEFAULT_VISUAL_TAG_BY_IDOL[idol] || "";
  const visualRule = visualTags
    ? `${idol}发言时，lines[].speaker 必须写成“${idol}(功能词)”，功能词只允许使用：${visualTags.join("、")}。主持人使用原名，旁白 speaker 留空。括号功能词只控制立绘。`
    : "角色发言使用准确姓名，旁白 speaker 留空。";
  const shape = { schemaVersion: 1, businessId: clean(context.businessId || runtime.businessId, 160), segmentIndex: index, status: index === 3 ? "awaiting_producer" : index === 4 ? "ended" : "continue", lines: [{ type: "dialogue", speaker: visualTags ? `${idol}(${defaultVisualTag})` : clean(context.host || "主持人", 80), text: "本段可直接播放的台词。" }], continuitySummary: "供下一段承接的事实摘要。" };
  if (index === 3) Object.assign(shape, { incident: "临时变化", problem: "需要制作人判断的节目状况", options: ["正面回应", "顺势制造节目效果", "保护偶像形象"] });
  if (index === 4) Object.assign(shape, { highlight: "本期节目高光", audienceResponse: "观众反应", impressionChange: "公众印象变化", followupHook: "后续节目钩子", resultSummary: "节目结果摘要", bonusTier: "medium" });
  const levelRule = businessLevel >= 3
    ? "本场是 Lv3 旗舰时段重点特辑：必须体现成熟制作团队、广泛大众审视、更尖锐的节目框架和担当偶像已经形成的公众形象，不得退化成一般访谈。"
    : businessLevel >= 2 ? "本场是 Lv2 大型正式电视节目：必须体现专业主持人、节目组、摄影调度、更广受众和更高规格，不得写成校园广播或简单聊天。" : "本场是 Lv1 基础电视节目。";
  return `[HATSU_OUTPUT_MODE:NIA_TV_PROGRAM]\n你正在生成电视节目营业第 ${index} 段。\n${levelRule}\n${duties[index]}\n${visualRule}\n固定节目上下文：${JSON.stringify(context)}\n制作人指示：${clean(runtime.producerInstruction, 1200)}\n只输出最后一个完整 JSON 标签块，不要 Markdown、思考文本或解释。\n<NIA_TV_PROGRAM>\n${JSON.stringify(shape)}\n</NIA_TV_PROGRAM>`;
}

export function parseNiaTvSegmentPayload(source, expected = {}) {
  for (const body of tvTagBodies(typeof source === "string" ? source : source?.rawText || source?.text || "")) {
    try {
      const raw = JSON.parse(body.trim()); const businessId = clean(raw.businessId, 160); const segmentIndex = Math.floor(Number(raw.segmentIndex));
      if (businessId !== clean(expected.businessId, 160)) return { ok: false, reason: "business_id_mismatch" };
      if (segmentIndex !== Math.floor(Number(expected.segmentIndex))) return { ok: false, reason: "segment_index_mismatch" };
      if (!Array.isArray(raw.lines) || !raw.lines.some((line) => clean(line?.text))) return { ok: false, reason: "invalid_tv_segment_contract" };
      if (segmentIndex === 3 && (raw.status !== "awaiting_producer" || !clean(raw.problem) || !Array.isArray(raw.options) || raw.options.length !== 3)) return { ok: false, reason: "invalid_tv_incident_contract" };
      if (segmentIndex === 4 && (raw.status !== "ended" || !clean(raw.highlight) || !clean(raw.resultSummary))) return { ok: false, reason: "invalid_tv_closing_contract" };
      return { ok: true, data: raw };
    } catch { /* Try the next, older complete tag. */ }
  }
  return { ok: false, reason: "missing_nia_tv_program" };
}

if (typeof globalThis !== "undefined") globalThis.HatsuNiaTvApi = Object.freeze({ buildNiaTvSegmentPrompt, parseNiaTvSegmentPayload });

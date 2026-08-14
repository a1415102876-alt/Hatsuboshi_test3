(function (global) {
  "use strict";

  const SIDE_QUEST_TAGS = ["stamina", "syngup", "diet", "stage", "general"];
  const DAILY_BLOCK_RE = /【初星支线开始】([\s\S]*?)【初星支线结束】/i;
  const TIER_BLOCK_RE = /【初星档位开始】([\s\S]*?)【初星档位结束】/i;

  function buildSideQuestDailyPrompt(state, dayKey) {
    const idol = state?.idol || "担当偶像";
    const fame = Number(state?.tasks?.wallet?.fame) || 0;
    const fameBlock = global.HatsuSideQuestPool?.buildFameTierPromptBlock?.(fame)
      || `当前知名度：${fame}`;
    const forbidden = global.HatsuSideQuestPool?.SIDE_QUEST_FORBIDDEN_RULES
      || "不要写校园内训练、课表或私人加练。";
    const dayLabel = state?.launchMode === "sandbox"
      ? `学园第 ${dayKey} 天`
      : `Live后第 ${dayKey} 天`;
    return `[初星育成系统 · 次 API · 委托系统生成]

你是初星学园沙盒模式的委托系统编排器。为制作人担当登记今日 3 条「对外商业委托」摘要（小型商演、宣传活动、媒体露出、品牌站台等）。

担当偶像：${idol}
当前日期：${dayLabel}
${fameBlock}

委托必须是外部主办方正式邀约的商业活动，用来提高偶像知名度；不是制作人私下安排的培育作业。

${forbidden}

要求：
- 共 3 条，每条包含 title（8～18 字）、desc（20～60 字情境）、tag（见下列）
- 每条 desc 必须写清主办方/场地与对外演出内容（如商场、电台、品牌、节目组、活动执行方）
- 每条可附 locationId，优先从 shopping_street / shopping_mall / local_radio / tv_station / event_hall / music_festival / photo_studio / brand_store 中选择
- tag 只能从以下取值：stamina（体能）、syngup（歌唱）、diet（饮食）、stage（舞台）、general（商演）
- 三条 tag 尽量不同；不要重复同一活动类型
- 委托档次须匹配当前知名度档位，不要越级写到国民级综艺或降级写成校园自习
- 不要写金钱、知名度、Vo/Da/Vi 等具体数值；奖励由前端结算
- 不要写选项或剧情正文，只写委托标题与情境

输出格式（严格遵守）：
【初星支线开始】
{"quests":[{"title":"标题","desc":"描述","tag":"stage","locationId":"shopping_mall"},{"title":"...","desc":"...","tag":"syngup","locationId":"local_radio"},{"title":"...","desc":"...","tag":"general","locationId":"shopping_street"}]}
【初星支线结束】`;
  }

  function buildSideQuestTierPrompt(state, slot) {
    const idol = state?.idol || "担当偶像";
    const fame = Number(state?.tasks?.wallet?.fame) || 0;
    const tierLabel = global.HatsuSideQuestPool?.getSideQuestFameTier?.(fame)?.label || "商演委托";
    const title = String(slot?.title || "今日委托");
    const desc = String(slot?.desc || "");
    const tag = String(slot?.tag || "general");
    return `[初星育成系统 · 次 API · 委托表现档位文案]

担当偶像：${idol}
当前知名度档位：${tierLabel}
今日商业委托：${title}
委托说明：${desc}
委托类型 tag：${tag}

请为制作人自选结算档位生成各一句简短回味文案（第一人称或旁白均可，12～28 字），围绕对外商演/宣传现场表现。
四档含义：
- fail：失败，场面难堪但有安慰奖
- pass_low：勉强过关
- pass：标准完成
- perfect：超常发挥

不要写具体数值或「+10 信赖」等系统用语。

输出格式（严格遵守）：
【初星档位开始】
{"fail":"...","pass_low":"...","pass":"...","perfect":"..."}
【初星档位结束】`;
  }

  function normalizeTag(raw) {
    const tag = String(raw || "").trim().toLowerCase();
    return SIDE_QUEST_TAGS.includes(tag) ? tag : "general";
  }

  function parseJsonObject(text) {
    const source = String(text || "").trim();
    if (!source) return null;
    try {
      return JSON.parse(source);
    } catch {
      const start = source.indexOf("{");
      const end = source.lastIndexOf("}");
      if (start < 0 || end <= start) return null;
      try {
        return JSON.parse(source.slice(start, end + 1));
      } catch {
        return null;
      }
    }
  }

  function parseSideQuestDailyResponse(text, dayKey, idol) {
    const source = String(text || "");
    const blockMatch = source.match(DAILY_BLOCK_RE);
    const payload = parseJsonObject(blockMatch ? blockMatch[1] : source);
    if (!payload || !Array.isArray(payload.quests)) return null;
    const quests = payload.quests
      .map((quest, index) => {
        const title = String(quest?.title || "").trim();
        const desc = String(quest?.desc || "").trim();
        if (!title || !desc) return null;
        const location = global.HatsuSideQuestPool?.inferSideQuestLocation?.({
          title,
          desc,
          locationId: quest?.locationId
        }, 0) || {};
        return {
          slotIndex: index,
          poolId: `gen_${dayKey}_${index}_${hashSlug(title)}`,
          title: title.slice(0, 40),
          desc: desc.slice(0, 160),
          tag: normalizeTag(quest?.tag),
          locationId: location.locationId || "",
          locationName: location.locationName || "",
          status: "open",
          resultTier: null,
          source: "secondary"
        };
      })
      .filter(Boolean);
    // 容错：接受任意条数，不足部分由 HatsuTasks.applyGeneratedSideQuests 用静态池补齐。
    if (!quests.length) return null;
    return { quests, dayKey, idol: idol || "" };
  }

  function parseSideQuestTierResponse(text) {
    const source = String(text || "");
    const blockMatch = source.match(TIER_BLOCK_RE);
    const payload = parseJsonObject(blockMatch ? blockMatch[1] : source);
    if (!payload || typeof payload !== "object") return null;
    const hints = {
      fail: String(payload.fail || "").trim(),
      pass_low: String(payload.pass_low || "").trim(),
      pass: String(payload.pass || "").trim(),
      perfect: String(payload.perfect || "").trim()
    };
    if (!hints.fail || !hints.pass_low || !hints.pass || !hints.perfect) return null;
    return hints;
  }

  function hashSlug(text) {
    let h = 0;
    const source = String(text || "");
    for (let i = 0; i < source.length; i++) {
      h = (h * 31 + source.charCodeAt(i)) | 0;
    }
    return Math.abs(h).toString(36).slice(0, 8);
  }

  function isSecondaryRequestId(requestId) {
    return String(requestId || "").startsWith("side-gen-");
  }

  function parseSecondaryRequestKind(requestId) {
    const parts = String(requestId || "").split("-");
    if (parts.length < 3 || parts[0] !== "side" || parts[1] !== "gen") return "";
    return parts[2] || "";
  }

  global.HatsuSideQuestApi = {
    SIDE_QUEST_TAGS,
    buildSideQuestDailyPrompt,
    buildSideQuestTierPrompt,
    parseSideQuestDailyResponse,
    parseSideQuestTierResponse,
    isSecondaryRequestId,
    parseSecondaryRequestKind
  };
})(typeof globalThis !== "undefined" ? globalThis : window);

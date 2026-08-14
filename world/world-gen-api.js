(function (global) {
  "use strict";

  const DAILY_BLOCK_RE = /【初星日报开始】([\s\S]*?)【初星日报结束】/i;
  const SIDE_QUEST_TAGS = ["stamina", "syngup", "diet", "stage", "general"];
  const VALID_HEAT = new Set(["low", "normal", "high"]);
  const VALID_SCOPE = new Set(["campus", "net", "fanclub"]);
  const MIN_BUZZ = 2;
  const MAX_BUZZ = 4;
  const SIDE_SLOTS = 3;

  function defaultDailyGen() {
    return { dayKey: "", status: "idle", source: "", pendingRequestId: "" };
  }

  function ensureDailyGenShape(state) {
    const world = state?.freeMode?.world;
    if (!world) return defaultDailyGen();
    if (!world.dailyGen || typeof world.dailyGen !== "object") {
      world.dailyGen = defaultDailyGen();
    }
    world.dailyGen = {
      ...defaultDailyGen(),
      ...world.dailyGen,
      dayKey: String(world.dailyGen.dayKey || ""),
      status: String(world.dailyGen.status || "idle"),
      source: String(world.dailyGen.source || ""),
      pendingRequestId: String(world.dailyGen.pendingRequestId || "")
    };
    return world.dailyGen;
  }

  function shouldIncludeSideQuests(state) {
    return Boolean(
      global.HatsuTasks?.isSandboxTasksActive?.(state)
      && state.sandbox?.inviteComplete
      && state.tasks?.secondaryApi?.enabled
    );
  }

  function isDailyGenLoading(gen) {
    return gen?.status === "pending" || gen?.status === "loading";
  }

  function shouldDeferStaticWorldRoll(state, dayKey) {
    const gen = state?.freeMode?.world?.dailyGen;
    return Boolean(gen && gen.dayKey === dayKey && isDailyGenLoading(gen));
  }

  function buildSnsVoiceSummary(idolNames, helpers) {
    const profiles = global.HatsuWorld?.buzzPool?.SNS_PROFILES || {};
    const canonicalFn = helpers?.canonicalIdolName;
    const names = (idolNames || []).slice(0, 14);
    if (!names.length) return "（暂无角色口吻表）";
    return names.map((name) => {
      const idol = typeof canonicalFn === "function" ? canonicalFn(name) : name;
      const profile = profiles[idol];
      if (!profile) return `- ${idol}：普通学园生口吻`;
      return `- ${idol}：${profile.note || (profile.tones || []).join("、") || "学园偶像"}`;
    }).join("\n");
  }

  function buildDailyWorldPrompt(state, options, helpers) {
    const dayKey = String(options?.dayKey || helpers?.getDayKey?.(state) || "live+1");
    const dayLabel = String(options?.dayLabel || `学园第 ${state?.freeMode?.postLiveDay || 1} 天`);
    const idol = state?.idol || "担当偶像";
    const includeSideQuests = options?.includeSideQuests !== false && shouldIncludeSideQuests(state);
    const summary = global.HatsuWorld?.injection?.composeWorldSummary?.(state, { scope: "sns" }, helpers) || "";
    const snsVoices = buildSnsVoiceSummary(helpers?.idolNames || [], helpers);
    const fame = Number(state?.tasks?.wallet?.fame) || 0;
    const fameBlock = global.HatsuSideQuestPool?.buildFameTierPromptBlock?.(fame)
      || `当前知名度：${fame}`;
    const forbidden = global.HatsuSideQuestPool?.SIDE_QUEST_FORBIDDEN_RULES
      || "不要写校园内训练、课表或私人加练。";

    const sideQuestRules = includeSideQuests
      ? `
3) sideQuests：沙盒「今日商业委托」恰好 3 条（对外商演/宣传/媒体露出，不是私人训练）
   - ${fameBlock.replace(/\n/g, "\n   - ")}
   - title 8～18 字；desc 20～60 字，须写清主办方与对外演出内容
   - 可附 locationId，优先从 shopping_street / shopping_mall / local_radio / tv_station / event_hall / music_festival / photo_studio / brand_store 中选择
   - tag 仅 stamina / syngup / diet / stage / general，三条尽量不同
   - ${forbidden.replace(/\n/g, "\n   - ")}
   - 不写金钱、Vo/Da/Vi、信赖等数值`
      : "";

    const sideQuestJson = includeSideQuests
      ? `"sideQuests":[{"title":"标题","desc":"描述","tag":"stage","locationId":"shopping_mall"},{"title":"...","desc":"...","tag":"syngup","locationId":"local_radio"},{"title":"...","desc":"...","tag":"general","locationId":"shopping_street"}],`
      : "";

    return `[初星育成系统 · 次 API · 每日世界层批量生成]

你是初星学园公开舆论与广播策划器。根据下方学园概况，生成本日互相呼应的广播主题与初星圈 SNS 帖${includeSideQuests ? "，以及制作人担当的对外商业委托" : ""}。

担当偶像（制作人培育）：${idol}
当前日期：${dayLabel}（dayKey: ${dayKey}）

${summary}

SNS 角色口吻参考（发帖时请贴合）：
${snsVoices}

要求：
- 广播主题应能引发 SNS 讨论；至少 1 条 buzz 的 heat 为 high，作为今日热议
- 只写学园公开层；禁止制作人私密培育细节与非公开关系
- SNS 作者使用全名（如「花海咲季」）；匿名帖 author 用空字符串 ""
- heat 仅 low / normal / high；scope 仅 campus / net / fanclub
- 广播 guests 从在学园偶像中选 0～2 人（全名）；可不选
- 不要写 Vo/Da/Vi、金钱、信赖等系统数值
${sideQuestRules}

输出 JSON（严格遵守块标记，不要 markdown 代码围栏）：
【初星日报开始】
{
  "broadcast": {
    "title": "节目主题",
    "brief": "30～80字广播提纲",
    "categoryLabel": "如活动曲特辑",
    "guests": ["嘉宾全名"]
  },
  "buzz": [
    {"author":"全名或空","text":"帖文","heat":"normal","scope":"campus","broadcastHint":""}
  ],
  ${sideQuestJson}
  "notes": ""
}
【初星日报结束】

buzz 数组 ${MIN_BUZZ}～${MAX_BUZZ} 条；broadcastHint 可留空，或与广播主题相关。`;
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

  function resolveIdolName(name, idolNames, canonicalFn) {
    const raw = String(name || "").trim();
    if (!raw) return "";
    const canonical = typeof canonicalFn === "function" ? canonicalFn(raw) : raw;
    const match = (idolNames || []).find((id) => {
      const candidate = typeof canonicalFn === "function" ? canonicalFn(id) : id;
      return candidate === canonical;
    });
    return match ? (typeof canonicalFn === "function" ? canonicalFn(match) : match) : "";
  }

  function normalizeTag(raw) {
    const tag = String(raw || "").trim().toLowerCase();
    return SIDE_QUEST_TAGS.includes(tag) ? tag : "general";
  }

  function normalizeHeat(raw) {
    const heat = String(raw || "normal").trim().toLowerCase();
    return VALID_HEAT.has(heat) ? heat : "normal";
  }

  function normalizeScope(raw) {
    const scope = String(raw || "campus").trim().toLowerCase();
    return VALID_SCOPE.has(scope) ? scope : "campus";
  }

  function parseSideQuestItems(items, dayKey, idol) {
    if (!Array.isArray(items) || !items.length) return null;
    // 容错：接受任意条数；只保留 title/desc 齐全的条目，最多取前 SIDE_SLOTS 条，
    // 不足部分由 HatsuTasks.applyGeneratedSideQuests 用静态池补齐。
    const parsed = items.map((quest, index) => {
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
    }).filter(Boolean).slice(0, SIDE_SLOTS);
    return parsed.length ? parsed : null;
  }

  function parseDailyWorldResponse(text, options = {}) {
    const source = String(text || "");
    const blockMatch = source.match(DAILY_BLOCK_RE);
    const payload = parseJsonObject(blockMatch ? blockMatch[1] : source);
    if (!payload || typeof payload !== "object") return null;

    const broadcastRaw = payload.broadcast || {};
    const title = String(broadcastRaw.title || "").trim();
    const brief = String(broadcastRaw.brief || "").trim();
    if (!title || !brief) return null;

    const idolNames = options.idolNames || [];
    const canonicalFn = options.canonicalIdolName;
    const guests = (Array.isArray(broadcastRaw.guests) ? broadcastRaw.guests : [])
      .map((name) => resolveIdolName(name, idolNames, canonicalFn))
      .filter(Boolean)
      .slice(0, 2);

    const buzzRaw = Array.isArray(payload.buzz) ? payload.buzz : [];
    // 容错：不因条数超限整体判负；多于上限截断，只要保留到至少 1 条即可。
    const buzz = buzzRaw.map((item, index) => {
      const textBody = String(item?.text || "").trim();
      if (!textBody) return null;
      const author = resolveIdolName(item?.author, idolNames, canonicalFn);
      return {
        author,
        anonymous: !author,
        text: textBody.slice(0, 280),
        heat: normalizeHeat(item?.heat),
        scope: normalizeScope(item?.scope),
        broadcastHint: String(item?.broadcastHint || "").trim().slice(0, 80)
      };
    }).filter(Boolean).slice(0, MAX_BUZZ);

    if (!buzz.length) return null;

    let sideQuests = null;
    if (options.includeSideQuests) {
      // 容错：委托缺失/格式不符时不再整体判负，返回 null，由上层用静态池补齐委托，保留广播与 SNS。
      sideQuests = parseSideQuestItems(payload.sideQuests, options.dayKey || "day", options.idol || "");
    }

    return {
      broadcast: {
        title: title.slice(0, 80),
        brief: brief.slice(0, 200),
        categoryLabel: String(broadcastRaw.categoryLabel || "学园日常").trim().slice(0, 40) || "学园日常",
        guests
      },
      buzz,
      sideQuests
    };
  }

  function hashSlug(text) {
    let h = 0;
    const source = String(text || "");
    for (let i = 0; i < source.length; i++) {
      h = (h * 31 + source.charCodeAt(i)) | 0;
    }
    return Math.abs(h).toString(36).slice(0, 8);
  }

  function applyGeneratedBroadcast(state, plan, dayKey, helpers) {
    const world = state?.freeMode?.world;
    if (!world) return false;
    const eventsPool = global.HatsuWorld?.eventsPool;
    const castTrack = global.HatsuWorld?.castTrack;
    const host = eventsPool?.BROADCAST_HOST || "真诚优";
    const topicSlug = hashSlug(plan.title);

    const episodePlan = {
      host,
      topicId: `generated_${topicSlug}`,
      categoryId: "generated",
      categoryLabel: plan.categoryLabel || "学园日常",
      angleId: "",
      title: plan.title,
      brief: plan.brief,
      hooks: [],
      guests: plan.guests || [],
      meta: {}
    };

    episodePlan.outline = typeof eventsPool?.buildBroadcastOutline === "function"
      ? eventsPool.buildBroadcastOutline(episodePlan, state, castTrack)
      : [`主持：${host}`, `本期主题：${plan.title}`, `提纲：${plan.brief}`].join("\n");

    const episode = {
      id: `${dayKey}_${episodePlan.topicId}`,
      dateKey: dayKey,
      host: episodePlan.host,
      topicId: episodePlan.topicId,
      categoryId: episodePlan.categoryId,
      categoryLabel: episodePlan.categoryLabel,
      angleId: episodePlan.angleId,
      title: episodePlan.title,
      brief: episodePlan.brief,
      hooks: episodePlan.hooks,
      meta: episodePlan.meta,
      guests: episodePlan.guests,
      outline: episodePlan.outline,
      fullScript: "",
      scriptStatus: "idle",
      heard: false,
      source: "secondary",
      createdAt: Date.now()
    };

    if (world.broadcast?.today && world.broadcast.today.dateKey !== dayKey) {
      world.broadcast.history = [world.broadcast.today, ...(world.broadcast.history || [])].slice(0, 14);
    }
    if (!world.broadcast) {
      world.broadcast = { today: null, history: [], pendingRequestId: "", autoFullScript: true };
    }
    world.broadcast.today = episode;
    return true;
  }

  function applyGeneratedBuzz(state, items, dayKey) {
    const world = state?.freeMode?.world;
    if (!world) return false;
    const buildBuzzPost = global.HatsuWorld?.buzzPool?.buildBuzzPost;
    const fakeTimeLabel = global.HatsuWorld?.buzzPool?.fakeTimeLabel;
    if (typeof buildBuzzPost !== "function") return false;

    const posts = items.map((item, index) => buildBuzzPost({
      id: `${dayKey}_gen_${index}`,
      dayKey,
      author: item.author || "",
      anonymous: Boolean(item.anonymous),
      text: item.text,
      category: "daily",
      scope: item.scope || "campus",
      heat: item.heat || "normal",
      flags: item.heat === "high" ? ["misread_risk"] : [],
      source: "secondary",
      comments: item.heat === "high" ? 24 + (index * 7) : 6 + index,
      reposts: item.heat === "high" ? 8 + index : 2,
      timeLabel: typeof fakeTimeLabel === "function" ? fakeTimeLabel(index) : "刚刚",
      broadcastHint: item.broadcastHint || ""
    }));

    const older = (world.buzz?.items || []).filter((entry) => entry.dayKey !== dayKey);
    if (!world.buzz) world.buzz = { items: [], buzzDayKey: "", hotTopic: "" };
    world.buzz.items = [...posts, ...older].slice(0, 40);
    world.buzz.buzzDayKey = dayKey;
    world.buzz.hotTopic = posts.find((entry) => entry.heat === "high")?.text
      || posts[0]?.text
      || "";
    return true;
  }

  function applyDailyWorldGeneration(state, parsed, helpers, dayKey) {
    if (!parsed || !dayKey) return false;
    const broadcastOk = applyGeneratedBroadcast(state, parsed.broadcast, dayKey, helpers);
    const buzzOk = applyGeneratedBuzz(state, parsed.buzz, dayKey);
    if (!broadcastOk || !buzzOk) return false;

    if (parsed.sideQuests && global.HatsuTasks?.applyGeneratedSideQuests) {
      if (!global.HatsuTasks.applyGeneratedSideQuests(state, parsed.sideQuests, "secondary")) {
        return false;
      }
    }

    const gen = ensureDailyGenShape(state);
    gen.dayKey = dayKey;
    gen.status = "ready";
    gen.source = "secondary";
    gen.pendingRequestId = "";
    return true;
  }

  function queueDailyWorldGeneration(state, dayKey, options = {}) {
    const gen = ensureDailyGenShape(state);
    if (!options.force && gen.dayKey === dayKey && gen.status === "ready") return false;

    gen.dayKey = dayKey;
    gen.status = "pending";
    gen.source = "";
    gen.pendingRequestId = "";

    const world = state?.freeMode?.world;
    if (world) {
      if (world.buzz) {
        world.buzz.buzzDayKey = "";
        world.buzz.items = (world.buzz.items || []).filter((item) => item.dayKey !== dayKey);
        world.buzz.hotTopic = "";
      }
      if (world.broadcast?.today?.dateKey && world.broadcast.today.dateKey !== dayKey) {
        world.broadcast.history = [world.broadcast.today, ...(world.broadcast.history || [])].slice(0, 14);
        world.broadcast.today = null;
      }
    }

    if (shouldIncludeSideQuests(state) && global.HatsuTasks?.markSideQuestGenPending) {
      global.HatsuTasks.markSideQuestGenPending(state, "");
    }
    return true;
  }

  function markDailyWorldGenLoading(state, requestId, dayKey) {
    const gen = ensureDailyGenShape(state);
    gen.dayKey = dayKey;
    gen.status = "loading";
    gen.pendingRequestId = String(requestId || "");
    return gen;
  }

  function markDailyWorldGenReady(state, source, dayKey) {
    const gen = ensureDailyGenShape(state);
    gen.dayKey = dayKey;
    gen.status = "ready";
    gen.source = source || "static";
    gen.pendingRequestId = "";
    return gen;
  }

  global.HatsuWorld = global.HatsuWorld || {};
  global.HatsuWorld.worldGen = {
    SIDE_QUEST_TAGS,
    defaultDailyGen,
    ensureDailyGenShape,
    shouldIncludeSideQuests,
    isDailyGenLoading,
    shouldDeferStaticWorldRoll,
    buildDailyWorldPrompt,
    parseDailyWorldResponse,
    applyDailyWorldGeneration,
    queueDailyWorldGeneration,
    markDailyWorldGenLoading,
    markDailyWorldGenReady,
    hashSlug
  };
})(typeof globalThis !== "undefined" ? globalThis : window);

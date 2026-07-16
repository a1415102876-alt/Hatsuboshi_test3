(function (global) {
  "use strict";

  const DEFAULT_MAX_CHARS = 1800;
  const MIN_MAX_CHARS = 320;
  const MAX_PRESSURES = 5;
  const MAX_CHARACTER_INTENTS = 3;
  const ACTIVE_STATUSES = new Set(["active"]);
  const INACTIVE_STAGES = new Set(["resolved"]);

  function cleanText(value, maxLength = 240) {
    const text = String(value || "").replace(/\s+/g, " ").trim();
    return Array.from(text).slice(0, maxLength).join("");
  }

  function normalizeContext(value = {}) {
    const participants = Array.isArray(value.participants)
      ? [...new Set(value.participants.map((item) => cleanText(item, 120)).filter(Boolean))]
      : [];
    return {
      currentDayKey: cleanText(value.currentDayKey, 120),
      participants,
      locationId: cleanText(value.locationId, 120),
      scopeKey: cleanText(value.scopeKey, 240),
      maxChars: Math.max(MIN_MAX_CHARS, Math.min(DEFAULT_MAX_CHARS, Number(value.maxChars) || DEFAULT_MAX_CHARS))
    };
  }

  function isPressureRelevant(pressure, direction, context) {
    if (!pressure || !ACTIVE_STATUSES.has(String(pressure.status || "active"))) return false;
    if (INACTIVE_STAGES.has(String(pressure.stage || ""))) return false;
    const scopeKey = String(pressure.scopeKey || "global");
    const scopeMatches = scopeKey === "global"
      || (context.scopeKey && scopeKey === context.scopeKey)
      || (context.locationId && scopeKey === `location:${context.locationId}`);
    if (!scopeMatches) return false;
    const pressureActors = new Set([pressure.actorId, ...(pressure.targetIds || [])].filter(Boolean));
    const participantMatches = context.participants.some((id) => pressureActors.has(id));
    const focused = (direction.focusPressureIds || []).includes(pressure.id)
      || (direction.focusActorIds || []).some((id) => pressureActors.has(id));
    if (pressure.visibility === "private" && !participantMatches) return false;
    return participantMatches || focused || pressure.visibility === "public";
  }

  function sanitizePressure(pressure) {
    return {
      id: cleanText(pressure.id, 160),
      type: cleanText(pressure.type, 40),
      theme: cleanText(pressure.theme, 60),
      actorId: cleanText(pressure.actorId, 120),
      targetIds: Array.isArray(pressure.targetIds) ? pressure.targetIds.map((id) => cleanText(id, 120)).filter(Boolean).slice(0, 8) : [],
      stage: cleanText(pressure.stage, 40),
      intensity: Math.max(0, Math.min(100, Number(pressure.intensity) || 0)),
      direction: cleanText(pressure.direction, 40),
      visibility: cleanText(pressure.visibility, 40),
      dramaticNeed: cleanText(pressure.dramaticNeed, 240),
      escalationConditions: Array.isArray(pressure.escalationConditions) ? pressure.escalationConditions.map((item) => cleanText(item, 180)).filter(Boolean).slice(0, 3) : [],
      reliefConditions: Array.isArray(pressure.reliefConditions) ? pressure.reliefConditions.map((item) => cleanText(item, 180)).filter(Boolean).slice(0, 3) : []
    };
  }

  function selectRelevantPressures(director, options = {}) {
    if (!director?.enabled || !director.dailyDirection) return [];
    const context = normalizeContext(options);
    if (!context.currentDayKey || director.dailyDirection.dayKey !== context.currentDayKey) return [];
    const focusIds = new Set(director.dailyDirection.focusPressureIds || []);
    return (Array.isArray(director.pressures) ? director.pressures : [])
      .filter((pressure) => isPressureRelevant(pressure, director.dailyDirection, context))
      .sort((left, right) => {
        const focusDelta = Number(focusIds.has(right.id)) - Number(focusIds.has(left.id));
        if (focusDelta) return focusDelta;
        const intensityDelta = Number(right.intensity || 0) - Number(left.intensity || 0);
        return intensityDelta || String(left.id || "").localeCompare(String(right.id || ""));
      })
      .slice(0, MAX_PRESSURES)
      .map(sanitizePressure);
  }

  function selectRelevantCharacterIntents(director, options = {}) {
    if (!director?.enabled) return [];
    const context = normalizeContext(options);
    if (!context.currentDayKey) return [];
    const participantIds = new Set(context.participants);
    return (Array.isArray(director.characterIntents) ? director.characterIntents : [])
      .filter((intent) => intent?.dayKey === context.currentDayKey && participantIds.has(String(intent.actorId || "")))
      .slice(0, MAX_CHARACTER_INTENTS)
      .map((intent) => ({
        actorId: cleanText(intent.actorId, 120),
        targetIds: Array.isArray(intent.targetIds) ? intent.targetIds.map((id) => cleanText(id, 120)).filter(Boolean).slice(0, 8) : [],
        goal: cleanText(intent.goal, 240),
        motive: cleanText(intent.motive, 240),
        urgency: cleanText(intent.urgency, 20),
        preferredChannels: Array.isArray(intent.preferredChannels)
          ? intent.preferredChannels.map((channel) => cleanText(channel, 20)).filter(Boolean).slice(0, 3)
          : []
      }))
      .filter((intent) => intent.actorId && intent.goal && intent.motive);
  }

  function formatPressure(pressure) {
    const actors = [pressure.actorId, ...pressure.targetIds].filter(Boolean).join(" / ");
    const escalation = pressure.escalationConditions.length ? `；升级条件：${pressure.escalationConditions.join("、")}` : "";
    const relief = pressure.reliefConditions.length ? `；缓解条件：${pressure.reliefConditions.join("、")}` : "";
    return `- ${actors}｜${pressure.stage}｜强度 ${pressure.intensity}｜叙事需要：${pressure.dramaticNeed}${escalation}${relief}`;
  }

  function formatStyleThread(label, value) {
    if (!value || value.status !== "active") return [];
    const question = cleanText(value.dramaticQuestion, 240);
    const goals = Array.isArray(value.narrativeGoals)
      ? value.narrativeGoals.map((item) => cleanText(item, 180)).filter(Boolean).slice(0, 6)
      : [];
    return [
      question ? `${label}长期问题：${question}` : "",
      goals.length ? `${label}可追求：${goals.join("；")}` : ""
    ].filter(Boolean);
  }

  function composeDirectorNarrativeBlock(director, options = {}) {
    const context = normalizeContext(options);
    const direction = director?.dailyDirection;
    if (!director?.enabled || !direction || direction.dayKey !== context.currentDayKey) return "";
    const pressures = selectRelevantPressures(director, context);
    const characterIntents = selectRelevantCharacterIntents(director, context);
    const threads = direction.styleThreads && typeof direction.styleThreads === "object"
      ? direction.styleThreads
      : null;
    const styleLines = threads
      ? [...formatStyleThread("王道", threads.heroic), ...formatStyleThread("恋爱", threads.romance)]
      : [];
    const lines = [
      ...styleLines,
      "[世界导演私密叙事参考]",
      `今日叙事方向（是语气与关注点，不是既定剧本）：${cleanText(direction.tone, 120)}；${cleanText(direction.summary, 320)}`,
      direction.narrativeGoals?.length ? `可追求：${direction.narrativeGoals.map((item) => cleanText(item, 180)).filter(Boolean).join("；")}` : "",
      direction.avoid?.length ? `应避免：${direction.avoid.map((item) => cleanText(item, 180)).filter(Boolean).join("；")}` : "",
      characterIntents.length ? "Each character intent is a current inclination or consideration, not an accomplished action." : "",
      characterIntents.length ? "They do not have to trigger this turn and must never decide the player's response." : "",
      ...characterIntents.map((intent) => `- ${intent.actorId}: ${intent.goal}; motive: ${intent.motive}; urgency: ${intent.urgency}; considered channels: ${intent.preferredChannels.join("/")}`),
      pressures.length ? "与本场相关的潜在压力：" : "",
      ...pressures.map(formatPressure),
      "约束：压力不必在本轮爆发；只在人物、地点与当前行动自然支持时体现。",
      "权威边界：不得修改前端已结算的数值、时间、随机结果或关系状态；不得替玩家创造选择、承诺或决定。"
    ].filter(Boolean);
    const block = lines.join("\n");
    return block.length <= context.maxChars ? block : `${block.slice(0, context.maxChars - 1)}…`;
  }

  function composeDirectorEvidenceContract() {
    return `[世界导演证据回传契约]
在【初星正文结束】和 <sum> 之后，额外输出一行：
<director_event>{"facts":[],"playerChoices":[],"observations":[],"hooksCreated":[],"hooksResolved":[]}</director_event>
每组最多 3 条，每条只写本轮正文中已经明确发生的简短事实；没有证据时保留空数组。
该标签不得写入正文，不得编造玩家选择，也不代表状态修改或授权 AI 修改前端权威状态。`;
  }

  global.HatsuWorld = global.HatsuWorld || {};
  global.HatsuWorld.directorInjection = {
    selectRelevantPressures,
    selectRelevantCharacterIntents,
    composeDirectorNarrativeBlock,
    composeDirectorEvidenceContract
  };
})(typeof globalThis !== "undefined" ? globalThis : window);

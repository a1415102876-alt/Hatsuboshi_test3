(function (global) {
  "use strict";

  const CATEGORY_LABELS = {
    hostile: "对立压力",
    environment: "环境变化",
    resource: "资源窗口",
    visitor: "来访与旁观",
    task: "任务波折",
    opportunity: "正面机会"
  };
  const SEVERITY_LABELS = { minor: "轻微", moderate: "中等", major: "重大" };
  const ARCHETYPE_LABELS = {
    rival_comparison: "同伴比较带来的竞争感",
    public_misunderstanding: "公开场合出现的误解",
    room_disruption: "训练或课程环境被短暂打乱",
    weather_shift: "天气变化迫使现场调整",
    shared_equipment: "关键设备或场地需要共享",
    short_opening: "出现一段短暂但珍贵的空档",
    peer_observation: "同伴临时旁观并提出问题",
    peer_invitation: "同伴发来一项临时邀请",
    teacher_checkin: "教师进行短暂的专业确认",
    unfinished_detail: "一个被忽略的细节需要补完",
    conflicting_instruction: "专业要求与个人偏好发生拉扯",
    visible_progress: "不经意间显露出可见进步",
    private_pause: "短暂独处让真实想法浮现",
    public_confrontation: "公开场合的对峙迫使人物明确表态",
    venue_disruption: "关键场地突发中断迫使原计划立即调整",
    critical_resource_conflict: "关键资源冲突使多方目标正面碰撞",
    authority_arrival: "权威人物突然到访并带来正式审视",
    official_deadline: "正式期限迫近并要求人物立即作出取舍",
    high_visibility_showcase: "高关注展示机会放大了期待与风险"
  };
  const LOCATION_LABELS = {
    school_entrance: "学园正门",
    club_room: "部室栋",
    auditorium: "讲堂",
    outstage: "野外舞台",
    playground: "运动场",
    swimming_pool: "泳池",
    gymnasium: "体育馆",
    idol_classroom: "偶像科教室",
    special_education: "特别教育栋",
    producer_classroom: "制作人科教室",
    courtyard: "中庭",
    dining_hall: "食堂",
    student_store: "小卖部",
    producer_apartment: "制作人公寓"
  };
  const MODIFIER_LABELS = {
    public_attention: "旁人的视线使反应更难掩饰",
    competitive_glance: "短暂的竞争意识被唤起",
    overheard_fragment: "有人只听见了对话的一部分",
    equipment_delay: "设备安排出现短暂延迟",
    schedule_noise: "周围日程带来干扰",
    sudden_rain: "突如其来的雨改变了现场节奏",
    changing_light: "光线变化改变了场地氛围",
    limited_slot: "可用时间或位置有限",
    shared_access: "必须与他人协调使用",
    quiet_window: "难得出现不被打扰的空档",
    teacher_material: "教师留下的材料提供了切入点",
    unexpected_question: "一个意外问题迫使人物表态",
    professional_question: "专业问题要求明确回应",
    brief_observation: "旁观者只停留很短时间",
    small_oversight: "一个小疏漏变得无法忽视",
    second_attempt: "人物获得一次立即重试的机会",
    professional_constraint: "专业规范限制了最直接的做法",
    personal_preference: "角色自己的偏好不愿轻易让步",
    unexpected_breakthrough: "微小突破超出了原本预期",
    quiet_recognition: "进步被安静而准确地看见",
    honest_question: "一句坦率提问触及真实想法"
  };

  function bounded(value, max = 160) {
    return Array.from(String(value || "").replace(/\s+/g, " ").trim()).slice(0, max).join("");
  }

  function actorLabel(value) {
    const id = bounded(value, 160);
    if (id === "producer") return "制作人";
    return id.startsWith("idol:") ? bounded(id.slice(5), 60) : "";
  }

  function composeDisturbanceBlock(candidate) {
    const disturbance = candidate?.disturbance;
    const styleLabels = { heroic: "王道故事", romance: "恋爱故事" };
    const styleLabel = styleLabels[candidate?.styleId];
    if (!styleLabel || !disturbance || disturbance.styleId !== candidate.styleId) return "";
    const immediateConstraint = bounded(disturbance.immediateConstraint, 240);
    const reasonToRespond = bounded(disturbance.reasonToRespond, 240);
    const openQuestions = Array.isArray(disturbance.openQuestions)
      ? disturbance.openQuestions.map((item) => bounded(item, 240)).filter(Boolean).slice(0, 4)
      : [];
    const forbiddenOutcomes = Array.isArray(disturbance.forbiddenOutcomes)
      ? disturbance.forbiddenOutcomes.map((item) => bounded(item, 160)).filter(Boolean).slice(0, 6)
      : [];
    if (!immediateConstraint || !reasonToRespond) return "";
    return `本轮 Storyteller 风格：${styleLabel}
现实依据：以上人物、地点、事件骨架和现场变量均已通过前端合法性检查。
触发事实：以上事件骨架是本轮需要自然落入正文的开放式触发。
即时限制：${immediateConstraint}
必须回应的原因：${reasonToRespond}
${openQuestions.length ? `开放问题：${openQuestions.join("；")}` : ""}
禁止预设结果：${forbiddenOutcomes.length ? forbiddenOutcomes.join("；") : "不得决定成功、失败、关系升级、玩家选择或权威状态。"}`;
  }

  function composeStorytellerIncidentPromptAddendum(candidate, context = {}) {
    if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) return "";
    if (candidate.status !== "attached" || candidate.channel !== "attach") return "";
    if (!SEVERITY_LABELS[candidate.severity] || candidate.severity === "major" || candidate.requiresConfirmation) return "";
    const category = CATEGORY_LABELS[candidate.category];
    const archetype = ARCHETYPE_LABELS[candidate.archetypeId];
    const location = LOCATION_LABELS[candidate.locationId];
    if (!category || !archetype || !location) return "";
    const actors = [...new Set([...(candidate.actorIds || []), ...(candidate.targetIds || [])]
      .map(actorLabel)
      .filter(Boolean))].slice(0, 4);
    if (!actors.length) return "";
    const modifiers = [...new Set((candidate.modifierIds || [])
      .map((id) => MODIFIER_LABELS[id])
      .filter(Boolean))].slice(0, 2);
    const actionLabels = { lesson: "上课", training: "训练", rest: "休息" };
    const mapLabels = {
      arrival: "地图抵达",
      explore_choice: "地图探索",
      custom_choice: "地图自定义探索"
    };
    const actionLabel = context.action === "map_location"
      ? mapLabels[context.mapStepKind] || "地图探索"
      : actionLabels[context.action] || "本次行动";
    const modifierBlock = modifiers.length ? `\n现场变量：\n${modifiers.map((item) => `- ${item}`).join("\n")}` : "";
    const base = bounded(`[Storyteller 事件骨架]
这是附着在已完成结算的${actionLabel}中的叙事波折，不是新的独立行动。
事件类别：${category}
事件强度：${SEVERITY_LABELS[candidate.severity]}
事件骨架：${archetype}
发生地点：${location}
涉及人物：${actors.join("、")}${modifierBlock}

叙事要求：
- 将事件自然嵌入本次行动的开端、过程或收束，不要另起一条无关支线。
- 让人物基于当前关系和现场条件作出具体反应，事件需要带来可感知的张力或机会。
- 本次回复只负责叙事表现，不得修改已结算数值、时间、任务或资源，也不得追加前端未给出的奖励与惩罚。
- 不要输出事件 ID、系统字段、判定过程或新的选择菜单。`, 2400);
    const disturbance = composeDisturbanceBlock(candidate);
    return disturbance ? bounded(`${base}\n${disturbance}`, 2400) : base;
  }

  function composeNarrativeAuthorityContract(options = {}) {
    const hasDirector = Boolean(options.hasDirector);
    const hasStoryteller = Boolean(options.hasStoryteller);
    if (!hasDirector && !hasStoryteller) return "";
    const lines = [
      "[叙事权威顺序]",
      "- 前端已经完成的确定性结算、时间、任务、资源与关系状态是最高权威，不得由叙事改写。",
      hasDirector ? "- Director 负责长期叙事方向与关注重点，不代表当前事件必然发生。" : "",
      hasStoryteller ? "- Storyteller 负责本轮已经通过合法性检查的具体波折，应自然落实在当前行动中。" : "",
      hasDirector && hasStoryteller
        ? "- 两者冲突时，以 Storyteller 的本轮合法事件为当前具体约束，以 Director 作为长期语气与后续方向。"
        : "",
      "- 不得新增前端未结算的奖励、惩罚、时间推进、任务完成或玩家决定。"
    ].filter(Boolean);
    return bounded(lines.join("\n"), 1200);
  }

  function composeStorytellerIndependentEventPromptAddendum(candidate, context = {}) {
    if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) return "";
    if (!["notified", "deferred", "invited"].includes(candidate.status) || candidate.channel !== "invite") return "";
    if (!SEVERITY_LABELS[candidate.severity]) return "";
    if (candidate.requiresConfirmation && !(candidate.severity === "major" && candidate.status === "invited")) return "";
    const category = CATEGORY_LABELS[candidate.category];
    const archetype = ARCHETYPE_LABELS[candidate.archetypeId];
    const location = LOCATION_LABELS[candidate.locationId];
    if (!category || !archetype || !location) return "";
    const actors = [...new Set((context.actorLabels || [])
      .map((value) => bounded(value, 60))
      .filter(Boolean))].slice(0, 4);
    const modifiers = [...new Set((candidate.modifierIds || [])
      .map((id) => MODIFIER_LABELS[id])
      .filter(Boolean))].slice(0, 2);
    const base = bounded(`[Storyteller 独立事件]
事件类别：${category}
事件强度：${SEVERITY_LABELS[candidate.severity]}
事件骨架：${archetype}
发生地点：${location}
涉及人物：${actors.join("、") || "制作人与当前担当"}
${modifiers.length ? `现场变量：${modifiers.join("；")}` : ""}

叙事要求：
- 这是玩家明确接受的一段独立校园事件，只写事件的发生、人物反应与自然收束。
- 不允许推进游戏时间，不得修改数值、资源、奖励、惩罚、任务、关系或任何权威状态。
- 不得替玩家确认新的长期承诺，不得输出系统字段、内部 ID、判定过程或新的选择菜单。
- 事件应产生可感知的戏剧张力或机会，但结果只属于叙事事实，后续是否影响世界由前端另行判断。`, 2400);
    const disturbance = composeDisturbanceBlock(candidate);
    return disturbance ? bounded(`${base}\n${disturbance}`, 2400) : base;
  }

  global.HatsuWorldStorytellerInjection = {
    composeStorytellerIncidentPromptAddendum,
    composeStorytellerIndependentEventPromptAddendum,
    composeNarrativeAuthorityContract,
    CATEGORY_LABELS,
    SEVERITY_LABELS,
    ARCHETYPE_LABELS,
    LOCATION_LABELS
  };
})(typeof globalThis !== "undefined" ? globalThis : window);

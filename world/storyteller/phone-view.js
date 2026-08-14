(function (global) {
  "use strict";

  const CATEGORY_LABELS = {
    hostile: "对立压力",
    environment: "环境变化",
    resource: "资源窗口",
    visitor: "来访者",
    task: "任务动向",
    opportunity: "正面机会"
  };
  const PACING_LABELS = {
    calm: "平静观察",
    normal: "常态推进",
    tense: "压力上升",
    crisis_allowed: "重大事件可用"
  };
  const CANDIDATE_STATUS_LABELS = {
    pending: "等待附着",
    attached: "已附着",
    resolved: "已完成",
    expired: "已过期"
  };
  const AUDIT_STATUS_LABELS = {
    pending: "待附着",
    attached: "已附着到 Prompt",
    resolved: "叙事已完成",
    expired: "已过期"
  };
  const AUDIT_STATUS_RANK = { pending: 1, attached: 2, expired: 3, resolved: 4 };
  const INITIATIVE_STATUS_LABELS = {
    pending: "待投递",
    notified: "已通知",
    deferred: "稍后处理",
    invited: "已接受",
    resolved: "已完成",
    expired: "已过期",
    abandoned: "已婉拒"
  };
  const INITIATIVE_CHANNEL_LABELS = { phone: "LINE", sns: "初星圈", invite: "公寓来访" };
  const ACTION_LABELS = {
    lesson: "上课",
    training: "训练",
    rest: "休息",
    outing: "外出",
    companion: "陪伴",
    interaction: "互动",
    freechat: "自由交流",
    map_location: "地图探索"
  };
  const SEVERITY_LABELS = { minor: "轻微", moderate: "中等", major: "重大" };
  const STYLE_LABELS = { heroic: "王道故事", romance: "恋爱故事", kaibunsho: "怪文书" };
  const OPERATOR_LABELS = {
    threshold_test: "阈值测试",
    resource_constraint: "资源限制",
    rival_comparison: "同伴比较",
    public_expectation: "公开期待",
    method_failure: "方法失效",
    opportunity_window: "机会窗口",
    expectation_gap: "期待落差",
    attention_competition: "注意力竞争",
    boundary_test: "边界试探",
    dependency_exposure: "依赖暴露",
    promise_pressure: "承诺压力",
    misread_signal: "信号误读"
  };
  const ARCHETYPE_LABELS = {
    peer_invitation: "同伴邀约",
    rival_comparison: "同伴竞争比较",
    public_misunderstanding: "公开场合误解",
    room_disruption: "现场短暂中断",
    weather_shift: "天气变化",
    shared_equipment: "设备或场地共享",
    short_opening: "短暂机会窗口",
    peer_observation: "同伴临时旁观",
    teacher_checkin: "教师专业确认",
    unfinished_detail: "补完遗漏细节",
    conflicting_instruction: "要求与偏好拉扯",
    visible_progress: "显露可见进步",
    private_pause: "独处时刻",
    public_confrontation: "公开场合对峙",
    venue_disruption: "关键场地中断",
    critical_resource_conflict: "关键资源冲突",
    authority_arrival: "权威人物到访",
    official_deadline: "正式期限迫近",
    high_visibility_showcase: "高关注展示机会"
  };
  const MODIFIER_LABELS = {
    public_attention: "公开视线",
    competitive_glance: "竞争气氛",
    overheard_fragment: "片段被听见",
    equipment_delay: "设备延误",
    schedule_noise: "日程干扰",
    changing_light: "现场光线变化",
    limited_slot: "名额或时段有限",
    shared_access: "需要协调共用",
    professional_constraint: "专业规范限制",
    professional_question: "专业质询",
    brief_observation: "短暂旁观",
    small_oversight: "遗漏细节",
    unexpected_breakthrough: "意外突破"
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

  function bounded(value, max = 120) {
    return Array.from(String(value || "").replace(/\s+/g, " ").trim()).slice(0, max).join("");
  }

  function budget(value, max) {
    const number = Number(value);
    return Number.isFinite(number) ? Math.max(0, Math.min(max, Math.round(number))) : 0;
  }

  function emptyModel(status, lastError = "") {
    return {
      status,
      dayKey: "",
      pacingLabel: "尚未计划",
      categories: [],
      severityBudget: { minor: 0, moderate: 0, major: 0 },
      noveltySummary: "暂无多样性计划",
      cooldownSummary: "暂无冷却计划",
      lastError: bounded(lastError, 120),
      candidate: null,
      selection: null,
      lastObservation: null,
      inbox: { available: false },
      eventAudit: {
        budget: {
          minor: { used: 0, total: 0 },
          moderate: { used: 0, total: 0 },
          major: { used: 0, total: 0 }
        },
        channels: { attach: 0, invite: 0, phone: 0, sns: 0 },
        attachEvents: [],
        initiativeEvents: [],
        unreadPhoneCount: 0,
        emptyReason: "当前计划尚未建立。"
      },
      badges: { worldEngine: false, sns: false }
    };
  }

  function idSuffix(value) {
    const text = bounded(value, 160);
    return text ? `…${Array.from(text).slice(-6).join("")}` : "";
  }

  function candidateSourceLabel(candidate, activeTurn) {
    const turn = activeTurn && typeof activeTurn === "object" ? activeTurn : null;
    const exactTurn = Boolean(turn && bounded(turn.turnId, 160) === bounded(candidate?.sourceTurnId, 160));
    if (exactTurn && turn.kind === "map_explore") {
      return turn.stepKind === "arrival" ? "地图抵达" : "地图探索";
    }
    if (exactTurn && turn.kind === "produce_action") return "普通行动";
    return bounded(candidate?.sourceTurnId, 160).startsWith("map-turn-") ? "地图探索" : "普通行动";
  }

  function buildCandidateView(source, plan, currentDayKey, currentSaveScope, activeTurn) {
    const pending = source.pendingCandidate && typeof source.pendingCandidate === "object"
      ? source.pendingCandidate
      : null;
    const recent = Array.isArray(source.recentCandidates) ? source.recentCandidates : [];
    const matches = (candidate) => Boolean(
      candidate
      && bounded(candidate.dayKey, 120) === currentDayKey
      && bounded(candidate.saveScope, 160) === currentSaveScope
      && (!candidate.planId || bounded(candidate.planId, 160) === bounded(plan.planId, 160))
    );
    const candidate = matches(pending)
      ? pending
      : [...recent].reverse().find(matches) || null;
    if (!candidate || !CANDIDATE_STATUS_LABELS[candidate.status]) return null;
    const categoryLabel = CATEGORY_LABELS[candidate.category];
    const severityLabel = SEVERITY_LABELS[candidate.severity];
    const archetypeLabel = ARCHETYPE_LABELS[candidate.archetypeId];
    const locationLabel = LOCATION_LABELS[candidate.locationId];
    if (!categoryLabel || !severityLabel || !archetypeLabel || !locationLabel) return null;
    const cooldownCount = recent.filter(matches).length;
    return {
      status: candidate.status,
      statusLabel: CANDIDATE_STATUS_LABELS[candidate.status],
      sourceLabel: candidateSourceLabel(candidate, activeTurn),
      categoryLabel,
      severityLabel,
      archetypeLabel,
      locationLabel,
      incidentSuffix: idSuffix(candidate.incidentId),
      turnSuffix: idSuffix(candidate.sourceTurnId),
      lastReason: bounded(source.lastCandidateReason, 120),
      cooldownCount: budget(cooldownCount, 24)
    };
  }

  function buildSelectionView(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    const rejections = value.rejectionCounts && typeof value.rejectionCounts === "object"
      ? value.rejectionCounts
      : {};
    const rejectionSummary = [
      ["合法性", budget(rejections.legality, 100)],
      ["冷却", budget(rejections.cooldown, 100)],
      ["多样性", budget(rejections.diversity, 100)],
      ["重复", budget(rejections.fingerprint, 100)]
    ].filter(([, count]) => count > 0).map(([label, count]) => `${label} ${count}`);
    return {
      selectedScore: budget(value.selectedScore, 200),
      categoryWeight: budget(value.categoryWeight, 100),
      actionFit: budget(value.actionFit, 20),
      noveltyBonus: budget(value.noveltyBonus, 20),
      pressureBonus: budget(value.pressureBonus, 20),
      relevantPressureCount: budget(value.relevantPressureCount, 6),
      evaluatedCount: budget(value.evaluatedCount, 100),
      eligibleCount: budget(value.eligibleCount, 100),
      rejectionSummary
    };
  }

  function buildLastObservationView(source, currentSaveScope) {
    const observations = Array.isArray(source.observations) ? source.observations : [];
    const observation = [...observations].reverse().find((item) => (
      item
      && typeof item === "object"
      && bounded(item.saveScope, 160) === currentSaveScope
      && ["resolved_candidate", "ambient_turn"].includes(item.sourceKind)
    ));
    if (!observation) return null;
    if (observation.sourceKind === "ambient_turn") {
      return { sourceLabel: "平静回合", categoryLabel: "无事件", severityLabel: "无" };
    }
    return {
      sourceLabel: "事件候选",
      categoryLabel: CATEGORY_LABELS[observation.category] || "未分类",
      severityLabel: SEVERITY_LABELS[observation.severity] || "未记录"
    };
  }

  function displayActor(value) {
    const id = bounded(value, 120);
    if (id === "producer") return "制作人";
    return id.startsWith("idol:") ? bounded(id.slice(5), 60) : "";
  }

  function formatAuditTime(value) {
    const minutes = Number(value);
    if (!Number.isInteger(minutes) || minutes < 0) return "--:--";
    const clock = minutes % (24 * 60);
    return `${String(Math.floor(clock / 60)).padStart(2, "0")}:${String(clock % 60).padStart(2, "0")}`;
  }

  function publicEmptyReason(source, candidateCount) {
    if (candidateCount > 0) return "今日已生成 Invite，尚未生成 Attach。";
    const rejections = source.lastSelectionDiagnostic?.rejectionCounts || {};
    if (budget(rejections.cooldown, 100) > 0) return "最近没有生成 Attach：候选仍在冷却中。";
    if (budget(rejections.fingerprint, 100) > 0) return "最近没有生成 Attach：候选触发了重复限制。";
    if (budget(rejections.diversity, 100) > 0) return "最近没有生成 Attach：角色、地点或类别多样性不足。";
    if (budget(rejections.legality, 100) > 0) return "最近没有生成 Attach：当前行动没有合法候选。";
    const reasons = {
      current_plan_unavailable: "当前计划尚未建立。",
      no_eligible_candidate: "最近一次行动没有合法的 Attach 候选。",
      candidate_unresolved: "已有事件正在处理中。",
      storyteller_module_unavailable: "Storyteller 模块当前不可用。"
    };
    return reasons[bounded(source.lastCandidateReason, 120)] || "今天尚未生成 Attach 事件。";
  }

  function buildEventAudit(source, plan, currentDayKey, currentSaveScope, options = {}) {
    const matches = (candidate) => Boolean(
      candidate
      && bounded(candidate.dayKey, 120) === currentDayKey
      && bounded(candidate.saveScope, 160) === currentSaveScope
      && bounded(candidate.planId, 160) === bounded(plan.planId, 160)
    );
    const candidates = [];
    if (matches(source.pendingCandidate)) candidates.push(source.pendingCandidate);
    if (Array.isArray(source.recentCandidates)) candidates.push(...source.recentCandidates.filter(matches));
    if (Array.isArray(source.initiative?.candidates)) candidates.push(...source.initiative.candidates.filter(matches));
    const deduped = new Map();
    candidates.forEach((candidate, index) => {
      const key = bounded(candidate.incidentId, 160) || `${bounded(candidate.sourceTurnId, 160)}|${index}`;
      const existing = deduped.get(key);
      const rank = AUDIT_STATUS_RANK[candidate.status] || 0;
      if (!existing || rank >= (AUDIT_STATUS_RANK[existing.status] || 0)) deduped.set(key, candidate);
    });
    const current = [...deduped.values()];
    const used = { minor: 0, moderate: 0, major: 0 };
    const channels = { attach: 0, invite: 0, phone: 0, sns: 0 };
    current.forEach((candidate) => {
      if (candidate.severity in used) used[candidate.severity] += 1;
      if (candidate.channel in channels) channels[candidate.channel] += 1;
    });
    const observations = Array.isArray(source.observations) ? source.observations : [];
    const resolveActorLabel = typeof options.resolveActorLabel === "function"
      ? options.resolveActorLabel
      : displayActor;
    const attachEvents = current.filter((candidate) => (
      candidate.channel === "attach" && AUDIT_STATUS_LABELS[candidate.status]
    )).map((candidate, index) => {
      const observation = [...observations].reverse().find((item) => (
        item
        && bounded(item.saveScope, 160) === currentSaveScope
        && bounded(item.dayKey, 120) === currentDayKey
        && bounded(item.turnId, 160) === bounded(candidate.sourceTurnId, 160)
      ));
      const modifierLabels = (candidate.modifierIds || []).map((id) => MODIFIER_LABELS[id]).filter(Boolean).slice(0, 2);
      const archetypeLabel = ARCHETYPE_LABELS[candidate.archetypeId] || "学园事件";
      const timeMinutes = Number.isInteger(Number(observation?.timeMinutes)) ? Number(observation.timeMinutes) : -1;
      const actorLabels = [...new Set([...(candidate.actorIds || []), ...(candidate.targetIds || [])]
        .map((id) => bounded(resolveActorLabel(id), 60) || displayActor(id))
        .filter(Boolean))].slice(0, 4);
      return {
        timeMinutes,
        order: index,
        timeLabel: formatAuditTime(timeMinutes),
        sourceLabel: ACTION_LABELS[observation?.actionId] || candidateSourceLabel(candidate, options.activeTurn),
        locationLabel: LOCATION_LABELS[observation?.locationId] || LOCATION_LABELS[candidate.locationId] || "当前位置",
        categoryLabel: CATEGORY_LABELS[candidate.category] || "未分类",
        severityLabel: SEVERITY_LABELS[candidate.severity] || "未记录",
        skeletonLabel: modifierLabels.length ? `${archetypeLabel} · ${modifierLabels.join(" · ")}` : archetypeLabel,
        actorLabels,
        styleLabel: STYLE_LABELS[candidate.styleId] || "未指定文风",
        statusLabel: AUDIT_STATUS_LABELS[candidate.status]
      };
    }).sort((left, right) => right.timeMinutes - left.timeMinutes || right.order - left.order)
      .slice(0, 24)
      .map(({ timeMinutes, order, ...row }) => row);
    const initiativeEvents = current.filter((candidate) => (
      candidate.origin === "character_intent"
      && INITIATIVE_CHANNEL_LABELS[candidate.channel]
      && INITIATIVE_STATUS_LABELS[candidate.status]
    )).map((candidate) => ({
      channelLabel: INITIATIVE_CHANNEL_LABELS[candidate.channel],
      statusLabel: INITIATIVE_STATUS_LABELS[candidate.status],
      actorLabels: [...new Set((candidate.actorIds || [])
        .map((id) => bounded(resolveActorLabel(id), 60) || displayActor(id))
        .filter(Boolean))].slice(0, 4),
      summary: bounded(candidate.delivery?.goal, 120),
      unread: candidate.channel === "phone" && Boolean(candidate.delivery?.unread)
    })).slice(0, 12);
    return {
      budget: {
        minor: { used: budget(used.minor, 24), total: budget(plan.severityBudget?.minor, 12) },
        moderate: { used: budget(used.moderate, 24), total: budget(plan.severityBudget?.moderate, 12) },
        major: { used: budget(used.major, 24), total: budget(plan.severityBudget?.major, 1) }
      },
      channels,
      attachEvents,
      initiativeEvents,
      unreadPhoneCount: initiativeEvents.filter((item) => item.unread).length,
      emptyReason: attachEvents.length ? "" : publicEmptyReason(source, current.length)
    };
  }

  function buildInboxView(source, currentDayKey, currentSaveScope, worldMinute) {
    const candidate = source.pendingCandidate;
    if (!candidate || candidate.channel !== "invite" || !["notified", "deferred"].includes(candidate.status)) return { available: false };
    if (bounded(candidate.dayKey, 120) !== currentDayKey || bounded(candidate.saveScope, 160) !== currentSaveScope) return { available: false };
    const notification = candidate.notification && typeof candidate.notification === "object" ? candidate.notification : {};
    const deferredUntil = budget(notification.deferredUntilWorldMinute, Number.MAX_SAFE_INTEGER);
    const deferred = candidate.status === "deferred" && Number(worldMinute || 0) < deferredUntil;
    return {
      available: true,
      status: candidate.status,
      statusLabel: candidate.status === "deferred" ? "稍后处理" : "待处理",
      categoryLabel: CATEGORY_LABELS[candidate.category] || "未分类",
      severityLabel: SEVERITY_LABELS[candidate.severity] || "未记录",
      archetypeLabel: ARCHETYPE_LABELS[candidate.archetypeId] || "学园事件",
      locationLabel: LOCATION_LABELS[candidate.locationId] || "当前位置",
      actorLabels: [...new Set([...(candidate.actorIds || []), ...(candidate.targetIds || [])].map(displayActor).filter(Boolean))].slice(0, 4),
      modifierLabels: (candidate.modifierIds || []).map((id) => MODIFIER_LABELS[id]).filter(Boolean).slice(0, 2),
      deferred,
      isMajor: candidate.severity === "major",
      requiresConfirmation: Boolean(candidate.requiresConfirmation),
      confirmationCopy: candidate.severity === "major" && candidate.requiresConfirmation
        ? "重大事件，接受或忽略前需要再次确认。"
        : ""
    };
  }

  function normalizeStyleMix(value, fallback = { heroic: 60, romance: 40, kaibunsho: 0 }) {
    const source = value && typeof value === "object" && !Array.isArray(value) ? value : fallback;
    return {
      heroic: budget(source.heroic, 100),
      romance: budget(source.romance, 100),
      kaibunsho: 0
    };
  }

  function buildStyleDiagnostics(source, plan, currentSaveScope) {
    const config = source.styleConfig && typeof source.styleConfig === "object" ? source.styleConfig : {};
    const activeMix = normalizeStyleMix(config.activeMix || plan.styleMix);
    const pendingMix = normalizeStyleMix(config.pendingMix || activeMix, activeMix);
    const diagnostic = source.lastSelectionDiagnostic && typeof source.lastSelectionDiagnostic === "object"
      ? source.lastSelectionDiagnostic
      : {};
    const legalCandidateCounts = {
      heroic: budget(diagnostic.legalStyleCounts?.heroic, 100),
      romance: budget(diagnostic.legalStyleCounts?.romance, 100)
    };
    const normalizedWeights = {
      heroic: Number.isFinite(Number(diagnostic.normalizedStyleWeights?.heroic)) ? Number(Number(diagnostic.normalizedStyleWeights.heroic).toFixed(4)) : 0,
      romance: Number.isFinite(Number(diagnostic.normalizedStyleWeights?.romance)) ? Number(Number(diagnostic.normalizedStyleWeights.romance).toFixed(4)) : 0
    };
    const selectedCandidate = source.pendingCandidate && typeof source.pendingCandidate === "object"
      ? source.pendingCandidate
      : null;
    const selectedOperators = Array.isArray(selectedCandidate?.operatorIds)
      ? selectedCandidate.operatorIds.map((id) => OPERATOR_LABELS[id]).filter(Boolean).slice(0, 2)
      : [];
    const recentDistribution = { heroic: 0, romance: 0 };
    const observations = Array.isArray(source.observations) ? source.observations.slice(-20) : [];
    observations.forEach((item) => {
      if (!item || item.sourceKind !== "resolved_candidate" || String(item.saveScope || "") !== currentSaveScope) return;
      if (item.styleId === "heroic" || item.styleId === "romance") recentDistribution[item.styleId] += 1;
    });
    const streakSource = source.styleStreak && typeof source.styleStreak === "object" ? source.styleStreak : {};
    const streakStyleId = ["heroic", "romance"].includes(streakSource.styleId) ? streakSource.styleId : "";
    return {
      activeMix,
      pendingMix,
      styleMixRevision: budget(config.styleMixRevision ?? plan.styleMixRevision, 1000000),
      pendingActivationDayKey: bounded(config.pendingActivationDayKey, 120),
      legalCandidateCounts,
      normalizedWeights,
      penaltyStyleId: ["heroic", "romance"].includes(diagnostic.penaltyStyleId) ? diagnostic.penaltyStyleId : "",
      penaltyApplied: Boolean(diagnostic.penaltyApplied),
      selectedStyleId: ["heroic", "romance"].includes(diagnostic.styleId) ? diagnostic.styleId : "",
      selectedStyleLabel: STYLE_LABELS[diagnostic.styleId] || "",
      selectedOperators,
      recentDistribution,
      streak: {
        styleId: streakStyleId,
        committedCount: streakStyleId ? budget(streakSource.committedCount, 99) : 0,
        penaltyArmed: Boolean(streakStyleId && streakSource.penaltyArmed)
      }
    };
  }

  function buildViewModel(value, options = {}) {
    const source = value && typeof value === "object" ? value : {};
    const plan = source.plan && typeof source.plan === "object" ? source.plan : null;
    const lastError = bounded(source.lastPlanError, 120);
    if (!plan) return emptyModel(lastError ? "retryable_failed" : "empty", lastError);
    const currentDayKey = bounded(options.currentDayKey, 120);
    const currentSaveScope = bounded(options.currentSaveScope, 160);
    if (
      plan.status !== "committed"
      || bounded(plan.dayKey, 120) !== currentDayKey
      || bounded(plan.saveScope, 160) !== currentSaveScope
    ) return emptyModel("stale", lastError);

    const categories = Object.keys(CATEGORY_LABELS).map((id) => ({
      label: CATEGORY_LABELS[id],
      weight: budget(plan.categoryWeights?.[id], 100)
    }));
    const diversity = plan.diversity && typeof plan.diversity === "object" ? plan.diversity : {};
    const inbox = buildInboxView(source, currentDayKey, currentSaveScope, options.worldMinute);
    const badgeVisible = Boolean(inbox.available && !inbox.deferred);
    return {
      status: "committed",
      dayKey: bounded(plan.dayKey, 120),
      pacingLabel: PACING_LABELS[plan.pacing] || PACING_LABELS.normal,
      categories,
      severityBudget: {
        minor: budget(plan.severityBudget?.minor, 12),
        moderate: budget(plan.severityBudget?.moderate, 12),
        major: budget(plan.severityBudget?.major, 1)
      },
      noveltySummary: diversity.preferUnusedCategories === false
        ? "按当前类别权重选择"
        : `优先未使用类别，类别连续上限 ${budget(diversity.avoidCategoryStreak, 4) || 2}`,
      cooldownSummary: `重大事件冷却 ${budget(diversity.majorCooldownDays, 7) || 2} 天`,
      lastError,
      style: buildStyleDiagnostics(source, plan, currentSaveScope),
      candidate: buildCandidateView(source, plan, currentDayKey, currentSaveScope, options.activeTurn),
      selection: buildSelectionView(source.lastSelectionDiagnostic),
      lastObservation: buildLastObservationView(source, currentSaveScope),
      inbox,
      eventAudit: buildEventAudit(source, plan, currentDayKey, currentSaveScope, options),
      badges: { worldEngine: badgeVisible, sns: badgeVisible }
    };
  }

  global.HatsuWorldStorytellerPhoneView = { buildViewModel, CATEGORY_LABELS, PACING_LABELS };
})(typeof globalThis !== "undefined" ? globalThis : window);

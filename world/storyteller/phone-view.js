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
        minor: budget(plan.severityBudget?.minor, 6),
        moderate: budget(plan.severityBudget?.moderate, 3),
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
      badges: { worldEngine: badgeVisible, sns: badgeVisible }
    };
  }

  global.HatsuWorldStorytellerPhoneView = { buildViewModel, CATEGORY_LABELS, PACING_LABELS };
})(typeof globalThis !== "undefined" ? globalThis : window);

(function (global) {
  "use strict";

  const CATEGORIES = ["hostile", "environment", "resource", "visitor", "task", "opportunity"];
  const SEVERITIES = ["minor", "moderate", "major"];
  const CHANNELS = ["attach", "sns", "phone", "invite", "background"];
  const RESOLUTION_MODES = ["player_choice", "observe", "defer", "ignore"];
  const STATUSES = ["pending", "attached", "notified", "deferred", "invited", "resolved", "expired", "abandoned"];
  const PACING = ["calm", "normal", "tense", "crisis_allowed"];
  const PRESSURE_VISIBILITIES = ["private", "implicit", "visible", "public"];
  const STYLE_IDS = ["heroic", "romance", "kaibunsho"];
  const OPERATORS_BY_STYLE = Object.freeze({
    heroic: new Set([
      "threshold_test", "resource_constraint", "rival_comparison",
      "public_expectation", "method_failure", "opportunity_window"
    ]),
    romance: new Set([
      "expectation_gap", "attention_competition", "boundary_test",
      "dependency_exposure", "promise_pressure", "misread_signal"
    ]),
    kaibunsho: new Set()
  });
  const ARCHETYPE_STYLE_CAPABILITIES = Object.freeze({
    rival_comparison: { heroic: ["rival_comparison", "threshold_test"] },
    public_misunderstanding: { romance: ["misread_signal", "boundary_test"] },
    room_disruption: { heroic: ["resource_constraint", "method_failure"] },
    weather_shift: { heroic: ["resource_constraint", "opportunity_window"] },
    shared_equipment: { heroic: ["resource_constraint"], romance: ["attention_competition"] },
    short_opening: { heroic: ["opportunity_window"], romance: ["promise_pressure"] },
    peer_observation: { heroic: ["public_expectation"], romance: ["boundary_test", "misread_signal"] },
    teacher_checkin: { heroic: ["public_expectation", "threshold_test"] },
    unfinished_detail: { heroic: ["method_failure", "threshold_test"] },
    conflicting_instruction: { heroic: ["method_failure"], romance: ["expectation_gap", "boundary_test"] },
    visible_progress: { heroic: ["threshold_test", "opportunity_window"], romance: ["dependency_exposure"] },
    private_pause: { romance: ["dependency_exposure", "expectation_gap"] },
    peer_invitation: { romance: ["attention_competition", "boundary_test"] },
    public_confrontation: { heroic: ["public_expectation"], romance: ["misread_signal", "boundary_test"] },
    venue_disruption: { heroic: ["resource_constraint", "method_failure"] },
    critical_resource_conflict: { heroic: ["resource_constraint"], romance: ["attention_competition"] },
    authority_arrival: { heroic: ["public_expectation", "threshold_test"] },
    official_deadline: { heroic: ["threshold_test", "opportunity_window"] },
    high_visibility_showcase: { heroic: ["opportunity_window", "public_expectation"], romance: ["boundary_test"] }
  });
  const PUBLIC_LOCATIONS = new Set([
    "auditorium", "club_room", "courtyard", "dining_hall", "gymnasium",
    "idol_classroom", "outstage", "playground", "school_entrance",
    "shopping_mall", "shopping_street", "student_store"
  ]);
  const PRESSURE_CATEGORY_TYPES = Object.freeze({
    hostile: new Set(["relationship", "social", "identity"]),
    environment: new Set(["goal", "schedule"]),
    resource: new Set(["goal", "schedule"]),
    visitor: new Set(["relationship", "social", "identity"]),
    task: new Set(["goal", "schedule"]),
    opportunity: new Set(["relationship", "social", "identity"])
  });
  const MAX_ID = 160;

  function bounded(value, max = MAX_ID) {
    return Array.from(String(value || "").replace(/\s+/g, " ").trim()).slice(0, max).join("");
  }

  function boundedInt(value, min, max, fallback = min) {
    const number = Number(value);
    if (!Number.isFinite(number)) return fallback;
    return Math.max(min, Math.min(max, Math.round(number)));
  }

  function uniqueSorted(values, max = 16) {
    if (!Array.isArray(values)) return [];
    return [...new Set(values.map((value) => bounded(value)).filter(Boolean))].sort().slice(0, max);
  }

  function normalizeOperatorMap(value, archetypeId) {
    const source = value && typeof value === "object" && !Array.isArray(value)
      ? value
      : ARCHETYPE_STYLE_CAPABILITIES[archetypeId] || {};
    const result = {};
    STYLE_IDS.forEach((styleId) => {
      const operators = uniqueSorted(source[styleId], 2)
        .filter((operatorId) => OPERATORS_BY_STYLE[styleId].has(operatorId));
      if (operators.length) result[styleId] = Object.freeze(operators);
    });
    return Object.freeze(result);
  }

  function stableHash(value) {
    let hash = 2166136261;
    for (const char of String(value || "")) {
      hash ^= char.codePointAt(0);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(36);
  }

  function stableNumber(value) {
    return parseInt(stableHash(value), 36) >>> 0;
  }

  function combinationSeed(definition, context) {
    return [
      context.plan?.seed,
      context.sourceTurnId,
      definition.id,
      context.action,
      context.locationId
    ].map((item) => bounded(item)).join("|");
  }

  function freezeDefinition(value) {
    const operatorIdsByStyle = normalizeOperatorMap(value.operatorIdsByStyle, bounded(value.archetypeId, 100));
    const inferredStyleIds = Object.keys(operatorIdsByStyle);
    const requestedStyleIds = Array.isArray(value.styleIds) ? value.styleIds : inferredStyleIds;
    const definition = {
      id: bounded(value.id, 100),
      category: CATEGORIES.includes(value.category) ? value.category : "task",
      archetypeId: bounded(value.archetypeId, 100),
      actorPool: Object.freeze(uniqueSorted(value.actorPool, 8)),
      locationPool: Object.freeze(uniqueSorted(value.locationPool, 12)),
      modifierPool: Object.freeze(uniqueSorted(value.modifierPool, 8)),
      channels: Object.freeze(uniqueSorted(value.channels, 5).filter((item) => CHANNELS.includes(item))),
      severityRange: Object.freeze(uniqueSorted(value.severityRange, 3).filter((item) => SEVERITIES.includes(item))),
      prerequisites: Object.freeze(uniqueSorted(value.prerequisites, 8)),
      allowedActions: Object.freeze(uniqueSorted(value.allowedActions, 6)),
      allowedPacing: Object.freeze(uniqueSorted(value.allowedPacing, 4).filter((item) => PACING.includes(item))),
      cooldownDays: boundedInt(value.cooldownDays, 0, 14, 1),
      requiresConfirmation: Boolean(value.requiresConfirmation),
      resolutionMode: RESOLUTION_MODES.includes(value.resolutionMode) ? value.resolutionMode : "observe",
      styleIds: Object.freeze(uniqueSorted(requestedStyleIds, 3).filter((styleId) => (
        STYLE_IDS.includes(styleId) && operatorIdsByStyle[styleId]?.length
      ))),
      operatorIdsByStyle
    };
    return Object.freeze(definition);
  }

  const INCIDENT_CATALOG = Object.freeze([
    freezeDefinition({ id: "hostile_rival_comparison", category: "hostile", archetypeId: "rival_comparison", actorPool: ["assigned_idol", "present_idol"], locationPool: ["idol_classroom", "producer_classroom", "special_education", "current_location"], modifierPool: ["public_attention", "competitive_glance"], channels: ["attach"], severityRange: ["minor", "moderate"], prerequisites: ["assigned_idol", "present_idol"], allowedActions: ["lesson", "training"], allowedPacing: ["normal", "tense", "crisis_allowed"], cooldownDays: 2 }),
    freezeDefinition({ id: "hostile_public_misunderstanding", category: "hostile", archetypeId: "public_misunderstanding", actorPool: ["assigned_idol", "present_idol"], locationPool: ["courtyard", "dining_hall", "idol_classroom", "current_location"], modifierPool: ["overheard_fragment", "public_attention"], channels: ["attach"], severityRange: ["moderate"], prerequisites: ["assigned_idol", "present_idol"], allowedActions: ["lesson", "rest"], allowedPacing: ["tense", "crisis_allowed"], cooldownDays: 3 }),
    freezeDefinition({ id: "environment_room_disruption", category: "environment", archetypeId: "room_disruption", actorPool: ["assigned_idol"], locationPool: ["gymnasium", "special_education", "idol_classroom", "producer_classroom", "current_location"], modifierPool: ["equipment_delay", "schedule_noise"], channels: ["attach"], severityRange: ["minor", "moderate"], prerequisites: ["assigned_idol"], allowedActions: ["lesson", "training", "map_location"], allowedPacing: ["calm", "normal", "tense", "crisis_allowed"], cooldownDays: 1 }),
    freezeDefinition({ id: "environment_weather_shift", category: "environment", archetypeId: "weather_shift", actorPool: ["assigned_idol"], locationPool: ["courtyard", "playground", "outstage", "school_entrance", "current_location"], modifierPool: ["sudden_rain", "changing_light"], channels: ["attach"], severityRange: ["minor"], prerequisites: ["assigned_idol"], allowedActions: ["training", "rest"], allowedPacing: ["calm", "normal", "tense", "crisis_allowed"], cooldownDays: 1 }),
    freezeDefinition({ id: "resource_shared_equipment", category: "resource", archetypeId: "shared_equipment", actorPool: ["assigned_idol", "present_idol"], locationPool: ["gymnasium", "special_education", "auditorium", "current_location"], modifierPool: ["limited_slot", "shared_access"], channels: ["attach"], severityRange: ["minor", "moderate"], prerequisites: ["assigned_idol"], allowedActions: ["training"], allowedPacing: ["calm", "normal", "tense", "crisis_allowed"], cooldownDays: 2 }),
    freezeDefinition({ id: "resource_short_opening", category: "resource", archetypeId: "short_opening", actorPool: ["assigned_idol"], locationPool: ["producer_classroom", "special_education", "courtyard", "current_location"], modifierPool: ["quiet_window", "teacher_material"], channels: ["attach"], severityRange: ["minor"], prerequisites: ["assigned_idol"], allowedActions: ["lesson", "rest", "map_location"], allowedPacing: ["calm", "normal", "tense", "crisis_allowed"], cooldownDays: 1 }),
    freezeDefinition({ id: "visitor_peer_observation", category: "visitor", archetypeId: "peer_observation", actorPool: ["assigned_idol", "present_idol"], locationPool: ["idol_classroom", "producer_classroom", "courtyard", "current_location"], modifierPool: ["unexpected_question", "public_attention"], channels: ["attach"], severityRange: ["minor", "moderate"], prerequisites: ["assigned_idol", "present_idol"], allowedActions: ["lesson", "training", "rest", "map_location"], allowedPacing: ["normal", "tense", "crisis_allowed"], cooldownDays: 2 }),
    freezeDefinition({ id: "visitor_teacher_checkin", category: "visitor", archetypeId: "teacher_checkin", actorPool: ["assigned_idol", "producer"], locationPool: ["producer_classroom", "idol_classroom", "special_education", "current_location"], modifierPool: ["professional_question", "brief_observation"], channels: ["attach"], severityRange: ["minor"], prerequisites: ["assigned_idol"], allowedActions: ["lesson", "training"], allowedPacing: ["calm", "normal", "tense", "crisis_allowed"], cooldownDays: 2 }),
    freezeDefinition({ id: "task_unfinished_detail", category: "task", archetypeId: "unfinished_detail", actorPool: ["assigned_idol", "producer"], locationPool: ["producer_classroom", "idol_classroom", "special_education", "gymnasium", "current_location"], modifierPool: ["small_oversight", "second_attempt"], channels: ["attach"], severityRange: ["minor", "moderate"], prerequisites: ["assigned_idol"], allowedActions: ["lesson", "training"], allowedPacing: ["normal", "tense", "crisis_allowed"], cooldownDays: 2 }),
    freezeDefinition({ id: "task_conflicting_instruction", category: "task", archetypeId: "conflicting_instruction", actorPool: ["assigned_idol", "producer"], locationPool: ["producer_classroom", "special_education", "gymnasium", "current_location"], modifierPool: ["professional_constraint", "personal_preference"], channels: ["attach"], severityRange: ["moderate"], prerequisites: ["assigned_idol"], allowedActions: ["lesson", "training"], allowedPacing: ["tense", "crisis_allowed"], cooldownDays: 3 }),
    freezeDefinition({ id: "opportunity_visible_progress", category: "opportunity", archetypeId: "visible_progress", actorPool: ["assigned_idol", "producer"], locationPool: ["gymnasium", "special_education", "idol_classroom", "current_location"], modifierPool: ["unexpected_breakthrough", "quiet_recognition"], channels: ["attach"], severityRange: ["minor", "moderate"], prerequisites: ["assigned_idol"], allowedActions: ["lesson", "training", "map_location"], allowedPacing: ["calm", "normal", "tense", "crisis_allowed"], cooldownDays: 2 }),
    freezeDefinition({ id: "opportunity_private_pause", category: "opportunity", archetypeId: "private_pause", actorPool: ["assigned_idol", "producer"], locationPool: ["courtyard", "dining_hall", "producer_classroom", "current_location"], modifierPool: ["quiet_window", "honest_question"], channels: ["attach"], severityRange: ["minor"], prerequisites: ["assigned_idol"], allowedActions: ["rest"], allowedPacing: ["calm", "normal", "tense", "crisis_allowed"], cooldownDays: 1 }),
    freezeDefinition({ id: "invite_peer_checkin", category: "visitor", archetypeId: "peer_invitation", actorPool: ["assigned_idol", "present_idol"], locationPool: ["current_location"], modifierPool: ["unexpected_question", "brief_observation"], channels: ["invite"], severityRange: ["minor", "moderate"], prerequisites: ["assigned_idol"], allowedActions: ["notification"], allowedPacing: ["normal", "tense", "crisis_allowed"], cooldownDays: 2 }),
    freezeDefinition({ id: "invite_visible_opportunity", category: "opportunity", archetypeId: "visible_progress", actorPool: ["assigned_idol", "producer"], locationPool: ["current_location"], modifierPool: ["unexpected_breakthrough", "quiet_recognition"], channels: ["invite"], severityRange: ["minor", "moderate"], prerequisites: ["assigned_idol"], allowedActions: ["notification"], allowedPacing: ["calm", "normal", "tense", "crisis_allowed"], cooldownDays: 2 }),
    freezeDefinition({ id: "invite_unfinished_followup", category: "task", archetypeId: "unfinished_detail", actorPool: ["assigned_idol", "producer"], locationPool: ["current_location"], modifierPool: ["small_oversight", "second_attempt"], channels: ["invite"], severityRange: ["minor", "moderate"], prerequisites: ["assigned_idol"], allowedActions: ["notification"], allowedPacing: ["normal", "tense", "crisis_allowed"], cooldownDays: 2 }),
    freezeDefinition({ id: "invite_resource_window", category: "resource", archetypeId: "short_opening", actorPool: ["assigned_idol", "producer"], locationPool: ["current_location"], modifierPool: ["quiet_window", "limited_slot"], channels: ["invite"], severityRange: ["minor"], prerequisites: ["assigned_idol"], allowedActions: ["notification"], allowedPacing: ["calm", "normal", "tense", "crisis_allowed"], cooldownDays: 1 }),
    freezeDefinition({ id: "major_hostile_public_confrontation", category: "hostile", archetypeId: "public_confrontation", actorPool: ["assigned_idol", "present_idol"], locationPool: ["current_location"], modifierPool: ["public_attention", "competitive_glance", "overheard_fragment"], channels: ["invite"], severityRange: ["major"], prerequisites: ["assigned_idol", "present_idol"], allowedActions: ["notification"], allowedPacing: ["crisis_allowed"], cooldownDays: 4, requiresConfirmation: true, resolutionMode: "player_choice" }),
    freezeDefinition({ id: "major_environment_venue_disruption", category: "environment", archetypeId: "venue_disruption", actorPool: ["assigned_idol", "producer"], locationPool: ["current_location"], modifierPool: ["equipment_delay", "schedule_noise", "changing_light"], channels: ["invite"], severityRange: ["major"], prerequisites: ["assigned_idol"], allowedActions: ["notification"], allowedPacing: ["crisis_allowed"], cooldownDays: 4, requiresConfirmation: true, resolutionMode: "player_choice" }),
    freezeDefinition({ id: "major_resource_critical_conflict", category: "resource", archetypeId: "critical_resource_conflict", actorPool: ["assigned_idol", "present_idol", "producer"], locationPool: ["current_location"], modifierPool: ["limited_slot", "shared_access", "professional_constraint"], channels: ["invite"], severityRange: ["major"], prerequisites: ["assigned_idol"], allowedActions: ["notification"], allowedPacing: ["crisis_allowed"], cooldownDays: 4, requiresConfirmation: true, resolutionMode: "player_choice" }),
    freezeDefinition({ id: "major_visitor_authority_arrival", category: "visitor", archetypeId: "authority_arrival", actorPool: ["assigned_idol", "producer"], locationPool: ["current_location"], modifierPool: ["professional_question", "public_attention", "brief_observation"], channels: ["invite"], severityRange: ["major"], prerequisites: ["assigned_idol"], allowedActions: ["notification"], allowedPacing: ["crisis_allowed"], cooldownDays: 4, requiresConfirmation: true, resolutionMode: "player_choice" }),
    freezeDefinition({ id: "major_task_official_deadline", category: "task", archetypeId: "official_deadline", actorPool: ["assigned_idol", "producer"], locationPool: ["current_location"], modifierPool: ["professional_constraint", "schedule_noise", "small_oversight"], channels: ["invite"], severityRange: ["major"], prerequisites: ["assigned_idol"], allowedActions: ["notification"], allowedPacing: ["crisis_allowed"], cooldownDays: 4, requiresConfirmation: true, resolutionMode: "player_choice" }),
    freezeDefinition({ id: "major_opportunity_high_visibility", category: "opportunity", archetypeId: "high_visibility_showcase", actorPool: ["assigned_idol", "producer"], locationPool: ["current_location"], modifierPool: ["public_attention", "unexpected_breakthrough", "limited_slot"], channels: ["invite"], severityRange: ["major"], prerequisites: ["assigned_idol"], allowedActions: ["notification"], allowedPacing: ["crisis_allowed"], cooldownDays: 4, requiresConfirmation: true, resolutionMode: "player_choice" })
  ]);

  function boundedList(values, maxItems, maxLength) {
    if (!Array.isArray(values)) return [];
    return [...new Set(values.map((item) => bounded(item, maxLength)).filter(Boolean))].slice(0, maxItems);
  }

  function normalizeDisturbance(value, styleId) {
    if (!value || typeof value !== "object" || Array.isArray(value) || value.styleId !== styleId) return null;
    const groundedPremise = bounded(value.groundedPremise, 240);
    const triggerFact = bounded(value.triggerFact, 240);
    const immediateConstraint = bounded(value.immediateConstraint, 240);
    const reasonToRespond = bounded(value.reasonToRespond, 240);
    if (!groundedPremise || !triggerFact || !immediateConstraint || !reasonToRespond) return null;
    return {
      styleId,
      sourcePressureIds: uniqueSorted(value.sourcePressureIds, 6),
      sourceRefs: uniqueSorted(value.sourceRefs, 8),
      groundedPremise,
      triggerFact,
      immediateConstraint,
      reasonToRespond,
      openQuestions: boundedList(value.openQuestions, 4, 240),
      forbiddenOutcomes: boundedList(value.forbiddenOutcomes, 6, 160)
    };
  }

  function normalizeIncidentCandidate(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    const rawNotification = value.notification && typeof value.notification === "object" && !Array.isArray(value.notification)
      ? value.notification
      : null;
    const nullableMinute = (minute) => minute === null || minute === undefined || minute === ""
      ? null
      : Number.isFinite(Number(minute))
        ? Math.max(0, Math.round(Number(minute)))
        : null;
    const rawDelivery = value.delivery && typeof value.delivery === "object" && !Array.isArray(value.delivery)
      ? value.delivery
      : null;
    const candidate = {
      schemaVersion: 1,
      incidentId: bounded(value.incidentId),
      definitionId: bounded(value.definitionId, 100),
      planId: bounded(value.planId),
      saveScope: bounded(value.saveScope, 240),
      dayKey: bounded(value.dayKey, 120),
      dayOrdinal: value.dayOrdinal === null || value.dayOrdinal === undefined || value.dayOrdinal === ""
        ? null
        : Number.isFinite(Number(value.dayOrdinal))
          ? Math.max(0, Math.round(Number(value.dayOrdinal)))
          : null,
      sourceTurnId: bounded(value.sourceTurnId),
      fingerprint: bounded(value.fingerprint, 360),
      category: CATEGORIES.includes(value.category) ? value.category : "task",
      severity: SEVERITIES.includes(value.severity) ? value.severity : "minor",
      archetypeId: bounded(value.archetypeId, 100),
      actorIds: uniqueSorted(value.actorIds, 8),
      targetIds: uniqueSorted(value.targetIds, 8),
      locationId: bounded(value.locationId, 120),
      modifierIds: uniqueSorted(value.modifierIds, 2),
      channel: CHANNELS.includes(value.channel) ? value.channel : "attach",
      pressureIds: uniqueSorted(value.pressureIds, 6),
      resolutionMode: RESOLUTION_MODES.includes(value.resolutionMode) ? value.resolutionMode : "observe",
      status: STATUSES.includes(value.status) ? value.status : "pending",
      randomSeed: bounded(value.randomSeed),
      requiresConfirmation: Boolean(value.requiresConfirmation),
      sourceRefs: uniqueSorted(value.sourceRefs, 8),
      notification: rawNotification ? {
        notifiedAtWorldMinute: nullableMinute(rawNotification.notifiedAtWorldMinute),
        deferredUntilWorldMinute: nullableMinute(rawNotification.deferredUntilWorldMinute),
        expiresAtWorldMinute: nullableMinute(rawNotification.expiresAtWorldMinute),
        notificationReason: bounded(rawNotification.notificationReason, 60)
      } : null,
      ...(value.origin === "character_intent" ? {
        origin: "character_intent",
        intentId: bounded(value.intentId, 160),
        delivery: rawDelivery ? {
          goal: bounded(rawDelivery.goal, 240),
          motive: bounded(rawDelivery.motive, 240),
          urgency: ["low", "normal", "high"].includes(rawDelivery.urgency) ? rawDelivery.urgency : "normal",
          visibility: rawDelivery.visibility === "public" ? "public" : "private",
          publicPostDraft: bounded(rawDelivery.publicPostDraft, 280),
          unread: Boolean(rawDelivery.unread),
          relationshipRole: ["responsible", "assigned", "friend", "known"].includes(rawDelivery.relationshipRole)
            ? rawDelivery.relationshipRole
            : "known",
          relationshipStage: bounded(rawDelivery.relationshipStage, 80),
          contextSummaries: boundedList(rawDelivery.contextSummaries, 4, 180),
          ...(Number.isFinite(Number(rawDelivery.deferredUntilWorldMinute)) ? {
            deferredUntilWorldMinute: Math.max(0, Math.round(Number(rawDelivery.deferredUntilWorldMinute)))
          } : {})
        } : null
      } : {})
    };
    const styleAware = value.styleId != null || value.styleMixRevision != null || value.disturbance != null;
    if (!styleAware) return candidate;
    const styleId = STYLE_IDS.includes(value.styleId) && value.styleId !== "kaibunsho" ? value.styleId : "";
    const styleMixRevision = Number(value.styleMixRevision);
    if (!styleId || !Number.isInteger(styleMixRevision) || styleMixRevision < 0) return null;
    const operatorIds = uniqueSorted(value.operatorIds, 2);
    if (!operatorIds.length || operatorIds.some((operatorId) => !OPERATORS_BY_STYLE[styleId].has(operatorId))) return null;
    const disturbance = normalizeDisturbance(value.disturbance, styleId);
    if (!disturbance) return null;
    return {
      ...candidate,
      schemaVersion: 2,
      styleId,
      styleMixRevision,
      operatorIds,
      disturbance
    };
  }

  function normalizeStorytellerPressureFacts(values) {
    if (!Array.isArray(values)) return [];
    return values.map((value) => {
      if (!value || typeof value !== "object" || Array.isArray(value)) return null;
      const pressureId = bounded(value.pressureId || value.id);
      const type = bounded(value.type, 40);
      const actorId = bounded(value.actorId, 120);
      const status = bounded(value.status || "active", 40);
      const stage = bounded(value.stage || "latent", 40);
      if (!pressureId || !type || !actorId || status !== "active" || stage === "resolved") return null;
      return {
        pressureId,
        type,
        theme: bounded(value.theme, 60),
        actorId,
        targetIds: uniqueSorted(value.targetIds, 8),
        stage,
        intensity: boundedInt(value.intensity, 0, 100, 0),
        visibility: PRESSURE_VISIBILITIES.includes(value.visibility) ? value.visibility : "implicit",
        ...(uniqueSorted(value.sourceRefs, 8).length ? { sourceRefs: uniqueSorted(value.sourceRefs, 8) } : {})
      };
    }).filter(Boolean)
      .sort((left, right) => right.intensity - left.intensity || left.pressureId.localeCompare(right.pressureId))
      .slice(0, 8);
  }

  function selectRelevantPressures(instance = {}, pressureFacts = []) {
    const category = CATEGORIES.includes(instance.category) ? instance.category : "task";
    const compatibleTypes = PRESSURE_CATEGORY_TYPES[category] || new Set();
    const actorIds = new Set(uniqueSorted(instance.actorIds, 8));
    const locationId = bounded(instance.locationId, 120);
    const publicLocation = PUBLIC_LOCATIONS.has(locationId);
    return normalizeStorytellerPressureFacts(pressureFacts).filter((pressure) => {
      if (!compatibleTypes.has(pressure.type)) return false;
      const actorMatch = actorIds.has(pressure.actorId)
        || pressure.targetIds.some((targetId) => actorIds.has(targetId));
      if (pressure.visibility === "private") return actorMatch;
      return actorMatch || (pressure.visibility === "public" && publicLocation);
    }).slice(0, 6);
  }

  function resolveActors(definition, context) {
    const actors = [];
    const assigned = bounded(context.assignedActorId);
    const present = uniqueSorted(context.presentActorIds, 12).filter((actorId) => actorId !== assigned);
    const seed = combinationSeed(definition, context);
    definition.actorPool.forEach((slot) => {
      if (slot === "assigned_idol" && assigned) actors.push(assigned);
      else if (slot === "present_idol" && present.length) actors.push(present[stableNumber(`${seed}|actor`) % present.length]);
      else if (slot === "producer") actors.push("producer");
      else if (slot.startsWith("idol:")) actors.push(slot);
    });
    return uniqueSorted(actors, 4);
  }

  function resolveModifiers(definition, context) {
    const pool = uniqueSorted(definition.modifierPool, 8);
    if (!pool.length) return [];
    const seed = combinationSeed(definition, context);
    const count = stableNumber(`${seed}|modifier-count`) % Math.min(3, pool.length + 1);
    return pool
      .map((modifierId) => ({ modifierId, rank: stableNumber(`${seed}|modifier|${modifierId}`) }))
      .sort((left, right) => left.rank - right.rank || left.modifierId.localeCompare(right.modifierId))
      .slice(0, count)
      .map((item) => item.modifierId)
      .sort();
  }

  function resolveLocation(definition, context) {
    const current = bounded(context.locationId, 120);
    if (!current) return "";
    return definition.locationPool.includes(current) || definition.locationPool.includes("current_location") ? current : "";
  }

  function currentPlanCandidates(context) {
    return (Array.isArray(context.recentCandidates) ? context.recentCandidates : []).filter((candidate) => (
      candidate
      && bounded(candidate.planId) === bounded(context.plan?.planId)
      && bounded(candidate.saveScope, 240) === bounded(context.saveScope, 240)
      && bounded(candidate.dayKey, 120) === bounded(context.dayKey, 120)
      && STATUSES.includes(candidate.status)
    ));
  }

  function chooseSeverity(definition, plan, context) {
    const recent = currentPlanCandidates(context);
    const available = definition.severityRange.filter((severity) => {
      const budget = boundedInt(plan?.severityBudget?.[severity], 0, 6, 0);
      const used = recent.filter((candidate) => candidate.severity === severity).length;
      return budget > used;
    });
    if (!available.length) return "";
    if (["tense", "crisis_allowed"].includes(plan?.pacing) && available.includes("moderate")) return "moderate";
    if (available.includes("minor")) return "minor";
    return available[0];
  }

  function failed(reason, layers, instances = {}) {
    return { eligible: false, reason, layers, instances };
  }

  function evaluateIncidentDefinition(rawDefinition, rawContext = {}) {
    const definition = freezeDefinition(rawDefinition || {});
    const context = rawContext && typeof rawContext === "object" ? rawContext : {};
    const plan = context.plan && typeof context.plan === "object" ? context.plan : {};
    const layers = { pacing: false, category: false, severity: false, world: false, instance: false };

    if (plan.status !== "committed") return failed("plan_not_committed", layers);
    if (!bounded(context.saveScope, 240) || bounded(plan.saveScope, 240) !== bounded(context.saveScope, 240)) {
      return failed("save_scope_mismatch", layers);
    }
    if (!bounded(context.dayKey, 120) || bounded(plan.dayKey, 120) !== bounded(context.dayKey, 120)) {
      return failed("day_key_mismatch", layers);
    }
    if (!bounded(context.sourceTurnId)) return failed("turn_id_required", layers);

    layers.pacing = definition.allowedPacing.includes(plan.pacing);
    if (!layers.pacing) return failed("pacing_not_allowed", layers);
    layers.category = CATEGORIES.includes(definition.category) && boundedInt(plan.categoryWeights?.[definition.category], 0, 100, 0) > 0;
    if (!layers.category) return failed("category_not_allowed", layers);
    const majorDefinition = definition.severityRange.includes("major");
    if (
      (definition.requiresConfirmation || majorDefinition)
      && !(context.allowMajorConfirmation === true && definition.requiresConfirmation && majorDefinition)
    ) {
      return failed("confirmation_required", layers);
    }
    const severity = chooseSeverity(definition, plan, context);
    layers.severity = Boolean(severity && (severity !== "major" || context.allowMajorConfirmation === true));
    if (!layers.severity) return failed("severity_budget_unavailable", layers);

    if (!definition.allowedActions.includes(context.action)) return failed("action_not_allowed", layers);
    if (
      context.action === "map_location"
      && !["arrival", "explore_choice", "custom_choice"].includes(context.mapStepKind)
    ) return failed("map_step_not_allowed", layers);
    const assigned = bounded(context.assignedActorId);
    const present = uniqueSorted(context.presentActorIds, 12).filter((actorId) => actorId !== assigned);
    if (definition.prerequisites.includes("assigned_idol") && !assigned) return failed("assigned_idol_required", layers);
    if (definition.prerequisites.includes("present_idol") && !present.length) return failed("present_idol_required", layers);
    layers.world = true;

    const actorIds = resolveActors(definition, context);
    const locationId = resolveLocation(definition, context);
    const modifierIds = resolveModifiers(definition, context);
    layers.instance = Boolean(actorIds.length && locationId);
    if (!layers.instance) return failed("instance_unavailable", layers, { actorIds, locationId, modifierIds, severity });
    return {
      eligible: true,
      reason: "eligible",
      layers,
      instances: {
        actorIds,
        targetIds: actorIds.includes("producer") ? [] : ["producer"],
        locationId,
        modifierIds,
        severity
      }
    };
  }

  function buildFingerprint(value) {
    return [
      bounded(value.category, 60),
      bounded(value.archetypeId, 100),
      uniqueSorted(value.actorIds, 8).join(","),
      bounded(value.locationId, 120),
      uniqueSorted(value.modifierIds, 2).join(",")
    ].join("|");
  }

  function buildSelectionKey(context) {
    return [
      context.plan?.seed,
      context.sourceTurnId,
      context.action,
      context.locationId,
      context.assignedActorId,
      uniqueSorted(context.presentActorIds, 12).join(",")
    ].map((item) => bounded(item)).join("|");
  }

  function isCoolingDown(definition, context) {
    const currentOrdinal = Number(context.dayOrdinal);
    if (!Number.isFinite(currentOrdinal) || definition.cooldownDays <= 0) return false;
    return (Array.isArray(context.recentCandidates) ? context.recentCandidates : []).some((candidate) => {
      if (bounded(candidate?.archetypeId, 100) !== definition.archetypeId) return false;
      if (!STATUSES.includes(candidate?.status) || candidate.status === "expired") return false;
      const previousOrdinal = Number(candidate.dayOrdinal);
      return Number.isFinite(previousOrdinal)
        && currentOrdinal >= previousOrdinal
        && currentOrdinal - previousOrdinal <= definition.cooldownDays;
    });
  }

  function exceedsDiversityLimits(instances, context) {
    const recent = currentPlanCandidates(context);
    const actorLimit = boundedInt(context.plan?.diversity?.actorDailyLimit, 1, 6, 2);
    const locationLimit = boundedInt(context.plan?.diversity?.locationDailyLimit, 1, 6, 2);
    const actorSaturated = instances.actorIds.some((actorId) => (
      recent.filter((candidate) => Array.isArray(candidate.actorIds) && candidate.actorIds.includes(actorId)).length >= actorLimit
    ));
    const locationSaturated = recent.filter((candidate) => candidate.locationId === instances.locationId).length >= locationLimit;
    return actorSaturated || locationSaturated;
  }

  function scoreDefinition(definition, context, fingerprint, relevantPressures = []) {
    const categoryWeight = boundedInt(context.plan?.categoryWeights?.[definition.category], 0, 100, 0);
    const recent = Array.isArray(context.recentCandidates) ? context.recentCandidates : [];
    const categoryUsed = recent.some((item) => item?.category === definition.category);
    const actionFit = definition.allowedActions.length === 1 ? 12 : 6;
    const pressureBonus = Math.min(20, relevantPressures.reduce((sum, pressure) => (
      sum + Math.ceil(boundedInt(pressure.intensity, 0, 100, 0) / 10)
    ), 0));
    const noveltyBonus = categoryUsed ? 0 : 15;
    const fingerprintBonus = fingerprint ? 1 : 0;
    return {
      selectedScore: Math.max(1, categoryWeight + actionFit + pressureBonus + noveltyBonus + fingerprintBonus),
      categoryWeight,
      actionFit,
      pressureBonus,
      noveltyBonus
    };
  }

  function isStyledContext(input) {
    return input?.plan?.schemaVersion === 2
      && input.plan.styleMix
      && Number.isInteger(Number(input.plan.styleMixRevision))
      && input.styleThreads
      && typeof input.styleThreads === "object";
  }

  function buildStyledPairs(eligible, input) {
    if (!isStyledContext(input)) return [];
    const pairs = [];
    eligible.forEach((item) => {
      item.definition.styleIds.forEach((styleId) => {
        const thread = input.styleThreads?.[styleId];
        const operators = item.definition.operatorIdsByStyle?.[styleId] || [];
        if (thread?.status !== "active" || !operators.length) return;
        pairs.push({ ...item, styleId, thread, operators });
      });
    });
    return pairs;
  }

  function selectWeightedStyle(pairs, input) {
    const styles = global.HatsuWorldStorytellerStyles;
    const legalStyleCounts = { heroic: 0, romance: 0 };
    pairs.forEach((pair) => { legalStyleCounts[pair.styleId] = (legalStyleCounts[pair.styleId] || 0) + 1; });
    const weighted = styles?.normalizeEligibleStyleWeights
      ? styles.normalizeEligibleStyleWeights(input.plan.styleMix, Object.keys(legalStyleCounts).filter((id) => legalStyleCounts[id] > 0), input.styleStreak)
      : { weights: {}, penaltyStyleId: "", penaltyApplied: false };
    const entries = Object.entries(weighted.weights).sort(([left], [right]) => left.localeCompare(right));
    if (!entries.length) return { styleId: "", legalStyleCounts, ...weighted };
    const identity = pairs.map((pair) => `${pair.definition.id}:${pair.styleId}`).sort().join("|");
    const key = [input.plan.seed, input.plan.styleMixRevision, input.sourceTurnId, input.action, input.locationId, identity].join("|");
    const total = entries.reduce((sum, [, weight]) => sum + Math.round(weight * 10000), 0);
    let cursor = stableNumber(key) % total;
    let styleId = entries[entries.length - 1][0];
    for (const [candidateStyleId, weight] of entries) {
      cursor -= Math.round(weight * 10000);
      if (cursor < 0) {
        styleId = candidateStyleId;
        break;
      }
    }
    return { styleId, legalStyleCounts, ...weighted };
  }

  function selectOperators(pair, selectionKey) {
    const operators = [...pair.operators].sort();
    if (operators.length <= 2) return operators;
    const start = stableNumber(`${selectionKey}|${pair.styleId}|operators`) % operators.length;
    return [operators[start], operators[(start + 1) % operators.length]].sort();
  }

  function buildStorytellerDisturbance(pair, operatorIds) {
    const actors = pair.evaluation.instances.actorIds.join(" / ") || "当前人物";
    const location = pair.evaluation.instances.locationId || "当前地点";
    const modifiers = pair.evaluation.instances.modifierIds.join(" / ") || pair.definition.archetypeId;
    const question = bounded(pair.thread?.dramaticQuestion, 240);
    const pressureIds = pair.relevantPressures.map((pressure) => pressure.pressureId);
    const sourceRefs = pair.relevantPressures.flatMap((pressure) => pressure.sourceRefs || []);
    return {
      styleId: pair.styleId,
      sourcePressureIds: pressureIds,
      sourceRefs,
      groundedPremise: `${actors}正在${location}进行当前行动。`,
      triggerFact: `${pair.definition.archetypeId}通过${modifiers}成为可观察事实。`,
      immediateConstraint: `本轮必须在不改变既定结算的前提下回应${operatorIds.join(" / ")}带来的限制。`,
      reasonToRespond: question || "该变化已经进入当前人物能够感知并需要回应的范围。",
      openQuestions: [question, ...(pair.thread?.narrativeGoals || [])].filter(Boolean).slice(0, 4),
      forbiddenOutcomes: ["不得决定成功或失败", "不得修改关系状态", "不得替玩家作出选择", "不得改变数值、时间或随机结果"]
    };
  }

  function normalizeStyleWeightMap(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};
    const result = {};
    ["heroic", "romance"].forEach((styleId) => {
      const weight = Number(value[styleId]);
      if (Number.isFinite(weight) && weight >= 0 && weight <= 100) result[styleId] = Number(weight.toFixed(4));
    });
    return result;
  }

  function normalizeSelectionDiagnostic(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    const rejectionCounts = value.rejectionCounts && typeof value.rejectionCounts === "object"
      ? value.rejectionCounts
      : {};
    const result = {
      selectedScore: boundedInt(value.selectedScore, 0, 200, 0),
      categoryWeight: boundedInt(value.categoryWeight, 0, 100, 0),
      actionFit: boundedInt(value.actionFit, 0, 20, 0),
      noveltyBonus: boundedInt(value.noveltyBonus, 0, 20, 0),
      pressureBonus: boundedInt(value.pressureBonus, 0, 20, 0),
      relevantPressureCount: boundedInt(value.relevantPressureCount, 0, 6, 0),
      evaluatedCount: boundedInt(value.evaluatedCount, 0, 100, 0),
      eligibleCount: boundedInt(value.eligibleCount, 0, 100, 0),
      rejectionCounts: {
        legality: boundedInt(rejectionCounts.legality, 0, 100, 0),
        cooldown: boundedInt(rejectionCounts.cooldown, 0, 100, 0),
        diversity: boundedInt(rejectionCounts.diversity, 0, 100, 0),
        fingerprint: boundedInt(rejectionCounts.fingerprint, 0, 100, 0)
      }
    };
    if (value.styleId || value.configuredStyleWeights || value.normalizedStyleWeights || value.legalStyleCounts) {
      result.styleId = ["heroic", "romance"].includes(value.styleId) ? value.styleId : "";
      result.configuredStyleWeights = normalizeStyleWeightMap(value.configuredStyleWeights);
      result.normalizedStyleWeights = normalizeStyleWeightMap(value.normalizedStyleWeights);
      result.legalStyleCounts = {
        heroic: boundedInt(value.legalStyleCounts?.heroic, 0, 100, 0),
        romance: boundedInt(value.legalStyleCounts?.romance, 0, 100, 0)
      };
      result.penaltyStyleId = ["heroic", "romance"].includes(value.penaltyStyleId) ? value.penaltyStyleId : "";
      result.penaltyApplied = Boolean(value.penaltyApplied);
    }
    return result;
  }

  function selectIncidentCandidate(rawInput = {}) {
    const input = rawInput && typeof rawInput === "object" ? rawInput : {};
    const catalog = Array.isArray(input.catalog) ? input.catalog : INCIDENT_CATALOG;
    const recentFingerprints = new Set(uniqueSorted(input.recentFingerprints, 24));
    const eligible = [];
    const rejectionCounts = { legality: 0, cooldown: 0, diversity: 0, fingerprint: 0 };
    const requiredChannel = CHANNELS.includes(input.requiredChannel) ? input.requiredChannel : "attach";

    catalog.forEach((rawDefinition) => {
      const definition = freezeDefinition(rawDefinition || {});
      if (!definition.channels.includes(requiredChannel)) {
        rejectionCounts.legality += 1;
        return;
      }
      const evaluation = evaluateIncidentDefinition(definition, input);
      if (!evaluation.eligible) {
        rejectionCounts.legality += 1;
        return;
      }
      if (isCoolingDown(definition, input)) {
        rejectionCounts.cooldown += 1;
        return;
      }
      if (exceedsDiversityLimits(evaluation.instances, input)) {
        rejectionCounts.diversity += 1;
        return;
      }
      const fingerprint = buildFingerprint({
        category: definition.category,
        archetypeId: definition.archetypeId,
        actorIds: evaluation.instances.actorIds,
        locationId: evaluation.instances.locationId,
        modifierIds: evaluation.instances.modifierIds
      });
      if (recentFingerprints.has(fingerprint)) {
        rejectionCounts.fingerprint += 1;
        return;
      }
      const relevantPressures = selectRelevantPressures({
        category: definition.category,
        actorIds: evaluation.instances.actorIds,
        targetIds: evaluation.instances.targetIds,
        locationId: evaluation.instances.locationId
      }, input.pressureFacts);
      const score = scoreDefinition(definition, input, fingerprint, relevantPressures);
      eligible.push({
        definition,
        evaluation,
        fingerprint,
        relevantPressures,
        score: score.selectedScore,
        scoreComponents: score
      });
    });

    if (!eligible.length) {
      const diagnostic = normalizeSelectionDiagnostic({
        evaluatedCount: catalog.length,
        eligibleCount: 0,
        rejectionCounts
      });
      return { candidate: null, reason: "no_eligible_candidate", evaluatedCount: catalog.length, diagnostic, nextStyleStreak: null };
    }
    let selectable = eligible;
    let styleSelection = null;
    if (input.plan?.schemaVersion === 2) {
      if (!isStyledContext(input)) {
        const diagnostic = normalizeSelectionDiagnostic({
          evaluatedCount: catalog.length,
          eligibleCount: eligible.length,
          rejectionCounts
        });
        return { candidate: null, reason: "style_context_unavailable", evaluatedCount: catalog.length, diagnostic, nextStyleStreak: null };
      }
      const pairs = buildStyledPairs(eligible, input);
      styleSelection = selectWeightedStyle(pairs, input);
      if (!styleSelection.styleId) {
        const diagnostic = normalizeSelectionDiagnostic({
          evaluatedCount: catalog.length,
          eligibleCount: eligible.length,
          rejectionCounts,
          configuredStyleWeights: input.plan.styleMix,
          normalizedStyleWeights: styleSelection.weights,
          legalStyleCounts: styleSelection.legalStyleCounts,
          penaltyStyleId: styleSelection.penaltyStyleId,
          penaltyApplied: styleSelection.penaltyApplied
        });
        return { candidate: null, reason: "no_weighted_style", evaluatedCount: catalog.length, diagnostic, nextStyleStreak: null };
      }
      selectable = pairs.filter((pair) => pair.styleId === styleSelection.styleId);
    }
    selectable.sort((left, right) => left.definition.id.localeCompare(right.definition.id));
    const total = selectable.reduce((sum, item) => sum + item.score, 0);
    const selectionKey = styleSelection
      ? `${buildSelectionKey(input)}|${styleSelection.styleId}`
      : buildSelectionKey(input);
    let cursor = parseInt(stableHash(selectionKey), 36) % total;
    let selected = selectable[selectable.length - 1];
    for (const item of selectable) {
      cursor -= item.score;
      if (cursor < 0) {
        selected = item;
        break;
      }
    }

    const identity = [
      bounded(input.plan?.planId),
      bounded(input.sourceTurnId),
      selected.definition.id,
      requiredChannel,
      selected.fingerprint
    ].join("|");
    const operatorIds = styleSelection ? selectOperators(selected, selectionKey) : [];
    const candidate = normalizeIncidentCandidate({
      incidentId: `incident:${stableHash(identity)}`,
      definitionId: selected.definition.id,
      planId: input.plan?.planId,
      saveScope: input.saveScope,
      dayKey: input.dayKey,
      dayOrdinal: input.dayOrdinal,
      sourceTurnId: input.sourceTurnId,
      fingerprint: selected.fingerprint,
      category: selected.definition.category,
      severity: selected.evaluation.instances.severity,
      archetypeId: selected.definition.archetypeId,
      actorIds: selected.evaluation.instances.actorIds,
      targetIds: selected.evaluation.instances.targetIds,
      locationId: selected.evaluation.instances.locationId,
      modifierIds: selected.evaluation.instances.modifierIds,
      channel: requiredChannel,
      pressureIds: selected.relevantPressures.map((pressure) => pressure.pressureId),
      resolutionMode: selected.definition.resolutionMode,
      status: "pending",
      randomSeed: stableHash(`${selectionKey}|${selected.definition.id}`),
      requiresConfirmation: selected.definition.requiresConfirmation,
      sourceRefs: [],
      ...(styleSelection ? {
        styleId: styleSelection.styleId,
        styleMixRevision: Number(input.plan.styleMixRevision),
        operatorIds,
        disturbance: buildStorytellerDisturbance(selected, operatorIds)
      } : {})
    });
    const diagnostic = normalizeSelectionDiagnostic({
      ...selected.scoreComponents,
      relevantPressureCount: selected.relevantPressures.length,
      evaluatedCount: catalog.length,
      eligibleCount: eligible.length,
      rejectionCounts,
      ...(styleSelection ? {
        styleId: styleSelection.styleId,
        configuredStyleWeights: input.plan.styleMix,
        normalizedStyleWeights: styleSelection.weights,
        legalStyleCounts: styleSelection.legalStyleCounts,
        penaltyStyleId: styleSelection.penaltyStyleId,
        penaltyApplied: styleSelection.penaltyApplied
      } : {})
    });
    const nextStyleStreak = styleSelection && global.HatsuWorldStorytellerStyles?.consumeStylePenalty
      ? global.HatsuWorldStorytellerStyles.consumeStylePenalty(input.styleStreak)
      : null;
    return {
      candidate,
      reason: "selected",
      evaluatedCount: catalog.length,
      selectedScore: selected.score,
      diagnostic,
      nextStyleStreak
    };
  }

  function revalidateIncidentCandidate(rawCandidate, rawContext = {}, rawOptions = {}) {
    const candidate = normalizeIncidentCandidate(rawCandidate);
    if (!candidate) return { valid: false, reason: "candidate_required", candidate: null };
    const context = rawContext && typeof rawContext === "object" ? rawContext : {};
    const options = rawOptions && typeof rawOptions === "object" ? rawOptions : {};
    const requiredChannel = CHANNELS.includes(options.requiredChannel) ? options.requiredChannel : "";
    if (!requiredChannel || candidate.channel !== requiredChannel) {
      return { valid: false, reason: "candidate_channel_mismatch", candidate };
    }
    if (options.allowMajorConfirmation !== true) {
      return { valid: false, reason: "confirmation_required", candidate };
    }

    const catalog = Array.isArray(options.catalog)
      ? options.catalog
      : Array.isArray(context.catalog)
        ? context.catalog
        : INCIDENT_CATALOG;
    const rawDefinition = catalog.find((item) => bounded(item?.id, 100) === candidate.definitionId);
    if (!rawDefinition) return { valid: false, reason: "candidate_definition_mismatch", candidate };
    const definition = freezeDefinition(rawDefinition);
    if (!definition.channels.includes(requiredChannel)) {
      return { valid: false, reason: "candidate_channel_mismatch", candidate };
    }

    const exactOwner = candidate.planId === bounded(context.plan?.planId)
      && candidate.saveScope === bounded(context.saveScope, 240)
      && candidate.dayKey === bounded(context.dayKey, 120)
      && candidate.sourceTurnId === bounded(context.sourceTurnId)
      && candidate.dayOrdinal === (Number.isFinite(Number(context.dayOrdinal))
        ? Math.max(0, Math.round(Number(context.dayOrdinal)))
        : null);
    if (!exactOwner) return { valid: false, reason: "candidate_ownership_mismatch", candidate };

    const recentCandidates = (Array.isArray(context.recentCandidates) ? context.recentCandidates : [])
      .filter((item) => !(
        bounded(item?.incidentId) === candidate.incidentId
        && bounded(item?.planId) === candidate.planId
        && bounded(item?.saveScope, 240) === candidate.saveScope
        && bounded(item?.dayKey, 120) === candidate.dayKey
        && bounded(item?.sourceTurnId) === candidate.sourceTurnId
        && Number(item?.dayOrdinal) === candidate.dayOrdinal
      ));
    const evaluationContext = {
      ...context,
      recentCandidates,
      requiredChannel,
      allowMajorConfirmation: true
    };
    const evaluation = evaluateIncidentDefinition(definition, evaluationContext);
    if (!evaluation.eligible) return { valid: false, reason: bounded(evaluation.reason, 120), candidate };
    if (isCoolingDown(definition, evaluationContext)) {
      return { valid: false, reason: "candidate_cooldown_active", candidate };
    }
    if (exceedsDiversityLimits(evaluation.instances, evaluationContext)) {
      return { valid: false, reason: "candidate_diversity_exceeded", candidate };
    }

    const fingerprint = buildFingerprint({
      category: definition.category,
      archetypeId: definition.archetypeId,
      actorIds: evaluation.instances.actorIds,
      locationId: evaluation.instances.locationId,
      modifierIds: evaluation.instances.modifierIds
    });
    if (new Set(uniqueSorted(context.recentFingerprints, 24)).has(fingerprint)) {
      return { valid: false, reason: "candidate_fingerprint_reused", candidate };
    }
    const relevantPressures = selectRelevantPressures({
      category: definition.category,
      actorIds: evaluation.instances.actorIds,
      targetIds: evaluation.instances.targetIds,
      locationId: evaluation.instances.locationId
    }, context.pressureFacts);
    const styledCandidate = candidate.schemaVersion === 2;
    let styledExpected = null;
    if (styledCandidate) {
      const thread = context.styleThreads?.[candidate.styleId];
      const supportedOperators = definition.operatorIdsByStyle?.[candidate.styleId] || [];
      if (
        context.plan?.schemaVersion !== 2
        || candidate.styleMixRevision !== Number(context.plan.styleMixRevision)
        || thread?.status !== "active"
        || !supportedOperators.length
      ) return { valid: false, reason: "candidate_style_mismatch", candidate };
      const pair = {
        definition,
        evaluation,
        relevantPressures,
        styleId: candidate.styleId,
        thread,
        operators: supportedOperators
      };
      const styledSelectionKey = `${buildSelectionKey(context)}|${candidate.styleId}`;
      const operatorIds = selectOperators(pair, styledSelectionKey);
      styledExpected = {
        styleId: candidate.styleId,
        styleMixRevision: Number(context.plan.styleMixRevision),
        operatorIds,
        disturbance: normalizeDisturbance(buildStorytellerDisturbance(pair, operatorIds), candidate.styleId)
      };
    }
    const selectionKey = styledCandidate
      ? `${buildSelectionKey(context)}|${candidate.styleId}`
      : buildSelectionKey(context);
    const identity = [
      bounded(context.plan?.planId),
      bounded(context.sourceTurnId),
      definition.id,
      requiredChannel,
      fingerprint
    ].join("|");
    const expected = {
      incidentId: `incident:${stableHash(identity)}`,
      definitionId: definition.id,
      category: definition.category,
      severity: evaluation.instances.severity,
      archetypeId: definition.archetypeId,
      actorIds: evaluation.instances.actorIds,
      targetIds: evaluation.instances.targetIds,
      locationId: evaluation.instances.locationId,
      modifierIds: evaluation.instances.modifierIds,
      fingerprint,
      channel: requiredChannel,
      pressureIds: relevantPressures.map((pressure) => pressure.pressureId),
      resolutionMode: definition.resolutionMode,
      randomSeed: stableHash(`${selectionKey}|${definition.id}`),
      requiresConfirmation: definition.requiresConfirmation,
      ...(styledExpected || {})
    };
    const sameArray = (left, right) => JSON.stringify(left) === JSON.stringify(right);
    const matches = candidate.incidentId === expected.incidentId
      && candidate.definitionId === expected.definitionId
      && candidate.category === expected.category
      && candidate.severity === expected.severity
      && candidate.archetypeId === expected.archetypeId
      && sameArray(candidate.actorIds, expected.actorIds)
      && sameArray(candidate.targetIds, expected.targetIds)
      && candidate.locationId === expected.locationId
      && sameArray(candidate.modifierIds, expected.modifierIds)
      && candidate.fingerprint === expected.fingerprint
      && candidate.channel === expected.channel
      && sameArray(candidate.pressureIds, expected.pressureIds)
      && candidate.resolutionMode === expected.resolutionMode
      && candidate.randomSeed === expected.randomSeed
      && candidate.requiresConfirmation === expected.requiresConfirmation
      && (!styledCandidate || (
        candidate.styleId === expected.styleId
        && candidate.styleMixRevision === expected.styleMixRevision
        && sameArray(candidate.operatorIds, expected.operatorIds)
        && JSON.stringify(candidate.disturbance) === JSON.stringify(expected.disturbance)
      ));
    return matches
      ? { valid: true, reason: "valid", candidate }
      : { valid: false, reason: "candidate_instance_mismatch", candidate };
  }

  function transitionIncidentCandidate(rawCandidate, nextStatus, context = {}) {
    const candidate = normalizeIncidentCandidate(rawCandidate);
    if (!candidate) return { ok: false, reason: "candidate_required", candidate: null };
    const exactOwner = candidate.saveScope === bounded(context.saveScope, 240)
      && candidate.dayKey === bounded(context.dayKey, 120)
      && candidate.planId === bounded(context.planId)
      && candidate.sourceTurnId === bounded(context.sourceTurnId);
    if (!exactOwner) return { ok: false, reason: "candidate_ownership_mismatch", candidate };
    const transitions = {
      pending: new Set(["attached", "notified", "expired"]),
      attached: new Set(["resolved", "expired"]),
      notified: new Set(["deferred", "invited", "expired"]),
      deferred: new Set(["notified", "invited", "expired"]),
      invited: new Set(["resolved", "abandoned"]),
      resolved: new Set(),
      expired: new Set(),
      abandoned: new Set()
    };
    if (!transitions[candidate.status]?.has(nextStatus)) {
      return { ok: false, reason: "invalid_transition", candidate };
    }
    return {
      ok: true,
      reason: nextStatus,
      candidate: normalizeIncidentCandidate({ ...candidate, status: nextStatus })
    };
  }

  global.HatsuWorldStorytellerIncidents = {
    INCIDENT_CATALOG,
    normalizeIncidentCandidate,
    normalizeStorytellerPressureFacts,
    selectRelevantPressures,
    normalizeSelectionDiagnostic,
    evaluateIncidentDefinition,
    selectIncidentCandidate,
    revalidateIncidentCandidate,
    transitionIncidentCandidate
  };
})(typeof globalThis !== "undefined" ? globalThis : window);

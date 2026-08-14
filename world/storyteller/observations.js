(function (global) {
  "use strict";

  const MAX_SCENES = 12;
  const MAX_PARTICIPANTS = 8;
  const MAX_ID_LENGTH = 160;
  const CATEGORIES = ["hostile", "environment", "resource", "visitor", "task", "opportunity"];
  const SEVERITIES = ["minor", "moderate", "major"];
  const STYLE_IDS = ["heroic", "romance"];
  const OPERATOR_IDS = new Set([
    "threshold_test", "resource_constraint", "rival_comparison", "public_expectation", "method_failure", "opportunity_window",
    "expectation_gap", "attention_competition", "boundary_test", "dependency_exposure", "promise_pressure", "misread_signal"
  ]);

  function bounded(value, max = MAX_ID_LENGTH) {
    const text = String(value || "").replace(/\s+/g, " ").trim();
    return text && Array.from(text).length <= max ? text : "";
  }

  function uniqueSorted(values, max = MAX_PARTICIPANTS) {
    if (!Array.isArray(values)) return [];
    return [...new Set(values.map((value) => bounded(value)).filter(Boolean))].sort().slice(0, max);
  }

  function getDayKey(state) {
    const day = Number(state?.freeMode?.postLiveDay);
    return Number.isInteger(day) && day > 0 ? `live+${day}` : "";
  }

  function normalizeStorytellerObservation(value = {}) {
    value = value && typeof value === "object" && !Array.isArray(value) ? value : {};
    const category = CATEGORIES.includes(value.category) ? value.category : "";
    const severity = SEVERITIES.includes(value.severity) ? value.severity : "";
    const resolvedCandidate = value.sourceKind === "resolved_candidate"
      ? Boolean(category && severity)
      : value.sourceKind === "ambient_turn"
        ? false
        : Boolean(category && severity);
    const styleId = resolvedCandidate && STYLE_IDS.includes(value.styleId) ? value.styleId : "";
    const operatorIds = resolvedCandidate && Array.isArray(value.operatorIds)
      ? [...new Set(value.operatorIds.map((item) => bounded(item, 80)).filter((item) => OPERATOR_IDS.has(item)))].sort().slice(0, 2)
      : [];
    return {
      schemaVersion: 3,
      sourceKind: resolvedCandidate ? "resolved_candidate" : "ambient_turn",
      saveScope: bounded(value.saveScope, 240),
      requestId: bounded(value.requestId, 160),
      turnId: bounded(value.turnId, 160),
      dayKey: bounded(value.dayKey, 120),
      timeMinutes: Number.isInteger(Number(value.timeMinutes)) ? Math.max(0, Number(value.timeMinutes)) : null,
      category: resolvedCandidate ? category : "",
      severity: resolvedCandidate ? severity : "",
      archetypeId: resolvedCandidate ? bounded(value.archetypeId, 100) : "",
      actionId: bounded(value.actionId, 100),
      locationId: bounded(value.locationId, 120),
      participantIds: uniqueSorted(value.participantIds),
      fingerprint: resolvedCandidate ? bounded(value.fingerprint, 360) : "",
      pressureCount: resolvedCandidate ? Math.max(0, Math.min(6, Math.floor(Number(value.pressureCount) || 0))) : 0,
      styleId,
      operatorIds
    };
  }

  function buildObservationSnapshot(state = {}, context = {}) {
    const observations = Array.isArray(state?.freeMode?.world?.storyteller?.observations)
      ? state.freeMode.world.storyteller.observations
      : [];
    return {
      schemaVersion: 1,
      saveScope: bounded(context.saveScope, 240),
      dayKey: getDayKey(state),
      timeMinutes: Number.isInteger(Number(state?.freeMode?.clockMinutes))
        ? Math.max(0, Number(state.freeMode.clockMinutes))
        : null,
      locationId: bounded(state?.freeMode?.activeLocationId, 120),
      participants: uniqueSorted(context.currentActors),
      recentScenes: observations.slice(-MAX_SCENES).map((item) => normalizeStorytellerObservation(item)).map((item) => ({
        dayKey: item.dayKey,
        category: item.category,
        severity: item.severity,
        fingerprint: item.fingerprint
      })).filter((item) => item.dayKey || item.category || item.fingerprint)
    };
  }

  function buildIncidentFingerprint(value = {}) {
    const actors = uniqueSorted(value.actorIds, 16).join(",");
    const modifiers = uniqueSorted(value.modifierIds, 8).join(",");
    return [
      bounded(value.category, 60),
      bounded(value.archetypeId, 100),
      actors,
      bounded(value.locationId, 120),
      modifiers
    ].join("|");
  }

  function buildRecentStorytellerStats(state = {}, options = {}) {
    const limit = Math.max(1, Math.min(MAX_SCENES, Number(options.limit) || MAX_SCENES));
    const records = Array.isArray(state?.freeMode?.world?.storyteller?.observations)
      ? state.freeMode.world.storyteller.observations.slice(-limit)
      : [];
    const categoryCounts = {};
    const severityCounts = { minor: 0, moderate: 0, major: 0 };
    const dayKeys = new Set();
    records.map((record) => normalizeStorytellerObservation(record)).forEach((record) => {
      const category = record.category;
      const severity = record.severity;
      if (category) categoryCounts[category] = (categoryCounts[category] || 0) + 1;
      if (SEVERITIES.includes(severity)) severityCounts[severity] += 1;
      if (bounded(record?.dayKey, 120)) dayKeys.add(record.dayKey);
    });
    return {
      calmDays: Math.max(0, dayKeys.size - severityCounts.major - severityCounts.moderate),
      majorEvents: severityCounts.major,
      moderateEvents: severityCounts.moderate,
      minorEvents: severityCounts.minor,
      categoryCounts,
      observedDays: dayKeys.size
    };
  }

  function ensureStorytellerState(state) {
    if (!state?.freeMode?.world || typeof state.freeMode.world !== "object") return null;
    const current = state.freeMode.world.storyteller && typeof state.freeMode.world.storyteller === "object"
      ? state.freeMode.world.storyteller
      : {};
    const storyteller = {
      ...current,
      schemaVersion: 3,
      observations: Array.isArray(current.observations)
        ? current.observations.map((item) => normalizeStorytellerObservation(item)).slice(-24)
        : [],
      recentFingerprints: Array.isArray(current.recentFingerprints) ? current.recentFingerprints.slice(-24) : [],
      lastObservedDayKey: bounded(current.lastObservedDayKey, 120)
    };
    state.freeMode.world.storyteller = storyteller;
    return storyteller;
  }

  function recordStorytellerObservation(state, observation = {}, saveScope = "", context = {}) {
    const requestedScope = bounded(saveScope, 240);
    const activeScope = bounded(context.activeSaveScope, 240);
    if (!requestedScope) return { recorded: false, reason: "save_scope_required" };
    if (!activeScope || requestedScope !== activeScope) return { recorded: false, reason: "save_scope_mismatch" };

    const storyteller = ensureStorytellerState(state);
    if (!storyteller) return { recorded: false, reason: "storyteller_state_unavailable" };

    const record = normalizeStorytellerObservation({
      ...observation,
      saveScope: requestedScope,
      dayKey: bounded(observation.dayKey, 120) || getDayKey(state),
      timeMinutes: Number.isInteger(Number(observation.timeMinutes))
        ? Math.max(0, Number(observation.timeMinutes))
        : Number.isInteger(Number(state?.freeMode?.clockMinutes))
          ? Math.max(0, Number(state.freeMode.clockMinutes))
          : null
    });
    if (record.requestId && storyteller.observations.some((item) => item?.requestId === record.requestId)) {
      return { recorded: false, reason: "duplicate_request" };
    }

    storyteller.observations = [...storyteller.observations, record].slice(-24);
    if (record.fingerprint) {
      storyteller.recentFingerprints = [...storyteller.recentFingerprints, record.fingerprint].slice(-24);
    }
    if (record.dayKey) storyteller.lastObservedDayKey = record.dayKey;
    return { recorded: true, reason: "recorded" };
  }

  global.HatsuWorldStorytellerObservations = {
    normalizeStorytellerObservation,
    buildObservationSnapshot,
    buildIncidentFingerprint,
    buildRecentStorytellerStats,
    recordStorytellerObservation
  };
})(typeof globalThis !== "undefined" ? globalThis : window);

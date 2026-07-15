(function (global) {
  "use strict";

  const PACING = ["calm", "normal", "tense", "crisis_allowed"];
  const STATUSES = ["prepared", "committed", "retryable_failed", "expired"];
  const CATEGORIES = ["hostile", "environment", "resource", "visitor", "task", "opportunity"];
  const DEFAULT_WEIGHTS = Object.freeze({
    hostile: 20,
    environment: 25,
    resource: 30,
    visitor: 30,
    task: 30,
    opportunity: 35
  });
  const EVENT_DENSITY_PRESETS = Object.freeze({
    low: Object.freeze({ minor: 3, moderate: 2, major: 1 }),
    standard: Object.freeze({ minor: 4, moderate: 3, major: 1 }),
    high: Object.freeze({ minor: 6, moderate: 3, major: 1 })
  });

  function bounded(value, max = 160) {
    const text = String(value || "").replace(/\s+/g, " ").trim();
    return Array.from(text).slice(0, max).join("");
  }

  function boundedInt(value, min, max, fallback = min) {
    const number = Number(value);
    if (!Number.isFinite(number)) return fallback;
    return Math.max(min, Math.min(max, Math.round(number)));
  }

  function stableHash(value) {
    let hash = 2166136261;
    for (const char of String(value || "")) {
      hash ^= char.codePointAt(0);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(36);
  }

  function defaultDiversity() {
    return {
      avoidCategoryStreak: 2,
      avoidArchetypeStreak: 2,
      preferUnusedCategories: true,
      actorDailyLimit: 2,
      locationDailyLimit: 2,
      majorCooldownDays: 2
    };
  }

  function normalizeEventDensityConfig(value) {
    const source = value && typeof value === "object" ? value : {};
    const mode = ["low", "standard", "high", "custom"].includes(source.mode)
      ? source.mode
      : "standard";
    const raw = source.customBudget && typeof source.customBudget === "object"
      ? source.customBudget
      : {};
    const values = [Number(raw.minor), Number(raw.moderate), Number(raw.major)];
    const customIsValid = values.every(Number.isInteger)
      && values[0] >= 0
      && values[1] >= 0
      && values[2] >= 0
      && values[2] <= 1
      && values[0] + values[1] >= 5
      && values[0] + values[1] <= 12;
    if (mode === "custom" && !customIsValid) {
      return { mode: "standard", customBudget: { ...EVENT_DENSITY_PRESETS.standard } };
    }
    return {
      mode,
      customBudget: customIsValid
        ? { minor: values[0], moderate: values[1], major: values[2] }
        : { ...EVENT_DENSITY_PRESETS.standard }
    };
  }

  function resolveEventDensityBudget(config, pacing = "normal") {
    const normalized = normalizeEventDensityConfig(config);
    const selected = normalized.mode === "custom"
      ? normalized.customBudget
      : EVENT_DENSITY_PRESETS[normalized.mode];
    return {
      minor: selected.minor,
      moderate: selected.moderate,
      major: pacing === "crisis_allowed" ? selected.major : 0
    };
  }

  function defaultStorytellerPlan(dayKey = "", saveScope = "", styleMix, styleMixRevision = 0, eventDensityConfig) {
    const normalizedDayKey = bounded(dayKey, 120);
    const normalizedScope = bounded(saveScope, 160);
    const seed = bounded(`${normalizedDayKey}|${normalizedScope}`, 160);
    const styles = global.HatsuWorldStorytellerStyles;
    const normalizedMix = styles?.normalizeMix
      ? styles.normalizeMix(styleMix)
      : { heroic: 60, romance: 40, kaibunsho: 0 };
    const normalizedStyleRevision = boundedInt(styleMixRevision, 0, Number.MAX_SAFE_INTEGER, 0);
    const identity = JSON.stringify({ seed, styleMix: normalizedMix, styleMixRevision: normalizedStyleRevision });
    return {
      schemaVersion: 2,
      planId: normalizedDayKey && normalizedScope ? `story:${normalizedDayKey}:${stableHash(identity)}` : "",
      dayKey: normalizedDayKey,
      saveScope: normalizedScope,
      seed,
      pacing: "normal",
      categoryWeights: { ...DEFAULT_WEIGHTS },
      severityBudget: resolveEventDensityBudget(eventDensityConfig, "normal"),
      diversity: defaultDiversity(),
      styleMix: normalizedMix,
      styleMixRevision: normalizedStyleRevision,
      generatedByJobId: "",
      status: "prepared",
      reason: ""
    };
  }

  function normalizeStorytellerPlan(value) {
    if (!value || typeof value !== "object") {
      return { ...defaultStorytellerPlan(), status: "expired" };
    }
    const styleAware = value.schemaVersion === 2 || value.styleMix != null || value.styleMixRevision != null;
    const base = defaultStorytellerPlan(value.dayKey, value.saveScope, value.styleMix, value.styleMixRevision);
    const weights = {};
    CATEGORIES.forEach((category) => {
      weights[category] = boundedInt(value.categoryWeights?.[category], 0, 100, base.categoryWeights[category]);
    });
    return {
      schemaVersion: styleAware ? 2 : 1,
      planId: bounded(value.planId, 160) || base.planId,
      dayKey: bounded(value.dayKey, 120),
      saveScope: bounded(value.saveScope, 160),
      seed: bounded(value.seed, 160) || base.seed,
      pacing: PACING.includes(value.pacing) ? value.pacing : "normal",
      categoryWeights: weights,
      severityBudget: {
        minor: boundedInt(value.severityBudget?.minor, 0, 12, base.severityBudget.minor),
        moderate: boundedInt(value.severityBudget?.moderate, 0, 12, base.severityBudget.moderate),
        major: boundedInt(value.severityBudget?.major, 0, 1, base.severityBudget.major)
      },
      diversity: {
        avoidCategoryStreak: boundedInt(value.diversity?.avoidCategoryStreak, 1, 4, 2),
        avoidArchetypeStreak: boundedInt(value.diversity?.avoidArchetypeStreak, 1, 4, 2),
        preferUnusedCategories: value.diversity?.preferUnusedCategories !== false,
        actorDailyLimit: boundedInt(value.diversity?.actorDailyLimit, 1, 4, 2),
        locationDailyLimit: boundedInt(value.diversity?.locationDailyLimit, 1, 4, 2),
        majorCooldownDays: boundedInt(value.diversity?.majorCooldownDays, 1, 7, 2)
      },
      styleMix: styleAware ? base.styleMix : null,
      styleMixRevision: styleAware ? base.styleMixRevision : null,
      generatedByJobId: bounded(value.generatedByJobId, 160),
      status: STATUSES.includes(value.status) ? value.status : "prepared",
      reason: bounded(value.reason, 120)
    };
  }

  function buildStorytellerPlan(input = {}) {
    const dayKey = bounded(input.dayKey, 120);
    const saveScope = bounded(input.saveScope, 160);
    const stats = input.stats && typeof input.stats === "object" ? input.stats : {};
    const observedDays = boundedInt(stats.observedDays, 0, 30, 0);
    const seed = bounded(input.seed, 160) || bounded(`${dayKey}|${saveScope}`, 160);
    const densityConfig = normalizeEventDensityConfig(input.eventDensityConfig);
    const base = defaultStorytellerPlan(dayKey, saveScope, input.styleMix, input.styleMixRevision, densityConfig);
    if (!dayKey || !saveScope || observedDays === 0) {
      return normalizeStorytellerPlan({ ...base, seed, status: "committed" });
    }

    const calmDays = boundedInt(stats.calmDays, 0, 30, 0);
    const majorEvents = boundedInt(stats.majorEvents, 0, 30, 0);
    const moderateEvents = boundedInt(stats.moderateEvents, 0, 30, 0);
    const categoryCounts = stats.categoryCounts && typeof stats.categoryCounts === "object" ? stats.categoryCounts : {};
    const weights = { ...DEFAULT_WEIGHTS };
    if (calmDays >= 2) {
      weights.resource += 15;
      weights.visitor += 15;
      weights.opportunity += 15;
    }
    CATEGORIES.forEach((category) => {
      const count = boundedInt(categoryCounts[category], 0, 30, 0);
      if (count >= 2) weights[category] = Math.max(5, weights[category] - Math.min(20, count * 5));
      if (count === 0) weights[category] = Math.min(100, weights[category] + 10);
    });
    const pacing = moderateEvents >= 2 && majorEvents === 0
      ? "crisis_allowed"
      : moderateEvents >= 1
        ? "tense"
        : calmDays >= 3
          ? "calm"
          : "normal";
    const identity = JSON.stringify({
      dayKey,
      saveScope,
      seed,
      stats,
      recentFingerprints: input.recentFingerprints || [],
      eventDensityConfig: densityConfig,
      styleMix: base.styleMix,
      styleMixRevision: base.styleMixRevision
    });
    return normalizeStorytellerPlan({
      ...base,
      planId: `story:${dayKey}:${stableHash(identity)}`,
      seed,
      pacing,
      categoryWeights: weights,
      severityBudget: resolveEventDensityBudget(densityConfig, pacing),
      generatedByJobId: bounded(input.generatedByJobId, 160),
      status: "committed"
    });
  }

  function isCurrentStorytellerPlan(plan, dayKey, saveScope) {
    const normalized = normalizeStorytellerPlan(plan);
    return normalized.status === "committed"
      && normalized.dayKey === bounded(dayKey, 120)
      && normalized.saveScope === bounded(saveScope, 160)
      && Boolean(normalized.planId);
  }

  global.HatsuWorldStorytellerPlan = {
    EVENT_DENSITY_PRESETS,
    normalizeEventDensityConfig,
    resolveEventDensityBudget,
    defaultStorytellerPlan,
    normalizeStorytellerPlan,
    buildStorytellerPlan,
    isCurrentStorytellerPlan
  };
})(typeof globalThis !== "undefined" ? globalThis : window);

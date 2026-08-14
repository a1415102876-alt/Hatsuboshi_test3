(function (global) {
  "use strict";

  const STYLE_IDS = Object.freeze(["heroic", "romance", "kaibunsho"]);
  const ACTIVE_STYLE_IDS = Object.freeze(["heroic", "romance"]);
  const DEFAULT_MIX = Object.freeze({ heroic: 60, romance: 40, kaibunsho: 0 });

  function boundedText(value, max = 120) {
    return Array.from(String(value || "").trim()).slice(0, max).join("");
  }

  function boundedRevision(value) {
    const number = Number(value);
    return Number.isInteger(number) && number >= 0 ? number : 0;
  }

  function getNextDayKey(value) {
    const dayKey = boundedText(value);
    const match = dayKey.match(/^(live\+|campus\+|produce\+)(\d+)$/);
    if (!match) return "";
    return `${match[1]}${Number(match[2]) + 1}`;
  }

  function defaultStyleMix() {
    return { ...DEFAULT_MIX };
  }

  function isValidMix(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return false;
    const heroic = Number(value.heroic);
    const romance = Number(value.romance);
    const kaibunsho = Number(value.kaibunsho);
    return [heroic, romance, kaibunsho].every((item) => (
      Number.isInteger(item) && item >= 0 && item <= 100 && item % 5 === 0
    )) && heroic + romance + kaibunsho === 100 && kaibunsho === 0;
  }

  function normalizeMix(value, fallback = DEFAULT_MIX) {
    const safeFallback = isValidMix(fallback) ? fallback : DEFAULT_MIX;
    return isValidMix(value)
      ? { heroic: Number(value.heroic), romance: Number(value.romance), kaibunsho: 0 }
      : { heroic: Number(safeFallback.heroic), romance: Number(safeFallback.romance), kaibunsho: 0 };
  }

  function sameMix(left, right) {
    return STYLE_IDS.every((id) => Number(left?.[id]) === Number(right?.[id]));
  }

  function defaultStyleConfig(dayKey = "") {
    return {
      schemaVersion: 1,
      activeMix: defaultStyleMix(),
      pendingMix: defaultStyleMix(),
      styleMixRevision: 0,
      activeFromDayKey: boundedText(dayKey),
      pendingActivationDayKey: "",
      legacyUntilDayChange: false
    };
  }

  function defaultStyleStreak() {
    return { styleId: "", committedCount: 0, penaltyArmed: false };
  }

  function normalizeStyleConfig(value, options = {}) {
    const source = value && typeof value === "object" && !Array.isArray(value) ? value : null;
    const previous = options.previous && typeof options.previous === "object" ? options.previous : null;
    const currentDayKey = boundedText(options.currentDayKey);
    const nextDayKey = boundedText(options.nextDayKey);
    if (!source) {
      const created = defaultStyleConfig(currentDayKey);
      if (options.existingSave) {
        created.activeFromDayKey = "";
        created.pendingActivationDayKey = nextDayKey;
        created.legacyUntilDayChange = true;
      }
      return created;
    }
    const fallbackActive = isValidMix(previous?.activeMix) ? previous.activeMix : DEFAULT_MIX;
    const activeMix = normalizeMix(source.activeMix, fallbackActive);
    const fallbackPending = isValidMix(previous?.pendingMix) ? previous.pendingMix : activeMix;
    return {
      schemaVersion: 1,
      activeMix,
      pendingMix: normalizeMix(source.pendingMix, fallbackPending),
      styleMixRevision: boundedRevision(source.styleMixRevision),
      activeFromDayKey: boundedText(source.activeFromDayKey),
      pendingActivationDayKey: boundedText(source.pendingActivationDayKey),
      legacyUntilDayChange: Boolean(source.legacyUntilDayChange)
    };
  }

  function normalizeStyleStreak(value) {
    const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
    const styleId = ACTIVE_STYLE_IDS.includes(source.styleId) ? source.styleId : "";
    const committedCount = styleId
      ? Math.max(0, Math.min(99, Math.floor(Number(source.committedCount) || 0)))
      : 0;
    return {
      styleId,
      committedCount,
      penaltyArmed: Boolean(styleId && source.penaltyArmed)
    };
  }

  function setPendingMix(value, mix, activationDayKey) {
    const config = normalizeStyleConfig(value);
    const dayKey = boundedText(activationDayKey);
    if (!isValidMix(mix) || !dayKey) return config;
    return {
      ...config,
      pendingMix: normalizeMix(mix),
      pendingActivationDayKey: dayKey
    };
  }

  function activatePendingMix(value, dayKey) {
    const config = normalizeStyleConfig(value);
    const targetDayKey = boundedText(dayKey);
    const due = Boolean(targetDayKey && config.pendingActivationDayKey === targetDayKey);
    const changed = !sameMix(config.activeMix, config.pendingMix);
    if (!due || (!changed && !config.legacyUntilDayChange)) {
      return { config, activated: false };
    }
    return {
      activated: true,
      config: {
        ...config,
        activeMix: { ...config.pendingMix },
        styleMixRevision: config.styleMixRevision + (changed ? 1 : 0),
        activeFromDayKey: targetDayKey,
        pendingActivationDayKey: "",
        legacyUntilDayChange: false
      }
    };
  }

  function normalizeEligibleStyleWeights(mix, eligibleStyleIds, streak) {
    const normalizedMix = normalizeMix(mix);
    const eligible = [...new Set(Array.isArray(eligibleStyleIds) ? eligibleStyleIds : [])]
      .filter((styleId) => ACTIVE_STYLE_IDS.includes(styleId));
    const normalizedStreak = normalizeStyleStreak(streak);
    const raw = {};
    eligible.forEach((styleId) => {
      let weight = Number(normalizedMix[styleId]) || 0;
      if (normalizedStreak.penaltyArmed && normalizedStreak.styleId === styleId) weight /= 2;
      if (weight > 0) raw[styleId] = weight;
    });
    const total = Object.values(raw).reduce((sum, weight) => sum + weight, 0);
    const weights = {};
    if (total > 0) {
      Object.entries(raw).forEach(([styleId, weight]) => {
        weights[styleId] = Number(((weight / total) * 100).toFixed(4));
      });
    }
    return {
      weights,
      penaltyStyleId: normalizedStreak.penaltyArmed ? normalizedStreak.styleId : "",
      penaltyApplied: Boolean(
        normalizedStreak.penaltyArmed
        && normalizedStreak.styleId
        && Object.prototype.hasOwnProperty.call(raw, normalizedStreak.styleId)
      )
    };
  }

  function consumeStylePenalty(value) {
    const streak = normalizeStyleStreak(value);
    return streak.penaltyArmed ? { ...streak, penaltyArmed: false } : streak;
  }

  function recordCommittedStyle(value, styleId) {
    const streak = normalizeStyleStreak(value);
    if (!ACTIVE_STYLE_IDS.includes(styleId)) return streak;
    if (streak.styleId !== styleId) {
      return { styleId, committedCount: 1, penaltyArmed: false };
    }
    const committedCount = Math.min(99, streak.committedCount + 1);
    return {
      styleId,
      committedCount,
      penaltyArmed: committedCount === 2 ? true : streak.penaltyArmed
    };
  }

  global.HatsuWorldStorytellerStyles = {
    STYLE_IDS,
    ACTIVE_STYLE_IDS,
    defaultStyleMix,
    defaultStyleConfig,
    defaultStyleStreak,
    isValidMix,
    normalizeMix,
    normalizeStyleConfig,
    normalizeStyleStreak,
    normalizeEligibleStyleWeights,
    consumeStylePenalty,
    recordCommittedStyle,
    setPendingMix,
    activatePendingMix,
    getNextDayKey
  };
})(typeof globalThis !== "undefined" ? globalThis : window);

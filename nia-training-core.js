(function (root) {
  "use strict";

  const defaults = Object.freeze({
    active: false,
    fans: 0,
    fanTarget: 3000,
    actionIndex: 0,
    companionDay: null
  });

  const MAX_SUMMARY_LENGTH = 2000;
  const MAX_LOCATION_LENGTH = 120;
  const MAX_OPERATION_ID_LENGTH = 160;

  function nonNegativeInteger(value, fallback = 0) {
    const number = Number(value);
    if (!Number.isFinite(number)) return fallback;
    return Math.max(0, Math.floor(number));
  }

  function plainString(value, maxLength) {
    if (typeof value !== "string") return "";
    return value.trim().slice(0, maxLength);
  }

  function normalizeOperationIds(value) {
    const source = Array.isArray(value) ? value : [];
    const unique = [];
    for (let index = source.length - 1; index >= 0; index -= 1) {
      const id = plainString(source[index], MAX_OPERATION_ID_LENGTH);
      if (!id || unique.includes(id)) continue;
      unique.unshift(id);
    }
    return unique.slice(-12);
  }

  function normalizeCompanionDay(raw) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
    return {
      planDayIndex: nonNegativeInteger(raw.planDayIndex),
      periodIndex: Math.min(2, nonNegativeInteger(raw.periodIndex)),
      morningSummary: plainString(raw.morningSummary, MAX_SUMMARY_LENGTH),
      afternoonSummary: plainString(raw.afternoonSummary, MAX_SUMMARY_LENGTH),
      campusLocationId: plainString(raw.campusLocationId, MAX_LOCATION_LENGTH),
      processedOperationIds: normalizeOperationIds(raw.processedOperationIds)
    };
  }

  function normalizeNiaTraining(raw) {
    const source = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
    return {
      active: Boolean(source.active),
      fans: nonNegativeInteger(source.fans),
      fanTarget: nonNegativeInteger(source.fanTarget, defaults.fanTarget) || defaults.fanTarget,
      actionIndex: nonNegativeInteger(source.actionIndex),
      companionDay: normalizeCompanionDay(source.companionDay)
    };
  }

  function getFanProgress(fans, target) {
    const current = nonNegativeInteger(fans);
    const goal = nonNegativeInteger(target);
    if (!goal) return 0;
    return Math.min(100, Math.max(0, (current / goal) * 100));
  }

  function applyNiaTrainingGainMultiplier(gain, isActiveNiaTraining) {
    const normalized = nonNegativeInteger(gain);
    return isActiveNiaTraining ? normalized * 2 : normalized;
  }

  function inferTrainingAttribute(entry) {
    const text = [entry?.attribute, entry?.title, entry?.purpose, entry?.output]
      .filter(Boolean)
      .join(" ");
    if (/\bDa\b|舞蹈/i.test(text)) return "Da";
    if (/\bVi\b|表现|视觉/i.test(text)) return "Vi";
    return "Vo";
  }

  function mapNiaPlanAction(entry) {
    const type = String(entry?.type || "").trim();
    if (type === "营业") {
      return { action: "nia_business", label: "营业", attribute: null, color: "#f0a33a", icon: "UI/Business.png" };
    }
    if (type === "陪同训练") {
      const attribute = inferTrainingAttribute(entry);
      const colors = { Vo: "#ff4f9a", Da: "#26a9f4", Vi: "#cf9c08" };
      return { action: "training", label: `${attribute}陪同训练`, attribute, color: colors[attribute], icon: "" };
    }
    if (type === "制作人工作") {
      return { action: "nia_producer_work", label: "制作人工作", attribute: null, color: "#7064d8", icon: "" };
    }
    if (type === "外出") {
      return { action: "outing", label: "外出", attribute: null, color: "#20bca6", icon: "" };
    }
    return { action: "rest", label: type || "休息", attribute: null, color: "#20dfad", icon: "" };
  }

  function isCompanionTrainingPlanDay(entry) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) return false;
    const type = String(entry.type || "").trim();
    if (/制作人工作/.test(type)) return false;
    return type === "陪同训练" || type === "陪同训练日";
  }

  function getCurrentNiaPlanAction(nia) {
    const training = normalizeNiaTraining(nia?.training);
    const days = Array.isArray(nia?.plan?.days) ? nia.plan.days : [];
    if (!training.active) return null;
    return days[training.actionIndex] || null;
  }

  function matchesNiaOrdinaryPlanAction(nia, pendingAction) {
    const current = getCurrentNiaPlanAction(nia);
    if (!current) return false;
    const mapped = mapNiaPlanAction(current);
    const action = String(pendingAction?.action || "");
    if (!["training", "outing", "rest"].includes(mapped.action) || mapped.action !== action) return false;
    if (mapped.action === "training") {
      return String(mapped.attribute || "") === String(pendingAction?.attribute || "");
    }
    return true;
  }

  function advanceNiaOrdinaryPlanAction(nia, pendingAction) {
    const training = normalizeNiaTraining(nia?.training);
    if (!matchesNiaOrdinaryPlanAction(nia, pendingAction)) {
      return { completed: false, training };
    }
    return {
      completed: true,
      training: { ...training, actionIndex: training.actionIndex + 1 }
    };
  }

  function ensureCompanionTrainingDay(rawTraining) {
    const training = normalizeNiaTraining(rawTraining);
    if (training.companionDay?.planDayIndex === training.actionIndex) return training;
    return {
      ...training,
      companionDay: {
        planDayIndex: training.actionIndex,
        periodIndex: 0,
        morningSummary: "",
        afternoonSummary: "",
        campusLocationId: "",
        processedOperationIds: []
      }
    };
  }

  function getCompanionTrainingPhase(training) {
    const period = normalizeNiaTraining(training).companionDay?.periodIndex;
    if (period === 1) return "afternoon";
    if (period === 2) return "campus";
    return "morning";
  }

  function isCompanionTrainingPeriodAction(training, pendingAction) {
    const normalized = normalizeNiaTraining(training);
    const day = normalized.companionDay;
    if (!day || day.planDayIndex !== normalized.actionIndex) return false;
    const period = day.periodIndex;
    if (period !== 0 && period !== 1) return false;
    const action = String(pendingAction?.action || "");
    if (!["lesson", "training", "rest"].includes(action)) return false;
    if (action === "lesson" || action === "training") {
      return ["Vo", "Da", "Vi"].includes(String(pendingAction?.attribute || ""));
    }
    return true;
  }

  function completeCompanionTrainingPeriod(training, { operationId, summary } = {}) {
    const normalized = normalizeNiaTraining(training);
    const day = normalized.companionDay;
    const id = plainString(operationId, MAX_OPERATION_ID_LENGTH);
    if (!day || day.planDayIndex !== normalized.actionIndex || day.periodIndex > 1 || !id || day.processedOperationIds.includes(id)) {
      return { completed: false, training: normalized };
    }
    const nextDay = {
      ...day,
      periodIndex: day.periodIndex + 1,
      processedOperationIds: normalizeOperationIds([...day.processedOperationIds, id])
    };
    if (day.periodIndex === 0) nextDay.morningSummary = plainString(summary, MAX_SUMMARY_LENGTH);
    else nextDay.afternoonSummary = plainString(summary, MAX_SUMMARY_LENGTH);
    return { completed: true, training: { ...normalized, companionDay: nextDay } };
  }

  function completeCompanionTrainingCampusActivity(training, { operationId, locationId } = {}) {
    const normalized = normalizeNiaTraining(training);
    const day = normalized.companionDay;
    const id = plainString(operationId, MAX_OPERATION_ID_LENGTH);
    const location = plainString(locationId, MAX_LOCATION_LENGTH);
    if (!day || day.planDayIndex !== normalized.actionIndex || day.periodIndex !== 2 || !id || !location || day.processedOperationIds.includes(id)) {
      return { completed: false, training: normalized };
    }
    return {
      completed: true,
      training: {
        ...normalized,
        actionIndex: normalized.actionIndex + 1,
        companionDay: null
      }
    };
  }

  root.HatsuNiaTraining = Object.freeze({
    normalizeNiaTraining,
    getCurrentNiaPlanAction,
    mapNiaPlanAction,
    isCompanionTrainingPlanDay,
    getFanProgress,
    applyNiaTrainingGainMultiplier,
    matchesNiaOrdinaryPlanAction,
    advanceNiaOrdinaryPlanAction,
    ensureCompanionTrainingDay,
    getCompanionTrainingPhase,
    isCompanionTrainingPeriodAction,
    completeCompanionTrainingPeriod,
    completeCompanionTrainingCampusActivity
  });
})(typeof globalThis !== "undefined" ? globalThis : window);

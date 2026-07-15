(function (global) {
  "use strict";

  const MAX_DIRECTION_LENGTH = 240;
  const MAX_PRESSURE_SUMMARY_LENGTH = 180;
  const MAX_ERROR_LENGTH = 160;
  const MAX_RECEIPTS = 5;

  const PRESSURE_THEME_LABELS = {
    neglect: "忽视",
    trust: "信任",
    competition: "竞争",
    overwork: "过度投入",
    identity: "自我认同",
    public_rumor: "公开传闻",
    schedule_conflict: "日程冲突",
    unresolved_promise: "未兑现的约定",
    goal_block: "目标受阻",
    other: "其他"
  };

  const PRESSURE_STAGE_LABELS = {
    dormant: "潜伏",
    latent: "潜伏",
    emerging: "萌芽",
    building: "累积",
    pressing: "迫近",
    expressed: "显现",
    resolved: "已化解"
  };

  const RECEIPT_TRIGGER_LABELS = {
    day_change: "日切",
    manual: "手动重算"
  };

  const RECEIPT_STATUS_LABELS = {
    committed: "已提交",
    rejected: "已拒绝",
    retryable_failed: "可重试失败",
    failed: "失败"
  };

  function boundedText(value, maxLength) {
    const text = String(value || "").replace(/\s+/g, " ").trim();
    if (!text) return "";
    return Array.from(text).slice(0, maxLength).join("");
  }

  function boundedInteger(value, fallback = 0) {
    const number = Number(value);
    return Number.isInteger(number) && number >= 0 ? number : fallback;
  }

  function resolveActorLabel(actorId, resolver) {
    if (typeof resolver !== "function") return "未知对象";
    try {
      return boundedText(resolver(String(actorId || "")), 40) || "未知对象";
    } catch (error) {
      return "未知对象";
    }
  }

  function buildDirection(value, currentDayKey) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    const dayKey = boundedText(value.dayKey, 120);
    const tone = boundedText(value.tone, 120);
    const summary = boundedText(value.summary, MAX_DIRECTION_LENGTH);
    if (!dayKey || !tone || !summary) return null;
    const result = {
      dayKey,
      isCurrentDay: Boolean(currentDayKey) && dayKey === currentDayKey,
      tone,
      summary
    };
    if (Number.isInteger(Number(value.styleMixRevision)) && value.styleThreads && typeof value.styleThreads === "object") {
      const buildThread = (thread) => ({
        status: thread?.status === "active" ? "active" : "dormant",
        weight: Math.max(0, Math.min(100, boundedInteger(thread?.weight))),
        dramaticQuestion: boundedText(thread?.dramaticQuestion, 240),
        narrativeGoals: Array.isArray(thread?.narrativeGoals)
          ? thread.narrativeGoals.map((item) => boundedText(item, 180)).filter(Boolean).slice(0, 6)
          : [],
        dormantReason: boundedText(thread?.dormantReason, 160)
      });
      result.styleMixRevision = boundedInteger(value.styleMixRevision);
      result.styleThreads = {
        heroic: buildThread(value.styleThreads.heroic),
        romance: buildThread(value.styleThreads.romance),
        kaibunsho: null
      };
    }
    return result;
  }

  function buildPressureCards(value, resolveLabel) {
    if (!Array.isArray(value)) return [];
    return value
      .filter((item) => item && ["active", "suspended"].includes(item.status || "active") && item.stage !== "resolved")
      .map((item) => ({
        actorLabel: resolveActorLabel(item.actorId, resolveLabel),
        themeLabel: PRESSURE_THEME_LABELS[item.theme] || "其他",
        stageLabel: PRESSURE_STAGE_LABELS[item.stage] || "状态未明",
        intensity: Math.min(100, boundedInteger(item.intensity)),
        summary: boundedText(item.sourceSummary || item.dramaticNeed, MAX_PRESSURE_SUMMARY_LENGTH),
        status: item.status === "suspended" ? "suspended" : "active"
      }));
  }

  function buildReceipts(value) {
    if (!Array.isArray(value)) return [];
    return value.slice(-MAX_RECEIPTS).reverse().map((item) => ({
      createdAt: boundedInteger(item?.createdAt),
      triggerLabel: RECEIPT_TRIGGER_LABELS[item?.trigger] || "未知触发",
      resultLabel: RECEIPT_STATUS_LABELS[item?.status] || "状态未知"
    }));
  }

  function getLastError(activeJob, receipts) {
    const activeReason = activeJob?.status === "retryable_failed" ? activeJob.reason : "";
    if (activeReason) return boundedText(activeReason, MAX_ERROR_LENGTH);
    if (!Array.isArray(receipts) || receipts.length === 0) return "";
    const latest = receipts[receipts.length - 1];
    if (!["retryable_failed", "failed", "rejected"].includes(latest?.status)) return "";
    return boundedText(latest.reason, MAX_ERROR_LENGTH);
  }

  function buildViewModel(value, options = {}) {
    const available = Boolean(value && typeof value === "object" && !Array.isArray(value));
    const source = available ? value : {};
    const activeJob = source.activeJob && typeof source.activeJob === "object" ? source.activeJob : null;
    return {
      availability: !available ? "unavailable" : source.enabled === false ? "disabled" : "ready",
      direction: buildDirection(source.dailyDirection, boundedText(options.currentDayKey, 120)),
      pressures: buildPressureCards(source.pressures, options.resolveActorLabel),
      runtime: {
        enabled: available && source.enabled !== false,
        dirty: Boolean(source.dirty),
        jobStatus: boundedText(activeJob?.status, 40) || "idle",
        jobStartedAt: activeJob ? boundedInteger(activeJob.startedAt) || null : null,
        directorRevision: boundedInteger(source.directorRevision),
        chronicleRevision: boundedInteger(source.chronicleRevision),
        lastError: getLastError(activeJob, source.receipts),
        receipts: buildReceipts(source.receipts)
      }
    };
  }

  global.HatsuWorld = global.HatsuWorld || {};
  global.HatsuWorld.directorPhoneView = {
    buildViewModel,
    PRESSURE_THEME_LABELS,
    PRESSURE_STAGE_LABELS
  };
})(typeof globalThis !== "undefined" ? globalThis : window);

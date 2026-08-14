(function (root) {
  "use strict";

  const DESTINATIONS = Object.freeze(["游乐园", "购物中心", "商店街", "水族馆"]);
  const STATUSES = new Set([
    "idle",
    "ready",
    "selecting",
    "exploring",
    "completing",
    "completed",
    "retryable_failed"
  ]);
  const DAY_START_MINUTES = 10 * 60;
  const DAY_END_MINUTES = 22 * 60;

  function text(value, limit = 2000) {
    return typeof value === "string" ? value.trim().slice(0, limit) : "";
  }

  function clock(value, fallback = DAY_START_MINUTES) {
    const number = Number(value);
    if (!Number.isFinite(number)) return fallback;
    return Math.min(DAY_END_MINUTES, Math.max(DAY_START_MINUTES, Math.floor(number)));
  }

  function normalizeInterRoundOuting(raw) {
    const source = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
    const destination = DESTINATIONS.includes(source.destination) ? source.destination : "";
    const status = STATUSES.has(source.status) ? source.status : "idle";
    return {
      status,
      fromRound: Math.max(1, Math.floor(Number(source.fromRound) || 1)),
      toRound: Math.max(2, Math.floor(Number(source.toRound) || 2)),
      destination,
      venueId: text(source.venueId, 80),
      clockMinutes: clock(source.clockMinutes),
      completionRequestId: text(source.completionRequestId, 160),
      summary: text(source.summary),
      lastError: text(source.lastError, 500),
      settlementApplied: Boolean(source.settlementApplied),
      freeModeSnapshot: source.freeModeSnapshot && typeof source.freeModeSnapshot === "object" && !Array.isArray(source.freeModeSnapshot)
        ? JSON.parse(JSON.stringify(source.freeModeSnapshot))
        : null,
      startedAt: Math.max(0, Math.floor(Number(source.startedAt) || 0)),
      completedAt: Math.max(0, Math.floor(Number(source.completedAt) || 0))
    };
  }

  function prepareInterRoundOuting(raw, now = Date.now(), rounds = {}) {
    const current = normalizeInterRoundOuting(raw);
    const fromRound = Math.max(1, Math.floor(Number(rounds.fromRound) || current.fromRound));
    const toRound = Math.max(fromRound + 1, Math.floor(Number(rounds.toRound) || current.toRound));
    if (current.status !== "idle" && !(current.status === "completed" && current.toRound <= fromRound)) return current;
    return {
      ...normalizeInterRoundOuting({ fromRound, toRound }),
      status: "ready",
      startedAt: Math.max(0, Math.floor(Number(now) || 0))
    };
  }

  function beginDestinationSelection(raw) {
    const current = normalizeInterRoundOuting(raw);
    if (!["ready", "selecting", "retryable_failed"].includes(current.status)) return current;
    return { ...current, status: "selecting", lastError: "", completionRequestId: "" };
  }

  function startInterRoundOuting(raw, { destination, venueId = "", now = Date.now() } = {}) {
    const current = normalizeInterRoundOuting(raw);
    const chosen = text(destination, 40);
    // 外出进行中返回线路图后，允许切换到当天的另一个预设地点。
    // 这不会重置时钟或重复结算，只更新当前场景。
    if (!["ready", "selecting", "exploring", "retryable_failed"].includes(current.status) || !DESTINATIONS.includes(chosen)) {
      return { ok: false, runtime: current, reason: "invalid_destination" };
    }
    return {
      ok: true,
      runtime: {
        ...current,
        status: "exploring",
        destination: chosen,
        venueId: text(venueId, 80),
        clockMinutes: current.clockMinutes || DAY_START_MINUTES,
        completionRequestId: "",
        summary: "",
        lastError: "",
        settlementApplied: false,
        startedAt: current.startedAt || Math.max(0, Math.floor(Number(now) || 0)),
        completedAt: 0
      }
    };
  }

  function advanceInterRoundClock(raw, minutes) {
    const current = normalizeInterRoundOuting(raw);
    if (current.status !== "exploring") return { runtime: current, hitDayEnd: current.clockMinutes >= DAY_END_MINUTES };
    const delta = Math.max(0, Math.floor(Number(minutes) || 0));
    const nextClock = Math.min(DAY_END_MINUTES, current.clockMinutes + delta);
    return { runtime: { ...current, clockMinutes: nextClock }, hitDayEnd: nextClock >= DAY_END_MINUTES };
  }

  function beginInterRoundCompletion(raw, requestId) {
    const current = normalizeInterRoundOuting(raw);
    const id = text(requestId, 160);
    if (!["exploring", "retryable_failed"].includes(current.status) || !current.destination || !id) {
      return { ok: false, runtime: current };
    }
    return { ok: true, runtime: { ...current, status: "completing", completionRequestId: id, lastError: "" } };
  }

  function failInterRoundCompletion(raw, requestId, error) {
    const current = normalizeInterRoundOuting(raw);
    if (current.status !== "completing" || current.completionRequestId !== text(requestId, 160)) return current;
    return { ...current, status: "retryable_failed", completionRequestId: "", lastError: text(error, 500) || "外出收尾生成失败。" };
  }

  function completeInterRoundOuting(raw, { requestId, summary, now = Date.now() } = {}) {
    const current = normalizeInterRoundOuting(raw);
    const id = text(requestId, 160);
    if (current.status === "completed") return { completed: false, applySettlement: false, runtime: current };
    if (current.status !== "completing" || !id || current.completionRequestId !== id) {
      return { completed: false, applySettlement: false, runtime: current };
    }
    return {
      completed: true,
      applySettlement: !current.settlementApplied,
      runtime: {
        ...current,
        status: "completed",
        completionRequestId: "",
        summary: text(summary),
        lastError: "",
        settlementApplied: true,
        completedAt: Math.max(0, Math.floor(Number(now) || 0))
      }
    };
  }

  function enterNextRoundDraft(nia) {
    const source = nia && typeof nia === "object" && !Array.isArray(nia) ? nia : {};
    const outing = normalizeInterRoundOuting(source.interRoundOuting);
    if (Number(source.round) !== outing.fromRound || source.phase !== "inter_round_outing" || outing.status !== "completed") {
      return { transitioned: false, nia: source };
    }
    const training = source.training && typeof source.training === "object" ? source.training : {};
    // 制作人工作是按日生成的临时运行时，不能把第一轮工作日带入第二轮规划页。
    // 保留核心数值和企划历史，但清空旧日程、任务、回执及请求状态。
    const producerWork = {
      status: "idle",
      dayIndex: 0,
      periodIndex: 0,
      periods: [],
      tasks: [],
      backlog: [],
      documents: [],
      materials: [],
      contacts: [],
      terms: [],
      careerLog: [],
      risks: [],
      pendingDecision: null,
      activeRequest: null,
      processedOperationIds: [],
      processedReceiptIds: [],
      trainingSettled: false,
      radioPlan: null,
      radioSettledBusinessId: "",
      lastStory: "",
      lastError: "",
      updatedAt: 0
    };
    return {
      transitioned: true,
      nia: {
        ...source,
        round: outing.toRound,
        phase: "draft",
        plan: null,
        pendingReviewPlan: null,
        planStatus: "idle",
        producerWork,
        training: { ...training, active: false, actionIndex: 0, companionDay: null },
        activeRequest: null,
        lastError: ""
      }
    };
  }

  function enterSecondRoundDraft(nia) {
    const source = nia && typeof nia === "object" && !Array.isArray(nia) ? nia : {};
    const outing = normalizeInterRoundOuting(source.interRoundOuting);
    if (outing.fromRound !== 1 || outing.toRound !== 2) return { transitioned: false, nia: source };
    return enterNextRoundDraft(source);
  }

  function getPlanDisplayDay(round, actionIndex) {
    return Math.max(0, Math.floor(Number(actionIndex) || 0)) + (Number(round) >= 2 ? 2 : 1);
  }

  root.HatsuNiaRoundTransition = Object.freeze({
    DESTINATIONS,
    DAY_START_MINUTES,
    DAY_END_MINUTES,
    normalizeInterRoundOuting,
    prepareInterRoundOuting,
    beginDestinationSelection,
    startInterRoundOuting,
    advanceInterRoundClock,
    beginInterRoundCompletion,
    failInterRoundCompletion,
    completeInterRoundOuting,
    enterNextRoundDraft,
    enterSecondRoundDraft,
    getPlanDisplayDay
  });
})(typeof globalThis !== "undefined" ? globalThis : window);

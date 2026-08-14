(function initNiaScheduleShareCore(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.HatsuNiaScheduleShare = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createNiaScheduleShareCore() {
  "use strict";

  const STATUSES = new Set(["idle", "sending", "awaiting_reply", "retryable_failed", "completed"]);

  function text(value, limit = 2000) {
    return String(value == null ? "" : value).trim().slice(0, limit);
  }

  function normalizeDays(days) {
    const source = Array.isArray(days) ? days.slice(0, 5) : [];
    return source.map((day, index) => ({
      day: Math.max(1, Math.floor(Number(day?.day) || index + 1)),
      type: text(day?.type, 80),
      title: text(day?.title, 160),
      purpose: text(day?.purpose, 500)
    }));
  }

  function stablePlanId(plan) {
    const explicit = text(plan?.planId, 160);
    if (explicit) return explicit;
    const source = JSON.stringify({
      idol: text(plan?.idol, 80),
      round: Math.max(1, Math.floor(Number(plan?.round) || 1)),
      days: normalizeDays(plan?.days)
    });
    let hash = 2166136261;
    for (let index = 0; index < source.length; index += 1) {
      hash ^= source.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return "nia-plan-" + (hash >>> 0).toString(16).padStart(8, "0");
  }

  function createScheduleShareState() {
    return {
      status: "idle",
      planId: "",
      threadId: "",
      attachmentMessageId: "",
      replyMessageId: "",
      requestId: "",
      error: ""
    };
  }

  function normalizeScheduleShare(value, expectedPlanId = "") {
    const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
    const normalized = {
      status: STATUSES.has(source.status) ? source.status : "idle",
      planId: text(source.planId, 160),
      threadId: text(source.threadId, 160),
      attachmentMessageId: text(source.attachmentMessageId, 160),
      replyMessageId: text(source.replyMessageId, 160),
      requestId: text(source.requestId, 160),
      error: text(source.error, 500)
    };
    const scopedPlanId = text(expectedPlanId, 160);
    if (scopedPlanId && normalized.planId && normalized.planId !== scopedPlanId) {
      return createScheduleShareState();
    }
    return normalized;
  }

  function buildScheduleAttachment(plan) {
    const days = normalizeDays(plan?.days);
    if (days.length !== 5) throw new Error("A committed N.I.A. plan must contain exactly five days.");
    const round = Math.max(1, Math.floor(Number(plan?.round) || 1));
    const roundLabels = ["", "一", "二", "三"];
    const roundLabel = roundLabels[round] || String(round);
    return {
      schemaVersion: 1,
      kind: "nia_schedule_attachment",
      planId: stablePlanId(plan),
      title: `N.I.A 第${roundLabel}轮活动日程`,
      statusLabel: round >= 2 ? "第2日至第6日企划 · 已确认" : "5日企划 · 已确认",
      days
    };
  }

  function beginScheduleShare(value, input) {
    const current = normalizeScheduleShare(value, input?.planId);
    if (current.status === "completed") return current;
    return {
      ...current,
      status: "awaiting_reply",
      planId: text(input?.planId, 160),
      threadId: text(input?.threadId, 160),
      attachmentMessageId: text(input?.attachmentMessageId || current.attachmentMessageId, 160),
      replyMessageId: "",
      requestId: text(input?.requestId, 160),
      error: ""
    };
  }

  function matchesActive(current, input) {
    return current.planId === text(input?.planId, 160)
      && current.threadId === text(input?.threadId, 160)
      && current.requestId === text(input?.requestId, 160);
  }

  function markScheduleShareFailed(value, input) {
    const current = normalizeScheduleShare(value);
    if (!matchesActive(current, input) || current.status !== "awaiting_reply") return current;
    return { ...current, status: "retryable_failed", requestId: "", error: text(input?.error, 500) };
  }

  function completeScheduleShare(value, input) {
    const current = normalizeScheduleShare(value);
    if (current.status === "completed" || current.status !== "awaiting_reply" || !matchesActive(current, input)) return current;
    const replyMessageId = text(input?.replyMessageId, 160);
    if (!replyMessageId) return current;
    return { ...current, status: "completed", replyMessageId, requestId: "", error: "" };
  }

  function buildScheduleReactionPrompt(plan, options = {}) {
    const attachment = buildScheduleAttachment(plan);
    const idolName = text(options.idolName || plan?.idol || "担当偶像", 80);
    const schedule = attachment.days.map((day) => (
      "DAY " + day.day + "｜" + day.type + "｜" + day.title + "｜目的：" + day.purpose
    )).join("\n");
    return [
      "[初星育成系统：N.I.A 日程共享回应]",
      "",
      "当前聊天对象：" + idolName,
      "N.I.A 日程已经最终确认并发送给对方，不能修改、重排或重新解释。",
      "当前仍是 Day 1 开始前。以下全部是已确定的未来安排：",
      schedule,
      "",
      "任务：只生成 " + idolName + " 收到日程文件后的即时 LINE 回应。",
      "- 自然回应整体安排，并具体提及一到两个日程。",
      "- 必须正确区分各日活动，尤其不要混淆 DAY 3 与正式节目所在日。",
      "- 不得把未来活动写成今天正在发生，不得开始 Day 1。",
      "- 不推进时间，不修改数值，不结算，不提供选项，不代替制作人说话。",
      "",
      text(options.outputContract, 5000)
    ].join("\n");
  }

  return Object.freeze({
    createScheduleShareState,
    normalizeScheduleShare,
    buildScheduleAttachment,
    buildScheduleReactionPrompt,
    beginScheduleShare,
    markScheduleShareFailed,
    completeScheduleShare
  });
});

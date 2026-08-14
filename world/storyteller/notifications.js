(function (global) {
  "use strict";

  const REASONS = new Set(["time_advance", "map_complete", "open_sns", "open_world_engine"]);
  const DEFER_MINUTES = 60;
  const DEFAULT_EXPIRY_MINUTES = 1440;

  function bounded(value, max = 60) {
    return Array.from(String(value || "").replace(/\s+/g, " ").trim()).slice(0, max).join("");
  }

  function nullableMinute(value) {
    if (value === null || value === undefined || value === "") return null;
    const number = Number(value);
    return Number.isFinite(number) ? Math.max(0, Math.round(number)) : null;
  }

  function normalizeNotificationMeta(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    return {
      notifiedAtWorldMinute: nullableMinute(value.notifiedAtWorldMinute),
      deferredUntilWorldMinute: nullableMinute(value.deferredUntilWorldMinute),
      expiresAtWorldMinute: nullableMinute(value.expiresAtWorldMinute),
      notificationReason: REASONS.has(value.notificationReason) ? value.notificationReason : ""
    };
  }

  function buildStorytellerWorldMinute(value = {}) {
    const dayOrdinal = Math.max(0, Math.round(Number(value.dayOrdinal) || 0));
    const clockMinutes = Math.max(0, Math.min(1439, Math.round(Number(value.clockMinutes) || 0)));
    return dayOrdinal * 1440 + clockMinutes;
  }

  function exactOwner(candidate, context) {
    return String(candidate?.saveScope || "") === String(context.saveScope || "")
      && String(candidate?.dayKey || "") === String(context.dayKey || "")
      && String(candidate?.planId || "") === String(context.planId || "")
      && String(candidate?.sourceTurnId || "") === String(context.sourceTurnId || "");
  }

  function getNotificationBadgeState(candidate, worldMinute) {
    const status = String(candidate?.status || "");
    if (!candidate || !["notified", "deferred"].includes(status)) return { visible: false, reason: "not_notified" };
    const meta = normalizeNotificationMeta(candidate.notification);
    if (!meta) return { visible: status === "notified", reason: "metadata_missing" };
    const now = nullableMinute(worldMinute) ?? 0;
    if (meta.expiresAtWorldMinute !== null && now >= meta.expiresAtWorldMinute) return { visible: false, reason: "expired" };
    if (status === "deferred" && meta.deferredUntilWorldMinute !== null && now < meta.deferredUntilWorldMinute) {
      return { visible: false, reason: "deferred" };
    }
    return { visible: true, reason: "visible" };
  }

  function canScanNotification(candidate) {
    if (!candidate) return { ok: true, reason: "empty" };
    return ["resolved", "expired", "abandoned"].includes(candidate.status)
      ? { ok: true, reason: "terminal" }
      : { ok: false, reason: "candidate_unresolved" };
  }

  function buildNotificationReceipt(value = {}) {
    return {
      event: bounded(value.event, 40),
      reason: bounded(value.reason, 80),
      dayKey: bounded(value.dayKey, 120),
      saveScope: bounded(value.saveScope, 240),
      createdAt: Number.isFinite(Number(value.createdAt)) ? Math.max(0, Math.round(Number(value.createdAt))) : 0
    };
  }

  function transitionNotification(rawCandidate, action, context = {}) {
    const incidentApi = global.HatsuWorldStorytellerIncidents;
    const candidate = incidentApi?.normalizeIncidentCandidate?.(rawCandidate);
    if (!candidate) return { ok: false, reason: "candidate_required", candidate: null };
    if (!exactOwner(candidate, context)) return { ok: false, reason: "candidate_ownership_mismatch", candidate };
    const worldMinute = nullableMinute(context.worldMinute) ?? 0;
    let nextStatus = "";
    let notification = normalizeNotificationMeta(candidate.notification);
    if (action === "notify" && candidate.status === "pending") {
      nextStatus = "notified";
      notification = {
        notifiedAtWorldMinute: worldMinute,
        deferredUntilWorldMinute: null,
        expiresAtWorldMinute: worldMinute + DEFAULT_EXPIRY_MINUTES,
        notificationReason: REASONS.has(context.reason) ? context.reason : ""
      };
    } else if (action === "defer" && candidate.status === "notified") {
      nextStatus = "deferred";
      notification = {
        ...(notification || {}),
        notifiedAtWorldMinute: notification?.notifiedAtWorldMinute ?? worldMinute,
        deferredUntilWorldMinute: worldMinute + DEFER_MINUTES,
        expiresAtWorldMinute: notification?.expiresAtWorldMinute ?? worldMinute + DEFAULT_EXPIRY_MINUTES,
        notificationReason: notification?.notificationReason || ""
      };
    } else if (action === "renotify" && candidate.status === "deferred") {
      nextStatus = "notified";
      notification = { ...(notification || {}), deferredUntilWorldMinute: null };
    } else if (action === "ignore" && ["notified", "deferred"].includes(candidate.status)) {
      nextStatus = "expired";
    } else if (action === "invite" && ["notified", "deferred"].includes(candidate.status)) {
      nextStatus = "invited";
    } else if (action === "resolve" && candidate.status === "invited") {
      nextStatus = "resolved";
    } else if (action === "abandon" && candidate.status === "invited") {
      nextStatus = "abandoned";
    } else {
      return { ok: false, reason: "invalid_transition", candidate };
    }
    return {
      ok: true,
      reason: nextStatus,
      candidate: incidentApi.normalizeIncidentCandidate({ ...candidate, status: nextStatus, notification })
    };
  }

  global.HatsuWorldStorytellerNotifications = {
    buildStorytellerWorldMinute,
    normalizeNotificationMeta,
    buildNotificationReceipt,
    getNotificationBadgeState,
    canScanNotification,
    transitionNotification
  };
})(typeof globalThis !== "undefined" ? globalThis : window);

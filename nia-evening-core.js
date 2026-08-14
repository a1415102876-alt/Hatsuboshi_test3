(function (root) {
  "use strict";

  const START_MINUTES = 22 * 60;
  const LAST_MINUTE = 24 * 60 - 1;
  const STATUSES = new Set(["idle", "active", "completed"]);

  function integer(value, fallback = 0) {
    const number = Number(value);
    return Number.isFinite(number) ? Math.floor(number) : fallback;
  }

  function normalizeEvening(raw) {
    const source = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
    return {
      status: STATUSES.has(source.status) ? source.status : "idle",
      dayIndex: Math.max(-1, integer(source.dayIndex, -1)),
      clockMinutes: Math.min(LAST_MINUTE, Math.max(START_MINUTES, integer(source.clockMinutes, START_MINUTES))),
      atApartment: Boolean(source.atApartment),
      companionIdol: String(source.companionIdol || "").trim().slice(0, 120),
      startedAt: Math.max(0, Number(source.startedAt) || 0),
      completedAt: Math.max(0, Number(source.completedAt) || 0)
    };
  }

  function activateEvening(raw, options = {}) {
    const current = normalizeEvening(raw);
    const completedDayIndex = Math.max(0, integer(options.completedDayIndex));
    if (current.dayIndex === completedDayIndex && current.status !== "idle") return current;
    return {
      status: "active",
      dayIndex: completedDayIndex,
      clockMinutes: START_MINUTES,
      atApartment: false,
      companionIdol: "",
      startedAt: Math.max(0, Number(options.now) || Date.now()),
      completedAt: 0
    };
  }

  function advanceEveningClock(raw, minutes) {
    const current = normalizeEvening(raw);
    if (current.status !== "active") return current;
    const delta = Math.max(0, integer(minutes));
    return { ...current, clockMinutes: Math.min(LAST_MINUTE, current.clockMinutes + delta) };
  }

  function setEveningCompanion(raw, idolName) {
    const current = normalizeEvening(raw);
    if (current.status !== "active") return current;
    return { ...current, companionIdol: String(idolName || "").trim().slice(0, 120) };
  }

  function enterEveningApartment(raw, idolName = "") {
    const current = normalizeEvening(raw);
    if (current.status !== "active") return current;
    return {
      ...current,
      atApartment: true,
      companionIdol: String(idolName || "").trim().slice(0, 120)
    };
  }

  function completeEvening(raw, options = {}) {
    const current = normalizeEvening(raw);
    const completedDayIndex = Math.max(0, integer(options.completedDayIndex, current.dayIndex));
    if (current.status !== "active" || current.dayIndex !== completedDayIndex) return current;
    return {
      ...current,
      status: "completed",
      atApartment: false,
      companionIdol: "",
      completedAt: Math.max(0, Number(options.now) || Date.now())
    };
  }

  function isEveningActive(raw) {
    return normalizeEvening(raw).status === "active";
  }

  root.HatsuNiaEvening = Object.freeze({
    START_MINUTES,
    normalizeEvening,
    activateEvening,
    advanceEveningClock,
    enterEveningApartment,
    setEveningCompanion,
    completeEvening,
    isEveningActive
  });
})(typeof globalThis !== "undefined" ? globalThis : window);

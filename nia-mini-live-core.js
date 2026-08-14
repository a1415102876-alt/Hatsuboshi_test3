(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.HatsuNiaMiniLive = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const STATUSES = Object.freeze([
    "idle", "selecting_venue", "generating", "playing", "retryable_failed", "settled"
  ]);
  const FAN_GAINS = Object.freeze({ none: 2000, small: 2500, medium: 3000, large: 4000 });
  const VENUES = Object.freeze({
    shopping_street: Object.freeze({
      id: "shopping_street",
      name: "商店街临时舞台",
      scene: "./assets/scenes/Shopping_Street.png",
      audience: "路过的居民、店主、购物中的学生与家庭客",
      challenge: "必须在流动人群中迅速抓住注意力"
    }),
    junior_school_auditorium: Object.freeze({
      id: "junior_school_auditorium",
      name: "初星学园中等部礼堂",
      scene: "./assets/scenes/Middle_School_Courtyard.png",
      audience: "中等部学生、教师与准备报考偶像科的后辈",
      challenge: "面对熟悉学园文化、观察细致的后辈观众"
    }),
    shopping_mall: Object.freeze({
      id: "shopping_mall",
      name: "购物中心中庭",
      scene: "./assets/scenes/Shopping_Mall.png",
      audience: "周末顾客、亲子家庭与临时停留的路人",
      challenge: "在嘈杂开放空间中维持舞台集中度"
    }),
    campus_courtyard: Object.freeze({
      id: "campus_courtyard",
      name: "初星学园校园中庭",
      scene: "./assets/scenes/courtyard.png",
      audience: "校内学生、同学和偶像科相关人员",
      challenge: "熟人观众多，细小失误与真实反应都会被放大"
    })
  });

  const object = (value) => value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const text = (value, limit = 1200) => String(value || "").trim().slice(0, limit);

  function normalizeLine(raw, index) {
    const source = object(raw);
    const type = source.type === "dialogue" ? "dialogue" : "narration";
    return {
      id: text(source.id, 120) || `mini-live-line-${index + 1}`,
      type,
      speaker: type === "dialogue" ? text(source.speaker, 160) : "",
      text: text(source.text, 1200)
    };
  }

  function createMiniLiveRuntime(options = {}) {
    const businessId = text(options.businessId, 160);
    const venueId = Object.prototype.hasOwnProperty.call(VENUES, options.venueId) ? options.venueId : "";
    return normalizeMiniLiveRuntime({
      businessId,
      venueId,
      status: businessId ? "selecting_venue" : "idle"
    });
  }

  function normalizeMiniLiveRuntime(raw) {
    const source = object(raw);
    const businessId = text(source.businessId, 160);
    const venueId = Object.prototype.hasOwnProperty.call(VENUES, source.venueId) ? source.venueId : "";
    const lines = Array.isArray(source.lines)
      ? source.lines.slice(0, 16).map(normalizeLine).filter((line) => line.text)
      : [];
    const result = source.result && typeof source.result === "object" && !Array.isArray(source.result)
      ? { ...source.result }
      : null;
    return {
      schemaVersion: 1,
      status: STATUSES.includes(source.status) ? source.status : (businessId ? "selecting_venue" : "idle"),
      businessId,
      venueId,
      title: text(source.title, 200),
      lines,
      playbackIndex: Math.min(lines.length, Math.max(0, Math.floor(Number(source.playbackIndex) || 0))),
      activeRequest: source.activeRequest ? { ...object(source.activeRequest) } : null,
      result,
      settledBusinessId: text(source.settledBusinessId, 160),
      progressionApplied: Boolean(source.progressionApplied),
      lastError: text(source.lastError, 500),
      updatedAt: Math.max(0, Number(source.updatedAt) || 0)
    };
  }

  function selectVenue(raw, venueId) {
    const runtime = normalizeMiniLiveRuntime(raw);
    if (runtime.status !== "selecting_venue") return { ok: false, reason: "illegal_status", runtime };
    if (!Object.prototype.hasOwnProperty.call(VENUES, venueId)) return { ok: false, reason: "invalid_venue", runtime };
    return {
      ok: true,
      runtime: { ...runtime, venueId, lastError: "", updatedAt: Date.now() }
    };
  }

  function beginGeneration(raw, request = {}) {
    const runtime = normalizeMiniLiveRuntime(raw);
    if (!runtime.businessId) return { ok: false, reason: "business_id_missing", runtime };
    if (!runtime.venueId) return { ok: false, reason: "venue_missing", runtime };
    if (!["selecting_venue", "retryable_failed"].includes(runtime.status)) return { ok: false, reason: "illegal_status", runtime };
    return {
      ok: true,
      runtime: {
        ...runtime,
        status: "generating",
        activeRequest: { ...object(request) },
        lastError: "",
        updatedAt: Date.now()
      }
    };
  }

  function applyPayload(raw, payload = {}) {
    const runtime = normalizeMiniLiveRuntime(raw);
    const source = object(payload);
    if (runtime.status !== "generating") return { ok: false, reason: "illegal_status", runtime };
    if (text(source.businessId, 160) !== runtime.businessId) return { ok: false, reason: "business_id_mismatch", runtime };
    if (text(source.venueId, 120) !== runtime.venueId) return { ok: false, reason: "venue_id_mismatch", runtime };
    const lines = Array.isArray(source.lines) ? source.lines.map(normalizeLine).filter((line) => line.text).slice(0, 16) : [];
    if (lines.length < 4) return { ok: false, reason: "lines_missing", runtime };
    const rawTier = source.bonusTier === "middle" ? "medium" : source.bonusTier;
    const tier = Object.prototype.hasOwnProperty.call(FAN_GAINS, rawTier) ? rawTier : "none";
    const result = {
      fanGain: FAN_GAINS[tier],
      bonusTier: tier,
      highlight: text(source.highlight, 600),
      audienceResponse: text(source.audienceResponse, 600),
      impressionChange: text(source.impressionChange, 600),
      bonusReason: text(source.bonusReason, 600),
      resultSummary: text(source.resultSummary, 1000)
    };
    return {
      ok: true,
      runtime: {
        ...runtime,
        status: "playing",
        title: text(source.title, 200) || VENUES[runtime.venueId].name + "迷你演出",
        lines,
        playbackIndex: 0,
        activeRequest: null,
        result,
        lastError: "",
        updatedAt: Date.now()
      }
    };
  }

  function advancePlayback(raw) {
    const runtime = normalizeMiniLiveRuntime(raw);
    if (runtime.status !== "playing") return { ok: false, reason: "illegal_status", runtime };
    const nextIndex = Math.min(runtime.lines.length, runtime.playbackIndex + 1);
    const finished = nextIndex >= runtime.lines.length;
    return {
      ok: true,
      line: runtime.lines[runtime.playbackIndex] || null,
      finished,
      runtime: { ...runtime, playbackIndex: nextIndex, status: finished ? "settled" : "playing", updatedAt: Date.now() }
    };
  }

  function failGeneration(raw, message) {
    const runtime = normalizeMiniLiveRuntime(raw);
    return {
      ...runtime,
      status: "retryable_failed",
      activeRequest: null,
      lastError: text(message, 500) || "迷你演出生成失败，可以重试。",
      updatedAt: Date.now()
    };
  }

  function recoverInterruptedMiniLive(raw) {
    const runtime = normalizeMiniLiveRuntime(raw);
    return runtime.status === "generating"
      ? failGeneration(runtime, "上次生成被中断，可以重新生成整场迷你演出。")
      : runtime;
  }

  function settleMiniLiveOnce(raw, businessId) {
    const runtime = normalizeMiniLiveRuntime(raw);
    const id = text(businessId, 160);
    if (!id || id !== runtime.businessId) return { ok: false, reason: "business_id_mismatch", runtime };
    if (runtime.settledBusinessId === id) return { ok: false, reason: "already_settled", runtime };
    if (runtime.status !== "settled" || !runtime.result) return { ok: false, reason: "illegal_status", runtime };
    return {
      ok: true,
      result: { ...runtime.result },
      runtime: { ...runtime, settledBusinessId: id, updatedAt: Date.now() }
    };
  }

  return Object.freeze({
    STATUSES,
    FAN_GAINS,
    VENUES,
    createMiniLiveRuntime,
    normalizeMiniLiveRuntime,
    selectVenue,
    beginGeneration,
    applyPayload,
    advancePlayback,
    failGeneration,
    recoverInterruptedMiniLive,
    settleMiniLiveOnce
  });
});

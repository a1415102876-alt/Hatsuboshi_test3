(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.HatsuNiaLiveBusiness = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const LIVE_STATUSES = Object.freeze([
    "idle", "ready",
    "generating_1", "playing_1", "awaiting_continue_1",
    "generating_2", "playing_2", "awaiting_continue_2",
    "generating_3", "playing_3", "awaiting_producer_instruction",
    "generating_4", "playing_4", "awaiting_settlement",
    "retryable_failed", "settled"
  ]);
  const AUDIENCE_TRENDS = new Set(["down", "flat", "up", "surge"]);
  const HEAT_TRENDS = new Set(["down", "flat", "up"]);
  const PRESSURE_TRENDS = new Set(["relief", "flat", "up", "spike"]);
  const BONUS_FANS = Object.freeze({ none: 0, small: 200, medium: 500, large: 900 });

  const text = (value, limit = 1000) => String(value || "").trim().slice(0, limit);
  const integer = (value, min, max, fallback = min) => {
    const number = Number(value);
    return Number.isFinite(number) ? Math.min(max, Math.max(min, Math.floor(number))) : fallback;
  };
  const object = (value) => value && typeof value === "object" && !Array.isArray(value) ? value : {};

  function normalizeMetrics(raw) {
    const source = object(raw);
    const viewers = integer(source.viewers, 0, 9999999, 180);
    const heat = integer(source.heat, 0, 100, 12);
    return {
      viewers,
      peakViewers: Math.max(viewers, integer(source.peakViewers, 0, 9999999, viewers)),
      heat,
      peakHeat: Math.max(heat, integer(source.peakHeat, 0, 100, heat)),
      pressure: integer(source.pressure, 0, 100, 0)
    };
  }

  function createLiveRuntime(options = {}) {
    const audienceFans = integer(options.audienceFans, 0, 9999999, 0);
    const initialViewers = integer(180 + Math.round(audienceFans * 0.08), 120, 9999999, 180);
    return normalizeLiveRuntime({
      businessId: options.businessId,
      status: options.businessId ? "ready" : "idle",
      baseFans: options.baseFans,
      metrics: options.metrics || { viewers: initialViewers, peakViewers: initialViewers, heat: 12, peakHeat: 12, pressure: 0 }
    });
  }

  function normalizeLiveRuntime(raw) {
    const source = object(raw);
    const segments = Array.isArray(source.segments) ? source.segments.slice(0, 4).map((item) => object(item)) : [];
    const status = LIVE_STATUSES.includes(source.status) ? source.status : (text(source.businessId, 160) ? "ready" : "idle");
    return {
      schemaVersion: 1,
      businessId: text(source.businessId, 160),
      status,
      segmentIndex: integer(source.segmentIndex, 0, 4, segments.length),
      pendingSegmentIndex: integer(source.pendingSegmentIndex, 0, 4, 0),
      retrySegmentIndex: integer(source.retrySegmentIndex, 0, 4, 0),
      activeRequest: source.activeRequest ? { ...object(source.activeRequest) } : null,
      segments,
      continuity: Array.isArray(source.continuity) ? source.continuity.map((item) => text(item, 600)).filter(Boolean).slice(0, 4) : [],
      producerInstruction: text(source.producerInstruction, 1200),
      baseFans: integer(source.baseFans, 0, 9999999, 0),
      metrics: normalizeMetrics(source.metrics),
      settledBusinessId: text(source.settledBusinessId, 160),
      progressionApplied: Boolean(source.progressionApplied),
      result: source.result ? { ...object(source.result) } : null,
      lastError: text(source.lastError, 500),
      updatedAt: Math.max(0, Number(source.updatedAt) || 0)
    };
  }

  function expectedReadyStatus(segmentIndex) {
    if (segmentIndex === 1) return "ready";
    if (segmentIndex === 2) return "awaiting_continue_1";
    if (segmentIndex === 3) return "awaiting_continue_2";
    if (segmentIndex === 4) return "awaiting_producer_instruction";
    return "";
  }

  function beginSegmentGeneration(raw, segmentIndex, request = {}) {
    const runtime = normalizeLiveRuntime(raw);
    const index = integer(segmentIndex, 1, 4, 0);
    if (!runtime.businessId) return { ok: false, reason: "business_id_missing", runtime };
    if (runtime.status === "retryable_failed") {
      if (runtime.retrySegmentIndex !== index) return { ok: false, reason: "retry_segment_mismatch", runtime };
    } else if (runtime.status !== expectedReadyStatus(index)) {
      return { ok: false, reason: "illegal_status", runtime };
    }
    if (index === 4 && !runtime.producerInstruction) return { ok: false, reason: "producer_instruction_missing", runtime };
    return {
      ok: true,
      runtime: {
        ...runtime,
        status: `generating_${index}`,
        pendingSegmentIndex: index,
        retrySegmentIndex: 0,
        activeRequest: { ...object(request) },
        lastError: "",
        updatedAt: Date.now()
      }
    };
  }

  function applyTrendMetrics(rawMetrics, payload = {}) {
    const metrics = normalizeMetrics(rawMetrics);
    const audience = AUDIENCE_TRENDS.has(payload.audienceTrend) ? payload.audienceTrend : "flat";
    const heat = HEAT_TRENDS.has(payload.heatTrend) ? payload.heatTrend : "flat";
    const pressure = PRESSURE_TRENDS.has(payload.pressureTrend) ? payload.pressureTrend : "flat";
    const viewerFactor = { down: 0.82, flat: 1, up: 1.45, surge: 3 }[audience];
    const nextViewers = integer(Math.round(metrics.viewers * viewerFactor), 0, 9999999, metrics.viewers);
    const nextHeat = integer(metrics.heat + ({ down: -8, flat: 0, up: 12 }[heat]), 0, 100, metrics.heat);
    const nextPressure = integer(metrics.pressure + ({ relief: -12, flat: 0, up: 8, spike: 18 }[pressure]), 0, 100, metrics.pressure);
    return {
      viewers: nextViewers,
      peakViewers: Math.max(metrics.peakViewers, nextViewers),
      heat: nextHeat,
      peakHeat: Math.max(metrics.peakHeat, nextHeat),
      pressure: nextPressure
    };
  }

  function applySegmentPayload(raw, payload = {}) {
    const runtime = normalizeLiveRuntime(raw);
    const segment = object(payload);
    if (text(segment.businessId, 160) !== runtime.businessId) return { ok: false, reason: "business_id_mismatch", runtime };
    if (integer(segment.segmentIndex, 1, 4, 0) !== runtime.pendingSegmentIndex) return { ok: false, reason: "segment_index_mismatch", runtime };
    if (runtime.status !== `generating_${runtime.pendingSegmentIndex}`) return { ok: false, reason: "illegal_status", runtime };
    const index = runtime.pendingSegmentIndex;
    const segments = runtime.segments.slice();
    segments[index - 1] = { ...segment };
    const continuitySummary = text(segment.continuitySummary, 600);
    const continuity = runtime.continuity.slice(0, index - 1);
    if (continuitySummary) continuity[index - 1] = continuitySummary;
    return {
      ok: true,
      runtime: {
        ...runtime,
        status: `playing_${index}`,
        segmentIndex: index,
        pendingSegmentIndex: 0,
        activeRequest: null,
        segments,
        continuity,
        metrics: applyTrendMetrics(runtime.metrics, segment),
        lastError: "",
        updatedAt: Date.now()
      }
    };
  }

  function completeSegmentPlayback(raw) {
    const runtime = normalizeLiveRuntime(raw);
    const index = runtime.segmentIndex;
    if (runtime.status !== `playing_${index}`) return { ok: false, reason: "illegal_status", runtime };
    const status = index < 3 ? `awaiting_continue_${index}` : index === 3 ? "awaiting_producer_instruction" : "awaiting_settlement";
    return { ok: true, runtime: { ...runtime, status, updatedAt: Date.now() } };
  }

  function submitProducerInstruction(raw, instruction) {
    const runtime = normalizeLiveRuntime(raw);
    const value = text(instruction, 1200);
    if (runtime.status !== "awaiting_producer_instruction") return { ok: false, reason: "illegal_status", runtime };
    if (!value) return { ok: false, reason: "instruction_missing", runtime };
    return { ok: true, runtime: { ...runtime, producerInstruction: value, updatedAt: Date.now() } };
  }

  function recoverInterruptedLive(raw) {
    const runtime = normalizeLiveRuntime(raw);
    const match = runtime.status.match(/^generating_([1-4])$/);
    if (!match) return runtime;
    return {
      ...runtime,
      status: "retryable_failed",
      retrySegmentIndex: Number(match[1]),
      pendingSegmentIndex: 0,
      activeRequest: null,
      lastError: "页面已重新载入，请重新生成当前直播段落。",
      updatedAt: Date.now()
    };
  }

  function settleLiveOnce(raw, businessId) {
    const runtime = normalizeLiveRuntime(raw);
    const id = text(businessId, 160);
    if (!id || id !== runtime.businessId) return { ok: false, reason: "business_id_mismatch", runtime };
    if (runtime.status === "settled" || runtime.settledBusinessId === id) return { ok: false, reason: "already_settled", runtime };
    if (runtime.status !== "awaiting_settlement") return { ok: false, reason: "illegal_status", runtime };
    const finalSegment = object(runtime.segments[3]);
    const bonusTier = Object.prototype.hasOwnProperty.call(BONUS_FANS, finalSegment.bonusTier) ? finalSegment.bonusTier : "none";
    const result = {
      fans: runtime.baseFans + BONUS_FANS[bonusTier],
      bonusFans: BONUS_FANS[bonusTier],
      bonusTier,
      imageMatch: ["off", "partial", "strong"].includes(finalSegment.imageMatch) ? finalSegment.imageMatch : "partial",
      bonusReason: text(finalSegment.bonusReason, 500),
      publicImage: text(finalSegment.closingSummary, 500),
      pressure: runtime.metrics.pressure,
      peakViewers: runtime.metrics.peakViewers,
      peakHeat: runtime.metrics.peakHeat
    };
    return {
      ok: true,
      result,
      runtime: {
        ...runtime,
        status: "settled",
        settledBusinessId: id,
        result,
        updatedAt: Date.now()
      }
    };
  }

  return Object.freeze({
    LIVE_STATUSES,
    createLiveRuntime,
    normalizeLiveRuntime,
    beginSegmentGeneration,
    applySegmentPayload,
    completeSegmentPlayback,
    submitProducerInstruction,
    recoverInterruptedLive,
    applyTrendMetrics,
    settleLiveOnce
  });
});

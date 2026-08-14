(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.HatsuNiaTvBusiness = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const STATUSES = Object.freeze([
    "idle", "ready", "generating_1", "playing_1", "awaiting_continue_1",
    "generating_2", "playing_2", "awaiting_continue_2",
    "generating_3", "playing_3", "awaiting_producer_instruction",
    "generating_4", "playing_4", "awaiting_settlement", "retryable_failed", "settled"
  ]);
  const text = (value, limit = 1000) => String(value == null ? "" : value).trim().slice(0, limit);
  const object = (value) => value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const integer = (value, min, max, fallback = min) => {
    const number = Number(value);
    return Number.isFinite(number) ? Math.min(max, Math.max(min, Math.floor(number))) : fallback;
  };

  function normalizeTvRuntime(raw) {
    const source = object(raw);
    const businessId = text(source.businessId, 160);
    const segments = Array.isArray(source.segments) ? source.segments.slice(0, 4).map((item) => ({ ...object(item) })) : [];
    return {
      schemaVersion: 1,
      businessId,
      status: STATUSES.includes(source.status) ? source.status : (businessId ? "ready" : "idle"),
      segmentIndex: integer(source.segmentIndex, 0, 4, segments.length),
      pendingSegmentIndex: integer(source.pendingSegmentIndex, 0, 4, 0),
      retrySegmentIndex: integer(source.retrySegmentIndex, 0, 4, 0),
      activeRequest: source.activeRequest ? { ...object(source.activeRequest) } : null,
      segments,
      producerInstruction: text(source.producerInstruction, 1200),
      strategyId: text(source.strategyId, 80),
      selectedTopics: Array.isArray(source.selectedTopics) ? source.selectedTopics.map((item) => text(item, 160)).filter(Boolean).slice(0, 5) : [],
      baseFans: integer(source.baseFans, 0, 9999999, 0),
      settledBusinessId: text(source.settledBusinessId, 160),
      progressionApplied: Boolean(source.progressionApplied),
      result: source.result ? { ...object(source.result) } : null,
      lastError: text(source.lastError, 500),
      updatedAt: Math.max(0, Number(source.updatedAt) || 0)
    };
  }

  function createTvRuntime(options = {}) {
    return normalizeTvRuntime({ businessId: options.businessId, status: options.businessId ? "ready" : "idle", baseFans: options.baseFans, strategyId: options.strategyId, selectedTopics: options.selectedTopics });
  }

  function expectedStatus(index) {
    return index === 1 ? "ready" : index === 2 ? "awaiting_continue_1" : index === 3 ? "awaiting_continue_2" : "awaiting_producer_instruction";
  }

  function beginSegmentGeneration(raw, segmentIndex, request = {}) {
    const runtime = normalizeTvRuntime(raw);
    const index = integer(segmentIndex, 1, 4, 0);
    if (!runtime.businessId) return { ok: false, reason: "business_id_missing", runtime };
    if (runtime.status === "retryable_failed" ? runtime.retrySegmentIndex !== index : runtime.status !== expectedStatus(index)) return { ok: false, reason: "illegal_status", runtime };
    if (index === 4 && !runtime.producerInstruction) return { ok: false, reason: "producer_instruction_missing", runtime };
    return { ok: true, runtime: { ...runtime, status: `generating_${index}`, pendingSegmentIndex: index, retrySegmentIndex: 0, activeRequest: { ...object(request) }, lastError: "", updatedAt: Date.now() } };
  }

  function applySegmentPayload(raw, payload = {}) {
    const runtime = normalizeTvRuntime(raw); const segment = object(payload);
    if (text(segment.businessId, 160) !== runtime.businessId) return { ok: false, reason: "business_id_mismatch", runtime };
    if (integer(segment.segmentIndex, 1, 4, 0) !== runtime.pendingSegmentIndex || runtime.status !== `generating_${runtime.pendingSegmentIndex}`) return { ok: false, reason: "segment_mismatch", runtime };
    const segments = runtime.segments.slice(); segments[runtime.pendingSegmentIndex - 1] = { ...segment };
    return { ok: true, runtime: { ...runtime, status: `playing_${runtime.pendingSegmentIndex}`, segmentIndex: runtime.pendingSegmentIndex, pendingSegmentIndex: 0, activeRequest: null, segments, lastError: "", updatedAt: Date.now() } };
  }

  function completeSegmentPlayback(raw) {
    const runtime = normalizeTvRuntime(raw); const index = runtime.segmentIndex;
    if (runtime.status !== `playing_${index}`) return { ok: false, reason: "illegal_status", runtime };
    return { ok: true, runtime: { ...runtime, status: index < 3 ? `awaiting_continue_${index}` : index === 3 ? "awaiting_producer_instruction" : "awaiting_settlement", updatedAt: Date.now() } };
  }

  function submitProducerInstruction(raw, instruction) {
    const runtime = normalizeTvRuntime(raw); const value = text(instruction, 1200);
    if (runtime.status !== "awaiting_producer_instruction") return { ok: false, reason: "illegal_status", runtime };
    if (!value) return { ok: false, reason: "instruction_missing", runtime };
    return { ok: true, runtime: { ...runtime, producerInstruction: value, updatedAt: Date.now() } };
  }

  function recoverInterruptedTv(raw) {
    const runtime = normalizeTvRuntime(raw); const match = runtime.status.match(/^generating_([1-4])$/);
    return match ? { ...runtime, status: "retryable_failed", retrySegmentIndex: Number(match[1]), pendingSegmentIndex: 0, activeRequest: null, lastError: "电视节目生成被中断，请重试。" } : runtime;
  }

  function settleTvOnce(raw, businessId) {
    const runtime = normalizeTvRuntime(raw); const id = text(businessId, 160);
    if (!id || id !== runtime.businessId) return { ok: false, reason: "business_id_mismatch", runtime };
    if (runtime.status === "settled" || runtime.settledBusinessId === id) return { ok: false, reason: "already_settled", runtime };
    if (runtime.status !== "awaiting_settlement") return { ok: false, reason: "illegal_status", runtime };
    const final = object(runtime.segments[3]); const tier = ["none", "small", "medium", "large"].includes(final.bonusTier) ? final.bonusTier : "none";
    const bonus = { none: 0, small: 3000, medium: 4000, large: 5000 }[tier];
    const result = { fanGain: bonus, bonusTier: tier, highlight: text(final.highlight, 800), audienceResponse: text(final.audienceResponse, 800), impressionChange: text(final.impressionChange, 800), followupHook: text(final.followupHook, 800), resultSummary: text(final.resultSummary, 1000) };
    return { ok: true, result, runtime: { ...runtime, status: "settled", settledBusinessId: id, result, updatedAt: Date.now() } };
  }

  return Object.freeze({ STATUSES, createTvRuntime, normalizeTvRuntime, beginSegmentGeneration, applySegmentPayload, completeSegmentPlayback, submitProducerInstruction, recoverInterruptedTv, settleTvOnce });
});

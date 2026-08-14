(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.HatsuNiaRadioBusiness = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const RADIO_STATUSES = Object.freeze([
    "idle", "ready",
    "generating_1", "playing_1", "awaiting_continue_1",
    "generating_2", "playing_2", "awaiting_continue_2",
    "generating_3", "playing_3", "awaiting_producer_instruction",
    "generating_4", "playing_4", "awaiting_settlement",
    "retryable_failed", "settled"
  ]);

  const text = (value, limit = 1000) => String(value || "").trim().slice(0, limit);
  const integer = (value, min, max, fallback = min) => {
    const number = Number(value);
    return Number.isFinite(number) ? Math.min(max, Math.max(min, Math.floor(number))) : fallback;
  };
  const object = (value) => value && typeof value === "object" && !Array.isArray(value) ? value : {};

  function normalizePlan(raw, businessId) {
    const source = object(raw);
    const additionalGuestMode = ["random", "specified"].includes(source.additionalGuestMode)
      ? source.additionalGuestMode
      : "random";
    return {
      business_id: text(source.business_id || source.businessId || businessId, 160),
      programTitle: text(source.programTitle, 160),
      episodeTitle: text(source.episodeTitle, 200),
      goal: text(source.goal, 600),
      host: text(source.host, 120),
      guest: text(source.guest, 120),
      interviewFocus: text(source.interviewFocus, 600),
      additionalGuestMode,
      additionalGuest: text(source.additionalGuest, 120)
    };
  }

  function createRadioRuntime(options = {}) {
    return normalizeRadioRuntime({
      businessId: options.businessId,
      plan: options.plan,
      status: options.businessId ? "ready" : "idle",
      baseFans: options.baseFans
    });
  }

  function normalizeRadioRuntime(raw) {
    const source = object(raw);
    const businessId = text(source.businessId || object(source.plan).business_id, 160);
    const segments = Array.isArray(source.segments)
      ? source.segments.slice(0, 4).map((item) => ({ ...object(item) }))
      : [];
    return {
      schemaVersion: 1,
      businessId,
      plan: normalizePlan(source.plan, businessId),
      status: RADIO_STATUSES.includes(source.status) ? source.status : (businessId ? "ready" : "idle"),
      segmentIndex: integer(source.segmentIndex, 0, 4, segments.length),
      pendingSegmentIndex: integer(source.pendingSegmentIndex, 0, 4, 0),
      retrySegmentIndex: integer(source.retrySegmentIndex, 0, 4, 0),
      activeRequest: source.activeRequest ? { ...object(source.activeRequest) } : null,
      segments,
      playedLines: Array.isArray(source.playedLines)
        ? source.playedLines.map((line) => ({ ...object(line) })).slice(-120)
        : [],
      playbackLineIndex: integer(source.playbackLineIndex, 0, 16, 0),
      producerInstruction: text(source.producerInstruction, 1200),
      baseFans: integer(source.baseFans, 0, 9999999, 0),
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
    const runtime = normalizeRadioRuntime(raw);
    const index = integer(segmentIndex, 1, 4, 0);
    if (!runtime.businessId) return { ok: false, reason: "business_id_missing", runtime };
    if (runtime.status === "retryable_failed") {
      if (runtime.retrySegmentIndex !== index) return { ok: false, reason: "retry_segment_mismatch", runtime };
    } else if (runtime.status !== expectedReadyStatus(index)) {
      return { ok: false, reason: "illegal_status", runtime };
    }
    if (index === 4 && !runtime.producerInstruction) {
      return { ok: false, reason: "producer_instruction_missing", runtime };
    }
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

  function applySegmentPayload(raw, payload = {}) {
    const runtime = normalizeRadioRuntime(raw);
    const segment = object(payload);
    if (text(segment.businessId || segment.business_id, 160) !== runtime.businessId) {
      return { ok: false, reason: "business_id_mismatch", runtime };
    }
    if (integer(segment.segmentIndex || segment.segment_index, 1, 4, 0) !== runtime.pendingSegmentIndex) {
      return { ok: false, reason: "segment_index_mismatch", runtime };
    }
    if (runtime.status !== `generating_${runtime.pendingSegmentIndex}`) {
      return { ok: false, reason: "illegal_status", runtime };
    }
    const index = runtime.pendingSegmentIndex;
    const segments = runtime.segments.slice();
    segments[index - 1] = { ...segment, businessId: runtime.businessId, segmentIndex: index };
    return {
      ok: true,
      runtime: {
        ...runtime,
        status: `playing_${index}`,
        segmentIndex: index,
        pendingSegmentIndex: 0,
        activeRequest: null,
        segments,
        playbackLineIndex: 0,
        lastError: "",
        updatedAt: Date.now()
      }
    };
  }

  function completeSegmentPlayback(raw) {
    const runtime = normalizeRadioRuntime(raw);
    const index = runtime.segmentIndex;
    if (runtime.status !== `playing_${index}`) return { ok: false, reason: "illegal_status", runtime };
    const status = index < 3
      ? `awaiting_continue_${index}`
      : index === 3 ? "awaiting_producer_instruction" : "awaiting_settlement";
    return { ok: true, runtime: { ...runtime, status, playbackLineIndex: 0, updatedAt: Date.now() } };
  }

  function submitProducerInstruction(raw, instruction) {
    const runtime = normalizeRadioRuntime(raw);
    const value = text(instruction, 1200);
    if (runtime.status !== "awaiting_producer_instruction") {
      return { ok: false, reason: "illegal_status", runtime };
    }
    if (!value) return { ok: false, reason: "instruction_missing", runtime };
    return { ok: true, runtime: { ...runtime, producerInstruction: value, updatedAt: Date.now() } };
  }

  function recoverInterruptedRadio(raw) {
    const runtime = normalizeRadioRuntime(raw);
    const match = runtime.status.match(/^generating_([1-4])$/);
    if (!match) return runtime;
    return {
      ...runtime,
      status: "retryable_failed",
      retrySegmentIndex: Number(match[1]),
      pendingSegmentIndex: 0,
      activeRequest: null,
      lastError: "Generation was interrupted. Retry the current radio segment.",
      updatedAt: Date.now()
    };
  }

  function settleRadioOnce(raw, businessId) {
    const runtime = normalizeRadioRuntime(raw);
    const id = text(businessId, 160);
    if (!id || id !== runtime.businessId) return { ok: false, reason: "business_id_mismatch", runtime };
    if (runtime.status === "settled" || runtime.settledBusinessId === id) {
      return { ok: false, reason: "already_settled", runtime };
    }
    if (runtime.status !== "awaiting_settlement") return { ok: false, reason: "illegal_status", runtime };
    const finalSegment = object(runtime.segments[3]);
    const fanGain = integer(finalSegment.fanGain, 0, 3000, 0);
    const result = {
      fans: runtime.baseFans + fanGain,
      fanGain,
      highlight: text(finalSegment.highlight, 800),
      audienceResponse: text(finalSegment.audienceResponse, 800),
      impressionChange: text(finalSegment.impressionChange, 800),
      followupHook: text(finalSegment.followupHook, 800),
      resultSummary: text(finalSegment.resultSummary, 1000)
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
    RADIO_STATUSES,
    createRadioRuntime,
    normalizeRadioRuntime,
    beginSegmentGeneration,
    applySegmentPayload,
    completeSegmentPlayback,
    submitProducerInstruction,
    recoverInterruptedRadio,
    settleRadioOnce
  });
});

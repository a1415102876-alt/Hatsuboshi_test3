(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.HatsuNiaSnsBusiness = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const SNS_POST_STATUSES = Object.freeze([
    "idle", "composing", "generating_post", "awaiting_interaction",
    "generating_result", "retryable_failed", "settled"
  ]);
  const BONUS_FANS = Object.freeze({ none: 0, small: 2000, medium: 3000, large: 4000 });
  const IMAGE_MATCHES = new Set(["off", "partial", "strong"]);
  const INTERACTION_ACTIONS = new Set(["reply", "like", "none"]);

  const text = (value, limit = 1000) => String(value || "").trim().slice(0, limit);
  const integer = (value, min, max, fallback = min) => {
    const number = Number(value);
    return Number.isFinite(number) ? Math.min(max, Math.max(min, Math.floor(number))) : fallback;
  };
  const object = (value) => value && typeof value === "object" && !Array.isArray(value) ? value : {};

  function normalizeDraft(raw) {
    const source = object(raw);
    const mode = source.mode === "ai_expand" ? "ai_expand" : "manual";
    return {
      mode,
      imageId: text(source.imageId, 120),
      topic: text(source.topic, 240),
      manualText: text(source.manualText, 2000),
      customImageDescription: text(source.customImageDescription, 500)
    };
  }

  function normalizePost(raw) {
    const source = object(raw);
    const comments = Array.isArray(source.comments) ? source.comments.slice(0, 6).map((comment) => {
      const item = object(comment);
      return { id: text(item.id, 120), author: text(item.author, 120) || "匿名观众", text: text(item.text, 800), tone: text(item.tone, 80) };
    }).filter((comment) => comment.id && comment.text) : [];
    return { postText: text(source.postText, 2000), comments };
  }

  function normalizeInteraction(raw) {
    const source = object(raw);
    return {
      commentId: text(source.commentId, 120),
      action: INTERACTION_ACTIONS.has(source.action) ? source.action : "",
      replyText: text(source.replyText, 500)
    };
  }

  function createSnsPostRuntime(options = {}) {
    return normalizeSnsPostRuntime({
      businessId: options.businessId,
      status: options.businessId ? "composing" : "idle",
      baseFans: options.baseFans
    });
  }

  function normalizeSnsPostRuntime(raw) {
    const source = object(raw);
    const businessId = text(source.businessId, 160);
    return {
      schemaVersion: 1,
      businessId,
      status: SNS_POST_STATUSES.includes(source.status) ? source.status : (businessId ? "composing" : "idle"),
      draft: normalizeDraft(source.draft),
      post: normalizePost(source.post),
      interaction: normalizeInteraction(source.interaction),
      retryStage: ["post", "result"].includes(source.retryStage) ? source.retryStage : "",
      activeRequest: source.activeRequest ? { ...object(source.activeRequest) } : null,
      baseFans: integer(source.baseFans, 0, 9999999, 0),
      settledBusinessId: text(source.settledBusinessId, 160),
      progressionApplied: Boolean(source.progressionApplied),
      result: source.result ? { ...object(source.result) } : null,
      lastError: text(source.lastError, 500),
      updatedAt: Math.max(0, Number(source.updatedAt) || 0)
    };
  }

  function draftError(draft) {
    if (!draft.imageId) return "image_missing";
    if (draft.mode === "ai_expand" && !draft.topic) return "topic_missing";
    if (draft.mode === "manual" && !draft.manualText) return "manual_text_missing";
    return "";
  }

  function beginPostGeneration(raw, draft, request = {}) {
    const runtime = normalizeSnsPostRuntime(raw);
    if (!runtime.businessId) return { ok: false, reason: "business_id_missing", runtime };
    if (runtime.status !== "composing" && !(runtime.status === "retryable_failed" && runtime.retryStage === "post")) {
      return { ok: false, reason: "illegal_status", runtime };
    }
    const nextDraft = runtime.status === "retryable_failed" ? runtime.draft : normalizeDraft(draft);
    const reason = draftError(nextDraft);
    if (reason) return { ok: false, reason, runtime };
    return {
      ok: true,
      runtime: {
        ...runtime,
        status: "generating_post",
        draft: nextDraft,
        retryStage: "",
        activeRequest: { ...object(request) },
        lastError: "",
        updatedAt: Date.now()
      }
    };
  }

  function applyPostPayload(raw, payload = {}) {
    const runtime = normalizeSnsPostRuntime(raw);
    const source = object(payload);
    if (text(source.businessId, 160) !== runtime.businessId) return { ok: false, reason: "business_id_mismatch", runtime };
    if (runtime.status !== "generating_post") return { ok: false, reason: "illegal_status", runtime };
    const post = normalizePost(source);
    if (!post.postText) return { ok: false, reason: "post_text_missing", runtime };
    return {
      ok: true,
      runtime: {
        ...runtime,
        status: "awaiting_interaction",
        post,
        activeRequest: null,
        lastError: "",
        updatedAt: Date.now()
      }
    };
  }

  function submitInteraction(raw, interaction) {
    const runtime = normalizeSnsPostRuntime(raw);
    if (runtime.status !== "awaiting_interaction") return { ok: false, reason: "illegal_status", runtime };
    const value = normalizeInteraction(interaction);
    if (!value.action) return { ok: false, reason: "action_missing", runtime };
    if (!runtime.post.comments.some((comment) => comment.id === value.commentId)) {
      return { ok: false, reason: "comment_not_found", runtime };
    }
    if (value.action === "reply" && !value.replyText) return { ok: false, reason: "reply_text_missing", runtime };
    return { ok: true, runtime: { ...runtime, interaction: value, updatedAt: Date.now() } };
  }

  function beginResultGeneration(raw, request = {}) {
    const runtime = normalizeSnsPostRuntime(raw);
    if (runtime.status !== "awaiting_interaction" && !(runtime.status === "retryable_failed" && runtime.retryStage === "result")) {
      return { ok: false, reason: "illegal_status", runtime };
    }
    if (!runtime.post.postText) return { ok: false, reason: "post_missing", runtime };
    if (!runtime.interaction.action) return { ok: false, reason: "interaction_missing", runtime };
    return {
      ok: true,
      runtime: {
        ...runtime,
        status: "generating_result",
        retryStage: "",
        activeRequest: { ...object(request) },
        lastError: "",
        updatedAt: Date.now()
      }
    };
  }

  function applyResultPayload(raw, payload = {}) {
    const runtime = normalizeSnsPostRuntime(raw);
    const source = object(payload);
    if (text(source.businessId, 160) !== runtime.businessId) return { ok: false, reason: "business_id_mismatch", runtime };
    if (runtime.status !== "generating_result") return { ok: false, reason: "illegal_status", runtime };
    const bonusTier = Object.prototype.hasOwnProperty.call(BONUS_FANS, source.bonusTier) ? source.bonusTier : "none";
    const result = {
      bonusTier,
      bonusFans: BONUS_FANS[bonusTier],
      imageMatch: IMAGE_MATCHES.has(source.imageMatch) ? source.imageMatch : "partial",
      bonusReason: text(source.bonusReason, 500),
      publicImage: text(source.publicImage, 500),
      resultSummary: text(source.resultSummary, 1000)
    };
    return {
      ok: true,
      runtime: {
        ...runtime,
        status: "settled",
        activeRequest: null,
        result,
        lastError: "",
        updatedAt: Date.now()
      }
    };
  }

  function recoverInterruptedSnsPost(raw) {
    const runtime = normalizeSnsPostRuntime(raw);
    const retryStage = runtime.status === "generating_post" ? "post" : runtime.status === "generating_result" ? "result" : "";
    if (!retryStage) return runtime;
    return {
      ...runtime,
      status: "retryable_failed",
      retryStage,
      activeRequest: null,
      lastError: "Generation was interrupted. Retry the current social post stage.",
      updatedAt: Date.now()
    };
  }

  function settleSnsPostOnce(raw, businessId) {
    const runtime = normalizeSnsPostRuntime(raw);
    const id = text(businessId, 160);
    if (!id || id !== runtime.businessId) return { ok: false, reason: "business_id_mismatch", runtime };
    if (runtime.settledBusinessId === id) return { ok: false, reason: "already_settled", runtime };
    if (runtime.status !== "settled" || !runtime.result) return { ok: false, reason: "illegal_status", runtime };
    const result = { ...runtime.result, fans: runtime.baseFans + runtime.result.bonusFans };
    return {
      ok: true,
      result,
      runtime: { ...runtime, settledBusinessId: id, result, updatedAt: Date.now() }
    };
  }

  return Object.freeze({
    SNS_POST_STATUSES,
    createSnsPostRuntime,
    normalizeSnsPostRuntime,
    beginPostGeneration,
    applyPostPayload,
    submitInteraction,
    beginResultGeneration,
    applyResultPayload,
    recoverInterruptedSnsPost,
    settleSnsPostOnce
  });
});

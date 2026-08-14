(function (global) {
  "use strict";

  const MAX_DIGESTS = 32;
  const MAX_RECEIPTS = 20;
  const MAX_SUMMARY_LENGTH = 100;
  const MAX_SIGNAL_ITEMS = 3;
  const MAX_SIGNAL_LENGTH = 160;
  const MAX_CHARACTER_INTENTS = 8;
  const INTENT_URGENCIES = new Set(["low", "normal", "high"]);
  const INTENT_VISIBILITIES = new Set(["private", "public"]);
  const INTENT_CHANNELS = new Set(["phone", "sns", "invite"]);
  const SIGNAL_KEYS = ["facts", "playerChoices", "observations", "hooksCreated", "hooksResolved"];

  function clone(value) {
    return value == null ? value : JSON.parse(JSON.stringify(value));
  }

  function boundedInteger(value, fallback = 0) {
    const number = Number(value);
    return Number.isInteger(number) && number >= 0 ? number : fallback;
  }

  function boundedText(value, maxLength) {
    const text = String(value || "").replace(/\s+/g, " ").trim();
    if (!text || Array.from(text).length > maxLength) return "";
    return text;
  }

  function boundedTextList(value, maxItems = MAX_SIGNAL_ITEMS, maxLength = MAX_SIGNAL_LENGTH) {
    if (!Array.isArray(value) || value.length > maxItems) return [];
    const result = [];
    for (const item of value) {
      const text = boundedText(item, maxLength);
      if (!text) return [];
      if (!result.includes(text)) result.push(text);
    }
    return result;
  }

  function normalizeStyleMix(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    const heroic = Number(value.heroic);
    const romance = Number(value.romance);
    const kaibunsho = Number(value.kaibunsho);
    if (![heroic, romance, kaibunsho].every((item) => (
      Number.isInteger(item) && item >= 0 && item <= 100 && item % 5 === 0
    ))) return null;
    if (heroic + romance + kaibunsho !== 100 || kaibunsho !== 0) return null;
    return { heroic, romance, kaibunsho };
  }

  function normalizeStyleThread(value, expectedWeight) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    const status = value.status === "active" || value.status === "dormant" ? value.status : "";
    const weight = boundedInteger(value.weight, -1);
    const focusPressureIds = boundedTextList(value.focusPressureIds, 8, 160);
    const dramaticQuestion = boundedText(value.dramaticQuestion, 240);
    const narrativeGoals = boundedTextList(value.narrativeGoals, 6, 180);
    const dormantReason = boundedText(value.dormantReason, 160);
    if (!status || weight !== expectedWeight || !focusPressureIds || !narrativeGoals) return null;
    if (status === "active" && (!dramaticQuestion || dormantReason)) return null;
    if (status === "dormant" && (dramaticQuestion || narrativeGoals.length || !dormantReason)) return null;
    return { status, weight, focusPressureIds, dramaticQuestion, narrativeGoals, dormantReason };
  }

  function normalizeStyleThreads(value) {
    if (!value || typeof value !== "object" || Array.isArray(value) || value.kaibunsho !== null) return null;
    const heroicWeight = Number(value.heroic?.weight);
    const romanceWeight = Number(value.romance?.weight);
    if (![heroicWeight, romanceWeight].every((item) => (
      Number.isInteger(item) && item >= 0 && item <= 100 && item % 5 === 0
    )) || heroicWeight + romanceWeight !== 100) return null;
    const heroic = normalizeStyleThread(value.heroic, heroicWeight);
    const romance = normalizeStyleThread(value.romance, romanceWeight);
    return heroic && romance ? { heroic, romance, kaibunsho: null } : null;
  }

  function emptySignals() {
    return { facts: [], playerChoices: [], observations: [], hooksCreated: [], hooksResolved: [] };
  }

  function normalizeSignals(value) {
    const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
    const result = emptySignals();
    for (const key of SIGNAL_KEYS) result[key] = boundedTextList(source[key]);
    return result;
  }

  function defaultDirectorState() {
    return {
      schemaVersion: 1,
      enabled: true,
      directorRevision: 0,
      chronicleRevision: 0,
      chronicleDigests: [],
      dailyDirection: null,
      pressures: [],
      characterIntents: [],
      activeJob: null,
      dirty: false,
      lastAppliedJobId: "",
      receipts: []
    };
  }

  function normalizeActiveJob(value, options = {}) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    const interrupted = options.recoverInterrupted !== false && (value.status === "generating" || value.status === "validating");
    const styleMix = normalizeStyleMix(value.styleMix);
    const styleMode = value.styleMode === "styled" && styleMix ? "styled" : "legacy";
    return {
      jobId: boundedText(value.jobId, 160),
      requestId: interrupted ? "" : boundedText(value.requestId, 160),
      saveScope: boundedText(value.saveScope, 240),
      trigger: value.trigger === "manual" ? "manual" : "day_change",
      dayKey: boundedText(value.dayKey, 120),
      baseDirectorRevision: boundedInteger(value.baseDirectorRevision),
      baseChronicleRevision: boundedInteger(value.baseChronicleRevision),
      styleMode,
      styleMix: styleMode === "styled" ? styleMix : null,
      styleMixRevision: styleMode === "styled" ? boundedInteger(value.styleMixRevision) : null,
      status: interrupted ? "retryable_failed" : boundedText(value.status, 40) || "prepared",
      reason: interrupted ? "page_reloaded" : boundedText(value.reason, 120),
      attempts: boundedInteger(value.attempts),
      preparedAt: boundedInteger(value.preparedAt),
      startedAt: interrupted ? 0 : boundedInteger(value.startedAt)
    };
  }

  function normalizeReceipt(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    return {
      jobId: boundedText(value.jobId, 160),
      trigger: value.trigger === "manual" ? "manual" : "day_change",
      status: boundedText(value.status, 40),
      reason: boundedText(value.reason, 120),
      directorRevision: boundedInteger(value.directorRevision),
      chronicleRevision: boundedInteger(value.chronicleRevision),
      createdAt: boundedInteger(value.createdAt)
    };
  }

  function normalizeDigestCandidate(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    const summary = boundedText(value.summary, MAX_SUMMARY_LENGTH);
    const sourceRequestId = boundedText(value.sourceRequestId, 160);
    const sourceTurnId = boundedText(value.sourceTurnId, 160);
    const sourceMessageId = Number.isInteger(Number(value.sourceMessageId)) && Number(value.sourceMessageId) >= 0
      ? Number(value.sourceMessageId)
      : null;
    if (!summary || (!sourceRequestId && !(sourceTurnId && sourceMessageId !== null))) return null;
    const signals = normalizeSignals(value.signals);
    const hasSignals = SIGNAL_KEYS.some((key) => signals[key].length > 0);
    return {
      id: boundedText(value.id, 160) || `digest:${sourceTurnId || sourceRequestId}:${sourceMessageId ?? "request"}`,
      dayKey: boundedText(value.dayKey, 120),
      timeKey: boundedText(value.timeKey, 80),
      locationId: boundedText(value.locationId, 120),
      participants: boundedTextList(value.participants, 12, 120),
      summary,
      actionType: boundedText(value.actionType, 80),
      evidenceQuality: value.evidenceQuality === "structured" && hasSignals ? "structured" : "summary_only",
      signals: hasSignals ? signals : emptySignals(),
      sourceTurnId,
      sourceRequestId,
      sourceMessageId,
      committedAt: boundedInteger(value.committedAt, Date.now())
    };
  }

  function normalizePressure(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    const type = boundedText(value.type, 40);
    const theme = boundedText(value.theme, 60);
    const actorId = boundedText(value.actorId, 120);
    if (!type || !theme || !actorId) return null;
    return {
      id: boundedText(value.id, 160),
      signature: boundedText(value.signature, 360),
      type,
      theme,
      actorId,
      targetIds: boundedTextList(value.targetIds, 12, 120).sort(),
      scopeKey: boundedText(value.scopeKey, 160) || "global",
      sourceRefs: boundedTextList(value.sourceRefs, 32, 160),
      sourceSummary: boundedText(value.sourceSummary, 240),
      stage: boundedText(value.stage, 40) || "latent",
      intensity: Math.min(100, boundedInteger(value.intensity)),
      direction: boundedText(value.direction, 40) || "mixed",
      visibility: boundedText(value.visibility, 40) || "implicit",
      dramaticNeed: boundedText(value.dramaticNeed, 240),
      escalationConditions: boundedTextList(value.escalationConditions, 8, 180),
      reliefConditions: boundedTextList(value.reliefConditions, 8, 180),
      status: boundedText(value.status, 40) || "active",
      locked: Boolean(value.locked),
      updatedAtRevision: boundedInteger(value.updatedAtRevision)
    };
  }
  function makePressureSignature(value) {
    const pressure = normalizePressure(value);
    if (!pressure) return "";
    return ["v1", pressure.type, pressure.theme, pressure.actorId, pressure.targetIds.join(","), pressure.scopeKey].join("|");
  }

  function normalizeDailyDirection(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    const dayKey = boundedText(value.dayKey, 120);
    const tone = boundedText(value.tone, 120);
    const summary = boundedText(value.summary, 320);
    if (!dayKey || !tone || !summary) return null;
    const base = {
      dayKey,
      tone,
      summary,
      focusActorIds: boundedTextList(value.focusActorIds, 8, 120),
      focusPressureIds: boundedTextList(value.focusPressureIds, 8, 160),
      narrativeGoals: boundedTextList(value.narrativeGoals, 6, 180),
      avoid: boundedTextList(value.avoid, 6, 180)
    };
    const styleAware = value.styleMixRevision != null || value.styleThreads != null;
    if (!styleAware) return { ...base, styleMixRevision: null, styleThreads: null };
    const styleMixRevision = boundedInteger(value.styleMixRevision, -1);
    const styleThreads = normalizeStyleThreads(value.styleThreads);
    if (styleMixRevision < 0 || !styleThreads) return null;
    return { ...base, styleMixRevision, styleThreads };
  }

  function normalizeCharacterIntent(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    const intentId = boundedText(value.intentId, 160);
    const dayKey = boundedText(value.dayKey, 120);
    const saveScope = boundedText(value.saveScope, 240);
    const actorId = boundedText(value.actorId, 120);
    const targetIds = boundedTextList(value.targetIds, 8, 120);
    const goal = boundedText(value.goal, 240);
    const motive = boundedText(value.motive, 240);
    const urgency = boundedText(value.urgency, 20);
    const visibility = boundedText(value.visibility, 20);
    const preferredChannels = boundedTextList(value.preferredChannels, 3, 20);
    const sourcePressureIds = boundedTextList(value.sourcePressureIds, 8, 160);
    const sourceRefs = boundedTextList(value.sourceRefs, 8, 160);
    const publicPostDraft = value.publicPostDraft == null || value.publicPostDraft === ""
      ? ""
      : boundedText(value.publicPostDraft, 280);
    const expiresDayKey = boundedText(value.expiresDayKey, 120);
    if (!intentId || !dayKey || !saveScope || !actorId || !targetIds || !goal || !motive || !expiresDayKey) return null;
    if (!INTENT_URGENCIES.has(urgency) || !INTENT_VISIBILITIES.has(visibility) || !preferredChannels?.length) return null;
    if (preferredChannels.some((channel) => !INTENT_CHANNELS.has(channel)) || !sourcePressureIds || !sourceRefs) return null;
    if (preferredChannels.includes("sns") && (visibility !== "public" || !publicPostDraft)) return null;
    return {
      intentId,
      dayKey,
      saveScope,
      actorId,
      targetIds: [...new Set(targetIds)],
      goal,
      motive,
      urgency,
      visibility,
      preferredChannels: [...new Set(preferredChannels)],
      sourcePressureIds: [...new Set(sourcePressureIds)],
      sourceRefs: [...new Set(sourceRefs)],
      publicPostDraft,
      expiresDayKey
    };
  }
  function ensureDirectorShape(value, options = {}) {
    const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
    const defaults = defaultDirectorState();
    const digests = Array.isArray(source.chronicleDigests)
      ? source.chronicleDigests.map(normalizeDigestCandidate).filter(Boolean).slice(-MAX_DIGESTS)
      : [];
    const pressures = Array.isArray(source.pressures)
      ? source.pressures.map(normalizePressure).filter(Boolean)
      : [];
    const characterIntents = Array.isArray(source.characterIntents)
      ? source.characterIntents.map(normalizeCharacterIntent).filter(Boolean).slice(0, MAX_CHARACTER_INTENTS)
      : [];
    const receipts = Array.isArray(source.receipts)
      ? source.receipts.map(normalizeReceipt).filter(Boolean).slice(-MAX_RECEIPTS)
      : [];
    return {
      ...defaults,
      enabled: source.enabled === undefined ? true : Boolean(source.enabled),
      directorRevision: boundedInteger(source.directorRevision),
      chronicleRevision: boundedInteger(source.chronicleRevision),
      chronicleDigests: digests,
      dailyDirection: normalizeDailyDirection(source.dailyDirection),
      pressures,
      characterIntents,
      activeJob: normalizeActiveJob(source.activeJob, options),
      dirty: Boolean(source.dirty),
      lastAppliedJobId: boundedText(source.lastAppliedJobId, 160),
      receipts
    };
  }

  function digestIdentity(value) {
    if (value.sourceTurnId && value.sourceMessageId !== null) return `turn:${value.sourceTurnId}:message:${value.sourceMessageId}`;
    return value.sourceRequestId ? `request:${value.sourceRequestId}` : "";
  }

  function commitChronicleDigest(state, candidate) {
    const normalizedState = ensureDirectorShape(state, { recoverInterrupted: false });
    Object.assign(state, normalizedState);
    const digest = normalizeDigestCandidate(candidate);
    if (!digest) return { committed: false, reason: "invalid_digest" };
    const identity = digestIdentity(digest);
    if (!identity || state.chronicleDigests.some((item) => digestIdentity(item) === identity)) {
      return { committed: false, reason: "duplicate_digest" };
    }
    state.chronicleDigests.push(digest);
    state.chronicleDigests = state.chronicleDigests.slice(-MAX_DIGESTS);
    state.chronicleRevision += 1;
    state.dirty = true;
    return { committed: true, digest: clone(digest) };
  }

  function applyDirectorPatch(state, patch) {
    if (!state?.freeMode?.world || !patch || typeof patch !== "object") return { applied: false, reason: "invalid_patch" };
    const current = ensureDirectorShape(state.freeMode.world.director, { recoverInterrupted: false });
    if (current.lastAppliedJobId && current.lastAppliedJobId === String(patch.jobId || "")) {
      return { applied: false, reason: "duplicate_job" };
    }
    if (
      !patch.jobId
      || Number(patch.baseDirectorRevision) !== current.directorRevision
      || Number(patch.baseChronicleRevision) !== current.chronicleRevision
    ) return { applied: false, reason: "stale_patch" };
    const dailyDirection = normalizeDailyDirection(patch.dailyDirection);
    const pressures = Array.isArray(patch.pressures) ? patch.pressures.map(normalizePressure).filter(Boolean) : null;
    const characterIntents = Array.isArray(patch.characterIntents)
      ? patch.characterIntents.map(normalizeCharacterIntent).filter(Boolean)
      : null;
    if (
      !dailyDirection
      || !pressures
      || pressures.length !== patch.pressures.length
      || !characterIntents
      || characterIntents.length !== patch.characterIntents.length
      || characterIntents.length > MAX_CHARACTER_INTENTS
    ) {
      return { applied: false, reason: "invalid_patch_payload" };
    }
    const nextRevision = current.directorRevision + 1;
    const receipt = normalizeReceipt({
      ...(patch.receipt || {}),
      jobId: patch.jobId,
      trigger: patch.trigger,
      status: "committed",
      directorRevision: nextRevision,
      chronicleRevision: current.chronicleRevision
    });
    if (!receipt) return { applied: false, reason: "invalid_receipt" };
    const next = ensureDirectorShape({
      ...current,
      directorRevision: nextRevision,
      dailyDirection,
      pressures,
      characterIntents,
      activeJob: current.activeJob?.jobId === patch.jobId
        ? { ...current.activeJob, requestId: "", status: "committed", reason: "" }
        : current.activeJob,
      dirty: false,
      lastAppliedJobId: String(patch.jobId),
      receipts: [...current.receipts, receipt].slice(-MAX_RECEIPTS)
    }, { recoverInterrupted: false });
    state.freeMode.world.director = next;
    return { applied: true, director: clone(next) };
  }
  global.HatsuWorld = global.HatsuWorld || {};
  global.HatsuWorld.directorState = {
    defaultDirectorState,
    ensureDirectorShape,
    normalizeDigestCandidate,
    commitChronicleDigest,
    makePressureSignature,
    normalizePressure,
    normalizeCharacterIntent,
    applyDirectorPatch
  };
})(typeof globalThis !== "undefined" ? globalThis : window);

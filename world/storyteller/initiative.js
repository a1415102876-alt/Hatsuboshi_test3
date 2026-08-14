(function (global) {
  "use strict";

  const MAX_CANDIDATES = 12;
  const ACTIVE_CHANNELS = new Set(["phone", "sns", "invite"]);
  const TERMINAL_STATUSES = new Set(["resolved", "expired", "abandoned"]);

  function clone(value) {
    return value == null ? value : JSON.parse(JSON.stringify(value));
  }

  function bounded(value, max = 160) {
    return Array.from(String(value || "").replace(/\s+/g, " ").trim()).slice(0, max).join("");
  }

  function unique(values, max = 8, length = 160) {
    if (!Array.isArray(values)) return [];
    return [...new Set(values.map((value) => bounded(value, length)).filter(Boolean))].slice(0, max);
  }

  function stableHash(value) {
    let hash = 2166136261;
    for (const char of String(value || "")) {
      hash ^= char.codePointAt(0);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(36);
  }

  function defaultInitiativeState() {
    return {
      schemaVersion: 1,
      dayKey: "",
      saveScope: "",
      candidates: [],
      recentFingerprints: [],
      channelCooldowns: {}
    };
  }

  function ensureInitiativeState(value, options = {}) {
    const incidents = global.HatsuWorldStorytellerIncidents;
    const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
    const candidates = Array.isArray(source.candidates) && incidents?.normalizeIncidentCandidate
      ? source.candidates.map(incidents.normalizeIncidentCandidate).filter((candidate) => candidate?.origin === "character_intent").slice(-MAX_CANDIDATES)
      : [];
    const rawCooldowns = source.channelCooldowns && typeof source.channelCooldowns === "object" && !Array.isArray(source.channelCooldowns)
      ? source.channelCooldowns
      : {};
    const channelCooldowns = {};
    Object.entries(rawCooldowns).slice(0, 48).forEach(([key, day]) => {
      const normalizedKey = bounded(key, 280);
      const normalizedDay = Number(day);
      if (normalizedKey && Number.isInteger(normalizedDay) && normalizedDay >= 0) channelCooldowns[normalizedKey] = normalizedDay;
    });
    return {
      schemaVersion: 1,
      dayKey: bounded(options.dayKey || source.dayKey, 120),
      saveScope: bounded(options.saveScope || source.saveScope, 240),
      candidates,
      recentFingerprints: unique(source.recentFingerprints, 32, 360),
      channelCooldowns
    };
  }

  function normalizeIntent(value, context) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    const intentId = bounded(value.intentId);
    const dayKey = bounded(value.dayKey, 120);
    const saveScope = bounded(value.saveScope, 240);
    const actorId = bounded(value.actorId, 120);
    const goal = bounded(value.goal, 240);
    const motive = bounded(value.motive, 240);
    const urgency = ["low", "normal", "high"].includes(value.urgency) ? value.urgency : "";
    const visibility = value.visibility === "public" ? "public" : value.visibility === "private" ? "private" : "";
    const preferredChannels = unique(value.preferredChannels, 3, 20).filter((channel) => ACTIVE_CHANNELS.has(channel));
    const publicPostDraft = bounded(value.publicPostDraft, 280);
    const relationshipRole = ["responsible", "assigned", "friend", "known"].includes(value.relationshipRole)
      ? value.relationshipRole
      : "known";
    const relationshipStage = bounded(value.relationshipStage, 80);
    const contextSummaries = unique(value.contextSummaries, 4, 180);
    if (!intentId || dayKey !== context.dayKey || saveScope !== context.saveScope || !context.knownActorIds.has(actorId)) return null;
    if (!goal || !motive || !urgency || !visibility || !preferredChannels.length) return null;
    const channels = preferredChannels.filter((channel) => channel !== "sns" || (visibility === "public" && publicPostDraft));
    if (!channels.length) return null;
    return {
      intentId,
      dayKey,
      saveScope,
      actorId,
      targetIds: unique(value.targetIds, 8, 120).filter((id) => context.knownActorIds.has(id)),
      goal,
      motive,
      urgency,
      visibility,
      preferredChannels: channels,
      sourcePressureIds: unique(value.sourcePressureIds, 8, 160),
      sourceRefs: unique(value.sourceRefs, 8, 160),
      publicPostDraft,
      expiresDayKey: bounded(value.expiresDayKey, 120) || dayKey,
      relationshipRole,
      relationshipStage,
      contextSummaries
    };
  }

  function buildFallbackCharacterIntents(context = {}) {
    const dayKey = bounded(context.dayKey, 120);
    const saveScope = bounded(context.saveScope, 240);
    if (!dayKey || !saveScope) return [];
    const pressures = Array.isArray(context.pressures) ? context.pressures : [];
    return (Array.isArray(context.characters) ? context.characters : [])
      .filter((character) => character?.known === true && bounded(character.id, 120))
      .sort((left, right) => Number(Boolean(right.assigned)) - Number(Boolean(left.assigned)) || String(left.id).localeCompare(String(right.id)))
      .slice(0, 2)
      .map((character) => {
        const actorId = bounded(character.id, 120);
        const actorPressures = pressures.filter((pressure) => pressure?.actorId === actorId && pressure?.status !== "resolved").slice(0, 2);
        const contextSummaries = unique([
          ...(character.evidenceSummaries || []),
          ...(character.recentLineMessages || []),
          ...actorPressures.map((pressure) => pressure?.sourceSummary)
        ], 4, 180);
        const sourceRefs = unique([
          ...(character.sourceRefs || []),
          ...actorPressures.flatMap((pressure) => pressure?.sourceRefs || [])
        ], 8, 160);
        if (!contextSummaries.length && !sourceRefs.length && !actorPressures.length) return null;
        return {
          intentId: `fallback:${stableHash(`${saveScope}|${dayKey}|${actorId}`)}`,
          dayKey,
          saveScope,
          actorId,
          targetIds: ["producer"],
          goal: "就最近发生的事情主动联系玩家",
          motive: "延续近期已经发生的交流",
          urgency: actorPressures.some((pressure) => Number(pressure.intensity) >= 70) ? "high" : "normal",
          visibility: "private",
          preferredChannels: character.assigned ? ["phone", "invite"] : ["phone"],
          sourcePressureIds: actorPressures.map((pressure) => bounded(pressure.id, 160)).filter(Boolean),
          sourceRefs,
          publicPostDraft: "",
          expiresDayKey: dayKey,
          relationshipRole: ["responsible", "assigned", "friend", "known"].includes(character.relationshipRole) ? character.relationshipRole : "known",
          relationshipStage: bounded(character.relationshipStage, 80),
          contextSummaries
        };
      }).filter(Boolean);
  }

  function consumedBudget(input) {
    const counts = { minor: 0, moderate: 0, major: 0 };
    (Array.isArray(input.recentCandidates) ? input.recentCandidates : []).forEach((candidate) => {
      if (
        candidate?.planId === input.planId
        && candidate?.saveScope === input.saveScope
        && candidate?.dayKey === input.dayKey
        && !["expired", "abandoned"].includes(candidate?.status)
        && Object.hasOwn(counts, candidate?.severity)
      ) counts[candidate.severity] += 1;
    });
    return counts;
  }

  function selectInitiativeCandidates(input = {}) {
    const incidents = global.HatsuWorldStorytellerIncidents;
    const planId = bounded(input.plan?.planId, 160);
    const saveScope = bounded(input.saveScope, 240);
    const dayKey = bounded(input.dayKey, 120);
    const dayOrdinal = Number.isInteger(Number(input.dayOrdinal)) ? Math.max(0, Number(input.dayOrdinal)) : null;
    if (!incidents?.normalizeIncidentCandidate || !planId || !saveScope || !dayKey) return { candidates: [], reason: "invalid_context" };
    const context = { dayKey, saveScope, knownActorIds: new Set((input.knownActorIds || []).map(String)) };
    const actorIds = new Set();
    const intentIds = new Set();
    const usedChannels = new Set();
    const recentFingerprints = new Set(unique(input.recentFingerprints, 64, 360));
    const cooldowns = input.channelCooldowns && typeof input.channelCooldowns === "object" ? input.channelCooldowns : {};
    const budget = input.plan?.severityBudget || {};
    const consumed = consumedBudget({ recentCandidates: input.recentCandidates, planId, saveScope, dayKey });
    const maxCandidates = Math.max(1, Math.min(2, Number(input.maxCandidates) || 2));
    const normalizedIntents = (Array.isArray(input.intents) ? input.intents : [])
      .map((value) => normalizeIntent(value, context))
      .filter(Boolean)
      .sort((left, right) => {
        const urgency = { high: 0, normal: 1, low: 2 };
        return urgency[left.urgency] - urgency[right.urgency] || left.intentId.localeCompare(right.intentId);
      });
    const candidates = [];
    let hadBudgetRejection = false;
    for (const intent of normalizedIntents) {
      if (candidates.length >= maxCandidates || actorIds.has(intent.actorId) || intentIds.has(intent.intentId)) continue;
      const severity = intent.urgency === "high" ? "moderate" : "minor";
      const allowed = Math.max(0, Number(budget[severity]) || 0);
      if (consumed[severity] >= allowed) {
        hadBudgetRejection = true;
        continue;
      }
      const channel = intent.preferredChannels.find((candidateChannel) => {
        const cooldownDay = Number(cooldowns[`${intent.actorId}|${candidateChannel}`]);
        return !usedChannels.has(candidateChannel) && (!Number.isInteger(cooldownDay) || dayOrdinal === null || cooldownDay < dayOrdinal);
      });
      if (!channel) continue;
      const fingerprint = `initiative|${intent.actorId}|${stableHash(intent.goal)}|${channel}`;
      if (recentFingerprints.has(fingerprint)) continue;
      const incidentId = `initiative:${stableHash(`${planId}|${saveScope}|${dayKey}|${intent.intentId}|${channel}`)}`;
      const candidate = incidents.normalizeIncidentCandidate({
        incidentId,
        definitionId: "character_initiative",
        planId,
        saveScope,
        dayKey,
        dayOrdinal,
        sourceTurnId: intent.intentId,
        fingerprint,
        category: channel === "sns" ? "opportunity" : "visitor",
        severity,
        archetypeId: "character_initiative",
        actorIds: [intent.actorId],
        targetIds: intent.targetIds,
        locationId: channel === "invite" ? "producer_apartment" : "online",
        modifierIds: [],
        channel,
        pressureIds: intent.sourcePressureIds,
        sourceRefs: intent.sourceRefs,
        resolutionMode: channel === "invite" ? "player_choice" : "observe",
        status: "pending",
        requiresConfirmation: false,
        origin: "character_intent",
        intentId: intent.intentId,
        delivery: {
          goal: intent.goal,
          motive: intent.motive,
          urgency: intent.urgency,
          visibility: intent.visibility,
          publicPostDraft: intent.publicPostDraft,
          unread: channel === "phone",
          relationshipRole: intent.relationshipRole,
          relationshipStage: intent.relationshipStage,
          contextSummaries: intent.contextSummaries
        }
      });
      if (!candidate) continue;
      candidates.push(candidate);
      actorIds.add(intent.actorId);
      intentIds.add(intent.intentId);
      usedChannels.add(channel);
      recentFingerprints.add(fingerprint);
      consumed[severity] += 1;
    }
    return {
      candidates,
      reason: candidates.length ? "selected" : hadBudgetRejection ? "budget_exhausted" : "no_eligible_intent"
    };
  }

  function findInitiativeCandidate(state, candidateId) {
    const id = bounded(candidateId, 160);
    return ensureInitiativeState(state).candidates.find((candidate) => candidate.incidentId === id) || null;
  }

  function transitionInitiativeCandidate(state, candidateId, action, ownership = {}) {
    const current = ensureInitiativeState(state);
    const index = current.candidates.findIndex((candidate) => candidate.incidentId === bounded(candidateId, 160));
    if (index < 0) return { ok: false, reason: "candidate_not_found", state: current, candidate: null };
    const candidate = current.candidates[index];
    const exactOwner = candidate.saveScope === bounded(ownership.saveScope, 240)
      && candidate.dayKey === bounded(ownership.dayKey, 120)
      && candidate.planId === bounded(ownership.planId, 160)
      && candidate.intentId === bounded(ownership.intentId, 160);
    if (!exactOwner) return { ok: false, reason: "candidate_ownership_mismatch", state: current, candidate };
    const transitions = {
      notify: { from: ["pending", "deferred"], to: "notified" },
      defer: { from: ["pending", "notified"], to: "deferred" },
      accept: { from: ["pending", "notified", "deferred"], to: "invited" },
      resolve: { from: ["pending", "notified", "deferred", "invited"], to: "resolved" },
      decline: { from: ["pending", "notified", "deferred"], to: "abandoned" },
      expire: { from: ["pending", "notified", "deferred"], to: "expired" }
    };
    const transition = transitions[action];
    if (!transition || !transition.from.includes(candidate.status) || TERMINAL_STATUSES.has(candidate.status)) {
      return { ok: false, reason: "invalid_transition", state: current, candidate };
    }
    const nextCandidate = global.HatsuWorldStorytellerIncidents.normalizeIncidentCandidate({
      ...candidate,
      status: transition.to,
      delivery: {
        ...candidate.delivery,
        unread: transition.to === "resolved" || transition.to === "expired" || transition.to === "abandoned" ? false : candidate.delivery?.unread,
        ...(action === "defer" && Number.isFinite(Number(ownership.deferredUntilWorldMinute)) ? {
          deferredUntilWorldMinute: Math.max(0, Math.round(Number(ownership.deferredUntilWorldMinute)))
        } : {})
      }
    });
    const nextState = ensureInitiativeState({ ...current, candidates: current.candidates.map((item, candidateIndex) => candidateIndex === index ? nextCandidate : item) });
    return { ok: true, reason: transition.to, state: nextState, candidate: clone(nextCandidate) };
  }

  function getUnreadPhoneInitiatives(state) {
    return ensureInitiativeState(state).candidates
      .filter((candidate) => candidate.channel === "phone" && candidate.delivery?.unread && !TERMINAL_STATUSES.has(candidate.status))
      .map(clone);
  }

  global.HatsuWorldStorytellerInitiative = {
    defaultInitiativeState,
    ensureInitiativeState,
    buildFallbackCharacterIntents,
    selectInitiativeCandidates,
    findInitiativeCandidate,
    transitionInitiativeCandidate,
    getUnreadPhoneInitiatives
  };
})(typeof globalThis !== "undefined" ? globalThis : window);

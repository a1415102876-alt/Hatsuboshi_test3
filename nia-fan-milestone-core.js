(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.HatsuNiaFanMilestone = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const SAKI_FAN_MILESTONE_EVENTS = Object.freeze([
    Object.freeze({ eventId: "nia-saki-fans-5000", threshold: 5000, episode: 12 }),
    Object.freeze({ eventId: "nia-saki-fans-10000", threshold: 10000, episode: 13 }),
    Object.freeze({ eventId: "nia-saki-round2-audition-eve", threshold: 0, episode: 14, trigger: "round2_day5_complete" }),
    Object.freeze({ eventId: "nia-saki-round2-quartet-opening", threshold: 0, episode: 15, trigger: "round2_audition_eve" }),
    Object.freeze({ eventId: "nia-saki-round2-quartet-victory", threshold: 0, episode: 16, trigger: "round2_audition_complete" }),
    Object.freeze({ eventId: "nia-saki-round3-first-business", threshold: 0, episode: 17, trigger: "round3_first_business_complete" }),
    Object.freeze({ eventId: "nia-saki-round3-finale-eve", threshold: 0, episode: 18, trigger: "round3_schedule_complete" }),
    Object.freeze({ eventId: "nia-saki-finale-sisters-aftermath", threshold: 0, episode: 19, trigger: "round3_finale_complete" }),
    Object.freeze({ eventId: "nia-saki-finale-partner-epilogue", threshold: 0, episode: 20, trigger: "round3_finale_complete" })
  ]);
  const routeRoot = typeof globalThis !== "undefined" ? globalThis : {};
  const allRouteEvents = () => {
    const routes = routeRoot.HatsuNiaRoutes;
    return routes?.list?.().flatMap((route) => route.episodes || []) || [];
  };
  const eventsFor = (routeOrIdol) => {
    const routes = routeRoot.HatsuNiaRoutes;
    const route = typeof routeOrIdol === "string"
      ? (routes?.getById?.(routeOrIdol) || routes?.getByIdol?.(routeOrIdol))
      : routeOrIdol;
    return Array.isArray(route?.episodes) && route.episodes.length
      ? route.episodes.filter((entry) => Number(entry.episode) >= 12)
      : SAKI_FAN_MILESTONE_EVENTS;
  };
  const hasRoute = (routeOrIdol) => {
    const routes = routeRoot.HatsuNiaRoutes;
    if (typeof routeOrIdol === "object" && routeOrIdol) return Boolean(routeOrIdol.routeId);
    return Boolean(routes?.getById?.(routeOrIdol) || routes?.getByIdol?.(routeOrIdol));
  };
  const NIA_FAN_MILESTONE_EVENTS = Object.freeze([
    ...SAKI_FAN_MILESTONE_EVENTS,
    ...allRouteEvents().filter((entry) => !SAKI_FAN_MILESTONE_EVENTS.some((known) => known.eventId === entry.eventId))
  ]);
  const NIA_FAN_MILESTONE_EVENT_ID = NIA_FAN_MILESTONE_EVENTS[0].eventId;
  const NIA_FAN_MILESTONE_THRESHOLD = NIA_FAN_MILESTONE_EVENTS[0].threshold;
  const STATUSES = Object.freeze([
    "idle", "pending", "generating", "playing", "retryable_failed", "completed"
  ]);

  const object = (value) => value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const text = (value, limit = 1000) => String(value || "").trim().slice(0, limit);
  const triggerType = (definition) => {
    const raw = definition?.trigger?.type || definition?.trigger || "fans";
    return ({
      round2_day5_complete: "round_day_complete",
      round2_audition_eve: "audition_eve",
      round2_audition_complete: "audition_complete",
      round3_first_business_complete: "first_business_complete",
      round3_schedule_complete: "schedule_complete",
      round3_finale_complete: "finale_complete"
    })[raw] || raw;
  };

  function eventDefinition(eventId, routeOrIdol) {
    const events = routeOrIdol ? eventsFor(routeOrIdol) : NIA_FAN_MILESTONE_EVENTS;
    return events.find((entry) => entry.eventId === eventId)
      || NIA_FAN_MILESTONE_EVENTS.find((entry) => entry.eventId === eventId)
      || events[0]
      || SAKI_FAN_MILESTONE_EVENTS[0];
  }

  function normalizeFanMilestone(raw, routeOrIdol) {
    const source = object(raw);
    const definition = eventDefinition(text(source.eventId, 160), routeOrIdol);
    return {
      eventId: definition.eventId,
      threshold: Math.max(0, Math.floor(Number(definition.threshold ?? definition.trigger?.threshold) || 0)),
      status: STATUSES.includes(source.status) ? source.status : "idle",
      story: text(source.story, 12000),
      activeRequest: source.activeRequest ? { ...object(source.activeRequest) } : null,
      lastError: text(source.lastError, 500),
      triggeredAtFans: Math.max(0, Math.floor(Number(source.triggeredAtFans) || 0)),
      completedAt: Math.max(0, Number(source.completedAt) || 0),
      updatedAt: Math.max(0, Number(source.updatedAt) || 0)
    };
  }

  function reconcileFanMilestone(raw, context = {}) {
    const route = context.route || context.routeId || context.idolName;
    const events = eventsFor(route);
    let runtime = normalizeFanMilestone(raw, route);
    let continuingRoute = false;
    if (runtime.status === "completed") {
      const currentIndex = events.findIndex((entry) => entry.eventId === runtime.eventId);
      const next = events[currentIndex + 1];
      if (!next) return runtime;
      runtime = normalizeFanMilestone({ eventId: next.eventId }, route);
      continuingRoute = true;
    }
    if (runtime.status !== "idle") return runtime;
    const scenario = text(context.scenario, 40).toLowerCase();
    const idolName = text(context.idolName, 80);
    const fans = Math.max(0, Math.floor(Number(context.fans) || 0));
    const definition = eventDefinition(runtime.eventId, route);
    const trigger = triggerType(definition);
    const triggerRound = Number(definition.trigger?.round) || (String(definition.trigger || "").includes("round2") ? 2 : String(definition.trigger || "").includes("round3") ? 3 : 0);
    const requiresCompletedSecondAudition = trigger === "audition_complete" && triggerRound === 2;
    const requiresThirdRoundFirstBusiness = trigger === "first_business_complete" && triggerRound === 3;
    const requiresThirdRoundSchedule = trigger === "schedule_complete" && triggerRound === 3;
    const requiresThirdRoundFinale = trigger === "finale_complete";
    const requiredActionIndex = runtime.eventId.includes("round2-audition-eve")
      ? 4
      : runtime.eventId.includes("round2-quartet-opening")
        ? 5
        : 0;
    const scheduleReady = !requiredActionIndex || (
      Math.floor(Number(context.round) || 0) === 2
      && Math.floor(Number(context.planLength) || 0) === 5
      && Math.floor(Number(context.actionIndex) || 0) >= requiredActionIndex
    );
    const auditionReady = !requiresCompletedSecondAudition || (
      Math.floor(Number(context.round) || 0) === 2
      && Boolean(context.secondRoundAuditionCompleted)
    );
    const businessReady = !requiresThirdRoundFirstBusiness || (
      Math.floor(Number(context.round) || 0) === 3
      && Boolean(context.thirdRoundFirstBusinessCompleted)
    );
    const finaleReady = !requiresThirdRoundSchedule || (
      Math.floor(Number(context.round) || 0) === 3
      && Boolean(context.thirdRoundScheduleCompleted)
    );
    const finaleCompleted = !requiresThirdRoundFinale || (
      Math.floor(Number(context.round) || 0) === 3
      && Boolean(context.thirdRoundFinaleCompleted)
    );
    if (scenario !== "nia" || (!continuingRoute && idolName !== "花海咲季" && !hasRoute(route)) || fans < runtime.threshold || !scheduleReady || !auditionReady || !businessReady || !finaleReady || !finaleCompleted) return runtime;
    return {
      ...runtime,
      status: "pending",
      triggeredAtFans: fans,
      lastError: "",
      updatedAt: Date.now()
    };
  }

  function beginFanMilestoneGeneration(raw, request = {}) {
    const runtime = normalizeFanMilestone(raw);
    if (!["pending", "retryable_failed"].includes(runtime.status)) {
      return { ok: false, reason: "illegal_status", runtime };
    }
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

  function applyFanMilestoneStory(raw, payload = {}) {
    const runtime = normalizeFanMilestone(raw);
    const data = object(payload);
    if (text(data.eventId, 160) !== runtime.eventId) {
      return { ok: false, reason: "event_id_mismatch", runtime };
    }
    if (runtime.status !== "generating") return { ok: false, reason: "illegal_status", runtime };
    const story = text(data.story, 12000);
    if (!story) return { ok: false, reason: "story_missing", runtime };
    return {
      ok: true,
      runtime: {
        ...runtime,
        status: "playing",
        story,
        activeRequest: null,
        lastError: "",
        updatedAt: Date.now()
      }
    };
  }

  function recoverInterruptedFanMilestone(raw) {
    const runtime = normalizeFanMilestone(raw);
    if (runtime.status !== "generating") return runtime;
    return {
      ...runtime,
      status: "retryable_failed",
      activeRequest: null,
      lastError: "Fan milestone generation was interrupted.",
      updatedAt: Date.now()
    };
  }

  function completeFanMilestone(raw) {
    const runtime = normalizeFanMilestone(raw);
    if (runtime.status === "completed") return { ok: false, reason: "already_completed", runtime };
    if (runtime.status !== "playing") return { ok: false, reason: "illegal_status", runtime };
    return {
      ok: true,
      runtime: {
        ...runtime,
        status: "completed",
        activeRequest: null,
        lastError: "",
        completedAt: Date.now(),
        updatedAt: Date.now()
      }
    };
  }

  return Object.freeze({
    NIA_FAN_MILESTONE_EVENTS,
    getFanMilestoneDefinition: eventDefinition,
    NIA_FAN_MILESTONE_EVENT_ID,
    NIA_FAN_MILESTONE_THRESHOLD,
    STATUSES,
    normalizeFanMilestone,
    reconcileFanMilestone,
    beginFanMilestoneGeneration,
    applyFanMilestoneStory,
    recoverInterruptedFanMilestone,
    completeFanMilestone
  });
});

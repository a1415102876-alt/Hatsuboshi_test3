(function installHatsuNiaRoutes(root) {
  "use strict";

  if (root.HatsuNiaRoutes?.schemaVersion === 1) return;

  const routesById = new Map();
  const routesByIdol = new Map();
  const triggerTypes = new Set([
    "opening",
    "fans",
    "round_day_complete",
    "audition_eve",
    "audition_complete",
    "first_business_complete",
    "schedule_complete",
    "finale_complete"
  ]);

  const text = (value) => String(value || "").trim();
  const clone = (value) => JSON.parse(JSON.stringify(value));

  function deepFreeze(value) {
    if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
    Object.values(value).forEach(deepFreeze);
    return Object.freeze(value);
  }

  function validateRoute(input) {
    if (!input || typeof input !== "object" || Array.isArray(input)) throw new TypeError("N.I.A route must be an object.");
    const route = clone(input);
    route.routeId = text(route.routeId);
    route.idolName = text(route.idolName);
    if (!route.routeId) throw new TypeError("N.I.A routeId is required.");
    if (!route.idolName) throw new TypeError("N.I.A idolName is required.");
    if (routesById.has(route.routeId)) throw new TypeError(`Duplicate N.I.A routeId: ${route.routeId}`);
    if (routesByIdol.has(route.idolName)) throw new TypeError(`Duplicate N.I.A idolName: ${route.idolName}`);

    const affinity = route.inheritedAffinity || {};
    if (!Number.isFinite(Number(affinity.value)) || !Number.isFinite(Number(affinity.max))) {
      throw new TypeError(`Invalid inheritedAffinity for ${route.routeId}`);
    }
    if (!text(affinity.tag) || !text(affinity.relationshipSummary)) {
      throw new TypeError(`Incomplete inheritedAffinity for ${route.routeId}`);
    }

    const roundIds = new Set();
    route.rounds = Array.isArray(route.rounds) ? route.rounds : [];
    route.rounds.forEach((round) => {
      const number = Math.floor(Number(round?.round));
      if (number < 1 || roundIds.has(number)) throw new TypeError(`Invalid or duplicate round in ${route.routeId}`);
      roundIds.add(number);
    });

    const eventIds = new Set();
    route.episodes = Array.isArray(route.episodes) ? route.episodes : [];
    route.episodes.forEach((episode) => {
      const eventId = text(episode?.eventId);
      const triggerType = text(episode?.trigger?.type);
      if (!eventId || eventIds.has(eventId)) throw new TypeError(`Invalid or duplicate episode in ${route.routeId}`);
      if (!triggerTypes.has(triggerType)) throw new TypeError(`Unsupported N.I.A trigger: ${triggerType}`);
      eventIds.add(eventId);
    });
    return deepFreeze(route);
  }

  const api = {
    schemaVersion: 1,
    register(input) {
      const route = validateRoute(input);
      routesById.set(route.routeId, route);
      routesByIdol.set(route.idolName, route);
      return route;
    },
    getById(routeId) {
      return routesById.get(text(routeId)) || null;
    },
    getByIdol(idolName) {
      return routesByIdol.get(text(idolName)) || null;
    },
    getDefaultRoute() {
      return routesById.values().next().value || null;
    },
    getRound(idolName, roundNumber) {
      return api.getByIdol(idolName)?.rounds?.find((entry) => Number(entry.round) === Number(roundNumber)) || null;
    },
    getEpisodes(idolName) {
      return api.getByIdol(idolName)?.episodes || [];
    },
    getEpisode(idolName, eventId) {
      return api.getEpisodes(idolName).find((entry) => entry.eventId === text(eventId)) || null;
    },
    list() {
      return [...routesById.values()];
    }
  };

  root.HatsuNiaRoutes = Object.freeze(api);
})(typeof globalThis !== "undefined" ? globalThis : this);

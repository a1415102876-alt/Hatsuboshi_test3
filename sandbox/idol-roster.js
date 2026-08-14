(function (global) {
  "use strict";

  const PROFILE_FIELDS = [
    "Vo", "Da", "Vi", "growth", "threshold", "cap", "sp",
    "stamina", "stress", "trust", "liveReady", "affinity", "firstLive"
  ];

  function clone(value) {
    if (value === undefined) return undefined;
    return JSON.parse(JSON.stringify(value));
  }

  function uniqueNames(values, validSet) {
    const seen = new Set();
    return (Array.isArray(values) ? values : []).map((value) => String(value || "").trim()).filter((name) => {
      if (!name || seen.has(name) || (validSet.size && !validSet.has(name))) return false;
      seen.add(name);
      return true;
    });
  }

  function ensureContainers(state) {
    if (!state.sandbox || typeof state.sandbox !== "object") state.sandbox = {};
    if (!state.sandbox.idolProfiles || typeof state.sandbox.idolProfiles !== "object" || Array.isArray(state.sandbox.idolProfiles)) {
      state.sandbox.idolProfiles = {};
    }
    if (!Array.isArray(state.sandbox.assignedIdols)) state.sandbox.assignedIdols = [];
    if (!state.tasks || typeof state.tasks !== "object") state.tasks = {};
    if (!state.tasks.main || typeof state.tasks.main !== "object") state.tasks.main = {};
  }

  function captureActiveProfile(state, idolName = state?.idol) {
    const name = String(idolName || "").trim();
    if (!state || !name) return null;
    const profile = { schemaVersion: 1, idol: name };
    PROFILE_FIELDS.forEach((field) => {
      profile[field] = clone(state[field]);
    });
    profile.firstLiveChallenge = clone(state.sandbox?.firstLiveChallenge);
    profile.taskMain = clone(state.tasks?.main || {});
    profile.taskBaseline = clone(state.tasks?.baseline ?? null);
    return profile;
  }

  function applyProfile(state, profile) {
    if (!state || !profile?.idol) return false;
    ensureContainers(state);
    PROFILE_FIELDS.forEach((field) => {
      if (profile[field] !== undefined) state[field] = clone(profile[field]);
    });
    state.sandbox.firstLiveChallenge = clone(profile.firstLiveChallenge || { status: "available", history: [] });
    state.tasks.main = clone(profile.taskMain || {});
    state.tasks.baseline = clone(profile.taskBaseline ?? null);
    state.idol = profile.idol;
    state.sandbox.responsibleIdol = profile.idol;
    return true;
  }

  function getAssignedIdols(state) {
    return Array.isArray(state?.sandbox?.assignedIdols) ? [...state.sandbox.assignedIdols] : [];
  }

  function saveResponsibleProfile(state) {
    ensureContainers(state);
    const responsible = String(state.sandbox.responsibleIdol || state.idol || "").trim();
    if (!responsible || !state.sandbox.assignedIdols.includes(responsible) || state.idol !== responsible) return false;
    const profile = captureActiveProfile(state, responsible);
    if (!profile) return false;
    state.sandbox.idolProfiles[responsible] = profile;
    return true;
  }

  function normalizeRosterState(state, options = {}) {
    ensureContainers(state);
    const validSet = new Set((options.validIdols || []).map((name) => String(name || "").trim()).filter(Boolean));
    const confirmedSet = new Set((options.confirmedIdols || []).map((name) => String(name || "").trim()).filter(Boolean));
    const existing = uniqueNames(state.sandbox.assignedIdols, validSet);
    const produced = uniqueNames(state.sandbox.producedIdols, validSet);
    const current = String(state.idol || "").trim();
    const recovered = uniqueNames([
      ...existing,
      ...produced,
      ...(confirmedSet.has(current) ? [current] : [])
    ], validSet);
    state.sandbox.assignedIdols = recovered;

    recovered.forEach((name) => {
      if (state.sandbox.idolProfiles[name]) return;
      if (name === current && confirmedSet.has(name)) {
        state.sandbox.idolProfiles[name] = captureActiveProfile(state, name);
        return;
      }
      const created = options.createProfile?.(name);
      if (created) state.sandbox.idolProfiles[name] = clone(created);
    });

    const requested = String(state.sandbox.responsibleIdol || "").trim();
    const responsible = recovered.includes(requested)
      ? requested
      : recovered.includes(current)
        ? current
        : recovered[0] || "";
    state.sandbox.responsibleIdol = responsible;
    if (responsible && state.sandbox.idolProfiles[responsible]) {
      applyProfile(state, state.sandbox.idolProfiles[responsible]);
    }
    return getAssignedIdols(state);
  }

  function confirmAssignedIdol(state, idolName, options = {}) {
    ensureContainers(state);
    const name = String(idolName || "").trim();
    if (!name) return { ok: false, reason: "invalid_idol" };
    saveResponsibleProfile(state);
    if (!state.sandbox.idolProfiles[name]) {
      const profile = state.idol === name && state.sandbox.assignedIdols.length === 0
        ? captureActiveProfile(state, name)
        : options.createProfile?.(name);
      if (!profile) return { ok: false, reason: "profile_missing" };
      state.sandbox.idolProfiles[name] = clone(profile);
    }
    if (!state.sandbox.assignedIdols.includes(name)) state.sandbox.assignedIdols.push(name);
    applyProfile(state, state.sandbox.idolProfiles[name]);
    return { ok: true, idol: name, assignedIdols: getAssignedIdols(state) };
  }

  function switchResponsibleIdol(state, idolName) {
    ensureContainers(state);
    const name = String(idolName || "").trim();
    if (!state.sandbox.assignedIdols.includes(name)) return { ok: false, reason: "not_assigned" };
    if (!state.sandbox.idolProfiles[name]) return { ok: false, reason: "profile_missing" };
    if (state.sandbox.responsibleIdol === name && state.idol === name) return { ok: true, idol: name, unchanged: true };
    saveResponsibleProfile(state);
    applyProfile(state, state.sandbox.idolProfiles[name]);
    return { ok: true, idol: name, unchanged: false };
  }

  global.HatsuIdolRoster = {
    PROFILE_FIELDS,
    captureActiveProfile,
    applyProfile,
    getAssignedIdols,
    saveResponsibleProfile,
    normalizeRosterState,
    confirmAssignedIdol,
    switchResponsibleIdol
  };
})(typeof globalThis !== "undefined" ? globalThis : window);

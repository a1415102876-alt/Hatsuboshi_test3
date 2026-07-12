(function (global) {
  "use strict";

  const OUTPUT_START = "【初星导演输出开始】";
  const OUTPUT_END = "【初星导演输出结束】";
  const PRESSURE_ACTIONS = new Set(["upsert", "transition", "relieve", "suspend", "transform", "dissipate"]);
  const PRESSURE_TYPES = new Set(["relationship", "goal", "identity", "social", "schedule"]);
  const PRESSURE_THEMES = new Set(["neglect", "trust", "competition", "overwork", "identity", "public_rumor", "schedule_conflict", "unresolved_promise", "goal_block", "other"]);
  const PRESSURE_STAGES = ["latent", "emerging", "active", "expressed", "resolved"];
  const PRESSURE_DIRECTIONS = new Set(["negative", "slightly_negative", "mixed", "slightly_positive", "positive"]);
  const PRESSURE_VISIBILITY = new Set(["private", "implicit", "visible", "public"]);
  const MAX_PRESSURE_OPERATIONS = 8;
  const PRESSURE_OPERATION_KEYS = new Set(["action", "pressureId", "type", "theme", "actorId", "targetIds", "scopeKey", "sourceRefs", "sourceSummary", "stage", "intensity", "direction", "visibility", "dramaticNeed", "escalationConditions", "reliefConditions"]);

  function clone(value) {
    return value == null ? value : JSON.parse(JSON.stringify(value));
  }

  function text(value, maxLength) {
    const result = String(value || "").replace(/\s+/g, " ").trim();
    return result && Array.from(result).length <= maxLength ? result : "";
  }

  function textList(value, maxItems, maxLength) {
    if (!Array.isArray(value) || value.length > maxItems) return null;
    const result = [];
    for (const item of value) {
      const normalized = text(item, maxLength);
      if (!normalized) return null;
      if (!result.includes(normalized)) result.push(normalized);
    }
    return result;
  }

  function buildDirectorInput(state, job, helpers = {}) {
    const directorApi = global.HatsuWorld?.directorState;
    const director = directorApi?.ensureDirectorShape(state?.freeMode?.world?.director, { recoverInterrupted: false }) || {};
    const knownCharacters = typeof helpers.getKnownCharacters === "function" ? helpers.getKnownCharacters(state) : [];
    return {
      schemaVersion: 1,
      jobId: String(job?.jobId || ""),
      requestId: String(job?.requestId || ""),
      saveScope: String(job?.saveScope || ""),
      trigger: job?.trigger === "manual" ? "manual" : "day_change",
      baseDirectorRevision: Number(job?.baseDirectorRevision) || 0,
      baseChronicleRevision: Number(job?.baseChronicleRevision) || 0,
      dayKey: String(job?.dayKey || ""),
      timePhase: text(helpers.getTimePhase?.(state), 80),
      locationId: text(helpers.getLocationId?.(state), 120),
      chronicleDigests: clone((director.chronicleDigests || []).slice(-12)),
      activePressures: clone((director.pressures || []).filter((item) => item.status === "active" || item.status === "suspended").slice(-12)),
      dailyDirection: clone(director.dailyDirection),
      knownCharacters: clone(Array.isArray(knownCharacters) ? knownCharacters.slice(0, 24).map((item) => ({
        id: text(item?.id, 120),
        name: text(item?.name, 120),
        relationshipStage: text(item?.relationshipStage, 80)
      })).filter((item) => item.id) : []),
      publicWorldSummary: text(helpers.composePublicWorldSummary?.(state), 1600),
      recentSceneStats: clone(helpers.getRecentSceneStats?.(state) || {})
    };
  }

  function buildDirectorPrompt(input) {
    return `[初星世界导演：日级演化]\n\n你只提出叙事方向与压力变化，不得修改数值、时间、玩家选择或任意状态路径。\n仅引用输入中的角色、scope 和 digest id。\n\n输入：\n${JSON.stringify(input, null, 2)}\n\n输出必须使用以下边界，边界内只放 JSON：\n${OUTPUT_START}\n{"schemaVersion":1,"jobId":"${input.jobId}","baseDirectorRevision":${input.baseDirectorRevision},"baseChronicleRevision":${input.baseChronicleRevision},"dailyDirection":{},"pressureOperations":[]}\n${OUTPUT_END}`;
  }

  function parseDirectorResponse(value) {
    const source = String(value || "");
    const start = source.lastIndexOf(OUTPUT_START);
    const end = source.indexOf(OUTPUT_END, start + OUTPUT_START.length);
    if (start < 0 || end < 0) return null;
    try {
      const parsed = JSON.parse(source.slice(start + OUTPUT_START.length, end).trim());
      return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null;
    } catch (error) {
      return null;
    }
  }

  function normalizeDailyDirection(value, job, knownActors, knownPressureIds) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    const dayKey = text(value.dayKey, 120);
    const tone = text(value.tone, 120);
    const summary = text(value.summary, 320);
    const focusActorIds = textList(value.focusActorIds || [], 8, 120);
    const focusPressureIds = textList(value.focusPressureIds || [], 8, 160);
    const narrativeGoals = textList(value.narrativeGoals || [], 6, 180);
    const avoid = textList(value.avoid || [], 6, 180);
    if (!dayKey || dayKey !== String(job.dayKey || "") || !tone || !summary || !focusActorIds || !focusPressureIds || !narrativeGoals || !avoid) return null;
    if (focusActorIds.some((id) => !knownActors.has(id))) return null;
    if (focusPressureIds.some((id) => !knownPressureIds.has(id))) return null;
    return { dayKey, tone, summary, focusActorIds, focusPressureIds, narrativeGoals, avoid };
  }

  function hashText(value) {
    let hash = 2166136261;
    for (const char of String(value || "")) {
      hash ^= char.charCodeAt(0);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(36);
  }

  function normalizeOperation(value, knownActors, knownScopes, digestMap) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    if (Object.keys(value).some((key) => !PRESSURE_OPERATION_KEYS.has(key))) return null;
    const action = text(value.action, 40);
    const type = text(value.type, 40);
    const theme = text(value.theme, 60);
    const actorId = text(value.actorId, 120);
    const targetIds = textList(value.targetIds || [], 8, 120);
    const scopeKey = text(value.scopeKey, 160) || "global";
    const sourceRefs = textList(value.sourceRefs, 8, 160);
    const sourceSummary = text(value.sourceSummary, 240);
    const stage = text(value.stage, 40);
    const intensity = Number(value.intensity);
    const direction = text(value.direction, 40);
    const visibility = text(value.visibility, 40);
    const dramaticNeed = text(value.dramaticNeed, 240);
    const escalationConditions = textList(value.escalationConditions || [], 5, 180);
    const reliefConditions = textList(value.reliefConditions || [], 5, 180);
    if (!PRESSURE_ACTIONS.has(action) || !PRESSURE_TYPES.has(type) || !PRESSURE_THEMES.has(theme)) return null;
    if (!knownActors.has(actorId) || !targetIds || targetIds.some((id) => !knownActors.has(id))) return null;
    if (!knownScopes.has(scopeKey) || !sourceRefs?.length || sourceRefs.some((id) => !digestMap.has(id))) return null;
    if (!sourceSummary || !PRESSURE_STAGES.includes(stage) || !Number.isInteger(intensity) || intensity < 0 || intensity > 100) return null;
    if (!PRESSURE_DIRECTIONS.has(direction) || !PRESSURE_VISIBILITY.has(visibility) || !dramaticNeed || !escalationConditions || !reliefConditions) return null;
    return {
      action,
      pressureId: text(value.pressureId, 160),
      type,
      theme,
      actorId,
      targetIds: [...new Set(targetIds)].sort(),
      scopeKey,
      sourceRefs: [...new Set(sourceRefs)],
      sourceSummary,
      stage,
      intensity,
      direction,
      visibility,
      dramaticNeed,
      escalationConditions,
      reliefConditions
    };
  }

  function stageTransitionAllowed(from, to) {
    const fromIndex = PRESSURE_STAGES.indexOf(from);
    const toIndex = PRESSURE_STAGES.indexOf(to);
    return fromIndex >= 0 && toIndex >= 0 && Math.abs(toIndex - fromIndex) <= 1;
  }

  function hasEvidenceForNewPressure(sourceRefs, digestMap) {
    const digests = sourceRefs.map((id) => digestMap.get(id)).filter(Boolean);
    return digests.some((item) => item.evidenceQuality === "structured")
      || new Set(digests.filter((item) => item.evidenceQuality === "summary_only").map((item) => item.id)).size >= 2;
  }

  function statusForAction(action, existingStatus) {
    if (action === "suspend") return "suspended";
    if (action === "transform") return "transformed";
    if (action === "dissipate") return "dissipated";
    return existingStatus === "suspended" ? "active" : (existingStatus || "active");
  }

  function prepareDirectorPatch(output, state, job, helpers = {}) {
    const stateApi = global.HatsuWorld?.directorState;
    if (!stateApi || !output || typeof output !== "object" || Array.isArray(output)) return { ok: false, reason: "invalid_output" };
    const director = stateApi.ensureDirectorShape(state?.freeMode?.world?.director, { recoverInterrupted: false });
    if (output.schemaVersion !== 1 || output.jobId !== job?.jobId) return { ok: false, reason: "identity_mismatch" };
    if (String(job?.saveScope || "") === "" || Number(output.baseDirectorRevision) !== director.directorRevision || Number(output.baseChronicleRevision) !== director.chronicleRevision) {
      return { ok: false, reason: "revision_mismatch" };
    }
    if (Number(job.baseDirectorRevision) !== director.directorRevision || Number(job.baseChronicleRevision) !== director.chronicleRevision) {
      return { ok: false, reason: "stale_job" };
    }
    const operations = output.pressureOperations;
    if (!Array.isArray(operations) || operations.length > MAX_PRESSURE_OPERATIONS) return { ok: false, reason: "invalid_operations" };
    const knownActors = new Set((helpers.knownActorIds || []).map(String));
    const knownScopes = new Set(["global", ...(helpers.knownScopeKeys || []).map(String)]);
    const digestMap = new Map((director.chronicleDigests || []).map((item) => [item.id, item]));
    const pressures = clone(director.pressures || []);
    const knownPressureIds = new Set(pressures.map((item) => item.id).filter(Boolean));
    const dailyDirection = normalizeDailyDirection(output.dailyDirection, job, knownActors, knownPressureIds);
    if (!dailyDirection) return { ok: false, reason: "invalid_daily_direction" };

    for (let index = 0; index < operations.length; index += 1) {
      const operation = normalizeOperation(operations[index], knownActors, knownScopes, digestMap);
      if (!operation) return { ok: false, reason: "invalid_pressure_operation" };
      const signature = stateApi.makePressureSignature(operation);
      let targetIndex = operation.pressureId ? pressures.findIndex((item) => item.id === operation.pressureId) : -1;
      if (operation.pressureId && targetIndex < 0) return { ok: false, reason: "unknown_pressure" };
      if (targetIndex < 0) {
        targetIndex = pressures.findIndex((item) => item.signature === signature && ["active", "suspended"].includes(item.status) && item.stage !== "resolved");
      }
      const existing = targetIndex >= 0 ? pressures[targetIndex] : null;
      if (!existing) {
        if (operation.action !== "upsert" || !hasEvidenceForNewPressure(operation.sourceRefs, digestMap)) return { ok: false, reason: "insufficient_new_pressure_evidence" };
        const id = `pressure:${hashText(signature)}:${director.directorRevision + 1}:${index + 1}`;
        pressures.push({
          id,
          signature,
          ...operation,
          pressureId: undefined,
          status: "active",
          locked: false,
          updatedAtRevision: director.directorRevision + 1
        });
        continue;
      }
      if (existing.locked) return { ok: false, reason: "locked_pressure" };
      const newRefs = operation.sourceRefs.filter((id) => !(existing.sourceRefs || []).includes(id));
      if (!newRefs.length) return { ok: false, reason: "pressure_requires_new_evidence" };
      if (Math.abs(operation.intensity - Number(existing.intensity || 0)) > 20) return { ok: false, reason: "intensity_step_exceeded" };
      if (!stageTransitionAllowed(existing.stage, operation.stage)) return { ok: false, reason: "invalid_stage_transition" };
      pressures[targetIndex] = {
        ...existing,
        ...operation,
        pressureId: undefined,
        id: existing.id,
        signature,
        sourceRefs: [...new Set([...(existing.sourceRefs || []), ...operation.sourceRefs])],
        status: statusForAction(operation.action, existing.status),
        locked: Boolean(existing.locked),
        updatedAtRevision: director.directorRevision + 1
      };
    }

    return {
      ok: true,
      patch: {
        schemaVersion: 1,
        jobId: job.jobId,
        saveScope: job.saveScope,
        trigger: job.trigger === "manual" ? "manual" : "day_change",
        baseDirectorRevision: director.directorRevision,
        baseChronicleRevision: director.chronicleRevision,
        dailyDirection,
        pressures,
        receipt: {
          jobId: job.jobId,
          trigger: job.trigger === "manual" ? "manual" : "day_change",
          status: "committed",
          reason: "",
          directorRevision: director.directorRevision + 1,
          chronicleRevision: director.chronicleRevision,
          pressureCount: pressures.length,
          createdAt: Date.now()
        }
      }
    };
  }

  function validateDirectorOutput(output, context = {}) {
    const result = prepareDirectorPatch(output, context.state, context.job, context.helpers);
    return result.ok ? { ok: true, value: clone(output) } : result;
  }

  global.HatsuWorld = global.HatsuWorld || {};
  global.HatsuWorld.directorApi = {
    OUTPUT_START,
    OUTPUT_END,
    buildDirectorInput,
    buildDirectorPrompt,
    parseDirectorResponse,
    validateDirectorOutput,
    prepareDirectorPatch
  };
})(typeof globalThis !== "undefined" ? globalThis : window);

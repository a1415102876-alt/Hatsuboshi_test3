import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

const root = new URL("../", import.meta.url);
const normalize = (value) => JSON.parse(JSON.stringify(value));

function loadModules() {
  const sandbox = { globalThis: {}, console };
  sandbox.globalThis = sandbox;
  for (const file of ["world/director-state.js", "world/director-api.js"]) {
    vm.runInNewContext(readFileSync(new URL(file, root), "utf8"), sandbox, { filename: file });
  }
  return sandbox.globalThis.HatsuWorld;
}

function digest(id, evidenceQuality = "structured") {
  return {
    id, dayKey: "day-2", timeKey: "10:00", locationId: "classroom", participants: ["idol:a", "producer"],
    summary: `summary ${id}`, actionType: "lesson", evidenceQuality,
    signals: evidenceQuality === "structured"
      ? { facts: ["明确事实"], playerChoices: [], observations: [], hooksCreated: [], hooksResolved: [] }
      : { facts: [], playerChoices: [], observations: [], hooksCreated: [], hooksResolved: [] },
    sourceTurnId: `turn-${id}`, sourceRequestId: `req-${id}`, sourceMessageId: Number(id.slice(1)) || 1, committedAt: 1
  };
}

function baseState() {
  const HatsuWorld = loadModules();
  const director = HatsuWorld.directorState.defaultDirectorState();
  director.chronicleRevision = 2;
  director.chronicleDigests = [digest("d1", "structured"), digest("d2", "summary_only")];
  director.dirty = true;
  return {
    idol: "A", lastPrompt: "SECRET PROMPT", lastStory: "FULL STORY", apiKey: "SECRET KEY",
    harness: { trace: [{ prompt: "SECRET" }] }, tasks: { side: { fullQuestState: "SECRET QUEST" } },
    freeMode: { postLiveDay: 2, clockMinutes: 600, activeLocationId: "classroom", world: { director, publicValue: "campus" } }
  };
}

function job(overrides = {}) {
  return {
    jobId: "director:day-2:1", requestId: "request-1", saveScope: "scope-a", trigger: "day_change",
    dayKey: "day-2", baseDirectorRevision: 0, baseChronicleRevision: 2, status: "generating",
    attempts: 1, preparedAt: 1, startedAt: 2, lastError: "", ...overrides
  };
}

function validOutput(overrides = {}) {
  return {
    schemaVersion: 1,
    jobId: "director:day-2:1",
    baseDirectorRevision: 0,
    baseChronicleRevision: 2,
    dailyDirection: {
      dayKey: "day-2", tone: "克制但有推进感", summary: "围绕训练承诺推进关系。",
      focusActorIds: ["idol:a"], focusPressureIds: [], narrativeGoals: ["让承诺获得一次可观察回应"], avoid: ["替玩家作决定"]
    },
    pressureOperations: [{
      action: "upsert", type: "relationship", theme: "trust", actorId: "idol:a", targetIds: ["producer"],
      scopeKey: "global", sourceRefs: ["d1"], sourceSummary: "双方明确确认训练承诺。", stage: "latent",
      intensity: 35, direction: "mixed", visibility: "implicit", dramaticNeed: "确认承诺是否可靠",
      escalationConditions: ["承诺再次被忽略"], reliefConditions: ["按时履行承诺"]
    }],
    characterIntents: [{
      intentId: "intent:a:day-2", dayKey: "day-2", saveScope: "scope-a", actorId: "idol:a",
      targetIds: ["producer"], goal: "Ask about the promised lesson", motive: "Keep the promise visible",
      urgency: "normal", visibility: "private", preferredChannels: ["phone", "invite"],
      sourcePressureIds: [], sourceRefs: ["d1"], publicPostDraft: "", expiresDayKey: "day-2"
    }],
    ...overrides
  };
}

function styledJob(overrides = {}) {
  return job({
    styleMode: "styled",
    styleMix: { heroic: 60, romance: 40, kaibunsho: 0 },
    styleMixRevision: 3,
    ...overrides
  });
}

function styledOutput(overrides = {}) {
  const output = validOutput();
  return {
    ...output,
    dailyDirection: {
      ...output.dailyDirection,
      styleMixRevision: 3,
      styleThreads: {
        heroic: {
          status: "active", weight: 60, focusPressureIds: [],
          dramaticQuestion: "她能否找到新的训练方法？", narrativeGoals: ["检验当前方法的极限"], dormantReason: ""
        },
        romance: {
          status: "dormant", weight: 40, focusPressureIds: [],
          dramaticQuestion: "", narrativeGoals: [], dormantReason: "当前没有合法关系素材"
        },
        kaibunsho: null
      }
    },
    ...overrides
  };
}

function helpers() {
  return {
    knownActorIds: ["idol:a", "idol:b", "producer"],
    knownScopeKeys: ["global", "thread:a"],
    getKnownCharacters: () => [{ id: "idol:a", name: "A", relationshipStage: "trusted", assigned: true, known: true }],
    composePublicWorldSummary: () => "公开校园摘要",
    getRecentSceneStats: () => ({ lesson: 2, chat: 1 }),
    getTimePhase: () => "morning",
    getLocationId: () => "classroom"
  };
}

test("director input is bounded and excludes private application state", () => {
  const api = loadModules().directorApi;
  const state = baseState();
  state.freeMode.world.director.chronicleDigests = Array.from({ length: 15 }, (_, index) => digest(`d${index + 1}`));
  state.freeMode.world.director.chronicleRevision = 15;
  const input = normalize(api.buildDirectorInput(state, job({ baseChronicleRevision: 15 }), helpers()));
  assert.equal(input.chronicleDigests.length, 12);
  assert.equal(input.chronicleDigests[0].id, "d4");
  assert.deepEqual(input.knownCharacters, [{ id: "idol:a", name: "A", relationshipStage: "trusted", assigned: true, known: true }]);
  assert.equal(input.publicWorldSummary, "公开校园摘要");
  const serialized = JSON.stringify(input);
  for (const secret of ["SECRET PROMPT", "FULL STORY", "SECRET KEY", "SECRET QUEST", "harness", "apiKey"]) {
    assert.equal(serialized.includes(secret), false);
  }
});

test("Director prompt exposes the complete output contract", () => {
  const api = loadModules().directorApi;
  const input = normalize(api.buildDirectorInput(baseState(), job(), helpers()));
  const prompt = api.buildDirectorPrompt(input);

  for (const field of [
    "dayKey", "tone", "summary", "focusActorIds", "focusPressureIds", "narrativeGoals", "avoid",
    "action", "pressureId", "type", "theme", "actorId", "targetIds", "scopeKey", "sourceRefs",
    "sourceSummary", "stage", "intensity", "direction", "visibility", "dramaticNeed",
    "escalationConditions", "reliefConditions", "characterIntents", "intentId", "goal", "motive", "urgency",
    "preferredChannels", "publicPostDraft", "expiresDayKey"
  ]) {
    assert.match(prompt, new RegExp(`\\b${field}\\b`), `missing output field ${field}`);
  }

  for (const enumValue of [
    "upsert", "transition", "relieve", "suspend", "transform", "dissipate",
    "relationship", "goal", "identity", "social", "schedule",
    "neglect", "trust", "competition", "overwork", "public_rumor", "schedule_conflict",
    "unresolved_promise", "goal_block", "other",
    "latent", "emerging", "active", "expressed", "resolved",
    "negative", "slightly_negative", "mixed", "slightly_positive", "positive",
    "private", "implicit", "visible", "public"
  ]) {
    assert.match(prompt, new RegExp(`\\b${enumValue}\\b`), `missing enum value ${enumValue}`);
  }

  assert.match(prompt, /knownCharacters/);
  assert.match(prompt, /chronicleDigests/);
  assert.match(prompt, /activePressures/);
  assert.match(prompt, /structured/);
  assert.match(prompt, /summary_only/);
  assert.match(prompt, /8/);
  assert.equal(prompt.includes("SECRET PROMPT"), false);
  assert.equal(prompt.includes("SECRET KEY"), false);
});

test("character intents validate known participants, references, channels, visibility, and fields atomically", () => {
  const api = loadModules().directorApi;
  const state = baseState();
  assert.equal(api.prepareDirectorPatch(validOutput(), state, job(), helpers()).ok, true);
  const baseIntent = validOutput().characterIntents[0];
  const cases = [
    { ...baseIntent, actorId: "idol:unknown" },
    { ...baseIntent, targetIds: ["idol:unknown"] },
    { ...baseIntent, sourcePressureIds: ["pressure:unknown"] },
    { ...baseIntent, sourceRefs: ["missing"] },
    { ...baseIntent, preferredChannels: ["phone"], sourcePressureIds: [], sourceRefs: [] },
    { ...baseIntent, urgency: "immediate" },
    { ...baseIntent, visibility: "private", preferredChannels: ["sns"], publicPostDraft: "private leak" },
    { ...baseIntent, visibility: "public", preferredChannels: ["sns"], publicPostDraft: "" },
    { ...baseIntent, preferredChannels: ["email"] },
    { ...baseIntent, path: "state.trust" }
  ];
  for (const intent of cases) {
    const before = JSON.stringify(state);
    assert.equal(api.prepareDirectorPatch(validOutput({ characterIntents: [intent] }), state, job(), helpers()).ok, false);
    assert.equal(JSON.stringify(state), before);
  }
  assert.equal(api.prepareDirectorPatch(validOutput({ characterIntents: [baseIntent, { ...baseIntent, intentId: "intent:a:second" }] }), state, job(), helpers()).ok, false);
});

test("legacy Director output without character intents remains compatible", () => {
  const api = loadModules().directorApi;
  const output = validOutput();
  delete output.characterIntents;
  const prepared = api.prepareDirectorPatch(output, baseState(), job(), helpers());
  assert.equal(prepared.ok, true);
  assert.deepEqual(normalize(prepared.patch.characterIntents), []);
});

test("styled Director input and prompt freeze the player mix and separate threads", () => {
  const api = loadModules().directorApi;
  const input = normalize(api.buildDirectorInput(baseState(), styledJob(), helpers()));
  assert.equal(input.styleMode, "styled");
  assert.equal(input.styleMixRevision, 3);
  assert.deepEqual(input.styleMix, { heroic: 60, romance: 40, kaibunsho: 0 });
  const prompt = api.buildDirectorPrompt(input);
  for (const field of ["styleMixRevision", "styleThreads", "heroic", "romance", "dramaticQuestion", "dormantReason"]) {
    assert.match(prompt, new RegExp(field));
  }
  assert.match(prompt, /60/);
  assert.match(prompt, /40/);
});

test("director parser classifies truncated marked output and accepts complete bounded JSON variants", () => {
  const api = loadModules().directorApi;
  const output = validOutput();
  const text = `ignored\n【初星导演输出开始】\n${JSON.stringify(output)}\n【初星导演输出结束】`;
  assert.deepEqual(normalize(api.parseDirectorResponse(text)), output);
  assert.deepEqual(normalize(api.parseDirectorResponse(JSON.stringify(output))), output);
  assert.deepEqual(normalize(api.parseDirectorResponse(`\`\`\`json\n${JSON.stringify(output)}\n\`\`\``)), output);
  assert.deepEqual(normalize(api.parseDirectorResponseDetailed("【初星导演输出开始】\n{\"schemaVersion\":1,")), {
    ok: false, reason: "output_truncated", output: null
  });
  assert.deepEqual(normalize(api.parseDirectorResponseDetailed("【初星导演输出开始】{broken}【初星导演输出结束】")), {
    ok: false, reason: "invalid_json", output: null
  });
  assert.deepEqual(normalize(api.parseDirectorResponseDetailed("not json")), {
    ok: false, reason: "missing_output_start", output: null
  });
});

test("pressure signature is deterministic across target order", () => {
  const stateApi = loadModules().directorState;
  const first = stateApi.makePressureSignature({ type: "relationship", theme: "trust", actorId: "idol:a", targetIds: ["idol:b", "producer"], scopeKey: "thread:a" });
  const second = stateApi.makePressureSignature({ type: "relationship", theme: "trust", actorId: "idol:a", targetIds: ["producer", "idol:b"], scopeKey: "thread:a" });
  assert.equal(first, "v1|relationship|trust|idol:a|idol:b,producer|thread:a");
  assert.equal(second, first);
});

test("director validation rejects stale revisions unknown references and arbitrary operations", () => {
  const api = loadModules().directorApi;
  const state = baseState();
  const cases = [
    validOutput({ baseChronicleRevision: 1 }),
    validOutput({ pressureOperations: [{ ...validOutput().pressureOperations[0], actorId: "idol:unknown" }] }),
    validOutput({ pressureOperations: [{ ...validOutput().pressureOperations[0], sourceRefs: ["missing"] }] }),
    validOutput({ pressureOperations: [{ ...validOutput().pressureOperations[0], path: "state.stamina" }] }),
    validOutput({ pressureOperations: [{ ...validOutput().pressureOperations[0], intensity: 101 }] })
  ];
  for (const output of cases) assert.equal(api.prepareDirectorPatch(output, state, job(), helpers()).ok, false);
});

test("styled Director validation is atomic and rejects thread contract drift", () => {
  const api = loadModules().directorApi;
  const state = baseState();
  assert.equal(api.prepareDirectorPatch(styledOutput(), state, styledJob(), helpers()).ok, true);
  const cases = [
    styledOutput({ dailyDirection: { ...styledOutput().dailyDirection, styleMixRevision: 2 } }),
    styledOutput({ dailyDirection: {
      ...styledOutput().dailyDirection,
      styleThreads: { ...styledOutput().dailyDirection.styleThreads, heroic: { ...styledOutput().dailyDirection.styleThreads.heroic, weight: 55 } }
    } }),
    styledOutput({ dailyDirection: {
      ...styledOutput().dailyDirection,
      styleThreads: { ...styledOutput().dailyDirection.styleThreads, heroic: { ...styledOutput().dailyDirection.styleThreads.heroic, focusPressureIds: ["unknown-pressure"] } }
    } }),
    styledOutput({ dailyDirection: {
      ...styledOutput().dailyDirection,
      styleThreads: { ...styledOutput().dailyDirection.styleThreads, romance: null }
    } }),
    styledOutput({ dailyDirection: {
      ...styledOutput().dailyDirection,
      styleThreads: { ...styledOutput().dailyDirection.styleThreads, heroic: { ...styledOutput().dailyDirection.styleThreads.heroic, dramaticQuestion: "" } }
    } }),
    styledOutput({ dailyDirection: {
      ...styledOutput().dailyDirection,
      styleThreads: { ...styledOutput().dailyDirection.styleThreads, romance: { ...styledOutput().dailyDirection.styleThreads.romance, narrativeGoals: ["不应存在"] } }
    } }),
    styledOutput({ dailyDirection: {
      ...styledOutput().dailyDirection,
      styleThreads: { ...styledOutput().dailyDirection.styleThreads, kaibunsho: { status: "dormant" } }
    } })
  ];
  for (const output of cases) {
    const before = JSON.stringify(state);
    assert.equal(api.prepareDirectorPatch(output, state, styledJob(), helpers()).ok, false);
    assert.equal(JSON.stringify(state), before);
  }
  assert.equal(api.prepareDirectorPatch(validOutput(), state, styledJob(), helpers()).ok, false);
});

test("one summary-only digest cannot create a pressure but structured or two summaries can", () => {
  const api = loadModules().directorApi;
  const state = baseState();
  const onlySummary = validOutput({ pressureOperations: [{ ...validOutput().pressureOperations[0], sourceRefs: ["d2"] }] });
  assert.equal(api.prepareDirectorPatch(onlySummary, state, job(), helpers()).ok, false);
  assert.equal(api.prepareDirectorPatch(validOutput(), state, job(), helpers()).ok, true);
  state.freeMode.world.director.chronicleDigests.push(digest("d3", "summary_only"));
  state.freeMode.world.director.chronicleRevision = 3;
  const twoSummaries = validOutput({
    baseChronicleRevision: 3,
    pressureOperations: [{ ...validOutput().pressureOperations[0], sourceRefs: ["d2", "d3"] }]
  });
  assert.equal(api.prepareDirectorPatch(twoSummaries, state, job({ baseChronicleRevision: 3 }), helpers()).ok, true);
});

test("existing pressure updates treat reused evidence as no-op and bound real changes", () => {
  const modules = loadModules();
  const api = modules.directorApi;
  const state = baseState();
  const proposal = validOutput().pressureOperations[0];
  const signature = modules.directorState.makePressureSignature(proposal);
  state.freeMode.world.director.pressures = [{
    id: "pressure-1", signature, ...proposal, sourceRefs: ["d1"], stage: "latent", intensity: 35,
    status: "active", locked: false, updatedAtRevision: 0
  }];
  const noNewEvidence = api.prepareDirectorPatch(validOutput(), state, job(), helpers());
  assert.equal(noNewEvidence.ok, true);
  assert.equal(noNewEvidence.patch.pressures[0].intensity, 35);
  assert.deepEqual(normalize(noNewEvidence.patch.pressures[0].sourceRefs), ["d1"]);
  assert.equal(noNewEvidence.patch.dailyDirection.dayKey, "day-2");
  const tooLarge = validOutput({ pressureOperations: [{ ...proposal, pressureId: "pressure-1", sourceRefs: ["d2"], intensity: 70 }] });
  assert.equal(api.prepareDirectorPatch(tooLarge, state, job(), helpers()).ok, false);
  const valid = validOutput({ pressureOperations: [{ ...proposal, pressureId: "pressure-1", sourceRefs: ["d2"], intensity: 50, stage: "emerging" }] });
  assert.equal(api.prepareDirectorPatch(valid, state, job(), helpers()).ok, true);
});

test("director patch applies atomically once and preserves state outside director", () => {
  const modules = loadModules();
  const state = baseState();
  const outsideBefore = normalize({ idol: state.idol, tasks: state.tasks, harness: state.harness });
  const invalidBatch = validOutput({ pressureOperations: [validOutput().pressureOperations[0], { ...validOutput().pressureOperations[0], actorId: "unknown" }] });
  const before = JSON.stringify(state);
  assert.equal(modules.directorApi.prepareDirectorPatch(invalidBatch, state, job(), helpers()).ok, false);
  assert.equal(JSON.stringify(state), before);

  const prepared = modules.directorApi.prepareDirectorPatch(validOutput(), state, job(), helpers());
  assert.equal(prepared.ok, true);
  const applied = modules.directorState.applyDirectorPatch(state, prepared.patch);
  assert.equal(applied.applied, true);
  assert.equal(state.freeMode.world.director.directorRevision, 1);
  assert.equal(state.freeMode.world.director.lastAppliedJobId, job().jobId);
  assert.equal(state.freeMode.world.director.receipts.length, 1);
  assert.equal(state.freeMode.world.director.characterIntents.length, 1);
  assert.deepEqual(normalize({ idol: state.idol, tasks: state.tasks, harness: state.harness }), outsideBefore);
  assert.equal(modules.directorState.applyDirectorPatch(state, prepared.patch).applied, false);
  assert.equal(state.freeMode.world.director.directorRevision, 1);
});

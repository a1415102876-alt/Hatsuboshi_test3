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
    ...overrides
  };
}

function helpers() {
  return {
    knownActorIds: ["idol:a", "idol:b", "producer"],
    knownScopeKeys: ["global", "thread:a"],
    getKnownCharacters: () => [{ id: "idol:a", name: "A", relationshipStage: "trusted" }],
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
  assert.deepEqual(input.knownCharacters, [{ id: "idol:a", name: "A", relationshipStage: "trusted" }]);
  assert.equal(input.publicWorldSummary, "公开校园摘要");
  const serialized = JSON.stringify(input);
  for (const secret of ["SECRET PROMPT", "FULL STORY", "SECRET KEY", "SECRET QUEST", "harness", "apiKey"]) {
    assert.equal(serialized.includes(secret), false);
  }
});

test("director parser accepts only the marked JSON output", () => {
  const api = loadModules().directorApi;
  const output = validOutput();
  const text = `ignored\n【初星导演输出开始】\n${JSON.stringify(output)}\n【初星导演输出结束】`;
  assert.deepEqual(normalize(api.parseDirectorResponse(text)), output);
  assert.equal(api.parseDirectorResponse(JSON.stringify(output)), null);
  assert.equal(api.parseDirectorResponse("【初星导演输出开始】{broken}【初星导演输出结束】"), null);
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

test("existing pressure updates require new evidence and bounded intensity changes", () => {
  const modules = loadModules();
  const api = modules.directorApi;
  const state = baseState();
  const proposal = validOutput().pressureOperations[0];
  const signature = modules.directorState.makePressureSignature(proposal);
  state.freeMode.world.director.pressures = [{
    id: "pressure-1", signature, ...proposal, sourceRefs: ["d1"], stage: "latent", intensity: 35,
    status: "active", locked: false, updatedAtRevision: 0
  }];
  assert.equal(api.prepareDirectorPatch(validOutput(), state, job(), helpers()).ok, false);
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
  assert.deepEqual(normalize({ idol: state.idol, tasks: state.tasks, harness: state.harness }), outsideBefore);
  assert.equal(modules.directorState.applyDirectorPatch(state, prepared.patch).applied, false);
  assert.equal(state.freeMode.world.director.directorRevision, 1);
});

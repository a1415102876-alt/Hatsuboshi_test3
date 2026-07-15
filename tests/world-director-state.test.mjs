import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

const normalize = (value) => JSON.parse(JSON.stringify(value));

function loadDirectorState() {
  const sandbox = { globalThis: {} };
  sandbox.globalThis = sandbox;
  vm.runInNewContext(readFileSync(new URL("../world/director-state.js", import.meta.url), "utf8"), sandbox, { filename: "world/director-state.js" });
  return sandbox.globalThis.HatsuWorld.directorState;
}

function makeCandidate(overrides = {}) {
  return {
    id: "digest-1", dayKey: "post-live-2", timeKey: "10:30", locationId: "classroom",
    participants: ["idol:kotone", "producer"], summary: "琴音与制作人确认了下午的训练安排。", actionType: "lesson",
    evidenceQuality: "structured",
    signals: { facts: ["双方确认训练安排"], playerChoices: ["接受加练"], observations: [], hooksCreated: [], hooksResolved: [] },
    sourceTurnId: "turn-1", sourceRequestId: "request-1", sourceMessageId: 12, committedAt: 100,
    ...overrides
  };
}

test("director state starts with the minimal persisted shape", () => {
  const api = loadDirectorState();
  assert.deepEqual(normalize(api.defaultDirectorState()), {
    schemaVersion: 1, enabled: true, directorRevision: 0, chronicleRevision: 0, chronicleDigests: [],
    dailyDirection: null, pressures: [], activeJob: null, dirty: false, lastAppliedJobId: "", receipts: []
  });
});

test("accepted digest commits once and marks the director dirty", () => {
  const api = loadDirectorState();
  const state = api.defaultDirectorState();
  const candidate = makeCandidate();
  assert.equal(api.commitChronicleDigest(state, candidate).committed, true);
  assert.equal(state.chronicleRevision, 1);
  assert.equal(state.dirty, true);
  assert.equal(state.chronicleDigests.length, 1);
  assert.equal(api.commitChronicleDigest(state, candidate).committed, false);
  assert.equal(state.chronicleRevision, 1);
});

test("digest dedupe falls back to request id when no message id exists", () => {
  const api = loadDirectorState();
  const state = api.defaultDirectorState();
  const candidate = makeCandidate({ sourceTurnId: "", sourceMessageId: null });
  api.commitChronicleDigest(state, candidate);
  assert.equal(api.commitChronicleDigest(state, { ...candidate, id: "digest-retry", summary: "重试后的相同请求" }).committed, false);
  assert.equal(state.chronicleRevision, 1);
});

test("director state bounds digests and receipts and strips narrative payloads", () => {
  const api = loadDirectorState();
  const state = api.ensureDirectorShape({ chronicleDigests: [], receipts: Array.from({ length: 25 }, (_, index) => ({ jobId: `job-${index}` })) });
  for (let index = 0; index < 35; index += 1) {
    api.commitChronicleDigest(state, makeCandidate({ id: `digest-${index}`, sourceTurnId: `turn-${index}`, sourceRequestId: `request-${index}`, sourceMessageId: index, prompt: "secret prompt", body: "full narrative", rawText: "raw model response" }));
  }
  assert.equal(state.chronicleDigests.length, 32);
  assert.equal(state.receipts.length, 20);
  assert.equal(state.chronicleDigests[0].id, "digest-3");
  assert.equal(state.chronicleDigests.some((item) => "prompt" in item || "body" in item || "rawText" in item), false);
});

test("old or malformed director saves normalize without restoring network attempts", () => {
  const api = loadDirectorState();
  const normalized = normalize(api.ensureDirectorShape({
    schemaVersion: 0, enabled: "yes", directorRevision: -2, chronicleRevision: "4", chronicleDigests: "invalid",
    pressures: null, activeJob: { status: "generating", requestId: "old-request", prompt: "secret" }, dirty: 1, receipts: []
  }));
  assert.equal(normalized.schemaVersion, 1);
  assert.equal(normalized.enabled, true);
  assert.equal(normalized.directorRevision, 0);
  assert.equal(normalized.chronicleRevision, 4);
  assert.deepEqual(normalized.chronicleDigests, []);
  assert.deepEqual(normalized.pressures, []);
  assert.equal(normalized.activeJob.status, "retryable_failed");
  assert.equal(normalized.activeJob.requestId, "");
  assert.equal(normalized.activeJob.prompt, undefined);
  assert.equal(normalized.dirty, true);
});

test("runtime digest commit does not reinterpret an in-flight job as a page reload", () => {
  const api = loadDirectorState();
  const state = api.defaultDirectorState();
  state.activeJob = {
    jobId: "job-live", requestId: "request-live", saveScope: "scope-a", trigger: "day_change",
    dayKey: "day-2", baseDirectorRevision: 0, baseChronicleRevision: 0, status: "generating"
  };
  assert.equal(api.commitChronicleDigest(state, makeCandidate()).committed, true);
  assert.equal(state.activeJob.status, "generating");
  assert.equal(state.activeJob.requestId, "request-live");
  assert.equal(state.chronicleRevision, 1);
});
test("runtime normalization preserves an in-flight director attempt", () => {
  const api = loadDirectorState();
  const runtime = normalize(api.ensureDirectorShape({
    dirty: true,
    activeJob: {
      jobId: "job-live", requestId: "request-live", saveScope: "scope-a", trigger: "day_change",
      dayKey: "day-2", baseDirectorRevision: 0, baseChronicleRevision: 0, status: "generating"
    }
  }, { recoverInterrupted: false }));
  assert.equal(runtime.activeJob.status, "generating");
  assert.equal(runtime.activeJob.requestId, "request-live");
});

test("director state normalizes styled direction threads and frozen job identity", () => {
  const api = loadDirectorState();
  const normalized = normalize(api.ensureDirectorShape({
    dailyDirection: {
      dayKey: "day-2",
      tone: "克制推进",
      summary: "分别观察成长与关系线。",
      focusActorIds: ["idol:a"],
      focusPressureIds: ["pressure:a"],
      narrativeGoals: [],
      avoid: [],
      styleMixRevision: 3,
      styleThreads: {
        heroic: {
          status: "active", weight: 60, focusPressureIds: ["pressure:a"],
          dramaticQuestion: "她能否找到新的训练方法？", narrativeGoals: ["检验当前方法的极限"], dormantReason: ""
        },
        romance: {
          status: "dormant", weight: 40, focusPressureIds: [],
          dramaticQuestion: "", narrativeGoals: [], dormantReason: "当前没有合法关系素材"
        },
        kaibunsho: null
      }
    },
    activeJob: {
      jobId: "job-a", requestId: "request-a", saveScope: "scope-a", trigger: "day_change",
      dayKey: "day-2", baseDirectorRevision: 0, baseChronicleRevision: 0, status: "prepared",
      styleMode: "styled", styleMix: { heroic: 60, romance: 40, kaibunsho: 0 }, styleMixRevision: 3
    }
  }, { recoverInterrupted: false }));
  assert.equal(normalized.dailyDirection.styleMixRevision, 3);
  assert.equal(normalized.dailyDirection.styleThreads.heroic.status, "active");
  assert.equal(normalized.dailyDirection.styleThreads.romance.status, "dormant");
  assert.equal(normalized.activeJob.styleMode, "styled");
  assert.deepEqual(normalized.activeJob.styleMix, { heroic: 60, romance: 40, kaibunsho: 0 });
  assert.equal(normalized.activeJob.styleMixRevision, 3);
});

test("legacy direction stays readable without fabricated style threads", () => {
  const api = loadDirectorState();
  const normalized = normalize(api.ensureDirectorShape({
    dailyDirection: {
      dayKey: "day-1", tone: "平静", summary: "旧存档方向",
      focusActorIds: [], focusPressureIds: [], narrativeGoals: [], avoid: []
    }
  }));
  assert.equal(normalized.dailyDirection.styleMixRevision, null);
  assert.equal(normalized.dailyDirection.styleThreads, null);
});
test("frontend loads and normalizes the persisted director subtree", () => {
  const app = readFileSync(new URL("../app.js", import.meta.url), "utf8");
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  const st = readFileSync(new URL("../st.html", import.meta.url), "utf8");
  assert.match(app, /director:\s*globalThis\.HatsuWorld\?\.directorState\?\.defaultDirectorState/);
  assert.match(app, /state\.freeMode\.world\.director\s*=\s*globalThis\.HatsuWorld\?\.directorState\?\.ensureDirectorShape/);
  assert.ok(html.indexOf("world/director-state.js") < html.indexOf("app.js"));
  assert.match(st, /"world\/director-state\.js"/);
});

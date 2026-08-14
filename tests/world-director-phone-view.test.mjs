import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

const moduleUrl = new URL("../world/director-phone-view.js", import.meta.url);
const normalize = (value) => JSON.parse(JSON.stringify(value));

function loadPhoneView() {
  const sandbox = { globalThis: {} };
  sandbox.globalThis = sandbox;
  const source = existsSync(moduleUrl)
    ? readFileSync(moduleUrl, "utf8")
    : "globalThis.HatsuWorld = globalThis.HatsuWorld || {};";
  vm.runInNewContext(source, sandbox, { filename: "world/director-phone-view.js" });
  return sandbox.globalThis.HatsuWorld?.directorPhoneView;
}

function makeDirector(overrides = {}) {
  return {
    enabled: true,
    dirty: false,
    directorRevision: 3,
    chronicleRevision: 7,
    dailyDirection: {
      dayKey: "day-2",
      tone: "克制而温暖",
      summary: "让训练承诺获得回应。",
      focusActorIds: ["idol:藤田琴音"],
      focusPressureIds: ["pressure-secret"],
      narrativeGoals: ["推进承诺"],
      avoid: ["替玩家决定"]
    },
    pressures: [{
      id: "pressure-secret",
      actorId: "idol:藤田琴音",
      type: "relationship",
      theme: "trust",
      stage: "building",
      intensity: 48,
      status: "active",
      sourceSummary: "她正在确认制作人的承诺是否可靠。",
      sourceRefs: ["digest-secret"]
    }],
    activeJob: null,
    receipts: [],
    ...overrides
  };
}

test("phone view model is pure and omits Director identifiers", () => {
  const api = loadPhoneView();
  assert.equal(typeof api?.buildViewModel, "function", "director phone view module must export buildViewModel");
  const director = makeDirector({
    activeJob: {
      jobId: "job-secret",
      requestId: "request-secret",
      saveScope: "scope-secret",
      status: "generating",
      startedAt: 100,
      prompt: "prompt-secret"
    }
  });
  const before = JSON.stringify(director);
  const model = normalize(api.buildViewModel(director, {
    currentDayKey: "day-2",
    resolveActorLabel: (id) => id === "idol:藤田琴音" ? "藤田琴音" : "未知对象"
  }));

  assert.equal(JSON.stringify(director), before);
  assert.equal(model.availability, "ready");
  assert.deepEqual(model.direction, {
    dayKey: "day-2",
    isCurrentDay: true,
    tone: "克制而温暖",
    summary: "让训练承诺获得回应。"
  });
  assert.equal(model.pressures[0].actorLabel, "藤田琴音");
  assert.equal(model.runtime.jobStatus, "generating");
  assert.doesNotMatch(JSON.stringify(model), /pressure-secret|digest-secret|job-secret|request-secret|scope-secret|prompt-secret/);
});

test("missing, disabled, and stale Director states normalize without writes", () => {
  const api = loadPhoneView();
  assert.equal(typeof api?.buildViewModel, "function");

  const missing = normalize(api.buildViewModel(null, { currentDayKey: "day-2" }));
  assert.equal(missing.availability, "unavailable");
  assert.equal(missing.direction, null);
  assert.deepEqual(missing.pressures, []);

  const disabled = normalize(api.buildViewModel(makeDirector({ enabled: false }), { currentDayKey: "day-2" }));
  assert.equal(disabled.availability, "disabled");
  assert.equal(disabled.direction.isCurrentDay, true);

  const stale = normalize(api.buildViewModel(makeDirector(), { currentDayKey: "day-3" }));
  assert.equal(stale.direction.isCurrentDay, false);
});

test("pressure cards include only observable unresolved pressures", () => {
  const api = loadPhoneView();
  assert.equal(typeof api?.buildViewModel, "function");
  const director = makeDirector({
    pressures: [
      { actorId: "idol:藤田琴音", theme: "trust", stage: "building", intensity: 42, status: "active", sourceSummary: "信任正在累积。" },
      { actorId: "idol:花海咲季", theme: "competition", stage: "emerging", intensity: 30, status: "suspended", dramaticNeed: "等待合适时机。" },
      { actorId: "idol:月村手毬", theme: "identity", stage: "resolved", intensity: 10, status: "active" },
      { actorId: "idol:葛城莉莉娅", theme: "overwork", stage: "pressing", intensity: 70, status: "dissipated" }
    ]
  });
  const model = normalize(api.buildViewModel(director, {
    currentDayKey: "day-2",
    resolveActorLabel: (id) => ({ "idol:藤田琴音": "藤田琴音", "idol:花海咲季": "花海咲季" })[id] || "未知对象"
  }));

  assert.equal(model.pressures.length, 2);
  assert.deepEqual(model.pressures.map((item) => item.actorLabel), ["藤田琴音", "花海咲季"]);
  assert.deepEqual(model.pressures.map((item) => item.themeLabel), ["信任", "竞争"]);
  assert.deepEqual(model.pressures.map((item) => item.status), ["active", "suspended"]);

  const empty = normalize(api.buildViewModel(makeDirector({ pressures: [] }), { currentDayKey: "day-2" }));
  assert.deepEqual(empty.pressures, []);
});

test("runtime view bounds text and keeps only the newest five receipts", () => {
  const api = loadPhoneView();
  assert.equal(typeof api?.buildViewModel, "function");
  const receipts = Array.from({ length: 7 }, (_, index) => ({
    jobId: `job-${index}`,
    trigger: index % 2 ? "manual" : "day_change",
    status: index === 6 ? "retryable_failed" : "committed",
    reason: index === 6 ? "x".repeat(400) : "",
    createdAt: 100 + index
  }));
  const director = makeDirector({
    dirty: true,
    activeJob: { status: "retryable_failed", reason: "y".repeat(400), startedAt: 0 },
    receipts,
    dailyDirection: { ...makeDirector().dailyDirection, summary: "叙".repeat(500) }
  });
  const model = normalize(api.buildViewModel(director, { currentDayKey: "day-2" }));

  assert.equal(model.runtime.dirty, true);
  assert.equal(model.runtime.receipts.length, 5);
  assert.deepEqual(model.runtime.receipts.map((item) => item.createdAt), [106, 105, 104, 103, 102]);
  assert.ok(Array.from(model.runtime.lastError).length <= 160);
  assert.ok(Array.from(model.direction.summary).length <= 240);
  assert.doesNotMatch(JSON.stringify(model.runtime.receipts), /job-/);
});

test("a newer successful receipt clears an older failure from the runtime summary", () => {
  const api = loadPhoneView();
  const director = makeDirector({
    activeJob: null,
    receipts: [
      { status: "retryable_failed", reason: "old failure", createdAt: 100 },
      { status: "committed", reason: "", createdAt: 200 }
    ]
  });

  const model = normalize(api.buildViewModel(director, { currentDayKey: "day-2" }));

  assert.equal(model.runtime.lastError, "");
});

test("phone view exposes bounded heroic and romance threads without pressure ids", () => {
  const api = loadPhoneView();
  const director = makeDirector();
  director.dailyDirection.styleMixRevision = 3;
  director.dailyDirection.styleThreads = {
    heroic: {
      status: "active", weight: 60, focusPressureIds: ["pressure-secret"],
      dramaticQuestion: "她能否找到新的训练方法？", narrativeGoals: ["检验当前方法的极限"], dormantReason: ""
    },
    romance: {
      status: "dormant", weight: 40, focusPressureIds: [],
      dramaticQuestion: "", narrativeGoals: [], dormantReason: "当前没有合法关系素材"
    },
    kaibunsho: null
  };
  const model = normalize(api.buildViewModel(director, { currentDayKey: "day-2" }));
  assert.equal(model.direction.styleMixRevision, 3);
  assert.equal(model.direction.styleThreads.heroic.status, "active");
  assert.equal(model.direction.styleThreads.romance.status, "dormant");
  assert.doesNotMatch(JSON.stringify(model.direction.styleThreads), /pressure-secret/);
});

test("browser and SillyTavern loaders install the phone view before app.js", () => {
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  const st = readFileSync(new URL("../st.html", import.meta.url), "utf8");
  assert.ok(html.indexOf("world/director-phone-view.js") > html.indexOf("world/director-state.js"));
  assert.ok(html.indexOf("world/director-phone-view.js") < html.indexOf("app.js"));
  assert.match(st, /"world\/director-phone-view\.js"/);
});

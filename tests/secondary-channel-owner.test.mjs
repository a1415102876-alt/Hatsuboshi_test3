import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

const appSource = readFileSync(new URL("../app.js", import.meta.url), "utf8");
const normalize = (value) => JSON.parse(JSON.stringify(value));

function readFunction(source, name) {
  const start = source.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `${name} must exist`);
  const bodyStart = source.indexOf("{", source.indexOf(")", start));
  let depth = 0;
  let quote = "";
  let escaped = false;
  for (let index = bodyStart; index < source.length; index += 1) {
    const char = source[index];
    if (quote) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === quote) quote = "";
      continue;
    }
    if (char === '"' || char === "'" || char === "`") quote = char;
    else if (char === "{") depth += 1;
    else if (char === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(start, index + 1);
    }
  }
  throw new Error(`Could not parse ${name}`);
}

test("secondary diagnostics retain only redacted scalar request metadata", () => {
  const context = {
    Date: { now: () => 1234 },
    secondaryApiDebug: { events: [], lastMessage: "" },
    renderSecondaryApiDebug() {}
  };
  vm.runInNewContext(`${readFunction(appSource, "pushSecondaryDebug")}; this.push = pushSecondaryDebug;`, context);
  const record = normalize(context.push({
    phase: "reply", kind: "director", requestId: "director-request-secret-abcdef",
    ok: false, error: "timeout", textLength: 0, preview: "private narrative", prompt: "private prompt"
  }));

  assert.equal(record.requestSuffix, "abcdef");
  for (const forbidden of ["requestId", "preview", "prompt", "apiKey", "leaseId"]) {
    assert.equal(forbidden in record, false);
  }
  assert.doesNotMatch(JSON.stringify(record), /private|director-request-secret/);
});

test("secondary diagnostic summary exposes owner age scope match and request suffix", () => {
  const summary = { textContent: "" };
  const log = { textContent: "" };
  const context = {
    Date: { now: () => 301000 },
    document: { getElementById: (id) => id === "worldEngineApiDebugSummary" ? summary : id === "worldEngineApiDebugLog" ? log : null },
    secondaryChannelOwner: { kind: "director", requestId: "director-secret-abcdef", saveScope: "scope-a", acquiredAt: 80000 },
    secondaryApiDebug: { events: [], lastMessage: "等待回复" },
    getSecondaryChannelSaveScope: () => "scope-a",
    formatSecondaryDebugTime: () => "00:00:00"
  };
  vm.runInNewContext(`${readFunction(appSource, "renderSecondaryApiDebug")}; this.renderDebug = renderSecondaryApiDebug;`, context);
  context.renderDebug();

  assert.match(summary.textContent, /director/);
  assert.match(summary.textContent, /221秒/);
  assert.match(summary.textContent, /scope 匹配/);
  assert.match(summary.textContent, /abcdef/);
  assert.doesNotMatch(summary.textContent, /director-secret/);
});

test("secondary diagnostics render acquire release reject and reply by phase", () => {
  const summary = { textContent: "" };
  const log = { textContent: "" };
  const context = {
    Date: { now: () => 4000 },
    document: { getElementById: (id) => id === "worldEngineApiDebugSummary" ? summary : id === "worldEngineApiDebugLog" ? log : null },
    secondaryChannelOwner: null,
    secondaryApiDebug: {
      lastMessage: "done",
      events: [
        { at: 5, phase: "reply", kind: "director", requestSuffix: "reply1", ok: true, textLength: 2434, parseOk: true },
        { at: 4, phase: "reject", kind: "director", requestSuffix: "reject", error: "secondary_owner_mismatch" },
        { at: 3, phase: "release", kind: "secondary", requestSuffix: "rel123", error: "director_job_mismatch" },
        { at: 2, phase: "send", kind: "director", requestSuffix: "send12", transport: "host(ST)", promptLength: 13939 },
        { at: 1, phase: "acquire", kind: "director", requestSuffix: "acq123" }
      ]
    },
    getSecondaryChannelSaveScope: () => "scope-a",
    formatSecondaryDebugTime: () => "06:37:00"
  };
  vm.runInNewContext(`${readFunction(appSource, "renderSecondaryApiDebug")}; this.renderDebug = renderSecondaryApiDebug;`, context);
  context.renderDebug();

  assert.match(log.textContent, /取得通道 director/);
  assert.match(log.textContent, /发送 director/);
  assert.match(log.textContent, /释放通道.*director_job_mismatch/);
  assert.match(log.textContent, /拒绝 director.*secondary_owner_mismatch/);
  assert.match(log.textContent, /回复 director｜有效回复｜解析成功｜文本 2434 字/);
  assert.doesNotMatch(log.textContent, /取得通道 director[^\n]*无有效回复/);
  assert.match(log.textContent, /acq123/);
  assert.doesNotMatch(log.textContent, /director-request-secret/);
});

function loadOwnerApi() {
  const sandbox = { globalThis: {} };
  sandbox.globalThis = sandbox;
  vm.runInNewContext(readFileSync(new URL("../world/secondary-channel-owner.js", import.meta.url), "utf8"), sandbox);
  return sandbox.globalThis.HatsuWorld.secondaryChannelOwner;
}

function intent(overrides = {}) {
  return { jobId: "world:day-2", requestId: "req-1", kind: "world", saveScope: "scope-a", acquiredAt: 100, ...overrides };
}

test("secondary owner acquires once and releases only by exact identity", () => {
  const api = loadOwnerApi();
  const first = api.acquireSecondaryOwner(null, intent());
  assert.equal(first.acquired, true);
  assert.deepEqual(normalize(first.owner), intent());
  assert.equal(api.acquireSecondaryOwner(first.owner, intent({ requestId: "req-2" })).acquired, false);
  const stale = api.releaseSecondaryOwner(first.owner, { jobId: "world:day-2", requestId: "req-old", saveScope: "scope-a" });
  assert.equal(stale.released, false);
  assert.deepEqual(normalize(stale.owner), intent());
  const released = api.releaseSecondaryOwner(first.owner, { jobId: "world:day-2", requestId: "req-1", saveScope: "scope-a" });
  assert.equal(released.released, true);
  assert.equal(released.owner, null);
});

test("secondary owner rejects malformed or cross-scope identity and detects timeout", () => {
  const api = loadOwnerApi();
  assert.equal(api.acquireSecondaryOwner(null, intent({ saveScope: "" })).acquired, false);
  assert.equal(api.acquireSecondaryOwner(null, intent({ jobId: "" })).acquired, false);
  const owner = api.acquireSecondaryOwner(null, intent()).owner;
  assert.equal(api.isSecondaryOwnerMatch(owner, { ...intent(), saveScope: "scope-b" }), false);
  assert.equal(api.isSecondaryOwnerTimedOut(owner, 1099, 1000), false);
  assert.equal(api.isSecondaryOwnerTimedOut(owner, 1100, 1000), true);
  const newer = api.acquireSecondaryOwner(null, intent({ requestId: "req-new", acquiredAt: 200 })).owner;
  assert.equal(api.releaseSecondaryOwner(newer, intent()).released, false);
});

test("Director watchdog expires before the default secondary channel and preserves exact owner identity", () => {
  const timers = [];
  const replies = [];
  const sandbox = {
    window: {
      setTimeout(callback, delay) {
        timers.push({ callback, delay });
        return timers.length;
      }
    },
    clearTimeout() {}
  };
  const context = { ...sandbox, replies };
  vm.runInNewContext([
    "const SECONDARY_MODEL_CHANNEL_TIMEOUT_MS = 300000;",
    "const DIRECTOR_MODEL_CHANNEL_TIMEOUT_MS = 210000;",
    "let secondaryChannelTimeoutId = 0;",
    "function handleSecondaryAiReply(payload) { globalThis.replies.push(payload); }",
    readFunction(appSource, "scheduleSecondaryModelChannelTimeout"),
    "this.schedule = scheduleSecondaryModelChannelTimeout;"
  ].join("\n"), context);

  const directorOwner = intent({ jobId: "director-job", requestId: "director-request", kind: "director" });
  context.schedule(directorOwner);
  assert.equal(timers[0].delay, 210000);
  timers[0].callback();
  assert.deepEqual(normalize(replies[0]), { ...directorOwner, text: "", ok: false, error: "timeout" });

  context.schedule(intent({ kind: "world" }));
  assert.equal(timers[1].delay, 300000);
});

function occupiedDispatch() {
  return { ok: false, reason: "secondary_busy", blockingOwner: intent({ kind: "tier" }) };
}

test("occupied secondary channel rejects daily world generation before business writes", () => {
  const state = { freeMode: { world: { dailyGen: { dayKey: "day-2", status: "pending", source: "", pendingRequestId: "" } } } };
  const before = normalize(state);
  const calls = { mark: 0, save: 0, render: 0, send: 0 };
  const sandbox = {
    globalThis: null, state,
    shouldUseSecondaryWorldGen: () => true,
    getWorldFeedDayKey: () => "day-2",
    formatWorldFeedDayLabel: () => "day 2",
    getWorldFeedHelpers: () => ({}),
    createSecondaryRequestId: () => "req-new",
    acquireSecondaryEntryDispatch: occupiedDispatch,
    requestHostSecondaryPromptSend: () => { calls.send += 1; return true; },
    saveState: () => { calls.save += 1; }, renderSnsApp: () => { calls.render += 1; },
    renderBroadcastApp: () => { calls.render += 1; }, renderSideQuestOverlay: () => { calls.render += 1; },
    fallbackDailyWorldToStatic: () => {}, pendingSecondaryRequestId: "occupied", pendingSecondaryMeta: { kind: "tier" }
  };
  sandbox.globalThis = sandbox;
  sandbox.HatsuWorld = { worldGen: {
    ensureDailyGenShape: () => state.freeMode.world.dailyGen,
    shouldIncludeSideQuests: () => false,
    buildDailyWorldPrompt: () => "prompt",
    markDailyWorldGenLoading: () => { calls.mark += 1; state.freeMode.world.dailyGen.status = "loading"; }
  } };
  vm.runInNewContext(`(${readFunction(appSource, "maybeRequestDailyWorldGeneration")})`, sandbox)();
  assert.deepEqual(normalize(state), before);
  assert.deepEqual(calls, { mark: 0, save: 0, render: 0, send: 0 });
});

test("manual commission world generation carries a runtime-only Director suppression flag", () => {
  const state = { freeMode: { world: { dailyGen: { dayKey: "day-2", status: "pending", source: "", pendingRequestId: "" } } } };
  let acquiredMeta = null;
  const sandbox = {
    globalThis: null, state,
    shouldUseSecondaryWorldGen: () => true,
    getWorldFeedDayKey: () => "day-2",
    formatWorldFeedDayLabel: () => "day 2",
    getWorldFeedHelpers: () => ({}),
    createSecondaryRequestId: () => "world-request",
    acquireSecondaryEntryDispatch(_kind, _requestId, meta) {
      acquiredMeta = { ...meta };
      return { ok: true, owner: { jobId: "world-job", requestId: "world-request", kind: "world", saveScope: "scope-a" } };
    },
    requestHostSecondaryPromptSend: () => true,
    saveState() {}, renderSnsApp() {}, renderBroadcastApp() {}, renderSideQuestOverlay() {},
    fallbackDailyWorldToStatic() {}
  };
  sandbox.globalThis = sandbox;
  sandbox.HatsuWorld = { worldGen: {
    ensureDailyGenShape: () => state.freeMode.world.dailyGen,
    shouldIncludeSideQuests: () => true,
    buildDailyWorldPrompt: () => "prompt",
    markDailyWorldGenLoading: () => { state.freeMode.world.dailyGen.status = "loading"; }
  } };

  vm.runInNewContext(`(${readFunction(appSource, "maybeRequestDailyWorldGeneration")})`, sandbox)({ suppressDirectorFollowup: true });
  assert.equal(acquiredMeta.suppressDirectorFollowup, true);
});

test("occupied secondary channel rejects daily side quests before business writes", () => {
  const state = { tasks: { side: { genStatus: "pending" } } };
  const before = normalize(state);
  const calls = { mark: 0, save: 0, render: 0, send: 0 };
  const sandbox = {
    globalThis: null, state, shouldUseSecondaryWorldGen: () => false,
    createSecondaryRequestId: () => "req-new", acquireSecondaryEntryDispatch: occupiedDispatch,
    requestHostSecondaryPromptSend: () => { calls.send += 1; return true; }, fallbackSideQuestToStatic: () => {},
    saveState: () => { calls.save += 1; }, renderSideQuestOverlay: () => { calls.render += 1; },
    pendingSecondaryRequestId: "occupied", pendingSecondaryMeta: { kind: "tier" }
  };
  sandbox.globalThis = sandbox;
  sandbox.HatsuTasks = {
    isSandboxTasksActive: () => true, shouldUseSecondarySideGen: () => true, getSideQuestGenStatus: () => "pending",
    getCampusDayKey: () => "day-2", markSideQuestGenPending: () => { calls.mark += 1; state.tasks.side.genStatus = "loading"; }
  };
  sandbox.HatsuSideQuestApi = { buildSideQuestDailyPrompt: () => "prompt" };
  vm.runInNewContext(`(${readFunction(appSource, "maybeRequestSideQuestGeneration")})`, sandbox)();
  assert.deepEqual(normalize(state), before);
  assert.deepEqual(calls, { mark: 0, save: 0, render: 0, send: 0 });
});

test("occupied secondary channel rejects tier generation before business writes", () => {
  const state = { tasks: { side: { slots: [{ status: "open", tierHints: null, tierGenStatus: "idle" }] } } };
  const before = normalize(state);
  const calls = { mark: 0, save: 0, open: 0, send: 0 };
  const sandbox = {
    globalThis: null, state, createSecondaryRequestId: () => "req-new", acquireSecondaryEntryDispatch: occupiedDispatch,
    requestHostSecondaryPromptSend: () => { calls.send += 1; return true; },
    saveState: () => { calls.save += 1; }, openSideQuestTierPanel: () => { calls.open += 1; }
  };
  sandbox.globalThis = sandbox;
  sandbox.HatsuTasks = { shouldUseSecondarySideGen: () => true, markSideQuestTierGenPending: () => { calls.mark += 1; state.tasks.side.slots[0].tierGenStatus = "loading"; } };
  sandbox.HatsuSideQuestApi = { buildSideQuestTierPrompt: () => "prompt" };
  vm.runInNewContext(`(${readFunction(appSource, "requestSideQuestTierGeneration")})`, sandbox)(0);
  assert.deepEqual(normalize(state), before);
  assert.deepEqual(calls, { mark: 0, save: 0, open: 0, send: 0 });
});

test("occupied secondary channel rejects API test before debug UI mutation", () => {
  const debug = { lastMessage: "unchanged" };
  const calls = { render: 0, send: 0 };
  const sandbox = {
    getSecondaryApiConfig: () => ({ baseUrl: "https://example.test", model: "m" }),
    createSecondaryRequestId: () => "req-new", acquireSecondaryEntryDispatch: occupiedDispatch,
    secondaryApiDebug: debug, renderSecondaryApiDebug: () => { calls.render += 1; },
    requestHostSecondaryPromptSend: () => { calls.send += 1; return true; }, showToast: () => {},
    pendingSecondaryRequestId: "", pendingSecondaryMeta: null
  };
  vm.runInNewContext(`(${readFunction(appSource, "runSecondaryApiTest")})`, sandbox)();
  assert.deepEqual(debug, { lastMessage: "unchanged" });
  assert.deepEqual(calls, { render: 0, send: 0 });
});

test("Director host dispatch reserves enough output tokens for the JSON contract", () => {
  const posted = [];
  const owner = { jobId: "director-job", requestId: "director-request", saveScope: "scope-a", kind: "director" };
  const context = {
    getSecondaryApiConfig: () => ({
      enabled: true,
      baseUrl: "https://example.test",
      model: "model-a",
      apiKey: "secret",
      temperature: 0.7,
      maxTokens: 1200
    }),
    isCurrentSecondaryReply: () => true,
    isSillyTavernHost: () => true,
    pushSecondaryDebug() {},
    window: { parent: { postMessage: (payload) => posted.push(payload) } },
    runLocalSecondaryApiPrompt() {
      throw new Error("local fallback must not run");
    }
  };
  vm.runInNewContext(`${readFunction(appSource, "requestHostSecondaryPromptSend")}; this.send = requestHostSecondaryPromptSend;`, context);

  assert.equal(context.send("private prompt", owner), true);
  assert.equal(posted.length, 1);
  assert.equal(posted[0].kind, "director");
  assert.equal(posted[0].apiConfig.maxTokens, 3200);
});

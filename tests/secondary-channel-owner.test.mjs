import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

const appSource = readFileSync(new URL("../app.js", import.meta.url), "utf8");
const normalize = (value) => JSON.parse(JSON.stringify(value));

function readFunction(source, name) {
  const start = source.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `${name} must exist`);
  const bodyStart = source.indexOf("{", start);
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

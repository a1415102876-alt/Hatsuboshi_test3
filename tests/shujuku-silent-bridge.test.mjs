import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

const source = readFileSync(new URL("../shujuku-silent-bridge.js", import.meta.url), "utf8");
const loaderSource = readFileSync(new URL("../shujuku-silent-local.js", import.meta.url), "utf8");

function readFunction(sourceText, functionName) {
  const start = sourceText.indexOf(`function ${functionName}(`);
  assert.notEqual(start, -1, `${functionName} must exist`);
  const bodyStart = sourceText.indexOf("{", start);
  let depth = 0;
  for (let index = bodyStart; index < sourceText.length; index += 1) {
    if (sourceText[index] === "{") depth += 1;
    if (sourceText[index] === "}") {
      depth -= 1;
      if (depth === 0) return sourceText.slice(start, index + 1);
    }
  }
  throw new Error(`Could not parse ${functionName}`);
}

function loadBridge(api) {
  const window = { AutoCardUpdaterAPI: api };
  window.window = window;
  vm.runInNewContext(source, { window, globalThis: window, console });
  return window.HatsuShujukuSilentBridge;
}

function loadBridgeFromParent(api) {
  const parent = { AutoCardUpdaterAPI: api };
  const window = { parent, top: parent };
  window.window = window;
  vm.runInNewContext(source, { window, globalThis: window, console });
  return window.HatsuShujukuSilentBridge;
}

test("silent bridge delegates preparation and normalizes the prompt", async () => {
  const calls = [];
  const bridge = loadBridge({
    async prepareExternalGeneration(input) {
      calls.push(input);
      return { prompt: "  planned prompt  " };
    },
    async commitExternalAssistant() {}
  });
  const result = await bridge.prepareExternalGeneration({
    envelope: { requestId: "req-1", saveScope: "scope-a", prompt: "raw prompt" },
    attempt: { userMessageId: 4, attemptKey: "attempt-1" }
  });
  assert.deepEqual(JSON.parse(JSON.stringify(result)), { prompt: "planned prompt" });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].userMessageId, 4);
});

test("silent bridge commits one exact external assistant", async () => {
  const calls = [];
  const bridge = loadBridge({
    async prepareExternalGeneration() { return { prompt: "p" }; },
    async commitExternalAssistant(input) { calls.push(input); return { ok: true }; }
  });
  const result = await bridge.commitExternalAssistant({
    envelope: { requestId: "req-1", saveScope: "scope-a" },
    attempt: { attemptKey: "attempt-1" },
    assistantMessageId: 5,
    text: "reply"
  });
  assert.equal(result.ok, true);
  assert.equal(calls.length, 1);
  assert.deepEqual(JSON.parse(JSON.stringify(calls[0])), {
    requestId: "req-1",
    saveScope: "scope-a",
    attemptKey: "attempt-1",
    assistantMessageId: 5,
    text: "reply"
  });
});

test("silent bridge fails closed when the local Shujuku API is absent", async () => {
  const bridge = loadBridge({});
  assert.equal(bridge.isAvailable(), false);
  await assert.rejects(
    bridge.prepareExternalGeneration({ envelope: { prompt: "p" }, attempt: { userMessageId: 1 } }),
    /shujuku_external_prepare_unavailable/
  );
});

test("silent bridge is unavailable until the Shujuku core APIs are ready", () => {
  const api = {
    prepareExternalGeneration() {},
    commitExternalAssistant() {},
    isExternalGenerationReady() { return false; }
  };
  const bridge = loadBridge(api);
  assert.equal(bridge.isAvailable(), false);
  api.isExternalGenerationReady = () => true;
  assert.equal(bridge.isAvailable(), true);
});

test("silent bridge resolves Shujuku API from the SillyTavern parent window", async () => {
  const bridge = loadBridgeFromParent({
    async prepareExternalGeneration() { return { prompt: "parent prompt" }; },
    async commitExternalAssistant() { return { ok: true }; }
  });
  assert.equal(bridge.isAvailable(), true);
  const result = await bridge.prepareExternalGeneration({
    envelope: { requestId: "req-1", saveScope: "scope-a", prompt: "raw" },
    attempt: { userMessageId: 2, attemptKey: "attempt-1" }
  });
  assert.equal(result.prompt, "parent prompt");
});

test("local Shujuku loader injects narrow external generation APIs", () => {
  assert.match(loaderSource, /spv3\.7\/index\.js/);
  assert.match(loaderSource, /orchestrateAfterCommandsStrategy1_ACU/);
  assert.match(loaderSource, /runOptimizationLogicWithUI_ACU/);
  assert.match(loaderSource, /loadAllChatMessages_ACU\(\)/);
  assert.match(loaderSource, /evaluateNewMessageAction_ACU\(/);
  assert.match(loaderSource, /triggerAutomaticUpdateIfNeeded_ACU\(\)/);
  assert.doesNotMatch(loaderSource, /handleNewMessageDebounced_ACU\('HATSU_EXTERNAL_ASSISTANT'/);
  assert.match(loaderSource, /api\.prepareExternalGeneration/);
  assert.match(loaderSource, /api\.commitExternalAssistant/);
  assert.doesNotMatch(loaderSource, /GENERATION_ENDED/);
  assert.doesNotMatch(loaderSource, /triggerSlash/);
});

test("local Shujuku loader only reuses an API owned by the current live floor", () => {
  const isReusable = vm.runInNewContext(`(${readFunction(loaderSource, "isReusableSilentApi")})`);
  const currentWindow = {};
  const currentApi = {
    __hatsuSilentOwnerWindow: currentWindow,
    prepareExternalGeneration() {},
    commitExternalAssistant() {}
  };
  const staleApi = {
    ...currentApi,
    __hatsuSilentOwnerWindow: {}
  };

  assert.equal(isReusable(currentApi, currentWindow), true);
  assert.equal(isReusable(staleApi, currentWindow), false);
  assert.equal(isReusable({ ...currentApi, __hatsuSilentOwnerWindow: null }, currentWindow), false);
});

test("local Shujuku injection identifies its owning floor", () => {
  assert.match(loaderSource, /api\.__hatsuSilentOwnerWindow\s*=\s*window/);
});

test("local Shujuku injection exposes actual core readiness", () => {
  assert.match(loaderSource, /api\.isExternalGenerationReady/);
  assert.match(loaderSource, /coreApisAreReady_ACU/);
});

test("external database commits retain update preflight diagnostics", () => {
  assert.match(loaderSource, /preCheckCanProceed/);
  assert.match(loaderSource, /preCheckReason/);
  assert.match(loaderSource, /plannedTableCount/);
  assert.match(loaderSource, /getLastExternalCommitStatus/);
});

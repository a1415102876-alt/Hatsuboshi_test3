import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

const loaderSource = readFileSync(new URL("../shujuku-original-local.js", import.meta.url), "utf8");
const bridgeSource = readFileSync(new URL("../shujuku-original-bridge.js", import.meta.url), "utf8");
const stSource = readFileSync(new URL("../st.html", import.meta.url), "utf8");

test("local readiness helper never loads or mutates the official Shujuku instance", () => {
  assert.doesNotMatch(loaderSource, /gcore\.jsdelivr|cdn\.jsdelivr/);
  assert.doesNotMatch(loaderSource, /import\(/);
  assert.doesNotMatch(loaderSource, /fetch\s*\(/);
  assert.doesNotMatch(loaderSource, /new Function/);
  assert.doesNotMatch(loaderSource, /delete candidate/);
  assert.doesNotMatch(loaderSource, /__ACU_STAR_DB_III_LOADED__/);
  assert.match(loaderSource, /HATSU_SHUJUKU_ORIGINAL_READY/);
  assert.match(loaderSource, /AutoCardUpdaterAPI/);
});

test("official loader discovers the API in accessible parent windows", () => {
  assert.match(loaderSource, /global\.parent/);
  assert.match(loaderSource, /global\.top/);
  assert.match(loaderSource, /getAccessibleApis/);
});

test("official loader resolves when the already-loaded public API is available", () => {
  assert.match(loaderSource, /function waitForPublicApi/);
  assert.match(loaderSource, /await waitForPublicApi\(\)/);
  assert.doesNotMatch(loaderSource, /await api\.refreshDataAndWorldbook\(\)/);
});

test("new loader version replaces a ready promise left by an older loader", () => {
  assert.match(loaderSource, /HATSU_SHUJUKU_ORIGINAL_LOADER_VERSION/);
  assert.match(loaderSource, /!== SHUJUKU_ORIGINAL_LOADER_VERSION/);
});

test("original bridge exposes public API operations and diagnostics", () => {
  assert.match(bridgeSource, /HatsuShujukuOriginalBridge/);
  assert.match(bridgeSource, /commitExternalAssistant/);
  assert.match(bridgeSource, /getLastCommitDiagnostics/);
  assert.match(bridgeSource, /triggerUpdate/);
  assert.match(bridgeSource, /exportTableAsJson/);
});

test("ST loader includes the shared database output parser", () => {
  assert.match(stSource, /shujuku-output-parser\.js/);
});

test("startup script selects original silent adapter", () => {
  const source = readFileSync(new URL("../shujuku-original-startup.html", import.meta.url), "utf8");
  assert.match(source, /shujuku_original_silent_v1/);
  assert.match(source, /shujuku-original-local\.js/);
  assert.match(source, /st\.html\?v=20260804-4/);
  assert.match(source, /shujuku-original-bridge\.js\?v=20260804-1/);
  assert.match(source, /HATSU_SHUJUKU_ORIGINAL_READY/);
  assert.doesNotMatch(source, /gcore\.jsdelivr\.net\/gh\/AlbusKen\/shujuku/);
  assert.doesNotMatch(source, /shujuku-silent-local\.js/);
});

test("startup only attaches to an already-loaded official database", () => {
  const source = readFileSync(new URL("../shujuku-original-startup.html", import.meta.url), "utf8");
  assert.match(source, /HATSU_SHUJUKU_ORIGINAL_READY/);
  assert.match(source, /shujuku-original-bridge\.js/);
  assert.doesNotMatch(source, /setTemplateAssistantAddonGuard/);
});

test("st host router recognizes the original silent adapter", () => {
  assert.match(stSource, /shujuku_original_silent_v1/);
  assert.match(stSource, /runShujukuOriginalSilentAttempt/);
  assert.match(stSource, /resolveShujukuOriginalBridge/);
});

test("original adapter drives official Strategy 1 events before text generation", () => {
  assert.match(stSource, /emitHostMessageSent\(attempt.userMessageId/);
  assert.match(stSource, /emitShujukuGenerationAfterCommands/);
  const start = stSource.indexOf('async function runShujukuOriginalSilentAttempt');
  const end = stSource.indexOf('async function runHostGenerationAttempt', start);
  const runner = stSource.slice(start, end);
  const sent = runner.indexOf('emitHostMessageSent(attempt.userMessageId');
  const planning = runner.indexOf('emitShujukuGenerationAfterCommands(attempt');
  const generation = runner.indexOf('generate(plannedPrompt');
  assert.ok(sent >= 0 && planning > sent && generation > planning);
});

test("original adapter uses the generation lifecycle before its asynchronous database fallback", () => {
  const start = stSource.indexOf('async function runShujukuOriginalSilentAttempt');
  const end = stSource.indexOf('async function runHostGenerationAttempt', start);
  const runner = stSource.slice(start, end);
  const planning = runner.indexOf('emitShujukuGenerationAfterCommands(attempt');
  const started = runner.indexOf('emitShujukuGenerationStarted(');
  const generation = runner.indexOf('generate(plannedPrompt');
  const assistant = runner.indexOf("createAssistant('assistant'");
  const persisted = runner.indexOf('persistChat()');
  const ended = runner.indexOf('emitShujukuGenerationEnded(');

  assert.ok(planning >= 0 && started > planning && generation > started);
  assert.ok(assistant > generation && persisted > assistant && ended > persisted);
  const replied = runner.indexOf("postReply(envelope.requestId");
  const fallback = runner.indexOf("Promise.resolve(commitExternalAssistant");
  assert.ok(replied >= 0 && fallback > replied, "database fallback must be scheduled after the frontend reply");
  assert.match(runner, /Promise\.resolve\(.*commitExternalAssistant/s);
  assert.doesNotMatch(runner, /CHARACTER_MESSAGE_RENDERED|CHAT_CHANGED/);
});

test("original adapter keeps exactly one generation-ended event while scheduling a non-blocking database fallback", () => {
  const start = stSource.indexOf('async function runShujukuOriginalSilentAttempt');
  const end = stSource.indexOf('async function runHostGenerationAttempt', start);
  const runner = stSource.slice(start, end);
  assert.equal((runner.match(/emitShujukuGenerationEnded\(/g) || []).length, 1);
  assert.match(runner, /commitExternalAssistant/);
  assert.match(runner, /catch\s*\(.*database.*\)/s);
});

test("original database fallback calls triggerUpdate only when automatic update did not change tables", async () => {
  const bridgeSource = readFileSync(new URL("../shujuku-original-bridge.js", import.meta.url), "utf8");
  let tables = { sheet_business: { content: "before" } };
  let triggerCalls = 0;
  const context = {
    AutoCardUpdaterAPI: {
      exportTableAsJson: () => tables,
      refreshDataAndWorldbook: async () => {},
      triggerUpdate: async () => { triggerCalls += 1; return true; }
    },
    parent: { SillyTavern_API_ACU: { chat: [] } },
    setTimeout
  };
  vm.runInNewContext(`${bridgeSource}\nthis.commit = HatsuShujukuOriginalBridge.commitExternalAssistant;`, context);

  await context.commit({ assistantMessageId: 5, settleDelayMs: 0, busyRetryDelayMs: 0 });
  assert.equal(triggerCalls, 1);

  let snapshotReads = 0;
  context.AutoCardUpdaterAPI.exportTableAsJson = () => {
    snapshotReads += 1;
    return snapshotReads === 1
      ? { sheet_business: { content: "before-auto" } }
      : { sheet_business: { content: "after-auto" } };
  };
  await context.commit({ assistantMessageId: 6, settleDelayMs: 0, busyRetryDelayMs: 0 });
  assert.equal(triggerCalls, 1);
});

test("original database fallback retries once after an updater-busy response", async () => {
  const bridgeSource = readFileSync(new URL("../shujuku-original-bridge.js", import.meta.url), "utf8");
  let triggerCalls = 0;
  const context = {
    AutoCardUpdaterAPI: {
      exportTableAsJson: () => ({ sheet_business: { content: "unchanged" } }),
      refreshDataAndWorldbook: async () => {},
      triggerUpdate: async () => {
        triggerCalls += 1;
        return triggerCalls > 1;
      }
    },
    parent: { SillyTavern_API_ACU: { chat: [] } },
    setTimeout
  };
  vm.runInNewContext(`${bridgeSource}\nthis.commit = HatsuShujukuOriginalBridge.commitExternalAssistant;`, context);

  await context.commit({ assistantMessageId: 7, settleDelayMs: 0, busyRetryDelayMs: 0 });
  assert.equal(triggerCalls, 2);
});

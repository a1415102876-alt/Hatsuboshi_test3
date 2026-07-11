import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

const bridgeSource = readFileSync(new URL("../st.html", import.meta.url), "utf8");
const appSource = readFileSync(new URL("../app.js", import.meta.url), "utf8");

function readFunction(source, functionName) {
  const declaration = `function ${functionName}(`;
  let start = source.indexOf(declaration);
  assert.notEqual(start, -1, `${functionName} must exist`);
  if (source.slice(Math.max(0, start - 6), start) === 'async ') start -= 6;
  const bodyStart = source.indexOf("{", start);
  let depth = 0;
  let quote = null;
  let escaped = false;

  for (let index = bodyStart; index < source.length; index += 1) {
    const character = source[index];
    if (quote) {
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === quote) quote = null;
      continue;
    }
    if (character === '"' || character === "'" || character === "`") quote = character;
    else if (character === "{") depth += 1;
    else if (character === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(start, index + 1);
    }
  }
  throw new Error(`Could not parse ${functionName}`);
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function loadEnvelopeHelpers() {
  const context = {};
  vm.runInNewContext([
    "const HOST_GENERATION_MODES = new Set(['opening_quiet', 'shujuku_same_layer']);",
    readFunction(bridgeSource, "createHostGenerationAttemptKey"),
    readFunction(bridgeSource, "normalizeHostGenerationEnvelope"),
    "this.createAttemptKey = createHostGenerationAttemptKey;",
    "this.normalizeEnvelope = normalizeHostGenerationEnvelope;"
  ].join("\n"), context);
  return context;
}

test("host generation envelope requires request lease scope and explicit mode", () => {
  const { normalizeEnvelope } = loadEnvelopeHelpers();
  const normalized = normalizeEnvelope({
    requestId: "req-1",
    channelLeaseId: "lease-1",
    saveScope: "char-1-chat-a",
    ownerKind: "ordinary_action",
    generationMode: "shujuku_same_layer",
    prompt: "current prompt",
    turnId: "turn-1"
  });

  assert.deepEqual(JSON.parse(JSON.stringify(normalized)), {
    ok: true,
    requestId: "req-1",
    channelLeaseId: "lease-1",
    saveScope: "char-1-chat-a",
    ownerKind: "ordinary_action",
    generationMode: "shujuku_same_layer",
    prompt: "current prompt",
    turnId: "turn-1",
    attemptKey: "req-1::lease-1::char-1-chat-a"
  });
});

test("host generation envelope rejects missing lease and unknown mode", () => {
  const { normalizeEnvelope } = loadEnvelopeHelpers();

  assert.deepEqual(JSON.parse(JSON.stringify(normalizeEnvelope({
    requestId: "req-1",
    saveScope: "scope-a",
    generationMode: "shujuku_same_layer",
    prompt: "x"
  }))), { ok: false, reason: "invalid_generation_envelope" });

  assert.deepEqual(JSON.parse(JSON.stringify(normalizeEnvelope({
    requestId: "req-1",
    channelLeaseId: "lease-1",
    saveScope: "scope-a",
    generationMode: "raw",
    prompt: "x"
  }))), { ok: false, reason: "invalid_generation_envelope" });
});

test("frontend host dispatch posts the complete generation envelope", () => {
  const posted = [];
  const owner = {
    requestId: "req-1",
    channelLeaseId: "lease-1",
    ownerKind: "ordinary_action",
    turnId: "turn-1",
    saveScope: "scope-a"
  };
  const context = {
    isSillyTavernHost: () => true,
    releasePrimaryModelChannel() {},
    state: { lastPrompt: "", activeStoryNode: null, harness: { activeTurn: { turnId: "turn-1" } } },
    document: { getElementById: () => ({ value: "" }) },
    getPrimaryModelChannelOwner: () => owner,
    isPrimaryModelLeaseCurrent: () => true,
    rejectPrimaryModelDispatch: () => false,
    tryAcquirePrimaryModelChannel() { throw new Error("explicit lease must not auto-acquire"); },
    resetPhoneChatPendingState() {},
    resetBroadcastPendingState() {},
    recordDebugPromptDispatch() {},
    refreshVnDebugView() {},
    saveState() {},
    debugHarnessEvent() {},
    showToast() {},
    aiBridgeDebug: {},
    window: { parent: { postMessage: (payload) => posted.push(payload) } },
    Date: { now: () => 1000 }
  };
  vm.runInNewContext([
    "let hostPromptSendSource = 'general';",
    "let hostPromptSendSilent = false;",
    "let pendingAiRequestId = '';",
    "let aiReplyRetryCount = 0;",
    "const recentHostPromptDispatches = [];",
    "const activeHostSaveScope = 'scope-a';",
    "const runtimeSessionEpoch = 'epoch-a';",
    readFunction(appSource, "requestHostPromptSend"),
    "this.send = requestHostPromptSend;"
  ].join("\n"), context);

  assert.equal(context.send("prompt", "req-1", {
    channelLeaseId: "lease-1",
    ownerKind: "ordinary_action",
    generationMode: "shujuku_same_layer",
    turnId: "turn-1"
  }), true);
  assert.deepEqual(JSON.parse(JSON.stringify(posted[0])), {
    source: "hatsuboshi-produce",
    type: "sendPrompt",
    requestId: "req-1",
    channelLeaseId: "lease-1",
    saveScope: "scope-a",
    ownerKind: "ordinary_action",
    generationMode: "shujuku_same_layer",
    turnId: "turn-1",
    prompt: "prompt"
  });
});

test("host cache stores mode scope and exact lease per attempt", () => {
  const context = {};
  vm.runInNewContext([
    readFunction(bridgeSource, "createHostPromptCacheEntry"),
    "this.createEntry = createHostPromptCacheEntry;"
  ].join("\n"), context);
  const entry = context.createEntry({
    requestId: "req-1",
    channelLeaseId: "lease-1",
    saveScope: "scope-a",
    ownerKind: "ordinary_action",
    generationMode: "shujuku_same_layer",
    prompt: "prompt",
    turnId: "turn-1",
    attemptKey: "req-1::lease-1::scope-a"
  });
  assert.deepEqual(JSON.parse(JSON.stringify(entry)), {
    prompt: "prompt",
    generationMode: "shujuku_same_layer",
    saveScope: "scope-a",
    ownerKind: "ordinary_action",
    turnId: "turn-1",
    requestId: "req-1",
    channelLeaseId: "lease-1",
    attemptKey: "req-1::lease-1::scope-a"
  });
});

test("host regeneration reads the cache entry before normalizing structured cache text", () => {
  const regenerateStart = bridgeSource.indexOf("if (data.type === 'regenerate')");
  const regenerateEnd = bridgeSource.indexOf("if (data.type === 'requestState')", regenerateStart);
  const regenerateBlock = bridgeSource.slice(regenerateStart, regenerateEnd);
  const cacheRead = regenerateBlock.indexOf("const cachedPrompt = requestPromptCache.get(reqId)");
  const cacheNormalize = regenerateBlock.indexOf("const cachedPromptText = typeof cachedPrompt === 'object'");
  assert.ok(cacheRead >= 0 && cacheNormalize > cacheRead);
});

test("opening quiet uses preset context without chat floors message events or native trigger", async () => {
  const calls = { quiet: [], commits: [], createFloor: 0, emit: 0, trigger: 0 };
  const hostContext = {
    async generateQuietPrompt(options) {
      calls.quiet.push(options);
      return "opening reply";
    }
  };
  const context = {};
  vm.runInNewContext([
    readFunction(bridgeSource, "runOpeningQuietAttempt"),
    "this.runOpening = runOpeningQuietAttempt;"
  ].join("\n"), context);

  const result = await context.runOpening({
    requestId: "req-opening",
    channelLeaseId: "lease-opening",
    saveScope: "scope-a",
    generationMode: "opening_quiet",
    prompt: "opening prompt"
  }, {
    context: hostContext,
    extractReplyTextFromGenerated: (value) => String(value || "").trim(),
    postCommittedReply: (...args) => calls.commits.push(args),
    createSilentChatMessage: () => { calls.createFloor += 1; },
    emitHostMessageSent: () => { calls.emit += 1; },
    triggerNativeGeneration: () => { calls.trigger += 1; }
  });

  assert.deepEqual(clone(calls.quiet), [{
    quietPrompt: "opening prompt",
    quietToLoud: false,
    skipWIAN: false,
    removeReasoning: true
  }]);
  assert.equal(calls.createFloor, 0);
  assert.equal(calls.emit, 0);
  assert.equal(calls.trigger, 0);
  assert.equal(calls.commits.length, 1);
  assert.deepEqual(clone(calls.commits[0][2]), {
    isFinal: true,
    rawText: "opening reply",
    renderedText: "",
    messageId: null,
    channelLeaseId: "lease-opening"
  });
  assert.equal(result.channelLeaseId, "lease-opening");
});

test("host generation router sends opening mode only through the quiet attempt", async () => {
  const calls = { quiet: 0, transactional: 0 };
  const context = {
    requestPromptCache: new Map(),
    createHostPromptCacheEntry: (envelope) => envelope,
    runOpeningQuietAttempt: async () => { calls.quiet += 1; return "quiet"; },
    runTransactionalPrompt: async () => { calls.transactional += 1; return "transactional"; }
  };
  vm.runInNewContext([
    readFunction(bridgeSource, "runHostGenerationAttempt"),
    "this.runAttempt = runHostGenerationAttempt;"
  ].join("\n"), context);

  const result = await context.runAttempt({
    requestId: "req-opening",
    channelLeaseId: "lease-opening",
    generationMode: "opening_quiet"
  });
  assert.equal(result, "quiet");
  assert.equal(calls.quiet, 1);
  assert.equal(calls.transactional, 0);
});

test("opening quiet keeps an explicit null assistant floor absent", () => {
  const context = {
    getContext: () => ({ chat: [{ is_user: false, mes: "older reply" }] })
  };
  vm.runInNewContext([
    readFunction(bridgeSource, "resolveAssistantMessageId"),
    "this.resolveMessageId = resolveAssistantMessageId;"
  ].join("\n"), context);
  assert.equal(context.resolveMessageId(null), -1);
});

test("structured regeneration creates a new exact attempt from the cached narrative request", () => {
  const context = {
    HOST_GENERATION_MODES: new Set(["opening_quiet", "shujuku_same_layer"])
  };
  vm.runInNewContext([
    readFunction(bridgeSource, "createHostGenerationAttemptKey"),
    readFunction(bridgeSource, "normalizeHostGenerationEnvelope"),
    readFunction(bridgeSource, "createHostRegenerationEnvelope"),
    "this.createRegenerationEnvelope = createHostRegenerationEnvelope;"
  ].join("\n"), context);
  const cached = {
    prompt: "frozen narrative prompt",
    generationMode: "shujuku_same_layer",
    saveScope: "scope-a",
    ownerKind: "regeneration",
    turnId: "turn-1",
    requestId: "req-1",
    channelLeaseId: "lease-old",
    attemptKey: "req-1::lease-old::scope-a"
  };

  const regenerated = context.createRegenerationEnvelope(cached, "req-1", "lease-new");

  assert.equal(regenerated.ok, true);
  assert.equal(regenerated.requestId, "req-1");
  assert.equal(regenerated.channelLeaseId, "lease-new");
  assert.equal(regenerated.saveScope, "scope-a");
  assert.equal(regenerated.generationMode, "shujuku_same_layer");
  assert.equal(regenerated.prompt, "frozen narrative prompt");
  assert.equal(regenerated.attemptKey, "req-1::lease-new::scope-a");
  assert.notEqual(regenerated.attemptKey, cached.attemptKey);
  assert.equal(cached.channelLeaseId, "lease-old");
});

test("structured host regeneration preserves the cached generation mode with the new lease", () => {
  const regenerateStart = bridgeSource.indexOf("if (data.type === 'regenerate')");
  const regenerateEnd = bridgeSource.indexOf("if (data.type === 'requestState')", regenerateStart);
  const regenerateBlock = bridgeSource.slice(regenerateStart, regenerateEnd);
  assert.match(regenerateBlock, /createHostRegenerationEnvelope\(cachedPrompt, reqId, channelLeaseId\)/);
  assert.match(regenerateBlock, /runHostGenerationAttempt\(regenerationEnvelope\)/);
  assert.match(regenerateBlock, /typeof cachedPrompt === 'object'/);
  assert.match(regenerateBlock, /runTransactionalPrompt\(cachedPromptText, reqId, channelLeaseId\)/);
});

test("same-layer preparation commits one exact hidden user floor", async () => {
  const chat = [
    { is_user: true, mes: "old user" },
    { is_user: false, mes: "old assistant" },
    { is_user: true, mes: "older prompt" },
    { is_user: false, mes: "older reply" }
  ];
  const activeAttempts = new Map();
  const calls = { create: 0, persist: 0 };
  const context = {
    getContext: () => ({ chat, chatMetadata: {} })
  };
  vm.runInNewContext([
    readFunction(bridgeSource, "createHostGenerationAttempt"),
    readFunction(bridgeSource, "stampTransactionalExtra"),
    readFunction(bridgeSource, "prepareSameLayerAttempt"),
    "this.createAttempt = createHostGenerationAttempt;",
    "this.stamp = stampTransactionalExtra;",
    "this.prepare = prepareSameLayerAttempt;"
  ].join("\n"), context);
  const envelope = {
    requestId: "req-1",
    channelLeaseId: "lease-1",
    saveScope: "scope-a",
    ownerKind: "ordinary_action",
    generationMode: "shujuku_same_layer",
    prompt: "current prompt",
    turnId: "turn-1",
    attemptKey: "req-1::lease-1::scope-a"
  };
  const deps = {
    activeAttempts,
    getContext: context.getContext,
    stampTransactionalExtra: context.stamp,
    async createSilentChatMessage(role, text) {
      calls.create += 1;
      chat.push({ is_user: role === "user", is_hidden: false, mes: text, extra: {} });
      return chat.length - 1;
    },
    async persistChatSilently() { calls.persist += 1; }
  };

  const attempt = await context.prepare(envelope, deps);

  assert.equal(attempt.status, "user_floor_committed");
  assert.equal(attempt.userMessageId, 4);
  assert.equal(chat[4].is_user, true);
  assert.equal(chat[4].is_hidden, true);
  assert.equal(chat[4].extra.hatsuRequestId, "req-1");
  assert.equal(chat[4].extra.hatsuAttemptKey, "req-1::lease-1::scope-a");
  assert.equal(chat[4].extra.hatsuSaveScope, "scope-a");
  assert.equal(chat[4].extra._acu_true_same_layer, true);
  assert.equal(calls.create, 1);
  assert.equal(calls.persist, 1);
});

test("same-layer preparation reuses an existing exact attempt without another floor", async () => {
  const chat = [];
  const activeAttempts = new Map();
  let creates = 0;
  const context = { getContext: () => ({ chat, chatMetadata: {} }) };
  vm.runInNewContext([
    readFunction(bridgeSource, "createHostGenerationAttempt"),
    readFunction(bridgeSource, "stampTransactionalExtra"),
    readFunction(bridgeSource, "prepareSameLayerAttempt"),
    "this.stamp = stampTransactionalExtra;",
    "this.prepare = prepareSameLayerAttempt;"
  ].join("\n"), context);
  const envelope = {
    requestId: "req-1", channelLeaseId: "lease-1", saveScope: "scope-a",
    generationMode: "shujuku_same_layer", prompt: "current prompt",
    attemptKey: "req-1::lease-1::scope-a"
  };
  const deps = {
    activeAttempts,
    getContext: context.getContext,
    stampTransactionalExtra: context.stamp,
    async createSilentChatMessage(role, text) {
      creates += 1;
      chat.push({ is_user: role === "user", mes: text, extra: {} });
      return chat.length - 1;
    },
    async persistChatSilently() {}
  };
  const first = await context.prepare(envelope, deps);
  const second = await context.prepare(envelope, deps);
  assert.equal(second, first);
  assert.equal(creates, 1);
  assert.equal(chat.length, 1);
});

test("exact qrf observation ignores older floors and accepts only the stamped attempt floor", () => {
  const chat = [
    { is_user: true, qrf_plot: "older planning", extra: { hatsuAttemptKey: "old", hatsuSaveScope: "scope-a" } },
    { is_user: false, mes: "older reply" },
    { is_user: true, qrf_plot_tasks: ["unrelated"], extra: { hatsuAttemptKey: "other", hatsuSaveScope: "scope-a" } },
    { is_user: false, mes: "other reply" },
    { is_user: true, is_hidden: true, mes: "current", extra: {
      hatsuAttemptKey: "req-1::lease-1::scope-a",
      hatsuSaveScope: "scope-a",
      _acu_true_same_layer: true
    } }
  ];
  const context = { getContext: () => ({ chat }) };
  vm.runInNewContext([
    readFunction(bridgeSource, "getExactBridgePlanningSnapshot"),
    "this.snapshot = getExactBridgePlanningSnapshot;"
  ].join("\n"), context);
  const attempt = { userMessageId: 4, attemptKey: "req-1::lease-1::scope-a", saveScope: "scope-a" };

  assert.equal(context.snapshot(attempt), null);
  chat[4].qrf_plot = "current planning";
  chat[4].qrf_plot_preset = { style: "idol" };
  chat[4].qrf_plot_tasks = ["continue current turn"];
  assert.deepEqual(clone(context.snapshot(attempt)), {
    qrf_plot: "current planning",
    qrf_plot_preset: { style: "idol" },
    qrf_plot_tasks: ["continue current turn"]
  });
});

test("MESSAGE_SENT emits extension source and retries the two-argument host signature", async () => {
  const calls = [];
  const context = {};
  vm.runInNewContext([
    readFunction(bridgeSource, "emitHostMessageSent"),
    "this.emitSent = emitHostMessageSent;"
  ].join("\n"), context);
  await context.emitSent(4, {
    context: {
      eventTypes: { MESSAGE_SENT: "message_sent" },
      eventSource: {
        async emit(...args) {
          calls.push(args);
          if (args.length === 3) throw new Error("legacy signature");
        }
      }
    }
  });
  assert.deepEqual(clone(calls), [
    ["message_sent", 4, "extension"],
    ["message_sent", 4]
  ]);
});

test("native generation prefers TavernHelper trigger and falls back to host slash execution", async () => {
  const helperCalls = [];
  const fallbackCalls = [];
  const context = {};
  vm.runInNewContext([
    readFunction(bridgeSource, "triggerNativeGeneration"),
    "this.triggerNative = triggerNativeGeneration;"
  ].join("\n"), context);

  await context.triggerNative({
    async triggerSlash(command) { helperCalls.push(command); }
  }, { context: {} });
  await context.triggerNative(null, {
    context: {
      async executeSlashCommandsWithOptions(command) { fallbackCalls.push(command); }
    }
  });
  assert.deepEqual(helperCalls, ["/trigger await=true"]);
  assert.deepEqual(fallbackCalls, ["/trigger await=true"]);
});

test("exact assistant selection rejects old hidden planning and incompatible floors", () => {
  const chat = [
    { is_user: false, mes: "old assistant", send_date: 50 },
    { is_user: true, is_hidden: true, mes: "current prompt", send_date: 100, extra: {
      hatsuAttemptKey: "attempt-a", hatsuSaveScope: "scope-a", _acu_true_same_layer: true
    } },
    { is_user: false, is_hidden: true, mes: "qrf_plot planning", send_date: 101 },
    { is_user: false, mes: "incompatible", send_date: 102 },
    { is_user: false, mes: "valid native narrative", send_date: 103 }
  ];
  const context = {};
  vm.runInNewContext([
    readFunction(bridgeSource, "looksLikePlanningOrRecallText"),
    readFunction(bridgeSource, "findExactBridgeAssistant"),
    "this.findAssistant = findExactBridgeAssistant;"
  ].join("\n"), context);
  const hit = context.findAssistant({
    userMessageId: 1,
    attemptKey: "attempt-a",
    saveScope: "scope-a",
    prompt: "current prompt",
    startedAt: 100
  }, {
    context: { chat },
    getMessageRawText: (message) => message.mes,
    isGeneratedTextCompatibleWithPrompt: (_prompt, text) => text === "valid native narrative"
  });
  assert.deepEqual(clone(hit), {
    index: 4,
    text: "valid native narrative",
    rawText: "valid native narrative",
    renderedText: ""
  });
});

test("same-layer generation preserves event order and returns the native assistant without duplication", async () => {
  const order = [];
  const commits = [];
  let syntheticAssistantCreates = 0;
  const attempt = {
    requestId: "req-1",
    channelLeaseId: "lease-1",
    saveScope: "scope-a",
    generationMode: "shujuku_same_layer",
    prompt: "current prompt",
    attemptKey: "req-1::lease-1::scope-a",
    status: "prepared",
    userMessageId: 4,
    assistantMessageId: null,
    startedAt: 100
  };
  const activeAttempts = new Map([[attempt.attemptKey, attempt]]);
  const context = {};
  vm.runInNewContext([
    readFunction(bridgeSource, "runShujukuSameLayerAttempt"),
    "this.runSameLayer = runShujukuSameLayerAttempt;"
  ].join("\n"), context);

  const result = await context.runSameLayer(attempt, {
    tavernHelper: {},
    activeAttempts,
    getCurrentContextInfo: () => ({ saveScope: "scope-a" }),
    async compensateHostGenerationAttempt() { assert.fail("success path must not compensate"); },
    async prepareSameLayerAttempt() { order.push("persist-user"); return attempt; },
    async emitHostMessageSent() { order.push("message-sent"); },
    waitForExactBridgePlanning() {
      order.push("wait-qrf");
      return Promise.resolve({ qrf_plot: "planning" });
    },
    async triggerNativeGeneration() { order.push("trigger"); },
    async waitForExactBridgeAssistant() {
      order.push("wait-assistant");
      return { index: 5, text: "native reply", rawText: "native reply", renderedText: "" };
    },
    stampTransactionalExtra() { order.push("stamp-assistant"); },
    async persistChatSilently() { order.push("persist-assistant"); },
    postCommittedReply(...args) { commits.push(args); },
    createAssistantFloor() { syntheticAssistantCreates += 1; }
  });

  assert.deepEqual(order.slice(0, 4), ["persist-user", "message-sent", "wait-qrf", "trigger"]);
  assert.equal(result.assistantMessageId, 5);
  assert.equal(attempt.status, "replied");
  assert.equal(syntheticAssistantCreates, 0);
  assert.equal(commits.length, 1);
  assert.equal(commits[0][0], "req-1");
  assert.equal(commits[0][1], "native reply");
  assert.deepEqual(clone(commits[0][2]), {
    isFinal: true,
    rawText: "native reply",
    renderedText: "",
    messageId: 5,
    channelLeaseId: "lease-1"
  });
});

test("failure before planning removes the exact unmodified hidden user floor", async () => {
  const attempt = {
    requestId: "req-1", channelLeaseId: "lease-1", saveScope: "scope-a",
    attemptKey: "req-1::lease-1::scope-a", userMessageId: 1, status: "user_floor_committed"
  };
  const chat = [
    { is_user: false, mes: "older" },
    { is_user: true, is_hidden: true, mes: "current", extra: {
      hatsuRequestId: "req-1", hatsuAttemptKey: attempt.attemptKey,
      hatsuSaveScope: "scope-a", _acu_true_same_layer: true
    } }
  ];
  const activeAttempts = new Map([[attempt.attemptKey, attempt]]);
  let persisted = 0;
  const context = { getContext: () => ({ chat, chatMetadata: {} }) };
  vm.runInNewContext([
    readFunction(bridgeSource, "getExactBridgePlanningSnapshot"),
    readFunction(bridgeSource, "compensateHostGenerationAttempt"),
    "this.compensate = compensateHostGenerationAttempt;"
  ].join("\n"), context);

  const result = await context.compensate(attempt, "trigger_failed", {
    activeAttempts,
    context: context.getContext(),
    async persistChatSilently() { persisted += 1; }
  });
  assert.equal(result.status, "compensated");
  assert.equal(chat.some((message) => message?.extra?.hatsuAttemptKey === attempt.attemptKey), false);
  assert.equal(activeAttempts.has(attempt.attemptKey), false);
  assert.equal(persisted, 1);
});

test("failure after qrf preserves but abandons the planning floor", async () => {
  const attempt = {
    requestId: "req-1", channelLeaseId: "lease-1", saveScope: "scope-a",
    attemptKey: "req-1::lease-1::scope-a", userMessageId: 0, status: "generating"
  };
  const chat = [{
    is_user: true,
    is_hidden: true,
    mes: "current",
    qrf_plot: "planning",
    extra: {
      hatsuRequestId: "req-1", hatsuAttemptKey: attempt.attemptKey,
      hatsuSaveScope: "scope-a", _acu_true_same_layer: true
    }
  }];
  const activeAttempts = new Map([[attempt.attemptKey, attempt]]);
  const context = { getContext: () => ({ chat, chatMetadata: {} }) };
  vm.runInNewContext([
    readFunction(bridgeSource, "getExactBridgePlanningSnapshot"),
    readFunction(bridgeSource, "compensateHostGenerationAttempt"),
    "this.compensate = compensateHostGenerationAttempt;"
  ].join("\n"), context);

  const result = await context.compensate(attempt, "assistant_timeout", {
    activeAttempts,
    context: context.getContext(),
    async persistChatSilently() {}
  });
  assert.equal(result.status, "compensated");
  assert.equal(chat[0].is_hidden, true);
  assert.equal(chat[0].extra.hatsuBridgeAbandoned, true);
  assert.equal(chat[0].extra.hatsuBridgeFailureReason, "assistant_timeout");
  assert.equal(chat[0].qrf_plot, "planning");
  assert.equal(activeAttempts.has(attempt.attemptKey), false);
});

function makeCompletedSameLayerDeps(attempt, activeAttempts, options = {}) {
  const commits = [];
  const compensations = [];
  return {
    commits,
    compensations,
    deps: {
      tavernHelper: {},
      activeAttempts,
      async prepareSameLayerAttempt() { return attempt; },
      async emitHostMessageSent() {},
      waitForExactBridgePlanning() { return Promise.resolve({ qrf_plot: "planning" }); },
      async triggerNativeGeneration() {},
      async waitForExactBridgeAssistant() {
        return { index: 2, text: "native reply", rawText: "native reply", renderedText: "" };
      },
      stampTransactionalExtra() {},
      async persistChatSilently() {},
      getCurrentContextInfo: () => ({ saveScope: options.currentScope || "scope-a" }),
      async compensateHostGenerationAttempt(currentAttempt, reason) {
        compensations.push({ currentAttempt, reason });
        currentAttempt.status = "compensated";
        return currentAttempt;
      },
      postCommittedReply(...args) { commits.push(args); }
    }
  };
}

test("same-layer completion rejects a changed save scope before posting", async () => {
  const attempt = {
    requestId: "req-1", channelLeaseId: "lease-1", saveScope: "scope-a",
    attemptKey: "req-1::lease-1::scope-a", userMessageId: 1,
    prompt: "current prompt", status: "user_floor_committed", startedAt: 100
  };
  const activeAttempts = new Map([[attempt.attemptKey, attempt]]);
  const fixture = makeCompletedSameLayerDeps(attempt, activeAttempts, { currentScope: "scope-b" });
  const context = {};
  vm.runInNewContext([
    readFunction(bridgeSource, "runShujukuSameLayerAttempt"),
    "this.runSameLayer = runShujukuSameLayerAttempt;"
  ].join("\n"), context);

  await assert.rejects(
    () => context.runSameLayer(attempt, fixture.deps),
    /save_scope_changed/
  );
  assert.equal(fixture.commits.length, 0);
  assert.equal(fixture.compensations.length, 1);
  assert.equal(fixture.compensations[0].reason, "save_scope_changed");
});

test("a stale host attempt instance cannot post or clear its replacement", async () => {
  const attempt = {
    requestId: "req-1", channelLeaseId: "lease-old", saveScope: "scope-a",
    attemptKey: "req-1::lease-old::scope-a", userMessageId: 1,
    prompt: "current prompt", status: "user_floor_committed", startedAt: 100
  };
  const replacement = { ...attempt, channelLeaseId: "lease-new" };
  const activeAttempts = new Map([[attempt.attemptKey, replacement]]);
  const fixture = makeCompletedSameLayerDeps(attempt, activeAttempts);
  const context = {};
  vm.runInNewContext([
    readFunction(bridgeSource, "runShujukuSameLayerAttempt"),
    "this.runSameLayer = runShujukuSameLayerAttempt;"
  ].join("\n"), context);

  await assert.rejects(
    () => context.runSameLayer(attempt, fixture.deps),
    /stale_host_attempt/
  );
  assert.equal(fixture.commits.length, 0);
  assert.equal(activeAttempts.get(attempt.attemptKey), replacement);
});

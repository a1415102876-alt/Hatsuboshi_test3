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
  const modesDeclaration = bridgeSource.match(/const HOST_GENERATION_MODES = new Set\([^;]+;/)?.[0];
  assert.ok(modesDeclaration, "HOST_GENERATION_MODES must exist");
  vm.runInNewContext([
    modesDeclaration,
    readFunction(bridgeSource, "createHostGenerationAttemptKey"),
    readFunction(bridgeSource, "normalizeHostGenerationEnvelope"),
    "this.createAttemptKey = createHostGenerationAttemptKey;",
    "this.normalizeEnvelope = normalizeHostGenerationEnvelope;"
  ].join("\n"), context);
  return context;
}

test("producer work commit selects only the required result tag", () => {
  const selectCommittedReply = vm.runInNewContext(
    `(${readFunction(bridgeSource, "selectCommittedReplyForPrompt")})`
  );
  const resultBlock = '<NIA_WORK_RESULT>{"schemaVersion":1,"story":"<narration>完成。</narration>"}</NIA_WORK_RESULT>';
  const rawReply = [
    '- ¿Cuál es la situación actual?',
    '¡Que empiece la función!</konatan_planning~>',
    resultBlock,
    '<current_event>不应提交</current_event>',
    '<tucao>不应提交</tucao>'
  ].join('\n');

  assert.equal(
    selectCommittedReply('[HATSU_OUTPUT_MODE:NIA_PRODUCER_WORK]', rawReply),
    resultBlock
  );
});

test("sandbox First Live generation reaches the host adapter", () => {
  const { normalizeEnvelope } = loadEnvelopeHelpers();
  const result = clone(normalizeEnvelope({
    requestId: "req-live",
    channelLeaseId: "lease-live",
    saveScope: "scope-a",
    ownerKind: "sandbox_first_live",
    generationMode: "sandbox_first_live",
    prompt: "live prompt"
  }));
  assert.equal(result.ok, true);
});

test("secondary envelope v2 requires exact job request scope and kind", () => {
  const normalizeEnvelope = vm.runInNewContext(`(${readFunction(bridgeSource, "normalizeSecondaryEnvelope")})`);
  const input = {
    jobId: "world:day-2",
    requestId: "req-1",
    saveScope: "scope-a",
    kind: "world",
    prompt: "private prompt",
    apiConfig: { baseUrl: "https://example.test", model: "m", apiKey: "secret" }
  };
  const result = clone(normalizeEnvelope(input, "scope-a"));
  assert.equal(result.ok, true);
  assert.deepEqual(result.envelope, input);
  assert.deepEqual(clone(normalizeEnvelope({ ...input, jobId: "" }, "scope-a")), { ok: false, reason: "invalid_secondary_envelope" });
  assert.deepEqual(clone(normalizeEnvelope(input, "scope-b")), { ok: false, reason: "secondary_scope_mismatch" });
});

test("silent Shujuku adapter is a distinct host generation path", () => {
  assert.match(bridgeSource, /'shujuku_silent_v1'/);
  assert.match(bridgeSource, /function runShujukuSilentAttempt\(/);
  const hostRunner = readFunction(bridgeSource, "runHostGenerationAttempt");
  assert.match(hostRunner, /runShujukuSilentAttempt\(envelope/);
  assert.match(hostRunner, /adapter === 'shujuku_silent_v1'/);
});

test("silent Shujuku attempt orders database preparation before silent assistant commit", () => {
  const source = readFunction(bridgeSource, "runShujukuSilentAttempt");
  const order = [
    "attempt = await prepareAttempt(",
    "const prepared = await prepareExternalGeneration(",
    "const rawText = await generate(",
    "assistantId = await createAssistant('assistant'",
    "await commitExternalAssistant(",
    "postReply(envelope.requestId"
  ].map((needle) => source.indexOf(needle));
  assert.ok(order.every((index) => index >= 0), `missing silent bridge step: ${order}`);
  for (let index = 1; index < order.length; index += 1) {
    assert.ok(order[index - 1] < order[index], `silent bridge order is invalid: ${order}`);
  }
  assert.doesNotMatch(source, /emitHostMessageSent\(/);
  assert.doesNotMatch(source, /triggerNativeGeneration\(/);
});

test("silent text generation bypasses Shujuku's TavernHelper wrapper after explicit planning", () => {
  const source = readFunction(bridgeSource, "generateTextOnly");
  assert.match(source, /original_TavernHelper_generate_ACU/);
  assert.match(source, /generate\.call\(helper/);
});

test("secondary reply echoes identity without prompt or API configuration", () => {
  const createPayload = vm.runInNewContext(`(${readFunction(bridgeSource, "createSecondaryReplyPayload")})`);
  const payload = clone(createPayload({ jobId: "job-1", requestId: "req-1", saveScope: "scope-a", kind: "world" }, "reply", { ok: true }));
  assert.deepEqual(payload, {
    source: "hatsuboshi-produce-host",
    type: "secondaryAiReply",
    jobId: "job-1",
    requestId: "req-1",
    saveScope: "scope-a",
    kind: "world",
    text: "reply",
    ok: true,
    error: "",
    isFinal: true
  });
  assert.equal("prompt" in payload, false);
  assert.equal("apiConfig" in payload, false);
});

test("host checks secondary scope before starting fetch and before posting result", () => {
  const source = readFunction(bridgeSource, "runSecondaryApiPrompt");
  const firstScopeCheck = source.indexOf("getCurrentContextInfo().saveScope");
  const fetchIndex = source.indexOf("fetch(");
  const secondScopeCheck = source.lastIndexOf("getCurrentContextInfo().saveScope");
  assert.ok(firstScopeCheck >= 0 && firstScopeCheck < fetchIndex);
  assert.ok(secondScopeCheck > fetchIndex);
});

test("host aborts a hanging Director fetch and returns a normalized timeout reply", async () => {
  const posted = [];
  const timers = [];
  let fetchOptions = null;
  class FakeAbortController {
    constructor() {
      this.signal = { aborted: false, onabort: null };
    }
    abort() {
      this.signal.aborted = true;
      this.signal.onabort?.();
    }
  }
  const context = {
    getCurrentContextInfo: () => ({ saveScope: "scope-a" }),
    AbortController: FakeAbortController,
    setTimeout(callback, delay) {
      timers.push({ callback, delay });
      return timers.length;
    },
    clearTimeout() {},
    fetch(_url, options) {
      fetchOptions = options;
      return new Promise((_resolve, reject) => {
        options.signal.onabort = () => reject(Object.assign(new Error("aborted"), { name: "AbortError" }));
      });
    },
    window: { postMessage: (payload) => posted.push(payload) }
  };
  vm.runInNewContext([
    "const SECONDARY_DIRECTOR_FETCH_TIMEOUT_MS = 180000;",
    readFunction(bridgeSource, "createSecondaryReplyPayload"),
    "function postSecondaryReply(envelope, text, options) { window.postMessage(createSecondaryReplyPayload(envelope, text, options), '*'); }",
    readFunction(bridgeSource, "runSecondaryApiPrompt"),
    "this.run = runSecondaryApiPrompt;"
  ].join("\n"), context);

  const pending = context.run({
    jobId: "director-job-1",
    requestId: "director-request-1",
    saveScope: "scope-a",
    kind: "director",
    prompt: "private prompt",
    apiConfig: { baseUrl: "https://example.test", model: "m", apiKey: "secret" }
  });
  await Promise.resolve();

  assert.equal(timers.length, 1);
  assert.equal(timers[0].delay, 180000);
  assert.ok(fetchOptions?.signal);
  timers[0].callback();
  await pending;

  assert.equal(posted.length, 1);
  assert.equal(posted[0].type, "secondaryAiReply");
  assert.equal(posted[0].ok, false);
  assert.equal(posted[0].error, "director_timeout");
  assert.equal("prompt" in posted[0], false);
  assert.equal("apiConfig" in posted[0], false);
});
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

test("MESSAGE_SENT tolerates the host emitter cleanup bug after listeners run", async () => {
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
          throw new ReferenceError("processPendingEffectRuns is not defined");
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
    prompt: "[HATSU_OUTPUT_MODE:NIA_PRODUCER_WORK]",
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
      return { index: 5, text: "raw planning + result", rawText: "raw planning + result", renderedText: "" };
    },
    selectCommittedReplyForPrompt() { return "clean result"; },
    isGeneratedTextCompatibleWithPrompt(_prompt, text) { return text === "clean result"; },
    replaceAssistantMessageText(index, text) { order.push(`replace:${index}:${text}`); },
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
  assert.ok(order.indexOf("replace:5:clean result") < order.indexOf("persist-assistant"));
  assert.equal(commits[0][1], "clean result");
  assert.deepEqual(clone(commits[0][2]), {
    isFinal: true,
    rawText: "raw planning + result",
    renderedText: "",
    messageId: 5,
    channelLeaseId: "lease-1"
  });
});

test("silent Shujuku generation executes the external database contract around one silent assistant", async () => {
  const order = [];
  const commits = [];
  const attempt = {
    requestId: "req-1",
    channelLeaseId: "lease-1",
    saveScope: "scope-a",
    prompt: "[HATSU_OUTPUT_MODE:NIA_PRODUCER_WORK]",
    attemptKey: "req-1::lease-1::scope-a",
    userMessageId: 4,
    status: "prepared"
  };
  const context = { isGeneratedTextCompatibleWithPrompt: () => true };
  vm.runInNewContext([
    readFunction(bridgeSource, "runShujukuSilentAttempt"),
    "this.runSilent = runShujukuSilentAttempt;"
  ].join("\n"), context);

  const result = await context.runSilent(attempt, {
    activeAttempts: new Map([[attempt.attemptKey, attempt]]),
    async prepareSameLayerAttempt() { order.push("prepare-user"); return attempt; },
    shujukuSilentBridge: {
      async prepareExternalGeneration() { order.push("prepare-db"); return { prompt: "planned prompt" }; },
      async commitExternalAssistant(input) { order.push(`commit-db:${input.assistantMessageId}:${input.text}`); }
    },
    async generateTextOnly(prompt) { order.push(`generate:${prompt}`); return "raw planning + result"; },
    selectCommittedReplyForPrompt() { return "clean result"; },
    async createSilentChatMessage(role, text) { order.push(`create:${role}:${text}`); return 5; },
    async persistChatSilently() { order.push("persist-assistant"); },
    async rollbackSilentAssistantMessage() { assert.fail("success path must not roll back assistant"); },
    postCommittedReply(...args) { order.push("post-reply"); commits.push(args); },
    async compensateHostGenerationAttempt() { assert.fail("success path must not compensate"); }
  });

  assert.deepEqual(order, [
    "prepare-user",
    "prepare-db",
    "generate:planned prompt",
    "create:assistant:clean result",
    "persist-assistant",
    "commit-db:5:clean result",
    "post-reply"
  ]);
  assert.equal(result.assistantMessageId, 5);
  assert.equal(result.status, "replied");
  assert.equal(commits.length, 1);
  assert.equal(commits[0][1], "clean result");
  assert.equal(commits[0][2].rawText, "raw planning + result");
});

test("original silent generation commits selected text before generation ended", async () => {
  const created = [];
  const posted = [];
  const ended = [];
  const attempt = {
    requestId: "req-1",
    channelLeaseId: "lease-1",
    saveScope: "scope-a",
    prompt: "[HATSU_OUTPUT_MODE:NIA_PRODUCER_WORK]",
    attemptKey: "req-1::lease-1::scope-a",
    userMessageId: 4,
    status: "prepared"
  };
  const context = {
    console,
    isGeneratedTextCompatibleWithPrompt: (_prompt, text) => text === "clean result",
    emitHostMessageSent: async () => {},
    emitShujukuGenerationAfterCommands: async (_attempt, prompt) => prompt,
    emitShujukuGenerationStarted: async () => {},
    emitShujukuGenerationEnded: async (messageId) => { ended.push(messageId); }
  };
  vm.runInNewContext([
    readFunction(bridgeSource, "runShujukuOriginalSilentAttempt"),
    "this.runOriginal = runShujukuOriginalSilentAttempt;"
  ].join("\n"), context);

  await context.runOriginal(attempt, {
    activeAttempts: new Map([[attempt.attemptKey, attempt]]),
    async prepareSameLayerAttempt() { return attempt; },
    async generateTextOnly() { return "raw planning + result"; },
    selectCommittedReplyForPrompt() { return "clean result"; },
    async createSilentChatMessage(role, text) { created.push([role, text]); return 5; },
    async persistChatSilently() {},
    postCommittedReply(...args) { posted.push(args); },
    shujukuOriginalBridge: { async commitExternalAssistant() {} },
    async compensateHostGenerationAttempt() { assert.fail("success path must not compensate"); },
    async rollbackSilentAssistantMessage() { assert.fail("success path must not roll back"); }
  });

  assert.deepEqual(created, [["assistant", "clean result"]]);
  assert.deepEqual(ended, [5]);
  assert.equal(posted[0][1], "clean result");
  assert.equal(posted[0][2].rawText, "raw planning + result");
});

test("silent Shujuku generation removes its assistant when database commit fails", async () => {
  const attempt = {
    requestId: "req-1",
    channelLeaseId: "lease-1",
    saveScope: "scope-a",
    prompt: "raw prompt",
    attemptKey: "req-1::lease-1::scope-a",
    userMessageId: 4,
    status: "prepared"
  };
  const removed = [];
  const compensated = [];
  const context = { isGeneratedTextCompatibleWithPrompt: () => true };
  vm.runInNewContext([
    readFunction(bridgeSource, "runShujukuSilentAttempt"),
    "this.runSilent = runShujukuSilentAttempt;"
  ].join("\n"), context);

  await assert.rejects(context.runSilent(attempt, {
    activeAttempts: new Map([[attempt.attemptKey, attempt]]),
    async prepareSameLayerAttempt() { return attempt; },
    shujukuSilentBridge: {
      async prepareExternalGeneration() { return { prompt: "planned prompt" }; },
      async commitExternalAssistant() { throw new Error("database_commit_failed"); }
    },
    async generateTextOnly() { return "reply"; },
    async createSilentChatMessage() { return 5; },
    async persistChatSilently() {},
    async rollbackSilentAssistantMessage(messageId, requestId, exactAttempt) {
      removed.push([messageId, requestId, exactAttempt.attemptKey]);
    },
    async compensateHostGenerationAttempt(_attempt, reason) { compensated.push(reason); },
    postCommittedReply() { assert.fail("failed database commit must not post a reply"); }
  }), /database_commit_failed/);

  assert.deepEqual(removed, [[5, "req-1", attempt.attemptKey]]);
  assert.deepEqual(compensated, ["database_commit_failed"]);
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

test("host attempt debug snapshot exposes only redacted lifecycle metadata", () => {
  const context = {
    HATSU_HOST_GENERATION_ADAPTER: "shujuku_v1",
    hostGenerationAttemptDebug: {
      current: {
        requestId: "hatsu-request-1234567890abcdef",
        channelLeaseId: "secret-full-lease",
        ownerKind: "ordinary_action",
        generationMode: "shujuku_same_layer",
        status: "generating",
        saveScope: "char-1-chat-a",
        startedAt: 7500,
        prompt: "secret prompt",
        text: "secret narrative"
      },
      lastFailureReason: "assistant_timeout",
      lastCompensationReason: "assistant_timeout"
    }
  };
  vm.runInNewContext([
    readFunction(bridgeSource, "getHostGenerationAttemptDebugSnapshot"),
    "this.snapshot = getHostGenerationAttemptDebugSnapshot(10000);"
  ].join("\n"), context);

  assert.deepEqual(clone(context.snapshot), {
    adapter: "shujuku_v1",
    mode: "shujuku_same_layer",
    status: "generating",
    ageMs: 2500,
    scope: "char-1-chat-a",
    ownerKind: "ordinary_action",
    requestIdSuffix: "90abcdef",
    lastFailureReason: "assistant_timeout",
    lastCompensationReason: "assistant_timeout"
  });
  assert.doesNotMatch(
    JSON.stringify(context.snapshot),
    /secret prompt|secret narrative|secret-full-lease|hatsu-request-1234567890abcdef|channelLeaseId|prompt|text/iu
  );
});

test("frontend host attempt debug normalization rejects narrative and full identifiers", () => {
  const normalize = vm.runInNewContext(
    `(${readFunction(appSource, "normalizeHostGenerationDebugSnapshot")})`
  );
  const result = normalize({
    adapter: "shujuku_v1",
    mode: "shujuku_same_layer",
    status: "generating",
    ageMs: 25,
    scope: "scope-a",
    ownerKind: "ordinary_action",
    requestIdSuffix: "90abcdef",
    lastFailureReason: "",
    lastCompensationReason: "",
    requestId: "full-request",
    channelLeaseId: "full-lease",
    prompt: "secret prompt",
    text: "secret reply",
    state: { day: 7 }
  });
  assert.deepEqual(clone(result), {
    adapter: "shujuku_v1",
    mode: "shujuku_same_layer",
    status: "generating",
    ageMs: 25,
    scope: "scope-a",
    ownerKind: "ordinary_action",
    requestIdSuffix: "90abcdef",
    lastFailureReason: "",
    lastCompensationReason: ""
  });
});

test("runtime adapter switch can route structured requests through the transactional rollback", async () => {
  const calls = { quiet: 0, sameLayer: 0, transactional: 0 };
  const context = {
    HATSU_HOST_GENERATION_ADAPTER: "current_transactional",
    requestPromptCache: new Map(),
    createHostPromptCacheEntry: (envelope) => envelope,
    recordHostGenerationAttemptDebug() {},
    postHostGenerationAttemptDebug() {},
    runOpeningQuietAttempt: async () => { calls.quiet += 1; },
    runShujukuSameLayerAttempt: async () => { calls.sameLayer += 1; },
    runTransactionalPrompt: async () => { calls.transactional += 1; return "transactional"; }
  };
  vm.runInNewContext([
    readFunction(bridgeSource, "runHostGenerationAttempt"),
    "this.runAttempt = runHostGenerationAttempt;"
  ].join("\n"), context);

  const result = await context.runAttempt({
    requestId: "req-1", channelLeaseId: "lease-1", saveScope: "scope-a",
    ownerKind: "ordinary_action", generationMode: "shujuku_same_layer", prompt: "prompt"
  });
  assert.equal(result, "transactional");
  assert.deepEqual(calls, { quiet: 0, sameLayer: 0, transactional: 1 });
});

test("a successful host attempt retains the last failure and compensation reasons", async () => {
  const context = {
    HATSU_HOST_GENERATION_ADAPTER: "current_transactional",
    hostGenerationAttemptDebug: {
      current: null,
      lastFailureReason: "assistant_timeout",
      lastCompensationReason: "assistant_timeout"
    },
    requestPromptCache: new Map(),
    createHostPromptCacheEntry: (envelope) => envelope,
    postHostGenerationAttemptDebug() {},
    runTransactionalPrompt: async () => "transactional"
  };
  vm.runInNewContext([
    readFunction(bridgeSource, "getHostGenerationAttemptDebugSnapshot"),
    readFunction(bridgeSource, "recordHostGenerationAttemptDebug"),
    readFunction(bridgeSource, "runHostGenerationAttempt"),
    "this.runAttempt = runHostGenerationAttempt;",
    "this.getSnapshot = getHostGenerationAttemptDebugSnapshot;"
  ].join("\n"), context);

  await context.runAttempt({
    requestId: "req-2",
    channelLeaseId: "lease-2",
    saveScope: "scope-a",
    ownerKind: "regeneration",
    generationMode: "shujuku_same_layer",
    prompt: "prompt"
  });

  const snapshot = context.getSnapshot();
  assert.equal(snapshot.status, "completed");
  assert.equal(snapshot.lastFailureReason, "assistant_timeout");
  assert.equal(snapshot.lastCompensationReason, "assistant_timeout");
});

test("native SillyTavern generation end is observed for the active frontend request", () => {
  const bind = readFunction(bridgeSource, "bindSillyTavernReplyBridge");
  assert.match(bind, /eventTypes\.GENERATION_ENDED/);
  assert.match(bind, /host_ended_empty/);
  assert.match(bind, /eventTypes\.GENERATION_STOPPED[\s\S]*host_stopped_empty/);
});

test("empty final polling is bounded and fails the exact host request", () => {
  const scheduled = [];
  const errors = [];
  let clears = 0;
  const context = {
    HOST_EMPTY_FINAL_MAX_RETRIES: 2,
    pendingRequestId: "req-1",
    pendingChannelLeaseId: "lease-1",
    pendingEmptyFinalRetryCount: 0,
    scheduleReplyRetry: (...args) => scheduled.push(args),
    postPrimaryAiError: (requestId, channelLeaseId, error) => errors.push({ requestId, channelLeaseId, error: error.message }),
    clearPendingReplyRequest: () => { clears += 1; }
  };
  vm.runInNewContext([
    readFunction(bridgeSource, "handleEmptyFinalReply"),
    "this.handleEmpty = handleEmptyFinalReply;"
  ].join("\n"), context);

  assert.equal(context.handleEmpty(8, "host_ended_empty"), "retry");
  assert.equal(context.handleEmpty(8, "host_ended_empty"), "retry");
  assert.equal(context.handleEmpty(8, "host_ended_empty"), "failed");
  assert.equal(scheduled.length, 2);
  assert.deepEqual(scheduled.map((entry) => Array.from(entry)), [
    [8, 350, "host_ended_empty"],
    [8, 350, "host_ended_empty"]
  ]);
  assert.deepEqual(errors, [{ requestId: "req-1", channelLeaseId: "lease-1", error: "host_ended_empty" }]);
  assert.equal(clears, 1);

  context.pendingRequestId = "req-2";
  context.pendingChannelLeaseId = "lease-2";
  context.pendingEmptyFinalRetryCount = 0;
  assert.equal(context.handleEmpty(-1, "host_ended_empty"), "failed");
  assert.deepEqual(errors.at(-1), { requestId: "req-2", channelLeaseId: "lease-2", error: "host_ended_empty" });
  assert.equal(clears, 2);
});

test("explicit frontend cancellation clears only the matching host attempt", () => {
  const handlerStart = bridgeSource.indexOf("if (data.type === 'cancelPrimaryAttempt')");
  const handlerEnd = bridgeSource.indexOf("if (data.type === 'sendPrompt')", handlerStart);
  assert.notEqual(handlerStart, -1);
  assert.notEqual(handlerEnd, -1);
  const handler = bridgeSource.slice(handlerStart, handlerEnd);
  assert.match(handler, /data\.requestId[\s\S]*pendingRequestId/);
  assert.match(handler, /data\.channelLeaseId[\s\S]*pendingChannelLeaseId/);
  assert.match(handler, /clearPendingReplyRequest\(\)/);
  assert.match(handler, /stopGeneration/);
});

test("secondary completion reports finish_reason length as output_truncated", () => {
  const classify = vm.runInNewContext(`(${readFunction(bridgeSource, "classifySecondaryApiCompletion")})`);
  const result = clone(classify({
    choices: [{
      message: { content: "partial private narrative" },
      finish_reason: "length"
    }]
  }));

  assert.deepEqual(result, {
    text: "partial private narrative",
    ok: false,
    error: "output_truncated",
    finishReason: "length"
  });
  assert.equal(JSON.stringify(result).includes("prompt"), false);
});

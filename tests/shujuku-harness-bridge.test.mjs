import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

const bridgeSource = readFileSync(new URL("../st.html", import.meta.url), "utf8");
const appSource = readFileSync(new URL("../app.js", import.meta.url), "utf8");

function readFunction(source, functionName) {
  const declaration = `function ${functionName}`;
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

test("structured host regeneration preserves the cached generation mode with the new lease", () => {
  const regenerateStart = bridgeSource.indexOf("if (data.type === 'regenerate')");
  const regenerateEnd = bridgeSource.indexOf("if (data.type === 'requestState')", regenerateStart);
  const regenerateBlock = bridgeSource.slice(regenerateStart, regenerateEnd);
  assert.match(regenerateBlock, /generationMode:\s*cachedPrompt\.generationMode/);
  assert.match(regenerateBlock, /channelLeaseId/);
  assert.match(regenerateBlock, /runHostGenerationAttempt\(regenerationEnvelope\)/);
  assert.match(regenerateBlock, /typeof cachedPrompt === 'object'/);
  assert.match(regenerateBlock, /runTransactionalPrompt\(cachedPromptText, reqId, channelLeaseId\)/);
});

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

const bridgeSource = readFileSync(new URL("../st.html", import.meta.url), "utf8");
const appSource = readFileSync(new URL("../app.js", import.meta.url), "utf8");

function readFunction(source, functionName) {
  const declaration = `function ${functionName}`;
  const start = source.indexOf(declaration);
  assert.notEqual(start, -1, `${functionName} must exist`);
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

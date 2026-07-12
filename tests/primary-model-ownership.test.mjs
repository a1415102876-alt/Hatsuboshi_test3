import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

const appSource = readFileSync(new URL("../app.js", import.meta.url), "utf8");
const bridgeSource = readFileSync(new URL("../st.html", import.meta.url), "utf8");

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

function makeOwnershipContext() {
  const context = {
    Date,
    clearTimeout() {},
    debugHarnessEvent() {},
    runtimeSessionEpoch: "session-current",
    activeHostSaveScope: "char-1-chat-a",
    leaseCounter: 0
  };
  vm.runInNewContext(
    [
      "let primaryModelChannelOwner = null;",
      "let primaryModelChannelTimeoutId = 0;",
      "const primaryModelChannelDebug = { lastReleaseReason: '', lastReleaseAt: 0, lastRejectReason: '', lastRejectAt: 0 };",
      "function createHarnessId(prefix) { leaseCounter += 1; return `${prefix}-${leaseCounter}`; }",
      "function schedulePrimaryModelChannelTimeout() {}",
      readFunction(appSource, "tryAcquirePrimaryModelChannel"),
      readFunction(appSource, "releasePrimaryModelChannel"),
      readFunction(appSource, "getPrimaryModelChannelOwner"),
      "this.acquire = tryAcquirePrimaryModelChannel;",
      "this.release = releasePrimaryModelChannel;",
      "this.currentOwner = getPrimaryModelChannelOwner;"
    ].join("\n"),
    context
  );
  return context;
}

test("primary model channel acquires one exact lease", () => {
  const context = makeOwnershipContext();
  const acquired = context.acquire({ requestId: "req-1", ownerKind: "phone_chat" });

  assert.equal(acquired.ok, true);
  assert.equal(acquired.owner.requestId, "req-1");
  assert.equal(acquired.owner.channelLeaseId, "primary-lease-1");
  assert.equal(acquired.owner.ownerKind, "phone_chat");
  assert.equal(acquired.owner.saveScope, "char-1-chat-a");
  assert.equal(acquired.owner.sessionEpoch, "session-current");
  assert.equal(context.currentOwner().requestId, "req-1");
});

test("different primary owner kinds remain globally single flight", () => {
  const context = makeOwnershipContext();
  const first = context.acquire({ requestId: "req-phone", ownerKind: "phone_chat" });
  const blocked = context.acquire({ requestId: "req-broadcast", ownerKind: "broadcast" });

  assert.equal(first.ok, true);
  assert.equal(blocked.ok, false);
  assert.equal(blocked.blockingOwner.requestId, "req-phone");
  assert.equal(context.currentOwner().ownerKind, "phone_chat");
});

test("primary owner releases only on exact request and lease match", () => {
  const context = makeOwnershipContext();
  const acquired = context.acquire({ requestId: "req-1", ownerKind: "ordinary_action", turnId: "turn-1" });

  assert.equal(context.release("req-old", acquired.owner.channelLeaseId, "stale"), false);
  assert.equal(context.release("req-1", "lease-old", "stale"), false);
  assert.equal(context.currentOwner().requestId, "req-1");
  assert.equal(context.release("req-1", acquired.owner.channelLeaseId, "completed"), true);
  assert.equal(context.currentOwner(), null);
});

test("an old lease cannot release a newer owner", () => {
  const context = makeOwnershipContext();
  const oldOwner = context.acquire({ requestId: "req-shared", ownerKind: "legacy_main" }).owner;
  assert.equal(context.release(oldOwner.requestId, oldOwner.channelLeaseId, "retry"), true);
  const newOwner = context.acquire({ requestId: "req-shared", ownerKind: "ordinary_recovery", turnId: "turn-1" }).owner;

  assert.notEqual(newOwner.channelLeaseId, oldOwner.channelLeaseId);
  assert.equal(context.release(oldOwner.requestId, oldOwner.channelLeaseId, "late_reply"), false);
  assert.equal(context.currentOwner().channelLeaseId, newOwner.channelLeaseId);
});
test("ordinary action acquires a formal lease before settlement side effects", () => {
  const start = appSource.indexOf("function settleAction(");
  const end = appSource.indexOf("function createRequestId(", start);
  const settlement = appSource.slice(start, end);
  const acquireIndex = settlement.indexOf("tryAcquirePrimaryModelChannel(");
  const pendingContextIndex = settlement.indexOf("state.pendingActionContext = {");
  const randomIndex = settlement.indexOf("rollActionEvent(");
  const deltaWriteIndex = settlement.indexOf("Object.entries(delta).forEach");
  const logWriteIndex = settlement.indexOf("state.log.unshift(");

  assert.ok(acquireIndex >= 0 && acquireIndex < pendingContextIndex);
  assert.ok(acquireIndex < randomIndex);
  assert.ok(acquireIndex < deltaWriteIndex);
  assert.ok(acquireIndex < logWriteIndex);
  assert.match(settlement, /ownerKind:\s*"ordinary_action"/);
  assert.match(settlement, /requestHostPromptSend\(prompt, requestId,\s*\{[\s\S]*channelLeaseId/);
});

test("recovery acquires a new lease before changing the active turn", () => {
  const recovery = readFunction(appSource, "retryHarnessNarrativeRecovery");
  const acquireIndex = recovery.indexOf("tryAcquirePrimaryModelChannel(");
  const activeTurnWriteIndex = recovery.indexOf("state.harness.activeTurn = {");

  assert.ok(acquireIndex >= 0 && acquireIndex < activeTurnWriteIndex);
  assert.match(recovery, /ownerKind:\s*"ordinary_recovery"/);
  assert.match(recovery, /turnId:\s*turn\.turnId/);
  assert.match(recovery, /requestHostPromptSend\(prompt, requestId,\s*\{[\s\S]*channelLeaseId/);
  assert.match(readFunction(appSource, "hasConflictingHarnessRecoveryFlow"), /getPrimaryModelChannelOwner/);
});

test("primary bridge echoes the exact lease and terminal handling releases it", () => {
  assert.match(bridgeSource, /normalizeHostGenerationEnvelope\(data\)/);
  assert.match(bridgeSource, /runHostGenerationAttempt\(envelope\)/);
  assert.match(readFunction(bridgeSource, "runHostGenerationAttempt"), /runTransactionalPrompt\(envelope\.prompt, envelope\.requestId, envelope\.channelLeaseId\)/);
  assert.match(bridgeSource, /pendingChannelLeaseId\s*=\s*String\(channelLeaseId/);
  assert.match(bridgeSource, /channelLeaseId:\s*String\(options\.channelLeaseId/);
  assert.match(bridgeSource, /channelLeaseId:\s*pendingChannelLeaseId/);
  assert.match(readFunction(appSource, "sendAiReplyAck"), /releasePrimaryModelChannel\(/);
  assert.match(appSource, /payload\.channelLeaseId/);
});
test("phone and broadcast acquire before migrated business side effects", () => {
  const submitPhone = readFunction(appSource, "submitPhoneChatMessage");
  const phoneAcquire = submitPhone.indexOf("tryAcquirePrimaryModelChannel(");
  assert.ok(phoneAcquire >= 0 && phoneAcquire < submitPhone.indexOf("appendPhoneChatMessage("));
  assert.match(submitPhone, /ownerKind:\s*"phone_chat"/);
  assert.match(submitPhone, /sendPhoneChatToHost\([\s\S]*channelLeaseId/);

  const broadcastStart = appSource.indexOf("function requestBroadcastFullScript(");
  const broadcastEnd = appSource.indexOf("function extractBroadcastReply(", broadcastStart);
  const broadcast = appSource.slice(broadcastStart, broadcastEnd);
  const broadcastAcquire = broadcast.indexOf("tryAcquirePrimaryModelChannel(");
  assert.ok(broadcastAcquire >= 0 && broadcastAcquire < broadcast.indexOf("state.activeStoryNode ="));
  assert.ok(broadcastAcquire < broadcast.indexOf('episode.scriptStatus = "generating"'));
  assert.match(broadcast, /ownerKind:\s*"broadcast"/);
  assert.match(broadcast, /sendBroadcastPromptToHost\([\s\S]*channelLeaseId/);
});

test("primary channel timeout delegates existing failure semantics then releases the exact lease", () => {
  const schedule = readFunction(appSource, "schedulePrimaryModelChannelTimeout");
  const failure = readFunction(appSource, "handlePrimaryModelChannelFailure");

  assert.match(schedule, /PRIMARY_MODEL_CHANNEL_TIMEOUT_MS/);
  assert.match(schedule, /handlePrimaryModelChannelFailure\(owner,\s*"timeout"\)/);
  assert.match(failure, /ordinary_recovery[\s\S]*returnHarnessRecoveryAttemptToPending/);
  assert.match(failure, /phone_chat[\s\S]*resetPhoneChatPendingState/);
  assert.match(failure, /broadcast[\s\S]*resetBroadcastPendingState/);
  assert.match(failure, /releasePrimaryModelChannel\(owner\.requestId,\s*owner\.channelLeaseId/);
});

test("host primary errors retain request and lease ownership", () => {
  assert.match(bridgeSource, /type:\s*'primaryAiError'/);
  assert.match(bridgeSource, /requestId:\s*String\(requestId/);
  assert.match(bridgeSource, /channelLeaseId:\s*String\(channelLeaseId/);
  assert.match(appSource, /payload\.type === "primaryAiError"/);
  assert.match(appSource, /handlePrimaryModelChannelFailure\([\s\S]*payload\.channelLeaseId/);
});
test("missing regenerate cache fails the exact primary lease immediately", () => {
  const handlerStart = bridgeSource.indexOf("if (data.type === 'regenerate')");
  const handlerEnd = bridgeSource.indexOf("if (data.type === 'aiReplyAck')", handlerStart);
  const handler = bridgeSource.slice(handlerStart, handlerEnd);

  assert.match(handler, /if \(cachedPrompt\)[\s\S]*else\s*\{[\s\S]*postPrimaryAiError\(reqId, channelLeaseId/);
  assert.match(handler, /regenerate_cache_missing/);
});

test("frontend rejects an old lease before applying a reply with the reused request id", () => {
  const context = {
    isPrimaryModelLeaseCurrent: (requestId, leaseId) => requestId === "req-1" && leaseId === "lease-new"
  };
  vm.runInNewContext([
    readFunction(appSource, "isCurrentPrimaryHostPayload"),
    "this.acceptPayload = isCurrentPrimaryHostPayload;"
  ].join("\n"), context);

  assert.equal(context.acceptPayload({
    type: "aiReplyCommitted",
    requestId: "req-1",
    channelLeaseId: "lease-old"
  }), false);
  assert.equal(context.acceptPayload({
    type: "aiReplyCommitted",
    requestId: "req-1",
    channelLeaseId: "lease-new"
  }), true);

  const route = readFunction(appSource, "routeHostAiPayload");
  const gateIndex = route.indexOf("isCurrentPrimaryHostPayload(payload)");
  const applyIndex = route.indexOf("applyAiReply(");
  assert.ok(gateIndex >= 0 && gateIndex < applyIndex);
});

test("debug skip cancels the host attempt and releases the exact lease", () => {
  const owner = {
    requestId: "req-1",
    channelLeaseId: "lease-1",
    ownerKind: "ordinary_action",
    turnId: "turn-1"
  };
  const posted = [];
  const released = [];
  const marked = [];
  const context = {
    state: { harness: { activeTurn: { turnId: "turn-1", requestId: "req-1", status: "generating" } } },
    isSillyTavernHost: () => true,
    markHarnessProduceTurn: (...args) => marked.push(args),
    releasePrimaryModelChannel: (...args) => { released.push(args); return true; },
    window: { parent: { postMessage: (payload) => posted.push(payload) } }
  };
  vm.runInNewContext([
    readFunction(appSource, "finishDebugSkippedPrimaryAttempt"),
    "this.finishSkip = finishDebugSkippedPrimaryAttempt;"
  ].join("\n"), context);

  assert.equal(context.finishSkip(owner), true);
  assert.deepEqual(JSON.parse(JSON.stringify(marked)), [["completed_without_narrative", { completionReason: "debug_skip" }, "req-1"]]);
  assert.deepEqual(released.map((entry) => Array.from(entry)), [["req-1", "lease-1", "debug_skip"]]);
  assert.deepEqual(JSON.parse(JSON.stringify(posted)), [{
    source: "hatsuboshi-produce",
    type: "cancelPrimaryAttempt",
    requestId: "req-1",
    channelLeaseId: "lease-1",
    reason: "debug_skip"
  }]);

  const recoveryOwner = { ...owner, requestId: "req-2", channelLeaseId: "lease-2", ownerKind: "ordinary_recovery" };
  context.state.harness.activeTurn = { turnId: "turn-1", requestId: "req-2", status: "generating" };
  assert.equal(context.finishSkip(recoveryOwner), true);
  assert.deepEqual(JSON.parse(JSON.stringify(marked.at(-1))), ["completed_without_narrative", { completionReason: "debug_skip" }, "req-2"]);
  assert.deepEqual(Array.from(released.at(-1)), ["req-2", "lease-2", "debug_skip"]);
});

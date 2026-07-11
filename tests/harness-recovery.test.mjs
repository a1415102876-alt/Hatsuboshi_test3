import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

const appSource = readFileSync(new URL("../app.js", import.meta.url), "utf8");
const indexSource = readFileSync(new URL("../index.html", import.meta.url), "utf8");

function readFunction(source, functionName) {
  const declaration = `function ${functionName}`;
  const start = source.indexOf(declaration);
  assert.notEqual(start, -1, `${functionName} must exist`);
  const parameterEnd = source.indexOf(")", start);
  const bodyStart = source.indexOf("{", parameterEnd);
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

function loadRecoveryHelpers() {
  const sandbox = {};
  vm.runInNewContext([
    readFunction(appSource, "isHarnessOrdinaryAction"),
    readFunction(appSource, "isHarnessTurnInActiveScope"),
    readFunction(appSource, "getHarnessRecoveryDisposition"),
    "this.isHarnessTurnInActiveScope = isHarnessTurnInActiveScope;",
    "this.getHarnessRecoveryDisposition = getHarnessRecoveryDisposition;"
  ].join("\n"), sandbox);
  return sandbox;
}

function hostContext(overrides = {}) {
  return {
    runtimeSessionEpoch: "session-new",
    isHost: true,
    activeHostSaveScope: "scope-a",
    activeStorageKey: "hatsuProduceLocalState:scope-a",
    ...overrides
  };
}

function ordinaryTurn(overrides = {}) {
  return {
    turnId: "turn-1",
    kind: "produce_action",
    status: "generating",
    action: "training",
    requestId: "request-old",
    saveScope: "scope-a",
    storageKey: "hatsuProduceLocalState:scope-a",
    sessionEpoch: "session-old",
    ...overrides
  };
}

function readSection(startMarker, endMarker) {
  const start = appSource.indexOf(startMarker);
  const end = appSource.indexOf(endMarker, start);
  assert.notEqual(start, -1, `${startMarker} must exist`);
  assert.notEqual(end, -1, `${endMarker} must follow ${startMarker}`);
  return appSource.slice(start, end);
}

test("only old-session settled or generating ordinary turns require a recovery transition", () => {
  const { getHarnessRecoveryDisposition } = loadRecoveryHelpers();
  const context = hostContext();

  assert.equal(getHarnessRecoveryDisposition(ordinaryTurn({ status: "settled" }), context), "transition");
  assert.equal(getHarnessRecoveryDisposition(ordinaryTurn({ status: "generating" }), context), "transition");
  assert.equal(getHarnessRecoveryDisposition(ordinaryTurn({ status: "recovery_required" }), context), "pending");

  for (const status of ["prepared", "completed", "completed_without_narrative", "failed", "abandoned"]) {
    assert.equal(getHarnessRecoveryDisposition(ordinaryTurn({ status }), context), "none", status);
  }
  assert.equal(getHarnessRecoveryDisposition(ordinaryTurn({ sessionEpoch: "session-new" }), context), "none");
  assert.equal(getHarnessRecoveryDisposition(ordinaryTurn({ action: "outing" }), context), "none");
  assert.equal(getHarnessRecoveryDisposition(ordinaryTurn({ kind: "phone_chat" }), context), "none");
});

test("host recovery scope requires nonempty exact saveScope equality", () => {
  const { isHarnessTurnInActiveScope, getHarnessRecoveryDisposition } = loadRecoveryHelpers();

  assert.equal(isHarnessTurnInActiveScope(ordinaryTurn(), hostContext()), true);
  assert.equal(isHarnessTurnInActiveScope(ordinaryTurn({ saveScope: "scope-b" }), hostContext()), false);
  assert.equal(isHarnessTurnInActiveScope(ordinaryTurn({ saveScope: "" }), hostContext()), false);
  assert.equal(isHarnessTurnInActiveScope(ordinaryTurn(), hostContext({ activeHostSaveScope: "" })), false);
  assert.equal(getHarnessRecoveryDisposition(ordinaryTurn({ saveScope: "scope-b" }), hostContext()), "none");
});

test("local recovery scope requires an exact persisted storage key", () => {
  const { isHarnessTurnInActiveScope } = loadRecoveryHelpers();
  const context = hostContext({
    isHost: false,
    activeHostSaveScope: "",
    activeStorageKey: "hatsuProduceLocalState:local-a"
  });

  assert.equal(isHarnessTurnInActiveScope(ordinaryTurn({ storageKey: context.activeStorageKey }), context), true);
  assert.equal(isHarnessTurnInActiveScope(ordinaryTurn({ storageKey: "" }), context), false);
  assert.equal(isHarnessTurnInActiveScope(ordinaryTurn({ storageKey: "hatsuProduceLocalState:local-b" }), context), false);
});

test("recovery trace types are allowlisted without changing routine trace policy", () => {
  const expectedTypes = [
    "turn.recovery_required",
    "turn.recovery_started",
    "turn.recovery_send_failed",
    "turn.prompt_rejected",
    "turn.abandoned",
    "turn.rejected_recovery_pending"
  ];
  for (const type of expectedTypes) {
    assert.equal(appSource.includes(`"${type}"`), true, `${type} must be allowlisted`);
  }
  assert.doesNotMatch(appSource, /recordHarnessTrace\("state\.save"/);
});

test("activeTurn requestId remains the only accepted current reply id", () => {
  const shouldAccept = readFunction(appSource, "shouldAcceptAiReply");
  const apply = appSource.slice(
    appSource.indexOf("function applyAiReply("),
    appSource.indexOf("function sendAiReplyAck(", appSource.indexOf("function applyAiReply("))
  );

  assert.doesNotMatch(shouldAccept, /requestIds/);
  assert.doesNotMatch(apply, /activeTurn\?\.requestIds|activeTurn\.requestIds/);
  assert.match(apply, /shouldAcceptAiReply\(requestId, pendingAiRequestId\)/);
  assert.equal(vm.runInNewContext(`(${shouldAccept})("request-new", "request-new")`), true);
  assert.equal(vm.runInNewContext(`(${shouldAccept})("request-old", "request-new")`), false);
});

test("recovery prompt capture records length and rejects missing or oversized text", () => {
  const capture = vm.runInNewContext(`(${readFunction(appSource, "captureHarnessGenerationPrompt")})`, {
    HARNESS_RECOVERY_PROMPT_MAX_LENGTH: 120000
  });

  assert.deepEqual(JSON.parse(JSON.stringify(capture("prompt body"))), {
    generationPrompt: "prompt body",
    generationPromptLength: 11,
    generationPromptStatus: "captured"
  });
  assert.deepEqual(JSON.parse(JSON.stringify(capture("   "))), {
    generationPrompt: "",
    generationPromptLength: 3,
    generationPromptStatus: "missing"
  });
  assert.deepEqual(JSON.parse(JSON.stringify(capture("x".repeat(120001)))), {
    generationPrompt: "",
    generationPromptLength: 120001,
    generationPromptStatus: "too_large"
  });
  assert.match(appSource, /const HARNESS_RECOVERY_PROMPT_MAX_LENGTH = 120000;/);
});

test("request id audit keeps only six nonempty unique ids", () => {
  const appendRequestId = vm.runInNewContext(`(${readFunction(appSource, "appendHarnessRequestId")})`);
  let ids = [];
  for (const requestId of ["", "r1", "r2", "r3", "r4", "r5", "r6", "r7", "r7"]) {
    ids = Array.from(appendRequestId(ids, requestId));
  }
  assert.deepEqual(ids, ["r2", "r3", "r4", "r5", "r6", "r7"]);
});

test("prompt-like trace detail fields cannot persist narrative text", () => {
  const sanitize = vm.runInNewContext(`(${readFunction(appSource, "sanitizeHarnessDetail")})`);
  const safe = JSON.parse(JSON.stringify(sanitize({
    prompt: "secret-a",
    promptText: "secret-b",
    generationPrompt: "secret-c",
    recoveryPrompt: "secret-d",
    promptLength: 2345,
    promptStatus: "captured"
  })));
  assert.deepEqual(safe, { promptLength: 2345, promptStatus: "captured" });
});

test("ordinary settlement freezes the existing prompt before its settled save", () => {
  const settlement = readSection("function settleAction(", "function createRequestId(");
  const promptIndex = settlement.indexOf("const prompt = buildPrompt(");
  const captureIndex = settlement.indexOf("captureHarnessGenerationPrompt(prompt)");
  const settledIndex = settlement.indexOf('markHarnessProduceTurn("settled"');
  const saveIndex = settlement.indexOf("saveState();", settledIndex);
  const generatingIndex = settlement.indexOf('markHarnessProduceTurn("generating"');
  const rejectedTraceIndex = settlement.indexOf('recordHarnessTrace("turn.prompt_rejected"');
  const rejectedTrace = settlement.slice(rejectedTraceIndex, rejectedTraceIndex + 320);

  assert.ok(promptIndex >= 0 && promptIndex < captureIndex);
  assert.ok(captureIndex < settledIndex && settledIndex < saveIndex);
  assert.match(settlement.slice(settledIndex, saveIndex), /\.\.\.harnessPromptCapture/);
  assert.match(settlement.slice(generatingIndex, generatingIndex + 320), /appendHarnessRequestId/);
  assert.match(rejectedTrace, /promptLength/);
  assert.match(rejectedTrace, /promptStatus/);
  assert.doesNotMatch(rejectedTrace, /generationPrompt\s*:/);
});

test("refresh transition preserves the turn and is persisted only once", () => {
  const state = { harness: { activeTurn: ordinaryTurn() } };
  const trace = [];
  let saves = 0;
  const context = hostContext();
  const sandbox = {
    state,
    runtimeSessionEpoch: context.runtimeSessionEpoch,
    activeHostSaveScope: context.activeHostSaveScope,
    activeStorageKey: context.activeStorageKey,
    isSillyTavernHost: () => true,
    isHarnessOrdinaryAction: (action) => ["lesson", "training", "rest"].includes(action),
    recordHarnessTrace: (type, detail) => trace.push({ type, detail }),
    saveState: () => { saves += 1; },
    Date: { now: () => 123456 }
  };
  vm.runInNewContext([
    readFunction(appSource, "isHarnessTurnInActiveScope"),
    readFunction(appSource, "getHarnessRecoveryDisposition"),
    readFunction(appSource, "getHarnessRecoveryContext"),
    readFunction(appSource, "markHarnessRecoveryRequired"),
    "this.markHarnessRecoveryRequired = markHarnessRecoveryRequired;"
  ].join("\n"), sandbox);

  const first = sandbox.markHarnessRecoveryRequired();
  assert.equal(first.status, "recovery_required");
  assert.equal(first.turnId, "turn-1");
  assert.equal(first.requestId, "request-old");
  assert.equal(first.interruptedStatus, "generating");
  assert.equal(first.interruptedSessionEpoch, "session-old");
  assert.equal(first.recoveryRequiredAt, 123456);
  assert.equal(saves, 1);
  assert.equal(trace.length, 1);
  assert.equal(trace[0].type, "turn.recovery_required");

  const second = sandbox.markHarnessRecoveryRequired();
  assert.equal(second.status, "recovery_required");
  assert.equal(saves, 1);
  assert.equal(trace.length, 1);
});

test("recovery prompt auto-opens once per page and can be forced open", () => {
  const turn = ordinaryTurn({ status: "recovery_required" });
  const opened = [];
  const sandbox = {
    shownHarnessRecoveryKeys: new Set(),
    markHarnessRecoveryRequired: () => turn,
    getHarnessRecoveryContext: () => hostContext(),
    openHarnessRecoveryOverlay: (value) => opened.push(value.turnId)
  };
  vm.runInNewContext([
    readFunction(appSource, "buildHarnessRecoveryPromptKey"),
    readFunction(appSource, "maybeShowHarnessRecoveryPrompt"),
    "this.maybeShowHarnessRecoveryPrompt = maybeShowHarnessRecoveryPrompt;"
  ].join("\n"), sandbox);

  const maybeShowSource = readFunction(appSource, "maybeShowHarnessRecoveryPrompt");
  assert.doesNotMatch(maybeShowSource, /createRequestId|requestHostPromptSend|postMessage/);

  assert.equal(sandbox.maybeShowHarnessRecoveryPrompt(), true);
  assert.equal(sandbox.maybeShowHarnessRecoveryPrompt(), false);
  assert.equal(sandbox.maybeShowHarnessRecoveryPrompt({ force: true }), true);
  assert.deepEqual(opened, ["turn-1", "turn-1"]);
});

test("recovery prompt is scheduled only after the active host scope and render are ready", () => {
  const applyHost = readFunction(appSource, "applyHostCharacter");
  const scopeIndex = applyHost.indexOf("activeHostSaveScope = String(saveScope || \"\")");
  const renderIndex = applyHost.indexOf("render();", scopeIndex);
  const scheduleIndex = applyHost.indexOf("requestAnimationFrame(() => maybeShowHarnessRecoveryPrompt())");
  assert.ok(scopeIndex >= 0 && scopeIndex < renderIndex && renderIndex < scheduleIndex);

  const bootstrap = appSource.slice(appSource.indexOf("hydrateWorldMapLayout().finally"));
  assert.match(bootstrap, /if \(!isSillyTavernHost\(\)\) requestAnimationFrame\(\(\) => maybeShowHarnessRecoveryPrompt\(\)\)/);
});

test("the independent recovery overlay closes without abandoning the turn", () => {
  assert.match(indexSource, /id="harnessRecoveryOverlay"/);
  assert.doesNotMatch(indexSource, /id="harnessRecoveryRetryBtn"[^>]*disabled/);
  assert.doesNotMatch(indexSource, /id="harnessRecoveryAbandonBtn"[^>]*disabled/);
  assert.match(indexSource, /id="harnessRecoveryDismissBtn"/);

  const closeRecovery = readFunction(appSource, "closeHarnessRecoveryOverlay");
  const closeEvent = readFunction(appSource, "closeEventOverlay");
  assert.doesNotMatch(closeRecovery, /state\.|abandoned|recovery_required/);
  assert.doesNotMatch(closeEvent, /abandoned|recovery_required/);
  const keydownStart = appSource.indexOf('document.addEventListener("keydown"');
  const keydown = appSource.slice(keydownStart, keydownStart + 700);
  const recoveryCloseIndex = keydown.indexOf("closeHarnessRecoveryOverlay();");
  const earlyReturnIndex = keydown.indexOf("return;", recoveryCloseIndex);
  const eventCloseIndex = keydown.indexOf("closeEventOverlay();");
  assert.ok(recoveryCloseIndex >= 0 && recoveryCloseIndex < earlyReturnIndex && earlyReturnIndex < eventCloseIndex);

  const node = { hidden: false };
  const sandbox = {
    document: { getElementById: (id) => id === "harnessRecoveryOverlay" ? node : null },
    setElementHidden: (id, hidden) => { if (id === "harnessRecoveryOverlay") node.hidden = hidden; }
  };
  const close = vm.runInNewContext(`(${closeRecovery})`, sandbox);
  close();
  assert.equal(node.hidden, true);
});

test("recovery retry preserves turn id, rotates request id, and sends only the frozen prompt", () => {
  const turn = ordinaryTurn({
    status: "recovery_required",
    generationPrompt: "frozen ordinary prompt",
    generationPromptLength: 22,
    generationPromptStatus: "captured",
    requestIds: ["request-old"],
    recoveryAttemptCount: 0
  });
  const state = {
    harness: { activeTurn: turn },
    lastPrompt: "unrelated latest prompt",
    pendingAiRequestId: ""
  };
  const sent = [];
  const traces = [];
  const sandbox = {
    state,
    runtimeSessionEpoch: "session-new",
    pendingAiRequestId: "",
    aiReplyRetryCount: 2,
    HARNESS_RECOVERY_PROMPT_MAX_LENGTH: 120000,
    Date: { now: () => 654321 },
    createRequestId: () => "request-new",
    getHarnessRecoveryContext: () => hostContext(),
    isHarnessOrdinaryAction: (action) => ["lesson", "training", "rest"].includes(action),
    getPrimaryModelChannelOwner: () => null,
    tryAcquirePrimaryModelChannel: () => ({ ok: true, owner: { channelLeaseId: "lease-new" } }),
    rejectPrimaryModelDispatch: () => false,
    requestHostPromptSend: (prompt, requestId, options) => {
      sent.push({ prompt, requestId, options });
      return true;
    },
    recordHarnessTrace: (type, detail) => traces.push({ type, detail }),
    appendHarnessRequestId: vm.runInNewContext(`(${readFunction(appSource, "appendHarnessRequestId")})`),
    saveState: () => {},
    render: () => {},
    closeHarnessRecoveryOverlay: () => {},
    openEventOverlay: () => {},
    showToast: () => {}
  };
  vm.runInNewContext([
    readFunction(appSource, "isHarnessTurnInActiveScope"),
    readFunction(appSource, "resolveHarnessRecoveryPrompt"),
    readFunction(appSource, "hasConflictingHarnessRecoveryFlow"),
    readFunction(appSource, "retryHarnessNarrativeRecovery"),
    "this.retryHarnessNarrativeRecovery = retryHarnessNarrativeRecovery;"
  ].join("\n"), sandbox);

  assert.equal(sandbox.retryHarnessNarrativeRecovery(), true);
  assert.equal(state.harness.activeTurn.turnId, "turn-1");
  assert.equal(state.harness.activeTurn.requestId, "request-new");
  assert.deepEqual(Array.from(state.harness.activeTurn.requestIds), ["request-old", "request-new"]);
  assert.equal(state.harness.activeTurn.status, "generating");
  assert.equal(state.harness.activeTurn.sessionEpoch, "session-new");
  assert.equal(state.harness.activeTurn.recoveryAttemptCount, 1);
  assert.equal(state.lastPrompt, "frozen ordinary prompt");
  assert.deepEqual(JSON.parse(JSON.stringify(sent)), [{
    prompt: "frozen ordinary prompt",
    requestId: "request-new",
    options: { channelLeaseId: "lease-new", ownerKind: "ordinary_recovery", turnId: "turn-1" }
  }]);
  assert.equal(traces.at(-1)?.type, "turn.recovery_started");
});

test("recovery retry refuses missing or unowned prompts before creating a request", () => {
  const retrySource = readFunction(appSource, "retryHarnessNarrativeRecovery");
  assert.doesNotMatch(retrySource, /buildPrompt\s*\(/);
  assert.doesNotMatch(retrySource, /triggerRegeneration\s*\(|regenerate/);

  for (const overrides of [
    { generationPrompt: "", generationPromptLength: 0, generationPromptStatus: "missing" },
    { generationPrompt: "frozen", generationPromptLength: 6, generationPromptStatus: "captured", saveScope: "scope-b" }
  ]) {
    const state = { harness: { activeTurn: ordinaryTurn({ status: "recovery_required", ...overrides }) } };
    let createCount = 0;
    let sendCount = 0;
    const sandbox = {
      state,
      runtimeSessionEpoch: "session-new",
      pendingAiRequestId: "",
      HARNESS_RECOVERY_PROMPT_MAX_LENGTH: 120000,
      createRequestId: () => { createCount += 1; return "request-new"; },
      getHarnessRecoveryContext: () => hostContext(),
      isHarnessOrdinaryAction: (action) => ["lesson", "training", "rest"].includes(action),
      appendHarnessRequestId: (ids, id) => [...ids, id],
      requestHostPromptSend: () => { sendCount += 1; return true; },
      showToast: () => {}
    };
    vm.runInNewContext([
      readFunction(appSource, "isHarnessTurnInActiveScope"),
      readFunction(appSource, "resolveHarnessRecoveryPrompt"),
      readFunction(appSource, "hasConflictingHarnessRecoveryFlow"),
      readFunction(appSource, "retryHarnessNarrativeRecovery"),
      "this.retryHarnessNarrativeRecovery = retryHarnessNarrativeRecovery;"
    ].join("\n"), sandbox);
    assert.equal(sandbox.retryHarnessNarrativeRecovery(), false);
    assert.equal(createCount, 0);
    assert.equal(sendCount, 0);
    assert.equal(state.harness.activeTurn.requestId, "request-old");
  }
});

test("recovery conflict detection ignores UI-only overlays but blocks an occupied model channel", () => {
  const conflict = vm.runInNewContext(`(${readFunction(appSource, "hasConflictingHarnessRecoveryFlow")})`, {
    pendingAiRequestId: "",
    state: { pendingAiRequestId: "" },
    getPrimaryModelChannelOwner: () => null
  });
  assert.equal(conflict(), false);

  const occupied = vm.runInNewContext(`(${readFunction(appSource, "hasConflictingHarnessRecoveryFlow")})`, {
    pendingAiRequestId: "phone-request",
    state: { pendingAiRequestId: "phone-request", eventMode: "none" },
    getPrimaryModelChannelOwner: () => ({ requestId: "phone-request", ownerKind: "phone_chat" })
  });
  assert.equal(occupied(), true);
  assert.doesNotMatch(readFunction(appSource, "hasConflictingHarnessRecoveryFlow"), /overlay|hidden|eventMode/);
});

test("synchronous recovery send failure returns the same turn to recovery_required", () => {
  const state = {
    harness: { activeTurn: ordinaryTurn({
      status: "recovery_required",
      generationPrompt: "frozen prompt",
      generationPromptLength: 13,
      generationPromptStatus: "captured",
      requestIds: ["request-old"]
    }) },
    pendingAiRequestId: ""
  };
  const traces = [];
  const sandbox = {
    state,
    runtimeSessionEpoch: "session-new",
    pendingAiRequestId: "",
    aiReplyRetryCount: 0,
    HARNESS_RECOVERY_PROMPT_MAX_LENGTH: 120000,
    Date: { now: () => 777 },
    createRequestId: () => "request-new",
    getHarnessRecoveryContext: () => hostContext(),
    isHarnessOrdinaryAction: (action) => ["lesson", "training", "rest"].includes(action),
    getPrimaryModelChannelOwner: () => null,
    tryAcquirePrimaryModelChannel: () => ({ ok: true, owner: { channelLeaseId: "lease-new" } }),
    rejectPrimaryModelDispatch: () => false,
    appendHarnessRequestId: vm.runInNewContext(`(${readFunction(appSource, "appendHarnessRequestId")})`),
    requestHostPromptSend: () => false,
    recordHarnessTrace: (type, detail) => traces.push({ type, detail }),
    saveState: () => {},
    render: () => {},
    closeHarnessRecoveryOverlay: () => {},
    openEventOverlay: () => {},
    openHarnessRecoveryOverlay: () => {},
    showToast: () => {}
  };
  vm.runInNewContext([
    readFunction(appSource, "isHarnessTurnInActiveScope"),
    readFunction(appSource, "resolveHarnessRecoveryPrompt"),
    readFunction(appSource, "hasConflictingHarnessRecoveryFlow"),
    readFunction(appSource, "returnHarnessRecoveryAttemptToPending"),
    readFunction(appSource, "retryHarnessNarrativeRecovery"),
    "this.retryHarnessNarrativeRecovery = retryHarnessNarrativeRecovery;"
  ].join("\n"), sandbox);

  assert.equal(sandbox.retryHarnessNarrativeRecovery(), false);
  assert.equal(state.harness.activeTurn.turnId, "turn-1");
  assert.equal(state.harness.activeTurn.status, "recovery_required");
  assert.equal(state.harness.activeTurn.requestId, "");
  assert.deepEqual(Array.from(state.harness.activeTurn.requestIds), ["request-old", "request-new"]);
  assert.equal(traces.at(-1)?.type, "turn.recovery_send_failed");
});

test("retryable recovery validation exhaustion returns to recovery_required instead of failed", () => {
  const helper = readFunction(appSource, "returnHarnessRecoveryAttemptToPending");
  const state = { harness: { activeTurn: ordinaryTurn({
    status: "generating",
    sessionEpoch: "session-new",
    requestId: "request-new",
    recoveryAttemptCount: 1
  }) } };
  const traces = [];
  const sandbox = {
    state,
    runtimeSessionEpoch: "session-new",
    Date: { now: () => 999 },
    recordHarnessTrace: (type, detail) => traces.push({ type, detail })
  };
  const returnToPending = vm.runInNewContext(`(${helper})`, sandbox);
  assert.equal(returnToPending("request-new", "invalid_reply"), true);
  assert.equal(state.harness.activeTurn.status, "recovery_required");
  assert.equal(state.harness.activeTurn.requestId, "");
  assert.equal(traces.at(-1)?.type, "turn.recovery_send_failed");

  const normalState = { harness: { activeTurn: ordinaryTurn({
    status: "generating",
    sessionEpoch: "session-new",
    requestId: "request-normal",
    recoveryAttemptCount: 0
  }) } };
  const normal = vm.runInNewContext(`(${helper})`, {
    state: normalState,
    runtimeSessionEpoch: "session-new",
    Date: { now: () => 1000 },
    recordHarnessTrace: () => {}
  });
  assert.equal(normal("request-normal", "invalid_reply"), false);
  assert.equal(normalState.harness.activeTurn.status, "generating");
});

test("recovery controls are enabled and wired without changing ordinary close behavior", () => {
  assert.doesNotMatch(indexSource, /id="harnessRecoveryRetryBtn"[^>]*disabled/);
  assert.match(appSource, /harnessRecoveryRetryBtn"\)\?\.addEventListener\("click", retryHarnessNarrativeRecovery\)/);
  assert.doesNotMatch(readFunction(appSource, "closeHarnessRecoveryOverlay"), /abandoned|recovery_required|state\./);
});

test("pending recovery blocks every ordinary action before a new turn or settlement context is written", () => {
  for (const action of ["lesson", "training", "rest"]) {
    const state = {
      day: 4,
      round: 2,
      stamina: 68,
      stress: 11,
      trust: 35,
      Vo: 100,
      Da: 110,
      Vi: 120,
      pendingActionContext: null,
      log: [{ action: "existing" }],
      harness: { activeTurn: ordinaryTurn({ status: "recovery_required" }) }
    };
    const businessBefore = JSON.stringify({
      day: state.day,
      round: state.round,
      stamina: state.stamina,
      stress: state.stress,
      trust: state.trust,
      Vo: state.Vo,
      Da: state.Da,
      Vi: state.Vi,
      pendingActionContext: state.pendingActionContext,
      log: state.log
    });
    let actionKeyBuilds = 0;
    let promptOpens = 0;
    let saves = 0;
    const traces = [];
    const sandbox = {
      state,
      runtimeSessionEpoch: "session-new",
      activeHostSaveScope: "scope-a",
      activeStorageKey: "hatsuProduceLocalState:scope-a",
      buildHarnessActionKey: () => { actionKeyBuilds += 1; return "new-key"; },
      buildHarnessPreTurnSnapshot: () => ({ day: 4, round: 2 }),
      createHarnessId: () => "turn-new",
      getHarnessRecoveryContext: () => hostContext(),
      isHarnessTurnInActiveScope: () => true,
      isHarnessOrdinaryAction: (value) => ["lesson", "training", "rest"].includes(value),
      isHarnessTurnBlocking: () => false,
      recordHarnessTrace: (type, detail) => traces.push({ type, detail }),
      debugHarnessEvent: () => {},
      maybeShowHarnessRecoveryPrompt: ({ force }) => { if (force) promptOpens += 1; },
      showToast: () => {},
      saveState: () => { saves += 1; }
    };
    vm.runInNewContext([
      readFunction(appSource, "beginHarnessProduceAction"),
      "this.beginHarnessProduceAction = beginHarnessProduceAction;"
    ].join("\n"), sandbox);

    assert.deepEqual(JSON.parse(JSON.stringify(sandbox.beginHarnessProduceAction(action, "Vo"))), { ok: false });
    assert.equal(actionKeyBuilds, 0, `${action} must return before creating a new action key`);
    assert.equal(promptOpens, 1);
    assert.equal(saves, 1);
    assert.equal(traces.at(-1)?.type, "turn.rejected_recovery_pending");
    assert.equal(state.harness.activeTurn.turnId, "turn-1");
    assert.equal(state.harness.activeTurn.status, "recovery_required");
    assert.equal(JSON.stringify({
      day: state.day,
      round: state.round,
      stamina: state.stamina,
      stress: state.stress,
      trust: state.trust,
      Vo: state.Vo,
      Da: state.Da,
      Vi: state.Vi,
      pendingActionContext: state.pendingActionContext,
      log: state.log
    }), businessBefore);
  }
});

test("abandoned recovery no longer blocks the next ordinary action", () => {
  const state = {
    day: 4,
    round: 2,
    stamina: 68,
    stress: 11,
    trust: 35,
    Vo: 100,
    Da: 110,
    Vi: 120,
    sp: { Vo: false, Da: true, Vi: false },
    harness: { persistenceRevision: 9, activeTurn: ordinaryTurn({ status: "abandoned" }) }
  };
  const sandbox = {
    state,
    runtimeSessionEpoch: "session-new",
    activeHostSaveScope: "scope-a",
    activeStorageKey: "hatsuProduceLocalState:scope-a",
    buildHarnessActionKey: () => "produce:4:2:rest:-",
    getHarnessRecoveryContext: () => hostContext(),
    isHarnessTurnInActiveScope: () => true,
    isHarnessOrdinaryAction: (value) => ["lesson", "training", "rest"].includes(value),
    isHarnessTurnBlocking: () => false,
    createHarnessId: () => "turn-new",
    buildHarnessPreTurnSnapshot: () => ({ day: 4, round: 2 }),
    recordHarnessTrace: () => {},
    debugHarnessEvent: () => {},
    showToast: () => {}
  };
  vm.runInNewContext([
    readFunction(appSource, "beginHarnessProduceAction"),
    "this.beginHarnessProduceAction = beginHarnessProduceAction;"
  ].join("\n"), sandbox);
  assert.deepEqual(JSON.parse(JSON.stringify(sandbox.beginHarnessProduceAction("rest", null))), {
    ok: true,
    turnId: "turn-new"
  });
  assert.equal(state.harness.activeTurn.status, "prepared");
});

test("explicit abandon requires confirmation and changes only harness recovery fields", () => {
  const initialTurn = ordinaryTurn({
    status: "recovery_required",
    generationPrompt: "frozen prompt",
    generationPromptLength: 13,
    generationPromptStatus: "captured",
    requestIds: ["request-old"]
  });
  const state = {
    day: 5,
    round: 3,
    stamina: 57,
    stress: 18,
    trust: 40,
    Vo: 140,
    Da: 150,
    Vi: 160,
    sp: { Vo: true, Da: false, Vi: false },
    log: [{ action: "training", result: "saved" }],
    lastStory: "existing story",
    harness: { activeTurn: initialTurn }
  };
  const businessBefore = JSON.stringify({ ...state, harness: undefined });
  let confirmed = false;
  let saves = 0;
  let closes = 0;
  const traces = [];
  const sandbox = {
    state,
    Date: { now: () => 424242 },
    getHarnessRecoveryContext: () => hostContext(),
    isHarnessTurnInActiveScope: () => true,
    isHarnessOrdinaryAction: (value) => ["lesson", "training", "rest"].includes(value),
    window: { confirm: () => confirmed },
    recordHarnessTrace: (type, detail) => traces.push({ type, detail }),
    saveState: () => { saves += 1; },
    render: () => {},
    closeHarnessRecoveryOverlay: () => { closes += 1; },
    showToast: () => {}
  };
  vm.runInNewContext([
    readFunction(appSource, "abandonHarnessNarrativeRecovery"),
    "this.abandonHarnessNarrativeRecovery = abandonHarnessNarrativeRecovery;"
  ].join("\n"), sandbox);

  assert.equal(sandbox.abandonHarnessNarrativeRecovery(), false);
  assert.equal(state.harness.activeTurn.status, "recovery_required");
  assert.equal(saves, 0);
  assert.equal(closes, 0);

  confirmed = true;
  assert.equal(sandbox.abandonHarnessNarrativeRecovery(), true);
  assert.equal(state.harness.activeTurn.status, "abandoned");
  assert.equal(state.harness.activeTurn.abandonedAt, 424242);
  assert.equal(state.harness.activeTurn.turnId, "turn-1");
  assert.equal(state.harness.activeTurn.generationPrompt, "frozen prompt");
  assert.deepEqual(Array.from(state.harness.activeTurn.requestIds), ["request-old"]);
  assert.equal(traces.at(-1)?.type, "turn.abandoned");
  assert.equal(saves, 1);
  assert.equal(closes, 1);
  assert.equal(JSON.stringify({ ...state, harness: undefined }), businessBefore);
});

test("only the dedicated abandon control can abandon recovery", () => {
  assert.doesNotMatch(indexSource, /id="harnessRecoveryAbandonBtn"[^>]*disabled/);
  assert.match(appSource, /harnessRecoveryAbandonBtn"\)\?\.addEventListener\("click", abandonHarnessNarrativeRecovery\)/);
  assert.match(readFunction(appSource, "abandonHarnessNarrativeRecovery"), /window\.confirm\(/);
  assert.doesNotMatch(readFunction(appSource, "closeHarnessRecoveryOverlay"), /abandonHarnessNarrativeRecovery|abandoned|state\./);
  assert.doesNotMatch(readFunction(appSource, "closeEventOverlay"), /abandonHarnessNarrativeRecovery|abandoned|recovery_required/);
});

test("recovery guard remains scoped to ordinary action entry only", () => {
  const settlement = readSection("function settleAction(", "function createRequestId(");
  assert.equal((appSource.match(/beginHarnessProduceAction\(/g) || []).length, 2);
  assert.match(settlement, /if \(isHarnessOrdinaryAction\(action\)\)[\s\S]*const turnStart = beginHarnessProduceAction/);
  assert.ok(settlement.indexOf("tryAcquirePrimaryModelChannel(") < settlement.indexOf("state.pendingActionContext = {"));
  for (const sideEntry of ["submitPhoneChatMessage", "requestBroadcastFullScript", "confirmMapLocationEntry", "openSideQuestFromTaskPanel"]) {
    assert.doesNotMatch(readFunction(appSource, sideEntry), /beginHarnessProduceAction|turn\.rejected_recovery_pending/);
  }
});

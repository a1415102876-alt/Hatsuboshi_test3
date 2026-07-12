import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

const appSource = readFileSync(new URL("../app.js", import.meta.url), "utf8");
const normalize = (value) => JSON.parse(JSON.stringify(value));

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

function readSection(startMarker, endMarker) {
  const start = appSource.indexOf(startMarker);
  const end = appSource.indexOf(endMarker, start);
  assert.notEqual(start, -1, `${startMarker} must exist`);
  assert.notEqual(end, -1, `${endMarker} must follow ${startMarker}`);
  return appSource.slice(start, end);
}

test("harness state migrates old saves without copying full state", () => {
  const normalizeHarnessState = vm.runInNewContext(`(${readFunction(appSource, "normalizeHarnessState")})`);
  const normalized = normalize(normalizeHarnessState(null, "session-new"));
  assert.deepEqual(normalized, {
    schemaVersion: 1,
    persistenceRevision: 0,
    hostSaveSequence: 0,
    sessionEpoch: "session-new",
    activeTurn: null,
    trace: []
  });
});

test("harness state sanitizes invalid legacy fields and caps trace history", () => {
  const normalizeHarnessState = vm.runInNewContext(`(${readFunction(appSource, "normalizeHarnessState")})`);
  const trace = Array.from({ length: 45 }, (_, index) => ({ type: `event-${index}` }));
  const normalized = normalize(normalizeHarnessState({
    persistenceRevision: -4,
    hostSaveSequence: -9,
    sessionEpoch: "old-session",
    activeTurn: [],
    trace,
    copiedState: { shouldNotSurvive: true }
  }, "current-session"));
  assert.equal(normalized.persistenceRevision, 0);
  assert.equal(normalized.hostSaveSequence, 0);
  assert.equal(normalized.sessionEpoch, "current-session");
  assert.equal(normalized.activeTurn, null);
  assert.equal(normalized.trace.length, 40);
  assert.equal(normalized.copiedState, undefined);
  assert.deepEqual(normalize(normalizeHarnessState([], "array-session")), {
    schemaVersion: 1,
    persistenceRevision: 0,
    hostSaveSequence: 0,
    sessionEpoch: "array-session",
    activeTurn: null,
    trace: []
  });
});

test("persistent harness trace is allowlisted, scalar-only, and capped", () => {
  const normalizeHarnessState = vm.runInNewContext(`(${readFunction(appSource, "normalizeHarnessState")})`);
  const sanitizeHarnessDetail = vm.runInNewContext(`(${readFunction(appSource, "sanitizeHarnessDetail")})`);
  const state = {
    harness: {
      schemaVersion: 1,
      persistenceRevision: 7,
      sessionEpoch: "session-1",
      activeTurn: { turnId: "turn-1", requestId: "request-1", saveScope: "turn-scope" },
      trace: Array.from({ length: 40 }, (_, index) => ({ type: `old-${index}` }))
    }
  };
  const sandbox = {
    state,
    runtimeSessionEpoch: "session-1",
    activeHostSaveScope: "active-scope",
    normalizeHarnessState,
    sanitizeHarnessDetail,
    HARNESS_PERSISTED_TRACE_TYPES: new Set([
      "turn.prepared",
      "turn.settled",
      "turn.generating",
      "turn.completed",
      "turn.completed_without_narrative",
      "turn.failed",
      "turn.rejected_duplicate",
      "reply.rejected_stale"
    ])
  };
  const recordHarnessTrace = vm.runInNewContext(`(${readFunction(appSource, "recordHarnessTrace")})`, sandbox);

  assert.equal(recordHarnessTrace("state.save", { reason: "test" }), false);
  assert.equal(recordHarnessTrace("turn.prepared", {
    count: 3,
    accepted: true,
    note: null,
    promptLength: 123,
    textLength: 456,
    prompt: "secret prompt",
    text: "secret narrative",
    apiKey: "secret key",
    nested: { ignored: true }
  }), true);
  assert.equal(state.harness.trace.length, 40);
  assert.equal(state.harness.trace[0].type, "turn.prepared");
  assert.deepEqual(normalize(state.harness.trace[0].detail), {
    count: 3,
    accepted: true,
    note: null,
    promptLength: 123,
    textLength: 456
  });
  assert.equal(state.harness.trace.some((entry) => entry.type === "state.save"), false);
});

test("saveState increments persistence revision before persistence and only debugs routine saves", () => {
  const saveStateSource = readFunction(appSource, "saveState");
  const normalizeIndex = saveStateSource.indexOf("normalizeHarnessState(");
  const incrementIndex = saveStateSource.indexOf("persistenceRevision += 1");
  const debugIndex = saveStateSource.indexOf('debugHarnessEvent("state.save"');
  const localStorageIndex = saveStateSource.indexOf("localStorage.setItem(");
  const hostMirrorIndex = saveStateSource.indexOf("requestHostStateSave(");
  assert.ok(normalizeIndex >= 0 && normalizeIndex < incrementIndex);
  assert.ok(incrementIndex < debugIndex && debugIndex < localStorageIndex);
  assert.ok(localStorageIndex < hostMirrorIndex);
  assert.doesNotMatch(saveStateSource, /recordHarnessTrace\(/);
});

test("host save sequence advances only for an eligible host mirror", () => {
  const saveStateSource = readFunction(appSource, "saveState");
  const eligibilityIndex = saveStateSource.indexOf("willMirrorToHost");
  const sequenceIndex = saveStateSource.indexOf("hostSaveSequence += 1");
  const localStorageIndex = saveStateSource.indexOf("localStorage.setItem(");
  const hostRequestIndex = saveStateSource.indexOf("requestHostStateSave(state.harness.hostSaveSequence)");

  assert.ok(eligibilityIndex >= 0 && eligibilityIndex < sequenceIndex);
  assert.ok(sequenceIndex < localStorageIndex && localStorageIndex < hostRequestIndex);
  assert.match(saveStateSource, /persistenceRevision \+= 1/);
  assert.doesNotMatch(saveStateSource, /persistenceRevision[^\n]*hostSave/);

  const hostSaveSource = readFunction(appSource, "requestHostStateSave");
  assert.match(hostSaveSource, /hostSaveSequence/);
  assert.match(hostSaveSource, /type:\s*"saveState"[\s\S]*hostSaveSequence/);
});
test("director digest candidates obey stale partial retry and accepted-final ACK gates", () => {
  const shouldPrepare = vm.runInNewContext(`(${readFunction(appSource, "shouldPrepareDirectorDigestCandidate")})`);
  const decideAck = vm.runInNewContext(`(${readFunction(appSource, "decideDirectorDigestAck")})`);
  assert.equal(shouldPrepare(false), false);
  assert.equal(shouldPrepare(true), true);
  assert.equal(decideAck(true, false, false), "retain");
  assert.equal(decideAck(false, true, true), "discard");
  assert.equal(decideAck(false, false, true), "discard");
  assert.equal(decideAck(true, false, true), "commit");
});

test("accepted-final director digest commits at most once without starting secondary generation", () => {
  const candidates = new Map([["request-1", { id: "digest-1" }]]);
  const committed = [];
  const sandbox = {
    pendingDirectorDigestCandidates: candidates,
    decideDirectorDigestAck: vm.runInNewContext(`(${readFunction(appSource, "decideDirectorDigestAck")})`),
    commitPendingDirectorDigestCandidate(requestId) {
      const candidate = candidates.get(requestId);
      if (!candidate) return false;
      candidates.delete(requestId);
      committed.push(candidate);
      return true;
    },
    discardPendingDirectorDigestCandidate(requestId) {
      return candidates.delete(requestId);
    }
  };
  const settle = vm.runInNewContext(`(${readFunction(appSource, "settlePendingDirectorDigestCandidate")})`, sandbox);
  assert.equal(settle("request-1", true, false, false), false);
  assert.equal(candidates.has("request-1"), true);
  assert.equal(settle("request-1", true, false, true), true);
  assert.equal(settle("request-1", true, false, true), false);
  assert.equal(committed.length, 1);
  assert.doesNotMatch(readFunction(appSource, "settlePendingDirectorDigestCandidate"), /sendSecondaryPrompt|requestHostSecondary/);
});

test("director digest candidate is prepared only after the current reply gate", () => {
  const applySource = readSection("function applyAiReply(", "function sendAiReplyAck(");
  const staleReturn = applySource.indexOf("if (!acceptedRequest)");
  const prepare = applySource.indexOf("preparePendingDirectorDigestCandidate(");
  assert.ok(staleReturn >= 0 && prepare > staleReturn);
});
test("phase zero observations log metadata without persisting routine events", () => {
  const hostSaveSource = readFunction(appSource, "requestHostStateSave");
  const promptSendSource = readSection("function requestHostPromptSend(", "function applyHostCharacter(");
  const replySource = readSection("function applyAiReply(", "function sendAiReplyAck(");
  const chronicleSource = readFunction(appSource, "requestChronicleUpdate");
  assert.match(hostSaveSource, /debugHarnessEvent\("host-save\.request"/);
  assert.match(hostSaveSource, /persistenceRevision/);
  assert.match(promptSendSource, /debugHarnessEvent\("prompt\.send"/);
  assert.match(promptSendSource, /promptLength/);
  assert.match(promptSendSource, /turnId/);
  assert.match(replySource, /debugHarnessEvent\("reply\.received"/);
  assert.match(replySource, /debugHarnessEvent\("reply\.accepted"/);
  assert.match(replySource, /recordHarnessTrace\("reply\.rejected_stale"/);
  assert.match(chronicleSource, /debugHarnessEvent\("chronicle\.request"/);
  assert.match(chronicleSource, /sumLength/);
  assert.doesNotMatch(appSource, /recordHarnessTrace\("(?:state\.save|prompt\.send|chronicle\.request)"/);
});

test("current-session ordinary turn is a global single-flight lock", () => {
  const isHarnessTurnBlocking = vm.runInNewContext(`(${readFunction(appSource, "isHarnessTurnBlocking")})`);
  assert.equal(isHarnessTurnBlocking({ status: "prepared", sessionEpoch: "s1", actionKey: "rest" }, "s1"), true);
  assert.equal(isHarnessTurnBlocking({ status: "generating", sessionEpoch: "s1", actionKey: "lesson" }, "s1"), true);
  assert.equal(isHarnessTurnBlocking({ status: "settled", sessionEpoch: "s1", actionKey: "rest" }, "s1"), true);
  assert.equal(isHarnessTurnBlocking({ status: "generating", sessionEpoch: "old" }, "s1"), false);
  assert.equal(isHarnessTurnBlocking({ status: "completed", sessionEpoch: "s1" }, "s1"), false);
  assert.equal(isHarnessTurnBlocking({ status: "completed_without_narrative", sessionEpoch: "s1" }, "s1"), false);
  assert.equal(isHarnessTurnBlocking({ status: "failed", sessionEpoch: "s1" }, "s1"), false);
});

test("ordinary action classification excludes side flows", () => {
  const isHarnessOrdinaryAction = vm.runInNewContext(`(${readFunction(appSource, "isHarnessOrdinaryAction")})`);
  assert.equal(isHarnessOrdinaryAction("lesson"), true);
  assert.equal(isHarnessOrdinaryAction("training"), true);
  assert.equal(isHarnessOrdinaryAction("rest"), true);
  assert.equal(isHarnessOrdinaryAction("outing"), false);
  assert.equal(isHarnessOrdinaryAction("companion"), false);
  assert.equal(isHarnessOrdinaryAction("phonechat"), false);
  assert.equal(isHarnessOrdinaryAction("broadcast"), false);
});

test("beginning a different ordinary action is still rejected by the global lock", () => {
  const isHarnessTurnBlocking = vm.runInNewContext(`(${readFunction(appSource, "isHarnessTurnBlocking")})`);
  const state = {
    day: 4,
    round: 2,
    stamina: 72,
    stress: 8,
    trust: 25,
    Vo: 300,
    Da: 320,
    Vi: 340,
    sp: { Vo: true, Da: false, Vi: false },
    harness: {
      persistenceRevision: 9,
      activeTurn: {
        turnId: "turn-lesson",
        status: "generating",
        actionKey: "produce:4:2:lesson:Vo",
        sessionEpoch: "session-1"
      }
    }
  };
  const trace = [];
  const toasts = [];
  const sandbox = {
    state,
    runtimeSessionEpoch: "session-1",
    activeHostSaveScope: "scope-1",
    activeStorageKey: "hatsuProduceLocalState:scope-1",
    isHarnessTurnBlocking,
    isHybridFacilityActive: () => false,
    createHarnessId: () => "turn-new",
    recordHarnessTrace: (type, detail) => trace.push({ type, detail }),
    debugHarnessEvent() {},
    showToast: (...args) => toasts.push(args)
  };
  vm.runInNewContext([
    readFunction(appSource, "buildHarnessActionKey"),
    readFunction(appSource, "buildHarnessPreTurnSnapshot"),
    readFunction(appSource, "beginHarnessProduceAction"),
    "this.beginHarnessProduceAction = beginHarnessProduceAction;"
  ].join("\n"), sandbox);

  assert.deepEqual(normalize(sandbox.beginHarnessProduceAction("training", "Da")), { ok: false });
  assert.equal(state.harness.activeTurn.turnId, "turn-lesson");
  assert.equal(trace[0].type, "turn.rejected_duplicate");
  assert.equal(toasts.length, 1);

  state.harness.activeTurn.status = "completed";
  assert.deepEqual(normalize(sandbox.beginHarnessProduceAction("rest", null)), {
    ok: true,
    turnId: "turn-new"
  });
  assert.equal(state.harness.activeTurn.status, "prepared");
  assert.equal(state.harness.activeTurn.actionKey, "produce:4:2:rest:-");
  assert.equal(state.harness.activeTurn.snapshot.day, 4);
  assert.equal(state.harness.activeTurn.snapshot.stamina, 72);
  assert.equal(state.harness.activeTurn.snapshot.sp.Vo, true);
  assert.equal(state.harness.activeTurn.snapshot.log, undefined);
});

test("settleAction guards ordinary actions before deterministic state writes", () => {
  const settlement = readSection("function settleAction(", "function createRequestId(");
  const guardIndex = settlement.indexOf("beginHarnessProduceAction(action, attribute)");
  const pendingContextIndex = settlement.indexOf("state.pendingActionContext = {");
  const deltaWriteIndex = settlement.indexOf("Object.entries(delta).forEach");
  assert.match(settlement, /if \(isHarnessOrdinaryAction\(action\)\)/);
  assert.ok(guardIndex >= 0 && guardIndex < pendingContextIndex);
  assert.ok(guardIndex < deltaWriteIndex);
  assert.equal((appSource.match(/beginHarnessProduceAction\(/g) || []).length, 2);
});

test("ordinary settlement records settled and generating around existing saves", () => {
  const settlement = readSection("function settleAction(", "function createRequestId(");
  const ordinaryStart = settlement.indexOf("const delta = {};");
  const ordinary = settlement.slice(ordinaryStart);
  const settledIndex = ordinary.indexOf('markHarnessProduceTurn("settled"');
  const firstSaveIndex = ordinary.indexOf("saveState();");
  const pendingIndex = ordinary.indexOf("pendingAiRequestId = requestId;");
  const generatingIndex = ordinary.indexOf('markHarnessProduceTurn("generating"');
  assert.ok(settledIndex >= 0 && settledIndex < firstSaveIndex);
  assert.match(ordinary, /settledPersistenceRevision:\s*state\.harness\.persistenceRevision \+ 1/);
  assert.ok(firstSaveIndex < pendingIndex && pendingIndex < generatingIndex);
  assert.ok(generatingIndex < ordinary.indexOf("openEventOverlay(", generatingIndex));
});

test("ordinary action terminal states cover skip, success, and exhausted retry failure", () => {
  const finalize = readFunction(appSource, "finalizeProduceActionWithoutAi");
  const apply = readSection("function applyAiReply(", "function sendAiReplyAck(");
  const skippedIndex = finalize.indexOf('markHarnessProduceTurn("completed_without_narrative"');
  assert.ok(skippedIndex >= 0 && skippedIndex < finalize.indexOf("saveState();"));
  assert.match(apply, /markHarnessProduceTurn\("failed",\s*\{\},\s*requestId\)/);
  assert.match(apply, /markHarnessProduceTurn\("completed",\s*\{\},\s*requestId\)/);
  assert.match(readFunction(appSource, "markHarnessProduceTurn"), /turn\.requestId !== expectedRequestId/);
});

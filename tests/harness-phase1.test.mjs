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
    sessionEpoch: "old-session",
    activeTurn: [],
    trace,
    copiedState: { shouldNotSurvive: true }
  }, "current-session"));
  assert.equal(normalized.persistenceRevision, 0);
  assert.equal(normalized.sessionEpoch, "current-session");
  assert.equal(normalized.activeTurn, null);
  assert.equal(normalized.trace.length, 40);
  assert.equal(normalized.copiedState, undefined);
  assert.deepEqual(normalize(normalizeHarnessState([], "array-session")), {
    schemaVersion: 1,
    persistenceRevision: 0,
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
  assert.equal(isHarnessTurnBlocking({ status: "generating", sessionEpoch: "s1", actionKey: "lesson" }, "s1"), true);
  assert.equal(isHarnessTurnBlocking({ status: "settled", sessionEpoch: "s1", actionKey: "rest" }, "s1"), true);
  assert.equal(isHarnessTurnBlocking({ status: "generating", sessionEpoch: "old" }, "s1"), false);
  assert.equal(isHarnessTurnBlocking({ status: "completed", sessionEpoch: "s1" }, "s1"), false);
});

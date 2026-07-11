import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

const frontendSource = readFileSync(new URL("../app.js", import.meta.url), "utf8");
const bridgeSource = readFileSync(new URL("../st.html", import.meta.url), "utf8");
const normalize = (value) => JSON.parse(JSON.stringify(value));

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

test("remote chat metadata wins over a browser-local save", () => {
  const resolveHostState = vm.runInNewContext(`(${readFunction(frontendSource, "resolveHostState")})`);
  const local = { idol: "藤田琴音", day: 9 };
  const remote = { idol: "月村手毬", day: 4 };
  assert.deepEqual(normalize(resolveHostState(remote, local)), { source: "remote", state: remote, shouldMigrate: false });
});

test("only a meaningful local save migrates into empty chat metadata", () => {
  const resolveHostState = vm.runInNewContext(`(${readFunction(frontendSource, "resolveHostState")})`);
  const local = { idol: "藤田琴音", day: 9 };
  assert.deepEqual(normalize(resolveHostState(null, local)), { source: "local", state: local, shouldMigrate: true });
  assert.deepEqual(normalize(resolveHostState(null, { idol: null, day: 1 })), { source: "empty", state: null, shouldMigrate: false });
});

test("host accepts saves only for the current chat scope", () => {
  const sandbox = {};
  vm.runInNewContext([
    readFunction(bridgeSource, "decideHostStateSave"),
    readFunction(bridgeSource, "shouldAcceptHostSave"),
    "this.shouldAcceptHostSave = shouldAcceptHostSave;"
  ].join("\n"), sandbox);
  const shouldAcceptHostSave = sandbox.shouldAcceptHostSave;
  assert.equal(shouldAcceptHostSave("char-1-chat-a", "char-1-chat-a", { idol: "藤田琴音" }), true);
  assert.equal(shouldAcceptHostSave("char-1-chat-a", "char-1-chat-b", { idol: "藤田琴音" }), false);
  assert.equal(shouldAcceptHostSave("", "", { idol: "藤田琴音" }), false);
  assert.equal(shouldAcceptHostSave("", "char-1-chat-a", { day: 1 }), false);
  assert.equal(shouldAcceptHostSave("char-1-chat-a", "", { day: 1 }), false);
  assert.equal(shouldAcceptHostSave("char-1-chat-a", "char-1-chat-a", null), false);
  assert.equal(shouldAcceptHostSave("char-1-chat-a", "char-1-chat-a", []), false);
});

test("host message handler validates current scope before saving chat metadata", () => {
  const start = bridgeSource.indexOf("const messageHandler = async (event) =>");
  const end = bridgeSource.indexOf("window.addEventListener('message', messageHandler)", start);
  assert.notEqual(start, -1, "messageHandler must exist");
  assert.notEqual(end, -1, "messageHandler registration must follow its declaration");
  const handler = bridgeSource.slice(start, end);
  const currentScopeIndex = handler.indexOf("getCurrentContextInfo().saveScope");
  const guardIndex = handler.indexOf("decideHostStateSave(");
  const saveIndex = handler.indexOf("saveChatState(data.state, incomingScope, decision.normalizedSequence)");
  assert.ok(currentScopeIndex >= 0 && currentScopeIndex < guardIndex);
  assert.ok(guardIndex < saveIndex);
  assert.match(handler, /rejected stale or invalid state save/);
});
test("host save ordering accepts only a strictly newer sequence in the same scope", () => {
  const decideHostStateSave = vm.runInNewContext(`(${readFunction(bridgeSource, "decideHostStateSave")})`);
  const base = {
    incomingScope: "char-1-chat-a",
    currentScope: "char-1-chat-a",
    nextState: { idol: "藤田琴音" },
    lastAcceptedSequence: 7,
    hasVersionedHistory: true
  };

  assert.deepEqual(normalize(decideHostStateSave({ ...base, incomingSequence: 8 })), {
    accepted: true,
    reason: "accepted",
    normalizedSequence: 8
  });
  assert.equal(decideHostStateSave({ ...base, incomingSequence: 7 }).reason, "duplicate_sequence");
  assert.equal(decideHostStateSave({ ...base, incomingSequence: 6 }).reason, "stale_sequence");
  assert.equal(decideHostStateSave({ ...base, incomingScope: "char-1-chat-b", incomingSequence: 99 }).reason, "scope_mismatch");
});

test("legacy host saves are accepted only before versioned history exists", () => {
  const decideHostStateSave = vm.runInNewContext(`(${readFunction(bridgeSource, "decideHostStateSave")})`);
  const base = {
    incomingScope: "char-1-chat-a",
    currentScope: "char-1-chat-a",
    nextState: { day: 3 },
    incomingSequence: 0,
    lastAcceptedSequence: 0
  };

  assert.equal(decideHostStateSave({ ...base, hasVersionedHistory: false }).reason, "legacy_accepted");
  assert.equal(decideHostStateSave({ ...base, hasVersionedHistory: true }).reason, "legacy_after_versioned");
});

test("chat metadata envelope v2 stores scope and accepted host sequence", () => {
  const saveChatStateSource = readFunction(bridgeSource, "saveChatState");
  assert.match(saveChatStateSource, /version:\s*2/);
  assert.match(saveChatStateSource, /saveScope/);
  assert.match(saveChatStateSource, /hostSaveSequence/);

  const handlerStart = bridgeSource.indexOf("const messageHandler = async (event) =>");
  const handlerEnd = bridgeSource.indexOf("window.addEventListener('message', messageHandler)", handlerStart);
  const handler = bridgeSource.slice(handlerStart, handlerEnd);
  const decisionIndex = handler.indexOf("decideHostStateSave(");
  const rememberIndex = handler.indexOf("lastAcceptedHostSaveSequenceByScope.set(");
  const saveIndex = handler.indexOf("saveChatState(");
  assert.ok(decisionIndex >= 0 && decisionIndex < rememberIndex && rememberIndex < saveIndex);
  assert.match(handler, /data\.hostSaveSequence\s*\?\?\s*data\.state\?\.harness\?\.hostSaveSequence/);
});

test("version one metadata remains readable after envelope v2 upgrade", () => {
  const getSavedChatStateSource = readFunction(bridgeSource, "getSavedChatState");
  assert.match(getSavedChatStateSource, /return envelope\.state/);
  assert.doesNotMatch(getSavedChatStateSource, /version\s*!==\s*2/);
});

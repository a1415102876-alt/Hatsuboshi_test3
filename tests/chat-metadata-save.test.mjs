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
  const shouldAcceptHostSave = vm.runInNewContext(`(${readFunction(bridgeSource, "shouldAcceptHostSave")})`);
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
  const guardIndex = handler.indexOf("shouldAcceptHostSave(");
  const saveIndex = handler.indexOf("saveChatState(data.state)");
  assert.ok(currentScopeIndex >= 0 && currentScopeIndex < guardIndex);
  assert.ok(guardIndex < saveIndex);
  assert.match(handler, /rejected stale or invalid state save/);
});

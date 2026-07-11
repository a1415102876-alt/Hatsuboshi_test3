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

test("current-session ordinary turn is a global single-flight lock", () => {
  const isHarnessTurnBlocking = vm.runInNewContext(`(${readFunction(appSource, "isHarnessTurnBlocking")})`);
  assert.equal(isHarnessTurnBlocking({ status: "generating", sessionEpoch: "s1", actionKey: "lesson" }, "s1"), true);
  assert.equal(isHarnessTurnBlocking({ status: "settled", sessionEpoch: "s1", actionKey: "rest" }, "s1"), true);
  assert.equal(isHarnessTurnBlocking({ status: "generating", sessionEpoch: "old" }, "s1"), false);
  assert.equal(isHarnessTurnBlocking({ status: "completed", sessionEpoch: "s1" }, "s1"), false);
});

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

const source = readFileSync(new URL("../app.js", import.meta.url), "utf8");

function readFunction(functionName) {
  const start = source.indexOf(`function ${functionName}`);
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

test("opening can be confirmed before its AI reply arrives", () => {
  const context = {
    state: {
      affinity: { openingComplete: false, viewed: [] },
      activeStoryNode: { type: "affinity", threshold: 0, ready: false }
    },
    pendingAiRequestId: "opening-request",
    markAffinityViewed: (threshold) => context.state.affinity.viewed.push(threshold)
  };
  vm.runInNewContext(`(${readFunction("skipPendingOpening")})()`, context);
  assert.equal(context.state.affinity.openingComplete, true);
  assert.deepEqual(context.state.affinity.viewed, [0]);
  assert.equal(context.state.activeStoryNode, null);
  assert.equal(context.pendingAiRequestId, "");
});

test("a skipped opening reply is ignored after its request is cleared", () => {
  const shouldAcceptAiReply = vm.runInNewContext(`(${readFunction("shouldAcceptAiReply")})`, {
    state: { pendingAiRequestId: "" }
  });
  assert.equal(shouldAcceptAiReply("opening-request", ""), false);
  assert.equal(shouldAcceptAiReply("current-request", "current-request"), true);
  assert.equal(shouldAcceptAiReply("old-request", "current-request"), false);
});

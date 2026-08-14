import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../app.js", import.meta.url), "utf8");

test("old mini-live saves recover generation through the API loader", () => {
  assert.match(source, /function requestNiaMiniLiveGenerationWithApiRecovery\(\)/);
  assert.match(source, /function loadNiaMiniLiveApi\(\)/);
  assert.match(source, /fetch\(moduleUrl, \{ cache: "no-store" \}\)/);
  assert.match(
    source,
    /runtime\.status === "selecting_venue"\) requestNiaMiniLiveGenerationWithApiRecovery\(\)/
  );
});

test("mini-live API recovery cannot duplicate a pending load", () => {
  assert.match(
    source,
    /if \(session\.apiLoadPending\) return true;/
  );
  assert.match(source, /\["selecting_venue", "retryable_failed"\]\.includes\(current\.runtime\?\.status\)/);
});

test("mini-live retry button uses API recovery instead of the silent request path", () => {
  assert.match(
    source,
    /getElementById\("niaMiniLiveRetryBtn"\)\?\.addEventListener\("click", requestNiaMiniLiveGenerationWithApiRecovery\)/
  );
});

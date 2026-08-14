import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const source = await readFile(new URL("../nia-tv-business-core.js", import.meta.url), "utf8");
const sandbox = { globalThis: {} };
vm.runInNewContext(source, sandbox);
const tv = sandbox.globalThis.HatsuNiaTvBusiness;

test("TV runtime follows the reusable four-stage contract", () => {
  let runtime = tv.createTvRuntime({ businessId: "tv-1", strategyId: "gap" });
  for (let index = 1; index <= 3; index += 1) {
    const started = tv.beginSegmentGeneration(runtime, index, { requestId: `req-${index}` });
    assert.equal(started.ok, true);
    runtime = tv.applySegmentPayload(started.runtime, { businessId: "tv-1", segmentIndex: index, lines: [{ text: `segment-${index}` }] }).runtime;
    runtime = tv.completeSegmentPlayback(runtime).runtime;
  }
  assert.equal(runtime.status, "awaiting_producer_instruction");
  runtime = tv.submitProducerInstruction(runtime, "顺势利用反差").runtime;
  const started = tv.beginSegmentGeneration(runtime, 4, { requestId: "req-4" });
  runtime = tv.completeSegmentPlayback(tv.applySegmentPayload(started.runtime, {
    businessId: "tv-1", segmentIndex: 4, lines: [{ text: "closing" }], bonusTier: "medium", highlight: "high", resultSummary: "done"
  }).runtime).runtime;
  const settled = tv.settleTvOnce(runtime, "tv-1");
  assert.equal(settled.ok, true);
  assert.equal(settled.result.fanGain, 4000);
  assert.equal(tv.settleTvOnce(settled.runtime, "tv-1").reason, "already_settled");
});

test("TV generation rejects skipped stages and can retry an interrupted request", () => {
  const runtime = tv.createTvRuntime({ businessId: "tv-2" });
  assert.equal(tv.beginSegmentGeneration(runtime, 2).reason, "illegal_status");
  const interrupted = tv.recoverInterruptedTv({ ...runtime, status: "generating_2", pendingSegmentIndex: 2 });
  assert.equal(interrupted.status, "retryable_failed");
  assert.equal(tv.beginSegmentGeneration(interrupted, 2).ok, true);
});

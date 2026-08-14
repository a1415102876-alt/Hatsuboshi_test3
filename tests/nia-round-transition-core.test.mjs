import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../nia-round-transition-core.js", import.meta.url), "utf8");
const sandbox = { globalThis: {} };
vm.runInNewContext(source, sandbox);
const core = sandbox.globalThis.HatsuNiaRoundTransition;

test("fixed second-round outing exposes only the four approved destinations", () => {
  assert.deepEqual(Array.from(core.DESTINATIONS), ["游乐园", "购物中心", "商店街", "水族馆"]);
});

test("outing selection and clock are persistent and capped at 22:00", () => {
  const ready = core.prepareInterRoundOuting({}, 100);
  const selecting = core.beginDestinationSelection(ready);
  const started = core.startInterRoundOuting(selecting, { destination: "水族馆", now: 100 });
  assert.equal(started.ok, true);
  assert.equal(started.runtime.status, "exploring");
  assert.equal(started.runtime.clockMinutes, 600);
  const advanced = core.advanceInterRoundClock(started.runtime, 1000);
  assert.equal(advanced.runtime.clockMinutes, 1320);
  assert.equal(advanced.hitDayEnd, true);
});

test("an active outing can switch destinations after returning to the route map", () => {
  const first = core.startInterRoundOuting(core.prepareInterRoundOuting({}), { destination: "游乐园" });
  const switched = core.startInterRoundOuting(first.runtime, { destination: "水族馆" });
  assert.equal(switched.ok, true);
  assert.equal(switched.runtime.status, "exploring");
  assert.equal(switched.runtime.destination, "水族馆");
  assert.equal(switched.runtime.clockMinutes, core.DAY_START_MINUTES);
});

test("completion settlement is idempotent", () => {
  const started = core.startInterRoundOuting(core.prepareInterRoundOuting({}), { destination: "游乐园" }).runtime;
  const completing = core.beginInterRoundCompletion(started, "request-1").runtime;
  const completed = core.completeInterRoundOuting(completing, { requestId: "request-1", summary: "玩了一整天。", now: 200 });
  assert.equal(completed.completed, true);
  assert.equal(completed.applySettlement, true);
  const duplicate = core.completeInterRoundOuting(completed.runtime, { requestId: "request-1", summary: "重复" });
  assert.equal(duplicate.completed, false);
  assert.equal(duplicate.applySettlement, false);
  assert.equal(duplicate.runtime.summary, "玩了一整天。");
});

test("sleep after the fixed outing enters round two draft without resetting accumulated training data", () => {
  const completedOuting = core.completeInterRoundOuting(
    core.beginInterRoundCompletion(
      core.startInterRoundOuting(core.prepareInterRoundOuting({}), { destination: "商店街" }).runtime,
      "request-2"
    ).runtime,
    { requestId: "request-2", summary: "完成" }
  ).runtime;
  const result = core.enterSecondRoundDraft({
    round: 1,
    phase: "inter_round_outing",
    plan: { days: [1, 2, 3, 4, 5] },
    planStatus: "committed",
    training: { active: true, fans: 12500, actionIndex: 5 },
    interRoundOuting: completedOuting
  });
  assert.equal(result.transitioned, true);
  assert.equal(result.nia.round, 2);
  assert.equal(result.nia.phase, "draft");
  assert.equal(result.nia.plan, null);
  assert.equal(result.nia.training.active, false);
  assert.equal(result.nia.training.actionIndex, 0);
  assert.equal(result.nia.training.fans, 12500);
  assert.equal(result.nia.producerWork.status, "idle");
  assert.equal(result.nia.producerWork.tasks.length, 0);
  assert.equal(result.nia.producerWork.periods.length, 0);
  assert.equal(core.getPlanDisplayDay(2, 0), 2);
  assert.equal(core.getPlanDisplayDay(2, 4), 6);
});

test("completed round-two outing enters round three with a fresh five-day draft", () => {
  const ready = core.prepareInterRoundOuting(
    { status: "completed", fromRound: 1, toRound: 2 },
    300,
    { fromRound: 2, toRound: 3 }
  );
  assert.equal(ready.status, "ready");
  assert.equal(ready.fromRound, 2);
  assert.equal(ready.toRound, 3);
  const started = core.startInterRoundOuting(ready, { destination: "水族馆" }).runtime;
  const completing = core.beginInterRoundCompletion(started, "request-r3").runtime;
  const outing = core.completeInterRoundOuting(completing, { requestId: "request-r3", summary: "第三轮外出完成" }).runtime;
  const result = core.enterNextRoundDraft({
    round: 2,
    phase: "inter_round_outing",
    plan: { id: "round-2-plan", days: [1, 2, 3, 4, 5] },
    planStatus: "committed",
    training: { active: true, fans: 32500, actionIndex: 5 },
    interRoundOuting: outing
  });
  assert.equal(result.transitioned, true);
  assert.equal(result.nia.round, 3);
  assert.equal(result.nia.phase, "draft");
  assert.equal(result.nia.plan, null);
  assert.equal(result.nia.training.fans, 32500);
  assert.equal(result.nia.training.actionIndex, 0);
  assert.equal(core.getPlanDisplayDay(3, 0), 2);
  assert.equal(core.getPlanDisplayDay(3, 4), 6);
});

test("sleep during round two cannot reopen planning or reset the active schedule", () => {
  const plan = { id: "round-2-plan", days: [
    { type: "companion_training" },
    { type: "producer_work" },
    { type: "lesson" },
    { type: "business" },
    { type: "audition" }
  ] };
  const training = { active: true, fans: 12500, actionIndex: 1, companionDay: null };
  const producerWork = { status: "idle", dayIndex: 1, tasks: [{ id: "task-1" }] };
  const nia = {
    round: 2,
    phase: "training",
    plan,
    planStatus: "committed",
    training,
    producerWork,
    interRoundOuting: { status: "completed", settlementApplied: true }
  };

  const result = core.enterSecondRoundDraft(nia);

  assert.equal(result.transitioned, false);
  assert.equal(result.nia, nia);
  assert.equal(result.nia.round, 2);
  assert.equal(result.nia.phase, "training");
  assert.equal(result.nia.plan, plan);
  assert.equal(result.nia.training, training);
  assert.equal(result.nia.training.actionIndex, 1);
  assert.equal(result.nia.producerWork, producerWork);
  assert.equal(result.nia.plan.days[result.nia.training.actionIndex].type, "producer_work");
});

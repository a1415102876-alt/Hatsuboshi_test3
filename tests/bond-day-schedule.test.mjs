import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";

const source = fs.readFileSync(new URL("../app.js", import.meta.url), "utf8");

function readFunction(name) {
  const start = source.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `${name} must exist`);
  const bodyStart = source.indexOf("{", start);
  let depth = 0;
  let quote = "";
  let escaped = false;

  for (let index = bodyStart; index < source.length; index += 1) {
    const char = source[index];
    if (quote) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === quote) quote = "";
      continue;
    }
    if (char === '"' || char === "'" || char === "`") quote = char;
    else if (char === "{") depth += 1;
    else if (char === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(start, index + 1);
    }
  }
  throw new Error(`Could not parse ${name}`);
}

function makeContext(overrides = {}) {
  const context = {
    state: {
      day: 1,
      round: 1,
      idol: "月村手毬",
      liveReady: false,
      firstLive: { completed: false, success: false, result: null },
      affinity: { openingComplete: true, unlocked: [], pending: [], viewed: [] },
      ...overrides
    },
    ensureStateShape() {},
    saveState() {},
    render() {},
    REQUIRED_BOND_THRESHOLDS: [20, 40, 60, 80],
    FINAL_LIVE_DAY: 22,
    BOND_80_DAY: 21,
    SUMMARY_ROUND: 5
  };
  vm.runInNewContext(
    [
      readFunction("isPendingRequiredBond80"),
      readFunction("pendingRequiredBondThreshold"),
      readFunction("isBondEventDay"),
      readFunction("markAffinityUnlocked"),
      readFunction("markAffinityViewed"),
      readFunction("advanceRound"),
      readFunction("advanceDay"),
      readFunction("isSummaryRound"),
      readFunction("completeBondEventDay")
    ].join("\n")
      + "\nthis.pendingRequiredBondThreshold = pendingRequiredBondThreshold;"
      + "\nthis.isBondEventDay = isBondEventDay;"
      + "\nthis.markAffinityUnlocked = markAffinityUnlocked;"
      + "\nthis.advanceRound = advanceRound;"
      + "\nthis.advanceDay = advanceDay;"
      + "\nthis.isSummaryRound = isSummaryRound;"
      + "\nthis.completeBondEventDay = completeBondEventDay;",
    context
  );
  return context;
}

test("First Live final day moves to day 22 after four required bond event days", () => {
  const context = makeContext({ day: 21, round: 4 });
  context.advanceRound();
  assert.equal(context.state.round, 5);
  assert.equal(context.state.day, 21);
  context.advanceDay();
  assert.equal(context.state.day, 22);
  assert.equal(context.state.liveReady, true);
});

test("pending 20 to 80 affinity nodes force the next day into a bond event day", () => {
  const context = makeContext({
    day: 6,
    round: 4,
    affinity: { openingComplete: true, unlocked: [20], pending: [20], viewed: [] }
  });

  context.advanceRound();
  assert.equal(context.state.round, 5);
  context.advanceDay();

  assert.equal(context.state.day, 7);
  assert.equal(context.isBondEventDay(), true);
  assert.equal(context.pendingRequiredBondThreshold(), 20);
});

test("affinity 80 bond defers until First Live eve even when unlocked earlier", () => {
  const context = makeContext({
    day: 11,
    affinity: {
      openingComplete: true,
      unlocked: [80],
      pending: [80],
      viewed: [],
      bondUnlockDay: { 80: 11 }
    }
  });

  assert.equal(context.pendingRequiredBondThreshold(), null);
  assert.equal(context.isBondEventDay(), false);

  context.state.day = 21;
  assert.equal(context.pendingRequiredBondThreshold(), 80);
  assert.equal(context.isBondEventDay(), true);
});

test("completing a non-80 bond on live eve keeps the schedule on day 21 for pending 80", () => {
  const context = makeContext({
    day: 21,
    affinity: {
      openingComplete: true,
      unlocked: [60, 80],
      pending: [60, 80],
      viewed: [],
      bondUnlockDay: { 60: 18, 80: 12 }
    }
  });

  assert.equal(context.pendingRequiredBondThreshold(), 60);
  context.completeBondEventDay(60);
  assert.equal(context.state.day, 21);
  assert.equal(context.state.liveReady, false);
  assert.equal(context.pendingRequiredBondThreshold(), 80);
});

test("completing affinity 80 on live eve unlocks First Live", () => {
  const context = makeContext({
    day: 21,
    affinity: { openingComplete: true, unlocked: [80], pending: [80], viewed: [] }
  });

  context.completeBondEventDay(80);

  assert.equal(context.state.day, 22);
  assert.equal(context.state.liveReady, true);
});

test("live eve summary keeps day 21 when affinity 80 is still pending", () => {
  const context = makeContext({
    day: 21,
    round: 5,
    affinity: { openingComplete: true, unlocked: [80], pending: [80], viewed: [], bondUnlockDay: { 80: 21 } }
  });

  context.advanceDay();

  assert.equal(context.state.day, 21);
  assert.equal(context.state.liveReady, false);
  assert.equal(context.isBondEventDay(), true);
});

test("newly unlocked bond nodes do not interrupt the same day", () => {
  const context = makeContext({ day: 6, round: 2 });

  context.markAffinityUnlocked(20);

  assert.equal(context.isBondEventDay(), false);
  context.advanceRound();
  assert.equal(context.state.day, 6);
  assert.equal(context.isBondEventDay(), false);
  context.advanceRound();
  assert.equal(context.state.day, 6);
  assert.equal(context.isBondEventDay(), false);
  context.advanceRound();
  assert.equal(context.state.day, 6);
  assert.equal(context.state.round, 5);
  context.advanceDay();
  assert.equal(context.state.day, 7);
  assert.equal(context.isBondEventDay(), true);
});

test("settlement refreshes affinity unlocks before advancing schedule", () => {
  const settlementStart = source.indexOf("function settleAction(");
  const requestIdStart = source.indexOf("function createRequestId(", settlementStart);
  assert.notEqual(settlementStart, -1, "settleAction must exist");
  assert.notEqual(requestIdStart, -1, "createRequestId must follow settleAction");
  const settlement = source.slice(settlementStart, requestIdStart);
  const choiceSettlement = readFunction("handleChoiceSelection");
  const fallbackSettlement = readFunction("fallbackChoiceSettlement");

  const assertRefreshBeforeAdvance = (body, label) => {
    const refreshIndex = body.indexOf("refreshAffinityUnlocks();");
    const advanceIndex = body.indexOf("advanceRound();");
    assert.notEqual(refreshIndex, -1, `${label} must refresh affinity unlocks`);
    assert.notEqual(advanceIndex, -1, `${label} must advance the schedule`);
    assert.ok(refreshIndex < advanceIndex, `${label} must record unlock day before changing day`);
  };

  assertRefreshBeforeAdvance(settlement, "normal settlement");
  assertRefreshBeforeAdvance(choiceSettlement, "choice settlement");
  assertRefreshBeforeAdvance(fallbackSettlement, "fallback settlement");
});

test("affinity 100 does not consume a schedule day", () => {
  const context = makeContext({
    affinity: { openingComplete: true, unlocked: [100], pending: [100], viewed: [] }
  });

  assert.equal(context.isBondEventDay(), false);
  assert.equal(context.pendingRequiredBondThreshold(), null);
});

test("triggerAffinityStory blocks manual affinity 80 before live eve", () => {
  assert.match(source, /threshold === 80 && state\.day < BOND_80_DAY/);
  assert.match(source, /First Live 前夜/);
});

test("post-live affinity 100 is exposed through the bond action button path", () => {
  const renderActionButtons = readFunction("renderActionButtons");
  const renderActionHighlights = readFunction("renderActionHighlights");
  const actionClickHandlerStart = source.indexOf('if (button.dataset.action === "bond")');
  assert.notEqual(actionClickHandlerStart, -1, "bond action click handler must exist");
  const actionClickHandler = source.slice(actionClickHandlerStart, actionClickHandlerStart + 260);

  assert.match(source, /function pendingFinalAffinityThreshold\(\)/);
  assert.match(source, /function pendingAffinityActionThreshold\(\)/);
  assert.match(renderActionButtons, /pendingAffinityActionThreshold\(\)/);
  assert.match(renderActionButtons, /好感度\$\{threshold\}羁绊/);
  assert.match(renderActionHighlights, /pendingAffinityActionThreshold\(\)/);
  assert.match(actionClickHandler, /pendingAffinityActionThreshold\(\)/);
});

test("completing a bond event day advances to the next regular day", () => {
  const context = makeContext({
    day: 9,
    round: 1,
    affinity: { openingComplete: true, unlocked: [40], pending: [40], viewed: [] }
  });

  context.completeBondEventDay(40);

  assert.deepEqual(context.state.affinity.pending, []);
  assert.deepEqual(context.state.affinity.viewed, [40]);
  assert.equal(context.state.day, 10);
  assert.equal(context.state.round, 1);
  assert.equal(context.state.liveReady, false);
});

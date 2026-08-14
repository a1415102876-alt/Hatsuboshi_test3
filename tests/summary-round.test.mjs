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
      idol: "藤田琴音",
      liveReady: false,
      firstLive: { completed: false, success: false, result: null },
      affinity: { openingComplete: true, unlocked: [], pending: [], viewed: [] },
      ...overrides
    },
    SUMMARY_ROUND: 5,
    FINAL_LIVE_DAY: 22,
    rollSpCandidatesCalls: 0,
    rollSpCandidates() {
      this.rollSpCandidatesCalls += 1;
    }
  };
  vm.runInNewContext(
    [
      readFunction("isSummaryRound"),
      readFunction("roundLabel"),
      readFunction("advanceRound"),
      readFunction("advanceDay")
    ].join("\n")
      + "\nthis.isSummaryRound = isSummaryRound;"
      + "\nthis.roundLabel = roundLabel;"
      + "\nthis.advanceRound = advanceRound;"
      + "\nthis.advanceDay = advanceDay;",
    context
  );
  return context;
}

test("advanceRound moves from extra round into summary round without changing day", () => {
  const context = makeContext({ day: 6, round: 4 });
  context.advanceRound();
  assert.equal(context.state.round, 5);
  assert.equal(context.state.day, 6);
  assert.equal(context.isSummaryRound(), true);
  assert.match(context.roundLabel(), /总结轮次/);
});

test("advanceDay only advances schedule from summary round", () => {
  const context = makeContext({ day: 6, round: 5 });
  assert.equal(context.advanceDay(), true);
  assert.equal(context.state.round, 1);
  assert.equal(context.state.day, 7);
});

test("day 21 summary round advances into First Live schedule", () => {
  const context = makeContext({ day: 21, round: 5, liveReady: false });
  assert.equal(context.advanceDay(), true);
  assert.equal(context.state.day, 22);
  assert.equal(context.state.round, 1);
  assert.equal(context.state.liveReady, true);
});

test("summary round UI and placeholder overlays are wired in the frontend", () => {
  const renderActionButtons = readFunction("renderActionButtons");
  const html = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
  assert.match(renderActionButtons, /isSummaryRound\(\)/);
  assert.match(renderActionButtons, /day_summary/);
  assert.match(renderActionButtons, /next_day/);
  assert.doesNotMatch(renderActionButtons, /createActionButton\("小手机"/);
  assert.match(html, /id="phoneLaunchBtn"/);
  assert.match(source, /function getIdolSchoolClass\(/);
  assert.match(source, /"藤田琴音": "1年1班"/);
  assert.match(source, /"筱泽广": "1年2班"/);
  assert.match(source, /"篠泽广": "筱泽广"/);
  assert.match(source, /"十王星南": "3年1班"/);
  assert.match(source, /"雨夜燕": "3年1班"/);
  assert.match(source, /function getDaySummaryDisplayLines\(/);
  assert.match(source, /function extractDailySummary\(/);

  assert.match(html, /id="daySummaryOverlay"/);
  assert.match(html, /id="daySummaryRadar"/);
  assert.match(html, /bg_logo\.png/);
  assert.match(html, /day-summary-back-btn/);
  assert.match(html, /id="phoneOverlay"/);
  assert.match(html, /class="line-app"/);
  assert.match(html, /1 次总结轮次/);
});

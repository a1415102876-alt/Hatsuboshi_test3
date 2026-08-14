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

function makeContext() {
  const context = {
    state: {
      day: 3,
      idol: "藤田琴音",
      trust: 20,
      stamina: 72,
      stress: 12,
      Vo: 900,
      Da: 860,
      Vi: 920,
      growth: { Vo: 8, Da: 29.5, Vi: 25.5 },
      threshold: { Vo: 1030, Da: 1510, Vi: 1580 },
      log: [
        { day: 3, action: "Vo训练", result: "Vo+28" },
        { day: 3, action: "外出", result: "信赖+10" }
      ],
      dailySummary: { day: 0, intro: "", status: "", producer: "", raw: "", complete: false }
    },
    idols: {
      "藤田琴音": { core: "现实收益、被选择的不安" }
    },
    cleanReplyText(value) {
      return String(value || "").trim();
    },
    getAffinityStageLine() {
      return "好感度阶段标签：AFF_KOTONE_20";
    }
  };

  vm.runInNewContext(
    [
      readFunction("extractTaggedSummarySection"),
      readFunction("extractDailySummary"),
      readFunction("buildTodayActionRecapForSummary"),
      readFunction("getDaySummaryDisplayLines")
    ].join("\n")
      + "\nthis.extractDailySummary = extractDailySummary;"
      + "\nthis.buildTodayActionRecapForSummary = buildTodayActionRecapForSummary;"
      + "\nthis.getDaySummaryDisplayLines = getDaySummaryDisplayLines;",
    context
  );
  return context;
}

test("extractDailySummary parses the three required sections", () => {
  const context = makeContext();
  const sample = `【初星正文开始】<story>收尾剧情</story>【初星正文结束】
【今日总结开始】
<summary_intro>藤田琴音是以现实收益为目标的担当偶像。</summary_intro>
<summary_status>今日体力与信赖稳定，Vo 仍低于审查基准。</summary_status>
<summary_producer>我接下来要先帮她建立自信，并安排更稳的训练节奏。</summary_producer>
【今日总结结束】`;

  const parsed = context.extractDailySummary(sample);
  assert.equal(parsed.complete, true);
  assert.match(parsed.intro, /现实收益/);
  assert.match(parsed.status, /审查基准/);
  assert.match(parsed.producer, /制作人|我接下来/);
});

test("getDaySummaryDisplayLines reads AI summary for the current day", () => {
  const context = makeContext();
  context.state.dailySummary = {
    day: 3,
    intro: "角色介绍段",
    status: "状态评估段",
    producer: "制作人视角段",
    raw: "",
    complete: true
  };

  const lines = context.getDaySummaryDisplayLines();
  assert.equal(lines.length, 3);
  assert.equal(lines[0], "角色介绍段");
  assert.equal(lines[1], "状态评估段");
  assert.equal(lines[2], "制作人视角段");
});

test("round 4 phase-2 prompt requests daily summary output", () => {
  assert.match(source, /function buildChoicePhase2Prompt[\s\S]*actionContext\.isDailyFinalAction/);
  assert.match(source, /【今日总结开始】/);
  assert.match(source, /summary_intro/);
  assert.match(source, /summary_status/);
  assert.match(source, /summary_producer/);
});

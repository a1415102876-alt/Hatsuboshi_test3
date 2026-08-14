import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

const source = readFileSync(new URL("../app.js", import.meta.url), "utf8");

function readFunction(functionName) {
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

function makeExtractionContext() {
  const context = {};
  vm.runInNewContext(
    [
      readFunction("stripAiThinkingBlocks"),
      readFunction("cleanReplyText"),
      readFunction("isJunkReply"),
      readFunction("isWeakRawFallbackText"),
      readFunction("isTagStripMetaFallback"),
      readFunction("isNarrativeFallbackText"),
      readFunction("extractReplyCandidate"),
      readFunction("extractReplyText"),
      readFunction("decodeAiReplySource"),
      readFunction("collectAiReplyCandidates"),
      readFunction("extractChoicePayload"),
      "this.stripAiThinkingBlocks = stripAiThinkingBlocks;",
      "this.cleanReplyText = cleanReplyText;",
      "this.extractReplyCandidate = extractReplyCandidate;",
      "this.extractReplyText = extractReplyText;",
      "this.collectAiReplyCandidates = collectAiReplyCandidates;",
      "this.extractChoicePayload = extractChoicePayload;"
    ].join("\n"),
    context
  );
  return context;
}

const OLD_MARKER = /昨天那组还记得吗/;
const NEW_MARKER = /琴音正在——/;
const NEW_COMPLETE_MARKER = /今天把节奏交给我/;
const OLD_PLAIN_MARKER = /这是没有分隔符的上一轮纯文本旁白很长很长为了触发最长兜底路径/;

const oldRoundDelimited = `【初星正文开始】
<narration>上一轮训练室里，琴音已经做完最后一组深蹲。</narration>
<dialogue char="藤田琴音">“制作人，昨天那组还记得吗？”</dialogue>
【初星正文结束】`;

const newRoundDelimited = `【初星正文开始】
<narration>本轮训练室刚开门，空调还带着一点冷意。</narration>
<dialogue char="藤田琴音">“制作人，今天把节奏交给我。”</dialogue>
【初星正文结束】`;

const newRawIncomplete = `好的，我来续写本次训练场景。
制作人推开训练室的门，琴音正在——`;

const newRawTruncatedHatsu = `【初星正文开始】
<narration>本轮训练室刚开门，琴音正在调整呼吸——`;

const oldRoundPlainLong = `这是没有分隔符的上一轮纯文本旁白很长很长为了触发最长兜底路径。琴音昨天已经练完整套动作，今天本来应该写新内容。`;

const oldMaintext = `<maintext>
<narration>上一轮 maintext 兼容格式的旧正文。</narration>
<dialogue char="藤田琴音">“制作人，这是旧 maintext。”</dialogue>
</maintext>`;

function pickText(rawText, renderedText) {
  const raw = String(rawText || "").trim();
  const rendered = String(renderedText || "").trim();
  return raw.length > rendered.length ? raw : rendered;
}

function classifyReply(reply, { previousMarker, currentMarker }) {
  const text = String(reply || "");
  if (!text.trim()) return "empty";
  const hasPrevious = previousMarker?.test(text);
  const hasCurrent = currentMarker?.test(text);
  if (hasPrevious && !hasCurrent) return "previous";
  if (hasCurrent && !hasPrevious) return "current";
  if (hasPrevious && hasCurrent) return "mixed";
  return "other";
}

function runExtractScenario(ctx, scenario) {
  const rawText = scenario.rawText ?? "";
  const renderedText = scenario.renderedText ?? "";
  const text = scenario.text ?? pickText(rawText, renderedText);
  const candidates = ctx.collectAiReplyCandidates(text, rawText, renderedText);
  const details = candidates.map((candidate) => ctx.extractReplyCandidate(candidate));
  const reply = ctx.extractReplyText(candidates);
  const verdict = classifyReply(reply, scenario);
  return { reply, verdict, methods: details.map((item) => item.method), candidateCount: candidates.filter(Boolean).length };
}

const extractScenarios = [
  {
    id: "A1",
    label: "基准：不完整 raw + 旧 rendered（已知复现）",
    rawText: newRawIncomplete,
    renderedText: oldRoundDelimited,
    previousMarker: OLD_MARKER,
    currentMarker: NEW_MARKER,
    likelyMisroute: true
  },
  {
    id: "A2",
    label: "对照：只有不完整 raw，无旧 rendered",
    rawText: newRawIncomplete,
    renderedText: "",
    previousMarker: OLD_MARKER,
    currentMarker: NEW_MARKER,
    likelyMisroute: false
  },
  {
    id: "B1",
    label: "空 raw，仅旧 rendered",
    rawText: "",
    renderedText: oldRoundDelimited,
    previousMarker: OLD_MARKER,
    currentMarker: NEW_MARKER,
    likelyMisroute: true
  },
  {
    id: "B2",
    label: "极短 raw（像截断提示）+ 旧 rendered",
    rawText: "生成中…",
    renderedText: oldRoundDelimited,
    previousMarker: OLD_MARKER,
    currentMarker: NEW_MARKER,
    likelyMisroute: true
  },
  {
    id: "C1",
    label: "本轮 raw 也有 hatsu 但未闭合 + 旧 rendered",
    rawText: newRawTruncatedHatsu,
    renderedText: oldRoundDelimited,
    previousMarker: OLD_MARKER,
    currentMarker: /调整呼吸/,
    likelyMisroute: false
  },
  {
    id: "C2",
    label: "本轮完整 hatsu raw + 旧 rendered（应优先本轮）",
    rawText: newRoundDelimited,
    renderedText: oldRoundDelimited,
    previousMarker: OLD_MARKER,
    currentMarker: NEW_COMPLETE_MARKER,
    likelyMisroute: false
  },
  {
    id: "D1",
    label: "仅 thinking 样例，无正文 + 旧 rendered",
    rawText: `<thinking>
样例：
【初星正文开始】
<narration>思考里的旧样例。</narration>
【初星正文结束】
</thinking>`,
    renderedText: oldRoundDelimited,
    previousMarker: OLD_MARKER,
    currentMarker: NEW_MARKER,
    likelyMisroute: true
  },
  {
    id: "D2",
    label: "redacted 思考 + 旧 rendered",
    rawText: (() => {
      const open = "redacted" + "_thinking";
      const close = "redacted" + "_reasoning";
      return `<${open}>推理中不应显示</${close}>\n`;
    })(),
    renderedText: oldRoundDelimited,
    previousMarker: OLD_MARKER,
    currentMarker: NEW_MARKER,
    likelyMisroute: true
  },
  {
    id: "E1",
    label: "raw 用 maintext 旧格式 + 新 fallback 文本",
    rawText: `<narration>本轮新旁白，没有分隔符。</narration>`,
    renderedText: oldMaintext,
    previousMarker: /旧 maintext/,
    currentMarker: /本轮新旁白/,
    likelyMisroute: true
  },
  {
    id: "E2",
    label: "raw 假分隔符说明 + 旧 rendered",
    rawText: `我会先写【初星正文开始】，然后输出：\n<narration>本轮实际正文在这里。</narration>`,
    renderedText: oldRoundDelimited,
    previousMarker: OLD_MARKER,
    currentMarker: /本轮实际正文/,
    likelyMisroute: false
  },
  {
    id: "F1",
    label: "双方都无分隔符，但 rendered 是更长的旧纯文本",
    rawText: `<narration>本轮只有一句新旁白。</narration>`,
    renderedText: oldRoundPlainLong,
    previousMarker: OLD_PLAIN_MARKER,
    currentMarker: /本轮只有一句/,
    likelyMisroute: true
  },
  {
    id: "F2",
    label: "双方都无分隔符，但 raw 更长",
    rawText: `${oldRoundPlainLong}\n<narration>末尾追加一句本轮标记：琴音正在——</narration>`,
    renderedText: `<narration>短旧 rendered。</narration>`,
    previousMarker: OLD_PLAIN_MARKER,
    currentMarker: NEW_MARKER,
    likelyMisroute: false
  },
  {
    id: "G1",
    label: "HTML 实体 raw 不完整 + 旧 rendered",
    rawText: `&lt;narration&gt;琴音正在——&lt;/narration&gt;`,
    renderedText: oldRoundDelimited,
    previousMarker: OLD_MARKER,
    currentMarker: NEW_MARKER,
    likelyMisroute: true
  },
  {
    id: "H1",
    label: "流式中间态：raw 只有开头标签，rendered 仍是旧完整文",
    rawText: `【初星正文开始】\n<narration>琴音正在——`,
    renderedText: oldRoundDelimited,
    previousMarker: OLD_MARKER,
    currentMarker: NEW_MARKER,
    likelyMisroute: false
  }
];

test("extractReplyText multi-scenario stale-route survey", () => {
  const ctx = makeExtractionContext();
  const rows = [];

  for (const scenario of extractScenarios) {
    const result = runExtractScenario(ctx, scenario);
    const misroute = result.verdict === "previous";
    rows.push({
      id: scenario.id,
      label: scenario.label,
      verdict: result.verdict,
      methods: result.methods.join(" > "),
      misroute,
      likelyMisroute: scenario.likelyMisroute,
      preview: String(result.reply || "").replace(/\s+/g, " ").slice(0, 72)
    });
  }

  console.log("\n=== extractReplyText 多场景探测 ===");
  for (const row of rows) {
    const flag = row.misroute ? "会显示上一轮" : "未显示上一轮";
    console.log(`[${row.id}] ${flag} | ${row.verdict} | methods=${row.methods}`);
    console.log(`     ${row.label}`);
    console.log(`     ${row.preview || "(empty)"}`);
  }

  const misfires = rows.filter((row) => row.misroute);
  console.log(`\n合计 ${rows.length} 种，会误选上一轮 ${misfires.length} 种：${misfires.map((row) => row.id).join(", ") || "无"}`);

  assert.ok(rows.length >= 10);
  assert.equal(misfires.length, 0, `should not misroute to previous round: ${misfires.map((row) => row.id).join(", ")}`);
});

const choiceOldStory = `【初星正文开始】
<story><narration>上一轮外出场景的 old story。</narration></story>
<option1>“旧选项 A”</option1>
<option2>“旧选项 B”</option2>
<option3>“旧选项 C”</option3>
<option4>“旧选项 D”</option4>
【初星正文结束】`;

const choiceScenarios = [
  {
    id: "P1",
    label: "选项：thinking 假 option + 本轮真 option",
    source: `<thinking>
<option1>“假 A”</option1>
<option2>“假 B”</option2>
<option3>“假 C”</option3>
<option4>“假 D”</option4>
</thinking>
【初星正文开始】
<story><narration>本轮 cafeteria story。</narration></story>
<option1>“看菜单”</option1>
<option2>“坐窗边”</option2>
<option3>“推荐甜点”</option3>
<option4>“回去”</option4>
【初星正文结束】`,
    expectOldStory: false,
    expectOldOption: false
  },
  {
    id: "P2",
    label: "选项：本轮 story 不完整，正文外混入旧 option 文本",
    source: `【初星正文开始】
<story><narration>本轮只有 story 半截。</narration>
<option1>“旧选项 A”</option1>
<option2>“旧选项 B”</option2>
<option3>“旧选项 C”</option3>
<option4>“旧选项 D”</option4>`,
    expectOldStory: false,
    expectOldOption: true
  },
  {
    id: "P3",
    label: "选项：空 thinking 后只有旧 rendered 整段（模拟选错楼层）",
    source: choiceOldStory,
    expectOldStory: true,
    expectOldOption: true
  }
];

test("extractChoicePayload multi-scenario survey", () => {
  const ctx = makeExtractionContext();
  console.log("\n=== extractChoicePayload 多场景探测 ===");

  for (const scenario of choiceScenarios) {
    const payload = ctx.extractChoicePayload(scenario.source);
    const hasOldStory = /上一轮外出场景/.test(payload.story);
    const hasOldOption = payload.options.some((option) => /旧选项/.test(option));
    console.log(`[${scenario.id}] story=${payload.story.replace(/\s+/g, " ").slice(0, 60) || "(empty)"}`);
    console.log(`     options=${payload.options.join(" | ") || "(none)"}`);
    console.log(`     oldStory=${hasOldStory} oldOption=${hasOldOption}`);

    if (scenario.expectOldStory) assert.ok(hasOldStory, `${scenario.id} should keep old story`);
    else assert.ok(!hasOldStory, `${scenario.id} should not pick old story`);

    if (scenario.expectOldOption) assert.ok(hasOldOption, `${scenario.id} should expose old-like options`);
    else assert.ok(!hasOldOption, `${scenario.id} should not expose old options`);
  }
});

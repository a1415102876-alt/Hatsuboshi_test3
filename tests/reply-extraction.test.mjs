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

test("stripAiThinkingBlocks removes redacted thinking with mismatched close tag", () => {
  const ctx = makeExtractionContext();
  const redactedOpen = "redacted" + "_thinking";
  const redactedClose = "redacted" + "_reasoning";
  const sample = `<${redactedOpen}>
这段推理不应进入正文。
</${redactedClose}>
【初星正文开始】
<narration>真正的剧情。</narration>
【初星正文结束】`;

  const cleaned = ctx.stripAiThinkingBlocks(sample);
  assert.doesNotMatch(cleaned, /推理不应进入正文/);
  assert.match(cleaned, /初星正文开始/);
});


test("extractChoicePayload keeps正文 after malformed konatan planning close", () => {
  const ctx = makeExtractionContext();
  const sample = `<konatan_planning~>
1. **Revision de la situacion actual**
The <sum> tag belongs after the body.
<option1>"wrong quoted option"</option1>
</konatan_planning~>
【初星正文开始】
<story><narration>真正的羁绊事件正文。</narration></story>
<option1>直接问她</option1>
<option2>告诉她梦境</option2>
<option3>指出真正害怕的事</option3>
<option4>让她自己说明</option4>
【初星正文结束】`;

  const payload = ctx.extractChoicePayload(sample);
  assert.match(payload.story, /真正的羁绊事件正文/);
  assert.deepEqual(Array.from(payload.options), ["直接问她", "告诉她梦境", "指出真正害怕的事", "让她自己说明"]);
});
test("extractReplyText keeps narrative raw when rendered still has previous delimiters", () => {
  const ctx = makeExtractionContext();
  const rawText = `好的，我来续写本次训练场景。
制作人推开训练室的门，琴音正在——`;
  const renderedText = `【初星正文开始】
<narration>上一轮训练室里，琴音已经做完最后一组深蹲。</narration>
<dialogue char="藤田琴音">“制作人，昨天那组还记得吗？”</dialogue>
【初星正文结束】`;

  const reply = ctx.extractReplyText(ctx.collectAiReplyCandidates(renderedText, rawText, renderedText));
  assert.match(reply, /琴音正在——/);
  assert.doesNotMatch(reply, /昨天那组还记得吗/);
});

test("extractReplyText ignores stale rendered delimiters when raw is empty", () => {
  const ctx = makeExtractionContext();
  const renderedText = `【初星正文开始】
<narration>上一轮训练室里，琴音已经做完最后一组深蹲。</narration>
【初星正文结束】`;

  const reply = ctx.extractReplyText(ctx.collectAiReplyCandidates(renderedText, "", renderedText));
  assert.equal(reply, "");
});

test("extractReplyText prefers delimited body from rendered candidate when raw tags were stripped", () => {
  const ctx = makeExtractionContext();
  const rawText = "模型在前置分析里提到了初星正文开始，但没有保留标签。";
  const renderedText = `【初星正文开始】
<narration>训练室里，琴音正在做最后的拉伸。</narration>
<dialogue char="藤田琴音">“制作人，今天也要认真哦。”</dialogue>
【初星正文结束】`;

  const reply = ctx.extractReplyText(ctx.collectAiReplyCandidates(renderedText, rawText, renderedText));
  assert.match(reply, /训练室里，琴音正在做最后的拉伸/);
  assert.match(reply, /制作人，今天也要认真哦/);
  assert.doesNotMatch(reply, /前置分析/);
});

test("extractReplyCandidate prefers story body inside hatsu delimiters", () => {
  const ctx = makeExtractionContext();
  const sample = `【初星正文开始】
模型额外说明：这段不应显示。
<story>
<narration>只有 story 内的旁白应保留。</narration>
</story>
【初星正文结束】`;

  const result = ctx.extractReplyCandidate(sample);
  assert.equal(result.method, "hatsu");
  assert.match(result.text, /只有 story 内的旁白应保留/);
  assert.doesNotMatch(result.text, /模型额外说明/);
});

test("extractChoicePayload ignores thinking samples outside delimiters", () => {
  const ctx = makeExtractionContext();
  const sample = `<thinking>
样例选项：
<option1>“错误选项 A”</option1>
<option2>“错误选项 B”</option2>
<option3>“错误选项 C”</option3>
<option4>“错误选项 D”</option4>
</thinking>
【初星正文开始】
<story>
<narration>琴音把菜单推到你面前。</narration>
</story>
<option1>“看看今日菜单”</option1>
<option2>“坐到窗边”</option2>
<option3>“向琴音推荐甜点”</option3>
<option4>“返回大厅”</option4>
【初星正文结束】`;

  const payload = ctx.extractChoicePayload(sample);
  assert.match(payload.story, /琴音把菜单推到你面前/);
  assert.equal(payload.options.length, 4);
  assert.equal(payload.options[0], "“看看今日菜单”");
  assert.doesNotMatch(payload.options.join("\n"), /错误选项/);
});

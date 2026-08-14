import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";

const source = fs.readFileSync(new URL("../app.js", import.meta.url), "utf8");
const html = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");

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
    state: { idol: "藤田琴音" }
  };

  vm.runInNewContext(
    [
      "const idolAliases = {};",
      readFunction("stripAiThinkingBlocks"),
      readFunction("canonicalIdolName"),
      readFunction("extractPhoneChatReply"),
      "this.extractPhoneChatReply = extractPhoneChatReply;"
    ].join("\n"),
    context
  );
  return context;
}

test("phone chat overlay exposes LINE-style structure", () => {
  assert.match(html, /id="phoneOverlay"/);
  assert.match(html, /id="phoneHomeView"/);
  assert.match(html, /id="phoneAppGrid"/);
  assert.match(html, /class="line-app"/);
  assert.match(html, /id="phoneLineListView"/);
  assert.match(html, /id="phoneLineChatView"/);
  assert.match(html, /id="phoneChatList"/);
  assert.match(html, /id="phoneChatMessages"/);
  assert.match(html, /id="phoneChatForm"/);
  assert.match(html, /id="phoneChatMenuBtn"/);
  assert.match(source, /phoneChatMenuBtn/);
  assert.match(source, /openVnDebugView/);
  assert.match(html, /class="line-tabbar"/);
  assert.match(html, /class="mini-phone-bezel"/);
});

test("phone chat logic is wired in app.js", () => {
  assert.match(source, /phoneChat:/);
  assert.match(source, /phoneAppRegistry/);
  assert.match(source, /function showPhoneHomeView\(/);
  assert.match(source, /function launchPhoneApp\(/);
  assert.match(source, /function renderPhoneApp\(/);
  assert.match(source, /function openPhoneThread\(/);
  assert.match(source, /function buildPhoneChatScenarioRules\(/);
  assert.match(source, /function buildPhoneChatOutputContract\(/);
  assert.match(source, /【格式优先级】本条为「初星私聊」任务/);
  assert.match(source, /### 正文[\s\S]*<content>[\s\S]*<初星私聊/);
  assert.doesNotMatch(source, /你明明就在我旁边/);
  assert.match(html, /id="phoneLaunchBtn"/);
  assert.match(html, /stress-pill/);
  assert.match(source, /function triggerPhoneChatRegeneration\(/);
  assert.match(source, /data-phone-retry/);
  assert.match(html, /id="phoneChatRetryBtn"/);
  assert.match(source, /phoneChat\.friends/);
  assert.match(html, /id="phoneLineAddFriendView"/);
  assert.match(html, /id="phoneAddFriendOpenBtn"/);
  assert.match(source, /function extractPhoneChatReply\(/);
  assert.match(source, /function handlePhoneChatAiReply\(/);
  assert.match(source, /function startPhoneChatLineDelivery\(/);
  assert.match(source, /正在输入中/);
  assert.match(source, /<初星私聊/);
  assert.match(source, /activeStoryNode\?\.type === "phonechat"/);
});

test("extractPhoneChatReply splits each line into one bubble", () => {
  const context = makeContext();
  const sample = `<初星私聊 from="藤田琴音">
今天的训练……怎么说呢，还算没亏本吧。
不是钱的意思！我是说努力没有白费！
所以，明天也要继续看着我哦。
</初星私聊>`;

  const parsed = context.extractPhoneChatReply(sample);
  assert.equal(parsed.complete, true);
  assert.equal(parsed.from, "藤田琴音");
  assert.equal(parsed.lines.length, 3);
  assert.match(parsed.lines[0], /今天的训练/);
  assert.match(parsed.lines[1], /不是钱的意思/);
  assert.match(parsed.lines[2], /明天也要继续看着我/);
});

test("extractPhoneChatReply uses the last phone chat block and ignores thinking samples", () => {
  const context = makeContext();
  const sample = `<thinking>
需要先确认输出格式：
<初星私聊 from="藤田琴音">
这是思考里的样例，不应出现。
</初星私聊>
</thinking>
前面还有一段分析文字，同样不应进入气泡。
<初星私聊 from="藤田琴音">
真正的第一条
真正的第二条
</初星私聊>`;

  const parsed = context.extractPhoneChatReply(sample);
  assert.equal(parsed.complete, true);
  assert.equal(parsed.lines.length, 2);
  assert.match(parsed.lines[0], /真正的第一条/);
  assert.match(parsed.lines[1], /真正的第二条/);
  assert.doesNotMatch(parsed.lines.join("\n"), /样例|分析文字/);
});

test("extractPhoneChatReply accepts ### 正文 and content wrapper from preset-aligned output", () => {
  const context = makeContext();
  const sample = `### 正文

<content>
<初星私聊 from="藤田琴音">
哈？怎么还在说套餐的事啦！
不过既然你觉得好吃，那我就放心啦！
</初星私聊>
</content>`;

  const parsed = context.extractPhoneChatReply(sample);
  assert.equal(parsed.complete, true);
  assert.equal(parsed.from, "藤田琴音");
  assert.equal(parsed.lines.length, 2);
  assert.match(parsed.lines[0], /套餐/);
  assert.match(parsed.lines[1], /好吃/);
});

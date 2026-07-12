import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

const appSource = readFileSync(new URL("../app.js", import.meta.url), "utf8");

function readFunction(source, functionName) {
  const declaration = `function ${functionName}`;
  const start = source.indexOf(declaration);
  assert.notEqual(start, -1, `${functionName} must exist`);
  const lineStart = source.lastIndexOf("\n", start) + 1;
  const indentation = source.slice(lineStart, start);
  const nextDeclaration = source.indexOf(`\n${indentation}function `, start + declaration.length);
  return source.slice(start, nextDeclaration === -1 ? source.length : nextDeclaration);
}

function loadChronicle() {
  const sandbox = { globalThis: {} };
  sandbox.globalThis = sandbox;
  vm.runInNewContext(readFileSync(new URL("../chronicle/sum-chronicle.js", import.meta.url), "utf8"), sandbox, {
    filename: "chronicle/sum-chronicle.js"
  });
  return sandbox.globalThis.HatsuChronicle;
}

test("extractSumText keeps the last sum tag", () => {
  const api = loadChronicle();
  const text = `<sum>旧总结</sum>正文<sum>午后 · 教室 · 琴音与制作人确认训练计划。</sum>`;
  assert.equal(api.extractSumText(text), "午后 · 教室 · 琴音与制作人确认训练计划。");
});


test("extractSumText rejects summaries over one hundred characters", () => {
  const api = loadChronicle();
  const longSummary = "总结".repeat(51);
  assert.equal(api.extractSumText(`<sum>${longSummary}</sum>`), "");
});

test("extractDirectorEvent accepts bounded structured scene evidence", () => {
  const api = loadChronicle();
  const parsed = JSON.parse(JSON.stringify(api.extractDirectorEvent(`<director_event>{"facts":["明确约定"],"playerChoices":["接受邀请"],"observations":[],"hooksCreated":[],"hooksResolved":[]}</director_event>`)));
  assert.equal(parsed.evidenceQuality, "structured");
  assert.deepEqual(parsed.signals.facts, ["明确约定"]);
  assert.deepEqual(parsed.signals.playerChoices, ["接受邀请"]);
});

test("extractDirectorEvent degrades malformed or unbounded evidence to summary only", () => {
  const api = loadChronicle();
  const emptySignals = { facts: [], playerChoices: [], observations: [], hooksCreated: [], hooksResolved: [] };
  const samples = [
    `<director_event>{broken}</director_event>`,
    `<director_event>{"facts":["a"],"unknown":["b"]}</director_event>`,
    `<director_event>{"facts":["a","b","c","d"],"playerChoices":[],"observations":[],"hooksCreated":[],"hooksResolved":[]}</director_event>`,
    `<director_event>{"facts":["${"过长".repeat(90)}"],"playerChoices":[],"observations":[],"hooksCreated":[],"hooksResolved":[]}</director_event>`
  ];
  for (const sample of samples) {
    const parsed = JSON.parse(JSON.stringify(api.extractDirectorEvent(sample)));
    assert.equal(parsed.evidenceQuality, "summary_only");
    assert.deepEqual(parsed.signals, emptySignals);
  }
});
test("chronicle upsert refuses overlong summaries", () => {
  const api = loadChronicle();
  const longSummary = "污染".repeat(51);
  assert.equal(api.upsertChronicleContent("1. 原总结", 2, longSummary), "1. 原总结");
});
test("assistant message ids map to chronicle entry numbers on even ST floors", () => {
  const api = loadChronicle();
  assert.equal(api.assistantMessageIdToEntryNo(0), 0);
  assert.equal(api.assistantMessageIdToEntryNo(2), 1);
  assert.equal(api.assistantMessageIdToEntryNo(4), 2);
  assert.equal(api.assistantMessageIdToEntryNo(6), 3);
  assert.equal(api.assistantMessageIdToEntryNo(1), 0);
});

test("assistant one-based visible floors map to chronicle entry numbers", () => {
  const api = loadChronicle();
  assert.equal(api.assistantMessageIdToEntryNo(3), 1);
  assert.equal(api.assistantMessageIdToEntryNo(5), 2);
  assert.equal(api.assistantMessageIdToEntryNo(7), 3);
});

test("chronicle content upsert and reroll prune later entries", () => {
  const api = loadChronicle();
  const initial = "1. 第一次总结\n2. 第二次总结\n3. 第三次总结";
  const rerolled = api.upsertChronicleContent(initial, 2, "第二次总结（重 roll）", { pruneAfterReroll: true });
  assert.match(rerolled, /^1\. 第一次总结/);
  assert.match(rerolled, /2\. 第二次总结（重 roll）/);
  assert.doesNotMatch(rerolled, /3\./);
});

test("chronicle content can prune entries after branch point", () => {
  const api = loadChronicle();
  const pruned = api.pruneChronicleContentAfter("1. A\n2. B\n3. C", 1);
  assert.equal(pruned, "1. A");
});

test("buildCheckpointFromMessage only keeps assistant messages with sum", () => {
  const api = loadChronicle();
  const checkpoint = api.buildCheckpointFromMessage({
    message_id: 4,
    role: "assistant",
    message: "正文<sum>傍晚 · 操场 · 佑芽完成加练。</sum>"
  });
  assert.ok(checkpoint);
  assert.equal(checkpoint.messageId, 4);
  assert.equal(checkpoint.entryNo, 2);
  assert.equal(checkpoint.summary, "傍晚 · 操场 · 佑芽完成加练。");
  assert.equal(checkpoint.label, "节点 2");
});

test("app and st bridge wire chronicle sum and load save flow", () => {
  const app = readFileSync(new URL("../app.js", import.meta.url), "utf8");
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  const st = readFileSync(new URL("../st.html", import.meta.url), "utf8");
  assert.match(app, /function requestChronicleUpdate/);
  assert.match(app, /function openChronicleLoadOverlay/);
  assert.match(html, /id="vnChronicleLoadBtn"/);
  assert.match(html, /id="chronicleLoadOverlay"/);
  assert.match(st, /"chronicle\/sum-chronicle\.js"/);
  assert.match(st, /function updateChronicleWorldbook/);
  assert.match(st, /branch-create/);
});

test("streamed host reply payload includes message id for chronicle update", () => {
  const st = readFileSync(new URL("../st.html", import.meta.url), "utf8");
  const collectStart = st.indexOf("function collectAndSendAiReply");
  const collectEnd = st.indexOf("function scheduleStreamFinalize", collectStart);
  const collectBody = st.slice(collectStart, collectEnd);
  assert.match(collectBody, /messageId:\s*replyMessageId/);
});

test("chronicle load list renders summaries as text, not html", () => {
  const app = readFileSync(new URL("../app.js", import.meta.url), "utf8");
  const renderStart = app.indexOf("function renderChronicleCheckpointList");
  const renderEnd = app.indexOf("function openChronicleLoadOverlay", renderStart);
  const renderBody = app.slice(renderStart, renderEnd);
  assert.doesNotMatch(renderBody, /\.innerHTML\s*=/);
  assert.match(renderBody, /\.textContent\s*=\s*summary/);
});

test("requestId-rejected stale reply cannot request a chronicle write", () => {
  const route = readFunction(appSource, "routeHostAiPayload");
  const apply = readFunction(appSource, "applyAiReply");
  assert.doesNotMatch(route, /requestChronicleUpdate\(/);
  assert.ok(apply.indexOf("if (!acceptedRequest)") < apply.indexOf("requestChronicleUpdate("));
});

test("chronicle decision helper rejects stale requests", () => {
  const shouldRequest = vm.runInNewContext(`(${readFunction(appSource, "shouldRequestChronicleUpdate")})`);
  assert.equal(shouldRequest(false, true), false);
  assert.equal(shouldRequest(true, false), false);
  assert.equal(shouldRequest(true, true), true);
});

test("host reply route forwards message id to accepted reply handling", () => {
  const route = readFunction(appSource, "routeHostAiPayload");
  assert.match(route, /payload\.variableCommands,\s*payload\.messageId\s*\)/);
});

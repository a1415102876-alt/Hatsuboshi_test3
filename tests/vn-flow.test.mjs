import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

const source = readFileSync(new URL("../app.js", import.meta.url), "utf8");

test("First Live post reply waits until the live theater closes", () => {
  const applyStart = source.indexOf("function applyAiReply(");
  const applyEnd = source.indexOf("function sendAiReplyAck", applyStart);
  assert.notEqual(applyStart, -1, "applyAiReply must exist");
  assert.notEqual(applyEnd, -1, "sendAiReplyAck must follow applyAiReply");
  const applyBody = source.slice(applyStart, applyEnd);
  const videoBody = readFunction("playLiveVideo");
  const postBody = readFunction("startFirstLivePostStage");

  assert.match(applyBody, /node\?\.type === "firstLivePost" && isLiveTheaterActive\(\)/);
  assert.match(applyBody, /deferredLivePostReply = \{ title, result: "已收到 SillyTavern 角色回复", story: reply \}/);
  assert.match(videoBody, /flushDeferredLivePostReply\(\)/);
  assert.match(videoBody, /onComplete\(\)/);
  assert.match(postBody, /deferredLivePostReply = null/);
});

test("sandbox First Live routes shared VN controls through its own presentation stages", () => {
  const controlsBody = readFunction("setEventActionsEnabled");
  const closeBody = readFunction("closeEventOverlay");

  assert.match(controlsBody, /sandboxFirstLivePre/);
  assert.match(closeBody, /sandboxFirstLivePre[\s\S]*startSandboxFirstLivePresentation/);
  assert.match(closeBody, /sandboxFirstLivePost[\s\S]*completeSandboxFirstLivePresentation/);
});

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

test("VN source sanitizer removes leaked HTML comment drafts", () => {
  const sanitize = vm.runInNewContext(`(${readFunction("sanitizeVnStorySource")})`);
  const sourceText = `<!-- 预备草稿：不要显示 <dialogue char="假角色">伪台词</dialogue> -->
<narration>傍晚，练习室安静下来。</narration>`;

  const cleaned = sanitize(sourceText);

  assert.doesNotMatch(cleaned, /预备草稿|假角色|<!--|-->/);
  assert.equal(cleaned, "<narration>傍晚，练习室安静下来。</narration>");
});

test("VN slide builder sends sanitized source to parsing and HCG controls", () => {
  const body = readFunction("buildVnSlidesFromStory");
  assert.match(body, /const cleanStory = sanitizeVnStorySource\(story\)/);
  assert.match(body, /parseNovelSlides\(cleanStory\)/);
  assert.match(body, /attachControlEventsToSlides\(parsed, cleanStory\)/);
});

test("choice continuation display starts from the selected option and not the previous story", () => {
  const buildChoiceContinuationDisplayStory = vm.runInNewContext(`(${readFunction("buildChoiceContinuationDisplayStory")})`);
  const intro = "前半段第一句。\n前半段第二句。";
  const chosenLine = "<narration>▶ 制作人的选择：先喝水（【极佳】）</narration>";
  const reply = "后续反应第一句。\n后续反应第二句。";

  const display = buildChoiceContinuationDisplayStory(intro, chosenLine, reply);

  assert.match(display, /制作人的选择：先喝水/);
  assert.match(display, /后续反应第一句/);
  assert.doesNotMatch(display, /前半段第一句/);
});

test("choice pending display replaces the previous story while waiting for AI", () => {
  const buildChoicePendingDisplayStory = vm.runInNewContext(`(${readFunction("buildChoicePendingDisplayStory")})`);
  const intro = "前半段第一句。\n前半段第二句。";
  const chosenLine = "<narration>▶ 制作人的选择：先喝水（【极佳】）</narration>";

  const display = buildChoicePendingDisplayStory(intro, chosenLine);

  assert.match(display, /制作人的选择：先喝水/);
  assert.match(display, /等待 SillyTavern/);
  assert.doesNotMatch(display, /前半段第一句/);
});

test("event action enabled state is shared by classic and VN controls", () => {
  const elements = new Map();
  const makeElement = (id) => {
    const element = { id, disabled: null, textContent: "", classList: { add() {}, remove() {} } };
    elements.set(id, element);
    return element;
  };
  [
    "eventConfirmBtn",
    "eventRegenBtn",
    "eventAiBtn",
    "vnBtnRegen",
    "vnBtnEdit",
    "vnBtnAuto",
    "vnBtnSkip"
  ].forEach(makeElement);

  const context = {
    document: { getElementById: (id) => elements.get(id) || null },
    state: { activeStoryNode: null }
  };
  vm.runInNewContext(
    `${readFunction("setVnControlsEnabled")}\n${readFunction("setEventActionsEnabled")}\nthis.setEventActionsEnabled = setEventActionsEnabled;`,
    context
  );

  context.setEventActionsEnabled(false, true);
  assert.equal(elements.get("eventRegenBtn").disabled, true);
  assert.equal(elements.get("vnBtnRegen").disabled, true);
  assert.equal(elements.get("vnBtnEdit").disabled, true);

  context.setEventActionsEnabled(true, false);
  assert.equal(elements.get("eventRegenBtn").disabled, false);
  assert.equal(elements.get("vnBtnRegen").disabled, false);
  assert.equal(elements.get("vnBtnEdit").disabled, false);
});

test("ended VN dialogue clicks ignore control buttons", () => {
  const body = readFunction("handleVnSlidesEnd");
  assert.match(body, /target\.closest\("\.vn-controls"\)/);
  assert.match(body, /target\.closest\("\.vn-btn"\)/);
});

test("N.I.A plan review owns VN completion and supports missing-DOM fallback", () => {
  const endBody = readFunction("handleVnSlidesEnd");
  const openBody = readFunction("openNiaPlanReviewVn");
  const completeBody = readFunction("completeNiaPlanReview");
  const resumeBody = readFunction("resumeNiaPlanReviewIfNeeded");

  assert.match(endBody, /pendingActionContext\?\.action === "nia_plan_review"/);
  assert.match(endBody, /completeNiaPlanReview\(\)/);
  assert.match(openBody, /!document\.getElementById\("eventOverlay"\)[\s\S]*completeNiaPlanReview\(\)/);
  assert.match(completeBody, /planStatus !== "reviewing" \|\| !nia\.pendingReviewPlan/);
  assert.match(completeBody, /pendingReviewPlan: null/);
  assert.match(resumeBody, /openNiaPlanReviewVn\(nia\.pendingReviewPlan\)/);
  assert.match(readFunction("getSceneBackground"), /nia_plan_review[\s\S]*Producer_Class\.png/);
});

test("VN log button opens the dark in-event dialogue history overlay", () => {
  const openBody = readFunction("openVnLogView");
  const closeBody = readFunction("closeVnLogView");
  const eventBody = readFunction("openEventOverlay");
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  const css = readFileSync(new URL("../style.css", import.meta.url), "utf8");

  assert.match(html, /id="vnLogOverlay"/);
  assert.match(html, /id="vnLogContent"/);
  assert.match(css, /\.vn-log-overlay/);
  assert.match(css, /rgba\(0,\s*0,\s*0,\s*0\.72\)/);
  assert.match(openBody, /buildVnLogHtml\(\)/);
  assert.match(openBody, /vnLogOverlay/);
  assert.doesNotMatch(openBody, /vnClassicPanel/);
  assert.match(closeBody, /vnLogOverlay/);
  assert.match(eventBody, /closeVnLogView\(\)/);
});

test("VN debug button opens an in-event bridge state overlay", () => {
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  const css = readFileSync(new URL("../style.css", import.meta.url), "utf8");
  const applyBody = source.slice(source.indexOf("function applyAiReply("), source.indexOf("function sendAiReplyAck", source.indexOf("function applyAiReply(")));

  assert.match(html, /id="vnBtnDebug"/);
  assert.match(html, /id="vnDebugOverlay"/);
  assert.match(html, /id="vnDebugContent"/);
  const eventOverlayEnd = html.indexOf("</section>", html.indexOf('id="eventOverlay"'));
  const debugOverlayStart = html.indexOf('id="vnDebugOverlay"');
  assert.ok(debugOverlayStart > eventOverlayEnd, "vnDebugOverlay should be a top-level overlay outside eventOverlay");
  const debugOverlayEnd = html.indexOf("</section>", debugOverlayStart);
  const debugOverlayHtml = html.slice(debugOverlayStart, debugOverlayEnd);
  assert.match(debugOverlayHtml, /class="vn-debug-head"/);
  assert.doesNotMatch(debugOverlayHtml, /class="vn-log-head"/);
  assert.match(css, /\.vn-debug-overlay/);
  assert.match(css, /position:\s*fixed/);
  assert.match(css, /\.vn-debug-head/);
  assert.equal((css.match(/^\.vn-debug-overlay \{/gm) || []).length, 1);
  assert.match(source, /const aiBridgeDebug = \{/);
  assert.match(source, /function openVnDebugView\(/);
  assert.match(source, /function buildVnDebugHtml\(/);
  assert.match(source, /function classifyPromptKind\(/);
  assert.match(source, /function buildDebugDiagnoses\(/);
  assert.match(source, /function recordDebugPromptDispatch\(/);
  assert.match(source, /function recordDebugOpeningDispatch\(/);
  assert.match(source, /function recordAiReplyDebug\(/);
  assert.match(source, /function recordAiAckDebug\(/);
  assert.match(readFunction("requestHostPromptSend"), /recordDebugPromptDispatch\(/);
  assert.match(applyBody, /recordAiReplyDebug\(/);
  assert.match(readFunction("sendAiReplyAck"), /recordAiAckDebug\(/);
  assert.match(html, /桥接诊断/);
  assert.match(css, /\.vn-debug-alert-error/);
});

test("debug prompt classifier and diagnosis detect known bridge mismatches", () => {
  const classifyPromptKind = readFunction("classifyPromptKind");
  const buildDebugDiagnoses = readFunction("buildDebugDiagnoses");
  const context = {
    state: {
      idol: "藤田琴音",
      day: 1,
      round: 1,
      affinity: { openingComplete: false },
      eventMode: "choice_resolution",
      choiceStep: 2,
      pendingActionContext: { action: "outing" },
      phoneChat: { isAwaitingReply: false, retryAvailable: false, activeView: "home", activeThreadId: "" },
      activeStoryNode: null,
      selectedChoiceText: "去甜品店",
      lastPrompt: "[初星育成系统：互动分支设计]",
      pendingAiRequestId: ""
    },
    aiBridgeDebug: {
      lastPromptRequest: { promptKind: "choice_phase1", requestId: "req-1" },
      lastReply: { accepted: true, optionCount: 0, requestId: "req-1" },
      openingDispatches: [
        { source: "ST角色卡自动绑定", at: Date.now() },
        { source: "签署合约", at: Date.now() }
      ],
      promptHistory: [],
      lastMessage: ""
    },
    pendingAiRequestId: "req-2",
    state_pendingAiRequestId: "",
    hostStateReady: false,
    isSillyTavernHost() { return true; },
    expectedPromptKindForState() { return "choice_phase2"; },
    classifyPromptKind
  };

  vm.runInNewContext(
    `function expectedPromptKindForState() { return "choice_phase2"; }
function isSillyTavernHost() { return true; }
${classifyPromptKind}
${buildDebugDiagnoses}
this.classifyPromptKind = classifyPromptKind; this.buildDebugDiagnoses = buildDebugDiagnoses;`,
    context
  );

  assert.equal(context.classifyPromptKind("[初星育成系统：好感度0担当开场]\n"), "opening");
  assert.equal(context.classifyPromptKind("[初星育成系统：互动分支设计]\n"), "choice_phase1");
  assert.equal(context.classifyPromptKind("[初星育成系统：互动分支结算与收尾]\n"), "choice_phase2");
  assert.equal(context.classifyPromptKind("[初星育成系统：小手机私聊]\n"), "phone_chat");

  const issues = context.buildDebugDiagnoses();
  const joined = issues.map((item) => item.message).join("\n");
  assert.match(joined, /担当开场/);
  assert.match(joined, /openingComplete 仍为 false/);
  assert.match(joined, /提示词类型与当前状态不一致/);
});
test("choice UI is gated by explicit event mode and action whitelist", () => {
  const context = {
    state: {
      eventMode: "none",
      choiceStep: 1,
      pendingActionContext: { action: "lesson" }
    }
  };
  vm.runInNewContext(
    `${readFunction("isChoicePromptAction")}\n${readFunction("isChoicePromptMode")}\nthis.isChoicePromptMode = isChoicePromptMode;`,
    context
  );

  assert.equal(context.isChoicePromptMode(), false);

  context.state.eventMode = "choice_prompt";
  assert.equal(context.isChoicePromptMode(), false);

  context.state.pendingActionContext = { action: "outing" };
  assert.equal(context.isChoicePromptMode(), true);

  context.state.pendingActionContext = { action: "companion" };
  assert.equal(context.isChoicePromptMode(), true);

  context.state.pendingActionContext = { action: "intimacy" };
  assert.equal(context.isChoicePromptMode(), true);

  context.state.pendingActionContext = { action: "bond" };
  assert.equal(context.isChoicePromptMode(), true);
});

test("intimacy action is visible but locked until trust reaches 60", () => {
  const availability = readFunction("isActionAvailable");
  const rendering = readFunction("renderActionButtons");
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");

  assert.match(source, /function isIntimacyUnlocked\(/);
  assert.match(availability, /isIntimacyUnlocked\(\)/);
  assert.match(rendering, /\["亲密",\s*"intimacy",\s*null,\s*"#f58ab5",\s*isIntimacyUnlocked\(\) \? "信赖\+20" : "信赖60解锁"\]/);
  assert.match(rendering, /信赖值达到 \$\{INTIMACY_UNLOCK_TRUST\} 后解锁亲密行动/);
  assert.match(html, /id="intimacyOverlay"/);
  assert.match(source, /function openIntimacyOverlay\(/);
  assert.match(source, /function confirmIntimacyMode\(/);
  assert.match(source, /INTIMACY_NSFW_UNLOCK_TRUST = 100/);
});

test("NSFW intimacy uses multi-turn VN choices with custom input and end", () => {
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");

  assert.match(source, /function buildNsfwIntimacyOpeningPrompt\(/);
  assert.match(source, /function buildNsfwIntimacyContinuePrompt\(/);
  assert.match(source, /function buildNsfwIntimacyClosingPrompt\(/);
  assert.match(source, /function buildNsfwIntimacyChatContextLine\(/);
  assert.match(source, /SillyTavern 聊天记录中/);
  assert.doesNotMatch(source, /已发生剧情与互动/);
  assert.match(html, /id="vnCustomChoicePanel"/);
  assert.match(html, /id="vnCustomChoiceInput"/);
  assert.match(source, /自定义输入/);
  assert.match(source, /handleNsfwIntimacyEndChoice/);
  assert.match(readFunction("settleNsfwIntimacyStats"), /delta = \{ stamina: 38, stress: -10 \}/);
  assert.doesNotMatch(readFunction("settleNsfwIntimacyStats"), /trust/);
  assert.match(readFunction("fallbackChoiceSettlement"), /isNsfwIntimacyActive\(\)/);
});

test("intimacy choice settlement restores stamina and stress with fixed trust for normal intimacy", () => {
  const phase1Start = source.indexOf("function buildChoicePhase1Prompt(");
  const phase2Start = source.indexOf("function buildChoicePhase2Prompt(");
  const openingStart = source.indexOf("function buildOpeningPrompt(", phase2Start);
  assert.notEqual(phase1Start, -1, "buildChoicePhase1Prompt must exist");
  assert.notEqual(phase2Start, -1, "buildChoicePhase2Prompt must exist");
  assert.notEqual(openingStart, -1, "buildOpeningPrompt must follow choice prompt builders");
  const phase2 = source.slice(phase2Start, openingStart);
  const selection = readFunction("handleChoiceSelection");

  assert.match(phase2, /体力 \+38，压力 -10，信赖 \+\$\{INTIMACY_NORMAL_TRUST_GAIN\}/);
  assert.match(selection, /action === "intimacy"[\s\S]*delta\.stamina = 38[\s\S]*delta\.stress = -10[\s\S]*delta\.trust = INTIMACY_NORMAL_TRUST_GAIN/);
  assert.match(source, /INTIMACY_NORMAL_TRUST_GAIN = 20/);
});

test("companion action requires custom topic input before AI generation", () => {
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  const phase1Start = source.indexOf("function buildChoicePhase1Prompt(");
  const phase2Start = source.indexOf("function buildChoicePhase2Prompt(");
  const phase1 = source.slice(phase1Start, phase2Start);

  assert.match(html, /id="companionOverlay"/);
  assert.match(html, /id="companionTopicTextarea"/);
  assert.match(source, /function openCompanionOverlay\(/);
  assert.match(source, /function confirmCompanionTopic\(/);
  assert.match(source, /button\.dataset\.action === "companion"[\s\S]*openCompanionOverlay\(\)/);
  assert.match(source, /settleAction\("companion", null, \{ companionTopic \}\)/);
  assert.match(phase1, /companionTopicPrompt/);
  assert.match(phase1, /制作人指定的交流内容/);
});

test("choice resolution mode is separate from choice prompt parsing", () => {
  const context = {
    state: {
      eventMode: "choice_resolution",
      choiceStep: 1,
      pendingActionContext: { action: "outing" }
    }
  };
  vm.runInNewContext(
    `${readFunction("isChoicePromptAction")}\n${readFunction("isChoicePromptMode")}\n${readFunction("isChoiceResolutionMode")}\nthis.isChoicePromptMode = isChoicePromptMode;\nthis.isChoiceResolutionMode = isChoiceResolutionMode;`,
    context
  );

  assert.equal(context.isChoicePromptMode(), false);
  assert.equal(context.isChoiceResolutionMode(), true);
});

test("AI reply routing uses explicit event modes instead of raw choiceStep gates", () => {
  const start = source.indexOf("function applyAiReply(");
  const end = source.indexOf("function sendAiReplyAck", start);
  assert.notEqual(start, -1, "applyAiReply must exist");
  assert.notEqual(end, -1, "sendAiReplyAck must follow applyAiReply");
  const body = source.slice(start, end);

  assert.match(body, /isChoicePromptMode\(\)/);
  assert.match(body, /isChoiceResolutionMode\(\)/);
  assert.match(body, /state\.eventMode\s*!==\s*"choice_prompt"/);
  assert.doesNotMatch(body, /if\s*\(\s*state\.choiceStep\s*===\s*1\s*\|\|/);
  assert.doesNotMatch(body, /if\s*\(\s*state\.choiceStep\s*===\s*2\s*\)/);
});

test("choice prompt regeneration resends the original prompt instead of host regenerate", () => {
  const body = readFunction("triggerRegeneration");

  assert.match(body, /isChoicePromptMode\(\)/);
  assert.match(body, /requestHostPromptSend\(state\.lastPrompt,\s*requestId\)/);
});

test("line fallback requires numbered choices instead of ordinary quoted dialogue", () => {
  const start = source.indexOf("function applyAiReply(");
  const end = source.indexOf("function sendAiReplyAck", start);
  assert.notEqual(start, -1, "applyAiReply must exist");
  assert.notEqual(end, -1, "sendAiReplyAck must follow applyAiReply");
  const body = source.slice(start, end);

  assert.doesNotMatch(body, /return\s+hasQuotes\s*\|\|\s*hasNumberPrefix/);
  assert.match(body, /return\s+hasNumberPrefix/);
});

test("malformed choice prompt stays regenerable instead of settling the action", () => {
  const start = source.indexOf("function applyAiReply(");
  const end = source.indexOf("function sendAiReplyAck", start);
  assert.notEqual(start, -1, "applyAiReply must exist");
  assert.notEqual(end, -1, "sendAiReplyAck must follow applyAiReply");
  const body = source.slice(start, end);

  assert.match(body, /选项生成不完整/);
  assert.doesNotMatch(body, /fallbackChoiceSettlement\(reply\)/);
});

test("custom outing input waits for IME commit and VN keeps plain story fallback", () => {
  assert.match(source, /function bindImeSafeTextInput\(/);
  assert.match(source, /function runAfterImeCommit\(/);
  assert.match(source, /bindImeSafeTextInput\("freeModeOutingCustomInput"/);
  assert.match(readFunction("submitCustomFreeModeOutingDestination"), /runAfterImeCommit\("freeModeOutingCustomInput"/);
  assert.match(readFunction("buildVnSlidesFromStory"), /parseNovelSlides/);
  assert.match(readFunction("currentChoiceActionTitle"), /resolveMapExploreLocation/);
});

test("opening a non-choice event clears stale choice UI", () => {
  const elements = new Map();
  const makeElement = (id) => {
    const element = {
      id,
      hidden: false,
      innerHTML: "stale option",
      textContent: "",
      style: { display: "flex" },
      classList: { add() {}, remove() {} }
    };
    elements.set(id, element);
    return element;
  };
  [
    "eventOverlay",
    "eventTitle",
    "eventPhaseBadge",
    "eventResult",
    "eventStory",
    "eventChoices",
    "vnChoicesOverlay",
    "vnChoicesContainer"
  ].forEach(makeElement);

  const context = {
    state: { choiceStep: 0, selectedChoiceText: "", lastStory: "", pendingOptionTexts: ["A", "B", "C", "D"] },
    aiBridgeDebug: {},
    pendingAiRequestId: "",
    document: { getElementById: (id) => elements.get(id) || null },
    saveState() {},
    getPhase: () => "First Live",
    formatStoryText: (value) => String(value || ""),
    setEventActionsEnabled() {},
    setVnControlsEnabled() {},
    setElementHidden(id, hidden) {
      const element = elements.get(id);
      if (element) element.hidden = hidden;
    },
    triggerWipeTransition(callback) { callback(); },
    isFreeModeActive: () => false,
    parseNovelSlides: () => [],
    buildVnSlidesFromStory: () => [],
    refreshVnDebugView() {},
    initVisualNovelPlayer() {}
  };
  vm.runInNewContext(
    `${readFunction("isChoiceResolutionMode")}\n${readFunction("openEventOverlay")}\nthis.openEventOverlay = openEventOverlay;`,
    context
  );

  context.openEventOverlay("Final", "done", "final story without choices");

  assert.equal(elements.get("eventChoices").innerHTML, "");
  assert.equal(elements.get("eventChoices").hidden, true);
  assert.equal(elements.get("vnChoicesOverlay").style.display, "none");
  assert.equal(elements.get("vnChoicesContainer").innerHTML, "");
});

test("ended non-choice VN dialogue hides stale choice overlay", () => {
  const elements = new Map();
  const makeElement = (id) => {
    const element = {
      id,
      innerHTML: "stale option",
      textContent: "",
      disabled: false,
      style: { display: "flex" },
      classList: { add() {}, remove() {} },
      onclick: null
    };
    elements.set(id, element);
    return element;
  };
  [
    "vnText",
    "vnNameplate",
    "vnDialogueBox",
    "vnChoicesOverlay",
    "vnChoicesContainer",
    "eventConfirmBtn"
  ].forEach(makeElement);

  const context = {
    state: { choiceStep: 0, pendingOptionTexts: ["A", "B", "C", "D"] },
    document: { getElementById: (id) => elements.get(id) || null },
    pendingAiRequestId: "",
    stopVnAuto() {},
    isMapLocationExploreActive: () => false,
    isEveningGoHomeActive: () => false,
    isFreeModeTravelAllowed: () => true,
    showVnChoicesOverlay() {
      elements.get("vnChoicesOverlay").style.display = "flex";
    },
    closeEventOverlay() {}
  };
  vm.runInNewContext(
    `${readFunction("isChoicePromptAction")}\n${readFunction("isChoicePromptMode")}\n${readFunction("handleVnSlidesEnd")}\nthis.handleVnSlidesEnd = handleVnSlidesEnd;`,
    context
  );

  context.handleVnSlidesEnd();

  assert.equal(elements.get("vnChoicesOverlay").style.display, "none");
  assert.equal(elements.get("vnChoicesContainer").innerHTML, "");
});

test("malformed choice fallback clears pending generation state", () => {
  const body = readFunction("fallbackChoiceSettlement");
  assert.match(body, /pendingAiRequestId\s*=\s*""/);
  assert.match(body, /state\.choiceStep\s*=\s*0/);
});

test("choice parser accepts story and option tags without an end marker", () => {
  const sandbox = {
    cleanReplyText: (value) => String(value || "").replace(/<[^>]+>/g, "").trim()
  };
  vm.runInNewContext(`
${readFunction("stripAiThinkingBlocks")}
${readFunction("extractChoicePayload")}
`, sandbox);
  const source = `【初星正文开始】
<story>
<narration>星南问制作人。</narration>
<dialogue char="十王星南">“我缺少了什么？”</dialogue>
</story>
<option1>“先休息一下吧。”</option1>
<option2>“您已经足够完美了。”</option2>
<option3>“您缺的是允许自己不完美。”</option3>
<option4>“您缺少的是让自己笨拙的勇气。”</option4>`;

  const payload = sandbox.extractChoicePayload(source);

  assert.equal(payload.options.length, 4);
  assert.equal(payload.options[2], "“您缺的是允许自己不完美。”");
  assert.match(payload.story, /星南问制作人/);
});

test("choice parser accepts multiline story and option tags from outing replies", () => {
  const sandbox = {
    cleanReplyText: (value) => String(value || "").replace(/<[^>]+>/g, "").trim()
  };
  vm.runInNewContext(`
${readFunction("stripAiThinkingBlocks")}
${readFunction("extractChoicePayload")}
`, sandbox);
  const source = `【初星正文开始】
<story>
<narration>游乐园入口广场的彩色气球在下午四点的风里左右摇晃。</narration>
<dialogue char="月村手毬">“我不觉得来游乐园是一项有效的训练内容。”</dialogue>
<narration>制作人把卡片递了过去。</narration>
</story>
<option1>“由我来重新排明天的日程吧。”</option1>
<option2>“我知道您讨厌被当成需要休息的人。”</option2>
<option3>“……给您。热可可。”</option3>
<option4>“48不是软弱的数字。”</option4>
【初星正文结束】`;

  const payload = sandbox.extractChoicePayload(source);

  assert.match(payload.story, /游乐园入口广场/);
  assert.equal(payload.options.length, 4);
  assert.equal(payload.options[0], "“由我来重新排明天的日程吧。”");
  assert.equal(payload.options[3], "“48不是软弱的数字。”");
});

test("choice parser recovers options when custom tags are stripped into plain text", () => {
  const sandbox = {
    cleanReplyText: (value) => String(value || "").replace(/<[^>]+>/g, "").trim()
  };
  vm.runInNewContext(`
${readFunction("stripAiThinkingBlocks")}
${readFunction("extractChoicePayload")}
`, sandbox);
  const source = `【初星正文开始】
星南问制作人：“我缺少了什么？”
“先休息一下吧。”“您已经足够完美了。”“您缺的是允许自己不完美。”“您缺少的是让自己笨拙的勇气。”`;

  const payload = sandbox.extractChoicePayload(source);

  assert.equal(payload.options.length, 4);
  assert.equal(payload.options[0], "“先休息一下吧。”");
  assert.equal(payload.options[3], "“您缺少的是让自己笨拙的勇气。”");
  assert.match(payload.story, /我缺少了什么/);
});

test("host prompt sending deduplicates repeated request payloads", () => {
  assert.match(source, /const recentHostPromptDispatches\s*=\s*\[\]/);
  const fn = readFunction("requestHostPromptSend");
  assert.match(fn, /recentHostPromptDispatches/);
  assert.match(fn, /promptKey/);
  assert.match(fn, /重复发送已拦截/);
});

test("choice prompt regeneration creates a fresh request id", () => {
  const fn = readFunction("triggerRegeneration");
  assert.match(fn, /isChoicePromptMode\(\)\s*\?\s*createRequestId\(\)/);
  assert.doesNotMatch(fn, /const requestId = state\.lastRequestId \|\| createRequestId\(\);/);
});
test("sandbox scout releases the accepted request before starting wrap-up generation", () => {
  const calls = [];
  const context = {
    state: {
      lastStory: "",
      pendingActionContext: { actionContext: { locationId: "campus" } }
    },
    globalThis: {
      HatsuTasks: {
        getScoutQuestId: () => "scout_temari",
        applyQuestCompletionsFromReply: () => ["scout_temari"]
      }
    },
    scoutCompletionPendingInReply: () => true,
    notifyQuestCompletions() {},
    refreshWorldPresenceFromRules() {},
    sendAiReplyAck: (...args) => calls.push(["ack", ...args]),
    beginSandboxScoutWrapUp: () => calls.push(["wrap-up"])
  };
  vm.runInNewContext(
    `${readFunction("completeScoutFromReplyAndBeginWrapUp")}; this.completeScout = completeScoutFromReplyAndBeginWrapUp;`,
    context
  );

  assert.equal(context.completeScout("reply", "signed story", "request-scout"), true);
  assert.deepEqual(calls, [
    ["ack", "request-scout", true, false],
    ["wrap-up"]
  ]);
});

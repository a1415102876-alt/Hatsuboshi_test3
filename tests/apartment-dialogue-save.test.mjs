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

test("apartment dialogue checkpoint helpers exist and are wired into save/resume paths", () => {
  assert.match(source, /apartmentDialogue:\s*null/);
  assert.match(source, /function normalizeApartmentDialogueCheckpoint\(/);
  assert.match(source, /function syncApartmentDialogueCheckpoint\(/);
  assert.match(source, /function resumeApartmentDialogueIfNeeded\(/);
  assert.match(source, /function clearApartmentDialogueCheckpoint\(/);
  assert.match(readFunction("returnToLaunchMenu"), /syncApartmentDialogueCheckpoint\(\)/);
  assert.match(readFunction("returnToLaunchMenu"), /apartmentDialogue/);
  assert.match(readFunction("closeApartmentCompanionSession"), /clearApartmentDialogueCheckpoint\(\)/);
  assert.match(readFunction("resumeNiaEveningIfNeeded"), /resumeApartmentDialogueIfNeeded\(\)/);
  assert.match(readFunction("resumeFromLaunchMenu"), /resumeApartmentDialogueIfNeeded\(\)/);
  assert.match(readFunction("saveState"), /syncApartmentDialogueCheckpoint\(\)/);
});

test("apartment dialogue resume uses latest display segment instead of full history", () => {
  assert.match(source, /function extractLatestApartmentDialogueSegment\(/);
  assert.match(source, /function resolveVnLoadingSlideText\(/);
  assert.match(source, /function resumeApartmentDialoguePrompt\(/);
  assert.match(readFunction("resumeApartmentDialogueIfNeeded"), /resolveApartmentDialogueDisplayStory/);
  assert.match(readFunction("resumeApartmentDialogueIfNeeded"), /只重播最近一轮正文/);
  assert.match(readFunction("resumeApartmentDialogueIfNeeded"), /resumeApartmentDialoguePrompt\(/);
  assert.match(readFunction("resumeApartmentDialoguePrompt"), /requestHostPromptSend\(prompt, requestId\)/);
  assert.doesNotMatch(readFunction("resumeApartmentDialogueIfNeeded"), /buildAiWaitingStory\(checkpoint\.lastStory/);
  assert.match(readFunction("openEventOverlay"), /resolveVnLoadingSlideText\(story\)/);
  assert.match(readFunction("syncApartmentDialogueCheckpoint"), /options\.length === 4 && !pendingAiRequestId/);

  const context = {};
  vm.runInNewContext(
    `${readFunction("extractLatestApartmentDialogueSegment")}\nthis.extract = extractLatestApartmentDialogueSegment;`,
    context
  );
  const full = [
    "<narration>第一轮开场。</narration>",
    '<narration>▶ 制作人：先牵住她的手</narration>',
    "<narration>第二轮推进。</narration>",
    '<dialogue char="花海咲季">“……不要停。”</dialogue>'
  ].join("\n\n");
  const latest = context.extract(full);
  assert.match(latest, /第二轮推进/);
  assert.doesNotMatch(latest, /第一轮开场/);
});

test("normalizeApartmentDialogueCheckpoint keeps awaiting_choice only with four options", () => {
  const context = {
    clone: (value) => JSON.parse(JSON.stringify(value))
  };
  vm.runInNewContext(
    `${readFunction("extractLatestApartmentDialogueSegment")}
${readFunction("normalizeApartmentDialogueCheckpoint")}
this.normalize = normalizeApartmentDialogueCheckpoint;`,
    context
  );

  const valid = context.normalize({
    kind: "companion_chat",
    status: "awaiting_choice",
    eventMode: "choice_prompt",
    choiceStep: 1,
    pendingActionContext: {
      action: "apartment_companion",
      actionContext: { companionIdol: "花海咲季", companionTopic: "今天的训练" }
    },
    pendingOptionTexts: ["A", "B", "C", "D"],
    lastStory: "<narration>客厅里只剩安静的灯光。</narration>",
    lastPrompt: "prompt",
    companionIdol: "花海咲季",
    topic: "今天的训练",
    updatedAt: 1
  });
  assert.equal(valid.kind, "companion_chat");
  assert.equal(valid.pendingOptionTexts.length, 4);

  const incomplete = context.normalize({
    kind: "companion_chat",
    status: "awaiting_choice",
    eventMode: "choice_prompt",
    pendingActionContext: { action: "apartment_companion", actionContext: {} },
    pendingOptionTexts: ["A", "B"],
    lastStory: "x",
    lastPrompt: "p"
  });
  assert.equal(incomplete.status, "generating");

  const promoted = context.normalize({
    kind: "nsfw_intimacy",
    status: "generating",
    eventMode: "choice_prompt",
    pendingActionContext: {
      action: "intimacy",
      intimacyMode: "nsfw",
      actionContext: { apartmentInvite: true, inviteIdol: "花海咲季" }
    },
    pendingOptionTexts: ["A", "B", "C", "D"],
    lastStory: "waiting",
    lastPrompt: "continue"
  });
  assert.equal(promoted.status, "awaiting_choice");

  const generating = context.normalize({
    kind: "nsfw_intimacy",
    status: "generating",
    eventMode: "choice_prompt",
    pendingActionContext: {
      action: "intimacy",
      intimacyMode: "nsfw",
      actionContext: { apartmentInvite: true, inviteIdol: "花海咲季" }
    },
    pendingOptionTexts: [],
    lastStory: "waiting",
    lastPrompt: "continue"
  });
  assert.equal(generating.kind, "nsfw_intimacy");
  assert.equal(generating.status, "generating");
});

test("NSFW continue prompt includes option example and story/option placement rules", () => {
  const body = readFunction("buildNsfwIntimacyContinuePrompt");
  assert.match(body, /buildChoiceOnlyExample\(\)/);
  assert.match(body, /phase1:\s*true/);
  assert.match(body, /紧跟 <\/story> 之后/);
  assert.match(body, /galgameRenderContract\("nsfw_choice"\)/);
  const contract = readFunction("galgameRenderContract");
  assert.match(contract, /HATSU_OUTPUT_MODE:NSFW_CHOICE_STORY/);
  assert.match(contract, /HATSU_OUTPUT_MODE:NSFW_STORY/);
  assert.match(contract, /写在 <\/story> 之后/);
  assert.match(contract, /不要把 option 放进 <story>/);
});

test("choice parser prefers options after story and ignores dialogue quotes inside story", () => {
  const sandbox = {
    cleanReplyText: (value) => String(value || "").replace(/<[^>]+>/g, "").trim(),
    parseMapOptionMinutes: () => null
  };
  vm.runInNewContext(`
${readFunction("stripAiThinkingBlocks")}
${readFunction("extractChoicePayload")}
`, sandbox);

  const sourceText = `【初星正文开始】
<story>
<narration>她把额头贴过来。</narration>
<dialogue char="花海咲季">“不要停……再靠近一点。”</dialogue>
<dialogue char="花海咲季">“现在的氛围，我还不想结束。”</dialogue>
</story>
<option1>顺着她加深这个吻</option1>
<option2>把她轻轻压进沙发</option2>
<option3>低声问她还想不想继续</option3>
<option4>先停下来帮她整理呼吸</option4>
【初星正文结束】`;

  const payload = sandbox.extractChoicePayload(sourceText);
  assert.equal(payload.options.length, 4);
  assert.equal(payload.options[0], "顺着她加深这个吻");
  assert.doesNotMatch(payload.options.join("\n"), /不要停/);
  assert.match(payload.story, /额头贴过来/);
});

test("choice parser quote fallback only reads quotes after story close", () => {
  const sandbox = {
    cleanReplyText: (value) => String(value || "").replace(/<[^>]+>/g, "").trim(),
    parseMapOptionMinutes: () => null
  };
  vm.runInNewContext(`
${readFunction("stripAiThinkingBlocks")}
${readFunction("extractChoicePayload")}
`, sandbox);

  const sourceText = `【初星正文开始】
<story>
<dialogue char="花海咲季">“正文台词一。”</dialogue>
<dialogue char="花海咲季">“正文台词二。”</dialogue>
</story>
“顺着她的呼吸继续吻下去。”
“把她抱到卧室门口。”
“解开第一颗扣子后停住看她。”
“先抱着她平复心跳。”
【初星正文结束】`;

  const payload = sandbox.extractChoicePayload(sourceText);
  assert.equal(payload.options.length, 4);
  assert.equal(payload.options[0], "“顺着她的呼吸继续吻下去。”");
  assert.doesNotMatch(payload.options.join("\n"), /正文台词/);
});

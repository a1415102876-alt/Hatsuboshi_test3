import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

const stSource = readFileSync(new URL("../st.html", import.meta.url), "utf8");
function readFunction(functionName) {
  const declaration = `function ${functionName}`;
  const start = stSource.indexOf(declaration);
  assert.notEqual(start, -1, `${functionName} must exist`);
  const bodyStart = stSource.indexOf("{", start);
  let depth = 0;
  let quote = null;
  let escaped = false;

  for (let index = bodyStart; index < stSource.length; index += 1) {
    const character = stSource[index];
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
      if (depth === 0) return stSource.slice(start, index + 1);
    }
  }
  throw new Error(`Could not parse ${functionName}`);
}

test("st.html in-page bridge handles frontend AI reply acknowledgements", () => {
  assert.match(stSource, /data\.type === 'aiReplyAck'/);
  assert.match(stSource, /function handleReplyAck\(/);
  assert.match(stSource, /function resolveReplyAck\(/);
  assert.match(stSource, /scheduleReplyRetry\(pendingCandidateMessageId\)/);
  assert.match(stSource, /clearPendingReplyRequest\(\)/);
});

test("st.html in-page bridge listens to regenerated or swiped final messages", () => {
  assert.match(stSource, /eventTypes\.MESSAGE_SWIPED/);
  assert.match(stSource, /sendLatestAiReplyToFrame\(messageId, true\)/);
});

test("st.html reply bridge safely reads context and falls back to latest post-prompt AI message", () => {
  assert.match(stSource, /function getSillyTavernGlobal\(/);
  assert.match(stSource, /let pendingPromptChatLength = 0/);
  assert.match(stSource, /function findLatestUsableAiReplyId\(/);
  assert.match(stSource, /rawText = typeof message\.mes === '.*?' \? message\.mes : '.*?';/);
  assert.match(stSource, /Math\.max\(1, pendingPromptChatLength\)/);
  assert.match(stSource, /const replyMessageId = findLatestUsableAiReplyId\(messageId\)/);
});

test("transactional generation owns its reply until the explicit committed result arrives", () => {
  const forwarded = [];
  const sendLatest = new Function(
    "pendingRequestId",
    "transactionalReplyRequestId",
    "collectAndSendAiReply",
    `${readFunction("sendLatestAiReplyToFrame")}; return sendLatestAiReplyToFrame;`
  )("request-current", "request-current", (...args) => forwarded.push(args));

  sendLatest(12, true, "host_ended_empty");
  assert.deepEqual(forwarded, []);
  assert.match(readFunction("runTransactionalPrompt"), /transactionalReplyRequestId = reqId/);
  assert.match(readFunction("runTransactionalPrompt"), /pendingPromptChatLength = Array\.isArray\(context\.chat\) \? context\.chat\.length : 0/);
  assert.match(readFunction("clearPendingReplyRequest"), /transactionalReplyRequestId = ''/);
});

test("st.html loader uses a responsive mobile viewport instead of a fixed desktop canvas", () => {
  assert.doesNotMatch(stSource, /#hatsu-st-page\s*\{[\s\S]*?width:\s*1180px\s*!important/);
  assert.match(stSource, /--hatsu-viewport-height/);
  assert.match(stSource, /visualViewport/);
  assert.match(stSource, /@media\s*\(max-width:\s*560px\)/);
});

test("st.html pauses floor hiding when the opening floor is not mounted", () => {
  assert.match(stSource, /hatsuboshi-floor-hide-enabled/);
  assert.match(stSource, /querySelector\('\.mes\[mesid="0"\]'\)/);
  assert.match(stSource, /classList\.toggle\('hatsuboshi-floor-hide-enabled', shouldHide\)/);
});

test("st.html remounts the fullscreen overlay if the host removes it", () => {
  assert.match(stSource, /function ensureHatsuOverlayMounted\(/);
  assert.match(stSource, /new MutationObserver/);
  assert.match(stSource, /ensureHatsuOverlayMounted\(\)/);
});

test("st.html removes older Hatsuboshi user prompt floors from chat completion payloads", () => {
  assert.match(stSource, /CHAT_COMPLETION_PROMPT_READY/);
  assert.match(stSource, /function pruneHatsuChatCompletionPayload\(/);
  assert.match(stSource, /isHatsuFrontendPromptMessage/);
  assert.match(stSource, /lastHatsuUserPromptIndex/);
  assert.match(stSource, /eventData\.chat\.splice\(0, eventData\.chat\.length, \.\.\.filtered\)/);
});

test("st.html removes only the earlier copy of the current transactional user prompt", () => {
  const fn = new Function(
    `${readFunction("getChatCompletionMessageText")}
${readFunction("removeCurrentTransactionalDuplicateUserPrompt")}; return removeCurrentTransactionalDuplicateUserPrompt;`
  )();
  const duplicateChat = [
    { role: "user", content: "previous turn" },
    { role: "assistant", content: "previous reply" },
    { role: "user", content: "custom prompt without product marker" },
    { role: "system", content: "preset reminder" },
    { role: "user", content: "custom prompt without product marker" }
  ];

  assert.equal(fn(duplicateChat, "request-1"), true);
  assert.deepEqual(duplicateChat.map(message => message.content), [
    "previous turn",
    "previous reply",
    "preset reminder",
    "custom prompt without product marker"
  ]);

  const distinctChat = [
    { role: "user", content: "current history prompt" },
    { role: "user", content: "different temporary prompt" }
  ];
  assert.equal(fn(distinctChat, "request-2"), false);
  assert.equal(distinctChat.length, 2);
  assert.equal(fn(distinctChat, ""), false);
});

test("st.html loads the gift shop module so the shop/bag entry is available under the bridge", () => {
  assert.match(stSource, /"shop\/gift-shop\.js"/);
  const scriptsBlock = stSource.match(/const WORLD_SCRIPTS = \[([\s\S]*?)\];/);
  assert.ok(scriptsBlock, "WORLD_SCRIPTS array should exist");
  assert.match(scriptsBlock[1], /"shop\/gift-shop\.js"/);
});

test("st.html rewrites avatars and other assets to R2", () => {
  assert.match(stSource, /R2_MEDIA_CDN/);
  assert.match(stSource, /function rewriteAssetsInText\(/);
  assert.match(stSource, /function rewriteAssetRef\(/);
  assert.doesNotMatch(stSource, /isLocalAvatarAsset/);
  assert.match(stSource, /rewriteAssetsInCss/);
  assert.match(stSource, /return withR2MediaVersion\(r2MediaUrl\(normalized\)\)/);
  assert.doesNotMatch(stSource, /return abs\(normalized\)/);
  assert.match(stSource, /sourceText = rewriteAssetsInText\(await modRes\.text\(\)\)/);
  assert.match(stSource, /routeText = rewriteAssetsInText\(await routeRes\.text\(\)\)/);
  assert.match(stSource, /miniLiveCoreText = rewriteAssetsInText\(await miniLiveCoreRes\.text\(\)\)/);
  assert.match(stSource, /function rewriteElementAssetRefs\(/);
  assert.match(stSource, /assetRefObserver\.observe\(page/);
});

test("asset resolver sends every repository asset path form to R2", () => {
  const start = stSource.indexOf("function withR2MediaVersion");
  const end = stSource.indexOf(readFunction("shouldRewriteUrl")) + readFunction("shouldRewriteUrl").length;
  const source = stSource.slice(start, end);
  const helpers = new Function(
    "BASE",
    "window",
    "R2_MEDIA_CDN",
    "R2_MEDIA_VERSION",
    `function abs(path) { return new URL(path, BASE).href; }
${source}
return { rewriteAssetRef, rewriteAssetsInText, rewriteAssetsInCss };`
  )(
    "https://hatsuboshi-test3.vercel.app/",
    {},
    "https://r2.example",
    "test-version"
  );

  for (const path of [
    "./assets/scenes/Producer_Apartment.png",
    "assets/scenes/Producer_Apartment.png",
    "/assets/scenes/Producer_Apartment.png",
    "../assets/scenes/Producer_Apartment.png"
  ]) {
    assert.equal(
      helpers.rewriteAssetRef(path),
      "https://r2.example/assets/scenes/Producer_Apartment.png?v=test-version"
    );
  }
  assert.equal(
    helpers.rewriteAssetRef("https://example.com/assets/external.png"),
    "https://example.com/assets/external.png"
  );
  assert.equal(
    helpers.rewriteAssetRef("./UI/nia-logo.png"),
    "https://hatsuboshi-test3.vercel.app/UI/nia-logo.png"
  );
  assert.match(
    helpers.rewriteAssetsInText('const scene = "./assets/scenes/TV_Studio.png";'),
    /https:\/\/r2\.example\/assets\/scenes\/TV_Studio\.png\?v=test-version/
  );
  assert.match(
    helpers.rewriteAssetsInText('const scene = `\.\/assets\/scenes\/${name}\.png`;'),
    /https:\/\/r2\.example\/assets\/scenes\/\$\{name\}\.png\?v=test-version/
  );
  assert.equal(
    helpers.rewriteAssetsInCss('background:url("../assets/scenes/Aquarium.png") center/cover'),
    'background:url("https://r2.example/assets/scenes/Aquarium.png?v=test-version") center/cover'
  );
});


test("transactional helper ignores generation-ended events for a different request", () => {
  const extractReplyTextFromGenerated = (generated) => {
    if (typeof generated === "string") return generated.trim();
    if (!generated || typeof generated !== "object") return "";
    return String(generated.text || generated.mes || generated.message || generated.content || "").trim();
  };
  const fn = new Function(
    "extractReplyTextFromGenerated",
    `${readFunction("getGenerationPayloadRequestId")}
${readFunction("normalizeGenerationEndedText")}; return normalizeGenerationEndedText;`
  )(extractReplyTextFromGenerated);

  assert.equal(fn({ generation_id: "previous-round", text: "old training reply" }, "current-round"), null);
  assert.equal(fn({ generation_id: "current-round", text: "current rest reply" }, "current-round"), "current rest reply");
  assert.equal(fn("legacy final text", "current-round"), "legacy final text");
});

test("transactional helper only accepts scoped generation-ended payloads", () => {
  const fn = new Function(
    `${readFunction("getGenerationPayloadRequestId")}
${readFunction("isGenerationEndedPayloadForRequest")}; return isGenerationEndedPayloadForRequest;`
  )();

  assert.equal(fn({ generation_id: "current-round", text: "current reply" }, "current-round"), true);
  assert.equal(fn({ generation_id: "previous-round", text: "old reply" }, "current-round"), false);
  assert.equal(fn("unscoped final text", "current-round"), false);
  assert.equal(fn({ text: "unscoped object text" }, "current-round"), false);
});

test("transactional helper scopes TavernHelper's two-argument generation-ended event", () => {
  const fnSource = readFunction("runTransactionalViaTavernHelper");

  assert.match(fnSource, /const endedHandler = \(finalText, generationId\) =>/);
  assert.match(fnSource, /generation_id: generationId/);
  assert.match(fnSource, /text: finalText/);
});

test("transactional helper commits the current user prompt before generation", () => {
  const fnSource = readFunction("runTransactionalViaTavernHelper");
  const createUserIndex = fnSource.indexOf("createSilentChatMessage('user', promptText, reqId)");
  const persistUserIndex = fnSource.indexOf("persistChatSilently()", createUserIndex);
  const generateIndex = fnSource.indexOf("tavernHelper.generate({");
  const createAssistantIndex = fnSource.indexOf("createSilentChatMessage('assistant', generatedText, reqId)");

  assert.notEqual(createUserIndex, -1, "current user prompt must be written into chat");
  assert.notEqual(persistUserIndex, -1, "current user prompt must be persisted before generation");
  assert.ok(createUserIndex < persistUserIndex, "user prompt must be written before persistence");
  assert.ok(persistUserIndex < generateIndex, "lastUserMessage must be current before prompt assembly");
  assert.ok(generateIndex < createAssistantIndex, "assistant floor must only be written after generation");
});

test("transactional helper rolls back its precommitted user prompt when generation fails", () => {
  const fnSource = readFunction("runTransactionalViaTavernHelper");
  const rollbackMatches = fnSource.match(/rollbackSilentUserMessage\(userIndex, reqId\)/g) || [];

  assert.match(fnSource, /userIndex = await createSilentChatMessage\('user', promptText, reqId\)/);
  assert.ok(rollbackMatches.length >= 2, "throwing and empty generation paths must both roll back");
});

test("transactional helper finishes user precommit before subscribing to generation events", () => {
  const fnSource = readFunction("runTransactionalViaTavernHelper");
  const createUserIndex = fnSource.indexOf("createSilentChatMessage('user', promptText, reqId)");
  const persistUserIndex = fnSource.indexOf("persistChatSilently()", createUserIndex);
  const subscribeIndex = fnSource.indexOf("eventSource.on(GEN_ENDED, endedHandler)");

  assert.ok(createUserIndex < persistUserIndex);
  assert.ok(persistUserIndex < subscribeIndex, "generation listener must not survive a failed precommit");
  assert.match(fnSource, /let userIndex = -1/);
  assert.match(fnSource, /if \(userIndex >= 0\) \{[\s\S]*?rollbackSilentUserMessage\(userIndex, reqId\)/);
});

test("transactional helper requires option payloads for choice prompts without rejecting summary tags", () => {
  const fn = new Function(
    `${readFunction("hasCompleteOptionPayload")}
${readFunction("isGeneratedTextCompatibleWithPrompt")}; return isGeneratedTextCompatibleWithPrompt;`
  )();

  const bondPrompt = "[\u521d\u661f\u80b2\u6210\u7cfb\u7edf\uff1a\u5e7f\u7f81\u7eca\u4e8b\u4ef6 - \u7b2c\u4e00\u8f6e\u9009\u62e9]\n<option1>A</option1>";
  const missingOptionsReply = `<story>old interaction closure</story>
<current_event>day summary</current_event>
<summary_intro>previous round</summary_intro>
<tucao>normal tags are allowed</tucao>
<sum>previous interaction summary</sum>`;
  const properChoiceReply = `<story>current bond event</story>
<current_event>bond scene</current_event>
<summary_intro>normal summary intro</summary_intro>
<progress>normal progress</progress>
<tucao>normal comment</tucao>
<option1>A</option1>
<option2>B</option2>
<option3>C</option3>
<option4>D</option4>`;

  assert.equal(fn(bondPrompt, missingOptionsReply), false);
  assert.equal(fn(bondPrompt, properChoiceReply), true);
  assert.equal(fn("plain prompt", missingOptionsReply), true);
});

test("st bridge does not publish an empty assistant placeholder as a final reply", () => {
  const posted = [];
  const committed = [];
  const retries = [];
  const context = {
    chat: [
      { is_user: true, mes: "prompt" },
      { is_user: false, mes: "" }
    ]
  };
  const collect = new Function(
    "getContext",
    "findLatestUsableAiReplyId",
    "getMessageRawText",
    "window",
    "document",
    "scheduleStreamFinalize",
    "scheduleReplyRetry",
    "clearStreamFinalizeTimer",
    "dispatchCommittedReplyEvent",
    "useCommittedReplyEvent",
    "pendingRequestId",
    "pendingCandidateInFlight",
    "pendingCandidateMessageId",
    `${readFunction("collectAndSendAiReply")}; return collectAndSendAiReply;`
  )(
    () => context,
    () => 1,
    () => "",
    {
      parent: { document: { querySelector: () => ({ innerText: "" }) } },
      postMessage: (payload) => posted.push(payload)
    },
    { querySelector: () => null },
    () => {},
    (messageId, delay) => retries.push({ messageId, delay }),
    () => {},
    (payload) => committed.push(payload),
    true,
    "request-current",
    false,
    -1
  );

  collect(1, true);
  assert.deepEqual(posted, []);
  assert.deepEqual(committed, []);
  assert.deepEqual(retries, [{ messageId: 1, delay: 350 }]);
});

test("transactional helper waits after an empty return but exits on an exact empty end event", () => {
  const fnSource = readFunction("runTransactionalViaTavernHelper");
  const lateWaitStart = fnSource.indexOf("if (!generatedText && listening && !endedWithoutText)");
  const lateWaitEnd = fnSource.indexOf("generatedText = extractReplyTextFromGenerated(lateText)", lateWaitStart);
  const lateWait = fnSource.slice(lateWaitStart, lateWaitEnd);

  assert.notEqual(lateWaitStart, -1);
  assert.notEqual(lateWaitEnd, -1);
  assert.match(lateWait, /Promise\.race\(\[\s*endedPromise,\s*timeoutPromise\s*\]\)/);
  assert.match(fnSource, /endedWithoutText = !normalizedText/);
  assert.doesNotMatch(lateWait, /1500/);
});

test("transactional helper commits with its explicit lease after host state changes", async () => {
  const committed = [];
  const chat = [];
  const context = {
    getContext: () => ({ eventSource: null, chat }),
    createSilentChatMessage: async (role, text, requestId) => {
      chat.push({ is_user: role === "user", mes: text, extra: { hatsuRequestId: requestId } });
      return chat.length - 1;
    },
    persistChatSilently: async () => {},
    rollbackSilentUserMessage: () => {},
    extractReplyTextFromGenerated: (value) => String(value || "").trim(),
    isGenerationEndedPayloadForRequest: () => false,
    normalizeGenerationEndedText: () => null,
    isGeneratedTextCompatibleWithPrompt: () => true,
    postCommittedReply: (...args) => committed.push(args),
    setTimeout: (callback) => { callback(); return 0; },
    Promise
  };
  vm.runInNewContext([
    readFunction("runTransactionalViaTavernHelper").replace(/^function /, "async function "),
    "this.runTransactional = runTransactionalViaTavernHelper;"
  ].join("\n"), context);

  await context.runTransactional(
    { generate: async () => "<story>current reply</story>" },
    "current prompt",
    "request-current",
    "lease-current"
  );

  assert.equal(committed.length, 1);
  assert.equal(committed[0][0], "request-current");
  assert.equal(committed[0][2].channelLeaseId, "lease-current");
});

test("silent chat creation forwards optional attempt metadata to exact floor stamping", () => {
  const createSource = readFunction("createSilentChatMessage");
  const stampMatches = createSource.match(/stampTransactionalExtra\(messageId, role, reqId, attempt\)/g) || [];
  assert.match(createSource, /function createSilentChatMessage\(role, text, requestId, attempt\)/);
  assert.ok(stampMatches.length >= 2);
  assert.match(readFunction("stampTransactionalExtra"), /hatsuAttemptKey/);
});

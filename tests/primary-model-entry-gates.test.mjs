import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

const appSource = readFileSync(new URL("../app.js", import.meta.url), "utf8");

function readFunction(source, functionName) {
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

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function makeElement(value = "") {
  return {
    value,
    textContent: "",
    innerHTML: "",
    hidden: false,
    disabled: false,
    classList: { add() {}, remove() {}, toggle() {} }
  };
}

test("owner debug snapshot exposes only redacted lifecycle metadata", () => {
  const context = {
    activeHostSaveScope: "char-1-chat-a"
  };
  vm.runInNewContext([
    "let primaryModelChannelOwner = { requestId: 'hatsu-1234567890abcdef', channelLeaseId: 'secret-lease', ownerKind: 'free_chat', saveScope: 'char-1-chat-a', acquiredAt: 7500 };",
    "const primaryModelChannelDebug = { lastReleaseReason: 'accepted_final', lastReleaseAt: 1, lastRejectReason: 'channel_occupied', lastRejectAt: 2 };",
    readFunction(appSource, "getPrimaryModelChannelOwner"),
    readFunction(appSource, "getPrimaryModelChannelDebugSnapshot"),
    "this.snapshot = getPrimaryModelChannelDebugSnapshot(10000);"
  ].join("\n"), context);

  assert.deepEqual(clone(context.snapshot), {
    ownerKind: "free_chat",
    ageMs: 2500,
    scope: "char-1-chat-a",
    requestIdSuffix: "90abcdef",
    lastReleaseReason: "accepted_final",
    lastRejectReason: "channel_occupied"
  });
  assert.doesNotMatch(JSON.stringify(context.snapshot), /prompt|channelLeaseId|secret-lease|hatsu-1234567890abcdef/iu);
});

test("owner debug reasons change only for an actual reject or exact release", () => {
  const context = {
    clearTimeout() {},
    debugHarnessEvent() {},
    refreshVnDebugView() {},
    showToast() {},
    describePrimaryModelOwner() { return "busy"; }
  };
  vm.runInNewContext([
    "let primaryModelChannelOwner = { requestId: 'req-current', channelLeaseId: 'lease-current', ownerKind: 'manual_prompt', saveScope: 'scope-a', acquiredAt: 1 };",
    "let primaryModelChannelTimeoutId = 1;",
    "const primaryModelChannelDebug = { lastReleaseReason: '', lastReleaseAt: 0, lastRejectReason: '', lastRejectAt: 0 };",
    readFunction(appSource, "releasePrimaryModelChannel"),
    readFunction(appSource, "rejectPrimaryModelDispatch"),
    "this.release = releasePrimaryModelChannel;",
    "this.reject = rejectPrimaryModelDispatch;",
    "this.debugState = primaryModelChannelDebug;"
  ].join("\n"), context);

  assert.equal(context.release("req-current", "lease-old", "stale_reply"), false);
  assert.equal(context.debugState.lastReleaseReason, "");
  context.reject({ requestId: "req-current", ownerKind: "manual_prompt" }, {
    requestId: "req-blocked",
    ownerKind: "free_chat",
    reason: "channel_occupied",
    silent: true
  });
  assert.equal(context.debugState.lastRejectReason, "channel_occupied");
  assert.equal(context.release("req-current", "lease-current", "accepted_final"), true);
  assert.equal(context.debugState.lastReleaseReason, "accepted_final");
});
function makeFreeChatContext({ host = true, acquireOk = true } = {}) {
  const elements = new Map([["freeChatTextarea", makeElement("保留这个闲聊话题")]]);
  const calls = { order: [], saveState: 0, close: 0, openEvent: 0, send: [], reject: 0, fallback: 0, acquire: 0 };
  const context = {
    state: {
      idol: "藤田琴音",
      activeStoryNode: { type: "existing", ready: true },
      lastPrompt: "old prompt",
      lastStory: "old story"
    },
    activeHostSaveScope: "scope-a",
    runtimeSessionEpoch: "session-a",
    document: { getElementById: (id) => elements.get(id) || null },
    showToast() {},
    buildFreeChatPrompt(topic) { calls.order.push("build"); return `prompt:${topic}`; },
    createRequestId() { return "req-free-chat"; },
    isSillyTavernHost() { return host; },
    tryAcquirePrimaryModelChannel(intent) {
      calls.acquire += 1;
      calls.order.push("acquire");
      return acquireOk
        ? { ok: true, owner: { ...intent, channelLeaseId: "lease-free-chat" } }
        : { ok: false, blockingOwner: { requestId: "req-phone", ownerKind: "phone_chat" } };
    },
    rejectPrimaryModelDispatch() { calls.reject += 1; return false; },
    saveState() { calls.saveState += 1; calls.order.push("save"); },
    renderNotebook() { calls.order.push("render"); },
    closeFreeChatOverlay() { calls.close += 1; calls.order.push("close"); },
    buildAiWaitingStory(text) { return text; },
    openEventOverlay() { calls.openEvent += 1; calls.order.push("open"); },
    requestHostPromptSend(...args) { calls.send.push(args); calls.order.push("send"); return host; },
    openAiPromptOverlay() { calls.fallback += 1; calls.order.push("fallback"); }
  };
  vm.runInNewContext([
    "let pendingAiRequestId = 'pending-before';",
    readFunction(appSource, "acquirePrimaryEntryDispatch"),
    readFunction(appSource, "submitFreeChat"),
    "this.submit = submitFreeChat;",
    "this.getPending = () => pendingAiRequestId;"
  ].join("\n"), context);
  return { context, elements, calls };
}

test("free chat occupied rejection preserves state input pending and business UI", () => {
  const { context, elements, calls } = makeFreeChatContext({ acquireOk: false });
  const beforeState = clone(context.state);
  const beforeInput = elements.get("freeChatTextarea").value;

  context.submit();

  assert.deepEqual(clone(context.state), beforeState);
  assert.equal(context.getPending(), "pending-before");
  assert.equal(elements.get("freeChatTextarea").value, beforeInput);
  assert.equal(calls.reject, 1);
  assert.equal(calls.saveState, 0);
  assert.equal(calls.close, 0);
  assert.equal(calls.openEvent, 0);
  assert.equal(calls.send.length, 0);
});

test("free chat successful dispatch passes its formal lease before business writes", () => {
  const { context, calls } = makeFreeChatContext();

  context.submit();

  assert.deepEqual(clone(calls.send[0][2]), {
    channelLeaseId: "lease-free-chat",
    ownerKind: "free_chat"
  });
  assert.ok(calls.order.indexOf("acquire") < calls.order.indexOf("save"));
  assert.ok(calls.order.indexOf("acquire") < calls.order.indexOf("close"));
  assert.ok(calls.order.indexOf("acquire") < calls.order.indexOf("open"));
});

test("free chat local fallback does not acquire an owner", () => {
  const { context, calls } = makeFreeChatContext({ host: false });

  context.submit();

  assert.equal(calls.acquire, 0);
  assert.equal(calls.saveState, 1);
  assert.equal(calls.close, 1);
  assert.equal(calls.openEvent, 1);
  assert.equal(calls.fallback, 1);
});


function makeInteractionContext({ acquireOk = true } = {}) {
  const elements = new Map([
    ["interactionPlotTextarea", makeElement("训练后在商店街偶遇")],
    ["interactionValidation", makeElement()]
  ]);
  const calls = { order: [], saveState: 0, close: 0, openEvent: 0, send: [], reject: 0 };
  const context = {
    state: {
      idol: "藤田琴音",
      activeStoryNode: { type: "existing", ready: true },
      lastPrompt: "old prompt",
      lastStory: "old story"
    },
    activeHostSaveScope: "scope-a",
    runtimeSessionEpoch: "session-a",
    document: { getElementById: (id) => elements.get(id) || null },
    showToast() {},
    buildIdolInteractionPrompt(characters, plot, aiDecides) {
      calls.order.push("build");
      return `prompt:${characters.join(",")}:${plot}:${aiDecides}`;
    },
    createRequestId() { return "req-interaction"; },
    isSillyTavernHost() { return true; },
    tryAcquirePrimaryModelChannel(intent) {
      calls.order.push("acquire");
      return acquireOk
        ? { ok: true, owner: { ...intent, channelLeaseId: "lease-interaction" } }
        : { ok: false, blockingOwner: { requestId: "req-broadcast", ownerKind: "broadcast" } };
    },
    rejectPrimaryModelDispatch() { calls.reject += 1; return false; },
    saveState() { calls.saveState += 1; calls.order.push("save"); },
    renderNotebook() { calls.order.push("render"); },
    closeInteractionOverlay() { calls.close += 1; calls.order.push("close"); },
    buildAiWaitingStory(text) { return text; },
    openEventOverlay() { calls.openEvent += 1; calls.order.push("open"); },
    requestHostPromptSend(...args) { calls.send.push(args); calls.order.push("send"); return true; },
    openAiPromptOverlay() { calls.order.push("fallback"); }
  };
  vm.runInNewContext([
    "let pendingAiRequestId = 'pending-before';",
    "let interactionMode = 'specified';",
    "let selectedInteractionCharacters = new Set(['月村手毬']);",
    readFunction(appSource, "acquirePrimaryEntryDispatch"),
    readFunction(appSource, "submitIdolInteraction"),
    "this.submit = submitIdolInteraction;",
    "this.getPending = () => pendingAiRequestId;",
    "this.getSelected = () => [...selectedInteractionCharacters];"
  ].join("\n"), context);
  return { context, elements, calls };
}

test("idol interaction occupied rejection preserves selection plot state pending and UI", () => {
  const { context, elements, calls } = makeInteractionContext({ acquireOk: false });
  const beforeState = clone(context.state);
  const beforePlot = elements.get("interactionPlotTextarea").value;
  const beforeCharacters = context.getSelected();

  context.submit();

  assert.deepEqual(clone(context.state), beforeState);
  assert.deepEqual(context.getSelected(), beforeCharacters);
  assert.equal(elements.get("interactionPlotTextarea").value, beforePlot);
  assert.equal(context.getPending(), "pending-before");
  assert.equal(calls.reject, 1);
  assert.equal(calls.saveState, 0);
  assert.equal(calls.close, 0);
  assert.equal(calls.openEvent, 0);
  assert.equal(calls.send.length, 0);
});

test("idol interaction successful dispatch passes its formal lease before writes", () => {
  const { context, calls } = makeInteractionContext();

  context.submit();

  assert.deepEqual(clone(calls.send[0][2]), {
    channelLeaseId: "lease-interaction",
    ownerKind: "idol_interaction"
  });
  assert.ok(calls.order.indexOf("acquire") < calls.order.indexOf("save"));
  assert.ok(calls.order.indexOf("acquire") < calls.order.indexOf("close"));
  assert.ok(calls.order.indexOf("acquire") < calls.order.indexOf("open"));
});
function makeAiPromptContext({ phone = false, acquireOk = true, host = true } = {}) {
  const elements = new Map([["aiPromptTextarea", makeElement("保留这段编辑后的提示词")]]);
  const calls = {
    order: [], acquire: 0, reject: 0, saveState: 0, render: 0, close: 0,
    openEvent: 0, hostSend: [], phoneSend: [], notebook: 0, typing: 0, composer: 0
  };
  const context = {
    state: {
      lastPrompt: "old prompt",
      activeStoryNode: phone ? { type: "phonechat", ready: false } : { type: "existing", ready: true },
      phoneChat: { isAwaitingReply: false, pendingRequestId: "phone-before" }
    },
    activeHostSaveScope: "scope-a",
    runtimeSessionEpoch: "session-a",
    document: { getElementById: (id) => elements.get(id) || null },
    showToast() {},
    createRequestId() { return phone ? "req-phone-edit" : "req-manual"; },
    isSillyTavernHost() { return host; },
    tryAcquirePrimaryModelChannel(intent) {
      calls.acquire += 1;
      calls.order.push("acquire");
      return acquireOk
        ? { ok: true, owner: { ...intent, channelLeaseId: phone ? "lease-phone-edit" : "lease-manual" } }
        : { ok: false, blockingOwner: { requestId: "req-busy", ownerKind: "broadcast" } };
    },
    rejectPrimaryModelDispatch() { calls.reject += 1; return false; },
    saveState() { calls.saveState += 1; calls.order.push("save"); },
    renderNotebook() { calls.render += 1; calls.order.push("render"); },
    closeAiPromptOverlay() { calls.close += 1; calls.order.push("close"); },
    setPhoneChatTyping() { calls.typing += 1; calls.order.push("typing"); },
    setPhoneChatComposerEnabled() { calls.composer += 1; calls.order.push("composer"); },
    sendPhoneChatPromptToHost(...args) { calls.phoneSend.push(args); calls.order.push("phoneSend"); return host; },
    requestHostPromptSend(...args) { calls.hostSend.push(args); calls.order.push("hostSend"); return host; },
    openAiPromptOverlay() { calls.order.push("fallback"); },
    openEventOverlay() { calls.openEvent += 1; calls.order.push("open"); },
    openNotebook() { calls.notebook += 1; calls.order.push("notebook"); }
  };
  vm.runInNewContext([
    "let pendingAiRequestId = 'pending-before';",
    readFunction(appSource, "acquirePrimaryEntryDispatch"),
    readFunction(appSource, "submitAiPrompt"),
    "this.submit = submitAiPrompt;",
    "this.getPending = () => pendingAiRequestId;"
  ].join("\n"), context);
  return { context, elements, calls };
}

for (const phone of [false, true]) {
  test(`AI prompt ${phone ? "phone" : "ordinary"} occupied rejection preserves all business state and UI`, () => {
    const { context, elements, calls } = makeAiPromptContext({ phone, acquireOk: false });
    const beforeState = clone(context.state);
    const beforeInput = elements.get("aiPromptTextarea").value;

    context.submit();

    assert.deepEqual(clone(context.state), beforeState);
    assert.equal(context.getPending(), "pending-before");
    assert.equal(elements.get("aiPromptTextarea").value, beforeInput);
    assert.equal(calls.reject, 1);
    assert.equal(calls.saveState, 0);
    assert.equal(calls.render, 0);
    assert.equal(calls.close, 0);
    assert.equal(calls.openEvent, 0);
    assert.equal(calls.hostSend.length, 0);
    assert.equal(calls.phoneSend.length, 0);
    assert.equal(calls.typing, 0);
    assert.equal(calls.composer, 0);
  });
}

test("ordinary AI prompt dispatch passes a manual_prompt lease", () => {
  const { context, calls } = makeAiPromptContext();

  context.submit();

  assert.deepEqual(clone(calls.hostSend[0][2]), {
    channelLeaseId: "lease-manual",
    ownerKind: "manual_prompt"
  });
  assert.ok(calls.order.indexOf("acquire") < calls.order.indexOf("save"));
  assert.ok(calls.order.indexOf("acquire") < calls.order.indexOf("close"));
  assert.ok(calls.order.indexOf("acquire") < calls.order.indexOf("open"));
});

test("phone AI prompt dispatch keeps phone_chat ownership and lease", () => {
  const { context, calls } = makeAiPromptContext({ phone: true });

  context.submit();

  assert.deepEqual(clone(calls.phoneSend[0][2]), {
    channelLeaseId: "lease-phone-edit",
    ownerKind: "phone_chat"
  });
  assert.equal(context.state.phoneChat.isAwaitingReply, true);
  assert.equal(context.state.phoneChat.pendingRequestId, "req-phone-edit");
  assert.ok(calls.order.indexOf("acquire") < calls.order.indexOf("typing"));
});

test("ordinary AI prompt local fallback does not acquire an owner", () => {
  const { context, calls } = makeAiPromptContext({ host: false });

  context.submit();

  assert.equal(calls.acquire, 0);
  assert.equal(calls.saveState, 1);
  assert.equal(calls.close, 1);
  assert.equal(calls.notebook, 1);
});
function makeRegenerationContext({ mode = "ordinary", acquireOk = true, host = true } = {}) {
  const elements = new Map([
    ["eventChoices", makeElement()],
    ["eventStory", makeElement()]
  ]);
  elements.get("eventChoices").innerHTML = "existing choices";
  elements.get("eventStory").textContent = "existing story text";
  elements.get("eventStory").innerHTML = "existing story html";
  const calls = {
    order: [], acquire: 0, reject: 0, saveState: 0, actions: 0, hidden: 0,
    openEvent: 0, promptSend: [], regenerate: [], toasts: []
  };
  const context = {
    state: {
      lastRequestId: "req-reused",
      lastPrompt: "frozen prompt",
      lastStory: "old story",
      selectedChoiceText: "选项 A",
      selectedChoiceRating: "good"
    },
    activeHostSaveScope: "scope-a",
    runtimeSessionEpoch: "session-a",
    document: { getElementById: (id) => elements.get(id) || null },
    isChoicePromptMode() { return mode === "choice_prompt"; },
    isChoiceResolutionMode() { return mode === "choice_resolution"; },
    createRequestId() { return "req-new"; },
    isSillyTavernHost() { return host; },
    tryAcquirePrimaryModelChannel(intent) {
      calls.acquire += 1;
      calls.order.push("acquire");
      return acquireOk
        ? { ok: true, owner: { ...intent, channelLeaseId: "lease-regeneration-new" } }
        : { ok: false, blockingOwner: { requestId: "req-phone", ownerKind: "phone_chat" } };
    },
    rejectPrimaryModelDispatch() { calls.reject += 1; return false; },
    saveState() { calls.saveState += 1; calls.order.push("save"); },
    setEventActionsEnabled() { calls.actions += 1; calls.order.push("actions"); },
    setElementHidden(_id, hidden) { elements.get("eventChoices").hidden = hidden; calls.hidden += 1; calls.order.push("hidden"); },
    formatStoryText(text) { return `formatted:${text}`; },
    openEventOverlay() { calls.openEvent += 1; calls.order.push("open"); },
    requestHostPromptSend(...args) { calls.promptSend.push(args); calls.order.push("promptSend"); return true; },
    requestHostRegeneration(...args) { calls.regenerate.push(args); calls.order.push("regenerate"); return true; },
    openAiPromptOverlay() { calls.order.push("fallback"); },
    showToast(...args) { calls.toasts.push(args); },
    console: { log() {}, warn() {} }
  };
  vm.runInNewContext([
    "let pendingAiRequestId = 'pending-before';",
    readFunction(appSource, "acquirePrimaryEntryDispatch"),
    readFunction(appSource, "triggerRegeneration"),
    "this.trigger = triggerRegeneration;",
    "this.getPending = () => pendingAiRequestId;"
  ].join("\n"), context);
  return { context, elements, calls };
}

test("ordinary regeneration occupied rejection preserves request state and business UI", () => {
  const { context, elements, calls } = makeRegenerationContext({ acquireOk: false });
  const beforeState = clone(context.state);
  const beforeChoices = clone(elements.get("eventChoices"));
  const beforeStory = clone(elements.get("eventStory"));

  context.trigger();

  assert.deepEqual(clone(context.state), beforeState);
  assert.equal(context.getPending(), "pending-before");
  assert.deepEqual(clone(elements.get("eventChoices")), beforeChoices);
  assert.deepEqual(clone(elements.get("eventStory")), beforeStory);
  assert.equal(calls.reject, 1);
  assert.equal(calls.saveState, 0);
  assert.equal(calls.actions, 0);
  assert.equal(calls.openEvent, 0);
  assert.equal(calls.promptSend.length, 0);
  assert.equal(calls.regenerate.length, 0);
});

test("ordinary regeneration reuses the business request id with a fresh exact lease", () => {
  const { context, calls } = makeRegenerationContext();

  context.trigger();

  assert.equal(calls.regenerate[0][0], "req-reused");
  assert.deepEqual(clone(calls.regenerate[0][1]), {
    channelLeaseId: "lease-regeneration-new",
    ownerKind: "regeneration"
  });
  assert.ok(calls.order.indexOf("acquire") < calls.order.indexOf("save"));
  assert.ok(calls.order.indexOf("acquire") < calls.order.indexOf("actions"));
  assert.ok(calls.order.indexOf("acquire") < calls.order.indexOf("open"));
});

test("choice prompt regeneration remains outside the Phase 1.6 entry helper", () => {
  const { context, calls } = makeRegenerationContext({ mode: "choice_prompt" });

  context.trigger();

  assert.equal(calls.acquire, 0);
  assert.equal(calls.promptSend.length, 1);
  assert.equal(calls.promptSend[0].length, 2);
  assert.equal(calls.regenerate.length, 0);
});

test("choice resolution regeneration retains its legacy transport path", () => {
  const { context, calls } = makeRegenerationContext({ mode: "choice_resolution" });

  context.trigger();

  assert.equal(calls.acquire, 0);
  assert.equal(calls.promptSend.length, 0);
  assert.deepEqual(clone(calls.regenerate[0][1]), { ownerKind: "legacy_main" });
});

test("ordinary regeneration local fallback does not acquire an owner", () => {
  const { context, calls } = makeRegenerationContext({ host: false });

  context.trigger();

  assert.equal(calls.acquire, 0);
  assert.equal(calls.regenerate.length, 0);
  assert.equal(calls.toasts.at(-1)[0], "未连接酒馆");
});

test("new migrated owner kinds have stable busy labels", () => {
  const describe = vm.runInNewContext(`(${readFunction(appSource, "describePrimaryModelOwner")})`);
  assert.equal(describe({ ownerKind: "free_chat" }), "担当闲聊正在等待回复");
  assert.equal(describe({ ownerKind: "idol_interaction" }), "偶像互动剧情正在生成");
  assert.equal(describe({ ownerKind: "manual_prompt" }), "编辑后的剧情请求正在生成");
  assert.equal(describe({ ownerKind: "regeneration" }), "剧情正在重新生成");
});
function makeOpeningEntryContext({ acquireOk = true } = {}) {
  const calls = {
    order: [], acquire: 0, debug: 0, unlock: 0, ensure: 0, refresh: 0,
    save: 0, render: 0, close: 0, open: 0, send: [], fallback: 0
  };
  const context = {
    state: {
      idol: "idol-a",
      day: 1,
      affinity: { unlocked: [] },
      activeStoryNode: { type: "existing", ready: true },
      lastPrompt: "old prompt",
      lastStory: "old story",
      eventMode: "none",
      choiceStep: 0,
      bondChoiceRound: 0,
      bondFirstChoiceText: "old",
      pendingOptionTexts: ["old"],
      selectedChoiceText: "old",
      selectedChoiceRating: "old"
    },
    affinityNodes: { 0: { title: "opening", timing: "start" } },
    BOND_80_DAY: 20,
    recordDebugOpeningDispatch() { calls.debug += 1; calls.order.push("debug"); },
    markAffinityUnlocked(threshold) {
      calls.unlock += 1;
      calls.order.push("unlock");
      if (!context.state.affinity.unlocked.includes(threshold)) context.state.affinity.unlocked.push(threshold);
    },
    buildOpeningPrompt() { calls.order.push("build"); return "opening prompt"; },
    buildAffinityPrompt() { throw new Error("threshold zero must use opening prompt"); },
    createRequestId() { calls.order.push("request-id"); return "req-opening"; },
    acquirePrimaryEntryDispatch(requestId, ownerKind) {
      calls.acquire += 1;
      calls.order.push("acquire");
      assert.equal(requestId, "req-opening");
      assert.equal(ownerKind, "opening");
      return acquireOk
        ? { ok: true, owner: { requestId, ownerKind, channelLeaseId: "lease-opening" } }
        : { ok: false, owner: null };
    },
    ensureStateShape() { calls.ensure += 1; calls.order.push("ensure"); context.state.shapeTouched = true; },
    refreshAffinityUnlocks() {
      calls.refresh += 1;
      calls.order.push("refresh");
      if (!context.state.affinity.unlocked.includes(0)) context.state.affinity.unlocked.push(0);
    },
    showToast() { calls.order.push("toast"); },
    specialBondRoutesFor() { return null; },
    saveState() { calls.save += 1; calls.order.push("save"); },
    closeModal() { calls.close += 1; calls.order.push("close"); },
    render() { calls.render += 1; calls.order.push("render"); },
    buildAiWaitingStory(text) { return text; },
    openEventOverlay() { calls.open += 1; calls.order.push("open"); },
    requestHostPromptSend(...args) { calls.send.push(args); calls.order.push("send"); return true; },
    openAiPromptOverlay() { calls.fallback += 1; calls.order.push("fallback"); }
  };
  vm.runInNewContext([
    "let pendingAiRequestId = 'pending-before';",
    readFunction(appSource, "startOpeningStory"),
    readFunction(appSource, "triggerAffinityStory"),
    "this.start = startOpeningStory;",
    "this.trigger = triggerAffinityStory;",
    "this.getPending = () => pendingAiRequestId;"
  ].join("\n"), context);
  return { context, calls };
}

test("start opening rejects an occupied owner before all state and UI writes", () => {
  const { context, calls } = makeOpeningEntryContext({ acquireOk: false });
  const before = clone(context.state);

  context.start();

  assert.deepEqual(clone(context.state), before);
  assert.equal(context.getPending(), "pending-before");
  assert.equal(calls.acquire, 1);
  assert.equal(calls.debug, 0);
  assert.equal(calls.unlock, 0);
  assert.equal(calls.save, 0);
  assert.equal(calls.render, 0);
  assert.equal(calls.open, 0);
  assert.equal(calls.send.length, 0);
});

test("affinity zero rejects an occupied owner before refresh debug state and UI writes", () => {
  const { context, calls } = makeOpeningEntryContext({ acquireOk: false });
  const before = clone(context.state);

  context.trigger(0);

  assert.deepEqual(clone(context.state), before);
  assert.equal(context.getPending(), "pending-before");
  assert.equal(calls.acquire, 1);
  assert.equal(calls.ensure, 0);
  assert.equal(calls.refresh, 0);
  assert.equal(calls.debug, 0);
  assert.equal(calls.save, 0);
  assert.equal(calls.open, 0);
  assert.equal(calls.send.length, 0);
});

test("both opening entries dispatch the opening quiet mode with the formal lease", () => {
  const first = makeOpeningEntryContext();
  first.context.start();
  assert.deepEqual(clone(first.calls.send[0][2]), {
    channelLeaseId: "lease-opening",
    ownerKind: "opening",
    generationMode: "opening_quiet"
  });
  assert.ok(first.calls.order.indexOf("build") < first.calls.order.indexOf("acquire"));
  assert.ok(first.calls.order.indexOf("acquire") < first.calls.order.indexOf("debug"));
  assert.ok(first.calls.order.indexOf("acquire") < first.calls.order.indexOf("unlock"));
  assert.ok(first.calls.order.indexOf("acquire") < first.calls.order.indexOf("save"));

  const second = makeOpeningEntryContext();
  second.context.trigger(0);
  assert.deepEqual(clone(second.calls.send[0][2]), {
    channelLeaseId: "lease-opening",
    ownerKind: "opening",
    generationMode: "opening_quiet"
  });
  assert.ok(second.calls.order.indexOf("build") < second.calls.order.indexOf("acquire"));
  assert.ok(second.calls.order.indexOf("acquire") < second.calls.order.indexOf("ensure"));
  assert.ok(second.calls.order.indexOf("acquire") < second.calls.order.indexOf("debug"));
});

test("opening owner has a dedicated busy label", () => {
  const describe = vm.runInNewContext(`(${readFunction(appSource, "describePrimaryModelOwner")})`);
  assert.notEqual(describe({ ownerKind: "opening" }), describe({ ownerKind: "legacy_main" }));
});

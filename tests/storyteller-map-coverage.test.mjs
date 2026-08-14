import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const appSource = readFileSync(new URL("../app.js", import.meta.url), "utf8");

function readFunction(name) {
  const start = appSource.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `${name} must exist`);
  const parameterEnd = appSource.indexOf(")", start);
  const bodyStart = appSource.indexOf("{", parameterEnd);
  let depth = 0;
  let quote = null;
  let escaped = false;
  for (let index = bodyStart; index < appSource.length; index += 1) {
    const char = appSource[index];
    if (quote) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === quote) quote = null;
      continue;
    }
    if (char === '"' || char === "'" || char === "`") quote = char;
    else if (char === "{") depth += 1;
    else if (char === "}" && --depth === 0) return appSource.slice(start, index + 1);
  }
  throw new Error(`Could not parse ${name}`);
}

function hostContext() {
  return {
    runtimeSessionEpoch: "session-new",
    isHost: true,
    activeHostSaveScope: "scope-a",
    activeStorageKey: "hatsuProduceLocalState:scope-a"
  };
}

function mapTurn(overrides = {}) {
  return {
    turnId: "map-turn-1",
    kind: "map_explore",
    status: "generating",
    stepKind: "arrival",
    action: "map_location",
    locationId: "courtyard",
    locationName: "中庭",
    selectedAction: "",
    settledMinutes: 15,
    requestId: "map-request-old",
    requestIds: ["map-request-old"],
    saveScope: "scope-a",
    storageKey: "hatsuProduceLocalState:scope-a",
    sessionEpoch: "session-old",
    generationPrompt: "frozen map prompt",
    generationPromptLength: 17,
    generationPromptStatus: "captured",
    storytellerCandidateRef: {
      incidentId: "incident:map",
      planId: "plan-a",
      saveScope: "scope-a",
      dayKey: "live+2",
      sourceTurnId: "map-turn-1"
    },
    snapshot: {
      dayKey: "live+2",
      clockMinutes: 600,
      locationId: "",
      pendingAction: ""
    },
    recoveryAttemptCount: 0,
    createdAt: 100,
    updatedAt: 100,
    ...overrides
  };
}

test("beginHarnessMapExploreTurn creates a bounded prepared map turn without business writes", () => {
  const state = {
    freeMode: { postLiveDay: 2, clockMinutes: 600, activeLocationId: null },
    pendingActionContext: null,
    log: [{ action: "existing" }],
    harness: { persistenceRevision: 4, activeTurn: null }
  };
  const before = JSON.stringify({ freeMode: state.freeMode, pendingActionContext: state.pendingActionContext, log: state.log });
  const traces = [];
  const sandbox = {
    state,
    runtimeSessionEpoch: "session-new",
    activeHostSaveScope: "scope-a",
    activeStorageKey: "hatsuProduceLocalState:scope-a",
    Date: { now: () => 500 },
    createHarnessId: () => "map-turn-1",
    getWorldFeedDayKey: () => "live+2",
    getHarnessRecoveryContext: () => hostContext(),
    isHarnessTurnInActiveScope: () => true,
    isHarnessTurnBlocking: () => false,
    recordHarnessTrace: (type, detail) => traces.push({ type, detail }),
    debugHarnessEvent: () => {},
    maybeShowHarnessRecoveryPrompt: () => {},
    showToast: () => {},
    saveState: () => {}
  };
  vm.runInNewContext(`${readFunction("beginHarnessMapExploreTurn")}; this.begin = beginHarnessMapExploreTurn;`, sandbox);
  const result = sandbox.begin("arrival", {
    locationId: "courtyard",
    locationName: "中庭",
    selectedAction: "SECRET LONG ACTION",
    settledMinutes: 15
  });

  assert.deepEqual(JSON.parse(JSON.stringify(result)), { ok: true, turnId: "map-turn-1" });
  assert.equal(state.harness.activeTurn.kind, "map_explore");
  assert.equal(state.harness.activeTurn.status, "prepared");
  assert.equal(state.harness.activeTurn.stepKind, "arrival");
  assert.equal(state.harness.activeTurn.locationId, "courtyard");
  assert.equal(state.harness.activeTurn.generationPrompt, "");
  assert.equal(state.harness.activeTurn.requestId, "");
  assert.equal(JSON.stringify({ freeMode: state.freeMode, pendingActionContext: state.pendingActionContext, log: state.log }), before);
  assert.equal(traces.at(-1).type, "turn.prepared");
});

test("old-session settled or generating map turns transition to recovery", () => {
  const sandbox = {
    isHarnessTurnInActiveScope: () => true,
    isHarnessOrdinaryAction: (action) => ["lesson", "training", "rest"].includes(action)
  };
  const disposition = vm.runInNewContext(`(${readFunction("getHarnessRecoveryDisposition")})`, sandbox);
  assert.equal(disposition(mapTurn({ status: "settled" }), hostContext()), "transition");
  assert.equal(disposition(mapTurn({ status: "generating" }), hostContext()), "transition");
  assert.equal(disposition(mapTurn({ status: "recovery_required" }), hostContext()), "pending");
  assert.equal(disposition(mapTurn({ status: "completed" }), hostContext()), "none");
});

test("map recovery rotates request and lease while preserving turn prompt and candidate", () => {
  const turn = mapTurn({ status: "recovery_required", requestId: "" });
  const state = { harness: { activeTurn: turn }, pendingAiRequestId: "", lastPrompt: "other" };
  const sent = [];
  const sandbox = {
    state,
    runtimeSessionEpoch: "session-new",
    pendingAiRequestId: "",
    aiReplyRetryCount: 2,
    HARNESS_RECOVERY_PROMPT_MAX_LENGTH: 120000,
    Date: { now: () => 900 },
    createRequestId: () => "map-request-new",
    getHarnessRecoveryContext: () => hostContext(),
    isHarnessTurnInActiveScope: () => true,
    isHarnessOrdinaryAction: (action) => ["lesson", "training", "rest"].includes(action),
    getPrimaryModelChannelOwner: () => null,
    tryAcquirePrimaryModelChannel: (intent) => ({ ok: true, owner: { ...intent, channelLeaseId: "map-lease-new" } }),
    rejectPrimaryModelDispatch: () => false,
    appendHarnessRequestId: (ids, id) => [...ids, id],
    requestHostPromptSend: (prompt, requestId, options) => { sent.push({ prompt, requestId, options }); return true; },
    recordHarnessTrace: () => {},
    saveState: () => {},
    render: () => {},
    closeHarnessRecoveryOverlay: () => {},
    openHarnessRecoveryOverlay: () => {},
    openEventOverlay: () => {},
    showToast: () => {}
  };
  vm.runInNewContext([
    readFunction("resolveHarnessRecoveryPrompt"),
    readFunction("hasConflictingHarnessRecoveryFlow"),
    readFunction("returnHarnessRecoveryAttemptToPending"),
    readFunction("retryHarnessNarrativeRecovery"),
    "this.retry = retryHarnessNarrativeRecovery;"
  ].join("\n"), sandbox);

  assert.equal(sandbox.retry(), true);
  assert.equal(state.harness.activeTurn.turnId, "map-turn-1");
  assert.equal(state.harness.activeTurn.requestId, "map-request-new");
  assert.equal(state.harness.activeTurn.kind, "map_explore");
  assert.equal(state.harness.activeTurn.generationPrompt, "frozen map prompt");
  assert.equal(state.harness.activeTurn.storytellerCandidateRef.incidentId, "incident:map");
  assert.deepEqual(JSON.parse(JSON.stringify(sent)), [{
    prompt: "frozen map prompt",
    requestId: "map-request-new",
    options: {
      channelLeaseId: "map-lease-new",
      ownerKind: "map_recovery",
      generationMode: "shujuku_same_layer",
      turnId: "map-turn-1"
    }
  }]);
});

test("a pending map recovery blocks a new ordinary turn before action-key creation", () => {
  const state = { harness: { activeTurn: mapTurn({ status: "recovery_required" }) } };
  let actionKeys = 0;
  let prompts = 0;
  const sandbox = {
    state,
    runtimeSessionEpoch: "session-new",
    activeHostSaveScope: "scope-a",
    activeStorageKey: "hatsuProduceLocalState:scope-a",
    getHarnessRecoveryContext: () => hostContext(),
    isHarnessTurnInActiveScope: () => true,
    isHarnessOrdinaryAction: (action) => ["lesson", "training", "rest"].includes(action),
    isHarnessTurnBlocking: () => false,
    buildHarnessActionKey: () => { actionKeys += 1; return "new"; },
    recordHarnessTrace: () => {},
    maybeShowHarnessRecoveryPrompt: () => { prompts += 1; },
    showToast: () => {},
    saveState: () => {}
  };
  vm.runInNewContext(`${readFunction("beginHarnessProduceAction")}; this.begin = beginHarnessProduceAction;`, sandbox);
  assert.deepEqual(JSON.parse(JSON.stringify(sandbox.begin("training", "Vo"))), { ok: false });
  assert.equal(actionKeys, 0);
  assert.equal(prompts, 1);
});

test("explicit map recovery abandonment retains settlement and expires through the shared candidate hook", () => {
  const turn = mapTurn({ status: "recovery_required", requestId: "" });
  const state = {
    freeMode: { clockMinutes: 615, activeLocationId: "courtyard" },
    log: [{ action: "中庭", result: "+15分" }],
    harness: { activeTurn: turn }
  };
  const before = JSON.stringify({ freeMode: state.freeMode, log: state.log });
  let expired = 0;
  const sandbox = {
    state,
    Date: { now: () => 1000 },
    getHarnessRecoveryContext: () => hostContext(),
    isHarnessTurnInActiveScope: () => true,
    isHarnessOrdinaryAction: (action) => ["lesson", "training", "rest"].includes(action),
    window: { confirm: () => true },
    expireStorytellerCandidateForTurn: () => { expired += 1; },
    recordHarnessTrace: () => {},
    saveState: () => {},
    closeHarnessRecoveryOverlay: () => {},
    render: () => {},
    showToast: () => {}
  };
  vm.runInNewContext(`${readFunction("abandonHarnessNarrativeRecovery")}; this.abandon = abandonHarnessNarrativeRecovery;`, sandbox);
  assert.equal(sandbox.abandon(), true);
  assert.equal(expired, 1);
  assert.equal(state.harness.activeTurn.status, "abandoned");
  assert.equal(JSON.stringify({ freeMode: state.freeMode, log: state.log }), before);
});

test("occupied primary channel rejects map preparation without business mutation", () => {
  const state = {
    freeMode: { postLiveDay: 2, clockMinutes: 600, activeLocationId: null },
    pendingActionContext: null,
    pendingOptionTexts: ["保留"],
    log: [{ action: "existing" }],
    harness: { persistenceRevision: 4, activeTurn: null }
  };
  const before = JSON.stringify(state);
  let beginCalls = 0;
  let acquireCalls = 0;
  const blockingOwner = { requestId: "busy", ownerKind: "phone_chat" };
  const sandbox = {
    state,
    runtimeSessionEpoch: "session-new",
    activeHostSaveScope: "scope-a",
    isSillyTavernHost: () => true,
    getPrimaryModelChannelOwner: () => blockingOwner,
    createRequestId: () => "map-request",
    beginHarnessMapExploreTurn: () => { beginCalls += 1; return { ok: true, turnId: "map-turn" }; },
    tryAcquirePrimaryModelChannel: () => { acquireCalls += 1; return { ok: false, blockingOwner }; },
    rejectPrimaryModelDispatch: () => false
  };
  vm.runInNewContext(`${readFunction("prepareMapExploreDispatch")}; this.prepare = prepareMapExploreDispatch;`, sandbox);
  const result = sandbox.prepare("arrival", { locationId: "courtyard", locationName: "中庭", settledMinutes: 15 });
  assert.equal(result.ok, false);
  assert.equal(beginCalls, 0);
  assert.equal(acquireCalls, 0);
  assert.equal(JSON.stringify(state), before);
});

test("successful map preparation creates one turn and one exact formal lease", () => {
  const state = {
    freeMode: { postLiveDay: 2, clockMinutes: 600, activeLocationId: null },
    harness: { persistenceRevision: 4, activeTurn: null }
  };
  const acquired = [];
  const sandbox = {
    state,
    runtimeSessionEpoch: "session-new",
    activeHostSaveScope: "scope-a",
    isSillyTavernHost: () => true,
    getPrimaryModelChannelOwner: () => null,
    createRequestId: () => "map-request",
    beginHarnessMapExploreTurn: () => {
      state.harness.activeTurn = mapTurn({
        status: "prepared",
        sessionEpoch: "session-new",
        requestId: "",
        requestIds: []
      });
      return { ok: true, turnId: "map-turn-1" };
    },
    tryAcquirePrimaryModelChannel: (intent) => {
      acquired.push(intent);
      return { ok: true, owner: { ...intent, channelLeaseId: "map-lease" } };
    },
    rejectPrimaryModelDispatch: () => false
  };
  vm.runInNewContext(`${readFunction("prepareMapExploreDispatch")}; this.prepare = prepareMapExploreDispatch;`, sandbox);
  const result = sandbox.prepare("arrival", { locationId: "courtyard", locationName: "中庭", settledMinutes: 15 });
  assert.equal(result.ok, true);
  assert.equal(result.requestId, "map-request");
  assert.equal(result.owner.channelLeaseId, "map-lease");
  assert.deepEqual(JSON.parse(JSON.stringify(acquired)), [{
    requestId: "map-request",
    ownerKind: "map_explore",
    turnId: "map-turn-1",
    saveScope: "scope-a",
    sessionEpoch: "session-new"
  }]);
});

test("initial map arrival acquires before time and freezes Storyteller prompt before send", () => {
  const body = readFunction("beginMapLocationExploreSession");
  const prepare = body.indexOf("prepareMapExploreDispatch(");
  const advance = body.indexOf("advanceFreeModeTime(");
  const attach = body.indexOf("attachStorytellerCandidateToMapTurn(");
  const prompt = body.indexOf("getMapExplorePrompt(");
  const capture = body.indexOf("captureHarnessGenerationPrompt(");
  const settled = body.indexOf('markHarnessMapExploreTurn("settled"');
  const generating = body.indexOf('markHarnessMapExploreTurn("generating"');
  const send = body.indexOf("requestHostPromptSend(");
  assert.ok(prepare >= 0 && prepare < advance);
  assert.ok(advance < attach && attach < prompt && prompt < capture);
  assert.ok(capture < settled && settled < generating && generating < send);
  assert.match(body, /channelLeaseId:\s*mapDispatch\.owner\.channelLeaseId/);
  assert.match(body, /ownerKind:\s*"map_explore"/);
});

test("map prompt orders Director Storyteller authority before the final choice contract", () => {
  const body = readFunction("buildMapLocationExplorePrompt");
  const director = body.indexOf("composeWorldDirectorPromptAddendum(");
  const storyteller = body.indexOf("composeStorytellerIncidentPromptAddendum");
  const authority = body.indexOf("composeNarrativeAuthorityContract");
  const renderContract = body.lastIndexOf('galgameRenderContract("choice")');
  const choiceContract = body.lastIndexOf("buildMapExploreChoiceOutputBlock(");
  assert.ok(director >= 0 && director < storyteller);
  assert.ok(storyteller < authority && authority < renderContract);
  assert.ok(renderContract < choiceContract);
});

test("map Storyteller coverage excludes scout side quest return and off-campus facility flows", () => {
  const body = readFunction("shouldUseStorytellerMapHarness");
  const sandbox = {
    isSillyTavernHost: () => true,
    isSandboxScoutActive: () => false,
    FREE_MODE_OUTING_LOCATION_ID: "free_outing"
  };
  const shouldUse = vm.runInNewContext(`(${body})`, sandbox);
  assert.equal(shouldUse({ locationId: "courtyard", isOffCampus: false }), true);
  assert.equal(shouldUse({ locationId: "free_outing", isOffCampus: true }), false);
  assert.equal(shouldUse({ locationId: "courtyard", isReturn: true }), false);
  assert.equal(shouldUse({ locationId: "courtyard", sideQuestSlotIndex: 0 }), false);
  sandbox.isSandboxScoutActive = () => true;
  assert.equal(shouldUse({ locationId: "courtyard" }), false);
});

test("occupied channel preserves an ordinary map option before settlement", () => {
  const state = {
    pendingActionContext: { action: "map_location", actionContext: { locationId: "courtyard" } },
    pendingOptionTexts: ["查看中庭"],
    pendingOptionMinutes: [20],
    selectedChoiceText: "",
    selectedChoiceRating: "",
    eventMode: "choice_prompt",
    choiceStep: 1,
    lastStory: "existing",
    lastDebug: "existing-debug",
    log: [{ action: "existing" }],
    freeMode: { postLiveDay: 2, clockMinutes: 600 }
  };
  const before = JSON.stringify(state);
  let processCalls = 0;
  let timeCalls = 0;
  let nextCalls = 0;
  const sandbox = {
    state,
    shouldUseStorytellerMapHarness: () => true,
    prepareMapExploreDispatch: () => ({ ok: false, reason: "channel_occupied" }),
    resolveMapExploreLocation: () => ({ name: "中庭" }),
    handleSideQuestSceneChoice: () => {},
    resolveMapOptionMinutes: (value) => value,
    processSandboxMainQuestMapChoice: () => { processCalls += 1; },
    advanceFreeModeTime: () => { timeCalls += 1; return { hitDayEnd: false }; },
    formatFreeModeClock: () => "10:00",
    saveState: () => {}, render: () => {}, renderFreeModeStage: () => {}, closeVnChoicesOverlay: () => {},
    isFreeModeTravelAllowed: () => true,
    maybeTriggerEveningGoHomePrompt: () => false,
    returnToFreeModeMap: () => {},
    requestNextMapLocationOptions: () => { nextCalls += 1; }
  };
  vm.runInNewContext(`${readFunction("handleMapLocationChoiceSelection")}; this.handle = handleMapLocationChoiceSelection;`, sandbox);
  sandbox.handle(0);
  assert.equal(JSON.stringify(state), before);
  assert.equal(processCalls, 0);
  assert.equal(timeCalls, 0);
  assert.equal(nextCalls, 0);
});

test("occupied channel preserves a custom map action before settlement", () => {
  const state = {
    pendingActionContext: { action: "map_location", actionContext: { locationId: "courtyard" } },
    pendingOptionTexts: ["保留"],
    pendingOptionMinutes: [20],
    selectedChoiceText: "",
    selectedChoiceRating: "",
    eventMode: "choice_prompt",
    choiceStep: 1,
    lastStory: "existing",
    lastDebug: "existing-debug",
    log: [{ action: "existing" }],
    freeMode: { postLiveDay: 2, clockMinutes: 600 }
  };
  const before = JSON.stringify(state);
  let processCalls = 0;
  let timeCalls = 0;
  const sandbox = {
    state,
    FREE_MODE_MAP_CHOICE_MINUTES: 20,
    showToast: () => {},
    shouldUseStorytellerMapHarness: () => true,
    prepareMapExploreDispatch: () => ({ ok: false, reason: "channel_occupied" }),
    resolveMapExploreLocation: () => ({ name: "中庭" }),
    processSandboxMainQuestMapChoice: () => { processCalls += 1; },
    advanceFreeModeTime: () => { timeCalls += 1; return { hitDayEnd: false }; },
    formatFreeModeClock: () => "10:00",
    saveState: () => {}, render: () => {}, renderFreeModeStage: () => {}, closeVnChoicesOverlay: () => {},
    isFreeModeTravelAllowed: () => true,
    maybeTriggerEveningGoHomePrompt: () => false,
    returnToFreeModeMap: () => {},
    requestNextMapLocationOptions: () => {}
  };
  vm.runInNewContext(`${readFunction("handleMapLocationCustomChoice")}; this.handle = handleMapLocationCustomChoice;`, sandbox);
  sandbox.handle("观察喷泉附近的人群");
  assert.equal(JSON.stringify(state), before);
  assert.equal(processCalls, 0);
  assert.equal(timeCalls, 0);
});

test("ordinary option passes its exact dispatch into the next map generation", () => {
  const state = {
    pendingActionContext: { action: "map_location", actionContext: { locationId: "courtyard" } },
    pendingOptionTexts: ["查看中庭"],
    pendingOptionMinutes: [20],
    selectedChoiceText: "",
    selectedChoiceRating: "",
    eventMode: "choice_prompt",
    choiceStep: 1,
    lastStory: "existing",
    log: [],
    freeMode: { postLiveDay: 2, clockMinutes: 600 }
  };
  const dispatch = { ok: true, requestId: "map-request", turnId: "map-turn", owner: { channelLeaseId: "map-lease" } };
  const calls = [];
  const sandbox = {
    state,
    shouldUseStorytellerMapHarness: () => true,
    prepareMapExploreDispatch: (stepKind, details) => { calls.push(["prepare", stepKind, details]); return dispatch; },
    resolveMapExploreLocation: () => ({ name: "中庭" }),
    handleSideQuestSceneChoice: () => {},
    resolveMapOptionMinutes: (value) => value,
    processSandboxMainQuestMapChoice: () => { calls.push(["process"]); },
    advanceFreeModeTime: () => { calls.push(["time"]); return { hitDayEnd: false }; },
    formatFreeModeClock: () => "10:20",
    saveState: () => {}, render: () => {}, renderFreeModeStage: () => {}, closeVnChoicesOverlay: () => {},
    isFreeModeTravelAllowed: () => true,
    maybeTriggerEveningGoHomePrompt: () => false,
    returnToFreeModeMap: () => {},
    requestNextMapLocationOptions: (...args) => { calls.push(["next", ...args]); }
  };
  vm.runInNewContext(`${readFunction("handleMapLocationChoiceSelection")}; this.handle = handleMapLocationChoiceSelection;`, sandbox);
  sandbox.handle(0);
  assert.equal(calls[0][0], "prepare");
  assert.equal(calls[1][0], "process");
  assert.equal(calls[2][0], "time");
  const next = calls.find((entry) => entry[0] === "next");
  assert.equal(next[1], dispatch);
  assert.equal(next[2].stepKind, "explore_choice");
  assert.equal(next[2].selectedAction, "查看中庭");
  assert.equal(next[2].settledMinutes, 20);
});

test("next map generation reuses the supplied request and lease", () => {
  const state = {
    pendingActionContext: { action: "map_location", actionContext: { locationId: "courtyard", visitMode: "with_idol" } },
    pendingChoiceRewards: [], pendingOptionTexts: [], pendingOptionMinutes: [],
    selectedChoiceText: "", selectedChoiceRating: "", eventMode: "choice_prompt", choiceStep: 1,
    freeMode: { activeLocationId: "courtyard" }, harness: { persistenceRevision: 5, activeTurn: mapTurn({ status: "prepared", sessionEpoch: "session-new" }) }
  };
  const dispatch = { ok: true, requestId: "map-request", turnId: "map-turn-1", owner: { channelLeaseId: "map-lease" } };
  const marks = [];
  const sends = [];
  let createCalls = 0;
  const sandbox = {
    state,
    pendingAiRequestId: "",
    FREE_MODE_OUTING_LOCATION_ID: "free_outing",
    isMapLocationExploreActive: () => true,
    isSandboxScoutWrapUpPending: () => false,
    isFreeModeTravelAllowed: () => true,
    maybeTriggerEveningGoHomePrompt: () => false,
    resolveMapExploreLocation: () => ({ name: "中庭" }),
    getMapLocationVisitMode: () => "with_idol",
    closeVnChoicesOverlay: () => {},
    isFreeModeOffCampusExplore: () => false,
    attachStorytellerCandidateToMapTurn: () => ({ candidate: { status: "attached" }, reference: { incidentId: "incident:map" } }),
    getMapExplorePrompt: (_locationId, options) => { assert.equal(options.mapStepKind, "explore_choice"); return "frozen prompt"; },
    captureHarnessGenerationPrompt: () => ({ generationPrompt: "frozen prompt", generationPromptLength: 13, generationPromptStatus: "captured" }),
    markHarnessMapExploreTurn: (status, patch) => { marks.push([status, patch]); return true; },
    appendHarnessRequestId: (_ids, requestId) => [requestId],
    createRequestId: () => { createCalls += 1; return "unexpected"; },
    saveState: () => {}, render: () => {}, setEventActionsEnabled: () => {}, setElementHidden: () => {},
    openEventOverlay: () => {}, buildAiWaitingStory: (value) => value,
    requestHostPromptSend: (...args) => { sends.push(args); return true; },
    returnHarnessRecoveryAttemptToPending: () => true,
    openHarnessRecoveryOverlay: () => {}, openAiPromptOverlay: () => {}
  };
  vm.runInNewContext(`${readFunction("requestNextMapLocationOptions")}; this.requestNext = requestNextMapLocationOptions;`, sandbox);
  sandbox.requestNext(dispatch, { stepKind: "explore_choice", selectedAction: "查看中庭", settledMinutes: 20 });
  assert.equal(createCalls, 0);
  assert.deepEqual(marks.map(([status]) => status), ["settled", "generating"]);
  assert.equal(sends.length, 1);
  assert.equal(sends[0][1], "map-request");
  assert.equal(sends[0][2].channelLeaseId, "map-lease");
  assert.equal(sends[0][2].ownerKind, "map_explore");
});

test("only a final complete map choice marks the map turn completed before ACK", () => {
  const applyStart = appSource.indexOf("function applyAiReply(");
  const applyEnd = appSource.indexOf("function sendAiReplyAck(", applyStart);
  const apply = appSource.slice(applyStart, applyEnd);
  const completeBranchStart = apply.indexOf("if (story && opt1 && opt2 && opt3 && opt4)");
  const incompleteBranchStart = apply.indexOf("// 完结了但选项格式缺失", completeBranchStart);
  const completeBranch = apply.slice(completeBranchStart, incompleteBranchStart);
  const mark = completeBranch.indexOf('markHarnessMapExploreTurn("completed"');
  const ack = completeBranch.indexOf("sendAiReplyAck(requestId, true, false)");
  assert.ok(mark >= 0 && mark < ack);
  assert.match(completeBranch, /state\.pendingActionContext\?\.action === "map_location"/);
  assert.match(completeBranch, /if \(!isFinal\)[\s\S]*return;/);
});

test("an incomplete final map choice returns to recovery and is not accepted", () => {
  const applyStart = appSource.indexOf("function applyAiReply(");
  const applyEnd = appSource.indexOf("function sendAiReplyAck(", applyStart);
  const apply = appSource.slice(applyStart, applyEnd);
  const incompleteBranchStart = apply.indexOf("// 完结了但选项格式缺失");
  const incompleteBranch = apply.slice(incompleteBranchStart, apply.indexOf("// ==========================================", incompleteBranchStart));
  assert.match(incompleteBranch, /returnHarnessRecoveryAttemptToPending\(requestId, "incomplete_choice"\)/);
  assert.match(incompleteBranch, /openHarnessRecoveryOverlay\(state\.harness\.activeTurn\)/);
  assert.match(incompleteBranch, /sendAiReplyAck\(requestId, false, false\)/);
  assert.doesNotMatch(incompleteBranch, /markHarnessMapExploreTurn\("completed"/);
});

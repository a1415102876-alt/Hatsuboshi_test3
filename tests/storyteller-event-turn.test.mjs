import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

const appSource = readFileSync(new URL("../app.js", import.meta.url), "utf8");
const injectionSource = readFileSync(new URL("../world/storyteller/injection.js", import.meta.url), "utf8");

function readFunction(source, name) {
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
    else if (char === "}" && --depth === 0) return source.slice(start, index + 1);
  }
  throw new Error(`Could not parse ${name}`);
}

function candidateFixture(overrides = {}) {
  return {
    incidentId: "incident-secret-a",
    planId: "plan-secret-a",
    saveScope: "chat-a",
    dayKey: "live+2",
    sourceTurnId: "notify:live+2:3480:courtyard",
    category: "visitor",
    severity: "minor",
    archetypeId: "peer_invitation",
    actorIds: ["idol:秦谷美铃"],
    targetIds: ["producer"],
    locationId: "courtyard",
    modifierIds: ["unexpected_question"],
    channel: "invite",
    status: "notified",
    requiresConfirmation: false,
    notification: {
      notifiedAtWorldMinute: 3480,
      deferredUntilWorldMinute: null,
      expiresAtWorldMinute: 4920,
      notificationReason: "open_world_engine"
    },
    ...overrides
  };
}

function stateFixture(candidate = candidateFixture()) {
  return {
    day: 2,
    idol: "秦谷美铃",
    Vo: 100,
    Da: 90,
    Vi: 80,
    stamina: 70,
    stress: 10,
    trust: 20,
    log: [{ action: "existing" }],
    harness: { persistenceRevision: 7, activeTurn: null, trace: [] },
    freeMode: {
      postLiveDay: 2,
      clockMinutes: 600,
      activeLocationId: "courtyard",
      world: {
        storyteller: {
          plan: { planId: "plan-secret-a", dayKey: "live+2", saveScope: "chat-a", status: "committed" },
          pendingCandidate: candidate,
          receipts: []
        }
      }
    }
  };
}

function loadInjectionApi() {
  const context = { globalThis: {} };
  vm.runInNewContext(injectionSource, context);
  return context.globalThis.HatsuWorldStorytellerInjection;
}

test("independent event addendum is bounded narrative-only context", () => {
  const api = loadInjectionApi();
  const prompt = api.composeStorytellerIndependentEventPromptAddendum(candidateFixture(), {
    actorLabels: ["秦谷美铃", "制作人"]
  });

  assert.match(prompt, /visitor|来访|访客|事件/);
  assert.match(prompt, /时间|数值|资源|奖励|惩罚|任务/);
  assert.match(prompt, /不得|不允许/);
  assert.doesNotMatch(prompt, /incident-secret-a|plan-secret-a|chat-a|notify:live\+2|randomSeed|pressure/i);
  assert.ok(prompt.length > 80 && prompt.length <= 2400);
  assert.match(api.composeStorytellerIndependentEventPromptAddendum(
    candidateFixture({ locationId: "producer_apartment" }),
    { actorLabels: ["秦谷美铃", "制作人"] }
  ), /制作人公寓/);
});

test("styled independent event injects an open disturbance without fixed outcomes", () => {
  const api = loadInjectionApi();
  const prompt = api.composeStorytellerIndependentEventPromptAddendum(candidateFixture({
    status: "invited",
    styleId: "romance",
    operatorIds: ["boundary_test"],
    disturbance: {
      styleId: "romance", groundedPremise: "internal premise", triggerFact: "internal trigger",
      immediateConstraint: "公开与私下的边界同时受到检验。", reasonToRespond: "双方必须回应当前期待落差。",
      openQuestions: ["这次回应会被理解为工作安排还是私人偏爱？"],
      forbiddenOutcomes: ["不得直接决定关系升级"]
    }
  }), { actorLabels: ["A", "制作人"] });
  assert.match(prompt, /本轮 Storyteller 风格：恋爱故事/);
  assert.match(prompt, /公开与私下的边界同时受到检验/);
  assert.match(prompt, /开放问题/);
  assert.match(prompt, /不得直接决定关系升级/);
  assert.doesNotMatch(prompt, /boundary_test|internal premise|internal trigger/);
});

test("storyteller event turn preserves exact scope incident and frozen prompt fields", () => {
  const state = stateFixture();
  const context = {
    state,
    globalThis: { HatsuWorldStorytellerIncidents: { normalizeIncidentCandidate: (candidate) => candidate } },
    activeHostSaveScope: "chat-a",
    activeStorageKey: "storage-a",
    runtimeSessionEpoch: "session-new",
    createHarnessId: () => "storyteller-turn-a",
    buildHarnessPreTurnSnapshot: () => ({ marker: "snapshot" }),
    appendHarnessRequestId: (items, requestId) => [...items, requestId].slice(-8),
    recordHarnessTrace: () => {},
    debugHarnessEvent: () => {},
    Date
  };
  vm.runInNewContext(`${readFunction(appSource, "beginHarnessStorytellerEventTurn")}; this.begin = beginHarnessStorytellerEventTurn;`, context);

  const result = context.begin(candidateFixture(), "request-event");
  assert.equal(result.ok, true);
  assert.equal(state.harness.activeTurn.turnId, "storyteller-turn-a");
  assert.equal(state.harness.activeTurn.kind, "storyteller_event");
  assert.equal(state.harness.activeTurn.status, "prepared");
  assert.equal(state.harness.activeTurn.incidentId, "incident-secret-a");
  assert.equal(state.harness.activeTurn.saveScope, "chat-a");
  assert.equal(state.harness.activeTurn.requestId, "request-event");
  assert.deepEqual(state.harness.activeTurn.requestIds, ["request-event"]);
  assert.equal(state.harness.activeTurn.generationPromptStatus, "missing");
});

test("blocked accept leaves state byte-identical before ownership", () => {
  const state = stateFixture();
  const before = JSON.stringify(state);
  const calls = [];
  const context = buildAcceptContext(state, calls, {
    tryAcquirePrimaryModelChannel: () => {
      calls.push("acquire");
      return { ok: false, blockingOwner: { ownerKind: "phone_chat" } };
    }
  });

  assert.equal(context.accept(), false);
  assert.equal(JSON.stringify(state), before);
  assert.deepEqual(calls, ["acquire", "reject"]);
});

test("accept acquires before mutation and sends one frozen event prompt", () => {
  const state = stateFixture();
  const calls = [];
  const context = buildAcceptContext(state, calls);

  assert.equal(context.accept(), true);
  assert.deepEqual(calls, ["acquire", "trace:turn.prepared", "build-prompt", "capture", "trace:turn.generating", "save", "render-home", "render-world", "open-overlay", "send"]);
  assert.equal(state.freeMode.world.storyteller.pendingCandidate.status, "invited");
  assert.equal(state.harness.activeTurn.turnId, "storyteller-turn-a");
  assert.equal(state.harness.activeTurn.kind, "storyteller_event");
  assert.equal(state.harness.activeTurn.status, "generating");
  assert.equal(state.harness.activeTurn.requestId, "request-event");
  assert.equal(state.harness.activeTurn.generationPrompt, "FROZEN EVENT PROMPT");
  assert.equal(context.sent.ownerKind, "storyteller_event");
  assert.equal(context.sent.channelLeaseId, "lease-event");
  assert.equal(context.sent.turnId, "storyteller-turn-a");
});

test("major accept opens confirmation without request owner prompt or state mutation", () => {
  const state = stateFixture(candidateFixture({
    definitionId: "major_visitor_authority_arrival",
    severity: "major",
    archetypeId: "authority_arrival",
    requiresConfirmation: true
  }));
  const before = JSON.stringify(state);
  const calls = [];
  const context = buildAcceptContext(state, calls, {
    openStorytellerMajorConfirmation(mode) { calls.push(`confirm:${mode}`); return true; },
    createRequestId() { calls.push("request-id"); return "request-event"; },
    tryAcquirePrimaryModelChannel() { calls.push("acquire"); return { ok: false }; },
    buildStorytellerIndependentEventPrompt() { calls.push("build-prompt"); return "PROMPT"; }
  });

  assert.equal(context.accept(), true);
  assert.equal(JSON.stringify(state), before);
  assert.deepEqual(calls, ["confirm:accept"]);
});

test("confirmed major accept revalidates before request identity acquire and mutation", () => {
  const state = stateFixture(candidateFixture({
    definitionId: "major_visitor_authority_arrival",
    severity: "major",
    archetypeId: "authority_arrival",
    requiresConfirmation: true
  }));
  const calls = [];
  const context = buildAcceptContext(state, calls, {
    buildStorytellerIncidentContext() { calls.push("context"); return { marker: "current" }; },
    createRequestId() { calls.push("request-id"); return "request-event"; },
    createHarnessId() { calls.push("turn-id"); return "storyteller-turn-a"; },
    closeStorytellerMajorConfirmation() { calls.push("close-confirm"); return true; }
  }, {
    revalidateIncidentCandidate(candidate, current, options) {
      calls.push("revalidate");
      assert.equal(current.marker, "current");
      assert.deepEqual(JSON.parse(JSON.stringify(options)), { requiredChannel: "invite", allowMajorConfirmation: true });
      return { valid: true, reason: "valid", candidate };
    }
  });
  context.setConfirmationMode("accept");

  assert.equal(context.confirmMajor(), true);
  assert.ok(calls.indexOf("context") < calls.indexOf("revalidate"));
  assert.ok(calls.indexOf("revalidate") < calls.indexOf("request-id"));
  assert.ok(calls.indexOf("request-id") < calls.indexOf("acquire"));
  assert.equal(state.freeMode.world.storyteller.pendingCandidate.status, "invited");
  assert.equal(state.harness.activeTurn.status, "generating");
  assert.equal(calls.at(-1), "close-confirm");
});

test("stale major confirmation rejects without identity owner state or dialog mutation", () => {
  const state = stateFixture(candidateFixture({
    definitionId: "major_visitor_authority_arrival",
    severity: "major",
    archetypeId: "authority_arrival",
    requiresConfirmation: true
  }));
  const before = JSON.stringify(state);
  const calls = [];
  const context = buildAcceptContext(state, calls, {
    buildStorytellerIncidentContext() { calls.push("context"); return {}; },
    createRequestId() { calls.push("request-id"); return "request-event"; },
    closeStorytellerMajorConfirmation() { calls.push("close-confirm"); }
  }, {
    revalidateIncidentCandidate() { calls.push("revalidate"); return { valid: false, reason: "candidate_ownership_mismatch" }; }
  });
  context.setConfirmationMode("accept");

  assert.equal(context.confirmMajor(), false);
  assert.equal(JSON.stringify(state), before);
  assert.deepEqual(calls, ["context", "revalidate", "toast"]);
});

test("major ignore opens confirmation without transition save owner or state mutation", () => {
  const state = stateFixture(candidateFixture({
    definitionId: "major_visitor_authority_arrival",
    severity: "major",
    archetypeId: "authority_arrival",
    requiresConfirmation: true
  }));
  const before = JSON.stringify(state);
  const calls = [];
  const context = buildAcceptContext(state, calls, {
    openStorytellerMajorConfirmation(mode) { calls.push(`confirm:${mode}`); return true; }
  });

  assert.equal(context.ignore(), true);
  assert.equal(JSON.stringify(state), before);
  assert.deepEqual(calls, ["confirm:decline"]);
});

test("confirmed major decline expires exact candidate once without owner or Harness turn", () => {
  const state = stateFixture(candidateFixture({
    definitionId: "major_visitor_authority_arrival",
    severity: "major",
    archetypeId: "authority_arrival",
    requiresConfirmation: true
  }));
  const calls = [];
  const context = buildAcceptContext(state, calls, {
    buildStorytellerIncidentContext() { calls.push("context"); return { marker: "current" }; },
    closeStorytellerMajorConfirmation() { calls.push("close-confirm"); return true; }
  }, {
    revalidateIncidentCandidate(candidate) { calls.push("revalidate"); return { valid: true, reason: "valid", candidate }; }
  });
  context.setConfirmationMode("decline");

  assert.equal(context.confirmMajor(), true);
  assert.equal(state.freeMode.world.storyteller.pendingCandidate.status, "expired");
  assert.equal(state.freeMode.world.storyteller.receipts.length, 1);
  assert.equal(state.freeMode.world.storyteller.receipts[0].event, "declined");
  assert.equal(state.harness.activeTurn, null);
  assert.equal(calls.filter((item) => item === "save").length, 1);
  assert.doesNotMatch(calls.join("|"), /acquire|request-id|turn-id|build-prompt|send/);

  context.setConfirmationMode("decline");
  assert.equal(context.confirmMajor(), false);
  assert.equal(state.freeMode.world.storyteller.receipts.length, 1);
  assert.equal(calls.filter((item) => item === "save").length, 1);
});

function buildAcceptContext(state, calls, overrides = {}, incidentOverrides = {}) {
  const context = {
    state,
    globalThis: null,
    activeHostSaveScope: "chat-a",
    activeStorageKey: "storage-a",
    runtimeSessionEpoch: "session-new",
    pendingAiRequestId: "",
    createRequestId: () => "request-event",
    createHarnessId: () => "storyteller-turn-a",
    appendHarnessRequestId: (items, requestId) => [...items, requestId].slice(-8),
    buildHarnessPreTurnSnapshot: () => ({ marker: "snapshot" }),
    getHarnessRecoveryContext: () => ({ isHost: true, activeHostSaveScope: "chat-a", activeStorageKey: "storage-a" }),
    isHarnessTurnInActiveScope: (turn) => turn.saveScope === "chat-a",
    getWorldFeedDayKey: () => "live+2",
    getSecondaryChannelSaveScope: () => "chat-a",
    isSillyTavernHost: () => true,
    tryAcquirePrimaryModelChannel(intent) {
      calls.push("acquire");
      assert.equal(state.harness.activeTurn, null, "acquire must precede activeTurn mutation");
      assert.equal(state.freeMode.world.storyteller.pendingCandidate.status, "notified", "acquire must precede candidate mutation");
      assert.deepEqual(JSON.parse(JSON.stringify(intent)), {
        requestId: "request-event",
        ownerKind: "storyteller_event",
        turnId: "storyteller-turn-a",
        saveScope: "chat-a",
        sessionEpoch: "session-new"
      });
      return { ok: true, owner: { ...intent, channelLeaseId: "lease-event" } };
    },
    rejectPrimaryModelDispatch() { calls.push("reject"); },
    recordHarnessTrace(type) { calls.push(`trace:${type}`); },
    debugHarnessEvent() {},
    buildStorytellerIndependentEventPrompt() { calls.push("build-prompt"); return "FROZEN EVENT PROMPT"; },
    captureHarnessGenerationPrompt(prompt) {
      calls.push("capture");
      return { generationPrompt: prompt, generationPromptLength: prompt.length, generationPromptStatus: "captured" };
    },
    saveState() { calls.push("save"); },
    requestHostPromptSend(prompt, requestId, options) {
      calls.push("send");
      context.sent = { prompt, requestId, ...options };
      assert.equal(state.harness.activeTurn.status, "generating");
      assert.equal(state.freeMode.world.storyteller.pendingCandidate.status, "invited");
      return true;
    },
    releasePrimaryModelChannel() { calls.push("release"); return true; },
    renderPhoneHome() { calls.push("render-home"); },
    renderWorldEnginePhoneApp() { calls.push("render-world"); },
    buildAiWaitingStory: (value) => value,
    openEventOverlay() { calls.push("open-overlay"); },
    showToast() { calls.push("toast"); },
    Date,
    ...overrides
  };
  context.globalThis = {
    HatsuWorldStorytellerIncidents: {
      normalizeIncidentCandidate: (candidate) => candidate,
      ...incidentOverrides
    },
    HatsuWorldStorytellerNotifications: {
      buildStorytellerWorldMinute() { return 3480; },
      buildNotificationReceipt(value) {
        return { event: value.event, reason: value.reason, dayKey: value.dayKey, saveScope: value.saveScope, createdAt: value.createdAt };
      },
      transitionNotification(candidate, action, ownership) {
        assert.equal(ownership.saveScope, candidate.saveScope);
        if (action === "invite") return { ok: true, candidate: { ...candidate, status: "invited" } };
        if (action === "ignore") return { ok: true, candidate: { ...candidate, status: "expired" } };
        return { ok: false, reason: "invalid_transition", candidate };
      }
    }
  };
  const source = [
    readFunction(appSource, "normalizeStorytellerEventConversation"),
    readFunction(appSource, "beginHarnessStorytellerEventTurn"),
    readFunction(appSource, "dispatchAcceptedStorytellerCandidate"),
    readFunction(appSource, "revalidateCurrentStorytellerMajorCandidate"),
    readFunction(appSource, "transitionStorytellerInboxAction"),
    readFunction(appSource, "acceptStorytellerNotification"),
    readFunction(appSource, "ignoreStorytellerNotification"),
    readFunction(appSource, "confirmStorytellerMajorAction"),
    "let storytellerMajorConfirmationMode = '';",
    "this.accept = acceptStorytellerNotification;",
    "this.ignore = ignoreStorytellerNotification;",
    "this.confirmMajor = confirmStorytellerMajorAction;",
    "this.setConfirmationMode = (value) => { storytellerMajorConfirmationMode = value; };"
  ].join("\n");
  vm.runInNewContext(source, context);
  return context;
}

test("event prompt composition keeps Director Storyteller authority and output order", () => {
  const body = readFunction(appSource, "buildStorytellerIndependentEventPrompt");
  const world = body.indexOf("composeWorldSummaryBlock");
  const director = body.indexOf("composeWorldDirectorPromptAddendum");
  const event = body.indexOf("composeStorytellerIndependentEventPromptAddendum");
  const authority = body.indexOf("composeNarrativeAuthorityContract");
  const output = body.indexOf("buildChoiceOnlyExample");
  assert.ok(world >= 0 && world < director && director < event && event < authority && authority < output);
  assert.doesNotMatch(body, /settleAction|advanceFreeModeTime|rollActionEvent|processSandboxQuest/);
  assert.match(body, /option1|buildChoiceOnlyExample|galgameRenderContract\("choice"\)/);
  assert.match(body, /<sum>|剧情小结|概括/);
  assert.doesNotMatch(body, /自然收束，不要输出选项/);
});

function eventReplyState(overrides = {}) {
  const candidate = candidateFixture({ status: "invited" });
  const state = {
    ...stateFixture(candidate),
    pendingAiRequestId: "request-event",
    harness: {
      persistenceRevision: 8,
      trace: [],
      activeTurn: {
        turnId: "storyteller-turn-a",
        kind: "storyteller_event",
        status: "generating",
        action: "storyteller_event",
        incidentId: candidate.incidentId,
        requestId: "request-event",
        requestIds: ["request-old", "request-event"],
        saveScope: "chat-a",
        storageKey: "storage-a",
        sessionEpoch: "session-new",
        storytellerCandidateRef: {
          incidentId: candidate.incidentId,
          planId: candidate.planId,
          saveScope: candidate.saveScope,
          dayKey: candidate.dayKey,
          sourceTurnId: candidate.sourceTurnId
        }
      }
    },
    ...overrides
  };
  state.freeMode.world.storyteller.activeConversation = {
    incidentId: candidate.incidentId,
    planId: candidate.planId,
    saveScope: candidate.saveScope,
    dayKey: candidate.dayKey,
    sourceTurnId: candidate.sourceTurnId,
    turnId: "storyteller-turn-a",
    status: "generating",
    round: 0,
    storySegments: [], summaries: [], choices: [], selectedActions: [],
    lastRequestId: "request-event", lastMessageId: null
  };
  return state;
}

function loadEventRoundCommit(state, options = {}) {
  const context = {
    state,
    globalThis: { HatsuWorldStorytellerIncidents: { normalizeIncidentCandidate: (candidate) => candidate } },
    activeHostSaveScope: "chat-a",
    activeStorageKey: "storage-a",
    runtimeSessionEpoch: "session-new",
    activeInboundPrimaryChannelLeaseId: "lease-event",
    getHarnessRecoveryContext: () => ({ isHost: true, activeHostSaveScope: "chat-a", activeStorageKey: "storage-a" }),
    isHarnessTurnInActiveScope: (turn) => turn.saveScope === "chat-a",
    isPrimaryModelLeaseCurrent: (requestId, leaseId) => requestId === "request-event" && leaseId === "lease-event",
    recordHarnessTrace: () => {},
    debugHarnessEvent: () => {},
    Date,
    ...options
  };
  const source = [
    readFunction(appSource, "normalizeStorytellerEventConversation"),
    readFunction(appSource, "getActiveStorytellerEventConversation"),
    readFunction(appSource, "isStorytellerEventConversationCurrent"),
    readFunction(appSource, "commitStorytellerEventRoundReply"),
    "this.commit = commitStorytellerEventRoundReply;"
  ].join("\n");
  vm.runInNewContext(source, context);
  return context;
}

test("accepted event reply completes one conversation round without resolving the candidate", () => {
  const state = eventReplyState();
  const result = loadEventRoundCommit(state).commit("request-event", {
    story: "美铃在中庭停下脚步，继续说明来意。",
    options: ["先听她说完", "询问具体安排", "确认她的顾虑", "提出另一种做法"]
  }, "美铃在中庭向制作人说明来意。", 42);
  assert.equal(result.accepted, true);
  assert.equal(state.freeMode.world.storyteller.pendingCandidate.status, "invited");
  assert.equal(state.freeMode.world.storyteller.activeConversation.status, "awaiting_choice");
  assert.equal(state.freeMode.world.storyteller.activeConversation.round, 1);
  assert.deepEqual(state.freeMode.world.storyteller.activeConversation.choices, ["先听她说完", "询问具体安排", "确认她的顾虑", "提出另一种做法"]);
  assert.equal(state.freeMode.world.storyteller.activeConversation.lastMessageId, 42);
  assert.equal(state.harness.activeTurn.status, "awaiting_choice");
  assert.equal(state.freeMode.world.storyteller.recentCandidates, undefined);
});

function loadEventEnd(state, calls) {
  const context = {
    state,
    globalThis: {
      HatsuWorldStorytellerIncidents: { normalizeIncidentCandidate: (candidate) => candidate },
      HatsuWorldStorytellerNotifications: {
        transitionNotification(candidate, action) {
          calls.push(`transition:${action}`);
          return action === "resolve" && candidate.status === "invited"
            ? { ok: true, candidate: { ...candidate, status: "resolved" } }
            : { ok: false, reason: "invalid_transition" };
        }
      }
    },
    activeHostSaveScope: "chat-a",
    activeStorageKey: "storage-a",
    getWorldFeedDayKey: () => "live+2",
    formatFreeModeClock: () => "10:00",
    recordStorytellerObservation: () => { calls.push("observation"); return { recorded: true }; },
    commitStorytellerEventConversationDigest: () => { calls.push("digest"); return true; },
    requestStorytellerEventChronicleUpdate: () => { calls.push("chronicle"); return true; },
    recordHarnessTrace: () => {},
    debugHarnessEvent: () => {},
    closeVnChoicesOverlay: () => calls.push("close-choices"),
    hideVnCustomChoicePanel: () => {},
    setElementHidden: () => {},
    saveState: () => calls.push("save"),
    render: () => calls.push("render"),
    renderPhoneHome: () => {},
    renderWorldEnginePhoneApp: () => {},
    updateFreeModeEventButton: () => {},
    Date
  };
  const source = [
    readFunction(appSource, "normalizeStorytellerEventConversation"),
    readFunction(appSource, "getActiveStorytellerEventConversation"),
    readFunction(appSource, "isStorytellerEventConversationCurrent"),
    readFunction(appSource, "clearStorytellerEventConversation"),
    readFunction(appSource, "endStorytellerEventConversation"),
    "this.end = endStorytellerEventConversation;"
  ].join("\n");
  vm.runInNewContext(source, context);
  return context;
}

test("ending an awaiting event conversation resolves exactly once without another model request", () => {
  const state = eventReplyState();
  state.harness.activeTurn.status = "awaiting_choice";
  state.freeMode.world.storyteller.activeConversation = {
    ...state.freeMode.world.storyteller.activeConversation,
    status: "awaiting_choice",
    round: 2,
    storySegments: ["第一段", "第二段"],
    summaries: ["第一轮概括", "第二轮概括"],
    choices: ["A", "B", "C", "D"],
    selectedActions: ["A"],
    lastMessageId: 42
  };
  const calls = [];
  const context = loadEventEnd(state, calls);
  assert.equal(context.end(), true);
  assert.equal(state.freeMode.world.storyteller.pendingCandidate, null);
  assert.equal(state.freeMode.world.storyteller.activeConversation, null);
  assert.equal(state.harness.activeTurn.status, "completed");
  assert.deepEqual(calls.filter((item) => item === "observation" || item === "digest" || item === "chronicle"), ["observation", "digest", "chronicle"]);
  assert.equal(calls.some((item) => item === "send"), false);
  const before = JSON.stringify(state);
  assert.equal(context.end(), false);
  assert.equal(JSON.stringify(state), before);
});

test("event replies commit a conversation round before generic Chronicle handling", () => {
  const applyStart = appSource.indexOf("function applyAiReply(");
  const applyEnd = appSource.indexOf("function isCurrentStorytellerEventReply(", applyStart);
  const apply = appSource.slice(applyStart, applyEnd);
  const eventRoute = apply.indexOf("isCurrentStorytellerEventReply");
  const roundCommit = apply.indexOf("commitStorytellerEventRoundReply");
  const genericChronicle = apply.indexOf("preparePendingDirectorDigestCandidate");
  assert.ok(eventRoute >= 0 && eventRoute < roundCommit && roundCommit < genericChronicle);
  assert.doesNotMatch(appSource, /function settleStorytellerEventForReply|function commitStorytellerEventReply/);
});

test("Storyteller event observations require a completed exact event turn", () => {
  const body = readFunction(appSource, "recordAcceptedFinalStorytellerObservation");
  assert.match(body, /turn\.kind === "storyteller_event"/);
  assert.match(body, /candidateSettlement\?\.resolved/);
});

test("old-session prepared or generating event turns require recovery", () => {
  const context = {
    isHarnessOrdinaryAction: () => false,
    isHarnessTurnInActiveScope: (turn, active) => turn.saveScope === active.activeHostSaveScope
  };
  vm.runInNewContext(`${readFunction(appSource, "getHarnessRecoveryDisposition")}; this.getDisposition = getHarnessRecoveryDisposition;`, context);
  const active = { runtimeSessionEpoch: "session-new", isHost: true, activeHostSaveScope: "chat-a" };
  for (const status of ["prepared", "generating"]) {
    const turn = eventReplyState().harness.activeTurn;
    turn.status = status;
    turn.sessionEpoch = "session-old";
    assert.equal(context.getDisposition(turn, active), "transition", status);
  }
  for (const status of ["completed", "abandoned"]) {
    const turn = eventReplyState().harness.activeTurn;
    turn.status = status;
    turn.sessionEpoch = "session-old";
    assert.equal(context.getDisposition(turn, active), "none", status);
  }
});

test("event recovery preserves turn incident and frozen prompt while rotating request and owner", () => {
  const state = eventReplyState();
  state.harness.activeTurn = {
    ...state.harness.activeTurn,
    status: "recovery_required",
    requestId: "",
    generationPrompt: "frozen storyteller event prompt",
    generationPromptLength: "frozen storyteller event prompt".length,
    generationPromptStatus: "captured",
    requestIds: ["request-event"]
  };
  state.pendingAiRequestId = "";
  const sent = [];
  const sandbox = {
    state,
    globalThis: { HatsuWorldStorytellerIncidents: { normalizeIncidentCandidate: (candidate) => candidate } },
    runtimeSessionEpoch: "session-new",
    pendingAiRequestId: "",
    aiReplyRetryCount: 0,
    HARNESS_RECOVERY_PROMPT_MAX_LENGTH: 120000,
    Date: { now: () => 654321 },
    createRequestId: () => "request-recovery",
    getHarnessRecoveryContext: () => ({ runtimeSessionEpoch: "session-new", isHost: true, activeHostSaveScope: "chat-a", activeStorageKey: "storage-a" }),
    isHarnessTurnInActiveScope: (turn) => turn.saveScope === "chat-a",
    isHarnessOrdinaryAction: () => false,
    getPrimaryModelChannelOwner: () => null,
    tryAcquirePrimaryModelChannel: (intent) => {
      assert.equal(intent.ownerKind, "storyteller_event_recovery");
      assert.equal(intent.turnId, "storyteller-turn-a");
      return { ok: true, owner: { channelLeaseId: "lease-recovery" } };
    },
    rejectPrimaryModelDispatch: () => false,
    requestHostPromptSend: (prompt, requestId, options) => { sent.push({ prompt, requestId, options }); return true; },
    recordHarnessTrace: () => {},
    appendHarnessRequestId: (items, requestId) => [...items, requestId].slice(-8),
    saveState: () => {}, render: () => {}, closeHarnessRecoveryOverlay: () => {},
    openEventOverlay: () => {}, showToast: () => {}
  };
  vm.runInNewContext([
    readFunction(appSource, "normalizeStorytellerEventConversation"),
    readFunction(appSource, "getActiveStorytellerEventConversation"),
    readFunction(appSource, "isStorytellerEventConversationCurrent"),
    readFunction(appSource, "resolveHarnessRecoveryPrompt"),
    readFunction(appSource, "hasConflictingHarnessRecoveryFlow"),
    readFunction(appSource, "retryHarnessNarrativeRecovery"),
    "this.retry = retryHarnessNarrativeRecovery;"
  ].join("\n"), sandbox);

  assert.equal(sandbox.retry(), true);
  assert.equal(state.harness.activeTurn.turnId, "storyteller-turn-a");
  assert.equal(state.harness.activeTurn.incidentId, "incident-secret-a");
  assert.equal(state.harness.activeTurn.requestId, "request-recovery");
  assert.deepEqual(Array.from(state.harness.activeTurn.requestIds), ["request-event", "request-recovery"]);
  assert.equal(state.harness.activeTurn.generationPrompt, "frozen storyteller event prompt");
  assert.equal(state.freeMode.world.storyteller.activeConversation.lastRequestId, "request-recovery");
  assert.equal(sent[0].options.ownerKind, "storyteller_event_recovery");
});

test("event recovery rotates the active conversation request identity with the harness turn", () => {
  const retry = readFunction(appSource, "retryHarnessNarrativeRecovery");
  assert.match(retry, /turn\.kind === "storyteller_event"/);
  assert.match(retry, /storyteller\.activeConversation/);
  assert.match(retry, /lastRequestId:\s*requestId/);
  assert.match(retry, /status:\s*"generating"/);
});

test("event recovery failure returns to recovery_required and timeout uses shared failure path", () => {
  const returnBody = readFunction(appSource, "returnHarnessRecoveryAttemptToPending");
  const failureBody = readFunction(appSource, "handlePrimaryModelChannelFailure");
  assert.match(returnBody, /storyteller_event/);
  assert.match(failureBody, /storyteller_event/);
  assert.match(failureBody, /returnHarnessRecoveryAttemptToPending/);
  assert.doesNotMatch(failureBody, /storyteller_event[\s\S]*status:\s*"failed"/);
});

test("confirmed event abandonment transitions only the exact invited candidate", () => {
  const helper = readFunction(appSource, "abandonStorytellerEventCandidateForTurn");
  const abandon = readFunction(appSource, "abandonHarnessNarrativeRecovery");
  assert.match(abandon, /abandonStorytellerEventCandidateForTurn/);
  assert.match(helper, /transitionNotification\?\.\(candidate, "abandon"/);
  assert.match(helper, /storyteller\.activeConversation = null/);
  assert.doesNotMatch(readFunction(appSource, "closeHarnessRecoveryOverlay"), /abandonStorytellerEventCandidateForTurn|abandoned|state\./);
  assert.doesNotMatch(readFunction(appSource, "closeEventOverlay"), /abandonStorytellerEventCandidateForTurn|abandoned|recovery_required/);
});

test("unresolved event recovery blocks only ordinary and map action entry", () => {
  const produce = readFunction(appSource, "beginHarnessProduceAction");
  const mapStart = appSource.indexOf("function beginHarnessMapExploreTurn(");
  const mapEnd = appSource.indexOf("function beginHarnessStorytellerEventTurn(", mapStart);
  const map = appSource.slice(mapStart, mapEnd);
  assert.match(produce, /recoveryTurn\.kind === "storyteller_event"/);
  assert.match(map, /recoveryTurn\.kind === "storyteller_event"/);
});

test("debug skip returns a storyteller event to recovery before releasing its lease", () => {
  const body = readFunction(appSource, "finishDebugSkippedPrimaryAttempt");
  const pending = body.indexOf("returnHarnessRecoveryAttemptToPending");
  const release = body.indexOf("releasePrimaryModelChannel");
  assert.match(body, /storyteller_event/);
  assert.ok(pending >= 0 && pending < release);
  assert.match(readFunction(appSource, "describePrimaryModelOwner"), /storyteller_event/);
});

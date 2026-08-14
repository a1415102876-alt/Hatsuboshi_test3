import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const appSource = readFileSync(new URL("../app.js", import.meta.url), "utf8");
const htmlSource = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const stSource = readFileSync(new URL("../st.html", import.meta.url), "utf8");
const incidentSource = readFileSync(new URL("../world/storyteller/incidents.js", import.meta.url), "utf8");
const injectionSource = readFileSync(new URL("../world/storyteller/injection.js", import.meta.url), "utf8");

function readFunction(source, functionName) {
  const declaration = `function ${functionName}`;
  const start = source.indexOf(declaration);
  assert.notEqual(start, -1, `${functionName} must exist`);
  const parameterEnd = source.indexOf(")", start);
  const bodyStart = source.indexOf("{", parameterEnd);
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

function loadIncidentApi() {
  const context = { globalThis: {} };
  vm.runInNewContext(incidentSource, context);
  return context.globalThis.HatsuWorldStorytellerIncidents;
}

function loadInjectionApi() {
  const context = { globalThis: {} };
  vm.runInNewContext(injectionSource, context);
  return context.globalThis.HatsuWorldStorytellerInjection;
}

function plan(overrides = {}) {
  return {
    planId: "story:live+2:abc",
    dayKey: "live+2",
    saveScope: "chat-a",
    seed: "live+2|chat-a",
    pacing: "normal",
    status: "committed",
    categoryWeights: {
      hostile: 20,
      environment: 25,
      resource: 30,
      visitor: 45,
      task: 35,
      opportunity: 40
    },
    severityBudget: { minor: 2, moderate: 1, major: 0 },
    diversity: { majorCooldownDays: 2 },
    ...overrides
  };
}

function stateFixture(overrides = {}) {
  return {
    idol: "秦谷美铃",
    gameMode: "sandbox",
    harness: {
      activeTurn: {
        turnId: "turn-1",
        kind: "produce_action",
        status: "prepared",
        action: "training",
        requestId: ""
      }
    },
    freeMode: {
      postLiveDay: 2,
      clockMinutes: 810,
      activeLocationId: "special_education",
      facilityLocationId: "special_education",
      presence: {
        "live+2@special_education": ["月村手毬"]
      },
      world: {
        director: {
          pressures: [{
            id: "pressure:misuzu:attention",
            type: "relationship",
            theme: "attention",
            actorId: "idol:绉﹁胺缇庨搩",
            targetIds: ["producer"],
            stage: "active",
            intensity: 60,
            visibility: "private",
            status: "active",
            dramaticNeed: "must not enter Storyteller context"
          }]
        },
        storyteller: {
          schemaVersion: 2,
          observations: [],
          recentFingerprints: [],
          lastObservedDayKey: "live+2",
          plan: plan(),
          pendingCandidate: null,
          recentCandidates: [],
          receipts: [],
          lastPlanError: "",
          lastCandidateReason: ""
        }
      }
    },
    ...overrides
  };
}

function loadAppHelpers(state, overrides = {}) {
  const api = loadIncidentApi();
  const sandbox = {
    state,
    globalThis: { HatsuWorldStorytellerIncidents: api },
    activeHostSaveScope: "chat-a",
    activeStorageKey: "",
    getSecondaryChannelSaveScope: () => "chat-a",
    getWorldFeedDayKey: () => "live+2",
    canonicalIdolName: (value) => String(value || "").trim(),
    isHarnessOrdinaryAction: (action) => ["lesson", "training", "rest"].includes(action),
    ...overrides
  };
  vm.runInNewContext([
    readFunction(appSource, "buildStorytellerIncidentContext"),
    readFunction(appSource, "prepareStorytellerCandidateForOrdinaryTurn"),
    "this.buildStorytellerIncidentContext = buildStorytellerIncidentContext;",
    "this.prepareStorytellerCandidateForOrdinaryTurn = prepareStorytellerCandidateForOrdinaryTurn;"
  ].join("\n"), sandbox);
  return sandbox;
}

function buildAttachedTurnState() {
  const state = stateFixture();
  const helpers = loadAppHelpers(state);
  const sandbox = { ...helpers, state, globalThis: helpers.globalThis };
  vm.runInNewContext([
    readFunction(appSource, "attachStorytellerCandidateToOrdinaryTurn"),
    "this.attachStorytellerCandidateToOrdinaryTurn = attachStorytellerCandidateToOrdinaryTurn;"
  ].join("\n"), sandbox);
  const attachment = sandbox.attachStorytellerCandidateToOrdinaryTurn("training", "Vo", {}, {
    turnId: "turn-1",
    willGenerateNarrative: true,
    presentActorIds: ["idol:月村手毬"]
  });
  state.harness.activeTurn = {
    ...state.harness.activeTurn,
    status: "completed",
    requestId: "request-new",
    requestIds: ["request-old", "request-new"],
    storytellerCandidateRef: attachment.reference,
    generationPrompt: "FROZEN_PROMPT"
  };
  return { state, attachment };
}

function loadLifecycleHelpers(state, overrides = {}) {
  const sandbox = {
    state,
    globalThis: { HatsuWorldStorytellerIncidents: loadIncidentApi() },
    activeHostSaveScope: "chat-a",
    activeStorageKey: "",
    ...overrides
  };
  vm.runInNewContext([
    readFunction(appSource, "settleStorytellerCandidateForReply"),
    readFunction(appSource, "expireStorytellerCandidateForTurn"),
    "this.settleStorytellerCandidateForReply = settleStorytellerCandidateForReply;",
    "this.expireStorytellerCandidateForTurn = expireStorytellerCandidateForTurn;"
  ].join("\n"), sandbox);
  return sandbox;
}

test("loaders install incidents before app.js in direct and host modes", () => {
  const htmlIncident = htmlSource.indexOf("world/storyteller/incidents.js");
  const htmlApp = htmlSource.indexOf("app.js", htmlIncident);
  const stIncident = stSource.indexOf('"world/storyteller/incidents.js"');
  const stApp = stSource.indexOf("fetch(abs('app.js')", stIncident);
  assert.ok(htmlIncident >= 0 && htmlApp > htmlIncident);
  assert.ok(stIncident >= 0 && stApp > stIncident);
});

test("state shape preserves bounded Storyteller candidate lifecycle fields", () => {
  assert.match(appSource, /pendingCandidate:\s*null/);
  assert.match(appSource, /recentCandidates:\s*\[\]/);
  assert.match(appSource, /receipts:\s*\[\]/);
  assert.match(appSource, /lastCandidateReason:\s*""/);
  assert.match(appSource, /normalizeIncidentCandidate\(storyteller\.pendingCandidate\)/);
});

test("prepare persists one scoped pending candidate without changing business state", () => {
  const state = stateFixture();
  const before = JSON.stringify({
    idol: state.idol,
    clockMinutes: state.freeMode.clockMinutes,
    log: state.log,
    activeTurn: state.harness.activeTurn
  });
  const helpers = loadAppHelpers(state);
  const result = helpers.prepareStorytellerCandidateForOrdinaryTurn("training", "Vo", {
    turnId: "turn-1",
    presentActorIds: ["idol:月村手毬"]
  });

  assert.equal(result.reason, "selected");
  assert.equal(result.candidate.status, "pending");
  assert.equal(state.freeMode.world.storyteller.pendingCandidate.incidentId, result.candidate.incidentId);
  assert.equal(state.freeMode.world.storyteller.lastCandidateReason, "selected");
  assert.equal(JSON.stringify({
    idol: state.idol,
    clockMinutes: state.freeMode.clockMinutes,
    log: state.log,
    activeTurn: state.harness.activeTurn
  }), before);
});

test("incident context passes bounded active Pressure facts without narrative contents", () => {
  const state = stateFixture();
  state.freeMode.world.director.pressures.push({
    id: "pressure:resolved",
    type: "goal",
    theme: "deadline",
    actorId: "idol:绉﹁胺缇庨搩",
    targetIds: [],
    stage: "resolved",
    intensity: 80,
    visibility: "public",
    status: "active"
  });
  const context = loadAppHelpers(state).buildStorytellerIncidentContext("training", "Vo", {
    turnId: "turn-1",
    presentActorIds: ["idol:鏈堟潙鎵嬫"]
  });

  assert.equal("pressureIds" in context, false);
  assert.deepEqual(JSON.parse(JSON.stringify(context.pressureFacts)), [{
    pressureId: "pressure:misuzu:attention",
    type: "relationship",
    theme: "attention",
    actorId: "idol:绉﹁胺缇庨搩",
    targetIds: ["producer"],
    stage: "active",
    intensity: 60,
    visibility: "private"
  }]);
  assert.equal(JSON.stringify(context).includes("must not enter"), false);
});

test("same turn reuses its existing candidate without invoking selection again", () => {
  const state = stateFixture();
  let selections = 0;
  const incidentApi = loadIncidentApi();
  const helpers = loadAppHelpers(state, {
    globalThis: {
      HatsuWorldStorytellerIncidents: {
        ...incidentApi,
        selectIncidentCandidate(input) {
          selections += 1;
          return incidentApi.selectIncidentCandidate(input);
        }
      }
    }
  });
  const first = helpers.prepareStorytellerCandidateForOrdinaryTurn("training", "Vo", {
    turnId: "turn-1",
    presentActorIds: ["idol:月村手毬"]
  });
  const second = helpers.prepareStorytellerCandidateForOrdinaryTurn("training", "Vo", {
    turnId: "turn-1",
    presentActorIds: ["idol:月村手毬"]
  });

  assert.equal(first.candidate.incidentId, second.candidate.incidentId);
  assert.equal(second.reason, "existing_candidate");
  assert.equal(selections, 1);
});

test("an unresolved invite cannot be overwritten by a later attach turn", () => {
  const state = stateFixture();
  const invite = {
    incidentId: "incident:invite-a",
    definitionId: "invite-peer",
    planId: state.freeMode.world.storyteller.plan.planId,
    saveScope: "chat-a",
    dayKey: "live+2",
    dayOrdinal: 2,
    sourceTurnId: "notify:live+2:600:student_store",
    status: "notified",
    channel: "invite",
    category: "visitor",
    severity: "minor",
    archetypeId: "peer_invitation",
    actorIds: ["idol:月村手毬"],
    targetIds: ["producer"],
    locationId: "student_store",
    modifierIds: [],
    fingerprint: "visitor|peer_invitation|idol:月村手毬|student_store|"
  };
  state.freeMode.world.storyteller.pendingCandidate = invite;
  let selections = 0;
  const incidentApi = loadIncidentApi();
  const helpers = loadAppHelpers(state, {
    globalThis: {
      HatsuWorldStorytellerIncidents: {
        ...incidentApi,
        selectIncidentCandidate(input) {
          selections += 1;
          return incidentApi.selectIncidentCandidate(input);
        }
      }
    }
  });
  const before = JSON.stringify(state.freeMode.world.storyteller.pendingCandidate);

  const result = helpers.prepareStorytellerCandidateForOrdinaryTurn("training", "Vo", {
    turnId: "turn-after-invite",
    presentActorIds: ["idol:月村手毬"]
  });

  assert.equal(result.candidate, null);
  assert.equal(result.reason, "candidate_unresolved");
  assert.equal(selections, 0);
  assert.equal(JSON.stringify(state.freeMode.world.storyteller.pendingCandidate), before);
});

test("prepare stores only the bounded selection diagnostic outside the candidate", () => {
  const state = stateFixture();
  const helpers = loadAppHelpers(state);
  const result = helpers.prepareStorytellerCandidateForOrdinaryTurn("training", "Vo", {
    turnId: "turn-1",
    presentActorIds: ["idol:鏈堟潙鎵嬫"]
  });

  assert.deepEqual(
    JSON.parse(JSON.stringify(state.freeMode.world.storyteller.lastSelectionDiagnostic)),
    JSON.parse(JSON.stringify(result.diagnostic))
  );
  assert.equal("diagnostic" in result.candidate, false);
  assert.equal(JSON.stringify(state.freeMode.world.storyteller.lastSelectionDiagnostic).includes("chat-a"), false);
});

test("stale scope day or plan is a no-op and never replaces an existing candidate", () => {
  const cases = [
    { getSecondaryChannelSaveScope: () => "chat-b" },
    { getWorldFeedDayKey: () => "live+3" }
  ];
  for (const overrides of cases) {
    const state = stateFixture();
    const before = JSON.stringify(state);
    const helpers = loadAppHelpers(state, overrides);
    const result = helpers.prepareStorytellerCandidateForOrdinaryTurn("training", "Vo", { turnId: "turn-1" });
    assert.equal(result.candidate, null);
    assert.equal(JSON.stringify(state), before);
  }

  const state = stateFixture();
  state.freeMode.world.storyteller.plan.status = "expired";
  const before = JSON.stringify(state);
  const result = loadAppHelpers(state).prepareStorytellerCandidateForOrdinaryTurn("training", "Vo", { turnId: "turn-1" });
  assert.equal(result.candidate, null);
  assert.equal(JSON.stringify(state), before);
});

test("nonordinary actions and missing turn IDs cannot prepare candidates", () => {
  const state = stateFixture();
  const before = JSON.stringify(state);
  const helpers = loadAppHelpers(state);

  assert.equal(helpers.prepareStorytellerCandidateForOrdinaryTurn("map_location", "", { turnId: "turn-1" }).candidate, null);
  assert.equal(JSON.stringify(state), before);

  const noTurnState = stateFixture({ harness: { activeTurn: null } });
  const noTurnBefore = JSON.stringify(noTurnState);
  assert.equal(loadAppHelpers(noTurnState).prepareStorytellerCandidateForOrdinaryTurn("training", "Vo", { turnId: "" }).candidate, null);
  assert.equal(JSON.stringify(noTurnState), noTurnBefore);
});

test("bounded injection describes a narrative complication without persistence secrets", () => {
  const { composeStorytellerIncidentPromptAddendum } = loadInjectionApi();
  const candidate = loadIncidentApi().selectIncidentCandidate({
    plan: plan(),
    saveScope: "chat-a",
    dayKey: "live+2",
    dayOrdinal: 2,
    sourceTurnId: "turn-1",
    action: "training",
    attribute: "Vo",
    locationId: "special_education",
    assignedActorId: "idol:秦谷美铃",
    presentActorIds: ["idol:月村手毬"],
    pressureIds: [],
    recentFingerprints: [],
    recentCandidates: []
  }).candidate;
  candidate.status = "attached";
  const block = composeStorytellerIncidentPromptAddendum(candidate, {
    action: "training",
    attribute: "Vo"
  });

  assert.match(block, /\[Storyteller 事件骨架\]/);
  assert.match(block, /不得修改已结算数值、时间、任务或资源/);
  assert.match(block, /特别教育栋/);
  assert.equal(block.length <= 2400, true);
  for (const secret of [candidate.randomSeed, candidate.saveScope, candidate.planId, candidate.incidentId]) {
    assert.equal(block.includes(secret), false, secret);
  }
});

test("styled attachment injects an open disturbance without exposing internal ids", () => {
  const { composeStorytellerIncidentPromptAddendum } = loadInjectionApi();
  const candidate = {
    category: "task", severity: "moderate", archetypeId: "unfinished_detail",
    actorIds: ["idol:A"], targetIds: ["producer"], locationId: "producer_classroom",
    modifierIds: ["small_oversight"], channel: "attach", status: "attached", requiresConfirmation: false,
    styleId: "heroic", operatorIds: ["threshold_test"],
    disturbance: {
      styleId: "heroic", groundedPremise: "internal premise", triggerFact: "internal trigger",
      immediateConstraint: "当前方法必须面对一次可观察检验。", reasonToRespond: "人物已经无法忽略该限制。",
      openQuestions: ["她会坚持旧方法，还是寻找新的路径？"],
      forbiddenOutcomes: ["不得决定成功或失败"]
    }
  };
  const block = composeStorytellerIncidentPromptAddendum(candidate, { action: "training" });
  assert.match(block, /本轮 Storyteller 风格：王道故事/);
  assert.match(block, /即时限制：当前方法必须面对一次可观察检验/);
  assert.match(block, /开放问题：她会坚持旧方法/);
  assert.match(block, /禁止预设结果/);
  assert.doesNotMatch(block, /threshold_test|idol:A|internal premise|internal trigger/);
});

test("narrative authority contract keeps deterministic state above Director and Storyteller", () => {
  const { composeNarrativeAuthorityContract } = loadInjectionApi();
  const contract = composeNarrativeAuthorityContract({ hasDirector: true, hasStoryteller: true });
  assert.match(contract, /Director/);
  assert.match(contract, /Storyteller/);
  assert.match(contract, /确定性|前端/);
  assert.equal(composeNarrativeAuthorityContract({ hasDirector: false, hasStoryteller: false }), "");
});

test("ordinary prompt orders settlement Director Storyteller authority and output", () => {
  const body = readFunction(appSource, "buildPrompt");
  const director = body.indexOf("composeWorldDirectorPromptAddendum(");
  const storyteller = body.indexOf("composeStorytellerIncidentPromptAddendum");
  const authority = body.indexOf("composeNarrativeAuthorityContract");
  const output = body.lastIndexOf("outputContract(");
  assert.ok(director >= 0 && director < storyteller);
  assert.ok(storyteller < authority && authority < output);
});

test("injection rejects pending major confirmed and non-attach candidates", () => {
  const { composeStorytellerIncidentPromptAddendum } = loadInjectionApi();
  const base = {
    incidentId: "incident:a",
    planId: "plan-a",
    saveScope: "chat-a",
    dayKey: "live+2",
    sourceTurnId: "turn-1",
    category: "task",
    severity: "minor",
    archetypeId: "unfinished_detail",
    actorIds: ["idol:秦谷美铃"],
    targetIds: ["producer"],
    locationId: "producer_classroom",
    modifierIds: [],
    channel: "attach",
    status: "attached",
    requiresConfirmation: false
  };
  assert.equal(composeStorytellerIncidentPromptAddendum({ ...base, status: "pending" }), "");
  assert.equal(composeStorytellerIncidentPromptAddendum({ ...base, severity: "major" }), "");
  assert.equal(composeStorytellerIncidentPromptAddendum({ ...base, requiresConfirmation: true }), "");
  assert.equal(composeStorytellerIncidentPromptAddendum({ ...base, channel: "phone" }), "");
});

test("ordinary attachment helper transitions only its exact candidate", () => {
  const state = stateFixture();
  const appHelpers = loadAppHelpers(state);
  const sandbox = {
    ...appHelpers,
    state,
    globalThis: appHelpers.globalThis
  };
  vm.runInNewContext([
    readFunction(appSource, "attachStorytellerCandidateToOrdinaryTurn"),
    "this.attachStorytellerCandidateToOrdinaryTurn = attachStorytellerCandidateToOrdinaryTurn;"
  ].join("\n"), sandbox);
  const businessBefore = JSON.stringify({
    clockMinutes: state.freeMode.clockMinutes,
    log: state.log,
    harness: state.harness
  });
  const result = sandbox.attachStorytellerCandidateToOrdinaryTurn("training", "Vo", {}, {
    turnId: "turn-1",
    willGenerateNarrative: true,
    presentActorIds: ["idol:月村手毬"]
  });

  assert.equal(result.candidate.status, "attached");
  assert.equal(result.reference.incidentId, result.candidate.incidentId);
  assert.equal(result.actionContext.storytellerCandidate.incidentId, result.candidate.incidentId);
  assert.equal(state.freeMode.world.storyteller.pendingCandidate.status, "attached");
  assert.equal(JSON.stringify({
    clockMinutes: state.freeMode.clockMinutes,
    log: state.log,
    harness: state.harness
  }), businessBefore);
});

test("attachment helper is a no-op for skipped narrative and unsupported flows", () => {
  const state = stateFixture();
  const appHelpers = loadAppHelpers(state);
  const sandbox = { ...appHelpers, state, globalThis: appHelpers.globalThis };
  vm.runInNewContext([
    readFunction(appSource, "attachStorytellerCandidateToOrdinaryTurn"),
    "this.attachStorytellerCandidateToOrdinaryTurn = attachStorytellerCandidateToOrdinaryTurn;"
  ].join("\n"), sandbox);
  const before = JSON.stringify(state);

  assert.equal(sandbox.attachStorytellerCandidateToOrdinaryTurn("training", "Vo", {}, {
    turnId: "turn-1",
    willGenerateNarrative: false
  }).candidate, null);
  assert.equal(sandbox.attachStorytellerCandidateToOrdinaryTurn("map_location", "", {}, {
    turnId: "turn-1",
    willGenerateNarrative: true
  }).candidate, null);
  assert.equal(JSON.stringify(state), before);
});

test("ordinary settlement selects after deterministic writes and before prompt freeze", () => {
  const start = appSource.indexOf("function settleAction(");
  const end = appSource.indexOf("function createRequestId(", start);
  const settlement = appSource.slice(start, end);
  const deltaWrite = settlement.indexOf("Object.entries(delta).forEach");
  const attach = settlement.indexOf("attachStorytellerCandidateToOrdinaryTurn(");
  const prompt = settlement.indexOf("buildPrompt(action, attribute");
  const capture = settlement.indexOf("captureHarnessGenerationPrompt(prompt)");
  const settled = settlement.indexOf('markHarnessProduceTurn("settled"');

  assert.ok(deltaWrite >= 0 && deltaWrite < attach);
  assert.ok(attach < prompt && prompt < capture && capture < settled);
  assert.match(settlement.slice(settled, settled + 520), /storytellerCandidateRef/);
  assert.match(readFunction(appSource, "buildPrompt"), /composeStorytellerIncidentPromptAddendum/);
});

test("S3 loaders install injection after incidents and before app.js", () => {
  const htmlIncident = htmlSource.indexOf("world/storyteller/incidents.js");
  const htmlInjection = htmlSource.indexOf("world/storyteller/injection.js");
  const htmlApp = htmlSource.indexOf("app.js", htmlInjection);
  const stIncident = stSource.indexOf('"world/storyteller/incidents.js"');
  const stInjection = stSource.indexOf('"world/storyteller/injection.js"');
  const stApp = stSource.indexOf("fetch(abs('app.js')", stInjection);
  assert.ok(htmlIncident >= 0 && htmlIncident < htmlInjection && htmlInjection < htmlApp);
  assert.ok(stIncident >= 0 && stIncident < stInjection && stInjection < stApp);
});

test("accepted final current reply resolves the attached candidate exactly once", () => {
  const { state, attachment } = buildAttachedTurnState();
  const helpers = loadLifecycleHelpers(state);
  const first = helpers.settleStorytellerCandidateForReply("request-new", true, false, true);

  assert.equal(first.resolved, true);
  assert.equal(first.reason, "resolved");
  assert.equal(state.freeMode.world.storyteller.pendingCandidate, null);
  assert.equal(state.freeMode.world.storyteller.recentCandidates.length, 1);
  assert.equal(state.freeMode.world.storyteller.recentCandidates[0].incidentId, attachment.candidate.incidentId);
  assert.equal(state.freeMode.world.storyteller.recentCandidates[0].status, "resolved");
  assert.equal(state.freeMode.world.storyteller.recentFingerprints.includes(attachment.candidate.fingerprint), true);
  assert.equal(state.freeMode.world.storyteller.receipts.length, 1);

  const second = helpers.settleStorytellerCandidateForReply("request-new", true, false, true);
  assert.equal(second.resolved, false);
  assert.equal(state.freeMode.world.storyteller.recentCandidates.length, 1);
  assert.equal(state.freeMode.world.storyteller.receipts.length, 1);
});

test("accepted final completed map reply resolves its exact attached candidate", () => {
  const { state, attachment } = buildAttachedTurnState();
  state.harness.activeTurn = {
    ...state.harness.activeTurn,
    kind: "map_explore",
    action: "map_location",
    stepKind: "explore_choice",
    locationId: "special_education",
    status: "completed"
  };
  const result = loadLifecycleHelpers(state).settleStorytellerCandidateForReply("request-new", true, false, true);
  assert.equal(result.resolved, true);
  assert.equal(state.freeMode.world.storyteller.pendingCandidate, null);
  assert.equal(state.freeMode.world.storyteller.recentCandidates.at(-1).incidentId, attachment.candidate.incidentId);
});

test("stale rejected partial and retry replies never resolve a candidate", () => {
  const attempts = [
    ["request-old", true, false, true],
    ["request-new", false, false, true],
    ["request-new", true, true, true],
    ["request-new", true, false, false]
  ];
  for (const args of attempts) {
    const { state } = buildAttachedTurnState();
    const before = JSON.stringify(state.freeMode.world.storyteller);
    const result = loadLifecycleHelpers(state).settleStorytellerCandidateForReply(...args);
    assert.equal(result.resolved, false, args.join("|"));
    assert.equal(JSON.stringify(state.freeMode.world.storyteller), before, args.join("|"));
  }
});

test("candidate reply gate ignores requestIds audit history", () => {
  const body = readFunction(appSource, "settleStorytellerCandidateForReply");
  assert.doesNotMatch(body, /requestIds/);
  assert.match(body, /turn\.requestId\s*===\s*requestId/);
});

test("recovery keeps the same candidate reference and frozen prompt while rotating requestId", () => {
  const start = appSource.indexOf("function retryHarnessNarrativeRecovery(");
  const end = appSource.indexOf("function abandonHarnessNarrativeRecovery(", start);
  const recovery = appSource.slice(start, end);

  assert.match(recovery, /const requestId = createRequestId\(\)/);
  assert.match(recovery, /\.\.\.turn/);
  assert.match(recovery, /const prompt = resolveHarnessRecoveryPrompt\(turn\)/);
  assert.doesNotMatch(recovery, /prepareStorytellerCandidateForOrdinaryTurn|attachStorytellerCandidateToOrdinaryTurn|buildPrompt\(/);
  assert.doesNotMatch(recovery, /storytellerCandidateRef\s*:/);
});

test("explicit abandonment expires only the exact attached candidate", () => {
  const { state, attachment } = buildAttachedTurnState();
  state.harness.activeTurn.status = "recovery_required";
  const helpers = loadLifecycleHelpers(state);
  const result = helpers.expireStorytellerCandidateForTurn(state.harness.activeTurn, "narrative_abandoned");

  assert.equal(result.expired, true);
  assert.equal(state.freeMode.world.storyteller.pendingCandidate, null);
  assert.equal(state.freeMode.world.storyteller.recentCandidates.at(-1).incidentId, attachment.candidate.incidentId);
  assert.equal(state.freeMode.world.storyteller.recentCandidates.at(-1).status, "expired");
  assert.equal(state.freeMode.world.storyteller.receipts.at(-1).reason, "narrative_abandoned");
});

test("only explicit abandon invokes candidate expiration", () => {
  const abandon = readFunction(appSource, "abandonHarnessNarrativeRecovery");
  const close = readFunction(appSource, "closeEventOverlay");
  const closeRecovery = readFunction(appSource, "closeHarnessRecoveryOverlay");
  assert.match(abandon, /expireStorytellerCandidateForTurn\(turn, "narrative_abandoned"\)/);
  assert.doesNotMatch(close, /expireStorytellerCandidateForTurn/);
  assert.doesNotMatch(closeRecovery, /expireStorytellerCandidateForTurn/);
});

test("accepted-final ACK settles candidate before one bounded Storyteller save", () => {
  const ack = readFunction(appSource, "sendAiReplyAck");
  const settle = ack.indexOf("settleStorytellerCandidateForReply");
  const observation = ack.indexOf("recordAcceptedFinalStorytellerObservation");
  const save = ack.indexOf("saveState(", settle);
  assert.ok(settle >= 0 && settle < observation && observation < save);
  assert.match(ack, /storyteller\.candidate_resolved/);
});

test("accepted-final observation uses the resolved candidate instead of task-minor defaults", () => {
  const state = stateFixture();
  state.harness.activeTurn = {
    turnId: "turn-1",
    kind: "produce_action",
    status: "completed",
    action: "training",
    attribute: "Vo",
    requestId: "request-new",
    saveScope: "chat-a",
    storageKey: ""
  };
  const observations = [];
  const sandbox = {
    state,
    activeHostSaveScope: "chat-a",
    activeStorageKey: "",
    isSillyTavernHost: () => true,
    getHarnessRecoveryContext: () => ({ isHost: true, activeHostSaveScope: "chat-a", activeStorageKey: "" }),
    isHarnessTurnInActiveScope: (turn, context) => turn.saveScope === context.activeHostSaveScope,
    getWorldFeedDayKey: () => "live+2",
    recordStorytellerObservation: (observation) => { observations.push(observation); return { recorded: true }; }
  };
  sandbox.globalThis = sandbox;
  sandbox.HatsuWorldStorytellerStyles = {
    recordCommittedStyle: (streak, styleId) => ({ styleId, committedCount: Number(streak?.committedCount || 0) + 1, penaltyArmed: false })
  };
  state.freeMode.world.storyteller.styleStreak = { styleId: "", committedCount: 0, penaltyArmed: false };
  vm.runInNewContext(`${readFunction(appSource, "recordAcceptedFinalStorytellerObservation")}; this.record = recordAcceptedFinalStorytellerObservation;`, sandbox);
  const result = sandbox.record("request-new", {
    resolved: true,
    candidate: {
      category: "visitor",
      severity: "moderate",
      archetypeId: "peer_observation",
      actorIds: ["idol:A"],
      targetIds: ["producer"],
      locationId: "courtyard",
      fingerprint: "visitor|peer_observation|idol:A|courtyard|public_attention",
      pressureIds: ["pressure-a", "pressure-b"],
      styleId: "heroic",
      operatorIds: ["threshold_test"]
    }
  });
  assert.equal(result.recorded, true);
  assert.equal(observations.length, 1);
  assert.equal(observations[0].sourceKind, "resolved_candidate");
  assert.equal(observations[0].category, "visitor");
  assert.equal(observations[0].severity, "moderate");
  assert.equal(observations[0].archetypeId, "peer_observation");
  assert.equal(observations[0].pressureCount, 2);
  assert.equal(observations[0].styleId, "heroic");
  assert.deepEqual(observations[0].operatorIds, ["threshold_test"]);
  assert.deepEqual(state.freeMode.world.storyteller.styleStreak, {
    styleId: "heroic", committedCount: 1, penaltyArmed: false
  });
});

test("failed observation write cannot update committed style streak", () => {
  const state = stateFixture();
  state.harness.activeTurn = {
    turnId: "turn-1", kind: "produce_action", status: "completed", action: "training",
    requestId: "request-new", saveScope: "chat-a"
  };
  state.freeMode.world.storyteller.styleStreak = { styleId: "heroic", committedCount: 1, penaltyArmed: false };
  const before = JSON.stringify(state.freeMode.world.storyteller.styleStreak);
  const sandbox = {
    state,
    activeHostSaveScope: "chat-a",
    activeStorageKey: "",
    getHarnessRecoveryContext: () => ({ isHost: true, activeHostSaveScope: "chat-a" }),
    isHarnessTurnInActiveScope: () => true,
    getWorldFeedDayKey: () => "live+2",
    recordStorytellerObservation: () => ({ recorded: false, reason: "duplicate_request" })
  };
  sandbox.globalThis = sandbox;
  sandbox.HatsuWorldStorytellerStyles = {
    recordCommittedStyle: () => { throw new Error("must not update streak"); }
  };
  vm.runInNewContext(`${readFunction(appSource, "recordAcceptedFinalStorytellerObservation")}; this.record = recordAcceptedFinalStorytellerObservation;`, sandbox);
  const result = sandbox.record("request-new", {
    resolved: true,
    candidate: { styleId: "heroic", operatorIds: ["threshold_test"], actorIds: [], targetIds: [] }
  });
  assert.equal(result.recorded, false);
  assert.equal(JSON.stringify(state.freeMode.world.storyteller.styleStreak), before);
});

test("unsupported active turns cannot pollute Storyteller observations", () => {
  for (const turn of [
    { turnId: "phone-turn", kind: "phone_chat", status: "completed", action: "phonechat", requestId: "request-new", saveScope: "chat-a" },
    { turnId: "broadcast-turn", kind: "broadcast", status: "completed", action: "broadcast", requestId: "request-new", saveScope: "chat-a" },
    { turnId: "turn-1", kind: "produce_action", status: "generating", action: "training", requestId: "request-new", saveScope: "chat-a" },
    { turnId: "turn-1", kind: "produce_action", status: "completed", action: "training", requestId: "request-old", saveScope: "chat-a" }
  ]) {
    const state = stateFixture({ harness: { activeTurn: turn } });
    let recorded = 0;
    const sandbox = {
      state,
      activeHostSaveScope: "chat-a",
      activeStorageKey: "",
      getHarnessRecoveryContext: () => ({ isHost: true, activeHostSaveScope: "chat-a", activeStorageKey: "" }),
      isHarnessTurnInActiveScope: () => true,
      getWorldFeedDayKey: () => "live+2",
      recordStorytellerObservation: () => { recorded += 1; return { recorded: true }; }
    };
    vm.runInNewContext(`${readFunction(appSource, "recordAcceptedFinalStorytellerObservation")}; this.record = recordAcceptedFinalStorytellerObservation;`, sandbox);
    const result = sandbox.record("request-new", { resolved: false });
    assert.equal(result.recorded, false, turn.kind + ":" + turn.status);
    assert.equal(recorded, 0, turn.kind + ":" + turn.status);
  }
});

test("completed ordinary turn without a candidate records an ambient observation", () => {
  const state = stateFixture({
    harness: {
      activeTurn: {
        turnId: "turn-1",
        kind: "produce_action",
        status: "completed",
        action: "rest",
        requestId: "request-new",
        saveScope: "chat-a"
      }
    }
  });
  const observations = [];
  const sandbox = {
    state,
    activeHostSaveScope: "chat-a",
    activeStorageKey: "",
    getHarnessRecoveryContext: () => ({ isHost: true, activeHostSaveScope: "chat-a", activeStorageKey: "" }),
    isHarnessTurnInActiveScope: () => true,
    getWorldFeedDayKey: () => "live+2",
    recordStorytellerObservation: (observation) => { observations.push(observation); return { recorded: true }; }
  };
  vm.runInNewContext(`${readFunction(appSource, "recordAcceptedFinalStorytellerObservation")}; this.record = recordAcceptedFinalStorytellerObservation;`, sandbox);
  const result = sandbox.record("request-new", { resolved: false });
  assert.equal(result.recorded, true);
  assert.equal(observations[0].sourceKind, "ambient_turn");
  assert.equal(observations[0].category, "");
  assert.equal(observations[0].severity, "");
});

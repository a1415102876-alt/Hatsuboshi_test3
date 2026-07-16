import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

function loadApi() {
  const source = readFileSync(new URL("../world/storyteller/phone-view.js", import.meta.url), "utf8");
  const context = { globalThis: {} };
  vm.runInNewContext(source, context);
  return context.globalThis.HatsuWorldStorytellerPhoneView;
}

test("Storyteller phone view exposes only bounded current plan summaries", () => {
  const api = loadApi();
  const source = {
    plan: {
      planId: "story:live+2:secret-full-id",
      dayKey: "live+2",
      saveScope: "scope-secret",
      seed: "seed-secret",
      pacing: "tense",
      categoryWeights: { hostile: 20, environment: 30, resource: 40, visitor: 50, task: 60, opportunity: 70 },
      severityBudget: { minor: 2, moderate: 1, major: 1 },
      diversity: { avoidCategoryStreak: 2, avoidArchetypeStreak: 2, preferUnusedCategories: true, majorCooldownDays: 2 },
      generatedByJobId: "job-secret",
      status: "committed",
      prompt: "PROMPT SECRET"
    },
    lastPlanError: ""
  };
  const before = JSON.stringify(source);
  const model = JSON.parse(JSON.stringify(api.buildViewModel(source, { currentDayKey: "live+2", currentSaveScope: "scope-secret" })));

  assert.equal(JSON.stringify(source), before);
  assert.equal(model.status, "committed");
  assert.equal(model.pacingLabel, "压力上升");
  assert.equal(model.categories.length, 6);
  assert.deepEqual(model.severityBudget, { minor: 2, moderate: 1, major: 1 });
  assert.match(model.noveltySummary, /未使用类别/);
  assert.doesNotMatch(JSON.stringify(model), /scope-secret|seed-secret|job-secret|PROMPT SECRET|secret-full-id/);
});

test("event audit merges current and recent candidates with budget and channel counts", () => {
  const api = loadApi();
  const source = {
    plan: {
      planId: "plan-SECRET",
      dayKey: "live+2",
      saveScope: "scope-SECRET",
      status: "committed",
      pacing: "normal",
      categoryWeights: {},
      severityBudget: { minor: 4, moderate: 3, major: 0 },
      diversity: {}
    },
    pendingCandidate: {
      incidentId: "incident:attach-a-SECRET", planId: "plan-SECRET", saveScope: "scope-SECRET", dayKey: "live+2",
      sourceTurnId: "turn-a-SECRET", status: "attached", channel: "attach", category: "task", severity: "minor",
      archetypeId: "unfinished_detail", locationId: "producer_classroom", actorIds: ["idol:藤田琴音"],
      modifierIds: ["small_oversight"], styleId: "heroic", prompt: "PROMPT SECRET"
    },
    recentCandidates: [
      {
        incidentId: "incident:attach-a-SECRET", planId: "plan-SECRET", saveScope: "scope-SECRET", dayKey: "live+2",
        sourceTurnId: "turn-a-SECRET", status: "resolved", channel: "attach", category: "task", severity: "minor",
        archetypeId: "unfinished_detail", locationId: "producer_classroom", actorIds: ["idol:藤田琴音"],
        modifierIds: ["small_oversight"], styleId: "heroic"
      },
      {
        incidentId: "incident:attach-b-SECRET", planId: "plan-SECRET", saveScope: "scope-SECRET", dayKey: "live+2",
        sourceTurnId: "turn-b-SECRET", status: "expired", channel: "attach", category: "environment", severity: "moderate",
        archetypeId: "weather_shift", locationId: "courtyard", actorIds: ["idol:月村手毬"],
        modifierIds: ["changing_light"], styleId: "romance"
      },
      {
        incidentId: "incident:invite-c-SECRET", planId: "plan-SECRET", saveScope: "scope-SECRET", dayKey: "live+2",
        sourceTurnId: "notify-c-SECRET", status: "resolved", channel: "invite", category: "visitor", severity: "minor",
        archetypeId: "peer_invitation", locationId: "courtyard", actorIds: ["idol:秦谷美铃"]
      },
      {
        incidentId: "incident:old-day", planId: "old-plan", saveScope: "scope-SECRET", dayKey: "live+1",
        sourceTurnId: "old-turn", status: "resolved", channel: "attach", category: "task", severity: "major"
      }
    ],
    observations: [
      { sourceKind: "resolved_candidate", saveScope: "scope-SECRET", dayKey: "live+2", turnId: "turn-a-SECRET", timeMinutes: 600, actionId: "training", locationId: "producer_classroom" },
      { sourceKind: "resolved_candidate", saveScope: "scope-SECRET", dayKey: "live+2", turnId: "turn-b-SECRET", timeMinutes: 660, actionId: "map_location", locationId: "courtyard" }
    ]
  };
  const model = api.buildViewModel(source, {
    currentDayKey: "live+2",
    currentSaveScope: "scope-SECRET",
    resolveActorLabel: (id) => id.startsWith("idol:") ? id.slice(5) : ""
  });
  const audit = JSON.parse(JSON.stringify(model.eventAudit));

  assert.deepEqual(audit.budget, {
    minor: { used: 2, total: 4 },
    moderate: { used: 1, total: 3 },
    major: { used: 0, total: 0 }
  });
  assert.deepEqual(audit.channels, { attach: 2, invite: 1, phone: 0, sns: 0 });
  assert.equal(audit.attachEvents.length, 2);
  assert.deepEqual(audit.attachEvents.map((row) => row.timeLabel), ["11:00", "10:00"]);
  assert.deepEqual(audit.attachEvents.map((row) => row.statusLabel), ["已过期", "叙事已完成"]);
  assert.match(audit.attachEvents[0].skeletonLabel, /天气变化|现场光线变化/);
  assert.deepEqual(audit.attachEvents[1].actorLabels, ["藤田琴音"]);
  assert.doesNotMatch(JSON.stringify(audit), /SECRET|prompt|saveScope|requestId|leaseId|definitionId|incidentId|sourceTurnId|planId/);
});

test("event audit lists proactive channels and unread state without private motive or IDs", () => {
  const api = loadApi();
  const source = {
    plan: {
      planId: "plan-secret", dayKey: "live+2", saveScope: "scope-secret", status: "committed", pacing: "normal",
      categoryWeights: {}, severityBudget: { minor: 4, moderate: 3, major: 0 }, diversity: {}
    },
    initiative: {
      candidates: [
        {
          incidentId: "initiative:secret-a", intentId: "intent:secret-a", origin: "character_intent",
          planId: "plan-secret", saveScope: "scope-secret", dayKey: "live+2", sourceTurnId: "intent:secret-a",
          status: "pending", channel: "phone", category: "visitor", severity: "minor", archetypeId: "character_initiative",
          actorIds: ["idol:A"], targetIds: ["producer"], locationId: "online",
          delivery: { goal: "Ask about tomorrow's practice", motive: "PRIVATE MOTIVE", visibility: "private", unread: true }
        },
        {
          incidentId: "initiative:secret-b", intentId: "intent:secret-b", origin: "character_intent",
          planId: "plan-secret", saveScope: "scope-secret", dayKey: "live+2", sourceTurnId: "intent:secret-b",
          status: "resolved", channel: "sns", category: "opportunity", severity: "minor", archetypeId: "character_initiative",
          actorIds: ["idol:B"], targetIds: [], locationId: "online",
          delivery: { goal: "Share a public update", motive: "PRIVATE SNS MOTIVE", visibility: "public", unread: false }
        }
      ]
    }
  };
  const audit = JSON.parse(JSON.stringify(api.buildViewModel(source, {
    currentDayKey: "live+2", currentSaveScope: "scope-secret", resolveActorLabel: (id) => id.replace(/^idol:/, "")
  }).eventAudit));
  assert.deepEqual(audit.channels, { attach: 0, invite: 0, phone: 1, sns: 1 });
  assert.equal(audit.initiativeEvents.length, 2);
  assert.equal(audit.unreadPhoneCount, 1);
  assert.match(audit.initiativeEvents[0].summary, /practice|update/);
  assert.doesNotMatch(JSON.stringify(audit), /PRIVATE|secret|incidentId|intentId|sourceTurnId|saveScope|planId/);
});

test("event audit maps live attach states and public empty reasons", () => {
  const api = loadApi();
  const base = {
    plan: {
      planId: "plan-a", dayKey: "live+2", saveScope: "chat-a", status: "committed", pacing: "normal",
      categoryWeights: {}, severityBudget: { minor: 4, moderate: 3, major: 0 }, diversity: {}
    }
  };
  const candidate = {
    incidentId: "incident-a", planId: "plan-a", saveScope: "chat-a", dayKey: "live+2", sourceTurnId: "turn-a",
    channel: "attach", category: "task", severity: "minor", archetypeId: "unfinished_detail",
    locationId: "producer_classroom", actorIds: [], modifierIds: [], styleId: "heroic"
  };
  const options = { currentDayKey: "live+2", currentSaveScope: "chat-a" };
  assert.equal(api.buildViewModel({ ...base, pendingCandidate: { ...candidate, status: "pending" } }, options).eventAudit.attachEvents[0].statusLabel, "待附着");
  assert.equal(api.buildViewModel({ ...base, pendingCandidate: { ...candidate, status: "attached" } }, options).eventAudit.attachEvents[0].statusLabel, "已附着到 Prompt");

  const empty = api.buildViewModel({
    ...base,
    lastCandidateReason: "no_eligible_candidate",
    lastSelectionDiagnostic: { rejectionCounts: { legality: 0, cooldown: 3, diversity: 0, fingerprint: 0 } }
  }, options).eventAudit;
  assert.equal(empty.attachEvents.length, 0);
  assert.match(empty.emptyReason, /冷却/);
});

test("Storyteller phone view hides stale scope or day plans", () => {
  const api = loadApi();
  const storyteller = { plan: { planId: "p", dayKey: "live+1", saveScope: "chat-a", status: "committed" }, lastPlanError: "retry later" };
  const staleScope = api.buildViewModel(storyteller, { currentDayKey: "live+1", currentSaveScope: "chat-b" });
  const staleDay = api.buildViewModel(storyteller, { currentDayKey: "live+2", currentSaveScope: "chat-a" });
  assert.equal(staleScope.status, "stale");
  assert.equal(staleDay.status, "stale");
  assert.deepEqual(JSON.parse(JSON.stringify(staleScope.categories)), []);
  assert.equal(staleScope.lastError, "retry later");
});

test("Storyteller phone view exposes bounded candidate diagnostics with suffix-only identities", () => {
  const api = loadApi();
  const source = {
    plan: {
      planId: "story:live+2:secret-full-plan-id",
      dayKey: "live+2",
      saveScope: "scope-secret",
      pacing: "normal",
      categoryWeights: {},
      severityBudget: {},
      diversity: {},
      status: "committed"
    },
    pendingCandidate: {
      incidentId: "incident:secret-full-abcdef",
      planId: "story:live+2:secret-full-plan-id",
      saveScope: "scope-secret",
      dayKey: "live+2",
      sourceTurnId: "turn:secret-full-123456",
      status: "attached",
      category: "visitor",
      severity: "moderate",
      archetypeId: "peer_observation",
      locationId: "special_education",
      randomSeed: "seed-secret",
      prompt: "PROMPT SECRET",
      reply: "REPLY SECRET"
    },
    recentCandidates: [
      { incidentId: "old-a", saveScope: "scope-secret", dayKey: "live+2", status: "resolved" },
      { incidentId: "old-b", saveScope: "scope-secret", dayKey: "live+2", status: "expired" }
    ],
    lastCandidateReason: "attached"
  };
  const before = JSON.stringify(source);
  const model = JSON.parse(JSON.stringify(api.buildViewModel(source, {
    currentDayKey: "live+2",
    currentSaveScope: "scope-secret",
    activeTurn: {
      turnId: "turn:secret-full-123456",
      kind: "map_explore",
      stepKind: "arrival"
    }
  })));

  assert.equal(JSON.stringify(source), before);
  assert.deepEqual(model.candidate, {
    status: "attached",
    statusLabel: "已附着",
    sourceLabel: "地图抵达",
    categoryLabel: "来访者",
    severityLabel: "中等",
    archetypeLabel: "同伴临时旁观",
    locationLabel: "特别教育栋",
    incidentSuffix: "…abcdef",
    turnSuffix: "…123456",
    lastReason: "attached",
    cooldownCount: 2
  });
  assert.doesNotMatch(JSON.stringify(model), /scope-secret|seed-secret|PROMPT SECRET|REPLY SECRET|secret-full-plan-id|secret-full-abcdef|secret-full-123456/);
});

test("Storyteller phone candidate source labels distinguish ordinary and map exploration", () => {
  const api = loadApi();
  const source = {
    plan: { planId: "plan-a", dayKey: "live+2", saveScope: "chat-a", status: "committed" },
    pendingCandidate: {
      incidentId: "incident:a",
      planId: "plan-a",
      saveScope: "chat-a",
      dayKey: "live+2",
      sourceTurnId: "turn-a",
      status: "attached",
      category: "task",
      severity: "minor",
      archetypeId: "unfinished_detail",
      locationId: "producer_classroom"
    }
  };
  const options = { currentDayKey: "live+2", currentSaveScope: "chat-a" };
  assert.equal(api.buildViewModel(source, {
    ...options,
    activeTurn: { turnId: "turn-a", kind: "produce_action", action: "training" }
  }).candidate.sourceLabel, "普通行动");
  assert.equal(api.buildViewModel(source, {
    ...options,
    activeTurn: { turnId: "turn-a", kind: "map_explore", stepKind: "explore_choice" }
  }).candidate.sourceLabel, "地图探索");
  assert.equal(api.buildViewModel(source, {
    ...options,
    activeTurn: { turnId: "turn-a", kind: "map_explore", stepKind: "custom_choice" }
  }).candidate.sourceLabel, "地图探索");
});

test("Storyteller phone view hides candidates from another scope or day", () => {
  const api = loadApi();
  const source = {
    plan: { planId: "plan-a", dayKey: "live+2", saveScope: "chat-a", status: "committed" },
    pendingCandidate: {
      incidentId: "incident:a",
      planId: "plan-a",
      saveScope: "chat-b",
      dayKey: "live+2",
      sourceTurnId: "turn-a",
      status: "attached",
      category: "task",
      severity: "minor",
      archetypeId: "unfinished_detail",
      locationId: "producer_classroom"
    }
  };
  const model = api.buildViewModel(source, { currentDayKey: "live+2", currentSaveScope: "chat-a" });
  assert.equal(model.candidate, null);
});

test("Storyteller phone view exposes bounded selection reasoning and last observation only", () => {
  const api = loadApi();
  const source = {
    plan: {
      planId: "plan-secret-full-id",
      dayKey: "live+2",
      saveScope: "chat-secret",
      status: "committed",
      pacing: "normal",
      categoryWeights: {},
      severityBudget: {},
      diversity: {}
    },
    lastSelectionDiagnostic: {
      selectedScore: 72,
      categoryWeight: 35,
      actionFit: 6,
      noveltyBonus: 15,
      pressureBonus: 16,
      relevantPressureCount: 1,
      evaluatedCount: 12,
      eligibleCount: 3,
      rejectionCounts: { legality: 5, cooldown: 2, diversity: 1, fingerprint: 1 },
      prompt: "PROMPT SECRET",
      requestId: "request-secret-full"
    },
    observations: [{
      schemaVersion: 2,
      sourceKind: "resolved_candidate",
      saveScope: "chat-secret",
      dayKey: "live+2",
      category: "visitor",
      severity: "moderate",
      requestId: "request-secret-full",
      turnId: "turn-secret-full",
      fingerprint: "fingerprint-secret",
      pressureCount: 1,
      prompt: "PROMPT SECRET",
      narrative: "NARRATIVE SECRET",
      pressureFacts: [{ dramaticNeed: "PRESSURE SECRET" }]
    }]
  };
  const model = JSON.parse(JSON.stringify(api.buildViewModel(source, {
    currentDayKey: "live+2",
    currentSaveScope: "chat-secret"
  })));

  assert.deepEqual(model.selection, {
    selectedScore: 72,
    categoryWeight: 35,
    actionFit: 6,
    noveltyBonus: 15,
    pressureBonus: 16,
    relevantPressureCount: 1,
    evaluatedCount: 12,
    eligibleCount: 3,
    rejectionSummary: ["合法性 5", "冷却 2", "多样性 1", "重复 1"]
  });
  assert.deepEqual(model.lastObservation, {
    sourceLabel: "事件候选",
    categoryLabel: "来访者",
    severityLabel: "中等"
  });
  assert.doesNotMatch(JSON.stringify(model), /PROMPT SECRET|NARRATIVE SECRET|PRESSURE SECRET|secret-full|fingerprint-secret|chat-secret/);
});

test("phone view exposes bounded style mix diagnostics and recent committed distribution", () => {
  const api = loadApi();
  const source = {
    plan: {
      planId: "plan-a",
      dayKey: "live+2",
      saveScope: "chat-a",
      status: "committed",
      pacing: "normal",
      categoryWeights: {},
      severityBudget: {},
      diversity: {},
      styleMix: { heroic: 60, romance: 40, kaibunsho: 0 },
      styleMixRevision: 4
    },
    styleConfig: {
      activeMix: { heroic: 60, romance: 40, kaibunsho: 0 },
      pendingMix: { heroic: 70, romance: 30, kaibunsho: 0 },
      styleMixRevision: 4,
      pendingActivationDayKey: "live+3"
    },
    styleStreak: { styleId: "heroic", committedCount: 2, penaltyArmed: true },
    lastSelectionDiagnostic: {
      styleId: "heroic",
      configuredStyleWeights: { heroic: 60, romance: 40 },
      normalizedStyleWeights: { heroic: 42.8571, romance: 57.1429 },
      legalStyleCounts: { heroic: 3, romance: 5 },
      penaltyStyleId: "heroic",
      penaltyApplied: true
    },
    pendingCandidate: { styleId: "heroic", operatorIds: ["threshold_test"] },
    observations: [
      { sourceKind: "resolved_candidate", saveScope: "chat-a", dayKey: "live+2", category: "task", severity: "minor", styleId: "heroic", operatorIds: ["threshold_test"] },
      { sourceKind: "resolved_candidate", saveScope: "chat-a", dayKey: "live+2", category: "visitor", severity: "minor", styleId: "romance", operatorIds: ["boundary_test"] },
      { sourceKind: "resolved_candidate", saveScope: "chat-b", dayKey: "live+2", category: "task", severity: "minor", styleId: "romance" }
    ]
  };
  const model = api.buildViewModel(source, { currentDayKey: "live+2", currentSaveScope: "chat-a" });
  assert.deepEqual(JSON.parse(JSON.stringify(model.style.activeMix)), { heroic: 60, romance: 40, kaibunsho: 0 });
  assert.deepEqual(JSON.parse(JSON.stringify(model.style.pendingMix)), { heroic: 70, romance: 30, kaibunsho: 0 });
  assert.equal(model.style.pendingActivationDayKey, "live+3");
  assert.deepEqual(JSON.parse(JSON.stringify(model.style.legalCandidateCounts)), { heroic: 3, romance: 5 });
  assert.deepEqual(JSON.parse(JSON.stringify(model.style.normalizedWeights)), { heroic: 42.8571, romance: 57.1429 });
  assert.equal(model.style.penaltyStyleId, "heroic");
  assert.equal(model.style.penaltyApplied, true);
  assert.equal(model.style.selectedStyleId, "heroic");
  assert.deepEqual(JSON.parse(JSON.stringify(model.style.selectedOperators)), ["阈值测试"]);
  assert.deepEqual(JSON.parse(JSON.stringify(model.style.recentDistribution)), { heroic: 1, romance: 1 });
  assert.deepEqual(JSON.parse(JSON.stringify(model.style.streak)), { styleId: "heroic", committedCount: 2, penaltyArmed: true });
  assert.doesNotMatch(JSON.stringify(model), /chat-a|chat-b|plan-a|threshold_test/);
});

test("ambient observation reports a calm turn without inventing category or severity", () => {
  const api = loadApi();
  const source = {
    plan: { planId: "plan-a", dayKey: "live+2", saveScope: "chat-a", status: "committed" },
    observations: [{
      schemaVersion: 2,
      sourceKind: "ambient_turn",
      saveScope: "chat-a",
      dayKey: "live+2",
      category: "",
      severity: ""
    }]
  };
  const model = api.buildViewModel(source, { currentDayKey: "live+2", currentSaveScope: "chat-a" });
  assert.deepEqual(JSON.parse(JSON.stringify(model.lastObservation)), {
    sourceLabel: "平静回合",
    categoryLabel: "无事件",
    severityLabel: "无"
  });
});

test("phone view exposes a bounded notification inbox and badges", () => {
  const api = loadApi();
  const source = {
    plan: { planId: "plan-a", dayKey: "live+2", saveScope: "chat-a", status: "committed" },
    pendingCandidate: {
      incidentId: "incident:SECRET", planId: "plan-a", saveScope: "chat-a", dayKey: "live+2",
      sourceTurnId: "notify:SECRET", status: "notified", channel: "invite", category: "visitor", severity: "minor",
      archetypeId: "peer_invitation", actorIds: ["idol:秦谷美铃"], targetIds: ["producer"],
      locationId: "courtyard", modifierIds: ["unexpected_question"], requiresConfirmation: false,
      notification: { notifiedAtWorldMinute: 3480, deferredUntilWorldMinute: null, expiresAtWorldMinute: 4920, notificationReason: "open_world_engine" },
      prompt: "PROMPT SECRET"
    }
  };
  const model = JSON.parse(JSON.stringify(api.buildViewModel(source, { currentDayKey: "live+2", currentSaveScope: "chat-a", worldMinute: 3480 })));
  assert.equal(model.inbox.available, true);
  assert.equal(model.inbox.status, "notified");
  assert.deepEqual(model.inbox.actorLabels, ["秦谷美铃", "制作人"]);
  assert.equal(model.badges.worldEngine, true);
  assert.equal(model.badges.sns, true);
  assert.doesNotMatch(JSON.stringify(model), /incident:SECRET|notify:SECRET|PROMPT SECRET|chat-a/);
});

test("phone view exposes bounded major confirmation copy without internal identity", () => {
  const api = loadApi();
  const source = {
    plan: { planId: "plan-major", dayKey: "live+4", saveScope: "chat-major", status: "committed" },
    pendingCandidate: {
      incidentId: "incident:MAJOR-SECRET", definitionId: "major_hostile_public_confrontation",
      planId: "plan-major", saveScope: "chat-major", dayKey: "live+4", sourceTurnId: "notify:MAJOR-SECRET",
      status: "notified", channel: "invite", category: "hostile", severity: "major",
      archetypeId: "public_confrontation", actorIds: ["idol:秦谷美铃"], targetIds: ["producer"],
      locationId: "courtyard", modifierIds: ["public_attention", "competitive_glance"],
      pressureIds: ["pressure:SECRET"], requiresConfirmation: true,
      notification: { notifiedAtWorldMinute: 6360, deferredUntilWorldMinute: null, expiresAtWorldMinute: 7800 },
      prompt: "PROMPT SECRET", requestId: "request-secret", channelLeaseId: "lease-secret"
    }
  };
  const model = JSON.parse(JSON.stringify(api.buildViewModel(source, {
    currentDayKey: "live+4", currentSaveScope: "chat-major", worldMinute: 6360
  })));

  assert.equal(model.inbox.available, true);
  assert.equal(model.inbox.isMajor, true);
  assert.equal(model.inbox.requiresConfirmation, true);
  assert.match(model.inbox.confirmationCopy, /确认|重大/);
  assert.equal(model.inbox.severityLabel, "重大");
  assert.match(model.inbox.archetypeLabel, /公开|对峙|冲突/);
  assert.ok(model.inbox.modifierLabels.every((label) => !/public_attention|competitive_glance/.test(label)));
  assert.doesNotMatch(JSON.stringify(model), /major_hostile|MAJOR-SECRET|pressure:SECRET|PROMPT SECRET|request-secret|lease-secret|chat-major/);
});

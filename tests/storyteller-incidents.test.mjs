import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const source = readFileSync(new URL("../world/storyteller/incidents.js", import.meta.url), "utf8");
const stylesSource = readFileSync(new URL("../world/storyteller/styles.js", import.meta.url), "utf8");

function loadApi() {
  const context = { globalThis: {} };
  vm.runInNewContext(stylesSource, context);
  vm.runInNewContext(source, context);
  return context.globalThis.HatsuWorldStorytellerIncidents;
}

function styledContext(overrides = {}) {
  const base = context();
  return {
    ...base,
    plan: {
      ...base.plan,
      schemaVersion: 2,
      styleMix: { heroic: 20, romance: 80, kaibunsho: 0 },
      styleMixRevision: 4
    },
    styleThreads: {
      heroic: {
        status: "active", weight: 20, focusPressureIds: [],
        dramaticQuestion: "Can the current method survive a visible test?", narrativeGoals: [], dormantReason: ""
      },
      romance: {
        status: "active", weight: 80, focusPressureIds: [],
        dramaticQuestion: "How will the current boundary be interpreted?", narrativeGoals: [], dormantReason: ""
      },
      kaibunsho: null
    },
    styleStreak: { styleId: "", committedCount: 0, penaltyArmed: false },
    ...overrides
  };
}

function definition(overrides = {}) {
  return {
    id: "visitor_peer_observation",
    category: "visitor",
    archetypeId: "peer_observation",
    actorPool: ["assigned_idol", "present_idol"],
    locationPool: ["special_education"],
    modifierPool: ["public_attention", "unexpected_question"],
    channels: ["attach"],
    severityRange: ["minor", "moderate"],
    prerequisites: ["assigned_idol"],
    allowedActions: ["training"],
    allowedPacing: ["normal", "tense", "crisis_allowed"],
    cooldownDays: 2,
    requiresConfirmation: false,
    ...overrides
  };
}

function context(overrides = {}) {
  return {
    plan: {
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
      diversity: { majorCooldownDays: 2 }
    },
    saveScope: "chat-a",
    dayKey: "live+2",
    sourceTurnId: "turn-1",
    action: "training",
    attribute: "Vo",
    locationId: "special_education",
    assignedActorId: "idol:秦谷美铃",
    presentActorIds: ["idol:月村手毬", "idol:秦谷美铃"],
    pressureIds: ["pressure:misuzu:attention"],
    recentFingerprints: [],
    recentCandidates: [],
    ...overrides
  };
}

test("catalog contains diverse local definitions with bounded combination slots", () => {
  const { INCIDENT_CATALOG } = loadApi();
  assert.ok(Array.isArray(INCIDENT_CATALOG));
  assert.ok(INCIDENT_CATALOG.length >= 12);
  assert.ok(new Set(INCIDENT_CATALOG.map((item) => item.category)).size >= 5);
  assert.ok(INCIDENT_CATALOG.every((item) => item.id && item.archetypeId));
  assert.ok(INCIDENT_CATALOG.every((item) => item.actorPool.length && item.locationPool.length));
  assert.ok(INCIDENT_CATALOG.every((item) => item.channels.length && item.severityRange.length));
});

test("legality checks pacing category severity world context and concrete slots", () => {
  const { evaluateIncidentDefinition } = loadApi();
  const result = evaluateIncidentDefinition(definition(), context());

  assert.equal(result.eligible, true);
  assert.deepEqual(JSON.parse(JSON.stringify(result.layers)), {
    pacing: true,
    category: true,
    severity: true,
    world: true,
    instance: true
  });
  assert.equal(result.instances.actorIds.includes("idol:秦谷美铃"), true);
  assert.equal(result.instances.locationId, "special_education");
  assert.equal(["minor", "moderate"].includes(result.instances.severity), true);
});

test("legality rejects stale scope invalid action and automatic major incidents", () => {
  const { evaluateIncidentDefinition } = loadApi();

  assert.equal(
    evaluateIncidentDefinition(definition(), context({ saveScope: "chat-b" })).reason,
    "save_scope_mismatch"
  );
  assert.equal(
    evaluateIncidentDefinition(definition(), context({ action: "rest" })).reason,
    "action_not_allowed"
  );
  assert.equal(
    evaluateIncidentDefinition(definition({
      severityRange: ["major"],
      requiresConfirmation: true
    }), context({
      plan: {
        ...context().plan,
        pacing: "crisis_allowed",
        severityBudget: { minor: 0, moderate: 0, major: 1 }
      }
    })).reason,
    "confirmation_required"
  );
});

test("selection is deterministic and produces a bounded pending candidate", () => {
  const { selectIncidentCandidate } = loadApi();
  const input = { ...context(), catalog: [definition()] };
  const before = JSON.stringify(input);
  const first = selectIncidentCandidate(input);
  const second = selectIncidentCandidate(input);

  assert.deepEqual(JSON.parse(JSON.stringify(first)), JSON.parse(JSON.stringify(second)));
  assert.equal(JSON.stringify(input), before);
  assert.equal(first.reason, "selected");
  assert.equal(first.candidate.status, "pending");
  assert.equal(first.candidate.sourceTurnId, "turn-1");
  assert.equal(first.candidate.planId, "story:live+2:abc");
  assert.equal(first.candidate.saveScope, "chat-a");
  assert.equal(first.candidate.dayKey, "live+2");
  assert.match(first.candidate.incidentId, /^incident:/);
  assert.equal(first.candidate.channel, "attach");
  assert.equal(first.candidate.requiresConfirmation, false);
  assert.equal(JSON.stringify(first).includes("live+2|chat-a"), false, "random seed must not leak through selection output");
});

test("exact fingerprints and active cooldowns exclude repeated candidates", () => {
  const { selectIncidentCandidate } = loadApi();
  const first = selectIncidentCandidate({ ...context(), catalog: [definition()] });

  const repeated = selectIncidentCandidate({
    ...context({ recentFingerprints: [first.candidate.fingerprint] }),
    catalog: [definition()]
  });
  assert.equal(repeated.candidate, null);
  assert.equal(repeated.reason, "no_eligible_candidate");

  const cooling = selectIncidentCandidate({
    ...context({
      recentCandidates: [{
        archetypeId: first.candidate.archetypeId,
        dayKey: "live+1",
        dayOrdinal: 1,
        status: "resolved"
      }],
      dayOrdinal: 2
    }),
    catalog: [definition()]
  });
  assert.equal(cooling.candidate, null);
  assert.equal(cooling.reason, "no_eligible_candidate");
});

test("current-day candidates consume severity budget", () => {
  const { selectIncidentCandidate } = loadApi();
  const exhaustedPlan = {
    ...context().plan,
    severityBudget: { minor: 1, moderate: 0, major: 0 }
  };
  const result = selectIncidentCandidate({
    ...context({
      plan: exhaustedPlan,
      recentCandidates: [{
        incidentId: "incident:used",
        planId: exhaustedPlan.planId,
        saveScope: "chat-a",
        dayKey: "live+2",
        severity: "minor",
        category: "resource",
        archetypeId: "other_archetype",
        actorIds: ["idol:其他角色"],
        locationId: "courtyard",
        status: "resolved"
      }]
    }),
    catalog: [definition({ severityRange: ["minor"] })]
  });
  assert.equal(result.candidate, null);
  assert.equal(result.reason, "no_eligible_candidate");
});

test("daily actor and location diversity limits exclude saturated instances", () => {
  const { selectIncidentCandidate } = loadApi();
  const limitedPlan = {
    ...context().plan,
    diversity: {
      ...context().plan.diversity,
      actorDailyLimit: 1,
      locationDailyLimit: 1
    }
  };
  const recent = [{
    incidentId: "incident:used",
    planId: limitedPlan.planId,
    saveScope: "chat-a",
    dayKey: "live+2",
    severity: "minor",
    category: "resource",
    archetypeId: "different_archetype",
    actorIds: ["idol:秦谷美铃"],
    locationId: "special_education",
    status: "resolved"
  }];
  const result = selectIncidentCandidate({
    ...context({ plan: limitedPlan, recentCandidates: recent }),
    catalog: [definition({ cooldownDays: 0 })]
  });
  assert.equal(result.candidate, null);
  assert.equal(result.reason, "no_eligible_candidate");
});

test("candidate normalization strips secrets and bounds identifiers", () => {
  const { normalizeIncidentCandidate } = loadApi();
  const candidate = normalizeIncidentCandidate({
    incidentId: `incident:${"x".repeat(300)}`,
    planId: "plan-a",
    saveScope: "chat-a",
    dayKey: "live+2",
    sourceTurnId: "turn-1",
    fingerprint: "visitor|peer_observation|idol:a|courtyard|",
    category: "visitor",
    severity: "minor",
    archetypeId: "peer_observation",
    actorIds: ["idol:b", "idol:a"],
    targetIds: ["producer"],
    locationId: "courtyard",
    modifierIds: ["unexpected_question"],
    channel: "attach",
    pressureIds: [],
    resolutionMode: "observe",
    status: "pending",
    requiresConfirmation: false,
    prompt: "SECRET_PROMPT",
    reply: "SECRET_REPLY",
    apiKey: "SECRET_KEY",
    state: { secret: true }
  });

  assert.equal(candidate.incidentId.length <= 160, true);
  assert.deepEqual(JSON.parse(JSON.stringify(candidate.actorIds)), ["idol:a", "idol:b"]);
  assert.equal(JSON.stringify(candidate).includes("SECRET"), false);
  assert.equal("prompt" in candidate, false);
  assert.equal("state" in candidate, false);
});

test("candidate transitions require exact ownership and valid lifecycle edges", () => {
  const { selectIncidentCandidate, transitionIncidentCandidate } = loadApi();
  const pending = selectIncidentCandidate({ ...context(), catalog: [definition()] }).candidate;
  const ownership = {
    saveScope: pending.saveScope,
    dayKey: pending.dayKey,
    planId: pending.planId,
    sourceTurnId: pending.sourceTurnId
  };

  const attached = transitionIncidentCandidate(pending, "attached", ownership);
  assert.equal(attached.ok, true);
  assert.equal(attached.candidate.status, "attached");
  const resolved = transitionIncidentCandidate(attached.candidate, "resolved", ownership);
  assert.equal(resolved.ok, true);
  assert.equal(resolved.candidate.status, "resolved");

  assert.equal(transitionIncidentCandidate(pending, "resolved", ownership).reason, "invalid_transition");
  assert.equal(transitionIncidentCandidate(pending, "attached", { ...ownership, sourceTurnId: "turn-old" }).reason, "candidate_ownership_mismatch");
});

test("map_location is legal only for explicit approved map step kinds", () => {
  const { evaluateIncidentDefinition } = loadApi();
  const mapDefinition = definition({ allowedActions: ["map_location"] });
  const mapContext = context({ action: "map_location", mapStepKind: "arrival" });
  assert.equal(evaluateIncidentDefinition(mapDefinition, mapContext).eligible, true);
  assert.equal(evaluateIncidentDefinition(mapDefinition, { ...mapContext, mapStepKind: "return" }).reason, "map_step_not_allowed");
  assert.equal(evaluateIncidentDefinition(mapDefinition, { ...mapContext, mapStepKind: "" }).reason, "map_step_not_allowed");
});

test("pressure facts normalize active bounded fields and exclude inactive entries", () => {
  const { normalizeStorytellerPressureFacts } = loadApi();
  const facts = normalizeStorytellerPressureFacts([
    {
      id: "pressure:active",
      type: "relationship",
      theme: "competition",
      actorId: "idol:A",
      targetIds: ["producer"],
      stage: "active",
      intensity: 140,
      visibility: "private",
      status: "active",
      dramaticNeed: "must not leak"
    },
    {
      id: "pressure:resolved",
      type: "relationship",
      actorId: "idol:A",
      stage: "resolved",
      intensity: 80,
      visibility: "public",
      status: "active"
    },
    {
      id: "pressure:suspended",
      type: "goal",
      actorId: "idol:A",
      stage: "active",
      intensity: 40,
      visibility: "public",
      status: "suspended"
    }
  ]);

  assert.deepEqual(JSON.parse(JSON.stringify(facts)), [{
    pressureId: "pressure:active",
    type: "relationship",
    theme: "competition",
    actorId: "idol:A",
    targetIds: ["producer"],
    stage: "active",
    intensity: 100,
    visibility: "private"
  }]);
  assert.equal(JSON.stringify(facts).includes("must not leak"), false);
});

test("private pressure requires actor intersection and compatible incident category", () => {
  const { selectRelevantPressures } = loadApi();
  const relevant = selectRelevantPressures({
    category: "hostile",
    actorIds: ["idol:A"],
    targetIds: ["producer"],
    locationId: "courtyard"
  }, [
    { pressureId: "match", type: "relationship", theme: "competition", actorId: "idol:A", targetIds: ["producer"], stage: "active", intensity: 60, visibility: "private" },
    { pressureId: "other", type: "relationship", theme: "trust", actorId: "idol:B", targetIds: ["producer"], stage: "active", intensity: 80, visibility: "private" },
    { pressureId: "wrong-type", type: "schedule", theme: "deadline", actorId: "idol:A", targetIds: ["producer"], stage: "active", intensity: 90, visibility: "private" }
  ]);

  assert.deepEqual(relevant.map((item) => item.pressureId), ["match"]);
});

test("public pressure can match a public location but not a private room", () => {
  const { selectRelevantPressures } = loadApi();
  const pressures = [
    { pressureId: "public", type: "social", theme: "reputation", actorId: "idol:B", targetIds: [], stage: "active", intensity: 45, visibility: "public" }
  ];
  const publicMatch = selectRelevantPressures({
    category: "visitor",
    actorIds: ["idol:A"],
    targetIds: ["producer"],
    locationId: "courtyard"
  }, pressures);
  const privateMiss = selectRelevantPressures({
    category: "visitor",
    actorIds: ["idol:A"],
    targetIds: ["producer"],
    locationId: "producer_apartment"
  }, pressures);

  assert.deepEqual(publicMatch.map((item) => item.pressureId), ["public"]);
  assert.deepEqual(privateMiss, []);
});

test("selection stores only relevant pressure ids and unrelated pressure adds no score", () => {
  const { selectIncidentCandidate } = loadApi();
  const catalog = [definition({ category: "hostile" })];
  const assignedActorId = context().assignedActorId;
  const matching = {
    pressureId: "match",
    type: "relationship",
    theme: "competition",
    actorId: assignedActorId,
    targetIds: ["producer"],
    stage: "active",
    intensity: 60,
    visibility: "private"
  };
  const unrelated = {
    pressureId: "other",
    type: "relationship",
    theme: "trust",
    actorId: "idol:other",
    targetIds: ["producer"],
    stage: "active",
    intensity: 100,
    visibility: "private"
  };
  const withMatching = selectIncidentCandidate({ ...context({ pressureFacts: [matching, unrelated] }), catalog });
  const withUnrelated = selectIncidentCandidate({ ...context({ pressureFacts: [unrelated] }), catalog });
  const withoutPressure = selectIncidentCandidate({ ...context({ pressureFacts: [] }), catalog });

  assert.deepEqual(JSON.parse(JSON.stringify(withMatching.candidate.pressureIds)), ["match"]);
  assert.deepEqual(JSON.parse(JSON.stringify(withUnrelated.candidate.pressureIds)), []);
  assert.equal(withUnrelated.selectedScore, withoutPressure.selectedScore);
  assert.ok(withMatching.selectedScore > withoutPressure.selectedScore);
});

test("concrete actor and modifier combinations are retry-stable but vary across turns", () => {
  const { selectIncidentCandidate } = loadApi();
  const comboDefinition = definition({
    actorPool: ["present_idol"],
    prerequisites: ["present_idol"],
    modifierPool: ["modifier-a", "modifier-b", "modifier-c", "modifier-d"]
  });
  const base = context({
    assignedActorId: "idol:assigned",
    presentActorIds: ["idol:A", "idol:B", "idol:C"],
    pressureIds: [],
    pressureFacts: []
  });
  const first = selectIncidentCandidate({ ...base, catalog: [comboDefinition] });
  const retry = selectIncidentCandidate({ ...base, catalog: [comboDefinition] });
  assert.deepEqual(JSON.parse(JSON.stringify(first.candidate.actorIds)), JSON.parse(JSON.stringify(retry.candidate.actorIds)));
  assert.deepEqual(JSON.parse(JSON.stringify(first.candidate.modifierIds)), JSON.parse(JSON.stringify(retry.candidate.modifierIds)));
  assert.equal(first.candidate.modifierIds.length <= 2, true);
  assert.equal(first.candidate.actorIds.length, 1);
  assert.equal(base.presentActorIds.includes(first.candidate.actorIds[0]), true);

  const combinations = new Set(Array.from({ length: 20 }, (_, index) => {
    const result = selectIncidentCandidate({ ...base, sourceTurnId: `turn-${index + 1}`, catalog: [comboDefinition] });
    return `${result.candidate.actorIds.join(",")}|${result.candidate.modifierIds.join(",")}`;
  }));
  assert.ok(combinations.size > 1);
});

test("selection returns bounded score and rejection diagnostics", () => {
  const { selectIncidentCandidate } = loadApi();
  const result = selectIncidentCandidate({
    ...context(),
    catalog: [
      definition(),
      definition({ id: "illegal", allowedActions: ["rest"] }),
      definition({ id: "cooling", archetypeId: "cooling", cooldownDays: 3 }),
      definition({ id: "duplicate", archetypeId: "duplicate", cooldownDays: 0 })
    ],
    recentCandidates: [{
      archetypeId: "cooling",
      dayKey: "live+1",
      dayOrdinal: 1,
      status: "resolved"
    }],
    dayOrdinal: 2
  });

  assert.deepEqual(Object.keys(result.diagnostic.rejectionCounts).sort(), [
    "cooldown", "diversity", "fingerprint", "legality"
  ]);
  assert.ok(result.diagnostic.selectedScore >= 0);
  assert.ok(result.diagnostic.eligibleCount <= result.diagnostic.evaluatedCount);
  assert.equal(result.diagnostic.evaluatedCount, 4);
  assert.equal(result.diagnostic.rejectionCounts.legality >= 1, true);
  assert.equal(result.diagnostic.rejectionCounts.cooldown >= 1, true);
  assert.equal(JSON.stringify(result.diagnostic).includes("live+2|chat-a"), false);
});

test("missing selection diagnostics remain absent for legacy saves", () => {
  const { normalizeSelectionDiagnostic } = loadApi();
  assert.equal(normalizeSelectionDiagnostic(null), null);
  assert.equal(normalizeSelectionDiagnostic("invalid"), null);
});

test("channel-aware selection keeps attach and invite catalogs isolated", () => {
  const { selectIncidentCandidate } = loadApi();
  const attachDefinition = definition({ id: "attach", channels: ["attach"] });
  const inviteDefinition = definition({ id: "invite", channels: ["invite"] });
  const attach = selectIncidentCandidate({ ...context(), requiredChannel: "attach", catalog: [attachDefinition, inviteDefinition] });
  const invite = selectIncidentCandidate({ ...context(), requiredChannel: "invite", catalog: [attachDefinition, inviteDefinition] });
  assert.equal(attach.candidate.channel, "attach");
  assert.equal(invite.candidate.channel, "invite");
  assert.notEqual(attach.candidate.incidentId, invite.candidate.incidentId);
});

test("catalog provides bounded S4 invite definitions without major severity", () => {
  const { INCIDENT_CATALOG } = loadApi();
  const invites = INCIDENT_CATALOG.filter((item) => item.channels.includes("invite") && !item.severityRange.includes("major"));
  assert.equal(invites.length, 4);
  assert.ok(invites.every((item) => !item.severityRange.includes("major")));
  assert.ok(invites.every((item) => item.requiresConfirmation === false));
  assert.ok(new Set(invites.map((item) => item.category)).size >= 4);
});

test("styled selection filters legality before renormalizing configured weights", () => {
  const { selectIncidentCandidate } = loadApi();
  const heroicOnly = definition({
    id: "heroic-test",
    styleIds: ["heroic"],
    operatorIdsByStyle: { heroic: ["threshold_test"] }
  });
  const illegalRomance = definition({
    id: "romance-test",
    allowedActions: ["rest"],
    styleIds: ["romance"],
    operatorIdsByStyle: { romance: ["boundary_test"] }
  });
  const result = selectIncidentCandidate({ ...styledContext(), catalog: [heroicOnly, illegalRomance] });
  assert.equal(result.candidate.styleId, "heroic");
  assert.deepEqual(JSON.parse(JSON.stringify(result.diagnostic.normalizedStyleWeights)), { heroic: 100 });
  assert.equal(result.diagnostic.legalStyleCounts.heroic, 1);
  assert.equal(result.diagnostic.legalStyleCounts.romance, 0);
});

test("styled candidate freezes deterministic operators disturbance and revision", () => {
  const { selectIncidentCandidate } = loadApi();
  const styledDefinition = definition({
    id: "styled-test",
    styleIds: ["heroic", "romance"],
    operatorIdsByStyle: {
      heroic: ["threshold_test", "resource_constraint", "method_failure"],
      romance: ["boundary_test", "expectation_gap"]
    }
  });
  const input = { ...styledContext(), catalog: [styledDefinition] };
  const first = selectIncidentCandidate(input);
  const retry = selectIncidentCandidate(input);
  assert.deepEqual(JSON.parse(JSON.stringify(first)), JSON.parse(JSON.stringify(retry)));
  assert.equal(first.candidate.schemaVersion, 2);
  assert.equal(first.candidate.styleMixRevision, 4);
  assert.ok(["heroic", "romance"].includes(first.candidate.styleId));
  assert.ok(first.candidate.operatorIds.length > 0 && first.candidate.operatorIds.length <= 2);
  assert.equal(first.candidate.disturbance.styleId, first.candidate.styleId);
  assert.ok(first.candidate.disturbance.groundedPremise);
  assert.ok(first.candidate.disturbance.triggerFact);
  assert.ok(first.candidate.disturbance.reasonToRespond);
});

test("styled selection consumes one armed penalty only when a candidate is created", () => {
  const { selectIncidentCandidate } = loadApi();
  const streak = { styleId: "heroic", committedCount: 2, penaltyArmed: true };
  const selected = selectIncidentCandidate({
    ...styledContext({ styleStreak: streak }),
    catalog: [definition({
      id: "both",
      styleIds: ["heroic", "romance"],
      operatorIdsByStyle: { heroic: ["threshold_test"], romance: ["boundary_test"] }
    })]
  });
  assert.deepEqual(JSON.parse(JSON.stringify(selected.nextStyleStreak)), {
    styleId: "heroic", committedCount: 2, penaltyArmed: false
  });
  const none = selectIncidentCandidate({
    ...styledContext({ styleStreak: streak }),
    catalog: [definition({ allowedActions: ["rest"], styleIds: ["heroic"], operatorIdsByStyle: { heroic: ["threshold_test"] } })]
  });
  assert.equal(none.candidate, null);
  assert.equal(none.nextStyleStreak, null);
});

test("styled selection refuses a zero-weight legal style instead of forcing an event", () => {
  const { selectIncidentCandidate } = loadApi();
  const input = styledContext({
    plan: {
      ...styledContext().plan,
      styleMix: { heroic: 100, romance: 0, kaibunsho: 0 }
    },
    styleThreads: {
      ...styledContext().styleThreads,
      heroic: { ...styledContext().styleThreads.heroic, weight: 100 },
      romance: { ...styledContext().styleThreads.romance, weight: 0 }
    },
    catalog: [definition({
      styleIds: ["romance"],
      operatorIdsByStyle: { romance: ["boundary_test"] }
    })]
  });
  const result = selectIncidentCandidate(input);
  assert.equal(result.candidate, null);
  assert.equal(result.reason, "no_weighted_style");
});

test("styled revalidation rejects changed style operators disturbance and revision", () => {
  const api = loadApi();
  const catalog = [definition({
    id: "styled-revalidate",
    styleIds: ["heroic"],
    operatorIdsByStyle: { heroic: ["threshold_test", "resource_constraint"] }
  })];
  const input = { ...styledContext(), catalog };
  const candidate = api.selectIncidentCandidate(input).candidate;
  assert.deepEqual({
    planId: candidate.planId,
    saveScope: candidate.saveScope,
    dayKey: candidate.dayKey,
    sourceTurnId: candidate.sourceTurnId,
    dayOrdinal: candidate.dayOrdinal
  }, {
    planId: input.plan.planId,
    saveScope: input.saveScope,
    dayKey: input.dayKey,
    sourceTurnId: input.sourceTurnId,
    dayOrdinal: null
  });
  const valid = api.revalidateIncidentCandidate(candidate, input, {
    requiredChannel: "attach",
    allowMajorConfirmation: true,
    catalog
  });
  assert.equal(valid.valid, true, valid.reason);
  for (const changed of [
    { ...candidate, styleId: "romance" },
    { ...candidate, styleMixRevision: 5 },
    { ...candidate, operatorIds: ["boundary_test"] },
    { ...candidate, disturbance: { ...candidate.disturbance, triggerFact: "tampered" } }
  ]) {
    assert.equal(api.revalidateIncidentCandidate(changed, input, {
      requiredChannel: "attach",
      allowMajorConfirmation: true,
      catalog
    }).valid, false);
  }
});

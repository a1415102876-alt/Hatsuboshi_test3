import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

const incidentSource = readFileSync(new URL("../world/storyteller/incidents.js", import.meta.url), "utf8");
const planSource = readFileSync(new URL("../world/storyteller/plan.js", import.meta.url), "utf8");
const injectionSource = readFileSync(new URL("../world/storyteller/injection.js", import.meta.url), "utf8");

function loadIncidentApi() {
  const context = { globalThis: {} };
  vm.runInNewContext(incidentSource, context);
  return context.globalThis.HatsuWorldStorytellerIncidents;
}

function loadPlanApi() {
  const context = { globalThis: {} };
  vm.runInNewContext(planSource, context);
  return context.globalThis.HatsuWorldStorytellerPlan;
}

function loadInjectionApi() {
  const context = { globalThis: {} };
  vm.runInNewContext(injectionSource, context);
  return context.globalThis.HatsuWorldStorytellerInjection;
}

function crisisContext(overrides = {}) {
  const base = {
    plan: {
      schemaVersion: 1,
      planId: "story:live+4:major",
      dayKey: "live+4",
      saveScope: "chat-a",
      seed: "live+4|chat-a",
      pacing: "crisis_allowed",
      status: "committed",
      categoryWeights: {
        hostile: 70,
        environment: 70,
        resource: 70,
        visitor: 70,
        task: 70,
        opportunity: 70
      },
      severityBudget: { minor: 2, moderate: 1, major: 1 },
      diversity: { actorDailyLimit: 3, locationDailyLimit: 3, majorCooldownDays: 2 }
    },
    saveScope: "chat-a",
    dayKey: "live+4",
    dayOrdinal: 4,
    sourceTurnId: "notify:live+4:6360:courtyard",
    action: "notification",
    locationId: "courtyard",
    assignedActorId: "idol:秦谷美铃",
    presentActorIds: ["idol:月村手毬", "idol:花海咲季"],
    pressureFacts: [{
      pressureId: "pressure-a",
      type: "social",
      actorId: "idol:秦谷美铃",
      targetIds: ["producer"],
      stage: "active",
      status: "active",
      intensity: 70,
      visibility: "public"
    }],
    recentCandidates: [],
    recentFingerprints: [],
    requiredChannel: "invite",
    allowMajorConfirmation: true
  };
  return { ...base, ...overrides };
}

test("catalog contains exactly six conservative confirmed invite-only major definitions", () => {
  const { INCIDENT_CATALOG } = loadIncidentApi();
  const majors = INCIDENT_CATALOG.filter((item) => item.severityRange.includes("major"));

  assert.equal(majors.length, 6);
  assert.deepEqual([...new Set(majors.map((item) => item.category))].sort(), [
    "environment", "hostile", "opportunity", "resource", "task", "visitor"
  ]);
  assert.ok(majors.every((item) => item.id.startsWith("major_")));
  assert.ok(majors.every((item) => JSON.stringify(item.channels) === JSON.stringify(["invite"])));
  assert.ok(majors.every((item) => JSON.stringify(item.severityRange) === JSON.stringify(["major"])));
  assert.ok(majors.every((item) => JSON.stringify(item.allowedPacing) === JSON.stringify(["crisis_allowed"])));
  assert.ok(majors.every((item) => JSON.stringify(item.allowedActions) === JSON.stringify(["notification"])));
  assert.ok(majors.every((item) => item.requiresConfirmation === true));
  assert.ok(majors.every((item) => item.actorPool.length <= 8 && item.modifierPool.length <= 8));
  assert.doesNotMatch(JSON.stringify(majors), /reward|penalty|resultText|timeCost|statDelta/i);
});

test("major legality requires explicit permission crisis pacing and remaining budget", () => {
  const api = loadIncidentApi();
  const major = api.INCIDENT_CATALOG.find((item) => item.id === "major_hostile_public_confrontation");
  assert.ok(major);

  assert.equal(api.evaluateIncidentDefinition(major, crisisContext({ allowMajorConfirmation: false })).reason, "confirmation_required");
  const allowed = api.evaluateIncidentDefinition(major, crisisContext());
  assert.equal(allowed.eligible, true);
  assert.equal(allowed.instances.severity, "major");

  for (const [label, patch] of [
    ["normal", { plan: { ...crisisContext().plan, pacing: "normal" } }],
    ["tense", { plan: { ...crisisContext().plan, pacing: "tense" } }],
    ["zero-budget", { plan: { ...crisisContext().plan, severityBudget: { minor: 2, moderate: 1, major: 0 } } }],
    ["used-budget", { recentCandidates: [{ planId: "story:live+4:major", saveScope: "chat-a", dayKey: "live+4", severity: "major", status: "resolved" }] }],
    ["wrong-scope", { saveScope: "chat-b" }],
    ["wrong-day", { dayKey: "live+5" }],
    ["wrong-action", { action: "training" }],
    ["missing-location", { locationId: "" }],
    ["missing-assigned", { assignedActorId: "" }]
  ]) {
    assert.equal(api.evaluateIncidentDefinition(major, crisisContext(patch)).eligible, false, label);
  }
});

test("major selection is deterministic bounded confirmed and impossible by default", () => {
  const api = loadIncidentApi();
  const majors = api.INCIDENT_CATALOG.filter((item) => item.severityRange.includes("major"));
  const input = { ...crisisContext(), catalog: majors };
  const first = api.selectIncidentCandidate(input);
  const second = api.selectIncidentCandidate(input);

  assert.deepEqual(JSON.parse(JSON.stringify(first)), JSON.parse(JSON.stringify(second)));
  assert.equal(first.reason, "selected");
  assert.equal(first.candidate.severity, "major");
  assert.equal(first.candidate.channel, "invite");
  assert.equal(first.candidate.requiresConfirmation, true);
  assert.match(first.candidate.definitionId, /^major_/);
  assert.ok(first.candidate.definitionId.length <= 100);
  assert.ok(first.candidate.modifierIds.length <= 2);
  assert.equal(api.selectIncidentCandidate({ ...input, allowMajorConfirmation: false }).candidate, null);
  assert.equal(api.selectIncidentCandidate({ ...input, requiredChannel: "attach" }).candidate, null);
});

test("daily plan enters crisis_allowed conservatively and only crisis plans carry major budget", () => {
  const api = loadPlanApi();
  const build = (stats) => api.buildStorytellerPlan({
    dayKey: "live+4",
    saveScope: "chat-a",
    seed: "live+4|chat-a",
    stats,
    recentFingerprints: []
  });
  const crisis = build({ observedDays: 2, calmDays: 0, moderateEvents: 2, majorEvents: 0, categoryCounts: {} });
  assert.equal(crisis.pacing, "crisis_allowed");
  assert.equal(crisis.severityBudget.major, 1);

  for (const stats of [
    { observedDays: 2, calmDays: 0, moderateEvents: 0, majorEvents: 0, categoryCounts: {} },
    { observedDays: 2, calmDays: 0, moderateEvents: 1, majorEvents: 0, categoryCounts: {} },
    { observedDays: 3, calmDays: 0, moderateEvents: 3, majorEvents: 1, categoryCounts: {} },
    { observedDays: 3, calmDays: 3, moderateEvents: 0, majorEvents: 0, categoryCounts: {} }
  ]) {
    const plan = build(stats);
    assert.notEqual(plan.pacing, "crisis_allowed");
    assert.equal(plan.severityBudget.major, 0);
  }
});

test("full major revalidation accepts only the exact freshly legal instance", () => {
  const api = loadIncidentApi();
  const majors = api.INCIDENT_CATALOG.filter((item) => item.severityRange.includes("major"));
  const context = { ...crisisContext(), catalog: majors };
  const candidate = api.selectIncidentCandidate(context).candidate;
  const beforeCandidate = JSON.stringify(candidate);
  const beforeContext = JSON.stringify(context);

  const result = api.revalidateIncidentCandidate(candidate, context, {
    requiredChannel: "invite",
    allowMajorConfirmation: true
  });
  assert.equal(result.valid, true);
  assert.equal(result.reason, "valid");
  assert.equal(JSON.stringify(candidate), beforeCandidate);
  assert.equal(JSON.stringify(context), beforeContext);
});

test("full major revalidation rejects stale ownership legality and instance changes without repair", () => {
  const api = loadIncidentApi();
  const majors = api.INCIDENT_CATALOG.filter((item) => item.severityRange.includes("major"));
  const base = { ...crisisContext(), catalog: majors };
  const candidate = api.selectIncidentCandidate(base).candidate;
  const cases = [
    ["definition", { candidate: { ...candidate, definitionId: "major_unknown" } }],
    ["scope", { context: { ...base, saveScope: "chat-b" } }],
    ["day", { context: { ...base, dayKey: "live+5" } }],
    ["plan", { context: { ...base, plan: { ...base.plan, planId: "story:other" } } }],
    ["pacing", { context: { ...base, plan: { ...base.plan, pacing: "tense" } } }],
    ["budget", { context: { ...base, plan: { ...base.plan, severityBudget: { minor: 2, moderate: 1, major: 0 } } } }],
    ["location", { context: { ...base, locationId: "auditorium" } }],
    ["assigned", { context: { ...base, assignedActorId: "idol:花海咲季" } }],
    ["present", { context: { ...base, presentActorIds: ["idol:葛城リーリヤ"] } }],
    ["cooldown", { context: { ...base, recentCandidates: [{ ...candidate, status: "resolved", dayOrdinal: 3 }] } }],
    ["fingerprint", { context: { ...base, recentFingerprints: [candidate.fingerprint] } }],
    ["candidate-actor", { candidate: { ...candidate, actorIds: ["idol:篡改"] } }],
    ["candidate-location", { candidate: { ...candidate, locationId: "auditorium" } }],
    ["candidate-modifier", { candidate: { ...candidate, modifierIds: ["tampered"] } }],
    ["candidate-confirmation", { candidate: { ...candidate, requiresConfirmation: false } }]
  ];

  for (const [label, item] of cases) {
    const candidateInput = item.candidate || candidate;
    const contextInput = item.context || base;
    const beforeCandidate = JSON.stringify(candidateInput);
    const beforeContext = JSON.stringify(contextInput);
    const result = api.revalidateIncidentCandidate(candidateInput, contextInput, {
      requiredChannel: "invite",
      allowMajorConfirmation: true
    });
    assert.equal(result.valid, false, label);
    assert.ok(result.reason && result.reason.length <= 120, label);
    assert.equal(JSON.stringify(candidateInput), beforeCandidate, label);
    assert.equal(JSON.stringify(contextInput), beforeContext, label);
  }
});

test("major revalidation cannot be reused for attach or without explicit confirmation permission", () => {
  const api = loadIncidentApi();
  const context = crisisContext();
  const candidate = api.selectIncidentCandidate(context).candidate;
  assert.equal(api.revalidateIncidentCandidate(candidate, context, {
    requiredChannel: "attach",
    allowMajorConfirmation: true
  }).valid, false);
  assert.equal(api.revalidateIncidentCandidate(candidate, context, {
    requiredChannel: "invite",
    allowMajorConfirmation: false
  }).valid, false);
});

test("all major archetypes produce bounded narrative-only independent event prompts", () => {
  const incidents = loadIncidentApi();
  const injection = loadInjectionApi();
  const majors = incidents.INCIDENT_CATALOG.filter((item) => item.severityRange.includes("major"));

  for (const definition of majors) {
    const selected = incidents.selectIncidentCandidate({
      ...crisisContext(),
      catalog: [definition]
    }).candidate;
    assert.ok(selected, definition.id);
    const prompt = injection.composeStorytellerIndependentEventPromptAddendum({
      ...selected,
      status: "invited"
    }, { actorLabels: ["秦谷美铃", "制作人"] });
    assert.ok(prompt.length > 80 && prompt.length <= 2400, definition.id);
    assert.match(prompt, /重大/, definition.id);
    assert.match(prompt, /不允许推进游戏时间|不得修改数值/, definition.id);
    assert.doesNotMatch(prompt, /major_|incident:|pressure:|requestId|leaseId/i, definition.id);
  }
});

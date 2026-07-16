import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

const root = new URL("../", import.meta.url);
const normalize = (value) => JSON.parse(JSON.stringify(value));

function loadApi() {
  const sandbox = { globalThis: {}, console };
  sandbox.globalThis = sandbox;
  for (const file of ["world/storyteller/incidents.js", "world/storyteller/initiative.js"]) {
    vm.runInNewContext(readFileSync(new URL(file, root), "utf8"), sandbox, { filename: file });
  }
  return sandbox.HatsuWorldStorytellerInitiative;
}

function intent(actorId, overrides = {}) {
  return {
    intentId: `intent:${actorId}:day-2`, dayKey: "day-2", saveScope: "scope-a", actorId,
    targetIds: ["producer"], goal: `Contact the producer about ${actorId}`, motive: "Maintain the relationship",
    urgency: "normal", visibility: "private", preferredChannels: ["phone", "invite"],
    sourcePressureIds: [], sourceRefs: [], publicPostDraft: "", expiresDayKey: "day-2", ...overrides
  };
}

function input(overrides = {}) {
  return {
    plan: { planId: "plan-a", seed: "seed-a", severityBudget: { minor: 3, moderate: 2, major: 0 } },
    saveScope: "scope-a", dayKey: "day-2", dayOrdinal: 2,
    knownActorIds: ["idol:a", "idol:b", "idol:c", "producer"],
    intents: [intent("idol:a"), intent("idol:b", { urgency: "high" })],
    recentCandidates: [], recentFingerprints: [], maxCandidates: 2,
    ...overrides
  };
}

test("initiative selection is deterministic, bounded to two, and keeps one action per known actor", () => {
  const api = loadApi();
  const source = input({ intents: [intent("idol:a"), intent("idol:a", { intentId: "duplicate-actor" }), intent("idol:b"), intent("idol:unknown")] });
  const before = JSON.stringify(source);
  const first = normalize(api.selectInitiativeCandidates(source));
  const second = normalize(api.selectInitiativeCandidates(source));
  assert.deepEqual(first, second);
  assert.equal(JSON.stringify(source), before);
  assert.equal(first.candidates.length, 2);
  assert.equal(new Set(first.candidates.flatMap((item) => item.actorIds)).size, 2);
  assert.ok(first.candidates.every((item) => item.origin === "character_intent"));
  assert.ok(first.candidates.every((item) => item.saveScope === "scope-a" && item.dayKey === "day-2"));
});

test("initiative selection shares current-day minor and moderate budgets", () => {
  const api = loadApi();
  const exhausted = api.selectInitiativeCandidates(input({
    plan: { planId: "plan-a", seed: "seed-a", severityBudget: { minor: 1, moderate: 1, major: 0 } },
    recentCandidates: [
      { planId: "plan-a", saveScope: "scope-a", dayKey: "day-2", severity: "minor", status: "resolved" },
      { planId: "plan-a", saveScope: "scope-a", dayKey: "day-2", severity: "moderate", status: "pending" }
    ]
  }));
  assert.deepEqual(normalize(exhausted.candidates), []);
  assert.equal(exhausted.reason, "budget_exhausted");
});

test("SNS intents must be public and carry a bounded draft", () => {
  const api = loadApi();
  const result = api.selectInitiativeCandidates(input({
    intents: [
      intent("idol:a", { preferredChannels: ["sns"], visibility: "private", publicPostDraft: "must not leak" }),
      intent("idol:b", { preferredChannels: ["sns"], visibility: "public", publicPostDraft: "A short public update" })
    ]
  }));
  assert.equal(result.candidates.length, 1);
  assert.equal(result.candidates[0].channel, "sns");
  assert.equal(result.candidates[0].delivery.publicPostDraft, "A short public update");
});

test("fingerprint and channel cooldowns exclude repeated initiative topics", () => {
  const api = loadApi();
  const first = api.selectInitiativeCandidates(input({ intents: [intent("idol:a")] })).candidates[0];
  const repeated = api.selectInitiativeCandidates(input({ intents: [intent("idol:a")], recentFingerprints: [first.fingerprint] }));
  assert.equal(repeated.candidates.length, 0);
  const cooled = api.selectInitiativeCandidates(input({
    intents: [intent("idol:a")],
    channelCooldowns: { "idol:a|phone": 2 }
  }));
  assert.ok(cooled.candidates.every((item) => item.channel !== "phone"));
});

test("initiative state migrates, counts unread phone items, and transitions exact candidates", () => {
  const api = loadApi();
  assert.deepEqual(normalize(api.ensureInitiativeState(null)), normalize(api.defaultInitiativeState()));
  const selected = api.selectInitiativeCandidates(input({ intents: [intent("idol:a", { preferredChannels: ["phone"] })] })).candidates[0];
  const state = api.ensureInitiativeState({ dayKey: "day-2", saveScope: "scope-a", candidates: [selected] });
  assert.equal(api.getUnreadPhoneInitiatives(state).length, 1);
  assert.equal(api.findInitiativeCandidate(state, selected.incidentId).incidentId, selected.incidentId);

  const wrong = api.transitionInitiativeCandidate(state, selected.incidentId, "resolve", { saveScope: "scope-b", dayKey: "day-2", planId: "plan-a", intentId: selected.intentId });
  assert.equal(wrong.ok, false);
  const resolved = api.transitionInitiativeCandidate(state, selected.incidentId, "resolve", { saveScope: "scope-a", dayKey: "day-2", planId: "plan-a", intentId: selected.intentId });
  assert.equal(resolved.ok, true);
  assert.equal(resolved.candidate.status, "resolved");
  assert.equal(resolved.candidate.delivery.unread, false);
  assert.equal(api.getUnreadPhoneInitiatives(resolved.state).length, 0);
  assert.equal(state.candidates[0].status, "pending", "transition must not mutate the prior snapshot");
});

test("fallback intents require actor-specific evidence and preserve its relationship context", () => {
  const api = loadApi();
  const base = { dayKey: "day-1", saveScope: "scope-a", pressures: [] };
  assert.deepEqual(normalize(api.buildFallbackCharacterIntents({
    ...base,
    characters: [{ id: "idol:a", known: true, assigned: true, responsible: true, relationshipRole: "responsible", relationshipStage: "new", evidenceSummaries: [], sourceRefs: [], recentLineMessages: [] }]
  })), []);
  const intents = normalize(api.buildFallbackCharacterIntents({
    ...base,
    characters: [{
      id: "idol:a", known: true, assigned: true, responsible: true, relationshipRole: "responsible", relationshipStage: "trusted",
      evidenceSummaries: ["Yesterday they agreed to adjust today's training plan."], sourceRefs: ["digest:a"], recentLineMessages: []
    }]
  }));
  assert.equal(intents.length, 1);
  assert.equal(intents[0].relationshipRole, "responsible");
  assert.equal(intents[0].relationshipStage, "trusted");
  assert.deepEqual(intents[0].contextSummaries, ["Yesterday they agreed to adjust today's training plan."]);
  assert.deepEqual(intents[0].sourceRefs, ["digest:a"]);
});

test("selected initiative candidates freeze bounded relationship and chronology context", () => {
  const api = loadApi();
  const grounded = intent("idol:a", {
    relationshipRole: "friend",
    relationshipStage: "known",
    contextSummaries: ["They met at the shopping street after practice."],
    sourceRefs: ["digest:a"]
  });
  const candidate = normalize(api.selectInitiativeCandidates(input({ intents: [grounded] })).candidates[0]);
  assert.equal(candidate.delivery.relationshipRole, "friend");
  assert.equal(candidate.delivery.relationshipStage, "known");
  assert.deepEqual(candidate.delivery.contextSummaries, ["They met at the shopping street after practice."]);
});

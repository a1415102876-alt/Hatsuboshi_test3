import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const source = readFileSync(new URL("../world/storyteller/observations.js", import.meta.url), "utf8");

function loadApi() {
  const sandbox = { globalThis: {}, console };
  sandbox.globalThis = sandbox;
  vm.runInNewContext(source, sandbox, { filename: "world/storyteller/observations.js" });
  return sandbox.globalThis.HatsuWorldStorytellerObservations;
}

test("buildObservationSnapshot keeps only bounded public runtime facts", () => {
  const api = loadApi();
  const snapshot = api.buildObservationSnapshot({
    freeMode: {
      postLiveDay: 3,
      clockMinutes: 810,
      activeLocationId: "courtyard",
      world: { director: { generationPrompt: "SECRET", receipts: [{ reason: "ok" }] } }
    },
    idol: "秦谷美铃",
    pendingActionContext: { action: "training", secret: "do not copy" },
    log: [{ day: 3, round: 1, action: "training", result: "训练完成" }]
  }, { saveScope: "chat-a", currentActors: ["producer", "idol:秦谷美铃"] });

  assert.equal(snapshot.dayKey, "live+3");
  assert.equal(snapshot.locationId, "courtyard");
  assert.deepEqual(JSON.parse(JSON.stringify(snapshot.participants)), ["idol:秦谷美铃", "producer"]);
  assert.equal(JSON.stringify(snapshot).includes("SECRET"), false);
  assert.equal(JSON.stringify(snapshot).includes("do not copy"), false);
});

test("buildIncidentFingerprint normalizes order and removes empty values", () => {
  const api = loadApi();
  assert.equal(
    api.buildIncidentFingerprint({
      category: "visitor",
      archetypeId: "visit",
      actorIds: ["idol:b", "idol:a"],
      locationId: "courtyard",
      modifierIds: ["rain", ""]
    }),
    "visitor|visit|idol:a,idol:b|courtyard|rain"
  );
});

test("buildRecentStorytellerStats counts intensity and category without changing state", () => {
  const api = loadApi();
  const state = {
    freeMode: {
      postLiveDay: 2,
      world: {
        storyteller: {
          observations: [
            { dayKey: "live+1", category: "visitor", severity: "minor" },
            { dayKey: "live+1", category: "task", severity: "major" }
          ]
        }
      }
    }
  };
  const before = JSON.stringify(state);
  const stats = api.buildRecentStorytellerStats(state, { limit: 8 });
  assert.equal(JSON.stringify(state), before);
  assert.ok(Number.isInteger(stats.calmDays));
  assert.equal(stats.majorEvents, 1);
  assert.equal(stats.categoryCounts.visitor, 1);
});

test("observation v3 normalization preserves style metadata and bounds private fields", () => {
  const api = loadApi();
  const normalized = api.normalizeStorytellerObservation({
    schemaVersion: 2,
    sourceKind: "resolved_candidate",
    saveScope: "chat-a",
    requestId: "request-a",
    turnId: "turn-a",
    dayKey: "live+2",
    timeMinutes: 780,
    actionId: "map_location",
    locationId: "courtyard",
    participantIds: ["producer", "idol:A"],
    category: "visitor",
    severity: "moderate",
    archetypeId: "peer_observation",
    fingerprint: "visitor|peer_observation|idol:A|courtyard|public_attention",
    pressureCount: 2,
    styleId: "heroic",
    operatorIds: ["threshold_test", "resource_constraint", "unknown"],
    prompt: "SECRET PROMPT",
    reply: "SECRET REPLY",
    state: { secret: true }
  });
  assert.deepEqual(JSON.parse(JSON.stringify(normalized)), {
    schemaVersion: 3,
    sourceKind: "resolved_candidate",
    saveScope: "chat-a",
    requestId: "request-a",
    turnId: "turn-a",
    dayKey: "live+2",
    timeMinutes: 780,
    category: "visitor",
    severity: "moderate",
    archetypeId: "peer_observation",
    actionId: "map_location",
    locationId: "courtyard",
    participantIds: ["idol:A", "producer"],
    fingerprint: "visitor|peer_observation|idol:A|courtyard|public_attention",
    pressureCount: 2,
    styleId: "heroic",
    operatorIds: ["resource_constraint", "threshold_test"]
  });
  assert.doesNotMatch(JSON.stringify(normalized), /SECRET|secret/);
});

test("legacy observations migrate to candidate or ambient sources without inventing severity", () => {
  const api = loadApi();
  const resolved = api.normalizeStorytellerObservation({
    schemaVersion: 1,
    category: "visitor",
    severity: "minor",
    archetypeId: "peer_observation"
  });
  const ambient = api.normalizeStorytellerObservation({
    schemaVersion: 1,
    actionId: "phonechat",
    category: "",
    severity: ""
  });
  assert.equal(resolved.sourceKind, "resolved_candidate");
  assert.equal(ambient.sourceKind, "ambient_turn");
  assert.equal(ambient.category, "");
  assert.equal(ambient.severity, "");
});

test("ambient observations count calm days without adding incident category or severity", () => {
  const api = loadApi();
  const state = {
    freeMode: {
      world: {
        storyteller: {
          observations: [
            { schemaVersion: 2, sourceKind: "ambient_turn", dayKey: "live+1", actionId: "training" },
            { schemaVersion: 2, sourceKind: "resolved_candidate", dayKey: "live+2", category: "visitor", severity: "moderate" }
          ]
        }
      }
    }
  };
  const stats = api.buildRecentStorytellerStats(state);
  assert.equal(stats.observedDays, 2);
  assert.equal(stats.calmDays, 1);
  assert.equal(stats.moderateEvents, 1);
  assert.equal(stats.categoryCounts.visitor, 1);
  assert.equal(stats.categoryCounts.task, undefined);
});

test("recording an observation preserves the existing Storyteller plan and candidate subtree", () => {
  const api = loadApi();
  const state = {
    freeMode: {
      postLiveDay: 2,
      world: {
        storyteller: {
          schemaVersion: 2,
          plan: { planId: "plan-a" },
          pendingCandidate: { incidentId: "incident-a" },
          receipts: [{ event: "attached" }],
          observations: []
        }
      }
    }
  };
  const result = api.recordStorytellerObservation(state, {
    sourceKind: "ambient_turn",
    requestId: "request-a",
    turnId: "turn-a",
    dayKey: "live+2",
    actionId: "training"
  }, "chat-a", { activeSaveScope: "chat-a" });
  assert.equal(result.recorded, true);
  assert.equal(state.freeMode.world.storyteller.plan.planId, "plan-a");
  assert.equal(state.freeMode.world.storyteller.pendingCandidate.incidentId, "incident-a");
  assert.equal(state.freeMode.world.storyteller.receipts.length, 1);
  assert.equal(state.freeMode.world.storyteller.observations[0].schemaVersion, 3);
});

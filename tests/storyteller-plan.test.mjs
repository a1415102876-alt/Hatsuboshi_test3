import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

function loadApi() {
  const stylesSource = readFileSync(new URL("../world/storyteller/styles.js", import.meta.url), "utf8");
  const source = readFileSync(new URL("../world/storyteller/plan.js", import.meta.url), "utf8");
  const context = { globalThis: {} };
  vm.runInNewContext(stylesSource, context);
  vm.runInNewContext(source, context);
  return context.globalThis.HatsuWorldStorytellerPlan;
}

test("default plan is safe normal pacing with no major budget", () => {
  const plan = loadApi().defaultStorytellerPlan("live+3", "chat-a");
  assert.equal(plan.pacing, "normal");
  assert.equal(plan.severityBudget.major, 0);
  assert.equal(plan.dayKey, "live+3");
  assert.equal(plan.saveScope, "chat-a");
});

test("normalization bounds enums weights identities and excludes narrative payloads", () => {
  const plan = loadApi().normalizeStorytellerPlan({
    planId: "p".repeat(300),
    dayKey: "live+2",
    saveScope: "chat-a",
    seed: "s".repeat(300),
    generatedByJobId: "job".repeat(100),
    pacing: "apocalypse",
    categoryWeights: { visitor: 999, hostile: -2, invented: 40 },
    severityBudget: { minor: 99, moderate: -1, major: 99 },
    status: "unknown",
    prompt: "SECRET",
    replyText: "NARRATIVE"
  });
  assert.equal(plan.pacing, "normal");
  assert.equal(plan.categoryWeights.visitor, 100);
  assert.equal(plan.categoryWeights.hostile, 0);
  assert.equal("invented" in plan.categoryWeights, false);
  assert.equal(plan.severityBudget.minor, 6);
  assert.equal(plan.severityBudget.moderate, 0);
  assert.equal(plan.severityBudget.major, 1);
  assert.ok(plan.planId.length <= 160);
  assert.ok(plan.seed.length <= 160);
  assert.ok(plan.generatedByJobId.length <= 160);
  assert.equal(JSON.stringify(plan).includes("SECRET"), false);
  assert.equal(JSON.stringify(plan).includes("NARRATIVE"), false);
});

test("null normalization returns an idle safe representation", () => {
  const plan = loadApi().normalizeStorytellerPlan(null);
  assert.equal(plan.status, "expired");
  assert.equal(plan.pacing, "normal");
  assert.equal(plan.severityBudget.major, 0);
});

test("plan building is deterministic and conservative around cooldowns", () => {
  const api = loadApi();
  const input = {
    dayKey: "live+4",
    saveScope: "chat-a",
    seed: "seed-4",
    generatedByJobId: "director-job-suffix",
    stats: {
      calmDays: 3,
      majorEvents: 1,
      moderateEvents: 0,
      minorEvents: 2,
      categoryCounts: { task: 4, visitor: 0 },
      observedDays: 3
    },
    recentFingerprints: ["task|training", "task|lesson"]
  };
  const first = api.buildStorytellerPlan(input);
  const second = api.buildStorytellerPlan(input);
  assert.deepEqual(JSON.parse(JSON.stringify(first)), JSON.parse(JSON.stringify(second)));
  assert.equal(first.severityBudget.major, 0);
  assert.ok(first.categoryWeights.visitor > first.categoryWeights.task);
  assert.equal(api.isCurrentStorytellerPlan(first, "live+4", "chat-a"), true);
  assert.equal(api.isCurrentStorytellerPlan(first, "live+4", "chat-b"), false);
});

test("storyteller plan freezes style mix and revision into its identity", () => {
  const api = loadApi();
  const input = {
    dayKey: "live+4",
    saveScope: "chat-a",
    seed: "seed-4",
    styleMix: { heroic: 35, romance: 65, kaibunsho: 0 },
    styleMixRevision: 4,
    stats: { observedDays: 0 },
    recentFingerprints: []
  };
  const plan = api.buildStorytellerPlan(input);
  const changed = api.buildStorytellerPlan({ ...input, styleMixRevision: 5 });
  assert.equal(plan.schemaVersion, 2);
  assert.equal(plan.styleMixRevision, 4);
  assert.deepEqual(JSON.parse(JSON.stringify(plan.styleMix)), { heroic: 35, romance: 65, kaibunsho: 0 });
  assert.notEqual(plan.planId, changed.planId);
});

test("legacy plan remains readable but is not style aware", () => {
  const plan = loadApi().normalizeStorytellerPlan({
    schemaVersion: 1,
    dayKey: "live+2",
    saveScope: "chat-a",
    status: "committed"
  });
  assert.equal(plan.schemaVersion, 1);
  assert.equal(plan.styleMix, null);
  assert.equal(plan.styleMixRevision, null);
});

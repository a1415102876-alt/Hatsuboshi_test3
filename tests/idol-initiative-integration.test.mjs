import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

const appSource = readFileSync(new URL("../app.js", import.meta.url), "utf8");

function readFunction(source, functionName) {
  const start = source.indexOf(`function ${functionName}(`);
  assert.notEqual(start, -1, `${functionName} must exist`);
  const bodyStart = source.indexOf("{", source.indexOf(")", start));
  let depth = 0;
  let quote = null;
  let escaped = false;
  for (let index = bodyStart; index < source.length; index += 1) {
    const char = source[index];
    if (quote) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === quote) quote = null;
      continue;
    }
    if (char === '"' || char === "'" || char === "`") quote = char;
    else if (char === "{") depth += 1;
    else if (char === "}" && --depth === 0) return source.slice(start, index + 1);
  }
  throw new Error(`Could not parse ${functionName}`);
}

function loadIntegration() {
  const sandbox = { globalThis: {}, console };
  sandbox.globalThis = sandbox;
  for (const file of ["world/storyteller/incidents.js", "world/storyteller/initiative.js"]) {
    vm.runInNewContext(readFileSync(new URL(`../${file}`, import.meta.url), "utf8"), sandbox, { filename: file });
  }
  Object.assign(sandbox, {
    idols: { A: {}, B: {}, C: {}, Stranger: {} },
    state: {
      idol: "A", trust: 30, day: 2,
      phoneChat: { friends: ["B"] },
      freeMode: {
        postLiveDay: 2,
        relationships: { C: { affinity: 10 } },
        world: {
          director: {
            pressures: [],
            characterIntents: [
              { intentId: "intent:b", dayKey: "live+2", saveScope: "scope-a", actorId: "idol:B", targetIds: ["producer"], goal: "Send a private check-in", motive: "Maintain contact", urgency: "normal", visibility: "private", preferredChannels: ["phone"], sourcePressureIds: [], sourceRefs: [], publicPostDraft: "", expiresDayKey: "live+2" },
              { intentId: "intent:c", dayKey: "live+2", saveScope: "scope-a", actorId: "idol:C", targetIds: [], goal: "Share today's progress", motive: "Mark visible progress", urgency: "normal", visibility: "public", preferredChannels: ["sns"], sourcePressureIds: [], sourceRefs: [], publicPostDraft: "Practice went well today.", expiresDayKey: "live+2" },
              { intentId: "intent:stranger", dayKey: "live+2", saveScope: "scope-a", actorId: "idol:Stranger", targetIds: [], goal: "Must not schedule", motive: "Unknown", urgency: "normal", visibility: "private", preferredChannels: ["phone"], sourcePressureIds: [], sourceRefs: [], publicPostDraft: "", expiresDayKey: "live+2" }
            ]
          },
          storyteller: {
            plan: { planId: "plan-a", seed: "seed-a", dayKey: "live+2", saveScope: "scope-a", status: "committed", severityBudget: { minor: 4, moderate: 3, major: 0 } },
            pendingCandidate: { incidentId: "ordinary", planId: "plan-a", saveScope: "scope-a", dayKey: "live+2", severity: "minor", status: "pending" },
            recentCandidates: [], recentFingerprints: [], initiative: null
          }
        }
      }
    },
    canonicalIdolName: (name) => String(name || ""),
    getAffinityStageThreshold: () => 1,
    getWorldFeedDayKey: () => "live+2",
    getSecondaryChannelSaveScope: () => "scope-a",
    saveState: () => {},
    HatsuIdolRoster: { getAssignedIdols: () => ["A", "C"] },
    HatsuWorldStorytellerPlan: { isCurrentStorytellerPlan: (plan, day, scope) => plan?.dayKey === day && plan?.saveScope === scope }
  });
  sandbox.globalThis = sandbox;
  const functions = ["getKnownInitiativeIdolNames", "getKnownInitiativeCharacters", "enrichCharacterIntentContext", "ensureIdolInitiativesForToday"]
    .map((name) => readFunction(appSource, name)).join("\n");
  return vm.runInNewContext(`${functions}\n({ getKnownInitiativeIdolNames, getKnownInitiativeCharacters, ensureIdolInitiativesForToday })`, sandbox);
}

test("known initiative roster includes assigned, responsible, friends, and established relationships only", () => {
  const api = loadIntegration();
  assert.deepEqual(JSON.parse(JSON.stringify(api.getKnownInitiativeIdolNames())), ["A", "B", "C"]);
  assert.deepEqual(JSON.parse(JSON.stringify(api.getKnownInitiativeCharacters().map((item) => [item.name, item.assigned, item.known]))), [
    ["A", true, true], ["B", false, true], ["C", true, true]
  ]);
});

test("daily scheduling keeps ordinary pending candidates and excludes stranger intents", () => {
  const api = loadIntegration();
  const result = api.ensureIdolInitiativesForToday({ persist: false });
  assert.equal(result.committed, true);
  assert.equal(result.candidates.length, 2);
  assert.deepEqual(JSON.parse(JSON.stringify(result.candidates.map((item) => item.actorIds[0]).sort())), ["idol:B", "idol:C"]);
  assert.equal(result.candidates.some((item) => item.actorIds.includes("idol:Stranger")), false);
  assert.equal(result.candidates.some((item) => item.channel === "phone"), true);
  assert.equal(result.candidates.some((item) => item.channel === "sns"), true);
});

test("frontend loads initiative before app and normalizes the old-save subtree", () => {
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  const st = readFileSync(new URL("../st.html", import.meta.url), "utf8");
  assert.ok(html.indexOf("world/storyteller/initiative.js") < html.indexOf("app.js"));
  assert.match(st, /"world\/storyteller\/initiative\.js"/);
  assert.match(appSource, /initiative:\s*initiativeApi\?\.ensureInitiativeState/);
});

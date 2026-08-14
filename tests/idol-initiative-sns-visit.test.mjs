import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

const appSource = readFileSync(new URL("../app.js", import.meta.url), "utf8");

function readFunction(name) {
  const start = appSource.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `${name} must exist`);
  const bodyStart = appSource.indexOf("{", appSource.indexOf(")", start));
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

test("initiative SNS publication merges a stable post and resolves only after insertion", () => {
  const sandbox = { globalThis: {}, console };
  sandbox.globalThis = sandbox;
  for (const file of ["world/storyteller/incidents.js", "world/storyteller/initiative.js", "world/buzz-pool.js"]) {
    vm.runInNewContext(readFileSync(new URL(`../${file}`, import.meta.url), "utf8"), sandbox, { filename: file });
  }
  const selected = sandbox.HatsuWorldStorytellerInitiative.selectInitiativeCandidates({
    plan: { planId: "plan-a", seed: "seed-a", severityBudget: { minor: 4, moderate: 3, major: 0 } },
    saveScope: "scope-a", dayKey: "live+2", dayOrdinal: 2, knownActorIds: ["producer", "idol:A"],
    intents: [{ intentId: "intent:a", dayKey: "live+2", saveScope: "scope-a", actorId: "idol:A", targetIds: [], goal: "Share progress", motive: "Public update", urgency: "normal", visibility: "public", preferredChannels: ["sns"], sourcePressureIds: [], sourceRefs: [], publicPostDraft: "Practice went well today.", expiresDayKey: "live+2" }],
    recentCandidates: [], recentFingerprints: []
  }).candidates[0];
  Object.assign(sandbox, {
    state: { freeMode: { world: { buzz: { items: [{ id: "ordinary", dayKey: "live+2", text: "Keep me" }] }, storyteller: { plan: { planId: "plan-a" }, initiative: { candidates: [selected] } } } } },
    getWorldFeedDayKey: () => "live+2",
    getSecondaryChannelSaveScope: () => "scope-a",
    canonicalIdolName: (name) => name,
    saveState: () => {}
  });
  const sync = vm.runInNewContext(`(${readFunction("syncIdolInitiativeSnsPosts")})`, sandbox);
  assert.equal(sync({ persist: false }), 1);
  assert.equal(sandbox.state.freeMode.world.buzz.items.some((item) => item.id === "ordinary"), true);
  const post = sandbox.state.freeMode.world.buzz.items.find((item) => item.source === "character_intent");
  assert.equal(post.id, `initiative:${selected.incidentId}`);
  assert.equal(post.text, "Practice went well today.");
  assert.equal(sandbox.state.freeMode.world.storyteller.initiative.candidates[0].status, "resolved");
  assert.equal(sync({ persist: false }), 0);
  assert.equal(sandbox.state.freeMode.world.buzz.items.filter((item) => item.id === post.id).length, 1);
});

test("apartment visit UI exposes doorbell choices and checks apartment time legality", () => {
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  assert.match(html, /id="apartmentDoorbellBtn"[^>]*hidden/);
  for (const id of ["apartmentVisitorAcceptBtn", "apartmentVisitorDeferBtn", "apartmentVisitorDeclineBtn"]) assert.match(html, new RegExp(`id="${id}"`));
  const finder = readFunction("getApartmentInitiativeVisitorCandidate");
  assert.match(finder, /isProducerApartmentActive/);
  assert.match(finder, /18 \* 60/);
  assert.match(finder, /23 \* 60/);
  assert.match(finder, /deferredUntilWorldMinute/);
});

test("visit acceptance acquires the primary channel before consuming the candidate and freezes exact identity", () => {
  const accept = readFunction("acceptApartmentInitiativeVisitor");
  assert.ok(accept.indexOf("tryAcquirePrimaryModelChannel") < accept.indexOf('transitionApartmentInitiative("accept")'));
  for (const field of ["candidateId", "intentId", "saveScope", "dayKey", "planId"]) assert.match(accept, new RegExp(field));
  assert.match(readFunction("deferApartmentInitiativeVisitor"), /transitionApartmentInitiative\("defer"\)/);
  assert.match(readFunction("declineApartmentInitiativeVisitor"), /transitionApartmentInitiative\("decline"\)/);
  assert.match(readFunction("resolveApartmentInitiativeDelivery"), /transitionInitiativeCandidate[\s\S]*"resolve"/);
  assert.match(appSource, /resolveApartmentInitiativeDelivery\(state\.pendingActionContext\?\.actionContext\)/);
});

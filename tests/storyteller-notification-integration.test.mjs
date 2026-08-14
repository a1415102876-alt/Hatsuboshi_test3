import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const appSource = readFileSync(new URL("../app.js", import.meta.url), "utf8");

function readFunction(name) {
  const start = appSource.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `${name} must exist`);
  const bodyStart = appSource.indexOf("{", appSource.indexOf(")", start));
  let depth = 0, quote = "", escaped = false;
  for (let i = bodyStart; i < appSource.length; i += 1) {
    const ch = appSource[i];
    if (quote) { if (escaped) escaped = false; else if (ch === "\\") escaped = true; else if (ch === quote) quote = ""; continue; }
    if (ch === '"' || ch === "'" || ch === "`") quote = ch;
    else if (ch === "{") depth += 1;
    else if (ch === "}" && --depth === 0) return appSource.slice(start, i + 1);
  }
  throw new Error(name);
}

test("notification scan exists and is wired only at committed checkpoints", () => {
  const scan = readFunction("scanStorytellerNotificationAtCheckpoint");
  assert.match(scan, /requiredChannel:\s*"invite"/);
  assert.doesNotMatch(scan, /requestHostPromptSend|tryAcquirePrimaryModelChannel|advanceFreeModeTime/);
  assert.doesNotMatch(readFunction("advanceFreeModeTime"), /scanStorytellerNotificationAtCheckpoint/);
  assert.match(readFunction("openPhoneSnsApp"), /scanStorytellerNotificationAtCheckpoint\("open_sns"/);
  assert.match(readFunction("openPhoneWorldEngineApp"), /scanStorytellerNotificationAtCheckpoint\("open_world_engine"/);

  const manualTime = readFunction("applyFreeModeManualTimeAdvance");
  assert.ok(manualTime.indexOf("saveState(") < manualTime.indexOf('scanStorytellerNotificationAtCheckpoint("time_advance"'));
  for (const name of ["handleApartmentCompanionChoiceSelection", "handleApartmentCompanionCustomChoice"]) {
    const body = readFunction(name);
    const save = body.indexOf("saveState(");
    const scan = body.indexOf('scanStorytellerNotificationAtCheckpoint("time_advance"');
    const nextRequest = body.indexOf("requestNextApartmentCompanionOptions");
    assert.ok(save >= 0 && save < scan && scan < nextRequest, name);
  }
  const ack = readFunction("sendAiReplyAck");
  const resolutionSave = ack.indexOf('saveState("storyteller.candidate_resolved")');
  const mapScan = ack.indexOf('scanStorytellerNotificationAtCheckpoint("map_complete"');
  assert.ok(resolutionSave >= 0 && resolutionSave < mapScan);
});

test("notification scan mutates only Storyteller state and never calls a model or owner", () => {
  const state = {
    idol: "A", Vo: 10, Da: 20, Vi: 30, tasks: { marker: true }, log: [{ marker: true }],
    harness: { activeTurn: null },
    freeMode: {
      postLiveDay: 2, clockMinutes: 600, activeLocationId: "courtyard", facilityLocationId: "courtyard",
      world: { director: { pressures: [] }, storyteller: {
        plan: { planId: "plan-a", saveScope: "chat-a", dayKey: "live+2", seed: "seed", pacing: "normal", status: "committed", categoryWeights: { visitor: 50, opportunity: 50, task: 50, resource: 50 }, severityBudget: { minor: 3, moderate: 2, major: 0 }, diversity: {} },
        pendingCandidate: null, recentCandidates: [], recentFingerprints: [], receipts: []
      } }
    }
  };
  const before = JSON.stringify({ Vo: state.Vo, Da: state.Da, Vi: state.Vi, tasks: state.tasks, log: state.log, clock: state.freeMode.clockMinutes, activeTurn: state.harness.activeTurn });
  let saves = 0, modelCalls = 0, ownerCalls = 0;
  const incidents = { selectIncidentCandidate(input) { assert.equal(input.requiredChannel, "invite"); assert.equal(input.allowMajorConfirmation, true); return { candidate: { incidentId: "incident:a", definitionId: "major_visitor_authority_arrival", planId: "plan-a", saveScope: "chat-a", dayKey: "live+2", sourceTurnId: input.sourceTurnId, category: "visitor", severity: "major", archetypeId: "authority_arrival", actorIds: ["idol:A"], locationId: "courtyard", channel: "invite", status: "pending", requiresConfirmation: true }, diagnostic: {} }; }, normalizeIncidentCandidate: (value) => value, normalizeSelectionDiagnostic: () => ({}) };
  const notifications = { buildStorytellerWorldMinute: () => 3480, canScanNotification: () => ({ ok: true }), transitionNotification(candidate) { return { ok: true, candidate: { ...candidate, status: "notified", notification: {} } }; } };
  const sandbox = {
    state, globalThis: { HatsuWorldStorytellerIncidents: incidents, HatsuWorldStorytellerNotifications: notifications },
    activeHostSaveScope: "chat-a", activeStorageKey: "", getSecondaryChannelSaveScope: () => "chat-a", getWorldFeedDayKey: () => "live+2",
    buildStorytellerIncidentContext: (_a, _b, options) => ({ plan: state.freeMode.world.storyteller.plan, saveScope: "chat-a", dayKey: "live+2", sourceTurnId: options.turnId, action: "notification", locationId: "courtyard" }),
    saveState: () => { saves += 1; }, Date, requestHostPromptSend: () => { modelCalls += 1; }, tryAcquirePrimaryModelChannel: () => { ownerCalls += 1; }
  };
  vm.runInNewContext(`${readFunction("scanStorytellerNotificationAtCheckpoint")}; this.scan = scanStorytellerNotificationAtCheckpoint;`, sandbox);
  const result = sandbox.scan("open_world_engine", { locationId: "courtyard" });
  assert.equal(result.notified, true);
  assert.equal(state.freeMode.world.storyteller.pendingCandidate.status, "notified");
  assert.equal(JSON.stringify({ Vo: state.Vo, Da: state.Da, Vi: state.Vi, tasks: state.tasks, log: state.log, clock: state.freeMode.clockMinutes, activeTurn: state.harness.activeTurn }), before);
  assert.equal(saves, 1); assert.equal(modelCalls, 0); assert.equal(ownerCalls, 0);
});

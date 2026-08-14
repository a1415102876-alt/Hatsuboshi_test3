import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const root = new URL("../", import.meta.url);
const html = readFileSync(new URL("index.html", root), "utf8");
const st = readFileSync(new URL("st.html", root), "utf8");

function loadApis() {
  const sandbox = { globalThis: {} };
  vm.runInNewContext(readFileSync(new URL("world/storyteller/incidents.js", root), "utf8"), sandbox);
  vm.runInNewContext(readFileSync(new URL("world/storyteller/notifications.js", root), "utf8"), sandbox);
  return {
    incidents: sandbox.globalThis.HatsuWorldStorytellerIncidents,
    notifications: sandbox.globalThis.HatsuWorldStorytellerNotifications
  };
}

function candidate(overrides = {}) {
  return {
    incidentId: "incident:a",
    planId: "plan-a",
    saveScope: "chat-a",
    dayKey: "live+2",
    sourceTurnId: "notify:live+2:3480:courtyard",
    fingerprint: "visitor|peer_invitation|idol:A|courtyard|",
    category: "visitor",
    severity: "minor",
    archetypeId: "peer_invitation",
    actorIds: ["idol:A"],
    targetIds: ["producer"],
    locationId: "courtyard",
    modifierIds: [],
    channel: "invite",
    pressureIds: [],
    status: "pending",
    requiresConfirmation: false,
    ...overrides
  };
}

test("notification module loads after incidents and before app", () => {
  const htmlIncidents = html.indexOf("world/storyteller/incidents.js");
  const htmlNotifications = html.indexOf("world/storyteller/notifications.js");
  const htmlApp = html.indexOf("app.js", htmlNotifications);
  assert.ok(htmlIncidents >= 0 && htmlNotifications > htmlIncidents && htmlApp > htmlNotifications);
  assert.ok(st.indexOf('"world/storyteller/incidents.js"') < st.indexOf('"world/storyteller/notifications.js"'));
  assert.ok(st.indexOf('"world/storyteller/notifications.js"') < st.indexOf("fetch(abs('app.js')"));
});

test("notification metadata normalizes without leaking narrative fields", () => {
  const { incidents } = loadApis();
  const normalized = incidents.normalizeIncidentCandidate(candidate({
    status: "notified",
    notification: {
      notifiedAtWorldMinute: 3480,
      deferredUntilWorldMinute: null,
      expiresAtWorldMinute: 4920,
      notificationReason: "time_advance",
      prompt: "SECRET_PROMPT",
      narrative: "SECRET_NARRATIVE"
    }
  }));
  assert.equal(normalized.status, "notified");
  assert.deepEqual(JSON.parse(JSON.stringify(normalized.notification)), {
    notifiedAtWorldMinute: 3480,
    deferredUntilWorldMinute: null,
    expiresAtWorldMinute: 4920,
    notificationReason: "time_advance"
  });
  assert.doesNotMatch(JSON.stringify(normalized), /SECRET/);
});

test("world minute and notification lifecycle are deterministic and bounded", () => {
  const { notifications } = loadApis();
  assert.equal(notifications.buildStorytellerWorldMinute({ dayOrdinal: 2, clockMinutes: 600 }), 3480);
  const notified = notifications.transitionNotification(candidate(), "notify", {
    saveScope: "chat-a", dayKey: "live+2", planId: "plan-a", sourceTurnId: "notify:live+2:3480:courtyard",
    worldMinute: 3480, reason: "open_world_engine"
  });
  assert.equal(notified.ok, true);
  assert.equal(notified.candidate.status, "notified");
  const deferred = notifications.transitionNotification(notified.candidate, "defer", {
    saveScope: "chat-a", dayKey: "live+2", planId: "plan-a", sourceTurnId: "notify:live+2:3480:courtyard",
    worldMinute: 3480
  });
  assert.equal(deferred.candidate.status, "deferred");
  assert.equal(deferred.candidate.notification.deferredUntilWorldMinute, 3540);
  assert.equal(notifications.getNotificationBadgeState(deferred.candidate, 3539).visible, false);
  assert.equal(notifications.getNotificationBadgeState(deferred.candidate, 3540).visible, true);
  const ignored = notifications.transitionNotification(notified.candidate, "ignore", {
    saveScope: "chat-a", dayKey: "live+2", planId: "plan-a", sourceTurnId: "notify:live+2:3480:courtyard",
    worldMinute: 3480
  });
  assert.equal(ignored.candidate.status, "expired");
});

test("notification transitions require exact ownership and legacy metadata stays absent", () => {
  const { incidents, notifications } = loadApis();
  assert.equal(incidents.normalizeIncidentCandidate(candidate()).notification, null);
  const mismatch = notifications.transitionNotification(candidate(), "notify", {
    saveScope: "chat-b", dayKey: "live+2", planId: "plan-a", sourceTurnId: "notify:live+2:3480:courtyard",
    worldMinute: 3480, reason: "open_sns"
  });
  assert.equal(mismatch.ok, false);
  assert.equal(mismatch.reason, "candidate_ownership_mismatch");
  assert.equal(notifications.normalizeNotificationMeta(null), null);
});

test("notification audit receipt is bounded and excludes narrative request and pressure data", () => {
  const { notifications } = loadApis();
  const receipt = notifications.buildNotificationReceipt({
    event: "declined",
    reason: "player_confirmed_major_decline",
    dayKey: "live+4",
    saveScope: "chat-a",
    createdAt: 123456,
    incidentId: "incident:SECRET",
    requestId: "request:SECRET",
    channelLeaseId: "lease:SECRET",
    prompt: "PROMPT SECRET",
    response: "RESPONSE SECRET",
    pressureFacts: [{ pressureId: "pressure:SECRET", content: "SECRET" }],
    state: { secret: true }
  });

  assert.deepEqual(JSON.parse(JSON.stringify(receipt)), {
    event: "declined",
    reason: "player_confirmed_major_decline",
    dayKey: "live+4",
    saveScope: "chat-a",
    createdAt: 123456
  });
  assert.ok(JSON.stringify(receipt).length <= 320);
  assert.doesNotMatch(JSON.stringify(receipt), /SECRET|incident|request|lease|prompt|response|pressure|state/i);
});

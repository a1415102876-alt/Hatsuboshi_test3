import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

const appSource = readFileSync(new URL("../app.js", import.meta.url), "utf8");
const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const css = readFileSync(new URL("../style.css", import.meta.url), "utf8");

function readFunction(functionName) {
  const start = appSource.indexOf(`function ${functionName}(`);
  assert.notEqual(start, -1, `${functionName} must exist`);
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
  throw new Error(`Could not parse ${functionName}`);
}

test("sandbox rail exposes an external event shortcut with a red-dot badge", () => {
  assert.match(html, /id="freeModeEventBtn"/);
  assert.match(html, /id="freeModeEventBadge"/);
  assert.match(html, /href="#icon-bell"/);
  assert.match(css, /\.free-mode-event-btn\s*\{/);
  assert.match(css, /\.free-mode-event-badge\s*\{/);
});

test("short viewports compact the full sandbox rail without dropping the event shortcut", () => {
  const compactStart = css.indexOf("@media (max-height: 640px)");
  assert.notEqual(compactStart, -1);
  const compact = css.slice(compactStart, compactStart + 1800);
  assert.match(compact, /#freeModeAffinityBtn/);
  assert.match(compact, /#freeModeTaskPanelBtn/);
  assert.match(compact, /#freeModeSideQuestBtn/);
  assert.match(compact, /#freeModeEventBtn/);
  assert.match(compact, /#freeModePhoneBtn/);
  assert.match(compact, /#freeModeBagBtn/);
  assert.match(compact, /#freeModeApartmentBtn/);
  assert.match(compact, /min-height:\s*48px/);
});

test("external event badge only recognizes current actionable invite candidates", () => {
  const context = {
    state: { freeMode: { world: { storyteller: { pendingCandidate: null } } } },
    globalThis: {
      HatsuWorldStorytellerIncidents: { normalizeIncidentCandidate: (candidate) => candidate }
    },
    getWorldFeedDayKey: () => "live+2",
    getSecondaryChannelSaveScope: () => "scope-a"
  };
  context.globalThis = { ...context.globalThis };
  vm.runInNewContext(`${readFunction("hasPendingExternalStorytellerEvent")}; this.check = hasPendingExternalStorytellerEvent;`, context);
  const base = { channel: "invite", status: "notified", dayKey: "live+2", saveScope: "scope-a" };
  assert.equal(context.check(base), true);
  assert.equal(context.check({ ...base, status: "deferred" }), true);
  assert.equal(context.check({ ...base, status: "invited" }), false);
  assert.equal(context.check({ ...base, channel: "attach" }), false);
  assert.equal(context.check({ ...base, channel: "phone" }), false);
  assert.equal(context.check({ ...base, channel: "sns" }), false);
  assert.equal(context.check({ ...base, dayKey: "live+1" }), false);
  assert.equal(context.check({ ...base, saveScope: "scope-b" }), false);
});

test("shortcut resumes an active conversation or opens the existing world-engine event tab", () => {
  const body = readFunction("openExternalStorytellerEventShortcut");
  assert.match(body, /resumeActiveStorytellerEventConversation\(\)/);
  assert.match(body, /openPhoneOverlay\(\)/);
  assert.match(body, /openPhoneWorldEngineApp\(\)/);
  assert.match(body, /setWorldEnginePhoneTab\("events"\)/);
  assert.doesNotMatch(body, /innerHTML|pendingCandidate\s*=/);
});

test("free-mode rendering and storyteller transitions refresh the shortcut badge", () => {
  assert.match(readFunction("renderFreeModeStage"), /updateFreeModeEventButton\(\)/);
  assert.match(readFunction("transitionStorytellerInboxAction"), /updateFreeModeEventButton\(\)/);
  assert.match(readFunction("dispatchAcceptedStorytellerCandidate"), /updateFreeModeEventButton\(\)/);
  assert.match(appSource, /freeModeEventBtn[^\n]*addEventListener\("click", openExternalStorytellerEventShortcut\)/);
});

test("external event conversations normalize to a bounded allowlisted shape", () => {
  const context = {};
  vm.runInNewContext(`${readFunction("normalizeStorytellerEventConversation")}; this.normalize = normalizeStorytellerEventConversation;`, context);
  assert.equal(context.normalize(null), null);
  assert.equal(context.normalize({ status: "unknown" }), null);
  const noMessage = context.normalize({
    incidentId: "incident-a", planId: "plan-a", saveScope: "scope-a", dayKey: "live+2",
    sourceTurnId: "notify-a", turnId: "storyteller-turn-a", status: "generating",
    round: 0, storySegments: [], summaries: [], choices: [], selectedActions: [], lastMessageId: null
  });
  assert.equal(noMessage.lastMessageId, null);
  const normalized = context.normalize({
    incidentId: "incident-a",
    planId: "plan-a",
    saveScope: "scope-a",
    dayKey: "live+2",
    sourceTurnId: "notify-a",
    turnId: "storyteller-turn-a",
    status: "awaiting_choice",
    round: 99,
    storySegments: Array.from({ length: 12 }, (_, index) => `story-${index}-${"x".repeat(900)}`),
    summaries: Array.from({ length: 12 }, (_, index) => `summary-${index}-${"y".repeat(300)}`),
    choices: ["a", "b", "c", "d", "e"],
    selectedActions: Array.from({ length: 12 }, (_, index) => `action-${index}`),
    lastRequestId: "request-a",
    lastMessageId: 42,
    secretPrompt: "must not survive"
  });
  assert.equal(normalized.status, "awaiting_choice");
  assert.equal(normalized.round, 99);
  assert.equal(normalized.storySegments.length, 8);
  assert.equal(normalized.summaries.length, 8);
  assert.equal(normalized.choices.length, 4);
  assert.equal(normalized.selectedActions.length, 8);
  assert.ok(normalized.storySegments.every((item) => item.length <= 800));
  assert.ok(normalized.summaries.every((item) => item.length <= 240));
  assert.equal(normalized.lastMessageId, 42);
  assert.equal("secretPrompt" in normalized, false);
  assert.match(appSource, /pendingCandidate:\s*null,[\s\S]{0,180}activeConversation:\s*null/);
  assert.match(appSource, /activeConversation:\s*normalizeStorytellerEventConversation\(storyteller\.activeConversation\)/);
});

test("event conversations reuse generated choices custom input and an immediate end control", () => {
  assert.match(readFunction("isChoicePromptAction"), /storyteller_event/);
  assert.match(readFunction("handleChoiceSelection"), /handleStorytellerEventChoiceSelection/);
  assert.match(readFunction("handleVnCustomChoiceSubmit"), /handleStorytellerEventCustomChoice/);
  const choices = readFunction("showVnChoicesOverlay");
  assert.match(choices, /isStorytellerEventConversationChoiceActive/);
  assert.match(choices, /自定义输入/);
  assert.match(choices, /结束话题/);
  assert.match(choices, /endStorytellerEventConversation/);
});

test("event continuation keeps exact identity and uses one shared round dispatcher", () => {
  const prompt = readFunction("buildStorytellerEventContinuationPrompt");
  assert.match(prompt, /selectedAction/);
  assert.match(prompt, /summaries|storySegments/);
  assert.match(prompt, /option1|buildChoiceOnlyExample|galgameRenderContract\("choice"\)/);
  assert.doesNotMatch(prompt, /advanceFreeModeTime\(|settleAction\(/);
  assert.match(prompt, /不输出 relationship_update/);
  const request = readFunction("requestNextStorytellerEventRound");
  assert.match(request, /tryAcquirePrimaryModelChannel/);
  assert.match(request, /ownerKind:\s*"storyteller_event"/);
  assert.match(request, /conversation\.turnId/);
  assert.match(request, /captureHarnessGenerationPrompt/);
  assert.match(request, /requestHostPromptSend/);
  assert.doesNotMatch(request, /transitionNotification\([^)]*"resolve"/);
});

test("new notifications and refreshed awaiting-choice sessions keep the external event state live", () => {
  assert.match(readFunction("scanStorytellerNotificationAtCheckpoint"), /updateFreeModeEventButton/);
  const reconcile = readFunction("reconcileStorytellerEventConversationSession");
  assert.match(reconcile, /status !== "awaiting_choice"/);
  assert.match(reconcile, /sessionEpoch:\s*runtimeSessionEpoch/);
  assert.match(reconcile, /requestId:\s*""/);
  assert.match(readFunction("ensureStateShape"), /reconcileStorytellerEventConversationSession\(\)/);
  assert.match(readFunction("requestNextStorytellerEventRound"), /sessionEpoch:\s*runtimeSessionEpoch/);
});

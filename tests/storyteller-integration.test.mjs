import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const appSource = readFileSync(new URL("../app.js", import.meta.url), "utf8");
const htmlSource = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const stSource = readFileSync(new URL("../st.html", import.meta.url), "utf8");
const observationSource = readFileSync(new URL("../world/storyteller/observations.js", import.meta.url), "utf8");

function loadObservationApi() {
  const context = { globalThis: {} };
  vm.runInNewContext(observationSource, context);
  return context.globalThis.HatsuWorldStorytellerObservations;
}

function readFunction(name) {
  const start = appSource.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `${name} must exist`);
  const bodyStart = appSource.indexOf("{", start);
  let depth = 0;
  let quote = "";
  let escaped = false;
  for (let index = bodyStart; index < appSource.length; index += 1) {
    const char = appSource[index];
    if (quote) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === quote) quote = "";
      continue;
    }
    if (char === '"' || char === "'" || char === "`") quote = char;
    else if (char === "{") depth += 1;
    else if (char === "}" && --depth === 0) return appSource.slice(start, index + 1);
  }
  throw new Error(`Could not parse ${name}`);
}

test("app wires a bounded Storyteller observation state without starting a model request", () => {
  assert.match(appSource, /storyteller/);
  assert.match(appSource, /recordStorytellerObservation/);
  assert.doesNotMatch(appSource, /requestHostSecondaryPromptSend\([^)]*storyteller/);
  assert.match(htmlSource, /storyteller\/observations\.js/);
});

test("Storyteller observation state is scoped and does not become a normal gameplay log", () => {
  assert.match(appSource, /saveScope/);
  assert.match(appSource, /observations/);
  assert.match(appSource, /saveState\("storyteller\.observation"\)/);
  assert.doesNotMatch(appSource, /state\.log\.unshift\([^)]*storyteller/);
});

test("recordStorytellerObservation records bounded metadata without changing business state", () => {
  const api = loadObservationApi();
  const state = {
    Vo: 100,
    Da: 90,
    Vi: 80,
    stamina: 70,
    stress: 10,
    trust: 20,
    log: [{ action: "training" }],
    harness: { activeTurn: { turnId: "turn-1" } },
    freeMode: {
      postLiveDay: 2,
      clockMinutes: 780,
      world: {
        storyteller: {
          schemaVersion: 1,
          observations: [],
          recentFingerprints: [],
          lastObservedDayKey: ""
        }
      }
    }
  };
  const businessBefore = JSON.stringify({
    Vo: state.Vo,
    Da: state.Da,
    Vi: state.Vi,
    stamina: state.stamina,
    stress: state.stress,
    trust: state.trust,
    log: state.log,
    activeTurn: state.harness.activeTurn,
    clockMinutes: state.freeMode.clockMinutes
  });

  const result = api.recordStorytellerObservation(state, {
    dayKey: "live+2",
    category: "task",
    severity: "minor",
    fingerprint: "task|training|producer,idol:test|training-room|",
    ignoredPrompt: "SECRET"
  }, "chat-a", { activeSaveScope: "chat-a" });

  assert.deepEqual(JSON.parse(JSON.stringify(result)), { recorded: true, reason: "recorded" });
  assert.equal(state.freeMode.world.storyteller.observations.length, 1);
  assert.equal(JSON.stringify(state.freeMode.world.storyteller).includes("SECRET"), false);
  assert.equal(JSON.stringify({
    Vo: state.Vo,
    Da: state.Da,
    Vi: state.Vi,
    stamina: state.stamina,
    stress: state.stress,
    trust: state.trust,
    log: state.log,
    activeTurn: state.harness.activeTurn,
    clockMinutes: state.freeMode.clockMinutes
  }), businessBefore);
});

test("recordStorytellerObservation rejects empty and mismatched save scopes", () => {
  const api = loadObservationApi();
  const state = { freeMode: { world: { storyteller: { observations: [] } } } };

  assert.equal(api.recordStorytellerObservation(state, {}, "", { activeSaveScope: "chat-a" }).reason, "save_scope_required");
  assert.equal(api.recordStorytellerObservation(state, {}, "chat-b", { activeSaveScope: "chat-a" }).reason, "save_scope_mismatch");
  assert.equal(state.freeMode.world.storyteller.observations.length, 0);
});

test("daily Storyteller plan scheduler is local scoped and idempotent", () => {
  assert.match(appSource, /function ensureStorytellerPlanForCheckpoint\(/);
  assert.match(appSource, /isCurrentStorytellerPlan/);
  assert.match(appSource, /saveState\("storyteller\.plan_committed"\)/);
  assert.match(appSource, /trigger === "day_change"/);
  assert.doesNotMatch(appSource, /requestHostSecondaryPromptSend\([^)]*Storyteller/);
  assert.match(htmlSource, /storyteller\/plan\.js/);
  assert.match(stSource, /storyteller\/plan\.js/);
});

test("saved event density is normalized and passed only into new Storyteller plans", () => {
  const shapeStart = appSource.indexOf("function ensureStateShape");
  const shapeEnd = appSource.indexOf("function recordStorytellerObservation", shapeStart);
  const shapeBody = appSource.slice(shapeStart, shapeEnd);
  assert.match(shapeBody, /normalizeEventDensityConfig/);
  assert.match(shapeBody, /storyteller\.eventDensityConfig/);

  const planStart = appSource.indexOf("function ensureStorytellerPlanForCheckpoint");
  const planEnd = appSource.indexOf("function activateStorytellerStyleMixForDay", planStart);
  const planBody = appSource.slice(planStart, planEnd);
  assert.match(planBody, /eventDensityConfig:\s*storyteller\.eventDensityConfig/);
  assert.ok(planBody.indexOf("isCurrentStorytellerPlan") < planBody.indexOf("buildStorytellerPlan"));
});

test("manual Storyteller replacement remains behind confirmation and owner checks", () => {
  const manualStart = appSource.indexOf("function requestManualWorldDirectorRecalculation");
  const manualEnd = appSource.indexOf("function maybeFollowWorldDirectorAfterPublicWorld", manualStart);
  const manualBody = appSource.slice(manualStart, manualEnd);
  assert.ok(manualStart >= 0 && manualEnd > manualStart);
  assert.match(manualBody, /getPrimaryModelChannelOwner\(\) \|\| getSecondaryModelChannelOwner\(\)/);
  assert.match(manualBody, /window\.confirm/);
  assert.match(manualBody, /ensureStorytellerPlanForCheckpoint\("manual"/);
  const planIndex = manualBody.indexOf('ensureStorytellerPlanForCheckpoint("manual"');
  const requestIndex = manualBody.indexOf("maybeRequestWorldDirector");
  assert.ok(planIndex > manualBody.indexOf("window.confirm"));
  assert.ok(requestIndex > planIndex, "local Storyteller commit must precede the optional Director request");
  const replyStart = appSource.indexOf("function handleWorldDirectorReply");
  const replyEnd = appSource.indexOf("function requestManualWorldDirectorRecalculation", replyStart);
  assert.doesNotMatch(appSource.slice(replyStart, replyEnd), /ensureStorytellerPlanForCheckpoint\("manual"/);
});

test("day transition activates pending style mix before plan and Director preparation", () => {
  const start = appSource.indexOf("function advanceFreeModeToNextDay");
  const end = appSource.indexOf("function parseFreeModeManualAdvanceMinutes", start);
  const body = appSource.slice(start, end);
  assert.ok(start >= 0 && end > start);
  const activation = body.indexOf("activateStorytellerStyleMixForDay");
  const plan = body.indexOf('ensureStorytellerPlanForCheckpoint("day_change")');
  const director = body.indexOf('prepareWorldDirectorJob("day_change"');
  assert.ok(activation >= 0, "day transition must activate pending style mix");
  assert.ok(plan > activation, "daily Plan must freeze the activated mix");
  assert.ok(director > plan, "Director job must freeze the same mix after Plan creation");
});

test("manual current-day replan never activates pending style settings", () => {
  const start = appSource.indexOf("function requestManualWorldDirectorRecalculation");
  const end = appSource.indexOf("function maybeFollowWorldDirectorAfterPublicWorld", start);
  assert.doesNotMatch(appSource.slice(start, end), /activateStorytellerStyleMixForDay/);
});

test("sandbox first day creates a Storyteller plan only for the static world path", () => {
  function execute(worldTickMode) {
    const calls = [];
    const context = {
      state: { idol: "藤田琴音", freeMode: { world: {} } },
      FREE_MODE_DAY_START_MINUTES: 480,
      ensureFreeModeTimeDefaults: () => calls.push("defaults"),
      HatsuTasks: {
        syncSandboxMacroPhase: () => calls.push("sync-phase"),
        isSandboxTasksActive: () => false
      },
      HatsuWorld: { campusBehavior: { getIdolCampusSlot: () => null } },
      runFreeModeWorldDailyTick: () => { calls.push("daily-tick"); return worldTickMode; },
      ensureStorytellerPlanForCheckpoint: (trigger) => calls.push(`ensure-plan:${trigger}`),
      document: { body: { classList: { add: () => calls.push("body-class") } } },
      saveState: () => calls.push("save"),
      render: () => calls.push("render"),
      getHatsuWorldHelpers: () => ({}),
      getWorldMapLocation: () => null,
      formatCampusDayLabel: () => "学园第 1 天",
      formatFreeModeClock: () => "08:00",
      showToast: () => calls.push("toast")
    };
    context.globalThis = context;
    vm.runInNewContext(`${readFunction("enterSandboxCampusAfterOpening")}; this.enter = enterSandboxCampusAfterOpening;`, context);
    context.enter();
    return calls;
  }

  const staticCalls = execute("static");
  assert.equal(staticCalls.filter((item) => item === "ensure-plan:day_change").length, 1);
  assert.ok(staticCalls.indexOf("daily-tick") < staticCalls.indexOf("ensure-plan:day_change"));
  assert.ok(staticCalls.indexOf("ensure-plan:day_change") < staticCalls.indexOf("save"));

  const secondaryCalls = execute("secondary");
  assert.equal(secondaryCalls.some((item) => item.startsWith("ensure-plan:")), false);
});

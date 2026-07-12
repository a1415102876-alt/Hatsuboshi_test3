import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

const root = new URL("../", import.meta.url);
const appSource = readFileSync(new URL("../app.js", import.meta.url), "utf8");
const normalize = (value) => JSON.parse(JSON.stringify(value));

function readFunction(source, functionName) {
  const start = source.indexOf(`function ${functionName}`);
  assert.notEqual(start, -1, `${functionName} must exist`);
  const bodyStart = source.indexOf("{", source.indexOf(")", start));
  let depth = 0;
  let quote = null;
  let escaped = false;
  for (let index = bodyStart; index < source.length; index += 1) {
    const character = source[index];
    if (quote) {
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === quote) quote = null;
      continue;
    }
    if (character === '"' || character === "'" || character === "`") quote = character;
    else if (character === "{") depth += 1;
    else if (character === "}" && --depth === 0) return source.slice(start, index + 1);
  }
  throw new Error(`Could not parse ${functionName}`);
}

function loadWorldModules(sandbox) {
  sandbox.globalThis = sandbox;
  for (const file of ["world/director-state.js", "world/director-api.js", "world/secondary-channel-owner.js"]) {
    vm.runInNewContext(readFileSync(new URL(file, root), "utf8"), sandbox, { filename: file });
  }
}

function installFunctions(sandbox, names) {
  for (const name of names) vm.runInNewContext(`${readFunction(appSource, name)}; globalThis.${name} = ${name};`, sandbox);
}

function makeState() {
  return {
    idol: "藤田琴音",
    day: 2,
    round: 1,
    freeMode: {
      postLiveDay: 2,
      clockMinutes: 600,
      activeLocationId: "classroom",
      relationships: { 藤田琴音: 42 },
      world: { director: null }
    }
  };
}

function makeSandbox(overrides = {}) {
  const events = [];
  const sandbox = {
    console,
    Date,
    Math,
    setTimeout,
    clearTimeout,
    window: { setTimeout, clearTimeout, confirm: () => true },
    state: makeState(),
    activeHostSaveScope: "scope-a",
    activeStorageKey: "local",
    secondaryChannelOwner: null,
    secondaryChannelMeta: null,
    secondaryChannelTimeoutId: 0,
    getWorldFeedDayKey: () => "day-2",
    getSecondaryChannelSaveScope: () => "scope-a",
    getPrimaryModelChannelOwner: () => null,
    getSecondaryModelChannelOwner: null,
    isSecondaryApiConfigured: () => true,
    shouldUseSecondaryWorldGen: () => false,
    maybeRequestDailyWorldGeneration: () => false,
    createSecondaryRequestId: (() => { let n = 0; return (kind) => `${kind}-request-${++n}`; })(),
    acquireSecondaryEntryDispatch(kind, requestId, meta) {
      events.push(`acquire:${kind}`);
      if (sandbox.secondaryChannelOwner) return { ok: false, reason: "secondary_busy" };
      const owner = { jobId: meta.jobId, requestId, kind, saveScope: "scope-a", acquiredAt: 1 };
      sandbox.secondaryChannelOwner = owner;
      sandbox.secondaryChannelMeta = { ...meta };
      return { ok: true, owner };
    },
    releaseSecondaryModelChannel(jobId, requestId, saveScope) {
      if (!sandbox.secondaryChannelOwner
        || sandbox.secondaryChannelOwner.jobId !== jobId
        || sandbox.secondaryChannelOwner.requestId !== requestId
        || sandbox.secondaryChannelOwner.saveScope !== saveScope) return false;
      sandbox.secondaryChannelOwner = null;
      sandbox.secondaryChannelMeta = null;
      events.push("release:director");
      return true;
    },
    requestHostSecondaryPromptSend(prompt, owner) {
      events.push(`send:${owner.kind}`);
      sandbox.lastPrompt = prompt;
      return true;
    },
    getWorldDirectorHelpers: () => ({
      knownActorIds: ["producer", "idol:藤田琴音"],
      knownScopeKeys: ["global", "scope-a"],
      getKnownCharacters: () => [{ id: "idol:藤田琴音", name: "藤田琴音", relationshipStage: "trusted" }],
      composePublicWorldSummary: () => "公开校园摘要",
      getRecentSceneStats: () => ({ lesson: 1 }),
      getTimePhase: () => "morning",
      getLocationId: () => "classroom"
    }),
    saveState(reason) { events.push(`save:${reason || "default"}`); },
    renderSecondaryApiDebug() { events.push("render-debug"); },
    showToast() { events.push("toast"); },
    pushSecondaryDebug() { return null; },
    ...overrides
  };
  sandbox.getSecondaryModelChannelOwner = () => sandbox.secondaryChannelOwner ? { ...sandbox.secondaryChannelOwner } : null;
  loadWorldModules(sandbox);
  sandbox.state.freeMode.world.director = sandbox.HatsuWorld.directorState.defaultDirectorState();
  sandbox.events = events;
  return sandbox;
}

const orchestrationFunctions = [
  "getWorldDirectorState",
  "createWorldDirectorJobId",
  "prepareWorldDirectorJob",
  "maybeRequestWorldDirector",
  "finishWorldDirectorAttempt",
  "resumeWorldDirectorAfterRelease",
  "handleWorldDirectorReply",
  "requestManualWorldDirectorRecalculation"
];

test("day-change and manual preparation create bounded jobs while scene commits do not", () => {
  const sandbox = makeSandbox();
  installFunctions(sandbox, orchestrationFunctions.slice(0, 3));
  const dayJob = normalize(sandbox.prepareWorldDirectorJob("day_change", { persist: false }));
  assert.equal(dayJob.trigger, "day_change");
  assert.equal(dayJob.dayKey, "day-2");
  assert.equal(dayJob.saveScope, "scope-a");
  assert.equal(dayJob.baseDirectorRevision, 0);
  assert.equal(dayJob.baseChronicleRevision, 0);
  assert.equal(sandbox.state.freeMode.world.director.dirty, true);
  assert.equal(sandbox.prepareWorldDirectorJob("scene_commit", { persist: false }), null);
  const manual = normalize(sandbox.prepareWorldDirectorJob("manual", { persist: false }));
  assert.equal(manual.trigger, "manual");
  assert.notEqual(manual.jobId, dayJob.jobId);
});

test("same-day automatic preparation cannot replace a committed direction but manual can", () => {
  const sandbox = makeSandbox();
  installFunctions(sandbox, orchestrationFunctions.slice(0, 3));
  sandbox.state.freeMode.world.director.dailyDirection = {
    dayKey: "day-2", tone: "stable", summary: "keep", focusActorIds: [], focusPressureIds: [], narrativeGoals: [], avoid: []
  };
  assert.equal(sandbox.prepareWorldDirectorJob("day_change", { persist: false }), null);
  assert.equal(sandbox.prepareWorldDirectorJob("manual", { persist: false }).trigger, "manual");
});

test("busy secondary channel leaves a prepared director job and UI/state untouched", () => {
  const sandbox = makeSandbox();
  installFunctions(sandbox, orchestrationFunctions.slice(0, 4));
  sandbox.prepareWorldDirectorJob("day_change", { persist: false });
  sandbox.secondaryChannelOwner = { jobId: "world-job", requestId: "world-request", kind: "world", saveScope: "scope-a", acquiredAt: 1 };
  const before = JSON.stringify(sandbox.state);
  assert.equal(sandbox.maybeRequestWorldDirector({ reason: "world_busy" }), false);
  assert.equal(JSON.stringify(sandbox.state), before);
  assert.deepEqual(sandbox.events, []);
});

test("a prepared job rebases to new digest revision before acquiring the secondary channel", () => {
  const sandbox = makeSandbox();
  installFunctions(sandbox, orchestrationFunctions.slice(0, 4));
  const original = sandbox.prepareWorldDirectorJob("day_change", { persist: false });
  sandbox.state.freeMode.world.director.chronicleRevision = 1;
  assert.equal(sandbox.maybeRequestWorldDirector(), true);
  const job = sandbox.state.freeMode.world.director.activeJob;
  assert.notEqual(job.jobId, original.jobId);
  assert.equal(job.baseChronicleRevision, 1);
  assert.equal(job.status, "generating");
});
test("director request acquires before prompt assembly and persists generating identity", () => {
  const sandbox = makeSandbox();
  installFunctions(sandbox, orchestrationFunctions.slice(0, 4));
  sandbox.prepareWorldDirectorJob("day_change", { persist: false });
  const originalBuilder = sandbox.HatsuWorld.directorApi.buildDirectorPrompt;
  sandbox.HatsuWorld.directorApi.buildDirectorPrompt = (input) => {
    assert.equal(sandbox.events[0], "acquire:director");
    return originalBuilder(input);
  };
  assert.equal(sandbox.maybeRequestWorldDirector(), true);
  assert.equal(sandbox.state.freeMode.world.director.activeJob.status, "generating");
  assert.equal(sandbox.state.freeMode.world.director.activeJob.requestId, "director-request-1");
  assert.deepEqual(sandbox.events.slice(0, 3), ["acquire:director", "save:director.generating", "send:director"]);
});

test("a valid director reply commits atomically and releases the exact owner", () => {
  const sandbox = makeSandbox();
  installFunctions(sandbox, orchestrationFunctions);
  sandbox.prepareWorldDirectorJob("day_change", { persist: false });
  sandbox.maybeRequestWorldDirector();
  const owner = { ...sandbox.secondaryChannelOwner };
  const output = {
    schemaVersion: 1,
    jobId: owner.jobId,
    baseDirectorRevision: 0,
    baseChronicleRevision: 0,
    dailyDirection: {
      dayKey: "day-2", tone: "克制而温暖", summary: "让训练承诺获得回应。",
      focusActorIds: ["idol:藤田琴音"], focusPressureIds: [], narrativeGoals: ["推进承诺"], avoid: ["替玩家决定"]
    },
    pressureOperations: []
  };
  const api = sandbox.HatsuWorld.directorApi;
  const text = `${api.OUTPUT_START}\n${JSON.stringify(output)}\n${api.OUTPUT_END}`;
  assert.equal(sandbox.handleWorldDirectorReply({ ...owner, ok: true, text }, owner), true);
  const director = sandbox.state.freeMode.world.director;
  assert.equal(director.directorRevision, 1);
  assert.equal(director.dailyDirection.dayKey, "day-2");
  assert.equal(director.dirty, false);
  assert.equal(director.activeJob.status, "committed");
  assert.equal(sandbox.secondaryChannelOwner, null);
});
test("prompt assembly exceptions release the exact owner and remain retryable", () => {
  const sandbox = makeSandbox();
  installFunctions(sandbox, orchestrationFunctions);
  sandbox.prepareWorldDirectorJob("day_change", { persist: false });
  sandbox.HatsuWorld.directorApi.buildDirectorInput = () => {
    throw new Error("builder exploded");
  };
  assert.equal(sandbox.maybeRequestWorldDirector(), false);
  assert.equal(sandbox.secondaryChannelOwner, null);
  assert.equal(sandbox.state.freeMode.world.director.activeJob.status, "retryable_failed");
  assert.equal(sandbox.state.freeMode.world.director.activeJob.reason, "prompt_build_failed");
});
test("API and parse failures are retryable and preserve committed direction and pressures", () => {
  const sandbox = makeSandbox();
  installFunctions(sandbox, orchestrationFunctions.slice(0, 7));
  const director = sandbox.state.freeMode.world.director;
  director.dailyDirection = { dayKey: "day-1", tone: "old", summary: "old", focusActorIds: [], focusPressureIds: [], narrativeGoals: [], avoid: [] };
  director.pressures = [{ id: "p1", type: "relationship", theme: "trust", actorId: "idol:藤田琴音", targetIds: ["producer"], scopeKey: "global" }];
  sandbox.prepareWorldDirectorJob("day_change", { persist: false });
  sandbox.maybeRequestWorldDirector();
  const owner = { ...sandbox.secondaryChannelOwner };
  const beforeDirection = normalize(director.dailyDirection);
  const beforePressures = normalize(director.pressures);
  assert.equal(sandbox.handleWorldDirectorReply({ ...owner, ok: true, text: "invalid" }, owner), false);
  assert.equal(director.activeJob.status, "retryable_failed");
  assert.equal(director.activeJob.requestId, "");
  assert.equal(director.dirty, true);
  assert.deepEqual(normalize(director.dailyDirection), beforeDirection);
  assert.deepEqual(normalize(director.pressures), beforePressures);
  assert.equal(sandbox.secondaryChannelOwner, null);
});

test("old scope request and stale revision cannot commit", () => {
  const sandbox = makeSandbox();
  installFunctions(sandbox, orchestrationFunctions.slice(0, 7));
  sandbox.prepareWorldDirectorJob("day_change", { persist: false });
  sandbox.maybeRequestWorldDirector();
  const owner = { ...sandbox.secondaryChannelOwner };
  sandbox.activeHostSaveScope = "scope-b";
  sandbox.getSecondaryChannelSaveScope = () => "scope-b";
  const before = JSON.stringify(sandbox.state.freeMode.world.director);
  assert.equal(sandbox.handleWorldDirectorReply({ ...owner, ok: true, text: "ignored" }, owner), false);
  assert.equal(JSON.stringify(sandbox.state.freeMode.world.director), before);

  sandbox.activeHostSaveScope = "scope-a";
  sandbox.getSecondaryChannelSaveScope = () => "scope-a";
  sandbox.state.freeMode.world.director.directorRevision += 1;
  assert.equal(sandbox.handleWorldDirectorReply({ ...owner, ok: true, text: "ignored" }, owner), false);
  assert.equal(sandbox.secondaryChannelOwner, null);
  assert.equal(sandbox.state.freeMode.world.director.activeJob.status, "retryable_failed");
  assert.equal(sandbox.state.freeMode.world.director.activeJob.reason, "stale_revision");
});

test("an old director reply releases its owner and starts the newer prepared day job", () => {
  const sandbox = makeSandbox();
  installFunctions(sandbox, orchestrationFunctions);
  sandbox.prepareWorldDirectorJob("day_change", { persist: false });
  sandbox.maybeRequestWorldDirector();
  const oldOwner = { ...sandbox.secondaryChannelOwner };
  sandbox.getWorldFeedDayKey = () => "day-3";
  sandbox.prepareWorldDirectorJob("day_change", { dayKey: "day-3", persist: false });
  assert.equal(sandbox.handleWorldDirectorReply({ ...oldOwner, ok: true, text: "old" }, oldOwner), false);
  assert.equal(sandbox.secondaryChannelOwner.kind, "director");
  assert.notEqual(sandbox.secondaryChannelOwner.jobId, oldOwner.jobId);
  assert.equal(sandbox.state.freeMode.world.director.activeJob.dayKey, "day-3");
  assert.equal(sandbox.state.freeMode.world.director.activeJob.status, "generating");
});
test("day advance mutates deterministic state and queues public world before director check", () => {
  const events = [];
  const sandbox = {
    state: { freeMode: { postLiveDay: 1, clockMinutes: 0, apartmentCompanionIdol: "x" } },
    FREE_MODE_DAY_START_MINUTES: 480,
    ensureFreeModeTimeDefaults: () => events.push("ensure"),
    HatsuTasks: { isSandboxTasksActive: () => false },
    runFreeModeWorldDailyTick: () => events.push("public-world"),
    prepareWorldDirectorJob: () => { events.push("prepare-director"); return {}; },
    maybeRequestWorldDirector: () => events.push("request-director"),
    closeFreeModeTimeOverlay: () => events.push("close"),
    saveState: () => events.push("save"),
    renderFreeModeStage: () => events.push("render"),
    showToast: () => events.push("toast"),
    formatFreeModeDayLabel: () => "day",
    formatFreeModeClock: () => "08:00"
  };
  sandbox.globalThis = sandbox;
  vm.runInNewContext(`${readFunction(appSource, "advanceFreeModeToNextDay")}; globalThis.advance = advanceFreeModeToNextDay;`, sandbox);
  sandbox.advance();
  assert.equal(sandbox.state.freeMode.postLiveDay, 2);
  assert.ok(events.indexOf("public-world") < events.indexOf("prepare-director"));
  assert.ok(events.indexOf("prepare-director") < events.indexOf("request-director"));
});

test("public world completion and failure each contain exactly one director follow-up", () => {
  const source = readFunction(appSource, "handleSecondaryAiReply");
  assert.equal((source.match(/maybeRequestWorldDirector\(/g) || []).length, 3, "failure, parse failure, and success each follow up once");
});

test("refresh normalization clears an in-flight request without automatically resending", () => {
  const sandbox = makeSandbox();
  const normalized = normalize(sandbox.HatsuWorld.directorState.ensureDirectorShape({
    dirty: true,
    activeJob: {
      jobId: "job-old", requestId: "request-old", saveScope: "scope-a", trigger: "day_change",
      dayKey: "day-2", baseDirectorRevision: 0, baseChronicleRevision: 0, status: "generating"
    }
  }));
  assert.equal(normalized.activeJob.status, "retryable_failed");
  assert.equal(normalized.activeJob.requestId, "");
  assert.equal(appSource.includes("maybeRequestWorldDirector({ reason: \"state_restore\""), false);
});

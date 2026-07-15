import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

const appSource = readFileSync(new URL("../app.js", import.meta.url), "utf8");
const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const css = readFileSync(new URL("../style.css", import.meta.url), "utf8");

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

test("phone registry, route, and DOM expose the world engine app", () => {
  assert.match(appSource, /id:\s*"world-engine"/);
  assert.match(readFunction("launchPhoneApp"), /appId === "world-engine"[\s\S]*openPhoneWorldEngineApp\(\)/);
  assert.match(readFunction("phoneNavBack"), /phoneWorldEngineApp/);
  assert.match(readFunction("showPhoneHomeView"), /setElementHidden\("phoneWorldEngineApp", true\)/);
  assert.match(html, /id="phoneWorldEngineApp"/);
  assert.match(html, /id="worldEngineTabs"/);
  assert.match(html, /id="worldEngineContent"/);
  assert.match(html, /data-world-engine-tab="events"/);
  assert.match(html, /id="worldEngineRefreshBtn"/);
  assert.match(html, /id="worldEngineManualRunBtn"/);
  for (const id of [
    "worldEngineSettingsBtn", "worldEngineMainView", "worldEngineSettingsView", "worldEngineSettingsBackBtn",
    "worldEngineApiEnabled", "worldEngineApiBaseUrl", "worldEngineApiModel", "worldEngineApiKey",
    "worldEngineApiSaveBtn", "worldEngineApiTestBtn", "worldEngineCommissionRegenBtn", "worldEngineStaleRecoveryBtn",
    "worldEngineHeroicWeight", "worldEngineRomanceWeight", "worldEngineStyleSaveBtn"
  ]) assert.match(html, new RegExp(`id="${id}"`), `${id} must exist`);
  const commissionStart = html.indexOf('id="sideQuestOverlay"');
  const commissionEnd = html.indexOf('id="affinityOverlay"', commissionStart);
  assert.doesNotMatch(html.slice(commissionStart, commissionEnd), /sideQuestApiPanel|sideQuestApiKey/);
});

test("world engine style controls are wired to a pending next-day save", () => {
  assert.match(appSource, /function saveWorldEngineStyleMix\(/);
  assert.match(readFunction("saveWorldEngineStyleMix"), /setPendingMix/);
  assert.match(readFunction("saveWorldEngineStyleMix"), /pendingActivationDayKey|nextDayKey|getNextDayKey/);
  assert.match(readFunction("saveWorldEngineStyleMix"), /saveState\(/);
  assert.match(readFunction("saveWorldEngineStyleMix"), /renderWorldEnginePhoneApp\(/);
  assert.doesNotMatch(readFunction("saveWorldEngineStyleMix"), /requestManualWorldDirectorRecalculation|scanStoryteller|requestHost/);
});

test("world engine style save is exposed as one click handler", () => {
  assert.match(readFunction("bindPhoneWorldEngineEvents"), /worldEngineStyleSaveBtn/);
  assert.match(html, /data-style-id="heroic"|worldEngineHeroicWeight/);
  assert.match(html, /data-style-id="romance"|worldEngineRomanceWeight/);
});

test("style save updates pending mix once without starting world generation", () => {
  const calls = [];
  const elements = new Map([
    ["worldEngineHeroicWeight", { value: "70" }],
    ["worldEngineRomanceWeight", { value: "30" }]
  ]);
  const context = {
    state: { freeMode: { world: { storyteller: { styleConfig: { activeMix: { heroic: 60, romance: 40, kaibunsho: 0 } } } } } },
    document: { getElementById: (id) => elements.get(id) || null },
    HatsuWorldStorytellerStyles: {
      getNextDayKey: () => "live+3",
      setPendingMix: (config, mix, dayKey) => ({ ...config, pendingMix: mix, pendingActivationDayKey: dayKey })
    },
    getWorldFeedDayKey: () => "live+2",
    saveState: (reason) => calls.push(["save", reason]),
    updateWorldEngineStyleSettingsUI: () => calls.push(["update"]),
    renderWorldEnginePhoneApp: () => calls.push(["render"]),
    showToast: (...args) => calls.push(["toast", ...args]),
    syncWorldEngineStyleInputs: () => {},
    globalThis: null
  };
  context.globalThis = context;
  vm.runInNewContext(`${readFunction("saveWorldEngineStyleMix")}; this.save = saveWorldEngineStyleMix;`, context);
  assert.equal(context.save(), true);
  assert.deepEqual(JSON.parse(JSON.stringify(context.state.freeMode.world.storyteller.styleConfig.pendingMix)), { heroic: 70, romance: 30, kaibunsho: 0 });
  assert.deepEqual(calls.filter(([type]) => type === "save"), [["save", "storyteller.style_pending"]]);
  assert.deepEqual(calls.filter(([type]) => type === "render"), [["render"]]);
  assert.equal(calls.some(([type]) => type === "request"), false);
});

test("world engine manual action delegates to the existing Director request only on click", () => {
  const listeners = {};
  const calls = [];
  const elements = new Map([
    "worldEngineTabs", "worldEngineRefreshBtn", "worldEngineManualRunBtn", "worldEngineSettingsBtn",
    "worldEngineSettingsBackBtn", "worldEngineApiSaveBtn", "worldEngineApiTestBtn", "worldEngineCommissionRegenBtn",
    "worldEngineStaleRecoveryBtn"
  ].map((id) => [id, {
    addEventListener(type, handler) {
      listeners[`${id}:${type}`] = handler;
    }
  }]));
  const context = {
    document: { getElementById: (id) => elements.get(id) || null },
    setWorldEnginePhoneTab: () => calls.push("tab"),
    reconcileWorldDirectorAttempt: () => calls.push("reconcile"),
    renderWorldEnginePhoneApp: () => calls.push("render"),
    requestManualWorldDirectorRecalculation: () => calls.push("manual"),
    openWorldEngineAdvancedSettings: () => calls.push("open-settings"),
    closeWorldEngineAdvancedSettings: () => calls.push("close-settings"),
    saveWorldEngineApiSettings: () => calls.push("save-api"),
    runSecondaryApiTest: () => calls.push("test-api"),
    forceSecondaryRegeneration: () => calls.push("regen-commissions"),
    recoverStaleWorldDirectorAttempt: () => calls.push("recover-stale")
  };
  vm.runInNewContext(`${readFunction("bindPhoneWorldEngineEvents")}; this.bindEvents = bindPhoneWorldEngineEvents;`, context);

  context.bindEvents();
  assert.deepEqual(calls, []);
  assert.equal(typeof listeners["worldEngineRefreshBtn:click"], "function");
  listeners["worldEngineRefreshBtn:click"]();
  assert.deepEqual(calls, ["reconcile", "render"]);
  assert.equal(typeof listeners["worldEngineManualRunBtn:click"], "function");
  listeners["worldEngineManualRunBtn:click"]();
  assert.deepEqual(calls, ["reconcile", "render", "manual", "render"]);
  listeners["worldEngineSettingsBtn:click"]();
  listeners["worldEngineSettingsBackBtn:click"]();
  listeners["worldEngineApiSaveBtn:click"]();
  listeners["worldEngineApiTestBtn:click"]();
  listeners["worldEngineCommissionRegenBtn:click"]();
  listeners["worldEngineStaleRecoveryBtn:click"]();
  assert.deepEqual(calls.slice(-6), ["open-settings", "close-settings", "save-api", "test-api", "regen-commissions", "recover-stale"]);
});

test("world engine manual action reflects Director and channel busy state", () => {
  const button = { disabled: false, textContent: "" };
  const context = {
    document: { getElementById: (id) => id === "worldEngineManualRunBtn" ? button : null },
    getPrimaryModelChannelOwner: () => null,
    getSecondaryModelChannelOwner: () => null
  };
  vm.runInNewContext(`${readFunction("updateWorldEngineManualRunButton")}; this.updateButton = updateWorldEngineManualRunButton;`, context);

  context.updateButton({ runtime: { jobStatus: "idle" } });
  assert.equal(button.disabled, false);
  assert.equal(button.textContent, "手动推演本日走向");

  context.updateButton({ runtime: { jobStatus: "generating" } });
  assert.equal(button.disabled, true);
  assert.equal(button.textContent, "正在推演…");

  context.getPrimaryModelChannelOwner = () => ({ ownerKind: "ordinary_action" });
  context.updateButton({ runtime: { jobStatus: "idle" } });
  assert.equal(button.disabled, true);
  assert.equal(button.textContent, "正在推演…");
});

test("opening the world engine app only changes phone visibility and renders", () => {
  const calls = [];
  const context = {
    state: { marker: "unchanged" },
    setElementHidden: (id, hidden) => calls.push(["hidden", id, hidden]),
    setPhoneStatusBarMode: (mode) => calls.push(["status", mode]),
    setPhoneNavBarVisible: (visible) => calls.push(["nav", visible]),
    closeWorldEngineAdvancedSettings: () => calls.push(["close-settings"]),
    reconcileWorldDirectorAttempt: () => calls.push(["reconcile"]),
    scanStorytellerNotificationAtCheckpoint: () => calls.push(["scan"]),
    bindPhoneWorldEngineEvents: () => calls.push(["bind"]),
    renderWorldEnginePhoneApp: () => calls.push(["render"]),
    saveState: () => calls.push(["forbidden-save"]),
    requestManualWorldDirectorRecalculation: () => calls.push(["forbidden-director"]),
    requestHostSecondaryPromptSend: () => calls.push(["forbidden-request"])
  };
  vm.runInNewContext(
    `let phoneWorldEngineInited = false; ${readFunction("openPhoneWorldEngineApp")}; this.openApp = openPhoneWorldEngineApp;`,
    context
  );
  const before = JSON.stringify(context.state);

  context.openApp();
  context.openApp();

  assert.equal(JSON.stringify(context.state), before);
  assert.equal(calls.filter(([type]) => type === "bind").length, 1);
  assert.equal(calls.filter(([type]) => type === "reconcile").length, 2);
  assert.equal(calls.filter(([type]) => type === "render").length, 2);
  assert.ok(calls.some((call) => JSON.stringify(call) === JSON.stringify(["hidden", "phoneWorldEngineApp", false])));
  assert.ok(calls.some((call) => JSON.stringify(call) === JSON.stringify(["status", "world-engine"])));
  assert.ok(calls.some((call) => JSON.stringify(call) === JSON.stringify(["nav", true])));
  assert.equal(calls.some(([type]) => type.startsWith("forbidden")), false);
});

test("phone view reads the existing Director subtree without normalizing or saving it", () => {
  const calls = [];
  const director = { marker: "persisted-director" };
  const context = {
    state: { freeMode: { world: { director } } },
    HatsuWorld: {
      directorPhoneView: {
        buildViewModel(value, options) {
          calls.push({ value, options });
          return { availability: "ready", direction: null, pressures: [], runtime: {} };
        }
      }
    },
    getWorldFeedDayKey: () => "day-2",
    resolveWorldEngineActorLabel: (id) => `label:${id}`,
    saveState: () => calls.push("forbidden-save")
  };
  context.globalThis = context;
  vm.runInNewContext(`${readFunction("getWorldEnginePhoneViewModel")}; this.getModel = getWorldEnginePhoneViewModel;`, context);

  context.getModel();

  assert.equal(calls.length, 1);
  assert.equal(calls[0].value, director);
  assert.equal(calls[0].options.currentDayKey, "day-2");
  assert.equal(calls[0].options.resolveActorLabel("idol:x"), "label:idol:x");
  assert.equal(context.state.freeMode.world.director, director);
});

test("world engine view composes a read-only Storyteller plan summary", () => {
  const calls = [];
  const director = { marker: "director" };
  const storyteller = { marker: "storyteller" };
  const context = {
    state: { freeMode: { world: { director, storyteller } } },
    HatsuWorld: { directorPhoneView: { buildViewModel: () => ({ availability: "ready", direction: null, pressures: [], runtime: {} }) } },
    HatsuWorldStorytellerPhoneView: {
      buildViewModel(value, options) {
        calls.push({ value, options });
        return { status: "committed", pacingLabel: "平稳", categories: [], severityBudget: { minor: 1, moderate: 0, major: 0 } };
      }
    },
    getWorldFeedDayKey: () => "live+2",
    getSecondaryChannelSaveScope: () => "chat-a",
    resolveWorldEngineActorLabel: () => ""
  };
  context.globalThis = context;
  vm.runInNewContext(`${readFunction("getWorldEnginePhoneViewModel")}; this.getModel = getWorldEnginePhoneViewModel;`, context);
  const model = context.getModel();
  assert.equal(calls.length, 1);
  assert.equal(calls[0].value, storyteller);
  assert.equal(calls[0].options.currentSaveScope, "chat-a");
  assert.equal(model.storyteller.status, "committed");
});

test("today, pressure, and runtime renderers escape model-provided text", () => {
  const context = {
    escapePhoneText: (value) => String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;"),
    formatWorldEngineRuntimeTime: () => "01:02",
    formatWorldEngineJobStatus: (status) => `状态:${status}`
  };
  for (const name of ["renderWorldEngineStorytellerPlan", "renderWorldEngineToday", "renderWorldEnginePressures", "renderWorldEngineRuntime"]) {
    vm.runInNewContext(`${readFunction(name)}; this.${name} = ${name};`, context);
  }
  const malicious = '<img src=x onerror="alert(1)">';
  const model = {
    availability: "ready",
    direction: { isCurrentDay: true, dayKey: "day-2", tone: malicious, summary: malicious },
    pressures: [{ actorLabel: malicious, themeLabel: malicious, stageLabel: malicious, intensity: 47, summary: malicious, status: "active" }],
    runtime: {
      enabled: true,
      dirty: true,
      jobStatus: "retryable_failed",
      jobStartedAt: 100,
      directorRevision: 3,
      chronicleRevision: 7,
      lastError: malicious,
      receipts: [{ createdAt: 100, triggerLabel: malicious, resultLabel: malicious }]
    }
  };

  const output = [
    context.renderWorldEngineStorytellerPlan({
      status: "committed",
      dayKey: "live+2",
      pacingLabel: malicious,
      categories: [{ label: malicious, weight: 50 }],
      severityBudget: { minor: 2, moderate: 1, major: 0 },
      noveltySummary: malicious,
      cooldownSummary: malicious,
      lastError: malicious,
      candidate: {
        statusLabel: malicious,
        sourceLabel: "地图探索",
        categoryLabel: malicious,
        severityLabel: malicious,
        archetypeLabel: malicious,
        locationLabel: malicious,
        incidentSuffix: malicious,
        turnSuffix: malicious,
        lastReason: malicious,
        cooldownCount: 2
      },
      selection: {
        selectedScore: 72,
        categoryWeight: 35,
        actionFit: 6,
        noveltyBonus: 15,
        pressureBonus: 16,
        relevantPressureCount: 1,
        evaluatedCount: 12,
        eligibleCount: 3,
        rejectionSummary: [malicious, "冷却 2"]
      },
      lastObservation: {
        sourceLabel: malicious,
        categoryLabel: malicious,
        severityLabel: malicious
      }
    }),
    context.renderWorldEngineToday(model),
    context.renderWorldEnginePressures(model),
    context.renderWorldEngineRuntime(model)
  ].join("\n");
  assert.doesNotMatch(output, /<img|onerror="/);
  assert.match(output, /&lt;img/);
  assert.match(output, /今日叙事方向/);
  assert.match(output, /压力线/);
  assert.match(output, /Director revision/);
  assert.match(output, /Storyteller Plan/);
  assert.match(output, /选择依据/);
  assert.match(output, /最近反馈/);
  assert.match(output, /当前事件候选/);
  assert.match(output, /地图探索/);
  assert.match(output, /发现新动向，等待日切或手动重算/);
});

test("Storyteller candidate renderer is read-only and contains no controls", () => {
  const body = readFunction("renderWorldEngineStorytellerPlan");
  assert.match(body, /candidate/);
  assert.match(body, /incidentSuffix/);
  assert.match(body, /turnSuffix/);
  assert.match(body, /selection/);
  assert.match(body, /lastObservation/);
  assert.doesNotMatch(body, /saveState|requestHost|prepareStoryteller|settleStoryteller|<button/);
});

test("world engine event renderer exposes only accept defer and ignore commands", () => {
  const body = readFunction("renderWorldEngineEvents");
  assert.match(body, /data-storyteller-event-action="accept"/);
  assert.match(body, /data-storyteller-event-action="defer"/);
  assert.match(body, /data-storyteller-event-action="ignore"/);
  assert.match(body, /inbox\.confirmationCopy/);
  assert.match(body, /inbox\.modifierLabels/);
  assert.doesNotMatch(body, /requestHostPromptSend|tryAcquirePrimaryModelChannel|saveState/);
});

test("major Storyteller actions use one reusable confirmation dialog", () => {
  assert.match(html, /id="storytellerMajorConfirmationOverlay"/);
  assert.match(html, /id="storytellerMajorConfirmationConfirmBtn"/);
  assert.match(html, /id="storytellerMajorConfirmationCancelBtn"/);
  assert.match(css, /\.storyteller-major-confirmation/);
  assert.match(appSource, /function openStorytellerMajorConfirmation\(/);
  assert.match(appSource, /function closeStorytellerMajorConfirmation\(/);
  assert.match(appSource, /function confirmStorytellerMajorAction\(/);
});

test("world engine phone rendering contains no direct model or save calls", () => {
  const pureFunctions = [
    "getWorldEnginePhoneViewModel",
    "renderWorldEngineStorytellerPlan",
    "renderWorldEngineToday",
    "renderWorldEnginePressures",
    "renderWorldEngineRuntime",
    "renderWorldEngineEvents",
    "renderWorldEnginePhoneApp"
  ];
  const block = pureFunctions.map(readFunction).join("\n");
  assert.doesNotMatch(block, /saveState\s*\(/);
  assert.doesNotMatch(block, /requestHostSecondaryPromptSend\s*\(/);
  assert.doesNotMatch(block, /requestHostPromptSend\s*\(/);
  assert.doesNotMatch(block, /sendAiPrompt\s*\(/);
  assert.match(readFunction("getWorldEnginePhoneViewModel"), /directorPhoneView\?\.buildViewModel/);
});

test("world engine app has a stable phone-sized archive layout", () => {
  assert.match(css, /\.world-engine-app\s*\{/);
  assert.match(css, /\.world-engine-tabs\s*\{/);
  assert.match(css, /\.world-engine-scroll\s*\{/);
  assert.match(css, /\.world-engine-action-bar\s*\{/);
  assert.match(css, /\.world-engine-manual-run\s*\{/);
  assert.match(css, /\.world-engine-pressure-meter\s*\{/);
  assert.match(css, /\.mini-phone-statusbar\.is-world-engine\s*\{/);
  assert.match(css, /\.world-engine-app\[hidden\]\s*\{/);
});
